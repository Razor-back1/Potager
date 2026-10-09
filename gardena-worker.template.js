// Atelier Potager — relais Cloudflare : synchronisation des potagers et GARDENA smart system
// ------------------------------------------------------------------
// Ce relais tourne en permanence chez Cloudflare (offre gratuite). Il :
//   0. synchronise tes potagers entre tes appareils (iPhone, iPad…) ;
//   1. garde ta clé GARDENA en secret (elle n'est jamais dans l'app) ;
//   2. lit l'état des vannes, sondes et prises pour l'app ;
//   3. ouvre ou ferme une vanne quand l'app le demande (arrosage manuel avec minuteur) ;
//   4. toutes les 30 minutes, applique tes règles d'arrosage automatique, même app fermée.
//
// À régler dans Cloudflare (Worker > Settings) :
//   Variables and Secrets : APP_TOKEN (obligatoire), GARDENA_KEY et GARDENA_SECRET (seulement pour l'arrosage), type « Secret »
//   Bindings              : KV namespace, nom de variable POTAGER
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
      try { await water(env, id, (z.min || 15) * 60, 'auto', d.why); busy = true; const vn = (s.valves.find(v => v.id === id) || {}).name || 'Vanne'; await pushAll(env, 'gardena', { title: 'Arrosage automatique', body: `${vn} : ${z.min || 15} min. ${d.why}`, tag: 'gardena', url: './' }) }
      catch (e) { await addLog(env, { type: 'error', valve: id, msg: e.message }) }
    } else if (d.skip && !log.some(e => e.type === 'skip' && e.valve === id && localDay(e.at) === today)) {
      await addLog(env, { type: 'skip', valve: id, why: d.why }); const vn = (s.valves.find(v => v.id === id) || {}).name || 'Vanne'; await pushAll(env, 'gardena', { title: 'Arrosage sauté', body: `${vn} : ${d.why}`, tag: 'gardena', url: './' });
    }
  }
}


/* ---------- notifications (Web Push, chiffrement aes128gcm + VAPID) ---------- */
const b64u = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)) };
const cat = (...a) => { const n = a.reduce((x, y) => x + y.length, 0), o = new Uint8Array(n); let i = 0; for (const x of a) { o.set(x, i); i += x.length } return o };
const utf8 = s => new TextEncoder().encode(s);
async function hkdf(salt, ikm, info, len) { const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']); return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8)) }
async function vapid(env) {
  let v = await env.POTAGER.get('vapid', { type: 'json' });
  if (!v) {
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    v = { jwk: await crypto.subtle.exportKey('jwk', kp.privateKey), pub: b64u(await crypto.subtle.exportKey('raw', kp.publicKey)) };
    await env.POTAGER.put('vapid', JSON.stringify(v));
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
const getSubs = async env => (await env.POTAGER.get('subs', { type: 'json' })) || [];
async function sendPush(env, sub, msg) {
  try {
    const r = await fetch(sub.endpoint, { method: 'POST', headers: { Authorization: await vapidAuth(env, sub.endpoint), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '43200', Urgency: 'normal' }, body: await encrypt(sub, JSON.stringify(msg)) });
    if (r.status === 404 || r.status === 410) { const l = (await getSubs(env)).filter(x => x.endpoint !== sub.endpoint); await env.POTAGER.put('subs', JSON.stringify(l)); return 'gone' }
    return r.ok ? 'ok' : 'http ' + r.status;
  } catch (e) { return 'err ' + e.message }
}
async function pushAll(env, pref, msg) { const out = []; for (const s of await getSubs(env)) if (!s.prefs || s.prefs[pref] !== false) out.push(await sendPush(env, s, msg)); return out }
const PNAMES = { harvest: 'récoltes', nursery: 'semis', plan: 'plantations', dar: 'traitements' };
const thirstLim = m => m >= 5 && m <= 9 ? 4 : (m === 4 || m === 10) ? 7 : null;
const dayDiff = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
async function meteo(geo) {
  try {
    const g = geo || { lat: 50.586, lon: 4.877 };
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${g.lat}&longitude=${g.lon}&hourly=temperature_2m&daily=precipitation_sum&past_days=10&forecast_days=2&timezone=Europe%2FBrussels`);
    const j = await r.json(), today = localDay(), t0 = today + 'T18:00', tm = new Date(Date.parse(today + 'T12:00:00Z') + 864e5).toISOString().slice(0, 10) + 'T09:00';
    let night = null; (j.hourly.time || []).forEach((t, i) => { if (t >= t0 && t <= tm) { const v = j.hourly.temperature_2m[i]; if (v != null && (night == null || v < night)) night = v } });
    const wet = (j.daily.time || []).filter((d, i) => d <= today && (j.daily.precipitation_sum[i] || 0) >= 5);
    return { night, lastRain: wet.length ? wet[wet.length - 1] : null };
  } catch (e) { return { night: null, lastRain: null } }
}
async function runNotify(env, force) {
  const subs = await getSubs(env); if (!subs.length) return;
  const h = localHour(), today = localDay(), sent = (await env.POTAGER.get('nsent', { type: 'json' })) || { digest: {}, frost: {}, ev: {} };
  const gardens = (await gList(env)).filter(g => !g.del && !g.ex);
  const plans = []; for (const g of gardens) { const p = await env.POTAGER.get('plan:' + g.id, { type: 'json' }); if (p) plans.push({ g, p }) }
  if (!plans.length) return;
  const cfg = await getCfg(env), m = await meteo(cfg.geo), month = +today.slice(5, 7), lim = thirstLim(month), multi = plans.length > 1;
  let changed = false;
  for (const s of subs) {
    const pr = s.prefs || {}, hour = +pr.hour || 8, sid = s.endpoint.slice(-24);
    /* résumé du matin */
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
    /* alerte gel en fin de journée */
    if (pr.frost !== false && (force || h === 18) && sent.frost[sid] !== today && m.night != null) {
      const crops = []; for (const { g, p } of plans) (p.frost || []).forEach(f => { if (m.night <= (f.serre ? -2 : 2)) crops.push(f.crop + ' (' + f.name + ')') });
      sent.frost[sid] = today; changed = true;
      if (crops.length) await sendPush(env, s, { title: `Gel prévu cette nuit : ${String(Math.round(m.night * 10) / 10).replace('.', ',')} °C`, body: 'Couvre ou rentre : ' + [...new Set(crops)].slice(0, 6).join(', '), tag: 'frost', url: './' });
    }
  }
  if (changed) { for (const k in sent.ev) if (dayDiff(sent.ev[k], today) > 60) delete sent.ev[k]; await env.POTAGER.put('nsent', JSON.stringify(sent)) }
}

/* ---------- synchronisation des potagers ---------- */
const gList = async env => (await env.POTAGER.get('gardens', { type: 'json' })) || [];
async function gSetList(env, fn) { const l = await gList(env); const n = fn(l) || l; await env.POTAGER.put('gardens', JSON.stringify(n)); return n }
const gid = url => (url.searchParams.get('id') || '').replace(/[^\w-]/g, '').slice(0, 40);

/* ---------- requêtes de l'app ---------- */
export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(req.url);
    if (!env.APP_TOKEN || req.headers.get('X-Potager-Key') !== env.APP_TOKEN) return J({ error: 'Code d\'accès refusé.' }, 401);
    if (!env.POTAGER) return J({ error: 'Stockage KV « POTAGER » non relié au relais.' }, 500);
    try {
      const body = req.method === 'POST' || req.method === 'PUT' ? await req.json().catch(() => ({})) : {};
      const out = async (maxAge) => ({ state: await state(env, maxAge), log: (await getLog(env)).slice(0, 60), cfgAt: (await getCfg(env)).at || null });
      switch (url.pathname) {
        case '/gardens': return J({ list: await gList(env), gardena: !!(env.GARDENA_KEY && env.GARDENA_SECRET) });
        case '/garden': {
          const id = gid(url); if (!id) return J({ error: 'Identifiant manquant.' }, 400);
          if (req.method === 'GET') { const g = await env.POTAGER.get('garden:' + id, { type: 'json' }); return g ? J(g) : J({ error: 'Potager inconnu.' }, 404) }
          if (req.method === 'DELETE') { await env.POTAGER.delete('garden:' + id); await env.POTAGER.delete('plan:' + id); await gSetList(env, l => [...l.filter(x => x.id !== id), { id, del: true, at: Date.now() }]); return J({ ok: true }) }
          if (req.method === 'PUT') {
            if (!body || !body.state || !body.at) return J({ error: 'Potager vide.' }, 400);
            const raw = JSON.stringify(body.state); if (raw.length > 24e6) return J({ error: 'Potager trop lourd (photos) pour la synchronisation.' }, 413);
            const cur = (await gList(env)).find(x => x.id === id);
            if (cur && !cur.del && cur.at > body.at) return J({ error: 'Version plus récente sur un autre appareil.', at: cur.at }, 409);
            if (body.plan) await env.POTAGER.put('plan:' + id, JSON.stringify(body.plan));
            const raw2 = JSON.stringify({ state: body.state, at: body.at }); await env.POTAGER.put('garden:' + id, raw2);
            await gSetList(env, l => [...l.filter(x => x.id !== id), { id, name: String(body.state.name || 'Potager').slice(0, 80), at: body.at, ex: !!body.state.example, size: raw.length }]);
            return J({ ok: true, at: body.at });
          }
          return J({ error: 'Méthode non prise en charge.' }, 405);
        }
        case '/push/key': return J({ key: (await vapid(env)).pub });
        case '/push/subscribe': {
          if (!body.sub || !body.sub.endpoint || !body.sub.keys) return J({ error: 'Abonnement invalide.' }, 400);
          const l = (await getSubs(env)).filter(x => x.endpoint !== body.sub.endpoint);
          l.push({ endpoint: body.sub.endpoint, keys: body.sub.keys, prefs: body.prefs || {}, name: String(body.name || 'Appareil').slice(0, 40), at: Date.now() });
          await env.POTAGER.put('subs', JSON.stringify(l)); return J({ ok: true, n: l.length });
        }
        case '/push/prefs': { const l = await getSubs(env), x = l.find(y => y.endpoint === body.endpoint); if (!x) return J({ error: 'Appareil non abonné.' }, 404); x.prefs = body.prefs || {}; await env.POTAGER.put('subs', JSON.stringify(l)); return J({ ok: true }) }
        case '/push/unsubscribe': { const l = (await getSubs(env)).filter(x => x.endpoint !== body.endpoint); await env.POTAGER.put('subs', JSON.stringify(l)); return J({ ok: true }) }
        case '/push/test': { const x = (await getSubs(env)).find(y => y.endpoint === body.endpoint); if (!x) return J({ error: 'Appareil non abonné.' }, 404); const r = await sendPush(env, x, { title: 'Atelier Potager', body: 'Les notifications fonctionnent sur cet appareil.', tag: 'test', url: './' }); return r === 'ok' ? J({ ok: true }) : J({ error: 'Envoi refusé (' + r + ').' }, 502) }
        case '/push/digest': { if (url.searchParams.get('reset')) await env.POTAGER.delete('nsent'); await runNotify(env, true); return J({ ok: true }) }
        case '/status':
          if (!env.GARDENA_KEY || !env.GARDENA_SECRET) return J({ error: 'GARDENA n\'est pas encore configuré sur le relais (secrets GARDENA_KEY et GARDENA_SECRET).', nogardena: true }, 400); return J(await out(url.searchParams.get('fresh') ? 120000 : 600000));
        case '/water': await water(env, body.id, +body.seconds || 600, 'manuel', ''); return J(await out(600000));
        case '/stop': await stop(env, body.id); return J(await out(600000));
        case '/config':
          if (req.method === 'PUT') { if (JSON.stringify(body).length > 50000) return J({ error: 'Réglages trop volumineux.' }, 400); await env.POTAGER.put('cfg', JSON.stringify({ ...body, at: Date.now() })); return J({ ok: true }) }
          return J(await getCfg(env));
        case '/run': await runAuto(env); return J(await out(600000));
        default: return J({ ok: true, app: 'Atelier Potager — relais', gardena: !!(env.GARDENA_KEY && env.GARDENA_SECRET) });
      }
    } catch (e) { return J({ error: e.message }, 502) }
  },
  async scheduled(ev, env, ctx) { ctx.waitUntil(Promise.all([runNotify(env).catch(() => { }), (env.GARDENA_KEY ? runAuto(env) : Promise.resolve()).catch(e => addLog(env, { type: 'error', msg: e.message }))])) }
};
