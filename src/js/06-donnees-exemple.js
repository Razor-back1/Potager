/* ================= Données exemple ================= */
function sampleFlowers(){const d=(m,dd,y=YEAR)=>`${y}-${String(m).padStart(2,'0')}-${String(dd).padStart(2,'0')}`,objs=[];
  const add=(type,x,yy,w,h,ex={})=>{const o={id:uid(),type,x,y:yy,w,h,rot:0,name:TYPES[type].l,height:TYPES[type].ht||0,locked:false,...ex};if(TYPES[type].plant){o.zones=o.zones||[];o.grown=[];o.journal=[]}objs.push(o);return o};
  const bed=(name,x,y,w,h,zs,J=[])=>{const o=add('planche',x,y,w,h,{name});o.zones=zs.map(([c,len,date,frac])=>{const z={id:uid(),crop:c,len,date,cells:{}};fillZone(o,z,date,frac||1);return z});o.grown=zs.map(([c,,date])=>({y:parse(date).getFullYear(),crop:c}));o.journal=J.map(([k,dd,ex])=>({id:uid(),k,d:dd,...ex}));return o};
  add('haie',0,0,1600,80,{name:'Haie de charmes',locked:true});
  bed('Massif de vivaces',150,200,140,700,[['f_echinacea',180,d(4,10,YEAR-1)],['f_lavande',160,d(4,10,YEAR-1)],['f_aster',180,d(4,10,YEAR-1)],['f_nepeta',180,d(4,10,YEAR-1)]],[['amendement',d(3,15),{t:'Compost en surface'}]]);
  bed('Fleurs à couper',380,200,120,700,[['f_dahlia',300,d(5,15)],['f_cosmos',200,d(5,20)],['f_zinnia',200,d(5,25)]],[['recolte',d(8,20),{crop:'f_dahlia',kg:24,u:'tiges'}],['recolte',d(9,5),{crop:'f_cosmos',kg:30,u:'tiges'}],['recolte',d(9,20),{crop:'f_dahlia',kg:35,u:'tiges'}],['recolte',d(8,25,YEAR-1),{crop:'f_dahlia',kg:40,u:'tiges'}],['recolte',d(9,1,YEAR-1),{crop:'f_zinnia',kg:22,u:'tiges'}]]);
  bed('Bordure de bulbes',600,200,90,700,[['f_tulipe',350,d(10,20,YEAR-1)],['f_narcisse',350,d(10,20,YEAR-1)]]);
  bed('Massif d\'ombre',800,200,140,500,[['f_hosta',250,d(4,1,YEAR-1)],['f_digitale',250,d(9,20,YEAR-1)]]);
  add('allee',150,960,800,70,{name:'Allée'});
  add('arbre',1050,250,400,400,{name:'Érable',height:900});
  add('alleeo',1050,750,300,300,{name:'Allée ronde',ring:60});
  add('abri',1380,850,180,160,{name:'Abri'});
  return{v:8,kind:'fleurs',stock:[{id:'g-cos',name:'Cosmos « Sensation »',crop:'f_cosmos',cat:'graine',unit:'graines',min:0,moves:[{d:d(2,1),q:100}]}],nursery:[],rain:[],name:'Jardin de fleurs exemple',w:1600,h:1100,north:0,water:{roof:30,cap:500,level:300},frost:null,objs,example:true}}
function sample(){
  const d=(m,dd,y=YEAR)=>`${y}-${String(m).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
  const objs=[];
  const add=(type,x,yy,w,h,ex={})=>{const o={id:uid(),type,x,y:yy,w,h,rot:0,name:TYPES[type].l,height:TYPES[type].ht||0,locked:false,...ex};if(TYPES[type].plant){o.zones=o.zones||[];o.grown=o.grown||[];o.journal=o.journal||[]}objs.push(o);return o};
  add('haie',0,0,1800,60,{name:'Haie de charmes',locked:true});
  add('abri',20,300,150,220,{name:'Abri à outils'});
  const plan=[[['tomate',400,d(5,10)],['basilic',200,d(5,20)]],[['carotte',300,d(4,15)],['poireau',300,d(5,1)]],[['haricot',300,d(6,1)],['oignon',300,d(3,20)]],[['ail',600,d(10,2),.5]],[['mache',300,d(9,15)],['epinard',300,d(9,10)]],[]];
  const past=[[['pdt',YEAR-1],['carotte',YEAR-2]],[['haricot',YEAR-1],['chou',YEAR-2]],[['chou',YEAR-1]],[['tomate',YEAR-1],['oignon',YEAR-2]],[['courgette',YEAR-1]],[['laitue',YEAR-1]]];
  const J=[
    [['recolte',d(8,12),{crop:'tomate',kg:4.2}],['recolte',d(9,2),{crop:'tomate',kg:3.1}],['traitement',d(10,1),{pid:'bouillie',prod:'Bouillie bordelaise',qty:0.2,unit:'kg',dar:14,t:'Mildiou sur 3 pieds'}],['arrosage',d(9,20),{t:'Arrosoir, 40 L'}],['maladie',d(9,30),{crop:'tomate',t:'Taches brunes sur les feuilles du bas, duvet blanc au revers',diag:{diagnostic:'Mildiou de la tomate',confiance:'moyenne'}}],['recolte',d(8,20,YEAR-1),{crop:'pdt',kg:18}]],
    [['amendement',d(3,10),{pid:'compost',prod:'Compost mûr',qty:120,unit:'kg',t:'2 brouettes'}],['semis',d(4,15),{pid:'g-car',prod:'Carotte « Nantaise »',crop:'carotte',qty:3,unit:'g'}],['recolte',d(8,25),{crop:'carotte',kg:6}],['recolte',d(8,10,YEAR-1),{crop:'haricot',kg:2.8}]],
    [['recolte',d(8,1),{crop:'oignon',kg:5}],['recolte',d(8,15),{crop:'haricot',kg:3.4}]],
    [['recolte',d(9,1,YEAR-1),{crop:'tomate',kg:6.5}],['amendement',d(10,1),{pid:'corne',prod:'Corne broyée',qty:0.5,unit:'kg',t:'Avant plantation de l\'ail'}],['note',d(10,2),{t:'Ail violet de Cadours, caïeux à 10 cm'}]],
    [['recolte',d(8,5,YEAR-1),{crop:'courgette',kg:12}],['semis',d(9,15),{pid:'g-mache',prod:'Mâche « Verte de Cambrai »',crop:'mache',qty:4,unit:'g'}]],[]];
  plan.forEach((zs,i)=>{const o=add('planche',200+i*170,250,120,600,{name:'Planche '+(i+1)});o._i=i;
    o.zones=zs.map(([c,len,date,frac])=>{const z={id:uid(),crop:c,len,date,cells:{}};fillZone(o,z,date,frac||1);return z});
    if(!zs.length)o.zones=[{id:uid(),crop:null,len:600,date:iso(TODAY),cells:{}}];
    o.grown=[...past[i].map(([c,y])=>({y,crop:c})),...zs.map(([c,,date])=>({y:parse(date).getFullYear(),crop:c}))];
    o.journal=J[i].map(([k,dd,ex])=>({id:uid(),k,d:dd,...ex}));if(i===2)o.zones[0].next=[{id:uid(),crop:'feve',date:d(10,20)}];delete o._i});
  add('allee',200,880,970,80,{name:'Allée principale'});
  const se=add('serre',1300,250,300,600,{name:'Serre tunnel'});
  const ip=(name,x,zs)=>{const o={id:uid(),type:'planche',x,y:20,w:90,h:560,rot:0,name,height:0,locked:false,grown:[],journal:[],zones:[]};
    o.zones=zs.map(([c,len,date])=>{const z={id:uid(),crop:c,len,date,cells:{}};fillZone(o,z,date);o.grown.push({y:parse(date).getFullYear(),crop:c});return z});return o};
  se.inner={objs:[ip('Planche S1',20,[['tomate',560,d(5,2)]]),{id:uid(),type:'allee',x:110,y:20,w:80,h:560,rot:0,name:'Allée',height:0,locked:false},ip('Planche S2',190,[['poivron',280,d(5,5)],['basilic',280,d(5,5)]])]};
  se.inner.objs[0].grown.push({y:YEAR-1,crop:'concombre'});se.inner.objs[0].journal.push({id:uid(),k:'arrosage',d:d(10,5),t:'Arrosoir, 20 L'});se.inner.objs[2].journal.push({id:uid(),k:'arrosage',d:d(10,5),t:'Arrosoir, 20 L'});se.inner.objs[0].journal.push({id:uid(),k:'recolte',d:d(8,30),crop:'tomate',kg:9.4});
  add('cuve',1650,110,110,110,{name:'Cuve à eau'});
  add('eau',1210,1010,60,60,{name:'Robinet'});
  add('prise',1255,895,30,30,{name:'Prise'});
  add('arbre',1300,900,260,260,{name:'Pommier',height:450});
  add('compost',1640,1010,120,120,{name:'Compost'});
  add('cloture',0,1190,1800,10,{name:'Clôture',locked:true});
  const stock=[
    {id:'compost',name:'Compost mûr',cat:'amendement',unit:'kg',min:50,moves:[{d:d(2,20),q:400,k:'achat'}]},
    {id:'corne',name:'Corne broyée',cat:'amendement',unit:'kg',min:0.5,moves:[{d:d(3,1),q:2.5,k:'achat'}]},
    {id:'purin',name:"Purin d'ortie",cat:'amendement',unit:'L',min:2,moves:[{d:d(5,15),q:10,k:'achat'},{d:d(8,30),q:-8.5,k:'correction'}]},
    {id:'bouillie',name:'Bouillie bordelaise',cat:'traitement',unit:'kg',min:0.25,dar:14,moves:[{d:d(4,2),q:1,k:'achat'}]},
    {id:'savon',name:'Savon noir',cat:'traitement',unit:'L',min:0.2,dar:0,moves:[{d:d(4,2),q:1,k:'achat'}]},
    {id:'g-tom',name:'Tomate',variety:'Cœur de bœuf',crop:'tomate',cat:'graine',unit:'graines',min:10,exp:YEAR+2,moves:[{d:d(2,1),q:40,k:'achat'}]},
    {id:'g-lait',name:"Laitue d'hiver",variety:"Merveille d'hiver",crop:'laitue_h',cat:'graine',unit:'graines',min:50,exp:YEAR+1,moves:[{d:d(8,20),q:300,k:'achat'}]},
    {id:'g-mache',name:'Mâche',variety:'Verte de Cambrai',crop:'mache',cat:'graine',unit:'g',min:3,exp:YEAR+1,moves:[{d:d(8,20),q:10,k:'achat'}]},
    {id:'g-feve',name:'Fève',variety:"Aguadulce",crop:'feve',cat:'graine',unit:'g',min:50,exp:YEAR+2,moves:[{d:d(9,1),q:250,k:'achat'}]},
    {id:'g-car',name:'Carotte',variety:'Nantaise',crop:'carotte',cat:'graine',unit:'g',min:2,exp:YEAR-1,moves:[{d:d(3,1,YEAR-2),q:8,k:'achat'}]}];
  const nursery=[{id:uid(),crop:'laitue_h',pid:'g-lait',qty:30,n:24,d:d(9,5),st:'cours'},{id:uid(),crop:'laitue_h',pid:'g-lait',qty:30,n:24,d:d(9,28),st:'cours'}];
  return{v:8,stock,nursery,rain:[{id:uid(),d:d(10,6),mm:8},{id:uid(),d:d(9,29),mm:3},{id:uid(),d:d(9,27),mm:14}],name:'Potager exemple',w:1800,h:1200,north:0,water:{roof:40,cap:1000,level:650},frost:null,objs,example:true};
}
function migrate(s){
  if(!s||!Array.isArray(s.objs))return null;
  if(s.example&&s.v!==8)return sample();
  s.v=8;s.stock=s.stock||[];s.nursery=s.nursery||[];s.north=s.north||0;s.rain=s.rain||[];s.shape=s.shape||null;s.water=s.water||{roof:40,cap:1000,level:500};
  const mig=o=>{if(o.inner&&Array.isArray(o.inner.objs))o.inner.objs.forEach(mig);if(o.height==null)o.height=(TYPES[o.type]||{}).ht||0;if(o.locked==null)o.locked=false;
    if(TYPES[o.type]&&TYPES[o.type].plant){o.zones=o.zones||[];o.journal=o.journal||[];
      if(!o.grown){o.grown=[];o.zones.forEach(z=>z.crop&&o.grown.push({y:yearOf(z),crop:z.crop}))}}};
  s.objs.forEach(mig);if(s.example)s.objs.forEach(o=>{if(o.type==='cuve'&&o.name==='Cuve 1000 L')o.name='Cuve à eau'});return s;
}

