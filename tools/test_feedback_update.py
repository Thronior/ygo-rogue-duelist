import sys,random,tempfile,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,content,storage,challenge_levels as cl,feedback_update as f
base=Path(tempfile.mkdtemp(prefix='feedback-',dir=ROOT/'temp'));storage.ROOT=base;g.SAVE=base/'run.json';g.RUNTIME=base/'runtime';g.RUNTIME.mkdir()
p=storage.profile();p['unlocked']=list(content.PLAYABLE_IDS);p['character_levels']={'0':6};storage.write(base/'profile.json',p)
assert cl.unlocked(p,0)==6
q={'character':0,'challenge_level':5};cl.award({'character_levels':{'0':4}},q);assert q['level_unlocked']==6
r=g.new_run(0,random.Random(2),6);r['pool']=[c['id'] for c in g.CARDS if c['data']['type']&1 and not c['data']['type']&64][:40];r['selected']=list(range(40))
for round_,expected in [(0,1),(1,1),(2,2),(3,2),(5,3),(8,4)]:
 r['round']=round_;r['stage']='draft';r['lp']=4000;g.routes(r,random.Random(round_));r['opponent']=r['routes'][0];g.prepare_duel(r,random.Random(round_));assert len(r['curses'])==expected,(round_,r['curses']);assert r['opponent_relic'] in content.ART_INFO
 g.prepare_duel(r,random.Random(round_));assert len(r['curses'])==expected,'duplicate curse';assert r['new_cards_from']==len(r['pool'])
print('PASS persistent curses across ordinary and boss duels, no double commit; Level 6 and opponent relic')
r['artifacts']=['dna_rewrite'];r.pop('monster_type',None)
try:f.require_type_choice(r)
except ValueError:pass
else:raise AssertionError('Type choice missing')
f.choose_type(r,'Divine-Beast');f.require_type_choice(r);assert '2097152' in f.type_script(r)
try:f.choose_type(r,'Dragon')
except ValueError:pass
else:raise AssertionError('choice changed')
from collections import Counter
counts=Counter(f.draw_curses(random.Random(7),50000));mean=sum(n for k,n in counts.items() if k!='relic_seal')/(len(counts)-1);assert .45<counts['relic_seal']/mean<.55
print('PASS Type choice validation and half-weight Relic Seal')
