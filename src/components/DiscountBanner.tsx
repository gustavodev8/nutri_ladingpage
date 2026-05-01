import { useEffect, useState } from "react";
import { useContent } from "@/contexts/ContentContext";
import { Tag, X } from "lucide-react";

function useCountdown(expiresAt: string | null) {
  const getRemaining = () => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return diff > 0 ? diff : 0;
  };

  const [remaining, setRemaining] = useState(getRemaining);

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => {
      const r = getRemaining();
      setRemaining(r);
      if (r === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return remaining;
}

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`;
  return `${pad(m)}m ${pad(s)}s`;
}

export default function DiscountBanner() {
  const { content } = useContent();
  const { active, percentage, expiresAt, message } = content.discount;
  const remaining = useCountdown(expiresAt);
  const [dismissed, setDismissed] = useState(false);

  const isVisible = active && !dismissed && (expiresAt === null || (remaining !== null && remaining > 0));

  if (!isVisible) return null;

  return (
    <div className="relative z-50 bg-gradient-to-r from-green-700 via-green-600 to-green-700 text-white text-sm">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-3 flex-wrap">
        <Tag className="h-4 w-4 shrink-0" />
        <span className="font-medium">{message}</span>
        <span className="font-bold text-green-100">
          {percentage}% OFF
        </span>
        {expiresAt && remaining !== null && remaining > 0 && (
          <span className="bg-white/20 rounded-full px-3 py-0.5 font-mono font-semibold text-xs tracking-wider">
            ⏱ {formatTime(remaining)}
          </span>
        )}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
