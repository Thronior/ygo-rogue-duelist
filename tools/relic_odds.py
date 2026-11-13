"""Dev tool: real shop relic odds for one run setup, by simulating many restocks (user, 2026-11-13).

  python/python.exe tools/relic_odds.py --character 0 --round 1 --gold 120 --shops 5000
  python/python.exe tools/relic_odds.py --character 6 --bias warrior --top 40 --json out.json

Each restock starts from the same run (no carried-over skips) unless --chain is given, which plays consecutive stocks
without buying, so the "skipped" rule shows. Prints, per relic, the chance it is offered in a shop and in the first two
(weighted) slots, plus how much of the offer goes to relics with and without weight givers. Never touches saves/.
"""
import argparse,copy,json,random,sys,tempfile
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))

def main():
 ap=argparse.ArgumentParser(description=__doc__.split('\n')[0])
 ap.add_argument('--character',type=int,default=0);ap.add_argument('--round',type=int,default=1)
 ap.add_argument('--gold',type=int,default=150);ap.add_argument('--shops',type=int,default=3000)
 ap.add_argument('--bias',default=None,help='shop category key chosen after the duel (favours its relics)')
 ap.add_argument('--artifacts',default='',help='comma-separated relics the run already owns')
 ap.add_argument('--reroll',action='store_true',help='simulate rerolls (general stock, no category favour)')
 ap.add_argument('--chain',action='store_true',help='consecutive stocks without buying, so skipped relics stay damped')
 ap.add_argument('--top',type=int,default=30);ap.add_argument('--seed',type=int,default=1);ap.add_argument('--json')
 a=ap.parse_args()
 import campaign as g,storage,archetype_relics as arc
 from content import ARTIFACTS,PLAYABLE_IDS
 (ROOT/'temp').mkdir(exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='relic-odds-',dir=ROOT/'temp') as tmp:
  base=Path(tmp);storage.ROOT=base;g.SAVE=base/'run.json';g.RUNTIME=base/'runtime';g.RUNTIME.mkdir()
  profile=storage.profile();profile['unlocked']=list(PLAYABLE_IDS);storage.write(base/'profile.json',profile)
  rng=random.Random(a.seed);run=g.new_run(a.character,rng)
  # Weights read the Deck only, so build the run's usual Deck first.
  if len(run.get('selected',[]))<20:g.auto_deck(run)
  run.update(stage='shop',round=a.round,gold=a.gold,artifacts=[x for x in a.artifacts.split(',') if x])
  if a.bias:run['bias']=a.bias
  offered,weighted,shops=Counter(),Counter(),0
  current=copy.deepcopy(run)
  for _ in range(a.shops):
   r=current if a.chain else copy.deepcopy(run)
   g.restock(r,rng,general_stock=a.reroll);shops+=1
   relics=[x['id'] for x in r['shop'] if x['kind']=='artifact']
   offered.update(relics);weighted.update(relics[:arc.WEIGHTED_SHOP_SLOTS])
  probe=offer_split(run,arc)
  rows=sorted(offered,key=lambda k:-offered[k])
  print(f"{shops} shops, character {a.character}, round {a.round}, {a.gold} coins, bias {a.bias or '-'}{', rerolls' if a.reroll else ''}")
  print(f"{'relic':28} {'any slot':>9} {'slots 1-2':>9}  giver")
  for k in rows[:a.top]:print(f"{ARTIFACTS[k][0][:28]:28} {offered[k]/shops:9.1%} {weighted[k]/shops:9.1%}  {'yes' if probe.get(k) else ''}")
  total=sum(offered.values());plain=sum(v for k,v in offered.items() if not probe.get(k))
  print(f"\n{len(offered)} different relics offered; relics without weight givers got {plain/total:.1%} of all relic slots "
        f"({sum(1 for k in offered if not probe.get(k))} of {len(offered)} relics)")
  if a.json:Path(a.json).write_text(json.dumps({'shops':shops,'offered':offered,'weighted':weighted},indent=1),encoding='utf8')

def offer_split(run,arc):
 """{relic: has a weight giver} for every relic the shop could offer this run (falls back to all relics on old code)."""
 from content import ARTIFACTS
 if hasattr(arc,'offer_weights'):return {k:v[2] for k,v in arc.offer_weights(list(ARTIFACTS),run).items()}
 import relic_affinity,shop_rewards
 mapped=set().union(*shop_rewards.CATEGORY_RELICS.values())
 return {k:(k in relic_affinity.RULES or arc.member_test(k,run) is not None or k in mapped) for k in ARTIFACTS}

if __name__=='__main__':main()
