"""Loadouts from Discord feedback, 2026-11-08: Pegasus' standard loadout starts with Dark-Eyes Illusionist instead of
Thousand-Eyes Idol, and Bandit Keith's second loadout is the Zoa / Metalmorph / Metalzoa build with Metal Coating."""
import sys,random,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,content,storage,archetype_relics
base=Path(tempfile.mkdtemp(prefix='keith-metalmorph-',dir=ROOT/'temp'));storage.ROOT=base;g.SAVE=base/'run.json'
profile=storage.profile();profile['unlocked']=sorted(set(profile['unlocked'])|{4,7});profile['variants_unlocked']=True;storage.write(base/'profile.json',profile)
name=lambda cid:g.BY_ID[cid]['name']

pegasus=g.new_run(7,random.Random(1))
assert [name(cid) for cid in pegasus['guaranteed']]==['Relinquished','Black Illusion Ritual','Dark-Eyes Illusionist'],pegasus['guaranteed']

keith=g.new_run(4,random.Random(2),variant=1)
assert keith['variant_name']=='Metalmorph'
assert [name(cid) for cid in keith['guaranteed']]==['Zoa','Metalmorph','Metalzoa']
assert keith['artifacts']==['metal_coating'],keith['artifacts']
assert keith['pack_ids']==['DRAFT-BANDIT-KEITH','DRAFT-BANDIT-KEITH','CUSTOM-STONE-AND-STEEL','JP-PP7']

pack=content.PACK_BY_ID['DRAFT-BANDIT-KEITH']
for card in ('Zoa','Metalmorph','Metalzoa','Rare Metalmorph','Red-Eyes Black Dragon','Red-Eyes Black Metal Dragon'):
 assert g.BY_NAME[card]['id'] in pack['common']+pack['rare'],card

# Like LEVEL UP, the Duel's Deck gains a Metalmorph when the player took it out.
morph=g.BY_NAME['Metalmorph']['id']
normals=[cid for cid,c in g.BY_ID.items() if c['data']['type']==0x11][:20]
start=len(keith['pool']);keith['pool']+=normals+normals
keith['selected']=[i for i in range(len(keith['pool'])) if keith['pool'][i]!=morph and (i>=start or i in keith['selected'])]
keith.update(stage='draft');g.routes(keith,random.Random(3));keith['opponent']=keith['routes'][0]
request=g.prepare_duel(keith,random.Random(4))
lua=(g.RUNTIME/'puzzles/shadow-run.lua').read_text(encoding='utf8')
assert f'Debug.AddCard({morph},0,0,LOCATION_DECK' in lua,'Metal Coating keeps a Metalmorph in the Deck'

# The relic is only offered to pools that hold Metalmorph cards.
assert archetype_relics.has_member('metal_coating',{'pool':[morph]})
assert not archetype_relics.has_member('metal_coating',{'pool':[g.BY_NAME['Blue-Eyes White Dragon']['id']]})
print('PASS Pegasus starts with Dark-Eyes Illusionist; Keith Metalmorph loadout, pack, Deck copy and shop gating')
