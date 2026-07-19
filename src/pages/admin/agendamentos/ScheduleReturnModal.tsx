import { CalendarPlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Booking } from "@/lib/supabase";
import { CITIES } from "./bookingDateUtils";

interface ScheduleReturnModalProps {
  booking: Booking | null;
  saving: boolean;
  returnType: "online" | "presencial";
  setReturnType: (value: "online" | "presencial") => void;
  returnCity: string;
  setReturnCity: (value: string) => void;
  loadingReturnSlots: boolean;
  availableDates: string[];
  selectedDate: string;
  selectedTime: string;
  bookedTimes: string[];
  getTimesForDate: (date: string, type: "online" | "presencial") => string[];
  onSelectDate: (date: string, type: "online" | "presencial") => void;
  setSelectedTime: (value: string) => void;
  resetReturnSelection: () => void;
  onClose: () => void;
  onSubmit: () => void;
}

export const ScheduleReturnModal = ({
  booking,
  saving,
  returnType,
  setReturnType,
  returnCity,
  setReturnCity,
  loadingReturnSlots,
  availableDates,
  selectedDate,
  selectedTime,
  bookedTimes,
  getTimesForDate,
  onSelectDate,
  setSelectedTime,
  resetReturnSelection,
  onClose,
  onSubmit,
}: ScheduleReturnModalProps) => {
  if (!booking) return null;

  const times = selectedDate ? getTimesForDate(selectedDate, returnType) : [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-lg border border-border shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Agendar próximo retorno</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-3 bg-muted/20 border-b border-border">
          <p className="text-sm font-medium text-foreground">{booking.client_name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Próxima sessão: {(booking.session_number ?? 1) + 1}/{booking.total_sessions ?? 1}
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(["online", "presencial"] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setReturnType(type);
                  resetReturnSelection();
                }}
                className={`h-9 rounded-lg border text-xs font-medium transition-all ${
                  returnType === type
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                {type === "online" ? "Online" : "Presencial"}
              </button>
            ))}
          </div>

          {returnType === "presencial" && (
            <select
              value={returnCity}
              onChange={e => {
                setReturnCity(e.target.value);
                resetReturnSelection();
              }}
              className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            >
              {CITIES.map(city => <option key={city} value={city}>{city}</option>)}
            </select>
          )}

          {!loadingReturnSlots && availableDates.length === 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Não existe disponibilidade cadastrada para essa modalidade{returnType === "presencial" ? ` em ${returnCity}` : ""}.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Data</label>
              <select
                value={selectedDate}
                onChange={e => onSelectDate(e.target.value, returnType)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                disabled={loadingReturnSlots}
              >
                <option value="">Selecione</option>
                {availableDates.map(date => (
                  <option key={date} value={date}>
                    {new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Horário</label>
              <select
                value={selectedTime}
                onChange={e => setSelectedTime(e.target.value)}
                disabled={!selectedDate || loadingReturnSlots}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-50"
              >
                <option value="">Selecione</option>
                {times.map(time => (
                  <option key={time} value={time} disabled={bookedTimes.includes(time)}>
                    {time}{bookedTimes.includes(time) ? " — ocupado" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedDate && times.length === 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Não há horários cadastrados para essa data e modalidade.
            </p>
          )}

          <p className="text-xs text-muted-foreground bg-muted/30 border border-border/50 rounded-md px-3 py-2">
            O retorno será criado como consulta confirmada e manterá o mesmo status de pagamento do plano.
          </p>
        </div>

        <div className="flex gap-2 px-6 pb-5">
          <Button variant="outline" className="flex-1 rounded-md" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button className="flex-1 rounded-md gap-2" onClick={onSubmit} disabled={saving || !selectedDate || !selectedTime}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
            Agendar
          </Button>
        </div>
      </div>
    </div>
  );
};
