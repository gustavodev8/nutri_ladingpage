import type { Dispatch, SetStateAction } from "react";
import { ArrowRight, FileText, Loader2, Paperclip, Pencil, Scale, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ConsultationRecord, RecordFile } from "@/lib/supabase";
import { calcBMI } from "./bookingDateUtils";

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const getSessionLabel = (record: ConsultationRecord) => {
  if (record.session_number === 1) return "Consulta inicial";
  if (record.session_number) return `Retorno ${record.session_number - 1}`;
  return "Consulta";
};

interface BookingRecordsTabProps {
  loading: boolean;
  records: ConsultationRecord[];
  editingRecordId: number | null;
  confirmDeleteId: number | null;
  editNotes: string;
  setEditNotes: (value: string) => void;
  editNextSteps: string;
  setEditNextSteps: (value: string) => void;
  editNextReturn: string;
  setEditNextReturn: (value: string) => void;
  editFiles: RecordFile[];
  setEditFiles: Dispatch<SetStateAction<RecordFile[]>>;
  editNewFiles: File[];
  setEditNewFiles: Dispatch<SetStateAction<File[]>>;
  savingEdit: boolean;
  onOpenRecord: (record: ConsultationRecord) => void;
  onEditRecord: (record: ConsultationRecord) => void;
  onCancelEdit: () => void;
  onRequestDelete: (recordId: number) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (recordId: number) => void;
  onSaveEdit: () => void;
  onInvalidFiles: () => void;
}

export const BookingRecordsTab = ({
  loading,
  records,
  editingRecordId,
  confirmDeleteId,
  editNotes,
  setEditNotes,
  editNextSteps,
  setEditNextSteps,
  editNextReturn,
  setEditNextReturn,
  editFiles,
  setEditFiles,
  editNewFiles,
  setEditNewFiles,
  savingEdit,
  onOpenRecord,
  onEditRecord,
  onCancelEdit,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
  onSaveEdit,
  onInvalidFiles,
}: BookingRecordsTabProps) => {
  const addFiles = (files: File[]) => {
    if (!files.length) return;

    const total = [...editFiles, ...editNewFiles, ...files].reduce(
      (acc, file) => acc + ("size" in file ? file.size : 0),
      0,
    );

    if (total > 20 * 1024 * 1024) {
      onInvalidFiles();
      return;
    }

    setEditNewFiles(previous => [...previous, ...files]);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3">
            <FileText className="h-5 w-5 text-muted-foreground/30" />
          </div>
          <p className="text-sm font-medium text-foreground">Sem prontuários</p>
          <p className="text-xs text-muted-foreground mt-1">Conclua uma sessão para criar o primeiro registro.</p>
        </div>
      ) : (
        records.map(record => {
          const bmi = record.weight && record.height ? calcBMI(record.weight, record.height) : null;
          const isEditing = editingRecordId === record.id;
          const isConfirmingDelete = confirmDeleteId === record.id;
          const sessionLabel = getSessionLabel(record);

          return (
            <div key={record.id} className="rounded-lg border border-border overflow-hidden">
              {!isEditing && !isConfirmingDelete && (
                <button
                  onClick={() => onOpenRecord(record)}
                  className="w-full text-left hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs font-semibold text-foreground">{sessionLabel}</span>
                      <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                        {record.created_at &&
                          new Date(record.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                      </span>
                      {record.weight && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          <Scale className="h-2.5 w-2.5" />
                          {record.weight} kg
                          {bmi && (
                            <>
                              <span className="mx-0.5 opacity-40">·</span>
                              IMC {bmi}
                            </>
                          )}
                        </span>
                      )}
                      {record.files && record.files.length > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          <Paperclip className="h-2.5 w-2.5" />
                          {record.files.length}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={event => event.stopPropagation()}>
                      <button
                        onClick={() => onEditRecord(record)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      {record.id && (
                        <button
                          onClick={() => onRequestDelete(record.id!)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    {record.notes ? (
                      <p className="text-xs text-foreground/70 leading-relaxed line-clamp-2">{record.notes}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground/40 italic">Sem observações — clique para ver detalhes</p>
                    )}
                    {record.next_return_date && (
                      <p className="flex items-center gap-1 text-[10px] text-primary font-medium mt-1.5">
                        <ArrowRight className="h-2.5 w-2.5" />
                        Retorno em{" "}
                        {new Date(record.next_return_date + "T12:00:00").toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                </button>
              )}

              {isConfirmingDelete && !isEditing && record.id && (
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-foreground">{sessionLabel}</span>
                    <span className="text-xs text-muted-foreground">Excluir este registro?</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button onClick={() => onConfirmDelete(record.id!)} className="font-semibold text-red-500 hover:text-red-600">
                      Sim
                    </button>
                    <button onClick={onCancelDelete} className="text-muted-foreground hover:text-foreground">
                      Não
                    </button>
                  </div>
                </div>
              )}

              {isEditing && (
                <div className="px-4 py-4 space-y-3">
                  <p className="text-xs font-semibold text-foreground">{sessionLabel}</p>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Observações</label>
                    <textarea
                      value={editNotes}
                      onChange={event => setEditNotes(event.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/40"
                      placeholder="Observações da consulta…"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Próximos passos</label>
                    <textarea
                      value={editNextSteps}
                      onChange={event => setEditNextSteps(event.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/40"
                      placeholder="Encaminhamentos, plano alimentar enviado…"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Próximo retorno</label>
                    <input
                      type="date"
                      value={editNextReturn}
                      onChange={event => setEditNextReturn(event.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground">Arquivos</label>
                      <label className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/70 cursor-pointer transition-colors">
                        <Paperclip className="h-3 w-3" />
                        Anexar
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.png,.jpg,.jpeg"
                          onChange={event => {
                            const picked = Array.from(event.target.files || []);
                            event.target.value = "";
                            addFiles(picked);
                          }}
                        />
                      </label>
                    </div>

                    {editFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {editFiles.map((file, index) => (
                          <div
                            key={`${file.url}-${index}`}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted border border-border/50 text-xs text-foreground/80 max-w-full"
                          >
                            <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="truncate max-w-[140px] hover:underline">
                              {file.name}
                            </a>
                            <button
                              onClick={() => setEditFiles(previous => previous.filter((_, itemIndex) => itemIndex !== index))}
                              className="ml-0.5 text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {editNewFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {editNewFiles.map((file, index) => (
                          <div
                            key={`${file.name}-${file.size}-${index}`}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary/5 border border-primary/20 text-xs text-foreground/80 max-w-full"
                          >
                            <Paperclip className="h-3 w-3 text-primary shrink-0" />
                            <span className="truncate max-w-[140px]">{file.name}</span>
                            <span className="text-muted-foreground shrink-0">{formatBytes(file.size)}</span>
                            <button
                              onClick={() => setEditNewFiles(previous => previous.filter((_, itemIndex) => itemIndex !== index))}
                              className="ml-0.5 text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {editFiles.length === 0 && editNewFiles.length === 0 && (
                      <p className="text-xs text-muted-foreground/50">Nenhum arquivo anexado.</p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1 h-9 rounded-md text-xs" onClick={onCancelEdit} disabled={savingEdit}>
                      Cancelar
                    </Button>
                    <Button size="sm" className="flex-1 h-9 rounded-md text-xs gap-1.5" onClick={onSaveEdit} disabled={savingEdit}>
                      {savingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      Salvar alterações
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
