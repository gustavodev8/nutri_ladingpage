import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AdminFormWrapper from "@/components/admin/AdminFormWrapper";
import { useContent, type SiteContent } from "@/contexts/ContentContext";

type AboutContent = SiteContent["about"];

const AdminSobre = () => {
  const { content, updateContent } = useContent();
  const [form, setForm] = useState<AboutContent>(content.about);

  const set = (key: keyof Omit<AboutContent, "stats">, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const setStat = (index: number, field: "label" | "value", value: string) => {
    setForm((p) => {
      const stats = [...p.stats];
      stats[index] = { ...stats[index], [field]: value };
      return { ...p, stats };
    });
  };

  const handleSave = async () => {
    await updateContent((prev) => ({ ...prev, about: form }));
  };

  return (
    <AdminFormWrapper
      title="Sobre Mim"
      description="Textos da seção de apresentação profissional."
      onSave={handleSave}
    >
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Eyebrow (texto pequeno acima)</Label>
          <Input value={form.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Título da seção</Label>
          <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div className="sm:col-span-2 space-y-2">
          <Label>Parágrafo 1</Label>
          <Textarea
            value={form.bio1}
            onChange={(e) => set("bio1", e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>
        <div className="sm:col-span-2 space-y-2">
          <Label>Parágrafo 2</Label>
          <Textarea
            value={form.bio2}
            onChange={(e) => set("bio2", e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <p className="text-sm font-semibold text-foreground mb-4">Estatísticas (3 cards)</p>
        <div className="grid gap-4">
          {form.stats.map((stat, i) => (
            <div key={i} className="grid sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/40 border border-border/50">
              <div className="space-y-2">
                <Label>Valor (ex: 8+)</Label>
                <Input
                  value={stat.value}
                  onChange={(e) => setStat(i, "value", e.target.value)}
                  placeholder="8+"
                />
              </div>
              <div className="space-y-2">
                <Label>Rótulo</Label>
                <Input
                  value={stat.label}
                  onChange={(e) => setStat(i, "label", e.target.value)}
                  placeholder="Anos de Experiência"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminFormWrapper>
  );
};

export default AdminSobre;
