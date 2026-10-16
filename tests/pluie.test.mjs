/* Alertes pluie de l'app Météo Leuze, envoyées par le relais : radar Buienradar et pluviomètre simulés. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { relais } from './outils.mjs';

const b64u = b => Buffer.from(b).toString('base64url');
async function abonnement(n) {
  const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  return { endpoint: 'https://push.test/' + n, keys: { p256dh: b64u(await crypto.subtle.exportKey('raw', kp.publicKey)), auth: b64u(crypto.getRandomValues(new Uint8Array(16))) } };
}
const hm = ms => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Brussels', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(ms));
/* monde simulé : station, radar (valeur par tranche de 5 min) et service de notifications */
function monde() {
  const w = { rate: 0, total: 0, radar: () => 0, envois: [] };
  const vrai = globalThis.fetch;
  globalThis.fetch = async (u, init) => {
    u = String(u);
    if (u.startsWith('https://api.weather.com/')) return new Response(JSON.stringify({ observations: [{ stationID: 'IGHEZE29', epoch: Math.floor(w.now / 1000) - 60, lat: 50.553, lon: 4.913, metric: { precipRate: w.rate, precipTotal: w.total } }] }));
    if (u.startsWith('https://gpsgadget.buienradar.nl/')) {
      const t0 = Math.floor(w.now / 300e3) * 300e3, l = [];
      for (let i = 0; i < 24; i++) l.push(String(w.radar(i * 5)).padStart(3, '0') + '|' + hm(t0 + i * 300e3));
      return new Response(l.join('\r\n'));
    }
    if (u.startsWith('https://push.test/')) { w.envois.push({ a: u, h: init.headers }); return new Response('', { status: 201 }) }
    return vrai(u, init);
  };
  w.fin = () => { globalThis.fetch = vrai };
  return w;
}
const JOUR = Date.parse('2026-10-16T13:00:00Z');   /* 15 h à Bruxelles */
const titres = async (R, w, t) => { w.now = t; w.envois = []; const res = await R.W.scheduled({ scheduledTime: t }, R.env, { waitUntil: p => (R.p = p) }); await R.p; return w.envois.map(e => e.a) };

test('radar : une alerte « pluie prévue » par épisode, pas pour le potager', async () => {
  const w = monde(), R = await relais();
  try {
    const meteo = await abonnement('meteo'), potager = await abonnement('potager');
    assert.equal((await R.appel('/push/subscribe', { method: 'POST', body: { sub: meteo, prefs: { app: 'meteo' }, name: 'iPhone météo' } })).status, 200);
    await R.appel('/push/subscribe', { method: 'POST', body: { sub: potager, prefs: {}, name: 'iPhone potager' } });
    assert.deepEqual(await titres(R, w, JOUR), [], 'temps sec : rien');
    w.radar = min => min >= 25 && min <= 50 ? 120 : 0;              /* ≈ 2,2 mm/h dans 25 min */
    w.now = Date.now(); const lu = await (await R.appel('/meteo/rain')).json();
    assert.equal(lu.next.min >= 20 && lu.next.min <= 30, true); assert.equal(lu.send[0].kind, 'soon');
    assert.match(lu.send[0].msg.title, /^Pluie prévue vers \d\d:\d\d \(dans 2[05] min\)$/);
    assert.deepEqual(await titres(R, w, JOUR + 5 * 60e3), ['https://push.test/meteo'], 'une alerte, à l\'app Météo seulement');
    assert.deepEqual(await titres(R, w, JOUR + 10 * 60e3), [], 'pas de doublon');
  } finally { w.fin() }
});

test('pluviomètre : alerte quand il commence à pleuvoir, nouvelle alerte après une heure sèche', async () => {
  const w = monde(), R = await relais();
  try {
    await R.appel('/push/subscribe', { method: 'POST', body: { sub: await abonnement('m'), prefs: { app: 'meteo' } } });
    await titres(R, w, JOUR);
    w.rate = 1.2; w.total = 0.4;
    assert.deepEqual(await titres(R, w, JOUR + 5 * 60e3), ['https://push.test/m']);
    w.total = 1.6; assert.deepEqual(await titres(R, w, JOUR + 10 * 60e3), [], 'même averse');
    w.rate = 0; assert.deepEqual(await titres(R, w, JOUR + 40 * 60e3), []);
    w.rate = 3; w.total = 2.4; assert.deepEqual(await titres(R, w, JOUR + 50 * 60e3), [], 'moins d\'une heure sèche : même épisode');
    w.rate = 0; await titres(R, w, JOUR + 55 * 60e3);
    w.rate = 0.8; w.total = 3.0; assert.deepEqual(await titres(R, w, JOUR + 125 * 60e3), ['https://push.test/m'], 'nouvel épisode');
  } finally { w.fin() }
});

test('réglages : alertes coupées, et la nuit seulement si demandé', async () => {
  const w = monde(), R = await relais();
  try {
    await R.appel('/push/subscribe', { method: 'POST', body: { sub: await abonnement('a'), prefs: { app: 'meteo', soon: false } } });
    await R.appel('/push/subscribe', { method: 'POST', body: { sub: await abonnement('b'), prefs: { app: 'meteo' } } });
    await R.appel('/push/subscribe', { method: 'POST', body: { sub: await abonnement('c'), prefs: { app: 'meteo', night: true } } });
    w.radar = min => min >= 10 ? 130 : 0;
    assert.deepEqual((await titres(R, w, JOUR)).sort(), ['https://push.test/b', 'https://push.test/c']);
    const nuit = Date.parse('2026-10-17T00:30:00Z');          /* 2 h 30 à Bruxelles */
    assert.deepEqual(await titres(R, w, nuit), ['https://push.test/c']);
  } finally { w.fin() }
});

test('essai depuis l\'app Météo et potager toujours toutes les 30 minutes', async () => {
  const w = monde(), R = await relais();
  try {
    const s = await abonnement('t');
    await R.appel('/push/subscribe', { method: 'POST', body: { sub: s, prefs: { app: 'meteo' } } });
    w.now = JOUR; const r = await R.appel('/push/test', { method: 'POST', body: { endpoint: s.endpoint, kind: 'soon' } });
    assert.equal(r.status, 200); assert.equal(w.envois.length, 1);
    /* un cron toutes les 5 minutes ne déclenche le reste qu'à :00 et :30 (pas d'appel GARDENA ici, pas de clé) */
    assert.deepEqual(await titres(R, w, JOUR + 15 * 60e3), []);
  } finally { w.fin() }
});
