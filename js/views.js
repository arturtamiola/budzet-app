// ============== VIEWS ==============
function renderEmptyMonth() {
  const ghostsCount = getMissingStaleTemplates().length;
  return el('div', { style: 'padding:120px 32px 40px;text-align:center;min-height:60vh;display:flex;flex-direction:column;justify-content:center;align-items:center' }, [
    el('div', { class: 'big-h', style: 'font-size:64px;line-height:1;color:var(--border);margin-bottom:18px' }, [ML_FULL[STATE.mi - 1]]),
    el('div', { style: 'font-size:var(--txt-name-size);font-weight:var(--txt-name-weight);color:var(--muted);margin-bottom:6px' }, [`${STATE.yr}`]),
    el('div', { style: 'font-size:var(--txt-name-size);color:var(--muted-2);margin-bottom:42px;max-width:280px' }, [
      `Brak danych dla tego miesiąca. Kliknij aby dodać ${ghostsCount} Stał${ghostsCount === 1 ? 'y' : 'ych'} wydatk${ghostsCount === 1 ? '' : 'ów'} z templates.`,
    ]),
    el('button', {
      class: 'big-cta',
      onclick: () => materializeMonth(),
    }, [`+ Dodaj miesiąc ${ML_FULL[STATE.mi - 1]} ${String(STATE.yr).slice(2)}`]),
  ]);
}

function renderHome() {
  // Empty state — miesiąc bez żadnych wpisów (fallback; normalnie niedostępny przez nav, tylko jeśli user trafi inaczej)
  if (getMonthWpisy().length === 0) return renderEmptyMonth();

  const out = sumOut();
  const income = sumIn();
  const free = income - out;
  const pct = income > 0 ? Math.round((out / income) * 100) : 0;

  const stale = getStaleWpisy().filter(w => w.kierunek === 'wydatek');
  const naduch = getNadchodzaceWpisy().filter(w => w.miesiac === STATE.mi);
  const alerts = getAlerts().slice(0, 6);

  const homeDisp = STATE.uiDisplayHome;
  // Home ma własną specyfikę: każdy tryb pokazuje /szacunek
  const renderTile = (w) => {
    if (homeDisp === 'list') return renderRow(w, () => openLightbox(w), 'list');
    const tpl = getTemplate(w.template_id);
    const szacunek = getSzacunek(w);
    const paid = w.kwota > 0;
    const name = tpl ? tpl.nazwa : w.nazwa;
    if (homeDisp === 'grid2') {
      return el('div', {
        class: 'tile-mid' + (paid ? '' : ' unpaid'),
        onclick: () => openLightbox(w),
      }, [
        el('div', { class: 'tile-mid-nm' }, [name]),
        el('div', { class: 'tile-mid-cat' }, [w.kategoria]),
        el('div', { class: 'tile-mid-v' }, [
          fmtH(Math.abs(w.kwota)),
          el('span', { class: 'planned' }, [`/${fmtH(szacunek)}`]),
        ]),
      ]);
    }
    return el('div', {
      class: 'mini-tile ' + (paid ? 'paid' : 'unpaid'),
      onclick: () => openLightbox(w),
    }, [
      el('div', { class: 'n' }, [name]),
      el('div', { class: 'a' }, [
        fmtAmt(w.kwota),
        el('span', { class: 'planned' }, [`/${fmtH(szacunek)}`]),
      ]),
    ]);
  };

  const renderAlertTile = (w) => {
    if (homeDisp !== 'grid3') return renderRow(w, () => openTimelineDetail({ ...w, kind: 'alert', srcYr: w.rok }), homeDisp);
    return el('div', {
      class: 'mini-tile anom',
      onclick: () => openTimelineDetail({ ...w, kind: 'alert', srcYr: w.rok }),
      style: 'cursor:pointer',
    }, [
      el('div', { class: 'n' }, [
        el('span', { style: 'color:var(--muted);font-weight:800;margin-right:4px' }, [`'${String(w.rok).slice(2)}`]),
        w.nazwa,
      ]),
      el('div', { class: 'a' }, [fmtAmt(Math.abs(w.kwota))]),
    ]);
  };

  const addBtn = (tryb) => el('button', {
    class: 'sec-add',
    onclick: () => openAddModal(tryb),
    title: 'Dodaj nowy ' + tryb,
  }, ['+']);

  const sections = [];

  // Helper: mini-grid klasa per uiDisplayHome
  const mgClass = STATE.uiDisplayHome === 'list' ? 'mini-grid disp-list'
    : STATE.uiDisplayHome === 'grid2' ? 'mini-grid disp-grid2'
    : 'mini-grid';

  // Hero: wolny budżet
  sections.push(el('div', { style: 'padding:36px 24px 0' }, [
    el('div', { class: 'caps-i hero-anim', style: 'margin-bottom:14px' }, ['Wolny budżet']),
    el('div', { class: 'anton num hero-anim', style: `font-size:88px;line-height:1;letter-spacing:-3px;color:${free < 0 ? 'var(--danger)' : 'var(--fg)'}` },
      [(free < 0 ? '−' : '') + fmtAmt(free)]),
    el('div', { class: 'hero-anim', style: 'height:4px;background:var(--surface-3);margin-top:18px' }, [
      el('div', { style: `height:100%;width:${Math.max(0, 100 - pct)}%;background:${pct >= 100 ? '#c00' : '#000'}` }),
    ]),
    el('div', { class: 'hero-anim', style: 'display:flex;justify-content:space-between;margin-top:12px;gap:14px' }, [
      el('div', {}, [
        el('div', { class: 'caps-i', style: 'margin-bottom:3px' }, ['Wydane']),
        el('div', { class: 'hero-stat-v' }, [`${fmtAmt(out)} / ${pct}%`]),
      ]),
      el('div', { style: 'text-align:right' }, [
        el('div', { class: 'caps-i', style: 'margin-bottom:3px' }, ['Przychody']),
        el('div', { class: 'hero-stat-v' }, [fmtAmt(income)]),
      ]),
    ]),
  ]));

  // Display switch standalone (Home nie potrzebuje kategorii)
  sections.push(el('div', { class: 'ctrl-host' }, [
    el('div', { class: 'ctrl-bar solo' }, [
      renderDispSwitch('uiDisplayHome', 'uiDisplayHome'),
    ]),
  ]));

  // Sekcja Stałe — wpisy z Wpisy + brakujące templates jako ghosty (k=0, klik = utwórz wpis k=0)
  if (stale.length) {
    const ghosts = getMissingStaleTemplates();
    const paid = stale.filter(w => w.kwota > 0).length;
    const total = stale.length + ghosts.length; // wszystkie monthly templates
    const staleSorted = stale.slice().sort((a, b) => {
      const ap = a.kwota > 0 ? 1 : 0;
      const bp = b.kwota > 0 ? 1 : 0;
      if (ap !== bp) return ap - bp;
      return (a.nazwa || '').localeCompare(b.nazwa || '');
    });
    const renderGhost = (tpl) => el('div', {
      class: 'mini-tile unpaid',
      onclick: () => materializeOneTemplate(tpl),
      title: `"${tpl.nazwa}" brakuje w tym mc — klik utworzy wpis (k=0)`,
    }, [
      el('div', { class: 'n' }, [tpl.nazwa]),
      el('div', { class: 'a' }, [
        fmtAmt(0),
        el('span', { class: 'planned' }, [`/${fmtH(tpl.kwota_szacunek)}`]),
      ]),
    ]);
    const addTile = el('div', {
      class: 'mini-tile add-tile',
      onclick: () => openAddModal('stale', true),
      title: 'Dodaj nowy Stały template + wpis dla tego miesiąca',
    }, ['+']);
    // Kolejność: niezapł realne + ghosty (wszystko k=0) na górze, zapłacone na dole, addTile na końcu
    const unpaidReal = staleSorted.filter(w => w.kwota === 0);
    const paidReal = staleSorted.filter(w => w.kwota > 0);
    sections.push(el('div', { style: 'padding:24px 24px 0' }, [
      el('div', { class: 'caps-i hero-anim', style: 'margin-bottom:14px' }, [`Stałe · ${ML_FULL[STATE.mi - 1]}`]),
      el('div', { class: mgClass }, [
        ...unpaidReal.map(renderTile),
        ...ghosts.map(renderGhost),
        ...paidReal.map(renderTile),
        addTile,
      ]),
    ]));
  }

  // Sekcja Nadchodzące — zawsze widoczna (żeby było gdzie dodać pierwszy wpis)
  {
    const naduchSorted = naduch.slice().sort((a, b) => {
      const ap = a.kwota > 0 ? 1 : 0;
      const bp = b.kwota > 0 ? 1 : 0;
      if (ap !== bp) return ap - bp;
      return (a.miesiac - b.miesiac) || (a.nazwa || '').localeCompare(b.nazwa || '');
    });
    const addTileN = el('div', {
      class: 'mini-tile add-tile',
      onclick: () => openAddModal('nadchodzace', true),
      title: 'Dodaj nowy Nadchodzący',
    }, ['+']);
    sections.push(el('div', { style: 'padding:24px 24px 0' }, [
      el('div', { class: 'hero-anim', style: 'margin-bottom:14px' }, [
        el('div', { class: 'caps-i' }, [`Nadchodzące · ${STATE.yr}`]),
      ]),
      el('div', { class: mgClass }, [...naduchSorted.map(renderTile), addTileN]),
    ]));
  }

  // Sekcja Alerty (historia 2 lat)
  if (alerts.length) {
    sections.push(el('div', { style: 'padding:24px 24px 0' }, [
      el('div', { class: 'caps-i hero-anim', style: 'margin-bottom:14px' }, [`Alerty · ${ML_FULL[STATE.mi - 1]} (2 lata wstecz)`]),
      el('div', { class: mgClass }, alerts.map(renderAlertTile)),
    ]));
  }

  return el('div', {}, sections);
}

function renderPlan() {
  if (getMonthWpisy().length === 0) return renderEmptyMonth();
  const sum = sumOut();
  const planSum = planTotal();
  const pctTotal = planSum > 0 ? Math.round((sum / planSum) * 100) : 0;

  const mode = STATE.uiDisplayPlan;
  let tiles;
  if (mode === 'bar') {
    tiles = el('div', { class: 'plan-grid-2' }, CATS.map(k => planBarTile(k)));
  } else if (mode === 'donut') {
    // Donut = 3 kol, bez kafelków — same kółka + tekst pod spodem
    tiles = el('div', { class: 'plan-grid-donut' }, CATS.map(k => planDonutTile(k)));
  } else {
    // list (default) — current planRow
    tiles = el('div', {}, CATS.map(k => planRow(k)));
  }

  return el('div', {}, [
    el('div', { style: 'padding:36px 24px 18px' }, [el('div', { class: 'big-h' }, ['Plan'])]),
    el('div', { class: 'ctrl-host' }, [
      el('div', { class: 'ctrl-bar solo' }, [
        renderDispSwitch('uiDisplayPlan', 'uiDisplayPlan', DISP_OPTS_PLAN),
      ]),
    ]),
    el('div', { style: 'padding:28px 24px 0' }, [
      tiles,
      el('div', { class: 'pr-sum' }, [
        el('div', {}, [
          el('div', { class: 'l' }, ['Suma wydatków']),
          el('div', { class: 'l-sub' }, [`z planu ${fmtH(planSum)} · ${pctTotal}%`]),
        ]),
        el('div', { class: 'v num' }, [fmtAmt(sum)]),
      ]),
    ]),
  ]);
}

function planRow(kat) {
  const actual = sumCat(kat);
  const plan = getPlan(kat);
  const pct = plan > 0 ? Math.round((actual / plan) * 100) : 0;
  const empty = actual === 0 && plan === 0;
  const left = plan - actual; // ile zostało do wydania (ujemne = przekroczone)
  const cls = 'pr' + (empty ? ' empty' : '') + (pct >= 100 ? ' over' : pct >= 80 ? ' warn' : '');
  return el('div', { class: cls, onclick: () => openPlanEdit() }, [
    el('div', { class: 'name' }, [
      el('span', { class: 'icon', html: `<svg viewBox="0 0 24 24">${catIcon(kat)}</svg>` }),
      kat,
    ]),
    el('div', { class: 'val' }, [
      el('span', { class: 'a num' }, [plan > 0 ? fmtH(left) : '—']),
      el('span', { class: 'b num' }, [`/ ${plan > 0 ? fmtH(plan) : '0'}`]),
    ]),
    el('div', { class: 'bar' }, [el('div', { style: `width:${Math.min(100, pct)}%` })]),
  ]);
}

// Plan: bar-centryczny kafelek (2 kol) — struktura jak Home grid2 (tile-mid)
// Layout: nazwa top-left, kwota Anton top-right, /limit+% bottom-left, cienki pasek bottom-right
function planBarTile(kat) {
  const actual = sumCat(kat);
  const plan = getPlan(kat);
  const pct = plan > 0 ? Math.round((actual / plan) * 100) : 0;
  const empty = actual === 0 && plan === 0;
  const left = plan - actual; // ile zostało do wydania (ujemne = przekroczone)
  const cls = 'plan-tile bar' + (empty ? ' empty' : '') + (pct >= 100 ? ' over' : pct >= 80 ? ' warn' : '');
  return el('div', { class: cls, onclick: () => openPlanEdit() }, [
    el('div', { class: 'plan-tile-nm' }, [kat]),
    el('div', { class: 'plan-tile-v num' }, [
      plan > 0 ? fmtH(left) : '—',
      plan > 0 ? el('span', { class: 'planned' }, [`/${fmtH(plan)}`]) : null,
    ].filter(Boolean)),
    el('div', { class: 'plan-tile-bar' }, [el('div', { style: `width:${Math.min(100, pct)}%` })]),
  ]);
}

// Plan: donut-only (2 kol) — bez kafelka, donut wyśrodkowany, tekst pod spodem, lekki font
function planDonutTile(kat) {
  const actual = sumCat(kat);
  const plan = getPlan(kat);
  const pct = plan > 0 ? Math.round((actual / plan) * 100) : 0;
  const empty = actual === 0 && plan === 0;
  const cls = 'plan-donut' + (empty ? ' empty' : '') + (pct >= 100 ? ' over' : pct >= 80 ? ' warn' : '');
  const r = 14;
  const c = 2 * Math.PI * r;
  const dash = (c * Math.min(100, pct)) / 100;
  const donutHtml = `<svg viewBox="0 0 36 36" width="76" height="76">
    <circle cx="18" cy="18" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="1.4"/>
    <circle cx="18" cy="18" r="${r}" fill="none" stroke="var(--donut-fg, var(--fg))" stroke-width="1.4"
            stroke-dasharray="${dash} ${c}" stroke-linecap="round"
            transform="rotate(-90 18 18)"/>
  </svg>`;
  const left = plan - actual; // ile zostało do wydania (ujemne = przekroczone)
  return el('div', { class: cls, onclick: () => openPlanEdit() }, [
    el('div', { class: 'plan-donut-svg' }, [
      el('span', { html: donutHtml }),
      el('span', { class: 'plan-donut-pct' }, [plan > 0 ? pct + '%' : '—']),
    ]),
    el('div', { class: 'plan-donut-nm' }, [kat]),
    el('div', { class: 'plan-donut-amt num' }, [plan > 0 ? fmtH(left) : '—']),
    el('div', { class: 'plan-donut-limit' }, [`/ ${plan > 0 ? fmtH(plan) : '0'}`]),
  ]);
}

function ichip(txt, iconSvg, active, onclick, variant = '') {
  return el('span', {
    class: 'ichip ' + (active ? 'active ' + variant : ''),
    onclick,
  }, [
    el('span', { class: 'ic', html: `<svg viewBox="0 0 24 24">${iconSvg}</svg>` }),
    el('span', { class: 'txt' }, [txt]),
  ]);
}

function renderTrans() {
  if (getMonthWpisy().length === 0) return renderEmptyMonth();

  let wpisy = getMonthWpisy();
  // Wszystko pokazujemy — wpisy z kwota=0 to "niezapłacone" stałe (widoczne na liście)
  // Filtr kategorii — osobny stan dla Trans (niezależny od Historii)
  wpisy = wpisy.filter(w => !STATE.uiHiddenCatsTrans[w.kategoria]);

  // Podziel: Przychody (all kierunek=przychod) idą do osobnej grupy na samym dole.
  // Reszta (wydatki) dzielimy na 3 sekcje: Transakcje (na górze), Nadchodzące, Stałe.
  const przych = wpisy.filter(w => w.kierunek === 'przychod');
  const wydatki = wpisy.filter(w => w.kierunek !== 'przychod');
  const stale = wydatki.filter(w => w.typ === 'stale');
  const nadch = wydatki.filter(w => w.typ === 'nadchodzace');
  const trans = wydatki.filter(w => w.typ === 'transakcja');

  // Stałe + Nadchodzące + Przychody: niezapłacone (k=0) na górze, potem zapłacone DESC po kwocie
  const sortPaidLast = (arr) => arr.sort((a, b) => {
    const aUnp = a.kwota === 0 ? 0 : 1;
    const bUnp = b.kwota === 0 ? 0 : 1;
    if (aUnp !== bUnp) return aUnp - bUnp;
    return Math.abs(b.kwota) - Math.abs(a.kwota);
  });
  sortPaidLast(stale);
  sortPaidLast(nadch);
  sortPaidLast(przych);

  // Transakcje: data DESC (jeśli wypełniona), fallback id DESC (świeższe = u góry; najstarsza na samym dole)
  trans.sort((a, b) => {
    const cmp = (b.data || '').localeCompare(a.data || '');
    return cmp || ((b.id || 0) - (a.id || 0));
  });

  const sumOut2 = wpisy.filter(w => w.kierunek === 'wydatek').reduce((s,w) => s + Math.abs(w.kwota), 0);
  const sumIn2 = wpisy.filter(w => w.kierunek === 'przychod').reduce((s,w) => s + Math.abs(w.kwota), 0);

  // Kontrolki — bez Zakresu (Trans = jeden miesiąc), własny slot kategorii i display
  const { trigBar, drawer } = renderCtrlBar({ withZakres: false, hcKey: 'uiHiddenCatsTrans', lsKey: 'uiHiddenCatsTrans', dispKey: 'uiDisplayTrans', dispLsKey: 'uiDisplayTrans' });

  const transDisp = STATE.uiDisplayTrans;
  const gridClass = transDisp === 'list' ? 'tl-body-list'
    : transDisp === 'grid2' ? 'tl-body-grid2'
    : 'tl-body-grid3';

  // Helper: sekcja z nagłówkiem. Pokaż nawet jeśli pusta — puste = "—".
  // `.hero-anim` na nagłówku żeby wchodził do data-cascade (jak section headers w Home).
  const section = (title, items) => el('div', { style: 'padding:24px 24px 0' }, [
    el('div', { class: 'caps-i hero-anim', style: 'margin-bottom:14px' }, [title]),
    items.length
      ? el('div', { class: gridClass }, items.map(w => renderRow(w, undefined, transDisp)))
      : el('div', { class: 'hero-anim', style: 'padding:12px 0;color:var(--muted-3);font-size:var(--txt-meta-size);letter-spacing:var(--txt-meta-lsp);text-transform:uppercase;font-weight:var(--txt-meta-weight)' }, ['—']),
  ]);

  const addTile = el('div', {
    class: 'trans-add-tile',
    onclick: () => openAddModal('transakcja'),
    title: 'Dodaj nową transakcję',
  }, [
    el('span', { class: 'trans-add-plus' }, ['+']),
    el('span', { class: 'trans-add-lbl' }, ['Dodaj transakcję']),
  ]);

  return el('div', {}, [
    el('div', { style: 'padding:36px 24px 14px' }, [el('div', { class: 'big-h' }, ['Transakcje'])]),
    el('div', { class: 'ctrl-host' }, [trigBar, drawer].filter(Boolean)),
    el('div', { style: 'padding:14px 24px 0' }, [addTile]),
    section('Transakcje', trans),
    section(`Nadchodzące · ${STATE.yr}`, nadch),
    section(`Stałe · ${ML_FULL[STATE.mi - 1]}`, stale),
    section('Przychody', przych),
    el('div', { style: 'padding:0 24px 0' }, [
      el('div', { class: 'pr-sum' }, [
        el('div', {}, [
          el('div', { class: 'l' }, ['Suma']),
          el('div', { class: 'l-sub' }, [sumIn2 > 0 ? `+ ${fmtH(sumIn2)} przych. · ${wpisy.length} poz.` : `${wpisy.length} pozycji`]),
        ]),
        el('div', { class: 'v num' }, [`− ${fmtAmt(sumOut2)}`]),
      ]),
    ]),
  ]);
}

function txRow(w, onClick) {
  const isIn = w.kierunek === 'przychod';
  const anom = w.anomalia === true;
  const heart = w.dzielony === true;
  const badges = [];
  if (anom) badges.push(el('span', { class: 'tag anom', title: 'Alert — duży jednorazowy wydatek' }, ['ALERT']));
  if (heart) badges.push(el('span', { class: 'tag heart', title: 'Wspólny wydatek — udział partnera' }, [w.kwota_partnera ? `♥ ${fmtH(w.kwota_partnera)}` : '♥']));
  // Typ badge dla Stałych/Nadchodzących
  if (w.typ === 'stale') badges.push(el('span', { class: 'tag stale-tag', title: 'Stały co miesiąc' }, ['STAŁY']));
  if (w.typ === 'nadchodzace') badges.push(el('span', { class: 'tag nadch-tag', title: 'Nadchodzący' }, ['NADCH']));
  const unpaidCls = w.kwota === 0 ? ' unpaid' : '';
  return el('div', { class: 'tx-row' + unpaidCls, onclick: typeof onClick === 'function' ? onClick : () => openLightbox(w) }, [
    el('div', { class: 'left' }, [
      el('div', { class: 'ic-cat', html: `<svg viewBox="0 0 24 24">${catIcon(w.kategoria)}</svg>` }),
      el('div', { class: 'info' }, [
        el('div', { class: 'name' }, [w.nazwa]),
        el('div', { class: 'meta' }, [w.kategoria]),
      ]),
    ]),
    el('div', { class: 'right' }, [
      badges.length ? el('div', { class: 'badges' }, badges) : null,
      el('div', { class: 'v num' }, [`${isIn ? '+' : '−'} ${fmtAmt(w.kwota)}`]),
    ]),
  ]);
}

function renderCharts() {
  if (getMonthWpisy().length === 0) return renderEmptyMonth();
  const cat = STATE.chartCat;
  const mode = STATE.uiDisplayCharts;

  // === Kontrolki: 2 dropdowny (Zakres, Kategoria) + display switch — zawsze te same ===
  const zakresLabels = { '1': 'rok', '2': '2 lata', 'all': 'całość' };
  const trig = (key, label, val) => el('div', {
    class: 'ctrl-trig' + (STATE.uiOpenDrawer === key ? ' on' : ''),
    onclick: () => { STATE.uiOpenDrawer = STATE.uiOpenDrawer === key ? null : key; render(); },
  }, [
    el('div', { class: 'l' }, [
      el('div', { class: 'lbl' }, [label]),
      el('div', { class: 'val' }, [val]),
    ]),
    el('span', { class: 'chev', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>' }),
  ]);
  const trigBar = el('div', { class: 'ctrl-bar' }, [
    trig('chartZakres', 'Zakres', zakresLabels[STATE.chartZakres] || STATE.chartZakres),
    trig('chartCat', 'Kategoria', STATE.chartCat),
    renderDispSwitch('uiDisplayCharts', 'uiDisplayCharts', DISP_OPTS_CHARTS),
  ]);
  const drawerWrap = (children) => el('div', {}, [
    el('div', { class: 'ctrl-bd', onclick: () => { STATE.uiOpenDrawer = null; render(); } }),
    el('div', { class: 'ctrl-dr' }, children),
  ]);
  const drawerHead = (title) => el('div', { class: 'ctrl-dr-h' }, [
    el('span', { class: 'lbl' }, [title]),
    el('div', { class: 'x', onclick: () => { STATE.uiOpenDrawer = null; render(); } }, ['×']),
  ]);
  let drawer = null;
  if (STATE.uiOpenDrawer === 'chartZakres') {
    const segBtn = (label, val) => el('button', {
      class: 'ctrl-seg' + (STATE.chartZakres === val ? ' on' : ''),
      onclick: () => { STATE.chartZakres = val; STATE.uiOpenDrawer = null; render(); },
    }, [label]);
    drawer = drawerWrap([
      drawerHead('Zakres czasowy'),
      el('div', { class: 'ctrl-seg-row' }, [
        segBtn('rok', '1'),
        segBtn('2 lata', '2'),
        segBtn('całość', 'all'),
      ]),
    ]);
  } else if (STATE.uiOpenDrawer === 'chartCat') {
    // Single-select: wybrana = pełna opacity, reszta przygaszona (.off)
    drawer = drawerWrap([
      drawerHead('Kategoria (klik = wybierz)'),
      el('div', { class: 'ctrl-cats' }, CATS.map(k => el('div', {
        class: 'ctrl-cat' + (STATE.chartCat === k ? '' : ' off'),
        onclick: () => { STATE.chartCat = k; STATE.uiOpenDrawer = null; render(); },
      }, [
        el('span', { class: 'ic', html: `<svg viewBox="0 0 24 24">${catIcon(k)}</svg>` }),
        el('span', { class: 'nm' }, [k]),
      ]))),
    ]);
  }

  // === Branch zawartości chartu po mode ===
  // Semantyka zakresu — kalendarzowa, nie rolling:
  //   '1'   = bieżący rok kalendarzowy (Jan–Gru STATE.yr)
  //   '2'   = ten rok + poprzedni (STATE.yr-1, STATE.yr)
  //   'all' = wszystkie lata od pierwszego wpisu do STATE.yr
  let yearsRange;
  if (STATE.chartZakres === 'all') {
    const bounds = getDataBounds();
    if (bounds) {
      const startYr = Math.floor((bounds.min - 1) / 12);
      yearsRange = [];
      for (let y = startYr; y <= STATE.yr; y++) yearsRange.push(y);
    } else {
      yearsRange = [STATE.yr];
    }
  } else if (STATE.chartZakres === '2') {
    yearsRange = [STATE.yr - 1, STATE.yr];
  } else {
    yearsRange = [STATE.yr];
  }
  const points = [];
  yearsRange.forEach(yr => {
    for (let mi = 1; mi <= 12; mi++) {
      points.push({ yr, mi, val: sumCat(cat, yr, mi) });
    }
  });

  let chartContent;
  if (mode === 'bars') {
    chartContent = renderDotsChart(points);
  } else {
    chartContent = renderBlobChart(points);
  }

  return el('div', { class: 'charts-page' }, [
    el('div', { style: 'padding:36px 24px 14px' }, [
      el('div', { class: 'big-h' }, ['Wykresy']),
    ]),
    el('div', { class: 'ctrl-host' }, [trigBar, drawer].filter(Boolean)),
    chartContent,
  ]);
}

// === BLOB: radial polar chart (12 miesięcy = 12 promieni, kwota = odległość od środka) ===
const ROMAN_M = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
function niceRingMax(v) {
  if (v <= 0) return 300;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / mag;
  let nice;
  if (norm <= 1.5) nice = 1.5;
  else if (norm <= 3) nice = 3;
  else if (norm <= 6) nice = 6;
  else nice = 10;
  return nice * mag;
}
function renderBlobChart(points) {
  const cx = 180, cy = 180, maxR = 140;
  const monthXY = (mi, r) => {
    const angle = (-90 + mi * 30) * Math.PI / 180;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  };
  // Overlay mode tylko gdy zakres > 12 mies (2 lata / całość)
  const overlayMode = points.length > 12;
  const maxVal = Math.max(...points.map(p => p.val), 100);
  const ringMax = niceRingMax(maxVal);
  const ringStep = ringMax / 3;
  const valToR = v => Math.min(maxR, (v / ringMax) * maxR);

  function blobPath(vals) {
    const pts = vals.map((v, i) => monthXY(i, valToR(v || 0)));
    const n = pts.length;
    const mids = pts.map((p, i) => {
      const next = pts[(i + 1) % n];
      return [(p[0] + next[0]) / 2, (p[1] + next[1]) / 2];
    });
    let path = `M${mids[n - 1][0].toFixed(2)},${mids[n - 1][1].toFixed(2)}`;
    for (let i = 0; i < n; i++) {
      path += ` Q${pts[i][0].toFixed(2)},${pts[i][1].toFixed(2)} ${mids[i][0].toFixed(2)},${mids[i][1].toFixed(2)}`;
    }
    return path + ' Z';
  }

  // Single mode: jeden vals[12], każdy miesiąc w zakresie na swojej pozycji
  // Overlay mode: vals[12] per year
  let curVals, otherYearsVals = [], curYrLabel;
  if (overlayMode) {
    const byYear = {};
    points.forEach(p => {
      if (!byYear[p.yr]) byYear[p.yr] = new Array(12).fill(0);
      byYear[p.yr][p.mi - 1] = p.val;
    });
    const yearsAsc = Object.keys(byYear).map(Number).sort((a, b) => a - b);
    const currentYr = byYear[STATE.yr] ? STATE.yr : yearsAsc[yearsAsc.length - 1];
    curVals = byYear[currentYr];
    otherYearsVals = yearsAsc.filter(y => y !== currentYr).sort((a, b) => b - a).map(y => byYear[y]);
    curYrLabel = `${yearsAsc[0]}–${yearsAsc[yearsAsc.length - 1]}`;
  } else {
    curVals = new Array(12).fill(0);
    points.forEach(p => { curVals[p.mi - 1] = p.val; });
    curYrLabel = STATE.yr;
  }

  const ringsHtml = [1, 2, 3].map((k, i) => {
    const r = (k / 3) * maxR;
    return `<circle class="chart-fade" style="--d:${i * 50}ms" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--muted-3)" stroke-width="0.75" stroke-dasharray="3,4" opacity="0.8"/>`;
  }).join('');

  const ringLabelStyle = `font-size:var(--txt-meta-size);font-weight:var(--txt-meta-weight);letter-spacing:var(--txt-meta-lsp);`;
  const ringLabelsHtml = [1, 2, 3].map((k, i) => {
    const r = (k / 3) * maxR;
    const y = cy - r + 3;
    return `<text class="chart-fade" x="${cx}" y="${y}" fill="var(--muted)" text-anchor="middle" font-family="Inter" style="${ringLabelStyle}paint-order:stroke;stroke:var(--bg);stroke-width:4px;--d:${150 + i * 40}ms">${fmtH(Math.round(ringStep * k))}</text>`;
  }).join('');

  const overlaysHtml = otherYearsVals.map((vals, idx) => {
    const op = Math.max(0.25, 0.7 - idx * 0.15);
    const dash = idx === 0 ? '4,3' : idx === 1 ? '2,2' : '1,2';
    return `<path class="chart-fade" style="--d:${280 + idx * 50}ms" d="${blobPath(vals)}" fill="none" stroke="var(--fg)" stroke-width="1.2" stroke-dasharray="${dash}" opacity="${op}"/>`;
  }).join('');

  const curPath = blobPath(curVals);

  // Labels OUTSIDE rings — X (left) i IV (right) wyrównane do krawędzi paska filtrów (24px padding)
  const labelR = maxR + 18;
  const monthLabelStyle = `font-size:var(--txt-meta-size);font-weight:var(--txt-meta-weight);letter-spacing:var(--txt-meta-lsp);`;
  const monthLabelsHtml = ROMAN_M.map((rom, i) => {
    const [x, y] = monthXY(i, labelR);
    const isCurrent = !overlayMode && (i + 1) === STATE.mi;
    const fill = isCurrent ? 'var(--fg)' : 'var(--muted)';
    return `<text class="chart-fade" x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" fill="${fill}" text-anchor="middle" font-family="Inter" style="${monthLabelStyle}--d:${420 + i * 35}ms">${rom}</text>`;
  }).join('');

  const total = points.reduce((s, p) => s + p.val, 0);
  const avg = points.length > 0 ? total / points.length : 0;

  return el('div', { class: 'clock-wrap', html: `
    <svg class="clock-svg" width="100%" viewBox="0 0 360 360">
      <defs>
        <radialGradient id="blobGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#FFE600" stop-opacity="0.15"/>
          <stop offset="60%" stop-color="#FFE600" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#FFE600" stop-opacity="0.95"/>
        </radialGradient>
      </defs>
      ${ringsHtml}
      ${ringLabelsHtml}
      ${overlaysHtml}
      <path class="chart-area" d="${curPath}" fill="url(#blobGrad)" stroke="none"/>
      ${monthLabelsHtml}
    </svg>
    <div class="clock-footer chart-fade" style="--d:900ms">
      <div class="clock-center-lbl">${curYrLabel} · suma</div>
      <div class="clock-center-v">${fmtH(Math.round(total))}</div>
      <div class="clock-center-sub">średnio ${fmtH(Math.round(avg))} zł</div>
    </div>
  ` });
}

// === DOTS 2-rzędowe: I-VI górny rząd, VII-XII dolny ===
function renderDotsChart(points) {
  const overlayMode = points.length > 12;
  const byYear = {};
  points.forEach(p => {
    if (!byYear[p.yr]) byYear[p.yr] = new Array(12).fill(null);
    byYear[p.yr][p.mi - 1] = p.val;
  });
  const yearsAsc = Object.keys(byYear).map(Number).sort((a, b) => a - b);
  const currentYr = byYear[STATE.yr] ? STATE.yr : yearsAsc[yearsAsc.length - 1];

  const maxVal = Math.max(...points.map(p => p.val), 100);
  const niceMax = niceRingMax(maxVal);

  const w = 340, h = 130, padL = 50, padR = 10, padT = 20, padB = 30;
  const colW = (w - padL - padR) / 5;
  const yOf = v => padT + (h - padT - padB) * (1 - v / niceMax);

  const metaStyle = `font-size:var(--txt-meta-size);font-weight:var(--txt-meta-weight);letter-spacing:var(--txt-meta-lsp);`;

  function rowSvg(monthStart, baseDelay) {
    const range = [0, 1, 2, 3, 4, 5].map(i => monthStart + i);
    const xOf = mi => padL + (mi - monthStart) * colW;

    const yLines = [0, niceMax / 2, niceMax].map((v, i) => {
      const y = yOf(v);
      return `<line class="chart-fade" style="--d:${baseDelay + i * 35}ms" x1="${padL}" y1="${y}" x2="${w - padR}" y2="${y}" stroke="var(--surface-3)" stroke-width="1"/>`;
    }).join('');
    const yLabels = [0, niceMax / 2, niceMax].map((v, i) => {
      const y = yOf(v);
      return `<text class="chart-fade" x="${padL - 5}" y="${y + 3}" fill="var(--muted-3)" text-anchor="end" font-family="Inter" style="${metaStyle}--d:${baseDelay + 120 + i * 35}ms">${fmtH(Math.round(v))}</text>`;
    }).join('');

    const xLabels = range.map((i, idx) => {
      const x = xOf(i);
      const isCurrent = !overlayMode && (i + 1) === STATE.mi;
      const fill = isCurrent ? 'var(--fg)' : 'var(--muted)';
      return `<text class="chart-fade" x="${x}" y="${h - 5}" fill="${fill}" text-anchor="middle" font-family="Inter" style="${metaStyle}--d:${baseDelay + 540 + idx * 30}ms">${ROMAN_M[i]}</text>`;
    }).join('');

    const yearsDesc = yearsAsc.slice().sort((a, b) => b - a);
    const yearLayers = yearsDesc.map((y, ageIdx) => {
      const isCur = y === currentYr;
      const vals = byYear[y];
      const ptsInRange = range.map(i => ({ i, v: vals[i] })).filter(d => d.v !== null);
      if (ptsInRange.length === 0) return '';

      if (isCur) {
        const linePath = ptsInRange.map(d => `${xOf(d.i)},${yOf(d.v)}`).join(' ');
        const dots = ptsInRange.map((d, di) => {
          const isCurMonth = !overlayMode && (d.i + 1) === STATE.mi;
          const fill = isCurMonth ? '#FFE600' : 'var(--fg)';
          const r = isCurMonth ? 6 : 5;
          return `<circle class="chart-pop" style="--d:${baseDelay + 360 + di * 50}ms" cx="${xOf(d.i)}" cy="${yOf(d.v)}" r="${r}" fill="${fill}" stroke="${fill}" stroke-width="1.5"/>`;
        }).join('');
        return `<polyline class="chart-line-draw" style="--d:${baseDelay + 260}ms" points="${linePath}" fill="none" stroke="var(--fg)" stroke-width="1.5" opacity="0.5"/>${dots}`;
      } else {
        const dashList = ['3,2', '2,2', '1,1.5'];
        const dash = dashList[Math.min(ageIdx - 1, dashList.length - 1)];
        return ptsInRange.map((d, di) =>
          `<circle class="chart-fade" style="--d:${baseDelay + 280 + di * 30}ms" cx="${xOf(d.i)}" cy="${yOf(d.v)}" r="4" fill="none" stroke="var(--muted-3)" stroke-width="1" stroke-dasharray="${dash}"/>`
        ).join('');
      }
    }).join('');

    return `<svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" font-family="Inter" style="margin-bottom:14px;display:block">
      ${yLines}${yLabels}${yearLayers}${xLabels}
    </svg>`;
  }

  const total = points.reduce((s, p) => s + p.val, 0);
  const avg = points.length > 0 ? total / points.length : 0;
  const curYrLabel = overlayMode ? `${yearsAsc[0]}–${yearsAsc[yearsAsc.length - 1]}` : currentYr;

  return el('div', { class: 'dots-page', html: `
    <div style="padding:24px 24px 0">
      ${rowSvg(0, 0)}
      ${rowSvg(6, 380)}
    </div>
    <div class="clock-footer chart-fade" style="padding:16px 24px 8px;--d:1200ms">
      <div class="clock-center-lbl">${curYrLabel} · suma</div>
      <div class="clock-center-v">${fmtH(Math.round(total))}</div>
      <div class="clock-center-sub">średnio ${fmtH(Math.round(avg))} zł</div>
    </div>
  ` });
}

// Timeline: read-only podgląd z opcją usunięcia z alertów (zamiast pełnego edit lightbox)
async function openTimelineDetail(e) {
  const isAlert = e.kind === 'alert';
  const paid = e.kind === 'nadchodzace' && e.kwota > 0;
  const amt = paid ? e.kwota : (e.szacunek != null ? e.szacunek : Math.abs(e.kwota));
  const kindLabel = e.kind === 'nadchodzace' ? (paid ? 'Nadchodzący · zapłacony' : 'Nadchodzący') : 'Alert (anomalia)';
  const message = `${kindLabel}\nKategoria: ${e.kategoria}\nKwota: ${fmtH(amt)} PLN\nMiesiąc: ${ML_FULL[e.miesiac - 1]} ${e.rok}`;
  const buttons = [];
  if (isAlert) buttons.push({ label: 'Usuń z alertów ★', value: 'unanom', style: 'danger' });
  buttons.push({ label: 'Zamknij', value: null, style: 'cancel' });
  const action = await dialog({ title: e.nazwa, message, buttons });
  if (action === 'unanom') {
    updateWpis(e.id, { anomalia: false });
    render();
    toast('Usunięto z alertów');
  }
}

// Shared row renderer — branchuje po przekazanym `mode` (list / grid2 / grid3)
function renderRow(w, onClick, mode) {
  const click = onClick || (() => openLightbox(w));
  const unpaid = w.kwota === 0; // niezapłacone stałe → żółty akcent
  if (mode === 'list') {
    return txRow(w, click);
  }
  if (mode === 'grid2') {
    return el('div', { class: 'tile-mid' + (unpaid ? ' unpaid' : ''), onclick: click }, [
      el('div', { class: 'tile-mid-nm' }, [w.nazwa]),
      el('div', { class: 'tile-mid-cat' }, [w.kategoria]),
      el('div', { class: 'tile-mid-v' }, [fmtH(Math.abs(w.kwota))]),
    ]);
  }
  // grid3 — kompakt (default); unpaid=żółty, paid=zielony
  return el('div', { class: 'mini-tile ' + (unpaid ? 'unpaid' : 'paid'), style: 'cursor:pointer', onclick: click }, [
    el('div', { class: 'n' }, [w.nazwa]),
    el('div', { class: 'a' }, [fmtH(Math.abs(w.kwota))]),
  ]);
}

// Shared controls bar: kategorie dropdown + display switch (+ opcjonalnie zakres dla Historii)

// Default opts dla display switch (Home/Trans/Hist): list / grid2 / grid3
const DISP_OPTS_DEFAULT = [
  { val: 'list',  svg: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>' },
  { val: 'grid2', svg: '<rect x="3" y="3" width="7" height="18"/><rect x="14" y="3" width="7" height="18"/>' },
  { val: 'grid3', svg: '<rect x="3" y="3" width="5" height="18"/><rect x="9.5" y="3" width="5" height="18"/><rect x="16" y="3" width="5" height="18"/>' },
];

// Plan-specific opts: list / bar (pasek-centryczny) / donut (kółko)
const DISP_OPTS_PLAN = [
  { val: 'list',  svg: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>' },
  { val: 'bar',   svg: '<rect x="3" y="9" width="18" height="6" rx="0.5"/><rect x="3" y="9" width="11" height="6" rx="0.5" fill="currentColor" stroke="none"/>' },
  { val: 'donut', svg: '<circle cx="12" cy="12" r="7.5"/><path d="M12,4.5 A7.5,7.5 0 0,1 19,15" fill="none" stroke-linecap="round" stroke-width="3"/>' },
];

// Charts-specific opts: line (blob) / bars (dots)
const DISP_OPTS_CHARTS = [
  { val: 'line',    svg: '<path d="M12 4 Q17 4 18 8 Q20 12 18 16 Q15 20 11 19 Q6 18 5 14 Q4 9 8 6 Q10 4 12 4 Z" stroke-linejoin="round"/>' },
  { val: 'bars',    svg: '<rect x="4" y="13" width="3" height="7"/><rect x="9" y="9" width="3" height="11"/><rect x="14" y="4" width="3" height="16"/><rect x="19" y="11" width="3" height="9" fill="none" stroke-width="0"/><rect x="19" y="11" width="2" height="9"/>' },
];

// Standalone display switch — używany w Home/Trans/Hist/Plan, każdy ma własny slot stanu i opcjonalnie inne opty
function renderDispSwitch(stateKey, lsKey, opts = DISP_OPTS_DEFAULT) {
  const current = STATE[stateKey];
  const dispBtn = (val, svgInner) => el('button', {
    class: 'ctrl-disp-inline' + (current === val ? ' on' : ''),
    onclick: () => {
      STATE[stateKey] = val;
      try { localStorage.setItem(lsKey + viewportSuffix(), val); } catch (_) {}
      render();
    },
    html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${svgInner}</svg>`,
  });
  return el('div', { class: 'ctrl-disp-bar' }, opts.map(o => dispBtn(o.val, o.svg)));
}

// Używane w renderTimeline i renderTrans — kontrolki z dropdownami
// hcKey/lsKey: który slot STATE i którego klucza localStorage używać dla ukrytych kategorii (per view!)
function renderCtrlBar({ withZakres = false, hcKey = 'uiHiddenCatsHist', lsKey = 'uiHiddenCatsHist', dispKey = 'uiDisplayHist', dispLsKey = 'uiDisplayHist', dispOpts = DISP_OPTS_DEFAULT } = {}) {
  const zakresLabels = { '1': '1 rok', '2': '2 lata', '3': '3 lata', 'all': 'całość' };
  const hcState = STATE[hcKey] || {};
  const activeCats = CATS.filter(k => !hcState[k]).length;
  const allVisible = activeCats === CATS.length;
  const saveHc = () => { try { localStorage.setItem(lsKey, JSON.stringify(STATE[hcKey])); } catch (_) {} };

  const trig = (key, label, val) => el('div', {
    class: 'ctrl-trig' + (STATE.uiOpenDrawer === key ? ' on' : ''),
    onclick: () => { STATE.uiOpenDrawer = STATE.uiOpenDrawer === key ? null : key; render(); },
  }, [
    el('div', { class: 'l' }, [
      el('div', { class: 'lbl' }, [label]),
      el('div', { class: 'val' }, [val]),
    ]),
    el('span', { class: 'chev', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>' }),
  ]);

  const trigBarChildren = [];
  if (withZakres) trigBarChildren.push(trig('zakres', 'Zakres', zakresLabels[STATE.tlZakres] || STATE.tlZakres));
  trigBarChildren.push(trig('kategorie', 'Kategorie', `${activeCats} z ${CATS.length}`));
  trigBarChildren.push(renderDispSwitch(dispKey, dispLsKey, dispOpts));
  const trigBar = el('div', { class: 'ctrl-bar' }, trigBarChildren);

  const drawerWrap = (children) => el('div', {}, [
    el('div', { class: 'ctrl-bd', onclick: () => { STATE.uiOpenDrawer = null; render(); } }),
    el('div', { class: 'ctrl-dr' }, children),
  ]);
  const drawerHead = (title) => el('div', { class: 'ctrl-dr-h' }, [
    el('span', { class: 'lbl' }, [title]),
    el('div', { class: 'x', onclick: () => { STATE.uiOpenDrawer = null; render(); } }, ['×']),
  ]);

  let drawer = null;
  if (STATE.uiOpenDrawer === 'zakres' && withZakres) {
    const segBtn = (label, val) => el('button', {
      class: 'ctrl-seg' + (STATE.tlZakres === val ? ' on' : ''),
      onclick: () => {
        STATE.tlZakres = val;
        STATE.uiOpenDrawer = null;
        try { localStorage.setItem('tlZakres', val); } catch (_) {}
        render();
      },
    }, [label]);
    drawer = drawerWrap([
      drawerHead('Zakres czasowy'),
      el('div', { class: 'ctrl-seg-row' }, [
        segBtn('1 rok', '1'),
        segBtn('2 lata', '2'),
        segBtn('3 lata', '3'),
        segBtn('Całość', 'all'),
      ]),
    ]);
  } else if (STATE.uiOpenDrawer === 'kategorie') {
    // "Wszystkie" smart-toggle: jeśli wszystkie widoczne → klik wyłącza wszystkie; w innym wypadku → przywraca wszystkie
    const wszystkieBtn = el('div', {
      class: 'ctrl-cat all' + (allVisible ? '' : ' off'),
      onclick: () => {
        if (allVisible) {
          STATE[hcKey] = {};
          CATS.forEach(k => { STATE[hcKey][k] = true; });
        } else {
          STATE[hcKey] = {};
        }
        saveHc();
        render();
      },
    }, [
      el('span', { class: 'ic', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' }),
      el('span', { class: 'nm' }, ['Wszystkie']),
    ]);
    const cats = [wszystkieBtn];
    CATS.forEach(k => {
      const off = !!STATE[hcKey][k];
      cats.push(el('div', {
        class: 'ctrl-cat' + (off ? ' off' : ''),
        onclick: () => {
          STATE[hcKey][k] = !STATE[hcKey][k];
          saveHc();
          render();
        },
      }, [
        el('span', { class: 'ic', html: `<svg viewBox="0 0 24 24">${catIcon(k)}</svg>` }),
        el('span', { class: 'nm' }, [k]),
      ]));
    });
    drawer = drawerWrap([
      drawerHead('Kategorie (klik = włącz / wyłącz)'),
      el('div', { class: 'ctrl-cats' }, cats),
    ]);
  }
  return { trigBar, drawer };
}

// Timeline: pionowa lista miesięcy z eventami (jak Home), default scroll na bieżący miesiąc
function renderTimeline() {
  // Zakres miesięcy: od (current + 1) na górze do (yrsBack lat wstecz) na dole
  const yrsBack = STATE.tlZakres === 'all' ? 99 : Number(STATE.tlZakres);
  const bounds = getYearBounds();
  const minYr = bounds ? bounds.min : STATE.yr - yrsBack + 1;
  const startYr = Math.max(minYr, STATE.yr - yrsBack + 1);
  // Najpierw budujemy chronologicznie (najstarszy → najnowszy + 1), potem reverse
  const months = [];
  for (let yr = startYr; yr <= STATE.yr; yr++) {
    const miFrom = 1;
    const miTo = (yr === STATE.yr) ? STATE.mi : 12;
    for (let mi = miFrom; mi <= miTo; mi++) {
      months.push({ yr, mi });
    }
  }
  // Dorzuć current + 1 na samą górę (po reverse)
  const nextMi = STATE.mi === 12 ? 1 : STATE.mi + 1;
  const nextYr = STATE.mi === 12 ? STATE.yr + 1 : STATE.yr;
  months.push({ yr: nextYr, mi: nextMi });
  months.reverse(); // current+1 na top, najstarsze na dole

  // Eventy per miesiąc (Naduch + Alerty z tego miesiąca, z filtrem kategorii)
  const eventsByMonth = months.map(({ yr, mi }) => {
    const naduch = getNadchodzaceWpisy(yr).filter(w => w.miesiac === mi && !STATE.uiHiddenCatsHist[w.kategoria]);
    const alerts = getAllWpisy().filter(w => w.rok === yr && w.miesiac === mi && w.typ === 'transakcja' && w.anomalia && !STATE.uiHiddenCatsHist[w.kategoria]);
    const evs = [
      ...naduch.map(w => ({ ...w, kind: 'nadchodzace', szacunek: getSzacunek(w) })),
      ...alerts.map(w => ({ ...w, kind: 'alert' })),
    ];
    evs.sort((a, b) => (a.kind === b.kind ? Math.abs(b.kwota) - Math.abs(a.kwota) : a.kind === 'nadchodzace' ? -1 : 1));
    return { yr, mi, evs };
  });

  // Renderer wpisu — kafel (grid) lub pełny wiersz (list jak w Transakcjach), zależnie od uiDisplayHist
  const histDisp = STATE.uiDisplayHist;
  const renderItem = (e) => {
    const isNaduch = e.kind === 'nadchodzace';
    const paid = isNaduch && e.kwota > 0;
    const amt = paid ? e.kwota : Math.abs(e.szacunek || e.kwota);
    if (histDisp === 'list') {
      // Reuse txRow — wygląda dokładnie jak Transakcje
      const wpisForRow = (isNaduch && e.kwota === 0)
        ? { ...e, kwota: Math.abs(e.szacunek || 0) }
        : e;
      return txRow(wpisForRow, () => openTimelineDetail(e));
    }
    if (histDisp === 'grid2') {
      // 2 kol — nazwa + kategoria stacked, kwota w prawym dolnym
      return el('div', {
        class: 'tile-mid',
        onclick: () => openTimelineDetail(e),
      }, [
        el('div', { class: 'tile-mid-nm' }, [e.nazwa]),
        el('div', { class: 'tile-mid-cat' }, [e.kategoria]),
        el('div', { class: 'tile-mid-v' }, [fmtH(amt)]),
      ]);
    }
    // grid3 — kompaktowo, tylko nazwa + kwota
    return el('div', {
      class: 'mini-tile paid',
      style: 'cursor:pointer',
      onclick: () => openTimelineDetail(e),
    }, [
      el('div', { class: 'n' }, [e.nazwa]),
      el('div', { class: 'a' }, [fmtH(amt)]),
    ]);
  };

  // Sekcje: każdy miesiąc to nagłówek + lista/grid wpisów (lub "brak")
  const gridClass = histDisp === 'list' ? 'tl-body-list'
    : histDisp === 'grid2' ? 'tl-body-grid2'
    : 'tl-body-grid3';
  const sections = eventsByMonth.map(({ yr, mi, evs }) => {
    const isCurr = yr === STATE.yr && mi === STATE.mi;
    const headerAttrs = isCurr ? { class: 'tl-section curr', 'data-current-month': '1' } : { class: 'tl-section' };
    return el('div', headerAttrs, [
      el('div', { class: 'tl-section-h' }, [
        el('span', { class: 'tl-mc-name' }, [ML_FULL[mi - 1]]),
        el('span', { class: 'tl-mc-yr' }, [String(yr)]),
        el('span', { class: 'tl-mc-count' }, [evs.length ? String(evs.length) : '—']),
      ]),
      evs.length ? el('div', { class: gridClass }, evs.map(renderItem)) : null,
    ].filter(Boolean));
  });

  // Kontrolki — z helpera (z Zakresem dla Historii)
  const { trigBar, drawer } = renderCtrlBar({ withZakres: true });

  const root = el('div', { class: 'tl-page' }, [
    el('div', { style: 'padding:36px 24px 14px' }, [
      el('div', { class: 'big-h' }, ['Historia']),
    ]),
    el('div', { class: 'ctrl-host' }, [
      trigBar,
      drawer,
    ].filter(Boolean)),
    el('div', { class: 'tl-list', style: 'padding:14px 24px 0' }, sections),
  ]);
  // Ukryj stary host fixed-legend — legenda teraz inline w drawerze
  const host = document.getElementById('tl-legend-host');
  if (host) { host.innerHTML = ''; host.style.display = 'none'; }
  return root;
}


