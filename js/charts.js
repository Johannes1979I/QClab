/* charts.js — grafici di Levey-Jennings (un grafico per test e livello) + riepilogo del mese.
   Prima venivano disegnati insieme tutti i grafici di tutti gli analizzatori (oltre 150 su telefono):
   ora si sceglie l'analizzatore (o «Tutti»). */

const chartInstances={};
let chartMachIdx=0; // -1 = tutti

function selectChartMachine(i){chartMachIdx=i;renderAllCharts();}

function renderAllCharts(){
  const c=document.getElementById('charts-container');if(!c)return;
  if(typeof Chart==='undefined'){c.innerHTML='<div class="empty-msg">Libreria dei grafici non caricata.</div>';return;}
  Object.keys(chartInstances).forEach(k=>{try{chartInstances[k].destroy();}catch(e){}delete chartInstances[k];});
  if(!state.machines.length){c.innerHTML='<div class="empty-msg">Nessun analizzatore configurato.</div>';return;}
  if(chartMachIdx>=state.machines.length)chartMachIdx=0;
  const wd=getWorkingDays(state.year,state.month);

  let h='<div class="pill-tabs">'+
    `<button class="pill-tab ${chartMachIdx===-1?'active':''}" onclick="selectChartMachine(-1)"><i data-lucide="layers"></i>Tutti</button>`+
    state.machines.map((m,i)=>`<button class="pill-tab ${i===chartMachIdx?'active':''}" style="--fc:${safeColor(m.color)}" onclick="selectChartMachine(${i})"><span class="dot" style="background:${safeColor(m.color)}"></span>${escHtml(m.name)}</button>`).join('')+'</div>';
  h+=`<div class="chart-legend">
    <span><span class="dot" style="background:#17a06b"></span>conforme</span>
    <span><span class="dot" style="background:#e69516"></span>avviso 1-2s</span>
    <span><span class="dot" style="background:#d94545"></span>rigetto (1-3s, 2-2s, R-4s, 4-1s, 10x)</span>
    <span>linee: media, ±1 DS, ±2 DS, ±3 DS</span></div>`;

  // riepilogo del mese (tutti gli analizzatori)
  h+='<div class="chart-card" style="margin-bottom:14px"><div class="chart-title">Riepilogo conformità — '+MONTH_NAMES[state.month]+' '+state.year+' <small>(tutti gli analizzatori)</small></div><div class="chart-box"><canvas id="ch-overview"></canvas></div></div>';

  const macchine=chartMachIdx===-1?state.machines:[state.machines[chartMachIdx]];
  const plan=[];
  macchine.forEach(m=>{
    const active=m.tests.filter(t=>t.active);
    if(!active.length){h+=`<div class="empty-msg">${escHtml(m.name)}: nessun test attivo.</div>`;return;}
    h+=`<div class="chart-machine-group"><div class="chart-machine-title" style="color:${safeColor(m.color)}"><span>${escHtml(m.icon||'')}</span>${escHtml(m.name)}</div><div class="chart-grid">`;
    active.forEach(t=>{
      t.levels.forEach(lv=>{
        const cid='ch_'+plan.length;
        plan.push({cid,m,t,lv});
        h+=`<div class="chart-card"><div class="chart-title">${escHtml(t.name)} — livello ${escHtml(lv.name)} (${escHtml(t.unit)}) <small>media ${escHtml(lv.mean)} ± ${escHtml(lv.sd)}</small></div><div class="chart-box"><canvas id="${cid}"></canvas></div></div>`;
      });
    });
    h+='</div></div>';
  });
  c.innerHTML=h;

  const ref=(v,col,dash)=>({data:wd.map(()=>v),borderColor:col,borderDash:dash,borderWidth:1,pointRadius:0,fill:false});
  plan.forEach(({cid,m,t,lv})=>{
    const canvas=document.getElementById(cid);if(!canvas)return;
    const col=safeColor(m.color);
    const labels=[],data=[],pc=[],rules=[];
    wd.forEach(d=>{
      labels.push(d.dayNum+'/'+(state.month+1));
      const r=getReading(m.id,t.id,lv.lv,d.date);
      const ev=evalQCMulti(m.id,t,lv,d.date);
      rules.push(ev.rule);
      if(r&&r.value!=null&&!isNaN(r.value)){data.push(r.value);pc.push(ev.status==='reject'?'#d94545':ev.status==='warning'?'#e69516':'#17a06b');}
      else{data.push(null);pc.push('#c5cfdd');}
    });
    const mean=+lv.mean,sd=+lv.sd;
    chartInstances[cid]=new Chart(canvas,{type:'line',data:{labels,datasets:[
      {label:t.name,data,borderColor:col,backgroundColor:col,pointBackgroundColor:pc,pointBorderColor:pc,pointRadius:3.5,pointHoverRadius:6,tension:0,fill:false,spanGaps:true,borderWidth:1.5},
      {label:'Media',...ref(mean,'#17a06b',[])},
      {label:'+1 DS',...ref(mean+sd,'#c5cfdd',[2,3])},{label:'-1 DS',...ref(mean-sd,'#c5cfdd',[2,3])},
      {label:'+2 DS',...ref(mean+2*sd,'#e69516',[5,4])},{label:'-2 DS',...ref(mean-2*sd,'#e69516',[5,4])},
      {label:'+3 DS',...ref(mean+3*sd,'#d94545',[7,3])},{label:'-3 DS',...ref(mean-3*sd,'#d94545',[7,3])},
    ]},options:{responsive:true,maintainAspectRatio:false,animation:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>{
        if(ctx.datasetIndex===0){
          if(ctx.parsed.y==null)return 'N/D';
          const z=qcZ(ctx.parsed.y,mean,sd);
          return t.name+': '+ctx.parsed.y+' '+t.unit+(z!=null?' ('+(z>=0?'+':'')+z.toFixed(2)+' DS)':'')+(rules[ctx.dataIndex]?' — '+rules[ctx.dataIndex]:'');
        }
        return ctx.dataset.label+': '+(+ctx.parsed.y.toFixed(4));
      }}}},
      scales:{y:{title:{display:true,text:t.unit}},x:{ticks:{maxRotation:0,autoSkip:true}}}}});
  });

  // riepilogo
  let pass=0,warn=0,rej=0,miss=0;
  state.machines.forEach(m=>{m.tests.filter(t=>t.active).forEach(t=>{t.levels.forEach(lv=>{
    const x=qcTally(m.id,t,lv,wd);pass+=x.pass;warn+=x.warn;rej+=x.reject;miss+=x.missing;
  });});});
  const oc=document.getElementById('ch-overview');
  if(oc) chartInstances['overview']=new Chart(oc,{type:'doughnut',data:{labels:['Conformi','Avviso 1-2s','Rigetto','Mancanti'],
    datasets:[{data:[pass,warn,rej,miss],backgroundColor:['#17a06b','#e69516','#d94545','#c5cfdd'],borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{position:window.innerWidth<640?'bottom':'right'}}}});
}
