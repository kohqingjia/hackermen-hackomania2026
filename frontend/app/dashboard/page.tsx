"use client";

/**
 * Dashboard — main home screen
 * Shows: half-hourly usage chart, AI insight, bill tracker, block wars widget
 * Data: /api/usage, /api/ai/insights, /api/ai/analyze, /api/leaderboard
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card, { SectionHeader, LoadingCard } from "@/components/shared/Card";
import BlockComparisonChart from "@/components/block/BlockComparisonChart";
import BlockStats from "@/components/block/BlockStats";
import AIInsightCard from "@/components/dashboard/AIInsightCard";
import BillTracker from "@/components/dashboard/BillTracker";
import BlockWarsWidget from "@/components/dashboard/BlockWarsWidget";
import { getBlockUsage, getLeaderboard, getAIMonthlyAnalysis } from "@/lib/api";
import type { BlockUsageResponse, LeaderboardResponse, AIMonthlyAnalysisResponse } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [blockId, setBlockId] = useState("BLK404");
  const [blockUsage, setBlockUsage] = useState<BlockUsageResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [monthly, setMonthly] = useState<AIMonthlyAnalysisResponse | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);

  useEffect(() => {
    const uid = localStorage.getItem("powerblock_user_id");
    const bid = localStorage.getItem("powerblock_block_id") || "BLK404";
    if (!uid) { router.replace("/onboarding"); return; }
    setUserId(uid);
    setBlockId(bid);

    getBlockUsage(bid, uid)
      .then(setBlockUsage)
      .catch(console.error)
      .finally(() => setLoadingUsage(false));

    getLeaderboard("Yishun").then(setLeaderboard).catch(console.error);
    getAIMonthlyAnalysis(uid).then(setMonthly).catch(console.error);
  }, [router]);

  if (!userId) return null;

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
          <p className="text-xs text-sp-text-secondary">{blockId}, Yishun</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-sp-chart flex items-center justify-center">
          <svg className="w-5 h-5 stroke-sp-teal" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
        </div>
      </div>

      {/* Usage Comparison Chart */}
      <Card>
        <SectionHeader
          title="Usage Comparison"
          subtitle="Your usage vs block average today"
        />
        {loadingUsage ? (
          <div className="h-44 animate-pulse bg-sp-chart rounded-xl" />
        ) : blockUsage ? (
          <BlockComparisonChart
            userSeries={blockUsage.hourly_user}
            blockSeries={blockUsage.hourly_block_avg}
          />
        ) : (
          <p className="text-sm text-sp-text-secondary text-center py-8">No data available today</p>
        )}
      </Card>

      {/* Below / Above block average analysis */}
      {loadingUsage ? (
        <LoadingCard />
      ) : blockUsage ? (
        <BlockStats data={blockUsage} />
      ) : null}

      {/* AI Insight */}
      <AIInsightCard userId={userId} />
    </div>
  );
}
