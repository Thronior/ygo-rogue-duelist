"""Character pack changes picked by the user on 2026-11-25 (Discord):

- Joey Wheeler's pack gets generic removal (Eriko: "he really needs better removal and staples in his pack ...
  Pulling even a fissure would go a long way"; the user: "don't do the better warrior thing but do add some more
  generic removal"): Fissure, Trap Hole, Dust Tornado, Sakuretsu Armor (common), Mystical Space Typhoon, Mirror Force (rare).
- Umi leaves Bandit Keith's pack (Hoshigan: a Field Spell that weakens Machines in the Machine duelist's pack).
  Amphibious Bugroth MK-3 leaves with it: its only effect needs "Umi", and character packs must contain every card
  their cards name (tools/test_character_pack_references.py).

Re-running changes nothing. Afterwards regenerate the Draft catalog (tools/build_android.py does it), which means a
rooms Worker deploy at release.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FISSURE, TRAP_HOLE, DUST_TORNADO, SAKURETSU = 66788016, 4206964, 60082869, 56120475
MST, MIRROR_FORCE = 5318639, 44095762
UMI, BUGROTH_MK3 = 22702055, 64342551
ADD = {'DRAFT-JOEY-WHEELER': {'common': (FISSURE, TRAP_HOLE, DUST_TORNADO, SAKURETSU), 'rare': (MST, MIRROR_FORCE)}}
REMOVE = {'DRAFT-BANDIT-KEITH': (UMI, BUGROTH_MK3)}


def main():
    path = ROOT / 'data/packs.json'
    packs = json.loads(path.read_text(encoding='utf8'))
    for pack in packs:
        for pool, ids in ADD.get(pack['id'], {}).items():
            for cid in ids:
                if cid in pack['common'] or cid in pack['rare']:
                    continue
                pack[pool].append(cid)
                pack.setdefault('rarities', {})[str(cid)] = ['Rare' if pool == 'rare' else 'Common']
                if pool == 'rare':
                    pack.setdefault('rare_display', []).append(cid)
                print('added', pack['id'], pool, cid)
        for cid in REMOVE.get(pack['id'], ()):
            for key in ('common', 'rare', 'rare_display'):
                if cid in pack.get(key, []):
                    pack[key] = [x for x in pack[key] if x != cid]
                    print('removed', pack['id'], key, cid)
            pack.get('rarities', {}).pop(str(cid), None)
    path.write_text(json.dumps(packs, ensure_ascii=False, indent=2) + '\n', encoding='utf8')


if __name__ == '__main__':
    main()
