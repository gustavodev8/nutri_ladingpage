import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

const ADMIN_PASSWORD_KEY = "nutrivida_admin_pw";
const SESSION_KEY = "nutrivida_admin_session";
const ATTEMPTS_KEY = "nutrivida_admin_attempts";
const LOCKOUT_KEY = "nutrivida_admin_lockout";

const DEFAULT_PASSWORD = "admin123";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (password: string) => { ok: boolean; locked?: boolean; remaining?: number };
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => boolean | string;
  isLocked: () => boolean;
  lockoutRemaining: () => number; // seconds
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem(SESSION_KEY) === "true";
  });

  const getStoredPassword = () =>
    localStorage.getItem(ADMIN_PASSWORD_KEY) ?? DEFAULT_PASSWORD;

  const getAttempts = () => parseInt(localStorage.getItem(ATTEMPTS_KEY) ?? "0", 10);

  const isLocked = useCallback((): boolean => {
    const lockoutUntil = parseInt(localStorage.getItem(LOCKOUT_KEY) ?? "0", 10);
    if (lockoutUntil > Date.now()) return true;
    // Auto-clear lockout after time passes
    if (lockoutUntil > 0 && lockoutUntil <= Date.now()) {
      localStorage.removeItem(LOCKOUT_KEY);
      localStorage.removeItem(ATTEMPTS_KEY);
    }
    return false;
  }, []);

  const lockoutRemaining = useCallback((): number => {
    const lockoutUntil = parseInt(localStorage.getItem(LOCKOUT_KEY) ?? "0", 10);
    return Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
  }, []);

  const login = useCallback((password: string): { ok: boolean; locked?: boolean; remaining?: number } => {
    if (isLocked()) {
      return { ok: false, locked: true, remaining: lockoutRemaining() };
    }

    if (password === getStoredPassword()) {
      localStorage.removeItem(ATTEMPTS_KEY);
      localStorage.removeItem(LOCKOUT_KEY);
      sessionStorage.setItem(SESSION_KEY, "true");
      setIsAuthenticated(true);
      return { ok: true };
    }

    // Increment failed attempts
    const attempts = getAttempts() + 1;
    localStorage.setItem(ATTEMPTS_KEY, String(attempts));

    if (attempts >= MAX_ATTEMPTS) {
      const lockoutUntil = Date.now() + LOCKOUT_MINUTES * 60 * 1000;
      localStorage.setItem(LOCKOUT_KEY, String(lockoutUntil));
      localStorage.setItem(ATTEMPTS_KEY, "0");
      return { ok: false, locked: true, remaining: LOCKOUT_MINUTES * 60 };
    }

    return { ok: false, remaining: MAX_ATTEMPTS - attempts };
  }, [isLocked, lockoutRemaining]);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
  }, []);

  const changePassword = useCallback((currentPassword: string, newPassword: string): boolean | string => {
    if (currentPassword !== getStoredPassword()) return "Senha atual incorreta.";
    if (newPassword.length < 8) return "A nova senha deve ter pelo menos 8 caracteres.";
    if (!/[A-Z]/.test(newPassword)) return "A nova senha deve conter ao menos uma letra maiúscula.";
    if (!/[0-9]/.test(newPassword)) return "A nova senha deve conter ao menos um número.";
    if (newPassword === DEFAULT_PASSWORD) return "Por segurança, não use a senha padrão.";
    localStorage.setItem(ADMIN_PASSWORD_KEY, newPassword);
    return true;
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, changePassword, isLocked, lockoutRemaining }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
