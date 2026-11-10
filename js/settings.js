/* settings.js — analizzatori, test, lotti, logo, esportazione/importazione */

let settingsMachIdx = 0;

function renderSettings() {
  renderMachineList();
  renderTestManager();
}

/* ══════ ANALIZZATORI ══════ */
function renderMachineList() {
  const el = document.getElementById('machine-settings-list');
  if (!el) return;
  if (!state.machines.length) {
    el.innerHTML = '<div class="empty-msg">Nessun analizzatore. Aggiungine uno.</div>';
    return;
  }
  if (settingsMachIdx >= state.machines.length) settingsMachIdx = 0;
  el.innerHTML = state.machines.map((m, i) => {
    const active = m.tests.filter(t => t.active).length;
    const isSel = i === settingsMachIdx;
    return `<div class="machine-setting-card ${isSel ? 'selected' : ''}" style="--mc:${safeColor(m.color)}" onclick="selectSettingsMachine(${i})">
      <div class="ms-row1">
        <span class="ms-icon">${escHtml(m.icon || '')}</span>
        <div class="ms-info">
          <div class="ms-name">${escHtml(m.name)}</div>
          <div class="ms-type">${escHtml(m.type)} — ${active}/${m.tests.length} test attivi</div>
        </div>
        <div class="ms-actions">
          <button class="btn btn-sm btn-outline btn-icon" onclick="event.stopPropagation();editMachine(${i})" title="Modifica" aria-label="Modifica"><i data-lucide="pencil"></i></button>
          <button class="btn btn-sm btn-outline btn-icon" onclick="event.stopPropagation();moveMachine(${i},-1)" title="Sposta su" aria-label="Sposta su" ${i === 0 ? 'disabled' : ''}><i data-lucide="chevron-up"></i></button>
          <button class="btn btn-sm btn-outline btn-icon" onclick="event.stopPropagation();moveMachine(${i},1)" title="Sposta giù" aria-label="Sposta giù" ${i === state.machines.length - 1 ? 'disabled' : ''}><i data-lucide="chevron-down"></i></button>
          <button class="btn-danger-outline" onclick="event.stopPropagation();deleteMachine(${i})" title="Elimina" aria-label="Elimina"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
      <div class="ms-lots">
        <span class="lot-tag">Cal: ${escHtml(m.calLot || '—')}</span>
        <span class="lot-tag">Scad: ${escHtml(m.calExpiry ? fmtDateIt(m.calExpiry) : '—')}</span>
      </div>
    </div>`;
  }).join('');
}
function selectSettingsMachine(i) { settingsMachIdx = i; renderSettings(); }

function showAddMachineModal() {
  document.getElementById('machine-modal-title').textContent = 'Nuovo analizzatore';
  document.getElementById('mm-name').value = '';
  document.getElementById('mm-type').value = '';
  document.getElementById('mm-icon').value = '🔬';
  document.getElementById('mm-color').value = '#2980b9';
  document.getElementById('mm-cal-lot').value = '';
  document.getElementById('mm-cal-expiry').value = '';
  document.getElementById('mm-edit-idx').value = '-1';
  document.getElementById('machine-modal').classList.remove('hidden');
  document.getElementById('mm-name').focus();
}

function editMachine(idx) {
  const m = state.machines[idx];
  document.getElementById('machine-modal-title').textContent = 'Modifica analizzatore';
  document.getElementById('mm-name').value = m.name || '';
  document.getElementById('mm-type').value = m.type || '';
  document.getElementById('mm-icon').value = m.icon || '';
  document.getElementById('mm-color').value = safeColor(m.color, '#2980b9');
  document.getElementById('mm-cal-lot').value = m.calLot || '';
  document.getElementById('mm-cal-expiry').value = m.calExpiry || '';
  document.getElementById('mm-edit-idx').value = idx;
  document.getElementById('machine-modal').classList.remove('hidden');
}

function confirmMachineModal() {
  const name = document.getElementById('mm-name').value.trim();
  if (!name) { alert('Inserisci un nome.'); return; }
  const type = document.getElementById('mm-type').value.trim() || 'Generale';
  const icon = document.getElementById('mm-icon').value.trim() || '🔬';
  const color = document.getElementById('mm-color').value;
  const calLot = document.getElementById('mm-cal-lot').value.trim();
  const calExpiry = document.getElementById('mm-cal-expiry').value;
  const idx = parseInt(document.getElementById('mm-edit-idx').value);

  if (idx >= 0) {
    const m = state.machines[idx];
    m.name = name; m.type = type; m.icon = icon; m.color = color;
    m.calLot = calLot; m.calExpiry = calExpiry;
  } else {
    state.machines.push({
      id: newMachineId(), name, type, color, icon,
      calLot: calLot || autoLotNumber('CAL'),
      calExpiry: calExpiry || '',
      tests: []
    });
    settingsMachIdx = state.machines.length - 1;
  }
  saveData();
  document.getElementById('machine-modal').classList.add('hidden');
  renderSettings();
}

async function deleteMachine(idx) {
  const m = state.machines[idx];
  if (!await uiConfirm('Eliminare «' + m.name + '»?\nTutti i test, i valori CQ e le calibrazioni di questo analizzatore verranno persi.', { title: 'Elimina analizzatore' })) return;
  const prefix = m.id + '|';
  const calPrefix = 'CAL|' + m.id + '|';
  Object.keys(state.readings).filter(k => k.startsWith(prefix)).forEach(k => delete state.readings[k]);
  Object.keys(state.calibrations).filter(k => k.startsWith(calPrefix)).forEach(k => delete state.calibrations[k]);
  state.machines.splice(idx, 1);
  if (settingsMachIdx >= state.machines.length) settingsMachIdx = Math.max(0, state.machines.length - 1);
  saveData();
  renderSettings();
}

function moveMachine(idx, dir) {
  const ni = idx + dir;
  if (ni < 0 || ni >= state.machines.length) return;
  [state.machines[idx], state.machines[ni]] = [state.machines[ni], state.machines[idx]];
  if (settingsMachIdx === idx) settingsMachIdx = ni;
  else if (settingsMachIdx === ni) settingsMachIdx = idx;
  saveData(); renderSettings();
}

/* ══════ TEST ══════ */
function renderTestManager() {
  const el = document.getElementById('test-manager');
  if (!el) return;
  const m = state.machines[settingsMachIdx];
  if (!m) { el.innerHTML = '<div class="empty-msg">Seleziona un analizzatore.</div>'; return; }

  let h = `<div class="test-manager-head">
    <h3 style="color:${safeColor(m.color)}"><span>${escHtml(m.icon || '')}</span>${escHtml(m.name)} — ${m.tests.length} test</h3>
    <button class="btn btn-sm btn-primary" onclick="showAddTestModal()"><i data-lucide="plus"></i>Aggiungi test</button>
  </div>`;

  if (!m.tests.length) { el.innerHTML = h + '<div class="empty-msg">Nessun test configurato.</div>'; return; }

  h += '<div class="test-list">';
  m.tests.forEach((t, ti) => {
    const lvStr = t.levels.map(lv =>
      `<span class="level-chip" title="Media: ${escHtml(lv.mean)} — DS: ${escHtml(lv.sd)} — Lotto: ${escHtml(lv.lot)}">Lv${escHtml(lv.lv)}: ${escHtml(lv.name)} (${escHtml(lv.mean)} ± ${escHtml(lv.sd)})</span>`
    ).join(' ');
    h += `<div class="test-item ${t.active ? '' : 'test-inactive'}">
      <div class="test-item-main">
        <label class="toggle-wrap" title="Attiva / disattiva">
          <input type="checkbox" ${t.active ? 'checked' : ''} onchange="toggleTest(${ti},this.checked)" aria-label="Test attivo">
          <span class="toggle-slider"></span>
        </label>
        <div class="test-item-info">
          <strong>${escHtml(t.name)}</strong> <small style="color:var(--text-muted)">(${escHtml(t.id)}) — ${escHtml(t.unit)}</small>
          <div class="test-levels-row">${lvStr}</div>
        </div>
        <div class="test-item-actions">
          <button class="btn btn-sm btn-outline btn-icon" onclick="editTestModal(${ti})" title="Modifica" aria-label="Modifica"><i data-lucide="pencil"></i></button>
          <button class="btn btn-sm btn-outline" onclick="editLotsModal(${ti})"><i data-lucide="package"></i>Lotti</button>
          <button class="btn-danger-outline" onclick="deleteTest(${ti})" title="Elimina" aria-label="Elimina"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
    </div>`;
  });
  h += '</div>';
  el.innerHTML = h;
}

function toggleTest(ti, active) {
  state.machines[settingsMachIdx].tests[ti].active = active;
  saveData(); renderTestManager(); renderMachineList();
}

async function deleteTest(ti) {
  const m = state.machines[settingsMachIdx];
  const t = m.tests[ti];
  if (!await uiConfirm('Eliminare il test «' + t.name + '»?\nTutti i valori CQ e le calibrazioni del test verranno persi.', { title: 'Elimina test' })) return;
  // tutti i livelli, anche quelli tolti in passato (prima restavano dati orfani)
  const p1 = m.id + '|' + t.id + '|', p2 = 'CAL|' + m.id + '|' + t.id + '|';
  Object.keys(state.readings).filter(k => k.startsWith(p1)).forEach(k => delete state.readings[k]);
  Object.keys(state.calibrations).filter(k => k.startsWith(p2)).forEach(k => delete state.calibrations[k]);
  m.tests.splice(ti, 1);
  saveData(); renderSettings();
}

function showAddTestModal() {
  document.getElementById('test-modal-title').textContent = 'Nuovo test';
  document.getElementById('tm-id').value = '';
  document.getElementById('tm-id').disabled = false;
  document.getElementById('tm-name').value = '';
  document.getElementById('tm-unit').value = '';
  document.getElementById('tm-edit-idx').value = '-1';
  document.getElementById('tm-active').checked = true;
  window._lvNext = 2;
  renderLevelEditor([{ lv: 1, name: 'Livello 1', mean: '', sd: '', lot: '' }]);
  document.getElementById('test-modal').classList.remove('hidden');
}

function editTestModal(ti) {
  const t = state.machines[settingsMachIdx].tests[ti];
  document.getElementById('test-modal-title').textContent = 'Modifica test';
  document.getElementById('tm-id').value = t.id;
  document.getElementById('tm-id').disabled = true;
  document.getElementById('tm-name').value = t.name;
  document.getElementById('tm-unit').value = t.unit;
  document.getElementById('tm-active').checked = t.active;
  document.getElementById('tm-edit-idx').value = ti;
  window._lvNext = Math.max(0, ...t.levels.map(l => +l.lv || 0)) + 1;
  renderLevelEditor(JSON.parse(JSON.stringify(t.levels)));
  document.getElementById('test-modal').classList.remove('hidden');
}

/* Ogni livello conserva il proprio numero (lv): i valori salvati sono legati a quel numero.
   Prima, togliendo il livello 1 di 3, il 2 diventava 1 e il 3 diventava 2: i valori registrati
   finivano sotto il livello sbagliato e venivano giudicati con media e DS di un altro controllo. */
function renderLevelEditor(levels) {
  window._editLevels = levels;
  const el = document.getElementById('tm-levels-editor');
  el.innerHTML = levels.map((lv, i) => `
    <div class="level-edit-row">
      <span class="le-num">Lv${escHtml(lv.lv)}</span>
      <input type="text" value="${escHtml(lv.name)}" placeholder="Nome livello" oninput="window._editLevels[${i}].name=this.value" style="flex:1;min-width:110px">
      <input type="number" step="any" value="${escHtml(lv.mean)}" placeholder="Media" oninput="window._editLevels[${i}].mean=this.value" style="width:90px">
      <input type="number" step="any" min="0" value="${escHtml(lv.sd)}" placeholder="DS" oninput="window._editLevels[${i}].sd=this.value" style="width:80px">
      <input type="text" value="${escHtml(lv.lot)}" placeholder="Lotto CQ" oninput="window._editLevels[${i}].lot=this.value" style="width:130px">
      <button class="btn-remove" onclick="removeEditLevel(${i})" title="Rimuovi livello" aria-label="Rimuovi livello">×</button>
    </div>
  `).join('') + `<button class="btn btn-sm btn-outline" style="margin-top:6px" onclick="addEditLevel()"><i data-lucide="plus"></i>Aggiungi livello</button>`;
}
function addEditLevel() {
  const n = window._lvNext || (Math.max(0, ...window._editLevels.map(l => +l.lv || 0)) + 1);
  window._lvNext = n + 1;
  window._editLevels.push({ lv: n, name: 'Livello ' + n, mean: '', sd: '', lot: '' });
  renderLevelEditor(window._editLevels);
}
function removeEditLevel(i) { window._editLevels.splice(i, 1); renderLevelEditor(window._editLevels); }

function confirmTestModal() {
  const m = state.machines[settingsMachIdx];
  const id = document.getElementById('tm-id').value.trim().toUpperCase();
  const name = document.getElementById('tm-name').value.trim();
  const unit = document.getElementById('tm-unit').value.trim();
  const active = document.getElementById('tm-active').checked;
  const idx = parseInt(document.getElementById('tm-edit-idx').value);
  if (!id || !name) { alert('Codice e nome sono obbligatori.'); return; }
  if (id.includes('|')) { alert('Il codice non può contenere il carattere |'); return; }

  const num = v => { const s = String(v == null ? '' : v).trim().replace(',', '.'); return s === '' ? null : parseFloat(s); };
  const levels = [], usati = new Set();
  for (const lv of (window._editLevels || [])) {
    const mean = num(lv.mean), sd = num(lv.sd);
    if (mean == null && sd == null) continue; // riga vuota: ignorata
    // 0 e' una media valida; la DS deve essere maggiore di 0 (serve per dividere)
    if (mean == null || !isFinite(mean) || sd == null || !isFinite(sd) || sd <= 0) {
      alert('Livello «' + (lv.name || 'Lv' + lv.lv) + '»: inserisci una media numerica e una DS maggiore di 0.');
      return;
    }
    let n = +lv.lv;
    if (!(n > 0) || usati.has(n)) { n = window._lvNext || 1; while (usati.has(n)) n++; window._lvNext = n + 1; }
    usati.add(n);
    levels.push({ lv: n, name: (lv.name || '').trim() || ('Livello ' + n), mean, sd, lot: (lv.lot || '').trim() || autoLotNumber('QC-' + m.id) });
  }
  if (!levels.length) { alert('Serve almeno un livello CQ con media e DS.'); return; }

  if (idx >= 0) {
    const t = m.tests[idx];
    t.name = name; t.unit = unit; t.active = active; t.levels = levels;
  } else {
    if (m.tests.find(t => t.id === id)) { alert('Esiste già un test con questo codice.'); return; }
    m.tests.push({ id, name, unit, active, levels });
  }
  saveData();
  document.getElementById('test-modal').classList.add('hidden');
  renderSettings();
}

/* ── Lotti ── */
function editLotsModal(ti) {
  const m = state.machines[settingsMachIdx];
  const t = m.tests[ti];
  document.getElementById('lot-modal-title').textContent = 'Lotti CQ — ' + t.name;
  document.getElementById('lot-test-idx').value = ti;

  document.getElementById('lot-editor').innerHTML = `
    <div style="margin-bottom:12px">
      <span class="label-caps">Lotto calibrazione (analizzatore)</span>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input type="text" id="lot-cal" value="${escHtml(m.calLot || '')}" placeholder="Numero lotto calibrazione" style="flex:1;min-width:160px">
        <button class="btn btn-sm btn-outline" onclick="document.getElementById('lot-cal').value=autoLotNumber('CAL-${escJs(m.id)}')"><i data-lucide="dices"></i>Auto</button>
        <input type="date" id="lot-cal-exp" value="${escHtml(m.calExpiry || '')}" style="width:160px">
      </div>
    </div>
    <hr style="border:none;border-top:1px solid var(--border-light);margin:12px 0">
    <span class="label-caps">Lotti controllo qualità</span>
    ${t.levels.map((lv, i) => `
      <div class="lot-level-row">
        <span class="lot-level-label">Lv${escHtml(lv.lv)} — ${escHtml(lv.name)}</span>
        <div style="display:flex;gap:8px;align-items:center">
          <input type="text" class="lot-qc-input" data-lvidx="${i}" value="${escHtml(lv.lot)}" placeholder="Lotto CQ" style="flex:1;min-width:0">
          <button class="btn btn-sm btn-outline btn-icon" title="Numero automatico" aria-label="Numero automatico" onclick="this.parentElement.querySelector('.lot-qc-input').value=autoLotNumber('QC')"><i data-lucide="dices"></i></button>
          <button class="btn btn-sm btn-outline btn-icon" title="Inserisci il numero letto da strumento/DB" aria-label="Inserisci numero" onclick="askLot(this)"><i data-lucide="monitor"></i></button>
        </div>
      </div>
    `).join('')}
  `;
  document.getElementById('lot-modal').classList.remove('hidden');
}
async function askLot(btn) {
  const inp = btn.parentElement.querySelector('.lot-qc-input');
  const v = await uiPrompt('Numero di lotto letto da strumento/DB:', inp.value, { title: 'Lotto CQ' });
  if (v != null && v.trim()) inp.value = v.trim();
}

function confirmLotModal() {
  const m = state.machines[settingsMachIdx];
  const ti = parseInt(document.getElementById('lot-test-idx').value);
  const t = m.tests[ti];
  m.calLot = document.getElementById('lot-cal').value.trim();
  m.calExpiry = document.getElementById('lot-cal-exp').value;
  document.querySelectorAll('.lot-qc-input').forEach(inp => {
    const i = parseInt(inp.dataset.lvidx);
    if (t.levels[i]) t.levels[i].lot = inp.value.trim();
  });
  saveData();
  document.getElementById('lot-modal').classList.add('hidden');
  renderSettings();
}

async function resetMachines() {
  if (!await uiConfirm('Ripristinare i ' + DEFAULT_MACHINES.length + ' analizzatori predefiniti?\nTutte le configurazioni personalizzate (test, medie, DS, lotti) verranno perse. I valori CQ già registrati restano salvati.', { title: 'Ripristina predefiniti' })) return;
  state.machines = JSON.parse(JSON.stringify(DEFAULT_MACHINES));
  settingsMachIdx = 0;
  saveData(); renderSettings();
}

/* ══════ LOGO ══════ */
function handleLogoUpload(e) {
  const file = e.target.files[0]; if (!file) return;
  if (!/^image\/(png|jpe?g)$/i.test(file.type)) { alert('Usa un\'immagine PNG o JPEG.'); e.target.value = ''; return; }
  if (file.size > 700 * 1024) { alert('⚠️ Il logo è troppo grande (' + Math.round(file.size / 1024) + ' kB): usa un\'immagine sotto i 700 kB, la memoria del browser è limitata.'); e.target.value = ''; return; }
  const reader = new FileReader();
  reader.onload = ev => {
    try { localStorage.setItem('qclab_logo', ev.target.result); }
    catch (err) { alert('❌ Logo non salvato: la memoria del browser è piena.'); }
    showLogo(ev.target.result);
  };
  reader.readAsDataURL(file);
}
function showLogo(src) {
  const img = document.getElementById('header-preview');
  img.src = src; img.classList.remove('hidden');
  document.getElementById('upload-placeholder').style.display = 'none';
  document.getElementById('btn-remove-header').style.display = 'inline-flex';
}
function removeLogo() {
  document.getElementById('header-preview').removeAttribute('src');
  document.getElementById('header-preview').classList.add('hidden');
  document.getElementById('upload-placeholder').style.display = '';
  document.getElementById('btn-remove-header').style.display = 'none';
  document.getElementById('logo-file').value = '';
  try { localStorage.removeItem('qclab_logo'); } catch (e) { }
}
function loadLogo() {
  try { const logo = localStorage.getItem('qclab_logo'); if (logo) showLogo(logo); } catch (e) { }
}

/* ══════ ESPORTAZIONE / IMPORTAZIONE ══════ */
function exportData() {
  const data = { machines: state.machines, readings: state.readings, calibrations: state.calibrations, exportDate: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = 'qclab_export_' + localDateStr() + '.json';
  document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}
function importData(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async e => {
    let d;
    try { d = JSON.parse(e.target.result); } catch (err) { alert('❌ File non valido: non è un JSON leggibile.'); return; }
    // prima un file qualsiasi (es. il backup di Temp-frigo) dava «Importazione riuscita» senza importare nulla
    if (!d || typeof d !== 'object') { alert('❌ Questo file non è un backup del Registro CQI.'); return; }
    // solo le chiavi nel formato del Registro CQI (MACCHINA|TEST|LIVELLO|AAAA-MM-GG e CAL|…|AAAA-MM)
    const pick = (obj, re) => { const o = {}; if (obj && typeof obj === 'object') for (const k in obj) if (re.test(k) && obj[k] && typeof obj[k] === 'object') o[k] = obj[k]; return o; };
    d.readings = pick(d.readings, /^[^|]+\|[^|]+\|\d+\|\d{4}-\d{2}-\d{2}$/);
    d.calibrations = pick(d.calibrations, /^CAL\|[^|]+\|[^|]+\|\d+\|\d{4}-\d{2}$/);
    const okMach = Array.isArray(d.machines) && d.machines.length && d.machines.every(m => m && m.id && Array.isArray(m.tests));
    const nR = Object.keys(d.readings).length, nC = Object.keys(d.calibrations).length;
    const okRead = nR > 0, okCal = nC > 0;
    if (!okMach && !okRead && !okCal) { alert('❌ Questo file non è un backup del Registro CQI.'); return; }
    if (!await uiConfirm('Importare il backup' + (d.exportDate ? ' del ' + new Date(d.exportDate).toLocaleString('it-IT') : '') + '?\n' +
      (okMach ? '• ' + d.machines.length + ' analizzatori: SOSTITUISCONO la configurazione attuale\n' : '') +
      '• ' + nR + ' valori CQ e ' + nC + ' calibrazioni: si aggiungono a quelli presenti (a parità di giorno vince il file).',
      { title: 'Importa backup', danger: !!okMach, ok: 'Importa' })) return;
    if (okMach) { state.machines = d.machines; state.machines.forEach(normalizeMachine); }
    if (okRead) Object.assign(state.readings, d.readings);
    if (okCal) Object.assign(state.calibrations, d.calibrations);
    settingsMachIdx = 0;
    if (saveData()) alert('✅ Importazione riuscita: ' + nR + ' valori CQ, ' + nC + ' calibrazioni.');
    refreshCurrentSection();
  };
  reader.readAsText(file); event.target.value = '';
}
async function clearAllData() {
  if (!await uiConfirm('Eliminare TUTTI i valori CQ e le calibrazioni registrati in questo browser?\nL\'operazione è irreversibile: esporta prima un backup.', { title: 'Cancella dati CQ' })) return;
  if (!await uiConfirm('Conferma definitiva: cancellare tutti i dati CQ?', { ok: 'Sì, cancella tutto' })) return;
  state.readings = {};
  state.calibrations = {};
  saveData(); showSection('dashboard');
}
