import { useEffect } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, CheckCircle2, CalendarCheck, ClipboardList, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageLayout from "@/components/PageLayout";
import TestimonialsSection from "@/components/TestimonialsSection";
import CTASection from "@/components/CTASection";
import { useContent } from "@/contexts/ContentContext";

const STEPS = [
  {
    icon: MessageCircle,
    title: "1. Entre em contato",
    desc: "Mande uma mensagem no WhatsApp. Vamos entender seu objetivo e indicar o melhor plano para você.",
  },
  {
    icon: CalendarCheck,
    title: "2. Agende sua consulta",
    desc: "Escolha o dia e horário que funciona pra você — online de qualquer lugar do Brasil, ou presencial em Alagoinhas/BA.",
  },
  {
    icon: ClipboardList,
    title: "3. Receba seu protocolo",
    desc: "Após a avaliação completa, você recebe um cardápio 100% personalizado para sua rotina, objetivos e corpo.",
  },
  {
    icon: TrendingUp,
    title: "4. Acompanhamento contínuo",
    desc: "A cada 21 dias revisamos e ajustamos o protocolo. Resultados reais vêm da continuidade — não de uma única consulta.",
  },
];

const ConsultasPage = () => {
  const { content, whatsappUrl } = useContent();
  const { loja } = content;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return (
    <PageLayout>
      {/* Hero da página */}
      <section className="bg-green-light py-16 lg:py-24">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-widest text-primary mb-3">Consultas</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground leading-tight">
            Escolha o plano certo para{" "}
            <span className="text-primary">transformar sua saúde</span>
          </h1>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
            Do acompanhamento avulso ao protocolo anual — cada plano foi desenhado para entregar
            resultados reais com método e ciência.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" />Cardápio 100% personalizado</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" />Avaliação física completa</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" />Online ou presencial</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" />Sem dietas genéricas</span>
          </div>
        </div>
      </section>

      {/* Planos */}
      <section className="py-16 lg:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              {loja.sectionTitle}
            </h2>
            {loja.sectionSubtitle && (
              <p className="mt-3 text-muted-foreground">{loja.sectionSubtitle}</p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {loja.plans.map((plan, i) => (
              <div
                key={i}
                className={`relative rounded-2xl border p-6 flex flex-col gap-4 transition-all hover:shadow-lg hover:-translate-y-1 duration-300 ${
                  plan.popular
                    ? "border-primary shadow-lg ring-2 ring-primary/20 bg-card"
                    : "border-border/60 bg-card"
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-6 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                    {plan.badge}
                  </span>
                )}
                <div>
                  <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{plan.desc}</p>
                </div>
                <p className="text-3xl font-extrabold text-primary">{plan.price}</p>
                <p className="text-xs text-muted-foreground -mt-3">{plan.sessionCount > 1 ? `${plan.sessionCount} encontros` : "consulta avulsa"}</p>
                <Button
                  asChild
                  variant={plan.popular ? "default" : "outline"}
                  className="rounded-full mt-auto"
                >
                  <Link to={`/agendar/${i}`}>Agendar agora</Link>
                </Button>
                <a
                  href={whatsappUrl(plan.whatsappMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-center text-primary hover:underline"
                >
                  Tirar dúvidas no WhatsApp →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-16 lg:py-20 bg-green-light">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <p className="text-sm font-bold uppercase tracking-widest text-primary mb-2">Metodologia</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Como funciona o acompanhamento
            </h2>
            <p className="mt-3 text-muted-foreground">
              A cada 21 dias ajustamos o protocolo. Resultados reais exigem continuidade.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {STEPS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 bg-card rounded-2xl border border-border p-5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{title}</p>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <TestimonialsSection />

      {/* CTA */}
      <CTASection />
    </PageLayout>
  );
};

export default ConsultasPage;
