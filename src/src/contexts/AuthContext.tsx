import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

const ADMIN_PASSWORD_KEY = "nutrivida_admin_pw";
const SESSION_KEY = "nutrivida_admin_session";

// Default password hash – stored as plain text for simplicity (no sensitive user data here)
const DEFAULT_PASSWORD = "admin123";

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem(SESSION_KEY) === "true";
  });

  const getStoredPassword = () =>
    localStorage.getItem(ADMIN_PASSWORD_KEY) ?? DEFAULT_PASSWORD;

  const login = useCallback((password: string): boolean => {
    if (password === getStoredPassword()) {
      sessionStorage.setItem(SESSION_KEY, "true");
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
  }, []);

  const changePassword = useCallback((currentPassword: string, newPassword: string): boolean => {
    if (currentPassword !== getStoredPassword()) return false;
    if (newPassword.length < 6) return false;
    localStorage.setItem(ADMIN_PASSWORD_KEY, newPassword);
    return true;
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
