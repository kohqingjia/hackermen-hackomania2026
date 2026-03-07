"""
AI routes
GET  /api/ai/insights/{user_id}?date=YYYY-MM-DD    — daily usage insight + tip
GET  /api/ai/recommend/{user_id}                    — personalised recommendations
GET  /api/ai/analyze/{user_id}                      — monthly usage analysis
POST /api/ai/chat                                   — freeform AI coach chat
"""

from datetime import date, timedelta, datetime
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from database.clickhouse import get_client
from config import settings
from utils.datetime_helper import get_app_date
from services.openai_service import (
    generate_usage_insight,
    generate_recommendations,
    generate_monthly_analysis,
    chat_with_coach,
)
from models.schemas import (
    AIInsightResponse,
    AIRecommendResponse,
    AIMonthlyAnalysisResponse,
    AIRecommendation,
    AnomalyResponse,
    ProjectionsResponse,
    HouseholdBenchmarkResponse,
)
import calendar

router = APIRouter(prefix="/api/ai", tags=["ai"])


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    user_id: str | None = None
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str

# Get details of a specific user
def _get_user(client, user_id: str) -> dict:
    """Return combined profile from household_data + household_user_input."""
    
    row = client.query(
        """
        SELECT
            hd.HouseholdID,
            hd.PostalCode,
            hd.District,
            hd.Flat_type,
            hd.Dwelling_type,
            hu.Num_residents,
            hu.Num_children,
            hu.Num_elderly,
            hu.Num_tenants,
            hu.Aircon_usage,
            hu.Num_Aircons,
            hu.Has_WFH_days,
            hu.Num_WFH,
            hu.Floor_area_sqm,
            hu.Target_bill
        FROM details_per_household hd
        LEFT JOIN input_per_household hu ON toString(hd.UserID) = hu.UserID
        WHERE toString(hd.UserID) = {uid:String}
        LIMIT 1
        """,
        parameters={"uid": user_id},
    ).result_rows
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    cols = [
        "household_id", "postal_code", "district", "flat_type", "dwelling_type",
        "num_residents", "num_children", "num_elderly", "num_tenants", "aircon_usage",
        "num_aircons", "has_wfh_days", "num_wfh", "floor_area_sqm", "target_bill"
    ]
    result = dict(zip(cols, row[0]))
    # Cast UUID values to strings
    result["household_id"] = str(result["household_id"])
    result["postal_code"] = str(result["postal_code"])
    result["district"] = str(result["district"])
    return result


@router.get("/insights", response_model=AIInsightResponse)
def get_insights(
    query_date: str = Query(default=None, alias="date"),
):
    client = get_client()
    user = _get_user(client, settings.user_id)
    target_date = date.fromisoformat(query_date) if query_date else get_app_date()
    yesterday = target_date - timedelta(days=1)

    household_id = user["household_id"]

    def daily_total(hid: str, d: date) -> float:
        rows = client.query(
            """SELECT sum(`Consumption(kWh)`)
            FROM consumption_per_household_daily
            WHERE HouseholdID={hid:String}
            AND Day={d:Date}
            """,
            parameters={"hid": hid, "d": d.isoformat()},
        ).result_rows
        return float(rows[0][0] or 0)

    # Getting the total of the block, grouping by postal code. in a day also.
    def block_total(postal_code: str, d: date) -> float:
        rows = client.query(
            """
            SELECT sum(`Consumption(kWh)`
            FROM consumption_per_household_daily e
            JOIN details_per_household hd ON e.HouseholdID = toString(hd.HouseholdID)
            WHERE hd.PostalCode = {pc:String} AND e.Day = {d:Date}
            """,
            parameters={"pc": postal_code, "d": d.isoformat()},
        ).result_rows
        return float(rows[0][0] or 0)
    # Block average daily usage
    def block_avg(postal_code: str, d: date) -> float:
        rows = client.query(
            """
            SELECT avg(`Consumption(kWh)`)
            FROM consumption_per_household_daily e
            JOIN details_per_household hd ON e.HouseholdID = toString(hd.HouseholdID)
            WHERE hd.PostalCode = {pc:String} AND e.Day = {d:Date}
            """,
            parameters={"pc": postal_code, "d": d.isoformat()},
        ).result_rows
        return float(rows[0][0] or 0)

    def peak_hour(hid: str, d: date) -> str:
        rows = client.query(
            """
            SELECT Timestamp
            FROM consumption_per_household
            WHERE HouseholdID={hid:String}
            AND toDate(Timestamp)={d:Date}
            ORDER BY `Consumption(kWh)` DESC
            LIMIT 1
            """,
            parameters={"hid": hid, "d": d.isoformat()},
        ).result_rows
        return rows[0][0].strftime("%H:%M") if rows else "20:00"

    user_kwh = daily_total(household_id, target_date)
    block_avg_kwh = block_avg(user["postal_code"], target_date)
    prev_kwh = daily_total(household_id, yesterday)
    ph = peak_hour(household_id, target_date)

    result = generate_usage_insight(
        user_id=settings.user_id,
        user_kwh_total=user_kwh,
        peak_hour=ph,
        block_avg_kwh=block_avg_kwh,
        prev_day_kwh=prev_kwh,
        flat_type=user["flat_type"],
        aircon_usage=user.get("aircon_usage", 0),
    )

    return AIInsightResponse(
        user_id=settings.user_id,
        insight=result.get("insight", ""),
        tip=result.get("tip", ""),
        comparison=result.get("comparison", ""),
        generated_at=datetime.utcnow().isoformat(),
    )


@router.get("/recommend", response_model=AIRecommendResponse)
def get_recommendations():
    client = get_client()
    user = _get_user(client, settings.user_id)

    household_id = user["household_id"]
    today = get_app_date().isoformat()

    rows = client.query(
        "SELECT `Consumption(kWh)` FROM consumption_per_household WHERE HouseholdID={hid:String} AND toDate(Timestamp)={d:Date} ORDER BY Timestamp ASC",
        parameters={"hid": household_id, "d": today},
    ).result_rows
    kwh_by_slot = [float(r[0]) for r in rows] if rows else [0.3] * 48

    recs = generate_recommendations(
        user_kwh_by_slot=kwh_by_slot,
        flat_type=user["flat_type"],
        num_wfh=user.get("num_wfh", 0),
        aircon_usage=user.get("aircon_usage", 0),
        num_residents=user.get("num_residents", 0),
        num_aircons=user.get("num_aircons", 0),
        num_children=user.get("num_children", 0),
        num_elderly=user.get("num_elderly", 0),
        num_tenants=user.get("num_tenants", 0)
    )

    return AIRecommendResponse(
        user_id=settings.user_id,
        recommendations=[AIRecommendation(**r) for r in recs],
        generated_at=datetime.utcnow().isoformat(),
    )


@router.get("/analyze", response_model=AIMonthlyAnalysisResponse)
def get_monthly_analysis():
    client = get_client()
    user = _get_user(client, settings.user_id)

    household_id = user["household_id"]

    today = get_app_date()
    current_month_start = today.replace(day=1)
    prev_month_end = current_month_start - timedelta(days=1)
    prev_month_start = prev_month_end.replace(day=1)

    def month_total(hid: str, start: date, end: date) -> float:
        rows = client.query(
            """
            SELECT sum(`Consumption(kWh)`) 
            FROM consumption_per_household_monthly 
            WHERE HouseholdID={hid:String} 
            AND MonthStart BETWEEN {s:Date} AND {e:Date}
            """,
            parameters={"hid": hid, "s": start.isoformat(), "e": end.isoformat()},
        ).result_rows
        return float(rows[0][0] or 0)

    current_kwh = month_total(household_id, current_month_start, today)
    prev_kwh = month_total(household_id, prev_month_start, prev_month_end)

    target_bill = user.get("target_bill", 0)
    projected_bill = round(current_kwh * 0.33 * (30 / max(today.day, 1)), 2)
    change_pct = round(((current_kwh - prev_kwh) / prev_kwh * 100) if prev_kwh else 0, 1)
    savings_sgd = round(current_kwh * 0.33 - prev_kwh * 0.33, 2)
    # target_reduction = 10  # default 10% target
    # on_track = change_pct <= -target_reduction
    on_track = (projected_bill <= target_bill) if target_bill else None

    narrative = generate_monthly_analysis(
        current_month_kwh=current_kwh,
        previous_month_kwh=prev_kwh,
        target_bill=target_bill,
        projected_bill=projected_bill,
        flat_type=user["flat_type"],
    )

    return AIMonthlyAnalysisResponse(
        user_id=settings.user_id,
        current_month_kwh=round(current_kwh, 2),
        previous_month_kwh=round(prev_kwh, 2),
        change_pct=change_pct,
        savings_sgd=savings_sgd,
        projected_bill_sgd=projected_bill,
        target_bill_sgd=target_bill,
        on_track_for_target=on_track,
        narrative=narrative,
        generated_at=datetime.utcnow().isoformat(),
    )


@router.post("/chat", response_model=ChatResponse)
def ai_chat(req: ChatRequest):
    user_context = ""
    user_id = req.user_id or settings.user_id
    if user_id:
        try:
            db = get_client()
            user = _get_user(db, user_id)
            today = get_app_date()
            yesterday = today - timedelta(days=1)
            household_id = user["household_id"]

            def _scalar(sql, params):
                rows = db.query(sql, parameters=params).result_rows
                return float(rows[0][0] or 0) if rows else 0.0

            today_kwh = _scalar(
                "SELECT sum(`Consumption(kWh)`) FROM consumption_per_household_daily WHERE HouseholdID={hid:String} AND Day={d:Date}",
                {"hid": household_id, "d": today.isoformat()},
            )
            yesterday_kwh = _scalar(
                "SELECT sum(`Consumption(kWh)`) FROM consumption_per_household_daily WHERE HouseholdID={hid:String} AND Day={d:Date}",
                {"hid": household_id, "d": yesterday.isoformat()},
            )
            block_avg_kwh = _scalar(
                """
                SELECT avg(`Consumption(kWh)`)
                FROM consumption_per_household_daily e
                JOIN details_per_household hd ON e.HouseholdID = toString(hd.HouseholdID)
                WHERE hd.PostalCode={pc:String} AND e.Day = {d:Date}
                """,
                {"pc": user["postal_code"], "d": today.isoformat()},
            )
            # peak hour
            peak_rows = db.query(
                "SELECT Timestamp FROM consumption_per_household WHERE HouseholdID={hid:String} AND toDate(Timestamp)={d:Date} ORDER BY `Consumption(kWh)` DESC LIMIT 1",
                parameters={"hid": household_id, "d": today.isoformat()},
            ).result_rows
            peak_hour = peak_rows[0][0].strftime("%H:%M") if peak_rows else "N/A"

            diff_block = today_kwh - block_avg_kwh
            diff_yesterday = today_kwh - yesterday_kwh

            user_context = (
                f"User profile: {user['flat_type']} HDB flat at postal code {user['postal_code']}, "
                f"{user.get('num_residents', 0)} residents, aircon usage level {user.get('aircon_usage', 0)}, "
                f"WFH {user.get('num_wfh', 0)} days/week. "
                f"Today's usage so far: {today_kwh:.2f} kWh (peak at {peak_hour}). "
                f"Block average today: {block_avg_kwh:.2f} kWh "
                f"({'above' if diff_block > 0 else 'below'} block average by {abs(diff_block):.2f} kWh). "
                f"Yesterday's total: {yesterday_kwh:.2f} kWh "
                f"({'up' if diff_yesterday > 0 else 'down'} {abs(diff_yesterday):.2f} kWh vs yesterday). "
                "Use these REAL numbers when answering questions about their usage."
            )
        except Exception:
            pass

    history = [{"role": m.role, "content": m.content} for m in req.history]
    reply = chat_with_coach(req.message, history, user_context)
    return ChatResponse(reply=reply)


# ---- Anomaly Detection (simple aggregation) ----

@router.get("/anomaly", response_model=AnomalyResponse)
def get_anomaly():
    """Compare today's usage to the user's 7-day average.
    If today > 1.3x the 7-day avg, flag as anomaly."""
    client = get_client()
    user = _get_user(client, settings.user_id)
    household_id = user["household_id"]

    today = get_app_date()
    week_ago = today - timedelta(days=7)

    rows = client.query(
        """
        SELECT
            sumIf(`Consumption(kWh)`, Day = {today:Date})                          AS today_kwh,
            sum(`Consumption(kWh)`) / 7                                                AS avg_7d_kwh
        FROM consumption_per_household_daily
        WHERE HouseholdID = {hid:String}
          AND Day BETWEEN {start:Date} AND {today:Date}
        """,
        parameters={"hid": household_id, "today": today.isoformat(), "start": week_ago.isoformat()},
    ).result_rows

    today_kwh = float(rows[0][0] or 0) if rows else 0
    avg_7d = float(rows[0][1] or 0) if rows else 0
    has_anomaly = (avg_7d > 0) and (today_kwh > avg_7d * 1.3)

    if has_anomaly:
        analysis = (
            f"Your usage today ({today_kwh:.2f} kWh) is significantly higher than your "
            f"7-day average ({avg_7d:.2f} kWh). Check if any high-power appliances "
            f"were left running longer than usual."
        )
    elif avg_7d == 0:
        analysis = "Not enough usage data to detect anomalies yet."
    else:
        analysis = (
            f"Your usage today ({today_kwh:.2f} kWh) is within the normal range "
            f"compared to your 7-day average ({avg_7d:.2f} kWh). Keep it up!"
        )

    return AnomalyResponse(
        user_id=settings.user_id,
        has_anomaly=has_anomaly,
        analysis=analysis,
        generated_at=datetime.utcnow().isoformat(),
    )


# ---- Projections ----

@router.get("/projections", response_model=ProjectionsResponse)
def get_projections():
    """Project the month-end bill based on current month usage so far."""
    client = get_client()
    user = _get_user(client, settings.user_id)
    household_id = user["household_id"]

    today = get_app_date()
    month_start = today.replace(day=1)
    days_elapsed = max((today - month_start).days + 1, 1)
    days_in_month = calendar.monthrange(today.year, today.month)[1]
    days_remaining = days_in_month - days_elapsed

    rows = client.query(
        "SELECT sum(`Consumption(kWh)`) FROM consumption_per_household_daily WHERE HouseholdID={hid:String} AND Day BETWEEN {s:Date} AND {e:Date}",
        parameters={"hid": household_id, "s": month_start.isoformat(), "e": today.isoformat()},
    ).result_rows
    month_so_far = float(rows[0][0] or 0) if rows else 0

    avg_daily = month_so_far / days_elapsed
    projected_total = avg_daily * days_in_month
    tariff = 0.33  # SGD per kWh (approximate SP tariff)
    projected_bill = round(projected_total * tariff, 2)

    # Read target bill from user profile (stored during onboarding)
    raw_target = user.get("target_bill")
    target_bill = float(raw_target) if raw_target else None
    if target_bill is not None and target_bill <= 0:
        target_bill = None

    return ProjectionsResponse(
        user_id=settings.user_id,
        projected_bill_sgd=projected_bill,
        projected_avg_daily_kwh=round(avg_daily, 2),
        projected_total_kwh=round(projected_total, 2),
        days_remaining=days_remaining,
        target_bill_sgd=target_bill,
        generated_at=datetime.utcnow().isoformat(),
    )


# ---- Household Benchmark ----

@router.get("/benchmark", response_model=HouseholdBenchmarkResponse)
def get_benchmark():
    """Compare user's recent avg daily usage to others with the same flat type in the same district."""
    client = get_client()
    user = _get_user(client, settings.user_id)
    household_id = user["household_id"]

    today = get_app_date()
    week_ago = today - timedelta(days=7)

    # User's average daily kWh over the past 7 days
    user_rows = client.query(
        "SELECT sum(`Consumption(kWh)`) / 7 FROM consumption_per_household_daily WHERE HouseholdID={hid:String} AND Day BETWEEN {s:Date} AND {e:Date}",
        parameters={"hid": household_id, "s": week_ago.isoformat(), "e": today.isoformat()},
    ).result_rows
    user_avg = float(user_rows[0][0] or 0) if user_rows else 0

    district = user["district"]

    # Average daily kWh for users with same flat_type in the same district
    profile_rows = client.query(
        """
        SELECT sum(`Consumption(kWh)`) / countDistinct(e.HouseholdID) / 7
        FROM consumption_per_household_daily e
        JOIN details_per_household hd ON e.HouseholdID = toString(hd.HouseholdID)
        WHERE hd.Flat_type = {ft:String}
          AND hd.District = {dist:String}
          AND e.Day BETWEEN {s:Date} AND {e_end:Date}
        """,
        parameters={
            "ft": user["flat_type"],
            "dist": district,
            "s": week_ago.isoformat(),
            "e_end": today.isoformat(),
        },
    ).result_rows
    profile_avg = float(profile_rows[0][0] or 0) if profile_rows else 0

    diff_pct = round(((user_avg - profile_avg) / profile_avg * 100) if profile_avg else 0, 1)

    return HouseholdBenchmarkResponse(
        user_id=settings.user_id,
        flat_type=user["flat_type"],
        district=district,
        user_avg_daily_kwh=round(user_avg, 2),
        profile_avg_daily_kwh=round(profile_avg, 2),
        difference_pct=diff_pct,
        generated_at=datetime.utcnow().isoformat(),
    )
