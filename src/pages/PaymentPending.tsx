import { Link } from "react-router-dom";
import { Clock, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContent } from "@/contexts/ContentContext";

const PaymentPending = () => {
  const { content } = useContent();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto">
          <Clock className="h-10 w-10 text-yellow-600" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold text-foreground">Pagamento pendente</h1>
          <p className="text-muted-foreground text-lg">
            Seu pagamento está sendo processado. Assim que aprovado, enviaremos o e-book para o seu email.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-yellow-700 bg-yellow-50 rounded-2xl px-6 py-4">
          <Mail className="h-4 w-4 shrink-0" />
          <span>O PDF será enviado automaticamente após a aprovação.</span>
        </div>
        <Button asChild variant="outline" className="rounded-full gap-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Voltar à página inicial
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">{content.identity.brandName}</p>
      </div>
    </div>
  );
};
export default PaymentPending;
