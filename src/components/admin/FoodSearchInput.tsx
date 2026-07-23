import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight, Globe, Loader2, Plus, Search, Sparkles, X } from "lucide-react";
import {
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
import { fetchCustomFoods, saveCustomFood } from "@/components/admin/customFoods";
import { FOOD_CATEGORIES, getFoodHouseholdMeasures, type FoodItem, type HouseholdMeasure } from "@/lib/foodDatabase";
import { searchOpenFoodFacts } from "@/lib/openFoodFacts";
import { searchFoodsInSupabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const EMPTY_FORM = {
  name: "",
  category: "Personalizado",
  kcal_per_100g: "",
  protein_per_100g: "",
  carbs_per_100g: "",
  fat_per_100g: "",
  fiber_per_100g: "",
};

interface FoodSearchInputProps {
  value: string;
  onSelect: (food: {
    name: string;
    kcal_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;
    household_measures?: HouseholdMeasure[];
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

function normalizeKey(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export function FoodSearchInput({ value, onSelect, onCustomName }: FoodSearchInputProps) {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<FoodItem[]>([]);
  const [apiResults, setApiResults] = useState<FoodItem[]>([]);
  const [apiStatus, setApiStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CustomFoodForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<CustomFoodForm>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const apiAbortRef = useRef<AbortController | null>(null);
  const apiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const updatePos = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  const runSearch = useCallback(async (nextQuery: string) => {
    if (nextQuery.trim().length < 2) {
      setResults([]);
      setApiResults([]);
      setApiStatus("idle");
      setIsOpen(false);
      return;
    }

    const dbFoods = await searchFoodsInSupabase(nextQuery);
    const customFoods = await fetchCustomFoods();
    const customMatches = customFoods.filter((food) => normalizeKey(food.name).includes(normalizeKey(nextQuery)));

    const merged = [...customMatches, ...dbFoods].filter((food, index, array) => {
      const currentKey = `${normalizeKey(food.name)}::${normalizeKey(food.category)}`;
      return array.findIndex((candidate) => `${normalizeKey(candidate.name)}::${normalizeKey(candidate.category)}` === currentKey) === index;
    });

    setResults(merged.slice(0, 30));
    updatePos();
    setIsOpen(true);

    if (apiTimerRef.current) clearTimeout(apiTimerRef.current);
    if (apiAbortRef.current) apiAbortRef.current.abort();

    setApiStatus("loading");
    setApiResults([]);

    apiTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      apiAbortRef.current = controller;

      try {
        const offResults = await searchOpenFoodFacts(nextQuery, controller.signal);
        setApiResults(offResults);
        setApiStatus("done");
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") {
          setApiStatus("error");
        }
      }
    }, 600);
  }, [updatePos]);

  useEffect(() => {
    return () => {
      if (apiTimerRef.current) clearTimeout(apiTimerRef.current);
      if (apiAbortRef.current) apiAbortRef.current.abort();
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inPortal = document.getElementById("food-search-portal")?.contains(target);

      if (!inContainer && !inPortal) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);

    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [isOpen, updatePos]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.target.value;
    setQuery(nextQuery);
    onCustomName(nextQuery);
    updatePos();
    void runSearch(nextQuery);
  };

  const handleSelect = (food: FoodItem) => {
    setQuery(food.name);
    setIsOpen(false);
    onSelect({
      name: food.name,
      kcal_per_100g: food.kcal,
      protein_per_100g: food.protein,
      carbs_per_100g: food.carbs,
      fat_per_100g: food.fat,
      household_measures: food.household_measures ?? getFoodHouseholdMeasures(food.name),
    });
  };

  const handleClear = () => {
    setQuery("");
    setIsOpen(false);
    setResults([]);
    setApiResults([]);
    setApiStatus("idle");

    if (apiTimerRef.current) clearTimeout(apiTimerRef.current);
    if (apiAbortRef.current) apiAbortRef.current.abort();

    onCustomName("");
    inputRef.current?.focus();
  };

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

  const setField = (field: keyof CustomFoodForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = () => {
    const errors: Partial<CustomFoodForm> = {};

    if (!form.name.trim()) errors.name = "Nome é obrigatório";
    if (!form.kcal_per_100g || Number.isNaN(Number(form.kcal_per_100g))) errors.kcal_per_100g = "Informe as calorias";
    if (!form.protein_per_100g || Number.isNaN(Number(form.protein_per_100g))) errors.protein_per_100g = "Informe a proteína";
    if (!form.carbs_per_100g || Number.isNaN(Number(form.carbs_per_100g))) errors.carbs_per_100g = "Informe os carboidratos";
    if (!form.fat_per_100g || Number.isNaN(Number(form.fat_per_100g))) errors.fat_per_100g = "Informe a gordura";

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
        kcal_per_100g: saved.kcal,
        protein_per_100g: saved.protein,
        carbs_per_100g: saved.carbs,
        fat_per_100g: saved.fat,
        household_measures: saved.household_measures ?? getFoodHouseholdMeasures(saved.name),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const canCreateCustomFood = query.trim().length > 0;

  return (
    <>
      <div ref={containerRef} className="relative w-full">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              if (query.trim().length >= 2) {
                updatePos();
                setIsOpen(true);
              }
            }}
            placeholder="Buscar alimento..."
            className={cn(adminInputClass, "pl-9 pr-9")}
          />

          {query ? (
            <button
              type="button"
              onClick={handleClear}
              className={cn(adminIconButtonClass, "absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2")}
              aria-label="Limpar"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {isOpen && dropdownPos
          ? createPortal(
              <div
                id="food-search-portal"
                style={{
                  position: "fixed",
                  top: dropdownPos.top,
                  left: dropdownPos.left,
                  width: Math.max(dropdownPos.width, 380),
                  zIndex: 9999,
                }}
                className={cn(adminSurfaceClass, "overflow-hidden rounded-2xl bg-popover shadow-2xl")}
              >
                <div className="border-b border-border bg-muted/10 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className={adminEyebrowClass}>Busca inteligente</p>
                      <p className="text-sm font-medium text-foreground">
                        {query.trim().length >= 2 ? `Resultados para "${query}"` : "Digite pelo menos 2 caracteres"}
                      </p>
                    </div>
                    <div className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                      {results.length} local · {apiResults.length} externo
                    </div>
                  </div>
                </div>

                <div className="max-h-[28rem] overflow-y-auto">
                  <div className="border-b border-border/70">
                    <div className="flex items-center justify-between gap-2 bg-background px-4 py-2.5">
                      <div>
                        <p className={adminEyebrowClass}>Catálogo do sistema</p>
                        <p className="text-xs text-muted-foreground">Resultados já prontos para usar no plano alimentar.</p>
                      </div>
                      <span className="rounded-full border border-border bg-muted/20 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                        {results.length}
                      </span>
                    </div>

                    {results.length === 0 ? (
                      <div className={cn(adminEmptyStateClass, "m-3 flex flex-col gap-1 p-4 text-left")}>
                        <p className="text-sm font-medium text-foreground">Nada encontrado no catálogo local</p>
                        <p className="text-xs leading-5 text-muted-foreground">
                          Você pode testar outro termo ou cadastrar esse alimento manualmente logo abaixo.
                        </p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-border/50">
                        {results.map((food) => (
                          <FoodRow key={food.id} food={food} onSelect={handleSelect} />
                        ))}
                      </ul>
                    )}
                  </div>

                  {apiStatus !== "idle" ? (
                    <div>
                      <div className="flex items-center gap-2 bg-muted/15 px-4 py-2.5">
                        <Globe className="h-3.5 w-3.5 text-primary/70" />
                        <div className="min-w-0">
                          <p className={adminEyebrowClass}>Open Food Facts</p>
                          <p className="text-xs text-muted-foreground">Base externa complementar para ampliar a busca.</p>
                        </div>
                        {apiStatus === "loading" ? <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
                      </div>

                      {apiStatus === "loading" ? (
                        <div className="px-4 py-3 text-xs text-muted-foreground">Buscando na base global...</div>
                      ) : null}

                      {apiStatus === "error" ? (
                        <div className="px-4 py-3 text-xs text-muted-foreground">
                          Sem conexão com a API no momento. Mantivemos apenas os resultados locais.
                        </div>
                      ) : null}

                      {apiStatus === "done" && apiResults.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-muted-foreground">Nenhum resultado externo para "{query}".</div>
                      ) : null}

                      {apiResults.length > 0 ? (
                        <ul className="divide-y divide-border/50">
                          {apiResults.map((food) => (
                            <FoodRow key={food.id} food={food} onSelect={handleSelect} isApi />
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="border-t border-border bg-background/95 p-3">
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      openModal();
                    }}
                    className={cn(adminSecondaryButtonClass, "w-full justify-start border-dashed")}
                    disabled={!canCreateCustomFood}
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {canCreateCustomFood ? (
                        <>
                          Cadastrar <span className="font-semibold">"{query}"</span> como alimento personalizado
                        </>
                      ) : (
                        "Digite o nome para cadastrar um alimento personalizado"
                      )}
                    </span>
                  </button>
                </div>
              </div>,
              document.body,
            )
          : null}
      </div>

      {showModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className={cn(adminSurfaceClass, "w-full max-w-2xl max-h-[90vh] overflow-y-auto")}>
            <div className="flex items-center justify-between border-b border-border px-6 pb-4 pt-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <p className={adminEyebrowClass}>Alimento personalizado</p>
                  <h2 className="text-base font-semibold text-foreground">Cadastrar alimento personalizado</h2>
                </div>
              </div>
              <button type="button" onClick={closeModal} className={cn(adminIconButtonClass, "h-8 w-8")} aria-label="Fechar">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className={cn(adminSubtleCardClass, "p-4")}>
                <p className={adminHintClass}>
                  Use esse cadastro quando o alimento ainda não existir no seu banco local. Os dados serão salvos por 100g
                  para manter a consistência dos cálculos.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className={adminFieldLabelClass}>
                    Nome do alimento <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => setField("name", event.target.value)}
                    placeholder="Ex: Pão de queijo caseiro"
                    className={cn(adminInputClass, formErrors.name ? "border-destructive" : undefined)}
                  />
                  {formErrors.name ? <p className="text-xs text-destructive">{formErrors.name}</p> : null}
                </div>

                <div className="space-y-1.5">
                  <label className={adminFieldLabelClass}>Categoria</label>
                  <div className="relative">
                    <select value={form.category} onChange={(event) => setField("category", event.target.value)} className={adminSelectClass}>
                      {FOOD_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className={adminEyebrowClass}>Valores por 100g / 100ml</p>
                  <p className={adminHintClass}>Preencha os nutrientes principais para liberar o uso desse alimento nas prescrições.</p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <MacroField
                    label="Calorias (kcal)"
                    required
                    value={form.kcal_per_100g}
                    onChange={(nextValue) => setField("kcal_per_100g", nextValue)}
                    error={formErrors.kcal_per_100g}
                    placeholder="Ex: 250"
                  />
                  <MacroField
                    label="Proteína (g)"
                    required
                    value={form.protein_per_100g}
                    onChange={(nextValue) => setField("protein_per_100g", nextValue)}
                    error={formErrors.protein_per_100g}
                    placeholder="Ex: 12"
                  />
                  <MacroField
                    label="Carboidrato (g)"
                    required
                    value={form.carbs_per_100g}
                    onChange={(nextValue) => setField("carbs_per_100g", nextValue)}
                    error={formErrors.carbs_per_100g}
                    placeholder="Ex: 35"
                  />
                  <MacroField
                    label="Gordura (g)"
                    required
                    value={form.fat_per_100g}
                    onChange={(nextValue) => setField("fat_per_100g", nextValue)}
                    error={formErrors.fat_per_100g}
                    placeholder="Ex: 8"
                  />
                </div>

                <div className="w-full sm:w-1/2 sm:pr-1.5">
                  <MacroField
                    label="Fibras (g)"
                    value={form.fiber_per_100g}
                    onChange={(nextValue) => setField("fiber_per_100g", nextValue)}
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse items-stretch gap-2 px-6 pb-6 pt-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeModal} disabled={isSaving} className={adminSecondaryButtonClass}>
                Cancelar
              </button>
              <button type="button" onClick={handleSaveCustomFood} disabled={isSaving} className={adminPrimaryButtonClass}>
                {isSaving ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
                    Salvando...
                  </>
                ) : (
                  "Salvar alimento"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function FoodRow({
  food,
  onSelect,
  isApi,
}: {
  food: FoodItem;
  onSelect: (food: FoodItem) => void;
  isApi?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
          onSelect(food);
        }}
        className="w-full text-left"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-medium text-foreground">{food.name}</p>
              {isApi ? (
                <span className="shrink-0 rounded bg-primary/10 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-primary/70">
                  OFF
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{food.category}</p>
          </div>
          <div className="shrink-0 text-right text-xs tabular-nums">
            <p className="font-semibold text-foreground/80">{food.kcal} kcal</p>
            <p className="mt-0.5 text-muted-foreground">P {food.protein}g · C {food.carbs}g · G {food.fat}g</p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
        </div>
      </button>
    </li>
  );
}

interface MacroFieldProps {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

function MacroField({ label, required, value, onChange, error, placeholder }: MacroFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className={adminFieldLabelClass}>
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </label>
      <input
        type="number"
        min="0"
        step="0.1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(adminNumberInputClass, error ? "border-destructive" : undefined)}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export default FoodSearchInput;
