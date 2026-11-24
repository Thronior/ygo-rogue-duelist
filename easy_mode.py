"""Easy mode (user, 2026-11-24): a solo run option chosen before the run starts, saved as run['easy'].

An easy run plays by Challenge Level 0 rules (the level choice does not apply) with these changes:
1. Still 9 duels, but bosses have no curses (boss_preview.curse_count, campaign routes/prepare_duel, challenge_levels.suppress).
2. 2,000 LP healing after every won duel, not only bosses, up to the usual 8,000 LP limit (campaign finish_duel).
3. The shadow relic choice after a boss can be skipped (cursed_relics.skip).
4. 25% more coins from duel payouts, as its own payout line (campaign rewards).
5. Four removal cards join the starting deck (new_run): REMOVAL below.
6. No achievement progress or unlocks: update_profile, personal bests, the card collection and the global run results
   leave easy runs out. Run history keeps them, marked Easy.
Tag, Draft and Ultimate Collector runs never get it: Tag starts its runs without the flag, and active() also refuses
a Tag run that somehow carries it."""

REMOVAL = ('Mystical Space Typhoon', 'Dust Tornado', 'Fissure', 'Raigeki Break')
HEAL = 2000
COIN_BONUS = 25  # percent
BONUS_LINE = 'Easy mode bonus'
NAME = 'Easy mode'
DESCRIPTION = ('No boss curses. Heal 2,000 LP after every duel (up to 8,000 LP). 25% more coins. Shadow relics can be '
               'skipped. Starts with 4 removal cards. Easy runs earn no achievements or unlocks.')


def active(run):
    return bool(run) and bool(run.get('easy')) and run.get('history_mode') != 'tag'


def start(run, card_ids=(), fits=lambda run, cid: True):
    """Marks a new run easy and adds card_ids (REMOVAL's ids) to the end of its pool and to its deck when fits() allows
    another copy. Fixed-deck duelists (Copycat, the Dueling Engine) get the rules only: new_run passes no cards, since
    their decks are rebuilt from the opponent or the victory choices."""
    run['easy'] = True
    run['challenge_level'] = 0
    for cid in card_ids:
        ok = fits(run, cid)
        run['pool'].append(cid)
        if ok:
            run['selected'].append(len(run['pool']) - 1)
    run['easy_cards'] = list(card_ids)
    return run


def suppress(run):
    """Clears boss curses at campaign boundaries (called from challenge_levels.suppress), for old saves too."""
    if not active(run):
        return run
    run.update(curses=[], boss_curse=None, route_curses={})
    plan = run.get('next_boss')
    if isinstance(plan, dict):
        plan['curses'] = []
        plan.pop('variants', None)
    return run


def coin_bonus(total):
    return max(0, int(total) * COIN_BONUS // 100)


def modifier_row():
    return dict(kind='easy', name=NAME, description=DESCRIPTION)
