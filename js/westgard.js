/* westgard.js — regole di Westgard multiple (10/11/2026)
   Prima il programma controllava ogni valore da solo (1-2s avviso, 1-3s rigetto): una serie di valori tutti
   sopra la media, due valori consecutivi oltre +2DS o due livelli opposti nello stesso giorno restavano «PASS».
   Ora, per ogni valore inserito:
     1-3s  il valore è oltre ±3 DS                                                   → RIGETTO
     2-2s  il valore e il precedente dello stesso livello (o un altro livello dello
           stesso giorno) sono oltre 2 DS dalla stessa parte                         → RIGETTO
     R-4s  nello stesso giorno un livello è oltre +2 DS e un altro oltre -2 DS       → RIGETTO
     4-1s  il valore e i 3 precedenti dello stesso livello sono oltre 1 DS dalla
           stessa parte                                                              → RIGETTO
     10x   il valore e i 9 precedenti dello stesso livello stanno dalla stessa
           parte della media                                                         → RIGETTO
     1-2s  il valore è oltre ±2 DS ma nessuna regola di rigetto è violata            → AVVISO
   «Precedente» = valore registrato prima, anche nei mesi precedenti (i giorni senza valore si saltano).
   La distanza dalla media in DS (z) viene arrotondata a 9 decimali: con i numeri decimali del computer
   un valore esattamente a 2 DS (es. 7,2 + 2×0,5 = 8,2) dava z = 1,9999999999999982 o 2,0000000000000018
   a seconda dei numeri, quindi lo stesso caso limite poteva cambiare esito. */

/* distanza dalla media in numero di DS; null se valore o target non sono utilizzabili */
function qcZ(value,mean,sd){
  const v=typeof value==='string'?parseFloat(value):value;
  const m=+mean,s=+sd;
  if(v==null||!isFinite(v)||!isFinite(m)||!isFinite(s)||s<=0)return null;
  return Math.round((v-m)/s*1e9)/1e9;
}

/* indice: "MACCHINA|TEST|LIVELLO" → date ordinate dei valori registrati (ricostruito dopo ogni salvataggio) */
let _qcIdx=null;
function qcInvalidate(){_qcIdx=null;}
function _qcIndex(){
  if(_qcIdx)return _qcIdx;
  const idx=new Map();
  for(const k in state.readings){
    const p=k.split('|');if(p.length!==4)continue;
    const g=p[0]+'|'+p[1]+'|'+p[2];
    let a=idx.get(g);if(!a){a=[];idx.set(g,a);}
    a.push(p[3]);
  }
  idx.forEach(a=>a.sort());
  _qcIdx=idx;return idx;
}
/* z dei valori registrati PRIMA di dateStr per lo stesso livello, dal più recente (al massimo n) */
function _qcPrevZ(machId,testId,lvDef,dateStr,n){
  const a=_qcIndex().get(machId+'|'+testId+'|'+lvDef.lv);if(!a)return [];
  let lo=0,hi=a.length;
  while(lo<hi){const mid=(lo+hi)>>1;if(a[mid]<dateStr)lo=mid+1;else hi=mid;}
  const out=[];
  for(let i=lo-1;i>=0&&out.length<n;i--){
    const r=state.readings[machId+'|'+testId+'|'+lvDef.lv+'|'+a[i]];
    const z=r?qcZ(r.value,lvDef.mean,lvDef.sd):null;
    if(z!=null)out.push(z);
  }
  return out;
}

/* valutazione completa di un valore: {status:'pass'|'warning'|'reject'|'missing', rule:'2-2s R-4s', rules:[...]} */
function evalQCMulti(machId,test,lvDef,dateStr){
  const r=getReading(machId,test.id,lvDef.lv,dateStr);
  if(!r||r.value==null||isNaN(r.value))return {status:'missing',rule:'',rules:[]};
  const z=qcZ(r.value,lvDef.mean,lvDef.sd);
  if(z==null)return {status:'warning',rule:'DS non valida',rules:[]};
  const az=Math.abs(z),sgn=Math.sign(z),rules=[];
  const add=x=>{if(!rules.includes(x))rules.push(x);};
  if(az>3)add('1-3s');
  // nello stesso giorno, fra i livelli dello stesso test
  if(az>2){
    (test.levels||[]).forEach(o=>{
      if(o.lv===lvDef.lv)return;
      const ro=getReading(machId,test.id,o.lv,dateStr);if(!ro)return;
      const zo=qcZ(ro.value,o.mean,o.sd);if(zo==null||Math.abs(zo)<=2)return;
      add(Math.sign(zo)===sgn?'2-2s':'R-4s');
    });
  }
  // fra i giorni, sullo stesso livello
  const prev=_qcPrevZ(machId,test.id,lvDef,dateStr,9);
  if(az>2&&prev.length>=1&&Math.abs(prev[0])>2&&Math.sign(prev[0])===sgn)add('2-2s');
  if(az>1&&prev.length>=3&&prev.slice(0,3).every(p=>Math.abs(p)>1&&Math.sign(p)===sgn))add('4-1s');
  if(sgn!==0&&prev.length>=9&&prev.slice(0,9).every(p=>Math.sign(p)===sgn))add('10x');
  if(rules.length)return {status:'reject',rule:rules.join(' '),rules};
  if(az>2)return {status:'warning',rule:'1-2s',rules:['1-2s']};
  return {status:'pass',rule:'',rules:[]};
}

/* conteggio per un insieme di giorni: {pass,warn,reject,missing} */
function qcTally(machId,test,lvDef,days){
  const t={pass:0,warn:0,reject:0,missing:0};
  days.forEach(d=>{
    const e=evalQCMulti(machId,test,lvDef,d.date);
    if(e.status==='pass')t.pass++;else if(e.status==='warning')t.warn++;else if(e.status==='reject')t.reject++;else t.missing++;
  });
  return t;
}

/* statistiche dei valori del mese: n, media, DS (campionaria, n-1), CV%, min, max */
function qcStats(values){
  const v=values.filter(x=>x!=null&&isFinite(x));
  const n=v.length;if(!n)return {n:0};
  const mean=v.reduce((s,x)=>s+x,0)/n;
  const sd=n>1?Math.sqrt(v.reduce((s,x)=>s+(x-mean)*(x-mean),0)/(n-1)):null;
  const cv=sd!=null&&mean!==0?Math.abs(sd/mean*100):null;
  return {n,mean,sd,cv,min:Math.min(...v),max:Math.max(...v)};
}

/* etichetta breve dello stato per tabelle e badge */
function qcBadge(ev){
  if(ev.status==='reject')return '<span class="status-badge st-alarm" title="Rigetto: '+escHtml(ev.rule)+'">✖ '+escHtml(ev.rule)+'</span>';
  if(ev.status==='warning')return '<span class="status-badge st-warn" title="Avviso">⚠ '+escHtml(ev.rule)+'</span>';
  if(ev.status==='pass')return '<span class="status-badge st-ok">PASS</span>';
  return '<span class="status-badge st-miss">—</span>';
}
