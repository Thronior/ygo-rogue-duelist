"""Every opponent can be met in a duel of its tier (user, 2026-11-26: Yami Marik's Tier 3 deck never showed up in CPU
Stats). Duels 7 and 8 used only six duelists plus the Tier 3-only opponents, and the top-up from the whole roster stopped
running once those passed five, so most duelists' Tier 3 decks were never played. The final boss keeps its own list."""
import sys,random
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import campaign as g,content

def met(rounds,loop=0,seeds=120):
    seen=set()
    for seed in range(seeds):
        run=g.new_run(0,random.Random(seed));run['loop']=loop
        for rd in rounds:
            run['round']=rd;run['defeated_opponents']=[];run.pop('boss_plan',None)
            g.routes(run,random.Random(seed*17+rd+loop*100));seen|=set(run['routes'])
    return seen

checks=0
for name,rounds,loop,deck_round in (('Tier 1',(1,2),0,1),('Tier 2',(3,4,5),0,3),('Tier 3',(6,7),0,6),('Tier 4',(0,1,3,4,6,7),1,0)):
    eligible=set(content.eligible_opponents(deck_round,loop))-{0}
    missing=sorted(eligible-met(rounds,loop))
    assert not missing,(name,'never offered:',missing);checks+=1
late=met((6,7))
assert 11 in late,'Yami Marik can be met in duels 7 and 8';checks+=1
final=met((8,))
assert final<=set([0,1,6,15,17,27])|set(content.TIER_EXCLUSIVE_OPPONENTS),('the final boss keeps its own list',sorted(final));checks+=1
print(f'PASS tier opponents ({checks} checks): every opponent of Tiers 1-4 is offered at its tier; the final boss list is unchanged')
