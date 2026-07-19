import { useState, useEffect } from "react";
import {
  Loader2,
  X, User,
  ChevronDown,
  Send, Trash2, Pencil,
  Plus, LinkIcon, UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchBookings, autoCompleteBookings, autoExpirePendingBookings,
  insertBooking, insertConsultationRecord, uploadRecordFile,
  fetchAvailabilitySlots, fetchBookingsForDate, updateBookingGroup,
  fetchPatients,
  type Booking, type ConsultationRecord, type RecordFile, type Patient,
  type BookingPaymentStatus
} from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useContent } from "@/contexts/ContentContext";
import { toast } from "@/hooks/use-toast";
import { calcBMI, normalizePersonName } from "./agendamentos/bookingDateUtils";
import {
  getBookingGroupStatus,
  inferPaymentStatus
} from "./agendamentos/bookingStatusUtils";
import { NewBookingModal } from "./agendamentos/NewBookingModal";
import { ScheduleReturnModal } from "./agendamentos/ScheduleReturnModal";
import { CompleteSessionModal } from "./agendamentos/CompleteSessionModal";
import { useBookingGroups } from "./agendamentos/useBookingGroups";
import { useReturnScheduling } from "./agendamentos/useReturnScheduling";
import { useBookingStatusActions } from "./agendamentos/useBookingStatusActions";
import { useBookingPatientActions } from "./agendamentos/useBookingPatientActions";
import { useSendMaterial } from "./agendamentos/useSendMaterial";
import { SendMaterialModal } from "./agendamentos/SendMaterialModal";
import { RescheduleBookingModal } from "./agendamentos/RescheduleBookingModal";
import { RecordDetailModal } from "./agendamentos/RecordDetailModal";
import { BookingRecordsTab } from "./agendamentos/BookingRecordsTab";
import { BookingPatientPanel } from "./agendamentos/BookingPatientPanel";
import { type BookingClinicalNotes } from "./agendamentos/bookingPatientDetails";
import { BookingSessionsTab } from "./agendamentos/BookingSessionsTab";
import { BookingDetailModal, type BookingDetailTab } from "./agendamentos/BookingDetailModal";
import { BookingGroupsList } from "./agendamentos/BookingGroupsList";
import { BookingFiltersBar } from "./agendamentos/BookingFiltersBar";
import { BookingDashboardSummary } from "./agendamentos/BookingDashboardSummary";
import { useBookingFilters } from "./agendamentos/useBookingFilters";
import { useBookingRecords } from "./agendamentos/useBookingRecords";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const AdminAgendamentos = () => {
  const { content } = useContent();
  const navigate = useNavigate();
  const planOptions    = content.loja.plans.map(p => p.name);
  const onlinePlanName = planOptions[0];
  const presencialPlanName = planOptions[1];
  const planSessionMap = Object.fromEntries(content.loja.plans.map(p => [p.name, p.sessionCount ?? 1]));

  const [bookings, setBookings]   = useState<Booking[]>([]);
  const [loading, setLoading]     = useState(true);
  const [detail, setDetail]       = useState<string | null>(null);
  const [detailMoreOpen, setDetailMoreOpen] = useState(false);
  const filters = useBookingFilters();

  // Patients for manual creation
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [isManualEntry, setIsManualEntry] = useState(true);
  const [patientSearch, setPatientSearch] = useState("");
  const [ignoredExactPatientName, setIgnoredExactPatientName] = useState("");
  
  useEffect(() => {
    fetchPatients().then(setPatients);
  }, []);

  // Prontuário — visualização / edição / exclusão
  const {
    records,
    loadingRecords,
    viewRecord,
    setViewRecord,
    editingRecordId,
    setEditingRecordId,
    confirmDeleteId,
    setConfirmDeleteId,
    editNotes,
    setEditNotes,
    editNextSteps,
    setEditNextSteps,
    editNextReturn,
    setEditNextReturn,
    editFiles,
    setEditFiles,
    editNewFiles,
    setEditNewFiles,
    savingEdit,
    loadRecords,
    openEditRecord,
    handleSaveEdit,
    handleDeleteRecord,
  } = useBookingRecords();

  // Confirm destructive action (no_show / cancelled)
  const [confirmAction, setConfirmAction]   = useState<{ id: number; status: "no_show" | "cancelled" } | null>(null);

  // Detail inner tab — "dados" is mobile-only (replaces sidebar)
  const [detailTab, setDetailTab] = useState<BookingDetailTab>("sessions");

  // Completion modal
  const [completing, setCompleting]           = useState<Booking | null>(null);
  const [compNotes, setCompNotes]             = useState("");
  const [compWeight, setCompWeight]           = useState("");
  const [compHeight, setCompHeight]           = useState("");
  const [compNextSteps, setCompNextSteps]     = useState("");
  const [compFiles, setCompFiles]             = useState<File[]>([]);
  const [savingRecord, setSavingRecord]       = useState(false);
  const [schedulingReturn, setSchedulingReturn] = useState<Booking | null>(null);
  const [savingReturn, setSavingReturn]       = useState(false);

  // ── Editar agendamento ────────────────────────────────────────────────────
  const [editingDetail, setEditingDetail]   = useState(false);
  const [editDName, setEditDName]           = useState("");
  const [editDEmail, setEditDEmail]         = useState("");
  const [editDPhone, setEditDPhone]         = useState("");
  const [editDGoal, setEditDGoal]           = useState("");
  const [editDRestrictions, setEditDRestrictions] = useState("");
  const [editDAllergies, setEditDAllergies] = useState("");
  const [editDHealth, setEditDHealth]       = useState("");
  const [editDMeds, setEditDMeds]           = useState("");
  const [editDHadNutri, setEditDHadNutri]   = useState("");
  const [editDHowFound, setEditDHowFound]   = useState("");
  const [editDObs, setEditDObs]             = useState("");
  const [savingDetailEdit, setSavingDetailEdit] = useState(false);

  const openDetailEdit = (first: typeof detailFirst, notes: typeof detailNotes) => {
    setEditDName(first?.client_name || "");
    setEditDEmail(first?.client_email || "");
    setEditDPhone(first?.client_phone || "");
    setEditDGoal(notes.goal || "");
    setEditDRestrictions(notes.restrictions || "");
    setEditDAllergies(notes.allergies || "");
    setEditDHealth(notes.healthConditions || "");
    setEditDMeds(notes.medications || "");
    setEditDHadNutri(notes.hadNutritionist || "");
    setEditDHowFound(notes.howFound || "");
    setEditDObs((notes as Record<string,unknown>).obs as string || "");
    setEditingDetail(true);
  };

  const handleSaveDetailEdit = async () => {
    if (!detail) return;
    setSavingDetailEdit(true);
    const updatedNotes = {
      ...detailNotes,
      goal:             editDGoal        || undefined,
      restrictions:     editDRestrictions || undefined,
      allergies:        editDAllergies   || undefined,
      healthConditions: editDHealth      || undefined,
      medications:      editDMeds        || undefined,
      hadNutritionist:  editDHadNutri    || undefined,
      howFound:         editDHowFound    || undefined,
      obs:              editDObs         || undefined,
    };
    const ok = await updateBookingGroup(detail, {
      client_name:  editDName.trim(),
      client_email: editDEmail.trim(),
      client_phone: editDPhone.trim(),
      notes:        JSON.stringify(updatedNotes),
    });
    setSavingDetailEdit(false);
    if (ok) {
      setBookings(prev => prev.map(b =>
        b.booking_group_id === detail
          ? { ...b, client_name: editDName.trim(), client_email: editDEmail.trim(), client_phone: editDPhone.trim(), notes: JSON.stringify(updatedNotes) }
          : b
      ));
      setEditingDetail(false);
      toast({ title: "Dados atualizados!" });
    } else {
      toast({ title: "Erro ao salvar.", variant: "destructive" });
    }
  };

  // ── Nova consulta manual ──────────────────────────────────────────────────
  const [newModal, setNewModal]           = useState(false);
  const [newName, setNewName]             = useState("");
  const [newEmail, setNewEmail]           = useState("");
  const [newPhone, setNewPhone]           = useState("");
  const [newPlan, setNewPlan]             = useState("");
  const [newCustomPlan, setNewCustomPlan] = useState("");
  const [newType, setNewType]             = useState<"online" | "presencial">("online");
  const [manualCity, setManualCity]       = useState("Alagoinhas");
  const [newPaymentStatus, setNewPaymentStatus] = useState<BookingPaymentStatus>("pending");
  const [manualDate, setManualDate]       = useState("");
  const [manualTime, setManualTime]       = useState("");
  const [newSessions, setNewSessions]     = useState(1);
  const [newNotes, setNewNotes]           = useState("");
  const [savingNew, setSavingNew]         = useState(false);

  // Availability calendar for manual modal
  const [modalSlots, setModalSlots]           = useState<Array<{date: string; start_time: string; type: string; city?: string}>>([]);
  const [modalSlotsBusy, setModalSlotsBusy]   = useState<string[]>([]);
  const [loadingModalSlots, setLoadingModalSlots] = useState(false);
  const [modalCalYear, setModalCalYear]       = useState(new Date().getFullYear());
  const [modalCalMonth, setModalCalMonth]     = useState(new Date().getMonth());

  const selectPatientForManualBooking = (patient: Patient) => {
    setSelectedPatientId(patient.id ? String(patient.id) : "");
    setNewName(patient.name);
    setNewEmail(patient.email || "");
    setNewPhone(patient.phone || "");
    setPatientSearch(patient.name);
    setIsManualEntry(false);
    setIgnoredExactPatientName("");
  };

  const patientSearchTerm = normalizePersonName(patientSearch);
  const filteredPatients = patientSearchTerm
    ? patients.filter(patient => {
        const haystack = normalizePersonName(`${patient.name} ${patient.email || ""} ${patient.phone || ""} ${patient.cpf || ""}`);
        return haystack.includes(patientSearchTerm);
      })
    : patients;
  const exactNamePatient = (() => {
    const normalizedName = normalizePersonName(newName);
    if (!isManualEntry || !normalizedName || normalizedName === ignoredExactPatientName) return null;
    return patients.find(patient => normalizePersonName(patient.name) === normalizedName) || null;
  })();

  // Fetch slots whenever modal type changes
  useEffect(() => {
    if (!newModal) return;
    setLoadingModalSlots(true);
    fetchAvailabilitySlots()
      .then(slots => setModalSlots(slots.filter(s =>
        s.type === newType && (newType !== "presencial" || s.city === manualCity)
      )))
      .finally(() => setLoadingModalSlots(false));
    setManualDate(""); setManualTime("");
  }, [newModal, newType, manualCity]);

  useEffect(() => {
    if (newPlan === onlinePlanName && newType !== "online") setNewType("online");
    if (newPlan === presencialPlanName && newType !== "presencial") setNewType("presencial");
  }, [newPlan, newType, onlinePlanName, presencialPlanName]);

  // Fetch booked times when date is selected
  useEffect(() => {
    if (!manualDate) { setModalSlotsBusy([]); return; }
    fetchBookingsForDate(manualDate, newType)
      .then(booked => setModalSlotsBusy(booked.map(b => (b.appointment_time || "").substring(0, 5))));
  }, [manualDate, newType]);

  const modalCanSelectDate = (dateStr: string) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(dateStr + "T12:00:00");
    if (d < today) return false;
    return modalSlots.some(s => s.date === dateStr);
  };

  const modalTimesForDate = () =>
    modalSlots
      .filter(s => s.date === manualDate)
      .map(s => s.start_time.substring(0, 5))
      .sort();

  const openNewModal = () => {
    setNewName(""); setNewEmail(""); setNewPhone("");
    setSelectedPatientId("");
    setIsManualEntry(true);
    setPatientSearch("");
    setIgnoredExactPatientName("");
    setNewPlan(""); setNewCustomPlan("");
    setNewType("online");
    setManualCity("Alagoinhas");
    setNewPaymentStatus("pending");
    setManualDate(""); setManualTime("");
    setNewSessions(1); setNewNotes("");
    setModalCalYear(new Date().getFullYear());
    setModalCalMonth(new Date().getMonth());
    setNewModal(true);
  };

  const handleCreateManual = async () => {
    if (!newName.trim()) { toast({ title: "Informe o nome do paciente.", variant: "destructive" }); return; }
    if (!manualDate)     { toast({ title: "Informe a data da consulta.", variant: "destructive" }); return; }
    if (!manualTime)     { toast({ title: "Informe o horário.", variant: "destructive" }); return; }
    const planName = newPlan === "__custom__" ? newCustomPlan.trim() : newPlan;
    if (!modalTimesForDate().includes(manualTime)) {
      toast({ title: "Horário fora da disponibilidade", description: "Escolha um horário cadastrado na aba Disponibilidades.", variant: "destructive" });
      return;
    }
    if (modalSlotsBusy.includes(manualTime)) {
      toast({ title: "Horário indisponível", description: "Esse horário já está ocupado.", variant: "destructive" });
      return;
    }
    if (!planName) { toast({ title: "Selecione ou informe o plano.", variant: "destructive" }); return; }

    setSavingNew(true);
    const groupId = crypto.randomUUID();
    const total   = Math.max(1, Math.min(20, newSessions));

    const b: Booking = {
      booking_group_id: groupId,
      session_number:   1,
      total_sessions:   total,
      client_name:      newName.trim(),
      client_email:     newEmail.trim(),
      client_phone:     newPhone.trim(),
      patient_id:       !isManualEntry && selectedPatientId ? Number(selectedPatientId) : undefined,
      plan_name:        planName,
      plan_index:       0,
      appointment_date: manualDate,
      appointment_time: manualTime,
      type:             newType,
      status:           "confirmed",
      payment_status:   newPaymentStatus,
      payment_method:   newPaymentStatus === "free" ? "free" : newPaymentStatus === "paid" ? "manual" : null,
      notes:            JSON.stringify({
        _manual: true,
        ...(newType === "presencial" ? { _city: manualCity } : {}),
        ...(newNotes ? { obs: newNotes } : {}),
      }),
    };

    const ok = await insertBooking(b);
    setSavingNew(false);

    if (ok) {
      toast({ title: "Consulta criada!" });
      setNewModal(false);
      load();
    } else {
      toast({ title: "Erro ao criar consulta.", variant: "destructive" });
    }
  };

  const {
    returnCalYear,
    returnCalMonth,
    returnBookedTimes,
    loadingReturnSlots,
    returnType,
    returnCity,
    compNextReturn,
    compNextReturnTime,
    setReturnCalYear,
    setReturnCalMonth,
    setReturnType,
    setReturnCity,
    setCompNextReturn,
    setCompNextReturnTime,
    resetReturnSelection,
    prepareReturnScheduling,
    handleReturnDateSelect,
    getReturnAvailableDates,
    getReturnTimesForDate,
    canSelectReturnDate,
  } = useReturnScheduling();

  const {
    updating,
    confirmDeleteGroup,
    setConfirmDeleteGroup,
    deletingGroup,
    reschedule,
    setReschedule,
    newDate,
    setNewDate,
    newTime,
    setNewTime,
    rescheduleMsg,
    setRescheduleMsg,
    rescheduling,
    handleDeleteGroup,
    handleStatus,
    handlePaymentStatus,
    openReschedule,
    handleReschedule,
  } = useBookingStatusActions({ setBookings, setDetail });

  const {
    creatingPatient,
    duplicateModal,
    setDuplicateModal,
    doCreatePatient,
    doLinkExisting,
    handleCreatePatient,
  } = useBookingPatientActions({ setBookings });

  const {
    sendTarget,
    setSendTarget,
    sendSubject,
    setSendSubject,
    sendBody,
    setSendBody,
    sendFiles,
    sending,
    openSendMaterial,
    handleAddFiles,
    handleSendMaterial,
    removeSendFile,
  } = useSendMaterial();

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const raw      = await fetchBookings();
    const active   = await autoExpirePendingBookings(raw);
    const updated  = await autoCompleteBookings(active);
    setBookings(updated);
    setLoading(false);
  };

  const openComplete = async (session: Booking) => {
    setCompleting(session);
    setCompNotes(""); setCompWeight(""); setCompHeight("");
    setCompNextSteps(""); setCompFiles([]);
    await prepareReturnScheduling(session);
  };

  const openScheduleReturn = async (session: Booking) => {
    setSchedulingReturn(session);
    await prepareReturnScheduling(session);
  };

  const addCompletionFiles = (files: File[]) => {
    const total = [...compFiles, ...files].reduce((acc, file) => acc + file.size, 0);
    if (total > 20 * 1024 * 1024) {
      toast({ title: "Limite de 20 MB excedido", variant: "destructive" });
      return;
    }
    setCompFiles(prev => [...prev, ...files]);
  };

  const removeCompletionFile = (index: number) => {
    setCompFiles(prev => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const buildNextReturnBooking = (
    baseSession: Booking,
    appointmentDate: string,
    appointmentTime: string
  ): Booking => {
    const baseNotes = (() => { try { return JSON.parse(baseSession.notes || "{}"); } catch { return {}; } })();
    if (returnType === "presencial") baseNotes._city = returnCity;
    else delete baseNotes._city;
    return {
      booking_group_id: baseSession.booking_group_id,
      session_number: (baseSession.session_number ?? 1) + 1,
      total_sessions: baseSession.total_sessions,
      client_name: baseSession.client_name,
      client_email: baseSession.client_email,
      client_phone: baseSession.client_phone,
      client_cpf: baseSession.client_cpf,
      patient_id: baseSession.patient_id,
      plan_name: baseSession.plan_name,
      plan_index: baseSession.plan_index,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      type: returnType,
      status: "confirmed",
      payment_status: baseSession.payment_status ?? inferPaymentStatus(baseSession),
      payment_method: baseSession.payment_method ?? null,
      notes: JSON.stringify(baseNotes),
    };
  };

  const handleScheduleReturn = async () => {
    if (!schedulingReturn) return;
    if (!compNextReturn || !compNextReturnTime) {
      toast({ title: "Selecione data e horário do próximo retorno.", variant: "destructive" });
      return;
    }
    if ((schedulingReturn.session_number ?? 1) >= (schedulingReturn.total_sessions ?? 1)) {
      toast({ title: "Esse plano já está na última sessão.", variant: "destructive" });
      return;
    }

    const availableTimes = getReturnTimesForDate(compNextReturn, returnType);
    if (!availableTimes.includes(compNextReturnTime)) {
      toast({ title: "Horário fora da disponibilidade", description: "Escolha um horário cadastrado na aba Disponibilidades.", variant: "destructive" });
      return;
    }

    setSavingReturn(true);
    try {
      const conflict = await fetchBookingsForDate(compNextReturn, returnType, schedulingReturn.booking_group_id);
      if (conflict.some(b => (b.appointment_time || "").substring(0, 5) === compNextReturnTime)) {
        toast({ title: "Horário indisponível", description: "Esse horário foi ocupado. Escolha outro.", variant: "destructive" });
        return;
      }

      const ok = await insertBooking(buildNextReturnBooking(schedulingReturn, compNextReturn, compNextReturnTime));
      if (!ok) {
        toast({ title: "Erro ao agendar retorno.", variant: "destructive" });
        return;
      }

      toast({ title: "Retorno agendado!" });
      setSchedulingReturn(null);
      load();
    } finally {
      setSavingReturn(false);
    }
  };

  const handleSaveRecord = async () => {
    if (!completing) return;
    setSavingRecord(true);

    try {
      const w = compWeight ? parseFloat(compWeight) : null;
      const h = compHeight ? parseFloat(compHeight) : null;

      // 0. Idempotência: verifica se já existe registro para este booking_id
      const isLastSession = (completing.session_number ?? 1) >= (completing.total_sessions ?? 1);

      if (!isLastSession && compNextReturn) {
        if (!compNextReturnTime) {
          toast({ title: "Selecione o horário do próximo retorno.", variant: "destructive" });
          return;
        }
        const availableTimes = getReturnTimesForDate(compNextReturn, returnType);
        if (!availableTimes.includes(compNextReturnTime)) {
          toast({ title: "Horário fora da disponibilidade", description: "Escolha um horário cadastrado na aba Disponibilidades.", variant: "destructive" });
          return;
        }
        const conflict = await fetchBookingsForDate(compNextReturn, returnType, completing.booking_group_id);
        if (conflict.some(b => (b.appointment_time || "").substring(0, 5) === compNextReturnTime)) {
          toast({ title: "Horário indisponível", description: "Esse horário já foi ocupado. Escolha outro.", variant: "destructive" });
          return;
        }
      }

      const existing = records.find(r => r.booking_id === completing.id);
      if (existing) {
        toast({ title: "Prontuário já registrado para esta sessão.", variant: "destructive" });
        return;
      }

      // 1. Tenta salvar prontuário com session_number; se a coluna ainda não
      //    existir no banco, tenta novamente sem ela para não bloquear o fluxo.
      // Upload arquivos ao Storage e coleta URLs
      let fileRefs: RecordFile[] | null = null;
      if (compFiles.length > 0) {
        const results = await Promise.all(
          compFiles.map(async f => {
            const url = await uploadRecordFile(f, completing.booking_group_id);
            return url ? { name: f.name, url } : null;
          })
        );
        const valid = results.filter(Boolean) as RecordFile[];
        if (valid.length > 0) fileRefs = valid;
      }

      const recordPayload: ConsultationRecord = {
        booking_id: completing.id,
        booking_group_id: completing.booking_group_id,
        session_number: completing.session_number,
        client_name: completing.client_name,
        client_email: completing.client_email,
        notes: compNotes.trim() || null,
        weight: w, height: h,
        next_return_date: compNextReturn || null,
        next_steps: compNextSteps.trim() || null,
        files: fileRefs,
      };

      let ok = await insertConsultationRecord(recordPayload);
      if (!ok) {
        // Fallback: tenta sem session_number (coluna pode não existir ainda)
        const { session_number: _drop, ...payloadWithout } = recordPayload;
        ok = await insertConsultationRecord(payloadWithout as ConsultationRecord);
      }

      if (!ok) {
        toast({ title: "Erro ao salvar prontuário", variant: "destructive" });
        return;
      }

      // 2. Marca sessão como concluída via Edge Function (usa service role key, bypassa RLS)
      const completeRes = await fetch(`${SUPABASE_URL}/functions/v1/complete-booking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ booking_id: completing.id }),
      });
      const completeData = await completeRes.json().catch(() => ({}));
      if (!completeRes.ok) {
        toast({ title: "Erro ao atualizar status", description: completeData.error || `HTTP ${completeRes.status}`, variant: "destructive" });
        return;
      }

      // 3. Cria próximo retorno APENAS se não for a última sessão do plano
      let returnCreated = false;
      if (!isLastSession && compNextReturn) {
        returnCreated = await insertBooking(
          buildNextReturnBooking(completing, compNextReturn, compNextReturnTime || completing.appointment_time)
        );
      }

      // 4. Atualiza estado local imediatamente, depois recarrega em background
      const completingId = completing.id!;
      setBookings(prev =>
        prev.map(b => b.id === completingId ? { ...b, status: "completed" } : b)
      );
      setCompleting(null);
      setDetail(null);
      filters.setFilter(isLastSession ? "completed" : "confirmed");

      load();

      toast({
        title: isLastSession ? "Plano concluído! 🎉" : "Consulta concluída!",
        description: isLastSession
          ? `Todas as ${completing.total_sessions} sessões do plano foram finalizadas.`
          : compNextReturn
            ? returnCreated
              ? `Retorno agendado para ${new Date(compNextReturn + "T12:00:00").toLocaleDateString("pt-BR")}`
              : "Prontuário salvo. Falha ao criar retorno."
            : "Prontuário salvo com sucesso.",
      });
    } finally {
      setSavingRecord(false);
    }
  };

  const openDetail = (groupId: string) => {
    setDetail(groupId);
    setDetailTab("sessions");
    setDetailMoreOpen(false);
    setEditingDetail(false);
    loadRecords(groupId);
  };

  const {
    adminTodayISO,
    allGrouped,
    counts,
    groupEntries,
    detailGroup,
    detailFirst,
    upcomingReturnSessions,
    todaySessions,
  } = useBookingGroups({
    bookings,
    detail,
    filter: filters.filter,
    search: filters.search,
    filterType: filters.filterType,
    filterDateFrom: filters.filterDateFrom,
    filterDateTo: filters.filterDateTo,
    filterPlan: filters.filterPlan,
  });

  const detailNotes: BookingClinicalNotes = (() => {
    try { return JSON.parse(detailFirst?.notes || "{}"); } catch { return {}; }
  })();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agendamentos</h1>
          <p className="text-sm text-muted-foreground">Gerencie as consultas agendadas</p>
        </div>
        <Button onClick={openNewModal} size="sm" className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nova consulta</span>
          <span className="sm:hidden">Nova</span>
        </Button>
      </div>

      <BookingFiltersBar
        filters={filters}
        bookings={bookings}
        counts={counts}
      />

      <BookingDashboardSummary
        todaySessions={todaySessions}
        upcomingReturnSessions={upcomingReturnSessions}
        groupedBookings={allGrouped}
        onOpenDetail={openDetail}
        setFilter={filters.setFilter}
      />

      <BookingGroupsList
        loading={loading}
        groupEntries={groupEntries}
        onOpenDetail={openDetail}
      />

      <BookingDetailModal
        groupId={detail}
        first={detailFirst}
        sessions={detailGroup}
        recordsCount={records.length}
        activeTab={detailTab}
        setActiveTab={setDetailTab}
        creatingPatient={creatingPatient}
        moreOpen={detailMoreOpen}
        setMoreOpen={setDetailMoreOpen}
        confirmDeleteGroup={confirmDeleteGroup}
        deletingGroup={deletingGroup}
        onClose={() => setDetail(null)}
        onOpenPatient={patientId => navigate(`/admin/pacientes/${patientId}`)}
        onCreatePatient={() => detailFirst && handleCreatePatient(detailFirst, detailNotes as Record<string, string>)}
        onSendMaterial={() => {
          if (!detailFirst) return;
          setDetail(null);
          setTimeout(() => openSendMaterial(detailFirst), 100);
        }}
        onRequestDelete={() => setConfirmDeleteGroup(detail)}
        onCancelDelete={() => setConfirmDeleteGroup(null)}
        onConfirmDelete={() => detail && handleDeleteGroup(detail)}
        desktopPatientPanel={
          detailFirst ? (
            <BookingPatientPanel
              variant="desktop"
              booking={detailFirst}
              notes={detailNotes}
              editing={editingDetail}
              saving={savingDetailEdit}
              creatingPatient={creatingPatient}
              editName={editDName}
              setEditName={setEditDName}
              editEmail={editDEmail}
              setEditEmail={setEditDEmail}
              editPhone={editDPhone}
              setEditPhone={setEditDPhone}
              editGoal={editDGoal}
              setEditGoal={setEditDGoal}
              editRestrictions={editDRestrictions}
              setEditRestrictions={setEditDRestrictions}
              editAllergies={editDAllergies}
              setEditAllergies={setEditDAllergies}
              editHealth={editDHealth}
              setEditHealth={setEditDHealth}
              editMeds={editDMeds}
              setEditMeds={setEditDMeds}
              editHadNutri={editDHadNutri}
              setEditHadNutri={setEditDHadNutri}
              editHowFound={editDHowFound}
              setEditHowFound={setEditDHowFound}
              editObs={editDObs}
              setEditObs={setEditDObs}
              onOpenEdit={() => openDetailEdit(detailFirst, detailNotes)}
              onCancelEdit={() => setEditingDetail(false)}
              onSaveEdit={handleSaveDetailEdit}
              onOpenPatient={patientId => navigate(`/admin/pacientes/${patientId}`)}
              onCreatePatient={() => handleCreatePatient(detailFirst, detailNotes as Record<string, string>)}
            />
          ) : null
        }
        sessionsPanel={
          <BookingSessionsTab
            sessions={detailGroup}
            updating={updating}
            confirmAction={confirmAction}
            setConfirmAction={setConfirmAction}
            onCloseDetail={() => setDetail(null)}
            onReschedule={openReschedule}
            onComplete={openComplete}
            onScheduleReturn={openScheduleReturn}
            onChangeStatus={handleStatus}
            onChangePaymentStatus={handlePaymentStatus}
          />
        }
        recordsPanel={
          <BookingRecordsTab
            loading={loadingRecords}
            records={records}
            editingRecordId={editingRecordId}
            confirmDeleteId={confirmDeleteId}
            editNotes={editNotes}
            setEditNotes={setEditNotes}
            editNextSteps={editNextSteps}
            setEditNextSteps={setEditNextSteps}
            editNextReturn={editNextReturn}
            setEditNextReturn={setEditNextReturn}
            editFiles={editFiles}
            setEditFiles={setEditFiles}
            editNewFiles={editNewFiles}
            setEditNewFiles={setEditNewFiles}
            savingEdit={savingEdit}
            onOpenRecord={setViewRecord}
            onEditRecord={openEditRecord}
            onCancelEdit={() => setEditingRecordId(null)}
            onRequestDelete={recordId => { setConfirmDeleteId(recordId); setEditingRecordId(null); }}
            onCancelDelete={() => setConfirmDeleteId(null)}
            onConfirmDelete={recordId => handleDeleteRecord(recordId, detail)}
            onSaveEdit={() => handleSaveEdit(detail)}
            onInvalidFiles={() => toast({ title: "Limite de 20 MB excedido", variant: "destructive" })}
          />
        }
        mobilePatientPanel={
          detailFirst ? (
            <BookingPatientPanel
              variant="mobile"
              booking={detailFirst}
              notes={detailNotes}
              editing={editingDetail}
              saving={savingDetailEdit}
              creatingPatient={creatingPatient}
              editName={editDName}
              setEditName={setEditDName}
              editEmail={editDEmail}
              setEditEmail={setEditDEmail}
              editPhone={editDPhone}
              setEditPhone={setEditDPhone}
              editGoal={editDGoal}
              setEditGoal={setEditDGoal}
              editRestrictions={editDRestrictions}
              setEditRestrictions={setEditDRestrictions}
              editAllergies={editDAllergies}
              setEditAllergies={setEditDAllergies}
              editHealth={editDHealth}
              setEditHealth={setEditDHealth}
              editMeds={editDMeds}
              setEditMeds={setEditDMeds}
              editHadNutri={editDHadNutri}
              setEditHadNutri={setEditDHadNutri}
              editHowFound={editDHowFound}
              setEditHowFound={setEditDHowFound}
              editObs={editDObs}
              setEditObs={setEditDObs}
              onOpenEdit={() => openDetailEdit(detailFirst, detailNotes)}
              onCancelEdit={() => setEditingDetail(false)}
              onSaveEdit={handleSaveDetailEdit}
              onOpenPatient={patientId => navigate(`/admin/pacientes/${patientId}`)}
              onCreatePatient={() => handleCreatePatient(detailFirst, detailNotes as Record<string, string>)}
            />
          ) : null
        }
      />

      <RecordDetailModal
        record={viewRecord}
        onClose={() => setViewRecord(null)}
        onEdit={openEditRecord}
        onDeleteRequest={setConfirmDeleteId}
      />

      <CompleteSessionModal
        booking={completing}
        saving={savingRecord}
        notes={compNotes}
        setNotes={setCompNotes}
        nextSteps={compNextSteps}
        setNextSteps={setCompNextSteps}
        returnType={returnType}
        setReturnType={setReturnType}
        returnCity={returnCity}
        setReturnCity={setReturnCity}
        loadingReturnSlots={loadingReturnSlots}
        returnCalYear={returnCalYear}
        returnCalMonth={returnCalMonth}
        setReturnCalYear={setReturnCalYear}
        setReturnCalMonth={setReturnCalMonth}
        selectedReturnDate={compNextReturn}
        setSelectedReturnDate={setCompNextReturn}
        selectedReturnTime={compNextReturnTime}
        setSelectedReturnTime={setCompNextReturnTime}
        bookedTimes={returnBookedTimes}
        getReturnTimesForDate={getReturnTimesForDate}
        canSelectReturnDate={canSelectReturnDate}
        onSelectReturnDate={handleReturnDateSelect}
        files={compFiles}
        onAddFiles={addCompletionFiles}
        onRemoveFile={removeCompletionFile}
        onClose={() => setCompleting(null)}
        onSubmit={handleSaveRecord}
      />

      <SendMaterialModal
        target={sendTarget}
        subject={sendSubject}
        setSubject={setSendSubject}
        body={sendBody}
        setBody={setSendBody}
        files={sendFiles}
        sending={sending}
        onAddFiles={handleAddFiles}
        onRemoveFile={removeSendFile}
        onClose={() => setSendTarget(null)}
        onSubmit={handleSendMaterial}
      />

      <ScheduleReturnModal
        booking={schedulingReturn}
        saving={savingReturn}
        returnType={returnType}
        setReturnType={setReturnType}
        returnCity={returnCity}
        setReturnCity={setReturnCity}
        loadingReturnSlots={loadingReturnSlots}
        availableDates={getReturnAvailableDates(returnType)}
        selectedDate={compNextReturn}
        selectedTime={compNextReturnTime}
        bookedTimes={returnBookedTimes}
        getTimesForDate={getReturnTimesForDate}
        onSelectDate={handleReturnDateSelect}
        setSelectedTime={setCompNextReturnTime}
        resetReturnSelection={resetReturnSelection}
        onClose={() => setSchedulingReturn(null)}
        onSubmit={handleScheduleReturn}
      />

      <RescheduleBookingModal
        booking={reschedule}
        newDate={newDate}
        setNewDate={setNewDate}
        newTime={newTime}
        setNewTime={setNewTime}
        message={rescheduleMsg}
        setMessage={setRescheduleMsg}
        rescheduling={rescheduling}
        onClose={() => setReschedule(null)}
        onSubmit={handleReschedule}
      />

      <NewBookingModal
        open={newModal}
        saving={savingNew}
        onClose={() => setNewModal(false)}
        onCreate={handleCreateManual}
        isManualEntry={isManualEntry}
        onToggleManualEntry={() => {
          const nextManual = !isManualEntry;
          setIsManualEntry(nextManual);
          if (!nextManual) {
            setPatientSearch(newName.trim());
          } else {
            setSelectedPatientId("");
            setIgnoredExactPatientName("");
          }
        }}
        patientSearch={patientSearch}
        setPatientSearch={setPatientSearch}
        filteredPatients={filteredPatients}
        selectedPatientId={selectedPatientId}
        onSelectPatient={selectPatientForManualBooking}
        exactNamePatient={exactNamePatient}
        onIgnoreExactName={() => setIgnoredExactPatientName(normalizePersonName(newName))}
        newName={newName}
        setNewName={setNewName}
        newEmail={newEmail}
        setNewEmail={setNewEmail}
        newPhone={newPhone}
        setNewPhone={setNewPhone}
        planOptions={planOptions}
        planSessionMap={planSessionMap}
        onlinePlanName={onlinePlanName}
        presencialPlanName={presencialPlanName}
        newPlan={newPlan}
        setNewPlan={setNewPlan}
        newCustomPlan={newCustomPlan}
        setNewCustomPlan={setNewCustomPlan}
        newType={newType}
        setNewType={setNewType}
        manualCity={manualCity}
        setManualCity={setManualCity}
        manualDate={manualDate}
        setManualDate={setManualDate}
        manualTime={manualTime}
        setManualTime={setManualTime}
        newSessions={newSessions}
        setNewSessions={setNewSessions}
        loadingModalSlots={loadingModalSlots}
        modalSlotsBusy={modalSlotsBusy}
        modalCalYear={modalCalYear}
        modalCalMonth={modalCalMonth}
        setModalCalYear={setModalCalYear}
        setModalCalMonth={setModalCalMonth}
        modalCanSelectDate={modalCanSelectDate}
        modalTimesForDate={modalTimesForDate}
        newPaymentStatus={newPaymentStatus}
        setNewPaymentStatus={setNewPaymentStatus}
        newNotes={newNotes}
        setNewNotes={setNewNotes}
      />

      {/* ── Duplicate patient modal ──────────────────────────────────────────── */}
      {duplicateModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setDuplicateModal(null); }}
        >
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-start gap-3 px-6 py-5 border-b border-border bg-amber-50/60 dark:bg-amber-950/20">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0 mt-0.5">
                <UserPlus className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Paciente(s) similar(es) encontrado(s)</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Já existe{duplicateModal.matches.length > 1 ? "m" : ""} {duplicateModal.matches.length} registro{duplicateModal.matches.length > 1 ? "s" : ""} com nome ou e-mail parecido. Verifique antes de criar um novo.
                </p>
              </div>
              <button onClick={() => setDuplicateModal(null)} className="ml-auto text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Matches list */}
            <div className="px-6 py-4 space-y-2 max-h-64 overflow-y-auto">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-3">Pacientes existentes</p>
              {duplicateModal.matches.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary text-xs font-black flex items-center justify-center shrink-0">
                    {p.name.split(" ").slice(0,2).map(n => n[0]).join("").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{p.email || p.phone || "Sem contato"}</p>
                  </div>
                  <button
                    disabled={creatingPatient === duplicateModal.booking.booking_group_id}
                    onClick={() => doLinkExisting(duplicateModal.booking, p)}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors disabled:opacity-50"
                  >
                    {creatingPatient ? <Loader2 className="h-3 w-3 animate-spin" /> : "Usar este"}
                  </button>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-muted/20 flex gap-3">
              <button
                onClick={() => setDuplicateModal(null)}
                className="flex-1 h-9 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={creatingPatient === duplicateModal.booking.booking_group_id}
                onClick={() => doCreatePatient(duplicateModal.booking, duplicateModal.notes)}
                className="flex-1 h-9 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creatingPatient ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                Criar novo cadastro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAgendamentos;
