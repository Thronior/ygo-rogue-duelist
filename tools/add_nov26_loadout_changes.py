"""Loadout changes from MonkehestMan's loadout list (user, 2026-11-26).

- Mokuba Kaiba's main loadout becomes Thunder Dragons: 2 "Thunder Dragon" + "Snatch Steal", same starting relic. His pack
  gains Snatch Steal, Twin-Headed Thunder Dragon (the most common of his rares) and a little Thunder support.
- Serenity Wheeler: Saintly Fusion becomes her main loadout. Her second loadout is Zera's Sanctuary (The Sanctuary in the
  Sky, Warrior of Zera, Archlord Zerato) with the Herald of Heaven relic. Her pack gets every Sanctuary in the Sky card
  and more Fairy support, and loses non-Fusion filler so the Fusion side keeps its share.
- Dartz's main loadout starts with The Seal of Orichalcos in place of Dark Spirit of the Silent; same starting relic.
- Duke Devlin's main loadout starts with Skull Dice in place of Dice Re-Roll (2026-11-27).

Usage: python tools/add_nov26_loadout_changes.py   (re-running changes nothing)
"""
import json, runpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
MOKUBA, SERENITY, DARTZ, DUKE = '24', '29', '34', '19'

SIGNATURES = {
    MOKUBA: ['Thunder Dragon', 'Thunder Dragon', 'Snatch Steal'],
    SERENITY: ['St. Joan', 'Fusion Gate', 'Darklord Marie', 'The Forgiving Maiden'],
    DARTZ: ['Dark Ruler Ha Des', 'The Seal of Orichalcos', 'Lesser Fiend'],
    # Skull Dice in place of Dice Re-Roll (user, 2026-11-27).
    DUKE: ['Dice Jar', 'Skull Dice', 'Roulette Barrel'],
}
SERENITY_PACKS = ['DRAFT-SERENITY-WHEELER', 'DRAFT-SERENITY-WHEELER', 'EN-MRD', 'EN-FET']
SANCTUARY_CARDS = ['The Sanctuary in the Sky', 'Warrior of Zera', 'Archlord Zerato', 'The Agent of Force - Mars',
                   'The Agent of Judgment - Saturn', 'The Agent of Wisdom - Mercury', 'The Agent of Creation - Venus',
                   'Mystical Shine Ball', 'Light of Judgment']
ZERA = {
    'name': "Zera's Sanctuary",
    'starting_relic': 'herald_of_heaven',
    'supporting_packs': ['JP-308', 'EN-MRL'],
    'cards': ['The Sanctuary in the Sky', 'Warrior of Zera', 'Archlord Zerato'],
    'pack_additions': SANCTUARY_CARDS,
    'background_card': 'Archlord Zerato',
    'background': 'character-backgrounds/variant-29-zera.jpg',
}
# Hidden loadout relics (data/loadout-relics.json): never shown to players or in patch notes.
HIDDEN = {
    '24:0': ['storm_core', 'light', 'tribute', 'dragon', 'normal'],
    '29:1': ['halo', 'light', 'sanctuary_hymn', 'healing_echo', 'spring'],
}
PACKS = {
    'DRAFT-MOKUBA-KAIBA': {
        'rare': ['Snatch Steal', 'Twin-Headed Thunder Dragon', 'Zaborg the Thunder Monarch'],
        'common': ['Thunder Nyan Nyan', 'Electro-Whip', 'Mountain'],
        'remove': [],
        # "Rare but the least rare of the rare ones" (user): ordinary rares weigh 1.
        'weights': {'Twin-Headed Thunder Dragon': 1.5},
    },
    'DRAFT-SERENITY-WHEELER': {
        'rare': ['Archlord Zerato', 'The Agent of Force - Mars', 'The Agent of Judgment - Saturn', 'Soul of Purity and Light'],
        'common': ['The Sanctuary in the Sky', 'Warrior of Zera', 'The Agent of Wisdom - Mercury', 'The Agent of Creation - Venus',
                   'Mystical Shine Ball', 'Light of Judgment', 'Cestus of Dagla', 'Silver Bow and Arrow'],
        # Off-theme filler: neither Fusion support nor Fairy/Sanctuary nor her healing. Teva stays: it is a coverage
        # addition (data/character-pack-coverage-additions.json).
        'remove': ['Cyber Commander', 'Lady Panther', 'Magic Reflector', 'Scroll of Bewitchment', 'Shadow Tamer',
                   'Skilled White Magician', 'Frontier Wiseman', "Magician's Valkyria", 'Maha Vailo', 'The Stern Mystic',
                   'Pixie Knight', 'Silent Magician LV4', 'Spirit Caller', 'Nimble Momonga', 'Bad Reaction to Simochi',
                   'Enchanted Javelin', 'Gift of The Mystical Elf', 'Buster Blader', 'Silent Magician LV8'],
        'weights': {},
    },
}


def load(name):
    return json.loads((ROOT / 'data' / name).read_text(encoding='utf8'))


def save(name, value, indent=2, newline=True):
    (ROOT / 'data' / name).write_text(json.dumps(value, ensure_ascii=False, indent=indent) + ('\n' if newline else ''), encoding='utf8')


def main():
    signatures = load('character-signatures.json')
    signatures.update(SIGNATURES)
    save('character-signatures.json', signatures)

    progression = load('character-progression.json')
    progression['starting_relics'][SERENITY] = 'fusion_chamber'
    save('character-progression.json', progression, indent=1, newline=False)

    drafts = load('character-drafts.json')
    drafts[SERENITY] = SERENITY_PACKS
    save('character-drafts.json', drafts)

    variants = load('character-variants.json')
    variants['variants'][SERENITY] = ZERA
    save('character-variants.json', variants)

    # data/loadout-relics.json keeps one loadout per line. Serenity's old Saintly Fusion list becomes her main one.
    path = ROOT / 'data/loadout-relics.json'
    old = json.loads(path.read_text(encoding='utf8'))
    hidden = dict(HIDDEN)
    if old['29:1'] != HIDDEN['29:1']:
        hidden['29:0'] = old['29:1']
    lines = path.read_text(encoding='utf8').split('\n')
    for i, line in enumerate(lines):
        for key, value in hidden.items():
            if line.startswith(f' "{key}": '):
                lines[i] = f' "{key}": ' + json.dumps(value) + (',' if line.rstrip().endswith(',') else '')
    text = '\n'.join(lines)
    assert all(json.loads(text)[k] == v for k, v in hidden.items())
    path.write_text(text, encoding='utf8')

    ids = {c['name']: c['id'] for c in load('era-cards.json')}
    packs = load('packs.json')
    for pid, change in PACKS.items():
        pack = next(p for p in packs if p['id'] == pid)
        for name in change['remove']:
            cid = ids[name]
            for pool in ('common', 'rare', 'rare_display'):
                if cid in pack.get(pool, []):
                    pack[pool].remove(cid)
            pack.get('rarities', {}).pop(str(cid), None)
        for pool in ('rare', 'common'):
            for name in change[pool]:
                cid = ids[name]
                if cid in pack['common'] or cid in pack['rare']:
                    continue
                pack[pool].append(cid)
                pack.setdefault('rarities', {})[str(cid)] = ['Rare' if pool == 'rare' else 'Common']
                if pool == 'rare':
                    pack.setdefault('rare_display', []).append(cid)
        for name, weight in change['weights'].items():
            pack.setdefault('rarity_weights', {})[str(ids[name])] = weight
    save('packs.json', packs)


if __name__ == '__main__':
    main()
