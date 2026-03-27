import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { User } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useContent } from "@/contexts/ContentContext";

const ResultsSection = () => {
  const { content, whatsappUrl } = useContent();
  const { resultados } = content;
  const { ref, isVisible, hiddenClass } = useScrollAnimation();

  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  return (
    <section id="resultados" className="py-20 bg-green-light">
      <div
        ref={ref}
        className={`container mx-auto px-4 transition-[opacity,transform] duration-700 ease-smooth ${
          isVisible ? "opacity-100 translate-y-0" : hiddenClass
        }`}
      >
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-sm font-bold uppercase tracking-widest text-primary mb-2">
            Resultados
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            {resultados.sectionTitle}
          </h2>
          {resultados.sectionSubtitle && (
            <p className="mt-3 text-muted-foreground">{resultados.sectionSubtitle}</p>
          )}
        </div>

        {/* Carousel */}
        <div className="relative max-w-xl mx-auto">
          <Carousel
            setApi={setApi}
            opts={{ align: "center", loop: true }}
            className="w-full"
          >
            <CarouselContent>
              {resultados.items.map((item, i) => (
                <CarouselItem key={i}>
                  <Card className="border-border/50 shadow-md">
                    <CardContent className="p-5 flex flex-col gap-4">
                      {/* Before / After */}
                      <div className="flex gap-2 h-[360px]">
                        <div className="flex-1 rounded-xl overflow-hidden bg-muted flex items-center justify-center relative">
                          {item.beforeImageUrl ? (
                            <img src={item.beforeImageUrl} alt="Antes" className="w-full h-full object-cover object-top" />
                          ) : (
                            <User className="h-12 w-12 text-muted-foreground/30" />
                          )}
                          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-semibold bg-background/80 px-2 py-0.5 rounded-full text-muted-foreground">Antes</span>
                        </div>
                        <div className="w-px bg-border/60" />
                        <div className="flex-1 rounded-xl overflow-hidden bg-primary/10 flex items-center justify-center relative">
                          {item.afterImageUrl ? (
                            <img src={item.afterImageUrl} alt="Depois" className="w-full h-full object-cover object-top" />
                          ) : (
                            <User className="h-12 w-12 text-primary/30" />
                          )}
                          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-semibold bg-background/80 px-2 py-0.5 rounded-full text-primary/70">Depois</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="font-bold text-foreground text-lg">{item.initials}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                        <p className="text-xs text-primary font-semibold pt-1">
                          ⏱ {item.time} de acompanhamento
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>

            <CarouselPrevious className="left-1 md:-left-12" />
            <CarouselNext className="right-1 md:-right-12" />
          </Carousel>

          {/* Dot indicators */}
          {count > 1 && (
            <div className="flex justify-center gap-1.5 mt-6">
              {Array.from({ length: count }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => api?.scrollTo(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === current
                      ? "w-6 h-2 bg-primary"
                      : "w-2 h-2 bg-primary/30 hover:bg-primary/50"
                  }`}
                  aria-label={`Ir para slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {resultados.disclaimer && (
          <p className="text-center text-xs text-muted-foreground mt-8">
            {resultados.disclaimer}
          </p>
        )}

        <div className="text-center mt-6">
          <Button asChild size="lg" className="rounded-full px-8">
            <a
              href={whatsappUrl(resultados.whatsappMessage)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {resultados.ctaText}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ResultsSection;
