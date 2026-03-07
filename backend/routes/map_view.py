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
    previous_week_date = target_date - timedelta(days=7)

    # Resolve friendly name → DB district code (e.g. "Yishun" → "D27")
    db_district = DISTRICT_ALIAS.get(district.lower(), district)

    # Current day avg per postal code
    current_rows = client.query(
        """
        SELECT hd.PostalCode, avg(`Consumption(kWh)`) * 48 AS daily_avg_kwh
        FROM consumption_per_household e
        JOIN details_per_household hd ON e.HouseholdID = toString(hd.HouseholdID)
        WHERE hd.District = {dist:String}
          AND toDate(e.Timestamp) = {d:Date}
        GROUP BY hd.PostalCode
        ORDER BY daily_avg_kwh ASC
        """,
        parameters={"dist": db_district, "d": target_date.isoformat()},
    ).result_rows

    # Previous week average (7 days ago) for comparison
    previous_week_rows = client.query(
        """
        SELECT hd.PostalCode, avg(`Consumption(kWh)`) * 48 AS daily_avg_kwh
        FROM consumption_per_household e
        JOIN details_per_household hd ON e.HouseholdID = toString(hd.HouseholdID)
        WHERE hd.District = {dist:String}
          AND toDate(e.Timestamp) = {bd:Date}
        GROUP BY hd.PostalCode
        """,
        parameters={"dist": db_district, "bd": previous_week_date.isoformat()},
    ).result_rows

    previous_week_map = {r[0]: r[1] for r in previous_week_rows}

    entries = []
    for rank, (postal_code, avg_kwh) in enumerate(current_rows, start=1):
        previous_avg = previous_week_map.get(postal_code, avg_kwh)
        reduction_pct = round(((previous_avg - avg_kwh) / previous_avg * 100) if previous_avg else 0, 1)
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
