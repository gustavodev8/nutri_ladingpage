import fs from "fs";
import path from "path";

const OUTPUT_FILE = "supabase/seeds/master_foods_usda_seed.sql";
const MASTER_FILE = "supabase/seeds/master_foods_seed.sql";
const EXTRA_FILE = "supabase/seeds/master_foods_extra_seed.sql";
const API_KEY = process.env.FDC_API_KEY || "DEMO_KEY";

const SEARCH_TERMS = [
  "banana", "apple", "orange", "rice", "beans", "chicken", "beef", "fish", "egg", "milk",
  "yogurt", "oats", "bread", "potato", "sweet potato", "tomato", "lettuce", "spinach", "broccoli", "carrot",
  "cucumber", "cheese", "pasta", "corn", "avocado", "banana bread", "peanut butter", "almond", "walnut", "chia",
  "salmon", "tuna", "shrimp", "turkey", "pork", "lentils", "chickpeas", "tofu", "cottage cheese", "coconut water",
  "coffee", "tea", "grapes", "strawberry", "melon", "pear", "mango", "pineapple", "watermelon", "papaya",
  "beans black", "black beans", "whole wheat bread", "white bread", "corn tortilla", "quinoa", "couscous", "granola", "honey", "olive oil",
  "butter", "cashew", "pumpkin", "zucchini", "cauliflower", "cabbage", "kale", "beet", "radish", "broth",
];

function readText(file) {
  return fs.readFileSync(file, "utf8");
}

function normalizeKey(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();
}

function decodeMaybe(str) {
  try {
    return Buffer.from(str, "latin1").toString("utf8");
  } catch {
    return str;
  }
}

function extractExistingKeys() {
  const files = [MASTER_FILE, EXTRA_FILE].filter((file) => fs.existsSync(file));
  const keys = new Set();
  for (const file of files) {
    const text = readText(file);
    for (const match of text.matchAll(/\n\s*'([^']+)'\s*,\n\s*'[^']*'\s*,\n\s*'[^']*'\s*,\n\s*[0-9.]+/g)) {
      keys.add(match[1].toLowerCase());
    }
  }
  return keys;
}

async function searchFoods(query) {
  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", "25");
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data?.foods) ? data.foods : [];
}

async function fetchFoodsByIds(ids) {
  if (ids.length === 0) return [];
  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods");
  url.searchParams.set("api_key", API_KEY);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ids),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function pickNutrient(food, names) {
  const nutrients = food.foodNutrients ?? [];
  for (const wanted of names) {
    const hit = nutrients.find((n) => {
      const nutrientName = String(n.nutrientName ?? n.name ?? "").toLowerCase();
      return nutrientName.includes(wanted.toLowerCase());
    });
    if (hit) {
      const value = Number(hit.value ?? hit.amount ?? hit.gramAmount ?? 0);
      if (Number.isFinite(value)) return value;
    }
  }
  return 0;
}

function pickCategory(food) {
  const types = String(food.dataType || food.foodClass || food.wweiaFoodCategory?.description || "food");
  if (/branded/i.test(types)) return "Branded Foods";
  if (/foundation/i.test(types)) return "Foundation Foods";
  if (/survey/i.test(types) || /fndds/i.test(types)) return "Survey Foods";
  return "USDA FoodData Central";
}

function toSqlValue(v) {
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function main() {
  const existingKeys = extractExistingKeys();
  const foodsByKey = new Map();
  const searchResults = [];

  for (const term of SEARCH_TERMS) {
    const foods = await searchFoods(term);
    searchResults.push(...foods);
  }

  const ids = [...new Set(searchResults.map((food) => food.fdcId).filter(Boolean))];
  for (let i = 0; i < ids.length; i += 20) {
    const batch = ids.slice(i, i + 20);
    const foods = await fetchFoodsByIds(batch);
    for (const food of foods) {
      const name = decodeMaybe(String(food.description ?? food.lowercaseDescription ?? "")).trim();
      if (!name) continue;
      const nameKey = normalizeKey(name);
      if (!nameKey || existingKeys.has(name.toLowerCase()) || foodsByKey.has(nameKey)) continue;

      const protein = pickNutrient(food, ["protein"]);
      const carbs = pickNutrient(food, ["carbohydrate, by difference", "carbohydrate"]);
      const fat = pickNutrient(food, ["total lipid", "fat"]);
      const fiber = pickNutrient(food, ["fiber"]);
      const energy = pickNutrient(food, ["energy"]);
      const category = pickCategory(food);

      foodsByKey.set(nameKey, {
        name,
        nameKey,
        category,
        kcal: energy,
        protein,
        carbs,
        fat,
        fiber,
        sourceRef: `fdc:${food.fdcId}`,
        sourceCode: food.fdcId,
      });
    }
  }

  const rows = [...foodsByKey.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const lines = [];
  lines.push("-- USDA FoodData Central incremental seed");
  lines.push("-- Official source: https://fdc.nal.usda.gov/");
  lines.push(`-- Rows generated: ${rows.length}`);
  lines.push("");
  lines.push("INSERT INTO master_foods (name, name_key, category, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, source, source_ref, source_code) VALUES");
  rows.forEach((row, index) => {
    const comma = index === rows.length - 1 ? "" : ",";
    lines.push(
      `(${toSqlValue(row.name)}, ${toSqlValue(row.nameKey)}, ${toSqlValue(row.category)}, ${Number(row.kcal || 0).toFixed(2)}, ${Number(row.protein || 0).toFixed(2)}, ${Number(row.carbs || 0).toFixed(2)}, ${Number(row.fat || 0).toFixed(2)}, ${Number(row.fiber || 0).toFixed(2)}, 'usda_fdc', ${toSqlValue(row.sourceRef)}, ${toSqlValue(row.sourceCode)})${comma}`
    );
  });
  lines.push("ON CONFLICT (name_key) DO NOTHING;");
  lines.push("");

  fs.writeFileSync(OUTPUT_FILE, lines.join("\n"), "utf8");
  console.log(`Generated ${rows.length} USDA foods at ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
