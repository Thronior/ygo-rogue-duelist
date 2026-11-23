"""Explicit custom-card content and fixed campaign-currency rewards."""
import json
from pathlib import Path

ANCIENT_TREASURE=190000050
GATE_GUARDIAN_F=190000051
gate_guardian_id=25833572
CARDS=json.loads((Path(__file__).parent/'data/custom-cards.json').read_text(encoding='utf8'))
IDS={c['id'] for c in CARDS}
# Tokens summoned by custom cards (Moth Token, 2026-11-23): engine data and art only, never pool or pack cards.
TOKENS=json.loads((Path(__file__).parent/'data/custom-tokens.json').read_text(encoding='utf8'))

def install_packs(packs):
 for pack in packs:
  if pack['id']!='WC4-20':continue
  if ANCIENT_TREASURE not in pack['common']:pack['common'].append(ANCIENT_TREASURE)
  pack.setdefault('rarities',{})[str(ANCIENT_TREASURE)]=['Common']
 for pack in packs:
  if gate_guardian_id not in pack.get('rare',[]):continue
  if GATE_GUARDIAN_F in pack.get('common',[]):pack['common'].remove(GATE_GUARDIAN_F)
  if GATE_GUARDIAN_F not in pack['rare']:pack['rare'].append(GATE_GUARDIAN_F)
  pack.setdefault('rarities',{})[str(GATE_GUARDIAN_F)]=['Rare']
  if GATE_GUARDIAN_F not in pack.setdefault('rare_display',[]):pack['rare_display'].append(GATE_GUARDIAN_F)
 # Moth LV line (user design, 2026-11-23): each card joins every pack its original is in, in the same slot and rarity.
 # The originals stay.
 for pack in packs:
  for original,new in MOTH_LV_PAIRS.items():
   for slot in ('common','rare','rare_display','super_rare_display'):
    if original in pack.get(slot,[]) and new not in pack[slot]:pack[slot].append(new)
   if str(original) in pack.get('rarities',{}):pack['rarities'].setdefault(str(new),list(pack['rarities'][str(original)]))
  # A custom pack holds every card its cards name (tools/test_custom_packs.py): the next stage of each Moth LV in it.
  if pack['id'].startswith('CUSTOM-'):
   chain=[190000052,190000053,190000054,190000055]
   for here,nxt in zip(chain,chain[1:]):
    if any(here in pack.get(s,[]) for s in ('common','rare')) and not any(nxt in pack.get(s,[]) for s in ('common','rare')):
     pack['common'].append(nxt);pack.setdefault('rarities',{})[str(nxt)]=['Common']

# Petit Moth, Larvae Moth, Great Moth, Perfectly Ultimate Great Moth, Cocoon of Evolution -> their Moth LV versions.
MOTH_LV_PAIRS={58192742:190000052,87756343:190000053,14141448:190000054,48579379:190000055,40240595:190000056}

def coins(events):
 # Amount is fixed by the card; never trust a caller-supplied reward amount.
 return 50*sum(e.get('kind')=='ancient_treasure' and e.get('card')==ANCIENT_TREASURE for e in events)
