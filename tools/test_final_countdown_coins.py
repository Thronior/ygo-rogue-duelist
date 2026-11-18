"""Final Countdown wins (win reason 0x11, user 2026-11-18) pay at least 300 coins and never take the slow duel penalty."""
import random,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage
from content import PLAYABLE_IDS
(ROOT/'temp').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='countdown-coins-',dir=ROOT/'temp') as tmp:
 base=Path(tmp);storage.ROOT=base;g.SAVE=base/'run.json';g.RUNTIME=base/'runtime';g.RUNTIME.mkdir()
 profile=storage.profile();profile['unlocked']=list(PLAYABLE_IDS);storage.write(base/'profile.json',profile)
 rng=random.Random(4);run=g.new_run(0,rng);run.update(stage='shop',round=1,gold=0,artifacts=[],first_player=0)
 # A 40-turn stall: a big slow duel penalty.
 events=[{'kind':'duel_metrics','turns':40}]+[{'kind':'attack'}]*4
 plain,plain_total=g.rewards(run,events,1)
 assert plain.get('Slow duel',0)<0 and plain_total<300,(plain,plain_total)
 tally,total=g.rewards(run,events,0x11)
 assert total==300 and 'Slow duel' not in tally and tally['Final Countdown win']>0,(tally,total)
 # The reason also comes from the duel's own metrics, as for deck-out wins.
 _,again=g.rewards(run,events+[{'kind':'sleeve_metrics','winReason':0x11}]);assert again==300
 # Challenge level 3+ cuts the payout by a quarter; the 300 still holds.
 hard=dict(run,challenge_level=3);_,hard_total=g.rewards(hard,events,0x11);assert hard_total==300,hard_total
 # A duel that already earns more keeps it (no top-up line).
 rich=[{'kind':'duel_metrics','turns':8}]+[{'kind':'damage','amount':2000}]*4+[{'kind':'battle_destroy'}]*12+[{'kind':'destroy'}]*8
 big,big_total=g.rewards(dict(run,artifacts=['bottomless_purse','gold_sarcophagus']),rich,0x11)
 assert big_total>=300 and ('Final Countdown win' not in big or big_total==300),(big,big_total)
print('PASS Final Countdown wins: at least 300 coins, no slow duel penalty, also at challenge level 3')
