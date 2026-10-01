"""Keep the service's legal card IDs in sync with the actual game catalog."""
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import campaign

def generate():
 cards=[{'id':c['id'],'name':c['name'],'type':c['type'],'data':{'type':c['data']['type'],'alias':c['data'].get('alias',0)}} for c in campaign.CARDS]
 (ROOT/'multiplayer/cloudflare/collector-cards.json').write_text(json.dumps(cards,separators=(',',':')),encoding='utf-8')
 rules=json.loads((ROOT/'data/collector-banlist.json').read_text())
 limits={c['id']:rules['names'][c['name']] for c in campaign.CARDS if c['name'] in rules['names']}
 path=ROOT/'android/web/collector-rules.js';source=path.read_text(encoding='utf-8');start=source.index('Object.freeze(')+len('Object.freeze(');end=source.index(');',start)
 path.write_text(source[:start]+json.dumps(limits)+source[end:],encoding='utf-8')
if __name__=='__main__':generate()
