"""Tag character packs in the shop (user, 2026-11-25).
- Both players on the same character: that character pack is offered twice, one copy each.
- Ryou Bakura (pack 'RANDOM', starting relic Duelist's Catalogue) hosting: the partner's character pack stayed out of the
  first shop because the teammate slot needed Bakura's own pack in the character slot. It is offered now.
Different characters still get one copy of each, and a pack never repeats otherwise."""
import sys,tempfile,uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import storage,content,campaign as game
(ROOT/'temp').mkdir(exist_ok=True)
storage.ROOT=Path(tempfile.mkdtemp(dir=ROOT/'temp',prefix='tag-char-packs-'));game.SAVE=storage.ROOT/'run.json'
from tag_campaign import TagCampaign
NAMES={c['name']:i for i,c in enumerate(content.CHARACTERS)}
p=storage.profile();p['unlocked']=list(range(len(content.CHARACTERS)))
def first_shop(chars,seed):
 s=TagCampaign(list(chars),[p,p],level=0,seed=seed)
 def command(seat,action,value=None):return s.command(seat,{'id':uuid.uuid4().hex,'revision':s.revision,'action':action,'value':value})['result']
 for seat in (0,1):command(seat,'auto')
 r=s.players[0]['routes']
 command(1,'ready',{'opponent':r[1],'selected':s.players[1]['selected']});command(0,'ready',{'opponent':r[0],'selected':s.players[0]['selected']})
 s.finish(0,7000,[])
 assert s.phase=='shop',s.phase
 return s,[x['id'] for x in s.shared['shop'] if x['kind']=='pack']
yugi=NAMES['Yugi Muto'] if 'Yugi Muto' in NAMES else 0;bakura=NAMES['Ryou Bakura'];kaiba=next(i for i,c in enumerate(content.CHARACTERS) if c['pack'] in content.PACK_BY_ID and i!=yugi and not c.get('opponent_only'))
checked=0
for seed in range(5):
 # Same character twice: two copies of its pack, every other pack once.
 for c in (yugi,kaiba):
  s,packs=first_shop((c,c),60+seed);own=content.CHARACTERS[c]['pack']
  assert packs.count(own)==2,(seed,c,packs)
  assert all(packs.count(x)==1 for x in packs if x!=own),packs
  checked+=1
 # Ryou Bakura hosting (his Duelist's Catalogue, no character pack of his own): the partner's pack is in the first shop.
 s,packs=first_shop((bakura,kaiba),70+seed)
 assert 'duelist_catalogue' in s.players[0]['artifacts'],s.players[0]['artifacts']
 assert content.CHARACTERS[kaiba]['pack'] in packs,(seed,packs)
 assert len(set(packs))==len(packs),packs
 # Bakura as the partner: the host's pack stays, nothing repeats.
 s,packs=first_shop((kaiba,bakura),80+seed)
 assert content.CHARACTERS[kaiba]['pack'] in packs and len(set(packs))==len(packs),(seed,packs)
 # Two different characters: one copy of each.
 s,packs=first_shop((yugi,kaiba),90+seed)
 own=[content.CHARACTERS[c]['pack'] for c in (yugi,kaiba)]
 assert all(packs.count(x)==1 for x in own) and len(set(packs))==len(packs),(seed,packs)
 checked+=3
print(f'PASS Tag character packs ({checked} shops): same character offers its pack twice, Ryou Bakura keeps the partner pack, different characters one each')
