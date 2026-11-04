"""Tag victory rewards: one player's reroll or accept never makes the teammate's reward screen stale (2026-11-03).

LupinRed's report: with a Dueling Engine teammate, spinning a card after a win needed a reconnect. The Engine's single
deck choice is accepted quickly, which bumped the room revision, and the other player's reroll was then refused with
"State changed".
"""
import sys,uuid
from copy import deepcopy
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import storage,campaign as g,content
from tag_campaign import TagCampaign
p=deepcopy(storage.profile());p['unlocked']=content.PLAYABLE_IDS
ENGINE=next(i for i,c in enumerate(content.CHARACTERS) if c.get('engine_deck'))
for chars in ([0,ENGINE],[ENGINE,0],[0,1]):
 s=TagCampaign(chars,[p,p],seed=5)
 cmd=lambda seat,action,value=None,revision=None:s.command(seat,{'id':uuid.uuid4().hex,'revision':s.revision if revision is None else revision,'action':action,'value':value})
 taken=[]
 for seat in (0,1):
  draft=deepcopy(s.players[seat]);g.auto_deck(draft);opponent=next(i for i in s.players[seat]['routes'] if i not in taken);taken.append(opponent)
  cmd(seat,'ready',{'selected':draft['selected'],'opponent':opponent})
 s.finish(0,7000,[]);s.shared['gold']=500;s.sync()
 assert all(r['reward_slots']['pending'] for r in s.players)
 for first in (0,1):
  other=1-first;seen=s.revision
  cmd(first,'reward-accept',0)
  assert s.revision>seen
  cmd(other,'reward-reroll',0,revision=seen)
  assert s.shared['gold']==485 and s.players[first]['gold']==485,'one reroll, paid from the shared coins'
  cmd(other,'reward-accept',0,revision=seen)
  assert not s.players[other]['reward_slots']['pending']
  break
print('PASS Tag rewards: a teammate accepting or rerolling never refuses the other player\'s reroll or accept, Dueling Engine in either seat')

# The same on the opponent screen: a teammate's pick doesn't refuse a reveal (coins still shared).
s=TagCampaign([0,1],[p,p],seed=5);s.shared['gold']=500;s.sync()
cmd=lambda seat,action,value=None,revision=None:s.command(seat,{'id':uuid.uuid4().hex,'revision':s.revision if revision is None else revision,'action':action,'value':value})
seen=s.revision;cmd(0,'choose',s.players[0]['routes'][0]);assert s.revision>seen
target=next(i for i in s.players[1]['routes'] if i not in s.players[1].get('revealed_opponents',[]))
cost=cmd(1,'reveal-opponent',target,revision=seen)
assert target in s.shared['revealed_opponents'] and s.players[0]['gold']==s.players[1]['gold']==s.shared['gold']
print('PASS Tag reveal: a teammate picking an opponent never refuses the other player\'s reveal')
