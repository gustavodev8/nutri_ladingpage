import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Meal } from "@/lib/supabase";

type SelectedAlternatives = Record<number, number[]>;
export type PdfSubstitutionLayout = "stacked" | "columns";

interface Props {
  open: boolean;
  meals: Meal[];
  title: string;
  description: string;
  confirmLabel: string;
  emptyMessage: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selectedAlternatives: SelectedAlternatives, substitutionLayout: PdfSubstitutionLayout) => void;
}

function buildInitialSelection(meals: Meal[]) {
  void meals;
  return {};
}

export function MealPlanPdfOptionsDialog({
  open,
  meals,
  title,
  description,
  confirmLabel,
  emptyMessage,
  onOpenChange,
  onConfirm,
}: Props) {
  const [selection, setSelection] = useState<SelectedAlternatives>({});
  const [layout, setLayout] = useState<PdfSubstitutionLayout>("stacked");

  useEffect(() => {
    if (open) {
      setSelection(buildInitialSelection(meals));
      setLayout("stacked");
    }
  }, [open, meals]);

  const toggleAlternative = (mealIndex: number, altIndex: number) => {
    setSelection((current) => {
      const selected = current[mealIndex] ?? [];
      const nextSelected = selected.includes(altIndex)
        ? selected.filter((index) => index !== altIndex)
        : [...selected, altIndex];

      return { ...current, [mealIndex]: nextSelected };
    });
  };

  const selectAll = (mealIndex: number, alternativesCount: number) => {
    setSelection((current) => ({
      ...current,
      [mealIndex]: Array.from({ length: alternativesCount }, (_, altIndex) => altIndex),
    }));
  };

  const handleConfirm = () => {
    const normalizedSelection: SelectedAlternatives = {};

    meals.forEach((meal, mealIndex) => {
      const alternatives = meal.alternative_meals ?? [];
      if (alternatives.length > 0) {
        normalizedSelection[mealIndex] = selection[mealIndex] ?? [];
      }
    });

    onConfirm(normalizedSelection, layout);
  };

  const mealsWithAlternatives = meals.filter((meal) => (meal.alternative_meals?.length ?? 0) > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[86vh] w-[min(92vw,54rem)] flex-col overflow-hidden rounded-2xl border-border/60 p-4 sm:p-5">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg font-semibold sm:text-xl">{title}</DialogTitle>
          <DialogDescription className="text-sm leading-snug text-muted-foreground">{description}</DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            Layout das substituições
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setLayout("stacked")}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left transition-colors",
                layout === "stacked" ? "border-primary bg-primary/5" : "border-border/70 bg-background hover:bg-muted/30",
              )}
            >
              <p className="text-sm font-semibold text-foreground">Empilhado</p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">Mostra uma substituição abaixo da outra.</p>
            </button>
            <button
              type="button"
              onClick={() => setLayout("columns")}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left transition-colors",
                layout === "columns" ? "border-primary bg-primary/5" : "border-border/70 bg-background hover:bg-muted/30",
              )}
            >
              <p className="text-sm font-semibold text-foreground">Lado a lado</p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">Mostra até duas substituições na mesma linha.</p>
            </button>
          </div>
        </div>

        <div className="min-h-0 max-h-[56vh] space-y-3 overflow-y-auto pr-1">
          {mealsWithAlternatives.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            meals.map((meal, mealIndex) => {
              const alternatives = meal.alternative_meals ?? [];
              if (alternatives.length === 0) return null;

              const selected = selection[mealIndex] ?? [];

              return (
                <div key={`${meal.meal_name}-${mealIndex}`} className="rounded-xl border border-border/70 bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">
                        Refeição {mealIndex + 1}
                      </p>
                      <h3 className="mt-0.5 text-sm font-semibold text-foreground sm:text-base">{meal.meal_name}</h3>
                      <p className="text-[11px] text-muted-foreground">
                        {alternatives.length} opção{alternatives.length === 1 ? "" : "ões"} de substituição
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-full px-3 text-xs"
                      onClick={() => selectAll(mealIndex, alternatives.length)}
                    >
                      Selecionar todas
                    </Button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {alternatives.map((alt, altIndex) => {
                      const checked = selected.includes(altIndex);
                      return (
                        <label
                          key={`${mealIndex}-${altIndex}`}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-xl border p-2.5 transition-colors",
                            checked ? "border-primary bg-primary/5" : "border-border/70 bg-muted/10 hover:bg-muted/20",
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleAlternative(mealIndex, altIndex)}
                            className="mt-0.5 size-4"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                                Substituição {altIndex + 1}
                              </span>
                              {alt.time_suggestion && (
                                <span className="text-[11px] text-muted-foreground">{alt.time_suggestion}</span>
                              )}
                            </div>
                            <p className="mt-1 text-sm font-medium leading-snug text-foreground">
                              {alt.meal_name || `Opção ${altIndex + 1}`}
                            </p>
                            {alt.notes?.trim() && <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{alt.notes}</p>}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="gap-2 pt-1 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} className="gap-2">
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
