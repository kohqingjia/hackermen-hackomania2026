"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getOnboarding, submitOnboarding, getRoadNames } from "@/lib/api";
import type { OnboardingForm as FormData } from "@/lib/types";

const FLAT_TYPES = ["3-room", "4-room", "5-room"];
const POSTAL_CODES = ["752339", "752341", "750341", "751339", "750331"];
const AIRCON_LEVELS: { value: number; label: string }[] = [
  { value: 0, label: "Never" },
  { value: 1, label: "Sometimes" },
  { value: 2, label: "Every night" },
  { value: 3, label: "Whole day" },
];
const WFH_OPTIONS = [0, 1, 2, 3, 4, 5];

export default function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [roadNames, setRoadNames] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormData>({
    household_id: "",
    district: "Sembawang",
    postal_code: "752339",
    flat_type: "",
    num_residents: 1,
    aircon_usage: 1,
    num_wfh: 0,
    target_bill: undefined,
  });

  useEffect(() => {
    getOnboarding()
      .then((profile) => {
        const backendUserId =
          String(profile.UserID ?? profile.user_id ?? "").trim();
        const backendPostalCode =
          String(profile.Postal_Code ?? profile.postal_code ?? "").trim();

        if (backendUserId) {
          localStorage.setItem("powerblock_user_id", backendUserId);
        }
        if (backendPostalCode) {
          localStorage.setItem("powerblock_postal_code", backendPostalCode);
          setForm((prev) => ({ ...prev, postal_code: backendPostalCode }));
        }
      })
      .catch(() => {
        // No preconfigured backend profile found; continue normal onboarding flow.
      });

    getRoadNames(POSTAL_CODES)
      .then(setRoadNames)
      .catch(() => {});
  }, []);

  const update = (key: keyof FormData, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit() {
    setLoading(true);
    try {
      // Auto-generate household_id from postal code
      const idx = Math.floor(Math.random() * 10);
      const dataToSend = {
        ...form,
        household_id: form.household_id || `${form.postal_code}-HH${String(idx).padStart(2, "0")}`,
      };
      const res = await submitOnboarding(dataToSend);
      localStorage.setItem("powerblock_user_id", res.user_id);
      localStorage.setItem("powerblock_postal_code", form.postal_code);
      if (form.target_bill != null) {
        localStorage.setItem("powerblock_target_bill", String(form.target_bill));
      }
      router.push("/dashboard");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const steps = [
    // Step 0 — Welcome
    <div key="welcome" className="flex flex-col items-center text-center gap-4 pt-8">
      <div className="w-20 h-20 rounded-full bg-sp-chart flex items-center justify-center">
        <svg className="w-10 h-10 stroke-sp-teal" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-sp-text">PowerBlock</h1>
      <p className="text-sp-text-secondary text-sm max-w-xs">
        Join your HDB block in the community energy challenge. Reduce usage, earn points, save money.
      </p>
      <button onClick={() => setStep(1)} className="mt-4 w-full bg-sp-teal text-white font-semibold py-3 rounded-xl">
        Get Started
      </button>
    </div>,

    // Step 1 — Flat type
    <StepWrapper key="flat" title="What type of flat?" subtitle="We'll estimate typical appliance loads">
      <div className="grid grid-cols-3 gap-3">
        {FLAT_TYPES.map((t) => (
          <SelectButton
            key={t}
            label={t}
            selected={form.flat_type === t}
            onClick={() => update("flat_type", t)}
          />
        ))}
      </div>
    </StepWrapper>,

    // Step 2 — Household members + postal code
    <StepWrapper key="household" title="About your household">
      <div className="space-y-4">
        <div>
          <label className="text-sm text-sp-text-secondary mb-1 block">Your HDB Block (Postal Code)</label>
          <select
            value={form.postal_code}
            onChange={(e) => update("postal_code", e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sp-text text-sm focus:outline-none focus:border-sp-teal bg-white"
          >
            {POSTAL_CODES.map((pc) => <option key={pc} value={pc}>{pc} {roadNames[pc] || ""}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm text-sp-text-secondary mb-1 block">Number of residents</label>
          <input
            type="number"
            min={1}
            max={10}
            value={form.num_residents}
            onChange={(e) => update("num_residents", parseInt(e.target.value) || 1)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sp-text text-sm focus:outline-none focus:border-sp-teal"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-sp-text-secondary mb-1 block">Children</label>
            <input
              type="number"
              min={0}
              max={10}
              value={form.num_children ?? 0}
              onChange={(e) => update("num_children", parseInt(e.target.value) || 0)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sp-text text-sm focus:outline-none focus:border-sp-teal"
            />
          </div>
          <div>
            <label className="text-sm text-sp-text-secondary mb-1 block">Elderly</label>
            <input
              type="number"
              min={0}
              max={10}
              value={form.num_elderly ?? 0}
              onChange={(e) => update("num_elderly", parseInt(e.target.value) || 0)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sp-text text-sm focus:outline-none focus:border-sp-teal"
            />
          </div>
        </div>
      </div>
    </StepWrapper>,

    // Step 3 — Aircon + WFH
    <StepWrapper key="aircon" title="Energy habits" subtitle="Helps us give better recommendations">
      <div className="space-y-4">
        <div>
          <label className="text-sm text-sp-text-secondary mb-2 block">Aircon usage</label>
          <div className="grid grid-cols-2 gap-3">
            {AIRCON_LEVELS.map(({ value, label }) => (
              <SelectButton
                key={value}
                label={label}
                selected={form.aircon_usage === value}
                onClick={() => update("aircon_usage", value)}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm text-sp-text-secondary mb-2 block">How many days per week do you work from home?</label>
          <div className="grid grid-cols-6 gap-2">
            {WFH_OPTIONS.map((n) => (
              <SelectButton
                key={n}
                label={String(n)}
                selected={form.num_wfh === n}
                onClick={() => update("num_wfh", n)}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm text-sp-text-secondary mb-1 block">Number of aircons (optional)</label>
          <input
            type="number"
            min={0}
            max={10}
            value={form.num_aircons ?? 1}
            onChange={(e) => update("num_aircons", parseInt(e.target.value) || 0)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sp-text text-sm focus:outline-none focus:border-sp-teal"
          />
        </div>
      </div>
    </StepWrapper>,

    // Step 4 — Target bill
    <StepWrapper key="target" title="Set your target bill" subtitle="We'll help you stay on track each month">
      <div className="space-y-4">
        <div>
          <label className="text-sm text-sp-text-secondary mb-2 block">Monthly electricity bill target ($)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sp-text-secondary text-sm font-medium">$</span>
            <input
              type="number"
              min={0}
              step={1}
              placeholder="e.g. 80"
              value={form.target_bill ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                update("target_bill", v === "" ? undefined : parseInt(v) || 0);
              }}
              className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sp-text text-sm focus:outline-none focus:border-sp-teal"
            />
          </div>
          <p className="text-xs text-sp-text-secondary mt-2">Leave blank to skip — you can always set this later.</p>
        </div>

        {form.target_bill != null && form.target_bill > 0 && (
          <div className="bg-sp-chart/40 rounded-xl p-4 text-center">
            <p className="text-sp-teal font-semibold text-lg">${form.target_bill}/mo</p>
            <p className="text-xs text-sp-text-secondary mt-1">We'll notify you when you're approaching this limit</p>
          </div>
        )}
      </div>
    </StepWrapper>,
  ];

  const isLastStep = step === steps.length - 1;
  const canProceed =
    step === 0 ||
    (step === 1 && form.flat_type) ||
    step === 2 ||
    step === 3 ||
    step === 4;

  return (
    <div className="px-5 py-6 page-enter">
      {/* Progress bar */}
      {step > 0 && (
        <div className="mb-6">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-sp-teal rounded-full transition-all duration-300"
              style={{ width: `${((step) / (steps.length - 1)) * 100}%` }}
            />
          </div>
          <p className="text-xs text-sp-text-secondary mt-1">{step} of {steps.length - 1}</p>
        </div>
      )}

      {steps[step]}

      {step > 0 && (
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setStep((s) => s - 1)}
            className="flex-1 border border-gray-200 text-sp-text-secondary font-medium py-3 rounded-xl"
          >
            Back
          </button>
          {isLastStep ? (
            <button
              onClick={handleSubmit}
              disabled={loading || !canProceed}
              className="flex-1 bg-sp-teal text-white font-semibold py-3 rounded-xl disabled:opacity-50"
            >
              {loading ? "Saving..." : "Let's Go!"}
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed}
              className="flex-1 bg-sp-teal text-white font-semibold py-3 rounded-xl disabled:opacity-50"
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StepWrapper({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-sp-text mb-1">{title}</h2>
      {subtitle && <p className="text-sm text-sp-text-secondary mb-5">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function SelectButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`py-3 rounded-xl text-sm font-medium border transition-colors ${
        selected
          ? "bg-sp-teal text-white border-sp-teal"
          : "bg-white text-sp-text border-gray-200 hover:border-sp-mint"
      }`}
    >
      {label}
    </button>
  );
}
