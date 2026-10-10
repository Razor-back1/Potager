/* ================= Inventaire de l'abri ================= */
let inv=null;
function openInv(tab=null){inv={sel:null,add:false,tab};$('#invView').hidden=false;updateNoteBtn();renderInv();$('#invView').scrollTop=0}
function closeInv(){inv=null;$('#invView').hidden=true;if(typeof updateNoteBtn==='function')updateNoteBtn()}
function renderInv(){if(!inv)return;if(!inv.tab)return renderInvHome();if(inv.tab==='semis')return renderNursery();if(inv.tab==='stock')inv.tab='produits';renderStockTab(inv.tab==='graines')}
function renderStockTab(seedsTab){const st=(S.stock||[]).filter(p=>seedsTab?p.cat==='graine':p.cat!=='graine'),lows=st.filter(isLow);
  const row=p=>{const q=stockOf(p),lo=isLow(p),open=inv.sel===p.id,tot=Math.max(q,(p.moves||[]).filter(m=>m.q>0).reduce((s,m)=>s+m.q,0),0.0001);
    let h=`<div class="prod"><button class="top" data-iv="sel" data-id="${p.id}"><span><b>${seedLabel(p)}</b>${lo==='out'?'<span class="low out">épuisé</span>':lo==='low'?'<span class="low">stock bas</span>':''}${expired(p)?'<span class="low out">périmées</span>':''}<span class="note" style="display:block">${p.cat==='graine'?`${P[p.crop]?P[p.crop].n:'Graines'}${p.variety?' · '+esc(p.variety):''}${p.exp?' · à semer avant fin '+p.exp:''}`:p.cat==='traitement'?`DAR par défaut ${p.dar||0} j`:'Amendement'}${p.min!=null?` · alerte sous ${num(p.min,2)} ${p.unit}`:''}</span></span><span class="q">${num(Math.max(0,q),2)} <small>${p.unit}</small></span></button>
    <div class="bar"><span style="width:${clamp(q/tot*100,0,100)}%;${lo?'background:var(--sun)':''}"></span></div>`;
    if(open){const mv=[...(p.moves||[]).map(m=>({d:m.d,v:+m.q,t:m.k==='achat'?'Ajout au stock':'Correction'})),...prodUses(p).map(u=>({d:u.e.d,v:-u.e.qty,t:u.lab||('Utilisé · '+fullName(u.o))}))].sort((a,b)=>b.d.localeCompare(a.d));
      h+=`<div class="grid2"><label class="field"><span class="lbl">Ajouter (${p.unit})</span><input id="iv-add" type="number" min="0" step="0.1"></label><label class="field"><span class="lbl">Stock réel (${p.unit})</span><input id="iv-real" type="number" min="0" step="0.1" placeholder="${num(Math.max(0,q),2)}"></label>
      <button class="btn small primary" data-iv="addq" data-id="${p.id}">Ajouter au stock</button><button class="btn small" data-iv="fix" data-id="${p.id}">Corriger le stock</button></div>
      ${p.cat==='traitement'?`<label class="field" style="max-width:220px"><span class="lbl">Délai avant récolte par défaut (j)</span><input id="iv-dar" data-id="${p.id}" type="number" min="0" step="1" value="${p.dar||0}"></label>`:''}
      <label class="field" style="max-width:220px"><span class="lbl">Alerte stock bas sous (${p.unit})</span><input id="iv-min" data-id="${p.id}" type="number" min="0" step="0.1" value="${p.min??''}"></label>
      <div><span class="lbl">Mouvements</span>${mv.length?mv.map(m=>`<div class="mv"><span class="d">${fdate(parse(m.d))}</span><span>${esc(m.t)}</span><span class="v ${m.v<0?'down':'up'}">${m.v>0?'+':'−'}${num(Math.abs(m.v),2)} ${p.unit}</span></div>`).join(''):'<p class="note">Aucun mouvement.</p>'}</div>
      <button class="btn small danger" data-iv="del" data-id="${p.id}" style="justify-self:start">Supprimer le produit</button>`}
    return h+`</div>`};
  const group=c=>{const ps=st.filter(p=>p.cat===c);return`<div class="stack"><div class="section-t"><span class="lbl">${CAT[c]}</span><span class="mono note">${ps.length}</span></div>${ps.length?`<div class="hvlist">${ps.map(row).join('')}</div>`:emptyHTML('box','Aucun produit pour l\'instant.')}</div>`};
  const form=!inv.add?'':seedsTab?`<div class="panel"><h3>Nouveau sachet de graines</h3><div class="grid2">
    <input id="np-cat" type="hidden" value="graine">
    <label class="field"><span class="lbl">Culture</span><select id="np-crop">${PLANTS.map(q=>`<option value="${q.id}">${q.n}</option>`).join('')}</select></label>
    <label class="field"><span class="lbl">Variété</span><input id="np-var" placeholder="ex. Cœur de bœuf"></label>
    <label class="field"><span class="lbl">Quantité</span><input id="np-q" type="number" min="0" step="1"></label>
    <label class="field"><span class="lbl">Unité</span><select id="np-unit"><option>graines</option><option>g</option><option>sachet</option></select></label>
    <label class="field"><span class="lbl">À semer avant (année)</span><input id="np-exp" type="number" min="2000" max="2100" step="1" placeholder="${YEAR+2}"></label>
    <label class="field"><span class="lbl">Alerte sous</span><input id="np-min" type="number" min="0" step="1" placeholder="facultatif"></label></div>
    <div class="row"><button class="btn primary" data-iv="create">Ajouter les graines</button><button class="btn" data-iv="cancel">Annuler</button></div></div>`
  :`<div class="panel"><h3>Nouveau produit</h3><div class="grid2"><label class="field span2"><span class="lbl">Nom</span><input id="np-name" placeholder="ex. Fumier de cheval"></label>
    <label class="field"><span class="lbl">Type</span><select id="np-cat"><option value="amendement" selected>Amendement</option><option value="traitement">Traitement</option></select></label>
    <label class="field"><span class="lbl">Unité</span><select id="np-unit"><option>kg</option><option>L</option></select></label>
    <label class="field"><span class="lbl">Quantité en stock</span><input id="np-q" type="number" min="0" step="0.1"></label>
    <label class="field"><span class="lbl">Alerte sous</span><input id="np-min" type="number" min="0" step="0.1" placeholder="facultatif"></label>
    <label class="field span2"><span class="lbl">Délai avant récolte (traitements, en jours)</span><input id="np-dar" type="number" min="0" step="1" placeholder="voir l'étiquette"></label></div>
    <div class="row"><button class="btn primary" data-iv="create">Ajouter le produit</button><button class="btn" data-iv="cancel">Annuler</button></div></div>`;
  $('#invView').innerHTML=`<div class="bedhead"><button class="iconbtn" data-iv="home" aria-label="Retour"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><div style="min-width:0;flex:1"><div class="brand" style="font-size:17px">${seedsTab?'Graines':'Produits'}</div><div class="mono note">${st.length} ${seedsTab?'sachet':'produit'}${st.length>1?'s':''}${lows.length?' · '+lows.length+' à racheter':''}</div></div>${inv.add?'':`<button class="btn small primary" data-iv="new">+ ${seedsTab?'Graines':'Produit'}</button>`}</div>
  <div class="bedbody">${lows.length?`<div class="alert amber"><span>À racheter : ${lows.map(p=>`<b>${esc(p.name)}</b> (${fq(stockOf(p),p.unit)})`).join(', ')}.</span></div>`:''}${form}${seedsTab?group('graine'):group('amendement')+group('traitement')}
  <p class="note">${seedsTab?'Les graines se déduisent toutes seules quand tu notes un semis dans le journal d\'une planche ou un semis en godets. Les graines périmées ne sont plus proposées.':'Le stock baisse tout seul quand tu notes un amendement ou un traitement dans le journal d\'une planche.'} Supprimer l'entrée du journal remet la quantité en stock.</p></div>`;
}
const TRANSPLANT0={laitue_h:35,tomate:50,poivron:60,aubergine:60,courgette:25,concombre:25,potiron:25,mais:21,chou:35,poireau:70,celeri:60,laitue:30,basilic:40,oignon:50,fenouil:30,blette:30,persil:40,fraise:60,betterave:30,epinard:30,mache:30,feve:25,pois:21,haricot:18};
const TRANSPLANT={...TRANSPLANT0,...Object.fromEntries(FLOWERS.filter(p=>(p.sg||[]).length).map(p=>[p.id,p.t==='bisannuelle'?70:p.t==='tubercule'?35:45]))};
const readyOf=n=>addD(n.d,TRANSPLANT[n.crop]||30);
const nurseryActive=()=>(S.nursery||[]).filter(n=>n.st==='cours');
/* ---- semis échelonnés : ressemer à intervalle régulier pour récolter (ou couper) en continu ---- */
const SUCC={radis:14,laitue:21,epinard:21,mache:21,haricot:21,pois:21,carotte:30,betterave:30,f_glaieul:15,f_tournesol:15};
function succession(){const mo=TODAY.getMonth()+1,off=S.succOff||{},last={};
  plantings().forEach(x=>{if(SUCC[x.p.id]&&(!last[x.p.id]||x.d>last[x.p.id]))last[x.p.id]=x.d});
  (S.nursery||[]).forEach(n=>{if(SUCC[n.crop]&&n.d&&(!last[n.crop]||n.d>last[n.crop]))last[n.crop]=n.d});
  const out=[];for(const id in last){const p=P[id];if(!p||!PLANTS.includes(p)||off[id]===YEAR)continue;
    const ago=days(parse(last[id]),TODAY),int=SUCC[id];if(ago>90||ago<0)continue;
    const next=addD(last[id],int),nm=next.getMonth()+1,season=[...(p.m||[]),...(p.sg||[])];
    if(!season.includes(nm)&&!(next<=TODAY&&season.includes(mo)))continue;
    out.push({p,int,ago,next,left:days(TODAY,next)})}
  return out.sort((a,b)=>a.left-b.left)}
function freeZone(){for(const o of plantables())if(!serreOf(o))for(let i=0;i<o.zones.length;i++)if(!o.zones[i].crop)return{o,i};return null}
const nurseryReady=()=>nurseryActive().filter(n=>readyOf(n)<=TODAY);
function renderInvHome(){const act=nurseryActive(),rd=nurseryReady(),st=S.stock||[];
  const sc=(l,w)=>{const lo=l.filter(isLow).length;return`${l.length} ${w}${l.length>1?'s':''}${lo?` · <b style="display:inline;font-size:inherit;color:var(--sun)">${lo} à racheter</b>`:''}`};
  $('#invView').innerHTML=`<div class="bedhead"><button class="iconbtn" data-iv="back" aria-label="Retour"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><div style="min-width:0;flex:1"><div class="brand" style="font-size:17px">Abri à outils</div><div class="note">Semis, graines et produits</div></div></div>
  <div class="bedbody"><div class="abhome">
    <button class="abcard" data-iv="tab" data-t="semis"><svg viewBox="0 0 24 24"><path d="M6 20h12l-1.5-7h-9z"/><path d="M12 13V8"/><path d="M12 9c0-3 2-5 5-5 0 3-2 5-5 5zM12 10c0-2.5-1.7-4-4-4 0 2.3 1.7 4 4 4z"/></svg><span><b>Semis</b><span class="note">${act.length} en cours${rd.length?` · <b style="display:inline;font-size:inherit;color:var(--ok)">${rd.length} à repiquer</b>`:''}</span></span><span class="chev">›</span></button>
    <button class="abcard" data-iv="tab" data-t="graines"><svg viewBox="0 0 24 24"><path d="M6 3h12v18H6z"/><path d="M6 8h12"/><ellipse cx="10" cy="13" rx="1.4" ry="2"/><ellipse cx="14" cy="16" rx="1.4" ry="2"/></svg><span><b>Graines</b><span class="note">${sc(st.filter(p=>p.cat==='graine'),'sachet')}</span></span><span class="chev">›</span></button>
    <button class="abcard" data-iv="tab" data-t="produits"><svg viewBox="0 0 24 24"><path d="M4 8l8-4 8 4v10l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v10"/></svg><span><b>Produits</b><span class="note">${sc(st.filter(p=>p.cat!=='graine'),'produit')}</span></span><span class="chev">›</span></button>
  </div></div>`}
function renderNursery(){const all=S.nursery||[],act=nurseryActive().sort((a,b)=>readyOf(a)-readyOf(b)),rd=act.filter(n=>readyOf(n)<=TODAY),wait=act.filter(n=>readyOf(n)>TODAY),done=all.filter(n=>n.st!=='cours').slice(-5).reverse();
  const ns=inv.ns||(inv.ns={crop:'laitue',n:12,qty:'',d:iso(TODAY),pid:''});
  const seeds=(S.stock||[]).filter(q=>q.cat==='graine'&&q.crop===ns.crop&&stockOf(q)>0&&!expired(q));
  const item=n=>{const p=P[n.crop],r=readyOf(n),left=days(TODAY,r),tot=TRANSPLANT[n.crop]||30,prog=clamp(days(parse(n.d),TODAY)/tot,0,1),open=inv.sel===n.id;
    let h=`<div class="prod"><button class="top" data-iv="nsel" data-id="${n.id}"><span><b>${p?p.n:n.crop}</b> <span class="note">· ${n.n} godet${n.n>1?'s':''}</span><span class="note" style="display:block">Semé le ${fdate(parse(n.d))} · repiquage ${left<=0?'possible':'vers le '+fdate(r)}</span></span><span class="${left<=0?'due ready':'due'}">${left<=0?'prêt':'dans '+left+' j'}</span></button><div class="bar"><span style="width:${prog*100}%"></span></div>`;
    if(open&&n.st==='cours'){const targets=plantables();const tg=inv.tgt||(inv.tgt={o:(targets.find(o=>o.zones.some(z=>!z.crop))||targets[0]||{}).id,zi:0});const to=obj(tg.o);
      h+=`<div class="grid2"><label class="field"><span class="lbl">Planche</span><select id="ns-o">${targets.map(o=>`<option value="${o.id}" ${o.id===tg.o?'selected':''}>${esc(fullName(o))}</option>`).join('')}</select></label>
      <label class="field"><span class="lbl">Zone</span><select id="ns-z">${to?to.zones.map((z,i)=>`<option value="${i}" ${i===tg.zi?'selected':''}>Zone ${i+1} · ${z.crop?P[z.crop].n:'libre'}</option>`).join(''):''}</select></label></div>
      ${to&&to.zones[tg.zi]&&to.zones[tg.zi].crop&&to.zones[tg.zi].crop!==n.crop?`<p class="note" style="color:var(--danger)">Cette zone contient déjà ${P[to.zones[tg.zi].crop].n.toLowerCase()} : elle sera remplacée.</p>`:''}
      <div class="row"><button class="btn small primary" data-iv="trans" data-id="${n.id}">Repiquer ici</button><button class="btn small" data-iv="lost" data-id="${n.id}">Semis perdu</button><button class="btn small danger" data-iv="ndel" data-id="${n.id}">Supprimer</button></div>`}
    return h+`</div>`};
  const form=inv.add?`<div class="panel"><h3>Nouveau semis en godets</h3><div class="grid2">
    <label class="field"><span class="lbl">Culture</span><select id="ns-crop">${PLANTS.map(q=>`<option value="${q.id}" ${q.id===ns.crop?'selected':''}>${q.n}</option>`).join('')}</select></label>
    <label class="field"><span class="lbl">Date</span><input id="ns-d" type="date" value="${ns.d}"></label>
    <label class="field span2"><span class="lbl">Graines du stock</span><select id="ns-pid"><option value="">Sans graines du stock</option>${seeds.map(q=>`<option value="${q.id}" ${q.id===ns.pid?'selected':''}>${seedLabel(q)} · ${fq(stockOf(q),q.unit)}</option>`).join('')}</select></label>
    <label class="field"><span class="lbl">Godets</span><input id="ns-n" type="number" min="1" step="1" value="${ns.n}"></label>
    <label class="field"><span class="lbl">Graines utilisées</span><input id="ns-q" type="number" min="0" step="1" value="${ns.qty}" placeholder="${seeds.length?'quantité':'—'}" ${seeds.length?'':'disabled'}></label></div>
    <p class="note">${P[ns.crop].n} : repiquage environ ${TRANSPLANT[ns.crop]||30} jours après le semis.${seeds.length?'':' Aucune graine de cette culture en stock.'}</p>
    <div class="row"><button class="btn primary" data-iv="ncreate">Ajouter le semis</button><button class="btn" data-iv="cancel">Annuler</button></div></div>`:'';
  const sec=(t,l)=>l.length?`<div class="stack"><div class="section-t"><span class="lbl">${t}</span><span class="mono note">${l.length}</span></div><div class="hvlist">${l.map(item).join('')}</div></div>`:'';
  $('#invView').innerHTML=`<div class="bedhead"><button class="iconbtn" data-iv="home" aria-label="Retour"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><div style="min-width:0;flex:1"><div class="brand" style="font-size:17px">Semis</div><div class="mono note">${act.length} en cours${rd.length?' · '+rd.length+' à repiquer':''}</div></div>${inv.add?'':'<button class="btn small primary" data-iv="new">+ Semis</button>'}</div>
  <div class="bedbody">${form}${sec('À repiquer',rd)}${sec('En cours',wait)}${!act.length&&!inv.add?emptyHTML('pot','Aucun semis en cours. Ajoute tes semis en godets pour suivre la date de repiquage.'):''}
  ${done.length?`<div class="stack"><span class="lbl">Derniers terminés</span><div class="jlist">${done.map(n=>`<div class="jent"><span class="d">${fdate(parse(n.td||n.d))}</span><div>${P[n.crop]?P[n.crop].n:''} · ${n.n} godets <span class="note">· ${n.st==='perdu'?'perdu':'repiqué'+(obj(n.to)?' sur '+esc(fullName(obj(n.to))):'')}</span></div><button class="del" data-iv="ndel" data-id="${n.id}" aria-label="Supprimer">×</button></div>`).join('')}</div></div>`:''}</div>`}
$('#invView').addEventListener('click',e=>{const b=e.target.closest('[data-iv]');if(!b)return;const a=b.dataset.iv,p=(S.stock||[]).find(q=>q.id===b.dataset.id);
  if(a==='back'){closeInv();if(bed)renderBed();else refresh();return}
  if(a==='home'){inv.tab=null;inv.add=false;inv.sel=null;renderInv();return}
  if(a==='tab'){inv.tab=b.dataset.t;inv.add=false;inv.sel=null;renderInv();$('#invView').scrollTop=0;return}
  if(a==='nsel'){inv.sel=inv.sel===b.dataset.id?null:b.dataset.id;inv.tgt=null;renderInv();return}
  if(a==='ncreate'){const ns=inv.ns,pr=(S.stock||[]).find(q=>q.id===ns.pid),q=parseFloat(ns.qty)||0;
    if(pr&&q>stockOf(pr)+1e-9)return toast(`Stock insuffisant : il reste ${fq(stockOf(pr),pr.unit)}`);
    S.nursery=S.nursery||[];S.nursery.push({id:uid(),crop:ns.crop,pid:pr?pr.id:null,qty:pr?q:0,n:Math.max(1,parseInt(ns.n)||1),d:ns.d||iso(TODAY),st:'cours'});inv.add=false;inv.ns=null;save();renderInv();return toast('Semis ajouté'+(pr&&q?` · reste ${fq(stockOf(pr),pr.unit)}`:''),true)}
  if(a==='trans'||a==='lost'||a==='ndel'){const n=(S.nursery||[]).find(x=>x.id===b.dataset.id);if(!n)return;
    if(a==='ndel'){S.nursery=S.nursery.filter(x=>x!==n);inv.sel=null;save();renderInv();return toast('Semis supprimé',true)}
    if(a==='lost'){n.st='perdu';n.td=iso(TODAY);inv.sel=null;save();renderInv();return toast('Semis marqué comme perdu',true)}
    const o=obj(inv.tgt&&inv.tgt.o),z=o&&o.zones[inv.tgt.zi];if(!z)return toast('Choisis une planche et une zone');
    if(z.crop!==n.crop){z.crop=n.crop;z.cells={}}z.date=iso(TODAY);recordGrown(o,n.crop,YEAR);
    const g=zoneGrid(o,z);let left=Math.ceil(n.n/g.per);for(let r=0;r<g.rows&&left>0;r++)for(let c=0;c<g.cols&&left>0;c++){const k=r+'-'+c;if(!z.cells[k]){z.cells[k]=z.date;left--}}
    o.journal=o.journal||[];o.journal.push({id:uid(),k:'note',d:iso(TODAY),t:`Repiquage de ${n.n} plants de ${P[n.crop].n.toLowerCase()} (semés le ${fdate(parse(n.d))})`});
    n.st='repique';n.td=iso(TODAY);n.to=o.id;inv.sel=null;save();renderInv();return toast(`${P[n.crop].n} repiquée sur ${fullName(o)}`,true)}
  if(a==='new'){inv.add=true;inv.sel=null;renderInv();return}
  if(a==='cancel'){inv.add=false;renderInv();return}
  if(a==='sel'){inv.sel=inv.sel===p.id?null:p.id;renderInv();return}
  if(a==='create'){const name=$('#np-name')?$('#np-name').value.trim():(P[$('#np-crop').value]||{}).n;if(!name)return toast('Donne un nom au produit');
    const q=parseFloat($('#np-q').value)||0,mn=parseFloat($('#np-min').value),dar=$('#np-dar')?parseInt($('#np-dar').value):NaN;
    const np={id:uid(),name,cat:$('#np-cat').value,unit:$('#np-unit').value,min:isNaN(mn)?null:mn,moves:q>0?[{d:iso(TODAY),q,k:'achat'}]:[]};
    if(np.cat==='graine'){np.crop=$('#np-crop').value||null;np.variety=$('#np-var').value.trim()||null;const ex=parseInt($('#np-exp').value);np.exp=isNaN(ex)?null:ex;if(!['g','graines','sachet'].includes(np.unit))np.unit='graines'}if(np.cat==='traitement')np.dar=isNaN(dar)?0:dar;
    S.stock=S.stock||[];S.stock.push(np);inv.add=false;inv.sel=np.id;save();renderInv();return toast(`${name} ajouté à l'inventaire`,true)}
  if(!p)return;
  if(a==='addq'){const q=parseFloat($('#iv-add').value)||0;if(q<=0)return toast('Indique la quantité à ajouter');p.moves.push({d:iso(TODAY),q,k:'achat'});save();renderInv();return toast(`+${fq(q,p.unit)} · ${p.name}`,true)}
  if(a==='fix'){const r=parseFloat($('#iv-real').value);if(isNaN(r)||r<0)return toast('Indique la quantité réellement en stock');const dq=r-stockOf(p);if(Math.abs(dq)<1e-9)return toast('Le stock est déjà juste');p.moves.push({d:iso(TODAY),q:dq,k:'correction'});save();renderInv();return toast(`Stock corrigé : ${fq(r,p.unit)}`,true)}
  if(a==='del'){if(!b.classList.contains('armed')){b.classList.add('armed');b.textContent='Confirmer la suppression';return}S.stock=S.stock.filter(q=>q!==p);inv.sel=null;save();renderInv();return toast(`${p.name} retiré de l'inventaire`,true)}
});
$('#invView').addEventListener('change',e=>{const t=e.target;
  if(inv&&inv.ns&&t.id&&t.id.startsWith('ns-')&&t.id!=='ns-o'&&t.id!=='ns-z'){const k={'ns-crop':'crop','ns-d':'d','ns-pid':'pid','ns-n':'n','ns-q':'qty'}[t.id];inv.ns[k]=t.value;if(k==='crop'){inv.ns.pid='';inv.ns.qty=''}if(k==='crop'||k==='pid')renderInv();return}
  if(t.id==='ns-o'){inv.tgt={o:t.value,zi:0};renderInv();return}
  if(t.id==='ns-z'){inv.tgt.zi=+t.value;renderInv();return}
  const p=(S.stock||[]).find(q=>q.id===t.dataset.id);if(!p)return;
  if(t.id==='iv-dar'){p.dar=Math.max(0,parseInt(t.value)||0);save();renderInv()}
  if(t.id==='iv-min'){const v=parseFloat(t.value);p.min=isNaN(v)?null:v;save();renderInv()}});

