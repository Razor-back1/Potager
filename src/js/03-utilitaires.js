/* ================= Utilitaires ================= */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,9);
const TODAY=new Date();TODAY.setHours(12,0,0,0);
const YEAR=TODAY.getFullYear();
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const parse=s=>{const[y,m,d]=String(s).split('-').map(Number);return new Date(y,(m||1)-1,d||1,12)};
const addD=(s,n)=>{const d=parse(s);d.setDate(d.getDate()+n);return d};
const days=(a,b)=>Math.round((b-a)/864e5);
const fdate=d=>d.toLocaleDateString('fr-BE',{day:'numeric',month:'short',year:d.getFullYear()!==YEAR?'numeric':undefined});
const m2=cm=>(cm/100).toLocaleString('fr-BE',{minimumFractionDigits:2,maximumFractionDigits:2});
const num=(v,d=1)=>Number(v).toLocaleString('fr-BE',{maximumFractionDigits:d});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const snap=(v,s=5)=>Math.round(v/s)*s;
const doyOf=d=>Math.round((d-new Date(d.getFullYear(),0,1,12))/864e5)+1;
const dateOfDoy=n=>{const d=new Date(YEAR,0,1,12);d.setDate(n);return d};
const yearOf=z=>parse(z.date||iso(TODAY)).getFullYear();


