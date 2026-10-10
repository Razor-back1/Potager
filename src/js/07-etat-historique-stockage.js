/* ================= État, historique, stockage ================= */
const KEY='atelier-potager-v1',KEYAT='atelier-potager-at';
/* plusieurs potagers : « main » garde les anciennes clés, les autres ont leur propre clé */
const GL={get(){try{const v=JSON.parse(localStorage.getItem('atelier-potager-list'));if(v&&Array.isArray(v.list)&&v.list.length)return v}catch(e){}return{cur:'main',list:[{id:'main',name:''}]}},set(v){try{localStorage.setItem('atelier-potager-list',JSON.stringify(v))}catch(e){}}};
let GID=GL.get().cur;if(!GL.get().list.some(g=>g.id===GID))GID=GL.get().list[0].id;
const keyOf=id=>id==='main'?KEY:KEY+':'+id,keyAtOf=id=>id==='main'?KEYAT:KEYAT+':'+id;
let localAt=0;try{localAt=+localStorage.getItem(keyAtOf(GID))||0}catch(e){}
function load(){try{return migrate(JSON.parse(localStorage.getItem(keyOf(GID))))}catch(e){return null}}
let past=[],future=[],lastJSON='',lastPush=0;
/* l'historique d'annulation survit à la fermeture de l'app (iOS recharge souvent les apps en arrière-plan) */
const undoKey=()=>'atelier-potager-undo:'+GID;
let undoT=null;function saveUndo(){clearTimeout(undoT);undoT=setTimeout(()=>{try{let p=past.slice(-15),f=future.slice(-15);while(p.length&&JSON.stringify({p,f}).length>2e6)p=p.slice(1);localStorage.setItem(undoKey(),JSON.stringify({p,f,cur:lastJSON.length}))}catch(e){}},150)}
addEventListener('pagehide',()=>{if(undoT){clearTimeout(undoT);try{localStorage.setItem(undoKey(),JSON.stringify({p:past.slice(-15),f:future.slice(-15),cur:lastJSON.length}))}catch(e){}}});
function loadUndo(){try{const u=JSON.parse(localStorage.getItem(undoKey())),raw=localStorage.getItem(keyOf(GID))||'';if(u&&Array.isArray(u.p)&&u.cur===raw.length){past=u.p;future=u.f||[]}else{past=[];future=[]}}catch(e){past=[];future=[]}}
function persist(){try{localStorage.setItem(keyOf(GID),lastJSON);localStorage.setItem(keyAtOf(GID),String(localAt))}catch(e){}
  const g=GL.get(),it=g.list.find(x=>x.id===GID);if(it&&(it.name!==S.name||it.ex!==!!S.example)){it.name=S.name;it.ex=!!S.example;GL.set(g)}}
function switchGarden(id){if(id===GID)return;if(GID)persist();GID=id;const g=GL.get();g.cur=id;GL.set(g);
  try{localAt=+localStorage.getItem(keyAtOf(id))||0}catch(e){localAt=0}S=load()||sample();lastJSON=JSON.stringify(S);loadUndo();
  ctx=null;selId=null;sheetMode=null;editMode=false;shapeEdit=null;closeBed();closeInv();if(typeof closeAuto==='function')closeAuto();persist();
  if(typeof subscribeDoc==='function')subscribeDoc();fit();renderSheet();renderHeader();refresh();if(typeof updateModeUI==='function')updateModeUI()}
function addGarden(state,open=true){const id=uid(),g=GL.get();try{localStorage.setItem(keyOf(id),JSON.stringify(state));localStorage.setItem(keyAtOf(id),String(Date.now()))}catch(e){toast('Mémoire de l\'appareil pleine');return null}
  g.list.push({id,name:state.name,ex:!!state.example});GL.set(g);if(open)switchGarden(id);try{if(relayOn())setTimeout(()=>syncPush(id),300)}catch(e){}return id}
function deleteGarden(id){const g=GL.get();if(g.list.length<2)return;g.list=g.list.filter(x=>x.id!==id);GL.set(g);
  try{localStorage.removeItem(keyOf(id));localStorage.removeItem(keyAtOf(id))}catch(e){}try{if(relayOn())gReq('/garden?id='+encodeURIComponent(id),'DELETE').catch(()=>{})}catch(e){}if(id===GID){GID=null;switchGarden(g.list[0].id)}}
const emptyGarden=(name='Mon potager',kind)=>({v:8,kind:kind||undefined,shape:null,rain:[],stock:[],nursery:[],name,w:1200,h:800,north:0,water:{roof:40,cap:1000,level:500},frost:null,objs:[],example:false});
function save(coalesce){const j=JSON.stringify(S);if(j!==lastJSON){const now=Date.now();
  if(!(coalesce&&now-lastPush<1500&&past.length)){past.push(lastJSON);if(past.length>80)past.shift()}
  lastPush=coalesce?now:0;future=[];lastJSON=j;localAt=now;persist();schedulePush();syncPushSoon();saveUndo()}renderHeader()}
function restore(j){lastJSON=j;S=migrate(JSON.parse(j));localAt=Date.now();persist();schedulePush();syncPushSoon();if(selId&&!obj(selId)){selId=null;if(sheetMode==='obj')sheetMode=null}renderHeader();refresh()}
function undo(){if(!past.length)return;future.push(lastJSON);restore(past.pop());saveUndo();toast('Action annulée')}
function redo(){if(!future.length)return;past.push(lastJSON);restore(future.pop());saveUndo();toast('Action rétablie')}
let S=load()||sample();lastJSON=JSON.stringify(S);loadUndo();
let view={cx:S.w/2,cy:S.h/2,z:.3};
let selId=null,sheetMode=null,tab='plan',bed=null;
let shade={on:false,doy:doyOf(TODAY),hour:15};
let holdT=null,lifted=null,guides=null,liftGrp=null;
let shapeEdit=null,editMode=false;
/* forme du terrain : polygone libre ou rectangle G().w × G().h */
const rectPts=()=>[{x:0,y:0},{x:G().w,y:0},{x:G().w,y:G().h},{x:0,y:G().h}];
const terrainPts=()=>G().shape&&G().shape.length>=3?G().shape:rectPts();
const polyArea=pts=>{let a=0;pts.forEach((p,i)=>{const q=pts[(i+1)%pts.length];a+=p.x*q.y-q.x*p.y});return a/2};
/* garde le terrain en coordonnées positives : décale le terrain, les objets et la vue ensemble */
function normalizeShape(){if(!G().shape)return;const dx=-Math.min(...G().shape.map(p=>p.x)),dy=-Math.min(...G().shape.map(p=>p.y));if(!dx&&!dy)return;
  G().shape.forEach(p=>{p.x+=dx;p.y+=dy});G().objs.forEach(o=>{o.x+=dx;o.y+=dy});view.cx+=dx;view.cy+=dy}
function updateBox(){if(!G().shape)return;G().w=Math.max(100,...G().shape.map(p=>p.x));G().h=Math.max(100,...G().shape.map(p=>p.y))}
/* contexte : le potager (S) ou l'intérieur d'une serre */
let ctx=null;
function G(){if(ctx){const s=S.objs.find(o=>o.id===ctx);if(s&&s.type==='serre'){s.inner=s.inner||{objs:[]};s.inner.w=s.w;s.inner.h=s.h;s.inner.shape=null;return s.inner}ctx=null}return S}
const allObjs=()=>{const a=[...S.objs];S.objs.forEach(o=>{if(o.inner&&o.inner.objs)a.push(...o.inner.objs)});return a};
const serreOf=o=>S.objs.find(q=>q.inner&&q.inner.objs&&q.inner.objs.includes(o))||null;
const homeOf=o=>{const s=serreOf(o);return s?s.inner:S};
const fullName=o=>{const s=serreOf(o);return s?s.name+' › '+o.name:o.name};
const obj=id=>allObjs().find(o=>o.id===id);
/* hors mode édition, seuls ces objets se sélectionnent ; le reste laisse glisser la carte */
const PICKABLE=new Set(['planche','bac','serre','abri']);
const plantables=()=>allObjs().filter(o=>TYPES[o.type]&&TYPES[o.type].plant);
/* blocs : des objets qui bougent et tournent ensemble (série de planches et ses allées) */
const grpOf=o=>o&&o.grp?G().objs.filter(q=>q.grp===o.grp):null;
const grpMembers=o=>{const m=grpOf(o);return m&&m.length>1?m:null};
function grpFrame(ms,rot){/* boîte du bloc dans son propre repère (tourné de rot) */
  const pts=ms.flatMap(basePts),c0={x:pts.reduce((a,p)=>a+p.x,0)/pts.length,y:pts.reduce((a,p)=>a+p.y,0)/pts.length},a=-rot*Math.PI/180,co=Math.cos(a),si=Math.sin(a);
  const loc=pts.map(p=>({x:(p.x-c0.x)*co-(p.y-c0.y)*si,y:(p.x-c0.x)*si+(p.y-c0.y)*co})),x0=Math.min(...loc.map(p=>p.x)),x1=Math.max(...loc.map(p=>p.x)),y0=Math.min(...loc.map(p=>p.y)),y1=Math.max(...loc.map(p=>p.y));
  const mx=(x0+x1)/2,my=(y0+y1)/2,b=rot*Math.PI/180;return{cx:c0.x+mx*Math.cos(b)-my*Math.sin(b),cy:c0.y+mx*Math.sin(b)+my*Math.cos(b),w:x1-x0,h:y1-y0}}
function rotateMembers(st,c,delta){const a=delta*Math.PI/180,co=Math.cos(a),si=Math.sin(a);
  st.forEach(({o,x,y,rot})=>{const ox=x+o.w/2-c.x,oy=y+o.h/2-c.y;o.x=Math.round(c.x+ox*co-oy*si-o.w/2);o.y=Math.round(c.y+ox*si+oy*co-o.h/2);o.rot=(((rot+delta)%360)+360)%360})}

