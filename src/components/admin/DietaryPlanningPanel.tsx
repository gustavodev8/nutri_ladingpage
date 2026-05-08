import { useState, useEffect } from "react";
import { Target, ChevronDown, ChevronUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_MACRO_TARGET,
  calcMacroGoals,
  auditMacro,
  statusColor,
  type MacroTarget,
  type MacroGoals,
  type MacroMode,
} from "@/lib/planningUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DietaryActual {
  cal:   number;
  prot:  number;
  carbs: number;
  fat:   number;
}

interface Props {
  weightKg?:     number;   // da última avaliação
  totalKcal?:    number;   // plan.daily_calories
  actual:        DietaryActual;
  onGoalsChange: (goals: MacroGoals | null) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const n1 = (v: number) => v.toFixed(1);
const n0 = (v: number) => Math.round(v).toString();

function NumInput({
  value,
  onChange,
  step = 0.1,
  min = 0,
  max,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
        className="h-8 w-20 rounded-md border border-border bg-background px-2 text-sm text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary"
      />
      {suffix && <span className="text-xs text-muted-foreground shrink-0">{suffix}</span>}
    </div>
  );
}

// ─── MacroBar ─────────────────────────────────────────────────────────────────

function MacroBar({
  label,
  actual,
  goal,
}: {
  label: string;
  actual: number;
  goal: number;
}) {
  const progress = auditMacro(actual, goal);
  const colors   = statusColor(progress.status);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
        <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", colors.bar)}
            style={{ width: `${progress.capped}%` }}
          />
        </div>
        <span className={cn("text-xs font-semibold tabular-nums w-28 text-right shrink-0", colors.text)}>
          {n1(actual)} / {n1(goal)} g
        </span>
        <span className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 w-14 text-center",
          colors.badge
        )}>
          {n0(progress.pct)}%
        </span>
      </div>
    </div>
  );
}

// ─── MacroInputCard ───────────────────────────────────────────────────────────

function MacroInputCard({
  label,
  color,
  children,
  computed,
  computedLabel,
}: {
  label:         string;
  color:         string;
  children:      React.ReactNode;
  computed?:     string;
  computedLabel?: string;
}) {
  return (
    <div className={cn("rounded-lg border px-4 py-3 space-y-2", color)}>
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
        {label}
      </p>
      {children}
      {computed && (
        <p className="text-xs text-muted-foreground">
          = <span className="font-bold text-foreground tabular-nums">{computed}</span>
          {computedLabel && <span className="ml-1 text-muted-foreground/60">{computedLabel}</span>}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DietaryPlanningPanel({
  weightKg,
  totalKcal,
  actual,
  onGoalsChange,
}: Props) {
  const [open, setOpen] = useState(true);
  const [target, setTarget] = useState<MacroTarget>(DEFAULT_MACRO_TARGET);

  const set = <K extends keyof MacroTarget>(key: K, value: MacroTarget[K]) =>
    setTarget((prev) => ({ ...prev, [key]: value }));

  const setMode = (mode: MacroMode) => setTarget((prev) => ({ ...prev, mode }));

  // ── Recompute whenever inputs change ────────────────────────────────────────
  useEffect(() => {
    if (!weightKg || !totalKcal) {
      onGoalsChange(null);
      return;
    }
    const goals = calcMacroGoals(target, totalKcal, weightKg);
    onGoalsChange(goals);
  }, [target, weightKg, totalKcal]); // eslint-disable-line react-hooks/exhaustive-deps

  const goals = weightKg && totalKcal
    ? calcMacroGoals(target, totalKcal, weightKg)
    : null;

  const missingWeight = !weightKg;
  const missingKcal   = !totalKcal;

  return (
    <section className="rounded-lg border border-border/60 overflow-hidden bg-card">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-muted/30 border-b border-border/60 hover:brightness-95 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Target size={14} className="text-primary shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground/80">
            Planejamento Dietético — Travamento de Macros
          </span>
          {goals && (
            <span className="hidden sm:flex items-center gap-2 ml-2">
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200">
                PTN {n0(goals.protein_g)}g
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold border border-amber-200">
                CHO {n0(goals.carbs_g)}g
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200">
                LIP {n0(goals.fat_g)}g
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-xs hidden sm:inline">{open ? "Minimizar" : "Expandir"}</span>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      {open && (
        <div className="p-5 space-y-5">

          {/* Avisos de dados faltando */}
          {(missingWeight || missingKcal) && (
            <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-amber-800">
              <Info size={14} className="shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">
                {missingWeight && missingKcal
                  ? "Registre uma avaliação antropométrica com peso e defina uma meta calórica no plano para ativar o travamento de macros."
                  : missingWeight
                  ? "Registre uma avaliação antropométrica com peso do paciente para calcular as metas em g/kg."
                  : "Defina a meta calórica diária do plano (campo acima) para calcular as metas de macronutrientes."}
              </p>
            </div>
          )}

          {/* ── Linha 1: Modo ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground">Modo:</span>
            <div className="flex items-center bg-muted rounded-md p-0.5">
              {([ ["g_per_kg", "g / kg de peso"], ["percent", "% do VET"] ] as [MacroMode, string][]).map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMode(val)}
                  className={cn(
                    "px-3 h-7 rounded text-xs font-semibold transition-all",
                    target.mode === val
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {lbl}
                </button>
              ))}
            </div>
            {weightKg && (
              <span className="text-xs text-muted-foreground">
                Peso: <strong className="text-foreground">{weightKg} kg</strong>
              </span>
            )}
          </div>

          {/* ── Linha 2: Inputs dos macros ────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

            {/* Proteína */}
            <MacroInputCard
              label="Proteína"
              color="border-blue-100 bg-blue-50/50"
              computed={goals ? `${n1(goals.protein_g)} g` : undefined}
              computedLabel={goals ? `(${n1(goals.protein_pct)}% VET · ${n1(goals.protein_g_per_kg)} g/kg)` : undefined}
            >
              {target.mode === "g_per_kg" ? (
                <NumInput
                  value={target.protein_g_per_kg}
                  onChange={(v) => set("protein_g_per_kg", v)}
                  step={0.1}
                  min={0.5}
                  max={4.0}
                  suffix="g/kg"
                />
              ) : (
                <NumInput
                  value={target.protein_pct}
                  onChange={(v) => set("protein_pct", Math.min(v, 100 - target.fat_pct - 5))}
                  step={1}
                  min={10}
                  max={70}
                  suffix="%"
                />
              )}
            </MacroInputCard>

            {/* Gordura */}
            <MacroInputCard
              label="Gordura"
              color="border-rose-100 bg-rose-50/50"
              computed={goals ? `${n1(goals.fat_g)} g` : undefined}
              computedLabel={goals ? `(${n1(goals.fat_pct)}% VET · ${n1(goals.fat_g_per_kg)} g/kg)` : undefined}
            >
              {target.mode === "g_per_kg" ? (
                <NumInput
                  value={target.fat_g_per_kg}
                  onChange={(v) => set("fat_g_per_kg", v)}
                  step={0.1}
                  min={0.3}
                  max={3.0}
                  suffix="g/kg"
                />
              ) : (
                <NumInput
                  value={target.fat_pct}
                  onChange={(v) => set("fat_pct", Math.min(v, 100 - target.protein_pct - 5))}
                  step={1}
                  min={10}
                  max={60}
                  suffix="%"
                />
              )}
            </MacroInputCard>

            {/* Carboidrato */}
            <MacroInputCard
              label="Carboidrato"
              color="border-amber-100 bg-amber-50/50"
              computed={goals ? `${n1(goals.carbs_g)} g` : undefined}
              computedLabel={
                goals
                  ? target.carbs_residual
                    ? `(${n1(goals.carbs_pct)}% VET — residual)`
                    : `(${n1(goals.carbs_pct)}% VET · ${n1(goals.carbs_g_per_kg)} g/kg)`
                  : undefined
              }
            >
              <div className="space-y-2">
                {/* Toggle residual */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={target.carbs_residual}
                    onChange={(e) => set("carbs_residual", e.target.checked)}
                    className="rounded border-border accent-primary"
                  />
                  <span className="text-xs text-muted-foreground">Preencher residual</span>
                </label>

                {!target.carbs_residual && (
                  target.mode === "g_per_kg" ? (
                    <NumInput
                      value={target.carbs_g_per_kg}
                      onChange={(v) => set("carbs_g_per_kg", v)}
                      step={0.5}
                      min={0}
                      max={10}
                      suffix="g/kg"
                    />
                  ) : (
                    <NumInput
                      value={target.carbs_pct}
                      onChange={(v) => set("carbs_pct", Math.min(v, 100 - target.protein_pct - target.fat_pct))}
                      step={1}
                      min={0}
                      max={70}
                      suffix="%"
                    />
                  )
                )}
              </div>
            </MacroInputCard>
          </div>

          {/* ── Linha 3: Total VET calculado ──────────────────────────────── */}
          {goals && (
            <div className="flex items-center gap-4 px-4 py-3 rounded-lg bg-muted/40 border border-border/60 text-sm">
              <span className="text-xs text-muted-foreground">VET calculado pelos macros:</span>
              <span className="font-bold tabular-nums text-foreground">
                {n0(goals.protein_kcal + goals.fat_kcal + goals.carbs_kcal)} kcal
              </span>
              <span className="text-xs text-muted-foreground">
                (PTN {n0(goals.protein_kcal)} + CHO {n0(goals.carbs_kcal)} + LIP {n0(goals.fat_kcal)})
              </span>
              {totalKcal && Math.abs((goals.protein_kcal + goals.fat_kcal + goals.carbs_kcal) - totalKcal) > 50 && (
                <span className="ml-auto text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  Diverge da meta: {n0(totalKcal)} kcal
                </span>
              )}
            </div>
          )}

          {/* ── Linha 4: Progresso atual vs. metas ───────────────────────── */}
          {goals && actual.cal > 0 && (
            <div className="space-y-2.5 pt-1 border-t border-border/50">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-3">
                Progresso atual vs. metas travadas
              </p>
              <MacroBar label="Proteína"    actual={actual.prot}  goal={goals.protein_g} />
              <MacroBar label="Carboidrato" actual={actual.carbs} goal={goals.carbs_g}   />
              <MacroBar label="Gordura"     actual={actual.fat}   goal={goals.fat_g}     />

              {/* Calorias totais */}
              <div className="space-y-1 pt-1 border-t border-border/30">
                {(() => {
                  const p = auditMacro(actual.cal, goals.calories);
                  const c = statusColor(p.status);
                  return (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-24 shrink-0">Energia total</span>
                      <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all duration-500", c.bar)}
                          style={{ width: `${p.capped}%` }} />
                      </div>
                      <span className={cn("text-xs font-semibold tabular-nums w-28 text-right shrink-0", c.text)}>
                        {n0(actual.cal)} / {n0(goals.calories)} kcal
                      </span>
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border w-14 text-center", c.badge)}>
                        {n0(p.pct)}%
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Sem dados ainda */}
          {goals && actual.cal === 0 && (
            <p className="text-xs text-muted-foreground/60 pt-1 border-t border-border/50">
              Adicione alimentos às refeições para acompanhar o progresso em relação às metas.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
