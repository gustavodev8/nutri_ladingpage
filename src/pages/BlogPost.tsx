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

/* Inline markdown: bold, italic */
function parseInline(line: string) {
  return line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

function renderContent(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;
  let listBuffer: React.ReactNode[] = [];

  const flushList = () => {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul key={key++} className="my-5 space-y-2 pl-5 list-none">
        {listBuffer.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-foreground/80 leading-relaxed text-[17px]">
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      elements.push(<div key={key++} className="h-2" />);
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h3 key={key++} className="text-xl font-bold text-foreground mt-10 mb-3 leading-snug">
          {trimmed.slice(4)}
        </h3>
      );
    } else if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <h2 key={key++} className="text-2xl font-bold text-foreground mt-12 mb-4 leading-snug">
          {trimmed.slice(3)}
        </h2>
      );
    } else if (trimmed.startsWith("# ")) {
      flushList();
      elements.push(
        <h1 key={key++} className="text-3xl font-bold text-foreground mt-12 mb-5 leading-snug">
          {trimmed.slice(2)}
        </h1>
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      listBuffer.push(parseInline(trimmed.slice(2)));
    } else {
      flushList();
      elements.push(
        <p key={key++} className="text-[17px] text-foreground/80 leading-[1.85] mb-0">
          {parseInline(trimmed)}
        </p>
      );
    }
  }

  flushList();
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
        <article>
          {/* Cover */}
          {post.cover_image_url && (
            <div className="w-full max-h-[500px] overflow-hidden">
              <img
                src={post.cover_image_url}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Article body — constrained reading width */}
          <div className="container mx-auto px-4 max-w-[680px] py-12 md:py-16">

            {/* Back link */}
            <Link
              to="/blog"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-10"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao blog
            </Link>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-6">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date(post.created_at!).toLocaleDateString("pt-BR", {
                  weekday: "long", day: "2-digit", month: "long", year: "numeric",
                })}
              </span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {readingTime(post.content)} min de leitura
              </span>
            </div>

            {/* Title */}
            <h1 className={`font-display text-3xl md:text-4xl font-bold text-foreground leading-tight mb-8 ${fontClass}`}>
              {post.title}
            </h1>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-10">
              <span className="w-8 h-0.5 bg-primary rounded-full" />
              <span className="w-2 h-0.5 bg-primary/40 rounded-full" />
            </div>

            {/* Content */}
            <div className={`space-y-4 ${fontClass}`}>
              {renderContent(post.content)}
            </div>

            {/* Footer CTA */}
            <div className="mt-16 p-7 rounded-2xl bg-primary/5 border border-primary/15 text-center space-y-3">
              <p className="font-bold text-foreground text-lg">Pronto para transformar sua saúde?</p>
              <p className="text-sm text-muted-foreground">
                Agende sua consulta com Fillipe David e receba um protocolo feito para você.
              </p>
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
