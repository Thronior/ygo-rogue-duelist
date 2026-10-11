"""Explicit custom-card content and fixed campaign-currency rewards."""
import json
from pathlib import Path

ANCIENT_TREASURE=190000050
CARDS=json.loads((Path(__file__).parent/'data/custom-cards.json').read_text(encoding='utf8'))
IDS={c['id'] for c in CARDS}

def install_packs(packs):
 for pack in packs:
  if pack['id']!='WC4-20':continue
  if ANCIENT_TREASURE not in pack['common']:pack['common'].append(ANCIENT_TREASURE)
  pack.setdefault('rarities',{})[str(ANCIENT_TREASURE)]=['Common']

def coins(events):
 # Amount is fixed by the card; never trust a caller-supplied reward amount.
 return 50*sum(e.get('kind')=='ancient_treasure' and e.get('card')==ANCIENT_TREASURE for e in events)
