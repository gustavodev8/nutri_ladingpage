import type { Meal, MealFood } from "@/lib/supabase";

export interface MonthlyShoppingListItem {
  foodName: string;
  foodGroup: string;
  dailyQuantity: number;
  monthlyQuantity: number;
  unit: string;
  displayQuantity: number;
  displayUnit: string;
  sourceMeals: string[];
  quantifiedOccurrences: number;
  missingOccurrences: number;
}

export interface MissingShoppingListItem {
  foodName: string;
  sourceMeals: string[];
  occurrences: number;
}

export interface MonthlyShoppingListGroup {
  foodGroup: string;
  items: MonthlyShoppingListItem[];
}

export interface MonthlyShoppingListResult {
  groups: MonthlyShoppingListGroup[];
  missingItems: MissingShoppingListItem[];
  totalItems: number;
  totalGroups: number;
  totalMissingOccurrences: number;
}

interface ItemAccumulator {
  foodName: string;
  foodGroupLabels: Set<string>;
  sourceMeals: Set<string>;
  dailyQuantity: number;
  baseUnit: string;
  displayUnit: string;
  quantifiedOccurrences: number;
  missingOccurrences: number;
}

interface UnitProfile {
  baseUnit: string;
  factorToBase: number;
  kind: "weight" | "volume" | "count" | "custom";
}

const NUMBER_FORMAT = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeKey(value: string) {
  return normalizeText(value).replace(/\s+/g, " ");
}

function getUnitProfile(unit?: string): UnitProfile {
  const normalized = normalizeText(unit ?? "");

  if (!normalized || normalized === "g" || normalized === "grama" || normalized === "gramas") {
    return { baseUnit: "g", factorToBase: 1, kind: "weight" };
  }
  if (normalized === "kg" || normalized === "quilo" || normalized === "quilos") {
    return { baseUnit: "g", factorToBase: 1000, kind: "weight" };
  }
  if (normalized === "ml" || normalized === "mililitro" || normalized === "mililitros") {
    return { baseUnit: "ml", factorToBase: 1, kind: "volume" };
  }
  if (normalized === "l" || normalized === "litro" || normalized === "litros") {
    return { baseUnit: "ml", factorToBase: 1000, kind: "volume" };
  }
  if (normalized === "un" || normalized === "unidade" || normalized === "unidades") {
    return { baseUnit: "un", factorToBase: 1, kind: "count" };
  }

  if (normalized.includes("unidade")) {
    return { baseUnit: "un", factorToBase: 1, kind: "count" };
  }

  if (normalized === "porcao" || normalized === "porção") {
    return { baseUnit: "porção", factorToBase: 1, kind: "custom" };
  }

  return {
    baseUnit: unit?.trim() || "un",
    factorToBase: 1,
    kind: "custom",
  };
}

function formatQuantity(value: number) {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.abs(value - Math.round(value)) < 0.01 ? Math.round(value) : value;
  return NUMBER_FORMAT.format(rounded);
}

function getDisplayQuantityAndUnit(monthlyQuantity: number, profile: UnitProfile) {
  if (profile.kind === "weight") {
    if (monthlyQuantity >= 1000) {
      return {
        quantity: monthlyQuantity / 1000,
        unit: "kg",
      };
    }
    return {
      quantity: monthlyQuantity,
      unit: "g",
    };
  }

  if (profile.kind === "volume") {
    if (monthlyQuantity >= 1000) {
      return {
        quantity: monthlyQuantity / 1000,
        unit: "L",
      };
    }
    return {
      quantity: monthlyQuantity,
      unit: "ml",
    };
  }

  return {
    quantity: monthlyQuantity,
    unit: profile.baseUnit,
  };
}

export function generateMonthlyShoppingList(meals: Meal[], days = 30): MonthlyShoppingListResult {
  const map = new Map<string, ItemAccumulator>();

  meals.forEach((meal) => {
    const mealName = meal.meal_name?.trim() || "Refeição";

    (meal.foods ?? []).forEach((food: MealFood) => {
      const foodName = food.food_name?.trim();
      if (!foodName) return;

      const profile = getUnitProfile(food.unit);
      const normalizedName = normalizeKey(foodName);
      const key = `${normalizedName}|${profile.baseUnit}`;
      const groupLabel = food.food_group?.trim() || "Sem categoria";
      const quantity = food.quantity;

      const current = map.get(key) ?? {
        foodName,
        foodGroupLabels: new Set<string>(),
        sourceMeals: new Set<string>(),
        dailyQuantity: 0,
        baseUnit: profile.baseUnit,
        displayUnit: profile.baseUnit,
        quantifiedOccurrences: 0,
        missingOccurrences: 0,
      };

      current.foodName = current.foodName || foodName;
      current.foodGroupLabels.add(groupLabel);
      current.sourceMeals.add(mealName);

      if (quantity !== undefined && Number.isFinite(quantity) && quantity > 0) {
        current.dailyQuantity += quantity * profile.factorToBase;
        current.quantifiedOccurrences += 1;
      } else {
        current.missingOccurrences += 1;
      }

      map.set(key, current);
    });
  });

  const normalizedItems = Array.from(map.values()).map((item) => {
    const monthlyQuantity = item.dailyQuantity * days;
    const display = getDisplayQuantityAndUnit(monthlyQuantity, getUnitProfile(item.displayUnit));
    const foodGroups = Array.from(item.foodGroupLabels).sort((a, b) => a.localeCompare(b, "pt-BR"));

    return {
      foodName: item.foodName,
      foodGroup: foodGroups.length === 1 ? foodGroups[0] : "Diversos",
      dailyQuantity: item.dailyQuantity,
      monthlyQuantity,
      unit: item.baseUnit,
      displayQuantity: display.quantity,
      displayUnit: display.unit,
      sourceMeals: Array.from(item.sourceMeals).sort((a, b) => a.localeCompare(b, "pt-BR")),
      quantifiedOccurrences: item.quantifiedOccurrences,
      missingOccurrences: item.missingOccurrences,
    };
  });

  const groupsMap = new Map<string, MonthlyShoppingListItem[]>();
  normalizedItems
    .sort((a, b) => {
      const groupOrder = a.foodGroup.localeCompare(b.foodGroup, "pt-BR");
      if (groupOrder !== 0) return groupOrder;
      return a.foodName.localeCompare(b.foodName, "pt-BR");
    })
    .forEach((item) => {
      const items = groupsMap.get(item.foodGroup) ?? [];
      items.push(item);
      groupsMap.set(item.foodGroup, items);
    });

  const missingMap = new Map<string, MissingShoppingListItem>();
  map.forEach((item) => {
    if (item.missingOccurrences <= 0) return;

    const key = normalizeKey(item.foodName);
    const current = missingMap.get(key) ?? {
      foodName: item.foodName,
      sourceMeals: [],
      occurrences: 0,
    };

    current.occurrences += item.missingOccurrences;
    current.sourceMeals = Array.from(new Set([...current.sourceMeals, ...item.sourceMeals]));
    missingMap.set(key, current);
  });

  const groups = Array.from(groupsMap.entries()).map(([foodGroup, items]) => ({
    foodGroup,
    items,
  }));

  const missingItems = Array.from(missingMap.values()).sort((a, b) => a.foodName.localeCompare(b.foodName, "pt-BR"));

  return {
    groups,
    missingItems,
    totalItems: normalizedItems.length,
    totalGroups: groups.length,
    totalMissingOccurrences: missingItems.reduce((sum, item) => sum + item.occurrences, 0),
  };
}

export function formatShoppingQuantity(quantity: number, unit: string) {
  return `${formatQuantity(quantity)} ${unit}`.trim();
}
