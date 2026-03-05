export interface AuthConfig {
  username: string;
  passwordHash: string;
  salt: string;
  updatedAt: string;
}

const AUTH_KEY = "fintech-auth-config:v1";
const SESSION_KEY = "fintech-auth-session:v1";

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const randomSalt = (): string =>
  `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

const sha256 = async (text: string): Promise<string> => {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return toHex(hash);
};

export const hashPassword = async (password: string, salt: string): Promise<string> =>
  sha256(`${salt}::${password}`);

export const createAuthConfig = async (username: string, password: string): Promise<AuthConfig> => {
  const salt = randomSalt();
  const passwordHash = await hashPassword(password, salt);
  return {
    username: username.trim().toLowerCase(),
    passwordHash,
    salt,
    updatedAt: new Date().toISOString(),
  };
};

export const verifyCredentials = async (
  username: string,
  password: string,
  config: AuthConfig,
): Promise<boolean> => {
  const normalized = username.trim().toLowerCase();
  if (normalized !== config.username) return false;
  const candidateHash = await hashPassword(password, config.salt);
  return candidateHash === config.passwordHash;
};

export const loadAuthConfig = (): AuthConfig | null => {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthConfig>;
    if (!parsed.username || !parsed.passwordHash || !parsed.salt) return null;
    return {
      username: parsed.username,
      passwordHash: parsed.passwordHash,
      salt: parsed.salt,
      updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
};

export const saveAuthConfig = (config: AuthConfig): void => {
  localStorage.setItem(AUTH_KEY, JSON.stringify(config));
};

export const hasActiveSession = (): boolean => sessionStorage.getItem(SESSION_KEY) === "1";

export const setActiveSession = (active: boolean): void => {
  if (active) {
    sessionStorage.setItem(SESSION_KEY, "1");
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
};
