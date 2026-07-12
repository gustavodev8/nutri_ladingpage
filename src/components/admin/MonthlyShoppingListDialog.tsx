import { toast } from "sonner";
import { AlertTriangle, Download, PackageCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatShoppingQuantity, type MissingShoppingListItem, type MonthlyShoppingListGroup } from "@/lib/monthlyShoppingList";
import { buildMonthlyShoppingListFileName, generateMonthlyShoppingListPdf } from "@/lib/generateMonthlyShoppingListPdf";

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
  const handleDownloadPdf = () => {
    try {
      const doc = generateMonthlyShoppingListPdf(
        { groups, missingItems, totalItems, totalGroups, totalMissingOccurrences },
        { planTitle, patientName, days },
      );
      doc.save(buildMonthlyShoppingListFileName(planTitle, patientName));
      toast.success("PDF da lista gerado com sucesso.");
    } catch (error) {
      console.error("[MonthlyShoppingListDialog] Erro ao gerar PDF:", error);
      toast.error("Não foi possível gerar o PDF da lista.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[min(94vw,64rem)] flex-col overflow-hidden rounded-2xl border-border/70 p-0">
        <div className="border-b border-border/60 bg-gradient-to-br from-background via-background to-emerald-50 px-5 py-4 sm:px-6">
          <DialogHeader className="space-y-1.5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
                <PackageCheck size={20} />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-xl font-semibold leading-tight text-foreground">Lista de compras do mês</DialogTitle>
                <DialogDescription className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  Quantidades estimadas para {days} dias
                  {planTitle ? ` · ${planTitle}` : ""}
                  {patientName ? ` · ${patientName}` : ""}. Use como guia de mercado e confira os itens sem quantidade antes de entregar ao paciente.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              ["Itens", totalItems],
              ["Grupos", totalGroups],
              ["Sem quantidade", totalMissingOccurrences],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border/60 bg-background/85 px-3 py-2.5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-xl border border-emerald-200/70 bg-emerald-50/70 px-3 py-2 text-xs leading-relaxed text-emerald-950">
            A coluna <strong>comprar no mês</strong> mostra a soma das porções diárias. A coluna <strong>onde aparece</strong> ajuda o paciente a entender por que aquele alimento entrou na lista.
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {missingItems.length > 0 && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Revise os alimentos sem quantidade</p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
                    Eles aparecem no plano, mas não entram no cálculo mensal enquanto a porção não for preenchida.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {missingItems.map((item) => (
                  <span key={item.foodName} className="rounded-full border border-amber-200 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-amber-950">
                    {item.foodName} · {item.occurrences}x
                  </span>
                ))}
              </div>
            </div>
          )}

          {groups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhum alimento com quantidade foi encontrado no plano atual.
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <section key={group.foodGroup} className="overflow-hidden rounded-xl border border-border/60 bg-background">
                  <div className="flex items-center justify-between gap-3 border-b border-border/50 bg-muted/20 px-4 py-2.5">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Grupo alimentar</p>
                      <h3 className="text-sm font-semibold text-foreground">{group.foodGroup}</h3>
                    </div>
                    <span className="rounded-full border border-border/60 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                      {group.items.length} item{group.items.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="hidden grid-cols-[minmax(0,1.15fr)_130px_minmax(0,1fr)] border-b border-border/50 bg-muted/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground md:grid">
                    <span>Alimento</span>
                    <span className="text-right">Comprar no mês</span>
                    <span className="pl-4">Onde aparece</span>
                  </div>

                  <div className="divide-y divide-border/40">
                    {group.items.map((item) => (
                      <div key={`${group.foodGroup}-${item.foodName}`} className="grid gap-2 px-4 py-3 md:grid-cols-[minmax(0,1.15fr)_130px_minmax(0,1fr)] md:items-center md:gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-snug text-foreground">{item.foodName}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Por dia: {formatShoppingQuantity(item.dailyQuantity, item.unit)}
                            {item.missingOccurrences > 0 ? ` · ${item.missingOccurrences} sem quantidade` : ""}
                          </p>
                        </div>

                        <div className="w-fit rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-left md:ml-auto md:text-right">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary md:hidden">Comprar no mês</p>
                          <p className="text-sm font-semibold tabular-nums text-foreground">
                            {formatShoppingQuantity(item.displayQuantity, item.displayUnit)}
                          </p>
                        </div>

                        <div className="min-w-0 md:pl-4">
                          <p className="truncate text-xs text-muted-foreground">{item.sourceMeals.join(" · ")}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                            {item.quantifiedOccurrences > 1 ? `Somado de ${item.quantifiedOccurrences} refeições` : "Aparece em 1 refeição"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border/60 bg-background px-5 py-4 sm:px-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button type="button" onClick={handleDownloadPdf} className="gap-2">
            <Download size={15} />
            Baixar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
