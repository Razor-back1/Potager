/* ================= Fond de plan : capture satellite de la propriété, mise à l'échelle ================= */
/* L'image reste sur cet appareil (trop lourde pour la synchronisation) ; ce qu'on décalque dessus, lui, se synchronise. */
const BGKEY='atelier-potager-fond';
let BG=(()=>{try{return JSON.parse(localStorage.getItem(BGKEY))}catch(e){return null}})(),calib=null;
const bgOf=()=>BG&&BG.src?BG:null;
function bgSave(){try{if(BG)localStorage.setItem(BGKEY,JSON.stringify(BG));else localStorage.removeItem(BGKEY)}catch(e){toast('Mémoire de l\'appareil pleine : capture non gardée')}}
/* image dans le plan (au-dessus du sol, sous les objets) */
function bgSVG(){if(!PROP()||ctx||!bgOf())return'';return`<image class="bgimg" href="${BG.src}" x="${BG.x}" y="${BG.y}" width="${BG.w}" height="${BG.h}" opacity="${BG.op??.7}" preserveAspectRatio="none"/>`}
function bgOverlay(){if(!calib)return'';const r=12/view.z;let s='';
  if(calib.pts.length===2){const[a,b]=calib.pts;s+=`<line class="calline" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" vector-effect="non-scaling-stroke"/>`}
  calib.pts.forEach(p=>s+=`<circle class="calpt" cx="${p.x}" cy="${p.y}" r="${r}" vector-effect="non-scaling-stroke"/><circle cx="${p.x}" cy="${p.y}" r="${r*.18}" fill="#ffd60a"/>`);return s}
/* réduit la photo (1600 px max) pour tenir dans la mémoire de l'appareil */
function readImage(file){return new Promise((ok,ko)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{const k=Math.min(1,1600/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
  c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);ok({src:c.toDataURL('image/jpeg',.78),iw:c.width,ih:c.height,ow:im.width,oh:im.height})};im.onerror=()=>{URL.revokeObjectURL(u);ko(new Error('Image illisible'))};im.src=u})}
function pickImage(){return new Promise(ok=>{const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=()=>ok(i.files&&i.files[0]||null);i.click()})}
async function bgAction(a){
  if(a==='del'){BG=null;bgSave();refresh();return toast('Capture retirée')}
  if(a==='add'){const f=await pickImage();if(!f)return;let im;try{im=await readImage(f)}catch(e){return toast(e.message)}
    if(!PROP())setTop('prop');const W=Math.max(S.w,S.h*im.iw/im.ih);BG={src:im.src,x:0,y:0,w:W,h:W*im.ih/im.iw,op:.7,ow:im.ow,oh:im.oh};
    if(alignBg()){bgSave();setTab('plan');fit2bg();renderPlan();return toast('Capture calée sur le plan')}bgSave()}
  if(a==='ask'){try{await navigator.clipboard.writeText(ASK_CLAUDE);toast('Demande copiée : colle-la dans Claude avec ta capture')}catch(e){prompt('Copie cette demande :',ASK_CLAUDE)}return}
  if(a==='paste'){let t='';try{t=await navigator.clipboard.readText()}catch(e){}if(!/"contour"/.test(t||''))t=prompt('Colle ici la réponse de Claude')||'';if(!t)return;
    let d=null;try{d=JSON.parse(t.slice(t.indexOf('{'),t.lastIndexOf('}')+1))}catch(e){}if(!d||!Array.isArray(d.contour)||d.contour.length<3)return toast('Réponse illisible : il faut le bloc qui commence par {"ebauche"');
    return applyDraft(d)}
  if(!bgOf())return;if(!PROP())setTop('prop');setTab('plan');if(editMode)setEdit(false);startCalib()}
function startCalib(){calib={pts:[]};selId=null;sheetMode='calib';svg.classList.add('calib');renderSheet();fit2bg();renderPlan()}
function endCalib(){calib=null;svg.classList.remove('calib');sheetMode=null;renderSheet();renderPlan()}
function fit2bg(){if(!bgOf())return fit();const r=svg.getBoundingClientRect(),sh=innerWidth<760?r.height*.4:0;view.z=Math.min((r.width-40)/BG.w,(r.height-sh-40)/BG.h);view.cx=BG.x+BG.w/2;view.cy=BG.y+BG.h/2+sh/2/view.z}
function calibSheet(){const n=calib?calib.pts.length:0,L=n===2?Math.hypot(calib.pts[1].x-calib.pts[0].x,calib.pts[1].y-calib.pts[0].y):0;
  return`<div class="stack"><div class="row between"><h3>Mettre la capture à l'échelle</h3><button class="btn small" data-bg="done">Terminer</button></div>
  <p class="note" style="color:var(--ink)">${n<2?`Touche les deux bouts de la barre d'échelle de la capture (en bas, « 20 m » par exemple), ou deux points dont tu connais la distance. <b>${n} / 2</b>`:'Indique la distance réelle entre les deux points.'}</p>
  ${n===2?`<div class="row"><label class="field" style="max-width:150px"><span class="lbl">Distance (m)</span><input id="bg-d" type="number" inputmode="decimal" min="0.5" step="0.5" value="20"></label><button class="btn primary" data-bg="apply">Appliquer</button><button class="btn small" data-bg="redo">Recommencer</button></div><p class="note">Sur le plan actuel : ${m2(L)} m.</p>`:''}
  <label class="field"><span class="lbl">Visibilité de la capture</span><input id="bg-op" type="range" min="0.15" max="1" step="0.05" value="${BG?BG.op??.7:.7}"></label>
  <p class="note">Ensuite, décalque : crayon, puis « Ajouter » pour la maison, la piscine, les arbres ; « Forme du terrain » pour les limites ; et pose tes parcelles au bon endroit.</p></div>`}
/* un tap (sans glisser) pose un point ; glisser et pincer restent libres pour cadrer */
let calDown=null;
svg.addEventListener('pointerdown',e=>{if(calib)calDown={x:e.clientX,y:e.clientY,n:ptrs.size}},true);
svg.addEventListener('pointerup',e=>{if(!calib||!calDown)return;const d=Math.hypot(e.clientX-calDown.x,e.clientY-calDown.y),many=calDown.n>0;calDown=null;if(d>8||many||calib.pts.length>=2)return;
  calib.pts.push(world(e.clientX,e.clientY));renderSheet();renderPlan();if(calib.pts.length===2)setTimeout(()=>{const i=$('#bg-d');if(i)i.select()},50)},true);
sheet.addEventListener('click',e=>{const b=e.target.closest('[data-bg]');if(!b)return;const a=b.dataset.bg;
  if(a==='done')return endCalib();
  if(a==='redo'){calib.pts=[];renderSheet();renderPlan();return}
  if(a==='apply'){const d=parseFloat(String($('#bg-d').value).replace(',','.'));if(!(d>0))return toast('Indique une distance en mètres');const[p,q]=calib.pts,L=Math.hypot(q.x-p.x,q.y-p.y);if(L<1)return;
    const f=d*100/L;BG.x=p.x+(BG.x-p.x)*f;BG.y=p.y+(BG.y-p.y)*f;BG.w*=f;BG.h*=f;
    /* la capture commence au coin du terrain si elle est plus petite que lui, sinon on agrandit le terrain pour la contenir */
    const dx=-Math.min(0,BG.x),dy=-Math.min(0,BG.y);BG.x+=dx;BG.y+=dy;bgSave();
    if(!S.shape&&(S.w<BG.x+BG.w||S.h<BG.y+BG.h)){S.w=Math.ceil((BG.x+BG.w)/100)*100;S.h=Math.ceil((BG.y+BG.h)/100)*100;save()}
    calib.pts=[];endCalib();fit2bg();renderPlan();return toast(`Capture à l'échelle : ${num(BG.w/100,0)} × ${num(BG.h/100,0)} m`)}});
sheet.addEventListener('input',e=>{if(e.target.id!=='bg-op'||!BG)return;BG.op=+e.target.value;bgSave();renderPlan()});

/* ---- ébauche : le plan de la propriété décrit en JSON (par Claude, à partir d'une capture) ---- */
const ASK_CLAUDE=`Voici une capture satellite (Google Maps) de ma propriété, pour l'app Atelier Potager. Réponds uniquement avec un bloc JSON, sans texte autour, de cette forme :
{"ebauche":1,"nord":0,"contour":[[x,y],...],"objets":[["maison",x,y,largeur,longueur,rotation],["etang",x,y,largeur,longueur,rotation,[[u,v],...]],["arbre",x,y,diametre],...],"fond":{"l":largeur_image_px,"h":hauteur_image_px,"mpx":metres_par_pixel,"ox":x0_px,"oy":y0_px}}
Règles : mesures en mètres (1 décimale), mesurées grâce à la barre d'échelle de la capture. Origine (0,0) au pixel (ox,oy) de l'image, x vers la droite, y vers le bas ; ox et oy = le coin haut-gauche du contour. "contour" = les limites du terrain, dans l'ordre. Objets possibles : maison, terrasse, piscine, abri, allee, haie, etang, arbre ; x,y = coin haut-gauche avant rotation (rotation en degrés, sens horaire) ; pour etang, [[u,v]] = forme dans son rectangle (de 0 à 1) ; pour arbre, x,y = centre et le diamètre de la couronne. Mets chaque arbre bien visible. "nord" = 0 si le nord est en haut de la capture. Si j'ai dessiné des repères (couleurs), suis-les.`;
const DRAFT_T={maison:1,terrasse:1,piscine:1,abri:1,allee:1,haie:1,etang:1,arbre:1,cloture:1,compost:1,serre:1};
function applyDraft(d){if(!PROP())setTop('prop');const cm=v=>Math.round(+v*100);
  let shape=d.contour.map(p=>({x:cm(p[0]),y:cm(p[1])}));const sx=-Math.min(0,...shape.map(p=>p.x)),sy=-Math.min(0,...shape.map(p=>p.y));shape=shape.map(p=>({x:p.x+sx,y:p.y+sy}));
  const objs=[];(d.objets||[]).forEach(a=>{if(!Array.isArray(a)||!DRAFT_T[a[0]])return;const t=a[0],T=TYPES[t];
    if(t==='arbre'){const D=Math.max(100,cm(a[3]||4));objs.push({id:uid(),type:'arbre',name:T.l,x:cm(a[1])+sx-D/2,y:cm(a[2])+sy-D/2,w:D,h:D,rot:0,height:Math.round(Math.min(2500,Math.max(400,D*.8))),zones:[]});return}
    const o={id:uid(),type:t,name:T.l,x:cm(a[1])+sx,y:cm(a[2])+sy,w:Math.max(20,cm(a[3]||T.w/100)),h:Math.max(10,cm(a[4]||T.h/100)),rot:Math.round(((+a[5]||0)%360+360)%360*10)/10,zones:[]};
    if(T.ht)o.height=T.ht;if(t==='etang'&&Array.isArray(a[6])&&a[6].length>2)o.poly=a[6].map(q=>[+q[0],+q[1]]);objs.push(o)});
  const names={};objs.forEach(o=>{names[o.type]=(names[o.type]||0)+1;if(o.type==='arbre')o.name='Arbre '+names[o.type]});
  /* les parcelles restent ; celles qui tombent hors du nouveau terrain sont rangées à l'intérieur */
  const ps=S.objs.filter(o=>o.type==='parcelle');
  S.shape=shape;S.north=+d.nord||0;S.objs=[...objs,...ps];if(d.nom&&S.name==='Ma propriété'&&d.nom!=='Ma propriété')S.name=String(d.nom).slice(0,40);
  S.bgRef=d.fond&&d.fond.mpx?{l:+d.fond.l,h:+d.fond.h,mpx:+d.fond.mpx,ox:+d.fond.ox||0,oy:+d.fond.oy||0,sx,sy}:null;
  updateBox();const busy=[...objs];
  ps.forEach(o=>{if(inPoly({x:o.x+o.w/2,y:o.y+o.h/2},shape)){busy.push(o);return}const c=freeSpot(shape,busy,Math.hypot(o.w,o.h)/2);o.x=Math.round(c.x-o.w/2);o.y=Math.round(c.y-o.h/2);busy.push(o)});
  if(bgOf())alignBg();bgSave();save();
  const n=objs.filter(o=>o.type==='arbre').length;setTab('plan');fit();renderPlan();
  toast(`Ébauche posée : ${num(Math.abs(polyArea(shape))/1e4,0)} m², ${objs.length-n} élément${objs.length-n>1?'s':''} et ${n} arbre${n>1?'s':''}`,true)}
/* cale la capture en fond sur le plan si c'est la même image que celle de l'ébauche */
function alignBg(){const r=S.bgRef;if(!BG||!r||!r.l||!r.h)return false;const ar=(BG.ow||BG.w)/(BG.oh||BG.h);if(Math.abs(ar/(r.l/r.h)-1)>.015)return false;
  const k=r.mpx*100;BG.x=-r.ox*k+(r.sx||0);BG.y=-r.oy*k+(r.sy||0);BG.w=r.l*k;BG.h=r.h*k;return true}
/* l'endroit le plus dégagé du terrain (loin des bords, des arbres, de l'étang…) pour y poser une parcelle */
function freeSpot(shape,busy,rad){const xs=shape.map(p=>p.x),ys=shape.map(p=>p.y),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),st=Math.max(x1-x0,y1-y0)/40;
  const segD=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)};
  let best={x:(x0+x1)/2,y:(y0+y1)/2},bv=-Infinity;
  for(let x=x0+st/2;x<x1;x+=st)for(let y=y0+st/2;y<y1;y+=st){const p={x,y};if(!inPoly(p,shape))continue;
    let v=Math.min(...shape.map((a,i)=>segD(p,a,shape[(i+1)%shape.length])));
    busy.forEach(o=>{v=Math.min(v,Math.hypot(o.x+o.w/2-x,o.y+o.h/2-y)-Math.hypot(o.w,o.h)/2)});if(v>bv){bv=v;best=p}}
  return best}
