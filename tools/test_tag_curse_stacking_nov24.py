"""Tag boss curses stack (Discord 2026-11-24, .venxm: two bosses with Brittle Guard took 100 ATK/200 DEF, not 200/400).
Each seat's boss adds its own curses; the shared LVL 6 persistent curses count once; non-stacking curses stay single."""
import sys,uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import storage,tag_campaign
from tag_campaign import TagCampaign

real=tag_campaign.game.prepare_duel
def run(level,seat_curses,persistent=()):
 p=storage.profile();p['unlocked']=[0,1,2,3];p['character_levels']={'0':6,'2':6}
 s=TagCampaign([0,2],[p,p],level=level,seed=5)
 s.shared['persistent_curses']=list(persistent)
 def fake(r,rng=None):
  real(r,rng);seat=s.players.index(r);r['curses']=list(persistent)+list(seat_curses[seat])
 tag_campaign.game.prepare_duel=fake
 try:
  def command(seat,action,value=None):return s.command(seat,{'id':uuid.uuid4().hex,'revision':s.revision,'action':action,'value':value})['result']
  for seat in (0,1):command(seat,'auto')
  r=s.players[0]['routes']
  command(1,'ready',{'opponent':r[1],'selected':s.players[1]['selected']})
  command(0,'ready',{'opponent':r[0],'selected':s.players[0]['selected']})
 finally:tag_campaign.game.prepare_duel=real
 return sorted(s.shared['curses'])

assert run(0,[['brittle'],['brittle']])==['brittle','brittle'],'two bosses with the same curse stack'
assert run(0,[['brittle'],['tax']])==['brittle','tax']
assert run(0,[['brittle'],[]])==['brittle']
assert run(6,[['brittle'],['tax']],persistent=['hunger'])==['brittle','hunger','tax'],'shared persistent curses count once'
assert run(6,[[],[]],persistent=['hunger','frailty'])==['frailty','hunger']
print('Tag boss curses stack OK')
