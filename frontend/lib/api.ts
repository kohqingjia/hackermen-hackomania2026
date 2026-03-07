/**
 * API client — one function per feature, matching backend routes.
 *
 * Currently returns MOCK DATA from @/lib/mockData so the app
 * can run without a backend. To switch to real APIs:
 *   1. Uncomment the `request()` calls below
 *   2. Remove the mock-data imports
 *   3. Delete lib/mockData.ts
 */

import {
  MOCK_ONBOARDING_RESPONSE,
  MOCK_USAGE,
  MOCK_BLOCK_USAGE,
  MOCK_MAP,
  MOCK_LEADERBOARD,
  MOCK_CHALLENGES,
  MOCK_AI_INSIGHTS,
  MOCK_AI_RECOMMENDATIONS,
  MOCK_AI_MONTHLY_ANALYSIS,
  MOCK_ANOMALY,
  MOCK_PROJECTIONS,
  MOCK_HOUSEHOLD_BENCHMARK,
} from "./mockData";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const mockChallengesState: import("./types").ChallengesResponse = {
  ...MOCK_CHALLENGES,
  challenges: MOCK_CHALLENGES.challenges.map((challenge) => ({ ...challenge })),
  completed_history: MOCK_CHALLENGES.completed_history.map((entry) => ({ ...entry })),
};

function getDateKey(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}

function isWithinPastDays(timestamp: string, days: number): boolean {
  const now = new Date();
  const past = new Date(now);
  past.setDate(now.getDate() - (days - 1));
  return new Date(timestamp) >= past;
}

function cloneChallengesState(userId: string): import("./types").ChallengesResponse {
  const todayKey = getDateKey(new Date());
  const history = mockChallengesState.completed_history
    .filter((entry) => isWithinPastDays(entry.completed_at, 7))
    .sort((a, b) => +new Date(b.completed_at) - +new Date(a.completed_at));

  const completedTodayMap = new Map(
    history
      .filter((entry) => getDateKey(entry.completed_at) === todayKey)
      .map((entry) => [entry.challenge_id, entry.completed_at]),
  );

  const challenges = mockChallengesState.challenges.map((challenge) => {
    const completedAt = completedTodayMap.get(challenge.challenge_id);
    return {
      ...challenge,
      is_completed: Boolean(completedAt),
      completed_at: completedAt,
    };
  });

  const totalPoints = mockChallengesState.completed_history.reduce((sum, entry) => sum + entry.points_earned, 0);
  const weeklyPoints = history.reduce((sum, entry) => sum + entry.points_earned, 0);

  return {
    ...mockChallengesState,
    user_id: userId,
    total_points: totalPoints,
    weekly_points: weeklyPoints,
    challenges,
    completed_history: history,
  };
}

/** Generic fetch helper — kept for when real backend is connected. */
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API error");
  }
  return res.json();
}

// ---- Onboarding ----

export async function submitOnboarding(
  data: import("./types").OnboardingForm,
): Promise<import("./types").OnboardingResponse> {
  // return request<import("./types").OnboardingResponse>("/api/onboarding", {
  //   method: "POST",
  //   body: JSON.stringify(data),
  // });
  return MOCK_ONBOARDING_RESPONSE;
}

export async function getOnboarding(userId: string) {
  // return request<Record<string, unknown>>(`/api/onboarding/${userId}`);
  return {} as Record<string, unknown>;
}

// ---- Usage (Dashboard) ----

export async function getUsage(
  userId: string,
  date?: string,
): Promise<import("./types").UsageResponse> {
  // const q = date ? `?date=${date}` : "";
  // return request<import("./types").UsageResponse>(`/api/usage/${userId}${q}`);
  return MOCK_USAGE;
}

// ---- Block View ----

export async function getBlockUsage(
  blockId: string,
  userId: string,
  date?: string,
): Promise<import("./types").BlockUsageResponse> {
  // const params = new URLSearchParams({ user_id: userId });
  // if (date) params.set("date", date);
  // return request<import("./types").BlockUsageResponse>(`/api/block/${blockId}?${params}`);
  return { ...MOCK_BLOCK_USAGE, block_id: blockId };
}

// ---- Map View ----

export async function getMap(
  district: string,
  date?: string,
): Promise<import("./types").MapResponse> {
  // const q = date ? `?date=${date}` : "";
  // return request<import("./types").MapResponse>(`/api/map/${district}${q}`);
  return { ...MOCK_MAP, district };
}

// ---- Leaderboard ----

export async function getLeaderboard(
  district: string,
  date?: string,
): Promise<import("./types").LeaderboardResponse> {
  // const q = date ? `?date=${date}` : "";
  // return request<import("./types").LeaderboardResponse>(`/api/leaderboard/${district}${q}`);
  return { ...MOCK_LEADERBOARD, district };
}

// ---- Challenges ----

export async function getChallenges(
  userId: string,
): Promise<import("./types").ChallengesResponse> {
  // return request<import("./types").ChallengesResponse>(`/api/challenges?user_id=${userId}`);
  return cloneChallengesState(userId);
}

export async function completeChallenge(
  data: import("./types").CompleteChallengeRequest,
): Promise<import("./types").CompleteChallengeResponse> {
  // return request<import("./types").CompleteChallengeResponse>("/api/challenges/complete", {
  //   method: "POST",
  //   body: JSON.stringify(data),
  // });
  const challenge = mockChallengesState.challenges.find((c) => c.challenge_id === data.challenge_id);

  if (!challenge) {
    return {
      success: false,
      points_earned: 0,
      total_points: mockChallengesState.total_points,
      message: "Challenge not found.",
    };
  }

  const todayKey = getDateKey(new Date());
  const completedToday = mockChallengesState.completed_history.some(
    (entry) => entry.challenge_id === data.challenge_id && getDateKey(entry.completed_at) === todayKey,
  );

  if (completedToday) {
    return {
      success: true,
      points_earned: 0,
      total_points: mockChallengesState.completed_history.reduce((sum, entry) => sum + entry.points_earned, 0),
      message: "Challenge already completed today.",
    };
  }

  const completedAt = new Date().toISOString();
  mockChallengesState.completed_history.unshift({
    challenge_id: challenge.challenge_id,
    title: challenge.title,
    points_earned: challenge.points,
    completed_at: completedAt,
  });

  const totalPoints = mockChallengesState.completed_history.reduce((sum, entry) => sum + entry.points_earned, 0);

  return {
    success: true,
    points_earned: challenge.points,
    total_points: totalPoints,
    message: "Great job! Keep going 💪",
  };
}

// ---- AI ----

export async function getAIInsights(
  userId: string,
  date?: string,
): Promise<import("./types").AIInsightResponse> {
  // const q = date ? `?date=${date}` : "";
  // return request<import("./types").AIInsightResponse>(`/api/ai/insights/${userId}${q}`);
  return MOCK_AI_INSIGHTS;
}

export async function getAIRecommendations(
  userId: string,
): Promise<import("./types").AIRecommendResponse> {
  // return request<import("./types").AIRecommendResponse>(`/api/ai/recommend/${userId}`);
  return MOCK_AI_RECOMMENDATIONS;
}

export async function getAIMonthlyAnalysis(
  userId: string,
): Promise<import("./types").AIMonthlyAnalysisResponse> {
  // return request<import("./types").AIMonthlyAnalysisResponse>(`/api/ai/analyze/${userId}`);
  return MOCK_AI_MONTHLY_ANALYSIS;
}

// ---- Insights ----

export async function getAnomaly(
  userId: string,
): Promise<import("./types").AnomalyResponse> {
  // return request<import("./types").AnomalyResponse>(`/api/ai/anomaly/${userId}`);
  return MOCK_ANOMALY;
}

export async function getProjections(
  userId: string,
): Promise<import("./types").ProjectionsResponse> {
  // return request<import("./types").ProjectionsResponse>(`/api/ai/projections/${userId}`);
  return MOCK_PROJECTIONS;
}

export async function getHouseholdBenchmark(
  userId: string,
): Promise<import("./types").HouseholdBenchmarkResponse> {
  // return request<import("./types").HouseholdBenchmarkResponse>(`/api/ai/benchmark/${userId}`);
  return MOCK_HOUSEHOLD_BENCHMARK;
}
