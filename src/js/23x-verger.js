/* ================= Verger : récoltes annuelles, pollinisation, gel sur fleurs, fiche d'un arbre ================= */
/* prochaine récolte d'un fruitier planté le d : pas avant « y » années, puis chaque année aux mois hv */
function fruitNext(d,p){const first=addD(d,Math.round((p.y||3)*365)),mo=TODAY.getMonth()+1;
  if(TODAY>=first&&p.hv.includes(mo)){let t=new Date(TODAY.getFullYear(),TODAY.getMonth(),1,12);
    for(let i=0;i<11;i++){const pr=new Date(t.getFullYear(),t.getMonth()-1,1,12);if(!p.hv.includes(pr.getMonth()+1)||pr<first)break;t=pr}return t<first?first:t}
  const start=first>TODAY?first:TODAY;
  for(let i=0;i<24;i++){const t=new Date(start.getFullYear(),start.getMonth()+i,1,12);if(p.hv.includes(t.getMonth()+1))return i===0?start:t}
  return first}
const fruitAge=d=>Math.max(0,Math.floor(days(parse(d),TODAY)/365.25));
const trees=()=>plantings().filter(x=>x.p.hv);
const spOf=p=>bid(p.id);
/* pollinisation : espèces seules au verger alors qu'il en faut deux */
function pollIssues(){const by={};trees().forEach(x=>{(by[spOf(x.p)]=by[spOf(x.p)]||[]).push(x)});
  return Object.entries(by).filter(([id,l])=>{const p=P[id];return(p.poll==='croise'||p.poll==='dioique')&&l.reduce((s,x)=>s+x.n,0)<2}).map(([id,l])=>({p:P[id],x:l[0]}))}
/* espèces en fleur ce mois-ci et seuil de gel de leurs fleurs */
function inBloom(){const mo=TODAY.getMonth()+1,seen=new Map();trees().forEach(x=>{if((x.p.flo||[]).includes(mo)&&TODAY>=addD(x.d,365)){const k=spOf(x.p);if(!seen.has(k))seen.set(k,{p:P[k],where:new Set()});seen.get(k).where.add(fullName(x.o))}});return[...seen.values()]}
function bloomFrost(night){if(night==null)return[];return inBloom().filter(b=>night<=b.p.gel+1)}

/* fiche d'un arbre (feuille du bas sur le plan) */
function fruitSheet(o){const z=o.zones[0],p=z&&P[z.crop],x=plantings().find(y=>y.o===o);
  let h=`<div class="stack"><div class="cs-head"><div style="min-width:0"><span class="lbl">${p?esc(TYPES.fruitier.l):'Arbre fruitier · à choisir'}</span><div class="nm">${esc(o.name)}</div></div><button class="iconbtn" data-act="close" aria-label="Fermer"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>`;
  if(!p||!x){h+=`<p class="note" style="color:var(--ink)">Quel arbre ou arbuste est-ce ?</p><div class="chips">${PLANTS.map(q=>`<button class="chip" data-fr="set" data-crop="${q.id}">${ci(q.id)}${esc(q.n)}</button>`).join('')}</div></div>`;return h}
  const age=fruitAge(x.d),first=addD(x.d,Math.round(p.y*365)),mo=TODAY.getMonth()+1,care=(p.care||[]).filter(c=>c.m.includes(mo)),pi=pollIssues().find(q=>q.p===P[spOf(p)]);
  const st=x.left<=0?'<span class="st ready">En récolte</span>':`<span class="st">dans ${x.left} j</span>`;
  h+=`<div class="info"><div class="irow">${ring(x.prog,p.id,x.left<=0)}<div style="min-width:0"><b>${esc(p.n)}</b><span class="note">${p.variety?'variété de '+esc(P[p.base].n.toLowerCase())+' · ':''}${age?age+' an'+(age>1?'s':''):'planté cette année'} · ${TODAY<first?'1re récolte vers '+MONTHS[p.hv[0]-1]+' '+first.getFullYear():'récolte '+mRange(p.hv)}</span></div>${st}</div>
    <label class="field"><span class="lbl">Planté le</span><input id="fr-date" type="date" value="${x.d}" max="${iso(TODAY)}"></label></div>
  <div class="info"><span class="lbl">Floraison et récolte</span>
    <div class="kv"><span class="k">Floraison</span><span>${mRange(p.flo)} · fleurs abîmées sous ${num(p.gel)} °C</span></div>
    <div class="kv"><span class="k">Récolte</span><span>${mRange(p.hv)} · ≈ ${num(p.kg)} kg adulte</span></div>
    <div class="kv"><span class="k">Pollinisation</span><span>${POLL_TXT[p.poll]}</span></div>
    ${pi?`<div class="alert amber"><span>Seul ${esc(P[spOf(p)].n.toLowerCase())} du verger : ${p.poll==='dioique'?'vérifie qu\'il y a un pied mâle à proximité.':'plante une 2e variété (ou compte sur un arbre voisin à moins de 50 m).'}</span></div>`:''}</div>
  ${care.length?`<div class="info"><span class="lbl">Ce mois-ci</span>${care.map(c=>`<span>${esc(c.t)}</span>`).join('')}</div>`:''}
  <div class="row"><button class="btn primary" data-fr="harvest">Noter une récolte</button><button class="btn" data-act="openbed">Journal et traitements</button><button class="btn small" data-fr="unset">Changer d'espèce</button></div></div>`;
  return h}
sheet.addEventListener('click',e=>{const b=e.target.closest('[data-fr]');if(!b)return;const o=obj(selId);if(!o)return;const z=o.zones[0];
  if(b.dataset.fr==='set'){const p=P[b.dataset.crop];z.crop=p.id;z.date=iso(TODAY);z.cells={'0-0':iso(TODAY)};if(o.name===TYPES.fruitier.l)o.name=p.n;o.height=p.ht;recordGrown(o,p.id,YEAR);save();renderPlan();renderSheet();return toast(p.n+' planté',true)}
  if(b.dataset.fr==='unset'){z.crop=null;z.cells={};o.name=TYPES.fruitier.l;save();renderPlan();renderSheet();return}
  if(b.dataset.fr==='harvest'){openQ('harvest');const s=$('#q-o');if(s){s.value=o.id;s.dispatchEvent(new Event('change',{bubbles:true}))}}});
sheet.addEventListener('change',e=>{if(e.target.id!=='fr-date')return;const o=obj(selId),v=e.target.value;if(!o||!v||v>iso(TODAY))return;const z=o.zones[0];z.cells={'0-0':v};z.date=v;save();renderPlan();renderSheet();toast('Date de plantation enregistrée',true)});
