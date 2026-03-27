import { type ReactNode } from "react";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContent } from "@/contexts/ContentContext";

interface Props {
  title: string;
  description?: string;
  onSave: () => void;
  children: ReactNode;
}

const AdminFormWrapper = ({ title, description, onSave, children }: Props) => {
  const { saveStatus } = useContent();

  const isSaving = saveStatus === "saving";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>

      {/* Form card */}
      <div className="bg-card border border-border rounded-3xl p-6 lg:p-8 space-y-6">
        {children}
      </div>

      {/* Save bar */}
      <div className="flex items-center justify-between gap-4 py-4 border-t border-border">
        <StatusMessage status={saveStatus} />
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="bg-primary hover:bg-primary/90 px-8 min-w-[160px]"
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </span>
          ) : (
            "Salvar alterações"
          )}
        </Button>
      </div>
    </div>
  );
};

function StatusMessage({ status }: { status: string }) {
  if (status === "saved") {
    return (
      <span className="flex items-center gap-2 text-sm text-primary font-medium">
        <CheckCircle className="h-4 w-4" />
        Salvo com sucesso!
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-2 text-sm text-destructive font-medium">
        <AlertCircle className="h-4 w-4" />
        Erro ao salvar. Verifique sua conexão.
      </span>
    );
  }
  return (
    <span className="text-sm text-muted-foreground">
      Clique em salvar para aplicar as alterações.
    </span>
  );
}

export default AdminFormWrapper;
