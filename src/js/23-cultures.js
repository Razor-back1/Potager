/* ================= Cultures ================= */
let cq='';
const inSeason=(p,d)=>{const m=(d||TODAY).getMonth()+1,n=m%12+1;return p.m.includes(m)||p.m.includes(n)};
const seasonTxt=p=>{const ms=[...p.m].sort((a,b)=>a-b);return ms.map(x=>MABR[x-1]).join(', ')};
const hasSeedsFor=id=>(S.stock||[]).some(q=>q.cat==='graine'&&q.crop===id&&stockOf(q)>0&&!expired(q));
function cropGroups(){const mo=TODAY.getMonth()+1,act=nurseryActive();
  const G=[{k:1,t:'À planter maintenant : tes plants sont prêts',d:'Plants en godets prêts à repiquer.',l:[]},
    {k:2,t:'À semer ou planter maintenant : graines ou plants en cours',d:'Semis direct ou plantation ce mois-ci.',l:[]},
    {k:3,t:'À semer en godets maintenant : tu as les graines',d:'À démarrer à l\'abri.',l:[]},
    {k:4,t:'À semer en place maintenant : graines à acheter',d:'C\'est la saison, mais rien en stock.',l:[]},
    {k:5,t:'À semer en godets maintenant : graines à acheter',d:'C\'est la saison, mais rien en stock.',l:[]},
    {k:6,t:'Hors saison',d:'Triées par prochain mois de semis.',l:[]}];
  PLANTS.forEach(p=>{const now=p.m.includes(mo),sgNow=(p.sg||[]).includes(mo),seeds=hasSeedsFor(p.id),pl=act.filter(n=>n.crop===p.id);
    const ready=pl.some(n=>readyOf(n)<=TODAY);const k=now&&ready?1:now&&seeds?2:now&&pl.length?2:sgNow&&seeds?3:now?4:sgNow?5:6;G[k-1].l.push({p,seeds,pl,now,sgNow})});
  const nextM=p=>{const ms=[...p.m,...(p.sg||[])];let best=13;ms.forEach(x=>{const d=(x-mo+12)%12;if(d>0&&d<best)best=d});return best};
  G[5].l.sort((a,b)=>nextM(a.p)-nextM(b.p));
  G.forEach(g=>{if(g.k<6)g.l.sort((a,b)=>a.p.n.localeCompare(b.p.n,'fr'))});
  return G}
function renderCrops(){
  const mo=TODAY.getMonth()+1,q=cq.toLowerCase().trim();
  const v=$('#v-crops'),had=document.activeElement&&document.activeElement.id==='cq';
  const card=x=>{const p=x.p,g=PLANTS.filter(q=>compat(p.id,q.id)>0),b=PLANTS.filter(q=>compat(p.id,q.id)<0),ps=PESTS.filter(y=>y.c.includes(p.id));
    const rd=x.pl.filter(n=>readyOf(n)<=TODAY);
    const st=[x.pl.length?`<span class="ok">${x.pl.reduce((s,n)=>s+n.n,0)} plants en godets${rd.length?' · prêts':' · prêts le '+fdate(readyOf(x.pl[0]))}</span>`:'',x.seeds?'<span class="ok">graines en stock</span>':'',x.now?'<span class="warn">en place ce mois-ci</span>':'',x.sgNow?'<span class="warn">en godets ce mois-ci</span>':''].filter(Boolean).join('');
    const acts=x.pl.length?`<button class="btn small primary" data-cact="semis">Voir les semis</button>`:'';
    const acts2=(x.sgNow&&x.seeds&&!x.pl.length)?`<button class="btn small primary" data-cact="sow" data-crop="${p.id}">Semer en godets</button>`:'';
    const acts3=(!x.seeds&&!x.pl.length&&(x.now||x.sgNow))?`<button class="btn small" data-cact="buy" data-crop="${p.id}">Ajouter aux graines à acheter</button>`:'';
    return`<div class="crop">
   <div class="row between"><div class="row">${ci(p.id,1,'big')}<h3>${p.n}</h3><span class="note">${p.f}</span></div><span class="mono note">${p.fl?FL_TYPE[p.t]:'≈ '+p.j+' j'}${FROST_SENSITIVE.has(p.id)?' · gélive':''}</span></div>
   ${st?`<div class="rs">${st}</div>`:''}
   <div class="mono note">${p.fl?`Hauteur ${m2(p.ht)} m · espacement ${p.pl} cm · rustique jusqu'à ${p.hardy} °C`:`Rangs ${p.rang} cm · plants ${p.pl} cm`} · ☀ ${SUN_NEED[p.id]} h+ (${sunLabel(SUN_NEED[p.id])})</div>
   ${p.fl?`<div class="note" style="color:var(--ink)">${esc(p.cols||'')}${p.cut?' · fleur à couper':''}${p.lift?' · à rentrer ou arracher avant l\'hiver':''}</div>`:''}
   <div class="stack" style="gap:6px">${(p.sg||[]).length?`<div class="row" style="flex-wrap:nowrap"><span class="mlbl">Semis en godets</span><div class="months" style="flex:1">${MSHORT.map((l,i)=>`<span class="${p.sg.includes(i+1)?'on':''} ${i+1===mo?'now':''}" title="${MONTHS[i]}">${l}</span>`).join('')}</div></div>`:''}
   <div class="row" style="flex-wrap:nowrap"><span class="mlbl">${p.t==='bulbe'||p.t==='tubercule'?'Plantation des bulbes':'Plantation / semis direct'}</span><div class="months" style="flex:1">${MSHORT.map((l,i)=>`<span class="${p.m.includes(i+1)?'on':''} ${i+1===mo?'now':''}" title="${MONTHS[i]}">${l}</span>`).join('')}</div></div>
   ${p.fl?`<div class="row" style="flex-wrap:nowrap"><span class="mlbl">Floraison</span><div class="months" style="flex:1">${MSHORT.map((l,i)=>`<span class="${i+1===mo?'now':''}" ${p.fl.includes(i+1)?`style="background:${p.c};color:#fff;border-color:${p.c}"`:''} title="${MONTHS[i]}">${l}</span>`).join('')}</div></div>`:''}</div>
   ${p.fl&&(p.care||[]).length?`<div class="note"><b style="color:var(--ink)">Entretien</b> · ${p.care.map(cr=>`${mRange(cr.m)} : ${esc(cr.t.charAt(0).toLowerCase()+cr.t.slice(1))}`).join(' · ')}</div>`:''}
   ${acts||acts2||acts3?`<div class="row">${acts}${acts2}${acts3}</div>`:''}
   ${g.length?`<div><span class="lbl">Bons voisins</span><div class="chips" style="margin-top:4px">${g.map(q=>chip(q.id,'good')).join('')}</div></div>`:''}
   ${b.length?`<div><span class="lbl">À éviter à côté</span><div class="chips" style="margin-top:4px">${b.map(q=>chip(q.id,'bad')).join('')}</div></div>`:''}
   ${ps.length?`<div class="note">À surveiller : ${ps.map(y=>`${y.n} (${mRange(y.m)})`).join(', ')}</div>`:''}
  </div>`};
  const groups=cropGroups().map(g=>({...g,l:g.l.filter(x=>!q||(x.p.n+' '+x.p.f).toLowerCase().includes(q))})).filter(g=>g.l.length);
  v.innerHTML=`<div class="page"><h2>${FLW()?'Fleurs':'Cultures'}</h2><input id="cq" class="search" placeholder="${FLW()?'Chercher une fleur ou une famille':'Chercher une culture ou une famille'}" value="${esc(cq)}" aria-label="Chercher">
  ${groups.map(g=>`<div class="stack"><div><div class="section-t"><span class="lbl">${g.k} · ${g.t}</span><span class="mono note">${g.l.length}</span></div><span class="note">${g.d}</span></div>${g.l.map(card).join('')}</div>`).join('')||'<p class="note">Aucune culture ne correspond.</p>'}
  <p class="note">Classement pour ${MONTHS[mo-1]} (le point jaune sous le calendrier marque le mois en cours, les cases vertes les mois possibles). Cadre vert : bon voisin. Cadre rouge : à éviter. Valeurs indicatives pour un climat belge.</p></div>`;
  if(had){const i=$('#cq');i.focus();i.setSelectionRange(cq.length,cq.length)}
}
$('#v-crops').addEventListener('click',e=>{const b=e.target.closest('[data-cact]');if(!b)return;const a=b.dataset.cact,c=b.dataset.crop;
  if(a==='semis')return openInv('semis');
  if(a==='sow'){openInv('semis');inv.add=true;inv.ns={crop:c,n:12,qty:'',d:iso(TODAY),pid:((S.stock||[]).find(q=>q.cat==='graine'&&q.crop===c&&stockOf(q)>0&&!expired(q))||{}).id||''};renderInv();return}
  if(a==='buy'){S.stock=S.stock||[];if(!S.stock.some(q=>q.cat==='graine'&&q.crop===c&&!expired(q)))S.stock.push({id:uid(),name:P[c].n,crop:c,cat:'graine',unit:'graines',min:0,moves:[]});save();renderCrops();return toast(P[c].n+' : graines ajoutées à la liste d\'achat',true)}});
$('#v-crops').addEventListener('input',e=>{if(e.target.id==='cq'){cq=e.target.value;renderCrops()}});

