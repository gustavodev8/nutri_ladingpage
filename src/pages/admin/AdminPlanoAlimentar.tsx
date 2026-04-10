import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Save, Loader2, FileText } from "lucide-react";
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

// ─── FoodRow ──────────────────────────────────────────────────────────────────

function FoodRow({ food, idx, onChange, onRemove }: {
  food: MealFood; idx: number;
  onChange: (f: MealFood) => void; onRemove: () => void;
}) {
  const handleSelect = (s: { name: string; kcal_per_100g: number; protein_per_100g: number; carbs_per_100g: number; fat_per_100g: number }) =>
    onChange(calcMacros({ ...food, food_name: s.name, kcal_per_100g: s.kcal_per_100g, protein_per_100g: s.protein_per_100g, carbs_per_100g: s.carbs_per_100g, fat_per_100g: s.fat_per_100g }));

  const handleQty = (val: string) =>
    onChange(calcMacros({ ...food, quantity: val === "" ? undefined : parseFloat(val) }));

  const numCell = (v?: number) => (
    <td className="py-2 pr-3 text-right tabular-nums text-sm text-foreground/80 w-16 align-middle">
      {v !== undefined && v > 0 ? v.toFixed(1) : <span className="text-muted-foreground/30">—</span>}
    </td>
  );

  return (
    <tr className="group border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
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

      {/* Macros — sem cores */}
      {numCell(food.calories)}
      {numCell(food.protein)}
      {numCell(food.carbs)}
      {numCell(food.fat)}

      {/* Excluir */}
      <td className="py-2 pr-3 w-9 align-middle">
        <button type="button" onClick={onRemove}
          className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground/20 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
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

  const updateFood = (i: number, f: MealFood) => { const n = [...foods]; n[i] = f; onUpdate({ ...meal, foods: n }); };
  const removeFood = (i: number) => onUpdate({ ...meal, foods: foods.filter((_, fi) => fi !== i) });
  const addFood = () => onUpdate({ ...meal, foods: [...foods, emptyFood()] });

  return (
    <div className={`bg-card border border-border/50 rounded-lg overflow-hidden border-l-[3px] ${borderCls}`}>

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/30 border-b border-border/40">
        {/* Número da refeição */}
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 w-5 flex-shrink-0 select-none">
          {String(idx + 1).padStart(2, "0")}
        </span>

        {/* Nome */}
        <input
          type="text"
          value={meal.meal_name}
          onChange={(e) => onUpdate({ ...meal, meal_name: e.target.value })}
          className="text-sm font-semibold bg-transparent border-0 focus:outline-none text-foreground flex-1 min-w-0 placeholder:text-muted-foreground"
          placeholder="Nome da refeição"
        />

        {/* Horário */}
        <input
          type="text"
          value={meal.time_suggestion ?? ""}
          onChange={(e) => onUpdate({ ...meal, time_suggestion: e.target.value })}
          className="text-xs bg-transparent border-0 focus:outline-none w-28 text-muted-foreground text-right flex-shrink-0"
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
              <th className="py-1.5 pr-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 w-16">kcal</th>
              <th className="py-1.5 pr-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 w-16">Prot. g</th>
              <th className="py-1.5 pr-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 w-16">Carb. g</th>
              <th className="py-1.5 pr-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 w-16">Gord. g</th>
              <th className="w-9" />
            </tr>
          </thead>
          <tbody>
            {foods.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-5 text-center text-xs text-muted-foreground/35 italic">
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
                  Subtotal
                </td>
                <td className="py-1.5 pr-3 text-right text-xs font-semibold text-foreground tabular-nums">{n0(totals.cal)}</td>
                <td className="py-1.5 pr-3 text-right text-xs font-semibold text-foreground tabular-nums">{n1(totals.prot)}</td>
                <td className="py-1.5 pr-3 text-right text-xs font-semibold text-foreground tabular-nums">{n1(totals.carbs)}</td>
                <td className="py-1.5 pr-3 text-right text-xs font-semibold text-foreground tabular-nums">{n1(totals.fat)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ── Adicionar alimento ── */}
      <div className="px-4 py-2 border-t border-border/30 bg-background/40">
        <button type="button" onClick={addFood}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-medium">
          <Plus size={12} />
          Adicionar alimento
        </button>
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
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    try {
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

  const grand = meals.reduce(
    (a, m) => { const t = sum(m.foods ?? []); return { cal: a.cal + t.cal, prot: a.prot + t.prot, carbs: a.carbs + t.carbs, fat: a.fat + t.fat }; },
    { cal: 0, prot: 0, carbs: 0, fat: 0 }
  );

  const goalPct = plan.daily_calories && grand.cal > 0
    ? Math.min(100, Math.round((grand.cal / plan.daily_calories) * 100))
    : 0;

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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-13 flex items-center gap-3 py-3">
          <Link to={`/admin/pacientes/${id}?tab=planos`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Voltar ao paciente</span>
          </Link>

          <div className="h-4 w-px bg-border flex-shrink-0" />

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FileText size={15} className="text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              value={plan.title}
              onChange={(e) => setPF("title", e.target.value)}
              className="text-sm font-semibold bg-transparent border-0 border-b border-transparent hover:border-border focus:border-primary focus:outline-none flex-1 min-w-0 py-0.5 text-foreground"
              placeholder="Título do plano"
            />
            {isNew && <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70 flex-shrink-0">Novo</span>}
          </div>

          <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2 flex-shrink-0">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {saving ? "Salvando…" : "Salvar plano"}
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Metadados ───────────────────────────────────────────────────── */}
        <section className="bg-card border border-border/60 rounded-lg p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">Dados do Plano</p>
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

        {/* ── Resumo nutricional ──────────────────────────────────────────── */}
        <section className="bg-card border border-border/60 rounded-lg p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">Resumo Nutricional do Dia</p>

          {/* 4 colunas de dados */}
          <div className="grid grid-cols-4 divide-x divide-border/60 mb-4">
            {[
              { label: "Energia total",  value: grand.cal  > 0 ? `${n0(grand.cal)} kcal`  : "— kcal"  },
              { label: "Proteínas",      value: grand.prot  > 0 ? `${n1(grand.prot)} g`    : "— g"     },
              { label: "Carboidratos",   value: grand.carbs > 0 ? `${n1(grand.carbs)} g`   : "— g"     },
              { label: "Gorduras",       value: grand.fat   > 0 ? `${n1(grand.fat)} g`     : "— g"     },
            ].map(({ label, value }) => (
              <div key={label} className="px-4 first:pl-0 last:pr-0">
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-xl font-bold tabular-nums text-foreground leading-none">{value}</p>
              </div>
            ))}
          </div>

          {/* Barra de progresso calórico */}
          {plan.daily_calories && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">
                  Progresso calórico — meta: <strong>{plan.daily_calories} kcal</strong>
                </span>
                <span className={`text-xs font-semibold tabular-nums ${grand.cal > plan.daily_calories ? "text-destructive" : "text-foreground"}`}>
                  {goalPct}%
                  {grand.cal > 0 && (
                    <span className="text-muted-foreground font-normal ml-2">
                      {grand.cal > plan.daily_calories
                        ? `(+${n0(grand.cal - plan.daily_calories)} kcal acima)`
                        : `(−${n0(plan.daily_calories - grand.cal)} kcal abaixo)`}
                    </span>
                  )}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${grand.cal > plan.daily_calories ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${goalPct}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {/* ── Refeições ───────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Refeições — {meals.length} cadastradas
            </p>
          </div>

          <div className="space-y-2">
            {meals.map((meal, i) => (
              <MealSection key={i} meal={meal} idx={i}
                onUpdate={(m) => updateMeal(i, m)}
                onRemove={() => removeMeal(i)}
              />
            ))}

            <button type="button" onClick={addMeal}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium px-1 py-2">
              <Plus size={14} />
              Adicionar refeição
            </button>
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
    </div>
  );
}
