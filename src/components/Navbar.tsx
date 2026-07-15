import { useEffect, useState } from "react";
import { Menu, X, Leaf, Tag, TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { useContent } from "@/contexts/ContentContext";
import { getCountdownView, useDiscountCountdown } from "@/lib/discountCountdown";

interface NavLink {
  href: string;
  label: string;
  type: "page" | "anchor";
}

const NAV_LINKS: NavLink[] = [
  { href: "#sobre", label: "Sobre", type: "anchor" },
  { href: "#servicos", label: "Servicos", type: "anchor" },
  { href: "#atendimento", label: "Atendimento", type: "anchor" },
  { href: "/consultas", label: "Consultas", type: "page" },
  { href: "/loja", label: "Loja", type: "page" },
  { href: "/resultados", label: "Resultados", type: "page" },
  { href: "/blog", label: "Blog", type: "page" },
  { href: "#faq", label: "FAQ", type: "anchor" },
];

const Navbar = () => {
  const { content } = useContent();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const { active, percentage, expiresAt, message } = content.discount;
  const remaining = useDiscountCountdown(expiresAt);
  const countdownView = remaining !== null && remaining > 0 ? getCountdownView(remaining) : null;
  const bannerVisible =
    active &&
    !bannerDismissed &&
    (expiresAt === null || (remaining !== null && remaining > 0));

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    closeMenu();
  }, [location.pathname]);

  const closeMenu = () => {
    if (!isOpen) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 180);
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

    const id = link.href.replace("#", "");
    if (location.pathname === "/") {
      scrollToAnchor(id);
    } else {
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
      id="main-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-card/95 backdrop-blur-md shadow-md" : "bg-transparent"
      }`}
    >
      {bannerVisible && (
        <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-r from-emerald-900 via-emerald-700 to-emerald-600 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_48%)] opacity-80" />

          <div className="relative mx-auto max-w-7xl px-4 py-3 pr-14">
            <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-center sm:text-left">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10">
                  <Tag className="h-4 w-4 shrink-0" />
                </span>
                <p className="text-sm font-semibold leading-tight sm:text-base">{message}</p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-700 shadow-sm">
                  {percentage}% off
                </span>

                {countdownView && (
                  <div
                    className={`rounded-2xl border px-2.5 py-2 shadow-sm ${
                      countdownView.urgent
                        ? "border-amber-200/60 bg-amber-50 text-slate-900"
                        : "border-white/20 bg-white/12 text-white backdrop-blur-sm"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full ${
                          countdownView.urgent ? "bg-amber-100 text-amber-700" : "bg-white/16 text-white"
                        }`}
                      >
                        <TimerReset className="h-3.5 w-3.5" />
                      </span>

                      <div className="text-left">
                        <p
                          className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                            countdownView.urgent ? "text-amber-700" : "text-white/70"
                          }`}
                        >
                          {countdownView.headline}
                        </p>

                        <div className="mt-1 flex items-center gap-1.5">
                          {countdownView.segments.map((segment) => (
                            <div
                              key={`${segment.label}-${segment.value}`}
                              className={`min-w-[50px] rounded-xl px-2 py-1 text-center ${
                                countdownView.urgent ? "bg-white shadow-sm" : "bg-white/10"
                              }`}
                            >
                              <p className="text-sm font-black tabular-nums leading-none">{segment.value}</p>
                              <p
                                className={`mt-1 text-[9px] font-bold uppercase tracking-[0.18em] ${
                                  countdownView.urgent ? "text-slate-500" : "text-white/65"
                                }`}
                              >
                                {segment.label}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => setBannerDismissed(true)}
            className="absolute right-3 top-3 rounded-full border border-white/15 bg-white/8 p-1.5 opacity-80 transition-opacity hover:opacity-100"
            aria-label="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:h-20">
        <a href="/" onClick={handleLogoClick} className="flex items-center gap-2">
          <Leaf className="h-7 w-7 text-primary" />
          <span className="font-display text-xl font-bold text-foreground">
            {content.identity.brandName}
          </span>
        </a>

        <nav className="hidden items-center gap-6 lg:flex">
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
          className="relative h-6 w-6 text-foreground lg:hidden"
          onClick={toggleMenu}
          aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
        >
          <Menu
            className={`absolute inset-0 h-6 w-6 transition-all duration-200 ${
              isOpen ? "rotate-90 scale-75 opacity-0" : "rotate-0 scale-100 opacity-100"
            }`}
          />
          <X
            className={`absolute inset-0 h-6 w-6 transition-all duration-200 ${
              isOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-75 opacity-0"
            }`}
          />
        </button>
      </div>

      {(isOpen || isClosing) && (
        <div
          className={`border-t border-border bg-card/98 backdrop-blur-md lg:hidden ${
            isClosing ? "animate-menu-up" : "animate-menu-down"
          }`}
        >
          <nav className="container mx-auto flex flex-col gap-3 px-4 py-4">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => handleNavClick(l, e)}
                className={`py-2 text-sm font-medium ${
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
