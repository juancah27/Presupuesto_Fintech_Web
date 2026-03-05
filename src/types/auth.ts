import type { CurrencyCode, LanguageCode } from "./index";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  currency: CurrencyCode;
  language: LanguageCode;
  onboardingCompleted: boolean;
  failedAttempts: number;
  lockUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  token: string;
  userId: string;
  rememberMe: boolean;
  createdAt: string;
  expiresAt: string | null;
}
