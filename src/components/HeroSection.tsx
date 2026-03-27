import { Calendar, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContent } from "@/contexts/ContentContext";

const HeroSection = () => {
  const { content, whatsappUrl } = useContent();
  const { hero, identity } = content;

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-green-light via-background to-gold-light opacity-60" />
      <div className="absolute top-20 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-0 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />

      {/* Mobile-only decorative blobs */}
      <div className="lg:hidden absolute -top-10 -right-10 w-56 h-56 bg-primary/20 rounded-full blur-3xl" />
      <div className="lg:hidden absolute top-40 -left-16 w-48 h-48 bg-primary/15 rounded-full blur-2xl" />
      <div className="lg:hidden absolute bottom-10 right-0 w-40 h-40 bg-accent/20 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10 py-8 lg:py-0">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          <div className="space-y-6 lg:space-y-8">
            <div className="space-y-3 lg:space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 rounded-full bg-primary/10 text-primary text-xs lg:text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                {hero.badge}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                {identity.doctorName}
              </h1>
              <p className="text-base lg:text-lg text-accent font-medium">
                {identity.specialty} — {identity.crn}
              </p>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-lg">
                {hero.tagline}{" "}
                <span className="text-primary font-semibold">{hero.taglineHighlight1}</span> e{" "}
                <span className="text-primary font-semibold">{hero.taglineHighlight2}</span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                asChild
                size="lg"
                className="bg-primary hover:bg-primary/90 text-base sm:text-lg px-6 sm:px-8 shadow-lg"
              >
                <a
                  href={whatsappUrl("Olá! Gostaria de agendar uma consulta online.")}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Video className="mr-2 h-5 w-5" />
                  {hero.cta1Text}
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="text-base sm:text-lg px-6 sm:px-8 border-primary text-primary hover:bg-primary/5"
              >
                <a
                  href={whatsappUrl("Olá! Gostaria de agendar uma consulta presencial.")}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Calendar className="mr-2 h-5 w-5" />
                  {hero.cta2Text}
                </a>
              </Button>
            </div>

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
                      <span className="text-4xl">👩‍⚕️</span>
                    </div>
                    <p className="text-muted-foreground text-sm">Foto da profissional</p>
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
