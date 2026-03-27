import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Contexts
import { ContentProvider } from "@/contexts/ContentContext";
import { AuthProvider } from "@/contexts/AuthContext";

// Public pages
import Index from "./pages/Index";
import ProdutoPage from "./pages/ProdutoPage";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ContentProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Landing page */}
              <Route path="/" element={<Index />} />

              {/* Product detail pages */}
              <Route path="/produto/:id" element={<ProdutoPage />} />

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
