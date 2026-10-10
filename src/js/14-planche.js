/* ================= Planche : grille, rotation, journal ================= */
function openBed(id,zi=0,jk='arrosage',toJournal=false){bed={id,zi,cell:null,jk,photo:null};$('#bedView').hidden=false;updateNoteBtn();renderBed();$('#bedView').scrollTop=0;if(toJournal){const j=$('#jpanel');if(j)j.scrollIntoView({block:'start'})}}
function closeBed(){bed=null;$('#bedView').hidden=true;if(typeof updateNoteBtn==='function')updateNoteBtn()}
const ROWS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const photoSrc=ph=>ph?(ph.r||(ph.a?'/_blob/'+ph.a:ph.u)):'';
function renderBed(){
  const o=obj(bed.id);if(!o)return closeBed();
  const L=Math.max(o.w,o.h),W=Math.min(o.w,o.h);bed.zi=clamp(bed.zi,0,o.zones.length-1);const z=o.zones[bed.zi],Y=yearOf(z);
  const used=o.zones.reduce((s,q)=>s+q.len,0),free=L-used;
  let strip=`<rect width="${L}" height="${W}" rx="6" style="fill:var(--soil)"/>`,off=0;
  o.zones.forEach((q,i)=>{const p=P[q.crop];strip+=`<g class="z" data-zone="${i}"><rect x="${off}" y="0" width="${q.len}" height="${W}" ${p?`fill="${p.c}" fill-opacity=".55"`:'fill="url(#hatchB)"'}/><text x="${off+q.len/2}" y="${W/2}" text-anchor="middle" dominant-baseline="central" font-size="${Math.min(W*.28,L*.04)}" style="fill:var(--surface);font-weight:700;font-family:var(--f-body)">${p?esc(p.n):'Libre'}</text></g>`;off+=q.len});
  if(free>0)strip+=`<rect x="${off}" width="${free}" height="${W}" fill="url(#hatchB)"/>`;
  let zo=0;for(let i=0;i<bed.zi;i++)zo+=o.zones[i].len;strip+=`<rect class="zsel" x="${zo+2}" y="2" width="${Math.max(1,z.len-4)}" height="${W-4}" rx="4" vector-effect="non-scaling-stroke"/>`;
  const others=[...new Set([...o.zones.filter(q=>q!==z&&q.crop).map(q=>q.crop),...neighbors(o).flatMap(n=>n.zones.filter(q=>q.crop).map(q=>q.crop))])];
  const adv=advice(others);
  const zd=z.date&&parse(z.date)>TODAY?parse(z.date):TODAY,optOf=p=>{const s=others.reduce((m,c)=>Math.min(m,compat(c,p.id)),1),g=others.some(c=>compat(c,p.id)>0),ri=rotIssue(o,p.id,Y),sc=sunCheck(o,bed.zi,p.id,z.date);
    const tags=[inSeason(p,zd)?'':'hors saison',s<0?'à éviter ici':g?'bon voisin':'',ri?'rotation '+ri.y:'',sc&&sc.lvl==='insuffisant'?'trop d\'ombre':sc&&sc.lvl==='juste'?'soleil juste':''].filter(Boolean).join(', ');return`<option value="${p.id}" ${z.crop===p.id?'selected':''}>${p.n}${tags?' · '+tags:''}</option>`};
  const opts=`<optgroup label="De saison (${fdate(zd)})">${PLANTS.filter(p=>inSeason(p,zd)).map(optOf).join('')}</optgroup><optgroup label="Hors saison">${PLANTS.filter(p=>!inSeason(p,zd)).map(optOf).join('')}</optgroup>`;
  const g=zoneGrid(o,z),p=P[z.crop];
  let grid='',cellInfo='';
  if(g){let s='';
    for(let r=0;r<g.rows;r++){s+=`<text class="axis" x="-6" y="${(r+.5)*g.cellW}" text-anchor="end" dominant-baseline="central" font-size="${Math.min(g.cellW*.5,W*.12)}">${ROWS[r]||r}</text>`;
      for(let c=0;c<g.cols;c++){const k=r+'-'+c,on=z.cells[k],sel=bed.cell===k;s+=`<rect class="c ${on?'planted':'empty'} ${sel?'on':''}" data-cell="${k}" x="${c*g.cellL+1}" y="${r*g.cellW+1}" width="${g.cellL-2}" height="${g.cellW-2}" rx="3" vector-effect="non-scaling-stroke"/>`;
        if(on){const sz=Math.min(g.cellL,g.cellW)*.8;s+=`<use href="#${symOf(p.id,progOf(on,p.id))}" x="${c*g.cellL+(g.cellL-sz)/2}" y="${r*g.cellW+(g.cellW-sz)/2}" width="${sz}" height="${sz}" pointer-events="none"/>`}}}
    const ax=Math.min(g.cellW*.5,W*.12);
    for(let c=0;c<g.cols;c+=Math.max(1,Math.ceil(g.cols/12)))s+=`<text class="axis" x="${(c+.5)*g.cellL}" y="-6" text-anchor="middle" font-size="${ax}">${c+1}</text>`;
    const pl=W*.16;const n=Object.keys(z.cells).length;
    grid=`<div class="row between"><span class="note">Grille ${g.cols} × ${g.rows} · case ${Math.round(g.cellL)} × ${Math.round(g.cellW)} cm · ≈ ${g.per} plant${g.per>1?'s':''} par case</span><span class="mono note">${n}/${g.cols*g.rows}</span></div><svg class="cellgrid" viewBox="${-pl} ${-pl} ${z.len+pl} ${W+pl}">${s}</svg>`;
    if(bed.cell){const[r,c]=bed.cell.split('-').map(Number),d=z.cells[bed.cell],lab=(ROWS[r]||r)+(c+1);
      if(d){const hv=addD(d,p.j),left=days(TODAY,hv);cellInfo=`<div class="celldetail"><div class="row between"><span class="big">Case ${lab} · ${p.n}</span><button class="btn small danger" data-act="unplant">Retirer</button></div>
        <div class="grid2"><label class="field"><span class="lbl">Semé / planté le</span><input id="c-date" type="date" value="${d}"></label><div class="field"><span class="lbl">Récolte prévue</span><span class="mono" style="padding-top:9px">${fdate(hv)} · ${left>0?'dans '+left+' j':'prête'}</span></div></div></div>`}
      else cellInfo=`<div class="celldetail"><span class="big">Case ${lab} · vide</span><div class="row"><button class="btn primary small" data-act="plantcell">Planter ${p.n.toLowerCase()} ici</button><button class="btn small" data-act="plantrow">Toute la ligne ${ROWS[r]||r}</button></div><p class="note">Date utilisée : ${fdate(parse(z.date||iso(TODAY)))}, réglable plus haut.</p></div>`}
    else cellInfo=`<p class="note">Touche une case pour la planter ou voir sa date de récolte.</p>`;
  }else grid=`<p class="note">Choisis une culture : la grille se calcule d'après l'espacement entre rangs et entre plants.</p>`;
  const zr=rotIssue(o,z.crop,Y);
  /* historique */
  const years=[...new Set((o.grown||[]).map(x=>x.y))].sort((a,b)=>b-a);
  const hist=years.length?years.map(y=>`<div class="row" style="align-items:flex-start"><span class="mono" style="min-width:44px;padding-top:4px">${y}</span><div class="chips">${o.grown.filter(x=>x.y===y).map(x=>P[x.crop]?`<span class="chip">${ci((P[x.crop]).id)}${P[x.crop].n}<span class="note" style="font-size:11px">${P[x.crop].f}</span><button class="x" data-act="ungrow" data-y="${y}" data-crop="${x.crop}" aria-label="Retirer">×</button></span>`:'').join('')}</div></div>`).join(''):`<p class="note">Aucun historique. Ajoute ce qui a poussé ici les années précédentes.</p>`;
  /* journal */
  const bu=blockUntil(o);const zc=[...new Set(o.zones.filter(q=>q.crop).map(q=>q.crop))];
  const jk=bed.jk;
  let jform=`<div class="seg">${Object.entries(JT).map(([k,l])=>`<button data-act="jk" data-k="${k}" aria-pressed="${jk===k}">${l}</button>`).join('')}</div>
  <div class="grid2"><label class="field"><span class="lbl">Date</span><input id="j-date" type="date" value="${iso(TODAY)}"></label>`;
  if(jk==='recolte')jform+=FLW()?`<label class="field"><span class="lbl">Nombre de tiges</span><input id="j-kg" type="number" min="0" step="1" placeholder="0"></label>`:`<label class="field"><span class="lbl">Poids (kg)</span><input id="j-kg" type="number" min="0" step="0.1" placeholder="0,0"></label><label class="field span2"><span class="lbl">Culture</span><select id="j-crop">${(zc.length?zc:PLANTS.map(q=>q.id)).map(c=>`<option value="${c}">${P[c].n}</option>`).join('')}</select></label>`;
  else if(isProdJ(jk)){const zc0=z.crop;const prods=(S.stock||[]).filter(q=>q.cat===JCAT(jk)).sort((a,b)=>(b.crop===zc0)-(a.crop===zc0)),avail=prods.filter(q=>stockOf(q)>0&&!expired(q));
    if(!avail.length)jform+=`<div class="alert amber span2"><span>${prods.length?'Plus rien en stock pour ':'Aucun produit dans l\'inventaire pour '}${jk==='traitement'?'les traitements':jk==='semis'?'les graines':'les amendements'}. Ajoute-le d'abord dans l'abri.</span><button class="btn small" data-act="openinv" style="justify-self:start">Ouvrir l'inventaire</button></div>`;
    else{const cur=avail.find(q=>q.id===bed.pid)||avail[0];bed.pid=cur.id;
      jform+=`<label class="field span2"><span class="lbl">${jk==='semis'?'Graines en stock':'Produit en stock'}</span><select id="j-pid">${prods.map(q=>{const st=stockOf(q),ex=expired(q);return`<option value="${q.id}" ${q.id===cur.id?'selected':''} ${st<=0||ex?'disabled':''}>${q.cat==='graine'&&P[q.crop]?P[q.crop].n+' · ':''}${esc(q.name)}${q.variety?' « '+esc(q.variety)+' »':''} · ${fq(st,q.unit)}${st<=0?' (épuisé)':ex?' (périmées)':''}</option>`}).join('')}</select></label>
      <label class="field"><span class="lbl">Quantité (${cur.unit})</span><input id="j-qty" type="number" min="0" step="${cur.unit==='kg'?'0.05':['graines','sachet'].includes(cur.unit)?'1':'0.1'}" placeholder="max ${num(stockOf(cur),2)}"></label>`;
      jform+=jk==='traitement'?`<label class="field"><span class="lbl">Délai avant récolte (j)</span><input id="j-dar" type="number" min="0" step="1" value="${cur.dar||0}"></label>`:`<span></span>`}}
  else jform+=`<span></span>`;
  jform+=`<label class="field span2"><span class="lbl">Note</span><textarea id="j-text" placeholder="${jk==='semis'?'ex. semis en ligne, 2 rangs':jk==='arrosage'?'ex. 40 L à l\'arrosoir':jk==='amendement'?'ex. compost, 2 brouettes':'Observation'}"></textarea></label></div>
  <div class="photoprev">${bed.photo?`<img src="${photoSrc(bed.photo)}" alt="Photo jointe"><button class="btn small" data-act="photo-x">Retirer la photo</button>`:`<label class="btn small" for="j-photo">Ajouter une photo</label>`}<input id="j-photo" type="file" accept="image/*" hidden></div>`;
  const noStock=isProdJ(jk)&&!(S.stock||[]).some(q=>q.cat===JCAT(jk)&&stockOf(q)>0&&!expired(q));
  const blockRec=(jk==='recolte'&&bu)||noStock;
  if(jk==='recolte'&&bu)jform+=`<div class="alert"><span>Récolte impossible avant le <b>${fdate(bu)}</b> : délai après traitement en cours.</span></div>`;
  if(jk==='maladie')jform=jform.slice(0,jform.indexOf('</div>')+6)+diagHTML(o);
  else jform+=`<button class="btn primary" data-act="jadd" ${blockRec?'disabled':''}>Ajouter au journal</button>`;
  const jl=(o.journal||[]).slice().sort((a,b)=>b.d.localeCompare(a.d));
  const jlist=jl.length?`<div class="jlist">${jl.map(e=>{let det='';
    if(e.k==='recolte')det=`${P[e.crop]?P[e.crop].n:''} · <span class="mono">${num(e.kg)} ${e.u||'kg'}</span>`;
    if(e.k==='maladie')det=`${e.crop&&P[e.crop]?P[e.crop].n+' · ':''}<b>${esc(e.diag&&e.diag.diagnostic||'Symptômes notés')}</b>${e.diag&&e.diag.confiance?` <span class="conf ${esc(e.diag.confiance)}">${esc(e.diag.confiance)}</span>`:''}`;
    if(isProdJ(e.k)){const u=addD(e.d,+e.dar||0);det=e.prod?`${e.crop&&P[e.crop]&&e.k==='semis'?P[e.crop].n+' · ':''}${esc(e.prod)}${+e.qty?` · <span class="mono">${num(e.qty,2)} ${e.unit||''}</span>`:''}${e.dose?' · '+esc(e.dose):''}${e.k==='traitement'&&+e.dar?` · DAR ${e.dar} j${u>TODAY?' → '+fdate(u):''}`:''}`:''}
    return`<div class="jent"><span class="d">${fdate(parse(e.d))}</span><div style="min-width:0"><span class="k ${e.k}">${JT[e.k]}</span>${det?`<div>${det}</div>`:''}${e.t?`<div class="note" style="color:var(--ink)">${esc(e.t)}</div>`:''}${e.ph?`<img src="${photoSrc(e.ph)}" alt="Photo du ${fdate(parse(e.d))}" loading="lazy">`:''}</div><button class="del" data-act="jdel" data-id="${e.id}" aria-label="Supprimer l'entrée">×</button></div>`}).join('')}</div>`:`${emptyHTML('book','Le journal est vide. Note ici arrosages, traitements, récoltes et observations.')}`;

  $('#bedView').innerHTML=`<svg width="0" height="0" style="position:absolute"><defs><pattern id="hatchB" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="16" height="16" style="fill:var(--soil)"/><line x1="0" y1="0" x2="0" y2="16" style="stroke:var(--soil-edge)" stroke-width="5"/></pattern></defs></svg>
  <div class="bedhead"><button class="iconbtn" data-act="back" aria-label="Retour"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><div style="min-width:0"><div class="brand" style="font-size:17px">${esc(o.name)}</div><div class="mono note">${m2(L)} × ${m2(W)} m · ${o.zones.length} zone${o.zones.length>1?'s':''}${free>0?' · '+m2(free)+' m libres':''}</div></div></div>
  <div class="bedbody">
    <div class="bednav"><button data-jump="ppanel">Plantation</button><button data-jump="tpanel">Planning</button><button data-jump="vpanel">Voisins</button><button data-jump="rpanel">Rotation</button><button data-jump="jpanel">Journal</button></div>
    <div class="panel" id="ppanel"><div class="row between"><h3>Zones de la planche</h3><button class="btn small" data-act="addzone">+ Zone</button></div>
      <svg class="strip" viewBox="-4 -4 ${L+8} ${W+8}">${strip}</svg>${alertsHTML(o)}
      <div><span class="lbl">Soleil direct au centre</span>${sunLine(o)}</div></div>
    <div class="panel"><div class="row between"><h3>Zone ${bed.zi+1}${p?' · '+p.n:''}</h3>${o.zones.length>1?'<button class="btn small danger" data-act="delzone">Supprimer la zone</button>':''}</div>
      <div class="grid3"><label class="field span3"><span class="lbl">Culture</span><select id="z-crop"><option value="">Choisir…</option>${opts}</select></label>
      <label class="field"><span class="lbl">Longueur (cm)</span><input id="z-len" type="number" min="20" step="10" value="${Math.round(z.len)}"></label>
      <label class="field span2"><span class="lbl">Date de semis</span><input id="z-date" type="date" value="${z.date||iso(TODAY)}"></label></div>
      ${p&&!inSeason(p,parse(z.date||iso(TODAY)))&&!serreOf(o)?`<div class="alert amber"><span>Hors saison : ${p.n.toLowerCase()} se ${p.sg&&p.sg.length?'plante':'sème'} en place en ${seasonTxt(p)}${p.sg&&p.sg.length?` (godets : ${p.sg.map(x=>MABR[x-1]).join(', ')})`:''}. Vérifie la date de semis.</span></div>`:''}
      ${zr?`<div class="alert amber"><span>Rotation : ${P[zr.crop].n.toLowerCase()} en ${zr.y}, même famille (${P[z.crop].f.toLowerCase()}).</span></div>`:''}
      ${(()=>{const sc=sunCheck(o,bed.zi,z.crop,z.date);if(!sc)return serreOf(o)&&z.crop?'<p class="note">Sous serre : ensoleillement non calculé.</p>':'';
        const txt=`<b>${num(sc.h)} h</b> de soleil direct sur cette zone vers le ${fdate(dateOfDoy(sc.doy))}. ${P[z.crop].n} : ${sunLabel(sc.need)}, ${sc.need} h ou plus.`;
        return sc.lvl==='ok'?`<div class="alert okay"><span>☀ ${txt}</span></div>`:`<div class="alert amber"><span>☀ ${txt} ${sc.lvl==='insuffisant'?'Pas assez de soleil ici : préfère une culture qui supporte la mi-ombre, ou une autre planche.':'Un peu juste : la récolte sera plus tardive ou plus faible.'}</span></div>`})()}
      ${p?`<p class="note">Rang ${p.rang} cm · plants ${p.pl} cm · récolte ≈ ${p.j} j après semis/plantation.${FROST_SENSITIVE.has(p.id)?' Sensible au gel.':''}</p>`:''}
      ${grid}${cellInfo}
      ${!z.crop?`<div><span class="lbl">Que planter ici ?</span><div style="margin-top:8px">${suggestHTML(o,bed.zi,iso(TODAY),'setcrop')}</div></div>`:''}
      ${g?`<div class="row"><button class="btn small" data-act="fillzone">Planter toute la zone</button><button class="btn small" data-act="clearzone">Vider la zone</button></div>`:''}</div>
    <div class="panel" id="tpanel"><h3>Planning de l'année ${YEAR}</h3>${timelineHTML(o)}</div>
    <div class="panel" id="vpanel"><h3>Voisinage</h3>
      ${others.length?`<div class="stack"><div><span class="lbl">Autour de cette zone</span><div class="chips" style="margin-top:6px">${others.map(c=>chip(c)).join('')}</div></div>
      ${(()=>{const gs=adv.good.filter(c=>inSeason(P[c])),go=adv.good.filter(c=>!inSeason(P[c]));return`${gs.length?`<div><span class="lbl">Bons voisins à planter maintenant</span><div class="chips" style="margin-top:6px">${gs.map(c=>chip(c,'good',true)).join('')}</div></div>`:'<p class="note">Aucun bon voisin de saison à planter maintenant.</p>'}${go.length?`<p class="note">Bons voisins hors saison : ${go.map(c=>P[c].n.toLowerCase()).join(', ')}.</p>`:''}`})()}
      ${adv.bad.length?`<div><span class="lbl">À éviter ici</span><div class="chips" style="margin-top:6px">${adv.bad.map(c=>chip(c,'bad')).join('')}</div></div>`:''}</div>
      <p class="note">Voisins pris en compte : les autres zones de la planche et les planches à moins de 80 cm.</p>`:`<p class="note">Aucune culture autour. Les conseils apparaîtront dès qu'une zone ou une planche voisine sera plantée.</p>`}</div>
    <div class="panel" id="rpanel"><h3>Rotation des cultures</h3>
      <p class="note">Règle appliquée : pas deux fois la même famille sur ${ROT_YEARS+1} ans. Chaque culture choisie s'ajoute à l'historique automatiquement.</p>
      <div class="stack">${hist}</div>
      <div class="grid3"><label class="field"><span class="lbl">Année</span><select id="h-y">${[1,2,3,4,5].map(i=>`<option>${YEAR-i}</option>`).join('')}</select></label>
      <label class="field span2"><span class="lbl">Culture</span><select id="h-c">${PLANTS.map(q=>`<option value="${q.id}">${q.n}</option>`).join('')}</select></label></div>
      <button class="btn small" data-act="grow">Ajouter à l'historique</button></div>
    <div class="panel" id="jpanel"><h3>Journal</h3>${jform}${jlist}</div>
  </div>`;
  if(bed.prefill&&bed.jk==='traitement'){const f=bed.prefill;bed.prefill=null;if($('#j-qty')&&f.qty)$('#j-qty').value=f.qty;if($('#j-dar')&&f.dar!=='')$('#j-dar').value=f.dar;if(f.t)$('#j-text').value=f.t}
}
const bedEl=$('#bedView');
bedEl.addEventListener('click',async e=>{if(!bed)return;const jp=e.target.closest('[data-jump]');if(jp){const el=document.getElementById(jp.dataset.jump);if(el)el.scrollIntoView({block:'start',behavior:'smooth'});return}const o=obj(bed.id);if(!o)return;const z=o.zones[bed.zi];
  const zn=e.target.closest('[data-zone]');if(zn){bed.zi=+zn.dataset.zone;bed.cell=null;return renderBed()}
  const ce=e.target.closest('[data-cell]');if(ce){bed.cell=bed.cell===ce.dataset.cell?null:ce.dataset.cell;return renderBed()}
  const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,L=Math.max(o.w,o.h);
  if(a==='back'){closeBed();refresh();return}
  if(a==='setcrop'){if(b.dataset.date&&parse(b.dataset.date)>TODAY)z.date=b.dataset.date;return setCrop(o,z,b.dataset.crop)}
  if(a==='planfor'){const i=+b.dataset.zi;bed.plan=bed.plan===i?null:i;renderBed();const t=$('#tpanel');if(t)t.scrollIntoView({block:'start'});return}
  if(a==='plannext'){const zz=o.zones[bed.plan];zz.next=zz.next||[];zz.next.push({id:uid(),crop:b.dataset.crop,date:b.dataset.date});bed.plan=null;save();renderBed();$('#tpanel').scrollIntoView({block:'start'});return toast(P[b.dataset.crop].n+' prévue',true)}
  if(a==='delnext'){const zz=o.zones[+b.dataset.zi],n=(zz.next||[]).find(q=>q.id===b.dataset.id);zz.next=(zz.next||[]).filter(q=>q!==n);save();renderBed();return toast((n?P[n.crop].n:'Culture')+' retirée du planning',true)}
  if(a==='endcrop'){const zz=o.zones[+b.dataset.zi],c=zz.crop;zz.crop=null;zz.cells={};bed.cell=null;save();renderBed();return toast(P[c].n+' : zone libérée',true)}
  if(a==='startnext'){const zz=o.zones[+b.dataset.zi],n=(zz.next||[]).find(q=>q.id===b.dataset.id);if(!n)return;zz.next=zz.next.filter(q=>q!==n);zz.crop=n.crop;zz.cells={};zz.date=iso(TODAY);recordGrown(o,n.crop,YEAR);bed.zi=+b.dataset.zi;save();renderBed();return toast(P[n.crop].n+' lancée sur la zone '+(bed.zi+1)+' : plante les cases',true)}
  if(a==='jk'){bed.jk=b.dataset.k;return renderBed()}
  if(a==='openinv'){openInv(bed&&bed.jk==='semis'?'graines':'produits');return}
  if(a==='d-photo-x'){const D=bed.diag;D.blob=null;D.url=null;D.ref=null;D.res=null;D.file=null;renderBed();return}
  if(a==='d-run'){runDiag(o);return}
  if(a==='d-claude'){const D=bed.diag||{},crop=D.crop&&P[D.crop]?P[D.crop].n:'inconnue',desc=(($('#d-desc')||{}).value||D.desc||'').trim();
    const prods=(S.stock||[]).filter(q=>q.cat!=='graine'&&stockOf(q)>0&&!expired(q)).map(q=>`- ${q.name}${q.cat?' ('+q.cat+')':''} : ${fq(stockOf(q),q.unit)}`).join('\n')||'- (aucun produit en stock)';
    const voisins=[...new Set(o.zones.filter(z=>z.crop).map(z=>P[z.crop].n))].join(', ')||'—';
    const txt=`Diagnostic de maladie au potager (Belgique, Hesbaye). Je t'envoie une photo dans mon prochain message : attends-la avant de répondre en détail.\n\nCulture touchée : ${crop}\nPlanche : ${fullName(o)}${serreOf(o)?' (sous serre)':' (plein air)'} · cultures présentes : ${voisins}\nDate : ${fdate(TODAY)}${desc?'\nCe que je vois : '+desc:''}\n\nMon stock de produits :\n${prods}\n\nJ'ai la phytolicence. Une fois la photo reçue : 1) la maladie ou le ravageur le plus probable (et les alternatives), 2) si un produit de mon stock convient, la dose, le volume de bouillie et le délai avant récolte, 3) sinon quoi acheter, 4) les mesures sans produit. Sois concis.`;
    window.open('https://claude.ai/new?q='+encodeURIComponent(txt),'_blank');return}
  if(a==='d-apply'){const D=bed.diag;bed.jk='traitement';bed.pid=b.dataset.id;bed.prefill={qty:b.dataset.q,dar:b.dataset.dar,t:D.res?'Contre : '+D.res.diagnostic:''};renderBed();const j=$('#jpanel');if(j)j.scrollIntoView({block:'start'});return}
  if(a==='d-buy'){const x=bed.diag.res.a_acheter[+b.dataset.i];S.stock=S.stock||[];if(!S.stock.some(q=>q.name.toLowerCase()===String(x.produit).toLowerCase())){S.stock.push({id:uid(),name:String(x.produit).slice(0,60),cat:x.type==='amendement'?'amendement':'traitement',unit:'L',min:0,dar:0,moves:[]});save();renderBed();toast('Ajouté à l\'inventaire comme « à acheter »',true)}else toast('Déjà dans l\'inventaire');return}
  if(a==='d-save'){const D=bed.diag;const en={id:uid(),k:'maladie',d:D.date||iso(TODAY),crop:D.crop||null,t:(D.desc||'').trim()};
    if(D.file){try{en.ph=await processPhoto(D.file)}catch(_){}}
    if(D.res)en.diag={diagnostic:D.res.diagnostic,confiance:D.res.confiance};
    o.journal=o.journal||[];o.journal.push(en);bed.diag={};save();renderBed();return toast('Observation enregistrée au journal',true)}
  if(a==='photo-x'){bed.photo=null;return renderBed()}
  if(a==='addzone'){const fr=L-o.zones.reduce((s,q)=>s+q.len,0);
    if(fr>=20){o.zones.push({id:uid(),crop:null,len:fr,date:iso(TODAY),cells:{}});bed.zi=o.zones.length-1}
    else{if(z.len<40)return toast('Zone trop courte pour être coupée en deux');const half=snap(z.len/2,10);z.len-=half;trimCells(o,z);o.zones.splice(bed.zi+1,0,{id:uid(),crop:null,len:half,date:iso(TODAY),cells:{}});bed.zi++;bed.cell=null;save();renderBed();return toast('Zone coupée en deux',true)}
    bed.cell=null}
  if(a==='delzone'){o.zones.splice(bed.zi,1);bed.zi=Math.max(0,bed.zi-1);bed.cell=null;save();renderBed();return toast('Zone supprimée',true)}
  if(a==='fillzone')fillZone(o,z,z.date||iso(TODAY));
  if(a==='clearzone'){z.cells={};bed.cell=null;save();renderBed();return toast('Zone vidée',true)}
  if(a==='plantcell')z.cells[bed.cell]=z.date||iso(TODAY);
  if(a==='plantrow'){const g=zoneGrid(o,z),r=bed.cell.split('-')[0];for(let c=0;c<g.cols;c++)if(!z.cells[r+'-'+c])z.cells[r+'-'+c]=z.date||iso(TODAY)}
  if(a==='unplant')delete z.cells[bed.cell];
  if(a==='grow'){recordGrown(o,$('#h-c').value,+$('#h-y').value)}
  if(a==='ungrow'){o.grown=o.grown.filter(x=>!(x.y===+b.dataset.y&&x.crop===b.dataset.crop))}
  if(a==='jdel'){o.journal=o.journal.filter(x=>x.id!==b.dataset.id);save();renderBed();return toast('Entrée supprimée',true)}
  if(a==='jadd'){const k=bed.jk,en={id:uid(),k,d:$('#j-date').value||iso(TODAY),t:$('#j-text').value.trim()};
    if(k==='recolte'){en.crop=$('#j-crop').value;en.kg=parseFloat(String($('#j-kg').value).replace(',','.'))||0;if(FLW())en.u='tiges';if(!en.kg)return toast(FLW()?'Indique le nombre de tiges coupées':'Indique le poids récolté')}
    if(isProdJ(k)){const pr=(S.stock||[]).find(q=>q.id===$('#j-pid').value);if(!pr)return toast('Choisis un produit en stock');
      const q=parseFloat(String($('#j-qty').value).replace(',','.'))||0,st=stockOf(pr);if(q<=0)return toast('Indique la quantité utilisée');
      if(q>st+1e-9)return toast(`Stock insuffisant : il reste ${fq(st,pr.unit)}`);
      Object.assign(en,{pid:pr.id,prod:pr.name+(pr.variety?' « '+pr.variety+' »':''),qty:q,unit:pr.unit});if(k==='semis'&&pr.crop)en.crop=pr.crop;if(k==='traitement')en.dar=Math.max(0,+$('#j-dar').value||0)}
    if(bed.photo)en.ph=bed.photo;bed.photo=null;
    o.journal=o.journal||[];o.journal.push(en);save();renderBed();return toast(JT[k]+' ajouté'+(k==='recolte'||k==='note'?'e':'')+' au journal'+(en.pid?` · reste ${fq(stockOf(S.stock.find(q=>q.id===en.pid)),en.unit)}`:''),true)}
  save();renderBed();
});
function setCrop(o,z,c){const n=Object.keys(z.cells).length;if(c&&c!==z.crop&&(!z.date||parse(z.date)<TODAY))z.date=iso(TODAY);z.crop=c||null;z.cells={};bed.cell=null;if(c)recordGrown(o,c,yearOf(z));save();renderBed();if(n)toast(`${n} case${n>1?'s':''} effacée${n>1?'s':''}`,true)}
bedEl.addEventListener('change',async e=>{if(!bed)return;const o=obj(bed.id),z=o.zones[bed.zi],t=e.target;
  if(t.id==='z-crop')return setCrop(o,z,t.value);
  if(t.id==='j-pid'){bed.pid=t.value;const note=$('#j-text').value,dt=$('#j-date').value;renderBed();$('#j-text').value=note;$('#j-date').value=dt;return}
  if(t.id==='d-photo'){const f=t.files[0];if(!f)return;const D=bed.diag||(bed.diag={});try{D.blob=await photoBlob(f);D.url=URL.createObjectURL(D.blob);D.file=f;D.res=null;D.err=null;renderBed()}catch(_){toast("La photo n'a pas pu être lue")}return}
  if(t.id==='d-crop'){bed.diag.crop=t.value;return}
  if(t.id==='d-desc'){bed.diag.desc=t.value;const r=document.querySelector('[data-act="d-run"]');if(r&&!bed.diag.loading)r.disabled=!bed.diag.blob&&!t.value.trim();return}
  if(t.id==='j-date'&&bed.jk==='maladie'){bed.diag.date=t.value;return}
  if(t.id==='j-photo'){const f=t.files[0];if(!f)return;try{bed.photo=await processPhoto(f);renderBed()}catch(_){toast("La photo n'a pas pu être lue")}return}
  if(['h-y','h-c','j-date','j-kg','j-crop','j-dar','j-qty','j-text'].includes(t.id))return;
  if(t.id==='z-len'){const L=Math.max(o.w,o.h),oth=o.zones.reduce((s,q)=>s+(q===z?0:q.len),0);z.len=clamp(snap(+t.value||20,5),20,L-oth);trimCells(o,z)}
  if(t.id==='z-date'&&t.value){z.date=t.value;if(z.crop)recordGrown(o,z.crop,yearOf(z))}
  if(t.id==='c-date'&&t.value&&bed.cell)z.cells[bed.cell]=t.value;
  save();renderBed();
});
