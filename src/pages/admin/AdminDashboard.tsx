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
  ChevronRight,
} from "lucide-react";
import { useContent } from "@/contexts/ContentContext";

const CARDS = [
  { to: "/admin/perfil",      icon: User,               label: "Perfil & Identidade",  desc: "Nome, CRN, especialidade, WhatsApp" },
  { to: "/admin/hero",        icon: Sparkles,            label: "Seção Principal",       desc: "Título, subtítulo, tagline, badges" },
  { to: "/admin/sobre",       icon: User,                label: "Sobre Mim",             desc: "Bio, estatísticas de carreira" },
  { to: "/admin/servicos",    icon: Layers,              label: "Serviços",              desc: "Cards de serviços oferecidos" },
  { to: "/admin/precos",      icon: DollarSign,          label: "Preços & Planos",       desc: "Valores e features de cada plano" },
  { to: "/admin/horarios",    icon: Clock,               label: "Horários",              desc: "Agenda semanal de atendimento" },
  { to: "/admin/depoimentos", icon: MessageSquareQuote,  label: "Depoimentos",           desc: "Avaliações dos pacientes" },
  { to: "/admin/faq",         icon: HelpCircle,          label: "FAQ",                   desc: "Perguntas e respostas frequentes" },
  { to: "/admin/cta",         icon: Megaphone,           label: "Chamada Final",         desc: "Título, subtítulo e botão final" },
  { to: "/admin/contato",     icon: MapPin,              label: "Endereço & Redes",      desc: "Localização e redes sociais" },
  { to: "/admin/senha",       icon: KeyRound,            label: "Alterar Senha",         desc: "Segurança do painel admin" },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { content } = useContent();

  return (
    <div className="space-y-6">

      {/* ── Cabeçalho ───────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">
          Bem-vindo, Admin
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {content.identity.brandName} · Painel de controle
        </p>
      </div>

      {/* ── Barra utilitária ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Ver site */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-4 py-3 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors"
        >
          <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0 sm:flex-none">
            <p className="text-sm font-medium text-foreground leading-none">Visualizar site</p>
            <p className="text-xs text-muted-foreground mt-0.5">Abrir em nova aba</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
        </a>
      </div>

      {/* ── Grade de cards ──────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CARDS.map(({ to, icon: Icon, label, desc }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="group text-left px-4 py-4 rounded-lg border border-border bg-card hover:bg-muted/30 hover:border-border/80 transition-all duration-150"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md border border-border bg-muted/50 flex items-center justify-center shrink-0 group-hover:bg-muted transition-colors">
                <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground leading-none">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{desc}</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 group-hover:text-muted-foreground transition-colors" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
