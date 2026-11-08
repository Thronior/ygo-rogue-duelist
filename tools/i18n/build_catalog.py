"""Builds the English translation catalog and the per-language card texts for the localized client.

Usage: python tools/i18n/build_catalog.py <mycard locales dir> [<ui-raw.json> <py-raw.json>]

- data/i18n/catalog.json: every English string to translate, grouped (ui, python, relic, curse, character, tutorial,
  rules, system, card-override) with a context hint. Patterns use {0}, {1}... placeholders.
- data/i18n/cards/<lang>.json: official card texts in that language, for the cards in the game only
  ({id: [name, desc, [str1..str16]]}), from mycard/ygopro-database (https://github.com/mycard/ygopro-database).
- data/i18n/system/<lang>.json: engine system strings by id, plus official archetype (setname) names by setcode.
"""
import json, re, sqlite3, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'data/i18n'
LANGS = {'de': 'de-DE', 'es': 'es-ES', 'fr': 'fr-FR', 'it': 'it-IT', 'pt': 'pt-PT', 'ja': 'ja-JP', 'ko': 'ko-KR', 'zh': 'zh-CN'}
content = json.loads((ROOT / 'android/web/content.json').read_text(encoding='utf8'))
cards = content['cards'] + content['tokenCards']
card_names = {c['name'] for c in cards}
proper = card_names | {c['name'] for c in content['characters']} | {p['name'] for p in content['packs']}
for names in content.get('bossDeckNames', {}).values():
    proper |= set(names.values())
pre_errata = json.loads((ROOT / 'data/pre-errata.json').read_text(encoding='utf8'))['cards']
custom = json.loads((ROOT / 'data/custom-cards.json').read_text(encoding='utf8'))


def norm(s):
    return re.sub(r'\s+', ' ', str(s or '')).strip()


CODEY = re.compile(r'\d(px|ms|deg|vh|vw|dvh|em|rem)\b|#[0-9a-f]{3,8}\b|translate|scale[XY(]|rotate|rgba?\(|hsla?\(|var\(--|cubic-bezier|=>|===|&&|\|\||\\|function\b|Duel\.|REASON_|PHASE_|^\s*[\[{(]|[\[{(]\s*$|\bnull\b|\bundefined\b', re.I)


def keep_ui(text):
    s = norm(text)
    if s in proper or CODEY.search(s):
        return False
    if re.fullmatch(r"[a-z][a-z'\-]*", s):  # lone lowercase word: almost always a key
        return False
    if re.fullmatch(r'[A-Z]{2,}[0-9-]*', s) and s not in {'ATK', 'DEF', 'LP', 'GY'}:  # set codes like LOB
        return False
    if re.fullmatch(r'[\d\s.,:/+\-×x%#{}]+', s):
        return False
    return True


rows, seen = [], set()


def add(group, en, kind='exact', ctx=''):
    en = norm(en)
    if not en or (group, en) in seen:
        return
    seen.add((group, en))
    if '{0}' in en and kind == 'exact':
        kind = 'pattern'
    rows.append({'group': group, 'en': en, 'kind': kind, 'ctx': ctx})


# 1. Client text (JavaScript and index.html), harvested by extract_ui_strings.mjs.
if len(sys.argv) > 3:
    for r in json.loads(Path(sys.argv[2]).read_text(encoding='utf8')):
        if keep_ui(r['text']):
            add('ui', r['text'], r['kind'], ','.join(r['files'][:3]))
    # Engine location words used in system-string prompts (engine.js is not scanned).
    for w in ('hand', 'Monster Zone', 'Spell & Trap Zone', 'Graveyard', 'banished zone', 'field', 'card'):
        add('ui', w, 'exact', 'engine.js prompt location')
    # 2. Python messages; relic sentences are built from fragments, so their final text comes from content.json instead.
    relic_builders = {'artifact_text.py', 'approved_relics.py', 'approved_relic_effects.py', 'artifact_expansion.py',
                      'archetype_relics.py', 'variant_relics.py', 'relic_fusions.py', 'artifact_effects.py', 'passives.py',
                      'relic_affinity.py', 'feedback_update.py', 'content.py'}
    for r in json.loads(Path(sys.argv[3]).read_text(encoding='utf8')):
        files = [f for f in r['files'] if f not in relic_builders]
        if files and keep_ui(r['text']) and (' ' in r['text'] or r['text'][:1].isupper()):
            add('python', r['text'], r['kind'], ','.join(files[:3]))

# 3. Relics, cursed relics and their benefit/drawback parts.
for key, (name, price, text) in content['artifacts'].items():
    add('relic', name, 'exact', f'relic name ({key})')
    add('relic', text, 'exact', f'relic effect ({key})')
    for part in (content['artifactInfo'].get(key) or {}).get('parts') or []:
        add('relic', part, 'exact', f'relic effect part ({key})')
for key, (name, text) in content['curses'].items():
    add('curse', name, 'exact', f'boss curse name ({key})')
    add('curse', text, 'exact', f'boss curse effect ({key})')
# 4. Characters (names stay English), variants, tutorial and coin rules.
for c in content['characters']:
    for field in ('bonus', 'theme'):
        if c.get(field):
            add('character', c[field], 'exact', f'character {field}')
    if c.get('alternate', {}).get('name'):
        add('character', c['alternate']['name'], 'exact', f"variant title of {c['name']}")
for t in content['tutorial']:
    add('tutorial', t['title'], 'exact', 'tutorial title')
    if t.get('text'):
        add('tutorial', t['text'], 'exact', 'tutorial text')
    for s in t.get('sections') or []:
        add('tutorial', s.get('title'), 'exact', 'tutorial section title')
        add('tutorial', s.get('text'), 'exact', 'tutorial section text')
for r in content['battleCoinRules']:
    add('rules', r['label'], 'exact', 'coin reward condition')
for label in content.get('battleBonusLabels', []):
    add('rules', label, 'exact', 'coin reward condition')
# 5. Cards whose game text differs from the official text on purpose (pre-errata prints and custom cards).
for cid, row in pre_errata.items():
    add('card-override', row['desc'], 'exact', f"pre-errata card text: {row['name']} [{cid}]")
for c in custom:
    add('card-override', c['desc'], 'exact', f"custom card text: {c['name']} [{c['id']}]")
    add('card-override', c['name'], 'exact', f"custom card name [{c['id']}]")

# 6. Engine system strings (prompts, zones, phases, card kinds, Types, Attributes), %ls/%d as placeholders.
def system(path):
    out = {}
    for line in Path(path).read_text(encoding='utf8', errors='replace').splitlines():
        m = re.match(r'!system (\d+) (.*)', line)
        if m:
            out[int(m.group(1))] = m.group(2).strip()
    return out


def setnames(path):
    out = {}
    for line in Path(path).read_text(encoding='utf8', errors='replace').splitlines():
        m = re.match(r'!setname 0x([0-9a-fA-F]+) (.*)', line)
        if m:
            out[int(m.group(1), 16)] = m.group(2).split('\t')[0].strip()
    return out


game_system = system(ROOT / 'runtime/config/strings.conf')
src = Path(sys.argv[1])
for sid, text in sorted(game_system.items()):
    if sid < 1300 and re.search(r'[A-Za-z]', text):
        n = iter(range(99))
        add('system', re.sub(r'%(?:\d+\$)?l?[sd]', lambda m: '{%d}' % next(n), text), 'exact', f'engine system string {sid}')

OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'catalog.json').write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf8')

# Card texts and system strings per language, for in-game cards only.
(OUT / 'cards').mkdir(exist_ok=True)
(OUT / 'system').mkdir(exist_ok=True)
alias = {c['id']: (c.get('data') or {}).get('alias', 0) for c in cards}
archetypes = {a['setcode'] for a in content['archetypes']}
for lang, folder in LANGS.items():
    db = sqlite3.connect(src / folder / 'cards.cdb')
    texts = {r[0]: r[1:] for r in db.execute('select id,name,desc,' + ','.join(f'str{i}' for i in range(1, 17)) + ' from texts')}
    out = {}
    for c in cards:
        t = texts.get(c['id']) or texts.get(alias.get(c['id']))
        if t:
            strs = [s or '' for s in t[2:]]
            while strs and not strs[-1]:
                strs.pop()
            out[str(c['id'])] = [t[0], (t[1] or '').replace('\r\n', '\n'), strs]
    (OUT / 'cards' / f'{lang}.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
    loc = system(src / folder / 'strings.conf')
    sets = setnames(src / folder / 'strings.conf')
    (OUT / 'system' / f'{lang}.json').write_text(json.dumps({
        'system': {str(k): loc[k] for k in sorted(loc) if k < 1300 and k in game_system},
        'setnames': {str(k): sets[k] for k in sorted(archetypes) if k in sets},
    }, ensure_ascii=False, indent=1), encoding='utf8')
    print(lang, len(out), 'cards', len(loc), 'system strings')
groups = {}
for r in rows:
    groups.setdefault(r['group'], [0, 0])
    groups[r['group']][0] += 1
    groups[r['group']][1] += len(r['en'])
print(len(rows), 'catalog strings', {k: f'{n} / {c} chars' for k, (n, c) in groups.items()})
