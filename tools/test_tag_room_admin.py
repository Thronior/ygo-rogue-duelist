"""Room tool (tools/room-admin) run changes on the Tag host: TagCampaign.admin."""
import sys,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import storage,content,campaign as g
from tag_campaign import TagCampaign
p=storage.profile();p['unlocked']=[0,1];p['character_levels']={'0':2}
s=TagCampaign([0,1],[p,p],level=2,seed=7)
rev=s.revision
out=s.admin({'kind':'coins','amount':125});assert s.shared['gold']==165 and out['coins']==165 and all(r['gold']==165 for r in s.players)
s.admin({'kind':'coins','amount':-9999});assert s.shared['gold']==0,'coins never go negative'
s.admin({'kind':'coins','amount':content.MAX_COINS+5});assert s.shared['gold']==content.MAX_COINS,'the usual coin cap applies'
lp=s.shared['lp'];s.admin({'kind':'run-lp','amount':-500});assert s.shared['lp']==lp-500 and all(r['lp']==lp-500 for r in s.players)
s.admin({'kind':'run-lp','amount':-10**6});assert s.shared['lp']==1,'the run stays alive at 1 LP'
relic=next(k for k in content.ART_INFO if k not in s.shared['artifacts'] and not k.startswith('cursed_'))
s.admin({'kind':'relic-add','key':relic});assert relic in s.shared['artifacts'] and all(relic in r['artifacts'] for r in s.players)
for bad in ({'kind':'relic-add','key':relic},{'kind':'relic-add','key':'no_such_relic'},{'kind':'relic-remove','key':'no_such_relic'},{'kind':'curse-add','key':'no_such_curse'},{'kind':'pool','side':2,'code':89631139},{'kind':'pool','side':0,'code':1},{'kind':'launch'}):
 try:s.admin(bad);raise AssertionError('accepted '+str(bad))
 except ValueError:pass
s.admin({'kind':'relic-remove','key':relic});assert relic not in s.shared['artifacts']
curse=next(iter(content.CURSES))
s.admin({'kind':'curse-add','key':curse});assert s.shared['curses'].count(curse)==1 and all(curse in r['curses'] for r in s.players)
s.admin({'kind':'curse-remove','key':curse});assert curse not in s.shared['curses'] and all(curse not in r['curses'] for r in s.players)
pools=[len(r['pool']) for r in s.players]
s.admin({'kind':'pool','side':1,'code':g.BY_NAME['Blue-Eyes White Dragon']['id'],'count':3})
assert len(s.players[1]['pool'])==pools[1]+3 and len(s.players[0]['pool'])==pools[0] and s.players[1]['pool'][-1]==g.BY_NAME['Blue-Eyes White Dragon']['id']
assert s.revision>rev,'every change refreshes both views'
restored=TagCampaign.restore(json.loads(json.dumps(s.checkpoint())));assert restored.shared==s.shared and restored.players[1]['pool']==s.players[1]['pool']
print('PASS tag room tool: coins, run LP, relics, curses and pool cards change the host run and survive a checkpoint')
