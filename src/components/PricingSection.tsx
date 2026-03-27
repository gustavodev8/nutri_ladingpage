import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useContent } from "@/contexts/ContentContext";

const PricingSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  const { content, whatsappUrl } = useContent();
  const { pricing } = content;

  return (
    <section id="valores" className="py-20 lg:py-28">
      <div
        ref={ref}
        className={`container mx-auto px-4 transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <span className="text-accent font-semibold text-sm uppercase tracking-widest">
            Valores
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            {pricing.title}
          </h2>
          <p className="text-muted-foreground">{pricing.subtitle}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {pricing.plans.map(({ title, price, period, features, popular, whatsappMessage }) => (
            <div
              key={title}
              className={`relative rounded-3xl p-8 flex flex-col border transition-all duration-300 hover:shadow-xl ${
                popular
                  ? "bg-primary text-primary-foreground border-primary shadow-lg scale-[1.02]"
                  : "bg-card border-border/50 hover:border-primary/30"
              }`}
            >
              {popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground border-0 px-4 py-1">
                  Mais Escolhido
                </Badge>
              )}
              <div className="space-y-2 mb-6">
                <h3
                  className={`font-bold text-lg ${
                    popular ? "text-primary-foreground" : "text-foreground"
                  }`}
                >
                  {title}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-3xl font-bold ${
                      popular ? "text-primary-foreground" : "text-foreground"
                    }`}
                  >
                    {price}
                  </span>
                  <span
                    className={`text-sm ${
                      popular ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    /{period}
                  </span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check
                      className={`h-4 w-4 mt-0.5 shrink-0 ${
                        popular ? "text-primary-foreground" : "text-primary"
                      }`}
                    />
                    <span className={popular ? "text-primary-foreground/90" : "text-muted-foreground"}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className={`w-full ${
                  popular
                    ? "bg-card text-primary hover:bg-card/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                <a
                  href={whatsappUrl(whatsappMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Quero esse plano
                </a>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
