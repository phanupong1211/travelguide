import { supabase } from './supabase';

const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'bills';
const tripId = Number(process.env.NEXT_PUBLIC_TRIP_ID || 1);

export function storageAvailable() {
  return Boolean(supabase);
}

export async function imageToCanvas(img: HTMLImageElement, maxWidth = 1600) {
  const scale = img.width > maxWidth ? maxWidth / img.width : 1;
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

export async function compressImageToBlob(file: File, targetBytes = 300_000, maxWidth = 1600): Promise<{ blob: Blob; mime: string }>
{
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Image load failed'));
    i.src = URL.createObjectURL(file);
  });
  const canvas = await imageToCanvas(img, maxWidth);
  URL.revokeObjectURL(img.src);

  let quality = 0.8;
  const mime = 'image/webp';
  let blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b as Blob), mime, quality));
  // Reduce quality gradually
  while (blob.size > targetBytes && quality > 0.4) {
    quality -= 0.1;
    // eslint-disable-next-line no-await-in-loop
    blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b as Blob), mime, quality));
  }
  return { blob, mime };
}

function buildBillPath(ext = 'webp') {
  const dt = new Date();
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const uuid = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : String(Date.now());
  return `trip_${tripId}/${y}-${m}/${uuid}.${ext}`;
}

export async function uploadBillBlob(blob: Blob, ext = 'webp'): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');
  const path = buildBillPath(ext);
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: `image/${ext}`,
    upsert: false,
  });
  if (error) throw error;
  return path; // Store path in DB
}

export async function getSignedBillUrl(path: string, expiresIn = 60 * 5): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteBill(path: string) {
  if (!supabase) return;
  await supabase.storage.from(bucket).remove([path]);
}

export function isStoragePath(v?: string | null) {
  if (!v) return false;
  return !(v.startsWith('data:') || v.startsWith('http://') || v.startsWith('https://'));
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

