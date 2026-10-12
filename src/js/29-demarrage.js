/* ================= Démarrage ================= */
function themePref(){try{return localStorage.getItem('potager-theme')||'auto'}catch(e){return'auto'}}
function setTheme(k){try{localStorage.setItem('potager-theme',k)}catch(e){}applyTheme()}
function uiPref(){try{return localStorage.getItem('potager-ui')||'glass'}catch(e){return'glass'}}
function setUI(k){try{localStorage.setItem('potager-ui',k)}catch(e){}applyTheme()}
const UI_BAR={glass:'#0d1411',ios:'#f2f2f7',widgets:'#f3f4f0'};
function applyTheme(){let u=uiPref();if(!['classic','ios','glass','widgets'].includes(u))u='glass';const k=u==='glass'?'dark':u==='classic'?themePref():'light',r=document.documentElement;r.dataset.ui=u;if(k==='auto')delete r.dataset.theme;else r.dataset.theme=k;
  const dark=k==='dark'||(k==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);document.querySelectorAll('meta[name="theme-color"]').forEach(m=>m.setAttribute('content',UI_BAR[u]||(dark?'#1d1e20':'#fafbf6')))}
applyTheme();
let seenHelp=false;try{seenHelp=!!localStorage.getItem('potager-aide-vue');localStorage.setItem('potager-aide-vue','1')}catch(e){}
if(!seenHelp)sheetMode='help';
renderHeader();requestAnimationFrame(()=>{fit();renderSheet();setTab('today')});
initCaps();
setTimeout(()=>syncStation(false),600);
