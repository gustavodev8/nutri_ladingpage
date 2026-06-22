import { useState } from "react";
import { X, FileText, Send, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { generatePatientReportPdf } from "@/lib/generatePatientReportPdf";
import type { Patient, PatientReport } from "@/lib/supabase";

interface Props {
  patient: Patient;
  report: PatientReport;
  onClose: () => void;
}

export function EmailPatientReportModal({ patient, report, onClose }: Props) {
  const [to, setTo] = useState(patient.email ?? "");
  const [subject, setSubject] = useState(`${report.title} — ${patient.name}`);
  const [body, setBody] = useState(
    `Olá${patient.name ? `, ${patient.name.split(" ")[0]}` : ""}!\n\nSegue em anexo seu relatório clínico personalizado.\n\nQualquer dúvida, estou à disposição.\n\nAbraços!`
  );
  const [sending, setSending] = useState(false);

  const pdfFilename = `${report.title.toLowerCase().replace(/\s+/g, "-")}-${patient.name.toLowerCase().replace(/\s+/g, "-")}.pdf`;

  const handleSend = async () => {
    if (!to.trim()) {
      toast.error("Informe o e-mail do destinatário.");
      return;
    }

    setSending(true);
    try {
      const doc = generatePatientReportPdf(patient, report);
      const pdfB64 = doc.output("datauristring").split(",")[1];

      const { data, error } = await supabase.functions.invoke("send-material", {
        body: {
          to: to.trim(),
          client_name: patient.name,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !sending) onClose();
      }}
    >
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Mail className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Enviar relatório por e-mail</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="flex items-center gap-3 border-b border-border/60 pb-3">
            <span className="w-12 shrink-0 text-xs text-muted-foreground">Para</span>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@exemplo.com"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3 border-b border-border/60 pb-3">
            <span className="w-12 shrink-0 text-xs text-muted-foreground">Assunto</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Assunto do e-mail"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            />
          </div>

          <textarea
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Mensagem..."
            className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
          />

          <div className="border-t border-border/60 pt-3">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Anexo</p>
            <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">{pdfFilename}</p>
                <p className="text-[10px] text-muted-foreground">PDF gerado automaticamente</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !to.trim()}
            className="flex h-9 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {sending ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}
