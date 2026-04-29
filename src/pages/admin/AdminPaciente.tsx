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
  Camera,
  X,
  ImageIcon,
  Eye,
  MapPin,
  MessageSquareQuote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

// ─── Page Component ────────────────────────────────────────────────────────────

export default function AdminPaciente() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabKey) || "perfil";

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<Patient | null>(null);
  
  // ─── FULL PAGE DETAIL VIEW STATE ───
  const [selectedMeasurement, setSelectedMeasurement] = useState<Measurement | null>(null);

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

  // ─── RENDER: FULL PAGE REPORT VIEW ─────────────────────────────────────────
  if (selectedMeasurement) {
    const m = selectedMeasurement;
    const bmi = calcBMI(m.weight, m.height);
    const bmiInfo = bmi ? bmiClass(parseFloat(bmi)) : null;

    const SummaryCard = ({ label, value, unit, icon: Icon, colorClass = "text-primary" }: any) => (
      <div className="bg-card border border-border/60 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className={cn("w-10 h-10 rounded-xl bg-muted flex items-center justify-center", colorClass)}>
            <Icon size={20} />
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">{label}</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-foreground tabular-nums">{value ?? "—"}</span>
          {value && unit && <span className="text-sm font-bold text-muted-foreground">{unit}</span>}
        </div>
      </div>
    );

    const ComparisonRow = ({ label, right, left }: any) => (
      <div className="grid grid-cols-7 gap-2 py-3 border-b border-border/40 items-center last:border-0">
        <div className="col-span-3 text-right">
          <span className="text-sm font-bold text-foreground tabular-nums">{right ?? "—"}</span>
          <span className="text-[10px] ml-1 text-muted-foreground font-medium">cm</span>
        </div>
        <div className="col-span-1 text-center">
          <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-tighter">{label}</span>
        </div>
        <div className="col-span-3 text-left">
          <span className="text-sm font-bold text-foreground tabular-nums">{left ?? "—"}</span>
          <span className="text-[10px] ml-1 text-muted-foreground font-medium">cm</span>
        </div>
      </div>
    );

    const MeasureRow = ({ label, value, unit = "cm" }: { label: string, value?: number, unit?: string }) => (
      <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-bold text-foreground tabular-nums">{value ?? "—"}</span>
          {value && <span className="text-[10px] font-medium text-muted-foreground/60">{unit}</span>}
        </div>
      </div>
    );

    return (
      <div className="min-h-screen bg-background animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        {/* Sticky Report Header */}
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/60 px-8 py-4 flex items-center justify-between mb-8 shadow-sm">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => setSelectedMeasurement(null)}
              className="h-11 px-4 rounded-2xl hover:bg-muted font-bold flex gap-2 transition-all"
            >
              <ArrowLeft size={18} />
              Voltar ao Prontuário
            </Button>
            <div className="h-6 w-px bg-border/60 mx-2" />
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                Relatório Antropométrico
                <span className="text-primary opacity-30">/</span>
                <span className="text-muted-foreground font-medium">{formatDate(m.assessment_date)}</span>
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-2xl h-11 font-bold gap-2" onClick={() => window.print()}>
              <Plus size={18} />
              Exportar PDF
            </Button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-8 space-y-8">
          {/* Header Dashboard: IMC & Key Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-4 bg-primary rounded-[40px] p-8 text-primary-foreground shadow-2xl shadow-primary/20 flex flex-col justify-between overflow-hidden relative group">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />
              <div className="relative z-10">
                <p className="text-[11px] font-black uppercase tracking-[0.25em] opacity-70 mb-1">Status Metabólico</p>
                <h3 className="text-6xl font-black tracking-tighter tabular-nums mb-4">{bmi ?? "—"}</h3>
                {bmiInfo && (
                  <div className="inline-flex items-center px-4 py-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/10 text-xs font-black uppercase tracking-widest">
                    {bmiInfo.label}
                  </div>
                )}
              </div>
              <div className="relative z-10 pt-10">
                <p className="text-sm opacity-80 font-medium max-w-[200px]">Índice de massa corporal calculado com base no peso e altura atuais.</p>
              </div>
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <SummaryCard label="Massa Corporal" value={m.weight} unit="kg" icon={Scale} colorClass="text-blue-500" />
              <SummaryCard label="Gordura Corporal" value={m.body_fat} unit="%" icon={Activity} colorClass="text-rose-500" />
              <SummaryCard label="Massa Magra" value={m.lean_mass} unit="kg" icon={User} colorClass="text-emerald-500" />
            </div>
          </div>

          {/* Detailed Measures Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Trunk Info */}
            <div className="space-y-8">
              <div className="bg-card border border-border/60 rounded-[32px] p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-5 bg-primary rounded-full" />
                  <h4 className="text-sm font-black uppercase tracking-[0.15em] text-foreground/80">Tronco & Tronco</h4>
                </div>
                <div className="space-y-1">
                  <MeasureRow label="Pescoço" value={m.neck} />
                  <MeasureRow label="Ombro" value={m.shoulder} />
                  <MeasureRow label="Peitoral" value={m.chest} />
                  <MeasureRow label="Cintura" value={m.waist} />
                  <MeasureRow label="Abdômen" value={m.abdomen} />
                  <MeasureRow label="Quadril" value={m.hip} />
                  <div className="pt-4 mt-4 border-t border-border/40">
                    <MeasureRow label="Gordura Visceral" value={m.visceral_fat} unit="" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bilateral Comparison Table */}
            <div className="lg:col-span-2 bg-card border border-border/60 rounded-[32px] p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8 border-b border-border/40 pb-6">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-5 bg-amber-500 rounded-full" />
                  <h4 className="text-sm font-black uppercase tracking-[0.15em] text-foreground/80">Simetria Corporal</h4>
                </div>
                <div className="flex items-center gap-10 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /> Direito</span>
                  <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500" /> Esquerdo</span>
                </div>
              </div>

              <div className="space-y-2">
                <ComparisonRow label="Braço Relax." right={m.arm_relax_r} left={m.arm_relax_l} />
                <ComparisonRow label="Braço Contr." right={m.arm_contract_r} left={m.arm_contract_l} />
                <ComparisonRow label="Antebraço" right={m.forearm_r} left={m.forearm_l} />
                <ComparisonRow label="Punho" right={m.wrist_r} left={m.wrist_l} />
                <div className="h-4" />
                <ComparisonRow label="Coxa Prox." right={m.thigh_prox_r} left={m.thigh_prox_l} />
                <ComparisonRow label="Coxa Med." right={m.thigh_r} left={m.thigh_l} />
                <ComparisonRow label="Panturrilha" right={m.calf_r} left={m.calf_l} />
              </div>

              <div className="mt-10 flex items-center justify-center gap-2 py-4 px-6 bg-muted/30 rounded-2xl border border-dashed border-border/60">
                <Scale size={16} className="text-muted-foreground/40" />
                <p className="text-[11px] font-bold text-muted-foreground/60 italic uppercase tracking-tighter text-center">
                  Diferenças entre os lados podem indicar desequilíbrios musculares ou dominância motora.
                </p>
              </div>
            </div>
          </div>

          {/* Technical Opinion / Notes */}
          {m.notes && (
            <div className="bg-muted/20 border border-border/60 rounded-[32px] p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] transition-opacity group-hover:opacity-[0.07]">
                <ClipboardList size={120} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4 text-primary">
                  <MessageSquareQuote size={20} />
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em]">Parecer Técnico Nutricional</h4>
                </div>
                <p className="text-lg text-foreground/80 leading-relaxed font-medium italic">
                  "{m.notes}"
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── RENDER: MAIN PROFILE VIEW (WITH TABS) ─────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Breadcrumbs & Navigation */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <Link to="/admin/pacientes" className="hover:text-primary transition-colors">Pacientes</Link>
          <ChevronRight size={12} className="opacity-50" />
          <span className="text-foreground/70">Prontuário</span>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 text-primary font-bold text-lg sm:text-xl flex items-center justify-center shadow-sm border border-primary/10 shrink-0">
              {patient.name ? initials(patient.name) : <User size={24} />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
                  {patient.name || "Sem nome"}
                </h1>
                <div className="hidden sm:block">
                  {isComplete ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                      Completo
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100">
                      Incompleto
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground font-medium">
                {patient.city && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} className="opacity-60" />
                    {patient.city}
                  </span>
                )}
                {patient.birth_date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} className="opacity-60" />
                    {calcAge(patient.birth_date)} anos
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/admin/pacientes">
              <Button variant="outline" size="sm" className="rounded-xl h-9">
                <ArrowLeft size={16} className="mr-2" />
                Sair
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Modern Tab Bar */}
      <div className="bg-card/50 p-1 rounded-2xl border border-border/60 flex flex-wrap gap-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setTab(tab.key)}
              className={cn(
                "flex-1 min-w-[120px] flex items-center justify-center gap-2.5 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200",
                isActive
                  ? "bg-background text-primary shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              <span className={cn(isActive ? "text-primary" : "text-muted-foreground/60")}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Tab Content Card */}
      <div className="bg-card border border-border shadow-sm rounded-[24px] overflow-hidden">
        <div className="p-6 sm:p-8">
          {activeTab === "perfil" && (
            <PerfilTab patient={patient} onSaved={setPatient} />
          )}
          {activeTab === "anamnese" && (
            <AnamneseTab patientId={id!} />
          )}
          {activeTab === "antropometria" && (
            <AntropometriaTab 
              patientId={id!} 
              onViewDetail={setSelectedMeasurement} 
            />
          )}
          {activeTab === "planos" && (
            <PlanosTab patientId={id!} patientRouteId={id!} navigate={navigate} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1: Perfil (Cadastro Básico)
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

  // Photos Evolution
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
          <Label htmlFor="name">Nome Completo</Label>
          <Input
            id="name"
            value={form.name || ""}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email || ""}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            value={form.phone || ""}
            onChange={(e) => set("phone", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">Cidade</Label>
          <Input
            id="city"
            value={form.city || ""}
            onChange={(e) => set("city", e.target.value)}
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
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="notes">Observações Gerais</Label>
          <Textarea
            id="notes"
            minRows={4}
            value={form.notes || ""}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={saving} className="h-11 px-8 rounded-xl font-bold">
          {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
          Atualizar Cadastro
        </Button>
      </div>

      {/* Photo Management Section */}
      <div className="space-y-4 pt-8 border-t border-border/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground font-bold">
            <Camera size={20} className="text-primary" />
            Galeria de Evolução
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl h-10 gap-2 font-bold"
            disabled={uploading}
            onClick={() => photoInputRef.current?.click()}
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Upload de Fotos
          </Button>
          <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
        </div>

        {loadingPhotos ? (
          <div className="flex items-center justify-center h-24 text-muted-foreground"><Loader2 className="animate-spin mr-2" /> Carregando galeria...</div>
        ) : photos.length === 0 ? (
          <div className="h-40 border-2 border-dashed border-border rounded-[24px] flex flex-col items-center justify-center text-muted-foreground/60 gap-3">
            <ImageIcon size={40} className="opacity-20" />
            <p className="text-sm font-medium">Nenhuma foto de evolução anexada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="group relative aspect-square rounded-2xl overflow-hidden bg-muted border border-border/60 shadow-sm">
                <img src={photo.url} className="w-full h-full object-cover cursor-pointer" onClick={() => setLightbox(photo.url)} />
                <button onClick={() => handleDeletePhoto(photo)} className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Overlay */}
      {lightbox && (
        <div className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setLightbox(null)}>
          <button className="absolute top-6 right-6 w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center hover:bg-white/20 transition-colors"><X size={24} /></button>
          <img src={lightbox} className="max-w-full max-h-[90vh] rounded-3xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2: Anamnese (Histórico Clínico)
// ─────────────────────────────────────────────────────────────────────────────

function AnamneseTab({ patientId }: { patientId: string }) {
  const pid = Number(patientId);
  const [form, setForm] = useState<AnamnesisForm>({ patient_id: pid });
  const [anamnesisId, setAnamnesisId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAnamnesis(pid).then((data) => {
      if (data) {
        setAnamnesisId(data.id ?? null);
        const { id: _i, created_at: _c, updated_at: _u, ...rest } = data as any;
        setForm({ ...rest, patient_id: pid });
      }
      setLoading(false);
    });
  }, [pid]);

  const set = (field: string, value: any) => setForm(p => ({ ...p, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    const ok = await upsertAnamnesis(anamnesisId ? { ...form, id: anamnesisId } : form);
    if (ok === true) toast.success("Anamnese salva!"); else toast.error("Falha ao salvar.");
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

  const Field = ({ label, field, type = "textarea", placeholder }: any) => (
    <div className="space-y-1.5">
      <Label className="font-bold text-foreground/80">{label}</Label>
      {type === "textarea" ? (
        <Textarea value={(form as any)[field] || ""} onChange={e => set(field, e.target.value)} placeholder={placeholder} minRows={3} />
      ) : (
        <Input value={(form as any)[field] || ""} onChange={e => set(field, e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6">
        <Field label="Queixa Principal" field="main_complaint" />
        <Field label="Histórico Médico" field="medical_history" />
        <Field label="Medicamentos em Uso" field="medications" />
        <Field label="Alergias / Intolerâncias" field="allergies" />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border/40">
          <Field label="Aversões" field="food_aversions" type="input" />
          <Field label="Preferências" field="food_preferences" type="input" />
          <Field label="Refeições/dia" field="meals_per_day" type="input" />
          <Field label="Água (L/dia)" field="water_intake" type="input" />
          <Field label="Sono (Horas)" field="sleep_hours" type="input" />
          <Field label="Intestino" field="bowel_function" type="input" />
        </div>

        <Field label="Atividade Física" field="physical_activity" />
        <Field label="Objetivos do Paciente" field="goals" />
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={saving} className="h-11 px-8 rounded-xl font-bold gap-2">
          {saving ? <Loader2 className="animate-spin" /> : <Save size={16} />}
          Salvar Anamnese
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 3: Antropometria (Avaliação Corporal)
// ─────────────────────────────────────────────────────────────────────────────

type MeasurementForm = {
  assessment_date: string;
  weight?: string;
  height?: string;
  neck?: string;
  shoulder?: string;
  chest?: string;
  waist?: string;
  abdomen?: string;
  hip?: string;
  arm_relax_r?: string;
  arm_relax_l?: string;
  arm_contract_r?: string;
  arm_contract_l?: string;
  forearm_r?: string;
  forearm_l?: string;
  wrist_r?: string;
  wrist_l?: string;
  calf_r?: string;
  calf_l?: string;
  thigh_r?: string;
  thigh_l?: string;
  thigh_prox_r?: string;
  thigh_prox_l?: string;
  body_fat?: string;
  lean_mass?: string;
  visceral_fat?: string;
  notes?: string;
};

const InputField = ({ label, field, form, setField, placeholder }: any) => (
  <div className="space-y-1">
    <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</Label>
    <Input
      type="number"
      step="0.1"
      value={form[field] || ""}
      onChange={(e) => setField(field, e.target.value)}
      placeholder={placeholder}
      className="h-8 rounded-md text-xs"
    />
  </div>
);

const BilateralField = ({ label, fieldR, fieldL, form, setField }: any) => (
  <>
    <div className="space-y-1">
      <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label} D</Label>
      <Input type="number" step="0.1" value={form[fieldR] || ""} onChange={(e) => setField(fieldR, e.target.value)} className="h-8 rounded-md text-xs" />
    </div>
    <div className="space-y-1">
      <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label} E</Label>
      <Input type="number" step="0.1" value={form[fieldL] || ""} onChange={(e) => setField(fieldL, e.target.value)} className="h-8 rounded-md text-xs" />
    </div>
  </>
);

function AntropometriaTab({ patientId, onViewDetail }: { patientId: string; onViewDetail: (m: Measurement) => void }) {
  const pid = Number(patientId);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [form, setForm] = useState<MeasurementForm>({ assessment_date: todayISO() });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMeasurements(pid).then((data) => {
      setMeasurements(data);
      setLoading(false);
    });
  }, [pid]);

  const setField = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }));

  const handleInsert = async () => {
    setSaving(true);
    const payload: any = { patient_id: pid, assessment_date: form.assessment_date };
    Object.entries(form).forEach(([key, val]) => {
      if (key !== "assessment_date" && key !== "notes" && val) payload[key] = parseFloat(val as string);
    });
    if (form.notes) payload.notes = form.notes;
    const res = await insertMeasurement(payload as Measurement);
    if (res) {
      setMeasurements(p => [res, ...p]);
      setForm({ assessment_date: todayISO() });
      toast.success("Avaliação registrada!");
    }
    setSaving(false);
  };

  const handleDelete = async (mid: string) => {
    if (!confirm("Excluir avaliação?")) return;
    if (await deleteMeasurement(mid)) {
      setMeasurements(p => p.filter(m => m.id !== mid));
      toast.success("Removida.");
    }
  };

  const latest = measurements[0];
  const latestBmi = latest ? calcBMI(latest.weight, latest.height) : null;

  return (
    <div className="space-y-4">

      {/* ── Latest metrics strip ── */}
      {latest && (
        <div className="flex items-stretch gap-0 border border-border rounded-md overflow-hidden">
          <div className="px-4 py-2.5 bg-muted/50 border-r border-border flex flex-col justify-center shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Última</p>
            <p className="text-xs font-medium text-foreground mt-0.5">
              {latest.assessment_date ? formatDate(latest.assessment_date) : "—"}
            </p>
          </div>
          {([
            { label: "Peso",      value: latest.weight   != null ? `${latest.weight} kg` : "—",  badge: null       },
            { label: "Altura",    value: latest.height   != null ? `${latest.height} cm` : "—",  badge: null       },
            { label: "IMC",       value: latestBmi ?? "—",                                        badge: latestBmi  },
            { label: "% Gordura", value: latest.body_fat != null ? `${latest.body_fat}%` : "—",  badge: null       },
            { label: "Cintura",   value: latest.waist    != null ? `${latest.waist} cm`  : "—",  badge: null       },
          ] as { label: string; value: string; badge: string | null }[]).map((s, i) => (
            <div key={s.label} className={`flex-1 px-4 py-2.5 bg-card flex flex-col justify-center min-w-0${i > 0 ? " border-l border-border" : ""}`}>
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{s.label}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-sm font-bold tabular-nums text-foreground">{s.value}</p>
                {s.badge && <BMIBadge bmi={s.badge} />}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── New measurement form ── */}
      <div className="border border-border rounded-md overflow-hidden bg-card">
        <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Nova avaliação</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={form.assessment_date}
              onChange={e => setField("assessment_date", e.target.value)}
              className="h-7 rounded-md text-xs w-36"
            />
            <Button onClick={handleInsert} disabled={saving} size="sm" className="h-7 rounded-md text-xs gap-1.5">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              {saving ? "Salvando..." : "Registrar"}
            </Button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Métricas principais */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <InputField label="Peso (kg)"   field="weight"       form={form} setField={setField} placeholder="70.5" />
            <InputField label="Altura (cm)" field="height"       form={form} setField={setField} placeholder="175"  />
            <InputField label="% Gordura"   field="body_fat"     form={form} setField={setField} placeholder="18"   />
            <InputField label="Massa Magra" field="lean_mass"    form={form} setField={setField} placeholder="58"   />
            <InputField label="G. Visceral" field="visceral_fat" form={form} setField={setField} placeholder="8"    />
          </div>

          {/* Tronco */}
          <div className="pt-3 border-t border-border/60">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Tronco</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <InputField label="Pescoço"  field="neck"     form={form} setField={setField} />
              <InputField label="Ombro"    field="shoulder" form={form} setField={setField} />
              <InputField label="Peitoral" field="chest"    form={form} setField={setField} />
              <InputField label="Cintura"  field="waist"    form={form} setField={setField} />
              <InputField label="Abdômen"  field="abdomen"  form={form} setField={setField} />
              <InputField label="Quadril"  field="hip"      form={form} setField={setField} />
            </div>
          </div>

          {/* Membros superiores */}
          <div className="pt-3 border-t border-border/60">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Membros Superiores (D / E)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <BilateralField label="Braço Rel."  fieldR="arm_relax_r"    fieldL="arm_relax_l"    form={form} setField={setField} />
              <BilateralField label="Braço Con."  fieldR="arm_contract_r" fieldL="arm_contract_l" form={form} setField={setField} />
              <BilateralField label="Antebraço"   fieldR="forearm_r"      fieldL="forearm_l"      form={form} setField={setField} />
              <BilateralField label="Punho"       fieldR="wrist_r"        fieldL="wrist_l"        form={form} setField={setField} />
            </div>
          </div>

          {/* Membros inferiores */}
          <div className="pt-3 border-t border-border/60">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Membros Inferiores (D / E)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <BilateralField label="Coxa Prox." fieldR="thigh_prox_r" fieldL="thigh_prox_l" form={form} setField={setField} />
              <BilateralField label="Coxa Med."  fieldR="thigh_r"      fieldL="thigh_l"      form={form} setField={setField} />
              <BilateralField label="Panturr."   fieldR="calf_r"       fieldL="calf_l"       form={form} setField={setField} />
            </div>
          </div>

          {/* Notas */}
          <div className="pt-3 border-t border-border/60">
            <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Notas técnicas</Label>
            <Input
              value={form.notes || ""}
              onChange={e => setField("notes", e.target.value)}
              placeholder="Observações sobre esta avaliação…"
              className="mt-1.5 h-8 rounded-md text-xs"
            />
          </div>
        </div>
      </div>

      {/* ── History table ── */}
      {loading ? (
        <div className="flex items-center justify-center h-24">
          <Loader2 className="animate-spin text-primary" size={22} />
        </div>
      ) : measurements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 border border-border rounded-md bg-card text-muted-foreground">
          <Scale size={26} className="opacity-30" />
          <p className="text-sm">Nenhuma avaliação registrada.</p>
        </div>
      ) : (
        <div className="border border-border rounded-md overflow-hidden bg-card">
          <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
            <Activity size={14} className="text-muted-foreground" />
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Histórico — {measurements.length} avaliação{measurements.length !== 1 ? "ões" : ""}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Data", "Peso", "Altura", "IMC", "% Gordura", "Cintura", ""].map((col, i) => (
                    <th
                      key={i}
                      className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50${i === 0 ? " text-left" : " text-right"}${i === 6 ? " w-16" : ""}`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {measurements.map((m, idx) => {
                  const bmi = calcBMI(m.weight, m.height);
                  return (
                    <tr
                      key={m.id}
                      className={`border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors${idx === 0 ? " bg-primary/[0.03]" : ""}`}
                    >
                      <td className="px-4 py-2.5 text-xs font-medium text-foreground whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {idx === 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">Recente</span>
                          )}
                          {m.assessment_date ? formatDate(m.assessment_date) : "—"}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums">{m.weight ? `${m.weight} kg` : "—"}</td>
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums">{m.height ? `${m.height} cm` : "—"}</td>
                      <td className="px-4 py-2.5 text-right text-xs">
                        {bmi ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="font-semibold tabular-nums">{bmi}</span>
                            <BMIBadge bmi={bmi} />
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums">{m.body_fat != null ? `${m.body_fat}%` : "—"}</td>
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums">{m.waist ? `${m.waist} cm` : "—"}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            onClick={() => onViewDetail(m)}
                            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(m.id!)}
                            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-border/60 bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {measurements.length} avaliação{measurements.length !== 1 ? "ões" : ""} registrada{measurements.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 4: Planos Alimentares
// ─────────────────────────────────────────────────────────────────────────────

function PlanosTab({ patientId, patientRouteId, navigate }: any) {
  const pid = Number(patientId);
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMealPlans(pid).then(setPlans).finally(() => setLoading(false));
  }, [pid]);

  const handleNew = async () => {
    const np = await upsertMealPlan({ patient_id: pid, title: "Plano Alimentar" } as MealPlan);
    if (np && (np as any).id) navigate(`/admin/pacientes/${patientRouteId}/plano/${(np as any).id}`);
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-black text-lg">Dieta & Planos</h2>
        <Button onClick={handleNew} className="rounded-2xl h-11 px-6 font-bold shadow-lg shadow-primary/20"><Plus size={18} className="mr-2" /> Novo Plano</Button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {plans.map(p => (
          <div key={(p as any).id} className="bg-card border border-border/60 rounded-2xl p-5 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><BookOpen size={24} /></div>
              <div>
                <p className="font-black text-foreground">{p.title || "Plano sem título"}</p>
                <p className="text-xs text-muted-foreground font-semibold">Criado em {new Date((p as any).created_at).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate(`/admin/pacientes/${patientRouteId}/plano/${(p as any).id}`)} className="rounded-xl font-bold border-border/60 hover:bg-primary hover:text-white hover:border-primary transition-all">Abrir Plano</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
