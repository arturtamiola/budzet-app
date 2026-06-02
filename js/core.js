// ============== CONFIG ==============
const ML = ['Sty','Lut','Mar','Kwi','Maj','Cze','Lip','Sie','Wrz','Paź','Lis','Gru'];
const ML_FULL = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];
// Kategorie wydatków per profile — Artur i Marta mają osobne listy.
// Helper getCats() zwraca aktywną listę zależnie od STATE.activeProfile.
// CATS (legacy) zostaje jako alias dla aktualnej profile listy — backward-compat z views/modals.
const CATS_ARTUR = ['Zakupy','Restauracje','Transport','Nela','Koty','Sport','Firma','Dom','Marta Zdrowie','Artur Zdrowie','Ubrania / Kosmetyki','Fryzjer / Paznokcie','Podróże','Inne'];
const CATS_MARTA = ['Zakupy','Restauracje','Transport','Nela','Koty','Sport','Firma','Media','Marta Zdrowie','Artur Zdrowie','Moje różne','Fryzjer / Paznokcie','Podróże','Inne'];
function getCats() {
  const p = (typeof STATE !== 'undefined') ? STATE.activeProfile : 'artur';
  return p === 'marta' ? CATS_MARTA : CATS_ARTUR;
}
let CATS = CATS_ARTUR;  // mutowane przy profile switch w switchProfile()

// Apka NIE wykrywa anomalii ani niczego automatycznie — czyta tag `anomalia: true` z danych.
// Konwersja/wykrywanie jest w convert-data.js (lub Apps Script przy migracji online).

// Legacy nazwy kategorii (z xlsx Artura / Apps Script v5 CAT_NORMALIZE) → nowe nazwy z CATS.
// Normalizacja przy odczycie w loadData() — dane w cloud/dane.json zostają nietknięte,
// ale w pamięci STATE.data wszystko ma już docelowe nazwy zgodne z CATS_ARTUR.
// Dzięki temu sumCat('Podróże') sumuje też legacy 'Podroze' itp.
const CAT_REMAP = {
  'Podroze': 'Podróże',
  'Ubrania': 'Ubrania / Kosmetyki',
  'Fryzjer': 'Fryzjer / Paznokcie',
  'Dom (czynsz, rachunki)': 'Dom',
  'Fryzjer / Barber / Paznokcie': 'Fryzjer / Paznokcie',
};
function remapCat(k) {
  return CAT_REMAP[k] || k;
}
function normalizeCategoriesIn(d) {
  if (!d) return;
  (d.wpisy || []).forEach(w => { if (w.kategoria) w.kategoria = remapCat(w.kategoria); });
  (d.templates || []).forEach(t => { if (t.kategoria) t.kategoria = remapCat(t.kategoria); });
  (d.plany || []).forEach(p => { if (p.kategoria) p.kategoria = remapCat(p.kategoria); });
}

// Ikony shared między profilami. Media (Marta) używa tej samej ikony co Dom (Artur) — alias.
// Fryzjer / Paznokcie używa ikony Fryzjer (alias). Moje różne ma własną nową ikonę.
const CAT_ICONS = {
  Firma: '<path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/>',
  Nela: '<circle cx="12" cy="7" r="3"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>',
  Dom: '<path d="M3 12l9-9 9 9M5 10v10h14V10"/>',
  Transport: '<path d="M5 17h14M7 17V9c0-2 2-3 5-3s5 1 5 3v8M3 21h18"/>',
  Restauracje: '<path d="M6 2v8M10 2v8M8 10v12M14 2v20"/>',
  Sport: '<circle cx="12" cy="12" r="5"/><path d="M3 12h2M19 12h2M12 3v2M12 19v2"/>',
  Zakupy: '<path d="M3 6h18l-2 14H5L3 6zM8 6V4a4 4 0 0 1 8 0v2"/>',
  // Legacy klucz "Podroze" zostaje dla starych danych; nowy "Podróże" alias na ten sam SVG niżej
  Podroze: '<path d="M22 16l-10 4-10-4 10-4 10 4z"/><path d="M2 8l10 4 10-4-10-4-10 4z"/>',
  Ubrania: '<path d="M4 6l4-4h8l4 4v3l-4 1v11H8V10L4 9V6z"/>',
  Fryzjer: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.5 15.5"/>',
  'Marta Zdrowie': '<rect x="6" y="4" width="12" height="16" rx="6"/><path d="M9 12h6"/>',
  'Artur Zdrowie': '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  Inne: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M3 11h18M8 7V3M16 7V3"/>',
  Koty: '<circle cx="12" cy="14" r="6"/><circle cx="7" cy="6" r="2"/><circle cx="17" cy="6" r="2"/>',
  Pensja: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  // Nowe ikony dla nowych nazw kategorii:
  'Podróże': '<path d="M22 16l-10 4-10-4 10-4 10 4z"/><path d="M2 8l10 4 10-4-10-4-10 4z"/>',
  'Ubrania / Kosmetyki': '<path d="M4 6l4-4h8l4 4v3l-4 1v11H8V10L4 9V6z"/>',
  'Fryzjer / Paznokcie': '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.5 15.5"/>',
  Media: '<path d="M3 12l9-9 9 9M5 10v10h14V10"/>',  // ta sama co Dom — Artur widzi Dom, Marta widzi Media
  'Moje różne': '<path d="M4 6l4-4h8l4 4v3l-4 1v11H8V10L4 9V6z"/>',  // ta sama co Ubrania / Kosmetyki — w praktyce Marty "moje różne" to ten sam zakres
};
const catIcon = k => CAT_ICONS[k] || CAT_ICONS.Inne;

// Kolory kategorii dla Timeline stacked bars (i potencjalnie innych wykresów)
const CAT_COLOR = {
  Firma: '#fbbf24', Nela: '#ec4899', Dom: '#8b5cf6', Transport: '#3b82f6',
  Restauracje: '#f97316', Sport: '#22c55e', Zakupy: '#a855f7', Podroze: '#14b8a6',
  Ubrania: '#f43f5e', Fryzjer: '#d946ef', 'Marta Zdrowie': '#ef4444',
  'Artur Zdrowie': '#dc2626', Inne: '#94a3b8', Koty: '#eab308',
  // Aliasy dla nowych nazw — Media dziedziczy kolor Dom, etc:
  'Podróże': '#14b8a6',
  'Ubrania / Kosmetyki': '#f43f5e',
  'Fryzjer / Paznokcie': '#d946ef',
  Media: '#8b5cf6',
  'Moje różne': '#f43f5e',  // ten sam co Ubrania / Kosmetyki
};
const catColor = k => CAT_COLOR[k] || '#94a3b8';

// Viewport detection — sufiks dla localStorage kluczy display/filter, żeby mobile i desktop
// trzymały osobne preferencje (np. inny tryb kafli per widok).
// Match z breakpointem w style.css @media (min-width: 900px).
function viewportSuffix() {
  return window.matchMedia && window.matchMedia('(min-width: 900px)').matches ? '_d' : '_m';
}

// ============== STATE ==============
const STATE = {
  activeProfile: 'artur',  // 'artur' | 'marta' — który profil danych jest aktywny (CATS, cloud URL, token)
  data: null,           // loaded from dane.json
  view: 'home',         // home | plan | trans | charts | timeline
  yr: new Date().getFullYear(),
  mi: new Date().getMonth() + 1,  // 1-12 — domyślnie bieżący mc
  transShowAll: false,  // Trans: pokaż wszystkie chipy kategorii po kliknięciu "więcej"
  chartCat: 'Firma',    // for charts view
  chartZakres: '1',     // Wykresy zakres: '1' (bieżący rok) | '2' (ten + poprzedni) | 'all' (wszystkie)
  tlBucket: '3mc',      // Timeline bucket: '3mc' | '6mc' | 'rok'
  tlZakres: '2',        // Timeline zakres: '1' | '2' | '3' | 'all' (lata wstecz)
  uiHiddenCatsHist: {},  // Historia: ukryte kategorie {kat: true}
  uiHiddenCatsTrans: {}, // Transakcje: ukryte kategorie (niezależne od Historii)
  uiDisplayHome: 'grid3',  // tryb kafli per view — osobny dla każdej
  uiDisplayTrans: 'grid3',
  uiDisplayHist: 'grid3',
  uiDisplayCharts: 'line',  // 'line' (blob) | 'bars' (dots)
  uiDisplayPlan: 'list',   // 'list' | 'bar' | 'donut' — Plan ma własny zestaw
  uiOpenDrawer: null,   // null | 'zakres' | 'kategorie' | 'widok' — który drawer kontrolek jest otwarty
  uiCtrlsOpen: true,    // true = pasek filtrów widoczny; false = ukryty (toggle ikoną filtra w topbarze)
  tlShowAllCats: false, // Timeline: rozwiń pełną siatkę kategorii w legendzie
  // Settings
  themeMode: 'light', // 'auto' | 'light' | 'dark' — domyślnie dzień
  bigText: false,
  hideAmounts: false,
  dataMode: 'local',  // 'local' (serve.js + edits) | 'cloud' (Apps Script doPost writeback)
  cloudToken: '',     // token do Apps Script doPost (musi się zgadzać z REQUIRED_TOKEN w .gs)
  // Local edits (overrides from sheet/json)
  localEdits: {
    added: [],            // nowe wpisy
    deleted: [],          // hard-delete ids (legacy)
    updated: {},          // {wpis_id: {...patch}}
    templates: {},        // {template_id: {...patch}}  — override szacunku "od teraz na stałe"
    planOverrides: {},
    paidRecurring: {},
  },
};

// ============== THEME ==============
function applyTheme() {
  document.body.classList.remove('dark', 'light');
  if (STATE.themeMode === 'dark') document.body.classList.add('dark');
  else if (STATE.themeMode === 'light') document.body.classList.add('light');
  const isDark = STATE.themeMode === 'dark' || (STATE.themeMode === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const tc = document.querySelector('meta[name="theme-color"]');
  if (tc) tc.setAttribute('content', isDark ? '#0a0a0a' : '#FFE600');
  syncThemeSeg();
}
function syncThemeSeg() {
  document.querySelectorAll('#theme-seg .seg').forEach(s => s.classList.toggle('active', s.getAttribute('data-mode') === STATE.themeMode));
}
function syncDataModeSeg() {
  document.querySelectorAll('#data-mode-seg .seg').forEach(s => s.classList.toggle('active', s.getAttribute('data-dm') === STATE.dataMode));
  const sub = document.getElementById('tryb-sub');
  if (sub) sub.textContent = STATE.dataMode === 'cloud' ? 'Cloud · Apps Script (read-only)' : 'Local · dane.json + edits';
}

// ============== UTILS ==============
const fmt = n => Number(n).toLocaleString('pl-PL').replace(/ /g, ' ');
const fmtH = n => STATE.hideAmounts ? '••••' : fmt(n); // hideable: respektuje STATE.hideAmounts (bez Math.abs)
const fmtAmt = n => STATE.hideAmounts ? '••••' : fmt(Math.abs(n));
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);
const el = (tag, attrs = {}, children = []) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return e;
};

// ============== DIALOG + TOAST (zastępują natywne confirm/alert) ==============
function dialog({ title, message = '', buttons }) {
  return new Promise(resolve => {
    let bg, box;
    const close = (v) => { bg.remove(); box.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') close(null); };
    bg = el('div', { class: 'dlg-bg', onclick: () => close(null) });
    box = el('div', { class: 'dlg-box' }, [
      el('div', { class: 'dlg-title' }, [title]),
      message ? el('div', { class: 'dlg-msg' }, [message]) : null,
      el('div', { class: 'dlg-btns' }, buttons.map(b =>
        el('button', { class: 'dlg-btn ' + (b.style || 'outline'), onclick: () => close(b.value) }, [b.label])
      )),
    ]);
    document.body.appendChild(bg);
    document.body.appendChild(box);
    document.addEventListener('keydown', onKey);
  });
}

// ============== EXPORT XLSX ==============
// Wykorzystuje istniejący `budzet-template.xlsx` (kopia oryginalnego mc) — zachowuje wszystkie
// style, kolory, merges, formuły. Apka tylko podmienia wartości komórek (kategorie, plany, transakcje).
// Dzięki temu output jest WIZUALNIE 1:1 z oryginalem bez ręcznego odwzorowywania stylów.

// Lista typowych kategorii przychodów per profil. Plus union z aktualnych danych żeby nie zgubić niczego.
function getIncomeCats() {
  const base = STATE.activeProfile === 'marta'
    ? ['Pensja', '800+', 'Inne']
    : ['Pensja', 'Oszczędności', '800+', 'Odsetki', 'Inne', 'Kategoria niestandardowa'];
  const fromData = [...new Set(getAllWpisy()
    .filter(w => w.kierunek === 'przychod')
    .map(w => w.kategoria))];
  // Union: base order zachowane, plus brakujące z fromData na końcu
  const all = [...base];
  fromData.forEach(k => { if (!all.includes(k)) all.push(k); });
  return all;
}

// Wypełnij template wartościami z apki dla danego (rok, mi). ExcelJS API.
// Template ma już pełne style (kolory, fonty, borders, fills, merges) + formuły SUMIF.
// Apka tylko podmienia .value komórek — wszystkie inne właściwości zostają.
//  — tytuł A8
//  — kategorie wydatków B28..B41 (14 wierszy) + ich plany D28..D41
//  — kategorie przychodów H28..H33 (6 wierszy) + ich plany J28..J33
//  — wszystkie transakcje w Transakcje sheet (kasujemy stare values, wpisujemy nowe)
function fillMonthTemplate(wb, rok, mi) {
  const ps = wb.getWorksheet('Podsumowanie');
  const tx = wb.getWorksheet('Transakcje');
  if (!ps || !tx) throw new Error('Template: brak Podsumowanie/Transakcje');

  const all = getAllWpisy();
  const monthWpisy = all.filter(w => w.rok === rok && w.miesiac === mi);
  const effectiveKw = w => {
    if (w.typ === 'stale' && (!w.kwota || w.kwota === 0)) {
      const s = getSzacunek(w);
      return s > 0 ? s : null;
    }
    return w.kwota > 0 ? w.kwota : null;
  };
  const wydatki = monthWpisy
    .filter(w => w.kierunek === 'wydatek')
    .map(w => ({ ...w, _kw: effectiveKw(w) }))
    .filter(w => w._kw != null);
  const przychody = monthWpisy.filter(w => w.kierunek === 'przychod' && w.kwota > 0);
  const wydCats = CATS;
  const incCats = getIncomeCats();

  // === Podsumowanie: tytuł ===
  ps.getCell('A8').value = `Budżet miesięczny ${ML_FULL[mi - 1]} ${rok}`;

  // === Podsumowanie: kategorie wydatków B28..B41 (14 slotów) + plany D28..D41 ===
  const WYD_SLOT_FIRST = 28;
  const WYD_SLOT_LAST = 41;
  for (let i = 0; i < WYD_SLOT_LAST - WYD_SLOT_FIRST + 1; i++) {
    const r = WYD_SLOT_FIRST + i;
    if (i < wydCats.length) {
      ps.getCell('B' + r).value = wydCats[i];
      ps.getCell('D' + r).value = getPlan(wydCats[i], rok, mi) || 0;
    } else {
      ps.getCell('B' + r).value = null;
      ps.getCell('D' + r).value = null;
    }
  }

  // === Podsumowanie: kategorie przychodów H28..H33 (6 slotów) + plany J28..J33 ===
  const INC_SLOT_FIRST = 28;
  const INC_SLOT_LAST = 33;
  for (let i = 0; i < INC_SLOT_LAST - INC_SLOT_FIRST + 1; i++) {
    const r = INC_SLOT_FIRST + i;
    if (i < incCats.length) {
      ps.getCell('H' + r).value = incCats[i];
      ps.getCell('J' + r).value = 0;
    } else {
      ps.getCell('H' + r).value = null;
      ps.getCell('J' + r).value = null;
    }
  }

  // === Transakcje: wyczyść stare dane + per-cell tła (zostały po Arturowych wpisach) ===
  // Template miał kolorowe Kwota komórki (czerwone wydatki, zielone "zapłacone") — czyścimy fill,
  // zachowujemy resztę stylów (font, numFmt, border) żeby nowe wpisy miały spójne formatowanie.
  const noFill = { type: 'pattern', pattern: 'none' };
  const rowCount = tx.rowCount;
  for (let r = 5; r <= Math.max(rowCount, 50); r++) {
    ['B', 'C', 'D', 'E', 'G', 'H', 'I', 'J'].forEach(col => {
      const cell = tx.getCell(col + r);
      cell.value = null;
      cell.fill = noFill;
    });
  }

  // === Transakcje: wpisz nowe ===
  const TX_START = 5;
  const dataRows = Math.max(wydatki.length, przychody.length, 30);
  for (let i = 0; i < dataRows; i++) {
    const r = TX_START + i;
    const w = wydatki[i];
    const p = przychody[i];
    if (w) {
      tx.getCell('B' + r).value = w.data || null;
      tx.getCell('C' + r).value = w._kw;
      tx.getCell('D' + r).value = w.nazwa || null;
      tx.getCell('E' + r).value = w.kategoria || null;
    }
    if (p) {
      tx.getCell('G' + r).value = p.data || null;
      tx.getCell('H' + r).value = p.kwota;
      tx.getCell('I' + r).value = p.nazwa || null;
      tx.getCell('J' + r).value = p.kategoria || null;
    }
  }
}

async function exportMonthXlsx() {
  if (typeof ExcelJS === 'undefined') { toast('Biblioteka ExcelJS nie załadowana — odśwież stronę', 'err'); return; }
  const all = getAllWpisy();
  const monthSet = new Set();
  all.forEach(w => monthSet.add(w.rok * 12 + w.miesiac));
  const months = [...monthSet].sort((a, b) => b - a).map(k => ({ rok: Math.floor((k - 1) / 12), mi: ((k - 1) % 12) + 1 }));
  if (!months.length) { toast('Brak danych do eksportu', 'err'); return; }

  const result = await new Promise(resolve => {
    const selected = new Set();
    let bg, box, gridEl, hintEl;
    const close = (v) => { bg.remove(); box.remove(); resolve(v); };
    const updateChip = (cell, key) => cell.style.cssText = selected.has(key)
      ? 'padding:10px 6px;text-align:center;background:var(--accent);color:var(--accent-fg);border-radius:6px;cursor:pointer;font-size:var(--txt-meta-size);font-weight:800;letter-spacing:1px;text-transform:uppercase'
      : 'padding:10px 6px;text-align:center;background:var(--surface);color:var(--fg);border-radius:6px;cursor:pointer;font-size:var(--txt-meta-size);font-weight:var(--txt-meta-weight);letter-spacing:1px;text-transform:uppercase';
    const updateHint = () => { hintEl.textContent = selected.size ? `${selected.size} mc zaznaczone` : 'Kliknij miesiące, potem Pobierz'; };
    bg = el('div', { class: 'dlg-bg', onclick: () => close(null) });
    gridEl = el('div', { style: 'display:grid;grid-template-columns:repeat(3, 1fr);gap:6px;max-height:45vh;overflow-y:auto;margin-bottom:10px' },
      months.map(m => {
        const key = m.rok + '_' + m.mi;
        const cell = el('div', {
          onclick: () => {
            if (selected.has(key)) selected.delete(key); else selected.add(key);
            updateChip(cell, key);
            updateHint();
          },
        }, [`${ML[m.mi - 1]} '${String(m.rok).slice(2)}`]);
        updateChip(cell, key);
        return cell;
      })
    );
    hintEl = el('div', { style: 'font-size:var(--txt-meta-size);color:var(--muted);text-align:center;margin-bottom:14px;letter-spacing:1px;text-transform:uppercase;font-weight:var(--txt-meta-weight)' }, ['Kliknij miesiące, potem Pobierz']);
    box = el('div', { class: 'dlg-box' }, [
      el('div', { class: 'dlg-title' }, ['Eksport miesięcy']),
      el('div', { class: 'dlg-msg' }, ['Wybierz 1 lub więcej mc. Jeden plik = jeden mc.']),
      gridEl,
      hintEl,
      el('div', { class: 'dlg-btns' }, [
        el('button', { class: 'dlg-btn primary', onclick: () => close([...selected].map(k => { const [r, m] = k.split('_').map(Number); return { rok: r, mi: m }; })) }, ['Pobierz']),
        el('button', { class: 'dlg-btn cancel', onclick: () => close(null) }, ['Anuluj']),
      ]),
    ]);
    document.body.appendChild(bg);
    document.body.appendChild(box);
  });
  if (!result || !result.length) return;

  // Fetch template raz (potem klonujemy buffer per miesiąc — load() tworzy nowy obiekt)
  let templateBuf;
  try {
    const r = await fetch('budzet-template.xlsx');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    templateBuf = await r.arrayBuffer();
  } catch (e) {
    toast('Brak budzet-template.xlsx: ' + e.message, 'err');
    return;
  }

  const profileName = STATE.activeProfile === 'marta' ? 'Marta' : 'Artur';
  for (const { rok, mi } of result) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(templateBuf);
    fillMonthTemplate(wb, rok, mi);
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fname = `${String(mi).padStart(2, '0')}-${rok} - ${profileName} - Budżet miesięczny.xlsx`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fname;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (result.length > 1) await new Promise(r => setTimeout(r, 300));
  }
  toast(`Pobrano ${result.length} ${result.length === 1 ? 'plik' : 'plików'}`);
}

async function confirmDialog(title, message = '', okLabel = 'Potwierdź', okStyle = 'danger') {
  const v = await dialog({ title, message, buttons: [
    { label: okLabel, value: true, style: okStyle },
    { label: 'Anuluj', value: false, style: 'cancel' },
  ]});
  return v === true;
}

let syncDepth = 0;
function syncStart(label) {
  syncDepth++;
  let p = document.getElementById('sync-pill');
  if (!p) {
    p = el('div', { id: 'sync-pill', class: 'sync-pill' }, [
      el('span', { class: 'spinner' }),
      el('span', { id: 'sync-pill-text' }, [label || 'Synchronizacja...']),
    ]);
    document.body.appendChild(p);
  } else {
    document.getElementById('sync-pill-text').textContent = label || 'Synchronizacja...';
  }
  p.classList.add('show');
}
function syncEnd() {
  syncDepth = Math.max(0, syncDepth - 1);
  if (syncDepth === 0) {
    const p = document.getElementById('sync-pill');
    if (p) p.classList.remove('show');
  }
}

let toastTimer = null;
function toast(msg, type = 'ok') {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  if (toastTimer) clearTimeout(toastTimer);
  const t = el('div', { class: 'toast ' + type }, [msg]);
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  toastTimer = setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 220);
  }, 2500);
}

// Po sukcesie cloud mutacji — aktualizuj STATE.data + localStorage cache,
// czyść odpowiadające localEdits (przesuwa optimistic edit do canonical state).
// Dzięki temu kolejne loadData() porówna cache == fresh → "Aktualne" zamiast re-render.
function applyMutationToCache(action, payload) {
  if (!STATE.data) return;
  if (action === 'addWpis') {
    STATE.data.wpisy.push(payload.wpis);
    const i = STATE.localEdits.added.findIndex(w => w.id === payload.wpis.id);
    if (i >= 0) STATE.localEdits.added.splice(i, 1);
  } else if (action === 'updateWpis') {
    const w = STATE.data.wpisy.find(x => x.id === payload.id);
    if (w) Object.assign(w, payload.patch);
    if (STATE.localEdits.updated) delete STATE.localEdits.updated[payload.id];
  } else if (action === 'deleteWpis') {
    STATE.data.wpisy = STATE.data.wpisy.filter(w => w.id !== payload.id);
    const i = STATE.localEdits.added.findIndex(w => w.id === payload.id);
    if (i >= 0) STATE.localEdits.added.splice(i, 1);
    if (STATE.localEdits.deleted) STATE.localEdits.deleted = STATE.localEdits.deleted.filter(id => id !== payload.id);
  } else if (action === 'addTemplate') {
    STATE.data.templates.push(payload.template);
    if (STATE.localEdits.addedTemplates) {
      const i = STATE.localEdits.addedTemplates.findIndex(t => t.id === payload.template.id);
      if (i >= 0) STATE.localEdits.addedTemplates.splice(i, 1);
    }
  } else if (action === 'updateTemplate') {
    const t = STATE.data.templates.find(x => x.id === payload.id);
    if (t) Object.assign(t, payload.patch);
    if (STATE.localEdits.templates) delete STATE.localEdits.templates[payload.id];
  } else if (action === 'deleteTemplate') {
    STATE.data.templates = STATE.data.templates.filter(t => t.id !== payload.id);
    if (STATE.localEdits.addedTemplates) {
      const i = STATE.localEdits.addedTemplates.findIndex(t => t.id === payload.id);
      if (i >= 0) STATE.localEdits.addedTemplates.splice(i, 1);
    }
  } else if (action === 'bulkAddWpis') {
    STATE.data.wpisy.push(...payload.wpisy);
    payload.wpisy.forEach(w => {
      const i = STATE.localEdits.added.findIndex(x => x.id === w.id);
      if (i >= 0) STATE.localEdits.added.splice(i, 1);
    });
  }
  try { localStorage.setItem(pk('cloudCache'), JSON.stringify(STATE.data)); } catch (_) {}
}

// Mobile keyboard fix: --vvh = wysokość visual viewport (klawiatura skraca)
function updateVvh() {
  const h = (window.visualViewport ? window.visualViewport.height : window.innerHeight);
  document.documentElement.style.setProperty('--vvh', h + 'px');
}
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', updateVvh);
  window.visualViewport.addEventListener('scroll', updateVvh);
}
window.addEventListener('resize', updateVvh);
updateVvh();

// Focus na input → scroll do widoku (ponad klawiaturę)
document.addEventListener('focusin', (e) => {
  if (e.target.matches && e.target.matches('input, textarea, select')) {
    setTimeout(() => {
      try { e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (_) {}
    }, 300);
  }
});

// ============== DATA LOADING ==============
// Per-profile Cloud URL. Artur: deployed v5. Marta: dopisać po krok 3 (v5b w jej Sheecie).
const CLOUD_URLS = {
  artur: 'https://script.google.com/macros/s/AKfycby1qc3GuHZMKifri5L1yMQ4jDox1uLHezQgT3k5uJU0PR3w9Dt1U0awvxUtGOxpF71w5A/exec',
  marta: 'https://script.google.com/macros/s/AKfycbxMoCPHlPD1HBhso29X5v_TWzzOYHz_w0zsiX0IODxyjxuvtbqn8wxAnsLGlh-fIENQ/exec',
};
const DATA_FILES = { artur: 'dane.json', marta: 'dane-marta.json' };
function getCloudUrl() { return CLOUD_URLS[STATE.activeProfile] || ''; }
function getDataFile() { return DATA_FILES[STATE.activeProfile] || 'dane.json'; }
// Klucze localStorage per profile — dataMode, token, cache, edits, noApiBackend zaczynają być per-profile
// (display/theme/filters zostają globalne — wspólne preferencje wyglądu).
function pk(base) { return base + '_' + STATE.activeProfile; }
// Migracja: stare klucze bez sufiksu traktuj jako klucze profilu Artur (pierwszy historyczny profil).
function migrateLegacyLsKeys() {
  const legacy = ['dataMode', 'cloudToken', 'cloudCache', 'localEdits', 'noApiBackend'];
  legacy.forEach(k => {
    const old = localStorage.getItem(k);
    if (old != null && localStorage.getItem(k + '_artur') == null) {
      localStorage.setItem(k + '_artur', old);
      localStorage.removeItem(k);
    }
  });
}

// Przełączenie profilu — re-loaduje wszystkie dane, CATS, settings.
async function switchProfile(p) {
  if (p !== 'artur' && p !== 'marta') return;
  if (STATE.activeProfile === p) return;
  STATE.activeProfile = p;
  localStorage.setItem('activeProfile', p);
  CATS = getCats();
  // Reset month do bieżącego (każdy profil może mieć inny zakres danych)
  const today = new Date();
  STATE.yr = today.getFullYear();
  STATE.mi = today.getMonth() + 1;
  STATE.data = null;
  await loadData();
}

const EMPTY_EDITS = { added: [], updated: {}, deleted: [], templates: {}, addedTemplates: [], deletedTemplates: [], planOverrides: {}, paidRecurring: {} };

async function loadData() {
  document.body.classList.add('fonts-loading');
  // Restore active profile + migracja starych kluczy (artur = legacy default)
  const ap = localStorage.getItem('activeProfile');
  if (ap === 'artur' || ap === 'marta') STATE.activeProfile = ap;
  migrateLegacyLsKeys();
  CATS = getCats();
  // Zawsze startuj na bieżącym miesiącu — nie ma persystencji mi/yr (celowo)
  const today = new Date();
  STATE.yr = today.getFullYear();
  STATE.mi = today.getMonth() + 1;
  // Restore dataMode + cloudToken z localStorage (per profile) zanim cokolwiek
  const dm = localStorage.getItem(pk('dataMode'));
  STATE.dataMode = (dm === 'local' || dm === 'cloud') ? dm : 'local';
  STATE.cloudToken = localStorage.getItem(pk('cloudToken')) || '';
  if (typeof syncDataModeSeg === 'function') syncDataModeSeg();

  // Marta nie ma jeszcze Cloud URL — force local jeśli profil nie ma deployed Apps Script
  if (STATE.dataMode === 'cloud' && !getCloudUrl()) {
    STATE.dataMode = 'local';
    toast('Cloud dla tego profilu nie skonfigurowany — Local', 'err');
  }

  if (STATE.dataMode === 'cloud') {
    // Stale-while-revalidate: pokaż cache od razu, w tle pobierz świeże
    let hadCache = false;
    const cached = localStorage.getItem(pk('cloudCache'));
    if (cached) {
      try { STATE.data = JSON.parse(cached); normalizeCategoriesIn(STATE.data); hadCache = true; } catch (_) {}
    }
    STATE.localEdits = { ...EMPTY_EDITS };

    const refresh = (async () => {
      syncStart(hadCache ? 'Odświeżanie...' : 'Wczytywanie z chmury...');
      try {
        const r = await fetch(getCloudUrl() + '?action=getAll');
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        if (!j.ok) throw new Error(j.error || 'unknown cloud error');
        const fresh = { wpisy: j.wpisy, templates: j.templates, plany: j.plany };
        const freshStr = JSON.stringify(fresh);
        // Cache porównanie BEZ meta (meta.serverTime zmienia się przy każdym fetch)
        const cachedNoMeta = STATE.data ? JSON.stringify({ wpisy: STATE.data.wpisy, templates: STATE.data.templates, plany: STATE.data.plany }) : null;
        const identical = hadCache && cachedNoMeta === freshStr;
        STATE.data = { ...fresh, meta: j.meta };
        normalizeCategoriesIn(STATE.data);
        try { localStorage.setItem(pk('cloudCache'), JSON.stringify(STATE.data)); } catch (_) {}
        if (hadCache && !identical) render();
        if (identical) toast('Aktualne');
      } catch (e) {
        if (!hadCache) {
          document.getElementById('app').innerHTML = `
            <div class="loading">
              Cloud fetch failed: ${e.message}<br><br>
              Przełącz na Local w Ustawieniach albo sprawdź połączenie.
            </div>
          `;
        } else {
          toast('Sync error: ' + e.message, 'err');
        }
      } finally {
        syncEnd();
      }
    })();

    if (!hadCache) {
      await refresh;
      if (!STATE.data) return;
    }
    // else: refresh leci w tle, kontynuujemy z cache
  } else {
    try {
      const r = await fetch(getDataFile());
      if (!r.ok) throw new Error('fetch failed');
      STATE.data = await r.json();
      normalizeCategoriesIn(STATE.data);
    } catch (e) {
      document.getElementById('app').innerHTML = `
        <div class="loading">
          Nie udało się wczytać <code>${getDataFile()}</code>.<br><br>
          Jeśli otwierasz przez <code>file://</code> — Chrome blokuje fetch.<br>
          Odpal lokalny serwer: <code>node serve.js</code> w folderze projektu<br>
          i otwórz <code>http://localhost:XXXX</code>.
        </div>
      `;
      return;
    }
    // Load local edits — serwer jest źródłem prawdy; localStorage tylko gdy serwer niedostępny.
    // Po pierwszym 404 zapamiętujemy "no API" w localStorage permanentnie — zero 404 spamu w konsoli.
    // Per profile — Marta nie ma serwera (jej dane nie są w serve.js), więc force no-api dla niej.
    // ZAWSZE reset najpierw — po profile switchu nie chcemy localEdits poprzedniego profilu (added stałe, etc).
    STATE.localEdits = { ...EMPTY_EDITS };
    const noApi = STATE.activeProfile === 'marta' || localStorage.getItem(pk('noApiBackend')) === '1';
    if (!noApi) {
      try {
        const r = await fetch('/api/edits');
        if (r.ok) {
          const fromApi = await r.json();
          STATE.localEdits = { ...EMPTY_EDITS, ...fromApi };
          try { localStorage.setItem(pk('localEdits'), JSON.stringify(STATE.localEdits)); } catch {}
        } else {
          if (r.status === 404) localStorage.setItem(pk('noApiBackend'), '1');
          throw new Error('HTTP ' + r.status);
        }
      } catch (_) {
        const saved = localStorage.getItem(pk('localEdits'));
        if (saved) { try { STATE.localEdits = { ...EMPTY_EDITS, ...JSON.parse(saved) }; } catch {} }
      }
    } else {
      const saved = localStorage.getItem(pk('localEdits'));
      if (saved) { try { STATE.localEdits = { ...EMPTY_EDITS, ...JSON.parse(saved) }; } catch {} }
    }
  }
  // Load settings
  ['bigText','hideAmounts'].forEach(k => {
    const v = localStorage.getItem(k);
    if (v !== null) STATE[k] = v === 'true';
  });
  // Display mode per view — osobne klucze + sufiks per viewport (_m mobile / _d desktop).
  // Fallback: klucz bez sufiksu (legacy) → potem stary 'uiDisplay' → wszystkie 3 widoki.
  const sfx = viewportSuffix();
  const legacyDisp = localStorage.getItem('uiDisplay');
  const isValidDisp = v => v === 'list' || v === 'grid2' || v === 'grid3';
  ['Home', 'Trans', 'Hist'].forEach(view => {
    const k = 'uiDisplay' + view;
    const v = localStorage.getItem(k + sfx) || localStorage.getItem(k) || legacyDisp;
    if (isValidDisp(v)) STATE[k] = v;
  });
  // Plan ma własny zestaw opcji (list/bar/donut)
  const planD = localStorage.getItem('uiDisplayPlan' + sfx) || localStorage.getItem('uiDisplayPlan');
  if (planD === 'list' || planD === 'bar' || planD === 'donut') STATE.uiDisplayPlan = planD;
  // Charts: line (blob) / bars (dots) — default line
  STATE.uiDisplayCharts = 'line';
  const chartD = localStorage.getItem('uiDisplayCharts' + sfx) || localStorage.getItem('uiDisplayCharts');
  if (chartD === 'line' || chartD === 'bars') STATE.uiDisplayCharts = chartD;
  const tlZ = localStorage.getItem('tlZakres');
  if (tlZ === '1' || tlZ === '2' || tlZ === '3' || tlZ === 'all') STATE.tlZakres = tlZ;
  // Hist/Trans hidden cats — osobne klucze; fallback: stary 'uiHiddenCats' → Historia
  const hcH = localStorage.getItem('uiHiddenCatsHist') || localStorage.getItem('uiHiddenCats');
  if (hcH) { try { STATE.uiHiddenCatsHist = JSON.parse(hcH) || {}; } catch (_) {} }
  const hcT = localStorage.getItem('uiHiddenCatsTrans');
  if (hcT) { try { STATE.uiHiddenCatsTrans = JSON.parse(hcT) || {}; } catch (_) {} }
  const tm = localStorage.getItem('themeMode');
  if (tm === 'auto' || tm === 'light' || tm === 'dark') STATE.themeMode = tm;
  applyTheme();
  // Czekaj na fonty — żeby animacja nie odpaliła się na fallback
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
  document.body.classList.remove('fonts-loading');
  // Settings UI sync — STATE jest dopiero teraz załadowany z localStorage
  if (typeof syncSettingsUi === 'function') syncSettingsUi();
  render();
}

function saveLocal() {
  // W cloud mode edycje sa ephemeralne (idą wprost do Sheets), nie persistujemy lokalnie
  if (STATE.dataMode === 'cloud') return;
  try { localStorage.setItem(pk('localEdits'), JSON.stringify(STATE.localEdits)); } catch {}
}

// ===== API helpers (server-side persistence — mirror Apps Script doPost shape) =====
async function api(url, opts = {}) {
  const isMutation = opts.method && opts.method !== 'GET';
  if (STATE.dataMode === 'cloud' && isMutation) return cloudCall(url, opts);
  // Skip jeśli już wiemy że nie ma backendu API (static server, GitHub Pages) — mutacje lecą tylko do localStorage przez saveLocal()
  // Marta nie ma serwera dla swoich danych — force skip.
  if (STATE.activeProfile === 'marta' || localStorage.getItem(pk('noApiBackend')) === '1') return;
  try {
    const r = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    if (!r.ok) {
      if (r.status === 404) localStorage.setItem(pk('noApiBackend'), '1');
      console.warn('API', url, 'HTTP', r.status);
    }
    return r;
  } catch (e) { console.warn('API offline', url, e.message); }
}

// Routuje lokalne URL+method na Apps Script {action, token, ...}
async function cloudCall(localUrl, opts) {
  if (!getCloudUrl()) {
    toast('Cloud dla profilu ' + STATE.activeProfile + ' nie skonfigurowany', 'err');
    return;
  }
  if (!STATE.cloudToken) {
    toast('Brak tokenu — wpisz w Ustawieniach', 'err');
    return;
  }
  const m = opts.method;
  const body = opts.body ? JSON.parse(opts.body) : {};
  let payload = { token: STATE.cloudToken };
  let mm;
  if ((mm = localUrl.match(/^\/api\/wpis\/(\d+)$/))) {
    if (m === 'PATCH') payload = { ...payload, action: 'updateWpis', id: Number(mm[1]), patch: body };
    else if (m === 'DELETE') payload = { ...payload, action: 'deleteWpis', id: Number(mm[1]) };
  } else if (localUrl === '/api/wpis' && m === 'POST') {
    payload = { ...payload, action: 'addWpis', wpis: body };
  } else if ((mm = localUrl.match(/^\/api\/template\/(\d+)$/))) {
    if (m === 'PATCH') payload = { ...payload, action: 'updateTemplate', id: Number(mm[1]), patch: body };
    else if (m === 'DELETE') payload = { ...payload, action: 'deleteTemplate', id: Number(mm[1]) };
  } else if (localUrl === '/api/template' && m === 'POST') {
    payload = { ...payload, action: 'addTemplate', template: body };
  } else {
    toast('Cloud writeback: nieobsługiwane ' + m + ' ' + localUrl, 'err');
    return;
  }
  syncStart('Zapis do chmury...');
  try {
    const r = await fetch(getCloudUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // bypass CORS preflight
      body: JSON.stringify(payload),
    });
    if (!r.ok) { toast('Cloud HTTP ' + r.status, 'err'); return; }
    const j = await r.json();
    if (!j.ok) { toast('Cloud: ' + (j.error || 'unknown'), 'err'); return; }
    const successMsg = {
      addWpis: 'Dodano',
      updateWpis: 'Zapisano',
      deleteWpis: 'Usunięto',
      addTemplate: 'Dodano stałą',
      updateTemplate: 'Zapisano stałą',
      deleteTemplate: 'Usunięto stałą',
    }[payload.action];
    if (successMsg) toast(successMsg);
    applyMutationToCache(payload.action, payload);
    return r;
  } catch (e) {
    toast('Cloud error: ' + e.message, 'err');
  } finally {
    syncEnd();
  }
}
const apiAddWpis        = (w)         => api('/api/wpis',           { method: 'POST',   body: JSON.stringify(w) });
const apiPatchWpis      = (id, patch) => api('/api/wpis/' + id,     { method: 'PATCH',  body: JSON.stringify(patch) });
const apiDeleteWpis     = (id)        => api('/api/wpis/' + id,     { method: 'DELETE' });
const apiAddTemplate    = (t)         => api('/api/template',       { method: 'POST',   body: JSON.stringify(t) });
const apiPatchTemplate  = (id, patch) => api('/api/template/' + id, { method: 'PATCH',  body: JSON.stringify(patch) });
const apiDeleteTemplate = (id)        => api('/api/template/' + id, { method: 'DELETE' });
const apiReset          = ()          => api('/api/reset',          { method: 'POST' });

// ============== DATA QUERIES (nowy schema: wpisy + templates + plany) ==============
function getAllWpisy() {
  if (!STATE.data) return [];
  const base = STATE.data.wpisy.map(w => ({ ...w, ...(STATE.localEdits.updated[w.id] || {}) }));
  const visible = base.filter(w => !w.usuniety && !STATE.localEdits.deleted.includes(w.id));
  return [...visible, ...STATE.localEdits.added];
}

function getMonthWpisy(yr = STATE.yr, mi = STATE.mi) {
  return getAllWpisy().filter(w => w.rok === yr && w.miesiac === mi);
}

function getTemplate(id) {
  if (!STATE.data || id == null) return null;
  const localT = STATE.localEdits.templates && STATE.localEdits.templates[id];
  let baseT = STATE.data.templates.find(t => t.id === id);
  // Sprawdź też dodane lokalnie (z promote)
  if (!baseT && STATE.localEdits.addedTemplates) {
    baseT = STATE.localEdits.addedTemplates.find(t => t.id === id);
  }
  return baseT ? { ...baseT, ...(localT || {}) } : null;
}

// Szacunek dla wpisu: override per-mc → template → fallback do w.kwota
function getSzacunek(w) {
  if (w.kwota_szacunek_override != null) return w.kwota_szacunek_override;
  const tpl = getTemplate(w.template_id);
  return tpl ? tpl.kwota_szacunek : w.kwota;
}

function getStaleWpisy(yr = STATE.yr, mi = STATE.mi) {
  return getMonthWpisy(yr, mi).filter(w => w.typ === 'stale');
}

// Aktywne monthly templates wydatki (base + addedTemplates) — do pokazania jako ghosty
function getMonthlyTemplates() {
  if (!STATE.data) return [];
  const base = STATE.data.templates;
  const added = STATE.localEdits.addedTemplates || [];
  const patch = STATE.localEdits.templates || {};
  return [...base, ...added]
    .map(t => ({ ...t, ...(patch[t.id] || {}) }))
    .filter(t => t.aktywny && t.freq === 'monthly' && t.kierunek === 'wydatek');
}

// Lista templates dla których NIE ma instancji w (yr, mi) — ghosty do materializacji
function getMissingStaleTemplates(yr = STATE.yr, mi = STATE.mi) {
  const existingTplIds = new Set(getStaleWpisy(yr, mi).map(w => w.template_id).filter(x => x != null));
  return getMonthlyTemplates().filter(t => !existingTplIds.has(t.id));
}

// Granice nawigacji — najwcześniejszy i najpóźniejszy (rok,mies) z dane.json + lokalnych dodanych
function getDataBounds() {
  if (!STATE.data || !STATE.data.wpisy.length) return null;
  const all = STATE.data.wpisy.concat(STATE.localEdits.added || []);
  let min = Infinity, max = -Infinity;
  all.forEach(w => {
    const v = w.rok * 12 + w.miesiac;
    if (v < min) min = v;
    if (v > max) max = v;
  });
  return { min, max };
}

// canGoPrev: można cofać tylko do najwcześniejszego mc z danymi
function canGoPrev() {
  const b = getDataBounds(); if (!b) return true;
  const newMi = STATE.mi - 1;
  const newYr = newMi < 1 ? STATE.yr - 1 : STATE.yr;
  const newMiAdj = newMi < 1 ? 12 : newMi;
  return (newYr * 12 + newMiAdj) >= b.min;
}

// canGoNext: pozwala iść do mc z danymi + jeden pusty mc dalej (do materializacji). Nie więcej.
function canGoNext() {
  const b = getDataBounds(); if (!b) return false;
  const newMi = STATE.mi + 1;
  const newYr = newMi > 12 ? STATE.yr + 1 : STATE.yr;
  const newMiAdj = newMi > 12 ? 1 : newMi;
  return (newYr * 12 + newMiAdj) <= b.max + 1;
}

// Granice roku dla Timeline — bazujemy na latach z danymi (bez +1 buforu, bo Timeline = przegląd historyczny)
function getYearBounds() {
  if (!STATE.data || !STATE.data.wpisy.length) return null;
  const all = STATE.data.wpisy.concat(STATE.localEdits.added || []);
  let min = Infinity, max = -Infinity;
  all.forEach(w => { if (w.rok < min) min = w.rok; if (w.rok > max) max = w.rok; });
  return { min, max };
}

// Materializacja: dla każdego monthly template bez wpisu (rok, mi) → utwórz wpis z kwota=0
async function materializeMonth(yr = STATE.yr, mi = STATE.mi) {
  if (STATE.dataMode === 'cloud') {
    const allTemplates = [...STATE.data.templates, ...(STATE.localEdits.addedTemplates || [])];
    const allWpisy = getAllWpisy();
    const monthly = allTemplates.filter(t => t.aktywny && t.freq === 'monthly');
    const toCreate = monthly.filter(t => !allWpisy.some(w => w.template_id === t.id && w.rok === yr && w.miesiac === mi));
    if (toCreate.length === 0) { toast('Wszystkie Stałe już są dla tego miesiąca'); return 0; }
    let id = nextWpisId();
    const newWpisy = toCreate.map(t => ({
      id: id++, typ: 'stale', kierunek: t.kierunek, rok: yr, miesiac: mi, data: '',
      nazwa: t.nazwa, kategoria: t.kategoria, kwota: 0, kwota_partnera: 0,
      dzielony: false, anomalia: false, template_id: t.id, opis: '', usuniety: false,
    }));
    STATE.localEdits.added.push(...newWpisy);
    render(); // optimistic UI
    syncStart('Tworzenie ' + newWpisy.length + ' Stałych...');
    try {
      const r = await fetch(getCloudUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ token: STATE.cloudToken, action: 'bulkAddWpis', wpisy: newWpisy }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'bulk failed');
      applyMutationToCache('bulkAddWpis', { wpisy: newWpisy });
      toast('Utworzono ' + newWpisy.length + ' Stałych');
    } catch (e) {
      toast('Bulk error: ' + e.message + ' — rollback', 'err');
      newWpisy.forEach(w => {
        const i = STATE.localEdits.added.findIndex(x => x.id === w.id);
        if (i >= 0) STATE.localEdits.added.splice(i, 1);
      });
      render();
    } finally {
      syncEnd();
    }
    return newWpisy.length;
  }
  // Local mode (z API albo bez) — gdy brak API backendu, materializujemy klient-side identycznie jak w cloud
  // Marta zawsze leci klient-side (jej dane nie są w serve.js).
  if (STATE.activeProfile === 'marta' || localStorage.getItem(pk('noApiBackend')) === '1') {
    const allTemplates = [...STATE.data.templates, ...(STATE.localEdits.addedTemplates || [])];
    const allWpisy = getAllWpisy();
    const monthly = allTemplates.filter(t => t.aktywny && t.freq === 'monthly');
    const toCreate = monthly.filter(t => !allWpisy.some(w => w.template_id === t.id && w.rok === yr && w.miesiac === mi));
    if (toCreate.length === 0) { toast('Wszystkie Stałe już są dla tego miesiąca'); return 0; }
    let id = nextWpisId();
    const newWpisy = toCreate.map(t => ({
      id: id++, typ: 'stale', kierunek: t.kierunek, rok: yr, miesiac: mi, data: '',
      nazwa: t.nazwa, kategoria: t.kategoria, kwota: 0, kwota_partnera: 0,
      dzielony: false, anomalia: false, template_id: t.id, opis: '', usuniety: false,
    }));
    STATE.localEdits.added.push(...newWpisy);
    saveLocal();
    render();
    return newWpisy.length;
  }
  try {
    const r = await fetch('/api/materialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rok: yr, miesiac: mi }),
    });
    if (!r.ok) {
      if (r.status === 404) localStorage.setItem(pk('noApiBackend'), '1');
      throw new Error('HTTP ' + r.status);
    }
    const out = await r.json();
    const r2 = await fetch('/api/edits');
    if (r2.ok) {
      const fromApi = await r2.json();
      STATE.localEdits = { added: [], updated: {}, deleted: [], templates: {}, addedTemplates: [], deletedTemplates: [], planOverrides: {}, paidRecurring: {}, ...fromApi };
      saveLocal();
    }
    render();
    return out.created;
  } catch (e) { toast('Błąd materializacji: ' + e.message, 'err'); }
}

function nextWpisId() {
  const allWpisy = getAllWpisy();
  return Math.max(0, ...allWpisy.map(w => w.id), ...STATE.data.wpisy.map(w => w.id)) + 1;
}

// Materializacja JEDNEGO templatu (klik na ghost) + od razu otwórz lightbox edycji
async function materializeOneTemplate(tpl, yr = STATE.yr, mi = STATE.mi) {
  const nextId = nextWpisId();
  const w = {
    id: nextId,
    typ: 'stale',
    kierunek: tpl.kierunek,
    rok: yr, miesiac: mi,
    data: '',
    nazwa: tpl.nazwa,
    kategoria: tpl.kategoria,
    kwota: 0, kwota_partnera: 0,
    dzielony: false, anomalia: false,
    template_id: tpl.id,
    opis: '', usuniety: false,
  };
  STATE.localEdits.added.push(w);
  saveLocal();
  await apiAddWpis(w);
  render();
  openLightbox(w); // user może od razu wpisać kwotę
}

function getNadchodzaceWpisy(yr = STATE.yr) {
  // Wszystkie nadchodzace dla roku, włącznie z miesiącami przeszłymi (history)
  return getAllWpisy().filter(w => w.typ === 'nadchodzace' && w.rok === yr);
}

function getAlerts(yr = STATE.yr, mi = STATE.mi, lookbackYears = 2) {
  const yrs = [];
  for (let i = 0; i <= lookbackYears; i++) yrs.push(yr - i);
  return getAllWpisy()
    .filter(w => w.typ === 'transakcja' && w.anomalia && w.miesiac === mi && yrs.includes(w.rok))
    .sort((a, b) => (b.rok - a.rok) || (Math.abs(b.kwota) - Math.abs(a.kwota)));
}

function sumOut(yr = STATE.yr, mi = STATE.mi) {
  return getMonthWpisy(yr, mi)
    .filter(w => w.kierunek === 'wydatek')
    .reduce((s, w) => s + w.kwota, 0);
}

function sumIn(yr = STATE.yr, mi = STATE.mi) {
  return getMonthWpisy(yr, mi)
    .filter(w => w.kierunek === 'przychod')
    .reduce((s, w) => s + w.kwota, 0);
}

function sumCat(kat, yr = STATE.yr, mi = STATE.mi) {
  return getMonthWpisy(yr, mi)
    .filter(w => w.kategoria === kat && w.kierunek === 'wydatek')
    .reduce((s, w) => s + w.kwota, 0);
}

function getPlan(kat, yr = STATE.yr, mi = STATE.mi) {
  if (!STATE.data) return 0;
  const override = STATE.localEdits.planOverrides?.[`${yr}_${kat}_${mi}`];
  if (override != null) return override;
  const row = STATE.data.plany.find(p => p.rok === yr && p.kategoria === kat);
  return row ? row[ML[mi - 1]] || 0 : 0;
}

function planTotal(yr = STATE.yr, mi = STATE.mi) {
  return CATS.reduce((s, k) => s + getPlan(k, yr, mi), 0);
}

// Helper: zaktualizuj wpis (lightbox save) — lokalnie + API
function updateWpis(id, patch) {
  // Jeśli wpis był dodany lokalnie (w added), modyfikuj tam
  const addedIdx = STATE.localEdits.added.findIndex(w => w.id === id);
  if (addedIdx !== -1) {
    Object.assign(STATE.localEdits.added[addedIdx], patch);
  } else {
    if (!STATE.localEdits.updated[id]) STATE.localEdits.updated[id] = {};
    Object.assign(STATE.localEdits.updated[id], patch);
  }
  saveLocal();
  apiPatchWpis(id, patch);
}

// Helper: soft-delete — usuń z added lub dodaj do deleted, plus API
function deleteWpis(id) {
  const addedIdx = STATE.localEdits.added.findIndex(w => w.id === id);
  if (addedIdx !== -1) {
    STATE.localEdits.added.splice(addedIdx, 1);
  } else if (!STATE.localEdits.deleted.includes(id)) {
    STATE.localEdits.deleted.push(id);
  }
  saveLocal();
  apiDeleteWpis(id);
}

// Helper: aktualizuj template (zmiana "od teraz na stałe")
function updateTemplate(id, patch) {
  if (!STATE.localEdits.templates) STATE.localEdits.templates = {};
  if (!STATE.localEdits.templates[id]) STATE.localEdits.templates[id] = {};
  Object.assign(STATE.localEdits.templates[id], patch);
  saveLocal();
  apiPatchTemplate(id, patch);
}

