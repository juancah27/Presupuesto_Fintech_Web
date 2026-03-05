import clsx from "clsx";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthInput, PasswordInput } from "../components/auth/AuthFields";
import { AuthShell } from "../components/auth/AuthShell";
import { useAuthStore } from "../store/useAuthStore";
import type { CurrencyCode, LanguageCode } from "../types";
import { isStrongEnoughPassword, isValidEmail, passwordStrength } from "../utils/auth";

const currencies: CurrencyCode[] = ["USD", "EUR", "MXN", "COP", "PEN", "ARS"];
const languages: Array<{ value: LanguageCode; label: string }> = [
  { value: "es", label: "Espanol" },
  { value: "en", label: "English" },
];

export const RegisterPage = () => {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("PEN");
  const [language, setLanguage] = useState<LanguageCode>("es");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState({
    fullName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const strength = useMemo(() => passwordStrength(password), [password]);

  const fullNameError = useMemo(() => {
    if (!touched.fullName || !fullName) return null;
    return fullName.trim().length >= 3 ? null : "Ingresa nombre y apellido.";
  }, [fullName, touched.fullName]);

  const emailError = useMemo(() => {
    if (!touched.email || !email) return null;
    return isValidEmail(email) ? null : "Email invalido.";
  }, [email, touched.email]);

  const passwordError = useMemo(() => {
    if (!touched.password || !password) return null;
    return isStrongEnoughPassword(password)
      ? null
      : "Minimo 8 caracteres y al menos 1 numero.";
  }, [password, touched.password]);

  const confirmError = useMemo(() => {
    if (!touched.confirmPassword || !confirmPassword) return null;
    return password === confirmPassword ? null : "Las contrasenas no coinciden.";
  }, [password, confirmPassword, touched.confirmPassword]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({
      fullName: true,
      email: true,
      password: true,
      confirmPassword: true,
    });
    setError(null);
    if (fullName.trim().length < 3) return setError("Nombre completo invalido.");
    if (!isValidEmail(email)) return setError("Email invalido.");
    if (!isStrongEnoughPassword(password)) {
      return setError("La contrasena debe tener minimo 8 caracteres y 1 numero.");
    }
    if (password !== confirmPassword) return setError("Las contrasenas no coinciden.");

    try {
      setSubmitting(true);
      await register({
        fullName,
        email,
        password,
        confirmPassword,
        currency,
        language,
      });
      navigate("/", { replace: true });
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Configura tu cuenta para empezar a controlar tu presupuesto."
      footer={
        <p>
          Ya tienes cuenta?{" "}
          <Link className="font-semibold text-cyan-300 hover:text-cyan-200" to="/login">
            Iniciar sesion
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <AuthInput
          label="Nombre completo"
          value={fullName}
          autoComplete="name"
          placeholder="Tu nombre y apellido"
          error={fullNameError}
          onChange={(value) => {
            setFullName(value);
            if (!touched.fullName) setTouched((prev) => ({ ...prev, fullName: true }));
          }}
        />
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
          autoComplete="new-password"
          placeholder="********"
          error={passwordError}
          onChange={(value) => {
            setPassword(value);
            if (!touched.password) setTouched((prev) => ({ ...prev, password: true }));
          }}
        />
        <div className="space-y-1">
          <div className="grid grid-cols-4 gap-1">
            {[1, 2, 3, 4].map((step) => (
              <span
                key={step}
                className={clsx(
                  "h-1.5 rounded-full",
                  strength.score >= step
                    ? step <= 2
                      ? "bg-yellow-400"
                      : step === 3
                        ? "bg-cyan-400"
                        : "bg-emerald-400"
                    : "bg-white/10",
                )}
              />
            ))}
          </div>
          <p className="text-xs text-slate-400">Fortaleza: {strength.label}</p>
        </div>
        <PasswordInput
          label="Confirmar contrasena"
          value={confirmPassword}
          autoComplete="new-password"
          placeholder="********"
          error={confirmError}
          onChange={(value) => {
            setConfirmPassword(value);
            if (!touched.confirmPassword) setTouched((prev) => ({ ...prev, confirmPassword: true }));
          }}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium tracking-wide text-slate-300">
              Moneda principal
            </span>
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
              className="w-full rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-500/20"
            >
              {currencies.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium tracking-wide text-slate-300">Idioma</span>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as LanguageCode)}
              className="w-full rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-500/20"
            >
              {languages.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-transparent" />
              Creando cuenta...
            </>
          ) : (
            "Crear cuenta"
          )}
        </button>
      </form>
    </AuthShell>
  );
};
