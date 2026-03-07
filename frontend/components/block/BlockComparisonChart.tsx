"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { HalfHourlyPoint } from "@/lib/types";

interface BlockComparisonChartProps {
  userSeries: HalfHourlyPoint[];
  blockSeries: HalfHourlyPoint[];
}

export default function BlockComparisonChart({ userSeries, blockSeries }: BlockComparisonChartProps) {
  // Merge into single dataset for recharts
  const data = userSeries.map((u, i) => ({
    hour_label: u.hour_label,
    your_avg: parseFloat(u.electricity_kwh.toFixed(4)),
    block_avg: parseFloat((blockSeries[i]?.electricity_kwh ?? 0).toFixed(4)),
  }));

  function tickFormatter(label: string, index: number) {
    return index % 4 === 0 ? label : "";
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
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
          tickFormatter={(v) => v.toFixed(1)}
        />
        <Tooltip
          formatter={(v: number, name: string) => [`${v.toFixed(3)} kWh`, name === "your_avg" ? "You" : "Block avg"]}
          labelFormatter={(l) => `Time: ${l}`}
          contentStyle={{ background: "#fff", border: "1px solid #E5E9E9", borderRadius: 12, fontSize: 12 }}
        />
        <Legend
          formatter={(val) => val === "your_avg" ? "You" : "Block avg"}
          wrapperStyle={{ fontSize: 11 }}
        />
        {/* Block avg — red line (matching sketch) */}
        <Line type="monotone" dataKey="block_avg" stroke="#F59E0B" strokeWidth={2} dot={false} strokeDasharray="4 2" />
        {/* Your usage — teal */}
        <Line type="monotone" dataKey="your_avg" stroke="#2DB7A3" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
