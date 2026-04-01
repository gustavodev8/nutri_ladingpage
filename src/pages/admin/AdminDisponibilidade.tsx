import { useState, useEffect } from "react";
import { Calendar, Loader2, Globe, MapPin, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchSlotsByMonth, fetchSlotsByDate, addAvailabilitySlot, deleteAvailabilitySlot, type AvailabilitySlot } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DAYS_PT = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const HOURS = ["07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00"];

function toLocalISO(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const AdminDisponibilidade = () => {
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"online" | "presencial">("online");

  // Slots for entire month (to mark calendar dots)
  const [monthSlots, setMonthSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(false);

  // Slots for selected date + type
  const [dateSlots, setDateSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingDate, setLoadingDate] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => { loadMonth(); }, [calYear, calMonth]);
  useEffect(() => { if (selectedDate) loadDateSlots(); }, [selectedDate, activeType]);

  const loadMonth = async () => {
    setLoadingMonth(true);
    const data = await fetchSlotsByMonth(calYear, calMonth);
    setMonthSlots(data);
    setLoadingMonth(false);
  };

  const loadDateSlots = async () => {
    if (!selectedDate) return;
    setLoadingDate(true);
    const data = await fetchSlotsByDate(selectedDate, activeType);
    setDateSlots(data);
    setLoadingDate(false);
  };

  const handleAddSlot = async (time: string) => {
    if (!selectedDate) return;
    // Check if already exists
    if (dateSlots.some(s => s.start_time === time)) return;
    setAdding(true);
    const ok = await addAvailabilitySlot({ date: selectedDate, start_time: time, type: activeType, active: true });
    if (ok) {
      toast({ title: "Horário adicionado!" });
      await loadDateSlots();
      await loadMonth();
    } else {
      toast({ title: "Erro ao adicionar horário", variant: "destructive" });
    }
    setAdding(false);
  };

  const handleDeleteSlot = async (id: number) => {
    setDeleting(id);
    const ok = await deleteAvailabilitySlot(id);
    if (ok) {
      toast({ title: "Horário removido" });
      await loadDateSlots();
      await loadMonth();
    } else {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
    setDeleting(null);
  };

  // Calendar grid
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  // Which dates in the month have slots (any type)
  const datesWithSlots = new Set(monthSlots.map(s => s.date));
  // Which dates have slots for the active type
  const datesWithTypeSlots = new Set(monthSlots.filter(s => s.type === activeType).map(s => s.date));

  const todayISO = toLocalISO(today);

  // Already-added times for the selected date/type
  const addedTimes = new Set(dateSlots.map(s => s.start_time));

  const selectedDateObj = selectedDate ? new Date(selectedDate + "T12:00:00") : null;
  const selectedLabel = selectedDateObj
    ? selectedDateObj.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Disponibilidade</h1>
          <p className="text-sm text-muted-foreground">Selecione uma data e adicione os horários disponíveis</p>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex gap-2">
        {([
          { id: "online" as const, label: "Online", icon: Globe },
          { id: "presencial" as const, label: "Presencial", icon: MapPin },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveType(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              activeType === id
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* ── Calendar ── */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-semibold text-sm">
              {MONTHS_PT[calMonth]} {calYear}
              {loadingMonth && <Loader2 className="inline ml-2 h-3 w-3 animate-spin text-muted-foreground" />}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_PT.map(d => (
              <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
            {Array(daysInMonth).fill(null).map((_, i) => {
              const day = i + 1;
              const dateISO = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isPast = dateISO < todayISO;
              const isSelected = selectedDate === dateISO;
              const hasAny = datesWithSlots.has(dateISO);
              const hasType = datesWithTypeSlots.has(dateISO);
              const isToday = dateISO === todayISO;

              return (
                <button
                  key={day}
                  disabled={isPast}
                  onClick={() => setSelectedDate(dateISO)}
                  className={`relative flex flex-col items-center justify-center h-10 w-full rounded-xl text-xs font-medium transition-all ${
                    isPast
                      ? "text-muted-foreground/30 cursor-not-allowed"
                      : isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : isToday
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  {day}
                  {!isPast && hasAny && (
                    <span className={`absolute bottom-1 w-1 h-1 rounded-full ${
                      isSelected ? "bg-primary-foreground" : hasType ? "bg-primary" : "bg-muted-foreground/40"
                    }`} />
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" /> horários disponíveis</span>
          </p>
        </div>

        {/* ── Time slots panel ── */}
        <div className="bg-card border border-border rounded-2xl p-5 min-h-[300px]">
          {!selectedDate ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center gap-3">
              <Calendar className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Selecione uma data no calendário para gerenciar os horários</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-sm text-foreground capitalize">{selectedLabel}</p>
                <p className="text-xs text-muted-foreground">{activeType === "online" ? "Atendimento online" : "Atendimento presencial"}</p>
              </div>

              {/* Existing slots */}
              {loadingDate ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                </div>
              ) : dateSlots.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Horários configurados</p>
                  <div className="flex flex-wrap gap-2">
                    {dateSlots.map(slot => (
                      <div
                        key={slot.id}
                        className="flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 rounded-xl px-3 py-1.5 text-sm font-medium"
                      >
                        {slot.start_time}
                        <button
                          onClick={() => handleDeleteSlot(slot.id)}
                          disabled={deleting === slot.id}
                          className="hover:text-destructive transition-colors"
                        >
                          {deleting === slot.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Trash2 className="h-3 w-3" />
                          }
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl px-4 py-3">
                  Nenhum horário configurado para este dia.
                </p>
              )}

              {/* Add slots */}
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Adicionar horário</p>
                <div className="flex flex-wrap gap-2">
                  {HOURS.filter(h => !addedTimes.has(h)).map(time => (
                    <button
                      key={time}
                      onClick={() => handleAddSlot(time)}
                      disabled={adding}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-border bg-card hover:border-primary/40 hover:text-primary transition-all disabled:opacity-50"
                    >
                      <Plus className="h-3 w-3" />
                      {time}
                    </button>
                  ))}
                  {HOURS.every(h => addedTimes.has(h)) && (
                    <p className="text-xs text-muted-foreground">Todos os horários já foram adicionados.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDisponibilidade;
