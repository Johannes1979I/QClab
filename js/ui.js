/* ui.js — finestre, avvisi, icone e menu in stile EndlessMed (10/11/2026).
   Caricato PRIMA degli altri script: definisce funzioni globali usate ovunque.
   - escHtml(s)              testo sicuro dentro innerHTML e dentro gli attributi fra virgolette
   - escJs(s)                testo sicuro dentro un onclick="f('...')"
   - uiToast(msg,tipo)       avviso breve in basso a destra (ok | err | warn | info)
   - uiConfirm(msg,opz)      conferma: Promise<boolean>   (opz: {danger, ok, cancel, title})
   - uiPrompt(msg,def,opz)   richiesta di un testo: Promise<string|null>
   - alert()                 sostituito: gli esiti positivi diventano toast, gli altri una finestra EM
   - toggleNav()             menu laterale su tablet/telefono
   - localDateStr(d)         data AAAA-MM-GG nel fuso del PC (toISOString usa UTC: dopo mezzanotte sbaglia giorno)
   Le emoji all'inizio di pulsanti e titoli diventano icone Lucide (stesse icone del LIS e di EM). */

function escHtml(s){
  return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function escJs(s){
  // per stringhe JS fra apici singoli dentro un attributo HTML fra virgolette doppie
  return String(s==null?'':s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\r?\n/g,'\\n').replace(/"/g,'&quot;').replace(/</g,'\\x3c');
}
function localDateStr(d){
  d=d||new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
/* colore sicuro per style="…" (i colori arrivano dai dati salvati o importati) */
function safeColor(c,def){return /^#[0-9a-f]{3,8}$/i.test(String(c||''))?c:(def||'#2f80ed');}

/* ── Avvisi brevi ── */
function uiToast(msg,tipo,durataMs){
  tipo=tipo||'info';
  let wrap=document.querySelector('.ui-toast-wrap');
  if(!wrap){wrap=document.createElement('div');wrap.className='ui-toast-wrap';document.body.appendChild(wrap);}
  const t=document.createElement('div');
  t.className='ui-toast '+tipo;
  t.setAttribute('role',tipo==='err'?'alert':'status');
  t.textContent=String(msg==null?'':msg);
  wrap.appendChild(t);
  const durata=durataMs||Math.min(9000,2600+String(msg||'').length*35);
  setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),300);},durata);
  t.addEventListener('click',()=>t.remove());
}

/* ── Classificazione dei vecchi alert(): l'emoji iniziale dice che tipo di messaggio e' ── */
function _uiTipo(msg){
  const s=String(msg||'').trim();
  if(/^(✅|✔|🎉|💾|♻)/u.test(s)||/riuscit|completat|salvat/i.test(s.slice(0,40)))return 'ok';
  if(/^(❌|⛔|🚫)/u.test(s)||/errore|impossibile|non riuscit|non valid/i.test(s.slice(0,60)))return 'err';
  if(/^(⚠|🔒|🔐|⏳)/u.test(s))return 'warn';
  return 'info';
}
const _nativeAlert=window.alert.bind(window);
window.alert=function(msg){
  const testo=String(msg==null?'':msg);
  const tipo=_uiTipo(testo);
  if(!window.Swal){_nativeAlert(testo);return;}
  const pulito=testo.replace(/^\s*\p{Extended_Pictographic}\uFE0F?\s*/u,'');
  // messaggi brevi e positivi: toast, non interrompono il lavoro
  if(tipo==='ok'&&testo.length<220&&testo.split('\n').length<=4){uiToast(pulito,'ok');return;}
  const icon={ok:'success',err:'error',warn:'warning',info:'info'}[tipo];
  Swal.fire({icon,html:escHtml(pulito),confirmButtonText:'OK',returnFocus:false});
};

function uiConfirm(msg,opz){
  opz=opz||{};
  const testo=String(msg==null?'':msg);
  const danger=opz.danger!=null?opz.danger:/elimin|cancell|svuot|rimuov|sovrascri|definitiv|irreversibil/i.test(testo);
  if(!window.Swal)return Promise.resolve(window.confirm(testo));
  return Swal.fire({
    icon:danger?'warning':'question',
    title:opz.title||undefined,
    html:escHtml(testo.replace(/^\s*\p{Extended_Pictographic}\uFE0F?\s*/u,'')),
    showCancelButton:true,
    confirmButtonText:opz.ok||(danger?'Sì, procedi':'Conferma'),
    cancelButtonText:opz.cancel||'Annulla',
    reverseButtons:true,focusCancel:!!danger,returnFocus:false,
    customClass:{confirmButton:danger?'is-danger':''}
  }).then(r=>!!r.isConfirmed);
}
function uiPrompt(msg,def,opz){
  opz=opz||{};
  if(!window.Swal)return Promise.resolve(window.prompt(msg,def==null?'':def));
  return Swal.fire({
    title:opz.title||undefined,html:escHtml(String(msg||'')),input:opz.input||'text',inputValue:def==null?'':String(def),
    showCancelButton:true,confirmButtonText:opz.ok||'OK',cancelButtonText:'Annulla',reverseButtons:true,returnFocus:false
  }).then(r=>r.isConfirmed?String(r.value==null?'':r.value):null);
}

/* ── Menu laterale (tablet/telefono) ── */
function toggleNav(force){
  const on=force==null?!document.body.classList.contains('nav-open'):!!force;
  document.body.classList.toggle('nav-open',on);
}
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  if(document.body.classList.contains('nav-open')){toggleNav(false);return;}
  if(window.Swal&&Swal.isVisible())return;
  // Esc chiude la finestra in primo piano
  const aperte=[...document.querySelectorAll('.modal-overlay')].filter(m=>!m.classList.contains('hidden'));
  const top=aperte[aperte.length-1];
  if(top)top.classList.add('hidden');
});

/* ── Data di oggi nella barra in alto ── */
function _uiOggi(){
  const el=document.querySelector('#topbar-today span');if(!el)return;
  el.textContent=new Date().toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}

/* ── Emoji → icone Lucide su pulsanti e titoli ── */
const UI_ICONE={
  '✅':'check','✔':'check','🗑':'trash-2','📋':'clipboard-list','➕':'plus','⚠':'triangle-alert','📅':'calendar-days','🔄':'refresh-cw',
  '✏':'pencil','🚫':'ban','◀':'chevron-left','▶':'chevron-right','❌':'x','📊':'chart-column','⚡':'zap','🕐':'clock',
  '🔒':'lock','💡':'lightbulb','⏳':'hourglass','💾':'save','⚙':'settings','📂':'folder-open','📁':'folder-open','📄':'file-text',
  '🖨':'printer','📦':'package','📷':'image','📥':'download','📤':'upload','🔍':'search','🎲':'dices','🚀':'play',
  '📈':'trending-up','🧪':'flask-conical','📏':'ruler','🖥':'monitor','🗄':'database','📶':'wifi','🔵':'bluetooth',
  '🌡':'thermometer','❄':'snowflake','🧬':'dna','🔬':'microscope','ℹ':'info'
};
const _UI_SEL='button,.btn,.card-header h2,.card-header h3,.modal-box > h3,.section-title,summary,label.btn';
const _UI_RE=/^(\s*)(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}\uFE0F?)*)\s*/u;
function _uiIcona(el){
  const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.nodeValue.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP});
  const n=w.nextNode();if(!n)return false;
  const m=n.nodeValue.match(_UI_RE);if(!m)return false;
  const nome=UI_ICONE[m[2].replace(/\uFE0F/g,'')];if(!nome)return false;
  const i=document.createElement('i');i.setAttribute('data-lucide',nome);
  n.nodeValue=n.nodeValue.slice(m[0].length);
  n.parentNode.insertBefore(i,n);
  if(!n.nodeValue.trim()&&!el.title&&!el.getAttribute('aria-label'))el.setAttribute('aria-label',nome);
  return true;
}
let _uiPend=false;
function uiDecora(radice){
  if(!window.lucide)return;
  (radice||document).querySelectorAll(_UI_SEL).forEach(el=>_uiIcona(el));
  if((radice||document).querySelector('i[data-lucide]')){
    try{lucide.createIcons({attrs:{'aria-hidden':'true'}});}catch(e){console.warn('icone:',e);}
  }
}
function _uiPianifica(){
  if(_uiPend)return;_uiPend=true;
  requestAnimationFrame(()=>{_uiPend=false;uiDecora();});
}
document.addEventListener('DOMContentLoaded',()=>{
  _uiOggi();
  uiDecora();
  new MutationObserver(muts=>{
    for(const m of muts){if(m.addedNodes.length){_uiPianifica();return;}}
  }).observe(document.body,{childList:true,subtree:true});
});

/* ── Rete di sicurezza: un errore non gestito in un pulsante non resta muto ── */
window.addEventListener('unhandledrejection',ev=>{
  const e=ev.reason;const msg=(e&&e.message)||String(e||'errore sconosciuto');
  console.error('Errore non gestito:',e);
  uiToast('Operazione non riuscita: '+msg,'err');
});
window.addEventListener('error',ev=>{
  if(!ev.message||/ResizeObserver|Script error/i.test(ev.message))return;
  uiToast('Errore: '+ev.message,'err');
});
