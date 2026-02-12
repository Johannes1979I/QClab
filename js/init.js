/* init.js — Startup */
function init() {
  loadData();
  renderMonthSelector();
  renderDashboard();
  renderSettings();
  loadLogo();
}
window.addEventListener('load', () => {
  setTimeout(() => {
    const el = document.getElementById('lib-status'); if (!el) return;
    const ok = typeof Chart !== 'undefined' && window.jspdf?.jsPDF;
    el.innerHTML = ok
      ? '<div style="padding:8px 14px;background:var(--success-pale);border-radius:8px;font-size:12px;color:var(--success)">✅ Chart.js + jsPDF pronti</div>'
      : '<div style="padding:8px 14px;background:var(--warning-pale);border-radius:8px;font-size:12px;color:var(--warning)">⚠️ Librerie in caricamento…</div>';
  }, 1500);
});
init();
