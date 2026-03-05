import clsx from "clsx";

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => (
  <div className={clsx("animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-700/60", className)} />
);
