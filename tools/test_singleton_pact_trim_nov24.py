"""Singleton Pact (Discord 2026-11-24): copies already in the Deck when the relic arrives leave the Deck at once (they stay
owned) and auto-fill tops the Deck up to its minimum, so the Deck follows the 1-copy rule without the player removing them by hand and the next duel can start."""
import sys,random,tempfile
from pathlib import Path
from collections import Counter
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,content,cursed_relics
(ROOT/'temp').mkdir(exist_ok=True)
base=Path(tempfile.mkdtemp(prefix='singleton-',dir=ROOT/'temp'));storage.ROOT=base;g.SAVE=base/'run.json'
p=storage.profile();p['unlocked']=list(content.PLAYABLE_IDS);storage.write(base/'profile.json',p)
r=g.new_run(2,random.Random(5));g.auto_deck(r)
for _ in range(2):cid=r['pool'][r['selected'][-1]];r['pool'].append(cid);r['selected'].append(len(r['pool'])-1)
dupes=lambda:sum(v>1 for v in Counter(g.limit_identity(r['pool'][i]) for i in r['selected']).values())
assert dupes()>=1
pool=len(r['pool'])
r['cursed_offer']=dict(options=['cursed_singleton_pact'])
cursed_relics.choose(r,'cursed_singleton_pact',random.Random(1))
assert dupes()==0,'extra copies left the Deck'
assert len(r['pool'])==pool,'the cards stay owned'
assert g.validate(r) is None,g.validate(r)
print('PASS Singleton Pact removes extra Deck copies when acquired (auto-fill tops the Deck up); the cards stay owned')
