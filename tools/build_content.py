"""Rebuild offline pack data from YGOJSON's public, versioned data export."""
import json, sys, urllib.request, concurrent.futures, re, sqlite3
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.stdout.reconfigure(encoding='utf8')
old=json.loads((ROOT/'data/cards.json').read_text(encoding='utf-8-sig'))
cards={c['id']:c for c in old if c['date']<='2004-03-31'}
allcards=json.loads((ROOT/'dependencies/ygojson/cards.json').read_text(encoding='utf8'))
byuuid={c['id']:c for c in allcards}
sets=json.loads((ROOT/'dependencies/ygojson/sets.json').read_text(encoding='utf8'))
db=sqlite3.connect(ROOT/'runtime/expansions/cards.cdb')
aliases={}
for cid,c in list(cards.items()):
 alias=c['data'].get('alias',0)
 if alias:
  row=db.execute('select name from texts where id=?',(alias,)).fetchone()
  if row and row[0]==c['name']:
   aliases[str(cid)]=alias
   canonical=json.loads(json.dumps(c));canonical['id']=alias;canonical['data']['code']=alias;canonical['data']['alias']=0
   canonical['image']=f'https://images.ygoprodeck.com/images/cards/{alias}.jpg'
   cards.pop(cid);cards[alias]=canonical
def import_card(c,date):
 name=c.get('text',{}).get('en',{}).get('name')
 existing=next((x['id'] for x in cards.values() if x['name']==name),None)
 if existing:return existing
 for password in c.get('passwords',[]):
  cid=int(password)
  if cid in cards:return cid
  row=db.execute('select * from datas where id=?',(cid,)).fetchone()
  txt=db.execute('select * from texts where id=?',(cid,)).fetchone()
  if not row or not txt:continue
  _,ot,alias,setcode,typ,atk,defense,level,race,attr,cat=row
  types={1:'Warrior',2:'Spellcaster',4:'Fairy',8:'Fiend',16:'Zombie',32:'Machine',64:'Aqua',128:'Pyro',256:'Rock',512:'Winged Beast',1024:'Plant',2048:'Insect',4096:'Thunder',8192:'Dragon',16384:'Beast',32768:'Beast-Warrior',65536:'Dinosaur',131072:'Fish',262144:'Sea Serpent',524288:'Reptile'}
  attributes={1:'EARTH',2:'WATER',4:'FIRE',8:'WIND',16:'LIGHT',32:'DARK',64:'DIVINE'}
  text=c.get('text',{}).get('en',{})
  cards[cid]=dict(id=cid,name=txt[1],desc=txt[2],type='Fusion Monster' if typ&64 else 'Effect Monster' if typ&32 else 'Normal Monster' if typ&1 else 'Spell Card' if typ&2 else 'Trap Card',race=types.get(race,'Normal'),attribute=attributes.get(attr,''),level=level&255,atk=atk,defense=defense,date=date,sets=[],image=f'https://images.ygoprodeck.com/images/cards/{cid}.jpg',data=dict(code=cid,alias=alias,setcodes=[(setcode>>n)&65535 for n in (0,16,32,48) if (setcode>>n)&65535],type=typ,level=level&255,attribute=attr,race=str(race),attack=atk,defense=defense,lscale=0,rscale=0,link_marker=0),strings=list(txt[3:]))
  return cid
english=['Legend of Blue Eyes White Dragon','Metal Raiders','Spell Ruler',"Pharaoh's Servant",'Labyrinth of Nightmare','Legacy of Darkness','Pharaonic Guardian',"Magician's Force",'Dark Crisis','Invasion of Chaos']
english+=['Tournament Pack: 1st Season','Tournament Pack: 2nd Season','Tournament Pack: 3rd Season','Tournament Pack 4']
japanese=['Spell of Mask','Labyrinth of Nightmare','Struggle of Chaos','Mythological Age','Pharaonic Guardian','The New Ruler','Advent of Union','Champion of Black Magic','Power of the Guardian','Threat of the Dark Demon World','Controller of Chaos','Invader of Darkness (set)','The Sanctuary in the Sky (set)',"Pharaoh's Inheritance"]
japanese+=['Booster Chronicle','Duelist Legacy Volume.1','Duelist Legacy Volume.2','Duelist Legacy Volume.3','Duelist Legacy Volume.4','Duelist Legacy Volume.5','Premium Pack 5','Premium Pack 6']
packs=[]
for region,names,locale in [('EN',english,'na'),('JP',japanese,'jp')]:
 for name in names:
  s=next(s for s in sets if s['name'].get('en')==name and locale in s.get('locales',{}))
  l=s['locales'][locale]; code=l.get('prefix','').strip('-'); date=l['date']
  if not code: code={'Labyrinth of Nightmare':'LN','Pharaonic Guardian':'PH','Invader of Darkness (set)':'307','The Sanctuary in the Sky (set)':'308'}[name]
  common,rare=set(),set()
  for content in s['contents']:
   if locale not in content.get('locales',[]): continue
   for printing in content['cards']:
    c=byuuid[printing['card']]
    cid=import_card(c,date)
    if cid:(common if printing.get('rarity')=='common' else rare).add(cid)
  if not common and not rare:
   # Four incomplete YGOJSON tables are restored from published set checklists.
   text=json.loads((ROOT/f'temp/pack-{code}.json').read_text(encoding='utf8'))
   rows=list(re.finditer(code+r'-(\d+) - \$[\d.]+ (.*?)(?='+code+r'-\d+|\n|$)',text))
   for m in rows:
    namecard=m.group(2).strip()
    raw=next((x for x in allcards if x.get('text',{}).get('en',{}).get('name')==namecard),None)
    assert raw,namecard
    cid=import_card(raw,date)
    if cid:
     before=text[:m.start()]
     iscommon=before.rfind('## Common')>max(before.rfind('## '+x) for x in ['Rare','Ultra','Super','Secret','Normal'])
     (common if iscommon else rare).add(cid)
  rare-=common
  if not common and rare:common=set(rare)
  assert common and rare,(name,len(common),len(rare))
  packs.append(dict(id=region+'-'+code,name=name.replace(' (set)',''),region=region,code=code,date=date,
    image=l.get('image',''),common=sorted(common),rare=sorted(rare),size=9 if region=='EN' else 5))
# Explicit user-requested opponent cards outside the standard pack cutoff.
for card in json.loads((ROOT/'data/opponent-card-exceptions.json').read_text(encoding='utf8')):
 cards[card['id']]=card
from update_pack_rarities import annotate
annotate(packs)
(ROOT/'data/packs.json').write_text(json.dumps(packs,indent=2),encoding='utf8')
(ROOT/'data/era-cards.json').write_text(json.dumps(list(cards.values()),ensure_ascii=False),encoding='utf8')
(ROOT/'data/card-aliases.json').write_text(json.dumps(aliases),encoding='utf8')
print('Built',len(packs),'main booster releases;',len(cards),'era cards')
for p in packs: print(p['id'],p['name'],len(p['common'])+len(p['rare']))
