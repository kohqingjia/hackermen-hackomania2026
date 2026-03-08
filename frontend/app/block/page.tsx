"use client";

/**
 * Block View
 * Shows: own usage vs block average chart, stats banner, AI recommendations
 * Data: /api/block/{block_id}, /api/ai/recommend
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card, { SectionHeader, LoadingCard } from "@/components/shared/Card";
import BlockComparisonChart from "@/components/block/BlockComparisonChart";
import BlockStats from "@/components/block/BlockStats";
import AITipCard from "@/components/block/AITipCard";
import { getBlockUsage } from "@/lib/api";
import type { BlockUsageResponse } from "@/lib/types";

export default function BlockPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [postalCode, setPostalCode] = useState("752339");
  const [data, setData] = useState<BlockUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = localStorage.getItem("blockbattles_user_id");
    const bid = localStorage.getItem("blockbattles_postal_code") || "752339";
    if (!uid) { router.replace("/onboarding"); return; }
    setUserId(uid);
    setPostalCode(bid);

    getBlockUsage(bid)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  if (!userId) return null;

  return (
    <div className="px-4 py-6 space-y-4 page-enter">
      {/* Header */}
      <div>
        <p className="text-xs text-sp-text-secondary uppercase tracking-wide">Block View</p>
        <h1 className="text-xl font-bold text-sp-text mt-0.5">Block {postalCode}</h1>
        <p className="text-xs text-sp-text-secondary">Sembawang · How do you compare?</p>
      </div>

      {/* Comparison stats */}
      {loading ? (
        <LoadingCard />
      ) : data ? (
        <BlockStats data={data} />
      ) : (
        <Card><p className="text-sm text-sp-text-secondary text-center py-4">No data available</p></Card>
      )}

      {/* Dual-line chart */}
      <Card>
        <SectionHeader title="Usage Comparison" subtitle="Your usage vs block average today" />
        {loading ? (
          <div className="h-48 animate-pulse bg-sp-chart rounded-xl" />
        ) : data ? (
          <BlockComparisonChart
            perDayUserSeries={data.hourly_user}
            perDayBlockSeries={data.hourly_block_avg}
            dayChartSeries={data.daily_comparison_week}
            weekChartSeries={data.weekly_comparison_month}
          />
        ) : null}
      </Card>

      {/* AI recommendations */}
      <AITipCard userId={userId} />
    </div>
  );
}
