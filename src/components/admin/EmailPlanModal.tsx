import { useState } from "react";
import { X, FileText, Send, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { generateMealPlanPdf } from "@/lib/generateMealPlanPdf";
import type { MealPlan, Meal, Patient } from "@/lib/supabase";

interface Props {
  plan: MealPlan;
  meals: Meal[];
  patient: Patient | null;
  onClose: () => void;
}

export function EmailPlanModal({ plan, meals, patient, onClose }: Props) {
  const [to, setTo]           = useState(patient?.email ?? "");
  const [subject, setSubject] = useState(`${plan.title} — ${patient?.name ?? "Paciente"}`);
  const [body, setBody]       = useState(
    `Olá${patient?.name ? `, ${patient.name.split(" ")[0]}` : ""}!\n\nSegue em anexo seu plano alimentar personalizado.\n\nQualquer dúvida estou à disposição.\n\nAbraços!`
  );
  const [sending, setSending] = useState(false);

  const pdfFilename = `plano-${plan.title.toLowerCase().replace(/\s+/g, "-")}-${patient?.name?.split(" ")[0]?.toLowerCase() ?? "paciente"}.pdf`;

  const handleSend = async () => {
    if (!to.trim()) { toast.error("Informe o e-mail do destinatário."); return; }

    setSending(true);
    try {
      // 1. Gera o PDF e converte para base64
      const doc    = generateMealPlanPdf(plan, meals, patient);
      const pdfB64 = doc.output("datauristring").split(",")[1]; // remove prefixo data:...;base64,

      // 2. Chama a edge function send-material
      const { data, error } = await supabase.functions.invoke("send-material", {
        body: {
          to:          to.trim(),
          client_name: patient?.name ?? undefined,
          subject,
          body,
          attachments: [{ filename: pdfFilename, content: pdfB64 }],
        },
      });

      if (error || !data?.success) {
        throw new Error(error?.message ?? data?.error ?? "Falha ao enviar.");
      }

      toast.success("E-mail enviado com sucesso!");
      onClose();
    } catch (e) {
      toast.error(`Erro ao enviar: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !sending) onClose(); }}
    >
      <div className="bg-background border border-border rounded-2xl shadow-xl w-full max-w-lg flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Mail className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Enviar plano por e-mail</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">

          {/* Para */}
          <div className="flex items-center gap-3 border-b border-border/60 pb-3">
            <span className="text-xs text-muted-foreground w-12 shrink-0">Para</span>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@exemplo.com"
              className="flex-1 text-sm bg-transparent focus:outline-none text-foreground placeholder:text-muted-foreground/40"
            />
          </div>

          {/* Assunto */}
          <div className="flex items-center gap-3 border-b border-border/60 pb-3">
            <span className="text-xs text-muted-foreground w-12 shrink-0">Assunto</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Assunto do e-mail"
              className="flex-1 text-sm bg-transparent focus:outline-none text-foreground placeholder:text-muted-foreground/40"
            />
          </div>

          {/* Mensagem */}
          <textarea
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Mensagem..."
            className="w-full text-sm bg-transparent focus:outline-none text-foreground placeholder:text-muted-foreground/40 resize-none"
          />

          {/* Anexo — PDF auto-gerado */}
          <div className="border-t border-border/60 pt-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Anexo</p>
            <div className="flex items-center gap-2.5 bg-muted/40 border border-border/60 rounded-lg px-3 py-2">
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">{pdfFilename}</p>
                <p className="text-[10px] text-muted-foreground">PDF · gerado automaticamente</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="h-9 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !to.trim()}
            className="h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {sending ? "Enviando…" : "Enviar"}
          </button>
        </div>

      </div>
    </div>
  );
}
