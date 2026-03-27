import { useState } from "react";
import { Plus, Trash2, UserCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import AdminFormWrapper from "@/components/admin/AdminFormWrapper";
import { useContent, type SiteContent } from "@/contexts/ContentContext";

type TestimonialsContent = SiteContent["testimonials"];
type TestimonialItem = TestimonialsContent["items"][number];

const AdminDepoimentos = () => {
  const { content, updateContent } = useContent();
  const [form, setForm] = useState<TestimonialsContent>(content.testimonials);

  const setTitle = (value: string) => {
    setForm((p) => ({ ...p, title: value }));
  };

  const setItem = (index: number, field: keyof TestimonialItem, value: string) => {
    setForm((p) => {
      const items = [...p.items];
      const updated = { ...items[index], [field]: value };
      // Auto-generate initials when name changes
      if (field === "name") {
        const parts = value.trim().split(/\s+/);
        updated.initials = parts
          .slice(0, 2)
          .map((w) => w[0]?.toUpperCase() ?? "")
          .join("");
      }
      items[index] = updated;
      return { ...p, items };
    });
  };

  const addItem = () => {
    setForm((p) => ({
      ...p,
      items: [
        ...p.items,
        { name: "Nome Sobrenome", initials: "NS", text: "Depoimento do paciente..." },
      ],
    }));
  };

  const removeItem = (index: number) => {
    setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    await updateContent((prev) => ({ ...prev, testimonials: form }));
  };

  return (
    <AdminFormWrapper
      title="Depoimentos"
      description="Gerencie os depoimentos dos seus pacientes."
      onSave={handleSave}
    >
      <div className="space-y-2 max-w-sm">
        <Label>Título da seção</Label>
        <Input value={form.title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="border-t border-border pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">
            Depoimentos <span className="text-muted-foreground font-normal">({form.items.length})</span>
          </p>
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
                  <UserCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Depoimento {i + 1}</span>
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
                  <Label>Nome</Label>
                  <Input
                    value={item.name}
                    onChange={(e) => setItem(i, "name", e.target.value)}
                    placeholder="Maria S."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Iniciais (avatar)</Label>
                  <Input
                    value={item.initials}
                    onChange={(e) => setItem(i, "initials", e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="MS"
                    maxLength={2}
                    className="uppercase"
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label>Depoimento</Label>
                  <Textarea
                    value={item.text}
                    onChange={(e) => setItem(i, "text", e.target.value)}
                    rows={3}
                    className="resize-none"
                    placeholder="Escreva o depoimento do paciente..."
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

export default AdminDepoimentos;
