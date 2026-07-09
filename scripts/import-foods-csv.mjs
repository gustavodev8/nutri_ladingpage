#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const DEFAULT_INPUT = "alimentos.csv";
const DEFAULT_OUTPUT = path.join("supabase", "seeds", "master_foods_seed.sql");

const APP_CATEGORIES = new Map([
  ["frutas", "Frutas"],
  ["frutas e derivados", "Frutas"],
  ["cereais e derivados", "Cereais e derivados"],
  ["paes, bolos e biscoitos", "Pães, bolos e biscoitos"],
  ["carnes e aves", "Carnes e aves"],
  ["carnes e derivados", "Carnes e aves"],
  ["peixes e frutos do mar", "Peixes e frutos do mar"],
  ["ovos e laticinios", "Ovos e laticínios"],
  ["leite e derivados", "Ovos e laticínios"],
  ["leguminosas", "Leguminosas"],
  ["leguminosas e derivados", "Leguminosas"],
  ["verduras e legumes", "Verduras e legumes"],
  ["verduras, hortalicas e derivados", "Verduras e legumes"],
  ["oleaginosas e sementes", "Oleaginosas e sementes"],
  ["nozes e sementes", "Oleaginosas e sementes"],
  ["oleos e gorduras", "Óleos e gorduras"],
  ["gorduras e oleos", "Óleos e gorduras"],
  ["doces e sobremesas", "Doces e sobremesas"],
  ["produtos acucarados", "Doces e sobremesas"],
  ["bebidas e sucos", "Bebidas e sucos"],
  ["bebidas alcoolicas e nao alcoolicas", "Bebidas e sucos"],
  ["alimentos preparados", "Personalizado"],
  ["miscelaneas", "Personalizado"],
  ["outros alimentos industrializados", "Personalizado"],
  ["suplementos", "Suplementos"],
  ["personalizado", "Personalizado"],
]);

const HEADER_ALIASES = {
  source_code: ["número do alimento", "numero do alimento", "food number", "id", "codigo", "código"],
  category: ["categoria do alimento", "categoria", "food category"],
  name: ["descrição dos alimentos", "descricao dos alimentos", "alimento", "descrição", "nome"],
  kcal: ["energia (kcal)", "kcal", "energia kcal"],
  protein: ["proteína (g)", "proteina (g)", "protein (g)", "proteina"],
  fat: ["lipídeos (g)", "lipideos (g)", "gordura (g)", "fat (g)", "fat"],
  carbs: ["carboidrato (g)", "carboidratos (g)", "carbs (g)", "carboidrato"],
  fiber: ["fibra alimentar (g)", "fibra (g)", "fiber (g)", "fibra"],
};

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizeFoodKey(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "");
}

function canonicalCategory(value) {
  const normalized = normalizeText(value);
  return APP_CATEGORIES.get(normalized) || "Personalizado";
}

function parseNumber(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized || /^na$/i.test(normalized) || /^tr$/i.test(normalized)) return 0;
  const parsed = Number.parseFloat(normalized.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function escapeSql(value) {
  return String(value ?? "").replace(/'/g, "''");
}

function splitLine(line, delimiter) {
  const cells = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && char === delimiter) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function detectDelimiter(headerLine) {
  const candidates = [";", "\t", ","];
  let best = ";";
  let bestCount = -1;

  for (const candidate of candidates) {
    const count = headerLine.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }

  return best;
}

function buildHeaderMap(headers) {
  const map = new Map();
  headers.forEach((header, index) => {
    map.set(normalizeText(header), index);
  });
  return map;
}

function findHeaderIndex(headerMap, aliases) {
  for (const alias of aliases) {
    const index = headerMap.get(normalizeText(alias));
    if (index !== undefined) return index;
  }
  return undefined;
}

function parseCsv(content) {
  const lines = content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitLine(lines[0], delimiter);
  const rows = lines.slice(1).map((line) => splitLine(line, delimiter));

  return { headers, rows };
}

function normalizeRow(headers, cells, sourceRefLabel) {
  const headerMap = buildHeaderMap(headers);
  const indexMap = {
    source_code: findHeaderIndex(headerMap, HEADER_ALIASES.source_code),
    category: findHeaderIndex(headerMap, HEADER_ALIASES.category),
    name: findHeaderIndex(headerMap, HEADER_ALIASES.name),
    kcal: findHeaderIndex(headerMap, HEADER_ALIASES.kcal),
    protein: findHeaderIndex(headerMap, HEADER_ALIASES.protein),
    fat: findHeaderIndex(headerMap, HEADER_ALIASES.fat),
    carbs: findHeaderIndex(headerMap, HEADER_ALIASES.carbs),
    fiber: findHeaderIndex(headerMap, HEADER_ALIASES.fiber),
  };

  const fallback = {
    source_code: 0,
    category: 1,
    name: 2,
    kcal: 4,
    protein: 6,
    fat: 7,
    carbs: 9,
    fiber: 10,
  };

  const read = (key) => {
    const index = indexMap[key] ?? fallback[key];
    return index < cells.length ? cells[index] : "";
  };

  const name = String(read("name") ?? "").trim();
  if (!name) return null;

  const sourceCode = String(read("source_code") ?? "").trim();
  const category = canonicalCategory(read("category"));

  return {
    name,
    name_key: normalizeFoodKey(name),
    category,
    kcal: parseNumber(read("kcal")),
    protein: parseNumber(read("protein")),
    carbs: parseNumber(read("carbs")),
    fat: parseNumber(read("fat")),
    fiber: parseNumber(read("fiber")),
    source: "taco_csv",
    source_ref: sourceRefLabel,
    source_code: sourceCode || null,
  };
}

function uniqueByName(rows) {
  const seen = new Set();
  const unique = [];

  for (const row of rows) {
    const key = normalizeText(row.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }

  return unique;
}

function toSql(rows) {
  const values = rows
    .map((row) => {
      const sourceCode = row.source_code ? `'${escapeSql(row.source_code)}'` : "NULL";
      return `(
  '${escapeSql(row.name)}',
  '${escapeSql(row.name_key)}',
  '${escapeSql(row.category)}',
  ${row.kcal.toFixed(2)},
  ${row.protein.toFixed(2)},
  ${row.carbs.toFixed(2)},
  ${row.fat.toFixed(2)},
  ${row.fiber.toFixed(2)},
  '${escapeSql(row.source)}',
  '${escapeSql(row.source_ref)}',
  ${sourceCode}
)`;
    })
    .join(",\n");

  return `BEGIN;

INSERT INTO master_foods (
  name,
  name_key,
  category,
  kcal_per_100g,
  protein_per_100g,
  carbs_per_100g,
  fat_per_100g,
  fiber_per_100g,
  source,
  source_ref,
  source_code
) VALUES
${values}
ON CONFLICT (name_key) DO UPDATE SET
  category = EXCLUDED.category,
  kcal_per_100g = EXCLUDED.kcal_per_100g,
  protein_per_100g = EXCLUDED.protein_per_100g,
  carbs_per_100g = EXCLUDED.carbs_per_100g,
  fat_per_100g = EXCLUDED.fat_per_100g,
  fiber_per_100g = EXCLUDED.fiber_per_100g,
  source = EXCLUDED.source,
  source_ref = EXCLUDED.source_ref,
  source_code = EXCLUDED.source_code;

COMMIT;
`;
}

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const current = argv[i];
    const next = argv[i + 1];

    if (current === "--input" && next) {
      args.input = next;
      i += 1;
    } else if (current === "--output" && next) {
      args.output = next;
      i += 1;
    }
  }

  return args;
}

function main() {
  const { input, output } = parseArgs(process.argv);
  const raw = fs.readFileSync(input, "utf8");
  const { headers, rows } = parseCsv(raw);
  const sourceRefLabel = path.basename(input);
  const normalized = rows
    .map((cells) => normalizeRow(headers, cells, sourceRefLabel))
    .filter(Boolean);
  const unique = uniqueByName(normalized);

  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, toSql(unique), "utf8");

  const categories = [...new Set(unique.map((row) => row.category))].sort();
  console.log(`Generated ${unique.length} unique foods from ${input}`);
  console.log(`Categories: ${categories.join(", ")}`);
  console.log(`Seed written to ${output}`);
}

main();
