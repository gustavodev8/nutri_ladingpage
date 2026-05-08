import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Save, Loader2, FileText, Mail, MessageSquare, Zap, AlertTriangle, TrendingDown, TrendingUp, Info, LayoutList, ChevronDown, ChevronUp, ArrowLeftRight } from "lucide-react";
import { FoodSearchInput } from "@/components/admin/FoodSearchInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  fetchFullMealPlan, saveMeals, upsertMealPlan, fetchMealPlans, fetchPatient,
  fetchMeasurements, fetchAnamnesis,
  type Meal, type MealFood, type MealPlan, type Patient, type Measurement, type Anamnesis,
} from "@/lib/supabase";
import { EmailPlanModal } from "@/components/admin/EmailPlanModal";
import { ClinicalInsightsPanel } from "@/components/admin/ClinicalInsightsPanel";
import { DietaryPlanningPanel } from "@/components/admin/DietaryPlanningPanel";
import { TemplateImportModal } from "@/components/admin/TemplateImportModal";
import { SmartSubstituteModal } from "@/components/admin/SmartSubstituteModal";
import { generateClinicalAlerts } from "@/lib/clinicalAlertsUtils";
import { type MacroGoals } from "@/lib/planningUtils";
import {
  calcEnergy, applyAdjustment, auditDiet,
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

const UNITS = ["g", "ml", "unid.", "col. sopa", "col. chá", "xícara", "fatia", "porção"];

// Left-border accent per meal — subtle, single color per slot
const MEAL_BORDER = [
  "border-l-slate-400",
  "border-l-teal-500",
  "border-l-indigo-400",
  "border-l-amber-500",
  "border-l-rose-400",
  "border-l-emerald-500",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sum = (foods: MealFood[]) =>
  foods.reduce(
    (a, f) => ({ cal: a.cal + (f.calories ?? 0), prot: a.prot + (f.protein ?? 0), carbs: a.carbs + (f.carbs ?? 0), fat: a.fat + (f.fat ?? 0) }),
    { cal: 0, prot: 0, carbs: 0, fat: 0 }
  );

const n1 = (v: number) => (v > 0 ? v.toFixed(1) : "—");
const n0 = (v: number) => (v > 0 ? Math.round(v).toString() : "—");

const calcMacros = (food: MealFood): MealFood => {
  const qty = food.quantity;
  if (!qty || !food.kcal_per_100g) return food;
  const f = qty / 100;
  return {
    ...food,
    calories: parseFloat(((food.kcal_per_100g  ?? 0) * f).toFixed(1)),
    protein:  parseFloat(((food.protein_per_100g ?? 0) * f).toFixed(1)),
    carbs:    parseFloat(((food.carbs_per_100g  ?? 0) * f).toFixed(1)),
    fat:      parseFloat(((food.fat_per_100g    ?? 0) * f).toFixed(1)),
  };
};

function emptyFood(): MealFood {
  return { meal_id: 0, food_name: "", quantity: undefined, unit: "g" };
}

// ─── Shared cell styles ───────────────────────────────────────────────────────

const cellNum = "h-8 w-full bg-transparent border border-border/60 rounded px-2 text-sm text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary";
const cellTxt = "h-8 w-full bg-transparent border border-border/60 rounded px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary";

// ─── Food group options ───────────────────────────────────────────────────────

const FOOD_GROUPS = ["Carboidrato", "Proteína", "Gordura", "Fruta", "Vegetal", "Laticínio", "Leguminosa", "Outro"];

// ─── FoodRow ──────────────────────────────────────────────────────────────────

function FoodRow({ food, idx, onChange, onRemove }: {
  food: MealFood; idx: number;
  onChange: (f: MealFood) => void; onRemove: () => void;
}) {
  const [showDetails, setShowDetails]   = useState(false);
  const [showSubstitute, setShowSubstitute] = useState(false);

  const handleSelect = (s: { name: string; kcal_per_100g: number; protein_per_100g: number; carbs_per_100g: number; fat_per_100g: number }) =>
    onChange(calcMacros({ ...food, food_name: s.name, kcal_per_100g: s.kcal_per_100g, protein_per_100g: s.protein_per_100g, carbs_per_100g: s.carbs_per_100g, fat_per_100g: s.fat_per_100g }));

  const handleQty = (val: string) =>
    onChange(calcMacros({ ...food, quantity: val === "" ? undefined : parseFloat(val) }));

  const numCell = (v?: number) => (
    <td className="hidden sm:table-cell py-2 pr-3 text-right tabular-nums text-sm text-foreground/80 w-16 align-middle">
      {v !== undefined && v > 0 ? v.toFixed(1) : <span className="text-muted-foreground/30">—</span>}
    </td>
  );

  const hasDetails = !!(food.household_measure || food.food_group);

  return (
    <>
      <tr className="group border-b border-border/30 hover:bg-muted/20 transition-colors">
        {/* # */}
        <td className="pl-4 pr-3 py-2 text-xs text-muted-foreground/40 tabular-nums w-8 select-none align-middle">
          {idx + 1}
        </td>

        {/* Alimento */}
        <td className="py-1.5 pr-3 align-middle" style={{ minWidth: 220 }}>
          <FoodSearchInput
            value={food.food_name}
            onSelect={handleSelect}
            onCustomName={(name) => onChange({ ...food, food_name: name })}
          />
        </td>

        {/* Quantidade */}
        <td className="py-1.5 pr-2 w-20 align-middle">
          <input
            type="number" min={0} step="any" placeholder="—"
            value={food.quantity !== undefined ? String(food.quantity) : ""}
            onChange={(e) => handleQty(e.target.value)}
            className={cellNum}
          />
        </td>

        {/* Unidade */}
        <td className="py-1.5 pr-3 w-24 align-middle">
          <input type="text" list="unit-list" value={food.unit ?? "g"}
            onChange={(e) => onChange({ ...food, unit: e.target.value })}
            className={cellTxt}
          />
          <datalist id="unit-list">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
        </td>

        {/* Macros */}
        {numCell(food.calories)}
        {numCell(food.protein)}
        {numCell(food.carbs)}
        {numCell(food.fat)}

        {/* Ações */}
        <td className="py-2 pr-2 w-16 align-middle">
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            {/* Toggle detalhes */}
            <button type="button" onClick={() => setShowDetails((v) => !v)}
              title="Medida caseira / grupo"
              className={cn(
                "h-7 w-7 flex items-center justify-center rounded transition-colors",
                showDetails || hasDetails
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground/30 hover:text-primary hover:bg-primary/10"
              )}>
              {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {/* Excluir */}
            <button type="button" onClick={onRemove}
              className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      </tr>

      {/* ── Linha de detalhes expandível ── */}
      {showDetails && (
        <tr className="border-b border-border/20 bg-muted/10">
          <td colSpan={9} className="px-4 pb-3 pt-1.5">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">

              {/* Medida caseira */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60 shrink-0">Medida:</span>
                <input
                  type="number" min={0} step="0.25" placeholder="1"
                  value={food.measure_amount !== undefined ? String(food.measure_amount) : ""}
                  onChange={(e) => onChange({ ...food, measure_amount: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                  className="h-7 w-14 rounded border border-border/60 bg-background px-2 text-xs text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <input
                  type="text"
                  placeholder="colher de sopa"
                  value={food.household_measure ?? ""}
                  onChange={(e) => onChange({ ...food, household_measure: e.target.value || undefined })}
                  list="measure-list"
                  className="h-7 w-36 rounded border border-border/60 bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <datalist id="measure-list">
                  {["colher de sopa", "colher de chá", "colher de sobremesa", "xícara", "unidade média",
                    "unidade pequena", "unidade grande", "fatia", "porção", "copo", "escumadeira"].map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>

              {/* Grupo alimentar */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60 shrink-0">Grupo:</span>
                <select
                  value={food.food_group ?? ""}
                  onChange={(e) => onChange({ ...food, food_group: e.target.value || undefined })}
                  className="h-7 rounded border border-border/60 bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                >
                  <option value="">— selecionar —</option>
                  {FOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              {/* Substituição inteligente */}
              <button
                type="button"
                onClick={() => setShowSubstitute(true)}
                disabled={!food.food_name.trim()}
                className="flex items-center gap-1.5 h-7 px-3 rounded border border-border/60 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
              >
                <ArrowLeftRight size={11} />
                Substituição inteligente
              </button>
            </div>
          </td>
        </tr>
      )}

      {/* Modal de substituição — renderizado fora da tabela via portal (Dialog) */}
      <SmartSubstituteModal
        open={showSubstitute}
        food={food}
        onClose={() => setShowSubstitute(false)}
        onSubstitute={(s) =>
          onChange(calcMacros({
            ...food,
            food_name:        s.name,
            kcal_per_100g:    s.kcal_per_100g,
            protein_per_100g: s.protein_per_100g,
            carbs_per_100g:   s.carbs_per_100g,
            fat_per_100g:     s.fat_per_100g,
          }))
        }
      />
    </>
  );
}

// ─── MealSection ──────────────────────────────────────────────────────────────

function MealSection({ meal, idx, onUpdate, onRemove }: {
  meal: Meal; idx: number;
  onUpdate: (m: Meal) => void; onRemove: () => void;
}) {
  const foods = meal.foods ?? [];
  const totals = sum(foods);
  const borderCls = MEAL_BORDER[idx % MEAL_BORDER.length];
  const [showNotes, setShowNotes] = useState(!!meal.notes);

  const updateFood = (i: number, f: MealFood) => { const n = [...foods]; n[i] = f; onUpdate({ ...meal, foods: n }); };
  const removeFood = (i: number) => onUpdate({ ...meal, foods: foods.filter((_, fi) => fi !== i) });
  const addFood = () => onUpdate({ ...meal, foods: [...foods, emptyFood()] });

  return (
    <div className={`bg-card border border-border/50 rounded-lg overflow-hidden border-l-[3px] ${borderCls}`}>

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/30 border-b border-border/40">
        {/* Número da refeição */}
        <span className="text-xs font-bold text-muted-foreground/60 w-5 flex-shrink-0 select-none tabular-nums">
          {String(idx + 1).padStart(2, "0")}
        </span>

        {/* Nome */}
        <input
          type="text"
          value={meal.meal_name}
          onChange={(e) => onUpdate({ ...meal, meal_name: e.target.value })}
          className="text-base font-bold bg-transparent border-0 focus:outline-none text-foreground flex-1 min-w-0 placeholder:text-muted-foreground"
          placeholder="Nome da refeição"
        />

        {/* Horário */}
        <input
          type="text"
          value={meal.time_suggestion ?? ""}
          onChange={(e) => onUpdate({ ...meal, time_suggestion: e.target.value })}
          className="hidden sm:block text-xs bg-transparent border-0 focus:outline-none w-28 text-muted-foreground text-right flex-shrink-0"
          placeholder="00:00 – 00:00"
        />

        {/* kcal subtotal */}
        {totals.cal > 0 && (
          <span className="text-xs tabular-nums text-muted-foreground font-medium flex-shrink-0 ml-2 border-l border-border pl-3">
            {n0(totals.cal)} kcal
          </span>
        )}

        {/* Excluir refeição */}
        <button type="button" onClick={onRemove}
          className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0 ml-1">
          <Trash2 size={13} />
        </button>
      </div>

      {/* ── Tabela ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border/40 bg-background/60">
              <th className="pl-4 pr-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 w-8">#</th>
              <th className="py-1.5 pr-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">Alimento</th>
              <th className="py-1.5 pr-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 w-20">Qtd</th>
              <th className="py-1.5 pr-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 w-24">Un.</th>
              <th className="hidden sm:table-cell py-1.5 pr-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 w-16">kcal</th>
              <th className="hidden sm:table-cell py-1.5 pr-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 w-16">Prot. g</th>
              <th className="hidden sm:table-cell py-1.5 pr-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 w-16">Carb. g</th>
              <th className="hidden sm:table-cell py-1.5 pr-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 w-16">Gord. g</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {foods.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-5 text-center text-sm text-primary/60 italic">
                  Nenhum alimento adicionado a esta refeição
                </td>
              </tr>
            ) : (
              foods.map((f, i) => (
                <FoodRow key={i} food={f} idx={i}
                  onChange={(u) => updateFood(i, u)}
                  onRemove={() => removeFood(i)}
                />
              ))
            )}
          </tbody>

          {/* Subtotal */}
          {foods.length > 0 && (
            <tfoot>
              <tr className="border-t border-border/50 bg-muted/20">
                <td colSpan={4} className="pl-4 py-1.5 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
                  <span className="sm:hidden">{n0(totals.cal)} kcal</span>
                  <span className="hidden sm:inline">Subtotal</span>
                </td>
                <td className="hidden sm:table-cell py-1.5 pr-3 text-right text-xs font-semibold text-foreground tabular-nums">{n0(totals.cal)}</td>
                <td className="hidden sm:table-cell py-1.5 pr-3 text-right text-xs font-semibold text-foreground tabular-nums">{n1(totals.prot)}</td>
                <td className="hidden sm:table-cell py-1.5 pr-3 text-right text-xs font-semibold text-foreground tabular-nums">{n1(totals.carbs)}</td>
                <td className="hidden sm:table-cell py-1.5 pr-3 text-right text-xs font-semibold text-foreground tabular-nums">{n1(totals.fat)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ── Footer: adicionar alimento + observação ── */}
      <div className="border-t border-border/30 bg-background/40">
        <div className="flex items-center justify-between px-4 py-2">
          <button type="button" onClick={addFood}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium">
            <Plus size={12} />
            Adicionar alimento
          </button>
          <button
            type="button"
            onClick={() => { setShowNotes(v => !v); if (showNotes) onUpdate({ ...meal, notes: "" }); }}
            className={`flex items-center gap-1 text-xs font-medium transition-colors ${
              showNotes || meal.notes
                ? "text-primary hover:text-primary/80"
                : "text-muted-foreground/50 hover:text-muted-foreground"
            }`}
          >
            <MessageSquare size={12} />
            {showNotes ? "Remover observação" : "Adicionar observação"}
          </button>
        </div>

        {/* Observação textarea */}
        {showNotes && (
          <div className="px-4 pb-3">
            <textarea
              rows={2}
              value={meal.notes ?? ""}
              onChange={e => onUpdate({ ...meal, notes: e.target.value })}
              placeholder="Observações para esta refeição (substituições, preparo, orientações…)"
              className="w-full text-sm bg-muted/30 border border-border/50 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary placeholder:text-muted-foreground/30 text-foreground/80"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminPlanoAlimentar() {
  const { id, planId } = useParams<{ id: string; planId: string }>();
  const navigate = useNavigate();

  const patientId = Number(id);
  const resolvedPlanId = Number(planId);
  const isNew = planId === "novo";

  const [plan, setPlan] = useState<MealPlan>({
    patient_id: patientId, title: "Plano Alimentar",
    start_date: "", end_date: "", daily_calories: undefined, notes: "",
  });
  const [meals, setMeals]       = useState<Meal[]>([]);
  const [patient, setPatient]   = useState<Patient | null>(null);
  const [latestMeasurement, setLatestMeasurement] = useState<Measurement | null>(null);
  const [anamnesis, setAnamnesis] = useState<Anamnesis | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [showEmail, setShowEmail]         = useState(false);
  const [showTemplate, setShowTemplate]   = useState(false);
  const [macroGoals, setMacroGoals]       = useState<MacroGoals | null>(null);

  // ── Energy panel state ────────────────────────────────────────────────────
  const [energyFormula, setEnergyFormula] = useState<EnergyFormula>("mifflin");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [adjustment, setAdjustment]       = useState(0); // % déficit (-) ou superávit (+)

  const loadPlan = useCallback(async () => {
    setLoading(true);
    try {
      const [patientData, measurementsData, anamnesisData] = await Promise.all([
        fetchPatient(patientId),
        fetchMeasurements(patientId),
        fetchAnamnesis(patientId),
      ]);
      setPatient(patientData);
      setLatestMeasurement(measurementsData[0] ?? null);
      setAnamnesis(anamnesisData);
      if (isNew) {
        setMeals(DEFAULT_MEALS.map((p) => ({ plan_id: 0, ...p, foods: [] })));
      } else {
        const [plans, loadedMeals] = await Promise.all([fetchMealPlans(patientId), fetchFullMealPlan(resolvedPlanId)]);
        const found = plans.find((p) => p.id === resolvedPlanId);
        if (found) setPlan(found);
        setMeals(loadedMeals.length > 0 ? loadedMeals : DEFAULT_MEALS.map((p) => ({ plan_id: resolvedPlanId, ...p, foods: [] })));
      }
    } catch { toast.error("Erro ao carregar o plano."); }
    finally { setLoading(false); }
  }, [isNew, patientId, resolvedPlanId]);

  useEffect(() => { loadPlan(); }, [loadPlan]);


  const handleSave = async () => {
    if (!plan.title.trim()) { toast.error("Informe um título para o plano."); return; }
    setSaving(true);
    const savedPlan = await upsertMealPlan(plan);
    if (!savedPlan?.id) { toast.error("Erro ao salvar o plano."); setSaving(false); return; }
    setPlan((p) => ({ ...p, id: savedPlan.id }));
    const ok = await saveMeals(savedPlan.id, meals);
    setSaving(false);
    if (!ok) { toast.error("Erro ao salvar as refeições."); return; }
    toast.success("Plano salvo com sucesso.");
    if (isNew) navigate(`/admin/pacientes/${id}/plano/${savedPlan.id}`, { replace: true });
  };

  const updateMeal = (i: number, m: Meal) => setMeals((prev) => { const n = [...prev]; n[i] = m; return n; });
  const removeMeal = (i: number) => setMeals((prev) => prev.filter((_, fi) => fi !== i));
  const addMeal = () => setMeals((prev) => [...prev, { plan_id: isNew ? 0 : resolvedPlanId, meal_name: "Nova refeição", time_suggestion: "", foods: [] }]);
  const setPF = <K extends keyof MealPlan>(k: K, v: MealPlan[K]) => setPlan((p) => ({ ...p, [k]: v }));

  const handleTemplateImport = (importedMeals: Meal[], mode: "replace" | "append") => {
    const planRef = isNew ? 0 : resolvedPlanId;
    const tagged  = importedMeals.map((m) => ({ ...m, plan_id: planRef }));
    setMeals((prev) => mode === "replace" ? tagged : [...prev, ...tagged]);
  };

  const grand = meals.reduce(
    (a, m) => { const t = sum(m.foods ?? []); return { cal: a.cal + t.cal, prot: a.prot + t.prot, carbs: a.carbs + t.carbs, fat: a.fat + t.fat }; },
    { cal: 0, prot: 0, carbs: 0, fat: 0 }
  );

  const goalPct = plan.daily_calories && grand.cal > 0
    ? Math.min(100, Math.round((grand.cal / plan.daily_calories) * 100))
    : 0;

  // ── Energy calculations (reactive) ────────────────────────────────────────
  const calcAge = (birthDate: string) => {
    const today = new Date(); const b = new Date(birthDate + "T12:00:00");
    let age = today.getFullYear() - b.getFullYear();
    if (today.getMonth() - b.getMonth() < 0 || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) age--;
    return age;
  };

  const energyInput = latestMeasurement?.weight && latestMeasurement?.height && patient?.birth_date && patient?.gender
    ? { weight: latestMeasurement.weight, height: latestMeasurement.height, age: calcAge(patient.birth_date), gender: patient.gender === "F" ? "F" as const : "M" as const }
    : null;

  const energyResult = energyInput ? calcEnergy(energyInput, energyFormula, activityLevel) : null;
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

  if (loading) {
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
                  <div className="flex gap-2">
                    {([ ["mifflin", "Mifflin-St Jeor"], ["harris_benedict", "Harris-Benedict"] ] as [EnergyFormula, string][]).map(([val, label]) => (
                      <button key={val} type="button" onClick={() => setEnergyFormula(val)}
                        className={cn("flex-1 h-8 rounded-md text-xs font-medium border transition-all",
                          energyFormula === val ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50")}>
                        {label}
                      </button>
                    ))}
                  </div>
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
                Calculado com: {energyInput!.weight} kg · {energyInput!.height} cm · {energyInput!.age} anos · {energyInput!.gender === "F" ? "Feminino" : "Masculino"} — avaliação mais recente
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

          {/* 4 colunas de dados */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-0 sm:divide-x sm:divide-border/60 mb-5">
            {[
              { label: "Energia total",  value: grand.cal  > 0 ? `${n0(grand.cal)} kcal`  : "— kcal"  },
              { label: "Proteínas",      value: grand.prot  > 0 ? `${n1(grand.prot)} g`    : "— g"     },
              { label: "Carboidratos",   value: grand.carbs > 0 ? `${n1(grand.carbs)} g`   : "— g"     },
              { label: "Gorduras",       value: grand.fat   > 0 ? `${n1(grand.fat)} g`     : "— g"     },
            ].map(({ label, value }) => (
              <div key={label} className="sm:px-4 sm:first:pl-0 sm:last:pr-0 bg-muted/20 sm:bg-transparent rounded-lg sm:rounded-none p-3 sm:p-0">
                <p className="text-[10px] text-primary uppercase tracking-wider mb-1.5">{label}</p>
                <p className="text-xl font-bold tabular-nums text-foreground leading-none">{value}</p>
              </div>
            ))}
          </div>

          {/* ── Alertas de auditoria ── */}
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

          {/* Barras de macros — com metas do DietaryPlanningPanel quando disponíveis */}
          <div className="space-y-2 mb-4">
            {macroGoals ? (
              // Metas travadas: mostra progresso g vs meta g
              [
                { label: "Proteínas",    actual: grand.prot,  goal: macroGoals.protein_g, color: "bg-blue-500"   },
                { label: "Carboidratos", actual: grand.carbs, goal: macroGoals.carbs_g,   color: "bg-amber-400"  },
                { label: "Gorduras",     actual: grand.fat,   goal: macroGoals.fat_g,     color: "bg-rose-400"   },
              ].map(({ label, actual, goal, color }) => {
                const pct    = goal > 0 ? Math.min((actual / goal) * 100, 100) : 0;
                const over   = goal > 0 && actual > goal * 1.08;
                const onTgt  = goal > 0 && actual >= goal * 0.92 && actual <= goal * 1.08;
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
              // Sem metas: modo percentual do VET (comportamento original)
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
          meals={meals}
          patient={patient}
          onClose={() => setShowEmail(false)}
        />
      )}

      {/* ── Modal de importação de template ─────────────────────────────── */}
      <TemplateImportModal
        open={showTemplate}
        hasMeals={meals.some((m) => (m.foods?.length ?? 0) > 0)}
        onClose={() => setShowTemplate(false)}
        onImport={handleTemplateImport}
      />
    </div>
  );
}
