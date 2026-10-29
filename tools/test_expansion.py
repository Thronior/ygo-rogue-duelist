import sys,random,tempfile,json,uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,cursed_relics
from content import *
base=ROOT/'temp'/('tests-'+uuid.uuid4().hex);base.mkdir();storage.ROOT=base
g.SAVE=base/'run.json';g.RUNTIME=base/'runtime';g.RUNTIME.mkdir()
p=storage.profile();p['unlocked']=list(range(len(CHARACTERS)));storage.write(base/'profile.json',p)
assert len(ARTIFACTS)>=36
assert len(PLAYABLE_IDS)==36
assert all(c.get('copycat') or c.get('random_packs') or c.get('engine_deck') or c['pack'] in PACK_BY_ID for c in CHARACTERS)
for i in PLAYABLE_IDS:
 c=CHARACTERS[i]
 assert all(n in g.BY_NAME for n in c['cards']),(i,c)
 for seed in range(20):
  r=g.new_run(i,random.Random(seed));g.auto_deck(r)
  assert not g.validate(r),(c['name'],seed,g.validate(r))
for pack in PACKS:
 # The card era was extended to May 29, 2005 in v0.1.61 (docs/CONTENT-EXPANSION-2005.md). Character
 # draft packs and merged collections (e.g. JP-LEC) carry no release date.
 assert (pack.get('date') or '')<='2005-05-29' and (pack.get('date') or pack['id'].startswith('DRAFT-') or pack['id'] in PACK_ALIASES.values()),pack['id']
 assert all(cid in g.BY_ID for cid in pack['common']+pack['rare'])
for opponent in GAME_DECKS:
 for rd in [0,3,7,11]:
  deck=g.opponent_deck(rd,random.Random(1),opponent)
  assert 20<=len(deck)<=60 and max(__import__('collections').Counter(deck).values())<=3
  if rd>0:assert __import__('collections').Counter(deck)==__import__('collections').Counter(__import__('encounters').adapt(opponent_record(rd,opponent),rd,g.BY_ID,g.BY_NAME))
  if rd==0:
   monsters=[g.BY_ID[c] for c in deck if g.BY_ID[c]['data']['type']&1]
   assert all(c['atk']<=1100 and c['defense']<=900 and c['data']['type']&16 for c in monsters)
   assert any(g.BY_ID[c]['data']['type']&4 for c in deck)
r=g.new_run(0,random.Random(8));g.auto_deck(r)
# The deck minimum now rises by 10 after each boss (approved_relics.minimum); this run buys nothing, so
# top the collection up with vanilla monsters before each duel.
filler=[c['id'] for c in g.CARDS if c['data']['type']==0x11 and c['level']<=4][:30]
for rd in range(9):
 if g.validate(r):r['pool']+=[cid for cid in filler for _ in range(2)];g.auto_deck(r)
 g.prepare_duel(r,random.Random(rd));assert len(r['curses'])==(min(3,(rd+1)//3) if (rd+1)%3==0 else 0)
 if (rd+1)%3==0:
  curses=r['curses'][:];g.prepare_duel(r);assert r['curses']==curses
 result=dict(protocol=1,id=r['duel']['id'],winner=0,lp=6500,events=[])
 g.finish_duel(r,result)
 assert r['curses']==[]
 assert r['lp']==(8000 if (rd+1)%3==0 else 6500)
 try:g.finish_duel(r,result);raise AssertionError('duplicate accepted')
 except ValueError:pass
 # Boss wins now open a mandatory cursed-relic offer; the shop is stocked once one is chosen.
 if cursed_relics.pending(r):cursed_relics.choose(r,r['cursed_offer']['options'][0],random.Random(rd))
 if rd<8:
  # Five-choice encounters (2026-10-02) narrow to the single boss before each boss duel; shops stock
  # ten singles (plus relic bonus stock) and three boosters (four with Booster Shelf).
  assert r['stage']=='shop' and len(r['routes'])==(1 if (rd+2)%3==0 else 5),(rd,r['routes'])
  assert sum(x['kind']=='single' for x in r['shop'])>=10
  assert sum(x['kind']=='pack' for x in r['shop'])>=3
assert r['stage']=='complete'
assert 3 in storage.profile()['unlocked']
g.save(r);g.save(r);g.SAVE.write_text('{broken',encoding='utf8');assert g.load_run()['stage']=='complete'
r=g.new_run(1);g.auto_deck(r);g.prepare_duel(r);g.finish_duel(r,dict(protocol=1,id=r['duel']['id'],winner=1,lp=0,events=[]));assert r['stage']=='gameover'
for loop,expect in [(0,{2:1,5:2,8:3}),(1,{2:4,5:5,8:6})]:
 r=g.new_run(0,random.Random(11));g.auto_deck(r)
 if loop:r['loop']=loop
 for rd,n in expect.items():
  r.update(stage='shop',round=rd);r['pool']+=[cid for cid in filler for _ in range(2)];g.auto_deck(r);g.routes(r,random.Random(rd));r['opponent']=r['routes'][0];g.prepare_duel(r,random.Random(rd))
  assert len(r['curses'])==n and all(c in CURSES for c in r['curses']),(loop,rd,r['curses'])
r=g.new_run(0);r['stage']='shop';r['gold']=999;r['bias']='Dragon';g.restock(r);before=r['gold'];item=r['shop'][0];g.buy(r,0);assert r['gold']==before-item['price'] and r['purchased']==1
try:g.buy(r,0);raise AssertionError('double buy')
except ValueError:pass
print('PASS: all character drafts, era pools, decks, nine victories, boss curses, duplicate protection, purchases, loss, backup recovery and unlocks')
