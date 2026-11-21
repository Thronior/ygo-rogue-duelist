"""Deds' 74 sleeves (2026-11-20): unlock rules in sleeve_progress.py, from one duel's 'sleeve_metrics' event to
profile.sleeves_earned and the Achievements rows."""
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import sleeve_progress as sp

ids = [s['id'] for s in sp.SLEEVES]
assert len(ids) == len(set(ids)) == 146 and ids[-1] == 'rainbow'
for s in sp.SLEEVES:
    assert (ROOT / f"assets/sleeves/cards/{s['id']}.jpg").exists(), s['id']
    assert (ROOT / f"android/web/assets/sleeves/cards/{s['id']}.jpg").exists(), s['id']
NORMAL = {'data': {'type': 0x11}, 'level': 4}
EFFECT = {'data': {'type': 0x21}, 'level': 4}


def play(run, won=True, opponent=None, cards=(EFFECT,), fusion=0, **m):
    event = dict(kind='sleeve_metrics', field=[], grave=5, turn=8, hand=2, deck=20)
    event.update(m)
    sp.duel(run, {'events': [event], 'lp': 4000}, won, {'fusion': fusion, 'ritual': 0}, cards=cards, opponent=opponent)


def finish(profile, run):
    sp.observe(profile, run)
    return set(profile.get('sleeves_earned', []))


# Warrior wins count toward the Celtic Guardian ladder only on wins; one duel counts once per key.
profile, run = {}, {}
for _ in range(10):
    play(run, field=['Celtic Guardian'], fieldRaces=0x1)
play(run, won=False, field=['Celtic Guardian'], fieldRaces=0x1)
earned = finish(profile, run)
assert profile['sleeve_stats']['wins:race:Warrior'] == 10
assert 'celtic-guardian' in earned and 'celtic-guardian-2' not in earned
# Observing again never counts the same run twice.
sp.observe(profile, run)
assert profile['sleeve_stats']['wins:race:Warrior'] == 10

# Red-Eyes by name, Harpie by part of the name, Machine by Type.
profile, run = {}, {}
play(run, field=['Red-Eyes Black Dragon', 'Harpie Lady 1'], fieldRaces=0x2000 | 0x200)
earned = finish(profile, run)
assert {'red-eyes-black-dragon', 'harpie-lady-1'} <= earned and 'red-eyes-black-dragon-2' not in earned

# Finishes: 3,000 ATK, Dark Magician Girl, 500 and 1,000 or less.
profile, run = {}, {}
play(run, bigFinish=True, dmgFinish=True, weakFinish=True, lowFinish=True)
earned = finish(profile, run)
assert {'blue-eyes-white-dragon', 'dark-magician-girl-2'} <= earned
assert profile['sleeve_stats']['wins:weakFinish'] == 1 and profile['sleeve_stats']['wins:lowFinish'] == 1

# Dark Magician summons, LP costs, Extra Deck returns and other lifetime counts from the duel event.
profile, run = {}, {}
play(run, won=False, dmSummons=10, lpPaid=10000, toExtra=5, coinKills=25, flippedDown=50, oppDiscards=30, trapsActivated=100,
     handLooks=25, tributeSummons=50, draws=1000, effectDamage=25000, darkBanished=100)
earned = finish(profile, run)
for sid in ('dark-magician', 'dark-magician-2', 'sasuke-samurai-2', 'super-robolady', 'sasuke-samurai-4', 'book-of-moon', 'delinquent-duo',
            'embodiment-of-apophis', 'the-inexperienced-spy', 'mobius-the-frost-monarch', 'pot-of-greed-2', 'mask-of-dispel', 'allure-of-darkness'):
    assert sid in earned, sid
assert 'dark-magician-3' not in earned and 'super-roboyarou' not in earned

# One-duel and win feats.
profile, run = {}, {}
play(run, timeWizardWins=3, lpGained=10000, fusion=3, damageTaken=10000, grave=20, turn=60, cards=(NORMAL,))
earned = finish(profile, run)
for sid in ('time-wizard-2', 'guardian-angel-joan', 'polymerization-2', 'divine-serpent-geh', 'mudora', 'perfectly-ultimate-great-moth',
            'jerry-beans-man', 'thousand-dragon'):
    assert sid in earned, sid
assert 'polymerization-3' not in earned
# An Effect Monster in the Deck: no Normal-Monster Deck win; a loss never counts toward win feats.
profile, run = {}, {}
play(run, won=False, grave=20, turn=60, cards=(NORMAL, EFFECT))
assert not {'mudora', 'jerry-beans-man', 'thousand-dragon'} & finish(profile, run)

# Beaten duelists by name (both Duke Devlin entries count), and the World Champion.
profile, run = {}, {}
for _ in range(5):
    play(run, opponent='Duke Devlin')
for _ in range(3):
    play(run, opponent='World Champion')
play(run, won=False, opponent='Dartz')
earned = finish(profile, run)
assert {'orgoth-the-relentless', 'la-jinn'} <= earned and 'the-seal-of-orichalcos' not in earned
assert 'beat:Dartz' not in profile['sleeve_stats']

# A run without an Equip Spell (Gearfried) and 5 Tag wins (Gemini Elf).
profile = {}
run = {'stage': 'complete', 'history_mode': 'tag'}
play(run)
assert 'gearfried-the-iron-knight' in finish(profile, run)
assert profile['sleeve_stats']['tagWins'] == 1
run = {'stage': 'complete'}
play(run, equipActivated=True)
profile2 = {}
assert 'gearfried-the-iron-knight' not in finish(profile2, run)
for _ in range(4):
    finish(profile, {'stage': 'complete', 'history_mode': 'tag'})
assert 'gemini-elf-2' in profile['sleeves_earned']

# Dark Paladin's second art: 5 duelists with a Challenge Level 2+ win; it shows progress in Achievements.
from content import PLAYABLE_IDS
profile = {'character_levels': {str(i): 2 for i in PLAYABLE_IDS[:4]}}
sp.evaluate(profile)
assert 'dark-paladin-2' not in profile['sleeves_earned']
row = next(r for r in sp.achievements(profile) if r['id'] == 'sleeve:dark-paladin-2')
assert (row['value'], row['target'], row['cumulative']) == (4, 5, True)
profile['character_levels'][str(PLAYABLE_IDS[4])] = 3
sp.evaluate(profile)
assert 'dark-paladin-2' in profile['sleeves_earned']

rows = {r['id']: r for r in sp.achievements({'sleeve_stats': {'wins:race:Warrior': 30}})}
assert rows['sleeve:celtic-guardian-3']['value'] == 30 and rows['sleeve:celtic-guardian-3']['target'] == 50
assert rows['sleeve:obnoxious-celtic-guard']['name'] == 'Obnoxious Celtic Guard'
print('PASS Deds sleeves:', len(rows), 'achievement rows')
