/* L'app dans un iPhone simulé : les parcours qui ont déjà cassé ou qui comptent le plus. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { serveur, lancer, appareil, relais, onglet } from './outils.mjs';

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
      await onglet(page, t);
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
  await onglet(page, 'plan');
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
  assert.equal(await page.evaluate(() => GL.get().list.length), 3);   /* propriété + 2 potagers */
  assert.notEqual(await page.evaluate(() => GID), premier);
  assert.deepEqual(await page.evaluate(() => [TOP, tab, parcels().some(o => o.gid === GID)]), ['potager', 'today', true], 'nouveau potager ouvert sur Aujourd\'hui et posé sur la propriété');
  await page.click('#menuBtn');
  assert.equal(await page.locator('.glist .grow').count(), 2, 'la propriété n\'est pas dans la liste des jardins');
  assert.doesNotMatch(await page.textContent('.glist'), /Ma propriété/);
  const b = page.locator('[data-act="gdel"]');
  await b.click(); await b.click();
  assert.equal(await page.evaluate(() => GL.get().list.length), 2);
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
  for (const t of ONGLETS) await onglet(page, t);
  await onglet(page, 'harvest');
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
  await onglet(page, 'today');
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
  await onglet(page, 'crops');
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
  await onglet(page, 'crops');
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
  await onglet(page, 'crops');
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
  await onglet(page, 'crops');
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

const verger = async (opts) => {
  const r = await ouvrir(opts);
  await r.page.click('#menuBtn');
  await r.page.click('[data-act="gnewexvg"]');
  return r;
};

for (const style of ['classic', 'glass']) {
  test(`verger (${style}) : chaque onglet s'affiche sans erreur`, async () => {
    const { ctx, page, erreurs } = await verger({ style });
    assert.equal(await page.evaluate(() => VRG()), true);
    assert.ok(await page.evaluate(() => PLANTS.length > 15 && PLANTS.every(p => p.hv)));
    for (const t of ONGLETS) {
      await onglet(page, t);
      assert.ok(await page.evaluate(t => document.querySelector('#v-' + t).innerHTML.length, t) > 50, t);
    }
    assert.equal(await page.textContent('.subtabs [data-tab="crops"]'), 'Fruitiers');
    assert.match(await page.textContent('#v-crops'), /Dans ton verger/);
    assert.deepEqual(erreurs, []);
    await ctx.close();
  });
}

test('fruitier : récolte chaque année, pas avant la mise à fruit, pollinisation', async () => {
  const { ctx, page, erreurs } = await verger({ date: '2026-10-10T10:00:00' });
  const r = await page.evaluate(() => {
    const t = trees(), by = n => t.find(x => x.o.name === n);
    const pom = by('Pommier Reinette'), cer = by('Cerisier Burlat');
    return { pom: pom.left, cerAn: cer.hv.getFullYear(), cerMois: cer.hv.getMonth() + 1, cerPlant: parse(cer.d).getFullYear(),
      poll: pollIssues().map(q => q.p.id).sort(), n: t.length };
  });
  assert.ok(r.pom <= 0, 'le pommier devrait être en récolte en octobre');
  assert.ok(r.cerAn >= r.cerPlant + 5 && [6, 7].includes(r.cerMois), `cerisier : ${r.cerMois}/${r.cerAn}`);
  assert.deepEqual(r.poll, ['fr_cerisier', 'fr_poirier'], 'seuls le poirier et le cerisier manquent de partenaire');
  await onglet(page, 'today');
  const txt = await page.textContent('#v-today');
  assert.match(txt, /Pollinisation/); assert.match(txt, /en récolte/); assert.match(txt, /Travaux du mois/);
  assert.deepEqual(erreurs, []);
  await ctx.close();
});

test('gel annoncé en pleine floraison : alerte sur les fleurs', async () => {
  const { ctx, page, erreurs } = await verger({ date: '2027-04-15T10:00:00' });
  await onglet(page, 'today');
  await page.evaluate(() => { wx = { cur: { t: 9, code: 0, isDay: true }, night: -3, now: null, fc: null, hours: [] }; renderToday() });
  const txt = await page.textContent('#v-today');
  assert.match(txt, /Gel sur les fleurs/);
  assert.match(txt, /pommier/);
  const plan = await page.evaluate(() => notifPlan().frost.map(f => f.crop));
  assert.ok(plan.some(c => /en fleur/.test(c)), 'le relais doit recevoir les arbres en fleur pour l\'alerte gel');
  assert.deepEqual(erreurs, []);
  await ctx.close();
});

test('planter un arbre fruitier sur le plan et modifier son espèce', async () => {
  const { ctx, page, erreurs } = await verger();
  await onglet(page, 'plan');
  if (await page.isVisible('#sheet [data-act="close"]')) await page.click('#sheet [data-act="close"]');
  await page.click('#editBtn'); await page.click('#addBtn');
  await page.click('[data-act="add"][data-type="fruitier"]');
  const id = await page.evaluate(() => selId);
  if (await page.isVisible('#sheet [data-act="close"]')) await page.click('#sheet [data-act="close"]');
  await page.click('#doneBtn');
  /* toucher l'arbre sur le plan ouvre sa fiche */
  const box = await page.locator(`#map [data-id="${id}"]`).boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForSelector('[data-fr="set"]');
  await page.click('[data-fr="set"][data-crop="fr_abricotier"]');
  const o = await page.evaluate(id => { const o = obj(id); return { n: o.name, c: o.zones[0].crop, h: o.height, pl: plantings().filter(x => x.o === o).length } }, id);
  assert.deepEqual(o, { n: 'Abricotier', c: 'fr_abricotier', h: 400, pl: 1 });
  await page.fill('#fr-date', '2020-03-01'); await page.dispatchEvent('#fr-date', 'change');
  assert.ok(await page.evaluate(id => trees().find(x => x.o.id === id).hv.getFullYear() >= 2020 + 4, id));
  await page.click('[data-act="openbed"]');
  assert.deepEqual(erreurs, []);
  await ctx.close();
});

test('fruitier modifiable : variété tardive et mise à fruit', async () => {
  const { ctx, page, erreurs } = await verger();
  await onglet(page, 'crops');
  await page.click('[data-cact="variety"][data-crop="fr_pommier"]');
  await page.fill('#ce-n', 'Pommier Reinette grise');
  await page.click('[data-mk="hv"] [data-m="8"]');   /* plus de récolte en août */
  await page.fill('#ce-y', '6');
  await page.click('[data-c="save"]');
  const v = await page.evaluate(() => { const v = S.varieties[0]; return { hv: P[v.id].hv, y: P[v.id].y, j: P[v.id].j, ico: ci(v.id) } });
  assert.deepEqual(v.hv, [9, 10]); assert.equal(v.y, 6); assert.equal(v.j, 2190); assert.match(v.ico, /#ci-fr_pommier/);
  assert.deepEqual(erreurs, []);
  await ctx.close();
});

test('variante : même terrain et éléments fixes, plan vide ; copie complète', async () => {
  const { ctx, page, erreurs } = await ouvrir();
  const src = await page.evaluate(() => { S.shape = [{ x: 0, y: 0 }, { x: 1800, y: 0 }, { x: 1800, y: 1200 }, { x: 200, y: 1200 }]; S.north = 23; S.objs.push({ id: 'et1', type: 'etang', x: 100, y: 100, w: 400, h: 300, rot: 0, name: 'Étang', height: 0, locked: true }); save();
    return { n: S.objs.length, fixes: S.objs.filter(o => FIXED_TYPES.has(o.type)).length, nom: S.name } });
  await page.click('#menuBtn');
  await page.click('[data-act="gvar"]');
  const v = await page.evaluate(() => ({ nom: S.name, n: S.objs.length, types: [...new Set(S.objs.map(o => o.type))].sort(), north: S.north, shape: S.shape.length, ex: S.example }));
  assert.equal(v.nom, src.nom + ' · variante 1');
  assert.equal(v.n, src.fixes); assert.ok(v.types.every(t => ['etang', 'arbre', 'haie', 'cloture'].includes(t)));
  assert.equal(v.north, 23); assert.equal(v.shape, 4); assert.equal(v.ex, false);
  await page.click('[data-act="gdup"]');
  assert.equal(await page.evaluate(() => S.objs.length), src.fixes, 'la copie d\'une variante reprend la variante');
  assert.equal(await page.evaluate(() => GL.get().list.length), 4);   /* propriété + potager + variante + copie */
  assert.deepEqual(erreurs, []);
  await ctx.close();
});

test('modifier la forme du terrain depuis le mode édition', async () => {
  const { ctx, page, erreurs } = await ouvrir();
  await onglet(page, 'plan');
  if (await page.isVisible('#sheet [data-act="close"]')) await page.click('#sheet [data-act="close"]');
  await page.click('#editBtn');
  assert.ok(await page.isVisible('#shapeBtn'), 'bouton « forme du terrain » absent en mode édition');
  await page.click('#shapeBtn');
  assert.ok(await page.isVisible('#shapebar'));
  const avant = await page.evaluate(() => JSON.stringify(S.shape));
  const v = page.locator('#editL .vtx').first(), b = await v.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + 60, b.y + 50, { steps: 8 }); await page.mouse.up();
  assert.notEqual(await page.evaluate(() => JSON.stringify(S.shape)), avant, 'le coin n\'a pas bougé');
  assert.deepEqual(erreurs, []);
  await ctx.close();
});

test('rotation au degré près : objet, angle tapé, terrain seul ou avec tout le plan', async () => {
  const { ctx, page, erreurs } = await ouvrir();
  await onglet(page, 'plan');
  if (await page.isVisible('#sheet [data-act="close"]')) await page.click('#sheet [data-act="close"]');
  await page.click('#editBtn');
  const id = await page.evaluate(() => { const o = S.objs.find(o => o.type === 'planche' && !o.grp && !o.locked); selId = o.id; sheetMode = 'obj'; renderSheet(); renderPlan(); return o.id });
  const rot = () => page.evaluate(id => obj(id).rot, id);
  const r0 = await rot();
  await page.click('[data-act="rot"][data-d="1"]'); await page.click('[data-act="rot"][data-d="1"]');
  assert.equal(await rot(), (r0 + 2) % 360);
  await page.click('[data-act="rot"][data-d="-1"]');
  assert.equal(await rot(), (r0 + 1) % 360);
  await page.fill('#o-rot', '37'); await page.dispatchEvent('#o-rot', 'change');
  assert.equal(await rot(), 37);
  if (await page.isVisible('#sheet [data-act="close"]')) await page.click('#sheet [data-act="close"]');
  await page.click('#shapeBtn');
  const avant = await page.evaluate(id => ({ shape: JSON.stringify(S.shape || rectPts()), o: { ...obj(id) }, north: S.north }), id);
  await page.click('[data-sh="r1"]');
  const t1 = await page.evaluate(id => ({ shape: JSON.stringify(S.shape), rot: obj(id).rot, north: S.north, min: Math.min(...S.shape.flatMap(p => [p.x, p.y])) }), id);
  assert.notEqual(t1.shape, avant.shape); assert.equal(t1.rot, 37, 'terrain seul : les objets ne bougent pas'); assert.equal(t1.north, avant.north); assert.ok(t1.min >= 0);
  await page.check('#sh-all');
  await page.click('[data-sh="r-15"]');
  const t2 = await page.evaluate(id => ({ rot: obj(id).rot, north: S.north, min: Math.min(...S.shape.flatMap(p => [p.x, p.y])) }), id);
  assert.equal(t2.rot, 22, 'avec tout le plan : l\'objet tourne aussi'); assert.equal(t2.north, (avant.north - 15 + 360) % 360, 'le nord suit'); assert.ok(t2.min >= 0);
  await page.click('#undoBtnH');
  assert.equal(await rot(), 37);
  assert.deepEqual(erreurs, []);
  await ctx.close();
});

test('terrain : Rectangle puis rotation sans que le plan saute, dimensions au cm, déplacement par appui long', async () => {
  const { ctx, page, erreurs } = await ouvrir();
  await onglet(page, 'plan');
  if (await page.isVisible('#sheet [data-act="close"]')) await page.click('#sheet [data-act="close"]');
  await page.click('#editBtn'); await page.click('#shapeBtn');
  await page.click('[data-sh="rect"]');
  const id = await page.evaluate(() => S.objs.find(o => o.type === 'planche').id);
  const ecran = () => page.locator(`#map [data-id="${id}"]`).boundingBox();
  const b0 = await ecran();
  for (let i = 0; i < 3; i++) await page.click('[data-sh="r-15"]');   /* 45° : le rectangle dépasse en coordonnées négatives */
  const b1 = await ecran();
  assert.ok(Math.abs(b1.x - b0.x) < 2 && Math.abs(b1.y - b0.y) < 2, `la planche a sauté à l'écran : ${JSON.stringify([b0, b1])}`);
  /* dimensions du rectangle tourné */
  assert.ok(await page.isVisible('#sh-w'), 'champs largeur / longueur absents');
  await page.fill('#sh-w', '15'); await page.dispatchEvent('#sh-w', 'change');
  await page.fill('#sh-l', '9.5'); await page.dispatchEvent('#sh-l', 'change');
  const r = await page.evaluate(() => { const r = rectInfo(S.shape); return { W: Math.round(r.W), L: Math.round(r.L), ang: Math.round(r.ang * 180 / Math.PI) } });
  assert.deepEqual({ W: r.W, L: r.L }, { W: 1500, L: 950 }); assert.equal(Math.abs(r.ang) % 90, 45);
  /* appui long dans le terrain puis glisser : le terrain se déplace, pas les objets */
  const avant = await page.evaluate(id => ({ s: JSON.stringify(S.shape), o: obj(id).x - Math.min(...S.shape.map(p => p.x)) }), id);
  const box = await page.locator('#map').boundingBox(), c = await page.evaluate(() => { const xs = S.shape.map(p => p.x), ys = S.shape.map(p => p.y); return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 } });
  /* un point du terrain visible à l'écran (pas sous le panneau) */
  const sc = await page.evaluate(() => { const r = svg.getBoundingClientRect(), xs = S.shape.map(p => p.x), ys = S.shape.map(p => p.y);
    for (let fy = .9; fy > .1; fy -= .05) for (let fx = .2; fx < .8; fx += .1) { const w = { x: Math.min(...xs) + fx * (Math.max(...xs) - Math.min(...xs)), y: Math.min(...ys) + fy * (Math.max(...ys) - Math.min(...ys)) };
      if (!inPoly(w, S.shape)) continue; const x = r.left + r.width / 2 + (w.x - view.cx) * view.z, y = r.top + r.height / 2 + (w.y - view.cy) * view.z, el = document.elementFromPoint(x, y);
      if (el && el.closest('#map') && !el.closest('[data-vtx],[data-edge],[data-mid]')) return { x, y } } return null });
  assert.ok(sc, 'aucun point du terrain accessible');
  await page.mouse.move(sc.x, sc.y); await page.mouse.down(); await page.waitForTimeout(500);
  await page.mouse.move(sc.x + 40, sc.y + 25, { steps: 6 }); await page.mouse.up();
  const apres = await page.evaluate(id => ({ s: JSON.stringify(S.shape), o: obj(id).x - Math.min(...S.shape.map(p => p.x)) }), id);
  /* les coordonnées sont recalées sur le terrain : c'est la position des objets par rapport au terrain qui change */
  assert.notEqual(apres.o, avant.o, 'le terrain doit bouger par rapport aux objets');
  assert.ok(box);
  assert.deepEqual(erreurs, []);
  await ctx.close();
});

test('le rond de rotation tourne au degré près', async () => {
  const { ctx, page, erreurs } = await ouvrir();
  await onglet(page, 'plan');
  if (await page.isVisible('#sheet [data-act="close"]')) await page.click('#sheet [data-act="close"]');
  await page.click('#editBtn');
  const id = await page.evaluate(() => { const o = S.objs.find(o => o.type === 'compost' || (o.type === 'planche' && !o.grp)); selId = o.id; renderPlan(); return o.id });
  for (const cible of [37, 122]) {
    const k = await page.locator('#editL g[data-rot] circle').boundingBox(), c = await page.evaluate(id => { const o = obj(id), r = svg.getBoundingClientRect(); return { x: r.left + r.width / 2 + (o.x + o.w / 2 - view.cx) * view.z, y: r.top + r.height / 2 + (o.y + o.h / 2 - view.cy) * view.z } }, id);
    const R = Math.hypot(k.x + k.width / 2 - c.x, k.y + k.height / 2 - c.y), a = (cible - 90) * Math.PI / 180;
    await page.mouse.move(k.x + k.width / 2, k.y + k.height / 2); await page.mouse.down();
    await page.mouse.move(c.x + R * Math.cos(a), c.y + R * Math.sin(a), { steps: 12 }); await page.mouse.up();
    const r = await page.evaluate(id => obj(id).rot, id);
    assert.ok(Math.abs(r - cible) <= 1, `voulu ${cible}°, obtenu ${r}°`);
  }
  assert.deepEqual(erreurs, []);
  await ctx.close();
});

test('terrain incliné : grille, aimantation et nouveaux objets suivent le terrain', async () => {
  const { ctx, page, erreurs } = await ouvrir();
  await onglet(page, 'plan');
  if (await page.isVisible('#sheet [data-act="close"]')) await page.click('#sheet [data-act="close"]');
  await page.click('#editBtn'); await page.click('#shapeBtn');
  await page.click('[data-sh="rect"]');
  for (let i = 0; i < 23; i++) await page.click('[data-sh="r1"]');
  await page.click('[data-sh="done"]');
  const f = await page.evaluate(() => terrainFrame());
  assert.equal(f.a, 23);
  assert.match(await page.evaluate(() => document.getElementById('g1').getAttribute('patternTransform') || ''), /rotate\(23\)/);
  /* nouvel objet : déjà à 23° */
  await page.click('#addBtn'); await page.click('[data-act="add"][data-type="compost"]');
  const id = await page.evaluate(() => selId);
  assert.equal(await page.evaluate(id => obj(id).rot, id), 23);
  if (await page.isVisible('#sheet [data-act="close"]')) await page.click('#sheet [data-act="close"]');
  /* déplacé à la main : son centre tombe sur la grille du terrain (pas de 5 cm dans le repère incliné) */
  /* seul sur le terrain : rien d'autre pour le caler, on vérifie la grille */
  await page.evaluate(id => { S.objs = S.objs.filter(o => o.id === id); const o = obj(id); view.z = 1.5; view.cx = o.x + o.w / 2; view.cy = o.y + o.h / 2 + 150; renderPlan() }, id);   /* zoomé : le calage n'agit qu'à quelques cm */
  const avantXY = await page.evaluate(id => [obj(id).x, obj(id).y], id);
  const b = await page.locator(`#map [data-id="${id}"]`).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(450);
  await page.mouse.move(b.x + b.width / 2 + 47, b.y + b.height / 2 + 31, { steps: 8 }); await page.mouse.up();
  assert.notDeepEqual(await page.evaluate(id => [obj(id).x, obj(id).y], id), avantXY, 'l\'objet n\'a pas été déplacé');
  const loc = await page.evaluate(id => { const o = obj(id), f = terrainFrame(), r = f.a * Math.PI / 180, cx = o.x + o.w / 2 - f.o.x, cy = o.y + o.h / 2 - f.o.y; return [cx * Math.cos(r) + cy * Math.sin(r), -cx * Math.sin(r) + cy * Math.cos(r)] }, id);
  for (const v of loc) assert.ok(Math.abs(v / 5 - Math.round(v / 5)) < 0.02, 'centre hors grille : ' + loc);
  /* « Droit » remet l'objet parallèle au terrain */
  await page.evaluate(id => { obj(id).rot = 50; selId = id; sheetMode = 'obj'; renderSheet() }, id);
  await page.click('[data-act="rot0"]');
  assert.equal(await page.evaluate(id => obj(id).rot, id), 23);
  assert.deepEqual(erreurs, []);
  await ctx.close();
});

test('terrain incliné : la serre se cale au centre du terrain et sur les autres objets', async () => {
  const { ctx, page, erreurs } = await ouvrir();
  await onglet(page, 'plan');
  if (await page.isVisible('#sheet [data-act="close"]')) await page.click('#sheet [data-act="close"]');
  await page.click('#editBtn'); await page.click('#shapeBtn');
  await page.click('[data-sh="rect"]');
  for (let i = 0; i < 2; i++) await page.click('[data-sh="r15"]');
  await page.check('#sh-all'); await page.click('[data-sh="r-1"]');   /* tout le plan, pour que la serre soit parallèle au terrain */
  await page.click('[data-sh="done"]');
  /* poser la serre à 3 cm du centre (repère du terrain), puis la tirer d'un pixel : elle se cale au centre */
  const r = await page.evaluate(() => {
    const o = S.objs.find(o => o.type === 'serre'), f = terrainFrame(), a = f.a * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    const L = p => ({ x: (p.x - f.o.x) * c + (p.y - f.o.y) * s, y: -(p.x - f.o.x) * s + (p.y - f.o.y) * c });
    const lp = S.shape.map(L), cx = (Math.min(...lp.map(p => p.x)) + Math.max(...lp.map(p => p.x))) / 2, cy = (Math.min(...lp.map(p => p.y)) + Math.max(...lp.map(p => p.y))) / 2;
    const W = (x, y) => ({ x: f.o.x + x * c - y * s, y: f.o.y + x * s + y * c }), w = W(cx + 3, cy - 2);
    o.rot = f.a; o.x = w.x - o.w / 2; o.y = w.y - o.h / 2; renderPlan();
    const g = guides; const before = { ...o };
    const alignSnapResult = alignSnap(o);
    const lc = L({ x: o.x + o.w / 2, y: o.y + o.h / 2 });
    return { dx: lc.x - cx, dy: lc.y - cy, guides: (alignSnapResult || []).length };
  });
  assert.ok(Math.abs(r.dx) < 0.01 && Math.abs(r.dy) < 0.01, `serre pas calée au centre : ${r.dx}, ${r.dy}`);
  assert.equal(r.guides, 2, 'deux lignes guides attendues');
  assert.deepEqual(erreurs, []);
  await ctx.close();
});

/* ---------- Propriété : le terrain entier et ses parcelles ---------- */
test('mise à jour : la propriété est créée, les vrais jardins posés dessus, les exemples à côté', async () => {
  const ctx = await nav.newContext({ serviceWorkers: 'block' });
  await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  const page = await ctx.newPage(), erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  /* un ancien appareil : un vrai potager (« main ») et un exemple de verger, sans propriété */
  await page.goto(srv.url); await page.waitForFunction(() => window.APP_PRETE === true);
  await page.evaluate(() => { const st = emptyGarden('Mon potager'); st.w = 1400; st.h = 900; st.north = 20; st.objs.push({ id: 'p1', type: 'planche', name: 'Planche 1', x: 100, y: 100, w: 90, h: 500, rot: 0, zones: [{ crop: null, len: 500, cells: {} }] });
    const ex = sampleOrchard(); localStorage.clear(); localStorage.setItem(keyOf('main'), JSON.stringify(st)); localStorage.setItem(keyOf('vx'), JSON.stringify(ex));
    localStorage.setItem('atelier-potager-list', JSON.stringify({ cur: 'main', list: [{ id: 'main', name: 'Mon potager' }, { id: 'vx', name: ex.name, ex: true }] })) });
  await page.reload(); await page.waitForFunction(() => window.APP_PRETE === true);
  const r = await page.evaluate(() => ({ top: TOP, gid: GID, ids: GL.get().list.map(x => x.id + ':' + x.k) }));
  assert.equal(r.top, 'potager', 'l\'app s\'ouvre sur Aujourd\'hui du potager'); assert.equal(r.gid, 'main');
  assert.deepEqual(r.ids, ['prop:propriete', 'main:potager', 'vx:verger']);
  assert.equal(await page.evaluate(() => tab), 'today');
  await page.click('.tabs [data-top="prop"]');
  assert.deepEqual(await page.evaluate(() => S.objs.filter(o => o.type === 'parcelle').map(o => [o.gid, o.w, o.h, o.rot])), [['main', 1400, 900, 340]], 'seul le vrai potager est posé, tourné pour que son nord suive celui de la propriété');
  assert.equal(await page.isVisible('.tabs [data-top="fleurs"]'), false, 'pas de jardin de fleurs : pas d\'onglet Fleurs');
  assert.equal(await page.isVisible('.tabs [data-top="verger"]'), false, 'l\'exemple de verger n\'est pas sur le plan : pas d\'onglet');
  const txt = await page.textContent('#v-prop');
  assert.match(txt, /Mon potager/); assert.match(txt, /Pas sur le plan/); assert.match(txt, /exemple/);
  /* toucher la parcelle ouvre le potager */
  await page.click('#v-prop .trow[data-pg="main"]');
  assert.deepEqual(await page.evaluate(() => [TOP, GID, tab]), ['potager', 'main', 'today']);
  assert.equal(await page.isVisible('.subtabs [data-tab="plan"]'), true);
  /* « Ouvrir » dans « Pas sur le plan » ouvre l'exemple de verger dans son onglet, l'onglet Plan revient à la propriété */
  await page.click('.tabs [data-top="prop"]');
  await page.click('#v-prop button[data-pg="vx"]');
  assert.deepEqual(await page.evaluate(() => [TOP, GID, VRG()]), ['verger', 'vx', true]);
  assert.equal(await page.textContent('.subtabs [data-tab="crops"]'), 'Fruitiers');
  await page.click('.tabs [data-top="prop"]');
  assert.deepEqual(await page.evaluate(() => [TOP, GID, tab]), ['prop', 'prop', 'prop']);
  /* supprimer un vieux jardin depuis « Pas sur le plan » (deux touches) */
  await page.click('#v-prop [data-pdel="vx"]'); await page.click('#v-prop [data-pdel="vx"]');
  assert.deepEqual(await page.evaluate(() => GL.get().list.map(x => x.id)), ['prop', 'main']);
  assert.doesNotMatch(await page.textContent('#v-prop'), /Pas sur le plan/);
  /* au redémarrage, la propriété existante n'est pas recréée */
  await page.reload(); await page.waitForFunction(() => window.APP_PRETE === true);
  assert.equal(await page.evaluate(() => GL.get().list.filter(x => x.k === 'propriete').length), 1);
  assert.deepEqual(erreurs, []);
  await ctx.close();
});

test('propriété : ajouter un verger, il est posé et son onglet apparaît', async () => {
  const { ctx, page, erreurs } = await ouvrir({ debut: 'prop' });
  assert.equal(await page.isVisible('.tabs [data-top="fleurs"]'), false);
  assert.equal(await page.isVisible('.tabs [data-top="verger"]'), false);
  await page.click('#v-prop [data-pnew="verger"]');
  assert.equal(await page.isVisible('.tabs [data-top="verger"]'), true, 'le verger créé fait apparaître son onglet');
  const r = await page.evaluate(() => { const o = S.objs.find(q => q.id === selId); return { tab, edit: editMode, type: o && o.type, k: o && gKind(o.gid), n: parcels().length } });
  assert.deepEqual(r, { tab: 'plan', edit: true, type: 'parcelle', k: 'verger', n: 2 });
  /* la taille d'une parcelle ne se change pas depuis la propriété : pas de poignée */
  assert.equal(await page.locator('#layer [data-handle]').count(), 0);
  if (await page.isVisible('#sheet [data-act="close"]')) await page.click('#sheet [data-act="close"]');
  await page.click('#doneBtn');
  await page.click('.tabs [data-top="verger"]');
  assert.deepEqual(await page.evaluate(() => [TOP, tab, VRG(), S.name]), ['verger', 'today', true, 'Verger']);
  /* agrandir le verger dans son propre plan : la parcelle suit sur la propriété */
  await page.evaluate(() => { S.w = 2000; save() });
  await page.click('.tabs [data-top="prop"]');
  assert.equal(await page.evaluate(() => S.objs.find(o => o.type === 'parcelle' && gKind(o.gid) === 'verger').w), 2000);
  assert.deepEqual(erreurs, []);
  await ctx.close();
});

test('propriété : maison et piscine au menu Ajouter, pas dans le potager', async () => {
  const { ctx, page, erreurs } = await ouvrir({ debut: 'prop' });
  await page.click('.subtabs [data-tab="plan"]');
  if (await page.isVisible('#sheet [data-act="close"]')) await page.click('#sheet [data-act="close"]');
  await page.click('#editBtn'); await page.click('#addBtn');
  for (const t of ['maison', 'piscine', 'terrasse']) assert.ok(await page.isVisible(`.typebtn[data-type="${t}"]`), t);
  assert.equal(await page.locator('[data-act="series"]').count(), 0);
  await page.click('.typebtn[data-type="maison"]');
  assert.equal(await page.evaluate(() => S.objs.filter(o => o.type === 'maison').length), 1);
  if (await page.isVisible('#sheet [data-act="close"]')) await page.click('#sheet [data-act="close"]');
  await page.click('#doneBtn');
  await onglet(page, 'plan');
  await page.click('#editBtn'); await page.click('#addBtn');
  assert.equal(await page.locator('.typebtn[data-type="maison"]').count(), 0);
  assert.ok(await page.isVisible('[data-act="series"]'));
  assert.deepEqual(erreurs, []);
  await ctx.close();
});

test('capture satellite : importer, deux points et la distance mettent l\'image à l\'échelle', async () => {
  const { ctx, page, erreurs } = await ouvrir({ debut: 'prop' });
  /* une « capture » de 400 × 300 px fabriquée sur place */
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 400; c.height = 300; const g = c.getContext('2d'); g.fillStyle = '#5a7'; g.fillRect(0, 0, 400, 300); return c.toDataURL('image/png').split(',')[1] });
  const choix = page.waitForEvent('filechooser');
  await page.click('#v-prop [data-pbg="add"]');
  await (await choix).setFiles({ name: 'capture.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await page.waitForFunction(() => sheetMode === 'calib');
  assert.equal(await page.evaluate(() => [tab, !!document.querySelector('#groundL image')].join()), 'plan,true');
  const w0 = await page.evaluate(() => BG.w);
  /* deux taps, à 100 px d'écart à l'écran */
  const box = await page.locator('#map').boundingBox(), y = box.y + box.height * .3;
  await page.mouse.click(box.x + 100, y); await page.mouse.click(box.x + 200, y);
  assert.equal(await page.evaluate(() => calib.pts.length), 2);
  const L = await page.evaluate(() => Math.hypot(calib.pts[1].x - calib.pts[0].x, calib.pts[1].y - calib.pts[0].y));
  await page.fill('#bg-d', '10');
  await page.click('[data-bg="apply"]');
  const w1 = await page.evaluate(() => BG.w);
  assert.ok(Math.abs(w1 - w0 * 1000 / L) < 1, `échelle fausse : ${w0} → ${w1} (L = ${L})`);
  assert.equal(await page.evaluate(() => sheetMode), null);
  /* l'image reste sur l'appareil : elle n'est pas dans l'état synchronisé */
  assert.equal(await page.evaluate(() => lastJSON.includes('data:image')), false);
  await page.reload(); await page.waitForFunction(() => window.APP_PRETE === true);
  assert.ok(await page.evaluate(w => Math.abs(bgOf().w - w) < 1, w1));
  assert.deepEqual(erreurs, []);
  await ctx.close();
});

test('ébauche collée : contour, maison, étang, arbres posés ; la même capture se cale toute seule', async () => {
  const { ctx, page, erreurs } = await ouvrir({ debut: 'prop' });
  const eb = { ebauche: 1, nord: 0, contour: [[0, 0], [80, 0], [80, 60], [0, 60]],
    objets: [['maison', 5, 5, 20, 12, -10], ['etang', 40, 10, 20, 10, 0, [[0, .5], [.5, 0], [1, .5], [.5, 1]]], ['arbre', 60, 45, 8], ['arbre', 70, 50, 6], ['inconnu', 1, 1, 1, 1]],
    fond: { l: 400, h: 300, mpx: .25, ox: 50, oy: 40 } };
  page.on('dialog', d => d.accept(JSON.stringify(eb)));
  await page.click('#v-prop [data-pbg="paste"]');
  await page.waitForFunction(() => tab === 'plan' && S.shape, null, { timeout: 5000 });
  const r = await page.evaluate(() => ({ tab, shape: S.shape.map(p => [p.x, p.y]), t: S.objs.map(o => o.type).sort(), m: S.objs.find(o => o.type === 'maison'), e: S.objs.find(o => o.type === 'etang').poly.length, a: S.objs.filter(o => o.type === 'arbre').map(o => [o.x + o.w / 2, o.y + o.h / 2, o.w]), p: S.objs.find(o => o.type === 'parcelle') }));
  assert.equal(r.tab, 'plan');
  assert.deepEqual(r.shape, [[0, 0], [8000, 0], [8000, 6000], [0, 6000]]);
  assert.deepEqual(r.t, ['arbre', 'arbre', 'etang', 'maison', 'parcelle'], 'objets inconnus ignorés, la parcelle existante gardée');
  assert.deepEqual([r.m.x, r.m.y, r.m.w, r.m.h, r.m.rot], [500, 500, 2000, 1200, 350]);
  assert.equal(r.e, 4);
  assert.deepEqual(r.a, [[6000, 4500, 800], [7000, 5000, 600]]);
  assert.ok(r.p.x >= 0 && r.p.x + r.p.w <= 8000 && r.p.y >= 0 && r.p.y + r.p.h <= 6000, 'parcelle rangée dans le terrain');
  /* une capture de même format (800 × 600 px, la même en plus grand) se cale sans étape d'échelle */
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 800; c.height = 600; c.getContext('2d').fillRect(0, 0, 800, 600); return c.toDataURL('image/png').split(',')[1] });
  await page.click('.tabs [data-top="prop"]');
  const choix = page.waitForEvent('filechooser');
  await page.click('#v-prop [data-pbg="add"]');
  await (await choix).setFiles({ name: 'capture.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await page.waitForFunction(() => bgOf() && tab === 'plan');
  assert.deepEqual(await page.evaluate(() => [BG.x, BG.y, BG.w, BG.h, sheetMode]), [-1250, -1000, 10000, 7500, null]);
  assert.deepEqual(erreurs, []);
  await ctx.close();
});

test('changer d\'onglet revient sur Aujourd\'hui, et l\'app redémarre sur Aujourd\'hui', async () => {
  const { ctx, page, erreurs } = await ouvrir();
  await onglet(page, 'crops');
  await page.click('.tabs [data-top="prop"]');
  await page.click('.tabs [data-top="potager"]');
  assert.equal(await page.evaluate(() => tab), 'today');
  await page.click('.tabs [data-top="prop"]');
  await page.reload(); await page.waitForFunction(() => window.APP_PRETE === true);
  assert.deepEqual(await page.evaluate(() => [TOP, tab]), ['potager', 'today']);
  assert.deepEqual(erreurs, []);
  await ctx.close();
});

test('vieux jardins pas liés à la propriété : les poser depuis le menu ou le bandeau', async () => {
  const ctx = await nav.newContext({ serviceWorkers: 'block' });
  await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  const page = await ctx.newPage(), erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  await page.goto(srv.url); await page.waitForFunction(() => window.APP_PRETE === true);
  /* une propriété sans parcelle (et une parcelle d'un jardin absent de cet appareil), deux vieux potagers */
  await page.evaluate(() => { const p = emptyGarden('Ma propriété', 'propriete'); p.objs.push({ id: 'x', type: 'parcelle', gid: 'ailleurs', name: 'Ailleurs', x: 0, y: 0, w: 500, h: 500, rot: 0, zones: [] });
    localStorage.clear(); localStorage.setItem(keyOf('prop'), JSON.stringify(p)); localStorage.setItem(keyOf('main'), JSON.stringify(emptyGarden('Vieux 1'))); localStorage.setItem(keyOf('g2'), JSON.stringify(emptyGarden('Vieux 2')));
    localStorage.setItem('atelier-potager-list', JSON.stringify({ cur: 'main', list: [{ id: 'prop', name: 'Ma propriété', k: 'propriete' }, { id: 'main', name: 'Vieux 1' }, { id: 'g2', name: 'Vieux 2' }] })) });
  await page.reload(); await page.waitForFunction(() => window.APP_PRETE === true);
  assert.deepEqual(await page.evaluate(() => [TOP, tab]), ['prop', 'prop'], 'aucun jardin posé : on arrive sur la propriété');
  assert.equal(await page.isVisible('.tabs [data-top="potager"]'), false);
  assert.match(await page.textContent('#v-prop .tcard'), /Pas sur le plan/, 'la carte des jardins à poser est en haut');
  /* menu : « Poser sur le plan » */
  await page.click('#menuBtn');
  await page.click('[data-act="gplace"][data-g="main"]');
  assert.equal(await page.isVisible('.tabs [data-top="potager"]'), true);
  /* l'autre, ouvert depuis le menu, affiche un bandeau pour le poser */
  await page.click('[data-act="gopen"][data-g="g2"]');
  assert.ok(await page.isVisible('#subnav [data-pput]'));
  await page.click('#subnav [data-pput]');
  assert.equal(await page.isVisible('#subnav [data-pput]'), false);
  await page.click('.tabs [data-top="prop"]');
  assert.deepEqual(await page.evaluate(() => S.objs.filter(o => o.type === 'parcelle').map(o => o.gid).sort()), ['ailleurs', 'g2', 'main'], 'la parcelle d\'un jardin absent n\'est pas effacée');
  assert.deepEqual(erreurs, []);
  await ctx.close();
});
