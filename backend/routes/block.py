"""
Block route
GET /api/block/{postal_code}?date=YYYY-MM-DD&user_id=...
  Returns block-level (postal code) aggregated usage vs the user's own usage.
    Queries consumption_per_household joined with details_per_household for grouping.
"""

from datetime import date, timedelta
import math
from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from database.clickhouse import get_client
from models.schemas import BlockUsageResponse, HalfHourlyPoint, DailyComparisonPoint, WeeklyComparisonPoint
from utils.datetime_helper import get_app_date
from utils.user_resolver import resolve_user_id

router = APIRouter(prefix="/api/block", tags=["block"])


def _safe(v, ndigits=4) -> float:
    """Return 0.0 for NaN / Inf, else round."""
    f = float(v) if v is not None else 0.0
    if math.isnan(f) or math.isinf(f):
        return 0.0
    return round(f, ndigits)


def _resolve_user(client, user_id: str) -> tuple[str, str]:
    """Return (HouseholdID, PostalCode) for the given user."""
    row = client.query(
        "SELECT toString(HouseholdID), PostalCode FROM details_per_household WHERE toString(UserID) = {uid:String} LIMIT 1",
        parameters={"uid": user_id},
    ).result_rows
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return str(row[0][0]), str(row[0][1])


def _household_ids_for_postal(client, postal_code: str) -> list[str]:
    """Return all HouseholdIDs in a postal code."""
    rows = client.query(
        "SELECT DISTINCT toString(HouseholdID) FROM details_per_household WHERE PostalCode = {pc:String}",
        parameters={"pc": postal_code},
    ).result_rows
    return [r[0] for r in rows]


@router.get("/{postal_code}", response_model=BlockUsageResponse)
def get_block_usage( 
    postal_code: str,
    query_date: str = Query(default=None, alias="date"),
    user_id: Optional[str] = Query(default=None),
):
    client = get_client()
    target_date = date.fromisoformat(query_date) if query_date else get_app_date()
    date_str = target_date.isoformat()

    effective_uid = resolve_user_id(user_id)
    household_id, _ = _resolve_user(client, effective_uid)

    # Block average per half-hour slot (all households in this postal code)
    block_rows = client.query(
        """
        SELECT e.Timestamp, avg(`Consumption(kWh)`) AS avg_kwh
        FROM consumption_per_household e
        JOIN details_per_household hd ON e.HouseholdID = toString(hd.HouseholdID)
        WHERE hd.PostalCode = {pc:String}
          AND toDate(e.Timestamp) = {d:Date}
        GROUP BY e.Timestamp
        ORDER BY e.Timestamp ASC
        """,
        parameters={"pc": postal_code, "d": date_str},
    ).result_rows

    # User's own readings
    user_rows = client.query(
        """
        SELECT Timestamp, `Consumption(kWh)`
                FROM consumption_per_household
        WHERE HouseholdID = {hid:String}
          AND toDate(Timestamp) = {d:Date}
        ORDER BY Timestamp ASC
        """,
        parameters={"hid": household_id, "d": date_str},
    ).result_rows

    if not block_rows:
        raise HTTPException(status_code=404, detail=f"No block data for {postal_code} on {date_str}")

    hourly_block_avg = [
        HalfHourlyPoint(timestamp=str(r[0]), electricity_kwh=_safe(r[1], 4), hour_label=r[0].strftime("%H:%M"))
        for r in block_rows
    ]
    hourly_user = [
        HalfHourlyPoint(timestamp=str(r[0]), electricity_kwh=_safe(r[1], 4), hour_label=r[0].strftime("%H:%M"))
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

    # User's own daily consumption (already summed per day in table)
    user_rows = client.query(
        """
        SELECT Day, `Consumption(kWh)`
        FROM consumption_per_household_daily
        WHERE HouseholdID = {hid:String}
          AND Day BETWEEN {s:Date} AND {e_end:Date}
        ORDER BY Day ASC
        """,
        parameters={"hid": household_id, "s": start.isoformat(), "e_end": ref_date.isoformat()},
    ).result_rows
    user_by_day = {r[0]: float(r[1]) for r in user_rows}

    # Block average per day across all households in this postal code
    block_rows = client.query(
        """
        SELECT cd.Day, avg(`Consumption(kWh)`) AS block_avg
        FROM consumption_per_household_daily cd
        JOIN details_per_household hd ON cd.HouseholdID = toString(hd.HouseholdID)
        WHERE hd.PostalCode = {pc:String}
          AND cd.Day BETWEEN {s:Date} AND {e_end:Date}
        GROUP BY cd.Day
        ORDER BY cd.Day ASC
        """,
        parameters={"pc": postal_code, "s": start.isoformat(), "e_end": ref_date.isoformat()},
    ).result_rows

    return [
        DailyComparisonPoint(
            day_label=r[0].strftime("%a"),
            user_avg_kwh=_safe(user_by_day.get(r[0], 0), 2),
            block_avg_kwh=_safe(r[1], 2),
        )
        for r in block_rows
    ]


def _weekly_comparison_month(client, postal_code: str, household_id: str, ref_date: date) -> list[WeeklyComparisonPoint]:
    """Last 4 weeks: user weekly average vs block weekly average."""
    start = ref_date - timedelta(days=27)

    # User's weekly average (avg of daily values per week)
    user_rows = client.query(
        """
        SELECT toMonday(Day) AS wk, avg(`Consumption(kWh)`) AS user_avg
        FROM consumption_per_household_daily
        WHERE HouseholdID = {hid:String}
          AND Day BETWEEN {s:Date} AND {e_end:Date}
        GROUP BY wk
        ORDER BY wk ASC
        """,
        parameters={"hid": household_id, "s": start.isoformat(), "e_end": ref_date.isoformat()},
    ).result_rows
    user_by_wk = {r[0]: float(r[1]) for r in user_rows}

    # Block weekly average across all households in this postal code
    block_rows = client.query(
        """
        SELECT toMonday(cd.Day) AS wk, avg(`Consumption(kWh)`) AS block_avg
        FROM consumption_per_household_daily cd
        JOIN details_per_household hd ON cd.HouseholdID = toString(hd.HouseholdID)
        WHERE hd.PostalCode = {pc:String}
          AND cd.Day BETWEEN {s:Date} AND {e_end:Date}
        GROUP BY wk
        ORDER BY wk ASC
        """,
        parameters={"pc": postal_code, "s": start.isoformat(), "e_end": ref_date.isoformat()},
    ).result_rows

    return [
        WeeklyComparisonPoint(
            week_label=f"W{i+1}",
            user_avg_kwh=_safe(user_by_wk.get(r[0], 0), 2),
            block_avg_kwh=_safe(r[1], 2),
        )
        for i, r in enumerate(block_rows)
    ]
