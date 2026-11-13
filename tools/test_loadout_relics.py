"""Hidden loadout relics (user, 2026-11-13): 5 per loadout, valid keys, and their deck gain is doubled (at least x2)."""
import sys,json,random
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,archetype_relics as a,character_variants as cv,cursed_relics,relic_fusions
from content import ARTIFACTS,PLAYABLE_IDS,CHARACTERS
data={k:v for k,v in json.loads((ROOT/'data/loadout-relics.json').read_text(encoding='utf8')).items() if not k.startswith('_')}
expected={f'{i}:0' for i in PLAYABLE_IDS}|{f'{i}:1' for i in PLAYABLE_IDS if str(i) in cv.VARIANTS}
assert set(data)==expected,(expected^set(data))
for k,v in data.items():
 assert len(v)==len(set(v))==5,k
 assert all(r in ARTIFACTS and r not in relic_fusions.KEYS and r not in cursed_relics.approved() for r in v),k
# Yami Yugi standard: Tribute Power with no high-Level cards in the Deck still counts x2 (not x0.4); a matching one doubles.
run=g.new_run(0,random.Random(1));g.auto_deck(run)
w=a.offer_weights(['tribute','fang','urn'],dict(run,pool=[g.BY_NAME['Celtic Guardian']['id']]*20,selected=list(range(20))))
assert w['tribute'][1]==a.LOADOUT_MIN and w['fang'][1]<1 and w['tribute'][2],w
zombie=dict(run,character=9,variant=0,pool=[g.BY_NAME['Armored Zombie']['id']]*20,selected=list(range(20)))
import relic_affinity as ra
plain=ra.details(['restless_dead'],zombie)['restless_dead'][0]
assert abs(a.offer_weights(['restless_dead'],zombie)['restless_dead'][1]-min(a.BOOST_CAP,1+2*(plain-1)))<1e-9
# Another loadout does not get Bonz's list.
assert a.offer_weights(['restless_dead'],dict(zombie,character=0))['restless_dead'][1]==plain
print(f'PASS loadout relics: {len(data)} loadouts x5, doubled deck gain (min x{a.LOADOUT_MIN}), only for that loadout')
