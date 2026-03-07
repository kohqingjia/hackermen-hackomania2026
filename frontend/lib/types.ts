// ---- Onboarding ----

export interface OnboardingForm {
  household_id: string;
  area?: string;
  region?: string;
  district: string;
  postal_code: string;
  dwelling_type?: string;
  flat_type: string;           // "3-room" | "4-room" | "5-room"
  floor_area_sqm?: number;
  num_residents: number;
  num_children?: number;
  num_elderly?: number;
  num_tenants?: number;
  aircon_usage: number;        // 0-3
  num_aircons?: number;
  has_wfh_days?: string[];     // e.g. ["Monday","Wednesday"]
  num_wfh: number;             // 0-7
  target_bill?: number;        // monthly target bill in SGD
}

export interface OnboardingResponse {
  user_id: string;
  message: string;
}

// ---- Usage ----

export interface HalfHourlyPoint {
  timestamp: string;
  electricity_kwh: number;
  hour_label: string;
}

export interface UsageResponse {
  user_id: string;
  date: string;
  data: HalfHourlyPoint[];
  total_kwh: number;
  peak_kwh: number;
  peak_hour: string;
}

// ---- Block ----

export interface BlockUsageResponse {
  postal_code: string;
  date: string;
  block_avg_kwh: number;
  user_kwh: number;
  difference_kwh: number;
  difference_pct: number;
  hourly_block_avg: HalfHourlyPoint[];
  hourly_user: HalfHourlyPoint[];
  daily_comparison_week: DailyComparisonPoint[];
  weekly_comparison_month: WeeklyComparisonPoint[];
}

export interface DailyComparisonPoint {
  day_label: string;
  user_avg_kwh: number;
  block_avg_kwh: number;
}

export interface WeeklyComparisonPoint {
  week_label: string;
  user_avg_kwh: number;
  block_avg_kwh: number;
}

// ---- Map ----

export interface BlockMapEntry {
  postal_code: string;
  district: string;
  avg_kwh: number;
  reduction_pct: number;
  rank: number;
  lat: number;
  lng: number;
}

export interface MapResponse {
  district: string;
  blocks: BlockMapEntry[];
}

// ---- Leaderboard ----

export interface LeaderboardEntry {
  rank: number;
  postal_code: string;
  avg_kwh: number;
  reduction_pct: number;
  points: number;
  weekly_change: number;
}

export interface WeeklyTopBlock {
  rank: number;
  postal_code: string;
  avg_kwh: number;
}

export interface WeeklyTopThree {
  week_start: string;
  winners: WeeklyTopBlock[];
  block_avg_kwh_by_block: Record<string, number>;
}

export interface LeaderboardResponse {
  week_start: string;
  district: string;
  district_avg_kwh: number;
  entries: LeaderboardEntry[];
  weekly_top3_history: WeeklyTopThree[];
  resets_in_days: number;
}

// ---- Challenges ----

export interface Challenge {
  challenge_id: string;
  title: string;
  description: string;
  points: number;
  challenge_type: string;
  is_completed: boolean;
  completed_at?: string;
  requires_photo: boolean;
}

export interface ChallengesResponse {
  user_id: string;
  total_points: number;
  weekly_points: number;
  challenges: Challenge[];
  completed_history: ChallengeHistoryEntry[];
}

export interface ChallengeHistoryEntry {
  challenge_id: string;
  title: string;
  points_earned: number;
  completed_at: string;
}

export interface CompleteChallengeRequest {
  user_id: string;
  challenge_id: string;
  photo_base64?: string;
}

export interface CompleteChallengeResponse {
  success: boolean;
  points_earned: number;
  total_points: number;
  message: string;
}

// ---- AI ----

export interface AIInsightResponse {
  user_id: string;
  insight: string;
  tip: string;
  comparison: string;
  generated_at: string;
}

export interface AIRecommendation {
  title: string;
  action: string;
  estimated_saving_kwh: number;
  estimated_saving_sgd: number;
  time_of_day: string;
  priority: string;
}

export interface AIRecommendResponse {
  user_id: string;
  recommendations: AIRecommendation[];
  generated_at: string;
}

export interface AIMonthlyAnalysisResponse {
  user_id: string;
  current_month_kwh: number;
  previous_month_kwh: number;
  change_pct: number;
  on_track_for_target: boolean;
  projected_bill_sgd: number;
  budget_sgd: number;
  narrative: string;
  generated_at: string;
}

// ---- Insights ----

export interface AnomalyResponse {
  user_id: string;
  has_anomaly: boolean;
  analysis: string;
  generated_at: string;
}

export interface ProjectionsResponse {
  user_id: string;
  projected_bill_sgd: number;
  projected_avg_daily_kwh: number;
  projected_total_kwh: number;
  days_remaining: number;
  target_bill_sgd?: number;
  generated_at: string;
}

export interface HouseholdBenchmarkResponse {
  user_id: string;
  flat_type: string;
  district: string;
  user_avg_daily_kwh: number;
  profile_avg_daily_kwh: number;
  difference_pct: number;
  generated_at: string;
}
