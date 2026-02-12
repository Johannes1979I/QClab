/* navigation.js */
function showSection(id){
  document.querySelectorAll('[id^="section-"]').forEach(el=>el.classList.add('hidden'));
  document.getElementById('section-'+id)?.classList.remove('hidden');
  document.querySelectorAll('.section-tab').forEach((b,i)=>b.classList.remove('active'));
  const map={dashboard:0,data:1,charts:2,pdf:3,settings:4};
  document.querySelectorAll('.section-tab')[map[id]]?.classList.add('active');
  if(id==='dashboard') renderDashboard();
  if(id==='data') renderDataGrid();
  if(id==='charts') setTimeout(renderAllCharts,100);
  if(id==='pdf'){renderPdfPreview();renderArchive();}
  if(id==='settings') renderSettings();
}
