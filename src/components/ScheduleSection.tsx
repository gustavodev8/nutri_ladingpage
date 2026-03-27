import { Clock } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useContent } from "@/contexts/ContentContext";

const ScheduleSection = () => {
  const { ref, isVisible, hiddenClass } = useScrollAnimation();
  const { content } = useContent();
  const { schedule } = content;

  return (
    <section id="horarios" className="py-20 lg:py-28 bg-card">
      <div
        ref={ref}
        className={`container mx-auto px-4 transition-[opacity,transform] duration-700 ease-smooth ${
          isVisible ? "opacity-100 translate-y-0" : hiddenClass
        }`}
      >
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-16 space-y-3 md:space-y-4">
          <span className="text-accent font-semibold text-sm uppercase tracking-widest">
            Horários
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            {schedule.title}
          </h2>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="rounded-3xl bg-background border border-border overflow-hidden">
            <div className="p-6 bg-primary/5 border-b border-border flex items-center gap-3">
              <Clock className="h-6 w-6 text-primary" />
              <span className="font-bold text-foreground">Agenda Semanal</span>
            </div>
            <div className="divide-y divide-border">
              {schedule.days.map(({ day, hours, open }) => (
                <div
                  key={day}
                  className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 hover:bg-muted/30 transition-colors"
                >
                  <span className="text-sm md:text-base font-medium text-foreground">{day}</span>
                  <span
                    className={`text-xs md:text-sm font-medium shrink-0 ml-2 ${
                      open ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {hours}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ScheduleSection;
