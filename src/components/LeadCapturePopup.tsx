import { useEffect, useState } from "react";
import { X, Leaf, Gift, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "nutrivida_lead_popup";

const LeadCapturePopup = () => {
  const [visible, setVisible]   = useState(false);
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "dismissed");
    setVisible(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    setError("");

    const { error: err } = await supabase.from("leads").upsert(
      { name: name.trim(), email: email.trim().toLowerCase(), source: "popup" },
      { onConflict: "email" }
    );

    setLoading(false);
    if (err) {
      setError("Não foi possível salvar. Tente novamente.");
      return;
    }
    localStorage.setItem(STORAGE_KEY, "submitted");
    setDone(true);
    setTimeout(() => setVisible(false), 2500);
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-popup-title"
        className={cn(
          "fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          "w-full max-w-sm mx-4",
          "bg-card border border-border rounded-3xl shadow-2xl overflow-hidden",
          "animate-in fade-in zoom-in-95 duration-300"
        )}
      >
        {/* Top accent bar */}
        <div className="h-1 bg-primary w-full" />

        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-7 pt-7 pb-8">
          {done ? (
            /* Success state */
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
              <p className="font-semibold text-foreground text-lg">Cadastrado com sucesso!</p>
              <p className="text-sm text-muted-foreground">Você receberá nossas novidades e ofertas em primeira mão.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                  <Gift className="h-6 w-6 text-primary" />
                </div>
                <h2 id="lead-popup-title" className="font-display text-xl font-bold text-foreground leading-tight">
                  Receba ofertas exclusivas
                </h2>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  Cadastre-se e seja o primeiro a saber sobre novidades, promoções e conteúdos gratuitos.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                  <Leaf className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="pl-9 h-11 rounded-xl"
                    required
                    autoFocus
                    disabled={loading}
                  />
                </div>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Seu melhor e-mail"
                  className="h-11 rounded-xl"
                  required
                  disabled={loading}
                />

                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={loading || !name.trim() || !email.trim()}
                  className="w-full h-11 rounded-xl font-semibold mt-1"
                >
                  {loading
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Cadastrando…</>
                    : "Quero receber ofertas"}
                </Button>
              </form>

              <button
                type="button"
                onClick={dismiss}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors mt-4"
              >
                Não, obrigado
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default LeadCapturePopup;
