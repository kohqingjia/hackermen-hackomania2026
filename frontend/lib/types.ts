// ---- Onboarding ----

export interface OnboardingForm {
  age_group: string;
  household_type: string;
  num_tenants?: number;
  work_from_home: boolean;
  energy_saving_target: number;
  block_id: string;
  district: string;
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
  block_id: string;
  date: string;
  block_avg_kwh: number;
  user_kwh: number;
  difference_kwh: number;
  difference_pct: number;
  hourly_block_avg: HalfHourlyPoint[];
  hourly_user: HalfHourlyPoint[];
}

// ---- Map ----

export interface BlockMapEntry {
  block_id: string;
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
  block_id: string;
  avg_kwh: number;
  reduction_pct: number;
  points: number;
  weekly_change: number;
}

export interface LeaderboardResponse {
  week_start: string;
  district: string;
  district_avg_kwh: number;
  entries: LeaderboardEntry[];
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
