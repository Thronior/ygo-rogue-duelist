"""Coverage and semantic guard rails for the shop's current reward categories."""
import random,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import campaign as g,shop_rewards as s
assert {c['race'] for c in g.CARDS if c['data']['type']&1}<=set(s.LABELS)
assert {c['attribute'] for c in g.CARDS if c['data']['type']&1}<=set(s.LABELS)
assert s.DIRECT_ATTACKS<=g.BY_NAME.keys() and s.FIELD_SUPPORT<=g.BY_NAME.keys()
for c in g.CARDS:
 if c['data']['type']&1:assert s.matches(c,c['race']) and s.matches(c,c['attribute']),c['name']
 if c['data']['type']&2 and c['data']['type']&0x80000:assert s.matches(c,'field')
for n in ['Terraforming','An Owl of Luck','Magic Reflector']:assert s.matches(g.BY_NAME[n],'field')
for n in ['Burning Land','World Suppression']:assert not s.matches(g.BY_NAME[n],'field')
for n in ['Zombyra the Dark','Giant Rex','Magical Scientist','Toon Defense','Astral Barrier','Roulette Spider','Absolute End']:assert not s.matches(g.BY_NAME[n],'direct')
rng=random.Random(341);seen={s.random_reward(rng,{})['key'] for _ in range(10000)}
assert set(s.MONSTER_TYPES+s.ATTRIBUTES)|{'direct','field'}<=seen
assert s.normalize_reward({'key':'field','label':'Field Spells','pack':'EN-LOB'})['label']=='Field Spells and Support'
print('PASS all Types/Attributes can roll; field/direct pools, misleading matches excluded, old labels refreshed')
