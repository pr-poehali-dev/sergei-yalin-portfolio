import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';

const GET_TRACKS_URL = 'https://functions.poehali.dev/2bc5f2f3-4a26-4ed3-89d2-76c4ea5b3df0';

interface BlogPost {
  id: number;
  title: string;
  content: string;
  image_url?: string;
  created_at: string;
}

const BlogPostPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${GET_TRACKS_URL}?resource=blog`)
      .then((r) => r.json())
      .then((data) => {
        const found = (data.posts || []).find((p: BlogPost) => p.id === Number(id));
        setPost(found || null);
        if (found) {
          document.title = `${found.title} — Сергей Ялин`;
          const desc = found.content.slice(0, 160).replace(/\n/g, ' ');
          document.querySelector('meta[name="description"]')?.setAttribute('content', desc);
          document.querySelector('meta[property="og:title"]')?.setAttribute('content', found.title);
          document.querySelector('meta[property="og:description"]')?.setAttribute('content', desc);
          if (found.image_url) {
            document.querySelector('meta[property="og:image"]')?.setAttribute('content', found.image_url);
          }
        }
      })
      .finally(() => setLoading(false));

    return () => {
      document.title = 'Сергей Ялин — стихи, музыка и блог';
      document.querySelector('meta[name="description"]')?.setAttribute('content', 'Сергей Ялин — поэт и музыкант. Авторские стихи, песни, биография, галерея, блог и форма обратной связи.');
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Icon name="Loader2" size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-center">
        <Icon name="FileX" size={48} className="text-muted-foreground opacity-40" />
        <p className="text-muted-foreground">Запись не найдена</p>
        <Button variant="outline" onClick={() => navigate('/#blog')} className="border-primary/30 bg-transparent">
          Вернуться в блог
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Шапка */}
      <header className="sticky top-0 z-40 border-b border-primary/10 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <Icon name="ArrowLeft" size={18} />
            Назад
          </button>
          <span className="text-muted-foreground/40">|</span>
          <span className="text-sm text-muted-foreground">Блог Сергея Ялина</span>
        </div>
      </header>

      {/* Обложка */}
      {post.image_url && (
        <div className="relative h-72 w-full overflow-hidden md:h-96">
          <img src={post.image_url} alt={post.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </div>
      )}

      {/* Контент */}
      <article className="mx-auto max-w-2xl px-6 py-12">
        <p className="mb-4 text-sm text-primary/80 uppercase tracking-widest">
          {new Date(post.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <h1 className="font-display text-4xl leading-tight md:text-5xl">{post.title}</h1>
        <div className="mt-8 border-t border-primary/10 pt-8">
          <p className="whitespace-pre-wrap text-lg leading-8 text-muted-foreground">{post.content}</p>
        </div>

        <div className="mt-16 border-t border-primary/10 pt-8 text-center">
          <p className="mb-4 text-sm text-muted-foreground">Другие записи автора</p>
          <Button onClick={() => navigate('/#blog')} className="rounded-full px-8">
            Перейти в блог
          </Button>
        </div>
      </article>
    </div>
  );
};

export default BlogPostPage;