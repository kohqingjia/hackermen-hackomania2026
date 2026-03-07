"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitOnboarding } from "@/lib/api";
import type { OnboardingForm as FormData } from "@/lib/types";

const AGE_GROUPS = ["18-30", "31-45", "46-60", "60+"];
const HOUSEHOLD_TYPES = ["1-room", "2-room", "3-room", "4-room", "5-room", "Executive"];
const BLOCKS = ["BLK402", "BLK403", "BLK404", "BLK405", "BLK406"];
const TARGETS = [5, 10, 15, 20];

export default function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormData>({
    age_group: "",
    household_type: "",
    num_tenants: undefined,
    work_from_home: false,
    energy_saving_target: 10,
    block_id: "BLK404",
    district: "Yishun",
  });

  const update = (key: keyof FormData, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit() {
    setLoading(true);
    try {
      //const res = await submitOnboarding(form);
      localStorage.setItem("powerblock_user_id", "123");
      localStorage.setItem("powerblock_block_id", "456");
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

    // Step 1 — Age group
    <StepWrapper key="age" title="How old are you?" subtitle="Helps us personalise your tips">
      <div className="grid grid-cols-2 gap-3">
        {AGE_GROUPS.map((g) => (
          <SelectButton
            key={g}
            label={g}
            selected={form.age_group === g}
            onClick={() => update("age_group", g)}
          />
        ))}
      </div>
    </StepWrapper>,

    // Step 2 — Household type
    <StepWrapper key="flat" title="What type of flat?" subtitle="We'll estimate typical appliance loads">
      <div className="grid grid-cols-2 gap-3">
        {HOUSEHOLD_TYPES.map((t) => (
          <SelectButton
            key={t}
            label={t}
            selected={form.household_type === t}
            onClick={() => update("household_type", t)}
          />
        ))}
      </div>
    </StepWrapper>,

    // Step 3 — Work from home + tenants
    <StepWrapper key="wfh" title="A bit more about your household">
      <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer">
        <input
          type="checkbox"
          checked={form.work_from_home}
          onChange={(e) => update("work_from_home", e.target.checked)}
          className="w-5 h-5 accent-sp-teal"
        />
        <span className="text-sp-text text-sm font-medium">I work from home</span>
      </label>
      <div className="mt-4">
        <label className="text-sm text-sp-text-secondary mb-1 block">Number of household members (optional)</label>
        <input
          type="number"
          min={1}
          max={10}
          placeholder="e.g. 4"
          value={form.num_tenants ?? ""}
          onChange={(e) => update("num_tenants", e.target.value ? parseInt(e.target.value) : undefined)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sp-text text-sm focus:outline-none focus:border-sp-teal"
        />
      </div>
    </StepWrapper>,

    // Step 4 — Block + target
    <StepWrapper key="target" title="Set your energy goal" subtitle="Track progress against your target">
      <div className="mb-4">
        <label className="text-sm text-sp-text-secondary mb-1 block">Your HDB Block</label>
        <select
          value={form.block_id}
          onChange={(e) => update("block_id", e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sp-text text-sm focus:outline-none focus:border-sp-teal bg-white"
        >
          {BLOCKS.map((b) => <option key={b} value={b}>{b} Yishun</option>)}
        </select>
      </div>
      <label className="text-sm text-sp-text-secondary mb-2 block">Reduce electricity bill by:</label>
      <div className="grid grid-cols-4 gap-2">
        {TARGETS.map((t) => (
          <SelectButton
            key={t}
            label={`${t}%`}
            selected={form.energy_saving_target === t}
            onClick={() => update("energy_saving_target", t)}
          />
        ))}
      </div>
    </StepWrapper>,
  ];

  const isLastStep = step === steps.length - 1;
  const canProceed =
    step === 0 ||
    (step === 1 && form.age_group) ||
    (step === 2 && form.household_type) ||
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
