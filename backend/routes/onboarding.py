"""
Onboarding route
POST /api/onboarding  — save user profile into household_data + household_user_input, return user_id
GET  /api/onboarding/{user_id} — retrieve saved profile
"""

import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from database.clickhouse import get_client
from models.schemas import OnboardingRequest, OnboardingResponse

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])


@router.post("", response_model=OnboardingResponse)
def create_onboarding(data: OnboardingRequest):
    user_id = str(uuid.uuid4())
    client = get_client()

    # Insert into household_data
    client.insert(
        "household_data",
        [[
            user_id,
            data.household_id,
            data.area,
            data.region,
            data.district,
            data.postal_code,
            data.dwelling_type,
            data.flat_type,
        ]],
        column_names=[
            "UserID", "HouseholdID", "Area", "Region", "District",
            "Postal_Code", "Dwelling_type", "Flat_type",
        ],
    )

    # Insert into household_user_input
    client.insert(
        "household_user_input",
        [[
            user_id,
            data.household_id,
            data.floor_area_sqm or 0,
            data.num_residents,
            data.num_children,
            data.num_elderly,
            data.num_tenants,
            data.aircon_usage,
            data.num_aircons,
            str(data.has_wfh_days),
            data.num_wfh,
        ]],
        column_names=[
            "UserID", "HouseholdID", "Floor_area_sqm", "Num_residents",
            "Num_children", "Num_elderly", "Num_tenants",
            "Aircon_usage", "Num_Aircons", "Has_WFH_days", "Num_WFH",
        ],
    )

    return OnboardingResponse(user_id=user_id, message="Profile saved successfully.")


@router.get("/{user_id}")
def get_onboarding(user_id: str):
    client = get_client()
    # Join household_data and household_user_input
    result = client.query(
        """
        SELECT
            hd.UserID, hd.HouseholdID, hd.Area, hd.Region, hd.District,
            hd.Postal_Code, hd.Dwelling_type, hd.Flat_type,
            hui.Floor_area_sqm, hui.Num_residents, hui.Num_children,
            hui.Num_elderly, hui.Num_tenants, hui.Aircon_usage,
            hui.Num_Aircons, hui.Has_WFH_days, hui.Num_WFH
        FROM household_data hd
        LEFT JOIN household_user_input hui ON hd.UserID = hui.UserID
        WHERE hd.UserID = {uid:String}
        LIMIT 1
        """,
        parameters={"uid": user_id},
    )
    if not result.result_rows:
        raise HTTPException(status_code=404, detail="User not found")

    row = result.result_rows[0]
    cols = result.column_names
    return dict(zip(cols, row))
