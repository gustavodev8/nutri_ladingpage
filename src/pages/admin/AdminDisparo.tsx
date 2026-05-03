import { useEffect, useState, useCallback } from "react";
import {
  Send, Users, Mail, Eye, EyeOff, Loader2, CheckCircle2,
  AlertCircle, Filter, ShoppingBag, CalendarCheck, UserRound, PenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useContent } from "@/contexts/ContentContext";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

function escHtml(s: string) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#x27;");
}

function toHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map(p => `<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">${
      escHtml(p).replace(/\n/g,"<br>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\*(.*?)\*/g,"<em>$1</em>")
    }</p>`)
    .join("");
}

type Source = "ebooks" | "bookings" | "patients";
type Period = 0 | 30 | 90 | 365;

const PERIOD_LABELS: Record<Period, string> = {
  0:   "Todo o período",
  30:  "Últimos 30 dias",
  90:  "Últimos 90 dias",
  365: "Último ano",
};

const AdminDisparo = () => {
  const { content } = useContent();
  const products = content.produtosDigitais?.items ?? [];

  // ── Filters ──────────────────────────────────────────────────────────────
  const [sources, setSources]     = useState<Source[]>(["ebooks","bookings","patients"]);
  const [period, setPeriod]       = useState<Period>(0);
  const [productName, setProductName] = useState("");
  const [manualInput, setManualInput] = useState("");

  // ── Composer ─────────────────────────────────────────────────────────────
  const [subject, setSubject]   = useState("");
  const [message, setMessage]   = useState("");
  const [preview, setPreview]   = useState(false);

  // ── State ─────────────────────────────────────────────────────────────────
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [countLoading, setCountLoading]     = useState(false);
  const [status, setStatus]   = useState<"idle"|"loading"|"success"|"error">("idle");
  const [result, setResult]   = useState<{sent:number;failed:number;total:number}|null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const toggleSource = (s: Source) =>
    setSources(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  // ── Count recipients matching current filters ────────────────────────────
  const recalcCount = useCallback(async () => {
    setCountLoading(true);
    const since = period > 0
      ? new Date(Date.now() - period * 86400 * 1000).toISOString()
      : null;

    const emailSet = new Set<string>();

    if (sources.includes("ebooks")) {
      let q = supabase.from("payment_logs").select("customer_email").eq("status","approved");
      if (since) q = q.gte("created_at", since);
      if (productName) q = q.ilike("product_name", `%${productName}%`);
      const { data } = await q;
      for (const r of data ?? []) if (r.customer_email) emailSet.add(r.customer_email.trim().toLowerCase());
    }

    if (sources.includes("bookings")) {
      let q = supabase.from("bookings").select("client_email").neq("status","cancelled");
      if (since) q = q.gte("created_at", since);
      const { data } = await q;
      for (const r of data ?? []) if (r.client_email) emailSet.add(r.client_email.trim().toLowerCase());
    }

    if (sources.includes("patients")) {
      let q = supabase.from("patients").select("email");
      if (since) q = q.gte("created_at", since);
      const { data } = await q;
      for (const r of data ?? []) if (r.email) emailSet.add(r.email.trim().toLowerCase());
    }

    for (const e of manualInput.split(/[\n,;]+/)) {
      const clean = e.trim().toLowerCase();
      if (clean.includes("@")) emailSet.add(clean);
    }

    setRecipientCount([...emailSet].filter(e => e.includes("@")).length);
    setCountLoading(false);
  }, [sources, period, productName, manualInput]);

  useEffect(() => { recalcCount(); }, [recalcCount]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) return;
    setStatus("loading");
    setErrorMsg("");
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!SUPABASE_URL) throw new Error("VITE_SUPABASE_URL não configurada.");

      const manualEmails = manualInput
        .split(/[\n,;]+/)
        .map(e => e.trim().toLowerCase())
        .filter(e => e.includes("@"));

      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-broadcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY as string,
          Authorization: `Bearer ${token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          subject: subject.trim(),
          html: toHtml(message),
          previewText: subject,
          filters: {
            sources,
            periodDays: period > 0 ? period : null,
            productName: productName || null,
            manualEmails,
          },
        }),
      });

      const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);

      setResult(data);
      setStatus("success");
      setConfirmed(false);
    } catch (e) {
      setErrorMsg(String(e));
      setStatus("error");
    }
  };

  const canSend = subject.trim() && message.trim() && sources.length > 0 && status !== "loading";

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Send className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Disparo de E-mails</h1>
          <p className="text-sm text-muted-foreground">Envie mensagens segmentadas para seus contatos</p>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-card border border-border p-5 space-y-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Filter className="h-4 w-4 text-primary" />
          Filtros de destinatários
        </div>

        {/* Sources */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Origem</p>
          <div className="flex flex-wrap gap-2">
            {([
              { key: "ebooks",   label: "Compradores de e-books", icon: ShoppingBag },
              { key: "bookings", label: "Consultas agendadas",     icon: CalendarCheck },
              { key: "patients", label: "Pacientes cadastrados",   icon: UserRound },
            ] as { key: Source; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => { toggleSource(key); setConfirmed(false); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  sources.includes(key)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border hover:border-primary/40"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Period */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Período</p>
          <div className="flex flex-wrap gap-2">
            {([0, 30, 90, 365] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => { setPeriod(p); setConfirmed(false); }}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  period === p
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border hover:border-primary/40"
                )}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Product filter — only if ebooks selected */}
        {sources.includes("ebooks") && products.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Produto específico</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setProductName(""); setConfirmed(false); }}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  !productName
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border hover:border-primary/40"
                )}
              >
                Todos os produtos
              </button>
              {products.map((p, i) => (
                <button
                  key={i}
                  onClick={() => { setProductName(p.name); setConfirmed(false); }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    productName === p.name
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border hover:border-primary/40"
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Manual emails */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <PenLine className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">E-mails manuais (opcional)</p>
          </div>
          <Textarea
            value={manualInput}
            onChange={e => { setManualInput(e.target.value); setConfirmed(false); }}
            placeholder={"cliente1@email.com\ncliente2@email.com"}
            className="rounded-xl resize-none text-xs font-mono min-h-[72px]"
            rows={3}
          />
          <p className="text-xs text-muted-foreground">Separe por vírgula, ponto e vírgula ou nova linha.</p>
        </div>

        {/* Recipient count */}
        <div className="flex items-center gap-3 rounded-xl bg-muted/50 border border-border/50 px-4 py-3">
          <Users className="h-4 w-4 text-primary shrink-0" />
          {countLoading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Calculando...
            </p>
          ) : (
            <p className="text-sm font-semibold text-foreground">
              {recipientCount ?? 0} destinatário{recipientCount !== 1 ? "s" : ""} únicos
              {sources.length === 0 && <span className="font-normal text-muted-foreground"> — selecione ao menos uma origem</span>}
            </p>
          )}
        </div>
      </div>

      {/* ── Composer ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-card border border-border p-6 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="subject" className="text-sm font-medium">Assunto</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="subject"
              value={subject}
              onChange={e => { setSubject(e.target.value); setStatus("idle"); }}
              placeholder="Ex: Novidade exclusiva para você!"
              className="pl-9 rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="message" className="text-sm font-medium">Mensagem</Label>
            <button
              type="button"
              onClick={() => setPreview(p => !p)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {preview ? "Editar" : "Pré-visualizar"}
            </button>
          </div>

          {preview ? (
            <div
              className="min-h-[200px] rounded-xl border border-border bg-muted/30 p-4 text-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: toHtml(message) || '<p style="color:#9ca3af;font-style:italic;">Nenhum conteúdo ainda.</p>' }}
            />
          ) : (
            <Textarea
              id="message"
              value={message}
              onChange={e => { setMessage(e.target.value); setStatus("idle"); }}
              placeholder={"Olá!\n\nEscreva sua mensagem aqui...\n\nUse **negrito** ou *itálico* para formatar."}
              className="rounded-xl resize-none min-h-[200px] font-mono text-sm"
              rows={10}
            />
          )}
          <p className="text-xs text-muted-foreground">Suporte a **negrito**, *itálico* e quebras de parágrafo.</p>
        </div>
      </div>

      {/* ── Confirm + Send ───────────────────────────────────────────────── */}
      {status !== "success" && (
        <div className="rounded-2xl bg-card border border-border p-5 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
            />
            <span className="text-sm text-muted-foreground leading-snug">
              Confirmo o disparo para{" "}
              <strong className="text-foreground">{recipientCount ?? "—"} destinatários</strong>
              {productName && <> — produto: <Badge variant="outline" className="text-xs">{productName}</Badge></>}
              {period > 0 && <> — {PERIOD_LABELS[period].toLowerCase()}</>}.
            </span>
          </label>

          <Button
            onClick={handleSend}
            disabled={!canSend || !confirmed || (recipientCount ?? 0) === 0}
            className={cn("w-full rounded-full gap-2", (!confirmed || (recipientCount ?? 0) === 0) && "opacity-50")}
          >
            {status === "loading" ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Enviando...</>
            ) : (
              <><Send className="h-4 w-4" />Disparar para {recipientCount ?? "—"} contatos</>
            )}
          </Button>
        </div>
      )}

      {/* Result */}
      {status === "success" && result && (
        <div className="rounded-2xl bg-green-50 border border-green-200 p-5 space-y-1">
          <div className="flex items-center gap-2 text-green-700 font-semibold">
            <CheckCircle2 className="h-5 w-5" />
            Disparo concluído!
          </div>
          <p className="text-sm text-green-700">
            <strong>{result.sent}</strong> enviados com sucesso
            {result.failed > 0 && <>, <strong>{result.failed}</strong> com falha</>}
            {" "}de <strong>{result.total}</strong> destinatários.
          </p>
          <button
            onClick={() => { setStatus("idle"); setResult(null); setSubject(""); setMessage(""); setConfirmed(false); }}
            className="text-xs text-green-600 underline underline-offset-2 hover:text-green-800 transition-colors mt-1"
          >
            Novo disparo
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="rounded-2xl bg-destructive/10 border border-destructive/20 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">Erro no disparo</p>
            <p className="text-xs text-destructive/80 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDisparo;
