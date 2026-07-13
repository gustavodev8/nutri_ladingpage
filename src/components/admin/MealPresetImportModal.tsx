import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, LayoutList, Loader2, Search, Soup } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fetchMealPresets, type MealPreset, type MealPresetFood, type Meal, type MealFood } from "@/lib/supabase";

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function mealPresetToMeal(preset: MealPreset): Meal {
  const foods = preset.foods ?? [];

  return {
    plan_id: 0,
    meal_name: preset.meal_name,
    time_suggestion: preset.time_suggestion ?? "",
    notes: preset.notes ?? "",
    foods: foods.map((food: MealPresetFood): MealFood => ({
      meal_id: 0,
      food_name: food.food_name,
      quantity: food.quantity ?? undefined,
      unit: food.unit ?? "g",
      calories: food.calories ?? undefined,
      protein: food.protein ?? undefined,
      carbs: food.carbs ?? undefined,
      fat: food.fat ?? undefined,
      notes: food.notes ?? undefined,
      household_measure: food.household_measure ?? undefined,
      measure_amount: food.measure_amount ?? undefined,
      food_group: food.food_group ?? undefined,
    })),
    substitution_items: [],
  };
}

function formatTotals(preset: MealPreset) {
  const kcal = preset.total_kcal ?? 0;
  const protein = preset.protein_g ?? 0;
  const carbs = preset.carbs_g ?? 0;
  const fat = preset.fat_g ?? 0;
  return `${Math.round(kcal)} kcal · P ${protein.toFixed(1)}g · C ${carbs.toFixed(1)}g · G ${fat.toFixed(1)}g`;
}

function PresetCard({
  preset,
  selected,
  onSelect,
}: {
  preset: MealPreset;
  selected: boolean;
  onSelect: () => void;
}) {
  const foodCount = preset.foods?.length ?? 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-2xl border p-4 text-left transition-all",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
          : "border-border hover:border-primary/40 hover:bg-muted/30"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <Soup size={14} className="text-primary shrink-0" />
            <p className="truncate text-sm font-semibold text-foreground">{preset.name}</p>
          </div>
          <p className="text-xs font-medium text-muted-foreground">{preset.meal_name}</p>
          {preset.description && (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{preset.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
            <span className="font-semibold text-foreground">{formatTotals(preset)}</span>
            <span>{foodCount} alimento(s)</span>
          </div>
        </div>
        <div className="shrink-0 pt-0.5">
          {selected
            ? <CheckCircle2 size={18} className="text-primary" />
            : <ChevronRight size={16} className="text-muted-foreground/40" />}
        </div>
      </div>
    </button>
  );
}

function MealPreview({ meal }: { meal: Meal }) {
  const foods = meal.foods ?? [];

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border/40 bg-muted/30 px-3 py-2">
        <span className="text-xs font-semibold text-foreground">{meal.meal_name}</span>
        {meal.time_suggestion && (
          <span className="text-[10px] text-muted-foreground">{meal.time_suggestion}</span>
        )}
      </div>
      {foods.length === 0 ? (
        <p className="px-3 py-3 text-xs italic text-muted-foreground/60">Sem alimentos cadastrados</p>
      ) : (
        <ul className="divide-y divide-border/30">
          {foods.map((food, index) => (
            <li key={`${food.food_name}-${index}`} className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="text-xs text-foreground">{food.food_name}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {food.quantity ? `${food.quantity}${food.unit ?? "g"}` : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface MealPresetImportTarget {
  key: string;
  label: string;
  kind: "meal" | "alternative";
  hasFoods: boolean;
  targetCalories?: number;
}

interface Props {
  open: boolean;
  targets: MealPresetImportTarget[];
  targetKey: string;
  onTargetKeyChange: (key: string) => void;
  onClose: () => void;
  onImport: (meal: Meal, mode: "replace" | "append") => void;
}

export function MealPresetImportModal({
  open,
  targets,
  targetKey,
  onTargetKeyChange,
  onClose,
  onImport,
}: Props) {
  const [presets, setPresets] = useState<MealPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<MealPreset | null>(null);
  const [mode, setMode] = useState<"replace" | "append">("replace");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [kcalFilter, setKcalFilter] = useState<"all" | "close" | "below" | "above" | "light">("all");

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setMode("replace");
    setPreviewOpen(false);
    setSearch("");
    setKcalFilter("all");
    setLoading(true);
    fetchMealPresets()
      .then((data) => setPresets(data))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (targets.length > 0 && !targets.some((target) => target.key === targetKey)) {
      onTargetKeyChange(targets[0].key);
    }
  }, [onTargetKeyChange, targetKey, targets]);

  const selectedTarget = targets.find((target) => target.key === targetKey) ?? targets[0];
  const hasMeals = selectedTarget?.hasFoods ?? false;
  const targetCalories = selectedTarget?.targetCalories;

  const filteredPresets = useMemo(() => {
    const term = normalizeText(search);
    const hasTargetCalories = Boolean(targetCalories && targetCalories > 0);
    const target = targetCalories ?? 0;

    const matchesKcalFilter = (preset: MealPreset) => {
      if (!hasTargetCalories || kcalFilter === "all") return true;

      const kcal = preset.total_kcal ?? 0;
      const diff = Math.abs(kcal - target);
      const pct = target > 0 ? diff / target : 0;

      switch (kcalFilter) {
        case "close":
          return pct <= 0.1;
        case "below":
          return kcal < target * 0.9;
        case "above":
          return kcal > target * 1.1;
        case "light":
          return kcal <= target * 0.7;
        default:
          return true;
      }
    };

    const scoreByCalories = (preset: MealPreset) => {
      if (!hasTargetCalories) return 0;
      const kcal = preset.total_kcal ?? 0;
      const diff = Math.abs(kcal - target);
      const pct = target > 0 ? diff / target : 0;
      return -pct;
    };

    return presets.filter((preset) => {
      const haystack = normalizeText([
        preset.name,
        preset.meal_name,
        preset.description ?? "",
        preset.notes ?? "",
        preset.strategy ?? "",
        ...(preset.foods ?? []).map((food) => food.food_name),
      ].join(" "));
      return haystack.includes(term) && matchesKcalFilter(preset);
    }).sort((a, b) => {
      const kcalSort = scoreByCalories(b) - scoreByCalories(a);
      if (kcalSort !== 0) return kcalSort;
      return (a.name ?? "").localeCompare(b.name ?? "");
    });
  }, [presets, search, kcalFilter, targetCalories]);

  const selectedMealName = selectedTarget?.label ?? "Refeição";

  const handleImport = () => {
    if (!selected) return;
    onImport(mealPresetToMeal(selected), mode);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="shrink-0 border-b border-border/60 px-6 pt-5 pb-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <LayoutList size={16} className="text-primary" />
            Importar refeição
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Selecione uma refeição salva no banco e aplique no plano atual com substituição ou complemento.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background px-3">
                <Search size={16} className="text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar refeição, alimento ou descrição"
                  className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {targets.map((target) => (
                  <button
                    key={target.key}
                    type="button"
                    onClick={() => onTargetKeyChange(target.key)}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      targetKey === target.key
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    )}
                  >
                    {target.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["all", "Todas"],
                    ["close", "Perto da meta"],
                    ["below", "Mais leves"],
                    ["above", "Mais fortes"],
                    ["light", "Muito leves"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setKcalFilter(value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors",
                      kcalFilter === value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Itens</p>
                <p className="mt-1 text-2xl font-black text-foreground">{filteredPresets.length}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Alvo</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {targetCalories ? `${Math.round(targetCalories)} kcal` : "Sem meta"}
                </p>
                {targetCalories ? (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {kcalFilter === "close" && "janela de ±10%"}
                    {kcalFilter === "below" && "abaixo de 90% da meta"}
                    {kcalFilter === "above" && "acima de 110% da meta"}
                    {kcalFilter === "light" && "até 70% da meta"}
                    {kcalFilter === "all" && "todos os modelos"}
                  </p>
                ) : null}
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Foco</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{selectedMealName}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Ação</p>
                <p className="mt-1 text-sm font-semibold text-foreground">Usar no plano</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Carregando refeições...</span>
            </div>
          ) : filteredPresets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 px-6 py-10 text-center">
              <Soup size={30} className="mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">Nenhuma refeição encontrada.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Cadastre modelos de refeição para reaproveitar depois no plano alimentar.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredPresets.map((preset) => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    selected={selected?.id === preset.id}
                    onSelect={() => {
                      setSelected(preset);
                      setPreviewOpen(false);
                    }}
                  />
                ))}
              </div>

              {selected && (
                <div className="rounded-2xl border border-border/60 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setPreviewOpen((value) => !value)}
                    className="flex w-full items-center justify-between bg-muted/25 px-4 py-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/40"
                  >
                    <span>Prévia da refeição</span>
                    <ChevronRight size={14} className={cn("transition-transform", previewOpen && "rotate-90")} />
                  </button>
                  {previewOpen && (
                    <div className="space-y-3 bg-background/70 p-4">
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-foreground">{selected.name}</p>
                          {selected.description && (
                            <p className="text-xs leading-relaxed text-muted-foreground">{selected.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {selected.meal_name}
                            {selected.time_suggestion ? ` · ${selected.time_suggestion}` : ""}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Resumo</p>
                          <p className="mt-2 text-xs text-foreground">{formatTotals(selected)}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{selected.foods?.length ?? 0} alimento(s)</p>
                        </div>
                      </div>
                      <MealPreview meal={mealPresetToMeal(selected)} />
                    </div>
                  )}
                </div>
              )}

              {selected && hasMeals && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-800">
                    O {selectedMealName.toLowerCase()} já possui alimentos. O que deseja fazer?
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {(
                      [
                        ["replace", "Substituir - trocar a refeição atual pela selecionada"],
                        ["append", "Adicionar - manter a refeição atual e somar os alimentos"],
                      ] as [typeof mode, string][]
                    ).map(([value, label]) => (
                      <label key={value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="meal-preset-mode"
                          value={value}
                          checked={mode === value}
                          onChange={() => setMode(value)}
                          className="accent-primary"
                        />
                        <span className="text-xs text-amber-900">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border/60 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleImport} disabled={!selected} className="gap-2">
            <LayoutList size={14} />
            Importar refeição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
