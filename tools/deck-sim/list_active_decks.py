"""Print the campaign's active T1-T3 opponent decks as JSON for the deck balance simulator.

Reads the same path a run uses: content.eligible_opponents() picks who can appear in a
tier and content.opponent_record() reads that opponent's .ydk from data/decks via
deck_files.read(). Tier N is the duel stage (N-1)*3+1; Tier 4 is the Endless loop
(data/tier4-decks.json) and is left out on purpose.
"""
import json, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))
import os
os.chdir(ROOT)
import content

decks=[]
for tier in (1,2,3):
 stage=(tier-1)*3+1
 for i in content.eligible_opponents(stage):
  record=content.opponent_record(stage,i)
  if int(record.get('tier',tier))!=tier:continue
  name=content.CHARACTERS[i]['name']
  # Tier-exclusive opponents keep one base 'deck' name but read a different file per tier (content.opponent_record).
  row=content.TIER_EXCLUSIVE_OPPONENTS.get(i)
  deck_file=row.get('tier_decks',{}).get(str(tier),row['deck']) if row else record.get('deck')
  decks.append(dict(characterId=i,character=name,tier=tier,deckId=deck_file or f'{name} T{tier}',main=record['main'],extra=record.get('extra',[])))
json.dump(dict(source='campaign (content.eligible_opponents + data/decks/*.ydk)',decks=decks),sys.stdout)
