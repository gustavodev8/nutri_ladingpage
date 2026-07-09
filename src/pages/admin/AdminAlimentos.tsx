import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Check, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
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
      <label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setField(key, e.target.value)}
        step={type === "number" ? "0.1" : undefined}
        min={type === "number" ? "0" : undefined}
        className={cn(
          "flex h-9 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring",
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none",
          errors[key] ? "border-destructive" : "border-input",
        )}
      />
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            {initial.name ? "Editar alimento" : "Novo alimento"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {field("Nome do alimento", "name", true)}

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Categoria</label>
            <div className="relative">
              <select
                value={form.category}
                onChange={(e) => setField("category", e.target.value)}
                className="flex h-9 w-full appearance-none rounded-lg border border-input bg-background px-3 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {FOOD_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Valores por 100g</p>
            <div className="grid grid-cols-2 gap-3">
              {field("Calorias (kcal)", "kcal", true, "number")}
              {field("Proteínas (g)", "protein", true, "number")}
              {field("Carboidratos (g)", "carbs", true, "number")}
              {field("Gorduras (g)", "fat", true, "number")}
            </div>
            <div className="mt-3">{field("Fibras (g) - opcional", "fiber", false, "number")}</div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              if (validate()) onSave(form);
            }}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Check className="h-3.5 w-3.5" />
            Salvar
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
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadFoods = async () => {
    setLoading(true);
    const data = await fetchFoodsFromSupabase();
    setFoods(data);
    setLoading(false);
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
        normalizeStr(food.category).includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [foods, search, catFilter]);

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

    toast.success("Alimento salvo!");
    setShowForm(false);
    setEditingItem(null);
    await loadFoods();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;

    const success = await deleteFoodFromSupabase(confirmDelete);
    if (!success) {
      toast.error("Erro ao remover alimento");
      return;
    }

    toast.success("Alimento removido");
    setConfirmDelete(null);
    await loadFoods();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Banco de Alimentos</h1>
          <p className="text-sm text-muted-foreground">
            {foods.length} alimentos cadastrados
          </p>
        </div>

        <button
          onClick={() => {
            setEditingItem(null);
            setShowForm(true);
          }}
          className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Novo Alimento
        </button>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Buscar por nome ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="h-10 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {["Todos", ...FOOD_CATEGORIES].map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Nenhum alimento encontrado com os filtros atuais.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((food) => (
            <div
              key={food.id}
              className="flex items-start justify-between rounded-2xl border border-border bg-card p-4"
            >
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-foreground">{food.name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{food.category}</p>
                {food.source && food.source !== "custom" && (
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-primary">
                    Origem: {food.source === "taco_csv" ? "TACO" : food.source}
                    {food.source_code ? ` · ${food.source_code}` : ""}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Kcal: {food.kcal}</span>
                  <span>P: {food.protein}g</span>
                  <span>C: {food.carbs}g</span>
                  <span>G: {food.fat}g</span>
                  {food.fiber !== undefined && <span>Fibras: {food.fiber}g</span>}
                </div>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setEditingItem(food);
                    setShowForm(true);
                  }}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-primary"
                  aria-label={`Editar ${food.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setConfirmDelete(food.id)}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-destructive"
                  aria-label={`Excluir ${food.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <FormModal
          initial={editingItem ? toForm(editingItem) : EMPTY_FORM}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setConfirmDelete(null);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-xl">
            <h2 className="text-base font-semibold text-foreground">Excluir alimento</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Essa ação remove o alimento do catálogo. Deseja continuar?
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleDelete();
                }}
                className="h-9 rounded-lg bg-destructive px-4 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
