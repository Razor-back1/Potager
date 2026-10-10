/* ================= Plan ================= */
const svg=$('#map');
function shapeSVG(o){
  const w=o.w,h=o.h,x=-w/2,y=-h/2,ns='vector-effect="non-scaling-stroke"';
  switch(o.type){
    case 'planche':case 'bac':{
      let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.type==='bac'?2:6}" class="${o.type==='bac'?'s-wood':'s-soil'}" stroke-width="${o.type==='bac'?3:1}" ${ns}/>`;
      const horiz=w>=h,W=Math.min(w,h);let off=0;
      const R=(u,v,du,dv)=>horiz?[x+u,y+v,du,dv]:[x+v,y+u,dv,du];
      o.zones.forEach((z,i)=>{const g=zoneGrid(o,z),p=P[z.crop];
        if(p){const[a,b,c,d]=R(off,0,z.len,W);s+=`<rect x="${a}" y="${b}" width="${c}" height="${d}" fill="${p.c}" fill-opacity=".22"/>`;
          for(const k in z.cells){const[r,cc]=k.split('-').map(Number);const[cx,cy]=R(off+(cc+.5)*g.cellL,(r+.5)*g.cellW,0,0);const m=Math.min(g.cellL,g.cellW);if(m*view.z>=16){const sz=m*.86;s+=`<use href="#${symOf(p.id,progOf(z.cells[k],p.id))}" x="${cx-sz/2}" y="${cy-sz/2}" width="${sz}" height="${sz}"/>`}else s+=`<circle cx="${cx}" cy="${cy}" r="${m*.32}" fill="${p.c}"/>`}}
        off+=z.len;
        if(i<o.zones.length-1){const[a,b,c,d]=R(off,0,0,W);s+=`<line x1="${a}" y1="${b}" x2="${a+c}" y2="${b+d}" class="s-zone-line" stroke-width="2" ${ns}/>`}});
      return s;}
    case 'serre':return`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="s-serre" stroke-width="2" ${ns}/>`;
    case 'alleeo':{const b=clamp(+o.ring||70,10,Math.min(w,h)/2),rx=w/2,ry=h/2,ix=rx-b,iy=ry-b;
      const d=`M${-rx} 0a${rx} ${ry} 0 1 0 ${2*rx} 0a${rx} ${ry} 0 1 0 ${-2*rx} 0z`+(ix>1&&iy>1?`M${-ix} 0a${ix} ${iy} 0 1 1 ${2*ix} 0a${ix} ${iy} 0 1 1 ${-2*ix} 0z`:'');
      return`<path d="${d}" fill-rule="evenodd" class="s-gravel" stroke-width="1" ${ns}/>`}
    case 'allee':return`<rect x="${x}" y="${y}" width="${w}" height="${h}" class="s-gravel" stroke-width="1" ${ns}/>`;
    case 'cuve':return`<circle r="${w/2}" class="s-water" stroke-width="2" ${ns}/><circle r="${w/2*.6}" fill="none" style="stroke:var(--surface)" stroke-opacity=".5" stroke-width="1" ${ns}/>`;
    case 'eau':return`<circle r="${w/2}" class="s-water-l" stroke-width="2" ${ns}/><circle r="${w/5}" class="s-water"/>`;
    case 'arbre':return`<circle r="${w/2}" class="s-leaf" stroke-width="1.5" stroke-dasharray="4 3" ${ns}/><circle r="${Math.max(8,w*.06)}" class="s-trunk"/>`;
    case 'fruitier':{const z=o.zones&&o.zones[0],p=z&&P[z.crop],pr=1,sz=w*.42;
      return`<circle r="${w/2}" class="s-leaf" fill-opacity=".55" stroke-width="1.5" ${ns}/>${p?`<circle r="${w/2*.92}" fill="${p.c}" fill-opacity=".18"/>`:''}<circle r="${Math.max(6,w*.05)}" class="s-trunk"/>${p&&sz*view.z>=14?`<use href="#${symOf(p.id,pr)}" x="${-sz/2}" y="${-sz/2}" width="${sz}" height="${sz}"/>`:''}`}
    case 'haie':if(o.bend)return`<path d="M${x+h/2} 0Q0 ${-2*o.bend} ${-x-h/2} 0" fill="none" style="stroke:var(--leaf-dark)" stroke-opacity=".8" stroke-width="${h}" stroke-linecap="round"/>`;
      return`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(w,h)/2}" class="s-leaf-solid" fill-opacity=".8"/>`;
    case 'citerne':{const r=w/2;return`<circle r="${r}" class="s-water-l" stroke-width="2" stroke-dasharray="6 4" ${ns}/><path d="M${-r*.45} 0H${r*.45}M0 ${-r*.45}V${r*.45}" style="stroke:var(--water)" stroke-width="2" ${ns}/>${r*2*view.z>=46?`<text class="vol" text-anchor="middle" y="${r+14/view.z}" font-size="${11/view.z}">${num(+o.vol||0,0)} L</text>`:''}`}
    case 'ruisseau':{const b=+o.bend||0,v=+o.wave||0,d=`M${x} 0C${-w/6} ${-4/3*(b+v)} ${w/6} ${-4/3*(b-v)} ${-x} 0`;
      return`<path d="${d}" fill="none" class="s-stream" stroke-width="${h}" stroke-linecap="round"/><path d="${d}" fill="none" class="s-flow" stroke-width="${Math.max(h*.18,1.5/view.z)}" stroke-dasharray="${24/view.z} ${36/view.z}" stroke-linecap="round"/>`}
    case 'etang':return o.poly&&o.poly.length>2?`<polygon points="${o.poly.map(([u,v])=>(x+u*w).toFixed(1)+','+(y+v*h).toFixed(1)).join(' ')}" class="s-water" fill-opacity=".5" stroke-width="2" stroke-linejoin="round" ${ns}/>`
      :`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(w,h)/2}" class="s-water" fill-opacity=".5" stroke-width="2" ${ns}/>`;
    case 'cloture':{let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" class="s-fence"/>`;const L=Math.max(w,h),n=Math.floor(L/200);for(let i=0;i<=n;i++){const t=-L/2+i*(L/Math.max(n,1));s+=w>=h?`<rect x="${t-6}" y="${-Math.max(h,12)/2-2}" width="12" height="${Math.max(h,12)+4}" class="s-wood-solid"/>`:`<rect y="${t-6}" x="${-Math.max(w,12)/2-2}" height="12" width="${Math.max(w,12)+4}" class="s-wood-solid"/>`}return s}
    case 'prise':return`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" class="s-plug" stroke-width="1" ${ns}/><circle cx="${-w*.18}" r="${w*.09}" style="fill:var(--ink)"/><circle cx="${w*.18}" r="${w*.09}" style="fill:var(--ink)"/>`;
    case 'compost':return`<rect x="${x}" y="${y}" width="${w}" height="${h}" class="s-wood-solid" stroke-width="1" ${ns}/><path d="M${x} ${y+h/3}H${-x}M${x} ${y+2*h/3}H${-x}" class="s-roof" stroke-width="1" ${ns}/>`;
    case 'abri':return`<rect x="${x}" y="${y}" width="${w}" height="${h}" class="s-wood-solid" stroke-width="1.5" ${ns}/><path d="M${x} ${y}L${-x} ${-y}M${-x} ${y}L${x} ${-y}" class="s-roof" stroke-width="1" ${ns}/>`;
  }return'';
}
function objSVG(o){
  const fs=12/view.z,sel=o.id===selId;let lab='';
  const vert=o.h>o.w*1.4,span=(vert?o.h:o.w)*view.z,thick=Math.min(o.w,o.h)*view.z;
  if(span>o.name.length*6.5&&thick>13&&o.type!=='prise')lab=`<text text-anchor="middle" dominant-baseline="central" font-size="${fs}" transform="${vert?'rotate(-90)':''}">${esc(o.name)}</text>`;
  let badge='';const st=planStatus(o);if(st){const r=10/view.z;badge=`<g class="badge ${st.c}" transform="translate(${o.w/2} ${-o.h/2})"><title>${st.l}</title><circle r="${r}" vector-effect="non-scaling-stroke"/><text text-anchor="middle" dominant-baseline="central" font-size="${(st.c==='blue'?9:11)/view.z}" transform="rotate(${-o.rot})">${st.t}</text></g>`}
  let selS='';if(sel){const p=6/view.z,bd=o.type==='haie'&&o.bend?o.bend:0;selS=`<rect class="selbox${o.locked?' locked':''}" x="${-o.w/2-p}" y="${-o.h/2-p-Math.max(0,bd)}" width="${o.w+2*p}" height="${o.h+2*p+Math.abs(bd)}" vector-effect="non-scaling-stroke"/>`+(o.locked||!editMode?'':`<circle class="handle" data-handle="1" cx="${o.w/2+p}" cy="${o.h/2+p}" r="${11/view.z}" vector-effect="non-scaling-stroke"/>`)}
  return`<g data-id="${o.id}" class="obj${o.id===lifted||liftGrp&&o.grp===liftGrp?' lift':''}${!editMode&&!PICKABLE.has(o.type)?' nopick':''}" transform="translate(${o.x+o.w/2} ${o.y+o.h/2}) rotate(${o.rot})">${shapeSVG(o)}${lab}${badge}${selS}</g>`;
}
function renderPlan(){
  const r=svg.getBoundingClientRect(),W=r.width||360,H=r.height||500;
  svg.setAttribute('viewBox',`${view.cx-W/2/view.z} ${view.cy-H/2/view.z} ${W/view.z} ${H/view.z}`);
  const fs=11/view.z;
  const tp=terrainPts(),pts=tp.map(q=>q.x+','+q.y).join(' '),sg=Math.sign(polyArea(tp))||1;
  let edges='';tp.forEach((a,i)=>{const b=tp[(i+1)%tp.length],L=Math.hypot(b.x-a.x,b.y-a.y);if(L*view.z<40)return;const nx=(b.y-a.y)/L*sg,ny=-(b.x-a.x)/L*sg,o=14/view.z;
    edges+=`<text class="${shapeEdit?'edgetxt':'dimtxt'}" x="${(a.x+b.x)/2+nx*o}" y="${(a.y+b.y)/2+ny*o}" text-anchor="middle" dominant-baseline="central" font-size="${fs}">${m2(L)} m</text>`});
  const sur=!ctx&&S.surround;
  $('#groundL').innerHTML=`${sur?`<rect class="surround" x="${sur.x}" y="${sur.y}" width="${sur.w}" height="${sur.h}" vector-effect="non-scaling-stroke"/>`:''}<clipPath id="tclip"><polygon points="${pts}"/></clipPath><g clip-path="url(#tclip)"><rect class="ground" width="${G().w}" height="${G().h}"/><rect width="${G().w}" height="${G().h}" fill="url(#g1)"/><rect width="${G().w}" height="${G().h}" fill="url(#g5)"/></g><polygon class="bound" points="${pts}" vector-effect="non-scaling-stroke"/>${edges}`;
  let ed='';if(shapeEdit){const r=11/view.z;tp.forEach((a,i)=>{const b=tp[(i+1)%tp.length];ed+=`<line class="edgehit" data-edge="${i}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" vector-effect="non-scaling-stroke"/>`});tp.forEach((a,i)=>{const b=tp[(i+1)%tp.length];ed+=`<circle class="mid" data-mid="${i}" cx="${(a.x+b.x)/2}" cy="${(a.y+b.y)/2}" r="${r*.7}"/>`});
    tp.forEach((a,i)=>ed+=`<circle class="vtx${shapeEdit.sel===i?' sel':''}" data-vtx="${i}" cx="${a.x}" cy="${a.y}" r="${r}" vector-effect="non-scaling-stroke"/>`)}
  /* anneau de rotation autour de l'objet sélectionné (mode édition) */
  const ro=!shapeEdit&&editMode&&selId&&!lifted?G().objs.find(o=>o.id===selId):null;
  const rms=ro&&grpMembers(ro),rf=rms?grpFrame(rms,ro.rot):null;
  if(rf)ed+=`<rect class="grpbox" x="${rf.cx-rf.w/2-12/view.z}" y="${rf.cy-rf.h/2-12/view.z}" width="${rf.w+24/view.z}" height="${rf.h+24/view.z}" transform="rotate(${ro.rot} ${rf.cx} ${rf.cy})" rx="${8/view.z}" vector-effect="non-scaling-stroke"/>`;
  if(ro&&!TYPES[ro.type].round&&!ro.locked){const cx=rf?rf.cx:ro.x+ro.w/2,cy=rf?rf.cy:ro.y+ro.h/2,Rr=Math.min(Math.max(Math.hypot(rf?rf.w:ro.w,rf?rf.h:ro.h)/2+40/view.z,70/view.z),Math.min(svg.clientWidth||360,svg.clientHeight||500)*.46/view.z),a=ro.rot*Math.PI/180,kx=cx+Rr*Math.sin(a),ky=cy-Rr*Math.cos(a);
    ed+=`<circle class="rotring" cx="${cx}" cy="${cy}" r="${Rr}" vector-effect="non-scaling-stroke"/><circle class="rothit" data-rot="1" cx="${cx}" cy="${cy}" r="${Rr}" vector-effect="non-scaling-stroke"/>
    <line class="rotline" x1="${cx}" y1="${cy}" x2="${kx}" y2="${ky}" vector-effect="non-scaling-stroke"/><g data-rot="1" transform="translate(${kx} ${ky})"><circle class="rotknob" r="${14/view.z}" vector-effect="non-scaling-stroke"/><text class="rotknobt" text-anchor="middle" dominant-baseline="central" font-size="${12/view.z}">${ro.rot}°</text></g>`}
  $('#editL').innerHTML=ed;
  renderWxLayer();
  const order=['etang','ruisseau','citerne','alleeo','allee','haie','cloture','serre','arbre','fruitier','abri','compost','cuve','eau','bac','planche','prise'];
  const list=[...G().objs].sort((a,b)=>(a.id===selId)-(b.id===selId)||order.indexOf(a.type)-order.indexOf(b.type));
  $('#layer').innerHTML=list.map(objSVG).join('');
  let sh='';const lv=!shade.on&&liveWx()&&!ctx&&wx.cur&&wx.cur.isDay&&['clear','partly'].includes(wxKind(wx.cur.code));
  if(lv){const sp=sunPos(doyOf(TODAY),solarNow());if(sp.alt>=.04)G().objs.forEach(o=>shadowPolys(o,sp).forEach(p=>{sh+=`<polygon class="shadepoly live" points="${p.map(q=>q.x.toFixed(1)+','+q.y.toFixed(1)).join(' ')}"/>`}))}
  if(shade.on&&!ctx){const sp=sunPos(shade.doy,shade.hour);if(sp.alt>=.04)G().objs.forEach(o=>shadowPolys(o,sp).forEach(p=>{sh+=`<polygon class="shadepoly" points="${p.map(q=>q.x.toFixed(1)+','+q.y.toFixed(1)).join(' ')}"/>`}))}
  $('#shadeL').innerHTML=sh;
  let ov='';if(guides){guides.forEach(g=>ov+=`<line class="guide" x1="${g[0]}" y1="${g[1]}" x2="${g[2]}" y2="${g[3]}" vector-effect="non-scaling-stroke"/>`)}
  $('#overL').innerHTML=ov;
}
function fit(){const r=svg.getBoundingClientRect();const sh=sheetMode&&innerWidth<760?r.height*.45:0;view.z=Math.min((r.width-90)/G().w,(r.height-sh-90)/G().h);view.cx=G().w/2;view.cy=G().h/2+sh/2/view.z-20/view.z;renderPlan()}

/* guides d'alignement */
function alignSnap(o){
  const thr=8/view.z,A=aabb(o),xs=[A.x0,(A.x0+A.x1)/2,A.x1],ys=[A.y0,(A.y0+A.y1)/2,A.y1];let bx=null,by=null;
  const T=G().objs.filter(q=>q!==o).map(aabb);T.push({x0:0,y0:0,x1:G().w,y1:G().h});
  for(const B of T){const tx=[B.x0,(B.x0+B.x1)/2,B.x1],ty=[B.y0,(B.y0+B.y1)/2,B.y1];
    for(const a of xs)for(const t of tx){const d=t-a;if(Math.abs(d)<thr&&(!bx||Math.abs(d)<Math.abs(bx.d)))bx={d,v:t,B}}
    for(const a of ys)for(const t of ty){const d=t-a;if(Math.abs(d)<thr&&(!by||Math.abs(d)<Math.abs(by.d)))by={d,v:t,B}}}
  if(bx)o.x+=bx.d;if(by)o.y+=by.d;const A2=aabb(o),g=[];
  if(bx)g.push([bx.v,Math.min(A2.y0,bx.B.y0),bx.v,Math.max(A2.y1,bx.B.y1)]);
  if(by)g.push([Math.min(A2.x0,by.B.x0),by.v,Math.max(A2.x1,by.B.x1),by.v]);
  return g;
}
function nearest(o){let best=null;G().objs.forEach(q=>{if(q===o||q.type==='allee')return;const d=gap(o,q);if(!best||d<best.d)best={d,q}});return best}

/* pointeur : appui long = déplacer, glisser = vue, deux doigts = zoom */
const ptrs=new Map();let drag=null,pinch=null;
function world(x,y){const r=svg.getBoundingClientRect();return{x:view.cx+(x-r.left-r.width/2)/view.z,y:view.cy+(y-r.top-r.height/2)/view.z}}
function showHint(t){const h=$('#hint');h.textContent=t;h.hidden=false;h.classList.toggle('low',(shade.on&&!ctx)||!!shapeEdit||!!ctx)}
svg.addEventListener('pointerdown',e=>{
  svg.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===2){const[a,b]=[...ptrs.values()];pinch={d0:Math.hypot(a.x-b.x,a.y-b.y),z0:view.z,m:world((a.x+b.x)/2,(a.y+b.y)/2)};clearTimeout(holdT);if(drag&&drag.mode==='move'){drag.o.x=drag.s.x;drag.o.y=drag.s.y;(drag.grp||[]).forEach(m=>{m.o.x=m.x;m.o.y=m.y})}liftGrp=null;drag=null;lifted=null;guides=null;return}
  /* la poignée de taille passe avant l'anneau de rotation quand les deux se chevauchent */
  if(selId&&editMode&&!shapeEdit){const o=obj(selId);if(o&&!o.locked&&G().objs.includes(o)){const pd=6/view.z,ang=o.rot*Math.PI/180,lx=o.w/2+pd,ly=o.h/2+pd,hx=o.x+o.w/2+lx*Math.cos(ang)-ly*Math.sin(ang),hy=o.y+o.h/2+lx*Math.sin(ang)+ly*Math.cos(ang),pw=world(e.clientX,e.clientY);
    if(Math.hypot(pw.x-hx,pw.y-hy)*view.z<26){drag={mode:'resize',o,p0:pw,s:{...o},sx:e.clientX,sy:e.clientY};return}}}
  const rh=e.target.closest('[data-rot]');if(rh&&selId&&editMode&&!shapeEdit){const o=obj(selId),ms=grpMembers(o),f=ms?grpFrame(ms,o.rot):null;drag={mode:'rot',o,s:{rot:o.rot},sx:e.clientX,sy:e.clientY,c:f?{x:f.cx,y:f.cy}:{x:o.x+o.w/2,y:o.y+o.h/2},grp:ms?ms.map(q=>({o:q,x:q.x,y:q.y,rot:q.rot})):null};return}
  if(shapeEdit){if(!G().shape)G().shape=rectPts();const v=e.target.closest('[data-vtx]'),m=e.target.closest('[data-mid]');
    if(v){shapeEdit.sel=+v.dataset.vtx;drag={mode:'vtx',i:shapeEdit.sel,sx:e.clientX,sy:e.clientY};renderPlan();renderShapebar();return}
    if(m){const i=+m.dataset.mid+1,a=G().shape[i-1],b=G().shape[i%G().shape.length];G().shape.splice(i,0,{x:snap((a.x+b.x)/2,10),y:snap((a.y+b.y)/2,10)});shapeEdit.sel=i;drag={mode:'vtx',i,sx:e.clientX,sy:e.clientY,inserted:true};renderPlan();renderShapebar();return}
    const ed=e.target.closest('[data-edge]');if(ed){const i=+ed.dataset.edge,n=G().shape.length;shapeEdit.sel=null;drag={mode:'edge',i,p0:world(e.clientX,e.clientY),s:[{...G().shape[i]},{...G().shape[(i+1)%n]}],sx:e.clientX,sy:e.clientY};renderShapebar();return}
    drag={mode:'pan',sx:e.clientX,sy:e.clientY,c0:{x:view.cx,y:view.cy}};return}
  const h=e.target.closest('[data-handle]'),g0=e.target.closest('[data-id]'),g=g0&&(editMode||PICKABLE.has((obj(g0.dataset.id)||{}).type))?g0:null,p=world(e.clientX,e.clientY);
  if(h&&selId){const o=obj(selId);drag={mode:'resize',o,p0:p,s:{...o},sx:e.clientX,sy:e.clientY}}
  else if(g&&!editMode){const o=obj(g.dataset.id);selId=o.id;drag={mode:'hold',o,p0:p,s:{x:o.x,y:o.y},sx:e.clientX,sy:e.clientY,c0:{x:view.cx,y:view.cy}};renderPlan()}
  else if(g){const o=obj(g.dataset.id);selId=o.id;
    drag={mode:'hold',o,p0:p,s:{x:o.x,y:o.y},sx:e.clientX,sy:e.clientY,c0:{x:view.cx,y:view.cy}};renderPlan();
    holdT=setTimeout(()=>{if(!drag||drag.mode!=='hold')return;
      if(o.locked){drag.mode='done';toast('Objet verrouillé : déverrouille-le dans son menu');return}
      drag.mode='move';drag.moved=true;lifted=o.id;{const ms=grpMembers(o);drag.grp=ms?ms.filter(q=>q!==o).map(q=>({o:q,x:q.x,y:q.y})):null;liftGrp=ms?o.grp:null}sheetMode=null;renderSheet();try{navigator.vibrate&&navigator.vibrate(15)}catch(_){}showHint('Glisse pour déplacer');renderPlan()},380)}
  else drag={mode:'pan',sx:e.clientX,sy:e.clientY,c0:{x:view.cx,y:view.cy}};
});
svg.addEventListener('pointermove',e=>{
  if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pinch&&ptrs.size===2){const[a,b]=[...ptrs.values()],r=svg.getBoundingClientRect();view.z=clamp(pinch.z0*Math.hypot(a.x-b.x,a.y-b.y)/pinch.d0,.04,6);
    view.cx=pinch.m.x-((a.x+b.x)/2-r.left-r.width/2)/view.z;view.cy=pinch.m.y-((a.y+b.y)/2-r.top-r.height/2)/view.z;renderPlan();return}
  if(!drag||drag.mode==='done')return;
  if(drag.mode==='hold'){if(Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<6)return;clearTimeout(holdT);drag.mode='pan'}
  if(!drag.moved&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<5)return;drag.moved=true;
  const p=world(e.clientX,e.clientY),o=drag.o;
  if(drag.mode==='pan'){view.cx=drag.c0.x-(e.clientX-drag.sx)/view.z;view.cy=drag.c0.y-(e.clientY-drag.sy)/view.z}
  else if(drag.mode==='vtx'){const sh=G().shape,n=sh.length,pv=sh[(drag.i-1+n)%n],nx=sh[(drag.i+1)%n],thr=10/view.z;
    const q={x:snap(p.x,10),y:snap(p.y,10)};
    for(const a of[pv,nx]){if(Math.abs(q.x-a.x)<thr)q.x=a.x;if(Math.abs(q.y-a.y)<thr)q.y=a.y}
    sh[drag.i]=q;showHint(`${m2(Math.hypot(q.x-pv.x,q.y-pv.y))} m · ${m2(Math.hypot(q.x-nx.x,q.y-nx.y))} m`)}
  else if(drag.mode==='rot'){let ang=Math.atan2(p.y-drag.c.y,p.x-drag.c.x)*180/Math.PI+90;ang=(ang%360+360)%360;
    let r=Math.round(ang/5)*5;for(let k=0;k<=360;k+=45)if(Math.abs(ang-k)<4)r=k;if(drag.grp){rotateMembers(drag.grp,drag.c,r%360-drag.s.rot)}else o.rot=r%360;showHint(`Orientation ${o.rot}°${drag.grp?' · bloc':''}`)}
  else if(drag.mode==='edge'){const[a,b]=drag.s,L=Math.hypot(b.x-a.x,b.y-a.y)||1,sg=Math.sign(polyArea(G().shape))||1,nx=(b.y-a.y)/L*sg,ny=-(b.x-a.x)/L*sg;
    const t=snap((p.x-drag.p0.x)*nx+(p.y-drag.p0.y)*ny,10),n=G().shape.length;
    G().shape[drag.i]={x:Math.round(a.x+nx*t),y:Math.round(a.y+ny*t)};G().shape[(drag.i+1)%n]={x:Math.round(b.x+nx*t),y:Math.round(b.y+ny*t)};
    showHint(`${t>=0?'Agrandi':'Réduit'} de ${m2(Math.abs(t))} m`)}
  else if(drag.mode==='move'){o.x=snap(drag.s.x+p.x-drag.p0.x);o.y=snap(drag.s.y+p.y-drag.p0.y);guides=drag.grp?null:alignSnap(o);if(drag.grp){const dx=o.x-drag.s.x,dy=o.y-drag.s.y;drag.grp.forEach(m=>{m.o.x=m.x+dx;m.o.y=m.y+dy})}
    const n=nearest(o);showHint(n?`${n.d<1?'Contact':'Écart '+Math.round(n.d)+' cm'} · ${n.q.name}`:'Glisse pour déplacer')}
  else if(drag.mode==='resize'){const a=o.rot*Math.PI/180,dx=p.x-drag.p0.x,dy=p.y-drag.p0.y,lx=dx*Math.cos(a)+dy*Math.sin(a),ly=-dx*Math.sin(a)+dy*Math.cos(a),s=drag.s;
    let w=Math.max(10,snap(s.w+lx)),h=Math.max(10,snap(s.h+ly));if(TYPES[o.type].round)w=h=Math.max(w,h);
    const tlx=s.x+s.w/2+(-s.w/2)*Math.cos(a)-(-s.h/2)*Math.sin(a),tly=s.y+s.h/2+(-s.w/2)*Math.sin(a)+(-s.h/2)*Math.cos(a);
    const cx=tlx+(w/2)*Math.cos(a)-(h/2)*Math.sin(a),cy=tly+(w/2)*Math.sin(a)+(h/2)*Math.cos(a);
    o.w=w;o.h=h;o.x=cx-w/2;o.y=cy-h/2;if(o.zones)o.zones.forEach(z=>trimCells(o,z));
    showHint(TYPES[o.type].round?`⌀ ${m2(w)} m`:`${m2(w)} × ${m2(h)} m`)}
  renderPlan();
});
function endPtr(e){ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;clearTimeout(holdT);
  if(drag&&ptrs.size===0){
    if(drag.mode==='hold'){if(!editMode&&drag.o.type==='abri'){openInv()}else if(!ctx&&drag.o.type==='serre'&&!editMode){enterSerre(drag.o.id)}else{sheetMode='obj';renderSheet();keepAboveSheet(drag.o)}}
    else if(drag.mode==='pan'&&!drag.moved){if(shapeEdit){shapeEdit.sel=null;renderShapebar()}else{selId=null;sheetMode=null;renderSheet()}renderPlan()}
    else if(drag.mode==='rot'&&drag.moved){save();if(sheetMode)renderSheet()}
    else if((drag.mode==='vtx'&&(drag.moved||drag.inserted))||(drag.mode==='edge'&&drag.moved)){normalizeShape();updateBox();save();renderShapebar()}
    else if(drag.moved&&(drag.mode==='move'||drag.mode==='resize')){fitZones(drag.o);save();if(sheetMode)renderSheet()}
    drag=null;guides=null;$('#hint').hidden=true;lifted=null;liftGrp=null;renderPlan()}}
svg.addEventListener('pointerup',endPtr);svg.addEventListener('pointercancel',endPtr);
svg.addEventListener('wheel',e=>{e.preventDefault();const p=world(e.clientX,e.clientY),r=svg.getBoundingClientRect();view.z=clamp(view.z*Math.exp(-e.deltaY*.0015),.04,6);
  view.cx=p.x-(e.clientX-r.left-r.width/2)/view.z;view.cy=p.y-(e.clientY-r.top-r.height/2)/view.z;renderPlan()},{passive:false});
addEventListener('resize',()=>tab==='plan'&&renderPlan());
function fitZones(o){if(!o||!o.zones)return;const L=Math.max(o.w,o.h);let used=0;o.zones.forEach(z=>{z.len=Math.min(z.len,Math.max(20,L-used));used+=z.len;trimCells(o,z)});o.zones=o.zones.filter((z,i)=>i===0||o.zones.slice(0,i).reduce((s,q)=>s+q.len,0)<L-10)}

/* ombres */
$('#sunBtn').onclick=()=>{shade.on=!shade.on;$('#sunBtn').classList.toggle('on',shade.on);renderSunbar();renderPlan()};
function renderSunbar(){const el=$('#sunbar');el.hidden=!shade.on||tab!=='plan'||!!shapeEdit||!!ctx;if(el.hidden)return;
  const sp=sunPos(shade.doy,shade.hour),alt=Math.round(sp.alt*180/Math.PI),d=dateOfDoy(shade.doy),hh=Math.floor(shade.hour),mm=Math.round((shade.hour-hh)*60);
  const opts=MONTHS.map((m,i)=>{const n=doyOf(new Date(YEAR,i,21,12));return`<option value="${n}" ${Math.abs(n-shade.doy)<15?'selected':''}>21 ${m.slice(0,4)}.</option>`}).join('');
  el.innerHTML=`<div class="row"><select id="sb-d" aria-label="Date">${opts}</select><input id="sb-h" type="range" min="4" max="21" step="0.25" value="${shade.hour}" aria-label="Heure solaire"><span class="mono" style="min-width:44px">${hh} h ${String(mm).padStart(2,'0')}</span></div>
  <span class="note">${alt>2?`Soleil à ${alt}° · heure solaire (en été, ajoute ≈ 1 h 40 à la montre)`:'Soleil couché à cette heure'}</span>`;}
$('#sunbar').addEventListener('input',e=>{if(e.target.id==='sb-h'){shade.hour=+e.target.value;renderSunbar();renderPlan()}});
$('#sunbar').addEventListener('change',e=>{if(e.target.id==='sb-d'){shade.doy=+e.target.value;renderSunbar();renderPlan()}});
function renderShapebar(){const el=$('#shapebar');el.hidden=!shapeEdit||tab!=='plan';$('#sunbar').hidden=!!shapeEdit||!shade.on||tab!=='plan';updateModeUI();if(el.hidden)return;
  const tp=terrainPts(),A=Math.abs(polyArea(tp))/1e4;
  el.innerHTML=`<div class="row between"><b>Forme du terrain</b><span class="mono">${num(A)} m² · ${tp.length} côtés</span></div>
  <span class="note">Glisse un côté pour l'écarter ou le rapprocher, un point rond pour déplacer un coin. Tire un point vert au milieu d'un côté pour créer un coin.</span>
  <div class="row" style="flex-wrap:wrap;gap:6px">${shapeEdit.sel!=null&&tp.length>3?'<button class="btn small danger" data-sh="del">Supprimer le point</button>':''}<button class="btn small" data-sh="rect">Rectangle</button><button class="btn small" data-sh="L">En L</button><button class="btn small" data-sh="trap">Trapèze</button><button class="btn small primary" data-sh="done">Terminer</button></div>`}
function enterSerre(id){shapeEdit=null;ctx=id;selId=null;sheetMode=null;G();renderSheet();fit();renderCtxbar();renderSunbar()}
function exitSerre(){const id=ctx;ctx=null;selId=id;sheetMode=null;renderSheet();fit();renderCtxbar();renderSunbar()}
function renderCtxbar(){const el=$('#ctxbar');const inS=!!ctx&&!!G()&&!!ctx&&tab==='plan';el.hidden=!inS;$('#compass').hidden=!!ctx;updateModeUI();svg.classList.toggle('inserre',!!ctx);
  if(!inS)return;const se=obj(ctx);el.innerHTML=`<button class="iconbtn" data-cx="back" aria-label="Retour au potager"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><div class="t"><b>${esc(se.name)}</b><span class="mono note">Serre · ${m2(se.w)} × ${m2(se.h)} m</span></div><button class="btn small" data-cx="props">Réglages</button>`}
$('#ctxbar').addEventListener('click',e=>{const b=e.target.closest('[data-cx]');if(!b)return;if(b.dataset.cx==='back')exitSerre();else{setEdit(true);selId=ctx;sheetMode='obj';renderSheet();renderPlan()}});
function startShapeEdit(){if(!G().shape){G().shape=rectPts();save()}shapeEdit={sel:null};selId=null;sheetMode=null;renderSheet();fit();renderShapebar()}
$('#shapebar').addEventListener('click',e=>{const b=e.target.closest('[data-sh]');if(!b)return;const a=b.dataset.sh,W=G().w,H=G().h;
  if(a==='done'){shapeEdit=null;renderShapebar();renderPlan();return}
  if(a==='del'&&shapeEdit.sel!=null&&G().shape.length>3){G().shape.splice(shapeEdit.sel,1);shapeEdit.sel=null}
  if(a==='rect')G().shape=rectPts();
  if(a==='L')G().shape=[{x:0,y:0},{x:W,y:0},{x:W,y:snap(H/2,10)},{x:snap(W/2,10),y:snap(H/2,10)},{x:snap(W/2,10),y:H},{x:0,y:H}];
  if(a==='trap')G().shape=[{x:snap(W*.15,10),y:0},{x:snap(W*.85,10),y:0},{x:W,y:H},{x:0,y:H}];
  if(a!=='del')shapeEdit.sel=null;updateBox();save();renderShapebar();renderPlan()});
$('#compass').onclick=()=>{selId=null;sheetMode='menu';renderSheet();renderPlan()};

