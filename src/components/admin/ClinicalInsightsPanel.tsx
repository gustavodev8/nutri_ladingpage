import { useState } from "react";
import { ShieldAlert, AlertTriangle, Info, ChevronDown, ChevronUp, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  countAlertsByType,
  type ClinicalAlert,
  type AlertSeverity,
} from "@/lib/clinicalAlertsUtils";

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  {
    icon: React.ReactNode;
    badge: string;
    panel: string;
    chip: string;
    dot: string;
    label: string;
  }
> = {
  danger: {
    icon: <ShieldAlert size={14} className="shrink-0" />,
    badge: "border-red-200 bg-red-50 text-red-700",
    panel: "border-red-200/80 bg-gradient-to-br from-red-50/80 to-white",
    chip: "border-red-200 bg-red-50 text-red-700",
    dot: "bg-red-500",
    label: "Perigo",
  },
  warning: {
    icon: <AlertTriangle size={14} className="shrink-0" />,
    badge: "border-amber-200 bg-amber-50 text-amber-800",
    panel: "border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-white",
    chip: "border-amber-200 bg-amber-50 text-amber-800",
    dot: "bg-amber-500",
    label: "Atenção",
  },
  info: {
    icon: <Info size={14} className="shrink-0" />,
    badge: "border-blue-200 bg-blue-50 text-blue-700",
    panel: "border-blue-200/80 bg-gradient-to-br from-blue-50/80 to-white",
    chip: "border-blue-200 bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
    label: "Info",
  },
};

function AlertCard({ alert }: { alert: ClinicalAlert }) {
  const cfg = SEVERITY_CONFIG[alert.type];
  return (
    <div className={cn("rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md", cfg.panel)}>
      <div className="flex items-start gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border bg-white/90 shadow-sm", cfg.badge)}>
          {cfg.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]", cfg.chip)}>
              <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
              {cfg.label}
            </span>
            <span className="rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {alert.category}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/85">{alert.message}</p>
        </div>
      </div>
    </div>
  );
}

function CountBadge({
  label,
  count,
  className,
}: {
  label: string;
  count: number;
  className: string;
}) {
  if (count <= 0) return null;

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]", className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label} {count}
    </span>
  );
}

function SeverityGroup({
  title,
  alerts,
  cfg,
}: {
  title: string;
  alerts: ClinicalAlert[];
  cfg: (typeof SEVERITY_CONFIG)[AlertSeverity];
}) {
  if (alerts.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={cn("h-2.5 w-2.5 rounded-full", cfg.dot)} />
        <h4 className="text-[10px] font-black uppercase tracking-[0.22em] text-foreground/70">
          {title}
        </h4>
        <span className={cn("ml-auto rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]", cfg.badge)}>
          {alerts.length}
        </span>
      </div>
      <div className="space-y-2">
        {alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
      </div>
    </section>
  );
}

interface ClinicalInsightsPanelProps {
  alerts: ClinicalAlert[];
  defaultOpen?: boolean;
  title?: string;
  subtitle?: string;
}

export function ClinicalInsightsPanel({
  alerts,
  defaultOpen = true,
  title = "Alertas Clínicos da Anamnese",
  subtitle = "Gerado automaticamente a partir da anamnese. Revise antes de prescrever.",
}: ClinicalInsightsPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (alerts.length === 0) return null;

  const counts = countAlertsByType(alerts);
  const dangers = alerts.filter((a) => a.type === "danger");
  const warnings = alerts.filter((a) => a.type === "warning");
  const infos = alerts.filter((a) => a.type === "info");

  const headerAccent =
    counts.danger > 0
      ? "border-l-red-500 bg-gradient-to-r from-red-50/80 via-card to-card"
      : counts.warning > 0
        ? "border-l-amber-500 bg-gradient-to-r from-amber-50/80 via-card to-card"
        : "border-l-blue-500 bg-gradient-to-r from-blue-50/80 via-card to-card";

  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-start justify-between gap-4 border-l-4 px-5 py-4 text-left transition-colors hover:brightness-[0.99]",
          headerAccent
        )}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-background/90 shadow-sm">
            <Brain size={15} className="text-muted-foreground" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {title}
              </span>
              <span className="rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {alerts.length} alertas
              </span>
            </div>

            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <CountBadge label="Perigo" count={counts.danger} className={SEVERITY_CONFIG.danger.badge} />
              <CountBadge label="Atenção" count={counts.warning} className={SEVERITY_CONFIG.warning.badge} />
              <CountBadge label="Info" count={counts.info} className={SEVERITY_CONFIG.info.badge} />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
          <span className="hidden text-xs sm:inline">
            {open ? "Minimizar" : "Expandir"}
          </span>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {open && (
        <div className="space-y-5 border-t border-border/50 bg-gradient-to-b from-background to-muted/10 p-5">
          <SeverityGroup title="Perigos" alerts={dangers} cfg={SEVERITY_CONFIG.danger} />
          <SeverityGroup title="Avisos" alerts={warnings} cfg={SEVERITY_CONFIG.warning} />
          <SeverityGroup title="Informações" alerts={infos} cfg={SEVERITY_CONFIG.info} />
        </div>
      )}
    </section>
  );
}
