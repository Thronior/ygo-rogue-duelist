"""Card randomizer (user, 2026-11-15): builds brand-new cards out of the game's card pool for a relic, a second
Copycat loadout and a pack. Each card takes its name from one card and its art from another, rolls a frame,
Type, Attribute and Level, takes ATK from one monster and DEF from another monster of that Level, and gets an
effect assembled from building blocks: conditions (a timing is a condition), costs, effects, restrictions and
others (coin tosses, dice, upkeep costs). Each category rolls 0-2 blocks, then the rules below drop parts until
the card is valid. The blocks are written once in data/randomizer/randomizer.lua; a card's script is one line
of data, so every card that passes these rules runs on the same tested code. tools/test_randomizer_engine.mjs
plays the cards in the real engine.

Everything is seeded, so the same seed always builds the same cards (Tag partners, Draft opponents, replays).
English text only for now; each block's template gets translated once, like the relic texts."""
import json,random
from collections import Counter,defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parent
FIRST_ID=191000000  # clear of real codes (<100,000,000) and the 1900000xx custom cards

# ---------------------------------------------------------------- card pool
TYPE_MONSTER,TYPE_SPELL,TYPE_TRAP,TYPE_NORMAL,TYPE_EFFECT,TYPE_FUSION,TYPE_RITUAL=0x1,0x2,0x4,0x10,0x20,0x40,0x80
TYPE_TOKEN,TYPE_QUICKPLAY,TYPE_CONTINUOUS,TYPE_EQUIP,TYPE_FIELD,TYPE_COUNTER,TYPE_FLIP=0x4000,0x10000,0x20000,0x40000,0x80000,0x100000,0x200000
ATTRIBUTES={'EARTH':0x1,'WATER':0x2,'FIRE':0x4,'WIND':0x8,'LIGHT':0x10,'DARK':0x20}
RACES={'Warrior':0x1,'Spellcaster':0x2,'Fairy':0x4,'Fiend':0x8,'Zombie':0x10,'Machine':0x20,'Aqua':0x40,'Pyro':0x80,
 'Rock':0x100,'Winged Beast':0x200,'Plant':0x400,'Insect':0x800,'Thunder':0x1000,'Dragon':0x2000,'Beast':0x4000,
 'Beast-Warrior':0x8000,'Dinosaur':0x10000,'Fish':0x20000,'Sea Serpent':0x40000,'Reptile':0x80000}
SPELL_TYPES={'Normal':0,'Quick-Play':TYPE_QUICKPLAY,'Continuous':TYPE_CONTINUOUS,'Equip':TYPE_EQUIP,'Field':TYPE_FIELD,'Ritual':TYPE_RITUAL}
TRAP_TYPES={'Normal':0,'Continuous':TYPE_CONTINUOUS,'Counter':TYPE_COUNTER}

def _load_pool():
 rows=json.loads((ROOT/'data/era-cards.json').read_text(encoding='utf8'))
 art=ROOT/'android/web/assets/cards'
 # Real cards with a local scan only: no Tokens, no custom cards, nothing an earlier roll made. In the game (Pyodide)
 # the scans are not in the Python file system; every era card has one (checked by tools/test_random_cards.py).
 has_art=(lambda r:(art/f"{r['id']}.jpg").exists()) if art.is_dir() else (lambda r:True)
 return [r for r in rows if r['id']<100000000 and not r['data']['type']&TYPE_TOKEN and has_art(r)]
POOL=_load_pool()
MONSTERS=[c for c in POOL if c['data']['type']&TYPE_MONSTER]
MAIN_MONSTERS=[c for c in MONSTERS if not c['data']['type']&(TYPE_FUSION|TYPE_RITUAL)]
SPELLS=[c for c in POOL if c['data']['type']&TYPE_SPELL]
TRAPS=[c for c in POOL if c['data']['type']&TYPE_TRAP]
NORMAL_FLAVOR=[c['desc'] for c in MONSTERS if c['type']=='Normal Monster' and c['desc'].strip()]
# ATK/DEF donors: known stats only ('?' is stored as a negative number).
BY_LEVEL=defaultdict(list)
for c in MONSTERS:
 if c['atk']>=0 and c['defense']>=0:BY_LEVEL[c['level']].append(c)
RACE_WEIGHTS=Counter(c['race'] for c in MONSTERS if c['race'] in RACES)
ATTR_WEIGHTS=Counter(c['attribute'] for c in MONSTERS if c['attribute'] in ATTRIBUTES)
LEVELS={frame:Counter(c['level'] for c in group) for frame,group in {
 'normal':[c for c in MAIN_MONSTERS if c['data']['type']&TYPE_NORMAL],
 'effect':[c for c in MAIN_MONSTERS if c['data']['type']&TYPE_EFFECT],
 'fusion':[c for c in MONSTERS if c['data']['type']&TYPE_FUSION],
 'ritual':[c for c in MONSTERS if c['data']['type']&TYPE_RITUAL]}.items()}
SPELL_WEIGHTS=Counter(c['race'] for c in SPELLS if c['race'] in SPELL_TYPES and c['race']!='Ritual')  # Ritual Spells come with their monster
TRAP_WEIGHTS=Counter(c['race'] for c in TRAPS if c['race'] in TRAP_TYPES)

# How likely each kind of card is. Frames follow the user's list; weights are settings.
KIND_WEIGHTS={'monster':55,'spell':25,'trap':20}
# Every monster has a 15% chance to be a Normal Monster (user, Nov 15). The weight is a bit under 15 because
# Effect Monsters whose effects all get dropped by the rules also become Normal Monsters.
FRAME_WEIGHTS={'normal':13,'effect':57,'fusion':18,'ritual':12}
# How many pieces each category gets (user, Nov 15): 0 is likeliest, then 1, then 2, then 3, and so on, with 0
# near 40% for effects. Each extra piece is DECAY times as likely as one fewer (0.62: 0 = 40%, 1 = 25%, 2 = 16%,
# 3 = 10%, 4 = 6%, 5 = 4%). "Other" (coin, dice, upkeep) falls off faster so it stays special. Where a card needs at least
# one effect, the same falling chances start at 1 instead.
MAX_PIECES=5
# Costs and conditions a bit rarer (user, Nov 15): 0.5 gives none about 50% of the time. Restrictions are rarer
# still, since costs already restrict: 0.26 puts a rolled restriction on about 20% of cards with an effect. The
# automatic Once per turn is a rule, not a roll, so it is not counted.
COUNT_DECAY={'conds':.5,'costs':.5,'acts':.62,'limits':.26,'others':.3}
# Fusion and Ritual Monsters have an effect this often (user, Nov 15: more likely than other rolls); otherwise
# they are effect-less like Flame Swordsman.
EFFECT_CHANCE={'m_fusion':.8,'m_ritual':.8,'s_ritual':.75}
# Per-slot overrides of COUNT_DECAY. A Ritual Spell's Tribute requirement is already a condition (user, Nov 15),
# so it rolls extra conditions far less often (0.25: no condition 75% of the time) and effects more often (above).
SLOT_DECAY={'s_ritual':{'conds':.25}}

def _roll_count(rng,cat,minimum=0,slot=None):
 decay=SLOT_DECAY.get(slot,{}).get(cat,COUNT_DECAY[cat])
 weights=[decay**i for i in range(MAX_PIECES+1-minimum)]
 return minimum+rng.choices(range(len(weights)),weights)[0]

def pick(rng,weights):
 keys=list(weights);return rng.choices(keys,[weights[k] for k in keys])[0]

# ---------------------------------------------------------------- slots
# A slot is where an effect lives; it decides which blocks fit.
MONSTER_SLOTS={'m_main','m_fusion','m_ritual'}
FIELD_SLOTS=MONSTER_SLOTS|{'s_cont','s_equip','s_field','t_cont'}     # cards that stay on the field
ONE_SHOT={'s_normal','s_quick','t_normal','t_counter','s_ritual'}       # used once, then gone
# s_ritual: a Ritual Spell's extra pieces. Its effects happen after the Ritual Summon ("Then, ...").
ACTIVATED=MONSTER_SLOTS|{'s_normal','s_quick','s_cont','t_normal','t_cont','t_counter','s_ritual'}
ALL=ACTIVATED|{'s_equip','s_field'}

# ---------------------------------------------------------------- blocks
def R(lo,hi,step=1):
 # An amount range, low to high. Which value a card gets is rolled with a tilt (see _pick_amount).
 return tuple(range(lo,hi+1,step))
# Each block: fits (slots), text, and tags the rules read. Amounts are rolled per card from 'n'.
# Conditions. 'event' ones are timings (at most one per effect); 'state' ones check the board.
CONDS={
 'summoned':dict(kind='event',fits={'m_main'},text='If this card is Normal Summoned'),
 'special_summoned':dict(kind='event',fits={'m_fusion','m_ritual'},text='If this card is {how} Summoned'),
 'flip':dict(kind='event',fits={'m_main'},text='FLIP'),
 'destroyed':dict(kind='event',fits=MONSTER_SLOTS,text='If this card is destroyed and sent to the GY',gy=True),
 'battle_destroying':dict(kind='event',fits=MONSTER_SLOTS,text="If this card destroys an opponent's monster by battle"),
 'direct_damage':dict(kind='event',fits=MONSTER_SLOTS,text='If this card inflicts battle damage to your opponent by a direct attack'),
 'standby':dict(kind='event',fits=MONSTER_SLOTS|{'s_cont','t_cont'},text='During your Standby Phase'),
 'quick':dict(kind='event',fits=MONSTER_SLOTS|{'t_cont'},text="During either player's turn",repeat=True),
 'opp_attack':dict(kind='event',fits=MONSTER_SLOTS|{'s_cont','t_normal','t_cont','t_counter'},text="When an opponent's monster declares an attack",repeat=True),
 'opp_summon':dict(kind='event',fits=MONSTER_SLOTS|{'s_cont','t_normal','t_cont'},text='When your opponent Normal Summons a monster',
  trap_text='When your opponent Normal or Special Summons a monster',repeat=True),
 'opp_activate':dict(kind='event',fits=MONSTER_SLOTS|{'t_normal','t_cont','t_counter'},text='When your opponent activates a card or effect',repeat=True),
 'opp_activate_st':dict(kind='event',fits={'t_counter'},text='When your opponent activates a Spell/Trap Card'),
 'opp_summon_try':dict(kind='event',fits={'t_counter'},text='When your opponent would Summon a monster'),
 'lp_low':dict(kind='state',fits=ALL,text='your LP are 2000 or less'),
 'lp_behind':dict(kind='state',fits=ALL,text='you have less LP than your opponent'),
 'control_race':dict(kind='state',fits=ALL,text='you control a face-up {race} monster',race=True),
 'opp_more':dict(kind='state',fits=ALL,text='your opponent controls more monsters than you do'),
 'gy_monsters':dict(kind='state',fits=ALL,text='there are {n} or more monsters in your GY',n=R(2,7)),
 # Win conditions (user, Nov 15): only a "you win the Duel" effect rolls these, and it always has one of them
 # plus at least one more condition, so an instant win is never easy. Their amounts are rolled evenly, not
 # tilted toward the low end.
 'win_turn':dict(kind='state',fits=ALL,text='it is turn {n} or later',n=R(10,20),win=True),
 'win_gy':dict(kind='state',fits=ALL,text='there are {n} or more cards in your GY',n=R(15,25),win=True),
 'win_banished':dict(kind='state',fits=ALL,text='you have {n} or more banished cards',n=R(8,15),win=True),
 'win_hand':dict(kind='state',fits=ALL,text='you have {n} or more cards in your hand',n=R(7,9),win=True),
 'win_field':dict(kind='state',fits=ALL,text='you control 5 monsters',win=True),
}
WIN_CONDS={k for k,m in CONDS.items() if m.get('win')}
# Instant wins need at least this many conditions (user, Nov 15). A timing counts as a condition.
WIN_MIN_CONDITIONS=2
COSTS={
 'discard':dict(fits=ACTIVATED,spends=True,text='discard {n} card{s}',n=R(1,3)),
 'lp':dict(fits=ACTIVATED,text='pay {n} LP',n=R(100,3000,100)),
 'tribute_self':dict(fits=MONSTER_SLOTS,spends=True,text='Tribute this card',leaves=True,field=True),
 'tribute_other':dict(fits=ACTIVATED,spends=True,text='Tribute 1 other monster'),
 'banish_gy':dict(fits=ACTIVATED,text='banish {n} card{s} from your GY',n=R(1,5)),
 'mill_self':dict(fits=ACTIVATED,text='send the top {n} card{s} of your Deck to the GY',n=R(1,5)),
 'banish_self':dict(fits=MONSTER_SLOTS,text='banish this card from your GY',leaves=True,gy=True),
 'send_self':dict(fits={'s_cont','t_cont'},spends=True,text='send this face-up card to the GY',leaves=True,field=True),
}
NUMERIC={'recover','damage','self_atk','atk_down'}
# Effects that bring a card back from the GY, undoing a Tribute or discard cost.
RECOVERS={'revive','gy_to_hand'}
ACTS={
 'draw':dict(fits=ACTIVATED,text='draw {n} card{s}',n=R(1,4),label='Draw'),
 'recover':dict(fits=ACTIVATED,text='gain {n} LP',n=R(100,4000,100),label='Gain LP'),
 'damage':dict(fits=ACTIVATED,text='inflict {n} damage to your opponent',n=R(100,3000,100),label='Damage'),
 'destroy_st':dict(fits=ACTIVATED,tclause='target 1 Spell/Trap your opponent controls',text='destroy it',target=True,label='Destroy a Spell/Trap'),
 'destroy_mon':dict(fits=ACTIVATED,tclause='target 1 monster your opponent controls',text='destroy it',target=True,label='Destroy a monster'),
 'destroy_weak':dict(fits=ACTIVATED,text='destroy all face-up monsters your opponent controls with {n} or less ATK',n=R(300,3000,100),label='Destroy weak monsters'),
 'bounce_mon':dict(fits=ACTIVATED,tclause='target 1 monster your opponent controls',text='return it to the hand',target=True,label='Return a monster'),
 'atk_down':dict(fits=ACTIVATED,tclause='target 1 face-up monster your opponent controls',text='it loses {n} ATK until the end of this turn',n=R(100,2500,100),target=True,label='Lower ATK'),
 'pos_def':dict(fits=ACTIVATED,tclause='target 1 Attack Position monster your opponent controls',text='change it to Defense Position',target=True,label='Change position'),
 'search_race':dict(fits=ACTIVATED,text='add 1 {race} monster from your Deck to your hand',race=True,label='Search'),
 'search_spell':dict(fits=ACTIVATED,text='add 1 Spell from your Deck to your hand',label='Search'),
 'revive':dict(fits=ACTIVATED,text='Special Summon 1 Level 4 or lower monster from your GY',ss=True,label='Special Summon'),
 'ss_hand':dict(fits=ACTIVATED,text='Special Summon 1 Level 4 or lower monster from your hand',ss=True,label='Special Summon'),
 'gy_to_hand':dict(fits=ACTIVATED,text='add 1 monster from your GY to your hand',label='Add from GY'),
 'mill_opp':dict(fits=ACTIVATED,text='send the top {n} card{s} of your opponent\'s Deck to the GY',n=R(1,5),label='Mill'),
 'discard_opp':dict(fits=ACTIVATED,text='your opponent discards 1 random card',label='Random discard'),
 'banish_opp_gy':dict(fits=ACTIVATED,text="banish up to {n} card{s} from your opponent's GY",n=R(1,5),label='Banish'),
 # Lets you Fusion Summon, like Polymerization (user, Nov 15: these must exist, but rarely).
 'fusion_summon':dict(fits={'s_normal','s_quick','s_cont','m_main'},text='Fusion Summon 1 Fusion Monster from your Extra Deck, using monsters from your hand or field as Fusion Material',ss=True,label='Fusion Summon'),
 'fusion_summon_gy':dict(fits={'s_normal','s_quick','s_cont','m_main'},text='Fusion Summon 1 Fusion Monster from your Extra Deck by banishing Fusion Materials listed on it from your GY',ss=True,label='Fusion Summon'),
 # Instant win, like Exodia or Destiny Board (user, Nov 15): very rare, alone on its effect, and only with
 # WIN_MIN_CONDITIONS conditions including a win condition. Not on Ritual Spells (it would follow the Summon)
 # or Counter Traps (they only negate).
 'win':dict(fits=ACTIVATED-{'s_ritual','t_counter'},text='you win the Duel',label='Win the Duel'),
 'self_atk':dict(fits=MONSTER_SLOTS,text='this card gains {n} ATK until the end of this turn',n=R(100,2500,100),self=True,label='Gain ATK'),
 'self_pierce':dict(fits=MONSTER_SLOTS,text='this card inflicts piercing battle damage this turn',self=True,label='Piercing'),
 'self_direct':dict(fits=MONSTER_SLOTS,text='this card can attack directly this turn',self=True,label='Direct attack'),
 'no_attack_opp':dict(fits=ACTIVATED,text='your opponent cannot declare an attack this turn',label='Stop attacks'),
 'negate_attack':dict(fits=ACTIVATED,text='negate the attack',ctx='opp_attack',label='Negate the attack'),
 'destroy_attacker':dict(fits=ACTIVATED,text='destroy the attacking monster',ctx='opp_attack',label='Destroy the attacker'),
 'negate_activation':dict(fits={'t_counter'},text='negate the activation, and if you do, destroy that card',ctx='opp_activate_st',label='Negate'),
 'negate_effect':dict(fits=ACTIVATED,text='negate the activation, and if you do, destroy that card',ctx='opp_activate',label='Negate'),
 'negate_summon':dict(fits={'t_counter'},text='negate the Summon, and if you do, destroy that monster',ctx='opp_summon_try',label='Negate the Summon'),
 'destroy_summoned':dict(fits=ACTIVATED,text='destroy that monster',ctx='opp_summon',target=True,label='Destroy it'),
}
COUNTER_ACTS={'negate_activation','negate_effect','negate_summon','negate_attack'}
# Always-on effects. A card whose effect is one of these has no activation, cost, timing or once-per-turn.
AURAS={
 'aura_race_atk':dict(fits={'m_main','m_fusion','m_ritual','s_cont','s_field','t_cont'},text='{race} monsters you control gain {n} ATK',field_text='All {race} monsters on the field gain {n} ATK',race=True,n=R(100,1000,100)),
 'aura_attr_atk':dict(fits={'m_main','m_fusion','m_ritual','s_cont','s_field','t_cont'},text='{attr} monsters you control gain {n} ATK',field_text='All {attr} monsters on the field gain {n} ATK',attr=True,n=R(100,1000,100)),
 'aura_opp_down':dict(fits={'m_main','m_fusion','m_ritual','s_cont','s_field','t_cont'},text='Monsters your opponent controls lose {n} ATK',n=R(100,1000,100)),
 'self_indes':dict(fits=MONSTER_SLOTS,text='This card cannot be destroyed by battle'),
 'self_pierce_always':dict(fits=MONSTER_SLOTS,text='If this card attacks a Defense Position monster, inflict piercing battle damage'),
 'equip_atk':dict(fits={'s_equip'},text='The equipped monster gains {n} ATK',n=R(100,1500,100)),
 'equip_def':dict(fits={'s_equip'},text='The equipped monster gains {n} DEF',n=R(100,1500,100)),
 'equip_indes':dict(fits={'s_equip'},text='The equipped monster cannot be destroyed by battle'),
 'equip_pierce':dict(fits={'s_equip'},text='If the equipped monster attacks a Defense Position monster, inflict piercing battle damage'),
}
LIMITS={
 'opt':dict(fits=FIELD_SLOTS&ACTIVATED,once=True),
 'hopt':dict(fits=ACTIVATED,once=True),
 'once_duel':dict(fits=ACTIVATED,once=True),
 'no_bp':dict(fits=ACTIVATED,text='You cannot conduct your Battle Phase the turn you activate this {what}.'),
 'no_ss':dict(fits=ACTIVATED,text='You cannot Special Summon the turn you activate this {what}.'),
 'self_no_attack':dict(fits=MONSTER_SLOTS,text='This card cannot attack the turn you activate this effect.',field=True),
 'cannot_ss':dict(fits={'m_main'},text='Cannot be Special Summoned.'),
}
OTHERS={
 'coin':dict(fits=ACTIVATED,wrap=True),
 'call':dict(fits=ACTIVATED,wrap=True),
 'dice_mult':dict(fits=ACTIVATED,wrap=True),
 'dice_branch':dict(fits=ACTIVATED,wrap=True),
 'upkeep':dict(fits=FIELD_SLOTS,n=R(100,2000,100)),
 # A curse that follows the card, like Mushroom Man #2: whoever controls it takes the damage.
 'curse_damage':dict(fits=MONSTER_SLOTS|{'s_cont','t_cont','s_field'},n=R(100,500,100)),
}

# ---------------------------------------------------------------- unique mechanics
# The user's list of 50 unusual cards (Nov 15: Exodia ... Great Dezard): every kind of effect on it is a block. A
# mechanic that is really two ordinary pieces is split so the pieces also mix with other blocks: Fairy Box is
# 'call' + 'attacker_zero', Gamble is 'call' + 'draw_until' with "skip your next turn" if the call is wrong, Fiend
# Comedian is 'call' + 'banish_opp_gy_all' with a mill if wrong, Mushroom Man #2 is 'give_self' + 'curse_damage'.
# Extra keys the rules read:
#   needs: conditions or costs this effect always brings with it (added, never rolled away)
#   alone: the only effect on its card
#   ctx:   the timing(s) it only makes sense after
#   moves: moves this card itself (to a Deck, to the opponent), so nothing else may need it to stay
#   hand:  works from the hand or Deck (Dark Sage), so it has no field costs
#   set:   brings companion cards (Exodia pieces, Destiny Board letters, Sarcophagus pieces, Huge Revolution's trio)
UA=ACTIVATED-{'s_ritual','t_counter'}
STAY=MONSTER_SLOTS|{'s_cont','t_cont','s_field'}   # always-on rules need a card that stays on the field
CONDS.update({
 'opp_turn':dict(kind='state',fits=ALL,text="it is your opponent's turn"),
 'opp_bp':dict(kind='state',fits=ALL,text="it is your opponent's Battle Phase",needed=True),
 'lp_gap':dict(kind='state',fits=ALL,text='your opponent has {n} or more LP than you',n=R(3000,7000,500)),
 'gy_cards':dict(kind='state',fits=ALL,text='there are {n} or more cards in your GY',n=R(8,15)),
 'kills':dict(kind='state',fits=MONSTER_SLOTS,text='this card has destroyed {n} or more monsters by battle',n=R(1,3)),
 'control_normals':dict(kind='state',fits=ALL,text='you control {n} or more face-up Level 2 or lower Normal Monsters',n=R(3,5),needed=True),
 'control_named':dict(kind='state',fits=ALL,text='you control face-up {names}',needed=True),
 'battle_damage':dict(kind='event',fits=MONSTER_SLOTS,text='If this card inflicts battle damage to your opponent'),
 'sent_gy':dict(kind='event',fits=MONSTER_SLOTS,text='If this card is sent to the GY',gy=True),
 'destroyed_by_opp':dict(kind='event',fits=MONSTER_SLOTS,text="If this card is destroyed by your opponent's card and sent to the GY",gy=True),
 'sent_by_opp':dict(kind='event',fits=MONSTER_SLOTS,text="If a card effect your opponent controls sends this card to the GY",gy=True),
 'end_phase':dict(kind='event',fits=STAY,text='During your End Phase'),
 'coin_heads':dict(kind='event',fits=STAY,text='When a coin toss from a card you control lands on Heads',repeat=True),
 'targeted_st':dict(kind='event',fits=MONSTER_SLOTS,text='When a Spell/Trap Card that targets this card is activated',repeat=True),
})
COSTS.update({
 'send_all':dict(fits=ONE_SHOT-{'s_ritual'},spends=True,text='send all other cards in your hand and on your field to the GY',needed=True),
 'discard_spell':dict(fits=ACTIVATED,spends=True,text='discard 1 Spell'),
})
UNIQUE_ACTS={
 # 1. Alternate wins, losses and duel-changing effects
 'final_countdown':dict(fits=UA,alone=True,win=True,text='{n} turns after this effect resolves (counting this turn), you win the Duel',n=R(12,20),label='Countdown'),
 'last_turn':dict(fits={'s_quick','t_normal'},alone=True,win=True,needs=('lp_low','opp_turn'),label='Last battle',
  text='choose 1 monster you control and send all other cards in both players\' hands and on the field to the GY. Your opponent Special Summons 1 monster from their Deck in Attack Position and it attacks your monster. At the end of this turn, the player who controls a monster wins the Duel (a draw if both or neither do)'),
 'self_destruct':dict(fits=UA,alone=True,needs=('lp_gap',),text="both players' LP become 0 (the Duel is a draw)",label='Draw the Duel'),
 'quiz_swap':dict(fits=ONE_SHOT-{'s_ritual','t_counter'},alone=True,needs=('send_all',),label='Quiz',
  text='declare Monster, Spell or Trap and reveal the top card of your Deck. If it is that type, swap both players\' LP'),
 'swap_deck_gy':dict(fits=UA,alone=True,needs=('gy_cards',),text='each player swaps their Deck and GY',label='Swap Deck and GY'),
 # 2. Deck and card manipulation
 'fiber_reset':dict(fits=UA,alone=True,text="shuffle all cards in both players' hands, fields and GYs into their Decks, then each player draws {n} cards",n=R(3,6),label='Reset'),
 'parasite':dict(fits={'m_main'},moves=True,race=True,label='Parasite',
  text="shuffle this card face-up into your opponent's Deck. When they draw it, it is Special Summoned to their field in Defense Position, they take {n} damage, and all monsters they control become {race}",n=R(500,1500,100)),
 'treasure':dict(fits=UA,moves=True,label='Treasure',text='shuffle this card face-up into your Deck. When you draw it, send it to the GY, then add 1 card from your GY to your hand'),
 'handshake':dict(fits=UA,text="your opponent can shake hands. If they do, each player's LP become half of both players' combined LP",label='Handshake'),
 'banish_opp_gy_all':dict(fits=UA,text="banish all cards in your opponent's GY",label='Banish'),
 'end_turn':dict(fits=UA,needs=('opp_turn',),text="your opponent's turn skips to the End Phase",label='End the turn'),
 # 3. Guessing games, wagers and player interaction
 'exchange_card':dict(fits=UA,text="both players reveal their hands, then each takes 1 card from the other's hand",label='Exchange'),
 'question_revive':dict(fits=UA,ss=True,label='Question',
  text='your opponent names the bottom monster in your GY without looking. If they are wrong, Special Summon it; if right, banish it'),
 'painful_choice':dict(fits=UA,text='choose {n} cards from your Deck. Your opponent picks 1 to add to your hand, and the rest are sent to the GY',n=R(3,5),label='Choose'),
 'dd_capsule':dict(fits=UA,text='banish 1 card from your Deck face-down. During your {nth} Standby Phase after this, add it to your hand',n=R(1,3),label='Capsule'),
 'reasoning':dict(fits=UA,ss=True,label='Reasoning',
  text='your opponent declares a Level, then excavate cards from the top of your Deck until you reveal a monster that can be Normal Summoned. If its Level is different, Special Summon it; send the other excavated cards to the GY'),
 'magical_hats':dict(fits={'s_quick','t_normal'},needs=('opp_bp',),label='Hats',
  text='choose 1 monster you control and 2 Spells/Traps in your Deck. Set those Spells/Traps as Normal Monsters (ATK/DEF 0) and shuffle them face-down with that monster. Destroy those Spells/Traps at the end of the Battle Phase'),
 'ordeal_guess':dict(fits=UA,ctx='opp_attack',label='Ordeal',
  text='your opponent picks 1 random card in your hand and declares its type. If they are wrong, return the attacking monster to the hand'),
 'dd_designator':dict(fits=UA,text="declare a card name. If your opponent has it in their hand, banish it; otherwise banish 1 random card from your hand",label='Designate'),
 'oath_guess':dict(fits=UA,text='declare a card name and reveal the top card of your Deck. If it is that card, add it to your hand; otherwise send it to the GY',label='Guess'),
 'attacker_zero':dict(fits=UA,ctx='opp_attack',text="the attacking monster's ATK becomes 0 until the end of the Battle Phase",label='ATK to 0'),
 'dice_duel':dict(fits=UA,dice=True,label='Dice duel',
  text='each player rolls a six-sided die (again on a tie). The lower roller takes {n} damage for each pip of the higher roll, or {six} damage if it was a 6',n=R(300,700,100)),
 'draw_until':dict(fits=UA,text='draw until you have {n} cards in your hand',n=R(4,6),label='Draw'),
 'ante':dict(fits=UA,label='Ante',
  text="each player reveals 1 card from their hand. The card with the lower Level (non-monsters are Level 0) is sent to the GY and its owner takes {n} damage",n=R(500,1500,100)),
 # 4. Restrictions, punishments and escalating effects
 'negate_ban':dict(fits={'t_counter'},ctx='opp_activate_st',label='Seal',
  text='negate the activation, and if you do, destroy that card. Your opponent cannot activate cards with that name for the rest of the Duel'),
 'banish_copies':dict(fits=UA,ctx='opp_summon',target=True,label='Banish',
  text="banish that monster if it has {n} or less ATK, then banish all cards with its name from your opponent's hand and Deck",n=R(500,1500,100)),
 'law_wipe':dict(fits=UA,alone=True,needs=('control_normals',),label='Wipe',
  text="both players send their hands to the GY, then destroy all cards on the field except face-up Level 2 or lower Normal Monsters"),
 # 5. Rule-breaking mechanics
 'revolution':dict(fits={'s_normal','s_quick','t_normal'},alone=True,needs=('control_named',),set='trio',label='Revolution',
  text="your opponent sends their whole hand to the GY, then destroy all cards they control"),
 'banish_hand_temp':dict(fits=UA,label='Banish',
  text="banish 1 random card from your opponent's hand face-down. During their {nth} Standby Phase after this, it returns to their hand",n=R(1,4)),
 'skip_draw':dict(fits=UA,text='your opponent skips their next Draw Phase',label='Skip the draw'),
 'arm_shield':dict(fits=UA,ctx='opp_attack',target=True,label='Take control',
  tclause='target 1 other monster your opponent controls',text='take control of it until the end of the Battle Phase, then the attacking monster battles it'),
 # 6. Monsters with unusual mechanics
 'mass_revive':dict(fits=UA,ss=True,text='Special Summon up to {n} Level {l} or lower Normal Monsters from your GY',n=R(2,4),l=R(2,4),label='Special Summon'),
 'ss_self':dict(fits={'m_main'},ss=True,hand=True,ctx='coin_heads',text='Special Summon this card from your hand or Deck',label='Special Summon'),
 'absorb':dict(fits=MONSTER_SLOTS,self=True,target=True,label='Absorb',
  tclause='target 1 monster your opponent controls',text="equip it to this card. While it is equipped, this card's ATK and DEF become that monster's"),
 'steal_equip_self':dict(fits=MONSTER_SLOTS,ctx='destroyed_by_opp',target=True,label='Possess',
  tclause='target 1 monster your opponent controls',text='equip this card to it and take control of it'),
 'hand_wipe_next_draw':dict(fits=UA,text="at the start of your opponent's next Draw Phase, they send their whole hand to the GY",label='Discard their hand'),
 'give_self':dict(fits=MONSTER_SLOTS,moves=True,text='give control of this card to your opponent',label='Give away'),
 'ojama_tokens':dict(fits=UA,ss=True,label='Tokens',
  text='Special Summon {n} Ojama Token{s} (Beast/LIGHT/Level 2/ATK 0/DEF 1000) to your opponent\'s field in Defense Position. They cannot be Tributed for a Tribute Summon, and when one is destroyed, its controller takes {d} damage',n=R(1,3),d=R(100,500,100)),
 'traps_from_hand':dict(fits=UA,text='you can activate Trap Cards from your hand this turn',label='Traps from the hand'),
 'evolve':dict(fits=MONSTER_SLOTS,ss=True,needs=('kills','tribute_self'),label='Evolve',
  text='Special Summon 1 "{name}" from your hand or Deck, ignoring its Summoning conditions'),
 'negate_targeting':dict(fits=MONSTER_SLOTS,ctx='targeted_st',text='negate the activation, and if you do, destroy that card',label='Negate'),
}
ACTS.update(UNIQUE_ACTS)
COUNTER_ACTS.add('negate_ban')
UNIQUE_RULES={
 'match_kill':dict(fits=MONSTER_SLOTS,text="If this card inflicts battle damage that reduces your opponent's LP to 0, you win the Match"),
 'freeze_others':dict(fits=STAY,text='Other monsters on the field cannot attack or change their battle positions'),
 'respect_play':dict(fits=STAY,text='Each player plays with their hand revealed during their own turn'),
 'eye_truth':dict(fits=STAY,text="Your opponent plays with their hand revealed. During each of your opponent's Standby Phases, if they have a Spell in their hand, they gain {n} LP",n=R(500,1500,100)),
 'convulsion':dict(fits=STAY,text='Both players turn their Decks upside down'),
 'prohibition':dict(fits={'s_cont','t_cont'},text='When this card is activated, declare 1 card name. Cards with that name cannot be played'),
 'attack_tax':dict(fits=STAY,text="Your opponent must send the top {n} card{s} of their Deck to the GY to declare an attack",n=R(1,2)),
 'dark_snake':dict(fits=STAY,text='During each of your Standby Phases, both players take {n} damage, doubled each time',n=R(100,400,100)),
 'mirage':dict(fits={'s_cont','t_cont'},text="During your opponent's Standby Phase, draw until you have {n} cards in your hand. During your next Standby Phase, discard as many cards at random as you drew",n=R(3,5)),
 # Sets: the card brings its companions (see _make_set).
 'exodia_head':dict(fits={'m_main'},set='exodia',win=True,alone=True,no_conds=True,text='If you have this card and {names} in your hand, you win the Duel'),
 'destiny_board':dict(fits={'s_cont','t_cont'},set='board',win=True,alone=True,no_conds=True,
  text="During each of your opponent's End Phases, place the next of {names} from your hand or Deck face-up in your Spell & Trap Zone, in that order. When all of them are on your field, you win the Duel. If this card leaves the field, send them to the GY"),
 'sarcophagus':dict(fits={'s_cont'},set='sarcophagus',alone=True,no_conds=True,
  text='During each of your Standby Phases, place the next of {names} from your hand or Deck face-up in your Spell & Trap Zone, in that order. When all of them are on your field, send them and this card to the GY, then Special Summon "{payoff}" from your hand or Deck'),
}
AURAS.update(UNIQUE_RULES)
# Pieces made only by a set, never rolled.
AURAS['set_piece']=dict(fits={'t_cont'},text='This card cannot be activated or Set. Only "{board}" can place it on the field')
LIMITS['summon_by']=dict(fits={'m_main'},text='Cannot be Normal Summoned/Set. Must be Special Summoned by "{board}".')
SET_ONLY={'set_piece','summon_by'}
# Instant wins of every kind (user, Nov 15: very rare, at least 2 conditions).
WIN_ACTS={'win','final_countdown','last_turn','exodia_head','destiny_board'}
CATEGORIES={'conds':CONDS,'costs':COSTS,'acts':{**ACTS,**AURAS},'limits':LIMITS,'others':OTHERS}
# Rare mechanics keep a minimum weight so they still turn up (user: coin tosses, dice "should still be possible").
# How often each block is rolled (user, Nov 15: some conditions, timings and effects rarer than others). Rough
# guide: how often the effect appears on real cards and how swingy it is. Rare mechanics never drop to 0, so every
# block can still appear. Blocks not listed are uncommon.
TIERS={'common':8,'uncommon':4,'rare':2,'very rare':1}
RARITY={
 # timings
 'summoned':'common','special_summoned':'common','opp_attack':'common','opp_summon':'common','standby':'uncommon',
 'destroyed':'uncommon','battle_destroying':'uncommon','flip':'uncommon','opp_activate':'uncommon','quick':'rare',
 'direct_damage':'rare','opp_activate_st':'uncommon','opp_summon_try':'uncommon',
 # states
 'control_race':'common','lp_behind':'uncommon','gy_monsters':'uncommon','opp_more':'uncommon','lp_low':'rare',
 # costs
 'lp':'common','discard':'common','tribute_other':'uncommon','tribute_self':'uncommon','send_self':'uncommon',
 'banish_gy':'uncommon','mill_self':'rare','banish_self':'rare',
 # effects
 'destroy_mon':'common','destroy_st':'common','damage':'common','recover':'common','atk_down':'common','self_atk':'common',
 'negate_attack':'common','destroy_attacker':'common','destroy_summoned':'common',
 'draw':'uncommon','search_race':'uncommon','search_spell':'rare','revive':'uncommon','ss_hand':'uncommon','gy_to_hand':'uncommon',
 'bounce_mon':'uncommon','pos_def':'uncommon','destroy_weak':'uncommon','self_pierce':'uncommon','negate_effect':'uncommon',
 'negate_activation':'common','negate_summon':'common','mill_opp':'rare','discard_opp':'rare','banish_opp_gy':'rare',
 'self_direct':'rare','no_attack_opp':'rare','fusion_summon':'very rare','fusion_summon_gy':'very rare','win':'very rare',
 'aura_race_atk':'common','aura_attr_atk':'uncommon','aura_opp_down':'uncommon','self_indes':'uncommon','self_pierce_always':'uncommon',
 'equip_atk':'common','equip_def':'uncommon','equip_indes':'uncommon','equip_pierce':'uncommon',
 # restrictions
 # "You cannot X the turn you activate this" restrictions are rare (user, Nov 15).
 'opt':'common','hopt':'common','no_bp':'rare','no_ss':'rare','self_no_attack':'rare','once_duel':'rare','cannot_ss':'rare',
 # other
 'upkeep':'rare','coin':'rare','call':'rare','dice_mult':'very rare','dice_branch':'very rare','curse_damage':'rare',
 # unique mechanics (user's list of 50): each far rarer than a very rare block, so together they are about 1 card
 # in 50 (user, Nov 15) and stay special (UNIQUE_TIER)
 'opp_turn':'uncommon','lp_gap':'rare','gy_cards':'uncommon','kills':'rare','battle_damage':'uncommon','sent_gy':'uncommon',
 'destroyed_by_opp':'rare','sent_by_opp':'rare','end_phase':'uncommon','coin_heads':'rare','targeted_st':'rare','discard_spell':'rare',
 **{k:'unique' for k in UNIQUE_ACTS},**{k:'unique' for k in UNIQUE_RULES},
}
UNIQUE_TIER=.028
TIERS['unique']=UNIQUE_TIER
BLOCK_WEIGHTS={k:TIERS[t] for k,t in RARITY.items()}
# Instant wins are very rare (user, Nov 15). The list's win-and-draw cards are halved with the rest of the unique
# mechanics (user, Nov 15: about 1 card in 50 has one), so all instant wins together are about 7 per 1,000.
BLOCK_WEIGHTS.update({'win':.4,'final_countdown':.1,'exodia_head':.075,'destiny_board':.075,'last_turn':.05,'self_destruct':.125})

# High amounts get likelier with more conditions (user, Nov 15), without being guaranteed. An amount is rolled
# from its range with weights tilted by TILT: with no condition the low end is about 20x likelier than the top;
# each condition tilts it TILT_PER_CONDITION toward the top (3 conditions: the top is the likeliest).
TILT=-3.0
TILT_PER_CONDITION=1.6

def _pick_amount(rng,ladder,conditions=0):
 import math
 k=TILT+TILT_PER_CONDITION*conditions;m=len(ladder)
 if m==1:return ladder[0]
 return rng.choices(ladder,[math.exp(k*(i/(m-1)-.5)) for i in range(m)])[0]

# ---------------------------------------------------------------- rolling
def _roll_block(rng,cat,key,card):
 spec={'k':key};meta=CATEGORIES[cat][key]
 if 'n' in meta:spec['n']=rng.choice(meta['n']) if meta.get('win') else _pick_amount(rng,meta['n'])
 if meta.get('race'):spec['race']=pick(rng,RACE_WEIGHTS)
 if meta.get('attr'):spec['attr']=pick(rng,ATTR_WEIGHTS)
 for extra in ('l','d'):
  if extra in meta:spec[extra]=_pick_amount(rng,meta[extra])
 if key=='evolve':
  # Great Dezard → Fushioh Richie: a real Level 6-8 Effect Monster it turns into.
  c=rng.choice(EVOLVE_TARGETS);spec['code'],spec['name']=c['id'],c['name']
 if key in ('coin','call'):
  # What a lost toss or a wrong call does. "Skip your next turn" (Gamble) and "send as many cards from your Deck to
  # the GY as your opponent has in theirs" (Fiend Comedian) are the rare ones.
  spec['tails']=rng.choices(['none','damage','skip_turn','mill_opp_gy'],[5,4,1,1] if key=='coin' else [8,2,1,1])[0]
  spec['n']=rng.choice((500,1000))
 return spec

EVOLVE_TARGETS=[c for c in MAIN_MONSTERS if c['data']['type']&TYPE_EFFECT and 6<=c['level']<=8]

def _candidates(cat,slot,card):
 table=CATEGORIES[cat]
 keys=[k for k,m in table.items() if slot in m['fits']]
 # Win conditions come only with a win effect (see _pull_win_conditions); 'needed' blocks only with the effect
 # that needs them; set pieces only with their set.
 if cat=='conds':keys=[k for k in keys if k not in WIN_CONDS]
 keys=[k for k in keys if not table[k].get('needed') and k not in SET_ONLY]
 if cat=='acts':
  # Equip and Field Spells hold only always-on effects; Counter Traps only negate.
  if slot=='s_equip':keys=[k for k in keys if k.startswith('equip_')]
  elif slot=='s_field':keys=[k for k in keys if k in AURAS]
  elif slot=='t_counter':keys=[k for k in keys if k in COUNTER_ACTS]
  # A Ritual Spell's extra effect happens after the Summon, so it cannot target (targets are chosen on activation).
  elif slot=='s_ritual':keys=[k for k in keys if not ACTS.get(k,{}).get('target')]
  # Effects that need a timing this card can never have are not rolled at all.
  keys=[k for k in keys if not ACTS.get(k,{}).get('ctx') or slot in CONDS[ACTS[k]['ctx']]['fits']]
 return keys

def _sample(rng,keys,count):
 # Weighted picks without repeats (the same block twice is never useful).
 keys=list(keys);out=[]
 while keys and len(out)<count:
  k=rng.choices(keys,[BLOCK_WEIGHTS.get(x,TIERS['uncommon']) for x in keys])[0];out.append(k);keys.remove(k)
 return out

def _roll_parts(rng,slot,card):
 parts={}
 for cat in CATEGORIES:
  # A Spell/Trap must do something and an Effect Monster has an effect (a Ritual Spell already Ritual Summons).
  needs=cat=='acts' and (slot not in MONSTER_SLOTS|{'m_none','s_ritual'} or card.get('frame')=='effect')
  if cat=='acts' and slot in EFFECT_CHANCE:count=_roll_count(rng,cat,1,slot) if rng.random()<EFFECT_CHANCE[slot] else 0
  else:count=_roll_count(rng,cat,1 if needs else 0,slot)
  keys=_candidates(cat,slot,card)
  parts[cat]=[_roll_block(rng,cat,k,card) for k in _sample(rng,keys,count)]
 return parts

# ---------------------------------------------------------------- rules
def _event(parts):
 return next((p['k'] for p in parts['conds'] if CONDS[p['k']]['kind']=='event'),None)

def problem(parts,slot):
 """The first part that breaks a rule, as (category, index, reason), or None when the card is valid."""
 seen=set()
 for cat,items in parts.items():
  for i,p in enumerate(items):
   if (cat,p['k']) in seen:return cat,i,'the same block twice'
   seen.add((cat,p['k']))
   if slot not in CATEGORIES[cat][p['k']]['fits']:return cat,i,'does not fit this kind of card'
 conds,costs,acts,limits,others=(parts[c] for c in CATEGORIES)
 events=[i for i,p in enumerate(conds) if CONDS[p['k']]['kind']=='event']
 if len(events)>1:return 'conds',events[1],'two timings'
 event=_event(parts)
 # Instant wins: the only effect, with a win condition and WIN_MIN_CONDITIONS conditions in all. Win
 # conditions never appear without one.
 wins=[i for i,p in enumerate(acts) if p['k']=='win']
 wconds=[i for i,p in enumerate(conds) if p['k'] in WIN_CONDS]
 if wins:
  if len(acts)>1:return 'acts',next(i for i,p in enumerate(acts) if p['k']!='win'),'winning ends the Duel, so nothing comes with it'
  if not wconds or len(conds)<WIN_MIN_CONDITIONS:return 'acts',wins[0],f'an instant win needs a win condition and {WIN_MIN_CONDITIONS} or more conditions'
 elif wconds:return 'conds',wconds[0],'a win condition with no win effect'
 # A countdown win needs one more condition on top of its turns (user: at least 2 conditions).
 for i,p in enumerate(acts):
  if p['k']=='final_countdown' and not any(CONDS[c['k']]['kind']=='state' for c in conds):return 'acts',i,'a countdown win needs a condition as well as its turns'
 # Unique mechanics: what each one always brings, and effects that must be alone on their card.
 have={p['k'] for p in conds}|{p['k'] for p in costs}
 for i,p in enumerate(acts):
  meta=CATEGORIES['acts'][p['k']]
  for need in meta.get('needs',()):
   if need not in have:return 'acts',i,f'needs "{need}"'
  if meta.get('no_conds') and conds:return 'conds',0,f'its pieces are its conditions'
  if meta.get('alone') and len(acts)>1:return 'acts',next(j for j in range(len(acts)) if j!=i),f'"{p["k"]}" is the only effect on its card'
 needed={n for p in acts for n in CATEGORIES['acts'][p['k']].get('needs',())}
 for cat in ('conds','costs'):
  for i,p in enumerate(parts[cat]):
   if CATEGORIES[cat][p['k']].get('needed') and p['k'] not in needed:return cat,i,'only comes with the effect that needs it'
 auras=[i for i,p in enumerate(acts) if p['k'] in AURAS]
 if auras:
  # Always-on: no activation, so nothing that belongs to activating.
  if len(auras)<len(acts):return 'acts',next(i for i,p in enumerate(acts) if p['k'] not in AURAS),'mixes always-on and activated effects'
  if costs:return 'costs',0,'always-on effects have no cost'
  if event is not None:return 'conds',events[0],'always-on effects have no timing'
  for i,p in enumerate(limits):
   if p['k'] not in ('cannot_ss','summon_by'):return 'limits',i,'always-on effects are not activated'
  for i,p in enumerate(others):
   if OTHERS[p['k']].get('wrap'):return 'others',i,'always-on effects toss no coins'
 # Effects that only make sense after a certain timing ("negate the attack" needs an attack).
 for i,p in enumerate(acts):
  ctx=ACTS.get(p['k'],{}).get('ctx')
  if ctx and ctx!=event:return 'acts',i,f'needs the timing "{ctx}"'
 targets=[i for i,p in enumerate(acts) if ACTS.get(p['k'],{}).get('target')]
 if len(targets)>1:return 'acts',targets[1],'two targets in one effect'
 # Where this card is when the effect is used: the GY (after "destroyed and sent to the GY"), the hand or Deck
 # (Dark Sage's "Special Summon this card"), or the field.
 in_gy=bool(event and CONDS[event].get('gy'))
 in_hand=any(ACTS.get(p['k'],{}).get('hand') for p in acts)
 for i,p in enumerate(acts):
  meta=ACTS.get(p['k'],{})
  if (meta.get('self') or meta.get('moves')) and (in_gy or in_hand):return 'acts',i,'this card is not on the field then'
  if meta.get('moves') and any(ACTS.get(a['k'],{}).get('self') or (a is not p and ACTS.get(a['k'],{}).get('moves')) for a in acts):return 'acts',i,'this card moves away, but another effect needs it'
 for i,p in enumerate(costs):
  meta=COSTS[p['k']]
  if meta.get('gy') and not in_gy:return 'costs',i,'only works from the GY'
  if meta.get('field') and (in_gy or in_hand):return 'costs',i,'this card is not on the field'
  if meta.get('leaves') and any(ACTS.get(a['k'],{}).get('self') or ACTS.get(a['k'],{}).get('moves') for a in acts):return 'costs',i,'this card leaves, but the effect needs it'
 if any(p['k']=='tribute_self' for p in costs) and any(p['k']=='tribute_other' for p in costs):
  return 'costs',[p['k'] for p in costs].index('tribute_other'),'two Tributes'
 for i,p in enumerate(limits):
  if p['k']=='no_ss' and any(ACTS.get(a['k'],{}).get('ss') for a in acts):return 'limits',i,'it would forbid its own Special Summon'
  if p['k']=='self_no_attack' and (in_gy or any(c['k'] in ('tribute_self',) for c in costs)):return 'limits',i,'this card is not on the field'
  if p['k']=='opt' and slot in ONE_SHOT:return 'limits',i,'a card used once has no once-per-turn'
 once=[i for i,p in enumerate(limits) if LIMITS[p['k']].get('once')]
 if len(once)>1:return 'limits',once[1],'two once-per-turn limits'
 wraps=[i for i,p in enumerate(others) if OTHERS[p['k']].get('wrap')]
 if len(wraps)>1:return 'others',wraps[1],'two coin/dice rolls'
 for i in wraps:
  k=others[i]['k']
  if not acts:return 'others',i,'nothing to toss for'
  if k=='dice_mult' and not all(a['k'] in NUMERIC for a in acts):return 'others',i,'the die needs an amount to multiply'
  if k=='dice_branch' and len(acts)!=2:return 'others',i,'needs exactly 2 effects'
  if any(a['k'] in COUNTER_ACTS|{'negate_targeting'} for a in acts):return 'others',i,'a negate does not wait for a coin'
  if any(ACTS.get(a['k'],{}).get('dice') for a in acts):return 'others',i,'this effect rolls its own dice'
 for i,p in enumerate(limits):
  if slot=='s_ritual' and p['k']=='no_ss':return 'limits',i,'it would forbid its own Ritual Summon'
 # A Ritual Spell's costs, conditions and limits belong to its Ritual Summon, so they need no extra effect.
 if not acts and slot=='s_ritual':conds=costs=limits=[]
 # Upkeeps and curses are drawbacks that stand on their own; everything else needs an effect.
 alone_ok=('upkeep','curse_damage')
 if not acts and (costs or limits or [p for p in others if p['k'] not in alone_ok] or conds):
  cat=next(c for c in ('costs','limits','others','conds') if parts[c] and (c!='others' or [p for p in others if p['k'] not in alone_ok]))
  idx=0 if cat!='others' else next(i for i,p in enumerate(others) if p['k'] not in alone_ok)
  return cat,idx,'no effect to attach it to'
 if slot in {'s_normal','s_quick'} and event:return 'conds',events[0],'Spells are activated, they have no timing'
 return None

DROP_ORDER=('others','limits','costs','conds','acts')

def _pull_timing(parts,slot,log):
 # An effect that only works after a timing ("negate the attack") brings that timing along when the card
 # has none yet and can use it, instead of being thrown away.
 if _event(parts):return
 for p in parts['acts']:
  ctx=ACTS.get(p['k'],{}).get('ctx')
  if ctx and slot in CONDS[ctx]['fits']:
   parts['conds'].append({'k':ctx});log.append(f"added timing '{ctx}' for '{p['k']}'");return

def _pull_needs(rng,parts,slot,log):
 # A unique effect brings the conditions and costs it always has (Last Turn: LP 2000 or less, on your opponent's
 # turn), so a rare roll is not thrown away. A countdown win also gets one ordinary condition.
 for p in list(parts['acts']):
  meta=CATEGORIES['acts'][p['k']]
  for need in meta.get('needs',()):
   cat='conds' if need in CONDS else 'costs'
   if need not in {q['k'] for q in parts[cat]} and slot in CATEGORIES[cat][need]['fits']:
    parts[cat].append(_roll_block(rng,cat,need,{}));log.append(f"added '{need}' for '{p['k']}'")
  if p['k']=='final_countdown' and not any(CONDS[c['k']]['kind']=='state' for c in parts['conds']):
   pool=[k for k,m in CONDS.items() if m['kind']=='state' and slot in m['fits'] and not m.get('needed') and k not in WIN_CONDS]
   k=_sample(rng,pool,1)[0];parts['conds'].append(_roll_block(rng,'conds',k,{}));log.append(f"added condition '{k}' (a countdown win needs one)")

def _pull_win_conditions(rng,parts,slot,log):
 # A rolled win effect brings what it needs instead of being thrown away: a win condition, then more state
 # conditions until it has WIN_MIN_CONDITIONS (a timing it already has counts).
 if not any(p['k']=='win' for p in parts['acts']):return
 conds=parts['conds']
 if not any(p['k'] in WIN_CONDS for p in conds):
  k=rng.choice(sorted(k for k in WIN_CONDS if slot in CONDS[k]['fits']))
  conds.append(_roll_block(rng,'conds',k,{}));log.append(f"added win condition '{k}'")
 while len(conds)<WIN_MIN_CONDITIONS:
  have={p['k'] for p in conds}
  pool=[k for k,m in CONDS.items() if m['kind']=='state' and slot in m['fits'] and k not in have]
  k=_sample(rng,pool,1)[0];conds.append(_roll_block(rng,'conds',k,{}));log.append(f"added condition '{k}' (an instant win needs {WIN_MIN_CONDITIONS})")

def _roll_amounts_for_conditions(rng,parts,log):
 # Effects are rolled before the rules settle the conditions, so their amounts are rolled again here with the
 # final number of conditions tilting the roll.
 power=len(parts['conds'])
 for p in parts['acts']:
  meta={**ACTS,**AURAS}[p['k']]
  if 'n' in meta and not meta.get('win'):p['n']=_pick_amount(rng,meta['n'],power)
  if p['k'] in STAT_CHANGES:p['n']=_jitter(rng,p['n'])

# Effects that raise or lower ATK/DEF (user, Nov 15): the final amount is the rolled base plus or minus up to 500,
# in steps of 100, never below 0. A result of exactly 0 is rolled again, since "gains 0 ATK" would do nothing.
STAT_CHANGES={'self_atk','atk_down','aura_race_atk','aura_attr_atk','aura_opp_down','equip_atk','equip_def'}
STAT_JITTER=500

def _jitter(rng,base):
 while True:
  n=base+100*rng.randint(-STAT_JITTER//100,STAT_JITTER//100)
  if n>0:return n

def settle(rng,parts,slot,log):
 """Drop parts until no rule breaks, as asked: one part per failed check. Returns the final parts."""
 _pull_timing(parts,slot,log)
 _pull_win_conditions(rng,parts,slot,log)
 _pull_needs(rng,parts,slot,log)
 for _ in range(40):
  found=problem(parts,slot)
  if not found:break
  cat,i,why=found
  log.append(f"dropped {cat[:-1]} '{parts[cat][i]['k']}': {why}")
  parts[cat].pop(i)
 else:raise RuntimeError('rules did not settle')
 # Counter Traps: if the negate fell out, roll one that fits the timing (or a fresh pair).
 if slot=='t_counter' and not parts['acts']:
  event=_event(parts) or rng.choice(['opp_activate_st','opp_summon_try','opp_attack'])
  act={'opp_activate_st':'negate_activation','opp_summon_try':'negate_summon','opp_attack':'negate_attack','opp_activate':'negate_effect'}[event]
  parts['conds']=[p for p in parts['conds'] if CONDS[p['k']]['kind']=='state']+[{'k':event}]
  parts['acts']=[{'k':act}];log.append(f"Counter Trap: negate '{act}' for '{event}'")
 if slot not in MONSTER_SLOTS|{'s_ritual'} and not parts['acts']:
  # A Spell/Trap lost every effect: give it one that fits and settle again.
  # Picked evenly, so the very rare instant win is left out here (it would skip its rarity).
  keys=[k for k in _candidates('acts',slot,{}) if not ACTS.get(k,{}).get('ctx') and k!='win'] or _candidates('acts',slot,{})
  parts['acts']=[_roll_block(rng,'acts',rng.choice(keys),{})];log.append(f"Spell/Trap had no effect left: rolled '{parts['acts'][0]['k']}'")
  return settle(rng,parts,slot,log)
 if problem(parts,slot):return settle(rng,parts,slot,log)
 # Once per turn (user): an activated effect with no timing, or a timing that can happen many times a turn,
 # gets "Once per turn" unless a stricter limit is already there. Cards used once are exempt.
 # An instant win needs no Once per turn: it ends the Duel.
 activated=parts['acts'] and not any(p['k'] in AURAS or p['k'] in WIN_ACTS for p in parts['acts'])
 if activated and slot not in ONE_SHOT:
  event=_event(parts)
  repeatable=event is None or CONDS[event].get('repeat')
  # A cost that discards or takes a card off your field already limits it (user, Nov 15), unless the effect can
  # bring that card straight back from the GY: Tribute a monster then revive it, or discard then add it back,
  # repeats for free forever.
  spends=any(COSTS[p['k']].get('spends') for p in parts['costs'])
  recovers=any(p['k'] in RECOVERS for p in parts['acts'])
  if repeatable and spends and not recovers:log.append("no 'Once per turn': its cost discards or removes a card")
  elif repeatable and not any(LIMITS[p['k']].get('once') for p in parts['limits']):
   parts['limits'].insert(0,{'k':'opt'});log.append("added 'Once per turn' (no timing that limits it)"+(' (its cost could come straight back)' if spends else ''))
 # A card that leaves and comes back is a new card, so a plain "Once per turn" starts over (fuzz test, Nov 15: a
 # monster tributed itself to revive itself forever). Effects that move this card or bring cards back use the
 # name-based limit instead, like real cards do.
 # A countdown win on a card that stays would stack countdowns if used again (engine test, Nov 15): once per Duel.
 if any(p['k']=='final_countdown' for p in parts['acts']) and slot not in ONE_SHOT:
  parts['limits']=[p for p in parts['limits'] if not LIMITS[p['k']].get('once')]+[{'k':'once_duel'}];log.append("countdown win: once per Duel")
 cycles=any(COSTS[p['k']].get('leaves') for p in parts['costs']) or any(ACTS.get(p['k'],{}).get('ss') or ACTS.get(p['k'],{}).get('moves') or p['k']=='gy_to_hand' for p in parts['acts'])
 if cycles and slot not in ONE_SHOT:
  for p in parts['limits']:
   if p['k']=='opt':p['k']='hopt';log.append("'Once per turn' became once per turn per card name (the card can come back)")
 _roll_amounts_for_conditions(rng,parts,log)
 # A die multiplies a small amount per pip (roll 6 x 300 = 1800), so the base amount shrinks.
 if any(p['k']=='dice_mult' for p in parts['others']):
  for p in parts['acts']:
   if p['k'] in NUMERIC:p['n']=max(100,round(p['n']/3.5/100)*100)
 return parts

# ---------------------------------------------------------------- text
def _ordinal(n):
 return {1:'next',2:'2nd',3:'3rd'}.get(n,f'{n}th')

def _fmt(text,p,card):
 n=p.get('n');how={'m_fusion':'Fusion','m_ritual':'Ritual'}.get(card['slot'],'')
 names=_join([f'"{x}"' for x in p['names']]) if p.get('names') else ''
 return text.format(n=n,s='' if n==1 else 's',race=p.get('race',''),attr=p.get('attr',''),how=how,l=p.get('l'),d=p.get('d'),
  six=(n or 0)*12,nth=_ordinal(n),name=p.get('name',''),names=names,board=p.get('board_name',''),payoff=p.get('payoff_name','')
  ).replace('the top 1 card ','the top card ').replace('During your next Standby Phase after this','During your next Standby Phase')

# What a lost coin toss or a wrong call does.
def _tails_text(w):
 return {'none':'nothing happens','damage':f"you take {w['n']} damage",'skip_turn':'you skip your next turn',
  'mill_opp_gy':"send as many cards from the top of your Deck to the GY as there are cards in your opponent's GY"}[w.get('tails','none')]

def _wrap_text(w,effects):
 cap=lambda t:t[:1].upper()+t[1:]
 if w['k']=='coin':return f'toss a coin. Heads: {cap(effects)}. Tails: {cap(_tails_text(w))}'
 if w['k']=='call':
  wrong='' if w.get('tails','none')=='none' else f'. If you call it wrong, {_tails_text(w)}'
  return f'call the coin toss. If you call it right, {effects}{wrong}'
 if w['k']=='dice_mult':return f'roll a six-sided die and {effects}'
 if w['k']=='dice_branch':return f'roll a six-sided die. {effects}'
 return effects

def _wrap(others):
 return next((p for p in others if OTHERS[p['k']].get('wrap')),None)

def _act_text(p,card,mult=False):
 meta={**ACTS,**AURAS}[p['k']];text=meta.get('field_text') if card['slot']=='s_field' and 'field_text' in meta else meta['text']
 if mult and 'n' in p:return _fmt(text,p,card).replace(str(p['n']),f"{p['n']} × the result",1)
 return _fmt(text,p,card)

def _join(items,last=' and '):
 return items[0] if len(items)==1 else ', '.join(items[:-1])+last+items[-1]

def effect_text(card):
 parts,slot,name=card['parts'],card['slot'],card['name']
 conds,costs,acts,limits,others=(parts[c] for c in CATEGORIES)
 if not acts and not any(p['k']=='summon_by' for p in limits):return ''
 lines=[]
 cap=lambda t:t[:1].upper()+t[1:]
 low=lambda t:t if t.split(' ')[0] in ('FLIP','Spell','Trap','Special','Tribute','Normal','Ritual','Fusion') or t.split(' ')[0].isupper() else t[:1].lower()+t[1:]
 states=[_fmt(CONDS[p['k']]['text'],p,card) for p in conds if CONDS[p['k']]['kind']=='state']
 if not acts:pass
 elif acts[0]['k'] in AURAS:
  effects=[_act_text(p,card) for p in acts]
  body='. '.join(effects)+'.'
  if states:body=f'While {_join(states)}, '+low(body)
  if slot=='s_equip':body='Equip only to a face-up monster. '+body
  lines.append(body)
 else:
  event=_event(parts);wrap=_wrap(others)
  once=next((p['k'] for p in limits if LIMITS[p['k']].get('once')),None)
  one_shot=slot in ONE_SHOT
  lead=[]
  if once=='opt':lead.append('Once per turn')
  if event and event!='flip':
   meta=CONDS[event];t=meta.get('trap_text') if slot.startswith('t_') and 'trap_text' in meta else meta['text']
   lead.append(_fmt(t,{},card))
  if states and not one_shot:lead.append('if '+_join(states))
  if states and one_shot and event:lead.append('if '+_join(states))
  if states and one_shot and not event:lines.append(f'Activate only if {_join(states)}.')
  prefix=('FLIP: ' if event=='flip' else '')+(cap(', '.join(lead[:1]+[low(x) for x in lead[1:]]))+': ' if lead else '')
  if wrap and wrap['k']=='dice_mult':effects=_join([_act_text(p,card,True) for p in acts],', then ')
  elif wrap and wrap['k']=='dice_branch':effects=f'1-3: {cap(_act_text(acts[0],card))}. 4-6: {cap(_act_text(acts[1],card))}'
  else:effects=_join([_act_text(p,card) for p in acts],', then ')
  if wrap:effects=_wrap_text(wrap,effects)
  # Costs and targets come before the semicolon; what happens on resolution comes after (official card wording).
  cost=_join([_fmt(COSTS[p['k']]['text'],p,card) for p in costs]) if costs else ''
  tclause=next((ACTS[p['k']]['tclause'] for p in acts if 'tclause' in ACTS.get(p['k'],{})),'')
  pre=cost+(', then ' if cost and tclause else '')+tclause
  body=(pre+'; '+effects) if pre else effects
  # "You can" needs a verb after it: "You can this card gains 400 ATK" becomes "You can activate this effect; this
  # card gains 400 ATK" (official wording when there is no cost or target).
  first=effects.split(' ')[0].lower()
  if not one_shot and not pre and (first in ('this','your','you','it','monsters','all','both','each','the','at') or first[:1].isdigit()):body='activate this effect; '+effects
  if not one_shot:body='You can '+low(body)
  # After "When ...:" the effect starts with a capital, as on real cards ("...: Destroy it.").
  lines.append(prefix+cap(body).rstrip('.')+'.')
  what='card' if one_shot else 'effect'
  for p in limits:
   if p['k']=='hopt':lines.append(f'You can only activate 1 "{name}" per turn.' if one_shot else f'You can only use this effect of "{name}" once per turn.')
   elif p['k']=='once_duel':lines.append(f'You can only activate 1 "{name}" per Duel.' if one_shot else f'You can only use this effect of "{name}" once per Duel.')
   elif LIMITS[p['k']].get('text') and p['k'] not in ('cannot_ss','summon_by'):lines.append(LIMITS[p['k']]['text'].format(what=what))
 if any(p['k']=='cannot_ss' for p in limits):lines.insert(0,LIMITS['cannot_ss']['text'])
 for p in limits:
  if p['k']=='summon_by':lines.insert(0,_fmt(LIMITS['summon_by']['text'],p,card))
 for p in others:
  if p['k']=='upkeep':lines.append(f"During your Standby Phase, pay {p['n']} LP or destroy this card.")
  if p['k']=='curse_damage':lines.append(f"During your Standby Phase, you take {p['n']} damage.")
 return ' '.join(lines)

# ---------------------------------------------------------------- whole cards
def _fusion_materials(rng):
 # 2 or 3 materials, each a Type, Attribute, Level band, "Normal Monster" or one named card. Every material
 # matches at least 20 main-deck monsters in the pool, so the Fusion can always be made.
 mats=[]
 for _ in range(rng.choice((2,2,3))):
  kind=rng.choices(['race','attr','low','high','normal','code'],[4,3,2,1,1,2])[0]
  if kind=='race':
   race=pick(rng,{r:w for r,w in RACE_WEIGHTS.items() if sum(c['race']==r for c in MAIN_MONSTERS)>=20});mats.append({'k':'race','v':RACES[race],'text':f'1 {race} monster'})
  elif kind=='attr':
   attr=pick(rng,ATTR_WEIGHTS);mats.append({'k':'attr','v':ATTRIBUTES[attr],'text':f'1 {attr} monster'})
  elif kind=='low':mats.append({'k':'low','text':'1 Level 4 or lower monster'})
  elif kind=='high':mats.append({'k':'high','text':'1 Level 5 or higher monster'})
  elif kind=='normal':mats.append({'k':'normal','text':'1 Normal Monster'})
  else:
   c=rng.choice(MAIN_MONSTERS);mats.append({'k':'code','v':c['id'],'text':f'"{c["name"]}"'})
 return mats

def _stats(rng,level):
 # ATK from one monster, DEF from a different one, both of this Level (nearest Level with two if needed).
 for lv in sorted(BY_LEVEL,key=lambda l:(abs(l-level),l)):
  if len(BY_LEVEL[lv])>=2:
   a,d=rng.sample(BY_LEVEL[lv],2);return a,d
 raise RuntimeError('no stat donors')

def _name_art(rng,group,used):
 # Name from one card, art from a different card, both of the same kind (monster/Spell/Trap).
 # Unused cards first; once fewer than 2 are left (around 1,000 cards in), names and art may repeat.
 free=[c for c in group if c['id'] not in used]
 if len(free)<2:free=group
 name,art=rng.sample(free,2);used.update((name['id'],art['id']));return name,art

def _engine_data(card):
 return {'code':card['id'],'alias':0,'setcodes':[],'type':card['data_type'],'level':card.get('level',0),'attribute':ATTRIBUTES.get(card.get('attribute'),0),
  'race':str(RACES.get(card.get('race'),0)),'attack':card.get('atk',0),'defense':card.get('defense',0),'lscale':0,'rscale':0,'link_marker':0}

def _lua(value):
 if isinstance(value,bool):return 'true' if value else 'false'
 if isinstance(value,(int,float)):return str(value)
 if isinstance(value,str):return json.dumps(value)
 if isinstance(value,list):return '{'+','.join(_lua(v) for v in value)+'}'
 return '{'+','.join(f'{k}={_lua(v)}' for k,v in value.items())+'}'

def card_script(card):
 rand={'slot':card['slot'],'frame':card.get('frame',''),**{c:[{k:v for k,v in p.items() if k!='text'} for p in card['parts'][c]] for c in CATEGORIES}}
 for p in rand['conds']+rand['acts']:
  if 'race' in p:p['race']=RACES[p['race']]
  if 'attr' in p:p['attr']=ATTRIBUTES[p['attr']]
 if card.get('materials'):rand['mats']=[{k:v for k,v in m.items() if k!='text'} for m in card['materials']]
 if card.get('ritual_for'):rand['ritual_for'],rand['ritual_level']=card['ritual_for'],card['ritual_level']
 return (f'--{card["name"]} (randomized card, built by randomizer.py)\n'
  'if not Randomizer then Duel.LoadScript("randomizer.lua") end\n'
  'local s,id=GetID()\n'
  f's.rand={_lua(rand)}\n'
  'function s.initial_effect(c) Randomizer.Build(c,s,id) end\n')

def make_card(rng,next_id,used,kind=None,frame=None,sub=None,log=None):
 """One randomized card (two for a Ritual Monster: it brings its Ritual Spell). Returns a list of cards."""
 log=log if log is not None else []
 kind=kind or pick(rng,KIND_WEIGHTS)
 card={'id':next_id(),'kind':kind,'log':log}
 if kind=='monster':
  frame=frame or pick(rng,FRAME_WEIGHTS)
  name,art=_name_art(rng,MONSTERS,used)
  level=pick(rng,LEVELS[frame]);atk_from,def_from=_stats(rng,level)
  race,attr=pick(rng,RACE_WEIGHTS),pick(rng,ATTR_WEIGHTS)
  slot={'normal':'m_none','effect':'m_main','fusion':'m_fusion','ritual':'m_ritual'}[frame]
  card.update(frame=frame,slot=slot,level=level,race=race,attribute=attr,atk=atk_from['atk'],defense=def_from['defense'],
   name=name['name'],name_from=name['id'],art_from=art['id'],atk_from=atk_from['id'],def_from=def_from['id'])
  card['parts']={c:[] for c in CATEGORIES}
  if frame!='normal':
   card['parts']=settle(rng,_roll_parts(rng,slot,card),slot,log)
   if frame=='effect' and not card['parts']['acts']:
    # A Normal Monster keeps no pieces at all (an upkeep with no effect left once stayed in its data, seed 77).
    frame='normal';card.update(frame='normal',slot='m_none');card['parts']={c:[] for c in CATEGORIES}
    log.append('every effect was dropped: it became a Normal Monster')
  extra=_make_set(rng,next_id,used,card)
  flip=_event(card['parts'])=='flip'
  has_effect=bool(card['parts']['acts'])
  t=TYPE_MONSTER|{'normal':TYPE_NORMAL,'effect':TYPE_EFFECT,'fusion':TYPE_FUSION,'ritual':TYPE_RITUAL}[frame]
  if has_effect:t|=TYPE_EFFECT
  if flip:t|=TYPE_FLIP
  card['data_type']=t
  label={'normal':'Normal Monster','effect':'Effect Monster','fusion':'Fusion Monster','ritual':'Ritual Monster'}[frame]
  if flip:label='Flip Effect Monster'
  elif frame in ('fusion','ritual') and has_effect:label=label.replace(' Monster',' Effect Monster')
  card['type']=label
  card['type_line']='['+'/'.join([race]+(['Fusion'] if frame=='fusion' else ['Ritual'] if frame=='ritual' else [])+(['Flip'] if flip else [])+(['Effect'] if has_effect else [])+(['Normal'] if frame=='normal' else []))+']'
  if frame=='normal':
   desc=next((c['desc'] for c in MONSTERS if c['id']==name['id'] and c['type']=='Normal Monster'),None) or rng.choice(NORMAL_FLAVOR)
   card['desc']=desc;card['flavor']=True
  else:card['desc']=effect_text(card)
  out=[card]
  if frame=='fusion':
   card['materials']=_fusion_materials(rng)
   card['desc']=' + '.join(m['text'] for m in card['materials'])+('\n'+card['desc'] if card['desc'] else '')
  if frame=='ritual':
   spell=make_ritual_spell(rng,next_id,used,card,log=[])
   card['ritual_spell']=spell['id']
   card['desc']=f'You can Ritual Summon this card with "{spell["name"]}".'+(' '+card['desc'] if card['desc'] else '')
   out.append(spell)
 else:
  table=SPELL_WEIGHTS if kind=='spell' else TRAP_WEIGHTS
  sub=sub or pick(rng,table)
  group=SPELLS if kind=='spell' else TRAPS
  name,art=_name_art(rng,group,used)
  slot={'spell':{'Normal':'s_normal','Quick-Play':'s_quick','Continuous':'s_cont','Equip':'s_equip','Field':'s_field'},
        'trap':{'Normal':'t_normal','Continuous':'t_cont','Counter':'t_counter'}}[kind][sub]
  card.update(slot=slot,sub=sub,name=name['name'],name_from=name['id'],art_from=art['id'],level=0)
  card['parts']=settle(rng,_roll_parts(rng,slot,card),slot,log)
  card['data_type']=(TYPE_SPELL if kind=='spell' else TYPE_TRAP)|(SPELL_TYPES if kind=='spell' else TRAP_TYPES)[sub]
  card['type']='Spell Card' if kind=='spell' else 'Trap Card'
  card['type_line']=f"[{'Spell' if kind=='spell' else 'Trap'} Card{'' if sub=='Normal' else ' / '+sub}]"
  extra=_make_set(rng,next_id,used,card)
  card['desc']=effect_text(card)
  out=[card]
 out+=extra
 for c in out:c['strings']=_strings(c)
 return out

# ---------------------------------------------------------------- sets
# Some unique effects only work with other cards (user's list: Exodia, Destiny Board, the Sarcophagus cards, Huge
# Revolution). Like a Ritual Monster's Ritual Spell, those companion cards are made with the card.
def _piece_card(rng,next_id,used,board):
 name,art=_name_art(rng,TRAPS,used)
 c={'id':next_id(),'kind':'trap','sub':'Continuous','slot':'t_cont','name':name['name'],'name_from':name['id'],'art_from':art['id'],'level':0,
  'log':[f'a piece placed by "{board["name"]}"'],'data_type':TYPE_TRAP|TYPE_CONTINUOUS,'type':'Trap Card','type_line':'[Trap Card / Continuous]'}
 c['parts']={cat:[] for cat in CATEGORIES};c['parts']['acts']=[{'k':'set_piece','board':board['id'],'board_name':board['name']}]
 c['desc']=effect_text(c);c['strings']=_strings(c)
 return c

def _make_set(rng,next_id,used,card):
 extra=[]
 normals=lambda k:[make_card(rng,next_id,used,kind='monster',frame='normal',log=[f'part of the set of "{card["name"]}"'])[0] for _ in range(k)]
 for p in card['parts']['acts']+card['parts']['conds']:
  kind=CATEGORIES['acts'][p['k']].get('set') if p['k'] in CATEGORIES['acts'] else None
  if p['k']=='control_named':kind='trio'
  if kind=='exodia':
   pieces=normals(rng.choice((2,3,4)))
  elif kind=='trio':
   if any(q['k']=='control_named' for q in card['parts']['conds']) and p['k']!='control_named':continue
   pieces=normals(3)
  elif kind in ('board','sarcophagus'):
   pieces=[_piece_card(rng,next_id,used,card) for _ in range(rng.choice((2,3,4)) if kind=='board' else rng.choice((2,3)))]
   if kind=='sarcophagus':
    # The monster the pieces summon (Spirit of the Pharaoh): an Effect Monster that only this card can summon.
    for _ in range(20):
     made=make_card(rng,next_id,used,kind='monster',frame='effect',log=[f'Special Summoned by "{card["name"]}"'])
     if made[0]['frame']=='effect':break
    payoff=made[0];payoff['parts']['limits']=[q for q in payoff['parts']['limits'] if q['k']!='cannot_ss']
    payoff['parts']['limits'].append({'k':'summon_by','board':card['id'],'board_name':card['name']})
    payoff['desc']=effect_text(payoff);payoff['strings']=_strings(payoff)
    p['payoff'],p['payoff_name']=payoff['id'],payoff['name'];extra.append(payoff)
  else:continue
  p['pieces' if kind!='trio' else 'codes']=[c['id'] for c in pieces];p['names']=[c['name'] for c in pieces]
  extra=pieces+extra
 return extra

def make_ritual_spell(rng,next_id,used,monster,log):
 # Always Ritual Summons its monster. It also rolls pieces like any card (user, Nov 15): conditions and costs
 # for activating it, restrictions, and effects (with coins or dice) that happen after the Ritual Summon.
 name,art=_name_art(rng,SPELLS,used)
 log.append(f'made for the Ritual Monster "{monster["name"]}"')
 spell={'id':next_id(),'kind':'spell','sub':'Ritual','slot':'s_ritual','name':name['name'],'name_from':name['id'],'art_from':art['id'],'level':0,
  'ritual_for':monster['id'],'ritual_level':monster['level'],'log':log,
  'data_type':TYPE_SPELL|TYPE_RITUAL,'type':'Spell Card','type_line':'[Spell Card / Ritual]'}
 spell['parts']=settle(rng,_roll_parts(rng,'s_ritual',spell),'s_ritual',log)
 spell['desc']=ritual_text(spell,monster)
 return spell

def ritual_text(spell,monster):
 parts,name=spell['parts'],spell['name']
 conds,costs,acts,limits,others=(parts[c] for c in CATEGORIES)
 lines=[]
 states=[_fmt(CONDS[p['k']]['text'],p,spell) for p in conds if CONDS[p['k']]['kind']=='state']
 if states:lines.append(f'Activate only if {_join(states)}.')
 tribute=f'Tribute monsters from your hand or field whose total Levels equal {monster["level"]} or more'
 cost=_join([_fmt(COSTS[p['k']]['text'],p,spell) for p in costs]) if costs else ''
 lines.append(f'This card is used to Ritual Summon "{monster["name"]}". You must also '+(f'{cost}, and ' if cost else '')+tribute+'.')
 if acts:
  wrap=_wrap(others)
  cap=lambda t:t[:1].upper()+t[1:]
  if wrap and wrap['k']=='dice_mult':effects=_join([_act_text(p,spell,True) for p in acts],', then ')
  elif wrap and wrap['k']=='dice_branch':effects=f'1-3: {cap(_act_text(acts[0],spell))}. 4-6: {cap(_act_text(acts[1],spell))}'
  else:effects=_join([_act_text(p,spell) for p in acts],', then ')
  if wrap:effects=_wrap_text(wrap,effects)
  lines.append(f'Then, {effects}.')
 for p in limits:
  if p['k']=='hopt':lines.append(f'You can only activate 1 "{name}" per turn.')
  elif p['k']=='once_duel':lines.append(f'You can only activate 1 "{name}" per Duel.')
  elif LIMITS[p['k']].get('text'):lines.append(LIMITS[p['k']]['text'].format(what='card'))
 return ' '.join(lines)

def _strings(card):
 label='Ritual Summon' if card['slot']=='s_ritual' else next((ACTS[p['k']]['label'] for p in card['parts']['acts'] if p['k'] in ACTS),'Activate')
 return [label,f"Pay LP to keep \"{card['name']}\"?"]+['']*14

def as_game_card(card):
 """The card as the game stores cards (content.json entry, engine row, script)."""
 entry={k:card[k] for k in ('id','name','desc','type') if k in card}
 entry.update(race=card.get('race') if card['kind']=='monster' else card['sub'],attribute=card.get('attribute',''),level=card.get('level',0),
  atk=card.get('atk',0),defense=card.get('defense',0),sets=[],strings=card['strings'],image=f"assets/cards/{card['art_from']}.jpg",date='',
  randomized={k:card[k] for k in ('kind','frame','sub','slot','type_line','name_from','art_from','atk_from','def_from','materials','ritual_spell','ritual_for','flavor') if k in card})
 entry['data']=_engine_data(card)
 return {'card':entry,'script':card_script(card)}

def make_cards(seed,plan,first_id=FIRST_ID):
 """Cards for one run. plan: list of (kind, frame or sub-type) pairs, None to roll everything."""
 rng=random.Random(seed);counter=iter(range(first_id,first_id+100000));used=set()
 next_id=lambda:next(counter)
 out=[]
 for kind,shape in plan:
  out+=make_card(rng,next_id,used,kind=kind,frame=shape if kind=='monster' else None,sub=shape if kind!='monster' else None)
 return out
