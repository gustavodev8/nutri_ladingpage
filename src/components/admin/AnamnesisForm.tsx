import { useState, useEffect } from "react";
import { Loader2, Save, Target, Salad, Dumbbell, Moon, Stethoscope, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchAnamnesis,
  upsertAnamnesis,
  type AnamnesisStructured,
} from "@/lib/supabase";

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-md overflow-hidden bg-card">
      <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2.5">
        <span className="text-muted-foreground shrink-0">{icon}</span>
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          {title}
        </p>
      </div>
      <div className="divide-y divide-border/40">{children}</div>
    </div>
  );
}

function BoolRow({
  label,
  description,
  field,
  data,
  set,
}: {
  label: string;
  description?: string;
  field: keyof AnamnesisStructured;
  data: AnamnesisStructured;
  set: <K extends keyof AnamnesisStructured>(k: K, v: AnamnesisStructured[K]) => void;
}) {
  const checked = !!data[field];
  return (
    <div className="flex items-center justify-between px-5 py-3.5 gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={(v) => set(field, v as AnamnesisStructured[typeof field])}
        className="shrink-0"
      />
    </div>
  );
}

function SelectRow<K extends keyof AnamnesisStructured>({
  label,
  field,
  options,
  data,
  set,
}: {
  label: string;
  field: K;
  options: { value: string; label: string }[];
  data: AnamnesisStructured;
  set: <F extends keyof AnamnesisStructured>(k: F, v: AnamnesisStructured[F]) => void;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3 gap-4">
      <Label className="text-sm font-medium text-foreground shrink-0">{label}</Label>
      <Select
        value={(data[field] as string) ?? ""}
        onValueChange={(v) => set(field, v as AnamnesisStructured[K])}
      >
        <SelectTrigger className="h-8 w-44 text-xs rounded-md shrink-0">
          <SelectValue placeholder="Selecione…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TextField({
  label,
  field,
  placeholder,
  data,
  set,
}: {
  label: string;
  field: keyof AnamnesisStructured;
  placeholder?: string;
  data: AnamnesisStructured;
  set: <K extends keyof AnamnesisStructured>(k: K, v: AnamnesisStructured[K]) => void;
}) {
  return (
    <div className="px-5 py-3 space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
        {label}
      </Label>
      <Input
        value={(data[field] as string) ?? ""}
        onChange={(e) => set(field, e.target.value as AnamnesisStructured[typeof field])}
        placeholder={placeholder}
        className="h-8 text-sm rounded-md"
      />
    </div>
  );
}

function NotesArea({
  field,
  data,
  set,
}: {
  field: keyof AnamnesisStructured;
  data: AnamnesisStructured;
  set: <K extends keyof AnamnesisStructured>(k: K, v: AnamnesisStructured[K]) => void;
}) {
  return (
    <div className="px-5 py-3 bg-muted/20 space-y-1.5">
      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
        Observações adicionais
      </Label>
      <Textarea
        value={(data[field] as string) ?? ""}
        onChange={(e) => set(field, e.target.value as AnamnesisStructured[typeof field])}
        placeholder="Detalhes relevantes para esta seção…"
        className="min-h-[60px] text-sm resize-none rounded-md"
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AnamnesisForm({
  patientId,
  onSaved,
}: {
  patientId: string;
  onSaved?: (a: import("@/lib/supabase").Anamnesis) => void;
}) {
  const pid = Number(patientId);
  const [anamnesisId, setAnamnesisId] = useState<number | null>(null);
  const [sd, setSd] = useState<AnamnesisStructured>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAnamnesis(pid).then((data) => {
      if (data) {
        setAnamnesisId(data.id ?? null);
        setSd(data.structured_data ?? {});
      }
      setLoading(false);
    });
  }, [pid]);

  const set = <K extends keyof AnamnesisStructured>(
    key: K,
    value: AnamnesisStructured[K]
  ) => setSd((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    const payload: import("@/lib/supabase").Anamnesis = {
      patient_id:      pid,
      structured_data: sd,
      ...(anamnesisId ? { id: anamnesisId } : {}),
    };
    const ok = await upsertAnamnesis(payload);
    if (ok === true) {
      toast.success("Anamnese salva!");
      onSaved?.(payload);
    } else {
      toast.error("Falha ao salvar: " + ok);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── 1. OBJETIVO ──────────────────────────────────────────────────── */}
      <Section icon={<Target size={14} />} title="Objetivo">
        <SelectRow
          label="Objetivo principal"
          field="goal_primary"
          data={sd}
          set={set}
          options={[
            { value: "emagrecimento",  label: "Emagrecimento" },
            { value: "hipertrofia",    label: "Hipertrofia / Ganho de massa" },
            { value: "saude_geral",    label: "Saúde geral" },
            { value: "performance",    label: "Performance esportiva" },
            { value: "recomposicao",   label: "Recomposição corporal" },
            { value: "outro",          label: "Outro" },
          ]}
        />
        <BoolRow label="Melhora da libido / saúde hormonal"  field="goal_libido"     data={sd} set={set} />
        <BoolRow label="Melhora da disposição e energia"     field="goal_energy"     data={sd} set={set} />
        <BoolRow label="Melhora estética (pele, cabelo, unhas)" field="goal_aesthetics" data={sd} set={set} />
        <NotesArea field="goal_notes" data={sd} set={set} />
      </Section>

      {/* ── 2. DIETA ─────────────────────────────────────────────────────── */}
      <Section icon={<Salad size={14} />} title="Dieta & Alimentação">
        <BoolRow
          label="Consome frutas e hortaliças diariamente"
          description="Pelo menos 2 porções de fruta + vegetais por dia"
          field="diet_fruits_vegs"
          data={sd}
          set={set}
        />
        <BoolRow
          label="Consome ultraprocessados frequentemente"
          description="Embutidos, fast food, biscoitos industrializados, refrigerantes"
          field="diet_processed"
          data={sd}
          set={set}
        />
        <BoolRow
          label="Consome gorduras boas regularmente"
          description="Azeite, abacate, castanhas, ômega-3"
          field="diet_healthy_fats"
          data={sd}
          set={set}
        />
        <SelectRow
          label="Refeições por dia"
          field="diet_meals_per_day"
          data={sd}
          set={set}
          options={[
            { value: "1-2", label: "1–2 refeições" },
            { value: "3",   label: "3 refeições" },
            { value: "4-5", label: "4–5 refeições" },
            { value: "6+",  label: "6 ou mais" },
          ]}
        />
        <SelectRow
          label="Ingestão hídrica diária"
          field="diet_water_liters"
          data={sd}
          set={set}
          options={[
            { value: "<1L",    label: "Menos de 1 L" },
            { value: "1-1.5L", label: "1 a 1,5 L" },
            { value: "1.5-2L", label: "1,5 a 2 L" },
            { value: "2-2.5L", label: "2 a 2,5 L" },
            { value: ">2.5L",  label: "Mais de 2,5 L" },
          ]}
        />
        <TextField label="Aversões alimentares" field="diet_aversions"   data={sd} set={set} placeholder="Ex: brócolis, fígado, frutos do mar…" />
        <TextField label="Preferências alimentares" field="diet_preferences" data={sd} set={set} placeholder="Ex: frango, aveia, frutas…" />
        <NotesArea field="diet_notes" data={sd} set={set} />
      </Section>

      {/* ── 3. TREINO ────────────────────────────────────────────────────── */}
      <Section icon={<Dumbbell size={14} />} title="Treino & Atividade Física">
        <BoolRow
          label="Pratica exercício físico regularmente"
          description="Ao menos 1 vez por semana de forma estruturada"
          field="training_active"
          data={sd}
          set={set}
        />
        {sd.training_active && (
          <>
            <TextField
              label="Modalidade(s)"
              field="training_modality"
              data={sd}
              set={set}
              placeholder="Ex: musculação, corrida, natação…"
            />
            <SelectRow
              label="Frequência semanal"
              field="training_frequency"
              data={sd}
              set={set}
              options={[
                { value: "1-2x", label: "1–2 vezes/semana" },
                { value: "3x",   label: "3 vezes/semana" },
                { value: "4-5x", label: "4–5 vezes/semana" },
                { value: "6-7x", label: "6–7 vezes/semana" },
              ]}
            />
            <BoolRow
              label="Usa suplementação pré / pós-treino"
              field="training_supplement"
              data={sd}
              set={set}
            />
            {sd.training_supplement && (
              <TextField
                label="Quais suplementos?"
                field="training_supplement_types"
                data={sd}
                set={set}
                placeholder="Ex: whey, creatina, cafeína, BCAA…"
              />
            )}
          </>
        )}
        <NotesArea field="training_notes" data={sd} set={set} />
      </Section>

      {/* ── 4. HÁBITOS & LIFESTYLE ───────────────────────────────────────── */}
      <Section icon={<Moon size={14} />} title="Hábitos & Estilo de Vida">
        <BoolRow label="Tabagista" field="habit_smokes" data={sd} set={set} />
        <SelectRow
          label="Consumo de álcool"
          field="habit_alcohol"
          data={sd}
          set={set}
          options={[
            { value: "nunca",       label: "Nunca" },
            { value: "raramente",   label: "Raramente" },
            { value: "fins_semana", label: "Fins de semana" },
            { value: "frequente",   label: "Frequente (≥ 3×/semana)" },
          ]}
        />
        <SelectRow
          label="Horas de sono por noite"
          field="habit_sleep"
          data={sd}
          set={set}
          options={[
            { value: "<5h",  label: "Menos de 5h" },
            { value: "5-6h", label: "5 a 6h" },
            { value: "6-7h", label: "6 a 7h" },
            { value: "7-8h", label: "7 a 8h (ideal)" },
            { value: ">8h",  label: "Mais de 8h" },
          ]}
        />
        <SelectRow
          label="Funcionamento intestinal"
          field="habit_bowel"
          data={sd}
          set={set}
          options={[
            { value: "regular",   label: "Regular (1×/dia)" },
            { value: "preso",     label: "Preso / Constipado" },
            { value: "solto",     label: "Solto / Diarreia frequente" },
            { value: "irregular", label: "Irregular" },
          ]}
        />
        <SelectRow
          label="Nível de estresse percebido"
          field="habit_stress"
          data={sd}
          set={set}
          options={[
            { value: "baixo",    label: "Baixo" },
            { value: "moderado", label: "Moderado" },
            { value: "alto",     label: "Alto" },
          ]}
        />
        <NotesArea field="habit_notes" data={sd} set={set} />
      </Section>

      {/* ── 5. CLÍNICO / PATOLOGIAS ──────────────────────────────────────── */}
      <Section icon={<Stethoscope size={14} />} title="Clínico / Patologias">
        <BoolRow label="Está em tratamento médico atualmente"      field="clinical_treatment"     data={sd} set={set} />
        <BoolRow label="Faz uso de medicação contínua"             field="clinical_medications"   data={sd} set={set} />
        {sd.clinical_medications && (
          <TextField
            label="Quais medicamentos?"
            field="clinical_medications_list"
            data={sd}
            set={set}
            placeholder="Ex: losartana 50mg, metformina, levotiroxina…"
          />
        )}
        <BoolRow
          label="Histórico familiar de doenças crônicas"
          description="Diabetes, hipertensão, câncer, doenças cardíacas"
          field="clinical_family_history"
          data={sd}
          set={set}
        />

        <div className={cn(
          "px-5 py-2 bg-amber-50/60 border-y border-amber-100",
        )}>
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-700/70">
            Condições diagnosticadas
          </p>
        </div>

        <BoolRow label="Hipertensão Arterial (HAS)"                field="clinical_hypertension"  data={sd} set={set} />
        <BoolRow label="Diabetes / Resistência à Insulina"         field="clinical_diabetes"       data={sd} set={set} />
        <BoolRow label="Dislipidemia (colesterol / triglicerídeos)" field="clinical_dyslipidemia"  data={sd} set={set} />
        <BoolRow label="Hipotireoidismo / Hashimoto"               field="clinical_hypothyroidism" data={sd} set={set} />
        <BoolRow label="SOP (Síndrome dos Ovários Policísticos)"   field="clinical_pcos"           data={sd} set={set} />
        <BoolRow
          label="Ansiedade / Depressão / Uso de psicofármacos"
          description="Inclui ansiolíticos, antidepressivos, estabilizadores de humor"
          field="clinical_mental_health"
          data={sd}
          set={set}
        />

        <TextField
          label="Alergias / Intolerâncias alimentares"
          field="clinical_allergies"
          data={sd}
          set={set}
          placeholder="Ex: lactose, glúten, amendoim, frutos do mar…"
        />
        <TextField
          label="Aversões alimentares (não come)"
          field="clinical_food_aversions"
          data={sd}
          set={set}
          placeholder="Ex: fígado, beterraba, couve…"
        />
        <NotesArea field="clinical_notes" data={sd} set={set} />
      </Section>

      {/* ── 6. EXAMES LABORATORIAIS ──────────────────────────────────────── */}
      <Section icon={<FlaskConical size={14} />} title="Exames Laboratoriais — Histórico">
        <BoolRow
          label="Histórico de anemia"
          description="Hemoglobina ou eritrócitos abaixo do valor de referência"
          field="exam_anemia"
          data={sd}
          set={set}
        />
        <BoolRow
          label="Histórico de vitamina B12 baixa"
          description="Cobalamina sérica < 200 pg/mL"
          field="exam_low_b12"
          data={sd}
          set={set}
        />
        <BoolRow
          label="Histórico de vitamina D baixa"
          description="25-OH vitamina D < 30 ng/mL (insuficiência / deficiência)"
          field="exam_low_vitd"
          data={sd}
          set={set}
        />
        <BoolRow
          label="Histórico de ferritina / ferro baixo"
          description="Ferritina < 12 ng/mL ou ferro sérico abaixo do referencial"
          field="exam_low_iron"
          data={sd}
          set={set}
        />
        <NotesArea field="exam_notes" data={sd} set={set} />
      </Section>

      {/* ── Save ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-end pt-2 pb-4">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-10 px-8 rounded-md font-bold gap-2"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? "Salvando…" : "Salvar Anamnese"}
        </Button>
      </div>
    </div>
  );
}
