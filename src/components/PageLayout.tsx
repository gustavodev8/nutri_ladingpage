import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { type ReactNode } from "react";

interface PageLayoutProps {
  children: ReactNode;
}

const PageLayout = ({ children }: PageLayoutProps) => (
  <div className="min-h-screen">
    <Navbar />
    <main className="pt-16 lg:pt-20">{children}</main>
    <Footer />
    <WhatsAppButton />
  </div>
);

export default PageLayout;
