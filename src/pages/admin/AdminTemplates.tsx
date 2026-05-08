import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Loader2, LayoutList, ChevronRight, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  fetchDietTemplates,
  deleteDietTemplate,
  type DietTemplate,
} from "@/lib/supabase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STRATEGY_LABELS: Record<string, string> = {
  low_carb:      "Low Carb",
  mediterranea:  "Mediterrânea",
  hipertrofia:   "Hipertrofia",
  emagrecimento: "Emagrecimento",
  manutencao:    "Manutenção",
  vegetariano:   "Vegetariano",
  vegano:        "Vegano",
};

const STRATEGY_COLORS: Record<string, string> = {
  low_carb:      "bg-blue-100    text-blue-700    border-blue-200",
  mediterranea:  "bg-teal-100    text-teal-700    border-teal-200",
  hipertrofia:   "bg-emerald-100 text-emerald-700 border-emerald-200",
  emagrecimento: "bg-amber-100   text-amber-700   border-amber-200",
  manutencao:    "bg-slate-100   text-slate-600   border-slate-200",
  vegetariano:   "bg-lime-100    text-lime-700    border-lime-200",
  vegano:        "bg-green-100   text-green-700   border-green-200",
};

function StrategyBadge({ strategy }: { strategy?: string }) {
  if (!strategy) return null;
  const label  = STRATEGY_LABELS[strategy] ?? strategy;
  const colors = STRATEGY_COLORS[strategy] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={cn(
      "inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide shrink-0",
      colors
    )}>
      {label}
    </span>
  );
}

// ─── TemplateCard ─────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onDelete,
}: {
  template: DietTemplate;
  onDelete: (id: number) => void;
}) {
  const navigate   = useNavigate();
  const mealCount  = template.meals?.length ?? 0;
  const foodCount  = template.meals?.reduce((s, m) => s + (m.foods?.length ?? 0), 0) ?? 0;

  return (
    <div className="bg-card border border-border/60 rounded-lg p-4 hover:border-primary/30 hover:shadow-sm transition-all group">
      <div className="flex items-start gap-3">
        {/* Ícone */}
        <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
          <Utensils size={16} className="text-primary" />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <StrategyBadge strategy={template.strategy} />
            <span className="text-sm font-semibold text-foreground truncate">{template.name}</span>
          </div>

          {template.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{template.description}</p>
          )}

          {/* Totais */}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
            {template.total_kcal && (
              <span className="font-bold text-foreground tabular-nums">{template.total_kcal} kcal</span>
            )}
            {template.protein_g && <span>PTN {template.protein_g}g</span>}
            {template.carbs_g   && <span>CHO {template.carbs_g}g</span>}
            {template.fat_g     && <span>LIP {template.fat_g}g</span>}
            <span className="ml-auto">{mealCount} refeições · {foodCount} alimentos</span>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => navigate(`/admin/modelos/${template.id}`)}
            title="Editar modelo"
            className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(template.id)}
            title="Excluir modelo"
            className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 size={14} />
          </button>
          <ChevronRight size={14} className="text-muted-foreground/30 ml-1" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminTemplates() {
  const [templates, setTemplates] = useState<DietTemplate[]>([]);
  const [loading, setLoading]     = useState(true);

  const load = async () => {
    setLoading(true);
    setTemplates(await fetchDietTemplates());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    const t = templates.find((t) => t.id === id);
    if (!confirm(`Excluir o modelo "${t?.name}"? Esta ação não pode ser desfeita.`)) return;
    const ok = await deleteDietTemplate(id);
    if (ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Modelo excluído.");
    } else {
      toast.error("Erro ao excluir o modelo.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <LayoutList size={20} className="text-primary" />
            Modelos de Dieta
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Protocolos base reutilizáveis — independentes de paciente
          </p>
        </div>
        <Button asChild className="gap-1.5 shrink-0">
          <Link to="/admin/modelos/novo">
            <Plus size={15} />
            Novo Modelo
          </Link>
        </Button>
      </div>

      {/* ── Conteúdo ────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Carregando modelos…</span>
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
          <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
            <LayoutList size={28} className="opacity-30" />
          </div>
          <div className="text-center">
            <p className="font-medium">Nenhum modelo cadastrado</p>
            <p className="text-sm opacity-70 mt-0.5">
              Crie protocolos base que podem ser importados em qualquer plano alimentar
            </p>
          </div>
          <Button asChild variant="outline" className="gap-1.5">
            <Link to="/admin/modelos/novo">
              <Plus size={14} />
              Criar primeiro modelo
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map((t) => (
            <TemplateCard key={t.id} template={t} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
