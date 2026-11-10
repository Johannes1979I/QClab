/* pdf-calibration.js — report PDF delle calibrazioni del mese */

async function generateCalibrationPDF() {
  if (!window.jspdf?.jsPDF) { alert('❌ Libreria PDF non caricata: ricarica la pagina.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pw = 210, ph = 297, mx = 10, my = 10, cw = pw - 2 * mx;
  let y = my;
  const ms = getMonthStr(state.year, state.month);
  const labName = getLabName();

  function newPage(need) { if (y + need > ph - 18) { doc.addPage(); y = my; } }

  addLogo(doc, mx, y, 28, 11);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(26, 82, 118);
  doc.text('REGISTRO CALIBRAZIONI', pw / 2, y + 5, { align: 'center' });
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
  doc.text(pdfText(labName), pw / 2, y + 10, { align: 'center' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(26, 82, 118);
  doc.text(MONTH_NAMES[state.month] + ' ' + state.year, pw / 2, y + 15, { align: 'center' });
  y += 19;
  doc.setDrawColor(26, 82, 118); doc.setLineWidth(0.4); doc.line(mx, y, pw - mx, y); y += 4;

  const colW = [38, 16, 28, 22, 17, 30, 17, 22];  // test, unita', livello, target, ±DS, valore, stato, lotto
  const colX = [mx]; for (let i = 1; i < colW.length; i++) colX.push(colX[i - 1] + colW[i - 1]);
  const headers = ['Test', 'Unità', 'Livello', 'Target', '±DS', 'Valore misurato', 'Stato', 'Lotto CQ'];
  const fit = (s, w) => { s = pdfText(s); while (s.length > 1 && doc.getTextWidth(s) > w - 2) s = s.slice(0, -1); return s; };

  state.machines.forEach(m => {
    const active = m.tests.filter(t => t.active);
    if (!active.length) return;

    newPage(30);
    const rgb = hexToRgb(m.color);
    doc.setFillColor(rgb.r, rgb.g, rgb.b); doc.roundedRect(mx, y, cw, 7, 1, 1, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
    doc.text(pdfText(`${m.name} - ${m.type}`), mx + 3, y + 4.5);
    doc.setFontSize(6.5);
    doc.text(pdfText(`Lotto Cal: ${m.calLot || '-'}   Scadenza: ${m.calExpiry ? fmtDateIt(m.calExpiry) : '-'}`), pw - mx - 3, y + 4.5, { align: 'right' });
    y += 10;

    const intestazione = () => {
      doc.setFillColor(240, 242, 248); doc.rect(mx, y, cw, 5, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(50, 50, 50);
      headers.forEach((h, i) => doc.text(h, colX[i] + 1.5, y + 3.5));
      y += 5.5;
    };
    intestazione();
    doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5);
    let rowIdx = 0;

    active.forEach(t => {
      t.levels.forEach((lv, li) => {
        if (y + 6 > ph - 18) { doc.addPage(); y = my; intestazione(); doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); }
        if (rowIdx % 2 === 0) { doc.setFillColor(252, 252, 255); doc.rect(mx, y, cw, 5, 'F'); }
        doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.08);
        doc.line(mx, y + 5, pw - mx, y + 5);

        const r = getCalReading(m.id, t.id, lv.lv, ms);
        doc.setTextColor(30, 30, 30);
        if (li === 0) { doc.setFont('helvetica', 'bold'); doc.text(fit(t.name, colW[0]), colX[0] + 1.5, y + 3.5); doc.setFont('helvetica', 'normal'); }
        doc.text(fit(t.unit, colW[1]), colX[1] + 1.5, y + 3.5);
        doc.text(fit(lv.name, colW[2]), colX[2] + 1.5, y + 3.5);
        doc.text(String(lv.mean), colX[3] + 1.5, y + 3.5);
        doc.text(String(lv.sd), colX[4] + 1.5, y + 3.5);

        if (r && r.value != null && !isNaN(r.value)) {
          const fmt = fmtVal(r.value);
          if (r.passed === 'fail' || r.passed === 'warning') {
            const c = r.passed === 'fail' ? [231, 76, 60] : [243, 156, 18];
            doc.setFillColor(c[0], c[1], c[2]); doc.rect(colX[5], y, colW[5], 5, 'F');
            doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
            doc.text(fmt, colX[5] + 1.5, y + 3.5);
            doc.setTextColor(c[0], c[1], c[2]);
            doc.text(r.passed === 'fail' ? 'FAIL' : 'WARN', colX[6] + 1.5, y + 3.5);
          } else if (r.passed === 'pass') {
            doc.setTextColor(39, 174, 96); doc.setFont('helvetica', 'bold');
            doc.text(fmt, colX[5] + 1.5, y + 3.5);
            doc.text('PASS', colX[6] + 1.5, y + 3.5);
          } else {
            doc.text(fmt, colX[5] + 1.5, y + 3.5);
            doc.text('?', colX[6] + 1.5, y + 3.5);
          }
          doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
        } else {
          doc.setTextColor(180, 180, 180);
          doc.text('-', colX[5] + 1.5, y + 3.5);
          doc.text('-', colX[6] + 1.5, y + 3.5);
          doc.setTextColor(30, 30, 30);
        }
        doc.setFontSize(4.5); doc.setTextColor(120, 120, 120);
        doc.text(fit(lv.lot || '-', colW[7]), colX[7] + 1.5, y + 3.5);
        doc.setFontSize(5.5); doc.setTextColor(30, 30, 30);

        y += 5;
        rowIdx++;
      });
      y += 0.5;
    });

    newPage(10);
    const calSt = getCalibrationStatus(m.id, state.year, state.month);
    doc.setFillColor(245, 248, 250); doc.roundedRect(mx, y, cw, 8, 1, 1, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(80, 80, 80);
    doc.text(pdfText(`Riepilogo ${m.name}:`), mx + 3, y + 3.5);
    doc.setFont('helvetica', 'normal');
    const sumParts = [`Totale: ${calSt.total}`, `Eseguiti: ${calSt.done}`];
    if (calSt.pass) sumParts.push(`Pass: ${calSt.pass}`);
    if (calSt.warn) sumParts.push(`Warning: ${calSt.warn}`);
    if (calSt.fail) sumParts.push(`Fail: ${calSt.fail}`);
    if (calSt.missing) sumParts.push(`Mancanti: ${calSt.missing}`);
    sumParts.push(`Conformità: ${calSt.total ? Math.round(calSt.pass / calSt.total * 100) : 0}%`);
    doc.text(sumParts.join('   |   '), mx + 3, y + 6.5);
    y += 11;
  });

  newPage(40);
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
  // «tutte conformi» solo se davvero tutte eseguite e conformi (prima bastava che non ci fossero FAIL)
  const esito = gFail > 0 ? ` - ${gFail} CALIBRAZIONI FALLITE` : gWarn > 0 ? ` - ${gWarn} IN AVVISO (2-3 DS)` : gDone < gTotal ? ` - ${gTotal - gDone} MANCANTI` : ' - TUTTE CONFORMI';
  const rosso = gFail > 0, arancio = !rosso && (gWarn > 0 || gDone < gTotal);
  doc.setTextColor(rosso ? 231 : arancio ? 201 : 39, rosso ? 76 : arancio ? 138 : 174, rosso ? 60 : arancio ? 0 : 96);
  doc.text(`Conformità globale: ${gpct}%` + esito, mx + 5, y + 1);
  y += 8;

  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2); doc.line(mx, y, pw - mx, y); y += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(80, 80, 80);
  doc.text('Operatore: ____________________________', mx + 5, y);
  doc.text('Data: ' + new Date().toLocaleDateString('it-IT'), pw / 2 + 10, y);
  y += 7;
  doc.text('Responsabile Qualità: ____________________________', mx + 5, y);

  const notes = document.getElementById('pdf-notes-qc')?.value?.trim();
  if (notes) { y += 8; doc.setFontSize(5.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(100, 100, 100); doc.splitTextToSize(pdfText('Note: ' + notes), cw - 10).slice(0, 4).forEach(l => { doc.text(l, mx + 5, y); y += 3; }); }

  y += 4;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(4.5); doc.setTextColor(130, 130, 130);
  doc.text('Criteri di accettabilità: PASS = entro ±2DS dal target, WARNING = tra 2 e 3 DS, FAIL = oltre ±3DS. Frequenza: mensile.', mx + 2, y);

  stampaPiede(doc, pw, ph, mx, 'Documento generato automaticamente - Registro Calibrazioni conforme a ISO 15189:2022');
  doc.save('CALIBRAZIONI_' + MONTH_NAMES[state.month] + '_' + state.year + '.pdf');
  try { saveToArchive(doc.output('datauristring'), 'CAL'); } catch (e) { console.warn('Archivio:', e); }
}

function renderCalPdfPreview() {
  const el = document.getElementById('cal-pdf-preview-info'); if (!el) return;
  let total = 0, done = 0, fails = 0, warns = 0;
  state.machines.forEach(m => { const st = getCalibrationStatus(m.id, state.year, state.month); total += st.total; done += st.done; fails += st.fail; warns += st.warn; });
  el.innerHTML = `<strong>Calibrazioni ${MONTH_NAMES[state.month]} ${state.year}</strong> — ${done}/${total} eseguite (${total ? Math.round(done / total * 100) : 0}%) — ` +
    (fails > 0 ? `<span style="color:var(--danger);font-weight:600">${fails} fallite</span>`
      : done < total ? `<span style="color:var(--text-muted);font-weight:600">${total - done} mancanti</span>`
      : warns ? `<span style="color:var(--warning);font-weight:600">${warns} in avviso</span>`
      : '<span style="color:var(--success);font-weight:600">tutte conformi</span>');
}
