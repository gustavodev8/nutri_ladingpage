import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  MessageCircle, CheckCircle2, CalendarCheck, ClipboardList, TrendingUp,
  Check, X, QrCode, CreditCard,
} from "lucide-react";
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

// Feature matrix por plano — índice alinhado com loja.plans do ContentContext
const PLAN_FEATURES: { label: string; included: boolean[] }[] = [
  { label: "Cardápio 100% personalizado",    included: [true,  true,  true,  true,  true]  },
  { label: "Avaliação de bioimpedância",      included: [false, true,  true,  true,  true]  },
  { label: "Consulta por videochamada",       included: [true,  false, true,  true,  true]  },
  { label: "Consulta presencial 1h",          included: [false, true,  true,  true,  true]  },
  { label: "Acesso ao grupo VIP",             included: [true,  true,  true,  true,  true]  },
  { label: "Treino com personal trainer",     included: [false, false, true,  true,  true]  },
  { label: "E-books gratuitos",               included: [false, false, true,  true,  true]  },
  { label: "Suporte de psicólogo",            included: [false, false, false, true,  true]  },
  { label: "Plataforma de cursos gratuita",   included: [false, false, false, false, true]  },
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

      {/* Planos — estilo Smart Fit */}
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

          {/* Separador — Consultas avulsas */}
          <div className="flex items-center gap-4 max-w-5xl mx-auto mb-6">
            <hr className="flex-1 border-border/50" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2 whitespace-nowrap">
              Consultas avulsas
            </span>
            <hr className="flex-1 border-border/50" />
          </div>

          {/* Linha 1 — Consultas avulsas (2 cards centralizados) */}
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto mb-6">
            {loja.plans.slice(0, 2).map((plan, i) => {
              const isDark = plan.popular;
              return (
                <div
                  key={i}
                  className={`relative rounded-2xl flex flex-col transition-all duration-300 hover:-translate-y-1 overflow-hidden
                    ${isDark
                      ? "bg-[#0f2318] text-white shadow-2xl shadow-primary/20"
                      : "bg-card border border-border/70 shadow-sm hover:shadow-md"
                    }`}
                >
                  {/* Badge no topo */}
                  {plan.badge && (
                    <div className={`px-6 pt-4 pb-0`}>
                      <span className={`inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full
                        ${isDark ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  {/* Corpo do card */}
                  <div className="p-6 flex flex-col flex-1 gap-5">
                    {/* Nome e descrição */}
                    <div>
                      <h3 className={`font-bold text-xl ${isDark ? "text-white" : "text-foreground"}`}>
                        {plan.name}
                      </h3>
                      <p className={`text-sm mt-1 leading-relaxed ${isDark ? "text-white/60" : "text-muted-foreground"}`}>
                        {plan.desc}
                      </p>
                    </div>

                    {/* Preço */}
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isDark ? "text-white/40" : "text-muted-foreground/70"}`}>
                        A PARTIR DE
                      </p>
                      <p className={`text-4xl font-extrabold leading-none ${isDark ? "text-white" : "text-foreground"}`}>
                        {plan.price}
                      </p>
                      <p className={`text-xs mt-1.5 ${isDark ? "text-white/50" : "text-muted-foreground"}`}>
                        {plan.sessionCount > 1 ? `${plan.sessionCount} encontros` : "consulta avulsa"}
                      </p>
                    </div>

                    {/* Botão */}
                    <Link
                      to={`/agendar/${i}`}
                      className={`w-full py-3 rounded-full text-sm font-bold text-center transition-all duration-200
                        ${isDark
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-foreground text-background hover:bg-foreground/90"
                        }`}
                    >
                      Contratar agora
                    </Link>

                    {/* Link WhatsApp */}
                    <a
                      href={whatsappUrl(plan.whatsappMessage)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-xs text-center -mt-2 hover:underline ${isDark ? "text-white/50 hover:text-white/80" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Tirar dúvidas no WhatsApp →
                    </a>

                    {/* Divisória */}
                    <hr className={isDark ? "border-white/10" : "border-border/60"} />

                    {/* Features */}
                    <ul className="flex flex-col gap-3">
                      {PLAN_FEATURES.map(({ label, included }) => {
                        const ok = included[i] ?? false;
                        return (
                          <li key={label} className="flex items-center gap-2.5">
                            {ok ? (
                              <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${isDark ? "bg-primary/20" : "bg-primary/10"}`}>
                                <Check className="w-3 h-3 text-primary" strokeWidth={3} />
                              </span>
                            ) : (
                              <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${isDark ? "bg-white/5" : "bg-muted"}`}>
                                <X className={`w-3 h-3 ${isDark ? "text-white/25" : "text-muted-foreground/40"}`} strokeWidth={3} />
                              </span>
                            )}
                            <span className={`text-sm leading-tight
                              ${!ok
                                ? isDark ? "text-white/25 line-through" : "text-muted-foreground/40 line-through"
                                : isDark ? "text-white/80" : "text-foreground/80"
                              }`}>
                              {label}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Separador visual */}
          <div className="flex items-center gap-4 max-w-5xl mx-auto my-2">
            <hr className="flex-1 border-border/50" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2 whitespace-nowrap">
              Pacotes com acompanhamento contínuo
            </span>
            <hr className="flex-1 border-border/50" />
          </div>

          {/* Linha 2 — Pacotes (3 cards) */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {loja.plans.slice(2).map((plan, j) => {
              const i = j + 2; // índice real no array de features
              const isDark = plan.popular;
              return (
                <div
                  key={i}
                  className={`relative rounded-2xl flex flex-col transition-all duration-300 hover:-translate-y-1 overflow-hidden
                    ${isDark
                      ? "bg-[#0f2318] text-white shadow-2xl shadow-primary/20"
                      : "bg-card border border-border/70 shadow-sm hover:shadow-md"
                    }`}
                >
                  {/* Badge no topo */}
                  {plan.badge && (
                    <div className="px-6 pt-4 pb-0">
                      <span className={`inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full
                        ${isDark ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  {/* Corpo do card */}
                  <div className="p-6 flex flex-col flex-1 gap-5">
                    <div>
                      <h3 className={`font-bold text-xl ${isDark ? "text-white" : "text-foreground"}`}>
                        {plan.name}
                      </h3>
                      <p className={`text-sm mt-1 leading-relaxed ${isDark ? "text-white/60" : "text-muted-foreground"}`}>
                        {plan.desc}
                      </p>
                    </div>

                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isDark ? "text-white/40" : "text-muted-foreground/70"}`}>
                        A PARTIR DE
                      </p>
                      <p className={`text-4xl font-extrabold leading-none ${isDark ? "text-white" : "text-foreground"}`}>
                        {plan.price}
                      </p>
                      <p className={`text-xs mt-1.5 ${isDark ? "text-white/50" : "text-muted-foreground"}`}>
                        {plan.sessionCount} encontros
                      </p>
                    </div>

                    <a
                      href={`/agendar/${i}`}
                      className={`w-full py-3 rounded-full text-sm font-bold text-center transition-all duration-200
                        ${isDark
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-foreground text-background hover:bg-foreground/90"
                        }`}
                    >
                      Contratar agora
                    </a>

                    <a
                      href={whatsappUrl(plan.whatsappMessage)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-xs text-center -mt-2 hover:underline ${isDark ? "text-white/50 hover:text-white/80" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Tirar dúvidas no WhatsApp →
                    </a>

                    <hr className={isDark ? "border-white/10" : "border-border/60"} />

                    <ul className="flex flex-col gap-3">
                      {PLAN_FEATURES.map(({ label, included }) => {
                        const ok = included[i] ?? false;
                        return (
                          <li key={label} className="flex items-center gap-2.5">
                            {ok ? (
                              <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${isDark ? "bg-primary/20" : "bg-primary/10"}`}>
                                <Check className="w-3 h-3 text-primary" strokeWidth={3} />
                              </span>
                            ) : (
                              <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${isDark ? "bg-white/5" : "bg-muted"}`}>
                                <X className={`w-3 h-3 ${isDark ? "text-white/25" : "text-muted-foreground/40"}`} strokeWidth={3} />
                              </span>
                            )}
                            <span className={`text-sm leading-tight
                              ${!ok
                                ? isDark ? "text-white/25 line-through" : "text-muted-foreground/40 line-through"
                                : isDark ? "text-white/80" : "text-foreground/80"
                              }`}>
                              {label}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Formas de pagamento */}
          <div className="flex flex-wrap justify-center gap-6 mt-10 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-primary" /> Pix
            </span>
            <span className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" /> Cartão de crédito/débito
            </span>
            <span className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" /> Link de pagamento
            </span>
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
