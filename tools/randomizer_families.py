"""How often each family of effects appears on generated cards against the game's real cards (user, Nov 19: no kind of
effect, gambles for one, should be more common than on real cards). Families are randomizer.EFFECT_FAMILIES.
  python/python.exe tools/randomizer_families.py              compare (6,000 generated cards)
  python/python.exe tools/randomizer_families.py --calibrate  tune randomizer.FAMILY_FACTORS in a few rounds and write
                                                              them into randomizer.py"""
import sys,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT));sys.path.insert(0,str(ROOT/'tools'))
import randomizer as R
from safe_write import write_bytes

def clean(t):
 # "Cannot be Special Summoned" and summoning conditions say how a card is summoned, not what it does.
 return re.sub(r'(?i)cannot be special summoned[^.]*\.|must (first )?be special summoned[^.]*\.|can(not)? only be special summoned[^.]*\.','',t)
def shares(texts):
 return {f:sum(1 for t in texts if re.search(rx,t))/len(texts) for f,rx in R.EFFECT_FAMILIES.items()}
REAL=shares([clean(c['desc']) for c in json.loads((ROOT/'data/era-cards.json').read_text(encoding='utf8')) if c['type']!='Normal Monster' and c['desc'].strip()])
def generated(seed=7,n=6000):
 R._WEIGHTS.clear();R._USE_WEIGHTS.clear();R._SAMPLE_WEIGHTS.clear()
 return shares([clean(c['desc']) for c in R.make_cards(seed,[(None,None)]*n) if not c.get('flavor') and c['desc'].strip()])
def report(gen):
 print(f'{"effect family":18} {"real":>6} {"generated":>9}  ratio')
 for f in R.EFFECT_FAMILIES:print(f'{f:18} {REAL[f]:6.1%} {gen[f]:9.1%}  {gen[f]/max(REAL[f],1e-9):5.2f}')

def calibrate(rounds=5):
 factors=dict(R.FAMILY_FACTORS)
 for r in range(rounds):
  R.FAMILY_FACTORS.clear();R.FAMILY_FACTORS.update(factors)
  gen=generated(seed=100+r)
  worst=max(abs(gen[f]/max(REAL[f],1e-9)-1) for f in R.EFFECT_FAMILIES if REAL[f]>=.01)
  print(f'round {r+1}: worst family off by {worst:.0%}')
  for f in R.EFFECT_FAMILIES:
   if REAL[f]<.005 or gen[f]<=0:continue
   factors[f]=round(min(5,max(.15,factors.get(f,1)*(REAL[f]/gen[f])**.7)),3)
 R.FAMILY_FACTORS.clear();R.FAMILY_FACTORS.update(factors)
 s=(ROOT/'randomizer.py').read_text(encoding='utf8')
 new='FAMILY_FACTORS='+json.dumps(factors)+'   # calibrated by tools/randomizer_families.py --calibrate'
 s=re.sub(r'^FAMILY_FACTORS=.*$',lambda m:new,s,count=1,flags=re.M)
 write_bytes(ROOT/'randomizer.py',s.encode('utf8'))
 print('wrote',new)

if __name__=='__main__':
 if '--calibrate' in sys.argv:calibrate()
 report(generated())
