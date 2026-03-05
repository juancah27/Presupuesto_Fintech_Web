import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthInput, PasswordInput } from "../components/auth/AuthFields";
import { AuthShell } from "../components/auth/AuthShell";
import { useAuthStore } from "../store/useAuthStore";
import { isValidEmail } from "../utils/auth";

export const LoginPage = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const lockSeconds = useAuthStore((state) => state.lockSeconds);
  const sessionMessage = useAuthStore((state) => state.sessionMessage);
  const clearSessionMessage = useAuthStore((state) => state.clearSessionMessage);
  const setLockSeconds = useAuthStore((state) => state.setLockSeconds);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });

  useEffect(() => {
    if (!sessionMessage) return;
    const timer = window.setTimeout(() => clearSessionMessage(), 5000);
    return () => window.clearTimeout(timer);
  }, [sessionMessage, clearSessionMessage]);

  useEffect(() => {
    if (lockSeconds <= 0) return;
    const interval = window.setInterval(() => {
      setLockSeconds(lockSeconds - 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [lockSeconds, setLockSeconds]);

  const emailError = useMemo(() => {
    if (!touched.email || !email.trim()) return null;
    return isValidEmail(email) ? null : "Ingresa un email valido.";
  }, [email, touched.email]);

  const passwordError = useMemo(() => {
    if (!touched.password || !password) return null;
    return password.length >= 8 ? null : "Minimo 8 caracteres.";
  }, [password, touched.password]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({ email: true, password: true });
    setError(null);
    if (!isValidEmail(email)) {
      setError("Email invalido.");
      return;
    }
    if (!password) {
      setError("Ingresa tu contrasena.");
      return;
    }
    if (lockSeconds > 0) {
      setError(`Demasiados intentos. Espera ${lockSeconds}s.`);
      return;
    }
    try {
      setSubmitting(true);
      await login(email, password, rememberMe);
      navigate("/", { replace: true });
    } catch (caught) {
      setError((caught as Error).message);
      setShake(true);
      window.setTimeout(() => setShake(false), 420);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Inicia sesion"
      subtitle="Accede a tu panel financiero personal."
      footer={
        <p>
          No tienes cuenta?{" "}
          <Link className="font-semibold text-cyan-300 hover:text-cyan-200" to="/register">
            Crear cuenta
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className={clsx("space-y-4", shake && "animate-shake")}>
        {sessionMessage ? (
          <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
            {sessionMessage}
          </div>
        ) : null}
        <AuthInput
          label="Email"
          type="email"
          value={email}
          autoComplete="email"
          placeholder="tu@email.com"
          error={emailError}
          onChange={(value) => {
            setEmail(value);
            if (!touched.email) setTouched((prev) => ({ ...prev, email: true }));
          }}
        />
        <PasswordInput
          label="Contrasena"
          value={password}
          autoComplete="current-password"
          placeholder="********"
          error={passwordError}
          onChange={(value) => {
            setPassword(value);
            if (!touched.password) setTouched((prev) => ({ ...prev, password: true }));
          }}
        />

        <div className="flex items-center justify-between gap-3 text-sm">
          <label className="inline-flex items-center gap-2 text-slate-300">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-slate-900 text-cyan-400 focus:ring-cyan-500/40"
            />
            Recordarme
          </label>
          <Link className="text-cyan-300 hover:text-cyan-200" to="/forgot-password">
            Olvidaste tu contrasena?
          </Link>
        </div>

        {lockSeconds > 0 ? (
          <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
            Login bloqueado por seguridad. Intenta en {lockSeconds}s.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting || lockSeconds > 0}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-transparent" />
              Validando...
            </>
          ) : (
            "Entrar"
          )}
        </button>
      </form>
    </AuthShell>
  );
};
