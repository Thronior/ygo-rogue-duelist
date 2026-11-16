"""Every duelist and loadout walks a solo run into loop 4 (Discord, 2026-11-16: "can't get past loop 3" since v0.2.35).

v0.2.35 broke 'Start Looping' from loop 2 on: a local `import content` inside endless.challenge made `content` local to
the whole function, so the Obelisk line raised UnboundLocalError (shown as "That action could not be completed").
This walks each playable duelist, standard and alternate loadout, through every round of loops 1-4: the routes offered
each round, the opponent deck and Extra Deck behind every route (Ultimate Collector opponents included from loop 2),
Copycat's borrowed deck, then 'Start Looping' / 'Begin next loop' at the end of each loop."""
import random,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import storage,campaign as g
tmp=Path(tempfile.mkdtemp(prefix='loop4-',dir=ROOT/'temp'));storage.ROOT=tmp;g.SAVE=tmp/'run.json'
import campaign_expansion,content,endless,character_variants
from content import deck_round
p=storage.profile();p['unlocked']=list(content.PLAYABLE_IDS);p['variants_unlocked']=True;storage.write(storage.ROOT/'profile.json',p)
LOOPS=4
checks=0;uc_seen=set();failures=[]

def opponent_decks(r,rng):
 """The decks a duel against each offered route would use (prepare_duel / finish_duel / copy_deck)."""
 global checks
 for opp in r['routes']:
  r['opponent']=opp
  main=g.opponent_deck(deck_round(r),rng,opp,r.get('tutorial_variants',{}).get(str(opp),0),loop=r.get('loop',0))
  assert main,('empty opponent deck',opp)
  if deck_round(r) or r.get('loop'):content.opponent_record(deck_round(r),opp,r.get('loop',0))['extra']
  if content.copies_deck(r):g.copy_deck(r,rng);assert r['pool'] and r['copied_opponent']==opp
  if opp in content.UC_OPPONENTS:uc_seen.add(opp)
  checks+=1

for cid in content.PLAYABLE_IDS:
 for variant in (0,1):
  if variant and str(cid) not in character_variants.VARIANTS:continue
  name=f"{content.CHARACTERS[cid]['name']} v{variant}"
  rng=random.Random(cid*10+variant)
  try:
   r=g.new_run(cid,rng,variant=variant)
   for loop in range(LOOPS):
    assert r.get('loop',0)==loop,(r.get('loop'),loop)
    for rd in range(campaign_expansion.RUN_LENGTH):
     r.update(round=rd,stage='shop');g.routes(r,rng);assert r['routes'],('no routes',loop,rd)
     opponent_decks(r,rng)
     r['defeated_opponents']=sorted(set(r.get('defeated_opponents',[]))|{r['routes'][0]})
    # Loop end: 'Start Looping' (the loop challenger), its deck, then the win and 'Begin next loop'.
    r.update(round=campaign_expansion.RUN_LENGTH,stage='complete',encore_won=False)
    endless.challenge(g,r)
    assert r['encore_active'] and r['opponent']==(endless.OBELISK_ID if loop>=1 else 0)
    assert endless.encore_record(r)['main']
    r.update(stage='complete',encore_active=False,encore_won=True)
    endless.next_loop(g,r);checks+=1
   assert r['loop']==LOOPS and r['stage']=='shop' and r['routes'],(r['loop'],r['stage'])
  except Exception as e:
   import traceback;failures.append(f'{name}: {type(e).__name__}: {e}\n{traceback.format_exc(limit=3)}')

if failures:
 print('\n'.join(failures));raise SystemExit(f'FAIL {len(failures)} duelist loadouts could not reach loop {LOOPS+1}')
assert uc_seen,'no Ultimate Collector opponent was offered in loops 2-4'
print(f'PASS every duelist and loadout reaches loop {LOOPS+1} ({checks} checks, {len(uc_seen)} Ultimate Collector opponents met)')
