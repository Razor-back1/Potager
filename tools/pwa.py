#!/usr/bin/env python3
"""Construit la version autonome (PWA) de l'Atelier Potager à partir de source-artifact.html
(lui-même assemblé par tools/build.py depuis src/).

Sortie à la racine du dépôt (servie par GitHub Pages) : index.html, manifest.webmanifest, sw.js,
icônes, .nojekyll et gardena-worker.js (le code du relais Cloudflare).
La page source est écrite pour l'enveloppe des artifacts Claude (sans <html>/<head>) ;
ici on ajoute le squelette, les métadonnées iPhone et l'enregistrement du service worker.
"""
import hashlib, json, os, re
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'source-artifact.html')
OUT = ROOT
os.makedirs(OUT, exist_ok=True)

src = open(SRC, encoding='utf-8').read()
version = hashlib.sha1(src.encode()).hexdigest()[:10]

# Le <title> et les <link> de polices passent dans le <head>
title = re.search(r'<title>(.*?)</title>', src).group(1)
body = re.sub(r'<title>.*?</title>\s*', '', src, count=1)
links = ''.join(re.findall(r'<link[^>]+>\s*', body[:2000]))
body = body.replace(links, '', 1)

head = f'''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="Plan, plantations, récoltes et journal du potager.">
<meta name="theme-color" content="#fafbf6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1d1e20" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Potager">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="icon" type="image/png" href="icon-192.png">
{links}<style>
*,*::before,*::after{{box-sizing:border-box}}
html{{-webkit-text-size-adjust:100%}}
:root{{padding-top:env(safe-area-inset-top,0px)}}
body{{margin:0;font:14px/1.45 system-ui,-apple-system,sans-serif}}
img{{max-width:100%}}
[hidden]{{display:none!important}}
#splash{{position:fixed;inset:0;z-index:999;display:grid;place-items:center;align-content:center;gap:14px;background:#2c6a39;color:#fff;font:700 22px/1.2 system-ui,-apple-system,sans-serif;transition:opacity .45s ease,visibility .45s}}
#splash img{{width:112px;height:112px;border-radius:26px;box-shadow:0 10px 30px rgba(0,0,0,.25)}}
#splash.out{{opacity:0;visibility:hidden}}
@media (prefers-reduced-motion:no-preference){{#splash img{{animation:spl .6s cubic-bezier(.2,1.3,.4,1)}}}}
@keyframes spl{{from{{transform:scale(.7);opacity:0}}to{{transform:scale(1);opacity:1}}}}
</style>
</head>
<body>
<div id="splash" aria-hidden="true"><img src="icon-512.png" alt=""><span>Atelier Potager</span></div>
'''

tail = f'''
<script>
setTimeout(()=>{{const s=document.getElementById('splash');if(s){{s.classList.add('out');setTimeout(()=>s.remove(),600)}}}},matchMedia('(display-mode: standalone)').matches||navigator.standalone?650:120);
/* version {version} : service worker « réseau d'abord » pour que chaque mise à jour arrive tout de suite */
if('serviceWorker' in navigator&&location.protocol==='https:'){{
  navigator.serviceWorker.register('sw.js').then(r=>r.update()).catch(()=>{{}});
  let reloaded=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{{if(!reloaded){{reloaded=true;location.reload()}}}});
}}
</script>
</body>
</html>
'''

open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(head + body + tail)

sw = f'''// Atelier Potager — service worker {version}
const CACHE='potager-{version}';
const CORE=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-180.png'];
self.addEventListener('install',e=>{{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))}});
self.addEventListener('activate',e=>{{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))}});
self.addEventListener('fetch',e=>{{
  const r=e.request;if(r.method!=='GET')return;
  /* même origine : on revalide toujours auprès de GitHub (sinon le cache du navigateur garde l'ancienne version 10 min) */
  const same=new URL(r.url).origin===location.origin;
  e.respondWith(fetch(same?new Request(r.url,{{cache:'no-cache',credentials:'same-origin'}}):r).then(res=>{{if(res.ok&&(new URL(r.url).origin===location.origin||r.url.includes('fonts.g'))){{const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp))}}return res}})
    .catch(()=>caches.match(r).then(m=>m||(r.mode==='navigate'?caches.match('./index.html'):undefined))));
}});
/* notifications envoyées par le relais */
self.addEventListener('push',e=>{{let d={{}};try{{d=e.data?e.data.json():{{}}}}catch(_){{d={{body:e.data?e.data.text():''}}}}
  e.waitUntil(self.registration.showNotification(d.title||'Atelier Potager',{{body:d.body||'',tag:d.tag||undefined,icon:'icon-192.png',badge:'icon-192.png',data:{{url:d.url||'./'}}}}))}});
self.addEventListener('notificationclick',e=>{{e.notification.close();const u=new URL((e.notification.data&&e.notification.data.url)||'./',self.registration.scope).href;
  e.waitUntil(clients.matchAll({{type:'window',includeUncontrolled:true}}).then(cs=>{{for(const c of cs){{if('focus' in c)return c.focus()}}return clients.openWindow(u)}}))}});
'''
open(os.path.join(OUT, 'sw.js'), 'w', encoding='utf-8').write(sw)

manifest = {
    "name": "Atelier Potager", "short_name": "Potager", "lang": "fr",
    "start_url": "./", "scope": "./", "display": "standalone",
    "background_color": "#e9ede1", "theme_color": "#fafbf6",
    "icons": [
        {"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
        {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
        {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}
json.dump(manifest, open(os.path.join(OUT, 'manifest.webmanifest'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

def icon(size, path):
    S = 1024
    im = Image.new('RGB', (S, S))
    px = im.load()
    top, bot = (64, 132, 74), (34, 92, 48)
    for y in range(S):
        t = y / (S - 1)
        c = tuple(int(top[k] * (1 - t) + bot[k] * t) for k in range(3))
        for x in range(S):
            px[x, y] = c
    d = ImageDraw.Draw(im)
    # soleil
    d.ellipse([690, 130, 870, 310], fill=(245, 190, 60))
    # trois rangs de terre en perspective
    soil, soil2 = (139, 100, 62), (118, 84, 50)
    d.polygon([(110, 1024), (330, 640), (430, 640), (330, 1024)], fill=soil)
    d.polygon([(410, 1024), (470, 640), (554, 640), (614, 1024)], fill=soil2)
    d.polygon([(694, 1024), (594, 640), (694, 640), (914, 1024)], fill=soil)
    # grande pousse
    d.line([(512, 700), (512, 420)], fill=(30, 70, 34), width=34)
    d.ellipse([300, 380, 520, 520], fill=(124, 196, 96))
    d.polygon([(512, 470), (330, 380), (300, 450)], fill=(124, 196, 96))
    d.ellipse([500, 250, 760, 420], fill=(150, 214, 112))
    d.polygon([(512, 420), (720, 260), (760, 330)], fill=(150, 214, 112))
    # petites pousses sur les rangs
    for (x, y, r) in ((250, 860, 46), (512, 880, 50), (774, 860, 46), (330, 720, 32), (694, 720, 32)):
        d.ellipse([x - r, y - r // 2, x, y + r // 2], fill=(124, 196, 96))
        d.ellipse([x, y - r // 2, x + r, y + r // 2], fill=(150, 214, 112))
    im.resize((size, size), Image.LANCZOS).save(path)

for sz in (180, 192, 512):
    icon(sz, os.path.join(OUT, f'icon-{sz}.png'))
open(os.path.join(OUT, '.nojekyll'), 'w').close()

# relais GARDENA : la règle de décision est copiée depuis l'app pour rester identique
dec = re.search(r'/\*DECIDE\*/\n(.*?)/\*/DECIDE\*/', src, re.S).group(1)
wk = open(os.path.join(ROOT, 'src', 'relais', 'relais.js'), encoding='utf-8').read().replace('//@@DECIDE@@', '/* règle de décision (copiée depuis l\'app) */\n' + dec.strip())
open(os.path.join(OUT, 'gardena-worker.js'), 'w', encoding='utf-8').write(wk)

print('build', version, 'ok')
