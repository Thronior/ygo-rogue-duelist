"""Shared Challenge Level starts (user, 2026-11-26): once 3 different characters have beaten Level X, every character can
start at X, up to 5. It only unlocks levels: character_levels, which the roster colours and "Completed" read, still holds
each character's own clears (user: a character's colour changes only when it beats a run at that level). The client's
sharedStart/unlockedLevel (difficulty-preference.js) must agree."""
import json, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import challenge_levels as cl

cases = [
    ({}, 0, 0), ({'0': 2, '1': 2}, 9, 0), ({'0': 2, '1': 2, '2': 2}, 9, 2), ({'0': 6, '1': 6, '2': 6}, 9, 5),
    ({'0': 3, '1': 4, '2': 1, '3': 5}, 9, 3), ({'0': 4, '1': 4, '2': 4}, 0, 5), ({'0': 4, '1': 4, '2': 4}, 9, 4), ({'0': -1, '1': 'x', '2': 3}, 9, 0),
]
for levels, char, unlocked in cases:
    profile = {'character_levels': levels}
    assert cl.unlocked(profile, char) == unlocked, (levels, char, cl.unlocked(profile, char), unlocked)
# Unlocking never writes a clear: the colour data only changes through award() after a won run.
profile = {'character_levels': {'0': 4, '1': 4, '2': 4}}
assert cl.unlocked(profile, 9) == 4 and cl.highest(profile, 9) == -1 and 'character_levels' in profile and '9' not in profile['character_levels']
js = """import {unlockedLevel,sharedStart} from './android/web/difficulty-preference.js';const cases=JSON.parse(process.argv[1]);
const bad=cases.filter(([levels,char,unlocked])=>unlockedLevel({character_levels:levels},char)!==unlocked);console.log(bad.length?JSON.stringify(bad):'same')"""
out = subprocess.run([str(ROOT / 'runtime/ai/node.exe'), '--input-type=module', '-e', js, json.dumps(cases)], cwd=ROOT, capture_output=True, text=True)
assert out.stdout.strip() == 'same', out.stdout + out.stderr
print(f'PASS shared level starts: {len(cases)} profiles; Python and the screen agree; clears (roster colours) untouched')
