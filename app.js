import { fields, fonts, palettes, templates, demoInfo, makePrize, createProject, validateProject, validLink, defaultTransform } from './core.js';
import { normalizeFile, reprocessImage, searchCommons, downloadCandidate, clearImageCache } from './images.js';
import { paintPoster, POSTER_WIDTH, POSTER_HEIGHT } from './poster.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
let state = createProject(), db, saveTimer, renderTimer, renderVersion = 0;
let target = { type: 'hero' }, busy = false, searchController, searchVersion = 0, downloadUrl, toastTimer;
const imageEditorNodes = new Map();
const currentItem = reference => reference.type === 'hero' ? state.hero : state.prizes.find(item => item.id === reference.id);
const itemLabel = reference => reference.type === 'hero' ? '主視覺' : `獎品 ${state.prizes.findIndex(item => item.id === reference.id) + 1}`;

function toast(message) {
  $('#toast').textContent = message; $('#toast').classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 5200);
}
function button(label, className, handler) {
  const element = document.createElement('button');
  element.type = 'button'; element.textContent = label; element.className = className; element.onclick = handler;
  return element;
}
function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function range(label, value, min, max, onInput, suffix = '', name = label) {
  const wrapper = el('label', 'range-label', label), output = el('output', '', value + suffix), input = document.createElement('input');
  input.type = 'range'; input.min = min; input.max = max; input.value = value; input.setAttribute('aria-label', name);
  input.oninput = () => { output.value = input.value + suffix; onInput(Number(input.value)); };
  wrapper.append(output, input); return wrapper;
}
function imageElement(src, label) {
  const image = new Image(); image.src = src; image.alt = label; return image;
}
async function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('spin-studio-pages', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('designs');
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}
function saveNow() {
  clearTimeout(saveTimer);
  if (!db) { $('#saveStatus').textContent = '自動儲存不可用，請另存專案'; return; }
  try {
    const transaction = db.transaction('designs', 'readwrite');
    transaction.objectStore('designs').put(structuredClone(state), 'current');
    transaction.oncomplete = () => { $('#saveStatus').textContent = '已儲存於此裝置'; };
    transaction.onerror = () => { $('#saveStatus').textContent = '儲存空間不足，請另存專案'; };
  } catch { $('#saveStatus').textContent = '無法自動儲存，請另存專案'; }
}
function persist() {
  // The small metadata snapshot is immediate; full image data lives in IndexedDB.
  try {
    const snapshot = structuredClone(state);
    snapshot.hero.image = snapshot.hero.original = '';
    snapshot.prizes.forEach(item => { item.image = item.original = ''; });
    localStorage.setItem('spin-pages-metadata', JSON.stringify({ project: snapshot, heroHasImage: !!state.hero.image,
      imageFlags: Object.fromEntries(state.prizes.map(item => [item.id, !!item.image])) }));
  } catch { /* IndexedDB remains available when localStorage is blocked. */ }
  $('#saveStatus').textContent = '正在儲存…'; clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 350);
}
function changed() {
  persist(); clearTimeout(renderTimer);
  renderTimer = setTimeout(() => render().catch(error => toast(error.message)), 40);
}
async function render() {
  const version = ++renderVersion, snapshot = structuredClone(state);
  const canvas = document.createElement('canvas'); canvas.width = POSTER_WIDTH; canvas.height = POSTER_HEIGHT;
  await paintPoster(canvas, snapshot);
  if (version === renderVersion) $('#poster').getContext('2d').drawImage(canvas, 0, 0);
}
function setTab(name) {
  $$('.tab').forEach(tab => { const active = tab.dataset.tab === name; tab.classList.toggle('active', active); tab.setAttribute('aria-pressed', String(active)); });
  $$('.panel').forEach(panel => { panel.hidden = panel.id !== 'panel-' + name; });
}
function buildForm() {
  const form = $('#infoForm'); form.replaceChildren();
  for (const [key, label, type, max] of fields) {
    const wrapper = el('label', 'field', label), input = document.createElement(type === 'textarea' ? 'textarea' : 'input');
    if (type !== 'textarea') input.type = type;
    input.id = 'field-' + key; input.name = key; input.value = state.info[key]; input.maxLength = max;
    input.placeholder = key === 'link' ? 'https://…' : '留空即可隱藏';
    input.oninput = () => { state.info[key] = input.value; if (key === 'link') checkLink(); changed(); };
    wrapper.append(input);
    if (key === 'link') { const hint = el('small', '', 'QR code 在本機產生'); hint.id = 'linkHint'; wrapper.append(hint); }
    if (['date', 'checkin', 'format', 'fee'].includes(key)) {
      let row = form.lastElementChild;
      if (key === 'date' || key === 'format') { row = el('div', 'form-row'); form.append(row); }
      row.append(wrapper);
    } else form.append(wrapper);
  }
  checkLink();
}
function checkLink() {
  const valid = validLink(state.info.link);
  $('#field-link').setAttribute('aria-invalid', String(!valid));
  $('#linkHint').textContent = valid ? 'QR code 在本機產生，不將報名網址傳給外部服務' : '請輸入完整 http:// 或 https:// 網址；目前不顯示 QR code';
  $('#linkHint').style.color = valid ? '' : '#b26739';
}
function buildDesign() {
  $('#templateName').textContent = templates.find(t => t.id === state.template).name;
  const list = $('#templateList'); list.replaceChildren();
  for (const template of templates) {
    const item = button('', 'template-card' + (template.id === state.template ? ' selected' : ''), () => {
      state.template = template.id; buildDesign(); changed();
    });
    item.setAttribute('aria-label', template.name); item.setAttribute('aria-pressed', String(template.id === state.template));
    item.append(el('span', 'template-art art-' + template.id), el('strong', '', template.name), el('small', '', template.description)); list.append(item);
  }
  const paletteList = $('#palettes'); paletteList.replaceChildren();
  for (const [name, accent, paper, ink] of palettes) {
    const item = button('', 'palette' + (state.colors.accent === accent ? ' selected' : ''), () => {
      state.colors = { accent, paper, ink }; buildDesign(); changed();
    });
    item.setAttribute('aria-label', name);
    const swatch = el('span', 'swatch'); swatch.style.setProperty('--accent', accent); swatch.style.setProperty('--paper', paper); swatch.style.setProperty('--ink', ink);
    item.append(swatch, document.createTextNode(name)); paletteList.append(item);
  }
  for (const key of ['accent', 'paper', 'ink']) $('#' + key + 'Color').value = state.colors[key];
  for (const [id, key] of [['titleFont', 'titleFont'], ['bodyFont', 'bodyFont']]) {
    const select = $('#' + id); select.replaceChildren();
    for (const font of fonts) { const option = el('option', '', font.name); option.value = font.id; select.append(option); }
    select.value = state.typography[key];
    select.onchange = () => { state.typography[key] = select.value; changed(); };
  }
  const sizeControls = $('#fontSizeControls'); sizeControls.replaceChildren();
  for (const [key, label, min, max] of [['title', '標題大小', 50, 145], ['info', '資訊字級', 60, 150], ['prize', '獎品字級', 60, 150], ['footer', '主協辦字級', 60, 150]]) {
    sizeControls.append(range(label, state.typography[key], min, max, value => { state.typography[key] = value; changed(); }, '%'));
  }
}
function targetKey(reference) { return reference.type === 'hero' ? 'hero' : reference.id; }
function updateImageStatus(reference) {
  const item = currentItem(reference), node = imageEditorNodes.get(targetKey(reference));
  if (!item || !node) return;
  const pending = item.cutout.tolerance !== item.cutout.appliedTolerance || item.cutout.mode !== item.cutout.appliedMode;
  const status = node.querySelector('.cutout-status');
  status.classList.toggle('pending', pending);
  status.textContent = pending ? '設定已更改，點選下方「重新去背」套用。' : item.image ? (item.cutout.appliedMode === 'none' ? '目前保留原圖。' : `已套用邊緣容差 ${item.cutout.appliedTolerance}。`) : '上傳或選圖後會依此設定處理。';
}
function imageEditor(reference) {
  const item = currentItem(reference), label = itemLabel(reference), root = el('div', 'image-editor');
  imageEditorNodes.set(targetKey(reference), root);
  const thumb = el('div', 'image-thumb');
  if (item.image) thumb.append(imageElement(item.image, label + '圖片')); else thumb.append(el('span', '', '尚未加入圖片'));
  root.append(thumb);
  const actions = el('div', 'button-pair');
  actions.append(button('搜尋圖片', 'button outline', () => openSearch(reference, item.name || '')),
    button('上傳圖片', 'button outline', () => upload(reference)));
  root.append(actions);
  const details = document.createElement('details'); details.className = 'image-controls'; details.open = reference.type === 'hero';
  details.append(el('summary', '', '大小、位置與去背設定'));
  const controls = el('div', 'image-controls-inner');
  for (const [key, title, min, max, suffix] of [['scale', '圖片大小', 30, 180, '%'], ['x', '水平位置', -250, 250, ' px'], ['y', '垂直位置', -250, 250, ' px'], ['rotation', '圖片旋轉', -90, 90, '°']]) {
    controls.append(range(title, item.transform[key], min, max, value => { item.transform[key] = value; changed(); }, suffix, label + ' ' + title));
  }
  controls.append(el('p', 'hint', '移動或放大超出圖片框的部分會裁切，保護文字與 QR code。'));
  controls.append(button('重設大小與位置', 'text-button', () => {
    item.transform = defaultTransform(); refreshImageEditors(); changed();
  }));
  const modeLabel = el('label', 'field', '去背方式'), mode = document.createElement('select');
  mode.setAttribute('aria-label', label + ' 去背方式');
  for (const [value, text] of [['edge', '本機邊緣去背'], ['none', '保留原圖／透明 PNG']]) { const option = el('option', '', text); option.value = value; mode.append(option); }
  mode.value = item.cutout.mode;
  mode.onchange = () => { item.cutout.mode = mode.value; updateImageStatus(reference); persist(); };
  modeLabel.append(mode); controls.append(modeLabel);
  controls.append(range('邊緣容差', item.cutout.tolerance, 5, 160, value => {
    item.cutout.tolerance = value; updateImageStatus(reference); persist();
  }, '', label + ' 邊緣容差'));
  controls.append(el('p', 'cutout-status'), el('p', 'hint', '調高可移除更多相近背景；重新去背每次都從原圖開始，不會累積刪除。適合單色背景。'));
  controls.append(button('重新去背', 'button outline full', () => redo(reference)));
  details.append(controls); root.append(details);
  const footer = el('div', 'image-footer-actions');
  footer.append(button('移除圖片', 'text-button', () => {
    item.image = item.original = ''; item.source = ''; clearImageCache(); refreshImageEditors(); changed();
  }));
  if (item.source && validLink(item.source)) { const a = el('a', 'text-button', '圖片來源'); a.href = item.source; a.target = '_blank'; a.rel = 'noopener noreferrer'; footer.append(a); }
  root.append(footer);
  queueMicrotask(() => updateImageStatus(reference)); return root;
}
function drawHero() { $('#heroEditor').replaceChildren(imageEditor({ type: 'hero' })); }
function drawPrizes() {
  const list = $('#prizeList'); list.replaceChildren();
  $('#prizeCount').textContent = `${state.prizes.length} / 12`; $('#addPrize').disabled = state.prizes.length >= 12;
  state.prizes.forEach((item, index) => {
    const card = el('article', 'prize-card'); card.setAttribute('aria-label', `獎品 ${index + 1}`);
    const header = el('div', 'prize-header');
    for (const [key, placeholder, max] of [['rank', '名次', 15], ['name', '獎品名稱', 90]]) {
      const input = document.createElement('input'); input.placeholder = placeholder; input.value = item[key]; input.maxLength = max;
      input.setAttribute('aria-label', `獎品 ${index + 1} ${placeholder}`);
      input.oninput = () => { item[key] = input.value; changed(); }; header.append(input);
    }
    const remove = button('×', 'icon-button', () => {
      imageEditorNodes.delete(item.id); state.prizes = state.prizes.filter(p => p.id !== item.id); drawPrizes(); changed();
    });
    remove.setAttribute('aria-label', `刪除獎品 ${index + 1}`); header.append(remove); card.append(header);
    const note = document.createElement('textarea'); note.placeholder = '獎品補充說明（選填）'; note.value = item.note; note.maxLength = 150;
    note.setAttribute('aria-label', `獎品 ${index + 1} 補充說明`); note.oninput = () => { item.note = note.value; changed(); }; card.append(note);
    card.append(imageEditor({ type: 'prize', id: item.id }));
    const actions = el('div', 'prize-actions');
    const move = direction => {
      const from = state.prizes.indexOf(item), to = from + direction;
      if (to < 0 || to >= state.prizes.length) return;
      [state.prizes[from], state.prizes[to]] = [state.prizes[to], state.prizes[from]]; drawPrizes(); changed();
    };
    const before = button('往前排序', 'text-button', () => move(-1)), after = button('往後排序', 'text-button', () => move(1));
    before.disabled = index === 0; after.disabled = index === state.prizes.length - 1;
    actions.append(before, after); card.append(actions); list.append(card);
  });
}
function refreshImageEditors() {
  const opened = [...imageEditorNodes].filter(([, node]) => node.querySelector('details')?.open).map(([key]) => key);
  imageEditorNodes.clear(); drawHero(); drawPrizes();
  for (const key of opened) { const details = imageEditorNodes.get(key)?.querySelector('details'); if (details) details.open = true; }
}
async function processItem(reference, original = null, source = '') {
  if (busy) { toast('圖片處理中，請稍候。'); return; }
  const item = currentItem(reference); if (!item) { toast('獎品已被移除。'); return; }
  busy = true; toast('正在裝置內處理圖片…');
  const snapshot = { original: original || item.original, cutout: { ...item.cutout } };
  try {
    await new Promise(resolve => requestAnimationFrame(resolve));
    const processed = await reprocessImage(snapshot);
    item.original = snapshot.original; item.image = processed;
    item.cutout.appliedTolerance = snapshot.cutout.tolerance; item.cutout.appliedMode = snapshot.cutout.mode;
    if (original) item.source = source;
    clearImageCache(); refreshImageEditors(); changed(); saveNow();
    if ($('#searchDialog').open) $('#searchDialog').close();
    toast(snapshot.cutout.mode === 'none' ? '已還原原圖。' : `去背完成，已套用容差 ${snapshot.cutout.tolerance}。`);
  } catch (error) { toast(error.message || '圖片處理失敗，請重新上傳。'); }
  finally { busy = false; }
}
function redo(reference) { processItem({ ...reference }); }
function upload(reference) { target = { ...reference }; $('#imageUpload').value = ''; $('#imageUpload').click(); }
function openSearch(reference, query = '') {
  target = { ...reference }; const item = currentItem(target);
  $('#searchTitle').textContent = `搜尋${itemLabel(target)}圖片`;
  $('#searchQuery').value = query; $('#searchResults').replaceChildren();
  $('#searchStatus').textContent = '輸入型號或名稱。Commons 商品圖有限，找不到時可使用 Google 圖片入口，再下載上傳。';
  $('#searchTolerance').value = item.cutout.tolerance; $('#searchToleranceValue').value = item.cutout.tolerance;
  $('#searchDialog').showModal(); $('#searchQuery').focus(); if (query) search(query);
}
async function search(query) {
  if (!query.trim()) return;
  searchController?.abort(); searchController = new AbortController();
  const version = ++searchVersion, reference = { ...target };
  $('#searchResults').replaceChildren(); $('#searchStatus').textContent = '搜尋免費公開圖片中…';
  $('#externalSearch').href = 'https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(query);
  $('#searchSubmit').disabled = true;
  try {
    const results = await searchCommons(query, searchController.signal);
    if (version !== searchVersion) return;
    $('#searchStatus').textContent = results.length ? `找到 ${results.length} 張候選圖，選取後會套用這張圖片自己的去背設定。` : '沒有符合的圖片。可改用其他關鍵字，或到 Google 圖片尋找後下載上傳。';
    for (const candidate of results) {
      const card = el('article', 'result');
      const choose = button('', '', async () => {
        if (busy) { toast('圖片處理中，請稍候。'); return; }
        $$('#searchResults button').forEach(b => { b.disabled = true; });
        $('#searchStatus').textContent = '正在下載圖片，稍後將在本機去背…';
        try {
          const original = await downloadCandidate(candidate.image);
          if (version !== searchVersion || !currentItem(reference)) return;
          await processItem(reference, original, candidate.source);
        } catch (error) {
          const message = error instanceof TypeError ? '圖片來源限制跨站下載或網路連線失敗。請查看來源、下載圖片後再上傳。' : error.message;
          $('#searchStatus').textContent = message; toast(message);
        } finally { $$('#searchResults button').forEach(b => { b.disabled = false; }); }
      });
      const image = imageElement(candidate.thumb, candidate.title); image.loading = 'lazy';
      image.onerror = () => { image.alt = '預覽無法載入，可查看來源後上傳'; };
      choose.append(image, el('strong', '', candidate.title)); card.append(choose);
      const source = el('a', '', '查看來源與授權'); source.href = candidate.source; source.target = '_blank'; source.rel = 'noopener noreferrer';
      card.append(source, el('span', 'license', candidate.license)); $('#searchResults').append(card);
    }
  } catch (error) {
    if (error.name !== 'AbortError') $('#searchStatus').textContent = '無法連線到免費圖片搜尋。請稍後重試，或使用 Google 圖片入口及上傳功能。';
  } finally { if (version === searchVersion) $('#searchSubmit').disabled = false; }
}
async function exportPng() {
  $('#downloadPng').disabled = true; $('#downloadFallback').hidden = true; $('#exportStatus').textContent = '正在裝置內產生高解析 PNG…';
  try {
    await document.fonts.ready;
    const canvas = document.createElement('canvas'); canvas.width = Number($('input[name="resolution"]:checked').value); canvas.height = canvas.width * POSTER_HEIGHT / POSTER_WIDTH;
    await paintPoster(canvas, structuredClone(state));
    const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(Error('記憶體不足，請選擇較低解析度。')), 'image/png'));
    if (downloadUrl) URL.revokeObjectURL(downloadUrl); downloadUrl = URL.createObjectURL(blob);
    const name = (state.info.name || '戰鬥陀螺比賽').replace(/[\n\\/:*?"<>|]/g, '-') + '.png';
    const link = document.createElement('a'); link.href = downloadUrl; link.download = name; link.click();
    $('#downloadLink').href = downloadUrl; $('#downloadLink').download = name; $('#downloadFallback').hidden = false;
    $('#exportStatus').textContent = `已產生 ${canvas.width} × ${canvas.height} px PNG（${(blob.size / 1048576).toFixed(1)} MB）`;
    canvas.width = canvas.height = 1; toast('海報已準備完成。');
  } catch (error) { $('#exportStatus').textContent = '匯出失敗：' + error.message; }
  finally { $('#downloadPng').disabled = false; }
}
function saveProject() {
  saveNow(); const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = 'SPIN-STUDIO-專案-v2.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000); toast('專案包含圖片、個別容差、背景與字型設定。');
}
function refreshAll() { clearImageCache(); buildForm(); buildDesign(); refreshImageEditors(); changed(); }

$$('.tab').forEach(tab => { tab.onclick = () => setTab(tab.dataset.tab); });
$$('[data-close]').forEach(item => { item.onclick = () => $('#' + item.dataset.close).close(); });
$$('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
}));
$('#searchDialog').addEventListener('close', () => { searchController?.abort(); searchVersion++; $('#searchSubmit').disabled = false; refreshImageEditors(); });
$('#searchForm').onsubmit = event => { event.preventDefault(); search($('#searchQuery').value); };
$('#searchTolerance').oninput = event => {
  const item = currentItem(target); if (!item) return;
  item.cutout.tolerance = Number(event.target.value); $('#searchToleranceValue').value = event.target.value; persist();
};
$('#uploadFromSearch').onclick = () => upload(target);
$('#imageUpload').onchange = async event => {
  const file = event.target.files[0], reference = { ...target }; if (!file) return;
  try { const original = await normalizeFile(file); await processItem(reference, original); } catch (error) { toast(error.message); }
};
$('#resetHero').onclick = () => { state.hero = createProject().hero; refreshImageEditors(); changed(); };
$('#addPrize').onclick = () => { if (state.prizes.length >= 12) return; state.prizes.push(makePrize()); drawPrizes(); changed(); };
for (const key of ['accent', 'paper', 'ink']) $('#' + key + 'Color').oninput = event => { state.colors[key] = event.target.value; changed(); };
$('#resetTypography').onclick = () => { state.typography = createProject().typography; buildDesign(); changed(); };
$('#clearFields').onclick = () => { if (confirm('清空 13 項資訊？圖片與版型設定會保留。')) { for (const [key] of fields) state.info[key] = ''; buildForm(); changed(); } };
$('#loadDemo').onclick = () => { if (confirm('以示範資料取代目前的比賽資訊？')) { state.info = { ...demoInfo }; buildForm(); changed(); } };
$('#helpBtn').onclick = () => $('#helpDialog').showModal();
for (const id of ['exportTop', 'exportBottom']) $('#' + id).onclick = () => { $('#exportStatus').textContent = ''; $('#exportDialog').showModal(); };
$('#downloadPng').onclick = exportPng; $('#saveProject').onclick = saveProject;
$('#openProject').onclick = () => { $('#projectUpload').value = ''; $('#projectUpload').click(); };
$('#projectUpload').onchange = async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 160 * 1024 * 1024) throw Error('專案請小於 160 MB。');
    const next = validateProject(JSON.parse(await file.text()));
    if (confirm('開啟專案並取代目前的設計？')) { state = next; refreshAll(); saveNow(); toast('專案已載入。'); }
  } catch (error) { toast('無法開啟專案：' + error.message); }
};
$('#jumpPreview').onclick = () => $('#previewSection').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
$('#fitPreview').onclick = () => {
  const expanded = $('#previewSection').classList.toggle('expanded'); $('#fitPreview').setAttribute('aria-label', expanded ? '縮小預覽' : '放大預覽');
};
document.addEventListener('keydown', event => { if (event.key === 'Escape') $('#previewSection').classList.remove('expanded'); });
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
window.addEventListener('pagehide', saveNow);

async function init() {
  try {
    db = await openDatabase();
    const stored = await new Promise((resolve, reject) => {
      const request = db.transaction('designs').objectStore('designs').get('current');
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    if (stored) state = validateProject(stored);
  } catch { $('#saveStatus').textContent = '自動儲存不可用，請另存專案'; }
  // Metadata restores fast edits after refresh. Image identity follows stable IDs even after reordering.
  try {
    const raw = localStorage.getItem('spin-pages-metadata');
    if (raw) {
      const envelope = JSON.parse(raw), recent = validateProject(envelope.project);
      if (envelope.heroHasImage) { recent.hero.image = state.hero.image; recent.hero.original = state.hero.original; recent.hero.source = state.hero.source; }
      recent.prizes.forEach(item => {
        const previous = state.prizes.find(p => p.id === item.id);
        if (previous && envelope.imageFlags?.[item.id]) { item.image = previous.image; item.original = previous.original; item.source = previous.source; }
      });
      state = recent;
    }
  } catch { /* Invalid local metadata never prevents use of the editor. */ }
  buildForm(); buildDesign(); refreshImageEditors(); await render();
  document.fonts.ready.then(() => render()).catch(() => {});
}
init().catch(error => toast('無法啟動：' + error.message));
