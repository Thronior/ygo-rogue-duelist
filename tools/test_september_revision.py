"""Isolated campaign regressions; never opens or rewrites the player's save."""
import sys,json,random,uuid
from pathlib import Path
from collections import Counter
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,content as c,storage,loss_reason,passives
base=ROOT/'temp'/('sept-'+uuid.uuid4().hex);base.mkdir();storage.ROOT=base;g.SAVE=base/'run.json';g.RUNTIME=base/'runtime';g.RUNTIME.mkdir()
p=storage.profile();p.update(unlock_all=True,unlocked=c.PLAYABLE_IDS);storage.write(base/'profile.json',p)
# All starts have legal drafts and retain unique fixed boosters.
# Since v0.1.37 a start is two copies of the character's own draft pack plus shared core sets, so only
# the signature pack must be unique. v0.2.2 merged packs with identical contents (MERGED_PACK_ALIASES),
# which deliberately gives Yami Yugi and Yugi Muto the same signature pack.
seen=set();merged=set(c.MERGED_PACK_ALIASES.values())
for i in c.PLAYABLE_IDS:
 ch=c.CHARACTERS[i]
 if not ch.get('random_packs') and not ch.get('copycat') and not ch.get('engine_deck'):
  packs=c.starting_packs(i);assert len(packs)==4 and packs[0]==packs[1] and all(p in c.PACK_BY_ID for p in packs),(i,packs)
  assert packs[0] not in seen or packs[0] in merged,(i,packs);seen.add(packs[0])
 for seed in range(5):
  r=g.new_run(i,random.Random(seed));g.auto_deck(r);assert g.validate(r) is None,(i,seed)
# Unlock graph must be reachable from the two original characters.
reachable={0,1};others=set(c.PLAYABLE_IDS)-reachable
for _ in c.PLAYABLE_IDS:
 for i in list(others):
  k,_=g.unlock_rule(i)
  if not k.startswith('won_as:') or int(k.split(':')[1]) in reachable:reachable.add(i);others.remove(i)
assert not others
# data/character-progression.json has always mixed win-as unlocks with achievement unlocks (17 of 34
# since the initial import), so the old ">80% won_as" ratio never held; check each rule is well formed.
rules=[g.unlock_rule(i) for i in c.PLAYABLE_IDS if i>1]
assert sum(k.startswith('won_as:') for k,_ in rules)>=len(rules)//2 and all(t>0 and g.unlock_text(i) for i,(k,t) in zip([i for i in c.PLAYABLE_IDS if i>1],rules))
# Rare offers keep the opponent booster and cost exactly 200.
r=g.new_run(0,random.Random(4));g.auto_deck(r);r.update(stage='shop',gold=1000,gold_leaving_shop=10000)
for seed in range(100):
 g.restock(r,random.Random(seed))
 offers=[(i,x) for i,x in enumerate(r['shop']) if x['kind']=='deck']
 if offers:break
assert offers and sum(x['kind']=='pack' and x.get('opponent_pack',False) for x in r['shop'])==1
idx,item=offers[0];assert item['price']==200;r['card_mods']={'0':[50,50]};r['golden_card']=r['pool'][0]
arts=r['artifacts'][:];gold=r['gold'];cards=item['cards'][:];pool=r['pool'][:];chosen=g.deck(r);mods=dict(r['card_mods']);golden=r['golden_card'];g.buy_many(r,[idx],random.Random(1))
# Since v0.1.37 starter decks are additive purchases: the cards join the collection and the current deck,
# card modifications and Golden Card stay (the old "replacement deck" wipe was removed on purpose).
assert r['pool']==pool+cards and g.deck(r)==chosen and r['gold']==gold-200 and r['artifacts']==arts and r['card_mods']==mods and r.get('golden_card')==golden
assert g.validate(r) is None
# New reward semantics.
r['artifacts']=['underdog_clause'];r['pool']=[g.BY_NAME['Petit Dragon']['id']]*3;r['selected']=[0,1,2]
tally,total=g.rewards(r,[]);assert tally["Underdog's Clause"]==9
fast=g.rewards(r,[{'kind':'duel_metrics','turns':2}])[1];slow=g.rewards(r,[{'kind':'duel_metrics','turns':12}])[1];assert fast>slow
# Every NPC ritual spell has its ritual monster and copy limits are respected.
for i in c.GAME_DECKS:
 for rd in (1,3,6):
  d=c.opponent_record(rd,i);counts=Counter(d['main'])
  assert all(n<=3 for cid,n in counts.items())
  for cid,n in counts.items():
   card=g.BY_ID[cid]
   if card['data']['type']&2 and card['data']['type']&128:
    target=[m for m in g.CARDS if m['data']['type']&1 and m['data']['type']&128 and m['name'] in card['desc']]
    # Opponent decks are now handmade .ydk lists (e.g. Noah tier 3 is a user-requested exact list with
    # 2 Shinato's Ark and 1 Shinato), so ratios are the author's choice; the ritual monster must be present.
    assert target and counts[target[0]['id']]>=1,(i,rd,card['name'])
   if card['data']['type']&0x400000:assert counts[g.BY_NAME['Toon World']['id']]
# Every standard/special engine reason renders, named win cards get correct art.
for reason in loss_reason.REASONS:assert loss_reason.describe({'reason':int(reason),'events':[]},g.BY_ID)['text']
assert loss_reason.describe({'reason':16},g.BY_ID)['card']==g.BY_NAME['Exodia the Forbidden One']['id']
assert loss_reason.describe({'reason':21},g.BY_ID)['card']==g.BY_NAME['Destiny Board']['id']
# Reset must wipe the recovery copies too, while leaving settings intact.
storage.write(base/'settings.json',{'music':17});storage.reset_progress();assert storage.profile()['unlocked']==[0,1]
assert storage.read(base/'run.json') is None and storage.read(base/'run.bak') is None
assert storage.read(base/'settings.json')['music']==17
print('PASS: 175 drafts, unique signature packs, reachable unlock graph, additive rare deck purchases, quick-win/underdog rewards, NPC package checks, loss reasons and isolated progress reset')
