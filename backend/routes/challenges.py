"""
Challenges route
GET  /api/challenges?user_id=...   — list all challenges + completion status
POST /api/challenges/complete       — mark a challenge complete (with optional photo)

Challenge types:
  - "photo"      requires a submitted photo (e.g. buy 4-tick appliance)
  - "automatic"  automatically checks usage data (e.g. below block avg today)
  - "weekly"     weekly energy reduction challenge
"""

from datetime import datetime, date, timedelta
from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from database.clickhouse import get_client
from utils.datetime_helper import get_app_date
from utils.user_resolver import resolve_user_id
from models.schemas import (
    ChallengesResponse,
    Challenge,
    ChallengeHistoryEntry,
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
def get_challenges(
    user_id: Optional[str] = Query(default=None),
):
    client = get_client()
    effective_uid = resolve_user_id(user_id)
    today = get_app_date()
    week_start = today - timedelta(days=6)

    title_map = {c.challenge_id: c.title for c in CHALLENGE_CATALOGUE}

    # Completions from past 7 days for history tab
    history_rows = client.query(
        """
        SELECT challenge_id, completed_at, points_earned
        FROM user_challenges
        WHERE user_id = {uid:String}
          AND toDate(completed_at) BETWEEN {ws:Date} AND {td:Date}
        ORDER BY completed_at DESC
        """,
        parameters={"uid": effective_uid, "ws": week_start.isoformat(), "td": today.isoformat()},
    ).result_rows
    history_entries = [
        ChallengeHistoryEntry(
            challenge_id=row[0],
            title=title_map.get(row[0], row[0]),
            points_earned=int(row[2]),
            completed_at=str(row[1]),
        )
        for row in history_rows
    ]

    # Completed challenge IDs today (daily reset behavior)
    today_rows = client.query(
        """
        SELECT challenge_id, max(completed_at) AS completed_at
        FROM user_challenges
        WHERE user_id = {uid:String}
          AND toDate(completed_at) = {td:Date}
        GROUP BY challenge_id
        """,
        parameters={"uid": effective_uid, "td": today.isoformat()},
    ).result_rows
    completed_today_map = {r[0]: r[1] for r in today_rows}

    # Auto-check CH002: is user below block avg today?
    auto_result = _check_auto_challenges(client, effective_uid)

    challenges = []
    weekly_points = sum(int(row[2]) for row in history_rows)

    total_points = client.query(
        "SELECT sum(points_earned) FROM user_challenges WHERE user_id = {uid:String}",
        parameters={"uid": effective_uid},
    ).result_rows[0][0] or 0

    for ch in CHALLENGE_CATALOGUE:
        ch_copy = ch.model_copy()

        if ch.challenge_id in completed_today_map:
            ch_copy.is_completed = True
            ch_copy.completed_at = str(completed_today_map[ch.challenge_id])
        elif ch.challenge_id == "CH002" and auto_result:
            # Auto-complete if user beats block
            ch_copy.is_completed = True
            ch_copy.completed_at = str(datetime.utcnow())

        challenges.append(ch_copy)

    return ChallengesResponse(
        user_id=effective_uid,
        total_points=int(total_points),
        weekly_points=weekly_points,
        challenges=challenges,
        completed_history=history_entries,
    )


@router.post("/complete", response_model=CompleteChallengeResponse)
def complete_challenge(data: CompleteChallengeRequest):
    client = get_client()
    user_id = resolve_user_id(data.user_id)

    challenge = next((c for c in CHALLENGE_CATALOGUE if c.challenge_id == data.challenge_id), None)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    # Check not already completed today (daily reset)
    today = get_app_date().isoformat()
    existing = client.query(
        """
        SELECT 1
        FROM user_challenges
        WHERE user_id = {uid:String}
          AND challenge_id = {cid:String}
          AND toDate(completed_at) = {td:Date}
        LIMIT 1
        """,
        parameters={"uid": user_id, "cid": data.challenge_id, "td": today},
    ).result_rows
    if existing:
        raise HTTPException(status_code=400, detail="Challenge already completed today")

    client.insert(
        "user_challenges",
        [[user_id, data.challenge_id, datetime.utcnow(), "", challenge.points]],
        column_names=["user_id", "challenge_id", "completed_at", "photo_url", "points_earned"],
    )

    # Sum total points
    total = client.query(
        "SELECT sum(points_earned) FROM user_challenges WHERE user_id = {uid:String}",
        parameters={"uid": user_id},
    ).result_rows[0][0] or 0

    return CompleteChallengeResponse(
        success=True,
        points_earned=challenge.points,
        total_points=int(total),
        message=f"Challenge complete! You earned {challenge.points} points.",
    )


def _check_auto_challenges(client, user_id: str) -> bool:
    """Returns True if user is currently below block average today."""
    # Get HouseholdID and PostalCode from details_per_household
    hd_row = client.query(
        "SELECT toString(HouseholdID), PostalCode FROM details_per_household WHERE toString(UserID) = {uid:String} LIMIT 1",
        parameters={"uid": user_id},
    )
    if not hd_row.result_rows:
        return False

    household_id = str(hd_row.result_rows[0][0])
    postal_code = hd_row.result_rows[0][1]
    today = get_app_date().isoformat()

    user_avg = client.query(
        "SELECT avg(`Consumption(kWh)`) FROM consumption_per_household WHERE HouseholdID={hid:String} AND toDate(Timestamp)={d:Date}",
        parameters={"hid": household_id, "d": today},
    ).result_rows[0][0] or 0

    block_avg = client.query(
        """
        SELECT avg(`Consumption(kWh)`)
        FROM consumption_per_household e
        JOIN details_per_household hd ON e.HouseholdID = toString(hd.HouseholdID)
        WHERE hd.PostalCode = {pc:String} AND toDate(e.Timestamp) = {d:Date}
        """,
        parameters={"pc": postal_code, "d": today},
    ).result_rows[0][0] or 0

    return user_avg < block_avg
