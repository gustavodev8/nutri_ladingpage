import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

interface AuthContextValue {
  isAuthenticated: boolean;
  authReady: boolean;
  userEmail: string | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean | string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const session = data.session;
      setIsAuthenticated(Boolean(session));
      setUserEmail(session?.user.email ?? null);
      setAuthReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session));
      setUserEmail(session?.user.email ?? null);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ ok: boolean; message?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { ok: false, message: "E-mail ou senha incorretos." };
    }
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut().catch(() => null);
    setIsAuthenticated(false);
    setUserEmail(null);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<boolean | string> => {
    const email = userEmail;
    if (!email) return "Sessão inválida. Faça login novamente.";
    if (newPassword.length < 8) return "A nova senha deve ter pelo menos 8 caracteres.";
    if (!/[A-Z]/.test(newPassword)) return "A nova senha deve conter ao menos uma letra maiúscula.";
    if (!/[0-9]/.test(newPassword)) return "A nova senha deve conter ao menos um número.";
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (reauthError) return "Senha atual incorreta.";
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) return "Não foi possível atualizar a senha agora.";
    return true;
  }, [userEmail]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, authReady, userEmail, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
