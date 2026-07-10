import { useState } from "react";
import { CalendarRange, ChevronRight, FileText, Loader2, Mail, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { generateMealPlanPdf } from "@/lib/generateMealPlanPdf";
import { MealPlanPdfOptionsDialog } from "@/components/admin/MealPlanPdfOptionsDialog";
import type { MealPlan, Meal, Patient } from "@/lib/supabase";

interface Props {
  plan: MealPlan;
  meals: Meal[];
  patient: Patient | null;
  onClose: () => void;
}

function formatKcal(value?: number) {
  if (!value) return "não informada";
  return `${value} kcal/dia`;
}

export function EmailPlanModal({ plan, meals, patient, onClose }: Props) {
  const [to, setTo] = useState(patient?.email ?? "");
  const [subject, setSubject] = useState(`${plan.title} — ${patient?.name ?? "Paciente"}`);
  const [body, setBody] = useState(
    `Olá${patient?.name ? `, ${patient.name.split(" ")[0]}` : ""}!\n\nSegue em anexo seu plano alimentar personalizado.\n\nResumo:\n• Plano: ${plan.title}\n• Refeições: ${meals.length}\n• Meta diária: ${formatKcal(plan.daily_calories)}\n\nSe precisar de ajustes, fico à disposição.\n\nAbraços!`
  );
  const [sending, setSending] = useState(false);
  const [showPdfOptions, setShowPdfOptions] = useState(false);

  const pdfFilename = `plano-${plan.title.toLowerCase().replace(/\s+/g, "-")}-${patient?.name?.split(" ")[0]?.toLowerCase() ?? "paciente"}.pdf`;

  const handleSend = async (selectedAlternatives: Record<number, number[]>) => {
    if (!to.trim()) {
      toast.error("Informe o e-mail do destinatário.");
      return;
    }

    setSending(true);
    setShowPdfOptions(false);
    try {
      const doc = generateMealPlanPdf(plan, meals, patient, { selectedAlternatives });
      const pdfB64 = doc.output("datauristring").split(",")[1];

      const { data, error } = await supabase.functions.invoke("send-material", {
        body: {
          to: to.trim(),
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !sending) onClose();
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-border/60 bg-background shadow-2xl">
        <div className="border-b border-border/60 bg-gradient-to-br from-primary/10 via-background to-emerald-500/10 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-primary">
                <Sparkles size={12} />
                Envio profissional
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">Enviar dieta por e-mail</h2>
                  <p className="text-xs text-muted-foreground">O PDF será gerado automaticamente com apresentação clínica.</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="rounded-full border border-border/60 p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4 px-6 py-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-muted/25 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Paciente</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{patient?.name ?? "Paciente"}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/25 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Plano</p>
                <p className="mt-1 truncate text-sm font-semibold text-foreground">{plan.title}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/25 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Refeições</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{meals.length}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-border/60 bg-background px-4 py-3">
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Para</label>
                <input
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
                />
              </div>

              <div className="rounded-2xl border border-border/60 bg-background px-4 py-3">
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Assunto</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Assunto do e-mail"
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
                />
              </div>

              <div className="rounded-2xl border border-border/60 bg-background px-4 py-3">
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Mensagem</label>
                <textarea
                  rows={8}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Mensagem..."
                  className="w-full resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <aside className="border-t border-border/60 bg-muted/20 px-6 py-5 lg:border-l lg:border-t-0">
            <div className="rounded-3xl border border-border/60 bg-background p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <CalendarRange className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Anexo</p>
              </div>

              <div className="mt-3 rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{pdfFilename}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">PDF gerado automaticamente com a identidade visual do plano.</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <ChevronRight className="h-3.5 w-3.5" />
                <span>Revisar, enviar e registrar automaticamente.</span>
              </div>
            </div>
          </aside>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border/60 bg-muted/20 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="h-10 rounded-xl border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              if (!to.trim()) {
                toast.error("Informe o e-mail do destinatário.");
                return;
              }
              setShowPdfOptions(true);
            }}
            disabled={sending || !to.trim()}
            className="flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {sending ? "Enviando..." : "Enviar"}
          </button>
        </div>
      </div>

      <MealPlanPdfOptionsDialog
        open={showPdfOptions}
        meals={meals}
        title="Escolher substituições do PDF"
        description="Marque quais opções substitutas devem aparecer no PDF do e-mail. Elas serão impressas abaixo da refeição principal, em destaque."
        confirmLabel={sending ? "Enviando..." : "Enviar e-mail"}
        emptyMessage="Nenhuma refeição com substituição foi encontrada neste plano."
        onOpenChange={(open) => {
          if (!sending) setShowPdfOptions(open);
        }}
        onConfirm={handleSend}
      />
    </div>
  );
}
