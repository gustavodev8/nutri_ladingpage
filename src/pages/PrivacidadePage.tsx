import { Shield, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useContent } from "@/contexts/ContentContext";

const PrivacidadePage = () => {
  const { content } = useContent();
  const { hero } = content;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <span className="text-muted-foreground/40">|</span>
          <span className="text-sm font-medium text-foreground">Política de Privacidade</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <div className="flex items-start gap-4">
          <div className="mt-1 p-2.5 rounded-xl bg-primary/10 shrink-0">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Política de Privacidade</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Última atualização: janeiro de 2025
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Esta Política de Privacidade descreve como{" "}
          <strong className="text-foreground">{hero.name}</strong> coleta, usa e protege as
          informações pessoais fornecidas ao utilizar este site e seus serviços, em conformidade
          com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
        </p>

        <Section title="1. Dados coletados">
          <p>Podemos coletar as seguintes informações pessoais:</p>
          <ul>
            <li>Nome completo e dados de contato (e-mail, telefone/WhatsApp);</li>
            <li>Informações de saúde fornecidas voluntariamente para fins de acompanhamento nutricional;</li>
            <li>Dados de pagamento processados por plataformas terceiras (Mercado Pago);</li>
            <li>Dados de navegação (cookies, endereço IP, tipo de dispositivo) coletados automaticamente.</li>
          </ul>
        </Section>

        <Section title="2. Finalidade do uso">
          <p>Suas informações são usadas para:</p>
          <ul>
            <li>Prestação dos serviços de consultoria nutricional contratados;</li>
            <li>Envio de materiais digitais adquiridos (e-books, planos alimentares);</li>
            <li>Comunicação sobre agendamentos, resultados e acompanhamento;</li>
            <li>Melhoria dos serviços e experiência no site;</li>
            <li>Cumprimento de obrigações legais e regulatórias.</li>
          </ul>
        </Section>

        <Section title="3. Base legal">
          <p>
            O tratamento de dados é realizado com base no consentimento do titular (Art. 7º, I da
            LGPD), na execução de contrato (Art. 7º, V) e no cumprimento de obrigação legal (Art.
            7º, II), conforme cada situação específica.
          </p>
        </Section>

        <Section title="4. Compartilhamento de dados">
          <p>
            Seus dados <strong>não são vendidos</strong> a terceiros. Podemos compartilhá-los
            apenas nas seguintes situações:
          </p>
          <ul>
            <li>Com processadores de pagamento (Mercado Pago) para finalização de compras;</li>
            <li>Com prestadores de serviços de infraestrutura (Supabase) para armazenamento seguro;</li>
            <li>Quando exigido por autoridade competente ou determinação judicial.</li>
          </ul>
        </Section>

        <Section title="5. Segurança">
          <p>
            Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados contra
            acesso não autorizado, perda ou alteração, incluindo criptografia em trânsito (HTTPS) e
            controle de acesso restrito aos dados armazenados.
          </p>
        </Section>

        <Section title="6. Retenção de dados">
          <p>
            Os dados pessoais são mantidos pelo tempo necessário para a prestação dos serviços e
            cumprimento de obrigações legais. Dados de saúde de pacientes são retidos conforme
            exigido pelo Conselho Federal de Nutricionistas (CFN).
          </p>
        </Section>

        <Section title="7. Seus direitos (LGPD)">
          <p>Como titular de dados, você tem direito a:</p>
          <ul>
            <li>Confirmar a existência de tratamento dos seus dados;</li>
            <li>Acessar, corrigir ou atualizar seus dados;</li>
            <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários;</li>
            <li>Revogar o consentimento a qualquer momento;</li>
            <li>Portabilidade dos seus dados;</li>
            <li>Ser informado sobre o compartilhamento de dados.</li>
          </ul>
          <p>Para exercer seus direitos, entre em contato pelo WhatsApp ou e-mail indicados neste site.</p>
        </Section>

        <Section title="8. Cookies">
          <p>
            Este site pode utilizar cookies essenciais para funcionamento e cookies analíticos
            para entender o uso do site. Você pode configurar seu navegador para recusar cookies,
            mas isso pode afetar a funcionalidade de algumas páginas.
          </p>
        </Section>

        <Section title="9. Contato">
          <p>
            Para dúvidas, solicitações ou exercício dos seus direitos relacionados à privacidade,
            entre em contato:
          </p>
          <ul>
            <li><strong>Responsável:</strong> {hero.name}</li>
          </ul>
        </Section>

        <Section title="10. Alterações nesta política">
          <p>
            Esta política pode ser atualizada periodicamente. Recomendamos revisitá-la
            regularmente. Mudanças significativas serão comunicadas por meio deste site.
          </p>
        </Section>
      </main>

      <footer className="border-t border-border mt-10 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {hero.name}. Todos os direitos reservados.
      </footer>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2 className="text-base font-semibold text-foreground">{title}</h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_strong]:text-foreground">
      {children}
    </div>
  </section>
);

export default PrivacidadePage;
