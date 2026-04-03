import { useState, useEffect } from "react";
import {
  CalendarCheck, Loader2, Mail, Phone, CheckCircle2, XCircle,
  CalendarClock, X, ChevronRight, Globe, MapPin, User,
  Heart, Pill, Salad, HelpCircle, Target, Cake, ClipboardList,
  UserX, Scale, Ruler, ChevronDown, FileText, ArrowRight,
  Send, Paperclip, Trash2, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchBookings, updateBookingStatus, autoCompleteBookings,
  insertBooking, insertConsultationRecord, updateConsultationRecord,
  deleteConsultationRecord, fetchConsultationRecords,
  type Booking, type ConsultationRecord
} from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

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

  // Completion modal
  const [completing, setCompleting]         = useState<Booking | null>(null);
  const [compNotes, setCompNotes]           = useState("");
  const [compWeight, setCompWeight]         = useState("");
  const [compHeight, setCompHeight]         = useState("");
  const [compNextReturn, setCompNextReturn] = useState("");
  const [compNextSteps, setCompNextSteps]   = useState("");
  const [savingRecord, setSavingRecord]     = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const raw = await fetchBookings();
    const updated = await autoCompleteBookings(raw);
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

  const openComplete = (session: Booking) => {
    setCompleting(session);
    setCompNotes(""); setCompWeight(""); setCompHeight("");
    setCompNextReturn(""); setCompNextSteps("");
  };

  const handleSaveRecord = async () => {
    if (!completing) return;
    setSavingRecord(true);

    try {
      const w = compWeight ? parseFloat(compWeight) : null;
      const h = compHeight ? parseFloat(compHeight) : null;

      // 1. Tenta salvar prontuário com session_number; se a coluna ainda não
      //    existir no banco, tenta novamente sem ela para não bloquear o fluxo.
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

      // 2. Marca sessão como concluída (sem o toast intermediário "Status atualizado!")
      await updateBookingStatus(completing.id!, "completed", { completed_at: new Date().toISOString() });
      setBookings(prev =>
        prev.map(b => b.id === completing.id ? { ...b, status: "completed" } : b)
      );

      // 3. Se há data de retorno, cria novo agendamento
      let returnCreated = false;
      if (compNextReturn) {
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
          appointment_time: completing.appointment_time,
          type: completing.type,
          status: "confirmed",
          notes: completing.notes,
        };
        returnCreated = await insertBooking(returnSession);
      }

      // 4. Fecha modais, vai para aba Concluídos e recarrega lista
      setCompleting(null);
      setDetail(null);
      setFilter("completed");
      await load();

      toast({
        title: "Consulta concluída!",
        description: compNextReturn
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
  };

  const handleSaveEdit = async () => {
    if (!editingRecordId || !detail) return;
    setSavingEdit(true);
    const ok = await updateConsultationRecord(editingRecordId, {
      notes: editNotes.trim() || null,
      next_steps: editNextSteps.trim() || null,
      next_return_date: editNextReturn || null,
      weight: editWeight ? parseFloat(editWeight) : null,
      height: editHeight ? parseFloat(editHeight) : null,
    });
    if (ok) {
      toast({ title: "Registro atualizado." });
      setEditingRecordId(null);
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

  // Counts
  const counts: Record<FilterTab, number> = {
    confirmed: bookings.filter(b => b.status === "confirmed").length,
    pending:   bookings.filter(b => b.status === "pending").length,
    retornos:  bookings.filter(b => (b.session_number ?? 1) > 1).length,
    completed: bookings.filter(b => b.status === "completed").length,
    no_show:   bookings.filter(b => b.status === "no_show").length,
    cancelled: bookings.filter(b => b.status === "cancelled").length,
  };

  const TABS: { id: FilterTab; label: string }[] = [
    { id: "confirmed", label: "Confirmados" },
    { id: "pending",   label: "Pendentes" },
    { id: "retornos",  label: "Retornos" },
    { id: "completed", label: "Concluídos" },
    { id: "no_show",   label: "Não compareceu" },
    { id: "cancelled", label: "Cancelados" },
  ];

  const filtered = filter === "retornos"
    ? bookings.filter(b => (b.session_number ?? 1) > 1)
    : bookings.filter(b => b.status === filter);
  const groups: Record<string, Booking[]> = {};
  filtered.forEach(b => {
    if (!groups[b.booking_group_id]) groups[b.booking_group_id] = [];
    groups[b.booking_group_id].push(b);
  });
  const groupEntries = Object.entries(groups).sort(([, a], [, b]) =>
    new Date(b[0].appointment_date).getTime() - new Date(a[0].appointment_date).getTime()
  );

  // Detail
  const allGroups: Record<string, Booking[]> = {};
  bookings.forEach(b => {
    if (!allGroups[b.booking_group_id]) allGroups[b.booking_group_id] = [];
    allGroups[b.booking_group_id].push(b);
  });
  const detailGroup = detail ? (allGroups[detail] || []).sort((a, b) => a.session_number - b.session_number) : [];
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
          : sessions.every(s => s.status === "confirmed") ? "confirmed"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDetail(null)}>
          <div
            className="w-full max-w-3xl bg-background rounded-lg border border-border shadow-2xl flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
              <div>
                <h2 className="font-semibold text-base text-foreground leading-none">{detailFirst.client_name}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {detailFirst.plan_name}
                  <span className="mx-1.5 text-border">·</span>
                  {detailFirst.type === "online" ? "Online" : "Presencial"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setDetail(null); setTimeout(() => openSendMaterial(detailFirst), 100); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                  Enviar material
                </button>
                <button
                  onClick={() => setDetail(null)}
                  className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Two-column body */}
            <div className="flex flex-1 min-h-0 divide-x divide-border">

              {/* ── Left: patient info ── */}
              <div className="w-60 shrink-0 overflow-y-auto p-5 space-y-5">

                {/* Contact */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2.5">Paciente</p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-sm text-foreground/80">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="break-all leading-snug">{detailFirst.client_email}</span>
                    </div>
                    {detailFirst.client_phone && (
                      <div className="flex items-center gap-2 text-sm text-foreground/80">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {detailFirst.client_phone}
                      </div>
                    )}
                    {detailNotes.birthDate && (
                      <div className="flex items-center gap-2 text-sm text-foreground/80">
                        <Cake className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {new Date(detailNotes.birthDate + "T12:00:00").toLocaleDateString("pt-BR")}
                        {detailNotes.sex && <span className="text-muted-foreground">· {detailNotes.sex}</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Clinical ficha */}
                {(detailNotes.goal || detailNotes.restrictions || detailNotes.allergies ||
                  detailNotes.healthConditions || detailNotes.medications ||
                  detailNotes.hadNutritionist || detailNotes.howFound) && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2.5">Ficha clínica</p>
                    <dl className="space-y-3">
                      {detailNotes.goal && (
                        <div>
                          <dt className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
                            <Target className="h-3 w-3" />Objetivo
                          </dt>
                          <dd className="text-sm font-medium text-foreground pl-4">
                            {GOAL_LABELS[detailNotes.goal] || detailNotes.goal}
                          </dd>
                        </div>
                      )}
                      {detailNotes.restrictions && (
                        <div>
                          <dt className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
                            <Salad className="h-3 w-3" />Restrições
                          </dt>
                          <dd className="text-sm font-medium text-foreground pl-4">
                            {RESTRICT_LABELS[detailNotes.restrictions] || detailNotes.restrictions}
                          </dd>
                        </div>
                      )}
                      {detailNotes.allergies && (
                        <div>
                          <dt className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
                            <HelpCircle className="h-3 w-3" />Alergias
                          </dt>
                          <dd className="text-sm font-medium text-foreground pl-4">{detailNotes.allergies}</dd>
                        </div>
                      )}
                      {detailNotes.healthConditions && (
                        <div>
                          <dt className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
                            <Heart className="h-3 w-3" />Condições
                          </dt>
                          <dd className="text-sm font-medium text-foreground pl-4">{detailNotes.healthConditions}</dd>
                        </div>
                      )}
                      {detailNotes.medications && (
                        <div>
                          <dt className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
                            <Pill className="h-3 w-3" />Medicamentos
                          </dt>
                          <dd className="text-sm font-medium text-foreground pl-4">{detailNotes.medications}</dd>
                        </div>
                      )}
                      {detailNotes.hadNutritionist && (
                        <div>
                          <dt className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
                            <User className="h-3 w-3" />Acomp. anterior
                          </dt>
                          <dd className="text-sm font-medium text-foreground pl-4">
                            {detailNotes.hadNutritionist === "sim" ? "Sim" : "Não"}
                          </dd>
                        </div>
                      )}
                      {detailNotes.howFound && (
                        <div>
                          <dt className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
                            <HelpCircle className="h-3 w-3" />Como encontrou
                          </dt>
                          <dd className="text-sm font-medium text-foreground pl-4">
                            {FOUND_LABELS[detailNotes.howFound] || detailNotes.howFound}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}
              </div>

              {/* ── Right: sessions + prontuário ── */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">

                {/* Sessions */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2.5">
                    Sessões <span className="font-normal normal-case tracking-normal opacity-60">({detailGroup.length})</span>
                  </p>
                  <div className="border border-border rounded-md overflow-hidden divide-y divide-border/70">
                    {detailGroup.map(session => (
                      <div key={session.id} className="px-4 py-3 bg-card">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-semibold text-foreground shrink-0">
                              {session.session_number === 1 ? "Consulta inicial" : `Retorno ${session.session_number - 1}`}
                            </span>
                            <StatusPill status={session.status || "pending"} />
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-medium text-foreground">{formatDate(session.appointment_date)}</p>
                            <p className="text-xs text-muted-foreground">
                              {(session.appointment_time || "").substring(0, 5)}
                              <span className="mx-1 opacity-40">·</span>
                              {session.type === "online" ? "Online" : "Presencial"}
                            </p>
                          </div>
                        </div>

                        {(session.status === "confirmed" || session.status === "pending") && (
                          <div className="flex items-center gap-3 mt-2.5 pt-2 border-t border-border/40 flex-wrap">
                            <button
                              onClick={() => { setDetail(null); setTimeout(() => openReschedule(session), 100); }}
                              className="text-xs text-muted-foreground hover:text-blue-600 font-medium transition-colors"
                            >
                              Realocar
                            </button>
                            <button
                              onClick={() => handleChangeType(session)}
                              className="text-xs text-muted-foreground hover:text-violet-600 font-medium transition-colors"
                            >
                              → {session.type === "online" ? "Presencial" : "Online"}
                            </button>
                            <button
                              disabled={updating === session.id}
                              onClick={() => { setDetail(null); setTimeout(() => openComplete(session), 100); }}
                              className="text-xs text-muted-foreground hover:text-emerald-600 font-medium transition-colors disabled:opacity-40"
                            >
                              Concluir
                            </button>
                            <button
                              disabled={updating === session.id}
                              onClick={() => handleStatus(session.id!, "no_show")}
                              className="text-xs text-muted-foreground hover:text-orange-500 font-medium transition-colors disabled:opacity-40"
                            >
                              Não compareceu
                            </button>
                            <button
                              disabled={updating === session.id}
                              onClick={() => handleStatus(session.id!, "cancelled")}
                              className="text-xs text-muted-foreground hover:text-red-500 font-medium transition-colors disabled:opacity-40 ml-auto"
                            >
                              Cancelar
                            </button>
                          </div>
                        )}

                        {session.status === "completed" && (
                          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/40">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            <span className="text-xs text-muted-foreground">Realizada</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prontuário */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2.5">Prontuário</p>
                  {loadingRecords ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : records.length === 0 ? (
                    <div className="border border-border/50 rounded-md px-4 py-6 text-center">
                      <FileText className="h-5 w-5 text-muted-foreground/20 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Nenhum registro ainda.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {records.map(rec => {
                        const bmi = rec.weight && rec.height ? calcBMI(rec.weight, rec.height) : null;
                        const isEditing = editingRecordId === rec.id;
                        const isConfirmingDelete = confirmDeleteId === rec.id;

                        return (
                          <div key={rec.id} className="border border-border rounded-md overflow-hidden">

                            {/* Record header */}
                            <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-foreground">
                                  {rec.session_number === 1
                                    ? "Consulta inicial"
                                    : rec.session_number
                                    ? `Retorno ${rec.session_number - 1}`
                                    : "Consulta"}
                                </span>
                                <span className="text-muted-foreground/40 text-xs">·</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(rec.created_at!).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                                </span>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1">
                                {!isEditing && !isConfirmingDelete && (
                                  <>
                                    {rec.weight && <span className="flex items-center gap-1 text-xs text-muted-foreground mr-2"><Scale className="h-3 w-3" />{rec.weight} kg</span>}
                                    {rec.height && <span className="flex items-center gap-1 text-xs text-muted-foreground mr-2"><Ruler className="h-3 w-3" />{rec.height} cm</span>}
                                    {bmi && <span className="text-xs font-semibold text-foreground mr-3">IMC {bmi}</span>}
                                    <button
                                      onClick={() => openEditRecord(rec)}
                                      className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                      title="Editar"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => { setConfirmDeleteId(rec.id!); setEditingRecordId(null); }}
                                      className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                                      title="Excluir"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </>
                                )}
                                {isConfirmingDelete && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Excluir registro?</span>
                                    <button
                                      onClick={() => handleDeleteRecord(rec.id!)}
                                      className="text-xs font-medium text-destructive hover:text-destructive/80 transition-colors"
                                    >
                                      Sim
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      Não
                                    </button>
                                  </div>
                                )}
                                {isEditing && (
                                  <span className="text-xs text-primary font-medium">Editando…</span>
                                )}
                              </div>
                            </div>

                            {/* Record body — view mode */}
                            {!isEditing && !isConfirmingDelete && (
                              <div className="px-4 py-3 space-y-2.5 bg-card">
                                {rec.notes && (
                                  <p className="text-sm text-foreground/90 leading-relaxed">{rec.notes}</p>
                                )}
                                {rec.next_steps && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Próximos passos</p>
                                    <p className="text-sm text-foreground/80">{rec.next_steps}</p>
                                  </div>
                                )}
                                {rec.next_return_date && (
                                  <p className="text-xs text-primary font-medium flex items-center gap-1">
                                    <ArrowRight className="h-3 w-3" />
                                    Retorno: {new Date(rec.next_return_date + "T12:00:00").toLocaleDateString("pt-BR")}
                                  </p>
                                )}
                                {!rec.notes && !rec.next_steps && !rec.next_return_date && (
                                  <p className="text-xs text-muted-foreground italic">Sem observações.</p>
                                )}
                              </div>
                            )}

                            {/* Record body — edit mode */}
                            {isEditing && (
                              <div className="px-4 py-4 space-y-3 bg-card">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground flex items-center gap-1"><Scale className="h-3 w-3" />Peso (kg)</label>
                                    <input
                                      type="number" step="0.1" value={editWeight}
                                      onChange={e => setEditWeight(e.target.value)}
                                      placeholder="Ex: 72.5"
                                      className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground flex items-center gap-1"><Ruler className="h-3 w-3" />Altura (cm)</label>
                                    <input
                                      type="number" step="0.1" value={editHeight}
                                      onChange={e => setEditHeight(e.target.value)}
                                      placeholder="Ex: 165"
                                      className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs text-muted-foreground">Observações</label>
                                  <textarea
                                    value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3}
                                    className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/40"
                                    placeholder="Observações da consulta…"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs text-muted-foreground">Próximos passos</label>
                                  <textarea
                                    value={editNextSteps} onChange={e => setEditNextSteps(e.target.value)} rows={2}
                                    className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/40"
                                    placeholder="Encaminhamentos, plano enviado…"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs text-muted-foreground">Próximo retorno</label>
                                  <input
                                    type="date" value={editNextReturn}
                                    onChange={e => setEditNextReturn(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                                  />
                                </div>
                                <div className="flex gap-2 pt-1">
                                  <Button
                                    variant="outline" size="sm" className="flex-1 rounded-md text-xs h-8"
                                    onClick={() => setEditingRecordId(null)} disabled={savingEdit}
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    size="sm" className="flex-1 rounded-md text-xs h-8 gap-1.5"
                                    onClick={handleSaveEdit} disabled={savingEdit}
                                  >
                                    {savingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                                    Salvar
                                  </Button>
                                </div>
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Completion Modal ── */}
      {completing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-lg border border-border shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-sm">Registrar consulta</h2>
              </div>
              <button onClick={() => setCompleting(null)} className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Patient strip */}
            <div className="px-6 py-3 bg-muted/20 border-b border-border">
              <p className="text-sm font-medium text-foreground">{completing.client_name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDate(completing.appointment_date)} às {(completing.appointment_time || "").substring(0, 5)}
              </p>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Measurements */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">Medidas</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Scale className="h-3 w-3" />Peso (kg)
                    </label>
                    <input type="number" step="0.1" value={compWeight} onChange={e => setCompWeight(e.target.value)}
                      placeholder="Ex: 72.5"
                      className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/40" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Ruler className="h-3 w-3" />Altura (cm)
                    </label>
                    <input type="number" step="0.1" value={compHeight} onChange={e => setCompHeight(e.target.value)}
                      placeholder="Ex: 165"
                      className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/40" />
                  </div>
                </div>
                {compWeight && compHeight && (
                  <p className="text-xs text-muted-foreground mt-2">
                    IMC calculado: <span className="font-semibold text-foreground">{calcBMI(parseFloat(compWeight), parseFloat(compHeight))}</span>
                  </p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">Observações da consulta</label>
                <textarea value={compNotes} onChange={e => setCompNotes(e.target.value)} rows={4}
                  placeholder="Descreva o que foi discutido, avaliações realizadas, condutas adotadas..."
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/40" />
              </div>

              {/* Next steps */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">Próximos passos</label>
                <textarea value={compNextSteps} onChange={e => setCompNextSteps(e.target.value)} rows={3}
                  placeholder="Ex: Plano alimentar enviado, retorno em 30 dias, exames solicitados..."
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/40" />
              </div>

              {/* Next return */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
                  Próximo retorno <span className="normal-case font-normal tracking-normal opacity-60">(opcional)</span>
                </label>
                <input type="date" value={compNextReturn} min={new Date().toISOString().split("T")[0]}
                  onChange={e => setCompNextReturn(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/40" />
              </div>
            </div>

            <div className="flex gap-2 px-6 pb-5">
              <Button variant="outline" className="flex-1 rounded-md" onClick={() => setCompleting(null)} disabled={savingRecord}>
                Cancelar
              </Button>
              <Button className="flex-1 rounded-md gap-2" onClick={handleSaveRecord} disabled={savingRecord}>
                {savingRecord ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                Salvar prontuário
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Send Material Modal ── */}
      {sendTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-lg border border-border shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-sm">Enviar material ao paciente</h2>
              </div>
              <button
                onClick={() => setSendTarget(null)}
                className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Patient strip */}
            <div className="px-6 py-3 bg-muted/20 border-b border-border shrink-0">
              <p className="text-sm font-medium text-foreground">{sendTarget.client_name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sendTarget.client_email}</p>
            </div>

            {/* Form */}
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">Assunto</label>
                <input
                  type="text"
                  value={sendSubject}
                  onChange={e => setSendSubject(e.target.value)}
                  placeholder="Ex: Seu protocolo alimentar personalizado"
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>

              {/* Body */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">Mensagem</label>
                <textarea
                  value={sendBody}
                  onChange={e => setSendBody(e.target.value)}
                  rows={5}
                  placeholder={`Olá, ${sendTarget.client_name.split(" ")[0]}!\n\nSegue em anexo o seu protocolo alimentar. Qualquer dúvida, estou à disposição.\n\nAbraços,`}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/40"
                />
              </div>

              {/* Attachments */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">Anexos</label>
                  {sendFiles.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {formatBytes(sendFiles.reduce((a, f) => a + f.size, 0))} / 10 MB
                    </span>
                  )}
                </div>

                {/* File list */}
                {sendFiles.length > 0 && (
                  <div className="border border-border rounded-md divide-y divide-border/60">
                    {sendFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-card">
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{f.name}</p>
                          <p className="text-xs text-muted-foreground">{formatBytes(f.size)}</p>
                        </div>
                        <button
                          onClick={() => setSendFiles(prev => prev.filter((_, idx) => idx !== i))}
                          className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload button */}
                <label className="flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-colors group">
                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                    Adicionar arquivo — PDF, DOCX, XLSX, imagem (máx. 10 MB total)
                  </span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.zip"
                    onChange={handleAddFiles}
                  />
                </label>
              </div>

            </div>

            {/* Footer */}
            <div className="flex gap-2 px-6 pb-5 pt-2 shrink-0 border-t border-border">
              <Button variant="outline" className="flex-1 rounded-md" onClick={() => setSendTarget(null)} disabled={sending}>
                Cancelar
              </Button>
              <Button
                className="flex-1 rounded-md gap-2"
                onClick={handleSendMaterial}
                disabled={sending || !sendSubject.trim() || !sendBody.trim()}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar
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
