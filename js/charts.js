/* charts.js — Levey-Jennings QC Charts */

const chartInstances={};

function renderAllCharts(){
  const c=document.getElementById('charts-container');if(!c)return;
  const wd=getWorkingDays(state.year,state.month);
  let h='';

  // For each machine, show charts for active tests
  state.machines.forEach(m=>{
    const active=m.tests.filter(t=>t.active);
    if(!active.length) return;
    h+=`<div class="chart-machine-group"><h3 style="color:${m.color};margin-bottom:12px">${m.icon} ${m.name}</h3>`;
    active.forEach(t=>{
      t.levels.forEach(lv=>{
        const cid='ch_'+m.id+'_'+t.id+'_'+lv.lv;
        h+=`<div class="chart-card"><div class="chart-title">${t.name} — Livello ${lv.name} (${t.unit}) <small style="color:var(--text-muted)">Media: ${lv.mean} ± ${lv.sd}</small></div><canvas id="${cid}" height="160"></canvas></div>`;
      });
    });
    h+='</div>';
  });

  // Overview doughnut
  h+='<div class="chart-card"><div class="chart-title">Riepilogo Conformità — '+MONTH_NAMES[state.month]+' '+state.year+'</div><canvas id="ch-overview" height="200"></canvas></div>';
  c.innerHTML=h;

  Object.values(chartInstances).forEach(ci=>ci.destroy());

  state.machines.forEach(m=>{
    m.tests.filter(t=>t.active).forEach(t=>{
      t.levels.forEach(lv=>{
        const cid='ch_'+m.id+'_'+t.id+'_'+lv.lv;
        const canvas=document.getElementById(cid);if(!canvas)return;
        const labels=[],data=[],bgColors=[];
        wd.forEach(d=>{
          labels.push(d.dayNum+'/'+(state.month+1));
          const r=getReading(m.id,t.id,lv.lv,d.date);
          if(r){data.push(r.value);const ev=evalQC(r.value,lv.mean,lv.sd);bgColors.push(ev.status==='reject'?'#e74c3c':ev.status==='warning'?'#f39c12':m.color);}
          else{data.push(null);bgColors.push('#ccc');}
        });

        chartInstances[cid]=new Chart(canvas,{type:'line',data:{labels,datasets:[
          {label:t.name+' Lv'+lv.lv,data,borderColor:m.color,backgroundColor:m.color+'18',pointBackgroundColor:bgColors,pointRadius:3,pointHoverRadius:5,tension:0.2,fill:false,spanGaps:false},
          {label:'Media',data:wd.map(()=>lv.mean),borderColor:'#2ecc7144',borderDash:[2,2],pointRadius:0,fill:false},
          {label:'+2SD',data:wd.map(()=>lv.mean+2*lv.sd),borderColor:'#f39c1244',borderDash:[4,4],pointRadius:0,fill:false},
          {label:'-2SD',data:wd.map(()=>lv.mean-2*lv.sd),borderColor:'#f39c1244',borderDash:[4,4],pointRadius:0,fill:false},
          {label:'+3SD',data:wd.map(()=>lv.mean+3*lv.sd),borderColor:'#e74c3c44',borderDash:[6,3],pointRadius:0,fill:false},
          {label:'-3SD',data:wd.map(()=>lv.mean-3*lv.sd),borderColor:'#e74c3c44',borderDash:[6,3],pointRadius:0,fill:false},
        ]},options:{responsive:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>{
          if(ctx.datasetIndex===0)return ctx.parsed.y!=null?t.name+': '+ctx.parsed.y.toFixed(3)+' '+t.unit:'N/D';
          return ctx.dataset.label+': '+ctx.parsed.y.toFixed(3);
        }}}},scales:{y:{title:{display:true,text:t.unit}}}}});
      });
    });
  });

  // Overview
  let pass=0,warn=0,rej=0,miss=0;
  state.machines.forEach(m=>{m.tests.filter(t=>t.active).forEach(t=>{t.levels.forEach(lv=>{wd.forEach(d=>{
    const r=getReading(m.id,t.id,lv.lv,d.date);
    if(!r)miss++;else{const e=evalQC(r.value,lv.mean,lv.sd);if(e.status==='pass')pass++;else if(e.status==='warning')warn++;else rej++;}
  });});});});
  const oc=document.getElementById('ch-overview');
  if(oc) chartInstances['overview']=new Chart(oc,{type:'doughnut',data:{labels:['Pass','Warning 1-2s','Reject 1-3s','Mancante'],
    datasets:[{data:[pass,warn,rej,miss],backgroundColor:['#27ae60','#f39c12','#e74c3c','#bdc3c7']}]},
    options:{responsive:true,plugins:{legend:{position:'bottom'}}}});
}
