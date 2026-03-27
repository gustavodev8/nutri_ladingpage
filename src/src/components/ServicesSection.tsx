import {
  Video,
  MapPin,
  CalendarCheck,
  Apple,
  Dumbbell,
  Stethoscope,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useContent } from "@/contexts/ContentContext";

const ICON_MAP: Record<string, LucideIcon> = {
  Video,
  MapPin,
  CalendarCheck,
  Apple,
  Dumbbell,
  Stethoscope,
};

const ServicesSection = () => {
  const { ref, isVisible, hiddenClass } = useScrollAnimation();
  const { content } = useContent();
  const { services } = content;

  return (
    <section id="servicos" className="py-20 lg:py-28">
      <div
        ref={ref}
        className={`container mx-auto px-4 transition-[opacity,transform] duration-600 ease-smooth ${
          isVisible ? "opacity-100 translate-y-0" : hiddenClass
        }`}
      >
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <span className="text-accent font-semibold text-sm uppercase tracking-widest">
            Serviços
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            {services.title}
          </h2>
          <p className="text-muted-foreground">{services.subtitle}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.items.map(({ icon, title, desc }, i) => {
            const Icon = ICON_MAP[icon] ?? HelpCircle;
            return (
              <Card
                key={i}
                className="group border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 bg-card"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <CardContent className="p-8 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
