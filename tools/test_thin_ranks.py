import sys
from pathlib import Path
# Campaign modules live at the repo root; make the test runnable as a plain script.
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import challenge_levels
from content import CURSES


def test_thin_ranks_standard_and_amplified_penalties():
    curse = {'curses': ['short_handed']}
    assert challenge_levels.curse_opening_hand(curse, 5) == 3
    assert challenge_levels.curse_description(curse, 'short_handed', CURSES['short_handed'][1]) == 'Start this duel with 2 fewer cards in your hand, minimum 1.'

    amplified = {'challenge_level': 2, 'curses': ['short_handed']}
    assert challenge_levels.curse_opening_hand(amplified, 5) == 2
    assert challenge_levels.curse_description(amplified, 'short_handed', CURSES['short_handed'][1]) == 'Start this duel with 3 fewer cards in your hand, minimum 1.'
    assert challenge_levels.curse_opening_hand({'challenge_level': 2, 'curses': ['short_handed'] * 2}, 5) == 1


if __name__ == '__main__':
    test_thin_ranks_standard_and_amplified_penalties()
    print('PASS Thin Ranks standard and amplified penalties.')
