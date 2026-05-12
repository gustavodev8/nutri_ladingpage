import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Plus, Save, Loader2, LayoutList,
  AlertTriangle, TrendingDown, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  MealSection,
  sumFoods,
  emptyFood,
  n0, n1,
  type EditorMeal,
} from "@/components/admin/MealTableEditor";
import {
  fetchDietTemplates,
  upsertDietTemplate,
  saveDietTemplateMeals,
  type MealFood,
} from "@/lib/supabase";

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_MEALS: Omit<EditorMeal, "_dbId">[] = [
  { meal_name: "Café da manhã",   time_suggestion: "07:00 – 08:00", foods: [] },
  { meal_name: "Lanche da manhã", time_suggestion: "10:00 – 10:30", foods: [] },
  { meal_name: "Almoço",          time_suggestion: "12:00 – 13:00", foods: [] },
  { meal_name: "Lanche da tarde", time_suggestion: "15:30 – 16:00", foods: [] },
  { meal_name: "Jantar",          time_suggestion: "19:00 – 20:00", foods: [] },
];

const STRATEGIES = [
  { value: "",             label: "— sem estratégia —" },
  { value: "low_carb",     label: "Low Carb"           },
  { value: "mediterranea", label: "Mediterrânea"       },
  { value: "hipertrofia",  label: "Hipertrofia"        },
  { value: "emagrecimento",label: "Emagrecimento"      },
  { value: "manutencao",   label: "Manutenção"         },
  { value: "vegetariano",  label: "Vegetariano"        },
  { value: "vegano",       label: "Vegano"             },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeTotals(meals: EditorMeal[]) {
  return meals.reduce(
    (acc, m) => {
      const t = sumFoods(m.foods);
      return { cal: acc.cal + t.cal, prot: acc.prot + t.prot, carbs: acc.carbs + t.carbs, fat: acc.fat + t.fat };
    },
    { cal: 0, prot: 0, carbs: 0, fat: 0 }
  );
}

/** Converte DietTemplateMeal+DietTemplateFood → EditorMeal */
function templateMealToEditor(tm: import("@/lib/supabase").DietTemplateMeal): EditorMeal {
  return {
    _dbId:           tm.id,
    meal_name:       tm.meal_name,
    time_suggestion: tm.time_suggestion,
    foods: (tm.foods ?? []).map((tf): MealFood => {
      const qty   = tf.quantity ?? undefined;
      const calc  = (per100?: number) =>
        per100 && qty ? parseFloat(((per100 * qty) / 100).toFixed(1)) : undefined;
      return {
        meal_id:          0,
        food_name:        tf.food_name,
        quantity:         qty,
        unit:             tf.unit ?? "g",
        kcal_per_100g:    tf.kcal_per_100g    ?? undefined,
        protein_per_100g: tf.protein_per_100g ?? undefined,
        carbs_per_100g:   tf.carbs_per_100g   ?? undefined,
        fat_per_100g:     tf.fat_per_100g     ?? undefined,
        calories:         calc(tf.kcal_per_100g),
        protein:          calc(tf.protein_per_100g),
        carbs:            calc(tf.carbs_per_100g),
        fat:              calc(tf.fat_per_100g),
        household_measure: tf.household_measure ?? undefined,
        measure_amount:    tf.measure_amount    ?? undefined,
        food_group:        tf.food_group        ?? undefined,
      };
    }),
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminTemplateEditor() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate       = useNavigate();
  const isNew          = templateId === "novo";
  const numId          = isNew ? null : Number(templateId);

  // ── Metadata state ─────────────────────────────────────────────────────────
  const [name,        setName]        = useState("Novo Modelo");
  const [description, setDescription] = useState("");
  const [strategy,    setStrategy]    = useState("");

  // ── Meals state ────────────────────────────────────────────────────────────
  const [meals,   setMeals]   = useState<EditorMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  // ── Load ───────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    if (isNew) {
      setMeals(DEFAULT_MEALS.map((m) => ({ ...m })));
    } else {
      const all = await fetchDietTemplates();
      const found = all.find((t) => t.id === numId);
      if (found) {
        setName(found.name);
        setDescription(found.description ?? "");
        setStrategy(found.strategy ?? "");
        setMeals((found.meals ?? []).map(templateMealToEditor));
      } else {
        toast.error("Modelo não encontrado.");
        navigate("/admin/modelos");
      }
    }
    setLoading(false);
  }, [isNew, numId, navigate]);

  useEffect(() => { load(); }, [load]);

  // ── Totals (reactive) ──────────────────────────────────────────────────────
  const grand = computeTotals(meals);

  const goalPct = grand.cal > 0
    ? Math.min(100, Math.round((grand.cal / (grand.cal || 1)) * 100))
    : 0;
  void goalPct; // computed but used for display only

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) { toast.error("Informe um nome para o modelo."); return; }
    setSaving(true);
    try {
      const saved = await upsertDietTemplate({
        id:          numId ?? undefined,
        name:        name.trim(),
        description: description.trim() || undefined,
        strategy:    strategy || undefined,
        total_kcal:  grand.cal   > 0 ? parseFloat(grand.cal.toFixed(1))   : undefined,
        protein_g:   grand.prot  > 0 ? parseFloat(grand.prot.toFixed(1))  : undefined,
        carbs_g:     grand.carbs > 0 ? parseFloat(grand.carbs.toFixed(1)) : undefined,
        fat_g:       grand.fat   > 0 ? parseFloat(grand.fat.toFixed(1))   : undefined,
        is_active:   true,
      } as any);

      if (!saved?.id) { toast.error("Erro ao salvar o modelo."); return; }

      const ok = await saveDietTemplateMeals(
        saved.id,
        meals.map((m, idx) => ({
          meal_name:       m.meal_name,
          time_suggestion: m.time_suggestion,
          order_index:     idx,
          foods:           m.foods.map((f, fi) => ({
            food_name:         f.food_name,
            quantity:          f.quantity,
            unit:              f.unit,
            kcal_per_100g:     f.kcal_per_100g,
            protein_per_100g:  f.protein_per_100g,
            carbs_per_100g:    f.carbs_per_100g,
            fat_per_100g:      f.fat_per_100g,
            household_measure: f.household_measure,
            measure_amount:    f.measure_amount,
            food_group:        f.food_group,
            order_index:       fi,
          })),
        }))
      );

      if (!ok) { toast.error("Erro ao salvar as refeições do modelo."); return; }
      toast.success("Modelo salvo com sucesso.");
      if (isNew) navigate(`/admin/modelos/${saved.id}`, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[AdminTemplateEditor] handleSave:", err);
      toast.error(`Erro inesperado: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Meal helpers ───────────────────────────────────────────────────────────
  const updateMeal = (i: number, m: EditorMeal) =>
    setMeals((prev) => { const n = [...prev]; n[i] = m; return n; });
  const removeMeal = (i: number) =>
    setMeals((prev) => prev.filter((_, fi) => fi !== i));
  const addMeal = () =>
    setMeals((prev) => [...prev, { meal_name: "Nova refeição", time_suggestion: "", foods: [] }]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 size={24} className="animate-spin text-primary" />
          <p className="text-sm">Carregando modelo…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 flex items-center gap-2 sm:gap-3 py-3">
          <Link to="/admin/modelos"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 p-1">
            <ArrowLeft size={16} />
          </Link>

          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <LayoutList size={14} className="text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-sm font-semibold bg-transparent border-0 border-b border-transparent hover:border-border focus:border-primary focus:outline-none flex-1 min-w-0 py-0.5 text-foreground"
              placeholder="Nome do modelo"
            />
            {isNew && <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70 flex-shrink-0">Novo</span>}
          </div>

          <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5 px-3 shrink-0">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            <span className="hidden xs:inline">{saving ? "Salvando…" : "Salvar"}</span>
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Metadados ───────────────────────────────────────────────────── */}
        <section className="bg-card border border-border/60 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Dados do Modelo</p>
            <span className="text-[10px] text-muted-foreground bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded font-semibold">
              Desconectado de paciente
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nome do Modelo</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Low Carb 1600 kcal, Hipertrofia Vegana…"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Estratégia</Label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
              >
                {STRATEGIES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Descrição / Indicação clínica</Label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Indicado para… Restrições… Objetivo principal…"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
          </div>
        </section>

        {/* ── Resumo nutricional ──────────────────────────────────────────── */}
        <section className="bg-card border border-border/60 rounded-lg p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-4">
            Totais Calculados (soma automática das refeições)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-0 sm:divide-x sm:divide-border/60">
            {[
              { label: "Energia total",  value: grand.cal   > 0 ? `${n0(grand.cal)} kcal`  : "— kcal" },
              { label: "Proteínas",      value: grand.prot  > 0 ? `${n1(grand.prot)} g`    : "— g"    },
              { label: "Carboidratos",   value: grand.carbs > 0 ? `${n1(grand.carbs)} g`   : "— g"    },
              { label: "Gorduras",       value: grand.fat   > 0 ? `${n1(grand.fat)} g`     : "— g"    },
            ].map(({ label, value }) => (
              <div key={label} className="sm:px-4 sm:first:pl-0 sm:last:pr-0 bg-muted/20 sm:bg-transparent rounded-lg sm:rounded-none p-3 sm:p-0">
                <p className="text-[10px] text-primary uppercase tracking-wider mb-1.5">{label}</p>
                <p className="text-xl font-bold tabular-nums text-foreground leading-none">{value}</p>
              </div>
            ))}
          </div>

          {/* Distribuição % VET */}
          {grand.cal > 0 && (
            <div className="space-y-1.5 mt-4 pt-4 border-t border-border/40">
              {[
                { label: "Proteínas",    kcal: grand.prot  * 4, color: "bg-blue-500"  },
                { label: "Carboidratos", kcal: grand.carbs * 4, color: "bg-amber-400" },
                { label: "Gorduras",     kcal: grand.fat   * 9, color: "bg-rose-400"  },
              ].map(({ label, kcal, color }) => {
                const pct = grand.cal > 0 ? Math.round((kcal / grand.cal) * 100) : 0;
                return (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-500", color)}
                        style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Refeições ───────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Refeições — {meals.length} cadastradas
            </p>
            <button type="button" onClick={addMeal}
              className="flex items-center gap-1.5 text-xs font-medium border border-border rounded-lg px-3 py-1.5 text-foreground hover:bg-muted/60 transition-colors">
              <Plus size={13} />
              Nova refeição
            </button>
          </div>

          <div className="space-y-2">
            {meals.map((meal, i) => (
              <MealSection
                key={i}
                meal={meal}
                idx={i}
                onUpdate={(m) => updateMeal(i, m)}
                onRemove={() => removeMeal(i)}
              />
            ))}

            {meals.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground border border-dashed border-border/60 rounded-lg">
                <p className="text-sm">Nenhuma refeição adicionada</p>
                <button type="button" onClick={addMeal}
                  className="text-xs text-primary hover:text-primary/80 font-medium">
                  + Adicionar refeição
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Botão Salvar ────────────────────────────────────────────────── */}
        <div className="flex justify-end pb-8">
          <Button onClick={handleSave} disabled={saving} className="gap-2 px-6">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Salvando…" : "Salvar modelo"}
          </Button>
        </div>
      </main>
    </div>
  );
}
