"""Faulty Printer also misprints the free Random Packs from Absolute Random (Discord 2026-11-26: players with both relics
opened 6 free packs and never saw a misprint, because only bought singles and packs rolled). Bought packs still roll."""
import random, sys, tempfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import campaign as g, storage, campaign_expansion as ce
(ROOT / 'temp').mkdir(exist_ok=True)
base = Path(tempfile.mkdtemp(prefix='faulty-free-', dir=ROOT / 'temp'))
storage.ROOT = base; g.SAVE = base / 'run.json'; g.RUNTIME = base / 'runtime'; g.RUNTIME.mkdir()
ce.ART_INFO['faulty_printer']['amount'] = 100   # every monster misprints, so the test is not left to chance

rng = random.Random(5)
run = g.new_run(0, rng); run['_save_slot'] = 1
run['artifacts'] += ['faulty_printer', 'absolute_random']
g.auto_deck(run)
g.prepare_duel(run, rng)
g.finish_duel(run, dict(protocol=1, id=run['duel']['id'], winner=0, lp=8000, events=[]), rng)
packs = run.get('free_packs') or []
assert packs, 'Absolute Random gave a free Random Pack'
start = len(run['pool']) - sum(len(p['cards']) for p in packs)
monsters = [start + i for i, cid in enumerate(c for p in packs for c in p['cards']) if g.BY_ID[cid]['data']['type'] & 1]
assert monsters, 'the free pack held a monster'
assert all(str(i) in run['card_mods'] for i in monsters), 'every free-pack monster is misprinted at its own pool index'
assert sum(len(p['misprints']) for p in packs) == len(monsters), 'the client gets the misprints to show'
assert all(run['pool'][m['pool']] == m['id'] for p in packs for m in p['misprints'])
print(f'PASS faulty printer free packs: {len(monsters)} free Random Pack monsters misprinted')
