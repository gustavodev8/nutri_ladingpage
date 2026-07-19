import type { ReactNode } from "react";
import {
  CalendarCheck, CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight, Clock,
  Globe, LinkIcon, Loader2, Mail, MapPin, Phone, Search, User, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BookingPaymentStatus, Patient } from "@/lib/supabase";
import { CITIES } from "./bookingDateUtils";
import { NewBookingSummary } from "./NewBookingSummary";

interface NewBookingModalProps {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onCreate: () => void;

  isManualEntry: boolean;
  onToggleManualEntry: () => void;
  patientSearch: string;
  setPatientSearch: (value: string) => void;
  filteredPatients: Patient[];
  selectedPatientId: string;
  onSelectPatient: (patient: Patient) => void;
  exactNamePatient: Patient | null;
  onIgnoreExactName: () => void;

  newName: string;
  setNewName: (value: string) => void;
  newEmail: string;
  setNewEmail: (value: string) => void;
  newPhone: string;
  setNewPhone: (value: string) => void;

  planOptions: string[];
  planSessionMap: Record<string, number>;
  onlinePlanName?: string;
  presencialPlanName?: string;
  newPlan: string;
  setNewPlan: (value: string) => void;
  newCustomPlan: string;
  setNewCustomPlan: (value: string) => void;
  newType: "online" | "presencial";
  setNewType: (value: "online" | "presencial") => void;

  manualCity: string;
  setManualCity: (value: string) => void;
  manualDate: string;
  setManualDate: (value: string) => void;
  manualTime: string;
  setManualTime: (value: string) => void;
  newSessions: number;
  setNewSessions: (value: number) => void;
  loadingModalSlots: boolean;
  modalSlotsBusy: string[];
  modalCalYear: number;
  modalCalMonth: number;
  setModalCalYear: (value: number) => void;
  setModalCalMonth: (value: number) => void;
  modalCanSelectDate: (date: string) => boolean;
  modalTimesForDate: () => string[];

  newPaymentStatus: BookingPaymentStatus;
  setNewPaymentStatus: (value: BookingPaymentStatus) => void;
  newNotes: string;
  setNewNotes: (value: string) => void;
}

export const NewBookingModal = ({
  open,
  saving,
  onClose,
  onCreate,
  isManualEntry,
  onToggleManualEntry,
  patientSearch,
  setPatientSearch,
  filteredPatients,
  selectedPatientId,
  onSelectPatient,
  exactNamePatient,
  onIgnoreExactName,
  newName,
  setNewName,
  newEmail,
  setNewEmail,
  newPhone,
  setNewPhone,
  planOptions,
  planSessionMap,
  onlinePlanName,
  presencialPlanName,
  newPlan,
  setNewPlan,
  newCustomPlan,
  setNewCustomPlan,
  newType,
  setNewType,
  manualCity,
  setManualCity,
  manualDate,
  setManualDate,
  manualTime,
  setManualTime,
  newSessions,
  setNewSessions,
  loadingModalSlots,
  modalSlotsBusy,
  modalCalYear,
  modalCalMonth,
  setModalCalYear,
  setModalCalMonth,
  modalCanSelectDate,
  modalTimesForDate,
  newPaymentStatus,
  setNewPaymentStatus,
  newNotes,
  setNewNotes,
}: NewBookingModalProps) => {
  if (!open) return null;

  const isOnline = newPlan === onlinePlanName;
  const isPresencial = newPlan === presencialPlanName;
  const isAutoType = isOnline || isPresencial;
  const isProtocol = newPlan !== "" && !isAutoType;

  const changeMonth = (direction: -1 | 1) => {
    const d = new Date(modalCalYear, modalCalMonth + direction, 1);
    setModalCalYear(d.getFullYear());
    setModalCalMonth(d.getMonth());
  };

  const typeButtons = (label: string) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2 h-9">
        {(["online", "presencial"] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setNewType(t)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border text-xs font-medium transition-all ${
              newType === t
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/30"
            }`}
          >
            {t === "online" ? <Globe className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
            {t === "online" ? "Online" : "Presencial"}
          </button>
        ))}
      </div>
    </div>
  );

  const calendarCells: ReactNode[] = [];
  const firstDay = new Date(modalCalYear, modalCalMonth, 1).getDay();
  const daysInMonth = new Date(modalCalYear, modalCalMonth + 1, 0).getDate();
  for (let i = 0; i < firstDay; i++) calendarCells.push(<div key={`e${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${modalCalYear}-${String(modalCalMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const available = modalCanSelectDate(dateStr);
    const selected = manualDate === dateStr;
    const today = new Date().toISOString().split("T")[0] === dateStr;
    calendarCells.push(
      <button
        key={d}
        type="button"
        disabled={!available}
        onClick={() => { setManualDate(dateStr); setManualTime(""); }}
        className={`relative aspect-square flex items-center justify-center rounded-lg text-[11px] font-medium transition-all
          ${selected ? "bg-primary text-primary-foreground" :
            today ? "bg-primary/10 text-primary" :
            available ? "hover:bg-muted text-foreground" :
            "text-muted-foreground/30 cursor-default"}`}
      >
        {d}
        {available && !selected && (
          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary/60" />
        )}
      </button>
    );
  }

  const timesForSelectedDate = modalTimesForDate();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-6 bg-black/60 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-5xl bg-background rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "min(92dvh, 90vh)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarPlus className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Nova consulta</p>
              <p className="text-xs text-muted-foreground">Criação manual pelo admin</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paciente</p>
                <button type="button" onClick={onToggleManualEntry} className="text-xs text-primary font-medium hover:underline">
                  {isManualEntry ? "Selecionar existente" : "Preencher manualmente"}
                </button>
              </div>

              {!isManualEntry ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                    <Input
                      value={patientSearch}
                      onChange={e => setPatientSearch(e.target.value)}
                      placeholder="Digite nome, email, telefone ou CPF..."
                      className="pl-8 h-9 text-sm"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-border bg-background divide-y divide-border/60">
                    {filteredPatients.length === 0 ? (
                      <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                        Nenhum paciente encontrado.
                      </div>
                    ) : (
                      filteredPatients.slice(0, 12).map(patient => {
                        const selected = selectedPatientId === String(patient.id);
                        return (
                          <button
                            key={patient.id ?? `${patient.name}-${patient.email || patient.phone || patient.cpf || ""}`}
                            type="button"
                            onClick={() => onSelectPatient(patient)}
                            className={`w-full text-left px-3 py-2.5 transition-colors ${
                              selected ? "bg-primary/10" : "hover:bg-muted/50"
                            }`}
                          >
                            <p className="text-sm font-semibold text-foreground">{patient.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {[patient.email, patient.phone, patient.cpf].filter(Boolean).join(" · ") || "Sem contato cadastrado"}
                            </p>
                          </button>
                        );
                      })
                    )}
                  </div>
                  {filteredPatients.length > 12 && (
                    <p className="text-[11px] text-muted-foreground">
                      Mostrando 12 resultados. Digite mais para refinar.
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Nome completo *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                      <Input
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="Nome do paciente"
                        className="pl-8 h-9 text-sm"
                      />
                    </div>
                    {exactNamePatient && (
                      <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                        <p className="text-xs font-semibold text-amber-800">
                          Já existe um paciente com esse nome.
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectPatient(exactNamePatient)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                          >
                            <LinkIcon className="h-3 w-3" />
                            Usar {exactNamePatient.name}
                          </button>
                          <button
                            type="button"
                            onClick={onIgnoreExactName}
                            className="text-xs font-medium text-muted-foreground hover:text-foreground"
                          >
                            Continuar manualmente
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                      <Input
                        type="email"
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        className="pl-8 h-9 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                      <Input
                        value={newPhone}
                        onChange={e => setNewPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                        className="pl-8 h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-1 border-t border-border/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Plano e tipo</p>
                <div className={`grid gap-3 ${isAutoType || !newPlan ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Plano *</Label>
                    <select
                      value={newPlan}
                      onChange={e => {
                        const p = e.target.value;
                        setNewPlan(p);
                        if (planSessionMap[p]) setNewSessions(planSessionMap[p]);
                      }}
                      className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Selecionar plano…</option>
                      {planOptions.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                      <option value="__custom__">Outro (digitar)</option>
                    </select>
                  </div>

                  {isAutoType && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tipo</Label>
                      <div className="h-9 flex items-center px-3 rounded-lg border border-border bg-muted/30 gap-2 text-sm text-muted-foreground">
                        {newType === "online"
                          ? <><Globe className="h-3.5 w-3.5 text-primary" /><span>Online</span></>
                          : <><MapPin className="h-3.5 w-3.5 text-primary" /><span>Presencial</span></>
                        }
                        <span className="ml-auto text-xs text-muted-foreground/50">definido pelo plano</span>
                      </div>
                    </div>
                  )}

                  {newPlan === "__custom__" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nome do plano</Label>
                      <Input
                        value={newCustomPlan}
                        onChange={e => setNewCustomPlan(e.target.value)}
                        placeholder="Ex: Protocolo Personalizado"
                        className="h-9 text-sm"
                      />
                    </div>
                  )}

                  {isProtocol && typeButtons("Modelo da primeira consulta *")}
                </div>
              </div>

              <div className="pt-1 border-t border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Agenda</p>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Limite de retornos:</Label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={newSessions}
                      onChange={e => setNewSessions(Number(e.target.value))}
                      className="w-14 h-7 rounded-lg border border-input bg-background px-2 text-xs text-center focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                {newType === "presencial" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-border bg-muted/20 p-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Cidade do atendimento *</Label>
                      <select
                        value={manualCity}
                        onChange={e => setManualCity(e.target.value)}
                        className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground leading-relaxed">
                      A agenda abaixo mostra apenas os horários presenciais cadastrados para essa cidade.
                    </div>
                  </div>
                )}

                {loadingModalSlots ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          type="button"
                          onClick={() => changeMonth(-1)}
                          className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-xs font-semibold text-foreground capitalize">
                          {new Date(modalCalYear, modalCalMonth).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeMonth(1)}
                          className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-7 mb-1">
                        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                          <div key={i} className="text-center text-[10px] font-medium text-muted-foreground/50 py-0.5">{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-0.5">{calendarCells}</div>
                      <p className="text-[10px] text-muted-foreground/50 mt-2 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 inline-block" /> horários disponíveis
                      </p>
                    </div>

                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      {!manualDate ? (
                        <div className="flex flex-col items-center justify-center h-full py-8 gap-2 text-center">
                          <CalendarCheck className="h-8 w-8 text-muted-foreground/20" />
                          <p className="text-xs text-muted-foreground/50">Selecione uma data no calendário</p>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs font-semibold text-foreground mb-1">
                            {new Date(manualDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}
                          </p>
                          <p className="text-[10px] text-muted-foreground mb-3 capitalize">
                            {newType === "online" ? "Atendimento online" : "Atendimento presencial"}
                          </p>
                          {timesForSelectedDate.length === 0 ? (
                            <p className="text-xs text-muted-foreground/50 py-4 text-center">Sem horários para esta data</p>
                          ) : (
                            <div className="grid grid-cols-2 gap-1.5">
                              {timesForSelectedDate.map(t => {
                                const busy = modalSlotsBusy.includes(t);
                                const selected = manualTime === t;
                                return (
                                  <button
                                    key={t}
                                    type="button"
                                    disabled={busy}
                                    onClick={() => setManualTime(t)}
                                    className={`py-1.5 rounded-lg text-xs font-medium transition-all border
                                      ${selected ? "bg-primary text-primary-foreground border-primary" :
                                        busy ? "text-muted-foreground/30 border-border/30 line-through cursor-default" :
                                        "border-border hover:border-primary/40 hover:bg-primary/5 text-foreground"}`}
                                  >
                                    {t}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {newSessions > 1 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3 w-3 shrink-0" />
                    1 consulta inicial agendada. Os {newSessions - 1} retorno{newSessions - 1 > 1 ? "s" : ""} serão marcados ao concluir cada sessão.
                  </p>
                )}
              </div>

              <div className="pt-1 border-t border-border/50 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pagamento</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "pending", label: "Pendente" },
                    { value: "paid", label: "Pago" },
                    { value: "free", label: "Cortesia" },
                  ] as const).map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setNewPaymentStatus(option.value)}
                      className={`h-9 rounded-lg border text-xs font-medium transition-all ${
                        newPaymentStatus === option.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground/70">
                  Isso controla apenas o financeiro. A consulta manual nasce confirmada na agenda.
                </p>
              </div>

              <div className="pt-1 border-t border-border/50 space-y-1.5">
                <Label className="text-xs">Observações (opcional)</Label>
                <textarea
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="Objetivo, condições, anotações iniciais…"
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <NewBookingSummary
              patientName={newName}
              patientEmail={newEmail}
              planName={newPlan}
              customPlanName={newCustomPlan}
              sessions={newSessions}
              date={manualDate}
              time={manualTime}
              type={newType}
              city={manualCity}
              paymentStatus={newPaymentStatus}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border shrink-0 bg-muted/30">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={onCreate} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {saving ? "Criando…" : "Criar consulta"}
          </Button>
        </div>
      </div>
    </div>
  );
};
