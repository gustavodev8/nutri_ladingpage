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

  const { active, percentage, message } = content.discount;
  const remaining = useDiscountCountdown(content.discount);
  const countdownView = remaining !== null && remaining > 0 ? getCountdownView(remaining) : null;
  const bannerVisible = active && !bannerDismissed && remaining !== null && remaining > 0;

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
        <div className="relative overflow-hidden border-b border-emerald-300/20 bg-gradient-to-r from-[#064e3b] via-[#047857] to-[#059669] text-white shadow-[0_3px_16px_rgba(6,78,59,0.18)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_0%,rgba(255,255,255,0.16),transparent_30%),linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)]" />

          <div className="relative mx-auto flex min-h-[72px] max-w-6xl items-center justify-center px-12 py-2.5 sm:px-14 lg:min-h-[76px]">
            <div className="flex w-full flex-col items-center justify-center gap-2.5 sm:flex-row sm:gap-4 lg:gap-5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 shadow-inner sm:h-9 sm:w-9">
                  <Tag className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                </span>
                <p className="truncate text-center text-[13px] font-semibold tracking-[-0.01em] sm:text-left sm:text-sm lg:text-[15px]">
                  {message}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2.5">
                <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-800 shadow-[0_3px_10px_rgba(0,0,0,0.12)] sm:text-[11px]">
                  {percentage}% <span className="text-emerald-600">off</span>
                </span>

                {countdownView && (
                  <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-black/10 px-2.5 py-1.5 backdrop-blur-sm">
                    <TimerReset className="hidden h-4 w-4 text-emerald-100 sm:block" />
                    <div>
                      <p className="text-[9px] font-bold uppercase leading-none tracking-[0.2em] text-emerald-100/80">
                        {countdownView.headline}
                      </p>
                      <div className="mt-1 flex items-center gap-1">
                        {countdownView.segments.map((segment) => (
                          <div key={`${segment.label}-${segment.value}`} className="min-w-[35px] rounded-md bg-white/10 px-1.5 py-1 text-center sm:min-w-[40px]">
                            <p className="text-xs font-extrabold tabular-nums leading-none sm:text-sm">{segment.value}</p>
                            <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-emerald-100/65">
                              {segment.label}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => setBannerDismissed(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/20 p-1.5 text-white/70 transition-all hover:border-white/40 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label="Fechar promoção"
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
