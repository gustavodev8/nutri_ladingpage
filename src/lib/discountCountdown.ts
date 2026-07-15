import { useEffect, useState } from "react";

export interface CountdownSegment {
  value: string;
  label: string;
}

export interface CountdownView {
  headline: string;
  segments: CountdownSegment[];
  urgent: boolean;
}

export function useDiscountCountdown(expiresAt: string | null) {
  const getRemaining = () => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return diff > 0 ? diff : 0;
  };

  const [remaining, setRemaining] = useState<number | null>(getRemaining);

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => {
      const next = getRemaining();
      setRemaining(next);
      if (next === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return remaining;
}

export function getCountdownView(ms: number): CountdownView {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days >= 2) {
    return {
      headline: "Termina em",
      segments: [
        { value: String(days), label: days === 1 ? "dia" : "dias" },
        { value: String(hours).padStart(2, "0"), label: "horas" },
      ],
      urgent: false,
    };
  }

  if (days === 1) {
    return {
      headline: "Reta final",
      segments: [
        { value: String(days), label: "dia" },
        { value: String(hours).padStart(2, "0"), label: "horas" },
      ],
      urgent: true,
    };
  }

  if (hours >= 1) {
    return {
      headline: "Termina hoje",
      segments: [
        { value: String(hours).padStart(2, "0"), label: "horas" },
        { value: String(minutes).padStart(2, "0"), label: "min" },
        { value: String(seconds).padStart(2, "0"), label: "seg" },
      ],
      urgent: true,
    };
  }

  return {
    headline: "Ultimos minutos",
    segments: [
      { value: String(minutes).padStart(2, "0"), label: "min" },
      { value: String(seconds).padStart(2, "0"), label: "seg" },
    ],
    urgent: true,
  };
}
