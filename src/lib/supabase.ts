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
  const { error } = await supabase.from('bookings').insert(booking);
  if (error) { console.error("insertBooking error:", error); return false; }
  return true;
}

export async function updateBookingStatus(id: number, status: string, extra?: Record<string, unknown>): Promise<boolean> {
  const payload: Record<string, unknown> = { status, ...extra };
  const { error } = await supabase.from('bookings').update(payload).eq('id', id);
  return !error;
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
