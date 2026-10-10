/* Le relais Cloudflare (gardena-worker.js) avec une base D1 simulée. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { relais } from './outils.mjs';

const json = r => r.json();

test("sans code d'accès, le relais refuse", async () => {
  const { appel } = await relais();
  assert.equal((await appel('/gardens', { cle: '' })).status, 401);
  assert.equal((await appel('/gardens', { cle: 'faux' })).status, 401);
});

test('enregistre et relit un potager, refuse une version plus ancienne', async () => {
  const { appel } = await relais();
  const at = Date.now();
  assert.equal((await appel('/garden?id=g1', { method: 'PUT', body: { state: { name: 'Leuze' }, at } })).status, 200);
  const g = await json(await appel('/garden?id=g1'));
  assert.equal(g.state.name, 'Leuze'); assert.equal(g.at, at);
  const vieux = await appel('/garden?id=g1', { method: 'PUT', body: { state: { name: 'Ancien' }, at: at - 1000 } });
  assert.equal(vieux.status, 409);
  const l = await json(await appel('/gardens'));
  assert.deepEqual(l.list.map(x => x.name), ['Leuze']);
  assert.equal(l.me.role, 'admin');
  await appel('/garden?id=g1', { method: 'DELETE' });
  assert.equal((await appel('/garden?id=g1')).status, 404);
});

test('un ami invité ne voit que ses potagers et pas les réglages du propriétaire', async () => {
  const { appel } = await relais();
  await appel('/garden?id=moi', { method: 'PUT', body: { state: { name: 'À moi' }, at: Date.now() } });
  const ami = await json(await appel('/admin/invite', { method: 'POST', body: { name: 'Marie' } }));
  assert.ok(ami.token);
  await appel('/garden?id=elle', { cle: ami.token, method: 'PUT', body: { state: { name: 'Chez Marie' }, at: Date.now() } });
  const sa = await json(await appel('/gardens', { cle: ami.token }));
  assert.deepEqual(sa.list.map(x => x.name), ['Chez Marie']);
  assert.equal(sa.me.role, 'user');
  assert.equal((await appel('/garden?id=moi', { cle: ami.token })).status, 404);
  for (const r of ['/admin/users', '/status', '/config']) assert.equal((await appel(r, { cle: ami.token })).status, 403, r);
  const us = await json(await appel('/admin/users'));
  assert.equal(us.users.find(u => u.name === 'Marie').n, 1);
  await appel('/admin/remove', { method: 'POST', body: { id: ami.id } });
  assert.equal((await appel('/gardens', { cle: ami.token })).status, 401);
});

test('photo : enregistrée puis servie par son lien public', async () => {
  const { appel, W, env } = await relais();
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const r = await json(await appel('/photo', { method: 'POST', body: { data: png } }));
  const img = await W.fetch(new Request(r.url), env);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/png');
  assert.equal((await appel('/photo', { method: 'POST', body: { data: 'pas une image' } })).status, 400);
});

test('calendrier : lien secret, événements à jour, lien révocable', async () => {
  const { appel, W, env } = await relais();
  const auj = new Date().toISOString().slice(0, 10);
  await appel('/garden?id=g1', { method: 'PUT', body: { state: { name: 'Leuze' }, at: Date.now(), plan: { ev: [
    { id: 'a', k: 'resow', d: auj, txt: 'Ressemer : radis (tous les 14 j)' },
    { id: 'b', k: 'harvest', d: '2099-01-01', txt: 'Trop loin dans le futur' },
    { id: 'c', k: 'harvest', d: auj, txt: 'Carotte prête ; texte long, avec des virgules et des accents éàü pour vérifier le pliage des lignes' }] } } });
  const c = await json(await appel('/cal'));
  const lire = u => W.fetch(new Request(u), env);
  const rep = await lire(c.url);
  assert.equal(rep.status, 200);
  assert.match(rep.headers.get('content-type'), /text\/calendar/);
  const ics = await rep.text(), lignes = ics.split('\r\n');
  assert.equal(lignes.filter(l => l === 'BEGIN:VEVENT').length, 2);
  assert.match(ics, /SUMMARY:Ressemer : radis/);
  assert.match(ics, /Carotte prête \\; texte long\\, avec/);
  for (const l of lignes) assert.ok(new TextEncoder().encode(l).length <= 75, l);
  assert.equal((await appel('/cal')).status, 200);
  assert.equal((await json(await appel('/cal'))).token, c.token, 'le lien doit rester le même');
  const n = await json(await appel('/cal?new=1'));
  assert.notEqual(n.token, c.token);
  assert.equal((await lire(c.url)).status, 404);
  assert.equal((await lire(n.url)).status, 200);
});
