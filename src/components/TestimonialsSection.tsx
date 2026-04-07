import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useContent } from "@/contexts/ContentContext";

const TestimonialsSection = () => {
  const { ref, isVisible, hiddenClass } = useScrollAnimation();
  const { content } = useContent();
  const { testimonials } = content;
  const [current, setCurrent] = useState(0);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const filled = testimonials.items.filter((item) => item.imageUrl);
  const total = filled.length;

  const next = useCallback(() => {
    setCurrent((i) => (i + 1) % total);
  }, [total]);

  const prev = () => setCurrent((i) => (i - 1 + total) % total);

  // Auto-advance every 5s, pause when lightbox is open
  useEffect(() => {
    if (total <= 1 || lightbox) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [total, lightbox, next]);

  return (
    <section id="depoimentos" className="py-20 lg:py-28">
      <div
        ref={ref}
        className={`container mx-auto px-4 transition-[opacity,transform] duration-700 ease-smooth ${
          isVisible ? "opacity-100 translate-y-0" : hiddenClass
        }`}
      >
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-16 space-y-3 md:space-y-4">
          <span className="text-accent font-semibold text-sm uppercase tracking-widest">
            Depoimentos
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            {testimonials.title}
          </h2>
        </div>

        {filled.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm">
            Nenhum depoimento adicionado ainda.
          </p>
        ) : (
          <div className="relative max-w-sm mx-auto select-none">
            {/* Slide */}
            <div
              className="rounded-2xl overflow-hidden border border-border/50 shadow-md cursor-zoom-in"
              onClick={() => setLightbox(filled[current].imageUrl)}
            >
              <img
                key={current}
                src={filled[current].imageUrl}
                alt={`Depoimento ${current + 1}`}
                className="w-full h-auto object-cover animate-fade-in"
                loading="lazy"
              />
            </div>

            {/* Arrows */}
            {total > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-[-20px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card border border-border shadow-sm flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="h-5 w-5 text-foreground" />
                </button>
                <button
                  onClick={next}
                  className="absolute right-[-20px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card border border-border shadow-sm flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label="Próximo"
                >
                  <ChevronRight className="h-5 w-5 text-foreground" />
                </button>
              </>
            )}

            {/* Dots */}
            {total > 1 && (
              <div className="flex justify-center gap-1.5 mt-5">
                {filled.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`rounded-full transition-all duration-300 ${
                      i === current
                        ? "w-5 h-2 bg-primary"
                        : "w-2 h-2 bg-border hover:bg-primary/40"
                    }`}
                    aria-label={`Ir para depoimento ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightbox}
            alt="Depoimento"
            className="max-h-[90vh] max-w-full rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
};

export default TestimonialsSection;
