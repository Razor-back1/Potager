/* Outils communs aux tests : serveur local de l'app, navigateur iPhone, relais simulé. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { chromium, devices } from 'playwright';

export const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };

/* sert le dossier du dépôt (l'app construite) sur un port libre */
export function serveur() {
  return new Promise(ok => {
    const s = http.createServer((req, res) => {
      const p = path.join(RACINE, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!p.startsWith(RACINE) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end() }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(res);
    });
    s.listen(0, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${s.address().port}/index.html`, fermer: () => s.close() }));
  });
}

/* base D1 simulée (même interface que Cloudflare) */
export function d1() {
  const db = new DatabaseSync(':memory:');
  const prep = sql => { let a = []; const o = {
    bind: (...x) => { a = x; return o },
    first: async () => db.prepare(sql).get(...a) || null,
    all: async () => ({ results: db.prepare(sql).all(...a) }),
    run: async () => { const r = db.prepare(sql).run(...a); return { meta: { changes: r.changes } } } }; return o };
  return { prepare: prep, batch: async l => Promise.all(l.map(x => x.run())) };
}

/* le vrai code du relais (gardena-worker.js construit), avec sa base simulée */
export async function relais() {
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'relais-')), 'relais.mjs');
  fs.copyFileSync(path.join(RACINE, 'gardena-worker.js'), tmp);
  const W = (await import(tmp)).default;
  const env = { DB: d1(), APP_TOKEN: 'cle-proprietaire' };
  const appel = (chemin, { cle = env.APP_TOKEN, method = 'GET', body } = {}) =>
    W.fetch(new Request('https://relais.test' + chemin, { method, headers: { 'X-Potager-Key': cle || '', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }), env);
  return { W, env, appel };
}

/* un iPhone (ou iPad) simulé : réseau extérieur coupé, relais branché sur le relais simulé */
export async function appareil(nav, adresse, { style = 'classic', modele = 'iPhone 13', relais: R = null, cle = null } = {}) {
  const ctx = await nav.newContext({ ...devices[modele], serviceWorkers: 'block', acceptDownloads: true });
  await ctx.route('**/*', r => { const u = r.request().url(); return u.startsWith('http://127.0.0.1') ? r.continue() : r.abort() });
  if (R) await ctx.route('https://relais.test/**', async r => {
    const q = r.request();
    const rep = await R.W.fetch(new Request(q.url(), { method: q.method(), headers: q.headers(), body: q.postData() ?? undefined }), R.env);
    await r.fulfill({ status: rep.status, headers: Object.fromEntries(rep.headers), body: Buffer.from(await rep.arrayBuffer()) });
  });
  await ctx.addInitScript(([st, rel]) => {
    if (sessionStorage.getItem('init')) return; sessionStorage.setItem('init', '1');
    localStorage.setItem('potager-ui', st);
    if (rel) localStorage.setItem('potager-gardena', JSON.stringify(rel));
  }, [style, R ? { url: 'https://relais.test', token: cle || R.env.APP_TOKEN } : null]);
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message));
  await page.goto(adresse);
  await page.waitForFunction(() => typeof S === 'object' && document.querySelector('.tabs'));
  return { ctx, page, erreurs };
}

export const lancer = () => chromium.launch();
