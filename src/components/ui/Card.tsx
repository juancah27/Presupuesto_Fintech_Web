import { PropsWithChildren } from "react";
import clsx from "clsx";

interface CardProps extends PropsWithChildren {
  className?: string;
  title?: string;
  subtitle?: string;
}

export const Card = ({ className, children, title, subtitle }: CardProps) => (
  <section
    className={clsx(
      "rounded-2xl border border-white/10 bg-white/5 p-4 shadow-glass backdrop-blur-md animate-fade-in",
      "dark:border-white/10 dark:bg-white/5",
      "border-slate-200 bg-white",
      className,
    )}
  >
    {(title || subtitle) && (
      <header className="mb-3">
        {title && <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>}
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </header>
    )}
    {children}
  </section>
);
