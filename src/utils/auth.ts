import type { CurrencyCode, LanguageCode } from "../types";
import type { AuthSession, AuthUser } from "../types/auth";

const USERS_KEY = "fintech-auth:v2:users";
const SESSION_LOCAL_KEY = "fintech-auth:v2:session:local";
const SESSION_TEMP_KEY = "fintech-auth:v2:session:temp";
const SESSION_DAYS = 7;
const LOGIN_ATTEMPTS_LIMIT = 5;
const LOCK_SECONDS = 30;

const encoder = new TextEncoder();

const now = () => new Date();
const nowISO = () => now().toISOString();

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export const isStrongEnoughPassword = (password: string): boolean =>
  /^(?=.*\d).{8,}$/.test(password);

export const passwordStrength = (
  password: string,
): { score: 1 | 2 | 3 | 4; label: "Debil" | "Media" | "Fuerte" | "Muy fuerte" } => {
  let points = 0;
  if (password.length >= 8) points += 1;
  if (/\d/.test(password)) points += 1;
  if (/[A-Z]/.test(password) || /[a-z]/.test(password)) points += 1;
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) points += 1;

  if (points <= 1) return { score: 1, label: "Debil" };
  if (points === 2) return { score: 2, label: "Media" };
  if (points === 3) return { score: 3, label: "Fuerte" };
  return { score: 4, label: "Muy fuerte" };
};

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const safeUUID = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Math.random().toString(36).slice(2)}_${Date.now()}`;

export const hashPassword = async (rawPassword: string): Promise<string> => {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(rawPassword));
  return toHex(hash);
};

export const createToken = (): string => safeUUID();

export const loadUsers = (): AuthUser[] => {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AuthUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveUsers = (users: AuthUser[]): void => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const createUser = async (payload: {
  fullName: string;
  email: string;
  password: string;
  currency: CurrencyCode;
  language: LanguageCode;
}): Promise<AuthUser> => {
  const users = loadUsers();
  const email = normalizeEmail(payload.email);
  if (users.some((user) => user.email === email)) {
    throw new Error("Este email ya esta registrado.");
  }

  const user: AuthUser = {
    id: safeUUID(),
    fullName: payload.fullName.trim(),
    email,
    passwordHash: await hashPassword(payload.password),
    currency: payload.currency,
    language: payload.language,
    onboardingCompleted: false,
    failedAttempts: 0,
    lockUntil: null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  saveUsers([user, ...users]);
  return user;
};

export const updateUser = (
  userId: string,
  updater: (prev: AuthUser) => AuthUser,
): AuthUser | null => {
  const users = loadUsers();
  let updated: AuthUser | null = null;
  const nextUsers = users.map((user) => {
    if (user.id !== userId) return user;
    updated = updater(user);
    return updated;
  });
  if (!updated) return null;
  saveUsers(nextUsers);
  return updated;
};

export const findUserByEmail = (email: string): AuthUser | null => {
  const normalized = normalizeEmail(email);
  return loadUsers().find((user) => user.email === normalized) ?? null;
};

const hasExpired = (session: AuthSession): boolean => {
  if (!session.expiresAt) return false;
  return new Date(session.expiresAt).getTime() <= now().getTime();
};

const clearSessions = () => {
  localStorage.removeItem(SESSION_LOCAL_KEY);
  sessionStorage.removeItem(SESSION_TEMP_KEY);
};

export const saveSession = (userId: string, rememberMe: boolean): AuthSession => {
  const createdAt = nowISO();
  const expiresAt = rememberMe
    ? new Date(now().getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString()
    : null;
  const session: AuthSession = {
    token: createToken(),
    userId,
    rememberMe,
    createdAt,
    expiresAt,
  };
  if (rememberMe) {
    localStorage.setItem(SESSION_LOCAL_KEY, JSON.stringify(session));
    sessionStorage.removeItem(SESSION_TEMP_KEY);
  } else {
    sessionStorage.setItem(SESSION_TEMP_KEY, JSON.stringify(session));
    localStorage.removeItem(SESSION_LOCAL_KEY);
  }
  return session;
};

export const loadSession = (): { session: AuthSession | null; expired: boolean } => {
  try {
    const temp = sessionStorage.getItem(SESSION_TEMP_KEY);
    const local = localStorage.getItem(SESSION_LOCAL_KEY);
    const raw = temp ?? local;
    if (!raw) return { session: null, expired: false };

    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.token || !parsed.userId) {
      clearSessions();
      return { session: null, expired: false };
    }
    if (hasExpired(parsed)) {
      clearSessions();
      return { session: null, expired: true };
    }
    return { session: parsed, expired: false };
  } catch {
    clearSessions();
    return { session: null, expired: false };
  }
};

export const clearSession = (): void => {
  clearSessions();
};

export const loginUser = async (
  email: string,
  password: string,
): Promise<{ user: AuthUser; lockSeconds: number }> => {
  const user = findUserByEmail(email);
  if (!user) {
    throw new Error("Credenciales incorrectas.");
  }

  const nowMs = now().getTime();
  if (user.lockUntil) {
    const lockMs = new Date(user.lockUntil).getTime();
    if (lockMs > nowMs) {
      const lockSeconds = Math.ceil((lockMs - nowMs) / 1000);
      throw new Error(`LOCKED:${lockSeconds}`);
    }
  }

  const hashed = await hashPassword(password);
  if (hashed !== user.passwordHash) {
    const nextAttempts = user.failedAttempts + 1;
    const shouldLock = nextAttempts >= LOGIN_ATTEMPTS_LIMIT;
    updateUser(user.id, (prev) => ({
      ...prev,
      failedAttempts: shouldLock ? 0 : nextAttempts,
      lockUntil: shouldLock ? new Date(now().getTime() + LOCK_SECONDS * 1000).toISOString() : null,
      updatedAt: nowISO(),
    }));
    if (shouldLock) {
      throw new Error(`LOCKED:${LOCK_SECONDS}`);
    }
    throw new Error("Credenciales incorrectas.");
  }

  const resetUser = updateUser(user.id, (prev) => ({
    ...prev,
    failedAttempts: 0,
    lockUntil: null,
    updatedAt: nowISO(),
  }));

  return { user: resetUser ?? user, lockSeconds: 0 };
};

export const setOnboardingCompleted = (userId: string): AuthUser | null =>
  updateUser(userId, (prev) => ({
    ...prev,
    onboardingCompleted: true,
    updatedAt: nowISO(),
  }));

export const getUserById = (userId: string): AuthUser | null =>
  loadUsers().find((user) => user.id === userId) ?? null;

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<AuthUser> => {
  const user = getUserById(userId);
  if (!user) throw new Error("Usuario no encontrado.");
  const currentHash = await hashPassword(currentPassword);
  if (currentHash !== user.passwordHash) {
    throw new Error("Contrasena actual incorrecta.");
  }
  const updatedHash = await hashPassword(newPassword);
  const updated = updateUser(user.id, (prev) => ({
    ...prev,
    passwordHash: updatedHash,
    updatedAt: nowISO(),
  }));
  if (!updated) throw new Error("No se pudo actualizar la contrasena.");
  return updated;
};

export const updateProfile = (
  userId: string,
  patch: Partial<Pick<AuthUser, "fullName" | "email" | "currency" | "language">>,
): AuthUser => {
  const normalizedEmail = patch.email ? normalizeEmail(patch.email) : undefined;
  if (normalizedEmail) {
    const users = loadUsers();
    if (users.some((user) => user.id !== userId && user.email === normalizedEmail)) {
      throw new Error("Ese email ya pertenece a otro usuario.");
    }
  }
  const updated = updateUser(userId, (prev) => ({
    ...prev,
    fullName: patch.fullName?.trim() || prev.fullName,
    email: normalizedEmail ?? prev.email,
    currency: patch.currency ?? prev.currency,
    language: patch.language ?? prev.language,
    updatedAt: nowISO(),
  }));
  if (!updated) throw new Error("No se pudo actualizar el perfil.");
  return updated;
};

export const parseLockSeconds = (errorMessage: string): number => {
  if (!errorMessage.startsWith("LOCKED:")) return 0;
  const raw = Number(errorMessage.split(":")[1] ?? 0);
  return Number.isFinite(raw) ? Math.max(0, raw) : 0;
};
