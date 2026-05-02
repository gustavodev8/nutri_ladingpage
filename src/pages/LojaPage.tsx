import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, BookOpen, Gift, MessageCircle, ShoppingBag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PageLayout from "@/components/PageLayout";
import { useContent } from "@/contexts/ContentContext";
import { cn } from "@/lib/utils";

function useDiscount() {
  const { content } = useContent();
  const { active, percentage, expiresAt } = content.discount;
  const expired = expiresAt !== null && new Date(expiresAt).getTime() <= Date.now();
  const isActive = active && !expired;
  const formatDiscounted = (amount: number) => {
    if (!isActive) return null;
    const val = amount * (1 - percentage / 100);
    return `R$ ${val % 1 === 0 ? val.toFixed(0) : val.toFixed(2).replace(".", ",")}`;
  };
  return { isActive, percentage, formatDiscounted };
}

// ─── Types ────────────────────────────────────────────────────────────────────


// ─── ProdutoCard ──────────────────────────────────────────────────────────────

interface ProdutoCardProps {
  item: {
    name: string;
    desc: string;
    price: string;
    priceAmount: number;
    badge: string;
    imageUrl: string;
  };
  index: number;
}

const ProdutoCard = ({ item, index }: ProdutoCardProps) => {
  const { isActive, percentage, formatDiscounted } = useDiscount();
  const discountedPrice = formatDiscounted(item.priceAmount);
  return (
  <Card
    className={cn(
      "relative group transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden",
      item.badge ? "border-gold/50 ring-1 ring-gold/20" : "border-border/60 hover:border-primary/30"
    )}
  >
    {item.badge && (
      <Badge className="absolute top-4 right-4 z-10 bg-gold text-foreground border-gold/30 text-xs">
        {item.badge}
      </Badge>
    )}

    <CardContent className="p-0 flex flex-col h-full">
      <div className="w-full aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/10 via-secondary/10 to-primary/5 flex items-center justify-center shrink-0">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <BookOpen className="h-12 w-12 text-primary/25" />
        )}
      </div>

      <div className="p-5 flex flex-col gap-4 flex-1">
        <div className="space-y-1.5 flex-1">
          <h3 className="font-bold text-base text-foreground leading-snug">{item.name}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
        </div>

        <div>
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Preço</p>
          {isActive && discountedPrice ? (
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="text-2xl font-extrabold text-primary leading-none">{discountedPrice}</p>
              <p className="text-sm text-muted-foreground line-through">{item.price}</p>
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">-{percentage}%</Badge>
            </div>
          ) : (
            <p className="text-2xl font-extrabold text-primary leading-none">{item.price}</p>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/15 px-3 py-2.5">
          <Gift className="h-4 w-4 text-primary shrink-0" />
          <div>
            <p className="text-xs font-bold text-primary leading-tight">+ Consulta gratuita de 20 min</p>
            <p className="text-[11px] text-muted-foreground leading-tight">inclusa na compra</p>
          </div>
        </div>

        <Button asChild className="rounded-full gap-2 w-full">
          <Link to={`/produto/${index}`}>
            Comprar agora
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </CardContent>
  </Card>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const LojaPage = () => {
  const { content, whatsappUrl } = useContent();
  const { produtosDigitais, marketplace } = content;
  const [bgIndex, setBgIndex] = useState(0);

  type HeroSlide = { desktop: string; mobile: string };
  const heroImages: HeroSlide[] = (marketplace.heroImages ?? []).map((item: unknown) =>
    typeof item === "string" ? { desktop: item, mobile: "" } : (item as HeroSlide)
  );

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const id = setInterval(() => setBgIndex((i) => (i + 1) % heroImages.length), 5000);
    return () => clearInterval(id);
  }, [heroImages.length]);

  const produtoCount = produtosDigitais.items.length;

  return (
    <PageLayout>
      {/* ── Hero carousel ───────────────────────────────────────────────────── */}
      {heroImages.length > 0 && (
        <section className="relative bg-green-dark h-[240px] sm:h-[450px] overflow-hidden">
          {heroImages.map((slide, i) => (
            <div
              key={i}
              aria-hidden="true"
              className={cn(
                "absolute inset-0 transition-opacity duration-1000 ease-in-out",
                i === bgIndex ? "opacity-100" : "opacity-0"
              )}
            >
              <img src={slide.mobile || slide.desktop} alt="" className="sm:hidden w-full h-full object-cover object-top" />
              <img src={slide.desktop} alt="" className="hidden sm:block w-full h-full object-cover object-top" />
            </div>
          ))}
          {heroImages.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
              {heroImages.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => setBgIndex(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === bgIndex ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                  )}
                />
              ))}
            </div>
          )}
        </section>
      )}


      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-10">

        {produtosDigitais.items.length > 0 ? (
          <section className="space-y-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Produtos Digitais</p>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">{produtosDigitais.sectionTitle}</h2>
              {produtosDigitais.sectionSubtitle && (
                <p className="text-muted-foreground mt-1.5 max-w-2xl text-sm">{produtosDigitais.sectionSubtitle}</p>
              )}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {produtosDigitais.items.map((item, i) => (
                <ProdutoCard key={i} item={item} index={i} />
              ))}
            </div>
          </section>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Nenhum produto disponível no momento.</p>
            <p className="text-sm mt-1">Volte em breve!</p>
          </div>
        )}

      </div>

      {/* ── Bottom CTA ──────────────────────────────────────────────────────── */}
      <section className="bg-green-light border-t border-primary/10 py-16 px-4">
        <div className="container mx-auto text-center max-w-xl space-y-5">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Não sabe por onde começar?
          </h2>
          <p className="text-muted-foreground">
            Fale diretamente com o Dr. Fillipe pelo WhatsApp e descubra qual plano ou produto é ideal para o seu objetivo.
          </p>
          <Button
            asChild
            size="lg"
            className="rounded-full bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20"
          >
            <a href={whatsappUrl(content.cta.whatsappMessage)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-5 w-5" />
              Falar pelo WhatsApp
            </a>
          </Button>
        </div>
      </section>
    </PageLayout>
  );
};

export default LojaPage;
