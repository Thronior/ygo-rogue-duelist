"""Splits data/i18n/catalog.json into per-language work chunks for translators.

Each entry carries the official localized names of cards it quotes ("Card Name") and, for engine system strings,
the community translation from mycard as a suggestion only when MyCard's English source matches the game's English.
Usage: python tools/i18n/prepare_work.py <work dir> [chunk size]
The work directory must contain mycard-en-US-strings.conf from mycard/ygopro-database.
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
work = Path(sys.argv[1])
size = int(sys.argv[2]) if len(sys.argv) > 2 else 250
catalog = json.loads((ROOT / 'data/i18n/catalog.json').read_text(encoding='utf8'))
content = json.loads((ROOT / 'android/web/content.json').read_text(encoding='utf8'))
by_name = {c['name']: str(c['id']) for c in content['cards'] + content['tokenCards']}
game_system = {}
for line in (ROOT / 'runtime/config/strings.conf').read_text(encoding='utf8', errors='replace').splitlines():
    m = re.match(r'!system (\d+) (.*)', line)
    if m:
        game_system[m.group(1)] = m.group(2).strip()

mycard_en_file = work / 'mycard-en-US-strings.conf'
if not mycard_en_file.exists():
    raise SystemExit(f'Missing {mycard_en_file}. Download locales/en-US/strings.conf from mycard/ygopro-database before preparing chunks.')
mycard_english = {}
for line in mycard_en_file.read_text(encoding='utf8', errors='replace').splitlines():
    m = re.match(r'!system (\d+) (.*)', line)
    if m:
        mycard_english[m.group(1)] = m.group(2).strip()


def system_template(text):
    """Convert a game's printf placeholders to ordered {n} slots."""
    index = 0

    def replace(match):
        nonlocal index
        positional = match.group(1)
        slot = int(positional) - 1 if positional else index
        index += 1
        return '{%d}' % slot

    return re.sub(r'%(?:(\d+)\$)?l?[sd]', replace, text)


for lang in ('de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh'):
    names = json.loads((ROOT / f'data/i18n/cards/{lang}.json').read_text(encoding='utf8'))
    system = json.loads((ROOT / f'data/i18n/system/{lang}.json').read_text(encoding='utf8'))['system']
    out = work / lang
    out.mkdir(parents=True, exist_ok=True)
    entries = []
    for i, row in enumerate(catalog):
        e = {'i': i, 'en': row['en'], 'kind': row['kind'], 'group': row['group'], 'ctx': row['ctx']}
        quoted = {n: names[by_name[n]][0] for n in re.findall(r'"([^"]+)"', row['en']) if n in by_name and by_name[n] in names}
        if row['en'] in by_name and by_name[row['en']] in names:
            quoted[row['en']] = names[by_name[row['en']]][0]
        if quoted:
            e['card_names'] = quoted
        sid = re.match(r'engine system string (\d+)', row['ctx'])
        if sid and system.get(sid.group(1)) and mycard_english.get(sid.group(1)):
            # Some upstream locales use different IDs. Only show a suggestion when
            # MyCard's own English text proves this ID has the game's meaning.
            if system_template(mycard_english[sid.group(1)]) == e['en']:
                e['suggestion'] = system_template(system[sid.group(1)])
        entries.append(e)
    chunks = [entries[k:k + size] for k in range(0, len(entries), size)]
    for k, chunk in enumerate(chunks):
        (out / f'chunk-{k:02d}.json').write_text(json.dumps(chunk, ensure_ascii=False, indent=1), encoding='utf8')
    print(lang, len(chunks), 'chunks')
