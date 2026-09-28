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
s=TagCampaign.restore(saved);cmd(0,'finale-vote',True);cmd(1,'finale-vote',True)
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
for action in ['next-loop','champion','finale-vote']:
 try:cmd(0,action,True);raise AssertionError(action+' unexpectedly accepted')
 except ValueError:pass
s.routes();assert all(not r['routes'] for r in s.players)
try:s.prepare();raise AssertionError('Restarted campaign after final round')
except ValueError:pass
assert all(r['loop']==0 and not r.get('encore_active') for r in s.players)
import passives
balanced={'artifacts':['sword','spring','flame','phoenix_rebirth'],'curses':[],'first_player':0}
Path('temp/pvp-relic-script.json').write_text(json.dumps('\n'.join(passives.multiplayer_script(balanced,seat) for seat in (0,1))),encoding='utf-8')
print('PASS final 1v1: mutual opt-in, cancel, either-player skip, equal relics/LP/draw, checkpoint, preserved campaign victory, no champion or loop')
