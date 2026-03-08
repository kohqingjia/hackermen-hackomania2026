"use client";

import { useEffect, useRef } from "react";
import type { BlockMapEntry } from "@/lib/types";
import { blockLabel } from "@/lib/blockNames";

const BLOCK_COORDS: Record<string, [number, number]> = {
  "752339": [1.4295, 103.8337],
  "752341": [1.4312, 103.8352],
  "750341": [1.4280, 103.8368],
  "751339": [1.4265, 103.8355],
  "750331": [1.4300, 103.8320],
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
  const isTopThree = block.rank <= 3;
  const iconFontSize = isTopThree ? 18 : 13;
  const centerIcon = block.rank === 1 ? "🥇" : block.rank === 2 ? "🥈" : block.rank === 3 ? "🥉" : "🏠";
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
        <span style="transform:rotate(45deg);font-size:${iconFontSize}px;line-height:1;display:block;">${centerIcon}</span>
      </div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -(size + 4)],
  });
}

interface Props {
  blocks: BlockMapEntry[];
  userPostalCode?: string;
  selectedPostalCode?: string;
  onBlockSelect?: (block: BlockMapEntry) => void;
}

export default function OneMapLeaflet({ blocks, userPostalCode, selectedPostalCode, onBlockSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});

  useEffect(() => {
    if (!containerRef.current) return;
    // Guard against React Strict Mode double-invocation
    if ((containerRef.current as any)._leaflet_id) return;

    import("leaflet").then((L) => {
      if (!containerRef.current) return;
      if ((containerRef.current as any)._leaflet_id) return;

      const preferredBlock = blocks.find((b) => b.postal_code === userPostalCode) || blocks[0];
      const mapCenter: [number, number] = preferredBlock
        ? [Number(preferredBlock.lat), Number(preferredBlock.lng)]
        : [1.4285, 103.8348];

      const map = L.map(containerRef.current, {
        center: mapCenter,
        zoom: 17,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | OneMap &copy; SLA',
      }).addTo(map);

      blocks.forEach((block) => {
        const coords = Number.isFinite(Number(block.lat)) && Number.isFinite(Number(block.lng))
          ? [Number(block.lat), Number(block.lng)] as [number, number]
          : BLOCK_COORDS[block.postal_code];
        if (!coords) return;
        const isUser = block.postal_code === userPostalCode;

        const marker = L.marker(coords, {
          icon: createPinIcon(L, block, isUser),
        }).addTo(map);
        markersRef.current[block.postal_code] = marker;
        const deltaSign = block.reduction_pct >= 0 ? "-" : "+";
        const deltaValue = Math.abs(block.reduction_pct).toFixed(1);

        marker.bindPopup(
          `
          <div style="min-width:120px;font-family:sans-serif;line-height:1.6">
            <p style="font-weight:700;margin:0 0 2px">Blk ${blockLabel(block.postal_code)}${isUser ? " 📍 You" : ""}</p>
            <p style="color:${block.reduction_pct >= 0 ? "#16a34a" : "#ef4444"};font-weight:600;margin:0 0 1px">${deltaSign}${deltaValue}% vs avg</p>
            <p style="color:#6b7280;font-size:11px;margin:0">${block.avg_kwh.toFixed(2)} kWh/day · Rank #${block.rank}</p>
          </div>
        `,
          { autoPan: false }
        );

        if (onBlockSelect) {
          marker.on("click", () => onBlockSelect(block));
        }
      });

      mapRef.current = map;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !selectedPostalCode) return;
    const marker = markersRef.current[selectedPostalCode];
    if (!marker) return;

    const ll = marker.getLatLng();
    mapRef.current.setView(ll, Math.max(mapRef.current.getZoom(), 16), { animate: true });
    marker.openPopup();
  }, [selectedPostalCode]);

  return (
    <div
      ref={containerRef}
      className="rounded-2xl overflow-hidden border border-sp-mint"
      style={{ height: 320 }}
    />
  );
}
