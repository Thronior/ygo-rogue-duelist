"""Cursed relics are called shadow relics (user, 2026-11-19), so players stop confusing them with boss curses.
Renames the player-facing English text and every translation of it. Code ids (cursed_*, cursed-reward, file names) stay.
Safe to run again."""
import json, re, runpy, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()

def english(text):
    text = text.replace('cursed-relic reroll', 'shadow-relic reroll')
    for old, new in (('cursed relic', 'shadow relic'), ('Cursed relic', 'Shadow relic'), ('Cursed Relic', 'Shadow Relic'), ('CURSED RELIC', 'SHADOW RELIC')):
        text = text.replace(old, new)
    return text

FILES = ['android/web/activation-reasons.js', 'android/web/duel-presentation.js', 'android/web/duel.js', 'android/web/mobile.css',
         'android/web/mobile.js', 'android/web/relic-collection.js', 'android/web/relic-inspect.js', 'android/web/run-card.js', 'android/web/tag-ui.js',
         'approved_relic_effects.py', 'approved_relics.py', 'artifact_text.py', 'campaign_expansion.py', 'content.py', 'cursed_relics.py',
         'debug_codes.py', 'draft_relics.py', 'payment.py', 'relic_fusions.py', 'data/tuning.json', 'data/tutorial.json',
         'android/test_spell_sanctuary.mjs', 'android/test_run_card.mjs', 'android/test_cursed_nov17.mjs', 'android/test_relics_nov15.mjs',
         'android/test_relics_nov14.mjs', 'android/test_cursed_oct29.mjs', 'multiplayer/cloudflare/draft-loop.test.mjs']

# Each language's word for the relic kind, with its inflections, and the new word.
LANG = {
    'de': [(re.compile(r'[Vv]erfluchte[nrs]? Relikt(e|s|en)?\b'), lambda m: 'Schattenrelikt' + (m.group(1) or ''))],
    'es': [(re.compile(r'([Rr]eliquias?) [Mm]alditas?'), lambda m: m.group(1) + ' de las sombras')],
    'fr': [(re.compile(r'([Rr]eliques?) maudites?'), lambda m: m.group(1) + " de l'ombre")],
    'it': [(re.compile(r'([Rr]eliqui[ae]) [Mm]aledett[ae]'), lambda m: m.group(1) + " dell'ombra")],
    'pt': [(re.compile(r'([Rr]elíquias?) ([Aa])maldiçoadas?'), lambda m: m.group(1) + (' das Sombras' if m.group(2) == 'A' else ' das sombras'))],
    'ja': [(re.compile('呪いのレリック'), lambda m: '影のレリック')],
    'ko': [(re.compile('저주받은 유물'), lambda m: '그림자 유물')],
    'zh': [(re.compile('诅咒遗物'), lambda m: '暗影遗物')],
}

def is_relic_key(key):
    return bool(re.search(r'(?i)cursed[- ]relic', key))

def main():
    for name in FILES:
        path = ROOT / name
        text = path.read_bytes().decode('utf-8')
        new = english(text)
        if new != text:
            path.write_bytes(new.encode('utf-8'))
            print('renamed', name)
    missed = {}
    for lang, rules in LANG.items():
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        out = {}
        for key, value in table.items():
            if is_relic_key(key):
                for rx, fn in rules:
                    value = rx.sub(fn, value)
                if not any(w in value for w in ('Schattenrelikt', 'sombras', "l'ombre", "dell'ombra", 'Sombras', '影のレリック', '그림자 유물', '暗影遗物')):
                    missed.setdefault(lang, []).append(key)
                key = english(key)
            out.setdefault(key, value)
        path.write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    seen, rows = set(), []
    for row in catalog:
        row['en'] = english(row['en'])
        if row['en'] in seen: continue
        seen.add(row['en']); rows.append(row)
    catalog_path.write_text(json.dumps(rows, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    for lang, keys in missed.items():
        print('CHECK', lang, keys)

if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
