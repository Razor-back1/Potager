/* ================= Station météo (Weather Underground) ================= */
/* identifiant et clé gardés sur cet appareil uniquement, jamais dans le plan synchronisé */
/* station par défaut (choix de Julien : station publique, clé assumée dans le code) ; un réglage saisi dans l'app la remplace */
const WU_DEFAULT={id:'IGHEZE29',key:'6fffe640ff8c4e82bfe640ff8cfe8292'};
/* ma station par défaut ne s'applique qu'à moi (propriétaire du relais), pas aux amis invités */
const isOwner=()=>{try{return JSON.parse(localStorage.getItem('potager-gardena')||'{}').role==='admin'}catch(e){return false}};
const WU={get(){try{const v=JSON.parse(localStorage.getItem('potager-wu'));return v&&v.key?v:(v&&v.off||!isOwner()?{}:WU_DEFAULT)}catch(e){return isOwner()?WU_DEFAULT:{}}},set(v){try{localStorage.setItem('potager-wu',JSON.stringify(v))}catch(e){}}};
let wx=null,wxBusy=false;
const inClaude=()=>!!window.claude||/claude\.ai|claudeusercontent/.test(location.hostname);
async function wuFetch(path,c){const u=`https://api.weather.com${path}${path.includes('?')?'&':'?'}apiKey=${encodeURIComponent(c.key)}&format=json&units=m&numericPrecision=decimal`;
  let r;try{r=await fetch(u)}catch(e){throw new Error(inClaude()?'La station ne se lit que dans l\'app installée, pas dans Claude.':'Station injoignable : vérifie la connexion internet.')}
  if(r.status===401||r.status===403)throw new Error('Clé API refusée par Weather Underground.');
  if(r.status===204)throw new Error('Aucune donnée : vérifie l\'identifiant de la station, ou elle est hors ligne.');
  if(!r.ok)throw new Error('Weather Underground a répondu ' + r.status + '.');return r.json()}
/* Prévisions publiques Open-Meteo (gratuites, sans clé) : minimum de la nuit et 5 jours */
const HOME_GEO={lat:50.586,lon:4.877};
/* lieu du potager : choisi dans le menu, sinon Leuze pour moi, Bruxelles par défaut pour les autres */
function GEO(){try{const g=JSON.parse(localStorage.getItem('potager-geo'));if(g&&isFinite(g.lat)&&isFinite(g.lon))return g}catch(e){}return isOwner()?{...HOME_GEO,name:'Leuze'}:null}
const geoOr=()=>GEO()||{lat:50.85,lon:4.35,name:'Bruxelles (par défaut)'};
async function forecastOM(lat,lon){
  const u=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    +`&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,precipitation_probability_max,weather_code,wind_speed_10m_max,wind_gusts_10m_max,et0_fao_evapotranspiration,sunrise,sunset,daylight_duration,sunshine_duration,uv_index_max`
    +`&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,is_day,wind_speed_10m,soil_temperature_6cm`
    +`&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m,wind_gusts_10m,wind_direction_10m,pressure_msl,precipitation`
    +`&timezone=Europe%2FBrussels&past_days=7&forecast_days=7`;
  let r;try{r=await fetch(u)}catch(e){throw new Error(inClaude()?'Les prévisions ne se lisent que dans l\'app installée.':'Prévisions injoignables : vérifie la connexion.')}
  if(!r.ok)throw new Error('Prévisions indisponibles ('+r.status+').');const j=await r.json();
  const H=j.hourly||{},D=j.daily||{},ht=H.time||[],dt=D.time||[];
  const t0=iso(TODAY)+'T18:00',t1=iso(addD(iso(TODAY),1))+'T09:00';let night=null;
  ht.forEach((t,i)=>{if(t>=t0&&t<=t1){const v=H.temperature_2m[i];if(v!=null&&(night==null||v<night))night=v}});
  const dn=['dim','lun','mar','mer','jeu','ven','sam'],dv=(k,i)=>(D[k]||[])[i];
  let ti=dt.indexOf(iso(TODAY));if(ti<0)ti=Math.min(7,dt.length-1);
  const fc=dt.slice(ti,ti+7).map((d,k)=>{const i=ti+k;return{d,dow:dn[parse(d).getDay()],min:dv('temperature_2m_min',i),max:dv('temperature_2m_max',i),mm:dv('precipitation_sum',i),pp:dv('precipitation_probability_max',i),code:dv('weather_code',i),wind:dv('wind_speed_10m_max',i),gust:dv('wind_gusts_10m_max',i),et0:dv('et0_fao_evapotranspiration',i),rise:dv('sunrise',i),set:dv('sunset',i),dayLen:dv('daylight_duration',i),sunH:dv('sunshine_duration',i),uv:dv('uv_index_max',i)}});
  /* 7 jours passés : pluie tombée et évaporation, pour le bilan hydrique */
  let pRain=0,pEt=0;for(let i=Math.max(0,ti-7);i<ti;i++){pRain+=+dv('precipitation_sum',i)||0;pEt+=+dv('et0_fao_evapotranspiration',i)||0}
  const cu=j.current||{},hNow=(cu.time||new Date().toISOString()).slice(0,13)+':00';let hi=ht.indexOf(hNow);if(hi<0)hi=ht.findIndex(t=>t>=hNow);
  const hours=hi<0?[]:ht.slice(hi,hi+25).map((t,k)=>{const i=hi+k;return{t,temp:H.temperature_2m[i],pp:(H.precipitation_probability||[])[i],mm:(H.precipitation||[])[i],code:(H.weather_code||[])[i],day:(H.is_day||[])[i]!==0,wind:(H.wind_speed_10m||[])[i]}});
  const soil=hi<0?null:(H.soil_temperature_6cm||[])[hi];
  return{night,fc,hours,soil,past:{rain:pRain,et0:pEt},cur:{code:cu.weather_code,isDay:cu.is_day!==0,t:cu.temperature_2m,feel:cu.apparent_temperature,h:cu.relative_humidity_2m,wind:cu.wind_speed_10m,gust:cu.wind_gusts_10m,dir:cu.wind_direction_10m,p:cu.pressure_msl}}}
async function syncStation(manual,cfg){const c=cfg||WU.get();if(wxBusy&&!cfg)return;wxBusy=true;
  try{
    /* 1. la station (mesures et pluie) */
    let now=null,lat=geoOr().lat,lon=geoOr().lon,stErr=null,days=null;
    if(c.id&&c.key){try{const sid=encodeURIComponent(c.id.trim());
        const cur=await wuFetch(`/v2/pws/observations/current?stationId=${sid}`,c),ob=cur&&cur.observations&&cur.observations[0];if(!ob)throw new Error('Aucune observation récente pour cette station.');
        const m=ob.metric||{};now={t:m.temp,h:ob.humidity,rain:m.precipTotal,rate:m.precipRate,wind:m.windSpeed,gust:m.windGust,dir:ob.winddir,dew:m.dewpt,p:m.pressure,uv:ob.uv,sol:ob.solarRadiation,feel:m.temp!=null&&m.temp<10?m.windChill:m.heatIndex,time:ob.obsTimeLocal};if(ob.lat)lat=ob.lat;if(ob.lon)lon=ob.lon;
        try{days=await wuFetch(`/v2/pws/dailysummary/7day?stationId=${sid}`,c)}catch(e){}}
      catch(e){if(cfg)throw e;stErr=e.message}}
    if(cfg)return{now};
    /* 2. les prévisions publiques */
    let f=null,fcErr=null;try{f=await forecastOM(lat,lon)}catch(e){fcErr=e.message}
    wx={now,err:stErr,fcErr,night:f?f.night:null,fc:f?f.fc:null,cur:f?f.cur:null,hours:f?f.hours:[],soil:f?f.soil:null,past:f?f.past:null,at:Date.now(),id:c.id};
    let changed=false;S.rain=S.rain||[];
    if(now){const put=(d,mm)=>{mm=Math.round((+mm||0)*10)/10;const ex=S.rain.find(r=>r.d===d&&r.src==='station');
        if(mm<0.2){if(ex){S.rain=S.rain.filter(r=>r!==ex);changed=true}return}
        if(ex){if(ex.mm!==mm){ex.mm=mm;changed=true}}else{S.rain.push({id:uid(),d,mm,src:'station'});changed=true}};
      ((days&&days.summaries)||[]).forEach(x=>{if(x.obsTimeLocal&&x.metric)put(x.obsTimeLocal.slice(0,10),x.metric.precipTotal)});
      put(iso(TODAY),now.rain)}
    const night=wx.night!=null?Math.round(wx.night*10)/10:null;
    if(night!=null&&(!S.frost||S.frost.d!==iso(TODAY)||S.frost.src==='station')&&!(S.frost&&S.frost.d===iso(TODAY)&&S.frost.t===night)){S.frost={t:night,d:iso(TODAY),src:'station'};changed=true}
    if(changed){S.rain.sort((a,b)=>b.d.localeCompare(a.d));save()}
    if(manual)toast(stErr||fcErr||'Météo à jour');refresh();return wx}
  finally{wxBusy=false}}
function stationLine(){if(!wx)return'';if(wx.err)return`<span class="note" style="color:var(--danger)">Station : ${esc(wx.err)}</span>`;if(!wx.now)return wx.night!=null?`<span class="mono">Nuit prochaine : ${num(wx.night,1)} °C</span> <span class="note">· prévision</span>`:'';const n=wx.now,ago=Math.round((Date.now()-new Date(n.time.replace(' ','T')).getTime())/60000);
  return`<span class="mono">${num(n.t,1)} °C · ${n.h} % · pluie ${num(n.rain||0,1)} mm aujourd'hui</span> <span class="note">· station ${esc(wx.id)}${ago>=0&&ago<600?`, il y a ${ago<1?'moins d\'1':ago} min`:''}</span>`}
/* ---- icônes météo animées (codes WMO d'Open-Meteo) ---- */
function wxKind(code){const c=+code;if(c===0)return'clear';if(c===1||c===2)return'partly';if(c===3)return'cloudy';if(c===45||c===48)return'fog';
  if(c>=51&&c<=57)return'drizzle';if(c>=61&&c<=67)return'rain';if(c>=71&&c<=77||c===85||c===86)return'snow';if(c>=80&&c<=82)return'showers';if(c>=95)return'storm';return'cloudy'}
const WX_TXT={clear:'Ciel dégagé',partly:'Éclaircies',cloudy:'Couvert',fog:'Brouillard',drizzle:'Bruine',rain:'Pluie',showers:'Averses',snow:'Neige',storm:'Orage'};
function wxIcon(kind,day=true,anim=true){const A=anim?' wxa':'';
  const sun=(x,y,r)=>`<g class="wsun${A}" transform="translate(${x} ${y})"><g class="wrays">${[0,45,90,135,180,225,270,315].map(a=>`<line x1="0" y1="${-r-5}" x2="0" y2="${-r-11}" transform="rotate(${a})"/>`).join('')}</g><circle r="${r}"/></g>`;
  const moon=(x,y,r)=>`<g class="wmoon${A}" transform="translate(${x} ${y})"><path d="M${r*.35} ${-r}a${r} ${r} 0 1 0 ${r*.65} ${r*1.55}a${r*.82} ${r*.82} 0 1 1 ${-r*.65} ${-r*1.55}z"/></g><g class="wstars${A}"><circle cx="16" cy="14" r="1.6"/><circle cx="58" cy="10" r="1.3"/><circle cx="66" cy="34" r="1.1"/></g>`;
  const cloud=(x,y,sc,cls='')=>`<g class="wcloud ${cls}${A}" transform="translate(${x} ${y}) scale(${sc})"><path d="M-22 10h40a13 13 0 0 0 0-26 18 18 0 0 0-34-4 12 12 0 0 0-6 30z"/></g>`;
  const drops=(n,cls)=>`<g class="${cls}${A}">${Array.from({length:n},(_,i)=>`<line x1="${30+i*9}" y1="58" x2="${27+i*9}" y2="66" style="animation-delay:${(i*.23).toFixed(2)}s"/>`).join('')}</g>`;
  const flakes=`<g class="wsnow${A}">${[0,1,2,3].map(i=>`<circle cx="${30+i*9}" cy="60" r="2" style="animation-delay:${(i*.35).toFixed(2)}s"/>`).join('')}</g>`;
  const fogl=`<g class="wfog${A}"><line x1="16" y1="58" x2="62" y2="58"/><line x1="22" y1="66" x2="70" y2="66" style="animation-delay:.8s"/></g>`;
  const bolt=`<path class="wbolt${A}" d="M44 52l-8 12h7l-4 10 11-14h-7l5-8z"/>`;
  const so=day?sun:moon;let g='';
  switch(kind){case'clear':g=day?sun(40,40,14):moon(40,40,15);break;
    case'partly':g=so(30,30,11)+cloud(46,46,.95);break;
    case'cloudy':g=cloud(32,36,.75,'wback')+cloud(46,46,1);break;
    case'fog':g=cloud(42,40,.95,'wback')+fogl;break;
    case'drizzle':g=cloud(42,42,1)+drops(3,'wrain small');break;
    case'rain':g=cloud(42,42,1,'wdark')+drops(4,'wrain');break;
    case'showers':g=so(28,26,9)+cloud(44,42,1)+drops(3,'wrain');break;
    case'snow':g=cloud(42,42,1)+flakes;break;
    case'storm':g=cloud(42,40,1.05,'wdark')+bolt+drops(2,'wrain');break}
  return`<svg class="wxi" viewBox="0 0 80 80" aria-hidden="true">${g}</svg>`}
function weatherHero(){if(!wx)return'';const cur=wx.cur,kind=cur&&cur.code!=null?wxKind(cur.code):null,day=cur?cur.isDay:true;
  const t=wx.now&&wx.now.t!=null?wx.now.t:cur?cur.t:null;if(t==null&&!kind)return wx.err||wx.fcErr?`<div class="wxhero"><span class="note">${esc(wx.err||wx.fcErr)}</span></div>`:'';
  const frosty=wx.night!=null&&wx.night<=2,rainToday=wx.now&&wx.now.rain!=null?wx.now.rain:null;
  const bits=[wx.night!=null?`<span class="${frosty?'wfrost':''}">Nuit ${num(wx.night,1)} °C${frosty?' · gel possible':''}</span>`:'',rainToday!=null?`<span>Pluie ${num(rainToday,1)} mm</span>`:'',wx.now&&wx.now.h!=null?`<span>${wx.now.h} %</span>`:'',(cur&&cur.wind!=null)?`<span>Vent ${num(cur.wind,0)} km/h</span>`:''].filter(Boolean).join('');
  return`<button class="wxhero ${kind||'cloudy'}${day?'':' night'}" data-tgo="weather" aria-label="Voir la météo détaillée">
    <div class="wxmain">${kind?wxIcon(kind,day,true):''}<div class="wxt"><span class="wxdeg">${t!=null?num(t,1):'–'}<small>°C</small></span><span class="wxlbl">${kind?WX_TXT[kind]:''}${wx.now?' · <span class="note">station '+esc(wx.id||'')+'</span>':''}</span></div></div>
    ${bits?`<div class="wxbits">${bits}</div>`:''}
    ${wx.fc?`<div class="wxdays">${wx.fc.slice(0,5).map((f,i)=>`<div class="wxd"><span>${i===0?'Auj.':esc((f.dow||'').slice(0,3))}</span>${f.code!=null?wxIcon(wxKind(f.code),true,false):''}<b>${f.max!=null?num(f.max,0):'–'}°</b><span class="note">${f.min!=null?num(f.min,0):'–'}°</span></div>`).join('')}</div>`:''}
  </button>`}
/* ---- page Eau & météo : détail des conditions, 24 h, 7 jours, conseils potager ---- */
const dirTxt=d=>d==null?'':['N','NE','E','SE','S','SO','O','NO'][Math.round(((+d%360)+360)%360/45)%8];
const hm=t=>t?(+t.slice(11,13))+'h'+t.slice(14,16):'–';
const DOWF={dim:'dimanche',lun:'lundi',mar:'mardi',mer:'mercredi',jeu:'jeudi',ven:'vendredi',sam:'samedi'};
const durTxt=s=>{if(s==null)return'–';const m=Math.round(s/60);return Math.floor(m/60)+' h '+String(m%60).padStart(2,'0')};
function wxAdvice(){const A=[],cur=wx.cur||{},n=wx.now||{},fc=wx.fc||[],H=wx.hours||[];
  const t=n.t!=null?n.t:cur.t,h=n.h!=null?n.h:cur.h;
  if(wx.soil!=null){const sl=wx.soil,v=num(sl,0);
    if(FLW())A.push({k:'soil',txt:sl<5?`Sol à ${v} °C : trop froid pour semer ; les bulbes de printemps peuvent encore se planter tant que le sol n'est pas gelé.`:sl<10?`Sol à ${v} °C : idéal pour planter tulipes, narcisses et vivaces ; trop froid pour semer.`:sl<15?`Sol à ${v} °C : bleuets, nigelles, soucis et pois de senteur lèvent ; attends pour cosmos, zinnias et dahlias.`:`Sol à ${v} °C : assez chaud pour semer cosmos, zinnias et tournesols, et mettre en place dahlias et cannas.`});
    else A.push({k:'soil',txt:sl<5?`Sol à ${v} °C : trop froid, rien ne germe en pleine terre.`:sl<8?`Sol à ${v} °C : seuls fèves, pois, épinards et radis lèvent encore.`:sl<12?`Sol à ${v} °C : carottes, laitues, betteraves et oignons lèvent ; trop froid pour haricots et courges.`:`Sol à ${v} °C : assez chaud même pour haricots, courges et maïs.`})}
  if(wx.past){const b=wx.past.rain-wx.past.et0;
    if(b<=-8)A.push({k:'dry',txt:`Sol qui sèche : ${num(-b,0)} mm évaporés de plus que tombés sur 7 jours. Arrosage utile en plein air.`});
    else if(b>=10)A.push({k:'wet',txt:`Sol bien humide : ${num(b,0)} mm de pluie de plus que l'évaporation sur 7 jours. Pas besoin d'arroser en plein air.`});
    else A.push({k:'ok',txt:`Pluie et évaporation à peu près à l'équilibre sur 7 jours.`})}
  const nr=fc.findIndex((f,i)=>i>0&&(f.mm||0)>=1);
  if(fc.length){if((fc[0].mm||0)>=1)A.push({k:'rain',txt:`Pluie aujourd'hui : ${num(fc[0].mm,1)} mm prévus.`});
    else if(nr<0)A.push({k:'dry',txt:'Pas de pluie notable prévue cette semaine.'});
    else A.push({k:'rain',txt:`Prochaine pluie : ${nr===1?'demain':DOWF[fc[nr].dow]||fc[nr].dow} (${num(fc[nr].mm,1)} mm).`})}
  const g=Math.max(...fc.slice(0,2).map(f=>f.gust||0));if(g>=50)A.push({k:'wind',txt:`Rafales jusqu'à ${num(g,0)} km/h d'ici demain : vérifie voiles, tuteurs et portes de serre.`});
  const hot=fc.slice(0,3).find(f=>(f.max||0)>=28);if(hot)A.push({k:'hot',txt:`Chaleur ${hot===fc[0]?"aujourd'hui":DOWF[hot.dow]||hot.dow} (${num(hot.max,0)} °C) : arrose tôt le matin et aère la serre.`});
  if(h!=null&&h>=85&&t!=null&&t>=10&&t<=25&&wx.past&&wx.past.rain>=5){if(FLW()){const inP=new Set();plantables().forEach(o=>o.zones.forEach(z=>{if(z.crop&&Object.keys(z.cells).length)inP.add(z.crop)}));
      const sens=[...new Set(FL_PESTS.filter(x=>/Oïdium|Botrytis|taches noires|Rouille/.test(x.n)).flatMap(x=>x.c))].filter(c=>inP.has(c)).map(c=>P[c].n.toLowerCase());
      A.push({k:'mold',txt:`Douceur et humidité : risque d'oïdium, de botrytis et de taches noires.${sens.length?' Surveille '+sens.slice(0,5).join(', ')+'.':' Aère les massifs et arrose au pied.'}`})}
    else A.push({k:'mold',txt:'Douceur et humidité : conditions favorables au mildiou. Surveille tomates et pommes de terre.'})}
  /* fenêtre de traitement : jour, vent ≤ 15 km/h, 5–25 °C, pas de pluie pendant 6 h */
  const okH=i=>{const x=H[i];return x&&x.day&&(x.wind||0)<=15&&x.temp>=5&&x.temp<=25&&(x.pp||0)<40&&(x.mm||0)<.1&&H.slice(i,i+6).every(y=>(y.mm||0)<.2)};
  let st=-1,len=0;for(let i=0;i<H.length;i++){if(okH(i)){if(st<0)st=i;len++;if(len>=3)break}else{st=-1;len=0}}
  if(st>=0&&len>=3){const d0=H[st].t.slice(0,10)===iso(TODAY);A.push({k:'treat',txt:`Fenêtre de traitement : ${st===0?'maintenant':(d0?"aujourd'hui":'demain')+' dès '+(+H[st].t.slice(11,13))+' h'} (vent faible, sec 6 h après).`})}
  else if(H.length)A.push({k:'notreat',txt:'Pas de bonne fenêtre de traitement dans les 24 h (vent, pluie ou nuit).'});
  return A}
const ADV_C={soil:'var(--wood)',dry:'var(--sun)',wet:'var(--water)',ok:'var(--ok)',rain:'var(--water)',wind:'var(--muted)',hot:'var(--danger)',mold:'var(--danger)',treat:'var(--ok)',notreat:'var(--muted)'};
function weatherPanel(){const hasKey=!!WU.get().key;
  const head=`<div class="row between"><h2>Météo</h2><button class="btn small" data-wact="wusync">${wxBusy?'…':'Actualiser'}</button></div>${GEO()?'':`<div class="alert amber"><span>Météo de Bruxelles par défaut. <button class="linkbtn" data-wact="geo">Indique le lieu de ton ${FLW()?'jardin':'potager'}</button></span></div>`}`;
  const link=hasKey?'':`<div class="row between" style="gap:8px"><span class="note">Relie ta station Weather Underground pour des mesures sur place et la pluie notée toute seule.</span><button class="btn small" data-wact="wuconf">Relier</button></div>`;
  if(!wx)return head+`<div class="tcard"><span class="note">Lecture de la météo…</span></div>`+link;
  const cur=wx.cur||{},n=wx.now||{},fc=wx.fc||[],f0=fc[0]||{},kind=cur.code!=null?wxKind(cur.code):null,day=cur.isDay!==false;
  const pick=(a,b)=>a!=null?a:b,t=pick(n.t,cur.t),feel=pick(n.feel,cur.feel),h=pick(n.h,cur.h),wind=pick(n.wind,cur.wind),gust=pick(n.gust,cur.gust),dir=pick(n.dir,cur.dir),pr=pick(n.p,cur.p),uv=pick(n.uv,f0.uv);
  const errs=[wx.err?'Station : '+wx.err:'',wx.fcErr||''].filter(Boolean).map(e=>`<span class="note" style="color:var(--danger)">${esc(e)}</span>`).join('');
  if(t==null&&!kind&&!fc.length)return head+`<div class="tcard">${errs||'<span class="note">Pas de données météo.</span>'}</div>`+link;
  const tile=(l,v,s='')=>v==null||v===''?'':`<div class="wxtile"><span>${l}</span><b>${v}</b>${s?`<small>${s}</small>`:''}</div>`;
  const ago=n.time?Math.round((Date.now()-new Date(n.time.replace(' ','T')).getTime())/60000):null;
  const src=[wx.now?`station ${esc(wx.id||'')}${ago!=null&&ago>=0&&ago<600?`, il y a ${ago<1?'moins d\'1':ago} min`:''}`:'',fc.length?'prévisions Open-Meteo':''].filter(Boolean).join(' · ');
  const nowCard=`<div class="wxhero ${kind||'cloudy'}${day?'':' night'}">
    <div class="wxmain">${kind?wxIcon(kind,day,true):''}<div class="wxt"><span class="wxdeg">${t!=null?num(t,1):'–'}<small>°C</small></span><span class="wxlbl">${kind?WX_TXT[kind]:''}${feel!=null&&t!=null&&Math.abs(feel-t)>=1?` · <span class="note">ressenti ${num(feel,0)} °C</span>`:''}</span>${f0.min!=null?`<span class="note">Aujourd'hui ${num(f0.min,0)}° / ${num(f0.max,0)}°</span>`:''}</div></div>
    <div class="wxgrid">${tile('Humidité',h!=null?Math.round(h)+' %':null)}${tile('Point de rosée',n.dew!=null?num(n.dew,1)+' °C':null)}${tile('Vent',wind!=null?num(wind,0)+' km/h':null,[dirTxt(dir),gust!=null?'rafales '+num(gust,0):''].filter(Boolean).join(' · '))}${tile('Pression',pr!=null?num(pr,0)+' hPa':null)}${tile('Pluie auj.',n.rain!=null?num(n.rain,1)+' mm':f0.mm!=null?num(f0.mm,1)+' mm':null,n.rate?num(n.rate,1)+' mm/h en ce moment':n.rain==null&&f0.mm!=null?'prévu':'')}${tile('UV',uv!=null?num(uv,0):null,uv==null?'':uv<3?'faible':uv<6?'modéré':uv<8?'élevé':'très élevé')}${tile('Soleil',f0.rise?hm(f0.rise)+' – '+hm(f0.set):null,f0.dayLen!=null?'jour '+durTxt(f0.dayLen):'')}${tile('Ensoleillement',f0.sunH!=null?num(f0.sunH/3600,1)+' h':null,'prévu aujourd\'hui')}</div>
    ${src?`<span class="note">${src}</span>`:''}${errs}</div>`;
  const H=(wx.hours||[]).filter((_,i)=>i%1===0).slice(0,25);
  const hours=H.length?`<div class="stack"><span class="lbl">Prochaines 24 h</span><div class="wxhours">${H.map((x,i)=>`<div class="wxh${x.t.slice(11,13)==='00'&&i?' mid':''}"><span>${i===0?'Maint.':x.t.slice(11,13)+'h'}</span>${x.code!=null?wxIcon(wxKind(x.code),x.day,false):''}<b>${x.temp!=null?num(x.temp,0)+'°':'–'}</b><small class="${(x.pp||0)>=30?'wet':''}">${(x.pp||0)>=10?x.pp+' %':''}</small></div>`).join('')}</div></div>`:'';
  const lo=Math.min(...fc.map(f=>f.min??99)),hi=Math.max(...fc.map(f=>f.max??-99)),sp=Math.max(1,hi-lo);
  const week=fc.length?`<div class="stack"><span class="lbl">7 jours</span><div class="wxweek">${fc.map((f,i)=>`<div class="wxw"><b>${i===0?'Auj.':i===1?'Dem.':esc(f.dow)}</b>${f.code!=null?wxIcon(wxKind(f.code),true,false):'<span></span>'}<span class="mono note">${f.min!=null?num(f.min,0)+'°':''}</span><span class="wxbar"><i style="left:${(((f.min??lo)-lo)/sp*100).toFixed(1)}%;right:${((hi-(f.max??hi))/sp*100).toFixed(1)}%"></i></span><span class="mono">${f.max!=null?num(f.max,0)+'°':''}</span><span class="wxr${(f.mm||0)>=1?' wet':''}">${(f.mm||0)>=.1?num(f.mm,1)+' mm':'–'}${f.pp!=null&&f.pp>=20?`<small>${f.pp} %</small>`:''}</span><span class="wxv">${f.wind!=null?num(f.wind,0):''}<small>${f.gust!=null&&f.gust>=40?'raf. '+num(f.gust,0):'km/h'}</small></span></div>`).join('')}</div></div>`:'';
  const p=wx.past,bal=p?p.rain-p.et0:null,rain7=fc.reduce((a,f)=>a+(+f.mm||0),0);
  const stats=`<div class="stats">${wx.soil!=null?`<div class="stat"><span class="lbl">Sol à 6 cm</span><span class="v">${num(wx.soil,1)} <small>°C</small></span></div>`:''}${f0.et0!=null?`<div class="stat"><span class="lbl">Évaporation auj.</span><span class="v">${num(f0.et0,1)} <small>mm</small></span></div>`:''}${bal!=null?`<div class="stat"><span class="lbl">Bilan 7 derniers j</span><span class="v" style="color:${bal<-8?'var(--sun)':bal>10?'var(--water)':'inherit'}">${bal>=.5?'+':''}${num(bal,0)} <small>mm</small></span><span class="note">pluie ${num(p.rain,0)} − évap. ${num(p.et0,0)}</span></div>`:''}${fc.length?`<div class="stat"><span class="lbl">Pluie prévue 7 j</span><span class="v">${num(rain7,0)} <small>mm</small></span></div>`:''}</div>`;
  const adv=wxAdvice();
  const garden=`<div class="stack"><span class="lbl">${FLW()?'Pour le jardin':'Pour le potager'}</span>${stats}${adv.length?`<div class="wxadv">${adv.map(a=>`<div><i style="background:${ADV_C[a.k]||'var(--muted)'}"></i><span>${a.txt}</span></div>`).join('')}</div>`:''}</div>`;
  return head+nowCard+hours+week+garden+link}
addEventListener('visibilitychange',()=>{if(!document.hidden&&(!wx||Date.now()-wx.at>30*60000))syncStation(false)});


