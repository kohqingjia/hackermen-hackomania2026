from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# --- Onboarding ---

class OnboardingRequest(BaseModel):
    age_group: str          # "18-30", "31-45", "46-60", "60+"
    household_type: str     # "1-room", "2-room", "3-room", "4-room", "5-room", "executive"
    num_tenants: Optional[int] = None
    work_from_home: bool = False
    energy_saving_target: float = 10.0   # % reduction target
    block_id: str = "BLK404"
    district: str = "Yishun"


class OnboardingResponse(BaseModel):
    user_id: str
    message: str


# --- Usage ---

class HalfHourlyPoint(BaseModel):
    timestamp: str
    electricity_kwh: float
    hour_label: str         # "00:00", "00:30", ...


class UsageResponse(BaseModel):
    user_id: str
    date: str
    data: list[HalfHourlyPoint]
    total_kwh: float
    peak_kwh: float
    peak_hour: str


# --- Block ---

class BlockUsageResponse(BaseModel):
    block_id: str
    date: str
    block_avg_kwh: float
    user_kwh: float
    difference_kwh: float
    difference_pct: float   # negative = user is below block avg (good)
    hourly_block_avg: list[HalfHourlyPoint]
    hourly_user: list[HalfHourlyPoint]


# --- Map ---

class BlockMapEntry(BaseModel):
    block_id: str
    district: str
    avg_kwh: float
    reduction_pct: float    # vs district average
    rank: int
    lat: float
    lng: float


class MapResponse(BaseModel):
    district: str
    blocks: list[BlockMapEntry]


# --- Leaderboard ---

class LeaderboardEntry(BaseModel):
    rank: int
    block_id: str
    avg_kwh: float
    reduction_pct: float
    points: int
    weekly_change: float    # kwh change vs previous week


class WeeklyTopBlock(BaseModel):
    rank: int
    block_id: str
    avg_kwh: float


class WeeklyTopThree(BaseModel):
    week_start: str
    winners: list[WeeklyTopBlock]
    block_avg_kwh_by_block: dict[str, float]


class LeaderboardResponse(BaseModel):
    week_start: str
    district: str
    district_avg_kwh: float  # average across the district for the week
    entries: list[LeaderboardEntry]
    weekly_top3_history: list[WeeklyTopThree]
    resets_in_days: int


# --- Challenges ---

class Challenge(BaseModel):
    challenge_id: str
    title: str
    description: str
    points: int
    challenge_type: str     # "photo", "automatic", "weekly"
    is_completed: bool = False
    completed_at: Optional[str] = None
    requires_photo: bool = False


class ChallengeHistoryEntry(BaseModel):
    challenge_id: str
    title: str
    points_earned: int
    completed_at: str


class ChallengesResponse(BaseModel):
    user_id: str
    total_points: int
    weekly_points: int
    challenges: list[Challenge]
    completed_history: list[ChallengeHistoryEntry]


class CompleteChallengeRequest(BaseModel):
    user_id: str
    challenge_id: str
    photo_base64: Optional[str] = None


class CompleteChallengeResponse(BaseModel):
    success: bool
    points_earned: int
    total_points: int
    message: str


# --- AI ---

class AIInsightResponse(BaseModel):
    user_id: str
    insight: str            # main explanation paragraph
    tip: str                # short actionable tip
    comparison: str         # vs yesterday / vs block
    generated_at: str


class AIRecommendation(BaseModel):
    title: str
    action: str
    estimated_saving_kwh: float
    estimated_saving_sgd: float
    time_of_day: str        # "morning", "afternoon", "evening", "night"
    priority: str           # "high", "medium", "low"


class AIRecommendResponse(BaseModel):
    user_id: str
    recommendations: list[AIRecommendation]
    generated_at: str


class AIMonthlyAnalysisResponse(BaseModel):
    user_id: str
    current_month_kwh: float
    previous_month_kwh: float
    change_pct: float
    on_track_for_target: bool
    projected_bill_sgd: float
    budget_sgd: float
    narrative: str
    generated_at: str
