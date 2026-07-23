import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FilterX,
  Loader2,
  PackageSearch,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  adminCardClass,
  adminDangerButtonClass,
  adminEmptyStateClass,
  adminEyebrowClass,
  adminFieldLabelClass,
  adminHintClass,
  adminIconButtonClass,
  adminInputClass,
  adminNumberInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminSelectClass,
  adminSubtleCardClass,
  adminSurfaceClass,
} from "@/components/admin/adminStyles";
import { FOOD_CATEGORIES, type FoodItem } from "@/lib/foodDatabase";
import { deleteFoodFromSupabase, fetchFoodsFromSupabase, upsertFoodInSupabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface FoodForm {
  name: string;
  category: string;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
}

const EMPTY_FORM: FoodForm = {
  name: "",
  category: "Personalizado",
  kcal: "",
  protein: "",
  carbs: "",
  fat: "",
  fiber: "",
};

const ITEMS_PER_PAGE = 12;

function normalizeStr(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function toForm(food: FoodItem): FoodForm {
  return {
    name: food.name,
    category: food.category,
    kcal: String(food.kcal),
    protein: String(food.protein),
    carbs: String(food.carbs),
    fat: String(food.fat),
    fiber: food.fiber !== undefined ? String(food.fiber) : "",
  };
}

function getFoodSourceLabel(food: FoodItem) {
  if (food.source === "taco_csv") {
    return food.source_code ? `TACO • ${food.source_code}` : "TACO";
  }

  if (!food.source || food.source === "custom") {
    return "Cadastro interno";
  }

  return food.source_code ? `${food.source} • ${food.source_code}` : food.source;
}

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-[108px] rounded-xl border border-border bg-background px-3 py-2 shadow-sm">
      <p className={adminEyebrowClass}>{label}</p>
      <p className="mt-1 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

function MacroMetric({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | string;
  unit?: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/90 px-3 py-2">
      <p className={adminEyebrowClass}>{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">
        {value}
        {unit ? <span className="ml-1 text-xs font-medium text-muted-foreground">{unit}</span> : null}
      </p>
    </div>
  );
}

function FormModal({
  initial,
  onSave,
  onClose,
}: {
  initial: FoodForm;
  onSave: (form: FoodForm) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FoodForm>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FoodForm, string>>>({});

  const setField = (key: keyof FoodForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof FoodForm, string>> = {};

    if (!form.name.trim()) nextErrors.name = "Obrigatório";
    if (Number.isNaN(Number(form.kcal))) nextErrors.kcal = "Obrigatório";
    if (Number.isNaN(Number(form.protein))) nextErrors.protein = "Obrigatório";
    if (Number.isNaN(Number(form.carbs))) nextErrors.carbs = "Obrigatório";
    if (Number.isNaN(Number(form.fat))) nextErrors.fat = "Obrigatório";
    if (form.fiber && Number.isNaN(Number(form.fiber))) nextErrors.fiber = "Valor inválido";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const field = (
    label: string,
    key: keyof FoodForm,
    required = false,
    type: "text" | "number" = "text",
  ) => (
    <div className="space-y-1">
      <label className={adminFieldLabelClass}>
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setField(key, e.target.value)}
        step={type === "number" ? "0.1" : undefined}
        min={type === "number" ? "0" : undefined}
        className={cn(type === "number" ? adminNumberInputClass : adminInputClass, errors[key] && "border-destructive")}
      />
      {errors[key] ? <p className="text-xs text-destructive">{errors[key]}</p> : null}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={cn(adminSurfaceClass, "w-full max-w-2xl")}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="space-y-1">
            <p className={adminEyebrowClass}>Cadastro manual</p>
            <h2 className="text-base font-semibold text-foreground">
              {initial.name ? "Editar alimento" : "Novo alimento"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className={cn(adminIconButtonClass, "h-8 w-8")}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className={cn(adminSubtleCardClass, "p-4")}>
            <p className={adminHintClass}>
              Preencha os valores por 100g para manter o cálculo padronizado em todo o sistema.
            </p>
          </div>

          {field("Nome do alimento", "name", true)}

          <div className="space-y-1">
            <label className={adminFieldLabelClass}>Categoria</label>
            <div className="relative">
              <select value={form.category} onChange={(e) => setField("category", e.target.value)} className={adminSelectClass}>
                {FOOD_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className={adminEyebrowClass}>Valores por 100g</p>
              <p className={adminHintClass}>Esses campos alimentam busca, montagem de plano e cálculos nutricionais.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {field("Calorias (kcal)", "kcal", true, "number")}
              {field("Proteínas (g)", "protein", true, "number")}
              {field("Carboidratos (g)", "carbs", true, "number")}
              {field("Gorduras (g)", "fat", true, "number")}
              <div className="sm:col-span-2">{field("Fibras (g) - opcional", "fiber", false, "number")}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={adminSecondaryButtonClass}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              if (validate()) onSave(form);
            }}
            className={adminPrimaryButtonClass}
          >
            <Check className="h-4 w-4" />
            Salvar alimento
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminAlimentos() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Todos");
  const [page, setPage] = useState(1);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<FoodItem | null>(null);

  const loadFoods = async () => {
    setLoading(true);
    try {
      const data = await fetchFoodsFromSupabase();
      setFoods(data);
    } catch {
      toast.error("Não foi possível carregar o banco de alimentos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFoods();
  }, []);

  const filtered = useMemo(() => {
    const q = normalizeStr(search.trim());
    return foods.filter((food) => {
      const matchesCategory = catFilter === "Todos" || food.category === catFilter;
      const matchesQuery =
        !q ||
        normalizeStr(food.name).includes(q) ||
        normalizeStr(food.category).includes(q) ||
        normalizeStr(getFoodSourceLabel(food)).includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [foods, search, catFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const hasFilters = search.trim().length > 0 || catFilter !== "Todos";
  const categoryCount = useMemo(() => new Set(foods.map((food) => food.category)).size, [foods]);

  const pagedFoods = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [search, catFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleSave = async (form: FoodForm) => {
    const food: Partial<FoodItem> = {
      id: editingItem?.id,
      name: form.name.trim(),
      category: form.category,
      kcal: Number(form.kcal),
      protein: Number(form.protein),
      carbs: Number(form.carbs),
      fat: Number(form.fat),
      fiber: form.fiber ? Number(form.fiber) : undefined,
    };

    const success = await upsertFoodInSupabase(food);
    if (!success) {
      toast.error("Erro ao salvar alimento");
      return;
    }

    toast.success(`Alimento "${food.name}" salvo com sucesso.`);
    setShowForm(false);
    setEditingItem(null);
    await loadFoods();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;

    const success = await deleteFoodFromSupabase(confirmDelete.id);
    if (!success) {
      toast.error("Erro ao remover alimento");
      return;
    }

    toast.success(`Alimento "${confirmDelete.name}" removido.`);
    setConfirmDelete(null);
    await loadFoods();
  };

  return (
    <div className="space-y-5 p-4 md:p-5 lg:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            <PackageSearch className="h-3.5 w-3.5" />
            Catálogo nutricional
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Banco de alimentos</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Organize o catálogo usado nas consultas, mantenha os macronutrientes consistentes e facilite a busca
              durante a montagem dos planos alimentares.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatPill label="Total" value={foods.length} />
            <StatPill label="Categorias" value={categoryCount} />
            <StatPill label="Na busca" value={filtered.length} />
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingItem(null);
            setShowForm(true);
          }}
          className={cn(adminPrimaryButtonClass, "w-full xl:w-auto")}
        >
          <Plus className="h-4 w-4" />
          Novo alimento
        </button>
      </div>

      <div className={cn(adminCardClass, "p-3.5 sm:p-4")}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px_auto] lg:items-end">
          <div className="space-y-1.5">
            <label className={adminFieldLabelClass}>Buscar alimento</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Digite nome, categoria ou origem..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(adminInputClass, "pl-10")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={adminFieldLabelClass}>Categoria</label>
            <div className="relative">
              <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className={adminSelectClass}>
                {["Todos", ...FOOD_CATEGORIES].map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCatFilter("Todos");
            }}
            className={cn(adminSecondaryButtonClass, "w-full lg:w-auto")}
            disabled={!hasFilters}
          >
            <FilterX className="h-4 w-4" />
            Limpar filtros
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-2 border-t border-border/70 pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            {hasFilters
              ? `${filtered.length} alimento(s) encontrado(s) com os filtros atuais.`
              : "Use a busca para localizar alimentos rapidamente e manter o catálogo organizado."}
          </p>
          <p>{totalPages} página(s) disponíveis</p>
        </div>
      </div>

      {loading ? (
        <div className={cn(adminEmptyStateClass, "flex flex-col items-center justify-center gap-3 p-12 text-center")}>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Carregando alimentos</p>
            <p className="text-sm text-muted-foreground">Estamos atualizando o catálogo para exibir os registros mais recentes.</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className={cn(adminEmptyStateClass, "p-10 text-center")}>
          <PackageSearch className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <h2 className="mt-4 text-base font-semibold text-foreground">
            {hasFilters ? "Nenhum alimento encontrado" : "Seu catálogo ainda está vazio"}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            {hasFilters
              ? "Tente ajustar os termos da busca ou trocar a categoria para ampliar os resultados."
              : "Cadastre o primeiro alimento para começar a montar um banco mais completo e facilitar o trabalho nas consultas."}
          </p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            {hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCatFilter("Todos");
                }}
                className={adminSecondaryButtonClass}
              >
                <FilterX className="h-4 w-4" />
                Limpar filtros
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setShowForm(true);
              }}
              className={adminPrimaryButtonClass}
            >
              <Plus className="h-4 w-4" />
              Cadastrar alimento
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pagedFoods.map((food) => (
              <div
                key={food.id}
                className={cn(adminCardClass, "flex h-full flex-col gap-4 p-4 transition-colors hover:border-primary/20")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-foreground">{food.name}</h3>
                      <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {food.category}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{getFoodSourceLabel(food)}</p>
                  </div>

                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem(food);
                        setShowForm(true);
                      }}
                      className={adminIconButtonClass}
                      aria-label={`Editar ${food.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(food)}
                      className={cn(adminIconButtonClass, "hover:text-destructive")}
                      aria-label={`Excluir ${food.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <MacroMetric label="Calorias" value={food.kcal} unit="kcal" />
                  <MacroMetric label="Proteínas" value={food.protein} unit="g" />
                  <MacroMetric label="Carboidratos" value={food.carbs} unit="g" />
                  <MacroMetric label="Gorduras" value={food.fat} unit="g" />
                </div>

                {food.fiber !== undefined ? (
                  <div className={cn(adminSubtleCardClass, "px-3 py-2")}>
                    <p className={adminEyebrowClass}>Fibra</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{food.fiber} g</p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className={cn(adminCardClass, "flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between")}>
            <p className="text-xs text-muted-foreground">
              Mostrando {filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1} até{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} de {filtered.length} alimentos
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={cn(adminSecondaryButtonClass, "h-9 px-3")}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, index) => index + 1)
                  .filter((number) => {
                    if (totalPages <= 7) return true;
                    return number === 1 || number === totalPages || Math.abs(number - currentPage) <= 1;
                  })
                  .map((number, index, array) => {
                    const previous = array[index - 1];
                    const showGap = previous !== undefined && number - previous > 1;

                    return (
                      <div key={number} className="flex items-center gap-1">
                        {showGap ? <span className="px-1 text-muted-foreground">...</span> : null}
                        <button
                          type="button"
                          onClick={() => setPage(number)}
                          className={cn(
                            "h-9 min-w-9 rounded-lg border px-3 text-sm font-medium transition-colors",
                            number === currentPage
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border text-foreground hover:bg-muted/60",
                          )}
                        >
                          {number}
                        </button>
                      </div>
                    );
                  })}
              </div>

              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={cn(adminSecondaryButtonClass, "h-9 px-3")}
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm ? (
        <FormModal
          initial={editingItem ? toForm(editingItem) : EMPTY_FORM}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      ) : null}

      {confirmDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setConfirmDelete(null);
          }}
        >
          <div className={cn(adminSurfaceClass, "w-full max-w-md p-5")}>
            <p className={adminEyebrowClass}>Atenção</p>
            <h2 className="mt-2 text-base font-semibold text-foreground">Excluir alimento</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Você vai remover <span className="font-medium text-foreground">{confirmDelete.name}</span> do catálogo.
              Essa ação não afeta planos já salvos, mas o item deixará de aparecer nas próximas buscas.
            </p>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setConfirmDelete(null)} className={adminSecondaryButtonClass}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleDelete();
                }}
                className={adminDangerButtonClass}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
