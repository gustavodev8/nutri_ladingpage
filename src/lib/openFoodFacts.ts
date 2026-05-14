import type { FoodItem } from "./foodDatabase";

interface OFFProduct {
  product_name?: string;
  product_name_pt?: string;
  product_name_en?: string;
  categories_tags?: string[];
  nutriments?: {
    "energy-kcal_100g"?: number;
    "energy_100g"?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
  };
}

interface OFFSearchResponse {
  products?: OFFProduct[];
}

function mapOFFCategory(tags?: string[]): string {
  if (!tags?.length) return "Personalizado";
  const tag = tags.join(" ").toLowerCase();
  if (/fruit|fruta/.test(tag)) return "Frutas";
  if (/cereal|grain|arroz|trigo|aveia|milho/.test(tag)) return "Cereais e derivados";
  if (/bread|p.o|biscoito|bolo|massa|farinha/.test(tag)) return "Pães, bolos e biscoitos";
  if (/meat|carne|frango|aves|suino|bovino|peito/.test(tag)) return "Carnes e aves";
  if (/fish|peixe|seafood|atum|salmao/.test(tag)) return "Peixes e frutos do mar";
  if (/dairy|leite|queijo|iogurte|whey/.test(tag)) return "Ovos e laticínios";
  if (/legume|feij|lentil|gr.o-de|soja/.test(tag)) return "Leguminosas";
  if (/vegetable|vegetal|verdura|legum/.test(tag)) return "Verduras e legumes";
  if (/nut|oleaginosa|seed|semente|castanha|amendoim|amend/.test(tag)) return "Oleaginosas e sementes";
  if (/oil|azeite|gordura|manteiga/.test(tag)) return "Óleos e gorduras";
  if (/sweet|doce|chocolate|sobremesa|candy/.test(tag)) return "Doces e sobremesas";
  if (/beverage|bebida|suco|juice|drink|ch.|caf/.test(tag)) return "Bebidas e sucos";
  if (/supplement|suplemento|protein|creatina/.test(tag)) return "Suplementos";
  return "Personalizado";
}

function kcalFromNutriments(n: OFFProduct["nutriments"]): number | null {
  if (!n) return null;
  if (n["energy-kcal_100g"] != null) return n["energy-kcal_100g"];
  if (n["energy_100g"] != null) return Math.round(n["energy_100g"] / 4.184);
  return null;
}

export async function searchOpenFoodFacts(
  query: string,
  signal?: AbortSignal
): Promise<FoodItem[]> {
  // Use v2 API — more reliable, supports CORS
  const params = new URLSearchParams({
    search_terms: query,
    fields: "product_name,product_name_pt,product_name_en,nutriments,categories_tags",
    page_size: "20",
    lc: "pt",
    cc: "br",
    sort_by: "unique_scans_n",
  });

  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/search?${params}`,
    { signal }
  );

  if (!res.ok) throw new Error(`OFF API ${res.status}`);

  const data: OFFSearchResponse = await res.json();
  const products = data.products ?? [];

  return products
    .map((p, i): FoodItem | null => {
      const n = p.nutriments;
      const kcal = kcalFromNutriments(n);
      if (kcal == null) return null;

      const name = (p.product_name_pt || p.product_name || p.product_name_en || "").trim();
      if (name.length < 2) return null;

      return {
        id: `off_${i}_${query}`,
        name,
        category: mapOFFCategory(p.categories_tags),
        kcal: Math.round(kcal * 10) / 10,
        protein: Math.round((n?.proteins_100g ?? 0) * 10) / 10,
        carbs: Math.round((n?.carbohydrates_100g ?? 0) * 10) / 10,
        fat: Math.round((n?.fat_100g ?? 0) * 10) / 10,
        fiber: n?.fiber_100g ? Math.round(n.fiber_100g * 10) / 10 : undefined,
      };
    })
    .filter((f): f is FoodItem => f !== null)
    .slice(0, 20);
}
