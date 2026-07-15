import { useState, useRef, useEffect } from 'react';
import PortfolioHeader from '@/components/portfolio/PortfolioHeader';
import AboutGallery from '@/components/portfolio/AboutGallery';
import WorksBlog from '@/components/portfolio/WorksBlog';
import ContactModals from '@/components/portfolio/ContactModals';
import { BG, Track, BlogPost, GET_TRACKS_URL, uploadMusicFile, UPLOAD_URL } from '@/components/portfolio/shared';

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

  const [photos, setPhotos] = useState<{ id: number; url: string; caption: string }[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem('admin_token') || '');
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginInput, setLoginInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const isAdmin = adminToken !== '';

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const fetchWithRetry = async (url: string, retries = 3, delay = 1000): Promise<Response> => {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url);
        if (res.ok) return res;
      } catch {
        if (i < retries - 1) await new Promise((r) => setTimeout(r, delay * (i + 1)));
      }
    }
    return fetch(url);
  };

  useEffect(() => {
    const loadAll = async () => {
      try {
        const res = await fetchWithRetry(`${GET_TRACKS_URL}?resource=all`);
        const data = await res.json();
        setTracks(data.tracks || []);
        setPosts(data.posts || []);
        setBio(data.bio || '');
        setPhotos(data.photos || []);
      } catch {
        // ignore
      }
      setLoading(false);
    };
    loadAll();
  }, []);

  const login = async () => {
    if (!loginInput.trim()) return;
    setLoginError('');
    try {
      const res = await fetch(`${GET_TRACKS_URL}?resource=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': loginInput },
        body: JSON.stringify({}),
      });
      if (res.status === 403) {
        setLoginError('Неверный пароль');
        return;
      }
    } catch {
      // Бэкенд недоступен — сохраняем токен локально, проверка пройдёт при следующем действии
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

      <PortfolioHeader isAdmin={isAdmin} logout={logout} setLoginOpen={setLoginOpen} scrollTo={scrollTo} />

      <AboutGallery
        bio={bio}
        setBio={setBio}
        bioEditing={bioEditing}
        setBioEditing={setBioEditing}
        isAdmin={isAdmin}
        adminToken={adminToken}
        photos={photos}
        setPhotos={setPhotos}
        galleryUploading={galleryUploading}
        setGalleryUploading={setGalleryUploading}
        galleryInputRef={galleryInputRef}
      />

      <WorksBlog
        tracks={tracks}
        loading={loading}
        isAdmin={isAdmin}
        setOpen={setOpen}
        deleteTrack={deleteTrack}
        posts={posts}
        setBlogOpen={setBlogOpen}
        deletePost={deletePost}
        blogOpen={blogOpen}
        blogForm={blogForm}
        setBlogForm={setBlogForm}
        blogImage={blogImage}
        setBlogImage={setBlogImage}
        blogImageRef={blogImageRef}
        onBlogImage={onBlogImage}
        savePost={savePost}
        blogSaving={blogSaving}
      />

      <ContactModals
        contactForm={contactForm}
        setContactForm={setContactForm}
        contactSending={contactSending}
        setContactSending={setContactSending}
        contactSent={contactSent}
        setContactSent={setContactSent}
        open={open}
        setOpen={setOpen}
        form={form}
        setForm={setForm}
        fileRef={fileRef}
        onFile={onFile}
        addWork={addWork}
        uploading={uploading}
        loginOpen={loginOpen}
        setLoginOpen={setLoginOpen}
        loginInput={loginInput}
        setLoginInput={setLoginInput}
        loginError={loginError}
        setLoginError={setLoginError}
        login={login}
      />
    </div>
  );
};

export default Index;