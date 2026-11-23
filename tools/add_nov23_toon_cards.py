"""Adds four later Toon cards for Maximillion Pegasus' pack (user, 2026-11-23, from a Discord suggestion): Toon Dark
Magician, Toon Briefcase, Toon Mask and Comic Hand. They are outside the era cutoff, so like Mausoleum of the Emperor
they go into data/era-cards.json directly, and into data/opponent-card-exceptions.json so tools/build_content.py keeps
them on a rebuild. Card data and English text come from runtime/expansions/cards.cdb (the engine's own database), the
release date from YGOJSON, the official card text in the 8 languages from mycard's locale databases (the same source as
tools/i18n/build_catalog.py), the art from a folder of downloaded images/cards/<id>.jpg files.

Usage: python tools/add_nov23_toon_cards.py <mycard locales dir> <art dir>
Never overwrites an existing card, translation or picture; re-running changes nothing.
"""
import json, runpy, shutil, sqlite3, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
IDS = (21296502, 5832914, 79447365, 33453260)
LANGS = {'de': 'de-DE', 'es': 'es-ES', 'fr': 'fr-FR', 'it': 'it-IT', 'pt': 'pt-PT', 'ja': 'ja-JP', 'ko': 'ko-KR', 'zh': 'zh-CN'}
RACES = {1: 'Warrior', 2: 'Spellcaster', 4: 'Fairy', 8: 'Fiend', 16: 'Zombie', 32: 'Machine', 64: 'Aqua', 128: 'Pyro', 256: 'Rock',
         512: 'Winged Beast', 1024: 'Plant', 2048: 'Insect', 4096: 'Thunder', 8192: 'Dragon', 16384: 'Beast', 32768: 'Beast-Warrior',
         65536: 'Dinosaur', 131072: 'Fish', 262144: 'Sea Serpent', 524288: 'Reptile'}
ATTRIBUTES = {1: 'EARTH', 2: 'WATER', 4: 'FIRE', 8: 'WIND', 16: 'LIGHT', 32: 'DARK', 64: 'DIVINE'}


def kind(typ):
    if typ & 1:
        return 'Toon Monster' if typ & 0x400000 else 'Effect Monster' if typ & 32 else 'Normal Monster'
    return 'Spell Card' if typ & 2 else 'Trap Card'


def spell_race(typ):
    for bit, name in ((0x10000, 'Quick-Play'), (0x20000, 'Continuous'), (0x40000, 'Equip'), (0x80000, 'Field'), (0x80, 'Ritual'), (0x100000, 'Counter')):
        if typ & bit:
            return name
    return 'Normal'


def release_dates():
    cards = json.loads((ROOT / 'dependencies/ygojson/cards.json').read_text(encoding='utf8'))
    sets = {s['id']: s for s in json.loads((ROOT / 'dependencies/ygojson/sets.json').read_text(encoding='utf8'))}
    dates = {}
    for c in cards:
        for password in c.get('passwords', []):
            if password.isdigit() and int(password) in IDS:
                found = [l.get('date') for s in c.get('sets', []) for l in (sets.get(s.get('id') if isinstance(s, dict) else s, {}).get('locales') or {}).values() if l.get('date')]
                dates[int(password)] = min(found) if found else ''
    return dates


def main(locales, art):
    db = sqlite3.connect(ROOT / 'runtime/expansions/cards.cdb')
    dates = release_dates()
    era_path, exc_path = ROOT / 'data/era-cards.json', ROOT / 'data/opponent-card-exceptions.json'
    era = json.loads(era_path.read_text(encoding='utf8'))
    exceptions = json.loads(exc_path.read_text(encoding='utf8'))
    have, have_exc = {c['id'] for c in era}, {c['id'] for c in exceptions}
    for cid in IDS:
        _, ot, alias, setcode, typ, atk, defense, level, race, attr, cat = db.execute('select * from datas where id=?', (cid,)).fetchone()
        txt = db.execute('select * from texts where id=?', (cid,)).fetchone()
        monster = typ & 1
        card = dict(id=cid, name=txt[1], desc=txt[2].replace('\r\n', '\n'), type=kind(typ),
                    race=RACES.get(race, 'Normal') if monster else spell_race(typ), attribute=ATTRIBUTES.get(attr, ''),
                    level=level & 255, atk=atk if monster else 0, defense=defense if monster else 0, date=dates.get(cid, ''), sets=[],
                    image=f'https://images.ygoprodeck.com/images/cards/{cid}.jpg',
                    data=dict(code=cid, alias=alias, setcodes=[(setcode >> n) & 65535 for n in (0, 16, 32, 48) if (setcode >> n) & 65535],
                              type=typ, level=level & 255, attribute=attr, race=str(race), attack=atk if monster else 0,
                              defense=defense if monster else 0, lscale=0, rscale=0, link_marker=0),
                    strings=[s or '' for s in txt[3:19]])
        if cid not in have:
            era.append(card)
        if cid not in have_exc:
            exceptions.append(card)
        for folder in ('assets/cards', 'runtime/pics'):
            target = ROOT / folder / f'{cid}.jpg'
            if not target.exists():
                shutil.copyfile(Path(art) / f'{cid}.jpg', target)
        print('card', cid, card['name'], card['type'], card['race'], card['date'])
    era_path.write_text(json.dumps(era, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    exc_path.write_text(json.dumps(exceptions, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    for lang, folder in LANGS.items():
        path = ROOT / f'data/i18n/cards/{lang}.json'
        table = json.loads(path.read_text(encoding='utf8'))
        local = sqlite3.connect(Path(locales) / folder / 'cards.cdb')
        for cid in IDS:
            row = local.execute('select name,desc,' + ','.join(f'str{i}' for i in range(1, 17)) + ' from texts where id=?', (cid,)).fetchone()
            if not row or str(cid) in table:
                continue
            strs = [s or '' for s in row[2:]]
            while strs and not strs[-1]:
                strs.pop()
            table[str(cid)] = [row[0], (row[1] or '').replace('\r\n', '\n'), strs]
            print(lang, cid, row[0])
        path.write_text(json.dumps(table, ensure_ascii=False, separators=(',', ':')), encoding='utf8')


if __name__ == '__main__':
    main(*sys.argv[1:3])
