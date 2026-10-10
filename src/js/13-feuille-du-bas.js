/* ================= Feuille du bas ================= */
const sheet=$('#sheet');
const ICON={planche:'<rect x="4" y="10" width="38" height="10" rx="2" fill="#8b6a48"/><circle cx="10" cy="15" r="2" fill="#78c258"/><circle cx="17" cy="15" r="2" fill="#78c258"/><circle cx="24" cy="15" r="2" fill="#78c258"/><circle cx="31" cy="15" r="2" fill="#78c258"/><circle cx="38" cy="15" r="2" fill="#78c258"/>',
 bac:'<rect x="10" y="5" width="26" height="20" fill="#8b6a48" stroke="#a3713f" stroke-width="3"/>',serre:'<rect x="6" y="5" width="34" height="20" rx="4" fill="#3a82b5" fill-opacity=".15" stroke="#3a82b5" stroke-dasharray="3 2"/>',
 allee:'<rect x="2" y="11" width="42" height="8" fill="#cdc6b5"/>',alleeo:'<ellipse cx="23" cy="15" rx="18" ry="11" fill="none" stroke="#cdc6b5" stroke-width="5"/>',cuve:'<circle cx="23" cy="15" r="11" fill="#3a82b5"/>',eau:'<circle cx="23" cy="15" r="9" fill="#3a82b5" fill-opacity=".3" stroke="#3a82b5"/><circle cx="23" cy="15" r="3.5" fill="#3a82b5"/>',
 arbre:'<circle cx="23" cy="15" r="12" fill="#5c9a45" fill-opacity=".4" stroke="#2f5d2b" stroke-dasharray="3 2"/><circle cx="23" cy="15" r="2.5" fill="#a3713f"/>',haie:'<rect x="2" y="10" width="42" height="10" rx="5" fill="#2f5d2b"/>',
 cloture:'<rect x="2" y="14" width="42" height="2.5" fill="#a3713f"/><rect x="5" y="11" width="3" height="9" fill="#a3713f"/><rect x="21.5" y="11" width="3" height="9" fill="#a3713f"/><rect x="38" y="11" width="3" height="9" fill="#a3713f"/>',
 prise:'<rect x="15" y="7" width="16" height="16" rx="3" fill="#d9951c"/><circle cx="20" cy="15" r="1.8"/><circle cx="26" cy="15" r="1.8"/>',compost:'<rect x="12" y="4" width="22" height="22" fill="#a3713f"/><path d="M12 11h22M12 18h22" stroke="#5e4529"/>',
 abri:'<rect x="8" y="4" width="30" height="22" fill="#a3713f"/><path d="M8 4l30 22M38 4L8 26" stroke="#5e4529"/>',
 citerne:'<circle cx="23" cy="15" r="11" fill="#3a82b5" fill-opacity=".25" stroke="#3a82b5" stroke-dasharray="3 2"/><path d="M17 15h12M23 9v12" stroke="#3a82b5"/>',
 ruisseau:'<path d="M3 20c8 0 9-10 18-10s10 10 22 8" fill="none" stroke="#3a82b5" stroke-width="5" stroke-linecap="round"/>',
 etang:'<path d="M6 18c0-7 10-12 20-12s16 4 14 10-9 9-19 9S6 24 6 18z" fill="#3a82b5" fill-opacity=".55" stroke="#3a82b5"/>'};
const alertsHTML=o=>{const cf=conflicts(o),ri=rotIssues(o);let h='';
  if(cf.length)h+=`<div class="alert">${cf.map(c=>`<span><b>${P[c.a].n}</b> et <b>${P[c.b].n}</b> se gênent ${esc(c.where)}.</span>`).join('')}</div>`;
  if(ri.length)h+=`<div class="alert amber">${ri.map(r=>`<span>Rotation : <b>${P[r.crop].n}</b> revient sur des ${P[r.crop].f.toLowerCase()} (${P[r.prev.crop].n.toLowerCase()} en ${r.prev.y}). Attends ${ROT_YEARS+1} ans entre deux cultures de la même famille.</span>`).join('')}</div>`;
  const si=sunIssues(o);if(si.length)h+=`<div class="alert amber">${si.map(x=>`<span>${x.lvl==='insuffisant'?'Pas assez de soleil':'Soleil un peu juste'} pour <b>${P[x.crop].n.toLowerCase()}</b> : ${num(x.h)} h vers le ${fdate(dateOfDoy(x.doy))}, il lui en faut ${x.need} ou plus.</span>`).join('')}</div>`;
  const bu=blockUntil(o);if(bu)h+=`<div class="alert"><span>Récolte bloquée jusqu'au <b>${fdate(bu)}</b> (délai après traitement).</span></div>`;
  return h};
function sunLine(o){if(serreOf(o))return`<p class="note">Sous serre : ensoleillement non calculé.</p>`;const a=sunHours(o,172),b=sunHours(o,80);return`<div class="sunline"><span>21 juin <b>${num(a)} h</b>/${num(sunMax(172))}</span><span>21 mars <b>${num(b)} h</b>/${num(sunMax(80))}</span></div>`}
/* ---- eau reçue : arrosage noté ou pluie (sauf sous serre) ---- */
const RAIN_MIN=5; /* mm : en dessous, la pluie ne compte pas comme un arrosage */
function lastWater(o){
  const m=(o.journal||[]).filter(x=>x.k==='arrosage').sort((a,b)=>b.d.localeCompare(a.d))[0];
  const r=serreOf(o)?null:(S.rain||[]).filter(x=>x.mm==null||x.mm>=RAIN_MIN).sort((a,b)=>b.d.localeCompare(a.d))[0];
  let best=null;if(m)best={d:m.d,src:m.src==='gardena'?'gardena':'main',t:m.t};if(r&&(!best||r.d>best.d))best={d:r.d,src:'pluie',mm:r.mm};
  if(best)best.ago=days(parse(best.d),TODAY);return best}
function waterText(w){if(!w)return'Aucune eau notée';const when=w.ago===0?"aujourd'hui":w.ago===1?'hier':'il y a '+w.ago+' jours';
  return w.src==='pluie'?`Pluie${w.mm!=null?' ('+num(w.mm)+' mm)':''} ${when}`:w.src==='gardena'?`Arrosé par GARDENA ${when}`:`Arrosé à la main ${when}`}
function thirstLimit(){const m=TODAY.getMonth()+1;return m>=5&&m<=9?4:(m===4||m===10)?7:null}
function isPlanted(o){return o.zones.some(z=>z.crop&&Object.keys(z.cells).length)}
function thirsty(o){const lim=thirstLimit();if(!lim||!isPlanted(o))return false;if(o.type==='fruitier'&&o.zones[0].cells['0-0']&&fruitAge(o.zones[0].cells['0-0'])>=2)return false;const w=lastWater(o);return!w||w.ago>=lim}
function planStatus(o){/* un seul indicateur par planche, le plus utile d'abord */
  if(o.type==='abri'){const n=(S.stock||[]).filter(isLow).length;return n?{c:'amber',t:'!',l:n+' produit'+(n>1?'s':'')+' en stock bas'}:null}
  if(!TYPES[o.type].plant)return null;
  const pl=plantings().filter(x=>x.o===o);
  if(pl.some(x=>x.left<=0&&!x.bu))return{c:'green',t:'✓',l:'Prêt à récolter'};
  if(thirsty(o))return{c:'blue',t:'💧',l:'À arroser'};
  if(conflicts(o).length)return{c:'red',t:'!',l:'Mauvais voisinage'};
  if(sunIssues(o).some(x=>x.lvl==='insuffisant'))return{c:'shade',t:'☀',l:'Pas assez de soleil'};
  if(rotIssues(o).length)return{c:'amber',t:'↻',l:'Rotation à revoir'};
  return null}
function cultureSheet(o){if(o.type==='fruitier')return fruitSheet(o);const t=TYPES[o.type],inS=!!serreOf(o);
  let h=`<div class="stack"><div class="cs-head"><div style="min-width:0"><span class="lbl">${FLW()&&o.type==='planche'?'Massif':t.l}${inS?' · sous serre':''}</span><div class="nm">${esc(o.name)}</div></div><button class="iconbtn" data-act="close" aria-label="Fermer"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>`;
  if(t.plant){
    const pl=plantings().filter(x=>x.o===o);
    h+=`<div class="info"><span class="lbl">Ce qu'il y a dedans</span>`;
    if(pl.length)h+=`<div class="ilist">${pl.map(x=>{const bs=bloomState(x);if(bs)return`<div class="irow">${ring(x.prog,x.p.id,bs.k==='bloom')}<div style="min-width:0"><b>${x.p.n}</b><span class="note">≈ ${x.n} pied${x.n>1?'s':''} · planté le ${fdate(parse(x.d))} · ${bs.long}</span></div><span class="st ${bs.k==='bloom'?'ready':''}">${bs.short}</span></div>`;
      const st=x.bu&&x.left<=0?`<span class="st blocked">Attendre le ${fdate(x.bu)}</span>`:x.left<=0?`<span class="st ready">Prêt</span>`:`<span class="st">dans ${x.left} j</span>`;
      return`<div class="irow">${ring(x.prog,x.p.id,x.left<=0&&!x.bu)}<div style="min-width:0"><b>${x.p.n}</b><span class="note">≈ ${x.n} plant${x.n>1?'s':''} · semé le ${fdate(parse(x.d))} · récolte ${fdate(x.hv)}</span></div>${st}</div>`}).join('')}</div>`;
    else h+=`${emptyHTML('sprout','Vide pour l\'instant. Ouvre la planche pour choisir quoi planter.')}`;
    h+=`</div>`;
    const w=lastWater(o),th=thirsty(o);
    h+=`<div class="info"><span class="lbl">Eau</span><div class="irow"><i class="drop"></i><div><b>${waterText(w)}</b>${th?`<span class="note" style="color:var(--water)">Pense à arroser : rien depuis ${w?w.ago:'longtemps'}${w?' jours':''}.</span>`:inS?`<span class="note">Sous serre, seule l'eau que tu apportes compte.</span>`:''}</div></div>
      <div class="row"><button class="btn small" data-act="water">J'ai arrosé</button>${inS?'':'<button class="btn small" data-act="rain">Il a plu</button>'}${(()=>{const zv=gLinked()&&zoneOfObj(o.id);if(!zv)return'';const vv=gdst&&gdst.state&&gdst.state.valves.find(x=>x.id===zv);return`<button class="btn small primary" data-act="autowater" data-v="${zv}">${vv&&isRun(vv)?'En cours · ':''}${esc(valveName(zv))}</button>`})()}</div></div>`;
    const al=alertsHTML(o);if(al)h+=`<div class="info"><span class="lbl">À savoir</span>${al}</div>`;
    h+=`<button class="btn primary" data-act="openbed">Plantation, voisins et journal</button>`;
  }else{
    if(o.type==='citerne')h+=`<div class="kv"><span class="k">Volume</span><b class="mono">${num(+o.vol||0,0)} L</b></div><div class="kv"><span class="k">Eau en réserve (toutes cuves)</span><span class="mono">${num(S.water.level,0)} L</span></div><button class="btn" data-act="gowater">Voir le bilan d'eau</button>`;
    else if(o.type==='ruisseau')h+=`<div class="kv"><span class="k">Longueur</span><span class="mono">${m2(o.w)} m</span></div>`;
    else if(o.type==='cuve')h+=`<div class="kv"><span class="k">Contenance</span><b class="mono">${num(cuveL(o),0)} L</b></div><div class="kv"><span class="k">Eau en réserve (toutes cuves)</span><span class="mono">${num(S.water.level,0)} L</span></div><button class="btn" data-act="gowater">Voir le bilan d'eau</button>`;
    else if(+o.height>0)h+=`<div class="kv"><span class="k">Hauteur</span><span class="mono">${m2(o.height)} m</span></div>`;
    if(o.type==='serre')h+=`<button class="btn primary" data-act="enterserre">Ouvrir la serre</button>`;
  }
  h+=`<button class="linkbtn" data-act="toedit">Modifier la taille ou la position</button></div>`;
  return h}
/* ---- inventaire : stock = entrées (achats, corrections) − utilisations notées au journal ---- */
const CAT={graine:'Graines',amendement:'Amendements',traitement:'Traitements'};
const JCAT=k=>k==='semis'?'graine':k;
const isProdJ=k=>k==='traitement'||k==='amendement'||k==='semis';
const prodUses=p=>{const out=[];plantables().forEach(o=>(o.journal||[]).forEach(e=>{if(e.pid===p.id&&+e.qty>0)out.push({o,e})}));(S.nursery||[]).forEach(n=>{if(n.pid===p.id&&+n.qty>0)out.push({o:null,e:{d:n.d,qty:n.qty},lab:'Semis en godets · '+(P[n.crop]?P[n.crop].n:'')})});return out};
const seedLabel=p=>`${esc(p.name)}${p.variety?' « '+esc(p.variety)+' »':''}`;
const expired=p=>p.cat==='graine'&&p.exp&&+p.exp<YEAR;
const stockOf=p=>(p.moves||[]).reduce((s,m)=>s+(+m.q||0),0)-prodUses(p).reduce((s,u)=>s+(+u.e.qty||0),0);
const isLow=p=>{const q=stockOf(p);return q<=0?'out':(p.min!=null&&q<=+p.min)?'low':null};
const fq=(q,u)=>`${num(Math.max(0,q),2)} ${u}`;
function addRain(mm,d){S.rain=S.rain||[];S.rain.push({id:uid(),d:d||iso(TODAY),mm:mm==null||isNaN(mm)?null:mm});S.rain.sort((a,b)=>b.d.localeCompare(a.d));if(S.rain.length>200)S.rain.length=200}
/* sur téléphone, remonte la vue pour que l'objet touché reste visible au-dessus du menu */
function keepAboveSheet(o){if(innerWidth>=760)return;const r=svg.getBoundingClientRect(),top=r.height-sheet.offsetHeight,sy=(o.y+o.h/2-view.cy)*view.z+r.height/2;
  if(sy>top-40||sy<60){view.cy=o.y+o.h/2-(Math.max(80,top*.5)-r.height/2)/view.z;renderPlan()}}
function setEdit(on){editMode=on;if(!on){lifted=null}updateModeUI();renderPlan()}
function updateModeUI(){renderWxLayer();const busy=!!sheetMode||!!shapeEdit;$('#fab').hidden=busy;$('#map').classList.toggle('editing',editMode&&!shapeEdit);
  $('#modetag').hidden=!editMode||busy||tab!=='plan';$('#editBtn').hidden=editMode;if($('#noteBtnPlan'))$('#noteBtnPlan').hidden=editMode;$('#addBtn').hidden=!editMode;$('#doneBtn').hidden=!editMode;$('#sunBtn').hidden=editMode||!!ctx}
function renderSheet(){
  updateModeUI();sheet.hidden=!sheetMode;if(!sheetMode)return;
  let h='<div class="grab"></div>';
  if(sheetMode==='add'){
    h+=`<div class="stack"><div class="row between"><h3>Ajouter au potager</h3><button class="btn small" data-act="close">Fermer</button></div>
    <button class="btn primary" data-act="series">Série de planches avec allées</button>
    <div class="typegrid">${Object.entries(TYPES).filter(([k])=>!(ctx&&(k==='serre'||k==='arbre'||k==='haie'||k==='etang'||k==='fruitier'))&&(k!=='fruitier'||VRG())).map(([k,t])=>`<button class="typebtn" data-act="add" data-type="${k}"><svg viewBox="0 0 46 30">${ICON[k]}</svg>${FLW()&&k==='planche'?'Massif ou planche':t.l}</button>`).join('')}</div>
    <p class="note">L'objet apparaît au centre de l'écran. Maintiens le doigt dessus pour le soulever et le déplacer. Tire la poignée jaune pour le redimensionner.</p></div>`;
  }else if(sheetMode==='series'){
    h+=`<div class="stack"><div class="row between"><h3>Série de planches</h3><button class="btn small" data-act="add-back">Retour</button></div>
    <div class="grid2"><label class="field"><span class="lbl">Nombre</span><input id="sr-n" type="number" min="1" max="40" value="4"></label>
    <label class="field"><span class="lbl">Orientation</span><select id="sr-o"><option value="v">Planches verticales</option><option value="h">Planches horizontales</option></select></label>
    <label class="field"><span class="lbl">Longueur (cm)</span><input id="sr-l" type="number" min="50" step="10" value="500"></label>
    <label class="field"><span class="lbl">Largeur (cm)</span><input id="sr-w" type="number" min="30" step="5" value="90"></label>
    <label class="field"><span class="lbl">Allée entre (cm)</span><input id="sr-g" type="number" min="0" step="5" value="70"></label>
    <label class="field"><span class="lbl">Inclinaison (°)</span><input id="sr-a" type="number" min="-180" max="180" step="5" value="0"></label></div>
    <label class="row" style="gap:8px"><input type="checkbox" id="sr-al" checked> Dessiner les allées entre les planches</label>
    <p class="note">La série forme un bloc : il se déplace et tourne d'un seul tenant. Chaque planche garde son propre menu, avec un bouton pour la détacher du bloc.</p>
    ${G().shape?'<button class="btn small" data-act="series-align" style="justify-self:start">Aligner sur le plus long côté du terrain</button>':''}
    <p class="note">Par défaut : planche de 90 cm (on atteint le milieu sans marcher dessus) et allée de 70 cm (passage de brouette).</p>
    <button class="btn primary" data-act="series-go">Placer la série</button></div>`;
  }else if(sheetMode==='help'){
    const ic=p=>`<span class="ic"><svg viewBox="0 0 24 24">${p}</svg></span>`;
    h+=`<div class="stack"><div class="row between"><h3>Comment ça marche</h3><button class="btn small primary" data-act="close">Compris</button></div>
    <div class="helpgrid">
      <div class="hrow">${ic('<path d="M9 11V5a2 2 0 0 1 4 0v6M13 9a2 2 0 0 1 4 0v4a6 6 0 0 1-6 6h-1a5 5 0 0 1-4-2l-3-4 1.5-1.5L9 14"/>')}<div><b>Touche une planche</b><br><span class="note">Tu vois ce qu'elle contient, quand c'est prêt et quand elle a reçu de l'eau.</span></div></div>
      <div class="hrow">${ic('<path d="M4 20h4L19 9l-4-4L4 16z"/>')}<div><b>Crayon en bas à droite</b><br><span class="note">Mode édition pour ajouter, déplacer (appui long) ou redimensionner. « Terminer » pour revenir.</span></div></div>
      <div class="hrow">${ic('<path d="M7 7l10 10M7 17L17 7"/><circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/>')}<div><b>Deux doigts</b><br><span class="note">Pour zoomer. Un doigt pour faire glisser la vue.</span></div></div>
      <div class="hrow">${ic('<path d="M9 7L4 12l5 5"/><path d="M4 12h11a5 5 0 0 1 0 10h-3"/>')}<div><b>Flèche en haut</b><br><span class="note">Annule la dernière action, quelle qu'elle soit.</span></div></div>
    </div>
    <span class="lbl">Pastilles sur les planches</span>
    <div class="helpgrid">
      <div class="hrow"><span class="dot-b" style="background:var(--ok)">✓</span><span>Quelque chose est prêt à récolter</span></div>
      <div class="hrow"><span class="dot-b" style="background:var(--water)">💧</span><span>À arroser : ni pluie ni arrosage depuis plusieurs jours</span></div>
      <div class="hrow"><span class="dot-b" style="background:var(--danger)">!</span><span>Deux cultures voisines se gênent</span></div>
      <div class="hrow"><span class="dot-b" style="background:var(--muted)">☀</span><span>Une culture manque de soleil à cet endroit</span></div>
      <div class="hrow"><span class="dot-b" style="background:var(--sun);color:#1d1404">↻</span><span>Même famille qu'une saison récente : rotation à revoir</span></div>
    </div>
    <p class="note">Aujourd'hui : tout ce qui demande une action. Récoltes : ce qui est prêt et ce qui arrive. Eau & météo : prévisions, pluie, cuve, risque de gel. Cultures : fiches et calendrier de semis.</p></div>`;
  }else if(sheetMode==='wu'){const c=WU.get();
    h+=`<div class="stack"><div class="row between"><h3>Station météo</h3><button class="btn small" data-act="close">Fermer</button></div>
    <p class="note" style="color:var(--ink)">Relie ta station Weather Underground : la pluie se note toute seule et l'alerte gel utilise la prévision de la nuit.</p>
    <label class="field"><span class="lbl">Identifiant de la station</span><input id="wu-id" value="${esc(c.id||'')}" placeholder="ex. ILEUZE12" autocapitalize="characters" autocomplete="off" spellcheck="false"></label>
    <label class="field"><span class="lbl">Clé API</span><input id="wu-key" value="${esc(c.key||'')}" placeholder="32 caractères" autocomplete="off" spellcheck="false"></label>
    <p class="alert" id="wu-err" hidden></p>
    <div class="row"><button class="btn primary" data-act="wu-save">Relier et tester</button>${c.key?'<button class="btn danger" data-act="wu-del">Délier</button>':''}</div>
    <div class="note"><b>Où les trouver</b> : connecte-toi sur wunderground.com, ouvre le menu de ton profil, puis <b>My Devices</b> pour l'identifiant de la station (il commence par I) et <b>API Keys</b> pour la clé (bouton « Generate » si tu n'en as pas encore). La clé est gratuite pour les stations qui envoient leurs données.</div>
    <p class="note">La clé reste sur cet appareil : elle n'est jamais envoyée ailleurs que chez Weather Underground, ni enregistrée dans le plan.</p></div>`;
  }else if(sheetMode==='relay'){const c=GDN.get(),tok=c.token||(window._rtok||(window._rtok=newToken()));
    h+=`<div class="stack"><div class="row between"><h3>Synchronisation</h3><button class="btn small" data-act="relay-back">Retour</button></div>
    ${relayOn()&&c.role==='user'?`<div class="alert okay"><span>${esc(syncText())}</span></div><p class="note" style="color:var(--ink)">Tu utilises l'app sur invitation : tes potagers sont enregistrés en ligne, à toi seul, et se synchronisent entre tes appareils.</p>
      <div class="row"><button class="btn small primary" data-act="relay-sync">Synchroniser maintenant</button><button class="btn small" data-act="inv-mine">Copier l'invitation pour mon autre appareil</button></div>
      <button class="btn small danger" data-act="relay-unlink" style="justify-self:start">Délier cet appareil</button>`:
    relayOn()?`<div class="alert okay"><span>${esc(syncText())}</span></div><div class="row"><button class="btn small primary" data-act="relay-sync">Synchroniser maintenant</button><button class="btn small danger" data-act="relay-unlink">Délier cet appareil</button></div>
      <p class="note"><b>Sur ton autre appareil</b> : Menu → Synchronisation → « J'ai déjà un relais », puis la même adresse et le même code d'accès :</p><div class="row"><code class="autok">${esc(c.url)}</code></div><div class="row"><code class="autok">${esc(c.token)}</code><button class="btn small" data-act="relay-copytok">Copier le code</button></div>`:
    `<p class="note" style="color:var(--ink)">Ton potager est enregistré sur cet appareil uniquement. Un petit relais gratuit chez Cloudflare le garde en ligne : chaque modification part tout de suite, et ton iPhone et ton iPad se mettent à jour à l'ouverture. Le même relais sert ensuite à l'arrosage GARDENA. Compte 10 minutes, plus simple sur un ordinateur.</p>
    <div class="seg"><button data-act="relay-mode" data-m="inv" aria-pressed="${window._rhave==='inv'}">J'ai une invitation</button><button data-act="relay-mode" data-m="new" aria-pressed="${!window._rhave}">Créer mon relais</button><button data-act="relay-mode" data-m="have" aria-pressed="${window._rhave===true}">J'ai déjà un relais</button></div>
    ${window._rhave==='inv'?`<label class="field"><span class="lbl">Invitation reçue</span><textarea id="inv-code" placeholder="colle ici le lien ou le code reçu"></textarea></label><div class="row"><button class="btn small" data-act="inv-paste">Coller</button><button class="btn primary" data-act="inv-use">Utiliser l'invitation</button></div>`:window._rhave?'':`<ol class="austeps">
     <li><b>Compte.</b> Crée un compte gratuit sur <a href="https://dash.cloudflare.com" target="_blank" rel="noopener">dash.cloudflare.com</a>.</li>
     <li><b>Relais.</b> Workers &amp; Pages → Create → Worker → Deploy. Puis <b>Edit code</b>, remplace tout par le code du relais et Deploy.<div class="row" style="margin-top:6px"><button class="btn small" data-act="relay-copycode">Copier le code du relais</button><a class="btn small" href="${WORKER_URL}" target="_blank" rel="noopener">Ouvrir le code</a></div></li>
     <li><b>Base de données.</b> Storage &amp; Databases → D1 → Create, nomme-la « potager ». Dans ton Worker : Bindings → Add binding → D1 database, nom de variable <code>DB</code>, choisis « potager ».</li>
     <li><b>Code d'accès.</b> Worker → Settings → Variables and Secrets → Add, type <b>Secret</b>, nom <code>APP_TOKEN</code>, valeur :<div class="row" style="margin-top:6px"><code class="autok">${esc(tok)}</code><button class="btn small" data-act="relay-copytok">Copier</button></div></li>
     <li><b>Ici.</b> Copie l'adresse du Worker (elle finit par <code>workers.dev</code>) et colle-la ci-dessous.</li></ol>
     <p class="note">Les intitulés de Cloudflare peuvent varier un peu. Personne ne peut lire ni modifier ton potager sans ce code d'accès.</p>`}
    ${window._rhave==='inv'?'':`<label class="field"><span class="lbl">Adresse du relais</span><input id="rl-url" value="${esc(c.url||'')}" placeholder="https://potager.xxx.workers.dev" autocomplete="off" spellcheck="false" inputmode="url"></label>
    <label class="field"><span class="lbl">Code d'accès (APP_TOKEN)</span><input id="rl-tok" value="${esc(window._rhave&&!c.token?'':tok)}" placeholder="le code du relais" autocomplete="off" spellcheck="false"></label>
    <p class="alert" id="rl-err" hidden></p>
    <button class="btn primary" data-act="relay-link">Relier et synchroniser</button>`}`}</div>`;
  }else if(sheetMode==='friends'){const F=window._friends;
    h+=`<div class="stack"><div class="row between"><h3>Amis</h3><button class="btn small" data-act="relay-back">Retour</button></div>
    <p class="note" style="color:var(--ink)">Chaque ami reçoit un lien. Il l'ouvre sur son téléphone, ajoute l'app à l'écran d'accueil, et tout est relié : ses potagers, sa synchro et ses notifications, séparés des tiens. Il n'a aucun code à gérer.</p>
    <input id="fr-name" placeholder="Prénom de l'ami" autocomplete="off" value="${esc(window._frName||'')}">
    <div><span class="lbl">Son app démarre avec</span><div class="seg" style="margin-top:6px"><button data-act="fr-kind" data-k="potager" aria-pressed="${window._invKind!=='fleurs'&&window._invKind!=='verger'}">L'exemple potager</button><button data-act="fr-kind" data-k="fleurs" aria-pressed="${window._invKind==='fleurs'}">L'exemple fleurs</button><button data-act="fr-kind" data-k="verger" aria-pressed="${window._invKind==='verger'}">L'exemple verger</button></div></div>
    <button class="btn primary" data-act="fr-invite" style="justify-self:start">Créer l'invitation</button>
    ${window._newInv?`<div class="alert okay" style="display:grid;gap:8px"><span><b>Invitation pour ${esc(window._newInv.name)}</b>${window._newInv.k==='fleurs'?' (jardin de fleurs)':window._newInv.k==='verger'?' (verger)':' (potager)'} : envoie-lui ce lien (il ne sert qu'à lui).</span><code class="autok">${esc(window._newInv.link)}</code><div class="row"><button class="btn small primary" data-act="fr-share">Envoyer</button><button class="btn small" data-act="fr-copy">Copier le lien</button></div></div>`:''}
    <span class="lbl">Amis sur ton relais</span>
    ${!F?'<p class="note">Chargement…</p>':F.err?`<p class="note" style="color:var(--danger)">${esc(F.err)}</p>`:F.list.length?`<div class="glist">${F.list.map(u=>`<div class="grow"><span><b>${esc(u.name)}</b><span class="note" style="display:block">${u.last?'vu '+whenTxt(u.last):'pas encore connecté'} · ${u.n} potager${u.n>1?'s':''}</span></span><button class="btn small danger" data-act="fr-rm" data-id="${u.id}" data-n="${esc(u.name)}">Retirer</button></div>`).join('')}</div>`:'<p class="note">Personne pour l\'instant.</p>'}
    <p class="note">Retirer un ami efface ses potagers, ses photos et ses notifications de ton relais. Son lien ne marchera plus.</p></div>`;
  }else if(sheetMode==='geo'){const G0=GEO(),R=window._geoRes;
    h+=`<div class="stack"><div class="row between"><h3>Lieu du potager</h3><button class="btn small" data-act="relay-back">Retour</button></div>
    <p class="note" style="color:var(--ink)">Sert à la météo, aux prévisions de gel et de pluie, et aux notifications.${G0?' Actuellement : <b>'+esc(G0.name||'position enregistrée')+'</b>.':''}</p>
    <button class="btn" data-act="geo-here">Utiliser ma position actuelle</button>
    <div class="row" style="flex-wrap:nowrap"><input id="geo-q" placeholder="Commune (ex. Éghezée)" style="flex:1;min-width:0" autocomplete="off"><button class="btn primary" data-act="geo-find">Chercher</button></div>
    ${R?R.length?`<div class="glist">${R.map((g,i)=>`<div class="grow"><span><b>${esc(g.name)}</b><span class="note" style="display:block">${esc([g.admin1,g.country].filter(Boolean).join(', '))}</span></span><button class="btn small" data-act="geo-pick" data-i="${i}">Choisir</button></div>`).join('')}</div>`:'<p class="note">Aucune commune trouvée.</p>':''}</div>`;
  }else if(sheetMode==='cal'){let nEv=0;try{nEv=notifPlan().ev.filter(e=>e.d>=iso(addD(iso(TODAY),-30))).length}catch(e){}
    h+=`<div class="stack"><div class="row between"><h3>Calendrier</h3><button class="btn small" data-act="relay-back">Retour</button></div>
    <p class="note" style="color:var(--ink)">Récoltes prévues, semis à repiquer, semis échelonnés, plantations prévues et fins de délai après traitement, en événements « journée entière » dans le Calendrier.</p>
    ${relayOn()?`<div class="panel"><b>S'abonner (recommandé)</b><span class="note">Le calendrier « Potager » se met à jour tout seul quand tes potagers changent (iPhone, iPad, Mac). Lien privé : ne le partage pas.</span>
      <div class="row"><button class="btn primary" data-act="cal-sub">S'abonner dans Calendrier</button><button class="btn small" data-act="cal-copy">Copier le lien</button></div>
      ${calErr?`<div class="alert"><span>${esc(calErr)}</span></div>`:''}
      <span class="note">Si rien ne s'ouvre : Réglages › Apps › Calendrier › Comptes › Ajouter un compte › Autre › Ajouter un calendrier avec abonnement, puis colle le lien.</span>
      <button class="btn small danger" data-act="cal-new">Changer le lien (l'ancien cesse de marcher)</button></div>`:`<p class="note">Relie un relais (Synchronisation) pour un calendrier qui se met à jour tout seul.</p>`}
    <div class="panel"><b>Télécharger une fois</b><span class="note">Ajoute les ${nEv} dates connues aujourd'hui pour « ${esc(S.name)} ». Elles ne suivront pas les changements.</span><button class="btn" data-act="cal-dl">Télécharger (.ics)</button></div></div>`;
  }else if(sheetMode==='notif'){const ps=pushState(),pr=pushPrefs();
    const tg=(k,l,d)=>`<label class="row between nrow"><span><b>${l}</b><span class="note" style="display:block">${d}</span></span><input type="checkbox" data-np="${k}" ${pr[k]!==false?'checked':''}></label>`;
    h+=`<div class="stack"><div class="row between"><h3>Notifications</h3><button class="btn small" data-act="relay-back">Retour</button></div>
    ${ps.why?`<div class="alert"><span>${ps.why}</span></div>`:''}
    ${ps.on?`<div class="alert okay"><span>Activées sur cet appareil.</span></div>`:ps.can?`<p class="note" style="color:var(--ink)">Ton relais t'envoie un résumé le matin et une alerte gel le soir, même app fermée. Chaque appareil s'active séparément (iPhone, iPad).</p><button class="btn primary" data-act="np-on">Activer sur cet appareil</button>`:''}
    <div class="nlist">${tg('water','Arrosage','planches sans eau depuis plusieurs jours (pluie comprise)')}${tg('harvest',FLW()?'Floraisons':'Récoltes',FLW()?'quand une fleur commence à fleurir':'quand une culture arrive à maturité')}${tg('care','Entretien des fleurs','tailler, pincer, arracher : les gestes du mois (jardins de fleurs)')}${tg('nursery','Semis','quand des semis sont prêts à repiquer')}${tg('resow','Semis échelonnés','quand il est temps de ressemer pour récolter en continu')}${tg('plan','Plantations prévues','le jour prévu dans le planning des planches')}${tg('dar','Traitements','fin du délai avant récolte')}${tg('frost','Gel','alerte vers 18 h si la nuit descend sous 2 °C (−2 °C sous serre)')}${tg('gardena','GARDENA','arrosage automatique lancé ou sauté')}</div>
    <label class="field" style="max-width:220px"><span class="lbl">Résumé du matin à</span><select data-np="hour">${[6,7,8,9,10,12,18].map(x=>`<option value="${x}" ${+(pr.hour||8)===x?'selected':''}>${x} h</option>`).join('')}</select></label>
    ${ps.on?`<div class="row"><button class="btn small" data-act="np-test">Envoyer un test</button><button class="btn small" data-act="np-now">Résumé maintenant</button><button class="btn small danger" data-act="np-off">Désactiver ici</button></div>`:''}
    <p class="note">Le relais vérifie toutes les 30 minutes : il faut le déclencheur Cron <code>*/30 * * * *</code> dans ton Worker (Settings → Trigger events). Les notifications portent sur tes potagers synchronisés, pas sur l'exemple.</p></div>`;
  }else if(sheetMode==='menu'){
    const GLs=GL.get().list;
    h+=`<div class="stack"><div class="row between"><h3>Potager</h3><button class="btn small" data-act="close">Fermer</button></div>
    <div><span class="lbl">Mes potagers</span><div class="glist">${GLs.map(g=>`<div class="grow${g.id===GID?' cur':''}"><span><b>${esc(g.id===GID?S.name:(g.name||'Potager'))}</b>${(g.id===GID?S.example:g.ex)?' <span class="note">· exemple</span>':''}</span>${g.id===GID?'<span class="note">ouvert</span>':`<button class="btn small" data-act="gopen" data-g="${g.id}">Ouvrir</button>`}</div>`).join('')}</div>
    <div class="row" style="margin-top:8px"><button class="btn small" data-act="gnew">+ Potager</button><button class="btn small" data-act="gnewfl">+ Jardin de fleurs</button><button class="btn small" data-act="gnewvg">+ Verger</button><button class="btn small" data-act="gnewex">+ Exemple potager</button><button class="btn small" data-act="gnewexfl">+ Exemple fleurs</button><button class="btn small" data-act="gnewexvg">+ Exemple verger</button>${GLs.length>1?'<button class="btn small danger" data-act="gdel">Supprimer celui-ci</button>':''}</div></div>
    <label class="field"><span class="lbl">Nom</span><input id="g-name" value="${esc(S.name)}"></label>
    ${S.shape?`<div class="row between"><span><span class="lbl">Terrain</span><br><span class="mono">${num(Math.abs(polyArea(S.shape))/1e4)} m² · ${S.shape.length} côtés</span></span><span class="row"><button class="btn small" data-act="shape-rect">Revenir au rectangle</button></span></div>`:
    `<div class="grid2"><label class="field"><span class="lbl">Largeur du terrain (m)</span><input id="g-w" type="number" min="2" step="0.5" value="${S.w/100}"></label>
    <label class="field"><span class="lbl">Longueur du terrain (m)</span><input id="g-h" type="number" min="2" step="0.5" value="${S.h/100}"></label></div>`}
    <div class="row between"><span><span class="lbl">Station météo</span><br><span class="note">${WU.get().key?'Station '+esc(WU.get().id)+' reliée':'Pas de station reliée'}</span></span><button class="btn small" data-act="wu">${WU.get().key?'Modifier':'Relier ma station'}</button></div>
    <div><span class="lbl">Style</span><div class="seg" style="margin-top:6px">${[['classic','Classique'],['ios','iOS'],['glass','Verre sombre'],['widgets','Widgets']].map(([k,l])=>`<button data-act="ui" data-k="${k}" aria-pressed="${uiPref()===k}">${l}</button>`).join('')}</div></div>
    <div>${uiPref()!=='classic'?'':`<span class="lbl">Apparence</span><div class="seg" style="margin-top:6px">${[['auto','Automatique'],['light','Clair'],['dark','Sombre']].map(([k,l])=>`<button data-act="theme" data-k="${k}" aria-pressed="${themePref()===k}">${l}</button>`).join('')}</div>`}
    <div class="row between" style="margin-top:8px"><span class="note" style="color:var(--ink)">Météo vivante sur le plan<br><span class="note">pluie, givre, nuit et ombres à l'heure réelle, coupée en mode édition</span></span><button class="btn small ${wxPlanOn()?'on':''}" data-act="wxplan">${wxPlanOn()?'Activée':'Désactivée'}</button></div></div>
    <div class="row between"><span><span class="lbl">Synchronisation</span><br><span class="note">${relayOn()?'Relais relié : iPhone, iPad… à jour':'Ce potager reste sur cet appareil'}</span></span><button class="btn small" data-act="relay">${relayOn()?'Gérer':'Relier'}</button></div>
    ${relayOn()?`<div class="row between"><span><span class="lbl">Notifications</span><br><span class="note">${pushState().txt}</span></span><button class="btn small" data-act="notif">${pushState().on?'Régler':'Activer'}</button></div>`:''}
    <div class="row between"><span><span class="lbl">Calendrier</span><br><span class="note">Récoltes, semis et repiquages dans le Calendrier de l'iPhone</span></span><button class="btn small" data-act="cal">Ajouter</button></div>
    ${GDN.get().role==='admin'?`<div class="row between"><span><span class="lbl">Amis</span><br><span class="note">Inviter des amis sur ton relais</span></span><button class="btn small" data-act="friends">Gérer</button></div>`:''}
    <div class="row between"><span><span class="lbl">Lieu du potager</span><br><span class="note">${GEO()?esc(GEO().name||'Position enregistrée'):'Pas encore indiqué (météo de Bruxelles)'}</span></span><button class="btn small" data-act="geo">${GEO()?'Changer':'Indiquer'}</button></div>
    ${GDN.get().role==='user'?'':`<div class="row between"><span><span class="lbl">Arrosage automatique</span><br><span class="note">${GDN.get().demo?'Démo':gLinked()?'GARDENA relié':'GARDENA smart system'}</span></span><button class="btn small" data-act="openauto">${gLinked()?'Ouvrir':'Relier'}</button></div>`}
    <div class="row"><button class="btn" data-act="help">Comment ça marche</button><button class="btn" data-act="openinv">Inventaire</button></div>
    ${ctx?'':`<button class="btn" data-act="shape-edit">${S.shape?'Modifier la forme du terrain':'Dessiner une forme libre'}</button>`}
    <label class="field"><span class="lbl">Direction du nord sur le plan : <span class="mono">${S.north}°</span></span><input id="g-north" type="range" min="0" max="355" step="5" value="${S.north}"></label>
    <p class="note">0° = le nord est en haut du plan. Tourne jusqu'à ce que l'aiguille rouge pointe vers le vrai nord, en t'aidant de la boussole du téléphone.</p>
    <div class="alert okay"><span id="syncLine">${syncText()}</span></div>
    <div class="row"><button class="btn small" data-act="export">Exporter une sauvegarde</button><button class="btn small" data-act="import">Importer une sauvegarde</button></div>
    ${S.example?'<div class="row"><button class="btn small" data-act="reload">Remettre l\'exemple à zéro</button></div>':''}
    <p class="note">Importer une sauvegarde l'ajoute comme nouveau potager : rien n'est écrasé.</p></div>`;
  }else if(sheetMode==='obj'&&!editMode){
    const o=obj(selId);if(!o){sheetMode=null;return renderSheet()}h+=cultureSheet(o);
  }else if(sheetMode==='obj'){
    const o=obj(selId);if(!o){sheetMode=null;return renderSheet()}const t=TYPES[o.type],L=o.locked?'disabled':'';
    h+=`<div class="stack"><div class="row between" style="flex-wrap:nowrap"><div style="min-width:0;flex:1"><span class="lbl">${FLW()&&o.type==='planche'?'Massif':VRG()&&o.type==='planche'?'Rang':t.l}${o.locked?' · verrouillé':''}</span><input class="namein" id="o-name" value="${esc(o.name)}" aria-label="Nom"></div><button class="btn small" data-act="close">OK</button></div>`;
    if(o.type==='serre'&&!ctx){const n=(o.inner&&o.inner.objs||[]).filter(q=>TYPES[q.type].plant).length;h+=`<button class="btn primary" data-act="enterserre">Ouvrir la serre</button><p class="note">${n?n+' planche'+(n>1?'s':'')+' à l\'intérieur.':'Vide pour l\'instant.'} En mode culture, un tap sur la serre l'ouvre directement.</p>`}
    if(o.type==='citerne')h+=`<label class="field" style="max-width:240px"><span class="lbl">Volume (L)</span><input id="o-vol" type="number" min="0" step="100" value="${Math.round(+o.vol||0)}" ${L}></label><p class="note">Citerne enterrée : seul son volume compte, elle s'ajoute à la réserve d'eau (Eau &amp; météo). Pas d'ombre.</p>`;
    else h+=t.round?`<div class="grid2"><label class="field"><span class="lbl">Diamètre (cm)</span><input id="o-w" type="number" min="10" step="5" value="${Math.round(o.w)}" ${L}></label>`:
      `<div class="grid2"><label class="field"><span class="lbl">Largeur (cm)</span><input id="o-w" type="number" min="10" step="5" value="${Math.round(o.w)}" ${L}></label><label class="field"><span class="lbl">Longueur (cm)</span><input id="o-h" type="number" min="10" step="5" value="${Math.round(o.h)}" ${L}></label>`;
    if(o.type!=='citerne')h+=(!['planche','allee','alleeo','eau','prise','etang','ruisseau'].includes(o.type))?`<label class="field"><span class="lbl">Hauteur (cm)</span><input id="o-ht" type="number" min="0" step="10" value="${Math.round(o.height||0)}"></label></div><p class="note">${o.type==='cuve'?`Contenance ≈ <b class="mono">${num(cuveL(o),0)} L</b>. `:''}La hauteur sert aussi à calculer l'ombre portée.</p>`:`</div>`;
    {const ms=grpMembers(o);if(ms){const np=ms.filter(q=>q.type==='planche').length,na=ms.length-np;h+=`<div class="grpinfo"><span><b>Dans un bloc</b> · ${np} planche${np>1?'s':''}${na?` et ${na} allée${na>1?'s':''}`:''}<span class="note" style="display:block">Maintenir pour déplacer tout le bloc, l'anneau le fait tourner d'un coup. La poignée ne change que cet objet.</span></span><div class="row"><button class="btn small" data-act="ungroup">Détacher du bloc</button><button class="btn small" data-act="ungroupall">Dissoudre le bloc</button></div></div>`}}
    if(o.type==='alleeo')h+=`<div class="grid2"><label class="field"><span class="lbl">Largeur de l'allée (cm)</span><input id="o-ring" type="number" min="10" step="5" value="${Math.round(+o.ring||70)}" ${L}></label><div class="field"><span class="lbl">Forme</span><button class="btn small" data-act="mkcircle" ${L}>Faire un cercle</button></div></div><p class="note">Largeur et longueur = dimensions extérieures. Si l'allée est plus large que la moitié, le rond devient plein (placette).</p>`;
    if(o.type==='ruisseau')h+=`<div class="grid2"><label class="field"><span class="lbl">Courbure (cm)</span><input id="o-bend" type="number" step="10" value="${Math.round(o.bend||0)}" ${L}></label><label class="field"><span class="lbl">Méandre (cm)</span><input id="o-wave" type="number" step="10" value="${Math.round(o.wave||0)}" ${L}></label></div><p class="note">Largeur = longueur du cours d'eau, longueur = largeur du lit. Courbure : il bombe d'un côté ; méandre : il ondule en S. L'eau s'écoule dans le sens des tirets ; « Inverser le sens » le retourne.</p><button class="btn small" data-act="flipflow" style="justify-self:start" ${L}>Inverser le sens</button>`;
    if(o.type==='haie')h+=`<label class="field" style="max-width:260px"><span class="lbl">Courbure (cm)</span><input id="o-bend" type="number" step="10" value="${Math.round(o.bend||0)}" ${L}></label><p class="note">0 = haie droite. La valeur est la flèche au milieu de la haie ; négative pour bomber de l'autre côté.</p>`;
    if(!t.round&&!o.locked)h+=`<div class="row"><span class="lbl">Orientation</span><span class="mono">${o.rot}°</span><button class="btn small" data-act="rot" data-d="90">+90°</button><button class="btn small" data-act="rot0">0°</button></div><p class="note">Fais glisser le rond jaune le long du cercle autour de l'objet pour le tourner (crans de 5°, aimanté tous les 45°).</p>`;
    h+=`<div class="row"><button class="btn small" data-act="lock">${o.locked?'Déverrouiller':'Verrouiller'}</button><button class="btn small" data-act="dup">Dupliquer</button>${o.locked?'':'<button class="btn small danger" data-act="del">Supprimer</button>'}</div>`;
    h+=o.locked?`<p class="note">Verrouillé : l'objet ne peut plus être déplacé, redimensionné ni supprimé.</p>`:`<p class="note">Maintiens le doigt sur l'objet pour le soulever, puis glisse-le.</p>`;
    h+=`</div>`;
  }
  sheet.innerHTML=h;
}
sheet.addEventListener('click',async e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,o=obj(selId);
  if(a==='close'){sheetMode=null;selId=null;renderSheet();renderPlan()}
  if(a==='add-back'){sheetMode='add';renderSheet()}
  if(a==='series'){sheetMode='series';renderSheet()}
  if(a==='series-align'){const tp=terrainPts();let best=null;tp.forEach((p,i)=>{const q=tp[(i+1)%tp.length],L=Math.hypot(q.x-p.x,q.y-p.y);if(!best||L>best.L)best={L,a:Math.atan2(q.y-p.y,q.x-p.x)*180/Math.PI}});
    const v=$('#sr-o').value==='v';let d=best.a-(v?90:0);d=((d%180)+180)%180;if(d>90)d-=180;$('#sr-a').value=Math.round(d);return}
  if(a==='add'){const t=TYPES[b.dataset.type],r=svg.getBoundingClientRect(),c=world(r.left+r.width/2,r.top+r.height*.3);
    const n={id:uid(),type:b.dataset.type,x:snap(clamp(c.x-t.w/2,0,G().w-t.w)),y:snap(clamp(c.y-t.h/2,0,G().h-t.h)),w:t.w,h:t.h,rot:0,name:b.dataset.type==='planche'&&FLW()?'Massif':b.dataset.type==='planche'&&VRG()?'Rang de petits fruits':t.l,height:t.ht||0,locked:false};
    if(t.plant){n.zones=[{id:uid(),crop:null,len:Math.max(t.w,t.h),date:iso(TODAY),cells:{}}];n.grown=[];n.journal=[]}
    if(n.type==='citerne')n.vol=5000;if(n.type==='alleeo')n.ring=70;if(n.type==='ruisseau')n.wave=100;
    G().objs.push(n);selId=n.id;sheetMode='obj';save();renderSheet();renderPlan()}
  if(a==='series-go'){const n=clamp(+$('#sr-n').value||1,1,40),L=+$('#sr-l').value||500,W=+$('#sr-w').value||90,gap=Math.max(0,+$('#sr-g').value||0),v=$('#sr-o').value==='v';
    /* la série est centrée sur le milieu de l'écran */
    const r=svg.getBoundingClientRect(),c=world(r.left+r.width/2,r.top+r.height*.4),tw=v?n*W+(n-1)*gap:L,th=v?L:n*W+(n-1)*gap;
    const grp=uid(),withA=$('#sr-al').checked&&gap>0,ka=G().objs.filter(o=>o.type==='allee').length;
    const x0=c.x-tw/2,y0=c.y-th/2,k=G().objs.filter(o=>o.type==='planche').length,ids=[],ang=((Math.round(+$('#sr-a').value||0)%360)+360)%360,ar=ang*Math.PI/180;
    for(let i=0;i<n;i++){const w=v?W:L,h=v?L:W,id=uid();ids.push(id);
      /* chaque planche tourne autour du centre de la série, pour garder les allées */
      const px=(v?x0+i*(W+gap):x0)+w/2-c.x,py=(v?y0:y0+i*(W+gap))+h/2-c.y,qx=c.x+px*Math.cos(ar)-py*Math.sin(ar),qy=c.y+px*Math.sin(ar)+py*Math.cos(ar);
      if(withA&&i<n-1){const aw=v?gap:L,ah=v?L:gap,ax=(v?x0+i*(W+gap)+W:x0)+aw/2-c.x,ay=(v?y0:y0+i*(W+gap)+W)+ah/2-c.y,bx=c.x+ax*Math.cos(ar)-ay*Math.sin(ar),by=c.y+ax*Math.sin(ar)+ay*Math.cos(ar);
        G().objs.push({id:uid(),type:'allee',x:Math.round(bx-aw/2),y:Math.round(by-ah/2),w:aw,h:ah,rot:ang,name:'Allée '+(ka+i+1),height:0,locked:false,grp})}
      G().objs.push({id,grp,type:'planche',x:Math.round(qx-w/2),y:Math.round(qy-h/2),w,h,rot:ang,name:(FLW()?'Massif ':VRG()?'Rang ':'Planche ')+(k+i+1),height:0,locked:false,grown:[],journal:[],zones:[{id:uid(),crop:null,len:L,date:iso(TODAY),cells:{}}]})}
    sheetMode=null;save();renderSheet();renderPlan();toast(`${n} planche${n>1?'s':''} placée${n>1?'s':''}, allées de ${gap} cm`,true)}
  if((a==='rot'||a==='rot0')&&o){const d=a==='rot'?+b.dataset.d:-o.rot,ms=grpMembers(o);if(ms){const f=grpFrame(ms,o.rot);rotateMembers(ms.map(q=>({o:q,x:q.x,y:q.y,rot:q.rot})),{x:f.cx,y:f.cy},d)}else o.rot=((o.rot+d)%360+360)%360;save();renderSheet();renderPlan()}
  if(a==='ungroup'&&o){delete o.grp;const rest=G().objs.filter(q=>q.grp&&!grpMembers(q));rest.forEach(q=>delete q.grp);save();renderSheet();renderPlan();return toast(o.name+' détaché du bloc',true)}
  if(a==='ungroupall'&&o){const ms=grpOf(o)||[];ms.forEach(q=>delete q.grp);save();renderSheet();renderPlan();return toast('Bloc dissous : '+ms.length+' objets indépendants',true)}
  if(a==='lock'&&o){o.locked=!o.locked;save();renderSheet();renderPlan()}
  if(a==='dup'&&o){const n=JSON.parse(JSON.stringify(o));n.id=uid();n.x+=30;n.y+=30;n.name=o.name+' (copie)';n.locked=false;delete n.grp;if(n.zones)n.zones.forEach(z=>z.id=uid());if(n.journal)n.journal=[];G().objs.push(n);selId=n.id;save();renderSheet();renderPlan()}
  if(a==='del'&&o){if(!b.classList.contains('armed')){b.classList.add('armed');b.textContent='Confirmer la suppression';return}
    {const H=homeOf(o);H.objs=H.objs.filter(x=>x!==o);if(o.id===ctx){ctx=null;renderCtxbar();fit()}};selId=null;sheetMode=null;save();renderSheet();renderPlan();toast(`« ${o.name} » supprimé`,true)}
  if(a==='openbed'&&o)openBed(o.id);
  if(a==='journal'&&o)openBed(o.id,0,'arrosage',true);
  if(a==='harvestlog'&&o)openBed(o.id,0,'recolte',true);
  if(a==='rain'){addRain(null);save();renderSheet();renderPlan();toast('Pluie notée pour aujourd\'hui',true)}
  if(a==='help'){sheetMode='help';renderSheet()}
  if(a==='water'&&o){o.journal=o.journal||[];o.journal.push({id:uid(),k:'arrosage',d:iso(TODAY),t:''});save();renderSheet();renderPlan();toast('Arrosage noté pour aujourd\'hui',true)}
  if(a==='gowater'){sheetMode=null;selId=null;setTab('weather')}
  if(a==='toedit'){setEdit(true);renderSheet()}
  if(a==='enterserre'&&o)enterSerre(o.id);
  if(a==='openinv'){sheetMode=null;renderSheet();openInv()}
  if(a==='mkcircle'&&o){const d=Math.round((o.w+o.h)/2),cx=o.x+o.w/2,cy=o.y+o.h/2;o.w=o.h=d;o.x=cx-d/2;o.y=cy-d/2;save();renderPlan();renderSheet();return toast('Allée circulaire de '+m2(d)+' m',true)}
  if(a==='flipflow'&&o){o.rot=(o.rot+180)%360;o.bend=-(+o.bend||0);o.wave=+o.wave||0;save();renderPlan();renderSheet();return toast('Sens du courant inversé',true)}
  if(a==='relay'){sheetMode='relay';renderSheet();return}
  if(a==='notif'){sheetMode='notif';renderSheet();return}
  if(a==='cal'){calErr=null;sheetMode='cal';renderSheet();return}
  if(a==='cal-sub'||a==='cal-copy'||a==='cal-new'){
    if(a==='cal-new'&&!b.classList.contains('armed')){b.classList.add('armed');b.textContent='Confirmer : nouveau lien';return}
    try{const r=await gReq('/cal'+(a==='cal-new'?'?new=1':''));if(!r||!r.url)throw new Error('Ton relais doit être mis à jour : recopie le code gardena-worker.js dans Cloudflare (Edit code → Deploy).');
      calErr=null;try{await syncPush(GID)}catch(_){}const w=r.url.replace(/^https?:/,'webcal:');
      if(a==='cal-sub'){location.href=w;return}
      try{await navigator.clipboard.writeText(w);toast(a==='cal-new'?'Nouveau lien copié':'Lien copié')}catch(_){prompt('Lien du calendrier',w)}
      if(a==='cal-new')renderSheet()}catch(x){calErr=x.message;renderSheet()}return}
  if(a==='cal-dl'){const name='potager.ics',blob=new Blob([icsOf(notifPlan().ev,S.name)],{type:'text/calendar'});
    if(DL){try{await DL.save({filename:name,data:blob})}catch(err){}return}
    try{const u=URL.createObjectURL(blob),l=document.createElement('a');l.href=u;l.download=name;document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);toast('Calendrier téléchargé : ouvre-le pour ajouter les dates')}catch(_){toast("Le téléchargement n'a pas abouti")}return}
  if(a==='np-on'){b.disabled=true;b.textContent='Activation…';try{await pushOn();toast('Notifications activées')}catch(x){toast(x.message)}renderSheet();return}
  if(a==='np-off'){try{await pushOff();toast('Notifications désactivées sur cet appareil')}catch(x){toast(x.message)}renderSheet();return}
  if(a==='np-test'){try{await gReq('/push/test','POST',{endpoint:GDN.get().pushEp});toast('Test envoyé')}catch(x){toast(x.message)}return}
  if(a==='np-now'){try{await syncPush(GID);await gReq('/push/digest?reset=1','POST',{});toast('Résumé envoyé (s\'il y a quelque chose à dire)')}catch(x){toast(x.message)}return}
  if(a==='relay-back'){sheetMode='menu';renderSheet();return}
  if(a==='relay-mode'){window._rhave=b.dataset.m==='have'?true:b.dataset.m==='inv'?'inv':false;renderSheet();return}
  if(a==='inv-paste'){try{$('#inv-code').value=await navigator.clipboard.readText()}catch(x){toast('Colle le code à la main (appui long → Coller)')}return}
  if(a==='inv-use'){const inv=readInvite($('#inv-code').value);if(!inv)return toast('Invitation illisible : colle le lien complet reçu');await applyInvite(inv);renderSheet();return}
  if(a==='inv-mine'){const c=GDN.get();try{await navigator.clipboard.writeText(APP_URL+'#join='+mkInvite(c.url,c.token,c.name||'',FLW()?'fleurs':VRG()?'verger':''));toast('Invitation copiée : ouvre-la sur ton autre appareil')}catch(x){toast('Copie impossible')}return}
  if(a==='friends'){sheetMode='friends';window._friends=null;window._newInv=null;window._frName='';renderSheet();loadFriends();return}
  if(a==='fr-kind'){window._frName=($('#fr-name').value||'');window._invKind=b.dataset.k;renderSheet();return}
  if(a==='fr-invite'){const n=($('#fr-name').value||'').trim();if(!n)return toast('Indique le prénom de ton ami');b.disabled=true;const k=['fleurs','verger'].includes(window._invKind)?window._invKind:'potager';
    try{const r=await gReq('/admin/invite','POST',{name:n});window._newInv={name:r.name,k,link:APP_URL+'#join='+mkInvite(GDN.get().url,r.token,r.name,k)};window._frName='';await loadFriends()}catch(x){toast(x.message)}renderSheet();return}
  if(a==='fr-share'){const I=window._newInv;try{if(navigator.share){await navigator.share({title:'Atelier Potager',text:`${I.name}, voici ton accès à l'app du potager. Ouvre ce lien sur ton téléphone :`,url:I.link});return}}catch(x){return}try{await navigator.clipboard.writeText(I.link);toast('Lien copié')}catch(x){}return}
  if(a==='fr-copy'){try{await navigator.clipboard.writeText(window._newInv.link);toast('Lien copié')}catch(x){toast('Copie impossible')}return}
  if(a==='fr-rm'){if(!b.classList.contains('armed')){b.classList.add('armed');b.textContent='Confirmer';return}try{await gReq('/admin/remove','POST',{id:b.dataset.id});toast(b.dataset.n+' retiré du relais')}catch(x){toast(x.message)}await loadFriends();renderSheet();return}
  if(a==='geo'){sheetMode='geo';window._geoRes=null;renderSheet();return}
  if(a==='geo-here'){if(!navigator.geolocation)return toast('Position indisponible sur cet appareil');b.disabled=true;b.textContent='Localisation…';
    navigator.geolocation.getCurrentPosition(p=>{setGeo({lat:+p.coords.latitude.toFixed(4),lon:+p.coords.longitude.toFixed(4),name:'Ma position'})},()=>{toast('Position refusée');renderSheet()},{timeout:15000});return}
  if(a==='geo-find'){const q=($('#geo-q').value||'').trim();if(!q)return;b.disabled=true;
    try{const r=await fetch('https://geocoding-api.open-meteo.com/v1/search?count=6&language=fr&name='+encodeURIComponent(q));const j=await r.json();window._geoRes=(j.results||[]).map(g=>({name:g.name,admin1:g.admin1,country:g.country,lat:g.latitude,lon:g.longitude}))}catch(x){toast('Recherche impossible (connexion ?)')}renderSheet();return}
  if(a==='geo-pick'){const g=window._geoRes[+b.dataset.i];setGeo({lat:g.lat,lon:g.lon,name:g.name});return}
  if(a==='relay-copytok'){try{await navigator.clipboard.writeText(($('#rl-tok')&&$('#rl-tok').value.trim())||GDN.get().token||'');toast('Code copié')}catch(err){toast('Copie impossible : sélectionne le code à la main')}return}
  if(a==='relay-copycode'){try{const r=await fetch('gardena-worker.js');if(!r.ok)throw 0;await navigator.clipboard.writeText(await r.text());toast('Code du relais copié')}catch(err){window.open(WORKER_URL,'_blank')}return}
  if(a==='relay-unlink'){const c=GDN.get();GDN.set({demo:c.demo});gdst=null;syncErr=null;renderSheet();return toast('Cet appareil n\'est plus synchronisé (ton potager y reste)')}
  if(a==='relay-sync'){await syncPull(true);renderSheet();return}
  if(a==='relay-link'){const url=$('#rl-url').value.trim().replace(/\/+$/,''),token=$('#rl-tok').value.trim(),err=$('#rl-err');
    if(!/^https:\/\//.test(url)){err.hidden=false;err.textContent='L\'adresse doit commencer par https://';return}
    if(!token){err.hidden=false;err.textContent='Il manque le code d\'accès.';return}
    b.disabled=true;b.textContent='Test…';
    try{const l=await gReq('/gardens','GET',null,{url,token});GDN.set({...GDN.get(),url,token,gardena:!!l.gardena});window._rtok=null;
      await syncPull(true);sheetMode='relay';renderSheet();toast(l.list.filter(x=>!x.del).length?'Relié : potagers récupérés':'Relié : ton potager est en ligne')}
    catch(x){err.hidden=false;err.textContent=x.status===401?'Code d\'accès refusé : vérifie APP_TOKEN.':x.message;b.disabled=false;b.textContent='Relier et synchroniser'}return}
  if(a==='openauto'){sheetMode=null;renderSheet();openAuto();return}
  if(a==='autowater'){openAuto(b.dataset.v);return}
  if(a==='wu'){sheetMode='wu';renderSheet();return}
  if(a==='wu-test'||a==='wu-save'){const c={id:$('#wu-id').value.trim().toUpperCase(),key:$('#wu-key').value.trim()};if(!c.id||!c.key)return toast('Indique l\'identifiant et la clé');
    b.disabled=true;b.textContent='Connexion…';try{const w=await syncStation(false,c);if(!w||!w.now)throw new Error('Aucune donnée reçue de la station.');WU.set(c);sheetMode=null;renderSheet();toast(`Station reliée : ${num(w.now.t,1)} °C, ${num(w.now.rain||0,1)} mm aujourd'hui`);syncStation(false)}catch(err){b.disabled=false;b.textContent='Relier et tester';const el=$('#wu-err');if(el){el.hidden=false;el.textContent=err.message}}return}
  if(a==='wu-del'){WU.set({off:true});wx=null;sheetMode='menu';renderSheet();return toast('Station déliée de cet appareil')}
  if(a==='theme'){setTheme(b.dataset.k);renderSheet();renderPlan()}
  if(a==='ui'){setUI(b.dataset.k);renderSheet();renderPlan()}
  if(a==='wxplan'){try{localStorage.setItem('potager-wxplan',wxPlanOn()?'off':'on')}catch(e){}renderSheet();renderPlan()}
  if(a==='shape-edit')startShapeEdit();
  if(a==='shape-rect'){S.shape=null;save();renderSheet();renderPlan();toast('Terrain redevenu rectangulaire',true)}
  if(a==='reload'){S=sample();selId=null;sheetMode=null;save();fit();renderSheet();toast('Exemple remis à zéro',true)}
  if(a==='gopen'){switchGarden(b.dataset.g);sheetMode='menu';renderSheet();return toast('Potager ouvert : '+S.name)}
  if(a==='gnew'){const n=GL.get().list.length+1;addGarden(emptyGarden('Potager '+n));sheetMode='menu';renderSheet();return toast('Nouveau potager créé')}
  if(a==='gnewfl'){const n=GL.get().list.length+1;addGarden(emptyGarden('Jardin de fleurs '+n,'fleurs'));sheetMode='menu';renderSheet();return toast('Nouveau jardin de fleurs créé')}
  if(a==='gnewvg'){const n=GL.get().list.length+1;addGarden(emptyGarden('Verger '+n,'verger'));sheetMode='menu';renderSheet();return toast('Nouveau verger créé')}
  if(a==='gnewexvg'){addGarden(sampleOrchard());sheetMode='menu';renderSheet();return toast('Exemple de verger ajouté')}
  if(a==='gnewexfl'){addGarden(sampleFlowers());sheetMode='menu';renderSheet();return toast('Exemple de jardin de fleurs ajouté')}
  if(a==='gnewex'){addGarden(sample());sheetMode='menu';renderSheet();return toast('Exemple ajouté')}
  if(a==='gdel'){if(!b.classList.contains('armed')){b.classList.add('armed');b.textContent='Confirmer : supprimer « '+S.name+' »';return}const nm=S.name;deleteGarden(GID);sheetMode='menu';renderSheet();return toast('« '+nm+' » supprimé')}
  if(a==='export'&&!DL){const name=`potager-${iso(TODAY)}.json`,blob=new Blob([lastJSON],{type:'application/json'});
    try{const f=new File([blob],name,{type:'application/json'});if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:'Sauvegarde du potager'});return toast('Sauvegarde exportée')}}catch(err){if(err&&err.name==='AbortError')return}
    try{const u=URL.createObjectURL(blob),l=document.createElement('a');l.href=u;l.download=name;document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);toast('Sauvegarde exportée')}catch(_){toast("L'export n'a pas abouti")}}
  if(a==='export'&&DL){try{const r=await DL.save({filename:`potager-${iso(TODAY)}.json`,data:new Blob([lastJSON],{type:'application/json'})});if(r)toast('Sauvegarde exportée')}catch(err){if(err&&err.code!=='declined')toast("L'export n'a pas abouti")}}
  if(a==='import')$('#importIn').click();
});
$('#importIn').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{try{const s=migrate(JSON.parse(rd.result));if(!s)throw 0;s.example=false;if(addGarden(s)){sheetMode=null;renderSheet();toast('Importé comme nouveau potager : '+s.name)}}catch(_){toast("Ce fichier n'est pas une sauvegarde du potager")}};rd.readAsText(f);e.target.value=''});
sheet.addEventListener('input',e=>{const t=e.target;
  if(t.id==='o-name'){const o=obj(selId);o.name=t.value;save(true);renderPlan()}
  if(t.id==='g-name'){S.name=t.value||'Mon potager';save(true)}
  if(t.id==='g-north'){S.north=+t.value;save(true);t.previousElementSibling.querySelector('.mono').textContent=S.north+'°';renderPlan()}});
sheet.addEventListener('change',e=>{const t=e.target,o=obj(selId),v=parseFloat(t.value);
  if(t.dataset.np){const p=pushPrefs();p[t.dataset.np]=t.dataset.np==='hour'?+t.value:t.checked;GDN.set({...GDN.get(),pushPrefs:p});if(GDN.get().pushEp)gReq('/push/prefs','POST',{endpoint:GDN.get().pushEp,prefs:p}).catch(x=>toast(x.message));return}
  if(o&&(t.id==='o-w'||t.id==='o-h')&&!isNaN(v)){const f=t.id[2],cx=o.x+o.w/2,cy=o.y+o.h/2;o[f]=Math.max(10,v);if(TYPES[o.type].round)o.w=o.h=o[f];o.x=cx-o.w/2;o.y=cy-o.h/2;fitZones(o);save();renderPlan();renderSheet()}
  if(o&&t.id==='o-ht'&&!isNaN(v)){o.height=Math.max(0,v);save();renderPlan();renderSheet()}
  if(o&&t.id==='o-bend'&&!isNaN(v)){o.bend=clamp(v,-o.w,o.w);save();renderPlan();renderSheet()}
  if(o&&t.id==='o-wave'&&!isNaN(v)){o.wave=clamp(v,-o.w,o.w);save();renderPlan();renderSheet()}
  if(o&&t.id==='o-ring'&&!isNaN(v)){o.ring=Math.max(10,Math.round(v));save();renderPlan();renderSheet()}
  if(o&&t.id==='o-vol'&&!isNaN(v)){o.vol=Math.max(0,Math.round(v));save();renderPlan();renderSheet()}
  if(t.id==='g-w'||t.id==='g-h'){S[t.id[2]]=Math.max(200,Math.round(v*100));save();renderPlan()}
  if(t.id==='g-north')renderSheet();
});
$('#editBtn').onclick=()=>{setEdit(true);sheetMode=null;renderSheet();toast('Mode édition : maintiens un objet pour le déplacer')};
$('#doneBtn').onclick=()=>{setEdit(false);sheetMode=null;selId=null;renderSheet();renderPlan()};
$('#addBtn').onclick=()=>{sheetMode='add';selId=null;renderSheet();renderPlan()};
$('#fitBtn').onclick=fit;
$('#menuBtn').onclick=()=>{setTab('plan');selId=null;sheetMode='menu';renderSheet();renderPlan()};

