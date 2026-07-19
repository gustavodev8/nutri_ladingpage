import {
  Cake,
  CreditCard,
  Heart,
  HelpCircle,
  LinkIcon,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Pill,
  Salad,
  Target,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Booking } from "@/lib/supabase";
import { FOUND_LABELS, GOAL_LABELS, RESTRICT_LABELS, type BookingClinicalNotes } from "./bookingPatientDetails";

interface BookingPatientPanelProps {
  variant: "desktop" | "mobile";
  booking: Booking;
  notes: BookingClinicalNotes;
  editing: boolean;
  saving: boolean;
  creatingPatient: string | null;
  editName: string;
  setEditName: (value: string) => void;
  editEmail: string;
  setEditEmail: (value: string) => void;
  editPhone: string;
  setEditPhone: (value: string) => void;
  editGoal: string;
  setEditGoal: (value: string) => void;
  editRestrictions: string;
  setEditRestrictions: (value: string) => void;
  editAllergies: string;
  setEditAllergies: (value: string) => void;
  editHealth: string;
  setEditHealth: (value: string) => void;
  editMeds: string;
  setEditMeds: (value: string) => void;
  editHadNutri: string;
  setEditHadNutri: (value: string) => void;
  editHowFound: string;
  setEditHowFound: (value: string) => void;
  editObs: string;
  setEditObs: (value: string) => void;
  onOpenEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onOpenPatient: (patientId: string) => void;
  onCreatePatient: () => void;
}

const hasClinicalNotes = (notes: BookingClinicalNotes) =>
  Boolean(
    notes.goal ||
      notes.restrictions ||
      notes.allergies ||
      notes.healthConditions ||
      notes.medications ||
      notes.hadNutritionist ||
      notes.howFound,
  );

const clinicalRows = (notes: BookingClinicalNotes) =>
  [
    { icon: Target, label: "Objetivo", val: notes.goal ? GOAL_LABELS[notes.goal] || notes.goal : null },
    {
      icon: Salad,
      label: "Restrições",
      val: notes.restrictions ? RESTRICT_LABELS[notes.restrictions] || notes.restrictions : null,
    },
    { icon: HelpCircle, label: "Alergias", val: notes.allergies },
    { icon: Heart, label: "Condições", val: notes.healthConditions },
    { icon: Pill, label: "Medicamentos", val: notes.medications },
    {
      icon: User,
      label: "Acomp. ant.",
      val: notes.hadNutritionist === "sim" ? "Sim" : notes.hadNutritionist ? "Não" : null,
    },
    { icon: HelpCircle, label: "Como chegou", val: notes.howFound ? FOUND_LABELS[notes.howFound] || notes.howFound : null },
  ].filter(row => row.val);

export const BookingPatientPanel = ({
  variant,
  booking,
  notes,
  editing,
  saving,
  creatingPatient,
  editName,
  setEditName,
  editEmail,
  setEditEmail,
  editPhone,
  setEditPhone,
  editGoal,
  setEditGoal,
  editRestrictions,
  setEditRestrictions,
  editAllergies,
  setEditAllergies,
  editHealth,
  setEditHealth,
  editMeds,
  setEditMeds,
  editHadNutri,
  setEditHadNutri,
  editHowFound,
  setEditHowFound,
  editObs,
  setEditObs,
  onOpenEdit,
  onCancelEdit,
  onSaveEdit,
  onOpenPatient,
  onCreatePatient,
}: BookingPatientPanelProps) => {
  const isMobile = variant === "mobile";
  const inputClass = isMobile ? "h-9 text-sm" : "h-7 text-xs";
  const selectClass = isMobile
    ? "w-full h-9 text-sm rounded-md border border-input bg-background px-2 text-foreground focus:outline-none"
    : "w-full h-7 text-xs rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring";

  if (editing) {
    return (
      <div className={isMobile ? "p-4 space-y-3" : "flex flex-col h-full overflow-y-auto p-4 space-y-3"}>
        <div className="flex items-center justify-between">
          <p className={isMobile ? "text-xs font-bold uppercase tracking-widest text-muted-foreground/50" : "text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50"}>
            Editar dados
          </p>
          <button
            onClick={onCancelEdit}
            className={(isMobile ? "w-7 h-7" : "w-6 h-6") + " rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Nome</Label>
          <Input value={editName} onChange={event => setEditName(event.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Email</Label>
          <Input value={editEmail} onChange={event => setEditEmail(event.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Telefone</Label>
          <Input value={editPhone} onChange={event => setEditPhone(event.target.value)} className={inputClass} />
        </div>

        <div className="h-px bg-border/50" />

        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Objetivo</Label>
          <select value={editGoal} onChange={event => setEditGoal(event.target.value)} className={selectClass}>
            <option value="">—</option>
            {Object.entries(GOAL_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Restrições</Label>
          <select value={editRestrictions} onChange={event => setEditRestrictions(event.target.value)} className={selectClass}>
            <option value="">—</option>
            {Object.entries(RESTRICT_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Alergias</Label>
          <Input value={editAllergies} onChange={event => setEditAllergies(event.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Condições de saúde</Label>
          <Input value={editHealth} onChange={event => setEditHealth(event.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Medicamentos</Label>
          <Input value={editMeds} onChange={event => setEditMeds(event.target.value)} className={inputClass} />
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Acomp. anterior</Label>
          <select value={editHadNutri} onChange={event => setEditHadNutri(event.target.value)} className={selectClass}>
            <option value="">—</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Como chegou</Label>
          <select value={editHowFound} onChange={event => setEditHowFound(event.target.value)} className={selectClass}>
            <option value="">—</option>
            {Object.entries(FOUND_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Observações</Label>
          <textarea
            value={editObs}
            onChange={event => setEditObs(event.target.value)}
            rows={3}
            className={
              isMobile
                ? "w-full text-sm rounded-md border border-input bg-background px-3 py-2 text-foreground resize-none focus:outline-none"
                : "w-full text-xs rounded-md border border-input bg-background px-2 py-1.5 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            }
          />
        </div>

        <div className={isMobile ? "flex gap-2 pt-1 pb-4" : "flex gap-2 pt-1"}>
          <button
            onClick={onSaveEdit}
            disabled={saving}
            className={(isMobile ? "h-10 text-sm" : "h-8 text-xs") + " flex-1 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"}
          >
            {saving ? <Loader2 className={isMobile ? "h-4 w-4 animate-spin" : "h-3.5 w-3.5 animate-spin"} /> : "Salvar"}
          </button>
          <button
            onClick={onCancelEdit}
            disabled={saving}
            className={(isMobile ? "h-10 text-sm" : "h-8 text-xs") + " flex-1 rounded-lg border border-border text-muted-foreground font-medium hover:text-foreground hover:bg-muted transition-colors"}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  const contactBoxClass = isMobile ? "bg-muted/30 rounded-lg p-3 space-y-2.5" : "space-y-2";
  const clinicalBoxClass = isMobile ? "bg-muted/30 rounded-lg p-3 space-y-3" : "space-y-2.5";

  return (
    <div className={isMobile ? "p-4 space-y-5" : "p-4 space-y-5 overflow-y-auto"}>
      <div className={isMobile ? "space-y-3" : "space-y-2.5"}>
        <div className="flex items-center justify-between">
          <p className={isMobile ? "text-xs font-bold uppercase tracking-widest text-muted-foreground/50" : "text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50"}>
            Contato
          </p>
          <button
            onClick={onOpenEdit}
            className={
              isMobile
                ? "flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1 hover:bg-muted transition-colors"
                : "w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            }
            title="Editar dados"
          >
            <Pencil className="h-3 w-3" />
            {isMobile && "Editar"}
          </button>
        </div>

        <div className={contactBoxClass}>
          {booking.client_email && (
            <div className={isMobile ? "flex items-start gap-2.5" : "flex items-start gap-2"}>
              <Mail className={(isMobile ? "h-4 w-4" : "h-3.5 w-3.5") + " text-muted-foreground/40 shrink-0 mt-px"} />
              <span className={(isMobile ? "text-sm" : "text-xs") + " text-foreground break-all leading-snug"}>{booking.client_email}</span>
            </div>
          )}
          {booking.client_phone && (
            <div className={isMobile ? "flex items-center gap-2.5" : "flex items-center gap-2"}>
              <Phone className={(isMobile ? "h-4 w-4" : "h-3.5 w-3.5") + " text-muted-foreground/40 shrink-0"} />
              <span className={(isMobile ? "text-sm" : "text-xs") + " text-foreground"}>{booking.client_phone}</span>
            </div>
          )}
          {notes.birthDate && (
            <div className={isMobile ? "flex items-center gap-2.5" : "flex items-center gap-2"}>
              <Cake className={(isMobile ? "h-4 w-4" : "h-3.5 w-3.5") + " text-muted-foreground/40 shrink-0"} />
              <span className={(isMobile ? "text-sm" : "text-xs") + " text-foreground"}>
                {new Date(notes.birthDate + "T12:00:00").toLocaleDateString("pt-BR")}
                {notes.sex && <span className="text-muted-foreground"> · {notes.sex}</span>}
              </span>
            </div>
          )}
          {booking.client_cpf && !isMobile && (
            <div className="flex items-center gap-2">
              <CreditCard className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
              <span className="text-xs text-foreground font-mono">
                {booking.client_cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
              </span>
            </div>
          )}
          {!isMobile &&
            (booking.patient_id ? (
              <button
                onClick={() => onOpenPatient(booking.patient_id!)}
                className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary font-semibold hover:bg-primary/20 transition-colors"
              >
                <LinkIcon className="h-3.5 w-3.5" />
                Ver prontuário do paciente
              </button>
            ) : (
              <button
                disabled={creatingPatient === booking.booking_group_id}
                onClick={onCreatePatient}
                className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {creatingPatient === booking.booking_group_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                Cadastrar paciente no sistema
              </button>
            ))}
        </div>
      </div>

      {hasClinicalNotes(notes) && (
        <div className={isMobile ? "space-y-3" : "space-y-2.5"}>
          <p className={isMobile ? "text-xs font-bold uppercase tracking-widest text-muted-foreground/50" : "text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50"}>
            Ficha Clínica
          </p>
          <div className={clinicalBoxClass}>
            {clinicalRows(notes).map(({ icon: Icon, label, val }) =>
              isMobile ? (
                <div key={label} className="flex items-start gap-2.5">
                  <Icon className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-px" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">{label}</p>
                    <p className="text-sm text-foreground leading-snug mt-0.5">{val}</p>
                  </div>
                </div>
              ) : (
                <div key={label}>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 flex items-center gap-1 mb-0.5">
                    <Icon className="h-2.5 w-2.5" />
                    {label}
                  </p>
                  <p className="text-xs font-medium text-foreground leading-snug pl-3.5">{val}</p>
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
};
