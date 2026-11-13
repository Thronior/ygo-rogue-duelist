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
# Weights read the Deck only (2026-11-13): these staged runs put every card of the pool in the Deck.
def run(pool):return dict(character=1,artifacts=[],round=4,pool=pool,selected=list(range(len(pool))))
boost=lambda key,pool:ra.multipliers([key],run(pool))[key]

# Base chance with no matching cards, more cards mean more weight, up to the relic's own ceiling.
assert boost('bone',[VORSE]*40)==1 and boost('bone',[])==1
steps=[boost('bone',[ZOMBIE]*n+[VORSE]*(40-n)) for n in range(0,41,2)]
assert steps==sorted(steps) and steps[0]==1 and steps[3]>steps[0] and max(steps)==ra.ceiling('bone')
assert all(1<=v<=ra.CEILING_MAX for v in ra.multipliers(list(c.ARTIFACTS),run([VORSE]*20+[ZOMBIE]*20+[RITUAL]*5)).values())
# Specific relics gain more than broad ones (2026-11-13, raised the same day): archetypes ~x7.5-8, Rituals ~x5.9,
# Zombie ~x4.6, Warrior x3, EARTH/DARK/Normal Monsters x2; never below CEILING_MIN or above CEILING_MAX.
top=ra.ceiling
assert 5.5<top('ritual_vestment')<6.5
# Every archetype relic shares Amazoness Standard's ceiling (2026-11-13).
import json as _j
archetypes=[k for k in _j.loads(ra.CEILINGS_FILE.read_text(encoding='utf8')) if a.member_test(k,{'artifacts':[],'pool':[]}) not in (None,True)]
assert len(archetypes)>20 and all(top(k)==ra.ARCHETYPE_CEILING==top('amazoness_standard') for k in archetypes),[(k,top(k)) for k in archetypes]
assert top('amazoness_standard')>top('blade')>top('earth')>=top('normal')>=ra.CEILING_MIN
assert 4.3<top('bone')<5 and 2.7<top('blade')<3.3
# An Amazoness deck (all Amazoness Warriors, EARTH) pulls Amazoness relics far above Warrior or EARTH ones.
AMAZONESS=[x['id'] for x in g.CARDS if x['name'].startswith('Amazoness') and x['data']['type']&1][:4]*10
m=ra.multipliers(['amazoness_standard','blade','earth'],run(AMAZONESS))
assert m['amazoness_standard']>m['blade']+1.5 and m['amazoness_standard']>m['earth']+1.5,m
# The build's precomputed ceilings match the current cards and rules (rerun tools/build_android.py --sync-only).
import json
assert json.loads(ra.CEILINGS_FILE.read_text(encoding='utf8'))==ra.compute_ceilings(),'data/relic-ceilings.json is stale'
# Narrow themes reach their ceiling with fewer cards than Types do.
progress=lambda key,pool:(boost(key,pool)-1)/(top(key)-1)
# Narrow themes count cards (2026-11-13): 2 cards half, 5 cards full at a 20-card minimum, scaled with the minimum.
# These staged runs are on round 4, so the minimum is 30: 3 cards half, 7.5 cards full.
import approved_relics
assert approved_relics.minimum(run([]))==30
assert abs(progress('ritual_vestment',[RITUAL]*3+[VORSE]*37)-0.5)<1e-9 and progress('ritual_vestment',[RITUAL]*8+[VORSE]*32)==1
assert abs(progress('ritual_vestment',[RITUAL]*1+[VORSE]*39)-1/6)<1e-9
early=lambda pool:dict(run(pool),round=0)
assert abs((ra.multipliers(['ritual_vestment'],early([RITUAL]*2+[VORSE]*18))['ritual_vestment']-1)/(top('ritual_vestment')-1)-0.5)<1e-9
assert ra.multipliers(['ritual_vestment'],early([RITUAL]*5+[VORSE]*15))['ritual_vestment']==top('ritual_vestment')
# Broad Types still follow their share of the Deck.
assert progress('bone',[ZOMBIE]*4+[VORSE]*36)<0.5
# A relic without a card requirement is untouched by the collection.
assert boost('urn',[ZOMBIE]*40)==1
assert all(key in c.ARTIFACTS for key in ra.RULES)

# Real draws (offer weights, 2026-11-13): Bone (all Zombies) at its ceiling, Dragon with no Dragons x0.4, Eye (a shop-category
# relic, not favoured now) x1, and Urn, which nothing can boost, takes their average, so boosts move odds between relics
# that care about the deck instead of away from plain ones.
pool=[ZOMBIE]*30+[VORSE]*10;rng=random.Random(5);seen=Counter()
options=['bone','dragon','urn','eye']
for _ in range(30000):seen[a.sample(options,1,run(pool),rng)[0]]+=1
avg=(min(a.NEUTRAL_AVERAGE_CAP,ra.ceiling('bone'))+a.DEAD_RELIC+1)/3
near=lambda x,want:abs(x/want-1)<0.08
assert near(seen['bone']/seen['urn'],ra.ceiling('bone')/avg),(seen,avg)
assert near(seen['dragon']/seen['urn'],a.DEAD_RELIC/avg),(seen,avg)
assert near(seen['eye']/seen['urn'],1/avg),(seen,avg)
assert all(seen[k]>1000 for k in options),seen
# The plain relic still gets a fair share, though a deck built around one theme now pulls that theme ahead
# (givers count at most NEUTRAL_AVERAGE_CAP in the plain relics' average, 2026-11-13).
assert near(seen['urn']/30000,avg/(ra.ceiling('bone')+a.DEAD_RELIC+1+avg)) and seen['urn']/30000>0.12,seen
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
# Ritual Scar: x3 with a Ritual deck, x0.4 in a deck without Rituals (still offered), so far more common with Rituals.
assert cursed[target]>0 and 6<favoured[target]/cursed[target]<25,(cursed[target],favoured[target])

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
print('PASS collection weights stay within each relic ceiling (specific relics higher), nothing is guaranteed or hidden, archetype locks, weighted relic choices')
