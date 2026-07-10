import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Plus, Save, Loader2, FileText, Mail, Zap, Soup, ChevronUp, ChevronDown,
  AlertTriangle, TrendingDown, TrendingUp, Info, LayoutList, Printer, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  fetchFullMealPlan, saveMeals, upsertMealPlan, fetchMealPlans,
  upsertMealPreset, saveMealPresetFoods,
  type Meal, type MealFood, type MealPlan, type MealPresetFood, type AlternativeMeal
} from "@/lib/supabase";
import {
  MealSection, EditorMeal, sumFoods, n0, n1, getMealCalorieTargets, type AlternativeMealDraft
} from "@/components/admin/MealTableEditor";
import { EmailPlanModal } from "@/components/admin/EmailPlanModal";
import { ClinicalInsightsPanel } from "@/components/admin/ClinicalInsightsPanel";
import { DietaryPlanningPanel } from "@/components/admin/DietaryPlanningPanel";
import { MealPlanPdfOptionsDialog } from "@/components/admin/MealPlanPdfOptionsDialog";
import { TemplateImportModal } from "@/components/admin/TemplateImportModal";
import { MealPresetImportModal } from "@/components/admin/MealPresetImportModal";
import { useConsultation } from "@/contexts/ConsultationContext";
import { generateClinicalAlerts } from "@/lib/clinicalAlertsUtils";
import { generateMealPlanPdf } from "@/lib/generateMealPlanPdf";
import {
  getMealNutritionTargets,
  generateMealPlanConsistencyAlerts,
  type MacroGoals,
} from "@/lib/planningUtils";
import {
  calcEnergy, applyAdjustment, auditDiet,
  canUseCunningham,
  ACTIVITY_OPTIONS,
  type EnergyFormula, type ActivityLevel,
} from "@/lib/energyUtils";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_MEALS = [
  { meal_name: "Café da manhã",   time_suggestion: "07:00 - 08:00" },
  { meal_name: "Lanche da manhã", time_suggestion: "10:00 - 10:30" },
  { meal_name: "Almoço",          time_suggestion: "12:00 - 13:00" },
  { meal_name: "Lanche da tarde", time_suggestion: "15:30 - 16:00" },
  { meal_name: "Jantar",          time_suggestion: "19:00 - 20:00" },
  { meal_name: "Ceia",            time_suggestion: "21:30 - 22:00" },
];

// ─── Converters: Meal ⇄ EditorMeal ───────────────────────────────────────────

const mealToEditor = (m: Meal): EditorMeal => ({
  _dbId:              m.id,
  meal_name:          m.meal_name,
  time_suggestion:    m.time_suggestion,
  notes:              m.notes,
  foods:              (m.foods ?? []) as MealFood[],
  substitution_items: m.substitution_items ?? [],
  alternative_meals:  (m.alternative_meals ?? []) as AlternativeMealDraft[],
});

const editorToMeal = (m: EditorMeal, planId: number): Meal => ({
  id:                 m._dbId,
  plan_id:            planId,
  meal_name:          m.meal_name,
  time_suggestion:    m.time_suggestion,
  notes:              m.notes,
  foods:              m.foods,
  substitution_items: m.substitution_items ?? [],
  alternative_meals:  (m.alternative_meals ?? []) as AlternativeMeal[],
});


// â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function AdminPlanoAlimentar() {
  const { id, planId } = useParams<{ id: string; planId: string }>();
  const navigate = useNavigate();

  const patientId       = Number(id);
  const resolvedPlanId  = Number(planId);
  const isNew           = planId === "novo";

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
  const [templateScope, setTemplateScope] = useState<"plan" | "meal">("plan");
  const [templateTargetMealIndex, setTemplateTargetMealIndex] = useState<number | null>(null);
  const [showMealPresetImport, setShowMealPresetImport] = useState(false);
  const [presetTargetMealIndex, setPresetTargetMealIndex] = useState(0);
  const [showCloneConfirm, setShowCloneConfirm] = useState(false);
  const [showSaveMealPresetDialog, setShowSaveMealPresetDialog] = useState(false);
  const [mealPresetSourceMealIndex, setMealPresetSourceMealIndex] = useState<number | null>(null);
  const [mealPresetDraftName, setMealPresetDraftName] = useState("");
  const [mealPresetDraftDescription, setMealPresetDraftDescription] = useState("");
  const [savingMealPreset, setSavingMealPreset] = useState(false);
  const [showPdfOptions, setShowPdfOptions] = useState(false);
  const [macroGoals, setMacroGoals]     = useState<MacroGoals | null>(null);
  const [previousPlan, setPreviousPlan]  = useState<MealPlan | null>(null);

  const [energyFormula, setEnergyFormula] = useState<EnergyFormula>("mifflin");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [adjustment, setAdjustment]       = useState(0);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    try {
      const plans = await fetchMealPlans(patientId);
      const priorPlan = plans.find((p) => (isNew ? true : p.id !== resolvedPlanId)) ?? null;
      setPreviousPlan(priorPlan);

      if (isNew) {
        setMeals(DEFAULT_MEALS.map((p) => ({ meal_name: p.meal_name, time_suggestion: p.time_suggestion, foods: [] })));
        return;
      }

      const loadedMeals = await fetchFullMealPlan(resolvedPlanId);
      const found = plans.find((p) => p.id === resolvedPlanId);
      if (found) setPlan(found);
      setMeals(
        loadedMeals.length > 0
          ? loadedMeals.map(mealToEditor)
          : DEFAULT_MEALS.map((p) => ({ meal_name: p.meal_name, time_suggestion: p.time_suggestion, foods: [] }))
      );
    } catch { toast.error("Erro ao carregar o plano."); }
    finally { setLoading(false); }
  }, [isNew, patientId, resolvedPlanId]);

  useEffect(() => { loadPlan(); }, [loadPlan]);

  useEffect(() => {
    if (presetTargetMealIndex >= meals.length) {
      setPresetTargetMealIndex(0);
    }
  }, [meals.length, presetTargetMealIndex]);

  const handleClonePreviousPlan = () => {
    if (!previousPlan?.id) {
      toast.info("Nenhum plano anterior encontrado para clonar.");
      return;
    }
    setShowCloneConfirm(true);
  };

  const confirmClonePreviousPlan = async () => {
    if (!previousPlan?.id) {
      toast.info("Nenhum plano anterior encontrado para clonar.");
      setShowCloneConfirm(false);
      return;
    }

    const sourceMeals = await fetchFullMealPlan(previousPlan.id);
    setPlan((current) => ({
      ...current,
      title: previousPlan.title ? `${previousPlan.title} (cópia)` : current.title,
      start_date: previousPlan.start_date ?? current.start_date,
      end_date: previousPlan.end_date ?? current.end_date,
      daily_calories: previousPlan.daily_calories ?? current.daily_calories,
      notes: previousPlan.notes ?? current.notes,
      strategy_type: previousPlan.strategy_type ?? current.strategy_type,
      target_calories: previousPlan.target_calories ?? current.target_calories,
      target_protein_g: previousPlan.target_protein_g ?? current.target_protein_g,
      target_carbs_g: previousPlan.target_carbs_g ?? current.target_carbs_g,
      target_fat_g: previousPlan.target_fat_g ?? current.target_fat_g,
      measurement_id: previousPlan.measurement_id ?? current.measurement_id,
      get_kcal: previousPlan.get_kcal ?? current.get_kcal,
    }));
    setMeals(
      sourceMeals.length > 0
        ? sourceMeals.map(mealToEditor)
        : DEFAULT_MEALS.map((p) => ({ meal_name: p.meal_name, time_suggestion: p.time_suggestion, foods: [] }))
    );
    toast.success("Plano anterior clonado para o rascunho atual.");
    setShowCloneConfirm(false);
  };

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
    const saveErr = await saveMeals(savedPlan.id, dbMeals);
    setSaving(false);
    if (saveErr) { toast.error(`Erro ao salvar as refeições: ${saveErr}`); return; }
    toast.success("Plano salvo com sucesso.");
    if (isNew) navigate(`/admin/pacientes/${id}/plano/${savedPlan.id}`, { replace: true });
  };

  const normalizeFilePart = (value: string | undefined) =>
    (value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const buildPdfFileName = () =>
    `${normalizeFilePart(plan.title) || "plano-alimentar"}-${normalizeFilePart(patient?.name) || "paciente"}.pdf`;

  const openPdfOptions = () => {
    if (isNew || !plan.id) {
      toast.info('Salve o plano antes de gerar o PDF.');
      return;
    }
    setShowPdfOptions(true);
  };

  const confirmDownloadPdf = (
    selectedAlternatives: Record<number, number[]>,
    substitutionLayout: "stacked" | "columns",
  ) => {
    if (isNew || !plan.id) {
      toast.info('Salve o plano antes de gerar o PDF.');
      return;
    }

    try {
      const doc = generateMealPlanPdf(
        plan,
        meals.map((m) => editorToMeal(m, plan.id ?? 0)),
        patient,
        { selectedAlternatives, substitutionLayout },
      );
      doc.save(buildPdfFileName());
      toast.success('PDF gerado com sucesso.');
      setShowPdfOptions(false);
    } catch (error) {
      toast.error('N?o foi poss?vel gerar o PDF.');
      console.error('[AdminPlanoAlimentar] confirmDownloadPdf:', error);
    }
  };

  const updateMeal = (i: number, m: EditorMeal) =>
    setMeals((prev) => { const n = [...prev]; n[i] = m; return n; });
  const removeMeal = (i: number) =>
    setMeals((prev) => prev.filter((_, fi) => fi !== i));
  const addMeal = () =>
    setMeals((prev) => [...prev, { meal_name: "Nova refeição", time_suggestion: "", foods: [] }]);
  const moveMeal = (from: number, to: number) => {
    setMeals((prev) => {
      if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };
  const duplicateMeal = (i: number) => {
    setMeals((prev) => {
      const source = prev[i];
      if (!source) return prev;
      const clone: EditorMeal = {
        ...source,
        _dbId: undefined,
        meal_name: source.meal_name.trim() ? `${source.meal_name} (cópia)` : "Nova refeição",
        foods: source.foods.map((food) => ({ ...food })),
        substitution_items: source.substitution_items?.map((item) => ({ ...item })),
        alternative_meals: source.alternative_meals?.map((alt) => ({
          ...alt,
          foods: alt.foods.map((food) => ({ ...food })),
        })),
        substitutions: source.substitutions?.map((sub) => ({
          ...sub,
          _dbId: undefined,
          foods: sub.foods.map((food) => ({ ...food })),
          substitution_items: sub.substitution_items?.map((item) => ({ ...item })),
          substitutions: sub.substitutions?.map((nested) => ({
            ...nested,
            _dbId: undefined,
            foods: nested.foods.map((food) => ({ ...food })),
            substitution_items: nested.substitution_items?.map((item) => ({ ...item })),
          })),
        })),
      };
      const next = [...prev];
      next.splice(i + 1, 0, clone);
      return next;
    });
    toast.success("Refeição duplicada no plano atual.");
  };
  const openSaveMealPresetDialog = (i: number) => {
    const source = meals[i];
    if (!source) return;
    setMealPresetSourceMealIndex(i);
    setMealPresetDraftName(source.meal_name?.trim() || `Refeição ${i + 1}`);
    setMealPresetDraftDescription(`Modelo salvo a partir do plano ${plan.title || "atual"}.`);
    setShowSaveMealPresetDialog(true);
  };

  const confirmSaveMealAsPreset = async () => {
    if (mealPresetSourceMealIndex == null) return;
    const source = meals[mealPresetSourceMealIndex];
    if (!source) return;
    if (source.foods.length === 0) {
      toast.error("Adicione ao menos um alimento para salvar como modelo.");
      return;
    }

    const name = mealPresetDraftName.trim();
    if (!name) {
      toast.error("Informe um nome para o modelo.");
      return;
    }

    const totals = sumFoods(source.foods);
    const foods: MealPresetFood[] = source.foods
      .filter((food) => food.food_name.trim() !== "")
      .map((food, sort_order) => ({
        preset_id: 0,
        food_name: food.food_name,
        quantity: food.quantity,
        unit: food.unit,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        notes: food.notes,
        sort_order,
        household_measure: food.household_measure,
        measure_amount: food.measure_amount,
        food_group: food.food_group,
      }));

    setSavingMealPreset(true);
    try {
      const savedPreset = await upsertMealPreset({
        name,
        description: mealPresetDraftDescription.trim() || undefined,
        meal_name: source.meal_name.trim() || name,
        time_suggestion: source.time_suggestion || undefined,
        notes: source.notes || undefined,
        strategy: plan.strategy_type || undefined,
        total_kcal: totals.cal > 0 ? parseFloat(totals.cal.toFixed(1)) : undefined,
        protein_g: totals.prot > 0 ? parseFloat(totals.prot.toFixed(1)) : undefined,
        carbs_g: totals.carbs > 0 ? parseFloat(totals.carbs.toFixed(1)) : undefined,
        fat_g: totals.fat > 0 ? parseFloat(totals.fat.toFixed(1)) : undefined,
        is_active: true,
      });

      if (!savedPreset?.id) {
        toast.error("Erro ao salvar o modelo.");
        return;
      }

      const ok = await saveMealPresetFoods(savedPreset.id, foods.map((food) => ({
        ...food,
        preset_id: savedPreset.id,
      })));

      if (!ok) {
        toast.error("Modelo criado, mas houve erro ao salvar os alimentos.");
        return;
      }

      toast.success("Modelo de refeição salvo para reutilização.");
      setShowSaveMealPresetDialog(false);
    } finally {
      setSavingMealPreset(false);
    }
  };
  const setPF = <K extends keyof MealPlan>(k: K, v: MealPlan[K]) =>
    setPlan((p) => ({ ...p, [k]: v }));

  const handleTemplateImport = (importedMeals: Meal[], mode: "replace" | "append") => {
    const editorMeals = importedMeals.map(mealToEditor);
    setMeals((prev) => mode === "replace" ? editorMeals : [...prev, ...editorMeals]);
  };

  const handleMealPresetImport = (importedMeal: Meal, mode: "replace" | "append") => {
    if (presetTargetMealIndex == null) return;
    setMeals((prev) => {
      const next = [...prev];
      const current = next[presetTargetMealIndex];
      if (!current) return prev;

      if (mode === "replace") {
        next[presetTargetMealIndex] = mealToEditor(importedMeal);
        return next;
      }

      next[presetTargetMealIndex] = {
        ...current,
        meal_name: current.meal_name.trim() ? current.meal_name : importedMeal.meal_name,
        time_suggestion: current.time_suggestion || importedMeal.time_suggestion,
        notes: current.notes ?? importedMeal.notes,
        foods: [...(current.foods ?? []), ...(importedMeal.foods ?? [])],
      };
      return next;
    });
  };

  const grand = meals.reduce(
    (a, m) => { const t = sumFoods(m.foods); return { cal: a.cal + t.cal, prot: a.prot + t.prot, carbs: a.carbs + t.carbs, fat: a.fat + t.fat }; },
    { cal: 0, prot: 0, carbs: 0, fat: 0 }
  );

  const mealTargets = useMemo(
    () => getMealCalorieTargets(meals, plan.daily_calories),
    [meals, plan.daily_calories]
  );

  const presetTargetCalories = mealTargets[presetTargetMealIndex]?.targetCalories;
  const presetMealNames = meals.map((meal) => meal.meal_name || "Refeição");

  const mealNutritionTargets = useMemo(
    () => (macroGoals ? getMealNutritionTargets(meals, macroGoals) : []),
    [meals, macroGoals]
  );

  const consistencyAlerts = useMemo(
    () => generateMealPlanConsistencyAlerts({
      plan,
      meals,
      mealTargets,
      macroGoals,
    }),
    [plan, meals, mealTargets, macroGoals]
  );

  const goalPct = plan.daily_calories && grand.cal > 0
    ? Math.min(100, Math.round((grand.cal / plan.daily_calories) * 100))
    : 0;

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

  const clinicalAlerts = generateClinicalAlerts(anamnesis, latestMeasurement);

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
          <p className="text-sm">Carregando plano...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">

      {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
              onClick={openPdfOptions}
              disabled={isNew}
              title={isNew ? "Salve o plano primeiro" : "Baixar PDF"}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Printer size={13} />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
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
            <button
              type="button"
              onClick={handleClonePreviousPlan}
              disabled={!previousPlan?.id}
              title={!previousPlan?.id ? "Nenhum plano anterior disponível" : "Clonar o plano anterior"}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Copy size={13} />
              <span className="hidden sm:inline">Clonar anterior</span>
            </button>
            <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5 px-3">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              <span className="hidden xs:inline sm:inline">{saving ? "Salvando..." : "Salvar"}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* â”€â”€ Metadados â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
              <textarea rows={2} placeholder="Orientações gerais, substituições permitidas, alergias..."
                value={plan.notes ?? ""} onChange={(e) => setPF("notes", e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
            </div>
          </div>
        </section>

        {/* Alertas Clínicos da Anamnese */}
        <ClinicalInsightsPanel alerts={clinicalAlerts} />

        {/* Alertas de inconsistência do plano */}
        <ClinicalInsightsPanel
          alerts={consistencyAlerts}
          defaultOpen={false}
          title="Alertas de Inconsistencia do Plano"
          subtitle="Gerado automaticamente a partir da distribuição, metas e refeições do plano."
        />

        {/* Painel de Metas Energéticas */}
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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg bg-muted/40 border border-border/60 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">TMB</p>
                  <p className="text-xl font-bold tabular-nums text-foreground mt-0.5">{energyResult!.tmb} <span className="text-xs font-normal text-muted-foreground">kcal</span></p>
                </div>
                <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">GET</p>
                  <p className="text-xl font-bold tabular-nums text-foreground mt-0.5">{energyResult!.get} <span className="text-xs font-normal text-muted-foreground">kcal</span></p>
                </div>

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
                    <span>âˆ’40% (corte agressivo)</span><span>+40% (bulk)</span>
                  </div>
                </div>
              </div>

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

        {/* Planejamento Dietético (travamento de macros) */}
        <DietaryPlanningPanel
          weightKg={latestMeasurement?.weight}
          totalKcal={plan.daily_calories}
          actual={grand}
          onGoalsChange={setMacroGoals}
        />

        {/* â”€â”€ Resumo nutricional â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

        {plan.daily_calories && mealTargets.length > 0 && (
          <section className="bg-card border border-border/60 rounded-lg p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-4">
              Distribuição sugerida por refeição
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {meals.map((meal, idx) => {
                const target = mealTargets[idx];
                const macroTarget = mealNutritionTargets[idx];
                if (!target) return null;
                const actual = sumFoods(meal.foods).cal;
                const actualMacros = sumFoods(meal.foods);
                const pct = target.targetCalories > 0 ? Math.round((actual / target.targetCalories) * 100) : 0;
                const status =
                  actual >= target.targetCalories * 0.9 && actual <= target.targetCalories * 1.1
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : actual > target.targetCalories * 1.1
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-amber-200 bg-amber-50 text-amber-700";

                return (
                  <div key={`${meal.meal_name}-${idx}`} className={`rounded-xl border px-4 py-3 ${status}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {meal.meal_name || `Refeição ${idx + 1}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {Math.round(target.share * 100)}% do total diário
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold tabular-nums">{n0(target.targetCalories)} kcal</p>
                        {actual > 0 && (
                          <p className="text-[10px] tabular-nums">
                            atual {n0(actual)} kcal · {pct}%
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-white/70 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-current transition-all duration-500"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    {macroTarget && (
                      <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                        <div className="rounded-md bg-white/70 px-2 py-1">
                          <p className="text-muted-foreground uppercase tracking-wider">PTN</p>
                          <p className="font-semibold tabular-nums text-foreground">
                            {n1(actualMacros.prot)} / {n1(macroTarget.protein_g)} g
                          </p>
                        </div>
                        <div className="rounded-md bg-white/70 px-2 py-1">
                          <p className="text-muted-foreground uppercase tracking-wider">CHO</p>
                          <p className="font-semibold tabular-nums text-foreground">
                            {n1(actualMacros.carbs)} / {n1(macroTarget.carbs_g)} g
                          </p>
                        </div>
                        <div className="rounded-md bg-white/70 px-2 py-1">
                          <p className="text-muted-foreground uppercase tracking-wider">LIP</p>
                          <p className="font-semibold tabular-nums text-foreground">
                            {n1(actualMacros.fat)} / {n1(macroTarget.fat_g)} g
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Refeições */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Refeições — {meals.length} cadastradas
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => {
                setTemplateScope("plan");
                setTemplateTargetMealIndex(null);
                setShowTemplate(true);
              }}
                className="flex items-center gap-1.5 text-xs font-medium border border-border rounded-lg px-3 py-1.5 text-foreground hover:bg-muted/60 transition-colors">
                <LayoutList size={13} />
                <span className="hidden sm:inline">Importar dieta</span>
                <span className="sm:hidden">Dieta</span>
              </button>
              <button type="button" onClick={() => setShowMealPresetImport(true)}
                className="flex items-center gap-1.5 text-xs font-medium border border-border rounded-lg px-3 py-1.5 text-foreground hover:bg-muted/60 transition-colors">
                <Soup size={13} />
                <span className="hidden sm:inline">Importar refeição</span>
                <span className="sm:hidden">Refeição</span>
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
              <div key={i} className="space-y-2">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => moveMeal(i, Math.max(0, i - 1))}
                    disabled={i === 0}
                    className="flex items-center gap-1.5 text-[11px] font-medium border border-border rounded-lg px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronUp size={12} />
                    Subir
                  </button>
                  <button
                    type="button"
                    onClick={() => moveMeal(i, Math.min(meals.length - 1, i + 1))}
                    disabled={i === meals.length - 1}
                    className="flex items-center gap-1.5 text-[11px] font-medium border border-border rounded-lg px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronDown size={12} />
                    Descer
                  </button>
                  <button
                    type="button"
                    onClick={() => moveMeal(i, 0)}
                    disabled={i === 0}
                    className="flex items-center gap-1.5 text-[11px] font-medium border border-border rounded-lg px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronUp size={12} />
                    Topo
                  </button>
                  <button
                    type="button"
                    onClick={() => moveMeal(i, meals.length - 1)}
                    disabled={i === meals.length - 1}
                    className="flex items-center gap-1.5 text-[11px] font-medium border border-border rounded-lg px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronDown size={12} />
                    Fim
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateMeal(i)}
                    className="flex items-center gap-1.5 text-[11px] font-medium border border-border rounded-lg px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Copy size={12} />
                    Duplicar refeição
                  </button>
                  <button
                    type="button"
                    onClick={() => openSaveMealPresetDialog(i)}
                    className="flex items-center gap-1.5 text-[11px] font-medium border border-border rounded-lg px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <LayoutList size={12} />
                    Salvar como modelo
                  </button>
                </div>
                <MealSection key={i} meal={meal} idx={i}
                  resetKey={plan.id ?? resolvedPlanId}
                  onUpdate={(m) => updateMeal(i, m)}
                  onRemove={() => removeMeal(i)}
                  targetCalories={mealTargets[i]?.targetCalories}
                />
              </div>
            ))}
          </div>
        </div>

        {/* â”€â”€ Salvar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="flex justify-end pb-8">
          <Button onClick={handleSave} disabled={saving} className="gap-2 px-6">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Salvando..." : "Salvar plano alimentar"}
          </Button>
        </div>
      </main>

      <AlertDialog open={showCloneConfirm} onOpenChange={setShowCloneConfirm}>
        <AlertDialogContent className="max-w-xl overflow-hidden rounded-3xl border-border/60 p-0">
          <div className="bg-gradient-to-br from-primary/10 via-card to-amber-500/10 px-6 pt-6 pb-5">
            <AlertDialogHeader className="space-y-4 text-left sm:text-left">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-600 shadow-sm">
                  <Copy className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <AlertDialogTitle className="text-xl font-semibold tracking-tight">
                    Clonar plano anterior
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
                    O conteúdo do rascunho atual será substituído pelas informações do último plano salvo para este paciente.
                    Você ainda poderá editar tudo depois de importar.
                  </AlertDialogDescription>
                </div>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div className="space-y-1">
                    <p className="font-medium">Atenção: isso vai sobrescrever o rascunho atual.</p>
                    <p className="text-muted-foreground">
                      Refeições, observações e metas do plano anterior serão trazidas para a tela atual.
                    </p>
                  </div>
                </div>
              </div>
            </AlertDialogHeader>
          </div>
          <div className="px-6 pb-6 pt-5">
            <AlertDialogFooter className="gap-3 sm:gap-3">
              <AlertDialogCancel className="mt-0 rounded-xl border-border/70 px-4">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmClonePreviousPlan}
                className="rounded-xl bg-primary px-4 text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                Clonar plano
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showSaveMealPresetDialog} onOpenChange={setShowSaveMealPresetDialog}>
        <DialogContent className="max-w-xl rounded-3xl border-border/60">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-semibold">Salvar refeição como modelo</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              Este bloco ficará disponível para importar em outros pacientes e em consultas futuras.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="template_name" className="text-sm font-medium">Nome do modelo</Label>
              <Input
                id="template_name"
                value={mealPresetDraftName}
                onChange={(e) => setMealPresetDraftName(e.target.value)}
                className="h-11 rounded-2xl"
                placeholder="Ex.: Café da manhã prático"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template_description" className="text-sm font-medium">Descrição</Label>
              <textarea
                id="template_description"
                value={mealPresetDraftDescription}
                onChange={(e) => setMealPresetDraftDescription(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                placeholder="Ex.: bloco salvo para usar em consultas com rotina corrida."
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => setShowSaveMealPresetDialog(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={confirmSaveMealAsPreset} disabled={savingMealPreset} className="gap-2">
              {savingMealPreset ? <Loader2 size={14} className="animate-spin" /> : <LayoutList size={14} />}
              Salvar modelo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MealPlanPdfOptionsDialog
        open={showPdfOptions}
        meals={meals.map((m) => editorToMeal(m, plan.id ?? 0))}
        title="Escolher substitui??es do PDF"
        description="Marque quais op??es substitutas devem aparecer no PDF. Elas ser?o impressas abaixo da refei??o principal, em destaque."
        confirmLabel="Gerar PDF"
        emptyMessage="Nenhuma refei??o com substitui??o foi encontrada neste plano."
        onOpenChange={setShowPdfOptions}
        onConfirm={confirmDownloadPdf}
      />
      {showEmail && (
        <EmailPlanModal
          plan={plan}
          meals={meals.map((m) => editorToMeal(m, plan.id ?? 0))}
          patient={patient}
          onClose={() => setShowEmail(false)}
        />
      )}

      <TemplateImportModal
        open={showTemplate}
        scope={templateScope}
        targetMealLabel={templateTargetMealIndex != null ? meals[templateTargetMealIndex]?.meal_name : undefined}
        hasMeals={
          templateScope === "meal"
            ? !!(templateTargetMealIndex != null && meals[templateTargetMealIndex]?.foods?.some((food) => food.food_name.trim() !== ""))
            : meals.some((m) => m.foods.length > 0)
        }
        onClose={() => setShowTemplate(false)}
        onImport={handleTemplateImport}
      />

      <MealPresetImportModal
        open={showMealPresetImport}
        hasMeals={!!(meals[presetTargetMealIndex]?.foods?.some((food) => food.food_name.trim() !== ""))}
        mealNames={presetMealNames}
        targetMealIndex={presetTargetMealIndex}
        targetCalories={presetTargetCalories}
        onTargetMealIndexChange={setPresetTargetMealIndex}
        onClose={() => setShowMealPresetImport(false)}
        onImport={handleMealPresetImport}
      />

    </div>
  );
}


