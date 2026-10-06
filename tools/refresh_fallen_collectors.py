"""Snapshot shared UC opponents at release time, never during gameplay."""
import json,sys,urllib.request
from pathlib import Path
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))

def refresh(rows=None):
 import content,fallen_collectors
 if rows is None:
  config=json.loads((ROOT/'android/web/multiplayer-config.json').read_text())
  req=urllib.request.Request(config['signalingUrl'].rstrip('/')+'/collector/fallen',data=b'{}',headers={'Content-Type':'application/json','User-Agent':'YGO-release'})
  with urllib.request.urlopen(req,timeout=60) as response:data=json.load(response)
  if not isinstance(data.get('fallen'),list):raise ValueError('Invalid shared Collector response')
  rows=data['fallen']
 target=ROOT/'data/fallen-collectors.json'
 old=json.loads(target.read_text(encoding='utf8'))['opponents'] if target.exists() else []
 combined={}
 for row in fallen_collectors.sanitize(old+rows):
  combined[row['id'] or json.dumps(row,sort_keys=True)]=row
 identities={row['id']:row['opponent_id'] for row in old}
 next_id=max(identities.values(),default=len(content.CHARACTERS)-1)+1
 for row in combined.values():
  if row['id'] not in identities:identities[row['id']]=next_id;next_id+=1
  row['opponent_id']=identities[row['id']]
 opponents=sorted(combined.values(),key=lambda row:row['opponent_id'])
 data={'schema':1,'source':'shared-ultimate-collector-registry','updatedAt':datetime.now(timezone.utc).isoformat(),'opponents':opponents}
 # Keep the previous roster intact if the request or validation fails.
 temporary=target.with_suffix('.tmp');temporary.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8');temporary.replace(target)
 print(f'Bundled {len(opponents)} shared Ultimate Collector opponents; received {len(rows)} server records.')
 return data

if __name__=='__main__':refresh()
