"""
Onboarding route
POST  /api/onboarding              — save user profile into details_per_household + input_per_household, return user_id
GET   /api/onboarding              — resolve onboarding state from env USER_ID / HOUSEHOLD_ID
PATCH /api/onboarding/target-bill  — update user's target monthly bill
"""

import uuid
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from database.clickhouse import get_client
from config import settings
from models.schemas import OnboardingRequest, OnboardingResponse
from services.onemap_service import get_road_names_batch
from utils.user_resolver import resolve_user_id

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])
ENV_USER_ID = (settings.user_id or "").strip()

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

    configured_user_id = ENV_USER_ID
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
        # Existing profiles may contain key columns that cannot be updated in-place.
        # Create a new user profile row so latest onboarding selections (e.g. flat_type)
        # are always reflected immediately across analytics endpoints.
        user_id = str(uuid.uuid4())

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
        user_profile = client.query(
            "SELECT PostalCode FROM details_per_household WHERE toString(UserID) = {uid:String} LIMIT 1",
            parameters={"uid": effective_user_id},
        ).result_rows
        if user_profile:
            return JSONResponse(
                content={
                    "user_id": effective_user_id,
                    "postal_code": str(user_profile[0][0] or "").strip(),
                    "message": "User found.",
                },
                headers=NO_CACHE_HEADERS,
            )

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


# ---- Target bill update ----

class UpdateTargetBillRequest(BaseModel):
    target_bill: float  # New target bill in SGD


@router.patch("/target-bill")
def update_target_bill(
    data: UpdateTargetBillRequest,
    user_id: str | None = Query(default=None),
):
    """Update the user's monthly target bill in input_per_household."""
    effective_uid = resolve_user_id(user_id)
    client = get_client()

    # Verify user exists
    exists = client.query(
        "SELECT 1 FROM input_per_household WHERE UserID = {uid:String} LIMIT 1",
        parameters={"uid": effective_uid},
    ).result_rows
    if not exists:
        raise HTTPException(status_code=404, detail="User profile not found. Complete onboarding first.")

    # ClickHouse MergeTree ALTER UPDATE (lightweight mutation)
    client.command(
        "ALTER TABLE input_per_household UPDATE Target_bill = %(tb)s WHERE UserID = %(uid)s",
        parameters={"tb": data.target_bill, "uid": effective_uid},
    )

    return {"ok": True, "user_id": effective_uid, "target_bill": data.target_bill}
