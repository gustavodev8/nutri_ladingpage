// ─── Motor de Alertas Clínicos ────────────────────────────────────────────────
// Analisa anamnese + última medição e retorna alertas para guiar a prescrição.

import type { Anamnesis, Measurement } from "@/lib/supabase";

export type AlertSeverity = "danger" | "warning" | "info";

export interface ClinicalAlert {
  id: string;
  type: AlertSeverity;
  category: string;
  message: string;
}

// Busca case-insensitive em um campo de texto
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
  const a = anamnesis;
  const m = lastMeasurement;

  if (!a && !m) return alerts;

  // ── DANGER ────────────────────────────────────────────────────────────────

  // 1. Alergias / intolerâncias
  if (a?.allergies?.trim()) {
    alerts.push({
      id: "allergy",
      type: "danger",
      category: "Alergia / Intolerância",
      message: `Paciente relata: "${a.allergies.trim()}". Verificar todos os alimentos do plano antes de prescrever.`,
    });
  }

  // 2. Aversões alimentares documentadas
  if (a?.food_aversions?.trim()) {
    alerts.push({
      id: "aversion",
      type: "danger",
      category: "Aversão Alimentar",
      message: `Alimentos rejeitados: "${a.food_aversions.trim()}". Evitar incluir no cardápio.`,
    });
  }

  // ── WARNING ───────────────────────────────────────────────────────────────

  // 3. Hipertensão arterial
  if (
    has(a?.medical_history, "hipertensao", "pressao alta", "hás", "has") ||
    has(a?.medications, "losartana", "enalapril", "captopril", "amlodipina", "atenolol", "carvedilol", "hidroclorotiazida")
  ) {
    alerts.push({
      id: "hypertension",
      type: "warning",
      category: "Hipertensão Arterial",
      message:
        "Limitar sódio a ≤ 2.000 mg/dia (equivale a ~5 g de sal). Priorizar potássio (banana, abacate, feijão) e magnésio. Evitar embutidos, enlatados e ultraprocessados.",
    });
  }

  // 4. Diabetes / resistência à insulina
  if (
    has(a?.medical_history, "diabetes", "diabete", "glicemia", "resistencia insulina", "pre-diabetes", "sindrome metabolica") ||
    has(a?.medications, "metformina", "insulina", "glicazida", "glibenclamida", "sitagliptina", "dapagliflozina")
  ) {
    alerts.push({
      id: "diabetes",
      type: "warning",
      category: "Diabetes / Glicemia",
      message:
        "Controlar carga e índice glicêmico. Distribuir carboidratos ao longo do dia. Priorizar fibras (≥ 30 g/dia), gorduras boas e proteínas para atenuar picos glicêmicos.",
    });
  }

  // 5. Intestino preso / constipação
  if (
    has(a?.bowel_function, "preso", "constipacao", "ressecado", "ruim", "dificuldade", "lento", "irregular", "nao funciona")
  ) {
    alerts.push({
      id: "constipation",
      type: "warning",
      category: "Constipação Intestinal",
      message:
        "Meta de fibras: ≥ 30 g/dia (frutas com casca, aveia, leguminosas, vegetais folhosos). Hidratação: ≥ 35 ml/kg/dia. Considerar prebióticos (frutooligossacarídeos).",
    });
  }

  // 6. Diarreia / intestino acelerado
  if (
    has(a?.bowel_function, "diarreia", "solto", "acelerado", "mais de 3 vezes", "urgencia")
  ) {
    alerts.push({
      id: "diarrhea",
      type: "warning",
      category: "Intestino Acelerado",
      message:
        "Reduzir fibras insolúveis e lactose temporariamente. Priorizar alimentos de fácil digestão. Reforçar reposição de eletrólitos (sódio, potássio). Investigar SIBO ou intolerâncias.",
    });
  }

  // 7. Dislipidemia
  if (
    has(a?.medical_history, "colesterol", "triglicerides", "dislipidemia", "ldl alto", "hdl baixo") ||
    has(a?.medications, "sinvastatina", "atorvastatina", "rosuvastatina", "ezetimiba", "fenofibrato")
  ) {
    alerts.push({
      id: "dyslipidemia",
      type: "warning",
      category: "Dislipidemia",
      message:
        "Reduzir gordura saturada (< 10% VET) e trans. Aumentar ômega-3 (salmão, sardinha, linhaça), fibras solúveis (aveia, maçã) e fitoesteróis. Limitar colesterol dietético.",
    });
  }

  // 8. Hipotireoidismo
  if (
    has(a?.medical_history, "hipotireoidismo", "tireoide", "hashimoto") ||
    has(a?.medications, "levotiroxina", "synthroid", "puran")
  ) {
    alerts.push({
      id: "hypothyroidism",
      type: "warning",
      category: "Hipotireoidismo",
      message:
        "Metabolismo basal possivelmente reduzido. Atenção ao iodo (algas, frutos do mar) e selênio (castanha-do-pará: 1–2 unid./dia). Evitar excesso de bociogênicos crus (couve, brócolis, soja) se TSH elevado.",
    });
  }

  // 9. Gordura visceral elevada
  if (m?.visceral_fat != null && m.visceral_fat > 12) {
    alerts.push({
      id: "visceral_fat",
      type: "warning",
      category: "Gordura Visceral Elevada",
      message: `Gordura visceral: ${m.visceral_fat} (referência: ≤ 12). Priorizar déficit calórico moderado, exercício aeróbico e redução de açúcares simples e álcool.`,
    });
  }

  // 10. SOP / síndrome dos ovários policísticos
  if (
    has(a?.medical_history, "sop", "ovario policistico", "policistico") ||
    has(a?.medications, "metformina", "espironolactona", "acetato de ciproterona")
  ) {
    if (!alerts.find((al) => al.id === "diabetes")) { // evita duplicata com diabetes
      alerts.push({
        id: "pcos",
        type: "warning",
        category: "SOP",
        message:
          "Priorizar low-glycemic eating (baixo IG). Distribuir refeições para evitar hiperinsulinemia. Atenção ao magnésio, inositol e vitamina D.",
      });
    }
  }

  // ── INFO ──────────────────────────────────────────────────────────────────

  // 11. Sono insuficiente
  if (a?.sleep_hours != null && a.sleep_hours < 6) {
    alerts.push({
      id: "sleep",
      type: "info",
      category: "Sono Insuficiente",
      message: `Paciente dorme ${a.sleep_hours}h/noite (recomendado: 7–9h). Privação de sono eleva cortisol, grelina e resistência à insulina. Sugerir higiene do sono e adaptar horários das refeições.`,
    });
  }

  // 12. Baixa ingestão de água
  if (
    has(a?.water_intake, "pouco", "menos de 1", "1 litro", "1l", "500ml", "nao bebo", "raramente")
  ) {
    alerts.push({
      id: "hydration",
      type: "info",
      category: "Hidratação Insuficiente",
      message:
        "Reforçar meta hídrica: ≥ 35 ml/kg/dia. Pode confundir sede com fome. Sugerir estratégias práticas (garrafa marcada, alarmes, água saborizada).",
    });
  }

  // 13. Sedentarismo
  if (
    has(a?.physical_activity, "sedentario", "nao pratica", "nenhum", "nao faz", "nunca", "nao faco")
  ) {
    alerts.push({
      id: "sedentary",
      type: "info",
      category: "Sedentarismo",
      message:
        "Paciente sedentário. Utilizar fator NAF 1.2 no cálculo do GET. Considerar incluir orientação de caminhada leve (150 min/semana) para potencializar o resultado.",
    });
  }

  // 14. Ansiedade / uso de psicofármacos
  if (
    has(a?.medications, "fluoxetina", "sertralina", "escitalopram", "clonazepam", "alprazolam", "amitriptilina", "venlafaxina", "bupropiona") ||
    has(a?.medical_history, "ansiedade", "depressao", "transtorno de humor")
  ) {
    alerts.push({
      id: "mental_health",
      type: "info",
      category: "Saúde Mental / Medicação",
      message:
        "Paciente pode apresentar alterações de apetite, compulsão ou aversão alimentar relacionadas ao quadro ou medicação. Avaliar comportamento alimentar com atenção.",
    });
  }

  // 15. Queixa principal relacionada a peso/emagrecimento
  if (
    has(a?.main_complaint, "emagrecer", "perder peso", "barriga", "gordura") &&
    m?.body_fat != null && m.body_fat < 12
  ) {
    alerts.push({
      id: "low_fat_request",
      type: "info",
      category: "Meta × Composição Atual",
      message: `Paciente deseja emagrecer, mas gordura corporal atual é ${m.body_fat}% — próxima do limite essencial. Avaliar se déficit calórico é adequado ou se foco deve ser recomposição.`,
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
