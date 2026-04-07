import { ArrowRight, Quote } from "lucide-react";
import { Link } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useContent } from "@/contexts/ContentContext";

const ResultsTeaser = () => {
  const { content } = useContent();
  const { about, resultados } = content;
  const { ref, isVisible, hiddenClass } = useScrollAnimation();

  const previews = resultados.items.slice(0, 3);
  const extraCount = resultados.items.length - previews.length;

  return (
    <section className="relative overflow-hidden bg-[#1c3a28]">

      {/* Dot texture */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "28px 28px",
        }}
      />
      <div className="absolute top-0 inset-x-0 h-px bg-white/10" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-white/10" />

      <div
        ref={ref}
        className={`relative z-10 container mx-auto px-5 md:px-8 py-14 md:py-20 transition-[opacity,transform] duration-700 ease-smooth ${
          isVisible ? "opacity-100 translate-y-0" : hiddenClass
        }`}
      >

        {/* ── Stats: 2×2 grid no mobile, linha única no desktop ── */}
        <div className="grid grid-cols-2 md:flex md:flex-wrap md:justify-center gap-6 md:gap-x-12 md:gap-y-4 mb-12 md:mb-14 max-w-sm md:max-w-none mx-auto">
          {about.stats.map((stat, i) => (
            <div key={i} className="flex flex-col items-start md:items-center gap-0.5">
              <span className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-none">
                {stat.value}
              </span>
              <span className="text-[11px] md:text-sm text-white/45 font-medium leading-snug">
                {stat.label.toLowerCase()}
              </span>
            </div>
          ))}
        </div>

        {/* Divisor sutil */}
        <div className="h-px bg-white/10 mb-12 md:mb-14 max-w-xs md:max-w-2xl mx-auto" />

        {/* ── Conteúdo principal ── */}
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-start max-w-5xl mx-auto">

          {/* Esquerda: headline + CTA */}
          <div className="flex flex-col">
            <p className="text-amber-400/80 text-[11px] font-bold uppercase tracking-widest mb-3">
              Resultados reais
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white leading-snug mb-4">
              Eles confiaram no método.{" "}
              <em className="not-italic italic text-amber-400">
                Veja o que alcançaram.
              </em>
            </h2>
            <p className="text-white/55 text-sm md:text-base leading-relaxed mb-8">
              Cada resultado foi construído com protocolo individualizado —
              sem dietas genéricas, do emagrecimento à performance esportiva.
            </p>
            <div>
              <Link
                to="/resultados"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-amber-400 hover:bg-amber-300 active:scale-95 text-[#1c3a28] font-bold text-sm transition-all duration-200 shadow-lg shadow-amber-900/30"
              >
                Ver todos os resultados
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Direita: cards de depoimentos */}
          <div className="flex flex-col gap-3">
            {previews.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.06] border border-white/10 active:bg-white/10 transition-colors"
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-amber-400/15 border border-amber-400/25 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-amber-300 leading-none">
                    {item.initials.split(".")[0]}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  {/* Topo: nome + tempo */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-white/80">{item.initials}</span>
                    <span className="text-[10px] text-amber-400/60 font-semibold shrink-0 tabular-nums">
                      {item.time}
                    </span>
                  </div>
                  {/* Texto truncado */}
                  <p className="text-[11px] md:text-xs text-white/50 leading-relaxed line-clamp-2">
                    <Quote className="h-2.5 w-2.5 inline mr-1 -mt-0.5 text-amber-400/30" />
                    {item.text}
                  </p>
                </div>
              </div>
            ))}

            {/* Ver mais */}
            {extraCount > 0 && (
              <Link
                to="/resultados"
                className="flex items-center justify-center gap-1.5 py-2 text-xs text-white/30 hover:text-white/60 active:text-white/80 transition-colors"
              >
                + {extraCount} histórias
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResultsTeaser;
