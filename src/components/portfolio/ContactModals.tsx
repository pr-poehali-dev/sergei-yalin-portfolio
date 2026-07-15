import { RefObject } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SEND_MESSAGE_URL } from './shared';

interface ContactModalsProps {
  contactForm: { name: string; email: string; message: string };
  setContactForm: React.Dispatch<React.SetStateAction<{ name: string; email: string; message: string }>>;
  contactSending: boolean;
  setContactSending: (sending: boolean) => void;
  contactSent: boolean;
  setContactSent: (sent: boolean) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  form: { title: string; type: 'music' | 'poem'; text: string; fileName: string; fileObj: File | null };
  setForm: React.Dispatch<React.SetStateAction<{ title: string; type: 'music' | 'poem'; text: string; fileName: string; fileObj: File | null }>>;
  fileRef: RefObject<HTMLInputElement>;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  addWork: () => void;
  uploading: boolean;
  loginOpen: boolean;
  setLoginOpen: (open: boolean) => void;
  loginInput: string;
  setLoginInput: (v: string) => void;
  loginError: string;
  setLoginError: (v: string) => void;
  login: () => void;
}

const ContactModals = ({
  contactForm,
  setContactForm,
  contactSending,
  setContactSending,
  contactSent,
  setContactSent,
  open,
  setOpen,
  form,
  setForm,
  fileRef,
  onFile,
  addWork,
  uploading,
  loginOpen,
  setLoginOpen,
  loginInput,
  setLoginInput,
  loginError,
  setLoginError,
  login,
}: ContactModalsProps) => {
  return (
    <>
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
    </>
  );
};

export default ContactModals;
