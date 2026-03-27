import { MessageCircle } from "lucide-react";
import { useContent } from "@/contexts/ContentContext";

const WhatsAppButton = () => {
  const { whatsappUrl } = useContent();

  return (
    <a
      href={whatsappUrl("Olá! Gostaria de agendar uma consulta.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Fale conosco pelo WhatsApp"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
    >
      <MessageCircle className="h-7 w-7 text-white" />
    </a>
  );
};

export default WhatsAppButton;
