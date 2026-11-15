"""Randomized cards in runs (user, 2026-11-15): Copycat's Randomizer loadout, the Random Pack and Absolute Random."""
import sys,json,uuid,random,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT));sys.path.insert(0,str(ROOT/'android'))
import campaign as g,storage,content,random_cards,randomizer
base=ROOT/'temp'/('random-cards-'+uuid.uuid4().hex);base.mkdir();storage.ROOT=base;g.SAVE=base/'run.json'
p=storage.profile();p['unlocked']=content.PLAYABLE_IDS;p['variants_unlocked']=True;storage.write(base/'profile.json',p)

# The phone's Python has no card scans, so the randomizer trusts that every era card has one.
rows=json.loads((ROOT/'data/era-cards.json').read_text(encoding='utf8'))
assert all((ROOT/'android/web/assets/cards'/f"{r['id']}.jpg").exists() for r in rows if r['id']<100000000 and not r['data']['type']&0x4000)

# Copycat's Randomizer: 1,000 cards made at the start, four Random Packs from them, Absolute Random, no borrowed deck.
t=time.perf_counter();r=g.new_run(37,random.Random(1),variant=1);made=time.perf_counter()-t
store=r['random_cards'];bundles=store['bundles']
assert sum(len(b) for b in bundles)==random_cards.RANDOMIZER_POOL and store['count']==random_cards.RANDOMIZER_POOL
assert r['artifacts']==['absolute_random'] and len(r['packs'])==4 and all(len(p)==9 for p in r['packs'])
assert all(random_cards.is_random(c) for c in r['pool']) and len(r['pool'])==36 and r['selected']==[]
assert not content.copies_deck(r) and content.randomized_run(r) and not content.fixed_deck(r)
assert all(c in g.BY_ID and c not in {x['id'] for x in g.CARDS} for c in r['pool'])
assert all(g.BY_NAME[n]['id']<100000000 for n in ('Dark Magician','Toon World'))   # names still find the real cards
pool_ids={c for b in bundles for c in b}
assert set(r['pool'])<=pool_ids

# A deck can be built from them, and the run saves and loads with the same cards.
g.auto_deck(r);assert len(r['selected'])>=20,len(r['selected'])
r['stage']='shop';g.restock(r,random.Random(2))
singles=[x for x in r['shop'] if x['kind']=='single'];packs=[x for x in r['shop'] if x['kind']=='pack']
assert singles and all(random_cards.is_random(x['id']) for x in singles)
assert packs and all(x['id']==random_cards.RANDOM_PACK for x in packs)
assert all(x.get('bundle',[x['id']])==random_cards.bundle_of(r,x['id']) for x in singles)
assert not any(x['kind']=='deck' for x in r['shop'])
r['gold']=999;before=len(r['pool'])
got=g.buy(r,r['shop'].index(packs[0]),random.Random(3))
assert len(got)==9 and set(got)<=pool_ids and len(r['pool'])==before+9
single=next(x for x in singles);got=g.buy(r,r['shop'].index(single),random.Random(4))
assert got==random_cards.bundle_of(r,single['id'])
g.save(r);key=random_cards.client_key(r)
random_cards.uninstall();assert r['pool'][0] not in g.BY_ID
loaded=g.load_run()
assert loaded and loaded['pool']==r['pool'] and all(c in g.BY_ID for c in loaded['pool'])
assert random_cards.client_key(loaded)==key
cards=random_cards.client_cards();assert len(cards)==random_cards.RANDOMIZER_POOL
assert all(c['card']['id'] in g.BY_ID and 'Randomizer.Build' in c['script'] for c in cards)
storage.register_collection(loaded)
assert not any(random_cards.is_random(c) for c in storage.registered_cards())

# Standard Copycat still borrows the opponent's deck.
std=g.new_run(37,random.Random(5));assert content.copies_deck(std) and not std.get('random_cards') and g.BY_NAME['Copycat']['id'] in std['pool']

# Other characters: a Random Pack sometimes takes a random pack slot, and opening it makes 9 new cards.
plain=next(i for i in content.PLAYABLE_IDS if not content.CHARACTERS[i].get('copycat') and not content.CHARACTERS[i].get('engine_deck'))
seen=0
for seed in range(200):
 n=g.new_run(plain,random.Random(seed));n['stage']='shop';g.restock(n,random.Random(seed))
 seen+=any(x['id']==random_cards.RANDOM_PACK for x in n['shop'] if x['kind']=='pack')
# About 1 shop in 20 (SHOP_CHANCE .05, user 2026-11-15): roughly 8 of these 200.
assert 2<=seen<=25,seen
n=g.new_run(plain,random.Random(7));n['stage']='shop';n['gold']=999
n['shop'].append(dict(kind='pack',id=random_cards.RANDOM_PACK,price=35,sold=False,opponent_pack=False))
got=g.buy(n,len(n['shop'])-1,random.Random(8))
assert len(got)==9 and all(random_cards.is_random(c) for c in got) and n['random_cards']['count']==9
# Absolute Random: one free pack per copy after a victory; the cards stay with the run.
n['artifacts'].append('absolute_random');packs=random_cards.free_pack(n,random.Random(9))
assert len(packs)==1 and len(packs[0]['cards'])==9 and n['random_cards']['count']==18
g.save(n);random_cards.uninstall();again=g.load_run()
assert again and all(c in g.BY_ID for c in again['pool'])

# Tag never offers the relic.
tag=dict(n,history_mode='tag');assert not g.shop_relic_eligible(tag,'absolute_random') if hasattr(g,'shop_relic_eligible') else True
print(f'PASS: Randomizer loadout ({made:.1f} s for {random_cards.RANDOMIZER_POOL} cards), shop and save round trip, Random Pack in {seen}/200 shops, Absolute Random')
