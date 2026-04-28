import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, BookOpen, Calendar, ExternalLink,
  ImageIcon, Loader2, Monitor, Plus, ShoppingBag, Smartphone, X,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import AdminFormWrapper from "@/components/admin/AdminFormWrapper";
import { useContent, type SiteContent } from "@/contexts/ContentContext";
import { uploadImage } from "@/lib/supabase";

type MarketplaceForm = SiteContent["marketplace"];
type HeroSlide = MarketplaceForm["heroImages"][number];

// ─── Single image slot (desktop or mobile) ───────────────────────────────────

interface SlotProps {
  id: string;
  value: string;
  aspectClass: string;
  label: string;
  hint: string;
  icon: React.ElementType;
  onUpload: (url: string) => void;
  onRemove: () => void;
}

const ImageSlot = ({ id, value, aspectClass, label, hint, icon: Icon, onUpload, onRemove }: SlotProps) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { setError("Selecione uma imagem."); return; }
    setError("");
    setUploading(true);
    const url = await uploadImage(file);
    setUploading(false);
    url ? onUpload(url) : setError("Erro ao enviar. Verifique o bucket 'images'.");
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>

      {/* Preview / drop zone */}
      <label
        htmlFor={id}
        className={`relative group block w-full ${aspectClass} rounded-xl border-2 border-dashed cursor-pointer overflow-hidden transition-colors
          ${value ? "border-border bg-transparent" : "border-border/50 bg-muted/10 hover:bg-muted/20"}`}
      >
        {value ? (
          <>
            <img src={value} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-medium">Alterar</span>
            </div>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onRemove(); }}
              className="absolute top-1.5 right-1.5 bg-background/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        ) : uploading ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-[10px]">Enviando...</span>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
            <ImageIcon className="h-5 w-5 opacity-30" />
            <span className="text-[10px] text-center px-2">{hint}</span>
          </div>
        )}
      </label>

      {error && <p className="text-[10px] text-destructive">{error}</p>}

      <input
        id={id}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );
};

// ─── Hero images manager ──────────────────────────────────────────────────────

interface HeroImagesProps {
  slides: HeroSlide[];
  onChange: (slides: HeroSlide[]) => void;
}

const HeroImages = ({ slides, onChange }: HeroImagesProps) => {
  const addSlide  = () => onChange([...slides, { desktop: "", mobile: "" }]);
  const removeSlide = (i: number) => onChange(slides.filter((_, j) => j !== i));
  const updateSlide = (i: number, field: keyof HeroSlide, url: string) => {
    const next = slides.map((s, j) => j === i ? { ...s, [field]: url } : s);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {/* Proportion hints */}
      <div className="grid sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 space-y-0.5">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <Monitor className="h-3.5 w-3.5 text-primary" /> Desktop
          </p>
          <p>1920 × 600 px · proporção 16:5</p>
          <p className="opacity-70">JPG, PNG, WebP · até 10 MB</p>
        </div>
        <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 space-y-0.5">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <Smartphone className="h-3.5 w-3.5 text-primary" /> Mobile
          </p>
          <p>600 × 900 px · proporção 2:3</p>
          <p className="opacity-70">Opcional — usa desktop como fallback</p>
        </div>
      </div>

      {/* Slides */}
      {slides.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 h-28 rounded-xl border-2 border-dashed border-border/50 text-muted-foreground bg-muted/10">
          <ImageIcon className="h-7 w-7 opacity-25" />
          <p className="text-sm">Nenhum slide adicionado</p>
          <p className="text-xs opacity-60">Sem slides, o fundo verde padrão é exibido</p>
        </div>
      )}

      {slides.map((slide, i) => (
        <div key={i} className="rounded-2xl border border-border bg-muted/5 p-4 space-y-3">
          {/* Slide header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Slide {i + 1}
            </span>
            <button
              type="button"
              onClick={() => removeSlide(i)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Remover slide
            </button>
          </div>

          {/* Two upload slots */}
          <div className="grid sm:grid-cols-2 gap-4">
            <ImageSlot
              id={`desktop-${i}`}
              value={slide.desktop}
              aspectClass="aspect-[16/5]"
              label="Desktop (obrigatório)"
              hint="1920 × 600 px"
              icon={Monitor}
              onUpload={(url) => updateSlide(i, "desktop", url)}
              onRemove={() => updateSlide(i, "desktop", "")}
            />
            <ImageSlot
              id={`mobile-${i}`}
              value={slide.mobile}
              aspectClass="aspect-[2/3]"
              label="Mobile (opcional)"
              hint="600 × 900 px"
              icon={Smartphone}
              onUpload={(url) => updateSlide(i, "mobile", url)}
              onRemove={() => updateSlide(i, "mobile", "")}
            />
          </div>
        </div>
      ))}

      {/* Add slide */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addSlide}
          className="gap-2 text-primary border-primary/30 hover:bg-primary/5"
        >
          <Plus className="h-4 w-4" /> Adicionar slide
        </Button>
        {slides.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {slides.length} {slides.length === 1 ? "slide" : "slides"} · alternam a cada 5 s
          </p>
        )}
      </div>
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
          slides={form.heroImages ?? []}
          onChange={(slides) => setForm((prev) => ({ ...prev, heroImages: slides }))}
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
