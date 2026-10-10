/* ================= Cultures modifiables, variétés, semis échelonnés et objectif de récolte ================= */
/* Semis échelonnés : int = jours entre deux semis (= durée pendant laquelle un semis se récolte),
   u = unité de récolte, y = récolte estimée par plant dans cette unité. Tout est modifiable par culture. */
const SUCC_INFO={radis:{int:14,u:'radis',y:1},laitue:{int:14,u:'salades',y:1},epinard:{int:21,u:'kg',y:.1},mache:{int:21,u:'kg',y:.02},
  haricot:{int:21,u:'kg',y:.15},pois:{int:21,u:'kg',y:.08},carotte:{int:30,u:'kg',y:.08},betterave:{int:30,u:'betteraves',y:1},
  f_glaieul:{int:15,u:'tiges',y:1},f_tournesol:{int:15,u:'tiges',y:1}};
const GOAL_MARGIN=1.25;   /* 25 % de plants en plus : levée ratée, limaces, montée en graines */
function succOf(id){const b=SUCC_INFO[bid(id)],p=P[id];if(!b||!p)return null;return{int:Math.round(+p.succ||b.int),u:b.u,y:+p.yld||b.y}}
const uTxt=(v,u)=>num(v,u==='kg'?2:0)+' '+u;

/* plan de semis pour tenir un objectif (g.w unités par semaine), à partir de « from » */
function planGoal(id,g,from){const p=P[id],si=succOf(id);if(!p||!si||!g||!(g.w>0))return null;
  const qty=Math.max(1,Math.ceil(g.w*si.int/7/si.y*GOAL_MARGIN)),area=qty*(p.rang||p.pl||25)*(p.pl||10)/1e4;
  let start=from||g.from||iso(TODAY);if(start<iso(TODAY))start=iso(TODAY);
  const list=[];for(let i=0;i<=400&&list.length<12;i+=si.int){const t=addD(start,i),mo=t.getMonth()+1;
    const how=p.m.includes(mo)?'en place':(p.sg||[]).includes(mo)?'en godets':null;if(!how)continue;
    const hv=p.fl?bloomStart(iso(t),p):addD(iso(t),p.j);list.push({d:t,qty,how,hv0:hv,hv1:addD(iso(hv),si.int)})}
  return{p,si,qty,area,conc:Math.ceil((p.j+si.int)/si.int),list}}

/* rappels : ressemer après l'intervalle, ou suivre le plan de l'objectif s'il y en a un */
function succession(){const mo=TODAY.getMonth()+1,off=S.succOff||{},goals=S.goals||{},last={};
  plantings().forEach(x=>{if(succOf(x.p.id)&&(!last[x.p.id]||x.d>last[x.p.id]))last[x.p.id]=x.d});
  (S.nursery||[]).forEach(n=>{if(succOf(n.crop)&&n.d&&(!last[n.crop]||n.d>last[n.crop]))last[n.crop]=n.d});
  const out=[];for(const id of new Set([...Object.keys(last),...Object.keys(goals)])){const p=P[id],si=succOf(id);
    if(!p||!si||!PLANTS.includes(p)||off[id]===YEAR)continue;
    const ago=last[id]?days(parse(last[id]),TODAY):null,g=goals[id];
    if(g&&g.w>0){const pg=planGoal(id,g,last[id]?iso(addD(last[id],si.int)):null),nx=pg&&pg.list[0];if(!nx)continue;
      out.push({p,int:si.int,ago,next:nx.d,left:days(TODAY,nx.d),qty:nx.qty,how:nx.how,u:si.u,goal:g,plan:pg});continue}
    if(ago==null||ago>90||ago<0)continue;
    const next=addD(last[id],si.int),nm=next.getMonth()+1,season=[...(p.m||[]),...(p.sg||[])];
    if(!season.includes(nm)&&!(next<=TODAY&&season.includes(mo)))continue;
    out.push({p,int:si.int,ago,next,left:days(TODAY,next)})}
  return out.sort((a,b)=>a.left-b.left)}

/* ---- feuille « Modifier une culture » / « Nouvelle variété » / « Objectif de récolte » ---- */
let cs=null;
function openC(mode,id){cs={mode,id};$('#cback').hidden=false;$('#csheet').hidden=false;renderC();updateNoteBtn()}
function closeC(){cs=null;$('#cback').hidden=true;$('#csheet').hidden=true;$('#csheet').innerHTML='';updateNoteBtn()}
const monthPick=(k,on)=>`<div class="mpick" data-mk="${k}">${MSHORT.map((l,i)=>`<button type="button" aria-pressed="${on.includes(i+1)}" data-m="${i+1}" title="${MONTHS[i]}">${l}</button>`).join('')}</div>`;
const nField=(id,l,v,min,max,step=1,unit='')=>`<label class="field"><span class="lbl">${l}${unit?' ('+unit+')':''}</span><input id="${id}" type="number" inputmode="decimal" min="${min}" max="${max}" step="${step}" value="${v}"></label>`;
function renderC(){if(!cs)return;const el=$('#csheet'),p=P[cs.id];if(!p)return closeC();let h='<div class="grab"></div><div class="stack">';
  const head=t=>`<div class="row between"><h3>${t}</h3><button class="btn small" data-c="close">Fermer</button></div>`;
  if(cs.mode==='edit'||cs.mode==='variety'){const nv=cs.mode==='variety',si=succOf(cs.id),b=SUCC_INFO[bid(cs.id)];
    h+=head(nv?'Nouvelle variété de '+esc(P[bid(cs.id)].n.toLowerCase()):'Modifier : '+esc(p.n));
    if(nv||p.variety)h+=`<label class="field"><span class="lbl">Nom de la variété</span><input id="ce-n" value="${nv?'':esc(p.n)}" placeholder="ex. ${esc(P[bid(cs.id)].n)} cerise" autocomplete="off"></label>`;
    if(p.hv)h+=`<div class="grid2">${nField('ce-pl','Distance de plantation',p.pl,20,2000,10,'cm')}${nField('ce-ht','Hauteur adulte',p.ht,30,3000,10,'cm')}${nField('ce-y','1re récolte après',p.y,1,15,1,'ans')}${nField('ce-kg','Récolte adulte',p.kg,.1,500,.1,'kg')}${nField('ce-gel','Fleurs abîmées sous',p.gel,-15,5,.5,'°C')}
      <label class="field"><span class="lbl">Pollinisation</span><select id="ce-poll">${Object.entries({auto:'Autofertile',partiel:'Partiellement autofertile',croise:'Il faut une 2e variété',dioique:'Pieds mâle et femelle'}).map(([k,l])=>`<option value="${k}" ${p.poll===k?'selected':''}>${l}</option>`).join('')}</select></label></div>
      <div><span class="lbl">Plantation</span>${monthPick('m',p.m)}</div><div><span class="lbl">Floraison</span>${monthPick('flo',p.flo)}</div><div><span class="lbl">Récolte</span>${monthPick('hv',p.hv)}</div>`;
    else h+=`<div class="grid2">${p.fl?'':nField('ce-rang','Entre les rangs',p.rang,5,300,1,'cm')}${nField('ce-pl',p.fl?'Espacement':'Sur le rang',p.pl,1,300,1,'cm')}${nField('ce-j',p.fl?'Jours jusqu\'à la floraison':'Jours jusqu\'à la récolte',p.j,10,400,1,'j')}</div>
    <div><span class="lbl">${p.t==='bulbe'||p.t==='tubercule'?'Plantation des bulbes':'Semis direct ou plantation en place'}</span>${monthPick('m',p.m)}</div>
    <div><span class="lbl">Semis en godets (à l'abri)</span>${monthPick('sg',p.sg||[])}</div>`;
    if(si)h+=`<div class="grid2">${nField('ce-succ','Ressemer tous les',si.int,7,60,1,'j')}${nField('ce-yld','Récolte par plant',si.y,.001,100,b.u==='kg'?.01:1,b.u)}</div>
      <p class="note">Pour les semis échelonnés et l'objectif de récolte. La récolte par plant est une estimation : ajuste-la après une saison.</p>`;
    h+=`<div class="row"><button class="btn primary" data-c="save">${nv?'Créer la variété':'Enregistrer'}</button>
      ${!nv&&p.edited&&!p.variety?'<button class="btn" data-c="reset">Valeurs d\'origine</button>':''}
      ${!nv&&p.variety?'<button class="btn danger" data-c="delvar">Supprimer la variété</button>':''}</div>
      ${!nv&&!p.variety?`<p class="note">Valeurs d'origine : ${p.hv?`distance ${BASE[cs.id].pl} cm · 1re récolte ${BASE[cs.id].y} ans · ${BASE[cs.id].kg} kg`:`${p.fl?'':'rangs '+BASE[cs.id].rang+' cm · '}${p.fl?'espacement':'plants'} ${BASE[cs.id].pl} cm · ${BASE[cs.id].j} j`}. Les changements valent pour « ${esc(S.name)} » et se synchronisent avec tes autres appareils.</p>`:''}`;
  }else if(cs.mode==='goal'){const si=succOf(cs.id),g=(S.goals||{})[cs.id]||{w:'',from:iso(TODAY)};
    h+=head('Objectif de récolte : '+esc(p.n.toLowerCase()));
    h+=`<p class="note" style="color:var(--ink)">Dis combien tu veux récolter par semaine : l'app calcule quand semer et combien.</p>
    <div class="grid2"><label class="field"><span class="lbl">Récolte voulue (${si.u} par semaine)</span><input id="cg-w" type="number" inputmode="decimal" min="0" step="${si.u==='kg'?.1:1}" value="${g.w}" placeholder="ex. ${si.u==='kg'?'0,5':'3'}"></label>
    <label class="field"><span class="lbl">À partir du</span><input id="cg-from" type="date" value="${g.from&&g.from>iso(TODAY)?g.from:iso(TODAY)}"></label></div>
    <div id="cg-plan">${goalPlanHTML(cs.id,{w:+g.w,from:g.from})}</div>
    <div class="row"><button class="btn primary" data-c="goalsave">Enregistrer l'objectif</button>${(S.goals||{})[cs.id]?'<button class="btn danger" data-c="goaldel">Supprimer l\'objectif</button>':''}</div>
    <p class="note">Estimation : ${uTxt(si.y,si.u)} par plant, un semis tous les ${si.int} j, ${Math.round((GOAL_MARGIN-1)*100)} % de plants en plus pour les pertes. <button class="linkbtn" data-c="toedit">Ajuster ces valeurs</button></p>`}
  el.innerHTML=h+'</div>'}
function goalPlanHTML(id,g){if(!(g.w>0))return'<p class="note">Indique une quantité pour voir le plan de semis.</p>';
  const pg=planGoal(id,g,g.from);if(!pg||!pg.list.length)return'<div class="alert amber"><span>Aucune période de semis dans l\'année qui vient pour cette culture.</span></div>';
  const fz=freeZone();
  return`<div class="info"><b>Tous les ${pg.si.int} jours : ${pg.qty} plants</b><span class="note" style="color:var(--ink)">≈ ${num(pg.area,1)} m² par semis · ${pg.conc} semis en terre en même temps, soit ≈ ${num(pg.area*pg.conc,1)} m² en tout${fz?' · place libre : '+esc(fullName(fz.o)):''}</span></div>
  <div class="glist">${pg.list.slice(0,8).map(s=>`<div class="grow"><span><b>${fdate(s.d)}</b> · ${s.qty} plants ${s.how}<span class="note" style="display:block">${pg.p.fl?'floraison':'récolte'} du ${fdate(s.hv0)} au ${fdate(s.hv1)}</span></span></div>`).join('')}</div>`}
function readMonths(k){return[...$('#csheet').querySelectorAll(`[data-mk="${k}"] button[aria-pressed="true"]`)].map(b=>+b.dataset.m)}
function readCropForm(p){const v=id=>{const e=$('#'+id);return e?+String(e.value).replace(',','.'):null},out={};
  const lim={rang:[5,300],pl:[1,2000],j:[10,400],succ:[7,60],yld:[.001,100],ht:[30,3000],y:[1,15],kg:[.1,500],gel:[-15,5]},dec=new Set(['yld','kg','gel']);
  for(const[k,id]of[['rang','ce-rang'],['pl','ce-pl'],['j','ce-j'],['succ','ce-succ'],['yld','ce-yld'],['ht','ce-ht'],['y','ce-y'],['kg','ce-kg'],['gel','ce-gel']]){const x=v(id);if(x==null||!isFinite(x)||(x<=0&&k!=='gel'))continue;out[k]=dec.has(k)?Math.round(clamp(x,...lim[k])*100)/100:Math.round(clamp(x,...lim[k]))}
  out.m=readMonths('m');if(p.hv){out.flo=readMonths('flo');out.hv=readMonths('hv');out.poll=$('#ce-poll').value}else out.sg=readMonths('sg');return out}
$('#cback').onclick=closeC;
$('#csheet').addEventListener('click',e=>{const mb=e.target.closest('.mpick button');if(mb){mb.setAttribute('aria-pressed',mb.getAttribute('aria-pressed')!=='true');return}
  const b=e.target.closest('[data-c]');if(!b||!cs)return;const a=b.dataset.c,id=cs.id,p=P[id];
  if(a==='close')return closeC();
  if(a==='toedit'){cs={mode:'edit',id};return renderC()}
  if(a==='save'){const f=readCropForm(p);if(p.hv?!f.m.length:!f.m.length&&!f.sg.length)return toast(p.hv?'Choisis au moins un mois de plantation':'Choisis au moins un mois de semis');if(p.hv&&!f.hv.length)return toast('Choisis au moins un mois de récolte');
    const base=BASE[bid(id)],si=SUCC_INFO[bid(id)];
    if(cs.mode==='variety'||p.variety){const n=($('#ce-n').value||'').trim();if(!n)return toast('Donne un nom à la variété');
      const vals={n:n.slice(0,40),...f};if(!si){delete vals.succ;delete vals.yld}
      S.varieties=S.varieties||[];
      if(cs.mode==='variety'){const v={id:'v_'+uid(),base:bid(id),...vals};S.varieties.push(v);save();setCatalog();closeC();refresh();return toast('Variété « '+v.n+' » créée',true)}
      Object.assign(S.varieties.find(v=>v.id===id),vals);save();setCatalog();closeC();refresh();return toast('Variété enregistrée',true)}
    const diff={};for(const k of['rang','pl','j','ht','y','kg','gel','poll'])if(f[k]!=null&&f[k]!==base[k])diff[k]=f[k];
    for(const k of['m','sg','flo','hv'])if(f[k]&&JSON.stringify([...f[k]].sort((x,y)=>x-y))!==JSON.stringify([...(base[k]||[])].sort((x,y)=>x-y)))diff[k]=f[k];
    if(si){if(f.succ!=null&&f.succ!==si.int)diff.succ=f.succ;if(f.yld!=null&&Math.abs(f.yld-si.y)>1e-9)diff.yld=f.yld}
    S.cropEdits=S.cropEdits||{};if(Object.keys(diff).length)S.cropEdits[id]=diff;else delete S.cropEdits[id];
    save();setCatalog();closeC();refresh();return toast(Object.keys(diff).length?p.n+' : valeurs enregistrées':p.n+' : valeurs d\'origine',true)}
  if(a==='reset'){if(S.cropEdits)delete S.cropEdits[id];save();setCatalog();closeC();refresh();return toast(p.n+' : valeurs d\'origine',true)}
  if(a==='delvar'){if(!b.classList.contains('armed')){const n=allObjs().reduce((s,o)=>s+(o.zones||[]).filter(z=>z.crop===id).length,0);b.classList.add('armed');b.textContent=n?`Confirmer : ${n} zone${n>1?'s':''} repasse${n>1?'nt':''} en ${P[p.base].n.toLowerCase()}`:'Confirmer la suppression';return}
    allObjs().forEach(o=>(o.zones||[]).forEach(z=>{if(z.crop===id)z.crop=p.base}));(S.nursery||[]).forEach(n=>{if(n.crop===id)n.crop=p.base});(S.stock||[]).forEach(q=>{if(q.crop===id)q.crop=p.base});
    S.varieties=S.varieties.filter(v=>v.id!==id);if(S.goals)delete S.goals[id];if(S.cropEdits)delete S.cropEdits[id];save();setCatalog();closeC();refresh();return toast('Variété supprimée',true)}
  if(a==='goalsave'){const w=+String($('#cg-w').value).replace(',','.');if(!(w>0))return toast('Indique une quantité par semaine');
    S.goals=S.goals||{};S.goals[id]={w:Math.round(w*100)/100,from:$('#cg-from').value||iso(TODAY)};if(S.succOff)delete S.succOff[id];
    save();closeC();refresh();return toast('Objectif enregistré',true)}
  if(a==='goaldel'){if(S.goals)delete S.goals[id];save();closeC();refresh();return toast('Objectif supprimé')}});
$('#csheet').addEventListener('input',e=>{if(!cs||cs.mode!=='goal'||!['cg-w','cg-from'].includes(e.target.id))return;
  $('#cg-plan').innerHTML=goalPlanHTML(cs.id,{w:+String($('#cg-w').value).replace(',','.'),from:$('#cg-from').value})});
