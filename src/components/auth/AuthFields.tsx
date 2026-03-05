import clsx from "clsx";
import { useMemo, useState } from "react";

interface AuthInputProps {
  label: string;
  type?: "text" | "email" | "number";
  value: string;
  placeholder?: string;
  autoComplete?: string;
  error?: string | null;
  onChange: (value: string) => void;
}

const baseInputClass =
  "w-full rounded-xl border bg-slate-900/70 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500";

export const AuthInput = ({
  label,
  type = "text",
  value,
  placeholder,
  autoComplete,
  error,
  onChange,
}: AuthInputProps) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-medium tracking-wide text-slate-300">{label}</span>
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      autoComplete={autoComplete}
      onChange={(event) => onChange(event.target.value)}
      className={clsx(
        baseInputClass,
        error
          ? "border-red-400/80 focus:border-red-300 focus:ring-2 focus:ring-red-500/20"
          : "border-white/15 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-500/20",
      )}
    />
    {error ? <span className="mt-1 block text-xs text-red-300">{error}</span> : null}
  </label>
);

interface PasswordInputProps {
  label: string;
  value: string;
  placeholder?: string;
  autoComplete?: string;
  error?: string | null;
  onChange: (value: string) => void;
}

export const PasswordInput = ({
  label,
  value,
  placeholder,
  autoComplete,
  error,
  onChange,
}: PasswordInputProps) => {
  const [visible, setVisible] = useState(false);
  const buttonText = useMemo(() => (visible ? "Ocultar" : "Mostrar"), [visible]);

  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium tracking-wide text-slate-300">{label}</span>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(event) => onChange(event.target.value)}
          className={clsx(
            baseInputClass,
            "pr-20",
            error
              ? "border-red-400/80 focus:border-red-300 focus:ring-2 focus:ring-red-500/20"
              : "border-white/15 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-500/20",
          )}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-white/10 hover:text-white"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 fill-none stroke-current"
            strokeWidth="2"
          >
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {buttonText}
        </button>
      </div>
      {error ? <span className="mt-1 block text-xs text-red-300">{error}</span> : null}
    </label>
  );
};
