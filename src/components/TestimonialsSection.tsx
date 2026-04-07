import { useState } from "react";
import { X } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useContent } from "@/contexts/ContentContext";

const TestimonialsSection = () => {
  const { ref, isVisible, hiddenClass } = useScrollAnimation();
  const { content } = useContent();
  const { testimonials } = content;
  const [lightbox, setLightbox] = useState<string | null>(null);

  const filled = testimonials.items.filter((item) => item.imageUrl);

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
          <div className="columns-2 md:columns-3 gap-3 md:gap-4 max-w-4xl mx-auto">
            {filled.map((item, i) => (
              <div
                key={i}
                className="break-inside-avoid mb-3 md:mb-4 rounded-2xl overflow-hidden border border-border/50 cursor-zoom-in shadow-sm hover:shadow-md transition-shadow"
                onClick={() => setLightbox(item.imageUrl)}
              >
                <img
                  src={item.imageUrl}
                  alt={`Depoimento ${i + 1}`}
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
              </div>
            ))}
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
