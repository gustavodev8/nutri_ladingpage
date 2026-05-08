import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Plus, Save, Loader2, FileText, Mail, Zap,
  AlertTriangle, TrendingDown, TrendingUp, Info, LayoutList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  fetchFullMealPlan, saveMeals, upsertMealPlan, fetchMealPlans,
  type Meal, type MealFood, type MealPlan,
} from "@/lib/supabase";
import {
  MealSection, EditorMeal, sumFoods, n0, n1,
} from "@/components/admin/MealTableEditor";
import { EmailPlanModal } from "@/components/admin/EmailPlanModal";
import { ClinicalInsightsPanel } from "@/components/admin/ClinicalInsightsPanel";
import { DietaryPlanningPanel } from "@/components/admin/DietaryPlanningPanel";
import { TemplateImportModal } from "@/components/admin/TemplateImportModal";
import { useConsultation } from "@/contexts/ConsultationContext";
import { generateClinicalAlerts } from "@/lib/clinicalAlertsUtils";
import { type MacroGoals } from "@/lib/planningUtils";
import {
  calcEnergy, applyAdjustment, auditDiet,
  canUseCunningham,
  ACTIVITY_OPTIONS,
  type EnergyFormula, type ActivityLevel,
} from "@/lib/energyUtils";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_MEALS = [
  { meal_name: "Café da manhã",   time_suggestion: "07:00 – 08:00" },
  { meal_name: "Lanche da manhã", time_suggestion: "10:00 – 10:30" },
  { meal_name: "Almoço",          time_suggestion: "12:00 – 13:00" },
  { meal_name: "Lanche da tarde", time_suggestion: "15:30 – 16:00" },
  { meal_name: "Jantar",          time_suggestion: "19:00 – 20:00" },
  { meal_name: "Ceia",            time_suggestion: "21:30 – 22:00" },
];

// ─── Converters: Meal ↔ EditorMeal ────────────────────────────────────────────

const mealToEditor = (m: Meal): EditorMeal => ({
  _dbId:           m.id,
  meal_name:       m.meal_name,
  time_suggestion: m.time_suggestion,
  notes:           m.notes,
  foods:           (m.foods ?? []) as MealFood[],
});

const editorToMeal = (m: EditorMeal, planId: number): Meal => ({
  id:              m._dbId,
  plan_id:         planId,
  meal_name:       m.meal_name,
  time_suggestion: m.time_suggestion,
  notes:           m.notes,
  foods:           m.foods,
});

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminPlanoAlimentar() {
  const { id, planId } = useParams<{ id: string; planId: string }>();
  const navigate = useNavigate();

  const patientId       = Number(id);
  const resolvedPlanId  = Number(planId);
  const isNew           = planId === "novo";

  // ── ConsultationContext — fonte única de verdade para dados do paciente ───
  const {
    patient,
    latestMeasurement,
    latestAnamnesis: anamnesis,
    ageYears,
    isLoading: ctxLoading,
  } = useConsultation();

  const [plan, setPlan] = useState<MealPlan>({
    patient_id: patientId, title: "Plano Alimentar",
    start_date: "", end_date: "", daily_calories: undefined, notes: "",
  });
  const [meals, setMeals]   = useState<EditorMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [showEmail, setShowEmail]       = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [macroGoals, setMacroGoals]     = useState<MacroGoals | null>(null);

  // ── Energy panel state ────────────────────────────────────────────────────
  const [energyFormula, setEnergyFormula] = useState<EnergyFormula>("mifflin");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [adjustment, setAdjustment]       = useState(0);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    try {
      if (isNew) {
        setMeals(DEFAULT_MEALS.map((p) => ({ meal_name: p.meal_name, time_suggestion: p.time_suggestion, foods: [] })));
      } else {
        const [plans, loadedMeals] = await Promise.all([
          fetchMealPlans(patientId),
          fetchFullMealPlan(resolvedPlanId),
        ]);
        const found = plans.find((p) => p.id === resolvedPlanId);
        if (found) setPlan(found);
        setMeals(
          loadedMeals.length > 0
            ? loadedMeals.map(mealToEditor)
            : DEFAULT_MEALS.map((p) => ({ meal_name: p.meal_name, time_suggestion: p.time_suggestion, foods: [] }))
        );
      }
    } catch { toast.error("Erro ao carregar o plano."); }
    finally { setLoading(false); }
  }, [isNew, patientId, resolvedPlanId]);

  useEffect(() => { loadPlan(); }, [loadPlan]);

  const handleSave = async () => {
    if (!plan.title.trim()) { toast.error("Informe um título para o plano."); return; }
    setSaving(true);
    const planWithLineage: MealPlan = {
      ...plan,
      measurement_id: latestMeasurement?.id  ?? plan.measurement_id,
      get_kcal:       suggestedKcal           ?? plan.get_kcal,
    };
    const savedPlan = await upsertMealPlan(planWithLineage);
    if (!savedPlan?.id) { toast.error("Erro ao salvar o plano."); setSaving(false); return; }
    setPlan((p) => ({ ...p, id: savedPlan.id }));
    const dbMeals = meals.map((m) => editorToMeal(m, savedPlan.id!));
    const ok = await saveMeals(savedPlan.id, dbMeals);
    setSaving(false);
    if (!ok) { toast.error("Erro ao salvar as refeições."); return; }
    toast.success("Plano salvo com sucesso.");
    if (isNew) navigate(`/admin/pacientes/${id}/plano/${savedPlan.id}`, { replace: true });
  };

  const updateMeal = (i: number, m: EditorMeal) =>
    setMeals((prev) => { const n = [...prev]; n[i] = m; return n; });
  const removeMeal = (i: number) =>
    setMeals((prev) => prev.filter((_, fi) => fi !== i));
  const addMeal = () =>
    setMeals((prev) => [...prev, { meal_name: "Nova refeição", time_suggestion: "", foods: [] }]);
  const setPF = <K extends keyof MealPlan>(k: K, v: MealPlan[K]) =>
    setPlan((p) => ({ ...p, [k]: v }));

  const handleTemplateImport = (importedMeals: Meal[], mode: "replace" | "append") => {
    const editorMeals = importedMeals.map(mealToEditor);
    setMeals((prev) => mode === "replace" ? editorMeals : [...prev, ...editorMeals]);
  };

  const grand = meals.reduce(
    (a, m) => { const t = sumFoods(m.foods); return { cal: a.cal + t.cal, prot: a.prot + t.prot, carbs: a.carbs + t.carbs, fat: a.fat + t.fat }; },
    { cal: 0, prot: 0, carbs: 0, fat: 0 }
  );

  const goalPct = plan.daily_calories && grand.cal > 0
    ? Math.min(100, Math.round((grand.cal / plan.daily_calories) * 100))
    : 0;

  // ── Energy calculations — reactivos ao ConsultationContext ────────────────
  const energyInput = useMemo(() => {
    if (!latestMeasurement?.weight || !latestMeasurement?.height || !patient?.birth_date || !patient?.gender) return null;
    return {
      weight:    latestMeasurement.weight,
      height:    latestMeasurement.height,
      age:       ageYears ?? 0,
      gender:    patient.gender === "F" ? "F" as const : "M" as const,
      lean_mass: latestMeasurement.lean_mass ?? null,
    };
  }, [latestMeasurement, patient, ageYears]);

  const cunninghamAvailable = energyInput ? canUseCunningham(energyInput) : false;

  const resolvedFormula: EnergyFormula = (energyFormula === "cunningham" && !cunninghamAvailable)
    ? "mifflin"
    : energyFormula;

  const energyResult  = energyInput ? calcEnergy(energyInput, resolvedFormula, activityLevel) : null;
  const suggestedKcal = energyResult ? applyAdjustment(energyResult.get, adjustment) : null;

  // ── Clinical alerts ───────────────────────────────────────────────────────
  const clinicalAlerts = generateClinicalAlerts(anamnesis, latestMeasurement);

  // ── Diet audit ────────────────────────────────────────────────────────────
  const audit = auditDiet({
    totalKcal:    grand.cal,
    totalProtein: grand.prot,
    goalKcal:     plan.daily_calories,
    weightKg:     latestMeasurement?.weight,
  });

  if (loading || ctxLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 size={24} className="animate-spin text-primary" />
          <p className="text-sm">Carregando plano…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 flex items-center gap-2 sm:gap-3 py-3">
          <Link to={`/admin/pacientes/${id}?tab=planos`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 p-1">
            <ArrowLeft size={16} />
          </Link>

          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <FileText size={14} className="text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              value={plan.title}
              onChange={(e) => setPF("title", e.target.value)}
              className="text-sm font-semibold bg-transparent border-0 border-b border-transparent hover:border-border focus:border-primary focus:outline-none flex-1 min-w-0 py-0.5 text-foreground"
              placeholder="Título do plano"
            />
            {isNew && <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70 flex-shrink-0">Novo</span>}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowEmail(true)}
              disabled={isNew}
              title={isNew ? "Salve o plano primeiro" : "Enviar por e-mail"}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Mail size={13} />
              <span className="hidden sm:inline">Enviar</span>
            </button>
            <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5 px-3">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              <span className="hidden xs:inline sm:inline">{saving ? "Salvando…" : "Salvar"}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Metadados ───────────────────────────────────────────────────── */}
        <section className="bg-card border border-border/60 rounded-lg p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-4">Dados do Plano</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Início</Label>
              <Input type="date" value={plan.start_date ?? ""} onChange={(e) => setPF("start_date", e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Término</Label>
              <Input type="date" value={plan.end_date ?? ""} onChange={(e) => setPF("end_date", e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Meta calórica diária (kcal)</Label>
              <Input type="number" min={0} step={50} placeholder="Ex.: 1800"
                value={plan.daily_calories !== undefined ? String(plan.daily_calories) : ""}
                onChange={(e) => setPF("daily_calories", e.target.value === "" ? undefined : parseFloat(e.target.value))}
                className="h-8 text-sm" />
            </div>
            <div className="sm:col-span-3 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Observações / Restrições</Label>
              <textarea rows={2} placeholder="Orientações gerais, substituições permitidas, alergias…"
                value={plan.notes ?? ""} onChange={(e) => setPF("notes", e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
            </div>
          </div>
        </section>

        {/* ── Alertas Clínicos da Anamnese ────────────────────────────────── */}
        <ClinicalInsightsPanel alerts={clinicalAlerts} />

        {/* ── Painel de Metas Energéticas ─────────────────────────────────── */}
        <section className="bg-card border border-border/60 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/60 bg-muted/30">
            <Zap size={14} className="text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Motor de Gasto Energético</p>
          </div>

          {!energyInput ? (
            <div className="flex items-center gap-2.5 px-5 py-4 text-sm text-muted-foreground">
              <Info size={14} className="shrink-0" />
              Registre uma avaliação antropométrica com peso, altura e gênero do paciente para calcular o GET automaticamente.
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {/* Linha 1: fórmula + nível de atividade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Fórmula</Label>
                  <div className="flex gap-2 flex-wrap">
                    {([
                      ["mifflin",         "Mifflin-St Jeor"],
                      ["harris_benedict", "Harris-Benedict"],
                      ...(cunninghamAvailable ? [["cunningham", "Cunningham (MLG)"]] as [EnergyFormula, string][] : []),
                    ] as [EnergyFormula, string][]).map(([val, label]) => (
                      <button key={val} type="button" onClick={() => setEnergyFormula(val)}
                        className={cn("flex-1 h-8 rounded-md text-xs font-medium border transition-all min-w-[120px]",
                          resolvedFormula === val
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:border-primary/50")}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {cunninghamAvailable && resolvedFormula === "cunningham" && (
                    <p className="text-[10px] text-muted-foreground">
                      MLG: <strong className="text-foreground">{latestMeasurement!.lean_mass} kg</strong> — TMB = 500 + 22 × MLG
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Nível de atividade</Label>
                  <select
                    value={activityLevel}
                    onChange={e => setActivityLevel(e.target.value as ActivityLevel)}
                    className="w-full h-8 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                  >
                    {ACTIVITY_OPTIONS.map(o => (
                      <option key={o.key} value={o.key}>{o.label} — {o.description}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Linha 2: TMB / GET / ajuste */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg bg-muted/40 border border-border/60 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">TMB</p>
                  <p className="text-xl font-bold tabular-nums text-foreground mt-0.5">{energyResult!.tmb} <span className="text-xs font-normal text-muted-foreground">kcal</span></p>
                </div>
                <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">GET</p>
                  <p className="text-xl font-bold tabular-nums text-foreground mt-0.5">{energyResult!.get} <span className="text-xs font-normal text-muted-foreground">kcal</span></p>
                </div>

                {/* Slider de ajuste */}
                <div className="sm:col-span-2 rounded-lg bg-muted/40 border border-border/60 px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {adjustment < 0 ? "Déficit" : adjustment > 0 ? "Superávit" : "Manutenção"}
                    </p>
                    <span className={cn("text-xs font-bold tabular-nums",
                      adjustment < 0 ? "text-blue-600" : adjustment > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                      {adjustment > 0 ? "+" : ""}{adjustment}%
                    </span>
                  </div>
                  <input type="range" min={-40} max={40} step={5} value={adjustment}
                    onChange={e => setAdjustment(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer" />
                  <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                    <span>−40% (corte agressivo)</span><span>+40% (bulk)</span>
                  </div>
                </div>
              </div>

              {/* Linha 3: sugestão e botão aplicar */}
              <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/60 flex-wrap">
                <div className="flex items-center gap-3">
                  {adjustment < 0 ? <TrendingDown size={16} className="text-blue-500 shrink-0" /> : adjustment > 0 ? <TrendingUp size={16} className="text-emerald-500 shrink-0" /> : <Zap size={16} className="text-primary shrink-0" />}
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Meta calórica sugerida</p>
                    <p className="text-2xl font-bold tabular-nums text-foreground">{suggestedKcal} <span className="text-sm font-normal text-muted-foreground">kcal/dia</span></p>
                  </div>
                </div>
                <Button type="button" size="sm" variant="outline"
                  onClick={() => setPF("daily_calories", suggestedKcal ?? undefined)}
                  className="gap-1.5 shrink-0">
                  Aplicar ao plano
                </Button>
              </div>

              {/* Dados usados no cálculo */}
              <p className="text-[10px] text-muted-foreground">
                Calculado com: {energyInput!.weight} kg · {energyInput!.height} cm · {energyInput!.age} anos · {energyInput!.gender === "F" ? "Feminino" : "Masculino"}
                {energyInput!.lean_mass ? ` · MLG ${energyInput!.lean_mass} kg` : ""}
                {" "}— avaliação mais recente
                {latestMeasurement?.id && (
                  <span className="ml-1 opacity-50">(avaliação #{latestMeasurement.id})</span>
                )}
              </p>
            </div>
          )}
        </section>

        {/* ── Planejamento Dietético (travamento de macros) ───────────────── */}
        <DietaryPlanningPanel
          weightKg={latestMeasurement?.weight}
          totalKcal={plan.daily_calories}
          actual={grand}
          onGoalsChange={setMacroGoals}
        />

        {/* ── Resumo nutricional ──────────────────────────────────────────── */}
        <section className="bg-card border border-border/60 rounded-lg p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-4">Resumo Nutricional do Dia</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-0 sm:divide-x sm:divide-border/60 mb-5">
            {[
              { label: "Energia total",  value: grand.cal   > 0 ? `${n0(grand.cal)} kcal`  : "— kcal" },
              { label: "Proteínas",      value: grand.prot  > 0 ? `${n1(grand.prot)} g`    : "— g"    },
              { label: "Carboidratos",   value: grand.carbs > 0 ? `${n1(grand.carbs)} g`   : "— g"    },
              { label: "Gorduras",       value: grand.fat   > 0 ? `${n1(grand.fat)} g`     : "— g"    },
            ].map(({ label, value }) => (
              <div key={label} className="sm:px-4 sm:first:pl-0 sm:last:pr-0 bg-muted/20 sm:bg-transparent rounded-lg sm:rounded-none p-3 sm:p-0">
                <p className="text-[10px] text-primary uppercase tracking-wider mb-1.5">{label}</p>
                <p className="text-xl font-bold tabular-nums text-foreground leading-none">{value}</p>
              </div>
            ))}
          </div>

          {/* Alertas de auditoria */}
          {grand.cal > 0 && (audit.proteinExcess || audit.calorieOverage || audit.calorieDeficit) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {audit.proteinExcess && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700">
                  <AlertTriangle size={12} className="shrink-0" />
                  <span className="text-xs font-semibold">
                    Proteína elevada — {audit.proteinGPerKg} g/kg (limite: 2,5 g/kg)
                  </span>
                </div>
              )}
              {audit.calorieOverage && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700">
                  <AlertTriangle size={12} className="shrink-0" />
                  <span className="text-xs font-semibold">
                    Calorias acima da meta — {audit.caloriePct}% da meta
                  </span>
                </div>
              )}
              {audit.calorieDeficit && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
                  <TrendingDown size={12} className="shrink-0" />
                  <span className="text-xs font-semibold">
                    Calorias abaixo de 90% da meta — {audit.caloriePct}%
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Barras de macros */}
          <div className="space-y-2 mb-4">
            {macroGoals ? (
              [
                { label: "Proteínas",    actual: grand.prot,  goal: macroGoals.protein_g, color: "bg-blue-500"  },
                { label: "Carboidratos", actual: grand.carbs, goal: macroGoals.carbs_g,   color: "bg-amber-400" },
                { label: "Gorduras",     actual: grand.fat,   goal: macroGoals.fat_g,     color: "bg-rose-400"  },
              ].map(({ label, actual, goal, color }) => {
                const pct   = goal > 0 ? Math.min((actual / goal) * 100, 100) : 0;
                const over  = goal > 0 && actual > goal * 1.08;
                const onTgt = goal > 0 && actual >= goal * 0.92 && actual <= goal * 1.08;
                return (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500",
                          over ? "bg-red-500" : onTgt ? "bg-emerald-500" : color)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground w-28 text-right">
                      {actual.toFixed(1)}g / {goal.toFixed(0)}g
                    </span>
                  </div>
                );
              })
            ) : (
              (() => {
                const totalCal = grand.cal || 1;
                return [
                  { label: "Proteínas",    pct: Math.round((grand.prot  * 4 / totalCal) * 100) },
                  { label: "Carboidratos", pct: Math.round((grand.carbs * 4 / totalCal) * 100) },
                  { label: "Gorduras",     pct: Math.round((grand.fat   * 9 / totalCal) * 100) },
                ].map(({ label, pct }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${grand.cal > 0 ? pct : 0}%` }} />
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">
                      {grand.cal > 0 ? `${pct}%` : "0%"}
                    </span>
                  </div>
                ));
              })()
            )}
          </div>

          {/* Barra de progresso calórico */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Progresso calórico{plan.daily_calories ? <> — meta: <strong>{plan.daily_calories} kcal</strong></> : null}
            </span>
            <span className={`text-xs font-semibold tabular-nums ${plan.daily_calories && grand.cal > plan.daily_calories ? "text-destructive" : "text-foreground"}`}>
              {goalPct}%
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-border overflow-hidden mt-1.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${plan.daily_calories && grand.cal > plan.daily_calories ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${goalPct}%` }}
            />
          </div>
        </section>

        {/* ── Refeições ───────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Refeições — {meals.length} cadastradas
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setShowTemplate(true)}
                className="flex items-center gap-1.5 text-xs font-medium border border-border rounded-lg px-3 py-1.5 text-foreground hover:bg-muted/60 transition-colors">
                <LayoutList size={13} />
                <span className="hidden sm:inline">Importar template</span>
                <span className="sm:hidden">Template</span>
              </button>
              <button type="button" onClick={addMeal}
                className="flex items-center gap-1.5 text-xs font-medium border border-border rounded-lg px-3 py-1.5 text-foreground hover:bg-muted/60 transition-colors">
                <Plus size={13} />
                Nova refeição
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {meals.map((meal, i) => (
              <MealSection key={i} meal={meal} idx={i}
                onUpdate={(m) => updateMeal(i, m)}
                onRemove={() => removeMeal(i)}
              />
            ))}
          </div>
        </div>

        {/* ── Salvar ──────────────────────────────────────────────────────── */}
        <div className="flex justify-end pb-8">
          <Button onClick={handleSave} disabled={saving} className="gap-2 px-6">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Salvando…" : "Salvar plano alimentar"}
          </Button>
        </div>
      </main>

      {/* ── Modal de e-mail ─────────────────────────────────────────────── */}
      {showEmail && (
        <EmailPlanModal
          plan={plan}
          meals={meals.map((m) => editorToMeal(m, plan.id ?? 0))}
          patient={patient}
          onClose={() => setShowEmail(false)}
        />
      )}

      {/* ── Modal de importação de template ─────────────────────────────── */}
      <TemplateImportModal
        open={showTemplate}
        hasMeals={meals.some((m) => m.foods.length > 0)}
        onClose={() => setShowTemplate(false)}
        onImport={handleTemplateImport}
      />
    </div>
  );
}
