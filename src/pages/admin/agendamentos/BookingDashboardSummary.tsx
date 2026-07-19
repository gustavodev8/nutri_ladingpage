import { CalendarCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Booking } from "@/lib/supabase";
import { PaymentPill, StatusPill } from "./bookingPills";
import { getPaymentGroupStatus, type FilterTab } from "./bookingStatusUtils";

interface SummarySessionItem {
  groupId: string;
  first: Booking;
  session: Booking;
}

interface BookingDashboardSummaryProps {
  todaySessions: SummarySessionItem[];
  upcomingReturnSessions: SummarySessionItem[];
  groupedBookings: Record<string, Booking[]>;
  onOpenDetail: (groupId: string) => void;
  setFilter: (filter: FilterTab) => void;
}

export const BookingDashboardSummary = ({
  todaySessions,
  upcomingReturnSessions,
  groupedBookings,
  onOpenDetail,
  setFilter,
}: BookingDashboardSummaryProps) => (
  <>
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Hoje</p>
          <p className="text-sm text-muted-foreground">
            {todaySessions.length === 0
              ? "Nenhuma consulta ativa para hoje"
              : `${todaySessions.length} consulta${todaySessions.length > 1 ? "s" : ""} ativa${todaySessions.length > 1 ? "s" : ""}`}
          </p>
        </div>
        {todaySessions.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setFilter("today")} className="h-8 rounded-md">
            Ver hoje
          </Button>
        )}
      </div>

      {todaySessions.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {todaySessions.slice(0, 6).map(({ groupId, first, session }) => (
            <button
              key={`${groupId}-${session.id}`}
              onClick={() => onOpenDetail(groupId)}
              className="text-left rounded-lg border border-border bg-background/60 hover:bg-primary/5 hover:border-primary/30 transition-colors p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{first.client_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{first.plan_name}</p>
                </div>
                <span className="text-xs font-semibold text-primary tabular-nums">
                  {(session.appointment_time || "").substring(0, 5)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusPill status={session.status || "pending"} />
                <PaymentPill status={getPaymentGroupStatus(groupedBookings[groupId] || [])} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>

    {upcomingReturnSessions.length > 0 && (
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Próximos retornos</p>
            <p className="text-sm text-muted-foreground">
              {upcomingReturnSessions.length} retorno{upcomingReturnSessions.length > 1 ? "s" : ""} já agendado
              {upcomingReturnSessions.length > 1 ? "s" : ""}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setFilter("retornos")} className="h-8 rounded-md">
            Ver retornos
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {upcomingReturnSessions.slice(0, 6).map(({ groupId, first, session }) => {
            const sessionLabel = session.session_number === 1 ? "Consulta inicial" : `Retorno ${(session.session_number ?? 1) - 1}`;
            return (
              <button
                key={`${groupId}-${session.id}`}
                onClick={() => onOpenDetail(groupId)}
                className="text-left rounded-lg border border-border bg-background/60 hover:bg-primary/5 hover:border-primary/30 transition-colors p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{first.client_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{first.plan_name}</p>
                  </div>
                  <StatusPill status={session.status || "pending"} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarCheck className="h-3 w-3" />
                    {new Date(session.appointment_date + "T12:00:00").toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {(session.appointment_time || "").substring(0, 5)}
                  </span>
                  <span className="text-primary font-medium">{sessionLabel}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    )}
  </>
);
