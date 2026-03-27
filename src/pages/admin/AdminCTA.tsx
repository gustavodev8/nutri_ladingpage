import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AdminFormWrapper from "@/components/admin/AdminFormWrapper";
import { useContent, type SiteContent } from "@/contexts/ContentContext";

type CTAContent = SiteContent["cta"];

const AdminCTA = () => {
  const { content, updateContent } = useContent();
  const [form, setForm] = useState<CTAContent>(content.cta);

  const set = (key: keyof CTAContent, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const handleSave = async () => {
    await updateContent((prev) => ({ ...prev, cta: form }));
  };

  return (
    <AdminFormWrapper
      title="Chamada Final (CTA)"
      description="Textos da seção de chamada para ação no final da página."
      onSave={handleSave}
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <Label>Título</Label>
          <Input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Comece hoje sua jornada..."
          />
        </div>
        <div className="space-y-2">
          <Label>Subtítulo</Label>
          <Textarea
            value={form.subtitle}
            onChange={(e) => set("subtitle", e.target.value)}
            rows={3}
            className="resize-none"
            placeholder="Dê o primeiro passo..."
          />
        </div>
        <div className="space-y-2">
          <Label>Texto do botão</Label>
          <Input
            value={form.buttonText}
            onChange={(e) => set("buttonText", e.target.value)}
            placeholder="Agendar minha consulta pelo WhatsApp"
          />
        </div>
        <div className="space-y-2">
          <Label>Mensagem WhatsApp</Label>
          <Input
            value={form.whatsappMessage}
            onChange={(e) => set("whatsappMessage", e.target.value)}
            placeholder="Olá! Gostaria de agendar uma consulta."
          />
          <p className="text-xs text-muted-foreground">
            Mensagem pré-preenchida ao clicar no botão do WhatsApp.
          </p>
        </div>
      </div>
    </AdminFormWrapper>
  );
};

export default AdminCTA;
