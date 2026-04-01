import { Link } from "react-router-dom";
import { CheckCircle2, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContent } from "@/contexts/ContentContext";

const PaymentSuccess = () => {
  const { content } = useContent();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold text-foreground">Pagamento aprovado!</h1>
          <p className="text-muted-foreground text-lg">
            Seu e-book foi enviado para o seu email. Verifique sua caixa de entrada (e spam).
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-primary bg-primary/5 rounded-2xl px-6 py-4">
          <Mail className="h-4 w-4 shrink-0" />
          <span>Confira seu email — o PDF chegará em instantes.</span>
        </div>
        <Button asChild variant="outline" className="rounded-full gap-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Voltar à página inicial
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          {content.identity.brandName} · Entrega digital imediata
        </p>
      </div>
    </div>
  );
};
export default PaymentSuccess;
