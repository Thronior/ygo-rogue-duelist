"""Draft Duels relics (draft_relics.py): the Worker's offer list matches eligible(), duel_setup is deterministic and
seat-symmetric, and writes temp/draft-relic-scripts.json for android/test_draft_relics.mjs to run in the engine."""
import json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import draft_relics,content,relic_fusions,archetype_relics,approved_relics
keys=draft_relics.eligible()
assert draft_relics.offers()==json.loads((ROOT/'multiplayer/cloudflare/draft-relics.json').read_text(encoding='utf-8')),'Run tools/generate_collector_catalog.py --draft-relics'
assert 'rulebook' in keys and not any(content.ART_INFO[k].get('tag')=='economy' for k in keys)
# 2026-11-15: fused relics are out of Draft, cursed relics stay in; rarity weights follow the shop price tier.
assert not set(keys)&relic_fusions.KEYS and set(keys)&set(approved_relics.CURSED_IDS)
price=lambda k:content.ARTIFACTS[k][1]
for k in keys:
 w=draft_relics.weight(k)/archetype_relics.RARITY.get(k,1.0)
 expected=.6 if k in approved_relics.CURSED_IDS and not price(k) else 1.0 if price(k)<=90 else .6 if price(k)<150 else .3 if price(k)<250 else .1
 assert abs(w-expected)<1e-3,(k,price(k),w)
assert draft_relics.weight('the_creator')<draft_relics.weight('returning_tide')<draft_relics.weight('final_hour')<draft_relics.weight('cursed_blood_crown')<draft_relics.weight('blade')==1.0
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
