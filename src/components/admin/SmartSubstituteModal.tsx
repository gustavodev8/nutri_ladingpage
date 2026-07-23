import { useState, useEffect, useMemo } from "react";
import { Search, ArrowLeftRight, CheckCircle2, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BUILT_IN_FOODS, FOOD_CATEGORIES, type FoodItem } from "@/lib/foodDatabase";
import { fetchCustomFoods } from "@/components/admin/customFoods";
import type { MealFood } from "@/lib/supabase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// food_group → database categories mapping for smart pre-filtering
const GROUP_CATEGORIES: Record<string, string[]> = {
  "Carboidrato": ["Cereais e derivados", "Pães, bolos e biscoitos", "Leguminosas"],
  "Proteína":    ["Carnes e aves", "Peixes e frutos do mar", "Ovos e laticínios", "Leguminosas", "Suplementos"],
  "Gordura":     ["Óleos e gorduras", "Oleaginosas e sementes"],
  "Fruta":       ["Frutas"],
  "Vegetal":     ["Verduras e legumes"],
  "Laticínio":   ["Ovos e laticínios"],
  "Leguminosa":  ["Leguminosas"],
};

function findFoodCategory(name: string): string | null {
  const norm = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const hit = BUILT_IN_FOODS.find(
    (f) => f.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") === norm
  );
  return hit?.category ?? null;
}

function deriveCategoriesForFood(food: MealFood): string[] {
  // 1) try exact name match in DB
  const cat = findFoodCategory(food.food_name);
  if (cat) return [cat];

  // 2) map food_group → categories
  if (food.food_group && GROUP_CATEGORIES[food.food_group]) {
    return GROUP_CATEGORIES[food.food_group];
  }

  // 3) fallback: all categories
  return [...FOOD_CATEGORIES];
}

// ─── FoodResultRow ────────────────────────────────────────────────────────────

function FoodResultRow({
  food,
  selected,
  onSelect,
}: {
  food: FoodItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left flex items-center justify-between px-4 py-2.5 gap-3 transition-colors border-b border-border/30 last:border-0",
        selected
          ? "bg-primary/5 border-l-2 border-l-primary"
          : "hover:bg-muted/40"
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{food.name}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{food.category}</p>
      </div>
      <div className="text-right text-xs tabular-nums shrink-0">
        <p className="font-semibold text-foreground/80">{food.kcal} kcal</p>
        <p className="text-muted-foreground mt-0.5">
          P {food.protein}g · C {food.carbs}g · G {food.fat}g
        </p>
      </div>
      <div className="shrink-0">
        {selected
          ? <CheckCircle2 size={16} className="text-primary" />
          : <ChevronRight size={14} className="text-muted-foreground/40" />}
      </div>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface SubstituteResult {
  name:             string;
  kcal_per_100g:    number;
  protein_per_100g: number;
  carbs_per_100g:   number;
  fat_per_100g:     number;
}

interface Props {
  open:         boolean;
  food:         MealFood;
  onClose:      () => void;
  onSubstitute: (replacement: SubstituteResult) => void;
}

export function SmartSubstituteModal({ open, food, onClose, onSubstitute }: Props) {
  const [query, setQuery]               = useState("");
  const [activeCategories, setActive]   = useState<string[]>([]);
  const [selected, setSelected]         = useState<FoodItem | null>(null);
  const [customFoods, setCustomFoods]   = useState<FoodItem[]>([]);

  // On open: determine smart categories and reset state
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(null);
    setActive(deriveCategoriesForFood(food));
    fetchCustomFoods().then(setCustomFoods);
  }, [open, food]);

  const allFoods = useMemo(
    () => [...customFoods, ...BUILT_IN_FOODS],
    [customFoods]
  );

  const results = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const currentNorm = norm(food.food_name);
    return allFoods
      .filter((f) => {
        if (norm(f.name) === currentNorm) return false; // exclude self
        if (!activeCategories.includes(f.category)) return false;
        if (query.trim().length >= 2 && !norm(f.name).includes(norm(query))) return false;
        return true;
      })
      .slice(0, 40);
  }, [allFoods, activeCategories, query, food.food_name]);

  const toggleCategory = (cat: string) => {
    setActive((prev) =>
      prev.includes(cat) ? (prev.length > 1 ? prev.filter((c) => c !== cat) : prev) : [...prev, cat]
    );
    setSelected(null);
  };

  const handleConfirm = () => {
    if (!selected) return;
    onSubstitute({
      name:             selected.name,
      kcal_per_100g:    selected.kcal,
      protein_per_100g: selected.protein,
      carbs_per_100g:   selected.carbs,
      fat_per_100g:     selected.fat,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">

        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/60 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ArrowLeftRight size={16} className="text-primary" />
            Substituição inteligente
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Substituindo: <strong className="text-foreground">{food.food_name}</strong>
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto flex flex-col">

          {/* Category chips */}
          <div className="px-4 py-3 border-b border-border/40 flex flex-wrap gap-1.5">
            {FOOD_CATEGORIES.filter((c) => c !== "Personalizado").map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={cn(
                  "text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all",
                  activeCategories.includes(cat)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="px-4 py-2.5 border-b border-border/40">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
                placeholder="Filtrar por nome…"
                className="w-full h-8 pl-8 pr-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary"
              />
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <ArrowLeftRight size={24} className="opacity-30" />
                <p className="text-sm">Nenhum alimento encontrado.</p>
                <p className="text-xs opacity-60">Tente selecionar outras categorias ou ampliar a busca.</p>
              </div>
            ) : (
              results.map((f) => (
                <FoodResultRow
                  key={f.id}
                  food={f}
                  selected={selected?.id === f.id}
                  onSelect={() => setSelected(f)}
                />
              ))
            )}
          </div>
        </div>

        {/* Preview of selected */}
        {selected && (
          <div className="px-4 py-3 bg-primary/5 border-t border-primary/20 text-xs text-foreground flex items-center justify-between gap-4 shrink-0">
            <div>
              <span className="font-semibold">{selected.name}</span>
              <span className="text-muted-foreground ml-2">
                {selected.kcal} kcal · P {selected.protein}g · C {selected.carbs}g · G {selected.fat}g (por 100g)
              </span>
            </div>
            {food.quantity && (
              <span className="text-muted-foreground shrink-0">
                →&nbsp;
                <strong className="text-foreground">
                  {((selected.kcal * food.quantity) / 100).toFixed(0)} kcal
                </strong>
                &nbsp;com {food.quantity}{food.unit ?? "g"}
              </span>
            )}
          </div>
        )}

        <DialogFooter className="px-6 py-4 border-t border-border/60 shrink-0 flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!selected} className="gap-1.5">
            <ArrowLeftRight size={14} />
            Substituir alimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
