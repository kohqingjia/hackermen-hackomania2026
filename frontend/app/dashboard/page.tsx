"use client";

/**
 * Dashboard — main home screen
 * Shows: half-hourly usage chart, AI insight, bill tracker, block wars widget
 * Data: /api/usage, /api/ai/insights, /api/ai/analyze, 
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card, { SectionHeader, LoadingCard } from "@/components/shared/Card";
import BlockComparisonChart, { type ChartVariant } from "@/components/block/BlockComparisonChart";
import BlockStats from "@/components/block/BlockStats";
import AIInsightCard from "@/components/dashboard/AIInsightCard";
import BillTracker from "@/components/dashboard/BillTracker";
import BlockWarsWidget from "@/components/dashboard/BlockWarsWidget";
import { EnergyBuilding } from "@/components/dashboard/BuildingGraph";
import clsx from "clsx";
import { getBlockUsage, getLeaderboard, getAIMonthlyAnalysis, getAIInsightContext, getOnboarding } from "@/lib/api";
import type { BlockUsageResponse, LeaderboardResponse, AIMonthlyAnalysisResponse } from "@/lib/types";
import StatBox from "@/components/shared/StatBox";

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [postalCode, setPostalCode] = useState("752339");
  const [blockUsage, setBlockUsage] = useState<BlockUsageResponse | null>(null);
  const [monthly, setMonthly] = useState<AIMonthlyAnalysisResponse | null>(null);
  const [insightContext, setInsightContext] = useState<string>("");
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [chartVariant, setChartVariant] = useState<ChartVariant>("per-day");
  const [backendChecked, setBackendChecked] = useState(false);

  const variantSubtitle: Record<ChartVariant, string> = {
    "per-day": "Half-hourly usage today",
    day: "Daily average this week",
    week: "Weekly average this month",
  };

  useEffect(() => {
    // Validate with backend first
    getOnboarding()
      .then((result) => {
        console.log(result);
        const userId = String(result.user_id ?? result.UserID ?? "").trim();
        const householdId = String(result.household_id ?? result.HouseholdID ?? "").trim();
        const postalCode = String(result.postal_code ?? result.PostalCode ?? result.Postal_Code ?? "").trim();

        if (householdId) {
          localStorage.setItem("powerblock_household_id", householdId);
        }
        if (postalCode) {
          localStorage.setItem("powerblock_postal_code", postalCode);
        }

        if (!userId) {
          localStorage.removeItem("powerblock_user_id");
          localStorage.removeItem("powerblock_postal_code");
          localStorage.removeItem("powerblock_household_id");
          localStorage.removeItem("powerblock_target_bill");
          router.replace("/onboarding");
          return;
        }

        localStorage.setItem("powerblock_user_id", userId);
        setUserId(userId);
        setPostalCode(postalCode || "752339");
        setBackendChecked(true);

        // Load dashboard data
        const bid = postalCode || "752339";
        getBlockUsage(bid)
          .then(setBlockUsage)
          .catch(console.error)
          .finally(() => setLoadingUsage(false));

        getAIMonthlyAnalysis().then(setMonthly).catch(console.error);
        getAIInsightContext().then((result) => setInsightContext(result.context)).catch(console.error);
      })
      .catch(() => {
        localStorage.removeItem("powerblock_user_id");
        localStorage.removeItem("powerblock_postal_code");
        localStorage.removeItem("powerblock_household_id");
        localStorage.removeItem("powerblock_target_bill");
        router.replace("/onboarding");
      });
  }, [router]);

  if (!backendChecked || !userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-sp-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const today = new Date().toLocaleDateString("en-SG", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <div className="px-4 py-6 space-y-4 page-enter">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs text-sp-text-secondary">{today}</p>
          <h1 className="text-xl font-bold text-sp-text mt-0.5">Good evening!</h1>
          <p className="text-xs text-sp-text-secondary">{postalCode}, Sembawang</p> {/**To do: change location to db data instead of hardcoded yishun */}
        </div>
        <div className="w-10 h-10 rounded-full bg-sp-chart flex items-center justify-center">
          <svg className="w-5 h-5 stroke-sp-teal" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
        </div>
      </div>

            {/* Below / Above block average analysis */}
      {loadingUsage ? (
        <LoadingCard />
      ) : blockUsage ? (
        <div>
          <BlockStats data={blockUsage} />
          <StatBox label="Context" value="Your usage is equal to..." sub={insightContext || "Loading context..."} />
        </div>  
      ) : null}

      {/* Energy Building Visualisation */}
      {loadingUsage ? (
        <LoadingCard />
      ) : blockUsage ? (
        <Card>
          <SectionHeader
            title="Your Block at a Glance"
            subtitle="Live usage vs block average"
          />
          <EnergyBuilding
            userUsage={blockUsage.user_kwh}
            blockAverage={blockUsage.block_avg_kwh}
            threshold={Math.max(blockUsage.user_kwh, blockUsage.block_avg_kwh) * 1.3 || 1}
            blockName={`BLK ${postalCode}`}
            timeLabel="Today's total usage"
          />
        </Card>
      ) : null}

      {/* Usage Comparison Chart */}
      <Card>
        <SectionHeader
          title="Usage Comparison"
          subtitle={variantSubtitle[chartVariant]}
        />
        <div className="inline-flex bg-sp-bg rounded-xl p-1 border border-gray-200 mb-3">
          {([
            { key: "per-day", label: "Per Day" },
            { key: "day", label: "Day" },
            { key: "week", label: "Week" },
          ] as const).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setChartVariant(item.key)}
              className={clsx(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                chartVariant === item.key
                  ? "bg-white text-sp-teal shadow-sm"
                  : "text-sp-text-secondary hover:text-sp-text"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        {loadingUsage ? (
          <div className="h-44 animate-pulse bg-sp-chart rounded-xl" />
        ) : blockUsage ? (
          <BlockComparisonChart
            perDayUserSeries={blockUsage.hourly_user}
            perDayBlockSeries={blockUsage.hourly_block_avg}
            dayChartSeries={blockUsage.daily_comparison_week}
            weekChartSeries={blockUsage.weekly_comparison_month}
            variant={chartVariant}
            onVariantChange={setChartVariant}
            showVariantTabs={false}
          />
        ) : (
          <p className="text-sm text-sp-text-secondary text-center py-8">No data available today</p>
        )}
      </Card>


      {/* AI Insight */}
      <AIInsightCard userId={userId} />
    </div>
  );
}
