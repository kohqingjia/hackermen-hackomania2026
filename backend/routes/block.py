"""
Block route
GET /api/block/{postal_code}?date=YYYY-MM-DD&user_id=...
  Returns block-level (postal code) aggregated usage vs the user's own usage.
  Queries household_electricity_usage joined with household_data for grouping.
"""

from datetime import date, timedelta
from fastapi import APIRouter, Query, HTTPException
from database.clickhouse import get_client
from models.schemas import BlockUsageResponse, HalfHourlyPoint, DailyComparisonPoint, WeeklyComparisonPoint

router = APIRouter(prefix="/api/block", tags=["block"])


def _resolve_user(client, user_id: str) -> tuple[str, str]:
    """Return (HouseholdID, Postal_Code) for the given user."""
    row = client.query(
        "SELECT HouseholdID, Postal_Code FROM household_data WHERE UserID = {uid:String} LIMIT 1",
        parameters={"uid": user_id},
    ).result_rows
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return row[0][0], row[0][1]


def _household_ids_for_postal(client, postal_code: str) -> list[str]:
    """Return all HouseholdIDs in a postal code."""
    rows = client.query(
        "SELECT DISTINCT HouseholdID FROM household_data WHERE Postal_Code = {pc:String}",
        parameters={"pc": postal_code},
    ).result_rows
    return [r[0] for r in rows]


@router.get("/{postal_code}", response_model=BlockUsageResponse)
def get_block_usage(
    postal_code: str,
    user_id: str = Query(...),
    query_date: str = Query(default=None, alias="date"),
):
    client = get_client()
    target_date = date.fromisoformat(query_date) if query_date else date.today()
    date_str = target_date.isoformat()

    household_id, _ = _resolve_user(client, user_id)

    # Block average per half-hour slot (all households in this postal code)
    block_rows = client.query(
        """
        SELECT e.Timestamp, avg(e.Consumption) AS avg_kwh
        FROM household_electricity_usage e
        JOIN household_data hd ON e.HouseholdID = hd.HouseholdID
        WHERE hd.Postal_Code = {pc:String}
          AND toDate(e.Timestamp) = {d:Date}
        GROUP BY e.Timestamp
        ORDER BY e.Timestamp ASC
        """,
        parameters={"pc": postal_code, "d": date_str},
    ).result_rows

    # User's own readings
    user_rows = client.query(
        """
        SELECT Timestamp, Consumption
        FROM household_electricity_usage
        WHERE HouseholdID = {hid:String}
          AND toDate(Timestamp) = {d:Date}
        ORDER BY Timestamp ASC
        """,
        parameters={"hid": household_id, "d": date_str},
    ).result_rows

    if not block_rows:
        raise HTTPException(status_code=404, detail=f"No block data for {postal_code} on {date_str}")

    hourly_block_avg = [
        HalfHourlyPoint(timestamp=str(r[0]), electricity_kwh=round(float(r[1]), 4), hour_label=r[0].strftime("%H:%M"))
        for r in block_rows
    ]
    hourly_user = [
        HalfHourlyPoint(timestamp=str(r[0]), electricity_kwh=round(float(r[1]), 4), hour_label=r[0].strftime("%H:%M"))
        for r in user_rows
    ] if user_rows else hourly_block_avg  # fallback to block avg if no user data

    block_avg_kwh = round(sum(p.electricity_kwh for p in hourly_block_avg), 3)
    user_kwh = round(sum(p.electricity_kwh for p in hourly_user), 3)
    diff = round(user_kwh - block_avg_kwh, 3)
    diff_pct = round((diff / block_avg_kwh * 100) if block_avg_kwh else 0, 1)

    return BlockUsageResponse(
        postal_code=postal_code,
        date=date_str,
        block_avg_kwh=block_avg_kwh,
        user_kwh=user_kwh,
        difference_kwh=diff,
        difference_pct=diff_pct,
        hourly_block_avg=hourly_block_avg,
        hourly_user=hourly_user,
        daily_comparison_week=_daily_comparison_week(client, postal_code, household_id, target_date),
        weekly_comparison_month=_weekly_comparison_month(client, postal_code, household_id, target_date),
    )


def _daily_comparison_week(client, postal_code: str, household_id: str, ref_date: date) -> list[DailyComparisonPoint]:
    """Last 7 days: user daily total vs block daily average."""
    start = ref_date - timedelta(days=6)
    rows = client.query(
        """
        SELECT
            toDate(e.Timestamp) AS d,
            sumIf(e.Consumption, e.HouseholdID = {hid:String}) AS user_kwh,
            avg(e.Consumption) * 48 AS block_avg_kwh
        FROM household_electricity_usage e
        JOIN household_data hd ON e.HouseholdID = hd.HouseholdID
        WHERE hd.Postal_Code = {pc:String}
          AND toDate(e.Timestamp) BETWEEN {s:Date} AND {e_end:Date}
        GROUP BY d
        ORDER BY d ASC
        """,
        parameters={"hid": household_id, "pc": postal_code, "s": start.isoformat(), "e_end": ref_date.isoformat()},
    ).result_rows
    return [
        DailyComparisonPoint(
            day_label=r[0].strftime("%a"),
            user_avg_kwh=round(float(r[1] or 0), 2),
            block_avg_kwh=round(float(r[2] or 0), 2),
        )
        for r in rows
    ]


def _weekly_comparison_month(client, postal_code: str, household_id: str, ref_date: date) -> list[WeeklyComparisonPoint]:
    """Last 4 weeks: user weekly total vs block weekly average."""
    start = ref_date - timedelta(days=27)
    rows = client.query(
        """
        SELECT
            toMonday(toDate(e.Timestamp)) AS wk,
            sumIf(e.Consumption, e.HouseholdID = {hid:String}) / 7 AS user_avg,
            avg(e.Consumption) * 48 AS block_avg
        FROM household_electricity_usage e
        JOIN household_data hd ON e.HouseholdID = hd.HouseholdID
        WHERE hd.Postal_Code = {pc:String}
          AND toDate(e.Timestamp) BETWEEN {s:Date} AND {e_end:Date}
        GROUP BY wk
        ORDER BY wk ASC
        """,
        parameters={"hid": household_id, "pc": postal_code, "s": start.isoformat(), "e_end": ref_date.isoformat()},
    ).result_rows
    return [
        WeeklyComparisonPoint(
            week_label=f"W{i+1}",
            user_avg_kwh=round(float(r[1] or 0), 2),
            block_avg_kwh=round(float(r[2] or 0), 2),
        )
        for i, r in enumerate(rows)
    ]
