"""Tag Bounty List (bug report, 2026-11-14): both players see one team objective, and completing it pays the team once."""
import sys,tempfile,uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import storage,campaign as game
storage.ROOT=Path(tempfile.mkdtemp(dir=ROOT/'temp',prefix='tag-bounty-'));game.SAVE=storage.ROOT/'run.json'
from tag_campaign import TagCampaign
p=storage.profile();p['unlocked']=[0,1]
s=TagCampaign([0,1],[p,p],seed=11)
def command(seat,action,value=None):return s.command(seat,{'id':uuid.uuid4().hex,'revision':s.revision,'action':action,'value':value})
def same():
 a,b=(r.get('bounty_objective') for r in s.players);assert a and a==b,(a,b);return a
# The guest owns the relic first (bought on their cart): the guest's objective becomes the team's.
s.players[1]['artifacts'].append('bounty_list');s.shared['artifacts']=list(s.players[1]['artifacts'])
game.ensure_bounty(s.players[1]);s.sync();first=same()
for seat in (0,1):
 command(seat,'auto');options=s.players[seat]['routes'];choice=next(x for x in options if x!=s.players[1-seat]['opponent']);command(seat,'choose',choice);command(seat,'ready')
assert s.phase=='duel' and same()==first
# Complete the shared objective: the team is paid once, both players see the result and one new objective.
events={'eleven_activations':[{'kind':'activate'}]*11,'five_monsters':[{'kind':'duel_metrics','peak_monsters':5}],
 'over_3000_atk':[{'kind':'duel_metrics','peak_attack':3500}],'ritual_summon':[],'fusion_summon':[]}[first['id']]
if not events:
 kind=0x80 if first['id']=='ritual_summon' else 0x40;events=[{'kind':'summon','card':next(c['id'] for c in game.CARDS if c['data']['type']&kind)}]
s.finish(0,7000,events);assert s.phase=='shop'
for r in s.players:assert r['last_rewards'].get('Bounty List')==first['reward'] and r['last_bounty']['completed'],r.get('last_bounty')
nxt=same();assert nxt['id']!=first['id']
# Selling it clears the objective on both screens.
s.shared['artifacts']=[a for a in s.shared['artifacts'] if a!='bounty_list'];s.sync()
assert all('bounty_objective' not in r for r in s.players)
print('PASS Tag Bounty List: one team objective on both screens, paid once, cleared when sold')
