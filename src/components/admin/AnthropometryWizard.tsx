import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, Copy, Crosshair, Loader2, Pencil, Save, Scale, X } from "lucide-react";
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
  type SkinfoldKey,
  type SkinfoldProtocol,
} from "@/lib/anthropometryUtils";
import type { Measurement, Patient } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MeasurementForm = {
  assessment_date: string;
  weight?: string;
  height?: string;
  // Bioimpedância
  bio_fat_pct?: string;   // % gordura da balança
  bio_lean_kg?: string;   // massa muscular (kg) da balança
  visceral_fat?: string;  // gordura visceral (índice)
  // Dobras cutâneas
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

// ─── Primitives ───────────────────────────────────────────────────────────────

function NI({
  label, field, form, setField, placeholder, className,
}: {
  label: string; field: string; form: MeasurementForm;
  setField: (f: string, v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      <Input
        type="number" step="0.1" placeholder={placeholder ?? "—"}
        value={(form as Record<string, string>)[field] ?? ""}
        onChange={(e) => setField(field, e.target.value)}
        className={cn("h-9 text-sm", className)}
      />
    </div>
  );
}

// Dobra cutânea com destaque de protocolo
function SkinfoldNI({
  sfKey, form, setField, inProtocol,
}: {
  sfKey: SkinfoldKey; form: MeasurementForm;
  setField: (f: string, v: string) => void; inProtocol: boolean;
}) {
  const val = (form as Record<string, string>)[sfKey] ?? "";
  return (
    <div className="space-y-1.5">
      <Label className={cn(
        "text-xs font-semibold transition-colors block",
        inProtocol ? "text-primary" : "text-muted-foreground"
      )}>
        {SKINFOLD_LABELS[sfKey]}
      </Label>
      <div className="relative">
        <Input
          type="number" step="0.1" min="0" placeholder="mm"
          value={val}
          onChange={(e) => setField(sfKey, e.target.value)}
          className={cn(
            "h-10 text-sm transition-all pr-9",
            inProtocol
              ? val
                ? "border-primary bg-primary/5 font-semibold text-primary"
                : "border-primary/40 focus:border-primary"
              : "opacity-60"
          )}
        />
        <span className={cn(
          "absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold pointer-events-none transition-colors",
          val ? "text-muted-foreground" : "text-muted-foreground/40"
        )}>
          mm
        </span>
      </div>
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
      <div className="px-6 py-3.5 border-b border-border/50 bg-muted/30">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
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

const ALL_SF_KEYS: SkinfoldKey[] = [
  "sf_triceps", "sf_biceps", "sf_subscapular",
  "sf_pectoral", "sf_midaxillary", "sf_suprailiac",
  "sf_abdominal", "sf_thigh_sf", "sf_calf_sf",
];

const PROTOCOL_SHORT: Record<string, string> = {
  JP3M: "3P Masculino", JP3F: "3P Feminino",
  JP7M: "7P Masculino", JP7F: "7P Feminino",
  GUEDES_M: "Masculino",  GUEDES_F: "Feminino",
  DURNIN: "Durnin 4P", FAULKNER: "Faulkner 4P", YUHASZ: "Yuhász 6P",
};

const PROTOCOL_GROUPS = [
  { label: "Jackson & Pollock", ids: ["JP3M", "JP3F", "JP7M", "JP7F"] },
  { label: "Guedes", ids: ["GUEDES_M", "GUEDES_F"] },
  { label: "Outros", ids: ["DURNIN", "FAULKNER", "YUHASZ"] },
];

function measurementToForm(m: Measurement): MeasurementForm {
  const s = (v?: number) => (v != null ? String(v) : "");
  return {
    assessment_date: m.assessment_date,
    weight: s(m.weight), height: s(m.height),
    // bio fields — body_fat and lean_mass from DB go into bio inputs when no sf_protocol
    bio_fat_pct: !m.sf_protocol ? s(m.body_fat) : "",
    bio_lean_kg: !m.sf_protocol ? s(m.lean_mass) : "",
    visceral_fat: s(m.visceral_fat),
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
    protocol: SkinfoldProtocol,
    officialSource: "bio" | "skinfold" | null,
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
  const [protocol, setProtocol] = useState<SkinfoldProtocol>("JP3M");
  const [officialSource, setOfficialSource] = useState<"bio" | "skinfold" | null>(null);

  useEffect(() => {
    if (editingMeasurement) {
      setFormState(measurementToForm(editingMeasurement));
      if (editingMeasurement.sf_protocol) {
        setProtocol(editingMeasurement.sf_protocol as SkinfoldProtocol);
        setOfficialSource("skinfold");
      } else if (editingMeasurement.body_fat != null) {
        setOfficialSource("bio");
      } else {
        setOfficialSource(null);
      }
    } else {
      setFormState({ assessment_date: todayISO() });
      setProtocol("JP3M");
      setOfficialSource(null);
    }
  }, [editingMeasurement]);

  const setField = (field: string, value: string) =>
    setFormState((p) => ({ ...p, [field]: value }));

  const handleClone = () => {
    if (!latestMeasurement) return;
    setFormState({ ...measurementToForm(latestMeasurement), assessment_date: todayISO() });
    if (latestMeasurement.sf_protocol) {
      setProtocol(latestMeasurement.sf_protocol as SkinfoldProtocol);
      setOfficialSource("skinfold");
    } else if (latestMeasurement.body_fat != null) {
      setOfficialSource("bio");
    }
  };

  // ── Live calculations ──
  const genderKey = patient.gender === "F" ? "F" : "M";
  const patientAge = patient.birth_date
    ? Math.floor((Date.now() - new Date(patient.birth_date).getTime()) / 31_557_600_000)
    : 25;
  const bioWeight = form.weight ? parseFloat(form.weight) : null;

  // Bio values
  const bioFatPct = form.bio_fat_pct ? parseFloat(form.bio_fat_pct) : null;
  const bioLeanKg = form.bio_lean_kg
    ? parseFloat(form.bio_lean_kg)
    : bioFatPct != null && bioWeight != null
      ? parseFloat((bioWeight * (1 - bioFatPct / 100)).toFixed(2))
      : null;
  const bioFatClass = bioFatPct != null ? classifyBodyFat(bioFatPct, genderKey) : null;
  const bioAvailable = bioFatPct != null;

  // Skinfold values
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
  const sfResult = calcBodyFat(protocol, sfValues, patientAge, genderKey);
  const sfSum = sumSkinfolds(protocol, sfValues);
  const sfFatClass = sfResult ? classifyBodyFat(sfResult.fatPct, genderKey) : null;
  const sfLeanKg = sfResult && bioWeight
    ? parseFloat((bioWeight * (1 - sfResult.fatPct / 100)).toFixed(2))
    : null;
  const sfAvailable = sfResult != null;

  const protocolInfo = PROTOCOLS.find((p) => p.id === protocol);
  const inProtocol = (key: SkinfoldKey) => protocolInfo?.skinfolds.includes(key) ?? false;
  const protocolKeys = ALL_SF_KEYS.filter(inProtocol);
  const extraKeys = ALL_SF_KEYS.filter((k) => !inProtocol(k));

  // Auto-select official source when only one is available
  const effectiveOfficial: "bio" | "skinfold" | null =
    officialSource ??
    (sfAvailable && !bioAvailable ? "skinfold" :
      bioAvailable && !sfAvailable ? "bio" : null);

  const handleSave = async () => {
    await onSave(form, protocol, effectiveOfficial, editingMeasurement?.id);
    if (!editingMeasurement) {
      setFormState({ assessment_date: todayISO() });
      setProtocol("JP3M");
      setOfficialSource(null);
    }
  };

  const isEditing = !!editingMeasurement;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 space-y-3">

      {/* ── Sticky action bar ── */}
      <div className={cn(
        "sticky top-0 z-30 -mx-4 px-4 py-3 flex items-center justify-between gap-3 flex-wrap border-b shadow-sm",
        isEditing ? "bg-amber-50 border-amber-200" : "bg-background border-border/60"
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

      {/* ── Seções empilhadas ── */}
      <div className="flex flex-col gap-6 pb-10">

        {/* ── 1. Dados Básicos ── */}
        <Section title="Dados Básicos" subtitle="Peso e altura do paciente">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <NI label="Peso (kg)"   field="weight" form={form} setField={setField} placeholder="70.5" />
            <NI label="Altura (cm)" field="height" form={form} setField={setField} placeholder="175"  />
          </div>
        </Section>

        {/* ── 2. Bioimpedância (Balança) ── */}
        <Section
          title="Bioimpedância (Balança)"
          subtitle="Preencha apenas se o paciente foi avaliado na balança de bioimpedância"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <NI label="% Gordura Corporal" field="bio_fat_pct"  form={form} setField={setField} placeholder="22.5" />
            <NI label="Massa Muscular (kg)" field="bio_lean_kg" form={form} setField={setField} placeholder="65.0" />
            <NI label="Gordura Visceral"   field="visceral_fat" form={form} setField={setField} placeholder="8"    />
          </div>
        </Section>

        {/* ── 3. Dobras Cutâneas ── */}
        <Section
          title="Dobras Cutâneas"
          subtitle="Selecione o protocolo — as dobras necessárias ficam em destaque"
        >
          <div className="space-y-5">

            {/* ── Protocol selector agrupado ── */}
            <div className="rounded-xl border border-border/60 bg-muted/20 divide-y divide-border/40 overflow-hidden">
              {PROTOCOL_GROUPS.map((group) => (
                <div key={group.label} className="flex items-center gap-0 px-4 py-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-32 flex-shrink-0">
                    {group.label}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {group.ids.map((id) => {
                      const active = protocol === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setProtocol(id as typeof protocol)}
                          className={cn(
                            "px-3 h-7 rounded-lg text-xs font-semibold border transition-all",
                            active
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                          )}
                        >
                          {PROTOCOL_SHORT[id] ?? id}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Dobras do protocolo (zona destacada) ── */}
            {protocolKeys.length > 0 && (
              <div className="rounded-xl border-2 border-primary/25 bg-primary/5 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-primary/15">
                  <div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                      Dobras do Protocolo
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                      {protocolInfo?.description}
                    </p>
                  </div>
                  {sfResult && (
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-2xl font-black text-primary tabular-nums leading-none">
                        {sfResult.fatPct.toFixed(1)}<span className="text-sm font-bold">%</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                        Σ {sfSum.toFixed(1)} mm
                        {sfResult.density > 0 && <> · DC {sfResult.density.toFixed(4)}</>}
                      </p>
                    </div>
                  )}
                </div>
                <div className={cn(
                  "px-4 py-4 grid gap-3",
                  protocolKeys.length <= 3 ? "grid-cols-3" :
                  protocolKeys.length === 4 ? "grid-cols-2 sm:grid-cols-4" :
                  protocolKeys.length === 6 ? "grid-cols-3 sm:grid-cols-6" :
                  "grid-cols-3 sm:grid-cols-4 md:grid-cols-7"
                )}>
                  {protocolKeys.map((key) => (
                    <SkinfoldNI key={key} sfKey={key} form={form} setField={setField} inProtocol={true} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Dobras complementares (muted) ── */}
            {extraKeys.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Dobras Complementares{" "}
                  <span className="normal-case font-medium text-muted-foreground/70">— opcionais, salvas mas não usadas no cálculo</span>
                </p>
                <div className={cn(
                  "grid gap-3",
                  extraKeys.length <= 4 ? "grid-cols-2 sm:grid-cols-4" :
                  extraKeys.length <= 6 ? "grid-cols-3 sm:grid-cols-6" :
                  "grid-cols-3 sm:grid-cols-4 md:grid-cols-6"
                )}>
                  {extraKeys.map((key) => (
                    <SkinfoldNI key={key} sfKey={key} form={form} setField={setField} inProtocol={false} />
                  ))}
                </div>
              </div>
            )}

          </div>
        </Section>

        {/* ── 4. Tronco ── */}
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

        {/* ── 5. Membros Superiores ── */}
        <Section title="Circunferências — Membros Superiores" subtitle="Direito (D) e Esquerdo (E), em centímetros">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
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

        {/* ── 6. Membros Inferiores ── */}
        <Section title="Circunferências — Membros Inferiores" subtitle="Direito (D) e Esquerdo (E), em centímetros">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <NI label="Coxa Prox. D"  field="thigh_prox_r" form={form} setField={setField} />
            <NI label="Coxa Prox. E"  field="thigh_prox_l" form={form} setField={setField} />
            <NI label="Coxa Med. D"   field="thigh_r"      form={form} setField={setField} />
            <NI label="Coxa Med. E"   field="thigh_l"      form={form} setField={setField} />
            <NI label="Panturrilha D" field="calf_r"       form={form} setField={setField} />
            <NI label="Panturrilha E" field="calf_l"       form={form} setField={setField} />
          </div>
        </Section>

        {/* ── 7. Resultado da Composição Corporal ── */}
        {(bioAvailable || sfAvailable) && (
          <Section
            title="Resultado da Composição Corporal"
            subtitle="Compare os métodos e defina qual será o resultado oficial para o planejamento"
          >
            <div className={cn(
              "grid gap-6",
              bioAvailable && sfAvailable ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 max-w-sm"
            )}>
              {/* Bio card */}
              {bioAvailable && (() => {
                const isOfficial = effectiveOfficial === "bio";
                return (
                  <div className="relative pt-5">
                    {isOfficial && (
                      <div className="absolute -top-0 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-primary text-primary-foreground text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md whitespace-nowrap">
                        <CheckCircle2 size={12} strokeWidth={3} />
                        Resultado Oficial
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setOfficialSource(isOfficial ? null : "bio")}
                      className={cn(
                        "w-full text-left flex flex-col gap-0 rounded-2xl border-2 transition-all duration-200 overflow-hidden",
                        isOfficial
                          ? "ring-2 ring-primary border-transparent bg-primary/5 shadow-lg"
                          : "border-border bg-card hover:border-primary/30 hover:shadow-md"
                      )}
                    >
                      {/* Card header */}
                      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                          isOfficial ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          <Scale size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-foreground leading-tight">Bioimpedância</p>
                          <p className="text-xs text-muted-foreground leading-tight">Balança de composição</p>
                        </div>
                      </div>

                      {/* Big numbers */}
                      <div className="flex items-end gap-6 px-5 pb-4">
                        <div>
                          <p className={cn("text-5xl font-black tabular-nums leading-none", bioFatClass?.color ?? "text-foreground")}>
                            {bioFatPct!.toFixed(1)}<span className="text-2xl font-bold">%</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1.5">Gordura corporal</p>
                        </div>
                        {bioLeanKg != null && (
                          <div>
                            <p className="text-3xl font-black tabular-nums leading-none text-foreground">
                              {bioLeanKg}<span className="text-lg font-bold"> kg</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1.5">Massa magra</p>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className={cn(
                        "flex items-center justify-between px-5 py-3 border-t",
                        isOfficial ? "border-primary/20 bg-primary/5" : "border-border bg-muted/30"
                      )}>
                        {bioFatClass ? (
                          <span className={cn(
                            "text-xs font-bold px-2.5 py-1 rounded-full",
                            bioFatClass.color, "bg-current/10"
                          )}>
                            {bioFatClass.label}
                          </span>
                        ) : <span />}
                        {!isOfficial && (
                          <span className="text-xs text-muted-foreground">Clique para tornar oficial</span>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })()}

              {/* Skinfold card */}
              {sfAvailable && (() => {
                const isOfficial = effectiveOfficial === "skinfold";
                return (
                  <div className="relative pt-5">
                    {isOfficial && (
                      <div className="absolute -top-0 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-primary text-primary-foreground text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md whitespace-nowrap">
                        <CheckCircle2 size={12} strokeWidth={3} />
                        Resultado Oficial
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setOfficialSource(isOfficial ? null : "skinfold")}
                      className={cn(
                        "w-full text-left flex flex-col gap-0 rounded-2xl border-2 transition-all duration-200 overflow-hidden",
                        isOfficial
                          ? "ring-2 ring-primary border-transparent bg-primary/5 shadow-lg"
                          : "border-border bg-card hover:border-primary/30 hover:shadow-md"
                      )}
                    >
                      {/* Card header */}
                      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                          isOfficial ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          <Crosshair size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-foreground leading-tight">Adipômetro</p>
                          <p className="text-xs text-muted-foreground leading-tight">Protocolo {protocol}</p>
                        </div>
                      </div>

                      {/* Big numbers */}
                      <div className="flex items-end gap-6 px-5 pb-4">
                        <div>
                          <p className={cn("text-5xl font-black tabular-nums leading-none", sfFatClass?.color ?? "text-foreground")}>
                            {sfResult!.fatPct.toFixed(1)}<span className="text-2xl font-bold">%</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1.5">Gordura corporal</p>
                        </div>
                        {sfLeanKg != null && (
                          <div>
                            <p className="text-3xl font-black tabular-nums leading-none text-foreground">
                              {sfLeanKg}<span className="text-lg font-bold"> kg</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1.5">Massa magra est.</p>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className={cn(
                        "flex items-center justify-between px-5 py-3 border-t",
                        isOfficial ? "border-primary/20 bg-primary/5" : "border-border bg-muted/30"
                      )}>
                        <div className="flex items-center gap-3">
                          {sfFatClass && (
                            <span className={cn(
                              "text-xs font-bold px-2.5 py-1 rounded-full",
                              sfFatClass.color, "bg-current/10"
                            )}>
                              {sfFatClass.label}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Σ {sfSum.toFixed(1)} mm
                            {sfResult!.density > 0 && <> · DC {sfResult!.density.toFixed(4)}</>}
                          </span>
                        </div>
                        {!isOfficial && (
                          <span className="text-xs text-muted-foreground">Clique para tornar oficial</span>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Conflict warning */}
            {bioAvailable && sfAvailable && effectiveOfficial === null && (
              <div className="mt-4 flex items-start gap-2.5 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <p className="text-xs font-semibold leading-relaxed">
                  Dois métodos preenchidos — selecione qual será o resultado oficial para o planejamento alimentar.
                </p>
              </div>
            )}
          </Section>
        )}

        {/* ── 8. Observações ── */}
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
