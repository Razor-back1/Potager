/* ================= Météo vivante sur le plan (jamais en mode édition) ================= */
const wxPlanOn=()=>{try{return localStorage.getItem('potager-wxplan')!=='off'}catch(e){return true}};
const liveWx=()=>wxPlanOn()&&!editMode&&!shapeEdit&&tab==='plan'&&!!wx;
function solarNow(){const d=new Date();return d.getHours()+d.getMinutes()/60+d.getTimezoneOffset()/60+geoOr().lon/15}
let wxLayerKey='';
function renderWxLayer(){const el=$('#wxlayer');if(!el)return;
  if(!liveWx()||!wx.cur){el.hidden=true;wxLayerKey='';return}
  const k=wxKind(wx.cur.code),hr=new Date().getHours(),night=!wx.cur.isDay;
  const frost=(wx.now&&wx.now.t!=null&&wx.now.t<=1)||(wx.night!=null&&wx.night<=0&&(hr>=18||hr<9));
  const wet=!ctx&&['rain','drizzle','showers','storm'].includes(k),snow=!ctx&&k==='snow',fog=!ctx&&k==='fog';
  const cls=[night?'night':'',frost&&!ctx?'frost':'',wet?'wet':'',k==='rain'||k==='storm'?'heavy':'',k==='storm'&&!ctx?'storm':'',snow?'snowy':'',fog?'foggy':''].filter(Boolean);
  const key=cls.join(' ');if(!key){el.hidden=true;wxLayerKey='';return}
  el.hidden=false;if(key===wxLayerKey)return;wxLayerKey=key;el.className='wxlayer '+key;
  let h='';const R=(n,f)=>Array.from({length:n},(_,i)=>f(i)).join('');
  if(wet)h+=R(k==='drizzle'?26:46,i=>`<i class="dr" style="left:${(i*37%100)+Math.random()*2}%;animation-delay:${(Math.random()*1.2).toFixed(2)}s;animation-duration:${(.55+Math.random()*.35).toFixed(2)}s"></i>`);
  if(snow)h+=R(36,i=>`<i class="fl" style="left:${(i*29%100)+Math.random()*3}%;animation-delay:${(Math.random()*6).toFixed(2)}s;animation-duration:${(5+Math.random()*4).toFixed(2)}s"></i>`);
  if(fog)h+='<i class="fg a"></i><i class="fg b"></i>';
  if(k==='storm'&&!ctx)h+='<i class="flash"></i>';
  el.innerHTML=h}

