import { useEffect } from "react";
import { CheckCircle2, Users, Clock, Globe, GraduationCap } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import ResultsSection from "@/components/ResultsSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import CTASection from "@/components/CTASection";
import { useContent } from "@/contexts/ContentContext";

const STAT_ICONS = [Users, Clock, Globe, GraduationCap];

const TRUST_BADGES = [
  "Resultados documentados",
  "Pacientes reais",
  "Sem dietas genéricas",
];

const ResultadosPage = () => {
  const { content } = useContent();
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

      {/* ── CTA ── */}
      <CTASection />

    </PageLayout>
  );
};

export default ResultadosPage;
