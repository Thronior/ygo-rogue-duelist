"""EDOPro-editable authoritative opponent deck files. Re-read before each duel."""
from pathlib import Path
import json
from collections import Counter
ROOT=Path(__file__).parent/'data/decks'
def read(name,fallback):
 mapping=json.loads((ROOT/'index.json').read_text(encoding='utf8')) if (ROOT/'index.json').exists() else {}
 p=ROOT/(mapping.get(name,name)+'.ydk')
 if not p.exists():raise ValueError('Missing opponent deck: '+str(p))
 result=dict(fallback);result.update(main=[],extra=[],side=[]);section='main'
 for line in p.read_text(encoding='utf-8-sig').splitlines():
  line=line.strip()
  if line=='#main':section='main'
  elif line=='#extra':section='extra'
  elif line=='!side':section='side'
  elif line and not line.startswith(('#','!')):
   if not line.isdecimal():raise ValueError('Invalid card ID in '+str(p)+': '+line)
   result[section].append(int(line))
 if len(result['main'])<20:raise ValueError(str(p)+' needs at least 20 main-deck cards.')
 # Invalid edits should stop before launching the core, rather than strand a run.
 cards={c['id']:c for c in json.loads((ROOT.parent/'era-cards.json').read_text(encoding='utf8'))}
 aliases={int(k):v for k,v in json.loads((ROOT.parent/'card-aliases.json').read_text(encoding='utf8')).items()}
 all_cards=result['main']+result['extra']+result['side']
 missing=[c for c in all_cards if aliases.get(c,c) not in cards]
 if missing:raise ValueError(p.name+': unknown/out-of-pool card ID '+str(missing[0]))
 counts=Counter(aliases.get(c,c) for c in all_cards)
 if any(n>3 for n in counts.values()):raise ValueError(p.name+': more than three copies of '+cards[next(c for c,n in counts.items() if n>3)]['name'])
 for section in ('main','extra','side'):result[section]=[aliases.get(c,c) for c in result[section]]
 return result
