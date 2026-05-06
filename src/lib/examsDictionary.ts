// ─── Dicionário de exames laboratoriais com referências padrão ────────────────
// Valores de referência baseados nas diretrizes SBD, SBC, SBNefrologia e SBPC/ML.
// Nota: algumas referências variam por gênero — use ref_min/ref_max do dicionário
// como ponto de partida; o profissional pode ajustar manualmente no sistema.

export interface ExamRef {
  name: string;
  unit: string;
  ref_min?: number;
  ref_max?: number;
  ref_text?: string;           // para exames qualitativos (reagente/não reagente)
  critical_low?: number;       // valor abaixo do qual é crítico
  critical_high?: number;      // valor acima do qual é crítico
  category: ExamCategory;
  hint?: string;               // orientação clínica resumida
}

export type ExamCategory =
  | "Glicídios"
  | "Lipídios"
  | "Função Hepática"
  | "Função Renal"
  | "Hematologia"
  | "Tireoide"
  | "Hormônios"
  | "Vitaminas e Minerais"
  | "Inflamação"
  | "Proteínas"
  | "Eletrólitos"
  | "Outros";

export const EXAM_CATEGORIES: ExamCategory[] = [
  "Glicídios", "Lipídios", "Função Hepática", "Função Renal",
  "Hematologia", "Tireoide", "Hormônios", "Vitaminas e Minerais",
  "Inflamação", "Proteínas", "Eletrólitos", "Outros",
];

export const EXAMS_DICTIONARY: ExamRef[] = [
  // ── Glicídios ──────────────────────────────────────────────────────────────
  {
    name: "Glicemia de Jejum",        unit: "mg/dL",  ref_min: 70,   ref_max: 99,
    critical_low: 50, critical_high: 500,
    category: "Glicídios",
    hint: "100–125: pré-diabetes. ≥126: diabetes (confirmar com 2ª coleta).",
  },
  {
    name: "Hemoglobina Glicada (HbA1c)", unit: "%",   ref_max: 5.7,
    critical_high: 10,
    category: "Glicídios",
    hint: "5,7–6,4%: pré-diabetes. ≥6,5%: diabetes. Meta terapêutica usual: <7%.",
  },
  {
    name: "Insulina de Jejum",         unit: "µUI/mL", ref_min: 2,  ref_max: 25,
    category: "Glicídios",
    hint: "Elevada sugere resistência à insulina. Calcular HOMA-IR = (glicemia × insulina) / 405.",
  },
  {
    name: "HOMA-IR",                   unit: "",        ref_max: 2.7,
    category: "Glicídios",
    hint: ">2,7 indica resistência à insulina. Calcule: (Glicemia mg/dL × Insulina µUI/mL) / 405.",
  },
  {
    name: "Frutosamina",               unit: "µmol/L", ref_min: 205, ref_max: 285,
    category: "Glicídios",
    hint: "Reflete controle glicêmico das últimas 2–3 semanas.",
  },

  // ── Lipídios ───────────────────────────────────────────────────────────────
  {
    name: "Colesterol Total",          unit: "mg/dL",  ref_max: 200,
    critical_high: 400,
    category: "Lipídios",
    hint: "200–239: limítrofe. ≥240: alto. Avaliar sempre em conjunto com HDL e LDL.",
  },
  {
    name: "HDL-Colesterol",            unit: "mg/dL",  ref_min: 40,
    category: "Lipídios",
    hint: "Fator protetor. Homens: >40 mg/dL; Mulheres: >50 mg/dL. <40: risco aumentado.",
  },
  {
    name: "LDL-Colesterol",            unit: "mg/dL",  ref_max: 130,
    critical_high: 190,
    category: "Lipídios",
    hint: "Meta varia com risco CV: baixo <130, moderado <100, alto <70 mg/dL.",
  },
  {
    name: "VLDL-Colesterol",           unit: "mg/dL",  ref_max: 30,
    category: "Lipídios",
  },
  {
    name: "Triglicerídeos",            unit: "mg/dL",  ref_max: 150,
    critical_high: 500,
    category: "Lipídios",
    hint: "150–199: limítrofe. 200–499: alto. ≥500: risco de pancreatite.",
  },
  {
    name: "Apolipoproteína B (ApoB)",  unit: "mg/dL",  ref_max: 100,
    category: "Lipídios",
  },

  // ── Função Hepática ────────────────────────────────────────────────────────
  {
    name: "TGO (AST)",                 unit: "U/L",    ref_max: 40,
    critical_high: 400,
    category: "Função Hepática",
    hint: "Elevada em hepatite, isquemia hepática e lesão muscular intensa.",
  },
  {
    name: "TGP (ALT)",                 unit: "U/L",    ref_max: 56,
    critical_high: 400,
    category: "Função Hepática",
    hint: "Mais específica para fígado. Elevação sugere lesão hepatocelular.",
  },
  {
    name: "Gama-GT (GGT)",             unit: "U/L",    ref_max: 60,
    category: "Função Hepática",
    hint: "Sensível para colestase e uso de álcool. Elevada isolada: monitorar.",
  },
  {
    name: "Fosfatase Alcalina (FA)",   unit: "U/L",    ref_min: 44, ref_max: 147,
    category: "Função Hepática",
  },
  {
    name: "Bilirrubina Total",         unit: "mg/dL",  ref_max: 1.2,
    category: "Função Hepática",
  },
  {
    name: "Bilirrubina Direta",        unit: "mg/dL",  ref_max: 0.4,
    category: "Função Hepática",
  },

  // ── Função Renal ───────────────────────────────────────────────────────────
  {
    name: "Creatinina",                unit: "mg/dL",  ref_min: 0.7, ref_max: 1.3,
    critical_high: 10,
    category: "Função Renal",
    hint: "Homens: 0,7–1,3; Mulheres: 0,6–1,1 mg/dL. Ajustar referência por gênero.",
  },
  {
    name: "Ureia",                     unit: "mg/dL",  ref_min: 15,  ref_max: 50,
    critical_high: 200,
    category: "Função Renal",
  },
  {
    name: "Ácido Úrico",               unit: "mg/dL",  ref_min: 2.4, ref_max: 7.0,
    critical_high: 12,
    category: "Função Renal",
    hint: "Homens: 3,4–7,0; Mulheres: 2,4–6,0 mg/dL. >7,0 predispõe a gota.",
  },
  {
    name: "Taxa de Filtração Glomerular (TFG)", unit: "mL/min/1,73m²", ref_min: 60,
    critical_low: 15,
    category: "Função Renal",
    hint: "60–89: estágio G2 (levemente reduzida). <60: suspeitar DRC.",
  },

  // ── Hematologia ────────────────────────────────────────────────────────────
  {
    name: "Hemoglobina",               unit: "g/dL",   ref_min: 12.0, ref_max: 17.5,
    critical_low: 7, critical_high: 20,
    category: "Hematologia",
    hint: "Homens: 13,5–17,5; Mulheres: 12,0–16,0 g/dL.",
  },
  {
    name: "Hematócrito",               unit: "%",       ref_min: 36,   ref_max: 53,
    category: "Hematologia",
    hint: "Homens: 41–53%; Mulheres: 36–46%.",
  },
  {
    name: "VCM (Volume Corpuscular Médio)", unit: "fL", ref_min: 80, ref_max: 100,
    category: "Hematologia",
    hint: "<80: microcítico (pensar anemia ferropriva). >100: macrocítico (pensar B12/folato).",
  },
  {
    name: "Leucócitos Totais",         unit: "/mm³",   ref_min: 4000, ref_max: 11000,
    critical_low: 2000, critical_high: 30000,
    category: "Hematologia",
  },
  {
    name: "Plaquetas",                 unit: "/mm³",   ref_min: 150000, ref_max: 400000,
    critical_low: 50000, critical_high: 1000000,
    category: "Hematologia",
  },
  {
    name: "Ferritina",                 unit: "ng/mL",  ref_min: 12, ref_max: 300,
    category: "Hematologia",
    hint: "Homens: 12–300; Mulheres: 12–150 ng/mL. <12: depleção de estoques de ferro.",
  },
  {
    name: "Ferro Sérico",              unit: "µg/dL",  ref_min: 50,  ref_max: 175,
    category: "Hematologia",
    hint: "Homens: 65–175; Mulheres: 50–170 µg/dL.",
  },
  {
    name: "Transferrina",              unit: "mg/dL",  ref_min: 200, ref_max: 360,
    category: "Hematologia",
  },
  {
    name: "Saturação de Transferrina", unit: "%",       ref_min: 20,  ref_max: 50,
    category: "Hematologia",
  },

  // ── Tireoide ───────────────────────────────────────────────────────────────
  {
    name: "TSH",                       unit: "mUI/L",  ref_min: 0.4, ref_max: 4.0,
    critical_low: 0.01, critical_high: 20,
    category: "Tireoide",
    hint: "<0,4: hipotireoidismo. >4,0: hipotireoidismo. Meta em tratamento: 0,5–2,5.",
  },
  {
    name: "T4 Livre",                  unit: "ng/dL",  ref_min: 0.8, ref_max: 1.8,
    category: "Tireoide",
  },
  {
    name: "T3 Total",                  unit: "ng/dL",  ref_min: 80,  ref_max: 200,
    category: "Tireoide",
  },
  {
    name: "Anti-TPO",                  unit: "UI/mL",  ref_max: 35,
    category: "Tireoide",
    hint: "Elevado sugere tireoidite autoimune (Hashimoto).",
  },

  // ── Hormônios ──────────────────────────────────────────────────────────────
  {
    name: "Cortisol (manhã)",          unit: "µg/dL",  ref_min: 6.0, ref_max: 23.0,
    category: "Hormônios",
    hint: "Coletar entre 7h–9h. Baixo sugere insuficiência adrenal.",
  },
  {
    name: "Testosterona Total",        unit: "ng/dL",  ref_min: 270, ref_max: 1070,
    category: "Hormônios",
    hint: "Homens: 270–1070; Mulheres: 15–70 ng/dL.",
  },
  {
    name: "DHEA-S",                    unit: "µg/dL",  ref_min: 80,  ref_max: 560,
    category: "Hormônios",
  },
  {
    name: "IGF-1",                     unit: "ng/mL",  ref_min: 100, ref_max: 300,
    category: "Hormônios",
    hint: "Varia com idade. Reflete secreção de GH.",
  },

  // ── Vitaminas e Minerais ───────────────────────────────────────────────────
  {
    name: "Vitamina D (25-OH)",        unit: "ng/mL",  ref_min: 30,  ref_max: 100,
    critical_low: 10,
    category: "Vitaminas e Minerais",
    hint: "<20: deficiente. 20–29: insuficiente. 30–100: suficiente. Meta imunológica: >40.",
  },
  {
    name: "Vitamina B12",              unit: "pg/mL",  ref_min: 200, ref_max: 900,
    critical_low: 100,
    category: "Vitaminas e Minerais",
    hint: "<200: deficiência. 200–300: zona cinza (avaliar sintomas).",
  },
  {
    name: "Folato (Ácido Fólico)",     unit: "ng/mL",  ref_min: 4.0,
    category: "Vitaminas e Minerais",
  },
  {
    name: "Magnésio",                  unit: "mg/dL",  ref_min: 1.7, ref_max: 2.2,
    critical_low: 1.0, critical_high: 4.0,
    category: "Vitaminas e Minerais",
    hint: "Deficiência comum e subdiagnosticada; associada a cãibras, fadiga e resistência à insulina.",
  },
  {
    name: "Zinco",                     unit: "µg/dL",  ref_min: 70,  ref_max: 120,
    category: "Vitaminas e Minerais",
  },
  {
    name: "Selênio",                   unit: "µg/L",   ref_min: 70,  ref_max: 150,
    category: "Vitaminas e Minerais",
  },
  {
    name: "Cobre",                     unit: "µg/dL",  ref_min: 70,  ref_max: 140,
    category: "Vitaminas e Minerais",
  },

  // ── Inflamação ─────────────────────────────────────────────────────────────
  {
    name: "PCR Ultrassensível",        unit: "mg/L",   ref_max: 1.0,
    critical_high: 10,
    category: "Inflamação",
    hint: "<1,0: baixo risco CV. 1–3: risco moderado. >3: alto risco. >10: provável infecção/inflamação aguda.",
  },
  {
    name: "VHS (Velocidade de Hemossedimentação)", unit: "mm/h", ref_max: 20,
    category: "Inflamação",
  },
  {
    name: "Interleucina-6 (IL-6)",     unit: "pg/mL",  ref_max: 7.0,
    category: "Inflamação",
  },
  {
    name: "Homocisteína",              unit: "µmol/L", ref_max: 15,
    critical_high: 50,
    category: "Inflamação",
    hint: ">15: hiperhomocisteinemia. Associada a risco CV e deficiência de B12/B6/folato.",
  },

  // ── Proteínas ─────────────────────────────────────────────────────────────
  {
    name: "Albumina",                  unit: "g/dL",   ref_min: 3.5, ref_max: 5.0,
    critical_low: 2.5,
    category: "Proteínas",
    hint: "<3,5: hipoalbuminemia. Associada à desnutrição proteica e inflamação crônica.",
  },
  {
    name: "Proteínas Totais",          unit: "g/dL",   ref_min: 6.0, ref_max: 8.3,
    category: "Proteínas",
  },
  {
    name: "Pré-Albumina (Transtirretina)", unit: "mg/dL", ref_min: 16, ref_max: 35,
    critical_low: 5,
    category: "Proteínas",
    hint: "Marcador sensível de estado nutricional proteico (meia-vida de 2–3 dias).",
  },

  // ── Eletrólitos ────────────────────────────────────────────────────────────
  {
    name: "Sódio",                     unit: "mEq/L",  ref_min: 135, ref_max: 145,
    critical_low: 120, critical_high: 160,
    category: "Eletrólitos",
  },
  {
    name: "Potássio",                  unit: "mEq/L",  ref_min: 3.5, ref_max: 5.0,
    critical_low: 2.5, critical_high: 6.5,
    category: "Eletrólitos",
    hint: "<3,5: hipocalemia (risco de arritmia). >5,0: hipercalemia.",
  },
  {
    name: "Cálcio Total",              unit: "mg/dL",  ref_min: 8.5, ref_max: 10.5,
    critical_low: 6.0, critical_high: 14.0,
    category: "Eletrólitos",
  },
  {
    name: "Fósforo",                   unit: "mg/dL",  ref_min: 2.5, ref_max: 4.5,
    category: "Eletrólitos",
  },

  // ── Outros ─────────────────────────────────────────────────────────────────
  {
    name: "Vitamina A (Retinol)",      unit: "µg/dL",  ref_min: 20,  ref_max: 80,
    category: "Outros",
  },
  {
    name: "Ácido Lático",              unit: "mmol/L", ref_min: 0.5, ref_max: 2.2,
    critical_high: 5,
    category: "Outros",
  },
];

// ─── Lookup por nome ──────────────────────────────────────────────────────────
export function findExam(name: string): ExamRef | undefined {
  return EXAMS_DICTIONARY.find(
    e => e.name.toLowerCase() === name.toLowerCase()
  );
}

// ─── Busca parcial para autocomplete ─────────────────────────────────────────
export function searchExams(query: string): ExamRef[] {
  if (!query.trim()) return EXAMS_DICTIONARY;
  const q = query.toLowerCase();
  return EXAMS_DICTIONARY.filter(e =>
    e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)
  );
}

// ─── Determina o status do resultado ─────────────────────────────────────────
export type ResultStatus = "normal" | "alto" | "baixo" | "critico_alto" | "critico_baixo";

export function calcStatus(value: number, ref: ExamRef): ResultStatus {
  if (ref.critical_low  != null && value <= ref.critical_low)  return "critico_baixo";
  if (ref.critical_high != null && value >= ref.critical_high) return "critico_alto";
  if (ref.ref_min != null && value < ref.ref_min) return "baixo";
  if (ref.ref_max != null && value > ref.ref_max) return "alto";
  return "normal";
}

export const STATUS_CONFIG: Record<ResultStatus, { label: string; badge: string; dot: string }> = {
  normal:       { label: "Normal",   badge: "bg-green-50 text-green-700 border-green-200",   dot: "bg-green-500"  },
  alto:         { label: "Alto",     badge: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  baixo:        { label: "Baixo",    badge: "bg-blue-50 text-blue-700 border-blue-200",       dot: "bg-blue-500"   },
  critico_alto: { label: "↑ Crítico",badge: "bg-red-50 text-red-700 border-red-200",          dot: "bg-red-600"    },
  critico_baixo:{ label: "↓ Crítico",badge: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-600" },
};
