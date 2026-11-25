"""Adds four later real cards picked from the 10K-players survey card asks (user, 2026-11-25): The Seal of Orichalcos for
Dartz, the two missing original Monarchs (Raiza the Storm Monarch, Caius the Shadow Monarch) and Red-Eyes Wyvern for Joey.
They are outside the era cutoff, so like the Toon and Plant cards (tools/add_nov23_toon_cards.py) they go into
data/era-cards.json and data/opponent-card-exceptions.json, with card data from runtime/expansions/cards.cdb, the official
text in the 8 languages from mycard's locale databases and the art from a folder of <id>.jpg files.

Packs: The Seal of Orichalcos is a Rare in Dartz's pack. Raiza and Caius join the two packs that hold all four other
Monarchs, at the same rarity those have there: Rare in the Paradox Brothers' pack, Super Rare in Yami Marik's.
Red-Eyes Wyvern is a Rare in Joey Wheeler's pack. Character packs are draft-only, so each card also joins a themed custom
shop pack as a Rare (user, 2026-11-25: "add these cards to appropriate packs"), next to its kin: Caius and the Seal in
Nightmare Legion (DARK/Fiend; Yami, Pandemonium), Raiza and Red-Eyes Wyvern in Heaven's Wrath (WIND, Winged Beast,
Dragon; Red-Eyes Black Dragon), like Zaborg/Mobius (Storm Tide) and Granmarg (Stone and Steel). No CPU deck changes.

Usage: python tools/add_nov25_survey_cards.py <mycard locales dir> <art dir>
Never overwrites an existing card, translation or picture; re-running changes nothing.
"""
import json, runpy, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
toon = runpy.run_path(str(ROOT / 'tools/add_nov23_toon_cards.py'), run_name='survey_cards')
SEAL, RAIZA, CAIUS, WYVERN = 48179391, 73125233, 9748752, 67300516
IDS = (SEAL, RAIZA, CAIUS, WYVERN)
# pack id -> {card id: rarity label}; every one goes in the pack's rare slot.
PACKS = {
    'DRAFT-DARTZ': {SEAL: 'Rare'},
    'DRAFT-PARADOX-BROTHERS': {RAIZA: 'Rare', CAIUS: 'Rare'},
    'DRAFT-YAMI-MARIK': {RAIZA: 'Super Rare', CAIUS: 'Super Rare'},
    'DRAFT-JOEY-WHEELER': {WYVERN: 'Rare'},
    'CUSTOM-NIGHTMARE-LEGION': {SEAL: 'Rare', CAIUS: 'Rare'},
    'CUSTOM-HEAVENS-WRATH': {RAIZA: 'Rare', WYVERN: 'Rare'},
}


def add_to_packs():
    path = ROOT / 'data/packs.json'
    packs = json.loads(path.read_text(encoding='utf8'))
    for pack in packs:
        for cid, rarity in PACKS.get(pack['id'], {}).items():
            if cid in pack['common'] or cid in pack['rare']:
                continue
            pack['rare'].append(cid)
            pack.setdefault('rarities', {})[str(cid)] = [rarity]
            pack.setdefault('rare_display', []).append(cid)
            print('pack', pack['id'], rarity, cid)
    path.write_text(json.dumps(packs, ensure_ascii=False, indent=2) + '\n', encoding='utf8')


if __name__ == '__main__':
    # The Toon script's functions read its own IDS global: point it at these cards.
    toon['main'].__globals__['IDS'] = IDS
    toon['main'](*sys.argv[1:3])
    add_to_packs()
