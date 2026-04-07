import { useState, useRef } from "react";
import { Plus, Trash2, UserCircle, Camera, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import AdminFormWrapper from "@/components/admin/AdminFormWrapper";
import { useContent, type SiteContent } from "@/contexts/ContentContext";
import { uploadImage } from "@/lib/supabase";

type TestimonialsContent = SiteContent["testimonials"];
type TestimonialItem = TestimonialsContent["items"][number];

const AdminDepoimentos = () => {
  const { content, updateContent } = useContent();
  const [form, setForm] = useState<TestimonialsContent>(content.testimonials);
  const [uploading, setUploading] = useState<number | null>(null);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handlePhotoUpload = async (index: number, file: File) => {
    setUploading(index);
    const url = await uploadImage(file);
    setUploading(null);
    if (url) setItem(index, "photoUrl", url);
  };

  const removePhoto = (index: number) => {
    setItem(index, "photoUrl", "");
  };

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
        { name: "Nome Sobrenome", initials: "NS", text: "Depoimento do paciente...", photoUrl: "" },
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
                {/* Foto 4:3 */}
                <div className="sm:col-span-2 space-y-2">
                  <Label>Foto do paciente</Label>
                  <div className="relative w-full max-w-[200px] aspect-[4/3] rounded-xl overflow-hidden border border-dashed border-border bg-muted/50">
                    {item.photoUrl ? (
                      <>
                        <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
                        >
                          <X className="h-3.5 w-3.5 text-white" />
                        </button>
                      </>
                    ) : (
                      <label className="w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted transition-colors">
                        {uploading === i ? (
                          <span className="text-xs text-muted-foreground">Enviando…</span>
                        ) : (
                          <>
                            <Camera className="h-6 w-6 text-muted-foreground/50" />
                            <span className="text-xs text-muted-foreground">Escolher foto</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={(el) => { fileRefs.current[i] = el; }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePhotoUpload(i, file);
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

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
