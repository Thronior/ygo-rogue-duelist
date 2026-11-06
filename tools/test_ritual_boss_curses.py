# Bosses whose deck holds Ritual Spells never roll No Specials Allowed below LVL 2, where it also stops the boss
# (Discord 2026-11-06: Kemo never Ritual Summoned; user's call). From LVL 2 it only stops the player, so it stays.
import sys,random
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import campaign as g,content,feedback_update as f
from deck_files import read
KEMO=next(i for i,c in enumerate(content.CHARACTERS) if c['name']=='Kemo')
kemo=content.opponent_record(8,KEMO)['main']
assert f.ritual_curse_block(kemo,0)=={'no_specials'}
assert f.ritual_curse_block(kemo,1)=={'no_specials'}
assert f.ritual_curse_block(kemo,2)==set(),'from LVL 2 the curse only stops the player'
assert f.ritual_curse_block([g.BY_NAME['Battle Ox']['id']]*40,0)==set()
# A Ritual Monster alone (no Ritual Spell) is not a ritual deck: it cannot be Ritual Summoned anyway.
assert f.ritual_curse_block([g.BY_NAME['Shinato, King of a Higher Plane']['id']]+[g.BY_NAME['Battle Ox']['id']]*39,0)==set()
for seed in range(3000):
 assert 'no_specials' not in f.draw_curses(random.Random(seed),3,0,excluded={'no_specials'})
assert any('no_specials' in f.draw_curses(random.Random(seed),3,0) for seed in range(3000)),'other bosses can still roll it'

# Real boss routes: every ritual boss offered at duels 6 and 9 is free of the curse; the others can still get it.
ritual_bosses=0;others_with_curse=0
for seed in range(400):
 r=g.new_run(1,random.Random(seed));g.auto_deck(r)
 r.update(stage='shop',round=random.Random(seed).choice([5,8]),lp=8000,challenge_level=0)
 g.routes(r,random.Random(seed))
 for opponent in r['routes']:
  curses=r['route_curses'][str(opponent)]
  if f.ritual_curse_block(content.opponent_record(r['round'],opponent)['main'],0):
   ritual_bosses+=1;assert 'no_specials' not in curses,(seed,opponent,curses)
  elif 'no_specials' in curses:others_with_curse+=1
assert ritual_bosses>0 and others_with_curse>0,(ritual_bosses,others_with_curse)
print(f'PASS ritual bosses never roll No Specials Allowed below LVL 2 ({ritual_bosses} ritual boss routes, {others_with_curse} other routes still rolled it)')
