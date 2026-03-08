"use client";

import { useState } from "react";

interface EditTargetBillModalProps {
  currentTarget: number | null;
  projectedBill: number;
  onClose: () => void;
  onSave: (newTarget: number) => Promise<void>;
}

export default function EditTargetBillModal({
  currentTarget,
  projectedBill,
  onClose,
  onSave,
}: EditTargetBillModalProps) {
  const [value, setValue] = useState<string>(
    currentTarget ? currentTarget.toFixed(2) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericValue = parseFloat(value);
  const isValid = !isNaN(numericValue) && numericValue > 0;

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(numericValue);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update target bill");
    } finally {
      setSaving(false);
    }
  }

  // Quick-set presets based on projected bill
  const presets = [
    { label: "−10%", value: Math.round(projectedBill * 0.9 * 100) / 100 },
    { label: "−20%", value: Math.round(projectedBill * 0.8 * 100) / 100 },
    { label: "−30%", value: Math.round(projectedBill * 0.7 * 100) / 100 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-base font-bold text-sp-text">Set Monthly Target Bill</h3>
            <p className="text-xs text-sp-text-secondary mt-0.5">
              Your projected bill is S${projectedBill.toFixed(2)}
            </p>
          </div>
          <button onClick={onClose} className="text-sp-text-secondary p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Input */}
        <div className="mb-4">
          <label className="text-xs font-medium text-sp-text-secondary block mb-1.5">
            Target monthly bill (SGD)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sp-text-secondary font-medium text-sm">
              S$
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 80.00"
              className="w-full border border-sp-chart rounded-2xl py-3 pl-10 pr-4 text-sp-text text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-sp-primary focus:border-transparent"
              autoFocus
            />
          </div>
        </div>

        {/* Quick-set presets */}
        <div className="mb-4">
          <p className="text-xs text-sp-text-secondary mb-2">Quick set (based on projected bill):</p>
          <div className="flex gap-2">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => setValue(p.value.toFixed(2))}
                className="flex-1 py-2 px-3 rounded-xl border border-sp-chart text-xs font-medium text-sp-text hover:bg-sp-chart/40 transition-colors"
              >
                {p.label}
                <span className="block text-sp-text-secondary text-[10px]">
                  S${p.value.toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Comparison hint */}
        {isValid && (
          <div className="mb-4 p-3 rounded-2xl bg-sp-bg text-xs text-sp-text-secondary">
            {numericValue >= projectedBill ? (
              <span>
                Your target is <span className="text-green-600 font-semibold">S${(numericValue - projectedBill).toFixed(2)} above</span> your projected bill — easily achievable! 🎉
              </span>
            ) : (
              <span>
                You&apos;ll need to reduce <span className="text-sp-alert font-semibold">S${(projectedBill - numericValue).toFixed(2)}</span> from your projected bill — about{" "}
                <span className="font-semibold">{((1 - numericValue / projectedBill) * 100).toFixed(0)}% reduction</span> needed.
              </span>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs text-red-500 mb-3">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border-2 border-sp-chart text-sm font-semibold text-sp-text hover:bg-sp-bg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            className="flex-1 py-3 rounded-2xl border-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 disabled:border-gray-300 bg-[#2DB7A3] text-white border-[#2DB7A3] hover:bg-[#259d8c] hover:border-[#259d8c]"
          >
            {saving ? "Saving…" : "Save Target"}
          </button>
        </div>
      </div>
    </div>
  );
}
