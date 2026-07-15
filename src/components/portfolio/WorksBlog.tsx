import { RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Track, BlogPost } from './shared';

interface WorksBlogProps {
  tracks: Track[];
  loading: boolean;
  isAdmin: boolean;
  setOpen: (open: boolean) => void;
  deleteTrack: (id: number) => void;
  posts: BlogPost[];
  setBlogOpen: (open: boolean) => void;
  deletePost: (id: number) => void;
  blogOpen: boolean;
  blogForm: { title: string; content: string };
  setBlogForm: React.Dispatch<React.SetStateAction<{ title: string; content: string }>>;
  blogImage: { b64: string; mime: string; preview: string } | null;
  setBlogImage: (img: { b64: string; mime: string; preview: string } | null) => void;
  blogImageRef: RefObject<HTMLInputElement>;
  onBlogImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  savePost: () => void;
  blogSaving: boolean;
}

const WorksBlog = ({
  tracks,
  loading,
  isAdmin,
  setOpen,
  deleteTrack,
  posts,
  setBlogOpen,
  deletePost,
  blogOpen,
  blogForm,
  setBlogForm,
  blogImage,
  setBlogImage,
  blogImageRef,
  onBlogImage,
  savePost,
  blogSaving,
}: WorksBlogProps) => {
  const navigate = useNavigate();

  return (
    <>
      {/* WORKS */}
      <section id="works" className="mx-auto max-w-5xl px-6 py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mb-3 text-sm uppercase tracking-[0.3em] text-primary/80">Творчество</p>
            <h2 className="font-display text-4xl md:text-5xl">Треки и стихи</h2>
          </div>
          {isAdmin && (
            <Button onClick={() => setOpen(true)} variant="outline" className="rounded-full border-primary/40 bg-transparent">
              <Icon name="Plus" size={18} className="mr-2" /> Загрузить
            </Button>
          )}
        </div>

        <div className="mt-10 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Icon name="Loader2" size={24} className="mr-3 animate-spin" /> Загружаю...
            </div>
          )}
          {!loading && tracks.length === 0 && (
            <div className="py-12 text-center text-muted-foreground/60 italic">Пока нет произведений — нажмите «Загрузить», чтобы добавить первое.</div>
          )}
          {tracks.map((t) => (
            <div key={t.id} className="group rounded-xl border border-primary/15 bg-card/60 p-6 backdrop-blur-sm transition-colors hover:border-primary/40">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                  <Icon name={t.type === 'music' ? 'Music2' : 'Feather'} size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-display text-2xl">{t.title}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs uppercase tracking-widest text-muted-foreground">{t.type === 'music' ? 'трек' : 'стих'}</span>
                      {isAdmin && (
                        <button
                          onClick={() => deleteTrack(t.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Icon name="Trash2" size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                  {t.type === 'poem' && t.text && (
                    <p className="mt-3 whitespace-pre-line italic leading-relaxed text-muted-foreground">{t.text}</p>
                  )}
                  {t.type === 'music' && t.url && (
                    <audio controls src={t.url} className="mt-3 w-full" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BLOG */}
      <section id="blog" className="mx-auto max-w-4xl px-6 py-28">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <p className="mb-3 text-sm uppercase tracking-[0.3em] text-primary/80">Блог</p>
            <h2 className="font-display text-4xl md:text-5xl">Чем хочу поделиться<br />с читателями</h2>
          </div>
          {isAdmin && (
            <Button onClick={() => setBlogOpen(true)} className="rounded-full" size="sm">
              <Icon name="Plus" size={16} className="mr-2" /> Новая запись
            </Button>
          )}
        </div>

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-primary/10 bg-card/40 py-16 text-center text-muted-foreground">
            <Icon name="BookOpen" size={40} className="mx-auto mb-4 opacity-30" />
            <p>Пока нет записей. Напишите первую!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => {
              const preview = post.content.slice(0, 200);
              const hasMore = post.content.length > 200;
              return (
                <article
                  key={post.id}
                  className="group overflow-hidden rounded-2xl border border-primary/10 bg-card/60 transition-colors hover:border-primary/30 cursor-pointer"
                  onClick={() => navigate(`/blog/${post.id}`)}
                >
                  {post.image_url && (
                    <img src={post.image_url} alt={post.title} className="h-56 w-full object-cover" />
                  )}
                  <div className="p-7">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="mb-2 text-xs text-muted-foreground">
                          {new Date(post.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <h3 className="font-display text-2xl">{post.title}</h3>
                        <p className="mt-3 leading-relaxed text-muted-foreground line-clamp-3">
                          {preview}{hasMore ? '...' : ''}
                        </p>
                        {hasMore && (
                          <span className="mt-3 inline-flex items-center gap-1 text-sm text-primary/80 group-hover:text-primary transition-colors">
                            Читать далее <Icon name="ArrowRight" size={14} />
                          </span>
                        )}
                      </div>
                      {isAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deletePost(post.id); }}
                          className="mt-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Icon name="Trash2" size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {blogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm" onClick={() => { setBlogOpen(false); setBlogImage(null); }}>
            <div className="w-full max-w-lg rounded-2xl border border-primary/30 bg-card p-8" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display text-3xl mb-6">Новая запись</h3>
              <div className="space-y-4">
                <Input
                  placeholder="Заголовок"
                  value={blogForm.title}
                  onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
                  className="border-primary/20 bg-background"
                />
                <Textarea
                  placeholder="Текст записи..."
                  rows={6}
                  value={blogForm.content}
                  onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                  className="border-primary/20 bg-background"
                />
                <input ref={blogImageRef} type="file" accept="image/*" className="hidden" onChange={onBlogImage} />
                {blogImage ? (
                  <div className="relative overflow-hidden rounded-xl">
                    <img src={blogImage.preview} alt="preview" className="h-40 w-full object-cover" />
                    <button
                      onClick={() => setBlogImage(null)}
                      className="absolute right-2 top-2 rounded-full bg-background/80 p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Icon name="X" size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => blogImageRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 py-4 text-sm text-muted-foreground hover:border-primary/60 hover:text-primary transition-colors"
                  >
                    <Icon name="Image" size={18} />
                    Прикрепить фото (необязательно)
                  </button>
                )}
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 border-primary/30 bg-transparent" onClick={() => { setBlogOpen(false); setBlogImage(null); }}>Отмена</Button>
                  <Button className="flex-1" onClick={savePost} disabled={blogSaving}>
                    {blogSaving ? <><Icon name="Loader2" size={16} className="mr-2 animate-spin" />Сохраняю...</> : 'Опубликовать'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
};

export default WorksBlog;
