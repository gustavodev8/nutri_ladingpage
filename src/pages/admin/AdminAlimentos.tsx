import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Pencil, Trash2, X, Check, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { FOOD_CATEGORIES, type FoodItem } from "@/lib/foodDatabase";
import { cn } from "@/lib/utils";

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

// ─── FormModal (Unchanged) ────────────────────────────────────────────────────
// (Assume FormModal remains as previously defined)

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminAlimentos() {
  const [foods, setFoods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Todos");
  const [editingItem, setEditingItem] = useState<{ food: any; } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null); // food id

  const fetchFoods = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("master_foods")
      .select("*")
      .order("name");
    
    if (error) {
      toast.error("Erro ao carregar alimentos.");
      console.error(error);
    } else {
      setFoods(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFoods();
  }, []);

  const filtered = useMemo(() => {
    const q = normalizeStr(search.trim());
    return foods.filter((f) => {
      const matchCat = catFilter === "Todos" || f.category === catFilter;
      const matchQ   = !q || normalizeStr(f.name).includes(q) || normalizeStr(f.category).includes(q);
      return matchCat && matchQ;
    });
  }, [foods, search, catFilter]);

  const categories = ["Todos", ...FOOD_CATEGORIES];

  // ── CRUD ────────────────────────────────────────────────────────────────────

  const handleSaveNew = async (form: FoodForm) => {
    const newFood = {
      name:    form.name.trim(),
      category:form.category,
      kcal_per_100g:    parseFloat(form.kcal),
      protein_per_100g: parseFloat(form.protein),
      carbs_per_100g:   parseFloat(form.carbs),
      fat_per_100g:     parseFloat(form.fat),
      fiber_per_100g:   form.fiber ? parseFloat(form.fiber) : 0,
    };

    const { error } = await supabase.from("master_foods").insert(newFood);
    
    if (error) {
      toast.error("Erro ao adicionar alimento.");
      console.error(error);
    } else {
      toast.success("Alimento adicionado.");
      setShowForm(false);
      fetchFoods();
    }
  };

  const handleSaveEdit = async (form: FoodForm) => {
    if (!editingItem) return;
    
    const updated = {
      name:    form.name.trim(),
      category:form.category,
      kcal_per_100g:    parseFloat(form.kcal),
      protein_per_100g: parseFloat(form.protein),
      carbs_per_100g:   parseFloat(form.carbs),
      fat_per_100g:     parseFloat(form.fat),
      fiber_per_100g:   form.fiber ? parseFloat(form.fiber) : 0,
    };

    const { error } = await supabase
      .from("master_foods")
      .update(updated)
      .eq("id", editingItem.food.id);

    if (error) {
      toast.error("Erro ao atualizar alimento.");
      console.error(error);
    } else {
      toast.success("Alimento atualizado.");
      setEditingItem(null);
      fetchFoods();
    }
  };

  const handleDelete = async (food: any) => {
    const { error } = await supabase
      .from("master_foods")
      .delete()
      .eq("id", food.id);
    
    if (error) {
      toast.error("Erro ao remover alimento.");
      console.error(error);
    } else {
      toast.success("Alimento removido.");
      setConfirmDelete(null);
      fetchFoods();
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header, Filtros, Tabela (utilizando `foods` e chamando `handleSave...`) ... */}
      {/* NOTA: Para brevidade, a estrutura visual permanece a mesma, 
          apenas substituindo o acesso aos dados. */}
      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        /* ... renderização da tabela com `filtered` ... */
      )}
    </div>
  );
}
