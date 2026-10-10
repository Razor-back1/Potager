/* ================= Arrosage automatique (GARDENA smart system via le relais Cloudflare) ================= */
/* La même règle de décision tourne ici (pour l'affichage) et dans le relais (pour agir, app fermée). */
/*DECIDE*/
function autoDecide(z,st,now,fc){
  if(!z||!z.mode||z.mode==='off')return{go:false,off:true,why:'Automatique coupé : arrosage à la demande seulement'};
  const hours=z.hours&&z.hours.length?z.hours:[6],gap=z.gap||20,thr=z.thr||30,sinceH=st.lastRun?(now.ms-st.lastRun)/3.6e6:1e9;
  if(z.mode==='sensor'){if(!z.sensor)return{go:false,why:'Choisis une sonde dans les réglages'};if(st.soil==null)return{go:false,why:'La sonde ne donne pas de mesure'};
    if(st.soil>=thr)return{go:false,ok:true,why:'Sol à '+Math.round(st.soil)+' %, au-dessus du seuil de '+thr+' % : pas besoin'}}
  if(z.mode==='program'){const due=(z.every||2)*24-3;if(sinceH<due)return{go:false,ok:true,why:'Prochain arrosage programmé dans '+Math.max(1,Math.ceil((due-sinceH)/24))+' j'}}
  if(sinceH<gap)return{go:false,ok:true,why:'Déjà arrosé il y a '+Math.round(sinceH)+' h'};
  if(fc&&fc.rain24!=null&&z.skipRain>0&&fc.rain24>=z.skipRain)return{go:false,skip:true,why:'Sauté : '+String(Math.round(fc.rain24*10)/10).replace('.',',')+' mm de pluie prévus sur 24 h'};
  if(st.tankEst!=null&&st.tankMin!=null&&st.tankEst-(z.flow||8)*(z.min||15)<st.tankMin)return{go:false,skip:true,why:'Sauté : cuve trop basse'};
  if(st.busy)return{go:false,wait:true,why:'Attend la fin de l\'arrosage en cours'};
  if(!hours.some(h=>now.h>=h&&now.h<h+2))return{go:false,wait:true,due:true,why:'Arrosera au prochain créneau ('+hours.map(h=>h+' h').join(', ')+')'};
  return{go:true,why:z.mode==='sensor'?'Sol à '+Math.round(st.soil)+' %, sous le seuil de '+thr+' %':'Programme tous les '+(z.every||2)+' j'}}
/*/DECIDE*/
const GDN={get(){try{return JSON.parse(localStorage.getItem('potager-gardena'))||{}}catch(e){return{}}},set(v){try{localStorage.setItem('potager-gardena',JSON.stringify(v))}catch(e){}}};
const WORKER_URL='https://razor-back1.github.io/Potager/gardena-worker.js';
const ZDEF={objs:[],sensor:'',mode:'off',thr:30,min:15,hours:[6],every:2,skipRain:3,gap:20,flow:8};
let gdst=null,gdBusy=false,auto=null,cfgT=null;
const autoCfg=()=>S.auto||(S.auto={zones:{},pump:{kind:'auto',id:''},tankMin:150});
const zc=id=>({...ZDEF,...((S.auto&&S.auto.zones||{})[id]||{})});
function setZ(id,patch){const c=autoCfg();c.zones[id]={...zc(id),...patch};save(true);pushCfgSoon()}
const relayOn=()=>{const c=GDN.get();return!!(c.url&&c.token)};
const gLinked=()=>{const c=GDN.get();return!!(c.demo||c.url&&c.token&&c.gardena)};
const gDemo=()=>!!GDN.get().demo;
const gValves=()=>gdst&&gdst.state?gdst.state.valves.filter(v=>!(autoCfg().pump.kind==='valve'&&autoCfg().pump.id===v.id)):[];
const gSensors=()=>gdst&&gdst.state?gdst.state.sensors:[];
const valveName=id=>{const v=gdst&&gdst.state&&gdst.state.valves.find(x=>x.id===id);return v?v.name:'Vanne'};
const isRun=v=>v&&v.activity&&v.activity!=='CLOSED'&&v.activity!=='OFF'&&(!v.end||v.end>Date.now());
const zoneOfObj=oid=>{const z=(S.auto&&S.auto.zones)||{};return Object.keys(z).find(k=>(z[k].objs||[]).includes(oid)&&(!gdst||!gdst.state||gdst.state.valves.some(v=>v.id===k)))||null};
const fmtLeft=ms=>{const s=Math.max(0,Math.round(ms/1000)),m=Math.floor(s/60);return m>=60?Math.floor(m/60)+' h '+String(m%60).padStart(2,'0'):m+':'+String(s%60).padStart(2,'0')};
const hhmm=t=>new Date(t).toLocaleTimeString('fr-BE',{hour:'2-digit',minute:'2-digit'});
const whenTxt=t=>{const d=days(parse(iso(new Date(t))),TODAY);return(d===0?"aujourd'hui":d===1?'hier':fdate(new Date(t)))+' à '+hhmm(t)};

/* ---- démo : appareils fictifs pour essayer l'écran sans matériel ---- */
function demoInit(){const n=Date.now();return{demo:true,at:n,err:null,state:{at:n,location:'Démo',
  valves:[{id:'demo:1',name:'Vanne 1',model:'smart Irrigation Control',activity:'CLOSED',end:null},{id:'demo:2',name:'Vanne 2',model:'smart Irrigation Control',activity:'CLOSED',end:null},{id:'demo:3',name:'Vanne 3',model:'smart Irrigation Control',activity:'CLOSED',end:null}],
  sensors:[{id:'demo-s1',name:'Sonde potager',soil:27,soilT:12,air:11,light:1800,battery:80},{id:'demo-s2',name:'Sonde serre',soil:44,soilT:16,air:18,light:5200,battery:65}],
  sockets:[{id:'demo-p',name:'Prise pompe',activity:'OFF',end:null}]},
  log:[{id:'d2',at:n-20*3.6e6,type:'skip',valve:'demo:2',why:'Sauté : 4,2 mm de pluie prévus sur 24 h'},{id:'d1',at:n-26*3.6e6,type:'water',valve:'demo:1',min:15,how:'auto',why:'Sol à 24 %, sous le seuil de 30 %'}]}}
function demoSetup(){const c=autoCfg(),pl=plantables(),out=pl.filter(o=>!serreOf(o)),inn=pl.filter(o=>serreOf(o));
  if(!c.zones['demo:1'])c.zones['demo:1']={...ZDEF,objs:out.slice(0,2).map(o=>o.id),mode:'sensor',sensor:'demo-s1',thr:30,min:15,hours:[6]};
  if(!c.zones['demo:2'])c.zones['demo:2']={...ZDEF,objs:out.slice(2,4).map(o=>o.id),mode:'program',every:2,min:20,hours:[7,20]};
  if(!c.zones['demo:3'])c.zones['demo:3']={...ZDEF,objs:inn.map(o=>o.id),mode:'sensor',sensor:'demo-s2',thr:35,min:10,hours:[8],skipRain:0};
  if(!c.pump.id){c.pump={kind:'socket',id:'demo-p'}}save()}
function demoTick(){if(!gdst||!gdst.demo)return;const n=Date.now();gdst.state.valves.forEach(v=>{if(v.end&&v.end<=n){v.activity='CLOSED';v.end=null}});
  const p=gdst.state.sockets[0];if(p&&p.end&&p.end<=n){p.activity='OFF';p.end=null}}
function demoWater(id,min){const v=gdst.state.valves.find(x=>x.id===id);if(!v)return;const end=Date.now()+min*60000;v.activity='MANUAL_WATERING';v.end=end;
  const pc=autoCfg().pump;if(pc.kind==='socket'){const p=gdst.state.sockets.find(x=>x.id===pc.id);if(p){p.activity='TIME_LIMITED_ON';p.end=end+60000}}
  gdst.log.unshift({id:'d'+Date.now(),at:Date.now(),type:'water',valve:id,min,how:'manuel',why:'',end})}
function demoStop(id){const v=gdst.state.valves.find(x=>x.id===id);if(!v)return;const last=gdst.log.find(e=>e.type==='water'&&e.valve===id&&e.end>Date.now());v.activity='CLOSED';v.end=null;
  if(!gdst.state.valves.some(isRun)){const p=gdst.state.sockets[0];if(p){p.activity='OFF';p.end=null}}
  gdst.log.unshift({id:'d'+Date.now(),at:Date.now(),type:'stop',valve:id,left:last?Math.round((last.end-Date.now())/60000):0})}

/* ---- relais ---- */
async function gReq(path,method='GET',body,cfg){const c=cfg||GDN.get();if(!c.url)throw new Error('Aucun relais relié.');
  let r;try{r=await fetch(c.url.trim().replace(/\/+$/,'')+path,{method,headers:{'X-Potager-Key':c.token||'','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined})}
  catch(e){throw new Error(inClaude()?'Le relais ne se joint que depuis l\'app installée, pas dans Claude.':'Relais injoignable : vérifie l\'adresse et la connexion.')}
  const j=await r.json().catch(()=>({}));if(!r.ok){const er=new Error(j.error||('Le relais a répondu '+r.status+'.'));er.status=r.status;er.data=j;throw er}return j}
function gdSet(j){gdst={state:j.state,log:j.log||[],at:Date.now(),err:j.state&&j.state.err||null,cfgAt:j.cfgAt||null};gImport()}
async function gSync(fresh){const c=GDN.get();
  if(c.demo){if(!gdst||!gdst.demo)gdst=demoInit();demoTick();renderAutoAll();return}
  if(!gLinked()||gdBusy)return;gdBusy=true;renderAutoAll();
  try{gdSet(await gReq('/status'+(fresh?'?fresh=1':'')))}catch(e){gdst={...(gdst||{}),err:e.message,at:gdst&&gdst.at}}
  finally{gdBusy=false;renderAutoAll()}}
/* les arrosages faits par GARDENA s'inscrivent dans le journal des planches et vident la cuve */
function gImport(){if(!gdst||gdst.demo||!gdst.log)return;const seen=new Set(S.autoSeen||[]),c=autoCfg(),fromTank=c.pump.kind!=='none';let ch=false;
  gdst.log.slice().reverse().forEach(e=>{if(seen.has(e.id))return;seen.add(e.id);const z=c.zones[e.valve],flow=(z&&z.flow)||8;
    if(e.type==='water'){(z&&z.objs||[]).forEach(id=>{const o=obj(id);if(o){o.journal=o.journal||[];o.journal.push({id:uid(),k:'arrosage',d:iso(new Date(e.at)),t:`${valveName(e.valve)} · ${num(e.min,0)} min${e.how==='auto'?' (automatique)':''}`,src:'gardena'})}});
      if(fromTank&&S.water)S.water.level=Math.max(0,Math.round(S.water.level-flow*e.min));ch=true}
    if(e.type==='stop'&&e.left>0&&fromTank&&S.water){S.water.level=Math.min(S.water.cap,Math.round(S.water.level+flow*e.left));ch=true}});
  const nv=[...seen].slice(-300);if(ch||nv.length!==(S.autoSeen||[]).length){S.autoSeen=nv;save(true)}if(ch)pushCfgSoon()}
function pushCfgSoon(){clearTimeout(cfgT);cfgT=setTimeout(pushCfg,1500)}
async function pushCfg(){const c=GDN.get();if(c.demo||!gLinked())return;const a=autoCfg();
  try{await gReq('/config','PUT',{zones:a.zones,pump:a.pump,tankMin:a.tankMin,tank:a.pump.kind!=='none'&&S.water?{level:S.water.level,at:Date.now()}:null,geo:geoOr()});if(gdst)gdst.cfgAt=Date.now();renderAutoAll()}
  catch(e){toast('Réglages non envoyés au relais : '+e.message)}}
async function gWater(id,min){try{if(gDemo())demoWater(id,min);else gdSet(await gReq('/water','POST',{id,seconds:min*60}));toast(`${valveName(id)} : arrosage ${min} min lancé`)}catch(e){toast(e.message)}renderAutoAll()}
async function gStop(id){try{if(gDemo())demoStop(id);else gdSet(await gReq('/stop','POST',{id}));toast(valveName(id)+' arrêtée')}catch(e){toast(e.message)}renderAutoAll()}

/* ---- décision affichée pour chaque vanne ---- */
function rainNext24(){if(!wx||!wx.hours||!wx.hours.length)return null;return wx.hours.slice(0,24).reduce((a,h)=>a+(+h.mm||0),0)}
function decideNow(id){const z=zc(id),c=autoCfg(),log=(gdst&&gdst.log)||[],sen=z.sensor&&gSensors().find(s=>s.id===z.sensor);
  const lastRun=Math.max(0,...log.filter(e=>e.type==='water'&&e.valve===id).map(e=>e.at));
  const busy=gValves().some(v=>v.id!==id&&isRun(v));
  return autoDecide(z,{soil:sen?sen.soil:null,lastRun,busy,tankEst:c.pump.kind!=='none'&&S.water?S.water.level:null,tankMin:c.tankMin},{h:new Date().getHours(),ms:Date.now()},{rain24:rainNext24()})}

/* ---- écran ---- */
function openAuto(focus){auto={open:focus||null,dur:{},setup:!gLinked(),tok:auto&&auto.tok||null};$('#autoView').hidden=false;updateNoteBtn();renderAuto();$('#autoView').scrollTop=0;
  if(focus)setTimeout(()=>{const el=document.getElementById('az-'+focus.replace(/[^\w-]/g,'_'));if(el)el.scrollIntoView({block:'start'})},30);if(gLinked())gSync(false)}
function closeAuto(){if(!auto)return;auto=null;$('#autoView').hidden=true;if(typeof updateNoteBtn==='function')updateNoteBtn()}
function renderAutoAll(){if(auto)renderAuto();if(tab==='weather'&&!bed&&!inv)renderWeather();if(tab==='today'&&!bed&&!inv)renderToday()}
function newToken(){const a=new Uint8Array(18);crypto.getRandomValues(a);return Array.from(a,b=>'abcdefghjkmnpqrstuvwxyz23456789'[b%31]).join('')}
const AU_BACK='<button class="iconbtn" data-au="back" aria-label="Retour"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>';
function autoSetupHTML(){const c=GDN.get(),demoBtn=c.demo?'<button class="btn danger" data-au="unlink">Quitter la démo</button>':'<button class="btn" data-au="demo">Essayer en démo</button>';
  if(!relayOn())return`<div class="panel" id="au-setup"><h3>Relier ton GARDENA smart system</h3>
    <p class="note" style="color:var(--ink)">L'arrosage passe par ton relais Cloudflare, le même que pour la synchronisation entre ton iPhone et ton iPad. Crée-le d'abord (Menu → Synchronisation), puis reviens ici pour ajouter GARDENA.</p>
    <div class="row"><button class="btn primary" data-au="gorelay">Créer le relais</button>${demoBtn}</div></div>`;
  return`<div class="panel" id="au-setup"><h3>Ajouter GARDENA à ton relais</h3>
  <p class="note" style="color:var(--ink)">Ton relais est en place. Il lui manque ta clé GARDENA, qui ne quittera jamais Cloudflare.</p>
  <ol class="austeps">
   <li><b>Clé GARDENA.</b> Sur <a href="https://developer.husqvarnagroup.cloud" target="_blank" rel="noopener">developer.husqvarnagroup.cloud</a>, connecte-toi avec ton compte GARDENA, crée une application et relie-lui <b>Authentication API</b> et <b>GARDENA smart system API</b>. Garde l'<b>Application key</b> et l'<b>Application secret</b>.</li>
   <li><b>Stockage GARDENA.</b> Si ce n'est pas déjà fait : Storage &amp; Databases → KV → Create « potager », puis dans ton Worker : Bindings → Add binding → KV namespace, nom de variable <code>POTAGER</code>.</li>
   <li><b>Secrets.</b> Dans ton Worker : Settings → Variables and Secrets, deux entrées de type <b>Secret</b> : <code>GARDENA_KEY</code> (Application key) et <code>GARDENA_SECRET</code> (Application secret).</li>
   <li><b>Automatique.</b> Worker → Settings → Trigger events → Cron : <code>*/30 * * * *</code></li></ol>
  <p class="alert" id="au-err" hidden></p>
  <div class="row"><button class="btn primary" data-au="gcheck">Vérifier</button>${demoBtn}${gLinked()?'<button class="btn" data-au="setup">Fermer</button>':''}</div></div>`}
function zoneCard(v){const id=v.id,z=zc(id),key=id.replace(/[^\w-]/g,'_'),run=isRun(v),sen=z.sensor&&gSensors().find(s=>s.id===z.sensor),d=decideNow(id),open=auto.open===id;
  const objsL=(z.objs||[]).map(obj).filter(Boolean),log=(gdst.log||[]),last=log.find(e=>e.type==='water'&&e.valve===id),dur=auto.dur[id]||z.min||15;
  const ML={off:'À la demande',sensor:'Auto · sonde',program:'Auto · programme'};
  let h=`<div class="aucard${run?' run':''}" id="az-${key}"><div class="auhead"><div style="min-width:0"><b>${esc(v.name)}</b><span class="note" style="display:block">${objsL.length?objsL.map(o=>esc(fullName(o))).join(', '):'Aucune planche liée'}</span></div><span class="aumode ${z.mode}">${ML[z.mode]||ML.off}</span></div>`;
  if(sen&&sen.soil!=null)h+=`<div class="augauge"><span class="lbl">Humidité du sol</span><div class="g"><span style="width:${clamp(sen.soil,0,100)}%"></span>${z.mode==='sensor'?`<i style="left:${clamp(z.thr,0,100)}%" title="seuil"></i>`:''}</div><b class="mono">${num(sen.soil,0)} %</b></div>`;
  if(run){const st=(last&&last.end===v.end?v.end-last.min*60000:v.end-dur*60000);
    h+=`<div class="aurun"><div class="bar"><span data-bar-s="${st}" data-bar-e="${v.end||0}" style="width:${v.end?clamp((Date.now()-st)/(v.end-st)*100,0,100):50}%"></span></div><div class="row between"><span>Arrosage en cours${v.end?` · reste <b class="mono" data-end="${v.end}">${fmtLeft(v.end-Date.now())}</b>`:''}</span><button class="btn small danger" data-au="stop" data-id="${id}">Arrêter</button></div></div>`}
  else h+=`<div class="audec ${d.go?'go':d.skip?'skip':d.ok?'ok':d.off?'off':'wait'}"><i></i><span>${esc(d.why)}</span></div>
    <div class="autimer"><div class="seg" role="group" aria-label="Durée">${[5,10,15,30,60].map(m=>`<button data-au="dur" data-id="${id}" data-m="${m}" aria-pressed="${dur===m}">${m} min</button>`).join('')}<input class="aumin" type="number" min="1" max="90" step="1" data-au-dur="${id}" value="${[5,10,15,30,60].includes(dur)?'':dur}" placeholder="autre" aria-label="Autre durée en minutes"></div>
    <button class="btn primary" data-au="go" data-id="${id}">Arroser ${dur} min</button></div>`;
  h+=`<div class="row between"><span class="note">${last?`Dernier arrosage ${whenTxt(last.at)} · ${num(last.min,0)} min${last.how==='auto'?' auto':''}`:'Pas encore arrosé par GARDENA'}</span><button class="btn small" data-au="rules" data-id="${id}">${open?'Fermer':'Réglages'}</button></div>`;
  if(open){const pl=plantables(),hrs=z.hours||[6];
    h+=`<div class="aurules"><div><span class="lbl">Fonctionnement</span><div class="seg" style="margin-top:6px">${[['off','À la demande'],['sensor','Selon la sonde'],['program','Programme']].map(([k,l])=>`<button data-au="mode" data-id="${id}" data-m="${k}" aria-pressed="${z.mode===k}">${l}</button>`).join('')}</div></div>
    ${z.mode==='sensor'?`<div class="grid2"><label class="field"><span class="lbl">Sonde</span><select data-zf="sensor" data-id="${id}"><option value="">Choisir…</option>${gSensors().map(s=>`<option value="${s.id}" ${s.id===z.sensor?'selected':''}>${esc(s.name)}${s.soil!=null?' · '+num(s.soil,0)+' %':''}</option>`).join('')}</select></label>
      <label class="field"><span class="lbl">Arroser sous <b class="mono" data-thr="${id}">${z.thr} %</b></span><input type="range" min="10" max="60" step="1" data-zf="thr" data-id="${id}" value="${z.thr}"></label></div>`:''}
    ${z.mode==='program'?`<label class="field" style="max-width:200px"><span class="lbl">Tous les (jours)</span><input type="number" min="1" max="14" step="1" data-zf="every" data-id="${id}" value="${z.every}"></label>`:''}
    ${z.mode!=='off'?`<div><span class="lbl">Créneaux (dans les 2 h qui suivent)</span><div class="seg" style="margin-top:6px">${[5,6,7,8,9,18,19,20,21].map(x=>`<button data-au="hour" data-id="${id}" data-m="${x}" aria-pressed="${hrs.includes(x)}">${x} h</button>`).join('')}</div></div>
    <div class="grid3"><label class="field"><span class="lbl">Durée (min)</span><input type="number" min="1" max="90" step="1" data-zf="min" data-id="${id}" value="${z.min}"></label>
      <label class="field"><span class="lbl">Sauter si pluie ≥ (mm)</span><input type="number" min="0" max="50" step="0.5" data-zf="skipRain" data-id="${id}" value="${z.skipRain}"></label>
      <label class="field"><span class="lbl">Écart mini (h)</span><input type="number" min="1" max="168" step="1" data-zf="gap" data-id="${id}" value="${z.gap}"></label></div>
    <p class="note">Pluie prévue : 0 pour ne jamais sauter. Écart mini : temps minimum entre deux arrosages auto, le temps que l'eau descende jusqu'à la sonde.</p>`:''}
    <label class="field" style="max-width:220px"><span class="lbl">Débit de la ligne (L/min)</span><input type="number" min="0.5" max="60" step="0.5" data-zf="flow" data-id="${id}" value="${z.flow}"></label>
    <div><span class="lbl">Planches arrosées par cette vanne</span><div class="qlist" style="margin-top:6px">${pl.map(o=>{const other=zoneOfObj(o.id);return`<label><input type="checkbox" data-zo="${o.id}" data-id="${id}" ${(z.objs||[]).includes(o.id)?'checked':''}><span><b>${esc(fullName(o))}</b>${other&&other!==id?`<span class="note" style="display:block">déjà sur ${esc(valveName(other))}</span>`:''}</span></label>`}).join('')}</div></div></div>`}
  return h+`</div>`}
function renderAuto(){if(!auto)return;const c=GDN.get(),v=$('#autoView');
  const sub=c.demo?'Démo · appareils fictifs':!gLinked()?'Pas encore relié':gdBusy&&!gdst?'Lecture…':gdst&&gdst.err?'Problème de liaison':gdst&&gdst.state?`GARDENA${gdst.state.location?' · '+esc(gdst.state.location):''} · lu ${gdst.state.at?'à '+hhmm(gdst.state.at):''}`:'…';
  let b='';
  if(!gLinked()||auto.setup)b+=autoSetupHTML();
  if(gLinked()&&gdst&&gdst.err)b+=`<div class="alert"><span>${esc(gdst.err)}</span></div>`;
  if(gLinked()&&gdst&&gdst.state){const st=gdst.state,vs=gValves(),run=vs.filter(isRun),a=autoCfg(),log=gdst.log||[];
    if(run.length>1)b+=`<div class="row between"><span class="lbl">${run.length} vannes ouvertes</span><button class="btn small danger" data-au="stopall">Tout arrêter</button></div>`;
    b+=`<div class="stack"><div class="section-t"><span class="lbl">Vannes</span><span class="mono note">${vs.length}</span></div>${vs.map(zoneCard).join('')||'<p class="note">Aucune vanne trouvée sur ce compte GARDENA.</p>'}</div>`;
    if(st.sensors.length)b+=`<div class="stack"><span class="lbl">Sondes</span><div class="hvlist">${st.sensors.map(s=>{const used=vs.filter(v=>zc(v.id).sensor===s.id).map(v=>v.name);return`<div class="prod"><div class="top" style="cursor:default"><span><b>${esc(s.name)}</b><span class="note" style="display:block">${[s.soilT!=null?'sol '+num(s.soilT,0)+' °C':'',s.air!=null?'air '+num(s.air,0)+' °C':'',s.light!=null?'lumière '+num(s.light,0)+' lx':'',s.battery!=null?'pile '+s.battery+' %':''].filter(Boolean).join(' · ')}${used.length?' · pilote '+used.map(esc).join(', '):''}</span></span><span class="q">${s.soil!=null?num(s.soil,0)+' <small>%</small>':'–'}</span></div></div>`}).join('')}</div></div>`;
    const pk=a.pump.kind,w=S.water||{level:0,cap:1};
    b+=`<div class="panel"><h3>Pompe et cuve</h3><div class="seg">${[['auto','Pompe automatique'],['socket','Sur prise GARDENA'],['valve','Pompe GARDENA smart'],['none','Réseau, sans cuve']].map(([k,l])=>`<button data-au="pump" data-m="${k}" aria-pressed="${pk===k}">${l}</button>`).join('')}</div>
      ${pk==='socket'?`<label class="field"><span class="lbl">Prise de la pompe</span><select data-pf="id"><option value="">Choisir…</option>${st.sockets.map(s=>`<option value="${s.id}" ${s.id===a.pump.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label>`:''}
      ${pk==='valve'?`<label class="field"><span class="lbl">Pompe</span><select data-pf="id"><option value="">Choisir…</option>${st.valves.map(s=>`<option value="${s.id}" ${s.id===a.pump.id?'selected':''}>${esc(s.name)}${s.pump?' (pompe)':''}</option>`).join('')}</select></label>`:''}
      <p class="note">${pk==='auto'?'Pompe à pression : elle démarre seule quand une vanne s\'ouvre.':pk==='socket'?'La prise s\'allume avec la vanne et s\'éteint une minute après.':pk==='valve'?'La pompe GARDENA est lancée en même temps que la vanne.':'Pas de cuve : le niveau n\'est pas suivi.'}</p>
      ${pk!=='none'?`<div class="augauge"><span class="lbl">Cuve (estimation)</span><div class="g water"><span style="width:${clamp(w.level/Math.max(1,w.cap)*100,0,100)}%"></span>${a.tankMin?`<i style="left:${clamp(a.tankMin/Math.max(1,w.cap)*100,0,100)}%"></i>`:''}</div><b class="mono">${num(w.level,0)} L</b></div>
      <label class="field" style="max-width:240px"><span class="lbl">Ne plus arroser sous (L)</span><input type="number" min="0" step="50" data-pf="tankMin" value="${a.tankMin}"></label>
      <p class="note">Chaque arrosage retire débit × durée. Corrige le niveau réel dans Eau &amp; météo quand tu le relèves.</p>`:''}</div>`;
    b+=`<div class="stack"><span class="lbl">Historique</span>${log.length?`<div class="aulog">${log.slice(0,25).map(e=>{const n=esc(valveName(e.valve));const t=e.type==='water'?`<b>${n}</b> · ${num(e.min,0)} min · ${e.how==='auto'?'automatique':'manuel'}${e.why?`<span class="note" style="display:block">${esc(e.why)}</span>`:''}`:e.type==='stop'?`<b>${n}</b> arrêtée${e.left>0?` (${e.left} min avant la fin)`:''}`:e.type==='skip'?`<b>${n}</b> · ${esc(e.why||'sauté')}`:`<span style="color:var(--danger)">${esc(e.msg||'Erreur')}</span>`;
      return`<div class="${e.type}"><i></i><span>${t}</span><span class="mono note">${whenTxt(e.at).replace("aujourd'hui à ",'')}</span></div>`}).join('')}</div>`:'<p class="note">Rien pour l\'instant.</p>'}</div>`;
    if(!auto.setup)b+=`<div class="row between"><span class="note">${c.demo?'Mode démo : rien ne s\'ouvre pour de vrai.':`Relais ${esc((c.url||'').replace(/^https?:\/\//,''))}${gdst.cfgAt?' · règles envoyées à '+hhmm(gdst.cfgAt):''}`}</span><button class="btn small" data-au="setup">${c.demo?'Relier GARDENA':'Connexion'}</button></div>`}
  else if(gLinked()&&!gdst)b+=`<p class="note">Lecture des appareils…</p>`;
  v.innerHTML=`<div class="bedhead">${AU_BACK}<div style="min-width:0;flex:1"><div class="brand" style="font-size:17px">Arrosage automatique</div><div class="note">${sub}</div></div>${gLinked()?`<button class="btn small" data-au="sync">${gdBusy?'…':'Actualiser'}</button>`:''}</div><div class="bedbody">${b}</div>`}
/* petite carte réutilisée dans Eau & météo et Aujourd'hui */
function autoCard(compact){if(GDN.get().role==='user')return'';if(!gLinked())return compact?'':`<button class="tcard aucta" data-wact="auto"><div class="row between"><h3>Relier GARDENA</h3><span class="chev">›</span></div><span class="note">Relie ton GARDENA smart system pour arroser à distance avec minuteur, ou selon tes sondes.</span></button>`;
  const vs=gValves(),run=vs.filter(isRun),autos=vs.filter(v=>zc(v.id).mode!=='off');
  if(compact&&!run.length)return'';
  const lines=run.map(v=>`<span class="aurow"><i class="on"></i><b>${esc(v.name)}</b> arrose${v.end?` · reste <b class="mono" data-end="${v.end}">${fmtLeft(v.end-Date.now())}</b>`:''}</span>`);
  if(!compact){const next=autos.map(v=>({v,d:decideNow(v.id)})).filter(x=>!isRun(x.v));lines.push(...next.slice(0,3).map(x=>`<span class="aurow"><i class="${x.d.go||x.d.due?'due':x.d.skip?'skip':'ok'}"></i><b>${esc(x.v.name)}</b> · ${esc(x.d.why)}</span>`));
    if(!lines.length)lines.push(`<span class="note">${vs.length} vanne${vs.length>1?'s':''} · aucune en automatique</span>`)}
  return`<button class="tcard aucta" ${compact?'data-tgo="auto"':'data-wact="auto"'}><div class="row between"><h3>${run.length?'Arrosage en cours':compact?'Arrosage automatique':'Vannes et règles'}${gDemo()?' <span class="note">· démo</span>':''}</h3><span class="chev">›</span></div>${gdst&&gdst.err&&!compact?`<span class="note" style="color:var(--danger)">${esc(gdst.err)}</span>`:''}${lines.join('')}</button>`}

$('#autoView').addEventListener('click',async e=>{const b=e.target.closest('[data-au]');if(!b||!auto)return;const a=b.dataset.au,id=b.dataset.id;
  if(a==='back'){closeAuto();refresh();return}
  if(a==='sync'){gSync(true);return}
  if(a==='setup'){auto.setup=!auto.setup;renderAuto();if(auto.setup)$('#autoView').scrollTop=0;return}
  if(a==='gorelay'){closeAuto();setTab('plan');selId=null;sheetMode='relay';renderSheet();renderPlan();return}
  if(a==='demo'){GDN.set({...GDN.get(),demo:true});gdst=demoInit();demoSetup();auto.setup=false;renderAuto();$('#autoView').scrollTop=0;return toast('Démo : appareils fictifs, rien ne s\'ouvre pour de vrai')}
  if(a==='unlink'){const was=GDN.get();GDN.set({...was,demo:false});gdst=null;if(was.demo){const c=autoCfg();Object.keys(c.zones).filter(k=>k.startsWith('demo')).forEach(k=>delete c.zones[k]);if(String(c.pump.id).startsWith('demo'))c.pump={kind:'auto',id:''};save()}auto.setup=true;renderAuto();if(gLinked())gSync(true);return toast('Démo fermée')}
  if(a==='gcheck'){const err=$('#au-err');b.disabled=true;b.textContent='Vérification…';
    try{const l=await gReq('/gardens');GDN.set({...GDN.get(),gardena:!!l.gardena,demo:false});if(!l.gardena)throw new Error('Le relais ne voit pas encore GARDENA_KEY et GARDENA_SECRET. Après les avoir ajoutés, attends quelques secondes et réessaie.');
      const j=await gReq('/status?fresh=1');const c=autoCfg();Object.keys(c.zones).filter(k=>k.startsWith('demo')).forEach(k=>delete c.zones[k]);if(String(c.pump.id).startsWith('demo'))c.pump={kind:'auto',id:''};
      S.autoSeen=(j.log||[]).map(x=>x.id);save();gdSet(j);auto.setup=false;pushCfg();renderAuto();$('#autoView').scrollTop=0;
      toast(`GARDENA relié : ${j.state.valves.length} vanne${j.state.valves.length>1?'s':''}, ${j.state.sensors.length} sonde${j.state.sensors.length>1?'s':''}`)}
    catch(x){if(err){err.hidden=false;err.textContent=x.message}b.disabled=false;b.textContent='Vérifier'}return}
  if(a==='dur'){auto.dur[id]=+b.dataset.m;renderAuto();return}
  if(a==='go'){const m=auto.dur[id]||zc(id).min||15;b.disabled=true;await gWater(id,m);return}
  if(a==='stop'){b.disabled=true;await gStop(id);return}
  if(a==='stopall'){for(const v of gValves().filter(isRun))await gStop(v.id);return}
  if(a==='rules'){auto.open=auto.open===id?null:id;renderAuto();return}
  if(a==='mode'){setZ(id,{mode:b.dataset.m});renderAuto();return}
  if(a==='hour'){const h=+b.dataset.m,cur=zc(id).hours||[];let n=cur.includes(h)?cur.filter(x=>x!==h):[...cur,h].sort((x,y)=>x-y);if(!n.length)n=[h];setZ(id,{hours:n});renderAuto();return}
  if(a==='pump'){const c=autoCfg();c.pump={kind:b.dataset.m,id:b.dataset.m===c.pump.kind?c.pump.id:''};save();pushCfgSoon();renderAuto();return}});
$('#autoView').addEventListener('input',e=>{const t=e.target;if(t.dataset.zf==='thr'){const l=document.querySelector(`[data-thr="${t.dataset.id}"]`);if(l)l.textContent=t.value+' %'}});
$('#autoView').addEventListener('change',e=>{const t=e.target,id=t.dataset.id;
  if(t.dataset.auDur!=null){const m=clamp(Math.round(+t.value||0),1,90);if(+t.value>0){auto.dur[t.dataset.auDur]=m;renderAuto()}return}
  if(t.dataset.zf){const f=t.dataset.zf,v=f==='sensor'?t.value:+t.value;if(f!=='sensor'&&isNaN(v))return;setZ(id,{[f]:v});if(f!=='thr')renderAuto();return}
  if(t.dataset.zo){const z=zc(id),s=new Set(z.objs||[]);if(t.checked){s.add(t.dataset.zo);const c=autoCfg();Object.keys(c.zones).forEach(k=>{if(k!==id&&c.zones[k].objs)c.zones[k].objs=c.zones[k].objs.filter(x=>x!==t.dataset.zo)})}else s.delete(t.dataset.zo);setZ(id,{objs:[...s]});renderAuto();return}
  if(t.dataset.pf){const c=autoCfg();if(t.dataset.pf==='tankMin')c.tankMin=Math.max(0,+t.value||0);else c.pump.id=t.value;save();pushCfgSoon();renderAuto()}});
/* compte à rebours, et relecture quand un arrosage se termine */
let auEndSeen=0;
setInterval(()=>{const n=Date.now();document.querySelectorAll('[data-end]').forEach(el=>{el.textContent=fmtLeft(+el.dataset.end-n)});
  document.querySelectorAll('[data-bar-e]').forEach(el=>{const s=+el.dataset.barS,e=+el.dataset.barE;if(e>s)el.style.width=clamp((n-s)/(e-s)*100,0,100)+'%'});
  if(gdst&&gdst.state){const ended=gdst.state.valves.some(v=>v.end&&v.end<=n&&v.activity!=='CLOSED');if(ended&&n-auEndSeen>20000){auEndSeen=n;if(gDemo())demoTick();else{gdst.state.valves.forEach(v=>{if(v.end&&v.end<=n){v.activity='CLOSED';v.end=null}});setTimeout(()=>gSync(true),4000)}renderAutoAll()}}},1000);
setInterval(()=>{if(!document.hidden&&gLinked()&&(auto||tab==='weather'||tab==='today'))gSync(false)},60000);
setTimeout(()=>{if(gLinked())gSync(false)},400);
/* ---- synchronisation des potagers entre appareils, via le relais ---- */
var syncT=null,syncBusy=false,syncErr=null,syncAt=0;
function syncPushSoon(){try{if(!relayOn())return;clearTimeout(syncT);syncT=setTimeout(()=>syncPush(GID),2500)}catch(e){}}
const localAtOf=id=>id===GID?localAt:(+localStorage.getItem(keyAtOf(id))||0);
const stateOf=id=>id===GID?lastJSON:localStorage.getItem(keyOf(id));
/* ce que le relais doit surveiller pour les notifications (calculé ici, avec toutes les règles de l'app) */
function notifPlan(){const ev=[],seen=new Set(),add=(k,d,txt)=>{const id=k+':'+d+':'+txt;if(!seen.has(id)){seen.add(id);ev.push({id,k,d,txt})}};
  plantings().forEach(x=>{if(x.left>-30)add('harvest',iso(x.bu&&x.bu>x.hv?x.bu:x.hv),x.p.fl?`${x.p.n} en fleur (${fullName(x.o)})`:`${x.p.n} prêt à récolter (${fullName(x.o)})`)});
  if(FLW()){const m0=new Date(YEAR,TODAY.getMonth(),1,12),seen=new Set();plantings().forEach(x=>(x.p.care||[]).forEach(cr=>{const k=x.p.id+cr.t;if(cr.m.includes(TODAY.getMonth()+1)&&!seen.has(k)){seen.add(k);add('care',iso(m0),`${x.p.n} : ${cr.t.charAt(0).toLowerCase()+cr.t.slice(1)}`)}}))}
  plantables().forEach(o=>{const bu=blockUntil(o);if(bu)add('dar',iso(bu),`Fin du délai après traitement : ${fullName(o)}`);
    o.zones.forEach(z=>(z.next||[]).forEach(n=>{if(n.date&&P[n.crop])add('plan',n.date,`À planter : ${P[n.crop].n} (${fullName(o)})`)}))});
  nurseryActive().forEach(n=>{if(P[n.crop])add('nursery',iso(readyOf(n)),`Semis de ${P[n.crop].n.toLowerCase()} prêts à repiquer`)});
  succession().forEach(x=>{if(!x.goal)return add('resow',iso(x.next),`Ressemer : ${x.p.n.toLowerCase()} (tous les ${x.int} j)`);
    x.plan.list.filter(s=>days(TODAY,s.d)<=120).forEach(s=>add('resow',iso(s.d),`Semer ${x.p.n.toLowerCase()} : ${s.qty} plants ${s.how} (objectif ${uTxt(x.goal.w,x.u)} par semaine)`))});
  const water=plantables().filter(isPlanted).map(o=>{const m=(o.journal||[]).filter(x=>x.k==='arrosage').map(x=>x.d).sort().pop()||null,r=serreOf(o)?null:(S.rain||[]).filter(x=>x.mm==null||x.mm>=RAIN_MIN).map(x=>x.d).sort().pop()||null;return{name:fullName(o),serre:!!serreOf(o),last:[m,r].filter(Boolean).sort().pop()||null}});
  const frost=[];plantables().forEach(o=>o.zones.forEach(z=>{if(z.crop&&FROST_SENSITIVE.has(z.crop)&&Object.keys(z.cells).length)frost.push({crop:P[z.crop].n.toLowerCase(),name:fullName(o),serre:!!serreOf(o)})}));
  return{ev,water,frost,geo:geoOr(),at:Date.now()}}
let calErr=null;
function icsOf(ev,name){const esc2=t=>String(t).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/([,;])/g,'\\$1'),dd=d=>d.replace(/-/g,''),from=iso(addD(iso(TODAY),-30));
  const fold=l=>{const out=[];let cur='';for(const ch of l){if(new TextEncoder().encode(cur+ch).length>73){out.push(cur);cur=' '+ch}else cur+=ch}out.push(cur);return out.join('\r\n')};
  const st=new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z',L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Atelier Potager//FR','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:'+esc2(name||'Potager')];
  ev.filter(e=>/^\d{4}-\d{2}-\d{2}$/.test(e.d)&&e.d>=from).forEach((e,i)=>L.push('BEGIN:VEVENT','UID:'+dd(e.d)+'-'+i+'-'+Date.now().toString(36)+'@atelier-potager','DTSTAMP:'+st,'DTSTART;VALUE=DATE:'+dd(e.d),'DTEND;VALUE=DATE:'+dd(iso(addD(e.d,1))),fold('SUMMARY:'+esc2(e.txt)),'TRANSP:TRANSPARENT','END:VEVENT'));
  L.push('END:VCALENDAR');return L.join('\r\n')+'\r\n'}
/* les photos partent à part sur le relais : le potager reste léger */
async function offloadPhotos(){let n=0;for(const o of allObjs())for(const e of (o.journal||[])){if(e.ph&&e.ph.u&&!e.ph.r){try{const r=await gReq('/photo','POST',{data:e.ph.u});e.ph={r:r.url};n++}catch(x){return n}}}if(n)save(true);return n}
async function syncPush(id){if(!relayOn())return;if(id===GID&&allObjs().some(o=>(o.journal||[]).some(e=>e.ph&&e.ph.u))){if(await offloadPhotos())return}const at=localAtOf(id),j=stateOf(id);if(!at||!j)return;
  try{let plan=null;if(id===GID){try{plan=notifPlan()}catch(e){}}await gReq('/garden?id='+encodeURIComponent(id),'PUT',{state:JSON.parse(j),at,plan});syncErr=null;syncAt=Date.now()}
  catch(e){if(e.status===409){syncPull()}else syncErr=e.message}renderSyncLine()}
async function syncPull(manual){if(!relayOn()||syncBusy)return;syncBusy=true;
  try{const r=await gReq('/gardens'),c=GDN.get();if(c.gardena!==!!r.gardena||r.me&&(c.role!==r.me.role||c.name!==r.me.name))GDN.set({...c,gardena:!!r.gardena,...(r.me?{role:r.me.role,name:r.me.name}:{})});
    const reg=GL.get();let regCh=false,curCh=false;
    for(const g of r.list){const loc=reg.list.find(x=>x.id===g.id);
      if(g.del){if(loc&&reg.list.length>1){reg.list=reg.list.filter(x=>x.id!==g.id);regCh=true;try{localStorage.removeItem(keyOf(g.id));localStorage.removeItem(keyAtOf(g.id))}catch(e){}if(g.id===GID)curCh='gone'}continue}
      if(g.at>localAtOf(g.id)){const d=await gReq('/garden?id='+encodeURIComponent(g.id));if(!d||!d.state)continue;
        if(g.id===GID){past.push(lastJSON);if(past.length>80)past.shift();future=[];S=migrate(d.state);lastJSON=JSON.stringify(S);localAt=d.at;persist();curCh=true}
        else{try{localStorage.setItem(keyOf(g.id),JSON.stringify(d.state));localStorage.setItem(keyAtOf(g.id),String(d.at))}catch(e){}}
        if(!loc){reg.list.push({id:g.id,name:g.name,ex:g.ex});regCh=true}}}
    if(regCh){const cur=GL.get();cur.list=reg.list.map(x=>({...x}));GL.set(cur)}
    /* ce que le relais n'a pas encore, ou en plus ancien */
    for(const l of GL.get().list){const g=r.list.find(x=>x.id===l.id);if(g&&g.del)continue;if(localAtOf(l.id)>(g?g.at:0))await syncPush(l.id)}
    syncErr=null;syncAt=Date.now();
    if(curCh==='gone'){GID=null;switchGarden(GL.get().list[0].id)}
    else if(curCh){if(selId&&!obj(selId)){selId=null;if(sheetMode==='obj')sheetMode=null}renderHeader();refresh();if(manual)toast('Potager mis à jour depuis ton autre appareil')}
    else if(manual)toast('Tout est à jour')}
  catch(e){syncErr=e.status===401?'Code d\'accès refusé par le relais':e.message;if(manual)toast(syncErr)}
  finally{syncBusy=false;renderSyncLine();if(sheetMode==='menu'||sheetMode==='relay')renderSheet()}}

/* ---- notifications (Web Push via le relais) ---- */
const pushPrefs=()=>({hour:8,...(GDN.get().pushPrefs||{})});
function pushState(){const sa=matchMedia('(display-mode: standalone)').matches||navigator.standalone,sup='serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window,on=!!GDN.get().pushEp&&sup&&Notification.permission==='granted';
  if(!relayOn())return{txt:'Relie d\'abord le relais',why:'Les notifications passent par ton relais : relie-le dans Synchronisation.'};
  if(!sup)return{txt:'Pas disponible ici',why:sa?'Cet appareil ne gère pas les notifications web (iOS 16.4 minimum).':'Sur iPhone et iPad, les notifications ne marchent que dans l\'app ajoutée à l\'écran d\'accueil (Partager → Sur l\'écran d\'accueil), ouverte depuis son icône.'};
  if(Notification.permission==='denied')return{txt:'Refusées',why:'Les notifications ont été refusées. Réglages iPhone → Notifications → Potager pour les autoriser.'};
  return on?{on:true,txt:'Activées sur cet appareil'}:{can:true,txt:'Désactivées sur cet appareil'}}
async function pushOn(){if(Notification.permission!=='granted'){const p=await Notification.requestPermission();if(p!=='granted')throw new Error('Autorisation refusée.')}
  const k=await gReq('/push/key'),reg=await navigator.serviceWorker.ready,key=unb64u(k.key);
  let sub=await reg.pushManager.getSubscription();if(sub){const cur=sub.options&&sub.options.applicationServerKey;if(cur&&b64u(cur)!==k.key){await sub.unsubscribe();sub=null}}
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
  const name=/iPad/.test(navigator.userAgent)||navigator.maxTouchPoints>1&&/Mac/.test(navigator.userAgent)?'iPad':/iPhone/.test(navigator.userAgent)?'iPhone':'Appareil';
  await gReq('/push/subscribe','POST',{sub:sub.toJSON(),prefs:pushPrefs(),name});GDN.set({...GDN.get(),pushEp:sub.endpoint});syncPush(GID);
  gReq('/push/test','POST',{endpoint:sub.endpoint}).catch(()=>{})}
async function pushOff(){const ep=GDN.get().pushEp;try{const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();if(sub)await sub.unsubscribe()}catch(e){}
  if(ep)await gReq('/push/unsubscribe','POST',{endpoint:ep}).catch(()=>{});const c=GDN.get();delete c.pushEp;GDN.set(c)}
function unb64u(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
function b64u(b){return btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
/* le plan surveillé reste à jour chaque jour, même sans modification */
setTimeout(()=>{try{if(relayOn()&&GDN.get().pushEp)syncPush(GID)}catch(e){}},4000);

/* ---- amis invités et lieu du potager ---- */
const APP_URL='https://razor-back1.github.io/Potager/';
const mkInvite=(u,t,n,k)=>'POT1.'+b64u(new TextEncoder().encode(JSON.stringify(k?{u,t,n,k}:{u,t,n})));
function readInvite(code){const m=String(code||'').match(/POT1\.[A-Za-z0-9_-]+/);if(!m)return null;try{const o=JSON.parse(new TextDecoder().decode(unb64u(m[0].slice(5))));return o&&o.u&&o.t?o:null}catch(e){return null}}
async function applyInvite(inv){GDN.set({url:inv.u,token:inv.t,role:'user',name:inv.n||''});try{localStorage.setItem('potager-noinv','1')}catch(e){}
  try{await syncPull(true)}catch(e){toast(e.message)}
  /* l'app démarre avec l'exemple choisi par celui qui invite */
  if(inv.k==='fleurs'&&!FLW()){if(S.example&&!localAt){S=sampleFlowers();lastJSON='';save();past=[];future=[]}else addGarden(sampleFlowers())}
  if(inv.k==='potager'&&FLW())addGarden(sample());
  toast(inv.n?`Bienvenue ${inv.n} : ton app est reliée`:'Invitation acceptée : ton app est reliée');renderHeader();refresh()}
async function loadFriends(){try{const r=await gReq('/admin/users');window._friends={list:r.users}}catch(x){window._friends={err:x.message}}if(sheetMode==='friends')renderSheet()}
function setGeo(g){try{localStorage.setItem('potager-geo',JSON.stringify(g))}catch(e){}window._geoRes=null;wx=null;sheetMode='menu';renderSheet();toast('Lieu enregistré : '+g.name);syncStation(false);syncPushSoon()}
const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const isIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)||navigator.maxTouchPoints>1&&/Mac/.test(navigator.userAgent);
/* lien d'invitation ouvert : on relie tout de suite, et sur iPhone dans Safari on explique comment l'installer */
setTimeout(()=>{const m=(location.hash||'').match(/join=(POT1\.[\w-]+)/);if(!m)return;const inv=readInvite(m[1]);try{history.replaceState(null,'',location.pathname)}catch(e){}
  if(!inv)return toast('Invitation illisible');applyInvite(inv);if(isIOS()&&!isStandalone())showInstallGuide(inv,m[1])},300);
function showInstallGuide(inv,code){const d=document.createElement('div');d.className='invguide';
  d.innerHTML=`<div class="invcard"><h3>Bienvenue${inv.n?' '+esc(inv.n):''} !</h3><p>Pour avoir l'app sur ton écran d'accueil :</p>
  <ol><li><button class="btn primary" data-g="copy">Copier mon invitation</button></li><li>Touche <b>Partager</b> en bas de Safari, puis <b>« Sur l'écran d'accueil »</b>.</li><li>Ouvre <b>Potager</b> depuis son icône et touche <b>« Coller l'invitation »</b>.</li></ol>
  <button class="btn" data-g="close">Continuer ici pour l'instant</button></div>`;
  d.addEventListener('click',async e=>{const b=e.target.closest('[data-g]');if(!b)return;if(b.dataset.g==='copy'){try{await navigator.clipboard.writeText(APP_URL+'#join='+code);b.textContent='Invitation copiée ✓'}catch(x){toast('Copie impossible')}}else d.remove()});
  document.body.appendChild(d)}
function inviteBanner(){if(relayOn()||!isStandalone())return'';try{if(localStorage.getItem('potager-noinv'))return''}catch(e){}
  return`<div class="tcard invban"><h3>Tu as reçu une invitation ?</h3><span class="note">Colle-la pour retrouver tes potagers en ligne, ta synchro et tes notifications.</span><div class="row"><button class="btn small primary" data-tinv2="paste">Coller l'invitation</button><button class="btn small" data-tinv2="later">Non merci</button></div></div>`}
addEventListener('visibilitychange',()=>{if(!document.hidden)syncPull()});
setInterval(()=>{if(!document.hidden)syncPull()},60000);
setTimeout(()=>syncPull(),700);


