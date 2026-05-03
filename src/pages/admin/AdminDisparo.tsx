import { useEffect, useState, useCallback } from "react";
import {
  Send, Users, Mail, Eye, EyeOff, Loader2, CheckCircle2,
  AlertCircle, ShoppingBag, CalendarCheck, UserRound, PenLine,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 0,   label: "Todo o período" },
  { value: 30,  label: "Últimos 30 dias" },
  { value: 90,  label: "Últimos 90 dias" },
  { value: 365, label: "Último ano" },
];

const SOURCE_OPTIONS: { key: Source; label: string; desc: string; icon: React.ElementType }[] = [
  { key: "ebooks",   label: "Compradores de e-books",  desc: "Clientes que realizaram compras aprovadas", icon: ShoppingBag },
  { key: "bookings", label: "Consultas agendadas",      desc: "Pacientes com consultas não canceladas",    icon: CalendarCheck },
  { key: "patients", label: "Pacientes cadastrados",    desc: "Cadastros no prontuário clínico",           icon: UserRound },
];

// ── Small toggle chip ─────────────────────────────────────────────────────────
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 px-3.5 rounded-md text-xs font-medium border transition-all duration-150",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

const AdminDisparo = () => {
  const { content } = useContent();
  const products = content.produtosDigitais?.items ?? [];

  const [sources, setSources]         = useState<Source[]>(["ebooks","bookings","patients"]);
  const [period, setPeriod]           = useState<Period>(0);
  const [productName, setProductName] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [showManual, setShowManual]   = useState(false);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);

  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [countLoading, setCountLoading]     = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [status, setStatus]     = useState<"idle"|"loading"|"success"|"error">("idle");
  const [result, setResult]     = useState<{sent:number;failed:number;total:number}|null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const toggleSource = (s: Source) => {
    setSources(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
    setConfirmed(false);
  };

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
      const c = e.trim().toLowerCase();
      if (c.includes("@")) emailSet.add(c);
    }

    setRecipientCount([...emailSet].filter(e => e.includes("@")).length);
    setCountLoading(false);
  }, [sources, period, productName, manualInput]);

  useEffect(() => { recalcCount(); }, [recalcCount]);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) return;
    setStatus("loading"); setErrorMsg(""); setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!SUPABASE_URL) throw new Error("VITE_SUPABASE_URL não configurada.");

      const manualEmails = manualInput.split(/[\n,;]+/).map(e => e.trim().toLowerCase()).filter(e => e.includes("@"));

      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-broadcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY as string,
          Authorization: `Bearer ${token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          subject: subject.trim(), html: toHtml(message), previewText: subject,
          filters: { sources, periodDays: period > 0 ? period : null, productName: productName || null, manualEmails },
        }),
      });

      const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
      setResult(data); setStatus("success"); setConfirmed(false);
    } catch (e) {
      setErrorMsg(String(e)); setStatus("error");
    }
  };

  const canSend = subject.trim() && message.trim() && sources.length > 0 && status !== "loading";

  return (
    <div className="max-w-2xl space-y-5">

      {/* ── Page title ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Disparo de E-mails</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Crie e envie campanhas segmentadas para sua base de contatos.</p>
      </div>

      {/* ── Step 1 — Audience ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Card header — clickable to collapse */}
        <button
          type="button"
          onClick={() => setFiltersOpen(v => !v)}
          className={cn(
            "w-full flex items-center gap-3 px-6 py-4 bg-muted/30 text-left hover:bg-muted/50 transition-colors",
            filtersOpen && "border-b border-border"
          )}
        >
          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">1</div>
          <div>
            <p className="text-sm font-semibold text-foreground">Audiência</p>
            <p className="text-xs text-muted-foreground">Defina quem vai receber este e-mail</p>
          </div>
          {/* Live count pill */}
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-primary/8 border border-primary/20 rounded-full px-3 py-1">
              {countLoading
                ? <Loader2 className="h-3 w-3 animate-spin text-primary" />
                : <Users className="h-3 w-3 text-primary" />}
              <span className="text-xs font-semibold text-primary tabular-nums">
                {countLoading ? "..." : (recipientCount ?? 0)} destinatários
              </span>
            </div>
            {filtersOpen
              ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
          </div>
        </button>

        {filtersOpen && <div className="px-6 py-5 space-y-6">

          {/* Origem */}
          <div>
            <SectionLabel>Origem dos contatos</SectionLabel>
            <div className="space-y-2">
              {SOURCE_OPTIONS.map(({ key, label, desc, icon: Icon }) => {
                const active = sources.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleSource(key)}
                    className={cn(
                      "w-full flex items-center gap-4 rounded-xl border px-4 py-3 text-left transition-all duration-150",
                      active
                        ? "border-primary/40 bg-primary/5"
                        : "border-border bg-background hover:border-border/80 hover:bg-muted/30"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                      active ? "bg-primary/15" : "bg-muted"
                    )}>
                      <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium", active ? "text-foreground" : "text-muted-foreground")}>{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                      active ? "border-primary bg-primary" : "border-border bg-background"
                    )}>
                      {active && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Período */}
          <div>
            <SectionLabel>Período de cadastro</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {PERIOD_OPTIONS.map(({ value, label }) => (
                <Chip key={value} active={period === value} onClick={() => { setPeriod(value); setConfirmed(false); }}>
                  {label}
                </Chip>
              ))}
            </div>
          </div>

          {/* Produto — only shown if ebooks selected and products exist */}
          {sources.includes("ebooks") && products.length > 0 && (
            <div>
              <SectionLabel>Filtrar por produto</SectionLabel>
              <div className="flex flex-wrap gap-2">
                <Chip active={!productName} onClick={() => { setProductName(""); setConfirmed(false); }}>
                  Todos os produtos
                </Chip>
                {products.map((p, i) => (
                  <Chip key={i} active={productName === p.name} onClick={() => { setProductName(p.name); setConfirmed(false); }}>
                    {p.name}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {/* Manual emails — collapsible */}
          <div>
            <button
              type="button"
              onClick={() => setShowManual(v => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <PenLine className="h-3.5 w-3.5" />
              Adicionar e-mails manualmente
              {showManual ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {showManual && (
              <div className="mt-3 space-y-1.5">
                <Textarea
                  value={manualInput}
                  onChange={e => { setManualInput(e.target.value); setConfirmed(false); }}
                  placeholder={"cliente1@email.com\ncliente2@email.com"}
                  className="rounded-xl resize-none text-xs font-mono min-h-[80px]"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Separe por vírgula, ponto e vírgula ou nova linha. Serão adicionados aos filtros acima.</p>
              </div>
            )}
          </div>
        </div>}
      </div>

      {/* ── Step 2 — Message ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">2</div>
          <div>
            <p className="text-sm font-semibold text-foreground">Mensagem</p>
            <p className="text-xs text-muted-foreground">Escreva o conteúdo do e-mail</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="subject" className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Assunto</Label>
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

          {/* Body */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="message" className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Corpo do e-mail</Label>
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
                className="min-h-[200px] rounded-xl border border-border bg-white p-5 text-sm shadow-inner"
                dangerouslySetInnerHTML={{ __html: toHtml(message) || '<p style="color:#9ca3af;font-style:italic;margin:0;">Nenhum conteúdo ainda.</p>' }}
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
            <p className="text-xs text-muted-foreground">Suporte a **negrito** e *itálico*.</p>
          </div>
        </div>
      </div>

      {/* ── Step 3 — Confirm & Send ─────────────────────────────────────── */}
      {status !== "success" && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">3</div>
            <div>
              <p className="text-sm font-semibold text-foreground">Revisar e enviar</p>
              <p className="text-xs text-muted-foreground">Confirme antes de disparar</p>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Summary */}
            <div className="rounded-xl bg-muted/40 border border-border/60 divide-y divide-border/60">
              <div className="flex items-center justify-between px-4 py-2.5 text-xs">
                <span className="text-muted-foreground">Destinatários</span>
                <span className="font-semibold text-foreground tabular-nums">{recipientCount ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 text-xs">
                <span className="text-muted-foreground">Origens</span>
                <span className="font-medium text-foreground">
                  {sources.length === 0
                    ? "—"
                    : SOURCE_OPTIONS.filter(s => sources.includes(s.key)).map(s => s.label).join(", ")}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 text-xs">
                <span className="text-muted-foreground">Período</span>
                <span className="font-medium text-foreground">
                  {PERIOD_OPTIONS.find(p => p.value === period)?.label}
                </span>
              </div>
              {productName && (
                <div className="flex items-center justify-between px-4 py-2.5 text-xs">
                  <span className="text-muted-foreground">Produto</span>
                  <span className="font-medium text-foreground">{productName}</span>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-2.5 text-xs">
                <span className="text-muted-foreground">Assunto</span>
                <span className="font-medium text-foreground truncate max-w-[200px]">{subject || "—"}</span>
              </div>
            </div>

            {/* Confirm checkbox */}
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary shrink-0"
              />
              <span className="text-sm text-muted-foreground leading-snug">
                Confirmo que revisei o conteúdo e autorizo o envio para{" "}
                <strong className="text-foreground">{recipientCount ?? "—"} destinatários</strong>.
              </span>
            </label>

            {sources.length === 0 && (
              <p className="text-xs text-destructive flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                Selecione ao menos uma origem de contatos.
              </p>
            )}

            <Button
              onClick={handleSend}
              disabled={!canSend || !confirmed || (recipientCount ?? 0) === 0}
              className="w-full gap-2"
              size="lg"
            >
              {status === "loading"
                ? <><Loader2 className="h-4 w-4 animate-spin" />Enviando…</>
                : <><Send className="h-4 w-4" />Disparar para {recipientCount ?? "—"} contatos</>}
            </Button>
          </div>
        </div>
      )}

      {/* ── Success ─────────────────────────────────────────────────────── */}
      {status === "success" && result && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-6 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-800">Campanha enviada com sucesso</p>
              <p className="text-xs text-green-700">
                <strong>{result.sent}</strong> e-mails entregues
                {result.failed > 0 && <> · <strong>{result.failed}</strong> com falha</>}
                {" "}de <strong>{result.total}</strong> destinatários.
              </p>
            </div>
          </div>
          <button
            onClick={() => { setStatus("idle"); setResult(null); setSubject(""); setMessage(""); setConfirmed(false); }}
            className="text-xs text-green-700 underline underline-offset-2 hover:text-green-900 transition-colors"
          >
            Criar novo disparo
          </button>
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {status === "error" && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 flex items-start gap-3">
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
