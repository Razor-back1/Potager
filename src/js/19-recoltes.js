/* ================= Récoltes ================= */
function plantings(){const out=[];plantables().forEach(o=>{const bu=blockUntil(o);o.zones.forEach((z,zi)=>{const p=P[z.crop];if(!p)return;const g=zoneGrid(o,z),by={};
  for(const k in z.cells)(by[z.cells[k]]=by[z.cells[k]]||[]).push(k);
  for(const d in by){const hv=p.fl?bloomStart(d,p):addD(d,p.j);out.push({o,z,zi,p,d,n:by[d].length*g.per,hv,bu,left:days(TODAY,hv),prog:clamp(days(parse(d),TODAY)/Math.max(1,p.fl?days(parse(d),hv):p.j),0,1)})}})});
  return out.sort((a,b)=>a.hv-b.hv)}
function hvRow(x){const due=x.bu&&x.left<=0?`<span class="due blocked">bloquée<br>→ ${fdate(x.bu)}</span>`:`<span class="due ${x.left<=0?'ready':''}">${x.left<=0?(x.left<-14?'prête depuis<br>'+(-x.left)+' j':'prête'):'dans<br>'+x.left+' j'}</span>`;
  return`<button class="hv" data-open="${x.o.id}" data-zi="${x.zi}">${ring(x.prog,x.p.id,x.left<=0&&!x.bu)}<span style="min-width:0"><span class="t">${x.p.n}</span> <span class="s">· ${esc(fullName(x.o))} · ≈ ${x.n} plant${x.n>1?'s':''}</span>
  <span class="s" style="display:block">Semé le ${fdate(parse(x.d))} → récolte ${fdate(x.hv)}${x.bu?' · traitement en cours':''}</span><span class="bar"><span style="width:${Math.round(x.prog*100)}%"></span></span></span>${due}</button>`}
let hvYear=YEAR;
function carnetHTML(){const fl=FLW(),U=fl?'tiges':'kg',L=fl?{title:'Carnet de coupes',kinds:'Fleurs coupées',count:'Coupes',by:'Par fleur',bed:'Par massif',col:'Fleur'}:{title:'Carnet de récolte',kinds:'Cultures récoltées',count:'Pesées',by:'Par culture',bed:'Par planche',col:'Culture'};
  const H=allHarvests(),yrs=[...new Set([YEAR,...H.map(h=>h.y)])].sort((a,b)=>b-a);
  const cur=H.filter(h=>h.y===hvYear),tot=cur.reduce((s,h)=>s+h.kg,0);
  const byCrop={},byBed={};cur.forEach(h=>{byCrop[h.crop]=(byCrop[h.crop]||0)+h.kg;byBed[fullName(h.o)]=(byBed[fullName(h.o)]||0)+h.kg});
  const cs=Object.entries(byCrop).sort((a,b)=>b[1]-a[1]),bs=Object.entries(byBed).sort((a,b)=>b[1]-a[1]),mx=cs.length?cs[0][1]:1,mb=bs.length?bs[0][1]:1;
  const cmpY=yrs.slice(0,3).sort((a,b)=>a-b),cmpCrops=[...new Set(H.filter(h=>cmpY.includes(h.y)).map(h=>h.crop))];
  const cell=(c,y)=>H.filter(h=>h.crop===c&&h.y===y).reduce((s,h)=>s+h.kg,0);
  const last=cur.slice().sort((a,b)=>b.d.localeCompare(a.d)).slice(0,8);
  return`   <div class="stack"><div class="section-t"><h2>${L.title}</h2></div>
     <div class="seg">${yrs.map(y=>`<button data-hy="${y}" aria-pressed="${y===hvYear}">${y}</button>`).join('')}</div>
     <div class="stats"><div class="stat"><span class="lbl">Total ${hvYear}</span><span class="v">${num(tot,fl?0:1)} <small>${U}</small></span></div><div class="stat"><span class="lbl">${L.kinds}</span><span class="v">${cs.length}</span></div><div class="stat"><span class="lbl">${L.count}</span><span class="v">${cur.length}</span></div></div>
     ${cs.length?`<div><span class="lbl">${L.by}</span><div class="hbars" style="margin-top:8px">${cs.map(([c,kg])=>`<div class="hbar"><span>${P[c]?P[c].n:c}</span><span class="track"><span style="width:${kg/mx*100}%;background:${P[c]?P[c].c:'var(--accent)'}"></span></span><span class="val">${num(kg,fl?0:1)} ${U}</span></div>`).join('')}</div></div>
     <div><span class="lbl">${L.bed}</span><div class="hbars" style="margin-top:8px">${bs.map(([b,kg])=>`<div class="hbar"><span>${esc(b)}</span><span class="track"><span style="width:${kg/mb*100}%;background:var(--accent)"></span></span><span class="val">${num(kg,fl?0:1)} ${U}</span></div>`).join('')}</div></div>`:`${emptyHTML('basket','Aucune pesée en '+hvYear+'. Ajoute une récolte avec le bouton Noter.')}`}
     ${cmpCrops.length&&cmpY.length>1?`<div><span class="lbl">Comparaison des saisons (${U})</span><div class="tblwrap" style="margin-top:8px"><table class="cmp"><thead><tr><th>${L.col}</th>${cmpY.map(y=>`<th>${y}</th>`).join('')}</tr></thead><tbody>${cmpCrops.map(c=>`<tr><td>${P[c]?P[c].n:c}</td>${cmpY.map((y,i)=>{const v=cell(c,y),pv=i?cell(c,cmpY[i-1]):0;return`<td class="${i&&v&&pv?(v>pv?'up':v<pv?'down':''):''}">${v?num(v):'—'}</td>`}).join('')}</tr>`).join('')}</tbody></table></div></div>`:''}
   </div>
   ${last.length?`<div><span class="lbl">Dernières ${fl?'coupes':'récoltes'}</span><div class="jlist" style="margin-top:8px">${last.map(h=>`<div class="jent"><span class="d">${fdate(parse(h.d))}</span><div style="min-width:0">${ci(h.crop)} <b>${P[h.crop]?P[h.crop].n:h.crop}</b> · <span class="mono">${num(h.kg,fl?0:1)} ${U}</span><div class="note">${esc(fullName(h.o))}</div></div><span></span></div>`).join('')}</div></div>`:''}
   <button class="btn small" data-hq="1" style="justify-self:start">+ Noter ${fl?'une coupe':'une récolte'}</button>`}
function allHarvests(){const out=[];plantables().forEach(o=>(o.journal||[]).forEach(e=>{if(e.k==='recolte'&&e.kg>0)out.push({o,crop:e.crop,kg:+e.kg,d:e.d,y:parse(e.d).getFullYear()})}));return out}
function renderBlooms(){const all=plantings(),mo=TODAY.getMonth()+1,v=$('#v-harvest');
  const now=all.filter(x=>{const b=bloomState(x);return b&&b.k==='bloom'}),soon=all.filter(x=>x.left>0&&x.left<=60).sort((a,b)=>a.left-b.left);
  const species=[...new Map(all.map(x=>[x.p.id,x.p])).values()].sort((a,b)=>Math.min(...a.fl)-Math.min(...b.fl));
  const cuts=[];allObjs().forEach(o=>(o.journal||[]).forEach(e=>{if(e.k==='recolte'&&parse(e.d).getFullYear()===YEAR)cuts.push({o,e})}));
  const byF={};cuts.forEach(({e})=>{byF[e.crop]=(byF[e.crop]||0)+(+e.kg||0)});const totC=cuts.reduce((a,{e})=>a+(+e.kg||0),0);
  const r=x=>{const b=bloomState(x);return`<button class="hv" data-open="${x.o.id}" data-zi="${x.zi}">${ring(b.k==='bloom'?1:x.prog,x.p.id,b.k==='bloom')}<span><span class="t">${x.p.n}</span> <span class="s">· ${esc(fullName(x.o))}</span><span class="s" style="display:block">${b.long}${x.p.cut?' · à couper':''}</span></span><span class="due ${b.k==='bloom'?'ready':''}">${b.k==='bloom'?'en fleur':b.k==='wait'?'dans<br>'+x.left+' j':b.short}</span></button>`};
  v.innerHTML=`<div class="page"><div><h2>Floraisons</h2><span class="note">${now.length?now.length+' en fleur en '+MONTHS[mo-1]:'Rien en fleur en '+MONTHS[mo-1]}</span></div>
  ${now.length?`<div class="stack"><span class="lbl">En fleur maintenant</span><div class="hvlist">${now.map(r).join('')}</div></div>`:''}
  ${soon.length?`<div class="stack"><span class="lbl">Bientôt</span><div class="hvlist">${soon.map(r).join('')}</div></div>`:''}
  ${species.length?`<div class="stack"><span class="lbl">Calendrier de floraison</span><div class="bloomcal"><div class="bch"><span></span>${MSHORT.map((l,i)=>`<span class="${i+1===mo?'now':''}">${l}</span>`).join('')}</div>${species.map(p=>`<div class="bcr"><span class="bn">${ci(p.id)}${p.n}</span>${MSHORT.map((l,i)=>`<span class="${i+1===mo?'now':''}">${p.fl.includes(i+1)?`<i style="background:${p.c}"></i>`:''}</span>`).join('')}</div>`).join('')}</div></div>`:emptyHTML('sprout','Aucune fleur plantée pour l\'instant. Ouvre un massif pour choisir quoi y mettre.')}
  ${carnetHTML()}
  <p class="note">Dates indicatives pour la Belgique : la floraison dépend de l'exposition et de la météo de l'année.</p></div>`}
function renderHarvest(){if(FLW())return renderBlooms();
  const all=plantings(),ready=all.filter(x=>x.left<=0),soon=all.filter(x=>x.left>0),mo=TODAY.getMonth()+1;
  const H=allHarvests(),yrs=[...new Set([YEAR,...H.map(h=>h.y)])].sort((a,b)=>b-a);
  const cur=H.filter(h=>h.y===hvYear),tot=cur.reduce((s,h)=>s+h.kg,0);
  const byCrop={},byBed={};cur.forEach(h=>{byCrop[h.crop]=(byCrop[h.crop]||0)+h.kg;byBed[fullName(h.o)]=(byBed[fullName(h.o)]||0)+h.kg});
  const cs=Object.entries(byCrop).sort((a,b)=>b[1]-a[1]),bs=Object.entries(byBed).sort((a,b)=>b[1]-a[1]),mx=cs.length?cs[0][1]:1,mb=bs.length?bs[0][1]:1;
  const cmpY=yrs.slice(0,3).sort((a,b)=>a-b),cmpCrops=[...new Set(H.filter(h=>cmpY.includes(h.y)).map(h=>h.crop))];
  const cell=(c,y)=>H.filter(h=>h.crop===c&&h.y===y).reduce((s,h)=>s+h.kg,0);
  const sow=PLANTS.filter(p=>p.m.includes(mo));
  $('#v-harvest').innerHTML=`<div class="page">
   <h2>Récoltes</h2>
   <div class="stack"><div class="section-t"><span class="lbl">Prêt à récolter</span><span class="mono note">${ready.length}</span></div>
   ${ready.length?`<div class="hvlist">${ready.map(hvRow).join('')}</div><p class="note">Une fois récolté, note le poids dans le journal de la planche puis retire les cases pour libérer la place.</p>`:`<p class="note">Rien n'est encore à maturité.</p>`}</div>
   <div class="stack"><div class="section-t"><span class="lbl">À venir</span><span class="mono note">${soon.length}</span></div>
   ${soon.length?`<div class="hvlist">${soon.map(hvRow).join('')}</div>`:`${emptyHTML('sprout','Aucune récolte en attente. Plante une case dans une planche pour voir apparaître sa date ici.')}`}</div>
   <div class="stack"><span class="lbl">À semer ou planter en ${MONTHS[mo-1]}</span><div class="chips">${sow.map(p=>chip(p.id)).join('')||'<span class="note">Rien de prévu ce mois-ci.</span>'}</div></div>
   ${carnetHTML()}
  </div>`;
}
$('#v-harvest').addEventListener('click',e=>{const y=e.target.closest('[data-hy]');if(y){hvYear=+y.dataset.hy;return renderHarvest()}if(e.target.closest('[data-hq]'))return openQ('harvest');const b=e.target.closest('[data-open]');if(b)openBed(b.dataset.open,+b.dataset.zi)});

