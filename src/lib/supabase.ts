import { createClient } from "@supabase/supabase-js";
import type { SiteContent } from "@/contexts/ContentContext";

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL      as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase não configurado. Crie um arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Alias — todas as operações usam o mesmo cliente anon.
// A segurança do painel admin ? garantida pelo login (AdminLogin + ProtectedRoute).
// service_role key NUNCA deve estar em variáveis VITE_ (ficaria exposta no bundle).
export const supabaseAdmin = supabase;

// Content stored with a unix timestamp so we can do "newest wins" sync
export type StoredContent = SiteContent & { _ts?: number };

const TABLE = "site_content";
const ROW_ID = 1;

export async function fetchContent(): Promise<StoredContent | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("content")
    .eq("id", ROW_ID)
    .single();

  if (error) {
    console.error("[Supabase] fetchContent error:", error.message);
    return null;
  }

  return (data?.content as StoredContent) ?? null;
}

export async function saveContent(content: StoredContent): Promise<boolean> {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert({ id: ROW_ID, content, updated_at: new Date().toISOString() })
    .select("id");

  if (error) {
    console.error("[Supabase] saveContent error:", error.message);
    return false;
  }

  if (!data || data.length === 0) {
    console.error("[Supabase] saveContent: RLS bloqueou a escrita.");
    return false;
  }

  return true;
}

// ─── Image Storage ───────────────────────────────────────────────────────────────?

const BUCKET = "images";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const ALLOWED_IMAGE_EXTS = ["jpg", "jpeg", "png", "webp", "gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"];
const ALLOWED_VIDEO_EXTS = ["mp4", "webm", "ogg"];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB
const MAX_PDF_SIZE = 200 * 1024 * 1024; // 200MB

export async function uploadImage(file: File): Promise<string | null> {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.includes(file.type) || !ALLOWED_IMAGE_EXTS.includes(ext)) {
    console.error("[uploadImage] Tipo de arquivo não permitido:", file.type);
    return null;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    console.error("[uploadImage] Arquivo muito grande:", file.size);
    return null;
  }
  const path = `products/${crypto.randomUUID()}.${ext}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) {
    console.error("[Supabase] uploadImage error:", error.message);
    return null;
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return urlData.publicUrl;
}

// Comprime imagens via Canvas antes do upload.
// PDFs e docs são enviados sem alteração.
async function compressFileIfImage(
  file: File,
  maxPx = 1920,
  quality = 0.82,
): Promise<{ blob: Blob; ext: string; mime: string }> {
  const isImage = file.type.startsWith("image/") && file.type !== "image/gif";
  if (!isImage) return { blob: file, ext: file.name.split(".").pop() || "bin", mime: file.type };

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width > height) { height = Math.round((height * maxPx) / width); width = maxPx; }
        else                { width = Math.round((width * maxPx) / height); height = maxPx; }
      }
      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve({ blob: blob ?? file, ext: "jpg", mime: "image/jpeg" }),
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ blob: file, ext: file.name.split(".").pop() || "bin", mime: file.type }); };
    img.src = url;
  });
}

// Upload de foto de paciente — comprimida (max 1200px, JPEG 78%).
export async function uploadPatientPhoto(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/")) {
    console.error("[uploadPatientPhoto] Apenas imagens são permitidas.");
    return null;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    console.error("[uploadPatientPhoto] Arquivo muito grande:", file.size);
    return null;
  }
  const { blob, mime } = await compressFileIfImage(file, 1200, 0.78);
  const path = `patients/${crypto.randomUUID()}.jpg`;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: false, contentType: mime });
  if (error) { console.error("[Supabase] uploadPatientPhoto error:", error.message); return null; }
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return urlData.publicUrl;
}

export async function uploadRecordFile(file: File, groupId: string): Promise<string | null> {
  const { blob, ext, mime } = await compressFileIfImage(file);
  const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `records/${groupId}/${crypto.randomUUID()}_${baseName}.${ext}`;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: false, contentType: mime });
  if (error) { console.error('[Supabase] uploadRecordFile error:', error.message); return null; }
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return urlData.publicUrl;
}

export async function uploadPdf(file: File): Promise<string | null> {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (file.type !== "application/pdf" || ext !== "pdf") {
    console.error("[uploadPdf] Apenas PDFs são permitidos.");
    return null;
  }
  if (file.size > MAX_PDF_SIZE) {
    console.error("[uploadPdf] PDF muito grande:", file.size);
    return null;
  }
  const path = `pdfs/${crypto.randomUUID()}.pdf`;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: "application/pdf" });
  if (error) {
    console.error("[Supabase] uploadPdf error:", error.message);
    throw new Error(error.message);
  }
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return urlData.publicUrl;
}

export async function uploadVideo(file: File): Promise<string | null> {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_VIDEO_TYPES.includes(file.type) || !ALLOWED_VIDEO_EXTS.includes(ext)) {
    console.error("[uploadVideo] Tipo de vídeo não permitido:", file.type);
    return null;
  }
  if (file.size > MAX_VIDEO_SIZE) {
    console.error("[uploadVideo] Vídeo muito grande:", file.size);
    return null;
  }
  const path = `videos/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) { console.error("[Supabase] uploadVideo error:", error.message); return null; }
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return urlData.publicUrl;
}

// ─── Alimentos (Catálogo) ─────────────────────────────────────────────────────────

const FOOD_TABLE = "master_foods";

const CP1252_BYTES: Record<string, number> = {
  "\u20ac": 0x80,
  "\u201a": 0x82,
  "\u0192": 0x83,
  "\u201e": 0x84,
  "\u2026": 0x85,
  "\u2020": 0x86,
  "\u2021": 0x87,
  "\u02c6": 0x88,
  "\u2030": 0x89,
  "\u0160": 0x8a,
  "\u2039": 0x8b,
  "\u0152": 0x8c,
  "\u017d": 0x8e,
  "\u2018": 0x91,
  "\u2019": 0x92,
  "\u201c": 0x93,
  "\u201d": 0x94,
  "\u2022": 0x95,
  "\u2013": 0x96,
  "\u2014": 0x97,
  "\u02dc": 0x98,
  "\u2122": 0x99,
  "\u0161": 0x9a,
  "\u203a": 0x9b,
  "\u0153": 0x9c,
  "\u017e": 0x9e,
  "\u0178": 0x9f,
};

function decodeUtf8MojibakeOnce(value: string): string {
  const bytes: number[] = [];

  for (const char of value) {
    const code = char.charCodeAt(0);
    const byte = code <= 0xff ? code : CP1252_BYTES[char];
    if (byte === undefined) return value;
    bytes.push(byte);
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
  } catch {
    return value;
  }
}

export function repairMojibake(value: string | null | undefined): string {
  if (!value) return "";
  let next = value;
  for (let i = 0; i < 3 && /[\u00c3\u00c2\u00e2\u00ef\u00bf\ufffd]/.test(next); i++) {
    const decoded = decodeUtf8MojibakeOnce(next);
    if (decoded === next) break;
    next = decoded;
  }
  return next.replace(/\uFFFD|\u00ef\u00bf\u00bd/g, "").normalize("NFC").trim();
}

export async function fetchFoodsFromSupabase(query?: string, category?: string): Promise<import("./foodDatabase").FoodItem[]> {
  const pageSize = 1000;
  const rows: Array<Record<string, unknown>> = [];

  for (let from = 0; ; from += pageSize) {
    let q = supabase.from(FOOD_TABLE).select("*");

    if (query) {
      q = q.ilike("name", `%${query}%`);
    }

    if (category && category !== "Todos") {
      q = q.eq("category", category);
    }

    const { data, error } = await q.order("name").range(from, from + pageSize - 1);

    if (error) {
      console.error("[Supabase] fetchFoodsFromSupabase error:", error.message);
      return [];
    }

    rows.push(...(data ?? []));

    if (!data || data.length < pageSize) {
      break;
    }
  }

  return rows.map((f) => ({
    id: String(f.id ?? ""),
    name: repairMojibake(String(f.name ?? "")),
    category: repairMojibake(String(f.category ?? "Personalizado")) || "Personalizado",
    kcal: Number(f.kcal_per_100g) || 0,
    protein: Number(f.protein_per_100g) || 0,
    carbs: Number(f.carbs_per_100g) || 0,
    fat: Number(f.fat_per_100g) || 0,
    fiber: Number(f.fiber_per_100g) || undefined,
    source: repairMojibake(String(f.source ?? "custom")) || "custom",
    source_ref: f.source_ref ? repairMojibake(String(f.source_ref)) : undefined,
    source_code: f.source_code ? String(f.source_code) : undefined,
  }));
}

export async function upsertFoodInSupabase(food: Partial<import("./foodDatabase").FoodItem>): Promise<boolean> {
  const { id, ...fields } = food;
  const normalizeFoodKey = (value: string | undefined) =>
    repairMojibake(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "")
      .trim();
  
  // Se tiver ID numérico (ex: do banco), é update. Se for string (ex: custom_...), é novo ou precisa ser tratado.
  // No nosso sistema simplificado, vamos tratar tudo como upsert pelo nome se não tiver id real.
  
  const cleanName = repairMojibake(fields.name);
  const cleanCategory = repairMojibake(fields.category) || "Personalizado";

  const payload = {
    name: cleanName,
    name_key: normalizeFoodKey(cleanName),
    category: cleanCategory,
    kcal: fields.kcal,
    protein: fields.protein,
    carbs: fields.carbs,
    fat: fields.fat,
    fiber: fields.fiber,
    source: repairMojibake(fields.source) || "custom",
    source_ref: fields.source_ref ? repairMojibake(fields.source_ref) : undefined,
    source_code: fields.source_code,
  };

  const numericId = typeof id === "number" ? id : Number(id);
  if (Number.isFinite(numericId) && numericId > 0) {
    const { error } = await supabase.from(FOOD_TABLE).update(payload).eq("id", numericId);
    return !error;
  } else {
    const { error } = await supabase.from(FOOD_TABLE).upsert(payload, { onConflict: "name_key" });
    return !error;
  }
}

export async function deleteFoodFromSupabase(id: number | string): Promise<boolean> {
  const numericId = typeof id === "number" ? id : Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) return false;
  const { error } = await supabase.from(FOOD_TABLE).delete().eq("id", numericId);
  return !error;
}

export async function searchFoodsInSupabase(query: string): Promise<import("./foodDatabase").FoodItem[]> {
  return fetchFoodsFromSupabase(query);
}


export interface Patient {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  gender?: "M" | "F" | "outro";
  occupation?: string;
  city?: string;
  cpf?: string;
  notes?: string;
  report_text?: string;
  created_at?: string;
}

export interface PatientPhoto {
  id?: number;
  patient_id: number;
  url: string;
  label?: string;
  created_at?: string;
}

export interface PatientReport {
  id?: number;
  patient_id: number;
  title: string;
  report_date: string;
  report_text: string;
  created_at?: string;
  updated_at?: string;
}

// ─── Epic 6: Triagem Clínica Estruturada ──────────────────────────────────────────?
export interface AnamnesisStructured {
  // OBJETIVO
  goal_primary?: "emagrecimento" | "hipertrofia" | "saude_geral" | "performance" | "recomposicao" | "outro";
  goal_libido?: boolean;
  goal_energy?: boolean;
  goal_aesthetics?: boolean;
  goal_notes?: string;

  // DIETA
  diet_fruits_vegs?: boolean;
  diet_processed?: boolean;
  diet_healthy_fats?: boolean;
  diet_meals_per_day?: "1-2" | "3" | "4-5" | "6+";
  diet_water_liters?: "<1L" | "1-1.5L" | "1.5-2L" | "2-2.5L" | ">2.5L";
  diet_aversions?: string;
  diet_preferences?: string;
  diet_notes?: string;

  // TREINO
  training_active?: boolean;
  training_modality?: string;
  training_frequency?: "1-2x" | "3x" | "4-5x" | "6-7x";
  training_supplement?: boolean;
  training_supplement_types?: string;
  training_notes?: string;

  // HÁBITOS
  habit_smokes?: boolean;
  habit_alcohol?: "nunca" | "raramente" | "fins_semana" | "frequente";
  habit_sleep?: "<5h" | "5-6h" | "6-7h" | "7-8h" | ">8h";
  habit_bowel?: "regular" | "preso" | "solto" | "irregular";
  habit_stress?: "baixo" | "moderado" | "alto";
  habit_notes?: string;

  // CL?NICO / PATOLOGIAS
  clinical_treatment?: boolean;
  clinical_medications?: boolean;
  clinical_medications_list?: string;
  clinical_family_history?: boolean;
  clinical_hypertension?: boolean;
  clinical_diabetes?: boolean;
  clinical_dyslipidemia?: boolean;
  clinical_hypothyroidism?: boolean;
  clinical_pcos?: boolean;
  clinical_mental_healthá: boolean;
  clinical_allergies?: string;
  clinical_food_aversions?: string;
  clinical_notes?: string;

  // EXAMES LABORATORIAIS
  exam_anemia?: boolean;
  exam_low_b12?: boolean;
  exam_low_vitd?: boolean;
  exam_low_iron?: boolean;
  exam_notes?: string;
}

export interface Anamnesis {
  id?: number;
  patient_id: number;
  // Legacy text fields (mantidos para compatibilidade)
  main_complaint?: string;
  medical_history?: string;
  medications?: string;
  allergies?: string;
  food_aversions?: string;
  food_preferences?: string;
  meals_per_day?: number;
  water_intake?: string;
  physical_activity?: string;
  sleep_hours?: number;
  bowel_function?: string;
  goals?: string;
  // Epic 6: triagem estruturada
  structured_data?: AnamnesisStructured;
  updated_at?: string;
}

export interface Measurement {
  id?: number;
  patient_id: number;
  assessment_date: string;
  weight?: number;
  height?: number;
  // Tronco
  neck?: number;
  shoulder?: number;
  chest?: number;
  waist?: number;
  abdomen?: number;
  hip?: number;
  // Membros Superiores
  arm_relax_r?: number;
  arm_relax_l?: number;
  arm_contract_r?: number;
  arm_contract_l?: number;
  forearm_r?: number;
  forearm_l?: number;
  wrist_r?: number;
  wrist_l?: number;
  // Membros Inferiores
  calf_r?: number;
  calf_l?: number;
  thigh_r?: number;
  thigh_l?: number;
  thigh_prox_r?: number;
  thigh_prox_l?: number;
  // Composição
  body_fat?: number;
  lean_mass?: number;
  visceral_fat?: number;
  body_density?: number;
  // Dobras cutâneas (mm)
  sf_pectoral?: number;
  sf_midaxillary?: number;
  sf_triceps?: number;
  sf_biceps?: number;
  sf_subscapular?: number;
  sf_suprailiac?: number;
  sf_abdominal?: number;
  sf_thigh_sf?: number;
  sf_calf_sf?: number;
  sf_protocol?: string;
  notes?: string;
  created_at?: string;
}

export interface MealPlan {
  id?: number;
  patient_id: number;
  title: string;
  start_date?: string;
  end_date?: string;
  daily_calories?: number;
  notes?: string;
  // Epic 4: estratégia dietética
  strategy_type?: string;       // 'deficit' | 'maintenance' | 'surplus'
  target_calories?: number;
  target_protein_g?: number;
  target_carbs_g?: number;
  target_fat_g?: number;
  // Epic 8: linhagem — vincula o plano à avaliação que embasou o cálculo
  measurement_id?: number;      // measurements.id usado como base do GET
  get_kcal?: number;            // GET calculado no momento da criação (kcal/dia)
  created_at?: string;
}

export interface SubstitutionItem {
  food_name:     string;
  quantity?:     number;
  unit?:         string;
  notes?:        string;
  /** Nome do alimento original que esta opção substitui */
  replaces_food?: string;
}

/** Opção substituta completa de uma refeição (armazenada como JSONB em meals.alternative_meals) */
export interface AlternativeMeal {
  meal_name:        string;
  time_suggestion?: string;
  notes?:           string;
  foods?:           MealFood[];
}

export interface Meal {
  id?: number;
  plan_id: number;
  meal_name: string;
  time_suggestion?: string;
  sort_order?: number;
  notes?: string;
  foods?: MealFood[];
  substitution_items?: SubstitutionItem[];
  /** Opções substitutas completas para esta refeição */
  alternative_meals?: AlternativeMeal[];
}

export interface MealFood {
  id?: number;
  meal_id: number;
  food_name: string;
  quantity?: number;
  unit?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  notes?: string;
  sort_order?: number;
  // Base per-100g values — used for auto-calculation when quantity changes
  kcal_per_100g?: number;
  protein_per_100g?: number;
  carbs_per_100g?: number;
  fat_per_100g?: number;
  household_measures?: { unit: string; grams: number }[];
  // Epic 7: medidas caseiras
  household_measure?: string;   // ex: "colher de sopa", "unidade média"
  measure_amount?: number;      // ex: 1, 2, 0.5
  food_group?: string;          // ex: "Carboidrato", "Proteína" ? para substituições
}

// ─── Clínica ? CRUD ──────────────────────────────────────────────────────────────────?

// Patients
export async function fetchPatients(): Promise<Patient[]> {
  const { data, error } = await supabaseAdmin
    .from("patients")
    .select("*")
    .order("name");
  if (error) { console.error("[Supabase] fetchPatients:", error.message); return []; }
  return data ?? [];
}

export async function fetchPatient(id: number | string): Promise<Patient | null> {
  const { data, error } = await supabaseAdmin
    .from("patients")
    .select("*")
    .eq("id", id)
    .single();
  if (error) { console.error("[Supabase] fetchPatient:", error.message); return null; }
  return data;
}

export async function upsertPatient(patient: Patient): Promise<Patient | null> {
  const { id, ...fields } = patient;
  if (id) {
    const { error } = await supabaseAdmin.from("patients").update(fields).eq("id", id);
    if (error) { console.error("[Supabase] upsertPatient update:", error.message); return null; }
    return { id, ...fields };
  } else {
    const { data, error } = await supabaseAdmin.from("patients").insert(fields).select().single();
    if (error) { console.error("[Supabase] upsertPatient insert:", error.message); return null; }
    return data;
  }
}

export async function deletePatient(id: number): Promise<boolean> {
  const { error } = await supabaseAdmin.from("patients").delete().eq("id", id);
  if (error) { console.error("[Supabase] deletePatient:", error.message); return false; }
  return true;
}

/** Find patients with similar name or matching email (duplicate detection). */
export async function findSimilarPatients(name: string, email?: string): Promise<Patient[]> {
  const firstName = name.trim().split(" ")[0].toLowerCase();
  const { data, error } = await supabase.from("patients").select("*").order("name");
  if (error || !data) return [];
  return data.filter((p: Patient) => {
    const nameMatch = p.name?.toLowerCase().includes(firstName) || firstName.includes(p.name?.toLowerCase().split(" ")[0] ?? "____");
    const emailMatch = email && p.email && p.email.toLowerCase() === email.toLowerCase();
    return nameMatch || emailMatch;
  });
}

/** Find a patient by CPF (digits-only or formatted). Returns null if not found. */
export async function findPatientByCPF(cpf: string): Promise<Patient | null> {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return null;
  const { data, error } = await supabase.from("patients").select("*").eq("cpf", digits).maybeSingle();
  if (error) { console.error("[Supabase] findPatientByCPF:", error.message); return null; }
  return data ?? null;
}

/** Link all bookings in a group to an existing patient and store CPF on them. */
export async function linkBookingGroupToPatient(bookingGroupId: string, patientId: number, cpf: string): Promise<boolean> {
  const digits = cpf.replace(/\D/g, "");
  const { error } = await supabaseAdmin
    .from("bookings")
    .update({ patient_id: patientId, client_cpf: digits })
    .eq("booking_group_id", bookingGroupId);
  if (error) { console.error("[Supabase] linkBookingGroupToPatient:", error.message); return false; }
  return true;
}

// Patient Photos
export async function fetchPatientPhotos(patientId: number): Promise<PatientPhoto[]> {
  const { data, error } = await supabaseAdmin
    .from("patient_photos")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) { console.error("[Supabase] fetchPatientPhotos:", error.message); return []; }
  return data ?? [];
}

export async function insertPatientPhoto(photo: Omit<PatientPhoto, "id" | "created_at">): Promise<PatientPhoto | null> {
  const { data, error } = await supabaseAdmin.from("patient_photos").insert(photo).select().single();
  if (error) { console.error("[Supabase] insertPatientPhoto:", error.message); return null; }
  return data;
}

export async function deletePatientPhoto(id: number): Promise<boolean> {
  const { error } = await supabaseAdmin.from("patient_photos").delete().eq("id", id);
  if (error) { console.error("[Supabase] deletePatientPhoto:", error.message); return false; }
  return true;
}

// Patient Reports
export async function fetchPatientReports(patientId: number): Promise<PatientReport[]> {
  const { data, error } = await supabaseAdmin
    .from("patient_reports")
    .select("*")
    .eq("patient_id", patientId)
    .order("report_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) { console.error("[Supabase] fetchPatientReports:", error.message); return []; }
  return data ?? [];
}

export async function upsertPatientReport(report: PatientReport): Promise<PatientReport | null> {
  const payload = {
    ...report,
    updated_at: new Date().toISOString(),
  };
  if (report.id) {
    const { id, ...fields } = payload;
    const { error } = await supabaseAdmin.from("patient_reports").update(fields).eq("id", id);
    if (error) { console.error("[Supabase] upsertPatientReport update:", error.message); return null; }
    return { id, ...fields };
  }
  const { data, error } = await supabaseAdmin.from("patient_reports").insert(payload).select().single();
  if (error) { console.error("[Supabase] upsertPatientReport insert:", error.message); return null; }
  return data;
}

export async function deletePatientReport(id: number): Promise<boolean> {
  const { error } = await supabaseAdmin.from("patient_reports").delete().eq("id", id);
  if (error) { console.error("[Supabase] deletePatientReport:", error.message); return false; }
  return true;
}

// Anamnesis
export async function fetchAnamnesis(patientId: number): Promise<Anamnesis | null> {
  const { data, error } = await supabaseAdmin
    .from("anamnesis")
    .select("*")
    .eq("patient_id", patientId)
    .maybeSingle();
  if (error) { console.error("[Supabase] fetchAnamnesis:", error.message); return null; }
  return data;
}

export async function upsertAnamnesis(a: Anamnesis): Promise<{ id: number } | string> {
  const payload = { ...a, updated_at: new Date().toISOString() };
  if (a.id) {
    const { id, ...fields } = payload;
    const { error } = await supabaseAdmin.from("anamnesis").update(fields).eq("id", id);
    if (error) { console.error("[Supabase] upsertAnamnesis update:", error.message); return error.message; }
    return { id };
  } else {
    const { data, error } = await supabaseAdmin.from("anamnesis").insert(payload).select("id").single();
    if (error) { console.error("[Supabase] upsertAnamnesis insert:", error.message); return error.message; }
    return { id: data.id };
  }
}

// Measurements
export async function fetchMeasurements(patientId: number): Promise<Measurement[]> {
  const { data, error } = await supabaseAdmin
    .from("measurements")
    .select("*")
    .eq("patient_id", patientId)
    .order("assessment_date", { ascending: false });
  if (error) { console.error("[Supabase] fetchMeasurements:", error.message); return []; }
  return data ?? [];
}

export async function insertMeasurement(m: Measurement): Promise<Measurement | null> {
  const { id, ...fields } = m;
  const { data, error } = await supabaseAdmin.from("measurements").insert(fields).select().single();
  if (error) { console.error("[Supabase] insertMeasurement:", error.message); return null; }
  return data;
}

export async function updateMeasurement(id: number, m: Partial<Measurement>): Promise<Measurement | null> {
  try {
    const { id: _id, ...fields } = m;
    const { data, error } = await supabaseAdmin
      .from("measurements")
      .update(fields)
      .eq("id", id)
      .select()
      .single();
    if (error) { console.error("[Supabase] updateMeasurement:", error.message); return null; }
    return data;
  } catch (err) {
    console.error("[Supabase] updateMeasurement exception:", err);
    return null;
  }
}

export async function deleteMeasurement(id: number): Promise<boolean> {
  const { error } = await supabaseAdmin.from("measurements").delete().eq("id", id);
  if (error) { console.error("[Supabase] deleteMeasurement:", error.message); return false; }
  return true;
}

// Meal Plans
export async function fetchMealPlans(patientId: number): Promise<MealPlan[]> {
  const { data, error } = await supabaseAdmin
    .from("meal_plans")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) { console.error("[Supabase] fetchMealPlans:", error.message); return []; }
  return data ?? [];
}

export async function upsertMealPlan(plan: MealPlan): Promise<MealPlan | null> {
  const { id, ...fields } = plan;
  if (id) {
    const { error } = await supabaseAdmin.from("meal_plans").update(fields).eq("id", id);
    if (error) { console.error("[Supabase] upsertMealPlan update:", error.message); return null; }
    return { id, ...fields };
  } else {
    const { data, error } = await supabaseAdmin.from("meal_plans").insert(fields).select().single();
    if (error) { console.error("[Supabase] upsertMealPlan insert:", error.message); return null; }
    return data;
  }
}

export async function deleteMealPlan(id: number): Promise<boolean> {
  const { error } = await supabaseAdmin.from("meal_plans").delete().eq("id", id);
  if (error) { console.error("[Supabase] deleteMealPlan:", error.message); return false; }
  return true;
}

// Full plan (meals + foods)
export async function fetchFullMealPlan(planId: number): Promise<Meal[]> {
  const { data, error } = await supabaseAdmin
    .from("meals")
    .select("*, foods:meal_foods(*)")
    .eq("plan_id", planId)
    .order("sort_order");
  if (error) { console.error("[Supabase] fetchFullMealPlan:", error.message); return []; }
  type MealRow = Meal & { foods?: MealFood[] | null };
  return ((data ?? []) as MealRow[]).map((m) => ({ ...m, foods: m.foods ?? [] }));
}

export async function saveMeals(planId: number, meals: Meal[]): Promise<string | null> {
  const { error: delError } = await supabaseAdmin.from("meals").delete().eq("plan_id", planId);
  if (delError) { console.error("[Supabase] saveMeals delete:", delError.message); return delError.message; }

  for (let i = 0; i < meals.length; i++) {
    const meal = meals[i];
    const { data: mealData, error: mealErr } = await supabaseAdmin
      .from("meals")
      .insert({ plan_id: planId, meal_name: meal.meal_name, time_suggestion: meal.time_suggestion ?? "", sort_order: i, notes: meal.notes ?? "", substitution_items: meal.substitution_items ?? [], alternative_meals: meal.alternative_meals ?? [] })
      .select()
      .single();
    if (mealErr || !mealData) {
      console.error("[Supabase] saveMeals insert meal:", mealErr?.message);
      return mealErr?.message ?? "Erro ao inserir refeição";
    }

    const validFoods = (meal.foods ?? []).filter((f) => f.food_name.trim() !== "");
    if (validFoods.length > 0) {
      const foodRows = validFoods.map((f, fi) => ({
        meal_id:           mealData.id,
        food_name:         f.food_name,
        quantity:          f.quantity          ?? null,
        unit:              f.unit              ?? "g",
        calories:          f.calories          ?? null,
        protein:           f.protein           ?? null,
        carbs:             f.carbs             ?? null,
        fat:               f.fat               ?? null,
        notes:             f.notes             ?? null,
        sort_order:        fi,
        kcal_per_100g:     f.kcal_per_100g     ?? null,
        protein_per_100g:  f.protein_per_100g  ?? null,
        carbs_per_100g:    f.carbs_per_100g    ?? null,
        fat_per_100g:      f.fat_per_100g      ?? null,
        household_measure: f.household_measure ?? null,
        measure_amount:    f.measure_amount    ?? null,
        food_group:        f.food_group        ?? null,
      }));
      const { error: foodErr } = await supabaseAdmin.from("meal_foods").insert(foodRows);
      if (foodErr) {
        console.error("[Supabase] saveMeals insert foods:", foodErr.message);
        return foodErr.message;
      }
    }
  }
  return null;
}

// ─── Booking System ──────────────────────────────────────────────────────────────────?

export interface AvailabilitySlot {
  id: number;
  date: string;        // ISO "2025-04-10"
  start_time: string;  // "09:00"
  type: 'online' | 'presencial';
  city?: string;       // only for presencial slots
  active: boolean;
}

export type BookingStatus = "pending" | "confirmed" | "completed" | "no_show" | "cancelled";
export type BookingPaymentStatus = "pending" | "paid" | "cancelled" | "free";
export type BookingPaymentMethod = "pix" | "card" | "manual" | "free";

export interface Booking {
  id?: number;
  created_at?: string;
  booking_group_id: string;
  session_number: number;
  total_sessions: number;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_cpf?: string;
  patient_id?: number;
  plan_name: string;
  plan_index: number;
  appointment_date: string;
  appointment_time: string;
  type: 'online' | 'presencial';
  status?: BookingStatus;
  payment_status?: BookingPaymentStatus;
  payment_method?: BookingPaymentMethod | null;
  notes?: string;
}

const PENDING_BOOKING_EXPIRY_MINUTES = 30;

export function isPendingBookingExpired(booking: Pick<Booking, "status" | "created_at">): boolean {
  if (booking.status !== "pending") return false;
  const createdAt = booking.created_at ? new Date(booking.created_at) : null;
  if (!createdAt || Number.isNaN(createdAt.getTime())) return true;
  const ageMinutes = (Date.now() - createdAt.getTime()) / (1000 * 60);
  return ageMinutes > PENDING_BOOKING_EXPIRY_MINUTES;
}

/** Fetch all active slots from today onwards */
export async function fetchAvailabilitySlots(): Promise<AvailabilitySlot[]> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('availability_slots')
    .select('*')
    .eq('active', true)
    .gte('date', today)
    .order('date')
    .order('start_time');
  if (error) { console.error(error); return []; }
  return data || [];
}

/** Fetch all slots for a specific month (for admin calendar) */
export async function fetchSlotsByMonth(year: number, month: number): Promise<AvailabilitySlot[]> {
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const { data, error } = await supabase
    .from('availability_slots')
    .select('*')
    .gte('date', from)
    .lte('date', to)
    .order('start_time');
  if (error) { console.error(error); return []; }
  return data || [];
}

/** Fetch slots for a specific date, type and (for presencial) city */
export async function fetchSlotsByDate(date: string, type: string, city?: string): Promise<AvailabilitySlot[]> {
  let query = supabase
    .from('availability_slots')
    .select('*')
    .eq('date', date)
    .eq('type', type)
    .eq('active', true);
  if (type === 'presencial' && city) query = query.eq('city', city);
  const { data, error } = await query.order('start_time');
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function addAvailabilitySlot(slot: Omit<AvailabilitySlot, 'id'>): Promise<boolean> {
  const { error } = await supabase.from('availability_slots').insert(slot);
  if (error) { console.error(error); return false; }
  return true;
}

export async function deleteAvailabilitySlot(id: number): Promise<boolean> {
  const { error } = await supabase.from('availability_slots').delete().eq('id', id);
  return !error;
}

export async function fetchBookings(): Promise<Booking[]> {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .order('appointment_date', { ascending: false })
    .order('appointment_time', { ascending: true });
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function fetchBookingsForDate(date: string, type: string, excludeGroupId?: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('appointment_time, status, created_at, booking_group_id')
    .eq('appointment_date', date)
    .eq('type', type)
    .neq('status', 'cancelled');
  if (error) { console.error("fetchBookingsForDate error:", error); return []; }
  return (data || [])
    .filter(b => !isPendingBookingExpired(b))
    .filter(b => !excludeGroupId || b.booking_group_id !== excludeGroupId);
}

export async function insertBooking(booking: Booking): Promise<boolean> {
  const { error } = await supabase
    .from('bookings')
    .upsert(booking, { onConflict: 'booking_group_id,session_number', ignoreDuplicates: false });
  if (error) {
    const { error: insertError } = await supabase.from('bookings').insert(booking);
    if (insertError) { console.error("insertBooking error:", insertError); return false; }
  }
  return true;
}

export async function updateBookingStatus(id: number, status: BookingStatus, extra?: Record<string, unknown>): Promise<boolean> {
  const payload: Record<string, unknown> = { status, ...extra };
  const { error } = await supabaseAdmin.from('bookings').update(payload).eq('id', id);
  if (error) console.error('updateBookingStatus error:', JSON.stringify(error));
  return !error;
}

export async function updateBookingPaymentStatus(
  id: number,
  paymentStatus: BookingPaymentStatus,
  paymentMethod?: BookingPaymentMethod
): Promise<boolean> {
  const payload: Pick<Booking, "payment_status" | "payment_method"> = {
    payment_status: paymentStatus,
    payment_method: paymentMethod ?? "manual",
  };
  const { error } = await supabaseAdmin.from('bookings').update(payload).eq('id', id);
  if (error) console.error('updateBookingPaymentStatus error:', JSON.stringify(error));
  return !error;
}

export async function updateBookingGroup(
  bookingGroupId: string,
  fields: Partial<Pick<Booking, "client_name" | "client_email" | "client_phone" | "notes">>
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('bookings')
    .update(fields)
    .eq('booking_group_id', bookingGroupId);
  if (error) { console.error('updateBookingGroup error:', error.message); return false; }
  return true;
}

export async function deleteBookingGroup(bookingGroupId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('bookings')
    .delete()
    .eq('booking_group_id', bookingGroupId);
  if (error) { console.error('deleteBookingGroup error:', error.message); return false; }
  return true;
}

/** Filtra bookings com status 'pending' criados há mais de 30 minutos (client-side, sem delete via anon key) */
export async function autoExpirePendingBookings(bookings: Booking[]): Promise<Booking[]> {
  return bookings.filter(b => !isPendingBookingExpired(b));
}

export async function autoCompleteBookings(bookings: Booking[]): Promise<Booking[]> {
  const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
  const toComplete = bookings.filter(b => {
    if (b.status !== 'confirmed') return false;
    const d = new Date(b.appointment_date + 'T12:00:00');
    return d < todayMidnight;
  });
  for (const b of toComplete) {
    await updateBookingStatus(b.id!, 'completed', { completed_at: new Date().toISOString() });
  }
  return bookings.map(b =>
    toComplete.find(c => c.id === b.id) ? { ...b, status: 'completed' } : b
  );
}

export interface RecordFile {
  name: string;
  url: string;
}

export interface ConsultationRecord {
  id?: number;
  booking_id?: number;
  booking_group_id?: string;
  session_number?: number;
  client_name?: string;
  client_email?: string;
  notes?: string;
  weight?: number | null;
  height?: number | null;
  next_return_date?: string | null;
  next_steps?: string | null;
  files?: RecordFile[] | null;
  created_at?: string;
}

export async function insertConsultationRecord(record: ConsultationRecord): Promise<boolean> {
  const { error } = await supabaseAdmin.from('consultation_records').insert(record);
  if (error) { console.error('insertConsultationRecord error:', error); return false; }
  return true;
}

export async function updateConsultationRecord(
  id: number,
  updates: Partial<ConsultationRecord>
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('consultation_records')
    .update(updates)
    .eq('id', id);
  if (error) { console.error('updateConsultationRecord error:', error); return false; }
  return true;
}

export async function deleteConsultationRecord(id: number): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('consultation_records')
    .delete()
    .eq('id', id);
  if (error) { console.error('deleteConsultationRecord error:', error); return false; }
  return true;
}

export async function fetchConsultationRecords(booking_group_id: string): Promise<ConsultationRecord[]> {
  const { data, error } = await supabaseAdmin
    .from('consultation_records')
    .select('*')
    .eq('booking_group_id', booking_group_id)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function confirmBookingsByGroupId(
  bookingGroupId: string,
  paymentMethod: BookingPaymentMethod = "pix"
): Promise<boolean> {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'confirmed', payment_status: 'paid', payment_method: paymentMethod })
    .eq('booking_group_id', bookingGroupId);
  return !error;
}

// ─── Blog ──────────────────────────────────────────────────────────────────────────────??
/*
  SQL para criar a tabela (execute no Supabase SQL Editor):

  create table blog_posts (
    id bigint generated always as identity primary key,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now(),
    title text not null,
    slug text unique not null,
    content text not null,
    cover_image_url text,
    font text default 'sans',
    published boolean default false not null
  );
  alter table blog_posts enable row level security;
  create policy "Public read published" on blog_posts for select using (published = true);
  create policy "Admin full" on blog_posts using (auth.role() = 'authenticated');
*/

export interface BlogPost {
  id?: number;
  created_at?: string;
  updated_at?: string;
  title: string;
  slug: string;
  content: string;
  cover_image_url?: string | null;
  font?: string;
  published?: boolean;
}

export async function fetchBlogPosts(onlyPublished = true): Promise<BlogPost[]> {
  let query = supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
  if (onlyPublished) query = query.eq('published', true);
  const { data, error } = await query;
  if (error) { console.error('fetchBlogPosts error:', error); return []; }
  return data as BlogPost[];
}

export async function fetchBlogPost(slug: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from('blog_posts').select('*').eq('slug', slug).single();
  if (error) { console.error('fetchBlogPost error:', error); return null; }
  return data as BlogPost;
}

export async function upsertBlogPost(post: BlogPost): Promise<BlogPost | null> {
  const { id, ...fields } = post;
  const payload = { ...fields, updated_at: new Date().toISOString() };

  if (id) {
    const { error } = await supabase.from('blog_posts').update(payload).eq('id', id);
    if (error) { console.error('upsertBlogPost update error:', error); return null; }
    return { ...post, ...payload };
  } else {
    const { error } = await supabase.from('blog_posts').insert(payload);
    if (error) { console.error('upsertBlogPost insert error:', error); return null; }
    return { ...payload } as BlogPost;
  }
}

export async function deleteBlogPost(id: number): Promise<boolean> {
  const { error } = await supabase.from('blog_posts').delete().eq('id', id);
  if (error) { console.error('deleteBlogPost error:', error); return false; }
  return true;
}

export async function uploadBlogImage(file: File): Promise<string | null> {
  const { blob, ext, mime } = await compressFileIfImage(file);
  const path = `blog/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage
    .from(BUCKET).upload(path, blob, { upsert: true, contentType: mime });
  if (error) { console.error('uploadBlogImage error:', error); return null; }
  return supabase.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl;
}

// ─── Epic 7: Diet Templates ───────────────────────────────────────────────────────────────?

export interface DietTemplateFood {
  id:                 number;
  template_meal_id:   number;
  food_name:          string;
  quantity?:          number;
  unit?:              string;
  household_measure?: string;
  measure_amount?:    number;
  kcal_per_100g?:     number;
  protein_per_100g?:  number;
  carbs_per_100g?:    number;
  fat_per_100g?:      number;
  food_group?:        string;
  notes?:             string;
  order_index?:       number;
}

export interface DietTemplateMeal {
  id:                  number;
  template_id:         number;
  meal_name:           string;
  time_suggestion?:    string;
  order_index?:        number;
  notes?:              string;
  is_substitution_of?: number | null;
  foods?:              DietTemplateFood[];
}

export interface DietTemplate {
  id:           number;
  name:         string;
  description?: string;
  strategy?:    string;
  total_kcal?:  number;
  protein_g?:   number;
  carbs_g?:     number;
  fat_g?:       number;
  is_active?:   boolean;
  created_at?:  string;
  meals?:       DietTemplateMeal[];
}

export async function fetchDietTemplates(): Promise<DietTemplate[]> {
  const { data, error } = await supabase
    .from("diet_templates")
    .select("*, meals:diet_template_meals(*, foods:diet_template_foods(*))")
    .eq("is_active", true)
    .order("name");
  if (error) { console.error("[Supabase] fetchDietTemplates:", error.message); return []; }
  type DietTemplateMealRow = DietTemplateMeal & { foods?: DietTemplateFood[] | null };
  type DietTemplateRow = DietTemplate & { meals?: DietTemplateMealRow[] | null };
  return ((data ?? []) as DietTemplateRow[]).map((t) => ({
    ...t,
    meals: (t.meals ?? [])
      .sort((a: DietTemplateMeal, b: DietTemplateMeal) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map((m: DietTemplateMealRow) => ({
        ...m,
        foods: (m.foods ?? []).sort((a: DietTemplateFood, b: DietTemplateFood) => (a.order_index ?? 0) - (b.order_index ?? 0)),
      })),
  }));
}

export async function upsertDietTemplate(
  template: Omit<DietTemplate, "meals" | "created_at">
): Promise<DietTemplate | null> {
  const { id, ...fields } = template;
  if (id) {
    const { error } = await supabaseAdmin.from("diet_templates").update(fields).eq("id", id);
    if (error) { console.error("[Supabase] upsertDietTemplate update:", error.message); return null; }
    return { id, ...fields } as DietTemplate;
  }
  const { data, error } = await supabaseAdmin
    .from("diet_templates")
    .insert(fields)
    .select()
    .single();
  if (error) { console.error("[Supabase] upsertDietTemplate insert:", error.message); return null; }
  return data;
}

export async function deleteDietTemplate(id: number): Promise<boolean> {
  const { error } = await supabaseAdmin.from("diet_templates").delete().eq("id", id);
  if (error) { console.error("[Supabase] deleteDietTemplate:", error.message); return false; }
  return true;
}

type TemplateFoodInput = {
  food_name:          string;
  quantity?:          number;
  unit?:              string;
  kcal_per_100g?:     number;
  protein_per_100g?:  number;
  carbs_per_100g?:    number;
  fat_per_100g?:      number;
  household_measure?: string;
  measure_amount?:    number;
  food_group?:        string;
  notes?:             string;
  order_index:        number;
};

type TemplateMealInput = {
  meal_name:        string;
  time_suggestion?: string;
  order_index:      number;
  notes?:           string;
  foods:            TemplateFoodInput[];
  /** Refeições alternativas completas para esta refeição */
  substitutions?:   Omit<TemplateMealInput, "substitutions">[];
};

async function insertTemplateMealWithFoods(
  templateId: number,
  meal: Omit<TemplateMealInput, "substitutions">,
  isSubstitutionOf?: number,
): Promise<number | null> {
  const { data, error } = await supabaseAdmin
    .from("diet_template_meals")
    .insert({
      template_id:        templateId,
      meal_name:          meal.meal_name,
      time_suggestion:    meal.time_suggestion ?? "",
      order_index:        meal.order_index,
      notes:              meal.notes ?? null,
      is_substitution_of: isSubstitutionOf ?? null,
    })
    .select()
    .single();
  if (error || !data) { console.error("[Supabase] insertTemplateMealWithFoods:", error?.message); return null; }

  const validFoods = meal.foods.filter((f) => f.food_name.trim() !== "");
  if (validFoods.length > 0) {
    const foodRows = validFoods.map((f) => ({
      template_meal_id:  data.id,
      food_name:         f.food_name,
      quantity:          f.quantity          ?? null,
      unit:              f.unit              ?? "g",
      kcal_per_100g:     f.kcal_per_100g     ?? null,
      protein_per_100g:  f.protein_per_100g  ?? null,
      carbs_per_100g:    f.carbs_per_100g    ?? null,
      fat_per_100g:      f.fat_per_100g      ?? null,
      household_measure: f.household_measure ?? null,
      measure_amount:    f.measure_amount    ?? null,
      food_group:        f.food_group        ?? null,
      notes:             f.notes             ?? null,
      order_index:       f.order_index,
    }));
    const { error: foodErr } = await supabaseAdmin.from("diet_template_foods").insert(foodRows);
    if (foodErr) { console.error("[Supabase] insertTemplateMealWithFoods foods:", foodErr.message); return null; }
  }
  return data.id;
}

/** Apaga e re-insere todas as refei??es (+ alimentos) de um template. */
export async function saveDietTemplateMeals(
  templateId: number,
  meals: TemplateMealInput[],
): Promise<boolean> {
  try {
    const { error: delErr } = await supabaseAdmin
      .from("diet_template_meals")
      .delete()
      .eq("template_id", templateId);
    if (delErr) { console.error("[Supabase] saveDietTemplateMeals delete:", delErr.message); return false; }

    for (const meal of meals) {
      const { substitutions, ...mealData } = meal;
      const parentId = await insertTemplateMealWithFoods(templateId, mealData);
      if (!parentId) return false;

      for (const sub of (substitutions ?? [])) {
        const ok = await insertTemplateMealWithFoods(templateId, sub, parentId);
        if (!ok) return false;
      }
    }
    return true;
  } catch (err) {
    console.error("[Supabase] saveDietTemplateMeals exception:", err);
    return false;
  }
}

// ─── Meal Presets ────────────────────────────────────────────────────────────?

export interface MealPresetFood {
  id?: number;
  preset_id: number;
  food_name: string;
  quantity?: number;
  unit?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  notes?: string;
  sort_order?: number;
  household_measure?: string;
  measure_amount?: number;
  food_group?: string;
  created_at?: string;
}

export interface MealPreset {
  id: number;
  name: string;
  description?: string;
  meal_name: string;
  time_suggestion?: string;
  notes?: string;
  strategy?: string;
  total_kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  is_active?: boolean;
  source_template_id?: number | null;
  source_template_meal_id?: number | null;
  created_at?: string;
  foods?: MealPresetFood[];
}

export async function fetchMealPresets(): Promise<MealPreset[]> {
  const { data, error } = await supabase
    .from("meal_presets")
    .select("*, foods:meal_preset_foods(*)")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("[Supabase] fetchMealPresets:", error.message);
    return [];
  }

  return (data ?? []).map((preset: MealPreset & { foods?: MealPresetFood[] }) => ({
    ...preset,
    foods: (preset.foods ?? []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  }));
}

export async function upsertMealPreset(
  preset: Omit<MealPreset, "foods" | "created_at"> & { id?: number },
): Promise<MealPreset | null> {
  const { id, ...fields } = preset;

  if (id) {
    const { error } = await supabaseAdmin.from("meal_presets").update(fields).eq("id", id);
    if (error) {
      console.error("[Supabase] upsertMealPreset update:", error.message);
      return null;
    }
    return { id, ...(fields as Omit<MealPreset, "foods" | "created_at">) } as MealPreset;
  }

  const { data, error } = await supabaseAdmin
    .from("meal_presets")
    .insert(fields)
    .select()
    .single();

  if (error) {
    console.error("[Supabase] upsertMealPreset insert:", error.message);
    return null;
  }

  return data as MealPreset;
}

export async function deleteMealPreset(id: number): Promise<boolean> {
  const { error } = await supabaseAdmin.from("meal_presets").delete().eq("id", id);
  if (error) {
    console.error("[Supabase] deleteMealPreset:", error.message);
    return false;
  }
  return true;
}

export async function saveMealPresetFoods(presetId: number, foods: MealPresetFood[]): Promise<boolean> {
  try {
    const { error: deleteError } = await supabaseAdmin
      .from("meal_preset_foods")
      .delete()
      .eq("preset_id", presetId);

    if (deleteError) {
      console.error("[Supabase] saveMealPresetFoods delete:", deleteError.message);
      return false;
    }

    const validFoods = foods.filter((food) => food.food_name.trim() !== "");
    if (validFoods.length === 0) {
      return true;
    }

    const rows = validFoods.map((food, index) => ({
      preset_id: presetId,
      food_name: food.food_name,
      quantity: food.quantity ?? null,
      unit: food.unit ?? "g",
      calories: food.calories ?? null,
      protein: food.protein ?? null,
      carbs: food.carbs ?? null,
      fat: food.fat ?? null,
      notes: food.notes ?? null,
      sort_order: food.sort_order ?? index,
      household_measure: food.household_measure ?? null,
      measure_amount: food.measure_amount ?? null,
      food_group: food.food_group ?? null,
    }));

    const { error: insertError } = await supabaseAdmin.from("meal_preset_foods").insert(rows);
    if (insertError) {
      console.error("[Supabase] saveMealPresetFoods insert:", insertError.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[Supabase] saveMealPresetFoods exception:", err);
    return false;
  }
}

// ─── Lab Exams ────────────────────────────────────────────────────────────────────────??

export interface LabExam {
  id?: number;
  patient_id: number;
  exam_date: string;
  lab_name?: string;
  notes?: string;
  created_at?: string;
  results?: LabResult[];
}

export interface LabResult {
  id?: number;
  exam_id?: number;
  exam_name: string;
  value_num?: number;
  value_text?: string;
  unit?: string;
  ref_min?: number;
  ref_max?: number;
  ref_text?: string;
  status?: string;
  notes?: string;
}

export async function fetchLabExams(patientId: number): Promise<LabExam[]> {
  const { data, error } = await supabaseAdmin
    .from("lab_exams")
    .select("*, results:lab_results(*)")
    .eq("patient_id", patientId)
    .order("exam_date", { ascending: false });
  if (error) { console.error("[Supabase] fetchLabExams:", error.message); return []; }
  return data ?? [];
}

export async function upsertLabExam(exam: LabExam): Promise<LabExam | null> {
  const { results: _, ...fields } = exam;
  if (exam.id) {
    const { data, error } = await supabaseAdmin.from("lab_exams").update(fields).eq("id", exam.id).select().single();
    if (error) { console.error("[Supabase] upsertLabExam update:", error.message); return null; }
    return data;
  }
  const { data, error } = await supabaseAdmin.from("lab_exams").insert(fields).select().single();
  if (error) { console.error("[Supabase] upsertLabExam insert:", error.message); return null; }
  return data;
}

export async function deleteLabExam(id: number): Promise<boolean> {
  const { error } = await supabaseAdmin.from("lab_exams").delete().eq("id", id);
  if (error) { console.error("[Supabase] deleteLabExam:", error.message); return false; }
  return true;
}

export async function saveLabResults(examId: number, results: LabResult[]): Promise<boolean> {
  await supabaseAdmin.from("lab_results").delete().eq("exam_id", examId);
  if (results.length === 0) return true;
  const rows = results.map(r => ({ ...r, exam_id: examId, id: undefined }));
  const { error } = await supabaseAdmin.from("lab_results").insert(rows);
  if (error) { console.error("[Supabase] saveLabResults:", error.message); return false; }
  return true;
}

// ─── Epic 10: Protocolo de Exames com Alvos Terapêuticos ─────────────────────?

export interface ExamCatalogItem {
  id:                number;
  name:              string;
  group_category:    string;
  unit?:             string;
  ref_min?:          number;
  ref_max?:          number;
  target_male_min?:  number;
  target_male_max?:  number;
  target_female_min?:number;
  target_female_max?:number;
  request_item_id?:  number;
  request_notes?:    string | null;
}

export interface ExamProtocol {
  id:          number;
  name:        string;
  description?:string;
  exams?:      ExamCatalogItem[];
}

export type ExamRequestStatus = "pending" | "completed";

export interface PatientExamRequest {
  id?:         number;
  patient_id:  number;
  protocol_id?:number;
  global_protocol_id?: number | null;
  status:      ExamRequestStatus;
  notes?:      string;
  created_at?: string;
  protocol?:   ExamProtocol;
  items?:      ExamCatalogItem[];
  results?:    PatientExamResult[];
}

export interface PatientExamResult {
  id?:            number;
  request_id?:    number;
  exam_id:        number;
  global_exam_id?: number | null;
  legacy_exam_id?: number | null;
  result_value?:  number;
  date_collected?:string;
  notes?:         string;
  exam?:          ExamCatalogItem;
}

export interface ExamRequestItemInput {
  exam:  ExamCatalogItem;
  notes?: string | null;
}

type LegacyExamCatalogRow = ExamCatalogItem;
type GlobalExamRow = GlobalExam & { id: number };
type LegacyProtocolRow = ExamProtocol;
type GlobalProtocolRow = GlobalProtocol & { id: number };

type PatientExamRequestItemRow = {
  id?: number;
  notes?: string | null;
  exam_id?: number | null;
  global_exam_id?: number | null;
  exam_name?: string | null;
  group_category?: string | null;
  unit?: string | null;
  ref_min?: number | null;
  ref_max?: number | null;
  target_male_min?: number | null;
  target_male_max?: number | null;
  target_female_min?: number | null;
  target_female_max?: number | null;
  exam?: LegacyExamCatalogRow | null;
  global_exam?: GlobalExamRow | null;
};

type PatientExamRequestRow = Omit<PatientExamRequest, "status" | "protocol" | "items"> & {
  status?: string | null;
  status_key?: ExamRequestStatus | null;
  protocol?: LegacyProtocolRow | null;
  global_protocol?: GlobalProtocolRow | null;
  items?: PatientExamRequestItemRow[] | null;
};

function mapGlobalExamToCatalogItem(exam: GlobalExamRow): ExamCatalogItem {
  return {
    id: exam.id,
    name: exam.name,
    group_category: exam.category,
    unit: exam.unit ?? undefined,
    ref_min: exam.lab_ref_min ?? undefined,
    ref_max: exam.lab_ref_max ?? undefined,
    target_male_min: exam.target_male_min ?? undefined,
    target_male_max: exam.target_male_max ?? undefined,
    target_female_min: exam.target_female_min ?? undefined,
    target_female_max: exam.target_female_max ?? undefined,
  };
}

function mapRequestStatus(row: { status?: string | null; status_key?: ExamRequestStatus | null }): ExamRequestStatus {
  if (row.status_key === "completed" || row.status === "Concluído" || row.status === "Concluido") {
    return "completed";
  }
  return "pending";
}

function mapRequestProtocol(row: PatientExamRequestRow): ExamProtocol | undefined {
  if (row.global_protocol?.id) {
    return {
      id: row.global_protocol.id,
      name: row.global_protocol.name,
      description: row.global_protocol.description,
    };
  }
  return row.protocol ?? undefined;
}

function mapRequestItem(row: PatientExamRequestItemRow): ExamCatalogItem | null {
  const base = row.global_exam
    ? mapGlobalExamToCatalogItem(row.global_exam)
    : row.exam ?? null;
  if (!base && !row.exam_name) return null;

  return {
    id: row.global_exam_id ?? base?.id ?? row.exam_id ?? 0,
    name: row.exam_name ?? base?.name ?? "Exame",
    group_category: row.group_category ?? base?.group_category ?? "Geral",
    unit: row.unit ?? base?.unit,
    ref_min: row.ref_min ?? base?.ref_min,
    ref_max: row.ref_max ?? base?.ref_max,
    target_male_min: row.target_male_min ?? base?.target_male_min,
    target_male_max: row.target_male_max ?? base?.target_male_max,
    target_female_min: row.target_female_min ?? base?.target_female_min,
    target_female_max: row.target_female_max ?? base?.target_female_max,
    request_item_id: row.id,
    request_notes: row.notes ?? null,
  };
}

function mapExamRequest(row: PatientExamRequestRow): PatientExamRequest {
  return {
    ...row,
    status: mapRequestStatus(row),
    protocol: mapRequestProtocol(row),
    items: (row.items ?? []).map(mapRequestItem).filter((item): item is ExamCatalogItem => Boolean(item)),
    results: (row.results ?? []).map((result) => ({
      ...result,
      legacy_exam_id: result.exam_id ?? null,
      exam_id: result.global_exam_id ?? result.exam_id,
    })),
  };
}

export async function fetchExamsCatalog(): Promise<ExamCatalogItem[]> {
  const { data, error } = await supabaseAdmin
    .from("global_exams_catalog")
    .select("*")
    .order("category")
    .order("name");
  if (error) { console.error("[Supabase] fetchExamsCatalog:", error.message); return []; }
  return ((data ?? []) as GlobalExamRow[]).map(mapGlobalExamToCatalogItem);
}

export async function fetchExamProtocols(): Promise<ExamProtocol[]> {
  const { data, error } = await supabaseAdmin
    .from("global_exam_protocols")
    .select("*, exams:global_protocol_items(sort_order, exam:global_exams_catalog(*))")
    .order("name");
  if (error) { console.error("[Supabase] fetchExamProtocols:", error.message); return []; }
  return (data ?? []).map((p) => ({
    ...p,
    exams: (p.exams ?? [])
      .sort((a: { sort_order?: number | null }, b: { sort_order?: number | null }) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((pe: { exam: GlobalExamRow | null }) => pe.exam ? mapGlobalExamToCatalogItem(pe.exam) : null)
      .filter((exam: ExamCatalogItem | null): exam is ExamCatalogItem => Boolean(exam)),
  }));
}

export async function fetchExamRequests(patientId: number): Promise<PatientExamRequest[]> {
  const { data, error } = await supabaseAdmin
    .from("patient_exam_requests")
    .select(`
      *,
      protocol:exam_protocols(id, name),
      global_protocol:global_exam_protocols(id, name, description),
      items:patient_exam_request_items(
        id,
        notes,
        exam_id,
        global_exam_id,
        exam_name,
        group_category,
        unit,
        ref_min,
        ref_max,
        target_male_min,
        target_male_max,
        target_female_min,
        target_female_max,
        exam:exams_catalog(*),
        global_exam:global_exams_catalog(*)
      ),
      results:patient_exam_results(*)
    `)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) { console.error("[Supabase] fetchExamRequests:", error.message); return []; }
  return ((data ?? []) as PatientExamRequestRow[]).map(mapExamRequest);
}

export async function fetchExamRequest(requestId: number): Promise<PatientExamRequest | null> {
  const { data, error } = await supabaseAdmin
    .from("patient_exam_requests")
    .select(`
      *,
      protocol:exam_protocols(id, name),
      global_protocol:global_exam_protocols(id, name, description),
      items:patient_exam_request_items(
        id,
        notes,
        exam_id,
        global_exam_id,
        exam_name,
        group_category,
        unit,
        ref_min,
        ref_max,
        target_male_min,
        target_male_max,
        target_female_min,
        target_female_max,
        exam:exams_catalog(*),
        global_exam:global_exams_catalog(*)
      ),
      results:patient_exam_results(*)
    `)
    .eq("id", requestId)
    .single();
  if (error) { console.error("[Supabase] fetchExamRequest:", error.message); return null; }
  return mapExamRequest(data as PatientExamRequestRow);
}

export async function createExamRequest(
  patientId: number,
  protocolId: number | undefined,
  items: ExamRequestItemInput[],
  notes?: string,
): Promise<number | null> {
  const { data, error } = await supabaseAdmin
    .from("patient_exam_requests")
    .insert({
      patient_id: patientId,
      protocol_id: null,
      global_protocol_id: protocolId ?? null,
      notes: notes ?? null,
      status: "Pendente",
      status_key: "pending",
    })
    .select("id")
    .single();
  if (error || !data?.id) { console.error("[Supabase] createExamRequest:", error?.message); return null; }
  const requestId = data.id as number;
  if (items.length > 0) {
    const rows = items.map(({ exam, notes: itemNotes }) => ({
      request_id: requestId,
      exam_id: null,
      global_exam_id: exam.id,
      notes: itemNotes?.trim() || null,
      exam_name: exam.name,
      group_category: exam.group_category,
      unit: exam.unit ?? null,
      ref_min: exam.ref_min ?? null,
      ref_max: exam.ref_max ?? null,
      target_male_min: exam.target_male_min ?? null,
      target_male_max: exam.target_male_max ?? null,
      target_female_min: exam.target_female_min ?? null,
      target_female_max: exam.target_female_max ?? null,
    }));
    const { error: itemErr } = await supabaseAdmin.from("patient_exam_request_items").insert(rows);
    if (itemErr) { console.error("[Supabase] createExamRequest items:", itemErr.message); return null; }
  }
  return requestId;
}

export async function updateExamRequestStatus(
  requestId: number,
  status: ExamRequestStatus,
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("patient_exam_requests")
    .update({
      status_key: status,
      status: status === "completed" ? "Concluído" : "Pendente",
    })
    .eq("id", requestId);
  if (error) { console.error("[Supabase] updateExamRequestStatus:", error.message); return false; }
  return true;
}

export async function saveExamResults(
  requestId: number,
  results: PatientExamResult[],
): Promise<boolean> {
  const { error: deleteError } = await supabaseAdmin
    .from("patient_exam_results")
    .delete()
    .eq("request_id", requestId);
  if (deleteError) { console.error("[Supabase] saveExamResults delete:", deleteError.message); return false; }

  if (results.length === 0) return true;

  const rows = results.map((r) => ({
    request_id:     requestId,
    exam_id:        r.legacy_exam_id ?? null,
    global_exam_id: r.exam_id,
    result_value:   r.result_value ?? null,
    date_collected: r.date_collected ?? null,
    notes:          r.notes ?? null,
  }));

  const { error } = await supabaseAdmin.from("patient_exam_results").insert(rows);
  if (error) {
    console.error("[Supabase] saveExamResults insert:", error.message);
    return false;
  }
  return true;
}

export async function deleteExamRequest(requestId: number): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("patient_exam_requests")
    .delete()
    .eq("id", requestId);
  if (error) { console.error("[Supabase] deleteExamRequest:", error.message); return false; }
  return true;
}

// ─── Epic 11: Prescrição Magistral ──────────────────────────────────────────??

export interface Substrate {
  id:           number;
  name:         string;
  category:     string;
  min_dose?:    number | null;
  ideal_dose?:  number | null;
  max_dose?:    number | null;
  unit:         string;
  purpose?:     string | null;
  interactions?:string | null;
}

export interface FormulaItem {
  name?:          string | null;
  substrate_id?:  number | null;
  substrate_name?: string;
  substrate?:     { name: string } | null;
  applied_dose:   number;
  unit:           string;
  sort_order?:    number;
}

export interface ReadyFormula {
  id:                 number;
  name:               string;
  objective:          string;
  posology?:          string | null;
  pharmaceutical_form:string;
  items?:             FormulaItem[];
}

export interface PrescriptionBlockItemInput {
  substrateId?: number;
  name:         string;
  dose:         number;
  unit:         string;
}

export interface PrescriptionBlockInput {
  label:              string;
  pharmaceuticalForm: string;
  posology:           string;
  items:              PrescriptionBlockItemInput[];
}

export async function fetchSubstrates(): Promise<Substrate[]> {
  const { data, error } = await supabaseAdmin
    .from("substrates")
    .select("*")
    .order("category")
    .order("name");
  if (error) { console.error("[Supabase] fetchSubstrates:", error.message); return []; }
  return data ?? [];
}

export async function fetchReadyFormulas(): Promise<ReadyFormula[]> {
  const mapFormulas = (rows: Array<{
    items?: FormulaItem[];
  } & Omit<ReadyFormula, "items">>): ReadyFormula[] => rows.map((f) => ({
    ...f,
    items: (f.items ?? [])
      .sort((a: FormulaItem, b: FormulaItem) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((fi: FormulaItem) => ({
        ...fi,
        substrate_name: fi.name ?? fi.substrate?.name ?? "",
    })),
  }));

  const { data, error } = await supabaseAdmin
    .from("ready_formulas")
    .select(`*, items:formula_items(name, substrate_id, applied_dose, unit, sort_order, substrate:substrates(name))`)
    .order("objective")
    .order("name");
  if (!error) return mapFormulas((data ?? []) as Array<ReadyFormula & { items?: FormulaItem[] }>);

  const legacy = await supabaseAdmin
    .from("ready_formulas")
    .select(`*, items:formula_items(substrate_id, applied_dose, unit, sort_order, substrate:substrates(name))`)
    .order("objective")
    .order("name");
  if (legacy.error) {
    console.error("[Supabase] fetchReadyFormulas:", legacy.error.message);
    return [];
  }
  return mapFormulas((legacy.data ?? []) as Array<ReadyFormula & { items?: FormulaItem[] }>);
}

export interface ReadyFormulaCreateInput {
  name: string;
  objective: string;
  posology?: string | null;
  pharmaceuticalForm: string;
  items: {
    substrateId?: number | null;
    name: string;
    appliedDose: number;
    unit: string;
  }[];
}

export async function insertReadyFormula(input: ReadyFormulaCreateInput): Promise<boolean> {
  if (input.items.length === 0) {
    console.error("[Supabase] insertReadyFormula: no items provided");
    return false;
  }

  const resolveSubstrateId = async (item: ReadyFormulaCreateInput["items"][number], index: number): Promise<number | null> => {
    if (item.substrateId != null) return item.substrateId;

    const normalizedName = item.name.trim();
    if (!normalizedName) {
      console.error(`[Supabase] insertReadyFormula item ${index}: missing substrate name`);
      return null;
    }

    const { data: existingSubstrate, error: findError } = await supabaseAdmin
      .from("substrates")
      .select("id")
      .eq("name", normalizedName)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (findError) {
      console.error(`[Supabase] insertReadyFormula resolve substrate ${index}:`, findError.message);
      return null;
    }

    if (existingSubstrate?.id) return existingSubstrate.id as number;

    const { data: createdSubstrate, error: createSubstrateError } = await supabaseAdmin
      .from("substrates")
      .insert({
        name: normalizedName,
        category: "Outros",
        ideal_dose: item.appliedDose,
        unit: item.unit,
      })
      .select("id")
      .single();

    if (createSubstrateError || !createdSubstrate?.id) {
      console.error(`[Supabase] insertReadyFormula create substrate ${index}:`, createSubstrateError?.message);
      return null;
    }

    return createdSubstrate.id as number;
  };

  const createFormulaRow = async () => supabaseAdmin
    .from("ready_formulas")
    .insert({
      name: input.name,
      objective: input.objective,
      posology: input.posology ?? null,
      pharmaceutical_form: input.pharmaceuticalForm,
    })
    .select("id")
    .single();

  const createItems = async (formulaId: number, includeName: boolean) => {
    const rows = await Promise.all(input.items.map(async (item, index) => ({
      formula_id: formulaId,
      substrate_id: await resolveSubstrateId(item, index),
      ...(includeName ? { name: item.name } : {}),
      applied_dose: item.appliedDose,
      unit: item.unit,
      sort_order: index,
    })));
    return supabaseAdmin.from("formula_items").insert(rows);
  };

  const { data, error } = await createFormulaRow();

  if (error || !data?.id) {
    console.error("[Supabase] insertReadyFormula:", error?.message);
    return false;
  }

  const { error: itemsError } = await createItems(data.id as number, true);

  if (itemsError) {
    console.error("[Supabase] insertReadyFormula items:", itemsError.message);
    await supabaseAdmin.from("ready_formulas").delete().eq("id", data.id as number);
    if (input.items.every((item) => item.substrateId != null)) {
      const legacyCreate = await createFormulaRow();
      if (legacyCreate.error || !legacyCreate.data?.id) {
        console.error("[Supabase] insertReadyFormula legacy:", legacyCreate.error?.message);
        return false;
      }

      const { error: legacyItemsError } = await createItems(legacyCreate.data.id as number, false);
      if (legacyItemsError) {
        console.error("[Supabase] insertReadyFormula legacy items:", legacyItemsError.message);
        await supabaseAdmin.from("ready_formulas").delete().eq("id", legacyCreate.data.id as number);
        return false;
      }
      return true;
    }
    return false;
  }

  return true;
}

export async function insertSubstrate(sub: Omit<Substrate, "id">): Promise<Substrate | null> {
  const { data, error } = await supabaseAdmin
    .from("substrates")
    .insert(sub)
    .select()
    .single();
  if (error) { console.error("[Supabase] insertSubstrate:", error.message); return null; }
  return data;
}

export async function savePrescription(
  patientId: number,
  blocks: PrescriptionBlockInput[],
  prescriptionId?: number,
): Promise<boolean> {
  let targetId = prescriptionId;

  if (targetId) {
    // Editing: Delete old blocks (which deletes old items cascadingly)
    const { error: deleteErr } = await supabaseAdmin
      .from("prescription_blocks")
      .delete()
      .eq("prescription_id", targetId);
    if (deleteErr) { console.error("[Supabase] savePrescription update blocks delete:", deleteErr.message); return false; }
  } else {
    // Creating: Insert new prescription
    const { data, error } = await supabaseAdmin
      .from("prescriptions")
      .insert({ patient_id: patientId })
      .select("id")
      .single();
    if (error || !data?.id) { console.error("[Supabase] savePrescription insert:", error?.message); return false; }
    targetId = data.id as number;
  }

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const { data: blockData, error: blockErr } = await supabaseAdmin
      .from("prescription_blocks")
      .insert({
        prescription_id:     targetId,
        label:               b.label,
        pharmaceutical_form: b.pharmaceuticalForm,
        posology:            b.posology || null,
        sort_order:          i,
      })
      .select("id")
      .single();
    if (blockErr || !blockData?.id) { console.error("[Supabase] savePrescription block insert:", blockErr?.message); return false; }
    const blockId = blockData.id as number;

    if (b.items.length > 0) {
      const itemRows = b.items.map((item, j) => ({
        block_id:     blockId,
        substrate_id: item.substrateId ?? null,
        name:         item.name,
        dose:         item.dose,
        unit:         item.unit,
        sort_order:   j,
      }));
      const { error: itemErr } = await supabaseAdmin.from("prescription_block_items").insert(itemRows);
      if (itemErr) { console.error("[Supabase] savePrescription items insert:", itemErr.message); return false; }
    }
  }
  return true;
}

export interface SavedPrescription {
  id:         number;
  created_at: string;
  notes?:     string | null;
  blocks:     {
    id:                 number;
    label:              string;
    pharmaceutical_form:string;
    posology?:          string | null;
    sort_order:         number;
    items: { substrate_id?: number | null; name: string; dose: number; unit: string; sort_order: number }[];
  }[];
}

export async function fetchPrescriptions(patientId: number): Promise<SavedPrescription[]> {
  const { data, error } = await supabaseAdmin
    .from("prescriptions")
    .select(`id, created_at, notes, blocks:prescription_blocks(id, label, pharmaceutical_form, posology, sort_order, items:prescription_block_items(substrate_id, name, dose, unit, sort_order))`)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) { console.error("[Supabase] fetchPrescriptions:", error.message); return []; }
  return (data ?? []).map((p) => ({
    ...p,
    blocks: (p.blocks ?? [])
      .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
      .map((b: SavedPrescription["blocks"][number]) => ({
        ...b,
        items: (b.items ?? []).sort((x, y) => x.sort_order - y.sort_order),
      })),
  }));
}

export async function deletePrescription(prescriptionId: number): Promise<boolean> {
  const { error } = await supabaseAdmin.from("prescriptions").delete().eq("id", prescriptionId);
  if (error) { console.error("[Supabase] deletePrescription:", error.message); return false; }
  return true;
}

// ─── Epic 14: Motor de Substitui??es Inteligentes ───────────────────────────??

export async function fetchSmartSubstitutions(): Promise<import("./smartSubstitutions").SubstitutionRule[]> {
  const { BUILTIN_SUBSTITUTION_RULES } = await import("./smartSubstitutions");
  try {
    const { data, error } = await supabaseAdmin
      .from("smart_substitutions")
      .select("id, reference_food_name, ref_amount, substitute_food_name, sub_amount, category, criteria")
      .order("category")
      .order("reference_food_name");
    if (error || !data?.length) return BUILTIN_SUBSTITUTION_RULES;
    return data;
  } catch {
    return BUILTIN_SUBSTITUTION_RULES;
  }
}

// ─── Epic: Biblioteca Global de Exames ───────────────────────────────────────?

export interface GlobalExam {
  id?:                   number;
  name:                  string;
  category:              string;
  clinical_axis?:        string;
  unit?:                 string;
  lab_ref_min?:          number | null;
  lab_ref_max?:          number | null;
  target_male_min?:      number | null;
  target_male_max?:      number | null;
  target_female_min?:    number | null;
  target_female_max?:    number | null;
  clinical_observation?: string;
}

export interface GlobalProtocol {
  id?:          number;
  name:         string;
  description?: string;
}

export async function fetchGlobalExams(): Promise<GlobalExam[]> {
  const { data, error } = await supabaseAdmin
    .from("global_exams_catalog")
    .select("*")
    .order("category")
    .order("name");
  if (error) { console.error("[Supabase] fetchGlobalExams:", error.message); return []; }
  return data ?? [];
}

export async function upsertGlobalExam(exam: GlobalExam): Promise<GlobalExam | null> {
  const payload = { ...exam, updated_at: new Date().toISOString() };
  if (exam.id) {
    const { id, ...fields } = payload;
    const { data, error } = await supabaseAdmin
      .from("global_exams_catalog").update(fields).eq("id", id).select().single();
    if (error) { console.error("[Supabase] upsertGlobalExam update:", error.message); return null; }
    return data;
  } else {
    const { data, error } = await supabaseAdmin
      .from("global_exams_catalog").insert(payload).select().single();
    if (error) { console.error("[Supabase] upsertGlobalExam insert:", error.message); return null; }
    return data;
  }
}

export async function deleteGlobalExam(id: number): Promise<boolean> {
  const { error } = await supabaseAdmin.from("global_exams_catalog").delete().eq("id", id);
  if (error) { console.error("[Supabase] deleteGlobalExam:", error.message); return false; }
  return true;
}

export async function fetchGlobalProtocols(): Promise<GlobalProtocol[]> {
  const { data, error } = await supabaseAdmin
    .from("global_exam_protocols").select("*").order("name");
  if (error) { console.error("[Supabase] fetchGlobalProtocols:", error.message); return []; }
  return data ?? [];
}

export async function upsertGlobalProtocol(protocol: GlobalProtocol): Promise<GlobalProtocol | null> {
  if (protocol.id) {
    const { id, ...fields } = protocol;
    const { data, error } = await supabaseAdmin
      .from("global_exam_protocols").update(fields).eq("id", id).select().single();
    if (error) { console.error("[Supabase] upsertGlobalProtocol update:", error.message); return null; }
    return data;
  } else {
    const { data, error } = await supabaseAdmin
      .from("global_exam_protocols").insert(protocol).select().single();
    if (error) { console.error("[Supabase] upsertGlobalProtocol insert:", error.message); return null; }
    return data;
  }
}

export async function deleteGlobalProtocol(id: number): Promise<boolean> {
  const { error } = await supabaseAdmin.from("global_exam_protocols").delete().eq("id", id);
  if (error) { console.error("[Supabase] deleteGlobalProtocol:", error.message); return false; }
  return true;
}

export async function fetchProtocolExamIds(protocolId: number): Promise<number[]> {
  const { data, error } = await supabaseAdmin
    .from("global_protocol_items")
    .select("exam_id")
    .eq("protocol_id", protocolId)
    .order("sort_order", { ascending: true });
  if (error) { console.error("[Supabase] fetchProtocolExamIds:", error.message); return []; }
  return (data ?? []).map((r: { exam_id: number }) => r.exam_id);
}

export async function setProtocolExams(protocolId: number, examIds: number[]): Promise<boolean> {
  const { error: delErr } = await supabaseAdmin
    .from("global_protocol_items").delete().eq("protocol_id", protocolId);
  if (delErr) { console.error("[Supabase] setProtocolExams delete:", delErr.message); return false; }
  if (examIds.length === 0) return true;
  const rows = examIds.map((exam_id, sort_order) => ({ protocol_id: protocolId, exam_id, sort_order }));
  const { error } = await supabaseAdmin.from("global_protocol_items").insert(rows);
  if (error) { console.error("[Supabase] setProtocolExams insert:", error.message); return false; }
  return true;
}
