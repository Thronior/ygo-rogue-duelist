import sys,json,random
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT));sys.path.insert(0,str(ROOT/'tools'))
import campaign as g,content,card_rarity
from pack_odds import inspect_pack
from complete_character_pack_references import complete
from copy import deepcopy
rows=json.loads((ROOT/'data/character-pack-second-sources.json').read_text(encoding='utf-8'))
assert len(rows['additions'])==88
assert not complete(deepcopy(content.PACKS))
for row in rows['additions']:
 cid=g.BY_NAME[row['card']]['id'];p=next((p for p in content.PACKS if p['name']==row['pack'] and p.get('draft_only')),None)
 if p is None:
  character=next(c for c in content.CHARACTERS if c['name']==row['pack'])
  p=content.PACK_BY_ID[character['pack']]
 assert cid in p[row['pool']] or (row['pool']=='common' and cid in p['rare']),row
 odds={g.card_identity(r['id']):r['chance'] for r in inspect_pack(p['id'],{})}
 assert odds[g.card_identity(cid)]>0,row
for p in content.PACKS:
 if p.get('draft_only'):
  rng=random.Random(86)
  for _ in range(30):
   cards=g.open_pack(p['id'],rng);assert len(cards)==len({g.card_identity(c) for c in cards})==9
ancient=190000050
assert card_rarity.weight(ancient)==card_rarity.ANCIENT_TREASURE_WEIGHT
assert [p['id'] for p in content.PACKS if ancient in p['common']+p['rare']+p.get('starter_support',[])]==['WC4-20']
import campaign_catalog
for decks in campaign_catalog.watch_catalog()['cpuWatchDecks'].values():
 for deck in decks:assert ancient not in deck['main']+deck['extra']
chance=next(row['chance'] for row in inspect_pack('WC4-20',{}) if row['id']==ancient)
assert 0.0099 <= chance <= 0.0101
print(f"PASS {len(rows['additions'])} additions, dependency closure, legal packs, and Ancient Treasure exclusive to All Spells at about 1%")
print('Ancient Treasure per-pack chance:',chance*100,'%')
