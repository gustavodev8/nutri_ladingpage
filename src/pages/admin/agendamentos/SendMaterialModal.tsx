import { Loader2, Paperclip, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Booking } from "@/lib/supabase";
import type { AttachmentFile } from "./useSendMaterial";

const initials = (name: string) =>
  name?.split(" ").filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "?";

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

interface SendMaterialModalProps {
  target: Booking | null;
  subject: string;
  setSubject: (value: string) => void;
  body: string;
  setBody: (value: string) => void;
  files: AttachmentFile[];
  sending: boolean;
  onAddFiles: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export const SendMaterialModal = ({
  target,
  subject,
  setSubject,
  body,
  setBody,
  files,
  sending,
  onAddFiles,
  onRemoveFile,
  onClose,
  onSubmit,
}: SendMaterialModalProps) => {
  if (!target) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:p-4 bg-black/60 backdrop-blur-[2px]">
      <div className="bg-background rounded-t-2xl md:rounded-xl border border-border shadow-2xl w-full md:max-w-lg max-h-[92svh] md:max-h-[90vh] flex flex-col">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">{initials(target.client_name)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{target.client_name}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{target.client_email}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">Assunto</label>
            <input
              type="text"
              value={subject}
              onChange={event => setSubject(event.target.value)}
              placeholder="Ex: Seu protocolo alimentar personalizado"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">Mensagem</label>
            <textarea
              value={body}
              onChange={event => setBody(event.target.value)}
              rows={5}
              placeholder={`Olá, ${target.client_name.split(" ")[0]}!\n\nSegue em anexo o seu protocolo alimentar...`}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/30"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">Anexos</label>
              {files.length > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">{formatBytes(files.reduce((acc, file) => acc + file.size, 0))} / 10 MB</span>
              )}
            </div>

            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted border border-border/50 text-xs text-foreground/80">
                    <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate max-w-[160px]">{file.name}</span>
                    <span className="text-muted-foreground shrink-0">{formatBytes(file.size)}</span>
                    <button onClick={() => onRemoveFile(index)} className="ml-0.5 text-muted-foreground hover:text-red-500 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="flex items-center gap-2 px-4 py-3 rounded-md border border-dashed border-border hover:border-primary/40 hover:bg-muted/30 cursor-pointer transition-colors group">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
              <span className="text-xs text-muted-foreground/70 group-hover:text-foreground transition-colors">
                Adicionar arquivo — PDF, DOCX, XLSX, imagem (máx. 10 MB)
              </span>
              <input type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.zip" onChange={onAddFiles} />
            </label>
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" className="flex-1 h-9 rounded-md text-sm" onClick={onClose} disabled={sending}>Cancelar</Button>
          <Button className="flex-1 h-9 rounded-md text-sm gap-2" onClick={onSubmit} disabled={sending || !subject.trim() || !body.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar email
          </Button>
        </div>
      </div>
    </div>
  );
};
