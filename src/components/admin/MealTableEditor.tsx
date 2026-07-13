/**
 * MealTableEditor — componentes reutilizáveis de edição de refeições.
 *
 * Usado por AdminPlanoAlimentar (modo paciente) e AdminTemplateEditor (modo template).
 * Contém: FoodRow, MealSection, helpers de cálculo e constantes de UI.
 */

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, MessageSquare, ArrowLeftRight, Sparkles, X, NotebookPen, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, LayoutList } from "lucide-react";
import { FoodSearchInput } from "@/components/admin/FoodSearchInput";
import { SmartSubstituteModal } from "@/components/admin/SmartSubstituteModal";
import { cn } from "@/lib/utils";
import { getFoodHouseholdMeasures, type FoodItem, type HouseholdMeasure } from "@/lib/foodDatabase";
import type { MealFood, SubstitutionItem } from "@/lib/supabase";
import { fetchSmartSubstitutions } from "@/lib/supabase";
import { calculateSubstitutions, type SubstitutionRule, type FoodSubstitution } from "@/lib/smartSubstitutions";

// ─── Constants ────────────────────────────────────────────────────────────────

export const UNITS = ["g", "ml", "L", "kg", "un", "xícara", "col. sopa", "col. chá", "fatia", "porção"] as const;

export const UNIT_OPTIONS: { value: string; label: string }[] = [
  { value: "g",         label: "g  (Gramas)"         },
  { value: "ml",        label: "ml  (Mililitros)"     },
  { value: "L",         label: "L  (Litros)"          },
  { value: "kg",        label: "kg  (Quilos)"         },
  { value: "un",        label: "un  (Unidade)"        },
  { value: "xícara",     label: "xícara"               },
  { value: "col. sopa",  label: "col. de sopa"         },
  { value: "col. chá",   label: "col. de chá"          },
  { value: "fatia",     label: "fatia"                },
  { value: "porção",     label: "porção"               },
];

export const MEAL_BORDER = [
  "border-l-slate-400",
  "border-l-teal-500",
  "border-l-indigo-400",
  "border-l-amber-500",
  "border-l-rose-400",
  "border-l-emerald-500",
] as const;

export const FOOD_GROUPS = [
  "Carboidrato", "Proteína", "Gordura", "Fruta",
  "Vegetal", "Laticínio", "Leguminosa", "Outro",
] as const;

// ─── Shared types ─────────────────────────────────────────────────────────────

/** Rascunho de uma opção substituta completa para o editor de refeições */
export interface AlternativeMealDraft {
  meal_name:        string;
  time_suggestion?: string;
  notes?:           string;
  foods:            MealFood[];
}

/** Refeição genérica usada tanto em planos de paciente quanto em templates */
export interface EditorMeal {
  /** id do registro no banco (meal.id ou diet_template_meal.id) - undefined para novos */
  _dbId?: number;
  meal_name:           string;
  time_suggestion?:    string;
  notes?:              string;
  foods:               MealFood[];
  substitution_items?: SubstitutionItem[];
  /** Refeições alternativas completas (apenas em templates) */
  substitutions?:      EditorMeal[];
  /** Opções substitutas completas para planos de paciente */
  alternative_meals?:  AlternativeMealDraft[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const n0 = (v: number) => (v > 0 ? Math.round(v).toString() : "—");
export const n1 = (v: number) => (v > 0 ? v.toFixed(1) : "—");

export function sumFoods(foods: MealFood[]) {
  return foods.reduce(
    (a, f) => ({
      cal:   a.cal   + (f.calories ?? 0),
      prot:  a.prot  + (f.protein  ?? 0),
      carbs: a.carbs + (f.carbs    ?? 0),
      fat:   a.fat   + (f.fat      ?? 0),
    }),
    { cal: 0, prot: 0, carbs: 0, fat: 0 }
  );
}

export function calcFoodMacros(food: MealFood, foodDb?: FoodItem): MealFood {
  const qty = food.quantity;
  if (!qty || !food.kcal_per_100g) return food;

  const availableMeasures = food.household_measures ?? foodDb?.household_measures ?? getFoodHouseholdMeasures(food.food_name);
  const unit = (food.unit ?? "g").trim();
  let grams = qty;

  const normalizeMeasure = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const normalizedUnit = normalizeMeasure(unit);
  const measureByName = (measures?: HouseholdMeasure[]) => {
    if (!measures) return undefined;
    const exact = measures.find((measure) => normalizeMeasure(measure.unit) === normalizedUnit);
    if (exact) return exact;
    if (normalizedUnit === "un") {
      return measures.find((measure) => normalizeMeasure(measure.unit).includes("unidade"));
    }
    return undefined;
  };

  const matchedMeasure = measureByName(availableMeasures);
  if (matchedMeasure) {
    grams = qty * matchedMeasure.grams;
  } else {
    const genericFactors: Record<string, number> = {
      g: 1,
      grama: 1,
      gramas: 1,
      kg: 1000,
      ml: 1,
      l: 1000,
      xicara: 240,
      "col. sopa": 15,
      "col. cha": 5,
      fatia: 30,
      porcao: 100,
      un: 50,
    };
    const fallback = genericFactors[normalizedUnit];
    if (fallback) grams = qty * fallback;
  }

  const f = grams / 100;
  return {
    ...food,
    calories: parseFloat(((food.kcal_per_100g   ?? 0) * f).toFixed(1)),
    protein:  parseFloat(((food.protein_per_100g ?? 0) * f).toFixed(1)),
    carbs:    parseFloat(((food.carbs_per_100g   ?? 0) * f).toFixed(1)),
    fat:      parseFloat(((food.fat_per_100g     ?? 0) * f).toFixed(1)),
  };
}

export function emptyFood(): MealFood {
  return { meal_id: 0, food_name: "", quantity: undefined, unit: "g" };
}

// ─── Shared cell styles ───────────────────────────────────────────────────────

export const cellNum =
  "h-8 w-full bg-transparent border border-border/60 rounded px-2 text-sm text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary";
export const cellTxt =
  "h-8 w-full bg-transparent border border-border/60 rounded px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary";

function normalizeText(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function resolveMealWeight(mealName: string) {
  const name = normalizeText(mealName);
  if (!name) return 1;
  if (/cafe|desjejum|breakfast/.test(name)) return 2.2;
  if (/almoco|lunch/.test(name)) return 3.0;
  if (/jantar|dinner/.test(name)) return 2.2;
  if (/ceia|supper/.test(name)) return 0.8;
  if (/lanche/.test(name) && /manha/.test(name)) return 1.0;
  if (/lanche/.test(name) && /tarde/.test(name)) return 1.0;
  if (/pre[- ]?treino|pos[- ]?treino/.test(name)) return 1.1;
  return 1;
}

export interface MealCalorieTarget {
  targetCalories: number;
  share: number;
}

export function getMealCalorieTargets(
  meals: Pick<EditorMeal, "meal_name">[],
  dailyCalories?: number,
): MealCalorieTarget[] {
  if (!dailyCalories || dailyCalories <= 0 || meals.length === 0) return [];

  const weights = meals.map((meal) => resolveMealWeight(meal.meal_name));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0) || meals.length;

  return weights.map((weight) => {
    const share = weight / totalWeight;
    return {
      share,
      targetCalories: dailyCalories * share,
    };
  });
}

// ─── FoodRow ──────────────────────────────────────────────────────────────────

export function FoodRow({
  food, idx, onChange, onRemove,
}: {
  food: MealFood; idx: number;
  onChange: (f: MealFood) => void;
  onRemove: () => void;
}) {
  const [showDetails,    setShowDetails]   = useState(false);
  const [showSubstitute, setShowSubstitute] = useState(false);
  const [showNotes,      setShowNotes]     = useState(!!food.notes);

  const handleSelect = (s: {
    name: string;
    kcal_per_100g: number; protein_per_100g: number;
    carbs_per_100g: number; fat_per_100g: number;
    household_measures?: HouseholdMeasure[];
  }) =>
    onChange(calcFoodMacros({
      ...food,
      food_name:        s.name,
      kcal_per_100g:    s.kcal_per_100g,
      protein_per_100g: s.protein_per_100g,
      carbs_per_100g:   s.carbs_per_100g,
      fat_per_100g:     s.fat_per_100g,
      household_measures: s.household_measures,
    }));

  const handleQty = (val: string) => {
    onChange(calcFoodMacros({
      ...food,
      quantity: val === "" ? undefined : parseFloat(val),
    }));
  };

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

        {/* Quantidade + Unidade */}
        <td className="py-1.5 pr-3 w-48 align-middle">
          <div className="flex">
            <input
              type="number" min={0} step="any" placeholder="—"
              value={food.quantity !== undefined ? String(food.quantity) : ""}
              onChange={(e) => handleQty(e.target.value)}
              className="h-8 w-20 bg-transparent border border-border/60 rounded-l border-r-0 px-2 text-sm text-right tabular-nums focus:outline-none focus:z-10 focus:ring-1 focus:ring-ring focus:border-primary"
            />
            <select
              value={food.unit ?? "g"}
              onChange={(e) => onChange({ ...food, unit: e.target.value })}
              className="h-8 flex-1 min-w-0 bg-background border border-border/60 rounded-r px-1.5 text-sm focus:outline-none focus:z-10 focus:ring-1 focus:ring-ring focus:border-primary text-foreground cursor-pointer"
            >
              {UNIT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </td>

        {/* Macros */}
        {numCell(food.calories)}
        {numCell(food.protein)}
        {numCell(food.carbs)}
        {numCell(food.fat)}

        {/* Ações */}
        <td className="py-2 pr-2 w-20 align-middle">
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button type="button" onClick={() => setShowNotes((v) => !v)}
              title="Nota / modo de preparo"
              className={cn(
                "h-7 w-7 flex items-center justify-center rounded transition-colors",
                showNotes || food.notes
                  ? "text-amber-600 bg-amber-50"
                  : "text-muted-foreground/30 hover:text-amber-600 hover:bg-amber-50"
              )}>
              <NotebookPen size={12} />
            </button>
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
            <button type="button" onClick={onRemove}
              className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      </tr>

      {/* Nota / modo de preparo por alimento */}
      {showNotes && (
        <tr className="border-b border-border/20 bg-amber-50/40">
          <td colSpan={8} className="px-4 pb-2.5 pt-1.5">
            <div className="flex items-start gap-2">
              <NotebookPen size={13} className="text-amber-600/70 mt-2 shrink-0" />
              <textarea
                rows={2}
                value={food.notes ?? ""}
                onChange={(e) => onChange({ ...food, notes: e.target.value || undefined })}
                placeholder="Modo de preparo, substituições ou observações para este alimento..."
                className="flex-1 text-xs bg-white/70 border border-amber-200 rounded-md px-2.5 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400 placeholder:text-muted-foreground/40 text-foreground/80"
              />
            </div>
          </td>
        </tr>
      )}

      {/* Detalhes: medida caseira + grupo alimentar */}
      {showDetails && (
        <tr className="border-b border-border/20 bg-muted/10">
          <td colSpan={8} className="px-4 pb-3 pt-1.5">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60 shrink-0">Medida:</span>
                <input type="number" min={0} step="0.25" placeholder="1"
                  value={food.measure_amount !== undefined ? String(food.measure_amount) : ""}
                  onChange={(e) => onChange({ ...food, measure_amount: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                  className="h-7 w-14 rounded border border-border/60 bg-background px-2 text-xs text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-ring" />
                <input type="text" placeholder="colher de sopa"
                  value={food.household_measure ?? ""}
                  onChange={(e) => onChange({ ...food, household_measure: e.target.value || undefined })}
                  list="measure-list-shared"
                  className="h-7 w-36 rounded border border-border/60 bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
                <datalist id="measure-list-shared">
                    {["colher de sopa", "colher de chá", "colher de sobremesa", "xícara", "unidade média",
                    "unidade pequena", "unidade grande", "fatia", "porção", "copo", "escumadeira"]
                    .map((m) => <option key={m} value={m} />)}
                </datalist>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60 shrink-0">Grupo:</span>
                <select value={food.food_group ?? ""}
                  onChange={(e) => onChange({ ...food, food_group: e.target.value || undefined })}
                  className="h-7 rounded border border-border/60 bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring text-foreground">
                  <option value="">— selecionar —</option>
                  {FOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <button type="button" onClick={() => setShowSubstitute(true)}
                disabled={!food.food_name.trim()}
                className="flex items-center gap-1.5 h-7 px-3 rounded border border-border/60 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ml-auto">
                <ArrowLeftRight size={11} />
                Substituição inteligente
              </button>
            </div>
          </td>
        </tr>
      )}

      <SmartSubstituteModal
        open={showSubstitute}
        food={food}
        onClose={() => setShowSubstitute(false)}
        onSubstitute={(s) =>
          onChange(calcFoodMacros({
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

// Module-level cache so rules are fetched only once across all MealSections
let _rulesCache: SubstitutionRule[] | null = null;
let _rulesFetch: Promise<SubstitutionRule[]> | null = null;

async function getRules(): Promise<SubstitutionRule[]> {
  if (_rulesCache) return _rulesCache;
  if (!_rulesFetch) _rulesFetch = fetchSmartSubstitutions();
  _rulesCache = await _rulesFetch;
  return _rulesCache;
}

export function MealSection({
  meal, idx, onUpdate, onRemove, targetCalories, resetKey, onImportPreset,
}: {
  meal: EditorMeal; idx: number;
  onUpdate: (m: EditorMeal) => void;
  onRemove: () => void;
  targetCalories?: number;
  resetKey?: string | number;
  onImportPreset?: (targetKey: string) => void;
}) {
  const alternatives  = meal.alternative_meals ?? [];
  const totalOptions  = alternatives.length + 1; // principal + substitutas

  const [activeOptionIdx, setActiveOptionIdx] = useState(0);
  const [showNotes, setShowNotes]             = useState(false);
  const subs                                  = meal.substitution_items ?? [];
  const [showSubs, setShowSubs]               = useState(subs.length > 0);
  const [suggestions, setSuggestions]         = useState<FoodSubstitution[]>([]);
  const loaded                                = useRef(false);

  // Garante que o índice não ultrapasse as opções existentes
  const clampedIdx = Math.min(activeOptionIdx, totalOptions - 1);
  const isMain     = clampedIdx === 0;

  // Dados da opção ativa
  const currentOption = isMain ? meal : (alternatives[clampedIdx - 1] ?? meal);
  const foods         = currentOption.foods ?? [];
  const totals        = sumFoods(foods); // totals da opção ativa para rodapé da tabela
  const mainTotals    = sumFoods(meal.foods ?? []); // totals da principal para cabeçalho do card

  const borderCls = MEAL_BORDER[idx % MEAL_BORDER.length];

  const targetState =
    targetCalories && targetCalories > 0 && mainTotals.cal > 0
      ? mainTotals.cal >= targetCalories * 0.9 && mainTotals.cal <= targetCalories * 1.1
        ? { label: "Na meta",        className: "border-emerald-200 bg-emerald-50 text-emerald-700" }
        : mainTotals.cal > targetCalories * 1.1
          ? { label: "Acima da meta", className: "border-red-200 bg-red-50 text-red-700" }
          : { label: "Abaixo da meta", className: "border-amber-200 bg-amber-50 text-amber-800" }
      : { label: "Sem meta",         className: "border-border/40 bg-muted/20 text-muted-foreground" };

  // ── Smart suggestions (calculadas sobre os alimentos da refeição principal) ──
  const mainFoods = meal.foods ?? [];

  useEffect(() => {
    if (!showSubs || loaded.current) return;
    loaded.current = true;
    getRules().then((rules) => {
      setSuggestions(calculateSubstitutions(mainFoods.filter(f => f.food_name && f.quantity), rules));
    });
  }, [showSubs]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!showSubs || !loaded.current) return;
    getRules().then((rules) => {
      setSuggestions(calculateSubstitutions(mainFoods.filter(f => f.food_name && f.quantity), rules));
    });
  }, [mainFoods]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Substitution items helpers (apenas refeição principal) ────────────────
  const addSub = (item?: Partial<SubstitutionItem>) =>
    onUpdate({ ...meal, substitution_items: [...subs, { food_name: "", quantity: undefined, unit: "g", notes: "", ...item }] });

  const removeSub = (i: number) =>
    onUpdate({ ...meal, substitution_items: subs.filter((_, si) => si !== i) });

  const updateSub = (i: number, patch: Partial<SubstitutionItem>) => {
    const next = [...subs]; next[i] = { ...next[i], ...patch };
    onUpdate({ ...meal, substitution_items: next });
  };

  const isAlreadyAdded = (name: string) =>
    subs.some(s => s.food_name.toLowerCase() === name.toLowerCase());

  // ── Navegação entre opções ────────────────────────────────────────────────
  const goToOption = (targetIdx: number) => {
    const clamped = Math.max(0, Math.min(totalOptions - 1, targetIdx));
    setActiveOptionIdx(clamped);
    const t = clamped === 0 ? meal : alternatives[clamped - 1];
    setShowNotes(!!t?.notes);
  };

  useEffect(() => {
    setActiveOptionIdx(0);
    setShowNotes(!!meal.notes);
    setShowSubs((meal.substitution_items ?? []).length > 0);
    loaded.current = false;
    setSuggestions([]);
  }, [resetKey]); // reset when loading a different plan/meal record

  // ── Helpers para atualizar a opção ativa ─────────────────────────────────
  const updateCurrentOption = (patch: Partial<Pick<AlternativeMealDraft, "meal_name" | "time_suggestion" | "notes" | "foods">>) => {
    if (isMain) {
      onUpdate({ ...meal, ...patch });
    } else {
      const newAlts = [...alternatives];
      newAlts[clampedIdx - 1] = { ...alternatives[clampedIdx - 1], ...patch };
      onUpdate({ ...meal, alternative_meals: newAlts });
    }
  };

  const addAlternative = () => {
    const newAlt: AlternativeMealDraft = {
      meal_name:       `${meal.meal_name} — Opção ${alternatives.length + 2}`,
      time_suggestion: meal.time_suggestion,
      notes:           "",
      foods:           [],
    };
    const newAlts = [...alternatives, newAlt];
    onUpdate({ ...meal, alternative_meals: newAlts });
    setActiveOptionIdx(newAlts.length);
    setShowNotes(false);
  };

  const removeCurrentAlternative = () => {
    if (isMain) return;
    const newAlts = alternatives.filter((_, i) => i !== clampedIdx - 1);
    onUpdate({ ...meal, alternative_meals: newAlts });
    const newIdx = Math.max(0, clampedIdx - 1);
    setActiveOptionIdx(newIdx);
    const t = newIdx === 0 ? meal : newAlts[newIdx - 1];
    setShowNotes(!!t?.notes);
  };

  // ── Operações sobre alimentos da opção ativa ─────────────────────────────
  const updateFood = (i: number, f: MealFood) => {
    const next = [...foods]; next[i] = f;
    updateCurrentOption({ foods: next });
  };
  const removeFood = (i: number) => updateCurrentOption({ foods: foods.filter((_, fi) => fi !== i) });
  const addFood    = () => updateCurrentOption({ foods: [...foods, emptyFood()] });

  const optionLabel = isMain ? "Principal" : `Opção ${clampedIdx + 1}`;
  const presetImportTargetKey = isMain ? `meal:${idx}` : `alternative:${idx}:${clampedIdx - 1}`;

  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-border/60 border-l-[5px] bg-card shadow-sm transition-shadow hover:shadow-md ${borderCls}`}>
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-70" />

      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border/50 bg-gradient-to-r from-background via-muted/20 to-background px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-background/90 shadow-sm">
            <span className="text-xs font-black tabular-nums text-muted-foreground/80 select-none">
              {String(idx + 1).padStart(2, "0")}
            </span>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <input
              type="text"
              value={currentOption.meal_name}
              onChange={(e) => updateCurrentOption({ meal_name: e.target.value })}
              className="w-full border-0 bg-transparent p-0 text-lg font-semibold tracking-tight text-foreground placeholder:text-muted-foreground focus:outline-none"
              placeholder="Nome da refeição"
            />
            <div className="flex flex-wrap items-center gap-2">
              {/* Navegação entre opções */}
              {totalOptions > 1 ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-1.5 py-1">
                  <button
                    type="button"
                    onClick={() => goToOption(clampedIdx - 1)}
                    disabled={clampedIdx === 0}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-primary disabled:opacity-30 hover:bg-primary/20 transition-colors"
                    title="Opção anterior"
                  >
                    <ChevronLeft size={10} />
                  </button>
                  <span className="text-[10px] font-bold text-primary px-1">{optionLabel}</span>
                  <span className="text-[10px] text-muted-foreground">/ {totalOptions}</span>
                  <button
                    type="button"
                    onClick={() => goToOption(clampedIdx + 1)}
                    disabled={clampedIdx === totalOptions - 1}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-primary disabled:opacity-30 hover:bg-primary/20 transition-colors"
                    title="Próxima opção"
                  >
                    <ChevronRight size={10} />
                  </button>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  <Sparkles size={10} className="text-primary" />
                  Refeição {String(idx + 1).padStart(2, "00")}
                </span>
              )}
              {(showNotes || currentOption.notes) ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                  <NotebookPen size={10} />
                  Com observação
                </span>
              ) : null}
              {alternatives.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-700">
                  <ArrowLeftRight size={10} />
                  {alternatives.length} {alternatives.length === 1 ? "substituta" : "substitutas"}
                </span>
              )}
              {isMain && (showSubs || subs.length > 0) ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                  <ArrowLeftRight size={10} />
                  {subs.length > 0 ? `${subs.length} substituição(ões)` : "Substituições"}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 sm:justify-end">
          <div className="hidden sm:flex flex-col items-end gap-1">
            <input
              type="text"
              value={currentOption.time_suggestion ?? ""}
              onChange={(e) => updateCurrentOption({ time_suggestion: e.target.value })}
              className="w-32 rounded-xl border border-border/60 bg-background px-3 py-2 text-right text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary"
              placeholder="00:00 - 00:00"
            />
            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/50">
              Horário sugerido
            </span>
          </div>

          <div className="flex flex-col items-end gap-2">
            {targetCalories && targetCalories > 0 && (
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tabular-nums ${targetState.className}`}>
                {targetState.label}
                <span className="opacity-70">·</span>
                {n0(targetCalories)} kcal
              </span>
            )}
            {mainTotals.cal > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] font-semibold tabular-nums text-foreground">
                {n0(mainTotals.cal)} kcal
                <span className="text-muted-foreground/60">subtotal</span>
              </span>
            )}
          </div>

          {/* Botão remover: se é substituta remove a substituta, se é principal remove a refeição toda */}
          {!isMain ? (
            <button
              type="button"
              onClick={removeCurrentAlternative}
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 text-muted-foreground/50 transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              title="Remover esta opção substituta"
              aria-label="Remover esta opção substituta"
            >
              <Trash2 size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onRemove}
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 text-muted-foreground/50 transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Remover ${meal.meal_name || "refeição"}`}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Tabela de alimentos */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/40 bg-muted/20">
              <th className="pl-5 pr-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/50 w-8">#</th>
              <th className="py-2 pr-3 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/50">Alimento</th>
              <th className="py-2 pr-3 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/50 w-48">Qtd / Un.</th>
              <th className="hidden sm:table-cell py-2 pr-3 text-right text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/50 w-16">kcal</th>
              <th className="hidden sm:table-cell py-2 pr-3 text-right text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/50 w-16">Prot. g</th>
              <th className="hidden sm:table-cell py-2 pr-3 text-right text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/50 w-16">Carb. g</th>
              <th className="hidden sm:table-cell py-2 pr-3 text-right text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/50 w-16">Gord. g</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {foods.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-6">
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-background shadow-sm">
                      <Sparkles size={16} className="text-primary/70" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Nenhum alimento adicionado</p>
                    <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                      Clique em <span className="font-semibold text-primary">Adicionar alimento</span> para começar a montar esta {isMain ? "refeição" : "opção substituta"}.
                    </p>
                  </div>
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
          {foods.length > 0 && (
            <tfoot>
              <tr className="border-t border-border/50 bg-muted/20">
                <td colSpan={4} className="pl-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
                  <span className="sm:hidden">{n0(totals.cal)} kcal</span>
                  <span className="hidden sm:inline">Subtotal</span>
                </td>
                <td className="hidden sm:table-cell py-2 pr-3 text-right text-xs font-semibold text-foreground tabular-nums">{n0(totals.cal)}</td>
                <td className="hidden sm:table-cell py-2 pr-3 text-right text-xs font-semibold text-foreground tabular-nums">{n1(totals.prot)}</td>
                <td className="hidden sm:table-cell py-2 pr-3 text-right text-xs font-semibold text-foreground tabular-nums">{n1(totals.carbs)}</td>
                <td className="hidden sm:table-cell py-2 pr-3 text-right text-xs font-semibold text-foreground tabular-nums">{n1(totals.fat)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Footer */}
      <div className="border-t border-border/30 bg-gradient-to-r from-background to-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
          <button type="button" onClick={addFood}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15">
            <Plus size={12} />
            Adicionar alimento
          </button>
          {onImportPreset && (
            <button type="button" onClick={() => onImportPreset(presetImportTargetKey)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground/80 transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary">
              <LayoutList size={12} />
              Importar refeição
            </button>
          )}
          <button type="button"
            onClick={() => {
              const next = !showNotes;
              setShowNotes(next);
              if (!next) updateCurrentOption({ notes: "" });
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              showNotes || currentOption.notes
                ? "border-primary/20 bg-primary/10 text-primary hover:bg-primary/15"
                : "border-border/60 bg-background/80 text-muted-foreground/70 hover:text-foreground"
            )}>
            <MessageSquare size={12} />
            {showNotes ? "Remover observação" : "Adicionar observação"}
          </button>
          <button type="button" onClick={addAlternative}
            className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100">
            <Plus size={12} />
            Nova opção substituta
          </button>
          {isMain && (
            <button type="button"
              onClick={() => { setShowSubs(v => !v); if (!showSubs && subs.length === 0) addSub(); }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                showSubs || subs.length > 0
                  ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  : "border-border/60 bg-background/80 text-muted-foreground/70 hover:text-foreground"
              )}>
              <ArrowLeftRight size={12} />
              Substituições {subs.length > 0 && `(${subs.length})`}
            </button>
          )}
        </div>

        {showNotes && (
          <div className="px-5 pb-4">
            <textarea rows={2} value={currentOption.notes ?? ""}
              onChange={e => updateCurrentOption({ notes: e.target.value })}
              placeholder="Observações para esta refeição (substituições, preparo, orientações...)"
              className="w-full resize-none rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm text-foreground/80 placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary" />
          </div>
        )}

        {/* Painel de substituições de alimentos — apenas na refeição principal */}
        {isMain && showSubs && (
          <div className="border-t border-amber-200/60 bg-gradient-to-b from-amber-50/30 to-background">
            {/* Smart suggestions */}
            {suggestions.length > 0 && (
              <div className="space-y-3 px-5 pb-3 pt-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600/70 flex items-center gap-1.5">
                  <Sparkles size={10} /> Sugestões automáticas
                </p>
                {suggestions.map((sub) => (
                  <div key={sub.originalName} className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-medium">
                      Substituir <span className="text-foreground font-semibold">{sub.originalQty}{sub.unit} de {sub.originalName}</span>:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {sub.options.map((opt) => {
                        const added = isAlreadyAdded(opt.substituteName);
                        return (
                          <button
                            key={opt.substituteName}
                            type="button"
                            disabled={added}
                            onClick={() => addSub({
                              food_name:     opt.substituteName,
                              quantity:      opt.substituteQty,
                              unit:          opt.unit,
                              notes:         opt.criteria,
                              replaces_food: sub.originalName,
                            })}
                            title={opt.criteria}
                            className={cn(
                              "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all",
                              added
                                ? "bg-green-50 border-green-200 text-green-600 cursor-default"
                                : "bg-white border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-400 cursor-pointer"
                            )}
                          >
                            {added ? "✓" : <Plus size={10} />}
                            {opt.substituteQty}{opt.unit} {opt.substituteName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="border-t border-amber-200/50 pt-2 mt-1" />
              </div>
            )}

            {/* Linhas de substituição adicionadas */}
            <div className="px-5 pb-4 space-y-1.5">
              {suggestions.length === 0 && (
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600/70 pt-2.5 pb-1 flex items-center gap-1.5">
                  <ArrowLeftRight size={10} /> Substituições desta refeição
                </p>
              )}
              {subs.length === 0 && suggestions.length > 0 && (
                <p className="text-[11px] text-muted-foreground/50 italic pb-1">
                  Clique em uma sugestão acima ou adicione manualmente.
                </p>
              )}
              {subs.map((sub, si) => (
                <div key={si} className="rounded-2xl border border-amber-200/70 bg-white/90 px-3 py-2 space-y-1 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <ArrowLeftRight size={10} className="text-amber-400 shrink-0" />
                    <span className="text-[10px] text-muted-foreground/70 shrink-0">Substitui:</span>
                    <select
                      value={sub.replaces_food ?? ""}
                      onChange={e => updateSub(si, { replaces_food: e.target.value || undefined })}
                      className="flex-1 min-w-0 text-xs bg-transparent border-0 focus:outline-none text-foreground/80 cursor-pointer"
                    >
                      <option value="">— selecionar alimento —</option>
                      {mainFoods.filter(f => f.food_name?.trim()).map((f, fi) => (
                        <option key={fi} value={f.food_name}>{f.food_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5 pl-3.5">
                    <span className="text-[10px] text-muted-foreground/50 shrink-0">Por:</span>
                    <input
                      value={sub.food_name}
                      onChange={e => updateSub(si, { food_name: e.target.value })}
                      placeholder="Alimento substituto"
                      className="flex-1 min-w-0 text-xs bg-transparent border-0 focus:outline-none text-foreground placeholder:text-muted-foreground/40"
                    />
                    <input
                      type="number"
                      value={sub.quantity ?? ""}
                      onChange={e => updateSub(si, { quantity: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="Qtd"
                      className="w-14 text-xs bg-transparent border-0 focus:outline-none text-right tabular-nums text-foreground"
                    />
                    <span className="text-[10px] text-muted-foreground w-6">{sub.unit ?? "g"}</span>
                    <input
                      value={sub.notes ?? ""}
                      onChange={e => updateSub(si, { notes: e.target.value })}
                      placeholder="Observação"
                      className="w-32 text-xs bg-transparent border-0 focus:outline-none text-muted-foreground placeholder:text-muted-foreground/30 italic"
                    />
                    <button type="button" onClick={() => removeSub(si)}
                      className="text-muted-foreground/20 hover:text-destructive transition-colors shrink-0">
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => addSub()}
                className="flex items-center gap-1 text-xs text-amber-600/70 hover:text-amber-600 font-medium transition-colors mt-0.5">
                <Plus size={11} /> Adicionar manualmente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
