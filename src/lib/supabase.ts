import { createClient } from "@supabase/supabase-js";
import type { SiteContent } from "@/contexts/ContentContext";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase não configurado. Crie um arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

export async function uploadImage(file: File): Promise<string | null> {
  const ext = file.name.split(".").pop();
  const path = `products/${Date.now()}.${ext}`;

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
async function compressFileIfImage(file: File): Promise<{ blob: Blob; ext: string; mime: string }> {
  const isImage = file.type.startsWith("image/") && file.type !== "image/gif";
  if (!isImage) return { blob: file, ext: file.name.split(".").pop() || "bin", mime: file.type };

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      // Redimensiona mantendo proporção — máx 1920px no lado maior
      const MAX = 1920;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
        else                { width = Math.round((width * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve({ blob: blob ?? file, ext: "jpg", mime: "image/jpeg" }),
        "image/jpeg",
        0.82 // qualidade 82% — bom equilíbrio entre tamanho e nitidez
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ blob: file, ext: file.name.split(".").pop() || "bin", mime: file.type }); };
    img.src = url;
  });
}

export async function uploadRecordFile(file: File, groupId: string): Promise<string | null> {
  const { blob, ext, mime } = await compressFileIfImage(file);
  const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `records/${groupId}/${Date.now()}_${baseName}.${ext}`;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: false, contentType: mime });
  if (error) { console.error('[Supabase] uploadRecordFile error:', error.message); return null; }
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return urlData.publicUrl;
}

export async function uploadPdf(file: File): Promise<string | null> {
  const ext = file.name.split(".").pop();
  const path = `pdfs/${Date.now()}.${ext}`;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: "application/pdf" });
  if (error) { console.error("[Supabase] uploadPdf error:", error.message); return null; }
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return urlData.publicUrl;
}

export async function uploadVideo(file: File): Promise<string | null> {
  const ext = file.name.split(".").pop();
  const path = `videos/${Date.now()}.${ext}`;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) { console.error("[Supabase] uploadVideo error:", error.message); return null; }
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return urlData.publicUrl;
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
  const { data, error } = await supabase
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
  const { error } = await supabase.from('bookings').update(payload).eq('id', id);
  if (error) console.error('updateBookingStatus error:', JSON.stringify(error));
  return !error;
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
  const { error } = await supabase.from('consultation_records').insert(record);
  if (error) { console.error('insertConsultationRecord error:', error); return false; }
  return true;
}

export async function updateConsultationRecord(
  id: number,
  updates: Partial<ConsultationRecord>
): Promise<boolean> {
  const { error } = await supabase
    .from('consultation_records')
    .update(updates)
    .eq('id', id);
  if (error) { console.error('updateConsultationRecord error:', error); return false; }
  return true;
}

export async function deleteConsultationRecord(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('consultation_records')
    .delete()
    .eq('id', id);
  if (error) { console.error('deleteConsultationRecord error:', error); return false; }
  return true;
}

export async function fetchConsultationRecords(booking_group_id: string): Promise<ConsultationRecord[]> {
  const { data, error } = await supabase
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
  const path = `blog/${Date.now()}.${ext}`;
  const { data, error } = await supabase.storage
    .from(BUCKET).upload(path, blob, { upsert: true, contentType: mime });
  if (error) { console.error('uploadBlogImage error:', error); return null; }
  return supabase.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl;
}
