import { useState, useEffect, useRef } from "react";
import {
  Plus, Trash2, Loader2, FlaskConical, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, Save, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  fetchLabExams, upsertLabExam, deleteLabExam, saveLabResults,
  type LabExam, type LabResult,
} from "@/lib/supabase";
import {
  searchExams, findExam, calcStatus, STATUS_CONFIG, EXAM_CATEGORIES,
  type ExamRef, type ResultStatus,
} from "@/lib/examsDictionary";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayISO = () => new Date().toISOString().slice(0, 10);

const formatDate = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });

function emptyResult(): LabResult {
  return { exam_name: "", unit: "", value_num: undefined };
}

// ─── ExamAutocomplete ─────────────────────────────────────────────────────────

function ExamAutocomplete({ value, onChange, onSelect }: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (ref: ExamRef) => void;
}) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<ExamRef[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInput = (v: string) => {
    onChange(v);
    setResults(v.length > 0 ? searchExams(v).slice(0, 8) : []);
    setOpen(v.length > 0);
  };

  return (
    <div ref={ref} className="relative">
      <Input
        value={value}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => { if (value) { setResults(searchExams(value).slice(0, 8)); setOpen(true); } }}
        placeholder="Ex: Glicemia de Jejum, TSH…"
        className="h-8 text-sm rounded-md"
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-card border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {results.map(exam => (
            <button
              key={exam.name}
              type="button"
              onMouseDown={() => { onSelect(exam); setOpen(false); }}
              className="w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-muted/60 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{exam.name}</p>
                <p className="text-xs text-muted-foreground">
                  {exam.category}
                  {exam.ref_min != null && exam.ref_max != null && ` · Ref: ${exam.ref_min}–${exam.ref_max} ${exam.unit}`}
                  {exam.ref_max != null && exam.ref_min == null && ` · Ref: <${exam.ref_max} ${exam.unit}`}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ResultStatus | string }) {
  const cfg = STATUS_CONFIG[status as ResultStatus] ?? STATUS_CONFIG.normal;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border", cfg.badge)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ─── ResultRow ────────────────────────────────────────────────────────────────

function ResultRow({ result, onChange, onRemove }: {
  result: LabResult;
  onChange: (r: LabResult) => void;
  onRemove: () => void;
}) {
  const [showHint, setShowHint] = useState(false);
  const ref = findExam(result.exam_name);

  const status: ResultStatus | null = ref && result.value_num != null
    ? calcStatus(result.value_num, ref)
    : result.status as ResultStatus ?? null;

  const handleSelect = (examRef: ExamRef) => {
    onChange({
      ...result,
      exam_name: examRef.name,
      unit:      examRef.unit,
      ref_min:   examRef.ref_min,
      ref_max:   examRef.ref_max,
      ref_text:  examRef.ref_text,
    });
  };

  const handleValue = (v: string) => {
    const num = v === "" ? undefined : parseFloat(v);
    const newStatus = ref && num != null ? calcStatus(num, ref) : undefined;
    onChange({ ...result, value_num: num, status: newStatus });
  };

  return (
    <div className={cn(
      "rounded-lg border transition-all",
      status === "critico_alto" || status === "critico_baixo"
        ? "border-red-200 bg-red-50/40"
        : status === "alto" || status === "baixo"
          ? "border-orange-200/70 bg-orange-50/20"
          : "border-border/60 bg-background"
    )}>
      <div className="flex items-start gap-2 p-3 flex-wrap sm:flex-nowrap">
        {/* Nome do exame */}
        <div className="flex-1 min-w-[180px]">
          <ExamAutocomplete
            value={result.exam_name}
            onChange={v => onChange({ ...result, exam_name: v })}
            onSelect={handleSelect}
          />
        </div>

        {/* Valor */}
        <div className="w-24 shrink-0">
          <Input
            type="number"
            step="any"
            value={result.value_num !== undefined ? String(result.value_num) : ""}
            onChange={e => handleValue(e.target.value)}
            placeholder="Valor"
            className="h-8 text-sm rounded-md text-right tabular-nums"
          />
        </div>

        {/* Unidade */}
        <div className="w-20 shrink-0">
          <Input
            value={result.unit ?? ""}
            onChange={e => onChange({ ...result, unit: e.target.value })}
            placeholder="Unidade"
            className="h-8 text-sm rounded-md"
          />
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-1.5 shrink-0 pt-1.5">
          {status && <StatusBadge status={status} />}
          {ref?.hint && (
            <button type="button" onClick={() => setShowHint(v => !v)}
              className="text-muted-foreground/50 hover:text-primary transition-colors">
              <Info size={13} />
            </button>
          )}
          <button type="button" onClick={onRemove}
            className="text-muted-foreground/30 hover:text-destructive transition-colors ml-1">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Referência + hint */}
      {(ref || showHint) && (
        <div className="px-3 pb-2.5 flex items-start justify-between gap-3 flex-wrap">
          {ref && (
            <p className="text-[11px] text-muted-foreground">
              Referência:{" "}
              {ref.ref_min != null && ref.ref_max != null && <span className="font-medium">{ref.ref_min}–{ref.ref_max} {ref.unit}</span>}
              {ref.ref_max != null && ref.ref_min == null && <span className="font-medium">&lt;{ref.ref_max} {ref.unit}</span>}
              {ref.ref_min != null && ref.ref_max == null && <span className="font-medium">&gt;{ref.ref_min} {ref.unit}</span>}
              {ref.critical_high != null && <span className="text-red-500 ml-2">· Crítico &gt;{ref.critical_high}</span>}
            </p>
          )}
          {showHint && ref?.hint && (
            <p className="text-[11px] text-primary/80 max-w-sm">{ref.hint}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ExamPanel (painel colapsável de um exame) ────────────────────────────────

function ExamPanel({ exam, onSaved, onDeleted }: {
  exam: LabExam;
  onSaved: (e: LabExam) => void;
  onDeleted: () => void;
}) {
  const [open, setOpen]       = useState(!exam.id);
  const [saving, setSaving]   = useState(false);
  const [results, setResults] = useState<LabResult[]>(exam.results ?? [emptyResult()]);
  const [meta, setMeta]       = useState({ exam_date: exam.exam_date, lab_name: exam.lab_name ?? "", notes: exam.notes ?? "" });

  const altered = results.filter(r => {
    if (!r.exam_name || r.value_num == null) return false;
    return r.status && r.status !== "normal";
  });

  const handleSave = async () => {
    setSaving(true);
    const saved = await upsertLabExam({ ...exam, ...meta, patient_id: exam.patient_id });
    if (!saved?.id) { toast.error("Erro ao salvar o painel."); setSaving(false); return; }
    const ok = await saveLabResults(saved.id, results.filter(r => r.exam_name.trim()));
    setSaving(false);
    if (!ok) { toast.error("Erro ao salvar os resultados."); return; }
    toast.success("Exames salvos.");
    onSaved({ ...saved, results });
  };

  const handleDelete = async () => {
    if (!exam.id) { onDeleted(); return; }
    if (!confirm("Excluir este painel de exames?")) return;
    if (await deleteLabExam(exam.id)) { toast.success("Painel excluído."); onDeleted(); }
  };

  return (
    <div className="border border-border/70 rounded-xl overflow-hidden bg-card">

      {/* ── Header ── */}
      <div
        className="flex items-center gap-3 px-5 py-3.5 bg-muted/30 cursor-pointer select-none hover:bg-muted/50 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <FlaskConical size={15} className="text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {meta.exam_date ? formatDate(meta.exam_date) : "Nova solicitação"}
            {meta.lab_name && <span className="text-muted-foreground font-normal ml-2">· {meta.lab_name}</span>}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-muted-foreground">{results.filter(r => r.exam_name).length} exame(s)</span>
            {altered.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-orange-600">
                <AlertTriangle size={11} /> {altered.length} alterado(s)
              </span>
            )}
            {altered.length === 0 && results.some(r => r.exam_name && r.value_num != null) && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-green-600">
                <CheckCircle2 size={11} /> Todos normais
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={e => { e.stopPropagation(); handleDelete(); }}
            className="text-muted-foreground/30 hover:text-destructive transition-colors p-1">
            <Trash2 size={14} />
          </button>
          {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </div>
      </div>

      {/* ── Body ── */}
      {open && (
        <div className="p-5 space-y-4">

          {/* Meta do painel */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Data do exame</Label>
              <Input type="date" value={meta.exam_date} onChange={e => setMeta(m => ({ ...m, exam_date: e.target.value }))} className="h-8 text-sm rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Laboratório</Label>
              <Input value={meta.lab_name} onChange={e => setMeta(m => ({ ...m, lab_name: e.target.value }))} placeholder="Nome do laboratório" className="h-8 text-sm rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Observações</Label>
              <Input value={meta.notes} onChange={e => setMeta(m => ({ ...m, notes: e.target.value }))} placeholder="Notas gerais" className="h-8 text-sm rounded-md" />
            </div>
          </div>

          {/* Lista de resultados */}
          <div className="space-y-2">
            {results.map((r, i) => (
              <ResultRow
                key={i}
                result={r}
                onChange={updated => { const n = [...results]; n[i] = updated; setResults(n); }}
                onRemove={() => setResults(results.filter((_, ri) => ri !== i))}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 gap-3 flex-wrap">
            <button type="button" onClick={() => setResults(r => [...r, emptyResult()])}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
              <Plus size={12} /> Adicionar exame
            </button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {saving ? "Salvando…" : "Salvar painel"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ExamesTab (exportado para uso em AdminPaciente) ──────────────────────────

export function ExamesTab({ patientId }: { patientId: number }) {
  const [exams, setExams]   = useState<LabExam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLabExams(patientId).then(data => { setExams(data); setLoading(false); });
  }, [patientId]);

  const addPanel = () => {
    setExams(prev => [{ patient_id: patientId, exam_date: todayISO(), results: [emptyResult()] }, ...prev]);
  };

  const totalAltered = exams.reduce((acc, e) =>
    acc + (e.results?.filter(r => r.status && r.status !== "normal").length ?? 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-primary" size={22} />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Exames Laboratoriais</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {exams.length} painel(is) registrado(s)
            {totalAltered > 0 && (
              <span className="ml-2 text-orange-600 font-semibold">· {totalAltered} resultado(s) alterado(s)</span>
            )}
          </p>
        </div>
        <Button size="sm" onClick={addPanel} className="gap-1.5 shrink-0">
          <Plus size={13} /> Nova solicitação
        </Button>
      </div>

      {/* ── Alertas de resultados críticos ── */}
      {exams.some(e => e.results?.some(r => r.status === "critico_alto" || r.status === "critico_baixo")) && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle size={15} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Atenção — valores críticos detectados</p>
            <p className="text-xs text-red-600 mt-0.5">Verifique os painéis marcados com ↑ Crítico ou ↓ Crítico abaixo.</p>
          </div>
        </div>
      )}

      {/* ── Painéis de exames ── */}
      {exams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-2 border border-border rounded-xl bg-card text-muted-foreground">
          <FlaskConical size={28} className="opacity-30" />
          <p className="text-sm">Nenhum exame registrado. Clique em "Nova solicitação" para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam, i) => (
            <ExamPanel
              key={exam.id ?? `new-${i}`}
              exam={exam}
              onSaved={saved => setExams(prev => { const n = [...prev]; n[i] = { ...saved }; return n; })}
              onDeleted={() => setExams(prev => prev.filter((_, ei) => ei !== i))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
