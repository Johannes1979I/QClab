/* pdf-generator.js — Monthly QC Report PDF + Archive */

function renderPdfPreview() {
  const el = document.getElementById('pdf-preview-info'); if (!el) return;
  const wd = getWorkingDays(state.year, state.month);
  let total = 0, filled = 0, rejects = 0;
  state.machines.forEach(m => { m.tests.filter(t => t.active).forEach(t => { t.levels.forEach(lv => { wd.forEach(d => {
    total++;
    const r = getReading(m.id, t.id, lv.lv, d.date);
    if (r) { filled++; if (evalQC(r.value, lv.mean, lv.sd).status === 'reject') rejects++; }
  }); }); }); });
  el.innerHTML = `<strong>${MONTH_NAMES[state.month]} ${state.year}</strong> — ${filled}/${total} CQ (${total ? Math.round(filled / total * 100) : 0}%) — ` +
    (rejects > 0 ? `<span style="color:var(--danger)">${rejects} rigetti</span>` : '<span style="color:var(--success)">Nessun rigetto</span>');
}

async function generatePDF() {
  if (!window.jspdf?.jsPDF) { alert('jsPDF non caricato'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pw = 297, ph = 210, mx = 8, my = 8, cw = pw - 2 * mx;
  let y = my;
  const wd = getWorkingDays(state.year, state.month);
  const labName = document.getElementById('lab-name')?.value || 'Laboratorio Analisi — P.O. Giovanni Paolo I';

  function newPageIfNeeded(need) { if (y + need > ph - 15) { doc.addPage('landscape'); y = my; } }

  // ─── Header ───
  const logoImg = document.getElementById('header-preview');
  if (logoImg?.src && !logoImg.classList.contains('hidden')) {
    try { doc.addImage(logoImg.src, 'PNG', mx, y, 28, 11); } catch (e) { }
  }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(26, 82, 118);
  doc.text('REGISTRO CONTROLLO QUALITÀ INTERNO', pw / 2, y + 5, { align: 'center' });
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
  doc.text(labName, pw / 2, y + 9, { align: 'center' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(26, 82, 118);
  doc.text(MONTH_NAMES[state.month] + ' ' + state.year, pw / 2, y + 13, { align: 'center' });
  y += 16;
  doc.setDrawColor(26, 82, 118); doc.setLineWidth(0.4); doc.line(mx, y, pw - mx, y); y += 3;

  // ─── Per machine ───
  state.machines.forEach(m => {
    const active = m.tests.filter(t => t.active);
    if (!active.length) return;

    newPageIfNeeded(20);
    // Machine header
    const rgb = hexToRgb(m.color);
    doc.setFillColor(rgb.r, rgb.g, rgb.b); doc.roundedRect(mx, y, cw, 5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(255, 255, 255);
    doc.text(`${m.name} — ${m.type}  |  Lotto Cal: ${m.calLot || '—'}  |  Scad: ${m.calExpiry || '—'}`, mx + 3, y + 3.5);
    y += 7;

    // Per test
    active.forEach(t => {
      t.levels.forEach(lv => {
        newPageIfNeeded(14);

        // Test+Level header
        doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(50, 50, 50);
        doc.text(`${t.name} (${t.unit}) — Lv${lv.lv} ${lv.name} — Media: ${lv.mean} ± ${lv.sd} — Lotto QC: ${lv.lot}`, mx + 2, y + 2);
        y += 3;

        // Day header row
        doc.setFillColor(235, 240, 248); doc.rect(mx, y, cw, 3.5, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(4); doc.setTextColor(80, 80, 80);
        const dayW = (cw - 2) / wd.length;
        const dn = ['Do', 'Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa'];
        wd.forEach((d, i) => {
          doc.text(dn[d.dow], mx + 1 + i * dayW + dayW / 2, y + 1.5, { align: 'center' });
          doc.text(String(d.dayNum), mx + 1 + i * dayW + dayW / 2, y + 3, { align: 'center' });
        });
        y += 3.5;

        // Value cells
        doc.setFontSize(4.5); doc.setFont('helvetica', 'normal');
        wd.forEach((d, i) => {
          const r = getReading(m.id, t.id, lv.lv, d.date);
          const x = mx + 1 + i * dayW;
          if (r) {
            const ev = evalQC(r.value, lv.mean, lv.sd);
            if (ev.status === 'reject') { doc.setFillColor(231, 76, 60); doc.rect(x, y, dayW, 3.5, 'F'); doc.setTextColor(255, 255, 255); }
            else if (ev.status === 'warning') { doc.setFillColor(243, 156, 18); doc.rect(x, y, dayW, 3.5, 'F'); doc.setTextColor(255, 255, 255); }
            else { doc.setTextColor(30, 30, 30); }
            // Format value based on magnitude
            const fmt = Math.abs(r.value) >= 100 ? r.value.toFixed(1) : Math.abs(r.value) >= 1 ? r.value.toFixed(2) : r.value.toFixed(3);
            doc.text(fmt, x + dayW / 2, y + 2.4, { align: 'center' });
            doc.setTextColor(30, 30, 30);
          } else {
            doc.setFillColor(248, 248, 248); doc.rect(x, y, dayW, 3.5, 'F');
            doc.setTextColor(180, 180, 180); doc.text('—', x + dayW / 2, y + 2.4, { align: 'center' }); doc.setTextColor(30, 30, 30);
          }
          doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.08); doc.rect(x, y, dayW, 3.5);
        });
        y += 4;

        // Mini stats
        let cnt = 0, sum = 0, minV = Infinity, maxV = -Infinity, rej = 0;
        wd.forEach(d => { const r = getReading(m.id, t.id, lv.lv, d.date); if (r) { cnt++; sum += r.value; if (r.value < minV) minV = r.value; if (r.value > maxV) maxV = r.value; if (evalQC(r.value, lv.mean, lv.sd).status === 'reject') rej++; } });
        const cv = cnt > 1 ? (Math.sqrt(wd.reduce((s, d) => { const r = getReading(m.id, t.id, lv.lv, d.date); return r ? s + Math.pow(r.value - sum / cnt, 2) : s; }, 0) / (cnt - 1)) / (sum / cnt) * 100).toFixed(1) : '—';
        doc.setFontSize(3.8); doc.setTextColor(100, 100, 100);
        doc.text(`n=${cnt}  Min=${cnt ? minV.toFixed(2) : '—'}  Max=${cnt ? maxV.toFixed(2) : '—'}  Media=${cnt ? (sum / cnt).toFixed(2) : '—'}  CV%=${cv}  Rigetti=${rej}`, mx + 2, y + 1);
        y += 3;
      });
    });
    y += 2;
  });

  // ─── Footer ───
  newPageIfNeeded(25);
  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2); doc.line(mx, y, pw - mx, y); y += 4;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(80, 80, 80);
  doc.text('Operatore: ____________________________', mx + 10, y + 3);
  doc.text('Responsabile Qualità: ____________________________', pw / 2 + 10, y + 3);
  doc.text('Data: ' + new Date().toLocaleDateString('it-IT'), mx + 10, y + 8);

  const notes = document.getElementById('pdf-notes-qc')?.value?.trim();
  if (notes) { y += 12; doc.setFontSize(5); doc.setFont('helvetica', 'italic'); doc.setTextColor(100, 100, 100); doc.splitTextToSize('Note: ' + notes, cw - 10).slice(0, 3).forEach(l => { doc.text(l, mx + 5, y); y += 2.5; }); }

  // Westgard legend
  y += 3;
  doc.setFontSize(4); doc.setTextColor(130, 130, 130);
  doc.text('Regole Westgard: 1-2s = Warning (>±2SD), 1-3s = Reject (>±3SD). Celle rosse = rigetto, gialle = warning.', mx + 2, y);

  doc.setFontSize(4); doc.setTextColor(160, 160, 160);
  doc.text('Documento generato automaticamente — Registro CQI conforme a ISO 15189:2022', mx, ph - 5);
  doc.text('Stampato il ' + new Date().toLocaleString('it-IT'), pw - mx, ph - 5, { align: 'right' });

  doc.save('CQI_' + MONTH_NAMES[state.month] + '_' + state.year + '.pdf');
  try { saveToArchive(doc.output('datauristring'), 'CQ'); } catch (e) { }
}

/* ═══════════════════ CALIBRATION PDF ═══════════════════ */
async function generateCalibrationPDF() {
  if (!window.jspdf?.jsPDF) { alert('jsPDF non caricato'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pw = 210, ph = 297, mx = 10, my = 10, cw = pw - 2 * mx;
  let y = my;
  const ms = getMonthStr(state.year, state.month);
  const labName = document.getElementById('lab-name')?.value || 'Laboratorio Analisi — P.O. Giovanni Paolo I';

  function newPage(need) { if (y + need > ph - 18) { doc.addPage(); y = my; } }

  // ─── Header ───
  const logoImg = document.getElementById('header-preview');
  if (logoImg?.src && !logoImg.classList.contains('hidden')) {
    try { doc.addImage(logoImg.src, 'PNG', mx, y, 28, 11); } catch (e) { }
  }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(26, 82, 118);
  doc.text('REGISTRO CALIBRAZIONI', pw / 2, y + 5, { align: 'center' });
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
  doc.text(labName, pw / 2, y + 10, { align: 'center' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(26, 82, 118);
  doc.text(MONTH_NAMES[state.month] + ' ' + state.year, pw / 2, y + 15, { align: 'center' });
  y += 19;
  doc.setDrawColor(26, 82, 118); doc.setLineWidth(0.4); doc.line(mx, y, pw - mx, y); y += 4;

  // ─── Per machine ───
  state.machines.forEach(m => {
    const active = m.tests.filter(t => t.active);
    if (!active.length) return;

    newPage(30);
    // Machine header bar
    const rgb = hexToRgb(m.color);
    doc.setFillColor(rgb.r, rgb.g, rgb.b); doc.roundedRect(mx, y, cw, 7, 1, 1, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
    doc.text(`${m.name} — ${m.type}`, mx + 3, y + 4.5);
    doc.setFontSize(6.5);
    doc.text(`Lotto Cal: ${m.calLot || '—'}   Scadenza: ${m.calExpiry || '—'}`, pw - mx - 3, y + 4.5, { align: 'right' });
    y += 10;

    // Table header
    const colW = [38, 16, 28, 22, 17, 30, 17, 22];  // test, unit, level, target, ±SD, value, status, lot
    const colX = [mx]; for (let i = 1; i < colW.length; i++) colX.push(colX[i - 1] + colW[i - 1]);

    doc.setFillColor(240, 242, 248); doc.rect(mx, y, cw, 5, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(50, 50, 50);
    const headers = ['Test', 'Unità', 'Livello', 'Target', '±SD', 'Valore misurato', 'Stato', 'Lotto CQ'];
    headers.forEach((h, i) => doc.text(h, colX[i] + 1.5, y + 3.5));
    y += 5.5;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5);
    let rowIdx = 0;

    active.forEach(t => {
      t.levels.forEach((lv, li) => {
        newPage(6);
        // Zebra
        if (rowIdx % 2 === 0) { doc.setFillColor(252, 252, 255); doc.rect(mx, y, cw, 5, 'F'); }
        doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.08);
        doc.line(mx, y + 5, pw - mx, y + 5);

        const r = getCalReading(m.id, t.id, lv.lv, ms);

        // Test name (bold on first level)
        doc.setTextColor(30, 30, 30);
        if (li === 0) { doc.setFont('helvetica', 'bold'); doc.text(t.name, colX[0] + 1.5, y + 3.5); doc.setFont('helvetica', 'normal'); }
        doc.text(t.unit, colX[1] + 1.5, y + 3.5);
        doc.text(lv.name, colX[2] + 1.5, y + 3.5);
        doc.text(String(lv.mean), colX[3] + 1.5, y + 3.5);
        doc.text(String(lv.sd), colX[4] + 1.5, y + 3.5);

        if (r) {
          // Value cell with color
          const fmt = Math.abs(r.value) >= 100 ? r.value.toFixed(1) : Math.abs(r.value) >= 1 ? r.value.toFixed(2) : r.value.toFixed(3);
          if (r.passed === 'fail') {
            doc.setFillColor(231, 76, 60); doc.rect(colX[5], y, colW[5], 5, 'F');
            doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
            doc.text(fmt, colX[5] + 1.5, y + 3.5);
            doc.setTextColor(231, 76, 60);
            doc.text('FAIL', colX[6] + 1.5, y + 3.5);
          } else if (r.passed === 'warning') {
            doc.setFillColor(243, 156, 18); doc.rect(colX[5], y, colW[5], 5, 'F');
            doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
            doc.text(fmt, colX[5] + 1.5, y + 3.5);
            doc.setTextColor(243, 156, 18);
            doc.text('WARN', colX[6] + 1.5, y + 3.5);
          } else {
            doc.setTextColor(39, 174, 96); doc.setFont('helvetica', 'bold');
            doc.text(fmt, colX[5] + 1.5, y + 3.5);
            doc.text('PASS', colX[6] + 1.5, y + 3.5);
          }
          doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
        } else {
          doc.setTextColor(180, 180, 180);
          doc.text('—', colX[5] + 1.5, y + 3.5);
          doc.text('—', colX[6] + 1.5, y + 3.5);
          doc.setTextColor(30, 30, 30);
        }
        // Lot
        doc.setFontSize(4.5); doc.setTextColor(120, 120, 120);
        doc.text(lv.lot || '—', colX[7] + 1.5, y + 3.5);
        doc.setFontSize(5.5); doc.setTextColor(30, 30, 30);

        y += 5;
        rowIdx++;
      });
      // Separator between tests
      y += 0.5;
    });

    // Machine summary
    newPage(10);
    const calSt = getCalibrationStatus(m.id, state.year, state.month);
    doc.setFillColor(245, 248, 250); doc.roundedRect(mx, y, cw, 8, 1, 1, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(80, 80, 80);
    doc.text(`Riepilogo ${m.name}:`, mx + 3, y + 3.5);
    doc.setFont('helvetica', 'normal');
    const sumParts = [];
    sumParts.push(`Totale: ${calSt.total}`);
    sumParts.push(`Eseguiti: ${calSt.done}`);
    if (calSt.pass) sumParts.push(`Pass: ${calSt.pass}`);
    if (calSt.warn) sumParts.push(`Warning: ${calSt.warn}`);
    if (calSt.fail) sumParts.push(`Fail: ${calSt.fail}`);
    if (calSt.missing) sumParts.push(`Mancanti: ${calSt.missing}`);
    const pctOk = calSt.total ? Math.round(calSt.pass / calSt.total * 100) : 0;
    sumParts.push(`Conformità: ${pctOk}%`);
    doc.text(sumParts.join('   |   '), mx + 3, y + 6.5);
    y += 11;
  });

  // ─── Global summary ───
  newPage(22);
  doc.setDrawColor(26, 82, 118); doc.setLineWidth(0.3); doc.line(mx, y, pw - mx, y); y += 4;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(26, 82, 118);
  doc.text('RIEPILOGO GENERALE CALIBRAZIONI', mx, y + 3); y += 6;

  let gTotal = 0, gDone = 0, gPass = 0, gWarn = 0, gFail = 0;
  state.machines.forEach(m => {
    const st = getCalibrationStatus(m.id, state.year, state.month);
    gTotal += st.total; gDone += st.done; gPass += st.pass; gWarn += st.warn; gFail += st.fail;
  });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(50, 50, 50);
  doc.text(`Test totali: ${gTotal}    Calibrati: ${gDone}    Pass: ${gPass}    Warning: ${gWarn}    Fail: ${gFail}    Mancanti: ${gTotal - gDone}`, mx + 5, y);
  y += 5;
  const gpct = gTotal ? Math.round(gPass / gTotal * 100) : 0;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.setTextColor(gFail > 0 ? 231 : 39, gFail > 0 ? 76 : 174, gFail > 0 ? 60 : 96);
  doc.text(`Conformità globale: ${gpct}%` + (gFail > 0 ? ` — ${gFail} CALIBRAZIONI FALLITE` : ' — TUTTE CONFORMI'), mx + 5, y + 1);
  y += 8;

  // ─── Signatures ───
  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2); doc.line(mx, y, pw - mx, y); y += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(80, 80, 80);
  doc.text('Operatore: ____________________________', mx + 5, y);
  doc.text('Data: ' + new Date().toLocaleDateString('it-IT'), pw / 2 + 10, y);
  y += 7;
  doc.text('Responsabile Qualità: ____________________________', mx + 5, y);

  const notes = document.getElementById('pdf-notes-qc')?.value?.trim();
  if (notes) { y += 8; doc.setFontSize(5.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(100, 100, 100); doc.splitTextToSize('Note: ' + notes, cw - 10).slice(0, 4).forEach(l => { doc.text(l, mx + 5, y); y += 3; }); }

  // Legend
  y += 4;
  doc.setFontSize(4.5); doc.setTextColor(130, 130, 130);
  doc.text('Criteri accettabilità: PASS = entro ±2SD dal target, WARNING = tra 2-3SD, FAIL = oltre ±3SD. Frequenza: mensile.', mx + 2, y);

  // Footer
  doc.setFontSize(4); doc.setTextColor(160, 160, 160);
  doc.text('Documento generato automaticamente — Registro Calibrazioni conforme a ISO 15189:2022', mx, ph - 6);
  doc.text('Stampato il ' + new Date().toLocaleString('it-IT'), pw - mx, ph - 6, { align: 'right' });

  doc.save('CALIBRAZIONI_' + MONTH_NAMES[state.month] + '_' + state.year + '.pdf');
  try { saveToArchive(doc.output('datauristring'), 'CAL'); } catch (e) { }
}

function renderCalPdfPreview() {
  const el = document.getElementById('cal-pdf-preview-info'); if (!el) return;
  const ms = getMonthStr(state.year, state.month);
  let total = 0, done = 0, fails = 0;
  state.machines.forEach(m => { m.tests.filter(t => t.active).forEach(t => { t.levels.forEach(lv => {
    total++;
    const r = getCalReading(m.id, t.id, lv.lv, ms);
    if (r) { done++; if (r.passed === 'fail') fails++; }
  }); }); });
  el.innerHTML = `<strong>${MONTH_NAMES[state.month]} ${state.year}</strong> — ${done}/${total} calibrate (${total ? Math.round(done / total * 100) : 0}%) — ` +
    (fails > 0 ? `<span style="color:var(--danger)">${fails} fallite</span>` : '<span style="color:var(--success)">Tutte conformi</span>');
}

function hexToRgb(hex) { return { r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) }; }

/* ── Archive ── */
function saveToArchive(pdfData, type) {
  try {
    const ar = JSON.parse(localStorage.getItem('qclab_archive') || '[]');
    ar.unshift({ id: Date.now().toString(36), month: state.month, year: state.year, type: type || 'CQ', label: MONTH_NAMES[state.month] + ' ' + state.year, timestamp: new Date().toISOString(), pdfData });
    if (ar.length > 24) ar.length = 24;
    localStorage.setItem('qclab_archive', JSON.stringify(ar));
    renderArchive();
  } catch (e) { }
}
function renderArchive() {
  const el = document.getElementById('archive-list'); if (!el) return;
  try {
    const ar = JSON.parse(localStorage.getItem('qclab_archive') || '[]');
    if (!ar.length) { el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Nessun report archiviato</div>'; return; }
    el.innerHTML = ar.map(a => {
      const badge = a.type === 'CAL'
        ? '<span style="display:inline-block;padding:1px 6px;border-radius:4px;background:var(--warning-pale);color:var(--warning);font-size:10px;font-weight:600">📏 CAL</span>'
        : '<span style="display:inline-block;padding:1px 6px;border-radius:4px;background:var(--primary-pale);color:var(--primary);font-size:10px;font-weight:600">🧪 CQ</span>';
      return `<div class="archive-item">${badge} <span>${a.label}</span><span style="color:var(--text-muted);font-size:12px">${new Date(a.timestamp).toLocaleDateString('it-IT')}</span><button class="btn btn-sm btn-outline" onclick="dlArchive('${a.id}')">📄 Scarica</button></div>`;
    }).join('');
  } catch (e) { el.innerHTML = ''; }
}
function dlArchive(id) {
  try {
    const ar = JSON.parse(localStorage.getItem('qclab_archive') || '[]');
    const r = ar.find(a => a.id === id); if (!r?.pdfData) { alert('PDF non disponibile'); return; }
    const prefix = r.type === 'CAL' ? 'CALIBRAZIONI_' : 'CQI_';
    const a = document.createElement('a'); a.href = r.pdfData; a.download = prefix + r.label.replace(/\s/g, '_') + '.pdf';
    document.body.appendChild(a); a.click(); setTimeout(() => document.body.removeChild(a), 100);
  } catch (e) { }
}
