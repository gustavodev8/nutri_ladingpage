import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ImageUpload from "@/components/admin/ImageUpload";
import { useContent } from "@/contexts/ContentContext";
import {
  User, Stethoscope, Phone, CheckCircle, AlertCircle,
  Loader2, BadgeCheck, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const AdminPerfil = () => {
  const { content, updateContent, saveStatus } = useContent();
  const [form, setForm] = useState(content.identity);

  const set = (key: keyof typeof form, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    await updateContent((prev) => ({ ...prev, identity: form }));
  };

  const isSaving = saveStatus === "saving";

  const STATS = [
    { icon: Building2,   label: "Marca",        value: form.brandName    },
    { icon: User,        label: "Nutricionista", value: form.doctorName   },
    { icon: BadgeCheck,  label: "CRN",           value: form.crn          },
    { icon: Stethoscope, label: "Especialidade", value: form.specialty    },
  ];

  return (
    <div className="min-h-screen bg-background p-6 space-y-0">

      {/* ── Page header ───────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 pb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Perfil & Identidade
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Identidade visual, credenciais e contato da clínica
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {saveStatus === "saved" && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-primary font-medium">
              <CheckCircle className="h-3.5 w-3.5" />
              Salvo
            </span>
          )}
          {saveStatus === "error" && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-destructive font-medium">
              <AlertCircle className="h-3.5 w-3.5" />
              Erro ao salvar
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
            className="flex items-center gap-1.5 rounded-md"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSaving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>

      {/* ── Stat strip — live preview ──────────────────────────────────────────── */}
      <div className="flex items-stretch gap-0 border border-border rounded-md overflow-hidden mb-6">
        {STATS.map(({ icon: Icon, label, value }, i) => (
          <div
            key={label}
            className={cn(
              "flex-1 px-5 py-3.5 bg-card flex flex-col justify-center min-w-0",
              i > 0 && "border-l border-border"
            )}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="h-3 w-3 text-muted-foreground/60 shrink-0" />
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                {label}
              </p>
            </div>
            <p className="text-sm font-semibold text-foreground truncate">
              {value || <span className="text-muted-foreground/50 font-normal italic">não definido</span>}
            </p>
          </div>
        ))}
      </div>

      {/* ── Main grid ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">

        {/* ── Left column ─────────────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Foto */}
          <div className="border border-border rounded-md overflow-hidden bg-card">
            <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Foto principal
              </p>
            </div>
            <div className="p-5 space-y-2">
              <ImageUpload
                value={form.photoUrl}
                onChange={(url) => setForm((p) => ({ ...p, photoUrl: url }))}
              />
              <p className="text-xs text-muted-foreground">
                Aparece na seção principal do site.
              </p>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="border border-border rounded-md overflow-hidden bg-card">
            <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                WhatsApp
              </p>
            </div>
            <div className="p-5 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Número
                </Label>
                <Input
                  value={form.whatsappNumber}
                  onChange={(e) =>
                    set("whatsappNumber", e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="5575999999999"
                  className="font-mono rounded-md h-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                DDI + DDD + número.{" "}
                <code className="bg-muted px-1 rounded">5511999999999</code>
              </p>
              {form.whatsappNumber && (
                <a
                  href={`https://wa.me/${form.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Testar link →
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── Right column ────────────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Identidade */}
          <div className="border border-border rounded-md overflow-hidden bg-card">
            <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Identidade
              </p>
            </div>
            <div className="p-5 grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Nome da marca / clínica
                </Label>
                <Input
                  value={form.brandName}
                  onChange={(e) => set("brandName", e.target.value)}
                  placeholder="NutriVida"
                  className="rounded-md h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Nome da nutricionista
                </Label>
                <Input
                  value={form.doctorName}
                  onChange={(e) => set("doctorName", e.target.value)}
                  placeholder="Dra. Ana Silva"
                  className="rounded-md h-9"
                />
              </div>
            </div>
          </div>

          {/* Credenciais */}
          <div className="border border-border rounded-md overflow-hidden bg-card">
            <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
              <BadgeCheck className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Credenciais
              </p>
            </div>
            <div className="p-5 grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  CRN
                </Label>
                <Input
                  value={form.crn}
                  onChange={(e) => set("crn", e.target.value)}
                  placeholder="CRN-3 12345"
                  className="rounded-md h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Especialidade
                </Label>
                <Input
                  value={form.specialty}
                  onChange={(e) => set("specialty", e.target.value)}
                  placeholder="Nutricionista Clínica e Esportiva"
                  className="rounded-md h-9"
                />
              </div>
            </div>
          </div>

          {/* Tip card */}
          <div className="border border-border rounded-md overflow-hidden bg-muted/20 px-5 py-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Dica:</span>{" "}
              As alterações feitas aqui refletem diretamente no site público.
              O <span className="font-medium">nome da marca</span> aparece no cabeçalho, no rodapé e na aba do navegador.
              O <span className="font-medium">número do WhatsApp</span> é usado em todos os botões de contato.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPerfil;
