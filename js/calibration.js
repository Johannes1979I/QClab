/* calibration.js — Calibration Data Entry: 1×/month per test, same pattern as QC */

let calMachIdx=0, calTestIdx=0, calAcqMethod='Manuale';

function renderCalibrationGrid(){
  const c=document.getElementById('cal-grid-container');if(!c)return;
  if(!state.machines.length){c.innerHTML='<p style="text-align:center;color:var(--text-muted);padding:20px">Nessun analizzatore configurato.</p>';return;}
  if(calMachIdx>=state.machines.length)calMachIdx=0;
  const mach=state.machines[calMachIdx];
  const activeTests=mach.tests.filter(t=>t.active);
  if(calTestIdx>=activeTests.length)calTestIdx=0;

  // Machine tabs
  let h='<div class="fridge-tabs">';
  state.machines.forEach((m,i)=>{
    h+=`<button class="fridge-tab ${i===calMachIdx?'active':''}" style="--fc:${m.color}" onclick="calMachIdx=${i};calTestIdx=0;renderCalibrationGrid()">${m.icon} ${m.name}</button>`;
  });
  h+='</div>';

  if(!activeTests.length){c.innerHTML=h+'<p style="text-align:center;color:var(--text-muted);padding:20px">Nessun test attivo per '+mach.name+'. Vai in Impostazioni per attivarli.</p>';return;}

  // Acq bar
  h+=`<div class="acq-bar">
    <span class="acq-label">Acquisizione:</span>
    <button class="btn btn-sm btn-outline acq-btn${calAcqMethod==='Manuale'?' active':''}" onclick="setCalAcq('Manuale')">✏️ Manuale</button>
    <button class="btn btn-sm btn-outline acq-btn${calAcqMethod==='Strumento'?' active':''}" onclick="setCalAcq('Strumento')">🖥️ Strumento</button>
    <button class="btn btn-sm btn-outline acq-btn${calAcqMethod==='DB'?' active':''}" onclick="setCalAcq('DB')">🗄️ DB</button>
    <div style="flex:1"></div>
    <button class="btn btn-sm btn-primary" onclick="fillRandomCalAll()">🎲 Genera Calibrazioni</button>
    <button class="btn btn-sm btn-outline" onclick="clearCalMonth()">🗑 Cancella mese</button>
  </div>`;

  // Operator + Cal lot
  h+=`<div class="operator-row">
    <label>Operatore:</label><input type="text" id="cal-operator-name" value="${getOp()}" onchange="setOp(this.value)" placeholder="Nome" style="max-width:180px">
    <label style="margin-left:16px">Lotto Cal:</label><span class="lot-display">${mach.calLot||'—'}</span>
    <label style="margin-left:16px">Scadenza:</label><span class="lot-display">${mach.calExpiry||'—'}</span>
  </div>`;

  // Info
  const ms=getMonthStr(state.year,state.month);
  h+=`<div style="margin-bottom:6px;padding:8px 12px;background:var(--accent-pale);border-radius:8px;font-size:12px">
    <strong>📏 Calibrazione mensile</strong> — ${MONTH_NAMES[state.month]} ${state.year}
    <span style="color:var(--text-muted);margin-left:8px">Una sola lettura per test/livello al mese. I valori devono rientrare entro ±2SD dalla media del calibratore.</span>
  </div>`;

  // Table: ALL active tests × levels for this month
  h+='<div class="data-table-wrap"><table class="temp-table"><thead><tr>';
  h+='<th style="min-width:140px">Test</th><th>Unità</th><th>Livello</th><th>Media (target)</th><th>±SD</th><th>Lotto CQ</th>';
  h+='<th style="min-width:120px">Valore misurato</th><th>Stato</th><th>Metodo</th><th>Note</th>';
  h+='</tr></thead><tbody>';

  activeTests.forEach(test=>{
    test.levels.forEach((lv,li)=>{
      const r=getCalReading(mach.id,test.id,lv.lv,ms);
      const val=r?r.value:'';
      let cellClass='',statusBadge='<span class="status-badge st-miss">—</span>';
      if(r){
        if(r.passed==='pass'){cellClass='cell-pass';statusBadge='<span class="status-badge st-ok">✅ PASS</span>';}
        else if(r.passed==='warning'){cellClass='cell-warn';statusBadge='<span class="status-badge st-warn">⚠️ 2-3SD</span>';}
        else{cellClass='cell-reject';statusBadge='<span class="status-badge st-alarm">✖ FAIL</span>';}
      }
      const rowClass=r?(r.passed==='pass'?'ok':r.passed==='warning'?'warning':'alarm'):'missing';
      h+=`<tr class="temp-row ${rowClass}">`;
      // Test name (only on first level)
      if(li===0) h+=`<td rowspan="${test.levels.length}" style="font-weight:600;border-right:2px solid var(--border)">${test.name}</td>`;
      if(li===0) h+=`<td rowspan="${test.levels.length}" style="border-right:1px solid var(--border-light)">${test.unit}</td>`;
      if(li!==0){/* rowspan handles it */}
      h+=`<td style="font-size:11px"><span class="level-chip-sm">${lv.name}</span></td>`;
      h+=`<td style="text-align:center;font-weight:600">${lv.mean}</td>`;
      h+=`<td style="text-align:center">±${lv.sd}</td>`;
      h+=`<td style="font-size:10px;color:var(--text-muted)">${lv.lot}</td>`;
      h+=`<td class="${cellClass}"><input type="number" step="any" class="temp-input" value="${val!==''?val:''}"
        onchange="onCalInput('${mach.id}','${test.id}',${lv.lv},'${ms}',this.value)" onfocus="this.select()"></td>`;
      h+=`<td>${statusBadge}</td>`;
      h+=`<td style="font-size:10px">${r?r.method:'—'}</td>`;
      h+=`<td><input type="text" class="note-input" value="${r?.notes||''}" placeholder="..."
        onchange="onCalNote('${mach.id}','${test.id}',${lv.lv},'${ms}',this.value)"></td>`;
      h+='</tr>';
    });
  });
  h+='</tbody></table></div>';

  // Summary
  let tp=0,tw=0,tf=0,tm=0;
  activeTests.forEach(t=>{t.levels.forEach(lv=>{
    const r=getCalReading(mach.id,t.id,lv.lv,ms);
    if(!r)tm++;else if(r.passed==='pass')tp++;else if(r.passed==='warning')tw++;else tf++;
  });});
  const total=tp+tw+tf+tm;
  h+=`<div class="summary-bar">
    <span class="sum-ok">${tp} Pass</span>
    <span class="sum-warn">${tw} Warning</span>
    <span class="sum-alarm">${tf} Fail</span>
    <span class="sum-miss">${tm} Mancanti</span>
    <span style="margin-left:auto;font-weight:600;color:${tf>0?'var(--danger)':tm>0?'var(--text-muted)':'var(--success)'}">${total?Math.round(tp/total*100):0}% conforme</span>
  </div>`;

  c.innerHTML=h;
}

/* ── Acquisition methods ── */
function setCalAcq(m){
  calAcqMethod=m;
  if(m==='Strumento'||m==='DB'){
    const mach=state.machines[calMachIdx];
    const ms=getMonthStr(state.year,state.month);
    if(confirm('Simulare ricezione dati da '+m+' per tutti i test attivi di '+mach.name+'?')){
      mach.tests.filter(t=>t.active).forEach(t=>{
        t.levels.forEach(lv=>{
          const val=generateSafeValue(lv.mean,lv.sd);
          setCalReading(mach.id,t.id,lv.lv,ms,val,m,getOp(),'Auto-'+m,mach.calLot);
        });
      });
    }
  }
  renderCalibrationGrid();
}

/* ── Manual input ── */
function onCalInput(machId,testId,lv,ms,val){
  if(val===''||isNaN(parseFloat(val)))return;
  const mach=state.machines.find(m=>m.id===machId);
  setCalReading(machId,testId,lv,ms,val,calAcqMethod,getOp(),'',mach?.calLot||'');
  renderCalibrationGrid();
}

function onCalNote(machId,testId,lv,ms,val){
  const r=getCalReading(machId,testId,lv,ms);
  if(r){r.notes=val;saveData();}
}

/* ── Random generation: all tests for current machine & month ── */
function fillRandomCalAll(){
  const mach=state.machines[calMachIdx];
  const active=mach.tests.filter(t=>t.active);
  if(!active.length)return;
  if(!confirm('Generare calibrazioni casuali per tutti i '+active.length+' test attivi di "'+mach.name+'" — '+MONTH_NAMES[state.month]+' '+state.year+'?'))return;
  const ms=getMonthStr(state.year,state.month);
  active.forEach(t=>{
    t.levels.forEach(lv=>{
      setCalReading(mach.id,t.id,lv.lv,ms,generateSafeValue(lv.mean,lv.sd),'Generato',getOp(),'',mach.calLot);
    });
  });
  renderCalibrationGrid();
}

/* ── Clear month ── */
function clearCalMonth(){
  const mach=state.machines[calMachIdx];
  const ms=getMonthStr(state.year,state.month);
  if(!confirm('Cancellare tutte le calibrazioni di '+mach.name+' per '+MONTH_NAMES[state.month]+' '+state.year+'?'))return;
  mach.tests.filter(t=>t.active).forEach(t=>{t.levels.forEach(lv=>deleteCalReading(mach.id,t.id,lv.lv,ms));});
  renderCalibrationGrid();
}

/* ══════ BATCH CALIBRATION GENERATOR ══════ */
function showCalBatchModal(){document.getElementById('cal-batch-modal').classList.remove('hidden');renderCalBatchForm();}
function hideCalBatchModal(){document.getElementById('cal-batch-modal').classList.add('hidden');}

function renderCalBatchForm(){
  const c=document.getElementById('cal-batch-machine-checks');
  c.innerHTML='<label style="display:flex;gap:6px;align-items:center;margin-bottom:6px;font-weight:600"><input type="checkbox" id="cal-batch-all" onchange="document.querySelectorAll(\'.cal-batch-mch\').forEach(c=>c.checked=this.checked)" checked> Tutti gli analizzatori</label>'+
    state.machines.map((m,i)=>`<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" class="cal-batch-mch" value="${i}" checked> <span style="color:${m.color}">●</span> ${m.name} (${m.tests.filter(t=>t.active).length} test attivi)</label>`).join('');
  const cy=new Date().getFullYear();
  document.getElementById('cal-batch-year-from').value=cy;
  document.getElementById('cal-batch-year-to').value=cy;
  document.getElementById('cal-batch-progress').innerHTML='';
  document.getElementById('cal-batch-go-btn').disabled=false;
}

function runCalBatchGeneration(){
  const selected=[];document.querySelectorAll('.cal-batch-mch:checked').forEach(c=>selected.push(parseInt(c.value)));
  if(!selected.length){alert('Selezionare almeno un analizzatore.');return;}
  const yf=parseInt(document.getElementById('cal-batch-year-from').value),yt=parseInt(document.getElementById('cal-batch-year-to').value);
  if(isNaN(yf)||isNaN(yt)||yf>yt){alert('Intervallo anni non valido.');return;}
  if(yt-yf>10){alert('Massimo 10 anni.');return;}
  const mf=parseInt(document.getElementById('cal-batch-month-from').value),mt=parseInt(document.getElementById('cal-batch-month-to').value);
  const overwrite=document.getElementById('cal-batch-overwrite').checked;
  const operator=getOp()||'Batch';

  let gen=0,skip=0;
  for(let y=yf;y<=yt;y++){
    const ms=(y===yf)?mf:0, me=(y===yt)?mt:11;
    for(let mo=ms;mo<=me;mo++){
      const monthStr=getMonthStr(y,mo);
      selected.forEach(idx=>{
        const m=state.machines[idx];
        m.tests.filter(t=>t.active).forEach(t=>{
          t.levels.forEach(lv=>{
            const key=calKey(m.id,t.id,lv.lv,monthStr);
            if(!overwrite&&state.calibrations[key]){skip++;return;}
            const val=generateSafeValue(lv.mean,lv.sd);
            const z=Math.abs(val-lv.mean)/lv.sd;
            state.calibrations[key]={value:val,time:'08:00',method:'Batch',operator,notes:'',
              calLot:m.calLot||'',passed:z<=2?'pass':z<=3?'warning':'fail',timestamp:new Date().toISOString()};
            gen++;
          });
        });
      });
    }
  }
  saveData();
  document.getElementById('cal-batch-progress').innerHTML=`<div style="padding:12px;background:var(--success-pale);border-radius:8px;color:var(--success);font-weight:600">✅ ${gen} calibrazioni generate${skip?' ('+skip+' saltate)':''}</div>`;
  document.getElementById('cal-batch-go-btn').disabled=false;
}

/* ══════ CALIBRATION STATUS for DASHBOARD ══════ */
function getCalibrationStatus(machId,year,month){
  const ms=getMonthStr(year,month);
  const mach=state.machines.find(m=>m.id===machId);if(!mach)return{total:0,done:0,pass:0,warn:0,fail:0,missing:0};
  const active=mach.tests.filter(t=>t.active);
  let total=0,done=0,pass=0,warn=0,fail=0;
  active.forEach(t=>{t.levels.forEach(lv=>{
    total++;
    const r=getCalReading(machId,t.id,lv.lv,ms);
    if(r){done++;if(r.passed==='pass')pass++;else if(r.passed==='warning')warn++;else fail++;}
  });});
  return{total,done,pass,warn,fail,missing:total-done};
}
