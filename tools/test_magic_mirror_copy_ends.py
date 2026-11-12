"""Magic Mirror's copy lasts one Duel (Discord 2026-11-12, Kzulu: a copied stat relic kept boosting cards in the shop).
A real run through the backend: the copy is chosen when the Duel begins and cleared once the Duel is finished."""
import sys,tempfile,random
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,approved_relics as ar
# Never touch saves/: the run and profile live in a temporary folder.
storage.ROOT=Path(tempfile.mkdtemp(dir=ROOT/'temp',prefix='magic-mirror-'));g.SAVE=storage.ROOT/'run.json'
run=g.new_run(0,random.Random(7));g.auto_deck(run)
run['artifacts']=['magic_mirror','sword']
run['opponent']=run['routes'][0];g.prepare_duel(run)
assert run.get('mirror_copy')=='sword',run.get('mirror_copy')
assert ar.copies(run,'sword')==2,'the copy counts during the Duel'
g.finish_duel(run,dict(protocol=1,id=run['duel']['id'],winner=0,lp=8000,reason=0,events=[]))
assert run.get('mirror_copy') is None,run.get('mirror_copy')
assert ar.copies(run,'sword')==1,'only the owned relic counts in the shop'
print('PASS Magic Mirror copy ends with its Duel; the shop counts only owned relics')
