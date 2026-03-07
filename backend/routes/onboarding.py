"""
Onboarding route
POST /api/onboarding  — save user profile, return user_id
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

    client.insert(
        "users",
        [[
            user_id,
            data.block_id,
            data.district,
            data.age_group,
            data.household_type,
            data.num_tenants or 0,
            int(data.work_from_home),
            data.energy_saving_target,
            datetime.utcnow(),
        ]],
        column_names=[
            "user_id", "block_id", "district", "age_group",
            "household_type", "num_tenants", "work_from_home",
            "energy_saving_target", "created_at",
        ],
    )

    return OnboardingResponse(user_id=user_id, message="Profile saved successfully.")


@router.get("/{user_id}")
def get_onboarding(user_id: str):
    client = get_client()
    result = client.query(
        "SELECT * FROM users WHERE user_id = {uid:String} LIMIT 1",
        parameters={"uid": user_id},
    )
    if not result.result_rows:
        raise HTTPException(status_code=404, detail="User not found")

    row = result.result_rows[0]
    cols = result.column_names
    return dict(zip(cols, row))
