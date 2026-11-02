"""Deck Assembler, the second Dueling Engine loadout: a Structure Deck start, whole decks as rewards, relics only."""
import sys,json,random,tempfile
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path[:0]=[str(ROOT),str(ROOT/'android')]
import campaign as g,content as c,storage,reward_slots,cursed_relics,approved_relics as ar,campaign_expansion,character_variants as variants
base=Path(tempfile.mkdtemp(prefix='assembler-',dir=ROOT/'temp'));storage.ROOT=base;g.SAVE=base/'run.json';g.RUNTIME=base/'runtime';(g.RUNTIME/'puzzles').mkdir(parents=True)
import mobile_backend as backend
from tag_campaign import TagCampaign
ENGINE=next(i for i,row in enumerate(c.CHARACTERS) if row.get('engine_deck'))
decks={d['id']:d for d in json.loads((ROOT/'data/preconstructed.json').read_text(encoding='utf8'))['decks']}
structure={k for k,d in decks.items() if d['name'].startswith('Structure Deck')}
offered=set(decks)-{'SB99','SBTH'}

def raises(call,text):
 try:call()
 except ValueError as error:
  assert text in str(error),error
  return
 raise AssertionError('accepted: '+text)

def profile(level):
 p=storage.profile();p['unlocked']=list(c.PLAYABLE_IDS);p['character_levels']={str(ENGINE):level};storage.write(base/'profile.json',p);return p

def win(run,rng,accept=True):
 if not run.get('opponent') in run['routes']:run['opponent']=run['routes'][0]
 request=g.prepare_duel(run,rng)
 g.finish_duel(run,dict(protocol=1,id=request['id'],winner=0,lp=8000,reason=0,events=[]),rng)
 if run.get('cursed_offer'):cursed_relics.choose(run,run['cursed_offer']['options'][0],rng)
 if accept:reward_slots.accept(run,0)

# The variant follows the shared unlock and starts from one Structure Deck, editable and complete.
profile(1);raises(lambda:g.new_run(ENGINE,random.Random(1),0,1),'Beat Challenge')
profile(2)
assert c.CHARACTERS[ENGINE]['alternate']['name']=='Deck Assembler' and not c.CHARACTERS[ENGINE]['alternate'].get('starting_packs')
seen=set()
for seed in range(120):
 r=g.new_run(ENGINE,random.Random(seed),0,1)
 deck=decks[r['engine_deck']];seen.add(deck['id'])
 assert deck['id'] in structure and Counter(r['pool'])==Counter(deck['cards']),deck['id']
 assert r['selected']==list(range(len(r['pool']))) and r['guaranteed']==[] and r['packs']==[] and r['artifacts']==[]
 assert r['stage']=='draft' and r['variant_name']=='Deck Assembler' and r['assembled_decks']==[deck['id']]
 assert not c.fixed_deck(r) and g.validate(r) is None
assert seen==structure,structure-seen
standard=g.new_run(ENGINE,random.Random(1));assert c.fixed_deck(standard) and standard['variant']==0
print('PASS',len(seen),'Structure Decks start complete, legal and editable behind the shared variant unlock')

# Choosing opponents and starting duels keeps his deck; Standard still re-rolls until its first reward.
r=g.new_run(ENGINE,random.Random(2),0,1);pool=r['pool'][:];first=r['engine_deck']
for seed in range(20):g.engine_deck(r,random.Random(seed))
r['opponent']=r['routes'][1];win(r,random.Random(3),accept=False)
assert r['pool']==pool and r['engine_deck']==first
print('PASS the starting deck is rolled once')

# A victory offers a whole deck, and no opponent card, which joins the pool on confirmation.
offer=r['reward_slots'];assert offer['kind']=='deck' and offer['pending'] and len(offer['choices'])==1
assert r['last_reward_cards']==[] and r['last_reward_card'] is None and r['pool']==pool
choice=offer['choices'][0];assert choice['id'] in offered-{first} and choice['sprite']=='decks/'+decks[choice['id']]['art']+'.jpg'
selected=r['selected'][:];raises(lambda:g.prepare_duel(r,random.Random(4)),'Choose your reward deck')
reward_slots.accept(r,0)
assert Counter(r['pool'][len(pool):])==Counter(decks[choice['id']]['cards']) and r['pool'][:len(pool)]==pool
assert r['selected']==selected and r['new_cards_from']==len(pool) and not offer['pending'] and 'source' not in offer
assert r['assembled_decks']==[first,choice['id']] and r['engine_deck']==first
reward_slots.accept(r,0);assert len(r['assembled_decks'])==2
print('PASS a victory adds the full',choice['name'],'list and leaves the current deck alone')

# A full run: one new deck per win, bosses included, and the normal rising deck minimum.
r=g.new_run(ENGINE,random.Random(5),0,1);rng=random.Random(6);minimums=[]
for duel in range(9):
 minimums.append(ar.minimum(r));win(r,rng)
assert r['stage']=='complete' and r['round']==9 and len(set(r['assembled_decks']))==10
assert Counter(r['pool'])==sum((Counter(decks[k]['cards']) for k in r['assembled_decks']),Counter())
assert minimums==[20,20,20,30,30,30,40,40,40],minimums
assert r.get('card_purchases',0)==0 and r['purchased']==0
print('PASS full run ends with',len(r['pool']),'cards from 10 different decks')

# Repeats only come back once every deck has been received; several offers and rerolls stay distinct.
r=g.new_run(ENGINE,random.Random(7),0,1);r['duel']={'id':'x'};r['stage']='shop'
r['assembled_decks']=sorted(offered-{'KA','SK2'})
reward_slots.prepare_decks(r,3,random.Random(8))
assert sorted(d['id'] for d in r['reward_slots']['choices'])==['KA','SK2']
r['assembled_decks']=sorted(offered)
reward_slots.prepare_decks(r,1,random.Random(8));assert r['reward_slots']['choices'][0]['id'] in offered
r['assembled_decks']=[r['engine_deck']]
for seed in range(40):
 reward_slots.prepare_decks(r,3,random.Random(seed))
 ids=[d['id'] for d in r['reward_slots']['choices']];assert len(set(ids))==3 and r['engine_deck'] not in ids
 r['gold']=100;reward_slots.reroll(r,1,random.Random(seed))
 after=[d['id'] for d in r['reward_slots']['choices']]
 assert after[0]==ids[0] and after[2]==ids[2] and after[1] not in ids and r['gold']==85,(ids,after)
print('PASS no repeat until all',len(offered),'decks are owned, and rerolls always change the deck')

# Reward relics add deck choices, not extra decks.
r=g.new_run(ENGINE,random.Random(9),0,1);r['artifacts']=['satchel'];pool=r['pool'][:]
win(r,random.Random(10),accept=False)
assert len(r['reward_slots']['choices'])==2 and r['pool']==pool
reward_slots.accept(r,1);assert len(r['pool'])==len(pool)+len(decks[r['assembled_decks'][-1]]['cards'])
print('PASS Travel Satchel adds a deck choice')

# The shop stays relics-only, on every path that could sell him cards.
r=g.new_run(ENGINE,random.Random(11),0,1);win(r,random.Random(12));r['gold']=5000
assert r['stage']=='shop'
for seed in range(200):
 g.restock(r,random.Random(seed));assert not [x for x in r['shop'] if x['kind']=='deck']
pool=r['pool'][:]
for i,item in enumerate(r['shop']):
 if item['kind']!='artifact':
  raises(lambda:g.buy(r,i,random.Random(1)),'can only buy relics');raises(lambda:g.buy_many(r,[i],random.Random(1)),'can only buy relics')
assert {x['kind'] for x in r['shop']}>={'single','pack','artifact'} and r['pool']==pool and r['gold']==5000
relic=next(i for i,x in enumerate(r['shop']) if x['kind']=='artifact');key=r['shop'][relic]['id']
g.buy(r,relic,random.Random(1));assert key in r['artifacts'] and r['shop'][relic]['sold']
fixed=dict(r,variant=0)
eligible=campaign_expansion.shop_relic_eligible
assert eligible(r,'deck_thinning') and not eligible(fixed,'deck_thinning')
for key in ('card_picker','stamp','booster_shelf','receipt'):assert not eligible(r,key) and not eligible(fixed,key),key
assert not ar.eligible(r,'cursed_cursed_refund') and not ar.eligible(r,'cursed_black_market_seal')
print('PASS packs, singles and decks are refused; relics are sold, with Deck Thinning his one addition')

# He edits his own deck, and Auto-build stays legal when the pool holds many copies.
def send(action,value=None):return json.loads(backend.dispatch(json.dumps(dict(action=action,value=value))))
backend.run=g.new_run(ENGINE,random.Random(13),0,1);r=backend.run
cid=r['pool'][0];r['pool']=[cid]*8+r['pool'];r['selected']=[];r['guaranteed']=[]
send('toggle',8);assert r['selected']==[8]
send('deselect-all');assert r['selected']==[]
send('auto');main=[g.card_identity(i) for i in g.deck(r)]
assert max(Counter(main).values())<=3 and len(main)>=ar.minimum(r) and g.validate(r) is None
backend.run=g.new_run(ENGINE,random.Random(13));r=backend.run;before=r['selected'][:]
raises(lambda:send('toggle',0),'fixed deck');raises(lambda:send('deselect-all'),'fixed deck');send('auto');assert r['selected']==before
print('PASS the variant edits and auto-builds; Standard stays read-only')

# Saves from before this change: Standard runs, with or without a variant field, keep every old rule.
def saved(run,slot):
 run=json.loads(json.dumps(run));run.pop('_save_slot',None);storage.write(storage.run_path(slot),run);return g.load_run(slot)
old=g.new_run(ENGINE,random.Random(14));win(old,random.Random(15),accept=False);assert old['reward_slots']['choices'][0].get('id') is None
del old['variant'],old['variant_name'],old['pack_ids']
r=saved(old,1)
assert r and c.fixed_deck(r) and ar.minimum(r)==20 and r['reward_slots']['pending']
reward_slots.accept(r,0);assert r['engine_reward_selected'] and r['engine_deck'].startswith('opponent:') and r['selected']==list(range(len(r['pool'])))
new=g.new_run(ENGINE,random.Random(16),0,1);win(new,random.Random(17),accept=False)
r=saved(new,2);assert r['variant']==1 and r['reward_slots']['pending']
pool=len(r['pool']);reward_slots.accept(r,0);assert len(r['pool'])>pool
print('PASS old Standard saves, including a pending deck choice, and saved Deck Assembler runs load')

# Tag: an editable deck and trading, a relic-only shop and the same deck rewards.
p=profile(2)
t=TagCampaign([ENGINE,0],[p,p],seed=5,variants=[1,0]);r=t.players[0]
assert r['variant']==1 and t.trade_view(0)['available']
t.apply(0,'deck',r['selected'][:25]);assert len(r['selected'])==25
t.apply(0,'auto',None);assert g.validate(r) is None
locked=TagCampaign([ENGINE,0],[p,p],seed=5)
assert not locked.trade_view(0)['available'];raises(lambda:locked.apply(0,'deck',[0]),'fixed deck')
t.apply(0,'choose',r['routes'][0]);t.apply(1,'auto',None);t.apply(1,'choose',t.players[1]['routes'][1])
t.ready=[True,False];t.apply(1,'ready',None);assert t.phase=='duel'
pool=len(r['pool']);t.finish(0,6000,[]);assert r['reward_slots']['kind']=='deck'
t.apply(0,'reward-accept',0);assert len(r['pool'])>pool
i=next(i for i,x in enumerate(r['shop']) if x['kind']!='artifact');raises(lambda:t.apply(0,'buy',[i]),'can only buy relics')
print('PASS Tag keeps the variant deck editable, its deck rewards and its relic-only shop')
print('PASS Deck Assembler')
