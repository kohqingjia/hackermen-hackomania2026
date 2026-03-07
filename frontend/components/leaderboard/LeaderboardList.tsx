import clsx from "clsx";
import type { LeaderboardEntry } from "@/lib/types";

interface LeaderboardListProps {
  entries: LeaderboardEntry[];
  userBlockId?: string;
}

const RANK_POINTS_LABEL: Record<number, { label: string; bg: string; text: string }> = {
  1: { label: "+100 pts", bg: "bg-yellow-50", text: "text-yellow-700" },
  2: { label: "+80 pts",  bg: "bg-gray-50",   text: "text-gray-600" },
  3: { label: "+25 pts",  bg: "bg-orange-50", text: "text-orange-600" },
};

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardList({ entries, userBlockId }: LeaderboardListProps) {
  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const isUser = entry.block_id === userBlockId;
        const medal = entry.rank <= 3 ? MEDALS[entry.rank - 1] : null;
        const rankInfo = RANK_POINTS_LABEL[entry.rank];

        return (
          <div
            key={entry.block_id}
            className={clsx(
              "flex items-center gap-3 px-4 py-3 rounded-2xl border",
              isUser
                ? "bg-sp-chart border-sp-mint shadow-sm"
                : entry.rank <= 3
                ? "bg-white border-gray-100 shadow-sm"
                : "bg-white border-gray-100"
            )}
          >
            {/* Rank */}
            <div className="w-8 text-center">
              {medal ? (
                <span className="text-xl">{medal}</span>
              ) : (
                <span className="text-sm font-bold text-sp-text-secondary">#{entry.rank}</span>
              )}
            </div>

            {/* Block info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sp-text truncate">
                {entry.block_id}
                {isUser && <span className="ml-1 text-[10px] font-normal text-sp-teal">(You)</span>}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={clsx(
                  "text-xs font-semibold",
                  entry.reduction_pct >= 0 ? "text-green-600" : "text-red-500"
                )}>
                  {entry.reduction_pct >= 0 ? "-" : "+"}{Math.abs(entry.reduction_pct)}% vs baseline
                </span>
                <span className={clsx(
                  "text-[10px]",
                  entry.weekly_change < 0 ? "text-green-500" : "text-red-400"
                )}>
                  {entry.weekly_change < 0 ? "▼" : "▲"} {Math.abs(entry.weekly_change).toFixed(2)} kWh this week
                </span>
              </div>
            </div>

            {/* Points badge */}
            <div className="flex-shrink-0 text-right">
              {rankInfo && (
                <span className={clsx("text-xs font-semibold px-2 py-1 rounded-full", rankInfo.bg, rankInfo.text)}>
                  {rankInfo.label}
                </span>
              )}
              <p className="text-xs text-sp-text-secondary mt-0.5">{entry.avg_kwh.toFixed(2)} kWh/day</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
