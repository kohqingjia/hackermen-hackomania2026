"use client";

import { useEffect, useState } from "react";
import Card from "@/components/shared/Card";
import { getAnomaly } from "@/lib/api";
import type { AnomalyResponse } from "@/lib/types";

export default function AnomalyCard({ userId }: { userId: string }) {
  const [data, setData] = useState<AnomalyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnomaly(userId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <div className="h-4 bg-sp-chart rounded w-1/3 mb-3" />
        <div className="space-y-2">
          <div className="h-3 bg-sp-chart rounded" />
          <div className="h-3 bg-sp-chart rounded w-4/5" />
        </div>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
          data.has_anomaly ? "bg-red-50" : "bg-green-50"
        }`}>
          {data.has_anomaly ? (
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-sp-teal">Anomaly Detection</p>
            {data.has_anomaly ? (
              <span className="text-[10px] font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100">
                Warning
              </span>
            ) : (
              <span className="text-[10px] font-semibold bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100">
                All clear
              </span>
            )}
          </div>
          <p className="text-sm text-sp-text leading-relaxed">{data.analysis}</p>
        </div>
      </div>
    </Card>
  );
}
