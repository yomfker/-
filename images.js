import { removeEdgeBackground } from './core.js';
const cache = new Map();
export function clearImageCache() { cache.clear(); }
export function loadImage(src) {
  if (!src) return Promise.resolve(null);
  if (cache.has(src)) return cache.get(src);
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => { cache.delete(src); reject(Error('無法讀取圖片；請重新上傳 JPG、PNG 或 WebP。')); };
    // Direct Image decoding supports stored data URLs and repository-relative demo assets.
    // Reprocessing never fetches data URLs, blob URLs or a former remote source URL.
    img.src = src === './assets/hero.png' ? new URL('./assets/hero.png', import.meta.url).href : src;
  });
  if (cache.size >= 20) cache.delete(cache.keys().next().value);
  cache.set(src, promise);
  return promise;
}
export async function normalizeFile(file) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw Error('請選擇 JPG、PNG 或 WebP 圖片。');
  if (file.size > 20 * 1024 * 1024) throw Error('圖片請小於 20 MB。');
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(Error('無法讀取檔案，請重新選取。'));
    reader.readAsDataURL(file);
  });
  return imageAsData(data);
}
export async function imageAsData(src) {
  const image = await loadImage(src);
  if (!image || image.width * image.height > 60000000) throw Error('圖片尺寸過大，請先縮小。');
  const ratio = Math.min(1, 1400 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * ratio));
  canvas.height = Math.max(1, Math.round(image.height * ratio));
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}
export async function reprocessImage(item) {
  if (!item.original) throw Error('請先上傳或選擇圖片。');
  // Keep an immutable normalized original. Every tolerance change starts here.
  if (!item.original.startsWith('data:')) item.original = await imageAsData(item.original);
  if (item.cutout.mode === 'none') return item.original;
  const image = await loadImage(item.original);
  const canvas = document.createElement('canvas');
  canvas.width = image.width; canvas.height = image.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  pixels.data.set(removeEdgeBackground(pixels.data, canvas.width, canvas.height, item.cutout.tolerance));
  ctx.putImageData(pixels, 0, 0);
  return canvas.toDataURL('image/png');
}
export async function searchCommons(query, signal) {
  const params = new URLSearchParams({ action: 'query', format: 'json', origin: '*', generator: 'search',
    gsrsearch: query + ' filetype:bitmap', gsrnamespace: '6', gsrlimit: '12', prop: 'imageinfo',
    iiprop: 'url|extmetadata', iiurlwidth: '1000' });
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort(); else signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error('圖片搜尋逾時，請稍後重試。')), 18000);
  let response;
  try { response = await fetch('https://commons.wikimedia.org/w/api.php?' + params, { signal: controller.signal, credentials: 'omit', mode: 'cors' }); }
  finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  if (!response.ok) throw Error('圖片搜尋服務暫時無法使用，請稍後重試或上傳圖片。');
  const data = await response.json();
  if (data.error) throw Error('圖片搜尋服務暫時無法使用，請改用上傳。');
  return Object.values(data.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0)).flatMap(page => {
    const image = page.imageinfo?.[0];
    if (!image) return [];
    const url = image.thumburl || image.url;
    if (!/^https:\/\/(?:upload|thumb)\.wikimedia\.org\//.test(url || '')) return [];
    return [{ title: page.title.replace(/^File:/, ''), image: url, thumb: url,
      source: /^https:\/\/commons\.wikimedia\.org\//.test(image.descriptionurl) ? image.descriptionurl : 'https://commons.wikimedia.org/',
      license: image.extmetadata?.LicenseShortName?.value?.replace(/<[^>]*>/g, '') || '請查看來源授權' }];
  });
}
export async function downloadCandidate(url) {
  const response = await fetch(url, { credentials: 'omit', mode: 'cors', signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw Error('來源不允許下載。請開啟來源、下載圖片，再使用上傳。');
  const blob = await response.blob();
  return normalizeFile(blob);
}
