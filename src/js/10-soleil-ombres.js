/* ================= Soleil & ombres ================= */
function sunPos(doy,hour){const d=23.44*Math.sin(2*Math.PI*(284+doy)/365)*Math.PI/180,H=(hour-12)*15*Math.PI/180;
  const alt=Math.asin(Math.sin(LAT)*Math.sin(d)+Math.cos(LAT)*Math.cos(d)*Math.cos(H));
  const az=Math.atan2(Math.sin(H),Math.cos(H)*Math.sin(LAT)-Math.tan(d)*Math.cos(LAT))+Math.PI;return{alt,az}}
function shadowVec(sp,h){if(sp.alt<.04)return null;const L=Math.min(h/Math.tan(sp.alt),4000),t=sp.az+Math.PI+S.north*Math.PI/180;return{x:Math.sin(t)*L,y:-Math.cos(t)*L}}
function basePts(o){const cx=o.x+o.w/2,cy=o.y+o.h/2;
  if(TYPES[o.type].round)return Array.from({length:18},(_,i)=>{const a=i/18*2*Math.PI;return{x:cx+Math.cos(a)*o.w/2,y:cy+Math.sin(a)*o.w/2}});
  const a=o.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return[[-1,-1],[1,-1],[1,1],[-1,1]].map(([i,j])=>{const lx=i*o.w/2,ly=j*o.h/2;return{x:cx+lx*c-ly*s,y:cy+lx*s+ly*c}})}
function hull(pts){pts=pts.slice().sort((a,b)=>a.x-b.x||a.y-b.y);const cr=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);const lo=[],up=[];
  for(const p of pts){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p)}
  for(const p of pts.reverse()){while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p)}
  return lo.slice(0,-1).concat(up.slice(0,-1))}
/* haie courbée : découpée en tronçons pour que l'ombre suive la courbe */
function baseParts(o){if(!(o.type==='haie'&&o.bend))return[basePts(o)];const N=12,cx=o.x+o.w/2,cy=o.y+o.h/2,a=o.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),L=o.w-o.h,t=o.h/2;
  const pt=u=>{const x=-L/2+u*L,y=-2*o.bend*2*u*(1-u);return{x,y}},W=(x,y)=>({x:cx+x*c-y*s,y:cy+x*s+y*c}),out=[];
  for(let i=0;i<N;i++){const p=pt(i/N),q=pt((i+1)/N),dx=q.x-p.x,dy=q.y-p.y,l=Math.hypot(dx,dy)||1,nx=-dy/l*t,ny=dx/l*t;out.push([W(p.x+nx,p.y+ny),W(q.x+nx,q.y+ny),W(q.x-nx,q.y-ny),W(p.x-nx,p.y-ny)])}return out}
function shadowPolys(o,sp){const h=+o.height||0;if(h<=0)return[];const v=shadowVec(sp,h);if(!v)return[];const k0=o.type==='arbre'?.3:0;
  return baseParts(o).map(b=>hull([...b.map(p=>({x:p.x+v.x*k0,y:p.y+v.y*k0})),...b.map(p=>({x:p.x+v.x,y:p.y+v.y}))]))}
function shadowPoly(o,sp){return shadowPolys(o,sp)[0]||null}
function inPoly(pt,poly){let ins=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>pt.y)!==(b.y>pt.y)&&pt.x<(b.x-a.x)*(pt.y-a.y)/(b.y-a.y)+a.x)ins=!ins}return ins}
function sunHoursAt(c,home,excl,doy){let n=0;const casters=home.objs.filter(q=>q!==excl&&+q.height>0);
  for(let h=3.25;h<=20.75;h+=.5){const sp=sunPos(doy,h);if(sp.alt<.04)continue;if(!casters.some(q=>shadowPolys(q,sp).some(p=>inPoly(c,p))))n+=.5}return n}
function sunHours(o,doy){return sunHoursAt({x:o.x+o.w/2,y:o.y+o.h/2},homeOf(o),o,doy)}
/* ---- besoin en soleil des cultures (heures de soleil direct par jour) ---- */
const SUN_NEED0={laitue_h:3,tomate:6,poivron:6,aubergine:6,courgette:6,concombre:6,potiron:6,mais:6,haricot:6,basilic:6,fraise:6,pdt:6,
  carotte:4,betterave:4,poireau:4,oignon:5,ail:5,pois:4,feve:4,chou:4,celeri:4,fenouil:5,blette:4,persil:3,laitue:3,epinard:3,mache:3,radis:3};
const SUN_NEED={...SUN_NEED0,...Object.fromEntries(FLOWERS.map(p=>[p.id,p.sun]))};
const sunLabel=n=>n>=6?'plein soleil':n>=4?'soleil ou mi-ombre':'supporte la mi-ombre';
function zoneCenter(o,zi){let off=0;for(let i=0;i<zi;i++)off+=o.zones[i].len;const L=Math.max(o.w,o.h),u=off+o.zones[zi].len/2-L/2,horiz=o.w>=o.h;
  const lx=horiz?u:0,ly=horiz?0:u,a=o.rot*Math.PI/180;return{x:o.x+o.w/2+lx*Math.cos(a)-ly*Math.sin(a),y:o.y+o.h/2+lx*Math.sin(a)+ly*Math.cos(a)}}
/* jour représentatif : le milieu de la culture, ramené entre avril et mi-septembre */
function growDoy(crop,date){const p=P[crop];let d=doyOf(parse(date||iso(TODAY)))+Math.round((p?p.j:60)/2);d=((d-1)%365)+1;
  if(d>=91&&d<=258)return d;return d>258&&d<=330?258:91}
let sunCache=new Map(),sunCacheFor=null;
function sunCheck(o,zi,crop,date){if(serreOf(o)||!crop||!SUN_NEED[bid(crop)])return null;if(sunCacheFor!==lastJSON){sunCache=new Map();sunCacheFor=lastJSON}
  const doy=growDoy(crop,date),key=o.id+'|'+zi+'|'+doy;let h=sunCache.get(key);if(h==null){h=sunHoursAt(zoneCenter(o,zi),homeOf(o),o,doy);sunCache.set(key,h)}const need=SUN_NEED[bid(crop)];
  return{h,need,doy,lvl:h>=need?'ok':h>=need-1.5?'juste':'insuffisant'}}
function sunIssues(o){const out=[];o.zones.forEach((z,i)=>{const c=sunCheck(o,i,z.crop,z.date);if(c&&c.lvl!=='ok')out.push({crop:z.crop,...c})});return out}
function sunMax(doy){let n=0;for(let h=3.25;h<=20.75;h+=.5)if(sunPos(doy,h).alt>=.04)n+=.5;return n}

