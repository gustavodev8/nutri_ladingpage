import { useState } from "react";
import { Eye, EyeOff, ShieldCheck, Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const AdminSenha = () => {
  const { changePassword } = useAuth();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState({ current: false, next: false });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const set = (key: keyof typeof form, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
    setError("");
    setSuccess(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.next !== form.confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    const result = changePassword(form.current, form.next);
    if (result === true) {
      setSuccess(true);
      setForm({ current: "", next: "", confirm: "" });
    } else {
      setError(typeof result === "string" ? result : "Erro ao alterar a senha.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-foreground">Alterar Senha</h1>
        <p className="text-muted-foreground text-sm">Atualize a senha de acesso ao painel admin.</p>
      </div>

      <div className="bg-card border border-border rounded-3xl p-6 lg:p-8 space-y-6">
        {/* Security tip */}
        <div className="flex items-start gap-2.5 p-3.5 bg-primary/5 border border-primary/15 rounded-xl text-sm">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-muted-foreground leading-relaxed">
            A nova senha deve ter <strong className="text-foreground">mínimo 8 caracteres</strong>,
            pelo menos <strong className="text-foreground">uma letra maiúscula</strong> e
            um <strong className="text-foreground">número</strong>.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 max-w-sm">
          {/* Current password */}
          <div className="space-y-2">
            <Label htmlFor="current">Senha atual</Label>
            <div className="relative">
              <Input
                id="current"
                type={show.current ? "text" : "password"}
                value={form.current}
                onChange={(e) => set("current", e.target.value)}
                className="pr-10"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShow((s) => ({ ...s, current: !s.current }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label="Mostrar/ocultar senha"
              >
                {show.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div className="space-y-2">
            <Label htmlFor="next">Nova senha</Label>
            <div className="relative">
              <Input
                id="next"
                type={show.next ? "text" : "password"}
                value={form.next}
                onChange={(e) => set("next", e.target.value)}
                className="pr-10"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShow((s) => ({ ...s, next: !s.next }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label="Mostrar/ocultar nova senha"
              >
                {show.next ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm */}
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar nova senha</Label>
            <Input
              id="confirm"
              type="password"
              value={form.confirm}
              onChange={(e) => set("confirm", e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-primary flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              Senha alterada com sucesso!
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90"
            disabled={!form.current || !form.next || !form.confirm}
          >
            Salvar nova senha
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AdminSenha;
