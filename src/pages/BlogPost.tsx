import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CalendarDays, Clock, Loader2, BookOpen } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import { fetchBlogPost, type BlogPost } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

function readingTime(text: string) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/* Very lightweight markdown renderer — bold, italic, headings, paragraphs */
function renderContent(text: string, fontClass: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  const parseInline = (line: string) => {
    // bold **text**, italic *text*
    return line
      .split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
      .map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*"))
          return <em key={i}>{part.slice(1, -1)}</em>;
        return part;
      });
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { elements.push(<div key={key++} className="h-3" />); continue; }

    if (trimmed.startsWith("### ")) {
      elements.push(<h3 key={key++} className={`text-xl font-bold text-foreground mt-6 mb-2 ${fontClass}`}>{trimmed.slice(4)}</h3>);
    } else if (trimmed.startsWith("## ")) {
      elements.push(<h2 key={key++} className={`text-2xl font-bold text-foreground mt-8 mb-3 ${fontClass}`}>{trimmed.slice(3)}</h2>);
    } else if (trimmed.startsWith("# ")) {
      elements.push(<h1 key={key++} className={`text-3xl font-bold text-foreground mt-8 mb-4 ${fontClass}`}>{trimmed.slice(2)}</h1>);
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      elements.push(
        <li key={key++} className="ml-5 list-disc text-foreground/85 leading-relaxed text-base">
          {parseInline(trimmed.slice(2))}
        </li>
      );
    } else {
      elements.push(
        <p key={key++} className="text-foreground/85 leading-relaxed text-base mb-1">
          {parseInline(trimmed)}
        </p>
      );
    }
  }
  return elements;
}

const FONT_MAP: Record<string, string> = {
  sans: "font-sans",
  serif: "font-serif",
  display: "font-display",
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    if (!slug) return;
    fetchBlogPost(slug).then((data) => {
      if (!data) setNotFound(true);
      else setPost(data);
      setLoading(false);
    });
  }, [slug]);

  const fontClass = FONT_MAP[post?.font ?? "sans"] ?? "font-sans";

  return (
    <PageLayout>
      {loading ? (
        <div className="flex justify-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : notFound || !post ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-xl font-bold text-foreground">Artigo não encontrado</p>
          <Button asChild variant="outline">
            <Link to="/blog"><ArrowLeft className="mr-2 h-4 w-4" />Voltar ao blog</Link>
          </Button>
        </div>
      ) : (
        <article className="py-12 md:py-20">
          {/* Cover */}
          {post.cover_image_url && (
            <div className="w-full max-h-[460px] overflow-hidden mb-10">
              <img
                src={post.cover_image_url}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="container mx-auto px-4 max-w-3xl">
            {/* Back */}
            <Link
              to="/blog"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />Blog
            </Link>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-6">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date(post.created_at!).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {readingTime(post.content)} min de leitura
              </span>
            </div>

            {/* Title */}
            <h1 className={`font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-8 ${fontClass}`}>
              {post.title}
            </h1>

            {/* Content */}
            <div className={`prose-like space-y-1 ${fontClass}`}>
              {renderContent(post.content, fontClass)}
            </div>

            {/* Footer CTA */}
            <div className="mt-16 p-6 rounded-2xl bg-primary/5 border border-primary/20 text-center space-y-3">
              <p className="font-bold text-foreground text-lg">Pronto para transformar sua saúde?</p>
              <p className="text-sm text-muted-foreground">Agende sua consulta com Fillipe David e receba um protocolo feito para você.</p>
              <Button asChild size="lg" className="rounded-full px-8 mt-1">
                <Link to="/consultas">Quero mudar de vida</Link>
              </Button>
            </div>
          </div>
        </article>
      )}
    </PageLayout>
  );
};

export default BlogPost;
