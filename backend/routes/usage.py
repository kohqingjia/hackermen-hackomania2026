"""
Usage route
GET /api/usage/{user_id}?date=YYYY-MM-DD
  Returns half-hourly kWh for a household on a given day.
  Looks up household_data to find the user's HouseholdID, then queries
  household_electricity_usage for Consumption data.
"""

from datetime import date, datetime
from fastapi import APIRouter, Query, HTTPException
from database.clickhouse import get_client
from config import settings
from models.schemas import UsageResponse, HalfHourlyPoint
from utils.datetime_helper import get_app_date

router = APIRouter(prefix="/api/usage", tags=["usage"])


def _get_household_id(client, user_id: str) -> str:
    """Look up the HouseholdID for a user from household_data."""
    row = client.query(
        "SELECT HouseholdID FROM household_data WHERE UserID = {uid:String} LIMIT 1",
        parameters={"uid": user_id},
    ).result_rows
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return row[0][0]


@router.get("/", response_model=UsageResponse)
def get_usage(
    query_date: str = Query(default=None, alias="date"),
):
    client = get_client()
    household_id = _get_household_id(client, settings.user_id)

    target_date = date.fromisoformat(query_date) if query_date else get_app_date()
    date_str = target_date.isoformat()

    rows = client.query(
        """
        SELECT Timestamp, Consumption
        FROM household_electricity_usage
        WHERE HouseholdID = {hid:String}
          AND toDate(Timestamp) = {d:Date}
        ORDER BY Timestamp ASC
        """,
        parameters={"hid": household_id, "d": date_str},
    ).result_rows

    if not rows:
        raise HTTPException(status_code=404, detail=f"No usage data for {date_str}")

    data = [
        HalfHourlyPoint(
            timestamp=str(r[0]),
            electricity_kwh=round(float(r[1]), 4),
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
