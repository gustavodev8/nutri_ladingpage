import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2, Save } from "lucide-react";
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
  // Dobras
  sf_pectoral?: string; sf_midaxillary?: string; sf_triceps?: string;
  sf_biceps?: string; sf_subscapular?: string; sf_suprailiac?: string;
  sf_abdominal?: string; sf_thigh_sf?: string; sf_calf_sf?: string;
  // Circunferências — tronco
  neck?: string; shoulder?: string; chest?: string;
  waist?: string; abdomen?: string; hip?: string;
  // Membros superiores
  arm_relax_r?: string; arm_relax_l?: string;
  arm_contract_r?: string; arm_contract_l?: string;
  forearm_r?: string; forearm_l?: string;
  wrist_r?: string; wrist_l?: string;
  // Membros inferiores
  thigh_prox_r?: string; thigh_prox_l?: string;
  thigh_r?: string; thigh_l?: string;
  calf_r?: string; calf_l?: string;
  notes?: string;
};

// ─── Step metadata ─────────────────────────────────────────────────────────────

const STEPS = [
  { number: 1, label: "Dados Básicos"      },
  { number: 2, label: "Comp. Corporal"     },
  { number: 3, label: "Perímetros"         },
] as const;

// ─── Small primitives (defined outside to avoid re-renders) ───────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
      {children}
    </Label>
  );
}

function NumInput({ label, field, form, setField, placeholder }: {
  label: string; field: string; form: MeasurementForm;
  setField: (f: string, v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      <Input
        type="number" step="0.1" placeholder={placeholder ?? "—"}
        value={(form as Record<string, string>)[field] ?? ""}
        onChange={(e) => setField(field, e.target.value)}
        className="h-9 rounded-md text-sm"
      />
    </div>
  );
}

function BilateralInput({ label, fieldR, fieldL, form, setField }: {
  label: string; fieldR: string; fieldL: string;
  form: MeasurementForm; setField: (f: string, v: string) => void;
}) {
  const val = (f: string) => (form as Record<string, string>)[f] ?? "";
  return (
    <>
      <div className="space-y-1.5">
        <FieldLabel>{label} D</FieldLabel>
        <Input type="number" step="0.1" value={val(fieldR)}
          onChange={(e) => setField(fieldR, e.target.value)} className="h-9 rounded-md text-sm" />
      </div>
      <div className="space-y-1.5">
        <FieldLabel>{label} E</FieldLabel>
        <Input type="number" step="0.1" value={val(fieldL)}
          onChange={(e) => setField(fieldL, e.target.value)} className="h-9 rounded-md text-sm" />
      </div>
    </>
  );
}

// ─── Stepper indicator ─────────────────────────────────────────────────────────

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 px-2 py-4">
      {STEPS.map((step, i) => {
        const done    = step.number < current;
        const active  = step.number === current;
        return (
          <div key={step.number} className="flex items-center">
            {/* Circle */}
            <div className="flex flex-col items-center gap-1.5">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-200",
                done   ? "bg-primary border-primary text-primary-foreground"
                : active ? "bg-primary/10 border-primary text-primary"
                         : "bg-muted border-border text-muted-foreground"
              )}>
                {done ? <Check size={13} strokeWidth={3} /> : step.number}
              </div>
              <span className={cn(
                "text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap transition-colors",
                active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div className={cn(
                "h-0.5 w-16 sm:w-24 mx-2 mb-5 rounded-full transition-all duration-300",
                done ? "bg-primary" : "bg-border"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Dados Básicos ─────────────────────────────────────────────────────

function Step1({ form, setField }: { form: MeasurementForm; setField: (f: string, v: string) => void }) {
  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Medidas obrigatórias para iniciar a avaliação
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <NumInput label="Peso (kg)"   field="weight"       form={form} setField={setField} placeholder="70.5" />
        <NumInput label="Altura (cm)" field="height"       form={form} setField={setField} placeholder="175"  />
        <NumInput label="G. Visceral" field="visceral_fat" form={form} setField={setField} placeholder="8"    />
      </div>
    </div>
  );
}

// ─── Step 2: Composição Corporal ───────────────────────────────────────────────

function Step2({
  form, setField, compMode, setCompMode, protocol, setProtocol, patient,
}: {
  form: MeasurementForm;
  setField: (f: string, v: string) => void;
  compMode: "bio" | "skinfold";
  setCompMode: (m: "bio" | "skinfold") => void;
  protocol: SkinfoldProtocol;
  setProtocol: (p: SkinfoldProtocol) => void;
  patient: Patient;
}) {
  const patientAge = patient.birth_date
    ? Math.floor((Date.now() - new Date(patient.birth_date).getTime()) / 31_557_600_000)
    : 25;

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

  const calcResult     = compMode === "skinfold" ? calcBodyFat(protocol, sfValues, patientAge) : null;
  const protocolInfo   = PROTOCOLS.find(p => p.id === protocol);
  const sfSum          = compMode === "skinfold" ? sumSkinfolds(protocol, sfValues) : 0;
  const fatClass       = calcResult ? classifyBodyFat(calcResult.fatPct, patient.gender === "F" ? "F" : "M") : null;

  const bioFatPct = compMode === "bio" && form.body_fat ? parseFloat(form.body_fat) : null;
  const bioWeight = form.weight ? parseFloat(form.weight) : null;
  const bioFatKg  = bioFatPct != null && bioWeight != null
    ? parseFloat((bioWeight * bioFatPct / 100).toFixed(2)) : null;
  const bioLeanKg = bioFatKg != null && bioWeight != null
    ? parseFloat((bioWeight - bioFatKg).toFixed(2)) : null;
  const bioFatClass = bioFatPct != null
    ? classifyBodyFat(bioFatPct, patient.gender === "F" ? "F" : "M") : null;

  const ReadOnly = ({ label, value }: { label: string; value: string | null }) => (
    <div className="space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      <div className={cn(
        "h-9 px-3 flex items-center rounded-md border text-sm tabular-nums",
        value != null ? "bg-muted/50 text-foreground" : "bg-muted/30 text-muted-foreground"
      )}>
        {value ?? "—"}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Método de avaliação
        </p>
        <div className="flex items-center bg-muted rounded-md p-0.5">
          {(["bio", "skinfold"] as const).map((mode) => (
            <button key={mode} type="button" onClick={() => setCompMode(mode)}
              className={cn(
                "px-3 h-7 rounded text-xs font-medium transition-all",
                compMode === mode
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mode === "bio" ? "Bioimpedância" : "Adipômetro"}
            </button>
          ))}
        </div>
      </div>

      {compMode === "bio" ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <NumInput label="% Gordura" field="body_fat" form={form} setField={setField} placeholder="18.5" />
            <ReadOnly label="Massa Gorda (kg)" value={bioFatKg != null ? `${bioFatKg} kg` : null} />
            <ReadOnly label="Massa Magra (kg)" value={bioLeanKg != null ? `${bioLeanKg} kg` : null} />
          </div>
          {bioFatClass && bioFatPct != null && (
            <p className={cn("text-xs font-semibold", bioFatClass.color)}>
              {bioFatPct.toFixed(1)}% — {bioFatClass.label}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Seletor de protocolo */}
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {PROTOCOLS
                .filter(p => patient.gender ? p.gender === (patient.gender === "F" ? "F" : "M") : true)
                .map(p => (
                  <button key={p.id} type="button" onClick={() => setProtocol(p.id)}
                    className={cn(
                      "px-3 h-8 rounded-md text-xs font-medium border transition-all",
                      protocol === p.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
            </div>
            {protocolInfo && (
              <p className="text-xs text-muted-foreground">
                Dobras: <span className="font-medium text-foreground">{protocolInfo.description}</span>
              </p>
            )}
          </div>

          {/* Inputs das dobras */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {protocolInfo?.skinfolds.map(key => (
              <div key={key} className="space-y-1.5">
                <FieldLabel>{SKINFOLD_LABELS[key]}</FieldLabel>
                <Input
                  type="number" step="0.1" min="0" placeholder="mm"
                  value={(form as Record<string, string>)[key] ?? ""}
                  onChange={e => setField(key, e.target.value)}
                  className={cn(
                    "h-9 rounded-md text-sm",
                    (form as Record<string, string>)[key] ? "border-primary/50" : ""
                  )}
                />
              </div>
            ))}
          </div>

          {/* Resultado em tempo real */}
          <div className={cn(
            "rounded-lg border p-4 transition-all",
            calcResult ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"
          )}>
            {calcResult ? (
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                    Resultado calculado
                  </p>
                  <div className="flex items-end gap-3 flex-wrap">
                    <div>
                      <p className={cn("text-3xl font-bold tabular-nums", fatClass?.color)}>
                        {calcResult.fatPct.toFixed(1)}<span className="text-lg">%</span>
                      </p>
                      <p className="text-xs text-muted-foreground">Gordura corporal</p>
                    </div>
                    <div className="pb-1">
                      <p className={cn("text-sm font-semibold", fatClass?.color)}>{fatClass?.label}</p>
                      <p className="text-xs text-muted-foreground">
                        DC: {calcResult.density.toFixed(4)} g/mL &nbsp;·&nbsp; Σ: {sfSum.toFixed(1)} mm
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-right self-end">
                  {protocol} · Siri (1961)
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Preencha todas as dobras do protocolo para calcular automaticamente.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Perímetros ────────────────────────────────────────────────────────

function Step3({ form, setField }: { form: MeasurementForm; setField: (f: string, v: string) => void }) {
  const SH = ({ label }: { label: string }) => (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-3">{label}</p>
  );

  return (
    <div className="space-y-6">
      <div>
        <SH label="Tronco (cm)" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <NumInput label="Pescoço"  field="neck"     form={form} setField={setField} />
          <NumInput label="Ombro"    field="shoulder" form={form} setField={setField} />
          <NumInput label="Peitoral" field="chest"    form={form} setField={setField} />
          <NumInput label="Cintura"  field="waist"    form={form} setField={setField} />
          <NumInput label="Abdômen"  field="abdomen"  form={form} setField={setField} />
          <NumInput label="Quadril"  field="hip"      form={form} setField={setField} />
        </div>
      </div>

      <div className="pt-1 border-t border-border/60">
        <SH label="Membros Superiores D / E (cm)" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <BilateralInput label="Braço Rel."  fieldR="arm_relax_r"    fieldL="arm_relax_l"    form={form} setField={setField} />
          <BilateralInput label="Braço Con."  fieldR="arm_contract_r" fieldL="arm_contract_l" form={form} setField={setField} />
          <BilateralInput label="Antebraço"   fieldR="forearm_r"      fieldL="forearm_l"      form={form} setField={setField} />
          <BilateralInput label="Punho"       fieldR="wrist_r"        fieldL="wrist_l"        form={form} setField={setField} />
        </div>
      </div>

      <div className="pt-1 border-t border-border/60">
        <SH label="Membros Inferiores D / E (cm)" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <BilateralInput label="Coxa Prox." fieldR="thigh_prox_r" fieldL="thigh_prox_l" form={form} setField={setField} />
          <BilateralInput label="Coxa Med."  fieldR="thigh_r"      fieldL="thigh_l"      form={form} setField={setField} />
          <BilateralInput label="Panturr."   fieldR="calf_r"       fieldL="calf_l"       form={form} setField={setField} />
        </div>
      </div>

      <div className="pt-1 border-t border-border/60">
        <SH label="Observações" />
        <Input
          value={(form as Record<string, string>).notes ?? ""}
          onChange={e => setField("notes", e.target.value)}
          placeholder="Observações sobre esta avaliação…"
          className="h-9 rounded-md text-sm"
        />
      </div>
    </div>
  );
}

// ─── Wizard root ───────────────────────────────────────────────────────────────

interface AnthropometryWizardProps {
  patient: Patient;
  onSave: (form: MeasurementForm, compMode: "bio" | "skinfold", protocol: SkinfoldProtocol) => Promise<void>;
  saving: boolean;
}

export function AnthropometryWizard({ patient, onSave, saving }: AnthropometryWizardProps) {
  const todayISO = () => new Date().toISOString().split("T")[0];
  const [step, setStep]       = useState(1);
  const [form, setFormState]  = useState<MeasurementForm>({ assessment_date: todayISO() });
  const [compMode, setCompMode] = useState<"bio" | "skinfold">("bio");
  const [protocol, setProtocol] = useState<SkinfoldProtocol>(
    patient.gender === "F" ? "JP3F" : "JP3M"
  );
  const [error, setError]     = useState<string | null>(null);

  const setField = (field: string, value: string) =>
    setFormState(p => ({ ...p, [field]: value }));

  // Compute live for save-button disable check (step 2, adipômetro)
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
  const calcResult = compMode === "skinfold" ? calcBodyFat(protocol, sfValues, patientAge) : null;

  const validate = (s: number): string | null => {
    if (s === 1 && !form.weight && !form.height)
      return "Informe ao menos Peso ou Altura para continuar.";
    return null;
  };

  const handleNext = () => {
    const err = validate(step);
    if (err) { setError(err); return; }
    setError(null);
    setStep(s => Math.min(s + 1, STEPS.length));
  };

  const handleBack = () => {
    setError(null);
    setStep(s => Math.max(s - 1, 1));
  };

  const handleSave = async () => {
    await onSave(form, compMode, protocol);
    setFormState({ assessment_date: todayISO() });
    setStep(1);
    setError(null);
  };

  const isLastStep   = step === STEPS.length;
  const saveDisabled = saving || (isLastStep && compMode === "skinfold" && !calcResult);

  return (
    <div className="border border-border rounded-md overflow-hidden bg-card">

      {/* ── Header ── */}
      <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Nova Avaliação Antropométrica
        </p>
        <Input
          type="date"
          value={form.assessment_date}
          onChange={e => setField("assessment_date", e.target.value)}
          className="h-8 rounded-md text-sm w-38"
        />
      </div>

      {/* ── Stepper ── */}
      <div className="border-b border-border/60 bg-background/60">
        <Stepper current={step} />
      </div>

      {/* ── Step content ── */}
      <div className="p-5 min-h-[260px]">
        {step === 1 && <Step1 form={form} setField={setField} />}
        {step === 2 && (
          <Step2
            form={form} setField={setField}
            compMode={compMode} setCompMode={setCompMode}
            protocol={protocol} setProtocol={setProtocol}
            patient={patient}
          />
        )}
        {step === 3 && <Step3 form={form} setField={setField} />}

        {error && (
          <p className="mt-3 text-xs font-medium text-destructive">{error}</p>
        )}
      </div>

      {/* ── Footer navigation ── */}
      <div className="px-5 py-4 border-t border-border/60 bg-muted/20 flex items-center justify-between gap-3">
        {/* Voltar */}
        <div>
          {step > 1 && (
            <Button type="button" variant="outline" size="sm" onClick={handleBack} className="gap-1.5">
              <ChevronLeft size={14} />
              Voltar
            </Button>
          )}
        </div>

        {/* Próximo / Salvar */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground tabular-nums">
            {step} / {STEPS.length}
          </span>

          {!isLastStep ? (
            <Button type="button" size="sm" onClick={handleNext} className="gap-1.5">
              Próximo
              <ChevronRight size={14} />
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={handleSave} disabled={saveDisabled} className="gap-1.5 px-5">
              {saving
                ? <><Loader2 size={13} className="animate-spin" /> Salvando…</>
                : <><Save size={13} /> Salvar Avaliação</>
              }
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
