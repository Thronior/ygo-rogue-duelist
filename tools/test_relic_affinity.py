"""Relic offers lean toward the collection without guaranteeing or hiding anything, and weighted relics ask for a face."""
import sys,random,tempfile
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,content as c,archetype_relics as a,choice_relics as cr,cursed_relics,relic_affinity as ra,passives
import approved_relics as ar
from campaign_expansion import shop_relic_eligible
storage.ROOT=Path(tempfile.mkdtemp(dir=ROOT/'temp',prefix='relic-affinity-'));g.SAVE=storage.ROOT/'run.json'
profile=storage.profile();profile['unlocked']=list(c.PLAYABLE_IDS);storage.write(storage.ROOT/'profile.json',profile)

ids=lambda *names:[g.BY_NAME[n]['id'] for n in names]
VORSE,ZOMBIE,RITUAL=ids('Vorse Raider','Armored Zombie','Black Illusion Ritual')
def run(pool):return dict(character=1,artifacts=[],round=4,pool=pool)
boost=lambda key,pool:ra.multipliers([key],run(pool))[key]

# Base chance with no matching cards, more cards mean more weight, and 3x is a hard ceiling.
assert boost('bone',[VORSE]*40)==1 and boost('bone',[])==1
steps=[boost('bone',[ZOMBIE]*n+[VORSE]*(40-n)) for n in range(0,41,2)]
assert steps==sorted(steps) and steps[0]==1 and steps[3]>steps[0] and max(steps)==3
assert boost('bone',[ZOMBIE]*40)==3
assert all(1<=v<=3 for v in ra.multipliers(list(c.ARTIFACTS),run([VORSE]*20+[ZOMBIE]*20+[RITUAL]*5)).values())
# Narrow themes reach the ceiling with fewer cards than Types do.
assert boost('ritual_vestment',[RITUAL]*4+[VORSE]*36)==3 and boost('bone',[ZOMBIE]*4+[VORSE]*36)<2
# A relic without a card requirement is untouched by the collection.
assert boost('urn',[ZOMBIE]*40)==1
assert all(key in c.ARTIFACTS for key in ra.RULES)

# Real draws: a favoured relic is at most 3x as likely, and nothing is guaranteed or locked out.
pool=[ZOMBIE]*30+[VORSE]*10;rng=random.Random(5);seen=Counter()
options=['bone','dragon','urn','eye']
for _ in range(30000):seen[a.sample(options,1,run(pool),rng)[0]]+=1
assert 2.8<seen['bone']/seen['urn']<3.2,seen
assert 0.9<seen['dragon']/seen['urn']<1.1,seen
assert all(seen[k]>2000 for k in options),seen
# Cursed offers use the same weights, still vary, and stay three different relics.
r=run(pool);r['round']=2;cursed=Counter()
target='cursed_ritual_scar'
for seed in range(1500):
 r.pop('cursed_offer',None);cursed_relics.create_offer(r,random.Random(seed))
 assert len(set(r['cursed_offer']['options']))==3
 cursed.update(r['cursed_offer']['options'])
ritual=run([RITUAL]*40);ritual['round']=2;favoured=Counter()
for seed in range(1500):
 ritual.pop('cursed_offer',None);cursed_relics.create_offer(ritual,random.Random(seed));favoured.update(ritual['cursed_offer']['options'])
assert cursed[target]>0 and 2<favoured[target]/cursed[target]<3.5,(cursed[target],favoured[target])

# Archetype relics stay locked at zero cards and unlock at one.
for key,card in [('demonic_pact','Archfiend Soldier'),('level_one','Horus the Black Flame Dragon LV4'),('level_up_relic','Horus the Black Flame Dragon LV4'),('dark_scorpion_squad','Dark Scorpion - Chick the Yellow')]:
 assert not a.has_member(key,run([VORSE]*30)),key
 assert a.has_member(key,run([VORSE]*30+ids(card))),key
 assert boost(key,[VORSE]*30+ids(card))>1,key

# Weighted relics: required choice, legal faces, cleared on sale, and only active once chosen.
live=g.new_run(1,random.Random(1));g.auto_deck(live);live.update(stage='shop',round=4,gold=500)
for key,field,kind,face,bad,share in [('weighted_coins','weighted_coin','coin',0,2,2),('weighted_dice','weighted_die','dice',6,0,3)]:
 assert shop_relic_eligible(live,key) and not shop_relic_eligible(dict(live,history_mode='tag'),key)
 assert key in c.ARTIFACTS and c.ARTIFACTS[key][1]==100
 g.acquire_relic(live,key,random.Random(1))
 assert live['weight_picks']==[key] and 'SetRogueWeight' not in passives.script(live)
 try:cr.choose_weight(live,bad);raise SystemExit('accepted an illegal face')
 except ValueError:pass
 assert live['weight_picks']==[key]
 cr.choose_weight(live,face)
 assert live[field]==face and not live['weight_picks']
 assert f"SetRogueWeight(0,'{kind}',{face},{share})" in passives.script(live)
 g.sell_relic(live,key)
 assert field not in live and 'SetRogueWeight' not in passives.script(live)
try:cr.choose_weight(live,1);raise SystemExit('accepted a choice with nothing waiting')
except ValueError:pass
# Relics are off at LVL -1, so a chosen face must not apply there.
assert 'SetRogueWeight' not in passives.script(dict(character=1,artifacts=['weighted_coins'],round=0,curses=[],weighted_coin=1,challenge_level=-1))
print('PASS collection weights stay within 1x-3x, nothing is guaranteed or hidden, archetype locks, weighted relic choices')
