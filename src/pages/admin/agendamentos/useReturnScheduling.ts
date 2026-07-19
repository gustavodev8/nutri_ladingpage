import { useState } from "react";
import {
  fetchAvailabilitySlots,
  fetchBookingsForDate,
  type Booking,
} from "@/lib/supabase";
import { getBookingCity, toLocalISO } from "./bookingDateUtils";

type ReturnType = "online" | "presencial";

type AvailabilitySlot = {
  date: string;
  start_time: string;
  type: string;
  city?: string;
};

export const useReturnScheduling = () => {
  const [returnAvailSlots, setReturnAvailSlots] = useState<AvailabilitySlot[]>([]);
  const [returnCalYear, setReturnCalYear] = useState(new Date().getFullYear());
  const [returnCalMonth, setReturnCalMonth] = useState(new Date().getMonth());
  const [returnBookedTimes, setReturnBookedTimes] = useState<string[]>([]);
  const [loadingReturnSlots, setLoadingReturnSlots] = useState(false);
  const [returnType, setReturnType] = useState<ReturnType>("online");
  const [returnCity, setReturnCity] = useState("Alagoinhas");
  const [compNextReturn, setCompNextReturn] = useState("");
  const [compNextReturnTime, setCompNextReturnTime] = useState("");

  const resetReturnSelection = () => {
    setCompNextReturn("");
    setCompNextReturnTime("");
    setReturnBookedTimes([]);
  };

  const prepareReturnScheduling = async (session: Booking) => {
    resetReturnSelection();
    setReturnType((session.type as ReturnType) || "online");
    setReturnCity(getBookingCity(session) ?? "Alagoinhas");
    const now = new Date();
    setReturnCalYear(now.getFullYear());
    setReturnCalMonth(now.getMonth());
    setLoadingReturnSlots(true);
    const slots = await fetchAvailabilitySlots();
    setReturnAvailSlots(slots);
    setLoadingReturnSlots(false);
  };

  const handleReturnDateSelect = async (dateISO: string, sessionType: string) => {
    setCompNextReturn(dateISO);
    setCompNextReturnTime("");
    setReturnBookedTimes([]);
    if (!dateISO) return;
    const booked = await fetchBookingsForDate(dateISO, sessionType);
    setReturnBookedTimes(booked.map(booking => (booking.appointment_time || "").substring(0, 5)));
  };

  const matchesReturnAvailability = (
    slot: AvailabilitySlot,
    sessionType: string
  ) => {
    if (slot.type !== sessionType) return false;
    if (sessionType !== "presencial") return true;
    return slot.city === returnCity;
  };

  const getReturnAvailableDates = (sessionType: string) =>
    [...new Set(
      returnAvailSlots
        .filter(slot => matchesReturnAvailability(slot, sessionType))
        .map(slot => slot.date)
    )].sort();

  const getReturnTimesForDate = (dateISO: string, sessionType: string) =>
    [...new Set(
      returnAvailSlots
        .filter(slot => slot.date === dateISO && matchesReturnAvailability(slot, sessionType))
        .map(slot => slot.start_time.substring(0, 5))
    )].sort();

  const canSelectReturnDate = (date: Date, sessionType: string) => {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    if (date < todayMidnight) return false;
    return returnAvailSlots.some(slot => slot.date === toLocalISO(date) && matchesReturnAvailability(slot, sessionType));
  };

  return {
    returnAvailSlots,
    returnCalYear,
    returnCalMonth,
    returnBookedTimes,
    loadingReturnSlots,
    returnType,
    returnCity,
    compNextReturn,
    compNextReturnTime,
    setReturnAvailSlots,
    setReturnCalYear,
    setReturnCalMonth,
    setReturnBookedTimes,
    setLoadingReturnSlots,
    setReturnType,
    setReturnCity,
    setCompNextReturn,
    setCompNextReturnTime,
    resetReturnSelection,
    prepareReturnScheduling,
    handleReturnDateSelect,
    getReturnAvailableDates,
    getReturnTimesForDate,
    canSelectReturnDate,
  };
};
