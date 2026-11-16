"""Randomized cards in a run (user, 2026-11-15): the Random Pack, the Absolute Random relic and Copycat's Randomizer
loadout. randomizer.py makes the cards; this module keeps the ones a run owns or can be offered.

Randomized cards last for the run that made them (the user chose run-only). The run stores them compressed under
run['random_cards'], so a saved run comes back with exactly the same cards, and load_run registers them in g.BY_ID
before it checks the pool. They never join g.CARDS or g.BY_NAME: their names are borrowed from real cards, and every
shop, pack and lookup by name must keep finding the real ones.

A "bundle" is a card with the cards it needs to work: a Ritual Monster and its Ritual Spell, Exodia and its pieces, a
Destiny Board and its letters, the Sarcophagus pieces and their monster, Huge Revolution's three monsters. Packs and
shop singles always hand out whole bundles, so a pulled card is never missing its other half.

Copycat's Randomizer loadout makes RANDOMIZER_POOL cards when the run starts ("Randomizing cards" screen), and every
pack and single in its shop comes from them. Other runs make 9 new cards whenever they open a Random Pack."""
import base64, json, random, uuid, zlib
import campaign as g
import randomizer

RANDOM_PACK='RANDOM-PACK'
PACK_INFO=dict(id=RANDOM_PACK,name='Random Pack',region='EN',code='RANDOM',date='',image='',common=[],rare=[],size=9,
 rarities={},rare_display=[],shop_only=True,randomized=True)
PACK_SIZE=9
RANDOMIZER_POOL=1000
# How often a normal shop puts a Random Pack in one of its random pack slots (not in Tag).
SHOP_CHANCE=.05  # 1 in 20 normal shops (user, 2026-11-15; was 1 in 5)
VERSION=1

_cards={}        # id -> randomizer card dict for the run in memory
_key=None        # run['random_cards']['key'] of the cards in _cards
_client=None     # cached client_cards() result

def is_random(cid):
 return isinstance(cid,int) and randomizer.FIRST_ID<=cid<randomizer.FIRST_ID+10_000_000

def _encode(cards):
 return base64.b64encode(zlib.compress(json.dumps(cards,separators=(',',':')).encode('utf8'),6)).decode('ascii')

def _decode(blob):
 return json.loads(zlib.decompress(base64.b64decode(blob)).decode('utf8')) if blob else []

def _clean(card):
 # The parts that make the card; its text, script and engine row are rebuilt from them.
 return {k:v for k,v in card.items() if k not in ('log','strings')}

def _register(cards):
 global _client
 for card in cards:
  card.setdefault('strings',randomizer._strings(card))
  _cards[card['id']]=card
  g.BY_ID[card['id']]=randomizer.as_game_card(card)['card']
 _client=None

def uninstall():
 global _key,_client
 for cid in list(_cards):
  if g.BY_ID.get(cid,{}).get('randomized') is not None:g.BY_ID.pop(cid,None)
 _cards.clear();_key=None;_client=None

def install(run):
 """Register the run's randomized cards (called before a loaded run's pool is checked)."""
 global _key
 store=run.get('random_cards') if isinstance(run,dict) else None
 if not store:
  if _key is not None:uninstall()
  return
 if store.get('key')==_key and len(_cards)==store.get('count',len(_cards)):return
 uninstall()
 _register(_decode(store.get('blob')))
 _key=store.get('key')

def _store(run,rng=random):
 """The run's randomized-card store, made on first use (the cards of any other run are unregistered)."""
 global _key
 store=run.get('random_cards')
 if not store:
  uninstall()
  store=run['random_cards']=dict(version=VERSION,key=uuid.uuid4().hex,next=randomizer.FIRST_ID,count=0,blob='',bundles=None)
  _key=store['key']
 elif store.get('key')!=_key:install(run)
 return store

def _save_cards(run):
 store=run['random_cards']
 store['blob']=_encode([_clean(c) for c in sorted(_cards.values(),key=lambda c:c['id'])]);store['count']=len(_cards)

def _make_bundles(run,count_cards,rng):
 """New bundles totalling exactly count_cards cards, registered and saved in the run."""
 store=_store(run,rng)
 counter=iter(range(store['next'],store['next']+10_000_000))
 used=set(c['name_from'] for c in _cards.values())|set(c['art_from'] for c in _cards.values())
 bundles=[];made=0;last=store['next']
 for _ in range(count_cards*40):
  if made>=count_cards:break
  batch_ids=[]
  def next_id():
   value=next(counter);batch_ids.append(value);return value
  batch=randomizer.make_card(random.Random(rng.random()),next_id,used)
  last=max(batch_ids)+1
  if made+len(batch)>count_cards:continue
  _register(batch);bundles.append([c['id'] for c in batch]);made+=len(batch)
 store['next']=last
 _save_cards(run)
 return bundles

def start_pool(run,rng=random,size=RANDOMIZER_POOL):
 """Copycat's Randomizer: the run's pre-made cards. Packs and shop singles come from these bundles."""
 _store(run,rng)
 run['random_cards']['bundles']=_make_bundles(run,size,rng)

def has_pool(run):
 return bool((run.get('random_cards') or {}).get('bundles'))

def _from_pool(run,count_cards,rng):
 # Whole bundles from the run's pool, no bundle twice in one pack; the same card can turn up again in later packs,
 # like a real booster.
 bundles=list(run['random_cards']['bundles']);rng.shuffle(bundles)
 out=[]
 for bundle in bundles:
  if len(out)+len(bundle)<=count_cards:out+=bundle
  if len(out)==count_cards:break
 return out

def open_pack(run,rng=random):
 """The 9 card ids of a Random Pack."""
 if run.get('history_mode')=='tag':return tag_pack(run,rng)
 if has_pool(run):return _from_pool(run,PACK_SIZE,rng)
 return sum(_make_bundles(run,PACK_SIZE,rng),[])

def shop_singles(run,count,rng=random):
 """Shop singles for the Randomizer loadout: each is a whole bundle, sold as its main card."""
 bundles=list(run['random_cards']['bundles']) if has_pool(run) else _make_bundles(run,count*2,rng)
 return rng.sample(bundles,min(count,len(bundles)))

def bundle_of(run,cid):
 store=run.get('random_cards') or {}
 for bundle in store.get('bundles') or ():
  if bundle[0]==cid:return list(bundle)
 return [cid]

def client_key(run):
 store=(run or {}).get('random_cards')
 return f"{store['key']}:{store.get('count',0)}" if store else ''

def client_cards():
 """Every registered randomized card as the client needs it: the content entry, the engine row and the Lua script."""
 global _client
 if _client is None:
  _client=[dict(card=game['card'],script=game['script']) for game in (randomizer.as_game_card(c) for c in sorted(_cards.values(),key=lambda c:c['id']))]
 return _client

# Draft Duels (user, 2026-11-16): the rooms Worker deals a seed per Random Pack booster, and both players' devices build
# the same nine cards from it. Booster k of seat s numbers its cards from DRAFT_FIRST + s*DRAFT_SEAT + k*DRAFT_BLOCK
# (collector-rules.js randomBlock). They belong to no run, so nothing here is registered or saved.
DRAFT_FIRST=199_000_000;DRAFT_SEAT=1_000_000;DRAFT_BLOCK=1_000

def draft_booster(seed,first):
 """The 9 randomized cards of one draft booster, as randomizer card dicts (whole bundles, ids inside the block)."""
 rng=random.Random(int(seed));counter=iter(range(first,first+DRAFT_BLOCK));used=set();out=[]
 for _ in range(PACK_SIZE*40):
  if len(out)>=PACK_SIZE:break
  try:batch=randomizer.make_card(random.Random(rng.random()),lambda:next(counter),used)
  except StopIteration:break
  if len(out)+len(batch)>PACK_SIZE:continue
  out+=batch
 for card in out:card.setdefault('strings',randomizer._strings(card))
 return out

def draft_cards(value):
 """value: {'players': [[seed, ...] per seat]}. Each booster's card ids, and every card as the client needs it."""
 boosters=[];cards=[]
 for seat,seeds in enumerate(value.get('players') or []):
  ids=[]
  for k,seed in enumerate((seeds or [])[:DRAFT_SEAT//DRAFT_BLOCK]):
   made=draft_booster(seed,DRAFT_FIRST+seat*DRAFT_SEAT+k*DRAFT_BLOCK)
   ids.append([c['id'] for c in made])
   cards+=[dict(card=game['card'],script=game['script']) for game in (randomizer.as_game_card(c) for c in made)]
  boosters.append(ids)
 return {'boosters':boosters,'cards':cards}

# Tag (user, 2026-11-16): the host's campaign rolls a seed per Random Pack and keeps it in that player's run
# (run['random_boosters']); both devices build the cards from the seeds with draft_booster, in the same seat blocks as
# Draft Duels (run['tag_seat']). The cards are registered in g.BY_ID only, never in a run's own store, and are rebuilt
# from the seeds whenever a Tag campaign is restored (install_tag).
def _register_shared(cards):
 for card in cards:g.BY_ID[card['id']]=randomizer.as_game_card(card)['card']

def tag_pack(run,rng=random):
 seeds=run.setdefault('random_boosters',[]);seat=int(run.get('tag_seat',0));k=len(seeds)
 if k>=DRAFT_SEAT//DRAFT_BLOCK:raise ValueError('Too many Random Packs in this run.')
 seed=rng.getrandbits(32);seeds.append(seed)
 cards=draft_booster(seed,DRAFT_FIRST+seat*DRAFT_SEAT+k*DRAFT_BLOCK);_register_shared(cards)
 return [c['id'] for c in cards]

def install_tag(runs):
 """Registers every Random Pack card of a Tag campaign's two runs (after a restore or a reload)."""
 for seat,run in enumerate(runs):
  for k,seed in enumerate(run.get('random_boosters') or ()):
   _register_shared(draft_booster(seed,DRAFT_FIRST+seat*DRAFT_SEAT+k*DRAFT_BLOCK))

def free_pack(run,rng=random):
 """Absolute Random: one free Random Pack per copy after each victory. Returns the packs for the client to open."""
 import approved_relics as ar
 copies=ar.copies(run,'absolute_random')
 packs=[]
 for _ in range(copies):
  cards=open_pack(run,rng);run['pool'].extend(cards);packs.append(dict(id=RANDOM_PACK,cards=cards))
 return packs
