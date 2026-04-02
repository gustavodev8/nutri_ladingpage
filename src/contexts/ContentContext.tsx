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
    photoUrl: string;
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
    photoUrl: string;
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
  loja: {
    sectionTitle: string;
    sectionSubtitle: string;
    plans: {
      name: string;
      desc: string;
      price: string;
      priceAmount: number;
      badge: string;
      popular: boolean;
      whatsappMessage: string;
      sessionCount: number;
      returnCount: number;
      consultationType: 'online' | 'presencial' | 'both';
    }[];
  };
  produtosDigitais: {
    sectionTitle: string;
    sectionSubtitle: string;
    items: {
      name: string;
      desc: string;
      longDesc: string;
      details: string[];
      price: string;
      priceAmount: number;
      badge: string;
      imageUrl: string;
      pdfUrl: string;
      whatsappMessage: string;
    }[];
  };
  resultados: {
    sectionTitle: string;
    sectionSubtitle: string;
    disclaimer: string;
    ctaText: string;
    whatsappMessage: string;
    items: {
      initials: string;
      text: string;
      time: string;
      beforeImageUrl: string;
      afterImageUrl: string;
    }[];
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
    photoUrl: "",
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
    photoUrl: "",
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
      { name: "Maria S.", initials: "MS", text: "O Dr. Fillipe mudou minha vida! Perdi 15kg de forma saudável e sem sofrimento. O plano alimentar é totalmente personalizado e delicioso." },
      { name: "João P.", initials: "JP", text: "Excelente profissional! Me ajudou a melhorar minha performance nos treinos com um plano alimentar específico para ciclismo." },
      { name: "Carla M.", initials: "CM", text: "As consultas online são super práticas. Mesmo morando em outro estado, tenho um acompanhamento incrível com o Dr. Fillipe. Super recomendo!" },
      { name: "Roberto L.", initials: "RL", text: "Consegui controlar minha diabetes com a ajuda do Dr. Fillipe. Meus exames nunca estiveram tão bons. Gratidão!" },
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
      { q: "Aceita convênio?", a: "Não. Atendemos somente particular." },
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
  loja: {
    sectionTitle: "Escolha o plano ideal para você",
    sectionSubtitle: "Consultas online e presenciais com acompanhamento personalizado.",
    plans: [
      {
        name: "Consulta Avulsa Online",
        desc: "Consulta completa + plano alimentar personalizado + 1 retorno",
        price: "R$ 250",
        priceAmount: 0,
        badge: "",
        popular: false,
        whatsappMessage: "Olá! Gostaria de agendar uma Consulta Avulsa Online.",
        sessionCount: 1,
        returnCount: 0,
        consultationType: "both",
      },
      {
        name: "Consulta Avulsa Presencial",
        desc: "Consulta completa com bioimpedância + plano alimentar + 1 retorno",
        price: "R$ 300",
        priceAmount: 0,
        badge: "",
        popular: false,
        whatsappMessage: "Olá! Gostaria de agendar uma Consulta Avulsa Presencial.",
        sessionCount: 2,
        returnCount: 1,
        consultationType: "both",
      },
      {
        name: "Pacote Mensal",
        desc: "4 consultas (1x por semana) + plano alimentar + ajustes semanais",
        price: "R$ 800",
        priceAmount: 0,
        badge: "Mais Escolhido",
        popular: true,
        whatsappMessage: "Olá! Tenho interesse no Pacote Mensal.",
        sessionCount: 3,
        returnCount: 2,
        consultationType: "both",
      },
      {
        name: "Pacote Trimestral",
        desc: "12 consultas + plano alimentar + acompanhamento completo por 3 meses",
        price: "R$ 2.100",
        priceAmount: 0,
        badge: "Melhor Custo-Benefício",
        popular: false,
        whatsappMessage: "Olá! Tenho interesse no Pacote Trimestral.",
        sessionCount: 4,
        returnCount: 3,
        consultationType: "both",
      },
      {
        name: "Acompanhamento VIP",
        desc: "Atendimento semanal + suporte ilimitado por WhatsApp + plano alimentar dinâmico",
        price: "R$ 1.200/mês",
        priceAmount: 0,
        badge: "",
        popular: false,
        whatsappMessage: "Olá! Tenho interesse no Acompanhamento VIP.",
        sessionCount: 4,
        returnCount: 4,
        consultationType: "both",
      },
    ],
  },
  produtosDigitais: {
    sectionTitle: "E-books e materiais exclusivos",
    sectionSubtitle: "Conteúdo digital para transformar sua relação com a alimentação.",
    items: [
      {
        name: "Guia Completo de Reeducação Alimentar",
        desc: "E-book com 60 páginas sobre como construir hábitos alimentares saudáveis.",
        longDesc: "Um guia passo a passo para transformar sua relação com a comida de forma definitiva. Sem dietas restritivas, sem sofrimento — apenas ciência aplicada ao dia a dia. Ideal para quem quer entender o próprio corpo e criar hábitos que duram para sempre.",
        details: [
          "60 páginas de conteúdo científico e prático",
          "Como montar um prato equilibrado sem contar calorias",
          "Estratégias para lidar com a compulsão alimentar",
          "Dicas para comer bem na correria do dia a dia",
          "Cardápio modelo para a primeira semana",
          "Acesso imediato após o pagamento",
        ],
        price: "R$ 47",
        priceAmount: 0,
        badge: "",
        imageUrl: "",
        pdfUrl: "",
        whatsappMessage: "Olá! Gostaria de comprar o Guia Completo de Reeducação Alimentar.",
      },
      {
        name: "30 Receitas Fit Fáceis e Rápidas",
        desc: "Receitas práticas e deliciosas para o dia a dia, com informações nutricionais.",
        longDesc: "Chega de comer sem sabor achando que saudável precisa ser sem graça! Este e-book traz 30 receitas testadas e aprovadas, com ingredientes simples que você já tem em casa. Cada receita vem com tabela nutricional completa.",
        details: [
          "30 receitas divididas em café da manhã, almoço, lanche e jantar",
          "Tabela nutricional de cada receita (calorias, proteínas, carbos, gorduras)",
          "Tempo de preparo de até 20 minutos por prato",
          "Opções para vegetarianos e intolerantes à lactose",
          "Lista de compras organizada por semana",
          "Acesso imediato após o pagamento",
        ],
        price: "R$ 37",
        priceAmount: 0,
        badge: "",
        imageUrl: "",
        pdfUrl: "",
        whatsappMessage: "Olá! Gostaria de comprar as 30 Receitas Fit.",
      },
      {
        name: "Nutrição Esportiva: Antes e Depois do Treino",
        desc: "E-book com estratégias nutricionais para otimizar seus treinos.",
        longDesc: "A alimentação certa pode ser o diferencial entre um treino mediano e resultados extraordinários. Aprenda o que comer antes, durante e depois do exercício para maximizar seu desempenho, acelerar a recuperação muscular e atingir seus objetivos mais rápido.",
        details: [
          "O que comer antes do treino para ter mais energia",
          "Suplementação: o que realmente vale a pena",
          "Alimentação pós-treino para recuperação muscular ideal",
          "Estratégias para ganho de massa e definição",
          "Plano alimentar para treinos de força e cardio",
          "Acesso imediato após o pagamento",
        ],
        price: "R$ 47",
        priceAmount: 0,
        badge: "",
        imageUrl: "",
        pdfUrl: "",
        whatsappMessage: "Olá! Gostaria de comprar o e-book de Nutrição Esportiva.",
      },
      {
        name: "Dieta Personalizada Express",
        desc: "Questionário + plano alimentar personalizado entregue em 48h, sem consulta ao vivo.",
        longDesc: "Para quem quer um plano alimentar feito especialmente para você, mas sem a necessidade de agendar uma consulta. Você preenche nosso questionário detalhado e em até 48h recebe seu plano 100% personalizado direto no seu e-mail.",
        details: [
          "Questionário completo sobre seus objetivos, rotina e preferências",
          "Plano alimentar personalizado de 4 semanas",
          "Lista de substituições para facilitar o dia a dia",
          "Orientações gerais de hidratação e sono",
          "Entrega em até 48 horas úteis por e-mail",
          "1 ajuste incluso após o envio",
        ],
        price: "R$ 97",
        priceAmount: 0,
        badge: "",
        imageUrl: "",
        pdfUrl: "",
        whatsappMessage: "Olá! Gostaria de pedir uma Dieta Personalizada Express.",
      },
      {
        name: "Combo: E-book + Dieta Personalizada",
        desc: "Escolha 1 e-book + receba uma dieta personalizada express com desconto especial.",
        longDesc: "A combinação perfeita para quem quer começar com tudo! Você escolhe um dos nossos e-books e ainda ganha uma dieta personalizada express por um preço especial. Mais conteúdo, mais resultado, menos gasto.",
        details: [
          "1 e-book à sua escolha (Reeducação Alimentar, Receitas Fit ou Esportiva)",
          "Plano alimentar personalizado de 4 semanas",
          "Questionário individual para personalização",
          "Entrega do plano em até 48 horas úteis",
          "1 ajuste incluso após o envio",
          "Economia de até R$ 44 em relação à compra separada",
        ],
        price: "R$ 120",
        priceAmount: 0,
        badge: "Oferta Especial",
        imageUrl: "",
        pdfUrl: "",
        whatsappMessage: "Olá! Gostaria de comprar o Combo E-book + Dieta.",
      },
    ],
  },
  resultados: {
    sectionTitle: "Antes e Depois",
    sectionSubtitle: "Histórias reais de transformação com acompanhamento nutricional.",
    disclaimer: "*Resultados podem variar de pessoa para pessoa.",
    ctaText: "Quero minha transformação também",
    whatsappMessage: "Olá! Quero minha transformação também!",
    items: [
      { initials: "M.S.", text: "Perdi 12kg em 4 meses com acompanhamento personalizado. Me sinto outra pessoa!", time: "4 meses", beforeImageUrl: "", afterImageUrl: "" },
      { initials: "A.L.", text: "Ganhei 6kg de massa magra com o plano de nutrição esportiva. Resultado incrível!", time: "6 meses", beforeImageUrl: "", afterImageUrl: "" },
      { initials: "C.R.", text: "Consegui controlar minha diabetes tipo 2 só com alimentação. Mudou minha vida!", time: "8 meses", beforeImageUrl: "", afterImageUrl: "" },
      { initials: "J.P.", text: "Emagreci 20kg em 6 meses e mantive o peso. Atendimento humanizado e profissional.", time: "6 meses", beforeImageUrl: "", afterImageUrl: "" },
      { initials: "L.F.", text: "Minha bebê fez introdução alimentar perfeita com o acompanhamento. Super recomendo!", time: "3 meses", beforeImageUrl: "", afterImageUrl: "" },
      { initials: "R.M.", text: "Perdi 8kg e melhorei minha performance nos treinos. Resultados que eu não esperava!", time: "5 meses", beforeImageUrl: "", afterImageUrl: "" },
    ],
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
