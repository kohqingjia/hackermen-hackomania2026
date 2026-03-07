"use client";

/**
 * Map View
 * Shows: colour-coded block bubbles on a stylised map
 * Hover/tap a block to see its usage stats
 * Data: /api/map/{district}
 */

import { useEffect, useState } from "react";
import Card, { LoadingCard } from "@/components/shared/Card";
import BlockMap from "@/components/map/BlockMap";
import { getMap } from "@/lib/api";
import type { MapResponse, BlockMapEntry } from "@/lib/types";
import clsx from "clsx";

export default function MapPage() {
  const [userBlockId, setUserBlockId] = useState("BLK404");
  const [mapData, setMapData] = useState<MapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BlockMapEntry | null>(null);

  useEffect(() => {
    const bid = localStorage.getItem("powerblock_block_id") || "BLK404";
    setUserBlockId(bid);

    getMap("Yishun")
      .then((data) => {
        setMapData(data);
        setSelected(data.blocks.find((b) => b.block_id === bid) || data.blocks[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 py-6 space-y-4 page-enter">
      {/* Header */}
      <div>
        <p className="text-xs text-sp-text-secondary uppercase tracking-wide">Map View</p>
        <h1 className="text-xl font-bold text-sp-text mt-0.5">Yishun Energy Challenge</h1>
        <p className="text-xs text-sp-text-secondary">Tap a block to see its stats</p>
      </div>

      {/* Map */}
      {loading ? (
        <div className="h-72 animate-pulse bg-sp-chart rounded-2xl" />
      ) : mapData ? (
        <BlockMap
          blocks={mapData.blocks}
          userBlockId={userBlockId}
          onBlockSelect={setSelected}
        />
      ) : null}

      {/* Block list — sorted by rank */}
      <div className="space-y-2">
        {(mapData?.blocks ?? []).map((block) => {
          const isUser = block.block_id === userBlockId;
          const isSelected = selected?.block_id === block.block_id;

          return (
            <button
              key={block.block_id}
              onClick={() => setSelected(block)}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-colors",
                isSelected
                  ? "bg-sp-chart border-sp-mint"
                  : "bg-white border-gray-100"
              )}
            >
              <span className={clsx(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                block.rank === 1 ? "bg-yellow-100 text-yellow-700" :
                block.rank === 2 ? "bg-gray-100 text-gray-600" :
                block.rank === 3 ? "bg-orange-100 text-orange-700" :
                "bg-gray-50 text-sp-text-secondary"
              )}>
                {block.rank}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-sp-text">
                  {block.block_id} {isUser && <span className="text-[10px] text-sp-teal">(You)</span>}
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
