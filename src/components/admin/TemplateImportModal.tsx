import { useEffect, useState } from "react";
import { Loader2, FileText, CheckCircle2, ChevronRight, LayoutList } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fetchDietTemplates,
  type DietTemplate,
  type DietTemplateMeal,
  type DietTemplateFood,
  type Meal,
  type MealFood,
} from "@/lib/supabase";

const STRATEGY_LABELS: Record<string, string> = {
  low_carb: "Low Carb",
  mediterranea: "Mediterranea",
  hipertrofia: "Hipertrofia",
  emagrecimento: "Emagrecimento",
};

const STRATEGY_COLORS: Record<string, string> = {
  low_carb: "bg-blue-100 text-blue-700 border-blue-200",
  mediterranea: "bg-teal-100 text-teal-700 border-teal-200",
  hipertrofia: "bg-emerald-100 text-emerald-700 border-emerald-200",
  emagrecimento: "bg-amber-100 text-amber-700 border-amber-200",
};

function strategyBadge(strategy?: string) {
  if (!strategy) return null;
  const label = STRATEGY_LABELS[strategy] ?? strategy;
  const colors = STRATEGY_COLORS[strategy] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide shrink-0", colors)}>
      {label}
    </span>
  );
}

function templateMealToMeal(tm: DietTemplateMeal): Meal {
  return {
    plan_id: 0,
    meal_name: tm.meal_name,
    time_suggestion: tm.time_suggestion ?? "",
    foods: (tm.foods ?? []).map((tf: DietTemplateFood): MealFood => {
      const qty = tf.quantity;
      const calc = (per100?: number) =>
        per100 && qty ? parseFloat(((per100 * qty) / 100).toFixed(1)) : undefined;
      return {
        meal_id: 0,
        food_name: tf.food_name,
        quantity: qty ?? undefined,
        unit: tf.unit ?? "g",
        kcal_per_100g: tf.kcal_per_100g ?? undefined,
        protein_per_100g: tf.protein_per_100g ?? undefined,
        carbs_per_100g: tf.carbs_per_100g ?? undefined,
        fat_per_100g: tf.fat_per_100g ?? undefined,
        calories: calc(tf.kcal_per_100g),
        protein: calc(tf.protein_per_100g),
        carbs: calc(tf.carbs_per_100g),
        fat: calc(tf.fat_per_100g),
        household_measure: tf.household_measure ?? undefined,
        measure_amount: tf.measure_amount ?? undefined,
        food_group: tf.food_group ?? undefined,
        notes: tf.notes ?? undefined,
      };
    }),
  };
}

function templateToMeals(template: DietTemplate): Meal[] {
  return (template.meals ?? []).map((tm) => templateMealToMeal(tm));
}

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: DietTemplate;
  selected: boolean;
  onSelect: () => void;
}) {
  const mealCount = template.meals?.length ?? 0;
  const foodCount = template.meals?.reduce((s, m) => s + (m.foods?.length ?? 0), 0) ?? 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-lg border px-4 py-3 transition-all",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
          : "border-border hover:border-primary/40 hover:bg-muted/30"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {strategyBadge(template.strategy)}
            <span className="text-sm font-semibold text-foreground truncate">{template.name}</span>
          </div>
          {template.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">{template.description}</p>
          )}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            {template.total_kcal && (
              <span className="font-semibold text-foreground tabular-nums">{template.total_kcal} kcal</span>
            )}
            {template.protein_g && <span>PTN {template.protein_g}g</span>}
            {template.carbs_g && <span>CHO {template.carbs_g}g</span>}
            {template.fat_g && <span>LIP {template.fat_g}g</span>}
            <span className="ml-auto">{mealCount} refeicoes · {foodCount} alimentos</span>
          </div>
        </div>
        <div className="shrink-0 mt-0.5">
          {selected
            ? <CheckCircle2 size={18} className="text-primary" />
            : <ChevronRight size={16} className="text-muted-foreground/40" />}
        </div>
      </div>
    </button>
  );
}

function MealPreview({ meal }: { meal: DietTemplateMeal }) {
  const foods = meal.foods ?? [];
  return (
    <div className="rounded-md border border-border/50 overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/40 flex items-center justify-between">
        <span className="text-xs font-bold text-foreground">{meal.meal_name}</span>
        {meal.time_suggestion && (
          <span className="text-[10px] text-muted-foreground">{meal.time_suggestion}</span>
        )}
      </div>
      {foods.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground/50 italic">Sem alimentos cadastrados</p>
      ) : (
        <ul className="divide-y divide-border/30">
          {foods.map((f, i) => (
            <li key={i} className="flex items-center justify-between px-3 py-1.5 gap-2">
              <span className="text-xs text-foreground">{f.food_name}</span>
              <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                {f.quantity ? `${f.quantity}${f.unit ?? "g"}` : "—"}
                {f.household_measure && ` (${f.measure_amount ?? 1} ${f.household_measure})`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface Props {
  open: boolean;
  hasMeals: boolean;
  scope?: "plan" | "meal";
  targetMealLabel?: string;
  onClose: () => void;
  onImport: (meals: Meal[], mode: "replace" | "append") => void;
  onImportMealBlock?: (meal: Meal, mode: "replace" | "append") => void;
}

export function TemplateImportModal({
  open,
  hasMeals,
  scope = "plan",
  targetMealLabel,
  onClose,
  onImport,
  onImportMealBlock,
}: Props) {
  const [templates, setTemplates] = useState<DietTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<DietTemplate | null>(null);
  const [mode, setMode] = useState<"replace" | "append">("replace");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedMealIndex, setSelectedMealIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setMode("replace");
    setPreviewOpen(false);
    setSelectedMealIndex(0);
    setLoading(true);
    fetchDietTemplates().then((data) => {
      setTemplates(data);
      setLoading(false);
    });
  }, [open]);

  useEffect(() => {
    setSelectedMealIndex(0);
  }, [selected?.id]);

  const handleImport = () => {
    if (!selected) return;

    if (scope === "meal") {
      const meal = selected.meals?.[selectedMealIndex];
      if (!meal || !onImportMealBlock) return;
      onImportMealBlock(templateMealToMeal(meal), mode);
    } else {
      onImport(templateToMeals(selected), mode);
    }

    onClose();
  };

  const selectedMealCount = selected?.meals?.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/60 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <LayoutList size={16} className="text-primary" />
            {scope === "meal" ? "Importar bloco de refeição" : "Importar dieta"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {scope === "meal"
              ? `Selecione um template e escolha um bloco para aplicar em ${targetMealLabel ?? "esta refeicao"}.`
              : "Selecione um template para preencher automaticamente as refeicoes e alimentos do plano."}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Carregando templates...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <FileText size={32} className="opacity-30" />
              <p className="text-sm">Nenhuma dieta disponivel.</p>
              <p className="text-xs opacity-60">Execute a migration Epic 7 no Supabase para criar os templates demo.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {templates.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    selected={selected?.id === t.id}
                    onSelect={() => { setSelected(t); setPreviewOpen(false); }}
                  />
                ))}
              </div>

              {selected && (
                <div className="rounded-lg border border-border/60 overflow-hidden mt-2">
                  <button
                    type="button"
                    onClick={() => setPreviewOpen((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 text-xs font-semibold text-muted-foreground hover:bg-muted/50 transition-colors"
                  >
                    <span>Previa das refeicoes - {selectedMealCount} refeicoes</span>
                    <ChevronRight size={14} className={cn("transition-transform", previewOpen && "rotate-90")} />
                  </button>

                  {previewOpen && (
                    <div className="p-3 space-y-2 bg-background/60">
                      {(selected.meals ?? []).map((m, i) => (
                        <MealPreview key={i} meal={m} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selected && scope === "meal" && selectedMealCount > 0 && (
                <div className="rounded-lg border border-border/60 px-4 py-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground">
                    Bloco para aplicar em {targetMealLabel ?? "esta refeicao"}
                  </p>
                  <div className="space-y-1.5">
                    {(selected.meals ?? []).map((meal, index) => (
                      <label
                        key={`${selected.id}-${index}`}
                        className={cn(
                          "flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer transition-colors",
                          selectedMealIndex === index
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40 hover:bg-muted/30"
                        )}
                      >
                        <input
                          type="radio"
                          name="template-meal"
                          checked={selectedMealIndex === index}
                          onChange={() => setSelectedMealIndex(index)}
                          className="accent-primary"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate">{meal.meal_name}</p>
                          <p className="text-[10px] text-muted-foreground">{meal.foods?.length ?? 0} alimento(s)</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {selected && hasMeals && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-800">
                    {scope === "meal"
                      ? "Esta refeicao ja possui alimentos. O que deseja fazer?"
                      : "O plano ja possui refeicoes. O que deseja fazer?"}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {(
                      (scope === "meal"
                        ? [
                            ["replace", "Substituir - trocar esta refeicao pelo bloco"],
                            ["append", "Adicionar - manter a refeicao atual e somar os alimentos do bloco"],
                          ]
                        : [
                            ["replace", "Substituir - apagar as refeicoes atuais e importar o template"],
                            ["append", "Adicionar - manter as refeicoes atuais e acrescentar as do template"],
                          ]) as [typeof mode, string][]
                    ).map(([val, label]) => (
                      <label key={val} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="import-mode"
                          value={val}
                          checked={mode === val}
                          onChange={() => setMode(val)}
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

        <DialogFooter className="px-6 py-4 border-t border-border/60 shrink-0 flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleImport} disabled={!selected} className="gap-1.5">
            <LayoutList size={14} />
            Importar template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
