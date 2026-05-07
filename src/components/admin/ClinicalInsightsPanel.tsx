import { useState } from "react";
import { ShieldAlert, AlertTriangle, Info, ChevronDown, ChevronUp, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  countAlertsByType,
  type ClinicalAlert,
  type AlertSeverity,
} from "@/lib/clinicalAlertsUtils";

// ─── Config visual por severidade ────────────────────────────────────────────

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  {
    icon: React.ReactNode;
    card: string;         // classes do card
    badge: string;        // classes do badge no header
    label: string;
    dot: string;
  }
> = {
  danger: {
    icon: <ShieldAlert size={14} className="shrink-0 mt-0.5" />,
    card: "bg-red-50 border-l-4 border-red-400 text-red-900",
    badge: "bg-red-100 text-red-700 border-red-200",
    label: "Perigo",
    dot: "bg-red-500",
  },
  warning: {
    icon: <AlertTriangle size={14} className="shrink-0 mt-0.5" />,
    card: "bg-amber-50 border-l-4 border-amber-400 text-amber-900",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    label: "Atenção",
    dot: "bg-amber-500",
  },
  info: {
    icon: <Info size={14} className="shrink-0 mt-0.5" />,
    card: "bg-blue-50 border-l-4 border-blue-400 text-blue-900",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    label: "Info",
    dot: "bg-blue-500",
  },
};

// ─── AlertCard ────────────────────────────────────────────────────────────────

function AlertCard({ alert }: { alert: ClinicalAlert }) {
  const cfg = SEVERITY_CONFIG[alert.type];
  return (
    <div className={cn("rounded-r-lg px-4 py-3 flex gap-3", cfg.card)}>
      <span className={cn("mt-0.5", alert.type === "danger" ? "text-red-600" : alert.type === "warning" ? "text-amber-600" : "text-blue-600")}>
        {cfg.icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">
          {alert.category}
        </p>
        <p className="text-xs leading-relaxed font-medium">{alert.message}</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ClinicalInsightsPanelProps {
  alerts: ClinicalAlert[];
  defaultOpen?: boolean;
}

export function ClinicalInsightsPanel({
  alerts,
  defaultOpen = true,
}: ClinicalInsightsPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  // Nenhum alerta — não renderiza nada
  if (alerts.length === 0) return null;

  const counts  = countAlertsByType(alerts);
  const dangers = alerts.filter((a) => a.type === "danger");
  const warnings = alerts.filter((a) => a.type === "warning");
  const infos   = alerts.filter((a) => a.type === "info");

  // Cor do header depende do pior nível
  const headerAccent =
    counts.danger > 0
      ? "border-l-red-500 bg-red-50/60"
      : counts.warning > 0
      ? "border-l-amber-500 bg-amber-50/60"
      : "border-l-blue-500 bg-blue-50/60";

  return (
    <section className={cn("rounded-lg border border-border/60 overflow-hidden bg-card")}>

      {/* ── Header ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between px-5 py-3.5 border-l-4 transition-colors hover:brightness-95",
          headerAccent
        )}
      >
        <div className="flex items-center gap-2.5">
          <Brain size={14} className="text-muted-foreground shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground/80">
            Alertas Clínicos da Anamnese
          </span>

          {/* Badges de contagem */}
          <div className="flex items-center gap-1.5 ml-1">
            {counts.danger > 0 && (
              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border", SEVERITY_CONFIG.danger.badge)}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {counts.danger}
              </span>
            )}
            {counts.warning > 0 && (
              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border", SEVERITY_CONFIG.warning.badge)}>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {counts.warning}
              </span>
            )}
            {counts.info > 0 && (
              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border", SEVERITY_CONFIG.info.badge)}>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                {counts.info}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-xs hidden sm:inline">
            {open ? "Minimizar" : "Expandir"}
          </span>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* ── Alert list ── */}
      {open && (
        <div className="p-4 space-y-2 border-t border-border/40">

          {/* Perigos primeiro */}
          {dangers.length > 0 && (
            <div className="space-y-2">
              {dangers.map((a) => <AlertCard key={a.id} alert={a} />)}
            </div>
          )}

          {/* Avisos */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              {warnings.map((a) => <AlertCard key={a.id} alert={a} />)}
            </div>
          )}

          {/* Informações */}
          {infos.length > 0 && (
            <div className="space-y-2">
              {infos.map((a) => <AlertCard key={a.id} alert={a} />)}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground/50 pt-1">
            Gerado automaticamente a partir da anamnese. Revise antes de prescrever.
          </p>
        </div>
      )}
    </section>
  );
}
