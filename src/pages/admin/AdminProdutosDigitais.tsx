import { useState } from "react";
import { Plus, Trash2, FileText, Loader2, ExternalLink, MessageSquareQuote, ImageIcon, PackageOpen } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import AdminFormWrapper from "@/components/admin/AdminFormWrapper";
import ImageUpload from "@/components/admin/ImageUpload";
import { useContent, type SiteContent } from "@/contexts/ContentContext";
import { uploadPdf, uploadImage } from "@/lib/supabase";

type Item = SiteContent["produtosDigitais"]["items"][number];
type Screenshot = NonNullable<Item["screenshots"]>[number];
type PdfFile = NonNullable<Item["pdfFiles"]>[number];
type ProdutosContent = SiteContent["produtosDigitais"];

const AdminProdutosDigitais = () => {
  const { content, updateContent } = useContent();
  const [form, setForm] = useState<ProdutosContent>(() => {
    const base = content.produtosDigitais;
    return {
      ...base,
      items: base.items.map((item) => ({
        ...item,
        pdfFiles:
          item.pdfFiles && item.pdfFiles.length > 0
            ? item.pdfFiles
            : item.pdfUrl
            ? [{ url: item.pdfUrl, label: "E-book" }]
            : [],
      })),
    };
  });
  const [pdfUploading, setPdfUploading] = useState<Record<string, boolean>>({});
  const [pdfStatus, setPdfStatus]       = useState<Record<string, string>>({});
  const [screenshotUploading, setScreenshotUploading] = useState<Record<string, boolean>>({});

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

  const uploadPdfFile = async (key: string, file: File): Promise<string | null> => {
    setPdfUploading((prev) => ({ ...prev, [key]: true }));
    try {
      let uploadFile: File = file;
      if (file.size > 50 * 1024 * 1024) {
        setPdfStatus((prev) => ({ ...prev, [key]: "Comprimindo PDF..." }));
        toast({ title: "PDF grande detectado", description: "Comprimindo automaticamente antes do upload…" });
        const { compressPdf } = await import("@/lib/pdfCompress");
        const blob = await compressPdf(file, "media", (done, total) => {
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          setPdfStatus((prev) => ({ ...prev, [key]: `Comprimindo… ${pct}%` }));
        });
        uploadFile = new File([blob], file.name, { type: "application/pdf" });
      }
      setPdfStatus((prev) => ({ ...prev, [key]: "Enviando…" }));
      const url = await uploadPdf(uploadFile);
      if (url) {
        toast({ title: "PDF enviado!", description: uploadFile !== file ? `Comprimido de ${(file.size / 1e6).toFixed(1)} MB → ${(uploadFile.size / 1e6).toFixed(1)} MB` : undefined });
      }
      return url;
    } catch (e) {
      toast({ title: "Falha no upload do PDF", description: e instanceof Error ? e.message : "Erro desconhecido", variant: "destructive" });
      return null;
    } finally {
      setPdfUploading((prev) => ({ ...prev, [key]: false }));
      setPdfStatus((prev) => ({ ...prev, [key]: "" }));
    }
  };

  // ── pdfFiles helpers ──────────────────────────────────────────────────────────
  const addPdfFile = (itemIdx: number) => {
    const pdfFiles = [...(form.items[itemIdx].pdfFiles ?? []), { url: "", label: "" }];
    setItem(itemIdx, "pdfFiles", pdfFiles);
  };

  const updatePdfFile = (itemIdx: number, pdfIdx: number, field: keyof PdfFile, value: string) => {
    const pdfFiles = [...(form.items[itemIdx].pdfFiles ?? [])];
    pdfFiles[pdfIdx] = { ...pdfFiles[pdfIdx], [field]: value };
    setItem(itemIdx, "pdfFiles", pdfFiles);
  };

  const removePdfFile = (itemIdx: number, pdfIdx: number) => {
    const pdfFiles = (form.items[itemIdx].pdfFiles ?? []).filter((_, i) => i !== pdfIdx);
    setItem(itemIdx, "pdfFiles", pdfFiles);
  };

  const handlePdfFileUpload = async (itemIdx: number, pdfIdx: number, file: File) => {
    const key = `pdf-${itemIdx}-${pdfIdx}`;
    const url = await uploadPdfFile(key, file);
    if (url) updatePdfFile(itemIdx, pdfIdx, "url", url);
  };

  // ── Screenshots helpers ───────────────────────────────────────────────────────
  const addScreenshot = (itemIdx: number) => {
    const screenshots = [...(form.items[itemIdx].screenshots ?? []), { imageUrl: "", caption: "" }];
    setItem(itemIdx, "screenshots", screenshots);
  };

  const updateScreenshot = (itemIdx: number, ssIdx: number, field: keyof Screenshot, value: string) => {
    const screenshots = [...(form.items[itemIdx].screenshots ?? [])];
    screenshots[ssIdx] = { ...screenshots[ssIdx], [field]: value };
    setItem(itemIdx, "screenshots", screenshots);
  };

  const removeScreenshot = (itemIdx: number, ssIdx: number) => {
    const screenshots = (form.items[itemIdx].screenshots ?? []).filter((_, i) => i !== ssIdx);
    setItem(itemIdx, "screenshots", screenshots);
  };

  const uploadScreenshot = async (itemIdx: number, ssIdx: number, file: File) => {
    const key = `${itemIdx}-${ssIdx}`;
    setScreenshotUploading(prev => ({ ...prev, [key]: true }));
    try {
      const url = await uploadImage(file);
      if (url) updateScreenshot(itemIdx, ssIdx, "imageUrl", url);
    } finally {
      setScreenshotUploading(prev => ({ ...prev, [key]: false }));
    }
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
          priceAmount: 0,
          badge: "",
          imageUrl: "",
          pdfUrl: "",
          pdfFiles: [],
          whatsappMessage: "Olá! Gostaria de comprar este produto.",
          screenshots: [],
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

                {/* PDFs do produto */}
                <div className="sm:col-span-2 border-t border-border/50 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PackageOpen className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-foreground">PDFs do produto</p>
                      {(item.pdfFiles?.length ?? 0) > 0 && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {item.pdfFiles!.length}
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addPdfFile(i)}
                      className="gap-1.5 text-xs h-8"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar PDF
                    </Button>
                  </div>

                  {(!item.pdfFiles || item.pdfFiles.length === 0) && (
                    <p className="text-xs text-muted-foreground/60 italic py-1">
                      Nenhum PDF adicionado. Para combos, adicione múltiplos PDFs — todos serão enviados ao comprador.
                    </p>
                  )}

                  <div className="space-y-3">
                    {(item.pdfFiles ?? []).map((pf, pi) => {
                      const uploadKey = `pdf-${i}-${pi}`;
                      return (
                        <div key={pi} className="rounded-xl border border-border bg-background p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">
                              {item.pdfFiles!.length > 1 ? `E-book ${pi + 1}` : "E-book"}
                            </span>
                            <button
                              type="button"
                              onClick={() => removePdfFile(i, pi)}
                              className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs">Nome / label (ex: "Guia de Reeducação")</Label>
                            <Input
                              value={pf.label}
                              onChange={(e) => updatePdfFile(i, pi, "label", e.target.value)}
                              placeholder="Ex: E-book Principal"
                              className="h-8 text-sm"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">Arquivo PDF</Label>
                            <div className="flex items-center gap-3 flex-wrap">
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept=".pdf"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handlePdfFileUpload(i, pi, file);
                                    e.target.value = "";
                                  }}
                                />
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors text-xs font-medium text-foreground">
                                  {pdfUploading[uploadKey] ? (
                                    <>
                                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                      {pdfStatus[uploadKey] || "Processando…"}
                                    </>
                                  ) : (
                                    <>
                                      <FileText className="h-3.5 w-3.5 text-primary" />
                                      {pf.url ? "Trocar PDF" : "Fazer upload"}
                                    </>
                                  )}
                                </div>
                              </label>
                              {pf.url && (
                                <a
                                  href={pf.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Ver PDF
                                </a>
                              )}
                            </div>
                            {pf.url && (
                              <p className="text-xs text-muted-foreground truncate max-w-full">{pf.url}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
                  <Label>Descrição longa (página do produto)</Label>
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
                  <Label>Valor numérico para Mercado Pago (ex: 47)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.priceAmount ?? 0}
                    onChange={(e) => setItem(i, "priceAmount", Number(e.target.value))}
                    placeholder="47"
                  />
                  <p className="text-xs text-muted-foreground">Usado no checkout. Use ponto para centavos (ex: 47.90).</p>
                </div>
                <div className="space-y-2">
                  <Label>Badge (ex: Oferta Especial)</Label>
                  <Input
                    value={item.badge}
                    onChange={(e) => setItem(i, "badge", e.target.value)}
                    placeholder="Deixe em branco para ocultar"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mensagem WhatsApp</Label>
                  <Input
                    value={item.whatsappMessage}
                    onChange={(e) => setItem(i, "whatsappMessage", e.target.value)}
                  />
                </div>
              </div>

              {/* ── Screenshots de mensagens ── */}
              <div className="border-t border-border/50 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquareQuote className="h-4 w-4 text-green-600" />
                    <p className="text-sm font-semibold text-foreground">Prints de mensagens</p>
                    {(item.screenshots?.length ?? 0) > 0 && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {item.screenshots!.length}
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addScreenshot(i)}
                    className="gap-1.5 text-xs h-8"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar print
                  </Button>
                </div>

                {(!item.screenshots || item.screenshots.length === 0) && (
                  <p className="text-xs text-muted-foreground/60 italic py-2">
                    Nenhum print ainda. Adicione screenshots de mensagens de compradores (WhatsApp, Instagram, etc).
                  </p>
                )}

                <div className="space-y-3">
                  {(item.screenshots ?? []).map((ss, si) => {
                    const uploadKey = `${i}-${si}`;
                    return (
                      <div key={si} className="rounded-xl border border-border bg-background p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Print {si + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeScreenshot(i, si)}
                            className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Preview + Upload */}
                        <div className="space-y-2">
                          <Label className="text-xs">Imagem do print</Label>
                          <div className="flex items-start gap-3 flex-wrap">
                            {/* Upload button */}
                            <label className="cursor-pointer shrink-0">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => {
                                  const f = e.target.files?.[0];
                                  if (f) uploadScreenshot(i, si, f);
                                  e.target.value = "";
                                }}
                              />
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors text-xs font-medium text-foreground">
                                {screenshotUploading[uploadKey] ? (
                                  <><Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />Enviando...</>
                                ) : (
                                  <><ImageIcon className="h-3.5 w-3.5 text-primary" />{ss.imageUrl ? "Trocar imagem" : "Fazer upload"}</>
                                )}
                              </div>
                            </label>

                            {/* Thumbnail */}
                            {ss.imageUrl && (
                              <img
                                src={ss.imageUrl}
                                alt="Preview"
                                className="h-16 w-auto rounded-lg border border-border object-cover"
                              />
                            )}
                          </div>
                        </div>

                        {/* Caption */}
                        <div className="space-y-1.5">
                          <Label className="text-xs">Legenda (opcional)</Label>
                          <Input
                            value={ss.caption ?? ""}
                            onChange={e => updateScreenshot(i, si, "caption", e.target.value)}
                            placeholder="Ex: Via WhatsApp"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    );
                  })}
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
