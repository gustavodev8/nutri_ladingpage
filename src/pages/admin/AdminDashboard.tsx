import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Sparkles,
  Layers,
  DollarSign,
  Clock,
  MessageSquareQuote,
  HelpCircle,
  MapPin,
  Megaphone,
  KeyRound,
  ExternalLink,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useContent } from "@/contexts/ContentContext";
import { toast } from "@/hooks/use-toast";

const CARDS = [
  { to: "/admin/perfil", icon: User, label: "Perfil & Identidade", desc: "Nome, CRN, especialidade, WhatsApp" },
  { to: "/admin/hero", icon: Sparkles, label: "Seção Principal", desc: "Título, subtítulo, tagline, badges" },
  { to: "/admin/sobre", icon: User, label: "Sobre Mim", desc: "Bio, estatísticas de carreira" },
  { to: "/admin/servicos", icon: Layers, label: "Serviços", desc: "Cards de serviços oferecidos" },
  { to: "/admin/precos", icon: DollarSign, label: "Preços & Planos", desc: "Valores e features de cada plano" },
  { to: "/admin/horarios", icon: Clock, label: "Horários", desc: "Agenda semanal de atendimento" },
  { to: "/admin/depoimentos", icon: MessageSquareQuote, label: "Depoimentos", desc: "Avaliações dos pacientes" },
  { to: "/admin/faq", icon: HelpCircle, label: "FAQ", desc: "Perguntas e respostas frequentes" },
  { to: "/admin/cta", icon: Megaphone, label: "Chamada Final", desc: "Título, subtítulo e botão final" },
  { to: "/admin/contato", icon: MapPin, label: "Endereço & Redes", desc: "Localização e redes sociais" },
  { to: "/admin/senha", icon: KeyRound, label: "Alterar Senha", desc: "Segurança do painel admin" },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { content, resetContent } = useContent();
  const [resetting, setResetting] = useState(false);

  const handleReset = () => {
    if (!confirm("Isso vai substituir TODO o conteúdo do site pelos dados do Dr. Fillipe David. Confirmar?")) return;
    setResetting(true);
    // defer o trabalho pesado para fora do evento de clique (evita travar a UI)
    setTimeout(async () => {
      await resetContent();
      toast({ title: "✅ Conteúdo atualizado!", description: "Dados do Dr. Fillipe David aplicados com sucesso." });
      setResetting(false);
    }, 50);
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="space-y-1">
        <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
          Bem-vindo, Admin!
        </h1>
        <p className="text-muted-foreground text-sm">
          <span className="font-medium text-foreground">{content.identity.brandName}</span> · Painel de controle
        </p>
      </div>

      {/* Reset to Fillipe data */}
      <div className="flex items-start sm:items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
        <RefreshCw className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-900">Aplicar dados reais do Dr. Fillipe David</p>
          <p className="text-xs text-amber-700">Substitui todos os textos de exemplo pelos dados reais: bio, planos, preços e FAQ.</p>
        </div>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-900 disabled:opacity-50 border border-amber-300 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Aplicar agora
        </button>
      </div>

      {/* Quick preview */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/20">
        <ExternalLink className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Visualizar site</p>
          <p className="text-xs text-muted-foreground truncate">As alterações salvas são aplicadas imediatamente.</p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs font-semibold text-primary hover:underline"
        >
          Abrir →
        </a>
      </div>

      {/* Cards grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map(({ to, icon: Icon, label, desc }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="group text-left p-5 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className="font-semibold text-foreground text-sm">{label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
