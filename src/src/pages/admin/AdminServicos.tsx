import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminFormWrapper from "@/components/admin/AdminFormWrapper";
import { useContent, type SiteContent } from "@/contexts/ContentContext";

type ServicesContent = SiteContent["services"];
type ServiceItem = ServicesContent["items"][number];

const ICON_OPTIONS = [
  { value: "Video", label: "Vídeo (Online)" },
  { value: "MapPin", label: "Localização (Presencial)" },
  { value: "CalendarCheck", label: "Calendário (Acompanhamento)" },
  { value: "Apple", label: "Maçã (Alimentação)" },
  { value: "Dumbbell", label: "Haltere (Esportiva)" },
  { value: "Stethoscope", label: "Estetoscópio (Clínica)" },
];

const AdminServicos = () => {
  const { content, updateContent } = useContent();
  const [form, setForm] = useState<ServicesContent>(content.services);

  const setHeader = (key: "title" | "subtitle", value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const setItem = (index: number, field: keyof ServiceItem, value: string) => {
    setForm((p) => {
      const items = [...p.items];
      items[index] = { ...items[index], [field]: value };
      return { ...p, items };
    });
  };

  const addItem = () => {
    setForm((p) => ({
      ...p,
      items: [...p.items, { icon: "Video", title: "Novo Serviço", desc: "Descrição do serviço." }],
    }));
  };

  const removeItem = (index: number) => {
    setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    await updateContent((prev) => ({ ...prev, services: form }));
  };

  return (
    <AdminFormWrapper
      title="Serviços"
      description="Adicione, edite ou remova os cards de serviços."
      onSave={handleSave}
    >
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Título da seção</Label>
          <Input value={form.title} onChange={(e) => setHeader("title", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Subtítulo</Label>
          <Input value={form.subtitle} onChange={(e) => setHeader("subtitle", e.target.value)} />
        </div>
      </div>

      <div className="border-t border-border pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Cards de serviços</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            className="gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>

        <div className="space-y-3">
          {form.items.map((item, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-muted/40 border border-border/50 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                  <span className="text-xs font-medium">Serviço {i + 1}</span>
                </div>
                {form.items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(i)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ícone</Label>
                  <Select value={item.icon} onValueChange={(v) => setItem(i, "icon", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={item.title}
                    onChange={(e) => setItem(i, "title", e.target.value)}
                    placeholder="Nome do serviço"
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={item.desc}
                    onChange={(e) => setItem(i, "desc", e.target.value)}
                    rows={2}
                    className="resize-none"
                    placeholder="Descrição breve do serviço..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminFormWrapper>
  );
};

export default AdminServicos;
