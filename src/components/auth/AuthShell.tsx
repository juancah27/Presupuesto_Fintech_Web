import type { PropsWithChildren } from "react";
import { Link } from "react-router-dom";

interface AuthShellProps extends PropsWithChildren {
  title: string;
  subtitle: string;
  footer?: JSX.Element;
}

export const AuthShell = ({ title, subtitle, footer, children }: AuthShellProps) => (
  <div className="min-h-screen bg-slate-950 p-4 sm:p-6">
    <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 shadow-glass backdrop-blur-xl md:grid-cols-5">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/80 p-8 md:col-span-2 md:block">
        <div className="absolute -right-8 top-8 h-32 w-32 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Fintech App</p>
          <h1 className="mt-3 text-3xl font-bold text-white">Presupuesto Personal</h1>
          <p className="mt-2 max-w-xs text-sm text-slate-300">
            Controla ingresos, gastos e inversiones en un solo panel profesional.
          </p>
          <ul className="mt-8 space-y-4 text-sm text-slate-200">
            <li className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-200">
                $
              </span>
              KPIs en tiempo real para decisiones rapidas.
            </li>
            <li className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-200">
                %
              </span>
              Regla 50/30/20 y alertas de presupuesto.
            </li>
            <li className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-400/20 text-blue-200">
                #
              </span>
              Tu informacion queda privada en tu navegador.
            </li>
          </ul>
        </div>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10 md:col-span-3">
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-6 md:hidden">
            <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/20">FP</span>
              Presupuesto Personal
            </Link>
          </div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
          <div className="mt-6 space-y-4">{children}</div>
          {footer ? <div className="mt-6 text-sm text-slate-400">{footer}</div> : null}
        </div>
      </section>
    </div>
  </div>
);
