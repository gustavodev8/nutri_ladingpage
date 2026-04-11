import { useState, useEffect, useCallback } from "react";
import { Video, Calendar, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useContent } from "@/contexts/ContentContext";

// ─── Highlight helper ──────────────────────────────────────────────────────────

function highlightTagline(text: string, highlights: string[]) {
  const words = highlights.map(h => h.trim()).filter(Boolean);
  if (!words.length) return <>{text}</>;
  const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) => {
        const isHighlight = words.some(w => w.toLowerCase() === part.toLowerCase());
        return isHighlight
          ? <span key={i} className="text-primary">{part}</span>
          : <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ─── ResultCard — um slide do carrossel ───────────────────────────────────────

function ResultCard({
  item,
  active,
}: {
  item: { initials: string; text: string; time: string; beforeImageUrl: string; afterImageUrl: string };
  active: boolean;
}) {
  const hasBefore = !!item.beforeImageUrl;
  const hasAfter  = !!item.afterImageUrl;

  // Extrai peso perdido do texto se houver ex. "12kg", "6kg"
  const kgMatch = item.text.match(/(\d+)\s*kg/i);
  const kg = kgMatch ? kgMatch[1] + "kg" : null;

  return (
    <div
      className={`absolute inset-0 transition-all duration-700 ease-in-out ${
        active ? "opacity-100 translate-x-0 scale-100" : "opacity-0 translate-x-8 scale-95 pointer-events-none"
      }`}
    >
      {hasBefore && hasAfter ? (
        /* ── Layout com fotos antes/depois ─────────────────────────── */
        <div className="w-full h-full flex flex-col rounded-3xl overflow-hidden shadow-2xl bg-card border border-border/50">
          <div className="flex flex-1 min-h-0">
            {/* Antes */}
            <div className="relative flex-1 overflow-hidden">
              <img src={item.beforeImageUrl} alt="Antes" className="w-full h-full object-cover object-top" />
              <span className="absolute top-3 left-3 bg-black/60 text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
                Antes
              </span>
            </div>
            {/* Divisória */}
            <div className="w-px bg-white/40 z-10" />
            {/* Depois */}
            <div className="relative flex-1 overflow-hidden">
              <img src={item.afterImageUrl} alt="Depois" className="w-full h-full object-cover object-top" />
              <span className="absolute top-3 right-3 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
                Depois
              </span>
            </div>
          </div>

          {/* Rodapé */}
          <div className="px-5 py-3 flex items-center justify-between bg-card border-t border-border/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {item.initials}
              </div>
              <p className="text-xs text-muted-foreground leading-snug max-w-[200px] line-clamp-2">{item.text}</p>
            </div>
            <div className="text-right shrink-0 ml-3">
              {kg && <p className="text-base font-extrabold text-primary leading-none">{kg}</p>}
              <p className="text-[10px] text-muted-foreground">{item.time}</p>
            </div>
          </div>
        </div>
      ) : (
        /* ── Layout sem fotos — card de depoimento ──────────────────── */
        <div className="w-full h-full rounded-3xl overflow-hidden bg-gradient-to-br from-primary/5 via-card to-accent/5 border border-border/50 shadow-xl flex flex-col items-center justify-center p-8 gap-6 text-center">
          {/* Avatar grande */}
          <div className="w-24 h-24 rounded-full bg-primary/10 border-4 border-primary/20 flex items-center justify-center">
            <span className="text-3xl font-bold text-primary">{item.initials}</span>
          </div>

          {/* Badge de resultado */}
          {kg && (
            <div className="flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-5 py-2 shadow-lg">
              <span className="text-2xl font-extrabold">{kg}</span>
              <span className="text-sm font-medium opacity-80">em {item.time}</span>
            </div>
          )}

          {/* Depoimento */}
          <p className="text-foreground/80 text-sm leading-relaxed italic max-w-xs">
            "{item.text}"
          </p>

          {/* Tempo */}
          {!kg && (
            <span className="text-xs text-muted-foreground bg-muted rounded-full px-3 py-1">
              {item.time}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── HeroSection ──────────────────────────────────────────────────────────────

const HeroSection = () => {
  const { content } = useContent();
  const { hero, identity, resultados } = content;
  const navigate = useNavigate();

  const items = resultados.items.filter(Boolean);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setCurrent(c => (c + 1) % items.length), [items.length]);
  const prev = useCallback(() => setCurrent(c => (c - 1 + items.length) % items.length), [items.length]);

  // Auto-advance
  useEffect(() => {
    if (paused || items.length <= 1) return;
    const t = setInterval(next, 4000);
    return () => clearInterval(t);
  }, [paused, next, items.length]);

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-green-light via-background to-gold-light opacity-60" />
      <div className="absolute top-20 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-0 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />

      {/* Mobile blobs */}
      <div className="lg:hidden absolute -top-10 -right-10 w-56 h-56 bg-primary/20 rounded-full blur-3xl" />
      <div className="lg:hidden absolute bottom-10 -right-8 w-52 h-52 bg-primary/22 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10 py-8 lg:py-0">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">

          {/* ── Coluna esquerda — texto ──────────────────────────────── */}
          <div className="space-y-6 lg:space-y-8">
            <div className="space-y-4 lg:space-y-5">

              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 rounded-full bg-primary/10 text-primary text-xs lg:text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                {hero.badge}
              </div>

              {/* Headline */}
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                {highlightTagline(hero.tagline, [hero.taglineHighlight1, hero.taglineHighlight2])}
              </h1>

              <p className="text-base lg:text-lg text-accent font-semibold">
                {identity.doctorName} — {identity.specialty}
              </p>

              <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-lg">
                Método aplicado em mais de{" "}
                <strong className="text-foreground">7.000 pacientes</strong> no
                Brasil, China, Estados Unidos e Amsterdã. Atendimento presencial em{" "}
                <strong className="text-foreground">
                  Alagoinhas, Salvador, Feira de Santana
                </strong>{" "}
                e região — e online para todo o mundo.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-base sm:text-lg px-6 sm:px-8 shadow-lg" onClick={() => navigate("/consultas")}>
                <Video className="mr-2 h-5 w-5" />
                {hero.cta1Text}
              </Button>
              <Button size="lg" variant="outline" className="text-base sm:text-lg px-6 sm:px-8 border-primary text-primary hover:bg-primary/5" onClick={() => navigate("/consultas")}>
                <Calendar className="mr-2 h-5 w-5" />
                {hero.cta2Text}
              </Button>
            </div>

            <button onClick={() => navigate("/resultados")}
              className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors duration-200">
              <span>Ver histórias reais de transformação</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform duration-200" />
            </button>

            {/* Social proof */}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-9 h-9 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">{hero.socialProofCount}</span>{" "}
                {hero.socialProofText}
              </p>
            </div>

          </div>

          {/* ── Desktop: carrossel principal ──────────────────────────── */}
          {items.length > 0 && (
            <div className="relative hidden lg:block"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}>

              {/* Card container */}
              <div className="relative w-full max-w-md mx-auto" style={{ aspectRatio: "3/4" }}>
                {/* Sombra decorativa atrás */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl rotate-3" />

                {/* Slides */}
                <div className="absolute inset-0 rounded-3xl overflow-hidden">
                  {items.map((item, i) => (
                    <ResultCard key={i} item={item} active={i === current} />
                  ))}
                </div>

                {/* Seta esquerda */}
                {items.length > 1 && (
                  <button onClick={prev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 flex items-center justify-center text-foreground shadow-md hover:bg-card transition-colors">
                    <ChevronLeft size={16} />
                  </button>
                )}

                {/* Seta direita */}
                {items.length > 1 && (
                  <button onClick={next}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 flex items-center justify-center text-foreground shadow-md hover:bg-card transition-colors">
                    <ChevronRight size={16} />
                  </button>
                )}

              </div>

              {/* Dots */}
              {items.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-8">
                  {items.map((_, i) => (
                    <button key={i} onClick={() => setCurrent(i)}
                      className={`rounded-full transition-all duration-300 ${
                        i === current ? "w-6 h-2 bg-primary" : "w-2 h-2 bg-border hover:bg-primary/40"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
