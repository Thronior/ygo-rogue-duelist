"""Beating Angry Grandpa (the shopkeeper's secret duel) is not a finished LVL -1 run: it writes no run history row,
old rows it left are removed, and it does not count toward a character's second variant (Discord, 2026-11-24: a
"completed" LVL -1 card with 8/9 wins and 11 duels)."""
import sys,tempfile,random,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import storage
(ROOT/'temp').mkdir(exist_ok=True)
storage.ROOT=Path(tempfile.mkdtemp(dir=ROOT/'temp',prefix='secret-history-'))
import campaign as g,content,secret_challenge,character_variants
g.SAVE=storage.ROOT/'run.json'
profile=storage.profile();profile['unlocked']=list(content.PLAYABLE_IDS);storage.write(storage.ROOT/'profile.json',profile)

def shop_run(seed):
 r=g.new_run(0,random.Random(seed))
 r.update(stage='shop',round=1,gold=50,lp=6400,timeline=[dict(loop=1,round=i,won=True,lp_after_healing=8000) for i in range(7)])
 g.auto_deck(r);assert g.validate(r) is None,g.validate(r)
 g.save(r);return r

def duel(secret,winner):
 g.prepare_duel(secret)
 g.finish_duel(secret,dict(protocol=1,id=secret['duel']['id'],winner=winner,lp=8000 if winner==0 else 0,reason=0,events=[]))
 secret.pop('mobile_duel',None)
 return secret_challenge.return_after_win(g,secret)

# A win: no history row, no variant.
back=duel(secret_challenge.relicless(g,shop_run(4)),0)
assert back['stage']=='shop' and not back.get('secret_challenge')
rows=storage.run_history()
assert not rows,('a won secret duel is not a run in history',rows)
assert not character_variants.unlocked(storage.profile(),0),'Grandpa does not unlock a second variant'

# A row left by an older build is removed, and never counted for the variant meanwhile.
p=storage.profile();p['run_history']=[dict(id='old:0',character=0,challenge_level=-1,round=9,result='complete',secret_challenge='relicless',started_at=time.time()),dict(id='real:0',character=0,challenge_level=0,round=9,result='complete',started_at=time.time())]
assert not character_variants.unlocked(p,0)
storage.write(storage.ROOT/'profile.json',p)
assert [r['id'] for r in storage.run_history()]==['real:0']
assert [r['id'] for r in storage.profile()['run_history']]==['real:0'],'the stale row is gone from the profile too'

# A loss still ends the run and is kept as a lost run.
lost=duel(secret_challenge.relicless(g,shop_run(9)),1)
assert lost['stage']=='gameover'
assert [r['result'] for r in storage.run_history() if r.get('secret_challenge')]==['lost']

# A real LVL -1 run still counts.
p=storage.profile();p['run_history'].append(dict(id='minus:0',character=0,challenge_level=-1,round=9,result='complete',started_at=time.time()))
assert character_variants.unlocked(p,0)
print('PASS Angry Grandpa wins leave run history and variants alone; losses and real LVL -1 runs still count')

# The "Annoy Grandpa" sleeve (Mokey Mokey Smackdown) for players who found him before the sleeve existed (v0.2.35):
# LVL -1 unlocked by beating him, or his duel in their history, grants it on the next load (bug report, 2026-11-24).
import sleeve_progress
for old in (dict(relicless_unlocked=True),dict(run_history=[dict(character=0,result='lost',secret_challenge='relicless')])):
 old.setdefault('unlocked',[0,1]);assert 'mokey-mokey-smackdown' in sleeve_progress.evaluate(old),old
assert 'mokey-mokey-smackdown' not in sleeve_progress.evaluate(dict(unlocked=[0,1])),'not without meeting him'
print('PASS Grandpa sleeve is granted to players who met him before it existed')
