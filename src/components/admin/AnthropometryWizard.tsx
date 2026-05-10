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

function FL({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
      {children}
    </Label>
  );
}

function NI({
  label, field, form, setField, placeholder, highlight,
}: {
  label: string; field: string; form: MeasurementForm;
  setField: (f: string, v: string) => void; placeholder?: string; highlight?: boolean;
}) {
  const val = (form as Record<string, string>)[field] ?? "";
  return (
    <div className="space-y-1">
      <FL>{label}</FL>
      <Input
        type="number" step="0.1" placeholder={placeholder ?? "—"}
        value={val}
        onChange={(e) => setField(field, e.target.value)}
        className={cn(
          "h-8 rounded-lg text-sm",
          highlight && val ? "border-primary/60 bg-primary/5" : ""
        )}
      />
    </div>
  );
}

function BI({
  label, fieldR, fieldL, form, setField,
}: {
  label: string; fieldR: string; fieldL: string;
  form: MeasurementForm; setField: (f: string, v: string) => void;
}) {
  const v = (f: string) => (form as Record<string, string>)[f] ?? "";
  return (
    <>
      <div className="space-y-1">
        <FL>{label} D</FL>
        <Input type="number" step="0.1" value={v(fieldR)}
          onChange={(e) => setField(fieldR, e.target.value)} className="h-8 rounded-lg text-sm" />
      </div>
      <div className="space-y-1">
        <FL>{label} E</FL>
        <Input type="number" step="0.1" value={v(fieldL)}
          onChange={(e) => setField(fieldL, e.target.value)} className="h-8 rounded-lg text-sm" />
      </div>
    </>
  );
}

function SectionCard({ title, children, className }: {
  title: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("bg-card border border-border/70 rounded-xl p-4 space-y-3", className)}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/50 pb-2 border-b border-border/40">
        {title}
      </p>
      {children}
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="space-y-1">
      <FL>{label}</FL>
      <div className={cn(
        "h-8 px-2.5 flex items-center rounded-lg border text-sm tabular-nums",
        value ? "bg-muted/60 text-foreground font-semibold" : "bg-muted/30 text-muted-foreground"
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
    const cloned = measurementToForm(latestMeasurement);
    setFormState({ ...cloned, assessment_date: todayISO() });
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
  const genderKey = patient.gender === "F" ? "F" : "M";
  const calcResult = compMode === "skinfold"
    ? calcBodyFat(protocol, sfValues, patientAge, genderKey)
    : null;
  const protocolInfo = PROTOCOLS.find((p) => p.id === protocol);
  const sfSum = compMode === "skinfold" ? sumSkinfolds(protocol, sfValues) : 0;
  const fatClass = calcResult ? classifyBodyFat(calcResult.fatPct, genderKey) : null;

  const bioFatPct  = compMode === "bio" && form.body_fat ? parseFloat(form.body_fat) : null;
  const bioWeight  = form.weight ? parseFloat(form.weight) : null;
  const bioFatKg   = bioFatPct != null && bioWeight != null
    ? parseFloat((bioWeight * bioFatPct / 100).toFixed(2)) : null;
  const bioLeanKg  = bioFatKg != null && bioWeight != null
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
    <div className="w-full space-y-4">

      {/* ── Sticky header bar ── */}
      <div className={cn(
        "sticky top-0 z-20 border-b px-1 py-3 flex items-center justify-between gap-3 flex-wrap backdrop-blur-md",
        isEditing
          ? "bg-amber-50/90 border-amber-200"
          : "bg-background/90 border-border/60"
      )}>
        {/* Left: title / edit banner */}
        <div className="flex items-center gap-3">
          {isEditing ? (
            <span className="flex items-center gap-2 text-sm font-bold text-amber-700">
              <Pencil size={15} />
              Editando — {fmtDate(editingMeasurement!.assessment_date)}
            </span>
          ) : (
            <h2 className="text-sm font-bold text-foreground tracking-tight">
              Nova Avaliação Antropométrica
            </h2>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {!isEditing && latestMeasurement && (
            <Button type="button" variant="outline" size="sm" onClick={handleClone}
              className="gap-1.5 h-8 text-xs font-medium rounded-lg">
              <Copy size={12} />
              Copiar última avaliação
            </Button>
          )}

          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={form.assessment_date}
              onChange={(e) => setField("assessment_date", e.target.value)}
              className="h-8 rounded-lg text-sm w-36"
            />
            {isEditing && onCancelEdit && (
              <Button type="button" variant="ghost" size="sm" onClick={onCancelEdit}
                className="h-8 gap-1 text-xs rounded-lg">
                <X size={12} /> Cancelar
              </Button>
            )}
            <Button
              type="button" size="sm" onClick={handleSave} disabled={saving}
              className={cn(
                "h-8 gap-1.5 px-5 rounded-lg font-semibold",
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
      </div>

      {/* ── 3-column grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">

        {/* ════ COL 1: Dados Básicos + Tronco ════ */}
        <div className="space-y-4">

          <SectionCard title="Dados Básicos">
            <div className="grid grid-cols-3 gap-3">
              <NI label="Peso (kg)"   field="weight"       form={form} setField={setField} placeholder="70.5" />
              <NI label="Altura (cm)" field="height"       form={form} setField={setField} placeholder="175"  />
              <NI label="G. Visceral" field="visceral_fat" form={form} setField={setField} placeholder="8"    />
            </div>
          </SectionCard>

          <SectionCard title="Tronco (cm)">
            <div className="grid grid-cols-2 gap-3">
              <NI label="Pescoço"  field="neck"     form={form} setField={setField} />
              <NI label="Ombro"    field="shoulder" form={form} setField={setField} />
              <NI label="Peitoral" field="chest"    form={form} setField={setField} />
              <NI label="Cintura"  field="waist"    form={form} setField={setField} />
              <NI label="Abdômen"  field="abdomen"  form={form} setField={setField} />
              <NI label="Quadril"  field="hip"      form={form} setField={setField} />
            </div>
          </SectionCard>

        </div>

        {/* ════ COL 2: Membros Superiores + Inferiores + Notas ════ */}
        <div className="space-y-4">

          <SectionCard title="Membros Superiores D / E (cm)">
            <div className="grid grid-cols-2 gap-3">
              <BI label="Braço Rel."  fieldR="arm_relax_r"    fieldL="arm_relax_l"    form={form} setField={setField} />
              <BI label="Braço Con."  fieldR="arm_contract_r" fieldL="arm_contract_l" form={form} setField={setField} />
              <BI label="Antebraço"   fieldR="forearm_r"      fieldL="forearm_l"      form={form} setField={setField} />
              <BI label="Punho"       fieldR="wrist_r"        fieldL="wrist_l"        form={form} setField={setField} />
            </div>
          </SectionCard>

          <SectionCard title="Membros Inferiores D / E (cm)">
            <div className="grid grid-cols-2 gap-3">
              <BI label="Coxa Prox." fieldR="thigh_prox_r" fieldL="thigh_prox_l" form={form} setField={setField} />
              <BI label="Coxa Med."  fieldR="thigh_r"      fieldL="thigh_l"      form={form} setField={setField} />
              <BI label="Panturr."   fieldR="calf_r"       fieldL="calf_l"       form={form} setField={setField} />
            </div>
          </SectionCard>

          <SectionCard title="Observações">
            <Input
              value={(form as Record<string, string>).notes ?? ""}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Observações sobre esta avaliação…"
              className="h-8 rounded-lg text-sm"
            />
          </SectionCard>

        </div>

        {/* ════ COL 3: Composição Corporal ════ */}
        <div className="space-y-4">

          <SectionCard title="Composição Corporal">
            {/* Mode toggle */}
            <div className="flex items-center bg-muted rounded-lg p-0.5 w-fit">
              {(["bio", "skinfold"] as const).map((mode) => (
                <button key={mode} type="button" onClick={() => setCompMode(mode)}
                  className={cn(
                    "px-3 h-7 rounded-md text-xs font-semibold transition-all",
                    compMode === mode
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}>
                  {mode === "bio" ? "Bioimpedância" : "Adipômetro"}
                </button>
              ))}
            </div>

            {compMode === "bio" ? (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 gap-3">
                  <NI label="% Gordura" field="body_fat" form={form} setField={setField} placeholder="18.5" />
                  <ReadOnly label="Massa Gorda (kg)" value={bioFatKg != null ? `${bioFatKg} kg` : null} />
                  <ReadOnly label="Massa Magra (kg)" value={bioLeanKg != null ? `${bioLeanKg} kg` : null} />
                </div>
                {bioFatClass && bioFatPct != null && (
                  <div className={cn(
                    "rounded-lg px-3 py-2 border text-xs font-semibold",
                    bioFatClass.color,
                    "bg-muted/40 border-border/60"
                  )}>
                    {bioFatPct.toFixed(1)}% — {bioFatClass.label}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                {/* Protocol chips */}
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {PROTOCOLS.map((p) => (
                      <button key={p.id} type="button" onClick={() => setProtocol(p.id)}
                        className={cn(
                          "px-2.5 h-7 rounded-lg text-xs font-semibold border transition-all",
                          protocol === p.id
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                        )}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {protocolInfo && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground">{protocolInfo.description}</span>
                    </p>
                  )}
                </div>

                {/* Skinfold inputs */}
                <div className="grid grid-cols-2 gap-2.5">
                  {protocolInfo?.skinfolds.map((key) => (
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

                {/* Live result panel */}
                <div className={cn(
                  "rounded-xl border p-4 transition-all duration-300",
                  calcResult
                    ? "border-primary/30 bg-primary/5"
                    : "border-border/60 bg-muted/30"
                )}>
                  {calcResult ? (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                        Resultado calculado
                      </p>
                      <div className="flex items-end gap-3">
                        <div>
                          <p className={cn("text-4xl font-black tabular-nums leading-none", fatClass?.color)}>
                            {calcResult.fatPct.toFixed(1)}
                            <span className="text-xl font-bold">%</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">Gordura corporal</p>
                        </div>
                        <div className="pb-0.5">
                          <p className={cn("text-sm font-bold", fatClass?.color)}>{fatClass?.label}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground pt-1 border-t border-border/40">
                        {calcResult.density > 0 && (
                          <>DC: {calcResult.density.toFixed(4)} g/mL &nbsp;·&nbsp;</>
                        )}
                        Σ {sfSum.toFixed(1)} mm &nbsp;·&nbsp; {protocol}
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
          </SectionCard>

        </div>
      </div>
    </div>
  );
}
