import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingBag, User, Mail, Package, Calendar } from "lucide-react";

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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);

  const getInitials = (name: string) =>
    name?.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase() || "?";

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

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">#{log.payment_id}</span>
                <Badge variant="outline" className="text-xs border-green-200 text-green-700 bg-green-50">
                  {log.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPagamentos;
