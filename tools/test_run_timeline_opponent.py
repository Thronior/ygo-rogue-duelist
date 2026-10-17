"""The completed duel timeline must retain the opponent fought before next routes are generated."""
import random, sys, tempfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import campaign as g, storage
base = Path(tempfile.mkdtemp(prefix='run-timeline-opponent-', dir=ROOT / 'temp'))
storage.ROOT = base
g.SAVE = base / 'run.json'
profile = storage.profile()
profile['unlocked'] = list(range(len(g.CHARACTERS)))
storage.write(base / 'profile.json', profile)
run = g.new_run(0, random.Random(17))
g.auto_deck(run)
request = g.prepare_duel(run, random.Random(19))
fought = request['opponent']
g.finish_duel(run, {'protocol': 1, 'id': request['id'], 'winner': 0, 'lp': 7000, 'events': []}, random.Random(23))
assert run['timeline'][-1]['opponent'] == fought, (fought, run['timeline'][-1], run.get('opponent'))
assert run['opponent'] != fought, 'Test must verify route generation changed the selected next opponent'
assert run['stage'] == 'shop'
print('PASS: timeline keeps the fought opponent after next route selection updates run.opponent')
