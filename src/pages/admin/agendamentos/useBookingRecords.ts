import { useState } from "react";
import {
  deleteConsultationRecord,
  fetchConsultationRecords,
  updateConsultationRecord,
  uploadRecordFile,
  type ConsultationRecord,
  type RecordFile,
} from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

export const useBookingRecords = () => {
  const [records, setRecords] = useState<ConsultationRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [viewRecord, setViewRecord] = useState<ConsultationRecord | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editNextSteps, setEditNextSteps] = useState("");
  const [editNextReturn, setEditNextReturn] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editHeight, setEditHeight] = useState("");
  const [editFiles, setEditFiles] = useState<RecordFile[]>([]);
  const [editNewFiles, setEditNewFiles] = useState<File[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const loadRecords = async (groupId: string) => {
    setLoadingRecords(true);
    setRecords(await fetchConsultationRecords(groupId));
    setLoadingRecords(false);
  };

  const openEditRecord = (record: ConsultationRecord) => {
    setEditingRecordId(record.id!);
    setConfirmDeleteId(null);
    setEditNotes(record.notes || "");
    setEditNextSteps(record.next_steps || "");
    setEditNextReturn(record.next_return_date || "");
    setEditWeight(record.weight ? String(record.weight) : "");
    setEditHeight(record.height ? String(record.height) : "");
    setEditFiles(record.files || []);
    setEditNewFiles([]);
  };

  const handleSaveEdit = async (currentGroupId: string | null) => {
    if (!editingRecordId || !currentGroupId) return;
    setSavingEdit(true);

    let mergedFiles: RecordFile[] | null = null;
    const keptFiles = editFiles;
    const uploadedFiles: RecordFile[] = [];

    if (editNewFiles.length > 0) {
      const editingRecord = records.find(record => record.id === editingRecordId);
      const groupId = editingRecord?.booking_group_id || currentGroupId;
      const results = await Promise.all(
        editNewFiles.map(async file => {
          const url = await uploadRecordFile(file, groupId);
          return url ? { name: file.name, url } : null;
        }),
      );
      results.forEach(result => {
        if (result) uploadedFiles.push(result);
      });
    }

    const allFiles = [...keptFiles, ...uploadedFiles];
    if (allFiles.length > 0) mergedFiles = allFiles;

    const ok = await updateConsultationRecord(editingRecordId, {
      notes: editNotes.trim() || null,
      next_steps: editNextSteps.trim() || null,
      next_return_date: editNextReturn || null,
      weight: editWeight ? parseFloat(editWeight) : null,
      height: editHeight ? parseFloat(editHeight) : null,
      files: mergedFiles,
    });

    if (ok) {
      toast({ title: "Registro atualizado." });
      setEditingRecordId(null);
      setEditNewFiles([]);
      await loadRecords(currentGroupId);
    } else {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }

    setSavingEdit(false);
  };

  const handleDeleteRecord = async (id: number, currentGroupId: string | null) => {
    if (!currentGroupId) return;

    const ok = await deleteConsultationRecord(id);
    if (ok) {
      toast({ title: "Registro excluído." });
      setConfirmDeleteId(null);
      await loadRecords(currentGroupId);
    } else {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  return {
    records,
    setRecords,
    loadingRecords,
    viewRecord,
    setViewRecord,
    editingRecordId,
    setEditingRecordId,
    confirmDeleteId,
    setConfirmDeleteId,
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
    loadRecords,
    openEditRecord,
    handleSaveEdit,
    handleDeleteRecord,
  };
};
