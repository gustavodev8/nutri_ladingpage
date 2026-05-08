import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Activity, FileDown, CalendarDays, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  fetchPatient,
  fetchMeasurements,
  type Patient,
  type Measurement,
} from "@/lib/supabase";
import {
  PROTOCOLS,
  SKINFOLD_LABELS,
  classifyBodyFat,
  calcArmAnthropometry,
  classifyAmbc,
  type SkinfoldKey,
} from "@/lib/anthropometryUtils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const calcBMI = (m: Measurement): number | null => {
  if (!m.weight || !m.height) return null;
  return parseFloat((m.weight / Math.pow(m.height / 100, 2)).toFixed(1));
};

const calcAge = (birthDate: string): number => {
  const today = new Date();
  const birth = new Date(birthDate + "T12:00:00");
  let age = today.getFullYear() - birth.getFullYear();
  const mo = today.getMonth() - birth.getMonth();
  if (mo < 0 || (mo === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const formatDate = (dateStr?: string) =>
  dateStr
    ? new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const formatDateShort = (dateStr?: string) =>
  dateStr
    ? new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })
    : "—";

const initials = (name: string) =>
  name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

const bmiLabel = (bmi: number) => {
  if (bmi < 18.5) return "Abaixo do peso";
  if (bmi < 25)   return "Normal";
  if (bmi < 30)   return "Sobrepeso";
  return "Obesidade";
};

// ─── renderDelta ──────────────────────────────────────────────────────────────

export function renderDelta(
  current?: number | null,
  previous?: number | null,
  decimals = 1
): React.ReactNode {
  if (current == null || previous == null) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.005) return null;
  const abs = Math.abs(diff).toFixed(decimals);
  return diff > 0 ? (
    <span className="ml-1.5 text-[11px] font-bold text-green-600 tabular-nums print:text-[8px]">
      (+{abs})
    </span>
  ) : (
    <span className="ml-1.5 text-[11px] font-bold text-red-500 tabular-nums print:text-[8px]">
      (−{abs})
    </span>
  );
}

// ─── Table sub-components ─────────────────────────────────────────────────────

function SectionRow({ label, colSpan }: { label: string; colSpan: number }) {
  return (
    <tr className="border-y border-border/60 bg-muted/40">
      <td
        colSpan={colSpan}
        className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 print:px-3 print:py-1 print:text-[7px]"
      >
        {label}
      </td>
    </tr>
  );
}

interface MetricRowProps {
  label: string;
  values: (number | null | undefined)[];
  unit?: string;
  decimals?: number;
  suffix?: (val: number, idx: number) => React.ReactNode;
}

function MetricRow({ label, values, unit = "", decimals = 1, suffix }: MetricRowProps) {
  if (values.every((v) => v == null)) return null;
  return (
    <tr className="border-b border-border/30 last:border-0 hover:bg-muted/10 transition-colors print:hover:bg-transparent">
      <td className="px-4 py-2.5 text-sm text-muted-foreground print:text-[9px] print:py-1.5 print:px-3">
        {label}
      </td>
      {values.map((val, i) => {
        const prev = i > 0 ? values[i - 1] : undefined;
        return (
          <td
            key={i}
            className="px-4 py-2.5 text-sm text-right tabular-nums print:text-[9px] print:py-1.5 print:px-3"
          >
            {val != null ? (
              <>
                <span className="font-semibold text-foreground">{val.toFixed(decimals)}</span>
                {unit && (
                  <span className="text-xs text-muted-foreground ml-0.5 print:text-[8px]">
                    {" "}{unit}
                  </span>
                )}
                {i > 0 && renderDelta(val, prev as number, decimals)}
                {suffix?.(val, i)}
              </>
            ) : (
              <span className="text-muted-foreground/30">—</span>
            )}
          </td>
        );
      })}
    </tr>
  );
}

function BilateralRow({
  label,
  rights,
  lefts,
  unit = "cm",
}: {
  label: string;
  rights: (number | null | undefined)[];
  lefts: (number | null | undefined)[];
  unit?: string;
}) {
  if ([...rights, ...lefts].every((v) => v == null)) return null;
  return (
    <tr className="border-b border-border/30 last:border-0 hover:bg-muted/10 transition-colors print:hover:bg-transparent">
      <td className="px-4 py-2.5 text-sm text-muted-foreground print:text-[9px] print:py-1.5 print:px-3">
        {label}
      </td>
      {rights.map((r, i) => {
        const l = lefts[i];
        const prevR = i > 0 ? rights[i - 1] : undefined;
        return (
          <td
            key={i}
            className="px-4 py-2.5 text-sm text-right tabular-nums print:text-[9px] print:py-1.5 print:px-3"
          >
            {r != null || l != null ? (
              <>
                <span className="font-semibold text-foreground">
                  {r != null ? r.toFixed(1) : "—"}
                </span>
                <span className="text-muted-foreground/40 mx-1 text-xs">·</span>
                <span className="font-semibold text-foreground">
                  {l != null ? l.toFixed(1) : "—"}
                </span>
                <span className="text-xs text-muted-foreground ml-0.5 print:text-[8px]"> {unit}</span>
                {i > 0 && r != null && renderDelta(r, prevR as number)}
              </>
            ) : (
              <span className="text-muted-foreground/30">—</span>
            )}
          </td>
        );
      })}
    </tr>
  );
}

function StringRow({ label, values }: { label: string; values: (string | null)[] }) {
  if (values.every((v) => v == null)) return null;
  return (
    <tr className="border-b border-border/30 last:border-0 hover:bg-muted/10 transition-colors print:hover:bg-transparent">
      <td className="px-4 py-2.5 text-sm text-muted-foreground print:text-[9px] print:py-1.5 print:px-3">
        {label}
      </td>
      {values.map((v, i) => (
        <td
          key={i}
          className="px-4 py-2.5 text-sm text-right print:text-[9px] print:py-1.5 print:px-3"
        >
          {v != null ? (
            <span className="font-medium text-foreground">{v}</span>
          ) : (
            <span className="text-muted-foreground/30">—</span>
          )}
        </td>
      ))}
    </tr>
  );
}

// ─── Date Selector ────────────────────────────────────────────────────────────

const PRINT_MAX = 5;

function DateSelector({
  measurements,
  selectedIds,
  onToggle,
  onSelectAll,
  onClear,
}: {
  measurements: Measurement[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="print:hidden rounded border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 bg-muted/30 border-b border-border hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CalendarDays size={14} className="text-muted-foreground" />
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Avaliações exibidas
          </span>
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
            {selectedIds.length} de {measurements.length}
          </span>
          {selectedIds.length > PRINT_MAX && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold border border-amber-200">
              PDF: recomendado até {PRINT_MAX} colunas
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{open ? "▲" : "▼"}</span>
      </button>

      {/* Body */}
      {open && (
        <div className="px-5 py-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {/* newest first for the UI list */}
            {measurements.map((m) => {
              const mid = m.id!;
              const checked = selectedIds.includes(mid);
              return (
                <button
                  key={mid}
                  type="button"
                  onClick={() => onToggle(mid)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-all",
                    checked
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  {checked ? <CheckSquare size={12} /> : <Square size={12} />}
                  {formatDateShort(m.assessment_date)}
                </button>
              );
            })}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onSelectAll}
              className="text-xs text-primary hover:underline font-medium"
            >
              Selecionar todas
            </button>
            <span className="text-muted-foreground/40">·</span>
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Limpar seleção
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ALL_SF_KEYS: SkinfoldKey[] = [
  "sf_pectoral", "sf_midaxillary", "sf_triceps", "sf_biceps",
  "sf_subscapular", "sf_suprailiac", "sf_abdominal", "sf_thigh_sf", "sf_calf_sf",
];

export default function AdminRelatorioAntropometrico() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading]           = useState(true);
  const [patient, setPatient]           = useState<Patient | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [selectedIds, setSelectedIds]   = useState<number[]>([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([fetchPatient(Number(id)), fetchMeasurements(Number(id))])
      .then(([p, ms]) => {
        setPatient(p);
        setMeasurements(ms);
        // Default: 2 most recent
        const defaults = ms.slice(0, 2).map((m) => m.id!).filter(Boolean);
        setSelectedIds(defaults);
      })
      .catch(() => toast.error("Erro ao carregar dados."))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Selection handlers ──────────────────────────────────────────────────────
  const toggleId = (mid: number) =>
    setSelectedIds((prev) =>
      prev.includes(mid) ? prev.filter((x) => x !== mid) : [...prev, mid]
    );

  const selectAll = () =>
    setSelectedIds(measurements.map((m) => m.id!).filter(Boolean));

  const clearAll = () => setSelectedIds([]);

  // ── Derive columns: filter + sort oldest → newest ──────────────────────────
  const cols = useMemo(() => {
    return measurements
      .filter((m) => m.id != null && selectedIds.includes(m.id))
      .sort((a, b) =>
        (a.assessment_date ?? "").localeCompare(b.assessment_date ?? "")
      );
  }, [measurements, selectedIds]);

  // ── Early returns ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
        <p className="text-sm">Carregando relatório...</p>
      </div>
    );
  }

  if (!patient || measurements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center p-6">
        <Activity className="w-10 h-10 text-muted-foreground/30" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            {!patient ? "Paciente não encontrado" : "Nenhuma avaliação registrada"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {!patient
              ? "Verifique se o ID está correto."
              : "Registre uma avaliação antropométrica primeiro."}
          </p>
        </div>
        <Link to={`/admin/pacientes/${id}?tab=antropometria`}>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded border border-border text-sm font-medium hover:bg-muted transition-colors">
            <ArrowLeft size={14} /> Voltar ao prontuário
          </button>
        </Link>
      </div>
    );
  }

  const gender: "M" | "F" = patient.gender === "F" ? "F" : "M";
  const age = patient.birth_date ? calcAge(patient.birth_date) : 30;
  const N = cols.length;
  const colSpan = N + 1;

  // ── Pre-compute derived values per selected column ──────────────────────────
  const derived = cols.map((m) => ({
    bmi: calcBMI(m),
    fatMass:
      m.weight != null && m.body_fat != null
        ? parseFloat((m.weight * (m.body_fat / 100)).toFixed(1))
        : null,
    arm:
      m.arm_relax_r && m.sf_triceps
        ? calcArmAnthropometry(m.arm_relax_r, m.sf_triceps, gender)
        : null,
  }));

  const sfSums = cols.map((m) => {
    if (!m.sf_protocol) return null;
    const info = PROTOCOLS.find((p) => p.id === m.sf_protocol);
    if (!info) return null;
    const sum = info.skinfolds.reduce((acc, k) => acc + ((m as any)[k] ?? 0), 0);
    return sum > 0 ? sum : null;
  });

  const hasArmData = derived.some((d) => d.arm != null);
  const hasTronco  = cols.some((m) => [m.neck, m.shoulder, m.chest, m.waist, m.abdomen, m.hip].some((v) => v != null));
  const hasSup     = cols.some((m) => [m.arm_relax_r, m.arm_relax_l, m.arm_contract_r, m.arm_contract_l, m.forearm_r, m.wrist_r].some((v) => v != null));
  const hasInf     = cols.some((m) => [m.thigh_prox_r, m.thigh_r, m.calf_r].some((v) => v != null));
  const hasDobras  = cols.some((m) => ALL_SF_KEYS.some((k) => (m as any)[k] != null));

  const mostRecent = cols[cols.length - 1];

  return (
    <div className="min-h-screen bg-background p-6 space-y-5 print:min-h-0 print:p-0 print:space-y-3">

      {/* ── Print-only header ─────────────────────────────────────────────── */}
      <div className="hidden print:block pb-3 mb-3 border-b-2 border-gray-800">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[7px] font-black uppercase tracking-widest text-gray-500 mb-0.5">
              Relatório Clínico — Comparativo
            </p>
            <h1 className="text-sm font-bold text-gray-900">Avaliação Antropométrica</h1>
            <p className="text-[9px] text-gray-600 mt-0.5">{patient.name}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-800">Dr. Fillipe David</p>
            <p className="text-[8px] text-gray-500">Nutricionista Clínico e Esportivo</p>
            <p className="text-[8px] text-gray-400 mt-0.5">
              Emitido em{" "}
              {new Date().toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* ── Screen header ─────────────────────────────────────────────────── */}
      <div className="print:hidden flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/admin/pacientes/${id}?tab=antropometria`}
            className="w-8 h-8 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Relatório Antropométrico</h1>
            <p className="text-sm text-muted-foreground">{patient.name}</p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 active:scale-[0.98] transition-all"
        >
          <FileDown size={15} />
          Exportar PDF
        </button>
      </div>

      {/* ── Patient card ──────────────────────────────────────────────────── */}
      <div className="rounded border border-border bg-card px-5 py-4 flex items-center gap-4 print:px-3 print:py-2 print:gap-2">
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0 print:w-7 print:h-7 print:text-[10px]">
          {initials(patient.name || "?")}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground print:text-sm">{patient.name}</p>
          <div className="flex gap-4 mt-0.5 flex-wrap">
            {patient.birth_date && (
              <span className="text-sm text-muted-foreground print:text-[9px]">
                {age} anos
              </span>
            )}
            {patient.gender && (
              <span className="text-sm text-muted-foreground print:text-[9px]">
                {patient.gender === "F" ? "Feminino" : "Masculino"}
              </span>
            )}
          </div>
        </div>
        {/* Print: show which dates are being compared */}
        <p className="hidden print:block text-[8px] text-gray-500 text-right shrink-0 max-w-[160px]">
          {cols.map((m) => formatDateShort(m.assessment_date)).join(" · ")}
        </p>
        {/* Screen: total count */}
        <p className="text-xs text-muted-foreground shrink-0 print:hidden">
          {measurements.length} avaliação{measurements.length !== 1 ? "ões" : ""}
        </p>
      </div>

      {/* ── Date selector ─────────────────────────────────────────────────── */}
      <DateSelector
        measurements={measurements}
        selectedIds={selectedIds}
        onToggle={toggleId}
        onSelectAll={selectAll}
        onClear={clearAll}
      />

      {/* ── Empty state when nothing is selected ──────────────────────────── */}
      {cols.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 gap-2 border border-border rounded bg-card text-muted-foreground print:hidden">
          <CalendarDays size={28} className="opacity-30" />
          <p className="text-sm">Selecione ao menos uma avaliação para exibir o relatório.</p>
        </div>
      )}

      {/* ── Comparison table ──────────────────────────────────────────────── */}
      {cols.length > 0 && (
        <div className="rounded border border-border overflow-hidden print:break-inside-avoid">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">

              {/* Table header */}
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-muted-foreground w-52 print:text-[8px] print:py-2 print:px-3 print:w-40">
                    Métrica
                  </th>
                  {cols.map((m, i) => (
                    <th
                      key={m.id ?? i}
                      className={cn(
                        "px-4 py-3 text-right text-xs font-black uppercase tracking-widest min-w-[148px] print:text-[8px] print:py-2 print:px-3 print:min-w-0",
                        i === cols.length - 1
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}
                    >
                      <div>{formatDate(m.assessment_date)}</div>
                      {cols.length > 1 && (
                        <div className="text-[9px] font-medium normal-case mt-0.5 opacity-60 print:hidden">
                          {i === 0
                            ? "Mais antiga"
                            : i === cols.length - 1
                            ? "Mais recente"
                            : `Avaliação ${i + 1}`}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* ── Medidas Gerais ──────────────────────────────────── */}
                <SectionRow label="Medidas Gerais" colSpan={colSpan} />

                <MetricRow
                  label="Peso"
                  values={cols.map((m) => m.weight ?? null)}
                  unit="kg"
                />
                <MetricRow
                  label="Altura"
                  values={cols.map((m) => m.height ?? null)}
                  unit="cm"
                  decimals={0}
                />
                <MetricRow
                  label="IMC"
                  values={derived.map((d) => d.bmi)}
                  unit="kg/m²"
                  suffix={(val) => (
                    <span className="ml-1.5 text-[10px] text-muted-foreground print:hidden">
                      ({bmiLabel(val)})
                    </span>
                  )}
                />

                {/* ── Composição Corporal ─────────────────────────────── */}
                <SectionRow label="Composição Corporal" colSpan={colSpan} />

                <MetricRow
                  label="Gordura Corporal"
                  values={cols.map((m) => m.body_fat ?? null)}
                  unit="%"
                  suffix={(val) => {
                    const cl = classifyBodyFat(val, gender);
                    return (
                      <span className={cn("ml-1.5 text-[10px] font-semibold print:hidden", cl.color)}>
                        ({cl.label})
                      </span>
                    );
                  }}
                />
                <MetricRow
                  label="Massa Gorda"
                  values={derived.map((d) => d.fatMass)}
                  unit="kg"
                />
                <MetricRow
                  label="Massa Magra"
                  values={cols.map((m) => m.lean_mass ?? null)}
                  unit="kg"
                />
                <MetricRow
                  label="Gordura Visceral"
                  values={cols.map((m) => m.visceral_fat ?? null)}
                  decimals={0}
                />

                {/* ── Índices do Braço (AMB / AGB) ─────────────────────── */}
                {hasArmData && (
                  <>
                    <SectionRow label="Índices do Braço — AMB / AGB" colSpan={colSpan} />
                    <MetricRow
                      label="Circ. Muscular do Braço (CMB)"
                      values={derived.map((d) => d.arm?.cmb ?? null)}
                      unit="cm"
                    />
                    <MetricRow
                      label="Área do Braço (AB)"
                      values={derived.map((d) => d.arm?.ab ?? null)}
                      unit="cm²"
                    />
                    <MetricRow
                      label="Área Muscular do Braço (AMB)"
                      values={derived.map((d) => d.arm?.amb ?? null)}
                      unit="cm²"
                    />
                    <MetricRow
                      label="AMB Corrigida — Heymsfield (AMBc)"
                      values={derived.map((d) => d.arm?.ambc ?? null)}
                      unit="cm²"
                    />
                    <MetricRow
                      label="Área Gordurosa do Braço (AGB)"
                      values={derived.map((d) => d.arm?.agb ?? null)}
                      unit="cm²"
                    />
                    <StringRow
                      label="Adequação AMBc (Frisancho, 1990)"
                      values={derived.map((d) => {
                        if (!d.arm) return null;
                        const cl = classifyAmbc(d.arm.ambc, gender, age);
                        return `${cl.pct}% — ${cl.label}`;
                      })}
                    />
                  </>
                )}

                {/* ── Circunferências — Tronco ──────────────────────────── */}
                {hasTronco && (
                  <>
                    <SectionRow label="Circunferências — Tronco" colSpan={colSpan} />
                    <MetricRow label="Pescoço"  values={cols.map((m) => m.neck     ?? null)} unit="cm" />
                    <MetricRow label="Ombro"    values={cols.map((m) => m.shoulder ?? null)} unit="cm" />
                    <MetricRow label="Peitoral" values={cols.map((m) => m.chest    ?? null)} unit="cm" />
                    <MetricRow label="Cintura"  values={cols.map((m) => m.waist    ?? null)} unit="cm" />
                    <MetricRow label="Abdômen"  values={cols.map((m) => m.abdomen  ?? null)} unit="cm" />
                    <MetricRow label="Quadril"  values={cols.map((m) => m.hip      ?? null)} unit="cm" />
                  </>
                )}

                {/* ── Circunferências — Membros Superiores ─────────────── */}
                {hasSup && (
                  <>
                    <SectionRow label="Circunferências — Membros Superiores (D · E)" colSpan={colSpan} />
                    <BilateralRow
                      label="Braço Relaxado"
                      rights={cols.map((m) => m.arm_relax_r    ?? null)}
                      lefts={cols.map((m)  => m.arm_relax_l    ?? null)}
                    />
                    <BilateralRow
                      label="Braço Contraído"
                      rights={cols.map((m) => m.arm_contract_r ?? null)}
                      lefts={cols.map((m)  => m.arm_contract_l ?? null)}
                    />
                    <BilateralRow
                      label="Antebraço"
                      rights={cols.map((m) => m.forearm_r      ?? null)}
                      lefts={cols.map((m)  => m.forearm_l      ?? null)}
                    />
                    <BilateralRow
                      label="Punho"
                      rights={cols.map((m) => m.wrist_r        ?? null)}
                      lefts={cols.map((m)  => m.wrist_l        ?? null)}
                    />
                  </>
                )}

                {/* ── Circunferências — Membros Inferiores ─────────────── */}
                {hasInf && (
                  <>
                    <SectionRow label="Circunferências — Membros Inferiores (D · E)" colSpan={colSpan} />
                    <BilateralRow
                      label="Coxa Proximal"
                      rights={cols.map((m) => m.thigh_prox_r ?? null)}
                      lefts={cols.map((m)  => m.thigh_prox_l ?? null)}
                    />
                    <BilateralRow
                      label="Coxa Medial"
                      rights={cols.map((m) => m.thigh_r      ?? null)}
                      lefts={cols.map((m)  => m.thigh_l      ?? null)}
                    />
                    <BilateralRow
                      label="Panturrilha"
                      rights={cols.map((m) => m.calf_r       ?? null)}
                      lefts={cols.map((m)  => m.calf_l       ?? null)}
                    />
                  </>
                )}

                {/* ── Dobras Cutâneas ───────────────────────────────────── */}
                {hasDobras && (
                  <>
                    <SectionRow label="Dobras Cutâneas" colSpan={colSpan} />
                    {ALL_SF_KEYS.map((key) => (
                      <MetricRow
                        key={key}
                        label={SKINFOLD_LABELS[key]}
                        values={cols.map((m) => (m as any)[key] ?? null)}
                        unit="mm"
                        decimals={1}
                      />
                    ))}
                    <MetricRow
                      label="Σ Dobras do protocolo"
                      values={sfSums}
                      unit="mm"
                      decimals={1}
                    />
                    <MetricRow
                      label="Densidade Corporal"
                      values={cols.map((m) => m.body_density ?? null)}
                      unit="g/mL"
                      decimals={4}
                    />
                    <StringRow
                      label="Protocolo"
                      values={cols.map((m) => {
                        if (!m.sf_protocol) return null;
                        return PROTOCOLS.find((p) => p.id === m.sf_protocol)?.label ?? m.sf_protocol;
                      })}
                    />
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Legend ───────────────────────────────────────────────────────── */}
      {cols.length > 0 && (
        <div className="flex flex-wrap items-center gap-5 text-xs text-muted-foreground print:text-[8px]">
          <span className="flex items-center gap-1.5">
            <span className="font-bold text-green-600">(+X)</span>
            Aumento em relação à coluna anterior
          </span>
          <span className="flex items-center gap-1.5">
            <span className="font-bold text-red-500">(−X)</span>
            Redução em relação à coluna anterior
          </span>
          <span className="text-muted-foreground/60">
            Bilateral: delta pelo lado D · AMBc: Heymsfield (1982) · Adequação: Frisancho (1990)
          </span>
        </div>
      )}

      {/* ── Notes (most recent selected) ─────────────────────────────────── */}
      {mostRecent?.notes && (
        <div className="rounded border border-border bg-card px-5 py-4 print:px-3 print:py-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 mb-1.5 print:text-[7px]">
            Observações — {formatDate(mostRecent.assessment_date)}
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed print:text-[9px]">
            {mostRecent.notes}
          </p>
        </div>
      )}
    </div>
  );
}
