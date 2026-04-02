import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import ResultsSection from "@/components/ResultsSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import CTASection from "@/components/CTASection";

const STATS = [
  { value: "7.000+", label: "pacientes transformados" },
  { value: "10+", label: "anos de experiência" },
  { value: "7", label: "países atendidos" },
  { value: "4", label: "pós-graduações" },
];

const ResultadosPage = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return (
    <PageLayout>
      {/* Hero */}
      <section className="bg-green-light py-16 lg:py-24">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-widest text-primary mb-3">Resultados</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground leading-tight">
            Histórias reais de{" "}
            <span className="text-primary">transformação</span>
          </h1>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
            Mais de 7.000 pessoas em 7 países já transformaram sua saúde com o Dr. Fillipe David.
            Veja os resultados de quem confiou no método.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />Resultados documentados
            </span>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />Pacientes reais
            </span>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />Sem dietas genéricas
            </span>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-10 bg-background border-b border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto text-center">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <p className="text-3xl font-extrabold text-primary">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Antes e depois */}
      <ResultsSection />

      {/* Depoimentos */}
      <TestimonialsSection />

      {/* CTA */}
      <CTASection />
    </PageLayout>
  );
};

export default ResultadosPage;
