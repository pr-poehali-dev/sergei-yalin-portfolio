import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { nav } from './shared';

interface PortfolioHeaderProps {
  isAdmin: boolean;
  logout: () => void;
  setLoginOpen: (open: boolean) => void;
  scrollTo: (id: string) => void;
}

const PortfolioHeader = ({ isAdmin, logout, setLoginOpen, scrollTo }: PortfolioHeaderProps) => {
  return (
    <>
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
              <button onClick={logout} className="flex items-center gap-2 text-sm text-primary/80 border border-primary/40 rounded-full px-3 py-1.5 transition-colors">
                <Icon name="LogOut" size={15} />
                Выйти
              </button>
            ) : (
              <button onClick={() => setLoginOpen(true)} className="flex items-center gap-2 text-sm text-white border border-white/30 rounded-full px-3 py-1.5 bg-white/10 backdrop-blur-sm transition-colors active:bg-white/20">
                <Icon name="Lock" size={15} />
                Войти
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
    </>
  );
};

export default PortfolioHeader;
