import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import AdminFormWrapper from "@/components/admin/AdminFormWrapper";
import { useContent } from "@/contexts/ContentContext";

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
      <p className="text-xs text-muted-foreground -mt-4 mb-2">
        Nome, especialidade e CRN são editados em <strong>Perfil &amp; Identidade</strong>.
      </p>
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Badge (ex: &quot;Agendamento aberto&quot;)</Label>
          <Input value={form.badge} onChange={(e) => set("badge", e.target.value)} />
        </div>
        <div className="sm:col-span-2 space-y-2">
          <Label>Tagline (texto antes dos destaques)</Label>
          <Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Destaque 1 (palavra em verde)</Label>
          <Input value={form.taglineHighlight1} onChange={(e) => set("taglineHighlight1", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Destaque 2 (palavra em verde)</Label>
          <Input value={form.taglineHighlight2} onChange={(e) => set("taglineHighlight2", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Texto do botão 1 (verde)</Label>
          <Input value={form.cta1Text} onChange={(e) => set("cta1Text", e.target.value)} placeholder="Consulta Online" />
        </div>
        <div className="space-y-2">
          <Label>Texto do botão 2 (borda)</Label>
          <Input value={form.cta2Text} onChange={(e) => set("cta2Text", e.target.value)} placeholder="Consulta Presencial" />
        </div>
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
