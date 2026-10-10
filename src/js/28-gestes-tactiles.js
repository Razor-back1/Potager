/* ================= Gestes tactiles (style iOS) ================= */
let swipedAt=0;
function gesture(el,h){let st=null;
  el.addEventListener('touchstart',e=>{if(e.touches.length!==1){st=null;return}const t=e.touches[0],c=h.start(e,t);st=c?{...c,x0:t.clientX,y0:t.clientY,axis:null}:null},{passive:true});
  /* suivi sur tout le document : la page peut se redessiner pendant le geste (météo qui arrive) */
  document.addEventListener('touchmove',e=>{if(!st)return;const t=e.touches[0],dx=t.clientX-st.x0,dy=t.clientY-st.y0;
    if(!st.axis){if(Math.hypot(dx,dy)<8)return;st.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';if(st.want&&st.axis!==st.want){h.end(st,0,0,true);st=null;return}}
    if(h.move(st,dx,dy)===true&&e.cancelable)e.preventDefault()},{passive:false});
  document.addEventListener('touchend',e=>{if(!st)return;const t=e.changedTouches[0];h.end(st,t.clientX-st.x0,t.clientY-st.y0,false);st=null},{passive:true});
  document.addEventListener('touchcancel',()=>{if(st){h.end(st,0,0,true);st=null}},{passive:true})}
/* menu du bas : glisser vers le bas pour fermer */
gesture(sheet,{start:(e)=>{if(!sheetMode||sheet.scrollTop>2)return null;if(e.target.closest('input,select,textarea,.seg,[data-noswipe]'))return null;return{want:'y'}},
  move:(st,dx,dy)=>{if(dy<=0){sheet.style.transform='';return false}sheet.classList.add('dragging');sheet.style.transform=`translateY(${dy}px)`;return true},
  end:(st,dx,dy,cancel)=>{sheet.classList.remove('dragging');if(!cancel&&dy>90){sheet.style.transform=`translateY(100%)`;setTimeout(()=>{sheet.style.transform='';sheetMode=null;selId=null;if(shapeEdit===null)renderSheet();renderPlan()},180)}else sheet.style.transform=''}});
/* planche et abri : glisser depuis le bord gauche pour revenir */
[['#bedView'],['#invView'],['#autoView']].forEach(([sel])=>{const el=$(sel);gesture(el,{start:(e,t)=>t.clientX<28?{want:'x'}:null,
  move:(st,dx)=>{if(dx<=0)return false;el.classList.add('dragging');el.style.transform=`translateX(${dx}px)`;return true},
  end:(st,dx,dy,cancel)=>{el.classList.remove('dragging');if(!cancel&&dx>90){el.style.transform='translateX(100%)';setTimeout(()=>{el.style.transform='';const b=el.querySelector('.bedhead .iconbtn');if(b)b.click()},180)}else el.style.transform=''}})});
/* Aujourd'hui : glisser une ligne à gauche (arrosé / récolte), tirer vers le bas pour actualiser */
gesture($('#v-today'),{start:(e,t)=>{const r=e.target.closest('[data-sw]');if(r)return{row:r,want:'x'};const v=$('#v-today');return v.scrollTop<=0?{ptr:true,want:'y'}:null},
  move:(st,dx,dy)=>{if(st.row){if(dx>=0){st.row.style.transform='';return false}st.row.style.transition='none';st.row.style.transform=`translateX(${Math.max(dx,-140)}px)`;return true}
    if(st.ptr){if(dy<=0)return false;const h=Math.min(80,dy*.5),p=$('#ptr');if(p){p.style.height=h+'px';p.classList.toggle('go',h>=56);$('#ptrt').textContent=h>=56?'Relâche pour actualiser':'Tire pour actualiser la météo'}return true}},
  end:(st,dx,dy,cancel)=>{if(st.row){const r=st.row.isConnected?st.row:(document.querySelector(`[data-sw="${st.row.dataset.sw}"]`)||st.row);r.style.transition='';if(!cancel&&dx<-80){swipedAt=Date.now();r.style.transform='translateX(-100%)';const[k,a,b,c]=r.dataset.sw.split(':');
      setTimeout(()=>{if(k==='w'){const o=obj(a);if(o){o.journal=o.journal||[];o.journal.push({id:uid(),k:'arrosage',d:iso(TODAY),t:''});save();toast('Arrosage noté : '+o.name,true)}renderToday()}
        else if(k==='h'){r.style.transform='';openBed(a,+b,'recolte',true);const sel=$('#j-crop');if(sel)sel.value=c;const kg=$('#j-kg');if(kg)kg.focus()}},200)}
      else{if(Math.abs(dx)>8)swipedAt=Date.now();r.style.transform=''}return}
    if(st.ptr){const p=$('#ptr');const go=p&&p.classList.contains('go');if(p){p.style.transition='height .2s';p.style.height=go?'44px':'0px';if(go)$('#ptrt').textContent='Actualisation…'}
      if(go&&!cancel){syncStation(true).finally(()=>{const q=$('#ptr');if(q){q.style.height='0px'}})}else setTimeout(()=>{const q=$('#ptr');if(q)q.style.transition=''},250)}}});

gesture($('#qsheet'),{start:(e)=>{const el=$('#qsheet');if(!q||el.scrollTop>2||e.target.closest('input,select,textarea,.qlist'))return null;return{want:'y'}},
  move:(st,dx,dy)=>{const el=$('#qsheet');if(dy<=0){el.style.transform='';return false}el.classList.add('dragging');el.style.transform=`translateY(${dy}px)`;return true},
  end:(st,dx,dy,cancel)=>{const el=$('#qsheet');el.classList.remove('dragging');if(!cancel&&dy>90){el.style.transform='translateY(100%)';setTimeout(()=>{el.style.transform='';closeQ()},180)}else el.style.transform=''}});
$('#noteBtnPlan').onclick=()=>openQ();

