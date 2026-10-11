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
  const g=GL.get(),it=g.list.find(x=>x.id===GID);const k=S.kind||'potager';if(it&&(it.name!==S.name||it.ex!==!!S.example||it.k!==k)){it.name=S.name;it.ex=!!S.example;it.k=k;GL.set(g)}}
function switchGarden(id){if(id===GID)return;if(GID)persist();GID=id;const g=GL.get();g.cur=id;GL.set(g);
  try{localAt=+localStorage.getItem(keyAtOf(id))||0}catch(e){localAt=0}S=load()||sample();lastJSON=JSON.stringify(S);loadUndo();
  ctx=null;selId=null;sheetMode=null;editMode=false;shapeEdit=null;closeBed();closeInv();if(typeof closeAuto==='function')closeAuto();persist();
  if(typeof subscribeDoc==='function')subscribeDoc();fit();renderSheet();renderHeader();refresh();if(typeof updateModeUI==='function')updateModeUI()}
function addGarden(state,open=true){const id=uid(),g=GL.get();try{localStorage.setItem(keyOf(id),JSON.stringify(state));localStorage.setItem(keyAtOf(id),String(Date.now()))}catch(e){toast('Mémoire de l\'appareil pleine');return null}
  g.list.push({id,name:state.name,ex:!!state.example,k:state.kind||'potager'});GL.set(g);if(open)switchGarden(id);try{if(relayOn())setTimeout(()=>syncPush(id),300)}catch(e){}return id}
function deleteGarden(id){const g=GL.get();if(g.list.length<2||id===PROP_ID)return;const dk=(g.list.find(x=>x.id===id)||{}).k;g.list=g.list.filter(x=>x.id!==id);GL.set(g);
  try{localStorage.removeItem(keyOf(id));localStorage.removeItem(keyAtOf(id))}catch(e){}try{if(relayOn())gReq('/garden?id='+encodeURIComponent(id),'DELETE').catch(()=>{})}catch(e){}if(id===GID){GID=null;switchGarden((g.list.find(x=>x.k===dk&&x.id!==PROP_ID)||g.list[0]).id)}}
/* variantes pour comparer des plans : même terrain (forme, orientation, lieu) et mêmes éléments fixes, ou copie complète */
const FIXED_TYPES=new Set(['etang','arbre','haie','cloture']);
function gardenVariant(full){const c=JSON.parse(JSON.stringify(S)),base=S.name.replace(/ · (variante|copie) \d+$/,'');
  const n=GL.get().list.filter(g=>g.name===base||g.name.startsWith(base+' · ')).length;c.example=false;
  if(full){c.name=base+' · copie '+n;return c}
  c.name=base+' · variante '+n;c.objs=c.objs.filter(o=>FIXED_TYPES.has(o.type));c.stock=[];c.nursery=[];c.frost=null;delete c.succOff;delete c.goals;return c}
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
  G().shape.forEach(p=>{p.x+=dx;p.y+=dy});G().objs.forEach(o=>{o.x+=dx;o.y+=dy});if(G().surround){G().surround.x+=dx;G().surround.y+=dy}view.cx+=dx;view.cy+=dy}
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
const PICKABLE=new Set(['planche','bac','serre','abri','fruitier','parcelle']);
const plantables=()=>allObjs().filter(o=>TYPES[o.type]&&TYPES[o.type].plant);
/* blocs : des objets qui bougent et tournent ensemble (série de planches et ses allées) */
const grpOf=o=>o&&o.grp?G().objs.filter(q=>q.grp===o.grp):null;
const grpMembers=o=>{const m=grpOf(o);return m&&m.length>1?m:null};
function grpFrame(ms,rot){/* boîte du bloc dans son propre repère (tourné de rot) */
  const pts=ms.flatMap(basePts),c0={x:pts.reduce((a,p)=>a+p.x,0)/pts.length,y:pts.reduce((a,p)=>a+p.y,0)/pts.length},a=-rot*Math.PI/180,co=Math.cos(a),si=Math.sin(a);
  const loc=pts.map(p=>({x:(p.x-c0.x)*co-(p.y-c0.y)*si,y:(p.x-c0.x)*si+(p.y-c0.y)*co})),x0=Math.min(...loc.map(p=>p.x)),x1=Math.max(...loc.map(p=>p.x)),y0=Math.min(...loc.map(p=>p.y)),y1=Math.max(...loc.map(p=>p.y));
  const mx=(x0+x1)/2,my=(y0+y1)/2,b=rot*Math.PI/180;return{cx:c0.x+mx*Math.cos(b)-my*Math.sin(b),cy:c0.y+mx*Math.sin(b)+my*Math.cos(b),w:x1-x0,h:y1-y0}}
/* repère du terrain : angle du plus long côté (ramené entre −45° et 45°) et son point de départ.
   La grille, l'aimantation des objets et l'orientation des nouveaux objets le suivent. */
function terrainFrame(){const g=G();if(ctx||!g.shape||g.shape.length<3)return{a:0,o:{x:0,y:0}};const tp=g.shape;let best=null;
  tp.forEach((p,i)=>{const q=tp[(i+1)%tp.length],L=Math.hypot(q.x-p.x,q.y-p.y);if(!best||L>best.L+.5)best={L,p,q}});
  let a=Math.atan2(best.q.y-best.p.y,best.q.x-best.p.x)*180/Math.PI;a=((a%90)+90)%90;if(a>45)a-=90;a=Math.round(a*10)/10;return{a:Math.abs(a)<.05?0:a,o:best.p}}
/* position aimantée sur la grille du terrain (centre de l'objet, pas de 5 cm) */
function snapXY(o,x,y){const f=terrainFrame();if(!f.a)return{x:snap(x),y:snap(y)};const r=f.a*Math.PI/180,c=Math.cos(r),s=Math.sin(r),cx=x+o.w/2-f.o.x,cy=y+o.h/2-f.o.y,u=snap(cx*c+cy*s),v=snap(-cx*s+cy*c);
  return{x:f.o.x+u*c-v*s-o.w/2,y:f.o.y+u*s+v*c-o.h/2}}
/* tourner un objet (ou tout son bloc) de d degrés */
function rotObj(o,d){const ms=grpMembers(o);if(ms){const f=grpFrame(ms,o.rot);rotateMembers(ms.map(q=>({o:q,x:q.x,y:q.y,rot:q.rot})),{x:f.cx,y:f.cy},d)}else o.rot=Math.round(((o.rot+d)%360+360)%360*10)/10}
/* tourner le terrain autour de son centre ; avec « all », tout le plan tourne et le nord suit */
function rotateTerrain(d,all){const g=G(),pts=g.shape||rectPts(),xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
  const c={x:(Math.min(...xs)+Math.max(...xs))/2,y:(Math.min(...ys)+Math.max(...ys))/2},a=d*Math.PI/180,co=Math.cos(a),si=Math.sin(a);
  g.shape=pts.map(p=>({x:Math.round(c.x+(p.x-c.x)*co-(p.y-c.y)*si),y:Math.round(c.y+(p.x-c.x)*si+(p.y-c.y)*co)}));
  if(all){rotateMembers(g.objs.map(o=>({o,x:o.x,y:o.y,rot:o.rot||0})),c,d);if(g===S)S.north=(((S.north+d)%360)+360)%360}
  normalizeShape();updateBox()}
/* rectangle (4 coins à angle droit) : largeur, longueur et angle, pour le redimensionner au centimètre */
function rectInfo(pts){if(!pts||pts.length!==4)return null;const[a,b,c,d]=pts,u={x:b.x-a.x,y:b.y-a.y},v={x:c.x-b.x,y:c.y-b.y},W=Math.hypot(u.x,u.y),L=Math.hypot(v.x,v.y);
  if(W<1||L<1||Math.abs((u.x*v.x+u.y*v.y)/(W*L))>.03||Math.hypot(d.x-(a.x+v.x),d.y-(a.y+v.y))>3)return null;
  return{W,L,ang:Math.atan2(u.y,u.x),sg:Math.sign(u.x*v.y-u.y*v.x)||1,c:{x:(a.x+c.x)/2,y:(a.y+c.y)/2}}}
function setRect(W,L){const r=rectInfo(G().shape);if(!r)return;const ux=Math.cos(r.ang),uy=Math.sin(r.ang),vx=-uy*r.sg,vy=ux*r.sg,P=(s,t)=>({x:Math.round(r.c.x+s*W/2*ux+t*L/2*vx),y:Math.round(r.c.y+s*W/2*uy+t*L/2*vy)});
  G().shape=[P(-1,-1),P(1,-1),P(1,1),P(-1,1)];normalizeShape();updateBox()}
function rotateMembers(st,c,delta){const a=delta*Math.PI/180,co=Math.cos(a),si=Math.sin(a);
  st.forEach(({o,x,y,rot})=>{const ox=x+o.w/2-c.x,oy=y+o.h/2-c.y;o.x=Math.round(c.x+ox*co-oy*si-o.w/2);o.y=Math.round(c.y+ox*si+oy*co-o.h/2);o.rot=Math.round((((rot+delta)%360)+360)%360*10)/10})}

