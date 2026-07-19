import { CalendarCheck, Clock, Globe, Loader2, MapPin } from "lucide-react";
import type { Booking } from "@/lib/supabase";
import { PaymentPill, StatusPill } from "./bookingPills";
import { BORDER_COLOR, getBookingGroupStatus, getPaymentGroupStatus } from "./bookingStatusUtils";
import { GOAL_LABELS, type BookingClinicalNotes } from "./bookingPatientDetails";

interface BookingGroupsListProps {
  loading: boolean;
  groupEntries: [string, Booking[]][];
  onOpenDetail: (groupId: string) => void;
}

const formatDate = (date: string) =>
  new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const initials = (name: string) =>
  name?.split(" ").filter(Boolean).slice(0, 2).map(item => item[0]).join("").toUpperCase() || "?";

const parseClinicalNotes = (notes?: string | null): BookingClinicalNotes => {
  try {
    return JSON.parse(notes || "{}") as BookingClinicalNotes;
  } catch {
    return {};
  }
};

export const BookingGroupsList = ({ loading, groupEntries, onOpenDetail }: BookingGroupsListProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="hidden md:grid grid-cols-[1fr_180px_130px_130px_110px] gap-4 px-4 py-2.5 border-b border-border bg-muted/30">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Paciente</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Data / Hora</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Progresso</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Consulta</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Pagamento</span>
      </div>

      {groupEntries.length === 0 && (
        <div className="py-14 text-center">
          <CalendarCheck className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum agendamento encontrado.</p>
        </div>
      )}

      {groupEntries.map(([groupId, sessions], index) => {
        const first = sessions[0];
        const latestSession = [...sessions].sort((a, b) => (b.session_number ?? 0) - (a.session_number ?? 0))[0];
        const completedCount = sessions.filter(session => session.status === "completed").length;
        const totalSessions = latestSession.total_sessions ?? 1;
        const progress = Math.round((completedCount / totalSessions) * 100);
        const overallStatus = getBookingGroupStatus(sessions);
        const paymentStatus = getPaymentGroupStatus(sessions);
        const clinicalNotes = parseClinicalNotes(first.notes);
        const goalLabel = clinicalNotes.goal ? GOAL_LABELS[clinicalNotes.goal] || clinicalNotes.goal : null;
        const borderColor = BORDER_COLOR[overallStatus] || "border-l-border";

        return (
          <div
            key={groupId}
            onClick={() => onOpenDetail(groupId)}
            className={`border-l-[3px] ${borderColor} cursor-pointer hover:bg-muted/20 transition-colors ${
              index !== groupEntries.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <div className="md:hidden flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-muted-foreground">{initials(first.client_name)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">{first.client_name}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {first.plan_name?.toLowerCase().includes("gratuita") && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Gratuita
                      </span>
                    )}
                    <StatusPill status={overallStatus} />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-xs text-muted-foreground">{first.plan_name}</span>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {first.type === "online" ? (
                      <>
                        <Globe className="h-3 w-3" />
                        Online
                      </>
                    ) : (
                      <>
                        <MapPin className="h-3 w-3" />
                        Presencial
                      </>
                    )}
                  </span>
                  {totalSessions > 1 && (
                    <>
                      <span className="text-muted-foreground/30">·</span>
                      <span className="text-xs text-primary font-medium">
                        {totalSessions - 1} retorno{totalSessions - 1 > 1 ? "s" : ""} no plano
                      </span>
                    </>
                  )}
                  <span className="text-muted-foreground/30">·</span>
                  <PaymentPill status={paymentStatus} />
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarCheck className="h-3 w-3 text-muted-foreground/40" />
                    {new Date(latestSession.appointment_date + "T12:00:00").toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 text-muted-foreground/40" />
                    {(latestSession.appointment_time || "").substring(0, 5)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {completedCount}/{totalSessions}
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden md:grid grid-cols-[1fr_180px_130px_130px_110px] gap-4 items-center px-4 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-muted-foreground">{initials(first.client_name)}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{first.client_name}</p>
                    {first.plan_name?.toLowerCase().includes("gratuita") && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                        Gratuita
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {goalLabel && (
                      <>
                        <span className="text-xs text-muted-foreground">{goalLabel}</span>
                        <span className="text-muted-foreground/30">·</span>
                      </>
                    )}
                    <span className="text-xs text-muted-foreground">{first.plan_name}</span>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {first.type === "online" ? (
                        <>
                          <Globe className="h-3 w-3" />
                          Online
                        </>
                      ) : (
                        <>
                          <MapPin className="h-3 w-3" />
                          Presencial
                        </>
                      )}
                    </span>
                    {totalSessions > 1 && (
                      <>
                        <span className="text-muted-foreground/30">·</span>
                        <span className="text-xs text-primary font-medium">
                          {totalSessions - 1} retorno{totalSessions - 1 > 1 ? "s" : ""} no plano
                        </span>
                      </>
                    )}
                    <span className="text-muted-foreground/30">·</span>
                    <PaymentPill status={paymentStatus} />
                  </div>
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs text-foreground">
                  <CalendarCheck className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  {formatDate(latestSession.appointment_date)}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  {(latestSession.appointment_time || "").substring(0, 5)}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground font-medium">
                  {completedCount}/{totalSessions}
                </p>
              </div>

              <div>
                <StatusPill status={overallStatus} />
              </div>
              <div>
                <PaymentPill status={paymentStatus} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
