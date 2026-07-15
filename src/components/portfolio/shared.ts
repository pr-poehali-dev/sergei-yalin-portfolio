export const PORTRAIT = 'https://cdn.poehali.dev/projects/8df8bdc8-b92a-4058-b356-f15e068f718c/bucket/0688c4ea-5a52-4d9c-a51b-ccb0a4c91d81.jpg';
export const BG = 'https://cdn.poehali.dev/projects/8df8bdc8-b92a-4058-b356-f15e068f718c/files/64a6cf34-0c87-411f-ab72-0fb5fe05c266.jpg?v=2';

export interface Track {
  id: number;
  title: string;
  type: 'music' | 'poem';
  text?: string;
  url?: string;
}

export interface BlogPost {
  id: number;
  title: string;
  content: string;
  image_url?: string;
  created_at: string;
}

export const initialTracks: Track[] = [
  { id: 2, title: 'Молчание звёзд', type: 'poem', text: 'Когда молчат вечерние огни,\nи город тонет в сумрачной дали —\nя слышу, как поют твои шаги\nв беззвучной музыке земли.' },
];

export const nav = [
  { id: 'about', label: 'Биография' },
  { id: 'gallery', label: 'Галерея' },
  { id: 'works', label: 'Творчество' },
  { id: 'blog', label: 'Блог' },
  { id: 'contact', label: 'Контакты' },
];

export const GET_TRACKS_URL = 'https://functions.poehali.dev/2bc5f2f3-4a26-4ed3-89d2-76c4ea5b3df0';
export const UPLOAD_URL = 'https://functions.poehali.dev/7e4157c5-edf3-4ca4-a0dd-965a1286a5a0';
export const GALLERY_URL = 'https://functions.poehali.dev/0a5e2867-4697-442f-949a-3d22bf2abb58';
export const CHUNK_SIZE = 700 * 1024; // 700KB — вмещается в лимит запроса после base64

export async function uploadMusicFile(file: File, title: string, text: string, token: string): Promise<{ id: number; title: string; type: string; text: string; url: string }> {
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

export const SEND_MESSAGE_URL = 'https://functions.poehali.dev/84851de2-96aa-4b58-9369-a0c311f7fcc0';
export const BIO_PLACEHOLDER = 'Напишите здесь свою биографию и историю творчества...';
