/* ================= Compagnonnage & rotation ================= */
function aabb(o){const a=o.rot*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));const bw=o.w*c+o.h*s,bh=o.w*s+o.h*c,cx=o.x+o.w/2,cy=o.y+o.h/2;return{x0:cx-bw/2,y0:cy-bh/2,x1:cx+bw/2,y1:cy+bh/2}}
function gap(a,b){const A=aabb(a),B=aabb(b);return Math.hypot(Math.max(0,B.x0-A.x1,A.x0-B.x1),Math.max(0,B.y0-A.y1,A.y0-B.y1))}
const neighbors=o=>homeOf(o).objs.filter(p=>p!==o&&TYPES[p.type]&&TYPES[p.type].plant&&gap(o,p)<=80);
function conflicts(o){
  const out=new Map();const mine=o.zones.filter(z=>z.crop);
  mine.forEach((z,i)=>mine.slice(i+1).forEach(z2=>{if(compat(z.crop,z2.crop)<0)out.set(rk(z.crop,z2.crop)+'|in',{a:z.crop,b:z2.crop,where:'dans la même planche'})}));
  neighbors(o).forEach(n=>mine.forEach(z=>n.zones.forEach(z2=>{if(z2.crop&&compat(z.crop,z2.crop)<0)out.set(rk(z.crop,z2.crop)+n.id,{a:z.crop,b:z2.crop,where:'avec '+n.name})})));
  return[...out.values()];
}
function rotIssue(o,crop,Y){if(!crop||crop==='fraise'||!P[crop]||FLW()||VRG())return null;const f=P[crop].f;
  return(o.grown||[]).filter(g=>g.y<Y&&g.y>=Y-ROT_YEARS&&P[g.crop]&&g.crop!=='fraise'&&P[g.crop].f===f).sort((a,b)=>b.y-a.y)[0]||null}
function rotIssues(o){if(FLW()||VRG())return[];const out=[];o.zones.forEach(z=>{const r=rotIssue(o,z.crop,yearOf(z));if(r)out.push({crop:z.crop,prev:r})});return out}
function recordGrown(o,crop,y){if(!crop)return;o.grown=o.grown||[];if(!o.grown.some(g=>g.y===y&&g.crop===crop))o.grown.push({y,crop})}
function advice(present){
  const good=new Set(),bad=new Set();
  present.forEach(c=>PLANTS.forEach(p=>{const r=compat(c,p.id);if(r>0)good.add(p.id);if(r<0)bad.add(p.id)}));
  bad.forEach(b=>good.delete(b));present.forEach(c=>good.delete(c));
  return{good:[...good],bad:[...bad]};
}
const chip=(id,cls='',btn=false)=>btn?`<button class="chip ${cls}" data-act="setcrop" data-crop="${id}">${ci((P[id]).id)}${P[id].n}</button>`:`<span class="chip ${cls}">${ci((P[id]).id)}${P[id].n}</span>`;
function blockUntil(o){let t=null;(o.journal||[]).forEach(e=>{if(e.k==='traitement'&&e.dar>0){const u=addD(e.d,+e.dar);if(u>TODAY&&(!t||u>t))t=u}});return t}

