import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Leaf, Eye, EyeOff, Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

const AdminLogin = () => {
  const { login, isAuthenticated, isLocked, lockoutRemaining } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  if (isAuthenticated) return <Navigate to="/admin" replace />;

  // Countdown timer for lockout
  useEffect(() => {
    if (isLocked()) {
      setCountdown(lockoutRemaining());
      const interval = setInterval(() => {
        const rem = lockoutRemaining();
        setCountdown(rem);
        if (rem <= 0) clearInterval(interval);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isLocked, lockoutRemaining]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const locked = isLocked();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (locked) return;

    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));

    const result = login(password);
    if (result.ok) {
      navigate("/admin", { replace: true });
    } else {
      setLoading(false);
      if (result.locked) {
        setCountdown(result.remaining ?? 0);
        setError(`Muitas tentativas incorretas. Aguarde ${formatCountdown(result.remaining ?? 0)}.`);
      } else {
        const rem = result.remaining ?? 0;
        setError(`Senha incorreta. ${rem > 0 ? `${rem} tentativa${rem !== 1 ? "s" : ""} restante${rem !== 1 ? "s" : ""}.` : ""}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-light via-background to-gold-light flex items-center justify-center px-4">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-card border border-border rounded-3xl shadow-2xl p-10">
          {/* Logo */}
          <div className="text-center mb-8 space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto">
              <Leaf className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Painel Admin</h1>
              <p className="text-muted-foreground text-sm mt-1">NutriVida — Gestão de Conteúdo</p>
            </div>
          </div>

          {/* Lockout banner */}
          {locked && (
            <div className="flex items-start gap-2.5 p-3.5 bg-destructive/8 border border-destructive/20 rounded-xl mb-5">
              <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Acesso temporariamente bloqueado</p>
                <p className="text-xs text-destructive/80 mt-0.5">
                  Tente novamente em <span className="font-mono font-bold">{formatCountdown(countdown)}</span>
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium">
                Senha de acesso
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="pl-10 pr-10 h-12 border-border/70 focus:border-primary"
                  required
                  autoFocus
                  disabled={locked}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {error && !locked && (
                <p className="text-sm text-destructive flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                  {error}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || !password || locked}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-base font-semibold"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : locked ? (
                `Bloqueado — ${formatCountdown(countdown)}`
              ) : (
                "Entrar no painel"
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            <a href="/" className="hover:text-primary transition-colors">
              ← Voltar para o site
            </a>
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          <a href="/" className="hover:text-primary transition-colors">← Voltar ao site público</a>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
