import { useState, useEffect } from "react";
import { Menu, X, Leaf, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useContent } from "@/contexts/ContentContext";

interface NavLink {
  href: string;
  label: string;
  type: "page" | "anchor";
}

const NAV_LINKS: NavLink[] = [
  { href: "#sobre",       label: "Sobre",       type: "anchor" },
  { href: "#servicos",    label: "Serviços",     type: "anchor" },
  { href: "#atendimento", label: "Atendimento",  type: "anchor" },
  { href: "/consultas",   label: "Consultas",    type: "page" },
  { href: "/loja",        label: "Loja",         type: "page" },
  { href: "/resultados",  label: "Resultados",   type: "page" },
  { href: "/blog",        label: "Blog",         type: "page" },
  { href: "#faq",         label: "FAQ",          type: "anchor" },
];

function useCountdown(expiresAt: string | null) {
  const getRemaining = () => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return diff > 0 ? diff : 0;
  };
  const [remaining, setRemaining] = useState(getRemaining);
  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => {
      const r = getRemaining();
      setRemaining(r);
      if (r === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return remaining;
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}h ${p(m)}m ${p(sec)}s` : `${p(m)}m ${p(sec)}s`;
}

const Navbar = () => {
  const { content } = useContent();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const { active, percentage, expiresAt, message } = content.discount;
  const remaining = useCountdown(expiresAt);
  const bannerVisible =
    active && !bannerDismissed &&
    (expiresAt === null || (remaining !== null && remaining > 0));
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { closeMenu(); }, [location.pathname]);

  const closeMenu = () => {
    if (!isOpen) return;
    setIsClosing(true);
    setTimeout(() => { setIsOpen(false); setIsClosing(false); }, 180);
  };

  const toggleMenu = () => {
    if (isOpen) closeMenu();
    else setIsOpen(true);
  };

  const scrollToAnchor = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  };

  const handleNavClick = (link: NavLink, e: React.MouseEvent) => {
    e.preventDefault();
    closeMenu();

    if (link.type === "page") {
      navigate(link.href);
      return;
    }

    // anchor link
    const id = link.href.replace("#", "");
    if (location.pathname === "/") {
      scrollToAnchor(id);
    } else {
      // navigate home first, then scroll after render
      navigate("/");
      setTimeout(() => scrollToAnchor(id), 300);
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate("/");
    }
  };

  const handleAgendarClick = () => {
    closeMenu();
    navigate("/consultas");
  };

  const isActivePage = (href: string) => location.pathname === href;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-card/95 backdrop-blur-md shadow-md" : "bg-transparent"
      }`}
    >
      {bannerVisible && (
        <div className="relative bg-gradient-to-r from-green-700 via-green-600 to-green-700 text-white text-sm">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-2 flex-wrap">
            <Tag className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium text-xs sm:text-sm">{message}</span>
            <span className="font-bold text-green-100 text-xs sm:text-sm">{percentage}% OFF</span>
            {expiresAt && remaining !== null && remaining > 0 && (
              <span className="bg-white/20 rounded-full px-2.5 py-0.5 font-mono font-semibold text-xs tracking-wider">
                ⏱ {formatTime(remaining)}
              </span>
            )}
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div className="container mx-auto px-4 flex items-center justify-between h-16 lg:h-20">
        <a href="/" onClick={handleLogoClick} className="flex items-center gap-2">
          <Leaf className="h-7 w-7 text-primary" />
          <span className="font-display text-xl font-bold text-foreground">
            {content.identity.brandName}
          </span>
        </a>

        <nav className="hidden lg:flex items-center gap-6">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => handleNavClick(l, e)}
              className={`text-sm font-medium transition-colors ${
                l.type === "page" && isActivePage(l.href)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              {l.label}
            </a>
          ))}
          <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={handleAgendarClick}>
            Agendar Consulta
          </Button>
        </nav>

        <button
          className="lg:hidden text-foreground relative w-6 h-6"
          onClick={toggleMenu}
          aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
        >
          <Menu className={`absolute inset-0 h-6 w-6 transition-all duration-200 ${isOpen ? "rotate-90 opacity-0 scale-75" : "rotate-0 opacity-100 scale-100"}`} />
          <X className={`absolute inset-0 h-6 w-6 transition-all duration-200 ${isOpen ? "rotate-0 opacity-100 scale-100" : "-rotate-90 opacity-0 scale-75"}`} />
        </button>
      </div>

      {(isOpen || isClosing) && (
        <div className={`lg:hidden bg-card/98 backdrop-blur-md border-t border-border ${isClosing ? "animate-menu-up" : "animate-menu-down"}`}>
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-3">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => handleNavClick(l, e)}
                className={`text-sm font-medium py-2 ${
                  l.type === "page" && isActivePage(l.href)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                {l.label}
              </a>
            ))}
            <Button className="mt-2 bg-primary hover:bg-primary/90" onClick={handleAgendarClick}>
              Agendar Consulta
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
