"""The "relic:<key or name>" debug code (user, 2026-11-19): debug_codes.give_relic gives the current run a relic."""
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import campaign as g, debug_codes, approved_relics as ar

run = g.new_run(0)
start = list(run['artifacts'])
assert debug_codes.give_relic(run, 'Spell Sanctuary') == {'relic': 'Spell Sanctuary', 'key': 'cursed_spell_sanctuary'}
assert run['artifacts'] == start + ['cursed_spell_sanctuary'] and run['cursed_artifacts'] == ['cursed_spell_sanctuary'], 'cursed relics are marked as cursed'
assert debug_codes.give_relic(run, '  DEEP_POCKETS ')['key'] == 'deep_pockets', 'keys ignore case and outer spaces'
assert 'deep_pockets' not in run['cursed_artifacts']
for bad in ('no such relic', 'cursed_spell_sanctuary', next(iter(ar.REMOVED))):
    try:
        debug_codes.give_relic(run, bad)
    except ValueError:
        continue
    raise AssertionError(f'{bad!r} should be refused')
try:
    debug_codes.give_relic(None, 'deep_pockets')
    raise AssertionError('needs a run')
except ValueError:
    pass
backend = (ROOT / 'android/mobile_backend.py').read_text(encoding='utf8')
assert "startswith('relic:')" in backend and 'debug_codes.give_relic(run' in backend, 'the Settings code box reaches it'
print('PASS relic:<key or name> debug code')
