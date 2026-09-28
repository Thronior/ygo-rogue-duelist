import sys,json,uuid
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import storage,campaign as g
from tag_campaign import TagCampaign
p=storage.profile();p['unlocked']=[0,1];p['character_levels']={'0':2}
s=TagCampaign([0,1],[p,p],level=2,seed=7)
assert s.players[1]['challenge_level']==2
assert s.shared['gold']==40
assert len(s.shared['artifacts'])==2
assert s.players[0]['pool'] is not s.players[1]['pool']
def command(seat,action,value=None,key=None):return s.command(seat,{'id':key or uuid.uuid4().hex,'revision':s.revision,'action':action,'value':value})
for seat in (0,1):
 command(seat,'auto');options=s.players[seat]['routes'];choice=next(x for x in options if x!=s.players[1-seat]['opponent']);command(seat,'choose',choice);command(seat,'ready')
assert s.phase=='duel';assert len(s.duel['teams'][0])==2;assert len(s.duel['teams'][1])==2;assert s.duel['enemyLP']==8000
entry={'id':'response-test','seat':0,'number':0,'response':{'type':1}}
s.journal(entry);s.journal(entry);assert len(s.duel['responses'])==1
assert s.receipt(0,'response-test')=={'result':{'ok':True}} and s.receipt(1,'response-test') is None
s.finish(0,7000,[]);assert s.phase=='shop';before=s.shared['gold'];s.shared['gold']=500;s.sync()
assert s.receipt(0,'response-test')=={'result':{'ok':True}}
pools=[len(r['pool']) for r in s.players]
try:command(1,'buy',[0]);raise AssertionError('guest spent out of turn')
except ValueError:pass
price=s.players[0]['shop'][0]['price'];receipt=command(0,'buy',[0],key='purchase-1')
assert len(s.players[0]['pool'])==pools[0]+1 and len(s.players[1]['pool'])==pools[1]
assert s.shared['gold']==500-price and s.shop_seat==1
assert command(0,'buy',[0],key='purchase-1')==receipt and s.shared['gold']==500-price
restored=TagCampaign.restore(json.loads(json.dumps(s.checkpoint())));assert restored.shared==s.shared;assert restored.receipts==s.receipts
command(1,'skip');assert s.phase=='draft' and s.ready==[False,False]
s.paused=True
try:command(0,'auto');raise AssertionError('acted while disconnected')
except ValueError:pass
print('PASS tag campaign: host level, independent decks, shared relics/coins, two-opponent duel, one payout, host-first shopping, ownership, duplicate purchase protection and reconnect checkpoint')

# New rooms stay in a persisted lobby until the host explicitly starts.
lobby=TagCampaign([0,1],[p,p],level=2,seed=7,lobby=True)
assert lobby.view(0)['phase']=='lobby'
lobby=TagCampaign.restore(json.loads(json.dumps(lobby.checkpoint())))
for seat,action in [(1,'start'),(0,'auto')]:
 try:lobby.command(seat,{'id':uuid.uuid4().hex,'revision':lobby.revision,'action':action});raise AssertionError('lobby action accepted')
 except ValueError:pass
lobby.command(0,{'id':'start-run','revision':lobby.revision,'action':'start'})
assert lobby.phase=='draft'
assert TagCampaign.restore(lobby.checkpoint()).phase=='draft'
print('PASS persisted lobby: guest cannot start or edit, host starts, reconnect preserves phase')

# A local draft commits in one transaction and failed drafts leave no changes.
from copy import deepcopy
local=TagCampaign([0,1],[p,p],seed=7)
preview=deepcopy(local.players[0]);g.auto_deck(preview)
base=local.checkpoint();opponent=preview['routes'][0]
try:
 local.command(0,{'id':'bad-final','revision':0,'action':'ready','value':{'opponent':opponent,'selected':[]}})
 raise AssertionError('invalid final draft accepted')
except ValueError:pass
assert local.checkpoint()==base
local.command(0,{'id':'final','revision':0,'action':'ready','value':{'opponent':opponent,'selected':preview['selected']}})
assert local.ready[0] and local.players[0]['opponent']==opponent and local.players[0]['selected']==preview['selected']
print('PASS atomic final draft, rejected draft rollback, no intermediate edits required')

# Fixed decks work in either seat. Copycat borrows exactly its own chosen
# opponent, never the teammate's opponent or both tag opponents combined.
from collections import Counter
import content,random
fixed_profile=deepcopy(p);fixed_profile['unlocked']=content.PLAYABLE_IDS
for fixed_char in (37,38):
 for fixed_seat in (0,1):
  chars=[0,0];chars[fixed_seat]=fixed_char
  fixed=TagCampaign(chars,[fixed_profile,fixed_profile],seed=11)
  choices=[]
  for seat in (0,1):
   run=fixed.players[seat];draft=deepcopy(run);g.auto_deck(draft)
   opponent=next(i for i in run['routes'] if i not in choices);choices.append(opponent)
   fixed.command(seat,{'id':'ready-'+str(seat),'revision':fixed.revision,'action':'ready','value':{'selected':[] if seat==fixed_seat else draft['selected'],'opponent':opponent}})
  assert fixed.phase=='duel'
  if fixed_char==37:
   run=fixed.players[fixed_seat];variant=run.get('tutorial_variants',{}).get(str(choices[fixed_seat]),0)
   expected=g.opponent_deck(run['round'],random.Random(1),choices[fixed_seat],variant)
   expected.append(g.BY_NAME['Copycat']['id'])
   assert Counter(fixed.duel['teams'][0][fixed_seat]['main'])==Counter(expected)
   assert run['copied_opponent']==choices[fixed_seat]
print('PASS Copycat copies one chosen opponent only; both fixed characters start tag duels in either seat')
