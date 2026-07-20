import { Fragment, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Search, FileText, Loader2, Trash2, FlaskConical, Printer, Plus, Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  fetchExamProtocols, fetchExamsCatalog, createExamRequest, fetchPatient,
  type ExamCatalogItem, type ExamProtocol, type Patient,
  supabase,
} from "@/lib/supabase";
import { examRequestPdfFilename, generateExamRequestPdf } from "@/lib/generateExamRequestPdf";

interface CartItem {
  exam:  ExamCatalogItem;
  notes: string;
}

interface Props {
  patientId: number;
  onCreated: (requestId: number) => void;
  onCancel:  () => void;
}

export function ExamRequestScreen({ patientId, onCreated, onCancel }: Props) {
  const [protocols,    setProtocols]    = useState<ExamProtocol[]>([]);
  const [catalog,      setCatalog]      = useState<ExamCatalogItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [cart,         setCart]         = useState<CartItem[]>([]);
  const [patient,      setPatient]      = useState<Patient | null>(null);
  const [patientName,  setPatientName]  = useState<string>("Paciente");
  const [patientEmail, setPatientEmail] = useState<string>("");
  const [search,       setSearch]       = useState("");
  const [dropOpen,     setDropOpen]     = useState(false);
  const [focusIdx,     setFocusIdx]     = useState(-1);
  const [globalNotes,  setGlobalNotes]  = useState("");
  const [selectedProtocolId, setSelectedProtocolId] = useState<number | undefined>();
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
      setPatient(patient);
      if (patient?.name) setPatientName(patient.name);
      if (patient?.email) setPatientEmail(patient.email);
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

  const cartIds = useMemo(() => new Set(cart.map((c) => c.exam.id)), [cart]);

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

    const protocolExams = proto.exams ?? [];
    if (protocolExams.length === 0) {
      toast.warning(`O protocolo "${proto.name}" ainda não tem exames vinculados. Edite em Biblioteca Clínica.`);
      return;
    }

    const toAdd = protocolExams.filter((e) => !cartIds.has(e.id));
    if (toAdd.length === 0) {
      toast.info(`Todos os exames de "${proto.name}" já estão no pedido.`);
      return;
    }

    setCart((prev) => [...prev, ...toAdd.map((e) => ({ exam: e, notes: "" }))]);
    setSelectedProtocolId(protocolId);
    toast.success(`${toAdd.length} exame(s) de "${proto.name}" adicionado(s).`);
  };

  const searchResults = search.length > 0
    ? catalog.filter(
        (e) => !cartIds.has(e.id) &&
          (e.name.toLowerCase().includes(search.toLowerCase()) ||
           e.group_category.toLowerCase().includes(search.toLowerCase()))
      ).slice(0, 30)
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

  const selectedProtocolName =
    protocols.find((protocol) => protocol.id === selectedProtocolId)?.name ?? null;

  const buildPdfData = () => ({
    patientName,
    patientEmail,
    patientPhone: patient?.phone ?? null,
    patientCpf: patient?.cpf ?? null,
    patientBirthDate: patient?.birth_date ?? null,
    patientGender: patient?.gender ?? null,
    patientCity: patient?.city ?? null,
    protocolName: selectedProtocolName,
    globalNotes,
    items: cart,
  });

  const handleSave = async () => {
    if (cart.length === 0) { toast.error("Adicione pelo menos um exame ao pedido."); return; }
    setSaving(true);
    const requestId = await createExamRequest(
      patientId,
      selectedProtocolId,
      cart.map((item) => ({ exam: item.exam, notes: item.notes })),
      globalNotes,
    );
    setSaving(false);
    if (!requestId) { toast.error("Erro ao salvar o pedido. Tente novamente."); return; }
    toast.success(`Pedido salvo com ${cart.length} exame(s).`);
    onCreated(requestId);
  };

  const handlePrint = async () => {
    if (cart.length === 0) { toast.error("Adicione pelo menos um exame para imprimir."); return; }
    try {
      const doc = await generateExamRequestPdf(buildPdfData());
      doc.autoPrint();
      window.open(doc.output("bloburl"), "_blank");
    } catch (error) {
      toast.error(`Erro ao gerar PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleSendEmail = async () => {
    if (cart.length === 0) { toast.error("Adicione pelo menos um exame ao pedido."); return; }
    if (!patientEmail.trim()) { toast.error("Cadastre um e-mail no perfil do paciente antes de enviar."); return; }

    setSendingEmail(true);
    try {
      const doc = await generateExamRequestPdf(buildPdfData());
      const pdfB64 = doc.output("datauristring").split(",")[1];
      const filename = examRequestPdfFilename(patientName);

      const { data, error } = await supabase.functions.invoke("send-material", {
        body: {
          to: patientEmail.trim(),
          client_name: patientName,
          subject: `Solicitação de exames — ${patientName}`,
          body: `Olá${patientName ? `, ${patientName.split(" ")[0]}` : ""}!\n\nSegue em anexo sua solicitação de exames laboratoriais.\n\nLeve este PDF ao laboratório de sua preferência.\n\nQualquer dúvida, fico à disposição.`,
          attachments: [{ filename, content: pdfB64 }],
        },
      });

      if (error || !data?.success) {
        throw new Error(error?.message ?? data?.error ?? "Falha ao enviar e-mail.");
      }

      toast.success(`Solicitação enviada para ${patientEmail}.`);
    } catch (error) {
      toast.error(`Erro ao enviar: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSendingEmail(false);
    }
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
        <div className="flex items-center justify-between gap-3">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Adicionar protocolo
          </Label>
          <Link
            to="/admin/biblioteca"
            className="text-[11px] font-semibold text-primary hover:underline"
          >
            Criar/editar protocolos prontos
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {protocols.map((p) => {
            const examsCount = p.exams?.length ?? 0;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => addProtocol(p.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5",
                  examsCount > 0
                    ? "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
                )}
              >
                <Plus size={11} />
                {p.name}
                <span className="text-[10px] opacity-70">{examsCount}</span>
              </button>
            );
          })}
        </div>
        {protocols.some((p) => (p.exams?.length ?? 0) === 0) && (
          <p className="text-[11px] text-amber-700">
            Protocolos com “0” precisam ser preenchidos em Biblioteca Clínica antes de usar no pedido.
          </p>
        )}
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
            placeholder="Buscar exame pelo nome ou categoria..."
            className="pl-7 h-9 text-sm"
          />
          {dropOpen && searchResults.length > 0 && (
            <div className="absolute z-50 mt-1 w-full max-h-96 overflow-y-auto bg-background border border-border rounded-lg shadow-lg">
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
                <Fragment key={category}>
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
                </Fragment>
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
          placeholder="Ex: não usar biotina 48h antes, informar uso de medicamentos..."
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
            variant="outline"
            size="sm"
            onClick={handleSendEmail}
            disabled={sendingEmail || cart.length === 0 || !patientEmail.trim()}
            title={patientEmail ? `Enviar para ${patientEmail}` : "Cadastre um e-mail no perfil do paciente"}
            className="gap-1.5"
          >
            {sendingEmail ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
            {sendingEmail ? "Enviando..." : "Enviar por e-mail"}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || cart.length === 0}
            className="gap-1.5"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
            {saving ? "Salvando..." : `Salvar Pedido (${cart.length})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
