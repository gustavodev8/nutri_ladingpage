import type { BookingPaymentStatus } from "@/lib/supabase";
import { PaymentPill } from "./bookingPills";

interface NewBookingSummaryProps {
  patientName: string;
  patientEmail: string;
  planName: string;
  customPlanName: string;
  sessions: number;
  date: string;
  time: string;
  type: "online" | "presencial";
  city: string;
  paymentStatus: BookingPaymentStatus;
}

export const NewBookingSummary = ({
  patientName,
  patientEmail,
  planName,
  customPlanName,
  sessions,
  date,
  time,
  type,
  city,
  paymentStatus,
}: NewBookingSummaryProps) => (
  <aside className="lg:sticky lg:top-0 h-fit rounded-2xl border border-border bg-muted/20 p-4 space-y-4">
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Resumo</p>
      <p className="text-sm font-semibold text-foreground mt-1">Nova consulta manual</p>
    </div>

    <div className="space-y-3 text-sm">
      <div className="rounded-xl bg-background border border-border p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">Paciente</p>
        <p className="font-medium text-foreground truncate">{patientName.trim() || "Não informado"}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{patientEmail.trim() || "Email não informado"}</p>
      </div>

      <div className="rounded-xl bg-background border border-border p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">Plano</p>
        <p className="font-medium text-foreground truncate">
          {(planName === "__custom__" ? customPlanName.trim() : planName) || "Não selecionado"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {sessions > 1 ? `${sessions} sessões no total` : "Consulta avulsa"}
        </p>
      </div>

      <div className="rounded-xl bg-background border border-border p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">Agenda</p>
        <p className="font-medium text-foreground">
          {date
            ? new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
            : "Data não escolhida"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {time || "Horário não escolhido"} · {type === "online" ? "Online" : `Presencial · ${city}`}
        </p>
      </div>

      <div className="rounded-xl bg-background border border-border p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">Pagamento</p>
        <PaymentPill status={paymentStatus} />
      </div>
    </div>

    <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
      A consulta inicial será criada agora. Retornos do plano serão agendados depois, ao concluir cada sessão.
    </div>
  </aside>
);
