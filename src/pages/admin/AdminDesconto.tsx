import { useState } from "react";
import { Power, Tag, Clock, Percent, MessageSquare, BookOpen, ClipboardList } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AdminFormWrapper from "@/components/admin/AdminFormWrapper";
import { useContent, type SiteContent } from "@/contexts/ContentContext";
import { toast } from "@/hooks/use-toast";

type DiscountConfig = SiteContent["discount"];

const AdminDesconto = () => {
  const { content, updateContent } = useContent();
  const [form, setForm] = useState<DiscountConfig>(content.discount);
  const ebookItems = content.produtosDigitais.items;
  const serviceItems = content.loja.plans;

  const isExpired =
    form.active &&
    form.expiresAt !== null &&
    new Date(form.expiresAt).getTime() <= Date.now();

  const toggleName = (field: "selectedEbookNames" | "selectedServiceNames", value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((item) => item !== value)
        : [...prev[field], value],
    }));
  };

  const hasInvalidScopedSelection =
    (form.ebookScope === "some" && ebookItems.length > 0 && form.selectedEbookNames.length === 0) ||
    (form.serviceScope === "some" && serviceItems.length > 0 && form.selectedServiceNames.length === 0);

  const validateScopedSelection = () => {
    if (!hasInvalidScopedSelection) return true;
    toast({
      title: "Selecione ao menos um item",
      description: "Quando o desconto estiver em 'alguns', é necessário marcar pelo menos um e-book e/ou atendimento.",
      variant: "destructive",
    });
    return false;
  };

  const activate = async () => {
    if (!validateScopedSelection()) return;
    const expiresAt = new Date(
      Date.now() + form.durationHours * 60 * 60 * 1000
    ).toISOString();
    const updated: DiscountConfig = { ...form, active: true, expiresAt };
    setForm(updated);
    await updateContent((prev) => ({ ...prev, discount: updated }));
    toast({ title: "Desconto ativado!", description: `Expira em ${form.durationHours}h.` });
  };

  const deactivate = async () => {
    const updated: DiscountConfig = { ...form, active: false, expiresAt: null };
    setForm(updated);
    await updateContent((prev) => ({ ...prev, discount: updated }));
    toast({ title: "Desconto desativado." });
  };

  const handleSave = async () => {
    if (!validateScopedSelection()) return;
    await updateContent((prev) => ({ ...prev, discount: form }));
  };

  const activeAndValid = form.active && !isExpired;

  return (
    <AdminFormWrapper
      title="Desconto Global"
      description="Ative um desconto temporário e escolha se ele vale para todos ou apenas alguns e-books, atendimentos e protocolos. O banner aparece no topo do site com contagem regressiva."
      onSave={handleSave}
    >
      {/* Status card */}
      <div
        className={`rounded-2xl border p-5 flex items-center justify-between gap-4 ${
          activeAndValid
            ? "bg-green-50 border-green-200"
            : "bg-muted/40 border-border/50"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              activeAndValid ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30"
            }`}
          />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {activeAndValid ? "Desconto ativo" : isExpired ? "Desconto expirado" : "Desconto inativo"}
            </p>
            {activeAndValid && form.expiresAt && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Expira em {new Date(form.expiresAt).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {activeAndValid ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={deactivate}
              className="gap-1.5"
            >
              <Power className="h-4 w-4" />
              Desativar
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={activate}
              className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
            >
              <Power className="h-4 w-4" />
              Ativar agora
            </Button>
          )}
        </div>
      </div>

      {/* Config */}
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Percent className="h-3.5 w-3.5 text-primary" />
            Percentual de desconto (%)
          </Label>
          <Input
            type="number"
            min="1"
            max="99"
            value={form.percentage}
            onChange={(e) => setForm((p) => ({ ...p, percentage: Number(e.target.value) }))}
          />
          <p className="text-xs text-muted-foreground">Ex: 15 → 15% de desconto nos itens selecionados.</p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" />
            Duração (horas)
          </Label>
          <Input
            type="number"
            min="1"
            max="72"
            value={form.durationHours}
            onChange={(e) => setForm((p) => ({ ...p, durationHours: Number(e.target.value) }))}
          />
          <p className="text-xs text-muted-foreground">Quanto tempo o banner fica no ar ao ativar.</p>
        </div>

        <div className="sm:col-span-2 space-y-2">
          <Label className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-primary" />
            Mensagem do banner
          </Label>
          <Input
            value={form.message}
            onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
            placeholder="Ex: Aproveite! Desconto especial por tempo limitado."
          />
        </div>

        <div className="sm:col-span-2 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                Aplicar em e-books
              </Label>
              <p className="text-xs text-muted-foreground">
                Escolha se o desconto vale para todos os e-books ou apenas alguns.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {([
                ["all", "Todos os e-books"],
                ["some", "Só alguns"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, ebookScope: value }))}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    form.ebookScope === value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {form.ebookScope === "some" && (
              <div className="space-y-2 rounded-xl border border-border/50 bg-muted/20 p-3">
                {ebookItems.map((item) => (
                  <label key={item.name} className="flex items-start gap-3 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.selectedEbookNames.includes(item.name)}
                      onChange={() => toggleName("selectedEbookNames", item.name)}
                      className="mt-0.5 h-4 w-4 accent-primary"
                    />
                    <span className="text-foreground">{item.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5">
                <ClipboardList className="h-3.5 w-3.5 text-primary" />
                Aplicar em atendimentos e protocolos
              </Label>
              <p className="text-xs text-muted-foreground">
                Escolha se o desconto vale para todos os atendimentos/protocolos ou apenas alguns.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {([
                ["all", "Todos os atendimentos e protocolos"],
                ["some", "Só alguns"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, serviceScope: value }))}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    form.serviceScope === value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {form.serviceScope === "some" && (
              <div className="space-y-2 rounded-xl border border-border/50 bg-muted/20 p-3">
                {serviceItems.map((item) => (
                  <label key={item.name} className="flex items-start gap-3 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.selectedServiceNames.includes(item.name)}
                      onChange={() => toggleName("selectedServiceNames", item.name)}
                      className="mt-0.5 h-4 w-4 accent-primary"
                    />
                    <span className="text-foreground">{item.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preview do banner</p>
        <div className="rounded-lg bg-gradient-to-r from-green-700 via-green-600 to-green-700 text-white text-sm px-4 py-2.5 flex items-center justify-center gap-3 flex-wrap">
          <Tag className="h-4 w-4" />
          <span className="font-medium">{form.message || "Mensagem do banner"}</span>
          <span className="font-bold text-green-100">{form.percentage}% OFF</span>
          <span className="bg-white/20 rounded-full px-3 py-0.5 font-mono font-semibold text-xs">
            ⏱ {form.durationHours}h 00m 00s
          </span>
        </div>
      </div>
    </AdminFormWrapper>
  );
};

export default AdminDesconto;
