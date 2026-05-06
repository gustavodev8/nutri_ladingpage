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
