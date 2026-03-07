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

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])

RANK_POINTS = {1: 100, 2: 80, 3: 25}


def _week_start(d: date) -> date:
    return d - timedelta(days=d.weekday())


@router.get("/{district}", response_model=LeaderboardResponse)
def get_leaderboard(
    district: str,
    query_date: str = Query(default=None, alias="date"),
):
    client = get_client()
    target_date = date.fromisoformat(query_date) if query_date else get_app_date()
    week_start = _week_start(target_date)
    week_end = week_start + timedelta(days=6)
    prev_week_start = week_start - timedelta(days=7)
    prev_week_end = week_start - timedelta(days=1)

    # Current week avg per postal code
    current = client.query(
        """
        SELECT hd.PostalCode, avg(`Consumption(kWh)`) * 48 AS daily_avg
        FROM consumption_per_household e
        JOIN details_per_household hd ON e.HouseholdID = toString(hd.HouseholdID)
        WHERE hd.District = {dist:String}
          AND toDate(e.Timestamp) BETWEEN {ws:Date} AND {we:Date}
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
        SELECT hd.PostalCode, avg(`Consumption(kWh)`) * 48 AS daily_avg
        FROM consumption_per_household e
        JOIN details_per_household hd ON e.HouseholdID = toString(hd.HouseholdID)
        WHERE hd.District = {dist:String}
          AND toDate(e.Timestamp) BETWEEN {ws:Date} AND {we:Date}
        GROUP BY hd.PostalCode
        """,
        parameters={
            "dist": district,
            "ws": prev_week_start.isoformat(),
            "we": prev_week_end.isoformat(),
        },
    ).result_rows

    prev_map = {r[0]: r[1] for r in prev}

    # Historical average = first day of data
    historical_avg = client.query(
        """
        SELECT hd.PostalCode, avg(`Consumption(kWh)`) * 48 AS daily_avg
        FROM consumption_per_household e
        JOIN details_per_household hd ON e.HouseholdID = toString(hd.HouseholdID)
        WHERE hd.District = {dist:String}
          AND toDate(e.Timestamp) = (
              SELECT min(toDate(Timestamp)) FROM consumption_per_household
          )
        GROUP BY hd.PostalCode
        """,
        parameters={"dist": district},
    ).result_rows
    historical_avg_map = {r[0]: r[1] for r in historical_avg}

    entries = []
    for rank, (postal_code, avg_kwh) in enumerate(current, start=1):
        prev_avg = prev_map.get(postal_code, avg_kwh)
        base_avg = historical_avg_map.get(postal_code, avg_kwh)
        reduction_pct = round(((base_avg - avg_kwh) / base_avg * 100) if base_avg else 0, 1)
        weekly_change = round(avg_kwh - prev_avg, 3)
        points = RANK_POINTS.get(rank, 10)

        entries.append(LeaderboardEntry(
            rank=rank,
            postal_code=postal_code,
            avg_kwh=round(avg_kwh, 3),
            reduction_pct=reduction_pct,
            points=points,
            weekly_change=weekly_change,
        ))

    district_avg_kwh = round(sum(avg for _, avg in current) / len(current), 3) if current else 0.0

    weekly_top3_history = []
    for week_offset in range(1, 6):
        hist_week_start = week_start - timedelta(days=week_offset * 7)
        hist_week_end = hist_week_start + timedelta(days=6)
        week_rows = client.query(
            """
            SELECT hd.PostalCode AS block_id, avg(`Consumption(kWh)`) * 48 AS daily_avg
            FROM consumption_per_household e
            JOIN details_per_household hd ON e.HouseholdID = toString(hd.HouseholdID)
            WHERE hd.District = {dist:String}
              AND toDate(e.Timestamp) BETWEEN {ws:Date} AND {we:Date}
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
            WeeklyTopBlock(rank=i, block_id=block_id, avg_kwh=round(avg_kwh, 3))
            for i, (block_id, avg_kwh) in enumerate(top3_rows, start=1)
        ]
        block_avg_kwh_by_block = {
            block_id: round(avg_kwh, 3)
            for block_id, avg_kwh in week_rows
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
    )
