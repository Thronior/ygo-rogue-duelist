import sys,json,uuid
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import storage,content,campaign as game
from tag_campaign import TagCampaign
p=storage.profile();p['unlocked']=list(range(len(content.CHARACTERS)))
s=TagCampaign([0,1],[p,p],seed=12)
for r in s.players:game.auto_deck(r)
s.shared['round']=content.RUN_LENGTH;s.sync();s.phase='complete'
for r in s.players:r['stage']='complete'
s.shared['artifacts']=['sword','eye'] if 'sword' in content.ART_INFO else ['eye']
s.sync()
def cmd(seat,action,value=None,key=None):return s.command(seat,{'id':key or uuid.uuid4().hex,'revision':s.revision,'action':action,'value':value})
Path('temp/pvp-complete-views.json').write_text(json.dumps([s.view(0),s.view(1)]),encoding='utf-8')
saved=s.checkpoint();cmd(0,'finale-vote',True);assert s.phase=='complete' and s.finale['votes']==[True,False]
cmd(0,'finale-vote',False);assert not any(s.finale['votes'])
cmd(1,'finale-skip');assert s.phase=='complete' and s.finale['status']=='skipped'
try:cmd(0,'finale-vote',True);raise AssertionError('Skipped finale restarted')
except ValueError:pass
# Skipping the final 1v1 ends the run: no loop (user, 2026-11-13).
try:cmd(0,'loop-vote',True);raise AssertionError('Looped after skipping the final duel')
except ValueError as error:assert 'final 1v1' in str(error)
assert s.view(0)['loopVotes']==[False,False]
s=TagCampaign.restore(saved);team_before={k:json.dumps(s.shared.get(k),sort_keys=True) for k in ('lp','gold','artifacts','cursed_artifacts')};decks_before=[json.dumps([r['pool'],sorted(r['selected'])]) for r in s.players]
cmd(0,'finale-vote',True);cmd(1,'finale-vote',True)
assert s.phase=='complete' and s.finale['status']=='choosing'
cmd(0,'finale-mode','all');cmd(1,'finale-mode','all')
assert s.phase=='duel' and s.duel['mode']=='pvp';assert list(map(len,s.duel['teams']))==[1,1]
assert s.duel['lp']==s.duel['enemyLP']==8000 and s.duel['draw']==s.duel['enemyDraw']==6
assert s.view(0)['run']['opponent']==1 and s.view(1)['run']['opponent']==0
assert s.view(1)['duel'] is None
Path('temp/pvp-finale.json').write_text(json.dumps(s.duel),encoding='utf-8')
r=TagCampaign.restore(json.loads(json.dumps(s.checkpoint())));assert r.duel==s.duel
profiles=json.dumps(s.profiles,sort_keys=True);rounds=s.shared['round'];s.finish(1,0,[],reason=0)
assert s.phase=='complete' and s.finale['winner']==1 and s.shared['round']==rounds and json.dumps(s.profiles,sort_keys=True)==profiles
for action in ['next-loop','champion','finale-vote']:  # the solo loop/champion actions stay solo-only
 try:cmd(0,action,True);raise AssertionError(action+' unexpectedly accepted')
 except ValueError:pass
s.routes();assert all(not r['routes'] for r in s.players)
try:s.prepare();raise AssertionError('Restarted campaign after final round')
except ValueError:pass
assert all(r['loop']==0 and not r.get('encore_active') for r in s.players)
# Another loop after the final duel (2026-11-12): both players vote, then duel 1 of loop 2 with a new shop and opponents.
# A real run ends on its duel-9 opponent; this staged one never dueled, so give it one for the shop's opponent pack.
for r in s.players:r['opponent']=r.get('opponent') if r.get('opponent') is not None else 2
gold=s.shared['gold'];arts=list(s.shared['artifacts'])
# The 1v1's result never matters (user, 2026-11-13): seat 0 lost it, and the team keeps the LP, coins, relics and decks it
# had after duel 9.
assert s.finale['winner']==1
assert {k:json.dumps(s.shared.get(k),sort_keys=True) for k in team_before}==team_before,'the final duel changed the team state'
assert [json.dumps([r['pool'],sorted(r['selected'])]) for r in s.players]==decks_before
cmd(0,'loop-vote',True);assert s.phase=='complete' and s.loop_votes==[True,False] and s.view(1)['loopVotes']==[True,False]
cmd(1,'loop-vote',True)
assert s.phase=='shop' and s.shared['loop']==1 and s.shared['round']==0 and s.view(0)['loop']==1
assert all(json.dumps(s.shared.get(k),sort_keys=True)==team_before[k] for k in ('lp','gold','artifacts','cursed_artifacts')),'loop 2 starts from the duel-9 state'
assert [json.dumps([r['pool'],sorted(r['selected'])]) for r in s.players]==decks_before
assert s.view(0)['run']['lp']==json.loads(team_before['lp']) and s.view(1)['run']['artifacts']==json.loads(team_before['artifacts'])
assert all(r['loop']==1 and r['round']==0 and r['stage']=='shop' and r['routes'] and not r.get('finished_at') for r in s.players)
assert s.shared['shop'] and s.shared['gold']==gold and s.shared['artifacts']==arts,'coins and relics carry over'
assert s.finale['status']=='available' and s.loop_votes==[False,False],'the final duel is offered again at the end of the loop'
r2=TagCampaign.restore(json.loads(json.dumps(s.checkpoint())));assert r2.shared['loop']==1 and all(r['loop']==1 for r in r2.players)
import passives
balanced={'artifacts':['sword','spring','flame','phoenix_rebirth'],'curses':[],'first_player':0}
Path('temp/pvp-relic-script.json').write_text(json.dumps('\n'.join(passives.multiplayer_script(balanced,seat) for seat in (0,1))),encoding='utf-8')
print('PASS final 1v1: mutual opt-in, cancel, either-player skip, equal relics/LP/draw, checkpoint, preserved campaign victory, no champion; looping needs the played 1v1, then both players vote')
