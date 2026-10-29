"""Campaign changes, copy-limit recovery and run unlocks."""
import sys,random,uuid,re,time
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,shop_rewards
from content import *
base=ROOT/'temp'/('revision-'+uuid.uuid4().hex);base.mkdir();storage.ROOT=base;g.SAVE=base/'run.json';g.RUNTIME=base/'runtime';g.RUNTIME.mkdir()
p=storage.profile();p['unlocked']=PLAYABLE_IDS;storage.write(base/'profile.json',p)
assert len(PLAYABLE_IDS)==36 and not set([25,26,27])&set(PLAYABLE_IDS)
# Mokuba's start moved from the four Tournament Packs (now one merged EN-TP4 alias) to his own draft
# pack plus shared core sets (data/character-drafts.json, reworked in v0.2.2).
r=g.new_run(24,random.Random(1));assert r['pack_ids']==starting_packs(24)==['DRAFT-MOKUBA-KAIBA','DRAFT-MOKUBA-KAIBA','EN-LOB','EN-LOD']
for pack,ids in zip(r['packs'],r['pack_ids']):assert set(pack)<=set(PACK_BY_ID[ids]['common']+PACK_BY_ID[ids]['rare'])
# Late routes use the core boss pool; tier-exclusive and UC opponents (added 2026-10-02) join it.
seen=set()
for seed in range(50):
 r=g.new_run(0,random.Random(seed));r['round']=6;g.routes(r,random.Random(seed));assert set(r['routes'])<=set([0,1,6,15,17,27])|set(TIER_EXCLUSIVE_OPPONENTS)|set(UC_OPPONENTS)
 for reward in r['route_rewards'].values():
  seen.add(reward['key']);r['bias']=reward['key'];r['shop_reward']=reward;g.restock(r,random.Random(seed))
  singles=[g.BY_ID[x['id']] for x in r['shop'] if x['kind']=='single']
  assert sum(shop_rewards.matches(c,reward['key']) for c in singles[:5])==5
  # Shops now stock three boosters (four with Booster Shelf): the tied opponent pack first, then
  # random packs, with the character's own pack in the third slot.
  packs=[x for x in r['shop'] if x['kind']=='pack'];assert 3<=len(packs)<=4 and packs[0]['id']==reward['pack'] and packs[0]['opponent_pack'] and not any(x['opponent_pack'] or x['id']==packs[0]['id'] for x in packs[1:])
assert len(seen)>=4
assert any(k in seen for k in ('DARK','LIGHT'))
for lp,expected in [(4321,6321),(6500,8000),(7900,8000),(8500,8500)]:
 r=g.new_run(0);g.auto_deck(r);r['round']=2;g.routes(r);g.prepare_duel(r)
 g.finish_duel(r,dict(protocol=1,id=r['duel']['id'],winner=0,lp=lp,events=[dict(kind='damage',amount=1700),dict(kind='summon',card=46986414)]))
 assert r['lp']==expected and r['round']==3 and not r['curses'] and r['stats']['damage_dealt']==1700
r=g.new_run(0);g.auto_deck(r);orders=[]
for seed in [1,2]:
 g.prepare_duel(r,random.Random(seed));s=(g.RUNTIME/'puzzles/shadow-run.lua').read_text();orders.append([[int(n) for n in re.findall(r'Debug.AddCard\((\d+),'+str(side)+','+str(side)+',LOCATION_DECK',s)] for side in [0,1]])
assert all(orders[0][side]!=orders[1][side] and Counter(orders[0][side])==Counter(orders[1][side]) for side in [0,1])
# Existing four-copy selections are repaired on load, without losing owned cards.
r=g.new_run(0);g.auto_deck(r);cid=g.BY_NAME['Battle Ox']['id'];r['pool'] += [cid]*4;r['selected']+=list(range(len(r['pool'])-4,len(r['pool'])));g.save(r);recovered=g.load_run()
assert len(recovered['pool'])==len(r['pool']) and Counter(g.card_identity(c) for c in g.deck(recovered))[g.card_identity(cid)]<=3
# Unlocks persist on the run itself, including purchases and final victory.
storage.write(base/'profile.json',dict(storage.profile(),unlocked=[0,1],wins=0,won_as=[],victories=0,max_gold=0,max_bought=0,max_artifacts=0))
# data/character-progression.json: character 24 unlocks at 300 coins held, character 2 by winning as Yami Yugi.
r=g.new_run(0);r['gold']=300;g.update_profile(r);assert 24 in r['unlocks_earned'] and 2 not in r['unlocks_earned'];r['stage']='complete';g.update_profile(r);assert {2,24}<=set(r['unlocks_earned'])
print('PASS: varied rewards and tied packs, 36-character roster, Mokuba draft start, capped boss healing, both deck shuffles, legacy copy repair, run unlocks/stats')
