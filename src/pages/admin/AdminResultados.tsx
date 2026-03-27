import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import AdminFormWrapper from "@/components/admin/AdminFormWrapper";
import ImageUpload from "@/components/admin/ImageUpload";
import { useContent, type SiteContent } from "@/contexts/ContentContext";

type ResultItem = SiteContent["resultados"]["items"][number];
type ResultadosContent = SiteContent["resultados"];

const AdminResultados = () => {
  const { content, updateContent } = useContent();
  const [form, setForm] = useState<ResultadosContent>(content.resultados);

  const setField = (key: keyof Omit<ResultadosContent, "items">, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const setItem = <K extends keyof ResultItem>(index: number, field: K, value: ResultItem[K]) => {
    setForm((p) => {
      const items = [...p.items];
      items[index] = { ...items[index], [field]: value };
      return { ...p, items };
    });
  };

  const addItem = () => {
    setForm((p) => ({
      ...p,
      items: [
        ...p.items,
        { initials: "X.Y.", text: "Depoimento do paciente.", time: "X meses", beforeImageUrl: "", afterImageUrl: "" },
      ],
    }));
  };

  const removeItem = (index: number) => {
    setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    await updateContent((prev) => ({ ...prev, resultados: form }));
  };

  return (
    <AdminFormWrapper
      title="Resultados (Antes e Depois)"
      description="Configure os cases de transformação exibidos no carrossel."
      onSave={handleSave}
    >
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Título da seção</Label>
          <Input value={form.sectionTitle} onChange={(e) => setField("sectionTitle", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Subtítulo</Label>
          <Input value={form.sectionSubtitle} onChange={(e) => setField("sectionSubtitle", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Texto do botão CTA</Label>
          <Input value={form.ctaText} onChange={(e) => setField("ctaText", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Mensagem WhatsApp (botão CTA)</Label>
          <Input value={form.whatsappMessage} onChange={(e) => setField("whatsappMessage", e.target.value)} />
        </div>
        <div className="sm:col-span-2 space-y-2">
          <Label>Aviso legal (disclaimer)</Label>
          <Input
            value={form.disclaimer}
            onChange={(e) => setField("disclaimer", e.target.value)}
            placeholder="*Resultados podem variar de pessoa para pessoa."
          />
        </div>
      </div>

      <div className="border-t border-border pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Cases de resultado</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            className="gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
          >
            <Plus className="h-4 w-4" />
            Adicionar case
          </Button>
        </div>

        <div className="space-y-6">
          {form.items.map((item, i) => (
            <div key={i} className="p-5 rounded-2xl border bg-muted/40 border-border/50 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Case {i + 1}</span>
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

              {/* Before / After image uploads */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Foto — Antes</Label>
                  <ImageUpload
                    value={item.beforeImageUrl}
                    onChange={(url) => setItem(i, "beforeImageUrl", url)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Foto — Depois</Label>
                  <ImageUpload
                    value={item.afterImageUrl}
                    onChange={(url) => setItem(i, "afterImageUrl", url)}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Iniciais (ex: M.S.)</Label>
                  <Input
                    value={item.initials}
                    onChange={(e) => setItem(i, "initials", e.target.value)}
                    placeholder="M.S."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tempo de acompanhamento</Label>
                  <Input
                    value={item.time}
                    onChange={(e) => setItem(i, "time", e.target.value)}
                    placeholder="4 meses"
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label>Depoimento</Label>
                  <Textarea
                    value={item.text}
                    onChange={(e) => setItem(i, "text", e.target.value)}
                    rows={2}
                    className="resize-none"
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

export default AdminResultados;
