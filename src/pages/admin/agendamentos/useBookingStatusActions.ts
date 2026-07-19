import { useState, type Dispatch, type SetStateAction } from "react";
import {
  deleteBookingGroup,
  updateBookingPaymentStatus,
  updateBookingStatus,
  type Booking,
  type BookingPaymentMethod,
  type BookingPaymentStatus,
  type BookingStatus,
} from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

interface UseBookingStatusActionsParams {
  setBookings: Dispatch<SetStateAction<Booking[]>>;
  setDetail: Dispatch<SetStateAction<string | null>>;
}

export const useBookingStatusActions = ({
  setBookings,
  setDetail,
}: UseBookingStatusActionsParams) => {
  const [updating, setUpdating] = useState<number | null>(null);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<string | null>(null);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [reschedule, setReschedule] = useState<Booking | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [rescheduleMsg, setRescheduleMsg] = useState("");
  const [rescheduling, setRescheduling] = useState(false);

  const handleDeleteGroup = async (groupId: string) => {
    setDeletingGroup(true);
    const ok = await deleteBookingGroup(groupId);
    setDeletingGroup(false);
    if (ok) {
      setBookings(prev => prev.filter(booking => booking.booking_group_id !== groupId));
      setConfirmDeleteGroup(null);
      setDetail(null);
      toast({ title: "Agendamento excluído." });
    } else {
      toast({ title: "Erro ao excluir agendamento.", variant: "destructive" });
    }
  };

  const handleChangeType = async (session: Booking) => {
    const nextType = session.type === "online" ? "presencial" : "online";
    const ok = await updateBookingStatus(session.id!, session.status!, { type: nextType });
    if (ok) {
      setBookings(prev => prev.map(booking => booking.id === session.id ? { ...booking, type: nextType } : booking));
      toast({ title: `Modalidade alterada para ${nextType === "online" ? "Online" : "Presencial"}` });
    } else {
      toast({ title: "Erro ao alterar modalidade", variant: "destructive" });
    }
  };

  const handleStatus = async (id: number, status: BookingStatus, extra?: Record<string, unknown>) => {
    setUpdating(id);
    const ok = await updateBookingStatus(id, status, extra);
    if (ok) {
      setBookings(prev => prev.map(booking => booking.id === id ? { ...booking, status, ...extra } : booking));
      toast({ title: "Status atualizado!" });
    } else {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
    setUpdating(null);
  };

  const handlePaymentStatus = async (
    id: number,
    paymentStatus: BookingPaymentStatus,
    paymentMethod?: BookingPaymentMethod
  ) => {
    setUpdating(id);
    const method = paymentMethod ?? (paymentStatus === "free" ? "free" : "manual");
    const ok = await updateBookingPaymentStatus(id, paymentStatus, method);
    if (ok) {
      setBookings(prev => prev.map(booking => booking.id === id ? { ...booking, payment_status: paymentStatus, payment_method: method } : booking));
      toast({ title: "Pagamento atualizado!" });
    } else {
      toast({ title: "Erro ao atualizar pagamento", variant: "destructive" });
    }
    setUpdating(null);
  };

  const openReschedule = (session: Booking) => {
    setReschedule(session);
    setNewDate(session.appointment_date || "");
    setNewTime((session.appointment_time || "").substring(0, 5));
    setRescheduleMsg("");
  };

  const handleReschedule = async () => {
    if (!reschedule || !newDate || !newTime) {
      toast({ title: "Preencha a nova data e horário", variant: "destructive" });
      return;
    }
    setRescheduling(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/reschedule-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          booking_id: reschedule.id,
          new_date: newDate,
          new_time: newTime,
          client_email: reschedule.client_email,
          client_name: reschedule.client_name,
          plan_name: reschedule.plan_name,
          message: rescheduleMsg.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro");
      setBookings(prev => prev.map(booking =>
        booking.id === reschedule.id ? { ...booking, appointment_date: newDate, appointment_time: newTime } : booking
      ));
      toast({ title: "Reagendado!", description: "Email enviado ao paciente." });
      setReschedule(null);
    } catch (error) {
      toast({
        title: "Erro ao reagendar",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setRescheduling(false);
    }
  };

  return {
    updating,
    confirmDeleteGroup,
    setConfirmDeleteGroup,
    deletingGroup,
    reschedule,
    setReschedule,
    newDate,
    setNewDate,
    newTime,
    setNewTime,
    rescheduleMsg,
    setRescheduleMsg,
    rescheduling,
    handleDeleteGroup,
    handleChangeType,
    handleStatus,
    handlePaymentStatus,
    openReschedule,
    handleReschedule,
  };
};
