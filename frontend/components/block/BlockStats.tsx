import clsx from "clsx";
import type { BlockUsageResponse } from "@/lib/types";
import StatBox from "@/components/shared/StatBox";

interface BlockStatsProps {
  data: BlockUsageResponse;
}

export default function BlockStats({ data }: BlockStatsProps) {
  const isBelow = data.difference_kwh < 0;
  const absDiff = Math.abs(data.difference_kwh);
  const absPct = Math.abs(data.difference_pct);
  // Approx cost savings: SGD 0.33/kWh
  const costDiff = (absDiff * 0.33).toFixed(2);
  // Carbon approx: 0.408 kg CO2/kWh (Singapore grid)
  const carbonDiff = (absDiff * 0.408).toFixed(2);

  return (
    <div className="space-y-3">
      {/* Big comparison banner */}
      <div className={clsx(
        "rounded-2xl p-4 flex items-start gap-3",
        isBelow ? "bg-green-50 border border-green-100" : "bg-sp-alert-light border border-amber-200"
      )}>
        <span className="text-2xl">{isBelow ? "🎉" : "📈"}</span>
        <div>
          <p className={clsx("font-semibold text-sm", isBelow ? "text-green-700" : "text-sp-alert")}>
            {isBelow
              ? `${absPct.toFixed(1)}% below your block average`
              : `${absPct.toFixed(1)}% above your block average`}
          </p>
          <p className="text-xs text-sp-text-secondary mt-0.5">
            {isBelow
              ? `${absDiff.toFixed(2)} kWh less — that's S$${costDiff} saved and ${carbonDiff} kg CO₂ less!`
              : `${absDiff.toFixed(2)} kWh more than the block average today.`}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox label="Your usage" value={`${data.user_kwh.toFixed(2)} kWh`} sub="today" />
        <StatBox label="Block average" value={`${data.block_avg_kwh.toFixed(2)} kWh`} sub="today" highlight />
      </div>
    </div>
  );
}
