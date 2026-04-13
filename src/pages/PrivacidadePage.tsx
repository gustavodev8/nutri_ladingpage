import { Link } from "react-router-dom";
import { useContent } from "@/contexts/ContentContext";
import { ArrowLeft, Shield, Lock, Eye, UserCheck, Trash2, Mail } from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
  <section className="space-y-3">
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <h2 className="text-base font-bold text-foreground">{title}</h2>
    </div>
    <div className="pl-10 space-y-2 text-sm text-muted-foreground leading-relaxed">
      {children}
    </div>
  </section>
);

const List = ({ items }: { items: string[] }) => (
  <ul className="space-y-1.5 mt-1">
    {items.map((item, i) => (
      <li key={i} className="flex items-start gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1.5 shrink-0" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PrivacidadePage() {
  const { content } = useContent();
  const { about, contact } = content;
  const nutri = about;
  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const whatsapp = `https://wa.me/${contact.whatsappNumber ?? ""}`;
  const email = `contato@nutrivida.com.br`;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-5 py-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao início
          </Link>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Política de Privacidade</h1>
              <p className="text-primary-foreground/70 text-sm mt-1">
                Última atualização: {today}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-3xl mx-auto px-5 py-10 space-y-8">

        {/* Intro */}
        <div className="rounded-xl border border-border bg-muted/30 p-5 text-sm text-muted-foreground leading-relaxed">
          Esta Política de Privacidade descreve como <strong className="text-foreground">{nutri.name || "NutriVida"}</strong> coleta,
          usa, armazena e protege os dados pessoais fornecidos através deste site, em
          conformidade com a <strong className="text-foreground">Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018)</strong> e
          demais legislações aplicáveis.
        </div>

        {/* 1. Responsável */}
        <Section title="1. Responsável pelo Tratamento" icon={UserCheck}>
          <p>
            <strong className="text-foreground">{nutri.name || "NutriVida"}</strong><br />
            {nutri.specialty || "Nutricionista"}{nutri.crn ? ` · CRN: ${nutri.crn}` : ""}<br />
            {contact.city || "Brasil"}
          </p>
          <p>
            Para exercer seus direitos ou tirar dúvidas sobre esta política, entre em contato:<br />
            <a href={`mailto:${email}`} className="text-primary hover:underline">{email}</a>
            {contact.whatsappNumber && (
              <>
                {" "}·{" "}
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  WhatsApp
                </a>
              </>
            )}
          </p>
        </Section>

        {/* 2. Dados coletados */}
        <Section title="2. Dados Pessoais Coletados" icon={Eye}>
          <p>Coletamos dados pessoais nas seguintes situações:</p>

          <div className="space-y-3 mt-2">
            <div>
              <p className="font-semibold text-foreground">Agendamento de consultas:</p>
              <List items={[
                "Nome completo",
                "Endereço de e-mail",
                "Número de telefone / WhatsApp",
                "Data de nascimento e gênero",
                "Informações clínicas (objetivo nutricional, restrições alimentares, alergias, condições de saúde, uso de medicamentos)",
                "Como conheceu o serviço",
              ]} />
            </div>
            <div>
              <p className="font-semibold text-foreground">Compra de produtos digitais (e-books):</p>
              <List items={[
                "Nome completo",
                "Endereço de e-mail",
                "CPF (coletado pelo processador de pagamento Mercado Pago para fins fiscais)",
              ]} />
            </div>
            <div>
              <p className="font-semibold text-foreground">Prontuário clínico (pacientes ativos):</p>
              <List items={[
                "Medidas corporais (peso, altura, composição corporal)",
                "Fotos de acompanhamento (enviadas com consentimento explícito)",
                "Registros de consultas e evoluções",
                "Planos alimentares personalizados",
              ]} />
            </div>
          </div>
        </Section>

        {/* 3. Finalidade */}
        <Section title="3. Finalidade do Tratamento" icon={Lock}>
          <p>Seus dados são tratados exclusivamente para:</p>
          <List items={[
            "Agendamento, confirmação e realização de consultas nutricionais",
            "Elaboração de planos alimentares personalizados",
            "Acompanhamento clínico e evolução do paciente",
            "Entrega de produtos digitais adquiridos",
            "Envio de confirmações de pagamento e agendamento por e-mail",
            "Verificação de elegibilidade para benefícios promocionais (consulta gratuita)",
            "Cumprimento de obrigações legais e fiscais",
          ]} />
          <p className="mt-2">
            <strong className="text-foreground">Não utilizamos seus dados para marketing sem consentimento explícito</strong> e
            nunca vendemos ou cedemos seus dados a terceiros para fins comerciais.
          </p>
        </Section>

        {/* 4. Base legal */}
        <Section title="4. Base Legal (LGPD)" icon={Shield}>
          <p>O tratamento de dados é realizado com base nas seguintes hipóteses legais (Art. 7º e 11º, LGPD):</p>
          <List items={[
            "Consentimento do titular — para coleta de informações clínicas e fotos",
            "Execução de contrato — para agendamentos e compras realizadas",
            "Obrigação legal — para emissão de notas fiscais e registros contábeis",
            "Legítimo interesse — para comunicações operacionais (confirmação de consulta, entrega de e-book)",
            "Tutela da saúde — para prontuário clínico e acompanhamento nutricional",
          ]} />
        </Section>

        {/* 5. Compartilhamento */}
        <Section title="5. Compartilhamento de Dados" icon={Eye}>
          <p>Seus dados podem ser compartilhados <strong className="text-foreground">somente</strong> com:</p>
          <List items={[
            "Mercado Pago — processamento seguro de pagamentos (PCI-DSS)",
            "Resend — envio de e-mails transacionais (confirmações e entregas)",
            "Supabase — armazenamento seguro de dados em infraestrutura na nuvem (SOC 2 Type II)",
          ]} />
          <p className="mt-2">
            Todos os terceiros são contratados com cláusulas de proteção de dados e não
            estão autorizados a usar seus dados para outras finalidades.
          </p>
        </Section>

        {/* 6. Retenção */}
        <Section title="6. Retenção e Exclusão de Dados" icon={Trash2}>
          <p>Os dados são mantidos pelo período necessário para cada finalidade:</p>
          <List items={[
            "Prontuário clínico: enquanto durar a relação profissional, conforme resoluções do CFN",
            "Registros de pagamento: até 5 anos, conforme legislação fiscal brasileira",
            "Dados de agendamento: até 2 anos após a última consulta",
            "Dados de compra de produtos: até 5 anos",
            "CPF: armazenado apenas como hash criptográfico (SHA-256), não recuperável",
          ]} />
          <p className="mt-2">
            Após o prazo de retenção, os dados são excluídos de forma segura e irreversível.
          </p>
        </Section>

        {/* 7. Direitos */}
        <Section title="7. Seus Direitos como Titular" icon={UserCheck}>
          <p>Conforme o Art. 18 da LGPD, você tem direito a:</p>
          <List items={[
            "Confirmação da existência de tratamento dos seus dados",
            "Acesso aos dados que temos sobre você",
            "Correção de dados incompletos, inexatos ou desatualizados",
            "Anonimização, bloqueio ou eliminação de dados desnecessários",
            "Portabilidade dos dados a outro fornecedor de serviço",
            "Eliminação dos dados tratados com base no consentimento",
            "Informação sobre os terceiros com quem compartilhamos seus dados",
            "Revogação do consentimento a qualquer momento",
          ]} />
          <p className="mt-2">
            Para exercer qualquer direito, entre em contato conosco pelo e-mail{" "}
            <a href={`mailto:${email}`} className="text-primary hover:underline">{email}</a>{" "}
            ou{" "}
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">WhatsApp</a>.
            Responderemos em até <strong className="text-foreground">15 dias úteis</strong>.
          </p>
        </Section>

        {/* 8. Cookies */}
        <Section title="8. Cookies e Tecnologias de Rastreamento" icon={Lock}>
          <p>
            Este site utiliza apenas cookies <strong className="text-foreground">essenciais</strong> para o funcionamento
            técnico da plataforma. Não utilizamos cookies de rastreamento, publicidade ou analytics de terceiros
            sem seu consentimento explícito.
          </p>
          <p>
            Você pode configurar seu navegador para recusar cookies, mas isso pode afetar algumas
            funcionalidades do site.
          </p>
        </Section>

        {/* 9. Segurança */}
        <Section title="9. Segurança dos Dados" icon={Shield}>
          <p>Adotamos medidas técnicas e organizacionais para proteger seus dados:</p>
          <List items={[
            "Transmissão criptografada via HTTPS/TLS",
            "Armazenamento em ambiente seguro com controles de acesso",
            "CPF nunca armazenado em texto puro — apenas hash criptográfico",
            "Acesso ao prontuário restrito ao profissional responsável",
            "Fotos de pacientes armazenadas com identificadores aleatórios (não previsíveis)",
          ]} />
          <p className="mt-2">
            Em caso de incidente de segurança que afete seus dados, seremos notificados pela ANPD
            e você será comunicado no prazo legal.
          </p>
        </Section>

        {/* 10. Menores */}
        <Section title="10. Dados de Menores de Idade" icon={UserCheck}>
          <p>
            Não coletamos dados de menores de 18 anos sem o consentimento expresso e documentado
            do responsável legal. Caso identifiquemos tratamento inadvertido de dados de menores
            sem consentimento, os dados serão excluídos imediatamente.
          </p>
        </Section>

        {/* 11. Alterações */}
        <Section title="11. Alterações nesta Política" icon={Eye}>
          <p>
            Esta política pode ser atualizada periodicamente para refletir mudanças em nossas
            práticas ou na legislação aplicável. A data de "última atualização" no topo desta
            página indica quando ocorreu a revisão mais recente.
          </p>
          <p>
            Alterações significativas serão comunicadas por e-mail aos pacientes ativos.
          </p>
        </Section>

        {/* Contato */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Dúvidas sobre privacidade?</p>
            <p className="text-sm text-muted-foreground">
              Entre em contato pelo e-mail{" "}
              <a href={`mailto:${email}`} className="text-primary hover:underline font-medium">{email}</a>
              {contact.whatsappNumber && (
                <>
                  {" "}ou pelo{" "}
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                    WhatsApp
                  </a>
                </>
              )}.
              Responderemos em até 15 dias úteis.
            </p>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground/50 text-center pb-6">
          {nutri.name || "NutriVida"} · {contact.city || "Brasil"} · LGPD — Lei nº 13.709/2018
        </p>
      </div>
    </div>
  );
}
