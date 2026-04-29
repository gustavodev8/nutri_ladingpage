import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, BookOpen, Calendar, Gift, Globe, MapPin,
  MessageCircle, ShoppingBag, Star, Wifi,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PageLayout from "@/components/PageLayout";
import { useContent } from "@/contexts/ContentContext";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type CategoryTab = "todos" | "consultas" | "produtos";
type ModalityFilter = "all" | "online" | "presencial" | "both";

// ─── Constants ────────────────────────────────────────────────────────────────

const MODALITY: Record<string, { label: string; Icon: React.ElementType }> = {
  online:     { label: "Online",              Icon: Wifi   },
  presencial: { label: "Presencial",          Icon: MapPin },
  both:       { label: "Online & Presencial", Icon: Globe  },
};

const CATEGORY_TABS: { id: CategoryTab; label: string }[] = [
  { id: "todos",     label: "Todos"             },
  { id: "consultas", label: "Consultas"          },
  { id: "produtos",  label: "Produtos Digitais" },
];

const MODALITY_OPTIONS: { id: ModalityFilter; label: string }[] = [
  { id: "all",        label: "Todas"               },
  { id: "online",     label: "Online"              },
  { id: "presencial", label: "Presencial"          },
  { id: "both",       label: "Online & Presencial" },
];

// ─── ConsultaCard ─────────────────────────────────────────────────────────────

interface ConsultaCardProps {
  plan: {
    name: string;
    desc: string;
    price: string;
    badge: string;
    popular: boolean;
    whatsappMessage: string;
    sessionCount: number;
    returnCount: number;
    consultationType: string;
  };
  index: number;
  whatsappUrl: (msg: string) => string;
}

const ConsultaCard = ({ plan, index, whatsappUrl }: ConsultaCardProps) => {
  const modality = MODALITY[plan.consultationType] ?? MODALITY.both;
  const ModalityIcon = modality.Icon;

  return (
    <Card
      className={cn(
        "relative flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
        plan.popular
          ? "border-primary ring-2 ring-primary/20 shadow-md shadow-primary/10"
          : "border-border/60 hover:border-primary/30"
      )}
    >
      {plan.popular && (
        <div className="h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
      )}

      {plan.popular && (
        <div className="absolute top-3.5 left-4 z-10">
          <span className="flex items-center gap-1 bg-primary text-primary-foreground text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
            <Star className="h-2.5 w-2.5 fill-current" />
            Mais popular
          </span>
        </div>
      )}

      {!plan.popular && plan.badge && (
        <Badge className="absolute top-4 right-4 z-10 bg-gold text-foreground border-gold/30 text-xs">
          {plan.badge}
        </Badge>
      )}

      <CardContent className={cn("p-6 flex flex-col gap-4 flex-1", plan.popular && "pt-12")}>
        {/* Modality + session tags */}
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 text-xs font-medium bg-muted/70 text-muted-foreground rounded-full px-2.5 py-1">
            <ModalityIcon className="h-3 w-3" />
            {modality.label}
          </span>
          {plan.sessionCount > 1 && (
            <span className="inline-flex items-center text-xs font-medium bg-primary/10 text-primary rounded-full px-2.5 py-1">
              {plan.sessionCount} sessões
            </span>
          )}
          {plan.returnCount > 0 && (
            <span className="inline-flex items-center text-xs font-medium bg-muted/70 text-muted-foreground rounded-full px-2.5 py-1">
              {plan.returnCount} retornos
            </span>
          )}
        </div>

        {/* Name + description */}
        <div className="space-y-1.5">
          <h3 className="font-display font-bold text-lg text-foreground leading-snug">{plan.name}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{plan.desc}</p>
        </div>

        {/* Price */}
        <div>
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Investimento</p>
          <p className={cn("text-3xl font-extrabold leading-none", plan.popular ? "text-primary" : "text-foreground")}>
            {plan.price}
          </p>
        </div>

        <div className="flex-1" />

        {/* CTAs */}
        <div className="space-y-2 pt-3 border-t border-border/50">
          <Button
            asChild
            className={cn(
              "w-full rounded-full gap-2",
              plan.popular
                ? "bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"
                : ""
            )}
            variant={plan.popular ? "default" : "outline"}
          >
            <a href={whatsappUrl(plan.whatsappMessage)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4 shrink-0" />
              Falar pelo WhatsApp
            </a>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground gap-1.5 hover:text-primary text-xs h-8"
          >
            <Link to={`/agendar/${index}`}>
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              Agendar pelo sistema
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── ProdutoCard ──────────────────────────────────────────────────────────────

interface ProdutoCardProps {
  item: {
    name: string;
    desc: string;
    price: string;
    badge: string;
    imageUrl: string;
  };
  index: number;
}

const ProdutoCard = ({ item, index }: ProdutoCardProps) => (
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
      <div className="w-full h-44 overflow-hidden bg-gradient-to-br from-primary/10 via-secondary/10 to-primary/5 flex items-center justify-center shrink-0">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
          <p className="text-2xl font-extrabold text-primary leading-none">{item.price}</p>
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

// ─── Page ─────────────────────────────────────────────────────────────────────

const LojaPage = () => {
  const { content, whatsappUrl } = useContent();
  const { loja, produtosDigitais, marketplace } = content;
  const [category, setCategory] = useState<CategoryTab>("todos");
  const [modality, setModality] = useState<ModalityFilter>("all");
  const [bgIndex,  setBgIndex]  = useState(0);

  type HeroSlide = { desktop: string; mobile: string };
  const heroImages: HeroSlide[] = (marketplace.heroImages ?? []).map((item: unknown) =>
    typeof item === "string" ? { desktop: item, mobile: "" } : (item as HeroSlide)
  );

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const id = setInterval(() => setBgIndex((i) => (i + 1) % heroImages.length), 5000);
    return () => clearInterval(id);
  }, [heroImages.length]);

  const filteredPlans = useMemo(
    () => modality === "all" ? loja.plans : loja.plans.filter((p) => p.consultationType === modality),
    [loja.plans, modality]
  );

  const showConsultas = category === "todos" || category === "consultas";
  const showProdutos  = category === "todos" || category === "produtos";

  const consultaCount = loja.plans.length;
  const produtoCount  = produtosDigitais.items.length;
  const totalCount    = consultaCount + produtoCount;

  const showModalityFilter = showConsultas && consultaCount > 0;

  const visibleCount =
    (showConsultas ? filteredPlans.length : 0) +
    (showProdutos  ? produtosDigitais.items.length : 0);

  const getTabCount = (id: CategoryTab) => {
    if (id === "todos")     return totalCount;
    if (id === "consultas") return consultaCount;
    return produtoCount;
  };

  return (
    <PageLayout>
      {/* ── Hero carousel ───────────────────────────────────────────────────── */}
      {heroImages.length > 0 && (
        <section className="relative bg-green-dark h-[220px] sm:h-[320px] overflow-hidden">
          {heroImages.map((slide, i) => (
            <div
              key={i}
              aria-hidden="true"
              className={cn(
                "absolute inset-0 transition-opacity duration-1000 ease-in-out",
                i === bgIndex ? "opacity-100" : "opacity-0"
              )}
            >
              <img src={slide.mobile || slide.desktop} alt="" className="sm:hidden w-full h-full object-cover object-center" />
              <img src={slide.desktop} alt="" className="hidden sm:block w-full h-full object-cover object-center" />
            </div>
          ))}
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-background to-transparent" />
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

        {/* Results count */}
        {totalCount > 0 && (
          <p className="text-sm text-muted-foreground mb-10">
            {visibleCount} {visibleCount === 1 ? "item encontrado" : "itens encontrados"}
            {modality !== "all" && showConsultas && (
              <>
                {" · "}
                <button onClick={() => setModality("all")} className="text-primary hover:underline">
                  limpar filtro de modalidade
                </button>
              </>
            )}
          </p>
        )}

        <div className="space-y-20">

          {/* Consultas */}
          {showConsultas && filteredPlans.length > 0 && (
            <section className="space-y-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Consultas</p>
                <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">{loja.sectionTitle}</h2>
                {loja.sectionSubtitle && (
                  <p className="text-muted-foreground mt-1.5 max-w-2xl text-sm">{loja.sectionSubtitle}</p>
                )}
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredPlans.map((plan, i) => (
                  <ConsultaCard key={i} plan={plan} index={i} whatsappUrl={whatsappUrl} />
                ))}
              </div>
            </section>
          )}

          {/* Empty: modality filter gave 0 results but plans exist */}
          {showConsultas && filteredPlans.length === 0 && loja.plans.length > 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="font-medium">Nenhuma consulta disponível para esta modalidade.</p>
              <button onClick={() => setModality("all")} className="mt-2 text-sm text-primary hover:underline">
                Ver todas as modalidades
              </button>
            </div>
          )}

          {/* Produtos Digitais */}
          {showProdutos && produtosDigitais.items.length > 0 && (
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
          )}

          {/* Global empty state */}
          {consultaCount === 0 && produtoCount === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Nenhum produto disponível no momento.</p>
              <p className="text-sm mt-1">Volte em breve!</p>
            </div>
          )}

        </div>
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
