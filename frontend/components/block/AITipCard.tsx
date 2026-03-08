"use client";

import { useEffect, useState } from "react";
import Card from "@/components/shared/Card";
import { getAIRecommendations } from "@/lib/api";
import type { AIRecommendation } from "@/lib/types";

const TIME_ICONS: Record<string, string> = {
  morning: "🌅",
  afternoon: "☀️",
  evening: "🌆",
  night: "🌙",
};

const PRIORITY_COLORS: Record<string, string> = {
  high:   "bg-red-50 text-red-600 border-red-100",
  medium: "bg-sp-alert-light text-sp-alert border-amber-200",
  low:    "bg-sp-chart text-sp-teal-dark border-sp-mint",
};

export default function AITipCard({ userId }: { userId: string }) {
  const [recs, setRecs] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAIRecommendations()
      .then((r) => setRecs(r.recommendations))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <div className="h-4 bg-sp-chart rounded w-1/3 mb-3" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-sp-chart rounded-xl mb-2" />
        ))}
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-xs font-semibold text-sp-teal uppercase tracking-wide mb-3">AI Recommendations</p>
      <div className="space-y-3">
        {recs.map((rec, i) => (
          <div
            key={i}
            className={`border rounded-xl p-3 ${PRIORITY_COLORS[rec.priority] || PRIORITY_COLORS.low}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <span>{TIME_ICONS[rec.time_of_day] || "⚡"}</span>
                  <p className="text-sm font-semibold">{rec.title}</p>
                </div>
                <p className="text-xs opacity-80">{rec.action}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold">S${rec.estimated_saving_sgd.toFixed(2)}</p>
                <p className="text-[10px] opacity-70">per day</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
