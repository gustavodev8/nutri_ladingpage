import { useState, useEffect, useCallback } from "react";
import {
  Plus, Loader2, FlaskConical, AlertTriangle, CheckCircle2,
  Trash2, ChevronDown, ChevronUp, FileText, ClipboardList, Printer, Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  fetchExamRequests, deleteExamRequest, supabase,
  type Patient, type PatientExamRequest,
} from "@/lib/supabase";
import { ExamRequestScreen } from "@/components/admin/ExamRequestScreen";
import { ExamResultsScreen, calcTherapeuticStatus } from "@/components/admin/ExamResultsScreen";
import { examRequestPdfFilename, generateExamRequestPdf } from "@/lib/generateExamRequestPdf";

const requestStatusLabel = (status: PatientExamRequest["status"]) =>
  status === "completed" ? "Concluído" : "Pendente";

// Types

type View =
  | { kind: "list" }
  | { kind: "new-request" }
  | { kind: "results"; requestId: number };

interface Props {
  patientId: number;
  gender:    "M" | "F" | "outro";
  patient:   Patient;
}

// Request card

function RequestCard({
  request, gender, patient, onOpenResults, onDeleted,
}: {
  request:       PatientExamRequest;
  gender:        "M" | "F" | "outro";
  patient:       Patient;
  onOpenResults: () => void;
  onDeleted:     () => void;
}) {
  const [open, setOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const results = request.results ?? [];
  const filled  = results.filter((r) => r.result_value != null);

  const counts = filled.reduce<{ critico: number; fora_alvo: number; no_alvo: number }>(
    (acc, r) => {
      if (r.result_value == null) return acc;
      const exam = (request.items ?? []).find((e) => e.id === r.exam_id);
      if (!exam) return acc;
      const s = calcTherapeuticStatus(r.result_value, exam, gender);
      acc[s]++;
      return acc;
    },
    { critico: 0, fora_alvo: 0, no_alvo: 0 },
  );

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "short", year: "numeric",
    });

  const handleDelete = async () => {
    if (!request.id) return;
    if (!confirm(`Excluir pedido #${request.id}? Os resultados também serão removidos.`)) return;
    if (await deleteExamRequest(request.id)) {
      toast.success("Pedido excluído.");
      onDeleted();
    } else {
      toast.error("Erro ao excluir o pedido.");
    }
  };

  const buildPdfData = () => ({
    patientName: patient.name,
    patientEmail: patient.email ?? null,
    patientPhone: patient.phone ?? null,
    patientCpf: patient.cpf ?? null,
    patientBirthDate: patient.birth_date ?? null,
    patientGender: patient.gender ?? null,
    patientCity: patient.city ?? null,
    protocolName: request.protocol?.name ?? "Seleção manual",
    globalNotes: request.notes ?? null,
    items: (request.items ?? []).map((exam) => ({
      exam,
      notes: exam.request_notes ?? undefined,
    })),
  });

  const handlePrint = async () => {
    if ((request.items ?? []).length === 0) {
      toast.error("Este pedido não tem exames para imprimir.");
      return;
    }

    try {
      const doc = await generateExamRequestPdf(buildPdfData());
      doc.autoPrint();
      window.open(doc.output("bloburl"), "_blank");
    } catch (error) {
      toast.error(`Erro ao gerar PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleSendEmail = async () => {
    if ((request.items ?? []).length === 0) {
      toast.error("Este pedido não tem exames para enviar.");
      return;
    }
    if (!patient.email?.trim()) {
      toast.error("Cadastre um e-mail no perfil do paciente antes de enviar.");
      return;
    }

    setSendingEmail(true);
    try {
      const doc = await generateExamRequestPdf(buildPdfData());
      const pdfB64 = doc.output("datauristring").split(",")[1];
      const filename = examRequestPdfFilename(patient.name);

      const { data, error } = await supabase.functions.invoke("send-material", {
        body: {
          to: patient.email.trim(),
          client_name: patient.name,
          subject: `Solicitação de exames — ${patient.name}`,
          body: `Olá${patient.name ? `, ${patient.name.split(" ")[0]}` : ""}!\n\nSegue em anexo sua solicitação de exames laboratoriais.\n\nLeve este PDF ao laboratório de sua preferência.\n\nQualquer dúvida, fico à disposição.`,
          attachments: [{ filename, content: pdfB64 }],
        },
      });

      if (error || !data?.success) {
        throw new Error(error?.message ?? data?.error ?? "Falha ao enviar e-mail.");
      }

      toast.success(`Solicitação enviada para ${patient.email}.`);
    } catch (error) {
      toast.error(`Erro ao enviar: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="border border-border/70 rounded-xl overflow-hidden bg-card">

      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3.5 bg-muted/30 cursor-pointer select-none hover:bg-muted/50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <FlaskConical size={15} className="text-primary shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">
              {request.protocol?.name ?? "Seleção manual"}
              {" "}
              <span className="text-muted-foreground font-normal text-xs">
                #{request.id} · {fmtDate(request.created_at ?? "")}
              </span>
            </p>
            <span className={cn(
              "text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border",
              request.status === "completed"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-amber-50 text-amber-700 border-amber-200",
            )}>
              {requestStatusLabel(request.status)}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {request.items?.length ?? 0} exame(s) · {filled.length} resultado(s)
            </span>
            {counts.critico > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600">
                <AlertTriangle size={11} /> {counts.critico} crítico(s)
              </span>
            )}
            {counts.fora_alvo > 0 && counts.critico === 0 && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                <AlertTriangle size={11} /> {counts.fora_alvo} fora do alvo
              </span>
            )}
            {filled.length > 0 && counts.critico === 0 && counts.fora_alvo === 0 && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-green-600">
                <CheckCircle2 size={11} /> Todos no alvo
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            className="text-muted-foreground/30 hover:text-destructive transition-colors p-1"
          >
            <Trash2 size={14} />
          </button>
          {open
            ? <ChevronUp  size={16} className="text-muted-foreground" />
            : <ChevronDown size={16} className="text-muted-foreground" />
          }
        </div>
      </div>

      {/* Body */}
      {open && (
        <div className="p-5 space-y-4">
          {/* Exam list preview */}
          {(request.items ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(request.items ?? []).map((exam) => {
                const result = results.find((r) => r.exam_id === exam.id);
                const hasValue = result?.result_value != null;
                const status = hasValue
                  ? calcTherapeuticStatus(result!.result_value!, exam, gender)
                  : null;
                return (
                  <span
                    key={exam.id}
                    className={cn(
                      "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border font-medium",
                      !hasValue   ? "bg-muted/50 border-border/50 text-muted-foreground" :
                      status === "critico"   ? "bg-red-50   border-red-200   text-red-700"   :
                      status === "fora_alvo" ? "bg-amber-50 border-amber-200 text-amber-700" :
                                               "bg-green-50 border-green-200 text-green-700",
                    )}
                  >
                    {hasValue && (
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        status === "critico"   ? "bg-red-500"   :
                        status === "fora_alvo" ? "bg-amber-500" : "bg-green-500",
                      )} />
                    )}
                    {exam.name}
                    {exam.request_notes && (
                      <span className="text-muted-foreground font-normal ml-0.5">
                        · {exam.request_notes}
                      </span>
                    )}
                    {hasValue && (
                      <span className="tabular-nums font-semibold ml-0.5">
                        {result!.result_value} {exam.unit}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          )}

          {/* Notes */}
          {request.notes && (
            <p className="text-xs text-muted-foreground italic">{request.notes}</p>
          )}

          {/* Action */}
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" onClick={handlePrint} className="gap-1.5" variant="outline">
              <Printer size={13} />
              Imprimir solicitação
            </Button>
            <Button
              size="sm"
              onClick={handleSendEmail}
              disabled={sendingEmail || !patient.email}
              title={patient.email ? `Enviar para ${patient.email}` : "Cadastre um e-mail no perfil do paciente"}
              className="gap-1.5"
              variant="outline"
            >
              {sendingEmail ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
              {sendingEmail ? "Enviando..." : "Enviar por e-mail"}
            </Button>
            <Button size="sm" onClick={onOpenResults} className="gap-1.5" variant="outline">
              <ClipboardList size={13} />
              {filled.length > 0 ? "Ver / editar laudos" : "Lançar resultados"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Main tab

export function ExamProtocolsTab({ patientId, gender, patient }: Props) {
  const [view,     setView]     = useState<View>({ kind: "list" });
  const [requests, setRequests] = useState<PatientExamRequest[]>([]);
  const [loading,  setLoading]  = useState(true);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    const data = await fetchExamRequests(patientId);
    setRequests(data);
    setLoading(false);
  }, [patientId]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const handleCreated = (requestId: number) => {
    loadRequests();
    setView({ kind: "results", requestId });
  };

  const totalCritical = requests.reduce((acc, req) => {
    return acc + (req.results ?? []).filter((r) => {
      if (r.result_value == null) return false;
      const exam = (req.items ?? []).find((e) => e.id === r.exam_id);
      if (!exam) return false;
      return calcTherapeuticStatus(r.result_value, exam, gender) === "critico";
    }).length;
  }, 0);

  // Results view
  if (view.kind === "results") {
    return (
      <ExamResultsScreen
        requestId={view.requestId}
        gender={gender}
        onBack={() => { setView({ kind: "list" }); loadRequests(); }}
        onSaved={loadRequests}
      />
    );
  }

  // New request view
  if (view.kind === "new-request") {
    return (
      <ExamRequestScreen
        patientId={patientId}
        onCreated={handleCreated}
        onCancel={() => setView({ kind: "list" })}
      />
    );
  }

  // List view
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-primary" size={22} />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Protocolos de Exames</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {requests.length} pedido(s) registrado(s)
            {totalCritical > 0 && (
              <span className="ml-2 text-red-600 font-semibold">
                · {totalCritical} resultado(s) crítico(s)
              </span>
            )}
          </p>
        </div>
        <Button size="sm" onClick={() => setView({ kind: "new-request" })} className="gap-1.5 shrink-0">
          <Plus size={13} /> Nova Solicitação
        </Button>
      </div>

      {/* Critical alert */}
      {totalCritical > 0 && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle size={15} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Atenção — valores fora da referência laboratorial</p>
            <p className="text-xs text-red-600 mt-0.5">
              Verifique os pedidos marcados com "crítico" abaixo.
            </p>
          </div>
        </div>
      )}

      {/* Request list */}
      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3 border border-border rounded-xl bg-card text-muted-foreground">
          <FileText size={28} className="opacity-30" />
          <div className="text-center">
            <p className="text-sm font-medium">Nenhum pedido registrado.</p>
            <p className="text-xs mt-0.5">Clique em "Nova Solicitação" para gerar o primeiro pedido.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req, i) => (
            <RequestCard
              key={req.id ?? `r-${i}`}
              request={req}
              gender={gender}
              patient={patient}
              onOpenResults={() => setView({ kind: "results", requestId: req.id! })}
              onDeleted={() => setRequests((prev) => prev.filter((_, ri) => ri !== i))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
