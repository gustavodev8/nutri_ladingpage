import { useState } from "react";
import { Plus, Trash2, Star } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import AdminFormWrapper from "@/components/admin/AdminFormWrapper";
import { useContent, type SiteContent } from "@/contexts/ContentContext";

type Plan = SiteContent["pricing"]["plans"][number];
type PricingContent = SiteContent["pricing"];

const AdminPrecos = () => {
  const { content, updateContent } = useContent();
  const [form, setForm] = useState<PricingContent>(content.pricing);

  const setHeader = (key: "title" | "subtitle", value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const setPlan = <K extends keyof Plan>(index: number, field: K, value: Plan[K]) => {
    setForm((p) => {
      const plans = [...p.plans];
      plans[index] = { ...plans[index], [field]: value };
      // Only one plan can be "popular"
      if (field === "popular" && value === true) {
        plans.forEach((_, i) => { if (i !== index) plans[i] = { ...plans[i], popular: false }; });
      }
      return { ...p, plans };
    });
  };

  const setFeature = (planIndex: number, featureIndex: number, value: string) => {
    setForm((p) => {
      const plans = [...p.plans];
      const features = [...plans[planIndex].features];
      features[featureIndex] = value;
      plans[planIndex] = { ...plans[planIndex], features };
      return { ...p, plans };
    });
  };

  const addFeature = (planIndex: number) => {
    setForm((p) => {
      const plans = [...p.plans];
      plans[planIndex] = { ...plans[planIndex], features: [...plans[planIndex].features, "Nova feature"] };
      return { ...p, plans };
    });
  };

  const removeFeature = (planIndex: number, featureIndex: number) => {
    setForm((p) => {
      const plans = [...p.plans];
      plans[planIndex] = {
        ...plans[planIndex],
        features: plans[planIndex].features.filter((_, i) => i !== featureIndex),
      };
      return { ...p, plans };
    });
  };

  const addPlan = () => {
    setForm((p) => ({
      ...p,
      plans: [
        ...p.plans,
        {
          title: "Novo Plano",
          price: "R$ 0",
          period: "por consulta",
          features: ["Feature 1"],
          popular: false,
          whatsappMessage: "Olá! Tenho interesse neste plano.",
        },
      ],
    }));
  };

  const removePlan = (index: number) => {
    setForm((p) => ({ ...p, plans: p.plans.filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    await updateContent((prev) => ({ ...prev, pricing: form }));
  };

  return (
    <AdminFormWrapper
      title="Planos & Preços"
      description="Configure os planos exibidos na seção de investimento."
      onSave={handleSave}
    >
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Título da seção</Label>
          <Input value={form.title} onChange={(e) => setHeader("title", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Subtítulo</Label>
          <Input value={form.subtitle} onChange={(e) => setHeader("subtitle", e.target.value)} />
        </div>
      </div>

      <div className="border-t border-border pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Planos</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addPlan}
            className="gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
          >
            <Plus className="h-4 w-4" />
            Adicionar plano
          </Button>
        </div>

        <div className="space-y-4">
          {form.plans.map((plan, i) => (
            <div
              key={i}
              className={`p-5 rounded-2xl border space-y-5 transition-colors ${
                plan.popular
                  ? "bg-primary/5 border-primary/30"
                  : "bg-muted/40 border-border/50"
              }`}
            >
              {/* Plan header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-muted-foreground">Plano {i + 1}</span>
                  {plan.popular && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      <Star className="h-3 w-3" />
                      Destaque
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                      checked={plan.popular}
                      onCheckedChange={(v) => setPlan(i, "popular", v)}
                    />
                    <span className="text-xs text-muted-foreground">Destaque</span>
                  </label>
                  {form.plans.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePlan(i)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="sm:col-span-3 space-y-2">
                  <Label>Nome do plano</Label>
                  <Input
                    value={plan.title}
                    onChange={(e) => setPlan(i, "title", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preço (ex: R$ 200)</Label>
                  <Input
                    value={plan.price}
                    onChange={(e) => setPlan(i, "price", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Período (ex: por consulta)</Label>
                  <Input
                    value={plan.period}
                    onChange={(e) => setPlan(i, "period", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Msg WhatsApp</Label>
                  <Input
                    value={plan.whatsappMessage}
                    onChange={(e) => setPlan(i, "whatsappMessage", e.target.value)}
                    placeholder="Olá! Tenho interesse neste plano."
                  />
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Funcionalidades incluídas</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addFeature(i)}
                    className="h-7 gap-1 text-xs text-primary"
                  >
                    <Plus className="h-3 w-3" />
                    Adicionar
                  </Button>
                </div>
                <div className="space-y-2">
                  {plan.features.map((f, j) => (
                    <div key={j} className="flex gap-2">
                      <Input
                        value={f}
                        onChange={(e) => setFeature(i, j, e.target.value)}
                        className="text-sm"
                      />
                      {plan.features.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFeature(i, j)}
                          className="h-10 w-10 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminFormWrapper>
  );
};

export default AdminPrecos;
