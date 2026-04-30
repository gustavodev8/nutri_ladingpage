import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Printer, Activity, User, Scale, Percent, Ruler, Heart, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  fetchPatient,
  fetchMeasurements,
  type Patient,
  type Measurement,
} from "@/lib/supabase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const calcBMI = (weight?: number, height?: number): string | null => {
  if (!weight || !height) return null;
  return (weight / Math.pow(height / 100, 2)).toFixed(1);
};

const bmiStatus = (bmi: number): { label: string; dot: string; badge: string } => {
  if (bmi < 18.5) return { label: "Abaixo do peso", dot: "bg-blue-400",  badge: "text-blue-700 bg-blue-50 border-blue-200"   };
  if (bmi < 25)   return { label: "Normal",          dot: "bg-green-400", badge: "text-green-700 bg-green-50 border-green-200" };
  if (bmi < 30)   return { label: "Sobrepeso",        dot: "bg-amber-400", badge: "text-amber-700 bg-amber-50 border-amber-200" };
  return              { label: "Obesidade",        dot: "bg-red-400",   badge: "text-red-700 bg-red-50 border-red-200"       };
};

const calcAge = (birthDate: string): number => {
  const today = new Date();
  const birth = new Date(birthDate + "T12:00:00");
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const formatDate = (dateStr: string) =>
  new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });

const initials = (name: string) =>
  name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

const fmt = (v?: number, unit = "cm") => v != null ? `${v} ${unit}` : null;

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, unit, icon }: {
  label: string; value: string; unit?: string; icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-card p-5 flex flex-col gap-3 shadow-sm print:p-2 print:gap-1">
      <div className="flex items-center justify-between print:hidden">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <span className="text-muted-foreground/40">{icon}</span>
      </div>
      <p className="hidden print:block text-[8px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
      <p className="text-3xl font-bold tabular-nums text-foreground leading-none print:text-lg print:leading-tight">
        {value}
        {unit && value !== "—" && (
          <span className="text-base font-normal text-muted-foreground ml-1.5 print:text-[9px] print:ml-0.5">{unit}</span>
        )}
      </p>
    </div>
  );
}

// linha simples: label + valor
function MeasureRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0 print:py-[3px]">
      <p className="text-[15px] text-muted-foreground print:text-[10px]">{label}</p>
      <p className="text-[15px] font-semibold text-foreground tabular-nums print:text-[10px]">{value}</p>
    </div>
  );
}

// linha bilateral: label | valor D · valor E
function BilateralRow({ label, right, left }: { label: string; right?: number; left?: number }) {
  if (right == null && left == null) return null;
  const diff = right != null && left != null ? Math.abs(right - left).toFixed(1) : null;
  const hasDiff = diff && parseFloat(diff) > 0;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0 print:py-[3px] print:gap-1.5">
      <p className="text-[15px] text-muted-foreground flex-1 print:text-[10px]">{label}</p>
      <div className="flex items-center gap-3 print:gap-1">
        <span className="text-[15px] font-semibold text-foreground tabular-nums w-16 text-right print:text-[10px] print:w-9">
          {right != null ? `${right} cm` : "—"}
        </span>
        <span className="text-xs text-muted-foreground/40 font-medium">·</span>
        <span className="text-[15px] font-semibold text-foreground tabular-nums w-16 text-left print:text-[10px] print:w-9">
          {left != null ? `${left} cm` : "—"}
        </span>
        {hasDiff && (
          <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full tabular-nums w-14 text-center print:text-[8px] print:px-1 print:w-10">
            Δ {diff}
          </span>
        )}
      </div>
    </div>
  );
}

// card de seção com título
function SectionCard({ title, children, className }: {
  title: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border/70 bg-card shadow-sm overflow-hidden", className)}>
      <div className="px-5 py-4 border-b border-border/60 print:px-3 print:py-1">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground print:text-[8px]">{title}</p>
      </div>
      <div className="px-5 py-1 print:px-2">{children}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminRelatorioAntropometrico() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading]           = useState(true);
  const [patient, setPatient]           = useState<Patient | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [selectedIdx, setSelectedIdx]   = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([fetchPatient(Number(id)), fetchMeasurements(Number(id))])
      .then(([p, m]) => { setPatient(p); setMeasurements(m); })
      .catch(() => toast.error("Erro ao carregar dados."))
      .finally(() => setLoading(false));
  }, [id]);

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
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center p-6">
        <Activity className="w-10 h-10 text-muted-foreground/30" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            {!patient ? "Paciente não encontrado" : "Nenhuma avaliação registrada"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {!patient ? "Verifique se o ID está correto." : "Registre uma avaliação antropométrica primeiro."}
          </p>
        </div>
        <Link to={`/admin/pacientes/${id}?tab=antropometria`}>
          <Button variant="outline" size="sm" className="rounded-lg mt-1">
            <ArrowLeft size={14} className="mr-1.5" /> Voltar ao prontuário
          </Button>
        </Link>
      </div>
    );
  }

  const m       = measurements[selectedIdx] ?? measurements[0];
  const bmi     = calcBMI(m.weight, m.height);
  const bmiInfo = bmi ? bmiStatus(parseFloat(bmi)) : null;

  // verifica se existem medidas em cada grupo
  const hasTronco   = [m.neck, m.shoulder, m.chest, m.waist, m.abdomen, m.hip].some(v => v != null);
  const hasSuperior = [m.arm_relax_r, m.arm_relax_l, m.arm_contract_r, m.arm_contract_l,
                       m.forearm_r, m.forearm_l, m.wrist_r, m.wrist_l].some(v => v != null);
  const hasInferior = [m.thigh_prox_r, m.thigh_prox_l, m.thigh_r, m.thigh_l,
                       m.calf_r, m.calf_l].some(v => v != null);

  return (
    <div className="min-h-screen bg-background p-6 space-y-6 print:min-h-0 print:p-0 print:space-y-2">

      {/* ── Cabeçalho apenas para impressão ────────────────────────────────── */}
      <div className="hidden print:block pb-2 mb-1 border-b-2 border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">Relatório Clínico</p>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Avaliação Antropométrica</h1>
            <p className="text-[10px] text-gray-600 mt-0.5">
              {patient.name} · {m.assessment_date ? formatDate(m.assessment_date) : "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold text-gray-800">Dr. Fillipe David</p>
            <p className="text-[9px] text-gray-500 mt-0.5">Nutricionista Clínico e Esportivo</p>
            <p className="text-[9px] text-gray-400 mt-1">
              Emitido em {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* ── Header (tela) ───────────────────────────────────────────────────── */}
      <div className="print-hide flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/admin/pacientes/${id}?tab=antropometria`}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Relatório Antropométrico</h1>
            <p className="text-[15px] text-muted-foreground mt-0.5">
              {patient.name} · avaliação de {m.assessment_date ? formatDate(m.assessment_date) : "—"}
            </p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="group relative inline-flex items-center gap-2.5 px-5 py-2.5 rounded-lg bg-foreground text-background text-sm font-semibold shadow-sm hover:bg-foreground/90 active:scale-[0.98] transition-all duration-150 shrink-0"
        >
          <FileDown size={16} className="transition-transform group-hover:-translate-y-0.5 duration-150" />
          Exportar PDF
        </button>
      </div>

      {/* ── Paciente ────────────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border/70 bg-card shadow-sm p-5 flex items-center gap-4 print:p-2 print:gap-2">
        <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0 print:w-7 print:h-7 print:text-[10px]">
          {patient.name ? initials(patient.name) : <User size={18} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-semibold text-foreground truncate print:text-sm">{patient.name || "—"}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5 print:gap-x-3">
            {patient.email     && <span className="text-sm text-muted-foreground print:text-[9px]">{patient.email}</span>}
            {patient.phone     && <span className="text-sm text-muted-foreground print:text-[9px]">{patient.phone}</span>}
            {patient.city      && <span className="text-sm text-muted-foreground print:text-[9px]">{patient.city}</span>}
            {patient.birth_date && <span className="text-sm text-muted-foreground print:text-[9px]">{calcAge(patient.birth_date)} anos</span>}
          </div>
        </div>
        <div className="shrink-0 text-right hidden sm:block print:block">
          <p className="text-sm text-muted-foreground print:text-[9px]">Data da avaliação</p>
          <p className="text-[15px] font-semibold text-foreground mt-0.5 print:text-[11px]">
            {m.assessment_date ? formatDate(m.assessment_date) : "—"}
          </p>
        </div>
      </div>

      {/* ── IMC destaque ────────────────────────────────────────────────────── */}
      {bmi && bmiInfo && (
        <div className="rounded-lg border border-border/70 bg-card shadow-sm p-5 flex items-center gap-5 print:p-2 print:gap-3">
          <div className="shrink-0">
            <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 print:text-[8px] print:mb-0.5">
              Índice de Massa Corporal
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold tabular-nums text-foreground print:text-2xl">{bmi}</span>
              <span className="text-base text-muted-foreground print:text-[9px]">kg/m²</span>
            </div>
          </div>
          <div className="w-px h-10 bg-border shrink-0" />
          <div>
            <div className="flex items-center gap-2 mb-1 print:mb-0">
              <span className={cn("w-2 h-2 rounded-full shrink-0", bmiInfo.dot)} />
              <span className={cn("text-sm font-semibold px-3 py-1 rounded-full border print:text-[9px] print:px-2 print:py-0.5", bmiInfo.badge)}>
                {bmiInfo.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground print:hidden">Calculado com base no peso e altura registrados.</p>
          </div>
        </div>
      )}

      {/* ── Métricas de composição ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 print:grid-cols-5 print:gap-1.5">
        <MetricCard label="Peso"             value={m.weight       != null ? String(m.weight)       : "—"} unit="kg" icon={<Scale size={15} />}   />
        <MetricCard label="Altura"           value={m.height       != null ? String(m.height)       : "—"} unit="cm" icon={<Ruler size={15} />}   />
        <MetricCard label="Gordura Corporal" value={m.body_fat     != null ? String(m.body_fat)     : "—"} unit="%"  icon={<Percent size={15} />} />
        <MetricCard label="Massa Magra"      value={m.lean_mass    != null ? String(m.lean_mass)    : "—"} unit="kg" icon={<Activity size={15} />}/>
        <MetricCard label="Gordura Visceral" value={m.visceral_fat != null ? String(m.visceral_fat) : "—"} icon={<Heart size={15} />}             />
      </div>

      {/* ── Medidas corporais: em print ficam lado a lado em 3 colunas ───────── */}
      <div className="space-y-4 print:space-y-0 print:flex print:flex-row print:gap-2">

        {hasTronco && (
          <SectionCard title="Tronco" className="print:flex-1">
            <MeasureRow label="Pescoço"  value={fmt(m.neck)}     />
            <MeasureRow label="Ombro"    value={fmt(m.shoulder)} />
            <MeasureRow label="Peitoral" value={fmt(m.chest)}    />
            <MeasureRow label="Cintura"  value={fmt(m.waist)}    />
            <MeasureRow label="Abdômen"  value={fmt(m.abdomen)}  />
            <MeasureRow label="Quadril"  value={fmt(m.hip)}      />
          </SectionCard>
        )}

        {(hasSuperior || hasInferior) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:contents">

            {hasSuperior && (
              <SectionCard title="Membros Superiores" className="print:flex-1">
                {/* legenda D / E */}
                <div className="flex items-center justify-end gap-3 pb-2 pt-1 border-b border-border/50 mb-0.5 print:hidden">
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                    <span className="w-2 h-2 rounded-full bg-primary/70" /> Direito
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40" /> Esquerdo
                  </span>
                </div>
                {/* legenda compacta apenas no print */}
                <div className="hidden print:flex items-center justify-end gap-2 pb-1 pt-0.5 border-b border-border/50 mb-0.5">
                  <span className="text-[8px] text-gray-500 font-semibold">D</span>
                  <span className="text-[8px] text-gray-400">·</span>
                  <span className="text-[8px] text-gray-500 font-semibold">E</span>
                </div>
                <BilateralRow label="Braço Relaxado"   right={m.arm_relax_r}    left={m.arm_relax_l}    />
                <BilateralRow label="Braço Contraído"  right={m.arm_contract_r} left={m.arm_contract_l} />
                <BilateralRow label="Antebraço"        right={m.forearm_r}      left={m.forearm_l}      />
                <BilateralRow label="Punho"            right={m.wrist_r}        left={m.wrist_l}        />
              </SectionCard>
            )}

            {hasInferior && (
              <SectionCard title="Membros Inferiores" className="print:flex-1">
                <div className="flex items-center justify-end gap-3 pb-2 pt-1 border-b border-border/50 mb-0.5 print:hidden">
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                    <span className="w-2 h-2 rounded-full bg-primary/70" /> Direito
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40" /> Esquerdo
                  </span>
                </div>
                <div className="hidden print:flex items-center justify-end gap-2 pb-1 pt-0.5 border-b border-border/50 mb-0.5">
                  <span className="text-[8px] text-gray-500 font-semibold">D</span>
                  <span className="text-[8px] text-gray-400">·</span>
                  <span className="text-[8px] text-gray-500 font-semibold">E</span>
                </div>
                <BilateralRow label="Coxa Proximal" right={m.thigh_prox_r} left={m.thigh_prox_l} />
                <BilateralRow label="Coxa Medial"   right={m.thigh_r}      left={m.thigh_l}      />
                <BilateralRow label="Panturrilha"   right={m.calf_r}       left={m.calf_l}       />
              </SectionCard>
            )}
          </div>
        )}
      </div>

      {/* ── Observações ──────────────────────────────────────────────────────── */}
      {m.notes && (
        <SectionCard title="Observações">
          <p className="py-3 text-sm text-foreground/80 leading-relaxed print:py-1 print:text-[10px]">{m.notes}</p>
        </SectionCard>
      )}

      {/* ── Histórico (apenas em tela) ───────────────────────────────────────── */}
      {measurements.length > 1 && (
        <div className="rounded-lg border border-border/70 bg-card shadow-sm overflow-hidden print:hidden">
          <div className="px-5 py-3.5 border-b border-border/60 flex items-center justify-between">
            <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
              Histórico de Avaliações
            </p>
            <span className="text-sm text-muted-foreground">
              {measurements.length} registro{measurements.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/20">
                  {["Data", "Peso", "Altura", "IMC", "Gordura", "Massa Magra"].map((col) => (
                    <th key={col} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {measurements.map((row, idx) => {
                  const mb         = calcBMI(row.weight, row.height);
                  const isSelected = idx === selectedIdx;
                  return (
                    <tr
                      key={row.id ?? idx}
                      onClick={() => setSelectedIdx(idx)}
                      className={cn(
                        "cursor-pointer transition-colors",
                        isSelected
                          ? "bg-primary/[0.06] hover:bg-primary/[0.08]"
                          : "hover:bg-muted/40"
                      )}
                    >
                      <td className="px-5 py-3.5 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          {row.assessment_date ? formatDate(row.assessment_date) : "—"}
                          {isSelected && (
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                              Exibindo
                            </span>
                          )}
                          {idx === 0 && !isSelected && (
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              Recente
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 tabular-nums">{row.weight   != null ? `${row.weight} kg`   : "—"}</td>
                      <td className="px-5 py-3.5 tabular-nums">{row.height   != null ? `${row.height} cm`   : "—"}</td>
                      <td className="px-5 py-3.5 tabular-nums">
                        {mb ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{mb}</span>
                            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full border", bmiStatus(parseFloat(mb)).badge)}>
                              {bmiStatus(parseFloat(mb)).label}
                            </span>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-3.5 tabular-nums">{row.body_fat  != null ? `${row.body_fat}%`  : "—"}</td>
                      <td className="px-5 py-3.5 tabular-nums">{row.lean_mass != null ? `${row.lean_mass} kg` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
