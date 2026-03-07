"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import clsx from "clsx";
import type { DailyComparisonPoint, HalfHourlyPoint, WeeklyComparisonPoint } from "@/lib/types";

export type ChartVariant = "per-day" | "day" | "week";

interface BlockComparisonChartProps {
  perDayUserSeries: HalfHourlyPoint[];
  perDayBlockSeries: HalfHourlyPoint[];
  dayChartSeries: DailyComparisonPoint[];
  weekChartSeries: WeeklyComparisonPoint[];
  variant?: ChartVariant;
  onVariantChange?: (variant: ChartVariant) => void;
  showVariantTabs?: boolean;
  defaultVariant?: ChartVariant;
}

const VARIANTS: Array<{ key: ChartVariant; label: string }> = [
  { key: "per-day", label: "Per Day" },
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
];

export default function BlockComparisonChart({
  perDayUserSeries,
  perDayBlockSeries,
  dayChartSeries,
  weekChartSeries,
  variant,
  onVariantChange,
  showVariantTabs = true,
  defaultVariant = "per-day",
}: BlockComparisonChartProps) {
  const [internalVariant, setInternalVariant] = useState<ChartVariant>(defaultVariant);
  const activeVariant = variant ?? internalVariant;

  function handleVariantChange(nextVariant: ChartVariant) {
    if (variant === undefined) {
      setInternalVariant(nextVariant);
    }
    onVariantChange?.(nextVariant);
  }

  const perDayData = useMemo(() => (
    perDayUserSeries.map((u, i) => ({
      label: u.hour_label,
      your_avg: parseFloat(u.electricity_kwh.toFixed(4)),
      block_avg: parseFloat((perDayBlockSeries[i]?.electricity_kwh ?? 0).toFixed(4)),
    }))
  ), [perDayUserSeries, perDayBlockSeries]);

  const dayData = useMemo(() => (
    dayChartSeries.map((point) => ({
      label: point.day_label,
      your_avg: parseFloat(point.user_avg_kwh.toFixed(3)),
      block_avg: parseFloat(point.block_avg_kwh.toFixed(3)),
    }))
  ), [dayChartSeries]);

  const weekData = useMemo(() => (
    weekChartSeries.map((point) => ({
      label: point.week_label,
      your_avg: parseFloat(point.user_avg_kwh.toFixed(3)),
      block_avg: parseFloat(point.block_avg_kwh.toFixed(3)),
    }))
  ), [weekChartSeries]);

  function tickFormatter(label: string, index: number) {
    return index % 4 === 0 ? label : "";
  }

  const chartData = activeVariant === "per-day" ? perDayData : activeVariant === "day" ? dayData : weekData;

  return (
    <div className="space-y-3">
      {showVariantTabs && (
        <div className="inline-flex bg-sp-bg rounded-xl p-1 border border-gray-200">
          {VARIANTS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => handleVariantChange(item.key)}
              className={clsx(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                activeVariant === item.key
                  ? "bg-white text-sp-teal shadow-sm"
                  : "text-sp-text-secondary hover:text-sp-text"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={220}>
        {activeVariant === "per-day" ? (
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E9E9" vertical={false} />
            <XAxis
              dataKey="label"
              tickFormatter={tickFormatter}
              tick={{ fontSize: 10, fill: "#6B7C7C" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#6B7C7C" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v.toFixed(1)}
            />
            <Tooltip
              formatter={(v: number, name: string) => [`${v.toFixed(3)} kWh`, name === "your_avg" ? "You" : "Block avg"]}
              labelFormatter={(l) => `Time: ${l}`}
              contentStyle={{ background: "#fff", border: "1px solid #E5E9E9", borderRadius: 12, fontSize: 12 }}
            />
            <Legend formatter={(val) => val === "your_avg" ? "You" : "Block avg"} wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="block_avg" stroke="#F59E0B" strokeWidth={2} dot={false} strokeDasharray="4 2" />
            <Line type="monotone" dataKey="your_avg" stroke="#2DB7A3" strokeWidth={2} dot={false} />
          </LineChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E9E9" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#6B7C7C" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#6B7C7C" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v.toFixed(1)}
            />
            <Tooltip
              formatter={(v: number, name: string) => [`${v.toFixed(3)} kWh`, name === "your_avg" ? "You" : "Block avg"]}
              labelFormatter={(l) => activeVariant === "day" ? `Day: ${l}` : `Week: ${l}`}
              contentStyle={{ background: "#fff", border: "1px solid #E5E9E9", borderRadius: 12, fontSize: 12 }}
            />
            <Legend formatter={(val) => val === "your_avg" ? "You" : "Block avg"} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="your_avg" name="your_avg" fill="#2DB7A3" radius={[6, 6, 0, 0]} />
            <Bar dataKey="block_avg" name="block_avg" fill="#BFECE4" radius={[6, 6, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
