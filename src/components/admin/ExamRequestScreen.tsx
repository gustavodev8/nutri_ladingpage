import { useState, useEffect, useRef } from "react";
import { Search, Check, FileText, Loader2, ChevronDown, ChevronRight, Zap, Trash2 } from "lucide-react";
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
  const [protocols, setProtocols]             = useState<ExamProtocol[]>([]);
  const [catalog,   setCatalog]               = useState<ExamCatalogItem[]>([]);
  const [loading,   setLoading]               = useState(true);
  const [saving,    setSaving]                = useState(false);
  const [selectedExamIds, setSelectedExamIds] = useState<Set<number>>(new Set());
  const [search,    setSearch]                = useState("");
  const [notes,     setNotes]                 = useState("");
  const [collapsed, setCollapsed]             = useState<Set<string>>(new Set());
  const [appliedProtocols, setAppliedProtocols] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([fetchExamProtocols(), fetchExamsCatalog()]).then(([protos, cat]) => {
      setProtocols(protos);
      setCatalog(cat);
      setLoading(false);
    });
  }, []);

  // ── Aplica protocolo de forma CUMULATIVA (não substitui seleção atual) ──
  const handleApplyProtocol = (protocolId: string) => {
    if (!protocolId) return;
    const proto = protocols.find((p) => String(p.id) === protocolId);
    if (!proto) return;

    const examIds = (proto.exams ?? []).map((e) => e.id);
    let added = 0;

    setSelectedExamIds((prev) => {
      const next = new Set(prev);
      examIds.forEach((id) => {
        if (!next.has(id)) { next.add(id); added++; }
      });
      return next;
    });

    setAppliedProtocols((prev) =>
      prev.includes(proto.name) ? prev : [...prev, proto.name]
    );

    // toast fora do setState — usa setTimeout p/ garantir que o state já atualizou
    setTimeout(() => {
      const newCount = examIds.filter((id) => !selectedExamIds.has(id)).length;
      if (newCount > 0) {
        toast.success(`Protocolo "${proto.name}" aplicado: ${newCount} exame(s) adicionado(s).`);
      } else {
        toast.info(`Protocolo "${proto.name}": todos os exames já estavam selecionados.`);
      }
    }, 0);
  };

  const handleClearAll = () => {
    setSelectedExamIds(new Set());
    setAppliedProtocols([]);
    toast.info("Seleção limpa.");
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
    const requestId = await createExamRequest(patientId, undefined, [...selectedExamIds], notes);
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

      {/* ── Protocolos Rápidos ── */}
      <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-primary shrink-0" />
          <Label className="text-[11px] font-black uppercase tracking-widest text-primary">
            Protocolos Rápidos
          </Label>
        </div>

        <p className="text-xs text-muted-foreground">
          Selecione um protocolo para adicionar os exames automaticamente.
          A seleção é <span className="font-semibold">cumulativa</span> — você pode aplicar vários.
        </p>

        <div className="flex items-center gap-2">
          <select
            defaultValue=""
            onChange={(e) => { handleApplyProtocol(e.target.value); e.currentTarget.value = ""; }}
            className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
          >
            <option value="" disabled>Selecionar protocolo…</option>
            {protocols.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name}{p.description ? ` — ${p.description}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Tags dos protocolos aplicados */}
        {appliedProtocols.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {appliedProtocols.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20"
              >
                <Zap size={9} /> {name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Contador + busca + limpar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">
            {selectedExamIds.size} exame(s) selecionado(s)
          </span>
          {selectedExamIds.size > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="h-7 px-2.5 text-[11px] gap-1 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 size={11} /> Limpar Seleção
            </Button>
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
