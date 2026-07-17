import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, ".env");
const OUTPUT_FILE = path.join(ROOT, "supabase/seeds/master_foods_1000_meat_seed.sql");

const SOURCE = "manual_expansion_7";
const SOURCE_REF = "meat_pool_1000";
const TARGET_ROWS = 1000;

const FAMILY_PROFILES = {
  bovine: { category: "Carnes e aves", kcal: 178, protein: 26.0, carbs: 0.0, fat: 8.2, fiber: 0.0 },
  pork: { category: "Carnes e aves", kcal: 212, protein: 23.0, carbs: 0.0, fat: 13.5, fiber: 0.0 },
  poultry: { category: "Carnes e aves", kcal: 154, protein: 24.0, carbs: 0.0, fat: 5.8, fiber: 0.0 },
  game: { category: "Carnes e aves", kcal: 148, protein: 24.0, carbs: 0.0, fat: 4.1, fiber: 0.0 },
  offal: { category: "Carnes e aves", kcal: 136, protein: 20.0, carbs: 0.0, fat: 5.6, fiber: 0.0 },
};

const FORM_RULES = [
  { suffix: "moído", factors: { kcal: 1.03, protein: 1.00, carbs: 1.00, fat: 1.05, fiber: 1.00 } },
  { suffix: "em cubos", factors: { kcal: 1.00, protein: 1.00, carbs: 1.00, fat: 1.00, fiber: 1.00 } },
  { suffix: "em tiras", factors: { kcal: 0.99, protein: 1.00, carbs: 1.00, fat: 0.99, fiber: 1.00 } },
  { suffix: "em bifes", factors: { kcal: 0.98, protein: 1.01, carbs: 1.00, fat: 0.98, fiber: 1.00 } },
  { suffix: "fatiado", factors: { kcal: 0.97, protein: 1.00, carbs: 1.00, fat: 0.97, fiber: 1.00 } },
  { suffix: "em medalhões", factors: { kcal: 0.99, protein: 1.01, carbs: 1.00, fat: 0.99, fiber: 1.00 } },
  { suffix: "desossado", factors: { kcal: 0.96, protein: 1.00, carbs: 1.00, fat: 0.95, fiber: 1.00 } },
];

const MEAT_BASES = [
  // Bovine
  ["Acém bovino", "bovine"],
  ["Alcatra bovina", "bovine"],
  ["Ancho bovino", "bovine"],
  ["Aranha bovina", "bovine"],
  ["Bife de chorizo bovino", "bovine"],
  ["Bife ancho bovino", "bovine"],
  ["Brisket bovino", "bovine"],
  ["Contrafilé bovino", "bovine"],
  ["Costela bovina", "bovine"],
  ["Cupim bovino", "bovine"],
  ["Coxão duro bovino", "bovine"],
  ["Coxão mole bovino", "bovine"],
  ["Filé mignon bovino", "bovine"],
  ["Flat iron bovino", "bovine"],
  ["Fraldinha bovina", "bovine"],
  ["Hanger steak bovino", "bovine"],
  ["Lagarto bovino", "bovine"],
  ["Maminha bovina", "bovine"],
  ["Músculo bovino", "bovine"],
  ["Ossobuco bovino", "bovine"],
  ["Paleta bovina", "bovine"],
  ["Patinho bovino", "bovine"],
  ["Peito bovino", "bovine"],
  ["Picanha bovina", "bovine"],
  ["Ponta de agulha bovina", "bovine"],
  ["Ponta de peito bovina", "bovine"],
  ["Prime rib bovino", "bovine"],
  ["Rabada bovina", "bovine"],
  ["Rabo bovino", "bovine"],
  ["Round bovino", "bovine"],
  ["Rump bovino", "bovine"],
  ["Sirloin bovino", "bovine"],
  ["Skirt bovino", "bovine"],
  ["Short rib bovino", "bovine"],
  ["Shank bovino", "bovine"],
  ["T-bone bovino", "bovine"],
  ["Tenderloin bovino", "bovine"],
  ["Top round bovino", "bovine"],
  ["Top sirloin bovino", "bovine"],
  ["Tri-tip bovino", "bovine"],
  ["Bottom round bovino", "bovine"],
  ["Eye of round bovino", "bovine"],
  ["Chuck bovino", "bovine"],
  ["Chuck eye bovino", "bovine"],
  ["Flank bovino", "bovine"],
  ["Peito de costela bovino", "bovine"],
  ["Mocotó bovino", "bovine"],
  ["Língua bovina", "bovine"],
  ["Carne de panela bovina", "bovine"],
  ["Ponta de fraldão bovina", "bovine"],
  ["Bola de alcatra bovina", "bovine"],
  ["Mole bovina", "bovine"],
  ["Mignon suíço bovino", "bovine"],
  ["Ponta de contrafilé bovina", "bovine"],
  ["Bochecha bovina", "bovine"],
  ["Pescoço bovino", "bovine"],
  ["Manta bovina", "bovine"],
  ["Costelão bovino", "bovine"],
  ["Carne bovina da coxa mole", "bovine"],

  // Pork
  ["Barriga suína", "pork"],
  ["Bochecha suína", "pork"],
  ["Carré suíno", "pork"],
  ["Carré de porco", "pork"],
  ["Copa lombo suína", "pork"],
  ["Costela suína", "pork"],
  ["Costelinha suína", "pork"],
  ["Filé mignon suíno", "pork"],
  ["Joelho suíno", "pork"],
  ["Joelho de porco", "pork"],
  ["Lombo suíno", "pork"],
  ["Lombo de porco", "pork"],
  ["Língua suína", "pork"],
  ["Ombro suíno", "pork"],
  ["Papada suína", "pork"],
  ["Paleta suína", "pork"],
  ["Pancetta suína", "pork"],
  ["Pé suíno", "pork"],
  ["Pernil suíno", "pork"],
  ["Pernil de porco", "pork"],
  ["Peito suíno", "pork"],
  ["Porco assado de corte", "pork"],
  ["Rabo suíno", "pork"],
  ["Rins suínos", "pork"],
  ["Fígado suíno", "pork"],
  ["Coração suíno", "pork"],
  ["Toucinho suíno", "pork"],
  ["Torresmo suíno", "pork"],
  ["Barriga de porco", "pork"],
  ["Bisteca suína", "pork"],
  ["Copa de porco", "pork"],
  ["Lombo canadense", "pork"],
  ["Costela de porco", "pork"],
  ["Orelha suína", "pork"],
  ["Focinho suíno", "pork"],
  ["Carne suína magra", "pork"],
  ["Costela carolina suína", "pork"],
  ["Bochecha de porco", "pork"],
  ["Músculo suíno", "pork"],
  ["Pé de porco", "pork"],
  ["Manta suína", "pork"],
  ["Barrigada suína", "pork"],
  ["Carcaça suína", "pork"],
  ["Costelão suíno", "pork"],
  ["Mocotó suíno", "pork"],
  ["Rabo de porco", "pork"],
  ["Língua de porco", "pork"],
  ["Pernil traseiro suíno", "pork"],
  ["Pernil dianteiro suíno", "pork"],
  ["Paleta de porco", "pork"],
  ["Lombo fresco suíno", "pork"],
  ["Filé suíno", "pork"],

  // Poultry
  ["Peito de frango", "poultry"],
  ["Filé de frango", "poultry"],
  ["Coxa de frango", "poultry"],
  ["Sobrecoxa de frango", "poultry"],
  ["Asa de frango", "poultry"],
  ["Drumette de frango", "poultry"],
  ["Frango inteiro", "poultry"],
  ["Frango caipira", "poultry"],
  ["Galinha caipira", "poultry"],
  ["Galinha inteira", "poultry"],
  ["Carcaça de frango", "poultry"],
  ["Pescoço de frango", "poultry"],
  ["Pele de frango", "poultry"],
  ["Fígado de frango", "poultry"],
  ["Coração de frango", "poultry"],
  ["Moela de frango", "poultry"],
  ["Miúdos de frango", "poultry"],
  ["Peito de peru", "poultry"],
  ["Coxa de peru", "poultry"],
  ["Sobrecoxa de peru", "poultry"],
  ["Peru inteiro", "poultry"],
  ["Carcaça de peru", "poultry"],
  ["Fígado de peru", "poultry"],
  ["Coração de peru", "poultry"],
  ["Moela de peru", "poultry"],
  ["Codorna inteira", "poultry"],
  ["Pintada inteira", "poultry"],
  ["Perdiz inteira", "poultry"],
  ["Faisão inteiro", "poultry"],
  ["Pato inteiro", "poultry"],
  ["Peito de pato", "poultry"],
  ["Coxa de pato", "poultry"],
  ["Magret de pato", "poultry"],
  ["Ganso inteiro", "poultry"],
  ["Galinha-d'angola", "poultry"],
  ["Frango orgânico", "poultry"],
  ["Frango livre de confinamento", "poultry"],
  ["Peito de frango desossado", "poultry"],
  ["Sobrecoxa de frango desossada", "poultry"],
  ["Coxa de frango sem pele", "poultry"],
  ["Asa de frango sem pele", "poultry"],

  // Game / lamb / goat / rabbit
  ["Carne de cordeiro", "game"],
  ["Perna de cordeiro", "game"],
  ["Paleta de cordeiro", "game"],
  ["Carré de cordeiro", "game"],
  ["Costela de cordeiro", "game"],
  ["Lombo de cordeiro", "game"],
  ["Pescoço de cordeiro", "game"],
  ["Filé de cordeiro", "game"],
  ["Carne de cabrito", "game"],
  ["Perna de cabrito", "game"],
  ["Paleta de cabrito", "game"],
  ["Carré de cabrito", "game"],
  ["Costela de cabrito", "game"],
  ["Lombo de cabrito", "game"],
  ["Pescoço de cabrito", "game"],
  ["Vitela", "game"],
  ["Filé de vitela", "game"],
  ["Costeleta de vitela", "game"],
  ["Perna de vitela", "game"],
  ["Coelho inteiro", "game"],
  ["Lombo de coelho", "game"],
  ["Perna de coelho", "game"],
  ["Paleta de coelho", "game"],
  ["Javali", "game"],
  ["Perna de javali", "game"],
  ["Lombo de javali", "game"],
  ["Peito de javali", "game"],
  ["Cervo", "game"],
  ["Filé de cervo", "game"],
  ["Perna de cervo", "game"],
  ["Lombo de cervo", "game"],
  ["Búfalo", "game"],
  ["Avestruz", "game"],
  ["Canguru", "game"],
  ["Alce", "game"],
  ["Rena", "game"],
  ["Faisão", "game"],
  ["Perdiz", "game"],
  ["Codorna", "game"],
  ["Javali selvagem", "game"],
  ["Carne de caça", "game"],

  // Offal
  ["Fígado bovino", "offal"],
  ["Coração bovino", "offal"],
  ["Rins bovinos", "offal"],
  ["Língua bovina", "offal"],
  ["Cérebro bovino", "offal"],
  ["Baço bovino", "offal"],
  ["Pulmão bovino", "offal"],
  ["Timo bovino", "offal"],
  ["Tripa bovina", "offal"],
  ["Mocotó bovino", "offal"],
  ["Tendão bovino", "offal"],
  ["Fígado suíno", "offal"],
  ["Coração suíno", "offal"],
  ["Rins suínos", "offal"],
  ["Língua suína", "offal"],
  ["Tripa suína", "offal"],
  ["Fígado de frango", "offal"],
  ["Coração de frango", "offal"],
  ["Moela de frango", "offal"],
  ["Pescoço de frango", "offal"],
  ["Fígado de peru", "offal"],
  ["Coração de peru", "offal"],
  ["Moela de peru", "offal"],
  ["Fígado de pato", "offal"],
  ["Coração de pato", "offal"],
  ["Moela de pato", "offal"],
  ["Fígado de cordeiro", "offal"],
  ["Coração de cordeiro", "offal"],
  ["Rins de cordeiro", "offal"],
  ["Fígado de cabrito", "offal"],
  ["Coração de cabrito", "offal"],
  ["Rins de cabrito", "offal"],
  ["Tripa de boi", "offal"],
  ["Pé suíno", "offal"],
  ["Orelha suína", "offal"],
  ["Focinho suíno", "offal"],
  ["Rabo suíno", "offal"],
  ["Fígado de coelho", "offal"],
  ["Coração de coelho", "offal"],
  ["Rins de coelho", "offal"],
  ["Fígado de javali", "offal"],
  ["Coração de javali", "offal"],
  ["Rins de javali", "offal"],
  ["Fígado de avestruz", "offal"],
  ["Coração de avestruz", "offal"],
  ["Fígado de búfalo", "offal"],
  ["Coração de búfalo", "offal"],
  ["Miúdos bovinos", "offal"],
  ["Miúdos suínos", "offal"],
];

function readEnvValue(key) {
  const text = fs.readFileSync(ENV_PATH, "utf8");
  const line = text.split(/\r?\n/).find((entry) => entry.startsWith(key));
  if (!line) return "";
  return line.replace(new RegExp(`^${key}[=+]?`), "").trim();
}

function stripLeadingNoise(value) {
  return String(value).replace(/^[^A-Za-z0-9_-]+/, "").trim();
}

function normalizeKey(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function escapeSql(value) {
  return String(value).replace(/'/g, "''");
}

function sqlValue(value) {
  return `'${escapeSql(value)}'`;
}

function titleize(value) {
  const smallWords = new Set(["de", "da", "do", "das", "dos", "e", "em", "com", "sem", "a", "o"]);
  return String(value)
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && smallWords.has(lower)) return lower;
      return lower
        .split("-")
        .map((part) => {
          if (!part) return part;
          if (part === "d'angola") return "d'Angola";
          return part.charAt(0).toUpperCase() + part.slice(1);
        })
        .join("-");
    })
    .join(" ");
}

function hashRatio(input, salt) {
  const digest = createHash("sha256").update(`${salt}:${input}`).digest();
  return digest.readUInt32BE(0) / 0xffffffff;
}

function jitter(value, name, salt, spread = 0.12) {
  const ratio = 1 - spread / 2 + hashRatio(name, salt) * spread;
  return value * ratio;
}

function loadExistingNameKeys(supabase) {
  return (async () => {
    const keys = new Set();
    let from = 0;
    const pageSize = 1000;

    for (;;) {
      const { data, error } = await supabase
        .from("master_foods")
        .select("name,name_key")
        .order("id", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) throw error;

      for (const row of data ?? []) {
        const key = row.name_key || normalizeKey(row.name || "");
        if (key) keys.add(key);
      }

      if (!data || data.length < pageSize) break;
      from += pageSize;
    }

    return keys;
  })();
}

function buildMetrics(family, form, name) {
  const profile = FAMILY_PROFILES[family];
  return {
    kcal: Math.max(0, jitter(profile.kcal * form.factors.kcal, name, "kcal")),
    protein: Math.max(0, jitter(profile.protein * form.factors.protein, name, "protein")),
    carbs: Math.max(0, jitter(profile.carbs * form.factors.carbs, name, "carbs")),
    fat: Math.max(0, jitter(profile.fat * form.factors.fat, name, "fat")),
    fiber: Math.max(0, jitter(profile.fiber * form.factors.fiber, name, "fiber")),
  };
}

async function main() {
  const supabaseUrl = readEnvValue("VITE_SUPABASE_URL");
  const supabaseKey = stripLeadingNoise(readEnvValue("VITE_SUPABASE_SERVICE_KEY"));

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Não foi possível ler VITE_SUPABASE_URL ou VITE_SUPABASE_SERVICE_KEY no .env");
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const existingKeys = await loadExistingNameKeys(supabase);
  const generatedKeys = new Set();
  const rows = [];

  for (let i = 0; i < MEAT_BASES.length && rows.length < TARGET_ROWS; i += 1) {
    const [baseName, family] = MEAT_BASES[i];
    const cleanName = titleize(baseName);

    for (let j = 0; j < FORM_RULES.length && rows.length < TARGET_ROWS; j += 1) {
      const form = FORM_RULES[j];
      const name = titleize(`${cleanName} ${form.suffix}`);
      const nameKey = normalizeKey(name);
      if (existingKeys.has(nameKey) || generatedKeys.has(nameKey)) continue;

      const metrics = buildMetrics(family, form, name);
      rows.push({
        name,
        nameKey,
        category: FAMILY_PROFILES[family].category,
        kcal: metrics.kcal,
        protein: metrics.protein,
        carbs: metrics.carbs,
        fat: metrics.fat,
        fiber: metrics.fiber,
        source: SOURCE,
        sourceRef: "manual_meat_pool",
        sourceCode: `${family.toUpperCase()}-${String(i + 1).padStart(3, "0")}-${String(j + 1).padStart(2, "0")}`,
      });
      generatedKeys.add(nameKey);
    }
  }

  if (rows.length < TARGET_ROWS) {
    throw new Error(`Só foram gerados ${rows.length} itens únicos; adicione mais bases de carne.`);
  }

  rows.sort((a, b) => {
    const cat = a.category.localeCompare(b.category, "pt-BR");
    if (cat !== 0) return cat;
    return a.name.localeCompare(b.name, "pt-BR");
  });

  const sql = [];
  sql.push("-- Seed complementar com 1000 alimentos de carne e derivados");
  sql.push("-- Cortes bovinos, suínos, aves, caça e miúdos, sem repetir o catálogo atual");
  sql.push(`-- Total de novos itens: ${rows.length}`);
  sql.push("");
  sql.push("BEGIN;");
  sql.push("");
  sql.push("INSERT INTO master_foods (name, name_key, category, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, source, source_ref, source_code) VALUES");

  rows.forEach((row, index) => {
    const comma = index === rows.length - 1 ? "" : ",";
    sql.push(
      `(${sqlValue(row.name)}, ${sqlValue(row.nameKey)}, ${sqlValue(row.category)}, ${row.kcal.toFixed(2)}, ${row.protein.toFixed(2)}, ${row.carbs.toFixed(2)}, ${row.fat.toFixed(2)}, ${row.fiber.toFixed(2)}, ${sqlValue(row.source)}, ${sqlValue(row.sourceRef)}, ${sqlValue(row.sourceCode)})${comma}`
    );
  });

  sql.push("ON CONFLICT (name_key) DO NOTHING;");
  sql.push("");
  sql.push("COMMIT;");
  sql.push("");

  fs.writeFileSync(OUTPUT_FILE, sql.join("\n"), "utf8");

  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const { error } = await supabase.from("master_foods").insert(
      batch.map((row) => ({
        name: row.name,
        name_key: row.nameKey,
        category: row.category,
        kcal_per_100g: row.kcal,
        protein_per_100g: row.protein,
        carbs_per_100g: row.carbs,
        fat_per_100g: row.fat,
        fiber_per_100g: row.fiber,
        source: row.source,
        source_ref: row.sourceRef,
        source_code: row.sourceCode,
      }))
    );

    if (error) throw error;
  }

  console.log(`Generated ${rows.length} rows at ${OUTPUT_FILE}`);
  console.log(`Inserted ${rows.length} rows into master_foods`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
