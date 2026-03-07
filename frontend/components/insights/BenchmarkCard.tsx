"use client";

import { useEffect, useState } from "react";
import Card from "@/components/shared/Card";
import { getHouseholdBenchmark } from "@/lib/api";
import type { HouseholdBenchmarkResponse } from "@/lib/types";
import clsx from "clsx";

export default function BenchmarkCard({ userId }: { userId: string }) {
  const [data, setData] = useState<HouseholdBenchmarkResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHouseholdBenchmark(userId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <div className="h-4 bg-sp-chart rounded w-1/2 mb-3" />
        <div className="h-3 bg-sp-chart rounded w-3/4" />
      </Card>
    );
  }

  if (!data) return null;

  const isBelow = data.difference_pct < 0;
  const absPct = Math.abs(data.difference_pct);

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className={clsx(
          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
          isBelow ? "bg-green-50" : "bg-sp-alert-light"
        )}>
          <span className="text-lg">{isBelow ? "🏠" : "📊"}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-sp-teal mb-1">Household Benchmarking</p>

          {/* Banner */}
          <div className={clsx(
            "rounded-xl p-3 mb-3",
            isBelow ? "bg-green-50 border border-green-100" : "bg-sp-alert-light border border-amber-200"
          )}>
            <p className={clsx("text-sm font-semibold", isBelow ? "text-green-700" : "text-sp-alert")}>
              {isBelow
                ? `${absPct.toFixed(1)}% below average for ${data.flat_type} homes`
                : `${absPct.toFixed(1)}% above average for ${data.flat_type} homes`}
            </p>
            <p className="text-xs text-sp-text-secondary mt-0.5">
              Compared to other {data.flat_type} flats in {data.district}
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-4">
            <div>
              <p className="text-[10px] text-sp-text-secondary uppercase tracking-wide">Your avg</p>
              <p className="text-sm font-bold text-sp-text">{data.user_avg_daily_kwh.toFixed(2)} kWh/day</p>
            </div>
            <div>
              <p className="text-[10px] text-sp-text-secondary uppercase tracking-wide">{data.flat_type} avg</p>
              <p className="text-sm font-bold text-sp-text">{data.profile_avg_daily_kwh.toFixed(2)} kWh/day</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
