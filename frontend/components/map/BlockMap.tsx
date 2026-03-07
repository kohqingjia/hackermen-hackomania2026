"use client";

import clsx from "clsx";
import type { BlockMapEntry } from "@/lib/types";

interface BlockMapProps {
  blocks: BlockMapEntry[];
  userPostalCode?: string;
}

// Colour-code blocks by reduction %
function getBlockColor(pct: number): string {
  if (pct >= 10) return "bg-sp-teal text-white";
  if (pct >= 5)  return "bg-sp-mint text-sp-text";
  if (pct >= 0)  return "bg-sp-chart text-sp-text";
  return "bg-red-100 text-red-700";
}

function getReductionLabel(pct: number): string {
  if (pct >= 10) return "Excellent";
  if (pct >= 5)  return "Good";
  if (pct >= 0)  return "Average";
  return "Above avg";
}

// Simple fixed-position grid layout for demo (no real map library needed)
const POSITIONS: Record<string, { top: string; left: string }> = {
  "752339": { top: "55%", left: "15%" },
  "752341": { top: "30%", left: "35%" },
  "750341": { top: "45%", left: "58%" },
  "751339": { top: "65%", left: "72%" },
  "750331": { top: "20%", left: "72%" },
};

export default function BlockMap({ blocks, userPostalCode }: BlockMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-[#E8F4F1] border border-sp-mint" style={{ height: 280 }}>
      {/* Map grid background */}
      <div className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "linear-gradient(#2DB7A3 1px, transparent 1px), linear-gradient(90deg, #2DB7A3 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* District label */}
      <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-sm rounded-lg px-2 py-1">
        <p className="text-xs font-semibold text-sp-text">Yishun</p>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-xl p-2 space-y-1">
        {[
          { label: "≥10% reduction", color: "bg-sp-teal" },
          { label: "5–10%", color: "bg-sp-mint" },
          { label: "0–5%", color: "bg-sp-chart border border-sp-mint" },
          { label: "Above avg", color: "bg-red-100" },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={clsx("w-3 h-3 rounded-sm", color)} />
            <span className="text-[9px] text-sp-text-secondary">{label}</span>
          </div>
        ))}
      </div>

      {/* Block pins */}
      {blocks.map((block) => {
        const pos = POSITIONS[block.postal_code] || { top: "50%", left: "50%" };
        const isUser = block.postal_code === userPostalCode;
        const isHovered = hovered === block.postal_code;

        return (
          <div
            key={block.postal_code}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
            style={{ top: pos.top, left: pos.left }}
            onMouseEnter={() => setHovered(block.postal_code)}
            onMouseLeave={() => setHovered(null)}
            onTouchStart={() => setHovered(block.postal_code)}
          >
            {/* Tooltip */}
            {isHovered && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-xl shadow-lg p-2 min-w-[110px] z-10 pointer-events-none">
                <p className="text-xs font-bold text-sp-text">Blk {block.postal_code}</p>
                <p className="text-xs text-green-600 font-medium">-{block.reduction_pct}% {getReductionLabel(block.reduction_pct)}</p>
                <p className="text-[10px] text-sp-text-secondary">{block.avg_kwh.toFixed(2)} kWh/day avg</p>
                <p className="text-[10px] text-sp-text-secondary">Rank #{block.rank}</p>
              </div>
            )}

            {/* Block bubble */}
            <div className={clsx(
              "rounded-2xl px-3 py-2 shadow-sm border-2 transition-transform",
              getBlockColor(block.reduction_pct),
              isUser ? "border-white scale-110 shadow-md" : "border-transparent",
              isHovered && "scale-110"
            )}>
              <p className="text-[10px] font-bold leading-tight">Blk {block.postal_code}</p>
              <p className="text-[9px] font-medium opacity-80">-{block.reduction_pct}%</p>
            </div>

            {/* User indicator */}
            {isUser && (
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-sp-alert border-2 border-white" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Need useState for hover — must import at top
import { useState } from "react";
