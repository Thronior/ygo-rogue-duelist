"""Ryou Bakura (user, 2026-11-18): the standard loadout starts with Duelist's Catalogue; Fortune's Favorite opens 4 copies of
one random character's draft pack and starts with an archetype relic for an archetype that pack holds (2+ different cards)."""
import random,sys,tempfile
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,campaign_expansion as ce,archetype_relics as a
from content import PLAYABLE_IDS,CHARACTERS,PACK_BY_ID
BAKURA=next(i for i,c in enumerate(CHARACTERS) if c['name']=='Ryou Bakura')
(ROOT/'temp').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='bakura-',dir=ROOT/'temp') as tmp:
 base=Path(tmp);storage.ROOT=base;g.SAVE=base/'run.json';g.RUNTIME=base/'runtime';g.RUNTIME.mkdir()
 profile=storage.profile();profile['unlocked']=list(PLAYABLE_IDS);profile['variants_unlocked']=True;storage.write(base/'profile.json',profile)
 r=g.new_run(BAKURA,random.Random(1))
 assert r['artifacts']==['duelist_catalogue'],r['artifacts']
 seen=Counter()
 for seed in range(25):
  r=g.new_run(BAKURA,random.Random(seed),0,1)
  packs=r['pack_ids'];assert len(packs)==4 and len(set(packs))==1 and packs[0].startswith('DRAFT-'),packs
  relic=r['artifacts'][0];assert relic in ce.pack_archetype_relics(packs[0]),(packs[0],relic)
  # The relic's archetype really is in the pack: 2+ different cards.
  pack=PACK_BY_ID[packs[0]];test=a.member_test(relic,{'pool':[],'artifacts':[]})
  assert len({g.BY_ID[c]['name'] for c in pack['common']+pack['rare'] if c in g.BY_ID and test(g.BY_ID[c])})>=2
  assert relic not in a.SPECIFIC_CARDS
  seen[packs[0]]+=1
 assert len(seen)>5,'different characters come up'
 assert not ce.pack_archetype_relics('DRAFT-ANUBIS') and 'DRAFT-ANUBIS' not in seen
print(f'PASS Ryou Bakura: Duelist\'s Catalogue start; Fortune\'s Favorite 4x one character pack + its archetype relic ({len(seen)} packs seen)')
