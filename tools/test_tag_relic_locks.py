"""Tag relic locks (user, 2026-11-13): either player locks a relic in the shared shop; it stays through rerolls for both."""
import sys,uuid,tempfile,json,random
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import storage,content,campaign as game
(ROOT/'temp').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='tag-relic-locks-',dir=ROOT/'temp') as tmp:
 storage.ROOT=Path(tmp);game.SAVE=Path(tmp)/'run.json'
 from tag_campaign import TagCampaign
 p=storage.profile();p['unlocked']=list(range(len(content.CHARACTERS)))
 s=TagCampaign([0,1],[p,p],seed=21)
 for r in s.players:game.auto_deck(r)
 s.phase='shop';s.shared['gold']=99999
 for r in s.players:r.update(opponent=2,stage='shop')
 with s.scope(0):game.restock(s.players[0],s.rng)
 s.shared['shop']=s.players[0]['shop'];s.sync()
 def cmd(seat,action,value=None):return s.command(seat,{'id':uuid.uuid4().hex,'revision':s.revision,'action':action,'value':value})
 relics=lambda seat:[x['id'] for x in s.view(seat)['run']['shop'] if x['kind']=='artifact']
 index=next(i for i,x in enumerate(s.shared['shop']) if x['kind']=='artifact');key=s.shared['shop'][index]['id']
 assert cmd(1,'relic-lock',index)['result']=={'locked':True}
 assert s.view(0)['run']['relic_locks']==[key]==s.view(1)['run']['relic_locks']
 for _ in range(6):
  s.shared['gold']=99999;s.sync()
  cmd(0,'shop-lock',{'intent':'reroll'});cmd(1,'shop-lock',{'intent':'reroll'})
  assert relics(0)[0]==key==relics(1)[0],(relics(0),relics(1))
 # Saved and restored (reconnects), the lock is still there.
 r=TagCampaign.restore(json.loads(json.dumps(s.checkpoint())));assert r.shared['relic_locks']==[key]
 # The teammate unlocks it; cards cannot be locked.
 i=next(i for i,x in enumerate(s.shared['shop']) if x.get('id')==key and x['kind']=='artifact')
 assert cmd(0,'relic-lock',i)['result']=={'locked':False} and s.shared['relic_locks']==[]
 card=next(i for i,x in enumerate(s.shared['shop']) if x['kind']!='artifact')
 try:cmd(0,'relic-lock',card);raise SystemExit('a card was locked')
 except ValueError:pass
 print('PASS Tag relic locks: shared, kept through rerolls for both players, saved, unlockable by the teammate, relics only')
