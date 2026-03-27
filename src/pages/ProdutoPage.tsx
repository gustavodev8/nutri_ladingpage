import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, MessageCircle, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useContent } from "@/contexts/ContentContext";

const ProdutoPage = () => {
  const { id } = useParams<{ id: string }>();
  const { content, whatsappUrl } = useContent();
  const { produtosDigitais, identity } = content;

  const index = Number(id);
  const produto = produtosDigitais.items[index];

  if (!produto) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <span className="font-display font-bold text-primary text-sm truncate">
            {identity.brandName}
          </span>
          <Button asChild size="sm" className="rounded-full gap-2 hidden sm:flex">
            <a href={whatsappUrl(produto.whatsappMessage)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" />
              Comprar agora
            </a>
          </Button>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 py-12 md:py-20">
        <div className="container mx-auto px-4 max-w-5xl">

          {/* Grade: imagem + info */}
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">

            {/* Imagem */}
            <div className="aspect-[4/3] rounded-2xl lg:rounded-3xl overflow-hidden bg-gradient-to-br from-secondary/40 to-green-light shadow-lg flex items-center justify-center">
              {produto.imageUrl ? (
                <img
                  src={produto.imageUrl}
                  alt={produto.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-4 p-10 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-10 w-10 text-primary/50" />
                  </div>
                  <span className="text-muted-foreground text-sm">Imagem do produto</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-6">
              {produto.badge && (
                <Badge className="bg-gold text-foreground border-gold/30 px-3 py-1 text-xs font-semibold">
                  {produto.badge}
                </Badge>
              )}

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-primary">
                  Produto Digital
                </p>
                <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground leading-tight">
                  {produto.name}
                </h1>
              </div>

              {/* Descrição curta */}
              <p className="text-muted-foreground leading-relaxed text-base">
                {produto.desc}
              </p>

              {/* Preço + botão */}
              <div className="pt-2 border-t border-border/50 space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-primary">{produto.price}</span>
                  <span className="text-sm text-muted-foreground">pagamento único</span>
                </div>
                <Button asChild size="lg" className="rounded-full gap-2 w-full sm:w-auto">
                  <a
                    href={whatsappUrl(produto.whatsappMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="h-5 w-5" />
                    Comprar pelo WhatsApp
                  </a>
                </Button>
                <p className="text-xs text-muted-foreground">
                  Pagamento seguro · Entrega digital imediata
                </p>
              </div>
            </div>
          </div>

          {/* Descrição do produto */}
          <div className="mt-14 md:mt-20 border-t border-border/50 pt-12 space-y-8">
            <div className="space-y-3">
              <h2 className="font-display text-xl md:text-2xl font-bold text-foreground">
                Sobre este produto
              </h2>
              <p className="text-muted-foreground leading-relaxed text-base">
                {produto.longDesc || produto.desc}
              </p>
            </div>

            {produto.details && produto.details.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">O que está incluso</h3>
                <ul className="space-y-2.5">
                  {produto.details.map((detail, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground text-sm leading-relaxed">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer simples */}
      <footer className="border-t border-border/50 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {identity.brandName} · {identity.doctorName} · {identity.crn}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ProdutoPage;
