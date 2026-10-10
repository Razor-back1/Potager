/* ================= Bouton « + Noter » ================= */
let q=null;
function updateNoteBtn(){const b=$('#noteBtn');if(b)b.hidden=tab==='plan'||!!bed||!!inv||!!q||!!auto||!!cs}
function openQ(step='menu'){q={step,photo:null};$('#qback').hidden=false;$('#qsheet').hidden=false;renderQ();updateNoteBtn()}
function closeQ(){q=null;$('#qback').hidden=true;$('#qsheet').hidden=true;$('#qsheet').innerHTML='';updateNoteBtn()}
const qPlanches=()=>plantables().filter(o=>o.zones.some(z=>z.crop));
function renderQ(){if(!q)return;const el=$('#qsheet');let h='<div class="grab"></div>';
  const head=t=>`<div class="row between"><h3>${t}</h3><button class="btn small" data-q="${q.step==='menu'?'close':'menu'}">${q.step==='menu'?'Fermer':'Retour'}</button></div>`;
  const ico=d=>`<svg viewBox="0 0 24 24">${d}</svg>`;
  if(q.step==='menu'){const th=plantables().filter(o=>thirsty(o)).length,rd=plantings().filter(x=>x.left<=0&&!x.bu).length;
    h+=`<div class="stack">${head('Noter')}<div class="qgrid">
    <button class="qbtn" data-q="water">${ico('<path d="M4 14h10l3-4h3M7 14v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4"/><path d="M19 13v.01M20 16v.01M18 18v.01"/>')}Arrosage<span>${th?th+' planche'+(th>1?'s':'')+' à arroser':'Planches arrosées'}</span></button>
    <button class="qbtn" data-q="harvest">${ico('<path d="M4 9h16l-2 11H6z"/><path d="M8 9a4 4 0 0 1 8 0"/>')}${FLW()?'Coupe':'Récolte'}<span>${FLW()?'Compter les tiges coupées':rd?rd+' prête'+(rd>1?'s':''):'Peser une récolte'}</span></button>
    <button class="qbtn" data-q="rain">${ico('<path d="M7 15a4 4 0 0 1 .6-8A5 5 0 0 1 17 8a3.5 3.5 0 0 1 0 7z"/><path d="M9 18l-1 2M13 18l-1 2M17 18l-1 2"/>')}Pluie<span>Si la station n'est pas reliée</span></button>
    <button class="qbtn" data-q="semis">${ico('<path d="M6 20h12l-1.5-7h-9z"/><path d="M12 13V8"/><path d="M12 9c0-3 2-5 5-5 0 3-2 5-5 5z"/>')}Semis en godets<span>Dans l'abri</span></button>
    <button class="qbtn wide" data-q="note">${ico('<path d="M4 7h3l2-3h6l2 3h3v13H4z"/><circle cx="12" cy="13" r="4"/>')}Note ou photo<span>Observation sur une planche</span></button></div></div>`}
  else if(q.step==='water'){const L=plantables().filter(o=>o.zones.some(z=>z.crop&&Object.keys(z.cells).length));
    h+=`<div class="stack">${head('Arrosage du jour')}<div class="qlist">${L.map(o=>`<label><input type="checkbox" value="${o.id}" ${thirsty(o)?'checked':''}><span><b>${esc(fullName(o))}</b><span class="note" style="display:block">${waterText(lastWater(o))}</span></span></label>`).join('')||'<p class="note">Aucune planche plantée.</p>'}</div>
    <div class="row"><button class="btn small" data-q="allwater">Tout cocher</button><button class="btn primary" data-q="dowater">Noter l'arrosage</button></div></div>`}
  else if(q.step==='rain'){h+=`<div class="stack">${head('Pluie')}<div class="grid2"><label class="field"><span class="lbl">Date</span><input id="q-d" type="date" value="${iso(TODAY)}"></label><label class="field"><span class="lbl">Quantité (mm)</span><input id="q-mm" type="number" min="0" step="0.5" placeholder="facultatif"></label></div><button class="btn primary" data-q="dorain">Noter la pluie</button></div>`}
  else if(q.step==='harvest'){const L=qPlanches(),rdIds=new Set(plantings().filter(x=>x.left<=0&&!x.bu).map(x=>x.o.id));L.sort((a,b)=>(rdIds.has(b.id)-rdIds.has(a.id))||(!!blockUntil(a)-!!blockUntil(b)));
    const o=obj(q.o)||L[0];if(o)q.o=o.id;const crops=o?[...new Set(o.zones.filter(z=>z.crop).map(z=>z.crop))]:[];const bu=o&&blockUntil(o);
    h+=`<div class="stack">${head(FLW()?'Coupe':'Récolte')}<div class="grid2"><label class="field span2"><span class="lbl">${FLW()?'Massif':'Planche'}</span><select id="q-o">${L.map(x=>`<option value="${x.id}" ${o&&x.id===o.id?'selected':''}>${esc(fullName(x))}${rdIds.has(x.id)?' · prête':''}</option>`).join('')}</select></label>
    <label class="field"><span class="lbl">Culture</span><select id="q-c">${crops.map(c=>`<option value="${c}">${P[c].n}</option>`).join('')}</select></label><label class="field"><span class="lbl">${FLW()?'Nombre de tiges':'Poids (kg)'}</span><input id="q-kg" type="number" min="0" step="${FLW()?1:0.1}" inputmode="decimal"></label></div>
    ${bu?`<div class="alert"><span>Récolte impossible avant le <b>${fdate(bu)}</b> : délai après traitement.</span></div>`:''}<button class="btn primary" data-q="doharvest" ${bu?'disabled':''}>${FLW()?'Noter la coupe':'Noter la récolte'}</button></div>`}
  else if(q.step==='note'){const L=plantables();h+=`<div class="stack">${head('Note ou photo')}<label class="field"><span class="lbl">Planche</span><select id="q-o">${L.map(x=>`<option value="${x.id}">${esc(fullName(x))}</option>`).join('')}</select></label>
    <label class="field"><span class="lbl">Note</span><textarea id="q-t" placeholder="Ce que tu observes"></textarea></label>
    <div class="photoprev">${q.photo?`<img src="${photoSrc(q.photo)}" alt="Photo jointe"><button class="btn small" data-q="nophoto">Retirer</button>`:'<label class="btn small" for="q-ph">Ajouter une photo</label>'}<input id="q-ph" type="file" accept="image/*" hidden></div>
    <button class="btn primary" data-q="donote">Enregistrer</button></div>`}
  el.innerHTML=h}
$('#noteBtn').onclick=()=>openQ();
$('#gPill').onclick=()=>$('#menuBtn').click();
$('#qback').onclick=closeQ;
$('#qsheet').addEventListener('click',e=>{const b=e.target.closest('[data-q]');if(!b)return;const a=b.dataset.q;
  if(a==='close')return closeQ();
  if(['menu','water','rain','harvest','note'].includes(a)){q.step=a;return renderQ()}
  if(a==='semis'){closeQ();openInv('semis');inv.add=true;renderInv();return}
  if(a==='allwater'){$('#qsheet').querySelectorAll('.qlist input').forEach(i=>i.checked=true);return}
  if(a==='dowater'){const ids=[...$('#qsheet').querySelectorAll('.qlist input:checked')].map(i=>i.value);if(!ids.length)return toast('Coche au moins une planche');
    ids.forEach(id=>{const o=obj(id);o.journal=o.journal||[];o.journal.push({id:uid(),k:'arrosage',d:iso(TODAY),t:''})});save();closeQ();refresh();return toast(`Arrosage noté sur ${ids.length} planche${ids.length>1?'s':''}`,true)}
  if(a==='dorain'){const v=parseFloat(String($('#q-mm').value).replace(',','.'));addRain(isNaN(v)?null:v,$('#q-d').value||iso(TODAY));save();closeQ();refresh();return toast('Pluie notée',true)}
  if(a==='doharvest'){const o=obj($('#q-o').value),kg=parseFloat(String($('#q-kg').value).replace(',','.'))||0;if(!o)return;if(!kg)return toast(FLW()?'Indique le nombre de tiges':'Indique le poids récolté');
    const cr=$('#q-c').value,fu=FLW();o.journal=o.journal||[];o.journal.push({id:uid(),k:'recolte',d:iso(TODAY),crop:cr,kg,...(fu?{u:'tiges'}:{})});save();closeQ();refresh();return toast(`${P[cr]?P[cr].n:'Récolte'} : ${num(kg)} ${fu?'tiges notées':'kg notés'}`,true)}
  if(a==='nophoto'){q.photo=null;return renderQ()}
  if(a==='donote'){const o=obj($('#q-o').value),t=$('#q-t').value.trim();if(!t&&!q.photo)return toast('Écris une note ou ajoute une photo');
    o.journal=o.journal||[];const en={id:uid(),k:'note',d:iso(TODAY),t};if(q.photo)en.ph=q.photo;o.journal.push(en);save();closeQ();refresh();return toast('Note enregistrée : '+o.name,true)}});
$('#qsheet').addEventListener('change',async e=>{const t=e.target;if(!q)return;
  if(t.id==='q-o'&&q.step==='harvest'){q.o=t.value;renderQ()}
  if(t.id==='q-ph'){const f=t.files[0];if(!f)return;const txt=($('#q-t')||{}).value||'',sel=($('#q-o')||{}).value;try{q.photo=await processPhoto(f)}catch(_){return toast("La photo n'a pas pu être lue")}renderQ();if($('#q-t'))$('#q-t').value=txt;if(sel&&$('#q-o'))$('#q-o').value=sel}});

