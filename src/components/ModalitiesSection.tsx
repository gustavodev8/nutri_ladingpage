import { Globe, MapPin, Video, Mail, Monitor } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useContent } from "@/contexts/ContentContext";

const ModalitiesSection = () => {
  const { ref, isVisible, hiddenClass } = useScrollAnimation();
  const { content } = useContent();
  const { contact, modalities } = content;

  const fullAddress = `${contact.address} — ${contact.neighborhood}, ${contact.city}`;

  return (
    <section id="atendimento" className="py-20 lg:py-28 bg-card">
      <div ref={ref} className="container mx-auto px-4">
        <div
          className={`text-center max-w-2xl mx-auto mb-10 md:mb-16 space-y-3 md:space-y-4 transition-[opacity,transform] duration-700 ease-smooth ${
            isVisible ? "opacity-100 translate-y-0" : hiddenClass
          }`}
        >
          <span className="text-accent font-semibold text-sm uppercase tracking-widest">
            Atendimento
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            {modalities.sectionTitle}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Online */}
          <div
            className={`rounded-3xl bg-gradient-to-br from-primary/5 to-primary/10 p-8 lg:p-10 space-y-6 border border-primary/10 transition-[opacity,transform] duration-700 ease-smooth ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
            style={{ transitionDelay: isVisible ? "100ms" : "0ms" }}
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center">
              <Globe className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-display text-2xl font-bold text-foreground">
              {modalities.onlineTitle}
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {modalities.onlineDesc}
            </p>
            <ul className="space-y-3">
              {[
                { icon: Monitor, text: "Via Google Meet ou Zoom" },
                { icon: Mail, text: "Plano alimentar enviado por e-mail" },
                { icon: Video, text: "Consulta por videochamada" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-foreground">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Presencial */}
          <div
            className={`rounded-3xl bg-gradient-to-br from-accent/5 to-accent/10 p-8 lg:p-10 space-y-6 border border-accent/10 transition-[opacity,transform] duration-700 ease-smooth ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
            style={{ transitionDelay: isVisible ? "250ms" : "0ms" }}
          >
            <div className="w-16 h-16 rounded-2xl bg-accent/15 flex items-center justify-center">
              <MapPin className="h-8 w-8 text-accent" />
            </div>
            <h3 className="font-display text-2xl font-bold text-foreground">
              {modalities.presentialTitle}
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {modalities.presentialDesc}
            </p>
            <div className="space-y-3">
              <p className="text-sm text-foreground font-medium">📍 {fullAddress}</p>
              {modalities.mapsEmbedUrl && (
                <div className="rounded-2xl overflow-hidden border border-border">
                  <iframe
                    src={modalities.mapsEmbedUrl}
                    width="100%"
                    height="200"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Localização do consultório"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ModalitiesSection;
