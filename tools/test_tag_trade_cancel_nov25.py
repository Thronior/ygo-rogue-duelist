"""Tag trade Cancel (Chinese-channel players on Discord, 2026-11-25): the trade window only had Send, so a trade opened by
mistake could not be left. Either player can now cancel before the cards change hands; nothing moves and both go back."""
import sys,uuid
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import storage
from tag_campaign import TagCampaign

p=storage.profile();p['unlocked']=[0,1];p['character_levels']={'0':2}
s=TagCampaign([0,1],[p,p],level=0,seed=7)
def command(seat,action,value=None):return s.command(seat,{'id':uuid.uuid4().hex,'revision':s.revision,'action':action,'value':value})['result']
def refused(seat,action,value,match):
 before=s.checkpoint()
 try:command(seat,action,value)
 except ValueError as error:
  assert match in str(error),(match,str(error));assert s.checkpoint()==before,'a refused command changes nothing';return
 raise AssertionError(f'{action} {value} was accepted')

s.phase='shop';s.shared['round']=1
for run in s.players:run['round']=1
pools=[r['pool'][:] for r in s.players]

# Not open yet: nothing to cancel.
tid=s.trade['id']
refused(0,'trade-cancel',{'id':tid},'This trade has changed')

# Opened, one side already sent and the other requested: either player cancels, nothing moves.
command(0,'trade-vote',{'id':tid,'ready':True});command(1,'trade-vote',{'id':tid,'ready':True})
command(1,'trade-request',{'id':tid,'cards':[0]});command(0,'trade-send',{'id':tid,'cards':[0]})
command(1,'trade-cancel',{'id':tid})
assert s.trade['status']=='idle' and s.trade['id']!=tid and s.trade['votes']==[False,False],'a fresh idle trade'
assert [r['pool'] for r in s.players]==pools,'no card changed hands'
assert s.view(0)['trade']['status']=='idle' and s.view(1)['trade']['status']=='idle','both screens leave the trade'
refused(0,'trade-send',{'id':tid,'cards':[]},'This trade has changed')

# The shop works again, and a new trade still runs to the end.
try:command(0,'shop-cart',[])
except ValueError as error:assert 'Finish the card trade' not in str(error),'the shop no longer waits for a trade'
tid=s.trade['id']
command(0,'trade-vote',{'id':tid,'ready':True});command(1,'trade-vote',{'id':tid,'ready':True})
command(0,'trade-send',{'id':tid,'cards':[0]});command(1,'trade-send',{'id':tid,'cards':[]})
refused(0,'trade-cancel',{'id':tid},'This trade has changed')
assert len(s.players[1]['pool'])==len(pools[1])+1,'a completed trade cannot be cancelled'
print('PASS Tag trade Cancel: either player backs out before cards move; completed trades stay')
