/**
 * Mock data for the PowerBlock frontend.
 *
 * Every API response shape is defined here so the app can run without a backend.
 * To switch to real APIs, simply remove the imports of this file from api.ts
 * and delete this file.
 */

import type {
  OnboardingResponse,
  UsageResponse,
  HalfHourlyPoint,
  BlockUsageResponse,
  MapResponse,
  LeaderboardResponse,
  ChallengesResponse,
  CompleteChallengeResponse,
  AIInsightResponse,
  AIRecommendResponse,
  AIMonthlyAnalysisResponse,
  AnomalyResponse,
  ProjectionsResponse,
  HouseholdBenchmarkResponse,
} from "./types";

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10); // e.g. "2026-03-07"

/** Generate 48 half-hourly data points for a day. */
function generateHalfHourlyData(
  baseKwh: number,
  variance: number,
  peakStart: number,
  peakEnd: number,
  peakMultiplier: number,
): HalfHourlyPoint[] {
  const points: HalfHourlyPoint[] = [];
  for (let i = 0; i < 48; i++) {
    const hour = i / 2;
    const isPeak = hour >= peakStart && hour < peakEnd;
    const base = isPeak ? baseKwh * peakMultiplier : baseKwh;
    const noise = (Math.sin(i * 0.7) * variance) + (Math.cos(i * 1.3) * variance * 0.5);
    const kwh = Math.max(0.05, +(base + noise).toFixed(3));

    const hh = Math.floor(hour);
    const mm = i % 2 === 0 ? "00" : "30";
    const label = `${String(hh).padStart(2, "0")}:${mm}`;

    points.push({
      timestamp: `${TODAY}T${label}:00`,
      electricity_kwh: kwh,
      hour_label: label,
    });
  }
  return points;
}

// ──────────────────────────────────────────
// Usage (Dashboard)
// ──────────────────────────────────────────

const userUsageData = generateHalfHourlyData(0.35, 0.08, 18, 22, 2.2);
const totalKwh = +userUsageData.reduce((s, p) => s + p.electricity_kwh, 0).toFixed(2);
const peakPoint = userUsageData.reduce((max, p) => (p.electricity_kwh > max.electricity_kwh ? p : max));

export const MOCK_USAGE: UsageResponse = {
  user_id: "123",
  date: TODAY,
  data: userUsageData,
  total_kwh: totalKwh,
  peak_kwh: peakPoint.electricity_kwh,
  peak_hour: peakPoint.hour_label,
};

// ──────────────────────────────────────────
// Block Usage (Block View)
// ──────────────────────────────────────────

const blockAvgData = generateHalfHourlyData(0.4, 0.06, 18, 22, 1.9);
const userBlockTotal = totalKwh;
const blockAvgTotal = +blockAvgData.reduce((s, p) => s + p.electricity_kwh, 0).toFixed(2);
const diffKwh = +(userBlockTotal - blockAvgTotal).toFixed(2);
const diffPct = +((diffKwh / blockAvgTotal) * 100).toFixed(1);

const weeklyDayComparison = [
  { day_label: "Mon", user_avg_kwh: 7.9, block_avg_kwh: 8.4 },
  { day_label: "Tue", user_avg_kwh: 8.2, block_avg_kwh: 8.6 },
  { day_label: "Wed", user_avg_kwh: 7.8, block_avg_kwh: 8.3 },
  { day_label: "Thu", user_avg_kwh: 8.0, block_avg_kwh: 8.5 },
  { day_label: "Fri", user_avg_kwh: 8.4, block_avg_kwh: 8.8 },
  { day_label: "Sat", user_avg_kwh: 8.7, block_avg_kwh: 9.1 },
  { day_label: "Sun", user_avg_kwh: 8.3, block_avg_kwh: 8.9 },
];

const monthlyWeekComparison = [
  { week_label: "W1", user_avg_kwh: 55.8, block_avg_kwh: 60.5 },
  { week_label: "W2", user_avg_kwh: 58.1, block_avg_kwh: 61.2 },
  { week_label: "W3", user_avg_kwh: 56.9, block_avg_kwh: 60.7 },
  { week_label: "W4", user_avg_kwh: 57.4, block_avg_kwh: 61.0 },
];

export const MOCK_BLOCK_USAGE: BlockUsageResponse = {
  block_id: "BLK404",
  date: TODAY,
  block_avg_kwh: blockAvgTotal,
  user_kwh: userBlockTotal,
  difference_kwh: diffKwh,
  difference_pct: diffPct,
  hourly_block_avg: blockAvgData,
  hourly_user: userUsageData,
  daily_comparison_week: weeklyDayComparison,
  weekly_comparison_month: monthlyWeekComparison,
};

// ──────────────────────────────────────────
// Map View
// ──────────────────────────────────────────

export const MOCK_MAP: MapResponse = {
  district: "Yishun",
  blocks: [
    { block_id: "BLK402", district: "Yishun", avg_kwh: 18.45, reduction_pct: 8,  rank: 2, lat: 1.4295, lng: 103.8350 },
    { block_id: "BLK403", district: "Yishun", avg_kwh: 20.12, reduction_pct: 3,  rank: 4, lat: 1.4300, lng: 103.8360 },
    { block_id: "BLK404", district: "Yishun", avg_kwh: 16.80, reduction_pct: 12, rank: 1, lat: 1.4305, lng: 103.8345 },
    { block_id: "BLK405", district: "Yishun", avg_kwh: 19.70, reduction_pct: 6,  rank: 3, lat: 1.4298, lng: 103.8370 },
    { block_id: "BLK406", district: "Yishun", avg_kwh: 21.35, reduction_pct: 1,  rank: 5, lat: 1.4310, lng: 103.8355 },
  ],
};

// ──────────────────────────────────────────
// Leaderboard
// ──────────────────────────────────────────

const weekStart = new Date();
weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
const daysUntilReset = 7 - ((new Date().getDay() + 6) % 7); // days until next Monday

const pastWeeks = Array.from({ length: 5 }, (_, i) => {
  const d = new Date(weekStart);
  d.setDate(d.getDate() - ((i + 1) * 7));
  return d.toISOString().slice(0, 10);
});

export const MOCK_LEADERBOARD: LeaderboardResponse = {
  week_start: weekStart.toISOString().slice(0, 10),
  district: "Yishun",
  district_avg_kwh: 19.28,
  resets_in_days: daysUntilReset,
  weekly_top3_history: [
    {
      week_start: pastWeeks[0],
      winners: [
        { rank: 1, block_id: "BLK404", avg_kwh: 16.8 },
        { rank: 2, block_id: "BLK402", avg_kwh: 18.45 },
        { rank: 3, block_id: "BLK405", avg_kwh: 19.7 },
      ],
      block_avg_kwh_by_block: {
        BLK404: 16.8,
        BLK402: 18.45,
        BLK405: 19.7,
        BLK403: 20.2,
        BLK406: 21.1,
      },
    },
    {
      week_start: pastWeeks[1],
      winners: [
        { rank: 1, block_id: "BLK402", avg_kwh: 17.1 },
        { rank: 2, block_id: "BLK404", avg_kwh: 17.65 },
        { rank: 3, block_id: "BLK405", avg_kwh: 19.2 },
      ],
      block_avg_kwh_by_block: {
        BLK402: 17.1,
        BLK404: 17.65,
        BLK405: 19.2,
        BLK403: 19.9,
        BLK406: 20.7,
      },
    },
    {
      week_start: pastWeeks[2],
      winners: [
        { rank: 1, block_id: "BLK405", avg_kwh: 17.5 },
        { rank: 2, block_id: "BLK404", avg_kwh: 17.9 },
        { rank: 3, block_id: "BLK403", avg_kwh: 19.4 },
      ],
      block_avg_kwh_by_block: {
        BLK405: 17.5,
        BLK404: 17.9,
        BLK403: 19.4,
        BLK402: 19.8,
        BLK406: 20.6,
      },
    },
    {
      week_start: pastWeeks[3],
      winners: [
        { rank: 1, block_id: "BLK404", avg_kwh: 16.95 },
        { rank: 2, block_id: "BLK405", avg_kwh: 18.6 },
        { rank: 3, block_id: "BLK402", avg_kwh: 18.85 },
      ],
      block_avg_kwh_by_block: {
        BLK404: 16.95,
        BLK405: 18.6,
        BLK402: 18.85,
        BLK403: 20.1,
        BLK406: 20.8,
      },
    },
    {
      week_start: pastWeeks[4],
      winners: [
        { rank: 1, block_id: "BLK402", avg_kwh: 17.35 },
        { rank: 2, block_id: "BLK404", avg_kwh: 17.72 },
        { rank: 3, block_id: "BLK406", avg_kwh: 20.1 },
      ],
      block_avg_kwh_by_block: {
        BLK402: 17.35,
        BLK404: 17.72,
        BLK406: 20.1,
        BLK405: 20.35,
        BLK403: 20.55,
      },
    },
  ],
  entries: [
    { rank: 1, block_id: "BLK404", avg_kwh: 16.80, reduction_pct: 12, points: 320, weekly_change: -2.1 },
    { rank: 2, block_id: "BLK402", avg_kwh: 18.45, reduction_pct: 8,  points: 275, weekly_change: -1.5 },
    { rank: 3, block_id: "BLK405", avg_kwh: 19.70, reduction_pct: 6,  points: 210, weekly_change: -0.8 },
    { rank: 4, block_id: "BLK403", avg_kwh: 20.12, reduction_pct: 3,  points: 150, weekly_change: 0.3  },
    { rank: 5, block_id: "BLK406", avg_kwh: 21.35, reduction_pct: 1,  points: 90,  weekly_change: 1.2  },
  ],
};

// ──────────────────────────────────────────
// Challenges
// ──────────────────────────────────────────

export const MOCK_CHALLENGES: ChallengesResponse = {
  user_id: "123",
  total_points: 185,
  weekly_points: 60,
  challenges: [
    {
      challenge_id: "ch_001",
      title: "Off-Peak Laundry",
      description: "Run your washing machine after 10 PM tonight to shift demand off-peak.",
      points: 15,
      challenge_type: "daily",
      is_completed: false,
      requires_photo: false,
    },
    {
      challenge_id: "ch_002",
      title: "AC-Free Hour",
      description: "Turn off the air-conditioning for one hour between 7 PM and 10 PM.",
      points: 20,
      challenge_type: "daily",
      is_completed: false,
      requires_photo: false,
    },
    {
      challenge_id: "ch_003",
      title: "Snap Your Savings",
      description: "Take a photo of your energy-saving setup (e.g. fan instead of AC, LED lights).",
      points: 30,
      challenge_type: "photo",
      is_completed: false,
      requires_photo: true,
    },
    {
      challenge_id: "ch_004",
      title: "Peak-Hour Power Down",
      description: "Reduce your electricity usage below your block average during 6 PM – 10 PM.",
      points: 25,
      challenge_type: "daily",
      is_completed: false,
      requires_photo: false,
    },
    {
      challenge_id: "ch_005",
      title: "Morning Routine Shift",
      description: "Move high-energy tasks (e.g. ironing, cooking) to before 4 PM.",
      points: 15,
      challenge_type: "daily",
      is_completed: true,
      completed_at: new Date(Date.now() - 86400000).toISOString(),
      requires_photo: false,
    },
    {
      challenge_id: "ch_006",
      title: "Eco Selfie",
      description: "Share a photo of your block's common area lights turned off during the day.",
      points: 20,
      challenge_type: "photo",
      is_completed: true,
      completed_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      requires_photo: true,
    },
  ],
};

export const MOCK_COMPLETE_CHALLENGE: CompleteChallengeResponse = {
  success: true,
  points_earned: 20,
  total_points: 205,
  message: "Great job! Keep going 💪",
};

// ──────────────────────────────────────────
// AI Insights (Dashboard)
// ──────────────────────────────────────────

export const MOCK_AI_INSIGHTS: AIInsightResponse = {
  user_id: "123",
  insight:
    "Your electricity usage spikes between 7 PM and 9 PM, likely due to air-conditioning and cooking. Today's peak was 0.82 kWh at 8:00 PM — 40% higher than your morning average.",
  tip:
    "Reducing air-conditioning by 30 minutes tonight could save approximately S$3 this week. Consider using a fan during the first hour after you get home.",
  comparison:
    "You used 8% less electricity than your block average today. Keep it up!",
  generated_at: new Date().toISOString(),
};

// ──────────────────────────────────────────
// AI Recommendations (Block View)
// ──────────────────────────────────────────

export const MOCK_AI_RECOMMENDATIONS: AIRecommendResponse = {
  user_id: "123",
  recommendations: [
    {
      title: "Shift Laundry Off-Peak",
      action: "Run your washing machine after 10 PM instead of 8 PM to reduce peak demand.",
      estimated_saving_kwh: 0.45,
      estimated_saving_sgd: 0.15,
      time_of_day: "night",
      priority: "high",
    },
    {
      title: "Optimise AC Temperature",
      action: "Set your air-conditioner to 25°C instead of 22°C. Each degree saves ~3% energy.",
      estimated_saving_kwh: 1.2,
      estimated_saving_sgd: 0.40,
      time_of_day: "evening",
      priority: "high",
    },
    {
      title: "Switch to LED Lighting",
      action: "Replace remaining incandescent bulbs with LEDs — uses up to 80% less energy.",
      estimated_saving_kwh: 0.3,
      estimated_saving_sgd: 0.10,
      time_of_day: "evening",
      priority: "medium",
    },
    {
      title: "Unplug Standby Appliances",
      action: "Turn off power strips before bed. Standby power can account for 5-10% of household usage.",
      estimated_saving_kwh: 0.6,
      estimated_saving_sgd: 0.20,
      time_of_day: "night",
      priority: "medium",
    },
    {
      title: "Cook During Off-Peak",
      action: "If possible, prepare meals before 5 PM or after 10 PM to avoid the 6-10 PM peak window.",
      estimated_saving_kwh: 0.25,
      estimated_saving_sgd: 0.08,
      time_of_day: "afternoon",
      priority: "low",
    },
  ],
  generated_at: new Date().toISOString(),
};

// ──────────────────────────────────────────
// AI Monthly Analysis (Bill Tracker)
// ──────────────────────────────────────────

export const MOCK_AI_MONTHLY_ANALYSIS: AIMonthlyAnalysisResponse = {
  user_id: "123",
  current_month_kwh: 245.6,
  previous_month_kwh: 268.3,
  change_pct: -8.5,
  on_track_for_target: true,
  projected_bill_sgd: 81.05,
  budget_sgd: 95.00,
  narrative:
    "You're on track to save about S$14 this month compared to your budget. " +
    "Your usage has dropped 8.5% from last month, mainly due to reduced evening AC. " +
    "Keep shifting laundry off-peak to maintain your savings trajectory.",
  generated_at: new Date().toISOString(),
};

// ──────────────────────────────────────────
// Onboarding
// ──────────────────────────────────────────

export const MOCK_ONBOARDING_RESPONSE: OnboardingResponse = {
  user_id: "123",
  message: "Welcome to PowerBlock! Your profile has been created.",
};

// ──────────────────────────────────────────
// Anomaly Detection (Insights)
// ──────────────────────────────────────────

export const MOCK_ANOMALY: AnomalyResponse = {
  user_id: "123",
  has_anomaly: true,
  analysis:
    "We detected an unusual spike in your electricity usage on Tuesday between 2 AM and 4 AM — " +
    "consumption was 3x higher than your typical pattern for that time. " +
    "This could indicate an appliance left running overnight (e.g. water heater, dryer). " +
    "Check that no appliances are running unintentionally during sleeping hours.",
  generated_at: new Date().toISOString(),
};

export const MOCK_ANOMALY_OK: AnomalyResponse = {
  user_id: "123",
  has_anomaly: false,
  analysis:
    "Your electricity usage patterns this week look normal. No unusual spikes or " +
    "unexpected consumption detected. Keep up the good habits!",
  generated_at: new Date().toISOString(),
};

// ──────────────────────────────────────────
// Projections (Insights)
// ──────────────────────────────────────────

const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
const dayOfMonth = new Date().getDate();
const daysRemaining = daysInMonth - dayOfMonth;

export const MOCK_PROJECTIONS: ProjectionsResponse = {
  user_id: "123",
  projected_bill_sgd: 81.05,
  projected_avg_daily_kwh: 8.19,
  projected_total_kwh: 245.6,
  days_remaining: daysRemaining,
  target_bill_sgd: 95.00,
  generated_at: new Date().toISOString(),
};

// ──────────────────────────────────────────
// Household Benchmark (Insights)
// ──────────────────────────────────────────

export const MOCK_HOUSEHOLD_BENCHMARK: HouseholdBenchmarkResponse = {
  user_id: "123",
  household_type: "4-room",
  district: "Yishun",
  user_avg_daily_kwh: 8.19,
  profile_avg_daily_kwh: 8.62,
  difference_pct: -5.0,
  generated_at: new Date().toISOString(),
};
