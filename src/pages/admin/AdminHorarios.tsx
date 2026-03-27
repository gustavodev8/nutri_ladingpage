import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import AdminFormWrapper from "@/components/admin/AdminFormWrapper";
import { useContent, type SiteContent } from "@/contexts/ContentContext";

type ScheduleContent = SiteContent["schedule"];

const AdminHorarios = () => {
  const { content, updateContent } = useContent();
  const [form, setForm] = useState<ScheduleContent>(content.schedule);

  const setTitle = (value: string) => {
    setForm((p) => ({ ...p, title: value }));
  };

  const setDay = (index: number, field: "hours" | "open", value: string | boolean) => {
    setForm((p) => {
      const days = [...p.days];
      if (field === "open") {
        days[index] = {
          ...days[index],
          open: value as boolean,
          hours: value ? days[index].hours || "" : "Fechado",
        };
      } else {
        days[index] = { ...days[index], [field]: value };
      }
      return { ...p, days };
    });
  };

  const handleSave = async () => {
    await updateContent((prev) => ({ ...prev, schedule: form }));
  };

  return (
    <AdminFormWrapper
      title="Horários de Atendimento"
      description="Configure os horários exibidos na agenda semanal."
      onSave={handleSave}
    >
      <div className="space-y-2 max-w-sm">
        <Label>Título da seção</Label>
        <Input value={form.title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="border-t border-border pt-6 space-y-3">
        <p className="text-sm font-semibold text-foreground">Dias da semana</p>
        <div className="space-y-2">
          {form.days.map((day, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors ${
                day.open ? "bg-muted/40 border-border/50" : "bg-muted/20 border-border/30 opacity-70"
              }`}
            >
              <div className="flex items-center gap-3 w-40 shrink-0">
                <Switch
                  checked={day.open}
                  onCheckedChange={(v) => setDay(i, "open", v)}
                />
                <span className="text-sm font-medium text-foreground">{day.day}</span>
              </div>
              <Input
                value={day.hours}
                onChange={(e) => setDay(i, "hours", e.target.value)}
                disabled={!day.open}
                placeholder={day.open ? "8h às 12h / 14h às 18h" : "Fechado"}
                className="text-sm flex-1"
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Use o toggle para marcar o dia como aberto ou fechado.
        </p>
      </div>
    </AdminFormWrapper>
  );
};

export default AdminHorarios;
