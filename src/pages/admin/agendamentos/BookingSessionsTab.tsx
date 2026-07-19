import { CalendarCheck, CheckCircle2, Clock } from "lucide-react";
import type { Booking, BookingPaymentMethod, BookingPaymentStatus, BookingStatus } from "@/lib/supabase";
import { PaymentPill, StatusPill } from "./bookingPills";
import { inferPaymentStatus } from "./bookingStatusUtils";

type ConfirmSessionAction = { id: number; status: "no_show" | "cancelled" } | null;

interface BookingSessionsTabProps {
  sessions: Booking[];
  updating: number | null;
  confirmAction: ConfirmSessionAction;
  setConfirmAction: (action: ConfirmSessionAction) => void;
  onCloseDetail: () => void;
  onReschedule: (session: Booking) => void;
  onComplete: (session: Booking) => void;
  onScheduleReturn: (session: Booking) => void;
  onChangeStatus: (id: number, status: BookingStatus) => void;
  onChangePaymentStatus: (
    id: number,
    paymentStatus: BookingPaymentStatus,
    paymentMethod?: BookingPaymentMethod,
  ) => void;
}

const getSessionLabel = (session: Booking) =>
  session.session_number === 1 ? "Consulta inicial" : `Retorno ${(session.session_number ?? 1) - 1}`;

const getDotColor = (session: Booking) => {
  if (session.status === "completed") return "bg-emerald-400";
  if (session.status === "confirmed") return "bg-blue-400";
  if (session.status === "no_show") return "bg-orange-400";
  if (session.status === "cancelled") return "bg-red-400";
  return "bg-amber-400";
};

const canScheduleNextReturnForSession = (session: Booking, sessions: Booking[]) => {
  const latestSessionNumber = Math.max(...sessions.map(item => item.session_number ?? 1));
  const sessionNumber = session.session_number ?? 1;
  const nextSessionNumber = sessionNumber + 1;

  return (
    session.status === "completed" &&
    sessionNumber === latestSessionNumber &&
    sessionNumber < (session.total_sessions ?? 1) &&
    !sessions.some(item => (item.session_number ?? 1) === nextSessionNumber)
  );
};

export const BookingSessionsTab = ({
  sessions,
  updating,
  confirmAction,
  setConfirmAction,
  onCloseDetail,
  onReschedule,
  onComplete,
  onScheduleReturn,
  onChangeStatus,
  onChangePaymentStatus,
}: BookingSessionsTabProps) => (
  <div className="flex-1 overflow-y-auto divide-y divide-border/40">
    {sessions.map(session => {
      const isActive = session.status === "confirmed" || session.status === "pending";
      const isConfirming = confirmAction?.id === session.id;
      const canScheduleNextReturn = canScheduleNextReturnForSession(session, sessions);
      const paymentStatus = inferPaymentStatus(session);

      return (
        <div key={session.id} className={`transition-colors ${isActive ? "hover:bg-muted/20" : "opacity-50"}`}>
          <div className="flex items-start gap-3 px-5 py-3.5">
            <span className={`w-2 h-2 rounded-full shrink-0 mt-[5px] ${getDotColor(session)}`} />

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-sm font-medium text-foreground shrink-0">{getSessionLabel(session)}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums shrink-0">
                  <CalendarCheck className="h-3 w-3 text-muted-foreground/40" />
                  {new Date(session.appointment_date + "T12:00:00").toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "2-digit",
                  })}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums shrink-0">
                  <Clock className="h-3 w-3 text-muted-foreground/40" />
                  {(session.appointment_time || "").substring(0, 5)}
                </span>
                <div className="shrink-0">
                  <StatusPill status={session.status || "pending"} />
                </div>
                <div className="shrink-0">
                  <PaymentPill status={paymentStatus} />
                </div>
              </div>

              {isActive && !isConfirming && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                  <button
                    onClick={() => {
                      onCloseDetail();
                      setTimeout(() => onReschedule(session), 100);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                  >
                    Realocar
                  </button>
                  <span className="text-border text-xs">·</span>
                  <button
                    disabled={updating === session.id}
                    onClick={() => {
                      onCloseDetail();
                      setTimeout(() => onComplete(session), 100);
                    }}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold transition-colors disabled:opacity-40"
                  >
                    Concluir
                  </button>
                  <span className="text-border text-xs">·</span>
                  {session.id && (
                    <>
                      <button
                        disabled={updating === session.id}
                        onClick={() => setConfirmAction({ id: session.id!, status: "no_show" })}
                        className="text-xs text-muted-foreground hover:text-orange-500 font-medium transition-colors"
                      >
                        Faltou
                      </button>
                      <span className="text-border text-xs">·</span>
                      <button
                        disabled={updating === session.id}
                        onClick={() => setConfirmAction({ id: session.id!, status: "cancelled" })}
                        className="text-xs text-muted-foreground hover:text-red-500 font-medium transition-colors"
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                  <span className="text-border text-xs">·</span>
                  {paymentStatus === "pending" ? (
                    <>
                      {session.id && (
                        <>
                          <button
                            disabled={updating === session.id}
                            onClick={() => onChangePaymentStatus(session.id!, "paid", "manual")}
                            className="text-xs text-muted-foreground hover:text-emerald-600 font-medium transition-colors"
                          >
                            Marcar pago
                          </button>
                          <span className="text-border text-xs">·</span>
                          <button
                            disabled={updating === session.id}
                            onClick={() => onChangePaymentStatus(session.id!, "free", "free")}
                            className="text-xs text-muted-foreground hover:text-sky-600 font-medium transition-colors"
                          >
                            Cortesia
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    session.id && (
                      <button
                        disabled={updating === session.id}
                        onClick={() => onChangePaymentStatus(session.id!, "pending", "manual")}
                        className="text-xs text-muted-foreground hover:text-amber-600 font-medium transition-colors"
                      >
                        Reabrir pagamento
                      </button>
                    )
                  )}
                </div>
              )}

              {isConfirming && confirmAction?.status === "no_show" && session.id && (
                <div className="flex items-center gap-2 mt-1.5 text-xs">
                  <span className="text-muted-foreground">Marcar falta?</span>
                  <button
                    onClick={() => {
                      onChangeStatus(session.id!, "no_show");
                      setConfirmAction(null);
                    }}
                    className="font-semibold text-orange-500 hover:text-orange-600"
                  >
                    Sim
                  </button>
                  <button onClick={() => setConfirmAction(null)} className="text-muted-foreground hover:text-foreground">
                    Não
                  </button>
                </div>
              )}

              {isConfirming && confirmAction?.status === "cancelled" && session.id && (
                <div className="flex items-center gap-2 mt-1.5 text-xs">
                  <span className="text-muted-foreground">Cancelar sessão?</span>
                  <button
                    onClick={() => {
                      onChangeStatus(session.id!, "cancelled");
                      setConfirmAction(null);
                    }}
                    className="font-semibold text-red-500 hover:text-red-600"
                  >
                    Sim
                  </button>
                  <button onClick={() => setConfirmAction(null)} className="text-muted-foreground hover:text-foreground">
                    Não
                  </button>
                </div>
              )}

              {session.status === "completed" && (
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Realizada
                  </span>
                  {canScheduleNextReturn && (
                    <button
                      disabled={updating === session.id}
                      onClick={() => {
                        onCloseDetail();
                        setTimeout(() => onScheduleReturn(session), 100);
                      }}
                      className="text-xs text-primary hover:text-primary/80 font-semibold transition-colors"
                    >
                      Agendar próximo retorno
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    })}
  </div>
);
