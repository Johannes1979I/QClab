/* pdf-generator.js — report PDF mensili (CQ e calibrazioni) + archivio nel browser */

const DEFAULT_LAB_NAME='Laboratorio Analisi — P.O. Giovanni Paolo I';
function getLabName(){return (document.getElementById('lab-name')?.value||'').trim()||DEFAULT_LAB_NAME;}
/* il nome del laboratorio prima si perdeva a ogni apertura della pagina */
function saveLabName(v){try{localStorage.setItem('qclab_labname',String(v||'').trim());}catch(e){}}
function loadLabName(){try{const v=localStorage.getItem('qclab_labname');if(v){const el=document.getElementById('lab-name');if(el)el.value=v;}}catch(e){}}

/* jsPDF con i caratteri standard conosce solo l'alfabeto latino: gli altri simboli uscivano come segni strani */
function pdfText(s){
  return String(s==null?'':s)
    .replace(/[⁰¹²³⁴-⁹]/g,ch=>'^'+({'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9'})[ch])
    .replace(/[–—]/g,'-').replace(/[‘’]/g,"'").replace(/[“”«»]/g,'"').replace(/…/g,'...')
    .replace(/→/g,'->').replace(/[^\x00-\xff]/g,'');
}
function fmtVal(v){return Math.abs(v)>=100?v.toFixed(1):Math.abs(v)>=1?v.toFixed(2):v.toFixed(3);}

function renderPdfPreview() {
  const el = document.getElementById('pdf-preview-info'); if (!el) return;
  const wd = getWorkingDays(state.year, state.month);
  let total = 0, filled = 0, rejects = 0, warns = 0;
  state.machines.forEach(m => { m.tests.filter(t => t.active).forEach(t => { t.levels.forEach(lv => {
    const x = qcTally(m.id, t, lv, wd);
    total += wd.length; filled += wd.length - x.missing; rejects += x.reject; warns += x.warn;
  }); }); });
  el.innerHTML = `<strong>CQ ${MONTH_NAMES[state.month]} ${state.year}</strong> — ${filled}/${total} valori (${total ? Math.round(filled / total * 100) : 0}%) — ` +
    (rejects > 0 ? `<span style="color:var(--danger);font-weight:600">${rejects} rigetti</span>` : '<span style="color:var(--success);font-weight:600">nessun rigetto</span>') +
    (warns ? ` — ${warns} avvisi 1-2s` : '');
}

/* logo: formato dal contenuto (prima un JPEG dichiarato PNG faceva sparire il logo) e proporzioni rispettate */
function addLogo(doc, x, y, maxW, maxH) {
  const img = document.getElementById('header-preview');
  if (!img?.src || img.classList.contains('hidden') || !img.src.startsWith('data:image')) return;
  try {
    const fmt = /^data:image\/jpe?g/i.test(img.src) ? 'JPEG' : 'PNG';
    const r = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : maxW / maxH;
    let w = maxW, h = w / r; if (h > maxH) { h = maxH; w = h * r; }
    doc.addImage(img.src, fmt, x, y, w, h);
  } catch (e) { console.warn('Logo non inserito nel PDF:', e); }
}

async function generatePDF() {
  if (!window.jspdf?.jsPDF) { alert('❌ Libreria PDF non caricata: ricarica la pagina.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pw = 297, ph = 210, mx = 8, my = 8, cw = pw - 2 * mx;
  let y = my;
  const wd = getWorkingDays(state.year, state.month);
  const labName = getLabName();

  function newPageIfNeeded(need) { if (y + need > ph - 15) { doc.addPage('a4', 'landscape'); y = my; } }

  // ─── Intestazione ───
  addLogo(doc, mx, y, 28, 11);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(26, 82, 118);
  doc.text('REGISTRO CONTROLLO QUALITÀ INTERNO', pw / 2, y + 5, { align: 'center' });
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
  doc.text(pdfText(labName), pw / 2, y + 9, { align: 'center' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(26, 82, 118);
  doc.text(MONTH_NAMES[state.month] + ' ' + state.year, pw / 2, y + 13, { align: 'center' });
  y += 16;
  doc.setDrawColor(26, 82, 118); doc.setLineWidth(0.4); doc.line(mx, y, pw - mx, y); y += 3;

  // ─── Per analizzatore ───
  state.machines.forEach(m => {
    const active = m.tests.filter(t => t.active);
    if (!active.length) return;

    newPageIfNeeded(20);
    const rgb = hexToRgb(safeColor(m.color));
    doc.setFillColor(rgb.r, rgb.g, rgb.b); doc.roundedRect(mx, y, cw, 5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(255, 255, 255);
    doc.text(pdfText(`${m.name} - ${m.type}  |  Lotto Cal: ${m.calLot || '-'}  |  Scad: ${m.calExpiry ? fmtDateIt(m.calExpiry) : '-'}`), mx + 3, y + 3.5);
    y += 7;

    active.forEach(t => {
      t.levels.forEach(lv => {
        newPageIfNeeded(14);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(50, 50, 50);
        doc.text(pdfText(`${t.name} (${t.unit}) - Lv${lv.lv} ${lv.name} - Media: ${lv.mean} ± ${lv.sd} - Lotto CQ: ${lv.lot}`), mx + 2, y + 2);
        y += 3;

        // giorni
        doc.setFillColor(235, 240, 248); doc.rect(mx, y, cw, 3.5, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(4); doc.setTextColor(80, 80, 80);
        const dayW = (cw - 2) / Math.max(1, wd.length);
        const dn = ['Do', 'Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa'];
        wd.forEach((d, i) => {
          doc.text(dn[d.dow], mx + 1 + i * dayW + dayW / 2, y + 1.5, { align: 'center' });
          doc.text(String(d.dayNum), mx + 1 + i * dayW + dayW / 2, y + 3, { align: 'center' });
        });
        y += 3.5;

        // valori (colore secondo le regole di Westgard)
        doc.setFontSize(4.5); doc.setFont('helvetica', 'normal');
        const vals = []; let rej = 0, wrn = 0; const regole = new Set();
        wd.forEach((d, i) => {
          const r = getReading(m.id, t.id, lv.lv, d.date);
          const x = mx + 1 + i * dayW;
          if (r && r.value != null && !isNaN(r.value)) {
            vals.push(r.value);
            const ev = evalQCMulti(m.id, t, lv, d.date);
            if (ev.status === 'reject') { rej++; ev.rules.forEach(x2 => regole.add(x2)); doc.setFillColor(231, 76, 60); doc.rect(x, y, dayW, 3.5, 'F'); doc.setTextColor(255, 255, 255); }
            else if (ev.status === 'warning') { wrn++; doc.setFillColor(243, 156, 18); doc.rect(x, y, dayW, 3.5, 'F'); doc.setTextColor(255, 255, 255); }
            else { doc.setTextColor(30, 30, 30); }
            doc.text(fmtVal(r.value), x + dayW / 2, y + 2.4, { align: 'center' });
            doc.setTextColor(30, 30, 30);
          } else {
            doc.setFillColor(248, 248, 248); doc.rect(x, y, dayW, 3.5, 'F');
            doc.setTextColor(180, 180, 180); doc.text('-', x + dayW / 2, y + 2.4, { align: 'center' }); doc.setTextColor(30, 30, 30);
          }
          doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.08); doc.rect(x, y, dayW, 3.5);
        });
        y += 4;

        // statistiche del mese
        const s = qcStats(vals);
        const f2 = v => v == null ? '-' : v.toFixed(Math.abs(v) >= 100 ? 1 : Math.abs(v) >= 1 ? 2 : 3);
        doc.setFontSize(3.8); doc.setTextColor(100, 100, 100);
        doc.text(`n=${s.n}  Min=${s.n ? f2(s.min) : '-'}  Max=${s.n ? f2(s.max) : '-'}  Media=${s.n ? f2(s.mean) : '-'}  DS=${s.sd != null && s.n ? f2(s.sd) : '-'}  CV%=${s.cv != null ? s.cv.toFixed(1) : '-'}  Avvisi 1-2s=${wrn}  Rigetti=${rej}${regole.size ? ' (' + [...regole].join(', ') + ')' : ''}`, mx + 2, y + 1);
        y += 3;
      });
    });
    y += 2;
  });

  // ─── Firme ───
  newPageIfNeeded(25);
  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2); doc.line(mx, y, pw - mx, y); y += 4;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(80, 80, 80);
  doc.text('Operatore: ____________________________', mx + 10, y + 3);
  doc.text('Responsabile Qualità: ____________________________', pw / 2 + 10, y + 3);
  doc.text('Data: ' + new Date().toLocaleDateString('it-IT'), mx + 10, y + 8);

  const notes = document.getElementById('pdf-notes-qc')?.value?.trim();
  if (notes) { y += 12; doc.setFontSize(5); doc.setFont('helvetica', 'italic'); doc.setTextColor(100, 100, 100); doc.splitTextToSize(pdfText('Note: ' + notes), cw - 10).slice(0, 3).forEach(l => { doc.text(l, mx + 5, y); y += 2.5; }); }

  y += 3;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(4); doc.setTextColor(130, 130, 130);
  doc.text('Regole di Westgard: 1-2s = avviso (oltre ±2DS); rigetto = 1-3s (oltre ±3DS), 2-2s (2 valori oltre 2DS dalla stessa parte: giorno precedente o altro livello), R-4s (stesso giorno un livello oltre +2DS e uno oltre -2DS),', mx + 2, y);
  doc.text('4-1s (4 valori consecutivi oltre 1DS dalla stessa parte), 10x (10 valori consecutivi dalla stessa parte della media). Celle rosse = rigetto, arancioni = avviso. DS e CV% del mese calcolati su n-1.', mx + 2, y + 2);

  stampaPiede(doc, pw, ph, mx, 'Documento generato automaticamente - Registro CQI conforme a ISO 15189:2022');
  const nome = 'CQI_' + MONTH_NAMES[state.month] + '_' + state.year + '.pdf';
  doc.save(nome);
  // DOGMA: il PDF e' gia' scaricato; l'archivio e' un di piu'
  try { saveToArchive(doc.output('datauristring'), 'CQ'); } catch (e) { console.warn('Archivio:', e); }
}

/* numero di pagina e data di stampa su tutte le pagine (prima solo sull'ultima) */
function stampaPiede(doc, pw, ph, mx, testo) {
  const n = doc.getNumberOfPages(), quando = 'Stampato il ' + new Date().toLocaleString('it-IT');
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(4.5); doc.setTextColor(160, 160, 160);
    doc.text(testo, mx, ph - 5);
    doc.text(quando + '  -  pagina ' + i + ' di ' + n, pw - mx, ph - 5, { align: 'right' });
  }
}

function hexToRgb(hex) { const h = safeColor(hex, '#2980b9'); return { r: parseInt(h.slice(1, 3), 16) || 0, g: parseInt(h.slice(3, 5), 16) || 0, b: parseInt(h.slice(5, 7), 16) || 0 }; }

/* ── Archivio (localStorage, ultimi 24) ── */
function saveToArchive(pdfData, type) {
  let ar = [];
  try { ar = JSON.parse(localStorage.getItem('qclab_archive') || '[]'); if (!Array.isArray(ar)) ar = []; } catch (e) { ar = []; }
  ar.unshift({ id: Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36), month: state.month, year: state.year, type: type || 'CQ', label: MONTH_NAMES[state.month] + ' ' + state.year, timestamp: new Date().toISOString(), pdfData });
  if (ar.length > 24) ar.length = 24;
  // memoria piena: si tolgono i piu' vecchi; prima l'errore era ignorato e il report spariva senza avviso
  let tolti = 0;
  while (ar.length) {
    try { localStorage.setItem('qclab_archive', JSON.stringify(ar)); break; }
    catch (e) { if (ar.length === 1) { ar = []; break; } ar.pop(); tolti++; }
  }
  if (!ar.length) uiToast('PDF scaricato, ma non archiviato: la memoria del browser è piena.', 'warn', 8000);
  else if (tolti) uiToast('PDF archiviato; tolti ' + tolti + ' report vecchi per fare spazio.', 'info');
  renderArchive();
}
function renderArchive() {
  const el = document.getElementById('archive-list'); if (!el) return;
  let ar = [];
  try { ar = JSON.parse(localStorage.getItem('qclab_archive') || '[]'); } catch (e) { ar = []; }
  if (!Array.isArray(ar) || !ar.length) { el.innerHTML = '<div class="empty-msg">Nessun report archiviato</div>'; return; }
  el.innerHTML = '<div class="archive-list">' + ar.map(a => {
    const badge = a.type === 'CAL'
      ? '<span class="badge badge-cal"><i data-lucide="ruler"></i>CAL</span>'
      : '<span class="badge badge-cq"><i data-lucide="flask-conical"></i>CQ</span>';
    const quando = a.timestamp ? new Date(a.timestamp).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    return `<div class="archive-item">${badge}<span class="ai-label">${escHtml(a.label)}</span><span class="ai-date">${escHtml(quando)}</span>
      <button class="btn btn-sm btn-outline" onclick="dlArchive('${escJs(a.id)}')"><i data-lucide="download"></i>Scarica</button>
      <button class="btn-remove" title="Elimina dall'archivio" aria-label="Elimina" onclick="delArchive('${escJs(a.id)}')"><i data-lucide="trash-2"></i></button></div>`;
  }).join('') + '</div>';
}
function dlArchive(id) {
  try {
    const ar = JSON.parse(localStorage.getItem('qclab_archive') || '[]');
    const r = ar.find(a => a.id === id); if (!r?.pdfData) { alert('PDF non disponibile'); return; }
    const prefix = r.type === 'CAL' ? 'CALIBRAZIONI_' : 'CQI_';
    const a = document.createElement('a'); a.href = r.pdfData; a.download = prefix + String(r.label).replace(/\s/g, '_') + '.pdf';
    document.body.appendChild(a); a.click(); setTimeout(() => document.body.removeChild(a), 100);
  } catch (e) { alert('❌ Errore nel recupero del PDF: ' + e.message); }
}
async function delArchive(id) {
  if (!await uiConfirm('Eliminare questo report dall\'archivio del browser?')) return;
  try {
    const ar = JSON.parse(localStorage.getItem('qclab_archive') || '[]').filter(a => a.id !== id);
    localStorage.setItem('qclab_archive', JSON.stringify(ar));
  } catch (e) { alert('❌ Errore: ' + e.message); }
  renderArchive();
}
