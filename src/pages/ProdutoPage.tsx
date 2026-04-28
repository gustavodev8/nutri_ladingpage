import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import {
  ArrowLeft, BookOpen, Loader2, Mail, CheckCircle2,
  Copy, Check, X, User, CreditCard, ChevronLeft, ChevronRight, MessageCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useContent } from "@/contexts/ContentContext";
import { toast } from "@/hooks/use-toast";

// ── CPF helpers ───────────────────────────────────────────────────────────────

function validateCpf(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (n: number) => {
    const sum = Array.from({ length: n - 1 }, (_, i) => parseInt(d[i]) * (n - i)).reduce((a, b) => a + b, 0);
    const rem = (sum * 10) % 11;
    return rem >= 10 ? 0 : rem;
  };
  return calc(10) === parseInt(d[9]) && calc(11) === parseInt(d[10]);
}

function maskCpf(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

// ── Screenshots Carousel ─────────────────────────────────────────────────────

interface Screenshot { imageUrl: string; caption?: string }

const ScreenshotsCarousel = ({ screenshots }: { screenshots: Screenshot[] }) => {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = useCallback((dir: 1 | -1) => {
    setVisible(false);
    setTimeout(() => {
      setIdx(i => (i + dir + screenshots.length) % screenshots.length);
      setVisible(true);
    }, 220);
  }, [screenshots.length]);

  const goTo = useCallback((i: number) => {
    setVisible(false);
    setTimeout(() => {
      setIdx(i);
      setVisible(true);
    }, 220);
  }, []);

  useEffect(() => {
    if (screenshots.length <= 1 || lightbox) return;
    timerRef.current = setTimeout(() => go(1), 4000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [idx, go, screenshots.length, lightbox]);

  if (!screenshots.length) return null;

  return (
    <>
      {/* Slide */}
      <div className="space-y-3">
        <div className="relative">
          {/* Fixed-height container — tamanho uniforme para todas as imagens */}
          <div
            className="relative rounded-2xl overflow-hidden bg-muted/40 border border-border cursor-zoom-in group flex items-center justify-center"
            style={{ height: 480 }}
            onClick={() => setLightbox(screenshots[idx].imageUrl)}
          >
            <img
              src={screenshots[idx].imageUrl}
              alt={screenshots[idx].caption || `Mensagem ${idx + 1}`}
              className="h-full w-auto max-w-full object-contain rounded-lg"
              style={{
                opacity: visible ? 1 : 0,
                transition: "opacity 0.25s ease",
              }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end justify-center pb-4">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
                Clique para ampliar
              </span>
            </div>
          </div>

          {/* Caption */}
          {screenshots[idx].caption && (
            <p className="text-xs text-center text-muted-foreground mt-2">{screenshots[idx].caption}</p>
          )}
        </div>

        {/* Dots + arrows */}
        {screenshots.length > 1 && (
          <div className="flex items-center justify-between gap-3">
            <button onClick={() => go(-1)}
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center justify-center gap-1.5">
              {screenshots.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`rounded-full transition-all duration-300 ${i === idx ? "w-5 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-border hover:bg-muted-foreground/40"}`}
                />
              ))}
            </div>
            <button onClick={() => go(1)}
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightbox}
            alt="Mensagem ampliada"
            className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

type Stage = "idle" | "loading" | "pix" | "approved" | "error";

interface PixData {
  payment_id: number;
  qr_code: string;
  qr_code_base64: string;
}

const ProdutoPage = () => {
  const { id } = useParams<{ id: string }>();
  const { content } = useContent();
  const { produtosDigitais, identity } = content;

  const index = Number(id);
  const produto = produtosDigitais.items[index];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [freeEligible, setFreeEligible] = useState<boolean | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  if (!produto) return <Navigate to="/" replace />;

  const startPolling = (paymentId: number) => {
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/check-payment-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payment_id: paymentId }),
        });
        const data = await res.json();
        if (data.status === "approved") {
          clearInterval(pollingRef.current!);
          setStage("approved");
        }
      } catch (_) { /* keep polling */ }
    }, 3000);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setErrorMsg("Informe seu nome completo.");
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg("Informe um email válido.");
      return;
    }
    if (!validateCpf(cpf)) {
      setErrorMsg("CPF inválido. Verifique e tente novamente.");
      return;
    }
    if (!produto.priceAmount || produto.priceAmount <= 0) {
      setErrorMsg("Preço não configurado. Entre em contato.");
      return;
    }

    setStage("loading");
    setErrorMsg("");

    // Check CPF eligibility for free consultation
    try {
      const eligRes = await fetch(`${SUPABASE_URL}/functions/v1/check-cpf-eligible`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf }),
      });
      const eligData = await eligRes.json();
      setFreeEligible(eligData.eligible !== false);
    } catch {
      setFreeEligible(true); // allow on error
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-pix-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIndex: index,
          productName: produto.name,
          priceAmount: produto.priceAmount,
          customerEmail: email,
          pdfUrl: produto.pdfUrl || "",
          customerName: name,
          customerCpf: cpf,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.qr_code) {
        throw new Error(data.error || "Erro ao gerar Pix.");
      }

      setPixData({ payment_id: data.payment_id, qr_code: data.qr_code, qr_code_base64: data.qr_code_base64 });
      setStage("pix");
      startPolling(data.payment_id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado.";
      setErrorMsg(msg);
      setStage("error");
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  };

  const handleCopy = () => {
    if (!pixData?.qr_code) return;
    navigator.clipboard.writeText(pixData.qr_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCancel = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setPixData(null);
    setStage("idle");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <span className="font-display font-bold text-primary text-sm truncate">{identity.brandName}</span>
          <div className="w-24 sm:w-auto" />
        </div>
      </header>

      <main className="flex-1 py-12 md:py-20">
        <div className="container mx-auto px-4 max-w-5xl">

          {/* PIX STAGE */}
          {stage === "pix" && pixData && (
            <div className="max-w-md mx-auto">
              <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-lg">
                {/* Header */}
                <div className="bg-primary/5 border-b border-border px-6 py-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-primary mb-0.5">Pague via Pix</p>
                    <p className="font-display text-xl font-bold text-foreground">{produto.price}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl">Pix</span>
                  </div>
                </div>

                <div className="px-6 py-6 space-y-5">
                  {/* QR Code */}
                  {pixData.qr_code_base64 ? (
                    <div className="flex flex-col items-center gap-3">
                      <img
                        src={`data:image/png;base64,${pixData.qr_code_base64}`}
                        alt="QR Code Pix"
                        className="w-52 h-52 rounded-xl border border-border p-2 bg-white"
                      />
                      <p className="text-xs text-muted-foreground text-center">Escaneie com o app do seu banco</p>
                    </div>
                  ) : null}

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground font-medium">ou use o código abaixo</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Copia e Cola */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground uppercase tracking-wide">Pix Copia e Cola</Label>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-muted rounded-xl px-3 py-2 text-xs text-muted-foreground font-mono overflow-hidden">
                        <p className="truncate">{pixData.qr_code}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={copied ? "default" : "outline"}
                        className="rounded-xl shrink-0 gap-1.5"
                        onClick={handleCopy}
                      >
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Copiado!" : "Copiar"}
                      </Button>
                    </div>
                  </div>

                  {/* Waiting indicator */}
                  <div className="flex items-center justify-center gap-2 py-3 bg-primary/5 rounded-2xl">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                    </span>
                    <span className="text-sm text-primary font-medium">Aguardando pagamento...</span>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    O e-book será enviado para <strong>{email}</strong> automaticamente após a confirmação.
                  </p>

                  {/* Cancel */}
                  <button
                    onClick={handleCancel}
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    <X className="h-3 w-3" />
                    Cancelar e voltar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* APPROVED STAGE */}
          {stage === "approved" && (
            <div className="max-w-sm mx-auto">
              <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                {/* Green top bar */}
                <div className="h-1.5 bg-primary w-full" />

                <div className="px-8 py-10 flex flex-col items-center text-center gap-6">
                  {/* Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-primary" />
                  </div>

                  {/* Text */}
                  <div className="space-y-2">
                    <h2 className="font-display text-2xl font-bold text-foreground tracking-tight">
                      Pagamento confirmado
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Seu e-book foi enviado para
                    </p>
                    <p className="text-sm font-semibold text-foreground bg-muted px-3 py-1.5 rounded-lg inline-block">
                      {email}
                    </p>
                  </div>

                  {/* Info pill */}
                  <div className="w-full rounded-xl bg-primary/5 border border-primary/10 px-4 py-3 text-xs text-primary/80 leading-relaxed">
                    Verifique sua caixa de entrada e a pasta de spam caso não encontre o email.
                  </div>

                  {/* Free consultation CTA */}
                  {freeEligible === true ? (
                    <div className="w-full rounded-xl border border-border bg-muted/40 px-4 py-4 space-y-2 text-center">
                      <p className="text-sm font-semibold text-foreground">Sua consulta gratuita de 20 min</p>
                      <p className="text-xs text-muted-foreground">Como bônus da sua compra, agende agora sua consulta grátis com Fillipe David.</p>
                      <Button asChild size="sm" className="rounded-full gap-2 w-full mt-1">
                        <Link to="/agendar/0?free=1">Agendar consulta gratuita</Link>
                      </Button>
                    </div>
                  ) : freeEligible === false ? (
                    <div className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
                      <p className="text-xs text-amber-800 leading-relaxed">
                        Este CPF já utilizou a consulta gratuita em uma compra anterior. O e-book foi enviado normalmente para seu email.
                      </p>
                    </div>
                  ) : null}

                  {/* Back */}
                  <Button asChild variant="ghost" size="sm" className="rounded-full gap-2 w-full text-muted-foreground">
                    <Link to="/">
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Voltar ao início
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* IDLE / LOADING / ERROR STAGE — Product page */}
          {(stage === "idle" || stage === "loading" || stage === "error") && (
            <>
              <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
                {/* Image */}
                <div className="aspect-[4/3] rounded-2xl lg:rounded-3xl overflow-hidden bg-gradient-to-br from-secondary/40 to-green-light shadow-lg flex items-center justify-center">
                  {produto.imageUrl ? (
                    <img src={produto.imageUrl} alt={produto.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-4 p-10 text-center">
                      <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-10 w-10 text-primary/50" />
                      </div>
                      <span className="text-muted-foreground text-sm">Imagem do produto</span>
                    </div>
                  )}
                </div>

                {/* Info + Checkout */}
                <div className="space-y-6">
                  {produto.badge && (
                    <Badge className="bg-gold text-foreground border-gold/30 px-3 py-1 text-xs font-semibold">
                      {produto.badge}
                    </Badge>
                  )}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-primary">Produto Digital</p>
                    <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground leading-tight">{produto.name}</h1>
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-base">{produto.desc}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-primary">{produto.price}</span>
                    <span className="text-sm text-muted-foreground">pagamento único</span>
                  </div>

                  {/* Free consultation badge */}
                  <div className="flex items-start gap-3 rounded-xl bg-primary/5 border border-primary/15 px-4 py-3">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground leading-snug">
                      <span className="font-semibold">Ganhe uma consulta gratuita de 20 min</span>
                      {" "}— após a compra, você receberá um link para agendar com Fillipe David.
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleCheckout} className="space-y-3 pt-2 border-t border-border/50">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-sm font-medium text-foreground">
                        Nome completo
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="name"
                          type="text"
                          placeholder="Seu nome completo"
                          value={name}
                          onChange={(e) => { setName(e.target.value); setErrorMsg(""); }}
                          className="pl-9 rounded-xl"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-sm font-medium text-foreground">
                        Email para receber o e-book
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="seu@email.com"
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); }}
                          className="pl-9 rounded-xl"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cpf" className="text-sm font-medium text-foreground">
                        CPF
                      </Label>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="cpf"
                          type="text"
                          placeholder="000.000.000-00"
                          value={cpf}
                          onChange={(e) => { setCpf(maskCpf(e.target.value)); setErrorMsg(""); }}
                          className="pl-9 rounded-xl"
                          inputMode="numeric"
                          maxLength={14}
                          required
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Usado apenas para verificar elegibilidade da consulta gratuita.</p>
                      {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
                    </div>

                    <Button type="submit" size="lg" className="rounded-full gap-2 w-full font-semibold" disabled={stage === "loading"}>
                      {stage === "loading" ? (
                        <><Loader2 className="h-4 w-4 animate-spin" />Gerando Pix...</>
                      ) : (
                        <>Gerar Pix — {produto.price}</>
                      )}
                    </Button>

                    <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground/70">
                      <span>Pagamento seguro</span>
                      <span className="w-px h-3 bg-border" />
                      <span>PDF enviado por email</span>
                    </div>
                  </form>
                </div>
              </div>

              {/* Description + Screenshots — two-column on desktop */}
              <div className="mt-14 md:mt-20 border-t border-border/50 pt-12">
                <div className={produto.screenshots && produto.screenshots.length > 0
                  ? "grid lg:grid-cols-2 gap-10 lg:gap-16 items-start"
                  : "max-w-2xl"
                }>

                  {/* Left: Sobre + Incluso */}
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <h2 className="font-display text-xl md:text-2xl font-bold text-foreground">Sobre este produto</h2>
                      <p className="text-muted-foreground leading-relaxed text-base">{produto.longDesc || produto.desc}</p>
                    </div>
                    {produto.details && produto.details.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="font-semibold text-foreground">O que está incluso</h3>
                        <ul className="space-y-2.5">
                          {produto.details.map((detail, i) => (
                            <li key={i} className="flex items-start gap-2.5">
                              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              <span className="text-muted-foreground text-sm leading-relaxed">{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Right: Screenshots Carousel */}
                  {produto.screenshots && produto.screenshots.length > 0 && (
                    <div className="space-y-4 lg:sticky lg:top-24">
                      {/* Header — mesmo nível tipográfico que "Sobre este produto" */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h2 className="font-display text-xl md:text-2xl font-bold text-foreground">O que dizem quem comprou</h2>
                          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <MessageCircle className="h-3.5 w-3.5 text-green-500" />
                            {produto.screenshots!.length === 1 ? "1 mensagem real" : `${produto.screenshots!.length} mensagens reais`}
                          </p>
                        </div>
                      </div>
                      <ScreenshotsCarousel screenshots={produto.screenshots} />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-border/50 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {identity.brandName} · {identity.doctorName} · {identity.crn}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ProdutoPage;
