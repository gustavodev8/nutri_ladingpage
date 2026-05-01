import {
  Users, Plus, Search, Trash2, ChevronRight, UserCircle2, Loader2, MapPin,
  TrendingUp, CalendarDays, BarChart2, Building2, AlertCircle, SlidersHorizontal, X,
  ChevronLeft, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { fetchPatients, deletePatient, upsertPatient, type Patient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type GenderFilter = "all" | "M" | "F" | "outro";
type SortKey      = "recent" | "oldest" | "name" | "age_asc" | "age_desc";

const ITEMS_PER_PAGE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GENDER_LABEL: Record<string, string> = { M: "Masculino", F: "Feminino", outro: "Outro" };

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "recent",   label: "Mais recente"   },
  { id: "oldest",   label: "Mais antigo"    },
  { id: "name",     label: "Nome A–Z"       },
  { id: "age_asc",  label: "Mais jovem"     },
  { id: "age_desc", label: "Mais velho"     },
];

const initials = (name: string) =>
  name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

const calcAge = (d: string) =>
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

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  warn?: boolean;
}

function StatCard({ icon, label, value, sub, accent, warn }: StatCardProps) {
  return (
    <div className={cn(
      "flex flex-col gap-3 rounded-2xl border bg-card px-5 py-5 shadow-sm transition-all hover:shadow-md",
      accent && "border-primary/40 bg-primary/[0.04]",
      warn   && "border-amber-400/40 bg-amber-50/60 dark:bg-amber-950/20"
    )}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{label}</span>
        <span className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
          accent ? "bg-primary/20 text-primary" : warn ? "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400" : "bg-primary/8 text-primary/60"
        )}>
          {icon}
        </span>
      </div>
      <div>
        <p className={cn("text-2xl font-black tabular-nums leading-none", accent ? "text-primary" : "text-foreground")}>{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPacientes() {
  const navigate = useNavigate();

  const [patients,      setPatients]      = useState<Patient[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [gender,        setGender]        = useState<GenderFilter>("all");
  const [sort,          setSort]          = useState<SortKey>("recent");
  const [showModal,     setShowModal]     = useState(false);
  const [form,          setForm]          = useState<NewPatientForm>(emptyForm);
  const [saving,        setSaving]        = useState(false);
  const [deletingId,    setDeletingId]    = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [showAdvanced,  setShowAdvanced]  = useState(false);
  const [page,          setPage]          = useState(1);

  // Advanced filters
  const [cityFilter,  setCityFilter]  = useState("");
  const [ageMin,      setAgeMin]      = useState("");
  const [ageMax,      setAgeMax]      = useState("");
  const [dateFrom,    setDateFrom]    = useState("");
  const [dateTo,      setDateTo]      = useState("");

  const loadPatients = async () => {
    setLoading(true);
    try { setPatients(await fetchPatients()); }
    catch { toast.error("Erro ao carregar pacientes."); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadPatients(); }, []);

  // ── Derived stats ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date();
    const ym  = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    const thisMonth = ym(now);
    const lastMonth = ym(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    const newThisMonth = patients.filter((p) => p.created_at?.slice(0, 7) === thisMonth).length;
    const newLastMonth = patients.filter((p) => p.created_at?.slice(0, 7) === lastMonth).length;

    const ages = patients
      .filter((p) => p.birth_date)
      .map((p) => calcAge(p.birth_date!));
    const avgAge = ages.length
      ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length)
      : null;

    const uniqueCities = new Set(
      patients.filter((p) => p.city?.trim()).map((p) => p.city!.trim().toLowerCase())
    ).size;

    const incomplete = patients.filter((p) => !p.email || !p.birth_date).length;

    const female = patients.filter((p) => p.gender === "F").length;
    const male   = patients.filter((p) => p.gender === "M").length;
    const femaleRatio = patients.length ? Math.round((female / patients.length) * 100) : 0;

    let monthDelta = "";
    if (newLastMonth > 0) {
      const diff = newThisMonth - newLastMonth;
      monthDelta = diff >= 0 ? `+${diff} vs mês anterior` : `${diff} vs mês anterior`;
    } else if (newThisMonth > 0) {
      monthDelta = "novo(s) cadastro(s)";
    }

    return { newThisMonth, monthDelta, avgAge, uniqueCities, incomplete, femaleRatio, female, male };
  }, [patients]);

  // ── Unique cities list for dropdown ─────────────────────────────────────────
  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    patients.forEach((p) => { if (p.city?.trim()) set.add(p.city.trim()); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [patients]);

  // ── Gender counts (respects text search only) ────────────────────────────────
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

  // ── Full filtered list ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q        = search.toLowerCase();
    const ageMinN  = ageMin  ? parseInt(ageMin)  : null;
    const ageMaxN  = ageMax  ? parseInt(ageMax)  : null;

    let list = patients.filter((p) => {
      if (q && !p.name?.toLowerCase().includes(q) && !p.email?.toLowerCase().includes(q)) return false;
      if (gender !== "all" && p.gender !== gender) return false;
      if (cityFilter && p.city?.trim().toLowerCase() !== cityFilter.trim().toLowerCase()) return false;
      if (ageMinN !== null || ageMaxN !== null) {
        if (!p.birth_date) return false;
        const a = calcAge(p.birth_date);
        if (ageMinN !== null && a < ageMinN) return false;
        if (ageMaxN !== null && a > ageMaxN) return false;
      }
      if (dateFrom && p.created_at && p.created_at.slice(0, 10) < dateFrom) return false;
      if (dateTo   && p.created_at && p.created_at.slice(0, 10) > dateTo)   return false;
      return true;
    });

    if (sort === "name")     list = [...list].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    if (sort === "recent")   list = [...list].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    if (sort === "oldest")   list = [...list].sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
    if (sort === "age_asc")  list = [...list].sort((a, b) => {
      const aa = a.birth_date ? calcAge(a.birth_date) : 0;
      const ba = b.birth_date ? calcAge(b.birth_date) : 0;
      return aa - ba;
    });
    if (sort === "age_desc") list = [...list].sort((a, b) => {
      const aa = a.birth_date ? calcAge(a.birth_date) : 0;
      const ba = b.birth_date ? calcAge(b.birth_date) : 0;
      return ba - aa;
    });

    return list;
  }, [patients, search, gender, cityFilter, ageMin, ageMax, dateFrom, dateTo, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [search, gender, cityFilter, ageMin, ageMax, dateFrom, dateTo, sort]);

  const hasAdvancedFilter = cityFilter !== "" || ageMin !== "" || ageMax !== "" || dateFrom !== "" || dateTo !== "";
  const hasFilter         = gender !== "all" || search.trim() !== "" || hasAdvancedFilter;

  const clearAdvanced = () => {
    setCityFilter(""); setAgeMin(""); setAgeMax(""); setDateFrom(""); setDateTo("");
  };
  const clearAll = () => {
    setSearch(""); setGender("all"); clearAdvanced();
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (confirmDeleteId === null) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
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

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-muted/30 p-8">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 pb-10">
        <div className="flex items-start gap-4">
          <div className="w-1 self-stretch rounded-full bg-primary mt-0.5" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Pacientes</h1>
            <p className="text-sm text-muted-foreground mt-1">Registro de prontuários da clínica</p>
          </div>
        </div>
        <Button onClick={() => setShowModal(true)} className="flex items-center gap-2 h-11 px-5 rounded-xl shrink-0 font-bold shadow-sm">
          <Plus className="w-5 h-5" />
          Novo Paciente
        </Button>
      </div>

      {/* ── Smart stats grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <StatCard
          icon={<Users className="w-4 h-4" />}
          label="Total de pacientes"
          value={patients.length}
          sub={patients.length === 1 ? "paciente cadastrado" : "pacientes cadastrados"}
          accent
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Novos este mês"
          value={stats.newThisMonth}
          sub={stats.monthDelta || "nenhum novo cadastro"}
        />
        <StatCard
          icon={<CalendarDays className="w-4 h-4" />}
          label="Média de idade"
          value={stats.avgAge !== null ? `${stats.avgAge} anos` : "—"}
          sub={stats.avgAge !== null ? "dos pacientes com data de nascimento" : "sem dados suficientes"}
        />
        <StatCard
          icon={<Building2 className="w-4 h-4" />}
          label="Cidades atendidas"
          value={stats.uniqueCities}
          sub={stats.uniqueCities === 1 ? "cidade registrada" : "cidades diferentes"}
        />
        <StatCard
          icon={<BarChart2 className="w-4 h-4" />}
          label="Distribuição feminino"
          value={patients.length ? `${stats.femaleRatio}% F` : "—"}
          sub={patients.length ? `${stats.female} fem. · ${stats.male} masc.` : "sem dados"}
        />
        <StatCard
          icon={<AlertCircle className="w-4 h-4" />}
          label="Perfis incompletos"
          value={stats.incomplete}
          sub={stats.incomplete > 0 ? "sem e-mail ou data de nascimento" : "todos completos"}
          warn={stats.incomplete > 0}
        />
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 w-full mt-8 mb-2">
        <div className="relative flex-1">
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
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className={cn(
            "h-11 px-4 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-all shrink-0",
            showAdvanced || hasAdvancedFilter
              ? "border-primary bg-primary/10 text-primary"
              : "border-input bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtros
          {hasAdvancedFilter && (
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center">
              {[cityFilter, ageMin || ageMax, dateFrom || dateTo].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* ── Advanced filters panel ──────────────────────────────────────────── */}
      {showAdvanced && (
        <div className="mt-4 p-5 rounded-2xl border border-border/70 bg-card shadow-sm flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* City */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Cidade</label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Todas as cidades</option>
                {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Age range */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Faixa etária</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Mín"
                  min={0}
                  max={120}
                  value={ageMin}
                  onChange={(e) => setAgeMin(e.target.value)}
                  className="h-10 rounded-xl border-border/60 text-sm"
                />
                <span className="text-muted-foreground text-xs font-bold shrink-0">até</span>
                <Input
                  type="number"
                  placeholder="Máx"
                  min={0}
                  max={120}
                  value={ageMax}
                  onChange={(e) => setAgeMax(e.target.value)}
                  className="h-10 rounded-xl border-border/60 text-sm"
                />
              </div>
            </div>

            {/* Date from */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Cadastrado de</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-10 rounded-xl border-border/60 text-sm"
              />
            </div>

            {/* Date to */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Até</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-10 rounded-xl border-border/60 text-sm"
              />
            </div>
          </div>

          {hasAdvancedFilter && (
            <div className="flex justify-end">
              <button
                onClick={clearAdvanced}
                className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Limpar filtros avançados
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Gender filter tabs ───────────────────────────────────────────────── */}
      <div className="flex border-b border-border mt-8 mb-0 px-1">
        {(["all", "M", "F", "outro"] as GenderFilter[]).map((g) => {
          const label  = g === "all" ? "Todos" : GENDER_LABEL[g];
          const count  = genderCounts[g];
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
        {hasFilter && (
          <button
            onClick={clearAll}
            className="ml-auto flex items-center gap-1.5 px-4 py-3.5 text-xs font-bold text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="w-3 h-3" />
            Limpar tudo
          </button>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
          <p className="text-sm font-medium">Carregando pacientes...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 gap-4 text-center border border-border border-t-0 bg-card rounded-b-2xl shadow-sm ring-1 ring-primary/5">
          <UserCircle2 className="w-14 h-14 text-muted-foreground/20" />
          <div className="space-y-1">
            <p className="text-base font-bold text-foreground">
              {hasFilter ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado ainda"}
            </p>
            <p className="text-sm text-muted-foreground max-w-[300px] mx-auto">
              {hasFilter
                ? "Tente ajustar a busca ou os filtros para encontrar o que procura."
                : "Adicione o primeiro paciente para começar a gerenciar sua clínica."}
            </p>
          </div>
          {hasFilter ? (
            <Button variant="outline" className="rounded-xl mt-2 px-6" onClick={clearAll}>
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
        <div className="border border-border border-t-0 rounded-b-2xl overflow-hidden bg-card shadow-sm ring-1 ring-primary/5">

          {/* Column headers */}
          <div className="hidden sm:grid grid-cols-[1.8fr_1.2fr_130px_120px_56px] border-b border-border bg-primary/[0.03] px-6">
            {(["Paciente", "Contato", "Gênero / Idade", "Cadastrado em", ""] as const).map((col, i) => (
              <div key={i} className={cn(
                "py-3.5 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/70 flex items-center",
                i === 2 || i === 3 ? "justify-center" : ""
              )}>
                {col}
              </div>
            ))}
          </div>

          {/* Rows */}
          {paginated.map((patient, idx) => (
            <div
              key={patient.id}
              onClick={() => navigate(`/admin/pacientes/${patient.id}`)}
              className={cn(
                "group grid grid-cols-[1fr_56px] sm:grid-cols-[1.8fr_1.2fr_130px_120px_56px] items-center px-6 py-4 cursor-pointer hover:bg-muted/30 transition-colors",
                idx < paginated.length - 1 && "border-b border-border/50"
              )}
            >
              {/* Paciente */}
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-black shrink-0 ring-1 ring-primary/10">
                  {patient.name ? initials(patient.name) : "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors leading-tight">
                    {patient.name ?? "—"}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 truncate flex items-center gap-1 mt-0.5">
                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                    {patient.city || "Cidade não informada"}
                  </p>
                </div>
              </div>

              {/* Contato */}
              <div className="hidden sm:flex flex-col justify-center min-w-0 gap-0.5">
                <p className="text-[13px] text-foreground/80 font-medium truncate">{patient.email || "—"}</p>
                <p className="text-[11px] text-muted-foreground/70 truncate">{patient.phone || "—"}</p>
              </div>

              {/* Gênero / Idade */}
              <div className="hidden sm:flex flex-col items-center justify-center gap-1">
                <p className="text-[13px] text-foreground/80 font-medium">
                  {patient.gender ? GENDER_LABEL[patient.gender] : "—"}
                </p>
                {patient.birth_date && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-[11px] font-semibold text-muted-foreground">
                    {calcAge(patient.birth_date)} anos
                  </span>
                )}
              </div>

              {/* Cadastrado */}
              <div className="hidden sm:flex items-center justify-center">
                <p className="text-[12px] text-muted-foreground font-medium tabular-nums">
                  {patient.created_at
                    ? new Date(patient.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
                    : "—"}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-0.5">
                <button
                  onClick={(e) => patient.id !== undefined && handleDelete(e, patient.id)}
                  disabled={deletingId === patient.id}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-40"
                  aria-label="Excluir"
                >
                  {deletingId === patient.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                </button>
                <ChevronRight className="w-4 h-4 text-muted-foreground/25 group-hover:text-primary/60 transition-colors" />
              </div>
            </div>
          ))}

          {/* Footer: count + pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/20 gap-4">
            <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest shrink-0">
              {filtered.length === patients.length
                ? `${patients.length} paciente${patients.length !== 1 ? "s" : ""} no total`
                : `${filtered.length} de ${patients.length} encontrado${filtered.length !== 1 ? "s" : ""}`}
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .reduce<(number | "…")[]>((acc, n, i, arr) => {
                    if (i > 0 && typeof arr[i - 1] === "number" && (n as number) - (arr[i - 1] as number) > 1) acc.push("…");
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((item, i) =>
                    item === "…" ? (
                      <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-muted-foreground">…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setPage(item as number)}
                        className={cn(
                          "w-8 h-8 rounded-lg border text-xs font-semibold transition-colors",
                          page === item
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {item}
                      </button>
                    )
                  )}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  aria-label="Próxima página"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── New Patient Modal ────────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); setForm(emptyForm); } }}
        >
          <div className="bg-card border border-border/80 rounded-2xl w-full max-w-xl shadow-2xl shadow-black/20 overflow-hidden animate-in zoom-in-95 duration-200">

            {/* Accent bar */}
            <div className="h-1 w-full bg-primary" />

            {/* Modal header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-border/60">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-4.5 h-4.5 text-primary" style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold tracking-tight text-foreground">Cadastro de Paciente</h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Prontuário clínico — campos obrigatórios marcados com <span className="text-destructive font-bold">*</span></p>
                </div>
              </div>
              <button
                onClick={() => { setShowModal(false); setForm(emptyForm); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form body */}
            <div className="px-7 py-6 space-y-6">

              {/* Section: Identificação */}
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/50 flex items-center gap-2">
                  <span className="inline-block w-3 h-px bg-muted-foreground/30" />
                  Identificação
                  <span className="flex-1 h-px bg-border/60" />
                </p>

                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-[11px] font-semibold text-muted-foreground">
                    Nome completo <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name" name="name" placeholder="Ex.: Maria Oliveira Santos"
                    value={form.name} onChange={handleFormChange} autoFocus
                    className="h-10 rounded-lg border-border/70 text-sm focus-visible:ring-primary/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-[11px] font-semibold text-muted-foreground">E-mail</Label>
                    <Input
                      id="email" name="email" type="email" placeholder="email@exemplo.com"
                      value={form.email} onChange={handleFormChange}
                      className="h-10 rounded-lg border-border/70 text-sm focus-visible:ring-primary/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-[11px] font-semibold text-muted-foreground">Telefone</Label>
                    <Input
                      id="phone" name="phone" placeholder="(00) 00000-0000"
                      value={form.phone} onChange={handleFormChange}
                      className="h-10 rounded-lg border-border/70 text-sm focus-visible:ring-primary/30"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Dados pessoais */}
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/50 flex items-center gap-2">
                  <span className="inline-block w-3 h-px bg-muted-foreground/30" />
                  Dados pessoais
                  <span className="flex-1 h-px bg-border/60" />
                </p>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="birth_date" className="text-[11px] font-semibold text-muted-foreground">Nascimento</Label>
                    <Input
                      id="birth_date" name="birth_date" type="date"
                      value={form.birth_date} onChange={handleFormChange}
                      className="h-10 rounded-lg border-border/70 text-sm focus-visible:ring-primary/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gender" className="text-[11px] font-semibold text-muted-foreground">Gênero</Label>
                    <select
                      id="gender" name="gender" value={form.gender} onChange={handleFormChange}
                      className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground border-border/70"
                    >
                      <option value="">Selecionar</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-[11px] font-semibold text-muted-foreground">Cidade</Label>
                    <Input
                      id="city" name="city" placeholder="Cidade"
                      value={form.city} onChange={handleFormChange}
                      className="h-10 rounded-lg border-border/70 text-sm focus-visible:ring-primary/30"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="occupation" className="text-[11px] font-semibold text-muted-foreground">Ocupação / Profissão</Label>
                  <Input
                    id="occupation" name="occupation" placeholder="Ex.: Professora, Atleta, Estudante..."
                    value={form.occupation} onChange={handleFormChange}
                    className="h-10 rounded-lg border-border/70 text-sm focus-visible:ring-primary/30"
                  />
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center gap-3 px-7 py-5 border-t border-border/60 bg-muted/20">
              <Button
                variant="ghost"
                className="h-10 px-5 rounded-lg font-semibold text-muted-foreground hover:text-foreground"
                onClick={() => { setShowModal(false); setForm(emptyForm); }}
                disabled={saving}
              >
                Cancelar
              </Button>
              <div className="flex-1" />
              <Button
                className="h-10 px-6 rounded-lg flex items-center gap-2 font-semibold shadow-sm shadow-primary/20"
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
                  : <><Plus className="w-4 h-4" />Cadastrar paciente</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm delete dialog ── */}
      <AlertDialog open={confirmDeleteId !== null} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <AlertDialogTitle className="text-lg">Excluir paciente?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Esta ação é permanente e não pode ser desfeita. Todos os dados do paciente serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="rounded-xl flex-1">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="rounded-xl flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
