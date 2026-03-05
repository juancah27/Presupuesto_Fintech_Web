import clsx from "clsx";

import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}

const tones: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  success: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
};

export const Badge = ({ children, tone = "neutral" }: BadgeProps) => (
  <span className={clsx("rounded-full px-2 py-1 text-xs font-medium", tones[tone])}>{children}</span>
);
