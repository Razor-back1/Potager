/* ================= Aujourd'hui ================= */
function renderToday(){
  const mo=TODAY.getMonth()+1,pl=plantings(),fp=frostPeriod(TODAY);
  const fr=S.frost&&S.frost.d===iso(TODAY)?+S.frost.t:null;
  const pests=pestsNow(),nr=nurseryReady(),act=nurseryActive(),lows=(S.stock||[]).filter(isLow);
  const hasSeeds=id=>(S.stock||[]).some(q=>q.cat==='graine'&&q.crop===id&&stockOf(q)>0&&!expired(q));
  const row=(color,main,sub,right,attrs)=>`<button class="trow" ${attrs}>${/^(#|var\()/.test(color)?`<i style="background:${color}"></i>`:color}<span><b>${main}</b>${sub?` <span class="note">· ${sub}</span>`:''}</span>${right}</button>`;
  /* une section par lieu : plein air, chaque serre */
  const locs=[{key:'out',t:FLW()?'Massifs en plein air':'Planches en plein air',ico:'<path d="M4 20h16M6 20V10M18 20V10M3 10l9-6 9 6"/>',f:o=>!serreOf(o)}];
  S.objs.filter(o=>o.type==='serre').forEach(se=>locs.push({key:se.id,t:se.name,ico:'<path d="M3 20V11a9 9 0 0 1 18 0v9z"/><path d="M12 2v18M3 14h18"/>',f:o=>serreOf(o)===se,serre:true}));
  let nAct=0;const T={rec:[],eau:0,pest:new Set(),sens:0};
  const secs=locs.map(L=>{const pls=plantables().filter(L.f),mine=pl.filter(x=>pls.includes(x.o));
    const ready=mine.filter(x=>x.left<=0&&!x.bu),blocked=mine.filter(x=>x.left<=0&&x.bu),th=pls.filter(o=>thirsty(o));
    const sens=[];pls.forEach(o=>o.zones.forEach(z=>{if(z.crop&&FROST_SENSITIVE.has(z.crop)&&Object.keys(z.cells).length)sens.push({o,z})}));
    const pe=pests.map(p=>({...p,where:p.where.filter(w=>pls.includes(w.o))})).filter(p=>p.where.length);
    const free=[];pls.forEach(o=>o.zones.forEach((z,i)=>{if(!z.crop)free.push({o,i,z})}));
    const c=[];T.rec.push(...ready.map(x=>x.p.n));T.eau+=th.length;pe.forEach(p=>T.pest.add(p.n));T.sens+=sens.length;
    if(fp.lvl>0&&sens.length){const danger=fr!=null&&fr<=2;c.push(`<div class="tcard ${L.serre?'':'frost'}"><h3>Gel${fr!=null?` · ${num(fr)} °C prévus`:''}</h3><span>${L.serre?'Serre non chauffée : protège d\'un voile si une nuit sous −2 °C est annoncée. '+(FLW()?'Plantes sensibles :':'Cultures sensibles :'):danger?(FLW()?'Couvre, rentre ou arrache ce soir :':'Couvre ou rentre ce soir :'):fp.txt+(FLW()?'. Plantes sensibles :':'. Cultures sensibles :')} ${sens.map(x=>`<b>${P[x.z.crop].n.toLowerCase()}</b> (${esc(x.o.name)})`).join(', ')}.</span>${fr==null&&!L.serre?'<button class="btn small" data-tgo="weather" style="justify-self:start">Indiquer le minimum prévu</button>':''}</div>`);nAct++}
    if(FLW()){const bl=mine.filter(x=>{const b=bloomState(x);return b&&b.k==='bloom'}),soon=mine.filter(x=>x.left>0&&x.left<=30);
      const care=[];const seen=new Set();mine.forEach(x=>(x.p.care||[]).forEach(cr=>{if(cr.m.includes(mo)){const k=x.p.id+cr.t;if(seen.has(k)){care.find(q=>q.k===k).where.add(x.o.name);return}seen.add(k);care.push({k,p:x.p,t:cr.t,where:new Set([x.o.name])})}}));
      if(care.length){c.push(`<div class="tcard"><h3>Entretien ce mois-ci <span class="n">${care.length}</span></h3>${care.map(q=>row(ci(q.p.id),q.p.n,[...q.where].map(esc).join(', '),'',`data-open="${mine.find(x=>x.p===q.p).o.id}" data-zi="0"`).replace('</b>','</b><span class="note" style="display:block;color:var(--ink)">'+esc(q.t)+'</span>')).join('')}</div>`);nAct+=care.length}
      if(bl.length)c.push(`<div class="tcard"><h3>En fleur <span class="n">${bl.length}</span></h3>${bl.map(x=>row(ring(1,x.p.id,true),x.p.n,esc(x.o.name),`<span class="due ready">${x.p.cut?'à couper':'en fleur'}</span>`,`data-open="${x.o.id}" data-zi="${x.zi}"`)).join('')}</div>`);
      if(soon.length)c.push(`<div class="tcard"><h3>Bientôt en fleur</h3>${soon.map(x=>row(ring(x.prog,x.p.id,false),x.p.n,esc(x.o.name),`<span class="due">dans<br>${x.left} j</span>`,`data-open="${x.o.id}" data-zi="${x.zi}"`)).join('')}</div>`)}
    else if(ready.length){c.push(`<div class="tcard"><h3>À récolter <span class="n">${ready.length}</span></h3>${ready.map(x=>`<div class="swrap"><div class="swbg ok">Noter la récolte ›</div>${row(ring(1,x.p.id,true),x.p.n,esc(x.o.name),`<span class="due ready">${x.left<-14?'depuis '+(-x.left)+' j':'prêt'}</span>`,`data-open="${x.o.id}" data-zi="${x.zi}" data-sw="h:${x.o.id}:${x.zi}:${x.p.id}"`)}</div>`).join('')}<span class="note swhint">Glisse une ligne vers la gauche pour noter la récolte.</span></div>`);nAct+=ready.length}
    if(blocked.length&&!FLW())c.push(`<div class="tcard"><h3>Récolte à attendre</h3>${blocked.map(x=>row(ring(1,x.p.id,false),x.p.n,esc(x.o.name)+' · délai après traitement',`<span class="due blocked">${fdate(x.bu)}</span>`,`data-open="${x.o.id}" data-zi="${x.zi}"`)).join('')}</div>`);
    if(th.length){c.push(`<div class="tcard urgent"><h3>À arroser <span class="n">${th.length}</span></h3>${th.map(o=>`<div class="swrap"><div class="swbg water">Arrosé ✓</div><div class="trow" data-sw="w:${o.id}"><i style="background:var(--water)"></i><span><b>${esc(o.name)}</b><span class="note" style="display:block">${waterText(lastWater(o))}</span></span><button class="btn small" data-tw="${o.id}">Arrosé</button></div></div>`).join('')}${L.serre?'':'<button class="btn small" data-train="1" style="justify-self:start">Il a plu aujourd\'hui</button>'}</div>`);nAct+=th.length}
    if(pe.length)c.push(`<div class="tcard"><h3>À surveiller</h3>${pe.map(p=>`<div class="pest"><span><b>${p.n}</b> <span class="note">· ${[...new Set(p.where.map(w=>P[w.crop].n.toLowerCase()+' ('+w.o.name+')'))].map(esc).join(', ')}</span></span><span class="note" style="color:var(--ink)">${esc(p.t)}</span></div>`).join('')}</div>`);
    if(free.length)c.push(`<div class="tcard"><h3>Place libre <span class="n">${free.length}</span></h3>${free.map(f=>row('var(--soil)',esc(f.o.name),'zone '+(f.i+1)+', '+m2(f.z.len)+' m','<span class="note">Que planter ? ›</span>',`data-open="${f.o.id}" data-zi="${f.i}"`)).join('')}</div>`);
    return{L,c}}).filter(x=>x.c.length);
  /* semis à l'abri */
  const semis=[];
  if(nr.length){semis.push(`<div class="tcard"><h3>À repiquer <span class="n">${nr.length}</span></h3>${nr.map(n=>row(ci(n.crop,.5,'mid'),P[n.crop].n,n.n+' godets semés le '+fdate(parse(n.d)),'<span class="due ready">prêt</span>','data-tinv="semis"')).join('')}</div>`);nAct+=nr.length}
  const soon=act.filter(n=>readyOf(n)>TODAY).sort((a,b)=>readyOf(a)-readyOf(b));
  if(soon.length)semis.push(`<div class="tcard"><h3>En cours</h3>${soon.map(n=>row(ci(n.crop,.1,'mid'),P[n.crop].n,n.n+' godets','<span class="due">'+fdate(readyOf(n))+'</span>','data-tinv="semis"')).join('')}</div>`);
  const sg=PLANTS.filter(p=>(p.sg||[]).includes(mo));
  if(sg.length)semis.push(`<div class="tcard"><h3>À semer en godets ce mois-ci</h3><div class="chips">${sg.map(p=>`<span class="chip">${ci((p).id)}${p.n}${hasSeeds(p.id)?' <span class="mono note">· graines ✓</span>':''}</span>`).join('')}</div></div>`);
  /* stock et saison */
  const gen=[];
  const sc=succession().filter(x=>x.left<=7);
  if(sc.length){const fz=freeZone(),due=sc.filter(x=>x.left<=0).length;nAct+=due;
    gen.push(`<div class="tcard"><h3>Semis échelonnés${due?` <span class="n">${due}</span>`:''}</h3>${sc.map(x=>row(ci(x.p.id,.5,'mid'),x.p.n,'semé il y a '+x.ago+' j · tous les '+x.int+' j',x.left<=0?'<span class="due ready">à ressemer</span>':'<span class="due">dans<br>'+x.left+' j</span>',fz?`data-open="${fz.o.id}" data-zi="${fz.i}"`:'data-tgo="crops"')).join('')}
    <span class="note">${fz?'Place libre : '+esc(fullName(fz.o))+', zone '+(fz.i+1)+'. Touche une ligne pour y semer.':'Aucune place libre en plein air : libère une zone ou ajoute une planche.'}</span>
    <div class="row">${sc.map(x=>`<button class="btn small" data-succoff="${x.p.id}">Assez ${/^[aeiouyéèêâîh]/i.test(x.p.n)?'d\'':'de '}${esc(x.p.n.toLowerCase())}</button>`).join('')}</div></div>`)}
  if(lows.length)gen.push(`<div class="tcard"><h3>À racheter <span class="n">${lows.length}</span></h3><div class="chips">${lows.map(p=>`<span class="chip">${seedLabel(p)} · ${fq(stockOf(p),p.unit)}</span>`).join('')}</div><div class="row">${lows.some(p=>p.cat==='graine')?'<button class="btn small" data-tinv="graines">Graines</button>':''}${lows.some(p=>p.cat!=='graine')?'<button class="btn small" data-tinv="produits">Produits</button>':''}</div></div>`);
  const sow=PLANTS.filter(p=>p.m.includes(mo));
  gen.push(`<div class="tcard"><h3>À semer ou planter en place ce mois-ci</h3><div class="chips">${sow.map(p=>`<span class="chip">${ci((p).id)}${p.n}${hasSeeds(p.id)?' <span class="mono note">· graines ✓</span>':''}</span>`).join('')||'<span class="note">Rien ce mois-ci.</span>'}</div><button class="btn small" data-tgo="crops" style="justify-self:start">Voir les cultures</button></div>`);
  const sec=(t,ico,cards,n,id)=>`<section class="tsec" id="ts-${id}"><div class="tsec-h"><svg viewBox="0 0 24 24">${ico}</svg><h2>${esc(t)}</h2>${n?`<span class="n">${n}</span>`:''}</div>${cards.join('')}</section>`;
  const count=c=>c.length;
  const dTxt=TODAY.toLocaleDateString('fr-BE',{weekday:'long',day:'numeric',month:'long'});
  const wT=wx&&(wx.now&&wx.now.t!=null?wx.now.t:wx.cur?wx.cur.t:null),wK=wx&&wx.cur&&wx.cur.code!=null?wxKind(wx.cur.code):null,wR=wx&&wx.now&&wx.now.rain!=null?wx.now.rain:null,nt=wx&&wx.night!=null?wx.night:fr;
  const tile=(cls,ico,lbl,big,sm,attr)=>`<button class="tt ${cls}" ${attr||''}><span class="tl"><svg viewBox="0 0 24 24" aria-hidden="true">${ico}</svg>${lbl}</span><span><span class="big">${big}</span><span class="sm">${sm}</span></span></button>`;
  const recU=[...new Set(T.rec)],pl2=a=>a.slice(0,2).join(', ').toLowerCase()+(a.length>2?', +'+(a.length-2):''),j0=secs.length?`data-tj="${secs[0].L.key}"`:'';
  const tsum=`<div class="thero"><span>${dTxt[0].toUpperCase()+dTxt.slice(1)}</span><b>${nAct?nAct+' chose'+(nAct>1?'s':'')+'<br>à faire':'Rien<br>d\'urgent'}</b></div><div class="tsum">${
    tile('t-wx','<path d="M7 18a4 4 0 1 1 1-7.9A5 5 0 0 1 18 12a3 3 0 0 1 0 6z"/>','Météo',wT!=null?num(wT,0)+'°':'–',[wK?WX_TXT[wK]:'',wR?num(wR,1)+' mm':''].filter(Boolean).join(' · ')||'pas de données','data-tgo="weather"')}${
    tile('t-gel'+(nt!=null&&nt<=2?' cold':''),'<path d="M12 2v20M4 7l16 10M20 7L4 17"/>','Gel',nt!=null?num(nt,0)+'°':'–',nt!=null?'cette nuit'+(T.sens?' · '+T.sens+' sensible'+(T.sens>1?'s':''):''):fp.lvl>0?'période de gelées':'pas de risque','data-tgo="weather"')}${
    tile('t-rec','<path d="M5 9h14l-1.5 10.5a2 2 0 0 1-2 1.5h-7a2 2 0 0 1-2-1.5z"/><path d="M9 9l3-5 3 5"/>',FLW()?'À couper':'Récolter',T.rec.length,pl2(recU)||'rien de prêt',j0)}${
    tile('t-eau','<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>','Arrosage',T.eau,T.eau?(T.eau>1?'planches':'planche')+' à arroser':wR?'pluie suffisante':'rien à arroser','data-tgo="weather"')}${
    tile('t-pest','<ellipse cx="12" cy="14" rx="5" ry="6"/><path d="M12 8V5M7 12H4M20 12h-3M7 16H4M20 16h-3"/>','Surveiller',T.pest.size,pl2([...T.pest])||'rien à signaler',j0)}</div>`;
  $('#v-today').innerHTML=`<div class="ptr" id="ptr"><span class="spin"></span><span id="ptrt">Tire pour actualiser la météo</span></div><div class="page"><div class="ttitle"><h2>Aujourd'hui</h2><span class="note">${TODAY.toLocaleDateString('fr-BE',{weekday:'long',day:'numeric',month:'long'})} · ${nAct?nAct+' chose'+(nAct>1?'s':'')+' à faire':'rien d\'urgent'}</span></div>
  ${tsum}
  <div class="bednav">${secs.map(x=>`<button data-tj="${x.L.key}">${esc(x.L.t)}</button>`).join('')}${semis.length?'<button data-tj="semis">Semis</button>':''}<button data-tj="gen">Stock et saison</button></div>
  ${inviteBanner()}
  ${weatherHero()}
  ${autoCard(true)}
  ${secs.map(x=>sec(x.L.t,x.L.ico,x.c,0,x.L.key)).join('')}
  ${semis.length?sec('Semis à l\'abri','<path d="M6 20h12l-1.5-7h-9z"/><path d="M12 13V8"/><path d="M12 9c0-3 2-5 5-5 0 3-2 5-5 5z"/>',semis,0,'semis'):''}
  ${sec('Stock et saison','<path d="M4 8l8-4 8 4v10l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v10"/>',gen,0,'gen')}
  ${!secs.length?'<p class="note">Rien à faire sur les planches ni dans la serre.</p>':''}</div>`}
$('#v-today').addEventListener('click',async e=>{if(swipedAt&&Date.now()-swipedAt<400){e.preventDefault();return}
  const so=e.target.closest('[data-succoff]');if(so){S.succOff=S.succOff||{};S.succOff[so.dataset.succoff]=YEAR;save();renderToday();return toast('Plus de rappel pour cette saison')}
  const iv=e.target.closest('[data-tinv2]');if(iv){if(iv.dataset.tinv2==='later'){try{localStorage.setItem('potager-noinv','1')}catch(_){}return renderToday()}
    let txt='';try{txt=await navigator.clipboard.readText()}catch(_){}let inv=readInvite(txt);if(!inv){txt=prompt('Colle ici l\'invitation reçue');inv=readInvite(txt)}if(!inv)return toast('Invitation illisible');return applyInvite(inv)}const tj=e.target.closest('[data-tj]');if(tj){const el=document.getElementById('ts-'+tj.dataset.tj);if(el)el.scrollIntoView({block:'start',behavior:'smooth'});return}const t=e.target.closest('[data-tw],[data-train],[data-tinv],[data-tgo],[data-open]');if(!t)return;
  if(t.dataset.tw){const o=obj(t.dataset.tw);o.journal=o.journal||[];o.journal.push({id:uid(),k:'arrosage',d:iso(TODAY),t:''});save();renderToday();return toast('Arrosage noté',true)}
  if(t.dataset.train){addRain(null);save();renderToday();return toast('Pluie notée',true)}
  if(t.dataset.tinv)return openInv(t.dataset.tinv);
  if(t.dataset.tgo)return t.dataset.tgo==='auto'?openAuto():setTab(t.dataset.tgo);
  if(t.dataset.open){openBed(t.dataset.open,+t.dataset.zi||0)}});

