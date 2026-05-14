import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, FileText, Loader2, Trash2, FlaskConical, Printer, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  fetchExamProtocols, fetchExamsCatalog, createExamRequest, fetchPatient,
  type ExamCatalogItem, type ExamProtocol,
} from "@/lib/supabase";

interface CartItem {
  exam:  ExamCatalogItem;
  notes: string;
}

interface Props {
  patientId: number;
  onCreated: (requestId: number) => void;
  onCancel:  () => void;
}

function printExamOrder(items: CartItem[], patientName: string) {
  const grouped = items.reduce<Record<string, CartItem[]>>((acc, item) => {
    (acc[item.exam.group_category] ??= []).push(item);
    return acc;
  }, {});

  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const examRows = Object.entries(grouped).map(([category, catItems]) => `
    <div class="category-block">
      <div class="category-title">${category}</div>
      ${catItems.map((item) => `
        <div class="exam-row">
          <span class="exam-name">${item.exam.name}${item.exam.unit ? ` <span class="exam-unit">(${item.exam.unit})</span>` : ""}</span>
          ${item.notes ? `<span class="exam-notes">${item.notes}</span>` : ""}
        </div>
      `).join("")}
    </div>
  `).join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Pedido de Exames — ${patientName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Times New Roman", Times, serif;
    font-size: 12pt;
    color: #111;
    background: #fff;
    padding: 0;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 20mm 22mm 25mm;
    display: flex;
    flex-direction: column;
  }
  .header {
    border-bottom: 2px solid #2c6e4e;
    padding-bottom: 10px;
    margin-bottom: 16px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
  }
  .header-left .clinic-name {
    font-size: 18pt;
    font-weight: bold;
    color: #2c6e4e;
    letter-spacing: 0.5px;
  }
  .header-left .clinic-sub {
    font-size: 9pt;
    color: #555;
    margin-top: 2px;
  }
  .header-right {
    text-align: right;
    font-size: 8.5pt;
    color: #555;
    line-height: 1.5;
  }
  .doc-title {
    text-align: center;
    font-size: 13pt;
    font-weight: bold;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 14px;
    color: #2c6e4e;
    border: 1px solid #c8e6d6;
    padding: 6px;
    border-radius: 4px;
  }
  .patient-box {
    display: flex;
    justify-content: space-between;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 8px 12px;
    margin-bottom: 18px;
    background: #f9fafb;
    font-size: 10.5pt;
  }
  .patient-box .label { color: #666; font-size: 8.5pt; display: block; }
  .patient-box .value { font-weight: bold; color: #111; }
  .exams-section { flex: 1; }
  .section-label {
    font-size: 8.5pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #2c6e4e;
    margin-bottom: 10px;
    border-bottom: 1px dashed #c8e6d6;
    padding-bottom: 4px;
  }
  .category-block { margin-bottom: 14px; }
  .category-title {
    font-size: 9pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #444;
    background: #f0f7f3;
    padding: 3px 8px;
    border-left: 3px solid #2c6e4e;
    margin-bottom: 5px;
  }
  .exam-row {
    padding: 4px 8px 4px 14px;
    border-bottom: 1px dotted #e5e7eb;
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .exam-name { flex: 1; font-size: 10.5pt; }
  .exam-unit { font-size: 9pt; color: #666; font-style: italic; }
  .exam-notes { font-size: 9pt; color: #888; font-style: italic; white-space: nowrap; }
  .footer {
    margin-top: 32px;
    border-top: 1px solid #ddd;
    padding-top: 16px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 24px;
  }
  .signature-block { flex: 1; text-align: center; }
  .signature-line { border-top: 1px solid #333; margin-bottom: 5px; margin-top: 40px; }
  .signature-name { font-size: 10pt; font-weight: bold; }
  .signature-sub { font-size: 8.5pt; color: #555; }
  .stamp-box {
    width: 90px; height: 90px;
    border: 1px solid #ccc;
    border-radius: 4px;
    display: flex; align-items: center; justify-content: center;
    font-size: 8pt; color: #bbb; text-align: center; padding: 6px;
  }
  @media print {
    body { padding: 0; }
    .page { padding: 15mm 18mm 20mm; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">
      <div class="clinic-name">Dr. Fillipe David</div>
      <div class="clinic-sub">Nutricionista Clínico e Esportivo &nbsp;·&nbsp; CRN-5 &nbsp;·&nbsp; Alagoinhas / BA</div>
    </div>
    <div class="header-right">Emitido em: ${today}</div>
  </div>
  <div class="doc-title">Pedido de Exames Laboratoriais</div>
  <div class="patient-box">
    <div>
      <span class="label">Paciente</span>
      <span class="value">${patientName}</span>
    </div>
    <div style="text-align:right">
      <span class="label">Data</span>
      <span class="value">${today}</span>
    </div>
  </div>
  <div class="exams-section">
    <div class="section-label">Exames Solicitados (${items.length})</div>
    ${examRows}
  </div>
  <div class="footer">
    <div class="signature-block">
      <div class="signature-line"></div>
      <div class="signature-name">Dr. Fillipe David</div>
      <div class="signature-sub">Nutricionista · CRN-5</div>
    </div>
    <div class="stamp-box">Carimbo</div>
  </div>
</div>
<script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) { toast.error("Permita popups para gerar o PDF."); return; }
  win.document.write(html);
  win.document.close();
}

export function ExamRequestScreen({ patientId, onCreated, onCancel }: Props) {
  const [protocols,    setProtocols]    = useState<ExamProtocol[]>([]);
  const [catalog,      setCatalog]      = useState<ExamCatalogItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [cart,         setCart]         = useState<CartItem[]>([]);
  const [patientName,  setPatientName]  = useState<string>("Paciente");
  const [search,       setSearch]       = useState("");
  const [dropOpen,     setDropOpen]     = useState(false);
  const [focusIdx,     setFocusIdx]     = useState(-1);
  const [globalNotes,  setGlobalNotes]  = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const dropRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetchExamProtocols(),
      fetchExamsCatalog(),
      fetchPatient(patientId),
    ]).then(([protos, cat, patient]) => {
      setProtocols(protos);
      setCatalog(cat);
      if (patient?.name) setPatientName(patient.name);
      setLoading(false);
    });
  }, [patientId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const cartIds = new Set(cart.map((c) => c.exam.id));

  const addExam = useCallback((exam: ExamCatalogItem) => {
    if (cartIds.has(exam.id)) return;
    setCart((prev) => [...prev, { exam, notes: "" }]);
    setSearch("");
    setDropOpen(false);
    setFocusIdx(-1);
  }, [cartIds]);

  const removeExam = (examId: number) => {
    setCart((prev) => prev.filter((c) => c.exam.id !== examId));
  };

  const updateNotes = (examId: number, notes: string) => {
    setCart((prev) => prev.map((c) => c.exam.id === examId ? { ...c, notes } : c));
  };

  const addProtocol = (protocolId: number) => {
    const proto = protocols.find((p) => p.id === protocolId);
    if (!proto) return;
    const toAdd = (proto.exams ?? []).filter((e) => !cartIds.has(e.id));
    if (toAdd.length === 0) { toast.info(`Todos os exames de "${proto.name}" já estão no pedido.`); return; }
    setCart((prev) => [...prev, ...toAdd.map((e) => ({ exam: e, notes: "" }))]);
    toast.success(`${toAdd.length} exame(s) de "${proto.name}" adicionado(s).`);
  };

  const searchResults = search.length > 0
    ? catalog.filter(
        (e) => !cartIds.has(e.id) &&
          (e.name.toLowerCase().includes(search.toLowerCase()) ||
           e.group_category.toLowerCase().includes(search.toLowerCase()))
      ).slice(0, 8)
    : [];

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropOpen || searchResults.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusIdx((i) => Math.min(i + 1, searchResults.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setFocusIdx((i) => Math.max(i - 1, -1)); }
    if (e.key === "Enter" && focusIdx >= 0) { e.preventDefault(); addExam(searchResults[focusIdx]); }
    if (e.key === "Escape") { setDropOpen(false); setSearch(""); }
  };

  const cartGrouped = cart.reduce<Record<string, CartItem[]>>((acc, item) => {
    (acc[item.exam.group_category] ??= []).push(item);
    return acc;
  }, {});

  const handleSave = async () => {
    if (cart.length === 0) { toast.error("Adicione pelo menos um exame ao pedido."); return; }
    setSaving(true);
    const examIds = cart.map((c) => c.exam.id);
    const requestId = await createExamRequest(patientId, undefined, examIds, globalNotes);
    setSaving(false);
    if (!requestId) { toast.error("Erro ao salvar o pedido. Tente novamente."); return; }
    toast.success(`Pedido salvo com ${cart.length} exame(s).`);
    onCreated(requestId);
  };

  const handlePrint = () => {
    if (cart.length === 0) { toast.error("Adicione pelo menos um exame para imprimir."); return; }
    printExamOrder(cart, patientName);
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

      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Adicionar protocolo
        </Label>
        <div className="flex flex-wrap gap-2">
          {protocols.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => addProtocol(p.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <Plus size={11} />
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Adicionar exame individual
        </Label>
        <div className="relative" ref={dropRef}>
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
          <Input
            ref={searchRef}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setDropOpen(true); setFocusIdx(-1); }}
            onFocus={() => { if (search) setDropOpen(true); }}
            onKeyDown={handleSearchKey}
            placeholder="Buscar exame pelo nome ou categoria…"
            className="pl-7 h-9 text-sm"
          />
          {dropOpen && searchResults.length > 0 && (
            <div className="absolute z-50 mt-1 w-full bg-background border border-border rounded-lg shadow-lg overflow-hidden">
              {searchResults.map((exam, i) => (
                <button
                  key={exam.id}
                  type="button"
                  onMouseEnter={() => setFocusIdx(i)}
                  onClick={() => addExam(exam)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-left text-sm transition-colors",
                    focusIdx === i ? "bg-primary/8 text-foreground" : "hover:bg-muted/60 text-foreground"
                  )}
                >
                  <span className="font-medium">{exam.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-2 shrink-0">{exam.group_category}</span>
                </button>
              ))}
            </div>
          )}
          {dropOpen && search.length > 0 && searchResults.length === 0 && (
            <div className="absolute z-50 mt-1 w-full bg-background border border-border rounded-lg shadow-lg px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Nenhum exame encontrado para "{search}".</p>
            </div>
          )}
        </div>
      </div>

      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 rounded-lg border-2 border-dashed border-border/50 text-muted-foreground">
          <FlaskConical size={24} className="mb-2 opacity-30" />
          <p className="text-xs">Nenhum exame adicionado.</p>
          <p className="text-[11px] mt-0.5">Use um protocolo ou busque exames acima.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border/40">
                <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Exame
                </th>
                <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-52">
                  Instruções / Observações
                </th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {Object.entries(cartGrouped).map(([category, items]) => (
                <>
                  <tr key={`cat-${category}`} className="bg-muted/10 border-b border-border/20">
                    <td colSpan={3} className="px-3 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <FlaskConical size={10} className="text-muted-foreground" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          {category}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {items.map((item) => (
                    <tr key={item.exam.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                      <td className="px-3 py-2">
                        <p className="font-medium text-foreground">{item.exam.name}</p>
                        {item.exam.unit && (
                          <p className="text-[10px] text-muted-foreground">{item.exam.unit}</p>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          value={item.notes}
                          onChange={(e) => updateNotes(item.exam.id, e.target.value)}
                          placeholder="Ex: jejum 12h"
                          className="h-7 text-xs border-border/40 bg-transparent focus:bg-background"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeExam(item.exam.id)}
                          className="text-muted-foreground/40 hover:text-destructive transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-1.5 bg-muted/10 border-t border-border/30">
            <span className="text-[11px] text-muted-foreground">
              {cart.length} exame(s) no pedido
            </span>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Observações gerais (opcional)
        </Label>
        <Input
          value={globalNotes}
          onChange={(e) => setGlobalNotes(e.target.value)}
          placeholder="Ex: não usar biotina 48h antes, informar uso de medicamentos…"
          className="text-sm"
        />
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-border/40">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={cart.length === 0}
            className="gap-1.5"
          >
            <Printer size={13} />
            Imprimir PDF
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || cart.length === 0}
            className="gap-1.5"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
            {saving ? "Salvando…" : `Salvar Pedido (${cart.length})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
