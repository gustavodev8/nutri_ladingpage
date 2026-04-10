import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, Plus, X, ChevronRight, Sparkles } from "lucide-react";
import { searchFoods, type FoodItem, FOOD_CATEGORIES } from "@/lib/foodDatabase";
import { cn } from "@/lib/utils";

// ─── Temporary localStorage stubs ────────────────────────────────────────────
// Store custom foods in localStorage until the Supabase table is created.

const getCustomFoods = (): FoodItem[] => {
  try {
    return JSON.parse(localStorage.getItem("custom_foods") || "[]");
  } catch {
    return [];
  }
};

const saveCustomFoodLocal = (food: FoodItem): void => {
  const foods = getCustomFoods();
  foods.push(food);
  localStorage.setItem("custom_foods", JSON.stringify(foods));
};

// These are the functions the component imports from @/lib/supabase in the
// future — for now they delegate to localStorage.
export async function fetchCustomFoods(): Promise<FoodItem[]> {
  return getCustomFoods();
}

export async function saveCustomFood(food: {
  name: string; category: string;
  kcal_per_100g: number; protein_per_100g: number;
  carbs_per_100g: number; fat_per_100g: number;
  fiber_per_100g?: number;
}): Promise<FoodItem> {
  const newFood: FoodItem = {
    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: food.name,
    category: food.category || "Personalizado",
    kcal: food.kcal_per_100g,
    protein: food.protein_per_100g,
    carbs: food.carbs_per_100g,
    fat: food.fat_per_100g,
    fiber: food.fiber_per_100g,
  };
  saveCustomFoodLocal(newFood);
  return newFood;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FoodSearchInputProps {
  value: string;
  onSelect: (food: {
    name: string;
    kcal_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;
  }) => void;
  onCustomName: (name: string) => void;
}

interface CustomFoodForm {
  name: string;
  category: string;
  kcal_per_100g: string;
  protein_per_100g: string;
  carbs_per_100g: string;
  fat_per_100g: string;
  fiber_per_100g: string;
}

const EMPTY_FORM: CustomFoodForm = {
  name: "",
  category: "Personalizado",
  kcal_per_100g: "",
  protein_per_100g: "",
  carbs_per_100g: "",
  fat_per_100g: "",
  fiber_per_100g: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function FoodSearchInput({ value, onSelect, onCustomName }: FoodSearchInputProps) {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<FoodItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CustomFoodForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<CustomFoodForm>>({});
  const [isSaving, setIsSaving] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // ── Sync external value ──────────────────────────────────────────────────
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // ── Search ───────────────────────────────────────────────────────────────
  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    const builtIn = searchFoods(q);
    const custom = await fetchCustomFoods();
    const filteredCustom = custom.filter((f) =>
      f.name.toLowerCase().includes(q.toLowerCase())
    );
    // Merge: custom foods first, then built-in, deduplicated by id
    const seen = new Set<string>();
    const merged: FoodItem[] = [];
    for (const f of [...filteredCustom, ...builtIn]) {
      if (!seen.has(f.id)) { seen.add(f.id); merged.push(f); }
    }
    setResults(merged.slice(0, 30));
    updatePos();
    setIsOpen(true);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    onCustomName(q);
    updatePos();
    runSearch(q);
  };

  // ── Compute dropdown position (portal needs fixed coords) ───────────────
  const updatePos = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  // ── Close on outside click ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inPortal = (document.getElementById("food-search-portal"))?.contains(target);
      if (!inContainer && !inPortal) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Update position on scroll/resize ────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [isOpen, updatePos]);

  // ── Select food from dropdown ────────────────────────────────────────────
  const handleSelect = (food: FoodItem) => {
    setQuery(food.name);
    setIsOpen(false);
    onSelect({
      name: food.name,
      kcal_per_100g: food.kcal,
      protein_per_100g: food.protein,
      carbs_per_100g: food.carbs,
      fat_per_100g: food.fat,
    });
  };

  // ── Clear input ──────────────────────────────────────────────────────────
  const handleClear = () => {
    setQuery("");
    setIsOpen(false);
    setResults([]);
    onCustomName("");
    inputRef.current?.focus();
  };

  // ── Open custom food modal ───────────────────────────────────────────────
  const openModal = () => {
    setForm({ ...EMPTY_FORM, name: query });
    setFormErrors({});
    setIsOpen(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(EMPTY_FORM);
    setFormErrors({});
  };

  // ── Custom food form handling ────────────────────────────────────────────
  const setField = (field: keyof CustomFoodForm, val: string) => {
    setForm((prev) => ({ ...prev, [field]: val }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<CustomFoodForm> = {};
    if (!form.name.trim()) errors.name = "Nome é obrigatório";
    if (!form.kcal_per_100g || isNaN(Number(form.kcal_per_100g)))
      errors.kcal_per_100g = "Informe as calorias";
    if (!form.protein_per_100g || isNaN(Number(form.protein_per_100g)))
      errors.protein_per_100g = "Informe a proteína";
    if (!form.carbs_per_100g || isNaN(Number(form.carbs_per_100g)))
      errors.carbs_per_100g = "Informe os carboidratos";
    if (!form.fat_per_100g || isNaN(Number(form.fat_per_100g)))
      errors.fat_per_100g = "Informe a gordura";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveCustomFood = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const saved = await saveCustomFood({
        name: form.name.trim(),
        category: form.category || "Personalizado",
        kcal_per_100g: Number(form.kcal_per_100g),
        protein_per_100g: Number(form.protein_per_100g),
        carbs_per_100g: Number(form.carbs_per_100g),
        fat_per_100g: Number(form.fat_per_100g),
        fiber_per_100g: form.fiber_per_100g ? Number(form.fiber_per_100g) : undefined,
      });
      setQuery(saved.name);
      closeModal();
      onSelect({
        name: saved.name,
        kcal_per_100g: saved.kcal_per_100g,
        protein_per_100g: saved.protein_per_100g,
        carbs_per_100g: saved.carbs_per_100g,
        fat_per_100g: saved.fat_per_100g,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      {/* Search input + dropdown */}
      <div ref={containerRef} className="relative w-full">
        {/* Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => { if (query.trim().length >= 2) { updatePos(); setIsOpen(true); } }}
            placeholder="Buscar alimento..."
            className={cn(
              "flex h-10 w-full rounded-lg border border-input bg-background",
              "pl-9 pr-9 py-2 text-sm",
              "ring-offset-background placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Limpar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Dropdown rendered as portal to escape overflow clipping */}
        {isOpen && dropdownPos && createPortal(
          <div
            id="food-search-portal"
            style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left, width: Math.max(dropdownPos.width, 380), zIndex: 9999 }}
            className="bg-popover border border-border rounded-lg shadow-xl overflow-hidden"
          >
            {/* Results list */}
            <ul className="max-h-80 overflow-y-auto divide-y divide-border/50">
              {results.length === 0 ? (
                <li className="px-4 py-3 text-sm text-muted-foreground text-center">
                  Nenhum alimento encontrado para "{query}"
                </li>
              ) : (
                results.map((food) => (
                  <li key={food.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); handleSelect(food); }}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/60 cursor-pointer transition-colors gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{food.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{food.category}</p>
                        </div>
                        <div className="text-right text-xs tabular-nums shrink-0">
                          <p className="font-semibold text-foreground/80">{food.kcal} kcal</p>
                          <p className="text-muted-foreground mt-0.5">P {food.protein}g · C {food.carbs}g · G {food.fat}g</p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>

            {/* Add custom food button — always at bottom */}
            <div className="border-t border-border">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); openModal(); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-primary hover:bg-primary/5 transition-colors font-medium"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  Cadastrar <span className="font-semibold">"{query}"</span> como alimento personalizado
                </span>
              </button>
            </div>
          </div>,
          document.body
        )}
      </div>

      {/* Custom food modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-background border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">
                  Cadastrar alimento personalizado
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-5">
              {/* Name + Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Nome do alimento <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="Ex: Pão de queijo caseiro"
                    className={cn(
                      "flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm",
                      "ring-offset-background placeholder:text-muted-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      formErrors.name ? "border-destructive" : "border-input"
                    )}
                  />
                  {formErrors.name && (
                    <p className="text-xs text-destructive">{formErrors.name}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Categoria</label>
                  <select
                    value={form.category}
                    onChange={(e) => setField("category", e.target.value)}
                    className={cn(
                      "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
                      "ring-offset-background",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    )}
                  >
                    {FOOD_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Macros section */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">
                  Por 100g / 100ml
                </p>

                {/* Required macros */}
                <div className="grid grid-cols-2 gap-3">
                  <MacroField
                    label="Calorias (kcal)"
                    required
                    value={form.kcal_per_100g}
                    onChange={(v) => setField("kcal_per_100g", v)}
                    error={formErrors.kcal_per_100g}
                    placeholder="Ex: 250"
                  />
                  <MacroField
                    label="Proteína (g)"
                    required
                    value={form.protein_per_100g}
                    onChange={(v) => setField("protein_per_100g", v)}
                    error={formErrors.protein_per_100g}
                    placeholder="Ex: 12"
                  />
                  <MacroField
                    label="Carboidrato (g)"
                    required
                    value={form.carbs_per_100g}
                    onChange={(v) => setField("carbs_per_100g", v)}
                    error={formErrors.carbs_per_100g}
                    placeholder="Ex: 35"
                  />
                  <MacroField
                    label="Gordura (g)"
                    required
                    value={form.fat_per_100g}
                    onChange={(v) => setField("fat_per_100g", v)}
                    error={formErrors.fat_per_100g}
                    placeholder="Ex: 8"
                  />
                </div>

                {/* Optional fiber */}
                <div className="w-full sm:w-1/2 pr-0 sm:pr-1.5">
                  <MacroField
                    label="Fibras (g)"
                    value={form.fiber_per_100g}
                    onChange={(v) => setField("fiber_per_100g", v)}
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className={cn(
                  "h-9 px-4 rounded-lg border border-input bg-background text-sm font-medium text-foreground",
                  "hover:bg-muted/60 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCustomFood}
                disabled={isSaving}
                className={cn(
                  "h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium",
                  "hover:bg-primary/90 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center gap-2"
                )}
              >
                {isSaving ? (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar alimento"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── MacroField helper ────────────────────────────────────────────────────────

interface MacroFieldProps {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
}

function MacroField({ label, required, value, onChange, error, placeholder }: MacroFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <input
        type="number"
        min="0"
        step="0.1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "flex h-9 w-full rounded-lg border bg-background px-3 py-2 text-sm",
          "ring-offset-background placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          error ? "border-destructive" : "border-input"
        )}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default FoodSearchInput;
