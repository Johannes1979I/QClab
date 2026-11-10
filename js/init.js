/* init.js — avvio */
function init() {
  loadData();
  renderMonthSelector();
  loadLogo();
  loadLabName();
  fillMonthSelects();
  const h = (location.hash || '').slice(1);
  showSection(SECTION_TITLES[h] ? h : 'dashboard');
}
function libStatus() {
  const el = document.getElementById('lib-status'); if (!el) return;
  const ok = typeof Chart !== 'undefined' && window.jspdf?.jsPDF;
  el.innerHTML = ok ? ''
    : '<div class="info-box warn">⚠️ Le librerie per grafici e PDF non sono state caricate: ricarica la pagina.</div>';
}
window.addEventListener('load', libStatus);
init();
