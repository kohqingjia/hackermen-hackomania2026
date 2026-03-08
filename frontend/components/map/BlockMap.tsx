"use client";

import dynamic from "next/dynamic";
import type { BlockMapEntry } from "@/lib/types";

// Leaflet requires the browser window — must disable SSR
const OneMapLeaflet = dynamic(() => import("./OneMapLeaflet"), {
  ssr: false,
  loading: () => (
    <div className="h-80 animate-pulse bg-sp-chart rounded-2xl border border-sp-mint" />
  ),
});

interface BlockMapProps {
  blocks: BlockMapEntry[];
  userPostalCode?: string;
  selectedPostalCode?: string;
  onBlockSelect?: (block: BlockMapEntry) => void;
}

export default function BlockMap({ blocks, userPostalCode, selectedPostalCode, onBlockSelect }: BlockMapProps) {
  return (
    <OneMapLeaflet
      blocks={blocks}
      userPostalCode={userPostalCode}
      selectedPostalCode={selectedPostalCode}
      onBlockSelect={onBlockSelect}
    />
  );
}
