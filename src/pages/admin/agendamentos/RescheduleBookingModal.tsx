import { CalendarClock, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Booking } from "@/lib/supabase";

const formatDate = (date: string) =>
  new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

interface RescheduleBookingModalProps {
  booking: Booking | null;
  newDate: string;
  setNewDate: (value: string) => void;
  newTime: string;
  setNewTime: (value: string) => void;
  message: string;
  setMessage: (value: string) => void;
  rescheduling: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export const RescheduleBookingModal = ({
  booking,
  newDate,
  setNewDate,
  newTime,
  setNewTime,
  message,
  setMessage,
  rescheduling,
  onClose,
  onSubmit,
}: RescheduleBookingModalProps) => {
  if (!booking) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-lg border border-border shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Realocar consulta</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-3 bg-muted/20 border-b border-border">
          <p className="text-sm font-medium text-foreground">{booking.client_name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{booking.plan_name} · {booking.client_email}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Atual: <span className="font-medium text-foreground">{formatDate(booking.appointment_date)} às {(booking.appointment_time || "").substring(0, 5)}</span>
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Nova data</label>
              <input
                type="date"
                value={newDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={event => setNewDate(event.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Novo horário</label>
              <input
                type="time"
                value={newTime}
                onChange={event => setNewTime(event.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              Mensagem ao paciente <span className="opacity-50">(opcional)</span>
            </label>
            <textarea
              value={message}
              onChange={event => setMessage(event.target.value)}
              rows={3}
              placeholder="Ex: Precisamos reagendar devido a um imprevisto..."
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/40"
            />
          </div>

          <p className="text-xs text-muted-foreground bg-muted/30 border border-border/50 rounded-md px-3 py-2">
            Um email será enviado automaticamente ao paciente.
          </p>
        </div>

        <div className="flex gap-2 px-6 pb-5">
          <Button variant="outline" className="flex-1 rounded-md" onClick={onClose} disabled={rescheduling}>
            Cancelar
          </Button>
          <Button className="flex-1 rounded-md gap-2" onClick={onSubmit} disabled={rescheduling || !newDate || !newTime}>
            {rescheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
};
