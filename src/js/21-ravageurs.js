/* ================= Ravageurs et maladies de saison ================= */
const PESTS=[
 {n:'Doryphore',c:['pdt','aubergine','tomate'],m:[5,6,7,8],t:'Inspecte le revers des feuilles, écrase les pontes orange et ramasse les adultes.'},
 {n:'Mildiou',c:['tomate','pdt'],m:[6,7,8,9],t:'Évite de mouiller le feuillage, aère, retire les feuilles tachées dès les premiers signes.'},
 {n:'Piéride du chou',c:['chou'],m:[5,6,7,8,9],t:'Un filet anti-insectes empêche la ponte ; retire les chenilles à la main.'},
 {n:'Altise',c:['radis','chou'],m:[4,5,6],t:'Garde le sol frais par des arrosages légers, un voile protège les jeunes plants.'},
 {n:'Mouche de la carotte',c:['carotte','persil','celeri'],m:[5,6,8,9],t:'Voile anti-insectes, et évite d\'éclaircir par temps calme.'},
 {n:'Teigne du poireau',c:['poireau','oignon','ail'],m:[4,5,8,9,10],t:'Voile anti-insectes en période de vol, coupe les feuilles atteintes.'},
 {n:'Mouche de l\'oignon',c:['oignon','poireau'],m:[5,6],t:'Voile, et associe avec les carottes.'},
 {n:'Puceron noir',c:['feve','haricot'],m:[4,5,6],t:'Pince la tête des fèves dès l\'apparition des colonies ; savon noir si besoin.'},
 {n:'Limaces',c:['laitue','laitue_h','chou','courgette','fraise','mache','epinard','haricot'],m:[3,4,5,6,9,10],t:'Ronde le soir après la pluie, pièges à bière, paillage sec autour des plants.'},
 {n:'Oïdium',c:['courgette','concombre','potiron','pois'],m:[7,8,9],t:'Arrose au pied, retire les feuilles blanches ; le soufre agit en préventif.'},
 {n:'Botrytis',c:['fraise','laitue','laitue_h','tomate'],m:[5,6,9,10],t:'Aère, retire les parties pourries, évite les arrosages tardifs.'}];
PESTS.push(...FL_PESTS);
function pestsNow(){const mo=TODAY.getMonth()+1,inPlace=[];plantables().forEach(o=>o.zones.forEach(z=>{if(z.crop&&Object.keys(z.cells).length)inPlace.push({o,crop:z.crop})}));
  return PESTS.filter(p=>p.m.includes(mo)).map(p=>({...p,where:inPlace.filter(x=>p.c.includes(x.crop))})).filter(p=>p.where.length)}
const MABR=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const mRange=ms=>{const a=Math.min(...ms),b=Math.max(...ms);return MABR[a-1]+(a!==b?'–'+MABR[b-1]:'')};

