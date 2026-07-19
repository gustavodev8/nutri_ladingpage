import { useState, useEffect, useCallback } from "react";
import { Calendar, Loader2, Globe, MapPin, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchSlotsByMonth, fetchSlotsByDate, addAvailabilitySlot, deleteAvailabilitySlot, type AvailabilitySlot } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DAYS_PT   = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const HOURS     = ["07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00"];

const CITIES = [
  "Alagoinhas",
  "Feira de Santana",
  "Salvador",
  "Crisópolis",
  "Olindina",
  "Aporá",
  "Acajutiba",
  "Esplanada",
] as const;

type City = typeof CITIES[number];

function toLocalISO(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const AdminDisponibilidade = () => {
  const today = new Date();
  const [calYear,       setCalYear]       = useState(today.getFullYear());
  const [calMonth,      setCalMonth]      = useState(today.getMonth());
  const [selectedDate,  setSelectedDate]  = useState<string | null>(null);
  const [activeType,    setActiveType]    = useState<"online" | "presencial">("online");
  const [selectedCity,  setSelectedCity]  = useState<City>("Alagoinhas");

  const [monthSlots,    setMonthSlots]    = useState<AvailabilitySlot[]>([]);
  const [loadingMonth,  setLoadingMonth]  = useState(false);
  const [dateSlots,     setDateSlots]     = useState<AvailabilitySlot[]>([]);
  const [loadingDate,   setLoadingDate]   = useState(false);
  const [adding,        setAdding]        = useState(false);
  const [addingBatch,   setAddingBatch]   = useState(false);
  const [deleting,      setDeleting]      = useState<number | null>(null);
  const [repeatWeeks,   setRepeatWeeks]   = useState(4);

  const loadMonth = useCallback(async () => {
    setLoadingMonth(true);
    const data = await fetchSlotsByMonth(calYear, calMonth);
    setMonthSlots(data);
    setLoadingMonth(false);
  }, [calYear, calMonth]);

  const loadDateSlots = useCallback(async () => {
    if (!selectedDate) return;
    setLoadingDate(true);
    const data = await fetchSlotsByDate(
      selectedDate,
      activeType,
      activeType === "presencial" ? selectedCity : undefined,
    );
    setDateSlots(data);
    setLoadingDate(false);
  }, [selectedDate, activeType, selectedCity]);

  useEffect(() => { loadMonth(); }, [loadMonth]);
  useEffect(() => { if (selectedDate) loadDateSlots(); }, [selectedDate, loadDateSlots]);

  const handleAddSlot = async (time: string) => {
    if (!selectedDate) return;
    if (dateSlots.some(s => s.start_time === time)) return;
    setAdding(true);
    const ok = await addAvailabilitySlot({
      date:       selectedDate,
      start_time: time,
      type:       activeType,
      city:       activeType === "presencial" ? selectedCity : undefined,
      active:     true,
    });
    if (ok) {
      toast({ title: "Horário adicionado!" });
      await loadDateSlots();
      await loadMonth();
    } else {
      toast({ title: "Erro ao adicionar horário", variant: "destructive" });
    }
    setAdding(false);
  };

  const handleAddRemainingSlots = async () => {
    if (!selectedDate) return;
    const times = HOURS.filter((time) => !addedTimes.has(time));
    if (times.length === 0) return;

    setAddingBatch(true);
    const results = await Promise.all(times.map((time) => addAvailabilitySlot({
      date:       selectedDate,
      start_time: time,
      type:       activeType,
      city:       activeType === "presencial" ? selectedCity : undefined,
      active:     true,
    })));
    setAddingBatch(false);

    const inserted = results.filter(Boolean).length;
    if (inserted > 0) {
      toast({ title: `${inserted} horario${inserted > 1 ? "s" : ""} adicionado${inserted > 1 ? "s" : ""}.` });
      await loadDateSlots();
      await loadMonth();
    } else {
      toast({ title: "Nenhum horario foi adicionado.", variant: "destructive" });
    }
  };

  const handleRepeatWeekly = async () => {
    if (!selectedDate || dateSlots.length === 0) return;
    const baseDate = new Date(selectedDate + "T12:00:00");
    const times = [...new Set(dateSlots.map((slot) => slot.start_time.substring(0, 5)))];

    setAddingBatch(true);
    let inserted = 0;
    for (let week = 1; week <= repeatWeeks; week++) {
      const nextDate = new Date(baseDate);
      nextDate.setDate(baseDate.getDate() + week * 7);
      const dateISO = toLocalISO(nextDate);
      const existing = await fetchSlotsByDate(
        dateISO,
        activeType,
        activeType === "presencial" ? selectedCity : undefined,
      );
      const existingTimes = new Set(existing.map((slot) => slot.start_time.substring(0, 5)));

      for (const time of times) {
        if (existingTimes.has(time)) continue;
        const ok = await addAvailabilitySlot({
          date:       dateISO,
          start_time: time,
          type:       activeType,
          city:       activeType === "presencial" ? selectedCity : undefined,
          active:     true,
        });
        if (ok) inserted += 1;
      }
    }
    setAddingBatch(false);

    if (inserted > 0) {
      toast({ title: `${inserted} horario${inserted > 1 ? "s" : ""} recorrente${inserted > 1 ? "s" : ""} criado${inserted > 1 ? "s" : ""}.` });
      await loadMonth();
    } else {
      toast({ title: "Nao havia horarios novos para repetir." });
    }
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

  // Calendar helpers
  const firstDay     = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth  = new Date(calYear, calMonth + 1, 0).getDate();
  const todayISO     = toLocalISO(today);

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const datesWithSlots     = new Set(monthSlots.map(s => s.date));
  const datesWithTypeSlots = new Set(
    monthSlots
      .filter(s => s.type === activeType && (activeType === "online" || s.city === selectedCity))
      .map(s => s.date)
  );

  const addedTimes = new Set(dateSlots.map(s => s.start_time));

  const selectedDateObj = selectedDate ? new Date(selectedDate + "T12:00:00") : null;
  const selectedLabel   = selectedDateObj
    ? selectedDateObj.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
    : null;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Disponibilidade</h1>
          <p className="text-sm text-muted-foreground">Selecione uma data e adicione os horários disponíveis</p>
        </div>
      </div>

      {/* ── Type tabs ── */}
      <div className="flex gap-2">
        {([
          { id: "online"     as const, label: "Online",     icon: Globe   },
          { id: "presencial" as const, label: "Presencial", icon: MapPin  },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveType(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border",
              activeType === id
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── City selector (presencial only) ── */}
      {activeType === "presencial" && (
        <div className="flex items-center gap-3">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value as City)}
            className="h-10 rounded-xl border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all w-56"
          >
            {CITIES.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
      )}

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

          <div className="grid grid-cols-7 mb-2">
            {DAYS_PT.map(d => (
              <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
            {Array(daysInMonth).fill(null).map((_, i) => {
              const day     = i + 1;
              const dateISO = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isPast      = dateISO < todayISO;
              const isSelected  = selectedDate === dateISO;
              const hasAny      = datesWithSlots.has(dateISO);
              const hasType     = datesWithTypeSlots.has(dateISO);
              const isToday     = dateISO === todayISO;

              return (
                <button
                  key={day}
                  disabled={isPast}
                  onClick={() => setSelectedDate(dateISO)}
                  className={cn(
                    "relative flex flex-col items-center justify-center h-10 w-full rounded-xl text-xs font-medium transition-all",
                    isPast
                      ? "text-muted-foreground/30 cursor-not-allowed"
                      : isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : isToday
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  {day}
                  {!isPast && hasAny && (
                    <span className={cn(
                      "absolute bottom-1 w-1 h-1 rounded-full",
                      isSelected ? "bg-primary-foreground" : hasType ? "bg-primary" : "bg-muted-foreground/40"
                    )} />
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
              horários disponíveis
              {activeType === "presencial" && <span className="font-medium text-foreground/70"> · {selectedCity}</span>}
            </span>
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
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  {activeType === "online"
                    ? <><Globe className="h-3 w-3" /> Atendimento online</>
                    : <><MapPin className="h-3 w-3" /> Presencial · <span className="font-medium text-primary">{selectedCity}</span></>
                  }
                </p>
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
                  Nenhum horário configurado para este dia
                  {activeType === "presencial" && <> em <span className="font-medium text-foreground">{selectedCity}</span></>}.
                </p>
              )}

              {/* Add slots */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Adicionar horario</p>
                  <button
                    onClick={handleAddRemainingSlots}
                    disabled={addingBatch || HOURS.every(h => addedTimes.has(h))}
                    className="text-xs font-medium text-primary hover:text-primary/80 disabled:text-muted-foreground/40"
                  >
                    {addingBatch ? "Adicionando..." : "Adicionar todos"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {HOURS.filter(h => !addedTimes.has(h)).map(time => (
                    <button
                      key={time}
                      onClick={() => handleAddSlot(time)}
                      disabled={adding || addingBatch}
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

              {dateSlots.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-border">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recorrencia semanal</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Repete os horarios configurados neste dia nas proximas semanas.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <select
                      value={repeatWeeks}
                      onChange={(e) => setRepeatWeeks(Number(e.target.value))}
                      className="h-9 rounded-xl border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                    >
                      {[1, 2, 3, 4, 6, 8].map((weeks) => (
                        <option key={weeks} value={weeks}>
                          {weeks} semana{weeks > 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleRepeatWeekly}
                      disabled={addingBatch}
                      className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl text-xs font-medium border border-border bg-card hover:border-primary/40 hover:text-primary transition-all disabled:opacity-50"
                    >
                      {addingBatch ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      Repetir horarios
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDisponibilidade;
