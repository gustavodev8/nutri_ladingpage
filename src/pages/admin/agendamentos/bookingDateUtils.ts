import type { Booking } from "@/lib/supabase";

export const CITIES = ["Alagoinhas", "Feira de Santana", "Salvador", "Crisópolis", "Olindina", "Aporá", "Acajutiba", "Esplanada"];

export function toLocalISO(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const calcBMI = (w: number, h: number) => {
  if (!w || !h) return null;
  const bmi = w / Math.pow(h / 100, 2);
  return bmi.toFixed(1);
};

export const getBookingCity = (booking: Booking): string | null => {
  try {
    const notes = JSON.parse(booking.notes || "{}") as Record<string, unknown>;
    const city = notes._city ?? notes.city;
    return typeof city === "string" && city.trim() ? city : null;
  } catch {
    return null;
  }
};

export const normalizePersonName = (name: string) =>
  name
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
