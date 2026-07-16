import { useState } from "react";
import { Power, Tag, Clock, Percent, MessageSquare, BookOpen, ClipboardList, SlidersHorizontal } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AdminFormWrapper from "@/components/admin/AdminFormWrapper";
import { useContent, type SiteContent } from "@/contexts/ContentContext";
import { toast } from "@/hooks/use-toast";

type DiscountConfig = SiteContent["discount"];
type DiscountArea = "ebook" | "service";
type Scope = "all" | "some";

interface DiscountItem {
  name: string;
  desc?: string;
  price?: string;
}

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(99, Math.max(0, value));
}

function getLegacyPercentage(config: DiscountConfig) {
  return Math.max(config.ebookPercentage ?? config.percentage, config.servicePercentage ?? config.percentage);
}

function syncLegacyPercentage(config: DiscountConfig): DiscountConfig {
  return {
    ...config,
    percentage: getLegacyPercentage(config),
  };
}

function normalizeDiscountConfig(discount: DiscountConfig): DiscountConfig {
  const percentage = discount.percentage ?? 0;

  return syncLegacyPercentage({
    ...discount,
    ebookPercentage: discount.ebookPercentage ?? percentage,
    servicePercentage: discount.servicePercentage ?? percentage,
    ebookItemPercentages: discount.ebookItemPercentages ?? {},
    serviceItemPercentages: discount.serviceItemPercentages ?? {},
    durationValue: discount.durationValue ?? discount.durationHours ?? 8,
    durationUnit: discount.durationUnit ?? "hours",
    activatedAt: discount.activatedAt ?? null,
  });
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

function getAreaLabels(area: DiscountArea) {
  return area === "ebook"
    ? {
        icon: BookOpen,
        title: "E-books",
        description: "Materiais digitais, combos e produtos da loja.",
        defaultLabel: "Desconto padrão em e-books (%)",
        allLabel: "Todos os e-books",
        someLabel: "Escolher e-books específicos",
        emptyText: "Use 0 no padrão e marque só os produtos que entram na oferta.",
      }
    : {
        icon: ClipboardList,
        title: "Consultas e protocolos",
        description: "Consultas avulsas, pacotes e protocolos de acompanhamento.",
        defaultLabel: "Desconto padrão em consultas (%)",
        allLabel: "Todos os atendimentos",
        someLabel: "Escolher consultas específicas",
        emptyText: "Use 0 no padrão e marque só as consultas que entram na oferta.",
      };
}

function getAreaFields(area: DiscountArea) {
  return area === "ebook"
    ? {
        percentage: "ebookPercentage" as const,
        scope: "ebookScope" as const,
        selectedNames: "selectedEbookNames" as const,
        itemPercentages: "ebookItemPercentages" as const,
      }
    : {
        percentage: "servicePercentage" as const,
        scope: "serviceScope" as const,
        selectedNames: "selectedServiceNames" as const,
        itemPercentages: "serviceItemPercentages" as const,
      };
}

const AdminDesconto = () => {
  const { content, updateContent } = useContent();
  const [form, setForm] = useState<DiscountConfig>(() => normalizeDiscountConfig(content.discount));

  const ebookItems: DiscountItem[] = content.produtosDigitais.items;
  const serviceItems: DiscountItem[] = content.loja.plans;

  const setNumericField = (
    field: "ebookPercentage" | "servicePercentage" | "durationValue",
    value: number,
  ) => {
    const nextValue = field === "durationValue" ? Math.max(1, value) : clampPercentage(value);
    setForm((prev) => syncLegacyPercentage({ ...prev, [field]: nextValue }));
  };

  const setAreaScope = (area: DiscountArea, scope: Scope) => {
    const fields = getAreaFields(area);
    setForm((prev) => ({ ...prev, [fields.scope]: scope }));
  };

  const toggleTarget = (area: DiscountArea, name: string) => {
    const fields = getAreaFields(area);
    setForm((prev) => {
      const selectedNames = prev[fields.selectedNames];
      const isSelected = selectedNames.includes(name);
      const nextSelectedNames = isSelected
        ? selectedNames.filter((item) => item !== name)
        : [...selectedNames, name];
      const nextItemPercentages = { ...prev[fields.itemPercentages] };

      if (isSelected) {
        delete nextItemPercentages[name];
      } else if (nextItemPercentages[name] === undefined) {
        nextItemPercentages[name] = prev[fields.percentage];
      }

      return {
        ...prev,
        [fields.selectedNames]: nextSelectedNames,
        [fields.itemPercentages]: nextItemPercentages,
      };
    });
  };

  const setTargetPercentage = (area: DiscountArea, name: string, rawValue: string) => {
    const fields = getAreaFields(area);
    setForm((prev) => {
      const nextItemPercentages = { ...prev[fields.itemPercentages] };

      if (rawValue === "") {
        delete nextItemPercentages[name];
      } else {
        nextItemPercentages[name] = clampPercentage(Number(rawValue));
      }

      return syncLegacyPercentage({ ...prev, [fields.itemPercentages]: nextItemPercentages });
    });
  };

  const activate = async () => {
    const durationHours = getDurationHours(form);
    const activatedAt = new Date().toISOString();
    const updated = syncLegacyPercentage({
      ...form,
      active: true,
      durationHours,
      activatedAt,
      expiresAt: null,
    });

    setForm(updated);
    await updateContent((prev) => ({ ...prev, discount: updated }));
    toast({
      title: "Desconto ativado!",
      description: `Cada visitante terá ${formatDurationLabel(form)} a partir da primeira visita.`,
    });
  };

  const deactivate = async () => {
    const updated = syncLegacyPercentage({ ...form, active: false, activatedAt: null, expiresAt: null });
    setForm(updated);
    await updateContent((prev) => ({ ...prev, discount: updated }));
    toast({ title: "Desconto desativado." });
  };

  const handleSave = async () => {
    const updated = syncLegacyPercentage({ ...form, durationHours: getDurationHours(form) });
    setForm(updated);
    await updateContent((prev) => ({ ...prev, discount: updated }));
    toast({ title: "Configuração de desconto salva." });
  };

  const renderAreaCard = (area: DiscountArea, items: DiscountItem[]) => {
    const labels = getAreaLabels(area);
    const fields = getAreaFields(area);
    const Icon = labels.icon;
    const scope = form[fields.scope];
    const defaultPercentage = form[fields.percentage];
    const itemPercentages = form[fields.itemPercentages];
    const selectedNames = form[fields.selectedNames];

    return (
      <section className="space-y-4 rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5 text-primary" />
              {labels.title}
            </Label>
            <p className="text-xs text-muted-foreground">{labels.description}</p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            {scope === "all" ? "Padrão geral" : `${selectedNames.length} selecionado${selectedNames.length === 1 ? "" : "s"}`}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-[160px_1fr]">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Percent className="h-3.5 w-3.5" />
              {labels.defaultLabel}
            </Label>
            <Input
              type="number"
              min="0"
              max="99"
              value={defaultPercentage}
              onChange={(e) => setNumericField(fields.percentage, Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">{labels.emptyText}</p>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {([
                ["all", labels.allLabel],
                ["some", labels.someLabel],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAreaScope(area, value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    scope === value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="overflow-hidden rounded-lg border border-border/60">
              <div className="grid grid-cols-[1fr_88px] gap-3 bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground sm:grid-cols-[24px_1fr_96px]">
                <span className="hidden sm:block">{scope === "some" ? "Usar" : ""}</span>
                <span>Item</span>
                <span className="text-right">%</span>
              </div>

              <div className="divide-y divide-border/60">
                {items.map((item) => {
                  const selected = selectedNames.includes(item.name);
                  const disabled = scope === "some" && !selected;
                  const overrideValue = itemPercentages[item.name];
                  const inputValue = scope === "all"
                    ? overrideValue ?? ""
                    : overrideValue ?? defaultPercentage;

                  return (
                    <div
                      key={item.name}
                      className={`grid grid-cols-[1fr_88px] gap-3 px-3 py-3 sm:grid-cols-[24px_1fr_96px] ${
                        disabled ? "bg-muted/20 text-muted-foreground" : "bg-background"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={scope === "all" || selected}
                        disabled={scope === "all"}
                        onChange={() => toggleTarget(area, item.name)}
                        className="hidden h-4 w-4 accent-primary sm:mt-1 sm:block"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                        {(item.price || item.desc) && (
                          <p className="truncate text-xs text-muted-foreground">{item.price || item.desc}</p>
                        )}
                        {scope === "some" && (
                          <button
                            type="button"
                            onClick={() => toggleTarget(area, item.name)}
                            className={`mt-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:hidden ${
                              selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border/60 text-muted-foreground"
                            }`}
                          >
                            {selected ? "Selecionado" : "Selecionar"}
                          </button>
                        )}
                      </div>
                      <Input
                        type="number"
                        min="0"
                        max="99"
                        placeholder={`${defaultPercentage}`}
                        value={inputValue}
                        disabled={disabled}
                        onChange={(e) => setTargetPercentage(area, item.name, e.target.value)}
                        className="text-right"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <SlidersHorizontal className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Em "todos", deixe o campo do item vazio para usar o padrão. Em "específicos", marque só o que entra e defina o percentual de cada um.
            </p>
          </div>
        </div>
      </section>
    );
  };

  const activeAndValid = form.active;

  return (
    <AdminFormWrapper
      title="Desconto Global"
      description="Configure uma campanha temporária com descontos gerais ou específicos por item. Cada visitante vê a própria contagem regressiva iniciando na primeira visita."
      onSave={handleSave}
    >
      <div
        className={`flex items-center justify-between gap-4 rounded-xl border p-5 ${
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

      <div className="grid gap-6 rounded-xl border border-border/60 bg-muted/20 p-4 sm:grid-cols-2">
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
              onChange={(e) => setNumericField("durationValue", Number(e.target.value))}
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
          <p className="text-xs text-muted-foreground">O prazo começa quando a pessoa entra no site pela primeira vez.</p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-primary" />
            Mensagem do banner
          </Label>
          <Input
            value={form.message}
            onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
            placeholder="Ex: Aproveite! Desconto especial por tempo limitado."
          />
          <p className="text-xs text-muted-foreground">O banner mostra o maior desconto ativo em cada categoria.</p>
        </div>
      </div>

      <div className="space-y-6">
        {renderAreaCard("ebook", ebookItems)}
        {renderAreaCard("service", serviceItems)}
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview do banner</p>
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-lg bg-gradient-to-r from-green-700 via-green-600 to-green-700 px-4 py-2.5 text-sm text-white">
          <Tag className="h-4 w-4" />
          <span className="font-medium">{form.message || "Mensagem do banner"}</span>
          <span className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-bold">
            E-books até {Math.max(form.ebookPercentage, ...Object.values(form.ebookItemPercentages))}% OFF
          </span>
          <span className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-bold">
            Consultas até {Math.max(form.servicePercentage, ...Object.values(form.serviceItemPercentages))}% OFF
          </span>
          <span className="rounded-full bg-white/20 px-3 py-0.5 font-mono text-xs font-semibold">
            {formatDurationLabel(form)} por visitante
          </span>
        </div>
      </div>
    </AdminFormWrapper>
  );
};

export default AdminDesconto;
