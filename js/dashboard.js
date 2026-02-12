/* dashboard.js — Machine Status Cards */

function renderDashboard(){
  const grid=document.getElementById('machine-cards');if(!grid)return;
  const wd=getWorkingDays(state.year,state.month);

  grid.innerHTML=state.machines.map(m=>{
    const activeTests=m.tests.filter(t=>t.active);
    let totalSlots=0,filled=0,pass=0,warn=0,reject=0;
    activeTests.forEach(t=>{t.levels.forEach(lv=>{wd.forEach(d=>{
      totalSlots++;
      const r=getReading(m.id,t.id,lv.lv,d.date);
      if(r){filled++;const ev=evalQC(r.value,lv.mean,lv.sd);if(ev.status==='pass')pass++;else if(ev.status==='warning')warn++;else if(ev.status==='reject')reject++;}
    });});});
    const pct=totalSlots?Math.round(filled/totalSlots*100):0;
    const cardSt=reject>0?'status-alarm':warn>0?'status-warn':filled>0?'status-ok':'status-empty';

    return `<div class="machine-card ${cardSt}" style="--mc:${m.color}">
      <div class="machine-card-header">
        <span class="machine-icon">${m.icon}</span>
        <div class="machine-status-dot"></div>
      </div>
      <div class="machine-name">${m.name}</div>
      <div class="machine-type">${m.type}</div>
      <div class="machine-stats">
        <div class="machine-stat"><div class="machine-stat-val">${activeTests.length}</div><div class="machine-stat-label">Test attivi</div></div>
        <div class="machine-stat"><div class="machine-stat-val">${filled}/${totalSlots}</div><div class="machine-stat-label">CQ</div></div>
        <div class="machine-stat"><div class="machine-stat-val ${reject?'alarm-text':''}">${reject}</div><div class="machine-stat-label">Rigetti</div></div>
      </div>
      <div class="machine-lots">
        <span class="lot-tag">Cal: ${m.calLot||'—'}</span>
      </div>
      <div class="fridge-progress"><div class="fridge-progress-bar" style="width:${pct}%;background:${m.color}"></div></div>
      <div class="fridge-pct">${pct}% completato</div>
    </div>`;
  }).join('');
}

function renderMonthSelector(){
  document.getElementById('month-display').textContent=MONTH_NAMES[state.month]+' '+state.year;
}
function prevMonth(){state.month--;if(state.month<0){state.month=11;state.year--;}renderMonthSelector();const s=document.querySelector('[id^="section-"]:not(.hidden)');if(s)showSection(s.id.replace('section-',''));}
function nextMonth(){state.month++;if(state.month>11){state.month=0;state.year++;}renderMonthSelector();const s=document.querySelector('[id^="section-"]:not(.hidden)');if(s)showSection(s.id.replace('section-',''));}
