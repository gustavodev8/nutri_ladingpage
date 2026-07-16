import { useState } from "react";
import { Tag, TimerReset, X } from "lucide-react";
import { useContent } from "@/contexts/ContentContext";
import { getCountdownView, useDiscountCountdown } from "@/lib/discountCountdown";

export default function DiscountBanner() {
  const { content } = useContent();
  const { active, percentage, message } = content.discount;
  const remaining = useDiscountCountdown(content.discount);
  const countdownView = remaining !== null && remaining > 0 ? getCountdownView(remaining) : null;
  const [dismissed, setDismissed] = useState(false);

  const isVisible = active && !dismissed && remaining !== null && remaining > 0;

  if (!isVisible) return null;

  return (
    <div className="relative z-50 overflow-hidden border-b border-white/10 bg-gradient-to-r from-emerald-900 via-emerald-700 to-emerald-600 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_48%)] opacity-80" />

      <div className="relative mx-auto max-w-7xl px-4 py-3 pr-14">
        <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10">
              <Tag className="h-4 w-4 shrink-0" />
            </span>
            <p className="text-sm font-semibold leading-tight sm:text-base">{message}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-700 shadow-sm">
              {percentage}% off
            </span>

            {countdownView && (
              <div
                className={`rounded-2xl border px-2.5 py-2 shadow-sm ${
                  countdownView.urgent
                    ? "border-amber-200/60 bg-amber-50 text-slate-900"
                    : "border-white/20 bg-white/12 text-white backdrop-blur-sm"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${
                      countdownView.urgent ? "bg-amber-100 text-amber-700" : "bg-white/16 text-white"
                    }`}
                  >
                    <TimerReset className="h-3.5 w-3.5" />
                  </span>

                  <div className="text-left">
                    <p
                      className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                        countdownView.urgent ? "text-amber-700" : "text-white/70"
                      }`}
                    >
                      {countdownView.headline}
                    </p>

                    <div className="mt-1 flex items-center gap-1.5">
                      {countdownView.segments.map((segment) => (
                        <div
                          key={`${segment.label}-${segment.value}`}
                          className={`min-w-[50px] rounded-xl px-2 py-1 text-center ${
                            countdownView.urgent ? "bg-white shadow-sm" : "bg-white/10"
                          }`}
                        >
                          <p className="text-sm font-black tabular-nums leading-none">{segment.value}</p>
                          <p
                            className={`mt-1 text-[9px] font-bold uppercase tracking-[0.18em] ${
                              countdownView.urgent ? "text-slate-500" : "text-white/65"
                            }`}
                          >
                            {segment.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-3 rounded-full border border-white/15 bg-white/8 p-1.5 opacity-80 transition-opacity hover:opacity-100"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
