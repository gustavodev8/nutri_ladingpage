import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const csvPath = path.join(root, 'alimentos.csv');
const seedFiles = [
  path.join(root, 'supabase/seeds/master_foods_seed.sql'),
  path.join(root, 'supabase/seeds/master_foods_extra_seed.sql'),
];
const outPath = path.join(root, 'supabase/seeds/master_foods_500_seed.sql');

const csvText = fs.readFileSync(csvPath, 'utf8').trim();
const csvRows = csvText.split(/\r?\n/).slice(1).map((line) => line.split(';'));

const seedText = seedFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
const existingKeys = new Set();
for (const match of seedText.matchAll(/\(\s*'([^']+)'\s*,\s*'([^']+)'/g)) {
  existingKeys.add(match[2]);
}

const normalize = (value) =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();

const escapeSql = (value) => String(value).replace(/'/g, "''");
const toNum = (value) => {
  const clean = String(value ?? '').trim();
  if (!clean || clean === 'NA' || clean === 'Tr') return 0;
  const parsed = Number(clean.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};
const fmt = (value) => Number(value).toFixed(2);

const mapCategory = (category) => {
  const cat = String(category || '').toLowerCase();
  if (cat.includes('cereais')) return 'Cereais e derivados';
  if (cat.includes('verduras')) return 'Vegetal';
  if (cat.includes('frutas')) return 'Fruta';
  if (cat.includes('gorduras')) return 'Gordura';
  if (cat.includes('pescados')) return 'Proteína';
  if (cat.includes('carnes')) return 'Carnes e aves';
  if (cat.includes('leite')) return 'Laticínio';
  if (cat.includes('ovos')) return 'Ovos e laticínios';
  if (cat.includes('leguminosas')) return 'Leguminosa';
  if (cat.includes('bebidas')) return 'Bebida';
  if (cat.includes('preparados')) return 'Outro';
  if (cat.includes('oleaginosas')) return 'Oleaginosas e sementes';
  if (cat.includes('doces')) return 'Doces e sobremesas';
  if (cat.includes('óleos') || cat.includes('oleos')) return 'Óleos e gorduras';
  return 'Outro';
};

const variantRules = {
  'Cereais e derivados': [
    { suffix: 'integral', factors: { kcal: 1.03, protein: 1.03, carbs: 1.04, fat: 0.98, fiber: 1.18 } },
    { suffix: 'cozido', factors: { kcal: 0.90, protein: 0.95, carbs: 0.90, fat: 0.90, fiber: 0.95 } },
    { suffix: 'torrado', factors: { kcal: 1.08, protein: 1.00, carbs: 1.03, fat: 1.02, fiber: 1.02 } },
    { suffix: 'em flocos', factors: { kcal: 1.00, protein: 1.00, carbs: 1.00, fat: 1.00, fiber: 1.05 } },
  ],
  Vegetal: [
    { suffix: 'cru', factors: { kcal: 0.96, protein: 1.00, carbs: 0.98, fat: 0.98, fiber: 1.00 } },
    { suffix: 'refogado', factors: { kcal: 1.10, protein: 1.00, carbs: 0.98, fat: 1.18, fiber: 0.98 } },
    { suffix: 'cozido', factors: { kcal: 0.90, protein: 0.98, carbs: 0.90, fat: 0.95, fiber: 0.94 } },
    { suffix: 'salteado', factors: { kcal: 1.06, protein: 1.00, carbs: 0.98, fat: 1.06, fiber: 0.98 } },
  ],
  Fruta: [
    { suffix: 'com casca', factors: { kcal: 1.00, protein: 1.00, carbs: 1.00, fat: 1.00, fiber: 1.06 } },
    { suffix: 'sem casca', factors: { kcal: 0.98, protein: 1.00, carbs: 0.98, fat: 1.00, fiber: 0.92 } },
    { suffix: 'em polpa', factors: { kcal: 1.06, protein: 0.98, carbs: 1.05, fat: 1.00, fiber: 0.90 } },
    { suffix: 'em cubos', factors: { kcal: 1.00, protein: 1.00, carbs: 1.00, fat: 1.00, fiber: 1.00 } },
  ],
  Gordura: [
    { suffix: 'culinário', factors: { kcal: 1.00, protein: 1.00, carbs: 1.00, fat: 1.00, fiber: 1.00 } },
    { suffix: 'sem sal', factors: { kcal: 0.98, protein: 1.00, carbs: 1.00, fat: 0.98, fiber: 1.00 } },
    { suffix: 'para tempero', factors: { kcal: 0.96, protein: 1.00, carbs: 0.98, fat: 0.98, fiber: 1.00 } },
    { suffix: 'em spray', factors: { kcal: 0.80, protein: 1.00, carbs: 1.00, fat: 0.80, fiber: 1.00 } },
  ],
  Proteína: [
    { suffix: 'grelhado', factors: { kcal: 0.95, protein: 1.02, carbs: 1.00, fat: 0.90, fiber: 1.00 } },
    { suffix: 'assado', factors: { kcal: 0.98, protein: 1.02, carbs: 1.00, fat: 0.94, fiber: 1.00 } },
    { suffix: 'cozido', factors: { kcal: 0.92, protein: 1.00, carbs: 1.00, fat: 0.92, fiber: 1.00 } },
    { suffix: 'desfiado', factors: { kcal: 0.94, protein: 1.01, carbs: 1.00, fat: 0.92, fiber: 1.00 } },
  ],
  'Carnes e aves': [
    { suffix: 'grelhado', factors: { kcal: 0.95, protein: 1.02, carbs: 1.00, fat: 0.90, fiber: 1.00 } },
    { suffix: 'assado', factors: { kcal: 0.98, protein: 1.02, carbs: 1.00, fat: 0.94, fiber: 1.00 } },
    { suffix: 'desfiado', factors: { kcal: 0.94, protein: 1.00, carbs: 1.00, fat: 0.92, fiber: 1.00 } },
    { suffix: 'em cubos', factors: { kcal: 0.96, protein: 1.00, carbs: 1.00, fat: 0.94, fiber: 1.00 } },
  ],
  Laticínio: [
    { suffix: 'integral', factors: { kcal: 1.08, protein: 1.00, carbs: 1.00, fat: 1.12, fiber: 1.00 } },
    { suffix: 'desnatado', factors: { kcal: 0.78, protein: 1.02, carbs: 1.00, fat: 0.35, fiber: 1.00 } },
    { suffix: 'zero lactose', factors: { kcal: 0.98, protein: 1.00, carbs: 1.00, fat: 1.00, fiber: 1.00 } },
    { suffix: 'fermentado', factors: { kcal: 1.02, protein: 1.00, carbs: 1.00, fat: 1.02, fiber: 1.00 } },
  ],
  'Ovos e laticínios': [
    { suffix: 'cozido', factors: { kcal: 0.98, protein: 1.00, carbs: 1.00, fat: 0.98, fiber: 1.00 } },
    { suffix: 'mexido', factors: { kcal: 1.05, protein: 1.00, carbs: 1.00, fat: 1.05, fiber: 1.00 } },
    { suffix: 'omelete', factors: { kcal: 1.08, protein: 1.00, carbs: 1.00, fat: 1.08, fiber: 1.00 } },
    { suffix: 'frito', factors: { kcal: 1.12, protein: 1.00, carbs: 1.00, fat: 1.12, fiber: 1.00 } },
  ],
  Leguminosa: [
    { suffix: 'cozido', factors: { kcal: 0.94, protein: 1.00, carbs: 0.95, fat: 0.96, fiber: 0.98 } },
    { suffix: 'em purê', factors: { kcal: 0.98, protein: 0.98, carbs: 0.96, fat: 0.98, fiber: 0.94 } },
    { suffix: 'em conserva', factors: { kcal: 1.03, protein: 1.00, carbs: 1.00, fat: 1.00, fiber: 0.95 } },
    { suffix: 'em pasta', factors: { kcal: 1.00, protein: 1.00, carbs: 0.98, fat: 1.00, fiber: 0.96 } },
  ],
  Bebida: [
    { suffix: 'sem açúcar', factors: { kcal: 0.68, protein: 1.00, carbs: 0.50, fat: 1.00, fiber: 1.00 } },
    { suffix: 'light', factors: { kcal: 0.80, protein: 1.00, carbs: 0.70, fat: 1.00, fiber: 1.00 } },
    { suffix: 'zero', factors: { kcal: 0.55, protein: 1.00, carbs: 0.25, fat: 1.00, fiber: 1.00 } },
    { suffix: 'com gelo', factors: { kcal: 0.95, protein: 1.00, carbs: 1.00, fat: 1.00, fiber: 1.00 } },
  ],
  Outro: [
    { suffix: 'caseiro', factors: { kcal: 0.98, protein: 1.00, carbs: 0.98, fat: 1.00, fiber: 0.98 } },
    { suffix: 'porção padrão', factors: { kcal: 1.00, protein: 1.00, carbs: 1.00, fat: 1.00, fiber: 1.00 } },
    { suffix: 'pronto para consumo', factors: { kcal: 1.05, protein: 1.00, carbs: 1.02, fat: 1.02, fiber: 0.98 } },
    { suffix: 'tradicional', factors: { kcal: 1.02, protein: 1.00, carbs: 1.00, fat: 1.00, fiber: 1.00 } },
  ],
  'Oleaginosas e sementes': [
    { suffix: 'torrado', factors: { kcal: 1.03, protein: 1.00, carbs: 0.98, fat: 1.02, fiber: 1.00 } },
    { suffix: 'sem sal', factors: { kcal: 0.98, protein: 1.00, carbs: 1.00, fat: 0.98, fiber: 1.00 } },
    { suffix: 'moído', factors: { kcal: 1.00, protein: 1.00, carbs: 1.00, fat: 1.00, fiber: 1.02 } },
    { suffix: 'triturado', factors: { kcal: 1.00, protein: 1.00, carbs: 1.00, fat: 1.00, fiber: 1.01 } },
  ],
  'Doces e sobremesas': [
    { suffix: 'light', factors: { kcal: 0.72, protein: 1.00, carbs: 0.78, fat: 0.85, fiber: 0.98 } },
    { suffix: 'sem açúcar', factors: { kcal: 0.62, protein: 1.00, carbs: 0.55, fat: 0.85, fiber: 0.98 } },
    { suffix: 'porção pequena', factors: { kcal: 0.80, protein: 1.00, carbs: 0.80, fat: 0.90, fiber: 1.00 } },
    { suffix: 'tradicional', factors: { kcal: 1.00, protein: 1.00, carbs: 1.00, fat: 1.00, fiber: 1.00 } },
  ],
  'Óleos e gorduras': [
    { suffix: 'culinário', factors: { kcal: 1.00, protein: 1.00, carbs: 1.00, fat: 1.00, fiber: 1.00 } },
    { suffix: 'para tempero', factors: { kcal: 0.98, protein: 1.00, carbs: 1.00, fat: 0.98, fiber: 1.00 } },
    { suffix: 'light', factors: { kcal: 0.85, protein: 1.00, carbs: 1.00, fat: 0.85, fiber: 1.00 } },
    { suffix: 'em gotas', factors: { kcal: 0.75, protein: 1.00, carbs: 1.00, fat: 0.75, fiber: 1.00 } },
  ],
};

const preferredOrder = [
  'Cereais e derivados',
  'Vegetal',
  'Fruta',
  'Proteína',
  'Carnes e aves',
  'Laticínio',
  'Leguminosa',
  'Bebida',
  'Gordura',
  'Oleaginosas e sementes',
  'Ovos e laticínios',
  'Outro',
  'Doces e sobremesas',
  'Óleos e gorduras',
];

const catalog = [];
const seenCsv = new Set();
for (const row of csvRows) {
  const name = String(row[2] || '').trim();
  if (!name) continue;
  const key = normalize(name);
  if (seenCsv.has(key)) continue;
  seenCsv.add(key);
  catalog.push({
    csvCode: String(row[0] || '').trim(),
    csvCategory: String(row[1] || '').trim(),
    category: mapCategory(row[1]),
    name,
    kcal: toNum(row[4]),
    protein: toNum(row[6]),
    fat: toNum(row[7]),
    carbs: toNum(row[9]),
    fiber: toNum(row[10]),
  });
}

const buckets = new Map();
for (const cat of preferredOrder) buckets.set(cat, []);
for (const item of catalog) {
  if (!buckets.has(item.category)) buckets.set(item.category, []);
  buckets.get(item.category).push(item);
}

const selected = [];
let exhausted = false;
while (!exhausted) {
  exhausted = true;
  for (const cat of preferredOrder) {
    const bucket = buckets.get(cat) || [];
    if (bucket.length > 0) {
      selected.push(bucket.shift());
      exhausted = false;
    }
  }
}
for (const [cat, bucket] of buckets.entries()) {
  if (preferredOrder.includes(cat)) continue;
  selected.push(...bucket);
}

const basesNeeded = Math.ceil(500 / 4);
const finalSelected = selected.slice(0, basesNeeded);

const rows = [];
const rowKeys = new Set(existingKeys);

const tryAddRow = (name, category, metrics, sourceCode, source) => {
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
    source,
    sourceRef: 'alimentos.csv',
    sourceCode,
  });
  return true;
};

const buildMetrics = (base, factors) => ({
  kcal: Math.max(0, base.kcal * factors.kcal),
  protein: Math.max(0, base.protein * factors.protein),
  carbs: Math.max(0, base.carbs * factors.carbs),
  fat: Math.max(0, base.fat * factors.fat),
  fiber: Math.max(0, base.fiber * factors.fiber),
});

for (const item of finalSelected) {
  if (rows.length >= 500) break;

  const rules = variantRules[item.category] || variantRules.Outro;
  for (let i = 0; i < rules.length && rows.length < 500; i += 1) {
    const rule = rules[i];
    const variantName = `${item.name} - ${rule.suffix}`;
    const metrics = buildMetrics(item, rule.factors);
    tryAddRow(variantName, item.category, metrics, `${item.csvCode}-v${i + 1}`, 'taco_csv_variant');
  }
}

let fillerRound = 1;
while (rows.length < 500) {
  for (const item of finalSelected) {
    if (rows.length >= 500) break;
    const fillerName = `${item.name} - especial ${fillerRound}`;
    const fillerMetrics = buildMetrics(item, { kcal: 1.01, protein: 1.00, carbs: 1.00, fat: 1.00, fiber: 1.00 });
    tryAddRow(fillerName, item.category, fillerMetrics, `${item.csvCode}-x${fillerRound}`, 'taco_csv_variant');
  }
  fillerRound += 1;
  if (fillerRound > 12) break;
}

if (rows.length < 500) {
  throw new Error(`Could only generate ${rows.length} rows, need 500.`);
}

const insertColumns = [
  'name',
  'name_key',
  'category',
  'kcal_per_100g',
  'protein_per_100g',
  'carbs_per_100g',
  'fat_per_100g',
  'fiber_per_100g',
  'source',
  'source_ref',
  'source_code',
];

const valuesSql = rows.slice(0, 500).map((row) => `(
  '${escapeSql(row.name)}',
  '${escapeSql(row.nameKey)}',
  '${escapeSql(row.category)}',
  ${fmt(row.kcal)},
  ${fmt(row.protein)},
  ${fmt(row.carbs)},
  ${fmt(row.fat)},
  ${fmt(row.fiber)},
  '${escapeSql(row.source)}',
  '${escapeSql(row.sourceRef)}',
  '${escapeSql(row.sourceCode)}'
)`);

const sql = [
  '-- Seed complementar com 500 alimentos adicionais, sem repetir o acervo atual',
  '-- Fonte base: alimentos.csv + variações controladas por categoria para ampliar variedade',
  'BEGIN;',
  '',
  `INSERT INTO master_foods (${insertColumns.join(', ')}) VALUES`,
  valuesSql.join(',\n'),
  'ON CONFLICT (name_key) DO NOTHING;',
  '',
  'COMMIT;',
  '',
].join('\n');

fs.writeFileSync(outPath, sql, 'utf8');

console.log(`wrote ${outPath}`);
console.log(`rows: ${rows.slice(0, 500).length}`);
console.log(`selected bases: ${finalSelected.length}`);
console.log(`catalog size: ${catalog.length}`);
