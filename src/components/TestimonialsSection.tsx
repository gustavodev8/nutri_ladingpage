import { Star, UserCircle } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useContent } from "@/contexts/ContentContext";

const TestimonialsSection = () => {
  const { ref, isVisible, hiddenClass } = useScrollAnimation();
  const { content } = useContent();
  const { testimonials } = content;

  return (
    <section id="depoimentos" className="py-20 lg:py-28">
      <div
        ref={ref}
        className={`container mx-auto px-4 transition-[opacity,transform] duration-700 ease-smooth ${
          isVisible ? "opacity-100 translate-y-0" : hiddenClass
        }`}
      >
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-16 space-y-3 md:space-y-4">
          <span className="text-accent font-semibold text-sm uppercase tracking-widest">
            Depoimentos
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            {testimonials.title}
          </h2>
        </div>

        {/* Carousel */}
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <Carousel opts={{ loop: true }}>
            <CarouselContent>
              {testimonials.items.map(({ name, initials, text, photoUrl }, i) => (
                <CarouselItem key={i} className="md:basis-1/2 lg:basis-1/3">
                  <div className="flex flex-col rounded-2xl overflow-hidden border border-border bg-card">

                    {/* Photo 4:3 */}
                    <div className="aspect-[4/3] bg-muted w-full overflow-hidden">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-primary/5">
                          <UserCircle className="h-12 w-12 text-primary/20" />
                          <span className="text-xs text-muted-foreground/50">Foto do paciente</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-3 flex flex-col flex-1">
                      {/* Stars */}
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, j) => (
                          <Star key={j} className="h-3.5 w-3.5 fill-accent text-accent" />
                        ))}
                      </div>

                      {/* Quote */}
                      <p className="text-muted-foreground text-sm leading-relaxed italic flex-1">
                        "{text}"
                      </p>

                      {/* Name */}
                      <p className="font-semibold text-foreground text-sm pt-1">{name}</p>
                    </div>

                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
