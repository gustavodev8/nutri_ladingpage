import { X, Zap, TrendingDown, Minus, TrendingUp, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  calcMacros,
  STRATEGY_CONFIG,
  type StrategyType,
  type MacroResult,
} from "@/lib/strategyUtils";
import {
  calcEnergy,
  ACTIVITY_OPTIONS,
  type ActivityLevel,
  type EnergyInput,
} from "@/lib/energyUtils";

interface StrategyModalProps {
  energyInput?: EnergyInput;
  onConfirm: (title: string, strategy: StrategyType | null, macros: MacroResult | null) => void;
  onClose: () => void;
}

const STRATEGY_ICONS: Record<StrategyType, React.ReactNode> = {
  deficit:     <TrendingDown size={16} />,
  maintenance: <Minus size={16} />,
  surplus:     <TrendingUp size={16} />,
};

// ─── Macro row in summary table ───────────────────────────────────────────────

function MacroRow({
  label,
  grams,
  kcal,
  pct,
  accent,
}: {
  label: string;
  grams: number;
  kcal: number;
  pct: number;
  accent: string;
}) {
  return (
    <tr className="border-b border-border/50 last:border-0">
      <td className="py-2 pr-4">
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-sm shrink-0", accent)} />
          <span className="text-sm font-semibold text-foreground">{label}</span>
        </div>
      </td>
      <td className="py-2 text-right tabular-nums text-sm text-foreground font-bold">{grams} g</td>
      <td className="py-2 text-right tabular-nums text-sm text-muted-foreground">{kcal} kcal</td>
      <td className="py-2 pl-4 text-right tabular-nums text-sm text-muted-foreground">{pct}%</td>
    </tr>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function StrategyModal({ energyInput, onConfirm, onClose }: StrategyModalProps) {
  const [title, setTitle]           = useState("Plano Alimentar");
  const [strategy, setStrategy]     = useState<StrategyType>("maintenance");
  const [activity, setActivity]     = useState<ActivityLevel>("moderate");
  const [skipMacros, setSkipMacros] = useState(false);

  const hasData = !!(energyInput?.weight && energyInput?.height && energyInput?.age);

  const energyResult = hasData ? calcEnergy(energyInput!, "mifflin", activity) : null;

  const macros =
    energyResult && energyInput?.weight && !skipMacros
      ? calcMacros(energyResult.get, energyInput.weight, strategy)
      : null;

  const handleConfirm = () => {
    onConfirm(title.trim() || "Plano Alimentar", skipMacros ? null : strategy, macros);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      {/* Modal container — sharp, professional */}
      <div className="bg-background border border-border rounded-lg shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div>
            <h2 className="font-bold text-base text-foreground tracking-tight">
              Novo Plano Alimentar
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Selecione o objetivo e o sistema irá calcular os macronutrientes.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left column — inputs */}
          <div className="w-64 shrink-0 border-r border-border px-5 py-5 space-y-5 overflow-y-auto">

            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Título
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Fase 1 — Déficit"
                className="h-9 rounded text-sm"
              />
            </div>

            {/* Activity level */}
            {hasData && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Nível de Atividade
                </Label>
                <div className="relative">
                  <select
                    value={activity}
                    onChange={(e) => setActivity(e.target.value as ActivityLevel)}
                    className="w-full h-9 rounded border border-input bg-background px-2.5 pr-7 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {ACTIVITY_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-3 text-muted-foreground pointer-events-none" />
                </div>
                {energyResult && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {ACTIVITY_OPTIONS.find((o) => o.key === activity)?.description}
                  </p>
                )}
              </div>
            )}

            {/* Energy cards */}
            {energyResult && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Gasto Energético
                </Label>
                <div className="rounded border border-border divide-y divide-border">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-xs text-muted-foreground">TMB</span>
                    <span className="text-sm font-bold tabular-nums text-foreground">
                      {energyResult.tmb} <span className="text-xs font-normal text-muted-foreground">kcal</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 bg-primary/5">
                    <span className="text-xs font-semibold text-primary">GET</span>
                    <span className="text-sm font-bold tabular-nums text-primary">
                      {energyResult.get} <span className="text-xs font-normal">kcal</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {!hasData && (
              <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2.5 flex gap-2">
                <Zap size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  Sem avaliação antropométrica. O plano será criado sem metas de macros.
                </p>
              </div>
            )}

            {/* Skip toggle */}
            {hasData && (
              <button
                onClick={() => setSkipMacros((v) => !v)}
                className="text-xs text-muted-foreground/60 hover:text-muted-foreground underline underline-offset-2 transition-colors"
              >
                {skipMacros ? "Usar cálculo de macros" : "Criar sem metas de macros"}
              </button>
            )}
          </div>

          {/* Right column — strategy + macros */}
          <div className="flex-1 px-5 py-5 space-y-5 overflow-y-auto">

            {/* Strategy selector */}
            {hasData && !skipMacros && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Objetivo
                </Label>
                <div className="space-y-1.5">
                  {(["deficit", "maintenance", "surplus"] as StrategyType[]).map((s) => {
                    const cfg = STRATEGY_CONFIG[s];
                    const isSelected = strategy === s;
                    const targetKcal = energyResult
                      ? Math.max(1200, energyResult.get + cfg.kcalDelta)
                      : null;

                    return (
                      <button
                        key={s}
                        onClick={() => setStrategy(s)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded border text-left transition-all duration-150",
                          isSelected
                            ? `${cfg.badgeBg} border-current`
                            : "border-border bg-background hover:bg-muted/40"
                        )}
                      >
                        <span className={cn(isSelected ? cfg.colorClass : "text-muted-foreground")}>
                          {STRATEGY_ICONS[s]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className={cn("text-sm font-bold", isSelected ? cfg.colorClass : "text-foreground")}>
                            {cfg.label}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">{cfg.subtitle}</span>
                        </div>
                        {targetKcal && (
                          <span className={cn("text-sm font-bold tabular-nums shrink-0", isSelected ? cfg.colorClass : "text-muted-foreground")}>
                            {targetKcal} kcal
                          </span>
                        )}
                        {isSelected && (
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.colorClass.replace("text-", "bg-"))} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Macro breakdown table */}
            {macros && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Distribuição de Macronutrientes
                  </Label>
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    {macros.calories} kcal/dia
                  </span>
                </div>

                <div className="rounded border border-border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border">
                        <th className="py-1.5 px-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Macro</th>
                        <th className="py-1.5 px-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Gramas</th>
                        <th className="py-1.5 px-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">kcal</th>
                        <th className="py-1.5 pl-3 pr-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50 bg-background">
                      <MacroRow label="Proteína"   grams={macros.protein_g} kcal={macros.proteinKcal} pct={macros.proteinPct} accent="bg-blue-500" />
                      <MacroRow label="Carboidrato" grams={macros.carbs_g}  kcal={macros.carbsKcal}   pct={macros.carbsPct}   accent="bg-amber-400" />
                      <MacroRow label="Gordura"    grams={macros.fat_g}    kcal={macros.fatKcal}     pct={macros.fatPct}     accent="bg-rose-400" />
                    </tbody>
                  </table>
                </div>

                {/* Stacked bar */}
                <div className="h-2 w-full rounded overflow-hidden flex">
                  <div className="bg-blue-500  transition-all duration-300" style={{ width: `${macros.proteinPct}%` }} />
                  <div className="bg-amber-400 transition-all duration-300" style={{ width: `${macros.carbsPct}%` }} />
                  <div className="bg-rose-400  transition-all duration-300" style={{ width: `${macros.fatPct}%` }} />
                </div>

                <p className="text-[10px] text-muted-foreground/60">
                  Proteína {STRATEGY_CONFIG[strategy].proteinPerKg} g/kg · Gordura {STRATEGY_CONFIG[strategy].fatPerKg} g/kg · Carboidrato = restante calórico
                </p>
              </div>
            )}

            {/* Empty state when skipping macros */}
            {skipMacros && (
              <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
                <p className="text-sm font-semibold text-muted-foreground">Sem metas de macros</p>
                <p className="text-xs text-muted-foreground/60">O plano será criado em branco e você poderá definir as metas manualmente.</p>
              </div>
            )}

            {!hasData && (
              <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
                <p className="text-sm font-semibold text-muted-foreground">Sem dados de avaliação</p>
                <p className="text-xs text-muted-foreground/60">Cadastre uma avaliação antropométrica para habilitar o cálculo automático.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-border bg-muted/20">
          <Button variant="outline" onClick={onClose} className="h-9 px-5 rounded text-sm">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} className="h-9 px-6 rounded text-sm font-semibold">
            Criar Plano
          </Button>
        </div>
      </div>
    </div>
  );
}
