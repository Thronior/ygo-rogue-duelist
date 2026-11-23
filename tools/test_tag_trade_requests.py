"""Tag trade requests (Nemu on Discord, user 2026-11-20): while both players pick cards, each screen sees the teammate's
collection and deck and can request copies. Requests are a wish list only; the owner still chooses what to send."""
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

# Trading opens in the deck editor after the first round.
s.phase='draft';s.shared['round']=1
for run in s.players:run['round']=1
tid=s.trade['id']
assert 'partner' not in s.trade_view(0),'no teammate collection before both players vote'
command(0,'trade-vote',{'id':tid,'ready':True});command(1,'trade-vote',{'id':tid,'ready':True})
v0,v1=s.view(0)['trade'],s.view(1)['trade']
assert v0['status']=='select'
assert v0['partner']['pool']==s.players[1]['pool'] and v0['partner']['deck']==s.players[1]['selected'],'seat 0 sees seat 1 collection and deck'
assert v1['partner']['pool']==s.players[0]['pool'],'and the other way round'
assert v0['requested']==[] and v0['requestedMine']==[]

# Seat 0 asks for two of seat 1's copies; seat 1 sees them as requested on its own cards.
wanted=[0,2]
command(0,'trade-request',{'id':tid,'cards':wanted})
assert s.view(0)['trade']['requested']==wanted and s.view(1)['trade']['requestedMine']==wanted
refused(0,'trade-request',{'id':tid,'cards':[0,0]},'distinct copies')
refused(0,'trade-request',{'id':tid,'cards':[len(s.players[1]['pool'])]},'distinct copies')
refused(0,'trade-request',{'id':'old','cards':[1]},'This trade has changed')

# Requests move nothing: seat 1 sends only what it picks.
before=[r['pool'][:] for r in s.players]
command(1,'trade-send',{'id':tid,'cards':[2]})
refused(0,'trade-request',{'id':tid,'cards':[0]},'already sent')
command(0,'trade-send',{'id':tid,'cards':[]})
assert s.trade['status']=='received'
assert len(s.players[0]['pool'])==len(before[0])+1 and len(s.players[1]['pool'])==len(before[1])-1,'only the sent copy moved'
command(0,'trade-ack',{'id':tid});command(1,'trade-ack',{'id':tid})
assert s.trade['requests']==[[],[]] and s.trade['id']!=tid,'a new trade starts with no requests'

# The shop's deck editor trades too (user, 2026-11-23), after the first duel; while a trade runs the shop waits, and a
# vote made before a purchase stays.
s.phase='shop';tid=s.trade['id']
command(0,'trade-vote',{'id':tid,'ready':True})
s.trade['votes']=[True,False];s.buy_carts()
assert s.trade['id']==tid and s.trade['votes']==[True,False],'a purchase keeps the trade vote'
command(1,'trade-vote',{'id':tid,'ready':True})
assert s.trade['status']=='select','both votes start the trade in the shop'
refused(0,'shop-cart',[],'Finish the card trade')
command(0,'trade-send',{'id':tid,'cards':[0]});command(1,'trade-send',{'id':tid,'cards':[]})
command(0,'trade-ack',{'id':tid});command(1,'trade-ack',{'id':tid})
assert s.trade['status']=='idle' and s.phase=='shop','back in the shop after the trade'
def round_(n):
 s.shared['round']=n
 for run in s.players:run['round']=n
round_(0);refused(0,'trade-vote',{'id':s.trade['id'],'ready':True},'after your first duel')
round_(1);s.phase='draft'

# A checkpoint saved before requests existed still loads its trade.
del s.trade['requests'];s.trade['status']='select'
assert s.trade_view(0)['requested']==[]
print('PASS Tag trade requests: teammate collection and deck, requests both ways, validation, nothing moves by itself, trading from the shop')
