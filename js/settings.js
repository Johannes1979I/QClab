/* settings.js — Machine CRUD, Test CRUD, Lot Management, Logo, Export/Import */

let settingsMachIdx = 0;

function renderSettings() {
  renderMachineList();
  renderTestManager();
}

/* ══════ MACHINE LIST ══════ */
function renderMachineList() {
  const el = document.getElementById('machine-settings-list');
  if (!el) return;
  if (!state.machines.length) {
    el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted)">Nessun analizzatore. Aggiungine uno.</div>';
    return;
  }
  el.innerHTML = state.machines.map((m, i) => {
    const active = m.tests.filter(t => t.active).length;
    const total = m.tests.length;
    const isSel = i === settingsMachIdx;
    return `<div class="machine-setting-card ${isSel ? 'selected' : ''}" style="border-left:4px solid ${m.color}" onclick="settingsMachIdx=${i};renderSettings()">
      <div class="ms-row1">
        <span class="ms-icon">${m.icon}</span>
        <div class="ms-info">
          <div class="ms-name">${m.name}</div>
          <div class="ms-type">${m.type} — ${active}/${total} test attivi</div>
        </div>
        <div class="ms-actions">
          <button class="btn btn-sm btn-outline" onclick="event.stopPropagation();editMachine(${i})" title="Modifica">✏️</button>
          <button class="btn btn-sm btn-outline" onclick="event.stopPropagation();moveMachine(${i},-1)" title="Su" ${i === 0 ? 'disabled' : ''}>▲</button>
          <button class="btn btn-sm btn-outline" onclick="event.stopPropagation();moveMachine(${i},1)" title="Giù" ${i === state.machines.length - 1 ? 'disabled' : ''}>▼</button>
          <button class="btn btn-sm btn-danger-outline" onclick="event.stopPropagation();deleteMachine(${i})" title="Elimina">🗑</button>
        </div>
      </div>
      <div class="ms-lots">
        <span class="lot-tag">Cal: ${m.calLot || '—'}</span>
        <span class="lot-tag">Scad: ${m.calExpiry || '—'}</span>
      </div>
    </div>`;
  }).join('');
}

/* ── Machine CRUD ── */
function showAddMachineModal() {
  document.getElementById('machine-modal-title').textContent = '➕ Nuovo Analizzatore';
  document.getElementById('mm-name').value = '';
  document.getElementById('mm-type').value = '';
  document.getElementById('mm-icon').value = '🔬';
  document.getElementById('mm-color').value = '#2980b9';
  document.getElementById('mm-cal-lot').value = '';
  document.getElementById('mm-cal-expiry').value = '';
  document.getElementById('mm-edit-idx').value = '-1';
  document.getElementById('machine-modal').classList.remove('hidden');
}

function editMachine(idx) {
  const m = state.machines[idx];
  document.getElementById('machine-modal-title').textContent = '✏️ Modifica Analizzatore';
  document.getElementById('mm-name').value = m.name;
  document.getElementById('mm-type').value = m.type;
  document.getElementById('mm-icon').value = m.icon;
  document.getElementById('mm-color').value = m.color;
  document.getElementById('mm-cal-lot').value = m.calLot || '';
  document.getElementById('mm-cal-expiry').value = m.calExpiry || '';
  document.getElementById('mm-edit-idx').value = idx;
  document.getElementById('machine-modal').classList.remove('hidden');
}

function confirmMachineModal() {
  const name = document.getElementById('mm-name').value.trim();
  if (!name) { alert('Inserire un nome.'); return; }
  const type = document.getElementById('mm-type').value.trim() || 'Generale';
  const icon = document.getElementById('mm-icon').value || '🔬';
  const color = document.getElementById('mm-color').value;
  const calLot = document.getElementById('mm-cal-lot').value.trim();
  const calExpiry = document.getElementById('mm-cal-expiry').value;
  const idx = parseInt(document.getElementById('mm-edit-idx').value);

  if (idx >= 0) {
    // Edit existing
    const m = state.machines[idx];
    m.name = name; m.type = type; m.icon = icon; m.color = color;
    m.calLot = calLot; m.calExpiry = calExpiry;
  } else {
    // New machine
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

function deleteMachine(idx) {
  const m = state.machines[idx];
  if (!confirm('Eliminare "' + m.name + '"?\nTutti i test e dati CQ associati verranno persi.')) return;
  // Remove readings and calibrations
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

/* ══════ TEST MANAGER ══════ */
function renderTestManager() {
  const el = document.getElementById('test-manager');
  if (!el || !state.machines.length) { if (el) el.innerHTML = ''; return; }
  const m = state.machines[settingsMachIdx];
  if (!m) return;

  let h = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
    <h3 style="color:${m.color};margin:0">${m.icon} ${m.name} — Test (${m.tests.length})</h3>
    <button class="btn btn-sm btn-primary" onclick="showAddTestModal()">➕ Aggiungi Test</button>
  </div>`;

  if (!m.tests.length) {
    h += '<div style="text-align:center;padding:20px;color:var(--text-muted)">Nessun test configurato.</div>';
    el.innerHTML = h; return;
  }

  h += '<div class="test-list">';
  m.tests.forEach((t, ti) => {
    const lvStr = t.levels.map(lv =>
      `<span class="level-chip" title="Media:${lv.mean} SD:${lv.sd} Lotto:${lv.lot}">Lv${lv.lv}: ${lv.name} (${lv.mean}±${lv.sd})</span>`
    ).join(' ');

    h += `<div class="test-item ${t.active ? '' : 'test-inactive'}">
      <div class="test-item-main">
        <label class="toggle-wrap" title="Attiva/Disattiva">
          <input type="checkbox" ${t.active ? 'checked' : ''} onchange="toggleTest(${ti},this.checked)">
          <span class="toggle-slider"></span>
        </label>
        <div class="test-item-info">
          <strong>${t.name}</strong> <small style="color:var(--text-muted)">(${t.id}) — ${t.unit}</small>
          <div class="test-levels-row">${lvStr}</div>
        </div>
        <div class="test-item-actions">
          <button class="btn btn-sm btn-outline" onclick="editTestModal(${ti})">✏️</button>
          <button class="btn btn-sm btn-outline" onclick="editLotsModal(${ti})">📦 Lotti</button>
          <button class="btn btn-sm btn-danger-outline" onclick="deleteTest(${ti})">🗑</button>
        </div>
      </div>
    </div>`;
  });
  h += '</div>';
  el.innerHTML = h;
}

function toggleTest(ti, active) {
  state.machines[settingsMachIdx].tests[ti].active = active;
  saveData(); renderTestManager();
}

function deleteTest(ti) {
  const m = state.machines[settingsMachIdx];
  const t = m.tests[ti];
  if (!confirm('Eliminare il test "' + t.name + '"? Tutti i dati CQ associati verranno persi.')) return;
  t.levels.forEach(lv => {
    Object.keys(state.readings).filter(k => k.startsWith(m.id + '|' + t.id + '|' + lv.lv + '|')).forEach(k => delete state.readings[k]);
    Object.keys(state.calibrations).filter(k => k.startsWith('CAL|' + m.id + '|' + t.id + '|' + lv.lv + '|')).forEach(k => delete state.calibrations[k]);
  });
  m.tests.splice(ti, 1);
  saveData(); renderTestManager();
}

/* ── Add/Edit Test Modal ── */
function showAddTestModal() {
  document.getElementById('test-modal-title').textContent = '➕ Nuovo Test';
  document.getElementById('tm-id').value = '';
  document.getElementById('tm-id').disabled = false;
  document.getElementById('tm-name').value = '';
  document.getElementById('tm-unit').value = '';
  document.getElementById('tm-edit-idx').value = '-1';
  document.getElementById('tm-active').checked = true;
  renderLevelEditor([{ lv: 1, name: 'Livello 1', mean: '', sd: '', lot: '' }]);
  document.getElementById('test-modal').classList.remove('hidden');
}

function editTestModal(ti) {
  const t = state.machines[settingsMachIdx].tests[ti];
  document.getElementById('test-modal-title').textContent = '✏️ Modifica Test';
  document.getElementById('tm-id').value = t.id;
  document.getElementById('tm-id').disabled = true;
  document.getElementById('tm-name').value = t.name;
  document.getElementById('tm-unit').value = t.unit;
  document.getElementById('tm-active').checked = t.active;
  document.getElementById('tm-edit-idx').value = ti;
  renderLevelEditor(JSON.parse(JSON.stringify(t.levels)));
  document.getElementById('test-modal').classList.remove('hidden');
}

function renderLevelEditor(levels) {
  window._editLevels = levels;
  const el = document.getElementById('tm-levels-editor');
  el.innerHTML = levels.map((lv, i) => `
    <div class="level-edit-row">
      <span class="le-num">Lv${lv.lv || i + 1}</span>
      <input type="text" value="${lv.name}" placeholder="Nome livello" onchange="window._editLevels[${i}].name=this.value" style="flex:1">
      <input type="number" step="any" value="${lv.mean}" placeholder="Media" onchange="window._editLevels[${i}].mean=parseFloat(this.value)" style="width:80px">
      <input type="number" step="any" value="${lv.sd}" placeholder="SD" onchange="window._editLevels[${i}].sd=parseFloat(this.value)" style="width:70px">
      <input type="text" value="${lv.lot}" placeholder="Lotto CQ" onchange="window._editLevels[${i}].lot=this.value" style="width:120px">
      <button class="btn-remove" onclick="window._editLevels.splice(${i},1);renderLevelEditor(window._editLevels)" title="Rimuovi livello">×</button>
    </div>
  `).join('') + `<button class="btn btn-sm btn-outline" style="margin-top:6px" onclick="window._editLevels.push({lv:window._editLevels.length+1,name:'Livello '+(window._editLevels.length+1),mean:'',sd:'',lot:''});renderLevelEditor(window._editLevels)">+ Aggiungi livello</button>`;
}

function confirmTestModal() {
  const m = state.machines[settingsMachIdx];
  const id = document.getElementById('tm-id').value.trim().toUpperCase();
  const name = document.getElementById('tm-name').value.trim();
  const unit = document.getElementById('tm-unit').value.trim();
  const active = document.getElementById('tm-active').checked;
  const idx = parseInt(document.getElementById('tm-edit-idx').value);
  if (!id || !name) { alert('ID e Nome obbligatori.'); return; }

  const levels = (window._editLevels || []).filter(lv => lv.mean !== '' && lv.sd !== '').map((lv, i) => ({
    lv: i + 1, name: lv.name || ('Livello ' + (i + 1)),
    mean: parseFloat(lv.mean), sd: parseFloat(lv.sd),
    lot: lv.lot || autoLotNumber('QC-' + m.id)
  }));
  if (!levels.length) { alert('Almeno un livello CQ con media e SD.'); return; }

  if (idx >= 0) {
    const t = m.tests[idx];
    t.name = name; t.unit = unit; t.active = active; t.levels = levels;
  } else {
    if (m.tests.find(t => t.id === id)) { alert('ID test già esistente.'); return; }
    m.tests.push({ id, name, unit, active, levels });
  }
  saveData();
  document.getElementById('test-modal').classList.add('hidden');
  renderTestManager();
}

/* ── Lot Editor Modal ── */
function editLotsModal(ti) {
  const m = state.machines[settingsMachIdx];
  const t = m.tests[ti];
  document.getElementById('lot-modal-title').textContent = '📦 Lotti CQ — ' + t.name;
  document.getElementById('lot-test-idx').value = ti;

  const el = document.getElementById('lot-editor');
  el.innerHTML = `
    <div style="margin-bottom:12px">
      <label style="font-size:12px;font-weight:600;color:var(--text-muted)">LOTTO CALIBRAZIONE (Analizzatore)</label>
      <div style="display:flex;gap:8px;align-items:center;margin-top:4px">
        <input type="text" id="lot-cal" value="${m.calLot || ''}" placeholder="Numero lotto calibrazione" style="flex:1">
        <button class="btn btn-sm btn-outline" onclick="document.getElementById('lot-cal').value=autoLotNumber('CAL-${m.id}')">🎲 Auto</button>
        <input type="date" id="lot-cal-exp" value="${m.calExpiry || ''}" style="width:150px">
      </div>
    </div>
    <hr style="border:none;border-top:1px solid var(--border-light);margin:12px 0">
    <label style="font-size:12px;font-weight:600;color:var(--text-muted)">LOTTI CONTROLLO QUALITÀ</label>
    ${t.levels.map((lv, i) => `
      <div class="lot-level-row">
        <span class="lot-level-label">Lv${lv.lv} — ${lv.name}</span>
        <div style="display:flex;gap:8px;align-items:center">
          <input type="text" class="lot-qc-input" data-lvidx="${i}" value="${lv.lot}" placeholder="Lotto CQ" style="flex:1">
          <button class="btn btn-sm btn-outline" onclick="this.previousElementSibling.value=autoLotNumber('QC')">🎲</button>
          <button class="btn btn-sm btn-outline" onclick="this.parentElement.querySelector('.lot-qc-input').value=prompt('Inserisci numero lotto da strumento/DB:','')||this.parentElement.querySelector('.lot-qc-input').value">🖥️</button>
        </div>
      </div>
    `).join('')}
  `;
  document.getElementById('lot-modal').classList.remove('hidden');
}

function confirmLotModal() {
  const m = state.machines[settingsMachIdx];
  const ti = parseInt(document.getElementById('lot-test-idx').value);
  const t = m.tests[ti];

  m.calLot = document.getElementById('lot-cal').value.trim();
  m.calExpiry = document.getElementById('lot-cal-exp').value;

  document.querySelectorAll('.lot-qc-input').forEach(inp => {
    const idx = parseInt(inp.dataset.lvidx);
    if (t.levels[idx]) t.levels[idx].lot = inp.value.trim();
  });

  saveData();
  document.getElementById('lot-modal').classList.add('hidden');
  renderSettings();
}

/* ══════ RESET ══════ */
function resetMachines() {
  if (!confirm('Ripristinare le 6 macchine predefinite?\nTutte le configurazioni personalizzate verranno perse.')) return;
  state.machines = JSON.parse(JSON.stringify(DEFAULT_MACHINES));
  settingsMachIdx = 0;
  saveData(); renderSettings();
}

/* ══════ LOGO ══════ */
function handleLogoUpload(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById('header-preview').src = ev.target.result;
    document.getElementById('header-preview').classList.remove('hidden');
    document.getElementById('upload-placeholder').style.display = 'none';
    document.getElementById('btn-remove-header').style.display = 'inline-flex';
    try { localStorage.setItem('qclab_logo', ev.target.result); } catch (e) { }
  };
  reader.readAsDataURL(file);
}
function removeLogo() {
  document.getElementById('header-preview').src = '';
  document.getElementById('header-preview').classList.add('hidden');
  document.getElementById('upload-placeholder').style.display = '';
  document.getElementById('btn-remove-header').style.display = 'none';
  document.getElementById('logo-file').value = '';
  try { localStorage.removeItem('qclab_logo'); } catch (e) { }
}
function loadLogo() {
  try {
    const logo = localStorage.getItem('qclab_logo');
    if (logo) {
      document.getElementById('header-preview').src = logo;
      document.getElementById('header-preview').classList.remove('hidden');
      document.getElementById('upload-placeholder').style.display = 'none';
      document.getElementById('btn-remove-header').style.display = 'inline-flex';
    }
  } catch (e) { }
}

/* ══════ EXPORT / IMPORT ══════ */
function exportData() {
  const data = { machines: state.machines, readings: state.readings, calibrations: state.calibrations, exportDate: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = 'qclab_export_' + new Date().toISOString().split('T')[0] + '.json';
  document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}
function importData(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const d = JSON.parse(e.target.result);
      if (d.machines) state.machines = d.machines;
      if (d.readings) Object.assign(state.readings, d.readings);
      if (d.calibrations) Object.assign(state.calibrations, d.calibrations);
      saveData(); renderSettings(); alert('Importazione riuscita.');
    } catch (err) { alert('Errore: ' + err.message); }
  };
  reader.readAsText(file); event.target.value = '';
}
function clearAllData() {
  if (!confirm('Eliminare TUTTI i dati CQ? Azione irreversibile.')) return;
  if (!confirm('Conferma definitiva?')) return;
  state.readings = {};
  state.calibrations = {};
  saveData(); showSection('dashboard');
}
