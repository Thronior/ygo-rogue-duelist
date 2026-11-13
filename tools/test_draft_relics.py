"""Draft Duels relics (draft_relics.py): the Worker's offer list matches eligible(), duel_setup is deterministic and
seat-symmetric, and writes temp/draft-relic-scripts.json for android/test_draft_relics.mjs to run in the engine."""
import json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import draft_relics,content
keys=draft_relics.eligible()
assert keys==json.loads((ROOT/'multiplayer/cloudflare/draft-relics.json').read_text(encoding='utf-8')),'Run tools/generate_collector_catalog.py --draft-relics'
assert 'rulebook' in keys and not any(content.ART_INFO[k].get('tag')=='economy' for k in keys)
deck={'main':[content_id for content_id in []],'extra':[]}
def setup(a,b,seed=7):return draft_relics.duel_setup({'relics':[a,b],'characters':[0,2],'decks':[{'main':[],'extra':[]}]*2,'seed':seed})
assert setup([],[])=={'passives':'','draw':5,'enemyDraw':5}
assert setup(['rulebook'],[])['draw']==1
mirror=setup(['magic_mirror','mage','blade'],[],3);assert mirror==setup(['magic_mirror','mage','blade'],[],3),'mirror copy must not differ between clients'
cases=[[k] for k in keys]
# Accumulated relics, as after several drafts.
for i in range(0,len(keys),7):cases.append(keys[i:i+7])
out=[{'relics':c,**setup(c,c[::-1],i)} for i,c in enumerate(cases)]
(ROOT/'temp').mkdir(exist_ok=True);(ROOT/'temp/draft-relic-scripts.json').write_text(json.dumps(out),encoding='utf-8')
print(f'PASS {len(keys)} draft relics, {len(out)} engine cases written')
