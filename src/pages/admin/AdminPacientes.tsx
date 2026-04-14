import { Users, Plus, Search, Trash2, ChevronRight, UserCircle2, Loader2, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { fetchPatients, deletePatient, upsertPatient, type Patient } from "@/lib/supabase";

const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

const age = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });


interface NewPatientForm {
  name: string;
  email: string;
  phone: string;
  city: string;
  birth_date: string;
  gender: string;
  occupation: string;
}

const emptyForm: NewPatientForm = {
  name: "",
  email: "",
  phone: "",
  city: "",
  birth_date: "",
  gender: "",
  occupation: "",
};

export default function AdminPacientes() {
  const navigate = useNavigate();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewPatientForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const data = await fetchPatients();
      setPatients(data);
    } catch (err) {
      toast.error("Erro ao carregar pacientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    );
  });

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita."
    );
    if (!confirmed) return;

    setDeletingId(String(id));
    const ok = await deletePatient(id);
    if (ok) {
      setPatients((prev) => prev.filter((p) => p.id !== id));
      toast.success("Paciente excluído com sucesso.");
    } else {
      toast.error("Erro ao excluir paciente.");
    }
    setDeletingId(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("O nome do paciente é obrigatório.");
      return;
    }

    setSaving(true);
    const result = await upsertPatient({
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      city: form.city.trim() || undefined,
      birth_date: form.birth_date || undefined,
      gender: (form.gender as Patient["gender"]) || undefined,
      occupation: form.occupation.trim() || undefined,
    });
    setSaving(false);
    if (!result) {
      toast.error("Erro ao salvar paciente. Verifique o console e as tabelas do Supabase.");
      return;
    }
    toast.success("Paciente cadastrado com sucesso!");
    setShowModal(false);
    setForm(emptyForm);
    await loadPatients();
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Pacientes
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie os pacientes da clínica
          </p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Paciente
        </Button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-3 bg-card border border-border/50 rounded-2xl px-4 py-3 shadow-sm">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground leading-none">
              {patients.length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              pacientes cadastrados
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Carregando pacientes...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <UserCircle2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">
              {search
                ? "Nenhum paciente encontrado"
                : "Nenhum paciente cadastrado ainda"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {search
                ? "Tente buscar por outro nome ou e-mail."
                : "Adicione seu primeiro paciente para começar."}
            </p>
          </div>
          {!search && (
            <Button
              onClick={() => setShowModal(true)}
              variant="outline"
              className="mt-2 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar primeiro paciente
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((patient) => (
            <div
              key={patient.id}
              onClick={() => navigate(`/admin/pacientes/${patient.id}`)}
              className="bg-card border border-border/50 rounded-2xl p-4 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer flex items-center gap-4 group"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                {patient.name ? initials(patient.name) : "?"}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground text-sm truncate">
                    {patient.name ?? "—"}
                  </p>
                  {patient.birth_date && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {age(patient.birth_date)} anos
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                  {patient.email && (
                    <span className="text-xs text-muted-foreground truncate">
                      {patient.email}
                    </span>
                  )}
                  {patient.phone && (
                    <span className="text-xs text-muted-foreground">
                      {patient.phone}
                    </span>
                  )}
                  {patient.city && (
                    <span className="text-xs text-muted-foreground">
                      {patient.city}
                    </span>
                  )}
                </div>
              </div>

              {/* Date */}
              {patient.created_at && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {formatDate(patient.created_at)}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={(e) => patient.id !== undefined && handleDelete(e, patient.id)}
                  disabled={deletingId === String(patient.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
                  aria-label="Excluir paciente"
                >
                  {deletingId === patient.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Patient Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="bg-card rounded-2xl p-6 max-w-md w-full shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCircle2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Novo Paciente
                </h2>
                <p className="text-xs text-muted-foreground">
                  Preencha os dados do paciente
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Nome */}
              <div className="space-y-1.5">
                <Label htmlFor="name">
                  Nome <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Nome completo"
                  value={form.name}
                  onChange={handleFormChange}
                  autoFocus
                />
              </div>

              {/* Email + Telefone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="exemplo@email.com"
                    value={form.email}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="(00) 00000-0000"
                    value={form.phone}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              {/* Cidade */}
              <div className="space-y-1.5">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  name="city"
                  placeholder="São Paulo"
                  value={form.city}
                  onChange={handleFormChange}
                />
              </div>

              {/* Nascimento + Gênero */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="birth_date">Data de nascimento</Label>
                  <Input
                    id="birth_date"
                    name="birth_date"
                    type="date"
                    value={form.birth_date}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gender">Gênero</Label>
                  <select
                    id="gender"
                    name="gender"
                    value={form.gender}
                    onChange={handleFormChange}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                  >
                    <option value="">Selecionar</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>

              {/* Ocupação */}
              <div className="space-y-1.5">
                <Label htmlFor="occupation">Ocupação</Label>
                <Input
                  id="occupation"
                  name="occupation"
                  placeholder="Ex: Professora, Engenheiro..."
                  value={form.occupation}
                  onChange={handleFormChange}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowModal(false);
                  setForm(emptyForm);
                }}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 flex items-center justify-center gap-2"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar paciente"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
