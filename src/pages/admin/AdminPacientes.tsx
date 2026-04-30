import {
  Users, Plus, Search, Trash2, ChevronRight, UserCircle2, Loader2, MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { fetchPatients, deletePatient, upsertPatient, type Patient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type GenderFilter = "all" | "M" | "F" | "outro";
type SortKey      = "recent" | "oldest" | "name";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GENDER_LABEL: Record<string, string> = { M: "Masculino", F: "Feminino", outro: "Outro" };

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "recent", label: "Mais recente" },
  { id: "oldest", label: "Mais antigo"  },
  { id: "name",   label: "Nome A–Z"     },
];

const initials = (name: string) =>
  name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

const age = (d: string) =>
  Math.floor((Date.now() - new Date(d).getTime()) / (365.25 * 24 * 60 * 60 * 1000));

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

// ─── Form state ───────────────────────────────────────────────────────────────

interface NewPatientForm {
  name: string; email: string; phone: string; city: string;
  birth_date: string; gender: string; occupation: string;
}

const emptyForm: NewPatientForm = {
  name: "", email: "", phone: "", city: "", birth_date: "", gender: "", occupation: "",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPacientes() {
  const navigate = useNavigate();

  const [patients,   setPatients]   = useState<Patient[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [gender,     setGender]     = useState<GenderFilter>("all");
  const [sort,       setSort]       = useState<SortKey>("recent");
  const [showModal,  setShowModal]  = useState(false);
  const [form,       setForm]       = useState<NewPatientForm>(emptyForm);
  const [saving,     setSaving]     = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadPatients = async () => {
    setLoading(true);
    try { setPatients(await fetchPatients()); }
    catch { toast.error("Erro ao carregar pacientes."); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadPatients(); }, []);

  const genderCounts = useMemo(() => {
    const q = search.toLowerCase();
    const base = q
      ? patients.filter((p) => p.name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q))
      : patients;
    return {
      all:   base.length,
      M:     base.filter((p) => p.gender === "M").length,
      F:     base.filter((p) => p.gender === "F").length,
      outro: base.filter((p) => p.gender === "outro").length,
    };
  }, [patients, search]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = patients.filter((p) =>
      (!q || p.name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q)) &&
      (gender === "all" || p.gender === gender)
    );
    if (sort === "name")   list = [...list].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    if (sort === "recent") list = [...list].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    if (sort === "oldest") list = [...list].sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
    return list;
  }, [patients, search, gender, sort]);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!window.confirm("Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.")) return;
    setDeletingId(id);
    const ok = await deletePatient(id);
    if (ok) { setPatients((prev) => prev.filter((p) => p.id !== id)); toast.success("Paciente excluído."); }
    else    { toast.error("Erro ao excluir paciente."); }
    setDeletingId(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("O nome do paciente é obrigatório."); return; }
    setSaving(true);
    const result = await upsertPatient({
      name:       form.name.trim(),
      email:      form.email.trim()      || undefined,
      phone:      form.phone.trim()      || undefined,
      city:       form.city.trim()       || undefined,
      birth_date: form.birth_date        || undefined,
      gender:     (form.gender as Patient["gender"]) || undefined,
      occupation: form.occupation.trim() || undefined,
    });
    setSaving(false);
    if (!result) { toast.error("Erro ao salvar. Verifique o console e as tabelas do Supabase."); return; }
    toast.success("Paciente cadastrado com sucesso!");
    setShowModal(false);
    setForm(emptyForm);
    await loadPatients();
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const hasFilter = gender !== "all" || search.trim() !== "";

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background p-8 space-y-0">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 pb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Pacientes</h1>
          <p className="text-sm text-muted-foreground mt-1">Registro de prontuários da clínica</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="flex items-center gap-2 h-11 px-5 rounded-xl shrink-0 font-bold shadow-sm">
          <Plus className="w-5 h-5" />
          Novo Paciente
        </Button>
      </div>

      {/* ── Stat strip ──────────────────────────────────────────────────────── */}
      <div className="flex items-stretch gap-0 border border-border rounded-2xl overflow-hidden mb-8 shadow-sm">
        {[
          { label: "Total",     value: patients.length                                      },
          { label: "Masculino", value: patients.filter((p) => p.gender === "M").length      },
          { label: "Feminino",  value: patients.filter((p) => p.gender === "F").length      },
          { label: "Outro",     value: patients.filter((p) => p.gender === "outro").length  },
        ].map((s, i) => (
          <div key={s.label} className={cn(
            "flex-1 px-8 py-5 bg-card",
            i > 0 && "border-l border-border"
          )}>
            <p className="text-2xl font-black tabular-nums text-foreground leading-none">{s.value}</p>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mt-1.5 opacity-70">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4 w-full py-6 mb-0">
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-11 rounded-xl text-sm border-border/60 focus:ring-primary/20 w-full"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-11 rounded-xl border border-input bg-card px-4 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all sm:w-48"
        >
          {SORT_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>

      {/* ── Gender filter tabs (underline style) ────────────────────────────── */}
      <div className="flex border-b border-border mt-6 mb-0 px-2">
        {(["all", "M", "F", "outro"] as GenderFilter[]).map((g) => {
          const label = g === "all" ? "Todos" : GENDER_LABEL[g];
          const count = genderCounts[g];
          const active = gender === g;
          return (
            <button
              key={g}
              onClick={() => setGender(g)}
              className={cn(
                "flex items-center gap-2.5 px-6 py-3.5 text-sm font-bold border-b-2 -mb-px transition-all whitespace-nowrap",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              {label}
              <span className={cn(
                "text-[10px] font-black px-2 py-0.5 rounded-full tabular-nums shadow-inner",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
          <p className="text-sm font-medium">Carregando pacientes...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 gap-4 text-center border border-border border-t-0 bg-card rounded-b-2xl shadow-sm">
          <UserCircle2 className="w-14 h-14 text-muted-foreground/20" />
          <div className="space-y-1">
            <p className="text-base font-bold text-foreground">
              {hasFilter ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado ainda"}
            </p>
            <p className="text-sm text-muted-foreground max-w-[300px] mx-auto">
              {hasFilter ? "Tente ajustar a busca ou os filtros para encontrar o que procura." : "Adicione o primeiro paciente para começar a gerenciar sua clínica."}
            </p>
          </div>
          {hasFilter ? (
            <Button variant="outline" className="rounded-xl mt-2 px-6"
              onClick={() => { setSearch(""); setGender("all"); }}>
              Limpar filtros
            </Button>
          ) : (
            <Button variant="outline" className="rounded-xl mt-2 px-6 h-11 font-bold" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar paciente
            </Button>
          )}
        </div>
      ) : (
        <div className="border border-border border-t-0 rounded-b-2xl overflow-hidden bg-card shadow-sm">

          {/* Column headers */}
          <div className="hidden sm:grid grid-cols-[1.2fr_1fr_120px_140px_64px] gap-4 border-b border-border bg-muted/30 px-6">
            {["Paciente", "Contato", "Gênero / Idade", "Cadastrado", ""].map((col, i) => (
              <div key={i} className={cn(
                "py-4 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60 flex items-center",
                i >= 2 && i <= 3 ? "justify-center text-center" : ""
              )}>
                {col}
              </div>
            ))}
          </div>

          {/* Rows */}
          {filtered.map((patient, idx) => (
            <div
              key={patient.id}
              onClick={() => navigate(`/admin/pacientes/${patient.id}`)}
              className={cn(
                "group flex sm:grid sm:grid-cols-[1.2fr_1fr_120px_140px_64px] items-center gap-4 sm:gap-4 px-6 py-5 cursor-pointer hover:bg-muted/40 transition-all",
                idx < filtered.length - 1 && "border-b border-border/40"
              )}
            >
              {/* Paciente */}
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-black shrink-0 shadow-sm border border-primary/5 group-hover:scale-105 transition-transform">
                  {patient.name ? initials(patient.name) : "?"}
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{patient.name ?? "—"}</p>
                  <p className="text-[11px] text-muted-foreground truncate font-medium flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 opacity-50" />
                    {patient.city || "Cidade não inf."}
                  </p>
                </div>
              </div>

              {/* Contato */}
              <div className="hidden sm:flex flex-col justify-center min-w-0 space-y-0.5">
                <p className="text-sm text-foreground/80 font-medium truncate">{patient.email || "—"}</p>
                <p className="text-[11px] text-muted-foreground font-medium truncate">{patient.phone || "Sem telefone"}</p>
              </div>

              {/* Gênero / Idade */}
              <div className="hidden sm:flex flex-col items-center justify-center text-center space-y-0.5">
                <p className="text-sm text-foreground/70 font-semibold">{patient.gender ? GENDER_LABEL[patient.gender] : "—"}</p>
                <p className="text-[11px] text-muted-foreground font-bold bg-muted px-2 py-0.5 rounded-full">
                  {patient.birth_date ? `${age(patient.birth_date)} anos` : "—"}
                </p>
              </div>

              {/* Cadastrado */}
              <div className="hidden sm:flex flex-col items-center justify-center text-center space-y-0.5">
                <p className="text-xs text-muted-foreground/80 font-bold uppercase tracking-tighter">
                  {patient.created_at ? formatDate(patient.created_at).split(" de ")[0] : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground/50 font-medium italic">
                  {patient.created_at ? formatDate(patient.created_at).split(" de ").slice(1).join(" ") : ""}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1 shrink-0">
                <button
                  onClick={(e) => patient.id !== undefined && handleDelete(e, patient.id)}
                  disabled={deletingId === patient.id}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-40"
                  aria-label="Excluir"
                >
                  {deletingId === patient.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />}
                </button>
                <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
              </div>
            </div>
          ))}

          {/* Footer count */}
          <div className="px-6 py-4 border-t border-border/40 bg-muted/20">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
              {filtered.length === patients.length
                ? `${patients.length} paciente${patients.length !== 1 ? "s" : ""} no total`
                : `${filtered.length} de ${patients.length} paciente${patients.length !== 1 ? "s" : ""} encontrados`}
            </p>
          </div>
        </div>
      )}

      {/* ── New Patient Modal ────────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-card border border-border rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">

            {/* Modal header */}
            <div className="flex items-center gap-4 px-8 py-6 border-b border-border bg-muted/30">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-black tracking-tight text-foreground">Novo Paciente</h2>
                <p className="text-xs text-muted-foreground font-medium">Preencha os dados do prontuário clínico</p>
              </div>
            </div>

            {/* Form */}
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                  Nome completo <span className="text-destructive">*</span>
                </Label>
                <Input id="name" name="name" placeholder="Nome completo" value={form.name}
                  onChange={handleFormChange} autoFocus className="rounded-xl h-11 border-border/60" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">E-mail</Label>
                  <Input id="email" name="email" type="email" placeholder="exemplo@email.com"
                    value={form.email} onChange={handleFormChange} className="rounded-xl h-11 border-border/60" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Telefone</Label>
                  <Input id="phone" name="phone" placeholder="(00) 00000-0000"
                    value={form.phone} onChange={handleFormChange} className="rounded-xl h-11 border-border/60" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Cidade</Label>
                  <Input id="city" name="city" placeholder="Cidade"
                    value={form.city} onChange={handleFormChange} className="rounded-xl h-11 border-border/60" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="occupation" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Ocupação</Label>
                  <Input id="occupation" name="occupation" placeholder="Profissão"
                    value={form.occupation} onChange={handleFormChange} className="rounded-xl h-11 border-border/60" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birth_date" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Nascimento</Label>
                  <Input id="birth_date" name="birth_date" type="date"
                    value={form.birth_date} onChange={handleFormChange} className="rounded-xl h-11 border-border/60" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Gênero</Label>
                  <select id="gender" name="gender" value={form.gender} onChange={handleFormChange}
                    className="flex h-11 w-full rounded-xl border border-input bg-transparent px-4 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring text-foreground border-border/60">
                    <option value="">Selecionar</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-8 py-6 border-t border-border bg-muted/20">
              <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold"
                onClick={() => { setShowModal(false); setForm(emptyForm); }} disabled={saving}>
                Cancelar
              </Button>
              <Button className="flex-1 h-12 rounded-xl flex items-center justify-center gap-2 font-black shadow-lg shadow-primary/20"
                onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</> : "Cadastrar paciente"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
