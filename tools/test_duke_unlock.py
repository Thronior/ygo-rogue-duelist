"""Duke Devlin unlocks after rolling 10 dice and tossing 10 coins across duels (user, 2026-11-13)."""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import json, character_progression, sleeve_progress
rule = json.loads((pathlib.Path(__file__).resolve().parents[1] / 'data/character-progression.json').read_text(encoding='utf-8'))['unlocks']['19']
assert rule == {'metric': 'dice_and_coins', 'target': 10, 'description': 'Roll 10 dice and toss 10 coins'}, rule
profile, run = {}, {'artifacts': []}
def duel(coins, dice):
    result = {'lp': 8000, 'events': [{'kind': 'sleeve_metrics', 'coinsTossed': coins, 'diceRolled': dice}]}
    sleeve_progress.duel(run, result, True, {'fusion': 0, 'ritual': 0})
    character_progression.observe(profile, run)
duel(6, 3)
assert profile['dice_and_coins'] == 3, profile
duel(1, 4)
assert profile['dice_and_coins'] == 7
character_progression.observe(profile, run)  # saving again never counts twice
assert profile['dice_and_coins'] == 7 and profile['sleeve_stats']['coinsTossed'] == 7
duel(3, 5)
assert profile['dice_and_coins'] == 10 >= rule['target'], profile
# A second run keeps adding to the lifetime totals.
run = {'artifacts': []}; duel(2, 0)
assert profile['sleeve_stats']['coinsTossed'] == 12 and profile['sleeve_stats']['diceRolled'] == 12
print('PASS Duke Devlin: 10 dice and 10 coins across duels, counted once per save')
