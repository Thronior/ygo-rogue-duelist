"""Extract factual card/count records from the cited WCT 2004 deck tables."""
import json,re,sys,difflib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g
lines={}
for file in (ROOT/'temp').glob('wct-decks-*.json'):
 for number,text in re.findall(r'^L(\d+):[ \t]*(.*)$',json.loads(file.read_text(encoding='utf8')),re.M):lines[int(number)]=text.strip()
names={re.sub(r'[^a-z0-9]','',c['name'].lower()):c for c in g.CARDS}
fixes={'Nimble Monoga':'Nimble Momonga','Marie the Fallen One':'Darklord Marie','Black Pendent':'Black Pendant','Swords of Reavealing Light':'Swords of Revealing Light','Bracchio-radius':'Bracchio-raidus','Graveyeard and the Hand of Invitation':'Graveyard and the Hand of Invitation','Kumoontoko':'Kumootoko','Rock Orge Grotto #2':'Rock Ogre Grotto #2','Peguin Soldier':'Penguin Soldier','Haprie Lady Sisters':'Harpie Lady Sisters','Relingquished':'Relinquished','Red-Eyes B. Dragon':'Red-Eyes Black Dragon','Magican of Faith':'Magician of Faith','Hyo':'Hyo','Harpie\'s Brother':'Harpie\'s Brother'}
mapping={'Tea Gardner':22,'Tristan Taylor':12,'Yugi Muto':13,'Rex Raptor':8,'Espa Roba':16,'Weevil Underwood':10,'Bonz':9,'Mako Tsunami':18,'Mai Valentine':3,'Bandit Keith':4,'Joey Wheeler':2,'Maximillion Pegasus':7,'Arkana':17,'Umbra and Lumis':5,'Odion':15,'Ishizu Ishtar':14,'Marik Ishtar':27,'Seto Kaiba':1,'Yami Bakura':6,'(Yami) Marik Ishtar':11,'Yami Yugi':0}
fixes.update({'Air Marmot of Nefariousness':'Archfiend Marmot of Nefariousness','Stone D.':'Stone Dragon','Kaminarikozou':'Thunder Kid','Wicked Mirror':'Archfiend Mirror','Gate Degg':'Gate Deeg','Spiked Seadra':'Spike Seadra',"Harpie's Brother":'Sky Scout','Call of the Dark':'Call of Darkness','Magic Thorn':'Magical Thorn','Kuwagata Alpha':'Kuwagata','Dark Magic Ritual':'Black Magic Ritual'})
fixes.update({'Holograph':'Holograh','Bright Castle':'Shine Palace'})
headers=[]
for number,text in sorted(lines.items()):
 m=re.match(r'(\d{3})\s+(.+?)\s+(\*+)\s+\((\d+)\)',text)
 if m:headers.append((number,int(m[1]),m[2].strip(),len(m[3]),int(m[4])))
headers.append((1133,0,'END',0,0));result={};missing=[]
for h,next_h in zip(headers,headers[1:]):
 start,num,name,tier,capacity=h
 if name not in mapping:continue
 main=[];extra=[]
 for line in range(start+1,next_h[0]):
  raw=lines.get(line,'').strip()
  if not raw or raw.startswith('-'):continue
  if raw=='(Unknown)':continue
  isextra=raw.startswith('(') and raw.endswith(')')
  if isextra:raw=raw[1:-1]
  m=re.match(r'(.+?)\s+[xX](\d+)$',raw);count=int(m[2]) if m else 1;card=m[1] if m else raw
  card=fixes.get(card,card);key=re.sub(r'[^a-z0-9]','',card.lower())
  c=names.get(key)
  if not c:missing.append((name,card,difflib.get_close_matches(key,names,2)));continue
  (extra if isextra else main).extend([c['id']]*count)
 result[str(mapping[name])]=dict(character=mapping[name],name=name,game='World Championship Tournament 2004',source='https://gamefaqs.gamespot.com/gba/919562-yu-gi-oh-world-championship-tournament-2004/faqs/28716',source_number=num,difficulty=tier,listed_size=capacity,main=main,extra=extra)
if missing:
 for item in missing:print('UNRESOLVED',item)
 raise SystemExit(1)
for k,v in result.items():
 if len(v['main'])!=v['listed_size']:print('COUNT',v['name'],len(v['main']),v['listed_size'])
(ROOT/'data/opponents.json').write_text(json.dumps(result,indent=2),encoding='utf8')
print('Imported',len(result),'complete game deck lists')
