"""Starter decks are only offered when the player can pay for them (user, 2026-11-19).

The deck still rolls, so an unaffordable one leaves an identical shop minus the deck: no stand-in, no other odds moved.
Checked for a new stock, a reroll (the coins left after paying for it), discounts, Blood Toll (LP) and the Tag shop
(the team's shared coins, held by the host's run that rolls the stock)."""
import sys,random,tempfile
from copy import deepcopy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,content as c
storage.ROOT=Path(tempfile.mkdtemp(dir=ROOT/'temp',prefix='deck-afford-'));g.SAVE=storage.ROOT/'run.json'
profile=storage.profile();profile['unlocked']=list(c.PLAYABLE_IDS);storage.write(storage.ROOT/'profile.json',profile)

base=g.new_run(0,random.Random(4));g.auto_deck(base);base.update(stage='shop',round=5,gold=5000,gold_leaving_shop=10000)  # past archetype_relics.EARLY_SHOPS, whose relic weights read coins
decks=lambda r:[x for x in r['shop'] if x['kind']=='deck']
def stock(gold,seed,general=False,**extra):
 r=deepcopy(base);r.update(gold=gold,**extra);g.restock(r,random.Random(seed),general_stock=general);return r
def strip(r):return [(x['kind'],x['id'],x['price']) for x in r['shop'] if x['kind']!='deck']

# 1. New stock: same seed, rich and poor; the poor shop is the rich one without its deck.
hits=0
for seed in range(400):
 rich=stock(5000,seed)
 if not decks(rich):continue
 hits+=1;price=decks(rich)[0]['price']
 poor=stock(price-1,seed);exact=stock(price,seed)
 assert not decks(poor),(seed,price)
 assert strip(poor)==strip(rich),f'seed {seed}: an unaffordable deck changed the rest of the shop'
 assert len(poor['shop'])==len(rich['shop'])-1,'nothing takes the deck\'s place'
 assert decks(exact) and decks(exact)[0]['id']==decks(rich)[0]['id'],'exactly enough coins still shows the deck'
assert hits>=30,hits
# Without a deck roll, coins change nothing.
for seed in range(60):
 if not decks(stock(5000,seed)):assert stock(5000,seed)['shop']==stock(0,seed)['shop']

# 2. Discounts and price relics: the check uses the deck's final price.
for relic in ('bargain','cursed_wounded_merchant'):
 seed=next(s for s in range(400) if decks(stock(5000,s,artifacts=base['artifacts']+[relic])))
 price=decks(stock(5000,seed,artifacts=base['artifacts']+[relic]))[0]['price']
 assert price<200,(relic,price)
 assert decks(stock(price,seed,artifacts=base['artifacts']+[relic])) and not decks(stock(price-1,seed,artifacts=base['artifacts']+[relic])),relic

# 3. Reroll: the coins left after paying for the reroll must cover the deck.
seed=next(s for s in range(400) if decks(stock(5000,s,general=True)))
price=decks(stock(5000,seed,general=True))[0]['price']
def reroll(gold):
 r=deepcopy(base);r.update(gold=gold,shop_rerolls=0);cost=g.reroll_price(r);g.reroll_shop(r,random.Random(seed));return r,cost
cost=reroll(5000)[1];assert cost>0
ok,_=reroll(price+cost);short,_=reroll(price+cost-1)
assert decks(ok) and ok['gold']==price,'a deck the player can buy after the reroll is offered'
assert not decks(short) and short['gold']==price-1,'a deck the reroll leaves the player unable to buy is not offered'
assert strip(ok)==strip(short)

# 4. Blood Toll pays in LP (10 per coin, keeping 1 LP); coins do not count.
toll=base['artifacts']+['cursed_blood_toll']
seed=next(s for s in range(400) if decks(stock(0,s,artifacts=toll,lp=99999)))
price=decks(stock(0,seed,artifacts=toll,lp=99999))[0]['price']
assert decks(stock(0,seed,artifacts=toll,lp=10*price+1))
assert not decks(stock(99999,seed,artifacts=toll,lp=10*price))

# 5. Tag: one shared purse. The host's run rolls the shared shop with the team's coins (sync copies them to both seats),
# and both carts are paid from those coins together.
from tag_campaign import TagCampaign
s=TagCampaign([0,1],[profile,profile],seed=5)
for r in s.players:r.update(opponent=2,stage='shop',gold_leaving_shop=10000)
s.shared['round']=5
s.phase='shop';host=s.players[0]
def tag_stock(gold,seed):
 s.shared['gold']=gold;s.sync();assert host['gold']==s.players[1]['gold']==gold
 with s.scope(0):g.restock(host,random.Random(seed))
 return deepcopy(host)
seed=next(x for x in range(400) if decks(tag_stock(5000,x)))
price=decks(tag_stock(5000,seed))[0]['price']
assert decks(tag_stock(price,seed)) and not decks(tag_stock(price-1,seed))
assert strip(tag_stock(price,seed))==strip(tag_stock(price-1,seed))
print(f'PASS starter decks need the coins: {hits} deck rolls hidden when short with the rest of the shop unchanged; discounts, reroll cost, Blood Toll LP and Tag shared coins checked')
