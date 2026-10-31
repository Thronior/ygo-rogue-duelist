"""Custom packs stay legal, stay complete, and leave no card reachable only through All packs."""
import sys,json,random
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,content
from pack_odds import inspect_pack
sys.path.insert(0,str(ROOT/'tools'))
from complete_custom_pack_references import complete,references,members,ARCHETYPES,PACK_ARCHETYPES
from copy import deepcopy
meta=json.loads((ROOT/'data/custom-pack-art.json').read_text(encoding='utf8'))['packs']
ALL_PACKS={'WC4-20','WC4-21','WC4-22','WC4-23'}
ANCIENT_TREASURE=190000050
assert len(meta)==8
assert not complete(deepcopy(content.PACKS))
regular=set()
for p in content.PACKS:
 if p['id'] not in ALL_PACKS:regular|={g.card_identity(c) for c in p['common']+p['rare']+p.get('starter_support',[])}
for row in meta:
 p=content.PACK_BY_ID[row['id']]
 cards=set(p['common'])|set(p['rare'])
 assert len(cards)>=60,row['id']
 identities={g.card_identity(c) for c in cards}
 assert all({g.card_identity(r) for r in references(g.BY_ID[c])}<=identities for c in cards),row['id']
 for name in PACK_ARCHETYPES.get(row['id'],()):
  code=next(a['setcode'] for a in ARCHETYPES if a['name']==name)
  assert {g.card_identity(c) for c in members(code)}<=identities,(row['id'],name)
 assert not p.get('draft_only') and not p.get('shop_only') and not set(p['common'])&set(p['rare'])
 assert row.get('card',next(iter(cards))) in cards and (ROOT/'assets/packs'/f"{row['id']}.jpg").is_file()
 assert all(str(c) in p['rarities'] for c in cards) and set(p['rare_display'])==set(p['rare'])
 assert all(r['chance']>0 for r in inspect_pack(p['id'],{}) if r['id']!=ANCIENT_TREASURE)
 rng=random.Random(7)
 for _ in range(200):
  pulled=g.open_pack(p['id'],rng)
  assert len(pulled)==9==len({g.card_identity(c) for c in pulled})
stinkers=content.PACK_BY_ID['CUSTOM-STINKERS']
assert all(g.BY_ID[c]['data']['type']&0x11==0x11 and not g.BY_ID[c]['data']['type']&0xC0 for c in stinkers['common']+stinkers['rare'])
assert 0<stinkers['shop_chance']<1
stink={g.card_identity(c) for c in stinkers['common']+stinkers['rare']}
assert all(g.card_identity(c['id']) in stink for c in g.CARDS if c['data']['type']&0x11==0x11 and not c['data']['type']&0xC0 and 5<=c['level']<=6 and c['atk']<2000)
import shop_rewards
rng=random.Random(3);seen=sum(shop_rewards.pack_offered(stinkers,rng) for _ in range(20000))
assert 4600<seen<5400,seen
assert 'CUSTOM-STINKERS' not in {i for s in range(400) for i in content.starting_packs(1,random.Random(s))}
missing=[c['name'] for c in g.CARDS if g.card_identity(c['id']) not in regular and c['id']!=ANCIENT_TREASURE]
assert not missing,missing
assert all(ANCIENT_TREASURE not in content.PACK_BY_ID[row['id']]['common']+content.PACK_BY_ID[row['id']]['rare'] for row in meta)
print('PASS 8 custom packs: 60+ cards, named references and archetypes complete, legal openings, art present, and every card but Ancient Treasure is in a pack outside the All packs')
