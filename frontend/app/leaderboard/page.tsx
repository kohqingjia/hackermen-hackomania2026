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
import { mergeBlockNames, blockLabel } from "@/lib/blockNames";

export default function LeaderboardPage() {
  const [userPostalCode, setUserPostalCode] = useState("752339");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(0);

  useEffect(() => {
    const bid = localStorage.getItem("blockbattles_postal_code") || "752339";
    setUserPostalCode(bid);

    getLeaderboard("Yishun")
      .then((res) => {
        // Cache block number mapping from API response
        if (res.block_no_map) mergeBlockNames(res.block_no_map);
        setData(res);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const weekLabel = data
    ? new Date(data.week_start).toLocaleDateString("en-SG", { day: "numeric", month: "short" })
    : "";

  const history = data?.weekly_top3_history ?? [];
  const selectedHistory = history[historyIndex];
  const userInTop3 = (selectedHistory?.winners ?? []).some((winner) => winner.postal_code === userPostalCode);
  const userBlockKwh = selectedHistory?.block_avg_kwh_by_block?.[userPostalCode];
  const displayRows = [
    ...(selectedHistory?.winners ?? []).map((winner) => ({
      key: `${selectedHistory?.week_start}-${winner.rank}`,
      blockId: blockLabel(winner.postal_code),
      avgKwh: winner.avg_kwh,
      rank: winner.rank,
      isUser: winner.postal_code === userPostalCode,
    })),
    ...(!userInTop3 && userBlockKwh !== undefined ? [{
      key: `${selectedHistory?.week_start}-${userPostalCode}`,
      blockId: blockLabel(userPostalCode),
      avgKwh: userBlockKwh,
      rank: null,
      isUser: true,
    }] : []),
  ];
  const selectedWeekLabel = selectedHistory
    ? new Date(selectedHistory.week_start).toLocaleDateString("en-SG", { day: "numeric", month: "short" })
    : "";
  const weekIndicator = history.length ? `Week ${historyIndex + 1} of ${history.length}` : "";

  const MEDALS: Record<number, string> = {
    1: "🥇",
    2: "🥈",
    3: "🥉",
  };

  function openHistory() {
    setHistoryIndex(0);
    setShowHistory(true);
  }

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
        <button
          onClick={openHistory}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sp-teal border border-sp-mint rounded-lg px-3 py-1.5 hover:bg-sp-chart transition-colors"
        >
          View Past 5 Weekly Top 3
        </button>
      </div>

      {/* Points info card */}
      <Card className="bg-sp-teal text-black border-0">
        <p className="text-m font-semibold opacity-80 mb-2">Weekly Points</p>
        <div className="flex justify-around">
          {[
            { rank: "1st", points: "100", emoji: "🥇" },
            { rank: "2nd", points: "80",  emoji: "🥈" },
            { rank: "3rd", points: "25",  emoji: "🥉" },
          ].map(({ rank, points, emoji }) => (
            <div key={rank} className="text-center">
              <p className="text-lg">{emoji}</p>
              <p className="text-s font-bold">{rank}</p>
              <p className="text-[10px] opacity-80 inline-flex items-center gap-1 justify-center">+{points} 🍃</p>
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
        <LeaderboardList entries={data.entries} userPostalCode={userPostalCode} />
      ) : (
        <Card><p className="text-sm text-sp-text-secondary text-center py-4">No data available</p></Card>
      )}

      {/* Weekly history popup */}
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 h-[520px] overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <p className="text-base font-semibold text-sp-text">Weekly Top 3 Winners</p>
              <button onClick={() => setShowHistory(false)} className="text-sp-text-secondary p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setHistoryIndex((prev) => Math.min(prev + 1, history.length - 1))}
                disabled={historyIndex >= history.length - 1}
                className="w-9 h-9 rounded-full border border-gray-200 text-sp-text text-base disabled:opacity-30"
              >
                ←
              </button>
              <div className="text-center">
                <p className="text-sm text-sp-text-secondary">Week of {selectedWeekLabel}</p>
                <p className="text-xs text-sp-text-secondary mt-1">{weekIndicator}</p>
              </div>
              <button
                onClick={() => setHistoryIndex((prev) => Math.max(prev - 1, 0))}
                disabled={historyIndex <= 0}
                className="w-9 h-9 rounded-full border border-gray-200 text-sp-text text-base disabled:opacity-30"
              >
                →
              </button>
            </div>

            <div className="space-y-3 h-[300px]">
              {displayRows.map((row) => (
                <div
                  key={row.key}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 min-h-[68px] ${row.isUser ? "bg-sp-teal" : "bg-sp-chart"}`}
                >
                  <p className={`text-base font-semibold inline-flex items-center gap-2 ${row.isUser ? "text-white" : "text-sp-text"}`}>
                    <span>
                      {row.rank ? (
                        MEDALS[row.rank] || `#${row.rank}`
                      ) : (
                        <svg className={`w-4 h-4 ${row.isUser ? "stroke-white" : "stroke-sp-text"}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      )}
                    </span>
                    <span>Blk {row.blockId}</span>
                    {row.isUser && (
                      <span className="text-xs font-medium text-white/90">(You)</span>
                    )}
                  </p>
                  <p className={`text-base ${row.isUser ? "text-white/90" : "text-sp-text-secondary"}`}>{row.avgKwh.toFixed(2)} kWh/day</p>
                </div>
              ))}
              {!displayRows.length && (
                <p className="text-sm text-sp-text-secondary text-center py-2">No winner data for this week.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
