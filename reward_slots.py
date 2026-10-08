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
    if offer.get('kind') == 'deck':
        return reroll_deck(run, slot, rng)
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


def accept(run, slot=None):
    offer = run.get('reward_slots') or {}
    if offer.get('kind') == 'deck':
        if not offer.get('pending'):return
        validate_deck_offer(run, slot)
        chosen=offer['choices'][slot]
        run['pool']=chosen['main'][:]+chosen['extra'][:]
        run['selected']=list(range(len(run['pool'])))
        run['guaranteed']=[]
        run['engine_deck']='opponent:'+str(chosen['opponent'])
        run['engine_reward_selected']=True
    offer['pending'] = False
    offer.pop('source', None)


def prepare_decks(run, count, rng=random):
    from content import eligible_opponents, opponent_record, CHARACTERS
    round_index=run['round'];loop=run.get('loop',0)
    source=[]
    for opponent in eligible_opponents(round_index,loop):
        record=opponent_record(round_index,opponent,loop)
        c=CHARACTERS[opponent]
        source.append(dict(opponent=opponent,name=c['name'],sprite=c['sprite'],tier=4 if loop else min(3,round_index//3+1),main=record['main'][:],extra=record.get('extra',[])[:]))
    if not source:raise ValueError('No opponent decks are available for this tier.')
    run['last_reward_cards']=[];run['last_reward_card']=None
    run['reward_slots']=dict(kind='deck',duel=run['duel']['id'],source=source,choices=[rng.choice(source) for _ in range(max(1,count))],pending=True)


def validate_deck_offer(run, slot):
    offer=run.get('reward_slots') or {}
    if not offer.get('pending') or run.get('stage') not in ('shop','complete') or offer.get('duel')!=(run.get('duel') or {}).get('id'):
        raise ValueError('These deck choices are no longer available.')
    if type(slot) is not int or not 0<=slot<len(offer.get('choices',[])):
        raise ValueError('Choose one of the offered decks.')
    return offer


def reroll_deck(run, slot, rng=random):
    offer=validate_deck_offer(run,slot)
    if run['gold']<PRICE:raise ValueError('You need 15 coins to reroll.')
    choice=rng.choice(offer['source'])
    run['gold']-=PRICE;offer['choices'][slot]=choice
    return choice
