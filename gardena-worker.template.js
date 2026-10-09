// Atelier Potager — relais Cloudflare : potagers synchronisés, amis invités, notifications et GARDENA
// ------------------------------------------------------------------
// Ce relais tourne en permanence chez Cloudflare (offre gratuite). Il :
//   0. synchronise les potagers entre appareils, pour toi et les amis que tu invites (base D1) ;
//      et publie un calendrier (semis, récoltes, repiquages) auquel l'iPhone peut s'abonner ;
//   1. garde ta clé GARDENA en secret (elle n'est jamais dans l'app) ;
//   2. lit l'état des vannes, sondes et prises pour l'app ;
//   3. ouvre ou ferme une vanne quand l'app le demande (arrosage manuel avec minuteur) ;
//   4. toutes les 30 minutes, applique tes règles d'arrosage automatique, même app fermée.
//
// À régler dans Cloudflare (Worker > Settings) :
//   Variables and Secrets : APP_TOKEN (obligatoire), GARDENA_KEY et GARDENA_SECRET (seulement pour l'arrosage), type « Secret »
//   Bindings              : KV namespace, nom de variable POTAGER
//                           D1 database, nom de variable DB
//   Triggers > Cron       : */30 * * * *  (notifications et arrosage automatique)
//
// Limite GARDENA : environ 3 000 requêtes par mois. Le relais met l'état en cache
// (10 min) et ne lit GARDENA en automatique que pendant tes créneaux d'arrosage.

const AUTH = 'https://api.authentication.husqvarnagroup.dev/v1/oauth2/token';
const API = 'https://api.smart.gardena.dev/v2';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,X-Potager-Key',
  'Access-Control-Max-Age': '86400'
};
const J = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });
const TZ = 'Europe/Brussels';
const localHour = (ms = Date.now()) => parseInt(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' }).format(new Date(ms)), 10) % 24;
const localDay = (ms = Date.now()) => new Intl.DateTimeFormat('fr-CA', { timeZone: TZ }).format(new Date(ms));

//@@DECIDE@@

/* ---------- GARDENA ---------- */
async function token(env) {
  const t = await env.POTAGER.get('token', { type: 'json' });
  if (t && t.exp > Date.now() + 120000) return t.v;
  const r = await fetch(AUTH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.GARDENA_KEY || '', client_secret: env.GARDENA_SECRET || '' })
  });
  if (!r.ok) throw new Error('Connexion Husqvarna refusée (' + r.status + ') : vérifie GARDENA_KEY et GARDENA_SECRET.');
  const j = await r.json();
  await env.POTAGER.put('token', JSON.stringify({ v: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 }));
  return j.access_token;
}
async function gd(env, path, init = {}) {
  const lock = +(await env.POTAGER.get('locked') || 0);
  if (lock > Date.now()) throw new Error('GARDENA en pause (trop de requêtes) jusqu\'à ' + new Date(lock).toLocaleString('fr-BE', { timeZone: TZ }) + '.');
  const tk = await token(env);
  const r = await fetch(API + path, {
    ...init,
    headers: { 'Authorization': 'Bearer ' + tk, 'Authorization-Provider': 'husqvarna', 'X-Api-Key': env.GARDENA_KEY, 'Content-Type': 'application/vnd.api+json', ...(init.headers || {}) }
  });
  if (r.status === 429) { await env.POTAGER.put('locked', String(Date.now() + 86400000)); throw new Error('Limite de requêtes GARDENA atteinte : pause de 24 h.'); }
  if (r.status === 401 || r.status === 403) { await env.POTAGER.delete('token'); throw new Error('GARDENA refuse l\'accès (' + r.status + ') : vérifie que l\'application Husqvarna est reliée à « GARDENA smart system API ».'); }
  if (!r.ok) throw new Error('GARDENA a répondu ' + r.status + '.');
  if (r.status === 202 || r.status === 204) return null;
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}
function norm(loc) {
  const inc = loc.included || [], by = {};
  inc.forEach(x => { (by[x.type] = by[x.type] || []).push(x) });
  const v = (a, k) => a && a[k] ? a[k].value : null, ts = (a, k) => a && a[k] ? a[k].timestamp : null;
  const common = {};
  (by.COMMON || []).forEach(c => common[c.id] = c.attributes);
  const dev = id => String(id).split(':')[0];
  const devName = id => v(common[dev(id)], 'name') || 'Appareil';
  const model = id => v(common[dev(id)], 'modelType') || '';
  const end = a => { if (!a || v(a, 'activity') === 'CLOSED' || v(a, 'activity') === 'OFF') return null; const d = v(a, 'duration'), t = ts(a, 'duration'); return d && t ? Date.parse(t) + d * 1000 : null };
  return {
    at: Date.now(),
    location: loc.data && loc.data.attributes && v(loc.data.attributes, 'name'),
    valves: (by.VALVE || []).map(x => ({ id: x.id, name: v(x.attributes, 'name') || devName(x.id), dev: devName(x.id), model: model(x.id), activity: v(x.attributes, 'activity'), end: end(x.attributes), battery: v(common[dev(x.id)], 'batteryLevel'), pump: /pump/i.test(model(x.id)) })),
    sensors: (by.SENSOR || []).map(x => ({ id: x.id, name: devName(x.id), soil: v(x.attributes, 'soilHumidity'), soilT: v(x.attributes, 'soilTemperature'), air: v(x.attributes, 'ambientTemperature'), light: v(x.attributes, 'lightIntensity'), battery: v(common[dev(x.id)], 'batteryLevel') })),
    sockets: (by.POWER_SOCKET || []).map(x => ({ id: x.id, name: devName(x.id), activity: v(x.attributes, 'activity'), end: end(x.attributes) }))
  };
}
async function state(env, maxAge = 600000) {
  const c = await env.POTAGER.get('state', { type: 'json' });
  if (c && Date.now() - c.at < maxAge) return c;
  let lid = await env.POTAGER.get('loc');
  try {
    if (!lid) {
      const l = await gd(env, '/locations');
      lid = l && l.data && l.data[0] && l.data[0].id;
      if (!lid) throw new Error('Aucun jardin trouvé sur ce compte GARDENA.');
      await env.POTAGER.put('loc', lid);
    }
    const s = norm(await gd(env, '/locations/' + lid));
    await env.POTAGER.put('state', JSON.stringify(s));
    return s;
  } catch (e) { if (c) return { ...c, stale: true, err: e.message }; throw e }
}
async function patchState(env, fn) { const s = await env.POTAGER.get('state', { type: 'json' }); if (s) { fn(s); await env.POTAGER.put('state', JSON.stringify(s)) } }
const cmd = (env, id, type, attributes) => gd(env, '/command/' + encodeURI(id), { method: 'PUT', body: JSON.stringify({ data: { id: 'potager-' + Date.now(), type, attributes } }) });

/* ---------- réglages et journal ---------- */
const getCfg = async env => (await env.POTAGER.get('cfg', { type: 'json' })) || { zones: {}, pump: { kind: 'auto' } };
const getLog = async env => (await env.POTAGER.get('log', { type: 'json' })) || [];
async function addLog(env, e) { const l = await getLog(env); l.unshift({ id: 'e' + Date.now() + Math.random().toString(36).slice(2, 6), at: Date.now(), ...e }); await env.POTAGER.put('log', JSON.stringify(l.slice(0, 200))); }

async function water(env, valve, sec, how, why) {
  const cfg = await getCfg(env), s = await env.POTAGER.get('state', { type: 'json' });
  const vInfo = s && s.valves.find(x => x.id === valve);
  const cap = vInfo && /irrigation/i.test(vInfo.model) ? 5400 : 36000;
  sec = Math.min(cap, Math.max(60, Math.round(sec / 60) * 60));
  const p = cfg.pump || {};
  if (p.kind === 'socket' && p.id) await cmd(env, p.id, 'POWER_SOCKET_CONTROL', { command: 'START_SECONDS_TO_OVERRIDE', seconds: sec + 60 });
  if (p.kind === 'valve' && p.id && p.id !== valve) await cmd(env, p.id, 'VALVE_CONTROL', { command: 'START_SECONDS_TO_OVERRIDE', seconds: sec + 60 });
  await cmd(env, valve, 'VALVE_CONTROL', { command: 'START_SECONDS_TO_OVERRIDE', seconds: sec });
  const end = Date.now() + sec * 1000;
  await patchState(env, st => {
    const v = st.valves.find(x => x.id === valve); if (v) { v.activity = 'MANUAL_WATERING'; v.end = end }
    const ps = p.id && (st.sockets.find(x => x.id === p.id) || st.valves.find(x => x.id === p.id)); if (ps) { ps.activity = p.kind === 'socket' ? 'TIME_LIMITED_ON' : 'MANUAL_WATERING'; ps.end = end + 60000 }
  });
  await addLog(env, { type: 'water', valve, min: sec / 60, how, why: why || '', end });
}
async function stop(env, valve) {
  const cfg = await getCfg(env), log = await getLog(env), p = cfg.pump || {};
  await cmd(env, valve, 'VALVE_CONTROL', { command: 'STOP_UNTIL_NEXT_TASK' });
  let others = false;
  await patchState(env, st => {
    const v = st.valves.find(x => x.id === valve); if (v) { v.activity = 'CLOSED'; v.end = null }
    others = st.valves.some(x => x.id !== valve && x.id !== p.id && x.activity && x.activity !== 'CLOSED');
  });
  if (!others && p.id && p.kind === 'socket') { await cmd(env, p.id, 'POWER_SOCKET_CONTROL', { command: 'STOP_UNTIL_NEXT_TASK' }); await patchState(env, st => { const x = st.sockets.find(y => y.id === p.id); if (x) { x.activity = 'OFF'; x.end = null } }) }
  if (!others && p.id && p.kind === 'valve' && p.id !== valve) await cmd(env, p.id, 'VALVE_CONTROL', { command: 'STOP_UNTIL_NEXT_TASK' });
  const last = log.find(e => e.type === 'water' && e.valve === valve && e.end > Date.now());
  await addLog(env, { type: 'stop', valve, ref: last ? last.id : null, left: last ? Math.max(0, Math.round((last.end - Date.now()) / 60000)) : 0 });
}

/* ---------- automatique ---------- */
async function rain24(geo) {
  try {
    const g = geo || { lat: 50.586, lon: 4.877 };
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${g.lat}&longitude=${g.lon}&hourly=precipitation&forecast_hours=24&timezone=Europe%2FBrussels`);
    const j = await r.json();
    return { rain24: (j.hourly.precipitation || []).reduce((a, b) => a + (+b || 0), 0) };
  } catch (e) { return { rain24: null } }
}
async function runAuto(env) {
  const cfg = await getCfg(env);
  const zones = Object.entries(cfg.zones || {}).filter(([, z]) => z.mode && z.mode !== 'off');
  if (!zones.length) return;
  const h = localHour();
  /* hors créneau : on ne consomme aucune requête GARDENA */
  if (!zones.some(([, z]) => (z.hours && z.hours.length ? z.hours : [6]).some(x => h >= x && h < x + 2))) return;
  let s; try { s = await state(env, 120000) } catch (e) { await addLog(env, { type: 'error', msg: e.message }); return }
  const log = await getLog(env), p = cfg.pump || {};
  const lastRun = id => Math.max(0, ...log.filter(e => e.type === 'water' && e.valve === id).map(e => e.at));
  const flowOf = id => (cfg.zones[id] && cfg.zones[id].flow) || 8;
  const tankEst = cfg.tank && cfg.tank.level != null ? cfg.tank.level - log.filter(e => e.type === 'water' && e.at > cfg.tank.at).reduce((a, e) => a + flowOf(e.valve) * e.min, 0) : null;
  let busy = s.valves.some(v => v.id !== p.id && v.activity && v.activity !== 'CLOSED' && (!v.end || v.end > Date.now()));
  const fc = await rain24(cfg.geo), now = { h, ms: Date.now() }, today = localDay();
  for (const [id, z] of zones) {
    const sensor = z.sensor && s.sensors.find(x => x.id === z.sensor);
    const d = autoDecide(z, { soil: sensor ? sensor.soil : null, lastRun: lastRun(id), busy, tankEst, tankMin: cfg.tankMin }, now, fc);
    if (d.go) {
      try { await water(env, id, (z.min || 15) * 60, 'auto', d.why); busy = true; const vn = (s.valves.find(v => v.id === id) || {}).name || 'Vanne'; await pushAll(env, 'admin', 'gardena', { title: 'Arrosage automatique', body: `${vn} : ${z.min || 15} min. ${d.why}`, tag: 'gardena', url: './' }) }
      catch (e) { await addLog(env, { type: 'error', valve: id, msg: e.message }) }
    } else if (d.skip && !log.some(e => e.type === 'skip' && e.valve === id && localDay(e.at) === today)) {
      await addLog(env, { type: 'skip', valve: id, why: d.why }); const vn = (s.valves.find(v => v.id === id) || {}).name || 'Vanne'; await pushAll(env, 'admin', 'gardena', { title: 'Arrosage sauté', body: `${vn} : ${d.why}`, tag: 'gardena', url: './' });
    }
  }
}


/* ---------- base D1 : comptes, potagers, photos, notifications ---------- */
let schemaOk = false;
async function schema(env) {
  if (schemaOk) return;
  await env.DB.batch([
    env.DB.prepare('CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, name TEXT, th TEXT UNIQUE, role TEXT, created INTEGER, last INTEGER)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS gardens(uid TEXT, id TEXT, name TEXT, at INTEGER, ex INTEGER DEFAULT 0, del INTEGER DEFAULT 0, size INTEGER, state TEXT, plan TEXT, PRIMARY KEY(uid,id))'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS photos(id TEXT PRIMARY KEY, uid TEXT, data TEXT, at INTEGER)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS subs(endpoint TEXT PRIMARY KEY, uid TEXT, keys TEXT, prefs TEXT, name TEXT, at INTEGER)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS meta(uid TEXT, k TEXT, v TEXT, PRIMARY KEY(uid,k))')
  ]);
  schemaOk = true;
}
const rid = (n = 20) => { const a = crypto.getRandomValues(new Uint8Array(n)); return Array.from(a, b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('') };
async function sha(s) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))), b => b.toString(16).padStart(2, '0')).join('') }
const metaGet = async (env, uid, k) => { const r = await env.DB.prepare('SELECT v FROM meta WHERE uid=? AND k=?').bind(uid, k).first(); return r ? JSON.parse(r.v) : null };
const metaSet = (env, uid, k, v) => env.DB.prepare('INSERT INTO meta(uid,k,v) VALUES(?,?,?) ON CONFLICT(uid,k) DO UPDATE SET v=excluded.v').bind(uid, k, JSON.stringify(v)).run();
async function who(env, req) {
  const key = req.headers.get('X-Potager-Key') || '';
  if (!key) return null;
  if (env.APP_TOKEN && key === env.APP_TOKEN) return { id: 'admin', role: 'admin', name: 'Toi' };
  const u = await env.DB.prepare('SELECT id,name,role,last FROM users WHERE th=?').bind(await sha(key)).first();
  if (!u) return null;
  if (!u.last || Date.now() - u.last > 6 * 3600e3) await env.DB.prepare('UPDATE users SET last=? WHERE id=?').bind(Date.now(), u.id).run();
  return u;
}
/* reprise unique des données de l'ancien relais (stockage KV) */
async function migrate(env) {
  if (!env.POTAGER || await metaGet(env, 'admin', 'migrated')) return;
  const list = (await env.POTAGER.get('gardens', { type: 'json' })) || [];
  for (const g of list) {
    if (g.del) continue;
    const d = await env.POTAGER.get('garden:' + g.id, { type: 'json' }), plan = await env.POTAGER.get('plan:' + g.id);
    if (!d || !d.state) continue;
    const st = JSON.stringify(d.state);
    await env.DB.prepare('INSERT OR IGNORE INTO gardens(uid,id,name,at,ex,del,size,state,plan) VALUES(?,?,?,?,?,0,?,?,?)').bind('admin', g.id, g.name || 'Potager', d.at || g.at || Date.now(), g.ex ? 1 : 0, st.length, st, plan || null).run();
  }
  for (const s of (await env.POTAGER.get('subs', { type: 'json' })) || [])
    await env.DB.prepare('INSERT OR IGNORE INTO subs(endpoint,uid,keys,prefs,name,at) VALUES(?,?,?,?,?,?)').bind(s.endpoint, 'admin', JSON.stringify(s.keys), JSON.stringify(s.prefs || {}), s.name || 'Appareil', s.at || Date.now()).run();
  await metaSet(env, 'admin', 'migrated', Date.now());
}

/* ---------- notifications (Web Push, chiffrement aes128gcm + VAPID) ---------- */
const b64u = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)) };
const cat = (...a) => { const n = a.reduce((x, y) => x + y.length, 0), o = new Uint8Array(n); let i = 0; for (const x of a) { o.set(x, i); i += x.length } return o };
const utf8 = s => new TextEncoder().encode(s);
async function hkdf(salt, ikm, info, len) { const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']); return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8)) }
async function vapid(env) {
  let v = await metaGet(env, '*', 'vapid');
  if (!v && env.POTAGER) { v = await env.POTAGER.get('vapid', { type: 'json' }); if (v) await metaSet(env, '*', 'vapid', v) }
  if (!v) {
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    v = { jwk: await crypto.subtle.exportKey('jwk', kp.privateKey), pub: b64u(await crypto.subtle.exportKey('raw', kp.publicKey)) };
    await metaSet(env, '*', 'vapid', v);
  }
  return v;
}
async function vapidAuth(env, endpoint) {
  const v = await vapid(env), aud = new URL(endpoint).origin;
  const h = b64u(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))), c = b64u(utf8(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'https://razor-back1.github.io/Potager/' })));
  const key = await crypto.subtle.importKey('jwk', v.jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, utf8(h + '.' + c));
  return `vapid t=${h}.${c}.${b64u(sig)}, k=${v.pub}`;
}
async function encrypt(sub, text) {
  const ua = unb64u(sub.keys.p256dh), auth = unb64u(sub.keys.auth);
  const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const as = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, kp.privateKey, 256));
  const ikm = await hkdf(auth, ecdh, cat(utf8('WebPush: info\0'), ua, as), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, utf8('Content-Encoding: aes128gcm\0'), 16), nonce = await hkdf(salt, ikm, utf8('Content-Encoding: nonce\0'), 12);
  const k = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, k, cat(utf8(text), new Uint8Array([2]))));
  return cat(salt, new Uint8Array([0, 0, 16, 0]), new Uint8Array([65]), as, ct);
}
const subsOf = async (env, uid) => (await env.DB.prepare('SELECT * FROM subs WHERE uid=?').bind(uid).all()).results.map(r => ({ ...r, keys: JSON.parse(r.keys), prefs: JSON.parse(r.prefs || '{}') }));
async function sendPush(env, sub, msg) {
  try {
    const r = await fetch(sub.endpoint, { method: 'POST', headers: { Authorization: await vapidAuth(env, sub.endpoint), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '43200', Urgency: 'normal' }, body: await encrypt(sub, JSON.stringify(msg)) });
    if (r.status === 404 || r.status === 410) { await env.DB.prepare('DELETE FROM subs WHERE endpoint=?').bind(sub.endpoint).run(); return 'gone' }
    return r.ok ? 'ok' : 'http ' + r.status;
  } catch (e) { return 'err ' + e.message }
}
async function pushAll(env, uid, pref, msg) { if (!env.DB) return []; const out = []; for (const s of await subsOf(env, uid)) if (s.prefs[pref] !== false) out.push(await sendPush(env, s, msg)); return out }
const thirstLim = m => m >= 5 && m <= 9 ? 4 : (m === 4 || m === 10) ? 7 : null;
const dayDiff = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
const meteoCache = {};
async function meteo(geo) {
  const g = geo && geo.lat ? geo : { lat: 50.586, lon: 4.877 }, key = g.lat.toFixed(2) + ',' + g.lon.toFixed(2);
  if (meteoCache[key] && Date.now() - meteoCache[key].t < 20 * 60e3) return meteoCache[key].v;
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${g.lat}&longitude=${g.lon}&hourly=temperature_2m&daily=precipitation_sum&past_days=10&forecast_days=2&timezone=Europe%2FBrussels`);
    const j = await r.json(), today = localDay(), t0 = today + 'T18:00', tm = new Date(Date.parse(today + 'T12:00:00Z') + 864e5).toISOString().slice(0, 10) + 'T09:00';
    let night = null; (j.hourly.time || []).forEach((t, i) => { if (t >= t0 && t <= tm) { const v = j.hourly.temperature_2m[i]; if (v != null && (night == null || v < night)) night = v } });
    const wet = (j.daily.time || []).filter((d, i) => d <= today && (j.daily.precipitation_sum[i] || 0) >= 5);
    const v = { night, lastRain: wet.length ? wet[wet.length - 1] : null }; meteoCache[key] = { t: Date.now(), v }; return v;
  } catch (e) { return { night: null, lastRain: null } }
}
async function notifyUser(env, uid, force) {
  const subs = await subsOf(env, uid); if (!subs.length) return;
  const rows = (await env.DB.prepare('SELECT id,name,plan FROM gardens WHERE uid=? AND del=0 AND ex=0 AND plan IS NOT NULL').bind(uid).all()).results;
  const plans = rows.map(r => ({ g: r, p: JSON.parse(r.plan) })); if (!plans.length) return;
  const h = localHour(), today = localDay(), sent = (await metaGet(env, uid, 'nsent')) || { digest: {}, frost: {}, ev: {} };
  const m = await meteo((plans.find(x => x.p.geo) || {}).p?.geo), month = +today.slice(5, 7), lim = thirstLim(month), multi = plans.length > 1;
  let changed = false;
  for (const s of subs) {
    const pr = s.prefs || {}, hour = +pr.hour || 8, sid = s.endpoint.slice(-24);
    if ((force || h === hour) && sent.digest[sid] !== today) {
      const lines = [];
      for (const { g, p } of plans) {
        const pre = multi ? g.name + ' : ' : '';
        if (pr.water !== false && lim) {
          const th = (p.water || []).filter(w => { let last = w.last; if (!w.serre && m.lastRain && (!last || m.lastRain > last)) last = m.lastRain; return !last || dayDiff(last, today) >= lim }).map(w => w.name);
          if (th.length) lines.push(pre + (pre ? 'à arroser ' : 'À arroser ') + th.slice(0, 4).join(', ') + (th.length > 4 ? ' +' + (th.length - 4) : ''));
        }
        const due = (p.ev || []).filter(e => e.d <= today && pr[e.k] !== false && !sent.ev[g.id + e.id]);
        due.slice(0, 5).forEach(e => { lines.push(pre + e.txt); sent.ev[g.id + e.id] = today });
      }
      sent.digest[sid] = today; changed = true;
      if (lines.length) await sendPush(env, s, { title: 'Potager · aujourd\'hui', body: lines.slice(0, 6).join('\n'), tag: 'digest', url: './' });
    }
    if (pr.frost !== false && (force || h === 18) && sent.frost[sid] !== today && m.night != null) {
      const crops = []; for (const { p } of plans) (p.frost || []).forEach(f => { if (m.night <= (f.serre ? -2 : 2)) crops.push(f.crop + ' (' + f.name + ')') });
      sent.frost[sid] = today; changed = true;
      if (crops.length) await sendPush(env, s, { title: `Gel prévu cette nuit : ${String(Math.round(m.night * 10) / 10).replace('.', ',')} °C`, body: 'Couvre ou rentre : ' + [...new Set(crops)].slice(0, 6).join(', '), tag: 'frost', url: './' });
    }
  }
  if (changed) { for (const k in sent.ev) if (dayDiff(sent.ev[k], today) > 60) delete sent.ev[k]; await metaSet(env, uid, 'nsent', sent) }
}
async function runNotify(env) {
  if (!env.DB) return; await schema(env);
  const h = localHour(); if (h !== 18 && !(h >= 5 && h <= 12)) return;   /* rien à envoyer en dehors de ces heures */
  for (const r of (await env.DB.prepare('SELECT DISTINCT uid FROM subs').all()).results) { try { await notifyUser(env, r.uid) } catch (e) { } }
}

/* ---------- calendrier : abonnement iPhone / iPad (se met à jour tout seul) ---------- */
const icsEsc = t => String(t).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');
const icsFold = l => { const enc = new TextEncoder(), out = []; let cur = ''; for (const ch of l) { if (enc.encode(cur + ch).length > 73) { out.push(cur); cur = ' ' + ch } else cur += ch } out.push(cur); return out.join('\r\n') };
const icsDay = d => d.replace(/-/g, '');
const icsNext = d => new Date(Date.parse(d + 'T12:00:00Z') + 864e5).toISOString().slice(0, 10).replace(/-/g, '');
const icsHash = t => { let h = 5381; for (const c of t) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0; return h.toString(36) };
const ICS_KIND = { harvest: 'Récolte', care: 'Entretien', dar: 'Traitement', plan: 'Plantation', nursery: 'Repiquage', resow: 'Semis' };
async function calIcs(env, uid) {
  const rows = (await env.DB.prepare('SELECT id,name,plan FROM gardens WHERE uid=? AND del=0 AND ex=0 AND plan IS NOT NULL').bind(uid).all()).results;
  const today = localDay(), multi = rows.length > 1, stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Atelier Potager//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Potager', 'X-WR-TIMEZONE:Europe/Brussels', 'REFRESH-INTERVAL;VALUE=DURATION:PT6H', 'X-PUBLISHED-TTL:PT6H'];
  for (const r of rows) {
    let p; try { p = JSON.parse(r.plan) } catch (e) { continue }
    for (const e of (p.ev || [])) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(e.d || '')) continue;
      const age = dayDiff(e.d, today); if (age > 60 || age < -400) continue;
      L.push('BEGIN:VEVENT', 'UID:' + icsHash(r.id + '|' + e.id) + '-' + icsDay(e.d) + '@atelier-potager', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + icsDay(e.d), 'DTEND;VALUE=DATE:' + icsNext(e.d),
        icsFold('SUMMARY:' + icsEsc((multi ? r.name + ' · ' : '') + e.txt)), icsFold('CATEGORIES:' + icsEsc(ICS_KIND[e.k] || 'Potager')), 'TRANSP:TRANSPARENT', 'END:VEVENT');
    }
  }
  L.push('END:VCALENDAR'); return L.join('\r\n') + '\r\n';
}

/* ---------- requêtes de l'app ---------- */
const gid = url => (url.searchParams.get('id') || '').replace(/[^\w-]/g, '').slice(0, 40);
const ADMIN_ONLY = new Set(['/status', '/water', '/stop', '/config', '/run', '/admin/users', '/admin/invite', '/admin/remove']);
export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(req.url);
    if (!env.DB) return J({ error: 'Base D1 « DB » non reliée au relais (Settings → Bindings → D1 database, nom DB).' }, 500);
    try {
      await schema(env);
      /* photos : lien public mais introuvable sans son identifiant */
      if (url.pathname.startsWith('/p/')) {
        const r = await env.DB.prepare('SELECT data FROM photos WHERE id=?').bind(url.pathname.slice(3).replace(/[^\w]/g, '')).first();
        if (!r) return new Response('Photo introuvable', { status: 404, headers: CORS });
        const m = /^data:([^;]+);base64,(.*)$/.exec(r.data); if (!m) return new Response('Photo illisible', { status: 500, headers: CORS });
        return new Response(Uint8Array.from(atob(m[2]), c => c.charCodeAt(0)), { headers: { ...CORS, 'Content-Type': m[1], 'Cache-Control': 'public, max-age=31536000, immutable' } });
      }
      /* calendrier : lien secret propre à chaque compte, lu par l'app Calendrier sans code d'accès */
      const cm = /^\/cal\/([a-z0-9]{16,40})\.ics$/.exec(url.pathname);
      if (cm) {
        const r = await env.DB.prepare("SELECT uid FROM meta WHERE k='cal' AND v=?").bind(JSON.stringify(cm[1])).first();
        if (!r) return new Response('Calendrier introuvable', { status: 404, headers: CORS });
        return new Response(await calIcs(env, r.uid), { headers: { ...CORS, 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-cache' } });
      }
      const me = await who(env, req);
      if (!me) return J({ error: 'Code d\'accès refusé.' }, 401);
      if (ADMIN_ONLY.has(url.pathname) && me.role !== 'admin') return J({ error: 'Réservé au propriétaire du relais.' }, 403);
      if (me.role === 'admin') await migrate(env);
      const uid = me.id, body = req.method === 'POST' || req.method === 'PUT' ? await req.json().catch(() => ({})) : {};
      const out = async (maxAge) => ({ state: await state(env, maxAge), log: (await getLog(env)).slice(0, 60), cfgAt: (await getCfg(env)).at || null });
      switch (url.pathname) {
        case '/gardens': {
          const list = (await env.DB.prepare('SELECT id,name,at,ex,del,size FROM gardens WHERE uid=?').bind(uid).all()).results.map(g => ({ ...g, ex: !!g.ex, del: !!g.del }));
          return J({ list, gardena: me.role === 'admin' && !!(env.GARDENA_KEY && env.GARDENA_SECRET), me: { role: me.role, name: me.name } });
        }
        case '/garden': {
          const id = gid(url); if (!id) return J({ error: 'Identifiant manquant.' }, 400);
          if (req.method === 'GET') { const g = await env.DB.prepare('SELECT state,at FROM gardens WHERE uid=? AND id=? AND del=0').bind(uid, id).first(); return g ? J({ state: JSON.parse(g.state), at: g.at }) : J({ error: 'Potager inconnu.' }, 404) }
          if (req.method === 'DELETE') { await env.DB.prepare('UPDATE gardens SET del=1, state=NULL, plan=NULL, at=? WHERE uid=? AND id=?').bind(Date.now(), uid, id).run(); return J({ ok: true }) }
          if (req.method === 'PUT') {
            if (!body || !body.state || !body.at) return J({ error: 'Potager vide.' }, 400);
            const st = JSON.stringify(body.state); if (st.length > 1900000) return J({ error: 'Potager trop lourd pour la synchronisation (photos).' }, 413);
            const cur = await env.DB.prepare('SELECT at,del FROM gardens WHERE uid=? AND id=?').bind(uid, id).first();
            if (cur && !cur.del && cur.at > body.at) return J({ error: 'Version plus récente sur un autre appareil.', at: cur.at }, 409);
            await env.DB.prepare('INSERT INTO gardens(uid,id,name,at,ex,del,size,state,plan) VALUES(?,?,?,?,?,0,?,?,?) ON CONFLICT(uid,id) DO UPDATE SET name=excluded.name, at=excluded.at, ex=excluded.ex, del=0, size=excluded.size, state=excluded.state, plan=COALESCE(excluded.plan, gardens.plan)')
              .bind(uid, id, String(body.state.name || 'Potager').slice(0, 80), body.at, body.state.example ? 1 : 0, st.length, st, body.plan ? JSON.stringify(body.plan) : null).run();
            return J({ ok: true, at: body.at });
          }
          return J({ error: 'Méthode non prise en charge.' }, 405);
        }
        case '/photo': {
          const d = String(body.data || ''); if (!/^data:image\/(jpeg|png|webp);base64,/.test(d)) return J({ error: 'Image invalide.' }, 400);
          if (d.length > 1800000) return J({ error: 'Photo trop lourde.' }, 413);
          const id = rid(22); await env.DB.prepare('INSERT INTO photos(id,uid,data,at) VALUES(?,?,?,?)').bind(id, uid, d, Date.now()).run();
          return J({ id, url: url.origin + '/p/' + id });
        }
        case '/cal': {
          let t = await metaGet(env, uid, 'cal');
          if (!t || url.searchParams.get('new')) { t = rid(24); await metaSet(env, uid, 'cal', t) }
          return J({ token: t, url: url.origin + '/cal/' + t + '.ics' });
        }
        case '/push/key': return J({ key: (await vapid(env)).pub });
        case '/push/subscribe': {
          if (!body.sub || !body.sub.endpoint || !body.sub.keys) return J({ error: 'Abonnement invalide.' }, 400);
          await env.DB.prepare('INSERT INTO subs(endpoint,uid,keys,prefs,name,at) VALUES(?,?,?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET uid=excluded.uid, keys=excluded.keys, prefs=excluded.prefs, name=excluded.name, at=excluded.at')
            .bind(body.sub.endpoint, uid, JSON.stringify(body.sub.keys), JSON.stringify(body.prefs || {}), String(body.name || 'Appareil').slice(0, 40), Date.now()).run();
          return J({ ok: true });
        }
        case '/push/prefs': { const r = await env.DB.prepare('UPDATE subs SET prefs=? WHERE endpoint=? AND uid=?').bind(JSON.stringify(body.prefs || {}), body.endpoint || '', uid).run(); return r.meta.changes ? J({ ok: true }) : J({ error: 'Appareil non abonné.' }, 404) }
        case '/push/unsubscribe': await env.DB.prepare('DELETE FROM subs WHERE endpoint=? AND uid=?').bind(body.endpoint || '', uid).run(); return J({ ok: true });
        case '/push/test': { const x = (await subsOf(env, uid)).find(y => y.endpoint === body.endpoint); if (!x) return J({ error: 'Appareil non abonné.' }, 404); const r = await sendPush(env, x, { title: 'Atelier Potager', body: 'Les notifications fonctionnent sur cet appareil.', tag: 'test', url: './' }); return r === 'ok' ? J({ ok: true }) : J({ error: 'Envoi refusé (' + r + ').' }, 502) }
        case '/push/digest': { if (url.searchParams.get('reset')) { const n = (await metaGet(env, uid, 'nsent')) || { digest: {}, frost: {}, ev: {} }; n.digest = {}; n.frost = {}; await metaSet(env, uid, 'nsent', n) } await notifyUser(env, uid, true); return J({ ok: true }) }
        /* gestion des amis (propriétaire seulement) */
        case '/admin/users': {
          const us = (await env.DB.prepare('SELECT u.id,u.name,u.created,u.last,(SELECT COUNT(*) FROM gardens g WHERE g.uid=u.id AND g.del=0) AS n FROM users u ORDER BY u.created').all()).results;
          return J({ users: us });
        }
        case '/admin/invite': {
          const name = String(body.name || 'Ami').trim().slice(0, 40) || 'Ami', token = rid(24), id = 'u' + rid(10);
          await env.DB.prepare('INSERT INTO users(id,name,th,role,created,last) VALUES(?,?,?,?,?,NULL)').bind(id, name, await sha(token), 'user', Date.now()).run();
          return J({ id, name, token });
        }
        case '/admin/remove': {
          const id = String(body.id || ''); if (!id || id === 'admin') return J({ error: 'Compte invalide.' }, 400);
          await env.DB.batch(['users WHERE id', 'gardens WHERE uid', 'photos WHERE uid', 'subs WHERE uid', 'meta WHERE uid'].map(t => env.DB.prepare('DELETE FROM ' + t + '=?').bind(id)));
          return J({ ok: true });
        }
        case '/status':
          if (!env.GARDENA_KEY || !env.GARDENA_SECRET) return J({ error: 'GARDENA n\'est pas encore configuré sur le relais (secrets GARDENA_KEY et GARDENA_SECRET).', nogardena: true }, 400);
          return J(await out(url.searchParams.get('fresh') ? 120000 : 600000));
        case '/water': await water(env, body.id, +body.seconds || 600, 'manuel', ''); return J(await out(600000));
        case '/stop': await stop(env, body.id); return J(await out(600000));
        case '/config':
          if (req.method === 'PUT') { if (JSON.stringify(body).length > 50000) return J({ error: 'Réglages trop volumineux.' }, 400); await env.POTAGER.put('cfg', JSON.stringify({ ...body, at: Date.now() })); return J({ ok: true }) }
          return J(await getCfg(env));
        case '/run': await runAuto(env); return J(await out(600000));
        default: return J({ ok: true, app: 'Atelier Potager — relais', me: { role: me.role, name: me.name } });
      }
    } catch (e) { return J({ error: e.message }, 502) }
  },
  async scheduled(ev, env, ctx) { ctx.waitUntil(Promise.all([runNotify(env).catch(() => { }), (env.GARDENA_KEY && env.POTAGER ? runAuto(env) : Promise.resolve()).catch(e => addLog(env, { type: 'error', msg: e.message }))])) }
};
