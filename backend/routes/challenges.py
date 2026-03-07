"""
Challenges route
GET  /api/challenges?user_id=...   — list all challenges + completion status
POST /api/challenges/complete       — mark a challenge complete (with optional photo)

Challenge types:
  - "photo"      requires a submitted photo (e.g. buy 4-tick appliance)
  - "automatic"  automatically checks usage data (e.g. below block avg today)
  - "weekly"     weekly energy reduction challenge
"""

import uuid
from datetime import datetime, date
from fastapi import APIRouter, Query, HTTPException
from database.clickhouse import get_client
from models.schemas import (
    ChallengesResponse,
    Challenge,
    CompleteChallengeRequest,
    CompleteChallengeResponse,
)

router = APIRouter(prefix="/api/challenges", tags=["challenges"])

# Static challenge catalogue
CHALLENGE_CATALOGUE = [
    Challenge(
        challenge_id="CH001",
        title="Buy a 4-tick appliance",
        description="Purchase a new 4-tick energy-efficient appliance and submit a photo of the receipt or product.",
        points=100,
        challenge_type="photo",
        requires_photo=True,
    ),
    Challenge(
        challenge_id="CH002",
        title="Beat your block today",
        description="Have a lower average usage than your block average for today.",
        points=10,
        challenge_type="automatic",
        requires_photo=False,
    ),
    Challenge(
        challenge_id="CH003",
        title="Off-peak laundry",
        description="Run your laundry after 10pm and submit a photo of your washing machine timer.",
        points=20,
        challenge_type="photo",
        requires_photo=True,
    ),
    Challenge(
        challenge_id="CH004",
        title="Aircon-free evening",
        description="Use fans instead of aircon for one evening (6pm–10pm).",
        points=30,
        challenge_type="photo",
        requires_photo=False,
    ),
    Challenge(
        challenge_id="CH005",
        title="Week below target",
        description="Keep your weekly average below your personal energy saving target.",
        points=50,
        challenge_type="weekly",
        requires_photo=False,
    ),
]


@router.get("", response_model=ChallengesResponse)
def get_challenges(user_id: str = Query(...)):
    client = get_client()

    # Fetch completed challenge IDs for this user
    completed_rows = client.query(
        """
        SELECT challenge_id, completed_at, points_earned
        FROM user_challenges
        WHERE user_id = {uid:String}
        """,
        parameters={"uid": user_id},
    ).result_rows

    completed_map = {r[0]: r for r in completed_rows}

    # Auto-check CH002: is user below block avg today?
    auto_result = _check_auto_challenges(client, user_id)

    challenges = []
    total_points = 0
    weekly_points = 0
    week_cutoff = date.today().isocalendar()

    for ch in CHALLENGE_CATALOGUE:
        ch_copy = ch.model_copy()

        if ch.challenge_id in completed_map:
            ch_copy.is_completed = True
            ch_copy.completed_at = str(completed_map[ch.challenge_id][1])
            total_points += completed_map[ch.challenge_id][2]
        elif ch.challenge_id == "CH002" and auto_result:
            # Auto-complete if user beats block
            ch_copy.is_completed = True
            ch_copy.completed_at = str(datetime.utcnow())

        challenges.append(ch_copy)

    return ChallengesResponse(
        user_id=user_id,
        total_points=total_points,
        weekly_points=weekly_points,
        challenges=challenges,
    )


@router.post("/complete", response_model=CompleteChallengeResponse)
def complete_challenge(data: CompleteChallengeRequest):
    client = get_client()

    challenge = next((c for c in CHALLENGE_CATALOGUE if c.challenge_id == data.challenge_id), None)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    # Check not already completed
    existing = client.query(
        "SELECT 1 FROM user_challenges WHERE user_id = {uid:String} AND challenge_id = {cid:String} LIMIT 1",
        parameters={"uid": data.user_id, "cid": data.challenge_id},
    ).result_rows
    if existing:
        raise HTTPException(status_code=400, detail="Challenge already completed")

    client.insert(
        "user_challenges",
        [[data.user_id, data.challenge_id, datetime.utcnow(), "", challenge.points]],
        column_names=["user_id", "challenge_id", "completed_at", "photo_url", "points_earned"],
    )

    # Sum total points
    total = client.query(
        "SELECT sum(points_earned) FROM user_challenges WHERE user_id = {uid:String}",
        parameters={"uid": data.user_id},
    ).result_rows[0][0] or 0

    return CompleteChallengeResponse(
        success=True,
        points_earned=challenge.points,
        total_points=int(total),
        message=f"Challenge complete! You earned {challenge.points} points.",
    )


def _check_auto_challenges(client, user_id: str) -> bool:
    """Returns True if user is currently below block average today."""
    # Get HouseholdID and Postal_Code from household_data
    hd_row = client.query(
        "SELECT HouseholdID, Postal_Code FROM household_data WHERE UserID = {uid:String} LIMIT 1",
        parameters={"uid": user_id},
    )
    if not hd_row.result_rows:
        return False

    household_id = hd_row.result_rows[0][0]
    postal_code = hd_row.result_rows[0][1]
    today = date.today().isoformat()

    user_avg = client.query(
        "SELECT avg(Consumption) FROM household_electricity_usage WHERE HouseholdID={hid:String} AND toDate(Timestamp)={d:Date}",
        parameters={"hid": household_id, "d": today},
    ).result_rows[0][0] or 0

    block_avg = client.query(
        """
        SELECT avg(e.Consumption)
        FROM household_electricity_usage e
        JOIN household_data hd ON e.HouseholdID = hd.HouseholdID
        WHERE hd.Postal_Code = {pc:String} AND toDate(e.Timestamp) = {d:Date}
        """,
        parameters={"pc": postal_code, "d": today},
    ).result_rows[0][0] or 0

    return user_avg < block_avg
