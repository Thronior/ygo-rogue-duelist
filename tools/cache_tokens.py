"""Audit token-producing era scripts and cache every token variant they create."""
import sys,json,re,sqlite3,urllib.request,shutil
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
# Variant ranges are the actual IDs in the bundled summoning scripts.
SUMMONERS={86871614:[86871615],86801871:[86801872],12965761:[12965762],24874630:[24874631],91512835:[91512836],21770260:[21770261],62543393:[62543394],22493811:[22493812],40703222:[40703223],29843091:[29843092,29843093,29843094],63442604:[63442605],73915051:[73915052,73915053,73915054,73915055],65810489:[65810490],60764581:[60764582,60764583]}
def manifest():
 cards=json.loads((ROOT/'data/era-cards.json').read_text(encoding='utf8'));byid={c['id']:c for c in cards}
 for card in cards:
  path=ROOT/'runtime/script/official'/f'c{card["id"]}.lua'
  if path.exists() and 'Duel.CreateToken' in path.read_text(encoding='utf8'):
   assert card['id'] in SUMMONERS,('Uncatalogued token summoner',card['name'])
 db=sqlite3.connect(ROOT/'runtime/expansions/cards.cdb');entries=[]
 for summoner,ids in SUMMONERS.items():
  assert summoner in byid
  for cid in ids:
   row=db.execute('SELECT t.name,d.type FROM texts t JOIN datas d ON d.id=t.id WHERE t.id=?',(cid,)).fetchone()
   assert row and row[1]&16384,(cid,row)
   entries.append(dict(id=cid,name=row[0],summoner=summoner,summoner_name=byid[summoner]['name'],image=f'https://images.ygoprodeck.com/images/cards/{cid}.jpg'))
 (ROOT/'data/tokens.json').write_text(json.dumps(entries,indent=2),encoding='utf8');return entries
if __name__=='__main__':
 tokens=manifest()
 for t in tokens:
  path=ROOT/'assets/cards'/f'{t["id"]}.jpg';dest=ROOT/'runtime/pics'/path.name
  if not path.exists():
   data=urllib.request.urlopen(t['image'],timeout=20).read();tmp=path.with_suffix('.token-download');tmp.write_bytes(data)
   with Image.open(tmp) as im:im.verify()
   tmp.replace(path)
  with Image.open(path) as im:im.verify()
  shutil.copy2(path,dest)
  print('Cached',t['id'],t['name'],flush=True)
 print('PASS:',len(tokens),'token variants from',len(SUMMONERS),'era token summoners')
