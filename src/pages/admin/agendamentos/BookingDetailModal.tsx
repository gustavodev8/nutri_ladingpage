import type { ReactNode } from "react";
import { ChevronDown, Globe, LinkIcon, Loader2, MapPin, Send, Trash2, UserPlus, X } from "lucide-react";
import type { Booking } from "@/lib/supabase";
import { PaymentPill, StatusPill } from "./bookingPills";
import { getBookingGroupStatus, getPaymentGroupStatus } from "./bookingStatusUtils";

export type BookingDetailTab = "sessions" | "records" | "dados";

interface BookingDetailModalProps {
  groupId: string | null;
  first: Booking | null;
  sessions: Booking[];
  recordsCount: number;
  activeTab: BookingDetailTab;
  setActiveTab: (tab: BookingDetailTab) => void;
  creatingPatient: string | null;
  moreOpen: boolean;
  setMoreOpen: (value: boolean | ((previous: boolean) => boolean)) => void;
  confirmDeleteGroup: string | null;
  deletingGroup: boolean;
  onClose: () => void;
  onOpenPatient: (patientId: string) => void;
  onCreatePatient: () => void;
  onSendMaterial: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  desktopPatientPanel: ReactNode;
  sessionsPanel: ReactNode;
  recordsPanel: ReactNode;
  mobilePatientPanel: ReactNode;
}

const initials = (name: string) =>
  name?.split(" ").filter(Boolean).slice(0, 2).map(item => item[0]).join("").toUpperCase() || "?";

export const BookingDetailModal = ({
  groupId,
  first,
  sessions,
  recordsCount,
  activeTab,
  setActiveTab,
  creatingPatient,
  moreOpen,
  setMoreOpen,
  confirmDeleteGroup,
  deletingGroup,
  onClose,
  onOpenPatient,
  onCreatePatient,
  onSendMaterial,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
  desktopPatientPanel,
  sessionsPanel,
  recordsPanel,
  mobilePatientPanel,
}: BookingDetailModalProps) => {
  if (!groupId || !first) return null;

  const closeModal = () => {
    onClose();
    onCancelDelete();
    setMoreOpen(false);
  };

  const tabs: { id: BookingDetailTab; label: string; count: number; mobileOnly: boolean }[] = [
    { id: "sessions", label: "Sessões", count: sessions.length, mobileOnly: false },
    { id: "records", label: "Prontuário", count: recordsCount, mobileOnly: false },
    { id: "dados", label: "Paciente", count: 0, mobileOnly: true },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-6 bg-black/60 backdrop-blur-[2px]"
      onClick={closeModal}
    >
      <div
        className="w-full md:max-w-4xl bg-background rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "88dvh", height: "88dvh" }}
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary-foreground">{initials(first.client_name)}</span>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sm text-foreground leading-tight truncate">{first.client_name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span className="truncate max-w-[160px]">{first.plan_name}</span>
              <span className="opacity-30 shrink-0">·</span>
              <span className="flex items-center gap-1 shrink-0">
                {first.type === "online" ? <Globe className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                {first.type === "online" ? "Online" : "Presencial"}
              </span>
              <span className="opacity-30 shrink-0">·</span>
              <span className="shrink-0">
                {sessions.length} {sessions.length === 1 ? "sessão" : "sessões"}
              </span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Consulta</span>
                <StatusPill status={getBookingGroupStatus(sessions)} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Pagamento</span>
                <PaymentPill status={getPaymentGroupStatus(sessions)} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {first.patient_id ? (
              <button
                onClick={() => onOpenPatient(first.patient_id!)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all"
              >
                <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                Prontuario
              </button>
            ) : (
              <button
                disabled={creatingPatient === first.booking_group_id}
                onClick={onCreatePatient}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all disabled:opacity-50"
              >
                {creatingPatient === first.booking_group_id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserPlus className="h-3.5 w-3.5 shrink-0" />
                )}
                Cadastrar
              </button>
            )}
            <button
              onClick={onSendMaterial}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground border border-border hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
            >
              <Send className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Enviar material</span>
            </button>
            {moreOpen && confirmDeleteGroup === groupId ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900">
                <span className="text-xs text-red-600 dark:text-red-400 font-medium hidden sm:inline">Excluir?</span>
                <button
                  onClick={onConfirmDelete}
                  disabled={deletingGroup}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded transition-colors disabled:opacity-40"
                >
                  {deletingGroup ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Sim"}
                </button>
                <span className="text-red-300 text-xs">|</span>
                <button
                  onClick={onCancelDelete}
                  className="text-xs text-muted-foreground hover:text-foreground px-1 py-0.5 rounded transition-colors"
                >
                  Não
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setMoreOpen(previous => !previous)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                  title="Mais ações"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
                </button>
                {moreOpen && (
                  <div className="absolute right-0 top-9 z-10 w-52 rounded-xl border border-border bg-background shadow-xl p-1">
                    <button
                      onClick={onRequestDelete}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir agendamento
                    </button>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={closeModal}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          <div className="md:w-52 shrink-0 md:border-r border-border md:overflow-y-auto bg-muted/20">
            <div className="hidden md:flex flex-col h-full">{desktopPatientPanel}</div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex border-b border-border shrink-0 px-5">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative py-3 mr-5 text-sm font-medium transition-colors shrink-0 ${tab.mobileOnly ? "md:hidden" : ""} ${
                    activeTab === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && <span className="ml-1.5 text-muted-foreground/60 text-xs">{tab.count}</span>}
                  {activeTab === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />}
                </button>
              ))}
            </div>

            {activeTab === "sessions" && sessionsPanel}
            {activeTab === "records" && recordsPanel}
            {activeTab === "dados" && <div className="flex-1 overflow-y-auto md:hidden">{mobilePatientPanel}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
