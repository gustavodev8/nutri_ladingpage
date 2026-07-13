import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const seedFiles = [
  path.join(root, "supabase/seeds/master_foods_seed.sql"),
  path.join(root, "supabase/seeds/master_foods_extra_seed.sql"),
  path.join(root, "supabase/seeds/master_foods_500_seed.sql"),
  path.join(root, "supabase/seeds/master_foods_500_more_seed.sql"),
];
const outPath = path.join(root, "supabase/seeds/master_foods_500_sports_seed.sql");

const normalize = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();

const escapeSql = (value) => String(value).replace(/'/g, "''");
const fmt = (value) => Number(value).toFixed(2);

const existingKeys = new Set();
for (const file of seedFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(/\(\s*'([^']+)'\s*,\s*'([^']+)'/g)) {
    existingKeys.add(match[2]);
  }
}

const proteins = [
  "Whey protein",
  "Whey isolado",
  "Caseína",
  "Albumina",
  "Iogurte grego",
  "Skyr",
  "Cottage",
  "Ricota",
  "Tofu firme",
  "Tempeh",
  "Peito de frango desfiado",
  "Atum em água",
];

const fruits = [
  "Banana",
  "Morango",
  "Mirtilo",
  "Maçã",
  "Manga",
  "Abacaxi",
  "Mamão",
  "Kiwi",
  "Laranja",
  "Uva",
  "Maracujá",
  "Açaí",
];

const dairyBases = [
  "Iogurte natural",
  "Iogurte proteico",
  "Iogurte grego",
  "Kefir",
  "Leite desnatado",
  "Leite sem lactose",
  "Skyr",
  "Creme de ricota light",
  "Cottage",
  "Coalhada",
  "Bebida láctea proteica",
  "Iogurte fermentado",
];

const seeds = [
  "Chia",
  "Linhaça",
  "Granola",
  "Gergelim",
  "Cacau nibs",
  "Psyllium",
  "Amêndoas",
  "Castanha de caju",
  "Castanha-do-pará",
  "Nozes",
  "Pasta de amendoim",
  "Coco ralado",
];

const carbs = [
  "Aveia",
  "Pão integral",
  "Batata-doce",
  "Arroz integral",
  "Tapioca",
  "Quinoa",
  "Granola sem açúcar",
  "Macarrão integral",
  "Mandioca",
  "Cuscuz",
  "Cream of rice",
  "Wrap integral",
];

const vegs = [
  "Rúcula",
  "Espinafre",
  "Alface",
  "Tomate",
  "Pepino",
  "Beterraba",
  "Brócolis",
  "Cenoura",
  "Abobrinha",
  "Couve",
  "Vagem",
  "Pimentão",
];

const hydros = [
  "Limão",
  "Maracujá",
  "Abacaxi",
  "Melancia",
  "Uva",
  "Maçã verde",
  "Gengibre",
  "Hortelã",
  "Coco",
  "Pepino",
  "Pitaya",
  "Tangerina",
];

const baseProfiles = {
  shake: { kcal: 96, protein: 12.5, carbs: 13.0, fat: 1.8, fiber: 1.6, category: "Bebida" },
  bowl: { kcal: 128, protein: 10.2, carbs: 15.5, fat: 4.2, fiber: 2.4, category: "Laticínio" },
  sandwich: { kcal: 176, protein: 13.0, carbs: 23.5, fat: 5.2, fiber: 3.3, category: "Cereais e derivados" },
  plate: { kcal: 184, protein: 17.8, carbs: 20.2, fat: 6.0, fiber: 3.1, category: "Proteína" },
  isotonic: { kcal: 42, protein: 0.5, carbs: 10.0, fat: 0.1, fiber: 0.0, category: "Bebida" },
};

const rows = [];
const rowKeys = new Set(existingKeys);

const addRow = (name, category, metrics, sourceCode) => {
  const key = normalize(name);
  if (rowKeys.has(key)) return false;
  rowKeys.add(key);
  rows.push({
    name,
    nameKey: key,
    category,
    kcal: metrics.kcal,
    protein: metrics.protein,
    carbs: metrics.carbs,
    fat: metrics.fat,
    fiber: metrics.fiber,
    source: "sports_focus",
    source_ref: "manual_batch_sports_1",
    source_code: sourceCode,
  });
  return true;
};

const tweak = (base, factor) => ({
  kcal: base.kcal * factor,
  protein: base.protein * factor,
  carbs: base.carbs * factor,
  fat: base.fat * Math.max(0.85, factor),
  fiber: base.fiber * Math.max(0.9, factor),
});

const makeSourceCode = (prefix, i, j) => `${prefix}-${String(i + 1).padStart(2, "0")}-${String(j + 1).padStart(2, "0")}`;

for (let i = 0; i < proteins.length && rows.length < 500; i += 1) {
  for (let j = 0; j < fruits.length && rows.length < 500; j += 1) {
    const factor = 1 + ((i + j) % 5) * 0.02;
    const name = `Shake de ${proteins[i]} com ${fruits[j]}`;
    addRow(name, baseProfiles.shake.category, tweak(baseProfiles.shake, factor), makeSourceCode("shk", i, j));
  }
}

for (let i = 0; i < dairyBases.length && rows.length < 500; i += 1) {
  for (let j = 0; j < fruits.length && rows.length < 500; j += 1) {
    const seed = seeds[(i + j) % seeds.length];
    const factor = 1 + ((i * 2 + j) % 6) * 0.015;
    const name = `Bowl de ${dairyBases[i]} com ${fruits[j]} e ${seed}`;
    addRow(name, baseProfiles.bowl.category, tweak(baseProfiles.bowl, factor), makeSourceCode("bwl", i, j));
  }
}

for (let i = 0; i < carbs.length && rows.length < 500; i += 1) {
  for (let j = 0; j < vegs.length && rows.length < 500; j += 1) {
    const protein = proteins[(i + j) % proteins.length];
    const factor = 1 + ((i + j) % 4) * 0.018;
    const name = `Sanduíche integral de ${proteins[(i + j) % proteins.length]} com ${vegs[j]}`;
    addRow(name, baseProfiles.sandwich.category, tweak(baseProfiles.sandwich, factor), makeSourceCode("snd", i, j));
  }
}

for (let i = 0; i < carbs.length && rows.length < 500; i += 1) {
  for (let j = 0; j < proteins.length && rows.length < 500; j += 1) {
    const veg = vegs[(i + j) % vegs.length];
    const factor = 1 + ((i * 3 + j) % 5) * 0.02;
    const name = `Prato pós-treino de ${carbs[i]} com ${proteins[j]} e ${veg}`;
    addRow(name, baseProfiles.plate.category, tweak(baseProfiles.plate, factor), makeSourceCode("plt", i, j));
  }
}

for (let i = 0; i < hydros.length && rows.length < 500; i += 1) {
  for (let j = 0; j < fruits.length && rows.length < 500; j += 1) {
    const accent = i % 2 === 0 ? "com sal marinho" : "com hortelã";
    const factor = 1 + ((i + j) % 3) * 0.012;
    const name = `Isotônico de ${hydros[i]} e ${fruits[j]} ${accent}`;
    addRow(name, baseProfiles.isotonic.category, tweak(baseProfiles.isotonic, factor), makeSourceCode("iso", i, j));
  }
}

if (rows.length < 500) {
  throw new Error(`Could only generate ${rows.length} rows, need 500.`);
}

const columns = [
  "name",
  "name_key",
  "category",
  "kcal_per_100g",
  "protein_per_100g",
  "carbs_per_100g",
  "fat_per_100g",
  "fiber_per_100g",
  "source",
  "source_ref",
  "source_code",
];

const valuesSql = rows.slice(0, 500).map(
  (row) => `(
  '${escapeSql(row.name)}',
  '${escapeSql(row.nameKey)}',
  '${escapeSql(row.category)}',
  ${fmt(row.kcal)},
  ${fmt(row.protein)},
  ${fmt(row.carbs)},
  ${fmt(row.fat)},
  ${fmt(row.fiber)},
  '${escapeSql(row.source)}',
  '${escapeSql(row.source_ref)}',
  '${escapeSql(row.source_code)}'
)`
);

const sql = [
  "-- Seed complementar com 500 alimentos adicionais focados em performance esportiva",
  "-- Fonte: combinações controladas de pré-treino, pós-treino, hidratação e recuperação",
  "BEGIN;",
  "",
  `INSERT INTO master_foods (${columns.join(", ")}) VALUES`,
  valuesSql.join(",\n"),
  "ON CONFLICT (name_key) DO NOTHING;",
  "",
  "COMMIT;",
  "",
].join("\n");

fs.writeFileSync(outPath, sql, "utf8");
console.log(`wrote ${outPath}`);
console.log(`rows: ${rows.slice(0, 500).length}`);
console.log(`unique candidates: ${rows.length}`);
