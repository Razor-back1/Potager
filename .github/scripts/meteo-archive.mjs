// Archive de la station météo — lancé chaque nuit par GitHub Actions (.github/workflows/meteo-archive.yml).
// Lit chez Weather Underground toutes les mesures (pas de 5 min) de chaque journée terminée
// et les range dans meteo/data, que l'app Météo lit directement depuis GitHub Pages :
//   meteo/data/days/AAAA/AAAA-MM-JJ.json  toutes les mesures d'une journée (colonnes compactes)
//   meteo/data/AAAA.json                  un résumé par jour pour l'année
//   meteo/data/index.json                 période couverte, années disponibles
// Au premier lancement, il rattrape les BACKFILL_DAYS derniers jours (400 par défaut).
// Node 20, sans dépendance.
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const STATION = process.env.WU_STATION || 'IGHEZE29';
const KEY = process.env.WU_KEY || '6fffe640ff8c4e82bfe640ff8cfe8292';
const BASE = process.env.WU_BASE || 'https://api.weather.com';
const ROOT = process.env.ARCHIVE_DIR || 'meteo/data';
const BACKFILL = +(process.env.BACKFILL_DAYS || 400);
const MAX_CALLS = +(process.env.MAX_CALLS || 600);      // limite WU : 1500 appels/jour
const DELAY = +(process.env.CALL_DELAY_MS ?? 2100);      // limite WU : 30 appels/minute
const TZ = 'Europe/Brussels';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const r1 = v => v == null || !isFinite(v) ? null : Math.round(v * 10) / 10;
const ymdTZ = d => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const hmTZ = e => new Intl.DateTimeFormat('fr-BE', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(e * 1000));
const shift = (ymd, n) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
const dayFile = d => path.join(ROOT, 'days', d.slice(0, 4), d + '.json');
async function readJSON(f, def) { try { return JSON.parse(await readFile(f, 'utf8')); } catch { return def; } }
async function writeJSON(f, v) { await mkdir(path.dirname(f), { recursive: true }); await writeFile(f, JSON.stringify(v)); }

// colonnes d'un fichier jour
const COLS = ['e', 't', 'tl', 'th', 'dp', 'h', 'ws', 'wg', 'wd', 'pmin', 'pmax', 'pr', 'pt', 'sr', 'uv'];
function compact(o) {
  const m = o.metric || {};
  return [o.epoch, r1(m.tempAvg), r1(m.tempLow), r1(m.tempHigh), r1(m.dewptAvg), r1(o.humidityAvg), r1(m.windspeedAvg), r1(m.windgustHigh),
    o.winddirAvg == null ? null : Math.round(o.winddirAvg), r1(m.pressureMin), r1(m.pressureMax), r1(m.precipRate), r1(m.precipTotal), r1(o.solarRadiationHigh), r1(o.uvHigh)];
}

// résumé d'une journée à partir de ses mesures
function summarize(d, rows) {
  const c = Object.fromEntries(COLS.map((k, i) => [k, i]));
  const col = k => rows.map(r => [r[c[k]], r[c.e]]).filter(x => x[0] != null);
  const ext = (k, big) => col(k).reduce((a, x) => a == null || (big ? x[0] > a[0] : x[0] < a[0]) ? x : a, null);
  const mean = k => { const v = col(k); return v.length ? v.reduce((a, x) => a + x[0], 0) / v.length : null; };
  const lo = ext('tl', false), hi = ext('th', true), g = ext('wg', true);
  // direction moyenne pondérée par la vitesse
  let sx = 0, sy = 0;
  for (const r of rows) { const dir = r[c.wd], s = r[c.ws]; if (dir == null || !s) continue; sx += s * Math.sin(dir * Math.PI / 180); sy += s * Math.cos(dir * Math.PI / 180); }
  const wdir = sx || sy ? Math.round((Math.atan2(sx, sy) * 180 / Math.PI + 360) % 360) : null;
  return {
    d, n: rows.length,
    lo: lo && lo[0], tlo: lo && hmTZ(lo[1]), hi: hi && hi[0], thi: hi && hmTZ(hi[1]),
    avg: r1(mean('t')), dew: r1(mean('dp')), hum: r1(mean('h')),
    rain: r1(Math.max(0, ...col('pt').map(x => x[0]))), rr: r1(Math.max(0, ...col('pr').map(x => x[0]))),
    gust: g && g[0], tg: g && hmTZ(g[1]), wavg: r1(mean('ws')), wdir,
    pmin: ext('pmin', false)?.[0] ?? null, pmax: ext('pmax', true)?.[0] ?? null,
    sol: ext('sr', true)?.[0] ?? null, uv: ext('uv', true)?.[0] ?? null,
  };
}

async function fetchDay(d) {
  const u = `${BASE}/v2/pws/history/all?stationId=${encodeURIComponent(STATION)}&format=json&units=m&numericPrecision=decimal&date=${d.replace(/-/g, '')}&apiKey=${KEY}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    let r;
    try { r = await fetch(u, { signal: AbortSignal.timeout(30000) }); } catch (e) { if (attempt) throw e; await sleep(10000); continue; }
    if (r.status === 204) return null;
    if (r.status === 429 && !attempt) { await sleep(65000); continue; }
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    return (j && j.observations) || [];
  }
  throw new Error('échec');
}

async function main() {
  const idxFile = path.join(ROOT, 'index.json');
  const idx = await readJSON(idxFile, { station: STATION, empty: {} });
  idx.empty = idx.empty || {};
  const today = ymdTZ(new Date()), yesterday = shift(today, -1), dayBefore = shift(today, -2);

  // journées à lire, des plus récentes aux plus anciennes
  const todo = [];
  for (let i = 1; i <= BACKFILL; i++) {
    const d = shift(today, -i), f = dayFile(d);
    if (existsSync(f)) {
      if (d !== yesterday && d !== dayBefore) continue;
      const old = await readJSON(f, null);
      if (old && Date.parse(old.fetched) >= Date.parse(shift(d, 1) + 'T01:00:00Z')) continue; // lue après la fin de journée : complète
      todo.push(d); continue;
    }
    const e = idx.empty[d];
    if (e && Date.parse(e) >= Date.parse(shift(d, 1) + 'T01:00:00Z') && d < dayBefore) continue; // aucune donnée ce jour-là
    todo.push(d);
  }
  console.log(`${todo.length} journée(s) à lire pour ${STATION}`);

  let calls = 0, fails = 0, got = 0;
  for (const d of todo) {
    if (calls >= MAX_CALLS) { console.log('Plafond d\'appels atteint, la suite au prochain passage.'); break; }
    if (calls) await sleep(DELAY);
    calls++;
    try {
      const obs = await fetchDay(d);
      if (!obs || !obs.length) { idx.empty[d] = new Date().toISOString(); console.log(d, 'aucune donnée'); fails = 0; continue; }
      obs.sort((a, b) => a.epoch - b.epoch);
      await writeJSON(dayFile(d), { station: STATION, d, fetched: new Date().toISOString(), cols: COLS, rows: obs.map(compact) });
      delete idx.empty[d]; got++; fails = 0;
      console.log(d, obs.length, 'mesures');
    } catch (e) {
      console.log(d, 'erreur', e.message);
      if (++fails >= 5) { console.log('Trop d\'erreurs de suite, arrêt.'); break; }
    }
  }

  // résumés annuels reconstruits à partir des fichiers jour
  const daysDir = path.join(ROOT, 'days');
  const years = existsSync(daysDir) ? (await readdir(daysDir)).filter(y => /^\d{4}$/.test(y)).sort() : [];
  let first = null, last = null, count = 0;
  for (const y of years) {
    const files = (await readdir(path.join(daysDir, y))).filter(f => f.endsWith('.json')).sort();
    const days = [];
    for (const f of files) { const j = await readJSON(path.join(daysDir, y, f), null); if (j && j.rows && j.rows.length) days.push(summarize(j.d, j.rows)); }
    if (!days.length) continue;
    await writeJSON(path.join(ROOT, y + '.json'), { station: STATION, year: +y, days });
    first = first || days[0].d; last = days[days.length - 1].d; count += days.length;
  }
  // on ne garde la trace des jours vides que sur la période de rattrapage
  const oldest = shift(today, -BACKFILL - 5);
  for (const d of Object.keys(idx.empty)) if (d < oldest) delete idx.empty[d];
  Object.assign(idx, { station: STATION, first, last, count, years: years.map(Number).filter(y => existsSync(path.join(ROOT, y + '.json'))), updated: new Date().toISOString() });
  await writeJSON(idxFile, idx);
  console.log(`Terminé : ${got} journée(s) ajoutée(s), ${calls} appel(s). Archive : ${count} jours, du ${first} au ${last}.`);
}

main().catch(e => { console.error(e); process.exit(1); });
