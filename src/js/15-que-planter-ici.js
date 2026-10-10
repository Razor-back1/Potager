/* ================= Que planter ici ? ================= */
function whatPlant(o,zi,date){const z=o.zones[zi],D=parse(date),m=D.getMonth()+1,mN=m%12+1,Y=D.getFullYear(),inS=!!serreOf(o);
  const others=[...new Set([...o.zones.filter((q,i)=>i!==zi&&q.crop).map(q=>q.crop),...neighbors(o).flatMap(n=>n.zones.filter(q=>q.crop).map(q=>q.crop))])];
  const out=[];
  PLANTS.forEach(p=>{if(p.id===z.crop)return;const now=p.m.includes(m),next=p.m.includes(mN);if(!now&&!next)return;
    let sow=now?D:new Date(Y+(mN<m?1:0),mN-1,1,12);
    if(FROST_SENSITIVE.has(p.id)&&!inS){const safe=new Date(sow.getFullYear(),4,15,12);if(sow<safe)sow=safe}
    const hv=addD(iso(sow),p.j);
    if(FROST_SENSITIVE.has(p.id)&&!inS&&hv>new Date(sow.getFullYear(),9,15,12))return;
    let score=0;const rs=[];
    const sc=sunCheck(o,zi,p.id,iso(sow));if(sc){if(sc.lvl==='ok'){score+=2;rs.push(['ok','☀ '+num(sc.h)+' h'])}else if(sc.lvl==='juste')rs.push(['warn','soleil juste']);else{score-=4;rs.push(['bad','trop d\'ombre'])}}
    const ri=rotIssue(o,p.id,Y);if(ri){score-=4;rs.push(['bad','rotation : '+P[ri.crop].n.toLowerCase()+' en '+ri.y])}
    const gd=others.filter(c=>compat(c,p.id)>0),bd=others.filter(c=>compat(c,p.id)<0);
    if(gd.length){score+=Math.min(2,gd.length);rs.push(['ok','ami de '+gd.map(c=>P[c].n.toLowerCase()).join(', ')])}
    if(bd.length){score-=4;rs.push(['bad','gêné par '+bd.map(c=>P[c].n.toLowerCase()).join(', ')])}
    if((S.stock||[]).some(q=>q.cat==='graine'&&q.crop===p.id&&stockOf(q)>0&&!expired(q))){score+=1;rs.push(['ok','graines en stock'])}
    if(nurseryReady().some(n=>n.crop===p.id)){score+=2;rs.push(['ok','plants prêts à repiquer'])}
    if(!now)rs.push(['warn','à partir de '+MONTHS[mN-1]]);
    out.push({p,score,rs,hv,sow:iso(sow)})});
  const clean=out.filter(x=>!x.rs.some(r=>r[0]==='bad'));return(clean.length?clean:out.filter(x=>x.score>-3)).sort((a,b)=>b.score-a.score||a.hv-b.hv).slice(0,6)}
function suggestHTML(o,zi,date,act){const L=whatPlant(o,zi,date);
  if(!L.length)return`<p class="note">Rien de vraiment adapté à semer ici vers le ${fdate(parse(date))}. Un engrais vert ou un paillage protégera le sol en attendant.</p>`;
  return`<div class="sugg">${L.map(x=>`<div class="sg">${ci((x.p).id)}<div style="min-width:0"><b>${x.p.n}</b> <span class="note">· récolte vers le ${fdate(x.hv)}</span><div class="rs">${x.rs.map(r=>`<span class="${r[0]}">${esc(r[1])}</span>`).join('')}</div></div><button class="btn small ${act==='setcrop'?'primary':''}" data-act="${act}" data-crop="${x.p.id}" data-date="${x.sow}">${act==='setcrop'?'Planter':'Prévoir'}</button></div>`).join('')}</div>`}
