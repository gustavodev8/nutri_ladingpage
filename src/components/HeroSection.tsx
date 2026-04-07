import { Video, Calendar, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useContent } from "@/contexts/ContentContext";

/** Splits `text` into parts, wrapping matched highlights in <span className="text-primary"> */
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

const HeroSection = () => {
  const { content } = useContent();
  const { hero, identity } = content;
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-green-light via-background to-gold-light opacity-60" />
      <div className="absolute top-20 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-0 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />

      {/* Mobile blobs */}
      <div className="lg:hidden absolute -top-10 -right-10 w-56 h-56 bg-primary/20 rounded-full blur-3xl blob-float-1" />
      <div className="lg:hidden absolute top-40 -left-16 w-48 h-48 bg-primary/15 rounded-full blur-2xl blob-float-2" />
      <div className="lg:hidden absolute bottom-10 -right-8 w-52 h-52 bg-primary/22 rounded-full blur-3xl blob-float-3" />
      <div className="lg:hidden absolute bottom-28 -left-12 w-56 h-56 bg-primary/18 rounded-full blur-3xl blob-float-4" />
      <div className="lg:hidden absolute bottom-0 left-1/3 w-60 h-48 bg-accent/20 rounded-full blur-3xl blob-float-5" />
      <div className="lg:hidden absolute bottom-16 left-1/2 w-44 h-44 bg-primary/12 rounded-full blur-2xl blob-float-6" />

      <div className="container mx-auto px-4 relative z-10 py-8 lg:py-0">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          <div className="space-y-6 lg:space-y-8">
            <div className="space-y-4 lg:space-y-5">

              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 rounded-full bg-primary/10 text-primary text-xs lg:text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                {hero.badge}
              </div>

              {/* Main headline — value proposition */}
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                {highlightTagline(hero.tagline, [hero.taglineHighlight1, hero.taglineHighlight2])}
              </h1>

              {/* Name as credibility subtitle */}
              <p className="text-base lg:text-lg text-accent font-semibold">
                {identity.doctorName} — {identity.specialty}
              </p>

              {/* Social proof supporting text */}
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-lg">
                Método aplicado em mais de{" "}
                <strong className="text-foreground">7.000 pacientes</strong> no
                Brasil, China, Estados Unidos e Amsterdã. Atendimento presencial
                em{" "}
                <strong className="text-foreground">
                  Alagoinhas, Salvador, Feira de Santana
                </strong>{" "}
                e região — e online para todo o mundo.
              </p>
            </div>

            {/* CTAs principais */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-base sm:text-lg px-6 sm:px-8 shadow-lg"
                onClick={() => navigate("/consultas")}
              >
                <Video className="mr-2 h-5 w-5" />
                {hero.cta1Text}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base sm:text-lg px-6 sm:px-8 border-primary text-primary hover:bg-primary/5"
                onClick={() => navigate("/consultas")}
              >
                <Calendar className="mr-2 h-5 w-5" />
                {hero.cta2Text}
              </Button>
            </div>

            {/* CTA secundário — prova social / resultados */}
            <div className="relative inline-block w-full sm:w-auto">
              {/* Ping rings */}
              <span className="absolute -inset-1 rounded-2xl bg-amber-400/20 animate-ping" />
              <button
                onClick={() => navigate("/resultados")}
                className="relative w-full sm:w-auto flex items-center justify-center gap-3 px-7 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-white font-bold text-base shadow-lg shadow-amber-500/30 hover:shadow-amber-400/40 transition-all duration-200 hover:-translate-y-0.5 group"
              >
                <Sparkles className="h-5 w-5 shrink-0" />
                <span>Ver histórias de transformação</span>
                <ArrowRight className="h-4 w-4 shrink-0 group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            </div>

            {/* Social proof avatars */}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs font-bold text-muted-foreground"
                  >
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

          {/* Desktop photo */}
          <div className="relative hidden lg:block">
            <div className="relative w-full aspect-[3/4] max-w-md mx-auto">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl rotate-3" />
              <div className="absolute inset-0 bg-muted rounded-3xl overflow-hidden flex items-center justify-center">
                {identity.photoUrl ? (
                  <img
                    src={identity.photoUrl}
                    alt={identity.doctorName}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="text-center space-y-3 p-8">
                    <div className="w-24 h-24 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                      <span className="text-4xl">🥗</span>
                    </div>
                    <p className="text-muted-foreground text-sm">Foto do profissional</p>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-4 -left-4 bg-card rounded-2xl shadow-xl p-4 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg">⭐</span>
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm">{hero.ratingScore}</p>
                    <p className="text-xs text-muted-foreground">{hero.ratingCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
