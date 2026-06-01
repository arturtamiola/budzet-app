// ============== PLAN EDIT (lightbox) ==============
let planEditState = null;

function openPlanEdit() {
  const values = {};
  CATS.forEach(k => values[k] = getPlan(k));
  const target = Object.values(values).reduce((s, v) => s + v, 0);
  planEditState = { yr: STATE.yr, mi: STATE.mi, values, target };
  $('#plan-edit-title').textContent = 'Plan';
  renderPlanEditBody();
  showSheet('plan-edit-sheet');
}

function renderPlanEditBody() {
  const body = $('#plan-edit-body');
  const foot = $('#plan-edit-foot');
  body.innerHTML = '';
  foot.innerHTML = '';
  const STEP = 50;

  const adjust = (kat, delta) => {
    planEditState.values[kat] = Math.max(0, (planEditState.values[kat] || 0) + delta);
    renderPlanEditBody();
  };

  const tile = (kat) => el('div', { class: 'plan-tile' }, [
    el('div', { class: 'plan-tile-n' }, [kat.split(' ')[0]]),
    el('div', { class: 'plan-tile-amt' }, [
      el('button', { class: 'plan-tile-btn', onclick: () => adjust(kat, -STEP) }, ['−']),
      el('input', {
        type: 'number', inputmode: 'numeric',
        value: planEditState.values[kat] || 0,
        oninput: (e) => { planEditState.values[kat] = Number(e.target.value) || 0; updateSumDisplay(); },
        class: 'plan-tile-input',
      }),
      el('button', { class: 'plan-tile-btn', onclick: () => adjust(kat, STEP) }, ['+']),
    ]),
  ]);

  body.appendChild(el('div', { class: 'plan-grid' }, CATS.map(tile)));

  // Suma + target
  const sumDiv = el('div', { class: 'plan-sum' }, [
    el('div', { style: 'flex:1' }, [
      el('div', { class: 'caps-i', style: 'margin-bottom:4px' }, ['Suma kategorii']),
      el('div', { id: 'plan-sum-actual', class: 'anton num', style: 'font-size:var(--txt-amt-lg);letter-spacing:var(--txt-amt-lg-lsp);line-height:1' }, [fmt(getPlanEditSum())]),
    ]),
    el('div', { style: 'flex:1;text-align:right' }, [
      el('div', { class: 'caps-i', style: 'margin-bottom:4px' }, ['Cel (budżet)']),
      el('input', {
        type: 'number', inputmode: 'numeric', id: 'plan-target-input',
        value: planEditState.target,
        oninput: (e) => { planEditState.target = Number(e.target.value) || 0; updateSumDisplay(); },
        class: 'plan-target-input',
      }),
    ]),
  ]);
  body.appendChild(sumDiv);
  body.appendChild(el('div', { id: 'plan-mismatch', style: 'margin-top:10px;text-align:center;font-size:var(--txt-meta-size);font-weight:var(--txt-meta-weight);letter-spacing:1px;text-transform:uppercase;color:var(--danger-2);display:none' }, ['']));

  // Foot — kwadratowe, styl spójny z DODAJ
  foot.appendChild(el('div', { style: 'display:flex;gap:8px' }, [
    el('button', {
      id: 'plan-save-one', class: 'plan-save',
      style: 'flex:1;background:transparent;border:2px solid var(--fg);color:var(--fg);cursor:pointer;padding:18px;font-family:Anton;font-size:var(--txt-amt-lg);letter-spacing:var(--txt-amt-lg-lsp)',
      onclick: () => savePlanEdit('this'),
    }, ['TEN MIESIĄC']),
    el('button', {
      id: 'plan-save-all', class: 'plan-save',
      style: 'flex:1;background:var(--accent);color:var(--accent-fg);border:none;padding:18px;font-family:Anton;font-size:var(--txt-amt-lg);letter-spacing:var(--txt-amt-lg-lsp);cursor:pointer',
      onclick: () => savePlanEdit('all'),
    }, ['NA STAŁE']),
  ]));

  updateSumDisplay();
}

function getPlanEditSum() {
  return Object.values(planEditState.values).reduce((s, v) => s + (v || 0), 0);
}

function updateSumDisplay() {
  const actual = getPlanEditSum();
  const target = planEditState.target;
  const sumEl = $('#plan-sum-actual');
  const msg = $('#plan-mismatch');
  const oneBtn = $('#plan-save-one');
  const allBtn = $('#plan-save-all');
  if (!sumEl) return;
  sumEl.textContent = fmt(actual);
  const diff = actual - target;
  if (Math.abs(diff) > 0.01) {
    sumEl.style.color = '#ef4444';
    msg.style.display = 'block';
    msg.textContent = diff > 0 ? `Przekraczasz cel o ${fmt(diff)}` : `Brakuje ${fmt(-diff)} do celu`;
    [oneBtn, allBtn].forEach(b => { if (b) { b.disabled = true; b.style.opacity = '0.4'; b.style.cursor = 'not-allowed'; } });
  } else {
    sumEl.style.color = '#10b981';
    msg.style.display = 'none';
    [oneBtn, allBtn].forEach(b => { if (b) { b.disabled = false; b.style.opacity = '1'; b.style.cursor = 'pointer'; } });
  }
}

function savePlanEdit(scope) {
  if (!planEditState) return;
  if (!STATE.localEdits.planOverrides) STATE.localEdits.planOverrides = {};
  const { yr, mi, values } = planEditState;
  if (scope === 'this') {
    CATS.forEach(k => { STATE.localEdits.planOverrides[`${yr}_${k}_${mi}`] = values[k]; });
    toast(`Zaktualizowano plan na ${ML_FULL[mi - 1]} ${yr}`);
  } else {
    for (let m = 1; m <= 12; m++) {
      CATS.forEach(k => { STATE.localEdits.planOverrides[`${yr}_${k}_${m}`] = values[k]; });
    }
    toast(`Zaktualizowano plan na stałe (${yr})`);
  }
  saveLocal();
  closeSheet();
  render();
}

// ============== SHEETS ==============
function showSheet(id) {
  const bg = $('#modal-bg'), s = $('#' + id);
  bg.classList.remove('hiding');
  s.classList.remove('hiding');
  bg.classList.add('show');
  s.classList.add('show');
}
function closeSheet() {
  const bg = $('#modal-bg');
  const sheets = $$('.sheet.show');
  if (!bg.classList.contains('show') && sheets.length === 0) return;
  bg.classList.add('hiding');
  sheets.forEach(s => s.classList.add('hiding'));
  setTimeout(() => {
    bg.classList.remove('show', 'hiding');
    sheets.forEach(s => s.classList.remove('show', 'hiding'));
  }, 420);
  if (typeof Keypad !== 'undefined' && Keypad.active) Keypad.close();
}

// ============== LIGHTBOX EDYCJI (Task 8) ==============
let editState = null;
function openLightbox(wpis) {
  // Pełna kopia żeby edycja w modal nie modyfikowała natychmiast
  editState = {
    orig: wpis,
    nazwa: wpis.nazwa,
    kwota: wpis.kwota,
    szacunek: getSzacunek(wpis),
    kategoria: wpis.kategoria,
    kierunek: wpis.kierunek,
    dzielony: wpis.dzielony,
    kwota_partnera: wpis.kwota_partnera || 0,
    anomalia: wpis.anomalia,
    opis: wpis.opis || '',
  };
  renderEditBody();
  showSheet('edit-sheet');
}

function renderEditBody() {
  const body = $('#edit-body');
  const foot = $('#edit-foot');
  body.innerHTML = '';
  foot.innerHTML = '';
  const w = editState.orig;
  const hasTemplate = w.template_id != null;

  // Nazwa
  body.appendChild(el('div', { style: 'margin-bottom:12px' }, [
    el('div', { class: 'caps-i', style: 'margin-bottom:6px' }, ['Nazwa']),
    el('input', { type: 'text', value: editState.nazwa, class: 'fld-input txt', oninput: (e) => editState.nazwa = e.target.value }),
  ]));

  // Kwota główna ("Zapłacona" dla wpisów z templatem, "Kwota" dla transakcji)
  body.appendChild(el('div', { style: 'margin-bottom:14px' }, [
    el('div', { class: 'caps-i', style: 'margin-bottom:6px' }, [hasTemplate ? 'Zapłacona' : 'Kwota']),
    el('div', { style: 'display:flex;align-items:baseline;gap:8px;border-bottom:2px solid #000;padding-bottom:8px' }, [
      el('input', { type: 'number', placeholder: '0', value: editState.kwota || '', inputmode: 'decimal', style: 'flex:1;border:none;outline:none;font-family:Anton;font-size:42px;line-height:1;letter-spacing:-1.5px;background:transparent;color:var(--fg);min-width:0;padding:0', oninput: (e) => editState.kwota = Number(e.target.value) || 0 }),
      el('span', { class: 'caps-i' }, ['PLN']),
    ]),
  ]));

  // Suma stała (template's szacunek) — tylko dla wpisów z templatem
  if (hasTemplate) {
    body.appendChild(el('div', { style: 'margin-bottom:18px' }, [
      el('div', { class: 'caps-i', style: 'margin-bottom:6px' }, ['Suma stała (szacunek)']),
      el('div', { style: 'display:flex;align-items:baseline;gap:8px;border-bottom:1px solid #ddd;padding-bottom:6px' }, [
        el('input', { type: 'number', value: editState.szacunek, inputmode: 'decimal', style: 'flex:1;border:none;outline:none;font-family:Anton;font-size:var(--txt-amt-lg);line-height:1;letter-spacing:var(--txt-amt-lg-lsp);background:transparent;color:var(--muted-2);min-width:0;padding:0', oninput: (e) => editState.szacunek = Number(e.target.value) || 0 }),
        el('span', { class: 'caps-i', style: 'color:var(--muted)' }, ['PLN']),
      ]),
    ]));
  }

  // Kierunek (dla transakcji edytowalne; dla stale/nadch fix wg template)
  if (w.typ === 'transakcja') {
    body.appendChild(el('div', { style: 'margin-bottom:12px' }, [
      el('div', { class: 'caps-i', style: 'margin-bottom:8px' }, ['Kierunek']),
      el('div', { style: 'display:flex;gap:6px' }, [
        el('span', { class: 'chip ' + (editState.kierunek === 'wydatek' ? 'active' : ''), onclick: () => { editState.kierunek = 'wydatek'; renderEditBody(); } }, ['Wydatek']),
        el('span', { class: 'chip ' + (editState.kierunek === 'przychod' ? 'active' : ''), onclick: () => { editState.kierunek = 'przychod'; renderEditBody(); } }, ['Przychód']),
      ]),
    ]));
  }

  // Kategoria
  body.appendChild(el('div', { style: 'margin-bottom:12px' }, [
    el('div', { class: 'caps-i', style: 'margin-bottom:10px' }, ['Kategoria']),
    el('div', { class: 'ichips-wrap' }, CATS.map(k =>
      ichip(k.split(' ')[0], catIcon(k), editState.kategoria === k, () => { editState.kategoria = k; renderEditBody(); }, editState.kategoria === k ? 'ylw' : '')
    )),
  ]));

  // Toggle dzielony + udział partnera + anomalia — tylko dla nie-Stałych (Stałe nie mogą być wspólne/anomalia)
  if (w.typ !== 'stale') {
    body.appendChild(el('div', { style: 'padding:12px 0;border-top:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center;cursor:pointer', onclick: () => { editState.dzielony = !editState.dzielony; renderEditBody(); } }, [
      el('div', { style: 'font-size:var(--txt-name-size);font-weight:600' }, ['Wspólny wydatek ♥']),
      el('span', { class: 'toggle ' + (editState.dzielony ? 'on' : '') }),
    ]));
    if (editState.dzielony) {
      body.appendChild(el('div', { style: 'padding:6px 0 12px 14px;border-left:3px solid #ef4444;margin-bottom:4px' }, [
        el('div', { class: 'caps-i', style: 'margin-bottom:6px;color:var(--danger-2)' }, ['Udział partnera (PLN)']),
        el('input', {
          type: 'number', inputmode: 'decimal', placeholder: '0',
          value: editState.kwota_partnera || '',
          class: 'fld-input amt',
          oninput: (e) => editState.kwota_partnera = Number(e.target.value) || 0,
        }),
      ]));
    }
    body.appendChild(el('div', { style: 'padding:12px 0;border-top:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center;cursor:pointer', onclick: () => { editState.anomalia = !editState.anomalia; renderEditBody(); } }, [
      el('div', { style: 'font-size:var(--txt-name-size);font-weight:600' }, ['Warto zapamiętać ★']),
      el('span', { class: 'toggle ' + (editState.anomalia ? 'on' : '') }),
    ]));
  }

  // Promote do Nadchodzących (tylko dla alertów = transakcja z anomalia=true)
  if (w.typ === 'transakcja' && w.anomalia) {
    body.appendChild(el('div', { style: 'padding:14px 0;border-top:1px solid #f0f0f0' }, [
      el('button', { style: 'width:100%;padding:12px;background:var(--accent);border:none;font-family:Anton;font-size:var(--txt-amt-sm);letter-spacing:var(--txt-amt-sm-lsp);cursor:pointer', onclick: () => promoteAlertToNadchodzace(w) }, ['Dodaj jako Nadchodzący ↑']),
    ]));
  }

  // Foot: dla Stałych — dwa Usuń obok siebie nad ZAPISZ; dla reszty — Usuń nad ZAPISZ
  if (w.typ === 'stale' && w.template_id != null) {
    foot.appendChild(el('div', { style: 'display:flex;gap:8px' }, [
      el('button', {
        style: 'flex:1;padding:14px;background:var(--card);border:1px solid #ef4444;color:var(--danger-2);cursor:pointer;font-weight:var(--txt-name-weight);font-size:var(--txt-name-size);letter-spacing:0.3px',
        onclick: deleteFromLightbox,
      }, ['Usuń ten miesiąc']),
      el('button', {
        style: 'flex:1;padding:14px;background:var(--danger-2);border:none;color:#fff;cursor:pointer;font-weight:var(--txt-name-weight);font-size:var(--txt-name-size);letter-spacing:0.3px',
        onclick: deleteWholeTemplate,
      }, ['Usuń całkiem']),
    ]));
  } else {
    foot.appendChild(el('button', {
      style: 'width:100%;padding:14px;background:var(--card);border:1px solid #ef4444;color:var(--danger-2);cursor:pointer;font-weight:var(--txt-name-weight);font-size:var(--txt-name-size);letter-spacing:0.3px',
      onclick: deleteFromLightbox,
    }, ['Usuń']));
  }
  foot.appendChild(el('button', {
    style: 'width:100%;background:var(--accent);border:none;padding:18px;font-family:Anton;font-size:var(--txt-amt-lg);letter-spacing:var(--txt-amt-lg-lsp);cursor:pointer',
    onclick: saveEdit,
  }, ['ZAPISZ']));
}

async function saveEdit() {
  if (!editState) return;
  const w = editState.orig;
  const patch = {
    nazwa: editState.nazwa,
    kategoria: editState.kategoria,
    kierunek: editState.kierunek,
    dzielony: editState.dzielony,
    kwota_partnera: editState.kwota_partnera,
    anomalia: editState.anomalia,
    opis: editState.opis,
    kwota: editState.kwota,
  };

  const hasTemplate = w.template_id != null;
  const origSzacunek = getSzacunek(w);
  const szacunekChanged = hasTemplate && editState.szacunek !== origSzacunek;

  if (szacunekChanged) {
    const tpl = getTemplate(w.template_id);
    const choice = await dialog({
      title: 'Zmienić sumę stałą?',
      message: `"${tpl ? tpl.nazwa : w.nazwa}" — ${origSzacunek} → ${editState.szacunek}`,
      buttons: [
        { label: 'Tylko ten miesiąc', value: 'this', style: 'primary' },
        { label: 'Od teraz na stałe (zmienia template)', value: 'template', style: 'outline' },
        { label: 'Anuluj', value: null, style: 'cancel' },
      ],
    });
    if (!choice) return;
    if (choice === 'this') {
      patch.kwota_szacunek_override = editState.szacunek;
    } else {
      updateTemplate(w.template_id, { kwota_szacunek: editState.szacunek });
      // wyczyść stary override jeśli był (template wygrywa)
      if (w.kwota_szacunek_override != null) patch.kwota_szacunek_override = null;
    }
  }

  updateWpis(w.id, patch);
  closeSheet();
  render();
}

async function deleteWholeTemplate() {
  if (!editState) return;
  const w = editState.orig;
  const tplId = w.template_id;
  const tpl = getTemplate(tplId);
  const tplNazwa = tpl ? tpl.nazwa : w.nazwa;
  // Zbierz wszystkie wpisy z tym template_id (across wszystkich mc)
  const wpisy = getAllWpisy().filter(x => x.template_id === tplId);
  const ok = await confirmDialog(
    `Usunąć "${tplNazwa}" całkiem?`,
    `Skasuje template + ${wpisy.length} wpis${wpisy.length === 1 ? '' : 'y'} ze wszystkich miesięcy.`,
    'Usuń całkiem',
  );
  if (!ok) return;
  // 1. Usuń template z list (addedTemplates locally; deletedTemplates dla base)
  const addedTplIdx = (STATE.localEdits.addedTemplates || []).findIndex(t => t.id === tplId);
  if (addedTplIdx !== -1) {
    STATE.localEdits.addedTemplates.splice(addedTplIdx, 1);
  } else {
    if (!STATE.localEdits.deletedTemplates) STATE.localEdits.deletedTemplates = [];
    if (!STATE.localEdits.deletedTemplates.includes(tplId)) STATE.localEdits.deletedTemplates.push(tplId);
  }
  apiDeleteTemplate(tplId);
  // 2. Soft-delete all wpisy referencing this template
  wpisy.forEach(w => {
    const idx = STATE.localEdits.added.findIndex(x => x.id === w.id);
    if (idx !== -1) STATE.localEdits.added.splice(idx, 1);
    else if (!STATE.localEdits.deleted.includes(w.id)) STATE.localEdits.deleted.push(w.id);
    apiDeleteWpis(w.id);
  });
  saveLocal();
  closeSheet();
  render();
}

async function deleteFromLightbox() {
  if (!editState) return;
  const ok = await confirmDialog(`Usunąć "${editState.orig.nazwa}"?`, 'Tylko w tym miesiącu.', 'Usuń');
  if (!ok) return;
  deleteWpis(editState.orig.id);
  closeSheet();
  render();
}

function promoteAlertToNadchodzace(w) {
  const nazwa = prompt('Nazwa nadchodzącego wydatku:', w.nazwa);
  if (!nazwa) return;
  const kwota = Number(prompt('Kwota szacunku:', Math.abs(w.kwota))) || 0;
  if (kwota <= 0) return;
  const miesiac = Number(prompt('Miesiąc (1-12) w którym przypada:', w.miesiac)) || w.miesiac;

  // Dodaj template + instance do localEdits + API (Apps Script zrobi to samo w Fazie 3)
  const newTemplateId = Math.max(0, ...STATE.data.templates.map(t => t.id), ...Object.keys(STATE.localEdits.templates || {}).map(Number)) + 1;
  if (!STATE.localEdits.addedTemplates) STATE.localEdits.addedTemplates = [];
  const newTpl = {
    id: newTemplateId,
    nazwa, kategoria: w.kategoria, kierunek: 'wydatek',
    kwota_szacunek: kwota, freq: 'annual', miesiac, aktywny: true,
  };
  STATE.localEdits.addedTemplates.push(newTpl);
  apiAddTemplate(newTpl);
  // Instance dla najbliższego roku z miesiącem
  const now = new Date();
  let targetYr = now.getFullYear();
  if (miesiac < now.getMonth() + 1) targetYr++; // jeśli ten miesiąc minął, weź kolejny rok
  const newWpis = {
    id: nextWpisId(),
    typ: 'nadchodzace',
    kierunek: 'wydatek',
    rok: targetYr, miesiac,
    data: '',
    nazwa, kategoria: w.kategoria,
    kwota: 0, kwota_partnera: 0,
    dzielony: false, anomalia: false,
    template_id: newTemplateId,
    opis: '', usuniety: false,
  };
  STATE.localEdits.added.push(newWpis);
  apiAddWpis(newWpis);
  saveLocal();
  toast(`Dodano "${nazwa}" jako Nadchodzący ${targetYr}/${miesiac}`);
  closeSheet();
  render();
}

// ============== ADD MODAL (Task 9) ==============
let addState = null;

function openAddModal(tryb = 'transakcja', locked = false) {
  addState = {
    tryb, // 'transakcja' | 'stale' | 'nadchodzace'
    locked, // jeśli true → nie pokazuj chip'ów wyboru trybu/kierunku
    nazwa: '',
    kwota: 0,
    kategoria: 'Inne',
    kierunek: 'wydatek',
    miesiac: STATE.mi,
    miesiac_annual: STATE.mi,
    opis: '',
    dzielony: false,
    anomalia: false,
    kwota_partnera: 0,
  };
  renderAddBody();
  showSheet('add-sheet');
  // Auto-focus tylko na desktopie — na mobile to triggeruje systemową klawiaturę
  if (typeof Keypad === 'undefined' || !Keypad.isMobile) {
    setTimeout(() => $('#add-amount-input')?.focus(), 200);
  }
}

function renderAddBody() {
  const body = $('#add-body');
  body.innerHTML = '';

  // Bottom-nav "+" otwiera niezalockowany → wymuś tryb=transakcja (nie ma chip'ów wyboru)
  if (!addState.locked) addState.tryb = 'transakcja';
  // Wymuś kierunek wydatek dla stale/nadchodzace (tylko transakcja może być przychodem)
  if (addState.tryb !== 'transakcja') addState.kierunek = 'wydatek';

  // Tytuł sheeta: jeden napis zamiast "Dodaj" + osobny banner. Dla transakcji obok tytułu są chipy kierunku.
  const titleLabel = addState.tryb === 'transakcja' ? 'Dodaj transakcję' : addState.tryb === 'stale' ? 'Dodaj stały' : 'Dodaj nadchodzący';
  $('#add-title').textContent = titleLabel;
  const kdir = $('#add-kdir');
  kdir.innerHTML = '';
  if (addState.tryb === 'transakcja') {
    kdir.appendChild(el('span', { class: 'km-chip ' + (addState.kierunek === 'wydatek' ? 'active' : ''), onclick: () => { addState.kierunek = 'wydatek'; renderAddBody(); } }, ['Wydatek']));
    kdir.appendChild(el('span', { class: 'km-chip ' + (addState.kierunek === 'przychod' ? 'active' : ''), onclick: () => { addState.kierunek = 'przychod'; renderAddBody(); } }, ['Przychód']));
  }

  // 1. KWOTA
  const kwotaLabel = addState.tryb === 'transakcja' ? 'Kwota' : 'Kwota szacunku';
  body.appendChild(el('div', { style: 'margin-bottom:16px' }, [
    el('div', { class: 'caps-i', style: 'margin-bottom:8px' }, [kwotaLabel]),
    el('div', { style: 'display:flex;align-items:baseline;gap:8px;border-bottom:2px solid #000;padding-bottom:8px' }, [
      el('input', { type: 'number', inputmode: 'decimal', placeholder: '0', id: 'add-amount-input', value: addState.kwota || '', style: 'flex:1;border:none;outline:none;font-family:Anton;font-size:42px;line-height:1;letter-spacing:-1.5px;background:transparent;color:var(--fg);min-width:0;padding:0', oninput: (e) => addState.kwota = Number(e.target.value) || 0 }),
      el('span', { class: 'caps-i' }, ['PLN']),
    ]),
  ]));

  // 2. NAZWA
  body.appendChild(el('div', { style: 'margin-bottom:16px' }, [
    el('div', { class: 'caps-i', style: 'margin-bottom:6px' }, ['Nazwa']),
    el('input', { type: 'text', placeholder: addState.tryb === 'stale' ? 'np. Netflix' : 'np. Tankowanie · Orlen', value: addState.nazwa || '', class: 'fld-input txt', oninput: (e) => addState.nazwa = e.target.value }),
  ]));

  // 3. KATEGORIA — ukryta dla przychodu (sama kwota+nazwa)
  if (addState.kierunek !== 'przychod') {
    body.appendChild(el('div', { style: 'margin-bottom:16px' }, [
      el('div', { class: 'caps-i', style: 'margin-bottom:10px' }, ['Kategoria']),
      el('div', { class: 'ichips-wrap' }, CATS.map(k => ichip(k.split(' ')[0], catIcon(k), addState.kategoria === k, () => { addState.kategoria = k; renderAddBody(); }))),
    ]));
  }

  // 4. DATA — tylko dla nadchodzace (miesiąc w roku). Transakcja idzie automatycznie na STATE.mi (bieżący miesiąc widoku).
  const showDate = addState.tryb === 'nadchodzace' && !addState.locked;
  if (showDate) {
    body.appendChild(el('div', { style: 'margin-bottom:16px' }, [
      el('div', { class: 'caps-i', style: 'margin-bottom:8px' }, ['Data (miesiąc w roku)']),
      el('div', { class: 'month-grid' }, ML_FULL.map((m, i) => {
        const mi = i + 1;
        const active = addState.miesiac_annual === mi;
        return el('div', {
          class: 'month-cell' + (active ? ' active' : ''),
          onclick: () => { addState.miesiac_annual = mi; renderAddBody(); },
        }, [m.slice(0, 3)]);
      })),
    ]));
  }

  // 5. Toggle dzielony + anomalia — na samym dole. Stałe nie mogą być wspólne ani anomalią. Przychód też nie ma tych toggle'i.
  if (addState.tryb !== 'stale' && addState.kierunek !== 'przychod') {
    body.appendChild(el('div', { style: 'padding:12px 0;border-top:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center;cursor:pointer', onclick: () => { addState.dzielony = !addState.dzielony; renderAddBody(); } }, [
      el('div', { style: 'font-size:var(--txt-name-size);font-weight:600' }, ['Wspólny wydatek ♥']),
      el('span', { class: 'toggle ' + (addState.dzielony ? 'on' : '') }),
    ]));
    // Kwota partnera — input pod toggle, tylko jeśli dzielony=on
    if (addState.dzielony) {
      body.appendChild(el('div', { style: 'padding:6px 0 12px 14px;border-left:3px solid #ef4444;margin-bottom:4px' }, [
        el('div', { class: 'caps-i', style: 'margin-bottom:6px;color:var(--danger-2)' }, ['Udział partnera (PLN)']),
        el('input', {
          type: 'number', inputmode: 'decimal', placeholder: '0',
          value: addState.kwota_partnera || '',
          class: 'fld-input amt',
          oninput: (e) => addState.kwota_partnera = Number(e.target.value) || 0,
        }),
      ]));
    }
    body.appendChild(el('div', { style: 'padding:12px 0;border-top:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center;cursor:pointer', onclick: () => { addState.anomalia = !addState.anomalia; renderAddBody(); } }, [
      el('div', { style: 'font-size:var(--txt-name-size);font-weight:600' }, ['Warto zapamiętać ★']),
      el('span', { class: 'toggle ' + (addState.anomalia ? 'on' : '') }),
    ]));
  }
}

function saveAdd() {
  if (!addState) return;
  if (!addState.kwota && addState.tryb === 'transakcja') { toast('Wpisz kwotę', 'err'); return; }
  if (!addState.nazwa) { toast('Wpisz nazwę', 'err'); return; }

  if (addState.tryb === 'transakcja') {
    const newWpis = {
      id: nextWpisId(),
      typ: 'transakcja',
      kierunek: addState.kierunek,
      rok: STATE.yr,
      miesiac: addState.miesiac,
      data: '',
      nazwa: addState.nazwa,
      kategoria: addState.kategoria,
      kwota: addState.kwota,
      kwota_partnera: addState.kwota_partnera || 0,
      dzielony: addState.dzielony,
      anomalia: addState.anomalia,
      template_id: null,
      opis: addState.opis,
      usuniety: false,
    };
    STATE.localEdits.added.push(newWpis);
    apiAddWpis(newWpis);
  } else {
    // Stałe lub Nadchodzące — utwórz template + instance
    if (!STATE.localEdits.addedTemplates) STATE.localEdits.addedTemplates = [];
    const existingMaxId = Math.max(0, ...STATE.data.templates.map(t => t.id), ...STATE.localEdits.addedTemplates.map(t => t.id));
    const newTemplateId = existingMaxId + 1;
    const isStale = addState.tryb === 'stale';
    const newTpl = {
      id: newTemplateId,
      nazwa: addState.nazwa,
      kategoria: addState.kategoria,
      kierunek: addState.kierunek,
      kwota_szacunek: addState.kwota,
      freq: isStale ? 'monthly' : 'annual',
      miesiac: isStale ? null : addState.miesiac_annual,
      aktywny: true,
    };
    STATE.localEdits.addedTemplates.push(newTpl);
    apiAddTemplate(newTpl);
    const targetMi = isStale ? STATE.mi : addState.miesiac_annual;
    let targetYr = STATE.yr;
    if (!isStale && targetMi < (new Date().getMonth() + 1) && STATE.yr === new Date().getFullYear()) {
      targetYr++;
    }
    const newWpis = {
      id: nextWpisId(),
      typ: isStale ? 'stale' : 'nadchodzace',
      kierunek: addState.kierunek,
      rok: targetYr,
      miesiac: targetMi,
      data: '',
      nazwa: addState.nazwa,
      kategoria: addState.kategoria,
      kwota: 0,
      kwota_partnera: addState.kwota_partnera || 0,
      dzielony: addState.dzielony,
      anomalia: addState.anomalia,
      template_id: newTemplateId,
      opis: '',
      usuniety: false,
    };
    STATE.localEdits.added.push(newWpis);
    apiAddWpis(newWpis);
  }

  saveLocal();
  closeSheet();
  render();
}

// === CUSTOM KEYPAD (mobile only) ===========================================
const Keypad = {
  active: null,
  isMobile: matchMedia('(pointer:coarse)').matches && innerWidth < 700,

  open(input, mode) {
    if (!this.isMobile) return;
    // Drugi tap w ten sam input = no-op (keypad zostaje otwarty). Zamykanie tylko przez klik na zewnątrz / Confirm / close modalu.
    if (this.active && this.active.input === input) return;
    const wasActive = !!this.active;
    input.setAttribute('readonly', '');
    input.setAttribute('inputmode', 'none');
    this.active = { input, mode, val: String(input.value || ''), shift: false, alphaSub: null };
    document.body.classList.add('kp-open');
    document.documentElement.style.setProperty('--kp-h', (mode === 'alpha' ? 280 : 240) + 'px');
    this.render();
    // Switch z innego inputa → wanimuj zmianę treści (slide + fade)
    if (wasActive) {
      const root = document.getElementById('keypad-root');
      if (root) {
        root.classList.remove('kp-swap');
        void root.offsetWidth; // force reflow → re-trigger animation
        root.classList.add('kp-swap');
        setTimeout(() => root.classList.remove('kp-swap'), 260);
      }
    }
  },

  close() {
    if (!this.active) return;
    document.body.classList.remove('kp-open');
    this.active = null;
    const root = document.getElementById('keypad-root');
    // Czyść innerHTML PO transition (320ms) żeby slide-out był widoczny
    setTimeout(() => { if (!document.body.classList.contains('kp-open') && root) root.innerHTML = ''; }, 340);
  },

  press(key) {
    const a = this.active;
    if (!a) return;
    if (key === 'CONFIRM') { this.close(); return; }
    if (key === 'BACKSPACE') {
      a.val = a.val.slice(0, -1);
    } else if (key === 'SHIFT') {
      a.shift = !a.shift;
    } else if (key === 'MODE_NUM') {
      a.alphaSub = a.alphaSub === 'num' ? null : 'num';
    } else if (key === 'SPACE') {
      a.val += ' ';
    } else {
      const ch = a.shift ? key.toUpperCase() : key;
      a.val += ch;
      if (a.shift) a.shift = false;
    }
    a.input.value = a.val;
    a.input.dispatchEvent(new Event('input', { bubbles: true }));
    this.render();
  },

  render() {
    const a = this.active;
    if (!a) return;
    const root = document.getElementById('keypad-root');
    const echoVal = a.val || (a.mode === 'numeric' ? '0' : '');
    const ghost = a.mode === 'numeric' ? '<span class="gh"> PLN</span>' : (a.val ? '' : '<span class="gh">tap żeby pisać…</span>');
    const echoCls = a.mode === 'alpha' ? 'kp-echo alpha' : 'kp-echo';
    const head = `
      <div class="kp-head">
        <div class="${echoCls}">${this._esc(echoVal)}${ghost}</div>
        <button class="kp-confirm" data-k="CONFIRM"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>OK</button>
      </div>`;
    let body;
    if (a.mode === 'numeric') {
      body = `
        <div class="kp-num">
          ${[1,2,3,4,5,6,7,8,9].map(n => `<div class="k" data-k="${n}">${n}</div>`).join('')}
          <div class="k aux" data-k=".">.</div>
          <div class="k" data-k="0">0</div>
          <div class="k del" data-k="BACKSPACE"><svg viewBox="0 0 24 24"><path d="M3 12l5-7h12v14H8z"/><line x1="14" y1="9" x2="18" y2="13"/><line x1="18" y1="9" x2="14" y2="13"/></svg></div>
        </div>`;
    } else {
      // alpha QWERTY + Polish chars row
      const numMode = a.alphaSub === 'num';
      const rows = numMode
        ? [['1','2','3','4','5','6','7','8','9','0'], ['-','/',':',';','(',')','zł','&','@','"'], ['#+=','.',',','?','!','\'','BACKSPACE']]
        : [
            ['ą','ć','ę','ł','ń','ó','ś','ź','ż'],
            ['q','w','e','r','t','y','u','i','o','p'],
            ['a','s','d','f','g','h','j','k','l'],
            ['SHIFT','z','x','c','v','b','n','m','BACKSPACE'],
          ];
      const r0 = numMode ? '' : `<div class="kp-arow pl-row">${rows[0].map(c => `<div class="k" data-k="${c}">${c}</div>`).join('')}</div>`;
      const buildKey = (c) => {
        if (c === 'SHIFT') return `<div class="k shift wide${a.shift ? ' on' : ''}" data-k="SHIFT"><svg viewBox="0 0 24 24"><path d="M12 4 L4 13 H9 V20 H15 V13 H20 Z"/></svg></div>`;
        if (c === 'BACKSPACE') return `<div class="k del wide" data-k="BACKSPACE"><svg viewBox="0 0 24 24"><path d="M3 12l5-7h12v14H8z"/><line x1="14" y1="9" x2="18" y2="13"/><line x1="18" y1="9" x2="14" y2="13"/></svg></div>`;
        const disp = a.shift && !numMode ? c.toUpperCase() : c;
        return `<div class="k" data-k="${c}">${this._esc(disp)}</div>`;
      };
      const rNums = numMode ? rows.map(r => `<div class="kp-arow">${r.map(buildKey).join('')}</div>`).join('') : rows.slice(1, 4).map(r => `<div class="kp-arow">${r.map(buildKey).join('')}</div>`).join('');
      const bottom = `<div class="kp-arow">
        <div class="k mode wide" data-k="MODE_NUM">${numMode ? 'ABC' : '123'}</div>
        <div class="k space" data-k="SPACE">spacja</div>
        <div class="k" data-k=",">,</div>
        <div class="k" data-k=".">.</div>
      </div>`;
      body = `<div class="kp-alpha">${r0}${rNums}${bottom}</div>`;
    }
    root.innerHTML = head + body;
    // Tap feedback via JS — iOS :active jest nieprzewidywalny, używamy keyframe animation
    // przez klasę .pressed (CSS @keyframes kp-press / kp-press-alpha 220ms bounce)
    root.onpointerdown = (e) => {
      const t = e.target.closest('[data-k]');
      if (!t) return;
      t.classList.remove('pressed');  // reset jeśli klikamy szybko ten sam
      // Force reflow żeby re-trigger animacji
      void t.offsetWidth;
      t.classList.add('pressed');
      setTimeout(() => t.classList.remove('pressed'), 230);
    };
    root.onclick = (e) => {
      const t = e.target.closest('[data-k]');
      if (t) this.press(t.getAttribute('data-k'));
    };
  },

  _esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c])); },
};

// Auto-wire: na mobile każdy input[type=number] (kwota) i input[type=text] (notatka) w modalach
// otwiera keypad. Wyjątek: #cloud-token-input — admin pole, zostaje systemowe.
// Pointerdown + preventDefault → preempt focus → systemowa klawiatura nigdy się nie pokazuje
// (click leciał ZA focus, więc systemowa klawiatura migała przy pierwszym tapie).
function autoWireKeypad() {
  if (!Keypad.isMobile) return;
  const isKeypadInput = (el) => {
    if (!el || el.tagName !== 'INPUT') return false;
    if (el.id === 'cloud-token-input') return false;
    return el.type === 'number' || el.type === 'text';
  };
  document.addEventListener('pointerdown', (e) => {
    const inp = e.target.closest('input[type="number"], input[type="text"]');
    if (!isKeypadInput(inp)) return;
    e.preventDefault();  // blokuje focus → systemowa klawiatura nie startuje
    const mode = inp.type === 'number' ? 'numeric' : 'alpha';
    Keypad.open(inp, mode);
  }, true);
  // Klik poza keypadem i poza inputem → zsuń keypad (slide down)
  document.addEventListener('pointerdown', (e) => {
    if (!Keypad.active) return;
    if (e.target.closest('#keypad-root')) return;  // klik w keypad — nie zamykaj
    if (e.target.closest('input[type="number"], input[type="text"]')) return;  // klik w inny input — handler wyżej otworzy nowy keypad
    Keypad.close();
  }, true);
}

