import { useParams, Outlet } from "react-router-dom";
import { ConsultationProvider } from "@/contexts/ConsultationContext";

/**
 * PatientLayout — wrapper de rota para todas as páginas do prontuário.
 *
 * Monta o ConsultationProvider com o patientId da URL, tornando
 * patient, latestMeasurement e latestAnamnesis disponíveis globalmente
 * para AdminPaciente, AdminPlanoAlimentar e AdminRelatorioAntropometrico
 * sem que cada uma precise fazer fetches isolados.
 */
export default function PatientLayout() {
  const { id } = useParams<{ id: string }>();
  const patientId = Number(id);

  return (
    <ConsultationProvider patientId={patientId}>
      <Outlet />
    </ConsultationProvider>
  );
}
