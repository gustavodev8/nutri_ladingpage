import { useEffect, useState } from "react";
import { Send, Users, Mail, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

// Simple markdown-ish to HTML converter for the message body
function toHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map(p => `<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">${
      p.replace(/\n/g, "<br>")
       .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
       .replace(/\*(.*?)\*/g, "<em>$1</em>")
    }</p>`)
    .join("");
}

const AdminDisparo = () => {
  const [subject, setSubject]         = useState("");
  const [message, setMessage]         = useState("");
  const [preview, setPreview]         = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [status, setStatus]           = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult]           = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [errorMsg, setErrorMsg]       = useState("");
  const [confirmed, setConfirmed]     = useState(false);

  // Load recipient count on mount
  useEffect(() => {
    const load = async () => {
      const [{ data: logs }, { data: bookings }, { data: patients }] = await Promise.all([
        supabase.from("payment_logs").select("customer_email").eq("status", "approved"),
        supabase.from("bookings").select("client_email").neq("status", "cancelled"),
        supabase.from("patients").select("email"),
      ]);
      const set = new Set<string>();
      for (const r of logs     ?? []) if (r.customer_email) set.add(r.customer_email.trim().toLowerCase());
      for (const r of bookings ?? []) if (r.client_email)   set.add(r.client_email.trim().toLowerCase());
      for (const r of patients ?? []) if (r.email)           set.add(r.email.trim().toLowerCase());
      setRecipientCount([...set].filter(e => e.includes("@")).length);
    };
    load();
  }, []);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) return;
    setStatus("loading");
    setErrorMsg("");
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-broadcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ subject: subject.trim(), html: toHtml(message), previewText: subject }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao disparar.");

      setResult(data);
      setStatus("success");
      setConfirmed(false);
    } catch (e) {
      setErrorMsg(String(e));
      setStatus("error");
    }
  };

  const canSend = subject.trim() && message.trim() && status !== "loading";

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Send className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Disparo de E-mails</h1>
          <p className="text-sm text-muted-foreground">Envie uma mensagem para todos os contatos cadastrados</p>
        </div>
      </div>

      {/* Recipient count badge */}
      <div className="flex items-center gap-3 rounded-2xl bg-card border border-border p-4">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Users className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Destinatários</p>
          {recipientCount === null ? (
            <p className="text-sm text-muted-foreground">Calculando...</p>
          ) : (
            <p className="text-base font-bold text-foreground">
              {recipientCount} contato{recipientCount !== 1 ? "s" : ""} únicos
            </p>
          )}
        </div>
        <p className="ml-auto text-xs text-muted-foreground text-right leading-relaxed">
          Inclui e-mails de<br />compras, consultas e pacientes
        </p>
      </div>

      {/* Composer */}
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
              className="min-h-[200px] rounded-xl border border-border bg-muted/30 p-4 text-sm prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: toHtml(message) || '<p class="text-muted-foreground italic">Nenhum conteúdo ainda.</p>' }}
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

      {/* Confirm + Send */}
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
              Confirmo que li a mensagem e autorizo o disparo para{" "}
              <strong className="text-foreground">{recipientCount ?? "—"} contatos</strong>.
            </span>
          </label>

          <Button
            onClick={handleSend}
            disabled={!canSend || !confirmed}
            className={cn("w-full rounded-full gap-2", !confirmed && "opacity-50")}
          >
            {status === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Disparar para {recipientCount ?? "—"} contatos
              </>
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
            {" "}de um total de <strong>{result.total}</strong> contatos.
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
