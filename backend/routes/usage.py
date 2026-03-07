"""
Usage route
GET /api/usage/{user_id}?date=YYYY-MM-DD
  Returns half-hourly kWh for a household on a given day.
  Looks up household_data to find the user's HouseholdID, then queries
  household_electricity_usage for Consumption data.
"""

from datetime import date, datetime
from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from database.clickhouse import get_client
from models.schemas import UsageResponse, HalfHourlyPoint
from utils.datetime_helper import get_app_date
from utils.user_resolver import resolve_user_id

router = APIRouter(prefix="/api/usage", tags=["usage"])


def _get_household_id(client, user_id: str) -> str:
    """Look up the HouseholdID for a user from details_per_household."""
    row = client.query(
        "SELECT toString(HouseholdID) FROM details_per_household WHERE toString(UserID) = {uid:String} LIMIT 1",
        parameters={"uid": user_id},
    ).result_rows
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return str(row[0][0])


@router.get("/", response_model=UsageResponse)
def get_usage(
    query_date: str = Query(default=None, alias="date"),
    user_id: Optional[str] = Query(default=None),
):
    client = get_client()
    effective_uid = resolve_user_id(user_id)
    household_id = _get_household_id(client, effective_uid)

    target_date = date.fromisoformat(query_date) if query_date else get_app_date()
    date_str = target_date.isoformat()

    rows = client.query(
        """
        SELECT Timestamp, `Consumption(kWh)`
        FROM consumption_per_household
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
        user_id=effective_uid,
        date=date_str,
        data=data,
        total_kwh=total_kwh,
        peak_kwh=peak_point.electricity_kwh,
        peak_hour=peak_point.hour_label,
    )
