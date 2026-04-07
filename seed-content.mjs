// Script para resetar o conteúdo do Supabase com os dados reais do Dr. Fillipe David
// Execute com: node seed-content.mjs

const SUPABASE_URL = "https://qwwltjaoftnsuvpgrsmm.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_1vEN1lReoOiYFoZP7mq4QA_j6ldSbTR";

const content = {
  _ts: Date.now(),
  identity: {
    brandName: "Fillipe David",
    doctorName: "Dr. Fillipe David",
    crn: "CRN",
    specialty: "Nutricionista Clínico e Esportivo",
    whatsappNumber: "5575991268688",
    photoUrl: "",
  },
  hero: {
    badge: "Vagas abertas — Alagoinhas/BA e Online",
    tagline: "Dieta não emagrece. O que transforma é",
    taglineHighlight1: "método",
    taglineHighlight2: "acompanhamento real",
    cta1Text: "Consulta Online",
    cta2Text: "Consulta Presencial",
    ratingScore: "5.0/5",
    ratingCount: "+200 avaliações",
    socialProofCount: "+7.000",
    socialProofText: "pacientes transformados",
  },
  about: {
    eyebrow: "Quem sou eu",
    title: "10 anos ajudando pessoas a transformarem seu corpo e saúde",
    bio1: "Me chamo Fillipe David, nutricionista clínico especializado em emagrecimento e nutrição esportiva. Com mais de 10 anos de experiência, já ajudei mais de 7 mil pessoas em 7 países diferentes a alcançarem seus objetivos de forma real e duradoura.",
    bio2: "Busquei aprimorar meu conhecimento com 4 pós-graduações na área esportiva e emagrecimento associado à estética. Minha abordagem é baseada em ciência, sem dietas prontas — cada protocolo é construído para a sua realidade, rotina e objetivos.",
    photoUrl: "",
    stats: [
      { label: "Anos de Experiência", value: "10+" },
      { label: "Pacientes Atendidos", value: "7.000+" },
      { label: "Países Atendidos", value: "7" },
      { label: "Pós-Graduações", value: "4" },
    ],
  },
  services: {
    title: "Como posso te ajudar",
    subtitle: "Atendimento personalizado para quem quer resultados reais — sem dietas genéricas.",
    items: [
      { icon: "Video", title: "Consulta Online", desc: "Videochamada de 40min + cardápio individual + acesso ao grupo VIP + desconto de 50% em ebooks." },
      { icon: "MapPin", title: "Consulta Presencial", desc: "1h de atendimento completo + bioimpedância + cardápio personalizado + revisão gratuita + indicação de suplementos." },
      { icon: "Stethoscope", title: "Nutrição Clínica", desc: "Protocolo específico para diabetes, hipertensão, obesidade e condições crônicas — com solicitação de exames e plano individualizado." },
      { icon: "Dumbbell", title: "Nutrição Esportiva", desc: "Plano alimentar para maximizar performance, ganho de massa ou definição, com prescrição de treino inclusa nos pacotes." },
      { icon: "CalendarCheck", title: "Acompanhamento Contínuo", desc: "Encontros a cada 21 dias para avaliar progresso e ajustar estratégias. Resultados reais vêm da continuidade." },
      { icon: "Apple", title: "Avaliação Física Completa", desc: "Bioimpedância, dobras subcutâneas, circunferências, densidade muscular e avaliação de pele para um diagnóstico detalhado." },
    ],
  },
  pricing: {
    title: "Investimento na sua saúde",
    subtitle: "Escolha o plano ideal para você.",
    plans: [
      {
        title: "Consulta Online",
        price: "R$ 99",
        period: "à vista ou 1x cartão",
        features: ["Videochamada 40min", "Cardápio individual", "Avaliação de imagem corporal", "Acesso ao grupo VIP", "50% de desconto em ebooks", "Desconto com personal trainer"],
        popular: false,
        whatsappMessage: "Olá Dr. Fillipe! Tenho interesse na Consulta Online.",
      },
      {
        title: "Consulta Clínica Presencial",
        price: "R$ 199",
        period: "à vista ou 1x cartão",
        features: ["Consulta 1h presencial", "Cardápio personalizado", "Avaliação física (circunferências + IMC)", "Protocolo clínico específico", "Solicitação de exames", "Acesso ao grupo VIP"],
        popular: false,
        whatsappMessage: "Olá Dr. Fillipe! Tenho interesse na Consulta Presencial.",
      },
      {
        title: "Protocolo 90 Dias",
        price: "R$ 1.488",
        period: "à vista ou 4x cartão",
        features: ["5 encontros de 1h", "Bioimpedância em todas as consultas", "Cardápio personalizado + flexível", "Protocolo clínico e metabólico", "5 ebooks gratuitos", "Treino incluso com personal trainer", "Acesso ao grupo VIP"],
        popular: false,
        whatsappMessage: "Olá Dr. Fillipe! Tenho interesse no Protocolo 90 Dias.",
      },
      {
        title: "Pacote Semestral",
        price: "R$ 2.800",
        period: "à vista ou 6x cartão",
        features: ["9 encontros de 1h", "Bioimpedância em todas as consultas", "Cardápio personalizado + flexível", "Protocolo clínico e metabólico", "5 ebooks gratuitos", "Prescrição de treino com personal", "Suporte de psicólogo e educador físico", "Acesso ao grupo VIP"],
        popular: true,
        whatsappMessage: "Olá Dr. Fillipe! Tenho interesse no Pacote Semestral.",
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
      { name: "Maria S.", initials: "MS", text: "O Dr. Fillipe mudou minha vida! Perdi 15kg de forma saudável e sem sofrimento. O cardápio é totalmente personalizado e sem aquela sensação de dieta." },
      { name: "João P.", initials: "JP", text: "Minha performance nos treinos melhorou muito depois que comecei o acompanhamento com o Dr. Fillipe. O plano é feito pra minha rotina de verdade." },
      { name: "Carla M.", initials: "CM", text: "Faço consulta online e é incrível. Mesmo longe, o acompanhamento é completo e o Dr. Fillipe está sempre disponível. Super recomendo!" },
      { name: "Roberto L.", initials: "RL", text: "Consegui controlar minha diabetes com alimentação. Os exames nunca estiveram tão bons. O Dr. Fillipe é um profissional diferenciado." },
      { name: "Fernanda A.", initials: "FA", text: "Sem restrições absurdas, sem sofrimento. Aprendi a comer de verdade. Em 4 meses, perdi 12kg e mudei minha relação com a comida completamente." },
    ],
  },
  faq: {
    title: "Perguntas Frequentes",
    items: [
      { q: "Por que o acompanhamento é contínuo?", a: "Em 12 anos de experiência, comprovei que os melhores resultados acontecem com acompanhamento contínuo — não em uma única consulta. A cada 21 dias nos encontramos para avaliar o progresso e ajustar as estratégias conforme sua evolução." },
      { q: "Como funciona a consulta online?", a: "A consulta online é por videochamada de 40min. Você recebe cardápio individual, avaliação de imagem corporal, acesso ao grupo VIP com materiais gratuitos e 50% de desconto em ebooks." },
      { q: "O que inclui a avaliação física completa?", a: "Utilizamos bioimpedância, dobras subcutâneas, medidas corporais, avaliação de densidade muscular, pele e circunferências para um diagnóstico completo do seu corpo." },
      { q: "Aceita convênio?", a: "Não. Atendemos somente particular. Para proporcionar atenção e dedicação total a cada paciente, optamos por não trabalhar com planos de saúde." },
      { q: "Preciso de pedido médico?", a: "Não é necessário pedido médico. Se tiver exames recentes, traga-os — ajuda a personalizar ainda mais o protocolo." },
      { q: "Os pacotes incluem personal trainer?", a: "Sim! O Protocolo 90 Dias já inclui treino com personal trainer. O Pacote Semestral e Anual incluem prescrição de treino online e suporte de psicólogo e educador físico." },
    ],
  },
  cta: {
    title: "Pronto para transformar seu corpo com método e acompanhamento real?",
    subtitle: "Mais de 7.000 pessoas em 7 países já mudaram sua saúde com o Dr. Fillipe David. A próxima pode ser você.",
    buttonText: "Falar com Dr. Fillipe pelo WhatsApp",
    whatsappMessage: "Olá Dr. Fillipe! Gostaria de saber mais sobre as consultas.",
  },
  contact: {
    address: "Alagoinhas",
    neighborhood: "Alagoinhas",
    city: "Alagoinhas/BA",
    cep: "",
    instagramUrl: "https://instagram.com",
    facebookUrl: "https://facebook.com",
  },
  modalities: {
    sectionTitle: "Modalidades de Atendimento",
    onlineTitle: "Atendimento Online",
    onlineDesc: "Atendo pacientes de todo o Brasil e do exterior. Consulta por videochamada, cardápio digital e acompanhamento completo onde você estiver.",
    presentialTitle: "Atendimento Presencial",
    presentialDesc: "Consultório em Alagoinhas/BA com avaliação física completa: bioimpedância, dobras subcutâneas, circunferências e densidade muscular.",
    mapsEmbedUrl: "",
  },
  loja: {
    sectionTitle: "Escolha o plano ideal para você",
    sectionSubtitle: "Consultas avulsas ou pacotes com acompanhamento contínuo — do jeito certo, do seu jeito.",
    plans: [
      {
        name: "Consulta Online",
        desc: "Videochamada 40min + cardápio individual + grupo VIP + 50% off em ebooks",
        price: "R$ 99",
        priceAmount: 99,
        badge: "",
        popular: false,
        whatsappMessage: "Olá Dr. Fillipe! Quero agendar uma Consulta Online.",
        sessionCount: 1,
        returnCount: 0,
        consultationType: "online",
      },
      {
        name: "Consulta Clínica Presencial",
        desc: "1h presencial + bioimpedância + cardápio personalizado + revisão gratuita",
        price: "R$ 199",
        priceAmount: 199,
        badge: "",
        popular: false,
        whatsappMessage: "Olá Dr. Fillipe! Quero agendar uma Consulta Presencial.",
        sessionCount: 1,
        returnCount: 1,
        consultationType: "presencial",
      },
      {
        name: "Protocolo 90 Dias",
        desc: "5 encontros + bioimpedância + treino incluso com personal + 5 ebooks gratuitos",
        price: "R$ 1.488",
        priceAmount: 1488,
        badge: "Mais Escolhido",
        popular: true,
        whatsappMessage: "Olá Dr. Fillipe! Tenho interesse no Protocolo 90 Dias.",
        sessionCount: 5,
        returnCount: 4,
        consultationType: "both",
      },
      {
        name: "Pacote Semestral",
        desc: "9 encontros + equipe completa (nutri + psicólogo + personal) + 6 meses",
        price: "R$ 2.800",
        priceAmount: 2800,
        badge: "Melhor Resultado",
        popular: false,
        whatsappMessage: "Olá Dr. Fillipe! Tenho interesse no Pacote Semestral.",
        sessionCount: 9,
        returnCount: 8,
        consultationType: "both",
      },
      {
        name: "Protocolo Anual",
        desc: "20 encontros + plataforma de cursos gratuita + equipe completa",
        price: "R$ 4.550",
        priceAmount: 4550,
        badge: "",
        popular: false,
        whatsappMessage: "Olá Dr. Fillipe! Tenho interesse no Protocolo Anual.",
        sessionCount: 20,
        returnCount: 19,
        consultationType: "both",
      },
    ],
  },
  produtosDigitais: {
    sectionTitle: "E-books e materiais exclusivos",
    sectionSubtitle: "Conteúdo digital para transformar sua relação com a alimentação.",
    items: [],
  },
  resultados: {
    sectionTitle: "Antes e Depois",
    sectionSubtitle: "Histórias reais de transformação com acompanhamento do Dr. Fillipe David.",
    disclaimer: "*Resultados podem variar de pessoa para pessoa.",
    ctaText: "Quero minha transformação também",
    whatsappMessage: "Olá Dr. Fillipe! Quero minha transformação também!",
    items: [],
  },
};

async function seed() {
  console.log("🌱 Enviando conteúdo para o Supabase...");

  const res = await fetch(`${SUPABASE_URL}/rest/v1/site_content?id=eq.1`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Prefer": "return=minimal",
    },
    body: JSON.stringify({ content }),
  });

  if (res.ok || res.status === 204) {
    console.log("✅ Conteúdo atualizado com sucesso!");
  } else {
    // Try insert if patch didn't find the row
    const res2 = await fetch(`${SUPABASE_URL}/rest/v1/site_content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ id: 1, content }),
    });
    if (res2.ok || res2.status === 201) {
      console.log("✅ Conteúdo inserido com sucesso!");
    } else {
      const err = await res2.text();
      console.error("❌ Erro:", err);
    }
  }
}

seed();
