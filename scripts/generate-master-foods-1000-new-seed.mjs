import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, ".env");
const OUTPUT_FILE = path.join(ROOT, "supabase/seeds/master_foods_1000_new_seed.sql");

const SOURCE = "manual_expansion_5";
const SOURCE_REF = "manual_bulk_1000";
const ROW_TARGET = 1000;

const pools = {
  grain: [
    "quinoa", "arroz negro", "arroz vermelho", "aveia", "amaranto", "cevada", "painço",
    "cuscuz marroquino", "bulgur", "trigo sarraceno", "milho verde", "polenta cremosa",
    "tapioca", "mandioca", "mandioquinha", "inhame", "cará", "batata-doce", "massa integral",
    "pão de fermentação natural", "arroz integral", "fubá", "sêmola de milho", "nhoque de batata",
    "cuscuz de milho", "arroz arbóreo", "macarrão de arroz", "arroz selvagem", "batata asterix",
    "farofa de mandioca", "painço dourado", "creme de milho", "trigo para quibe", "risoto de cevada",
    "aveia fina", "granola caseira", "polvilho azedo", "crepioca", "massa de grão duro",
  ],
  protein: [
    "frango grelhado", "frango desfiado", "peito de peru", "patinho moído", "carne bovina em cubos",
    "salmão fresco", "tilápia", "atum", "sardinha", "ovo mexido", "ovo cozido", "clara de ovo",
    "tofu firme", "tempeh", "seitan", "iogurte grego", "ricota", "cottage", "queijo minas",
    "kefir", "peito de frango", "carne suína magra", "lombo suíno", "camarão", "linguado",
    "peru assado", "costela magra", "hambúrguer artesanal de frango", "almôndega de peru",
    "fígado bovino", "omelete de claras", "queijo fresco", "proteína texturizada de soja",
  ],
  veg: [
    "abobrinha", "berinjela", "brócolis", "couve-flor", "espinafre", "chuchu", "vagem",
    "aspargos", "cogumelo", "repolho roxo", "cenoura", "beterraba", "pepino", "alface romana",
    "rúcula", "tomate-cereja", "alho-poró", "pimentão", "quiabo", "palmito", "couve manteiga",
    "acelga", "jiló", "nabo", "rabanete", "abóbora cabotiá", "abóbora moranga", "endívia",
    "agrião", "couve de Bruxelas", "funghi", "shimeji", "taioba", "ora-pro-nóbis",
    "maxixe", "berinjela japonesa", "ervilha-torta", "brócolis ninja", "couve kale",
  ],
  fruit: [
    "banana", "manga", "maracujá", "morango", "maçã", "abacaxi", "kiwi", "pera", "mamão", "uva",
    "pêssego", "caju", "graviola", "goiaba", "lichia", "pitaya", "acerola", "tangerina",
    "laranja", "amora", "framboesa", "mirtilo", "figo", "romã", "melancia", "melão",
    "damasco", "ameixa", "nectarina", "jabuticaba", "siriguela", "carambola", "fruta do conde",
  ],
  legume: [
    "lentilha", "grão-de-bico", "feijão branco", "feijão preto", "feijão fradinho", "feijão vermelho",
    "ervilha seca", "ervilha partida", "soja cozida", "edamame", "fava", "mungo", "azuki",
    "tremoço", "pasta de lentilha", "creme de grão-de-bico", "feijão carioca", "soja texturizada",
  ],
  seed: [
    "chia", "linhaça dourada", "gergelim", "amêndoa", "castanha de caju", "castanha-do-pará",
    "pistache", "nozes", "pecã", "semente de abóbora", "semente de girassol", "macadâmia",
    "amendoim", "castanha de baru", "semente de cânhamo", "semente de papoula",
  ],
  dairy: [
    "iogurte natural", "iogurte grego", "kefir", "leite desnatado", "leite sem lactose",
    "leite de amêndoas", "leite de aveia", "leite de coco", "cottage", "ricota",
    "queijo minas frescal", "requeijão light", "cream cheese light", "coalhada", "skyr",
  ],
  herb: [
    "manjericão", "salsinha", "coentro", "hortelã", "alecrim", "tomilho", "orégano", "cúrcuma",
    "gengibre", "páprica", "cominho", "canela", "cebola roxa", "alho", "limão", "pimenta dedo-de-moça",
    "sálvia", "ervas finas", "estragão", "zaatar",
  ],
  oil: [
    "azeite de oliva", "óleo de abacate", "óleo de coco", "tahine", "pasta de amendoim",
    "óleo de linhaça", "óleo de girassol", "manteiga sem sal", "ghee", "margarina light",
  ],
  sauce: [
    "pesto", "vinagrete", "molho de iogurte", "molho de tahine", "molho de tomate",
    "creme de ricota", "molho mostarda e mel", "molho de ervas", "hummus", "salsa de tomate",
    "creme de abóbora", "coulis de frutas vermelhas", "molho agridoce", "molho cítrico",
  ],
  driedFruit: [
    "uva-passa", "damasco seco", "banana desidratada", "maçã desidratada", "coco seco",
    "ameixa seca", "figo seco", "cranberry seca", "tâmara", "passa preta",
  ],
  root: [
    "batata-doce", "mandioquinha", "inhame", "cará", "mandioca", "abóbora cabotiá",
    "beterraba", "cenoura", "nabo", "rabanete", "batata baroa", "abóbora moranga",
  ],
};

const groupMetrics = {
  grain: { kcal: 122, protein: 3.4, carbs: 25.8, fat: 1.3, fiber: 2.7 },
  protein: { kcal: 168, protein: 22.0, carbs: 0.8, fat: 7.2, fiber: 0.0 },
  veg: { kcal: 29, protein: 1.6, carbs: 5.1, fat: 0.4, fiber: 2.3 },
  fruit: { kcal: 58, protein: 0.8, carbs: 14.2, fat: 0.2, fiber: 2.2 },
  legume: { kcal: 130, protein: 8.7, carbs: 20.2, fat: 2.1, fiber: 5.5 },
  seed: { kcal: 570, protein: 18.0, carbs: 15.0, fat: 48.0, fiber: 7.2 },
  dairy: { kcal: 92, protein: 6.6, carbs: 4.8, fat: 4.0, fiber: 0.0 },
  herb: { kcal: 18, protein: 1.0, carbs: 3.8, fat: 0.2, fiber: 1.8 },
  oil: { kcal: 790, protein: 0.0, carbs: 0.0, fat: 90.0, fiber: 0.0 },
  sauce: { kcal: 62, protein: 1.8, carbs: 5.1, fat: 3.2, fiber: 0.7 },
  driedFruit: { kcal: 268, protein: 2.2, carbs: 68.0, fat: 0.5, fiber: 6.1 },
  root: { kcal: 78, protein: 1.4, carbs: 17.0, fat: 0.2, fiber: 2.8 },
};

const templates = [
  {
    code: "BWL",
    category: "Cereais e derivados",
    components: [
      { alias: "grain", pool: "grain" },
      { alias: "protein", pool: "protein" },
      { alias: "veg", pool: "veg" },
      { alias: "sauce", pool: "sauce" },
    ],
    weights: [0.36, 0.28, 0.22, 0.14],
    build: (c) => `Bowl de ${c.grain} com ${c.protein}, ${c.veg} e ${c.sauce}`,
  },
  {
    code: "SAL",
    category: "Vegetal",
    components: [
      { alias: "vegA", pool: "veg" },
      { alias: "vegB", pool: "veg" },
      { alias: "grain", pool: "grain" },
      { alias: "seed", pool: "seed" },
    ],
    weights: [0.34, 0.24, 0.28, 0.14],
    build: (c) => `Salada morna de ${c.vegA} com ${c.vegB}, ${c.grain} e ${c.seed}`,
  },
  {
    code: "CRM",
    category: "Vegetal",
    components: [
      { alias: "vegA", pool: "veg" },
      { alias: "vegB", pool: "veg" },
      { alias: "herb", pool: "herb" },
    ],
    weights: [0.58, 0.28, 0.14],
    build: (c) => `Creme de ${c.vegA} com ${c.vegB} e ${c.herb}`,
  },
  {
    code: "SOP",
    category: "Vegetal",
    components: [
      { alias: "veg", pool: "veg" },
      { alias: "root", pool: "root" },
      { alias: "herb", pool: "herb" },
      { alias: "sauce", pool: "sauce" },
    ],
    weights: [0.48, 0.24, 0.16, 0.12],
    build: (c) => `Sopa rústica de ${c.veg} com ${c.root}, ${c.herb} e ${c.sauce}`,
  },
  {
    code: "RSO",
    category: "Cereais e derivados",
    components: [
      { alias: "grain", pool: "grain" },
      { alias: "protein", pool: "protein" },
      { alias: "veg", pool: "veg" },
    ],
    weights: [0.42, 0.34, 0.24],
    build: (c) => `Risoto de ${c.grain} com ${c.protein} e ${c.veg}`,
  },
  {
    code: "ESC",
    category: "Carnes e aves",
    components: [
      { alias: "protein", pool: "protein" },
      { alias: "root", pool: "root" },
      { alias: "veg", pool: "veg" },
    ],
    weights: [0.44, 0.30, 0.26],
    build: (c) => `Escondidinho de ${c.protein} com ${c.root} e ${c.veg}`,
  },
  {
    code: "PAN",
    category: "Pães, bolos e biscoitos",
    components: [
      { alias: "grain", pool: "grain" },
      { alias: "fruit", pool: "fruit" },
      { alias: "dairy", pool: "dairy" },
    ],
    weights: [0.48, 0.30, 0.22],
    build: (c) => `Panqueca integral de ${c.grain} com ${c.fruit} e ${c.dairy}`,
  },
  {
    code: "MUF",
    category: "Doces e sobremesas",
    components: [
      { alias: "fruit", pool: "fruit" },
      { alias: "seed", pool: "seed" },
      { alias: "dairy", pool: "dairy" },
    ],
    weights: [0.42, 0.20, 0.38],
    build: (c) => `Muffin de ${c.fruit} com ${c.seed} e ${c.dairy}`,
  },
  {
    code: "SMT",
    category: "Bebida",
    components: [
      { alias: "fruitA", pool: "fruit" },
      { alias: "fruitB", pool: "fruit" },
      { alias: "seed", pool: "seed" },
      { alias: "dairy", pool: "dairy" },
    ],
    weights: [0.42, 0.24, 0.14, 0.20],
    build: (c) => `Smoothie de ${c.fruitA} com ${c.fruitB}, ${c.seed} e ${c.dairy}`,
  },
  {
    code: "PAT",
    category: "Leguminosa",
    components: [
      { alias: "legume", pool: "legume" },
      { alias: "seed", pool: "seed" },
      { alias: "herb", pool: "herb" },
    ],
    weights: [0.56, 0.26, 0.18],
    build: (c) => `Patê de ${c.legume} com ${c.seed} e ${c.herb}`,
  },
  {
    code: "WRP",
    category: "Outro",
    components: [
      { alias: "protein", pool: "protein" },
      { alias: "veg", pool: "veg" },
      { alias: "dairy", pool: "dairy" },
      { alias: "grain", pool: "grain" },
    ],
    weights: [0.30, 0.24, 0.18, 0.28],
    build: (c) => `Wrap de ${c.protein} com ${c.veg}, ${c.dairy} e ${c.grain}`,
  },
  {
    code: "OME",
    category: "Ovos e laticínios",
    components: [
      { alias: "protein", pool: "protein" },
      { alias: "veg", pool: "veg" },
      { alias: "herb", pool: "herb" },
    ],
    weights: [0.46, 0.38, 0.16],
    build: (c) => `Omelete de ${c.protein} com ${c.veg} e ${c.herb}`,
  },
  {
    code: "GRT",
    category: "Laticínio",
    components: [
      { alias: "veg", pool: "veg" },
      { alias: "protein", pool: "protein" },
      { alias: "dairy", pool: "dairy" },
    ],
    weights: [0.34, 0.30, 0.36],
    build: (c) => `Gratinado de ${c.veg} com ${c.protein} e ${c.dairy}`,
  },
  {
    code: "ASS",
    category: "Carnes e aves",
    components: [
      { alias: "protein", pool: "protein" },
      { alias: "veg", pool: "veg" },
      { alias: "root", pool: "root" },
      { alias: "herb", pool: "herb" },
    ],
    weights: [0.40, 0.24, 0.22, 0.14],
    build: (c) => `Assado de ${c.protein} com ${c.veg}, ${c.root} e ${c.herb}`,
  },
  {
    code: "TRT",
    category: "Pães, bolos e biscoitos",
    components: [
      { alias: "veg", pool: "veg" },
      { alias: "protein", pool: "protein" },
      { alias: "grain", pool: "grain" },
    ],
    weights: [0.34, 0.28, 0.38],
    build: (c) => `Torta rústica de ${c.veg} com ${c.protein} e ${c.grain}`,
  },
  {
    code: "CAL",
    category: "Outro",
    components: [
      { alias: "veg", pool: "veg" },
      { alias: "herb", pool: "herb" },
      { alias: "sauce", pool: "sauce" },
    ],
    weights: [0.60, 0.22, 0.18],
    build: (c) => `Caldo de ${c.veg} com ${c.herb} e ${c.sauce}`,
  },
  {
    code: "MIX",
    category: "Oleaginosas e sementes",
    components: [
      { alias: "seedA", pool: "seed" },
      { alias: "seedB", pool: "seed" },
      { alias: "driedFruit", pool: "driedFruit" },
    ],
    weights: [0.44, 0.30, 0.26],
    build: (c) => `Mix crocante de ${c.seedA}, ${c.seedB} e ${c.driedFruit}`,
  },
  {
    code: "PAR",
    category: "Laticínio",
    components: [
      { alias: "dairy", pool: "dairy" },
      { alias: "fruit", pool: "fruit" },
      { alias: "grain", pool: "grain" },
    ],
    weights: [0.40, 0.30, 0.30],
    build: (c) => `Parfait de ${c.dairy} com ${c.fruit} e ${c.grain}`,
  },
  {
    code: "PST",
    category: "Leguminosa",
    components: [
      { alias: "legume", pool: "legume" },
      { alias: "seed", pool: "seed" },
      { alias: "oil", pool: "oil" },
    ],
    weights: [0.56, 0.22, 0.22],
    build: (c) => `Pasta cremosa de ${c.legume} com ${c.seed} e ${c.oil}`,
  },
  {
    code: "SLT",
    category: "Vegetal",
    components: [
      { alias: "veg", pool: "veg" },
      { alias: "protein", pool: "protein" },
      { alias: "herb", pool: "herb" },
    ],
    weights: [0.42, 0.36, 0.22],
    build: (c) => `Salteado de ${c.veg} com ${c.protein} e ${c.herb}`,
  },
  {
    code: "BLC",
    category: "Doces e sobremesas",
    components: [
      { alias: "grain", pool: "grain" },
      { alias: "fruit", pool: "fruit" },
      { alias: "seed", pool: "seed" },
    ],
    weights: [0.46, 0.30, 0.24],
    build: (c) => `Bowl doce de ${c.grain} com ${c.fruit} e ${c.seed}`,
  },
  {
    code: "VIT",
    category: "Bebida",
    components: [
      { alias: "fruit", pool: "fruit" },
      { alias: "driedFruit", pool: "driedFruit" },
      { alias: "dairy", pool: "dairy" },
      { alias: "seed", pool: "seed" },
    ],
    weights: [0.34, 0.20, 0.30, 0.16],
    build: (c) => `Vitamina de ${c.fruit} com ${c.driedFruit}, ${c.dairy} e ${c.seed}`,
  },
  {
    code: "RFG",
    category: "Vegetal",
    components: [
      { alias: "vegA", pool: "veg" },
      { alias: "vegB", pool: "veg" },
      { alias: "legume", pool: "legume" },
      { alias: "herb", pool: "herb" },
    ],
    weights: [0.38, 0.26, 0.22, 0.14],
    build: (c) => `Refogado de ${c.vegA} com ${c.vegB}, ${c.legume} e ${c.herb}`,
  },
  {
    code: "POK",
    category: "Outro",
    components: [
      { alias: "grain", pool: "grain" },
      { alias: "protein", pool: "protein" },
      { alias: "veg", pool: "veg" },
      { alias: "sauce", pool: "sauce" },
    ],
    weights: [0.34, 0.32, 0.20, 0.14],
    build: (c) => `Poke de ${c.grain} com ${c.protein}, ${c.veg} e ${c.sauce}`,
  },
  {
    code: "IUR",
    category: "Laticínio",
    components: [
      { alias: "dairy", pool: "dairy" },
      { alias: "fruitA", pool: "fruit" },
      { alias: "fruitB", pool: "fruit" },
      { alias: "seed", pool: "seed" },
    ],
    weights: [0.48, 0.18, 0.18, 0.16],
    build: (c) => `Iogurte de ${c.fruitA} com ${c.fruitB}, ${c.seed} e ${c.dairy}`,
  },
];

function readEnvValue(key) {
  const text = fs.readFileSync(ENV_PATH, "utf8");
  const line = text
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(key));
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

function hashRatio(input, salt) {
  const digest = createHash("sha256").update(`${salt}:${input}`).digest();
  return digest.readUInt32BE(0) / 0xffffffff;
}

function jitterMetric(value, name, salt, spread = 0.10) {
  const ratio = 1 - spread / 2 + hashRatio(name, salt) * spread;
  return value * ratio;
}

function buildMetrics(componentValues, weights, name) {
  const totals = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  for (let i = 0; i < componentValues.length; i += 1) {
    const base = groupMetrics[componentValues[i].pool];
    const weight = weights[i];
    totals.kcal += base.kcal * weight;
    totals.protein += base.protein * weight;
    totals.carbs += base.carbs * weight;
    totals.fat += base.fat * weight;
    totals.fiber += base.fiber * weight;
  }

  return {
    kcal: Math.max(0, jitterMetric(totals.kcal, name, "kcal")),
    protein: Math.max(0, jitterMetric(totals.protein, name, "protein")),
    carbs: Math.max(0, jitterMetric(totals.carbs, name, "carbs")),
    fat: Math.max(0, jitterMetric(totals.fat, name, "fat")),
    fiber: Math.max(0, jitterMetric(totals.fiber, name, "fiber")),
  };
}

function pickValue(poolName, cycle, templateIndex, componentIndex) {
  const pool = pools[poolName];
  const offset = cycle * (templateIndex + 3) * (componentIndex + 5) + templateIndex * 17 + componentIndex * 11;
  return pool[offset % pool.length];
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

    if (error) {
      throw error;
    }

    for (const row of data ?? []) {
      const key = row.name_key || normalizeKey(row.name || "");
      if (key) keys.add(key);
    }

    if (!data || data.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return keys;
}

function buildRow(template, cycle, templateIndex, existingKeys, generatedKeys) {
  const componentValues = template.components.map((component, componentIndex) => ({
    alias: component.alias,
    pool: component.pool,
    value: pickValue(component.pool, cycle, templateIndex, componentIndex),
  }));

  const context = Object.fromEntries(componentValues.map((item) => [item.alias, item.value]));
  const name = template.build(context);
  const key = normalizeKey(name);

  if (!key || existingKeys.has(key) || generatedKeys.has(key)) {
    return null;
  }

  const metrics = buildMetrics(componentValues, template.weights, name);
  const code = `${template.code}-${String(cycle + 1).padStart(3, "0")}`;

  return {
    name,
    nameKey: key,
    category: template.category,
    kcal: metrics.kcal,
    protein: metrics.protein,
    carbs: metrics.carbs,
    fat: metrics.fat,
    fiber: metrics.fiber,
    source: SOURCE,
    sourceRef: SOURCE_REF,
    sourceCode: code,
  };
}

async function main() {
  const supabaseUrl = readEnvValue("VITE_SUPABASE_URL");
  const supabaseKey = stripLeadingNoise(readEnvValue("VITE_SUPABASE_SERVICE_KEY"));

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Não foi possível ler VITE_SUPABASE_URL ou VITE_SUPABASE_SERVICE_KEY em .env");
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const existingKeys = await loadExistingNameKeys(supabase);
  const generatedKeys = new Set();
  const rows = [];

  for (let cycle = 0; cycle < 240 && rows.length < ROW_TARGET; cycle += 1) {
    for (let templateIndex = 0; templateIndex < templates.length && rows.length < ROW_TARGET; templateIndex += 1) {
      const template = templates[templateIndex];
      const row = buildRow(template, cycle, templateIndex, existingKeys, generatedKeys);
      if (!row) continue;
      rows.push(row);
      generatedKeys.add(row.nameKey);
    }
  }

  if (rows.length < ROW_TARGET) {
    throw new Error(`Só foram gerados ${rows.length} itens únicos; revise os pools/templates.`);
  }

  rows.sort((a, b) => {
    const categoryOrder = a.category.localeCompare(b.category, "pt-BR");
    if (categoryOrder !== 0) return categoryOrder;
    return a.name.localeCompare(b.name, "pt-BR");
  });

  const lines = [
    "-- Seed complementar com 1000 alimentos novos e únicos",
    "-- Geração sintética controlada, sem colidir com o catálogo atual",
    `-- Total de novos itens: ${rows.length}`,
    "",
    "BEGIN;",
    "",
    "INSERT INTO master_foods (name, name_key, category, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, source, source_ref, source_code) VALUES",
  ];

  rows.forEach((row, index) => {
    const suffix = index === rows.length - 1 ? "" : ",";
    lines.push(
      `(${sqlValue(row.name)}, ${sqlValue(row.nameKey)}, ${sqlValue(row.category)}, ${row.kcal.toFixed(2)}, ${row.protein.toFixed(2)}, ${row.carbs.toFixed(2)}, ${row.fat.toFixed(2)}, ${row.fiber.toFixed(2)}, ${sqlValue(row.source)}, ${sqlValue(row.sourceRef)}, ${sqlValue(row.sourceCode)})${suffix}`
    );
  });

  lines.push("ON CONFLICT (name_key) DO NOTHING;");
  lines.push("");
  lines.push("COMMIT;");
  lines.push("");

  fs.writeFileSync(OUTPUT_FILE, lines.join("\n"), "utf8");

  const batchSize = 200;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
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

    if (error) {
      throw error;
    }
  }

  console.log(`Generated ${rows.length} rows at ${OUTPUT_FILE}`);
  console.log(`Inserted ${rows.length} rows into master_foods`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
