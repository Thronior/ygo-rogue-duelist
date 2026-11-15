"""Relics in Draft Duels (online draft loop, 2026-11-13).

The rooms Worker offers relics from eligible() (exported to multiplayer/cloudflare/draft-relics.json by
tools/generate_collector_catalog.py). Both clients build the duel's relic scripts with duel_setup() from the same
room data, so their engines stay identical. The rules follow the Tag final duel (tag_campaign.prepare_finale)."""
import random
import campaign as g, content, passives, approved_relics as ar, relic_fusions

# Opening-hand relics act through the draw count, not the script, so the script test below misses them.
OPENING=('rulebook',)

def _base(character):
 try:run=g.new_run(int(character))
 except Exception:run=g.new_run(0)
 run.update(artifacts=[],curses=[],loop=0,first_player=0,mirror_copy=None,challenge_level=0)
 return run

def eligible():
 """Every relic that changes a duel: no shop/coin relics, removed relics or relics that ask for a campaign choice.
 Cursed relics are included (the user's choice, 2026-11-13); fused relics are not (user, 2026-11-15: they made
 matches unfair too fast)."""
 import re
 strip=lambda s:re.sub(r'-- SHADOW_RUN_AI .*','',s)
 base=_base(0);plain=strip(passives.multiplayer_script(base,1));keys=[]
 for key,info in content.ART_INFO.items():
  if key in ar.REMOVED or key in ar.CHOICE_RELICS or key in relic_fusions.KEYS or info.get('tag')=='economy':continue
  if key in OPENING or info.get('effect')=='opening' or strip(passives.multiplayer_script(dict(base,artifacts=[key]),1))!=plain:keys.append(key)
 return keys

# Rarity (user, 2026-11-15): offers stay random, but stronger relics come up less often. The tier follows the shop
# price; cursed relics cost nothing in the shop and count as Uncommon. archetype_relics.RARITY (relics rare by design)
# multiplies on top. No rarity label is shown to players.
TIERS=((95,1.0,'Common'),(150,.6,'Uncommon'),(250,.3,'Rare'))
VERY_RARE=(.1,'Very rare')
def tier(key):
 price=content.ARTIFACTS[key][1]
 if key in ar.CURSED_IDS and not price:return TIERS[1][1:]
 return next((t[1:] for t in TIERS if price<t[0]),VERY_RARE)

def weight(key):
 import archetype_relics
 return round(tier(key)[0]*archetype_relics.RARITY.get(key,1.0),4)

def offers():
 """The Worker's draft-relics.json: each eligible relic with its draw weight."""
 return [{'key':key,'weight':weight(key)} for key in eligible()]

def duel_setup(value):
 """value: relics, characters and decks ({main, extra}) per engine player (0 goes first), and the duel seed.
 Returns the passives script and both opening-hand sizes."""
 scripts=[];draws=[]
 for side in (0,1):
  artifacts=[a for a in value['relics'][side] if a in content.ART_INFO]
  others=[a for a in artifacts if a not in ('magic_mirror','blank_relic')]
  mirror=random.Random(f"{value['seed']}:{side}").choice(others) if 'magic_mirror' in artifacts and others else None
  info=[content.ART_INFO[a] for a in artifacts if a!='magic_mirror']+([content.ART_INFO[mirror]] if mirror else [])
  opening=1 if any(a['effect']=='rulebook' for a in info) else 5+sum(a['amount'] for a in info if a['effect']=='opening')
  draws.append(ar.opening({'artifacts':artifacts,'mirror_copy':mirror},opening))
  deck=value['decks'][side];cards=list(deck.get('main',[]))+list(deck.get('extra',[]))
  run=_base(value['characters'][side])
  run.update(artifacts=artifacts,mirror_copy=mirror,pool=cards,selected=list(range(len(cards))))
  scripts.append(passives.multiplayer_script(run,side) if artifacts else '')
 return {'passives':'\n'.join(s for s in scripts if s),'draw':draws[0],'enemyDraw':draws[1]}
