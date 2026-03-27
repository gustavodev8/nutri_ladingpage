import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AdminFormWrapper from "@/components/admin/AdminFormWrapper";
import { useContent, type SiteContent } from "@/contexts/ContentContext";

type ModalitiesContent = SiteContent["modalities"];

const AdminModalidades = () => {
  const { content, updateContent } = useContent();
  const [form, setForm] = useState<ModalitiesContent>(content.modalities);

  const set = (key: keyof ModalitiesContent, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const handleSave = async () => {
    await updateContent((prev) => ({ ...prev, modalities: form }));
  };

  return (
    <AdminFormWrapper
      title="Modalidades de Atendimento"
      description="Textos e mapa da seção de atendimento online e presencial."
      onSave={handleSave}
    >
      <div className="space-y-2">
        <Label>Título da seção</Label>
        <Input
          value={form.sectionTitle}
          onChange={(e) => set("sectionTitle", e.target.value)}
          placeholder="Modalidades de Atendimento"
        />
      </div>

      {/* Online */}
      <div className="border-t border-border pt-6">
        <p className="text-sm font-semibold text-foreground mb-4">Atendimento Online</p>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={form.onlineTitle}
              onChange={(e) => set("onlineTitle", e.target.value)}
              placeholder="Atendimento Online"
            />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={form.onlineDesc}
              onChange={(e) => set("onlineDesc", e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
        </div>
      </div>

      {/* Presencial */}
      <div className="border-t border-border pt-6">
        <p className="text-sm font-semibold text-foreground mb-4">Atendimento Presencial</p>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={form.presentialTitle}
              onChange={(e) => set("presentialTitle", e.target.value)}
              placeholder="Atendimento Presencial"
            />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={form.presentialDesc}
              onChange={(e) => set("presentialDesc", e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
        </div>
      </div>

      {/* Google Maps */}
      <div className="border-t border-border pt-6 space-y-3">
        <p className="text-sm font-semibold text-foreground">Link do Google Maps (embed)</p>
        <p className="text-xs text-muted-foreground">
          Acesse{" "}
          <strong>Google Maps → seu endereço → Compartilhar → Incorporar um mapa</strong> e cole
          apenas o conteúdo do atributo <code className="bg-muted px-1 rounded">src</code> do
          iframe gerado.
        </p>
        <div className="space-y-2">
          <Label>URL do iframe</Label>
          <Textarea
            value={form.mapsEmbedUrl}
            onChange={(e) => set("mapsEmbedUrl", e.target.value)}
            rows={3}
            className="resize-none font-mono text-xs"
            placeholder="https://www.google.com/maps/embed?pb=..."
          />
        </div>
        {form.mapsEmbedUrl && (
          <div className="rounded-2xl overflow-hidden border border-border">
            <iframe
              src={form.mapsEmbedUrl}
              width="100%"
              height="180"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Preview do mapa"
            />
          </div>
        )}
      </div>
    </AdminFormWrapper>
  );
};

export default AdminModalidades;
