"""Silver Chalice (2026-10-29): all after-duel healing past the limit becomes 3 coins per 100 LP over."""
import sys,random,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,content as c
storage.ROOT=Path(tempfile.mkdtemp(dir=ROOT/'temp',prefix='overflow-chalice-'));g.SAVE=storage.ROOT/'run.json'
profile=storage.profile();profile['unlocked']=list(c.PLAYABLE_IDS);storage.write(storage.ROOT/'profile.json',profile)
assert '3 coins' in c.ART_INFO['chalice']['text'] if 'text' in c.ART_INFO['chalice'] else True
def win(lp,artifacts,round=1):
 r=g.new_run(1,random.Random(1));g.auto_deck(r);r.update(stage='shop',round=round,lp=lp,challenge_level=0)
 r['artifacts']=artifacts;g.routes(r);r['opponent']=r['routes'][0] if isinstance(r['routes'][0],int) else r['routes'][0]['id']
 g.prepare_duel(r,random.Random(2));gold=r['gold']
 g.finish_duel(r,dict(protocol=1,id=r['duel']['id'],winner=0,lp=lp,events=[]),random.Random(3))
 return r,r['gold']-gold
r,base=win(8000,[])
r,gained=win(7800,['chalice'])   # 200 LP fits, 400 overflows -> 12 coins
assert r['lp']==8000 and r['last_rewards'].get('Silver Chalice')==12 and gained-base==12,(r['lp'],r['last_rewards'],gained,base)
r,gained=win(5000,['chalice'])   # all 600 fits: no coins
assert r['lp']==5600 and 'Silver Chalice' not in r['last_rewards']
r,gained=win(7950,['chalice','scarab'])   # 600 + 1000 heal, 1550 over, all of it counts -> 45 coins
assert r['lp']==8000 and r['last_rewards'].get('Silver Chalice')==45,r['last_rewards']
r,gained=win(8000,['scarab'])   # no Chalice: overflow is simply lost
assert 'Silver Chalice' not in r['last_rewards']
r,gained=win(8000,['chalice'],round=2)   # boss win at full LP: the boss heal's 2000 and the Chalice's 600 -> 78 coins
assert r['last_rewards'].get('Silver Chalice')==78,r['last_rewards']
print('PASS Overflow Chalice: 3 coins per 100 LP past the limit, none when it fits, all after-duel healing counts')
