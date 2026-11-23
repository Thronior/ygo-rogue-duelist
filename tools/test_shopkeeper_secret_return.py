"""Shopkeeper's secret duel (Angry Grandpa, LVL -1 rules): a win hands back the run as it was in the shop before the
challenge, relics included, and the run continues; a loss still ends it (user, 2026-11-23)."""
import sys,tempfile,random
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import storage
(ROOT/'temp').mkdir(exist_ok=True)
storage.ROOT=Path(tempfile.mkdtemp(dir=ROOT/'temp',prefix='secret-return-'))
import campaign as g,content,secret_challenge
g.SAVE=storage.ROOT/'run.json'
profile=storage.profile();profile['unlocked']=list(content.PLAYABLE_IDS);storage.write(storage.ROOT/'profile.json',profile)

def shop_run(seed):
 r=g.new_run(0,random.Random(seed))
 r.update(stage='shop',round=1,gold=123,lp=6400,artifacts=r.get('artifacts',[])+['chalice','deck_spyglass'])
 g.auto_deck(r);assert g.validate(r) is None,g.validate(r)
 g.save(r);return r

def duel(secret,winner):
 g.prepare_duel(secret)
 g.finish_duel(secret,dict(protocol=1,id=secret['duel']['id'],winner=winner,lp=8000 if winner==0 else 0,reason=0,events=[]))
 secret.pop('mobile_duel',None)
 return secret_challenge.return_after_win(g,secret)

# Win: the run from before the challenge comes back, relics, coins, LP and round untouched, still in the shop.
before=shop_run(4);relics=list(before['artifacts'])
secret=secret_challenge.relicless(g,before)
assert secret['artifacts']==[] and secret['secret_challenge']=='relicless','the secret duel is played without relics'
back=duel(secret,0)
assert not back.get('secret_challenge'),'the run is the normal run again'
assert back['stage']=='shop' and back['artifacts']==relics and back['gold']==123 and back['lp']==6400 and back['round']==1,back
saved=g.load_run()
assert saved and saved['artifacts']==relics and saved['stage']=='shop' and not saved.get('secret_challenge'),'the restored run is what is saved'
assert storage.profile().get('relicless_unlocked'),'the win still unlocks LVL -1'
# The snapshot is spent: a second hand-back of the same win does nothing.
again=dict(secret);assert secret_challenge.return_after_win(g,again) is again

# Loss: the run ends as before.
before=shop_run(9)
secret=secret_challenge.relicless(g,before)
lost=duel(secret,1)
assert lost.get('secret_challenge')=='relicless' and lost['stage']!='shop','a loss does not give the run back'

# A snapshot from another run is never handed back.
before=shop_run(11);secret=secret_challenge.relicless(g,before)
other=shop_run(12);storage.write(storage.ROOT/'before-relicless-secret-run.json',other)
assert duel(secret,0).get('secret_challenge')=='relicless','only the run this challenge was copied from comes back'
# Won before v0.2.42 (no hand-back at the time): the finished run is handed back when the game loads it (Discord 2026-11-23).
before=shop_run(13);relics=list(before['artifacts']);secret=secret_challenge.relicless(g,before)
g.prepare_duel(secret);g.finish_duel(secret,dict(protocol=1,id=secret['duel']['id'],winner=0,lp=8000,reason=0,events=[]));secret.pop('mobile_duel',None);g.save(secret)
stuck=g.load_run();assert stuck['secret_challenge']=='relicless' and stuck['stage']=='complete'
loaded=secret_challenge.return_after_win(g,stuck)
assert loaded['stage']=='shop' and loaded['artifacts']==relics and not loaded.get('secret_challenge'),'an old won secret is handed back on load'
assert g.load_run()['stage']=='shop'
print('PASS shopkeeper secret: a win continues the run with its relics, a loss ends it, old wins are handed back on load')
