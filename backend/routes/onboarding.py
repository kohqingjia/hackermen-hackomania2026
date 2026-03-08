"""
Onboarding route
POST /api/onboarding  — save user profile into details_per_household + input_per_household, return user_id
GET  /api/onboarding  — resolve onboarding state from env USER_ID / HOUSEHOLD_ID
"""

import uuid
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from database.clickhouse import get_client
from config import settings
from models.schemas import OnboardingRequest, OnboardingResponse
from services.onemap_service import get_road_names_batch

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])

NO_CACHE_HEADERS = {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
}


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
        found_uid = str(existing[0][0])
        settings.user_id = found_uid          # session-only, lost on restart
        return OnboardingResponse(
            user_id=found_uid,
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
        ]],
        column_names=[
            "UserID", "HouseholdID", "Floor_area_sqm", "Num_residents",
            "Num_children", "Num_elderly", "Num_tenants",
            "Aircon_usage", "Num_Aircons", "Has_WFH_days", "Num_WFH",
        ],
    )

    settings.user_id = user_id              # session-only, lost on restart
    return OnboardingResponse(user_id=user_id, message="Profile saved successfully.")


@router.get("")
def get_onboarding():
    """Only checks in-memory settings.user_id (seeded from .env on startup).
    Backend restart with USER_ID= empty in .env will always force re-onboard."""
    if not settings.household_id:
        raise HTTPException(
            status_code=400,
            detail="HOUSEHOLD_ID is required in backend env before onboarding can begin.",
        )

    effective_user_id = (settings.user_id or "").strip()
    print(f"[onboarding GET] settings.user_id={effective_user_id!r}")

    if effective_user_id:
        client = get_client()
        user_exists = client.query(
            "SELECT 1 FROM details_per_household WHERE toString(UserID) = {uid:String} LIMIT 1",
            parameters={"uid": effective_user_id},
        ).result_rows
        if user_exists:
            resp = OnboardingResponse(
                user_id=effective_user_id,
                message="User found.",
            )
            return JSONResponse(content=resp.model_dump(), headers=NO_CACHE_HEADERS)

    # No valid user found — require onboarding
    return JSONResponse(
        content={
            "user_id": "",
            "household_id": settings.household_id,
            "message": "Onboarding required.",
        },
        headers=NO_CACHE_HEADERS,
    )


@router.get("/road-names")
def road_names(postal_codes: str = Query(..., description="Comma-separated postal codes")):
    """Return road names for a list of postal codes via OneMap API."""
    codes = [c.strip() for c in postal_codes.split(",") if c.strip()]
    return get_road_names_batch(codes)
