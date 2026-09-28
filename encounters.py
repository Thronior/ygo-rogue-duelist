"""Game-deck adaptations: readable NPC themes without a pile of power staples."""
import json
from pathlib import Path
from collections import Counter
ROOT=Path(__file__).parent
TUTORIALS=json.loads((ROOT/'data/tutorial-decks.json').read_text())
EARLY=json.loads((ROOT/'data/early-opponents.json').read_text())
EARLY_IDS={22:0,12:1,13:3,9:2,16:4}
LP=[3000,4000,4500,6000,6000,6500,7500,7500,8000]
REPLACEMENTS={
 'Raigeki':['Fissure','Raigeki Break'], 'Dark Hole':['Fissure','Two-Pronged Attack'],
 'Harpie\'s Feather Duster':['Remove Trap','De-Spell'], 'Heavy Storm':['De-Spell','Remove Trap'],
 'Mirror Force':['Reinforcements','Castle Walls','Waboku'],
 'Change of Heart':['Brain Control','Block Attack'], 'Snatch Steal':['Brain Control','Block Attack'],
 'Monster Reborn':['The Shallow Grave','Monster Recovery'], 'Premature Burial':['The Shallow Grave','Monster Recovery'],
 'Call of the Haunted':['The Shallow Grave','Monster Recovery'],
 'Pot of Greed':['Jar of Greed','Reckless Greed'], 'Graceful Charity':['Jar of Greed','Reckless Greed'],
 'United We Stand':['Malevolent Nuzzler','Sword of Deep-Seated'], 'Mage Power':['Black Pendant','Malevolent Nuzzler'],
 'Axe of Despair':['Sword of Deep-Seated','Malevolent Nuzzler'],
 'Delinquent Duo':['Robbin\' Goblin','Robbin\' Zombie'], 'Confiscation':['Robbin\' Goblin','Robbin\' Zombie'],
 'The Forceful Sentry':['Robbin\' Goblin','Robbin\' Zombie'],
}

def adapt(record,round_index,byid,byname):
 # Tier-specific YDK files are authoritative. Runtime substitution homogenized
 # otherwise distinct NPC decks and could break ritual/fusion combinations.
 return record['main'][:]
