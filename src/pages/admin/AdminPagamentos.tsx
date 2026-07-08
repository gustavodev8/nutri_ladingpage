import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingBag, User, Mail, Package, Calendar, FileText } from "lucide-react";
import { useContent } from "@/contexts/ContentContext";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

interface PaymentLog {
  id: number;
  created_at: string;
  payment_id: string;
  customer_name: string;
  customer_email: string;
  product_name: string;
  product_index: number;
  amount: number;
  status: string;
  pdf_url: string;
}

const AdminPagamentos = () => {
  const [logs, setLogs] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { content } = useContent();

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from("payment_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setError("Erro ao carregar logs: " + error.message);
      } else {
        setLogs(data || []);
      }
      setLoading(false);
    };
    fetchLogs();
  }, []);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const formatDateOnly = (iso: string) => {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);

  const getInitials = (name: string) =>
    name?.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase() || "?";

  const generateReceiptPdf = (log: PaymentLog) => {
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentW = pageWidth - margin * 2;

      // Receipt box dimensions (A4 top half)
      const boxX = margin;
      const boxY = 20;
      const boxW = contentW;
      const boxH = 120;

      // Draw receipt border (clean dashed or thin solid border)
      doc.setDrawColor(209, 213, 219);
      doc.setLineWidth(0.3);
      doc.rect(boxX, boxY, boxW, boxH);

      // Draw top header banner
      doc.setFillColor(249, 250, 251);
      doc.rect(boxX + 0.15, boxY + 0.15, boxW - 0.3, 15, "F");
      doc.setDrawColor(229, 231, 235);
      doc.line(boxX, boxY + 15, boxX + boxW, boxY + 15);

      // Header Text
      doc.setTextColor(15, 118, 110);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("RECIBO DE PAGAMENTO", boxX + 6, boxY + 9.5);

      // Receipt Number & Date
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const receiptNo = `Nº: #${log.payment_id.substring(0, 10).toUpperCase()}`;
      const receiptNoWidth = doc.getTextWidth(receiptNo);
      doc.text(receiptNo, boxX + boxW - receiptNoWidth - 6, boxY + 9.5);

      // Content layout
      let y = boxY + 25;

      // Value Box
      const amountStr = formatCurrency(log.amount);
      doc.setFillColor(243, 244, 246);
      doc.roundedRect(boxX + boxW - 65, y, 59, 12, 1, 1, "F");
      doc.setTextColor(15, 118, 110);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(`VALOR: ${amountStr}`, boxX + boxW - 62, y + 8);

      // Issuer Title / Branding
      doc.setTextColor(17, 24, 39);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(content?.identity?.doctorName || "Dr. Fillipe David", boxX + 6, y + 4);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Nutricionista Clínico e Esportivo - CRN: ${content?.identity?.crn || "—"}`, boxX + 6, y + 9);

      y += 22;

      // Receipt core text
      doc.setTextColor(17, 24, 39);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);

      const line1 = `Recebi(emos) de: ${log.customer_name || "—"}`;
      const line2 = `A quantia de: ${amountStr}`;
      const line3 = `Referente a: ${log.product_name || "—"}`;

      doc.text(line1, boxX + 6, y);
      doc.text(line2, boxX + 6, y + 8);
      doc.text(line3, boxX + 6, y + 16);

      y += 30;

      // Date and city
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9);
      const dateText = `${content?.contact?.city || "Alagoinhas"} - BA, ${formatDateOnly(log.created_at)}`;
      doc.text(dateText, boxX + 6, y);

      // Signature Area
      const sigLineW = 60;
      const sigLineX = boxX + boxW - sigLineW - 6;
      doc.setDrawColor(100, 116, 139);
      doc.setLineWidth(0.2);
      doc.line(sigLineX, y, sigLineX + sigLineW, y);

      doc.setTextColor(17, 24, 39);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("ASSINATURA DO EMITENTE", sigLineX + sigLineW / 2, y + 4.5, { align: "center" });

      doc.save(`recibo-${log.payment_id}.pdf`);
      toast.success("Recibo gerado com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar recibo em PDF.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <ShoppingBag className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Logs de Pagamento</h1>
          <p className="text-sm text-muted-foreground">Histórico de compras realizadas</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-card border border-border p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total de vendas</p>
          <p className="text-2xl font-bold text-foreground">{logs.length}</p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Receita total</p>
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(logs.reduce((sum, l) => sum + (l.amount || 0), 0))}
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <div className="rounded-2xl bg-card border border-border p-12 text-center">
          <ShoppingBag className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma compra registrada ainda.</p>
        </div>
      )}

      {!loading && logs.length > 0 && (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="rounded-2xl bg-card border border-border p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">{getInitials(log.customer_name)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{log.customer_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{log.customer_email}</p>
                  </div>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/20 shrink-0">
                  {formatCurrency(log.amount)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Package className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{log.product_name || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>{formatDate(log.created_at)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">#{log.payment_id}</span>
                  <Badge variant="outline" className="text-xs border-green-200 text-green-700 bg-green-50">
                    {log.status}
                  </Badge>
                </div>
                <button
                  onClick={() => generateReceiptPdf(log)}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer"
                  title="Gerar recibo em PDF"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Gerar Recibo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPagamentos;
