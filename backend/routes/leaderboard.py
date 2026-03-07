"""
Leaderboard route
GET /api/leaderboard/{district}
  Returns weekly postal-code (block) rankings with points.
  Resets every Monday. Points: 1st=100, 2nd=80, 3rd=25.
"""

from datetime import date, timedelta
from fastapi import APIRouter, Query
from database.clickhouse import get_client
from models.schemas import LeaderboardResponse, LeaderboardEntry

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
    target_date = date.fromisoformat(query_date) if query_date else date.today()
    week_start = _week_start(target_date)
    week_end = week_start + timedelta(days=6)
    prev_week_start = week_start - timedelta(days=7)
    prev_week_end = week_start - timedelta(days=1)

    # Current week avg per postal code
    current = client.query(
        """
        SELECT hd.Postal_Code, avg(e.Consumption) * 48 AS daily_avg
        FROM household_electricity_usage e
        JOIN household_data hd ON e.HouseholdID = hd.HouseholdID
        WHERE hd.District = {dist:String}
          AND toDate(e.Timestamp) BETWEEN {ws:Date} AND {we:Date}
        GROUP BY hd.Postal_Code
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
        SELECT hd.Postal_Code, avg(e.Consumption) * 48 AS daily_avg
        FROM household_electricity_usage e
        JOIN household_data hd ON e.HouseholdID = hd.HouseholdID
        WHERE hd.District = {dist:String}
          AND toDate(e.Timestamp) BETWEEN {ws:Date} AND {we:Date}
        GROUP BY hd.Postal_Code
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
        SELECT hd.Postal_Code, avg(e.Consumption) * 48 AS daily_avg
        FROM household_electricity_usage e
        JOIN household_data hd ON e.HouseholdID = hd.HouseholdID
        WHERE hd.District = {dist:String}
          AND toDate(e.Timestamp) = (
              SELECT min(toDate(Timestamp)) FROM household_electricity_usage
          )
        GROUP BY hd.Postal_Code
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

    next_monday = week_start + timedelta(days=7)
    resets_in = (next_monday - target_date).days

    return LeaderboardResponse(
        week_start=week_start.isoformat(),
        district=district,
        district_avg_kwh=district_avg_kwh,
        entries=entries,
        resets_in_days=resets_in,
    )
