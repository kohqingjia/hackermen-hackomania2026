"""
Block route
GET /api/block/{block_id}?date=YYYY-MM-DD&user_id=...
  Returns block-level aggregated usage vs the user's own usage.
"""

from datetime import date
from fastapi import APIRouter, Query, HTTPException
from database.clickhouse import get_client
from models.schemas import BlockUsageResponse, HalfHourlyPoint

router = APIRouter(prefix="/api/block", tags=["block"])


@router.get("/{block_id}", response_model=BlockUsageResponse)
def get_block_usage(
    block_id: str,
    user_id: str = Query(...),
    query_date: str = Query(default=None, alias="date"),
):
    client = get_client()
    target_date = date.fromisoformat(query_date) if query_date else date.today()
    date_str = target_date.isoformat()

    # Resolve user's household
    user_row = client.query(
        "SELECT block_id FROM users WHERE user_id = {uid:String} LIMIT 1",
        parameters={"uid": user_id},
    )
    if not user_row.result_rows:
        raise HTTPException(status_code=404, detail="User not found")

    user_block = user_row.result_rows[0][0]
    idx = int(user_id.replace("-", "")[:4], 16) % 10
    household_id = f"{user_block}-HH{idx:02d}"

    # Block average per half-hour slot
    block_rows = client.query(
        """
        SELECT timestamp, avg(electricity_kwh) AS avg_kwh
        FROM energy_usage
        WHERE block_id = {bid:String}
          AND toDate(timestamp) = {d:Date}
        GROUP BY timestamp
        ORDER BY timestamp ASC
        """,
        parameters={"bid": block_id, "d": date_str},
    ).result_rows

    # User's own readings
    user_rows = client.query(
        """
        SELECT timestamp, electricity_kwh
        FROM energy_usage
        WHERE household_id = {hid:String}
          AND toDate(timestamp) = {d:Date}
        ORDER BY timestamp ASC
        """,
        parameters={"hid": household_id, "d": date_str},
    ).result_rows

    if not block_rows:
        raise HTTPException(status_code=404, detail=f"No block data for {block_id} on {date_str}")

    hourly_block_avg = [
        HalfHourlyPoint(timestamp=str(r[0]), electricity_kwh=round(r[1], 4), hour_label=r[0].strftime("%H:%M"))
        for r in block_rows
    ]
    hourly_user = [
        HalfHourlyPoint(timestamp=str(r[0]), electricity_kwh=round(r[1], 4), hour_label=r[0].strftime("%H:%M"))
        for r in user_rows
    ] if user_rows else hourly_block_avg  # fallback to block avg if no user data

    block_avg_kwh = round(sum(p.electricity_kwh for p in hourly_block_avg), 3)
    user_kwh = round(sum(p.electricity_kwh for p in hourly_user), 3)
    diff = round(user_kwh - block_avg_kwh, 3)
    diff_pct = round((diff / block_avg_kwh * 100) if block_avg_kwh else 0, 1)

    return BlockUsageResponse(
        block_id=block_id,
        date=date_str,
        block_avg_kwh=block_avg_kwh,
        user_kwh=user_kwh,
        difference_kwh=diff,
        difference_pct=diff_pct,
        hourly_block_avg=hourly_block_avg,
        hourly_user=hourly_user,
    )
