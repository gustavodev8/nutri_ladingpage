import { useState, useEffect } from "react";
import {
  CalendarCheck, Loader2, Mail, Phone, CheckCircle2, XCircle,
  CalendarClock, X, ChevronRight, ChevronLeft, Globe, MapPin, User,
  Heart, Pill, Salad, HelpCircle, Target, Cake, ClipboardList,
  UserX, Scale, Ruler, ChevronDown, FileText, ArrowRight,
  Send, Paperclip, Trash2, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchBookings, updateBookingStatus, autoCompleteBookings, autoExpirePendingBookings,
  insertBooking, insertConsultationRecord, updateConsultationRecord,
  deleteConsultationRecord, fetchConsultationRecords, uploadRecordFile,
  fetchAvailabilitySlots, fetchBookingsForDate,
  type Booking, type ConsultationRecord, type RecordFile
} from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function toLocalISO(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const STATUS: Record<string, { label: string; color: string }> = {
  pending:   { label: "Aguardando pagamento", color: "bg-amber-50 text-amber-700 border-amber-200" },
  confirmed: { label: "Confirmado",           color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  completed: { label: "Concluído",            color: "bg-blue-50 text-blue-700 border-blue-200" },
  no_show:   { label: "Não compareceu",       color: "bg-orange-50 text-orange-700 border-orange-200" },
  cancelled: { label: "Cancelado",            color: "bg-red-50 text-red-600 border-red-200" },
};

const StatusPill = ({ status }: { status: string }) => {
  const s = STATUS[status] || STATUS.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.color}`}>
      {s.label}
    </span>
  );
};

const formatDate = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

const initials = (name: string) =>
  name?.split(" ").filter(Boolean).slice(0, 2).map(n => n[0]).join("").toUpperCase() || "?";

const calcBMI = (w: number, h: number) => {
  if (!w || !h) return null;
  const bmi = w / Math.pow(h / 100, 2);
  return bmi.toFixed(1);
};

const MAX_ATTACH_BYTES = 10 * 1024 * 1024; // 10 MB total

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

interface ClinicalNotes {
  birthDate?: string; sex?: string; goal?: string; allergies?: string;
  restrictions?: string; healthConditions?: string; medications?: string;
  hadNutritionist?: string; howFound?: string;
}

const GOAL_LABELS: Record<string, string> = {
  emagrecimento: "Emagrecimento", ganho_massa: "Ganho de massa", saude_geral: "Saúde geral",
  condicao_especifica: "Condição específica", gestante: "Gestação / pós-parto", outro: "Outro",
};
const RESTRICT_LABELS: Record<string, string> = {
  vegetariano: "Vegetariano", vegano: "Vegano", sem_gluten: "Sem glúten",
  sem_lactose: "Sem lactose", outra: "Outra restrição",
};
const FOUND_LABELS: Record<string, string> = {
  instagram: "Instagram", indicacao: "Indicação", google: "Google", outro: "Outro",
};

type FilterTab = "confirmed" | "pending" | "retornos" | "completed" | "no_show" | "cancelled";

const AdminAgendamentos = () => {
  const [bookings, setBookings]   = useState<Booking[]>([]);
  const [loading, setLoading]     = useState(true);
  const [updating, setUpdating]   = useState<number | null>(null);
  const [filter, setFilter]       = useState<FilterTab>("confirmed");
  const [detail, setDetail]       = useState<string | null>(null);
  const [records, setRecords]     = useState<ConsultationRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Prontuário — edição / exclusão inline
  const [editingRecordId, setEditingRecordId]   = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId]   = useState<number | null>(null);
  const [editNotes, setEditNotes]               = useState("");
  const [editNextSteps, setEditNextSteps]       = useState("");
  const [editNextReturn, setEditNextReturn]     = useState("");
  const [editWeight, setEditWeight]             = useState("");
  const [editHeight, setEditHeight]             = useState("");
  const [editFiles, setEditFiles]               = useState<RecordFile[]>([]); // arquivos já salvos
  const [editNewFiles, setEditNewFiles]         = useState<File[]>([]);       // novos a subir
  const [savingEdit, setSavingEdit]             = useState(false);

  // Reschedule
  const [reschedule, setReschedule]       = useState<Booking | null>(null);
  const [newDate, setNewDate]             = useState("");
  const [newTime, setNewTime]             = useState("");
  const [rescheduleMsg, setRescheduleMsg] = useState("");
  const [rescheduling, setRescheduling]   = useState(false);

  // Send material modal
  interface AttachmentFile { name: string; base64: string; size: number; type: string }
  const [sendTarget, setSendTarget]         = useState<Booking | null>(null);
  const [sendSubject, setSendSubject]       = useState("");
  const [sendBody, setSendBody]             = useState("");
  const [sendFiles, setSendFiles]           = useState<AttachmentFile[]>([]);
  const [sending, setSending]               = useState(false);

  // Confirm destructive action (no_show / cancelled)
  const [confirmAction, setConfirmAction]   = useState<{ id: number; status: "no_show" | "cancelled" } | null>(null);

  // Detail inner tab
  const [detailTab, setDetailTab] = useState<"sessions" | "records">("sessions");

  // Completion modal
  const [completing, setCompleting]           = useState<Booking | null>(null);
  const [compNotes, setCompNotes]             = useState("");
  const [compWeight, setCompWeight]           = useState("");
  const [compHeight, setCompHeight]           = useState("");
  const [compNextReturn, setCompNextReturn]   = useState("");
  const [compNextReturnTime, setCompNextReturnTime] = useState("");
  const [compNextSteps, setCompNextSteps]     = useState("");
  const [compFiles, setCompFiles]             = useState<File[]>([]);
  const [savingRecord, setSavingRecord]       = useState(false);

  // Calendário de retorno
  const [returnAvailSlots, setReturnAvailSlots]   = useState<Array<{date: string; start_time: string; type: string}>>([]);
  const [returnCalYear, setReturnCalYear]         = useState(new Date().getFullYear());
  const [returnCalMonth, setReturnCalMonth]       = useState(new Date().getMonth());
  const [returnBookedTimes, setReturnBookedTimes] = useState<string[]>([]);
  const [loadingReturnSlots, setLoadingReturnSlots] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const raw      = await fetchBookings();
    const active   = await autoExpirePendingBookings(raw);
    const updated  = await autoCompleteBookings(active);
    setBookings(updated);
    setLoading(false);
  };

  const handleChangeType = async (session: Booking) => {
    const newType = session.type === "online" ? "presencial" : "online";
    const ok = await updateBookingStatus(session.id!, session.status!, { type: newType });
    if (ok) {
      setBookings(prev => prev.map(b => b.id === session.id ? { ...b, type: newType } : b));
      toast({ title: `Modalidade alterada para ${newType === "online" ? "Online" : "Presencial"}` });
    } else {
      toast({ title: "Erro ao alterar modalidade", variant: "destructive" });
    }
  };

  const handleStatus = async (id: number, status: string, extra?: Record<string, unknown>) => {
    setUpdating(id);
    const ok = await updateBookingStatus(id, status, extra);
    if (ok) {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status, ...extra } : b));
      toast({ title: "Status atualizado!" });
    } else {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
    setUpdating(null);
  };

  const openComplete = async (session: Booking) => {
    setCompleting(session);
    setCompNotes(""); setCompWeight(""); setCompHeight("");
    setCompNextReturn(""); setCompNextReturnTime(""); setCompNextSteps(""); setCompFiles([]);
    setReturnBookedTimes([]);
    // Inicializa calendário no mês atual
    const now = new Date();
    setReturnCalYear(now.getFullYear());
    setReturnCalMonth(now.getMonth());
    // Carrega slots disponíveis
    setLoadingReturnSlots(true);
    const slots = await fetchAvailabilitySlots();
    setReturnAvailSlots(slots);
    setLoadingReturnSlots(false);
  };

  const handleReturnDateSelect = async (dateISO: string, sessionType: string) => {
    setCompNextReturn(dateISO);
    setCompNextReturnTime("");
    setReturnBookedTimes([]);
    const booked = await fetchBookingsForDate(dateISO, sessionType);
    setReturnBookedTimes(booked.map(b => (b as unknown as { appointment_time: string }).appointment_time.substring(0, 5)));
  };

  const getReturnTimesForDate = (dateISO: string, sessionType: string) =>
    returnAvailSlots
      .filter(s => s.date === dateISO && s.type === sessionType)
      .map(s => s.start_time.substring(0, 5))
      .sort();

  const canSelectReturnDate = (date: Date, sessionType: string) => {
    const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
    if (date < todayMidnight) return false; // bloqueia apenas datas anteriores a hoje
    return returnAvailSlots.some(s => s.date === toLocalISO(date) && s.type === sessionType);
  };

  const handleSaveRecord = async () => {
    if (!completing) return;
    setSavingRecord(true);

    try {
      const w = compWeight ? parseFloat(compWeight) : null;
      const h = compHeight ? parseFloat(compHeight) : null;

      // 0. Idempotência: verifica se já existe registro para este booking_id
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
      const isLastSession = (completing.session_number ?? 1) >= (completing.total_sessions ?? 1);
      let returnCreated = false;
      if (!isLastSession && compNextReturn) {
        const returnSession: Booking = {
          booking_group_id: completing.booking_group_id,
          session_number: completing.session_number + 1,
          total_sessions: completing.total_sessions,
          client_name: completing.client_name,
          client_email: completing.client_email,
          client_phone: completing.client_phone,
          plan_name: completing.plan_name,
          plan_index: completing.plan_index,
          appointment_date: compNextReturn,
          appointment_time: compNextReturnTime || completing.appointment_time,
          type: completing.type,
          status: "confirmed",
          notes: completing.notes,
        };
        returnCreated = await insertBooking(returnSession);
      }

      // 4. Atualiza estado local imediatamente, depois recarrega em background
      const completingId = completing.id!;
      setBookings(prev =>
        prev.map(b => b.id === completingId ? { ...b, status: "completed" } : b)
      );
      setCompleting(null);
      setDetail(null);
      setFilter(isLastSession ? "completed" : "confirmed");

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

  const loadRecords = async (groupId: string) => {
    setLoadingRecords(true);
    setRecords(await fetchConsultationRecords(groupId));
    setLoadingRecords(false);
  };

  const openEditRecord = (rec: ConsultationRecord) => {
    setEditingRecordId(rec.id!);
    setConfirmDeleteId(null);
    setEditNotes(rec.notes || "");
    setEditNextSteps(rec.next_steps || "");
    setEditNextReturn(rec.next_return_date || "");
    setEditWeight(rec.weight ? String(rec.weight) : "");
    setEditHeight(rec.height ? String(rec.height) : "");
    setEditFiles(rec.files || []);
    setEditNewFiles([]);
  };

  const handleSaveEdit = async () => {
    if (!editingRecordId || !detail) return;
    setSavingEdit(true);

    // Upload novos arquivos e mescla com os já existentes
    let mergedFiles: RecordFile[] | null = null;
    const kept = editFiles;
    const uploaded: RecordFile[] = [];
    if (editNewFiles.length > 0) {
      // Precisamos do booking_group_id do registro sendo editado
      const rec = records.find(r => r.id === editingRecordId);
      const groupId = rec?.booking_group_id || detail;
      const results = await Promise.all(
        editNewFiles.map(async f => {
          const url = await uploadRecordFile(f, groupId);
          return url ? { name: f.name, url } : null;
        })
      );
      results.forEach(r => { if (r) uploaded.push(r); });
    }
    const allFiles = [...kept, ...uploaded];
    if (allFiles.length > 0) mergedFiles = allFiles;

    const ok = await updateConsultationRecord(editingRecordId, {
      notes: editNotes.trim() || null,
      next_steps: editNextSteps.trim() || null,
      next_return_date: editNextReturn || null,
      weight: editWeight ? parseFloat(editWeight) : null,
      height: editHeight ? parseFloat(editHeight) : null,
      files: mergedFiles,
    });
    if (ok) {
      toast({ title: "Registro atualizado." });
      setEditingRecordId(null);
      setEditNewFiles([]);
      await loadRecords(detail);
    } else {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
    setSavingEdit(false);
  };

  const handleDeleteRecord = async (id: number) => {
    if (!detail) return;
    const ok = await deleteConsultationRecord(id);
    if (ok) {
      toast({ title: "Registro excluído." });
      setConfirmDeleteId(null);
      await loadRecords(detail);
    } else {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const openDetail = (groupId: string) => {
    setDetail(groupId);
    setDetailTab("sessions");
    loadRecords(groupId);
  };

  const openSendMaterial = (booking: Booking) => {
    setSendTarget(booking);
    setSendSubject("");
    setSendBody("");
    setSendFiles([]);
  };

  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = ""; // reset input so same file can be re-added
    if (!picked.length) return;

    // Validate total size
    const current = sendFiles.reduce((acc, f) => acc + f.size, 0);
    const incoming = picked.reduce((acc, f) => acc + f.size, 0);
    if (current + incoming > MAX_ATTACH_BYTES) {
      toast({ title: "Tamanho total ultrapassa 10 MB", variant: "destructive" });
      return;
    }

    const converted = await Promise.all(
      picked.map(async (file) => ({
        name: file.name,
        base64: await fileToBase64(file),
        size: file.size,
        type: file.type,
      }))
    );
    setSendFiles(prev => [...prev, ...converted]);
  };

  const handleSendMaterial = async () => {
    if (!sendTarget || !sendSubject.trim() || !sendBody.trim()) {
      toast({ title: "Preencha assunto e mensagem", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-material`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          to: sendTarget.client_email,
          client_name: sendTarget.client_name,
          subject: sendSubject.trim(),
          body: sendBody.trim(),
          attachments: sendFiles.map(f => ({ filename: f.name, content: f.base64 })),
        }),
      });

      let data: Record<string, string> = {};
      try { data = await res.json(); } catch { /* empty body */ }

      if (!res.ok) {
        const msg = data.error || data.message || data.msg || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      toast({ title: "Email enviado!", description: `Para ${sendTarget.client_email}` });
      setSendTarget(null);
    } catch (e) {
      toast({ title: "Erro ao enviar email", description: e instanceof Error ? e.message : "Tente novamente", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const openReschedule = (session: Booking) => {
    setReschedule(session);
    setNewDate(session.appointment_date || "");
    setNewTime((session.appointment_time || "").substring(0, 5));
    setRescheduleMsg("");
  };

  const handleReschedule = async () => {
    if (!reschedule || !newDate || !newTime) {
      toast({ title: "Preencha a nova data e horário", variant: "destructive" });
      return;
    }
    setRescheduling(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/reschedule-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          booking_id: reschedule.id, new_date: newDate, new_time: newTime,
          client_email: reschedule.client_email, client_name: reschedule.client_name,
          plan_name: reschedule.plan_name, message: rescheduleMsg.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro");
      setBookings(prev => prev.map(b =>
        b.id === reschedule.id ? { ...b, appointment_date: newDate, appointment_time: newTime } : b
      ));
      toast({ title: "Reagendado!", description: "Email enviado ao paciente." });
      setReschedule(null);
    } catch (e) {
      toast({ title: "Erro ao reagendar", description: e instanceof Error ? e.message : "Tente novamente", variant: "destructive" });
    } finally {
      setRescheduling(false);
    }
  };

  // Agrupa todos os bookings por grupo
  const allGrouped: Record<string, Booking[]> = {};
  bookings.forEach(b => {
    if (!allGrouped[b.booking_group_id]) allGrouped[b.booking_group_id] = [];
    allGrouped[b.booking_group_id].push(b);
  });

  // Status de um grupo: "group_completed" quando a última sessão criada
  // tem status "completed" E session_number >= total_sessions (plano encerrado)
  const groupStatus = (sessions: Booking[]): string => {
    const sorted = [...sessions].sort((a, b) => (b.session_number ?? 0) - (a.session_number ?? 0));
    const latest = sorted[0];
    if (!latest) return "unknown";
    if (
      latest.status === "completed" &&
      (latest.session_number ?? 1) >= (latest.total_sessions ?? 1)
    ) return "group_completed";
    return latest.status ?? "confirmed";
  };

  const isGroupComplete = (sessions: Booking[]) => groupStatus(sessions) === "group_completed";

  // Counts por grupo (não por sessão individual)
  const counts: Record<FilterTab, number> = {
    confirmed: Object.values(allGrouped).filter(s => !isGroupComplete(s) && s.some(b => b.status === "confirmed")).length,
    pending:   Object.values(allGrouped).filter(s => !isGroupComplete(s) && s.some(b => b.status === "pending")).length,
    retornos:  Object.values(allGrouped).filter(s => !isGroupComplete(s) && s.some(b => (b.session_number ?? 1) > 1 && b.status === "confirmed")).length,
    completed: Object.values(allGrouped).filter(s => isGroupComplete(s)).length,
    no_show:   Object.values(allGrouped).filter(s => !isGroupComplete(s) && s.some(b => b.status === "no_show")).length,
    cancelled: Object.values(allGrouped).filter(s => s.every(b => b.status === "cancelled")).length,
  };

  const TABS: { id: FilterTab; label: string }[] = [
    { id: "confirmed", label: "Confirmados" },
    { id: "pending",   label: "Pendentes" },
    { id: "retornos",  label: "Retornos" },
    { id: "completed", label: "Concluídos" },
    { id: "no_show",   label: "Não compareceu" },
    { id: "cancelled", label: "Cancelados" },
  ];

  // Filtra grupos pelo tab ativo
  const filteredGroupIds = Object.entries(allGrouped)
    .filter(([, sessions]) => {
      const complete = isGroupComplete(sessions);
      if (filter === "completed") return complete;
      if (complete) return false; // grupos completos nunca aparecem em outros tabs
      if (filter === "retornos")  return sessions.some(b => (b.session_number ?? 1) > 1 && b.status === "confirmed");
      if (filter === "cancelled") return sessions.every(b => b.status === "cancelled");
      return sessions.some(b => b.status === filter);
    })
    .map(([id]) => id);

  const groups: Record<string, Booking[]> = {};
  filteredGroupIds.forEach(id => { groups[id] = allGrouped[id]; });

  const groupEntries = Object.entries(groups).sort(([, a], [, b]) => {
    const latestA = [...a].sort((x, y) => (y.session_number ?? 0) - (x.session_number ?? 0))[0];
    const latestB = [...b].sort((x, y) => (y.session_number ?? 0) - (x.session_number ?? 0))[0];
    return new Date(latestB.appointment_date).getTime() - new Date(latestA.appointment_date).getTime();
  });

  // Detail — reutiliza allGrouped já calculado acima
  const detailGroup = detail ? (allGrouped[detail] || []).sort((a, b) => a.session_number - b.session_number) : [];
  const detailFirst = detailGroup[0];
  const detailNotes: ClinicalNotes = (() => {
    try { return JSON.parse(detailFirst?.notes || "{}"); } catch { return {}; }
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <CalendarCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agendamentos</h1>
          <p className="text-sm text-muted-foreground">Gerencie as consultas agendadas</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
              filter === t.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}>
            {t.label}
            <span className="ml-1.5 opacity-60">({counts[t.id]})</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}

      {!loading && groupEntries.length === 0 && (
        <div className="rounded-2xl bg-card border border-border p-14 text-center">
          <CalendarCheck className="h-9 w-9 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum agendamento encontrado.</p>
        </div>
      )}

      {/* Cards */}
      {!loading && groupEntries.map(([groupId, sessions]) => {
        const first = sessions[0];
        const sorted = [...sessions].sort((a, b) => a.session_number - b.session_number);
        const overallStatus = sessions.every(s => s.status === "completed") ? "completed"
          : sessions.some(s => s.status === "confirmed") ? "confirmed"
          : sessions.some(s => s.status === "no_show") ? "no_show"
          : sessions.some(s => s.status === "cancelled") ? "cancelled" : "pending";

        return (
          <div key={groupId}
            className="rounded-2xl bg-card border border-border overflow-hidden hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
            onClick={() => openDetail(groupId)}>
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">{initials(first.client_name)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{first.client_name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-muted-foreground">{first.plan_name}</span>
                  <span className="text-muted-foreground/30 text-xs">·</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {first.type === "online" ? <><Globe className="h-3 w-3" />Online</> : <><MapPin className="h-3 w-3" />Presencial</>}
                  </span>
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-end gap-1">
                {sorted.slice(0, 2).map(s => (
                  <span key={s.id} className="text-xs text-muted-foreground">
                    {formatDate(s.appointment_date)} · {(s.appointment_time || "").substring(0, 5)}
                  </span>
                ))}
                {sorted.length > 2 && <span className="text-xs text-muted-foreground/50">+{sorted.length - 2} sessões</span>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusPill status={overallStatus} />
                <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
              </div>
            </div>
          </div>
        );
      })}

      {/* ── Detail Modal ── */}
      {detail && detailFirst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]" onClick={() => setDetail(null)}>
          <div className="w-full max-w-5xl bg-background rounded-xl border border-border shadow-2xl flex flex-col max-h-[88vh]" onClick={e => e.stopPropagation()}>

            {/* ── Header ── */}
            <div className="flex items-center gap-4 px-6 py-4 border-b border-border shrink-0">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">{initials(detailFirst.client_name)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-sm text-foreground leading-none truncate">{detailFirst.client_name}</h2>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {detailFirst.plan_name}
                  <span className="mx-1.5 opacity-30">·</span>
                  {detailFirst.type === "online" ? "Online" : "Presencial"}
                  <span className="mx-1.5 opacity-30">·</span>
                  {detailGroup.length} {detailGroup.length === 1 ? "sessão" : "sessões"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { setDetail(null); setTimeout(() => openSendMaterial(detailFirst), 100); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground border border-border hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
                >
                  <Send className="h-3.5 w-3.5" />Enviar material
                </button>
                <button onClick={() => setDetail(null)} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* ── Body: 2 columns ── */}
            <div className="flex flex-1 min-h-0">

              {/* ── Left: patient sidebar ── */}
              <div className="w-52 shrink-0 overflow-y-auto border-r border-border p-5 space-y-6">

                {/* Contact */}
                <div className="space-y-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">Contato</p>
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
                      <span className="text-xs text-foreground/80 break-all leading-snug">{detailFirst.client_email}</span>
                    </div>
                    {detailFirst.client_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                        <span className="text-xs text-foreground/80">{detailFirst.client_phone}</span>
                      </div>
                    )}
                    {detailNotes.birthDate && (
                      <div className="flex items-center gap-2">
                        <Cake className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                        <span className="text-xs text-foreground/80">
                          {new Date(detailNotes.birthDate + "T12:00:00").toLocaleDateString("pt-BR")}
                          {detailNotes.sex && <span className="text-muted-foreground"> · {detailNotes.sex}</span>}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Clinical */}
                {(detailNotes.goal || detailNotes.restrictions || detailNotes.allergies ||
                  detailNotes.healthConditions || detailNotes.medications ||
                  detailNotes.hadNutritionist || detailNotes.howFound) && (
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">Ficha clínica</p>
                    <dl className="space-y-2">
                      {[
                        { icon: Target,     label: "Objetivo",      val: GOAL_LABELS[detailNotes.goal!] || detailNotes.goal },
                        { icon: Salad,      label: "Restrições",    val: RESTRICT_LABELS[detailNotes.restrictions!] || detailNotes.restrictions },
                        { icon: HelpCircle, label: "Alergias",      val: detailNotes.allergies },
                        { icon: Heart,      label: "Condições",     val: detailNotes.healthConditions },
                        { icon: Pill,       label: "Medicamentos",  val: detailNotes.medications },
                        { icon: User,       label: "Acomp. ant.",   val: detailNotes.hadNutritionist === "sim" ? "Sim" : detailNotes.hadNutritionist ? "Não" : null },
                        { icon: HelpCircle, label: "Como chegou",   val: FOUND_LABELS[detailNotes.howFound!] || detailNotes.howFound },
                      ].filter(r => r.val).map(({ icon: Icon, label, val }) => (
                        <div key={label}>
                          <dt className="text-[10px] text-muted-foreground/50 flex items-center gap-1 mb-0.5"><Icon className="h-2.5 w-2.5" />{label}</dt>
                          <dd className="text-xs font-medium text-foreground pl-3.5 leading-snug">{val}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>

              {/* ── Right: tabs ── */}
              <div className="flex-1 flex flex-col min-h-0">

                {/* Tab bar */}
                <div className="flex items-center border-b border-border shrink-0 px-6">
                  {([
                    { id: "sessions" as const, label: "Sessões",    count: detailGroup.length },
                    { id: "records"  as const, label: "Prontuário", count: records.length },
                  ]).map(tab => (
                    <button key={tab.id} onClick={() => setDetailTab(tab.id)}
                      className={`relative py-3 px-1 mr-6 text-xs font-medium transition-colors ${
                        detailTab === tab.id
                          ? "text-foreground after:absolute after:bottom-0 after:inset-x-0 after:h-px after:bg-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab.label}
                      {tab.count > 0 && (
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          detailTab === tab.id ? "bg-foreground/10 text-foreground" : "bg-muted text-muted-foreground"
                        }`}>{tab.count}</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* ── SESSIONS TAB ── */}
                {detailTab === "sessions" && (
                  <div className="flex-1 overflow-y-auto">
                    {detailGroup.map((session) => {
                      const isActive = session.status === "confirmed" || session.status === "pending";
                      const isConfirming = confirmAction?.id === session.id;
                      const statusColor =
                        session.status === "completed" ? "bg-blue-400" :
                        session.status === "confirmed"  ? "bg-emerald-400" :
                        session.status === "no_show"    ? "bg-orange-400" :
                        session.status === "cancelled"  ? "bg-red-400" : "bg-amber-400";

                      return (
                        <div key={session.id}
                          className={`group grid border-b border-border/30 last:border-0 transition-colors ${
                            isActive ? "hover:bg-muted/30" : "opacity-50"
                          }`}
                          style={{ gridTemplateColumns: "150px 155px 115px 1fr" }}
                        >
                          {/* dot + label */}
                          <div className="flex items-center gap-2 px-5 py-3 min-w-0">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColor}`} />
                            <span className="text-xs font-medium text-foreground truncate">
                              {session.session_number === 1 ? "Consulta inicial" : `Retorno ${session.session_number - 1}`}
                            </span>
                          </div>

                          {/* date · time */}
                          <div className="flex items-center px-2 py-3">
                            <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                              {new Date(session.appointment_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" })}
                              <span className="mx-1 opacity-40">·</span>
                              {(session.appointment_time || "").substring(0, 5)}
                            </span>
                          </div>

                          {/* status pill */}
                          <div className="flex items-center px-2 py-3">
                            <StatusPill status={session.status || "pending"} />
                          </div>

                          {/* actions — hover only (or always when confirming) */}
                          <div className={`flex items-center justify-end gap-3 px-5 py-3 text-xs whitespace-nowrap transition-opacity ${
                            isConfirming ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          }`}>
                            {isActive && !isConfirming && (
                              <>
                                <button
                                  onClick={() => { setDetail(null); setTimeout(() => openReschedule(session), 100); }}
                                  className="text-muted-foreground hover:text-foreground font-medium transition-colors"
                                >Realocar</button>
                                <span className="text-border">·</span>
                                <button
                                  disabled={updating === session.id}
                                  onClick={() => { setDetail(null); setTimeout(() => openComplete(session), 100); }}
                                  className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors disabled:opacity-40"
                                >Concluir</button>
                                <span className="text-border">·</span>
                                <button
                                  disabled={updating === session.id}
                                  onClick={() => setConfirmAction({ id: session.id!, status: "no_show" })}
                                  className="text-muted-foreground hover:text-orange-500 font-medium transition-colors disabled:opacity-40"
                                >Faltou</button>
                                <span className="text-border">·</span>
                                <button
                                  disabled={updating === session.id}
                                  onClick={() => setConfirmAction({ id: session.id!, status: "cancelled" })}
                                  className="text-muted-foreground hover:text-red-500 font-medium transition-colors disabled:opacity-40"
                                >Cancelar</button>
                              </>
                            )}
                            {isConfirming && confirmAction!.status === "no_show" && (
                              <>
                                <span className="text-muted-foreground">Marcar falta?</span>
                                <button onClick={() => { handleStatus(session.id!, "no_show"); setConfirmAction(null); }} className="font-semibold text-orange-500 hover:text-orange-600">Sim</button>
                                <button onClick={() => setConfirmAction(null)} className="text-muted-foreground hover:text-foreground">Não</button>
                              </>
                            )}
                            {isConfirming && confirmAction!.status === "cancelled" && (
                              <>
                                <span className="text-muted-foreground">Cancelar consulta?</span>
                                <button onClick={() => { handleStatus(session.id!, "cancelled"); setConfirmAction(null); }} className="font-semibold text-red-500 hover:text-red-600">Sim</button>
                                <button onClick={() => setConfirmAction(null)} className="text-muted-foreground hover:text-foreground">Não</button>
                              </>
                            )}
                            {session.status === "completed" && (
                              <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                                <CheckCircle2 className="h-3.5 w-3.5" />Realizada
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── PRONTUÁRIO TAB ── */}
                {detailTab === "records" && (
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loadingRecords ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
                      </div>
                    ) : records.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3">
                          <FileText className="h-5 w-5 text-muted-foreground/30" />
                        </div>
                        <p className="text-sm font-medium text-foreground">Sem prontuários</p>
                        <p className="text-xs text-muted-foreground mt-1">Conclua uma sessão para criar o primeiro registro.</p>
                      </div>
                    ) : (
                      records.map(rec => {
                        const bmi = rec.weight && rec.height ? calcBMI(rec.weight, rec.height) : null;
                        const isEditing = editingRecordId === rec.id;
                        const isConfirmingDelete = confirmDeleteId === rec.id;
                        return (
                          <div key={rec.id} className="rounded-lg border border-border overflow-hidden">

                            {/* Record header */}
                            <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b border-border">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-foreground">
                                  {rec.session_number === 1 ? "Consulta inicial" : rec.session_number ? `Retorno ${rec.session_number - 1}` : "Consulta"}
                                </span>
                                <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                                  {new Date(rec.created_at!).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                                </span>
                                {rec.weight && (
                                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    <Scale className="h-2.5 w-2.5" />{rec.weight} kg
                                    {bmi && <><span className="mx-0.5 opacity-40">·</span>IMC {bmi}</>}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {!isEditing && !isConfirmingDelete && (
                                  <>
                                    <button onClick={() => openEditRecord(rec)} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Pencil className="h-3 w-3" /></button>
                                    <button onClick={() => { setConfirmDeleteId(rec.id!); setEditingRecordId(null); }} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="h-3 w-3" /></button>
                                  </>
                                )}
                                {isConfirmingDelete && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground">Excluir este registro?</span>
                                    <button onClick={() => handleDeleteRecord(rec.id!)} className="font-semibold text-red-500 hover:text-red-600">Sim</button>
                                    <button onClick={() => setConfirmDeleteId(null)} className="text-muted-foreground hover:text-foreground">Não</button>
                                  </div>
                                )}
                                {isEditing && <span className="text-xs text-primary font-medium pr-1">Editando…</span>}
                              </div>
                            </div>

                            {/* View mode */}
                            {!isEditing && !isConfirmingDelete && (
                              <div className="px-4 py-4 space-y-3">
                                {rec.notes && <p className="text-sm text-foreground/90 leading-relaxed">{rec.notes}</p>}
                                {rec.next_steps && (
                                  <div className="border-l-2 border-border pl-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-1">Próximos passos</p>
                                    <p className="text-sm text-foreground/80 leading-relaxed">{rec.next_steps}</p>
                                  </div>
                                )}
                                {rec.next_return_date && (
                                  <div className="flex items-center gap-2 text-xs text-primary font-medium">
                                    <ArrowRight className="h-3 w-3" />
                                    Retorno em {new Date(rec.next_return_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                                  </div>
                                )}
                                {rec.files && rec.files.length > 0 && (
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    {rec.files.map((f, i) => (
                                      <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted hover:bg-muted/70 text-xs text-foreground/80 hover:text-foreground transition-colors border border-border/50">
                                        <Paperclip className="h-3 w-3 text-muted-foreground" />{f.name}
                                      </a>
                                    ))}
                                  </div>
                                )}
                                {!rec.notes && !rec.next_steps && !rec.next_return_date && (!rec.files || rec.files.length === 0) && (
                                  <p className="text-xs text-muted-foreground/50 italic">Sem observações registradas.</p>
                                )}
                              </div>
                            )}

                            {/* Edit mode */}
                            {isEditing && (
                              <div className="px-4 py-4 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Scale className="h-3 w-3" />Peso (kg)</label>
                                    <input type="number" step="0.1" value={editWeight} onChange={e => setEditWeight(e.target.value)} placeholder="72.5" className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Ruler className="h-3 w-3" />Altura (cm)</label>
                                    <input type="number" step="0.1" value={editHeight} onChange={e => setEditHeight(e.target.value)} placeholder="165" className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs font-medium text-muted-foreground">Observações</label>
                                  <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/40" placeholder="Observações da consulta…" />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs font-medium text-muted-foreground">Próximos passos</label>
                                  <textarea value={editNextSteps} onChange={e => setEditNextSteps(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/40" placeholder="Encaminhamentos, plano alimentar enviado…" />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs font-medium text-muted-foreground">Próximo retorno</label>
                                  <input type="date" value={editNextReturn} onChange={e => setEditNextReturn(e.target.value)} className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                </div>

                                {/* Files */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-xs font-medium text-muted-foreground">Arquivos</label>
                                    <label className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/70 cursor-pointer transition-colors">
                                      <Paperclip className="h-3 w-3" />Anexar
                                      <input type="file" multiple className="hidden"
                                        accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.png,.jpg,.jpeg"
                                        onChange={e => {
                                          const picked = Array.from(e.target.files || []);
                                          e.target.value = "";
                                          if (!picked.length) return;
                                          const total = [...editFiles, ...editNewFiles, ...picked].reduce((acc, f) => acc + ("size" in f ? (f as File).size : 0), 0);
                                          if (total > 20 * 1024 * 1024) { toast({ title: "Limite de 20 MB excedido", variant: "destructive" }); return; }
                                          setEditNewFiles(prev => [...prev, ...picked]);
                                        }}
                                      />
                                    </label>
                                  </div>

                                  {/* Existing files */}
                                  {editFiles.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {editFiles.map((f, i) => (
                                        <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted border border-border/50 text-xs text-foreground/80 max-w-full">
                                          <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                                          <a href={f.url} target="_blank" rel="noopener noreferrer" className="truncate max-w-[140px] hover:underline">{f.name}</a>
                                          <button onClick={() => setEditFiles(prev => prev.filter((_, idx) => idx !== i))} className="ml-0.5 text-muted-foreground hover:text-red-500 transition-colors shrink-0">
                                            <X className="h-3 w-3" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* New files to upload */}
                                  {editNewFiles.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {editNewFiles.map((f, i) => (
                                        <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary/5 border border-primary/20 text-xs text-foreground/80 max-w-full">
                                          <Paperclip className="h-3 w-3 text-primary shrink-0" />
                                          <span className="truncate max-w-[140px]">{f.name}</span>
                                          <span className="text-muted-foreground shrink-0">{formatBytes(f.size)}</span>
                                          <button onClick={() => setEditNewFiles(prev => prev.filter((_, idx) => idx !== i))} className="ml-0.5 text-muted-foreground hover:text-red-500 transition-colors shrink-0">
                                            <X className="h-3 w-3" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {editFiles.length === 0 && editNewFiles.length === 0 && (
                                    <p className="text-xs text-muted-foreground/50">Nenhum arquivo anexado.</p>
                                  )}
                                </div>

                                <div className="flex gap-2 pt-1">
                                  <Button variant="outline" size="sm" className="flex-1 h-9 rounded-md text-xs" onClick={() => setEditingRecordId(null)} disabled={savingEdit}>Cancelar</Button>
                                  <Button size="sm" className="flex-1 h-9 rounded-md text-xs gap-1.5" onClick={handleSaveEdit} disabled={savingEdit}>
                                    {savingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : null}Salvar alterações
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Completion Modal ── */}
      {completing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
          <div className="bg-background rounded-xl border border-border shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: "min(92vh, 780px)" }}>

            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">{initials(completing.client_name)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{completing.client_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(completing.appointment_date)}
                  <span className="mx-1.5 opacity-30">·</span>
                  {(completing.appointment_time || "").substring(0, 5)}
                  <span className="mx-1.5 opacity-30">·</span>
                  {completing.session_number === 1 ? "Consulta inicial" : `Retorno ${completing.session_number - 1}`}
                </p>
              </div>
              <button onClick={() => setCompleting(null)} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">

              {/* Medidas */}
              <div className="space-y-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">Medidas</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Scale className="h-3 w-3" />Peso (kg)</label>
                    <input type="number" step="0.1" value={compWeight} onChange={e => setCompWeight(e.target.value)} placeholder="72.5"
                      className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Ruler className="h-3 w-3" />Altura (cm)</label>
                    <input type="number" step="0.1" value={compHeight} onChange={e => setCompHeight(e.target.value)} placeholder="165"
                      className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
                {compWeight && compHeight && (
                  <p className="text-xs text-muted-foreground">IMC: <span className="font-semibold text-foreground">{calcBMI(parseFloat(compWeight), parseFloat(compHeight))}</span></p>
                )}
              </div>

              {/* Observações */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">Observações da consulta</label>
                <textarea value={compNotes} onChange={e => setCompNotes(e.target.value)} rows={4}
                  placeholder="O que foi discutido, avaliações realizadas, condutas adotadas..."
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/30" />
              </div>

              {/* Próximos passos */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">Próximos passos</label>
                <textarea value={compNextSteps} onChange={e => setCompNextSteps(e.target.value)} rows={3}
                  placeholder="Plano alimentar enviado, retorno em 30 dias, exames solicitados..."
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/30" />
              </div>

              {/* Próximo retorno — só aparece se não for a última sessão */}
              {(() => {
                const isLast = (completing?.session_number ?? 1) >= (completing?.total_sessions ?? 1);
                if (isLast) return (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-xs text-primary font-medium">
                      Último retorno do plano — nenhum novo agendamento será criado.
                    </p>
                  </div>
                );
                return null;
              })()}
              {(completing?.session_number ?? 1) < (completing?.total_sessions ?? 1) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
                    Próximo retorno <span className="normal-case font-normal tracking-normal">(opcional — {((completing?.total_sessions ?? 1) - (completing?.session_number ?? 1))} restante{((completing?.total_sessions ?? 1) - (completing?.session_number ?? 1)) > 1 ? "s" : ""})</span>
                  </label>
                  {compNextReturn && (
                    <button onClick={() => { setCompNextReturn(""); setCompNextReturnTime(""); }}
                      className="text-[10px] text-muted-foreground hover:text-red-500 transition-colors flex items-center gap-1">
                      <X className="h-2.5 w-2.5" /> Limpar
                    </button>
                  )}
                </div>

                {loadingReturnSlots ? (
                  <div className="flex items-center justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
                ) : (() => {
                  const sessionType = completing?.type || "online";
                  const firstDay = new Date(returnCalYear, returnCalMonth, 1).getDay();
                  const daysInMonth = new Date(returnCalYear, returnCalMonth + 1, 0).getDate();
                  const todayISO = toLocalISO(new Date());
                  const returnTimes = compNextReturn ? getReturnTimesForDate(compNextReturn, sessionType) : [];

                  return (
                    <div className="border border-border rounded-xl overflow-hidden">
                      {/* Cabeçalho do calendário */}
                      {(() => {
                        const now = new Date();
                        const isCurrentMonth = returnCalYear === now.getFullYear() && returnCalMonth === now.getMonth();
                        return (
                          <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b border-border">
                            <button
                              disabled={isCurrentMonth}
                              onClick={() => { if (returnCalMonth === 0) { setReturnCalYear(y => y - 1); setReturnCalMonth(11); } else setReturnCalMonth(m => m - 1); }}
                              className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-20 disabled:cursor-not-allowed">
                              <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            <span className="text-xs font-semibold">{MONTHS_PT[returnCalMonth]} {returnCalYear}</span>
                            <button onClick={() => { if (returnCalMonth === 11) { setReturnCalYear(y => y + 1); setReturnCalMonth(0); } else setReturnCalMonth(m => m + 1); }}
                              className="p-1 rounded hover:bg-muted transition-colors">
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </div>
                        );
                      })()}

                      {/* Dias da semana */}
                      <div className="grid grid-cols-7 border-b border-border">
                        {["D","S","T","Q","Q","S","S"].map((d, i) => (
                          <div key={i} className="text-center text-[10px] text-muted-foreground py-1.5">{d}</div>
                        ))}
                      </div>

                      {/* Dias */}
                      <div className="grid grid-cols-7 gap-px bg-border p-px">
                        {Array(firstDay).fill(null).map((_, i) => (
                          <div key={`e${i}`} className="bg-background h-8" />
                        ))}
                        {Array(daysInMonth).fill(null).map((_, i) => {
                          const day = i + 1;
                          const date = new Date(returnCalYear, returnCalMonth, day);
                          const dateISO = `${returnCalYear}-${String(returnCalMonth + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                          const canSelect = canSelectReturnDate(date, sessionType);
                          const isSelected = compNextReturn === dateISO;
                          const isToday = dateISO === todayISO;
                          return (
                            <button key={day} disabled={!canSelect}
                              onClick={() => handleReturnDateSelect(dateISO, sessionType)}
                              className={`bg-background h-8 text-xs font-medium transition-all ${
                                !canSelect ? "text-muted-foreground/20 cursor-not-allowed" :
                                isSelected ? "bg-primary text-primary-foreground font-bold" :
                                isToday ? "text-primary font-bold hover:bg-primary/10" :
                                "text-foreground hover:bg-muted"
                              }`}>
                              {day}
                            </button>
                          );
                        })}
                      </div>

                      {/* Horários disponíveis */}
                      {compNextReturn && (
                        <div className="border-t border-border p-3 space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
                            Horários — {new Date(compNextReturn + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" })}
                          </p>
                          {returnTimes.length === 0 ? (
                            <p className="text-xs text-muted-foreground/60">Sem horários disponíveis nesta data.</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {returnTimes.map(time => {
                                const isBooked = returnBookedTimes.includes(time);
                                const isSelected = compNextReturnTime === time;
                                return (
                                  <button key={time} disabled={isBooked}
                                    onClick={() => !isBooked && setCompNextReturnTime(time)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                                      isBooked ? "bg-muted/30 border-border/40 text-muted-foreground/30 cursor-not-allowed line-through" :
                                      isSelected ? "bg-primary text-primary-foreground border-primary" :
                                      "bg-background border-border hover:border-primary/50"
                                    }`}>
                                    {time}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Resumo selecionado */}
                      {compNextReturn && compNextReturnTime && (
                        <div className="border-t border-border px-3 py-2 bg-primary/5 flex items-center justify-between">
                          <span className="text-xs font-medium text-primary">
                            {new Date(compNextReturn + "T12:00:00").toLocaleDateString("pt-BR")} às {compNextReturnTime}
                          </span>
                          <span className="text-[10px] text-muted-foreground capitalize">{sessionType}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              )}

              {/* Arquivos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
                    Arquivos <span className="normal-case font-normal tracking-normal">(opcional)</span>
                  </label>
                  <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                    <Paperclip className="h-3 w-3" />Anexar
                    <input type="file" multiple className="hidden" accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.png,.jpg,.jpeg"
                      onChange={e => {
                        const picked = Array.from(e.target.files || []);
                        e.target.value = "";
                        if (!picked.length) return;
                        const total = [...compFiles, ...picked].reduce((acc, f) => acc + f.size, 0);
                        if (total > 20 * 1024 * 1024) { toast({ title: "Limite de 20 MB excedido", variant: "destructive" }); return; }
                        setCompFiles(prev => [...prev, ...picked]);
                      }} />
                  </label>
                </div>
                {compFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {compFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted border border-border/50 text-xs text-foreground/80">
                        <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[140px]">{f.name}</span>
                        <span className="text-muted-foreground shrink-0">{formatBytes(f.size)}</span>
                        <button onClick={() => setCompFiles(prev => prev.filter((_, idx) => idx !== i))} className="ml-0.5 text-muted-foreground hover:text-red-500 transition-colors"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-6 py-4 border-t border-border shrink-0">
              <Button variant="outline" className="flex-1 h-9 rounded-md text-sm" onClick={() => setCompleting(null)} disabled={savingRecord}>Cancelar</Button>
              <Button className="flex-1 h-9 rounded-md text-sm gap-2" onClick={handleSaveRecord} disabled={savingRecord}>
                {savingRecord ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                Salvar prontuário
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Send Material Modal ── */}
      {sendTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
          <div className="bg-background rounded-xl border border-border shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">{initials(sendTarget.client_name)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{sendTarget.client_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{sendTarget.client_email}</p>
              </div>
              <button onClick={() => setSendTarget(null)} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">Assunto</label>
                <input type="text" value={sendSubject} onChange={e => setSendSubject(e.target.value)}
                  placeholder="Ex: Seu protocolo alimentar personalizado"
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">Mensagem</label>
                <textarea value={sendBody} onChange={e => setSendBody(e.target.value)} rows={5}
                  placeholder={`Olá, ${sendTarget.client_name.split(" ")[0]}!\n\nSegue em anexo o seu protocolo alimentar...`}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/30" />
              </div>

              {/* Anexos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">Anexos</label>
                  {sendFiles.length > 0 && (
                    <span className="text-xs text-muted-foreground tabular-nums">{formatBytes(sendFiles.reduce((a, f) => a + f.size, 0))} / 10 MB</span>
                  )}
                </div>

                {sendFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {sendFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted border border-border/50 text-xs text-foreground/80">
                        <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[160px]">{f.name}</span>
                        <span className="text-muted-foreground shrink-0">{formatBytes(f.size)}</span>
                        <button onClick={() => setSendFiles(prev => prev.filter((_, idx) => idx !== i))} className="ml-0.5 text-muted-foreground hover:text-red-500 transition-colors"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}

                <label className="flex items-center gap-2 px-4 py-3 rounded-md border border-dashed border-border hover:border-primary/40 hover:bg-muted/30 cursor-pointer transition-colors group">
                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                  <span className="text-xs text-muted-foreground/70 group-hover:text-foreground transition-colors">
                    Adicionar arquivo — PDF, DOCX, XLSX, imagem (máx. 10 MB)
                  </span>
                  <input type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.zip" onChange={handleAddFiles} />
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-6 py-4 border-t border-border shrink-0">
              <Button variant="outline" className="flex-1 h-9 rounded-md text-sm" onClick={() => setSendTarget(null)} disabled={sending}>Cancelar</Button>
              <Button className="flex-1 h-9 rounded-md text-sm gap-2" onClick={handleSendMaterial} disabled={sending || !sendSubject.trim() || !sendBody.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar email
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reschedule Modal ── */}
      {reschedule && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-lg border border-border shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-sm">Realocar consulta</h2>
              </div>
              <button onClick={() => setReschedule(null)} className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Patient strip */}
            <div className="px-6 py-3 bg-muted/20 border-b border-border">
              <p className="text-sm font-medium text-foreground">{reschedule.client_name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{reschedule.plan_name} · {reschedule.client_email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Atual: <span className="font-medium text-foreground">{formatDate(reschedule.appointment_date)} às {(reschedule.appointment_time || "").substring(0, 5)}</span>
              </p>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Nova data</label>
                  <input type="date" value={newDate} min={new Date().toISOString().split("T")[0]}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/40" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Novo horário</label>
                  <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/40" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  Mensagem ao paciente <span className="opacity-50">(opcional)</span>
                </label>
                <textarea value={rescheduleMsg} onChange={e => setRescheduleMsg(e.target.value)} rows={3}
                  placeholder="Ex: Precisamos reagendar devido a um imprevisto..."
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/40" />
              </div>
              <p className="text-xs text-muted-foreground bg-muted/30 border border-border/50 rounded-md px-3 py-2">
                Um email será enviado automaticamente ao paciente.
              </p>
            </div>

            <div className="flex gap-2 px-6 pb-5">
              <Button variant="outline" className="flex-1 rounded-md" onClick={() => setReschedule(null)} disabled={rescheduling}>
                Cancelar
              </Button>
              <Button className="flex-1 rounded-md gap-2" onClick={handleReschedule} disabled={rescheduling || !newDate || !newTime}>
                {rescheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAgendamentos;
