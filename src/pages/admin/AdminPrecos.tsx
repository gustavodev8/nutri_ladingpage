import { useState } from "react";
import { Plus, Trash2, Star } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import AdminFormWrapper from "@/components/admin/AdminFormWrapper";
import { useContent, type SiteContent } from "@/contexts/ContentContext";

type Plan = SiteContent["loja"]["plans"][number];
type LojaContent = SiteContent["loja"];

const AdminPrecos = () => {
  const { content, updateContent } = useContent();
  const [form, setForm] = useState<LojaContent>(content.loja);

  const setHeader = (key: "sectionTitle" | "sectionSubtitle", value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const setPlan = <K extends keyof Plan>(index: number, field: K, value: Plan[K]) => {
    setForm((p) => {
      const plans = [...p.plans];
      plans[index] = { ...plans[index], [field]: value };
      if (field === "popular" && value === true) {
        plans.forEach((_, i) => { if (i !== index) plans[i] = { ...plans[i], popular: false }; });
      }
      return { ...p, plans };
    });
  };

  const addPlan = () => {
    setForm((p) => ({
      ...p,
      plans: [
        ...p.plans,
        {
          name: "Novo Plano",
          desc: "Descrição do plano",
          price: "R$ 0",
          priceAmount: 0,
          badge: "",
          popular: false,
          whatsappMessage: "Olá! Tenho interesse neste plano.",
          sessionCount: 1,
          returnCount: 0,
          consultationType: "both" as const,
        },
      ],
    }));
  };

  const removePlan = (index: number) => {
    setForm((p) => ({ ...p, plans: p.plans.filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    await updateContent((prev) => ({ ...prev, loja: form }));
  };

  return (
    <AdminFormWrapper
      title="Loja de Consultas"
      description="Configure os planos exibidos na seção de consultas."
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

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-2">
                  <Label>Nome do plano</Label>
                  <Input value={plan.name} onChange={(e) => setPlan(i, "name", e.target.value)} />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label>Descrição</Label>
                  <Input value={plan.desc} onChange={(e) => setPlan(i, "desc", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Preço (ex: R$ 250)</Label>
                  <Input value={plan.price} onChange={(e) => setPlan(i, "price", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Valor numérico (para cobrança)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={plan.priceAmount ?? 0}
                    onChange={(e) => setPlan(i, "priceAmount", Number(e.target.value))}
                    placeholder="ex: 250.00"
                  />
                  <p className="text-xs text-muted-foreground">Usado para processar o pagamento. Ex: 250 ou 150.50</p>
                </div>
                <div className="space-y-2">
                  <Label>Badge (ex: Mais Escolhido)</Label>
                  <Input
                    value={plan.badge}
                    onChange={(e) => setPlan(i, "badge", e.target.value)}
                    placeholder="Deixe em branco para ocultar"
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label>Mensagem WhatsApp</Label>
                  <Input
                    value={plan.whatsappMessage}
                    onChange={(e) => setPlan(i, "whatsappMessage", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nº de consultas</Label>
                  <Input
                    type="number"
                    min={1}
                    value={plan.sessionCount ?? 1}
                    onChange={(e) => setPlan(i, "sessionCount", Math.max(1, Number(e.target.value)))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nº de retornos</Label>
                  <Input
                    type="number"
                    min={0}
                    value={plan.returnCount ?? 0}
                    onChange={(e) => setPlan(i, "returnCount", Math.max(0, Number(e.target.value)))}
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label>Tipo de consulta</Label>
                  <select
                    value={plan.consultationType ?? "both"}
                    onChange={(e) => setPlan(i, "consultationType", e.target.value as "both" | "online" | "presencial")}
                    className="w-full h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="both">Ambos</option>
                    <option value="online">Somente Online</option>
                    <option value="presencial">Somente Presencial</option>
                  </select>
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
