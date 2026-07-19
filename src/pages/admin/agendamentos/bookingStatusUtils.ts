import type { Booking, BookingPaymentStatus } from "@/lib/supabase";

export type FilterTab = "all" | "today" | "confirmed" | "pending" | "retornos" | "completed" | "no_show" | "cancelled";

export const STATUS: Record<string, { label: string; color: string }> = {
  pending:   { label: "Pendente",             color: "bg-amber-50 text-amber-700 border-amber-200" },
  confirmed: { label: "Confirmado",           color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  completed: { label: "Concluído",            color: "bg-blue-50 text-blue-700 border-blue-200" },
  awaiting_return: { label: "Aguardando retorno", color: "bg-violet-50 text-violet-700 border-violet-200" },
  group_completed: { label: "Plano concluído", color: "bg-blue-50 text-blue-700 border-blue-200" },
  no_show:   { label: "Não compareceu",       color: "bg-orange-50 text-orange-700 border-orange-200" },
  cancelled: { label: "Cancelado",            color: "bg-red-50 text-red-600 border-red-200" },
};

export const PAYMENT_STATUS: Record<string, { label: string; color: string }> = {
  pending:   { label: "Pagamento pendente", color: "bg-amber-50 text-amber-700 border-amber-200" },
  paid:      { label: "Pagamento aprovado", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  free:      { label: "Cortesia",            color: "bg-sky-50 text-sky-700 border-sky-200" },
  cancelled: { label: "Pagamento cancelado", color: "bg-red-50 text-red-600 border-red-200" },
};

export const BORDER_COLOR: Record<string, string> = {
  confirmed: "border-l-primary",
  pending:   "border-l-amber-400",
  completed: "border-l-blue-400",
  awaiting_return: "border-l-violet-400",
  group_completed: "border-l-blue-400",
  no_show:   "border-l-orange-400",
  cancelled: "border-l-red-400",
};

export const BOOKING_TABS: { id: FilterTab; label: string }[] = [
  { id: "all",       label: "Todos" },
  { id: "today",     label: "Hoje" },
  { id: "confirmed", label: "Confirmados" },
  { id: "pending",   label: "Pendentes" },
  { id: "retornos",  label: "Retornos" },
  { id: "completed", label: "Concluídos" },
  { id: "cancelled", label: "Cancelados" },
];

export const inferPaymentStatus = (session: Booking): BookingPaymentStatus => {
  if (session.payment_status) return session.payment_status;
  if (session.status === "cancelled") return "cancelled";
  if (["confirmed", "completed", "no_show"].includes(session.status || "")) return "paid";
  return "pending";
};

export const getPaymentGroupStatus = (sessions: Booking[]): BookingPaymentStatus => {
  const statuses = sessions.map(inferPaymentStatus);
  if (statuses.length === 0) return "pending";
  if (statuses.some(status => status === "pending")) return "pending";
  if (statuses.some(status => status === "paid")) return "paid";
  if (statuses.some(status => status === "free")) return "free";
  return "cancelled";
};

export const getBookingGroupStatus = (sessions: Booking[]): string => {
  const sorted = [...sessions].sort((a, b) => (b.session_number ?? 0) - (a.session_number ?? 0));
  const latest = sorted[0];
  if (!latest) return "unknown";
  if (sessions.length > 0 && sessions.every(s => s.status === "cancelled")) return "cancelled";
  if (
    latest.status === "completed" &&
    (latest.session_number ?? 1) >= (latest.total_sessions ?? 1)
  ) return "group_completed";
  if (latest.status === "completed") return "awaiting_return";
  return latest.status ?? "confirmed";
};

export const isBookingGroupComplete = (sessions: Booking[]) => getBookingGroupStatus(sessions) === "group_completed";

export const bookingGroupNeedsNextReturn = (sessions: Booking[]) => getBookingGroupStatus(sessions) === "awaiting_return";
