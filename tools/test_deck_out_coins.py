"""Deck-out wins keep a third of the duel's coins whatever the slow duel penalty says (user, 2026-11-13)."""
import random,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage
from content import PLAYABLE_IDS
(ROOT/'temp').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='deckout-',dir=ROOT/'temp') as tmp:
 base=Path(tmp);storage.ROOT=base;g.SAVE=base/'run.json';g.RUNTIME=base/'runtime';g.RUNTIME.mkdir()
 profile=storage.profile();profile['unlocked']=list(PLAYABLE_IDS);storage.write(base/'profile.json',profile)
 rng=random.Random(4);run=g.new_run(0,rng);run.update(stage='shop',round=1,gold=0,artifacts=[],first_player=0)
 # A 40-turn stall: lots of milestones, and a slow duel penalty bigger than all of them.
 events=[{'kind':'duel_metrics','turns':30}]+[{'kind':'damage','amount':2000}]*4+[{'kind':'attack'}]*12+[{'kind':'battle_destroy'}]*8+[{'kind':'destroy'}]*5+[{'kind':'draw','amount':25}]+[{'kind':'recover','amount':3000}]
 plain,plain_total=g.rewards(run,events)
 assert plain.get('Slow duel',0)<0 and 'Deck-out win' not in plain,plain
 earned=sum(v for k,v in plain.items() if k not in ('Slow duel','Victory minimum') and v>0)
 deck,deck_total=g.rewards(run,events,2)
 assert sum(v for k,v in deck.items() if k!='Victory minimum')>=earned//3,(earned,deck)
 assert deck['Slow duel']==plain['Slow duel'],'the penalty line itself is unchanged'
 assert deck_total==earned//3>plain_total and 'Victory minimum' not in deck,(deck_total,earned,plain_total)
 # The reason also comes from the duel's own report when the caller passes none.
 again,_=g.rewards(run,events+[{'kind':'sleeve_metrics','winReason':2}])
 assert again.get('Deck-out win')==deck.get('Deck-out win'),(again,deck)
 # A small penalty that leaves more than a third untouched gives nothing back.
 short=[{'kind':'duel_metrics','turns':12}]+[{'kind':'set','card':0}]*6
 small,_=g.rewards(run,short,2)
 assert 'Deck-out win' not in small,small
 # An LP win keeps the normal penalty.
 lp,_=g.rewards(run,events,1);assert 'Deck-out win' not in lp
 print(f"PASS deck-out win: earned {earned}, LP win pays {plain_total}, deck-out pays {deck_total} (a third is {earned//3})")
