import clsx from "clsx";
import { Card } from "./Card";

export type KpiSignalLevel = "red" | "yellow" | "green" | "blue";

export interface KpiSignal {
  level: KpiSignalLevel;
  message: string;
  tooltip: string;
}

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "income" | "expense" | "investment" | "warning";
  signal?: KpiSignal;
}

const toneClasses: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "text-slate-800 dark:text-slate-100",
  income: "text-income",
  expense: "text-expense",
  investment: "text-investment",
  warning: "text-warning",
};

const signalColor: Record<KpiSignalLevel, string> = {
  red: "text-expense",
  yellow: "text-warning",
  green: "text-income",
  blue: "text-investment",
};

const signalCardStyle: Record<KpiSignalLevel, string> = {
  red: "border-l-4 border-l-expense bg-gradient-to-r from-expense/10 to-transparent",
  yellow: "border-l-4 border-l-warning bg-gradient-to-r from-warning/10 to-transparent",
  green: "border-l-4 border-l-income bg-gradient-to-r from-income/10 to-transparent",
  blue: "border-l-4 border-l-investment bg-gradient-to-r from-investment/10 to-transparent",
};

const SignalIcon = ({ level }: { level: KpiSignalLevel }) => {
  if (level === "red") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="m9 9 6 6M15 9l-6 6" />
      </svg>
    );
  }
  if (level === "yellow") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" aria-hidden="true">
        <path d="M12 3 2.8 19h18.4L12 3Z" />
        <path d="M12 9v4m0 3h.01" />
      </svg>
    );
  }
  if (level === "green") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" aria-hidden="true">
      <path d="M3 17V7m0 10h10" />
      <path d="m8 12 3-3 3 2 6-6" />
      <path d="M20 5h-4v4" />
    </svg>
  );
};

export const KpiCard = ({ label, value, hint, tone = "default", signal }: KpiCardProps) => (
  <Card className={clsx("group relative min-h-[130px] overflow-visible", signal ? signalCardStyle[signal.level] : "")}>
    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
    {signal ? (
      <div className={clsx("absolute right-3 top-3", signalColor[signal.level])}>
        <SignalIcon level={signal.level} />
      </div>
    ) : null}
    <p className={clsx("mt-2 text-2xl font-bold", toneClasses[tone])}>{value}</p>
    {signal ? <p className={clsx("mt-1 text-xs font-medium", signalColor[signal.level])}>{signal.message}</p> : null}
    {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    {signal?.tooltip ? (
      <div className="pointer-events-none absolute -bottom-2 left-3 right-3 z-20 translate-y-full rounded-lg border border-slate-300 bg-white/95 p-2 text-xs text-slate-700 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 dark:border-white/15 dark:bg-slate-900/95 dark:text-slate-200">
        {signal.tooltip}
      </div>
    ) : null}
  </Card>
);
