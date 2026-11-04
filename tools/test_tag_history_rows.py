import sys, uuid
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import storage, content, campaign as game
from tag_campaign import TagCampaign

# Each Tag player's history row is saved inside finish_duel, before the team's coins, LP and relics come from the host.
# The guest's row once kept the guest's own coins (840 where the team had 830), so its run card showed the wrong total.
profile=storage.profile();profile['unlocked']=[0,1]
for won in (False,True):
 s=TagCampaign([0,1],[profile,profile],seed=4242)
 def command(seat,action,value=None):return s.command(seat,{'id':uuid.uuid4().hex,'revision':s.revision,'action':action,'value':value})
 if won:
  # Straight to the last duel, with decks big enough for it.
  s.shared['round']=content.RUN_LENGTH-1;s.sync();s.routes();normals=[i for i,c in game.BY_ID.items() if c['data']['type']==0x11][:45]
  for r in s.players:r['pool']+=normals
 for seat in (0,1):
  command(seat,'auto');choice=next(x for x in s.players[seat]['routes'] if x!=s.players[1-seat]['opponent']);command(seat,'choose',choice);command(seat,'ready')
 assert s.phase=='duel',s.phase
 # The guest's own run drifts from the team's purse, as its own payout can.
 s.players[1]['gold']+=10
 s.finish(0 if won else 1,3000 if won else 0,[])
 assert s.phase==('complete' if won else 'gameover'),s.phase
 for seat,run in enumerate(s.players):
  key=run['history_id']+':'+str(run.get('loop',0));rows=[x for x in s.profiles[seat].get('run_history',[]) if x.get('id')==key]
  assert len(rows)==1,(seat,len(rows))
  row=rows[0]
  assert (row['mode'],row['partner'])==('tag',1-seat),row
  for field in ('gold','lp','artifacts','cursed_artifacts','round'):
   assert row[field]==s.shared[field],(won,seat,field,row[field],s.shared[field])
print('PASS: both Tag history rows keep the team coins, LP, relics and round, after a loss and after a full clear')
