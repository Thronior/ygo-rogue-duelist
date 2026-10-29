"""Audit or complete exact named-card references in character packs."""
import json,re,sys
from pathlib import Path
from collections import Counter
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import campaign as g

def references(card):
 by_name={c['name'].casefold():c['id'] for c in g.CARDS}
 result=set()
 for name in re.findall(r'"([^"\r\n]+)"',card['desc']):
  key=name.casefold()
  if key in by_name:result.add(by_name[key])
  elif key.endswith('s') and key[:-1] in by_name:result.add(by_name[key[:-1]])
 # Destiny Board abbreviates the four exact names to individual letters.
 if card['name']=='Destiny Board':
  result.update(g.BY_NAME['Spirit Message "'+letter+'"']['id'] for letter in 'INAL')
 return result

def complete(packs):
 preference={}
 for c in g.CARDS:
  counts=Counter(pool for p in packs for pool in ('common','rare') if c['id'] in p[pool])
  preference[c['id']]='rare' if counts['rare']>=counts['common'] or c['data']['type']&0xc0 else 'common'
 changes=[]
 for p in packs:
  if not p['id'].startswith('DRAFT-') or not p.get('draft_only'):continue
  present=set(p['common']+p['rare']+p.get('starter_support',[]));queue=list(sorted(present))
  while queue:
   cid=queue.pop(0)
   for ref in sorted(references(g.BY_ID[cid])):
    if ref in present:continue
    pool=preference[ref];p[pool].append(ref);present.add(ref);queue.append(ref)
    changes.append(dict(pack=p['name'],card=g.BY_ID[ref]['name'],pool=pool,requiredBy=g.BY_ID[cid]['name']))
 return changes

if __name__=='__main__':
 path=ROOT/'data/packs.json';packs=json.loads(path.read_text(encoding='utf8'));changes=complete(packs)
 if '--apply' in sys.argv:
  path.write_text(json.dumps(packs,indent=1)+'\n',encoding='utf8')
  log=ROOT/'data/character-pack-reference-additions.json'
  previous=json.loads(log.read_text(encoding='utf8')) if log.exists() else []
  seen={(row['pack'],row['card'],row['pool'],row['requiredBy']) for row in previous}
  for row in changes:
   key=(row['pack'],row['card'],row['pool'],row['requiredBy'])
   if key not in seen:previous.append(row);seen.add(key)
  log.write_text(json.dumps(previous,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 print(json.dumps(changes,ensure_ascii=True,indent=2))
 print(len(changes),'additions across',len({r['pack'] for r in changes}),'packs')
