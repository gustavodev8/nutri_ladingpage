// ─── Motor de Alertas Clínicos ────────────────────────────────────────────────
// Lê primeiro structured_data (Epic 6) e cai no legacy regex apenas como fallback.

import type { Anamnesis, Measurement } from "@/lib/supabase";

export type AlertSeverity = "danger" | "warning" | "info";

export interface ClinicalAlert {
  id: string;
  type: AlertSeverity;
  category: string;
  message: string;
}

// Busca case-insensitive/accent-insensitive em campo de texto (fallback legacy)
const has = (field: string | undefined | null, ...terms: string[]): boolean => {
  if (!field) return false;
  const lower = field.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return terms.some((t) =>
    lower.includes(t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""))
  );
};

// ─── Gerador principal ────────────────────────────────────────────────────────

export function generateClinicalAlerts(
  anamnesis: Anamnesis | null,
  lastMeasurement?: Measurement | null
): ClinicalAlert[] {
  const alerts: ClinicalAlert[] = [];
  const a  = anamnesis;
  const sd = a?.structured_data;   // structured_data (Epic 6)
  const m  = lastMeasurement;

  if (!a && !m) return alerts;

  // ── DANGER ────────────────────────────────────────────────────────────────

  // 1. Alergias / intolerâncias
  const allergyText =
    sd?.clinical_allergies?.trim() ||
    a?.allergies?.trim();
  if (allergyText) {
    alerts.push({
      id: "allergy",
      type: "danger",
      category: "Alergia / Intolerância",
      message: `Paciente relata: "${allergyText}". Verificar todos os alimentos do plano antes de prescrever.`,
    });
  }

  // 2. Aversões alimentares
  const aversionText =
    sd?.clinical_food_aversions?.trim() ||
    sd?.diet_aversions?.trim() ||
    a?.food_aversions?.trim();
  if (aversionText) {
    alerts.push({
      id: "aversion",
      type: "danger",
      category: "Aversão Alimentar",
      message: `Alimentos rejeitados: "${aversionText}". Evitar incluir no cardápio.`,
    });
  }

  // ── WARNING ───────────────────────────────────────────────────────────────

  // 3. Hipertensão arterial
  const hasHypertension = sd
    ? sd.clinical_hypertension === true
    : has(a?.medical_history, "hipertensao", "pressao alta", "hás", "has") ||
      has(a?.medications, "losartana", "enalapril", "captopril", "amlodipina", "atenolol", "carvedilol", "hidroclorotiazida");
  if (hasHypertension) {
    alerts.push({
      id: "hypertension",
      type: "warning",
      category: "Hipertensão Arterial",
      message:
        "Limitar sódio a ≤ 2.000 mg/dia (≈ 5 g de sal). Priorizar potássio (banana, feijão, abacate) e magnésio. Evitar embutidos, enlatados e ultraprocessados.",
    });
  }

  // 4. Diabetes / resistência à insulina
  const hasDiabetes = sd
    ? sd.clinical_diabetes === true
    : has(a?.medical_history, "diabetes", "diabete", "glicemia", "resistencia insulina", "pre-diabetes", "sindrome metabolica") ||
      has(a?.medications, "metformina", "insulina", "glicazida", "glibenclamida", "sitagliptina", "dapagliflozina");
  if (hasDiabetes) {
    alerts.push({
      id: "diabetes",
      type: "warning",
      category: "Diabetes / Glicemia",
      message:
        "Controlar carga e índice glicêmico. Distribuir carboidratos ao longo do dia. Priorizar fibras (≥ 30 g/dia), gorduras boas e proteínas para atenuar picos glicêmicos.",
    });
  }

  // 5. Constipação intestinal
  const hasConstipation = sd
    ? sd.habit_bowel === "preso"
    : has(a?.bowel_function, "preso", "constipacao", "ressecado", "ruim", "dificuldade", "lento", "irregular", "nao funciona");
  if (hasConstipation) {
    alerts.push({
      id: "constipation",
      type: "warning",
      category: "Constipação Intestinal",
      message:
        "Meta de fibras: ≥ 30 g/dia (frutas com casca, aveia, leguminosas, vegetais folhosos). Hidratação: ≥ 35 ml/kg/dia. Considerar prebióticos (frutooligossacarídeos).",
    });
  }

  // 6. Diarreia / intestino acelerado
  const hasDiarrhea = sd
    ? sd.habit_bowel === "solto"
    : has(a?.bowel_function, "diarreia", "solto", "acelerado", "mais de 3 vezes", "urgencia");
  if (hasDiarrhea) {
    alerts.push({
      id: "diarrhea",
      type: "warning",
      category: "Intestino Acelerado",
      message:
        "Reduzir fibras insolúveis e lactose temporariamente. Priorizar alimentos de fácil digestão. Reforçar reposição de eletrólitos. Investigar SIBO ou intolerâncias.",
    });
  }

  // 7. Dislipidemia
  const hasDyslipidemia = sd
    ? sd.clinical_dyslipidemia === true
    : has(a?.medical_history, "colesterol", "triglicerides", "dislipidemia", "ldl alto", "hdl baixo") ||
      has(a?.medications, "sinvastatina", "atorvastatina", "rosuvastatina", "ezetimiba", "fenofibrato");
  if (hasDyslipidemia) {
    alerts.push({
      id: "dyslipidemia",
      type: "warning",
      category: "Dislipidemia",
      message:
        "Reduzir gordura saturada (< 10% VET) e trans. Aumentar ômega-3 (salmão, sardinha, linhaça), fibras solúveis (aveia, maçã) e fitoesteróis.",
    });
  }

  // 8. Hipotireoidismo
  const hasHypothyroidism = sd
    ? sd.clinical_hypothyroidism === true
    : has(a?.medical_history, "hipotireoidismo", "tireoide", "hashimoto") ||
      has(a?.medications, "levotiroxina", "synthroid", "puran");
  if (hasHypothyroidism) {
    alerts.push({
      id: "hypothyroidism",
      type: "warning",
      category: "Hipotireoidismo",
      message:
        "Metabolismo basal possivelmente reduzido. Atenção ao iodo (algas, frutos do mar) e selênio (castanha-do-pará: 1–2 unid./dia). Evitar excesso de bociogênicos crus se TSH elevado.",
    });
  }

  // 9. Gordura visceral elevada (measurement)
  if (m?.visceral_fat != null && m.visceral_fat > 12) {
    alerts.push({
      id: "visceral_fat",
      type: "warning",
      category: "Gordura Visceral Elevada",
      message: `Gordura visceral: ${m.visceral_fat} (referência: ≤ 12). Priorizar déficit calórico moderado, exercício aeróbico e redução de açúcares simples e álcool.`,
    });
  }

  // 10. SOP
  const hasPcos = sd
    ? sd.clinical_pcos === true
    : has(a?.medical_history, "sop", "ovario policistico", "policistico") ||
      has(a?.medications, "metformina", "espironolactona", "acetato de ciproterona");
  if (hasPcos && !alerts.find((al) => al.id === "diabetes")) {
    alerts.push({
      id: "pcos",
      type: "warning",
      category: "SOP",
      message:
        "Priorizar low-glycemic eating (baixo IG). Distribuir refeições para evitar hiperinsulinemia. Atenção ao magnésio, inositol e vitamina D.",
    });
  }

  // ── INFO ──────────────────────────────────────────────────────────────────

  // 11. Sono insuficiente
  const sleepShort = sd
    ? sd.habit_sleep === "<5h" || sd.habit_sleep === "5-6h"
    : a?.sleep_hours != null && a.sleep_hours < 6;
  if (sleepShort) {
    const hoursLabel = sd?.habit_sleep ?? `${a?.sleep_hours}h`;
    alerts.push({
      id: "sleep",
      type: "info",
      category: "Sono Insuficiente",
      message: `Paciente dorme ${hoursLabel}/noite (recomendado: 7–9h). Privação de sono eleva cortisol, grelina e resistência à insulina. Sugerir higiene do sono e adaptar horários das refeições.`,
    });
  }

  // 12. Baixa ingestão de água
  const lowWater = sd
    ? sd.diet_water_liters === "<1L" || sd.diet_water_liters === "1-1.5L"
    : has(a?.water_intake, "pouco", "menos de 1", "1 litro", "1l", "500ml", "nao bebo", "raramente");
  if (lowWater) {
    alerts.push({
      id: "hydration",
      type: "info",
      category: "Hidratação Insuficiente",
      message:
        "Reforçar meta hídrica: ≥ 35 ml/kg/dia. Pode confundir sede com fome. Sugerir estratégias práticas (garrafa marcada, alarmes, água saborizada).",
    });
  }

  // 13. Sedentarismo
  const isSedentary = sd
    ? sd.training_active === false
    : has(a?.physical_activity, "sedentario", "nao pratica", "nenhum", "nao faz", "nunca", "nao faco");
  if (isSedentary) {
    alerts.push({
      id: "sedentary",
      type: "info",
      category: "Sedentarismo",
      message:
        "Paciente sedentário. Utilizar fator NAF 1.2 no cálculo do GET. Considerar incluir orientação de caminhada leve (150 min/semana) para potencializar o resultado.",
    });
  }

  // 14. Saúde mental / psicofármacos
  const hasMentalHealth = sd
    ? sd.clinical_mental_health === true
    : has(a?.medications, "fluoxetina", "sertralina", "escitalopram", "clonazepam", "alprazolam", "amitriptilina", "venlafaxina", "bupropiona") ||
      has(a?.medical_history, "ansiedade", "depressao", "transtorno de humor");
  if (hasMentalHealth) {
    alerts.push({
      id: "mental_health",
      type: "info",
      category: "Saúde Mental / Medicação",
      message:
        "Paciente pode apresentar alterações de apetite, compulsão ou aversão alimentar relacionadas ao quadro ou medicação. Avaliar comportamento alimentar com atenção.",
    });
  }

  // 15. Meta de emagrecimento vs gordura corporal já baixa
  const wantsWeightLoss = sd
    ? sd.goal_primary === "emagrecimento"
    : has(a?.main_complaint, "emagrecer", "perder peso", "barriga", "gordura");
  if (wantsWeightLoss && m?.body_fat != null && m.body_fat < 12) {
    alerts.push({
      id: "low_fat_request",
      type: "info",
      category: "Meta × Composição Atual",
      message: `Paciente deseja emagrecer, mas gordura corporal atual é ${m.body_fat}% — próxima do limite essencial. Avaliar se déficit calórico é adequado ou se foco deve ser recomposição.`,
    });
  }

  // ── INFO (novos alertas — apenas structured_data) ─────────────────────────

  // 16. Tabagismo
  if (sd?.habit_smokes === true) {
    alerts.push({
      id: "smoking",
      type: "info",
      category: "Tabagismo",
      message:
        "Tabagismo relatado. Aumentar antioxidantes (vitamina C, E, selênio). Nicotina pode suprimir apetite e mascarar déficits nutricionais.",
    });
  }

  // 17. Consumo frequente de álcool
  if (sd?.habit_alcohol === "frequente") {
    alerts.push({
      id: "alcohol",
      type: "info",
      category: "Álcool Frequente",
      message:
        "Consumo frequente de álcool relatado. Pode comprometer absorção de B1, B9, magnésio e zinco. Aumenta carga calórica e prejudica recuperação muscular.",
    });
  }

  // 18. Estresse elevado
  if (sd?.habit_stress === "alto") {
    alerts.push({
      id: "stress",
      type: "info",
      category: "Estresse Elevado",
      message:
        "Nível de estresse elevado. Cortisol crônico favorece catabolismo muscular e acúmulo de gordura visceral. Considerar adaptógenos (ashwagandha) e técnicas de manejo do estresse.",
    });
  }

  // 19. Histórico de anemia
  if (sd?.exam_anemia === true) {
    alerts.push({
      id: "anemia",
      type: "info",
      category: "Histórico de Anemia",
      message:
        "Priorizar ferro heme (carnes vermelhas, fígado) associado à vitamina C para melhor absorção. Investigar ferritina, hemoglobina e CTLF nos exames recentes.",
    });
  }

  // 20. B12 baixa
  if (sd?.exam_low_b12 === true) {
    alerts.push({
      id: "low_b12",
      type: "info",
      category: "Vitamina B12 Baixa",
      message:
        "Histórico de B12 baixa. Priorizar alimentos de origem animal (carnes, ovos, laticínios). Avaliar suplementação se vegetariano/vegano ou com má absorção.",
    });
  }

  // 21. Vitamina D baixa
  if (sd?.exam_low_vitd === true) {
    alerts.push({
      id: "low_vitd",
      type: "info",
      category: "Vitamina D Baixa",
      message:
        "Histórico de vitamina D baixa. Recomendar 15–20 min de exposição solar/dia (braços e pernas). Avaliar suplementação de vitamina D3 + K2. Repetir dosagem em 3 meses.",
    });
  }

  // 22. Ferritina / ferro baixo
  if (sd?.exam_low_iron === true) {
    alerts.push({
      id: "low_iron",
      type: "info",
      category: "Ferritina / Ferro Baixo",
      message:
        "Histórico de ferritina baixa. Incluir fontes de ferro heme e não-heme. Evitar café/chá próximo às refeições. Verificar se há menorragia ou perda oculta de sangue.",
    });
  }

  return alerts;
}

// Contagem por tipo para exibir no header do painel
export function countAlertsByType(alerts: ClinicalAlert[]): Record<AlertSeverity, number> {
  return alerts.reduce(
    (acc, a) => ({ ...acc, [a.type]: acc[a.type] + 1 }),
    { danger: 0, warning: 0, info: 0 }
  );
}
