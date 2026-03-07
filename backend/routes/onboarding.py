"""
Onboarding route
POST /api/onboarding  — save user profile into details_per_household + input_per_household, return user_id
GET  /api/onboarding  — resolve onboarding state from env USER_ID / HOUSEHOLD_ID
"""

import uuid
from fastapi import APIRouter, HTTPException
from database.clickhouse import get_client
from config import settings
from models.schemas import OnboardingRequest, OnboardingResponse

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])


@router.post("", response_model=OnboardingResponse)
def create_onboarding(data: OnboardingRequest):
    if not settings.household_id:
        raise HTTPException(
            status_code=400,
            detail="HOUSEHOLD_ID is required in backend env before onboarding can begin.",
        )

    configured_user_id = (settings.user_id or "").strip()
    user_id = configured_user_id or str(uuid.uuid4())
    household_id = settings.household_id
    client = get_client()

    if configured_user_id:
        configured_exists = client.query(
            "SELECT 1 FROM details_per_household WHERE toString(UserID) = {uid:String} LIMIT 1",
            parameters={"uid": configured_user_id},
        ).result_rows
        if configured_exists:
            return OnboardingResponse(
                user_id=configured_user_id,
                message="Onboarding skipped. USER_ID is set in backend env.",
            )

    existing = client.query(
        "SELECT UserID FROM details_per_household WHERE toString(HouseholdID) = {hid:String} LIMIT 1",
        parameters={"hid": household_id},
    ).result_rows
    if existing:
        return OnboardingResponse(
            user_id=str(existing[0][0]),
            message="Existing onboarding profile found for HOUSEHOLD_ID.",
        )

    # Insert into details_per_household
    client.insert(
        "details_per_household",
        [[
            user_id,
            household_id,
            data.area,
            data.region,
            data.district,
            data.postal_code,
            data.dwelling_type,
            data.flat_type,
        ]],
        column_names=[
            "UserID", "HouseholdID", "Area", "Region", "District",
            "PostalCode", "Dwelling_type", "Flat_type",
        ],
    )

    # Insert into input_per_household
    client.insert(
        "input_per_household",
        [[
            user_id,
            household_id,
            data.floor_area_sqm or 0,
            data.num_residents,
            data.num_children,
            data.num_elderly,
            data.num_tenants,
            data.aircon_usage,
            data.num_aircons,
            str(data.has_wfh_days),
            data.num_wfh,
            data.target_bill or 0,
        ]],
        column_names=[
            "UserID", "HouseholdID", "Floor_area_sqm", "Num_residents",
            "Num_children", "Num_elderly", "Num_tenants",
            "Aircon_usage", "Num_Aircons", "Has_WFH_days", "Num_WFH",
            "Target_bill",
        ],
    )

    return OnboardingResponse(user_id=user_id, message="Profile saved successfully.")


@router.get("")
def get_onboarding():
    if not settings.household_id:
        raise HTTPException(
            status_code=400,
            detail="HOUSEHOLD_ID is required in backend env before onboarding can begin.",
        )

    client = get_client()

    configured_user_id = (settings.user_id or "").strip()
    if configured_user_id:
        configured_exists = client.query(
            "SELECT 1 FROM details_per_household WHERE toString(UserID) = {uid:String} LIMIT 1",
            parameters={"uid": configured_user_id},
        ).result_rows
        if configured_exists:
            return OnboardingResponse(
                user_id=configured_user_id,
                message="Onboarding skipped. USER_ID is set in backend env.",
            )

    existing = client.query(
        "SELECT UserID FROM details_per_household WHERE toString(HouseholdID) = {hid:String} LIMIT 1",
        parameters={"hid": settings.household_id},
    ).result_rows
    if existing:
        return OnboardingResponse(
            user_id=str(existing[0][0]),
            message="Existing onboarding profile found for HOUSEHOLD_ID.",
        )

    # No USER_ID set and no existing user for this HOUSEHOLD_ID: onboarding required
    result = client.query(
        """
        SELECT
            hd.UserID, hd.HouseholdID, hd.Area, hd.Region, hd.District,
            hd.PostalCode, hd.Dwelling_type, hd.Flat_type,
            hui.Floor_area_sqm, hui.Num_residents, hui.Num_children,
            hui.Num_elderly, hui.Num_tenants, hui.Aircon_usage,
            hui.Num_Aircons, hui.Has_WFH_days, hui.Num_WFH
        FROM details_per_household hd
        LEFT JOIN input_per_household hui ON toString(hd.UserID) = hui.UserID
        WHERE toString(hd.HouseholdID) = {hid:String}
        LIMIT 1
        """,
        parameters={"hid": settings.household_id},
    )
    if not result.result_rows:
        return {
            "user_id": "",
            "household_id": settings.household_id,
            "message": "Onboarding required for configured HOUSEHOLD_ID.",
        }

    row = result.result_rows[0]
    cols = result.column_names
    data = dict(zip(cols, row))
    # Convert UUID objects to strings
    if "UserID" in data and data["UserID"]:
        data["UserID"] = str(data["UserID"])
    if "HouseholdID" in data and data["HouseholdID"]:
        data["HouseholdID"] = str(data["HouseholdID"])
    return data
