"""Champion Trophy: a second, optional cursed relic pick from the same boss offer (solo and Tag)."""
import sys, uuid, random
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import storage, campaign as g, cursed_relics
from content import ARTIFACTS, ART_INFO

base = ROOT / 'temp' / ('champion-' + uuid.uuid4().hex)
base.mkdir(parents=True)
storage.ROOT = base
g.SAVE = base / 'run.json'
g.RUNTIME = base / 'runtime'
g.RUNTIME.mkdir()
rng = random.Random(12)

assert ART_INFO['champion_trophy']['effect'] == 'cursed_pick'
assert ARTIFACTS['champion_trophy'][2] == 'You can select a second cursed relic after each boss fight.'


def boss_run(artifacts):
    run = g.new_run(0, rng)
    run.update(stage='shop', round=2, gold=100, artifacts=list(artifacts), cursed_artifacts=[], shop=[])
    cursed_relics.create_offer(run, rng)
    assert cursed_relics.pending(run) and len(run['cursed_offer']['options']) == 3
    return run


def must_fail(fn, *args):
    try:
        fn(*args)
    except ValueError:
        return
    raise AssertionError('expected a ValueError from ' + fn.__name__)


# Without the trophy: one pick, then the shop.
run = boss_run([])
first = run['cursed_offer']['options'][0]
cursed_relics.choose(run, first, rng)
assert not cursed_relics.pending(run) and run['cursed_artifacts'] == [first] and run['shop']
must_fail(cursed_relics.skip, run)
coins = g.rewards(dict(run, artifacts=['champion_trophy'], round=2), [])[0]
assert 'Champion Trophy' not in coins, 'the old boss coin bonus is gone'

# With the trophy: the first pick is mandatory, the second comes from what is left and is optional.
run = boss_run(['champion_trophy'])
options = list(run['cursed_offer']['options'])
must_fail(cursed_relics.skip, run)
cursed_relics.choose(run, options[1], rng)
offer = run['cursed_offer']
assert offer['picked'] == [options[1]] and offer['extra_picks'] == 1 and offer['options'] == [options[0], options[2]], offer
must_fail(cursed_relics.require_choice, run)
assert not run['shop'], 'no shop until the second pick is made or skipped'
must_fail(cursed_relics.choose, run, options[1], rng)
cursed_relics.choose(run, options[2], rng)
assert not cursed_relics.pending(run) and run['cursed_artifacts'] == [options[1], options[2]] and run['shop']

# Skipping the second pick keeps one relic and opens the shop.
run = boss_run(['champion_trophy'])
key = run['cursed_offer']['options'][0]
cursed_relics.choose(run, key, rng)
cursed_relics.skip(run, rng)
assert not cursed_relics.pending(run) and run['cursed_artifacts'] == [key] and run['shop']

# A reroll left over for the second pick draws the same number of relics as are shown.
run = boss_run(['champion_trophy'])
cursed_relics.choose(run, run['cursed_offer']['options'][0], rng)
before = list(run['cursed_offer']['options'])
cursed_relics.reroll(run, rng)
after = run['cursed_offer']['options']
assert len(after) == 2 and not set(after) & set(before) and run['cursed_offer']['picked']

# The trophy fused away by the first pick (Bottomless Purse) still grants this boss fight's second pick.
run = boss_run(['champion_trophy', 'urn'])
run['cursed_offer']['options'] = ['cursed_loaded_purse'] + [k for k in run['cursed_offer']['options'] if k != 'cursed_loaded_purse'][:2]
cursed_relics.choose(run, 'cursed_loaded_purse', rng)
assert 'bottomless_purse' in run['artifacts'] and 'champion_trophy' not in run['artifacts'], run['artifacts']
assert cursed_relics.pending(run) and run['cursed_offer']['picked'] == ['cursed_loaded_purse']
cursed_relics.skip(run, rng)

# Copies stack: two trophies allow three picks, the third optional too.
run = boss_run(['champion_trophy', 'champion_trophy'])
options = list(run['cursed_offer']['options'])
cursed_relics.choose(run, options[0], rng)
assert run['cursed_offer']['extra_picks'] == 2
cursed_relics.choose(run, options[1], rng)
assert run['cursed_offer']['picked'] == options[:2] and run['cursed_offer']['options'] == [options[2]]
assert run['cursed_offer']['extra_picks'] == 1 and not run['shop']
cursed_relics.choose(run, options[2], rng)
assert not cursed_relics.pending(run) and run['cursed_artifacts'] == options and run['shop']
run = boss_run(['champion_trophy', 'champion_trophy'])
options = list(run['cursed_offer']['options'])
cursed_relics.choose(run, options[0], rng); cursed_relics.choose(run, options[1], rng); cursed_relics.skip(run, rng)
assert not cursed_relics.pending(run) and run['cursed_artifacts'] == options[:2]
print('PASS solo: one pick without the trophy, one extra optional pick per trophy copy, reroll and fusion cases')

# Tag: the host picks twice for the shared pool; the guest cannot pick or skip.
from tag_campaign import TagCampaign
p = storage.profile(); p['unlocked'] = [0, 1]
s = TagCampaign([0, 1], [p, p], seed=7)
host = s.players[0]
for seat, r in enumerate(s.players):
    r['opponent'] = r['opponent'] if r.get('opponent') is not None else seat + 1  # the boss just beaten
s.phase = 'shop'
s.shared.update(round=2, artifacts=s.shared['artifacts'] + ['champion_trophy'], cursed_artifacts=[], shop=[])
s.sync()
cursed_relics.create_offer(host, rng)
s.shared['cursed_offer'] = dict(host['cursed_offer']); s.sync()


def command(seat, action, value=None):
    return s.command(seat, {'id': uuid.uuid4().hex, 'revision': s.revision, 'action': action, 'value': value})


options = list(s.shared['cursed_offer']['options'])
try:
    command(1, 'cursed-choose', options[0]); raise AssertionError('guest picked')
except ValueError:
    pass
command(0, 'cursed-choose', options[0])
assert s.shared['cursed_offer']['picked'] == [options[0]] and s.players[1]['cursed_offer']['options'] == options[1:]
try:
    command(1, 'cursed-skip'); raise AssertionError('guest skipped')
except ValueError:
    pass
command(0, 'cursed-choose', options[2])
assert not s.shared['cursed_offer'] and s.shared['cursed_artifacts'] == [options[0], options[2]]
assert all(options[0] in r['artifacts'] and options[2] in r['artifacts'] for r in s.players)

s.shared.update(cursed_artifacts=[], artifacts=[a for a in s.shared['artifacts'] if a not in options]); s.sync()
cursed_relics.create_offer(host, rng); s.shared['cursed_offer'] = dict(host['cursed_offer']); s.sync()
key = s.shared['cursed_offer']['options'][0]
command(0, 'cursed-choose', key); command(0, 'cursed-skip')
assert not s.shared['cursed_offer'] and s.shared['cursed_artifacts'] == [key]
print('PASS tag: host makes both shared picks or skips the second; guest cannot')
