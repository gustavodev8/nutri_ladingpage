import { useState } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import {
  Leaf,
  User,
  Sparkles,
  Layers,
  DollarSign,
  Clock,
  MessageSquareQuote,
  HelpCircle,
  MapPin,
  Megaphone,
  LogOut,
  Menu,
  X,
  ExternalLink,
  KeyRound,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useContent } from "@/contexts/ContentContext";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/admin/perfil", icon: User, label: "Perfil & Contato" },
  { to: "/admin/hero", icon: Sparkles, label: "Seção Principal" },
  { to: "/admin/sobre", icon: User, label: "Sobre Mim" },
  { to: "/admin/servicos", icon: Layers, label: "Serviços" },
  { to: "/admin/precos", icon: DollarSign, label: "Preços" },
  { to: "/admin/horarios", icon: Clock, label: "Horários" },
  { to: "/admin/depoimentos", icon: MessageSquareQuote, label: "Depoimentos" },
  { to: "/admin/faq", icon: HelpCircle, label: "FAQ" },
  { to: "/admin/modalidades", icon: Globe, label: "Modalidades" },
  { to: "/admin/cta", icon: Megaphone, label: "Chamada Final" },
  { to: "/admin/contato", icon: MapPin, label: "Endereço & Redes" },
  { to: "/admin/senha", icon: KeyRound, label: "Alterar Senha" },
];

const AdminLayout = () => {
  const { logout } = useAuth();
  const { content } = useContent();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/admin/login", { replace: true });
  };

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
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
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
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors px-3 py-2"
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
        <header className="sticky top-0 z-20 bg-card/90 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center justify-between lg:justify-end">
          <button
            className="lg:hidden text-foreground"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <p className="text-sm text-muted-foreground">
            Olá, <span className="font-medium text-foreground">Admin</span>
          </p>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8 max-w-4xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
