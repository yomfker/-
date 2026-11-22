export const uid = () => globalThis.crypto?.randomUUID?.() || `p${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
export const fields = [
  ['name', '比賽名稱', 'textarea', 60], ['date', '比賽日期', 'date', 20],
  ['checkin', '報到時間', 'text', 40], ['start', '開賽時間', 'text', 40],
  ['venue', '活動場地', 'text', 70], ['address', '地址', 'text', 120],
  ['format', '賽制人數', 'text', 60], ['fee', '報名費用', 'text', 40],
  ['link', '報名連結', 'url', 1000], ['prizes', '比賽獎品', 'textarea', 700],
  ['host', '主辦單位', 'text', 100], ['cohost', '協辦單位', 'text', 100],
  ['sponsor', '贊助商', 'text', 100]
];
export const demoInfo = {
  name: '第二屆\n南野盃\n陀螺大賽', date: '2026-12-06', checkin: '13:00', start: '人滿即開賽',
  venue: '夾舖子遊樂園', address: '臺南市永康區復國里復華三街95號', format: '128 人・個人淘汰賽',
  fee: 'NT$ 350', link: 'https://example.com/tournament', prizes: '精美水晶獎盃、限定陀螺\n依名次先後選取獎品\n現場加碼抽獎活動',
  host: '南野陀螺交流團', cohost: '夾舖子遊樂園', sponsor: ''
};
export const fonts = [
  { id: 'sans', name: '現代黑體', family: '"Microsoft JhengHei", "PingFang TC", "Noto Sans CJK TC", sans-serif' },
  { id: 'serif', name: '經典明體', family: '"PMingLiU", "Songti TC", "Noto Serif CJK TC", serif' },
  { id: 'kai', name: '傳統楷體', family: '"DFKai-SB", "BiauKai", "KaiTi", cursive' },
  { id: 'hei', name: '厚實黑體', family: '"Microsoft YaHei", "Heiti TC", "SimHei", sans-serif' },
  { id: 'mono', name: '等寬字體', family: '"Consolas", "Menlo", "Microsoft JhengHei", monospace' }
];
export const palettes = [
  ['冠軍金', '#d9a820', '#eee8d9', '#141b17'], ['極速藍', '#4b81ad', '#e8eef2', '#172635'],
  ['烈焰紅', '#c65d4a', '#f0e6de', '#301e1b'], ['森林綠', '#65866a', '#e7ecdf', '#1c2c22'],
  ['幻影紫', '#9276af', '#ebe6f0', '#2a2236'], ['銀翼灰', '#94a2a7', '#eef0ed', '#242c2f']
];
const rect = (x, y, w, h) => ({ x, y, w, h });
// Content rectangles are disjoint. Background artwork is drawn before opaque reading panels.
export const templates = [
  { id: 'classic', name: '冠軍斜線', description: '原稿風格・大字與金黑斜線',
    title: rect(58, 157, 510, 510), hero: rect(0, 690, 650, 650),
    info: rect(674, 330, 466, 875), prizes: rect(430, 1360, 720, 265), footer: rect(55, 1500, 330, 145), brandY: 72,
    host: rect(674, 145, 466, 142), titleSize: 154 },
  { id: 'speed', name: '極速切角', description: '俐落切角・上下分區',
    title: rect(82, 158, 1036, 295), hero: rect(65, 510, 540, 735),
    info: rect(658, 510, 460, 735), prizes: rect(78, 1310, 1044, 270), footer: rect(85, 1615, 1030, 58), brandY: 92, titleSize: 116 },
  { id: 'spotlight', name: '聚光舞台', description: '圓形光暈・主角登場',
    title: rect(95, 158, 1010, 292), hero: rect(65, 520, 560, 735),
    info: rect(680, 520, 435, 735), prizes: rect(82, 1320, 1036, 260), footer: rect(85, 1615, 1030, 58), brandY: 85, titleSize: 116 },
  { id: 'minimal', name: '簡約分欄', description: '乾淨留白・清楚閱讀',
    title: rect(85, 155, 1030, 305), hero: rect(72, 535, 540, 710),
    info: rect(666, 530, 450, 730), prizes: rect(85, 1320, 1030, 260), footer: rect(85, 1615, 1030, 58), brandY: 82, titleSize: 116 },
  { id: 'grid', name: '競技格線', description: '技術格線・左右對調',
    title: rect(80, 160, 1040, 292), hero: rect(610, 530, 520, 730),
    info: rect(78, 530, 468, 730), prizes: rect(80, 1320, 1040, 260), footer: rect(85, 1615, 1030, 58), brandY: 88, titleSize: 116 }
];
export const clamp = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;
export const defaultCutout = () => ({ mode: 'edge', tolerance: 42, appliedTolerance: 42, appliedMode: 'edge' });
export const defaultTransform = () => ({ scale: 100, x: 0, y: 0, rotation: 0 });
export function makePrize(rank = '', name = '') {
  return { id: uid(), rank, name, note: '', image: '', original: '', source: '', transform: defaultTransform(), cutout: defaultCutout() };
}
export function createProject() {
  return { version: 2, info: { ...demoInfo }, template: 'classic', colors: { accent: '#d9a820', paper: '#eee8d9', ink: '#141b17' },
    typography: { titleFont: 'sans', bodyFont: 'sans', title: 100, info: 100, prize: 100, footer: 100 },
    hero: { image: './assets/hero.png', original: './assets/hero.png', source: '', transform: defaultTransform(), cutout: defaultCutout() },
    prizes: [makePrize('冠軍', '限定陀螺'), makePrize('亞軍', '戰鬥陀螺 CX11'), makePrize('季軍', '精美水晶獎盃')] };
}
export function validLink(value) {
  if (!value) return true;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}
export function wrapText(ctx, text, width) {
  const lines = [];
  for (const paragraph of String(text).split('\n')) {
    let line = '';
    for (const char of paragraph) {
      if (line && ctx.measureText(line + char).width > width) { lines.push(line); line = char; } else line += char;
    }
    lines.push(line);
  }
  return lines;
}
export function wrapTitleWords(ctx, text, width) {
  const lines = []; let current = '';
  for (const token of String(text).trim().split(/[\s　]+/)) {
    const joined = current ? current + '　' + token : token;
    if (current && ctx.measureText(joined).width > width) { lines.push(current); current = ''; }
    if (ctx.measureText(token).width > width) {
      const parts = wrapText(ctx, token, width); lines.push(...parts.slice(0, -1)); current = parts.at(-1);
    } else current = current ? current + '　' + token : token;
  }
  if (current) lines.push(current);
  return lines;
}
export function imagePlacement(imageW, imageH, box, transform) {
  const ratio = Math.min(box.w / imageW, box.h / imageH) * transform.scale / 100;
  return { x: box.x + box.w / 2 + transform.x, y: box.y + box.h / 2 + transform.y,
    w: imageW * ratio, h: imageH * ratio, radians: transform.rotation * Math.PI / 180 };
}
export function prizeCells(zone, count) {
  if (!count) return [];
  const columns = Math.min(count, count <= 3 ? 3 : 4), rows = Math.ceil(count / columns), gap = 14;
  const w = (zone.w - gap * (columns - 1)) / columns, h = (zone.h - gap * (rows - 1)) / rows;
  return Array.from({ length: count }, (_, i) => rect(zone.x + (i % columns) * (w + gap), zone.y + Math.floor(i / columns) * (h + gap), w, h));
}
export function removeEdgeBackground(data, width, height, tolerance = 42) {
  const result = new Uint8ClampedArray(data), n = width * height;
  if (!width || !height || data.length !== n * 4) throw Error('圖片資料不完整');
  const corners = [0, width - 1, (height - 1) * width, n - 1];
  // Already transparent cutouts must retain their dark edge pixels.
  if (corners.every(i => data[i * 4 + 3] < 10)) return result;
  const colors = corners.filter(i => data[i * 4 + 3] >= 10).map(i => Array.from(data.slice(i * 4, i * 4 + 3)));
  let background = colors[0], score = -1;
  for (const c of colors) {
    const matches = colors.filter(d => Math.hypot(c[0] - d[0], c[1] - d[1], c[2] - d[2]) <= tolerance).length;
    if (matches > score) { score = matches; background = c; }
  }
  const visited = new Uint8Array(n), queue = new Uint32Array(n);
  let head = 0, tail = 0;
  const add = i => {
    if (visited[i]) return;
    visited[i] = 1;
    if (data[i * 4 + 3] < 10 || Math.hypot(data[i * 4] - background[0], data[i * 4 + 1] - background[1], data[i * 4 + 2] - background[2]) <= tolerance) queue[tail++] = i;
  };
  for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1); }
  while (head < tail) {
    const i = queue[head++], x = i % width;
    result[i * 4 + 3] = 0;
    if (x) add(i - 1); if (x < width - 1) add(i + 1);
    if (i >= width) add(i - width); if (i < n - width) add(i + width);
  }
  return result;
}
function safeImage(value) {
  if (['/hero.png', './hero.png', './assets/hero.png', 'assets/hero.png'].includes(value)) return './assets/hero.png';
  return typeof value === 'string' && value.length <= 16000000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value) ? value : '';
}
const color = (value, fallback) => /^#[\da-f]{6}$/i.test(value) ? value : fallback;
function readImage(value = {}, oldTolerance = 42) {
  if (!value || typeof value !== 'object') value = {};
  const t = value.transform || value, c = value.cutout || {};
  const image = safeImage(value.image), original = safeImage(value.original) || image;
  return { image, original, source: typeof value.source === 'string' && validLink(value.source) ? value.source : '',
    transform: { scale: clamp(t.scale, 30, 180, 100), x: clamp(t.x, -250, 250, 0), y: clamp(t.y, -250, 250, 0), rotation: clamp(t.rotation, -90, 90, 0) },
    cutout: { mode: c.mode === 'none' ? 'none' : 'edge', tolerance: clamp(c.tolerance, 5, 160, oldTolerance),
      appliedTolerance: clamp(c.appliedTolerance, 5, 160, oldTolerance), appliedMode: c.appliedMode === 'none' ? 'none' : 'edge' } };
}
export function validateProject(input) {
  if (!input || ![1, 2].includes(input.version) || !input.info || typeof input.info !== 'object' || !Array.isArray(input.prizes) || input.prizes.length > 12) throw Error('專案格式不正確，請使用 SPIN STUDIO 專案 JSON。');
  const info = {};
  for (const [key, , , max] of fields) info[key] = String(input.info[key] ?? '').slice(0, max);
  const oldTolerance = clamp(input.tolerance, 5, 160, 42), p = input.typography || {};
  const usedIds = new Set();
  const fontId = v => fonts.some(f => f.id === v) ? v : 'sans';
  return { version: 2, info, template: templates.some(t => t.id === input.template) ? input.template : 'classic',
    colors: { accent: color(input.colors?.accent || input.accent, '#d9a820'), paper: color(input.colors?.paper || input.paper, '#eee8d9'), ink: color(input.colors?.ink, '#141b17') },
    typography: { titleFont: fontId(p.titleFont), bodyFont: fontId(p.bodyFont), title: clamp(p.title, 50, 145, 100),
      info: clamp(p.info, 60, 150, 100), prize: clamp(p.prize, 60, 150, 100), footer: clamp(p.footer, 60, 150, 100) },
    hero: readImage(input.hero, oldTolerance), prizes: input.prizes.map(v => {
      if (!v || typeof v !== 'object') v = {};
      const id = input.version === 2 && typeof v.id === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(v.id) && !usedIds.has(v.id) ? v.id : uid();
      usedIds.add(id);
      return { id, rank: String(v.rank || '').slice(0, 15), name: String(v.name || '').slice(0, 90), note: String(v.note || '').slice(0, 150), ...readImage(v, oldTolerance) };
    }) };
}
