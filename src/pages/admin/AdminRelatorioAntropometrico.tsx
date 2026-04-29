import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Printer, Activity, User, Scale, Percent, Ruler, Heart } from "lucide-react";
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
  if (bmi < 18.5) return { label: "Abaixo do peso", dot: "bg-blue-400",   badge: "text-blue-700 bg-blue-50 border-blue-200"   };
  if (bmi < 25)   return { label: "Normal",          dot: "bg-green-400",  badge: "text-green-700 bg-green-50 border-green-200" };
  if (bmi < 30)   return { label: "Sobrepeso",        dot: "bg-amber-400",  badge: "text-amber-700 bg-amber-50 border-amber-200" };
  return              { label: "Obesidade",        dot: "bg-red-400",    badge: "text-red-700 bg-red-50 border-red-200"       };
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

// ─── Metric card ─────────────────────────────────────────────────────────────

function MetricCard({
  label, value, unit, icon, highlight = false,
}: {
  label: string;
  value: string;
  unit?: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-lg border border-border/70 bg-card p-4 flex flex-col gap-3 shadow-sm",
      highlight && "border-primary/20 bg-primary/[0.02]"
    )}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <span className="text-muted-foreground/50">{icon}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums text-foreground leading-none">
        {value}
        {unit && value !== "—" && (
          <span className="text-sm font-normal text-muted-foreground ml-1.5">{unit}</span>
        )}
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminRelatorioAntropometrico() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading]           = useState(true);
  const [patient, setPatient]           = useState<Patient | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);

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

  const latest  = measurements[0];
  const bmi     = calcBMI(latest.weight, latest.height);
  const bmiInfo = bmi ? bmiStatus(parseFloat(bmi)) : null;

  const bodyMeasures = [
    { label: "Cintura",  value: latest.waist != null ? `${latest.waist} cm` : null },
    { label: "Quadril",  value: latest.hip   != null ? `${latest.hip} cm`   : null },
    { label: "Braço",    value: latest.arm   != null ? `${latest.arm} cm`   : null },
    { label: "Pescoço",  value: latest.neck  != null ? `${latest.neck} cm`  : null },
  ].filter((m) => m.value !== null) as { label: string; value: string }[];

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/admin/pacientes/${id}?tab=antropometria`}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Relatório Antropométrico</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {patient.name} · avaliação de {latest.assessment_date ? formatDate(latest.assessment_date) : "—"}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="rounded-lg gap-2 shrink-0"
          onClick={() => window.print()}
        >
          <Printer size={14} />
          Imprimir / PDF
        </Button>
      </div>

      {/* ── Patient card ────────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border/70 bg-card shadow-sm p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
          {patient.name ? initials(patient.name) : <User size={18} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-foreground truncate">{patient.name || "—"}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
            {patient.email    && <span className="text-xs text-muted-foreground">{patient.email}</span>}
            {patient.phone    && <span className="text-xs text-muted-foreground">{patient.phone}</span>}
            {patient.city     && <span className="text-xs text-muted-foreground">{patient.city}</span>}
            {patient.birth_date && <span className="text-xs text-muted-foreground">{calcAge(patient.birth_date)} anos</span>}
          </div>
        </div>
        <div className="shrink-0 text-right hidden sm:block">
          <p className="text-xs text-muted-foreground">Data da avaliação</p>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            {latest.assessment_date ? formatDate(latest.assessment_date) : "—"}
          </p>
        </div>
      </div>

      {/* ── IMC destaque ────────────────────────────────────────────────────── */}
      {bmi && bmiInfo && (
        <div className="rounded-lg border border-border/70 bg-card shadow-sm p-5 flex items-center gap-5">
          <div className="shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Índice de Massa Corporal
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tabular-nums text-foreground">{bmi}</span>
              <span className="text-sm text-muted-foreground">kg/m²</span>
            </div>
          </div>
          <div className="w-px h-10 bg-border shrink-0" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("w-2 h-2 rounded-full shrink-0", bmiInfo.dot)} />
              <span className={cn(
                "text-xs font-semibold px-2.5 py-1 rounded-full border",
                bmiInfo.badge
              )}>
                {bmiInfo.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Calculado com base no peso e altura registrados.
            </p>
          </div>
        </div>
      )}

      {/* ── Metrics grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard
          label="Peso"
          value={latest.weight != null ? String(latest.weight) : "—"}
          unit="kg"
          icon={<Scale size={15} />}
        />
        <MetricCard
          label="Altura"
          value={latest.height != null ? String(latest.height) : "—"}
          unit="cm"
          icon={<Ruler size={15} />}
        />
        <MetricCard
          label="Gordura Corporal"
          value={latest.body_fat != null ? String(latest.body_fat) : "—"}
          unit="%"
          icon={<Percent size={15} />}
        />
        <MetricCard
          label="Massa Magra"
          value={latest.lean_mass != null ? String(latest.lean_mass) : "—"}
          unit="kg"
          icon={<Activity size={15} />}
        />
        <MetricCard
          label="Gordura Visceral"
          value={latest.visceral_fat != null ? String(latest.visceral_fat) : "—"}
          icon={<Heart size={15} />}
        />
      </div>

      {/* ── Medidas + Observações ─────────────────────────────────────────────── */}
      {(bodyMeasures.length > 0 || latest.notes) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {bodyMeasures.length > 0 && (
            <div className="rounded-lg border border-border/70 bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/60">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Medidas Corporais
                </p>
              </div>
              <div className="divide-y divide-border/60">
                {bodyMeasures.map((m) => (
                  <div key={m.label} className="flex items-center justify-between px-5 py-3">
                    <p className="text-sm text-muted-foreground">{m.label}</p>
                    <p className="text-sm font-semibold text-foreground tabular-nums">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {latest.notes && (
            <div className="rounded-lg border border-border/70 bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/60">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Observações
                </p>
              </div>
              <p className="px-5 py-4 text-sm text-foreground/80 leading-relaxed">{latest.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Histórico ───────────────────────────────────────────────────────── */}
      {measurements.length > 1 && (
        <div className="rounded-lg border border-border/70 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border/60 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Histórico de Avaliações
            </p>
            <span className="text-xs text-muted-foreground">
              {measurements.length} registro{measurements.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/20">
                  {["Data", "Peso", "Altura", "IMC", "Gordura", "Massa Magra"].map((col) => (
                    <th key={col} className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {measurements.map((m, idx) => {
                  const mb       = calcBMI(m.weight, m.height);
                  const isLatest = idx === 0;
                  return (
                    <tr
                      key={m.id ?? idx}
                      className={cn(isLatest ? "bg-primary/[0.025]" : "hover:bg-muted/30 transition-colors")}
                    >
                      <td className="px-5 py-3 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          {m.assessment_date ? formatDate(m.assessment_date) : "—"}
                          {isLatest && (
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                              Atual
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-foreground tabular-nums">
                        {m.weight != null ? `${m.weight} kg` : "—"}
                      </td>
                      <td className="px-5 py-3 text-foreground tabular-nums">
                        {m.height != null ? `${m.height} cm` : "—"}
                      </td>
                      <td className="px-5 py-3 tabular-nums">
                        {mb ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{mb}</span>
                            <span className={cn(
                              "text-[10px] font-semibold px-1.5 py-0.5 rounded-full border",
                              bmiStatus(parseFloat(mb)).badge
                            )}>
                              {bmiStatus(parseFloat(mb)).label}
                            </span>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-3 text-foreground tabular-nums">
                        {m.body_fat != null ? `${m.body_fat}%` : "—"}
                      </td>
                      <td className="px-5 py-3 text-foreground tabular-nums">
                        {m.lean_mass != null ? `${m.lean_mass} kg` : "—"}
                      </td>
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
