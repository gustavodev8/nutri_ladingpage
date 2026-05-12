import type { FoodItem } from "./foodDatabase";

interface OFFProduct {
  product_name?: string;
  product_name_pt?: string;
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
  products: OFFProduct[];
  count: number;
}

function mapOFFCategory(tags?: string[]): string {
  if (!tags) return "Personalizado";
  const tag = tags.join(" ");
  if (/fruit|fruta/.test(tag)) return "Frutas";
  if (/cereal|grain|arroz|trigo|aveia|milho/.test(tag)) return "Cereais e derivados";
  if (/bread|p.o|biscoito|bolo|massa/.test(tag)) return "Pães, bolos e biscoitos";
  if (/meat|carne|frango|aves|suino|bovino/.test(tag)) return "Carnes e aves";
  if (/fish|peixe|seafood|fruto/.test(tag)) return "Peixes e frutos do mar";
  if (/dairy|leite|queijo|iogurte|ovo/.test(tag)) return "Ovos e laticínios";
  if (/legume|feij.o|lentil|gr.o-de/.test(tag)) return "Leguminosas";
  if (/vegetable|vegetal|verdura|legum/.test(tag)) return "Verduras e legumes";
  if (/nut|oleaginosa|seed|semente|castanha/.test(tag)) return "Oleaginosas e sementes";
  if (/oil|azeite|gordura|manteiga/.test(tag)) return "Óleos e gorduras";
  if (/sweet|doce|chocolate|sobremesa/.test(tag)) return "Doces e sobremesas";
  if (/beverage|bebida|suco|juice|drink/.test(tag)) return "Bebidas e sucos";
  if (/supplement|suplemento|protein|whey/.test(tag)) return "Suplementos";
  return "Personalizado";
}

export async function searchOpenFoodFacts(
  query: string,
  signal?: AbortSignal
): Promise<FoodItem[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "15",
    fields: "product_name,product_name_pt,nutriments,categories_tags",
    lc: "pt",
    cc: "br",
  });

  const res = await fetch(
    `https://world.openfoodfacts.org/cgi/search.pl?${params}`,
    { signal }
  );

  if (!res.ok) throw new Error(`OFF API error: ${res.status}`);

  const data: OFFSearchResponse = await res.json();

  return data.products
    .filter((p) => {
      const n = p.nutriments;
      if (!n) return false;
      const kcal = n["energy-kcal_100g"] ?? (n["energy_100g"] ? n["energy_100g"] / 4.184 : null);
      return (
        kcal != null &&
        n.proteins_100g != null &&
        n.carbohydrates_100g != null &&
        n.fat_100g != null
      );
    })
    .map((p, i): FoodItem => {
      const n = p.nutriments!;
      const kcal = n["energy-kcal_100g"] ?? Math.round((n["energy_100g"] ?? 0) / 4.184);
      const name = p.product_name_pt || p.product_name || "Alimento";
      return {
        id: `off_${i}_${Date.now()}`,
        name: name.trim(),
        category: mapOFFCategory(p.categories_tags),
        kcal: Math.round(kcal * 10) / 10,
        protein: Math.round((n.proteins_100g ?? 0) * 10) / 10,
        carbs: Math.round((n.carbohydrates_100g ?? 0) * 10) / 10,
        fat: Math.round((n.fat_100g ?? 0) * 10) / 10,
        fiber: n.fiber_100g ? Math.round(n.fiber_100g * 10) / 10 : undefined,
      };
    })
    .filter((f) => f.name.length > 1)
    .slice(0, 12);
}
