import {
  Users, Plus, Search, Trash2, ChevronRight, UserCircle2, Loader2,
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
    <div className="min-h-screen bg-background p-6 space-y-0">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 pb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Pacientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Registro de prontuários da clínica</p>
        </div>
        <Button onClick={() => setShowModal(true)} size="sm" className="flex items-center gap-1.5 rounded-md shrink-0">
          <Plus className="w-4 h-4" />
          Novo Paciente
        </Button>
      </div>

      {/* ── Stat strip ──────────────────────────────────────────────────────── */}
      <div className="flex items-stretch gap-0 border border-border rounded-md overflow-hidden mb-6">
        {[
          { label: "Total",     value: patients.length                                      },
          { label: "Masculino", value: patients.filter((p) => p.gender === "M").length      },
          { label: "Feminino",  value: patients.filter((p) => p.gender === "F").length      },
          { label: "Outro",     value: patients.filter((p) => p.gender === "outro").length  },
        ].map((s, i) => (
          <div key={s.label} className={cn(
            "flex-1 px-5 py-3.5 bg-card",
            i > 0 && "border-l border-border"
          )}>
            <p className="text-xl font-bold tabular-nums text-foreground leading-none">{s.value}</p>
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 rounded-md text-sm"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-9 rounded-md border border-input bg-card px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {SORT_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>

      {/* ── Gender filter tabs (underline style) ────────────────────────────── */}
      <div className="flex border-b border-border mt-4 mb-0">
        {(["all", "M", "F", "outro"] as GenderFilter[]).map((g) => {
          const label = g === "all" ? "Todos" : GENDER_LABEL[g];
          const count = genderCounts[g];
          const active = gender === g;
          return (
            <button
              key={g}
              onClick={() => setGender(g)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {label}
              <span className={cn(
                "text-[11px] font-semibold px-1.5 py-0.5 rounded tabular-nums",
                active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="text-sm">Carregando pacientes...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center border border-border border-t-0 bg-card">
          <UserCircle2 className="w-10 h-10 text-muted-foreground/30" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {hasFilter ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado ainda"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {hasFilter ? "Tente ajustar a busca ou os filtros." : "Adicione o primeiro paciente para começar."}
            </p>
          </div>
          {hasFilter ? (
            <Button variant="outline" size="sm" className="rounded-md mt-1"
              onClick={() => { setSearch(""); setGender("all"); }}>
              Limpar filtros
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="rounded-md mt-1" onClick={() => setShowModal(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Adicionar paciente
            </Button>
          )}
        </div>
      ) : (
        <div className="border border-border border-t-0 rounded-b-md overflow-hidden bg-card">

          {/* Column headers */}
          <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_100px_120px_56px] gap-0 border-b border-border bg-muted/50">
            {["Paciente", "Contato", "Gênero / Idade", "Cadastrado", ""].map((col, i) => (
              <div key={i} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                "group flex sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_100px_120px_56px] items-center gap-3 sm:gap-0 px-4 py-3.5 cursor-pointer hover:bg-muted/40 transition-colors",
                idx < filtered.length - 1 && "border-b border-border/60"
              )}
            >
              {/* Paciente */}
              <div className="flex items-center gap-3 min-w-0 flex-1 sm:pr-4">
                <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {patient.name ? initials(patient.name) : "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{patient.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[patient.city, patient.occupation].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
              </div>

              {/* Contato */}
              <div className="hidden sm:block min-w-0 pr-4">
                <p className="text-sm text-foreground truncate">{patient.email || "—"}</p>
                <p className="text-xs text-muted-foreground truncate">{patient.phone || ""}</p>
              </div>

              {/* Gênero / Idade */}
              <div className="hidden sm:block">
                <p className="text-sm text-foreground">{patient.gender ? GENDER_LABEL[patient.gender] : "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {patient.birth_date ? `${age(patient.birth_date)} anos` : ""}
                </p>
              </div>

              {/* Cadastrado */}
              <div className="hidden sm:block">
                <p className="text-xs text-muted-foreground">
                  {patient.created_at ? formatDate(patient.created_at) : "—"}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-0.5 shrink-0">
                <button
                  onClick={(e) => patient.id !== undefined && handleDelete(e, patient.id)}
                  disabled={deletingId === patient.id}
                  className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-40"
                  aria-label="Excluir"
                >
                  {deletingId === patient.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                </button>
                <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
              </div>
            </div>
          ))}

          {/* Footer count */}
          <div className="px-4 py-2.5 border-t border-border/60 bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {filtered.length === patients.length
                ? `${patients.length} paciente${patients.length !== 1 ? "s" : ""}`
                : `${filtered.length} de ${patients.length} paciente${patients.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
      )}

      {/* ── New Patient Modal ────────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-card border border-border rounded-lg w-full max-w-md shadow-2xl overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Novo Paciente</h2>
                <p className="text-xs text-muted-foreground">Preencha os dados do prontuário</p>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Nome completo <span className="text-destructive">*</span>
                </Label>
                <Input id="name" name="name" placeholder="Nome completo" value={form.name}
                  onChange={handleFormChange} autoFocus className="rounded-md" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">E-mail</Label>
                  <Input id="email" name="email" type="email" placeholder="exemplo@email.com"
                    value={form.email} onChange={handleFormChange} className="rounded-md" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Telefone</Label>
                  <Input id="phone" name="phone" placeholder="(00) 00000-0000"
                    value={form.phone} onChange={handleFormChange} className="rounded-md" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cidade</Label>
                  <Input id="city" name="city" placeholder="Salvador"
                    value={form.city} onChange={handleFormChange} className="rounded-md" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="occupation" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ocupação</Label>
                  <Input id="occupation" name="occupation" placeholder="Profissão"
                    value={form.occupation} onChange={handleFormChange} className="rounded-md" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="birth_date" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nascimento</Label>
                  <Input id="birth_date" name="birth_date" type="date"
                    value={form.birth_date} onChange={handleFormChange} className="rounded-md" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gender" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gênero</Label>
                  <select id="gender" name="gender" value={form.gender} onChange={handleFormChange}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring text-foreground">
                    <option value="">Selecionar</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex gap-2.5 px-6 py-4 border-t border-border bg-muted/20">
              <Button variant="outline" className="flex-1 rounded-md"
                onClick={() => { setShowModal(false); setForm(emptyForm); }} disabled={saving}>
                Cancelar
              </Button>
              <Button className="flex-1 rounded-md flex items-center justify-center gap-2"
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
