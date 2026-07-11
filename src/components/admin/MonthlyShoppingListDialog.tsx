import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatShoppingQuantity, type MissingShoppingListItem, type MonthlyShoppingListGroup } from "@/lib/monthlyShoppingList";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planTitle: string;
  patientName?: string;
  days: number;
  groups: MonthlyShoppingListGroup[];
  missingItems: MissingShoppingListItem[];
  totalItems: number;
  totalGroups: number;
  totalMissingOccurrences: number;
}

export function MonthlyShoppingListDialog({
  open,
  onOpenChange,
  planTitle,
  patientName,
  days,
  groups,
  missingItems,
  totalItems,
  totalGroups,
  totalMissingOccurrences,
}: Props) {
  const handlePrint = () => window.print();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[min(95vw,78rem)] flex-col overflow-hidden rounded-3xl border-border/60 p-0">
        <div className="border-b border-border/60 bg-gradient-to-br from-primary/10 via-card to-emerald-500/10 px-5 py-4 sm:px-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-semibold sm:text-2xl">Lista de compras do mês</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              Consolidação automática da dieta atual para {days} dias
              {planTitle ? ` · ${planTitle}` : ""}
              {patientName ? `, para ${patientName}` : ""}.
              A lista soma os alimentos das refeições principais e destaca quando algum item está sem quantidade.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Itens consolidados</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{totalItems}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Grupos</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{totalGroups}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Sem quantidade</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{totalMissingOccurrences}</p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {missingItems.length > 0 && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-amber-950 shadow-sm">
              <p className="text-sm font-semibold">Alguns alimentos ficaram fora do total mensal porque não têm quantidade definida.</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
                Esses itens precisam de ajuste no plano para que o cálculo de compra fique exato.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {missingItems.map((item) => (
                  <span key={item.foodName} className="rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-xs font-medium text-amber-950">
                    {item.foodName} · {item.occurrences} ocorrência{item.occurrences === 1 ? "" : "s"}
                  </span>
                ))}
              </div>
            </div>
          )}

          {groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhum alimento com quantidade foi encontrado no plano atual.
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {groups.map((group) => (
                <section key={group.foodGroup} className="overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-border/50 bg-muted/20 px-4 py-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Grupo alimentar</p>
                      <h3 className="text-base font-semibold text-foreground">{group.foodGroup}</h3>
                    </div>
                    <span className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                      {group.items.length} item{group.items.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="divide-y divide-border/40">
                    {group.items.map((item) => (
                      <div key={`${group.foodGroup}-${item.foodName}`} className="px-4 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{item.foodName}</p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              Base diário: {formatShoppingQuantity(item.dailyQuantity, item.unit)} · Mês: {days} dias
                            </p>
                          </div>
                          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2 text-right">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Total mês</p>
                            <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                              {formatShoppingQuantity(item.displayQuantity, item.displayUnit)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={cn(
                            "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]",
                            item.quantifiedOccurrences > 0
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-muted text-muted-foreground",
                          )}>
                            {item.quantifiedOccurrences} ocorrência{item.quantifiedOccurrences === 1 ? "" : "s"} com quantidade
                          </span>
                          {item.missingOccurrences > 0 && (
                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
                              {item.missingOccurrences} sem quantidade
                            </span>
                          )}
                          {item.sourceMeals.length > 0 && (
                            <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                              {item.sourceMeals.join(" · ")}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border/60 bg-background/90 px-5 py-4 sm:px-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button type="button" onClick={handlePrint}>
            Imprimir lista
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
