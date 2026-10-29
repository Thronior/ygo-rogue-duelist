"""Current campaign decks and collection sources; never read retired deck files."""
import content, random

def watch_catalog():
 import campaign as g, endless
 decks={}
 def add(i,record,label):
  rows=decks.setdefault(str(i),[])
  signature=(sorted(record['main']),sorted(record.get('extra',[])))
  same=next((r for r in rows if (sorted(r['main']),sorted(r['extra']))==signature),None)
  if same:same['label']+=' / '+label
  else:rows.append(dict(main=record['main'][:],extra=record.get('extra',[])[:],label=label))
 for i,variant in content.TUTORIAL_OPPONENTS.items():
  add(i,dict(main=g.opponent_deck(0,rng=random.Random(0),opponent=i,tutorial_variant=variant),extra=[]),'Opening Duel')
 for tier in range(3):
  for i in content.eligible_opponents(tier*3+1):add(i,content.opponent_record(tier*3+1,i),'Tier '+str(tier+1))
 for i in content.eligible_opponents(0,loop=1):add(i,content.opponent_record(0,i,loop=1),'Endless')
 add(-1,endless.CHAMPION,'World Championship')
 opponents={'-1':dict(name=endless.CHAMPION['name'],sprite='dm01.png',background='character-backgrounds/0.jpg')}
 for i,row in content.UC_OPPONENTS.items():opponents[str(i)]=dict(content.CHARACTERS[i])
 return dict(cpuWatchDecks=decks,cpuWatchOpponents=opponents)

def card_sources(cid):
 import campaign as g
 cid=int(cid)
 if cid not in g.BY_ID:return dict(packs=[],opponents=[])
 identity=g.card_identity(cid)
 def includes(ids):return any(x in g.BY_ID and g.card_identity(x)==identity for x in ids)
 packs=[dict(id=p['id'],name=p['name']) for p in content.PACKS if includes(p['common']+p['rare']+p.get('starter_support',[]))]
 catalog=watch_catalog();opponents=[]
 for i,rows in catalog['cpuWatchDecks'].items():
  name=catalog['cpuWatchOpponents'].get(i,{}).get('name') or content.CHARACTERS[int(i)]['name']
  for row in rows:
   if includes(row['main']+row['extra']):
    character=catalog['cpuWatchOpponents'].get(i) or content.CHARACTERS[int(i)]
    opponents.append(dict(name=name,label=row['label'],sprite=character['sprite']))
 return dict(packs=packs,opponents=opponents)
