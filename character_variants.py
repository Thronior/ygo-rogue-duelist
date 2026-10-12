"""Alternate loadouts share character identity, progress, and booster pools."""
import json
from pathlib import Path
DATA=json.loads((Path(__file__).parent/'data/character-variants.json').read_text(encoding='utf8'))
VARIANTS=DATA['variants']
def install(characters):
 # Pegasus's Ritual loadout is now standard; his alternate is the Toon build.
 characters[7].update(starting_relic='ritual_dagger',cards=['Relinquished','Black Illusion Ritual','Thousand-Eyes Idol'],starting_packs=[characters[7]['pack']]*2+['WC4-06','EN-MFC'])
 characters[30]['starting_relic']='ominous_clock'
 for index,row in VARIANTS.items():
  c=characters[int(index)]
  c['alternate']=dict(row,starting_packs=[c['pack']]*2+row['supporting_packs'])
  c['alternate'].pop('pack_additions',None)
def unlocked(profile,index):return int(profile.get('character_levels',{}).get(str(index),-1))>=DATA['unlock_level']
def loadout(characters,index,variant,profile):
 if variant not in (0,1):raise ValueError('Unknown character variant.')
 c=characters[index]
 if not variant:return c
 if str(index) not in VARIANTS:raise ValueError('This character has no alternate variant.')
 if not unlocked(profile,index):raise ValueError('Beat Difficulty Level 2 with this character to unlock the alternate variant.')
 return {**c, **c['alternate'], 'name': c['name']}
