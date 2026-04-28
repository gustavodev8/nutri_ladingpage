import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, BookOpen, Calendar, ExternalLink, GripVertical,
  ImageIcon, Loader2, Plus, ShoppingBag, Trash2, X,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import AdminFormWrapper from "@/components/admin/AdminFormWrapper";
import { useContent, type SiteContent } from "@/contexts/ContentContext";
import { uploadImage } from "@/lib/supabase";

type MarketplaceForm = SiteContent["marketplace"];

// ─── Hero image uploader ──────────────────────────────────────────────────────

interface HeroImagesProps {
  images: string[];
  onChange: (images: string[]) => void;
}

const HeroImages = ({ images, onChange }: HeroImagesProps) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Selecione um arquivo de imagem.");
      return;
    }
    setError("");
    setUploading(true);
    const url = await uploadImage(file);
    setUploading(false);
    if (url) {
      onChange([...images, url]);
    } else {
      setError("Erro ao enviar. Verifique o bucket 'images' no Supabase Storage.");
    }
  };

  const remove = (idx: number) => onChange(images.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      {/* Hint */}
      <div className="rounded-xl bg-muted/40 border border-border px-4 py-3 text-sm text-muted-foreground space-y-0.5">
        <p className="font-medium text-foreground">Proporção recomendada: <span className="text-primary">1920 × 600 px</span></p>
        <p>Paisagem larga (16:5). JPG, PNG ou WebP · até 10 MB por imagem.</p>
      </div>

      {/* Grid of current images */}
      {images.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {images.map((src, i) => (
            <div key={src} className="relative group rounded-xl overflow-hidden border border-border bg-muted/20 aspect-[16/5]">
              <img src={src} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <span className="text-white text-xs font-medium">Slide {i + 1}</span>
              </div>
              {/* Remove button */}
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-2 right-2 bg-background/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-white"
                aria-label="Remover imagem"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {/* Order badge */}
              <span className="absolute top-2 left-2 bg-background/80 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                #{i + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {images.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 h-32 rounded-xl border-2 border-dashed border-border/50 text-muted-foreground bg-muted/10">
          <ImageIcon className="h-8 w-8 opacity-30" />
          <p className="text-sm">Nenhuma imagem adicionada</p>
          <p className="text-xs opacity-60">O hero exibirá o gradiente padrão</p>
        </div>
      )}

      {/* Upload button */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="gap-2 text-primary border-primary/30 hover:bg-primary/5"
        >
          {uploading ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Enviando...</>
          ) : (
            <><Plus className="h-4 w-4" />Adicionar imagem</>
          )}
        </Button>
        {images.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {images.length} {images.length === 1 ? "imagem" : "imagens"} · as imagens alternam a cada 5 s
          </p>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );
};

// ─── Quick-link card ──────────────────────────────────────────────────────────

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

  const set = (field: keyof Omit<MarketplaceForm, "heroImages">, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    await updateContent((prev) => ({ ...prev, marketplace: form }));
  };

  return (
    <AdminFormWrapper
      title="Loja / Marketplace"
      description="Configure o banner da página da loja e gerencie o catálogo de produtos."
      onSave={handleSave}
    >
      {/* ── Hero banner settings ──────────────────────────────────────────── */}
      <div className="space-y-5">
        <p className="text-sm font-semibold text-foreground">Textos do banner</p>

        <div className="grid sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label htmlFor="heroBadge">Rótulo</Label>
            <Input
              id="heroBadge"
              value={form.heroBadge}
              onChange={(e) => set("heroBadge", e.target.value)}
              placeholder="ex: Loja"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="heroTitle">Título</Label>
            <Input
              id="heroTitle"
              value={form.heroTitle}
              onChange={(e) => set("heroTitle", e.target.value)}
              placeholder="ex: Consultas & Produtos"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="heroSubtitle">Subtítulo</Label>
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

      {/* ── Hero images ───────────────────────────────────────────────────── */}
      <div className="border-t border-border pt-6 space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Imagens de fundo (carrossel)</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            As imagens ficam atrás do texto e alternam automaticamente. Sem imagens, o fundo verde padrão é exibido.
          </p>
        </div>

        <HeroImages
          images={form.heroImages ?? []}
          onChange={(imgs) => setForm((prev) => ({ ...prev, heroImages: imgs }))}
        />
      </div>

      {/* ── Preview link ──────────────────────────────────────────────────── */}
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
          Os produtos e planos de consulta são gerenciados nas páginas abaixo.
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
        <Button
          asChild
          variant="outline"
          className="gap-2 rounded-full border-primary/30 text-primary hover:bg-primary/5"
        >
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
