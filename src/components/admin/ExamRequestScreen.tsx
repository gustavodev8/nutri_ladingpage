import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Trash2, Plus, Zap, Bot, X,
  FlaskConical, Loader2, FileText,
} from "lucide-react";
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

// ─── Helper ───────────────────────────────────────────────────────────────────────

function fmtRef(exam: ExamCatalogItem): string {
  const { ref_min, ref_max, unit } = exam;
  if (ref_min != null && ref_max != null) return `${ref_min}–${ref_max}${unit ? " " + unit : ""}`;
  if (ref_min != null) return `>${ref_min}${unit ? " " + unit : ""}`;
  if (ref_max != null) return `<${ref_max}${unit ? " " + unit : ""}`;
  return "—";
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ExamRequestScreen({ patientId, onCreated, onCancel }: Props) {
  const [protocols, setProtocols] = useState<ExamProtocol[]>([]);
  const [catalog,   setCatalog]   = useState<ExamCatalogItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [notes,     setNotes]     = useState("");

  // ── Carrinho: array ordenado de exames no pedido ──
  const [cart, setCart] = useState<ExamCatalogItem[]>([]);

  // ── Autocomplete ──
  const [search,      setSearch]      = useState("");
  const [suggestions, setSuggestions] = useState<ExamCatalogItem[]>([]);
  const [showSugg,    setShowSugg]    = useState(false);
  const [activeIdx,   setActiveIdx]   = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([fetchExamProtocols(), fetchExamsCatalog()]).then(([protos, cat]) => {
      setProtocols(protos);
      setCatalog(cat);
      setLoading(false);
      // foca o input assim que os dados carregam
      setTimeout(() => inputRef.current?.focus(), 50);
    });
  }, []);

  // ── Filtra sugestões excluindo o que já está no carrinho ──
  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) { setSuggestions([]); setShowSugg(false); return; }
    const cartIds = new Set(cart.map((e) => e.id));
    const filtered = catalog
      .filter((e) =>
        !cartIds.has(e.id) &&
        (e.name.toLowerCase().includes(q) || e.group_category.toLowerCase().includes(q))
      )
      .slice(0, 9);
    setSuggestions(filtered);
    setShowSugg(filtered.length > 0);
    setActiveIdx(-1);
  }, [search, catalog, cart]);

  const addExam = useCallback((exam: ExamCatalogItem) => {
    setCart((prev) => prev.find((e) => e.id === exam.id) ? prev : [...prev, exam]);
    setSearch("");
    setSuggestions([]);
    setShowSugg(false);
    setActiveIdx(-1);
    inputRef.current?.focus();
  }, []);

  const removeExam = (examId: number) =>
    setCart((prev) => prev.filter((e) => e.id !== examId));

  const handleAddAll = () => {
    setCart(catalog);
    toast.success(`${catalog.length} exame(s) adicionados ao pedido.`);
  };

  const handleAIFill = () =>
    toast.info("Em breve: preenchimento automático baseado na anamnese do paciente.");

  const handleClear = () => {
    setCart([]);
    toast.info("Pedido limpo.");
    inputRef.current?.focus();
  };

  // ── Protocolo: aplicação cumulativa ──
  const handleApplyProtocol = (protocolId: string) => {
    if (!protocolId) return;
    const proto = protocols.find((p) => String(p.id) === protocolId);
    if (!proto) return;
    const cartIds = new Set(cart.map((e) => e.id));
    const toAdd = (proto.exams ?? []).filter((e) => !cartIds.has(e.id));
    if (toAdd.length === 0) {
      toast.info(`Protocolo "${proto.name}": todos os exames já estavam no pedido.`);
      return;
    }
    setCart((prev) => [...prev, ...toAdd]);
    toast.success(`Protocolo "${proto.name}" aplicado: ${toAdd.length} exame(s) adicionado(s).`);
  };

  // ── Navegação por teclado no autocomplete ──
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!showSugg && search) setShowSugg(true);
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = activeIdx >= 0 ? suggestions[activeIdx] : suggestions[0];
      if (target) addExam(target);
    } else if (e.key === "Escape") {
      setShowSugg(false);
    }
  };

  const handleSubmit = async () => {
    if (cart.length === 0) { toast.error("Adicione pelo menos um exame ao pedido."); return; }
    setSaving(true);
    const requestId = await createExamRequest(
      patientId, undefined, cart.map((e) => e.id), notes,
    );
    setSaving(false);
    if (!requestId) { toast.error("Erro ao gerar o pedido. Tente novamente."); return; }
    toast.success(`Pedido gerado com ${cart.length} exame(s).`);
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
    <div className="space-y-4">

      {/* ── Protocolos Rápidos ── */}
      {protocols.length > 0 && (
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-primary/20 bg-primary/[0.03]">
          <Zap size={13} className="text-primary shrink-0" />
          <span className="text-[11px] font-black uppercase tracking-widest text-primary shrink-0 hidden sm:block">
            Protocolo
          </span>
          <select
            defaultValue=""
            onChange={(e) => { handleApplyProtocol(e.target.value); e.currentTarget.value = ""; }}
            className="flex-1 h-8 rounded-lg border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
          >
            <option value="" disabled>Selecionar protocolo rápido…</option>
            {protocols.map((p) => (
              <option key={p.id} value={String(p.id)}>{p.name}</option>
            ))}
          </select>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden md:block">
            Cumulativo — pode aplicar vários
          </span>
        </div>
      )}

      {/* ── Painel de controles ── */}
      <div className="flex flex-col sm:flex-row gap-2">

        {/* Autocomplete */}
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10"
          />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSugg(true)}
            onBlur={() => setTimeout(() => setShowSugg(false), 150)}
            placeholder="Buscar e adicionar exame…  (↑↓ navegar · Enter adicionar)"
            className="w-full h-10 rounded-xl border border-input bg-background pl-9 pr-4 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
          />

          {/* Dropdown de sugestões */}
          {showSugg && (
            <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
              {suggestions.map((exam, i) => (
                <button
                  key={exam.id}
                  type="button"
                  onMouseDown={() => addExam(exam)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors",
                    i === activeIdx
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground",
                    i > 0 && "border-t border-border/40",
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{exam.name}</p>
                    <p className={cn(
                      "text-[11px] truncate",
                      i === activeIdx ? "text-primary-foreground/70" : "text-muted-foreground",
                    )}>
                      {exam.group_category}
                    </p>
                  </div>
                  {exam.unit && (
                    <span className={cn(
                      "text-[11px] tabular-nums ml-3 shrink-0",
                      i === activeIdx ? "text-primary-foreground/70" : "text-muted-foreground",
                    )}>
                      {exam.unit}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Botões de ação rápida */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddAll}
            title="Adicionar todos os exames do catálogo ao pedido"
            className="h-10 px-3 text-xs gap-1.5 whitespace-nowrap"
          >
            <Plus size={13} /> Solicitar Todos
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAIFill}
            title="Em breve: preenchimento automático por IA baseado na anamnese"
            className="h-10 px-3 text-xs gap-1.5 text-violet-600 border-violet-200 hover:bg-violet-50 whitespace-nowrap"
          >
            <Bot size={13} /> Auto IA
          </Button>
          {cart.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="h-10 px-3 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <X size={13} /> Limpar
            </Button>
          )}
        </div>
      </div>

      {/* ── Tabela do pedido (receituário) ── */}
      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3 rounded-xl border border-dashed border-border text-muted-foreground">
          <FlaskConical size={30} className="opacity-20" />
          <div className="text-center">
            <p className="text-sm font-medium">Nenhum exame no pedido.</p>
            <p className="text-xs mt-0.5 opacity-70">
              Busque acima para adicionar — ou escolha um protocolo rápido.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Exame
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden sm:table-cell">
                  Categoria
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden md:table-cell">
                  Referência Lab
                </th>
                <th className="w-10 px-2" />
              </tr>
            </thead>
            <tbody>
              {cart.map((exam, idx) => (
                <tr
                  key={exam.id}
                  className={cn(
                    "border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors",
                    idx % 2 !== 0 && "bg-muted/[0.03]",
                  )}
                >
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-foreground">{exam.name}</p>
                    <p className="text-[11px] text-muted-foreground sm:hidden">{exam.group_category}</p>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">
                    {exam.group_category}
                  </td>
                  <td className="px-4 py-2.5 text-xs tabular-nums text-muted-foreground hidden md:table-cell">
                    {fmtRef(exam)}
                  </td>
                  <td className="px-2 py-2.5">
                    <button
                      type="button"
                      onClick={() => removeExam(exam.id)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 bg-muted/30 border-t border-border/60">
            <span className="text-xs text-muted-foreground">
              {cart.length} exame(s) no pedido
            </span>
          </div>
        </div>
      )}

      {/* ── Observações ── */}
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

      {/* ── Rodapé de ações ── */}
      <div className="flex items-center justify-between pt-1 border-t border-border/40">
        <p className="text-xs text-muted-foreground">
          {cart.length === 0
            ? "Adicione exames à tabela para gerar o pedido."
            : `${cart.length} exame(s) prontos para solicitar.`
          }
        </p>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={saving || cart.length === 0}
            className="gap-1.5"
          >
            {saving
              ? <Loader2 size={13} className="animate-spin" />
              : <FileText size={13} />
            }
            {saving ? "Gerando…" : `Gerar Pedido (${cart.length})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
