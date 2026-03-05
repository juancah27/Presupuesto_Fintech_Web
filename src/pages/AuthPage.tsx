import { useState } from "react";
import { Card } from "../components/ui/Card";

interface AuthPageProps {
  hasConfig: boolean;
  onLogin: (username: string, password: string) => Promise<void>;
  onSetup: (username: string, password: string) => Promise<void>;
}

export const AuthPage = ({ hasConfig, onLogin, onSetup }: AuthPageProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (!username.trim()) {
      setError("Usuario obligatorio.");
      return;
    }
    if (password.length < 6) {
      setError("La clave debe tener al menos 6 caracteres.");
      return;
    }
    if (!hasConfig && password !== confirm) {
      setError("Las claves no coinciden.");
      return;
    }

    try {
      setLoading(true);
      if (hasConfig) {
        await onLogin(username, password);
      } else {
        await onSetup(username, password);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-slate-100 to-slate-200 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <Card className="w-full max-w-md" title={hasConfig ? "Iniciar sesion" : "Configurar acceso inicial"}>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          {hasConfig
            ? "Ingresa con tu usuario y clave para abrir el panel."
            : "Crea tu usuario administrador local para proteger la app."}
        </p>
        <div className="space-y-2">
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Usuario"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Clave"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          />
          {!hasConfig && (
            <input
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder="Confirmar clave"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            />
          )}
          {error && <p className="text-xs text-expense">{error}</p>}
          <button
            type="button"
            disabled={loading}
            onClick={submit}
            className="w-full rounded-lg bg-investment px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Procesando..." : hasConfig ? "Entrar" : "Crear acceso"}
          </button>
        </div>
      </Card>
    </div>
  );
};
