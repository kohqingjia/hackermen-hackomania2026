/**
 * API client — one function per feature, matching backend routes.
 * All calls go to the real backend (ClickHouse-backed).
 */

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Generic fetch helper */
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
  return request<import("./types").OnboardingResponse>("/api/onboarding", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getOnboarding(userId: string) {
  return request<Record<string, unknown>>(`/api/onboarding/${userId}`);
}

// ---- Usage (Dashboard) ----

export async function getUsage(
  userId: string,
  date?: string,
): Promise<import("./types").UsageResponse> {
  const q = date ? `?date=${date}` : "";
  return request<import("./types").UsageResponse>(`/api/usage/${userId}${q}`);
}

// ---- Block View ----

export async function getBlockUsage(
  postalCode: string,
  userId: string,
  date?: string,
): Promise<import("./types").BlockUsageResponse> {
  const params = new URLSearchParams({ user_id: userId });
  if (date) params.set("date", date);
  return request<import("./types").BlockUsageResponse>(`/api/block/${postalCode}?${params}`);
}

// ---- Map View ----

export async function getMap(
  district: string,
  date?: string,
): Promise<import("./types").MapResponse> {
  const q = date ? `?date=${date}` : "";
  return request<import("./types").MapResponse>(`/api/map/${district}${q}`);
}

// ---- Leaderboard ----

export async function getLeaderboard(
  district: string,
  date?: string,
): Promise<import("./types").LeaderboardResponse> {
  const q = date ? `?date=${date}` : "";
  return request<import("./types").LeaderboardResponse>(`/api/leaderboard/${district}${q}`);
}

// ---- Challenges ----

export async function getChallenges(
  userId: string,
): Promise<import("./types").ChallengesResponse> {
  return request<import("./types").ChallengesResponse>(`/api/challenges?user_id=${userId}`);
}

export async function completeChallenge(
  data: import("./types").CompleteChallengeRequest,
): Promise<import("./types").CompleteChallengeResponse> {
  return request<import("./types").CompleteChallengeResponse>("/api/challenges/complete", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ---- AI ----

export async function getAIInsights(
  userId: string,
  date?: string,
): Promise<import("./types").AIInsightResponse> {
  const q = date ? `?date=${date}` : "";
  return request<import("./types").AIInsightResponse>(`/api/ai/insights/${userId}${q}`);
}

export async function getAIRecommendations(
  userId: string,
): Promise<import("./types").AIRecommendResponse> {
  return request<import("./types").AIRecommendResponse>(`/api/ai/recommend/${userId}`);
}

export async function getAIMonthlyAnalysis(
  userId: string,
): Promise<import("./types").AIMonthlyAnalysisResponse> {
  return request<import("./types").AIMonthlyAnalysisResponse>(`/api/ai/analyze/${userId}`);
}

// ---- Insights ----

export async function getAnomaly(
  userId: string,
): Promise<import("./types").AnomalyResponse> {
  return request<import("./types").AnomalyResponse>(`/api/ai/anomaly/${userId}`);
}

export async function getProjections(
  userId: string,
): Promise<import("./types").ProjectionsResponse> {
  return request<import("./types").ProjectionsResponse>(`/api/ai/projections/${userId}`);
}

export async function getHouseholdBenchmark(
  userId: string,
): Promise<import("./types").HouseholdBenchmarkResponse> {
  return request<import("./types").HouseholdBenchmarkResponse>(`/api/ai/benchmark/${userId}`);
}
