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
  MOCK_COMPLETE_CHALLENGE,
  MOCK_AI_INSIGHTS,
  MOCK_AI_RECOMMENDATIONS,
  MOCK_AI_MONTHLY_ANALYSIS,
} from "./mockData";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  return { ...MOCK_CHALLENGES, user_id: userId };
}

export async function completeChallenge(
  data: import("./types").CompleteChallengeRequest,
): Promise<import("./types").CompleteChallengeResponse> {
  // return request<import("./types").CompleteChallengeResponse>("/api/challenges/complete", {
  //   method: "POST",
  //   body: JSON.stringify(data),
  // });
  return MOCK_COMPLETE_CHALLENGE;
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
