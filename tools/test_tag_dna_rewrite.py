"""DNA Rewrite in Tag (Discord, Tasfariel, 2026-11-22): both partners are offered the team's Type; the first answer counts
for both, the other partner's window closes (android/web/type-choice.js), and a late answer is accepted quietly instead of
failing with "No Type choice is pending"."""
import sys,uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import storage
from tag_campaign import TagCampaign

p=storage.profile();p['unlocked']=[0,1,2,3];p['character_levels']={'0':2}
s=TagCampaign([0,2],[p,p],level=0,seed=5)
def command(seat,action,value=None):return s.command(seat,{'id':uuid.uuid4().hex,'revision':s.revision,'action':action,'value':value})['result']
for seat in (0,1):command(seat,'auto')
r=s.players[0]['routes']
command(1,'ready',{'opponent':r[1],'selected':s.players[1]['selected']})
command(0,'ready',{'opponent':r[0],'selected':s.players[0]['selected']})
s.finish(0,7000,[]);s.shared['artifacts']=s.shared['artifacts']+['dna_rewrite'];s.sync()
assert s.phase=='shop'
assert [s.view(seat)['shopping']['choosing'][seat] for seat in (0,1)]==[True,True],'both partners are offered the Type'
command(0,'choose-monster-type','Dragon')
for seat in (0,1):
 view=s.view(seat)
 assert view['run']['monster_type']=='Dragon',seat
 assert view['shopping']['choosing']==[False,False],'nobody is still choosing'
assert command(1,'choose-monster-type','Zombie') is None,'a late answer is accepted quietly'
assert all(run['monster_type']=='Dragon' for run in s.players),'and keeps the first Type'
# Without DNA Rewrite the request still fails.
s.shared['artifacts']=[a for a in s.shared['artifacts'] if a!='dna_rewrite'];s.sync()
try:command(1,'choose-monster-type','Zombie')
except ValueError:pass
else:raise AssertionError('a Type needs DNA Rewrite')
print('Tag DNA Rewrite OK')
