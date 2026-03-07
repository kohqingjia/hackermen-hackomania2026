"use client";

import { useEffect, useState } from "react";
import Card, { SectionHeader } from "@/components/shared/Card";
import StatBox from "@/components/shared/StatBox";
import { getProjections } from "@/lib/api";
import type { ProjectionsResponse } from "@/lib/types";
import clsx from "clsx";

export default function ProjectionsCard({ userId }: { userId: string }) {
  const [data, setData] = useState<ProjectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProjections()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <div className="h-4 bg-sp-chart rounded w-1/3 mb-3" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-sp-chart rounded-2xl" />
          ))}
        </div>
      </Card>
    );
  }

  if (!data) return null;

  const hasTarget = data.target_bill_sgd !== undefined && data.target_bill_sgd > 0;
  const isOnTrack = hasTarget && data.projected_bill_sgd <= data.target_bill_sgd!;
  const savingsAmount = hasTarget ? (data.target_bill_sgd! - data.projected_bill_sgd) : 0;
  const progressPct = hasTarget ? Math.min((data.projected_bill_sgd / data.target_bill_sgd!) * 100, 100) : 0;

  return (
    <div className="space-y-3">
      <SectionHeader title="Projections" subtitle={`${data.days_remaining} days left this month`} />

      {/* Bill comparison if target is set */}
      {hasTarget && (
        <Card className={clsx(
          "border-2",
          isOnTrack ? "bg-green-50 border-green-100" : "bg-sp-alert-light border-amber-200"
        )}>
          <div className="flex items-start gap-3 mb-3">
            <div className={clsx(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
              isOnTrack ? "bg-green-100" : "bg-amber-100"
            )}>
              <span className="text-lg">{isOnTrack ? "✓" : "⚠"}</span>
            </div>
            <div className="flex-1">
              <p className={clsx("text-sm font-semibold", isOnTrack ? "text-green-700" : "text-sp-alert")}>
                {isOnTrack
                  ? `On track! S$${savingsAmount.toFixed(2)} under target`
                  : `S$${Math.abs(savingsAmount).toFixed(2)} over target`}
              </p>
              <p className="text-xs text-sp-text-secondary mt-0.5">
                Projected: S${data.projected_bill_sgd.toFixed(2)} · Target: S${data.target_bill_sgd!.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-white rounded-full h-2.5 overflow-hidden">
            <div
              className={clsx(
                "h-full rounded-full transition-all",
                isOnTrack ? "bg-green-500" : "bg-sp-alert"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatBox
          label="Projected bill"
          value={`S$${data.projected_bill_sgd.toFixed(2)}`}
          sub="this month"
          highlight
        />
        <StatBox
          label="Avg daily usage"
          value={`${data.projected_avg_daily_kwh.toFixed(2)} kWh`}
          sub="per day"
        />
        <StatBox
          label="Projected total"
          value={`${data.projected_total_kwh.toFixed(1)} kWh`}
          sub="this month"
        />
        {hasTarget && (
          <StatBox
            label="Target bill"
            value={`S$${data.target_bill_sgd!.toFixed(2)}`}
            sub="your goal"
          />
        )}
      </div>
    </div>
  );
}
