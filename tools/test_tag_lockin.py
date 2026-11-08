"""Tag's shared screens (2026-11-08): one opponent list, swords lock-in, a shop both players use at once with
Buy / Reroll / Next duel lock-ins, deck edits from the shop, and per-boss rerolls."""
import sys,json,uuid
from copy import deepcopy
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import storage,content
from tag_campaign import TagCampaign

p=storage.profile();p['unlocked']=[0,1];p['character_levels']={'0':2}
s=TagCampaign([0,1],[p,p],level=0,seed=21)
def command(seat,action,value=None,revision=None):return s.command(seat,{'id':uuid.uuid4().hex,'revision':s.revision if revision is None else revision,'action':action,'value':value})['result']
def refused(seat,action,value=None,match=''):
 before=s.checkpoint()
 try:command(seat,action,value)
 except ValueError as error:
  assert match in str(error),(match,str(error))
  assert s.checkpoint()==before,'a refused command changes nothing'
  return str(error)
 raise AssertionError(f'{action} {value} was accepted')

# One opponent screen for both players.
routes=s.players[0]['routes']
assert len(routes)==5 and len(set(routes))==5
assert s.players[1]['routes']==routes and s.players[0]['route_rewards']==s.players[1]['route_rewards']
assert not {0,1}&set(routes),'neither player character is an opponent'
assert s.view(0)['run']['routes']==s.view(1)['run']['routes']

# Swords: one press locks in. The teammate's pick is closed, a second press elsewhere moves the lock.
decks=[]
for seat in (0,1):
 command(seat,'auto');decks.append(s.players[seat]['selected'][:])
command(0,'ready',{'opponent':routes[0],'selected':decks[0]})
assert s.ready==[True,False] and s.view(1)['opponents'][0]==routes[0]
refused(1,'ready',{'opponent':routes[0],'selected':decks[1]},'teammate')
refused(0,'auto',None,'Unlock')
command(0,'ready',{'opponent':routes[1],'selected':decks[0]},revision=0)
assert s.ready==[True,False] and s.players[0]['opponent']==routes[1],'the lock moved in one step'
command(1,'ready',{'opponent':routes[0],'selected':decks[1]})
assert s.phase=='duel' and s.duel['names'][1]==[content.CHARACTERS[routes[1]]['name'],content.CHARACTERS[routes[0]]['name']]
print('PASS shared opponent list, swords lock-in, teammate pick closed, lock moves in one step')

# Shop: both players pick at once; nothing is bought until both press Buy.
s.finish(0,7000,[]);assert s.phase=='shop'
s.shared['gold']=900;s.sync()
shop=s.shared['shop'];buyable=[i for i,x in enumerate(shop) if not x['sold']]
a,b=buyable[0],buyable[1]
pools=[len(r['pool']) for r in s.players]
assert command(0,'shop-cart',{'items':[a]})['cartRev']==1
refused(1,'shop-cart',{'items':[a]},'teammate already picked')
command(1,'shop-cart',{'items':[b]})
view=s.view(0)['shopping'];assert view['carts']==[[a],[b]] and view['cartRev']==2,'each player sees both carts'
refused(0,'shop-lock',{'intent':'buy','cartRev':1},'carts changed')
assert command(0,'shop-lock',{'intent':'buy','cartRev':2})=={'kind':'locked','intent':'buy'}
assert s.view(1)['shopping']['locks']==['buy',None] and s.shared['gold']==900,'one Buy lock spends nothing'
command(1,'shop-cart',{'items':[]});assert s.shopping['locks']==[None,None],'changing a cart cancels both Buy locks'
command(1,'shop-cart',{'items':[b]});rev=s.shopping['cart_rev']
command(0,'shop-lock',{'intent':'buy','cartRev':rev});event=command(1,'shop-lock',{'intent':'buy','cartRev':rev})
price=shop[a]['price']+shop[b]['price']
assert event['kind']=='buy' and event['items']==[[a],[b]] and all(len(r)==1 for r in event['results'])
assert s.shared['gold']==900-price and s.shared['shop'][a]['sold'] and s.shared['shop'][b]['sold']
grown=[len(r['pool'])-n for r,n in zip(s.players,pools)];assert all(n>=1 for n in grown),'each buyer receives their own items'
assert s.shopping['carts']==[[],[]] and s.shopping['locks']==[None,None] and s.view(1)['shopping']['event']['id']==event['id']
assert s.phase=='shop','buying keeps both players in the shop'
print('PASS shared shop: visible carts, no double picks, Buy needs both locks, a cart change cancels them, each buyer is paid')

# Carts that cost more together than the team owns are refused.
s.shared['gold']=0;s.sync();c=next(i for i,x in enumerate(s.shared['shop']) if not x['sold'])
refused(0,'shop-cart',{'items':[c]},'Not enough coins')
s.shared['gold']=900;s.sync()

# Reroll: both must press it.
before=deepcopy(s.shared['shop']);command(0,'shop-cart',{'items':[c]})
assert command(0,'shop-lock',{'intent':'reroll'})['kind']=='locked' and s.shared['shop']==before
gold=s.shared['gold'];event=command(1,'shop-lock',{'intent':'reroll'})
assert event['kind']=='reroll' and s.shared['gold']==gold-event['price'] and s.shared['shop']!=before and s.shopping['carts']==[[],[]]
assert s.players[0]['shop']==s.players[1]['shop']
print('PASS shared reroll: one lock waits, both locks reroll once and clear the carts')

# The deck editor works from the shop; the next opponent screen starts from that deck.
deck=s.players[1]['selected'][:-1];command(1,'deck',deck);assert s.players[1]['selected']==deck
refused(1,'deck',[10**6],'Invalid deck')

# A golden card choice holds Next duel until it is made.
s.shared['artifacts']=s.shared['artifacts']+['golden_sleeve'];s.sync()
assert s.view(0)['shopping']['choosing']==[True,True]
refused(0,'shop-lock',{'intent':'next'},'Golden Card')
for seat in (0,1):command(seat,'golden-card',s.players[seat]['pool'][s.players[seat]['selected'][0]])
command(0,'shop-lock',{'intent':'next'});assert s.phase=='shop'
command(1,'shop-lock',{'intent':None});command(1,'shop-lock',{'intent':'next'})
assert s.phase=='draft' and s.ready==[False,False] and s.players[0]['routes']==s.players[1]['routes'] and len(s.players[0]['routes'])==5
assert s.players[1]['selected']==deck,'the deck edited in the shop reaches opponent select'
print('PASS deck editor from the shop, golden choice holds Next duel, both Next locks open the next opponent select')

# Boss screen: both bosses on both screens, either one rerolled alone.
s.shared['round']=2;s.sync();s.routes()
bosses=s.players[0]['routes'];assert len(bosses)==2 and bosses[0]!=bosses[1] and s.players[1]['routes']==bosses
assert all(str(i) in s.players[0]['route_curses'] for i in bosses) and s.players[0]['route_curses']==s.players[1]['route_curses']
s.shared['gold']=500;s.shared['boss_rerolls']=0;s.sync();old=bosses[0]
result=command(1,'boss-reroll',old)
assert result['cost']==30 and s.shared['gold']==470 and s.shared['boss_rerolls']==1
after=s.players[0]['routes'];assert after[1]==bosses[1] and after[0] not in bosses and after==s.players[1]['routes'],'only that boss changes'
assert str(old) not in s.players[0]['route_curses'] and str(after[0]) in s.players[0]['route_rewards']
for seat in (0,1):command(seat,'auto')
command(0,'ready',{'opponent':after[1],'selected':s.players[0]['selected']})
refused(1,'boss-reroll',after[1],'Unlock this boss')
refused(1,'boss-reroll',old,'already changed')
assert command(1,'boss-reroll',after[0])['cost']==50,'the next reroll costs more'
print('PASS boss screen: two shared bosses, one rerolled at a time, a locked boss stays, rising price')

# Saves from before the shared screen get one shared list on load; the new state survives a checkpoint.
old_save=json.loads(json.dumps(s.checkpoint()))
old_save['shared']['round']=1;old_save['ready']=[False,False]
for run in old_save['players']:run['round']=1
old_save['players'][1]['routes']=old_save['players'][1]['routes'][:1]+[x for x in content.eligible_opponents(1) if x not in (0,1) and x not in old_save['players'][0]['routes']][:4]
old_save.pop('shopping')
loaded=TagCampaign.restore(old_save)
assert loaded.players[0]['routes']==loaded.players[1]['routes'] and len(loaded.players[0]['routes'])==5 and loaded.shopping==TagCampaign.new_shopping()
again=TagCampaign.restore(json.loads(json.dumps(s.checkpoint())));assert again.players[0]['routes']==s.players[0]['routes'] and again.shopping==s.shopping
print('PASS old per-player route saves are migrated; shopping state survives a checkpoint')
