import clsx from "clsx";
import { Card } from "./Card";

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "income" | "expense" | "investment" | "warning";
}

const toneClasses: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "text-slate-800 dark:text-slate-100",
  income: "text-income",
  expense: "text-expense",
  investment: "text-investment",
  warning: "text-warning",
};

export const KpiCard = ({ label, value, hint, tone = "default" }: KpiCardProps) => (
  <Card className="min-h-[110px]">
    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
    <p className={clsx("mt-2 text-2xl font-bold", toneClasses[tone])}>{value}</p>
    {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
  </Card>
);
