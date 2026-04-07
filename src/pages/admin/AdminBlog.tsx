import { useState, useEffect } from "react";
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Loader2,
  Image as ImageIcon, X, BookOpen, Globe, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchBlogPosts, upsertBlogPost, deleteBlogPost, uploadBlogImage,
  type BlogPost,
} from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

const FONTS = [
  { value: "sans",    label: "Sans-Serif (padrão)" },
  { value: "serif",   label: "Serif (elegante)" },
  { value: "display", label: "Display (destaque)" },
];

function slugify(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80);
}

const EMPTY: BlogPost = { title: "", slug: "", content: "", cover_image_url: "", font: "sans", published: false };

const AdminBlog = () => {
  const [posts, setPosts]           = useState<BlogPost[]>([]);
  const [loading, setLoading]       = useState(true);
  const [editing, setEditing]       = useState<BlogPost | null>(null);
  const [saving, setSaving]         = useState(false);
  const [coverFile, setCoverFile]   = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [confirmDelete, setConfirmDelete]   = useState<number | null>(null);
  const [toggling, setToggling]             = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await fetchBlogPosts(false);
    setPosts(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  /* Open editor */
  const openNew = () => {
    setEditing({ ...EMPTY });
    setCoverFile(null);
    setCoverPreview("");
  };

  const openEdit = (post: BlogPost) => {
    setEditing({ ...post });
    setCoverFile(null);
    setCoverPreview(post.cover_image_url || "");
  };

  /* Cover image selection */
  const handleCoverChange = (file: File) => {
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  /* Auto-slug from title */
  const handleTitleChange = (val: string) => {
    if (!editing) return;
    const autoSlug = editing.id ? editing.slug : slugify(val);
    setEditing({ ...editing, title: val, slug: autoSlug });
  };

  /* Save */
  const handleSave = async () => {
    if (!editing) return;
    if (!editing.title.trim() || !editing.content.trim()) {
      toast({ title: "Título e conteúdo são obrigatórios", variant: "destructive" });
      return;
    }
    setSaving(true);

    let coverUrl = editing.cover_image_url || "";
    if (coverFile) {
      setUploadingCover(true);
      const url = await uploadBlogImage(coverFile);
      setUploadingCover(false);
      if (url) coverUrl = url;
      else { toast({ title: "Erro ao subir imagem", variant: "destructive" }); setSaving(false); return; }
    }

    const result = await upsertBlogPost({ ...editing, cover_image_url: coverUrl });
    setSaving(false);
    if (result) {
      toast({ title: editing.id ? "Post atualizado!" : "Post criado!" });
      setEditing(null);
      await load();
    } else {
      toast({ title: "Erro ao salvar post", variant: "destructive" });
    }
  };

  /* Toggle published */
  const handleTogglePublish = async (post: BlogPost) => {
    if (!post.id) return;
    setToggling(post.id);
    const newPublished = !post.published;
    const updated = await upsertBlogPost({ ...post, published: newPublished });
    setToggling(null);
    if (updated) {
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, published: newPublished } : p));
      toast({ title: newPublished ? "Post publicado!" : "Post despublicado" });
    } else {
      toast({ title: "Erro ao alterar status do post", description: "Verifique se o RLS está desativado no Supabase.", variant: "destructive" });
    }
  };

  /* Delete */
  const handleDelete = async (id: number) => {
    const ok = await deleteBlogPost(id);
    if (ok) {
      setPosts(prev => prev.filter(p => p.id !== id));
      setConfirmDelete(null);
      toast({ title: "Post excluído" });
    } else {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  /* ── EDITOR ── */
  if (editing) return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold">{editing.id ? "Editar post" : "Novo post"}</h2>
        <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
          <X className="h-4 w-4 mr-1.5" />Cancelar
        </Button>
      </div>

      {/* Cover image */}
      <div className="space-y-2">
        <Label>Imagem de capa</Label>
        <div className="relative rounded-xl overflow-hidden bg-muted border border-border aspect-video flex items-center justify-center">
          {coverPreview ? (
            <>
              <img src={coverPreview} alt="capa" className="w-full h-full object-cover" />
              <button
                onClick={() => { setCoverFile(null); setCoverPreview(""); setEditing(e => e ? { ...e, cover_image_url: "" } : e); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center"
              >
                <X className="h-3.5 w-3.5 text-white" />
              </button>
            </>
          ) : (
            <label className="flex flex-col items-center gap-2 cursor-pointer text-muted-foreground hover:text-primary transition-colors p-8">
              <ImageIcon className="h-10 w-10" />
              <span className="text-sm font-medium">Clique para escolher imagem</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverChange(f); e.target.value = ""; }} />
            </label>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label>Título *</Label>
        <Input value={editing.title} onChange={e => handleTitleChange(e.target.value)} placeholder="Título do artigo" className="rounded-xl" />
      </div>

      {/* Slug */}
      <div className="space-y-1.5">
        <Label>Slug (URL)</Label>
        <Input value={editing.slug} onChange={e => setEditing({ ...editing, slug: slugify(e.target.value) })} placeholder="meu-artigo" className="rounded-xl font-mono text-sm" />
        <p className="text-xs text-muted-foreground">/blog/{editing.slug || "slug-do-artigo"}</p>
      </div>

      {/* Font */}
      <div className="space-y-1.5">
        <Label>Fonte <span className="text-muted-foreground font-normal">(opcional)</span></Label>
        <select
          value={editing.font || "sans"}
          onChange={e => setEditing({ ...editing, font: e.target.value })}
          className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      {/* Content */}
      <div className="space-y-1.5">
        <Label>Conteúdo * <span className="text-muted-foreground font-normal text-xs">(suporta Markdown básico: **negrito**, *itálico*, ## Título, - lista)</span></Label>
        <textarea
          value={editing.content}
          onChange={e => setEditing({ ...editing, content: e.target.value })}
          rows={20}
          placeholder="Escreva o conteúdo do artigo aqui..."
          className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40 font-mono leading-relaxed"
        />
      </div>

      {/* Published */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => setEditing({ ...editing, published: !editing.published })}
          className={`w-11 h-6 rounded-full transition-colors relative ${editing.published ? "bg-primary" : "bg-muted"}`}
        >
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${editing.published ? "translate-x-6" : "translate-x-1"}`} />
        </div>
        <span className="text-sm font-medium">{editing.published ? "Publicado" : "Rascunho"}</span>
      </label>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setEditing(null)} disabled={saving}>Cancelar</Button>
        <Button className="flex-1 rounded-xl gap-2" onClick={handleSave} disabled={saving || uploadingCover}>
          {(saving || uploadingCover) ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {saving ? "Salvando…" : uploadingCover ? "Enviando imagem…" : "Salvar post"}
        </Button>
      </div>
    </div>
  );

  /* ── LIST ── */
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Blog</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus artigos</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />Novo post
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center border border-dashed border-border rounded-xl">
          <BookOpen className="h-10 w-10 text-muted-foreground/30" />
          <p className="font-semibold text-foreground">Nenhum post ainda</p>
          <p className="text-sm text-muted-foreground">Clique em "Novo post" para começar.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {posts.map((post, idx) => (
            <div
              key={post.id}
              className={`flex items-center gap-4 px-5 py-4 ${idx !== posts.length - 1 ? "border-b border-border" : ""}`}
            >
              {/* Cover thumb */}
              <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden shrink-0">
                {post.cover_image_url
                  ? <img src={post.cover_image_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><BookOpen className="h-5 w-5 text-muted-foreground/30" /></div>
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{post.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  /blog/{post.slug} · {new Date(post.created_at!).toLocaleDateString("pt-BR")}
                </p>
              </div>

              {/* Status */}
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${
                post.published
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-muted text-muted-foreground border-border"
              }`}>
                {post.published ? "Publicado" : "Rascunho"}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleTogglePublish(post)}
                  disabled={toggling === post.id}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title={post.published ? "Despublicar" : "Publicar"}
                >
                  {toggling === post.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : post.published ? <EyeOff className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => openEdit(post)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                {confirmDelete === post.id ? (
                  <div className="flex items-center gap-1.5 text-xs ml-1">
                    <span className="text-muted-foreground">Excluir?</span>
                    <button onClick={() => handleDelete(post.id!)} className="font-semibold text-red-500">Sim</button>
                    <button onClick={() => setConfirmDelete(null)} className="text-muted-foreground">Não</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(post.id!)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminBlog;
