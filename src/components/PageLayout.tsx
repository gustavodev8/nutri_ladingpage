import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { useHeaderHeight } from "@/hooks/useHeaderHeight";
import { type ReactNode } from "react";

interface PageLayoutProps {
  children: ReactNode;
}

const PageLayout = ({ children }: PageLayoutProps) => {
  const headerHeight = useHeaderHeight();
  return (
    <div className="min-h-screen">
      <Navbar />
      <main style={{ paddingTop: headerHeight }}>{children}</main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default PageLayout;
