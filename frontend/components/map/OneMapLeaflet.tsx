"use client";

import { useEffect, useRef } from "react";
import type { BlockMapEntry } from "@/lib/types";

const BLOCK_COORDS: Record<string, [number, number]> = {
  BLK402: [1.4295, 103.8337],
  BLK403: [1.4312, 103.8352],
  BLK404: [1.4280, 103.8368],
  BLK405: [1.4265, 103.8355],
  BLK406: [1.4300, 103.8320],
};

function markerFill(pct: number): string {
  if (pct >= 10) return "#2DB7A3";
  if (pct >= 5)  return "#9DE1D3";
  if (pct >= 0)  return "#BFECE4";
  return "#FCA5A5";
}

function createPinIcon(L: any, block: BlockMapEntry, isUser: boolean) {
  const bg = markerFill(block.reduction_pct);
  const border = isUser ? "#F59E0B" : "#2DB7A3";
  const size = 28;
  return L.divIcon({
    html: `
      <div style="
        width:${size}px;height:${size}px;
        background:${bg};
        border:2.5px solid ${border};
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 2px 6px rgba(0,0,0,0.25);
        display:flex;align-items:center;justify-content:center;
      ">
        <span style="transform:rotate(45deg);font-size:13px;line-height:1;display:block;">🏠</span>
      </div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -(size + 4)],
  });
}

interface Props {
  blocks: BlockMapEntry[];
  userBlockId?: string;
  onBlockSelect?: (block: BlockMapEntry) => void;
}

export default function OneMapLeaflet({ blocks, userBlockId, onBlockSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    // Guard against React Strict Mode double-invocation
    if ((containerRef.current as any)._leaflet_id) return;

    import("leaflet").then((L) => {
      if (!containerRef.current) return;
      if ((containerRef.current as any)._leaflet_id) return;

      const map = L.map(containerRef.current, {
        center: [1.4285, 103.8348],
        zoom: 16,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | OneMap &copy; SLA',
      }).addTo(map);

      blocks.forEach((block) => {
        const coords = BLOCK_COORDS[block.block_id];
        if (!coords) return;
        const isUser = block.block_id === userBlockId;

        const marker = L.marker(coords, {
          icon: createPinIcon(L, block, isUser),
        }).addTo(map);

        marker.bindPopup(`
          <div style="min-width:120px;font-family:sans-serif;line-height:1.6">
            <p style="font-weight:700;margin:0 0 2px">${block.block_id}${isUser ? " 📍 You" : ""}</p>
            <p style="color:#16a34a;font-weight:600;margin:0 0 1px">-${block.reduction_pct}% vs avg</p>
            <p style="color:#6b7280;font-size:11px;margin:0">${block.avg_kwh.toFixed(2)} kWh/day · Rank #${block.rank}</p>
          </div>
        `);

        if (onBlockSelect) {
          marker.on("click", () => onBlockSelect(block));
        }
      });

      mapRef.current = map;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="rounded-2xl overflow-hidden border border-sp-mint"
      style={{ height: 320 }}
    />
  );
}
