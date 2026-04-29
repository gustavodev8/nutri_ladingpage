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

// ─── Image Storage ────────────────────────────────────────────────────────────

const BUCKET = "images";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const ALLOWED_IMAGE_EXTS = ["jpg", "jpeg", "png", "webp", "gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"];
const ALLOWED_VIDEO_EXTS = ["mp4", "webm", "ogg"];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB
const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB

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
  if (error) { console.error("[Supabase] uploadPdf error:", error.message); return null; }
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

// ─── Clínica – Types ──────────────────────────────────────────────────────────

export interface Patient {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  gender?: "M" | "F" | "outro";
  occupation?: string;
  city?: string;
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

export interface Anamnesis {
  id?: number;
  patient_id: number;
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
}

// ─── Clínica – CRUD ───────────────────────────────────────────────────────────

// Patients
export async function fetchPatients(): Promise<Patient[]> {
  const { data, error } = await supabaseAdmin
    .from("patients")
    .select("*")
    .order("name");
  if (error) { console.error("[Supabase] fetchPatients:", error.message); return []; }
  return data ?? [];
}

export async function fetchPatient(id: number): Promise<Patient | null> {
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

export async function saveMeals(planId: number, meals: Meal[]): Promise<boolean> {
  const { error: delError } = await supabaseAdmin.from("meals").delete().eq("plan_id", planId);
  if (delError) { console.error("[Supabase] saveMeals delete:", delError.message); return false; }

  for (let i = 0; i < meals.length; i++) {
    const meal = meals[i];
    const { data: mealData, error: mealErr } = await supabaseAdmin
      .from("meals")
      .insert({ plan_id: planId, meal_name: meal.meal_name, time_suggestion: meal.time_suggestion ?? "", sort_order: i, notes: meal.notes ?? "" })
      .select()
      .single();
    if (mealErr || !mealData) { console.error("[Supabase] saveMeals insert meal:", mealErr?.message); return false; }

    if (meal.foods && meal.foods.length > 0) {
      const foodRows = meal.foods.map((f, fi) => ({
        meal_id: mealData.id,
        food_name: f.food_name,
        quantity: f.quantity ?? null,
        unit: f.unit ?? "g",
        calories: f.calories ?? null,
        protein: f.protein ?? null,
        carbs: f.carbs ?? null,
        fat: f.fat ?? null,
        notes: f.notes ?? "",
        sort_order: fi,
      }));
      const { error: foodErr } = await supabaseAdmin.from("meal_foods").insert(foodRows);
      if (foodErr) { console.error("[Supabase] saveMeals insert foods:", foodErr.message); return false; }
    }
  }
  return true;
}

// ─── Booking System ───────────────────────────────────────────────────────────

export interface AvailabilitySlot {
  id: number;
  date: string;        // ISO "2025-04-10"
  start_time: string;  // "09:00"
  type: 'online' | 'presencial';
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

/** Fetch slots for a specific date and type */
export async function fetchSlotsByDate(date: string, type: string): Promise<AvailabilitySlot[]> {
  const { data, error } = await supabase
    .from('availability_slots')
    .select('*')
    .eq('date', date)
    .eq('type', type)
    .eq('active', true)
    .order('start_time');
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
  // Tenta upsert por (booking_group_id, session_number) para ser idempotente:
  // se o booking já existe (ex: pré-salvo como pending antes do pagamento),
  // apenas atualiza o status sem duplicar.
  const { error } = await supabase
    .from('bookings')
    .upsert(booking, { onConflict: 'booking_group_id,session_number', ignoreDuplicates: false });
  if (error) {
    // Fallback: se upsert falhar (ex: sem constraint unique), tenta insert simples
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
    return created >= cutoff; // mantém só os pending recentes
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
  session_number?: number;      // 1 = consulta inicial, 2+ = retorno N-1
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

// ─── Blog ─────────────────────────────────────────────────────────────────────
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
    // UPDATE existing post by id — don't chain .select() to avoid RLS select restrictions
    const { error } = await supabase.from('blog_posts').update(payload).eq('id', id);
    if (error) { console.error('upsertBlogPost update error:', error); return null; }
    return { ...post, ...payload };
  } else {
    // INSERT new post — don't chain .select() to avoid RLS select restrictions
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
