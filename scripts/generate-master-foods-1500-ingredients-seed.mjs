import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, ".env");
const CSV_PATH = path.join(ROOT, "alimentos.csv");
const OUTPUT_FILE = path.join(ROOT, "supabase/seeds/master_foods_1500_ingredients_seed.sql");

const SOURCE = "manual_expansion_6";
const SOURCE_REF = "ingredient_mix_1500";
const TARGET_ROWS = 1500;

const FAMILY_PROFILES = {
  spice: { category: "Vegetal", kcal: 28, protein: 1.2, carbs: 5.6, fat: 0.6, fiber: 2.3 },
  veg: { category: "Vegetal", kcal: 31, protein: 1.6, carbs: 5.2, fat: 0.3, fiber: 2.4 },
  fruit: { category: "Fruta", kcal: 58, protein: 0.8, carbs: 14.5, fat: 0.2, fiber: 2.1 },
  grain: { category: "Cereais e derivados", kcal: 123, protein: 3.3, carbs: 25.8, fat: 1.2, fiber: 2.7 },
  legume: { category: "Leguminosa", kcal: 134, protein: 8.8, carbs: 20.7, fat: 2.1, fiber: 5.6 },
  seed: { category: "Oleaginosas e sementes", kcal: 570, protein: 18.0, carbs: 15.0, fat: 48.0, fiber: 7.0 },
};

const FAMILY_FORMS = {
  spice: [
    { prefix: "pó de", factors: { kcal: 1.00, protein: 1.00, carbs: 1.00, fat: 1.00, fiber: 0.96 } },
    { prefix: "folha de", factors: { kcal: 0.92, protein: 1.00, carbs: 0.96, fat: 0.96, fiber: 1.04 } },
    { prefix: "semente de", factors: { kcal: 1.04, protein: 1.02, carbs: 1.00, fat: 1.03, fiber: 1.00 } },
    { prefix: "raiz de", factors: { kcal: 0.96, protein: 0.98, carbs: 0.98, fat: 0.98, fiber: 1.00 } },
    { prefix: "casca de", factors: { kcal: 0.90, protein: 0.96, carbs: 0.92, fat: 0.92, fiber: 1.06 } },
    { prefix: "extrato de", factors: { kcal: 0.85, protein: 0.96, carbs: 0.88, fat: 0.90, fiber: 0.92 } },
    { prefix: "infusão de", factors: { kcal: 0.70, protein: 0.95, carbs: 0.75, fat: 0.75, fiber: 0.80 } },
    { prefix: "óleo de", factors: { kcal: 1.18, protein: 1.00, carbs: 0.92, fat: 1.35, fiber: 0.70 } },
    { prefix: "pasta de", factors: { kcal: 1.10, protein: 1.02, carbs: 1.00, fat: 1.12, fiber: 1.00 } },
    { prefix: "chá de", factors: { kcal: 0.68, protein: 0.95, carbs: 0.72, fat: 0.72, fiber: 0.78 } },
    { prefix: "blend de", factors: { kcal: 1.02, protein: 1.00, carbs: 0.98, fat: 0.98, fiber: 0.98 } },
  ],
  veg: [
    { prefix: "folha de", factors: { kcal: 0.90, protein: 1.00, carbs: 0.92, fat: 0.92, fiber: 1.06 } },
    { prefix: "broto de", factors: { kcal: 0.88, protein: 1.02, carbs: 0.90, fat: 0.90, fiber: 1.00 } },
    { prefix: "raiz de", factors: { kcal: 0.96, protein: 0.98, carbs: 0.98, fat: 0.96, fiber: 1.02 } },
    { prefix: "talo de", factors: { kcal: 0.92, protein: 0.98, carbs: 0.94, fat: 0.92, fiber: 1.00 } },
    { prefix: "flor de", factors: { kcal: 0.90, protein: 0.96, carbs: 0.90, fat: 0.92, fiber: 1.00 } },
    { prefix: "casca de", factors: { kcal: 0.88, protein: 0.96, carbs: 0.90, fat: 0.90, fiber: 1.04 } },
    { prefix: "pó de", factors: { kcal: 0.94, protein: 0.98, carbs: 0.92, fat: 0.92, fiber: 0.96 } },
    { prefix: "extrato de", factors: { kcal: 0.84, protein: 0.96, carbs: 0.86, fat: 0.88, fiber: 0.90 } },
    { prefix: "polpa de", factors: { kcal: 0.96, protein: 0.98, carbs: 0.98, fat: 0.96, fiber: 0.92 } },
    { prefix: "creme de", factors: { kcal: 1.03, protein: 1.00, carbs: 0.98, fat: 1.06, fiber: 0.96 } },
    { prefix: "caldo de", factors: { kcal: 0.82, protein: 0.96, carbs: 0.84, fat: 0.84, fiber: 0.86 } },
  ],
  fruit: [
    { prefix: "polpa de", factors: { kcal: 1.00, protein: 0.98, carbs: 1.02, fat: 0.98, fiber: 0.92 } },
    { prefix: "casca de", factors: { kcal: 0.88, protein: 0.96, carbs: 0.90, fat: 0.90, fiber: 1.12 } },
    { prefix: "semente de", factors: { kcal: 1.05, protein: 0.98, carbs: 0.96, fat: 1.00, fiber: 1.04 } },
    { prefix: "purê de", factors: { kcal: 1.02, protein: 0.98, carbs: 1.04, fat: 0.98, fiber: 0.88 } },
    { prefix: "concentrado de", factors: { kcal: 1.12, protein: 0.96, carbs: 1.14, fat: 0.96, fiber: 0.82 } },
    { prefix: "suco de", factors: { kcal: 0.82, protein: 0.96, carbs: 0.88, fat: 0.88, fiber: 0.40 } },
    { prefix: "extrato de", factors: { kcal: 0.86, protein: 0.96, carbs: 0.90, fat: 0.88, fiber: 0.86 } },
    { prefix: "geleia de", factors: { kcal: 1.18, protein: 0.95, carbs: 1.20, fat: 0.92, fiber: 0.74 } },
    { prefix: "redução de", factors: { kcal: 1.10, protein: 0.95, carbs: 1.10, fat: 0.92, fiber: 0.76 } },
    { prefix: "compota de", factors: { kcal: 1.16, protein: 0.95, carbs: 1.16, fat: 0.92, fiber: 0.78 } },
    { prefix: "néctar de", factors: { kcal: 0.90, protein: 0.96, carbs: 0.92, fat: 0.90, fiber: 0.62 } },
  ],
  grain: [
    { prefix: "farinha de", factors: { kcal: 1.05, protein: 1.00, carbs: 1.06, fat: 0.98, fiber: 0.92 } },
    { prefix: "flocos de", factors: { kcal: 1.00, protein: 1.00, carbs: 1.00, fat: 1.00, fiber: 1.04 } },
    { prefix: "farelo de", factors: { kcal: 0.96, protein: 1.02, carbs: 0.90, fat: 0.92, fiber: 1.24 } },
    { prefix: "grão de", factors: { kcal: 0.98, protein: 1.02, carbs: 0.96, fat: 0.96, fiber: 1.00 } },
    { prefix: "pasta de", factors: { kcal: 1.08, protein: 1.00, carbs: 1.02, fat: 1.04, fiber: 0.90 } },
    { prefix: "creme de", factors: { kcal: 1.04, protein: 0.98, carbs: 1.00, fat: 1.02, fiber: 0.88 } },
    { prefix: "massa de", factors: { kcal: 1.06, protein: 1.00, carbs: 1.08, fat: 0.98, fiber: 0.90 } },
    { prefix: "mix de", factors: { kcal: 1.02, protein: 1.00, carbs: 1.00, fat: 1.00, fiber: 1.00 } },
    { prefix: "extrato de", factors: { kcal: 0.88, protein: 0.96, carbs: 0.90, fat: 0.90, fiber: 0.86 } },
    { prefix: "migalhas de", factors: { kcal: 0.94, protein: 0.98, carbs: 0.94, fat: 0.94, fiber: 0.92 } },
    { prefix: "brotos de", factors: { kcal: 0.90, protein: 1.00, carbs: 0.90, fat: 0.90, fiber: 1.04 } },
  ],
  legume: [
    { prefix: "grão de", factors: { kcal: 0.98, protein: 1.02, carbs: 0.96, fat: 0.96, fiber: 1.00 } },
    { prefix: "farinha de", factors: { kcal: 1.04, protein: 1.00, carbs: 1.04, fat: 0.98, fiber: 0.94 } },
    { prefix: "pasta de", factors: { kcal: 1.06, protein: 1.00, carbs: 1.00, fat: 1.02, fiber: 0.94 } },
    { prefix: "creme de", factors: { kcal: 1.02, protein: 0.98, carbs: 0.98, fat: 1.00, fiber: 0.90 } },
    { prefix: "brotos de", factors: { kcal: 0.92, protein: 1.00, carbs: 0.92, fat: 0.92, fiber: 1.04 } },
    { prefix: "farofa de", factors: { kcal: 1.08, protein: 0.98, carbs: 1.06, fat: 1.00, fiber: 0.90 } },
    { prefix: "purê de", factors: { kcal: 1.00, protein: 0.98, carbs: 0.96, fat: 0.98, fiber: 0.90 } },
    { prefix: "mix de", factors: { kcal: 1.02, protein: 1.00, carbs: 0.98, fat: 1.00, fiber: 0.98 } },
    { prefix: "extrato de", factors: { kcal: 0.86, protein: 0.96, carbs: 0.88, fat: 0.88, fiber: 0.86 } },
    { prefix: "base de", factors: { kcal: 1.00, protein: 1.00, carbs: 1.00, fat: 1.00, fiber: 1.00 } },
    { prefix: "salada de", factors: { kcal: 0.94, protein: 0.98, carbs: 0.92, fat: 0.92, fiber: 1.00 } },
  ],
  seed: [
    { prefix: "semente de", factors: { kcal: 1.00, protein: 1.00, carbs: 1.00, fat: 1.00, fiber: 1.00 } },
    { prefix: "farinha de", factors: { kcal: 1.04, protein: 0.98, carbs: 1.02, fat: 0.98, fiber: 0.92 } },
    { prefix: "pasta de", factors: { kcal: 1.08, protein: 1.00, carbs: 1.00, fat: 1.08, fiber: 0.90 } },
    { prefix: "creme de", factors: { kcal: 1.06, protein: 0.98, carbs: 0.98, fat: 1.06, fiber: 0.88 } },
    { prefix: "óleo de", factors: { kcal: 1.18, protein: 0.96, carbs: 0.90, fat: 1.35, fiber: 0.70 } },
    { prefix: "manteiga de", factors: { kcal: 1.16, protein: 0.98, carbs: 0.92, fat: 1.28, fiber: 0.80 } },
    { prefix: "mix de", factors: { kcal: 1.02, protein: 1.00, carbs: 1.00, fat: 1.00, fiber: 1.00 } },
    { prefix: "granulado de", factors: { kcal: 1.00, protein: 1.00, carbs: 1.00, fat: 1.00, fiber: 1.00 } },
    { prefix: "extrato de", factors: { kcal: 0.88, protein: 0.96, carbs: 0.88, fat: 0.90, fiber: 0.84 } },
    { prefix: "bebida de", factors: { kcal: 0.82, protein: 0.96, carbs: 0.84, fat: 0.82, fiber: 0.70 } },
    { prefix: "leite de", factors: { kcal: 0.88, protein: 0.96, carbs: 0.90, fat: 0.86, fiber: 0.72 } },
  ],
};

const MANUAL_BASES = [
  // spices / herbs
  ["manjericão", "spice"], ["orégano", "spice"], ["tomilho", "spice"], ["alecrim", "spice"],
  ["sálvia", "spice"], ["hortelã", "spice"], ["coentro", "spice"], ["salsinha", "spice"],
  ["cebolinha", "spice"], ["alho", "spice"], ["cebola", "spice"], ["alho-poró", "spice"],
  ["gengibre", "spice"], ["cúrcuma", "spice"], ["cominho", "spice"], ["páprica", "spice"],
  ["pimenta-do-reino", "spice"], ["noz-moscada", "spice"], ["cardamomo", "spice"], ["cravo-da-índia", "spice"],
  ["canela", "spice"], ["anis-estrelado", "spice"], ["feno-grego", "spice"], ["sumac", "spice"],
  ["zaatar", "spice"], ["funcho", "spice"], ["erva-doce", "spice"], ["capim-limão", "spice"],
  ["louro", "spice"], ["manjerona", "spice"], ["estragão", "spice"], ["dill", "spice"],
  ["pimenta calabresa", "spice"], ["pimenta caiena", "spice"], ["pimenta jalapeño", "spice"],
  ["pimenta biquinho", "spice"], ["pimenta síria", "spice"], ["mostarda em grão", "spice"],
  ["raiz-forte", "spice"], ["wasabi", "spice"],

  // vegetables / greens
  ["abobrinha", "veg"], ["abóbora cabotiá", "veg"], ["abóbora moranga", "veg"], ["abóbora japonesa", "veg"],
  ["berinjela", "veg"], ["brócolis", "veg"], ["couve-flor", "veg"], ["espinafre", "veg"],
  ["acelga", "veg"], ["agrião", "veg"], ["alface americana", "veg"], ["alface crespa", "veg"],
  ["alface roxa", "veg"], ["rúcula", "veg"], ["repolho roxo", "veg"], ["cenoura", "veg"],
  ["beterraba", "veg"], ["chuchu", "veg"], ["vagem", "veg"], ["aspargos", "veg"],
  ["pepino", "veg"], ["quiabo", "veg"], ["palmito", "veg"], ["jiló", "veg"],
  ["nabo", "veg"], ["rabanete", "veg"], ["aipo", "veg"], ["salsão", "veg"],
  ["endívia", "veg"], ["escarola", "veg"], ["chicória", "veg"], ["couve manteiga", "veg"],
  ["couve kale", "veg"], ["couve de bruxelas", "veg"], ["cogumelo paris", "veg"], ["shimeji", "veg"],
  ["shiitake", "veg"], ["portobello", "veg"], ["maxixe", "veg"], ["tomate", "veg"],
  ["tomate-cereja", "veg"], ["pimentão amarelo", "veg"], ["pimentão vermelho", "veg"], ["alcachofra", "veg"],

  // fruits
  ["banana", "fruit"], ["manga", "fruit"], ["maçã", "fruit"], ["pera", "fruit"],
  ["uva", "fruit"], ["morango", "fruit"], ["framboesa", "fruit"], ["amora", "fruit"],
  ["mirtilo", "fruit"], ["abacaxi", "fruit"], ["laranja", "fruit"], ["limão", "fruit"],
  ["tangerina", "fruit"], ["caju", "fruit"], ["goiaba", "fruit"], ["maracujá", "fruit"],
  ["graviola", "fruit"], ["acerola", "fruit"], ["pitaya", "fruit"], ["abacate", "fruit"],
  ["mamão", "fruit"], ["pêssego", "fruit"], ["nectarina", "fruit"], ["damasco", "fruit"],
  ["ameixa", "fruit"], ["kiwi", "fruit"], ["melancia", "fruit"], ["melão", "fruit"],
  ["romã", "fruit"], ["jabuticaba", "fruit"], ["carambola", "fruit"], ["siriguela", "fruit"],
  ["caqui", "fruit"], ["coco", "fruit"], ["figo", "fruit"], ["lichia", "fruit"],
  ["cupuaçu", "fruit"], ["umbu", "fruit"], ["pitanga", "fruit"], ["jambo", "fruit"],
  ["tamarindo", "fruit"], ["physalis", "fruit"], ["longan", "fruit"], ["araçá", "fruit"],

  // grains / starches / legumes
  ["arroz", "grain"], ["arroz integral", "grain"], ["arroz negro", "grain"], ["arroz vermelho", "grain"],
  ["aveia", "grain"], ["amaranto", "grain"], ["cevada", "grain"], ["bulgur", "grain"],
  ["cuscuz marroquino", "grain"], ["milho", "grain"], ["fubá", "grain"], ["polenta", "grain"],
  ["tapioca", "grain"], ["mandioca", "grain"], ["mandioquinha", "grain"], ["inhame", "grain"],
  ["cará", "grain"], ["batata-doce", "grain"], ["trigo", "grain"], ["trigo sarraceno", "grain"],
  ["centeio", "grain"], ["quinoa", "grain"], ["painço", "grain"], ["sêmola", "grain"],
  ["farro", "grain"], ["espelta", "grain"], ["kamut", "grain"], ["teff", "grain"],
  ["sorgo", "grain"], ["milheto", "grain"], ["arroz arbóreo", "grain"], ["arroz selvagem", "grain"],
  ["cuscuz de milho", "grain"], ["massa de grão duro", "grain"], ["polvilho", "grain"], ["fécula de batata", "grain"],
  ["farinha de arroz", "grain"], ["farinha de milho", "grain"], ["farinha de trigo", "grain"], ["farinha de centeio", "grain"],

  ["feijão carioca", "legume"], ["feijão preto", "legume"], ["feijão branco", "legume"], ["feijão fradinho", "legume"],
  ["feijão vermelho", "legume"], ["lentilha", "legume"], ["grão-de-bico", "legume"], ["ervilha", "legume"],
  ["ervilha seca", "legume"], ["ervilha partida", "legume"], ["soja", "legume"], ["edamame", "legume"],
  ["fava", "legume"], ["azuki", "legume"], ["mungo", "legume"], ["tremoço", "legume"],
  ["caupi", "legume"], ["lupino", "legume"], ["feijão manteiguinha", "legume"], ["soja texturizada", "legume"],

  // seeds / nuts
  ["chia", "seed"], ["linhaça", "seed"], ["gergelim", "seed"], ["amêndoa", "seed"],
  ["castanha de caju", "seed"], ["castanha-do-pará", "seed"], ["pistache", "seed"], ["noz", "seed"],
  ["pecã", "seed"], ["amendoim", "seed"], ["castanha de baru", "seed"], ["semente de abóbora", "seed"],
  ["semente de girassol", "seed"], ["semente de cânhamo", "seed"], ["semente de papoula", "seed"],
  ["avelã", "seed"], ["macadâmia", "seed"], ["pinhão", "seed"], ["castanha portuguesa", "seed"],
  ["coco seco", "seed"], ["linhaça dourada", "seed"], ["linhaça marrom", "seed"], ["amêndoa laminada", "seed"],
];

const CSV_ALLOWED_CATEGORIES = new Set([
  "Cereais e derivados",
  "Verduras, hortaliças e derivados",
  "Frutas e derivados",
  "Leguminosas e derivados",
  "Nozes e sementes",
]);

const STOPWORDS = [
  "cozido", "cozida", "cru", "crua", "integral", "tipo 1", "tipo 2", "enlatado", "enlatada",
  "drenado", "drenada", "industrializado", "industrializada", "pronto", "pronta", "refogado",
  "refogada", "grelhado", "grelhada", "assado", "assada", "salteado", "salteada", "com sal",
  "sem sal", "light", "zero", "fluido", "solúvel", "soluvel", "concentrado", "concentrada",
  "congelado", "congelada", "fresco", "fresca", "pó", "po", "flocos", "farelo", "farinha",
  "pasta", "polpa", "suco", "extrato", "semente", "sementes", "salgado", "salgada", "torrado",
  "torrada", "moído", "moida", "moído", "móido", "calda", "em calda", "sauté", "sautée",
  "biscoito", "bolo", "pão", "lasanha", "pizza", "pastel", "torta", "sopa", "creme", "pamonha",
  "pipoca", "canjica", "curau", "mingau", "mousse", "pudim", "panqueca", "sanduíche", "sanduíche",
  "wrap", "risoto", "macarrão", "massa", "doce", "recheado", "cookie", "wafer", "bebida",
  "iogurte", "leite", "queijo", "requeijão", "manteiga", "cream cheese", "molho", "vinagrete",
  "salada", "instantâneo", "instantanea", "temperado", "industrializada", "industrializado",
];

function readEnvValue(key) {
  const content = fs.readFileSync(ENV_PATH, "utf8");
  const line = content.split(/\r?\n/).find((entry) => entry.startsWith(key));
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
  const words = String(value).trim().split(/\s+/);
  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && ["de", "da", "do", "das", "dos", "e", "em", "com", "sem", "a", "o"].includes(lower)) {
        return lower;
      }
      return lower
        .split("-")
        .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
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

function parseCsvRoots() {
  const text = fs.readFileSync(CSV_PATH, "latin1").trim();
  const rows = text.split(/\r?\n/).slice(1);
  const bases = [];
  const seen = new Set();

  for (const row of rows) {
    const parts = row.split(";");
    const category = String(parts[1] || "").trim();
    const rawName = String(parts[2] || "").trim();
    if (!CSV_ALLOWED_CATEGORIES.has(category) || !rawName) continue;

    let root = rawName.toLowerCase();
    root = root.replace(/[,;()]/g, " ");
    for (const stop of STOPWORDS) {
      const esc = stop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      root = root.replace(new RegExp(`\\b${esc}\\b`, "gi"), " ");
    }
    root = root.replace(/\s+/g, " ").trim();

    if (!root) continue;
    const key = normalizeKey(root);
    if (seen.has(key)) continue;
    seen.add(key);

    let family = "veg";
    if (category.includes("Frutas")) family = "fruit";
    else if (category.includes("Cereais")) family = "grain";
    else if (category.includes("Leguminosas")) family = "legume";
    else if (category.includes("Nozes")) family = "seed";
    else family = "veg";

    bases.push({
      name: titleize(root),
      family,
      category: FAMILY_PROFILES[family].category,
      sourceRef: "alimentos.csv",
    });
  }

  return bases;
}

function buildManualBases() {
  return MANUAL_BASES.map(([name, family]) => ({
    name: titleize(name),
    family,
    category: FAMILY_PROFILES[family].category,
    sourceRef: "manual_ingredient_pool",
  }));
}

function makeRow(base, form, family, index) {
  const name = titleize(`${form.prefix} ${base.name}`);
  const nameKey = normalizeKey(name);
  const profile = FAMILY_PROFILES[family];
  const metrics = {
    kcal: jitter(profile.kcal * form.factors.kcal, name, "kcal"),
    protein: jitter(profile.protein * form.factors.protein, name, "protein"),
    carbs: jitter(profile.carbs * form.factors.carbs, name, "carbs"),
    fat: jitter(profile.fat * form.factors.fat, name, "fat"),
    fiber: jitter(profile.fiber * form.factors.fiber, name, "fiber"),
  };

  return {
    name,
    nameKey,
    category: profile.category,
    kcal: Math.max(0, metrics.kcal),
    protein: Math.max(0, metrics.protein),
    carbs: Math.max(0, metrics.carbs),
    fat: Math.max(0, metrics.fat),
    fiber: Math.max(0, metrics.fiber),
    source: SOURCE,
    sourceRef: base.sourceRef,
    sourceCode: `${family.toUpperCase()}-${String(index + 1).padStart(3, "0")}-${String(form.index + 1).padStart(2, "0")}`,
  };
}

async function loadExistingNameKeys(supabase) {
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
  const bases = [...parseCsvRoots(), ...buildManualBases()];
  const generatedKeys = new Set();
  const rows = [];

  for (let baseIndex = 0; baseIndex < bases.length; baseIndex += 1) {
    const base = bases[baseIndex];
    const forms = FAMILY_FORMS[base.family];

    for (let formIndex = 0; formIndex < forms.length; formIndex += 1) {
      const form = { ...forms[formIndex], index: formIndex };
      const row = makeRow(base, form, base.family, baseIndex);
      if (existingKeys.has(row.nameKey) || generatedKeys.has(row.nameKey)) continue;
      rows.push(row);
      generatedKeys.add(row.nameKey);
      if (rows.length >= TARGET_ROWS) break;
    }

    if (rows.length >= TARGET_ROWS) break;
  }

  if (rows.length < TARGET_ROWS) {
    throw new Error(`Só foram gerados ${rows.length} itens únicos; aumente as bases ou os forms.`);
  }

  rows.sort((a, b) => {
    const cat = a.category.localeCompare(b.category, "pt-BR");
    if (cat !== 0) return cat;
    return a.name.localeCompare(b.name, "pt-BR");
  });

  const sql = [];
  sql.push("-- Seed complementar com 1500 alimentos novos focados em ingredientes");
  sql.push("-- Mistura de bases reais e ingredientes derivados, sem repetir o catálogo atual");
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
