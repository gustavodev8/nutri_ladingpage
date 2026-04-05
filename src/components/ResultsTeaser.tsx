import { ArrowRight, Quote } from "lucide-react";
import { Link } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useContent } from "@/contexts/ContentContext";

const ResultsTeaser = () => {
  const { content } = useContent();
  const { about, resultados } = content;
  const { ref, isVisible, hiddenClass } = useScrollAnimation();

  // Pega os 3 primeiros depoimentos para preview
  const previews = resultados.items.slice(0, 3);

  return (
    <section className="relative overflow-hidden bg-[#1c3a28]">
      {/* Subtle background texture */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />
      {/* Top/bottom fade */}
      <div className="absolute top-0 left-0 right-0 h-px bg-white/10" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10" />

      <div
        ref={ref}
        className={`relative z-10 container mx-auto px-5 md:px-8 py-16 md:py-20 transition-[opacity,transform] duration-700 ease-smooth ${
          isVisible ? "opacity-100 translate-y-0" : hiddenClass
        }`}
      >
        {/* ── Stats row ── */}
        <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 mb-14">
          {about.stats.map((stat, i) => (
            <div key={i} className="flex items-baseline gap-2">
              <span className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                {stat.value}
              </span>
              <span className="text-sm text-white/50 font-medium">
                {stat.label.toLowerCase()}
              </span>
            </div>
          ))}
        </div>

        {/* ── Main content: headline + cards ── */}
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center max-w-5xl mx-auto">

          {/* Left — headline + CTA */}
          <div>
            <p className="text-amber-400/80 text-xs font-bold uppercase tracking-widest mb-3">
              Resultados reais
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white leading-snug mb-5">
              Eles confiaram no método.{" "}
              <em className="not-italic italic text-amber-400">
                Veja o que alcançaram.
              </em>
            </h2>
            <p className="text-white/60 text-sm md:text-base leading-relaxed mb-8">
              Cada resultado foi construído com protocolo individualizado, sem
              dietas genéricas — do emagrecimento à performance esportiva.
            </p>
            <Link
              to="/resultados"
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-amber-400 hover:bg-amber-300 text-[#1c3a28] font-bold text-sm transition-all duration-200 shadow-lg shadow-amber-400/20 hover:shadow-amber-400/40 hover:gap-3.5"
            >
              Ver todos os resultados
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Right — testimonial cards */}
          <div className="flex flex-col gap-3">
            {previews.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20 transition-all duration-200"
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-amber-300">
                    {item.initials.split(".")[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-white/80">{item.initials}</span>
                    <span className="text-[10px] text-amber-400/70 font-medium shrink-0">
                      {item.time}
                    </span>
                  </div>
                  <p className="text-xs text-white/55 leading-relaxed line-clamp-2">
                    <Quote className="h-2.5 w-2.5 inline mr-1 text-amber-400/40" />
                    {item.text}
                  </p>
                </div>
              </div>
            ))}

            {/* "Ver mais" hint */}
            <Link
              to="/resultados"
              className="text-center text-xs text-white/30 hover:text-white/60 transition-colors py-1"
            >
              +{resultados.items.length - 3} histórias no total →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResultsTeaser;
