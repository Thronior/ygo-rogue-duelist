"""Relics in Draft Duels (online draft loop, 2026-11-13).

The rooms Worker offers relics from eligible() (exported to multiplayer/cloudflare/draft-relics.json by
tools/generate_collector_catalog.py). Both clients build the duel's relic scripts with duel_setup() from the same
room data, so their engines stay identical. The rules follow the Tag final duel (tag_campaign.prepare_finale)."""
import random
import campaign as g, content, passives, approved_relics as ar

# Opening-hand relics act through the draw count, not the script, so the script test below misses them.
OPENING=('rulebook',)

def _base(character):
 try:run=g.new_run(int(character))
 except Exception:run=g.new_run(0)
 run.update(artifacts=[],curses=[],loop=0,first_player=0,mirror_copy=None,challenge_level=0)
 return run

def eligible():
 """Every relic that changes a duel: no shop/coin relics, removed relics or relics that ask for a campaign choice.
 Cursed and fused relics are included (the user's choice, 2026-11-13)."""
 import re
 strip=lambda s:re.sub(r'-- SHADOW_RUN_AI .*','',s)
 base=_base(0);plain=strip(passives.multiplayer_script(base,1));keys=[]
 for key,info in content.ART_INFO.items():
  if key in ar.REMOVED or key in ar.CHOICE_RELICS or info.get('tag')=='economy':continue
  if key in OPENING or info.get('effect')=='opening' or strip(passives.multiplayer_script(dict(base,artifacts=[key]),1))!=plain:keys.append(key)
 return keys

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
