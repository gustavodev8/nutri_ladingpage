import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Save, Loader2, Clock,
  Flame, Beef, Wheat, Droplets, FileText, Zap,
} from "lucide-react";
import { FoodSearchInput } from "@/components/admin/FoodSearchInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  fetchFullMealPlan, saveMeals, upsertMealPlan, fetchMealPlans,
  type Meal, type MealFood, type MealPlan,
} from "@/lib/supabase";

// ─── Constants ────────────────────────────────────────────────────────────────

const MEAL_ACCENTS = [
  { border: "border-l-amber-400",   text: "text-amber-700",   dot: "bg-amber-400"   },
  { border: "border-l-emerald-400", text: "text-emerald-700", dot: "bg-emerald-400" },
  { border: "border-l-blue-400",    text: "text-blue-700",    dot: "bg-blue-400"    },
  { border: "border-l-violet-400",  text: "text-violet-700",  dot: "bg-violet-400"  },
  { border: "border-l-rose-400",    text: "text-rose-700",    dot: "bg-rose-400"    },
  { border: "border-l-cyan-400",    text: "text-cyan-700",    dot: "bg-cyan-400"    },
];

const DEFAULT_MEALS = [
  { meal_name: "Café da manhã",   time_suggestion: "07:00 – 08:00" },
  { meal_name: "Lanche da manhã", time_suggestion: "10:00 – 10:30" },
  { meal_name: "Almoço",          time_suggestion: "12:00 – 13:00" },
  { meal_name: "Lanche da tarde", time_suggestion: "15:30 – 16:00" },
  { meal_name: "Jantar",          time_suggestion: "19:00 – 20:00" },
  { meal_name: "Ceia",            time_suggestion: "21:30 – 22:00" },
];

const UNITS = ["g", "ml", "unid.", "col. sopa", "col. chá", "xícara", "fatia", "porção"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sum = (foods: MealFood[]) =>
  foods.reduce(
    (a, f) => ({
      cal:   a.cal   + (f.calories ?? 0),
      prot:  a.prot  + (f.protein  ?? 0),
      carbs: a.carbs + (f.carbs    ?? 0),
      fat:   a.fat   + (f.fat      ?? 0),
    }),
    { cal: 0, prot: 0, carbs: 0, fat: 0 }
  );

const fmt = (v: number) => (v > 0 ? v.toFixed(1) : "—");
const fmtN = (v: number) => (v > 0 ? v.toFixed(0) : "—");

function emptyFood(): MealFood {
  return { meal_id: 0, food_name: "", quantity: undefined, unit: "g" };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const calcMacros = (food: MealFood): MealFood => {
  const qty = food.quantity;
  if (!qty || !food.kcal_per_100g) return food;
  const factor = qty / 100;
  return {
    ...food,
    calories: parseFloat(((food.kcal_per_100g ?? 0) * factor).toFixed(1)),
    protein:  parseFloat(((food.protein_per_100g ?? 0) * factor).toFixed(1)),
    carbs:    parseFloat(((food.carbs_per_100g ?? 0) * factor).toFixed(1)),
    fat:      parseFloat(((food.fat_per_100g ?? 0) * factor).toFixed(1)),
  };
};

// ─── FoodRow ──────────────────────────────────────────────────────────────────

function FoodRow({
  food, idx, onChange, onRemove,
}: {
  food: MealFood;
  idx: number;
  onChange: (f: MealFood) => void;
  onRemove: () => void;
}) {
  const hasBase = !!food.kcal_per_100g;

  const handleSelect = (selected: {
    name: string; kcal_per_100g: number; protein_per_100g: number;
    carbs_per_100g: number; fat_per_100g: number;
  }) => {
    const updated: MealFood = {
      ...food,
      food_name: selected.name,
      kcal_per_100g: selected.kcal_per_100g,
      protein_per_100g: selected.protein_per_100g,
      carbs_per_100g: selected.carbs_per_100g,
      fat_per_100g: selected.fat_per_100g,
    };
    onChange(calcMacros(updated));
  };

  const handleQty = (val: string) => {
    const qty = val === "" ? undefined : parseFloat(val);
    onChange(calcMacros({ ...food, quantity: qty }));
  };

  const numVal = (v?: number) => v !== undefined && v > 0 ? v.toFixed(1) : "—";

  return (
    <tr className="group border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
      {/* # */}
      <td className="pl-4 pr-2 py-2 text-xs text-muted-foreground/40 tabular-nums w-7 select-none align-top pt-3">
        {idx + 1}
      </td>

      {/* Alimento — search input */}
      <td className="py-1.5 pr-2 min-w-[200px]">
        <FoodSearchInput
          value={food.food_name}
          onSelect={handleSelect}
          onCustomName={(name) => onChange({ ...food, food_name: name })}
        />
        {hasBase && (
          <p className="text-[10px] text-muted-foreground/50 mt-0.5 pl-1 flex items-center gap-1">
            <Zap size={9} className="text-primary/50" />
            {food.kcal_per_100g} kcal · {food.protein_per_100g}g P · {food.carbs_per_100g}g C · {food.fat_per_100g}g G &nbsp;/&nbsp;100g
          </p>
        )}
      </td>

      {/* Qtd */}
      <td className="py-2 pr-2 w-20 align-top pt-3">
        <input
          type="number"
          min={0}
          step="any"
          placeholder="g / ml"
          value={food.quantity !== undefined ? String(food.quantity) : ""}
          onChange={(e) => handleQty(e.target.value)}
          className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </td>

      {/* Unit */}
      <td className="py-2 pr-2 w-24 align-top pt-3">
        <input
          type="text"
          list="unit-list"
          value={food.unit ?? "g"}
          onChange={(e) => onChange({ ...food, unit: e.target.value })}
          className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <datalist id="unit-list">
          {UNITS.map((u) => <option key={u} value={u} />)}
        </datalist>
      </td>

      {/* Calculated macros — read-only display */}
      <td className="py-2 pr-2 w-16 text-right tabular-nums text-sm font-medium text-orange-600 align-top pt-3">{numVal(food.calories)}</td>
      <td className="py-2 pr-2 w-14 text-right tabular-nums text-sm text-red-600 align-top pt-3">{numVal(food.protein)}</td>
      <td className="py-2 pr-2 w-14 text-right tabular-nums text-sm text-yellow-700 align-top pt-3">{numVal(food.carbs)}</td>
      <td className="py-2 pr-2 w-14 text-right tabular-nums text-sm text-blue-600 align-top pt-3">{numVal(food.fat)}</td>

      {/* Excluir */}
      <td className="py-2 pr-3 w-8 align-top pt-3">
        <button
          type="button"
          onClick={onRemove}
          className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  );
}

// ─── MealSection ──────────────────────────────────────────────────────────────

function MealSection({
  meal, accentIdx, onUpdate, onRemove,
}: {
  meal: Meal;
  accentIdx: number;
  onUpdate: (m: Meal) => void;
  onRemove: () => void;
}) {
  const accent = MEAL_ACCENTS[accentIdx % MEAL_ACCENTS.length];
  const foods = meal.foods ?? [];
  const totals = sum(foods);

  const updateFood = (i: number, f: MealFood) => {
    const next = [...foods]; next[i] = f;
    onUpdate({ ...meal, foods: next });
  };
  const removeFood = (i: number) =>
    onUpdate({ ...meal, foods: foods.filter((_, fi) => fi !== i) });
  const addFood = () =>
    onUpdate({ ...meal, foods: [...foods, emptyFood()] });

  return (
    <div className={`bg-card border border-border/60 rounded-xl overflow-hidden border-l-4 ${accent.border}`}>
      {/* Meal header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-muted/20">
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${accent.dot}`} />
        <input
          type="text"
          value={meal.meal_name}
          onChange={(e) => onUpdate({ ...meal, meal_name: e.target.value })}
          className={`font-semibold text-sm bg-transparent border-0 focus:outline-none focus:border-b focus:border-border text-foreground flex-1 min-w-0 ${accent.text}`}
          placeholder="Nome da refeição"
        />
        <div className="flex items-center gap-1.5 text-muted-foreground flex-shrink-0">
          <Clock size={12} />
          <input
            type="text"
            value={meal.time_suggestion ?? ""}
            onChange={(e) => onUpdate({ ...meal, time_suggestion: e.target.value })}
            className="text-xs bg-transparent border-0 focus:outline-none w-28 text-muted-foreground"
            placeholder="00:00 – 00:00"
          />
        </div>
        {totals.cal > 0 && (
          <span className="hidden sm:flex items-center gap-1 text-xs font-medium text-muted-foreground tabular-nums flex-shrink-0 bg-background border border-border/50 rounded px-2 py-0.5">
            <Flame size={11} className="text-orange-400" />
            {fmtN(totals.cal)} kcal
          </span>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0 ml-1"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Food table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* Column headers */}
          <thead>
            <tr className="border-b border-border/40">
              <th className="pl-4 pr-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 w-7">#</th>
              <th className="py-1.5 pr-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Alimento</th>
              <th className="py-1.5 pr-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 w-16">Qtd</th>
              <th className="py-1.5 pr-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 w-24">Un.</th>
              <th className="py-1.5 pr-2 text-right text-[10px] font-semibold uppercase tracking-wider text-orange-500/70 w-16">kcal</th>
              <th className="py-1.5 pr-2 text-right text-[10px] font-semibold uppercase tracking-wider text-red-500/70 w-14">Prot.</th>
              <th className="py-1.5 pr-2 text-right text-[10px] font-semibold uppercase tracking-wider text-yellow-600/70 w-14">Carb.</th>
              <th className="py-1.5 pr-2 text-right text-[10px] font-semibold uppercase tracking-wider text-blue-500/70 w-14">Gord.</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {foods.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-4 text-center text-xs text-muted-foreground/40 italic">
                  Nenhum alimento registrado nesta refeição
                </td>
              </tr>
            ) : (
              foods.map((f, i) => (
                <FoodRow
                  key={i}
                  food={f}
                  idx={i}
                  onChange={(u) => updateFood(i, u)}
                  onRemove={() => removeFood(i)}
                />
              ))
            )}
          </tbody>
          {/* Totals footer */}
          {foods.length > 0 && (
            <tfoot>
              <tr className="border-t border-border/60 bg-muted/30">
                <td colSpan={4} className="pl-4 py-1.5 text-xs font-semibold text-muted-foreground">
                  Subtotal
                </td>
                <td className="py-1.5 pr-2 text-right text-xs font-bold text-orange-600 tabular-nums">{fmtN(totals.cal)}</td>
                <td className="py-1.5 pr-2 text-right text-xs font-bold text-red-600 tabular-nums">{fmt(totals.prot)}g</td>
                <td className="py-1.5 pr-2 text-right text-xs font-bold text-yellow-700 tabular-nums">{fmt(totals.carbs)}g</td>
                <td className="py-1.5 pr-2 text-right text-xs font-bold text-blue-600 tabular-nums">{fmt(totals.fat)}g</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Add food */}
      <div className="px-4 py-2.5 border-t border-border/30">
        <button
          type="button"
          onClick={addFood}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <Plus size={13} />
          Adicionar alimento
        </button>
      </div>
    </div>
  );
}

// ─── Stat cell ────────────────────────────────────────────────────────────────

function StatCell({ icon, label, value, sub, colorClass }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; colorClass: string;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${colorClass}`}>
      <div className="flex-shrink-0 opacity-80">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-base font-bold tabular-nums leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground/60">{sub}</p>}
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
    patient_id: patientId,
    title: "Plano Alimentar",
    start_date: "",
    end_date: "",
    daily_calories: undefined,
    notes: "",
  });
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    try {
      if (isNew) {
        setMeals(DEFAULT_MEALS.map((p) => ({ plan_id: 0, ...p, foods: [] })));
      } else {
        const [plans, loadedMeals] = await Promise.all([
          fetchMealPlans(patientId),
          fetchFullMealPlan(resolvedPlanId),
        ]);
        const found = plans.find((p) => p.id === resolvedPlanId);
        if (found) setPlan(found);
        setMeals(
          loadedMeals.length > 0
            ? loadedMeals
            : DEFAULT_MEALS.map((p) => ({ plan_id: resolvedPlanId, ...p, foods: [] }))
        );
      }
    } catch {
      toast.error("Erro ao carregar o plano.");
    } finally {
      setLoading(false);
    }
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

  const updateMeal = (i: number, m: Meal) =>
    setMeals((prev) => { const n = [...prev]; n[i] = m; return n; });
  const removeMeal = (i: number) =>
    setMeals((prev) => prev.filter((_, fi) => fi !== i));
  const addMeal = () =>
    setMeals((prev) => [...prev, { plan_id: isNew ? 0 : resolvedPlanId, meal_name: "Nova refeição", time_suggestion: "", foods: [] }]);

  const grand = meals.reduce(
    (a, m) => { const t = sum(m.foods ?? []); return { cal: a.cal + t.cal, prot: a.prot + t.prot, carbs: a.carbs + t.carbs, fat: a.fat + t.fat }; },
    { cal: 0, prot: 0, carbs: 0, fat: 0 }
  );

  const setPF = <K extends keyof MealPlan>(k: K, v: MealPlan[K]) => setPlan((p) => ({ ...p, [k]: v }));

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 size={28} className="animate-spin text-primary" />
          <p className="text-sm">Carregando plano alimentar…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-card border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link
            to={`/admin/pacientes/${id}?tab=planos`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Voltar ao paciente</span>
          </Link>

          <div className="h-4 w-px bg-border flex-shrink-0" />

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FileText size={16} className="text-primary flex-shrink-0" />
            <input
              type="text"
              value={plan.title}
              onChange={(e) => setPF("title", e.target.value)}
              className="text-sm font-semibold bg-transparent border-0 border-b border-transparent hover:border-border focus:border-primary focus:outline-none flex-1 min-w-0 py-0.5 text-foreground"
              placeholder="Título do plano"
            />
            {isNew && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary flex-shrink-0 uppercase tracking-wide">
                Novo
              </span>
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="gap-2 flex-shrink-0"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Salvando…" : "Salvar plano"}
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Plan metadata ─────────────────────────────────────────────────── */}
        <section className="bg-card border border-border/60 rounded-xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
            Informações do Plano
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Data de início</Label>
              <Input type="date" value={plan.start_date ?? ""} onChange={(e) => setPF("start_date", e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Data de término</Label>
              <Input type="date" value={plan.end_date ?? ""} onChange={(e) => setPF("end_date", e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Meta calórica diária (kcal)</Label>
              <Input
                type="number" min={0} step={50} placeholder="Ex.: 1800"
                value={plan.daily_calories !== undefined ? String(plan.daily_calories) : ""}
                onChange={(e) => setPF("daily_calories", e.target.value === "" ? undefined : parseFloat(e.target.value))}
                className="h-9"
              />
            </div>
            <div className="sm:col-span-3 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Observações gerais</Label>
              <textarea
                rows={2}
                placeholder="Orientações, restrições, substituições permitidas…"
                value={plan.notes ?? ""}
                onChange={(e) => setPF("notes", e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>
        </section>

        {/* ── Macro totals ──────────────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Resumo nutricional do dia
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCell
              icon={<Flame size={18} className="text-orange-500" />}
              label="Calorias totais"
              value={`${fmtN(grand.cal)} kcal`}
              sub={plan.daily_calories ? `Meta: ${plan.daily_calories} kcal` : undefined}
              colorClass={
                plan.daily_calories && grand.cal > plan.daily_calories
                  ? "bg-red-50 border-red-200 text-red-900"
                  : "bg-orange-50 border-orange-200 text-orange-900"
              }
            />
            <StatCell
              icon={<Beef size={18} className="text-red-500" />}
              label="Proteína"
              value={`${fmt(grand.prot)} g`}
              colorClass="bg-red-50 border-red-200 text-red-900"
            />
            <StatCell
              icon={<Wheat size={18} className="text-yellow-600" />}
              label="Carboidrato"
              value={`${fmt(grand.carbs)} g`}
              colorClass="bg-yellow-50 border-yellow-200 text-yellow-900"
            />
            <StatCell
              icon={<Droplets size={18} className="text-blue-500" />}
              label="Gordura"
              value={`${fmt(grand.fat)} g`}
              colorClass="bg-blue-50 border-blue-200 text-blue-900"
            />
          </div>
          {plan.daily_calories && grand.cal > 0 && (
            <p className={`mt-2 text-xs font-medium tabular-nums ${grand.cal > plan.daily_calories ? "text-red-600" : "text-emerald-600"}`}>
              {grand.cal > plan.daily_calories
                ? `▲ ${fmtN(grand.cal - plan.daily_calories)} kcal acima da meta`
                : `▼ ${fmtN(plan.daily_calories - grand.cal)} kcal abaixo da meta`}
            </p>
          )}
        </section>

        {/* ── Divider ───────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
            Refeições — {meals.length} no total
          </p>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* ── Meal sections ─────────────────────────────────────────────────── */}
        <div className="space-y-3">
          {meals.map((meal, i) => (
            <MealSection
              key={i}
              meal={meal}
              accentIdx={i}
              onUpdate={(m) => updateMeal(i, m)}
              onRemove={() => removeMeal(i)}
            />
          ))}

          <button
            type="button"
            onClick={addMeal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border/70 text-sm text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors w-full"
          >
            <Plus size={15} />
            Adicionar refeição
          </button>
        </div>

        {/* ── Bottom save ───────────────────────────────────────────────────── */}
        <div className="flex justify-end pt-2 pb-6">
          <Button onClick={handleSave} disabled={saving} className="gap-2 px-6">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Salvando…" : "Salvar plano alimentar"}
          </Button>
        </div>
      </main>
    </div>
  );
}
