import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Printer, Activity, User } from "lucide-react";
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

const bmiStatus = (bmi: number): { label: string; cls: string } => {
  if (bmi < 18.5) return { label: "Abaixo do peso", cls: "bg-blue-50 text-blue-700 border-blue-200"   };
  if (bmi < 25)   return { label: "Normal",          cls: "bg-green-50 text-green-700 border-green-200" };
  if (bmi < 30)   return { label: "Sobrepeso",        cls: "bg-amber-50 text-amber-700 border-amber-200" };
  return              { label: "Obesidade",        cls: "bg-red-50 text-red-700 border-red-200"       };
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminRelatorioAntropometrico() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading]         = useState(true);
  const [patient, setPatient]         = useState<Patient | null>(null);
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
            {!patient
              ? "Verifique se o ID está correto."
              : "Registre uma avaliação antropométrica primeiro."}
          </p>
        </div>
        <Link to={`/admin/pacientes/${id}?tab=antropometria`}>
          <Button variant="outline" size="sm" className="rounded-md mt-1">
            <ArrowLeft size={14} className="mr-1.5" />
            Voltar ao prontuário
          </Button>
        </Link>
      </div>
    );
  }

  const latest   = measurements[0];
  const bmi      = calcBMI(latest.weight, latest.height);
  const bmiInfo  = bmi ? bmiStatus(parseFloat(bmi)) : null;

  const primaryMetrics = [
    { label: "Peso",             value: latest.weight       != null ? String(latest.weight)       : "—", unit: "kg" },
    { label: "Altura",           value: latest.height       != null ? String(latest.height)       : "—", unit: "cm" },
    { label: "Gordura Corporal", value: latest.body_fat     != null ? String(latest.body_fat)     : "—", unit: "%"  },
    { label: "Massa Magra",      value: latest.lean_mass    != null ? String(latest.lean_mass)    : "—", unit: "kg" },
    { label: "Gordura Visceral", value: latest.visceral_fat != null ? String(latest.visceral_fat) : "—", unit: ""   },
  ];

  const bodyMeasures = [
    { label: "Cintura", value: latest.waist != null ? `${latest.waist} cm` : null },
    { label: "Quadril", value: latest.hip   != null ? `${latest.hip} cm`   : null },
    { label: "Braço",   value: latest.arm   != null ? `${latest.arm} cm`   : null },
    { label: "Pescoço", value: latest.neck  != null ? `${latest.neck} cm`  : null },
  ].filter((m) => m.value !== null) as { label: string; value: string }[];

  return (
    <div className="min-h-screen bg-background p-6 space-y-0">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 pb-6">
        <div className="flex items-center gap-3">
          <Link
            to={`/admin/pacientes/${id}?tab=antropometria`}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 print:hidden"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Relatório Antropométrico
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {patient.name} · {latest.assessment_date ? formatDate(latest.assessment_date) : "—"}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="rounded-md gap-1.5 shrink-0 print:hidden"
          onClick={() => window.print()}
        >
          <Printer size={14} />
          Imprimir / PDF
        </Button>
      </div>

      {/* ── Patient strip ────────────────────────────────────────────────────── */}
      <div className="flex items-stretch gap-0 border border-border rounded-md overflow-hidden mb-6">
        <div className="flex items-center justify-center px-5 py-3.5 bg-card border-r border-border shrink-0">
          <div className="w-9 h-9 rounded bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
            {patient.name ? initials(patient.name) : <User size={16} />}
          </div>
        </div>
        {[
          { label: "Paciente",  value: patient.name || "—"                                                            },
          { label: "Cidade",    value: patient.city  || "—"                                                           },
          { label: "Idade",     value: patient.birth_date ? `${calcAge(patient.birth_date)} anos` : "—"              },
          { label: "Avaliação", value: latest.assessment_date ? formatDate(latest.assessment_date) : "—"             },
        ].map((s) => (
          <div key={s.label} className="flex-1 px-5 py-3.5 bg-card border-l border-border min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{s.value}</p>
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── IMC + primary metrics ─────────────────────────────────────────────── */}
      <div className="flex items-stretch gap-0 border border-border rounded-md overflow-hidden mb-6">
        {/* IMC — wider cell */}
        <div className="px-5 py-4 bg-card border-r border-border shrink-0 flex flex-col justify-center min-w-[148px]">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">IMC</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-2xl font-bold tabular-nums text-foreground leading-none">{bmi ?? "—"}</p>
            {bmi && <p className="text-xs text-muted-foreground">kg/m²</p>}
          </div>
          {bmiInfo && (
            <span className={cn(
              "mt-2 self-start inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border",
              bmiInfo.cls
            )}>
              {bmiInfo.label}
            </span>
          )}
        </div>

        {/* Other metrics */}
        {primaryMetrics.map((m) => (
          <div key={m.label} className="flex-1 px-5 py-4 bg-card border-l border-border min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{m.label}</p>
            <p className="text-xl font-bold tabular-nums text-foreground leading-none">
              {m.value}
              {m.unit && m.value !== "—" && (
                <span className="text-sm font-normal text-muted-foreground ml-1">{m.unit}</span>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* ── Body measurements + Notes ──────────────────────────────────────────── */}
      {(bodyMeasures.length > 0 || latest.notes) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

          {bodyMeasures.length > 0 && (
            <div className="border border-border rounded-md overflow-hidden bg-card">
              <div className="px-5 py-3 border-b border-border bg-muted/30">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Medidas Corporais
                </p>
              </div>
              <div>
                {bodyMeasures.map((m, idx) => (
                  <div
                    key={m.label}
                    className={cn(
                      "flex items-center justify-between px-5 py-3",
                      idx < bodyMeasures.length - 1 && "border-b border-border/60"
                    )}
                  >
                    <p className="text-sm text-muted-foreground">{m.label}</p>
                    <p className="text-sm font-semibold text-foreground tabular-nums">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {latest.notes && (
            <div className="border border-border rounded-md overflow-hidden bg-card">
              <div className="px-5 py-3 border-b border-border bg-muted/30">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Observações
                </p>
              </div>
              <p className="px-5 py-4 text-sm text-foreground/80 leading-relaxed">{latest.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Assessment history ────────────────────────────────────────────────── */}
      {measurements.length > 1 && (
        <div className="border border-border rounded-md overflow-hidden bg-card">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Histórico de Avaliações
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Data", "Peso", "Altura", "IMC", "Gordura", "Massa Magra"].map((col) => (
                    <th
                      key={col}
                      className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/20"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {measurements.map((m, idx) => {
                  const mb      = calcBMI(m.weight, m.height);
                  const isLatest = idx === 0;
                  return (
                    <tr
                      key={m.id ?? idx}
                      className={cn(
                        idx < measurements.length - 1 && "border-b border-border/60",
                        isLatest ? "bg-primary/[0.03]" : "hover:bg-muted/30 transition-colors"
                      )}
                    >
                      <td className="px-5 py-3 font-medium text-foreground">
                        {m.assessment_date ? formatDate(m.assessment_date) : "—"}
                        {isLatest && (
                          <span className="ml-2 text-[10px] font-semibold uppercase tracking-widest text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            Atual
                          </span>
                        )}
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
                              "text-[10px] font-semibold px-1.5 py-0.5 rounded border",
                              bmiStatus(parseFloat(mb)).cls
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

          {/* Footer count */}
          <div className="px-5 py-2.5 border-t border-border/60 bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {measurements.length} avaliação{measurements.length !== 1 ? "ões" : ""} registrada{measurements.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
