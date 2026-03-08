import clsx from "clsx";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "bg-white rounded-2xl shadow-sm border border-gray-100 p-4",
        onClick && "cursor-pointer active:scale-[0.98] transition-transform",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-semibold text-sp-text">{title}</h2>
      {subtitle && <p className="text-xs text-sp-text-secondary mt-0.5">{subtitle}</p>}
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
      <div className="h-24 bg-gray-100 rounded" />
    </div>
  );
}
