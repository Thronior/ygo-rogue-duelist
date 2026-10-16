from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from content import ART_INFO
from passives import script

assert ART_INFO['terraforming_relic']['effect'] == 'starting_field_spell'
lua = script({'artifacts': ['terraforming_relic'], 'curses': []}, telemetry=False)
assert 'c:IsSpell() and c:IsType(TYPE_FIELD) and c:IsAbleToHand()' in lua
assert 'c:IsType(TYPE_SPELL|TYPE_FIELD)' not in lua
assert 'g:RandomSelect(0,1)' in lua
assert 'Duel.SendtoHand(g:RandomSelect(0,1),0,REASON_RULE)' in lua
print('PASS Terraforming only selects an eligible Field Spell from the player deck and adds exactly one.')