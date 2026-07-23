import { cn } from "@/lib/utils";

export const adminSurfaceClass = "rounded-2xl border border-border bg-background shadow-sm";
export const adminCardClass = "rounded-2xl border border-border bg-card shadow-sm";
export const adminSubtleCardClass = "rounded-2xl border border-border bg-muted/10";
export const adminEmptyStateClass = "rounded-2xl border border-dashed border-border bg-muted/15";

export const adminEyebrowClass =
  "text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground";
export const adminFieldLabelClass = "text-sm font-medium text-foreground";
export const adminHintClass = "text-xs leading-5 text-muted-foreground";

export const adminInputClass = cn(
  "flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground",
  "ring-offset-background placeholder:text-muted-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export const adminNumberInputClass = cn(
  adminInputClass,
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
);

export const adminSelectClass = cn(adminInputClass, "appearance-none pr-10");

export const adminPrimaryButtonClass = cn(
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground",
  "transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50",
);

export const adminSecondaryButtonClass = cn(
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground",
  "transition-colors hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-50",
);

export const adminDangerButtonClass = cn(
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-destructive px-4 text-sm font-medium text-destructive-foreground",
  "transition-colors hover:bg-destructive/90 disabled:pointer-events-none disabled:opacity-50",
);

export const adminIconButtonClass = cn(
  "inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground",
  "transition-colors hover:bg-muted/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
);
