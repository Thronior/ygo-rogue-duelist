"""All authored decks use Ultimate Collector's shared copy limits."""
import json,sys,tempfile
from collections import Counter
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import deck_files
cards={c['id']:c for c in json.loads((ROOT/'data/era-cards.json').read_text(encoding='utf8'))}
limits=json.loads((ROOT/'data/collector-banlist.json').read_text(encoding='utf8'))['names']
def verify(d,label):
 counts=Counter(cards[c]['name']for s in ('main','extra','side')for c in d.get(s,[]))
 assert all(n<=limits.get(name,3)for name,n in counts.items()),label
paths=list((ROOT/'data/decks').glob('*.ydk'))
for p in paths:verify(deck_files.read(p.stem,{}),p.name)
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
