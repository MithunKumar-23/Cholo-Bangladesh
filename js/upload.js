/* ছবি/ভিডিও আপলোড: Cloudinary থাকলে সেখানে, না থাকলে ছবি ছোট করে Firestore-এ */
import { CLOUDINARY } from './config.js';

export const hasCloud = () => !!(CLOUDINARY.cloudName && CLOUDINARY.uploadPreset);

async function cloudUpload(file, kind) {
  const fd = new FormData(); fd.append('file', file); fd.append('upload_preset', CLOUDINARY.uploadPreset);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUDINARY.cloudName)}/${kind}/upload`, { method: 'POST', body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.secure_url) throw new Error('ছবি আপলোড হয়নি: ' + ((j.error && j.error.message) || r.status));
  return j.secure_url;
}

/* maxChars: Firestore-এর একটা ডকুমেন্ট ১ MB পর্যন্ত, তাই ছবির লেখা-রূপ তার কম রাখা হয় */
export async function compress(file, maxDim = 1600, maxChars = 700000) {
  const img = await createImageBitmap(file);
  let scale = Math.min(1, maxDim / Math.max(img.width, img.height)), q = .85, url = '';
  for (let i = 0; i < 12; i++) {
    const c = document.createElement('canvas'); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    url = c.toDataURL('image/jpeg', q);
    if (url.length < maxChars) return url;
    q -= .1; if (q < .5) { scale *= .8; q = .8; }
  }
  return url;
}

/* ফেরত দেয় একটা স্ট্রিং: https://… (Cloudinary) অথবা data:image/… (ছোট করা) */
export async function uploadImage(file, { small = false } = {}) {
  if (!/^image\//.test(file.type)) throw new Error('শুধু ছবির ফাইল দেওয়া যাবে।');
  if (file.size > 20 * 1024 * 1024) throw new Error('ছবি ২০ MB-র বেশি বড়।');
  if (hasCloud()) return cloudUpload(file, 'image');
  return compress(file, small ? 1000 : 1600, small ? 300000 : 700000);
}
export async function uploadVideo(file) {
  if (!hasCloud()) throw new Error('ভিডিও ফাইল আপলোডের জন্য Cloudinary সেটআপ লাগবে। আপাতত ভিডিওর লিংক দিন।');
  if (file.size > 100 * 1024 * 1024) throw new Error('ভিডিও ১০০ MB-র বেশি বড়।');
  return cloudUpload(file, 'video');
}
/* data: URL কে আবার ফাইলে রূপান্তর (অনুমোদনের সময় Cloudinary-তে তুলতে) */
export function dataUrlToFile(u, name = 'photo.jpg') {
  const [h, b] = u.split(','); const mime = (h.match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
  const bin = atob(b); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], name, { type: mime });
}
