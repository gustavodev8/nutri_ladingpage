import { useRef, useState } from "react";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadImage } from "@/lib/supabase";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

const ImageUpload = ({ value, onChange }: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Selecione um arquivo de imagem.");
      return;
    }
    setError("");
    setUploading(true);
    const url = await uploadImage(file);
    setUploading(false);
    if (url) {
      onChange(url);
    } else {
      setError("Erro ao enviar imagem. Verifique o bucket 'images' no Supabase Storage.");
    }
  };

  return (
    <div className="space-y-2">
      <div
        className="relative w-full h-44 rounded-xl border-2 border-dashed border-border/60 overflow-hidden group cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors"
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {value ? (
          <>
            <img src={value} alt="Capa do produto" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <span className="text-white text-sm font-medium flex items-center gap-1.5">
                <Upload className="h-4 w-4" /> Alterar imagem
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="absolute top-2 right-2 bg-background/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm">Enviando...</span>
              </>
            ) : (
              <>
                <ImageIcon className="h-8 w-8 opacity-40" />
                <span className="text-sm">Clique para adicionar imagem</span>
                <span className="text-xs opacity-60">JPG, PNG, WebP</span>
              </>
            )}
          </div>
        )}
      </div>

      {uploading && !value && null}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="gap-1.5 text-xs flex-1"
        >
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Enviando..." : value ? "Trocar imagem" : "Fazer upload"}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
            className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
            Remover
          </Button>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );
};

export default ImageUpload;
