import { type FoodItem } from "@/lib/foodDatabase";

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

export async function fetchCustomFoods(): Promise<FoodItem[]> {
  return getCustomFoods();
}

export async function saveCustomFood(food: {
  name: string;
  category: string;
  kcal_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
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
