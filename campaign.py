"""Campaign rules independent of Tk and the native EDOPro presentation."""
from collections import Counter
from pathlib import Path
import json
import random
import uuid

ROOT = Path(__file__).resolve().parent
RUNTIME = ROOT / 'runtime'
SAVE = ROOT / 'saves/run.json'
CARDS = json.loads((ROOT/'data/cards.json').read_text(encoding='utf-8-sig'))
CARDS = [c for c in CARDS if c['date'] <= '2004-12-31']
BY_ID = {c['id']: c for c in CARDS}
BY_NAME = {c['name']: c for c in CARDS}
CHARACTERS = [
    dict(name='Yami Yugi', pack="Magician's Force", cards=['Kuriboh', 'Dark Magician'],
         bonus='Spellcaster summons and Spell activations', race='Spellcaster', type=2, color='#a17de0'),
    dict(name='Seto Kaiba', pack='Legend of Blue Eyes White Dragon', cards=['Blue-Eyes White Dragon', 'Jinzo'],
         bonus='Dragon summons and dealing damage', race='Dragon', type=0, color='#6daee7'),
    dict(name='Joey Wheeler', pack='Metal Raiders', cards=['Red-Eyes Black Dragon', 'Baby Dragon'],
         bonus='Warrior summons and declaring attacks', race='Warrior', type=0, color='#e7a558'),
    dict(name='Mai Valentine', pack='Spell Ruler', cards=['Harpie Lady', 'Cyber Harpie Lady'],
         bonus='Winged Beast summons and Trap activations', race='Winged Beast', type=4, color='#d280b5'),
]
OPPONENTS = ['Rookie Duelist', 'Forest Guardian', 'Rex Raptor', 'Weevil Underwood',
             'Bandit Keith', 'Mai Valentine', 'Seto Kaiba', 'Yami Yugi']
ARTIFACTS = {
    'ankh': ('Golden Ankh', 75, 'Gain 2,000 LP now. Your between-duel healing cap becomes 10,000.'),
    'feather': ('Phoenix Feather', 65, 'Recover 400 LP after each victory.'),
    'urn': ('Merchant Urn', 60, 'Earn 15 extra coins after each victory.'),
    'eye': ('Millennium Eye', 100, 'Draw one additional card in your opening hand.'),
    'scarab': ('Jade Scarab', 55, 'Recover 250 LP whenever you enter a new shop.'),
    'seal': ('Broken Seal', 90, 'Opponents begin each duel with 500 fewer LP.'),
}

def save(run):
    SAVE.parent.mkdir(exist_ok=True)
    temp = SAVE.with_suffix('.tmp')
    temp.write_text(json.dumps(run, indent=2), encoding='utf-8')
    temp.replace(SAVE)

def open_pack(name, rng=random):
    pool = [c for c in CARDS if any(s['name'] == name for s in c['sets'])]
    common = [c for c in pool if any(s['name'] == name and s['rarity'] == 'Common' for s in c['sets'])]
    rare = [c for c in pool if any(s['name'] == name and s['rarity'] != 'Common' for s in c['sets'])]
    if not common or not rare:
        raise ValueError(f'Pack data unavailable: {name}')
    return [rng.choice(common)['id'] for _ in range(8)] + [rng.choice(rare)['id']]

def new_run(index, rng=random):
    char = CHARACTERS[index]
    signatures = [BY_NAME[n]['id'] for n in char['cards']]
    packs = [open_pack(char['pack'], rng) for _ in range(4)]
    pool = signatures + sum(packs, [])
    return dict(version=2, character=index, lp=8000, gold=40, round=0,
                stage='draft', pool=pool, selected=[0, 1], guaranteed=signatures,
                packs=packs, artifacts=[], history=[], shop=[], duel=None)

def deck(run):
    return [run['pool'][i] for i in run['selected']]

def is_extra(cid):
    return bool(BY_ID[cid]['data']['type'] & 64)

def card_identity(cid):
    c=BY_ID[cid]
    return BY_ID.get(c['data'].get('alias',0),c)['name'].casefold()

def validate(run):
    cards = deck(run)
    main = sum(not is_extra(c) for c in cards)
    extra = len(cards)-main
    from approved_relics import minimum
    if main < minimum(run) or main > 60: return f'Your main deck needs {minimum(run)} to 60 cards.'
    if extra > 15 and not (CHARACTERS[run['character']].get('copycat') and run.get('encore_active')): return 'Your Extra Deck can contain at most 15 cards.'
    if max(Counter(card_identity(c) for c in cards).values(), default=0) > 3: return 'You can use at most three copies of a card.'
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
        if counts[card_identity(cid)]<3 and not is_extra(cid):
            chosen.append(i); counts[card_identity(cid)]+=1
        if sum(not is_extra(run['pool'][j]) for j in chosen)>=__import__('approved_relics').minimum(run): break
    run['selected']=sorted(chosen)

def opponent_deck(round_index, rng=random):
    # Deliberately curated effect-free monsters + safe staples. Later tiers have
    # higher stats, tribute threats and stronger removal instead of random combos.
    low=900+round_index*100
    high=min(2000, 1350+round_index*110)
    monsters=[c for c in CARDS if c['data']['type'] & 16 and c['data']['type'] & 1
              and c['level']<=4 and low<=c['atk']<=high]
    rng.shuffle(monsters)
    result=[]
    counts=Counter()
    while len(result)<15:
        c=rng.choice(monsters)
        if counts[c['id']]<3:
            result.append(c['id']); counts[c['id']]+=1
    bosses=['Summoned Skull', 'Blue-Eyes White Dragon', 'Dark Magician']
    if round_index>=2:
        boss=bosses[min(2, (round_index-2)//2)]
        result += [BY_NAME[boss]['id']] * (1+round_index//4)
    spells=['Red Medicine','Dian Keto the Cure Master','Fissure','Trap Hole','Waboku']
    if round_index>=3: spells += ['Pot of Greed','Raigeki']
    if round_index>=5: spells += ['Mirror Force','Harpie\'s Feather Duster']
    result += [BY_NAME[n]['id'] for n in spells if n in BY_NAME]
    rng.shuffle(result)
    return result

def prepare_duel(run, rng=random):
    error=validate(run)
    if error: raise ValueError(error)
    if run['lp']<=0 or run['round']>=len(OPPONENTS): raise ValueError('This run has ended.')
    request=dict(protocol=1,id=uuid.uuid4().hex,lp=run['lp'],round=run['round'])
    enemy_lp=4000+run['round']*500 - (500 if 'seal' in run['artifacts'] else 0)
    main=[c for c in deck(run) if not is_extra(c)]
    extra=[c for c in deck(run) if is_extra(c)]
    rng.shuffle(main)
    enemy=opponent_deck(run['round'],rng)
    lua=['-- Generated Shadow Run campaign duel. Native core enforces every action.',
         'Debug.SetAIName("'+OPPONENTS[run['round']]+'")',
         'Debug.ReloadFieldBegin(DUEL_MODE_MR1|DUEL_SIMPLE_AI,1)',
         f'Debug.SetPlayerInfo(0,{run["lp"]},{6 if "eye" in run["artifacts"] else 5},1)',
         f'Debug.SetPlayerInfo(1,{enemy_lp},5,1)']
    for player,cards,location in [(0,main,'LOCATION_DECK'),(0,extra,'LOCATION_EXTRA'),(1,enemy,'LOCATION_DECK')]:
        lua += [f'Debug.AddCard({cid},{player},{player},{location},0,POS_FACEDOWN_DEFENSE)' for cid in cards]
    lua += ['Debug.ReloadFieldEnd()']
    (RUNTIME/'puzzles').mkdir(exist_ok=True)
    (RUNTIME/'puzzles/shadow-run.lua').write_text('\n'.join(lua),encoding='utf-8')
    (RUNTIME/'campaign-result.json').unlink(missing_ok=True)
    tmp=RUNTIME/'campaign-request.tmp'
    tmp.write_text(json.dumps(request),encoding='utf-8'); tmp.replace(RUNTIME/'campaign-request.json')
    run['duel']=request; run['stage']='duel'; save(run)
    return request

def rewards(run, events):
    from duel_rewards import score
    return score(run,events,BY_ID)

def finish_duel(run,result,rng=random):
    if result.get('protocol')!=1 or not run.get('duel') or result.get('id')!=run['duel']['id']:
        raise ValueError('Duel result does not belong to this run.')
    if run['stage']!='duel': raise ValueError('This result has already been processed.')
    run['lp']=max(0,int(result['lp']))
    won=result['winner']==0 and run['lp']>0
    if not won:
        run['stage']='gameover'; run['last_rewards']={}; run['last_gold']=0
    else:
        breakdown,gold=rewards(run,result.get('events',[]))
        run['gold']+=gold; run['round']+=1
        run['last_rewards']=breakdown; run['last_gold']=gold
        cap=10000 if 'ankh' in run['artifacts'] else 8000
        if 'feather' in run['artifacts']: run['lp']=max(run['lp'],min(cap,run['lp']+400))
        run['stage']='complete' if run['round']==len(OPPONENTS) else 'shop'
        if run['stage']=='shop':
            if 'scarab' in run['artifacts']: run['lp']=max(run['lp'],min(cap,run['lp']+250))
            restock(run,rng)
    run['history'].append(result)
    save(run)

def restock(run,rng=random):
    available=[c for c in CARDS if not is_extra(c['id'])]
    singles=rng.sample(available,4)
    run['shop']=[dict(kind='single',id=c['id'],price=12+(10 if c['level']>=5 else 0),sold=False) for c in singles]
    run['shop'] += [dict(kind='pack',id=c['pack'],price=35,sold=False) for c in CHARACTERS]
    artifacts=[a for a in ARTIFACTS if a not in run['artifacts']]
    run['shop'] += [dict(kind='artifact',id=a,price=ARTIFACTS[a][1],sold=False) for a in rng.sample(artifacts,min(3,len(artifacts)))]

def buy(run,index,rng=random):
    if run['stage']!='shop': raise ValueError('The shop is closed.')
    item=run['shop'][index]
    if item['sold']: raise ValueError('Already purchased.')
    if item['price']>run['gold']: raise ValueError('Not enough coins.')
    obtained=[]
    if item['kind']=='single': obtained=[item['id']]
    elif item['kind']=='pack': obtained=open_pack(item['id'],rng)
    else:
        run['artifacts'].append(item['id'])
        if item['id']=='ankh': run['lp']+=2000
    run['pool']+=obtained; run['gold']-=item['price']; item['sold']=True
    save(run)
    return obtained

import sys
from campaign_expansion import install
install(sys.modules[__name__])


def normal_starter(cid):
 c=BY_ID[cid];t=c['data']['type']
 return bool(t&1) and not bool(t&(0x40|0x80|0x2000000)) and 1<=c['level']<=4 and 'cannot be normal summoned' not in c.get('desc','').lower()
