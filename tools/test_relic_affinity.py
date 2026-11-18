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
matches=lambda key,pool:ra.details([key],run(pool))[key][1]

# details (2026-11-18): whether a relic has a card rule, and how many Deck cards match it (its best weight group).
assert ra.details(['urn'],run([ZOMBIE]*40))['urn']==(False,0),'a relic without a card rule'
assert matches('bone',[VORSE]*40)==0 and matches('bone',[ZOMBIE]*6+[VORSE]*34)==6
assert all(key in c.ARTIFACTS for key in ra.RULES)
# Family relics (user, 2026-11-18): FAMILY_BASE with no Deck cards, FAMILY_PER_CARD more for every matching one, capped.
AMAZONESS=[x['id'] for x in g.CARDS if x['name'].startswith('Amazoness') and x['data']['type']&1][:4]
fam=lambda pool:a.offer_weights(['amazoness_standard'],run(pool))['amazoness_standard'][0]
assert fam([VORSE]*30)==a.FAMILY_BASE and fam(AMAZONESS[:1]+[VORSE]*29)==a.FAMILY_BASE+a.FAMILY_PER_CARD
assert fam(AMAZONESS*10)==a.FAMILY_CAP,'capped'
# A Yes mark on an owned card outside the Deck counts as MARK_YES_COPIES; marks on cards you do not own count nothing.
marked=dict(run([VORSE]*30),pool=[VORSE]*30+AMAZONESS[:1],card_marks={str(AMAZONESS[0]):1})
assert a.offer_weights(['amazoness_standard'],marked)['amazoness_standard'][0]==a.FAMILY_BASE+a.FAMILY_PER_CARD*ra.MARK_YES_COPIES
unowned=dict(run([VORSE]*30),card_marks={str(AMAZONESS[0]):1})
assert a.offer_weights(['amazoness_standard'],unowned)['amazoness_standard'][0]==a.FAMILY_BASE
# No more Attribute hold-back: owning one Attribute relic leaves the others at 1.
assert a.offer_weights(['earth'],dict(run([VORSE]*30),artifacts=['dark']))['earth'][0]==1.0
# Real draws (offer weights, 2026-11-13): Bone (all Zombies) at its ceiling, Dragon with no Dragons x0.4, Eye (a shop-category
# relic, not favoured now) x1, and Urn, which nothing can boost, takes their average, so boosts move odds between relics
# that care about the deck instead of away from plain ones.
pool=[ZOMBIE]*30+[VORSE]*10;rng=random.Random(5);seen=Counter()
options=['bone','dragon','urn','eye']
for _ in range(30000):seen[a.sample(options,1,run(pool),rng)[0]]+=1
# Since 2026-11-14 the Deck works through theme chances, not multipliers. Zombies are 75% of the Deck's monsters, so the
# Zombie theme aims at 18.75%; with 4 options Bone is already offered more often than that, so the roll adds nothing and
# Bone, Eye and Urn all count 1, Dragon (no Dragons) x0.4.
near=lambda x,want:abs(x/want-1)<0.08
assert near(seen['bone']/seen['urn'],1),seen
assert near(seen['eye']/seen['urn'],1),seen
assert near(seen['dragon']/seen['urn'],a.DEAD_RELIC),seen
assert all(seen[k]>1000 for k in options),seen
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
# Ritual Scar: its Ritual theme's chance with a Ritual deck, x0.4 in a deck without Rituals (still offered).
assert cursed[target]>0 and favoured[target]>3*cursed[target],(cursed[target],favoured[target])

# Archetype relics stay locked at zero cards and unlock at one.
for key,card in [('demonic_pact','Archfiend Soldier'),('level_one','Horus the Black Flame Dragon LV4'),('level_up_relic','Horus the Black Flame Dragon LV4'),('dark_scorpion_squad','Dark Scorpion - Chick the Yellow')]:
 assert not a.has_member(key,run([VORSE]*30)),key
 assert a.has_member(key,run([VORSE]*30+ids(card))),key
 assert matches(key,[VORSE]*30+ids(card))>0,key

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
print('PASS deck matches, family weights per card, owned-only marks, no Attribute hold-back, archetype locks, weighted relic choices')
# Owning a relic no longer ends its theme (user, 2026-11-17): with Let's Go Gambling owned, the gambling theme still
# offers Weighted Coins, and Let's Go Gambling itself leaves the theme.
_coin=[c['id'] for c in g.CARDS if 'coin' in ra.card_tags(c)][:12]
_ch=ra.theme_chances({'pool':_coin,'selected':list(range(len(_coin))),'artifacts':['lets_go_gambling']})
assert any('weighted_coins' in v[1] and 'lets_go_gambling' not in v[1] and v[0]>=.25 for v in _ch.values()),_ch
print('PASS an owned relic leaves its theme; the rest keep its chance')
