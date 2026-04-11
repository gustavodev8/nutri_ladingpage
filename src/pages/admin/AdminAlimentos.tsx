import { useState, useMemo } from "react";
import { Search, Plus, Pencil, Trash2, X, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { BUILT_IN_FOODS, FOOD_CATEGORIES, type FoodItem } from "@/lib/foodDatabase";
import { cn } from "@/lib/utils";

// ─── localStorage helpers ──────────────────────────────────────────────────────

const STORAGE_KEY = "custom_foods";

function loadCustom(): FoodItem[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function saveCustom(foods: FoodItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(foods));
}

// ─── Types ─────────────────────────────────────────────────────────────────────

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
  name: "", category: "Personalizado",
  kcal: "", protein: "", carbs: "", fat: "", fiber: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const n1 = (v: number) => v.toFixed(1);

function normalizeStr(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ─── FormModal ────────────────────────────────────────────────────────────────

function FormModal({
  initial, onSave, onClose,
}: {
  initial: FoodForm;
  onSave: (f: FoodForm) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FoodForm>(initial);
  const [errors, setErrors] = useState<Partial<FoodForm>>({});

  const set = (k: keyof FoodForm, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const validate = () => {
    const e: Partial<FoodForm> = {};
    if (!form.name.trim())                       e.name    = "Obrigatório";
    if (!form.kcal    || isNaN(+form.kcal))      e.kcal    = "Obrigatório";
    if (!form.protein || isNaN(+form.protein))   e.protein = "Obrigatório";
    if (!form.carbs   || isNaN(+form.carbs))     e.carbs   = "Obrigatório";
    if (!form.fat     || isNaN(+form.fat))       e.fat     = "Obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => { if (validate()) onSave(form); };

  const field = (label: string, key: keyof FoodForm, required = false, type = "text") => (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        step={type === "number" ? "0.1" : undefined}
        min={type === "number" ? "0" : undefined}
        className={cn(
          "flex h-9 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring",
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none",
          errors[key] ? "border-destructive" : "border-input"
        )}
      />
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background border border-border rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            {initial.name ? "Editar alimento" : "Novo alimento"}
          </h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Nome */}
          {field("Nome do alimento", "name", true)}

          {/* Categoria */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Categoria</label>
            <div className="relative">
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="flex h-9 w-full appearance-none rounded-lg border border-input bg-background px-3 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {FOOD_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>

          {/* Macros por 100g */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Valores por 100g</p>
            <div className="grid grid-cols-2 gap-3">
              {field("Calorias (kcal)", "kcal", true, "number")}
              {field("Proteínas (g)",   "protein", true, "number")}
              {field("Carboidratos (g)","carbs", true, "number")}
              {field("Gorduras (g)",    "fat", true, "number")}
            </div>
            <div className="mt-3">
              {field("Fibras (g) — opcional", "fiber", false, "number")}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="h-9 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/60 transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit}
            className="h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 hover:bg-primary/90 transition-colors">
            <Check className="h-3.5 w-3.5" />
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminAlimentos() {
  const [custom, setCustom] = useState<FoodItem[]>(loadCustom);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Todos");
  const [editingItem, setEditingItem] = useState<{ food: FoodItem; isCustom: boolean } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null); // food id

  // Merge: custom primeiro, depois built-in
  const allFoods = useMemo<(FoodItem & { isCustom: boolean })[]>(() => [
    ...custom.map((f) => ({ ...f, isCustom: true })),
    ...BUILT_IN_FOODS.map((f) => ({ ...f, isCustom: false })),
  ], [custom]);

  const categories = ["Todos", ...FOOD_CATEGORIES];

  const filtered = useMemo(() => {
    const q = normalizeStr(search.trim());
    return allFoods.filter((f) => {
      const matchCat = catFilter === "Todos" || f.category === catFilter;
      const matchQ   = !q || normalizeStr(f.name).includes(q) || normalizeStr(f.category).includes(q);
      return matchCat && matchQ;
    });
  }, [allFoods, search, catFilter]);

  // Estatísticas
  const stats = useMemo(() => ({
    total:   allFoods.length,
    custom:  custom.length,
    builtin: BUILT_IN_FOODS.length,
  }), [allFoods.length, custom.length]);

  // ── CRUD ────────────────────────────────────────────────────────────────────

  const handleSaveNew = (form: FoodForm) => {
    const newFood: FoodItem = {
      id:      `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name:    form.name.trim(),
      category:form.category,
      kcal:    parseFloat(form.kcal),
      protein: parseFloat(form.protein),
      carbs:   parseFloat(form.carbs),
      fat:     parseFloat(form.fat),
      fiber:   form.fiber ? parseFloat(form.fiber) : undefined,
    };
    const updated = [newFood, ...custom];
    setCustom(updated);
    saveCustom(updated);
    setShowForm(false);
    toast.success("Alimento adicionado.");
  };

  const handleSaveEdit = (form: FoodForm) => {
    if (!editingItem) return;
    const { food, isCustom } = editingItem;
    const updated: FoodItem = {
      ...food,
      name:    form.name.trim(),
      category:form.category,
      kcal:    parseFloat(form.kcal),
      protein: parseFloat(form.protein),
      carbs:   parseFloat(form.carbs),
      fat:     parseFloat(form.fat),
      fiber:   form.fiber ? parseFloat(form.fiber) : undefined,
    };

    if (isCustom) {
      // Edita direto no localStorage
      const next = custom.map((c) => c.id === food.id ? updated : c);
      setCustom(next);
      saveCustom(next);
    } else {
      // Alimento built-in: salva como customizado (override)
      const override: FoodItem = { ...updated, id: `custom_override_${food.id}` };
      const next = [override, ...custom];
      setCustom(next);
      saveCustom(next);
      toast.info("Alimento padrão salvo como personalizado.");
    }
    setEditingItem(null);
    toast.success("Alimento atualizado.");
  };

  const handleDelete = (food: FoodItem) => {
    const next = custom.filter((c) => c.id !== food.id);
    setCustom(next);
    saveCustom(next);
    setConfirmDelete(null);
    toast.success("Alimento removido.");
  };

  const openEdit = (food: FoodItem, isCustom: boolean) => {
    setEditingItem({ food, isCustom });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Banco de Alimentos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats.builtin} alimentos padrão · {stats.custom} personalizados
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo alimento
        </button>
      </div>

      {/* ── Filtros ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Busca */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou categoria..."
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filtro categoria */}
        <div className="relative">
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="h-9 appearance-none rounded-lg border border-input bg-background pl-3 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>

      {/* ── Tabela ───────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border/60 rounded-lg overflow-hidden">
        {/* Cabeçalho */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto_auto] gap-x-4 px-4 py-2 bg-muted/30 border-b border-border/40">
          {["Alimento", "Categoria", "kcal", "Prot.", "Carb.", "Gord.", "Fibras", ""].map((h) => (
            <span key={h} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {h}
            </span>
          ))}
        </div>

        {/* Linhas */}
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground/50 italic">
            Nenhum alimento encontrado
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {filtered.map((food) => (
              <div
                key={food.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto_auto] gap-x-4 px-4 py-2.5 items-center hover:bg-muted/20 transition-colors group"
              >
                {/* Nome */}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{food.name}</p>
                  {food.isCustom && (
                    <span className="text-[10px] font-semibold text-primary/70 uppercase tracking-wider">
                      personalizado
                    </span>
                  )}
                </div>

                {/* Categoria */}
                <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">{food.category}</span>

                {/* Macros */}
                <span className="text-xs tabular-nums text-foreground/80 w-10 text-right">{n1(food.kcal)}</span>
                <span className="text-xs tabular-nums text-foreground/80 w-10 text-right">{n1(food.protein)}g</span>
                <span className="text-xs tabular-nums text-foreground/80 w-10 text-right">{n1(food.carbs)}g</span>
                <span className="text-xs tabular-nums text-foreground/80 w-10 text-right">{n1(food.fat)}g</span>
                <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">
                  {food.fiber ? `${n1(food.fiber)}g` : "—"}
                </span>

                {/* Ações */}
                <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => openEdit(food, food.isCustom)}
                    className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Editar"
                  >
                    <Pencil size={12} />
                  </button>
                  {food.isCustom && (
                    confirmDelete === food.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(food)}
                          className="h-7 px-2 text-xs rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(null)}
                          className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(food.id)}
                        className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Remover"
                      >
                        <Trash2 size={12} />
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rodapé com contagem */}
        <div className="px-4 py-2 border-t border-border/30 bg-muted/10">
          <p className="text-xs text-muted-foreground/50">
            {filtered.length} de {stats.total} alimentos
            {search || catFilter !== "Todos" ? " (filtrado)" : ""}
          </p>
        </div>
      </div>

      {/* ── Modal novo alimento ──────────────────────────────────────────── */}
      {showForm && (
        <FormModal
          initial={EMPTY_FORM}
          onSave={handleSaveNew}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* ── Modal editar alimento ────────────────────────────────────────── */}
      {editingItem && (
        <FormModal
          initial={{
            name:    editingItem.food.name,
            category:editingItem.food.category,
            kcal:    String(editingItem.food.kcal),
            protein: String(editingItem.food.protein),
            carbs:   String(editingItem.food.carbs),
            fat:     String(editingItem.food.fat),
            fiber:   editingItem.food.fiber != null ? String(editingItem.food.fiber) : "",
          }}
          onSave={handleSaveEdit}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}
