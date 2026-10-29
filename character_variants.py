"""Alternate loadouts share character identity, progress, and booster pools."""
import json
from pathlib import Path
DATA=json.loads((Path(__file__).parent/'data/character-variants.json').read_text(encoding='utf8'))
VARIANTS=DATA['variants']
def install(characters):
 # Pegasus's Ritual loadout is now standard; his alternate is the Toon build.
 characters[7].update(starting_relic='ten_thousand_hands',cards=['Relinquished','Black Illusion Ritual','Thousand-Eyes Idol'],starting_packs=[characters[7]['pack']]*2+['JP-DL1','EN-MFC'])
 characters[30]['starting_relic']='ominous_clock'
 for index,row in VARIANTS.items():
  c=characters[int(index)]
  alternate=dict(row)
  if not c.get('random_packs'):alternate['starting_packs']=[c['pack']]*2+row.get('supporting_packs',[])
  c['alternate']=alternate
  c['alternate'].pop('pack_additions',None)
def unlocked(profile,index):
 if int(profile.get('character_levels',{}).get(str(index),-1))>=DATA['unlock_level']:return True
 return any(row.get('character')==int(index) and row.get('challenge_level')==-1 and row.get('result')=='complete' and (row.get('round') or 0)>=9 for row in profile.get('run_history',[]))
def loadout(characters,index,variant,profile):
 if variant not in (0,1):raise ValueError('Unknown character variant.')
 c=characters[index]
 if not variant:return c
 if str(index) not in VARIANTS:raise ValueError('This character has no alternate variant.')
 if not unlocked(profile,index):raise ValueError('Beat Challenge LVL 2 or LVL -1 with this character to unlock the alternate variant.')
 return {**c, **c['alternate'], 'name': c['name']}
