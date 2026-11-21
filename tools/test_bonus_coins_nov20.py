"""Duel-end coin bonuses agreed on Discord (user, 2026-11-20).
Exodia wins (win reason 0x10, CITYDRIVER) are paid like Final Countdown wins: no slow duel penalty and at least 150 coins,
also at challenge level 3+. 'Beat them with their own monster' (jerichoholic) pays 15 coins (hidden since 2026-11-20, duel_rewards.SECRET) on a win when the battle damage
that ended the duel came from a monster the opponent owns (sleeve_metrics stolenFinish, android/test_stolen_finish_nov20.mjs)."""
import random,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,duel_rewards
from content import PLAYABLE_IDS
STOLEN='Beat them with their own monster'
(ROOT/'temp').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='bonus-coins-',dir=ROOT/'temp') as tmp:
 base=Path(tmp);storage.ROOT=base;g.SAVE=base/'run.json';g.RUNTIME=base/'runtime';g.RUNTIME.mkdir()
 profile=storage.profile();profile['unlocked']=list(PLAYABLE_IDS);storage.write(base/'profile.json',profile)
 rng=random.Random(4);run=g.new_run(0,rng);run.update(stage='shop',round=1,gold=0,artifacts=[],first_player=0)

 # Exodia: a 40-turn stall would pay little after the slow duel penalty.
 events=[{'kind':'duel_metrics','turns':40}]+[{'kind':'attack'}]*4
 plain,plain_total=g.rewards(run,events,1)
 assert plain.get('Slow duel',0)<0 and plain_total<150,(plain,plain_total)
 tally,total=g.rewards(run,events,0x10)
 assert total==150 and 'Slow duel' not in tally and tally['Exodia win']>0 and 'Final Countdown win' not in tally,(tally,total)
 # The reason also comes from the duel's own metrics.
 _,again=g.rewards(run,events+[{'kind':'sleeve_metrics','winReason':0x10}]);assert again==150,again
 # Challenge level 3+ cuts the payout by a quarter; the 150 still holds.
 hard=dict(run,challenge_level=3);_,hard_total=g.rewards(hard,events,0x10);assert hard_total==150,hard_total
 # A duel that already earns more keeps it (no top-up line).
 rich=[{'kind':'duel_metrics','turns':8}]+[{'kind':'damage','amount':2000}]*4+[{'kind':'battle_destroy'}]*12+[{'kind':'destroy'}]*8
 big,big_total=g.rewards(run,rich,0x10)
 assert big_total>150 and 'Exodia win' not in big,(big,big_total)
 # Final Countdown keeps its own 300 floor.
 fc,fc_total=g.rewards(run,events,0x11);assert fc_total==300 and 'Exodia win' not in fc and fc['Final Countdown win']>0,(fc,fc_total)

 # Beat them with their own monster: a victory-only battle bonus rule.
 rule=[r for r in duel_rewards.RULES if r[2]==STOLEN]
 assert rule==[('stolen_finish',1,STOLEN,15)] and 'stolen_finish' in duel_rewards.VICTORY_ONLY,rule
 short=[{'kind':'duel_metrics','turns':6}]
 finish=lambda stolen,reason=1:short+[{'kind':'sleeve_metrics','stolenFinish':stolen,'winReason':reason}]
 tally,total=g.rewards(run,finish(True),1);base_tally,base_total=g.rewards(run,finish(False),1)
 assert tally[STOLEN]==15 and STOLEN not in base_tally and total-base_total==15,(tally,base_tally)
 # Only the blow that won: a stolen hit earlier in a duel won by a card effect does not count.
 assert STOLEN not in g.rewards(run,finish(True,0x10),0x10)[0]
 # A summary without the win reason (older Tag events) still counts.
 assert g.rewards(run,short+[{'kind':'sleeve_metrics','stolenFinish':True}],1)[0][STOLEN]==15
 # The in-duel bonus list shows it only at victory, like the other victory-only rules.
 assert STOLEN not in duel_rewards.progress(run,finish(True),g.BY_ID,victory=False)
 assert duel_rewards.progress(run,finish(True),g.BY_ID,victory=True)[STOLEN]==15
print('PASS Nov 20 coin bonuses: Exodia wins pay at least 150 without the slow duel penalty, own-monster finish +15')
