import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import AdminFormWrapper from "@/components/admin/AdminFormWrapper";
import ImageUpload from "@/components/admin/ImageUpload";
import { useContent, type SiteContent } from "@/contexts/ContentContext";

type Item = SiteContent["produtosDigitais"]["items"][number];
type ProdutosContent = SiteContent["produtosDigitais"];

const AdminProdutosDigitais = () => {
  const { content, updateContent } = useContent();
  const [form, setForm] = useState<ProdutosContent>(content.produtosDigitais);

  const setHeader = (key: "sectionTitle" | "sectionSubtitle", value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const setItem = <K extends keyof Item>(index: number, field: K, value: Item[K]) => {
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
        {
          name: "Novo Produto",
          desc: "Descrição curta do produto",
          longDesc: "",
          details: [],
          price: "R$ 0",
          badge: "",
          imageUrl: "",
          whatsappMessage: "Olá! Gostaria de comprar este produto.",
        },
      ],
    }));
  };

  const removeItem = (index: number) => {
    setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    await updateContent((prev) => ({ ...prev, produtosDigitais: form }));
  };

  return (
    <AdminFormWrapper
      title="Produtos Digitais"
      description="Configure os e-books e materiais digitais disponíveis."
      onSave={handleSave}
    >
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Título da seção</Label>
          <Input value={form.sectionTitle} onChange={(e) => setHeader("sectionTitle", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Subtítulo</Label>
          <Input value={form.sectionSubtitle} onChange={(e) => setHeader("sectionSubtitle", e.target.value)} />
        </div>
      </div>

      <div className="border-t border-border pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Produtos</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            className="gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
          >
            <Plus className="h-4 w-4" />
            Adicionar produto
          </Button>
        </div>

        <div className="space-y-4">
          {form.items.map((item, i) => (
            <div key={i} className="p-5 rounded-2xl border bg-muted/40 border-border/50 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Produto {i + 1}</span>
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
                <div className="sm:col-span-2 space-y-2">
                  <Label>Imagem de capa</Label>
                  <ImageUpload
                    value={item.imageUrl}
                    onChange={(url) => setItem(i, "imageUrl", url)}
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label>Nome do produto</Label>
                  <Input value={item.name} onChange={(e) => setItem(i, "name", e.target.value)} />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label>Descrição curta (aparece no card)</Label>
                  <Input value={item.desc} onChange={(e) => setItem(i, "desc", e.target.value)} />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label>Descrição completa (aparece na página do produto)</Label>
                  <Textarea
                    rows={3}
                    value={item.longDesc ?? ""}
                    onChange={(e) => setItem(i, "longDesc", e.target.value)}
                    placeholder="Explique em detalhe o produto, para quem é, quais resultados esperar..."
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label>O que está incluso (um tópico por linha)</Label>
                  <Textarea
                    rows={4}
                    value={(item.details ?? []).join("\n")}
                    onChange={(e) =>
                      setItem(
                        i,
                        "details",
                        e.target.value.split("\n").filter((l) => l.trim() !== "")
                      )
                    }
                    placeholder={"60 páginas de conteúdo\nAcesso imediato\nLista de compras inclusa"}
                  />
                  <p className="text-xs text-muted-foreground">Cada linha vira um item da lista na página do produto.</p>
                </div>
                <div className="space-y-2">
                  <Label>Preço (ex: R$ 47)</Label>
                  <Input value={item.price} onChange={(e) => setItem(i, "price", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Badge (ex: Oferta Especial)</Label>
                  <Input
                    value={item.badge}
                    onChange={(e) => setItem(i, "badge", e.target.value)}
                    placeholder="Deixe em branco para ocultar"
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label>Mensagem WhatsApp</Label>
                  <Input
                    value={item.whatsappMessage}
                    onChange={(e) => setItem(i, "whatsappMessage", e.target.value)}
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

export default AdminProdutosDigitais;
