import { useState, type Dispatch, type SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchBookings,
  findPatientByCPF,
  findSimilarPatients,
  linkBookingGroupToPatient,
  upsertPatient,
  type Booking,
  type Patient,
} from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

interface DuplicatePatientModal {
  booking: Booking;
  notes: Record<string, string>;
  matches: Patient[];
}

interface UseBookingPatientActionsParams {
  setBookings: Dispatch<SetStateAction<Booking[]>>;
}

export const useBookingPatientActions = ({
  setBookings,
}: UseBookingPatientActionsParams) => {
  const navigate = useNavigate();
  const [creatingPatient, setCreatingPatient] = useState<string | null>(null);
  const [duplicateModal, setDuplicateModal] = useState<DuplicatePatientModal | null>(null);

  const doCreatePatient = async (booking: Booking, notes: Record<string, string>) => {
    setCreatingPatient(booking.booking_group_id);
    const genderMap: Record<string, "M" | "F" | "outro"> = { masculino: "M", feminino: "F" };
    const created = await upsertPatient({
      name: booking.client_name,
      email: booking.client_email || undefined,
      phone: booking.client_phone || undefined,
      cpf: booking.client_cpf || undefined,
      birth_date: notes.birthDate || undefined,
      gender: genderMap[notes.sex ?? ""] ?? undefined,
    });
    if (!created?.id) {
      toast({ title: "Erro ao cadastrar paciente", variant: "destructive" });
      setCreatingPatient(null);
      return;
    }
    if (booking.client_cpf) {
      await linkBookingGroupToPatient(booking.booking_group_id, created.id, booking.client_cpf);
    }
    const updated = await fetchBookings();
    setBookings(updated);
    setCreatingPatient(null);
    setDuplicateModal(null);
    toast({ title: "Paciente cadastrado!", description: `${created.name} foi adicionado ao sistema.` });
    navigate(`/admin/pacientes/${created.id}`);
  };

  const doLinkExisting = async (booking: Booking, patient: Patient) => {
    setCreatingPatient(booking.booking_group_id);
    await linkBookingGroupToPatient(booking.booking_group_id, patient.id!, booking.client_cpf ?? "");
    const updated = await fetchBookings();
    setBookings(updated);
    setCreatingPatient(null);
    setDuplicateModal(null);
    toast({ title: "Vinculado ao paciente existente!", description: patient.name });
    navigate(`/admin/pacientes/${patient.id}`);
  };

  const handleCreatePatient = async (booking: Booking, notes: Record<string, string>) => {
    setCreatingPatient(booking.booking_group_id);
    if (booking.client_cpf) {
      const byCpf = await findPatientByCPF(booking.client_cpf);
      if (byCpf?.id) {
        await linkBookingGroupToPatient(booking.booking_group_id, byCpf.id, booking.client_cpf);
        const updated = await fetchBookings();
        setBookings(updated);
        setCreatingPatient(null);
        navigate(`/admin/pacientes/${byCpf.id}`);
        return;
      }
    }
    const similar = await findSimilarPatients(booking.client_name, booking.client_email);
    setCreatingPatient(null);
    if (similar.length > 0) {
      setDuplicateModal({ booking, notes, matches: similar });
      return;
    }
    await doCreatePatient(booking, notes);
  };

  return {
    creatingPatient,
    duplicateModal,
    setDuplicateModal,
    doCreatePatient,
    doLinkExisting,
    handleCreatePatient,
  };
};
