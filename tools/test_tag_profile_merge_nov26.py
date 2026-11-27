"""A resumed Tag/Draft room writes back the profile it snapshotted when it was made. That copy must not roll newer progress
back (Badaaron, Discord 2026-11-26: Final Message, Yami Bakura's Level-2 loadout, had to be unlocked again)."""
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import storage

current = {'unlocked': [0, 1, 6], 'won_as': [0, 6], 'character_levels': {'6': 3, '0': 2}, 'wins': 12, 'runs': 20, 'victories': 90,
           'relicless_unlocked': True, 'run_history': [{'id': 'a', 'character': 6, 'result': 'complete'}], 'settings_only_here': 1}
room = {'unlocked': [0, 1], 'won_as': [0], 'character_levels': {'6': 1, '0': 2, '3': 0}, 'wins': 10, 'runs': 21, 'victories': 95,
        'relicless_unlocked': False, 'run_history': [{'id': 'b', 'character': 3, 'result': 'lost'}]}
m = storage.merge_room_profile(room, current)
assert m['character_levels'] == {'6': 3, '0': 2, '3': 0}, m['character_levels']
assert set(m['unlocked']) == {0, 1, 6} and set(m['won_as']) == {0, 6}
assert (m['wins'], m['runs'], m['victories']) == (12, 21, 95)
assert m['relicless_unlocked'] is True and m['settings_only_here'] == 1
assert [r['id'] for r in m['run_history']] == ['b', 'a'], 'the room\'s new run and the newer solo run are both kept'
print('PASS Tag room profile merge: a resumed room never rolls levels, unlocks, counters or history back')
