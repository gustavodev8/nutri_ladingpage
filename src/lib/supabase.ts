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
// A segurança do painel admin é garantida pelo login (AdminLogin + ProtectedRoute).
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

// ─── Image Storage ────────────────────────────────────────────────────────────────

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

// ─── Clínica – Types ──────────────────────────────────────────────────────────────

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
  created_at?: string;
}

export interface PatientPhoto {
  id?: number;
  patient_id: number;
  url: string;
  label?: string;
  created_at?: string;
}

// ─── Epic 6: Triagem Clínica Estruturada ───────────────────────────────────────────
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

  // CLÍNICO / PATOLOGIAS
  clinical_treatment?: boolean;
  clinical_medications?: boolean;
  clinical_medications_list?: string;
  clinical_family_history?: boolean;
  clinical_hypertension?: boolean;
  clinical_diabetes?: boolean;
  clinical_dyslipidemia?: boolean;
  clinical_hypothyroidism?: boolean;
  clinical_pcos?: boolean;
  clinical_mental_health?: boolean;
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

export interface Meal {
  id?: number;
  plan_id: number;
  meal_name: string;
  time_suggestion?: string;
  sort_order?: number;
  notes?: string;
  foods?: MealFood[];
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
  // Epic 7: medidas caseiras
  household_measure?: string;   // ex: "colher de sopa", "unidade média"
  measure_amount?: number;      // ex: 1, 2, 0.5
  food_group?: string;          // ex: "Carboidrato", "Proteína" — para substituições
}

// ─── Clínica – CRUD ───────────────────────────────────────────────────────────────────

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

export async function upsertAnamnesis(a: Anamnesis): Promise<boolean | string> {
  const payload = { ...a, updated_at: new Date().toISOString() };
  if (a.id) {
    const { id, ...fields } = payload;
    const { error } = await supabaseAdmin.from("anamnesis").update(fields).eq("id", id);
    if (error) { console.error("[Supabase] upsertAnamnesis update:", error.message); return error.message; }
  } else {
    const { error } = await supabaseAdmin.from("anamnesis").insert(payload);
    if (error) { console.error("[Supabase] upsertAnamnesis insert:", error.message); return error.message; }
  }
  return true;
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
  return (data ?? []).map((m: any) => ({ ...m, foods: m.foods ?? [] }));
}

export async function saveMeals(planId: number, meals: Meal[]): Promise<string | null> {
  const { error: delError } = await supabaseAdmin.from("meals").delete().eq("plan_id", planId);
  if (delError) { console.error("[Supabase] saveMeals delete:", delError.message); return delError.message; }

  for (let i = 0; i < meals.length; i++) {
    const meal = meals[i];
    const { data: mealData, error: mealErr } = await supabaseAdmin
      .from("meals")
      .insert({ plan_id: planId, meal_name: meal.meal_name, time_suggestion: meal.time_suggestion ?? "", sort_order: i, notes: meal.notes ?? "" })
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

// ─── Booking System ───────────────────────────────────────────────────────────────────

export interface AvailabilitySlot {
  id: number;
  date: string;        // ISO "2025-04-10"
  start_time: string;  // "09:00"
  type: 'online' | 'presencial';
  city?: string;       // only for presencial slots
  active: boolean;
}

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
  status?: string;
  notes?: string;
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

export async function fetchBookingsForDate(date: string, type: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('appointment_time')
    .eq('appointment_date', date)
    .eq('type', type)
    .neq('status', 'cancelled');
  if (error) { console.error("fetchBookingsForDate error:", error); return []; }
  return data || [];
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

export async function updateBookingStatus(id: number, status: string, extra?: Record<string, unknown>): Promise<boolean> {
  const payload: Record<string, unknown> = { status, ...extra };
  const { error } = await supabaseAdmin.from('bookings').update(payload).eq('id', id);
  if (error) console.error('updateBookingStatus error:', JSON.stringify(error));
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

/** Filtra bookings com status 'pending' criados há mais de 24h (client-side, sem delete via anon key) */
export async function autoExpirePendingBookings(bookings: Booking[]): Promise<Booking[]> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return bookings.filter(b => {
    if (b.status !== 'pending') return true;
    const created = new Date(b.created_at || 0);
    return created >= cutoff;
  });
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

export async function confirmBookingsByGroupId(bookingGroupId: string): Promise<boolean> {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('booking_group_id', bookingGroupId);
  return !error;
}

// ─── Blog ────────────────────────────────────────────────────────────────────────────────
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

// ─── Epic 7: Diet Templates ────────────────────────────────────────────────────────────────

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
  id:               number;
  template_id:      number;
  meal_name:        string;
  time_suggestion?: string;
  order_index?:     number;
  notes?:           string;
  foods?:           DietTemplateFood[];
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
  return (data ?? []).map((t: any) => ({
    ...t,
    meals: (t.meals ?? [])
      .sort((a: DietTemplateMeal, b: DietTemplateMeal) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map((m: any) => ({
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

/** Apaga e re-insere todas as refeições (+ alimentos) de um template. */
export async function saveDietTemplateMeals(
  templateId: number,
  meals: Array<{
    meal_name:        string;
    time_suggestion?: string;
    order_index:      number;
    notes?:           string;
    foods: Array<{
      food_name:         string;
      quantity?:         number;
      unit?:             string;
      kcal_per_100g?:    number;
      protein_per_100g?: number;
      carbs_per_100g?:   number;
      fat_per_100g?:     number;
      household_measure?: string;
      measure_amount?:   number;
      food_group?:       string;
      notes?:            string;
      order_index:       number;
    }>;
  }>
): Promise<boolean> {
  try {
    const { error: delErr } = await supabaseAdmin
      .from("diet_template_meals")
      .delete()
      .eq("template_id", templateId);
    if (delErr) { console.error("[Supabase] saveDietTemplateMeals delete:", delErr.message); return false; }

    for (const meal of meals) {
      const { data: mealData, error: mealErr } = await supabaseAdmin
        .from("diet_template_meals")
        .insert({
          template_id:     templateId,
          meal_name:       meal.meal_name,
          time_suggestion: meal.time_suggestion ?? "",
          order_index:     meal.order_index,
          notes:           meal.notes ?? null,
        })
        .select()
        .single();
      if (mealErr || !mealData) { console.error("[Supabase] saveDietTemplateMeals insert meal:", mealErr?.message); return false; }

      const validFoods = meal.foods.filter((f) => f.food_name.trim() !== "");
      if (validFoods.length > 0) {
        const foodRows = validFoods.map((f) => ({
          template_meal_id:  mealData.id,
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
        if (foodErr) { console.error("[Supabase] saveDietTemplateMeals insert foods:", foodErr.message); return false; }
      }
    }
    return true;
  } catch (err) {
    console.error("[Supabase] saveDietTemplateMeals exception:", err);
    return false;
  }
}

// ─── Lab Exams ──────────────────────────────────────────────────────────────────────────

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

// ─── Epic 10: Protocolo de Exames com Alvos Terapêuticos ──────────────────────

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
}

export interface ExamProtocol {
  id:          number;
  name:        string;
  description?:string;
  exams?:      ExamCatalogItem[];
}

export interface PatientExamRequest {
  id?:         number;
  patient_id:  number;
  protocol_id?:number;
  status:      "Pendente" | "Concluído";
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
  result_value?:  number;
  date_collected?:string;
  notes?:         string;
  exam?:          ExamCatalogItem;
}

export async function fetchExamsCatalog(): Promise<ExamCatalogItem[]> {
  const { data, error } = await supabaseAdmin
    .from("exams_catalog")
    .select("*")
    .order("group_category")
    .order("name");
  if (error) { console.error("[Supabase] fetchExamsCatalog:", error.message); return []; }
  return data ?? [];
}

export async function fetchExamProtocols(): Promise<ExamProtocol[]> {
  const { data, error } = await supabaseAdmin
    .from("exam_protocols")
    .select("*, exams:protocol_exams(exam:exams_catalog(*))")
    .order("name");
  if (error) { console.error("[Supabase] fetchExamProtocols:", error.message); return []; }
  return (data ?? []).map((p) => ({
    ...p,
    exams: (p.exams ?? []).map((pe: { exam: ExamCatalogItem }) => pe.exam).filter(Boolean),
  }));
}

export async function fetchExamRequests(patientId: number): Promise<PatientExamRequest[]> {
  const { data, error } = await supabaseAdmin
    .from("patient_exam_requests")
    .select(`
      *,
      protocol:exam_protocols(id, name),
      items:patient_exam_request_items(exam:exams_catalog(*)),
      results:patient_exam_results(*)
    `)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) { console.error("[Supabase] fetchExamRequests:", error.message); return []; }
  return (data ?? []).map((r) => ({
    ...r,
    items: (r.items ?? []).map((i: { exam: ExamCatalogItem }) => i.exam).filter(Boolean),
  }));
}

export async function fetchExamRequest(requestId: number): Promise<PatientExamRequest | null> {
  const { data, error } = await supabaseAdmin
    .from("patient_exam_requests")
    .select(`
      *,
      protocol:exam_protocols(id, name),
      items:patient_exam_request_items(exam:exams_catalog(*)),
      results:patient_exam_results(*)
    `)
    .eq("id", requestId)
    .single();
  if (error) { console.error("[Supabase] fetchExamRequest:", error.message); return null; }
  return {
    ...data,
    items: (data.items ?? []).map((i: { exam: ExamCatalogItem }) => i.exam).filter(Boolean),
  };
}

export async function createExamRequest(
  patientId: number,
  protocolId: number | undefined,
  examIds: number[],
  notes?: string,
): Promise<number | null> {
  const { data, error } = await supabaseAdmin
    .from("patient_exam_requests")
    .insert({ patient_id: patientId, protocol_id: protocolId ?? null, notes: notes ?? null, status: "Pendente" })
    .select("id")
    .single();
  if (error || !data?.id) { console.error("[Supabase] createExamRequest:", error?.message); return null; }
  const requestId = data.id as number;
  if (examIds.length > 0) {
    const items = examIds.map((examId) => ({ request_id: requestId, exam_id: examId }));
    const { error: itemErr } = await supabaseAdmin.from("patient_exam_request_items").insert(items);
    if (itemErr) { console.error("[Supabase] createExamRequest items:", itemErr.message); return null; }
  }
  return requestId;
}

export async function updateExamRequestStatus(
  requestId: number,
  status: "Pendente" | "Concluído",
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("patient_exam_requests")
    .update({ status })
    .eq("id", requestId);
  if (error) { console.error("[Supabase] updateExamRequestStatus:", error.message); return false; }
  return true;
}

export async function saveExamResults(
  requestId: number,
  results: PatientExamResult[],
): Promise<boolean> {
  for (const r of results) {
    const row = {
      request_id:     requestId,
      exam_id:        r.exam_id,
      result_value:   r.result_value ?? null,
      date_collected: r.date_collected ?? null,
      notes:          r.notes ?? null,
    };
    const { error } = await supabaseAdmin
      .from("patient_exam_results")
      .upsert(row, { onConflict: "request_id,exam_id" });
    if (error) { console.error("[Supabase] saveExamResults upsert:", error.message); return false; }
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
