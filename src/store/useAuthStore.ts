import { create } from "zustand";
import type { CurrencyCode, LanguageCode } from "../types";
import type { AuthSession, AuthUser } from "../types/auth";
import {
  changePassword,
  clearSession,
  createUser,
  getUserById,
  isStrongEnoughPassword,
  isValidEmail,
  loadSession,
  loginUser,
  parseLockSeconds,
  saveSession,
  setOnboardingCompleted,
  updateProfile,
} from "../utils/auth";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface AuthStore {
  isHydrated: boolean;
  isAuthenticated: boolean;
  currentUser: AuthUser | null;
  session: AuthSession | null;
  lockSeconds: number;
  sessionMessage: string | null;
  hydrateAuth: () => void;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  register: (payload: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    currency: CurrencyCode;
    language: LanguageCode;
  }) => Promise<void>;
  logout: () => void;
  completeOnboarding: () => void;
  clearSessionMessage: () => void;
  updateProfileSettings: (patch: {
    fullName: string;
    email: string;
    currency: CurrencyCode;
    language: LanguageCode;
  }) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<void>;
  setLockSeconds: (seconds: number) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  isHydrated: false,
  isAuthenticated: false,
  currentUser: null,
  session: null,
  lockSeconds: 0,
  sessionMessage: null,

  hydrateAuth: () => {
    const { session, expired } = loadSession();
    if (!session) {
      set({
        isHydrated: true,
        isAuthenticated: false,
        currentUser: null,
        session: null,
        sessionMessage: expired ? "Tu sesion ha expirado" : null,
      });
      return;
    }
    const user = getUserById(session.userId);
    if (!user) {
      clearSession();
      set({
        isHydrated: true,
        isAuthenticated: false,
        currentUser: null,
        session: null,
      });
      return;
    }
    set({
      isHydrated: true,
      isAuthenticated: true,
      currentUser: user,
      session,
      sessionMessage: null,
    });
  },

  login: async (email, password, rememberMe) => {
    await delay(1200);
    try {
      const { user } = await loginUser(email, password);
      const session = saveSession(user.id, rememberMe);
      set({
        isAuthenticated: true,
        currentUser: user,
        session,
        lockSeconds: 0,
        sessionMessage: null,
      });
    } catch (error) {
      const message = (error as Error).message;
      const lockSeconds = parseLockSeconds(message);
      if (lockSeconds > 0) {
        set({ lockSeconds });
        throw new Error(`Demasiados intentos. Intenta nuevamente en ${lockSeconds}s.`);
      }
      throw new Error("Credenciales incorrectas.");
    }
  },

  register: async ({ fullName, email, password, confirmPassword, currency, language }) => {
    await delay(300);
    if (!fullName.trim()) throw new Error("Nombre completo obligatorio.");
    if (!isValidEmail(email)) throw new Error("Email invalido.");
    if (!isStrongEnoughPassword(password)) {
      throw new Error("La contrasena debe tener minimo 8 caracteres y al menos 1 numero.");
    }
    if (password !== confirmPassword) throw new Error("Las contrasenas no coinciden.");

    const user = await createUser({
      fullName,
      email,
      password,
      currency,
      language,
    });
    const session = saveSession(user.id, true);
    set({
      isAuthenticated: true,
      currentUser: user,
      session,
      lockSeconds: 0,
      sessionMessage: null,
    });
  },

  logout: () => {
    clearSession();
    set({
      isAuthenticated: false,
      currentUser: null,
      session: null,
    });
  },

  completeOnboarding: () => {
    const current = get().currentUser;
    if (!current) return;
    const updated = setOnboardingCompleted(current.id);
    if (!updated) return;
    set({ currentUser: updated });
  },

  clearSessionMessage: () => set({ sessionMessage: null }),

  updateProfileSettings: async (patch) => {
    const user = get().currentUser;
    if (!user) throw new Error("Sin sesion activa.");
    if (!patch.fullName.trim()) throw new Error("Nombre obligatorio.");
    if (!isValidEmail(patch.email)) throw new Error("Email invalido.");
    const updated = updateProfile(user.id, patch);
    set({ currentUser: updated });
  },

  updatePassword: async (currentPassword, newPassword, confirmPassword) => {
    const user = get().currentUser;
    if (!user) throw new Error("Sin sesion activa.");
    if (!isStrongEnoughPassword(newPassword)) {
      throw new Error("La nueva contrasena debe tener minimo 8 caracteres y 1 numero.");
    }
    if (newPassword !== confirmPassword) throw new Error("Las contrasenas no coinciden.");
    const updated = await changePassword(user.id, currentPassword, newPassword);
    set({ currentUser: updated });
  },

  setLockSeconds: (seconds) => set({ lockSeconds: Math.max(0, seconds) }),
}));
