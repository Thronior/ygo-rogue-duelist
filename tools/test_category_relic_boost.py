"""The chosen shop category makes its relics 5x as likely after a duel; rerolls use normal weights (2026-11-04)."""
import sys,random,tempfile,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,content as c,shop_rewards as s,archetype_relics as a,cursed_relics,relic_fusions
storage.ROOT=Path(tempfile.mkdtemp(dir=ROOT/'temp',prefix='category-relics-'));g.SAVE=storage.ROOT/'run.json'
profile=storage.profile();profile['unlocked']=list(c.PLAYABLE_IDS);storage.write(storage.ROOT/'profile.json',profile)

# Every offered category maps 2+ real shop relics.
for key in s.reward_keys():
 mapped=s.category_relics(key)
 assert len(mapped)>=2,key
 for relic in mapped:
  assert relic in c.ARTIFACTS and relic not in c.RETIRED_ARTIFACTS and relic not in cursed_relics.approved() and relic not in relic_fusions.KEYS,(key,relic)
assert s.category_relics('battle')==s.category_relics('Warrior'),'retired themes follow their replacement'

r=g.new_run(1,random.Random(1));g.auto_deck(r);r.update(stage='shop',round=4,bias='Warrior')
calls=[];real=a.sample
def spy(options,count,run,rng,favored=(),favor=1):
 calls.append((set(options),frozenset(favored),favor));return real(options,count,run,rng,favored,favor)
a.sample=spy
g.restock(r,random.Random(3))
options,favored,favor=calls[-1]
assert favored==s.category_relics('Warrior') and favor==5,(favored,favor)
# No guaranteed slot: the boosted relics are drawn from the same pool as every other relic.
assert favored<=options and len(options)>len(favored)
r.update(gold=999,shop_rerolls=0)
g.reroll_shop(r,random.Random(4))
assert calls[-1][1]==frozenset(),'reroll keeps normal weights'
a.sample=real

# The boost multiplies on top of the existing weights: one Warrior relic among equals appears 5x as often.
pool=['blade','dragon','mage','wing','gear','horn','halo','bone','fang','stone','fossil']
plain=dict(r,pool=[],selected=[],artifacts=[])
def rate(favored):
 rng=random.Random(7);n=40000
 return sum(a.sample(pool,1,plain,rng,favored,s.CATEGORY_RELIC_BOOST)[0]=='blade' for _ in range(n))/n
base,boosted=rate(()),rate(frozenset({'blade'}))
assert abs(base-1/11)<0.01 and abs(boosted-5/15)<0.015,(base,boosted)

# Real shops: Warrior relics show up far more after a duel than after a reroll, but are not guaranteed.
def shown(general):
 hits=0
 for seed in range(150):
  g.restock(r,random.Random(seed),general_stock=general)
  hits+=bool({x['id'] for x in r['shop'] if x['kind']=='artifact'}&s.category_relics('Warrior'))
 return hits
duel,reroll=shown(False),shown(True)
assert duel<150 and duel>2*reroll,(duel,reroll)

# A saved shop that still holds the old guaranteed category relic loads unchanged.
r['shop'].append(dict(kind='artifact',id='blade',price=c.ARTIFACTS['blade'][1],sold=False))
g.save(r);loaded=g.load_run()
assert loaded['shop']==r['shop']
print(f'PASS {len(s.reward_keys())} categories map 2+ relics; post-duel 5x ({base:.3f}->{boosted:.3f}), reroll unboosted; Warrior relic in {duel}/150 duel shops vs {reroll}/150 rerolls; old saves load')
