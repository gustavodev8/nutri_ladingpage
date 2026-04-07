import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Clock, ArrowRight, Loader2, BookOpen } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import { fetchBlogPosts, type BlogPost } from "@/lib/supabase";

function readingTime(text: string) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function excerpt(content: string, max = 160) {
  const clean = content.replace(/#{1,6}\s/g, "").replace(/[*_`>-]/g, "").trim();
  return clean.length > max ? clean.slice(0, max).trimEnd() + "…" : clean;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ── Featured (first post) ────────────────────────────────────────────────────
const FeaturedPost = ({ post }: { post: BlogPost }) => (
  <Link
    to={`/blog/${post.slug}`}
    className="group grid md:grid-cols-2 gap-0 rounded-2xl border border-border bg-card overflow-hidden hover:shadow-xl transition-shadow duration-300"
  >
    {/* Image */}
    <div className="aspect-[4/3] md:aspect-auto bg-muted overflow-hidden order-1">
      {post.cover_image_url ? (
        <img
          src={post.cover_image_url}
          alt={post.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
      ) : (
        <div className="w-full h-full min-h-[240px] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
          <BookOpen className="h-14 w-14 text-primary/20" />
        </div>
      )}
    </div>

    {/* Content */}
    <div className="flex flex-col justify-center p-8 md:p-10 order-2 gap-5">
      <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
        <span className="w-6 h-px bg-primary" />
        Destaque
      </span>
      <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground leading-snug group-hover:text-primary transition-colors duration-200">
        {post.title}
      </h2>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {excerpt(post.content, 200)}
      </p>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDate(post.created_at!)}
        </span>
        <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {readingTime(post.content)} min de leitura
        </span>
      </div>
      <span className="flex items-center gap-2 text-sm font-semibold text-primary mt-1 group-hover:gap-3 transition-all duration-200">
        Ler artigo <ArrowRight className="h-4 w-4" />
      </span>
    </div>
  </Link>
);

// ── Editorial row (remaining posts) ─────────────────────────────────────────
const EditorialRow = ({ post, last }: { post: BlogPost; last: boolean }) => (
  <Link
    to={`/blog/${post.slug}`}
    className={`group flex items-start gap-6 py-7 ${!last ? "border-b border-border" : ""} hover:bg-muted/30 -mx-4 px-4 rounded-xl transition-colors duration-200`}
  >
    {/* Meta column */}
    <div className="hidden sm:flex flex-col items-end gap-1 min-w-[90px] shrink-0 pt-0.5">
      <span className="text-xs text-primary font-semibold tabular-nums">
        {formatDate(post.created_at!)}
      </span>
      <span className="text-[11px] text-muted-foreground">
        {readingTime(post.content)} min
      </span>
    </div>

    {/* Divider */}
    <div className="hidden sm:flex flex-col items-center gap-1 pt-1.5 shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
      <span className="w-px flex-1 min-h-[40px] bg-border" />
    </div>

    {/* Text */}
    <div className="flex-1 min-w-0">
      {/* Mobile date */}
      <p className="sm:hidden text-xs text-primary font-semibold mb-1">{formatDate(post.created_at!)}</p>
      <h3 className="font-display font-bold text-foreground text-base md:text-lg leading-snug group-hover:text-primary transition-colors duration-200 line-clamp-2 mb-2">
        {post.title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
        {excerpt(post.content, 130)}
      </p>
    </div>

    {/* Thumbnail */}
    <div className="w-20 h-20 md:w-28 md:h-20 rounded-xl bg-muted overflow-hidden shrink-0">
      {post.cover_image_url ? (
        <img
          src={post.cover_image_url}
          alt={post.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
          <BookOpen className="h-6 w-6 text-primary/30" />
        </div>
      )}
    </div>
  </Link>
);

// ── Page ─────────────────────────────────────────────────────────────────────
const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    fetchBlogPosts(true).then((data) => {
      setPosts(data);
      setLoading(false);
    });
  }, []);

  const [featured, ...rest] = posts;

  return (
    <PageLayout>
      {/* Hero */}
      <section className="bg-green-light py-16 md:py-24">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-widest text-primary mb-3">Blog</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground leading-tight mb-4">
            Nutrição com <span className="text-primary">ciência e propósito</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Artigos, dicas e protocolos do nutricionista Fillipe David — sem mitos, sem atalhos.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <BookOpen className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="text-lg font-semibold text-foreground">Nenhum artigo publicado ainda</p>
              <p className="text-muted-foreground text-sm">Em breve novos conteúdos por aqui.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {/* Featured post */}
              <FeaturedPost post={featured} />

              {/* Editorial list */}
              {rest.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Mais artigos
                    </span>
                    <span className="flex-1 h-px bg-border" />
                  </div>
                  <div>
                    {rest.map((post, i) => (
                      <EditorialRow key={post.id} post={post} last={i === rest.length - 1} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  );
};

export default Blog;
