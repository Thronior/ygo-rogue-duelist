"""Weevil Underwood's second loadout becomes the Plant loadout "Overgrown Garden" (user, 2026-11-24), replacing Insect
Evolution. Starts with the Pollinator relic and Lonefire Blossom, Gigaplant and Botanical Lion; its support packs are Savage
Wilds (all ten Plant cards from tools/add_nov24_plant_cards.py) and Expert Edition Volume.2 (Lord Poison, Anti-Aircraft
Flower, Prickle Fairy, Lekunga, Arcane Archer of the Forest). Its pack additions join Weevil's pack, as every loadout's do;
Insect Evolution's additions stay there (they are Insect cards for his main loadout).

Usage: python tools/add_nov24_weevil_plant_loadout.py   (re-running changes nothing)
"""
import json, runpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
WEEVIL = '10'
LOADOUT = {
    'name': 'Overgrown Garden',
    'starting_relic': 'pollinator',
    'supporting_packs': ['CUSTOM-SAVAGE-WILDS', 'JP-EE2'],
    'cards': ['Lonefire Blossom', 'Gigaplant', 'Botanical Lion'],
    'pack_additions': ['Lonefire Blossom', 'Gigaplant', 'Botanical Lion', 'Dandylion', 'Gigantic Cephalotus', 'Rose Witch',
                       'Botanical Girl', 'Plant Food Chain', 'Fairy King Truesdale', 'Anti-Aircraft Flower'],
    'background_card': 'Lonefire Blossom',
    'background': 'character-backgrounds/variant-10.jpg',
}
RARE = {'Lonefire Blossom', 'Gigaplant', 'Fairy King Truesdale'}
# Hidden loadout relics (data/loadout-relics.json): never shown to players or in patch notes.
HIDDEN = ['photosynthesis', 'spring_growth', 'hive', 'earth', 'chitin_carapace']


def main():
    path = ROOT / 'data/character-variants.json'
    variants = json.loads(path.read_text(encoding='utf8'))
    variants['variants'][WEEVIL] = LOADOUT
    path.write_text(json.dumps(variants, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    # data/loadout-relics.json keeps one loadout per line: replace that line only.
    path = ROOT / 'data/loadout-relics.json'
    lines = path.read_text(encoding='utf8').split('\n')
    for i, line in enumerate(lines):
        if line.startswith(' "10:1": '):
            lines[i] = ' "10:1": ' + json.dumps(HIDDEN) + (',' if line.rstrip().endswith(',') else '')
    text = '\n'.join(lines)
    assert json.loads(text)[WEEVIL + ':1'] == HIDDEN
    path.write_text(text, encoding='utf8')
    ids = {c['name']: c['id'] for c in json.loads((ROOT / 'data/era-cards.json').read_text(encoding='utf8'))}
    path = ROOT / 'data/packs.json'
    packs = json.loads(path.read_text(encoding='utf8'))
    pack = next(p for p in packs if p['id'] == 'DRAFT-WEEVIL-UNDERWOOD')
    for name in LOADOUT['pack_additions']:
        cid = ids[name]
        if cid in pack['common'] or cid in pack['rare']:
            continue
        pool = 'rare' if name in RARE else 'common'
        pack[pool].append(cid)
        pack.setdefault('rarities', {})[str(cid)] = ['Rare' if pool == 'rare' else 'Common']
        if pool == 'rare':
            pack.setdefault('rare_display', []).append(cid)
        print('Weevil pack', pool, name)
    path.write_text(json.dumps(packs, ensure_ascii=False, indent=2) + '\n', encoding='utf8')


if __name__ == '__main__':
    main()
