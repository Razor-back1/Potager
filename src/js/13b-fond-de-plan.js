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
  c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);ok({src:c.toDataURL('image/jpeg',.78),iw:c.width,ih:c.height})};im.onerror=()=>{URL.revokeObjectURL(u);ko(new Error('Image illisible'))};im.src=u})}
function pickImage(){return new Promise(ok=>{const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=()=>ok(i.files&&i.files[0]||null);i.click()})}
async function bgAction(a){
  if(a==='del'){BG=null;bgSave();refresh();return toast('Capture retirée')}
  if(a==='add'){const f=await pickImage();if(!f)return;let im;try{im=await readImage(f)}catch(e){return toast(e.message)}
    if(!PROP())setTop('prop');const W=Math.max(S.w,S.h*im.iw/im.ih);BG={src:im.src,x:0,y:0,w:W,h:W*im.ih/im.iw,op:.7};bgSave();
    try{localStorage.setItem('potager-capture','1')}catch(e){}}
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
