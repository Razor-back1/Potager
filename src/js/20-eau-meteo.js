/* ================= Eau & météo ================= */
function frostPeriod(d){const m=d.getMonth()+1,dd=d.getDate();
  if(m>=11||m<=3)return{lvl:2,txt:'Gel probable la nuit'};
  if(m===10)return{lvl:1,txt:'Premières gelées possibles (souvent mi-octobre en Hesbaye)'};
  if(m===4||(m===5&&dd<=15))return{lvl:1,txt:'Gelées tardives possibles jusqu\'aux Saints de glace (11–13 mai)'};
  return{lvl:0,txt:'Pas de gel attendu à cette période'}}
function cultivated(){let a=0;const per=[];plantables().forEach(o=>{let ao=0;o.zones.forEach(z=>{if(z.crop&&Object.keys(z.cells).length)ao+=zoneArea(o,z)});if(ao){a+=ao;per.push({o,a:ao})}});return{a,per}}
let rainForm=false;
function renderWeather(){
  const fp=frostPeriod(TODAY),mo=TODAY.getMonth();
  const sens=[];plantables().forEach(o=>o.zones.forEach(z=>{if(z.crop&&FROST_SENSITIVE.has(z.crop)&&Object.keys(z.cells).length)sens.push({o,z})}));
  const fr=S.frost&&S.frost.d===iso(TODAY)?S.frost.t:'',frSrc=S.frost&&S.frost.d===iso(TODAY)&&S.frost.src==='station';
  const danger=fr!==''&&+fr<=2;
  let frost=`<div class="alert ${danger?'':'frost'}"><span><b>${fp.txt}.</b> ${sens.length?`${sens.length} ${FLW()?'plante':'culture'}${sens.length>1?'s':''} sensible${sens.length>1?'s':''} en place.`:FLW()?'Aucune plante gélive en place.':'Aucune culture sensible en place.'}</span>
    ${danger&&sens.length?`<span>Minimum prévu ${num(fr)} °C : ${FLW()?'couvre, rentre ou arrache':'couvre ou rentre'} ${sens.map(s=>`<b>${P[s.z.crop].n.toLowerCase()}</b> (${esc(fullName(s.o))}${serreOf(s.o)?', serre non chauffée':''})`).join(', ')} ce soir. Un voile d'hivernage P30 gagne environ 2 à 4 °C.</span>`:''}
    ${fr!==''&&!danger?`<span>Minimum prévu ${num(fr)} °C : pas de protection nécessaire cette nuit.</span>`:''}</div>
    ${sens.length?`<div class="chips">${sens.map(s=>`<span class="chip">${ci((P[s.z.crop]).id)}${P[s.z.crop].n} · ${esc(fullName(s.o))}</span>`).join('')}</div>`:''}
    <label class="field" style="max-width:260px"><span class="lbl">Minimum prévu cette nuit (°C)${frSrc?' · prévision automatique':''}</span><input id="w-tmin" type="number" step="0.5" value="${fr}" placeholder="selon ta météo"></label>`;
  const tc=tankCap();if(tc){S.water.cap=tc.cap;if(S.water.level>tc.cap)S.water.level=tc.cap}
  const w=S.water,cu=cultivated(),eff=.85;
  const collect=RAIN.map(mm=>w.roof*mm*eff),need=NEED.map(n=>cu.a*n*30/7);
  const wkC=collect[mo]/30*7,wkN=cu.a*NEED[mo],bal=wkC-wkN;
  const auto=bal<0?Math.floor(w.level/(-bal/7)):null;
  /* graphique : 12 mois, deux séries */
  const max=Math.max(...collect,...need,1),nice=Math.ceil(max/500)*500||500,Wc=360,Hc=180,pl=40,pb=20,bw=(Wc-pl)/12;
  let ch=`<svg class="chart" viewBox="0 0 ${Wc} ${Hc+pb}" role="img" aria-label="Pluie récupérée et besoin d'arrosage par mois">`;
  for(let i=0;i<=4;i++){const v=nice*i/4,y=Hc-v/nice*(Hc-10);ch+=`<line class="gl" x1="${pl}" x2="${Wc}" y1="${y}" y2="${y}"/><text class="ax" x="${pl-6}" y="${y+3}" text-anchor="end">${v>=1000?num(v/1000)+' k':Math.round(v)}</text>`}
  collect.forEach((c,i)=>{const x=pl+i*bw,h1=c/nice*(Hc-10),h2=need[i]/nice*(Hc-10);
    ch+=`<rect class="b1" x="${x+bw*.12}" y="${Hc-h1}" width="${bw*.36}" height="${h1}" rx="1.5"/><rect class="b2" x="${x+bw*.52}" y="${Hc-h2}" width="${bw*.36}" height="${h2}" rx="1.5"/><text class="ax" x="${x+bw/2}" y="${Hc+14}" text-anchor="middle" ${i===mo?'style="font-weight:600;fill:var(--ink)"':''}>${MSHORT[i]}</text>`});
  ch+=`</svg>`;
  
  $('#v-weather').innerHTML=`<div class="page">
   ${weatherPanel()}
   <h2>Gel</h2>${frost}
   <p class="note">Les seuils viennent du calendrier climatique de la Hesbaye. Le minimum de la nuit se remplit tout seul avec les prévisions.</p>
   <h2>Pluie</h2>
   ${rainForm?`<div class="panel rainform"><label class="field"><span class="lbl">Quantité tombée aujourd'hui (mm)</span><input id="r-mm" type="number" min="0" step="0.5" inputmode="decimal" placeholder="facultatif"></label>
     <div class="row"><button class="btn primary" data-wact="rain">Noter la pluie</button><button class="btn" data-wact="rain-cancel">Annuler</button></div></div>`
   :`<button class="btn primary" data-wact="rain-open" style="justify-self:start">Il a plu aujourd'hui</button>`}
   ${(S.rain||[]).length?`<div class="jlist">${S.rain.slice(0,6).map(r=>`<div class="jent"><span class="d">${fdate(parse(r.d))}</span><div>${r.mm!=null?`<span class="mono">${num(r.mm)} mm</span>`:'Pluie'}${r.src==='station'?' <span class="note">· station</span>':''}${r.mm!=null&&r.mm<RAIN_MIN?' <span class="note">· trop faible pour compter comme arrosage</span>':''}</div><button class="del" data-wact="rdel" data-id="${r.id}" aria-label="Supprimer">×</button></div>`).join('')}</div>`:'<p class="note">Aucune pluie notée.</p>'}
   <p class="note">Une pluie de ${RAIN_MIN} mm ou plus, ou sans quantité, compte comme un arrosage pour les planches en plein air. Avec la station reliée, la pluie se note toute seule.</p>
   <h2>Arrosage automatique</h2>
   ${autoCard(false)}
   <h2>Eau</h2>
   <div class="grid3"><label class="field"><span class="lbl">Toit raccordé (m²)</span><input id="w-roof" type="number" min="0" step="1" value="${w.roof}"></label>
   ${tc?`<div class="field"><span class="lbl">Capacité (L)</span><span class="mono" style="padding-top:9px">${num(tc.cap,0)} L</span><span class="note">calculée sur ${tc.n} cuve${tc.n>1?'s':''} et citerne${tc.n>1?'s':''} du plan</span></div>`:`<label class="field"><span class="lbl">Capacité cuve (L)</span><input id="w-cap" type="number" min="0" step="100" value="${w.cap}"></label>`}
   <label class="field"><span class="lbl">Niveau actuel (L)</span><input id="w-level" type="number" min="0" max="${w.cap}" step="50" value="${w.level}"></label></div>
   <div class="stats"><div class="stat"><span class="lbl">Surface cultivée</span><span class="v">${num(cu.a)} <small>m²</small></span></div>
   <div class="stat"><span class="lbl">Récupéré / sem. (${MONTHS[mo]})</span><span class="v">${num(wkC,0)} <small>L</small></span></div>
   <div class="stat"><span class="lbl">Besoin / sem.</span><span class="v">${num(wkN,0)} <small>L</small></span></div>
   <div class="stat"><span class="lbl">Autonomie cuve</span><span class="v">${auto==null?'∞':auto} <small>${auto==null?'':'jours'}</small></span></div></div>
   <p class="note">${auto==null?'La pluie récupérée couvre le besoin estimé ce mois-ci.':`Au rythme moyen de ${MONTHS[mo]}, la cuve se vide en ${auto} jours sans pluie supplémentaire.`} Niveau : ${Math.round(w.level/Math.max(1,w.cap)*100)} % de ${num(w.cap,0)} L.</p>
   <div><div class="section-t"><span class="lbl">Litres par mois</span><span class="legend"><span><i style="background:var(--water)"></i>Pluie récupérée</span><span><i style="background:var(--sun)"></i>Besoin d'arrosage</span></span></div>${ch}</div>
   ${cu.per.length?`<div class="stack"><span class="lbl">Arrosage indicatif cette semaine</span><div class="hvlist">${cu.per.map(x=>{const lw=lastWater(x.o),th=thirsty(x.o);return`<button class="hv" data-open="${x.o.id}" data-zi="0"><span class="dot" style="background:var(--water)"></span><span><span class="t">${esc(fullName(x.o))}</span> <span class="s">· ${num(x.a)} m² cultivés</span><span class="s" style="display:block${th?';color:var(--water);font-weight:700':''}">${waterText(lw)}${th?' · à arroser':''}</span></span><span class="due">${num(x.a*NEED[mo],0)} L</span></button>`}).join('')}</div></div>`:''}
   <p class="note">Pluie : moyennes mensuelles régionales, rendement de toiture 85 %. Besoin : 0 à 20 L/m² par semaine selon le mois. Les capteurs d'humidité et la station météo remplaceront ces moyennes par tes mesures.</p>
  </div>`;
}
$('#v-weather').addEventListener('change',e=>{const t=e.target,v=parseFloat(t.value);
  if(t.id==='w-tmin'){S.frost=t.value===''?null:{t:v,d:iso(TODAY)};save();renderWeather()}
  if(['w-roof','w-cap','w-level'].includes(t.id)&&!isNaN(v)){S.water[t.id.slice(2)]=Math.max(0,v);if(S.water.level>S.water.cap)S.water.level=S.water.cap;save();renderWeather()}});
$('#v-weather').addEventListener('click',e=>{const wa=e.target.closest('[data-wact]');
  if(wa&&wa.dataset.wact==='wusync'){syncStation(true);return}
  if(wa&&wa.dataset.wact==='auto'){openAuto();return}
  if(wa&&wa.dataset.wact==='geo'){setTab('plan');selId=null;sheetMode='geo';renderSheet();return}
  if(wa&&wa.dataset.wact==='wuconf'){setTab('plan');sheetMode='wu';selId=null;renderSheet();return}
  if(wa&&wa.dataset.wact==='rain-open'){rainForm=true;renderWeather();const i=$('#r-mm');if(i)i.focus();return}
  if(wa&&wa.dataset.wact==='rain-cancel'){rainForm=false;renderWeather();return}
  if(wa&&wa.dataset.wact==='rain'){const v=parseFloat(String($('#r-mm').value).replace(',','.'));addRain(isNaN(v)?null:v);rainForm=false;save();renderWeather();return toast('Pluie notée',true)}
  if(wa&&wa.dataset.wact==='rdel'){S.rain=S.rain.filter(r=>r.id!==wa.dataset.id);save();renderWeather();return toast('Pluie supprimée',true)}
  const b=e.target.closest('[data-open]');if(b)openBed(b.dataset.open,0)});

