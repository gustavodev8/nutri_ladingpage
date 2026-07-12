import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, Trash2, Printer, Save, Loader2, Search, FlaskConical,
  ChevronDown, FileText, Beaker, History, ChevronRight, Pencil, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  fetchSubstrates, fetchReadyFormulas, savePrescription, fetchPatient,
  fetchPrescriptions, deletePrescription, insertSubstrate, insertReadyFormula,
  type Substrate, type ReadyFormula, type SavedPrescription,
} from "@/lib/supabase";

// â”€â”€â”€ Local types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface BlockItem {
  substrateId?: number;
  name:         string;
  dose:         number;
  unit:         string;
}

interface PrescriptionBlock {
  localId:            string;
  label:              string;
  pharmaceuticalForm: string;
  posology:           string;
  items:              BlockItem[];
}

interface Props {
  patientId: number;
}

// â”€â”€â”€ Pharmaceutical form options â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PHARMA_FORMS = ["Cápsulas", "Sachê", "Solução oral", "Comprimidos", "Creme", "Gel"];

// â”€â”€â”€ PDF generator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function loadImageDataUrl(src: string): Promise<string> {
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Falha ao carregar imagem: ${src}`);
  }

  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Falha ao ler imagem: ${src}`));
    reader.readAsDataURL(blob);
  });
}

async function printPrescription(blocks: PrescriptionBlock[], patientName: string) {
  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  let signatureDataUrl = "";
  try {
    signatureDataUrl = await loadImageDataUrl("/assinatura.png");
  } catch (error) {
    console.warn("[PrescriptionBuilder] Assinatura não carregou:", error);
  }

  const blockRows = blocks
    .filter((b) => b.items.length > 0)
    .map((block) => `
      <div class="formula-block">
        <div class="formula-header">
          <span class="formula-label">${block.label}</span>
          <span class="formula-form">${block.pharmaceuticalForm}</span>
        </div>
        <div class="formula-items">
          ${block.items.map((item) => `
            <div class="item-row">
              <span class="item-name">${item.name}</span>
              <span class="item-dose">${item.dose} ${item.unit}</span>
            </div>
          `).join("")}
        </div>
        ${block.posology ? `<div class="posology"><strong>Posologia:</strong> ${block.posology}</div>` : ""}
      </div>
    `).join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Receituário Magistral — ${patientName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Times New Roman", Times, serif; font-size: 12pt; color: #111; background: #fff; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 18mm 22mm 24mm; display: flex; flex-direction: column; }
  .header { border-bottom: 2px solid #2c6e4e; padding-bottom: 10px; margin-bottom: 16px; display: flex; align-items: flex-end; justify-content: space-between; }
  .clinic-name { font-size: 18pt; font-weight: bold; color: #2c6e4e; }
  .clinic-sub { font-size: 9pt; color: #555; margin-top: 2px; }
  .header-right { text-align: right; font-size: 8.5pt; color: #555; line-height: 1.5; }
  .doc-title { text-align: center; font-size: 13pt; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 14px; color: #2c6e4e; border: 1px solid #c8e6d6; padding: 6px; border-radius: 4px; }
  .patient-box { display: flex; justify-content: space-between; border: 1px solid #ddd; border-radius: 4px; padding: 8px 12px; margin-bottom: 18px; background: #f9fafb; font-size: 10.5pt; }
  .patient-box .label { color: #666; font-size: 8.5pt; display: block; }
  .patient-box .value { font-weight: bold; color: #111; }
  .formulas { flex: 1; }
  .formula-block { margin-bottom: 18px; border: 1px solid #e0ede8; border-radius: 6px; overflow: hidden; }
  .formula-header { display: flex; align-items: center; justify-content: space-between; background: #eef7f2; padding: 6px 12px; border-bottom: 1px solid #c8e6d6; }
  .formula-label { font-size: 10pt; font-weight: bold; color: #2c6e4e; text-transform: uppercase; letter-spacing: 0.5px; }
  .formula-form { font-size: 8.5pt; color: #555; font-style: italic; }
  .formula-items { padding: 6px 12px; }
  .item-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dotted #e5e7eb; font-size: 10.5pt; }
  .item-row:last-child { border-bottom: none; }
  .item-name { flex: 1; }
  .item-dose { font-weight: bold; color: #2c6e4e; white-space: nowrap; margin-left: 16px; }
  .posology { padding: 5px 12px 7px; background: #f5fbf7; font-size: 9.5pt; color: #444; border-top: 1px solid #e0ede8; }
  .footer { margin-top: auto; border-top: 1px solid #ddd; padding-top: 18px; display: flex; justify-content: center; align-items: flex-end; }
  .signature-block { width: 78mm; text-align: center; }
  .signature-image-wrap { display: flex; justify-content: center; align-items: flex-end; height: 24mm; margin-bottom: 2px; }
  .signature-image { max-width: 54mm; max-height: 22mm; object-fit: contain; display: block; }
  .signature-line { border-top: 1px solid #333; margin: 0 auto 5px; width: 100%; }
  .signature-name { font-size: 10pt; font-weight: bold; }
  .signature-sub { font-size: 8.5pt; color: #555; }
  @media print { body { padding: 0; } .page { padding: 14mm 18mm 18mm; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="clinic-name">Dr. Fillipe David</div>
      <div class="clinic-sub">Nutricionista Clínico e Esportivo &nbsp;·&nbsp; CRN-5 &nbsp;·&nbsp; Alagoinhas / BA</div>
    </div>
    <div class="header-right">Emitido em: ${today}</div>
  </div>
  <div class="doc-title">Receituário Magistral</div>
  <div class="patient-box">
    <div><span class="label">Paciente</span><span class="value">${patientName}</span></div>
    <div style="text-align:right"><span class="label">Data</span><span class="value">${today}</span></div>
  </div>
  <div class="formulas">${blockRows}</div>
  <div class="footer">
    <div class="signature-block">
      ${signatureDataUrl ? `<div class="signature-image-wrap"><img class="signature-image" src="${signatureDataUrl}" alt="Assinatura"></div>` : ""}
      <div class="signature-line"></div>
      <div class="signature-name">Dr. Fillipe David</div>
      <div class="signature-sub">Nutricionista · CRN-5</div>
    </div>
  </div>
</div>
<script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) { toast.error("Permita popups para gerar o receituário."); return; }
  win.document.write(html);
  win.document.close();
}

// â”€â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function PrescriptionBuilder({ patientId }: Props) {
  const [substrates,   setSubstrates]   = useState<Substrate[]>([]);
  const [formulas,     setFormulas]     = useState<ReadyFormula[]>([]);
  const [history,      setHistory]      = useState<SavedPrescription[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [patientName,  setPatientName]  = useState("Paciente");
  const [view,         setView]         = useState<"builder" | "history">("builder");
  const [leftTab,      setLeftTab]      = useState<"formulas" | "substrates">("formulas");
  const [objective,    setObjective]    = useState("Todos");
  const [subSearch,    setSubSearch]    = useState("");
  const [blocks,       setBlocks]       = useState<PrescriptionBlock[]>([]);
  const [objOpen,      setObjOpen]      = useState(false);
  const [expandedId,   setExpandedId]   = useState<number | null>(null);
  const objRef = useRef<HTMLDivElement>(null);

  const [editingPrescriptionId, setEditingPrescriptionId] = useState<number | undefined>(undefined);
  
  // Registering substrate state
  const [showNewSubForm, setShowNewSubForm] = useState(false);
  const [protocolSubFormSeed, setProtocolSubFormSeed] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState("");
  const [newSubCategory, setNewSubCategory] = useState("Outros");
  const [newSubUnit, setNewSubUnit] = useState("mg");
  const [newSubIdealDose, setNewSubIdealDose] = useState("");
  const [registeringSub, setRegisteringSub] = useState(false);

  const [creatingProtocol, setCreatingProtocol] = useState(false);
  const [protocolDraft, setProtocolDraft] = useState<BlockItem[]>([]);
  const [protocolName, setProtocolName] = useState("");
  const [protocolObjective, setProtocolObjective] = useState("Geral");
  const [protocolPharmaForm, setProtocolPharmaForm] = useState(PHARMA_FORMS[0]);
  const [protocolPosology, setProtocolPosology] = useState("");
  const [protocolSubSearch, setProtocolSubSearch] = useState("");
  const [savingProtocol, setSavingProtocol] = useState(false);

  // Custom inline item input state
  const [customItemInputs, setCustomItemInputs] = useState<Record<string, { name: string; dose: string; unit: string }>>({});

  const loadHistory = useCallback(async () => {
    const data = await fetchPrescriptions(patientId);
    setHistory(data);
  }, [patientId]);

  useEffect(() => {
    Promise.all([fetchSubstrates(), fetchReadyFormulas(), fetchPatient(patientId), fetchPrescriptions(patientId)])
      .then(([subs, fmls, patient, hist]) => {
        setSubstrates(subs);
        setFormulas(fmls);
        if (patient?.name) setPatientName(patient.name);
        setHistory(hist);
        setLoading(false);
      });
  }, [patientId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (objRef.current && !objRef.current.contains(e.target as Node)) setObjOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const nextLabel = () => `Fórmula ${blocks.length + 1}`;

  const addBlock = (): PrescriptionBlock => ({
    localId:            crypto.randomUUID(),
    label:              nextLabel(),
    pharmaceuticalForm: "Cápsulas",
    posology:           "",
    items:              [],
  });

  // Add entire ready formula as a new block
  const addFormula = (formula: ReadyFormula) => {
    const items: BlockItem[] = (formula.items ?? []).map((fi) => ({
      substrateId: fi.substrate_id,
      name:        fi.name ?? fi.substrate_name ?? fi.substrate?.name ?? "",
      dose:        fi.applied_dose,
      unit:        fi.unit,
    }));
    const block: PrescriptionBlock = {
      localId:            crypto.randomUUID(),
      label:              nextLabel(),
      pharmaceuticalForm: formula.pharmaceutical_form,
      posology:           formula.posology ?? "",
      items,
    };
    setBlocks((prev) => [...prev, block]);
    toast.success(`"${formula.name}" adicionada ao receituário.`);
  };

  // Add a single substrate to an existing block (or create a new one)
  const addSubstrate = (sub: Substrate, blockLocalId?: string) => {
    const item: BlockItem = {
      substrateId: sub.id,
      name:        sub.name,
      dose:        sub.ideal_dose ?? sub.min_dose ?? 0,
      unit:        sub.unit,
    };
    if (blockLocalId) {
      setBlocks((prev) => prev.map((b) =>
        b.localId === blockLocalId
          ? { ...b, items: [...b.items, item] }
          : b
      ));
    } else {
      const block = addBlock();
      block.items = [item];
      setBlocks((prev) => [...prev, block]);
    }
  };

  const removeBlock = (localId: string) =>
    setBlocks((prev) => prev.filter((b) => b.localId !== localId));

  const removeItem = (blockId: string, idx: number) =>
    setBlocks((prev) => prev.map((b) =>
      b.localId === blockId
        ? { ...b, items: b.items.filter((_, i) => i !== idx) }
        : b
    ));

  const patchBlock = (localId: string, patch: Partial<PrescriptionBlock>) =>
    setBlocks((prev) => prev.map((b) => b.localId === localId ? { ...b, ...patch } : b));

  const patchItem = (blockId: string, idx: number, patch: Partial<BlockItem>) =>
    setBlocks((prev) => prev.map((b) =>
      b.localId === blockId
        ? { ...b, items: b.items.map((item, i) => i === idx ? { ...item, ...patch } : item) }
        : b
    ));

  const handleAddEmptyBlock = () => {
    setBlocks((prev) => [...prev, addBlock()]);
  };

  const startProtocolMode = () => {
    setCreatingProtocol(true);
    setProtocolDraft([]);
    setProtocolName("");
    setProtocolObjective("Geral");
    setProtocolPharmaForm(PHARMA_FORMS[0]);
    setProtocolPosology("");
    setProtocolSubSearch("");
  };

  const addSubstrateToProtocol = (sub: Substrate) => {
    const exists = protocolDraft.some((item) => item.substrateId === sub.id);
    if (exists) {
      toast.info("Esse substrato já está no protocolo.");
      return;
    }

    setProtocolDraft((prev) => [
      ...prev,
      {
        substrateId: sub.id,
        name: sub.name,
        dose: sub.ideal_dose ?? sub.min_dose ?? 0,
        unit: sub.unit,
      },
    ]);
  };

  const removeProtocolItem = (substrateId?: number) => {
    setProtocolDraft((prev) => prev.filter((item) => item.substrateId !== substrateId));
  };

  const patchProtocolItem = (substrateId: number | undefined, patch: Partial<BlockItem>) => {
    setProtocolDraft((prev) => prev.map((item) =>
      item.substrateId === substrateId ? { ...item, ...patch } : item
    ));
  };

  const cancelProtocolMode = () => {
    setCreatingProtocol(false);
    setProtocolDraft([]);
    setProtocolName("");
    setProtocolObjective("Geral");
    setProtocolPharmaForm(PHARMA_FORMS[0]);
    setProtocolPosology("");
    setProtocolSubSearch("");
  };

  const saveBlockAsProtocol = (block: PrescriptionBlock) => {
    setCreatingProtocol(true);
    setView("builder");
    setProtocolDraft(block.items.map((item) => ({ ...item })));
    setProtocolName(block.label.trim() || "Novo protocolo");
    setProtocolObjective("Geral");
    setProtocolPharmaForm(block.pharmaceuticalForm);
    setProtocolPosology(block.posology);
    setProtocolSubSearch("");
    toast.success("Fórmula enviada para o modo protocolo.");
  };

  const handleSaveProtocol = async () => {
    if (!protocolName.trim()) {
      toast.error("Digite o nome do protocolo.");
      return;
    }

    if (protocolDraft.length === 0) {
      toast.error("Adicione pelo menos um substrato ao protocolo.");
      return;
    }

    setSavingProtocol(true);
    const ok = await insertReadyFormula({
      name: protocolName.trim(),
      objective: protocolObjective.trim() || "Geral",
      posology: protocolPosology.trim() || null,
      pharmaceuticalForm: protocolPharmaForm,
      items: protocolDraft.map((item) => ({
        substrateId: item.substrateId ?? null,
        name: item.name,
        appliedDose: item.dose,
        unit: item.unit,
      })),
    });
    setSavingProtocol(false);

    if (!ok) {
      toast.error("Não foi possível salvar o protocolo.");
      return;
    }

    const refreshed = await fetchReadyFormulas();
    setFormulas(refreshed);
    cancelProtocolMode();
    toast.success("Protocolo salvo com sucesso.");
  };

  const handleCancelEdit = () => {
    setEditingPrescriptionId(undefined);
    setBlocks([]);
    toast.info("Edi??o cancelada.");
  };

  const handleEditPrescription = (p: SavedPrescription) => {
    setEditingPrescriptionId(p.id);
    const mappedBlocks: PrescriptionBlock[] = p.blocks.map((b) => ({
      localId:            crypto.randomUUID(),
      label:              b.label,
      pharmaceuticalForm: b.pharmaceutical_form,
      posology:           b.posology ?? "",
      items:              b.items.map((i) => ({
        substrateId: i.substrate_id ?? undefined,
        name:        i.name,
        dose:        i.dose,
        unit:        i.unit,
      })),
    }));
    setBlocks(mappedBlocks);
    setView("builder");
    toast.info(`Editando Prescrição #${p.id}.`);
  };

  const handleRegisterSubstrate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) { toast.error("Digite o nome do ativo."); return; }

    setRegisteringSub(true);
    const added = await insertSubstrate({
      name:         newSubName.trim(),
      category:     newSubCategory,
      unit:         newSubUnit,
      ideal_dose:   newSubIdealDose ? parseFloat(newSubIdealDose) : null,
    });
    setRegisteringSub(false);

    if (added) {
      toast.success("Ativo cadastrado com sucesso!");
      setSubstrates((prev) => [...prev, added].sort((a, b) => a.name.localeCompare(b.name)));
      setNewSubName("");
      setNewSubIdealDose("");
      setShowNewSubForm(false);
      setProtocolSubFormSeed(null);
    } else {
      toast.error("Erro ao cadastrar ativo no banco.");
    }
  };

  const handleAddCustomItem = (blockLocalId: string) => {
    const input = customItemInputs[blockLocalId];
    if (!input?.name?.trim()) { toast.error("Digite o nome do ativo."); return; }
    const doseVal = parseFloat(input.dose) || 0;

    const newItem: BlockItem = {
      name: input.name.trim(),
      dose: doseVal,
      unit: input.unit || "mg",
    };

    setBlocks((prev) => prev.map((b) =>
      b.localId === blockLocalId
        ? { ...b, items: [...b.items, newItem] }
        : b
    ));

    // Clear input
    setCustomItemInputs((prev) => ({
      ...prev,
      [blockLocalId]: { name: "", dose: "", unit: "mg" }
    }));
  };

  const handleSave = async () => {
    const filled = blocks.filter((b) => b.items.length > 0);
    if (filled.length === 0) { toast.error("Adicione pelo menos um ativo ao receituário."); return; }
    setSaving(true);
    const ok = await savePrescription(patientId, filled.map((b) => ({
      label:              b.label,
      pharmaceuticalForm: b.pharmaceuticalForm,
      posology:           b.posology,
      items:              b.items.map((it) => ({
        substrateId: it.substrateId,
        name:        it.name,
        dose:        it.dose,
        unit:        it.unit,
      })),
    })), editingPrescriptionId);
    setSaving(false);
    if (!ok) { toast.error("Erro ao salvar a prescri??o."); return; }
    toast.success(editingPrescriptionId ? "Prescrição atualizada com sucesso." : "Prescrição salva com sucesso.");
    setBlocks([]);
    setEditingPrescriptionId(undefined);
    await loadHistory();
    setView("history");
  };

  const handleDeletePrescription = async (id: number) => {
    if (!confirm("Excluir esta prescri??o?")) return;
    if (await deletePrescription(id)) {
      toast.success("Prescrição excluída.");
      setHistory((prev) => prev.filter((p) => p.id !== id));
      if (editingPrescriptionId === id) {
        setEditingPrescriptionId(undefined);
        setBlocks([]);
      }
    } else {
      toast.error("Erro ao excluir.");
    }
  };

  const printSaved = async (p: SavedPrescription) => {
    const blocks: PrescriptionBlock[] = p.blocks.map((b) => ({
      localId:            String(b.id),
      label:              b.label,
      pharmaceuticalForm: b.pharmaceutical_form,
      posology:           b.posology ?? "",
      items:              b.items.map((i) => ({ name: i.name, dose: i.dose, unit: i.unit })),
    }));
    await printPrescription(blocks, patientName);
  };

  const handlePrint = async () => {
    const filled = blocks.filter((b) => b.items.length > 0);
    if (filled.length === 0) { toast.error("Adicione pelo menos um ativo para imprimir."); return; }
    await printPrescription(filled, patientName);
  };

  // Filtered data
  const objectives = ["Todos", ...Array.from(new Set(formulas.map((f) => f.objective)))];
  const visibleFormulas = objective === "Todos"
    ? formulas
    : formulas.filter((f) => f.objective === objective);

  const categories = Array.from(new Set(substrates.map((s) => s.category)));
  const visibleSubs = subSearch.length > 0
    ? substrates.filter((s) =>
        s.name.toLowerCase().includes(subSearch.toLowerCase()) ||
        s.category.toLowerCase().includes(subSearch.toLowerCase())
      )
    : substrates;
  const groupedSubs = visibleSubs.reduce<Record<string, Substrate[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});
  const protocolVisibleSubs = substrates.filter((sub) =>
    sub.name.toLowerCase().includes(protocolSubSearch.toLowerCase()) ||
    sub.category.toLowerCase().includes(protocolSubSearch.toLowerCase())
  );
  const protocolGroupedSubs = protocolVisibleSubs.reduce<Record<string, Substrate[]>>((acc, sub) => {
    (acc[sub.category] ??= []).push(sub);
    return acc;
  }, {});

  const totalItems = blocks.reduce((n, b) => n + b.items.length, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-primary" size={22} />
      </div>
    );
  }

  // â”€â”€ History view â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (view === "history") {
    const fmtDate = (iso: string) =>
      new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Histórico de Prescrições</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{patientName} · {history.length} prescrição(ões)</p>
          </div>
          <Button size="sm" onClick={() => setView("builder")} className="gap-1.5">
            <Plus size={13} /> Nova Prescrição
          </Button>
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2 border-2 border-dashed border-border/50 rounded-xl text-muted-foreground">
            <History size={28} className="opacity-20" />
            <p className="text-sm">Nenhuma prescrição salva ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((p) => (
              <div key={p.id} className="border border-border/70 rounded-xl overflow-hidden bg-card">
                <div
                  className="flex items-center gap-3 px-4 py-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                >
                  <FileText size={14} className="text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      Prescrição #{p.id}
                      <span className="text-muted-foreground font-normal text-xs ml-2">· {fmtDate(p.created_at)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.blocks.length} bloco(s) · {p.blocks.reduce((n, b) => n + b.items.length, 0)} ativo(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleEditPrescription(p); }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded border border-border/50 hover:border-primary/30"
                      title="Editar esta prescrição"
                    >
                      <Pencil size={11} /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); void printSaved(p); }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded border border-border/50 hover:border-primary/30"
                    >
                      <Printer size={11} /> PDF
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeletePrescription(p.id); }}
                      className="text-muted-foreground/30 hover:text-destructive transition-colors p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                    <ChevronRight size={14} className={cn("text-muted-foreground transition-transform", expandedId === p.id && "rotate-90")} />
                  </div>
                </div>
                {expandedId === p.id && (
                  <div className="p-4 space-y-3">
                    {p.blocks.map((b) => (
                      <div key={b.id} className="rounded-lg border border-border/50 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 bg-muted/20 border-b border-border/30">
                          <span className="text-xs font-bold text-foreground">{b.label}</span>
                          <span className="text-[10px] text-muted-foreground">{b.pharmaceutical_form}{b.posology ? ` · ${b.posology}` : ""}</span>
                        </div>
                        <div className="divide-y divide-border/20">
                          {b.items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between px-3 py-1.5">
                              <span className="text-xs text-foreground">{item.name}</span>
                              <span className="text-xs font-semibold text-primary tabular-nums">{item.dose} {item.unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (creatingProtocol) {
    return (
      <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm p-3 md:p-6 overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col overflow-hidden rounded-[28px] border border-border/60 bg-background shadow-2xl">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4 bg-gradient-to-r from-background to-muted/20">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-primary">Modo protocolo</p>
              <h2 className="text-xl font-semibold text-foreground">Criar novo protocolo magistral</h2>
              <p className="text-sm text-muted-foreground">Escolha substratos cadastrados com espaço amplo e leitura limpa.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveProtocol}
                disabled={savingProtocol || protocolDraft.length === 0 || !protocolName.trim()}
                className="h-9 text-sm gap-1.5"
              >
                {savingProtocol ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Salvar protocolo
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={cancelProtocolMode}
                className="h-9 text-sm text-muted-foreground"
              >
                Cancelar
              </Button>
            </div>
          </div>

          <div className="grid flex-1 min-h-0 gap-0 xl:grid-cols-[420px_minmax(0,1fr)]">
            <div className="border-r border-border/60 bg-muted/20 p-5 space-y-4 min-h-0 overflow-y-auto">
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Identificação</p>
                <Input
                  value={protocolName}
                  onChange={(e) => setProtocolName(e.target.value)}
                  placeholder="Nome do protocolo"
                  className="h-10 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  value={protocolObjective}
                  onChange={(e) => setProtocolObjective(e.target.value)}
                  placeholder="Objetivo"
                  className="h-10 text-sm"
                />
                <select
                  value={protocolPharmaForm}
                  onChange={(e) => setProtocolPharmaForm(e.target.value)}
                  className="h-10 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground"
                >
                  {PHARMA_FORMS.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>

              <Textarea
                value={protocolPosology}
                onChange={(e) => setProtocolPosology(e.target.value)}
                placeholder="Posologia (opcional)"
                className="min-h-24 text-sm resize-none"
              />

              <div className="rounded-2xl border border-border/60 bg-background p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Selecionados</p>
                    <p className="text-xs text-muted-foreground">Itens que vão compor o protocolo.</p>
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">{protocolDraft.length}</span>
                </div>

                {protocolDraft.length > 0 ? (
                  <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
                    {protocolDraft.map((item) => (
                      <div key={item.substrateId ?? item.name} className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5">
                        <span className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">{item.name}</span>
                        <Input
                          type="number"
                          step="any"
                          value={item.dose}
                          onChange={(e) => patchProtocolItem(item.substrateId, { dose: parseFloat(e.target.value) || 0 })}
                          className="h-8 w-24 text-sm text-right tabular-nums"
                        />
                        <span className="w-10 text-sm text-muted-foreground">{item.unit}</span>
                        <button
                          type="button"
                          onClick={() => removeProtocolItem(item.substrateId)}
                          className="rounded-md p-1 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-5 text-center">
                    <p className="text-sm text-muted-foreground">Nenhum substrato selecionado ainda.</p>
                    <p className="text-xs text-muted-foreground/80 mt-1">Escolha itens na coluna ao lado para montar o protocolo.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex min-h-0 flex-col bg-background">
              <div className="border-b border-border/60 px-5 py-4 bg-muted/10">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Substratos cadastrados</p>
                    <p className="text-xs text-muted-foreground">Toque em adicionar para incluir no protocolo.</p>
                  </div>
                  <div className="relative w-full xl:max-w-md">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={protocolSubSearch}
                      onChange={(e) => {
                        setProtocolSubSearch(e.target.value);
                        setProtocolSubFormSeed(null);
                      }}
                      placeholder="Buscar substrato"
                      className="pl-9 h-10 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-5">
                <div className="space-y-4">
                  {Object.entries(protocolGroupedSubs).map(([cat, subs]) => (
                    <div key={cat}>
                      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">{cat}</p>
                      <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
                        {subs.map((sub) => {
                          const selected = protocolDraft.some((item) => item.substrateId === sub.id);
                          return (
                            <div key={sub.id} className="rounded-2xl border border-border/60 bg-background p-4 shadow-sm hover:border-primary/30 transition-colors">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground truncate">{sub.name}</p>
                                  <p className="text-[11px] text-muted-foreground mt-1">
                                    Dose ideal: {sub.ideal_dose ?? "-"} {sub.unit}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant={selected ? "secondary" : "outline"}
                                  size="sm"
                                  onClick={() => addSubstrateToProtocol(sub)}
                                  className="h-8 shrink-0 gap-1.5 text-xs"
                                  disabled={selected}
                                >
                                  <Plus size={12} />
                                  {selected ? "Adicionado" : "Adicionar"}
                                </Button>
                              </div>
                              {sub.purpose && (
                                <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{sub.purpose}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {protocolVisibleSubs.length === 0 && (
                    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-gradient-to-b from-muted/10 to-background/60 px-6 py-8 text-center">
                      {protocolSubFormSeed === null ? (
                        <div className="w-full max-w-xl rounded-3xl border border-border/60 bg-background/95 text-left shadow-sm overflow-hidden">
                          <div className="border-b border-border/50 bg-muted/30 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Novo ativo no catálogo</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                            Você pode cadastrar esse ativo no sistema e depois voltar para incluir no protocolo.
                            </p>
                          </div>
                          <div className="px-4 py-4">
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/10 px-4 py-10 text-center">
                              <p className="text-sm font-medium text-foreground">Nenhum substrato encontrado.</p>
                              <p className="mt-1 text-xs text-muted-foreground/80">
                                A busca por <span className="font-semibold text-foreground">"{protocolSubSearch.trim()}"</span> não retornou resultados.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  const seed = protocolSubSearch.trim();
                                  setProtocolSubFormSeed(seed);
                                  setNewSubName(seed);
                                  setNewSubCategory("Outros");
                                  setNewSubUnit("mg");
                                  setNewSubIdealDose("");
                                }}
                                className="mt-4 inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-primary/20 bg-background px-3 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-primary/5"
                              >
                                <Plus size={12} />
                                Cadastrar substrato no sistema
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <form
                          onSubmit={handleRegisterSubstrate}
                          className="mt-2 w-full max-w-xl overflow-hidden rounded-3xl border border-border/60 bg-background text-left shadow-sm"
                        >
                          <div className="border-b border-border/50 bg-muted/25 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Novo ativo no catálogo</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Cadastre o substrato abaixo para voltar e adicioná-lo ao protocolo.
                            </p>
                          </div>
                          <div className="p-4">
                            <div className="space-y-2.5">
                              <Input
                                placeholder="Nome do ativo"
                                value={newSubName}
                                onChange={(e) => setNewSubName(e.target.value)}
                                className="h-9 text-sm"
                                required
                              />
                              <div className="grid gap-2 md:grid-cols-[1.3fr_0.8fr]">
                                <select
                                  value={newSubCategory}
                                  onChange={(e) => setNewSubCategory(e.target.value)}
                                  className="h-9 rounded-lg border border-border/60 bg-background px-2 text-sm text-foreground"
                                >
                                  {["Adaptógeno", "Termogênico", "Fitoterápico", "Vitamina", "Mineral", "Aminoácido", "Lipídio", "Probiótico", "Antioxidante", "Hormonal", "Outros"].map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                                <select
                                  value={newSubUnit}
                                  onChange={(e) => setNewSubUnit(e.target.value)}
                                  className="h-9 rounded-lg border border-border/60 bg-background px-2 text-sm text-foreground"
                                >
                                  {["mg", "mcg", "g", "UI", "ml", "gotas", "UFC"].map((u) => (
                                    <option key={u} value={u}>{u}</option>
                                  ))}
                                </select>
                              </div>
                              <Input
                                type="number"
                                step="any"
                                placeholder="Dose sugerida (opcional)"
                                value={newSubIdealDose}
                                onChange={(e) => setNewSubIdealDose(e.target.value)}
                                className="h-9 text-sm"
                              />
                            </div>

                            <div className="mt-4 flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setProtocolSubFormSeed(null)}
                                className="h-9 text-sm px-3"
                              >
                                Cancelar
                              </Button>
                              <Button
                                type="submit"
                                size="sm"
                                disabled={registeringSub}
                                className="h-9 text-sm px-3"
                              >
                                {registeringSub ? "Salvando..." : "Cadastrar"}
                              </Button>
                            </div>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-0 h-[calc(100vh-220px)] min-h-[500px] rounded-xl border border-border/60 overflow-hidden">

      {/* â•â• LEFT PANEL â€” Catalog â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="w-[56%] xl:w-[58%] shrink-0 flex flex-col border-r border-border/60 bg-muted/10">

        {/* Tab bar */}
        <div className="flex border-b border-border/60 shrink-0">
          {(["formulas", "substrates"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setLeftTab(tab)}
              className={cn(
                "flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2",
                leftTab === tab
                  ? "border-primary text-primary bg-background"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === "formulas" ? "Fórmulas Prontas" : "Substratos Avulsos"}
            </button>
          ))}
        </div>

        {/* â”€â”€ Fórmulas Prontas â”€â”€ */}
        {leftTab === "formulas" && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Objective filter */}
            <div className="p-3 border-b border-border/40 shrink-0 space-y-3">
              <div className="relative" ref={objRef}>
                <button
                  type="button"
                  onClick={() => setObjOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm border border-border rounded-lg bg-background hover:bg-muted/40 transition-colors"
                >
                  <span className={objective === "Todos" ? "text-muted-foreground" : "text-foreground font-medium"}>
                    {objective === "Todos" ? "Todos os objetivos" : objective}
                  </span>
                  <ChevronDown size={14} className="text-muted-foreground" />
                </button>
                {objOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-background border border-border rounded-lg shadow-lg overflow-hidden">
                    {objectives.map((obj) => (
                      <button
                        key={obj}
                        type="button"
                        onClick={() => { setObjective(obj); setObjOpen(false); }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm transition-colors",
                          objective === obj ? "bg-primary/8 text-primary font-medium" : "hover:bg-muted/60"
                        )}
                      >
                        {obj === "Todos" ? "Todos os objetivos" : obj}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Protocolos</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={startProtocolMode}
                  className="h-7 text-xs gap-1.5 border-primary/20 text-primary hover:bg-primary/5 hover:text-primary"
                >
                  <Plus size={12} />
                  Novo protocolo
                </Button>
              </div>
            </div>

            {creatingProtocol && (
              <div className="p-3 border-b border-border/40 bg-background/70 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Novo protocolo</p>
                    <p className="text-[11px] text-muted-foreground">Monte o protocolo com mais espaço e melhor leitura.</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={cancelProtocolMode} className="h-7 text-xs text-muted-foreground">
                    Cancelar
                  </Button>
                </div>

                <div className="grid gap-3 xl:grid-cols-[360px_minmax(0,1fr)]">
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2">
                      <Input
                        value={protocolName}
                        onChange={(e) => setProtocolName(e.target.value)}
                        placeholder="Nome do protocolo"
                        className="h-8 text-xs"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input
                          value={protocolObjective}
                          onChange={(e) => setProtocolObjective(e.target.value)}
                          placeholder="Objetivo"
                          className="h-8 text-xs"
                        />
                        <select
                          value={protocolPharmaForm}
                          onChange={(e) => setProtocolPharmaForm(e.target.value)}
                          className="h-8 text-[11px] border border-border/60 rounded bg-background px-2 text-foreground"
                        >
                          {PHARMA_FORMS.map((f) => <option key={f}>{f}</option>)}
                        </select>
                      </div>
                      <Textarea
                        value={protocolPosology}
                        onChange={(e) => setProtocolPosology(e.target.value)}
                        placeholder="Posologia (opcional)"
                        className="min-h-16 text-xs resize-none"
                      />
                    </div>

                    <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                          Selecionados
                        </p>
                        <span className="text-[10px] text-muted-foreground tabular-nums">{protocolDraft.length}</span>
                      </div>
                      {protocolDraft.length > 0 ? (
                        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                          {protocolDraft.map((item) => (
                            <div key={item.substrateId ?? item.name} className="flex items-center gap-2 rounded-md border border-border/50 bg-background px-2 py-1.5">
                              <span className="flex-1 text-xs font-medium text-foreground truncate">{item.name}</span>
                              <Input
                                type="number"
                                step="any"
                                value={item.dose}
                                onChange={(e) => patchProtocolItem(item.substrateId, { dose: parseFloat(e.target.value) || 0 })}
                                className="h-7 w-20 text-xs text-right tabular-nums"
                              />
                              <span className="text-[11px] text-muted-foreground w-8">{item.unit}</span>
                              <button
                                type="button"
                                onClick={() => removeProtocolItem(item.substrateId)}
                                className="text-muted-foreground/30 hover:text-destructive transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">Nenhum substrato selecionado ainda.</p>
                      )}

                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSaveProtocol}
                          disabled={savingProtocol || protocolDraft.length === 0 || !protocolName.trim()}
                          className="h-8 text-xs gap-1.5"
                        >
                          {savingProtocol ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                          Salvar
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                        Substratos cadastrados
                      </p>
                      <div className="relative w-full sm:max-w-sm">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={protocolSubSearch}
                          onChange={(e) => setProtocolSubSearch(e.target.value)}
                          placeholder="Buscar substrato"
                          className="pl-7 h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div className="max-h-[44vh] overflow-y-auto pr-1 space-y-2">
                      {Object.entries(
                        substrates
                          .filter((sub) =>
                            sub.name.toLowerCase().includes(protocolSubSearch.toLowerCase()) ||
                            sub.category.toLowerCase().includes(protocolSubSearch.toLowerCase())
                          )
                          .reduce<Record<string, Substrate[]>>((acc, sub) => {
                            (acc[sub.category] ??= []).push(sub);
                            return acc;
                          }, {})
                      ).map(([cat, subs]) => (
                        <div key={cat}>
                          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{cat}</p>
                          <div className="space-y-1">
                            {subs.map((sub) => {
                              const selected = protocolDraft.some((item) => item.substrateId === sub.id);
                              return (
                                <div key={sub.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background px-3 py-2">
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-foreground truncate">{sub.name}</p>
                                    {sub.ideal_dose && (
                                      <p className="text-[10px] text-muted-foreground">Dose ideal: {sub.ideal_dose} {sub.unit}</p>
                                    )}
                                  </div>
                                  <Button
                                    type="button"
                                    variant={selected ? "secondary" : "outline"}
                                    size="sm"
                                    onClick={() => addSubstrateToProtocol(sub)}
                                    className="h-7 text-[11px] gap-1.5 shrink-0"
                                    disabled={selected}
                                  >
                                    <Plus size={11} />
                                    {selected ? "Adicionado" : "Adicionar"}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      {substrates.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">Nenhum substrato cadastrado.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Formula cards */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {visibleFormulas.map((formula) => (
                <div key={formula.id} className="bg-background border border-border/60 rounded-lg p-3 hover:border-primary/30 transition-colors group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{formula.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/8 text-primary font-medium">
                          {formula.objective}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{formula.pharmaceutical_form}</span>
                      </div>
                      {formula.items && formula.items.length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                          {formula.items.slice(0, 4).map((fi) =>
                            `${fi.substrate_name ?? fi.substrate?.name} ${fi.applied_dose}${fi.unit}`
                          ).join(" ? ")}
                          {formula.items.length > 4 && ` ? +${formula.items.length - 4}` }
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => addFormula(formula)}
                      className="shrink-0 w-7 h-7 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {visibleFormulas.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhuma fórmula para este objetivo.</p>
              )}
            </div>
          </div>
        )}

        {/* â”€â”€ Substratos Avulsos â”€â”€ */}
        {leftTab === "substrates" && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="p-3 border-b border-border/40 shrink-0 space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={subSearch}
                    onChange={(e) => setSubSearch(e.target.value)}
                    placeholder="Buscar substrato..."
                    className="pl-7 h-8 text-xs"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewSubForm(!showNewSubForm)}
                  className="h-8 text-xs gap-1 shrink-0 px-2.5"
                >
                  <Plus size={12} /> Ativo
                </Button>
              </div>

              {/* Form to register new substrate directly in the catalog */}
              {showNewSubForm && (
                <form onSubmit={handleRegisterSubstrate} className="p-3 border border-border/60 rounded-lg bg-background/50 space-y-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-foreground">Novo Ativo no Catálogo</p>
                  <div className="space-y-1.5">
                    <Input
                      placeholder="Nome do ativo (ex: Creatina Creapure)"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      className="h-7 text-xs"
                      required
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <select
                        value={newSubCategory}
                        onChange={(e) => setNewSubCategory(e.target.value)}
                        className="h-7 text-[11px] border border-border/60 rounded bg-background px-1.5 text-foreground"
                      >
                        {["Adaptógeno", "Termogênico", "Fitoterápico", "Vitamina", "Mineral", "Aminoácido", "Lipídio", "Probiótico", "Antioxidante", "Hormonal", "Outros"].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <select
                        value={newSubUnit}
                        onChange={(e) => setNewSubUnit(e.target.value)}
                        className="h-7 text-[11px] border border-border/60 rounded bg-background px-1.5 text-foreground"
                      >
                        {["mg", "mcg", "g", "UI", "ml", "gotas", "UFC"].map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                    <Input
                      type="number"
                      step="any"
                      placeholder="Dose sugerida (opcional)"
                      value={newSubIdealDose}
                      onChange={(e) => setNewSubIdealDose(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNewSubForm(false)}
                      className="h-6 text-[10px] px-2"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={registeringSub}
                      className="h-6 text-[10px] px-2.5"
                    >
                      {registeringSub ? "Salvando..." : "Cadastrar"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {Object.entries(groupedSubs).map(([cat, subs]) => (
                <div key={cat}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <FlaskConical size={10} className="text-muted-foreground" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{cat}</p>
                  </div>
                  <div className="space-y-1">
                    {subs.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-border/40 bg-background hover:border-primary/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{sub.name}</p>
                          {sub.ideal_dose && (
                            <p className="text-[10px] text-muted-foreground">
                              Dose ideal: {sub.ideal_dose} {sub.unit}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {blocks.map((b) => (
                            <button
                              key={b.localId}
                              type="button"
                              title={`Adicionar a ${b.label}`}
                              onClick={() => addSubstrate(sub, b.localId)}
                              className="text-[10px] px-1.5 py-0.5 rounded border border-border/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                            >
                              {b.label}
                            </button>
                          ))}
                          <button
                            type="button"
                            title="Criar novo bloco"
                            onClick={() => addSubstrate(sub)}
                            className="w-6 h-6 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {Object.keys(groupedSubs).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhum substrato encontrado.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* â•â• RIGHT PANEL â€” Receituário â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">

        {/* Panel header */}
        <div className="flex flex-col gap-3 px-4 py-3 border-b border-border/60 shrink-0 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <FileText size={15} className="text-primary" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">Receituário</p>
              <p className="truncate text-[10px] text-muted-foreground">{patientName}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setView("history")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-border/50 hover:border-border"
            >
              <History size={12} />
              Histórico {history.length > 0 && <span className="ml-0.5 tabular-nums">({history.length})</span>}
            </button>
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handlePrint()}
                disabled={totalItems === 0}
                className="h-7 gap-1.5 border-border/60 bg-background text-xs"
              >
                <Printer size={12} />
                Imprimir PDF
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || totalItems === 0}
                className="h-7 gap-1.5 text-xs"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                {saving ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </div>
        </div>

        {editingPrescriptionId && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-800 shrink-0">
            <span>Editando Prescrição <strong>#{editingPrescriptionId}</strong> (as alterações serão salvas ao clicar em Salvar)</span>
            <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="h-6 text-[10px] text-amber-800 hover:text-amber-900 gap-1 hover:bg-amber-500/10">
              <X size={10} /> Cancelar
            </Button>
          </div>
        )}

        {/* Blocks */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground py-12">
              <Beaker size={32} className="opacity-20" />
              <div className="text-center">
                <p className="text-sm font-medium">Receituário vazio</p>
                <p className="text-xs mt-0.5">Adicione uma fórmula ou substrato pelo painel esquerdo.</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddEmptyBlock} className="text-xs gap-1.5 mt-2">
                <Plus size={13} />
                Criar Fórmula em Branco
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {blocks.map((block) => (
                  <div key={block.localId} className="rounded-xl border border-border/70 overflow-hidden">

                    {/* Block header */}
                    <div className="space-y-2 bg-muted/30 px-3 py-3 border-b border-border/40">
                      <div className="flex items-start justify-between gap-3">
                        <Input
                          value={block.label}
                          onChange={(e) => patchBlock(block.localId, { label: e.target.value })}
                          className="h-8 max-w-[180px] flex-1 border-transparent bg-transparent px-1.5 text-sm font-semibold hover:border-border focus:border-border"
                        />
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => saveBlockAsProtocol(block)}
                            className="h-8 gap-1.5 border-primary/20 px-3 text-xs text-primary hover:bg-primary/5 hover:text-primary"
                          >
                            <Save size={12} />
                            Salvar protocolo
                          </Button>
                          <button
                            type="button"
                            onClick={() => removeBlock(block.localId)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
                            title="Remover fórmula"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)]">
                        <select
                          value={block.pharmaceuticalForm}
                          onChange={(e) => patchBlock(block.localId, { pharmaceuticalForm: e.target.value })}
                          className="h-8 rounded-lg border border-border/60 bg-background px-2 text-xs text-foreground"
                        >
                          {PHARMA_FORMS.map((f) => <option key={f}>{f}</option>)}
                        </select>
                        <Input
                          value={block.posology}
                          onChange={(e) => patchBlock(block.localId, { posology: e.target.value })}
                          placeholder="Posologia (ex: 1x ao dia)"
                          className="h-8 border-border/60 bg-background px-2 text-xs"
                        />
                      </div>
                    </div>

                    {/* Items */}
                    <div className="divide-y divide-border/30">
                      {block.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/10 transition-colors group">
                          <span className="flex-1 text-xs font-medium text-foreground">{item.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Input
                              type="number"
                              step="any"
                              value={item.dose}
                              onChange={(e) => patchItem(block.localId, idx, { dose: parseFloat(e.target.value) || 0 })}
                              className="h-6 w-20 text-xs text-right tabular-nums border-border/50"
                            />
                            <span className="text-[11px] text-muted-foreground w-8">{item.unit}</span>
                            <button
                              type="button"
                              onClick={() => removeItem(block.localId, idx)}
                              className="text-muted-foreground/20 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {block.items.length === 0 && (
                        <p className="text-xs text-muted-foreground italic px-3 py-2">
                          Nenhum ativo neste bloco.
                        </p>
                      )}

                      {/* Inline Form to Add Custom/Avulso Item */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/10 border-t border-border/20">
                        <Input
                          placeholder="Adicionar ativo avulso..."
                          value={customItemInputs[block.localId]?.name ?? ""}
                          onChange={(e) => setCustomItemInputs(prev => ({
                            ...prev,
                            [block.localId]: { ...prev[block.localId] || { name: "", dose: "", unit: "mg" }, name: e.target.value }
                          }))}
                          className="h-7 text-xs flex-1 bg-background"
                        />
                        <Input
                          type="number"
                          placeholder="Qtd"
                          value={customItemInputs[block.localId]?.dose ?? ""}
                          onChange={(e) => setCustomItemInputs(prev => ({
                            ...prev,
                            [block.localId]: { ...prev[block.localId] || { name: "", dose: "", unit: "mg" }, dose: e.target.value }
                          }))}
                          className="h-7 w-14 text-xs text-right bg-background"
                        />
                        <select
                          value={customItemInputs[block.localId]?.unit ?? "mg"}
                          onChange={(e) => setCustomItemInputs(prev => ({
                            ...prev,
                            [block.localId]: { ...prev[block.localId] || { name: "", dose: "", unit: "mg" }, unit: e.target.value }
                          }))}
                          className="h-7 text-[11px] border border-border/60 rounded bg-background px-1 text-foreground"
                        >
                          {["mg", "mcg", "g", "UI", "ml", "gotas", "UFC"].map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleAddCustomItem(block.localId)}
                          className="h-7 w-7 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground text-xs font-semibold rounded transition-colors flex items-center justify-center shrink-0"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddEmptyBlock}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-border/85 hover:border-primary/50 hover:bg-primary/5 rounded-xl text-xs font-semibold text-primary transition-all mt-4 cursor-pointer"
              >
                <Plus size={13} />
                Criar Nova Fórmula (Bloco em Branco)
              </button>
            </>
          )}
        </div>

        {/* Footer summary */}
        {blocks.length > 0 && (
          <div className="px-4 py-2 border-t border-border/40 bg-muted/10 shrink-0">
            <p className="text-[11px] text-muted-foreground">
              {blocks.length} bloco(s) · {totalItems} ativo(s)
            </p>
          </div>
        )}
      </div>

    </div>
  );
}

