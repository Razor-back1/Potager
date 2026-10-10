/* ================= Fleurs d'ornement (jardins de type « fleurs ») =================
   t : type · m : plantation ou semis en place · sg : semis sous abri · fl : mois de floraison
   j : jours avant la 1re floraison (semis ou plantation) · ht : hauteur (cm) · hardy : rusticité (°C)
   sun : heures de soleil souhaitées · cut : fleur à couper · lift : mois d'arrachage ou de rentrée
   care : gestes du mois. Valeurs indicatives pour un climat belge. */
const FL_CARE_DEADHEAD={m:[7,8,9],t:'Couper les fleurs fanées pour prolonger la floraison'};
const FLOWERS=[
 /* annuelles */
 {id:'f_cosmos',n:'Cosmos',f:'Astéracées',t:'annuelle',c:'#e86fa8',rang:40,pl:30,j:90,m:[5,6],sg:[3,4],fl:[7,8,9,10],ht:120,hardy:0,sun:6,cut:1,cols:'rose, blanc, pourpre',care:[{m:[6],t:'Pincer les jeunes plants pour les faire ramifier'},FL_CARE_DEADHEAD]},
 {id:'f_zinnia',n:'Zinnia',f:'Astéracées',t:'annuelle',c:'#f06b3b',rang:30,pl:25,j:80,m:[5,6],sg:[4],fl:[7,8,9],ht:70,hardy:2,sun:6,cut:1,cols:'toutes sauf bleu',care:[{m:[6],t:'Pincer au-dessus de la 3e paire de feuilles'},FL_CARE_DEADHEAD]},
 {id:'f_souci',n:'Souci',f:'Astéracées',t:'annuelle',c:'#f5a623',rang:30,pl:25,j:60,m:[3,4,5,9],sg:[],fl:[6,7,8,9,10],ht:40,hardy:-10,sun:5,cut:1,cols:'orange, jaune',care:[FL_CARE_DEADHEAD]},
 {id:'f_capucine',n:'Capucine',f:'Tropaéolacées',t:'annuelle',c:'#f2742c',rang:40,pl:30,j:60,m:[5,6],sg:[4],fl:[7,8,9,10],ht:30,hardy:0,sun:5,cut:0,cols:'orange, rouge, jaune',care:[{m:[5,6],t:'Sol pauvre : pas d\'engrais, sinon que des feuilles'}]},
 {id:'f_tournesol',n:'Tournesol',f:'Astéracées',t:'annuelle',c:'#f5c518',rang:50,pl:40,j:80,m:[4,5,6],sg:[4],fl:[7,8,9],ht:200,hardy:0,sun:7,cut:1,cols:'jaune, bronze',care:[{m:[6,7],t:'Tuteurer les grandes variétés'}]},
 {id:'f_pois_senteur',n:'Pois de senteur',f:'Fabacées',t:'annuelle',c:'#c58bd8',rang:30,pl:15,j:90,m:[3,4],sg:[2,3],fl:[6,7,8],ht:180,hardy:-5,sun:6,cut:1,cols:'mauve, rose, blanc',care:[{m:[4,5],t:'Palisser sur un grillage ou des rames'},{m:[6,7,8],t:'Cueillir souvent : plus on coupe, plus il fleurit'}]},
 {id:'f_nigelle',n:'Nigelle de Damas',f:'Renonculacées',t:'annuelle',c:'#6a8fd8',rang:25,pl:20,j:80,m:[3,4,9],sg:[],fl:[6,7,8],ht:45,hardy:-10,sun:6,cut:1,cols:'bleu, blanc, rose',care:[{m:[8],t:'Laisser quelques capsules : elle se ressème seule'}]},
 {id:'f_bleuet',n:'Bleuet',f:'Astéracées',t:'annuelle',c:'#4a6fd8',rang:25,pl:20,j:70,m:[3,4,9],sg:[],fl:[6,7,8],ht:70,hardy:-15,sun:6,cut:1,cols:'bleu, rose, blanc',care:[FL_CARE_DEADHEAD]},
 {id:'f_pavot_cal',n:'Pavot de Californie',f:'Papavéracées',t:'annuelle',c:'#f39a1e',rang:25,pl:20,j:70,m:[3,4,5],sg:[],fl:[6,7,8,9],ht:30,hardy:-10,sun:7,cut:0,cols:'orange, jaune, crème',care:[{m:[3,4],t:'Semer en place : il supporte mal le repiquage'}]},
 {id:'f_tagete',n:'Œillet d\'Inde',f:'Astéracées',t:'annuelle',c:'#f0a91c',rang:30,pl:25,j:70,m:[5,6],sg:[3,4],fl:[6,7,8,9,10],ht:30,hardy:1,sun:6,cut:0,cols:'orange, jaune, acajou',care:[FL_CARE_DEADHEAD]},
 {id:'f_muflier',n:'Muflier',f:'Plantaginacées',t:'annuelle',c:'#e0507a',rang:30,pl:25,j:100,m:[4,5],sg:[2,3],fl:[6,7,8,9],ht:60,hardy:-5,sun:6,cut:1,cols:'toutes',care:[{m:[5],t:'Pincer pour avoir plus de tiges'},FL_CARE_DEADHEAD]},
 {id:'f_reine_marg',n:'Reine-marguerite',f:'Astéracées',t:'annuelle',c:'#9b5fc0',rang:30,pl:25,j:110,m:[5],sg:[3,4],fl:[8,9,10],ht:60,hardy:0,sun:6,cut:1,cols:'violet, rose, blanc',care:[{m:[5],t:'Changer d\'emplacement chaque année (fusariose)'}]},
 {id:'f_ammi',n:'Ammi',f:'Apiacées',t:'annuelle',c:'#ece8d2',rang:40,pl:30,j:90,m:[3,4,9],sg:[3],fl:[6,7,8],ht:100,hardy:-10,sun:6,cut:1,cols:'blanc',care:[{m:[5,6],t:'Tuteurer légèrement'}]},
 {id:'f_petunia',n:'Pétunia',f:'Solanacées',t:'annuelle',c:'#c0389a',rang:30,pl:25,j:80,m:[5,6],sg:[2,3],fl:[6,7,8,9,10],ht:30,hardy:2,sun:6,cut:0,cols:'toutes',care:[FL_CARE_DEADHEAD]},
 {id:'f_impatiens',n:'Impatiens',f:'Balsaminacées',t:'annuelle',c:'#ee5b7c',rang:25,pl:25,j:80,m:[5,6],sg:[2,3],fl:[6,7,8,9],ht:30,hardy:3,sun:2,cut:0,cols:'rose, rouge, blanc',care:[{m:[6,7,8],t:'Arroser régulièrement, il craint le sec'}]},
 {id:'f_lavatere',n:'Lavatère',f:'Malvacées',t:'annuelle',c:'#e58fb2',rang:50,pl:40,j:80,m:[4,5],sg:[],fl:[7,8,9],ht:100,hardy:0,sun:6,cut:1,cols:'rose, blanc',care:[FL_CARE_DEADHEAD]},
 {id:'f_scabieuse',n:'Scabieuse',f:'Caprifoliacées',t:'annuelle',c:'#8d6cc6',rang:30,pl:30,j:90,m:[4,5],sg:[3],fl:[7,8,9],ht:80,hardy:-10,sun:6,cut:1,cols:'bordeaux, mauve, blanc',care:[FL_CARE_DEADHEAD]},
 {id:'f_pelargonium',n:'Géranium des balcons',f:'Géraniacées',t:'annuelle',c:'#e33b4b',rang:30,pl:30,j:60,m:[5],sg:[1,2],fl:[5,6,7,8,9,10],ht:35,hardy:2,sun:6,cut:0,lift:[10],cols:'rouge, rose, blanc',care:[FL_CARE_DEADHEAD,{m:[10],t:'Rentrer les pieds hors gel avant les premières gelées'}]},
 /* bisannuelles */
 {id:'f_digitale',n:'Digitale',f:'Plantaginacées',t:'bisannuelle',c:'#c86fb0',rang:40,pl:40,j:300,m:[9,10],sg:[5,6],fl:[6,7],ht:120,hardy:-20,sun:3,cut:1,cols:'pourpre, blanc, abricot',care:[{m:[7],t:'Laisser monter quelques hampes en graines ; plante toxique'}]},
 {id:'f_myosotis',n:'Myosotis',f:'Boraginacées',t:'bisannuelle',c:'#7fa6e8',rang:20,pl:20,j:220,m:[9,10],sg:[6,7],fl:[4,5],ht:25,hardy:-20,sun:4,cut:0,cols:'bleu, rose, blanc',care:[{m:[6],t:'Arracher après floraison, il se ressème seul'}]},
 {id:'f_pensee',n:'Pensée',f:'Violacées',t:'bisannuelle',c:'#7b4fc2',rang:20,pl:20,j:120,m:[3,4,9,10],sg:[6,7],fl:[3,4,5,6,10,11],ht:20,hardy:-15,sun:4,cut:0,cols:'toutes',care:[{m:[4,5,10],t:'Couper les fleurs fanées'}]},
 {id:'f_rose_tremiere',n:'Rose trémière',f:'Malvacées',t:'bisannuelle',c:'#d9547a',rang:50,pl:50,j:330,m:[4,5,9],sg:[5,6],fl:[7,8,9],ht:220,hardy:-20,sun:6,cut:0,cols:'rose, rouge, noir, jaune',care:[{m:[6,7,8],t:'Retirer les feuilles tachées de rouille'},{m:[6],t:'Tuteurer contre un mur'}]},
 {id:'f_giroflee',n:'Giroflée',f:'Brassicacées',t:'bisannuelle',c:'#e3943a',rang:30,pl:30,j:240,m:[9,10],sg:[5,6],fl:[4,5],ht:45,hardy:-15,sun:6,cut:1,cols:'orange, pourpre, jaune',care:[]},
 /* vivaces */
 {id:'f_lavande',n:'Lavande',f:'Lamiacées',t:'vivace',c:'#8f7ad6',rang:60,pl:50,j:90,m:[3,4,5,9,10],sg:[],fl:[6,7,8],ht:60,hardy:-15,sun:8,cut:1,cols:'bleu-violet, blanc, rose',care:[{m:[8,9],t:'Tailler juste après la floraison, sans couper dans le vieux bois'}]},
 {id:'f_echinacea',n:'Échinacée',f:'Astéracées',t:'vivace',c:'#d4629a',rang:50,pl:45,j:120,m:[3,4,5,9,10],sg:[],fl:[7,8,9],ht:90,hardy:-25,sun:6,cut:1,cols:'rose, blanc, orange',care:[{m:[11],t:'Laisser les têtes sèches en hiver pour les oiseaux'}]},
 {id:'f_rudbeckia',n:'Rudbeckia',f:'Astéracées',t:'vivace',c:'#f2b31b',rang:50,pl:45,j:120,m:[3,4,5,9,10],sg:[],fl:[7,8,9,10],ht:70,hardy:-25,sun:6,cut:1,cols:'jaune d\'or',care:[{m:[3],t:'Rabattre les tiges sèches au ras du sol'}]},
 {id:'f_achillee',n:'Achillée',f:'Astéracées',t:'vivace',c:'#e9c46a',rang:40,pl:40,j:120,m:[3,4,9,10],sg:[],fl:[6,7,8,9],ht:70,hardy:-25,sun:6,cut:1,cols:'jaune, rose, rouge, blanc',care:[FL_CARE_DEADHEAD]},
 {id:'f_sauge',n:'Sauge des bois',f:'Lamiacées',t:'vivace',c:'#6b4fbf',rang:40,pl:40,j:100,m:[3,4,9,10],sg:[],fl:[5,6,7,8,9],ht:50,hardy:-25,sun:6,cut:0,cols:'violet, bleu, rose',care:[{m:[7],t:'Rabattre après la 1re floraison pour une 2e en fin d\'été'}]},
 {id:'f_geranium',n:'Géranium vivace',f:'Géraniacées',t:'vivace',c:'#8a7ad6',rang:40,pl:40,j:90,m:[3,4,9,10],sg:[],fl:[5,6,7,8],ht:40,hardy:-25,sun:4,cut:0,cols:'bleu, rose, blanc',care:[{m:[7],t:'Rabattre au ras pour une remontée et un feuillage neuf'}]},
 {id:'f_hemerocalle',n:'Hémérocalle',f:'Asphodélacées',t:'vivace',c:'#ec8a2f',rang:50,pl:50,j:120,m:[3,4,9,10],sg:[],fl:[6,7,8],ht:70,hardy:-25,sun:6,cut:0,cols:'orange, jaune, rouge',care:[{m:[9],t:'Diviser les touffes tous les 4 ans'}]},
 {id:'f_pivoine',n:'Pivoine',f:'Paeoniacées',t:'vivace',c:'#e46a92',rang:90,pl:90,j:365,m:[9,10,11],sg:[],fl:[5,6],ht:80,hardy:-30,sun:6,cut:1,cols:'rose, blanc, rouge',care:[{m:[4],t:'Tuteurer avant que les boutons ne s\'ouvrent'},{m:[10],t:'Planter peu profond : les yeux à 3 cm sous terre'}]},
 {id:'f_delphinium',n:'Delphinium',f:'Renonculacées',t:'vivace',c:'#4f6fe0',rang:60,pl:50,j:120,m:[3,4,9],sg:[],fl:[6,7],ht:150,hardy:-25,sun:6,cut:1,cols:'bleu, violet, blanc',care:[{m:[4,5],t:'Protéger les jeunes pousses des limaces'},{m:[5],t:'Tuteurer'}]},
 {id:'f_lupin',n:'Lupin',f:'Fabacées',t:'vivace',c:'#9a6fd0',rang:50,pl:45,j:120,m:[3,4,9],sg:[3],fl:[5,6],ht:100,hardy:-25,sun:6,cut:0,cols:'toutes',care:[{m:[6],t:'Couper les épis fanés avant les graines'}]},
 {id:'f_aster',n:'Aster d\'automne',f:'Astéracées',t:'vivace',c:'#9c7fe0',rang:50,pl:50,j:120,m:[3,4,9,10],sg:[],fl:[9,10],ht:100,hardy:-25,sun:6,cut:1,cols:'mauve, rose, blanc',care:[{m:[6],t:'Pincer pour des touffes plus denses'},{m:[8,9],t:'Surveiller l\'oïdium'}]},
 {id:'f_phlox',n:'Phlox paniculé',f:'Polémoniacées',t:'vivace',c:'#e48ac0',rang:50,pl:50,j:120,m:[3,4,9,10],sg:[],fl:[7,8,9],ht:90,hardy:-25,sun:5,cut:1,cols:'rose, mauve, blanc',care:[{m:[6,7,8],t:'Arroser au pied, il craint l\'oïdium'}]},
 {id:'f_nepeta',n:'Népéta',f:'Lamiacées',t:'vivace',c:'#9aa0e0',rang:40,pl:40,j:90,m:[3,4,9,10],sg:[],fl:[5,6,7,8,9],ht:40,hardy:-25,sun:6,cut:0,cols:'bleu lavande',care:[{m:[7],t:'Rabattre de moitié après la 1re floraison'}]},
 {id:'f_alchemille',n:'Alchémille',f:'Rosacées',t:'vivace',c:'#c8d75a',rang:40,pl:40,j:90,m:[3,4,9,10],sg:[],fl:[6,7,8],ht:40,hardy:-25,sun:3,cut:1,cols:'vert acide',care:[{m:[8],t:'Couper les fleurs avant les graines (elle se ressème beaucoup)'}]},
 {id:'f_hosta',n:'Hosta',f:'Asparagacées',t:'vivace',c:'#a9c48f',rang:50,pl:50,j:120,m:[3,4,9,10],sg:[],fl:[7,8],ht:50,hardy:-30,sun:2,cut:0,cols:'feuillage, fleurs mauves',care:[{m:[4,5],t:'Protéger les jeunes feuilles des limaces'}]},
 {id:'f_coreopsis',n:'Coréopsis',f:'Astéracées',t:'vivace',c:'#f4c430',rang:40,pl:40,j:100,m:[3,4,5,9],sg:[],fl:[6,7,8,9],ht:50,hardy:-20,sun:6,cut:1,cols:'jaune',care:[FL_CARE_DEADHEAD]},
 {id:'f_gaura',n:'Gaura',f:'Onagracées',t:'vivace',c:'#f0cfe0',rang:50,pl:50,j:100,m:[4,5],sg:[],fl:[6,7,8,9,10],ht:90,hardy:-12,sun:6,cut:0,cols:'blanc rosé',care:[{m:[4],t:'Sol bien drainé : craint l\'humidité en hiver'}]},
 {id:'f_rosier',n:'Rosier',f:'Rosacées',t:'arbuste',c:'#d93a5a',rang:80,pl:70,j:120,m:[1,2,3,11,12],sg:[],fl:[6,7,8,9],ht:120,hardy:-20,sun:6,cut:1,cols:'toutes',care:[{m:[3],t:'Taille de printemps, quand les forsythias fleurissent'},{m:[6,7,8,9],t:'Couper les fleurs fanées au-dessus d\'une feuille à 5 folioles'}]},
 /* bulbes de printemps (rustiques) */
 {id:'f_tulipe',n:'Tulipe',f:'Liliacées',t:'bulbe',c:'#e5384b',rang:15,pl:12,j:180,m:[10,11],sg:[],fl:[4,5],ht:45,hardy:-25,sun:6,cut:1,cols:'toutes',care:[{m:[5,6],t:'Laisser jaunir le feuillage avant de le couper'}]},
 {id:'f_narcisse',n:'Narcisse',f:'Amaryllidacées',t:'bulbe',c:'#f6d32b',rang:15,pl:12,j:170,m:[9,10,11],sg:[],fl:[3,4],ht:35,hardy:-25,sun:5,cut:1,cols:'jaune, blanc',care:[{m:[5],t:'Ne pas couper les feuilles avant qu\'elles jaunissent'}]},
 {id:'f_crocus',n:'Crocus',f:'Iridacées',t:'bulbe',c:'#9d6ad8',rang:10,pl:8,j:150,m:[9,10,11],sg:[],fl:[2,3],ht:10,hardy:-25,sun:5,cut:0,cols:'mauve, jaune, blanc',care:[]},
 {id:'f_jacinthe',n:'Jacinthe',f:'Asparagacées',t:'bulbe',c:'#5c7fe0',rang:15,pl:15,j:170,m:[10,11],sg:[],fl:[4],ht:25,hardy:-20,sun:5,cut:1,cols:'bleu, rose, blanc',care:[]},
 {id:'f_allium',n:'Allium',f:'Amaryllidacées',t:'bulbe',c:'#a46bd6',rang:25,pl:20,j:220,m:[9,10,11],sg:[],fl:[5,6],ht:90,hardy:-20,sun:6,cut:1,cols:'violet, blanc',care:[{m:[7],t:'Laisser sécher les têtes : elles restent décoratives'}]},
 {id:'f_lis',n:'Lis',f:'Liliacées',t:'bulbe',c:'#f08aa0',rang:25,pl:20,j:110,m:[3,4,10,11],sg:[],fl:[6,7,8],ht:100,hardy:-20,sun:6,cut:1,cols:'blanc, rose, orange',care:[{m:[5,6,7],t:'Criocère : ramasser les petits coléoptères rouges'}]},
 /* bulbes et tubercules d'été (à arracher avant l'hiver) */
 {id:'f_dahlia',n:'Dahlia',f:'Astéracées',t:'tubercule',c:'#e0457b',rang:70,pl:60,j:100,m:[5,6],sg:[3,4],fl:[7,8,9,10],ht:120,hardy:0,sun:6,cut:1,lift:[10,11],cols:'toutes sauf bleu',care:[{m:[6],t:'Pincer au-dessus de la 3e paire de feuilles'},{m:[6,7],t:'Tuteurer'},FL_CARE_DEADHEAD,{m:[10,11],t:'Arracher les tubercules après le 1er gel et les stocker hors gel'}]},
 {id:'f_glaieul',n:'Glaïeul',f:'Iridacées',t:'tubercule',c:'#ef6a4a',rang:20,pl:15,j:100,m:[4,5,6],sg:[],fl:[7,8,9],ht:120,hardy:-5,sun:6,cut:1,lift:[10],cols:'toutes',care:[{m:[7],t:'Tuteurer les hampes'},{m:[10],t:'Arracher les bulbes, sécher et stocker au sec'}]},
 {id:'f_canna',n:'Canna',f:'Cannacées',t:'tubercule',c:'#e2421f',rang:60,pl:50,j:110,m:[5,6],sg:[3,4],fl:[7,8,9,10],ht:150,hardy:0,sun:7,cut:0,lift:[10,11],cols:'rouge, orange, jaune',care:[{m:[10,11],t:'Arracher les rhizomes après le 1er gel, stocker hors gel'}]},
 {id:'f_anemone',n:'Anémone de Caen',f:'Renonculacées',t:'tubercule',c:'#c9345e',rang:15,pl:10,j:100,m:[3,4,9,10],sg:[],fl:[4,5,6,9],ht:30,hardy:-8,sun:5,cut:1,cols:'rouge, bleu, blanc',care:[{m:[3,9],t:'Faire tremper les griffes 3 h avant de planter'}]},
 {id:'f_renoncule',n:'Renoncule',f:'Renonculacées',t:'tubercule',c:'#f07a5a',rang:15,pl:12,j:90,m:[2,3,4],sg:[],fl:[5,6],ht:35,hardy:-5,sun:6,cut:1,cols:'toutes',care:[{m:[2,3],t:'Faire tremper les griffes avant de planter, pattes vers le bas'}]}];
const FL_TYPE={annuelle:'Annuelle',bisannuelle:'Bisannuelle',vivace:'Vivace',arbuste:'Arbuste',bulbe:'Bulbe de printemps',tubercule:'Bulbe ou tubercule d\'été'};
const FL_CI={f_cosmos:'daisy',f_zinnia:'daisy',f_souci:'daisy',f_tournesol:'daisy',f_bleuet:'daisy',f_tagete:'daisy',f_reine_marg:'daisy',f_echinacea:'daisy',f_rudbeckia:'daisy',f_coreopsis:'daisy',f_aster:'daisy',f_scabieuse:'daisy',f_pensee:'daisy',
 f_tulipe:'cup',f_crocus:'cup',f_pavot_cal:'cup',f_anemone:'cup',f_lavatere:'cup',f_capucine:'trumpet',f_petunia:'trumpet',f_narcisse:'trumpet',f_lis:'trumpet',f_hemerocalle:'trumpet',f_canna:'trumpet',f_impatiens:'trumpet',f_gaura:'tiny',
 f_lavande:'spike',f_delphinium:'spike',f_lupin:'spike',f_digitale:'spike',f_muflier:'spike',f_glaieul:'spike',f_sauge:'spike',f_nepeta:'spike',f_rose_tremiere:'spike',f_jacinthe:'spike',f_giroflee:'spike',f_pois_senteur:'spike',
 f_allium:'ball',f_phlox:'ball',f_achillee:'ball',f_ammi:'ball',f_pelargonium:'ball',
 f_rosier:'rose',f_pivoine:'rose',f_renoncule:'rose',f_dahlia:'rose',
 f_myosotis:'tiny',f_alchemille:'tiny',f_nigelle:'daisy',f_geranium:'tiny',f_hosta:'leaf'};
const FL_PESTS=[
 {n:'Pucerons',c:['f_rosier','f_lupin','f_capucine','f_dahlia','f_tournesol'],m:[4,5,6,7],t:'Jet d\'eau ou savon noir dilué ; les coccinelles s\'en chargent souvent.'},
 {n:'Limaces',c:['f_hosta','f_dahlia','f_delphinium','f_lupin','f_tagete','f_zinnia','f_lis'],m:[3,4,5,6,9,10],t:'Ronde le soir, pièges, cendre ou paillage sec autour des jeunes pousses.'},
 {n:'Oïdium',c:['f_aster','f_phlox','f_rosier','f_zinnia','f_cosmos','f_pois_senteur'],m:[7,8,9],t:'Arrose au pied le matin, aère, retire les feuilles blanches.'},
 {n:'Maladie des taches noires',c:['f_rosier'],m:[6,7,8,9],t:'Ramasse les feuilles tachées, n\'arrose pas le feuillage.'},
 {n:'Rouille',c:['f_rose_tremiere','f_rosier'],m:[6,7,8],t:'Retire les feuilles touchées dès les premières pustules orange.'},
 {n:'Botrytis',c:['f_pivoine','f_tulipe','f_dahlia'],m:[4,5,9,10],t:'Aère, coupe les parties pourries, évite les arrosages du soir.'},
 {n:'Criocère du lis',c:['f_lis'],m:[4,5,6,7],t:'Ramasse les coléoptères rouges et les larves sous les feuilles.'},
 {n:'Thrips',c:['f_glaieul'],m:[7,8],t:'Feuilles argentées : traite les bulbes avant de les stocker.'}];

let PLANTS=VEG_PLANTS;
const ALL_PLANTS=[...VEG_PLANTS,...FLOWERS];
const P=Object.fromEntries(ALL_PLANTS.map(p=>[p.id,p]));
const FLW=()=>{try{return!!S&&S.kind==='fleurs'}catch(e){return false}};
/* le catalogue suit le type du jardin ouvert : potager ou fleurs */
function setCatalog(){const f=FLW();PLANTS=f?FLOWERS:VEG_PLANTS;JT.recolte=f?'Coupe':'Récolte';
  try{const h=document.querySelector('.tabs [data-tab="harvest"]'),c=document.querySelector('.tabs [data-tab="crops"]');if(h)h.lastChild.textContent=f?'Floraisons':'Récoltes';if(c)c.lastChild.textContent=f?'Fleurs':'Cultures'}catch(e){}}
/* date de la première floraison : après le délai j, au premier mois de floraison */
function bloomStart(d,p){let t=addD(d,p.j||60);for(let i=0;i<14;i++){if(p.fl.includes(t.getMonth()+1))return t;t=new Date(t.getFullYear(),t.getMonth()+1,1,12)}return addD(d,p.j||60)}
function bloomEndMonth(p,mo){let m=mo;for(let i=0;i<12&&p.fl.includes(m%12+1);i++)m=m%12+1;return m}
function bloomState(x){const p=x.p,mo=TODAY.getMonth()+1;if(!p.fl)return null;
  if(x.hv>TODAY)return{k:'wait',short:'dans '+x.left+' j',long:'floraison vers le '+fdate(x.hv)};
  if(p.fl.includes(mo)){const e=bloomEndMonth(p,mo);return{k:'bloom',short:'en fleur',long:'en fleur'+(e!==mo?' jusqu\'en '+MONTHS[e-1]:' ce mois-ci')}}
  if(p.t==='annuelle')return{k:'done',short:'fini',long:'floraison terminée (annuelle)'};
  let n=mo;for(let i=0;i<12;i++){n=n%12+1;if(p.fl.includes(n))break}return{k:'rest',short:'repos',long:'prochaine floraison en '+MONTHS[n-1]}}
const GOOD=[['tomate','basilic'],['tomate','carotte'],['tomate','persil'],['tomate','oignon'],['tomate','ail'],['tomate','laitue'],['tomate','poireau'],['tomate','celeri'],
['carotte','poireau'],['carotte','oignon'],['carotte','ail'],['carotte','laitue'],['carotte','radis'],['carotte','pois'],['carotte','haricot'],
['laitue','radis'],['laitue','fraise'],['laitue','concombre'],['laitue','poireau'],['laitue','betterave'],['laitue','chou'],['laitue','oignon'],
['poireau','celeri'],['poireau','fraise'],['oignon','betterave'],['oignon','fraise'],['ail','fraise'],['ail','betterave'],
['haricot','pdt'],['haricot','mais'],['haricot','celeri'],['haricot','concombre'],['haricot','courgette'],['haricot','chou'],['haricot','blette'],['haricot','potiron'],['haricot','aubergine'],
['pois','radis'],['pois','laitue'],['pois','mais'],['pois','concombre'],['courgette','mais'],['courgette','radis'],['concombre','mais'],['concombre','radis'],['potiron','mais'],
['betterave','chou'],['betterave','celeri'],['radis','epinard'],['epinard','fraise'],['epinard','chou'],['chou','celeri'],['poivron','basilic'],['aubergine','basilic'],
['feve','pdt'],['feve','mais'],['mache','poireau'],['mache','oignon']];
const BAD=[['tomate','pdt'],['tomate','fenouil'],['tomate','chou'],['haricot','oignon'],['haricot','ail'],['haricot','poireau'],['haricot','fenouil'],
['pois','oignon'],['pois','ail'],['pois','poireau'],['feve','oignon'],['feve','ail'],['ail','chou'],['laitue','persil'],['laitue','celeri'],
['pdt','courgette'],['pdt','concombre'],['pdt','potiron'],['chou','fraise'],['fenouil','carotte']];
/* la laitue d'hiver a les mêmes voisins que la laitue */
[GOOD,BAD].forEach(L=>L.slice().forEach(([a,b])=>{if(a==='laitue')L.push(['laitue_h',b]);if(b==='laitue')L.push([a,'laitue_h'])}));
const REL={};const rk=(a,b)=>a<b?a+'|'+b:b+'|'+a;
GOOD.forEach(([a,b])=>REL[rk(a,b)]=1);BAD.forEach(([a,b])=>REL[rk(a,b)]=-1);
const compat=(a,b)=>a===b?0:(REL[rk(a,b)]||0);
const FROST_SENSITIVE=new Set(['tomate','poivron','aubergine','courgette','concombre','potiron','mais','haricot','basilic',...FLOWERS.filter(p=>p.hardy>=-1).map(p=>p.id)]);
const ROT_YEARS=3; /* même famille interdite sur les 3 saisons précédentes (rotation de 4 ans) */
/* Pluie mensuelle moyenne (mm), ordre de grandeur pour la Hesbaye */
const RAIN=[69,58,63,47,63,72,75,78,62,66,70,80];
/* Besoin indicatif d'arrosage d'un potager (L/m²/semaine) par mois */
const NEED=[0,0,2,5,10,15,20,18,10,4,0,0];
const LAT=50.55*Math.PI/180;

const TYPES={
 planche:{l:'Planche de culture',w:90,h:500,plant:true,ht:0},
 bac:{l:'Bac de culture',w:100,h:200,plant:true,ht:40},
 serre:{l:'Serre',w:300,h:500,ht:250},
 allee:{l:'Allée',w:70,h:500},
 alleeo:{l:'Allée ronde ou ovale',w:600,h:400},
 cuve:{l:'Cuve de stockage',w:120,h:120,round:true,ht:150},
 eau:{l:"Point d'eau",w:60,h:60,round:true},
 arbre:{l:'Arbre',w:400,h:400,round:true,ht:600},
 haie:{l:'Haie',w:500,h:60,ht:200},
 etang:{l:'Étang ou mare',w:800,h:400,ht:0},
 citerne:{l:'Citerne enterrée',w:160,h:160,round:true,ht:0},
 ruisseau:{l:"Cours d'eau",w:800,h:40,ht:0},
 cloture:{l:'Clôture',w:500,h:10,ht:150},
 prise:{l:'Prise électrique',w:30,h:30},
 compost:{l:'Composteur',w:120,h:120,ht:100},
 abri:{l:'Abri de jardin',w:250,h:200,ht:250},
};
const JT={arrosage:'Arrosage',semis:'Semis',amendement:'Amendement',traitement:'Traitement',maladie:'Maladie',recolte:'Récolte',note:'Note'};
const MONTHS=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const MSHORT=['J','F','M','A','M','J','J','A','S','O','N','D'];

