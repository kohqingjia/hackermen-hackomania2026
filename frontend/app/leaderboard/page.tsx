  "use client";

/**
 * Leaderboard View
 * Shows: weekly block rankings, points, resets countdown
 * Data: /api/leaderboard/{district}
 */

import { useEffect, useState } from "react";
import Card, { LoadingCard } from "@/components/shared/Card";
import LeaderboardList from "@/components/leaderboard/LeaderboardList";
import { getLeaderboard } from "@/lib/api";
import type { LeaderboardResponse } from "@/lib/types";

export default function LeaderboardPage() {
  const [userBlockId, setUserBlockId] = useState("BLK404");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bid = localStorage.getItem("powerblock_block_id") || "BLK404";
    setUserBlockId(bid);

    getLeaderboard("Yishun")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const weekLabel = data
    ? new Date(data.week_start).toLocaleDateString("en-SG", { day: "numeric", month: "short" })
    : "";

  return (
    <div className="px-4 py-6 space-y-4 page-enter">
      {/* Header */}
      <div>
        <p className="text-xs text-sp-text-secondary uppercase tracking-wide">Leaderboard</p>
        <h1 className="text-xl font-bold text-sp-text mt-0.5">Top Blocks This Week</h1>
        {data && (
          <p className="text-xs text-sp-text-secondary">
            Week of {weekLabel} · Resets in {data.resets_in_days} day{data.resets_in_days !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Points info card */}
      <Card className="bg-sp-teal text-black border-0">
        <p className="text-m font-semibold opacity-80 mb-2">Weekly Points</p>
        <div className="flex justify-around">
          {[
            { rank: "1st", pts: "100 pts", emoji: "🥇" },
            { rank: "2nd", pts: "80 pts",  emoji: "🥈" },
            { rank: "3rd", pts: "25 pts",  emoji: "🥉" },
          ].map(({ rank, pts, emoji }) => (
            <div key={rank} className="text-center">
              <p className="text-lg">{emoji}</p>
              <p className="text-s font-bold">{rank}</p>
              <p className="text-[10px] opacity-80">+{pts}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] opacity-70 mt-2 text-center">Ranked by % reduction from district average — resets every Monday</p>
      </Card>

      {/* District average (usage) */}
      {data && (
        <Card className="border-0">
          <p className="text-m font-semibold opacity-80 mb-2">District Average</p>
          <p className="text-lg font-bold">{data.district_avg_kwh.toFixed(1)} kWh/day</p>
          <p className="text-xs opacity-70 mt-1">Average usage across all blocks in {data.district} this week.</p>
        </Card>
      )}

      {/* Rankings */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <LoadingCard key={i} />)}
        </div>
      ) : data ? (
        <LeaderboardList entries={data.entries} userBlockId={userBlockId} />
      ) : (
        <Card><p className="text-sm text-sp-text-secondary text-center py-4">No data available</p></Card>
      )}
    </div>
  );
}
