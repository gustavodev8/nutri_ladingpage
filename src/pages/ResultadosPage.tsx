import { useEffect } from "react";
import { CheckCircle2, Users, Clock, Globe, GraduationCap, ArrowRight, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import ResultsSection from "@/components/ResultsSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import { useContent } from "@/contexts/ContentContext";

const STAT_ICONS = [Users, Clock, Globe, GraduationCap];

const TRUST_BADGES = [
  "Resultados documentados",
  "Pacientes reais",
  "Sem dietas genéricas",
];

const ResultadosPage = () => {
  const { content, whatsappUrl } = useContent();
  const { about } = content;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return (
    <PageLayout>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[#1c3a28] min-h-[400px] md:min-h-[480px] flex items-center">

        {/* Background photo */}
        {about.photoUrl && (
          <div
            className="absolute inset-0 bg-cover bg-[center_top] md:bg-right-top"
            style={{ backgroundImage: `url(${about.photoUrl})` }}
          />
        )}

        {/* Layer 1 — base escuro uniforme: garante que nenhuma área branca da foto apareça */}
        <div className="absolute inset-0 bg-[#1c3a28]/55" />

        {/* Layer 2 — gradiente direcional: reforça legibilidade do texto à esquerda */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#1c3a28]/70 via-[#1c3a28]/30 to-transparent" />

        {/* Layer 3 — fade inferior para transição suave com a seção de stats */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#1c3a28]/40 to-transparent" />

        {/* Content */}
        <div className="relative z-10 w-full container mx-auto px-6 md:px-10 py-16 md:py-24">
          <div className="max-w-xl">

            {/* Badge */}
            <span className="inline-flex items-center px-3 py-1 rounded-full border border-amber-400/40 bg-amber-400/10 text-amber-300 text-[11px] font-bold uppercase tracking-widest mb-5">
              Resultados
            </span>

            {/* Heading */}
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-tight mb-5">
              Histórias reais de{" "}
              <em className="not-italic italic text-amber-400">transformação</em>
            </h1>

            {/* Subtitle */}
            <p className="text-white/70 text-base leading-relaxed mb-8">
              Mais de 7.000 pessoas em 7 países já transformaram sua saúde com
              o Dr. Fillipe David. Veja os resultados de quem confiou no método.
            </p>

            {/* Trust badges */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-x-5 gap-y-2.5">
              {TRUST_BADGES.map((badge) => (
                <span key={badge} className="flex items-center gap-2 text-sm text-white/75 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                  {badge}
                </span>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="bg-white border-b border-border/60 shadow-sm">
        <div className="container mx-auto px-6 md:px-10 py-10 md:py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-4 max-w-3xl mx-auto">
            {about.stats.map((stat, i) => {
              const Icon = STAT_ICONS[i] ?? Users;
              return (
                <div key={i} className="flex flex-col items-center text-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
                    <Icon className="h-5 w-5 text-foreground/50" />
                  </div>
                  <div>
                    <p className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight leading-none">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-snug px-1">
                      {stat.label.toLowerCase()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Antes e Depois ── */}
      <ResultsSection />

      {/* ── Depoimentos ── */}
      <TestimonialsSection />

      {/* ── CTA exclusivo da página de resultados ── */}
      <section className="bg-green-dark py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl" />

        <div className="relative z-10 container mx-auto px-6 md:px-10 max-w-2xl text-center space-y-8">

          {/* Eyebrow */}
          <p className="text-xs font-bold uppercase tracking-widest text-primary-foreground/50">
            Comece agora
          </p>

          {/* Headline */}
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground leading-tight">
            O seu resultado começa com uma única decisão
          </h2>

          {/* Divider */}
          <div className="flex items-center justify-center gap-2">
            <span className="w-8 h-px bg-primary-foreground/20" />
            <span className="w-2 h-px bg-primary-foreground/10" />
          </div>

          {/* Body */}
          <p className="text-primary-foreground/65 text-base md:text-lg leading-relaxed">
            Mais de 7.000 pessoas em 7 países já mudaram sua saúde com o método de Fillipe David. Escolha o plano ideal e agende sua consulta.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/consultas"
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary-foreground text-primary font-semibold text-sm hover:bg-primary-foreground/90 transition-colors duration-200"
            >
              Ver planos e consultas
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-200" />
            </Link>
            <a
              href={whatsappUrl("Olá, vim pela página de resultados e quero saber mais!")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-xl border border-primary-foreground/20 text-primary-foreground/70 text-sm font-medium hover:border-primary-foreground/40 hover:text-primary-foreground transition-colors duration-200"
            >
              <MessageCircle className="h-4 w-4" />
              Tirar dúvidas pelo WhatsApp
            </a>
          </div>

        </div>
      </section>

    </PageLayout>
  );
};

export default ResultadosPage;
