from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# --- Onboarding ---

class OnboardingRequest(BaseModel):
    """User-submitted household info (maps to household_data + household_user_input)."""
    # household_data fields
    household_id: str                           # e.g. "752339-HH03"
    area: str = "North"
    region: str = "North-East"
    district: str = "Sembawang"
    postal_code: str = "752339"
    dwelling_type: str = "HDB"
    flat_type: str = "4-room"                   # "3-room" | "4-room" | "5-room"
    # household_user_input fields
    floor_area_sqm: Optional[float] = None
    num_residents: int = 1
    num_children: int = 0
    num_elderly: int = 0
    num_tenants: int = 0
    aircon_usage: int = 1                       # 0-Never, 1-Sometimes, 2-Every_night, 3-Whole_day
    num_aircons: int = 1
    has_wfh_days: list[str] = []                # e.g. ["Monday","Wednesday"]
    num_wfh: int = 0                            # 0-7


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


# --- Block (Postal Code grouping) ---

class DailyComparisonPoint(BaseModel):
    day_label: str
    user_avg_kwh: float
    block_avg_kwh: float


class WeeklyComparisonPoint(BaseModel):
    week_label: str
    user_avg_kwh: float
    block_avg_kwh: float


class BlockUsageResponse(BaseModel):
    postal_code: str        # replaces block_id — this is the "block"
    date: str
    block_avg_kwh: float
    user_kwh: float
    difference_kwh: float
    difference_pct: float   # negative = user is below block avg (good)
    hourly_block_avg: list[HalfHourlyPoint]
    hourly_user: list[HalfHourlyPoint]
    daily_comparison_week: list[DailyComparisonPoint] = []
    weekly_comparison_month: list[WeeklyComparisonPoint] = []


# --- Map ---

class BlockMapEntry(BaseModel):
    postal_code: str        # replaces block_id
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
    postal_code: str        # replaces block_id
    avg_kwh: float
    reduction_pct: float
    points: int
    weekly_change: float    # kwh change vs previous week


class WeeklyTopBlock(BaseModel):
    rank: int
    postal_code: str
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
    user_id: Optional[str] = None
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


# --- Insights / Anomaly / Projections / Benchmark ---

class AnomalyResponse(BaseModel):
    user_id: str
    has_anomaly: bool
    analysis: str
    generated_at: str


class ProjectionsResponse(BaseModel):
    user_id: str
    projected_bill_sgd: float
    projected_avg_daily_kwh: float
    projected_total_kwh: float
    days_remaining: int
    target_bill_sgd: Optional[float] = None
    generated_at: str


class HouseholdBenchmarkResponse(BaseModel):
    user_id: str
    flat_type: str          # replaces household_type
    district: str
    user_avg_daily_kwh: float
    profile_avg_daily_kwh: float
    difference_pct: float
    generated_at: str
