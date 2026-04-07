import { useState, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import { useContent } from "@/contexts/ContentContext";

const MESSAGES = [
  "Preciso mudar de vida já 💪",
  "Quero emagrecer de verdade!",
  "Me ajuda a transformar meu corpo?",
  "Quero marcar uma consulta agora!",
];

const WhatsAppButton = () => {
  const { whatsappUrl } = useContent();
  const [bubbleIndex, setBubbleIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  /* Aparece 3s após carregar */
  useEffect(() => {
    if (dismissed) return;
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, [dismissed]);

  /* Cicla mensagens: 5s visível → 1.2s pausa → próxima */
  useEffect(() => {
    if (dismissed || !visible) return;
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setBubbleIndex((i) => (i + 1) % MESSAGES.length);
        setVisible(true);
      }, 1200);
    }, 5000);
    return () => clearTimeout(t);
  }, [visible, bubbleIndex, dismissed]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">

      {/* Speech bubble */}
      {!dismissed && (
        <div
          className={`relative bg-white rounded-2xl rounded-br-sm shadow-xl px-3.5 py-2.5 max-w-[200px] border border-border/40 transition-all duration-500 ${
            visible
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 translate-y-3 scale-95 pointer-events-none"
          }`}
        >
          <p className="text-[13px] font-semibold text-gray-800 leading-snug pr-5">
            {MESSAGES[bubbleIndex]}
          </p>
          <button
            onClick={(e) => { e.preventDefault(); setDismissed(true); setVisible(false); }}
            className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
            aria-label="Fechar"
          >
            <X className="h-2.5 w-2.5" />
          </button>
          {/* Bubble tail */}
          <span className="absolute -bottom-[6px] right-5 w-3 h-3 bg-white border-r border-b border-border/40 rotate-45" />
        </div>
      )}

      {/* WhatsApp FAB */}
      <a
        href={whatsappUrl("Preciso mudar de vida já! Quero saber mais sobre as consultas.")}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Fale conosco pelo WhatsApp"
        className="relative w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-transform"
      >
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-25" />
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-15" style={{ animationDelay: "0.6s" }} />
        <MessageCircle className="h-7 w-7 text-white relative z-10" />
      </a>
    </div>
  );
};

export default WhatsAppButton;
