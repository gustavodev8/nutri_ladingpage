import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, ArrowRight, Gift, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useContent } from "@/contexts/ContentContext";
import { doesDiscountApply, formatCurrency, getDiscountPercentage } from "@/lib/discountUtils";

function useDiscount() {
  const { content } = useContent();
  const discount = content.discount;
  const formatDiscounted = (name: string, price: string, amount: number) => {
    if (!doesDiscountApply(discount, "ebook", name)) return price;
    return formatCurrency(amount * (1 - getDiscountPercentage(discount, "ebook") / 100));
  };
  return { percentage: getDiscountPercentage(discount, "ebook"), doesApply: (name: string) => doesDiscountApply(discount, "ebook", name), formatDiscounted };
}

const DigitalProductsSection = () => {
  const { content } = useContent();
  const { doesApply, percentage, formatDiscounted } = useDiscount();
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
          {produtosDigitais.items.slice(0, 6).map((item, i) => (
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
                <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-secondary/40 to-green-light flex items-center justify-center">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <BookOpen className="h-10 w-10 text-primary/30" />
                  )}
                </div>
                <h3 className="font-bold text-base text-foreground">{item.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">{item.desc}</p>
                {doesApply(item.name) ? (
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="text-2xl font-extrabold text-primary">
                      {formatDiscounted(item.name, item.price, item.priceAmount)}
                    </p>
                    <p className="text-sm text-muted-foreground line-through">{item.price}</p>
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">-{percentage}%</Badge>
                  </div>
                ) : (
                  <p className="text-2xl font-extrabold text-primary">{item.price}</p>
                )}
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

        {produtosDigitais.items.length > 0 && (
          <div
            className={`mt-12 text-center transition-[opacity,transform] duration-700 ease-smooth ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
            style={{ transitionDelay: isVisible ? "750ms" : "0ms" }}
          >
            <p className="text-muted-foreground text-sm mb-4">
              {produtosDigitais.items.length > 6
                ? `Veja todos os ${produtosDigitais.items.length} produtos na nossa loja`
                : "Explore todos os nossos materiais na loja"}
            </p>
            <Button asChild size="lg" className="rounded-full gap-2 px-8">
              <Link to="/loja">
                <ShoppingBag className="h-5 w-5" />
                Ver loja completa
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default DigitalProductsSection;
