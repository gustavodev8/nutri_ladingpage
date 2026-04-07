import { useState } from "react";
import { Plus, Trash2, Image } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AdminFormWrapper from "@/components/admin/AdminFormWrapper";
import ImageUpload from "@/components/admin/ImageUpload";
import { useContent, type SiteContent } from "@/contexts/ContentContext";

type TestimonialsContent = SiteContent["testimonials"];

const AdminDepoimentos = () => {
  const { content, updateContent } = useContent();
  const [form, setForm] = useState<TestimonialsContent>(content.testimonials);

  const setTitle = (value: string) => {
    setForm((p) => ({ ...p, title: value }));
  };

  const setItemImage = (index: number, url: string) => {
    setForm((p) => {
      const items = [...p.items];
      items[index] = { imageUrl: url };
      return { ...p, items };
    });
  };

  const addItem = () => {
    setForm((p) => ({ ...p, items: [...p.items, { imageUrl: "" }] }));
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
      description="Adicione prints/fotos de depoimentos reais dos seus pacientes."
      onSave={handleSave}
    >
      <div className="space-y-2 max-w-sm">
        <Label>Título da seção</Label>
        <Input value={form.title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="border-t border-border pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">
            Fotos de depoimentos{" "}
            <span className="text-muted-foreground font-normal">({form.items.length})</span>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            className="gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
          >
            <Plus className="h-4 w-4" />
            Adicionar foto
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {form.items.map((item, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Image className="h-4 w-4" />
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
              <ImageUpload
                value={item.imageUrl}
                onChange={(url) => setItemImage(i, url)}
              />
            </div>
          ))}
        </div>
      </div>
    </AdminFormWrapper>
  );
};

export default AdminDepoimentos;
