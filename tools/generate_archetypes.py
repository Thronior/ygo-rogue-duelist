"""Write data/archetypes.json: archetypes with at least two monsters in the card pool, for Name Changer.

Names come from EDOPro's runtime/config/strings.conf. Rerun after the card pool changes.
"""
import json,re,sys
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import campaign as g

FUSION=0x46  # The Polymerization/Fusion set names spells, not a monster family.

def generate():
 names={}
 for line in (ROOT/'runtime/config/strings.conf').read_text(encoding='utf8').splitlines():
  m=re.match(r'!setname 0x([0-9a-fA-F]+) (.+)',line.strip())
  if m:names[int(m.group(1),16)]=m.group(2).split('\t')[0].split('|')[0].strip()
 used=Counter(s for c in g.CARDS if c['data']['type']&1 for s in c['data'].get('setcodes',[]))
 rows=sorted(({'setcode':s,'name':names[s],'monsters':n} for s,n in used.items() if s in names and n>=2 and s!=FUSION),key=lambda r:r['name'].casefold())
 (ROOT/'data/archetypes.json').write_text(json.dumps({'archetypes':rows},indent=1,ensure_ascii=False)+'\n',encoding='utf8')
 return rows

if __name__=='__main__':print(len(generate()),'archetypes')
