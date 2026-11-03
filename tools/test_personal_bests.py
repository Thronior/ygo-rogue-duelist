"""Personal bests on the reward screen (2026-11-03): a first win only sets the records, later wins can beat them."""
import random,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import campaign as g,content as c,storage
storage.ROOT=Path(tempfile.mkdtemp(dir=ROOT/'temp',prefix='personal-bests-'));g.SAVE=storage.ROOT/'run.json'
profile=storage.profile();profile['unlocked']=list(c.PLAYABLE_IDS);storage.write(storage.ROOT/'profile.json',profile)

def duel(hit,winner=0):
 run=g.new_run(1,random.Random(1));g.auto_deck(run);run.update(stage='shop',round=1,lp=8000,challenge_level=0,artifacts=[]);g.routes(run);run['opponent']=run['routes'][0]
 g.prepare_duel(run,random.Random(2))
 g.finish_duel(run,dict(protocol=1,id=run['duel']['id'],winner=winner,lp=8000 if winner==0 else 0,events=[{'kind':'damage','amount':hit},{'kind':'damage','amount':100}]),random.Random(3))
 return run

first=duel(3000)
assert first['personal_bests']==[],'nothing to beat on the first win'
p=storage.profile();assert p['best_hit']==3000 and p['best_payout']==first['last_gold']>0

same=duel(3000)
assert same['personal_bests']==[],'a tie is not a new best'

better=duel(4000)
assert 'New biggest hit!' in better['personal_bests'],better['personal_bests']
assert storage.profile()['best_hit']==4000

p=storage.profile();p['best_payout']=1;storage.write(storage.ROOT/'profile.json',p)
assert 'New best payout!' in duel(1000)['personal_bests']
assert storage.profile()['best_hit']==4000,'a smaller hit keeps the record'

lost=duel(9000,winner=1)
assert lost['personal_bests']==[] and storage.profile()['best_hit']==4000,'only wins count'
print('PASS personal bests: first win silent, ties ignored, new bests shown, losses ignored')
