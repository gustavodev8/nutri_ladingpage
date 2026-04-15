import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Contexts
import { ContentProvider } from "@/contexts/ContentContext";
import { AuthProvider } from "@/contexts/AuthContext";

// Public pages
import Index from "./pages/Index";
import ConsultasPage from "./pages/ConsultasPage";
import ResultadosPage from "./pages/ResultadosPage";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import ProdutoPage from "./pages/ProdutoPage";
import ClientGate from "@/components/ClientGate";
import BookingPage from "./pages/BookingPage";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentPending from "./pages/PaymentPending";
import PaymentFailure from "./pages/PaymentFailure";
import PrivacidadePage from "./pages/PrivacidadePage";
import NotFound from "./pages/NotFound";

// Admin
import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "@/components/admin/AdminLayout";
import ProtectedRoute from "@/components/admin/ProtectedRoute";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPerfil from "./pages/admin/AdminPerfil";
import AdminHero from "./pages/admin/AdminHero";
import AdminSobre from "./pages/admin/AdminSobre";
import AdminServicos from "./pages/admin/AdminServicos";
import AdminPrecos from "./pages/admin/AdminPrecos";
import AdminHorarios from "./pages/admin/AdminHorarios";
import AdminDepoimentos from "./pages/admin/AdminDepoimentos";
import AdminFAQ from "./pages/admin/AdminFAQ";
import AdminCTA from "./pages/admin/AdminCTA";
import AdminContato from "./pages/admin/AdminContato";
import AdminModalidades from "./pages/admin/AdminModalidades";
import AdminProdutosDigitais from "./pages/admin/AdminProdutosDigitais";
import AdminResultados from "./pages/admin/AdminResultados";
import AdminSenha from "./pages/admin/AdminSenha";
import AdminPagamentos from "./pages/admin/AdminPagamentos";
import AdminDisponibilidade from "./pages/admin/AdminDisponibilidade";
import AdminAgendamentos from "./pages/admin/AdminAgendamentos";
import AdminBlog from "./pages/admin/AdminBlog";
import AdminPacientes from "./pages/admin/AdminPacientes";
import AdminPaciente from "./pages/admin/AdminPaciente";
import AdminPlanoAlimentar from "./pages/admin/AdminPlanoAlimentar";
import AdminAlimentos from "./pages/admin/AdminAlimentos";

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ContentProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              {/* Landing page */}
              <Route path="/" element={<Index />} />

              {/* Public pages */}
              <Route path="/consultas" element={<ClientGate />} />
              <Route path="/resultados" element={<ResultadosPage />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/privacidade" element={<PrivacidadePage />} />

              {/* Product detail pages */}
              <Route path="/produto/:id" element={<ProdutoPage />} />

              {/* Booking page */}
              <Route path="/agendar/:planIndex" element={<BookingPage />} />

              {/* Payment status pages */}
              <Route path="/pagamento/sucesso" element={<PaymentSuccess />} />
              <Route path="/pagamento/pendente" element={<PaymentPending />} />
              <Route path="/pagamento/erro" element={<PaymentFailure />} />

              {/* Admin login */}
              <Route path="/admin/login" element={<AdminLogin />} />

              {/* Admin panel (protected) */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="perfil" element={<AdminPerfil />} />
                <Route path="hero" element={<AdminHero />} />
                <Route path="sobre" element={<AdminSobre />} />
                <Route path="servicos" element={<AdminServicos />} />
                <Route path="precos" element={<AdminPrecos />} />
                <Route path="horarios" element={<AdminHorarios />} />
                <Route path="depoimentos" element={<AdminDepoimentos />} />
                <Route path="faq" element={<AdminFAQ />} />
                <Route path="cta" element={<AdminCTA />} />
                <Route path="contato" element={<AdminContato />} />
                <Route path="modalidades" element={<AdminModalidades />} />
                <Route path="produtos" element={<AdminProdutosDigitais />} />
                <Route path="resultados" element={<AdminResultados />} />
                <Route path="senha" element={<AdminSenha />} />
                <Route path="pagamentos" element={<AdminPagamentos />} />
                <Route path="disponibilidade" element={<AdminDisponibilidade />} />
                <Route path="agendamentos" element={<AdminAgendamentos />} />
                <Route path="blog" element={<AdminBlog />} />
                <Route path="pacientes" element={<AdminPacientes />} />
                <Route path="pacientes/:id" element={<AdminPaciente />} />
                <Route path="pacientes/:id/plano/:planId" element={<AdminPlanoAlimentar />} />
                <Route path="alimentos" element={<AdminAlimentos />} />
                {/* Fallback inside admin */}
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ContentProvider>
  </QueryClientProvider>
);

export default App;
