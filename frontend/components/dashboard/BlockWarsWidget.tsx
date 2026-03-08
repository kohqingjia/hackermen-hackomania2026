"use client";

import Link from "next/link";
import Card from "@/components/shared/Card";
import type { LeaderboardEntry } from "@/lib/types";
import { blockLabel } from "@/lib/blockNames";

interface BlockWarsWidgetProps {
  userPostalCode: string;
  entries: LeaderboardEntry[];
  resetsInDays: number;
}

export default function BlockWarsWidget({ userPostalCode, entries, resetsInDays }: BlockWarsWidgetProps) {
  const userEntry = entries.find((e) => e.postal_code === userPostalCode);
  const top3 = entries.slice(0, 3);

  return (
    <Card>
      <div className="flex justify-between items-center mb-3">
        <div>
          <p className="text-xs font-semibold text-sp-teal uppercase tracking-wide">Block Wars</p>
          <h3 className="text-base font-bold text-sp-text">Yishun Challenge</h3>
        </div>
        <span className="text-[10px] text-sp-text-secondary bg-gray-50 border border-gray-100 rounded-full px-2 py-1">
          Resets in {resetsInDays}d
        </span>
      </div>

      {/* Top 3 mini-leaderboard */}
      <div className="space-y-2">
        {top3.map((entry, i) => {
          const isUser = entry.postal_code === userPostalCode;
          const medals = ["🥇", "🥈", "🥉"];
          return (
            <div
              key={entry.postal_code}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
                isUser ? "bg-sp-chart" : "bg-gray-50"
              }`}
            >
              <span className="text-base">{medals[i]}</span>
              <span className={`flex-1 text-sm font-medium ${isUser ? "text-sp-teal-dark" : "text-sp-text"}`}>
                Blk {blockLabel(entry.postal_code)} {isUser && <span className="text-[10px]">(You)</span>}
              </span>
              <span className="text-xs text-green-600 font-semibold">-{entry.reduction_pct}%</span>
              <span className="text-xs text-sp-text-secondary">+{entry.points}pt</span>
            </div>
          );
        })}
      </div>

      {/* User rank if not in top 3 */}
      {userEntry && userEntry.rank > 3 && (
        <div className="mt-2 flex items-center gap-3 px-3 py-2 rounded-xl bg-sp-chart">
          <span className="text-sm font-bold text-sp-teal">#{userEntry.rank}</span>
          <span className="flex-1 text-sm font-medium text-sp-teal-dark">Blk {blockLabel(userPostalCode)} (You)</span>
          <span className="text-xs text-green-600 font-semibold">-{userEntry.reduction_pct}%</span>
        </div>
      )}

      <Link href="/leaderboard" className="block mt-3 text-center text-xs font-medium text-sp-teal">
        View full leaderboard
      </Link>
    </Card>
  );
}
