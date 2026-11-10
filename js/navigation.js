/* navigation.js — sezioni del programma e barra in alto (titolo + percorso) in stile EM */
const SECTION_TITLES={dashboard:'Dashboard',data:'Inserimento CQ',calibration:'Calibrazioni',
  charts:'Grafici Levey-Jennings',pdf:'Report PDF',settings:'Impostazioni'};
let currentSection='dashboard';
function showSection(id){
  if(!SECTION_TITLES[id])id='dashboard';
  currentSection=id;
  document.querySelectorAll('.main-section').forEach(el=>el.classList.add('hidden'));
  document.getElementById('section-'+id)?.classList.remove('hidden');
  document.querySelectorAll('.nav-item[data-section]').forEach(b=>b.classList.toggle('active',b.dataset.section===id));
  const t=document.getElementById('topbar-title');if(t)t.textContent=SECTION_TITLES[id];
  const c=document.getElementById('topbar-crumb');if(c)c.textContent=SECTION_TITLES[id];
  document.title=SECTION_TITLES[id]+' — Registro CQI';
  try{if(location.hash!=='#'+id)history.replaceState(null,'','#'+id);}catch(e){}
  if(typeof toggleNav==='function')toggleNav(false);
  window.scrollTo(0,0);
  const run=fn=>{try{fn();}catch(e){console.error(e);alert('❌ Errore nel caricamento della sezione: '+e.message);}};
  if(id==='dashboard')run(renderDashboard);
  if(id==='data')run(renderDataGrid);
  if(id==='calibration')run(renderCalibrationGrid);
  if(id==='charts')setTimeout(()=>run(renderAllCharts),50);
  if(id==='pdf')run(()=>{renderPdfPreview();renderCalPdfPreview();renderArchive();});
  if(id==='settings')run(renderSettings);
}
function refreshCurrentSection(){showSection(currentSection);}
