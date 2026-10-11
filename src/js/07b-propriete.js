/* ================= Propriété : le terrain entier (maison, piscine…) et ses parcelles ================= */
/* La propriété est un jardin comme les autres (kind 'propriete', id 'prop') : même stockage, même synchronisation,
   même éditeur de plan. Chaque parcelle posée dessus est un objet « parcelle » relié à un potager, un jardin de fleurs ou un verger. */
const PROP_ID='prop',KINDS=['potager','fleurs','verger'];
const KCOL={potager:'#3E8E41',fleurs:'#D45D9A',verger:'#E08A2E'};
const KLBL={potager:'Potager',fleurs:'Jardin de fleurs',verger:'Verger'};
const PROP=()=>{try{return!!S&&S.kind==='propriete'}catch(e){return false}};
const TOPKEY='atelier-potager-top',SUBKEY='atelier-potager-sub';
let TOP=(()=>{try{return localStorage.getItem(TOPKEY)||'prop'}catch(e){return'prop'}})();
let SUB=(()=>{try{return JSON.parse(localStorage.getItem(SUBKEY))||{}}catch(e){return{}}})();
const saveNav=()=>{try{localStorage.setItem(TOPKEY,TOP);localStorage.setItem(SUBKEY,JSON.stringify(SUB))}catch(e){}};
const isVariant=n=>/ · (variante|copie) \d+$/.test(n||'');

/* état d'un autre jardin (lu dans le stockage, mis en cache tant qu'il ne change pas) */
const GCACHE=new Map();
function gState(id){if(id===GID)return S;let at='';try{at=localStorage.getItem(keyAtOf(id))||''}catch(e){}
  const c=GCACHE.get(id);if(c&&c.at===at)return c.st;let st=null;try{st=migrate(JSON.parse(localStorage.getItem(keyOf(id))))}catch(e){}
  GCACHE.set(id,{at,st});return st}
function gKind(id){const g=GL.get().list.find(x=>x.id===id);if(g&&g.k)return g.k;const st=gState(id);return st?(st.kind||'potager'):null}
/* les entrées de la liste retiennent leur sorte, pour ne pas relire chaque jardin */
function fillKinds(){const g=GL.get();let ch=false;g.list.forEach(x=>{if(!x.k){const st=gState(x.id);if(st){x.k=st.kind||'potager';ch=true}}});if(ch)GL.set(g)}
/* jardins « actifs » : ceux posés sur la propriété ; les autres (vieux jardins, variantes, exemples) attendent dans « Pas sur le plan » */
const activeOf=k=>{const pl=new Set(parcels().map(o=>o.gid));return gardensOf(k).filter(g=>pl.has(g.id))};
const gardensOf=k=>GL.get().list.filter(x=>x.id!==PROP_ID&&(x.id===GID?(PROP()?null:KIND()):gKind(x.id))===k);

/* exécuter fn comme si le jardin id était ouvert (pour compter ce qu'il y a à faire ailleurs) */
function withGarden(id,fn){if(id===GID)return fn();const st=gState(id);if(!st)return null;const s0=S,c0=ctx;let r=null;
  try{S=JSON.parse(JSON.stringify(st));ctx=null;setCatalog();r=fn()}catch(e){r=null}finally{S=s0;ctx=c0;setCatalog()}return r}
const SCACHE=new Map();
function statOf(id){const at=id===GID?String(localAt)+lastJSON.length:(()=>{try{return localStorage.getItem(keyAtOf(id))||''}catch(e){return''}})();
  const k=iso(TODAY)+'|'+at+'|'+(typeof wx!=='undefined'&&wx?wx.at:0),c=SCACHE.get(id);if(c&&c.k===k)return c.v;
  const v=withGarden(id,()=>renderToday(true))||{n:0,sens:0,rec:[],eau:0};SCACHE.set(id,{k,v});return v}

/* première ouverture après la mise à jour : la propriété est créée et les jardins existants y sont posés côte à côte */
function ensureProperty(){fillKinds();const g=GL.get();if(g.list.some(x=>x.id===PROP_ID))return;
  if(GID&&!(()=>{try{return localStorage.getItem(keyOf(GID))}catch(e){return 1}})())persist();
  const items=g.list.map(x=>({x,st:gState(x.id)})).filter(i=>i.st&&i.st.kind!=='propriete'&&!isVariant(i.st.name));
  const real=items.filter(i=>!i.st.example),place=real.length?real:items;
  const st=emptyGarden('Ma propriété','propriete');let x=400,hmax=0;
  place.forEach(i=>{st.objs.push({id:uid(),type:'parcelle',gid:i.x.id,name:i.st.name,x,y:400,w:i.st.w,h:i.st.h,rot:((-(i.st.north||0))%360+360)%360,zones:[]});x+=i.st.w+400;hmax=Math.max(hmax,i.st.h)});
  st.w=Math.max(3000,x);st.h=Math.max(2000,hmax+800);
  try{localStorage.setItem(keyOf(PROP_ID),JSON.stringify(st));localStorage.setItem(keyAtOf(PROP_ID),'1')}catch(e){return}   /* daté « très ancien » : une propriété déjà synchronisée ailleurs l'emporte */
  g.list.unshift({id:PROP_ID,name:st.name,k:'propriete'});GL.set(g)}
ensureProperty();

const propState=()=>gState(PROP_ID);
/* parcelles posées sur la propriété (les jardins supprimés disparaissent du plan) */
function parcels(){const st=propState();return st?st.objs.filter(o=>o.type==='parcelle'&&GL.get().list.some(x=>x.id===o.gid)):[]}
/* garde la taille et le nom de chaque parcelle alignés sur son jardin (sans toucher à l'historique) */
function syncParcels(){if(!PROP())return;const L=GL.get().list;let ch=false;
  S.objs=S.objs.filter(o=>{if(o.type!=='parcelle')return true;if(!L.some(x=>x.id===o.gid)){ch=true;return false}return true});
  S.objs.forEach(o=>{if(o.type!=='parcelle')return;const st=gState(o.gid);if(!st)return;
    if(o.w!==st.w||o.h!==st.h){o.x+=(o.w-st.w)/2;o.y+=(o.h-st.h)/2;o.w=st.w;o.h=st.h;ch=true}if(o.name!==st.name){o.name=st.name;ch=true}});
  if(ch){lastJSON=JSON.stringify(S);persist()}}

/* ---- dessin réduit d'un jardin (dans sa parcelle) ---- */
function miniGarden(st,c){const tp=st.shape&&st.shape.length>2?st.shape:[{x:0,y:0},{x:st.w,y:0},{x:st.w,y:st.h},{x:0,y:st.h}],ns='vector-effect="non-scaling-stroke"';
  let s=`<polygon points="${tp.map(p=>p.x+','+p.y).join(' ')}" fill="${c}" fill-opacity=".16" stroke="${c}" stroke-width="2" ${ns}/>`;
  (st.objs||[]).forEach(o=>{const t=o.type,T=TYPES[t]||{};if(t==='prise')return;
    const f=t==='planche'||t==='bac'?`fill="${c}" fill-opacity=".5"`:t==='serre'?'class="s-serre"':/etang|eau|cuve|citerne|ruisseau/.test(t)?'class="s-water-l"':/arbre|fruitier|haie/.test(t)?'class="s-leaf"':/allee/.test(t)?'class="s-gravel"':'class="s-wood"';
    const e=T.round||t==='alleeo'?`<ellipse rx="${o.w/2}" ry="${o.h/2}" ${f} stroke-width="1" ${ns}/>`:`<rect x="${-o.w/2}" y="${-o.h/2}" width="${o.w}" height="${o.h}" rx="${t==='etang'?Math.min(o.w,o.h)/2:Math.min(o.w,o.h)*.08}" ${f} stroke-width="1" ${ns}/>`;
    s+=`<g transform="translate(${o.x+o.w/2} ${o.y+o.h/2}) rotate(${o.rot||0})">${e}</g>`});
  return s}
function parcelSVG(o){const st=gState(o.gid);if(!st)return`<rect x="${-o.w/2}" y="${-o.h/2}" width="${o.w}" height="${o.h}" fill="none" stroke="var(--muted)" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"/>`;
  return`<g transform="translate(${-o.w/2} ${-o.h/2})">${miniGarden(st,KCOL[st.kind||'potager'])}</g>`}

/* ---- plan réduit de la propriété (vue d'ensemble) ---- */
function propSVG(W){const tp=terrainPts();let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  const add=(x,y)=>{x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)};tp.forEach(p=>add(p.x,p.y));
  S.objs.forEach(o=>{const r=Math.hypot(o.w,o.h)/2;add(o.x+o.w/2-r,o.y+o.h/2-r);add(o.x+o.w/2+r,o.y+o.h/2+r)});
  const pad=Math.max(x1-x0,y1-y0)*.03;x0-=pad;y0-=pad;x1+=pad;y1+=pad;const bw=x1-x0,bh=y1-y0,z=W/bw,z0=view.z;view.z=z;
  const order=['etang','ruisseau','alleeo','allee','terrasse','parcelle','piscine','maison','haie','cloture','serre','arbre','fruitier','abri','compost','cuve','eau','citerne','bac','planche','prise'];
  const list=[...S.objs].sort((a,b)=>order.indexOf(a.type)-order.indexOf(b.type));let s='',labs='';
  try{list.forEach(o=>{const pg=o.type==='parcelle';s+=`<g transform="translate(${o.x+o.w/2} ${o.y+o.h/2}) rotate(${o.rot||0})"${pg?` data-pg="${o.gid}" class="ppick"`:''}>${shapeSVG(o)}</g>`;
    if(pg||o.type==='maison'||o.type==='piscine'){const fs=11/z,c=pg?(KCOL[(gState(o.gid)||{}).kind||'potager']):'var(--muted)',w=o.name.length*fs*.58+fs*1.2;
      labs+=`<g${pg?` data-pg="${o.gid}" class="ppick"`:''} transform="translate(${o.x+o.w/2} ${o.y+o.h/2})"><rect x="${-w/2}" y="${-fs*.95}" width="${w}" height="${fs*1.9}" rx="${fs*.95}" class="plab"/><text text-anchor="middle" dominant-baseline="central" font-size="${fs}" font-weight="700" style="fill:${c}">${esc(o.name)}</text></g>`}})}finally{view.z=z0}
  return`<svg class="propsvg" viewBox="${x0} ${y0} ${bw} ${bh}" width="100%" style="aspect-ratio:${bw}/${bh}" role="img" aria-label="Plan de la propriété"><polygon class="ground" points="${tp.map(p=>p.x+','+p.y).join(' ')}"/><polygon class="bound" points="${tp.map(p=>p.x+','+p.y).join(' ')}" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"/>${s}${labs}</svg>`}

/* ---- navigation : Plan · Potager · Fleurs · Verger · Eau ---- */
const LASTKEY='atelier-potager-last';
const lastOf=k=>{try{return(JSON.parse(localStorage.getItem(LASTKEY))||{})[k]}catch(e){return null}};
const setLast=(k,id)=>{try{const v=JSON.parse(localStorage.getItem(LASTKEY))||{};v[k]=id;if(KINDS.includes(k))v.kind=k;localStorage.setItem(LASTKEY,JSON.stringify(v))}catch(e){}};
function pickGarden(k){const gs=activeOf(k);if(!gs.length)return null;const l=lastOf(k);if(l&&gs.some(g=>g.id===l))return l;
  const placed=parcels().map(o=>o.gid);return(gs.find(g=>placed.includes(g.id))||gs.find(g=>!g.ex)||gs[0]).id}
function setTop(k){if(!['prop','eau',...KINDS].includes(k))k='prop';TOP=k;saveNav();
  if(k==='prop'){if(GID!==PROP_ID)switchGarden(PROP_ID);syncParcels();return setTab('prop')}
  if(k==='eau'){if(PROP()){const id=lastOf('eau')||pickGarden('potager')||pickGarden('fleurs')||pickGarden('verger');if(id&&GL.get().list.some(x=>x.id===id))switchGarden(id)}return setTab('weather')}
  if(PROP()||KIND()!==k){const id=pickGarden(k);if(!id){if(!PROP())switchGarden(PROP_ID);TOP=k;return setTab('empty')}switchGarden(id)}
  setLast(k,GID);setTab('today')}
/* garde l'onglet du bas cohérent avec le jardin ouvert (après une synchro, un import, le menu…) */
function syncTop(){if(tab==='empty')return;if(tab==='weather'){TOP='eau';return}
  if(PROP()){if(TOP!=='prop')TOP='prop'}else if(TOP==='prop'||(TOP!=='eau'&&TOP!==KIND()))TOP=KIND()}
const SEGS={prop:[['prop',"Vue d'ensemble"],['plan','Plan']]};
function renderTopNav(){syncTop();saveNav();
  document.querySelectorAll('.tabs [data-top]').forEach(b=>{if(b.dataset.top===TOP)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
    const k=b.dataset.top,bd=b.querySelector('.tbadge');if(KINDS.includes(k))b.hidden=!activeOf(k).length&&TOP!==k;if(!bd)return;let n=0;if(KINDS.includes(k))try{n=parcels().filter(o=>gKind(o.gid)===k).reduce((s,o)=>s+(statOf(o.gid).n||0),0)}catch(e){}
    bd.textContent=n>9?'9+':n;bd.hidden=!n});
  const el=$('#subnav');if(!el)return;let h='';
  const chips=list=>list.length>1?`<div class="pchips">${list.map(g=>{const k=gKind(g.id),on=g.id===GID;return`<button class="pchip${on?' on':''}" data-g="${g.id}"${on?' aria-current="true"':''}><i style="background:${KCOL[k]||'var(--muted)'}"></i>${esc(g.id===GID?S.name:g.name||KLBL[k])}${g.ex?' <span class="note">exemple</span>':''}${parcels().some(o=>o.gid===g.id)?'':' <span class="note">hors plan</span>'}</button>`}).join('')}</div>`:'';
  const seg=items=>`<div class="subtabs" role="tablist">${items.map(([t,l])=>`<button role="tab" data-tab="${t}" aria-selected="${tab===t}">${l}</button>`).join('')}</div>`;
  if(TOP==='prop')h=seg(SEGS.prop);
  else if(TOP==='eau'){const gs=KINDS.flatMap(activeOf);if(!gs.some(g=>g.id===GID)&&!PROP())gs.push(GL.get().list.find(g=>g.id===GID));h=chips(gs)}
  else if(tab!=='empty'){const gs=activeOf(TOP);if(!gs.some(g=>g.id===GID)&&!PROP())gs.push(GL.get().list.find(g=>g.id===GID));h=chips(gs)+seg([['today',"Aujourd'hui"],['plan','Plan'],['harvest',FLW()?'Floraisons':'Récoltes'],['crops',FLW()?'Fleurs':VRG()?'Fruitiers':'Cultures']])}
  el.innerHTML=h;el.hidden=!h}
$('#subnav').addEventListener('click',e=>{const t=e.target.closest('[data-tab]');if(t){if(t.dataset.tab===tab&&tab==='plan'){sheetMode=null;selId=null;shapeEdit=null;renderSheet();fit();return}return setTab(t.dataset.tab)}
  const g=e.target.closest('[data-g]');if(g&&g.dataset.g!==GID){switchGarden(g.dataset.g);if(TOP==='eau')setLast('eau',GID);else{setLast(KIND(),GID);if(tab==='empty')setTab('today')}renderTopNav()}});

/* ---- vue d'ensemble de la propriété ---- */
function newParcel(k,ex){const n=gardensOf(k).length+1;const st=ex?(k==='verger'?sampleOrchard():k==='fleurs'?sampleFlowers():sample()):emptyGarden((k==='potager'?'Potager':k==='fleurs'?'Jardin de fleurs':'Verger')+(n>1?' '+n:''),k==='potager'?undefined:k);
  if(!ex){st.w=k==='verger'?1500:1000;st.h=k==='verger'?1200:600}
  const id=addGarden(st,false);if(!id)return null;placeParcel(id);return id}
/* poser un jardin sur le plan de la propriété (au centre, sans chevaucher si possible) */
function placeParcel(id){placeInProp(id)}
/* pose un jardin sur la propriété, à l'endroit le plus dégagé, même si la propriété n'est pas ouverte */
function placeInProp(id){const gs=gState(id);if(!gs)return;const st=PROP()?S:(()=>{const p=gState(PROP_ID);return p?JSON.parse(JSON.stringify(p)):null})();if(!st)return;
  if(st.objs.some(o=>o.type==='parcelle'&&o.gid===id))return;const shape=st.shape&&st.shape.length>2?st.shape:[{x:0,y:0},{x:st.w,y:0},{x:st.w,y:st.h},{x:0,y:st.h}];
  const c=freeSpot(shape,st.objs,Math.hypot(gs.w,gs.h)/2);
  st.objs.push({id:uid(),type:'parcelle',gid:id,name:gs.name,x:Math.round(c.x-gs.w/2),y:Math.round(c.y-gs.h/2),w:gs.w,h:gs.h,rot:0,zones:[]});
  if(PROP())return save();
  try{localStorage.setItem(keyOf(PROP_ID),JSON.stringify(st));localStorage.setItem(keyAtOf(PROP_ID),String(Date.now()))}catch(e){}
  try{if(relayOn())setTimeout(()=>syncPush(PROP_ID),300)}catch(e){}}
/* nouveau jardin depuis le menu : posé sur la propriété et ouvert sur Aujourd'hui */
function newGarden(st,msg){const id=addGarden(st,false);if(!id)return;placeInProp(id);sheetMode=null;selId=null;if(editMode)setEdit(false);openParcel(id);renderSheet();toast(msg)}
function openParcel(id,t){const k=gKind(id);if(!k||k==='propriete')return;switchGarden(id);setLast(k,id);TOP=k;setTab(t||'today')}
function renderProp(){const v=$('#v-prop');if(!PROP()){v.innerHTML='';return}syncParcels();
  const ps=parcels(),st=ps.map(o=>({o,k:gKind(o.gid),g:gState(o.gid),s:statOf(o.gid)}));
  const area=Math.abs(polyArea(terrainPts()))/1e4,nt=typeof wx!=='undefined'&&wx&&wx.night!=null?wx.night:null;
  const placed=new Set(ps.map(o=>o.gid)),loose=GL.get().list.filter(x=>x.id!==PROP_ID&&!placed.has(x.id));
  const sens=st.filter(x=>x.s.sens>0);
  const ico={potager:'<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19l7-7"/>',fleurs:'<circle cx="12" cy="8" r="3"/><path d="M12 11v10M12 17c2-2 4-2 5-1"/>',verger:'<circle cx="12" cy="9" r="6"/><path d="M12 15v6"/>'};
  const prow=(id,k,name,sub,right)=>`<button class="trow" data-pg="${id}"><span class="pico" style="background:${KCOL[k]}"><svg viewBox="0 0 24 24">${ico[k]}</svg></span><span><b>${esc(name)}</b><span class="note" style="display:block">${sub}</span></span>${right}</button>`;
  const desc=x=>{const g=x.g;if(!g)return'';const n=g.objs.filter(o=>TYPES[o.type]&&TYPES[o.type].plant).length;return`${x.k==='verger'?n+' arbre'+(n>1?'s':''):n+(x.k==='fleurs'?' massif':' planche')+(n>1?'s':'')} · ${num(Math.abs(polyArea(g.shape&&g.shape.length>2?g.shape:[{x:0,y:0},{x:g.w,y:0},{x:g.w,y:g.h},{x:0,y:g.h}]))/1e4,0)} m²`};
  v.innerHTML=`<div class="page"><div class="ttitle"><h2>${esc(S.name)}</h2><span class="note">${ps.length} parcelle${ps.length>1?'s':''} · ${num(area,0)} m²</span></div>
  ${nt!=null&&nt<=2&&sens.length?`<div class="tcard frost"><h3>Gel possible cette nuit · ${num(nt)} °C</h3><span>${sens.map(x=>`<b>${x.s.sens}</b> culture${x.s.sens>1?'s':''} sensible${x.s.sens>1?'s':''} : ${esc(x.o.name)}`).join(' · ')}</span><button class="btn small" data-pg="${sens[0].o.gid}" style="justify-self:start">Voir quoi couvrir</button></div>`:''}
  <div class="tcard pcard"><div class="row between"><h3>Plan</h3><button class="btn small" data-pplan="1">Modifier</button></div>${propSVG(700)}<div class="plegend">${KINDS.map(k=>`<span><i style="background:${KCOL[k]}"></i>${KLBL[k]}</span>`).join('')}<span class="note">Touche une parcelle</span></div></div>
  <div class="tcard"><h3>Parcelles</h3>${st.map(x=>prow(x.o.gid,x.k,x.o.name,desc(x),x.s.n?`<span class="pbadge">${x.s.n}</span>`:'<span class="note">›</span>')).join('')||'<p class="note">Aucune parcelle pour l\'instant.</p>'}
    <div class="row"><button class="btn small primary" data-pnew="potager">+ Potager</button><button class="btn small" data-pnew="fleurs">+ Jardin de fleurs</button><button class="btn small" data-pnew="verger">+ Verger</button></div></div>
  ${loose.length?`<div class="tcard"><h3>Pas sur le plan</h3><span class="note">Ces jardins n'apparaissent pas dans les onglets du bas. Pose-les sur le plan pour t'en servir, ou supprime-les.</span>${loose.map(g=>{const k=gKind(g.id)||'potager';return`<div class="trow"><span class="pico" style="background:${KCOL[k]}"><svg viewBox="0 0 24 24">${ico[k]}</svg></span><span><b>${esc(g.name||KLBL[k])}</b>${g.ex?' <span class="note">· exemple</span>':''}</span><span class="row" style="gap:6px"><button class="btn small" data-pg="${g.id}">Ouvrir</button><button class="btn small" data-pplace="${g.id}">Poser</button><button class="btn small danger" data-pdel="${g.id}" aria-label="Supprimer ${esc(g.name||'')}">Supprimer</button></span></div>`}).join('')}</div>`:''}
  <div class="tcard"><h3>Plan depuis une capture</h3><span class="note">Fais une capture de Google Maps (vue satellite) avec la barre d'échelle, puis :</span>
    <div class="row"><button class="btn small primary" data-pbg="ask">1 · Copier la demande pour Claude</button><button class="btn small" data-pbg="paste">2 · Coller sa réponse</button></div>
    <span class="note">Envoie la demande et la capture à Claude (l'app Claude ou claude.ai), copie sa réponse et colle-la ici : contour, maison, étang, arbres… sont posés d'un coup. Tu corriges ensuite à la main.</span>
    <div class="row">${bgOf()?'<button class="btn small" data-pbg="calib">Capture : échelle et visibilité</button><button class="btn small danger" data-pbg="del">Retirer la capture</button>':'<button class="btn small" data-pbg="add">Mettre la capture en fond</button>'}</div>
    <span class="note">La capture en fond reste sur cet appareil. Si c'est la même que celle envoyée à Claude, elle se cale toute seule sur le plan.</span></div>
  <div class="row"><button class="btn small" data-pex="potager">+ Exemple potager</button><button class="btn small" data-pex="fleurs">+ Exemple fleurs</button><button class="btn small" data-pex="verger">+ Exemple verger</button></div></div>`}
$('#v-prop').addEventListener('click',e=>{const t=e.target.closest('[data-pg],[data-pplan],[data-pnew],[data-pex],[data-pplace],[data-pbg],[data-pdel]');if(!t)return;
  if(t.dataset.pdel){if(!t.classList.contains('armed')){t.classList.add('armed');t.textContent='Confirmer';return}const g=GL.get().list.find(x=>x.id===t.dataset.pdel),nm=g&&g.name||'Jardin';deleteGarden(t.dataset.pdel);GCACHE.delete(t.dataset.pdel);refresh();return toast('« '+nm+' » supprimé')}
  if(t.dataset.pg)return openParcel(t.dataset.pg);
  if(t.dataset.pplan){setTab('plan');setEdit(true);return}
  if(t.dataset.pnew||t.dataset.pex){const k=t.dataset.pnew||t.dataset.pex,id=newParcel(k,!!t.dataset.pex);if(!id)return;const o=S.objs.find(q=>q.gid===id);setTab('plan');setEdit(true);if(o){selId=o.id;fit();renderPlan()}return toast(t.dataset.pex?'Exemple posé : déplace-le où tu veux':'Parcelle créée : place-la sur le plan',true)}
  if(t.dataset.pplace){placeParcel(t.dataset.pplace);const o=S.objs.find(q=>q.gid===t.dataset.pplace);setTab('plan');setEdit(true);if(o){selId=o.id;renderPlan()}return toast('Parcelle posée : place-la où il faut',true)}
  if(t.dataset.pbg)return bgAction(t.dataset.pbg)});
/* onglet d'une sorte de jardin qui n'existe pas encore */
function renderEmpty(){const k=TOP;$('#v-empty').innerHTML=`<div class="page"><div class="tcard"><h3>Pas encore de ${k==='fleurs'?'jardin de fleurs':k==='verger'?'verger':'potager'}</h3><span class="note">Crée une parcelle : elle apparaît sur le plan de la propriété, où tu pourras la déplacer.</span><div class="row"><button class="btn primary" data-enew="${k}">Créer ${k==='fleurs'?'un jardin de fleurs':k==='verger'?'un verger':'un potager'}</button><button class="btn" data-eex="${k}">Essayer l'exemple</button></div></div></div>`}
$('#v-empty').addEventListener('click',e=>{const b=e.target.closest('[data-enew],[data-eex]');if(!b)return;const k=b.dataset.enew||b.dataset.eex,ex=!!b.dataset.eex;
  const pid=GID;if(!PROP())switchGarden(PROP_ID);const id=newParcel(k,ex);if(!id){switchGarden(pid);return}openParcel(id,ex?'today':'plan');if(!ex)setEdit(true);toast(ex?'Exemple ajouté à la propriété':'Créé et posé sur la propriété',true)});

/* fiche d'une parcelle sur le plan de la propriété */
function parcelSheet(o){const st=gState(o.gid),k=st?(st.kind||'potager'):'potager',s=statOf(o.gid);
  return`<div class="stack"><div class="cs-head"><div style="min-width:0"><span class="lbl">${KLBL[k]}</span><div class="nm">${esc(o.name)}</div></div><button class="iconbtn" data-act="close" aria-label="Fermer"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
  <div class="info"><div class="kv"><span class="k">Taille</span><span class="mono">${m2(o.w)} × ${m2(o.h)} m</span></div><div class="kv"><span class="k">À faire aujourd'hui</span><span>${s.n||'rien d\'urgent'}</span></div></div>
  <div class="row"><button class="btn primary" data-act="popen">Ouvrir</button><button class="btn" data-act="popenplan">Plan de la parcelle</button></div>
  <p class="note">La taille et la forme se changent dans le plan de la parcelle (crayon, puis « Forme du terrain »).</p>
  <button class="linkbtn" data-act="toedit">Déplacer ou tourner sur la propriété</button></div>`}

/* au démarrage : « Aujourd'hui » du dernier type de jardin ouvert (potager, fleurs ou verger), la propriété seulement s'il n'y a aucun jardin */
function rawOpen(id){if(id===GID)return;persist();GID=id;const g0=GL.get();g0.cur=GID;GL.set(g0);
  try{localAt=+localStorage.getItem(keyAtOf(GID))||0}catch(e){localAt=0}S=load()||(id===PROP_ID?emptyGarden('Ma propriété','propriete'):sample());lastJSON=JSON.stringify(S);loadUndo()}
{const k=[TOP,lastOf('kind'),...KINDS].find(k=>KINDS.includes(k)&&activeOf(k).length);TOP=k||'prop';
  if(TOP==='prop'){if(GL.get().list.some(x=>x.id===PROP_ID))rawOpen(PROP_ID)}else{const id=pickGarden(TOP);if(id)rawOpen(id)}}
