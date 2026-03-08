/**
 * API client — one function per feature, matching backend routes.
 * All calls go to the real backend (ClickHouse-backed).
 */

const BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

/** Return stored user_id or empty string. */
function _uid(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("powerblock_user_id") || "";
}

/** Build a URLSearchParams with user_id + optional extras. */
function _params(extra?: Record<string, string>): URLSearchParams {
  const p = new URLSearchParams();
  const uid = _uid();
  if (uid) p.set("user_id", uid);
  if (extra) Object.entries(extra).forEach(([k, v]) => { if (v) p.set(k, v); });
  return p;
}

/** Append params to a path, returning `path?key=val&...` or just `path`. */
function _url(path: string, extra?: Record<string, string>): string {
  const p = _params(extra);
  const qs = p.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Generic fetch helper */
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
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

export async function getOnboarding() {
  // Pass stored user_id so backend can validate even without USER_ID env var
  const storedUid = typeof window !== "undefined" ? localStorage.getItem("powerblock_user_id") || "" : "";
  const params = new URLSearchParams({ _t: String(Date.now()) });
  if (storedUid) params.set("user_id", storedUid);
  return request<Record<string, unknown>>(`/api/onboarding?${params}`);
}

export async function getRoadNames(postalCodes: string[]): Promise<Record<string, string>> {
  return request<Record<string, string>>(`/api/onboarding/road-names?postal_codes=${postalCodes.join(",")}`);
}

// ---- Usage (Dashboard) ----

export async function getUsage(
  date?: string,
): Promise<import("./types").UsageResponse> {
  return request<import("./types").UsageResponse>(_url("/api/usage/", date ? { date } : undefined));
}

// ---- Block View ----

export async function getBlockUsage(
  postalCode: string,
  date?: string,
): Promise<import("./types").BlockUsageResponse> {
  return request<import("./types").BlockUsageResponse>(_url(`/api/block/${postalCode}`, date ? { date } : undefined));
}

// ---- Map View ----

export async function getMap(
  district: string,
  date?: string,
): Promise<import("./types").MapResponse> {
  return request<import("./types").MapResponse>(_url(`/api/map/${district}`, date ? { date } : undefined));
}

// ---- Leaderboard ----

export async function getLeaderboard(
  district: string,
  date?: string,
): Promise<import("./types").LeaderboardResponse> {
  return request<import("./types").LeaderboardResponse>(_url(`/api/leaderboard/${district}`, date ? { date } : undefined));
}

// ---- Challenges ----

export async function getChallenges(
): Promise<import("./types").ChallengesResponse> {
  return request<import("./types").ChallengesResponse>(_url("/api/challenges"));
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
  date?: string,
): Promise<import("./types").AIInsightResponse> {
  return request<import("./types").AIInsightResponse>(_url("/api/ai/insights", date ? { date } : undefined));
}

export async function getAIRecommendations(
): Promise<import("./types").AIRecommendResponse> {
  return request<import("./types").AIRecommendResponse>(_url("/api/ai/recommend"));
}

export async function getAIMonthlyAnalysis(
): Promise<import("./types").AIMonthlyAnalysisResponse> {
  return request<import("./types").AIMonthlyAnalysisResponse>(_url("/api/ai/analyze"));
}

// ---- Insights ----

export async function getAnomaly(
): Promise<import("./types").AnomalyResponse> {
  return request<import("./types").AnomalyResponse>(_url("/api/ai/anomaly"));
}

export async function getProjections(
): Promise<import("./types").ProjectionsResponse> {
  return request<import("./types").ProjectionsResponse>(_url("/api/ai/projections"));
}

export async function getHouseholdBenchmark(
): Promise<import("./types").HouseholdBenchmarkResponse> {
  return request<import("./types").HouseholdBenchmarkResponse>(_url("/api/ai/benchmark"));
}
