"""All authored decks use Ultimate Collector's shared copy limits."""
import json,sys,tempfile
from collections import Counter
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import deck_files
cards={c['id']:c for c in json.loads((ROOT/'data/era-cards.json').read_text(encoding='utf8'))}
limits=json.loads((ROOT/'data/collector-banlist.json').read_text(encoding='utf8'))['names']
def verify(d,label,rules={}):
 counts=Counter(cards[c]['name']for s in ('main','extra','side')for c in d.get(s,[]))
 maximum=lambda name:3 if rules.get('ignore_limited_list') else min(3,rules.get('limit_exceptions',{}).get(name,limits.get(name,3)))
 assert all(n<=maximum(name)for name,n in counts.items()),label
# Some user-approved opponent records relax the list for their own deck (e.g. Amazoness Paladin T2 may run
# 2 Call of the Haunted and 2 Mystical Space Typhoon via limit_exceptions; Obelisk T4 ignores it). The game
# reads those decks with the record as fallback, so check them the same way.
index=json.loads((ROOT/'data/decks/index.json').read_text(encoding='utf8'))
rules={}
def scan(node):
 if isinstance(node,dict):
  if node.get('limit_exceptions') or node.get('ignore_limited_list'):
   for name in [node.get('deck'),*(node.get('tier_decks') or {}).values()]:
    if isinstance(name,str):rules[index.get(name,name)]={k:node[k] for k in ('limit_exceptions','ignore_limited_list') if k in node}
  for v in node.values():scan(v)
 elif isinstance(node,list):
  for v in node:scan(v)
for f in (ROOT/'data').glob('*.json'):
 if f.name!='era-cards.json':scan(json.loads(f.read_text(encoding='utf8')))
paths=list((ROOT/'data/decks').glob('*.ydk'))
for p in paths:verify(deck_files.read(p.stem,rules.get(p.stem,{})),p.name,rules.get(p.stem,{}))
pre=json.loads((ROOT/'data/preconstructed.json').read_text(encoding='utf8'))['decks']
for d in pre:verify(d,d.get('name'))
# Check name-grouping, combined sections, and future forbidden entries without editing real decks.
with tempfile.TemporaryDirectory(prefix='deck-limits-',dir=Path.cwd()) as temp:
 assert Path(temp).resolve().is_relative_to(Path.cwd().resolve())
 base=Path(temp);folder=base/'decks';folder.mkdir();(folder/'index.json').write_text('{}');(base/'card-aliases.json').write_text('{}')
 fixture=[{'id':i,'name':'Filler '+str(i)}for i in range(1,21)]+[{'id':30,'name':'Limited'},{'id':31,'name':'Limited'},{'id':32,'name':'Forbidden'}]
 (base/'era-cards.json').write_text(json.dumps(fixture));(base/'collector-banlist.json').write_text(json.dumps({'names':{'Limited':1,'Forbidden':0}}))
 def put(extra): (folder/'test.ydk').write_text('#main\n'+'\n'.join(map(str,range(1,21)))+'\n'+extra+'\n')
 with patch.object(deck_files,'ROOT',folder):
  put('30');deck_files.read('test',{})
  for extra in ['30\n!side\n31','30\n#extra\n31','32']:
   put(extra)
   try:deck_files.read('test',{})
   except ValueError as err:assert 'Ultimate Collector allows' in str(err)
   else:raise AssertionError('Illegal deck accepted: '+extra)
print(f'PASS {len(paths)} authored opponent/tutorial/endless/champion decks and {len(pre)} preconstructed decks; aliases by name; combined sections; forbidden-card rejection.')
