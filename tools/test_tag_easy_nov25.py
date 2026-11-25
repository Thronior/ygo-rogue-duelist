"""Easy mode in Tag (user, 2026-11-25: "add an option to play easy mode in tag duels as well", in the Challenge Level
selection). TagCampaign(easy=True) starts both seats' runs easy at Level 0 with the removal cards, draws no boss
curses, shows the Easy modifier, and lets the host skip the shadow relic."""
import random,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import storage,easy_mode,challenge_levels,cursed_relics,campaign as game
from tag_campaign import TagCampaign

p=storage.profile();p['unlocked']=[0,1,2,3];p['character_levels']={'0':6,'2':6}
s=TagCampaign([0,2],[p,p],level=5,seed=5,easy=True)
removal=[game.BY_NAME[n]['id'] for n in easy_mode.REMOVAL]
for seat,run in enumerate(s.players):
 assert run['easy'] and easy_mode.active(run),f'seat {seat} is easy'
 assert run['challenge_level']==0,'Easy plays by Level 0 rules, whatever level was picked'
 assert all(cid in run['pool'] for cid in removal),f'seat {seat} starts with the removal cards'
 assert any(row['kind']=='easy' for row in challenge_levels.active_modifiers(run))
assert s.shared['lp']==8000

def boss_curses(tag):
 tag.shared['round']=2;tag.sync();tag.routes()
 return [c for r in tag.players for cs in (r.get('route_curses') or {}).values() for c in cs]+[r.get('boss_curse') for r in tag.players if r.get('boss_curse')]
assert boss_curses(s)==[],'no boss curses in an easy Tag run'
assert boss_curses(TagCampaign([0,2],[p,p],level=0,seed=5)),'a normal Tag run still draws them'

host=s.players[0];host['opponent']=host['routes'][0];cursed_relics.create_offer(host,random.Random(3));cursed_relics.skip(host,random.Random(3))
assert not host.get('cursed_offer'),'the host can skip the shadow relic'
normal=TagCampaign([0,2],[p,p],level=0,seed=5);assert not any(r.get('easy') for r in normal.players)
print('PASS Easy Tag runs: both seats easy at Level 0, removal cards, no boss curses, Easy modifier, shadow relic skip')
