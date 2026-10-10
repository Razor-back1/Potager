/* ================= En-tête, onglets, toast ================= */
function renderHeader(){setCatalog();$('#gInfo').textContent=`${S.name} · ${m2(S.w)} × ${m2(S.h)} m`;$('#gPill span').textContent=S.name;$('#exPill').hidden=!S.example;$('#undoBtnH').disabled=!past.length;$('#redoBtnH').disabled=!future.length;
  $('#needle').setAttribute('transform',`rotate(${S.north})`)}
$('#undoBtnH').onclick=undo;$('#redoBtnH').onclick=redo;
addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();e.shiftKey?redo():undo()}});
/* toucher l'onglet déjà ouvert : ferme la planche ou l'abri ouvert, sinon remonte en haut (ou recentre le plan) */
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{const t=b.dataset.tab;
  if(t!==tab)return setTab(t);
  if(inv||bed||auto){closeInv();closeBed();closeAuto();refresh();return}
  if(t==='plan'){sheetMode=null;selId=null;shapeEdit=null;if(ctx){ctx=null;renderCtxbar();renderSunbar()}renderSheet();renderShapebar();fit();return}
  const v=$('#v-'+t);if(v)v.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})});
function setTab(t){tab=t;closeBed();closeInv();closeAuto();if(q)closeQ();setTimeout(updateNoteBtn);document.querySelectorAll('.tabs button').forEach(b=>{if(b.dataset.tab===t)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  ['today','plan','harvest','weather','crops'].forEach(v=>$('#v-'+v).hidden=v!==t);refresh()}
let toastT;
function toast(msg,canUndo){clearTimeout(toastT);const el=$('#toast');
  el.innerHTML=`${canUndo?'<svg class="tchk" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M7 12.5l3.3 3.3L17 9"/></svg>':''}<span>${esc(msg)}</span>${canUndo?'<button id="undoBtn">Annuler</button>':''}`;el.hidden=false;el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');
  if(canUndo)$('#undoBtn').onclick=()=>{el.hidden=true;undo()};
  toastT=setTimeout(()=>el.hidden=true,4500);}
function refresh(){setCatalog();if(inv)renderInv();if(bed)renderBed();if(tab==='plan'){renderPlan();renderSheet();renderSunbar();renderShapebar();renderCtxbar()}else{$('#shapebar').hidden=true;$('#ctxbar').hidden=true}if(tab==='harvest')renderHarvest();if(tab==='weather')renderWeather();if(tab==='crops')renderCrops();if(tab==='today')renderToday()}

