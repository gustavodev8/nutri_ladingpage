import { Leaf, Instagram, Phone, Facebook } from "lucide-react";
import { Link } from "react-router-dom";
import { useContent } from "@/contexts/ContentContext";

const PAGE_LINKS = [
  { href: "/", label: "Início" },
  { href: "/consultas", label: "Consultas & Planos" },
  { href: "/resultados", label: "Resultados" },
];

const ANCHOR_LINKS = [
  { href: "/#sobre", label: "Sobre o Dr. Fillipe" },
  { href: "/#servicos", label: "Serviços" },
  { href: "/#faq", label: "FAQ" },
];

const Footer = () => {
  const { content } = useContent();
  const { identity, contact } = content;

  return (
    <footer className="bg-foreground text-primary-foreground/80 py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 md:gap-12 mb-10 md:mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Leaf className="h-6 w-6 text-accent" />
              <span className="font-display text-xl font-bold text-primary-foreground">
                {identity.brandName}
              </span>
            </div>
            <p className="text-sm leading-relaxed">
              {identity.specialty}
              <br />
              {identity.crn}
            </p>
            <p className="text-sm">
              {contact.city}
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-primary-foreground">Navegação</h4>
            <nav className="flex flex-col gap-2">
              {PAGE_LINKS.map((l) => (
                <Link key={l.href} to={l.href} className="text-sm hover:text-accent transition-colors">
                  {l.label}
                </Link>
              ))}
              {ANCHOR_LINKS.map((l) => (
                <a key={l.href} href={l.href} className="text-sm hover:text-accent transition-colors">
                  {l.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-primary-foreground">Redes Sociais</h4>
            <div className="flex gap-3">
              {[
                { icon: Instagram, href: contact.instagramUrl, label: "Instagram" },
                {
                  icon: Phone,
                  href: `https://wa.me/${identity.whatsappNumber}`,
                  label: "WhatsApp",
                },
                { icon: Facebook, href: contact.facebookUrl, label: "Facebook" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-accent/20 transition-colors"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 pt-8 text-center text-sm">
          <p>© {new Date().getFullYear()} {identity.brandName} — Todos os direitos reservados</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
