import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, QrCode, Link as LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useContent } from "@/contexts/ContentContext";

const ShopSection = () => {
  const { content } = useContent();
  const { loja } = content;
  const { ref, isVisible, hiddenClass } = useScrollAnimation();

  return (
    <section id="consultas" className="py-20 bg-green-light">
      <div ref={ref} className="container mx-auto px-4">
        <div
          className={`text-center max-w-2xl mx-auto mb-12 transition-[opacity,transform] duration-700 ease-smooth ${
            isVisible ? "opacity-100 translate-y-0" : hiddenClass
          }`}
        >
          <p className="text-sm font-bold uppercase tracking-widest text-primary mb-2">
            Loja de Consultas
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            {loja.sectionTitle}
          </h2>
          {loja.sectionSubtitle && (
            <p className="mt-3 text-muted-foreground">{loja.sectionSubtitle}</p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loja.plans.map((plan, i) => (
            <Card
              key={i}
              className={`relative hover:shadow-xl hover:-translate-y-1 transition-all duration-700 ease-smooth ${
                plan.popular
                  ? "border-primary shadow-lg ring-2 ring-primary/20"
                  : "border-border/50"
              } ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              style={{ transitionDelay: isVisible ? `${i * 120}ms` : "0ms" }}
            >
              {plan.badge && (
                <Badge className="absolute -top-3 left-6 bg-primary text-primary-foreground">
                  {plan.badge}
                </Badge>
              )}
              <CardContent className="p-6 flex flex-col gap-4 h-full">
                <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">{plan.desc}</p>
                <p className="text-3xl font-extrabold text-primary">{plan.price}</p>
                <Button asChild variant={plan.popular ? "default" : "outline"} className="rounded-full">
                  <Link to={`/agendar/${i}`}>Agendar consulta</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-6 mt-10 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-primary" /> Pix
          </span>
          <span className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" /> Cartão de crédito/débito
          </span>
          <span className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-primary" /> Link de pagamento
          </span>
        </div>
      </div>
    </section>
  );
};

export default ShopSection;
