"""
Leaderboard route
GET /api/leaderboard/{district}
  Returns weekly postal-code (block) rankings with points.
  Resets every Monday. Points: 1st=100, 2nd=80, 3rd=25.
"""

from datetime import date, timedelta
from fastapi import APIRouter, Query
from database.clickhouse import get_client
from models.schemas import LeaderboardResponse, LeaderboardEntry, WeeklyTopThree, WeeklyTopBlock
from utils.datetime_helper import get_app_date
from services.onemap_service import get_block_no_batch

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])

RANK_POINTS = {1: 100, 2: 80, 3: 25}

DISTRICT_ALIAS: dict[str, str] = {
    "yishun": "D27",
}


def _week_start(d: date) -> date:
    return d - timedelta(days=d.weekday())


@router.get("/{district}", response_model=LeaderboardResponse)
def get_leaderboard(
    district: str,
    query_date: str = Query(default=None, alias="date"),
):
    client = get_client()
    target_date = date.fromisoformat(query_date) if query_date else get_app_date()
    district = DISTRICT_ALIAS.get(district.lower(), district)
    week_start = _week_start(target_date)
    week_end = week_start + timedelta(days=6)
    prev_week_start = week_start - timedelta(days=7)
    prev_week_end = week_start - timedelta(days=1)

    # Current week avg per postal code
    current = client.query(
        """
        SELECT hd.PostalCode, avg(`Consumption(kWh)`) AS daily_avg
        FROM consumption_per_household_daily e
        JOIN details_per_household hd ON e.HouseholdID = toString(hd.HouseholdID)
        WHERE hd.District = {dist:String}
          AND e.Day BETWEEN {ws:Date} AND {we:Date}
        GROUP BY hd.PostalCode
        ORDER BY daily_avg ASC
        """,
        parameters={
            "dist": district,
            "ws": week_start.isoformat(),
            "we": week_end.isoformat(),
        },
    ).result_rows

    # Previous week for comparison
    prev = client.query(
        """
        SELECT hd.PostalCode, avg(`Consumption(kWh)`) AS daily_avg
        FROM consumption_per_household_daily e
        JOIN details_per_household hd ON e.HouseholdID = toString(hd.HouseholdID)
        WHERE hd.District = {dist:String}
          AND e.Day BETWEEN {ws:Date} AND {we:Date}
        GROUP BY hd.PostalCode
        """,
        parameters={
            "dist": district,
            "ws": prev_week_start.isoformat(),
            "we": prev_week_end.isoformat(),
        },
    ).result_rows

    prev_map = {r[0]: r[1] for r in prev}

    # District average = average of each block's average consumption (via SQL)
    district_avg_row = client.query(
        """
        SELECT avg(block_avg) AS district_avg
        FROM (
            SELECT hd.PostalCode, avg(`Consumption(kWh)`) AS block_avg
            FROM consumption_per_household_daily e
            JOIN details_per_household hd ON e.HouseholdID = toString(hd.HouseholdID)
            WHERE hd.District = {dist:String}
              AND e.Day BETWEEN {ws:Date} AND {we:Date}
            GROUP BY hd.PostalCode
        )
        """,
        parameters={
            "dist": district,
            "ws": week_start.isoformat(),
            "we": week_end.isoformat(),
        },
    ).result_rows
    district_avg_kwh = round(district_avg_row[0][0], 3) if district_avg_row and district_avg_row[0][0] else 0.0

    # Resolve all postal codes to HDB block numbers in one batch
    all_postal_codes = [r[0] for r in current]
    block_no_map = get_block_no_batch(all_postal_codes)

    entries = []
    for rank, (postal_code, avg_kwh) in enumerate(current, start=1):
        prev_avg = prev_map.get(postal_code, avg_kwh)
        reduction_pct = round(((district_avg_kwh - avg_kwh) / district_avg_kwh * 100) if district_avg_kwh else 0, 1)
        weekly_change = round(avg_kwh - prev_avg, 3)
        points = RANK_POINTS.get(rank, 10)

        entries.append(LeaderboardEntry(
            rank=rank,
            postal_code=postal_code,
            block_no=block_no_map.get(postal_code),
            avg_kwh=round(avg_kwh, 3),
            reduction_pct=reduction_pct,
            points=points,
            weekly_change=weekly_change,
        ))

    weekly_top3_history = []
    for week_offset in range(1, 6):
        hist_week_start = week_start - timedelta(days=week_offset * 7)
        hist_week_end = hist_week_start + timedelta(days=6)
        week_rows = client.query(
            """
            SELECT hd.PostalCode AS block_id, avg(`Consumption(kWh)`) AS daily_avg
            FROM consumption_per_household_daily e
            JOIN details_per_household hd ON e.HouseholdID = toString(hd.HouseholdID)
            WHERE hd.District = {dist:String}
              AND e.Day BETWEEN {ws:Date} AND {we:Date}
            GROUP BY hd.PostalCode
            ORDER BY daily_avg ASC
            """,
            parameters={
                "dist": district,
                "ws": hist_week_start.isoformat(),
                "we": hist_week_end.isoformat(),
            },
        ).result_rows

        top3_rows = week_rows[:3]
        winners = [
            WeeklyTopBlock(rank=i, postal_code=postal_code, block_no=block_no_map.get(postal_code), avg_kwh=round(avg_kwh, 3))
            for i, (postal_code, avg_kwh) in enumerate(top3_rows, start=1)
        ]
        block_avg_kwh_by_block = {
            postal_code: round(avg_kwh, 3)
            for postal_code, avg_kwh in week_rows
        }
        weekly_top3_history.append(WeeklyTopThree(
            week_start=hist_week_start.isoformat(),
            winners=winners,
            block_avg_kwh_by_block=block_avg_kwh_by_block,
        ))

    next_monday = week_start + timedelta(days=7)
    resets_in = (next_monday - target_date).days

    return LeaderboardResponse(
        week_start=week_start.isoformat(),
        district=district,
        district_avg_kwh=district_avg_kwh,
        entries=entries,
        weekly_top3_history=weekly_top3_history,
        resets_in_days=resets_in,
        block_no_map=block_no_map,
    )
