"""
Map view route
GET /api/map/{district}?date=YYYY-MM-DD
  Returns all blocks in a district with avg usage and % reduction vs district average.
  Used to colour-code blocks on the map.
"""

from datetime import date, timedelta
from fastapi import APIRouter, Query
from database.clickhouse import get_client
from models.schemas import MapResponse, BlockMapEntry

router = APIRouter(prefix="/api/map", tags=["map"])

# Approximate lat/lng for demo HDB blocks in Yishun
BLOCK_COORDS = {
    "BLK402": (1.4268, 103.8354),
    "BLK403": (1.4275, 103.8362),
    "BLK404": (1.4282, 103.8347),
    "BLK405": (1.4258, 103.8369),
    "BLK406": (1.4290, 103.8380),
}


@router.get("/{district}", response_model=MapResponse)
def get_map(
    district: str,
    query_date: str = Query(default=None, alias="date"),
):
    client = get_client()
    target_date = date.fromisoformat(query_date) if query_date else date.today()
    previous_week_date = target_date - timedelta(days=7)

    # Current day avg per block
    current_rows = client.query(
        """
        SELECT block_id, avg(electricity_kwh) * 48 AS daily_avg_kwh
        FROM energy_usage
        WHERE district = {dist:String}
          AND toDate(timestamp) = {d:Date}
        GROUP BY block_id
        ORDER BY daily_avg_kwh ASC
        """,
        parameters={"dist": district, "d": target_date.isoformat()},
    ).result_rows

    # Previous week average (7 days ago) for comparison
    previous_week_rows = client.query(
        """
        SELECT block_id, avg(electricity_kwh) * 48 AS daily_avg_kwh
        FROM energy_usage
        WHERE district = {dist:String}
          AND toDate(timestamp) = {bd:Date}
        GROUP BY block_id
        """,
        parameters={"dist": district, "bd": previous_week_date.isoformat()},
    ).result_rows

    previous_week_map = {r[0]: r[1] for r in previous_week_rows}

    entries = []
    for rank, (block_id, avg_kwh) in enumerate(current_rows, start=1):
        previous_avg = previous_week_map.get(block_id, avg_kwh)
        reduction_pct = round(((previous_avg - avg_kwh) / previous_avg * 100) if previous_avg else 0, 1)
        lat, lng = BLOCK_COORDS.get(block_id, (1.427, 103.836))

        entries.append(BlockMapEntry(
            block_id=block_id,
            district=district,
            avg_kwh=round(avg_kwh, 3),
            reduction_pct=reduction_pct,
            rank=rank,
            lat=lat,
            lng=lng,
        ))

    return MapResponse(district=district, blocks=entries)
