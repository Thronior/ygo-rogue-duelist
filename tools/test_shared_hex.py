"""Shared Hex: each boss Duel draws 1 more curse, and Withering Soul and Thin Ranks also hit the opponent."""
import sys,random,tempfile,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,content as c,approved_relics as ar
storage.ROOT=Path(tempfile.mkdtemp(dir=ROOT/'temp',prefix='shared-hex-'));g.SAVE=storage.ROOT/'run.json'
profile=storage.profile();profile['unlocked']=list(c.PLAYABLE_IDS);storage.write(storage.ROOT/'profile.json',profile)

def boss(artifacts,seed,curses=None):
 r=g.new_run(1,random.Random(seed));g.auto_deck(r);r.update(stage='shop',round=2)
 r['artifacts']=list(r['artifacts'])+artifacts;r.pop('cursed_offer',None)
 g.routes(r);r['opponent']=r['routes'][0] if isinstance(r['routes'][0],int) else r['routes'][0]['id']
 # A level-0 third Duel has 1 curse, plus Shared Hex's.
 if curses:r['route_curses'][str(r['opponent'])]=curses[:1+ar.extra_curses(r)]
 g.prepare_duel(r,random.Random(seed))
 lua=(g.RUNTIME/'puzzles/shadow-run.lua').read_text(encoding='utf8')
 info={int(p):(int(lp),int(hand)) for p,lp,hand in re.findall(r'Debug\.SetPlayerInfo\((\d),(\d+),(\d+),1\)',lua)}
 return r,info

plain,_=boss([],7)
hex_,_=boss(['cursed_shared_hex'],7)
assert len(plain['curses'])==1 and len(hex_['curses'])==2,(plain['curses'],hex_['curses'])
assert ar.copies(dict(artifacts=['cursed_shared_hex']),'cursed_shared_hex')==1
_,without=boss([],8,['drain','short_handed'])
r,with_hex=boss(['cursed_shared_hex'],8,['drain','short_handed'])
assert {'drain','short_handed'}<=set(r['curses']),r['curses']
assert with_hex[1][0]==without[1][0]-1000*r['curses'].count('drain'),(with_hex,without)
assert with_hex[1][1]==without[1][1]-2*r['curses'].count('short_handed'),(with_hex,without)
# The plain run drew only Withering Soul, so Thin Ranks is the only difference on your side.
assert with_hex[0]==(without[0][0],without[0][1]-2),(with_hex,without)
print('PASS Shared Hex: one extra boss curse; Withering Soul and Thin Ranks also apply to the opponent')
