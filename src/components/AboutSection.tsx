import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useContent } from "@/contexts/ContentContext";

const AboutSection = () => {
  const { ref, isVisible, hiddenClass } = useScrollAnimation();
  const { content } = useContent();
  const { about } = content;

  return (
    <section id="sobre" className="py-20 lg:py-28 bg-card">
      <div
        ref={ref}
        className={`container mx-auto px-4 transition-[opacity,transform] duration-700 ease-smooth ${
          isVisible ? "opacity-100 translate-y-0" : hiddenClass
        }`}
      >
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          <div className="relative">
            <div className="aspect-[3/4] lg:aspect-[4/5] rounded-2xl lg:rounded-3xl bg-muted overflow-hidden flex items-center justify-center">
              {about.photoUrl ? (
                <img
                  src={about.photoUrl}
                  alt="Foto — Sobre Mim"
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="text-center space-y-3 p-8">
                  <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                    <span className="text-3xl">📸</span>
                  </div>
                  <p className="text-muted-foreground text-sm">Foto secundária</p>
                </div>
              )}
            </div>
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-accent/20 rounded-full blur-2xl" />
          </div>

          <div className="space-y-6 lg:space-y-8">
            <div className="space-y-3 lg:space-y-4">
              <span className="text-accent font-semibold text-sm uppercase tracking-widest">
                {about.eyebrow}
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                {about.title}
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>{about.bio1}</p>
                <p>{about.bio2}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {about.stats.map(({ label, value }, i) => (
                <div
                  key={label}
                  className={`relative p-5 rounded-2xl bg-background border border-border/60 overflow-hidden transition-[opacity,transform] duration-700 ease-smooth ${
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  }`}
                  style={{ transitionDelay: isVisible ? `${200 + i * 100}ms` : "0ms" }}
                >
                  {/* Accent bar */}
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary/60 via-primary/30 to-transparent rounded-t-2xl" />
                  <p className="text-3xl font-bold text-primary tracking-tight leading-none">{value}</p>
                  <p className="text-xs text-muted-foreground mt-2 leading-snug">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
