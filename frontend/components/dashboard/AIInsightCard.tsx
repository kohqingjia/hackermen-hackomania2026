"use client";

import { useEffect, useState } from "react";
import Card from "@/components/shared/Card";
import { getAIInsights } from "@/lib/api";
import type { AIInsightResponse } from "@/lib/types";

interface AIInsightCardProps {
  userId: string;
  date?: string;
}

export default function AIInsightCard({ userId, date }: AIInsightCardProps) {
  const [data, setData] = useState<AIInsightResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAIInsights(userId, date)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId, date]);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <div className="h-4 bg-sp-chart rounded w-1/4 mb-3" />
        <div className="space-y-2">
          <div className="h-3 bg-sp-chart rounded" />
          <div className="h-3 bg-sp-chart rounded w-4/5" />
        </div>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-sp-chart flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-4 h-4 stroke-sp-teal" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-sp-teal uppercase tracking-wide mb-1">AI Insight</p>
          <p className="text-sm text-sp-text leading-relaxed">{data.insight}</p>
          <div className="mt-3 bg-sp-alert-light border border-amber-200 rounded-xl px-3 py-2">
            <p className="text-xs font-semibold text-sp-alert mb-0.5">Tonight&apos;s Tip</p>
            <p className="text-xs text-sp-text">{data.tip}</p>
          </div>
          <p className="text-xs text-sp-text-secondary mt-2">{data.comparison}</p>
        </div>
      </div>
    </Card>
  );
}
