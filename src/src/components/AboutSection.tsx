import { Award, Users, GraduationCap, LucideIcon } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useContent } from "@/contexts/ContentContext";

const STAT_ICONS: LucideIcon[] = [Award, Users, GraduationCap];

const AboutSection = () => {
  const { ref, isVisible, hiddenClass } = useScrollAnimation();
  const { content } = useContent();
  const { about } = content;

  return (
    <section id="sobre" className="py-20 lg:py-28 bg-card">
      <div
        ref={ref}
        className={`container mx-auto px-4 transition-[opacity,transform] duration-600 ease-smooth ${
          isVisible ? "opacity-100 translate-y-0" : hiddenClass
        }`}
      >
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="aspect-[4/5] rounded-3xl bg-muted overflow-hidden flex items-center justify-center">
              <div className="text-center space-y-3 p-8">
                <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                  <span className="text-3xl">📸</span>
                </div>
                <p className="text-muted-foreground text-sm">Foto secundária</p>
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-accent/20 rounded-full blur-2xl" />
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
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

            <div className="grid grid-cols-3 gap-4">
              {about.stats.map(({ label, value }, i) => {
                const Icon = STAT_ICONS[i % STAT_ICONS.length];
                return (
                  <div key={label} className="text-center p-4 rounded-2xl bg-green-light">
                    <Icon className="h-6 w-6 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
