import { ArrowRight, CalendarCheck, FileText, Paperclip, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ConsultationRecord } from "@/lib/supabase";

interface RecordDetailModalProps {
  record: ConsultationRecord | null;
  onClose: () => void;
  onEdit: (record: ConsultationRecord) => void;
  onDeleteRequest: (recordId: number) => void;
}

const getSessionLabel = (record: ConsultationRecord) => {
  if (record.session_number === 1) return "Consulta inicial";
  if (record.session_number) return `Retorno ${record.session_number - 1}`;
  return "Consulta";
};

export const RecordDetailModal = ({
  record,
  onClose,
  onEdit,
  onDeleteRequest,
}: RecordDetailModalProps) => {
  if (!record) return null;

  const sessionLabel = getSessionLabel(record);
  const isEmpty =
    !record.notes &&
    !record.next_steps &&
    !record.next_return_date &&
    (!record.files || record.files.length === 0) &&
    !record.weight &&
    !record.height;

  const editRecord = () => {
    onClose();
    setTimeout(() => onEdit(record), 80);
  };

  const requestDelete = () => {
    if (!record.id) return;
    onClose();
    setTimeout(() => onDeleteRequest(record.id!), 80);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end md:items-center justify-center md:p-4 bg-black/60 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-lg flex flex-col max-h-[92svh] md:max-h-[88vh] overflow-hidden"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">{sessionLabel}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {record.client_name && (
                <>
                  <span className="font-medium text-foreground/80">{record.client_name}</span>
                  <span className="mx-1.5 opacity-30">·</span>
                </>
              )}
              {record.created_at &&
                new Date(record.created_at).toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={editRecord}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Editar"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={requestDelete}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Excluir"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {record.notes && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                Observações da consulta
              </p>
              <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">{record.notes}</p>
            </div>
          )}

          {record.next_steps && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Próximos passos</p>
              <div className="border-l-2 border-primary/30 pl-3">
                <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">{record.next_steps}</p>
              </div>
            </div>
          )}

          {record.next_return_date && (
            <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-lg bg-primary/5 border border-primary/20">
              <CalendarCheck className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-[10px] text-primary/60 font-medium">Próximo retorno agendado</p>
                <p className="text-sm font-semibold text-primary mt-0.5">
                  {new Date(record.next_return_date + "T12:00:00").toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          )}

          {record.files && record.files.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                Arquivos{" "}
                <span className="normal-case font-normal tracking-normal text-muted-foreground/30">
                  ({record.files.length})
                </span>
              </p>
              <div className="flex flex-col gap-1.5">
                {record.files.map((file, index) => (
                  <a
                    key={`${file.url}-${index}`}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted/50 hover:bg-muted border border-border/50 hover:border-border text-sm text-foreground/80 hover:text-foreground transition-all group/file"
                  >
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 group-hover/file:text-primary transition-colors" />
                    <span className="flex-1 truncate font-medium">{file.name}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/30 shrink-0 group-hover/file:text-primary transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {isEmpty && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma informação registrada neste prontuário.</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border shrink-0">
          <Button className="w-full h-9 rounded-lg text-sm gap-2" onClick={editRecord}>
            <Pencil className="h-3.5 w-3.5" />
            Editar prontuário
          </Button>
        </div>
      </div>
    </div>
  );
};
