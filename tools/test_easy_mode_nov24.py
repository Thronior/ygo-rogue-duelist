"""Easy mode (user, 2026-11-24; easy_mode.py): 9 duels with no boss curses, 2,000 LP healing after every duel up to 8,000,
a skippable shadow relic choice, 25% more coins, 4 removal cards at the start, and no achievements or unlocks."""
import copy, random, shutil, sys, tempfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import campaign as g, storage, cursed_relics, challenge_levels, easy_mode, achievement_model
from content import RUN_LENGTH, BOSS_EVERY

(ROOT / 'temp').mkdir(exist_ok=True)
base = Path(tempfile.mkdtemp(prefix='easy-mode-', dir=ROOT / 'temp'))
storage.ROOT = base; g.SAVE = base / 'run.json'; g.RUNTIME = base / 'runtime'; g.RUNTIME.mkdir()
REMOVAL = [g.BY_NAME[n]['id'] for n in easy_mode.REMOVAL]
assert len(REMOVAL) == 4


def fresh(easy, character=0, seed=7, level=0):
    run = g.new_run(character, random.Random(seed), level=level, easy=easy)
    run['_save_slot'] = 1
    return run


def ready(run):
    """A legal deck that keeps the easy cards."""
    g.auto_deck(run)
    run['selected'] = sorted(set(run['selected']) | {i for i, c in enumerate(run['pool']) if c in REMOVAL})
    assert g.validate(run) is None, g.validate(run)


def win(run, lp, rng):
    g.prepare_duel(run, rng)
    g.finish_duel(run, dict(protocol=1, id=run['duel']['id'], winner=0, lp=lp, events=[]), rng)


# 5. Four removal cards in the starting pool and deck; Level 0 rules whatever level was asked for.
run = fresh(True, level=3)
assert run['easy'] is True and run['challenge_level'] == 0, 'easy runs are Level 0 runs'
assert run['pool'][-4:] == REMOVAL and set(range(len(run['pool']) - 4, len(run['pool']))) <= set(run['selected']), 'the removal is in the deck from the start'
normal = fresh(False)
assert not normal.get('easy') and sum(c in REMOVAL for c in normal['pool']) == sum(c in REMOVAL for c in run['pool']) - 4
assert not easy_mode.active(dict(run, history_mode='tag')), 'Tag never plays easy'
storage.write(storage.ROOT / 'profile.json', dict(unlocked=[0, 1, 37]))
copycat = fresh(True, character=37)
storage.write(storage.ROOT / 'profile.json', {})
assert copycat['easy'] and copycat['easy_cards'] == [], 'fixed decks get the rules only'

# 1. No boss curses: the boss round's routes, preview and duel carry none (a normal run's do).
for easy in (True, False):
    r = fresh(easy, seed=11); ready(r); rng = random.Random(3)
    r['round'] = BOSS_EVERY - 1; g.routes(r, rng)
    if easy:
        assert not any(r['route_curses'].values()) and r['boss_curse'] is None and not (r.get('next_boss') or {}).get('curses')
    g.prepare_duel(r, rng)
    assert bool(r['curses']) != easy and bool(r['duel_curses']) != easy, (easy, r['curses'])
    if easy:
        assert 'BOSS: ' in (g.RUNTIME / 'puzzles/shadow-run.lua').read_text(encoding='utf8') and challenge_levels.active_modifiers(r)[0]['kind'] == 'easy'
# A loop's later bosses too: routes for a looped boss draw nothing.
r = fresh(True, seed=12); r.update(round=BOSS_EVERY * 3 - 1, loop=1); g.routes(r, random.Random(1))
assert not any(r['route_curses'].values()) and r['curses'] == []

# 2. 2,000 LP after every won duel (not only bosses), never above 8,000.
r = fresh(True, seed=13); ready(r); rng = random.Random(5)
win(r, 5000, rng); assert r['round'] == 1 and r['lp'] == 7000, r['lp']
r['stage'] = 'draft'; win(r, 7500, rng); assert r['lp'] == 8000, r['lp']
n = fresh(False, seed=13); ready(n); win(n, 5000, random.Random(5)); assert n['lp'] == 5000, 'ordinary duels still do not heal normally'

# 4. 25% more coins from the duel payout, as its own line.
r = fresh(True, seed=14); tally, total = g.rewards(r, [])
plain_tally, plain = g.rewards(dict(copy.deepcopy(r), easy=False), [])
assert tally[easy_mode.BONUS_LINE] == plain // 4 and total == plain + plain // 4 and easy_mode.BONUS_LINE not in plain_tally, (tally, plain)

# 3. The shadow relic choice after a boss can be skipped on easy only; skipping restocks the shop.
for easy in (True, False):
    r = fresh(easy, seed=15); r.update(stage='shop', round=BOSS_EVERY)
    cursed_relics.create_offer(r, random.Random(2)); assert cursed_relics.pending(r)
    if easy:
        cursed_relics.skip(r, random.Random(2)); assert not cursed_relics.pending(r) and r['shop'] and not r.get('cursed_artifacts')
    else:
        try:
            cursed_relics.skip(r); raise AssertionError('a normal run must choose its first shadow relic')
        except ValueError:
            pass
mobile = (ROOT / 'android/web/mobile.js').read_text(encoding='utf8')
assert "state.run.easy?btn('Skip shadow relic','cursed-skip')" in mobile, 'the choice screen shows the Skip button'

# 6. No achievements or unlocks: a full easy run leaves the profile as it was, and run history marks it Easy.
def full_run(easy):
    storage.write(storage.ROOT / 'profile.json', {}); [(storage.ROOT / f'registered-cards.{x}').unlink(missing_ok=True) for x in ('json', 'bak')]
    before = storage.profile()
    done = {x['id'] for x in achievement_model.entries(before) if x['done']}
    r = fresh(easy, seed=16); ready(r); rng = random.Random(8)
    while r['stage'] != 'complete':
        if cursed_relics.pending(r):
            cursed_relics.choose(r, r['cursed_offer']['options'][0], rng)
            while cursed_relics.pending(r): cursed_relics.skip(r, rng)
        r['stage'] = 'draft'; ready(r)
        win(r, 6000, rng)
    after = storage.profile()
    return r, before, after, done, {x['id'] for x in achievement_model.entries(after) if x['done']}

r, before, after, done, now = full_run(True)
assert r['round'] == RUN_LENGTH and r['stage'] == 'complete', 'still 9 duels'
for key in ('character_levels', 'wins', 'won_as', 'victories', 'unlocked', 'max_gold', 'sleeves_earned', 'sleeve_stats', 'best_payout', 'best_hit', 'achievement_notices', 'secret_coin_feats', 'highest_challenge_level', 'relic_variety'):
    assert before.get(key) == after.get(key), (key, before.get(key), after.get(key))
assert now == done and not r.get('level_unlocked') and not r.get('unlocks_earned') and not r.get('profile_complete')
row = next(x for x in storage.run_history() if x['id'].startswith(r['history_id']))
assert row['easy'] is True and row['result'] == 'complete', 'run history keeps easy runs, marked Easy'
assert not storage.registered_cards(), 'easy runs add nothing to the card collection'
r, before, after, done, now = full_run(False)
assert after['wins'] == before['wins'] + 1 and after.get('character_levels', {}).get('0') == 0, 'a normal run still counts'
assert 'easy' not in next(x for x in storage.run_history() if x['id'].startswith(r['history_id']))

stats = (ROOT / 'android/web/global-stats.js').read_text(encoding='utf8')
assert 'run.secret_challenge||run.easy||' in stats, 'global per-duelist and relic win rates leave easy runs out'
shutil.rmtree(base, ignore_errors=True)
print('PASS easy mode: no boss curses, 2K heal to 8K, skippable shadow relic, +25% coins, 4 removal cards, no unlocks')
