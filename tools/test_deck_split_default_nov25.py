"""Split Deck Editor on by default (user, 2026-11-25): storage.settings() turns it on unless the player turned it off
with the toggle (deckSplitSet). Older saves carry deckSplit=False without the flag, so they get it on too."""
import json,sys,tempfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import storage
original=storage.ROOT
try:
 with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parents[1]/'temp') as directory:
  storage.ROOT=Path(directory)
  assert storage.settings()['deckSplit'] is True,'a new player gets split view'
  storage.write(storage.ROOT/'settings.json',{'deckSplit':False})
  assert storage.settings()['deckSplit'] is True,'an old save that never touched the toggle gets split view'
  storage.write(storage.ROOT/'settings.json',{'deckSplit':False,'deckSplitSet':True})
  s=storage.settings();assert s['deckSplit'] is False and s['deckSplitSet'] is True,'a player who turned it off keeps it off'
  storage.write(storage.ROOT/'settings.json',s)
  assert storage.settings()['deckSplit'] is False,'and it stays off after saving settings again'
  storage.write(storage.ROOT/'settings.json',{'deckSplit':True,'deckSplitSet':True})
  assert storage.settings()['deckSplit'] is True
finally:storage.ROOT=original
print('PASS Split Deck Editor defaults on; a player who turned it off keeps it off')
