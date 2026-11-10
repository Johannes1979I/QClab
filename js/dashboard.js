/* dashboard.js — schede di stato degli analizzatori + selettore del mese */

function renderDashboard(){
  const grid=document.getElementById('machine-cards');if(!grid)return;
  const wd=getWorkingDays(state.year,state.month);
  if(!state.machines.length){grid.innerHTML='<div class="empty-msg">Nessun analizzatore configurato: aggiungilo in Impostazioni.</div>';return;}

  grid.innerHTML=state.machines.map((m,mi)=>{
    const activeTests=m.tests.filter(t=>t.active);
    let totalSlots=0,filled=0,warn=0,reject=0;
    activeTests.forEach(t=>{t.levels.forEach(lv=>{
      const tl=qcTally(m.id,t,lv,wd);
      totalSlots+=wd.length;filled+=wd.length-tl.missing;warn+=tl.warn;reject+=tl.reject;
    });});
    const pct=totalSlots?Math.round(filled/totalSlots*100):0;
    const cardSt=reject>0?'status-alarm':warn>0?'status-warn':filled>0?'status-ok':'status-empty';

    // calibrazioni del mese
    const calSt=getCalibrationStatus(m.id,state.year,state.month);
    const calDonePct=calSt.total?Math.round(calSt.done/calSt.total*100):0;
    const calColor=calSt.fail>0?'var(--danger)':calSt.warn>0?'var(--warning)':calSt.done===calSt.total&&calSt.total>0?'var(--success)':'var(--text-muted)';
    const col=safeColor(m.color);

    return `<div class="machine-card ${cardSt}" style="--mc:${col}" onclick="openMachineData(${mi})" title="Apri l'inserimento CQ di ${escHtml(m.name)}">
      <div class="machine-card-header">
        <span class="machine-icon">${escHtml(m.icon||'')}</span>
        <div class="machine-title"><div class="machine-name">${escHtml(m.name)}</div><div class="machine-type">${escHtml(m.type)}</div></div>
        <div class="machine-status-dot" title="${reject?'Ci sono rigetti':warn?'Ci sono avvisi 1-2s':filled?'Tutto conforme':'Nessun dato'}"></div>
      </div>
      <div class="machine-stats">
        <div class="machine-stat"><div class="machine-stat-val">${activeTests.length}</div><div class="machine-stat-label">Test attivi</div></div>
        <div class="machine-stat"><div class="machine-stat-val">${filled}/${totalSlots}</div><div class="machine-stat-label">CQ</div></div>
        <div class="machine-stat"><div class="machine-stat-val ${reject?'alarm-text':''}">${reject}</div><div class="machine-stat-label">Rigetti</div></div>
      </div>
      <div class="machine-stats">
        <div class="machine-stat"><div class="machine-stat-val" style="color:${calColor}">${calSt.done}/${calSt.total}</div><div class="machine-stat-label">Calibraz.</div></div>
        <div class="machine-stat"><div class="machine-stat-val" style="color:${calSt.fail?'var(--danger)':'var(--success)'}">${calSt.fail}</div><div class="machine-stat-label">Cal. fallite</div></div>
        <div class="machine-stat"><div class="machine-stat-val">${calDonePct}%</div><div class="machine-stat-label">Eseguite</div></div>
      </div>
      <div class="machine-lots"><span class="lot-tag">Cal: ${escHtml(m.calLot||'—')}</span>${m.calExpiry?`<span class="lot-tag">Scad. ${escHtml(fmtDateIt(m.calExpiry))}</span>`:''}</div>
      <div class="progress"><div class="progress-bar" style="width:${pct}%;background:${col}"></div></div>
      <div class="progress-pct">${pct}% CQ del mese inseriti${warn?' — '+warn+' avvisi 1-2s':''}</div>
    </div>`;
  }).join('');
}
function openMachineData(i){selMachIdx=i;selTestIdx=0;showSection('data');}

/* AAAA-MM-GG → GG/MM/AAAA senza passare da new Date('AAAA-MM-GG'), che e' UTC */
function fmtDateIt(s){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||''));return m?m[3]+'/'+m[2]+'/'+m[1]:String(s||'');}

function renderMonthSelector(){
  document.getElementById('month-display').textContent=MONTH_NAMES[state.month]+' '+state.year;
}
function prevMonth(){state.month--;if(state.month<0){state.month=11;state.year--;}renderMonthSelector();refreshCurrentSection();}
function nextMonth(){state.month++;if(state.month>11){state.month=0;state.year++;}renderMonthSelector();refreshCurrentSection();}
