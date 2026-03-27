import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useContent } from "@/contexts/ContentContext";

const CTASection = () => {
  const { ref, isVisible, hiddenClass } = useScrollAnimation();
  const { content, whatsappUrl } = useContent();
  const { cta } = content;

  return (
    <section className="py-20 lg:py-28 bg-green-dark relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      <div
        ref={ref}
        className={`container mx-auto px-4 relative z-10 text-center transition-[opacity,transform] duration-600 ease-smooth ${
          isVisible ? "opacity-100 translate-y-0" : hiddenClass
        }`}
      >
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground">
            {cta.title}
          </h2>
          <p className="text-primary-foreground/80 text-lg">{cta.subtitle}</p>
          <Button
            asChild
            size="lg"
            className="bg-accent text-accent-foreground hover:bg-accent/90 text-lg px-10 py-7 shadow-xl"
          >
            <a
              href={whatsappUrl(cta.whatsappMessage)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="mr-2 h-6 w-6" />
              {cta.buttonText}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
