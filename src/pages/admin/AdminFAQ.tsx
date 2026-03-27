import { useState } from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import AdminFormWrapper from "@/components/admin/AdminFormWrapper";
import { useContent, type SiteContent } from "@/contexts/ContentContext";

type FAQContent = SiteContent["faq"];
type FAQItem = FAQContent["items"][number];

const AdminFAQ = () => {
  const { content, updateContent } = useContent();
  const [form, setForm] = useState<FAQContent>(content.faq);
  const [expanded, setExpanded] = useState<number | null>(null);

  const setTitle = (value: string) => {
    setForm((p) => ({ ...p, title: value }));
  };

  const setItem = (index: number, field: keyof FAQItem, value: string) => {
    setForm((p) => {
      const items = [...p.items];
      items[index] = { ...items[index], [field]: value };
      return { ...p, items };
    });
  };

  const addItem = () => {
    const newIndex = form.items.length;
    setForm((p) => ({
      ...p,
      items: [...p.items, { q: "Nova pergunta?", a: "Resposta aqui." }],
    }));
    setExpanded(newIndex);
  };

  const removeItem = (index: number) => {
    setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== index) }));
    if (expanded === index) setExpanded(null);
  };

  const handleSave = async () => {
    await updateContent((prev) => ({ ...prev, faq: form }));
  };

  return (
    <AdminFormWrapper
      title="Perguntas Frequentes (FAQ)"
      description="Adicione, edite ou remova as perguntas frequentes."
      onSave={handleSave}
    >
      <div className="space-y-2 max-w-sm">
        <Label>Título da seção</Label>
        <Input value={form.title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="border-t border-border pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">
            Perguntas <span className="text-muted-foreground font-normal">({form.items.length})</span>
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

        <div className="space-y-2">
          {form.items.map((item, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/50 overflow-hidden"
            >
              {/* Header / collapse trigger */}
              <button
                type="button"
                onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
              >
                <span className="text-sm font-medium text-foreground truncate pr-4">
                  {item.q || `Pergunta ${i + 1}`}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      expanded === i ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {/* Expanded content */}
              {expanded === i && (
                <div className="p-5 space-y-4 bg-background">
                  <div className="space-y-2">
                    <Label>Pergunta</Label>
                    <Input
                      value={item.q}
                      onChange={(e) => setItem(i, "q", e.target.value)}
                      placeholder="Como funciona...?"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Resposta</Label>
                    <Textarea
                      value={item.a}
                      onChange={(e) => setItem(i, "a", e.target.value)}
                      rows={4}
                      className="resize-none"
                      placeholder="Descreva a resposta..."
                    />
                  </div>
                  {form.items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(i)}
                      className="gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remover esta pergunta
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AdminFormWrapper>
  );
};

export default AdminFAQ;
