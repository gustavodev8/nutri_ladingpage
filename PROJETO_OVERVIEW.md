# DOCUMENTAÇÃO TÉCNICA: NutriLanding (Nutricionista)

Este arquivo fornece uma visão geral do projeto para onboarding de novos desenvolvedores ou modelos de IA.

## 1. Visão Geral
Projeto de landing page profissional e sistema de gestão clínica (EHR) para nutricionista. Construído como uma Single Page Application (SPA).

- **Stack:** React 18, TypeScript, Vite, Tailwind CSS, Shadcn/UI, Supabase (DB, Auth, Storage, Edge Functions).
- **Deploy:** Vercel.
- **Roteamento:** React Router (necessita de `vercel.json` para rewrites).

## 2. Estrutura do Projeto
- `src/`: Código fonte.
- `src/components/`: Componentes reutilizáveis (UI) e seções da página.
- `src/components/admin/`: Componentes complexos da área administrativa (fórmulas, planos, exames).
- `src/pages/`: Páginas públicas da aplicação.
- `src/pages/admin/`: Páginas do painel administrativo.
- `src/contexts/`: Gerenciamento de estado global (`ContentContext` é crítico para o conteúdo editável).
- `src/lib/`: Utilitários, Supabase client e regras de negócio.
- `supabase/`: Migrações SQL e Edge Functions.

## 3. Fluxo de Dados (ContentContext)
Todo o conteúdo editável do site (`SiteContent`) é gerido centralmente:
1. Carrega do `localStorage` (cache).
2. Sincroniza com Supabase `site_content` (tabela de linha única).
3. `deepMerge` garante que campos novos do `DEFAULT_CONTENT` sejam preservados.
4. Admin altera -> `updateContent()` -> persiste no DB e state.

## 4. Área Administrativa (/admin)
Área protegida por autenticação Supabase (`ProtectedRoute`). O painel é dividido em duas frentes:
- **Configuração de Branding:** Edição de textos e imagens da landing page.
- **Gestão Clínica:** Sistema robusto para prontuários, planos alimentares, antropometria e agendamentos.

### Componentes de Alta Complexidade:
- `src/pages/admin/AdminAgendamentos.tsx`: Orquestrador de status de consultas, reagendamentos e automação de prontuários.
- `src/components/admin/ExamLibraryManager.tsx`: Gestão da biblioteca de exames laboratoriais.
- `src/components/admin/PrescriptionBuilder.tsx` & `MealTableEditor.tsx`: Construtores complexos de dieta.

## 5. Diretrizes para Modificação
- **Nunca remover componentes obsoletos** (`ShopSection`, `PricingSection`), apenas não os utilize.
- **Validação:** Sempre rodar `npm run build` e verificar testes após alterações estruturais.
- **Segurança:** O painel admin é restrito. Alterações na lógica de auth ou nas policies do Supabase exigem revisão minuciosa.
- **Sincronização:** Alterações no `ContentContext` devem garantir que o `DEFAULT_CONTENT` permaneça consistente para evitar que o site perca a configuração base ao resetar.
