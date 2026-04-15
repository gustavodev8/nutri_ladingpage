import { Wrench, ArrowLeft, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useContent } from "@/contexts/ContentContext";

const ClientGate = () => {
  const { content } = useContent();
  const { identity } = content;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50">
        <div className="container mx-auto px-4 h-14 flex items-center">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <Wrench className="h-7 w-7 text-amber-500" />
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold text-foreground">Em breve</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Esta página está sendo preparada e em breve estará disponível para agendamentos.
            </p>
          </div>

          <div className="h-px bg-border" />

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enquanto isso, entre em contato para agendar sua consulta:
            </p>
            <Button asChild className="rounded-full gap-2 w-full">
              <a
                href={`https://wa.me/${identity.whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4" />
                Falar pelo WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" className="rounded-full w-full">
              <Link to="/">Voltar ao início</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientGate;
