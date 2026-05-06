import { useState, useEffect } from "react";
import { X, Zap, TrendingDown, Minus, TrendingUp, ChevronDown } from "lucide-react";
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface StrategyModalProps {
  energyInput?: EnergyInput;   // peso/altura/idade/gênero do paciente
  onConfirm: (
    title: string,
    strategy: StrategyType | null,
    macros: MacroResult | null
  ) => void;
  onClose: () => void;
}

// ─── Icons per strategy ───────────────────────────────────────────────────────

const STRATEGY_ICONS: Record<StrategyType, React.ReactNode> = {
  deficit:     <TrendingDown size={20} />,
  maintenance: <Minus size={20} />,
  surplus:     <TrendingUp size={20} />,
};

// ─── Macro bar ────────────────────────────────────────────────────────────────

function MacroBar({
  label,
  grams,
  pct,
  color,
  kcal,
}: {
  label: string;
  grams: number;
  pct: number;
  color: string;
  kcal: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {grams}g · {kcal} kcal · {pct}%
        </span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-300", color)}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StrategyModal({ energyInput, onConfirm, onClose }: StrategyModalProps) {
  const [title, setTitle]       = useState("Plano Alimentar");
  const [strategy, setStrategy] = useState<StrategyType>("maintenance");
  const [activity, setActivity] = useState<ActivityLevel>("moderate");
  const [skipMacros, setSkipMacros] = useState(false);

  const hasEnergyData = !!(energyInput?.weight && energyInput?.height && energyInput?.age);

  const energyResult = hasEnergyData
    ? calcEnergy(energyInput!, "mifflin", activity)
    : null;

  const macros = energyResult && energyInput?.weight
    ? calcMacros(energyResult.get, energyInput.weight, strategy)
    : null;

  const handleConfirm = () => {
    onConfirm(
      title.trim() || "Plano Alimentar",
      skipMacros ? null : strategy,
      skipMacros ? null : macros
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="font-black text-lg text-foreground">Novo Plano Alimentar</h2>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Defina o objetivo e o sistema calculará os macros automaticamente.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-muted hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[80vh] overflow-y-auto">

          {/* Plan title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
              Título do Plano
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Plano Emagrecimento — Fase 1"
              className="h-10 rounded-xl"
            />
          </div>

          {/* GET display */}
          {hasEnergyData ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                  Nível de Atividade
                </Label>
              </div>
              <div className="relative">
                <select
                  value={activity}
                  onChange={(e) => setActivity(e.target.value as ActivityLevel)}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {ACTIVITY_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label} — {opt.description}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3 text-muted-foreground pointer-events-none" />
              </div>

              {energyResult && (
                <div className="flex gap-3">
                  <div className="flex-1 bg-muted/50 rounded-2xl p-3 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">TMB</p>
                    <p className="text-xl font-black tabular-nums text-foreground">{energyResult.tmb}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold">kcal/dia</p>
                  </div>
                  <div className="flex-1 bg-primary/10 border border-primary/20 rounded-2xl p-3 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/70">GET</p>
                    <p className="text-xl font-black tabular-nums text-primary">{energyResult.get}</p>
                    <p className="text-[10px] text-primary/70 font-semibold">kcal/dia</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-3">
              <Zap size={16} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 font-medium leading-relaxed">
                Sem avaliação antropométrica recente. O GET não pode ser calculado.
                O plano será criado sem metas de macronutrientes.
              </p>
            </div>
          )}

          {/* Strategy selection */}
          {hasEnergyData && !skipMacros && (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                Objetivo / Estratégia
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(["deficit", "maintenance", "surplus"] as StrategyType[]).map((s) => {
                  const cfg = STRATEGY_CONFIG[s];
                  const isSelected = strategy === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setStrategy(s)}
                      className={cn(
                        "rounded-2xl border-2 p-3 text-center transition-all duration-200 space-y-1",
                        isSelected
                          ? `${cfg.badgeBg} border-current`
                          : "bg-muted/30 border-border hover:border-muted-foreground/30"
                      )}
                    >
                      <div className={cn("flex justify-center", isSelected ? cfg.colorClass : "text-muted-foreground")}>
                        {STRATEGY_ICONS[s]}
                      </div>
                      <p className={cn("text-xs font-black", isSelected ? cfg.colorClass : "text-foreground")}>
                        {cfg.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium">{cfg.subtitle}</p>
                      {energyResult && (
                        <p className={cn("text-[11px] font-black tabular-nums mt-1", isSelected ? cfg.colorClass : "text-muted-foreground")}>
                          {Math.max(1200, energyResult.get + cfg.kcalDelta)} kcal
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Macro breakdown */}
          {macros && !skipMacros && (
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">
                  Distribuição de Macros
                </p>
                <p className="text-sm font-black text-foreground tabular-nums">
                  {macros.calories} kcal/dia
                </p>
              </div>
              <MacroBar
                label="Proteína"
                grams={macros.protein_g}
                kcal={macros.proteinKcal}
                pct={macros.proteinPct}
                color="bg-blue-500"
              />
              <MacroBar
                label="Carboidrato"
                grams={macros.carbs_g}
                kcal={macros.carbsKcal}
                pct={macros.carbsPct}
                color="bg-amber-400"
              />
              <MacroBar
                label="Gordura"
                grams={macros.fat_g}
                kcal={macros.fatKcal}
                pct={macros.fatPct}
                color="bg-rose-400"
              />
              <p className="text-[10px] text-muted-foreground/60 pt-1">
                Proteína {STRATEGY_CONFIG[strategy].proteinPerKg}g/kg · Gordura {STRATEGY_CONFIG[strategy].fatPerKg}g/kg · Carboidrato = restante
              </p>
            </div>
          )}

          {/* Skip macros toggle */}
          {hasEnergyData && (
            <button
              onClick={() => setSkipMacros((v) => !v)}
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground underline underline-offset-2 transition-colors"
            >
              {skipMacros ? "Usar cálculo automático de macros" : "Criar sem metas de macros"}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} className="flex-1 rounded-xl font-bold shadow-lg shadow-primary/20">
            Criar Plano
          </Button>
        </div>
      </div>
    </div>
  );
}
