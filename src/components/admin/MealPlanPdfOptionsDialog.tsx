import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Meal } from "@/lib/supabase";

type SelectedAlternatives = Record<number, number[]>;

interface Props {
  open: boolean;
  meals: Meal[];
  title: string;
  description: string;
  confirmLabel: string;
  emptyMessage: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selectedAlternatives: SelectedAlternatives) => void;
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

  useEffect(() => {
    if (open) {
      setSelection(buildInitialSelection(meals));
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

    onConfirm(normalizedSelection);
  };

  const mealsWithAlternatives = meals.filter((meal) => (meal.alternative_meals?.length ?? 0) > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-3xl border-border/60">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">{description}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {mealsWithAlternatives.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            meals.map((meal, mealIndex) => {
              const alternatives = meal.alternative_meals ?? [];
              if (alternatives.length === 0) return null;

              const selected = selection[mealIndex] ?? [];

              return (
                <div key={`${meal.meal_name}-${mealIndex}`} className="rounded-2xl border border-border/70 bg-background p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">
                        Refeição {mealIndex + 1}
                      </p>
                      <h3 className="mt-1 text-base font-semibold text-foreground">{meal.meal_name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {alternatives.length} opção{alternatives.length === 1 ? "" : "ões"} de substituição
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => selectAll(mealIndex, alternatives.length)}
                    >
                      Selecionar todas
                    </Button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {alternatives.map((alt, altIndex) => {
                      const checked = selected.includes(altIndex);
                      return (
                        <label
                          key={`${mealIndex}-${altIndex}`}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors",
                            checked ? "border-primary bg-primary/5" : "border-border/70 bg-muted/10 hover:bg-muted/20",
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleAlternative(mealIndex, altIndex)}
                            className="mt-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                                Substituição {altIndex + 1}
                              </span>
                              {alt.time_suggestion && (
                                <span className="text-xs text-muted-foreground">{alt.time_suggestion}</span>
                              )}
                            </div>
                            <p className="mt-1 font-medium text-foreground">{alt.meal_name || `Opção ${altIndex + 1}`}</p>
                            {alt.notes?.trim() && <p className="mt-1 text-sm text-muted-foreground">{alt.notes}</p>}
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

        <DialogFooter className="gap-2 sm:gap-2">
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
