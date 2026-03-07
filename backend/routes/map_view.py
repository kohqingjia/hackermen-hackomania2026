"""
Map view route
GET /api/map/{district}?date=YYYY-MM-DD
  Returns all postal codes (blocks) in a district with avg usage and % reduction
  vs the previous week. Used to colour-code blocks on the map.
"""

from datetime import date, timedelta
from fastapi import APIRouter, Query
from database.clickhouse import get_client
from models.schemas import MapResponse, BlockMapEntry
from utils.datetime_helper import get_app_date
from services.onemap_service import geocode_postal

router = APIRouter(prefix="/api/map", tags=["map"])

# Hardcoded fallback coords (used when OneMap is unavailable)
POSTAL_COORDS = {
    "752339": (1.4268, 103.8354),
    "752341": (1.4275, 103.8362),
    "750341": (1.4282, 103.8347),
    "751339": (1.4258, 103.8369),
    "750331": (1.4290, 103.8380),
}

# Friendly display name → DB district code
DISTRICT_ALIAS = {
    "yishun": "D27",
    "sembawang": "D27",
}


@router.get("/{district}", response_model=MapResponse)
def get_map(
    district: str,
    query_date: str = Query(default=None, alias="date"),
):
    client = get_client()
    target_date = date.fromisoformat(query_date) if query_date else get_app_date()

    # Resolve friendly name → DB district code (e.g. "Yishun" → "D27")
    db_district = DISTRICT_ALIAS.get(district.lower(), district)

    # Week window (Mon–Sun) containing the target date
    week_start = target_date - timedelta(days=target_date.weekday())
    week_end = week_start + timedelta(days=6)

    # Weekly avg per postal code
    current_rows = client.query(
        """
        SELECT hd.PostalCode, avg(`Consumption(kWh)`) AS weekly_avg_kwh
        FROM consumption_per_household_daily e
        JOIN details_per_household hd ON e.HouseholdID = toString(hd.HouseholdID)
        WHERE hd.District = {dist:String}
          AND e.Day BETWEEN {ws:Date} AND {we:Date}
        GROUP BY hd.PostalCode
        ORDER BY weekly_avg_kwh ASC
        """,
        parameters={"dist": db_district, "ws": week_start.isoformat(), "we": week_end.isoformat()},
    ).result_rows

    # District average = average of each block's weekly average consumption
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
        parameters={"dist": db_district, "ws": week_start.isoformat(), "we": week_end.isoformat()},
    ).result_rows
    district_avg_kwh = round(district_avg_row[0][0], 3) if district_avg_row and district_avg_row[0][0] else 0.0

    entries = []
    for rank, (postal_code, avg_kwh) in enumerate(current_rows, start=1):
        reduction_pct = round(((district_avg_kwh - avg_kwh) / district_avg_kwh * 100) if district_avg_kwh else 0, 1)
        lat, lng = POSTAL_COORDS.get(postal_code, (1.427, 103.836))
        # Try OneMap for real coords, fall back to hardcoded
        onemap = geocode_postal(postal_code)
        if onemap:
            lat, lng = onemap

        entries.append(BlockMapEntry(
            postal_code=postal_code,
            district=district,
            avg_kwh=round(avg_kwh, 3),
            reduction_pct=reduction_pct,
            rank=rank,
            lat=lat,
            lng=lng,
        ))

    return MapResponse(district=district, blocks=entries)
