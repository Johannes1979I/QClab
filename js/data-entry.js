/* data-entry.js — QC Data Entry Grid + Batch Generator */

let selMachIdx=0, selTestIdx=0, currentAcqMethod='Manuale';

function renderDataGrid(){
  const c=document.getElementById('data-grid-container');if(!c)return;
  if(!state.machines.length){c.innerHTML='<p style="text-align:center;color:var(--text-muted);padding:20px">Nessun analizzatore configurato.</p>';return;}
  if(selMachIdx>=state.machines.length)selMachIdx=0;
  const mach=state.machines[selMachIdx];
  const activeTests=mach.tests.filter(t=>t.active);
  if(selTestIdx>=activeTests.length)selTestIdx=0;
  const wd=getWorkingDays(state.year,state.month);

  // Machine tabs
  let h='<div class="fridge-tabs">';
  state.machines.forEach((m,i)=>{
    h+=`<button class="fridge-tab ${i===selMachIdx?'active':''}" style="--fc:${m.color}" onclick="selMachIdx=${i};selTestIdx=0;renderDataGrid()">${m.icon} ${m.name}</button>`;
  });
  h+='</div>';

  if(!activeTests.length){c.innerHTML=h+'<p style="text-align:center;color:var(--text-muted);padding:20px">Nessun test attivo per '+mach.name+'. Vai in Impostazioni per attivarli.</p>';return;}

  // Test sub-tabs
  h+='<div class="test-tabs">';
  activeTests.forEach((t,i)=>{
    h+=`<button class="test-tab ${i===selTestIdx?'active':''}" onclick="selTestIdx=${i};renderDataGrid()">${t.name}</button>`;
  });
  h+='</div>';

  const test=activeTests[selTestIdx];

  // Acq bar + lot info
  h+=`<div class="acq-bar">
    <span class="acq-label">Acquisizione:</span>
    <button class="btn btn-sm btn-outline acq-btn${currentAcqMethod==='Manuale'?' active':''}" onclick="setAcqM('Manuale')">✏️ Manuale</button>
    <button class="btn btn-sm btn-outline acq-btn${currentAcqMethod==='Strumento'?' active':''}" onclick="setAcqM('Strumento')">🖥️ Strumento</button>
    <button class="btn btn-sm btn-outline acq-btn${currentAcqMethod==='DB'?' active':''}" onclick="setAcqM('DB')">🗄️ DB</button>
    <div style="flex:1"></div>
    <button class="btn btn-sm btn-primary" onclick="fillRandomTest()">🎲 Genera CQ</button>
    <button class="btn btn-sm btn-outline" onclick="clearTestMonth()">🗑 Cancella mese</button>
  </div>`;

  // Operator + Cal lot
  h+=`<div class="operator-row">
    <label>Operatore:</label><input type="text" id="operator-name" value="${getOp()}" onchange="setOp(this.value)" placeholder="Nome" style="max-width:180px">
    <label style="margin-left:16px">Lotto Cal:</label><span class="lot-display">${mach.calLot||'—'}</span>
  </div>`;

  // Info bar
  h+=`<div style="margin-bottom:8px;font-size:13px;color:var(--text-secondary)">
    <strong style="color:${mach.color}">${mach.name}</strong> — <strong>${test.name}</strong> (${test.unit})
    — ${test.levels.length} livelli CQ
  </div>`;

  // Table: days × levels
  h+='<div class="data-table-wrap"><table class="temp-table"><thead><tr><th>Giorno</th><th>Data</th>';
  test.levels.forEach(lv=>{h+=`<th style="min-width:100px">${lv.name}<br><small>${lv.mean}±${lv.sd}</small><br><small class="lot-mini">Lotto: ${lv.lot}</small></th>`;});
  h+='<th>Stato</th><th>Note</th></tr></thead><tbody>';

  const dn=['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  const todayStr=fmtDate(new Date());

  wd.forEach(d=>{
    const isToday=d.date===todayStr;
    // Determine worst status across levels for this day
    let worstStatus='missing', anyFilled=false;
    test.levels.forEach(lv=>{
      const r=getReading(mach.id,test.id,lv.lv,d.date);
      if(r){
        anyFilled=true;
        const ev=evalQC(r.value,lv.mean,lv.sd);
        if(ev.status==='reject') worstStatus='reject';
        else if(ev.status==='warning'&&worstStatus!=='reject') worstStatus='warning';
        else if(ev.status==='pass'&&worstStatus==='missing') worstStatus='pass';
      }
    });

    const rowClass=worstStatus==='reject'?'alarm':worstStatus==='warning'?'warning':anyFilled?'ok':'missing';
    h+=`<tr class="temp-row ${rowClass}${isToday?' today-row':''}">`;
    h+=`<td class="day-name">${dn[d.dow]}</td><td class="day-date">${d.dayNum}/${state.month+1}</td>`;

    test.levels.forEach(lv=>{
      const r=getReading(mach.id,test.id,lv.lv,d.date);
      const val=r?r.value:'';
      let cellClass='';
      if(r){const ev=evalQC(r.value,lv.mean,lv.sd);cellClass=ev.status==='reject'?'cell-reject':ev.status==='warning'?'cell-warn':'cell-pass';}
      h+=`<td class="${cellClass}"><input type="number" step="any" class="temp-input" value="${val!==''?val:''}"
        onchange="onQCInput('${mach.id}','${test.id}',${lv.lv},'${d.date}',this.value)" onfocus="this.select()"></td>`;
    });

    // Status badge
    const stMap={pass:'<span class="status-badge st-ok">PASS</span>',warning:'<span class="status-badge st-warn">⚠️ 1-2s</span>',reject:'<span class="status-badge st-alarm">✖ 1-3s</span>',missing:'<span class="status-badge st-miss">—</span>'};
    h+=`<td>${stMap[worstStatus]}</td>`;

    // Notes (from first level reading)
    const r0=getReading(mach.id,test.id,test.levels[0].lv,d.date);
    h+=`<td><input type="text" class="note-input" value="${r0?.notes||''}" placeholder="..."
      onchange="onQCNote('${mach.id}','${test.id}','${d.date}',this.value)"></td>`;
    h+='</tr>';
  });
  h+='</tbody></table></div>';

  // Summary
  let tp=0,tw=0,tr=0,tm=0;
  wd.forEach(d=>{test.levels.forEach(lv=>{
    const r=getReading(mach.id,test.id,lv.lv,d.date);
    if(!r)tm++;else{const e=evalQC(r.value,lv.mean,lv.sd);if(e.status==='pass')tp++;else if(e.status==='warning')tw++;else tr++;}
  });});
  h+=`<div class="summary-bar"><span class="sum-ok">${tp} Pass</span><span class="sum-warn">${tw} Warning (1-2s)</span><span class="sum-alarm">${tr} Reject (1-3s)</span><span class="sum-miss">${tm} Mancanti</span></div>`;

  c.innerHTML=h;
}

function setAcqM(m){
  currentAcqMethod=m;
  if(m==='Strumento'||m==='DB'){
    const mach=state.machines[selMachIdx];
    const test=mach.tests.filter(t=>t.active)[selTestIdx];
    if(test&&confirm('Simulare ricezione dati da '+m+' per '+test.name+' (oggi)?')){
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
  if(val===''||isNaN(parseFloat(val)))return;
  setReading(machId,testId,lv,dateStr,val,currentAcqMethod,getOp(),'');
  renderDataGrid();
}

function onQCNote(machId,testId,dateStr,val){
  const mach=state.machines.find(m=>m.id===machId);
  const test=mach?.tests.find(t=>t.id===testId);
  if(!test)return;
  test.levels.forEach(lv=>{const r=getReading(machId,testId,lv.lv,dateStr);if(r){r.notes=val;saveData();}});
}

function fillRandomTest(){
  const mach=state.machines[selMachIdx];
  const test=mach.tests.filter(t=>t.active)[selTestIdx];
  if(!test)return;
  if(!confirm('Generare CQ casuali per "'+test.name+'" — '+MONTH_NAMES[state.month]+' '+state.year+'?'))return;
  const wd=getWorkingDays(state.year,state.month);
  // Build all slots, pick 3-4 to be altered
  const slots=[];
  wd.forEach(d=>{test.levels.forEach(lv=>{slots.push({d,lv});});});
  const numAltered=Math.min(3+Math.floor(Math.random()*2), slots.length); // 3 or 4
  const alteredSet=new Set();
  while(alteredSet.size<numAltered && alteredSet.size<slots.length){alteredSet.add(Math.floor(Math.random()*slots.length));}
  slots.forEach((s,i)=>{
    const val=alteredSet.has(i)?generateAlteredValue(s.lv.mean,s.lv.sd):generateSafeValue(s.lv.mean,s.lv.sd);
    setReading(mach.id,test.id,s.lv.lv,s.d.date,val,'Generato',getOp(),'');
  });
  renderDataGrid();
}

function clearTestMonth(){
  const mach=state.machines[selMachIdx];
  const test=mach.tests.filter(t=>t.active)[selTestIdx];
  if(!test||!confirm('Cancellare i dati CQ di '+test.name+' per '+MONTH_NAMES[state.month]+'?'))return;
  getWorkingDays(state.year,state.month).forEach(d=>{test.levels.forEach(lv=>deleteReading(mach.id,test.id,lv.lv,d.date));});
  renderDataGrid();
}

/* ══════ BATCH GENERATOR ══════ */
function showBatchModal(){document.getElementById('batch-modal').classList.remove('hidden');renderBatchForm();}
function hideBatchModal(){document.getElementById('batch-modal').classList.add('hidden');}

function renderBatchForm(){
  const c=document.getElementById('batch-machine-checks');
  c.innerHTML='<label style="display:flex;gap:6px;align-items:center;margin-bottom:6px;font-weight:600"><input type="checkbox" id="batch-all" onchange="document.querySelectorAll(\'.batch-mch\').forEach(c=>c.checked=this.checked)" checked> Tutti gli analizzatori</label>'+
    state.machines.map((m,i)=>`<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" class="batch-mch" value="${i}" checked> <span style="color:${m.color}">●</span> ${m.name} (${m.tests.filter(t=>t.active).length} test attivi)</label>`).join('');
  const cy=new Date().getFullYear();
  document.getElementById('batch-year-from').value=cy;
  document.getElementById('batch-year-to').value=cy;
  document.getElementById('batch-progress').innerHTML='';
  document.getElementById('batch-go-btn').disabled=false;
}

function runBatchGeneration(){
  const selected=[];document.querySelectorAll('.batch-mch:checked').forEach(c=>selected.push(parseInt(c.value)));
  if(!selected.length){alert('Selezionare almeno un analizzatore.');return;}
  const yf=parseInt(document.getElementById('batch-year-from').value),yt=parseInt(document.getElementById('batch-year-to').value);
  if(isNaN(yf)||isNaN(yt)||yf>yt){alert('Intervallo anni non valido.');return;}
  if(yt-yf>10){alert('Massimo 10 anni.');return;}
  const mf=parseInt(document.getElementById('batch-month-from').value),mt=parseInt(document.getElementById('batch-month-to').value);
  const overwrite=document.getElementById('batch-overwrite').checked;
  const operator=getOp()||'Batch';

  // Build task list, grouped by machine+month for altered selection
  const tasks=[];
  for(let y=yf;y<=yt;y++){
    const ms=(y===yf)?mf:0, me=(y===yt)?mt:11;
    for(let mo=ms;mo<=me;mo++){
      const wd=getWorkingDays(y,mo);
      selected.forEach(idx=>{
        const m=state.machines[idx];
        // Collect all slots for this machine+month
        const machTasks=[];
        m.tests.filter(t=>t.active).forEach(t=>{
          t.levels.forEach(lv=>{
            wd.forEach(d=>machTasks.push({machId:m.id,testId:t.id,lv:lv.lv,date:d.date,mean:lv.mean,sd:lv.sd,altered:false}));
          });
        });
        // Pick 3-4 random slots to be altered
        const numAlt=Math.min(3+Math.floor(Math.random()*2),machTasks.length);
        const altSet=new Set();
        while(altSet.size<numAlt&&altSet.size<machTasks.length){altSet.add(Math.floor(Math.random()*machTasks.length));}
        altSet.forEach(i=>{machTasks[i].altered=true;});
        tasks.push(...machTasks);
      });
    }
  }

  const total=tasks.length;
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
    else{saveData();btn.disabled=false;prog.innerHTML=`<div style="padding:12px;background:var(--success-pale);border-radius:8px;color:var(--success);font-weight:600">✅ ${gen} valori CQ generati${skip?' ('+skip+' saltati)':''}</div>`;}
  }
  requestAnimationFrame(chunk);
}
