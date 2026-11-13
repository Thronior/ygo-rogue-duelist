"""Card-art sleeves (2026-11-12): unlock rules for data/card-sleeves.json.

A duel's 'sleeve_metrics' event (android/web/sleeve-metrics.js) gives one-duel feats and per-duel counts. duel() keeps
them on the run; observe() credits the run's counts to the profile with a watermark, so repeated profile updates never
count twice, then adds every sleeve whose rule is met to profile['sleeves_earned']. Sleeves never lock again.
"""
import json
from pathlib import Path

SLEEVES = json.loads((Path(__file__).parent / 'data/card-sleeves.json').read_text(encoding='utf8'))['sleeves']
# Per-duel counts from the duel event that add up across runs.
DUEL_TOTALS = ('graveSpecials', 'dragonsByBattle', 'timeWizardWins', 'lightBanished', 'darkBanished', 'coinsTossed', 'diceRolled')
MARKS = ('tutorial', 'draft')


def _met(rule, value):
    if value is None:
        return False
    if 'equals' in rule:
        return value == rule['equals']
    if 'min' in rule and not value >= rule['min']:
        return False
    if 'max' in rule and not value <= rule['max']:
        return False
    return True


def duel(run, result, won, metrics):
    events = result.get('events', [])
    m = next((e for e in events if e.get('kind') == 'sleeve_metrics'), None)
    if m is None:
        return
    values = dict(m, lp=int(result.get('lp', 0)), overkill=max([e.get('amount', 0) for e in events if e.get('kind') == 'overkill'] or [0]))
    values['stolenFinish'] = int(bool(m.get('stolenFinish')))
    values['tribute3'] = int(bool(m.get('tribute3')))
    run['sleeve_no_damage_streak'] = run.get('sleeve_no_damage_streak', 0) + 1 if won and not m.get('damageTaken') else 0
    feats = set(run.get('sleeve_feats', []))
    for s in SLEEVES:
        rule = s['rule']
        kind = rule['kind']
        if kind == 'duel' and _met(rule, values.get(rule['key'], 0)):
            feats.add(s['id'])
        elif kind == 'win' and won and _met(rule, values.get(rule['key'])):
            feats.add(s['id'])
        elif kind == 'win_control' and won and all(name in m.get('field', []) for name in rule['cards']):
            feats.add(s['id'])
        elif kind == 'streak' and run['sleeve_no_damage_streak'] >= rule['min']:
            feats.add(s['id'])
    run['sleeve_feats'] = sorted(feats)
    totals = run.setdefault('sleeve_totals', {})
    for key in DUEL_TOTALS:
        totals[key] = totals.get(key, 0) + max(0, int(m.get(key, 0) or 0))
    for key in ('fusion', 'ritual'):
        totals[key] = totals.get(key, 0) + int(metrics.get(key, 0) or 0)
    if m.get('trapActivated'):
        run['sleeve_trap_activated'] = True


def evaluate(profile, run=None):
    """Adds every sleeve whose rule this profile (and run) meets; returns the ids added now."""
    before = set(profile.get('sleeves_earned', []))
    earned = before | set((run or {}).get('sleeve_feats', []))
    # Linked devices share done achievements (progress_sync.py); a card sleeve earned elsewhere counts here too.
    known = {s['id'] for s in SLEEVES}
    earned |= {a[7:] for a in profile.get('synced_achievements', []) if str(a).startswith('sleeve:') and a[7:] in known}
    stats = profile.get('sleeve_stats', {})
    marks = set(profile.get('sleeve_marks', []))
    complete = bool(run) and run.get('stage') == 'complete' and not run.get('secret_challenge')
    run_flags = {
        'no_traps': complete and not run.get('sleeve_trap_activated'),
        'tag': complete and run.get('history_mode') == 'tag',
        'level_minus_one': complete and run.get('challenge_level') == -1,
        'loop3': bool(run) and int(run.get('loop', 0) or 0) >= 2,
    }
    duelists = len(set(profile.get('won_as', [])))
    level_six = _level_six(profile)
    for s in SLEEVES:
        rule = s['rule']
        kind = rule['kind']
        if (kind == 'level6_all' and level_six[0] >= level_six[1]
                or kind == 'lifetime' and stats.get(rule['key'], 0) >= rule['min']
                or kind == 'lifetime_all' and all(stats.get(k, 0) >= v for k, v in rule['keys'].items())
                or kind == 'duelists' and duelists >= rule['min']
                or kind == 'mark' and rule['key'] in marks
                or kind == 'run' and run_flags.get(rule['key'])):
            earned.add(s['id'])
    profile['sleeves_earned'] = sorted(earned)
    return sorted(earned - before)


def observe(profile, run):
    stats = profile.setdefault('sleeve_stats', {})
    credited = run.setdefault('sleeve_credited', {})
    totals = dict(run.get('sleeve_totals', {}))
    totals['coins'] = int(run.get('stats', {}).get('coins_earned', 0) or 0)
    totals['rerolls'] = int(run.get('sleeve_rerolls', 0) or 0)
    totals['relicFusions'] = int(run.get('sleeve_relic_fusions', 0) or 0)
    for key, value in totals.items():
        delta = value - credited.get(key, 0)
        if delta > 0:
            stats[key] = stats.get(key, 0) + delta
            credited[key] = value
    added = evaluate(profile, run)
    if added:
        run['sleeves_new'] = sorted(set(run.get('sleeves_new', [])) | set(added))


def mark(profile, key):
    """The tutorial and Draft Duel wins happen outside a run; the client reports them."""
    if key not in MARKS:
        raise ValueError('Unknown sleeve mark.')
    profile['sleeve_marks'] = sorted(set(profile.get('sleeve_marks', [])) | {key})
    return evaluate(profile)


def _level_six(profile):
    """(duelists with a Challenge Level 6 win, playable duelists): the Rainbow sleeve needs every one."""
    from content import PLAYABLE_IDS
    levels = profile.get('character_levels', {})
    return sum(int(levels.get(str(i), -1)) >= 6 for i in PLAYABLE_IDS), len(PLAYABLE_IDS)


def _slug(name):
    import re, unicodedata
    return re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFKD', str(name).lower())).strip('-')


def achievements(profile):
    """Every sleeve as an Achievements row (Collection › Achievements): duelist sleeves, then the card-art ones."""
    from content import CHARACTERS, PLAYABLE_IDS
    earned = set(profile.get('sleeves_earned', []))
    stats = profile.get('sleeve_stats', {})
    levels = profile.get('character_levels', {})
    rows = []
    for i in PLAYABLE_IDS:
        name = CHARACTERS[i]['name']
        done = int(levels.get(str(i), -1)) >= 6
        rows.append(dict(id=f'sleeve:{i}', name=name, reward='Card sleeve', description=f'Win a run on Challenge Level 6 with {name} to unlock this sleeve.',
                         value=int(done), target=1, done=done, cumulative=False, image=f'sleeves/{_slug(name)}.jpg'))
    duelists = len(set(profile.get('won_as', [])))
    for s in SLEEVES:
        rule = s['rule']
        kind = rule['kind']
        if kind == 'lifetime':
            value, target = stats.get(rule['key'], 0), rule['min']
        elif kind == 'lifetime_all':
            value, target = sum(min(stats.get(k, 0), v) for k, v in rule['keys'].items()), sum(rule['keys'].values())
        elif kind == 'duelists':
            value, target = duelists, rule['min']
        elif kind == 'level6_all':
            value, target = _level_six(profile)
        else:
            value, target = int(s['id'] in earned), 1
        done = s['id'] in earned or kind in ('lifetime', 'lifetime_all', 'duelists', 'level6_all') and value >= target
        rows.append(dict(id='sleeve:' + s['id'], name=s['art'], reward='Card sleeve', description=s['text'], value=target if done else min(value, target),
                         target=target, done=done, cumulative=kind in ('lifetime', 'lifetime_all', 'duelists', 'level6_all'), image=f"sleeves/cards/{s['id']}.jpg"))
    return rows
