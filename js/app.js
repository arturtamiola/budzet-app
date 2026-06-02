// ============== MAIN RENDER ==============
// === UNIFIED ENTRANCE ANIMATIONS ===
// Chrome (raz per mount widoku) vs dane (zawsze). Sortuje wszystko po pozycji top-left → bottom-right.
const ANIM_CHROME_SEL = '.big-h, .ctrl-bar, .tl-section-h, .shell-hero, .trans-add-tile, .tx-month-h';
const ANIM_DATA_SEL = '.hero-anim, .mini-tile, .tile-mid, .tx-row, .pr, .pr-sum, .plan-tile, .plan-donut, .ichip, .chip, .chart-area';
const ANIM_ALL_SEL = ANIM_CHROME_SEL + ', ' + ANIM_DATA_SEL;

function runEntranceAnims(rootOrSameView, maybeSameView) {
  // Backward-compat: można wywołać runEntranceAnims(true/false) z #app jako rootem,
  // ALBO runEntranceAnims(detachedNode, isSameView) gdy stagger ma być pre-mount.
  let root, isSameView;
  if (rootOrSameView instanceof Element) {
    root = rootOrSameView;
    isSameView = !!maybeSameView;
  } else {
    root = document.getElementById('app');
    isSameView = !!rootOrSameView;
  }
  if (!root) return;
  if (isSameView) {
    root.querySelectorAll(ANIM_CHROME_SEL).forEach(el => el.classList.add('anim-skip'));
  }
  // ROZDZIELONE PULE STAGGERA:
  //   Chrome (tytuł, ctrl-bar) — własna kaskada od 0ms, mały step 14ms (kilka elementów, szybki bly fade)
  //   Data (tiles, rows, charts) — własna kaskada od 0ms, step 22ms (więcej elementów, dłuższy bly cascade)
  // Pule lecą RÓWNOLEGLE, nie sekwencyjnie. Dzięki temu nav-switch (chrome+data) ma to samo
  // odczucie tempa co arrow / filter (tylko data) — pierwszy tile zawsze startuje ~0ms.
  const chromeTargets = Array.from(root.querySelectorAll(ANIM_CHROME_SEL))
    .filter(el => !el.classList.contains('anim-skip'));
  chromeTargets.forEach((el, i) => {
    el.style.setProperty('--anim-d', Math.min(i * 14, 120) + 'ms');
  });
  const dataTargets = Array.from(root.querySelectorAll(ANIM_DATA_SEL))
    .filter(el => !el.classList.contains('anim-skip'));
  dataTargets.forEach((el, i) => {
    el.style.setProperty('--anim-d', Math.min(i * 22, 450) + 'ms');
  });
}

let _renderPending = false;
function render() {
  const app = document.getElementById('app');
  // Re-render tego samego widoku? (swipe miesiąca, filtr, sort — chrome zostaje, dane reanimują)
  const sameView = STATE._lastView === STATE.view;
  // Smooth view-switch transition: stagger fade-out → render → stagger fade-in.
  // Tylko gdy zmiana widoku (sameView=false) i już jest co fade-outować.
  // Jeśli kolejny render leci w trakcie out — skip out (renderuj od razu, użytkownik chce nowy widok teraz).
  if (!sameView && app.firstChild && !_renderPending) {
    _renderPending = true;
    // Włącz też elementy chrome przeniesione do #ctrls-global (poza app)
    const ctrlsGlobal = document.getElementById('ctrls-global');
    const outTargets = [
      ...Array.from(app.querySelectorAll(ANIM_ALL_SEL)),
      ...(ctrlsGlobal ? Array.from(ctrlsGlobal.querySelectorAll(ANIM_ALL_SEL)) : []),
    ];
    // Web Animations API — czyta computed opacity (działa też dla elementów mid-entrance)
    // i fade-uje deterministycznie do 0. Nie kolides z CSS animation/keyframes.
    outTargets.forEach((el, i) => {
      el.classList.remove('anim-skip');
      const delay = Math.min(i * 8, 60);
      const cur = parseFloat(getComputedStyle(el).opacity) || 1;
      el.animate(
        [
          { opacity: cur, transform: 'translateY(0)' },
          { opacity: 0, transform: 'translateY(-4px)' },
        ],
        { duration: 200, delay, easing: 'cubic-bezier(0.4, 0, 0.7, 0.2)', fill: 'forwards' }
      );
    });
    setTimeout(() => {
      _renderPending = false;
      _doRender();
    }, 260);
    return;
  }
  _doRender();
}

function _doRender() {
  const app = document.getElementById('app');
  const sameView = STATE._lastView === STATE.view;
  STATE._lastView = STATE.view;
  app.innerHTML = '';
  // Ukryj legendę Historii jeśli zmieniamy widok (renderTimeline pokaże ją z powrotem)
  const legendHost = document.getElementById('tl-legend-host');
  if (legendHost && STATE.view !== 'timeline') legendHost.style.display = 'none';
  const viewEl = ({
    home: renderHome,
    plan: renderPlan,
    trans: renderTrans,
    charts: renderCharts,
    timeline: renderTimeline,
  }[STATE.view] || renderHome)();
  // Stagger PRZED mountem — --anim-d musi być na elemencie zanim browser rozpocznie animację
  runEntranceAnims(viewEl, sameView);
  app.appendChild(viewEl);

  // Topbar — miesiąc + rok dla wszystkich widoków (Timeline tez używa sliding window centrowanego na (yr,mi))
  const lbl = document.getElementById('month-label');
  lbl.textContent = `${ML_FULL[STATE.mi - 1]} ${String(STATE.yr).slice(2)}`;
  lbl.classList.remove('year-only');

  // Update nav active
  $$('.nav-item').forEach(n => {
    const v = n.getAttribute('data-view');
    n.classList.toggle('active', v === STATE.view);
  });

  // Update strzałki — disable visually gdy granica miesięcznych danych
  document.getElementById('prev-month').classList.toggle('disabled', !canGoPrev());
  document.getElementById('next-month').classList.toggle('disabled', !canGoNext());

  // Apply hide-amounts re-render is enough
  document.body.classList.toggle('big-text', !!STATE.bigText);
  syncThemeSeg();

  // Przerzuć .ctrl-host z bieżącego widoku do globalnego slotu pod topbarem
  const ctrlsGlobal = document.getElementById('ctrls-global');
  if (ctrlsGlobal) {
    ctrlsGlobal.innerHTML = '';
    const ch = app.querySelector('.ctrl-host');
    if (ch) ctrlsGlobal.appendChild(ch);
  }

}

// ============== ADD MODAL ==============
// (openAddModal + renderAddBody + saveAdd zdefiniowane niżej — Task 9)

// ============== SWIPE NAV ==============
let swipe = null;
const SWIPE_THRESHOLD = 70;

function onPointerDown(e) {
  if (e.button !== undefined && e.button > 0) return;
  if (document.querySelector('.sheet.show, .mpicker.show, .mp-bg.show, .modal-bg.show')) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (['input','textarea','select'].includes(tag)) return;
  swipe = { x0: e.clientX, y0: e.clientY, active: false, started: false };
}

function onPointerMove(e) {
  if (!swipe) return;
  const dx = e.clientX - swipe.x0;
  const dy = e.clientY - swipe.y0;
  if (!swipe.started) {
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
    if (Math.abs(dx) > Math.abs(dy) * 1.3) {
      swipe.started = true;
      swipe.active = true;
    } else {
      swipe = null;
      return;
    }
  }
  if (!swipe.active) return;
  const app = document.getElementById('app');
  app.style.transition = 'none';
  app.style.transform = `translateX(${dx}px)`;
}

function onPointerUp(e) {
  if (!swipe) return;
  const wasActive = swipe.active;
  // pointercancel → e.clientX = 0 → bug: -x0 traktowane jako swipe; ignorujemy cancel
  if (e.type === 'pointercancel') {
    swipe = null;
    if (wasActive) {
      const app = document.getElementById('app');
      app.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)';
      app.style.transform = 'translateX(0)';
    }
    return;
  }
  const dx = e.clientX - swipe.x0;
  swipe = null;
  if (!wasActive) return;
  const app = document.getElementById('app');
  if (Math.abs(dx) > SWIPE_THRESHOLD) {
    const goNext = dx < 0;
    if ((goNext && !canGoNext()) || (!goNext && !canGoPrev())) {
      app.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)';
      app.style.transform = 'translateX(0)';
      return;
    }
    const w = window.innerWidth;
    app.style.transition = 'transform 0.22s cubic-bezier(0.4, 0, 1, 1)';
    app.style.transform = `translateX(${goNext ? -w : w}px)`;
    setTimeout(() => {
      if (goNext) { STATE.mi++; if (STATE.mi > 12) { STATE.mi = 1; STATE.yr++; } }
      else { STATE.mi--; if (STATE.mi < 1) { STATE.mi = 12; STATE.yr--; } }
      app.style.transition = 'none';
      app.style.transform = 'translateX(0)';
      render();
    }, 220);
  } else {
    app.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)';
    app.style.transform = 'translateX(0)';
  }
}

// ============== MONTH PICKER ==============
let pickerYear = null;
function openMonthPicker() {
  pickerYear = STATE.yr;
  renderPicker();
  $('#mp-bg').classList.add('show');
  $('#mpicker').classList.add('show');
}
function closeMonthPicker() {
  $('#mp-bg').classList.remove('show');
  $('#mpicker').classList.remove('show');
}
function renderPicker() {
  if (!STATE.data) return;
  const allWpisy = getAllWpisy();
  const years = [...new Set(allWpisy.map(w => w.rok))].sort();
  const monthsInYear = new Set(allWpisy.filter(w => w.rok === pickerYear).map(w => w.miesiac));

  const yearsEl = $('#mp-years');
  yearsEl.innerHTML = '';
  years.forEach(y => {
    const tab = el('div', { class: 'mp-year' + (y === pickerYear ? ' active' : ''), onclick: () => { pickerYear = y; renderPicker(); } }, [String(y)]);
    yearsEl.appendChild(tab);
  });

  const monthsEl = $('#mp-months');
  monthsEl.innerHTML = '';
  ML.forEach((m, i) => {
    const mi = i + 1;
    const has = monthsInYear.has(mi);
    const isActive = pickerYear === STATE.yr && mi === STATE.mi;
    const cls = 'mp-month' + (isActive ? ' active' : '') + (!has ? ' empty' : '');
    monthsEl.appendChild(el('div', { class: cls, onclick: () => { STATE.yr = pickerYear; STATE.mi = mi; closeMonthPicker(); render(); } }, [m]));
  });
}

// ============== BOOT ==============
// Globalna sync settings UI — musi działać po każdym loadData oraz przy każdym otwarciu settings
function syncSettingsUi() {
  const setT = (id, key) => {
    const t = document.getElementById(id);
    if (!t) return;
    if (STATE[key]) t.classList.add('on'); else t.classList.remove('on');
  };
  setT('t-hide', 'hideAmounts');
  setT('t-big-text', 'bigText');
  if (typeof syncThemeSeg === 'function') syncThemeSeg();
  if (typeof syncDataModeSeg === 'function') syncDataModeSeg();
  // Profile switcher segments
  document.querySelectorAll('#profile-seg .seg').forEach(s =>
    s.classList.toggle('active', s.getAttribute('data-profile') === STATE.activeProfile)
  );
  // Brand sub w sidebar (desktop) — nazwa profilu
  const bsub = document.getElementById('bnav-brand-sub');
  if (bsub) bsub.textContent = STATE.activeProfile === 'marta' ? 'Marta' : 'Artur';
  const tokenEl = document.getElementById('cloud-token-input');
  if (tokenEl) tokenEl.value = STATE.cloudToken || '';
}

function boot() {
  // Nav clicks — tylko items z data-view (nav-settings nie ma, ma własny handler niżej)
  $$('.nav-item').forEach(n => {
    n.addEventListener('click', () => {
      const v = n.getAttribute('data-view');
      if (!v) return;
      STATE.view = v; render();
    });
  });
  $('#gear-btn').addEventListener('click', () => { showSheet('settings-sheet'); syncSettingsUi(); });
  $('#sidebar-gear')?.addEventListener('click', () => { showSheet('settings-sheet'); syncSettingsUi(); });
  // Filtry toggle — pokazuje/ukrywa .ctrl-host w bieżącym widoku
  try {
    const saved = localStorage.getItem('uiCtrlsOpen');
    if (saved !== null) STATE.uiCtrlsOpen = saved === '1';
  } catch (_) {}
  function syncFilterBtn() {
    document.body.classList.toggle('ctrls-closed', !STATE.uiCtrlsOpen);
    document.getElementById('filter-btn').classList.toggle('on', STATE.uiCtrlsOpen);
  }
  syncFilterBtn();
  $('#filter-btn').addEventListener('click', () => {
    STATE.uiCtrlsOpen = !STATE.uiCtrlsOpen;
    try { localStorage.setItem('uiCtrlsOpen', STATE.uiCtrlsOpen ? '1' : '0'); } catch (_) {}
    syncFilterBtn();
  });
  $('#today-btn').addEventListener('click', () => {
    const today = new Date();
    STATE.yr = today.getFullYear();
    STATE.mi = today.getMonth() + 1;
    render();
  });
  // Month/Year nav — z blokadą (poza zakresem danych i gdy są ghosty w bieżącym mc)
  $('#prev-month').addEventListener('click', () => {
    if (!canGoPrev()) return;
    STATE.mi--; if (STATE.mi < 1) { STATE.mi = 12; STATE.yr--; }
    render();
  });
  $('#next-month').addEventListener('click', () => {
    if (!canGoNext()) return;
    STATE.mi++; if (STATE.mi > 12) { STATE.mi = 1; STATE.yr++; }
    render();
  });
  $('#month-label').addEventListener('click', () => {
    if (STATE.view !== 'timeline') openMonthPicker();
  });
  $('#mp-bg').addEventListener('click', closeMonthPicker);
  // Swipe nav
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);
  // Modal close
  $('#modal-bg').addEventListener('click', closeSheet);
  $$('[data-close]').forEach(b => b.addEventListener('click', closeSheet));
  $('#save-add').addEventListener('click', saveAdd);

  // Settings toggles (hide-amounts, big-text) — sync UI robi syncSettingsUi()
  $$('.set-row[data-toggle]').forEach(r => {
    r.addEventListener('click', () => {
      const t = r.getAttribute('data-toggle');
      const map = { 'hide-amounts': 'hideAmounts', 'big-text': 'bigText' };
      const key = map[t];
      if (!key) return;
      STATE[key] = !STATE[key];
      localStorage.setItem(key, STATE[key]);
      syncSettingsUi();
      render();
    });
  });
  syncSettingsUi();

  // Theme segmented control (Auto/Dzień/Noc)
  $$('#theme-seg .seg').forEach(s => {
    s.addEventListener('click', () => {
      STATE.themeMode = s.getAttribute('data-mode');
      localStorage.setItem('themeMode', STATE.themeMode);
      applyTheme();
    });
  });
  syncThemeSeg();

  // Data source segmented control (Local/Cloud)
  $$('#data-mode-seg .seg').forEach(s => {
    s.addEventListener('click', async () => {
      const dm = s.getAttribute('data-dm');
      if (dm === STATE.dataMode) return;
      if (dm === 'cloud' && !getCloudUrl()) {
        toast('Cloud dla profilu ' + STATE.activeProfile + ' nie skonfigurowany', 'err');
        return;
      }
      STATE.dataMode = dm;
      localStorage.setItem(pk('dataMode'), dm);
      syncDataModeSeg();
      toast(dm === 'cloud' ? 'Ładuję z chmury…' : 'Wracam do lokalnego…');
      await loadData();
    });
  });
  syncDataModeSeg();

  // Profile switcher segmented control (Artur/Marta)
  $$('#profile-seg .seg').forEach(s => {
    s.addEventListener('click', async () => {
      const p = s.getAttribute('data-profile');
      if (p === STATE.activeProfile) return;
      toast('Przełączam na ' + (p === 'marta' ? 'Martę' : 'Artura') + '…');
      await switchProfile(p);
      syncSettingsUi();
    });
  });

  // Cloud token input
  const tokenEl = $('#cloud-token-input');
  if (tokenEl) {
    tokenEl.value = STATE.cloudToken || '';
    tokenEl.addEventListener('change', () => {
      STATE.cloudToken = tokenEl.value.trim();
      localStorage.setItem(pk('cloudToken'), STATE.cloudToken);
      toast(STATE.cloudToken ? 'Token zapisany' : 'Token wyczyszczony');
    });
  }

  // Reaguj na zmianę systemu gdy tryb=auto
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (STATE.themeMode === 'auto') applyTheme();
    });
    // Viewport flip (mobile ↔ desktop) — przeładuj display preferencje z osobnych kluczy localStorage.
    // Fallback chain: uiDisplay{view}{sfx} → uiDisplay{view} → 'uiDisplay' (legacy) → STATE default.
    window.matchMedia('(min-width: 900px)').addEventListener('change', () => {
      const sfx = viewportSuffix();
      const legacyDisp = localStorage.getItem('uiDisplay');
      const isValidDisp = v => v === 'list' || v === 'grid2' || v === 'grid3';
      ['Home', 'Trans', 'Hist'].forEach(view => {
        const k = 'uiDisplay' + view;
        const v = localStorage.getItem(k + sfx) || localStorage.getItem(k) || legacyDisp;
        if (isValidDisp(v)) STATE[k] = v; else STATE[k] = 'grid3';
      });
      const planD = localStorage.getItem('uiDisplayPlan' + sfx) || localStorage.getItem('uiDisplayPlan');
      STATE.uiDisplayPlan = (planD === 'list' || planD === 'bar' || planD === 'donut') ? planD : 'list';
      const chartD = localStorage.getItem('uiDisplayCharts' + sfx) || localStorage.getItem('uiDisplayCharts');
      STATE.uiDisplayCharts = (chartD === 'line' || chartD === 'bars') ? chartD : 'line';
      render();
    });
  }

  $('#export-xlsx').addEventListener('click', exportMonthXlsx);

  $('#cloud-logout').addEventListener('click', () => {
    STATE.cloudToken = '';
    localStorage.removeItem(pk('cloudToken'));
    const tokenEl = $('#cloud-token-input');
    if (tokenEl) tokenEl.value = '';
    STATE.dataMode = 'local';
    localStorage.setItem(pk('dataMode'), 'local');
    syncDataModeSeg();
    toast('Wylogowano — tryb lokalny');
  });

  loadData();
  autoWireKeypad();
}

boot();
