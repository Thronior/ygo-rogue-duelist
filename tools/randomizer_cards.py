"""Writes randomized cards as JSON for the engine test and the preview image (dev tool, 2026-11-15).
  python tools/randomizer_cards.py showcase <out.json> [seed]   one of every frame and sub-type (12 cards)
  python tools/randomizer_cards.py demo <out.json> [seed]   the 9-card preview: one of each monster frame, 2 Spells, 2 Traps
  python tools/randomizer_cards.py fuzz <out.json> <count> [seed]   <count> fully random cards for the engine test
  python tools/randomizer_cards.py random <out.json> <count> [seed]   exactly <count> random cards (a Ritual pair counts as 2)
  python tools/randomizer_cards.py blocks <out.json> <per block> [seed] [block ...]   <per block> cards for each named block
      (all unique-mechanic blocks when none are named): the block's weight is raised so it is rolled, nothing else changes"""
import json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import randomizer as R

mode,out=sys.argv[1],Path(sys.argv[2])
if mode=='showcase':
 # One of every frame and sub-type (user, Nov 15): 12 cards, the Ritual Monster bringing its Ritual Spell.
 seed=int(sys.argv[3]) if len(sys.argv)>3 else 20261115
 plan=[('monster','normal'),('monster','effect'),('monster','fusion'),('monster','ritual'),('spell','Normal'),('spell','Quick-Play'),
  ('spell','Continuous'),('spell','Field'),('trap','Normal'),('trap','Continuous'),('trap','Counter')]
elif mode=='demo':
 seed=int(sys.argv[3]) if len(sys.argv)>3 else 20261115
 # Every frame once (a Ritual Monster brings its Ritual Spell), the rest of each kind rolled.
 plan=[('monster','effect'),('monster','normal'),('monster','fusion'),('monster','ritual'),('spell',None),('spell',None),('trap',None),('trap',None)]
elif mode=='blocks':
 per=int(sys.argv[3]);seed=int(sys.argv[4]) if len(sys.argv)>4 else 1
 keys=sys.argv[5:] or list(R.UNIQUE_ACTS)+list(R.UNIQUE_RULES)+['curse_damage','coin_heads','battle_damage','sent_gy','destroyed_by_opp','sent_by_opp','end_phase','targeted_st','opp_turn','lp_gap','gy_cards','kills','discard_spell']
 plan=[]
else:
 count=int(sys.argv[3]);seed=int(sys.argv[4]) if len(sys.argv)>4 else 1
 plan=[(None,None)]*count
made=[]
if mode=='blocks':
 # Each block in turn gets a huge weight, so cards that can hold it roll it; a card counts once the block survived
 # the rules. Companion cards (Ritual Spells, set pieces) come along.
 import random
 rng=random.Random(seed);ids=iter(range(R.FIRST_ID,R.FIRST_ID+900000));used=set();saved=dict(R.BLOCK_WEIGHTS)
 for key in keys:
  R.BLOCK_WEIGHTS.clear();R.BLOCK_WEIGHTS.update(saved);R.BLOCK_WEIGHTS[key]=10000
  got=0
  for _ in range(3000):
   batch=R.make_card(random.Random(rng.random()),lambda:next(ids),used)
   if any(p['k']==key for c in batch[:1] for cat in R.CATEGORIES for p in c['parts'][cat]):made+=batch;got+=1
   if got>=per:break
  print(f'{key}: {got}')
 R.BLOCK_WEIGHTS.clear();R.BLOCK_WEIGHTS.update(saved)
if mode=='blocks':pass
elif mode=='random':
 # Exactly <count> fully random cards. A Ritual Monster brings its Ritual Spell, so when only one slot is left
 # the last card is rolled again until it is not a Ritual Monster.
 import random
 rng=random.Random(seed);ids=iter(range(R.FIRST_ID,R.FIRST_ID+100000));used=set()
 while len(made)<count:
  try_rng=random.Random(rng.random())
  batch=R.make_card(try_rng,lambda:next(ids),used)
  if len(made)+len(batch)<=count:made+=batch
else:
 made=R.make_cards(seed,[(k or R.pick(__import__('random').Random(f'{seed}-{i}'),R.KIND_WEIGHTS),s) for i,(k,s) in enumerate(plan)])
cards=[]
for c in made:
 game=R.as_game_card(c)
 cards.append({**game,'parts':c['parts'],'log':c['log'],'slot':c['slot']})
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps({'seed':seed,'cards':cards},ensure_ascii=False,indent=1),encoding='utf8')
print(f'{len(cards)} cards -> {out}')
