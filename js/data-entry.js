/* data-entry.js — griglia di inserimento CQ + generazione batch */

let selMachIdx=0, selTestIdx=0, currentAcqMethod='Manuale';

function machineTabsHtml(sel,onclickFn){
  return '<div class="pill-tabs">'+state.machines.map((m,i)=>
    `<button class="pill-tab ${i===sel?'active':''}" style="--fc:${safeColor(m.color)}" onclick="${onclickFn}(${i})"><span class="dot" style="background:${safeColor(m.color)}"></span>${escHtml(m.name)}</button>`
  ).join('')+'</div>';
}
function selectDataMachine(i){selMachIdx=i;selTestIdx=0;renderDataGrid();}
function selectDataTest(i){selTestIdx=i;renderDataGrid();}

function renderDataGrid(){
  const c=document.getElementById('data-grid-container');if(!c)return;
  if(!state.machines.length){c.innerHTML='<div class="empty-msg">Nessun analizzatore configurato.</div>';return;}
  if(selMachIdx>=state.machines.length)selMachIdx=0;
  const mach=state.machines[selMachIdx];
  const activeTests=mach.tests.filter(t=>t.active);
  if(selTestIdx>=activeTests.length)selTestIdx=0;
  const wd=getWorkingDays(state.year,state.month);

  let h=machineTabsHtml(selMachIdx,'selectDataMachine');
  if(!activeTests.length){c.innerHTML=h+'<div class="empty-msg">Nessun test attivo per '+escHtml(mach.name)+'. Attivali in Impostazioni.</div>';return;}

  h+='<div class="test-tabs">'+activeTests.map((t,i)=>
    `<button class="test-tab ${i===selTestIdx?'active':''}" onclick="selectDataTest(${i})">${escHtml(t.name)}</button>`).join('')+'</div>';

  const test=activeTests[selTestIdx];
  const mId=escJs(mach.id),tId=escJs(test.id);

  h+=`<div class="acq-bar">
    <span class="acq-label">Acquisizione:</span>
    <button class="btn btn-sm btn-outline acq-btn${currentAcqMethod==='Manuale'?' active':''}" onclick="setAcqM('Manuale')"><i data-lucide="pencil"></i>Manuale</button>
    <button class="btn btn-sm btn-outline acq-btn${currentAcqMethod==='Strumento'?' active':''}" onclick="setAcqM('Strumento')"><i data-lucide="monitor"></i>Strumento</button>
    <button class="btn btn-sm btn-outline acq-btn${currentAcqMethod==='DB'?' active':''}" onclick="setAcqM('DB')"><i data-lucide="database"></i>DB</button>
    <div class="acq-spacer"></div>
    <button class="btn btn-sm btn-outline" onclick="fillRandomTest()"><i data-lucide="dices"></i>Genera CQ</button>
    <button class="btn-danger-outline" onclick="clearTestMonth()"><i data-lucide="trash-2"></i>Cancella mese</button>
  </div>`;

  h+=`<div class="operator-row">
    <label for="operator-name">Operatore:</label><input type="text" id="operator-name" value="${escHtml(getOp())}" onchange="setOp(this.value)" placeholder="Nome">
    <label style="margin-left:10px">Lotto cal.:</label><span class="lot-display">${escHtml(mach.calLot||'—')}</span>
  </div>`;

  h+=`<div class="grid-info"><strong style="color:${safeColor(mach.color)}">${escHtml(mach.name)}</strong> — <strong>${escHtml(test.name)}</strong> (${escHtml(test.unit)}) — ${test.levels.length} livelli CQ</div>`;

  // tabella: giorni × livelli
  h+='<div class="data-table-wrap"><table class="temp-table"><thead><tr><th>Giorno</th><th>Data</th>';
  test.levels.forEach(lv=>{h+=`<th style="min-width:104px">${escHtml(lv.name)}<br><small>${escHtml(lv.mean)} ± ${escHtml(lv.sd)}</small><br><small class="lot-mini">Lotto: ${escHtml(lv.lot)}</small></th>`;});
  h+='<th>Stato</th><th>Note</th></tr></thead><tbody>';

  const dn=['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  const todayStr=fmtDate(new Date());

  wd.forEach(d=>{
    const isToday=d.date===todayStr;
    // stato peggiore fra i livelli del giorno (con le regole di Westgard)
    const evs=test.levels.map(lv=>evalQCMulti(mach.id,test,lv,d.date));
    let worst={status:'missing',rule:''};
    const rejects=evs.filter(e=>e.status==='reject');
    if(rejects.length)worst={status:'reject',rule:[...new Set(rejects.flatMap(e=>e.rules))].join(' ')};
    else if(evs.some(e=>e.status==='warning'))worst={status:'warning',rule:'1-2s'};
    else if(evs.some(e=>e.status==='pass'))worst={status:'pass',rule:''};
    const anyFilled=evs.some(e=>e.status!=='missing');

    const rowClass=worst.status==='reject'?'alarm':worst.status==='warning'?'warning':anyFilled?'ok':'missing';
    h+=`<tr class="temp-row ${rowClass}${isToday?' today-row':''}">`;
    h+=`<td class="day-name">${dn[d.dow]}</td><td class="day-date">${d.dayNum}/${state.month+1}</td>`;

    test.levels.forEach((lv,li)=>{
      const r=getReading(mach.id,test.id,lv.lv,d.date);
      const ev=evs[li];
      const cellClass=ev.status==='reject'?'cell-reject':ev.status==='warning'?'cell-warn':ev.status==='pass'?'cell-pass':'';
      const tip=r?`title="${escHtml((r.method||'')+(r.operator?' — '+r.operator:'')+(r.time?' — '+r.time:'')+(ev.rule?' — '+ev.rule:''))}"`:'';
      h+=`<td class="${cellClass}"><input type="number" step="any" class="temp-input" value="${r&&r.value!=null&&!isNaN(r.value)?r.value:''}" ${tip}
        onchange="onQCInput('${mId}','${tId}',${lv.lv},'${d.date}',this.value)" onfocus="this.select()" aria-label="${escHtml(lv.name)} ${d.dayNum}/${state.month+1}"></td>`;
    });

    h+=`<td>${qcBadge(worst)}</td>`;
    const r0=test.levels.length?getReading(mach.id,test.id,test.levels[0].lv,d.date):null;
    const noteAny=r0?.notes||test.levels.map(lv=>getReading(mach.id,test.id,lv.lv,d.date)?.notes).find(x=>x)||'';
    h+=`<td><input type="text" class="note-input" value="${escHtml(noteAny)}" placeholder="…"
      onchange="onQCNote('${mId}','${tId}','${d.date}',this.value)"></td>`;
    h+='</tr>';
  });
  h+='</tbody></table></div>';

  // riepilogo del mese
  let tp=0,tw=0,tr=0,tm=0;
  test.levels.forEach(lv=>{const t=qcTally(mach.id,test,lv,wd);tp+=t.pass;tw+=t.warn;tr+=t.reject;tm+=t.missing;});
  h+=`<div class="summary-bar"><span class="sum-ok">${tp} conformi</span><span class="sum-warn">${tw} avvisi 1-2s</span><span class="sum-alarm">${tr} rigetti</span><span class="sum-miss">${tm} mancanti</span></div>`;

  c.innerHTML=h;
}

async function setAcqM(m){
  currentAcqMethod=m;
  if(m==='Strumento'||m==='DB'){
    const mach=state.machines[selMachIdx];
    const test=mach&&mach.tests.filter(t=>t.active)[selTestIdx];
    if(test&&await uiConfirm('Simulare la ricezione dei dati da '+m+' per '+test.name+' (oggi)?\nI valori vengono generati a caso: non sono misure reali.',{title:'Simulazione',danger:false})){
      const today=fmtDate(new Date());
      test.levels.forEach(lv=>{
        const val=generateSafeValue(lv.mean,lv.sd);
        setReading(mach.id,test.id,lv.lv,today,val,m,getOp(),'Auto-'+m);
      });
    }
  }
  renderDataGrid();
}

function getOp(){try{return localStorage.getItem('qclab_operator')||'';}catch(e){return '';}}
function setOp(v){try{localStorage.setItem('qclab_operator',v);}catch(e){}}

function onQCInput(machId,testId,lv,dateStr,val){
  const s=String(val==null?'':val).trim();
  if(s===''){
    // campo svuotato = valore cancellato (prima restava salvato e non si poteva togliere)
    if(getReading(machId,testId,lv,dateStr)){deleteReading(machId,testId,lv,dateStr);uiToast('Valore cancellato','info');}
    renderDataGrid();return;
  }
  const n=parseFloat(s.replace(',','.'));
  if(!isFinite(n)){uiToast('Valore non valido: '+s,'err');renderDataGrid();return;}
  // la nota del giorno resta anche quando si corregge il valore
  const old=getReading(machId,testId,lv,dateStr);
  setReading(machId,testId,lv,dateStr,n,currentAcqMethod,getOp(),old?.notes||'');
  renderDataGrid();
}

function onQCNote(machId,testId,dateStr,val){
  const mach=state.machines.find(m=>m.id===machId);
  const test=mach?.tests.find(t=>t.id===testId);
  if(!test)return;
  let n=0;
  test.levels.forEach(lv=>{const r=getReading(machId,testId,lv.lv,dateStr);if(r){r.notes=val;n++;}});
  if(n)saveData();
  else uiToast('Inserisci prima almeno un valore del giorno: la nota si salva insieme ai valori.','warn');
}

async function fillRandomTest(){
  const mach=state.machines[selMachIdx];
  const test=mach&&mach.tests.filter(t=>t.active)[selTestIdx];
  if(!test)return;
  if(!await uiConfirm('Generare valori CQ casuali per «'+test.name+'» — '+MONTH_NAMES[state.month]+' '+state.year+'?\nI valori già inseriti nel mese verranno sovrascritti.',{title:'Genera CQ'}))return;
  const wd=getWorkingDays(state.year,state.month);
  const slots=[];
  wd.forEach(d=>{test.levels.forEach(lv=>{slots.push({d,lv});});});
  const numAltered=Math.min(3+Math.floor(Math.random()*2), slots.length); // 3 o 4
  const alteredSet=new Set();
  while(alteredSet.size<numAltered && alteredSet.size<slots.length){alteredSet.add(Math.floor(Math.random()*slots.length));}
  slots.forEach((s,i)=>{
    const val=alteredSet.has(i)?generateAlteredValue(s.lv.mean,s.lv.sd):generateSafeValue(s.lv.mean,s.lv.sd);
    state.readings[rKey(mach.id,test.id,s.lv.lv,s.d.date)]={value:val,time:new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}),
      method:'Generato',operator:getOp(),notes:'',timestamp:new Date().toISOString()};
  });
  saveData();
  renderDataGrid();
}

async function clearTestMonth(){
  const mach=state.machines[selMachIdx];
  const test=mach&&mach.tests.filter(t=>t.active)[selTestIdx];
  if(!test||!await uiConfirm('Cancellare i dati CQ di '+test.name+' per '+MONTH_NAMES[state.month]+' '+state.year+'?'))return;
  getWorkingDays(state.year,state.month).forEach(d=>{test.levels.forEach(lv=>{delete state.readings[rKey(mach.id,test.id,lv.lv,d.date)];});});
  saveData();
  renderDataGrid();
}

/* ══════ GENERAZIONE BATCH ══════ */
function fillMonthSelects(){
  document.querySelectorAll('select.month-select').forEach(s=>{
    if(s.options.length)return;
    s.innerHTML=MONTH_NAMES.map((n,i)=>`<option value="${i}">${n}</option>`).join('');
    s.value=s.dataset.default||'0';
  });
}
function showBatchModal(){fillMonthSelects();document.getElementById('batch-modal').classList.remove('hidden');renderBatchForm();}
function hideBatchModal(){document.getElementById('batch-modal').classList.add('hidden');}

function renderBatchForm(){
  const c=document.getElementById('batch-machine-checks');
  c.innerHTML='<label style="font-weight:600"><input type="checkbox" id="batch-all" onchange="document.querySelectorAll(\'.batch-mch\').forEach(c=>c.checked=this.checked)" checked> Tutti gli analizzatori</label>'+
    state.machines.map((m,i)=>`<label><input type="checkbox" class="batch-mch" value="${i}" checked> <span class="dot" style="background:${safeColor(m.color)}"></span> ${escHtml(m.name)} (${m.tests.filter(t=>t.active).length} test attivi)</label>`).join('');
  const cy=new Date().getFullYear();
  document.getElementById('batch-year-from').value=cy;
  document.getElementById('batch-year-to').value=cy;
  document.getElementById('batch-progress').innerHTML='';
  document.getElementById('batch-go-btn').disabled=false;
}

function readBatchPeriod(prefix){
  const yf=parseInt(document.getElementById(prefix+'year-from').value),yt=parseInt(document.getElementById(prefix+'year-to').value);
  const mf=parseInt(document.getElementById(prefix+'month-from').value),mt=parseInt(document.getElementById(prefix+'month-to').value);
  if(isNaN(yf)||isNaN(yt)||yf>yt){alert('Intervallo di anni non valido.');return null;}
  if(yt-yf>10){alert('Massimo 10 anni per volta.');return null;}
  if(yf===yt&&mf>mt){alert('Il mese iniziale viene dopo il mese finale.');return null;}
  return {yf,yt,mf,mt};
}

function runBatchGeneration(){
  const selected=[];document.querySelectorAll('.batch-mch:checked').forEach(c=>selected.push(parseInt(c.value)));
  if(!selected.length){alert('Seleziona almeno un analizzatore.');return;}
  const p=readBatchPeriod('batch-');if(!p)return;
  const overwrite=document.getElementById('batch-overwrite').checked;
  const operator=getOp()||'Batch';

  const tasks=[];
  for(let y=p.yf;y<=p.yt;y++){
    const ms=(y===p.yf)?p.mf:0, me=(y===p.yt)?p.mt:11;
    for(let mo=ms;mo<=me;mo++){
      const wd=getWorkingDays(y,mo);
      selected.forEach(idx=>{
        const m=state.machines[idx];if(!m)return;
        const machTasks=[];
        m.tests.filter(t=>t.active).forEach(t=>{
          t.levels.forEach(lv=>{
            wd.forEach(d=>machTasks.push({machId:m.id,testId:t.id,lv:lv.lv,date:d.date,mean:lv.mean,sd:lv.sd,altered:false}));
          });
        });
        const numAlt=Math.min(3+Math.floor(Math.random()*2),machTasks.length);
        const altSet=new Set();
        while(altSet.size<numAlt&&altSet.size<machTasks.length){altSet.add(Math.floor(Math.random()*machTasks.length));}
        altSet.forEach(i=>{machTasks[i].altered=true;});
        tasks.push(...machTasks);
      });
    }
  }

  const total=tasks.length;
  if(!total){alert('Nessun test attivo negli analizzatori scelti.');return;}
  const prog=document.getElementById('batch-progress');
  const btn=document.getElementById('batch-go-btn');
  btn.disabled=true;
  prog.innerHTML=`<div class="batch-bar-wrap"><div class="batch-bar" id="bbar" style="width:0%"></div></div><div id="bstat">0/${total}</div>`;

  let idx=0,gen=0,skip=0;
  function chunk(){
    const end=Math.min(idx+500,total);
    for(;idx<end;idx++){
      const t=tasks[idx];
      if(!overwrite&&state.readings[rKey(t.machId,t.testId,t.lv,t.date)]){skip++;continue;}
      const val=t.altered?generateAlteredValue(t.mean,t.sd):generateSafeValue(t.mean,t.sd);
      state.readings[rKey(t.machId,t.testId,t.lv,t.date)]={value:val,time:'08:00',method:'Batch',operator,notes:'',timestamp:new Date().toISOString()};
      gen++;
    }
    document.getElementById('bbar').style.width=Math.round(idx/total*100)+'%';
    document.getElementById('bstat').textContent=idx+'/'+total;
    if(idx<total) requestAnimationFrame(chunk);
    else{
      const ok=saveData();btn.disabled=false;
      prog.innerHTML=ok
        ?`<div class="info-box ok"><strong>${gen} valori CQ generati</strong>${skip?' ('+skip+' già presenti, lasciati com\'erano)':''}</div>`
        :'<div class="info-box warn">I valori sono stati generati ma NON salvati: la memoria del browser è piena.</div>';
      refreshCurrentSection();
    }
  }
  requestAnimationFrame(chunk);
}
