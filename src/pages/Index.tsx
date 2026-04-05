import { Leaf } from "lucide-react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import ServicesSection from "@/components/ServicesSection";
import ModalitiesSection from "@/components/ModalitiesSection";
import ResultsTeaser from "@/components/ResultsTeaser";
import DigitalProductsSection from "@/components/DigitalProductsSection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { useContent } from "@/contexts/ContentContext";

const Index = () => {
  const { loading } = useContent();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Leaf className="h-7 w-7 text-primary animate-pulse" />
          </div>
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {/* 1. Gancho — quem é e por que confiar */}
        <HeroSection />
        {/* 2. Credibilidade — 10 anos, 7 países, 7 mil pacientes */}
        <AboutSection />
        {/* 3. O que oferece — serviços detalhados */}
        <ServicesSection />
        {/* 4. Como atende — online vs presencial */}
        <ModalitiesSection />
        {/* 5. Prova social — teaser de resultados */}
        <ResultsTeaser />
        {/* 6. Ebooks e materiais digitais */}
        <DigitalProductsSection />
        {/* 6. Perguntas frequentes */}
        <FAQSection />
        {/* 7. CTA final */}
        <CTASection />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Index;
