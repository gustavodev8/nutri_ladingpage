import { useState, useEffect, useRef } from "react";
import { Search, Check, FileText, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  fetchExamProtocols, fetchExamsCatalog, createExamRequest,
  type ExamCatalogItem, type ExamProtocol,
} from "@/lib/supabase";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  patientId: number;
  onCreated: (requestId: number) => void;
  onCancel:  () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ExamRequestScreen({ patientId, onCreated, onCancel }: Props) {
  const [protocols, setProtocols]               = useState<ExamProtocol[]>([]);
  const [catalog,   setCatalog]                 = useState<ExamCatalogItem[]>([]);
  const [loading,   setLoading]                 = useState(true);
  const [saving,    setSaving]                  = useState(false);
  const [selectedProtocolId, setSelectedProtocolId] = useState<number | null>(null);
  const [selectedExamIds, setSelectedExamIds]   = useState<Set<number>>(new Set());
  const [search,    setSearch]                  = useState("");
  const [notes,     setNotes]                   = useState("");
  const [collapsed, setCollapsed]               = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([fetchExamProtocols(), fetchExamsCatalog()]).then(([protos, cat]) => {
      setProtocols(protos);
      setCatalog(cat);
      setLoading(false);
    });
  }, []);

  const handleProtocolChange = (protocolId: number | null) => {
    setSelectedProtocolId(protocolId);
    if (protocolId) {
      const proto = protocols.find((p) => p.id === protocolId);
      setSelectedExamIds(new Set((proto?.exams ?? []).map((e) => e.id)));
    } else {
      setSelectedExamIds(new Set());
    }
  };

  const toggleExam = (examId: number) => {
    setSelectedExamIds((prev) => {
      const next = new Set(prev);
      if (next.has(examId)) next.delete(examId);
      else next.add(examId);
      return next;
    });
  };

  const toggleCategory = (cat: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleAll = (exams: ExamCatalogItem[], selectAll: boolean) => {
    setSelectedExamIds((prev) => {
      const next = new Set(prev);
      exams.forEach((e) => (selectAll ? next.add(e.id) : next.delete(e.id)));
      return next;
    });
  };

  const filtered = catalog.filter((e) =>
    search === "" || e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.group_category.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, ExamCatalogItem[]>>((acc, e) => {
    (acc[e.group_category] ??= []).push(e);
    return acc;
  }, {});

  const handleSubmit = async () => {
    if (selectedExamIds.size === 0) { toast.error("Selecione pelo menos um exame."); return; }
    setSaving(true);
    const requestId = await createExamRequest(patientId, selectedProtocolId ?? undefined, [...selectedExamIds], notes);
    setSaving(false);
    if (!requestId) { toast.error("Erro ao gerar o pedido. Tente novamente."); return; }
    toast.success(`Pedido gerado com ${selectedExamIds.size} exame(s).`);
    onCreated(requestId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-primary" size={22} />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Protocolos ── */}
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Protocolo
        </Label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleProtocolChange(null)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              selectedProtocolId === null
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            Seleção manual
          </button>
          {protocols.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleProtocolChange(p.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                selectedProtocolId === p.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
        {selectedProtocolId != null && (
          <p className="text-xs text-muted-foreground pl-0.5">
            {protocols.find((p) => p.id === selectedProtocolId)?.description}
          </p>
        )}
      </div>

      {/* ── Search + counter ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-foreground">
            {selectedExamIds.size} exame(s) selecionado(s)
          </span>
          {selectedExamIds.size > 0 && (
            <button
              type="button"
              onClick={() => setSelectedExamIds(new Set())}
              className="text-[11px] text-muted-foreground hover:text-destructive underline transition-colors"
            >
              limpar
            </button>
          )}
        </div>
        <div className="relative w-52">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar exame…"
            className="pl-7 h-8 text-sm"
          />
        </div>
      </div>

      {/* ── Grouped exam list ── */}
      <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
        {Object.entries(grouped).map(([category, exams]) => {
          const isCollapsed = collapsed.has(category);
          const allSelected = exams.every((e) => selectedExamIds.has(e.id));
          const someSelected = exams.some((e) => selectedExamIds.has(e.id));

          return (
            <div key={category} className="rounded-lg border border-border/50 overflow-hidden">
              {/* Category header */}
              <div
                className="flex items-center justify-between px-3 py-2 bg-muted/30 cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => toggleCategory(category)}
              >
                <div className="flex items-center gap-2">
                  {isCollapsed
                    ? <ChevronRight size={13} className="text-muted-foreground" />
                    : <ChevronDown  size={13} className="text-muted-foreground" />
                  }
                  <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                    {category}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    ({exams.filter((e) => selectedExamIds.has(e.id)).length}/{exams.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(ev) => { ev.stopPropagation(); toggleAll(exams, !allSelected); }}
                  className={cn(
                    "text-[10px] font-semibold transition-colors px-2 py-0.5 rounded",
                    someSelected
                      ? "text-primary hover:text-primary/80"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {allSelected ? "Desmarcar todos" : "Marcar todos"}
                </button>
              </div>

              {/* Exam checkboxes */}
              {!isCollapsed && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border/20 p-1.5">
                  {exams.map((exam) => {
                    const selected = selectedExamIds.has(exam.id);
                    return (
                      <button
                        key={exam.id}
                        type="button"
                        onClick={() => toggleExam(exam.id)}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-all",
                          selected
                            ? "bg-primary/8 text-foreground"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        )}
                      >
                        <span className={cn(
                          "flex-shrink-0 w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors",
                          selected ? "bg-primary border-primary" : "border-muted-foreground/30"
                        )}>
                          {selected && <Check size={9} className="text-primary-foreground" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{exam.name}</p>
                          {exam.unit && (
                            <p className="text-[10px] text-muted-foreground">{exam.unit}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {Object.keys(grouped).length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum exame encontrado para "{search}".
          </p>
        )}
      </div>

      {/* ── Notes ── */}
      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Observações (opcional)
        </Label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex: jejum de 12h, não usar biotina 48h antes…"
          className="text-sm"
        />
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center justify-end gap-2.5 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={saving || selectedExamIds.size === 0}
          className="gap-1.5"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
          {saving ? "Gerando…" : `Gerar Pedido (${selectedExamIds.size})`}
        </Button>
      </div>
    </div>
  );
}
