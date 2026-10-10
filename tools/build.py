#!/usr/bin/env python3
"""Assemble l'app en un seul fichier à partir de src/, puis construit la PWA.

    python3 tools/build.py

src/head.html          titre, polices, choix du style avant affichage
src/css/*.css          base.css (look Classique) puis styles.css (iOS, Verre sombre, Widgets)
src/body.html          squelette de l'interface
src/js/NN-*.js         le code, dans l'ordre des numéros (un seul script : tout partage la même portée)
src/relais/relais.js   le relais Cloudflare (gardena-worker.js une fois construit)

Sorties : source-artifact.html (fichier unique, publié tel quel comme artifact Claude)
puis index.html, sw.js, manifest, icônes et gardena-worker.js via tools/pwa.py.
"""
import os, runpy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def src(*p):
    return open(os.path.join(ROOT, 'src', *p), encoding='utf-8').read()

css = ['base.css', 'styles.css']
js = sorted(f for f in os.listdir(os.path.join(ROOT, 'src', 'js')) if f.endswith('.js'))
page = (src('head.html') + '<style>\n' + ''.join(src('css', f) for f in css) + '</style>\n\n'
        + src('body.html') + '\n<script>\n' + ''.join(src('js', f) for f in js) + '</script>\n')
open(os.path.join(ROOT, 'source-artifact.html'), 'w', encoding='utf-8').write(page)
print('source-artifact.html :', len(js), 'modules,', len(page.encode()), 'octets')
runpy.run_path(os.path.join(ROOT, 'tools', 'pwa.py'), run_name='__main__')
