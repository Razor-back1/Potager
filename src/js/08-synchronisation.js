/* ================= Synchronisation (compte Claude) ================= */
let DOC=null,syncState='local',pushT=null,ASSETS=null,DL=null;
function schedulePush(){if(!DOC)return;clearTimeout(pushT);pushT=setTimeout(pushRemote,1200)}
async function pushRemote(){if(!DOC)return;try{await DOC.set({state:JSON.parse(lastJSON),updatedAt:localAt});syncState='ok'}catch(e){syncState='error';if(e&&e.code==='quota_exceeded')toast('Stockage en ligne plein : supprime des photos');}renderSyncLine()}
async function initCaps(){
  if(!window.claude||!window.claude.use)return;
  try{ASSETS=await window.claude.use('assets')}catch(e){}
  try{DL=await window.claude.use('downloads')}catch(e){}
  try{SAMPLE=await window.claude.use('sample');if(SAMPLE){const l=await SAMPLE.limits().catch(()=>null);SAMPLE_IMG=!!(l&&l.images)}if(bed&&bed.jk==='maladie')renderBed()}catch(e){}
  try{
    const[db,user]=await Promise.all([window.claude.use('db'),window.claude.use('user')]);
    if(!db||!user){renderSyncLine();return}
    const id=await user.id();if(!id){renderSyncLine();return}
    DBH={db,id};subscribeDoc();
  }catch(e){syncState='error';renderSyncLine()}
}
let DBH=null,UNSUB=null;
function subscribeDoc(){if(!DBH)return;try{if(typeof UNSUB==='function')UNSUB()}catch(e){}
  try{DOC=DBH.db.doc('data/users/'+DBH.id+'/garden'+(GID==='main'?'':'-'+GID));syncState='wait';renderSyncLine();const myG=GID;
    UNSUB=DOC.onSnapshot(snap=>{if(myG!==GID)return;
      if(!snap.exists){if(!snap.metadata.fromCache)pushRemote();return}
      const d=snap.data()||{};
      if(d.updatedAt>localAt&&d.state){const j=JSON.stringify(d.state);if(j!==lastJSON){past.push(lastJSON);future=[];lastJSON=j;S=migrate(JSON.parse(j));lastJSON=JSON.stringify(S);if(selId&&!obj(selId))selId=null;refresh()}localAt=d.updatedAt;persist()}
      else if(d.updatedAt<localAt&&!snap.metadata.fromCache)schedulePush();
      syncState='ok';renderSyncLine();renderHeader();
    },()=>{syncState='error';renderSyncLine()});
  }catch(e){syncState='error';renderSyncLine()}
}
function syncText(){try{if(relayOn())return syncErr?'Synchronisation en échec : '+syncErr:syncAt?'Synchronisé via ton relais · '+hhmm(syncAt):'Synchronisation via ton relais…'}catch(e){}return{local:'Enregistré sur cet appareil uniquement',wait:'Connexion à ton compte…',ok:'Synchronisé avec ton compte Claude',error:'Synchronisation interrompue, enregistré sur cet appareil'}[syncState]}
function renderSyncLine(){const el=$('#syncLine');if(el)el.textContent=syncText()}

