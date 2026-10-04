"""Persisted victory-card slots. Rerolls replace one awarded copy in place."""
import random

PRICE = 15


def prepare(run, source, start):
    run['reward_slots'] = dict(
        duel=run['duel']['id'], source=list(source),
        indices=list(range(start, len(run['pool']))), pending=True)


def reroll(run, slot, rng=random):
    offer = run.get('reward_slots') or {}
    if not offer.get('pending') or run.get('stage') not in ('shop', 'complete'):
        raise ValueError('These rewards are no longer available to reroll.')
    if offer.get('duel') != (run.get('duel') or {}).get('id'):
        raise ValueError('These rewards belong to an earlier duel.')
    indices = offer.get('indices', [])
    if type(slot) is not int or not 0 <= slot < len(indices):
        raise ValueError('Invalid reward slot.')
    if run['gold'] < PRICE:
        raise ValueError('You need 15 coins to reroll.')
    index = indices[slot]
    if not 0 <= index < len(run['pool']) or run['pool'][index] != run['last_reward_cards'][slot]:
        raise ValueError('This reward has already moved.')
    if not offer.get('source'):
        raise ValueError('No reward cards are available.')
    # Draw from the defeated deck, preserving duplicate-card weighting. The same
    # card may appear again: no rarity, pity, strength or previous-result bias.
    card = rng.choice(offer['source'])
    run['gold'] -= PRICE
    run['pool'][index] = card
    run['last_reward_cards'][slot] = card
    run['last_reward_card'] = run['last_reward_cards'][0]
    return card


def accept(run):
    offer = run.get('reward_slots') or {}
    offer['pending'] = False
    offer.pop('source', None)
