"use client";

/**
 * Insights View
 * Shows: AI recommendations (reused), anomaly detection,
 *        projections (bill/usage/total), household benchmarking
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingCard } from "@/components/shared/Card";
import AITipCard from "@/components/block/AITipCard";
import AnomalyCard from "@/components/insights/AnomalyCard";
import ProjectionsCard from "@/components/insights/ProjectionsCard";
import BenchmarkCard from "@/components/insights/BenchmarkCard";

export default function InsightsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const uid = localStorage.getItem("powerblock_user_id");
    if (!uid) { router.replace("/onboarding"); return; }
    setUserId(uid);
  }, [router]);

  if (!userId) return null;

  return (
    <div className="px-4 py-6 space-y-4 page-enter">
      {/* Header */}
      <div>
        <p className="text-xs text-sp-text-secondary uppercase tracking-wide">Insights</p>
        <h1 className="text-xl font-bold text-sp-text mt-0.5">Energy Insights</h1>
        <p className="text-xs text-sp-text-secondary">Personalised analysis and recommendations</p>
      </div>

      {/* Projections — rule-based stat boxes */}
      <ProjectionsCard userId={userId} />

      {/* AI Recommendations (reused from Block view) */}
      <AITipCard userId={userId} />

      {/* Anomaly Detection */}
      <AnomalyCard userId={userId} />

      {/* Household Benchmarking */}
      <BenchmarkCard userId={userId} />
    </div>
  );
}
