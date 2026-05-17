import { useState, useEffect, useRef, useMemo } from "react";
import {
  FlaskConical, Plus, Trash2, Save, X, Search, ChevronRight,
  Pencil, Target, BookOpen, ListChecks, Loader2, AlertCircle,
  CheckCircle2, SlidersHorizontal, Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  fetchGlobalExams, upsertGlobalExam, deleteGlobalExam,
  fetchGlobalProtocols, upsertGlobalProtocol, deleteGlobalProtocol,
  fetchProtocolExamIds, setProtocolExams,
  type GlobalExam, type GlobalProtocol,
} from "@/lib/supabase";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Nutricional", "Metabólico", "Lipídico", "Hematológico",
  "Hormonal", "Inflamatório", "Renal", "Hepático",
  "Cardiovascular", "Imunológico", "Geral",
];

const EMPTY_EXAM: GlobalExam = {
  name: "", category: "Nutricional", clinical_axis: "", unit: "",
  lab_ref_min: null, lab_ref_max: null,
  target_male_min: null, target_male_max: null,
  target_female_min: null, target_female_max: null,
  clinical_observation: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function numFmt(v: number | null | undefined) {
  if (v == null) return "—";
  return String(v).replace(".", ",");
}

function parseNum(s: string): number | null {
  if (s === "" || s === null) return null;
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) ? null : n;
}

function numInput(
  value: number | null | undefined,
  onChange: (v: number | null) => void,
  placeholder = "—",
  extraClass = ""
) {
  return (
    <input
      type="number"
      step="any"
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => onChange(parseNum(e.target.value))}
      className={cn(
        "h-8 w-full rounded border border-border/60 bg-transparent px-2 text-sm text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-ring",
        extraClass
      )}
    />
  );
}

// ─── Category badge ───────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  Nutricional:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  Metabólico:     "bg-amber-100  text-amber-700  border-amber-200",
  Lipídico:       "bg-sky-100    text-sky-700    border-sky-200",
  Hematológico:   "bg-red-100    text-red-700    border-red-200",
  Hormonal:       "bg-purple-100 text-purple-700 border-purple-200",
  Inflamatório:   "bg-orange-100 text-orange-700 border-orange-200",
  Renal:          "bg-teal-100   text-teal-700   border-teal-200",
  Hepático:       "bg-lime-100   text-lime-700   border-lime-200",
  Cardiovascular: "bg-rose-100   text-rose-700   border-rose-200",
  Imunológico:    "bg-cyan-100   text-cyan-700   border-cyan-200",
};

function CatBadge({ cat }: { cat: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
      CAT_COLORS[cat] ?? "bg-muted text-muted-foreground border-border"
    )}>
      {cat}
    </span>
  );
}

// ─── Target Indicator (mini visual) ──────────────────────────────────────────

function TargetMini({ exam }: { exam: GlobalExam }) {
  const hasM = exam.target_male_min != null || exam.target_male_max != null;
  const hasF = exam.target_female_min != null || exam.target_female_max != null;
  if (!hasM && !hasF) return <span className="text-muted-foreground/30 text-xs">—</span>;
  return (
    <div className="flex items-center gap-2 text-xs">
      {hasM && (
        <span className="text-blue-600 font-medium">
          ♂ {numFmt(exam.target_male_min)}–{numFmt(exam.target_male_max)} {exam.unit}
        </span>
      )}
      {hasF && (
        <span className="text-pink-500 font-medium">
          ♀ {numFmt(exam.target_female_min)}–{numFmt(exam.target_female_max)} {exam.unit}
        </span>
      )}
    </div>
  );
}

// ─── Exam Slide-over ──────────────────────────────────────────────────────────

function ExamSlideOver({
  exam, onClose, onSaved, onDeleted,
}: {
  exam: GlobalExam;
  onClose: () => void;
  onSaved: (e: GlobalExam) => void;
  onDeleted: (id: number) => void;
}) {
  const [form, setForm] = useState<GlobalExam>({ ...EMPTY_EXAM, ...exam });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const set = <K extends keyof GlobalExam>(k: K, v: GlobalExam[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Informe o nome do exame."); return; }
    setSaving(true);
    const saved = await upsertGlobalExam(form);
    setSaving(false);
    if (!saved) { toast.error("Erro ao salvar exame."); return; }
    toast.success("Exame salvo!");
    onSaved(saved);
  };

  const handleDelete = async () => {
    if (!form.id) return;
    setDeleting(true);
    const ok = await deleteGlobalExam(form.id);
    setDeleting(false);
    if (!ok) { toast.error("Erro ao excluir."); return; }
    toast.success("Exame removido.");
    onDeleted(form.id);
  };

  const labelCls = "text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1 block";
  const inputCls = "h-8 w-full rounded border border-border/60 bg-transparent px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring text-foreground";

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-[520px] h-full bg-background border-l border-border flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <FlaskConical className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">
              {form.id ? "Editar Exame" : "Novo Exame"}
            </h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Identificação */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
              Identificação
            </p>

            <div>
              <label className={labelCls}>Nome do Exame *</label>
              <input className={inputCls} value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ex: Vitamina D3 (25-OH)" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Categoria</label>
                <select className={cn(inputCls, "cursor-pointer bg-background")}
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Unidade</label>
                <input className={inputCls} value={form.unit ?? ""}
                  onChange={(e) => set("unit", e.target.value)}
                  placeholder="ng/mL, U/L, mg/dL…" />
              </div>
            </div>

            <div>
              <label className={labelCls}>Eixo Clínico</label>
              <input className={inputCls} value={form.clinical_axis ?? ""}
                onChange={(e) => set("clinical_axis", e.target.value)}
                placeholder="Ex: Imunidade / Hormonal" />
            </div>
          </div>

          {/* Referência Laboratorial */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
              Referência Laboratorial
            </p>
            <div className="bg-muted/40 border border-border/60 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground mb-2">
                Valores do laudo do laboratório (para referência)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Mínimo</label>
                  {numInput(form.lab_ref_min, (v) => set("lab_ref_min", v))}
                </div>
                <div>
                  <label className={labelCls}>Máximo</label>
                  {numInput(form.lab_ref_max, (v) => set("lab_ref_max", v))}
                </div>
              </div>
            </div>
          </div>

          {/* Alvos Terapêuticos — seção destaque */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-emerald-600" />
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                Calibração de Alvo Terapêutico
              </p>
            </div>

            <div className="rounded-xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 space-y-4">
              <p className="text-[11px] text-emerald-700/80 leading-relaxed">
                Alvos <strong>ótimos nutricionais</strong> — superiores ao mínimo laboratorial,
                segmentados por sexo. São estes valores que orientam a conduta clínica.
              </p>

              {/* Masculino */}
              <div className="bg-white/80 rounded-lg border border-blue-200 p-3 space-y-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-base leading-none">♂</span>
                  <span className="text-xs font-bold text-blue-700">Alvo Masculino</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={cn(labelCls, "text-blue-600/70")}>Mínimo</label>
                    {numInput(form.target_male_min, (v) => set("target_male_min", v), "—", "border-blue-200 focus:ring-blue-300")}
                  </div>
                  <div>
                    <label className={cn(labelCls, "text-blue-600/70")}>Máximo</label>
                    {numInput(form.target_male_max, (v) => set("target_male_max", v), "—", "border-blue-200 focus:ring-blue-300")}
                  </div>
                </div>
              </div>

              {/* Feminino */}
              <div className="bg-white/80 rounded-lg border border-pink-200 p-3 space-y-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-base leading-none">♀</span>
                  <span className="text-xs font-bold text-pink-600">Alvo Feminino</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={cn(labelCls, "text-pink-500/70")}>Mínimo</label>
                    {numInput(form.target_female_min, (v) => set("target_female_min", v), "—", "border-pink-200 focus:ring-pink-300")}
                  </div>
                  <div>
                    <label className={cn(labelCls, "text-pink-500/70")}>Máximo</label>
                    {numInput(form.target_female_max, (v) => set("target_female_max", v), "—", "border-pink-200 focus:ring-pink-300")}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Observação Clínica */}
          <div>
            <label className={labelCls}>Observação Clínica</label>
            <textarea
              rows={4}
              value={form.clinical_observation ?? ""}
              onChange={(e) => set("clinical_observation", e.target.value)}
              placeholder="Contexto clínico, protocolos nutricionais, interpretação funcional…"
              className="w-full rounded border border-border/60 bg-transparent px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none text-foreground placeholder:text-muted-foreground/40"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex items-center justify-between shrink-0">
          {form.id ? (
            confirmDel ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-destructive">Confirmar exclusão?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="h-8 px-3 rounded bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Excluir"}
                </button>
                <button onClick={() => setConfirmDel(false)}
                  className="h-8 px-3 rounded border border-border text-xs font-medium hover:bg-muted/60 transition-colors">
                  Cancelar
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDel(true)}
                className="h-8 px-3 rounded border border-destructive/40 text-destructive text-xs font-medium hover:bg-destructive/10 transition-colors flex items-center gap-1.5">
                <Trash2 className="h-3 w-3" /> Excluir
              </button>
            )
          ) : <div />}

          <div className="flex gap-2">
            <button onClick={onClose}
              className="h-9 px-4 rounded-lg border border-border text-sm font-medium hover:bg-muted/60 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Protocol Builder ─────────────────────────────────────────────────────────

function ProtocolBuilder({
  protocol, allExams, onSaved, onDeleted,
}: {
  protocol: GlobalProtocol;
  allExams: GlobalExam[];
  onSaved: (p: GlobalProtocol) => void;
  onDeleted: (id: number) => void;
}) {
  const [name, setName] = useState(protocol.name);
  const [desc, setDesc] = useState(protocol.description ?? "");
  const [examIds, setExamIds] = useState<number[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [search, setSearch] = useState("");
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setName(protocol.name);
    setDesc(protocol.description ?? "");
    if (protocol.id) {
      setLoadingItems(true);
      fetchProtocolExamIds(protocol.id).then((ids) => {
        setExamIds(ids);
        setLoadingItems(false);
      });
    } else {
      setExamIds([]);
      setLoadingItems(false);
    }
  }, [protocol.id]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const suggestions = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return allExams
      .filter((e) => !examIds.includes(e.id!) &&
        (e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [search, allExams, examIds]);

  const addExam = (exam: GlobalExam) => {
    setExamIds((p) => [...p, exam.id!]);
    setSearch("");
    setDropOpen(false);
  };

  const removeExam = (id: number) => setExamIds((p) => p.filter((x) => x !== id));

  const selectedExams = examIds
    .map((id) => allExams.find((e) => e.id === id))
    .filter(Boolean) as GlobalExam[];

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Informe o nome do protocolo."); return; }
    setSaving(true);
    const saved = await upsertGlobalProtocol({ ...protocol, name: name.trim(), description: desc });
    if (!saved?.id) { setSaving(false); toast.error("Erro ao salvar protocolo."); return; }
    await setProtocolExams(saved.id, examIds);
    setSaving(false);
    toast.success("Protocolo salvo!");
    onSaved(saved);
  };

  const handleDelete = async () => {
    if (!protocol.id) return;
    setDeleting(true);
    const ok = await deleteGlobalProtocol(protocol.id);
    setDeleting(false);
    if (!ok) { toast.error("Erro ao excluir."); return; }
    toast.success("Protocolo removido.");
    onDeleted(protocol.id);
  };

  const labelCls = "text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1 block";
  const inputCls = "h-9 w-full rounded-lg border border-border/60 bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring text-foreground";

  if (loadingItems) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do protocolo…"
              className="text-base font-semibold bg-transparent border-0 focus:outline-none w-full text-foreground placeholder:text-muted-foreground/30"
            />
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Descrição breve (objetivo do protocolo)…"
              className="text-xs text-muted-foreground bg-transparent border-0 focus:outline-none w-full placeholder:text-muted-foreground/30"
            />
          </div>
          <span className="ml-3 shrink-0 text-xs text-muted-foreground bg-muted/60 border border-border/60 rounded-full px-2.5 py-0.5">
            {selectedExams.length} exame{selectedExams.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Autocomplete */}
        <div>
          <label className={labelCls}>Adicionar exame ao protocolo</label>
          <div className="relative" ref={dropRef}>
            <div className="flex items-center border border-border/60 rounded-lg bg-background overflow-hidden focus-within:ring-1 focus-within:ring-ring">
              <Search className="h-3.5 w-3.5 text-muted-foreground ml-3 shrink-0" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setDropOpen(true); }}
                onFocus={() => setDropOpen(true)}
                placeholder="Buscar por nome ou categoria…"
                className="flex-1 h-9 px-2.5 text-sm bg-transparent focus:outline-none text-foreground placeholder:text-muted-foreground/40"
              />
              {search && (
                <button onClick={() => { setSearch(""); setDropOpen(false); }}
                  className="mr-2 text-muted-foreground/40 hover:text-muted-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {dropOpen && suggestions.length > 0 && (
              <div className="absolute z-20 top-full mt-1 w-full bg-background border border-border rounded-lg shadow-xl overflow-hidden">
                {suggestions.map((exam) => (
                  <button
                    key={exam.id}
                    type="button"
                    onClick={() => addExam(exam)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left"
                  >
                    <FlaskConical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{exam.name}</p>
                      <p className="text-[10px] text-muted-foreground">{exam.category}{exam.unit ? ` · ${exam.unit}` : ""}</p>
                    </div>
                    <Plus className="h-3.5 w-3.5 text-primary shrink-0" />
                  </button>
                ))}
              </div>
            )}
            {dropOpen && search.trim() && suggestions.length === 0 && (
              <div className="absolute z-20 top-full mt-1 w-full bg-background border border-border rounded-lg shadow-xl p-3 text-center">
                <p className="text-xs text-muted-foreground">Nenhum exame encontrado para "{search}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Cart */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={labelCls}>Exames do protocolo</label>
          </div>

          {selectedExams.length === 0 ? (
            <div className="border border-dashed border-border/60 rounded-lg p-8 text-center">
              <ListChecks className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground/50">
                Busque e adicione exames acima para montar o protocolo.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {selectedExams.map((exam, i) => (
                <div
                  key={exam.id}
                  className="flex items-center gap-3 bg-muted/30 border border-border/40 rounded-lg px-3 py-2 group hover:bg-muted/50 transition-colors"
                >
                  <span className="text-[10px] font-bold text-muted-foreground/30 tabular-nums w-4 shrink-0">{i + 1}</span>
                  <FlaskConical className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{exam.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {exam.category}{exam.unit ? ` · ${exam.unit}` : ""}
                      {(exam.target_male_min != null || exam.target_male_max != null) && (
                        <span className="text-blue-500 ml-1">♂ {numFmt(exam.target_male_min)}–{numFmt(exam.target_male_max)}</span>
                      )}
                      {(exam.target_female_min != null || exam.target_female_max != null) && (
                        <span className="text-pink-400 ml-1">♀ {numFmt(exam.target_female_min)}–{numFmt(exam.target_female_max)}</span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExam(exam.id!)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
        {protocol.id ? (
          confirmDel ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-destructive">Excluir protocolo?</span>
              <button onClick={handleDelete} disabled={deleting}
                className="h-8 px-3 rounded bg-destructive text-destructive-foreground text-xs font-semibold disabled:opacity-50">
                {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirmar"}
              </button>
              <button onClick={() => setConfirmDel(false)}
                className="h-8 px-3 rounded border border-border text-xs font-medium hover:bg-muted/60">
                Cancelar
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDel(true)}
              className="h-8 px-3 rounded border border-destructive/40 text-destructive text-xs font-medium hover:bg-destructive/10 flex items-center gap-1.5">
              <Trash2 className="h-3 w-3" /> Excluir protocolo
            </button>
          )
        ) : <div />}

        <button onClick={handleSave} disabled={saving}
          className="h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Salvar protocolo
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ExamLibraryManager() {
  const [activeTab, setActiveTab] = useState<"catalog" | "protocols">("catalog");

  // Catalog state
  const [exams, setExams] = useState<GlobalExam[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Todos");
  const [selectedExam, setSelectedExam] = useState<GlobalExam | null>(null);

  // Protocol state
  const [protocols, setProtocols] = useState<GlobalProtocol[]>([]);
  const [loadingProtos, setLoadingProtos] = useState(true);
  const [selectedProtocol, setSelectedProtocol] = useState<GlobalProtocol | null>(null);
  const [protoSearch, setProtoSearch] = useState("");

  useEffect(() => {
    fetchGlobalExams().then((data) => { setExams(data); setLoadingExams(false); });
    fetchGlobalProtocols().then((data) => { setProtocols(data); setLoadingProtos(false); });
  }, []);

  // Catalog filter
  const filteredExams = useMemo(() => {
    let list = exams;
    if (catFilter !== "Todos") list = list.filter((e) => e.category === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) =>
        e.name.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.clinical_axis ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [exams, search, catFilter]);

  // Category counts
  const catCounts = useMemo(() => {
    const map: Record<string, number> = { Todos: exams.length };
    for (const e of exams) map[e.category] = (map[e.category] ?? 0) + 1;
    return map;
  }, [exams]);

  // Filtered protocols
  const filteredProtos = useMemo(() => {
    if (!protoSearch.trim()) return protocols;
    const q = protoSearch.toLowerCase();
    return protocols.filter((p) => p.name.toLowerCase().includes(q));
  }, [protocols, protoSearch]);

  const handleExamSaved = (exam: GlobalExam) => {
    setExams((prev) => {
      const idx = prev.findIndex((e) => e.id === exam.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = exam; return next; }
      return [...prev, exam];
    });
    setSelectedExam(null);
  };

  const handleExamDeleted = (id: number) => {
    setExams((prev) => prev.filter((e) => e.id !== id));
    setSelectedExam(null);
  };

  const handleProtocolSaved = (p: GlobalProtocol) => {
    setProtocols((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = p; return next; }
      return [...prev, p];
    });
    setSelectedProtocol(p);
  };

  const handleProtocolDeleted = (id: number) => {
    setProtocols((prev) => prev.filter((p) => p.id !== id));
    setSelectedProtocol(null);
  };

  const tabs = [
    { key: "catalog" as const,   icon: FlaskConical, label: "Catálogo & Alvos Terapêuticos" },
    { key: "protocols" as const, icon: BookOpen,     label: "Construtor de Protocolos"       },
  ];

  return (
    <div className="h-full flex flex-col">

      {/* Page Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <FlaskConical className="h-4 w-4 text-primary" />
              </div>
              <h1 className="text-lg font-bold text-foreground">Biblioteca Clínica</h1>
            </div>
            <p className="text-xs text-muted-foreground">
              Catálogo global de exames com alvos terapêuticos nutricionais e montagem de protocolos.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 border border-border/60 rounded-lg px-3 py-1.5">
            <FlaskConical className="h-3 w-3" />
            {loadingExams ? "…" : exams.length} exames
            <span className="text-muted-foreground/30 mx-1">·</span>
            <BookOpen className="h-3 w-3" />
            {loadingProtos ? "…" : protocols.length} protocolos
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-5">
          {tabs.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab 1: Catálogo ──────────────────────────────────────────────── */}
      {activeTab === "catalog" && (
        <div className="flex-1 flex overflow-hidden">

          {/* Left: category sidebar */}
          <div className="w-48 shrink-0 border-r border-border overflow-y-auto p-3 space-y-0.5">
            {["Todos", ...CATEGORIES].map((cat) => (
              catCounts[cat] != null && (
                <button
                  key={cat}
                  onClick={() => setCatFilter(cat)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                    catFilter === cat
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  <span className="truncate">{cat}</span>
                  <span className={cn(
                    "text-[10px] tabular-nums ml-1 shrink-0",
                    catFilter === cat ? "text-primary/70" : "text-muted-foreground/40"
                  )}>
                    {catCounts[cat] ?? 0}
                  </span>
                </button>
              )
            ))}
          </div>

          {/* Right: exam list */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search + add */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
              <div className="flex-1 flex items-center border border-border/60 rounded-lg bg-background overflow-hidden focus-within:ring-1 focus-within:ring-ring">
                <Search className="h-3.5 w-3.5 text-muted-foreground ml-3 shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome, categoria ou eixo clínico…"
                  className="flex-1 h-9 px-2.5 text-sm bg-transparent focus:outline-none"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="mr-2 text-muted-foreground/40 hover:text-muted-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedExam(EMPTY_EXAM)}
                className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 hover:bg-primary/90 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" /> Novo exame
              </button>
            </div>

            {/* Table */}
            {loadingExams ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredExams.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground/40">
                <AlertCircle className="h-8 w-8" />
                <p className="text-sm">Nenhum exame encontrado.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/60 backdrop-blur-sm z-10">
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Exame</th>
                      <th className="text-left px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 hidden md:table-cell">Unidade</th>
                      <th className="text-left px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 hidden lg:table-cell">
                        <div className="flex items-center gap-1"><Target className="h-3 w-3 text-emerald-500" /> Alvos Terapêuticos</div>
                      </th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {filteredExams.map((exam) => (
                      <tr
                        key={exam.id}
                        onClick={() => setSelectedExam(exam)}
                        className="cursor-pointer hover:bg-muted/30 transition-colors group"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{exam.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <CatBadge cat={exam.category} />
                            {exam.clinical_axis && (
                              <span className="text-[10px] text-muted-foreground/50">{exam.clinical_axis}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground hidden md:table-cell">
                          {exam.unit ?? <span className="text-muted-foreground/30">—</span>}
                        </td>
                        <td className="px-3 py-3 hidden lg:table-cell">
                          <TargetMini exam={exam} />
                        </td>
                        <td className="px-3 py-3">
                          <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Count */}
            {!loadingExams && (
              <div className="px-4 py-2 border-t border-border shrink-0">
                <p className="text-[11px] text-muted-foreground/50">
                  {filteredExams.length} de {exams.length} exame{exams.length !== 1 ? "s" : ""}
                  {catFilter !== "Todos" ? ` em ${catFilter}` : ""}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab 2: Protocolos ────────────────────────────────────────────── */}
      {activeTab === "protocols" && (
        <div className="flex-1 flex overflow-hidden">

          {/* Left: protocol list */}
          <div className="w-64 shrink-0 border-r border-border flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border shrink-0 space-y-2">
              <div className="flex items-center border border-border/60 rounded-lg bg-background overflow-hidden focus-within:ring-1 focus-within:ring-ring">
                <Search className="h-3.5 w-3.5 text-muted-foreground ml-2.5 shrink-0" />
                <input
                  value={protoSearch}
                  onChange={(e) => setProtoSearch(e.target.value)}
                  placeholder="Buscar protocolo…"
                  className="flex-1 h-8 px-2 text-xs bg-transparent focus:outline-none"
                />
              </div>
              <button
                onClick={() => setSelectedProtocol({ name: "", description: "" })}
                className="w-full h-8 rounded-lg border border-dashed border-primary/50 text-primary text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-primary/5 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Novo protocolo
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loadingProtos ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProtos.length === 0 ? (
                <p className="text-xs text-center text-muted-foreground/40 py-8">
                  {protoSearch ? "Nenhum protocolo encontrado." : "Nenhum protocolo criado ainda."}
                </p>
              ) : (
                filteredProtos.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProtocol(p)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg transition-colors",
                      selectedProtocol?.id === p.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/60 border border-transparent"
                    )}
                  >
                    <p className={cn(
                      "text-sm font-medium truncate",
                      selectedProtocol?.id === p.id ? "text-primary" : "text-foreground"
                    )}>
                      {p.name}
                    </p>
                    {p.description && (
                      <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">{p.description}</p>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right: builder */}
          {selectedProtocol ? (
            <ProtocolBuilder
              key={selectedProtocol.id ?? "new"}
              protocol={selectedProtocol}
              allExams={exams}
              onSaved={handleProtocolSaved}
              onDeleted={handleProtocolDeleted}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground/30 p-8">
              <BookOpen className="h-12 w-12" />
              <p className="text-sm">Selecione ou crie um protocolo à esquerda.</p>
            </div>
          )}
        </div>
      )}

      {/* Slide-over */}
      {selectedExam && (
        <ExamSlideOver
          exam={selectedExam}
          onClose={() => setSelectedExam(null)}
          onSaved={handleExamSaved}
          onDeleted={handleExamDeleted}
        />
      )}
    </div>
  );
}
