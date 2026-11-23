"""Deck Spyglass order (Discord, Nori, 2026-11-23): Monsters, Spells, Traps, then the Extra Deck, copies side by side."""
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,deck_view
ids=[g.BY_NAME[n]['id'] for n in ['Mirror Force','Pot of Greed','Thousand Dragon','Battle Ox','Trap Hole','Battle Ox','Raigeki','Celtic Guardian']]
names=[g.BY_ID[i]['name'] for i in deck_view.ordered(ids,g.BY_ID)]
assert names==['Battle Ox','Battle Ox','Celtic Guardian','Pot of Greed','Raigeki','Mirror Force','Trap Hole','Thousand Dragon'],names
print('PASS Deck Spyglass order: Monsters, Spells, Traps, Extra Deck')
