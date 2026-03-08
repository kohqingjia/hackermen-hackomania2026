"use client";

import { useEffect, useState } from "react";
import Card, { SectionHeader } from "@/components/shared/Card";
import StatBox from "@/components/shared/StatBox";
import { getProjections, updateTargetBill } from "@/lib/api";
import EditTargetBillModal from "@/components/insights/EditTargetBillModal";
import type { ProjectionsResponse } from "@/lib/types";
import clsx from "clsx";

export default function ProjectionsCard({ userId }: { userId: string }) {
  const [data, setData] = useState<ProjectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchData = () => {
    setLoading(true);
    getProjections()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  async function handleSaveTarget(newTarget: number) {
    await updateTargetBill(newTarget);
    
    // Optimistically update local state immediately (ClickHouse mutations are async)
    if (data) {
      setData({
        ...data,
        target_bill_sgd: newTarget,
      });
    }
    
    // Fetch fresh data after a delay to ensure mutation has applied
    setTimeout(() => {
      fetchData();
    }, 500);
  }

  if (loading) {
    return (
      <Card className="animate-pulse">
        <div className="h-4 bg-sp-chart rounded w-1/3 mb-3" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-sp-chart rounded-2xl" />
          ))}
        </div>
      </Card>
    );
  }

  if (!data) return null;

  const hasTarget = data.target_bill_sgd !== undefined && data.target_bill_sgd > 0;
  const isOnTrack = hasTarget && data.projected_bill_sgd <= data.target_bill_sgd!;
  const savingsAmount = hasTarget ? (data.target_bill_sgd! - data.projected_bill_sgd) : 0;
  const progressPct = hasTarget ? Math.min((data.projected_bill_sgd / data.target_bill_sgd!) * 100, 100) : 0;

  return (
    <div className="space-y-3">
      <SectionHeader title="Projections" subtitle={`${data.days_remaining} days left this month`} />

      {/* Bill target card — click to edit */}
      {hasTarget ? (
        <button onClick={() => setShowModal(true)} className="w-full text-left">
          <Card className={clsx(
            "border-2 transition-shadow hover:shadow-md active:scale-[0.99]",
            isOnTrack ? "bg-green-50 border-green-100" : "bg-sp-alert-light border-amber-200"
          )}>
            <div className="flex items-start gap-3 mb-3">
              <div className={clsx(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                isOnTrack ? "bg-green-100" : "bg-amber-100"
              )}>
                <span className="text-lg">{isOnTrack ? "✓" : "⚠"}</span>
              </div>
              <div className="flex-1">
                <p className={clsx("text-sm font-semibold", isOnTrack ? "text-green-700" : "text-sp-alert")}>
                  {isOnTrack
                    ? `On track! S$${savingsAmount.toFixed(2)} under target`
                    : `S$${Math.abs(savingsAmount).toFixed(2)} over target`}
                </p>
                <p className="text-xs text-sp-text-secondary mt-0.5">
                  Projected: S${data.projected_bill_sgd.toFixed(2)} · Target: S${data.target_bill_sgd!.toFixed(2)}
                </p>
              </div>
              {/* Edit icon */}
              <svg className="w-4 h-4 text-sp-text-secondary flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
              </svg>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-white rounded-full h-2.5 overflow-hidden">
              <div
                className={clsx(
                  "h-full rounded-full transition-all",
                  isOnTrack ? "bg-green-500" : "bg-sp-alert"
                )}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[10px] text-sp-text-secondary mt-1.5 text-center">Tap to edit target</p>
          </Card>
        </button>
      ) : (
        /* No target set — show CTA to set one */
        <button onClick={() => setShowModal(true)} className="w-full text-left">
          <Card className="border-2 border-dashed border-sp-chart hover:border-sp-primary hover:shadow-md transition-all active:scale-[0.99]">
            <div className="flex items-center gap-3 py-1">
              <div className="w-8 h-8 rounded-full bg-sp-chart flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-sp-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-sp-text">Set a monthly target bill</p>
                <p className="text-xs text-sp-text-secondary">Track your spending goal and get personalised tips</p>
              </div>
            </div>
          </Card>
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatBox
          label="Projected bill"
          value={`S$${data.projected_bill_sgd.toFixed(2)}`}
          sub="this month"
          highlight
        />
        <StatBox
          label="Avg daily usage"
          value={`${data.projected_avg_daily_kwh.toFixed(2)} kWh`}
          sub="per day"
        />
        <StatBox
          label="Projected total"
          value={`${data.projected_total_kwh.toFixed(1)} kWh`}
          sub="this month"
        />
        {hasTarget && (
          <button onClick={() => setShowModal(true)} className="text-left">
            <StatBox
              label="Target bill"
              value={`S$${data.target_bill_sgd!.toFixed(2)}`}
              sub="tap to edit"
            />
          </button>
        )}
      </div>

      {/* Edit Target Bill Modal */}
      {showModal && (
        <EditTargetBillModal
          currentTarget={hasTarget ? data.target_bill_sgd! : null}
          projectedBill={data.projected_bill_sgd}
          onClose={() => setShowModal(false)}
          onSave={handleSaveTarget}
        />
      )}
    </div>
  );
}
