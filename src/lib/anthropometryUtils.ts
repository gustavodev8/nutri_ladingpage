// ─── Protocolos de composição corporal por adipometria ───────────────────────
// Referências:
//   Jackson & Pollock (1978) — 3 e 7 dobras masculino
//   Jackson, Pollock & Ward (1980) — 3 dobras feminino
//   Jackson & Pollock (1978) — 7 dobras feminino
//   Guedes (1985) — protocolo brasileiro (3 dobras)
//   Durnin & Womersley (1974) — 4 dobras, tabelas por sexo/faixa etária
//   Faulkner (1968) — 4 dobras, fórmula direta (sem densidade)
//   Yuhász (1974) — 6 dobras
//   Equação de Siri (1961): %G = (495 / DC) − 450

export type SkinfoldProtocol =
  | "JP3M" | "JP3F"
  | "JP7M" | "JP7F"
  | "GUEDES_M" | "GUEDES_F"
  | "DURNIN"
  | "FAULKNER"
  | "YUHASZ";

export interface ProtocolInfo {
  id:         SkinfoldProtocol;
  label:      string;
  /** Indicativo de público-alvo — não bloqueia a seleção na UI */
  gender?:    "M" | "F";
  skinfolds:  SkinfoldKey[];
  description: string;
  /** Protocolo exige gênero + idade do paciente para o cálculo */
  needsGender?: boolean;
}

export type SkinfoldKey =
  | "sf_pectoral"
  | "sf_midaxillary"
  | "sf_triceps"
  | "sf_biceps"
  | "sf_subscapular"
  | "sf_suprailiac"
  | "sf_abdominal"
  | "sf_thigh_sf"
  | "sf_calf_sf";

export const SKINFOLD_LABELS: Record<SkinfoldKey, string> = {
  sf_pectoral:    "Peitoral",
  sf_midaxillary: "Axilar Média",
  sf_triceps:     "Tríceps",
  sf_biceps:      "Bíceps",
  sf_subscapular: "Subescapular",
  sf_suprailiac:  "Suprailíaca",
  sf_abdominal:   "Abdominal",
  sf_thigh_sf:    "Coxa",
  sf_calf_sf:     "Panturrilha",
};

export const PROTOCOLS: ProtocolInfo[] = [
  // ── Jackson & Pollock 3 pregas ──────────────────────────────────────────
  {
    id:          "JP3M",
    label:       "Jackson & Pollock 3P — Masculino",
    gender:      "M",
    skinfolds:   ["sf_pectoral", "sf_abdominal", "sf_thigh_sf"],
    description: "Peitoral + Abdominal + Coxa",
    needsGender: false,
  },
  {
    id:          "JP3F",
    label:       "Jackson & Pollock 3P — Feminino",
    gender:      "F",
    skinfolds:   ["sf_triceps", "sf_suprailiac", "sf_thigh_sf"],
    description: "Tríceps + Suprailíaca + Coxa",
    needsGender: false,
  },
  // ── Jackson & Pollock 7 pregas ──────────────────────────────────────────
  {
    id:          "JP7M",
    label:       "Jackson & Pollock 7P — Masculino",
    gender:      "M",
    skinfolds:   ["sf_pectoral", "sf_midaxillary", "sf_triceps", "sf_subscapular", "sf_suprailiac", "sf_abdominal", "sf_thigh_sf"],
    description: "Peitoral + Axilar Média + Tríceps + Subescapular + Suprailíaca + Abdominal + Coxa",
    needsGender: false,
  },
  {
    id:          "JP7F",
    label:       "Jackson & Pollock 7P — Feminino",
    gender:      "F",
    skinfolds:   ["sf_pectoral", "sf_midaxillary", "sf_triceps", "sf_subscapular", "sf_suprailiac", "sf_abdominal", "sf_thigh_sf"],
    description: "Peitoral + Axilar Média + Tríceps + Subescapular + Suprailíaca + Abdominal + Coxa",
    needsGender: false,
  },
  // ── Guedes (1985) ───────────────────────────────────────────────────────
  {
    id:          "GUEDES_M",
    label:       "Guedes 3P — Masculino",
    gender:      "M",
    skinfolds:   ["sf_triceps", "sf_subscapular", "sf_suprailiac"],
    description: "Tríceps + Subescapular + Suprailíaca",
    needsGender: false,
  },
  {
    id:          "GUEDES_F",
    label:       "Guedes 3P — Feminino",
    gender:      "F",
    skinfolds:   ["sf_triceps", "sf_subscapular", "sf_suprailiac"],
    description: "Tríceps + Subescapular + Suprailíaca",
    needsGender: false,
  },
  // ── Durnin & Womersley (1974) ───────────────────────────────────────────
  {
    id:          "DURNIN",
    label:       "Durnin & Womersley 4P",
    skinfolds:   ["sf_biceps", "sf_triceps", "sf_subscapular", "sf_suprailiac"],
    description: "Bíceps + Tríceps + Subescapular + Suprailíaca",
    needsGender: true,
  },
  // ── Faulkner (1968) ─────────────────────────────────────────────────────
  {
    id:          "FAULKNER",
    label:       "Faulkner 4P",
    skinfolds:   ["sf_triceps", "sf_subscapular", "sf_suprailiac", "sf_abdominal"],
    description: "Tríceps + Subescapular + Suprailíaca + Abdominal",
    needsGender: false,
  },
  // ── Yuhász (1974) ───────────────────────────────────────────────────────
  {
    id:          "YUHASZ",
    label:       "Yuhász 6P",
    skinfolds:   ["sf_triceps", "sf_subscapular", "sf_suprailiac", "sf_abdominal", "sf_thigh_sf", "sf_calf_sf"],
    description: "Tríceps + Subescapular + Suprailíaca + Abdominal + Coxa + Panturrilha",
    needsGender: true,
  },
];

export type SkinfoldValues = Partial<Record<SkinfoldKey, number>>;

// ─── Equação de Siri (1961) ───────────────────────────────────────────────────
function siri(density: number): number {
  return (495 / density) - 450;
}

// ─── Jackson & Pollock 3 pregas — Masculino ───────────────────────────────────
function jp3Male(sf: SkinfoldValues, age: number) {
  const s = (sf.sf_pectoral ?? 0) + (sf.sf_abdominal ?? 0) + (sf.sf_thigh_sf ?? 0);
  if (s <= 0) return null;
  const density = 1.10938 - 0.0008267 * s + 0.0000016 * s * s - 0.0002574 * age;
  return { density, fatPct: Math.max(0, siri(density)) };
}

// ─── Jackson & Pollock 3 pregas — Feminino ────────────────────────────────────
function jp3Female(sf: SkinfoldValues, age: number) {
  const s = (sf.sf_triceps ?? 0) + (sf.sf_suprailiac ?? 0) + (sf.sf_thigh_sf ?? 0);
  if (s <= 0) return null;
  const density = 1.0994921 - 0.0009929 * s + 0.0000023 * s * s - 0.0001392 * age;
  return { density, fatPct: Math.max(0, siri(density)) };
}

// ─── Jackson & Pollock 7 pregas — Masculino ───────────────────────────────────
function jp7Male(sf: SkinfoldValues, age: number) {
  const s = (sf.sf_pectoral ?? 0) + (sf.sf_midaxillary ?? 0) + (sf.sf_triceps ?? 0) +
            (sf.sf_subscapular ?? 0) + (sf.sf_suprailiac ?? 0) + (sf.sf_abdominal ?? 0) +
            (sf.sf_thigh_sf ?? 0);
  if (s <= 0) return null;
  const density = 1.112 - 0.00043499 * s + 0.00000055 * s * s - 0.00028826 * age;
  return { density, fatPct: Math.max(0, siri(density)) };
}

// ─── Jackson & Pollock 7 pregas — Feminino ────────────────────────────────────
function jp7Female(sf: SkinfoldValues, age: number) {
  const s = (sf.sf_pectoral ?? 0) + (sf.sf_midaxillary ?? 0) + (sf.sf_triceps ?? 0) +
            (sf.sf_subscapular ?? 0) + (sf.sf_suprailiac ?? 0) + (sf.sf_abdominal ?? 0) +
            (sf.sf_thigh_sf ?? 0);
  if (s <= 0) return null;
  const density = 1.097 - 0.00046971 * s + 0.00000056 * s * s - 0.00012828 * age;
  return { density, fatPct: Math.max(0, siri(density)) };
}

// ─── Guedes (1985) — Masculino ────────────────────────────────────────────────
function guedesMale(sf: SkinfoldValues) {
  const s = (sf.sf_triceps ?? 0) + (sf.sf_subscapular ?? 0) + (sf.sf_suprailiac ?? 0);
  if (s <= 0) return null;
  const density = 1.1765 - 0.0744 * Math.log10(s);
  return { density, fatPct: Math.max(0, siri(density)) };
}

// ─── Guedes (1985) — Feminino ─────────────────────────────────────────────────
function guedesFemale(sf: SkinfoldValues) {
  const s = (sf.sf_triceps ?? 0) + (sf.sf_subscapular ?? 0) + (sf.sf_suprailiac ?? 0);
  if (s <= 0) return null;
  const density = 1.1665 - 0.0706 * Math.log10(s);
  return { density, fatPct: Math.max(0, siri(density)) };
}

// ─── Durnin & Womersley (1974) ────────────────────────────────────────────────
// Tabelas de coeficientes por sexo e faixa etária
const DURNIN_M: Array<{ maxAge: number; c: number; m: number }> = [
  { maxAge: 19, c: 1.1620, m: 0.0630 },
  { maxAge: 29, c: 1.1631, m: 0.0632 },
  { maxAge: 39, c: 1.1422, m: 0.0544 },
  { maxAge: 49, c: 1.1620, m: 0.0700 },
  { maxAge: 99, c: 1.1715, m: 0.0779 },
];
const DURNIN_F: Array<{ maxAge: number; c: number; m: number }> = [
  { maxAge: 19, c: 1.1549, m: 0.0678 },
  { maxAge: 29, c: 1.1599, m: 0.0717 },
  { maxAge: 39, c: 1.1423, m: 0.0632 },
  { maxAge: 49, c: 1.1333, m: 0.0612 },
  { maxAge: 99, c: 1.1339, m: 0.0645 },
];

function durnin(sf: SkinfoldValues, age: number, gender: "M" | "F") {
  const s = (sf.sf_biceps ?? 0) + (sf.sf_triceps ?? 0) + (sf.sf_subscapular ?? 0) + (sf.sf_suprailiac ?? 0);
  if (s <= 0) return null;
  const table = gender === "M" ? DURNIN_M : DURNIN_F;
  const row = table.find(r => age <= r.maxAge) ?? table[table.length - 1];
  const density = row.c - row.m * Math.log10(s);
  return { density, fatPct: Math.max(0, siri(density)) };
}

// ─── Faulkner (1968) ──────────────────────────────────────────────────────────
// %G = 5.783 + 0.153 × Σ4  (Tríceps + Subescapular + Suprailíaca + Abdominal)
// Sem equação de densidade — density retornado como 0
function faulkner(sf: SkinfoldValues) {
  const s = (sf.sf_triceps ?? 0) + (sf.sf_subscapular ?? 0) + (sf.sf_suprailiac ?? 0) + (sf.sf_abdominal ?? 0);
  if (s <= 0) return null;
  const fatPct = Math.max(0, 5.783 + 0.153 * s);
  return { density: 0, fatPct };
}

// ─── Yuhász (1974) ────────────────────────────────────────────────────────────
// %G♂ = 0.097 × Σ6 + 3.64
// %G♀ = 0.1429 × Σ6 + 4.56
function yuhasz(sf: SkinfoldValues, gender: "M" | "F") {
  const s = (sf.sf_triceps ?? 0) + (sf.sf_subscapular ?? 0) + (sf.sf_suprailiac ?? 0) +
            (sf.sf_abdominal ?? 0) + (sf.sf_thigh_sf ?? 0) + (sf.sf_calf_sf ?? 0);
  if (s <= 0) return null;
  const fatPct = gender === "M"
    ? Math.max(0, 0.097 * s + 3.64)
    : Math.max(0, 0.1429 * s + 4.56);
  return { density: 0, fatPct };
}

// ─── Dispatcher principal ─────────────────────────────────────────────────────
export function calcBodyFat(
  protocol: SkinfoldProtocol,
  sf: SkinfoldValues,
  age: number,
  gender: "M" | "F" = "M",
): { density: number; fatPct: number } | null {
  switch (protocol) {
    case "JP3M":     return jp3Male(sf, age);
    case "JP3F":     return jp3Female(sf, age);
    case "JP7M":     return jp7Male(sf, age);
    case "JP7F":     return jp7Female(sf, age);
    case "GUEDES_M": return guedesMale(sf);
    case "GUEDES_F": return guedesFemale(sf);
    case "DURNIN":   return durnin(sf, age, gender);
    case "FAULKNER": return faulkner(sf);
    case "YUHASZ":   return yuhasz(sf, gender);
    default:         return null;
  }
}

// ─── Verifica se todas as dobras do protocolo estão preenchidas ───────────────
export function hasAllSkinfolds(protocol: SkinfoldProtocol, sf: SkinfoldValues): boolean {
  const info = PROTOCOLS.find(p => p.id === protocol);
  if (!info) return false;
  return info.skinfolds.every(k => (sf[k] ?? 0) > 0);
}

// ─── Soma das dobras do protocolo ─────────────────────────────────────────────
export function sumSkinfolds(protocol: SkinfoldProtocol, sf: SkinfoldValues): number {
  const info = PROTOCOLS.find(p => p.id === protocol);
  if (!info) return 0;
  return info.skinfolds.reduce((acc, k) => acc + (sf[k] ?? 0), 0);
}

// ─── Classificação do % de gordura (ACSM) ────────────────────────────────────
export interface FatClassification {
  label: string;
  color: string;
}

export function classifyBodyFat(fatPct: number, gender: "M" | "F"): FatClassification {
  if (gender === "M") {
    if (fatPct < 6)  return { label: "Abaixo do essencial", color: "text-blue-600" };
    if (fatPct < 14) return { label: "Atleta",              color: "text-green-600" };
    if (fatPct < 18) return { label: "Fitness",             color: "text-emerald-600" };
    if (fatPct < 25) return { label: "Aceitável",           color: "text-yellow-600" };
    return               { label: "Obesidade",              color: "text-red-600" };
  } else {
    if (fatPct < 14) return { label: "Abaixo do essencial", color: "text-blue-600" };
    if (fatPct < 21) return { label: "Atleta",              color: "text-green-600" };
    if (fatPct < 25) return { label: "Fitness",             color: "text-emerald-600" };
    if (fatPct < 32) return { label: "Aceitável",           color: "text-yellow-600" };
    return               { label: "Obesidade",              color: "text-red-600" };
  }
}

// ─── Sugestão de protocolos compatíveis com o gênero (para UI opcional) ───────
export function protocolsForGender(gender: "M" | "F" | string): ProtocolInfo[] {
  return PROTOCOLS.filter(p => !p.gender || p.gender === gender);
}

// ─── Antropometria do Braço (AMB / AGB) ──────────────────────────────────────
// Referências: Jelliffe (1966), Heymsfield et al. (1982), Frisancho (1981/1990)
//   cb_cm  — Circunferência do Braço relaxado (cm)  → campo arm_relax_r
//   pct_mm — Prega Cutânea Tricipital (mm)          → campo sf_triceps

export interface ArmAnthropometry {
  ab:   number;  // Área do Braço (cm²)
  cmb:  number;  // Circunferência Muscular do Braço (cm)
  amb:  number;  // Área Muscular do Braço — Jelliffe (cm²)
  ambc: number;  // AMB Corrigida — Heymsfield (cm²)
  agb:  number;  // Área Gordurosa do Braço (cm²)
}

export function calcArmAnthropometry(
  cb_cm: number,
  pct_mm: number,
  gender: "M" | "F",
): ArmAnthropometry | null {
  if (cb_cm <= 0 || pct_mm <= 0) return null;
  const pct_cm   = pct_mm / 10;
  const ab       = Math.pow(cb_cm, 2) / (4 * Math.PI);
  const cmb      = cb_cm - Math.PI * pct_cm;
  const amb      = Math.pow(cmb, 2) / (4 * Math.PI);
  const correction = gender === "M" ? 10 : 6.5;
  const ambc     = Math.max(0, amb - correction);
  const agb      = Math.max(0, ab - amb);
  return {
    ab:   parseFloat(ab.toFixed(2)),
    cmb:  parseFloat(cmb.toFixed(2)),
    amb:  parseFloat(amb.toFixed(2)),
    ambc: parseFloat(ambc.toFixed(2)),
    agb:  parseFloat(agb.toFixed(2)),
  };
}

// ─── Adequação da AMBc (Frisancho, 1990) ─────────────────────────────────────
const AMBc_REF_M: Array<{ maxAge: number; ref: number }> = [
  { maxAge: 24, ref: 52.0 },
  { maxAge: 34, ref: 54.0 },
  { maxAge: 44, ref: 53.0 },
  { maxAge: 54, ref: 51.0 },
  { maxAge: 64, ref: 48.0 },
  { maxAge: 99, ref: 44.0 },
];
const AMBc_REF_F: Array<{ maxAge: number; ref: number }> = [
  { maxAge: 24, ref: 32.0 },
  { maxAge: 34, ref: 34.0 },
  { maxAge: 44, ref: 35.0 },
  { maxAge: 54, ref: 35.0 },
  { maxAge: 64, ref: 33.0 },
  { maxAge: 99, ref: 31.0 },
];

export interface AmbcAdequacy {
  pct:   number;
  label: string;
  color: string;
}

export function classifyAmbc(ambc: number, gender: "M" | "F", age: number): AmbcAdequacy {
  const table = gender === "M" ? AMBc_REF_M : AMBc_REF_F;
  const ref   = table.find(r => age <= r.maxAge)?.ref ?? table[table.length - 1].ref;
  const pct   = parseFloat(((ambc / ref) * 100).toFixed(1));
  if (pct > 90) return { pct, label: "Normal",            color: "text-green-600" };
  if (pct > 75) return { pct, label: "Depleção Leve",     color: "text-yellow-600" };
  if (pct > 50) return { pct, label: "Depleção Moderada", color: "text-orange-600" };
  return             { pct, label: "Depleção Grave",      color: "text-red-600" };
}
