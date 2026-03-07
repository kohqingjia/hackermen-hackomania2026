"""
Usage route
GET /api/usage/{user_id}?date=YYYY-MM-DD
  Returns half-hourly kWh for a household on a given day.
  The demo maps user_id → a seeded household_id deterministically.
"""

from datetime import date, datetime
from fastapi import APIRouter, Query, HTTPException
from database.clickhouse import get_client
from models.schemas import UsageResponse, HalfHourlyPoint

router = APIRouter(prefix="/api/usage", tags=["usage"])

DEMO_HOUSEHOLD_MAP = {
    # Maps block_id to a representative household for demo
    "BLK402": "BLK402-HH00",
    "BLK403": "BLK403-HH00",
    "BLK404": "BLK404-HH00",
    "BLK405": "BLK405-HH00",
    "BLK406": "BLK406-HH00",
}


def _get_household_id(user_id: str, block_id: str) -> str:
    """Derive a deterministic household from user_id for demo."""
    idx = int(user_id.replace("-", "")[:4], 16) % 10
    return f"{block_id}-HH{idx:02d}"


@router.get("/{user_id}", response_model=UsageResponse)
def get_usage(
    user_id: str,
    query_date: str = Query(default=None, alias="date"),
):
    client = get_client()

    # Resolve user's block
    user_row = client.query(
        "SELECT block_id FROM users WHERE user_id = {uid:String} LIMIT 1",
        parameters={"uid": user_id},
    )
    if not user_row.result_rows:
        raise HTTPException(status_code=404, detail="User not found")

    block_id = user_row.result_rows[0][0]
    household_id = _get_household_id(user_id, block_id)

    target_date = date.fromisoformat(query_date) if query_date else date.today()
    date_str = target_date.isoformat()

    rows = client.query(
        """
        SELECT timestamp, electricity_kwh
        FROM energy_usage
        WHERE household_id = {hid:String}
          AND toDate(timestamp) = {d:Date}
        ORDER BY timestamp ASC
        """,
        parameters={"hid": household_id, "d": date_str},
    ).result_rows

    if not rows:
        raise HTTPException(status_code=404, detail=f"No usage data for {date_str}")

    data = [
        HalfHourlyPoint(
            timestamp=str(r[0]),
            electricity_kwh=round(r[1], 4),
            hour_label=r[0].strftime("%H:%M"),
        )
        for r in rows
    ]

    total_kwh = round(sum(p.electricity_kwh for p in data), 3)
    peak_point = max(data, key=lambda p: p.electricity_kwh)

    return UsageResponse(
        user_id=user_id,
        date=date_str,
        data=data,
        total_kwh=total_kwh,
        peak_kwh=peak_point.electricity_kwh,
        peak_hour=peak_point.hour_label,
    )
