"""Adds ten later Plant cards (user, 2026-11-24, from the Discord thread "Plant support"): Lonefire Blossom, Gigaplant,
Tytannial, Princess of Camellias, Botanical Lion, Gigantic Cephalotus, Dandylion, Rose Witch, Botanical Girl, The World
Tree and Plant Food Chain. They are outside the era cutoff, so like the Toon cards (tools/add_nov23_toon_cards.py) they go
into data/era-cards.json and data/opponent-card-exceptions.json, with card data from runtime/expansions/cards.cdb, the
official text in the 8 languages from mycard's locale databases and the art from a folder of <id>.jpg files.

All ten join the Savage Wilds custom pack; Gigaplant and Dandylion also join Weevil Underwood's pack (Insect link).

Usage: python tools/add_nov24_plant_cards.py <mycard locales dir> <art dir>
Never overwrites an existing card, translation or picture; re-running changes nothing.
"""
import json, runpy, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
toon = runpy.run_path(str(ROOT / 'tools/add_nov23_toon_cards.py'), run_name='plants')
LONEFIRE, GIGAPLANT, TYTANNIAL, LION, CEPHALOTUS = 48686504, 53257892, 11819616, 20546916, 82116191
DANDYLION, ROSE_WITCH, BOTANICAL_GIRL, WORLD_TREE, PLANT_FOOD_CHAIN = 15341821, 23087070, 84824601, 5973663, 54451023
IDS = (LONEFIRE, GIGAPLANT, TYTANNIAL, LION, CEPHALOTUS, DANDYLION, ROSE_WITCH, BOTANICAL_GIRL, WORLD_TREE, PLANT_FOOD_CHAIN)
RARE = {LONEFIRE, GIGAPLANT, TYTANNIAL, WORLD_TREE}
PACKS = {'CUSTOM-SAVAGE-WILDS': IDS, 'DRAFT-WEEVIL-UNDERWOOD': (GIGAPLANT, DANDYLION)}


def add_to_packs():
    path = ROOT / 'data/packs.json'
    packs = json.loads(path.read_text(encoding='utf8'))
    for pack in packs:
        for cid in PACKS.get(pack['id'], ()):
            if cid in pack['common'] or cid in pack['rare']:
                continue
            pool = 'rare' if cid in RARE else 'common'
            pack[pool].append(cid)
            pack.setdefault('rarities', {})[str(cid)] = ['Rare' if pool == 'rare' else 'Common']
            if pool == 'rare':
                pack.setdefault('rare_display', []).append(cid)
            print('pack', pack['id'], pool, cid)
    path.write_text(json.dumps(packs, ensure_ascii=False, indent=2) + '\n', encoding='utf8')


if __name__ == '__main__':
    # The Toon script's functions read its own IDS global: point it at the Plant cards.
    toon['main'].__globals__['IDS'] = IDS
    toon['main'](*sys.argv[1:3])
    add_to_packs()
