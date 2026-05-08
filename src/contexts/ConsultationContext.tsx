/**
 * ConsultationContext — Fonte única de verdade para a sessão de consulta.
 *
 * Fornece os dados do paciente ativo (patient, latestMeasurement, latestAnamnesis)
 * para todos os componentes filhos sem que cada um precise fazer fetches isolados.
 *
 * Ciclo de vida:
 *  1. PatientLayout monta o Provider com o patientId da URL.
 *  2. O Provider busca os dados uma vez e os mantém em estado.
 *  3. Quando AdminPaciente registra nova avaliação → chama setMeasurement()
 *     para atualização imediata (sem round-trip extra).
 *  4. Se precisar de refetch completo (ex: mudança de dados externos) → invalidate().
 */

import { createContext, useContext, useEffect, useReducer, useCallback, type ReactNode } from "react";
import {
  fetchPatient,
  fetchMeasurements,
  fetchAnamnesis,
  type Patient,
  type Measurement,
  type Anamnesis,
} from "@/lib/supabase";

// ─── State & Actions ──────────────────────────────────────────────────────────

interface ConsultationState {
  patientId:         number | null;
  patient:           Patient       | null;
  latestMeasurement: Measurement   | null;
  latestAnamnesis:   Anamnesis     | null;
  isLoading:         boolean;
  /** Bumped by invalidate() to trigger a fresh fetch */
  _version:          number;
}

type Action =
  | { type: "LOADING" }
  | { type: "LOADED"; patient: Patient | null; measurement: Measurement | null; anamnesis: Anamnesis | null }
  | { type: "SET_MEASUREMENT"; measurement: Measurement }
  | { type: "SET_ANAMNESIS";   anamnesis:   Anamnesis   }
  | { type: "INVALIDATE" }
  | { type: "SET_PATIENT_ID"; patientId: number };

const INITIAL_STATE: ConsultationState = {
  patientId:         null,
  patient:           null,
  latestMeasurement: null,
  latestAnamnesis:   null,
  isLoading:         false,
  _version:          0,
};

function reducer(state: ConsultationState, action: Action): ConsultationState {
  switch (action.type) {
    case "SET_PATIENT_ID":
      // Reset everything when patient changes
      return { ...INITIAL_STATE, patientId: action.patientId };
    case "LOADING":
      return { ...state, isLoading: true };
    case "LOADED":
      return {
        ...state,
        isLoading:         false,
        patient:           action.patient,
        latestMeasurement: action.measurement,
        latestAnamnesis:   action.anamnesis,
      };
    case "SET_MEASUREMENT":
      // Optimistic update — used immediately after an insert in AdminPaciente
      return { ...state, latestMeasurement: action.measurement };
    case "SET_ANAMNESIS":
      return { ...state, latestAnamnesis: action.anamnesis };
    case "INVALIDATE":
      return { ...state, _version: state._version + 1 };
    default:
      return state;
  }
}

// ─── Context value ────────────────────────────────────────────────────────────

/** Derived age helper so components don't repeat the calculation */
function calcAge(birthDate?: string): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const b     = new Date(birthDate + "T12:00:00");
  let age     = today.getFullYear() - b.getFullYear();
  if (
    today.getMonth() - b.getMonth() < 0 ||
    (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())
  ) age--;
  return age;
}

interface ConsultationContextValue extends ConsultationState {
  /** Age of the patient in whole years (null when birth_date not set) */
  ageYears: number | null;
  /** Force a full refetch of patient + measurement + anamnesis */
  invalidate: () => void;
  /** Optimistic update — call right after inserting a new measurement */
  setMeasurement: (m: Measurement) => void;
  /** Optimistic update — call right after saving anamnesis */
  setAnamnesis: (a: Anamnesis) => void;
}

// ─── Context & Provider ───────────────────────────────────────────────────────

const ConsultationContext = createContext<ConsultationContextValue | null>(null);

interface ProviderProps {
  patientId: number;
  children:  ReactNode;
}

export function ConsultationProvider({ patientId, children }: ProviderProps) {
  const [state, dispatch] = useReducer(reducer, {
    ...INITIAL_STATE,
    patientId,
  });

  // Sync patientId changes (if ever the component re-renders with a new id)
  useEffect(() => {
    if (state.patientId !== patientId) {
      dispatch({ type: "SET_PATIENT_ID", patientId });
    }
  }, [patientId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch when patientId or _version changes
  useEffect(() => {
    if (!patientId || patientId <= 0) return;
    dispatch({ type: "LOADING" });
    Promise.all([
      fetchPatient(patientId),
      fetchMeasurements(patientId),
      fetchAnamnesis(patientId),
    ]).then(([patient, measurements, anamnesis]) => {
      dispatch({
        type:        "LOADED",
        patient,
        measurement: measurements[0] ?? null,
        anamnesis,
      });
    });
  }, [patientId, state._version]); // eslint-disable-line react-hooks/exhaustive-deps

  const invalidate    = useCallback(() => dispatch({ type: "INVALIDATE" }),                          []);
  const setMeasurement = useCallback((m: Measurement) => dispatch({ type: "SET_MEASUREMENT", measurement: m }), []);
  const setAnamnesis   = useCallback((a: Anamnesis)   => dispatch({ type: "SET_ANAMNESIS",   anamnesis:   a }), []);

  const value: ConsultationContextValue = {
    ...state,
    ageYears:     calcAge(state.patient?.birth_date ?? undefined),
    invalidate,
    setMeasurement,
    setAnamnesis,
  };

  return (
    <ConsultationContext.Provider value={value}>
      {children}
    </ConsultationContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Consume the consultation context.
 * Must be used inside a <ConsultationProvider>.
 */
export function useConsultation(): ConsultationContextValue {
  const ctx = useContext(ConsultationContext);
  if (!ctx) {
    throw new Error("useConsultation must be used inside <ConsultationProvider>");
  }
  return ctx;
}
