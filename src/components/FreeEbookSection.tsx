import { useState } from "react";
import { Mail, BookOpen, CheckCircle2, ArrowRight, Loader2, Video } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const PERKS = [
  "Como montar refeições que emagrecem de verdade",
  "Os 5 erros mais comuns em dietas",
  "Protocolo de hidratação e sono para acelerar o metabolismo",
];

const FreeEbookSection = () => {
  const { ref, isVisible, hiddenClass } = useScrollAnimation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

    setStatus("loading");
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-material`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          to: email,
          client_name: name || "Olá",
          subject: "Seu e-book gratuito chegou! 🎁",
          body: `Olá${name ? `, ${name}` : ""}!\n\nObrigado pelo seu interesse. Seu e-book gratuito foi enviado em anexo.\n\nQualquer dúvida, entre em contato pelo WhatsApp ou agende uma consulta.\n\nFillipe David — Nutricionista Clínico e Esportivo`,
        }),
      });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section className="py-20 lg:py-28 bg-green-light">
      <div
        ref={ref}
        className={`container mx-auto px-4 max-w-5xl transition-[opacity,transform] duration-700 ease-smooth ${
          isVisible ? "opacity-100 translate-y-0" : hiddenClass
        }`}
      >
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Left — copy */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
              <BookOpen className="h-3.5 w-3.5" />
              E-book gratuito
            </div>

            <div className="space-y-3">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight">
                Guia de nutrição para{" "}
                <span className="text-primary">começar do jeito certo</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Receba gratuitamente o material que já ajudou centenas de pacientes a dar o primeiro passo rumo a uma alimentação de verdade.
              </p>
            </div>

            <ul className="space-y-3">
              {PERKS.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm text-foreground/80">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  {p}
                </li>
              ))}
            </ul>

            {/* Bonus highlight */}
            <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-4">
              <Video className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Bônus: consulta online gratuita de 20 min
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Quem comprar qualquer e-book ganha uma consulta individual com Fillipe David — sem custo adicional.
                </p>
                <button
                  type="button"
                  onClick={() => document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" })}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary mt-2 hover:underline"
                >
                  Ver e-books disponíveis <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Right — form */}
          <div className="bg-card border border-border rounded-2xl p-7 shadow-sm">
            {status === "done" ? (
              <div className="flex flex-col items-center text-center gap-4 py-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-foreground">E-book enviado!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Verifique sua caixa de entrada e a pasta de spam.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">Receba agora, é gratuito</p>
                  <p className="text-sm text-muted-foreground">Informe seu email e receba o material na hora.</p>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Seu nome (opcional)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-9 rounded-xl"
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-9 rounded-xl"
                    />
                  </div>
                </div>

                {status === "error" && (
                  <p className="text-xs text-destructive">Erro ao enviar. Tente novamente.</p>
                )}

                <Button
                  type="submit"
                  className="w-full rounded-full gap-2"
                  disabled={status === "loading" || !email}
                >
                  {status === "loading" ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Enviando...</>
                  ) : (
                    <>Quero meu e-book grátis <ArrowRight className="h-4 w-4" /></>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground/60 text-center">
                  Sem spam. Você pode cancelar a qualquer momento.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FreeEbookSection;
