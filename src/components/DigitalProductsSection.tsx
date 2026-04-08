import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, ArrowRight, Gift } from "lucide-react";
import { Link } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useContent } from "@/contexts/ContentContext";

const DigitalProductsSection = () => {
  const { content } = useContent();
  const { produtosDigitais } = content;
  const { ref, isVisible, hiddenClass } = useScrollAnimation();

  return (
    <section id="produtos" className="py-20 bg-background">
      <div ref={ref} className="container mx-auto px-4">
        <div
          className={`text-center max-w-2xl mx-auto mb-12 transition-[opacity,transform] duration-700 ease-smooth ${
            isVisible ? "opacity-100 translate-y-0" : hiddenClass
          }`}
        >
          <p className="text-sm font-bold uppercase tracking-widest text-primary mb-2">
            Produtos Digitais
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            {produtosDigitais.sectionTitle}
          </h2>
          {produtosDigitais.sectionSubtitle && (
            <p className="mt-3 text-muted-foreground">{produtosDigitais.sectionSubtitle}</p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {produtosDigitais.items.map((item, i) => (
            <Card
              key={i}
              className={`relative group hover:shadow-xl hover:-translate-y-1 transition-all duration-700 ease-smooth ${
                item.badge ? "border-gold ring-1 ring-gold/20" : "border-border/50"
              } ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              style={{ transitionDelay: isVisible ? `${i * 120}ms` : "0ms" }}
            >
              {item.badge && (
                <Badge className="absolute -top-3 left-6 bg-gold text-foreground border-gold/30">
                  {item.badge}
                </Badge>
              )}
              <CardContent className="p-6 flex flex-col gap-4 h-full">
                <div className="w-full h-40 rounded-lg overflow-hidden bg-gradient-to-br from-secondary/40 to-green-light flex items-center justify-center">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <BookOpen className="h-10 w-10 text-primary/30" />
                  )}
                </div>
                <h3 className="font-bold text-base text-foreground">{item.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">{item.desc}</p>
                <p className="text-2xl font-extrabold text-primary">{item.price}</p>
                <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/15 px-3 py-2">
                  <Gift className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-primary leading-tight">+ Consulta gratuita de 20 min</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">inclusa na compra</p>
                  </div>
                </div>
                <Button
                  asChild
                  variant={item.badge ? "default" : "outline"}
                  className="rounded-full gap-2"
                >
                  <Link to={`/produto/${i}`}>
                    Saiba mais
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DigitalProductsSection;
