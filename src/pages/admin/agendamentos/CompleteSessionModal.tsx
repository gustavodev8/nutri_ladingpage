import {
  CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Globe, Loader2, MapPin, Paperclip, X,
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import type { Booking } from "@/lib/supabase";
import { CITIES, toLocalISO } from "./bookingDateUtils";

const MONTHS_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const formatDate = (date: string) =>
  new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

const initials = (name: string) =>
  name?.split(" ").filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "?";

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

interface CompleteSessionModalProps {
  booking: Booking | null;
  saving: boolean;
  notes: string;
  setNotes: (value: string) => void;
  nextSteps: string;
  setNextSteps: (value: string) => void;
  returnType: "online" | "presencial";
  setReturnType: (value: "online" | "presencial") => void;
  returnCity: string;
  setReturnCity: (value: string) => void;
  loadingReturnSlots: boolean;
  returnCalYear: number;
  returnCalMonth: number;
  setReturnCalYear: Dispatch<SetStateAction<number>>;
  setReturnCalMonth: Dispatch<SetStateAction<number>>;
  selectedReturnDate: string;
  setSelectedReturnDate: (value: string) => void;
  selectedReturnTime: string;
  setSelectedReturnTime: (value: string) => void;
  bookedTimes: string[];
  getReturnTimesForDate: (date: string, type: "online" | "presencial") => string[];
  canSelectReturnDate: (date: Date, type: "online" | "presencial") => boolean;
  onSelectReturnDate: (date: string, type: "online" | "presencial") => void;
  files: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export const CompleteSessionModal = ({
  booking,
  saving,
  notes,
  setNotes,
  nextSteps,
  setNextSteps,
  returnType,
  setReturnType,
  returnCity,
  setReturnCity,
  loadingReturnSlots,
  returnCalYear,
  returnCalMonth,
  setReturnCalYear,
  setReturnCalMonth,
  selectedReturnDate,
  setSelectedReturnDate,
  selectedReturnTime,
  setSelectedReturnTime,
  bookedTimes,
  getReturnTimesForDate,
  canSelectReturnDate,
  onSelectReturnDate,
  files,
  onAddFiles,
  onRemoveFile,
  onClose,
  onSubmit,
}: CompleteSessionModalProps) => {
  if (!booking) return null;

  const isLastSession = (booking.session_number ?? 1) >= (booking.total_sessions ?? 1);
  const remainingSessions = (booking.total_sessions ?? 1) - (booking.session_number ?? 1);
  const sessionType = returnType;
  const firstDay = new Date(returnCalYear, returnCalMonth, 1).getDay();
  const daysInMonth = new Date(returnCalYear, returnCalMonth + 1, 0).getDate();
  const todayISO = toLocalISO(new Date());
  const returnTimes = selectedReturnDate ? getReturnTimesForDate(selectedReturnDate, sessionType) : [];

  const resetReturnSelection = () => {
    setSelectedReturnDate("");
    setSelectedReturnTime("");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:p-4 bg-black/60 backdrop-blur-[2px]">
      <div className="bg-background rounded-t-2xl md:rounded-xl border border-border shadow-2xl w-full md:max-w-lg flex flex-col" style={{ maxHeight: "90dvh" }}>
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">{initials(booking.client_name)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{booking.client_name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDate(booking.appointment_date)}
              <span className="mx-1.5 opacity-30">·</span>
              {(booking.appointment_time || "").substring(0, 5)}
              <span className="mx-1.5 opacity-30">·</span>
              {booking.session_number === 1 ? "Consulta inicial" : `Retorno ${booking.session_number - 1}`}
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">Observações da consulta</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              placeholder="O que foi discutido, avaliações realizadas, condutas adotadas..."
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/30"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">Próximos passos</label>
            <textarea
              value={nextSteps}
              onChange={e => setNextSteps(e.target.value)}
              rows={3}
              placeholder="Plano alimentar enviado, retorno em 30 dias, exames solicitados..."
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/30"
            />
          </div>

          {isLastSession && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs text-primary font-medium">
                Último retorno do plano — nenhum novo agendamento será criado.
              </p>
            </div>
          )}

          {!isLastSession && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
                  Próximo retorno <span className="normal-case font-normal tracking-normal">(opcional — {remainingSessions} restante{remainingSessions > 1 ? "s" : ""})</span>
                </label>
                {selectedReturnDate && (
                  <button onClick={resetReturnSelection} className="text-[10px] text-muted-foreground hover:text-red-500 transition-colors flex items-center gap-1">
                    <X className="h-2.5 w-2.5" /> Limpar
                  </button>
                )}
              </div>

              <div className="flex gap-1.5">
                {(["online", "presencial"] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setReturnType(type);
                      resetReturnSelection();
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                      returnType === type
                        ? type === "online"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-emerald-600 text-white border-emerald-600"
                        : "bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {type === "online" ? <Globe className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
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
                  className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                </select>
              )}

              {loadingReturnSlots ? (
                <div className="flex items-center justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b border-border">
                    <button
                      disabled={returnCalYear === new Date().getFullYear() && returnCalMonth === new Date().getMonth()}
                      onClick={() => {
                        if (returnCalMonth === 0) {
                          setReturnCalYear(year => year - 1);
                          setReturnCalMonth(11);
                        } else {
                          setReturnCalMonth(month => month - 1);
                        }
                      }}
                      className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <span className="text-xs font-semibold">{MONTHS_PT[returnCalMonth]} {returnCalYear}</span>
                    <button
                      onClick={() => {
                        if (returnCalMonth === 11) {
                          setReturnCalYear(year => year + 1);
                          setReturnCalMonth(0);
                        } else {
                          setReturnCalMonth(month => month + 1);
                        }
                      }}
                      className="p-1 rounded hover:bg-muted transition-colors"
                    >
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 border-b border-border">
                    {["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => (
                      <div key={index} className="text-center text-[10px] text-muted-foreground py-1.5">{day}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-px bg-border p-px">
                    {Array(firstDay).fill(null).map((_, index) => (
                      <div key={`e${index}`} className="bg-background h-8" />
                    ))}
                    {Array(daysInMonth).fill(null).map((_, index) => {
                      const day = index + 1;
                      const date = new Date(returnCalYear, returnCalMonth, day);
                      const dateISO = `${returnCalYear}-${String(returnCalMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const canSelect = canSelectReturnDate(date, sessionType);
                      const isSelected = selectedReturnDate === dateISO;
                      const isToday = dateISO === todayISO;
                      return (
                        <button
                          key={day}
                          disabled={!canSelect}
                          onClick={() => onSelectReturnDate(dateISO, sessionType)}
                          className={`bg-background h-8 text-xs font-medium transition-all ${
                            !canSelect ? "text-muted-foreground/20 cursor-not-allowed" :
                            isSelected ? "bg-primary text-primary-foreground font-bold" :
                            isToday ? "text-primary font-bold hover:bg-primary/10" :
                            "text-foreground hover:bg-muted"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>

                  {selectedReturnDate && (
                    <div className="border-t border-border p-3 space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
                        Horários — {new Date(selectedReturnDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" })}
                      </p>
                      {returnTimes.length === 0 ? (
                        <p className="text-xs text-muted-foreground/60">Sem horários disponíveis nesta data.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {returnTimes.map(time => {
                            const isBooked = bookedTimes.includes(time);
                            const isSelected = selectedReturnTime === time;
                            return (
                              <button
                                key={time}
                                disabled={isBooked}
                                onClick={() => !isBooked && setSelectedReturnTime(time)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                                  isBooked ? "bg-muted/30 border-border/40 text-muted-foreground/30 cursor-not-allowed line-through" :
                                  isSelected ? "bg-primary text-primary-foreground border-primary" :
                                  "bg-background border-border hover:border-primary/50"
                                }`}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedReturnDate && selectedReturnTime && (
                    <div className="border-t border-border px-3 py-2 bg-primary/5 flex items-center justify-between">
                      <span className="text-xs font-medium text-primary">
                        {new Date(selectedReturnDate + "T12:00:00").toLocaleDateString("pt-BR")} às {selectedReturnTime}
                      </span>
                      <span className="text-[10px] text-muted-foreground capitalize">
                        {returnType === "presencial" ? `Presencial · ${returnCity}` : "Online"}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
                Arquivos <span className="normal-case font-normal tracking-normal">(opcional)</span>
              </label>
              <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                <Paperclip className="h-3 w-3" />Anexar
                <input
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.png,.jpg,.jpeg"
                  onChange={e => {
                    const picked = Array.from(e.target.files || []);
                    e.target.value = "";
                    if (picked.length) onAddFiles(picked);
                  }}
                />
              </label>
            </div>

            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted border border-border/50 text-xs text-foreground/80">
                    <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate max-w-[140px]">{file.name}</span>
                    <span className="text-muted-foreground shrink-0">{formatBytes(file.size)}</span>
                    <button onClick={() => onRemoveFile(index)} className="ml-0.5 text-muted-foreground hover:text-red-500 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" className="flex-1 h-9 rounded-md text-sm" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button className="flex-1 h-9 rounded-md text-sm gap-2" onClick={onSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
            Salvar prontuário
          </Button>
        </div>
      </div>
    </div>
  );
};
