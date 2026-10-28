"""Archetype relics are only offered once the run's card pool holds a card of that archetype (2026-10-28)."""
import sys,random,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,content as c,archetype_relics as a,choice_relics
from campaign_expansion import shop_relic_eligible
storage.ROOT=Path(tempfile.mkdtemp(dir=ROOT/'temp',prefix='archetype-offers-'));g.SAVE=storage.ROOT/'run.json'
profile=storage.profile();profile['unlocked']=list(c.PLAYABLE_IDS);storage.write(storage.ROOT/'profile.json',profile)

GATED=sorted(a.FAMILY|{k for k,v in c.ART_INFO.items() if v['effect'] in ('archetype_atk','terrorking_atk','variant_swordsman_oath')})
r=g.new_run(1,random.Random(1));g.auto_deck(r);r.update(stage='shop',round=4)
# A pool of plain Vorse Raiders belongs to no archetype.
vorse=g.BY_NAME['Vorse Raider']['id'];r['pool']=[vorse]*30;r['selected']=list(range(20))
assert all(not a.has_member(k,r) for k in GATED),[k for k in GATED if a.has_member(k,r)]
assert all(not shop_relic_eligible(r,k) for k in GATED)
assert not set(GATED)&set(choice_relics.relic_pool(r)),'Relic Picker follows the same rule'
for seed in range(300):
 g.restock(r,random.Random(seed))
 assert not {x['id'] for x in r['shop'] if x['kind']=='artifact'}&set(GATED),seed

# One card of the archetype is enough.
for key,card in [('ojama_gang','Ojama Yellow'),('toon_world','Toon Alligator'),('legendary_shackles','Left Arm of the Forbidden One'),('archfiend_contract','Archfiend Soldier'),('all_for_one_terrorking','Terrorking Archfiend'),('necrovalley_tablet',"Gravekeeper's Spy"),('fusion_chamber','Polymerization')]:
 with_card=dict(r,pool=r['pool']+[g.BY_NAME[card]['id']])
 assert a.has_member(key,with_card) and shop_relic_eligible(with_card,key),(key,card)
# Name Changer's archetype counts for the archetype ATK relics.
assert shop_relic_eligible(dict(r,name_changes=[0xf]),'ojama_gang') and not shop_relic_eligible(dict(r,name_changes=[0xf]),'harpies_of_a_feather')
# Relics outside the family are never gated.
assert shop_relic_eligible(r,'dragon') and shop_relic_eligible(r,'battle_proficiency')
print(f'PASS {len(GATED)} archetype relics need a matching card in the pool; shops (300) and Relic Picker follow it; Name Changer counts')
