"""Tag relic banish (user, 2026-11-24): either player banishes a relic in the shared shop for team coins (since 2026-11-25:
20, +10 per banish by either player, at most 60); the slot is sold out for both, not rerolled, the relic is gone from both players' shops for the run, carts drop the slot and a stale screen is refused."""
import sys,uuid,tempfile,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import storage,content,campaign as game
(ROOT/'temp').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='tag-relic-banish-',dir=ROOT/'temp') as tmp:
 storage.ROOT=Path(tmp);game.SAVE=Path(tmp)/'run.json'
 from tag_campaign import TagCampaign
 p=storage.profile();p['unlocked']=list(range(len(content.CHARACTERS)))
 s=TagCampaign([0,1],[p,p],seed=21)
 for r in s.players:game.auto_deck(r)
 s.phase='shop';s.shared['gold']=500
 for r in s.players:r.update(opponent=2,stage='shop')
 with s.scope(0):game.restock(s.players[0],s.rng)
 s.shared['shop']=s.players[0]['shop'];s.sync()
 def cmd(seat,action,value=None,revision=None):return s.command(seat,{'id':uuid.uuid4().hex,'revision':s.revision if revision is None else revision,'action':action,'value':value})
 relics=lambda seat:[x['id'] for x in s.view(seat)['run']['shop'] if x['kind']=='artifact' and not x.get('sold')]
 index=next(i for i,x in enumerate(s.shared['shop']) if x['kind']=='artifact');key=s.shared['shop'][index]['id']
 # The guest has the relic in their cart and the host locked it.
 cmd(1,'shop-cart',{'items':[index]});cmd(0,'relic-lock',index)
 old=s.revision
 cmd(0,'shop-cart',{'items':[]})  # the teammate acts in between: banish is independent of the revision
 result=cmd(1,'relic-banish',{'index':index,'id':key},revision=old)['result']
 assert result['banished']==key and s.shared['gold']==480,(result,s.shared['gold'])
 assert key not in relics(0) and key not in relics(1) and relics(0)==relics(1)
 assert s.shared['shop'][index]['id']==key and s.shared['shop'][index]['sold'] and result['replacement'] is None
 assert s.view(0)['run']['shop'][index]['sold'] and s.view(1)['run']['shop'][index]['sold']
 assert s.view(0)['run']['relic_banishes']==[key]==s.view(1)['run']['relic_banishes']
 assert s.shared['relic_locks']==[] and s.shopping['carts']==[[],[]]
 # A screen that still shows the old relic in that slot is refused.
 try:cmd(0,'relic-banish',{'index':index,'id':key});raise SystemExit('stale banish went through')
 except ValueError:pass
 # The other player's banish costs 30: one shared count for the team.
 other=next(i for i,x in enumerate(s.shared['shop']) if x['kind']=='artifact' and not x['sold'])
 cmd(0,'relic-banish',{'index':other,'id':s.shared['shop'][other]['id']});assert s.shared['gold']==450,s.shared['gold']
 # Rerolls (the host's run rolls them) never bring it back, and a reconnect keeps the list.
 for _ in range(8):
  s.shared['gold']=99999;s.sync()
  cmd(0,'shop-lock',{'intent':'reroll'});cmd(1,'shop-lock',{'intent':'reroll'})
  assert key not in relics(0),relics(0)
 r=TagCampaign.restore(json.loads(json.dumps(s.checkpoint())));assert r.shared['relic_banishes'][0]==key and len(r.shared['relic_banishes'])==2
 # Cards cannot be banished.
 card=next(i for i,x in enumerate(s.shared['shop']) if x['kind']!='artifact')
 try:cmd(0,'relic-banish',{'index':card,'id':s.shared['shop'][card]['id']});raise SystemExit('a card was banished')
 except ValueError:pass
 print('PASS Tag relic banish: team coins 20 then 30 (shared count), slot sold out for both, gone for both through rerolls, carts and lock cleared, stale screens refused, saved')
