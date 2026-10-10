/* ================= Maladie : diagnostic par photo ================= */
let SAMPLE=null,SAMPLE_IMG=false;
function diagHTML(o){const D=bed.diag||(bed.diag={});const zc=[...new Set(o.zones.filter(z=>z.crop).map(z=>z.crop))];if(!D.crop)D.crop=zc[0]||'';
  let h=`<div class="grid2"><label class="field"><span class="lbl">Date</span><input id="j-date" type="date" value="${D.date||iso(TODAY)}"></label>
  <label class="field"><span class="lbl">Culture touchée</span><select id="d-crop">${(zc.length?zc:PLANTS.map(q=>q.id)).map(c=>`<option value="${c}" ${c===D.crop?'selected':''}>${P[c].n}</option>`).join('')}<option value="" ${!D.crop?'selected':''}>Autre / inconnue</option></select></label>
  <label class="field span2"><span class="lbl">Ce que tu vois (facultatif)</span><textarea id="d-desc" placeholder="ex. taches brunes sur les feuilles du bas, duvet blanc dessous">${esc(D.desc||'')}</textarea></label></div>
  <div class="photoprev">${D.url?`<img src="${D.url}" alt="Photo des symptômes"><button class="btn small" data-act="d-photo-x">Changer la photo</button>`:`<label class="btn small" for="d-photo">Photo des symptômes</label>`}<input id="d-photo" type="file" accept="image/jpeg,image/png,image/webp" hidden></div>`;
  if(!SAMPLE||!SAMPLE_IMG)h+=`<button class="btn primary" data-act="d-claude">Diagnostiquer dans Claude</button><p class="note">Ouvre une conversation Claude (incluse dans ton abonnement) avec la culture, ce que tu as décrit et ton stock de produits. Ajoute-y ta photo, Claude te dit la maladie, ce que tu as pour traiter et la dose, ou quoi acheter. Note ensuite le résultat ici.</p>`;
  else h+=`<button class="btn primary" data-act="d-run" ${(!D.blob&&!(D.desc||'').trim())||D.loading?'disabled':''}>${D.loading?'<span class="spin"></span> Analyse en cours…':D.res?'Relancer l\'analyse':'Analyser la photo'}</button>`;
  if(D.err)h+=`<div class="alert"><span>${esc(D.err)}</span></div>`;
  if(D.res){const r=D.res,st=(r.en_stock||[]).map(x=>({...x,p:(S.stock||[]).find(q=>q.id===x.id)})).filter(x=>x.p);
    h+=`<div class="diag"><div class="row between" style="align-items:flex-start"><div style="min-width:0"><span class="lbl">Diagnostic probable</span><h4>${esc(r.diagnostic||'Indéterminé')}</h4></div><span class="conf ${esc(r.confiance)}">confiance ${esc(r.confiance||'?')}</span></div>
    ${r.signes?`<p class="note" style="color:var(--ink)">${esc(r.signes)}</p>`:''}
    ${(r.autres_causes||[]).length?`<div><span class="lbl">Autres possibilités</span><ul>${r.autres_causes.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}
    ${r.urgence?`<div class="kv"><span class="k">Urgence</span><b>${esc(r.urgence)}</b></div>`:''}
    ${(r.gestes||[]).length?`<div><span class="lbl">À faire tout de suite</span><ul>${r.gestes.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}
    <div><span class="lbl">Dans ton stock</span>${st.length?st.map(x=>`<div class="opt" style="margin-top:6px"><div class="row between"><b>${esc(x.p.name)}</b><span class="mono note">reste ${fq(stockOf(x.p),x.p.unit)}</span></div><span>${esc(x.dose||'')}</span>${x.pourquoi?`<span class="note">${esc(x.pourquoi)}</span>`:''}<span class="note">≈ ${num(+x.quantite||0,2)} ${x.p.unit} pour cette planche${x.dar_jours!=null?` · DAR ${x.dar_jours} j`:''}</span><button class="btn small primary" data-act="d-apply" data-id="${x.p.id}" data-q="${+x.quantite||''}" data-dar="${x.dar_jours??''}" style="justify-self:start">Noter ce traitement</button></div>`).join(''):`<p class="note">Rien d'adapté dans ton stock.</p>`}</div>
    ${(r.a_acheter||[]).length?`<div><span class="lbl">À acheter</span>${r.a_acheter.map((x,i)=>`<div class="opt" style="margin-top:6px"><b>${esc(x.produit)}</b>${x.pourquoi?`<span class="note">${esc(x.pourquoi)}</span>`:''}<button class="btn small" data-act="d-buy" data-i="${i}" style="justify-self:start">Ajouter à la liste d'achat</button></div>`).join('')}</div>`:''}
    ${r.attention?`<div class="alert amber"><span>${esc(r.attention)}</span></div>`:''}
    <p class="note">Diagnostic indicatif fait par Claude à partir d'une photo. Vérifie toujours la dose et l'usage autorisé sur l'étiquette du produit (phytoweb.be).</p></div>`}
  h+=`<button class="btn ${D.res?'primary':''}" data-act="d-save" ${!D.blob&&!(D.desc||'').trim()?'disabled':''}>Enregistrer au journal</button>`;
  return h}
async function photoBlob(file,max=1024){const url=URL.createObjectURL(file);const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url});
  const k=Math.min(1,max/Math.max(img.width,img.height)),cv=document.createElement('canvas');cv.width=Math.round(img.width*k);cv.height=Math.round(img.height*k);cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);URL.revokeObjectURL(url);
  return new Promise(r=>cv.toBlob(r,'image/jpeg',.85))}
async function runDiag(o){const D=bed.diag;if(!SAMPLE)return;D.loading=true;D.err=null;renderBed();
  const z=o.zones.find(q=>q.crop===D.crop),area=z?zoneArea(o,z):o.zones.reduce((s,q)=>s+zoneArea(o,q),0);
  const stock=(S.stock||[]).map(p=>({id:p.id,nom:p.name,type:p.cat,unite:p.unit,stock:+stockOf(p).toFixed(2),dar_par_defaut:p.dar??null}));
  const prompt=`Tu conseilles un jardinier amateur pour un potager familial en Belgique (Hesbaye, Wallonie), le ${fdate(parse(D.date||iso(TODAY)))}.
La photo jointe montre des symptômes sur : ${D.crop?P[D.crop].n:'une plante non précisée'}${serreOf(o)?', cultivée sous serre non chauffée':', cultivée en plein air'}.
Surface concernée : environ ${num(area,1)} m².
Description du jardinier : "${(D.desc||'').trim()||'aucune'}".
Produits disponibles dans son stock (n'utilise QUE ces identifiants dans en_stock) :
${JSON.stringify(stock)}

Réponds UNIQUEMENT avec un objet JSON de cette forme :
{"diagnostic":"nom de la maladie, du ravageur ou du trouble le plus probable","confiance":"faible|moyenne|élevée","signes":"ce qui sur la photo appuie ce diagnostic, une ou deux phrases","autres_causes":["autres explications possibles"],"urgence":"faible|moyenne|forte","gestes":["mesures culturales immédiates"],"en_stock":[{"id":"identifiant du stock","dose":"dose et mode d'application, en une phrase","quantite":0,"dar_jours":0,"pourquoi":"pourquoi ce produit convient"}],"a_acheter":[{"produit":"type de produit ou substance, sans marque","type":"traitement|amendement","pourquoi":"pourquoi"}],"attention":"précaution importante ou vide"}

Règles :
- Si la photo ne permet pas de conclure, dis-le avec une confiance "faible" et liste les causes possibles (maladie, ravageur, carence, stress hydrique, brûlure...).
- en_stock : uniquement les produits du stock réellement adaptés à ce problème ET à cette culture. Ne propose jamais un produit inadapté parce qu'il est disponible. "quantite" = quantité de produit (dans son unité) à prélever du stock pour traiter la surface indiquée. "dar_jours" = délai avant récolte habituel pour ce produit sur cette culture.
- a_acheter : seulement si rien d'adapté n'est en stock ou si un complément est utile ; privilégie les solutions autorisées en agriculture biologique pour les particuliers en Belgique.
- Les doses doivent être prudentes et cohérentes avec un usage amateur ; rappelle dans "attention" de vérifier l'étiquette si un produit phytosanitaire est concerné.
- Tout le texte en français.`;
  try{const r=await SAMPLE.json(prompt,{images:[D.blob].filter(Boolean)});if(!r||typeof r!=='object')throw{code:'invalid_json'};D.res=r}
  catch(e){const c=e&&e.code;D.err={not_granted:"Analyse refusée : autorise l'accès à Claude pour cette page puis réessaie.",rate_limited:'Trop de demandes pour le moment, réessaie dans quelques minutes.',image_rejected:'Cette photo n\'a pas été acceptée. Essaie une photo JPEG ou PNG.',images_unavailable:"L'envoi de photos n'est pas disponible dans cette vue.",refused:"Claude n'a pas pu analyser cette photo.",invalid_json:"La réponse n'a pas pu être lue. Relance l'analyse."}[c]||"L'analyse n'a pas abouti. Relance-la dans un instant."}
  D.loading=false;if(bed&&bed.diag===D)renderBed()}
async function processPhoto(file){
  const url=URL.createObjectURL(file);const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url});
  const max=ASSETS?1200:320,k=Math.min(1,max/Math.max(img.width,img.height)),cv=document.createElement('canvas');cv.width=Math.round(img.width*k);cv.height=Math.round(img.height*k);
  cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);URL.revokeObjectURL(url);
  if(ASSETS){const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',.8));try{const r=await ASSETS.upload(blob);return{a:r.id}}catch(_){}}
  return{u:cv.toDataURL('image/jpeg',.6)};
}

