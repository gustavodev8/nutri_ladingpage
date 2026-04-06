import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Clock, ArrowRight, Loader2, BookOpen } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import { fetchBlogPosts, type BlogPost } from "@/lib/supabase";

function readingTime(text: string) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

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

      {/* Posts */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                  {/* Cover */}
                  <div className="aspect-video bg-muted overflow-hidden">
                    {post.cover_image_url ? (
                      <img
                        src={post.cover_image_url}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                        <BookOpen className="h-10 w-10 text-primary/30" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-col flex-1 p-5 gap-3">
                    <h2 className="font-display font-bold text-lg text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1">
                      {post.content.replace(/[#*_`>]/g, "").slice(0, 180)}…
                    </p>
                    <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {new Date(post.created_at!).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {readingTime(post.content)} min de leitura
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-semibold text-primary mt-1">
                      Ler artigo <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  );
};

export default Blog;
