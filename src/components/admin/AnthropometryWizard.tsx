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

// ─── Small primitives ─────────────────────────────────────────────────────────

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

function SH({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3 pb-1.5 border-b border-border/40">
      {label}
    </p>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayISO = () => new Date().toISOString().split("T")[0];

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

// ─── Main form component ───────────────────────────────────────────────────────

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

  // Populate form when editing or reset when edit is cancelled
  useEffect(() => {
    if (editingMeasurement) {
      setFormState(measurementToForm(editingMeasurement));
      if (editingMeasurement.sf_protocol) {
        setProtocol(editingMeasurement.sf_protocol as SkinfoldProtocol);
        setCompMode("skinfold");
      } else {
        setCompMode(editingMeasurement.body_fat != null ? "bio" : "bio");
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
    const cloned = measurementToForm(latestMeasurement);
    // Keep today's date, not the cloned one
    setFormState({ ...cloned, assessment_date: todayISO() });
    if (latestMeasurement.sf_protocol) {
      setProtocol(latestMeasurement.sf_protocol as SkinfoldProtocol);
      setCompMode("skinfold");
    } else {
      setCompMode("bio");
    }
  };

  // ── Live body-fat calc ──
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
  const genderKey = patient.gender === "F" ? "F" : "M";
  const calcResult = compMode === "skinfold"
    ? calcBodyFat(protocol, sfValues, patientAge, genderKey)
    : null;
  const protocolInfo = PROTOCOLS.find((p) => p.id === protocol);
  const sfSum = compMode === "skinfold" ? sumSkinfolds(protocol, sfValues) : 0;
  const fatClass = calcResult ? classifyBodyFat(calcResult.fatPct, genderKey) : null;

  const bioFatPct = compMode === "bio" && form.body_fat ? parseFloat(form.body_fat) : null;
  const bioWeight = form.weight ? parseFloat(form.weight) : null;
  const bioFatKg  = bioFatPct != null && bioWeight != null
    ? parseFloat((bioWeight * bioFatPct / 100).toFixed(2)) : null;
  const bioLeanKg = bioFatKg != null && bioWeight != null
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
    <div className={cn(
      "border rounded-xl overflow-hidden bg-card",
      isEditing ? "border-amber-300 ring-2 ring-amber-200/50" : "border-border"
    )}>

      {/* ── Header ── */}
      <div className={cn(
        "px-5 py-3.5 border-b flex items-center justify-between gap-3 flex-wrap",
        isEditing ? "border-amber-200 bg-amber-50/60" : "border-border bg-muted/30"
      )}>
        <div className="flex items-center gap-2.5">
          {isEditing ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
              <Pencil size={13} />
              Editando avaliação de {new Date(editingMeasurement!.assessment_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          ) : (
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Nova Avaliação Antropométrica
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!isEditing && latestMeasurement && (
            <Button type="button" variant="outline" size="sm" onClick={handleClone}
              className="gap-1.5 h-8 text-xs font-medium">
              <Copy size={12} />
              Copiar última avaliação
            </Button>
          )}
          <Input
            type="date"
            value={form.assessment_date}
            onChange={(e) => setField("assessment_date", e.target.value)}
            className="h-8 rounded-md text-sm w-38"
          />
          {isEditing && onCancelEdit && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancelEdit}
              className="h-8 gap-1.5 text-xs">
              <X size={12} /> Cancelar
            </Button>
          )}
          <Button type="button" size="sm" onClick={handleSave} disabled={saving}
            className="h-8 gap-1.5 px-4">
            {saving
              ? <><Loader2 size={12} className="animate-spin" /> Salvando…</>
              : <><Save size={12} /> {isEditing ? "Atualizar" : "Salvar"}</>
            }
          </Button>
        </div>
      </div>

      {/* ── Body — 3-column grid ── */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Col 1: Dados Básicos + Tronco ── */}
        <div className="space-y-6">
          <section>
            <SH label="Dados Básicos" />
            <div className="grid grid-cols-3 gap-3">
              <NumInput label="Peso (kg)"   field="weight"       form={form} setField={setField} placeholder="70.5" />
              <NumInput label="Altura (cm)" field="height"       form={form} setField={setField} placeholder="175"  />
              <NumInput label="G. Visceral" field="visceral_fat" form={form} setField={setField} placeholder="8"    />
            </div>
          </section>

          <section>
            <SH label="Tronco (cm)" />
            <div className="grid grid-cols-2 gap-3">
              <NumInput label="Pescoço"  field="neck"     form={form} setField={setField} />
              <NumInput label="Ombro"    field="shoulder" form={form} setField={setField} />
              <NumInput label="Peitoral" field="chest"    form={form} setField={setField} />
              <NumInput label="Cintura"  field="waist"    form={form} setField={setField} />
              <NumInput label="Abdômen"  field="abdomen"  form={form} setField={setField} />
              <NumInput label="Quadril"  field="hip"      form={form} setField={setField} />
            </div>
          </section>
        </div>

        {/* ── Col 2: Membros Superiores + Inferiores + Notas ── */}
        <div className="space-y-6">
          <section>
            <SH label="Membros Superiores D / E (cm)" />
            <div className="grid grid-cols-2 gap-3">
              <BilateralInput label="Braço Rel."  fieldR="arm_relax_r"    fieldL="arm_relax_l"    form={form} setField={setField} />
              <BilateralInput label="Braço Con."  fieldR="arm_contract_r" fieldL="arm_contract_l" form={form} setField={setField} />
              <BilateralInput label="Antebraço"   fieldR="forearm_r"      fieldL="forearm_l"      form={form} setField={setField} />
              <BilateralInput label="Punho"       fieldR="wrist_r"        fieldL="wrist_l"        form={form} setField={setField} />
            </div>
          </section>

          <section>
            <SH label="Membros Inferiores D / E (cm)" />
            <div className="grid grid-cols-2 gap-3">
              <BilateralInput label="Coxa Prox." fieldR="thigh_prox_r" fieldL="thigh_prox_l" form={form} setField={setField} />
              <BilateralInput label="Coxa Med."  fieldR="thigh_r"      fieldL="thigh_l"      form={form} setField={setField} />
              <BilateralInput label="Panturr."   fieldR="calf_r"       fieldL="calf_l"       form={form} setField={setField} />
            </div>
          </section>

          <section>
            <SH label="Observações" />
            <Input
              value={(form as Record<string, string>).notes ?? ""}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Observações sobre esta avaliação…"
              className="h-9 rounded-md text-sm"
            />
          </section>
        </div>

        {/* ── Col 3: Composição Corporal + Dobras ── */}
        <div className="space-y-4">
          <SH label="Composição Corporal" />

          {/* Mode toggle */}
          <div className="flex items-center bg-muted rounded-md p-0.5 w-fit">
            {(["bio", "skinfold"] as const).map((mode) => (
              <button key={mode} type="button" onClick={() => setCompMode(mode)}
                className={cn(
                  "px-3 h-7 rounded text-xs font-medium transition-all",
                  compMode === mode
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}>
                {mode === "bio" ? "Bioimpedância" : "Adipômetro"}
              </button>
            ))}
          </div>

          {compMode === "bio" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
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
              {/* Protocol selector — all 9 protocols, no gender filter */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {PROTOCOLS.map((p) => (
                    <button key={p.id} type="button" onClick={() => setProtocol(p.id)}
                      className={cn(
                        "px-2.5 h-7 rounded-md text-xs font-medium border transition-all",
                        protocol === p.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary/50"
                      )}>
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

              {/* Skinfold inputs */}
              <div className="grid grid-cols-2 gap-2.5">
                {protocolInfo?.skinfolds.map((key) => (
                  <div key={key} className="space-y-1.5">
                    <FieldLabel>{SKINFOLD_LABELS[key]}</FieldLabel>
                    <Input
                      type="number" step="0.1" min="0" placeholder="mm"
                      value={(form as Record<string, string>)[key] ?? ""}
                      onChange={(e) => setField(key, e.target.value)}
                      className={cn(
                        "h-9 rounded-md text-sm",
                        (form as Record<string, string>)[key] ? "border-primary/50" : ""
                      )}
                    />
                  </div>
                ))}
              </div>

              {/* Live result */}
              <div className={cn(
                "rounded-lg border p-3 transition-all",
                calcResult ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"
              )}>
                {calcResult ? (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                      Resultado calculado
                    </p>
                    <p className={cn("text-3xl font-bold tabular-nums", fatClass?.color)}>
                      {calcResult.fatPct.toFixed(1)}<span className="text-lg">%</span>
                    </p>
                    <p className={cn("text-xs font-semibold", fatClass?.color)}>{fatClass?.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {calcResult.density > 0 && <>DC: {calcResult.density.toFixed(4)} g/mL &nbsp;·&nbsp; </>}
                      Σ: {sfSum.toFixed(1)} mm &nbsp;·&nbsp; {protocol}
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
      </div>
    </div>
  );
}
