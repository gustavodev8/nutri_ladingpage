import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useContent } from "@/contexts/ContentContext";

const FAQSection = () => {
  const { ref, isVisible, hiddenClass } = useScrollAnimation();
  const { content } = useContent();
  const { faq } = content;

  return (
    <section id="faq" className="py-20 lg:py-28 bg-card">
      <div
        ref={ref}
        className={`container mx-auto px-4 transition-[opacity,transform] duration-700 ease-smooth ${
          isVisible ? "opacity-100 translate-y-0" : hiddenClass
        }`}
      >
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-16 space-y-3 md:space-y-4">
          <span className="text-accent font-semibold text-sm uppercase tracking-widest">FAQ</span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            {faq.title}
          </h2>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3">
            {faq.items.map(({ q, a }, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border rounded-2xl px-4 md:px-6 bg-background border-border/50"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                  {q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
