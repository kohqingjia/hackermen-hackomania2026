"use client";

import Card, { SectionHeader } from "@/components/shared/Card";
import type { AIMonthlyAnalysisResponse } from "@/lib/types";

interface BillTrackerProps {
  data: AIMonthlyAnalysisResponse | null;
  loading?: boolean;
}

export default function BillTracker({ data, loading }: BillTrackerProps) {
  if (loading || !data) {
    return (
      <Card className="animate-pulse">
        <div className="h-4 bg-sp-chart rounded w-1/3 mb-3" />
        <div className="h-3 bg-sp-chart rounded mb-2" />
        <div className="h-6 bg-sp-chart rounded-full" />
      </Card>
    );
  }

  const progress = Math.min((data.projected_bill_sgd / data.budget_sgd) * 100, 100);
  const overBudget = data.projected_bill_sgd > data.budget_sgd;

  return (
    <Card>
      <SectionHeader
        title="Bill Tracker"
        subtitle={`Month-to-date forecast vs S$${data.budget_sgd.toFixed(0)} budget`}
      />
      <div className="flex justify-between items-end mb-2">
        <div>
          <span className="text-2xl font-bold text-sp-text">S${data.projected_bill_sgd.toFixed(2)}</span>
          <span className="text-xs text-sp-text-secondary ml-1">projected</span>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          data.on_track_for_target
            ? "bg-green-50 text-green-700"
            : "bg-sp-alert-light text-sp-alert"
        }`}>
          {data.on_track_for_target ? "On track" : "Over target"}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            overBudget ? "bg-sp-alert" : "bg-sp-teal"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-sp-text-secondary">S$0</span>
        <span className="text-[10px] text-sp-text-secondary">S${data.budget_sgd}</span>
      </div>

      {/* Change from last month */}
      <div className="mt-3 flex items-center gap-1.5">
        <span className={`text-sm font-semibold ${data.change_pct < 0 ? "text-green-600" : "text-red-500"}`}>
          {data.change_pct > 0 ? "+" : ""}{data.change_pct.toFixed(1)}%
        </span>
        <span className="text-xs text-sp-text-secondary">vs last month ({data.previous_month_kwh.toFixed(1)} kWh)</span>
      </div>
    </Card>
  );
}
