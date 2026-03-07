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
from services.openai_service import (
    generate_usage_insight,
    generate_recommendations,
    generate_monthly_analysis,
    chat_with_coach,
)
from models.schemas import AIInsightResponse, AIRecommendResponse, AIMonthlyAnalysisResponse, AIRecommendation

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


def _get_user(client, user_id: str) -> dict:
    row = client.query(
        "SELECT block_id, household_type, age_group, energy_saving_target, work_from_home FROM users WHERE user_id={uid:String} LIMIT 1",
        parameters={"uid": user_id},
    ).result_rows
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    cols = ["block_id", "household_type", "age_group", "energy_saving_target", "work_from_home"]
    return dict(zip(cols, row[0]))


@router.get("/insights/{user_id}", response_model=AIInsightResponse)
def get_insights(
    user_id: str,
    query_date: str = Query(default=None, alias="date"),
):
    client = get_client()
    user = _get_user(client, user_id)
    target_date = date.fromisoformat(query_date) if query_date else date.today()
    yesterday = target_date - timedelta(days=1)

    idx = int(user_id.replace("-", "")[:4], 16) % 10
    household_id = f"{user['block_id']}-HH{idx:02d}"

    def daily_total(hid: str, d: date) -> float:
        rows = client.query(
            "SELECT sum(electricity_kwh) FROM energy_usage WHERE household_id={hid:String} AND toDate(timestamp)={d:Date}",
            parameters={"hid": hid, "d": d.isoformat()},
        ).result_rows
        return float(rows[0][0] or 0)

    def block_total(bid: str, d: date) -> float:
        rows = client.query(
            "SELECT avg(electricity_kwh) * 48 FROM energy_usage WHERE block_id={bid:String} AND toDate(timestamp)={d:Date}",
            parameters={"bid": bid, "d": d.isoformat()},
        ).result_rows
        return float(rows[0][0] or 0)

    def peak_hour(hid: str, d: date) -> str:
        rows = client.query(
            "SELECT timestamp FROM energy_usage WHERE household_id={hid:String} AND toDate(timestamp)={d:Date} ORDER BY electricity_kwh DESC LIMIT 1",
            parameters={"hid": hid, "d": d.isoformat()},
        ).result_rows
        return rows[0][0].strftime("%H:%M") if rows else "20:00"

    user_kwh = daily_total(household_id, target_date)
    block_avg = block_total(user["block_id"], target_date)
    prev_kwh = daily_total(household_id, yesterday)
    ph = peak_hour(household_id, target_date)

    result = generate_usage_insight(
        user_id=user_id,
        user_kwh_total=user_kwh,
        peak_hour=ph,
        block_avg_kwh=block_avg,
        prev_day_kwh=prev_kwh,
        household_type=user["household_type"],
        age_group=user["age_group"],
    )

    return AIInsightResponse(
        user_id=user_id,
        insight=result.get("insight", ""),
        tip=result.get("tip", ""),
        comparison=result.get("comparison", ""),
        generated_at=datetime.utcnow().isoformat(),
    )


@router.get("/recommend/{user_id}", response_model=AIRecommendResponse)
def get_recommendations(user_id: str):
    client = get_client()
    user = _get_user(client, user_id)

    idx = int(user_id.replace("-", "")[:4], 16) % 10
    household_id = f"{user['block_id']}-HH{idx:02d}"
    today = date.today().isoformat()

    rows = client.query(
        "SELECT electricity_kwh FROM energy_usage WHERE household_id={hid:String} AND toDate(timestamp)={d:Date} ORDER BY timestamp ASC",
        parameters={"hid": household_id, "d": today},
    ).result_rows
    kwh_by_slot = [float(r[0]) for r in rows] if rows else [0.3] * 48

    recs = generate_recommendations(
        user_kwh_by_slot=kwh_by_slot,
        household_type=user["household_type"],
        age_group=user["age_group"],
        work_from_home=bool(user["work_from_home"]),
        energy_saving_target_pct=user["energy_saving_target"],
    )

    return AIRecommendResponse(
        user_id=user_id,
        recommendations=[AIRecommendation(**r) for r in recs],
        generated_at=datetime.utcnow().isoformat(),
    )


@router.get("/analyze/{user_id}", response_model=AIMonthlyAnalysisResponse)
def get_monthly_analysis(user_id: str):
    client = get_client()
    user = _get_user(client, user_id)

    idx = int(user_id.replace("-", "")[:4], 16) % 10
    household_id = f"{user['block_id']}-HH{idx:02d}"

    today = date.today()
    current_month_start = today.replace(day=1)
    prev_month_end = current_month_start - timedelta(days=1)
    prev_month_start = prev_month_end.replace(day=1)

    def month_total(hid: str, start: date, end: date) -> float:
        rows = client.query(
            "SELECT sum(electricity_kwh) FROM energy_usage WHERE household_id={hid:String} AND toDate(timestamp) BETWEEN {s:Date} AND {e:Date}",
            parameters={"hid": hid, "s": start.isoformat(), "e": end.isoformat()},
        ).result_rows
        return float(rows[0][0] or 0)

    current_kwh = month_total(household_id, current_month_start, today)
    prev_kwh = month_total(household_id, prev_month_start, prev_month_end)

    budget_sgd = 80.0  # default budget
    projected_bill = round(current_kwh * 0.33 * (30 / max(today.day, 1)), 2)
    change_pct = round(((current_kwh - prev_kwh) / prev_kwh * 100) if prev_kwh else 0, 1)
    on_track = change_pct <= -user["energy_saving_target"]

    narrative = generate_monthly_analysis(
        current_month_kwh=current_kwh,
        previous_month_kwh=prev_kwh,
        budget_sgd=budget_sgd,
        target_reduction_pct=user["energy_saving_target"],
        household_type=user["household_type"],
    )

    return AIMonthlyAnalysisResponse(
        user_id=user_id,
        current_month_kwh=round(current_kwh, 2),
        previous_month_kwh=round(prev_kwh, 2),
        change_pct=change_pct,
        on_track_for_target=on_track,
        projected_bill_sgd=projected_bill,
        budget_sgd=budget_sgd,
        narrative=narrative,
        generated_at=datetime.utcnow().isoformat(),
    )


@router.post("/chat", response_model=ChatResponse)
def ai_chat(req: ChatRequest):
    user_context = ""
    if req.user_id:
        try:
            db = get_client()
            user = _get_user(db, req.user_id)
            today = date.today()
            yesterday = today - timedelta(days=1)
            idx = int(req.user_id.replace("-", "")[:4], 16) % 10
            household_id = f"{user['block_id']}-HH{idx:02d}"

            def _scalar(sql, params):
                rows = db.query(sql, parameters=params).result_rows
                return float(rows[0][0] or 0) if rows else 0.0

            today_kwh = _scalar(
                "SELECT sum(electricity_kwh) FROM energy_usage WHERE household_id={hid:String} AND toDate(timestamp)={d:Date}",
                {"hid": household_id, "d": today.isoformat()},
            )
            yesterday_kwh = _scalar(
                "SELECT sum(electricity_kwh) FROM energy_usage WHERE household_id={hid:String} AND toDate(timestamp)={d:Date}",
                {"hid": household_id, "d": yesterday.isoformat()},
            )
            block_avg_kwh = _scalar(
                "SELECT avg(electricity_kwh)*48 FROM energy_usage WHERE block_id={bid:String} AND toDate(timestamp)={d:Date}",
                {"bid": user["block_id"], "d": today.isoformat()},
            )
            # peak hour
            peak_rows = db.query(
                "SELECT timestamp FROM energy_usage WHERE household_id={hid:String} AND toDate(timestamp)={d:Date} ORDER BY electricity_kwh DESC LIMIT 1",
                parameters={"hid": household_id, "d": today.isoformat()},
            ).result_rows
            peak_hour = peak_rows[0][0].strftime("%H:%M") if peak_rows else "N/A"

            diff_block = today_kwh - block_avg_kwh
            diff_yesterday = today_kwh - yesterday_kwh

            user_context = (
                f"User profile: {user['household_type']} HDB flat in {user['block_id']}, "
                f"age group {user['age_group']}, energy saving target {user['energy_saving_target']}%. "
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
