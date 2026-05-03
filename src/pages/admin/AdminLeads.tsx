import { useEffect, useState, useCallback } from "react";
import { Users, Search, Trash2, Download, Loader2, RefreshCw, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

interface Lead {
  id: number;
  name: string;
  email: string;
  source: string;
  created_at: string;
}

const AdminLeads = () => {
  const [leads, setLeads]       = useState<Lead[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    setLeads(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    if (!confirm("Remover este lead?")) return;
    setDeleting(id);
    await supabase.from("leads").delete().eq("id", id);
    setLeads(prev => prev.filter(l => l.id !== id));
    setDeleting(null);
  };

  const exportCsv = () => {
    const rows = [["Nome", "E-mail", "Origem", "Data"], ...filtered.map(l => [
      l.name, l.email, l.source,
      new Date(l.created_at).toLocaleString("pt-BR"),
    ])];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a   = document.createElement("a");
    a.href = url; a.download = "leads.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = leads.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads Captados</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Contatos cadastrados via popup de captação no site.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Total de leads</p>
          <p className="text-2xl font-bold text-foreground mt-0.5">{leads.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Último 7 dias</p>
          <p className="text-2xl font-bold text-foreground mt-0.5">
            {leads.filter(l => Date.now() - new Date(l.created_at).getTime() < 7 * 86400 * 1000).length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 col-span-2 sm:col-span-1">
          <p className="text-xs text-muted-foreground">Último 30 dias</p>
          <p className="text-2xl font-bold text-foreground mt-0.5">
            {leads.filter(l => Date.now() - new Date(l.created_at).getTime() < 30 * 86400 * 1000).length}
          </p>
        </div>
      </div>

      {/* Search + table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou e-mail…"
              className="pl-8 h-9 rounded-lg text-sm"
            />
          </div>
          <span className="text-xs text-muted-foreground ml-auto shrink-0">
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {search ? "Nenhum lead encontrado para essa busca." : "Nenhum lead captado ainda."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">Nome</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">E-mail</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3 hidden sm:table-cell">Origem</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3 hidden md:table-cell">Data</th>
                  <th className="px-5 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map(lead => (
                  <tr key={lead.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 font-medium text-foreground">{lead.name}</td>
                    <td className="px-5 py-3">
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-primary hover:underline flex items-center gap-1.5"
                      >
                        <Mail className="h-3 w-3 shrink-0" />
                        {lead.email}
                      </a>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                        {lead.source}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground hidden md:table-cell text-xs">
                      {new Date(lead.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleDelete(lead.id)}
                        disabled={deleting === lead.id}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Remover lead"
                      >
                        {deleting === lead.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLeads;
