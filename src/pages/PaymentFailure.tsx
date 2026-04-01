import { Link } from "react-router-dom";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContent } from "@/contexts/ContentContext";

const PaymentFailure = () => {
  const { content } = useContent();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <XCircle className="h-10 w-10 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold text-foreground">Pagamento não aprovado</h1>
          <p className="text-muted-foreground text-lg">
            Ocorreu um problema com o seu pagamento. Tente novamente com outro método de pagamento.
          </p>
        </div>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button asChild className="rounded-full gap-2">
            <Link to="/">
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full gap-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao início
            </Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{content.identity.brandName}</p>
      </div>
    </div>
  );
};
export default PaymentFailure;
