"use client";

/**
 * Map View
 * Shows: colour-coded block bubbles on a stylised map
 * Hover/tap a block to see its usage stats
 * Data: /api/map/{district}
 */

import { useEffect, useRef, useState } from "react";
import BlockMap from "@/components/map/BlockMap";
import { getMap } from "@/lib/api";
import type { MapResponse, BlockMapEntry } from "@/lib/types";
import clsx from "clsx";

const POSTAL_COORDS: Record<string, [number, number]> = {
  "752339": [1.4295, 103.8337],
  "752341": [1.4312, 103.8352],
  "750341": [1.4280, 103.8368],
  "751339": [1.4265, 103.8355],
  "750331": [1.4300, 103.8320],
};

// Static fallback blocks derived from POSTAL_COORDS.
// TODO: Remove once real data flows from /api/map/{district}
const FALLBACK_BLOCKS: BlockMapEntry[] = Object.entries(POSTAL_COORDS).map(
  ([postal_code, [lat, lng]], idx) => ({
    postal_code,
    district: "Yishun",
    avg_kwh: +(8 + Math.random() * 4).toFixed(2),   // placeholder 8-12 kWh
    reduction_pct: +(Math.random() * 15).toFixed(1), // placeholder 0-15%
    rank: idx + 1,
    lat,
    lng,
  })
);

export default function MapPage() {
  const [userPostalCode, setUserPostalCode] = useState("752339");
  const [mapData, setMapData] = useState<MapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [selected, setSelected] = useState<BlockMapEntry | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const bid = localStorage.getItem("powerblock_postal_code") || "752339";
    setUserPostalCode(bid);

    async function loadMapData() {
      const applyData = (data: MapResponse, isFallback = false) => {
        setUsingFallback(isFallback);
        setMapData(data);
        setSelected(null);
      };

      try {
        const latest = await getMap("Yishun");
        if (latest.blocks?.length) {
          applyData(latest, false);
          return;
        }

        const fallbackDates = [1, 2].map((daysAgo) => {
          const d = new Date();
          d.setDate(d.getDate() - daysAgo);
          return d.toISOString().slice(0, 10);
        });

        for (const dateKey of fallbackDates) {
          try {
            const data = await getMap("Yishun", dateKey);
            if (data.blocks?.length) {
              applyData(data, false);
              return;
            }
          } catch (e) {
            console.error(`Map fetch failed for ${dateKey}`, e);
            break;
          }
        }

        // No real data available — use static fallback blocks
        applyData({ district: "Yishun", blocks: FALLBACK_BLOCKS }, true);
      } catch (e) {
        console.error("Map fetch failed", e);
        // Network / server error — still show fallback blocks
        applyData({ district: "Yishun", blocks: FALLBACK_BLOCKS }, true);
      } finally {
        setLoading(false);
      }
    }

    loadMapData();
  }, []);

  return (
    <div className="px-4 py-6 space-y-4 page-enter">
      {/* Header */}
      <div>
        <p className="text-xs text-sp-text-secondary uppercase tracking-wide">Map View</p>
        <h1 className="text-xl font-bold text-sp-text mt-0.5">Your District's Standings</h1>
        <p className="text-xs text-sp-text-secondary">Tap a block to see its stats</p>
      </div>

      {!loading && usingFallback && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Showing estimated block data. Live data will appear once available.
        </div>
      )}

      {/* Map */}
      {loading ? (
        <div className="h-72 animate-pulse bg-sp-chart rounded-2xl" />
      ) : (
        <BlockMap
          blocks={mapData?.blocks ?? []}
          userPostalCode={userPostalCode}
          selectedPostalCode={selected?.postal_code}
          onBlockSelect={setSelected}
        />
      )}

      {/* Block list — sorted by rank */}
      <div className="space-y-2">
        {(mapData?.blocks ?? []).map((block) => {
          const isUser = block.postal_code === userPostalCode;
          const isSelected = selected?.postal_code === block.postal_code;

          return (
            <button
              key={block.postal_code}
              onClick={() => setSelected(block)}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-colors",
                isSelected
                  ? "bg-sp-chart border-sp-mint"
                  : "bg-white border-gray-100"
              )}
            >
              <span className={clsx(
                "w-7 h-7 rounded-full flex items-center justify-center font-bold",
                block.rank <= 3 ? "text-lg" : "text-xs",
                block.rank === 1 ? "bg-yellow-100 text-yellow-700" :
                block.rank === 2 ? "bg-gray-100 text-gray-600" :
                block.rank === 3 ? "bg-orange-100 text-orange-700" :
                "bg-gray-50 text-sp-text-secondary"
              )}>
                {block.rank === 1 ? "🥇" : block.rank === 2 ? "🥈" : block.rank === 3 ? "🥉" : "#" + block.rank}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-sp-text">
                  {block.postal_code} {isUser && <span className="text-[10px] text-sp-teal">(You)</span>}
                </p>
                <p className="text-xs text-sp-text-secondary">{block.avg_kwh.toFixed(2)} kWh/day</p>
              </div>
              <div className="text-right">
                <p className={clsx("text-sm font-bold", block.reduction_pct >= 0 ? "text-green-600" : "text-red-500")}>
                  {block.reduction_pct >= 0 ? "-" : "+"}{Math.abs(block.reduction_pct)}%
                </p>
                <p className="text-[10px] text-sp-text-secondary">vs district average</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
