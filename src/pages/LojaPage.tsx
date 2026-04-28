import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, BookOpen, Calendar, Gift, Globe, MapPin,
  MessageCircle, Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PageLayout from "@/components/PageLayout";
import { useContent } from "@/contexts/ContentContext";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterTab = "todos" | "consultas" | "produtos";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MODALITY: Record<string, { label: string; Icon: React.ElementType }> = {
  online:     { label: "Online",               Icon: Wifi   },
  presencial: { label: "Presencial",           Icon: MapPin },
  both:       { label: "Online & Presencial",  Icon: Globe  },
};

const TABS: { id: FilterTab; label: string }[] = [
  { id: "todos",     label: "Todos"             },
  { id: "consultas", label: "Consultas"          },
  { id: "produtos",  label: "Produtos Digitais" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

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
        "relative flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden",
        plan.popular
          ? "border-primary ring-2 ring-primary/20"
          : plan.badge
          ? "border-gold ring-1 ring-gold/20"
          : "border-border/50"
      )}
    >
      {/* Popular top bar */}
      {plan.popular && (
        <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
      )}

      {plan.badge && (
        <Badge className="absolute top-4 right-4 bg-gold text-foreground border-gold/30 text-xs">
          {plan.badge}
        </Badge>
      )}

      <CardContent className="p-6 flex flex-col gap-5 h-full">
        {/* Meta badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1 text-xs font-medium">
            <ModalityIcon className="h-3 w-3" />
            {modality.label}
          </Badge>
          {plan.sessionCount > 1 && (
            <Badge variant="outline" className="text-xs">
              {plan.sessionCount} sessões
            </Badge>
          )}
          {plan.returnCount > 0 && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {plan.returnCount} retornos
            </Badge>
          )}
        </div>

        {/* Name + desc */}
        <div className="space-y-1.5">
          <h3 className="font-display font-bold text-lg text-foreground leading-snug">
            {plan.name}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{plan.desc}</p>
        </div>

        <p className="text-3xl font-extrabold text-primary">{plan.price}</p>

        <div className="flex-1" />

        {/* CTAs */}
        <div className="space-y-2">
          <Button
            asChild
            className={cn(
              "w-full rounded-full gap-2",
              plan.popular ? "bg-primary hover:bg-primary/90 shadow-md shadow-primary/20" : ""
            )}
            variant={plan.popular ? "default" : "outline"}
          >
            <a
              href={whatsappUrl(plan.whatsappMessage)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-4 w-4 shrink-0" />
              Falar pelo WhatsApp
            </a>
          </Button>

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground gap-1.5 hover:text-primary"
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
      item.badge ? "border-gold ring-1 ring-gold/20" : "border-border/50"
    )}
  >
    {item.badge && (
      <Badge className="absolute top-4 right-4 z-10 bg-gold text-foreground border-gold/30 text-xs">
        {item.badge}
      </Badge>
    )}

    <CardContent className="p-0 flex flex-col h-full">
      {/* Image */}
      <div className="w-full h-44 overflow-hidden bg-gradient-to-br from-secondary/50 to-green-light flex items-center justify-center shrink-0">
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

      <div className="p-6 flex flex-col gap-4 flex-1">
        <div className="space-y-1.5 flex-1">
          <h3 className="font-bold text-base text-foreground leading-snug">{item.name}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
        </div>

        <p className="text-2xl font-extrabold text-primary">{item.price}</p>

        {/* Free consultation badge */}
        <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/15 px-3 py-2">
          <Gift className="h-4 w-4 text-primary shrink-0" />
          <div>
            <p className="text-xs font-bold text-primary leading-tight">
              + Consulta gratuita de 20 min
            </p>
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

// ─── Section wrapper ──────────────────────────────────────────────────────────

interface SectionProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const Section = ({ eyebrow, title, subtitle, children }: SectionProps) => (
  <section className="space-y-8">
    <div className="space-y-1">
      <p className="text-sm font-bold uppercase tracking-widest text-primary">{eyebrow}</p>
      <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">{title}</h2>
      {subtitle && <p className="text-muted-foreground mt-1 max-w-2xl">{subtitle}</p>}
    </div>
    {children}
  </section>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const LojaPage = () => {
  const { content, whatsappUrl } = useContent();
  const { loja, produtosDigitais, marketplace } = content;
  const [activeTab, setActiveTab]   = useState<FilterTab>("todos");
  const [bgIndex,   setBgIndex]     = useState(0);

  // Normalise: support old string[] data saved before the mobile-image update
  type HeroSlide = { desktop: string; mobile: string };
  const heroImages: HeroSlide[] = (marketplace.heroImages ?? []).map((item: unknown) =>
    typeof item === "string" ? { desktop: item, mobile: "" } : (item as HeroSlide)
  );

  // Auto-advance carousel every 5 s
  useEffect(() => {
    if (heroImages.length <= 1) return;
    const id = setInterval(() => {
      setBgIndex((i) => (i + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(id);
  }, [heroImages.length]);

  const showConsultas = activeTab === "todos" || activeTab === "consultas";
  const showProdutos  = activeTab === "todos" || activeTab === "produtos";

  const hasConsultas = loja.plans.length > 0;
  const hasProdutos  = produtosDigitais.items.length > 0;

  return (
    <PageLayout>
      {/* ── Hero carousel (image only) ────────────────────────────────────── */}
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
              <img
                src={slide.mobile || slide.desktop}
                alt=""
                className="sm:hidden w-full h-full object-cover object-center"
              />
              <img
                src={slide.desktop}
                alt=""
                className="hidden sm:block w-full h-full object-cover object-center"
              />
            </div>
          ))}

          {/* Subtle bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-background to-transparent" />

          {/* Dot indicators */}
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

      {/* ── Filter tabs ───────────────────────────────────────────────────── */}
      <div className="sticky top-16 lg:top-20 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 py-3 overflow-x-auto scrollbar-none">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-16 space-y-24">

        {/* Consultas */}
        {showConsultas && hasConsultas && (
          <Section
            eyebrow="Consultas"
            title={loja.sectionTitle}
            subtitle={loja.sectionSubtitle}
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {loja.plans.map((plan, i) => (
                <ConsultaCard
                  key={i}
                  plan={plan}
                  index={i}
                  whatsappUrl={whatsappUrl}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Produtos Digitais */}
        {showProdutos && hasProdutos && (
          <Section
            eyebrow="Produtos Digitais"
            title={produtosDigitais.sectionTitle}
            subtitle={produtosDigitais.sectionSubtitle}
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {produtosDigitais.items.map((item, i) => (
                <ProdutoCard key={i} item={item} index={i} />
              ))}
            </div>
          </Section>
        )}

        {/* Empty state */}
        {!hasConsultas && !hasProdutos && (
          <div className="text-center py-20 text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Nenhum produto disponível no momento.</p>
            <p className="text-sm mt-1">Volte em breve!</p>
          </div>
        )}
      </div>

      {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
      <section className="bg-green-light border-t border-primary/10 py-16 px-4">
        <div className="container mx-auto text-center max-w-xl space-y-5">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Não sabe por onde começar?
          </h2>
          <p className="text-muted-foreground">
            Fale diretamente com o Dr. Fillipe pelo WhatsApp e descubra qual plano ou produto
            é ideal para o seu objetivo.
          </p>
          <Button
            asChild
            size="lg"
            className="rounded-full bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20"
          >
            <a
              href={whatsappUrl(content.cta.whatsappMessage)}
              target="_blank"
              rel="noopener noreferrer"
            >
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
