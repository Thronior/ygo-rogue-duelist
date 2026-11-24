"""Destiny Board relics (user, 2026-11-24, after CITYDRIVER on Discord): Destiny Hourglass offers the Destiny Board and
Spirit Message pieces the card pool is missing first (shop bonus and when acquired), then its whole pool; owning it and
Sealed Fate fuses Final Message."""
import sys,random,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,content,storage,archetype_relics as a,relic_fusions
(ROOT/'temp').mkdir(exist_ok=True)
base=Path(tempfile.mkdtemp(prefix='destiny-relics-',dir=ROOT/'temp'));storage.ROOT=base;g.SAVE=base/'run.json'
p=storage.profile();p['unlocked']=list(content.PLAYABLE_IDS);storage.write(base/'profile.json',p)
r=g.new_run(0,random.Random(7));r.update(stage='shop',gold=1000,artifacts=['destiny_hourglass'])
pieces=sorted(a.DESTINY_PIECES)
filler=[g.BY_NAME['Pot of Greed']['id']]*20
r['pool']=filler+[g.BY_NAME[n]['id'] for n in pieces[:4]]
for seed in range(12):
 g.restock(r,random.Random(seed));assert g.BY_ID[[x for x in r['shop'] if x['kind']=='single'][-1]['id']]['name']==pieces[4],seed
r['pool']=filler+[g.BY_NAME[n]['id'] for n in pieces]
seen=set()
for seed in range(40):
 g.restock(r,random.Random(seed));c=g.BY_ID[[x for x in r['shop'] if x['kind']=='single'][-1]['id']];assert a.matches('destiny_hourglass',c),c['name'];seen.add(c['name'])
assert 'Final Countdown' in seen,'with all five pieces its whole pool comes up'
# When acquired: a missing piece.
r['pool']=filler+[g.BY_NAME[n]['id'] for n in pieces if n!='Destiny Board'];r['artifacts']=[]
got=g.acquire_relic(r,'destiny_hourglass',random.Random(3));assert [g.BY_ID[c]['name'] for c in got]==['Destiny Board'],got
assert 'missing come first' in content.ARTIFACTS['destiny_hourglass'][2]
# Final Message: both relics fuse.
r['artifacts']=['destiny_hourglass','sealed_fate'];made=relic_fusions.fuse(r)
assert [m['relic'] for m in made]==['final_message'] and r['artifacts']==['final_message'],(made,r['artifacts'])
assert content.ARTIFACTS['final_message'][0]=='Final Message'
print('PASS Destiny Hourglass missing pieces first; Destiny Hourglass + Sealed Fate fuse into Final Message')
