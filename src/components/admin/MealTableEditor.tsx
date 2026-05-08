/**
 * MealTableEditor — componentes reutilizáveis de edição de refeições.
 *
 * Usado por AdminPlanoAlimentar (modo paciente) e AdminTemplateEditor (modo template).
 * Contém: FoodRow, MealSection, helpers de cálculo e constantes de UI.
 */

import { useState } from "react";
import { Plus, Trash2, MessageSquare, ChevronDown, ChevronUp, ArrowLeftRight } from "lucide-react";
import { FoodSearchInput } from "@/components/admin/FoodSearchInput";
import { SmartSubstituteModal } from "@/components/admin/SmartSubstituteModal";
import { cn } from "@/lib/utils";
import type { MealFood } from "@/lib/supabase";

// ─── Constants ────────────────────────────────────────────────────────────────

export const UNITS = ["g", "ml", "unid.", "col. sopa", "col. chá", "xícara", "fatia", "porção"] as const;

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

/** Refeição genérica usada tanto em planos de paciente quanto em templates */
export interface EditorMeal {
  /** id do registro no banco (meal.id ou diet_template_meal.id) — undefined para novos */
  _dbId?: number;
  meal_name:       string;
  time_suggestion?: string;
  notes?:          string;
  foods:           MealFood[];
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

export function calcFoodMacros(food: MealFood): MealFood {
  const qty = food.quantity;
  if (!qty || !food.kcal_per_100g) return food;
  const f = qty / 100;
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

// ─── FoodRow ──────────────────────────────────────────────────────────────────

export function FoodRow({
  food,
  idx,
  onChange,
  onRemove,
}: {
  food:     MealFood;
  idx:      number;
  onChange: (f: MealFood) => void;
  onRemove: () => void;
}) {
  const [showDetails,   setShowDetails]   = useState(false);
  const [showSubstitute, setShowSubstitute] = useState(false);

  const handleSelect = (s: {
    name: string;
    kcal_per_100g: number; protein_per_100g: number;
    carbs_per_100g: number; fat_per_100g: number;
  }) =>
    onChange(calcFoodMacros({
      ...food,
      food_name:        s.name,
      kcal_per_100g:    s.kcal_per_100g,
      protein_per_100g: s.protein_per_100g,
      carbs_per_100g:   s.carbs_per_100g,
      fat_per_100g:     s.fat_per_100g,
    }));

  const handleQty = (val: string) =>
    onChange(calcFoodMacros({ ...food, quantity: val === "" ? undefined : parseFloat(val) }));

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
          <input type="text" list="unit-list-shared" value={food.unit ?? "g"}
            onChange={(e) => onChange({ ...food, unit: e.target.value })}
            className={cellTxt}
          />
          <datalist id="unit-list-shared">
            {UNITS.map((u) => <option key={u} value={u} />)}
          </datalist>
        </td>

        {/* Macros */}
        {numCell(food.calories)}
        {numCell(food.protein)}
        {numCell(food.carbs)}
        {numCell(food.fat)}

        {/* Ações */}
        <td className="py-2 pr-2 w-16 align-middle">
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
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

      {/* Linha expandível de detalhes */}
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
                  list="measure-list-shared"
                  className="h-7 w-36 rounded border border-border/60 bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <datalist id="measure-list-shared">
                  {["colher de sopa", "colher de chá", "colher de sobremesa", "xícara", "unidade média",
                    "unidade pequena", "unidade grande", "fatia", "porção", "copo", "escumadeira"]
                    .map((m) => <option key={m} value={m} />)}
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

export function MealSection({
  meal,
  idx,
  onUpdate,
  onRemove,
}: {
  meal:     EditorMeal;
  idx:      number;
  onUpdate: (m: EditorMeal) => void;
  onRemove: () => void;
}) {
  const foods     = meal.foods ?? [];
  const totals    = sumFoods(foods);
  const borderCls = MEAL_BORDER[idx % MEAL_BORDER.length];
  const [showNotes, setShowNotes] = useState(!!meal.notes);

  const updateFood = (i: number, f: MealFood) => {
    const n = [...foods]; n[i] = f; onUpdate({ ...meal, foods: n });
  };
  const removeFood = (i: number) => onUpdate({ ...meal, foods: foods.filter((_, fi) => fi !== i) });
  const addFood    = () => onUpdate({ ...meal, foods: [...foods, emptyFood()] });

  return (
    <div className={`bg-card border border-border/50 rounded-lg overflow-hidden border-l-[3px] ${borderCls}`}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/30 border-b border-border/40">
        <span className="text-xs font-bold text-muted-foreground/60 w-5 flex-shrink-0 select-none tabular-nums">
          {String(idx + 1).padStart(2, "0")}
        </span>
        <input
          type="text"
          value={meal.meal_name}
          onChange={(e) => onUpdate({ ...meal, meal_name: e.target.value })}
          className="text-base font-bold bg-transparent border-0 focus:outline-none text-foreground flex-1 min-w-0 placeholder:text-muted-foreground"
          placeholder="Nome da refeição"
        />
        <input
          type="text"
          value={meal.time_suggestion ?? ""}
          onChange={(e) => onUpdate({ ...meal, time_suggestion: e.target.value })}
          className="hidden sm:block text-xs bg-transparent border-0 focus:outline-none w-28 text-muted-foreground text-right flex-shrink-0"
          placeholder="00:00 – 00:00"
        />
        {totals.cal > 0 && (
          <span className="text-xs tabular-nums text-muted-foreground font-medium flex-shrink-0 ml-2 border-l border-border pl-3">
            {n0(totals.cal)} kcal
          </span>
        )}
        <button type="button" onClick={onRemove}
          className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0 ml-1">
          <Trash2 size={13} />
        </button>
      </div>

      {/* Tabela de alimentos */}
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

      {/* Footer */}
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
            className={cn(
              "flex items-center gap-1 text-xs font-medium transition-colors",
              showNotes || meal.notes
                ? "text-primary hover:text-primary/80"
                : "text-muted-foreground/50 hover:text-muted-foreground"
            )}
          >
            <MessageSquare size={12} />
            {showNotes ? "Remover observação" : "Adicionar observação"}
          </button>
        </div>

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
