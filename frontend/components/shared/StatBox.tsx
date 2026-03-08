import clsx from "clsx";

interface StatBoxProps {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}

export default function StatBox({ label, value, sub, highlight }: StatBoxProps) {
  return (
    <div className={clsx(
      "rounded-2xl p-3 border",
      highlight ? "bg-sp-chart border-sp-mint" : "bg-white border-gray-100"
    )}>
      <p className="text-[10px] font-medium text-sp-text-secondary uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-sp-text mt-0.5">{value}</p>
      <p className="text-[10px] text-sp-text-secondary">{sub}</p>
    </div>
  );
}
