import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import AdminFormWrapper from "@/components/admin/AdminFormWrapper";
import ImageUpload from "@/components/admin/ImageUpload";
import { useContent } from "@/contexts/ContentContext";

const AdminPerfil = () => {
  const { content, updateContent } = useContent();
  const [form, setForm] = useState(content.identity);

  const set = (key: keyof typeof form, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const handleSave = async () => {
    await updateContent((prev) => ({ ...prev, identity: form }));
  };

  return (
    <AdminFormWrapper
      title="Perfil & Identidade"
      description="Nome, especialidade, CRN e número do WhatsApp."
      onSave={handleSave}
    >
      <div className="space-y-2">
        <Label>Foto principal (Hero)</Label>
        <p className="text-xs text-muted-foreground">Aparece na seção principal do site.</p>
        <ImageUpload
          value={form.photoUrl}
          onChange={(url) => setForm((p) => ({ ...p, photoUrl: url }))}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Nome da marca / clínica</Label>
          <Input value={form.brandName} onChange={(e) => set("brandName", e.target.value)} placeholder="NutriVida" />
        </div>
        <div className="space-y-2">
          <Label>Nome da nutricionista</Label>
          <Input value={form.doctorName} onChange={(e) => set("doctorName", e.target.value)} placeholder="Dra. Ana Silva" />
        </div>
        <div className="space-y-2">
          <Label>CRN</Label>
          <Input value={form.crn} onChange={(e) => set("crn", e.target.value)} placeholder="CRN-3 12345" />
        </div>
        <div className="space-y-2">
          <Label>Especialidade</Label>
          <Input value={form.specialty} onChange={(e) => set("specialty", e.target.value)} placeholder="Nutricionista Clínica e Esportiva" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Número do WhatsApp</Label>
        <div className="flex items-center gap-3">
          <Input
            value={form.whatsappNumber}
            onChange={(e) => set("whatsappNumber", e.target.value.replace(/\D/g, ""))}
            placeholder="5511999999999"
            className="font-mono"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Apenas números, com DDI + DDD. Ex: <code className="bg-muted px-1 rounded">5511999999999</code>
        </p>
        <a
          href={`https://wa.me/${form.whatsappNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs text-primary hover:underline mt-1"
        >
          Testar link →
        </a>
      </div>
    </AdminFormWrapper>
  );
};

export default AdminPerfil;
