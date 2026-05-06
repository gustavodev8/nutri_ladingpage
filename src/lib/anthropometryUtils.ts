// ─── Protocolo de cálculo de composição corporal ──────────────────────────────
// Referências:
//   Jackson & Pollock (1978) — 3 dobras masculino
//   Jackson, Pollock & Ward (1980) — 3 dobras feminino
//   Jackson & Pollock (1978) — 7 dobras (ambos os sexos)
//   Guedes (1985) — protocolo brasileiro (3 dobras)
//   Equação de Siri (1961): %G = (495 / DC) - 450

export type SkinfoldProtocol = "JP3M" | "JP3F" | "JP7M" | "JP7F" | "GUEDES_M" | "GUEDES_F";

export interface ProtocolInfo {
  id: SkinfoldProtocol;
  label: string;
  gender: "M" | "F";
  skinfolds: SkinfoldKey[];
  description: string;
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
  {
    id: "JP3M",
    label: "Jackson & Pollock — 3 pregas (Masc.)",
    gender: "M",
    skinfolds: ["sf_pectoral", "sf_abdominal", "sf_thigh_sf"],
    description: "Peitoral + Abdominal + Coxa",
  },
  {
    id: "JP3F",
    label: "Jackson & Pollock — 3 pregas (Fem.)",
    gender: "F",
    skinfolds: ["sf_triceps", "sf_suprailiac", "sf_thigh_sf"],
    description: "Tríceps + Suprailíaca + Coxa",
  },
  {
    id: "JP7M",
    label: "Jackson & Pollock — 7 pregas (Masc.)",
    gender: "M",
    skinfolds: ["sf_pectoral", "sf_midaxillary", "sf_triceps", "sf_subscapular", "sf_suprailiac", "sf_abdominal", "sf_thigh_sf"],
    description: "Peitoral + Axilar Média + Tríceps + Subescapular + Suprailíaca + Abdominal + Coxa",
  },
  {
    id: "JP7F",
    label: "Jackson & Pollock — 7 pregas (Fem.)",
    gender: "F",
    skinfolds: ["sf_pectoral", "sf_midaxillary", "sf_triceps", "sf_subscapular", "sf_suprailiac", "sf_abdominal", "sf_thigh_sf"],
    description: "Peitoral + Axilar Média + Tríceps + Subescapular + Suprailíaca + Abdominal + Coxa",
  },
  {
    id: "GUEDES_M",
    label: "Guedes — 3 pregas (Masc.)",
    gender: "M",
    skinfolds: ["sf_triceps", "sf_subscapular", "sf_suprailiac"],
    description: "Tríceps + Subescapular + Suprailíaca",
  },
  {
    id: "GUEDES_F",
    label: "Guedes — 3 pregas (Fem.)",
    gender: "F",
    skinfolds: ["sf_triceps", "sf_subscapular", "sf_suprailiac"],
    description: "Tríceps + Subescapular + Suprailíaca",
  },
];

export type SkinfoldValues = Partial<Record<SkinfoldKey, number>>;

// ─── Equação de Siri ──────────────────────────────────────────────────────────
function siri(density: number): number {
  return (495 / density) - 450;
}

// ─── Jackson & Pollock 3 pregas — Masculino ───────────────────────────────────
// Dobras: peitoral + abdominal + coxa
// Pollock et al., 1978
function jp3Male(sf: SkinfoldValues, age: number): { density: number; fatPct: number } | null {
  const s = (sf.sf_pectoral ?? 0) + (sf.sf_abdominal ?? 0) + (sf.sf_thigh_sf ?? 0);
  if (s <= 0) return null;
  const density = 1.10938 - 0.0008267 * s + 0.0000016 * s * s - 0.0002574 * age;
  return { density, fatPct: Math.max(0, siri(density)) };
}

// ─── Jackson & Pollock 3 pregas — Feminino ────────────────────────────────────
// Dobras: tríceps + suprailíaca + coxa
// Jackson, Pollock & Ward, 1980
function jp3Female(sf: SkinfoldValues, age: number): { density: number; fatPct: number } | null {
  const s = (sf.sf_triceps ?? 0) + (sf.sf_suprailiac ?? 0) + (sf.sf_thigh_sf ?? 0);
  if (s <= 0) return null;
  const density = 1.0994921 - 0.0009929 * s + 0.0000023 * s * s - 0.0001392 * age;
  return { density, fatPct: Math.max(0, siri(density)) };
}

// ─── Jackson & Pollock 7 pregas — Masculino ───────────────────────────────────
// Dobras: peitoral + axilar média + tríceps + subescapular + suprailíaca + abdominal + coxa
function jp7Male(sf: SkinfoldValues, age: number): { density: number; fatPct: number } | null {
  const s =
    (sf.sf_pectoral ?? 0) + (sf.sf_midaxillary ?? 0) + (sf.sf_triceps ?? 0) +
    (sf.sf_subscapular ?? 0) + (sf.sf_suprailiac ?? 0) + (sf.sf_abdominal ?? 0) +
    (sf.sf_thigh_sf ?? 0);
  if (s <= 0) return null;
  const density = 1.112 - 0.00043499 * s + 0.00000055 * s * s - 0.00028826 * age;
  return { density, fatPct: Math.max(0, siri(density)) };
}

// ─── Jackson & Pollock 7 pregas — Feminino ────────────────────────────────────
function jp7Female(sf: SkinfoldValues, age: number): { density: number; fatPct: number } | null {
  const s =
    (sf.sf_pectoral ?? 0) + (sf.sf_midaxillary ?? 0) + (sf.sf_triceps ?? 0) +
    (sf.sf_subscapular ?? 0) + (sf.sf_suprailiac ?? 0) + (sf.sf_abdominal ?? 0) +
    (sf.sf_thigh_sf ?? 0);
  if (s <= 0) return null;
  const density = 1.097 - 0.00046971 * s + 0.00000056 * s * s - 0.00012828 * age;
  return { density, fatPct: Math.max(0, siri(density)) };
}

// ─── Guedes (1985) — Masculino ────────────────────────────────────────────────
// Dobras: tríceps + subescapular + suprailíaca
function guedesMale(sf: SkinfoldValues): { density: number; fatPct: number } | null {
  const s = (sf.sf_triceps ?? 0) + (sf.sf_subscapular ?? 0) + (sf.sf_suprailiac ?? 0);
  if (s <= 0) return null;
  const density = 1.1765 - 0.0744 * Math.log10(s);
  return { density, fatPct: Math.max(0, siri(density)) };
}

// ─── Guedes (1985) — Feminino ─────────────────────────────────────────────────
// Dobras: tríceps + subescapular + suprailíaca
function guedesFemale(sf: SkinfoldValues): { density: number; fatPct: number } | null {
  const s = (sf.sf_triceps ?? 0) + (sf.sf_subscapular ?? 0) + (sf.sf_suprailiac ?? 0);
  if (s <= 0) return null;
  const density = 1.1665 - 0.0706 * Math.log10(s);
  return { density, fatPct: Math.max(0, siri(density)) };
}

// ─── Dispatcher principal ─────────────────────────────────────────────────────
export function calcBodyFat(
  protocol: SkinfoldProtocol,
  sf: SkinfoldValues,
  age: number
): { density: number; fatPct: number } | null {
  switch (protocol) {
    case "JP3M":     return jp3Male(sf, age);
    case "JP3F":     return jp3Female(sf, age);
    case "JP7M":     return jp7Male(sf, age);
    case "JP7F":     return jp7Female(sf, age);
    case "GUEDES_M": return guedesMale(sf);
    case "GUEDES_F": return guedesFemale(sf);
    default:         return null;
  }
}

// ─── Verifica se todas as dobras obrigatórias do protocolo estão preenchidas ──
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

// ─── Sugestão automática de protocolos compatíveis com o gênero ───────────────
export function protocolsForGender(gender: "M" | "F" | string): ProtocolInfo[] {
  return PROTOCOLS.filter(p => p.gender === gender);
}

// ─── Antropometria do Braço (AMB / AGB) ──────────────────────────────────────
// Referências:
//   Jelliffe (1966) — CMB e AMB originais
//   Heymsfield et al. (1982) — AMB corrigida (AMBc)
//   Frisancho (1981/1990) — percentis de referência NHANES
//
// Entradas:
//   cb_cm  — Circunferência do Braço relaxado (cm)   → campo arm_relax_r
//   pct_mm — Prega Cutânea Tricipital (mm)           → campo sf_triceps

export interface ArmAnthropometry {
  ab: number;    // Área do Braço (cm²)
  cmb: number;   // Circunferência Muscular do Braço (cm)
  amb: number;   // Área Muscular do Braço — Jelliffe (cm²)
  ambc: number;  // AMB Corrigida — Heymsfield (cm²)
  agb: number;   // Área Gordurosa do Braço (cm²)
}

export function calcArmAnthropometry(
  cb_cm: number,
  pct_mm: number,
  gender: "M" | "F"
): ArmAnthropometry | null {
  if (cb_cm <= 0 || pct_mm <= 0) return null;

  const pct_cm = pct_mm / 10;

  // Área total do braço
  const ab = Math.pow(cb_cm, 2) / (4 * Math.PI);

  // Circunferência Muscular do Braço
  const cmb = cb_cm - Math.PI * pct_cm;

  // Área Muscular do Braço (Jelliffe, 1966)
  const amb = Math.pow(cmb, 2) / (4 * Math.PI);

  // AMB Corrigida (Heymsfield et al., 1982)
  const correction = gender === "M" ? 10 : 6.5;
  const ambc = Math.max(0, amb - correction);

  // Área Gordurosa do Braço
  const agb = Math.max(0, ab - amb);

  return {
    ab:   parseFloat(ab.toFixed(2)),
    cmb:  parseFloat(cmb.toFixed(2)),
    amb:  parseFloat(amb.toFixed(2)),
    ambc: parseFloat(ambc.toFixed(2)),
    agb:  parseFloat(agb.toFixed(2)),
  };
}

// ─── Adequação da AMBc (Frisancho, 1990) ─────────────────────────────────────
// Compara AMBc do paciente com valor de referência da tabela NHANES por sexo/faixa etária.
// Referência simplificada (adultos 18–74 anos, percentil 50):
//   Homens: ~40–54 cm² (pico 25–34 anos ≈ 54 cm²)
//   Mulheres: ~28–38 cm² (pico 25–34 anos ≈ 38 cm²)
// Usamos médias por faixa etária (valores simplificados — para triagem clínica).

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
  pct: number;       // adequação percentual (%)
  label: string;     // classificação textual
  color: string;     // Tailwind text color
}

export function classifyAmbc(ambc: number, gender: "M" | "F", age: number): AmbcAdequacy {
  const table = gender === "M" ? AMBc_REF_M : AMBc_REF_F;
  const ref = table.find(r => age <= r.maxAge)?.ref ?? table[table.length - 1].ref;
  const pct = parseFloat(((ambc / ref) * 100).toFixed(1));

  if (pct > 90)  return { pct, label: "Normal",             color: "text-green-600" };
  if (pct > 75)  return { pct, label: "Depleção Leve",      color: "text-yellow-600" };
  if (pct > 50)  return { pct, label: "Depleção Moderada",  color: "text-orange-600" };
  return              { pct, label: "Depleção Grave",       color: "text-red-600" };
}
