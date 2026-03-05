import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthInput } from "../components/auth/AuthFields";
import { AuthShell } from "../components/auth/AuthShell";
import { isValidEmail } from "../utils/auth";

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const emailError = touched && email && !isValidEmail(email) ? "Ingresa un email valido." : null;

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    if (!isValidEmail(email)) return;
    setSubmitted(true);
  };

  return (
    <AuthShell
      title="Recuperar contrasena"
      subtitle="Te mostraremos una confirmacion simulada para recuperar el acceso."
      footer={
        <p>
          <Link className="font-semibold text-cyan-300 hover:text-cyan-200" to="/login">
            Volver al login
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <AuthInput
          label="Email"
          type="email"
          value={email}
          placeholder="tu@email.com"
          autoComplete="email"
          error={emailError}
          onChange={(value) => {
            setEmail(value);
            if (!touched) setTouched(true);
          }}
        />
        {submitted ? (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
            Si ese email existe, recibiras instrucciones.
          </div>
        ) : null}
        <button
          type="submit"
          className="w-full rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          Enviar instrucciones
        </button>
      </form>
    </AuthShell>
  );
};
