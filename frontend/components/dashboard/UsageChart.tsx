"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { HalfHourlyPoint } from "@/lib/types";

interface UsageChartProps {
  data: HalfHourlyPoint[];
  peakHour?: string;
}

// Show every 4th label (every 2 hours) to avoid crowding
function tickFormatter(label: string, index: number) {
  return index % 4 === 0 ? label : "";
}

export default function UsageChart({ data, peakHour }: UsageChartProps) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#2DB7A3" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#2DB7A3" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E9E9" vertical={false} />
          <XAxis
            dataKey="hour_label"
            tickFormatter={tickFormatter}
            tick={{ fontSize: 10, fill: "#6B7C7C" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#6B7C7C" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v.toFixed(1)}`}
          />
          <Tooltip
            formatter={(value: number) => [`${value.toFixed(3)} kWh`, "Usage"]}
            labelFormatter={(label) => `Time: ${label}`}
            contentStyle={{
              background: "#fff",
              border: "1px solid #E5E9E9",
              borderRadius: 12,
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="electricity_kwh"
            stroke="#2DB7A3"
            strokeWidth={2}
            fill="url(#usageGradient)"
            dot={false}
            activeDot={{ r: 4, fill: "#2DB7A3" }}
          />
        </AreaChart>
      </ResponsiveContainer>
      {peakHour && (
        <p className="text-xs text-sp-text-secondary mt-1 text-right">
          Peak at <span className="text-sp-alert font-medium">{peakHour}</span>
        </p>
      )}
    </div>
  );
}
