import { useState } from "react";
import { Power, Tag, Clock, Percent, MessageSquare, BookOpen, ClipboardList } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AdminFormWrapper from "@/components/admin/AdminFormWrapper";
import { useContent, type SiteContent } from "@/contexts/ContentContext";
import { toast } from "@/hooks/use-toast";

type DiscountConfig = SiteContent["discount"];

function normalizeDiscountConfig(discount: DiscountConfig): DiscountConfig {
  return {
    ...discount,
    durationValue: discount.durationValue ?? discount.durationHours ?? 8,
    durationUnit: discount.durationUnit ?? "hours",
    activatedAt: discount.activatedAt ?? null,
  };
}

function getDurationHours(config: DiscountConfig) {
  return config.durationUnit === "days"
    ? config.durationValue * 24
    : config.durationValue;
}

function formatDurationLabel(config: DiscountConfig) {
  return config.durationUnit === "days"
    ? `${config.durationValue} dia${config.durationValue > 1 ? "s" : ""}`
    : `${config.durationValue}h`;
}

const AdminDesconto = () => {
  const { content, updateContent } = useContent();
  const [form, setForm] = useState<DiscountConfig>(() => normalizeDiscountConfig(content.discount));
  const ebookItems = content.produtosDigitais.items;
  const serviceItems = content.loja.plans;

  const toggleName = (field: "selectedEbookNames" | "selectedServiceNames", value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((item) => item !== value)
        : [...prev[field], value],
    }));
  };

  const activate = async () => {
    const durationHours = getDurationHours(form);
    const activatedAt = new Date().toISOString();
    const updated: DiscountConfig = {
      ...form,
      active: true,
      durationHours,
      activatedAt,
      expiresAt: null,
    };

    setForm(updated);
    await updateContent((prev) => ({ ...prev, discount: updated }));
    toast({
      title: "Desconto ativado!",
      description: `Cada visitante terá ${formatDurationLabel(form)} a partir da primeira visita.`,
    });
  };

  const deactivate = async () => {
    const updated: DiscountConfig = { ...form, active: false, activatedAt: null, expiresAt: null };
    setForm(updated);
    await updateContent((prev) => ({ ...prev, discount: updated }));
    toast({ title: "Desconto desativado." });
  };

  const handleSave = async () => {
    const updated: DiscountConfig = { ...form, durationHours: getDurationHours(form) };
    setForm(updated);
    await updateContent((prev) => ({ ...prev, discount: updated }));
    toast({ title: "Configuração de desconto salva." });
  };

  const activeAndValid = form.active;

  return (
    <AdminFormWrapper
      title="Desconto Global"
      description="Ative uma oferta temporária e escolha se ela vale para todos ou apenas alguns e-books, atendimentos e protocolos. Cada visitante vê a própria contagem regressiva iniciando na primeira visita."
      onSave={handleSave}
    >
      <div
        className={`flex items-center justify-between gap-4 rounded-2xl border p-5 ${
          activeAndValid
            ? "border-green-200 bg-green-50"
            : "border-border/50 bg-muted/40"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`h-3 w-3 rounded-full ${
              activeAndValid ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30"
            }`}
          />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {activeAndValid ? "Desconto ativo" : "Desconto inativo"}
            </p>
            {activeAndValid && form.activatedAt && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Janela individual de {formatDurationLabel(form)} por visitante. Campanha iniciada em{" "}
                {new Date(form.activatedAt).toLocaleString("pt-BR")}
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
              className="gap-1.5 bg-green-600 text-white hover:bg-green-700"
            >
              <Power className="h-4 w-4" />
              Ativar agora
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
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
          <p className="text-xs text-muted-foreground">Ex: 15 -&gt; 15% de desconto nos itens selecionados.</p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" />
            Duração por visitante
          </Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              max={form.durationUnit === "days" ? "30" : "72"}
              value={form.durationValue}
              onChange={(e) => setForm((p) => ({ ...p, durationValue: Number(e.target.value) }))}
            />
            <select
              value={form.durationUnit}
              onChange={(e) => setForm((p) => ({ ...p, durationUnit: e.target.value as "hours" | "days" }))}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="hours">Horas</option>
              <option value="days">Dias</option>
            </select>
          </div>
          <p className="text-xs text-muted-foreground">Quanto tempo cada pessoa terá de desconto a partir da primeira visita.</p>
        </div>

        <div className="space-y-2 sm:col-span-2">
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

        <div className="grid gap-6 sm:col-span-2 lg:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-4">
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
                <p className="text-xs text-muted-foreground">
                  Se nenhum e-book for marcado, o desconto não será aplicado a nenhum e-book.
                </p>
                {ebookItems.map((item) => (
                  <label key={item.name} className="flex cursor-pointer items-start gap-3 text-sm">
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

          <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-4">
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
                <p className="text-xs text-muted-foreground">
                  Se nenhum atendimento ou protocolo for marcado, o desconto não será aplicado nessa categoria.
                </p>
                {serviceItems.map((item) => (
                  <label key={item.name} className="flex cursor-pointer items-start gap-3 text-sm">
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

      <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview do banner</p>
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-lg bg-gradient-to-r from-green-700 via-green-600 to-green-700 px-4 py-2.5 text-sm text-white">
          <Tag className="h-4 w-4" />
          <span className="font-medium">{form.message || "Mensagem do banner"}</span>
          <span className="font-bold text-green-100">{form.percentage}% OFF</span>
          <span className="rounded-full bg-white/20 px-3 py-0.5 font-mono text-xs font-semibold">
            {formatDurationLabel(form)} por visitante
          </span>
        </div>
      </div>
    </AdminFormWrapper>
  );
};

export default AdminDesconto;
