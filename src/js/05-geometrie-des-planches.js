/* ================= Géométrie des planches ================= */
function zoneGrid(o,z){
  const p=P[z.crop];if(!p)return null;
  const W=Math.min(o.w,o.h);
  if(o.type==='fruitier')return{cols:1,rows:1,cellL:z.len,cellW:W,per:1};
  const cols=Math.max(1,Math.floor(z.len/Math.max(p.pl,15))),rows=Math.max(1,Math.floor(W/Math.max(p.rang,15)));
  const cellL=z.len/cols,cellW=W/rows;
  return{cols,rows,cellL,cellW,per:Math.max(1,Math.round(cellL/p.pl))*Math.max(1,Math.round(cellW/p.rang))};
}
function fillZone(o,z,date,frac=1){const g=zoneGrid(o,z);if(!g)return;for(let r=0;r<g.rows;r++)for(let c=0;c<Math.ceil(g.cols*frac);c++)if(!z.cells[r+'-'+c])z.cells[r+'-'+c]=date}
function trimCells(o,z){const g=zoneGrid(o,z);if(!g){z.cells={};return}for(const k in z.cells){const[r,c]=k.split('-').map(Number);if(r>=g.rows||c>=g.cols)delete z.cells[k]}}
const zoneArea=(o,z)=>z.len*Math.min(o.w,o.h)/1e4;
/* contenance d'une cuve cylindrique : π r² h, en litres */
const cuveL=o=>o.type==='citerne'?(+o.vol||0):Math.PI*(o.w/2)**2*(+o.height||0)/1000;
function tankCap(){const cs=allObjs().filter(o=>o.type==='cuve'&&+o.height>0||o.type==='citerne'&&+o.vol>0);return cs.length?{n:cs.length,cap:Math.round(cs.reduce((s,o)=>s+cuveL(o),0))}:null}

