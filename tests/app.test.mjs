/* L'app dans un iPhone simulé : les parcours qui ont déjà cassé ou qui comptent le plus. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { serveur, lancer, appareil, relais } from './outils.mjs';

let srv, nav;
before(async () => { srv = await serveur(); nav = await lancer() });
after(async () => { await nav?.close(); srv?.fermer() });

const ouvrir = (opts) => appareil(nav, srv.url, opts);
const ONGLETS = ['today', 'plan', 'harvest', 'weather', 'crops'];

for (const style of ['classic', 'ios', 'glass', 'widgets']) {
  test(`style ${style} : chaque onglet et le menu s'affichent sans erreur`, async () => {
    const { ctx, page, erreurs } = await ouvrir({ style });
    assert.equal(await page.evaluate(() => document.documentElement.dataset.ui), style);
    for (const t of ONGLETS) {
      await page.click(`.tabs [data-tab="${t}"]`);
      const vue = await page.evaluate(t => { const v = document.querySelector('#v-' + t); return v && !v.hidden ? v.innerHTML.length : -1 }, t);
      assert.ok(vue > 50, `onglet ${t} vide`);
    }
    await page.click('#menuBtn');
    assert.ok(await page.isVisible('#sheet'));
    assert.deepEqual(erreurs, []);
    await ctx.close();
  });
}

test('changer de style dans le menu, puis revenir au Classique', async () => {
  const { ctx, page, erreurs } = await ouvrir({ style: 'glass' });
  await page.click('#menuBtn');
  await page.click('[data-act="ui"][data-k="widgets"]');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.ui), 'widgets');
  await page.click('[data-act="ui"][data-k="classic"]');
  await page.reload(); await page.waitForFunction(() => typeof S === 'object');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.ui), 'classic');
  assert.deepEqual(erreurs, []);
  await ctx.close();
});

test('placer une série de planches, annuler puis rétablir', async () => {
  const { ctx, page, erreurs } = await ouvrir();
  await page.click('.tabs [data-tab="plan"]');
  if (await page.isVisible('#sheet [data-act="close"]')) await page.click('#sheet [data-act="close"]');   /* aide du premier lancement */
  const avant = await page.evaluate(() => S.objs.length);
  await page.click('#editBtn');
  await page.click('#addBtn');
  await page.click('[data-act="series"]');
  await page.fill('#sr-n', '4');
  await page.click('[data-act="series-go"]');
  const apres = await page.evaluate(() => S.objs.filter(o => o.type === 'planche').length);
  const total = await page.evaluate(() => S.objs.length);
  assert.ok(total >= avant + 4, `la série n'a pas ajouté 4 planches (${avant} → ${total})`);
  await page.click('#undoBtnH');
  assert.equal(await page.evaluate(() => S.objs.length), avant);
  await page.click('#redoBtnH');
  assert.equal(await page.evaluate(() => S.objs.filter(o => o.type === 'planche').length), apres);
  await page.click('#doneBtn');
  assert.deepEqual(erreurs, []);
  await ctx.close();
});

test("l'historique d'annulation survit au rechargement", async () => {
  const { ctx, page, erreurs } = await ouvrir();
  const nom = await page.evaluate(() => S.name);
  await page.click('#menuBtn');
  await page.fill('#g-name', 'Potager renommé');
  await page.press('#g-name', 'Tab');
  assert.equal(await page.evaluate(() => S.name), 'Potager renommé');
  await page.waitForTimeout(300);
  await page.reload(); await page.waitForFunction(() => typeof S === 'object');
  assert.ok(await page.isEnabled('#undoBtnH'), 'flèche Annuler grisée après rechargement');
  await page.click('#undoBtnH');
  assert.equal(await page.evaluate(() => S.name), nom);
  assert.deepEqual(erreurs, []);
  await ctx.close();
});

test('plusieurs jardins : créer, changer, supprimer', async () => {
  const { ctx, page, erreurs } = await ouvrir();
  const premier = await page.evaluate(() => GID);
  await page.click('#menuBtn');
  await page.click('[data-act="gnew"]');
  assert.equal(await page.evaluate(() => GL.get().list.length), 2);
  assert.notEqual(await page.evaluate(() => GID), premier);
  const b = page.locator('[data-act="gdel"]');
  await b.click(); await b.click();
  assert.equal(await page.evaluate(() => GL.get().list.length), 1);
  assert.equal(await page.evaluate(() => GID), premier);
  assert.deepEqual(erreurs, []);
  await ctx.close();
});

test('jardin de fleurs : base de fleurs et carnet de coupes', async () => {
  const { ctx, page, erreurs } = await ouvrir();
  await page.click('#menuBtn');
  await page.click('[data-act="gnewexfl"]');
  assert.equal(await page.evaluate(() => FLW()), true);
  assert.ok(await page.evaluate(() => PLANTS.every(p => p.id.startsWith('f_'))));
  for (const t of ONGLETS) await page.click(`.tabs [data-tab="${t}"]`);
  await page.click('.tabs [data-tab="harvest"]');
  assert.match(await page.textContent('#v-harvest'), /arnet/);
  assert.deepEqual(erreurs, []);
  await ctx.close();
});

test('semis échelonnés et fichier calendrier (.ics) valide', async () => {
  const { ctx, page, erreurs } = await ouvrir();
  const r = await page.evaluate(() => {
    const ev = notifPlan().ev, ics = icsOf(ev, S.name);
    return { succ: succession().map(x => x.p.id), resow: ev.filter(e => e.k === 'resow').length, ics };
  });
  assert.ok(r.succ.length > 0, "l'exemple devrait avoir des semis échelonnés");
  assert.equal(r.resow, r.succ.length);
  const lignes = r.ics.split('\r\n');
  assert.equal(lignes[0], 'BEGIN:VCALENDAR');
  assert.equal(lignes.at(-2), 'END:VCALENDAR');
  assert.equal(lignes.filter(l => l === 'BEGIN:VEVENT').length, lignes.filter(l => l === 'END:VEVENT').length);
  for (const l of lignes) assert.ok(Buffer.byteLength(l) <= 75, 'ligne ICS trop longue : ' + l);
  await page.click('.tabs [data-tab="today"]');
  assert.match(await page.textContent('#v-today'), /Semis échelonnés/);
  assert.deepEqual(erreurs, []);
  await ctx.close();
});

test("invitation : le code se relit à l'identique", async () => {
  const { ctx, page } = await ouvrir();
  const r = await page.evaluate(() => readInvite('Voici ton lien ' + mkInvite('u1', 'jeton', 'Marie', 'fleurs') + ' à bientôt'));
  assert.equal(r.u, 'u1'); assert.equal(r.t, 'jeton'); assert.equal(r.n, 'Marie'); assert.equal(r.k, 'fleurs');
  assert.equal(await page.evaluate(() => readInvite('n\'importe quoi')), null);
  await ctx.close();
});

test('synchro iPhone → iPad et calendrier abonné, via le vrai code du relais', async () => {
  const R = await relais();
  const tel = await ouvrir({ relais: R });
  await tel.page.evaluate(async () => {
    addGarden({ ...sample(), example: false, name: 'Potager de Leuze' });
    await syncPush(GID);
  });
  const id = await tel.page.evaluate(() => GID);
  const pad = await ouvrir({ relais: R, modele: 'iPad Mini' });
  await pad.page.evaluate(() => syncPull(true));
  await pad.page.waitForFunction(id => GL.get().list.some(g => g.id === id), id);
  assert.ok(await pad.page.evaluate(id => GL.get().list.find(g => g.id === id).name, id), 'Potager de Leuze');

  /* une modification sur l'iPad revient sur l'iPhone */
  await pad.page.evaluate(async id => { switchGarden(id); S.name = 'Leuze (iPad)'; save(); await syncPush(id) }, id);
  await tel.page.evaluate(() => syncPull(true));
  await tel.page.waitForFunction(() => S.name === 'Leuze (iPad)');

  /* le calendrier publié par le relais contient les dates du potager */
  const cal = await tel.page.evaluate(() => gReq('/cal'));
  assert.match(cal.url, /^https:\/\/relais\.test\/cal\/[a-z0-9]+\.ics$/);
  const ics = await (await R.W.fetch(new Request(cal.url), R.env)).text();
  assert.match(ics, /BEGIN:VEVENT/);
  assert.match(ics, /Ressemer/);
  assert.deepEqual([...tel.erreurs, ...pad.erreurs], []);
  await tel.ctx.close(); await pad.ctx.close();
});

test('modifier une culture puis revenir aux valeurs d\'origine', async () => {
  const { ctx, page, erreurs } = await ouvrir();
  await page.click('.tabs [data-tab="crops"]');
  await page.click('[data-cact="edit"][data-crop="tomate"]');
  await page.fill('#ce-j', '60');
  await page.click('[data-c="save"]');
  assert.equal(await page.evaluate(() => P.tomate.j), 60);
  assert.deepEqual(await page.evaluate(() => S.cropEdits.tomate), { j: 60 });
  /* les dates de récolte suivent */
  const r = await page.evaluate(() => plantings().filter(x => x.p.id === 'tomate').map(x => days(parse(x.d), x.hv)));
  assert.ok(r.length && r.every(d => d === 60), 'récolte pas recalculée : ' + r);
  assert.match(await page.textContent('#v-crops'), /modifiée/);
  /* annuler, puis valeurs d'origine */
  await page.click('#undoBtnH');
  assert.equal(await page.evaluate(() => P.tomate.j), 80);
  await page.click('#redoBtnH');
  assert.equal(await page.evaluate(() => P.tomate.j), 60);
  await page.click('[data-cact="edit"][data-crop="tomate"]');
  await page.click('[data-c="reset"]');
  assert.equal(await page.evaluate(() => P.tomate.j), 80);
  assert.equal(await page.evaluate(() => S.cropEdits.tomate), undefined);
  assert.deepEqual(erreurs, []);
  await ctx.close();
});

test('variété : hérite de sa culture, se plante, se supprime proprement', async () => {
  const { ctx, page, erreurs } = await ouvrir();
  await page.click('.tabs [data-tab="crops"]');
  await page.click('[data-cact="variety"][data-crop="tomate"]');
  await page.fill('#ce-n', 'Tomate cerise');
  await page.fill('#ce-j', '55');
  await page.click('[data-c="save"]');
  const v = await page.evaluate(() => S.varieties[0]);
  assert.equal(v.base, 'tomate'); assert.equal(v.j, 55);
  const r = await page.evaluate(id => {
    const i = PLANTS.indexOf(P[id]);
    return { apres: PLANTS[i - 1].id, ico: ci(id), voisin: compat(id, 'basilic') === compat('tomate', 'basilic'), gel: FROST_SENSITIVE.has(id), fam: P[id].f };
  }, v.id);
  assert.equal(r.apres, 'tomate'); assert.match(r.ico, /#ci-tomate/); assert.ok(r.voisin); assert.ok(r.gel); assert.equal(r.fam, 'Solanacées');
  /* plantée dans une zone, elle a son propre délai */
  await page.evaluate(id => { const o = plantables().find(o => o.zones.some(z => z.crop === 'tomate')); o.zones.find(z => z.crop === 'tomate').crop = id; save() }, v.id);
  assert.ok(await page.evaluate(id => plantings().some(x => x.p.id === id && days(parse(x.d), x.hv) === 55), v.id));
  /* un jardin de fleurs ne la montre pas */
  assert.ok(await page.evaluate(id => { S.kind = 'fleurs'; setCatalog(); const ok = !PLANTS.some(p => p.id === id); S.kind = 'potager'; setCatalog(); return ok }, v.id));
  /* suppression : la zone repasse en tomate */
  await page.click('.tabs [data-tab="crops"]');
  const del = page.locator(`[data-cact="edit"][data-crop="${v.id}"]`);
  await del.click();
  await page.click('[data-c="delvar"]'); await page.click('[data-c="delvar"]');
  assert.equal(await page.evaluate(() => S.varieties.length), 0);
  assert.ok(await page.evaluate(() => plantables().some(o => o.zones.some(z => z.crop === 'tomate'))));
  assert.deepEqual(erreurs, []);
  await ctx.close();
});

test('objectif de récolte : 3 salades par semaine → quand et combien semer', async () => {
  const { ctx, page, erreurs } = await ouvrir();
  await page.click('.tabs [data-tab="crops"]');
  await page.click('[data-cact="goal"][data-crop="laitue"]');
  await page.fill('#cg-w', '3');
  /* 3 salades × 14 j / 7 = 6, + 25 % de marge = 8 plants tous les 14 jours */
  assert.match(await page.textContent('#cg-plan'), /Tous les 14 jours : 8 plants/);
  await page.click('[data-c="goalsave"]');
  assert.equal(await page.evaluate(() => S.goals.laitue.w), 3);
  const r = await page.evaluate(() => {
    const pg = planGoal('laitue', S.goals.laitue), ev = notifPlan().ev.filter(e => e.k === 'resow' && /laitue/.test(e.txt));
    return { n: pg.list.length, ecarts: pg.list.slice(1).map((s, i) => days(pg.list[i].d, s.d)), mois: pg.list.map(s => s.d.getMonth() + 1), saison: [...P.laitue.m, ...(P.laitue.sg || [])], ev: ev.map(e => e.txt) };
  });
  assert.ok(r.n > 0);
  assert.ok(r.ecarts.every(d => d % 14 === 0), 'semis pas espacés de 14 j');
  assert.ok(r.mois.every(m => r.saison.includes(m)), 'semis hors saison');
  assert.ok(r.ev.every(t => /8 plants/.test(t)));
  /* rendement modifié : 2 salades par plant (laitue à couper) → 4 plants */
  await page.evaluate(() => { S.cropEdits = { laitue: { yld: 2 } }; setCatalog() });
  assert.equal(await page.evaluate(() => planGoal('laitue', S.goals.laitue).qty), 4);
  assert.deepEqual(erreurs, []);
  await ctx.close();
});
