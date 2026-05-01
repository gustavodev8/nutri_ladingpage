import { useState, useRef, useCallback } from "react";
import { FileDown, Upload, X, Loader2, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";
import { compressPdf, type PdfQuality } from "@/lib/pdfCompress";
import { Button } from "@/components/ui/button";

const QUALITY_OPTIONS: { id: PdfQuality; label: string; desc: string; reduction: string }[] = [
  { id: "baixa", label: "Baixa",  desc: "72 DPI · JPEG 60%",  reduction: "↓ 85–95%" },
  { id: "media", label: "Média",  desc: "96 DPI · JPEG 75%",  reduction: "↓ 70–85%" },
  { id: "alta",  label: "Alta",   desc: "150 DPI · JPEG 85%", reduction: "↓ 50–70%" },
];

function formatBytes(b: number) {
  if (b >= 1_000_000) return `${(b / 1_000_000).toFixed(1)} MB`;
  if (b >= 1_000)     return `${(b / 1_000).toFixed(0)} KB`;
  return `${b} B`;
}

export default function AdminFerramentas() {
  const [file, setFile]           = useState<File | null>(null);
  const [quality, setQuality]     = useState<PdfQuality>("media");
  const [progress, setProgress]   = useState(0);      // 0-100
  const [total, setTotal]         = useState(0);
  const [done, setDone]           = useState(0);
  const [compressing, setCompressing] = useState(false);
  const [result, setResult]       = useState<{ blob: Blob; name: string } | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [dragging, setDragging]   = useState(false);
  const inputRef                  = useRef<HTMLInputElement>(null);

  const pickFile = (f: File) => {
    if (f.type !== "application/pdf") { setError("Selecione um arquivo PDF."); return; }
    setFile(f); setResult(null); setError(null); setProgress(0); setDone(0); setTotal(0);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  }, []);

  const handleCompress = async () => {
    if (!file) return;
    setCompressing(true); setError(null); setResult(null); setProgress(0);
    try {
      const blob = await compressPdf(file, quality, (d, t) => {
        setDone(d); setTotal(t);
        setProgress(t > 0 ? Math.round((d / t) * 100) : 0);
      });
      const outName = file.name.replace(/\.pdf$/i, `_comprimido_${quality}.pdf`);
      setResult({ blob, name: outName });
      setProgress(100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao comprimir PDF.");
    } finally {
      setCompressing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url; a.download = result.name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const reduction = result && file
    ? Math.round((1 - result.blob.size / file.size) * 100)
    : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ferramentas</h1>
        <p className="text-sm text-muted-foreground">Utilitários de uso interno</p>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/20">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileDown className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Compressor de PDF</p>
            <p className="text-xs text-muted-foreground">Converte páginas para JPEG e reconstrói o PDF com tamanho reduzido</p>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-all py-10 ${
              dragging
                ? "border-primary bg-primary/5"
                : file
                ? "border-primary/30 bg-primary/5"
                : "border-border hover:border-primary/40 hover:bg-muted/30"
            }`}
          >
            <input ref={inputRef} type="file" accept="application/pdf" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ""; }} />

            {file ? (
              <>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileDown className="h-5 w-5 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground truncate max-w-xs">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatBytes(file.size)}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setFile(null); setResult(null); setError(null); }}
                  className="absolute top-3 right-3 w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground/30" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Arraste um PDF ou clique para selecionar</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Não há limite de tamanho — quanto maior o arquivo, mais tempo leva</p>
                </div>
              </>
            )}
          </div>

          {/* Quality selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Qualidade de saída</label>
            <div className="grid grid-cols-3 gap-2">
              {QUALITY_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => setQuality(opt.id)}
                  className={`flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-all ${
                    quality === opt.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30 hover:bg-muted/30"
                  }`}>
                  <span className={`text-sm font-semibold ${quality === opt.id ? "text-primary" : "text-foreground"}`}>
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</span>
                  <span className={`text-[10px] font-medium mt-1 ${quality === opt.id ? "text-primary/70" : "text-muted-foreground/60"}`}>
                    {opt.reduction}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground/60">
              Baixa e Média são ideais para ebooks e documentos de texto. Alta preserva melhor imagens e diagramas.
            </p>
          </div>

          {/* Progress bar */}
          {compressing && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Processando página {done} de {total}…
                </span>
                <span className="font-medium text-foreground">{progress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground/50">
                PDFs grandes podem levar alguns minutos. Não feche esta aba.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Result */}
          {result && file && reduction !== null && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-emerald-200/60">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <p className="text-sm font-semibold text-emerald-800">Compressão concluída!</p>
              </div>
              <div className="px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <p className="text-[10px] text-emerald-600/60 font-medium uppercase tracking-wider">Original</p>
                    <p className="font-semibold text-emerald-900">{formatBytes(file.size)}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-emerald-500 rotate-[-90deg]" />
                  <div>
                    <p className="text-[10px] text-emerald-600/60 font-medium uppercase tracking-wider">Comprimido</p>
                    <p className="font-bold text-emerald-700">{formatBytes(result.blob.size)}</p>
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-300">
                    <p className="text-xs font-bold text-emerald-700">↓ {reduction}%</p>
                  </div>
                </div>
                <Button onClick={handleDownload} size="sm" className="gap-1.5 shrink-0">
                  <FileDown className="h-4 w-4" />
                  Baixar PDF
                </Button>
              </div>
            </div>
          )}

          {/* Action */}
          {!compressing && (
            <Button
              onClick={handleCompress}
              disabled={!file || compressing}
              className="w-full gap-2"
            >
              <FileDown className="h-4 w-4" />
              Comprimir PDF
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
