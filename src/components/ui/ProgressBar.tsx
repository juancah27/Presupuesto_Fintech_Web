import clsx from "clsx";

interface ProgressBarProps {
  value: number;
  color?: "default" | "warning" | "danger" | "success";
}

const bgClasses: Record<NonNullable<ProgressBarProps["color"]>, string> = {
  default: "bg-investment",
  success: "bg-income",
  warning: "bg-warning",
  danger: "bg-expense",
};

export const ProgressBar = ({ value, color = "default" }: ProgressBarProps) => (
  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
    <div
      className={clsx("h-full rounded-full transition-all duration-300", bgClasses[color])}
      style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
    />
  </div>
);
