"""Campaign rules independent of Tk and the native EDOPro presentation."""
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RUNTIME = ROOT / 'runtime'
SAVE = ROOT / 'saves/run.json'
# The card pool (data/era-cards.json) is loaded by campaign_expansion.install() at the end of this module.
CARDS = []
BY_ID = {}
BY_NAME = {}
# CHARACTERS, OPPONENTS, ARTIFACTS and the run actions (new_run, save, open_pack, opponent_deck,
# prepare_duel, finish_duel, restock, buy) are installed by campaign_expansion.install() below.

def deck(run):
    return [run['pool'][i] for i in run['selected']]

def is_extra(cid):
    return bool(BY_ID[cid]['data']['type'] & 64)

def card_identity(cid):
    c=BY_ID[cid]
    return BY_ID.get(c['data'].get('alias',0),c)['name'].casefold()

def legal_fixed_cards(main,extra):
    """Apply shared-name limits to fixed player decks before presenting them."""
    counts=Counter();out=[[],[]]
    for zone,cards in enumerate((main,extra)):
        for cid in cards:
            key=card_identity(cid)
            if counts[key]>=3 or len(out[zone])>=(60 if zone==0 else 15):continue
            counts[key]+=1;out[zone].append(cid)
    return out


def validate(run):
    cards = deck(run)
    main = sum(not is_extra(c) for c in cards)
    extra = len(cards)-main
    from approved_relics import minimum
    if main < minimum(run) or main > 60: return f'Your main deck needs {minimum(run)} to 60 cards.'
    if extra > 15 and not (CHARACTERS[run['character']].get('copycat') and run.get('encore_active')): return 'Your Extra Deck can contain at most 15 cards.'
    from approved_relics import copy_limit
    limit=copy_limit(run)
    if limit is not None and max(Counter(card_identity(c) for c in cards).values(), default=0) > limit: return 'You can use at most three copies of a card.' if limit==3 else 'Singleton Pact: your Deck can contain only 1 copy of each card.'
    return None

def auto_deck(run):
    if CHARACTERS[run['character']].get('copycat') or CHARACTERS[run['character']].get('engine_deck'):return
    chosen, counts = [0,1], Counter(card_identity(c) for c in run['guaranteed'])
    options = list(range(2,len(run['pool'])))
    # A playable draft needs enough low-level monsters, then useful spells/traps.
    def score(i):
        c=BY_ID[run['pool'][i]]
        if is_extra(c['id']): return -10000
        if c['data']['type'] & 1:
            return 3000 + max(c['atk'], c['defense']) if normal_starter(c['id']) else c['atk']-2500
        return 2500
    for i in sorted(options, key=score, reverse=True):
        cid=run['pool'][i]
        limit=__import__('approved_relics').copy_limit(run)
        if (limit is None or counts[card_identity(cid)]<limit) and not is_extra(cid):
            chosen.append(i); counts[card_identity(cid)]+=1
        if sum(not is_extra(run['pool'][j]) for j in chosen)>=__import__('approved_relics').minimum(run): break
    run['selected']=sorted(chosen)

def rewards(run, events):
    from duel_rewards import score
    return score(run,events,BY_ID)

import sys
from campaign_expansion import install
install(sys.modules[__name__])


def normal_starter(cid):
 c=BY_ID[cid];t=c['data']['type']
 return bool(t&1) and not bool(t&(0x40|0x80|0x2000000)) and 1<=c['level']<=4 and 'cannot be normal summoned' not in c.get('desc','').lower()
