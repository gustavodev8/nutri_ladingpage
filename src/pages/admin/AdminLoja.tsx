import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Calendar, ExternalLink, ShoppingBag } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import AdminFormWrapper from "@/components/admin/AdminFormWrapper";
import { useContent, type SiteContent } from "@/contexts/ContentContext";

type MarketplaceForm = SiteContent["marketplace"];

// ─── Quick-link card shown at the bottom of the page ─────────────────────────

interface QuickLinkProps {
  to: string;
  icon: React.ElementType;
  title: string;
  description: string;
  count: number;
  countLabel: string;
}

const QuickLink = ({ to, icon: Icon, title, description, count, countLabel }: QuickLinkProps) => (
  <Link
    to={to}
    className="group flex items-start gap-4 p-4 rounded-2xl border border-border bg-background hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
  >
    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
      <Icon className="h-5 w-5 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-sm text-foreground">{title}</p>
        <span className="text-xs text-muted-foreground shrink-0">
          {count} {countLabel}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </div>
    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5" />
  </Link>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const AdminLoja = () => {
  const { content, updateContent } = useContent();
  const [form, setForm] = useState<MarketplaceForm>(content.marketplace);

  const set = (field: keyof MarketplaceForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    await updateContent((prev) => ({ ...prev, marketplace: form }));
  };

  return (
    <AdminFormWrapper
      title="Loja / Marketplace"
      description="Configure o banner da página da loja. Para gerenciar consultas e produtos, use os links abaixo."
      onSave={handleSave}
    >
      {/* ── Hero settings ─────────────────────────────────────────────────── */}
      <div className="space-y-5">
        <p className="text-sm font-semibold text-foreground">Banner da página</p>

        <div className="grid sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label htmlFor="heroBadge">Rótulo do banner</Label>
            <Input
              id="heroBadge"
              value={form.heroBadge}
              onChange={(e) => set("heroBadge", e.target.value)}
              placeholder="ex: Loja"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="heroTitle">Título do banner</Label>
            <Input
              id="heroTitle"
              value={form.heroTitle}
              onChange={(e) => set("heroTitle", e.target.value)}
              placeholder="ex: Consultas & Produtos"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="heroSubtitle">Subtítulo do banner</Label>
          <Textarea
            id="heroSubtitle"
            value={form.heroSubtitle}
            onChange={(e) => set("heroSubtitle", e.target.value)}
            placeholder="Descrição exibida abaixo do título..."
            className="resize-none"
            rows={3}
          />
        </div>
      </div>

      {/* ── Preview hint ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-green-light/60 border border-primary/15 px-5 py-4 flex items-center gap-3">
        <ExternalLink className="h-4 w-4 text-primary shrink-0" />
        <p className="text-sm text-foreground/80">
          Visualize o resultado em{" "}
          <a
            href="/loja"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
          >
            /loja
          </a>
          .
        </p>
      </div>

      {/* ── Quick links ───────────────────────────────────────────────────── */}
      <div className="border-t border-border pt-6 space-y-3">
        <p className="text-sm font-semibold text-foreground">Gerenciar catálogo</p>
        <p className="text-xs text-muted-foreground -mt-1">
          Os produtos e planos de consulta da loja são gerenciados nas páginas abaixo.
        </p>

        <div className="space-y-3 pt-1">
          <QuickLink
            to="/admin/precos"
            icon={Calendar}
            title="Planos de Consulta"
            description="Edite preços, descrições, badges e a quantidade de sessões de cada plano."
            count={content.loja.plans.length}
            countLabel="planos"
          />

          <QuickLink
            to="/admin/produtos"
            icon={BookOpen}
            title="Produtos Digitais"
            description="Gerencie e-books, guias e demais materiais digitais disponíveis para compra."
            count={content.produtosDigitais.items.length}
            countLabel="produtos"
          />
        </div>
      </div>

      {/* ── Visit store ───────────────────────────────────────────────────── */}
      <div className="flex justify-start">
        <Button asChild variant="outline" className="gap-2 rounded-full border-primary/30 text-primary hover:bg-primary/5">
          <a href="/loja" target="_blank" rel="noopener noreferrer">
            <ShoppingBag className="h-4 w-4" />
            Ver loja no site
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </AdminFormWrapper>
  );
};

export default AdminLoja;
