import { useState } from "react";
import { NavLink, useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  Leaf, User, Sparkles, Layers, ShoppingBag, BookOpen, TrendingUp,
  Clock, MessageSquareQuote, HelpCircle, MapPin, Megaphone, LogOut,
  Menu, ExternalLink, KeyRound, Globe, Loader2, ReceiptText,
  CalendarDays, CalendarCheck, ChevronDown, FileText, Star, Settings,
  Stethoscope, Users, LayoutDashboard, Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useContent } from "@/contexts/ContentContext";
import { cn } from "@/lib/utils";

// ─── Grupos de navegação ──────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: "Conteúdo do Site",
    icon: FileText,
    items: [
      { to: "/admin/hero",       icon: Sparkles,          label: "Seção Principal" },
      { to: "/admin/sobre",      icon: User,              label: "Sobre Mim"       },
      { to: "/admin/servicos",   icon: Layers,            label: "Serviços"        },
      { to: "/admin/modalidades",icon: Globe,             label: "Modalidades"     },
      { to: "/admin/horarios",   icon: Clock,             label: "Horários"        },
      { to: "/admin/faq",        icon: HelpCircle,        label: "FAQ"             },
      { to: "/admin/cta",        icon: Megaphone,         label: "Chamada Final"   },
    ],
  },
  {
    label: "Consultas & Produtos",
    icon: ShoppingBag,
    items: [
      { to: "/admin/loja",     icon: Store,       label: "Marketplace"       },
      { to: "/admin/precos",   icon: ShoppingBag, label: "Loja de Consultas" },
      { to: "/admin/produtos", icon: BookOpen,    label: "Produtos Digitais" },
    ],
  },
  {
    label: "Clínica",
    icon: Stethoscope,
    items: [
      { to: "/admin/pacientes",  icon: Users,     label: "Pacientes"  },
      { to: "/admin/alimentos",  icon: Leaf,       label: "Alimentos"  },
    ],
  },
  {
    label: "Agendamentos",
    icon: CalendarCheck,
    items: [
      { to: "/admin/disponibilidade", icon: CalendarDays,  label: "Disponibilidade"    },
      { to: "/admin/agendamentos",    icon: CalendarCheck, label: "Agendamentos"        },
      { to: "/admin/pagamentos",      icon: ReceiptText,   label: "Logs de Pagamento"  },
    ],
  },
  {
    label: "Prova Social",
    icon: Star,
    items: [
      { to: "/admin/resultados",  icon: TrendingUp,        label: "Resultados"  },
      { to: "/admin/depoimentos", icon: MessageSquareQuote, label: "Depoimentos" },
      { to: "/admin/blog",        icon: BookOpen,          label: "Blog"        },
    ],
  },
  {
    label: "Conta",
    icon: Settings,
    items: [
      { to: "/admin/perfil",  icon: User,     label: "Perfil & Contato"  },
      { to: "/admin/contato", icon: MapPin,   label: "Endereço & Redes"  },
      { to: "/admin/senha",   icon: KeyRound, label: "Alterar Senha"     },
    ],
  },
];

// ─── NavGroup component ───────────────────────────────────────────────────────

interface NavGroupProps {
  label: string;
  icon: React.ElementType;
  items: { to: string; icon: React.ElementType; label: string }[];
  defaultOpen: boolean;
  onItemClick: () => void;
}

const NavGroup = ({ label, icon: GroupIcon, items, defaultOpen, onItemClick }: NavGroupProps) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      {/* Group header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all duration-200 mt-1"
      >
        <span className="flex items-center gap-2">
          <GroupIcon className="h-3.5 w-3.5" />
          {label}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            open ? "rotate-0" : "-rotate-90"
          )}
        />
      </button>

      {/* Items */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="pl-2 mt-0.5 space-y-0.5">
          {items.map(({ to, icon: Icon, label: itemLabel }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onItemClick}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )
              }
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {itemLabel}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Layout ───────────────────────────────────────────────────────────────────

const AdminLayout = () => {
  const { logout } = useAuth();
  const { content, loading } = useContent();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/admin/login", { replace: true });
  };

  // Abre automaticamente o grupo que contém a rota atual
  const groupDefaultOpen = (items: { to: string }[]) =>
    items.some((item) => location.pathname.startsWith(item.to));

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-40 flex flex-col transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Leaf className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-display font-bold text-foreground text-sm leading-none">
                {content.identity.brandName}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Painel Admin</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {/* Dashboard */}
          <NavLink
            to="/admin"
            end
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 mb-2",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )
            }
          >
            <Leaf className="h-4 w-4 shrink-0" />
            Dashboard
          </NavLink>

          {/* Grupos colapsáveis */}
          {NAV_GROUPS.map((group) => (
            <NavGroup
              key={group.label}
              label={group.label}
              icon={group.icon}
              items={group.items}
              defaultOpen={groupDefaultOpen(group.items)}
              onItemClick={() => setSidebarOpen(false)}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-1">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors px-3 py-2 rounded-lg hover:bg-muted/40"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ver site
          </a>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/5 px-3"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-card/90 backdrop-blur-sm border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between lg:justify-end gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="lg:hidden flex items-center gap-2 flex-1 min-w-0">
            <span className="font-display font-bold text-sm text-foreground truncate">{content.identity.brandName}</span>
          </div>
          <p className="text-sm text-muted-foreground shrink-0 hidden sm:block">
            Olá, <span className="font-medium text-foreground">Admin</span>
          </p>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pb-8 max-w-4xl w-full mx-auto pb-24">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {/* ── Mobile Bottom Navigation Bar ──────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/98 backdrop-blur-md border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-stretch h-[58px]">
          {/* Dashboard */}
          <NavLink to="/admin" end
            className={({ isActive }) =>
              cn("flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors active:opacity-70",
                isActive ? "text-primary" : "text-muted-foreground")
            }
          >
            <LayoutDashboard className="h-[22px] w-[22px]" />
            <span>Início</span>
          </NavLink>

          {/* Pacientes */}
          <NavLink to="/admin/pacientes"
            className={({ isActive }) =>
              cn("flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors active:opacity-70",
                isActive ? "text-primary" : "text-muted-foreground")
            }
          >
            <Users className="h-[22px] w-[22px]" />
            <span>Pacientes</span>
          </NavLink>

          {/* Agendamentos */}
          <NavLink to="/admin/agendamentos"
            className={({ isActive }) =>
              cn("flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors active:opacity-70",
                isActive ? "text-primary" : "text-muted-foreground")
            }
          >
            <CalendarCheck className="h-[22px] w-[22px]" />
            <span>Agenda</span>
          </NavLink>

          {/* Ver site */}
          <a href="/" target="_blank" rel="noopener noreferrer"
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground transition-colors active:opacity-70"
          >
            <Globe className="h-[22px] w-[22px]" />
            <span>Site</span>
          </a>

          {/* Menu (opens sidebar) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground transition-colors active:opacity-70"
          >
            <Menu className="h-[22px] w-[22px]" />
            <span>Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default AdminLayout;
