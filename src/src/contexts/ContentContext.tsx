import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { fetchContent, saveContent, type StoredContent } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SiteContent {
  identity: {
    brandName: string;
    doctorName: string;
    crn: string;
    specialty: string;
    whatsappNumber: string;
  };
  hero: {
    badge: string;
    tagline: string;
    taglineHighlight1: string;
    taglineHighlight2: string;
    cta1Text: string;
    cta2Text: string;
    ratingScore: string;
    ratingCount: string;
    socialProofCount: string;
    socialProofText: string;
  };
  about: {
    eyebrow: string;
    title: string;
    bio1: string;
    bio2: string;
    stats: { label: string; value: string }[];
  };
  services: {
    title: string;
    subtitle: string;
    items: { icon: string; title: string; desc: string }[];
  };
  pricing: {
    title: string;
    subtitle: string;
    plans: {
      title: string;
      price: string;
      period: string;
      features: string[];
      popular: boolean;
      whatsappMessage: string;
    }[];
  };
  schedule: {
    title: string;
    days: { day: string; hours: string; open: boolean }[];
  };
  testimonials: {
    title: string;
    items: { name: string; initials: string; text: string }[];
  };
  faq: {
    title: string;
    items: { q: string; a: string }[];
  };
  cta: {
    title: string;
    subtitle: string;
    buttonText: string;
    whatsappMessage: string;
  };
  contact: {
    address: string;
    neighborhood: string;
    city: string;
    cep: string;
    instagramUrl: string;
    facebookUrl: string;
  };
  modalities: {
    sectionTitle: string;
    onlineTitle: string;
    onlineDesc: string;
    presentialTitle: string;
    presentialDesc: string;
    mapsEmbedUrl: string;
  };
}

// ─── Default content ──────────────────────────────────────────────────────────

export const DEFAULT_CONTENT: SiteContent = {
  identity: {
    brandName: "NutriVida",
    doctorName: "Dra. Ana Silva",
    crn: "CRN-3 12345",
    specialty: "Nutricionista Clínica e Esportiva",
    whatsappNumber: "5511999999999",
  },
  hero: {
    badge: "Agendamento aberto",
    tagline: "Transforme sua relação com a alimentação de forma",
    taglineHighlight1: "leve",
    taglineHighlight2: "personalizada",
    cta1Text: "Consulta Online",
    cta2Text: "Consulta Presencial",
    ratingScore: "4.9/5",
    ratingCount: "+200 avaliações",
    socialProofCount: "+500",
    socialProofText: "pacientes transformados",
  },
  about: {
    eyebrow: "Sobre Mim",
    title: "Cuidando da sua saúde com ciência e carinho",
    bio1: "Sou a Dra. Ana Silva, nutricionista formada pela USP com mais de 8 anos de experiência em nutrição clínica e esportiva. Possuo especialização em Nutrição Funcional, Nutrição Esportiva e Comportamento Alimentar.",
    bio2: "Minha abordagem é personalizada e humanizada. Acredito que cada pessoa é única e merece um plano alimentar que respeite suas preferências, rotina e objetivos. Nada de dietas restritivas — aqui trabalhamos com reeducação alimentar de verdade.",
    stats: [
      { label: "Anos de Experiência", value: "8+" },
      { label: "Pacientes Atendidos", value: "500+" },
      { label: "Especializações", value: "3" },
    ],
  },
  services: {
    title: "Como posso te ajudar",
    subtitle: "Ofereço diferentes modalidades de atendimento para atender suas necessidades específicas.",
    items: [
      { icon: "Video", title: "Consulta Online", desc: "Atendimento por videochamada de qualquer lugar do Brasil com plano alimentar digital." },
      { icon: "MapPin", title: "Consulta Presencial", desc: "Atendimento no consultório com avaliação antropométrica completa." },
      { icon: "CalendarCheck", title: "Acompanhamento Mensal", desc: "Suporte contínuo com consultas de retorno e ajustes no plano alimentar." },
      { icon: "Apple", title: "Reeducação Alimentar", desc: "Aprenda a comer de forma saudável e equilibrada sem restrições radicais." },
      { icon: "Dumbbell", title: "Nutrição Esportiva", desc: "Potencialize sua performance com um plano alimentar para seus treinos." },
      { icon: "Stethoscope", title: "Nutrição Clínica", desc: "Tratamento nutricional para diabetes, hipertensão, colesterol e mais." },
    ],
  },
  pricing: {
    title: "Investimento na sua saúde",
    subtitle: "Escolha o plano ideal para você.",
    plans: [
      {
        title: "Consulta Avulsa Online",
        price: "R$ 200",
        period: "por consulta",
        features: ["Consulta por videochamada (50min)", "Plano alimentar personalizado", "Lista de substituições"],
        popular: false,
        whatsappMessage: "Olá! Tenho interesse na Consulta Avulsa Online.",
      },
      {
        title: "Consulta Avulsa Presencial",
        price: "R$ 250",
        period: "por consulta",
        features: ["Consulta no consultório (50min)", "Avaliação antropométrica", "Plano alimentar personalizado", "Lista de substituições"],
        popular: false,
        whatsappMessage: "Olá! Tenho interesse na Consulta Avulsa Presencial.",
      },
      {
        title: "Pacote Mensal",
        price: "R$ 700",
        period: "4 consultas",
        features: ["4 consultas (online ou presencial)", "Plano alimentar personalizado", "Suporte por WhatsApp", "Ajustes semanais"],
        popular: true,
        whatsappMessage: "Olá! Tenho interesse no Pacote Mensal.",
      },
      {
        title: "Pacote Trimestral",
        price: "R$ 1.800",
        period: "12 consultas",
        features: ["12 consultas (online ou presencial)", "Plano alimentar personalizado", "Suporte por WhatsApp", "Ajustes semanais", "Receitas exclusivas", "Acompanhamento de exames"],
        popular: false,
        whatsappMessage: "Olá! Tenho interesse no Pacote Trimestral.",
      },
    ],
  },
  schedule: {
    title: "Horários de Atendimento",
    days: [
      { day: "Segunda-feira", hours: "8h às 12h / 14h às 18h", open: true },
      { day: "Terça-feira", hours: "8h às 12h / 14h às 18h", open: true },
      { day: "Quarta-feira", hours: "8h às 12h / 14h às 18h", open: true },
      { day: "Quinta-feira", hours: "8h às 12h / 14h às 18h", open: true },
      { day: "Sexta-feira", hours: "8h às 12h / 14h às 18h", open: true },
      { day: "Sábado", hours: "8h às 12h", open: true },
      { day: "Domingo", hours: "Fechado", open: false },
    ],
  },
  testimonials: {
    title: "O que dizem meus pacientes",
    items: [
      { name: "Maria S.", initials: "MS", text: "A Dra. Ana mudou minha vida! Perdi 15kg de forma saudável e sem sofrimento. O plano alimentar é totalmente personalizado e delicioso." },
      { name: "João P.", initials: "JP", text: "Excelente profissional! Me ajudou a melhorar minha performance nos treinos com um plano alimentar específico para ciclismo." },
      { name: "Carla M.", initials: "CM", text: "As consultas online são super práticas. Mesmo morando em outro estado, tenho um acompanhamento incrível. Super recomendo!" },
      { name: "Roberto L.", initials: "RL", text: "Consegui controlar minha diabetes com a ajuda da Dra. Ana. Meus exames nunca estiveram tão bons. Gratidão!" },
      { name: "Fernanda A.", initials: "FA", text: "Adorei a abordagem sem restrições. Aprendi a comer bem de verdade. Minha relação com a comida mudou completamente." },
    ],
  },
  faq: {
    title: "Perguntas Frequentes",
    items: [
      { q: "Como funciona a consulta online?", a: "A consulta online é realizada por videochamada (Google Meet ou Zoom) com duração de 50 minutos. Após a consulta, você recebe o plano alimentar personalizado por e-mail em até 48 horas." },
      { q: "Preciso de pedido médico?", a: "Não é necessário pedido médico para consultar com nutricionista. Porém, se você tiver exames recentes, traga-os para a consulta — isso nos ajuda a fazer uma avaliação mais completa." },
      { q: "Quanto tempo dura a consulta?", a: "A primeira consulta dura em média 50 minutos, onde fazemos uma anamnese completa. As consultas de retorno duram aproximadamente 30 minutos." },
      { q: "O plano alimentar é personalizado?", a: "Sim! Cada plano alimentar é 100% personalizado de acordo com seus objetivos, preferências alimentares, rotina, condições de saúde e orçamento. Nada de dietas genéricas." },
      { q: "Aceita convênio?", a: "Atualmente não trabalhamos com convênios. Porém, muitos planos de saúde oferecem reembolso para consultas com nutricionista. Emitimos nota fiscal para que você solicite o reembolso." },
      { q: "Como funciona o acompanhamento por WhatsApp?", a: "Nos pacotes mensal e trimestral, você tem acesso ao suporte por WhatsApp para tirar dúvidas do dia a dia, enviar fotos de refeições e receber orientações rápidas." },
    ],
  },
  cta: {
    title: "Comece hoje sua jornada para uma vida mais saudável",
    subtitle: "Dê o primeiro passo em direção a uma alimentação equilibrada e uma vida com mais energia e disposição.",
    buttonText: "Agendar minha consulta pelo WhatsApp",
    whatsappMessage: "Olá! Gostaria de agendar uma consulta.",
  },
  contact: {
    address: "Rua Exemplo, 123",
    neighborhood: "Vila Mariana",
    city: "São Paulo/SP",
    cep: "01000-000",
    instagramUrl: "https://instagram.com",
    facebookUrl: "https://facebook.com",
  },
  modalities: {
    sectionTitle: "Modalidades de Atendimento",
    onlineTitle: "Atendimento Online",
    onlineDesc: "Atendo pacientes de todo o Brasil com a mesma qualidade do atendimento presencial.",
    presentialTitle: "Atendimento Presencial",
    presentialDesc: "Consultório moderno e acolhedor para um atendimento humanizado e completo.",
    mapsEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3657.1976!2d-46.6339!3d-23.5874!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDM1JzE0LjYiUyA0NsKwMzgnMDIuMCJX!5e0!3m2!1spt-BR!2sbr!4v1234567890",
  },
};

// ─── Context ──────────────────────────────────────────────────────────────────

const CACHE_KEY = "nutrivida_content_cache";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface ContentContextValue {
  content: SiteContent;
  loading: boolean;
  saveStatus: SaveStatus;
  updateContent: (updater: (prev: SiteContent) => SiteContent) => Promise<void>;
  resetContent: () => Promise<void>;
  whatsappUrl: (message: string) => string;
}

const ContentContext = createContext<ContentContextValue | null>(null);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent>(DEFAULT_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    // ── 1. Paint from cache immediately (no loading flash) ──────────────────
    let localTs = 0;
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed: StoredContent = JSON.parse(cached);
        localTs = parsed._ts ?? 0;
        setContent(deepMerge(DEFAULT_CONTENT, parsed));
      } catch { /* ignore malformed cache */ }
    }

    // ── 2. Fetch Supabase — only override if remote data is NEWER ────────────
    fetchContent().then((remote) => {
      const remoteTs = remote?._ts ?? 0;

      if (remote && remoteTs > localTs) {
        // Supabase has a more recent save (e.g. edited on another device)
        const { _ts, ...data } = remote;
        const merged = deepMerge(DEFAULT_CONTENT, data as SiteContent);
        setContent(merged);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ...merged, _ts: remoteTs }));
      }
      setLoading(false);
    });
  }, []);

  const updateContent = useCallback(async (updater: (prev: SiteContent) => SiteContent) => {
    const next = updater(content);
    const ts = Date.now();
    // Update state + cache immediately so the site reflects changes instantly
    setContent(next);
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...next, _ts: ts }));

    setSaveStatus("saving");
    const ok = await saveContent({ ...next, _ts: ts });
    setSaveStatus(ok ? "saved" : "error");
    setTimeout(() => setSaveStatus("idle"), ok ? 3000 : 6000);
  }, [content]);

  const resetContent = useCallback(async () => {
    const ts = Date.now();
    setContent(DEFAULT_CONTENT);
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...DEFAULT_CONTENT, _ts: ts }));
    setSaveStatus("saving");
    const ok = await saveContent({ ...DEFAULT_CONTENT, _ts: ts });
    setSaveStatus(ok ? "saved" : "error");
    if (ok) setTimeout(() => setSaveStatus("idle"), 3000);
  }, []);

  const whatsappUrl = useCallback(
    (message: string) =>
      `https://wa.me/${content.identity.whatsappNumber}?text=${encodeURIComponent(message)}`,
    [content.identity.whatsappNumber]
  );

  return (
    <ContentContext.Provider value={{ content, loading, saveStatus, updateContent, resetContent, whatsappUrl }}>
      {children}
    </ContentContext.Provider>
  );
}

export function useContent() {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error("useContent must be used within ContentProvider");
  return ctx;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deepMerge<T extends object>(defaults: T, overrides: Partial<T>): T {
  const result = { ...defaults } as T;
  for (const key in overrides) {
    const k = key as keyof T;
    const ov = overrides[k];
    const dv = defaults[k];
    if (ov !== undefined && ov !== null) {
      if (Array.isArray(ov) || typeof ov !== "object") {
        result[k] = ov as T[keyof T];
      } else if (typeof dv === "object" && !Array.isArray(dv)) {
        result[k] = deepMerge(dv as object, ov as object) as T[keyof T];
      } else {
        result[k] = ov as T[keyof T];
      }
    }
  }
  return result;
}
