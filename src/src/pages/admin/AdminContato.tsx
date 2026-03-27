import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import AdminFormWrapper from "@/components/admin/AdminFormWrapper";
import { useContent, type SiteContent } from "@/contexts/ContentContext";

type ContactContent = SiteContent["contact"];

const AdminContato = () => {
  const { content, updateContent } = useContent();
  const [form, setForm] = useState<ContactContent>(content.contact);

  const set = (key: keyof ContactContent, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const handleSave = async () => {
    await updateContent((prev) => ({ ...prev, contact: form }));
  };

  return (
    <AdminFormWrapper
      title="Endereço & Redes Sociais"
      description="Informações de contato exibidas no rodapé."
      onSave={handleSave}
    >
      <div className="space-y-1 mb-2">
        <p className="text-sm font-semibold text-foreground">Endereço</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Rua e número</Label>
          <Input
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Rua Exemplo, 123"
          />
        </div>
        <div className="space-y-2">
          <Label>Bairro</Label>
          <Input
            value={form.neighborhood}
            onChange={(e) => set("neighborhood", e.target.value)}
            placeholder="Vila Mariana"
          />
        </div>
        <div className="space-y-2">
          <Label>Cidade / UF</Label>
          <Input
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            placeholder="São Paulo/SP"
          />
        </div>
        <div className="space-y-2">
          <Label>CEP</Label>
          <Input
            value={form.cep}
            onChange={(e) => set("cep", e.target.value)}
            placeholder="01000-000"
          />
        </div>
      </div>

      <div className="border-t border-border pt-6 space-y-1 mb-4">
        <p className="text-sm font-semibold text-foreground">Redes Sociais</p>
        <p className="text-xs text-muted-foreground">URLs completas dos perfis.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Instagram</Label>
          <Input
            value={form.instagramUrl}
            onChange={(e) => set("instagramUrl", e.target.value)}
            placeholder="https://instagram.com/seu_perfil"
            type="url"
          />
        </div>
        <div className="space-y-2">
          <Label>Facebook</Label>
          <Input
            value={form.facebookUrl}
            onChange={(e) => set("facebookUrl", e.target.value)}
            placeholder="https://facebook.com/sua_pagina"
            type="url"
          />
        </div>
      </div>
    </AdminFormWrapper>
  );
};

export default AdminContato;
