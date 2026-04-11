import { Link, useLocation } from "react-router-dom";
import { Leaf, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContent } from "@/contexts/ContentContext";

const NotFound = () => {
  const location = useLocation();
  const { content } = useContent();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-light via-background to-gold-light flex items-center justify-center px-4">
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center max-w-md">
        {/* Brand mark */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto mb-6">
          <Leaf className="h-8 w-8 text-primary" />
        </div>

        {/* 404 */}
        <p className="text-primary font-bold text-sm uppercase tracking-widest mb-3">
          Erro 404
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground mb-4 leading-tight">
          Página não encontrada
        </h1>
        <p className="text-muted-foreground text-base mb-2 leading-relaxed">
          O endereço <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground/70">{location.pathname}</code> não existe.
        </p>
        <p className="text-muted-foreground text-sm mb-10">
          O link pode estar desatualizado ou a página foi removida.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-primary hover:bg-primary/90 gap-2">
            <Link to="/">
              <Home className="h-4 w-4" />
              Ir para o início
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary/5 gap-2">
            <button onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
          </Button>
        </div>

        {/* Brand footer */}
        <p className="text-muted-foreground/50 text-xs mt-12">
          {content.identity.brandName || "NutriVida"}
        </p>
      </div>
    </div>
  );
};

export default NotFound;
