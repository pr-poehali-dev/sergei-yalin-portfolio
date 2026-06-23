import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const PORTRAIT = 'https://cdn.poehali.dev/projects/8df8bdc8-b92a-4058-b356-f15e068f718c/bucket/0688c4ea-5a52-4d9c-a51b-ccb0a4c91d81.jpg';
const BG = 'https://cdn.poehali.dev/projects/8df8bdc8-b92a-4058-b356-f15e068f718c/files/64a6cf34-0c87-411f-ab72-0fb5fe05c266.jpg?v=2';

interface Track {
  id: number;
  title: string;
  type: 'music' | 'poem';
  text?: string;
  url?: string;
}

interface BlogPost {
  id: number;
  title: string;
  content: string;
  image_url?: string;
  created_at: string;
}

const initialTracks: Track[] = [
  { id: 2, title: 'Молчание звёзд', type: 'poem', text: 'Когда молчат вечерние огни,\nи город тонет в сумрачной дали —\nя слышу, как поют твои шаги\nв беззвучной музыке земли.' },
];

const nav = [
  { id: 'about', label: 'Биография' },
  { id: 'gallery', label: 'Галерея' },
  { id: 'works', label: 'Творчество' },
  { id: 'blog', label: 'Блог' },
  { id: 'contact', label: 'Контакты' },
];

const GET_TRACKS_URL = 'https://functions.poehali.dev/2bc5f2f3-4a26-4ed3-89d2-76c4ea5b3df0';
const UPLOAD_URL = 'https://functions.poehali.dev/7e4157c5-edf3-4ca4-a0dd-965a1286a5a0';
const CHUNK_SIZE = 700 * 1024; // 700KB — вмещается в лимит запроса после base64

async function uploadMusicFile(file: File, title: string, text: string, token: string): Promise<{ id: number; title: string; type: string; text: string; url: string }> {
  const upload_id = crypto.randomUUID();
  const ext = file.name.split('.').pop() || 'mp3';
  const file_key = `tracks/${upload_id}.${ext}`;
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  for (let i = 0; i < totalChunks; i++) {
    const blob = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    const chunk = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(blob);
    });
    const res = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
      body: JSON.stringify({ action: 'chunk', upload_id, chunk }),
    });
    if (!res.ok) throw new Error(`Ошибка части ${i + 1}`);
  }

  const finishRes = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify({ action: 'finish', upload_id, file_key, title, text }),
  });
  if (!finishRes.ok) throw new Error(`Ошибка завершения загрузки`);
  return finishRes.json();
}

const SEND_MESSAGE_URL = 'https://functions.poehali.dev/84851de2-96aa-4b58-9369-a0c311f7fcc0';
const BIO_PLACEHOLDER = 'Напишите здесь свою биографию и историю творчества...';

const Index = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [form, setForm] = useState<{ title: string; type: 'music' | 'poem'; text: string; fileName: string; fileObj: File | null }>({ title: '', type: 'poem', text: '', fileName: '', fileObj: null });
  const fileRef = useRef<HTMLInputElement>(null);
  const [bio, setBio] = useState('');
  const [bioEditing, setBioEditing] = useState(false);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [blogOpen, setBlogOpen] = useState(false);
  const [blogForm, setBlogForm] = useState({ title: '', content: '' });
  const [blogSaving, setBlogSaving] = useState(false);

  const [blogImage, setBlogImage] = useState<{ b64: string; mime: string; preview: string } | null>(null);
  const blogImageRef = useRef<HTMLInputElement>(null);

  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem('admin_token') || '');
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginInput, setLoginInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const isAdmin = adminToken !== '';

  const navigate = useNavigate();
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    fetch(GET_TRACKS_URL)
      .then((r) => r.json())
      .then((data) => setTracks(data.tracks || []))
      .finally(() => setLoading(false));

    fetch(`${GET_TRACKS_URL}?resource=blog`)
      .then((r) => r.json())
      .then((data) => setPosts(data.posts || []));
  }, []);

  const login = async () => {
    const res = await fetch(`${GET_TRACKS_URL}?resource=blog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Token': loginInput },
      body: JSON.stringify({ action: 'check_auth' }),
    });
    if (res.status === 403) {
      setLoginError('Неверный пароль');
      return;
    }
    sessionStorage.setItem('admin_token', loginInput);
    setAdminToken(loginInput);
    setLoginInput('');
    setLoginError('');
    setLoginOpen(false);
  };

  const logout = () => {
    sessionStorage.removeItem('admin_token');
    setAdminToken('');
  };

  const savePost = async () => {
    if (!blogForm.title.trim() || !blogForm.content.trim()) return;
    setBlogSaving(true);
    const res = await fetch(`${GET_TRACKS_URL}?resource=blog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
      body: JSON.stringify({
        ...blogForm,
        image_b64: blogImage?.b64 || '',
        image_mime: blogImage?.mime || 'image/jpeg',
      }),
    });
    const data = await res.json();
    if (data.ok) {
      const newPost: BlogPost = { id: data.id, title: blogForm.title, content: blogForm.content, image_url: data.image_url, created_at: data.created_at };
      setPosts((p) => [newPost, ...p]);
      setBlogForm({ title: '', content: '' });
      setBlogImage(null);
      setBlogOpen(false);
    }
    setBlogSaving(false);
  };

  const onBlogImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const b64 = result.split(',')[1];
      setBlogImage({ b64, mime: file.type, preview: result });
    };
    reader.readAsDataURL(file);
  };

  const deleteTrack = async (id: number) => {
    await fetch(GET_TRACKS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
      body: JSON.stringify({ action: 'delete_track', id }),
    });
    setTracks((p) => p.filter((t) => t.id !== id));
  };

  const deletePost = async (id: number) => {
    await fetch(`${GET_TRACKS_URL}?resource=blog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
      body: JSON.stringify({ action: 'delete', id }),
    });
    setPosts((p) => p.filter((post) => post.id !== id));
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((f) => ({ ...f, fileName: file.name, fileObj: file, title: f.title || file.name.replace(/\.[^.]+$/, '') }));
  };

  const addWork = async () => {
    if (!form.title.trim()) return;
    if (form.type === 'music' && !form.fileObj) return;
    setUploading(true);

    try {
      let data;
      if (form.type === 'music' && form.fileObj) {
        data = await uploadMusicFile(form.fileObj, form.title, form.text, adminToken);
      } else {
        const res = await fetch(UPLOAD_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
          body: JSON.stringify({ action: 'save_poem', title: form.title, text: form.text }),
        });
        data = await res.json();
      }
      if (!data?.id) throw new Error('Ошибка сохранения');
      setTracks((prev) => [{ id: data.id, title: data.title, type: data.type, text: data.text, url: data.url }, ...prev]);
      setForm({ title: '', type: 'poem', text: '', fileName: '', fileObj: null });
      setOpen(false);
    } catch (err) {
      alert(`Ошибка загрузки: ${err instanceof Error ? err.message : 'попробуйте ещё раз'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grain relative min-h-screen overflow-x-hidden text-foreground" style={{ background: 'transparent' }}>
      <div
        className="animate-drift pointer-events-none fixed inset-0 -z-10 bg-cover bg-center opacity-90"
        style={{ backgroundImage: `url(${BG})` }}
      />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-black/50 via-black/60 to-black/85" />

      {/* NAV */}
      <header className="fixed top-0 z-40 w-full backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="font-display text-2xl tracking-wide text-gradient-gold">
            Сергей Ялин
          </button>
          <div className="hidden gap-8 md:flex items-center">
            {nav.map((n) => (
              <button key={n.id} onClick={() => scrollTo(n.id)} className="text-sm uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary">
                {n.label}
              </button>
            ))}
            {isAdmin ? (
              <button onClick={logout} className="flex items-center gap-1 text-sm text-primary/70 hover:text-primary transition-colors border border-primary/30 rounded-full px-3 py-1">
                <Icon name="LogOut" size={14} />
                Выйти
              </button>
            ) : (
              <button onClick={() => setLoginOpen(true)} className="flex items-center gap-2 text-sm uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors border border-primary/20 hover:border-primary/50 rounded-full px-4 py-1.5">
                <Icon name="Lock" size={13} />
                Войти
              </button>
            )}
          </div>
          {/* Мобильная кнопка */}
          <div className="md:hidden">
            {isAdmin ? (
              <button onClick={logout} className="flex items-center gap-1 text-sm text-primary/70 hover:text-primary transition-colors">
                <Icon name="LogOut" size={18} />
              </button>
            ) : (
              <button onClick={() => setLoginOpen(true)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
                <Icon name="Lock" size={18} />
              </button>
            )}
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="relative flex min-h-screen items-center justify-center px-6 text-center">
        <div className="animate-float-up max-w-3xl">
          <p className="mb-6 text-sm uppercase tracking-[0.4em] text-primary/80">поэт · музыкант</p>
          <h1 className="font-display text-6xl leading-none md:text-8xl">
            Между словом<br /><span className="italic text-gradient-gold">и тишиной</span>
          </h1>
          <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Стихи и музыка Сергея Ялина — попытка уловить то, что живёт за гранью обыденного. Голос, рождённый из сумрака и света.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button size="lg" onClick={() => scrollTo('works')} className="rounded-full px-8">
              <Icon name="Music" size={18} className="mr-2" /> Слушать и читать
            </Button>
            <Button size="lg" variant="outline" onClick={() => scrollTo('about')} className="rounded-full border-primary/40 bg-transparent px-8">
              О авторе
            </Button>
          </div>
        </div>
        <Icon name="ChevronDown" size={28} className="absolute bottom-10 animate-bounce text-primary/60" />
      </section>

      {/* ABOUT */}
      <section id="about" className="mx-auto max-w-5xl px-6 py-28">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="mist-glow overflow-hidden rounded-2xl border border-primary/20">
            <img src={PORTRAIT} alt="Сергей Ялин" className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="mb-3 text-sm uppercase tracking-[0.3em] text-primary/80">Биография</p>
            <h2 className="font-display text-4xl md:text-5xl">История творчества</h2>
            <div className="mt-6">
              {bioEditing ? (
                <div className="space-y-3">
                  <Textarea
                    autoFocus
                    rows={8}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={BIO_PLACEHOLDER}
                    className="border-primary/30 bg-background/60 leading-relaxed text-foreground backdrop-blur-sm"
                  />
                  <div className="flex gap-3">
                    <Button size="sm" onClick={() => setBioEditing(false)} className="rounded-full px-6">
                      <Icon name="Check" size={15} className="mr-1" /> Сохранить
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setBioEditing(false); }} className="rounded-full border-primary/30 bg-transparent px-6">
                      Отмена
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => isAdmin && setBioEditing(true)}
                  className={`group relative rounded-xl border border-dashed border-primary/20 p-4 transition-colors ${isAdmin ? 'cursor-text hover:border-primary/50' : 'cursor-default'}`}
                >
                  {bio ? (
                    <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">{bio}</p>
                  ) : (
                    <p className="italic text-muted-foreground/50">{isAdmin ? BIO_PLACEHOLDER : 'Биография скоро появится...'}</p>
                  )}
                  {isAdmin && (
                    <span className="absolute right-3 top-3 flex items-center gap-1 text-xs text-primary/0 transition-all group-hover:text-primary/70">
                      <Icon name="Pencil" size={12} /> редактировать
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section id="gallery" className="mx-auto max-w-5xl px-6 py-20">
        <p className="mb-3 text-center text-sm uppercase tracking-[0.3em] text-primary/80">Галерея</p>
        <h2 className="text-center font-display text-4xl md:text-5xl">Личные фото и портреты</h2>
        <div className="mt-12 flex justify-center">
          <div className="group overflow-hidden rounded-xl border border-primary/20 max-w-sm w-full">
            <img src={PORTRAIT} alt="Сергей Ялин" className="h-72 w-full object-cover transition-transform duration-700 group-hover:scale-110" />
          </div>
        </div>
      </section>

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
                          className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive"
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
                          className="mt-1 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive"
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

      {/* CONTACT */}
      <section id="contact" className="mx-auto max-w-2xl px-6 py-28 text-center">
        <p className="mb-3 text-sm uppercase tracking-[0.3em] text-primary/80">Контакты</p>
        <h2 className="font-display text-4xl md:text-5xl">Связаться с автором</h2>
        <p className="mt-4 text-muted-foreground">Напишите Сергею — о сотрудничестве, концертах или просто о впечатлениях.</p>
        {contactSent ? (
          <div className="mt-10 rounded-xl border border-primary/30 bg-card/60 p-8 text-center">
            <Icon name="CheckCircle2" size={40} className="mx-auto mb-4 text-primary" />
            <p className="font-display text-2xl">Сообщение отправлено!</p>
            <p className="mt-2 text-muted-foreground">Сергей обязательно ответит вам.</p>
            <Button variant="outline" className="mt-6 border-primary/30 bg-transparent" onClick={() => { setContactSent(false); setContactForm({ name: '', email: '', message: '' }); }}>
              Отправить ещё
            </Button>
          </div>
        ) : (
          <div className="mt-10 space-y-4 text-left">
            <Input
              placeholder="Ваше имя"
              className="h-12 border-primary/20 bg-card/60"
              value={contactForm.name}
              onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
            />
            <Input
              placeholder="Email"
              type="email"
              className="h-12 border-primary/20 bg-card/60"
              value={contactForm.email}
              onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
            />
            <Textarea
              placeholder="Сообщение"
              rows={4}
              className="border-primary/20 bg-card/60"
              value={contactForm.message}
              onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
            />
            <Button
              size="lg"
              className="w-full rounded-full"
              disabled={contactSending}
              onClick={async () => {
                if (!contactForm.name || !contactForm.email || !contactForm.message) return;
                setContactSending(true);
                try {
                  const res = await fetch(SEND_MESSAGE_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(contactForm),
                  });
                  if (res.ok) setContactSent(true);
                  else alert('Ошибка отправки, попробуйте позже');
                } finally {
                  setContactSending(false);
                }
              }}
            >
              {contactSending ? <><Icon name="Loader2" size={18} className="mr-2 animate-spin" />Отправляю...</> : 'Отправить сообщение'}
            </Button>
          </div>
        )}
        <div className="mt-12 flex justify-center gap-6 text-muted-foreground">
          {['Send', 'Instagram', 'Youtube', 'Mail'].map((ic) => (
            <button key={ic} className="transition-colors hover:text-primary"><Icon name={ic} size={22} /></button>
          ))}
        </div>
      </section>

      <footer className="border-t border-primary/10 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Сергей Ялин. Стихи и музыка.
      </footer>

      {/* UPLOAD MODAL */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="animate-float-up w-full max-w-md rounded-2xl border border-primary/30 bg-card p-8" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-3xl">Новое произведение</h3>
            <div className="mt-6 space-y-4">
              <Input placeholder="Название" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="border-primary/20 bg-background" />
              <div className="flex gap-3">
                {(['poem', 'music'] as const).map((tp) => (
                  <button
                    key={tp}
                    onClick={() => setForm({ ...form, type: tp })}
                    className={`flex-1 rounded-lg border py-2 text-sm transition-colors ${form.type === tp ? 'border-primary bg-primary text-primary-foreground' : 'border-primary/20 text-muted-foreground'}`}
                  >
                    {tp === 'poem' ? 'Стих' : 'Трек'}
                  </button>
                ))}
              </div>
              {form.type === 'poem' ? (
                <Textarea placeholder="Текст стихотворения" rows={5} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} className="border-primary/20 bg-background" />
              ) : (
                <button onClick={() => fileRef.current?.click()} className={`flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 transition-colors ${form.fileName ? 'border-primary/60 text-primary' : 'border-primary/40 text-muted-foreground hover:text-primary'}`}>
                  <Icon name={form.fileName ? 'CheckCircle2' : 'Upload'} size={22} />
                  <span className="px-4 text-center text-sm">{form.fileName || 'Выбрать аудиофайл (MP3, WAV)'}</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={onFile} />
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 border-primary/30 bg-transparent" onClick={() => setOpen(false)} disabled={uploading}>Отмена</Button>
                <Button className="flex-1" onClick={addWork} disabled={uploading}>
                  {uploading ? <><Icon name="Loader2" size={16} className="mr-2 animate-spin" />Загружаю...</> : 'Добавить'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOGIN MODAL */}
      {loginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm" onClick={() => { setLoginOpen(false); setLoginError(''); setLoginInput(''); }}>
          <div className="w-full max-w-sm rounded-2xl border border-primary/30 bg-card p-8" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center gap-3">
              <Icon name="Lock" size={20} className="text-primary/60" />
              <h3 className="font-display text-2xl">Вход для автора</h3>
            </div>
            <div className="space-y-4">
              <Input
                type="password"
                placeholder="Пароль"
                value={loginInput}
                onChange={(e) => { setLoginInput(e.target.value); setLoginError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && login()}
                autoFocus
                className="border-primary/20 bg-background"
              />
              {loginError && <p className="text-sm text-destructive">{loginError}</p>}
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1 border-primary/30 bg-transparent" onClick={() => { setLoginOpen(false); setLoginError(''); setLoginInput(''); }}>Отмена</Button>
                <Button className="flex-1" onClick={login}>Войти</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;