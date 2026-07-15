import { RefObject } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PORTRAIT, GET_TRACKS_URL, GALLERY_URL, BIO_PLACEHOLDER } from './shared';

interface Photo {
  id: number;
  url: string;
  caption: string;
}

interface AboutGalleryProps {
  bio: string;
  setBio: (bio: string) => void;
  bioEditing: boolean;
  setBioEditing: (editing: boolean) => void;
  isAdmin: boolean;
  adminToken: string;
  photos: Photo[];
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
  galleryUploading: boolean;
  setGalleryUploading: (uploading: boolean) => void;
  galleryInputRef: RefObject<HTMLInputElement>;
}

const AboutGallery = ({
  bio,
  setBio,
  bioEditing,
  setBioEditing,
  isAdmin,
  adminToken,
  photos,
  setPhotos,
  galleryUploading,
  setGalleryUploading,
  galleryInputRef,
}: AboutGalleryProps) => {
  return (
    <>
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
                    <Button size="sm" onClick={async () => {
                      await fetch(`${GET_TRACKS_URL}?resource=bio`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
                        body: JSON.stringify({ bio }),
                      });
                      setBioEditing(false);
                    }} className="rounded-full px-6">
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
        <div className="mb-12 flex items-end justify-between">
          <div>
            <p className="mb-3 text-sm uppercase tracking-[0.3em] text-primary/80">Галерея</p>
            <h2 className="font-display text-4xl md:text-5xl">Личные фото и портреты</h2>
          </div>
          {isAdmin && (
            <button
              onClick={() => galleryInputRef.current?.click()}
              disabled={galleryUploading}
              className="flex items-center gap-2 rounded-full border border-primary/40 px-4 py-2 text-sm text-primary/80 transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
            >
              <Icon name={galleryUploading ? 'Loader2' : 'ImagePlus'} size={16} className={galleryUploading ? 'animate-spin' : ''} />
              {galleryUploading ? 'Загрузка...' : 'Добавить фото'}
            </button>
          )}
        </div>
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setGalleryUploading(true);
            const b64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve((reader.result as string).split(',')[1]);
              reader.readAsDataURL(file);
            });
            const res = await fetch(`${GALLERY_URL}?resource=gallery`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
              body: JSON.stringify({ image_b64: b64, image_mime: file.type }),
            });
            const data = await res.json();
            if (data.ok) setPhotos((p) => [{ id: data.id, url: data.url, caption: '' }, ...p]);
            setGalleryUploading(false);
            e.target.value = '';
          }}
        />
        {photos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-primary/20 py-20 text-center text-muted-foreground">
            <Icon name="Image" size={40} className="mx-auto mb-4 opacity-30" />
            <p>{isAdmin ? 'Нажмите «Добавить фото» чтобы загрузить первое' : 'Фотографии скоро появятся...'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {photos.map((photo) => (
              <div key={photo.id} className="group relative overflow-hidden rounded-xl border border-primary/20 aspect-square">
                <img src={photo.url} alt={photo.caption || 'Фото'} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                {isAdmin && (
                  <button
                    onClick={async () => {
                      await fetch(`${GALLERY_URL}?resource=gallery`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
                        body: JSON.stringify({ action: 'delete', id: photo.id }),
                      });
                      setPhotos((p) => p.filter((ph) => ph.id !== photo.id));
                    }}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition-opacity md:opacity-0 md:group-hover:opacity-100 hover:bg-destructive"
                  >
                    <Icon name="Trash2" size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
};

export default AboutGallery;
