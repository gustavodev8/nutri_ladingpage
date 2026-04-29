import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  User,
  ClipboardList,
  Activity,
  BookOpen,
  Save,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  ChevronRight,
  Scale,
  Ruler,
  Camera,
  X,
  ImageIcon,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  fetchPatient,
  upsertPatient,
  fetchAnamnesis,
  upsertAnamnesis,
  fetchMeasurements,
  insertMeasurement,
  deleteMeasurement,
  fetchMealPlans,
  upsertMealPlan,
  deleteMealPlan,
  fetchPatientPhotos,
  insertPatientPhoto,
  deletePatientPhoto,
  uploadPatientPhoto,
  type Patient,
  type Anamnesis,
  type Measurement,
  type MealPlan,
  type PatientPhoto,
} from "@/lib/supabase";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

const calcBMI = (weight?: number, height?: number): string | null => {
  if (!weight || !height) return null;
  return (weight / Math.pow(height / 100, 2)).toFixed(1);
};

const bmiClass = (bmi: number) => {
  if (bmi < 18.5)
    return { label: "Abaixo do peso", cls: "bg-blue-100 text-blue-700" };
  if (bmi < 25)
    return { label: "Normal", cls: "bg-green-100 text-green-700" };
  if (bmi < 30)
    return { label: "Sobrepeso", cls: "bg-yellow-100 text-yellow-700" };
  return { label: "Obesidade", cls: "bg-red-100 text-red-700" };
};

const calcAge = (birthDate: string): number => {
  const today = new Date();
  const birth = new Date(birthDate + "T12:00:00");
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const formatDate = (dateStr: string) =>
  new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const todayISO = () => new Date().toISOString().split("T")[0];

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabKey = "perfil" | "anamnese" | "antropometria" | "planos";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "perfil", label: "Perfil", icon: <User size={16} /> },
  { key: "anamnese", label: "Anamnese", icon: <ClipboardList size={16} /> },
  {
    key: "antropometria",
    label: "Antropometria",
    icon: <Activity size={16} />,
  },
  { key: "planos", label: "Planos Alimentares", icon: <BookOpen size={16} /> },
];

// ─── Shared Textarea ─────────────────────────────────────────────────────────

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
}
const Textarea = ({ minRows = 3, className = "", ...props }: TextareaProps) => (
  <textarea
    className={`w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] ${className}`}
    rows={minRows}
    {...props}
  />
);

// ─── BMI Badge ────────────────────────────────────────────────────────────────

const BMIBadge = ({ bmi }: { bmi: string }) => {
  const num = parseFloat(bmi);
  const { label, cls } = bmiClass(num);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPaciente() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabKey) || "perfil";

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<Patient | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchPatient(id)
      .then((p) => setPatient(p))
      .catch(() => toast.error("Erro ao carregar paciente"))
      .finally(() => setLoading(false));
  }, [id]);

  const setTab = (tab: TabKey) => {
    setSearchParams({ tab });
  };

  const isComplete =
    patient &&
    !!patient.name &&
    !!patient.email &&
    !!patient.phone &&
    !!patient.city;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Paciente não encontrado.</p>
        <Link to="/admin/pacientes">
          <Button variant="outline">
            <ArrowLeft size={16} className="mr-2" />
            Voltar
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pt-4 pb-8 space-y-5">
      {/* ── Header bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link
          to="/admin/pacientes"
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft size={20} />
        </Link>

        {/* Avatar */}
        <div className="flex-shrink-0 w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-primary/10 text-primary font-bold text-base sm:text-lg flex items-center justify-center select-none">
          {patient.name ? initials(patient.name) : <User size={20} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-bold truncate">
              {patient.name || "Sem nome"}
            </h1>
            {isComplete ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                Perfil completo
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                Dados incompletos
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {patient.email && <span>{patient.email}</span>}
            {patient.phone && <span>{patient.phone}</span>}
            {patient.city && <span>{patient.city}</span>}
            {patient.birth_date && (
              <span>
                {calcAge(patient.birth_date)} anos
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab navigation ────────────────────────────────────────────────── */}
      <div className="border-b border-border">
        <nav className="flex gap-0 -mb-px overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Tab content ───────────────────────────────────────────────────── */}
      {activeTab === "perfil" && (
        <PerfilTab patient={patient} onSaved={setPatient} />
      )}
      {activeTab === "anamnese" && (
        <AnamneseTab patientId={id!} />
      )}
      {activeTab === "antropometria" && (
        <AntropometriaTab patientId={id!} />
      )}
      {activeTab === "planos" && (
        <PlanosTab patientId={id!} patientRouteId={id!} navigate={navigate} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1: Perfil
// ─────────────────────────────────────────────────────────────────────────────

function PerfilTab({
  patient,
  onSaved,
}: {
  patient: Patient;
  onSaved: (p: Patient) => void;
}) {
  const [form, setForm] = useState<Patient>({ ...patient });
  const [saving, setSaving] = useState(false);

  // Photos
  const [photos, setPhotos] = useState<PatientPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!patient.id) return;
    fetchPatientPhotos(patient.id)
      .then(setPhotos)
      .finally(() => setLoadingPhotos(false));
  }, [patient.id]);

  const set = (field: keyof Patient, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await upsertPatient(form);
      if (updated) {
        onSaved(updated);
        toast.success("Perfil salvo com sucesso!");
      } else {
        toast.error("Erro ao salvar perfil.");
      }
    } catch {
      toast.error("Erro inesperado ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !patient.id) return;
    e.target.value = "";
    setUploading(true);
    let added = 0;
    for (const file of files) {
      const url = await uploadPatientPhoto(file);
      if (!url) { toast.error(`Falha ao enviar ${file.name}`); continue; }
      const saved = await insertPatientPhoto({ patient_id: patient.id, url });
      if (saved) { setPhotos(prev => [saved, ...prev]); added++; }
    }
    setUploading(false);
    if (added > 0) toast.success(added === 1 ? "Foto adicionada!" : `${added} fotos adicionadas!`);
  };

  const handleDeletePhoto = async (photo: PatientPhoto) => {
    if (!photo.id) return;
    const ok = await deletePatientPhoto(photo.id);
    if (ok) setPhotos(prev => prev.filter(p => p.id !== photo.id));
    else toast.error("Erro ao remover foto.");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            value={form.name || ""}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Nome completo"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email || ""}
            onChange={(e) => set("email", e.target.value)}
            placeholder="email@exemplo.com"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            value={form.phone || ""}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="(11) 99999-9999"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="city">Cidade</Label>
          <Input
            id="city"
            value={form.city || ""}
            onChange={(e) => set("city", e.target.value)}
            placeholder="São Paulo"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="birth_date">Data de nascimento</Label>
          <Input
            id="birth_date"
            type="date"
            value={form.birth_date || ""}
            onChange={(e) => set("birth_date", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="gender">Gênero</Label>
          <select
            id="gender"
            value={form.gender || ""}
            onChange={(e) => set("gender", e.target.value)}
            className="w-full h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Selecionar…</option>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
            <option value="outro">Outro</option>
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="occupation">Ocupação</Label>
          <Input
            id="occupation"
            value={form.occupation || ""}
            onChange={(e) => set("occupation", e.target.value)}
            placeholder="Ex: Professora"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            minRows={4}
            value={form.notes || ""}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Observações gerais sobre o paciente…"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 size={16} className="mr-2 animate-spin" />
          ) : (
            <Save size={16} className="mr-2" />
          )}
          Salvar perfil
        </Button>
      </div>

      {/* ── Fotos do paciente ───────────────────────────────────────── */}
      <div className="space-y-3 pt-4 border-t border-border/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera size={16} className="text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Fotos</span>
            {photos.length > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{photos.length}</span>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-lg gap-1.5 text-xs h-8"
            disabled={uploading}
            onClick={() => photoInputRef.current?.click()}
          >
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            {uploading ? "Enviando..." : "Adicionar foto"}
          </Button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotoUpload}
          />
        </div>

        {loadingPhotos ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 size={20} className="animate-spin text-muted-foreground/40" />
          </div>
        ) : photos.length === 0 ? (
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all py-8 text-muted-foreground hover:text-primary"
          >
            <ImageIcon size={28} className="opacity-40" />
            <span className="text-sm">Clique para adicionar fotos do paciente</span>
          </button>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {photos.map((photo) => (
              <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden bg-muted border border-border">
                <img
                  src={photo.url}
                  alt="Foto do paciente"
                  className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                  onClick={() => setLightbox(photo.url)}
                />
                <button
                  type="button"
                  onClick={() => handleDeletePhoto(photo)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {/* Add more button */}
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploading}
              className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary"
            >
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              <span className="text-[10px]">Mais</span>
            </button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X size={18} />
          </button>
          <img
            src={lightbox}
            alt="Visualizar foto"
            className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2: Anamnese
// ─────────────────────────────────────────────────────────────────────────────

type AnamnesisForm = Omit<Anamnesis, "id" | "created_at" | "updated_at">;

function AnamneseTab({ patientId }: { patientId: string }) {
  const pid = Number(patientId);
  const [form, setForm] = useState<AnamnesisForm>({ patient_id: pid });
  const [anamnesisId, setAnamnesisId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAnamnesis(pid)
      .then((data) => {
        if (data) {
          setAnamnesisId(data.id ?? null);
          const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = data as Anamnesis & { id?: string; created_at?: string; updated_at?: string };
          setForm({ ...rest, patient_id: pid });
        }
      })
      .catch(() => toast.error("Erro ao carregar anamnese."))
      .finally(() => setLoading(false));
  }, [patientId]);

  const set = (field: keyof AnamnesisForm, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = anamnesisId
        ? { ...form, id: anamnesisId }
        : { ...form };
      const result = await upsertAnamnesis(payload);
      if (result === true) {
        toast.success("Anamnese salva com sucesso!");
      } else {
        toast.error(`Erro: ${result || "falha desconhecida"}`);
      }
    } catch {
      toast.error("Erro inesperado ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1.5">
          <Label>Queixa principal</Label>
          <Textarea
            minRows={3}
            value={(form as Record<string, unknown>).main_complaint as string || ""}
            onChange={(e) => set("main_complaint" as keyof AnamnesisForm, e.target.value)}
            placeholder="Descreva a queixa principal do paciente…"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Histórico médico / doenças anteriores</Label>
          <Textarea
            minRows={3}
            value={(form as Record<string, unknown>).medical_history as string || ""}
            onChange={(e) => set("medical_history" as keyof AnamnesisForm, e.target.value)}
            placeholder="Doenças, cirurgias, internações anteriores…"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Medicamentos em uso</Label>
          <Textarea
            minRows={3}
            value={(form as Record<string, unknown>).medications as string || ""}
            onChange={(e) => set("medications" as keyof AnamnesisForm, e.target.value)}
            placeholder="Liste os medicamentos em uso…"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Alergias e intolerâncias</Label>
          <Textarea
            minRows={3}
            value={(form as Record<string, unknown>).allergies as string || ""}
            onChange={(e) => set("allergies" as keyof AnamnesisForm, e.target.value)}
            placeholder="Alergias alimentares, intolerâncias, etc."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Aversões alimentares</Label>
            <Input
              value={(form as Record<string, unknown>).food_aversions as string || ""}
              onChange={(e) => set("food_aversions" as keyof AnamnesisForm, e.target.value)}
              placeholder="Ex: brócolis, fígado…"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Preferências alimentares</Label>
            <Input
              value={(form as Record<string, unknown>).food_preferences as string || ""}
              onChange={(e) => set("food_preferences" as keyof AnamnesisForm, e.target.value)}
              placeholder="Ex: frango, arroz integral…"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Número de refeições por dia</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={(form as Record<string, unknown>).meals_per_day as string || ""}
              onChange={(e) => set("meals_per_day" as keyof AnamnesisForm, e.target.value)}
              placeholder="Ex: 5"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Ingestão de água</Label>
            <Input
              value={(form as Record<string, unknown>).water_intake as string || ""}
              onChange={(e) => set("water_intake" as keyof AnamnesisForm, e.target.value)}
              placeholder="Ex: 2L/dia"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Horas de sono</Label>
            <Input
              type="number"
              step={0.5}
              min={0}
              max={24}
              value={(form as Record<string, unknown>).sleep_hours as string || ""}
              onChange={(e) => set("sleep_hours" as keyof AnamnesisForm, e.target.value)}
              placeholder="Ex: 7.5"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Funcionamento intestinal</Label>
            <Input
              value={(form as Record<string, unknown>).bowel_function as string || ""}
              onChange={(e) => set("bowel_function" as keyof AnamnesisForm, e.target.value)}
              placeholder="Ex: regular, 1x/dia"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Atividade física</Label>
          <Textarea
            minRows={3}
            value={(form as Record<string, unknown>).physical_activity as string || ""}
            onChange={(e) => set("physical_activity" as keyof AnamnesisForm, e.target.value)}
            placeholder="Ex: Musculação 3x/semana, caminhada 30min/dia…"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Objetivos</Label>
          <Textarea
            minRows={4}
            value={(form as Record<string, unknown>).goals as string || ""}
            onChange={(e) => set("goals" as keyof AnamnesisForm, e.target.value)}
            placeholder="Descreva os objetivos do paciente…"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 size={16} className="mr-2 animate-spin" />
          ) : (
            <Save size={16} className="mr-2" />
          )}
          Salvar anamnese
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 3: Antropometria
// ─────────────────────────────────────────────────────────────────────────────

type MeasurementForm = {
  assessment_date: string;
  weight?: string;
  height?: string;
  waist?: string;
  hip?: string;
  arm?: string;
  neck?: string;
  body_fat?: string;
  lean_mass?: string;
  visceral_fat?: string;
  notes?: string;
};

function AntropometriaTab({ patientId }: { patientId: string }) {
  const pid = Number(patientId);
  const emptyForm = (): MeasurementForm => ({
    assessment_date: todayISO(),
  });

  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [form, setForm] = useState<MeasurementForm>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detailMeasurement, setDetailMeasurement] = useState<Measurement | null>(null);

  useEffect(() => {
    fetchMeasurements(pid)
      .then(setMeasurements)
      .catch(() => toast.error("Erro ao carregar avaliações."))
      .finally(() => setLoading(false));
  }, [patientId]);

  const setField = (field: keyof MeasurementForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleInsert = async () => {
    setSaving(true);
    try {
      const payload: Partial<Measurement> = {
        patient_id: pid,
        assessment_date: form.assessment_date,
        weight: form.weight ? parseFloat(form.weight) : undefined,
        height: form.height ? parseFloat(form.height) : undefined,
        waist: form.waist ? parseFloat(form.waist) : undefined,
        hip: form.hip ? parseFloat(form.hip) : undefined,
        arm: form.arm ? parseFloat(form.arm) : undefined,
        neck: form.neck ? parseFloat(form.neck) : undefined,
        body_fat: form.body_fat ? parseFloat(form.body_fat) : undefined,
        lean_mass: form.lean_mass ? parseFloat(form.lean_mass) : undefined,
        visceral_fat: form.visceral_fat
          ? parseFloat(form.visceral_fat)
          : undefined,
        notes: form.notes || undefined,
      };

      const result = await insertMeasurement(payload as Measurement);
      if (result) {
        setMeasurements((prev) => [result, ...prev]);
        setForm(emptyForm());
        toast.success("Avaliação registrada!");
      } else {
        toast.error("Erro ao registrar avaliação.");
      }
    } catch {
      toast.error("Erro inesperado.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (measurementId: string) => {
    if (!window.confirm("Remover esta avaliação?")) return;
    const ok = await deleteMeasurement(measurementId);
    if (ok) {
      setMeasurements((prev) => prev.filter((m) => m.id !== measurementId));
      toast.success("Avaliação removida.");
    } else {
      toast.error("Erro ao remover avaliação.");
    }
  };

  return (
    <div className="space-y-6">
      {/* New measurement form */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <Scale size={16} className="text-primary" />
            Nova avaliação
          </h2>
          {measurements.length > 0 && (
            <Link to={`/admin/pacientes/${patientId}/relatorio-antropometrico`}>
              <Button variant="outline" size="sm" className="rounded-md gap-1.5 text-xs h-8 shrink-0">
                <Eye size={13} />
                Ver Relatório
              </Button>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="col-span-2 sm:col-span-1 space-y-1.5">
            <Label>Data da avaliação</Label>
            <Input
              type="date"
              value={form.assessment_date}
              onChange={(e) => setField("assessment_date", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Peso (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={form.weight || ""}
              onChange={(e) => setField("weight", e.target.value)}
              placeholder="70.5"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Altura (cm)</Label>
            <Input
              type="number"
              step="0.1"
              value={form.height || ""}
              onChange={(e) => setField("height", e.target.value)}
              placeholder="170"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Cintura (cm)</Label>
            <Input
              type="number"
              step="0.1"
              value={form.waist || ""}
              onChange={(e) => setField("waist", e.target.value)}
              placeholder="80"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Quadril (cm)</Label>
            <Input
              type="number"
              step="0.1"
              value={form.hip || ""}
              onChange={(e) => setField("hip", e.target.value)}
              placeholder="95"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Braço (cm)</Label>
            <Input
              type="number"
              step="0.1"
              value={form.arm || ""}
              onChange={(e) => setField("arm", e.target.value)}
              placeholder="32"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Pescoço (cm)</Label>
            <Input
              type="number"
              step="0.1"
              value={form.neck || ""}
              onChange={(e) => setField("neck", e.target.value)}
              placeholder="35"
            />
          </div>

          <div className="space-y-1.5">
            <Label>% Gordura corporal</Label>
            <Input
              type="number"
              step="0.1"
              value={form.body_fat || ""}
              onChange={(e) => setField("body_fat", e.target.value)}
              placeholder="22.5"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Massa magra (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={form.lean_mass || ""}
              onChange={(e) => setField("lean_mass", e.target.value)}
              placeholder="54.7"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Gordura visceral</Label>
            <Input
              type="number"
              step="0.1"
              value={form.visceral_fat || ""}
              onChange={(e) => setField("visceral_fat", e.target.value)}
              placeholder="8"
            />
          </div>

          <div className="col-span-2 sm:col-span-3 space-y-1.5">
            <Label>Observações</Label>
            <Input
              value={form.notes || ""}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Notas sobre esta avaliação…"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleInsert} disabled={saving}>
            {saving ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <Plus size={16} className="mr-2" />
            )}
            Registrar avaliação
          </Button>
        </div>
      </div>

      {/* History */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="animate-spin text-primary" size={24} />
        </div>
      ) : measurements.length === 0 ? (
        <p className="text-center text-muted-foreground py-10 text-sm">
          Nenhuma avaliação registrada.
        </p>
      ) : (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Histórico de avaliações
          </h3>
          <div className="rounded-xl border border-border overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Data
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    Peso
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    Altura
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                    IMC
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                    % Gordura
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                    Cintura
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {measurements.map((m, idx) => {
                  const bmi = calcBMI(m.weight, m.height);
                  return (
                    <tr
                      key={m.id ?? idx}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">
                        {m.assessment_date
                          ? formatDate(m.assessment_date)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {m.weight ? `${m.weight} kg` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {m.height ? `${m.height} cm` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        {bmi ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-medium">{bmi}</span>
                            <BMIBadge bmi={bmi} />
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        {m.body_fat != null ? `${m.body_fat}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        {m.waist ? `${m.waist} cm` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setDetailMeasurement(m)}
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(m.id!)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            title="Remover avaliação"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {detailMeasurement && (() => {
        const m = detailMeasurement;
        const bmi = calcBMI(m.weight, m.height);
        const bmiInfo = bmi ? bmiClass(parseFloat(bmi)) : null;

        const rows: { label: string; value: string | null; unit?: string }[] = [
          { label: "Peso",              value: m.weight     != null ? String(m.weight)     : null, unit: "kg"  },
          { label: "Altura",            value: m.height     != null ? String(m.height)     : null, unit: "cm"  },
          { label: "Cintura",           value: m.waist      != null ? String(m.waist)      : null, unit: "cm"  },
          { label: "Quadril",           value: m.hip        != null ? String(m.hip)        : null, unit: "cm"  },
          { label: "Braço",             value: m.arm        != null ? String(m.arm)        : null, unit: "cm"  },
          { label: "Pescoço",           value: m.neck       != null ? String(m.neck)       : null, unit: "cm"  },
          { label: "% Gordura corporal",value: m.body_fat   != null ? String(m.body_fat)   : null, unit: "%"   },
          { label: "Massa magra",       value: m.lean_mass  != null ? String(m.lean_mass)  : null, unit: "kg"  },
          { label: "Gordura visceral",  value: m.visceral_fat != null ? String(m.visceral_fat) : null },
        ];

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4"
            onClick={() => setDetailMeasurement(null)}
          >
            <div
              className="bg-background rounded-2xl shadow-2xl w-full max-w-sm border border-border flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                <div>
                  <p className="text-sm font-bold text-foreground">Avaliação detalhada</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {m.assessment_date ? formatDate(m.assessment_date) : "—"}
                  </p>
                </div>
                <button
                  onClick={() => setDetailMeasurement(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* IMC highlight */}
              {bmi && bmiInfo && (
                <div className="mx-5 mt-4 flex items-center justify-between px-4 py-3 rounded-xl bg-muted/50 border border-border">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">IMC</p>
                    <p className="text-2xl font-bold text-foreground tabular-nums">{bmi}</p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${bmiInfo.cls}`}>
                    {bmiInfo.label}
                  </span>
                </div>
              )}

              {/* Grid of metrics */}
              <div className="px-5 py-4 grid grid-cols-2 gap-3">
                {rows.filter(r => r.value !== null).map(r => (
                  <div key={r.label} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">{r.label}</p>
                    <p className="text-sm font-bold text-foreground tabular-nums">
                      {r.value}{r.unit ? <span className="text-xs font-normal text-muted-foreground ml-0.5">{r.unit}</span> : null}
                    </p>
                  </div>
                ))}
              </div>

              {/* Notes */}
              {m.notes && (
                <div className="px-5 pb-4 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Observações</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">{m.notes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="px-5 py-4 border-t border-border">
                <button
                  onClick={() => setDetailMeasurement(null)}
                  className="w-full h-9 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 4: Planos Alimentares
// ─────────────────────────────────────────────────────────────────────────────

function PlanosTab({
  patientId,
  patientRouteId,
  navigate,
}: {
  patientId: string;
  patientRouteId: string;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const pid = Number(patientId);
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchMealPlans(pid)
      .then(setPlans)
      .catch(() => toast.error("Erro ao carregar planos."))
      .finally(() => setLoading(false));
  }, [pid]);

  const handleNew = async () => {
    setCreating(true);
    try {
      const newPlan = await upsertMealPlan({
        patient_id: pid,
        title: "Plano Alimentar",
      } as MealPlan);

      if (newPlan && (newPlan as MealPlan & { id?: string }).id) {
        navigate(
          `/admin/pacientes/${patientRouteId}/plano/${(newPlan as MealPlan & { id?: string }).id}`
        );
      } else {
        toast.error("Erro ao criar plano alimentar.");
      }
    } catch {
      toast.error("Erro inesperado ao criar plano.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (planId: string) => {
    if (!window.confirm("Excluir este plano alimentar? Esta ação não pode ser desfeita."))
      return;
    const ok = await deleteMealPlan(planId);
    if (ok) {
      setPlans((prev) => prev.filter((p) => (p as MealPlan & { id?: string }).id !== planId));
      toast.success("Plano excluído.");
    } else {
      toast.error("Erro ao excluir plano.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Planos alimentares</h2>
        <Button onClick={handleNew} disabled={creating} size="sm" className="shrink-0">
          {creating ? (
            <Loader2 size={15} className="mr-1.5 animate-spin" />
          ) : (
            <Plus size={15} className="mr-1.5" />
          )}
          <span className="hidden sm:inline">Novo plano alimentar</span>
          <span className="sm:hidden">Novo plano</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="animate-spin text-primary" size={24} />
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <BookOpen size={36} className="text-muted-foreground/50" />
          <p className="text-muted-foreground text-sm">
            Nenhum plano alimentar ainda.
          </p>
          <Button variant="outline" onClick={handleNew} disabled={creating}>
            <Plus size={16} className="mr-2" />
            Criar primeiro plano
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => {
            const p = plan as MealPlan & {
              id?: string;
              title?: string;
              start_date?: string;
              end_date?: string;
              daily_calories?: number;
              created_at?: string;
            };

            return (
              <div
                key={p.id}
                className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4"
              >
                {/* Icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <BookOpen size={18} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {p.title || "Plano Alimentar"}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                    {p.daily_calories && (
                      <span>{p.daily_calories} kcal/dia</span>
                    )}
                    {p.start_date && p.end_date && (
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {formatDate(p.start_date)} – {formatDate(p.end_date)}
                      </span>
                    )}
                    {p.created_at && (
                      <span>
                        Criado em{" "}
                        {new Date(p.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate(
                        `/admin/pacientes/${patientRouteId}/plano/${p.id}`
                      )
                    }
                  >
                    Editar
                    <ChevronRight size={14} className="ml-1" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(p.id!)}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
