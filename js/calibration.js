/* calibration.js — calibrazioni: una lettura al mese per test e livello */

let calMachIdx=0, calTestIdx=0, calAcqMethod='Manuale';

function selectCalMachine(i){calMachIdx=i;calTestIdx=0;renderCalibrationGrid();}

function calBadge(passed){
  if(passed==='pass')return '<span class="status-badge st-ok">PASS</span>';
  if(passed==='warning')return '<span class="status-badge st-warn">⚠ 2-3 DS</span>';
  if(passed==='fail')return '<span class="status-badge st-alarm">✖ FAIL</span>';
  return '<span class="status-badge st-miss">—</span>';
}

function renderCalibrationGrid(){
  const c=document.getElementById('cal-grid-container');if(!c)return;
  if(!state.machines.length){c.innerHTML='<div class="empty-msg">Nessun analizzatore configurato.</div>';return;}
  if(calMachIdx>=state.machines.length)calMachIdx=0;
  const mach=state.machines[calMachIdx];
  const activeTests=mach.tests.filter(t=>t.active);

  let h=machineTabsHtml(calMachIdx,'selectCalMachine');
  if(!activeTests.length){c.innerHTML=h+'<div class="empty-msg">Nessun test attivo per '+escHtml(mach.name)+'. Attivali in Impostazioni.</div>';return;}

  h+=`<div class="acq-bar">
    <span class="acq-label">Acquisizione:</span>
    <button class="btn btn-sm btn-outline acq-btn${calAcqMethod==='Manuale'?' active':''}" onclick="setCalAcq('Manuale')"><i data-lucide="pencil"></i>Manuale</button>
    <button class="btn btn-sm btn-outline acq-btn${calAcqMethod==='Strumento'?' active':''}" onclick="setCalAcq('Strumento')"><i data-lucide="monitor"></i>Strumento</button>
    <button class="btn btn-sm btn-outline acq-btn${calAcqMethod==='DB'?' active':''}" onclick="setCalAcq('DB')"><i data-lucide="database"></i>DB</button>
    <div class="acq-spacer"></div>
    <button class="btn btn-sm btn-outline" onclick="fillRandomCalAll()"><i data-lucide="dices"></i>Genera calibrazioni</button>
    <button class="btn-danger-outline" onclick="clearCalMonth()"><i data-lucide="trash-2"></i>Cancella mese</button>
  </div>`;

  h+=`<div class="operator-row">
    <label for="cal-operator-name">Operatore:</label><input type="text" id="cal-operator-name" value="${escHtml(getOp())}" onchange="setOp(this.value)" placeholder="Nome">
    <label style="margin-left:10px">Lotto cal.:</label><span class="lot-display">${escHtml(mach.calLot||'—')}</span>
    <label style="margin-left:10px">Scadenza:</label><span class="lot-display">${escHtml(mach.calExpiry?fmtDateIt(mach.calExpiry):'—')}</span>
  </div>`;

  const ms=getMonthStr(state.year,state.month);
  h+=`<div class="info-box"><strong>Calibrazione mensile — ${MONTH_NAMES[state.month]} ${state.year}.</strong>
    Una sola lettura per test e livello al mese. PASS entro ±2 DS dalla media del calibratore, avviso fra 2 e 3 DS, FAIL oltre 3 DS.</div>`;

  h+='<div class="data-table-wrap"><table class="temp-table"><thead><tr>';
  h+='<th style="min-width:130px">Test</th><th>Unità</th><th>Livello</th><th>Media (target)</th><th>± DS</th><th>Lotto CQ</th>';
  h+='<th style="min-width:110px">Valore misurato</th><th>Stato</th><th>Metodo</th><th>Note</th>';
  h+='</tr></thead><tbody>';

  const mId=escJs(mach.id);
  activeTests.forEach(test=>{
    const tId=escJs(test.id);
    test.levels.forEach((lv,li)=>{
      const r=getCalReading(mach.id,test.id,lv.lv,ms);
      let cellClass='';
      if(r){cellClass=r.passed==='pass'?'cell-pass':r.passed==='warning'?'cell-warn':'cell-reject';}
      const rowClass=r?(r.passed==='pass'?'ok':r.passed==='warning'?'warning':'alarm'):'missing';
      h+=`<tr class="temp-row ${rowClass}">`;
      if(li===0){
        h+=`<td rowspan="${test.levels.length}" style="font-weight:600;text-align:left;border-right:1px solid var(--border)">${escHtml(test.name)}</td>`;
        h+=`<td rowspan="${test.levels.length}" style="border-right:1px solid var(--border-light)">${escHtml(test.unit)}</td>`;
      }
      h+=`<td><span class="level-chip-sm">${escHtml(lv.name)}</span></td>`;
      h+=`<td style="font-weight:600">${escHtml(lv.mean)}</td>`;
      h+=`<td>±${escHtml(lv.sd)}</td>`;
      h+=`<td style="font-size:11px;color:var(--text-muted)">${escHtml(lv.lot)}</td>`;
      h+=`<td class="${cellClass}"><input type="number" step="any" class="temp-input" value="${r&&r.value!=null&&!isNaN(r.value)?r.value:''}"
        onchange="onCalInput('${mId}','${tId}',${lv.lv},'${ms}',this.value)" onfocus="this.select()" aria-label="${escHtml(test.name+' '+lv.name)}"></td>`;
      h+=`<td>${r?calBadge(r.passed):calBadge(null)}</td>`;
      h+=`<td class="method-cell">${escHtml(r?r.method:'—')}</td>`;
      h+=`<td><input type="text" class="note-input" value="${escHtml(r?.notes||'')}" placeholder="…"
        onchange="onCalNote('${mId}','${tId}',${lv.lv},'${ms}',this.value)"></td>`;
      h+='</tr>';
    });
  });
  h+='</tbody></table></div>';

  const st=getCalibrationStatus(mach.id,state.year,state.month);
  h+=`<div class="summary-bar">
    <span class="sum-ok">${st.pass} PASS</span>
    <span class="sum-warn">${st.warn} avvisi</span>
    <span class="sum-alarm">${st.fail} FAIL</span>
    <span class="sum-miss">${st.missing} mancanti</span>
    <span style="margin-left:auto;color:${st.fail>0?'var(--danger)':st.missing>0?'var(--text-muted)':'var(--success)'}">${st.total?Math.round(st.pass/st.total*100):0}% conforme</span>
  </div>`;

  c.innerHTML=h;
}

async function setCalAcq(m){
  calAcqMethod=m;
  if(m==='Strumento'||m==='DB'){
    const mach=state.machines[calMachIdx];
    const ms=getMonthStr(state.year,state.month);
    if(mach&&await uiConfirm('Simulare la ricezione da '+m+' per tutti i test attivi di '+mach.name+'?\nI valori vengono generati a caso: non sono misure reali.',{title:'Simulazione',danger:false})){
      mach.tests.filter(t=>t.active).forEach(t=>{
        t.levels.forEach(lv=>{
          setCalReading(mach.id,t.id,lv.lv,ms,generateSafeValue(lv.mean,lv.sd),m,getOp(),'Auto-'+m,mach.calLot);
        });
      });
    }
  }
  renderCalibrationGrid();
}

function onCalInput(machId,testId,lv,ms,val){
  const s=String(val==null?'':val).trim();
  if(s===''){
    if(getCalReading(machId,testId,lv,ms)){deleteCalReading(machId,testId,lv,ms);uiToast('Valore cancellato','info');}
    renderCalibrationGrid();return;
  }
  const n=parseFloat(s.replace(',','.'));
  if(!isFinite(n)){uiToast('Valore non valido: '+s,'err');renderCalibrationGrid();return;}
  const mach=state.machines.find(m=>m.id===machId);
  const old=getCalReading(machId,testId,lv,ms);
  setCalReading(machId,testId,lv,ms,n,calAcqMethod,getOp(),old?.notes||'',mach?.calLot||'');
  renderCalibrationGrid();
}

function onCalNote(machId,testId,lv,ms,val){
  const r=getCalReading(machId,testId,lv,ms);
  if(r){r.notes=val;saveData();}
  else uiToast('Inserisci prima il valore: la nota si salva insieme alla misura.','warn');
}

async function fillRandomCalAll(){
  const mach=state.machines[calMachIdx];
  const active=mach?mach.tests.filter(t=>t.active):[];
  if(!active.length)return;
  if(!await uiConfirm('Generare calibrazioni casuali per tutti i '+active.length+' test attivi di «'+mach.name+'» — '+MONTH_NAMES[state.month]+' '+state.year+'?\nI valori già inseriti nel mese verranno sovrascritti.',{title:'Genera calibrazioni'}))return;
  const ms=getMonthStr(state.year,state.month);
  active.forEach(t=>{
    t.levels.forEach(lv=>{
      setCalReading(mach.id,t.id,lv.lv,ms,generateSafeValue(lv.mean,lv.sd),'Generato',getOp(),'',mach.calLot);
    });
  });
  renderCalibrationGrid();
}

async function clearCalMonth(){
  const mach=state.machines[calMachIdx];if(!mach)return;
  const ms=getMonthStr(state.year,state.month);
  if(!await uiConfirm('Cancellare tutte le calibrazioni di '+mach.name+' per '+MONTH_NAMES[state.month]+' '+state.year+'?'))return;
  mach.tests.filter(t=>t.active).forEach(t=>{t.levels.forEach(lv=>{delete state.calibrations[calKey(mach.id,t.id,lv.lv,ms)];});});
  saveData();
  renderCalibrationGrid();
}

/* ══════ GENERAZIONE BATCH CALIBRAZIONI ══════ */
function showCalBatchModal(){fillMonthSelects();document.getElementById('cal-batch-modal').classList.remove('hidden');renderCalBatchForm();}
function hideCalBatchModal(){document.getElementById('cal-batch-modal').classList.add('hidden');}

function renderCalBatchForm(){
  const c=document.getElementById('cal-batch-machine-checks');
  c.innerHTML='<label style="font-weight:600"><input type="checkbox" id="cal-batch-all" onchange="document.querySelectorAll(\'.cal-batch-mch\').forEach(c=>c.checked=this.checked)" checked> Tutti gli analizzatori</label>'+
    state.machines.map((m,i)=>`<label><input type="checkbox" class="cal-batch-mch" value="${i}" checked> <span class="dot" style="background:${safeColor(m.color)}"></span> ${escHtml(m.name)} (${m.tests.filter(t=>t.active).length} test attivi)</label>`).join('');
  const cy=new Date().getFullYear();
  document.getElementById('cal-batch-year-from').value=cy;
  document.getElementById('cal-batch-year-to').value=cy;
  document.getElementById('cal-batch-progress').innerHTML='';
  document.getElementById('cal-batch-go-btn').disabled=false;
}

async function runCalBatchGeneration(){
  const selected=[];document.querySelectorAll('.cal-batch-mch:checked').forEach(c=>selected.push(parseInt(c.value)));
  if(!selected.length){alert('Seleziona almeno un analizzatore.');return;}
  const p=readBatchPeriod('cal-batch-');if(!p)return;
  const overwrite=document.getElementById('cal-batch-overwrite').checked;
  const operator=getOp()||'Batch';

  let gen=0,skip=0;
  for(let y=p.yf;y<=p.yt;y++){
    const ms=(y===p.yf)?p.mf:0, me=(y===p.yt)?p.mt:11;
    for(let mo=ms;mo<=me;mo++){
      const monthStr=getMonthStr(y,mo);
      selected.forEach(idx=>{
        const m=state.machines[idx];if(!m)return;
        m.tests.filter(t=>t.active).forEach(t=>{
          t.levels.forEach(lv=>{
            const key=calKey(m.id,t.id,lv.lv,monthStr);
            if(!overwrite&&state.calibrations[key]){skip++;return;}
            const val=generateSafeValue(lv.mean,lv.sd);
            state.calibrations[key]={value:val,time:'08:00',method:'Batch',operator,notes:'',
              calLot:m.calLot||'',passed:calOutcome(val,lv.mean,lv.sd),timestamp:new Date().toISOString()};
            gen++;
          });
        });
      });
    }
  }
  const ok=await saveDataNow();
  document.getElementById('cal-batch-progress').innerHTML=ok
    ?`<div class="info-box ok"><strong>${gen} calibrazioni generate e salvate</strong>${skip?' ('+skip+' già presenti, lasciate com\'erano)':''}</div>`
    :'<div class="info-box warn">Le calibrazioni sono state generate ma NON salvate nel database del browser: esporta un backup.</div>';
  document.getElementById('cal-batch-go-btn').disabled=false;
  refreshCurrentSection();
}

/* ══════ STATO CALIBRAZIONI per DASHBOARD e PDF ══════ */
function getCalibrationStatus(machId,year,month){
  const ms=getMonthStr(year,month);
  const mach=state.machines.find(m=>m.id===machId);if(!mach)return{total:0,done:0,pass:0,warn:0,fail:0,missing:0};
  let total=0,done=0,pass=0,warn=0,fail=0;
  mach.tests.filter(t=>t.active).forEach(t=>{t.levels.forEach(lv=>{
    total++;
    const r=getCalReading(machId,t.id,lv.lv,ms);
    if(r){done++;if(r.passed==='pass')pass++;else if(r.passed==='warning')warn++;else fail++;}
  });});
  return{total,done,pass,warn,fail,missing:total-done};
}
