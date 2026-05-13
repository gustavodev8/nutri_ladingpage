import { useState, useEffect } from "react";
import { ArrowLeft, Save, Loader2, FlaskConical, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  fetchExamRequest, saveExamResults, updateExamRequestStatus,
  type PatientExamRequest, type PatientExamResult, type ExamCatalogItem,
} from "@/lib/supabase";

// ─── Motor Terapêutico ─────────────────────────────────────────────────────────

export type TherapeuticStatus = "no_alvo" | "fora_alvo" | "critico";

/**
 * Compara o valor com:
 * 1. ref_min / ref_max → fora = "critico" (vermelho)
 * 2. target_*_min / target_*_max (por sexo) → fora = "fora_alvo" (amarelo)
 * 3. Dentro do alvo terapêutico → "no_alvo" (verde)
 */
export function calcTherapeuticStatus(
  value: number,
  exam: ExamCatalogItem,
  gender: "M" | "F" | "outro",
): TherapeuticStatus {
  // 1. Fora da referência laboratorial → Crítico
  if (exam.ref_max != null && value > exam.ref_max) return "critico";
  if (exam.ref_min != null && value < exam.ref_min) return "critico";

  // 2. Alvo terapêutico por sexo
  const tMin = gender === "F" ? exam.target_female_min : exam.target_male_min;
  const tMax = gender === "F" ? exam.target_female_max : exam.target_male_max;

  if (tMin == null && tMax == null) return "no_alvo"; // sem alvo definido

  if (tMin != null && value < tMin) return "fora_alvo";
  if (tMax != null && value > tMax) return "fora_alvo";

  return "no_alvo";
}

const STATUS_CFG: Record<TherapeuticStatus, {
  label:       string;
  description: string;
  badge:       string;
  dot:         string;
  rowBg:       string;
  inputClass:  string;
}> = {
  no_alvo: {
    label:       "Dentro do Alvo",
    description: "Valor dentro do alvo terapêutico nutricional.",
    badge:       "bg-green-50 text-green-700 border-green-200",
    dot:         "bg-green-500",
    rowBg:       "border-green-100 bg-green-50/20",
    inputClass:  "border-green-300 focus-visible:ring-green-200/50",
  },
  fora_alvo: {
    label:       "Fora do Alvo",
    description: "Fora do alvo terapêutico, mas dentro da referência laboratorial.",
    badge:       "bg-amber-50 text-amber-700 border-amber-200",
    dot:         "bg-amber-500",
    rowBg:       "border-amber-100 bg-amber-50/25",
    inputClass:  "border-amber-300 focus-visible:ring-amber-200/50",
  },
  critico: {
    label:       "Crítico",
    description: "Fora do valor de referência laboratorial.",
    badge:       "bg-red-50 text-red-700 border-red-200",
    dot:         "bg-red-500",
    rowBg:       "border-red-100 bg-red-50/25",
    inputClass:  "border-red-300 focus-visible:ring-red-200/50",
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtRange(min?: number | null, max?: number | null, unit?: string): string | null {
  if (min != null && max != null) return `${min}–${max}${unit ? " " + unit : ""}`;
  if (min != null)                return `>${min}${unit ? " " + unit : ""}`;
  if (max != null)                return `<${max}${unit ? " " + unit : ""}`;
  return null;
}

// ─── ResultRow ─────────────────────────────────────────────────────────────────

interface ResultEntry {
  exam:           ExamCatalogItem;
  result_value?:  number;
  date_collected?:string;
  notes?:         string;
}

function ResultRow({
  entry, gender, onChange,
}: {
  entry:    ResultEntry;
  gender:   "M" | "F" | "outro";
  onChange: (patch: Partial<ResultEntry>) => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const exam = entry.exam;

  const status: TherapeuticStatus | null =
    entry.result_value != null
      ? calcTherapeuticStatus(entry.result_value, exam, gender)
      : null;

  const cfg = status ? STATUS_CFG[status] : null;

  const tMin = gender === "F" ? exam.target_female_min : exam.target_male_min;
  const tMax = gender === "F" ? exam.target_female_max : exam.target_male_max;
  const refRange    = fmtRange(exam.ref_min, exam.ref_max, exam.unit);
  const targetRange = fmtRange(tMin, tMax, exam.unit);

  // How far from target
  let deviation: string | null = null;
  if (status === "fora_alvo" && entry.result_value != null) {
    if (tMin != null && entry.result_value < tMin)
      deviation = `${(tMin - entry.result_value).toFixed(1)} ${exam.unit ?? ""} abaixo do alvo`;
    else if (tMax != null && entry.result_value > tMax)
      deviation = `${(entry.result_value - tMax).toFixed(1)} ${exam.unit ?? ""} acima do alvo`;
  }
  if (status === "critico" && entry.result_value != null) {
    if (exam.ref_min != null && entry.result_value < exam.ref_min)
      deviation = `${(exam.ref_min - entry.result_value).toFixed(1)} ${exam.unit ?? ""} abaixo da referência`;
    else if (exam.ref_max != null && entry.result_value > exam.ref_max)
      deviation = `${(entry.result_value - exam.ref_max).toFixed(1)} ${exam.unit ?? ""} acima da referência`;
  }

  return (
    <div className={cn(
      "rounded-lg border transition-all",
      cfg ? cfg.rowBg : "border-border/50 bg-background",
    )}>
      <div className="flex items-start gap-3 p-3 flex-wrap sm:flex-nowrap">

        {/* Exam name + ranges */}
        <div className="flex-1 min-w-[160px]">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-foreground">{exam.name}</p>
            {(refRange || targetRange) && (
              <button
                type="button"
                onClick={() => setShowDetail((v) => !v)}
                className="text-muted-foreground/40 hover:text-primary transition-colors"
              >
                <Info size={12} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
            {exam.unit && (
              <span className="text-[11px] text-muted-foreground">{exam.unit}</span>
            )}
            {refRange && (
              <span className="text-[11px] text-muted-foreground">
                Ref: <span className="font-medium">{refRange}</span>
              </span>
            )}
            {targetRange && (
              <span className="text-[11px] text-primary/80 font-medium">
                Alvo: {targetRange}
              </span>
            )}
          </div>
        </div>

        {/* Value input */}
        <div className="w-28 shrink-0">
          <Input
            type="number"
            step="any"
            value={entry.result_value !== undefined ? String(entry.result_value) : ""}
            onChange={(e) => {
              const v = e.target.value;
              onChange({ result_value: v === "" ? undefined : parseFloat(v) });
            }}
            placeholder="Valor"
            className={cn(
              "h-8 text-sm text-right tabular-nums transition-colors",
              cfg ? cfg.inputClass : "",
            )}
          />
        </div>

        {/* Status badge */}
        {status && cfg ? (
          <div className="shrink-0 pt-1">
            <span className={cn(
              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border",
              cfg.badge,
            )}>
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
              {cfg.label}
            </span>
          </div>
        ) : (
          <div className="shrink-0 pt-1 w-[90px]" />
        )}
      </div>

      {/* Deviation hint */}
      {status && status !== "no_alvo" && cfg && (
        <div className={cn(
          "px-3 pb-2.5 text-[11px]",
          status === "fora_alvo" ? "text-amber-700/80" : "text-red-700/80",
        )}>
          {cfg.description}
          {deviation && <span className="font-medium"> · {deviation}.</span>}
        </div>
      )}

      {/* Range detail */}
      {showDetail && (
        <div className="px-3 pb-2.5 flex flex-wrap gap-x-5 gap-y-1 border-t border-border/30 pt-2">
          {refRange && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Referência lab</p>
              <p className="text-xs font-semibold text-foreground">{refRange}</p>
            </div>
          )}
          {targetRange && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Alvo terapêutico</p>
              <p className="text-xs font-semibold text-primary">{targetRange}</p>
            </div>
          )}
          {tMin == null && tMax == null && (
            <p className="text-[11px] text-muted-foreground italic">Sem alvo terapêutico definido para este exame.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface Props {
  requestId: number;
  gender:    "M" | "F" | "outro";
  onBack:    () => void;
  onSaved?:  () => void;
}

export function ExamResultsScreen({ requestId, gender, onBack, onSaved }: Props) {
  const [request,     setRequest]     = useState<PatientExamRequest | null>(null);
  const [entries,     setEntries]     = useState<ResultEntry[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [collectDate, setCollectDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    fetchExamRequest(requestId).then((req) => {
      if (!req) { setLoading(false); return; }
      setRequest(req);
      const mapped: ResultEntry[] = (req.items ?? []).map((exam) => {
        const existing = (req.results ?? []).find((r) => r.exam_id === exam.id);
        return {
          exam,
          result_value:   existing?.result_value   ?? undefined,
          date_collected: existing?.date_collected ?? undefined,
          notes:          existing?.notes          ?? undefined,
        };
      });
      setEntries(mapped);
      if (mapped.find((e) => e.date_collected)) {
        setCollectDate(mapped.find((e) => e.date_collected)!.date_collected!);
      }
      setLoading(false);
    });
  }, [requestId]);

  const updateEntry = (idx: number, patch: Partial<ResultEntry>) => {
    setEntries((prev) => { const n = [...prev]; n[idx] = { ...n[idx], ...patch }; return n; });
  };

  const handleSave = async () => {
    if (!request?.id) return;
    setSaving(true);
    const results: PatientExamResult[] = entries
      .filter((e) => e.result_value != null)
      .map((e) => ({
        exam_id:        e.exam.id,
        result_value:   e.result_value,
        date_collected: collectDate,
        notes:          e.notes,
      }));
    const ok = await saveExamResults(request.id, results);
    if (!ok) { toast.error("Erro ao salvar os resultados."); setSaving(false); return; }
    // Auto-complete if all exams have values
    if (results.length === entries.length && entries.length > 0) {
      await updateExamRequestStatus(request.id, "Concluído");
      setRequest((r) => r ? { ...r, status: "Concluído" } : r);
    }
    setSaving(false);
    toast.success("Laudos salvos com sucesso.");
    onSaved?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-primary" size={22} />
      </div>
    );
  }
  if (!request) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Pedido não encontrado.</p>;
  }

  // ── Summary stats ──
  const filled = entries.filter((e) => e.result_value != null);
  const counts = filled.reduce<Record<TherapeuticStatus, number>>(
    (acc, e) => {
      const s = calcTherapeuticStatus(e.result_value!, e.exam, gender);
      acc[s]++;
      return acc;
    },
    { no_alvo: 0, fora_alvo: 0, critico: 0 },
  );

  // ── Group by category ──
  const grouped = entries.reduce<Record<string, { entry: ResultEntry; idx: number }[]>>(
    (acc, entry, idx) => {
      const cat = entry.exam.group_category;
      (acc[cat] ??= []).push({ entry, idx });
      return acc;
    }, {},
  );

  const fmtDate = (iso: string) =>
    new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit", month: "short", year: "numeric",
    });

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft size={13} /> Voltar aos pedidos
          </button>
          <h3 className="text-sm font-bold text-foreground">Registro de Laudos</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pedido #{request.id}
            {request.protocol && (
              <span className="ml-1.5">· {request.protocol.name}</span>
            )}
            {" "}· {entries.length} exame(s)
            {" "}·{" "}
            <span className={cn(
              "font-semibold",
              request.status === "Concluído" ? "text-green-600" : "text-amber-600",
            )}>
              {request.status}
            </span>
          </p>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Data da coleta
          </Label>
          <Input
            type="date"
            value={collectDate}
            onChange={(e) => setCollectDate(e.target.value)}
            className="h-8 text-sm w-36"
          />
        </div>
      </div>

      {/* ── Status legend ── */}
      <div className="flex flex-wrap gap-2">
        {(["critico", "fora_alvo", "no_alvo"] as TherapeuticStatus[]).map((s) => {
          const cfg = STATUS_CFG[s];
          return (
            <div key={s} className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs",
              cfg.badge,
            )}>
              <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
              <span className="font-semibold tabular-nums">{counts[s]}</span>
              <span>{cfg.label}</span>
            </div>
          );
        })}
        {filled.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 bg-muted/30 text-xs text-muted-foreground">
            {filled.length}/{entries.length} preenchidos
          </div>
        )}
      </div>

      {/* ── Exam results grouped by category ── */}
      <div className="space-y-5">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <div className="flex items-center gap-1.5 mb-2 px-0.5">
              <FlaskConical size={11} className="text-muted-foreground" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {category}
              </p>
            </div>
            <div className="space-y-2">
              {items.map(({ entry, idx }) => (
                <ResultRow
                  key={entry.exam.id}
                  entry={entry}
                  gender={gender}
                  onChange={(patch) => updateEntry(idx, patch)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Save ── */}
      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        <p className="text-xs text-muted-foreground">
          {filled.length === entries.length && entries.length > 0
            ? "Todos os exames preenchidos — o pedido será marcado como Concluído."
            : `${entries.length - filled.length} exame(s) sem valor.`
          }
        </p>
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? "Salvando…" : "Salvar Laudos"}
        </Button>
      </div>
    </div>
  );
}

// ─── Legenda de referência (para exibir em outro lugar, se necessário) ────────
export { STATUS_CFG };
