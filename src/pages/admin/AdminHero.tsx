import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import AdminFormWrapper from "@/components/admin/AdminFormWrapper";
import { useContent } from "@/contexts/ContentContext";

function HighlightPreview({ text, h1, h2 }: { text: string; h1: string; h2: string }) {
  const words = [h1.trim(), h2.trim()].filter(Boolean);
  if (!words.length) return <span>{text}</span>;
  const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        words.some(w => w.toLowerCase() === part.toLowerCase())
          ? <span key={i} className="text-primary font-bold">{part}</span>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

const AdminHero = () => {
  const { content, updateContent } = useContent();
  const [form, setForm] = useState(content.hero);

  const set = (key: keyof typeof form, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const handleSave = async () => {
    await updateContent((prev) => ({ ...prev, hero: form }));
  };

  return (
    <AdminFormWrapper
      title="Seção Principal (Hero)"
      description="Textos da primeira seção da página."
      onSave={handleSave}
    >
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Badge (ex: &quot;Agendamento aberto&quot;)</Label>
          <Input value={form.badge} onChange={(e) => set("badge", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Título principal</Label>
          <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div className="sm:col-span-2 space-y-2">
          <Label>Subtítulo (especialidade + CRN)</Label>
          <Input value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
        </div>
        <div className="sm:col-span-2 space-y-2">
          <Label>Tagline (frase completa do título)</Label>
          <Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Destaque 1 <span className="text-muted-foreground font-normal">(palavra/trecho que existe na tagline)</span></Label>
          <Input value={form.taglineHighlight1} onChange={(e) => set("taglineHighlight1", e.target.value)} placeholder="Ex: método científico" />
        </div>
        <div className="space-y-2">
          <Label>Destaque 2 <span className="text-muted-foreground font-normal">(palavra/trecho que existe na tagline)</span></Label>
          <Input value={form.taglineHighlight2} onChange={(e) => set("taglineHighlight2", e.target.value)} placeholder="Ex: sem dietas genéricas" />
        </div>
        {/* Live preview */}
        {form.tagline && (
          <div className="sm:col-span-2 rounded-xl bg-muted/50 border border-border px-5 py-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pré-visualização</p>
            <p className="font-display text-lg font-bold text-foreground leading-snug">
              <HighlightPreview text={form.tagline} h1={form.taglineHighlight1} h2={form.taglineHighlight2} />
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-border pt-6 space-y-1">
        <p className="text-sm font-semibold text-foreground">Badge de avaliação</p>
        <p className="text-xs text-muted-foreground mb-4">Aparece no card flutuante sobre a foto.</p>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Nota (ex: 4.9/5)</Label>
            <Input value={form.ratingScore} onChange={(e) => set("ratingScore", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Quantidade de avaliações</Label>
            <Input value={form.ratingCount} onChange={(e) => set("ratingCount", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-6 space-y-1">
        <p className="text-sm font-semibold text-foreground">Prova social</p>
        <p className="text-xs text-muted-foreground mb-4">Aparece abaixo dos botões de CTA.</p>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Número (ex: +500)</Label>
            <Input value={form.socialProofCount} onChange={(e) => set("socialProofCount", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Texto (ex: pacientes transformados)</Label>
            <Input value={form.socialProofText} onChange={(e) => set("socialProofText", e.target.value)} />
          </div>
        </div>
      </div>
    </AdminFormWrapper>
  );
};

export default AdminHero;
