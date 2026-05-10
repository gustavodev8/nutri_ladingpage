import { useState, useEffect } from "react";
import { Copy, Loader2, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  calcBodyFat,
  classifyBodyFat,
  sumSkinfolds,
  PROTOCOLS,
  SKINFOLD_LABELS,
  type SkinfoldProtocol,
} from "@/lib/anthropometryUtils";
import type { Measurement, Patient } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MeasurementForm = {
  assessment_date: string;
  weight?: string; height?: string; visceral_fat?: string;
  body_fat?: string; lean_mass?: string;
  sf_pectoral?: string; sf_midaxillary?: string; sf_triceps?: string;
  sf_biceps?: string; sf_subscapular?: string; sf_suprailiac?: string;
  sf_abdominal?: string; sf_thigh_sf?: string; sf_calf_sf?: string;
  neck?: string; shoulder?: string; chest?: string;
  waist?: string; abdomen?: string; hip?: string;
  arm_relax_r?: string; arm_relax_l?: string;
  arm_contract_r?: string; arm_contract_l?: string;
  forearm_r?: string; forearm_l?: string;
  wrist_r?: string; wrist_l?: string;
  thigh_prox_r?: string; thigh_prox_l?: string;
  thigh_r?: string; thigh_l?: string;
  calf_r?: string; calf_l?: string;
  notes?: string;
};

// ─── Primitives ───────────────────────────────────────────────────────────────

function NI({
  label, field, form, setField, placeholder, highlight,
}: {
  label: string; field: string; form: MeasurementForm;
  setField: (f: string, v: string) => void; placeholder?: string; highlight?: boolean;
}) {
  const val = (form as Record<string, string>)[field] ?? "";
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      <Input
        type="number" step="0.1" placeholder={placeholder ?? "—"}
        value={val}
        onChange={(e) => setField(field, e.target.value)}
        className={cn(
          "h-9 text-sm",
          highlight && val ? "border-primary/50 bg-primary/5" : ""
        )}
      />
    </div>
  );
}

function Section({
  title, subtitle, children, className,
}: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("bg-card border border-border/70 rounded-2xl overflow-hidden", className)}>
      <div className="px-6 py-4 border-b border-border/50 bg-muted/30">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function ReadOnly({ label, value, accent }: { label: string; value: string | null; accent?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      <div className={cn(
        "h-9 px-3 flex items-center rounded-md border text-sm tabular-nums font-semibold",
        accent && value
          ? "bg-primary/10 border-primary/30 text-primary"
          : value
            ? "bg-muted/50 text-foreground border-border"
            : "bg-muted/20 text-muted-foreground border-border/50"
      )}>
        {value ?? "—"}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayISO = () => new Date().toISOString().split("T")[0];

function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function measurementToForm(m: Measurement): MeasurementForm {
  const s = (v?: number) => (v != null ? String(v) : "");
  return {
    assessment_date: m.assessment_date,
    weight: s(m.weight), height: s(m.height), visceral_fat: s(m.visceral_fat),
    body_fat: s(m.body_fat), lean_mass: s(m.lean_mass),
    sf_pectoral: s(m.sf_pectoral), sf_midaxillary: s(m.sf_midaxillary),
    sf_triceps: s(m.sf_triceps), sf_biceps: s(m.sf_biceps),
    sf_subscapular: s(m.sf_subscapular), sf_suprailiac: s(m.sf_suprailiac),
    sf_abdominal: s(m.sf_abdominal), sf_thigh_sf: s(m.sf_thigh_sf),
    sf_calf_sf: s(m.sf_calf_sf),
    neck: s(m.neck), shoulder: s(m.shoulder), chest: s(m.chest),
    waist: s(m.waist), abdomen: s(m.abdomen), hip: s(m.hip),
    arm_relax_r: s(m.arm_relax_r), arm_relax_l: s(m.arm_relax_l),
    arm_contract_r: s(m.arm_contract_r), arm_contract_l: s(m.arm_contract_l),
    forearm_r: s(m.forearm_r), forearm_l: s(m.forearm_l),
    wrist_r: s(m.wrist_r), wrist_l: s(m.wrist_l),
    thigh_prox_r: s(m.thigh_prox_r), thigh_prox_l: s(m.thigh_prox_l),
    thigh_r: s(m.thigh_r), thigh_l: s(m.thigh_l),
    calf_r: s(m.calf_r), calf_l: s(m.calf_l),
    notes: m.notes ?? "",
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AnthropometryWizardProps {
  patient: Patient;
  latestMeasurement?: Measurement | null;
  editingMeasurement?: Measurement | null;
  onSave: (
    form: MeasurementForm,
    compMode: "bio" | "skinfold",
    protocol: SkinfoldProtocol,
    editingId?: number,
  ) => Promise<void>;
  onCancelEdit?: () => void;
  saving: boolean;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AnthropometryWizard({
  patient,
  latestMeasurement,
  editingMeasurement,
  onSave,
  onCancelEdit,
  saving,
}: AnthropometryWizardProps) {
  const [form, setFormState] = useState<MeasurementForm>({ assessment_date: todayISO() });
  const [compMode, setCompMode] = useState<"bio" | "skinfold">("bio");
  const [protocol, setProtocol] = useState<SkinfoldProtocol>("JP3M");

  useEffect(() => {
    if (editingMeasurement) {
      setFormState(measurementToForm(editingMeasurement));
      if (editingMeasurement.sf_protocol) {
        setProtocol(editingMeasurement.sf_protocol as SkinfoldProtocol);
        setCompMode("skinfold");
      } else {
        setCompMode("bio");
      }
    } else {
      setFormState({ assessment_date: todayISO() });
      setCompMode("bio");
      setProtocol("JP3M");
    }
  }, [editingMeasurement]);

  const setField = (field: string, value: string) =>
    setFormState((p) => ({ ...p, [field]: value }));

  const handleClone = () => {
    if (!latestMeasurement) return;
    setFormState({ ...measurementToForm(latestMeasurement), assessment_date: todayISO() });
    if (latestMeasurement.sf_protocol) {
      setProtocol(latestMeasurement.sf_protocol as SkinfoldProtocol);
      setCompMode("skinfold");
    } else {
      setCompMode("bio");
    }
  };

  // ── Live calc ──
  const sfValues = {
    sf_pectoral:    form.sf_pectoral    ? parseFloat(form.sf_pectoral)    : undefined,
    sf_midaxillary: form.sf_midaxillary ? parseFloat(form.sf_midaxillary) : undefined,
    sf_triceps:     form.sf_triceps     ? parseFloat(form.sf_triceps)     : undefined,
    sf_biceps:      form.sf_biceps      ? parseFloat(form.sf_biceps)      : undefined,
    sf_subscapular: form.sf_subscapular ? parseFloat(form.sf_subscapular) : undefined,
    sf_suprailiac:  form.sf_suprailiac  ? parseFloat(form.sf_suprailiac)  : undefined,
    sf_abdominal:   form.sf_abdominal   ? parseFloat(form.sf_abdominal)   : undefined,
    sf_thigh_sf:    form.sf_thigh_sf    ? parseFloat(form.sf_thigh_sf)    : undefined,
    sf_calf_sf:     form.sf_calf_sf     ? parseFloat(form.sf_calf_sf)     : undefined,
  };
  const patientAge = patient.birth_date
    ? Math.floor((Date.now() - new Date(patient.birth_date).getTime()) / 31_557_600_000)
    : 25;
  const genderKey   = patient.gender === "F" ? "F" : "M";
  const calcResult  = compMode === "skinfold"
    ? calcBodyFat(protocol, sfValues, patientAge, genderKey) : null;
  const protocolInfo = PROTOCOLS.find((p) => p.id === protocol);
  const sfSum        = compMode === "skinfold" ? sumSkinfolds(protocol, sfValues) : 0;
  const fatClass     = calcResult ? classifyBodyFat(calcResult.fatPct, genderKey) : null;

  const bioFatPct   = compMode === "bio" && form.body_fat ? parseFloat(form.body_fat) : null;
  const bioWeight   = form.weight ? parseFloat(form.weight) : null;
  const bioFatKg    = bioFatPct != null && bioWeight != null
    ? parseFloat((bioWeight * bioFatPct / 100).toFixed(2)) : null;
  const bioLeanKg   = bioFatKg != null && bioWeight != null
    ? parseFloat((bioWeight - bioFatKg).toFixed(2)) : null;
  const bioFatClass = bioFatPct != null ? classifyBodyFat(bioFatPct, genderKey) : null;

  const handleSave = async () => {
    await onSave(form, compMode, protocol, editingMeasurement?.id);
    if (!editingMeasurement) {
      setFormState({ assessment_date: todayISO() });
      setCompMode("bio");
      setProtocol("JP3M");
    }
  };

  const isEditing = !!editingMeasurement;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 space-y-3">

      {/* ── Sticky action bar ── */}
      <div className={cn(
        "sticky top-0 z-20 -mx-4 px-4 py-3 flex items-center justify-between gap-3 flex-wrap border-b backdrop-blur-md",
        isEditing
          ? "bg-amber-50/95 border-amber-200"
          : "bg-background/95 border-border/60"
      )}>
        <div className="flex items-center gap-3 min-w-0">
          {isEditing ? (
            <span className="flex items-center gap-2 text-sm font-bold text-amber-700 truncate">
              <Pencil size={14} />
              Editando — {fmtDate(editingMeasurement!.assessment_date)}
            </span>
          ) : (
            <h2 className="text-sm font-bold text-foreground">Nova Avaliação Antropométrica</h2>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {!isEditing && latestMeasurement && (
            <Button type="button" variant="outline" size="sm" onClick={handleClone}
              className="gap-1.5 h-8 text-xs font-medium">
              <Copy size={12} /> Copiar última avaliação
            </Button>
          )}
          <Input
            type="date" value={form.assessment_date}
            onChange={(e) => setField("assessment_date", e.target.value)}
            className="h-8 text-sm w-36"
          />
          {isEditing && onCancelEdit && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancelEdit}
              className="h-8 gap-1 text-xs">
              <X size={12} /> Cancelar
            </Button>
          )}
          <Button
            type="button" size="sm" onClick={handleSave} disabled={saving}
            className={cn(
              "h-8 px-5 gap-1.5 font-semibold",
              isEditing ? "bg-amber-600 hover:bg-amber-700 text-white" : ""
            )}
          >
            {saving
              ? <><Loader2 size={12} className="animate-spin" /> Salvando…</>
              : <><Save size={12} /> {isEditing ? "Atualizar" : "Salvar Avaliação"}</>
            }
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          Seções empilhadas verticalmente, inputs em grid interno
         ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-6 pb-10">

        {/* ── 1. Dados Básicos ── */}
        <Section title="Dados Básicos" subtitle="Medidas gerais do paciente">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <NI label="Peso (kg)"    field="weight"       form={form} setField={setField} placeholder="70.5" />
            <NI label="Altura (cm)"  field="height"       form={form} setField={setField} placeholder="175"  />
            <NI label="Gordura Visc." field="visceral_fat" form={form} setField={setField} placeholder="8"   />
          </div>
        </Section>

        {/* ── 2. Composição Corporal ── */}
        <Section title="Composição Corporal" subtitle="Bioimpedância ou adipômetro">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Left: método + protocolo + dobras */}
            <div className="space-y-5">
              {/* Toggle */}
              <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg w-fit">
                {(["bio", "skinfold"] as const).map((mode) => (
                  <button key={mode} type="button" onClick={() => setCompMode(mode)}
                    className={cn(
                      "px-4 h-8 rounded-md text-sm font-semibold transition-all",
                      compMode === mode
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}>
                    {mode === "bio" ? "Bioimpedância" : "Adipômetro"}
                  </button>
                ))}
              </div>

              {compMode === "bio" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <NI label="% Gordura" field="body_fat" form={form} setField={setField} placeholder="18.5" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Protocol chips */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Protocolo</p>
                    <div className="flex flex-wrap gap-2">
                      {PROTOCOLS.map((p) => (
                        <button key={p.id} type="button" onClick={() => setProtocol(p.id)}
                          className={cn(
                            "px-3 h-8 rounded-lg text-xs font-semibold border transition-all",
                            protocol === p.id
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                          )}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                    {protocolInfo && (
                      <p className="text-xs text-muted-foreground">
                        Dobras: <span className="font-semibold text-foreground">{protocolInfo.description}</span>
                      </p>
                    )}
                  </div>

                  {/* Skinfold inputs */}
                  {protocolInfo && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {protocolInfo.skinfolds.map((key) => (
                        <NI
                          key={key}
                          label={SKINFOLD_LABELS[key]}
                          field={key}
                          form={form}
                          setField={setField}
                          placeholder="mm"
                          highlight
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: resultado em destaque */}
            <div className={cn(
              "rounded-2xl border p-6 flex flex-col justify-center transition-all duration-300",
              (calcResult || (bioFatPct != null))
                ? "border-primary/30 bg-primary/5"
                : "border-dashed border-border/60 bg-muted/20"
            )}>
              {compMode === "bio" && bioFatPct != null ? (
                <div className="space-y-4">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Composição calculada
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className={cn("text-4xl font-black tabular-nums leading-none", bioFatClass?.color)}>
                        {bioFatPct.toFixed(1)}<span className="text-xl">%</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Gordura</p>
                    </div>
                    <div>
                      <p className="text-4xl font-black tabular-nums leading-none text-foreground">
                        {bioFatKg ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Massa gorda (kg)</p>
                    </div>
                    <div>
                      <p className="text-4xl font-black tabular-nums leading-none text-foreground">
                        {bioLeanKg ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Massa magra (kg)</p>
                    </div>
                  </div>
                  {bioFatClass && (
                    <span className={cn(
                      "inline-block text-xs font-bold px-3 py-1 rounded-full border",
                      bioFatClass.color, "bg-background border-current/20"
                    )}>
                      {bioFatClass.label}
                    </span>
                  )}
                </div>
              ) : compMode === "skinfold" && calcResult ? (
                <div className="space-y-4">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Resultado calculado
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className={cn("text-4xl font-black tabular-nums leading-none", fatClass?.color)}>
                        {calcResult.fatPct.toFixed(1)}<span className="text-xl">%</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Gordura corporal</p>
                    </div>
                    {bioWeight && (
                      <div>
                        <p className="text-4xl font-black tabular-nums leading-none text-foreground">
                          {(bioWeight * (1 - calcResult.fatPct / 100)).toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Massa magra (kg)</p>
                      </div>
                    )}
                  </div>
                  {fatClass && (
                    <span className={cn(
                      "inline-block text-xs font-bold px-3 py-1 rounded-full border",
                      fatClass.color, "bg-background border-current/20"
                    )}>
                      {fatClass.label}
                    </span>
                  )}
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border/40">
                    {calcResult.density > 0 && <>DC: {calcResult.density.toFixed(4)} g/mL &nbsp;·&nbsp;</>}
                    Σ {sfSum.toFixed(1)} mm &nbsp;·&nbsp; {protocol}
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm font-medium text-muted-foreground/60">
                    {compMode === "bio"
                      ? "Informe o % de gordura para calcular a composição"
                      : "Preencha as dobras do protocolo para ver o resultado"
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* ── 3. Tronco ── */}
        <Section title="Circunferências — Tronco" subtitle="Em centímetros (cm)">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <NI label="Pescoço"  field="neck"     form={form} setField={setField} />
            <NI label="Ombro"    field="shoulder" form={form} setField={setField} />
            <NI label="Peitoral" field="chest"    form={form} setField={setField} />
            <NI label="Cintura"  field="waist"    form={form} setField={setField} />
            <NI label="Abdômen"  field="abdomen"  form={form} setField={setField} />
            <NI label="Quadril"  field="hip"      form={form} setField={setField} />
          </div>
        </Section>

        {/* ── 4. Membros Superiores ── */}
        <Section title="Circunferências — Membros Superiores" subtitle="Direito (D) e Esquerdo (E), em centímetros">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <NI label="Braço Rel. D"  field="arm_relax_r"    form={form} setField={setField} />
            <NI label="Braço Rel. E"  field="arm_relax_l"    form={form} setField={setField} />
            <NI label="Braço Con. D"  field="arm_contract_r" form={form} setField={setField} />
            <NI label="Braço Con. E"  field="arm_contract_l" form={form} setField={setField} />
            <NI label="Antebraço D"   field="forearm_r"      form={form} setField={setField} />
            <NI label="Antebraço E"   field="forearm_l"      form={form} setField={setField} />
            <NI label="Punho D"       field="wrist_r"        form={form} setField={setField} />
            <NI label="Punho E"       field="wrist_l"        form={form} setField={setField} />
          </div>
        </Section>

        {/* ── 5. Membros Inferiores ── */}
        <Section title="Circunferências — Membros Inferiores" subtitle="Direito (D) e Esquerdo (E), em centímetros">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <NI label="Coxa Prox. D" field="thigh_prox_r" form={form} setField={setField} />
            <NI label="Coxa Prox. E" field="thigh_prox_l" form={form} setField={setField} />
            <NI label="Coxa Med. D"  field="thigh_r"      form={form} setField={setField} />
            <NI label="Coxa Med. E"  field="thigh_l"      form={form} setField={setField} />
            <NI label="Panturrilha D" field="calf_r"      form={form} setField={setField} />
            <NI label="Panturrilha E" field="calf_l"      form={form} setField={setField} />
          </div>
        </Section>

        {/* ── 6. Observações ── */}
        <Section title="Observações" subtitle="Parecer técnico ou anotações da avaliação">
          <Input
            value={(form as Record<string, string>).notes ?? ""}
            onChange={(e) => setField("notes", e.target.value)}
            placeholder="Ex: Paciente em processo de emagrecimento, boa hidratação…"
            className="h-10 text-sm"
          />
        </Section>

      </div>
    </div>
  );
}
