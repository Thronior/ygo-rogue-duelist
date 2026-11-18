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
# Type and Attribute rolled together, as real cards pair them (user, Nov 17: no WATER Fiends or EARTH Aqua).
PAIR_WEIGHTS=Counter((c['race'],c['attribute']) for c in MONSTERS if c['race'] in RACES and c['attribute'] in ATTRIBUTES)
# Flavor texts by Type, for Normal Monsters whose name card has none.
MONSTER_BY_ID={c['id']:c for c in MONSTERS}
MONSTERS_BY_RACE=defaultdict(list)
for _c in MONSTERS:MONSTERS_BY_RACE[_c['race']].append(_c)
# Types with enough main-deck monsters to be a Fusion Material (counted once, not per roll).
MATERIAL_RACES={r:w for r,w in RACE_WEIGHTS.items() if sum(c['race']==r for c in MAIN_MONSTERS)>=20}
FLAVOR_BY_RACE=defaultdict(list)
for _c in MONSTERS:
 if _c['type']=='Normal Monster' and _c['desc'].strip():FLAVOR_BY_RACE[_c['race']].append(_c['desc'])
LEVELS={frame:Counter(c['level'] for c in group) for frame,group in {
 'normal':[c for c in MAIN_MONSTERS if c['data']['type']&TYPE_NORMAL],
 'effect':[c for c in MAIN_MONSTERS if c['data']['type']&TYPE_EFFECT],
 'fusion':[c for c in MONSTERS if c['data']['type']&TYPE_FUSION],
 'ritual':[c for c in MONSTERS if c['data']['type']&TYPE_RITUAL]}.items()}
SPELL_WEIGHTS=Counter(c['race'] for c in SPELLS if c['race'] in SPELL_TYPES and c['race']!='Ritual')  # Ritual Spells come with their monster
TRAP_WEIGHTS=Counter(c['race'] for c in TRAPS if c['race'] in TRAP_TYPES)

# How likely each kind of card and monster frame is: as often as in the game's own card pool (user, Nov 16, until
# the real-card statistics from tools/recreate_cards.py are done). That is about 65% monsters, 20% Spells, 14%
# Traps; of the monsters about 42% Normal, 51% Effect, 6% Fusion and 1.5% Ritual. Ritual Spells are left out of the
# Spell weight: each Ritual Monster brings its own.
def _frame_of(c):
 t=c['data']['type']
 return 'fusion' if t&TYPE_FUSION else 'ritual' if t&TYPE_RITUAL else 'effect' if t&TYPE_EFFECT else 'normal'
KIND_WEIGHTS={'monster':len(MONSTERS),'spell':sum(SPELL_WEIGHTS.values()),'trap':sum(TRAP_WEIGHTS.values())}
FRAME_WEIGHTS=dict(Counter(_frame_of(c) for c in MONSTERS))
# A monster whose effect names a Type or Attribute ("add 1 Dragon monster", "WATER monsters you control gain 500
# ATK") is that Type or Attribute itself this often, like real cards (user, Nov 16).
TYPE_MATCH=.9
# How many pieces each category gets (user, Nov 15): 0 is likeliest, then 1, then 2, then 3, and so on, with 0
# near 40% for effects. Each extra piece is DECAY times as likely as one fewer (0.62: 0 = 40%, 1 = 25%, 2 = 16%,
# 3 = 10%, 4 = 6%, 5 = 4%). "Other" (coin, dice, upkeep) falls off faster so it stays special. Where a card needs at least
# one effect, the same falling chances start at 1 instead.
MAX_PIECES=5
# Costs and conditions a bit rarer (user, Nov 15): 0.5 gives none about 50% of the time. Restrictions are rarer
# still, since costs already restrict: 0.26 puts a rolled restriction on about 20% of cards with an effect. The
# automatic Once per turn is a rule, not a roll, so it is not counted.
COUNT_DECAY={'conds':.3,'costs':.3,'acts':.62,'limits':.26,'others':.08}   # others .3 -> .08 (Nov 16): ~19% of cards -> ~3%, like real cards
# Fusion and Ritual Monsters have an effect this often (user, Nov 15: more likely than other rolls); otherwise
# they are effect-less like Flame Swordsman.
EFFECT_CHANCE={'m_fusion':.8,'m_ritual':.8,'s_ritual':.75}
# Per-slot overrides of COUNT_DECAY. A Ritual Spell's Tribute requirement is already a condition (user, Nov 15),
# so it rolls extra conditions far less often (0.25: no condition 75% of the time) and effects more often (above).
SLOT_DECAY={'s_ritual':{'conds':.25}}
# Most pieces one effect may have (user, Nov 16: read like vanilla cards, which have 0-1 cost and 1-2 actions).
# Conditions: one timing and one requirement (see problem()). A Ritual Spell's cost is its Tribute, nothing extra.
# Costs an effect always brings ('needs') may go over the cap.
EFFECT_CAPS={'conds':2,'costs':1,'acts':2,'limits':1,'others':1}   # real cards rarely print two restrictions (Nov 16)
SLOT_CAPS={'s_ritual':{'costs':0}}
def _cap(cat,slot):
 return SLOT_CAPS.get(slot,{}).get(cat,EFFECT_CAPS.get(cat,MAX_PIECES))

# Costs and timings by how strong the effect is (user, Nov 16: rarer overall, likelier on strong effects such as
# "draw 2 cards" or negates). Decay for power 0, 1 and 2 (see _power). Measured on activated effects: a cost on 11% /
# 28% / 43%, a timing on 11% / 38% / 48% (attack negates bring their own). Overall 24% cost, 29% timing (was 32%, 35%).
POWER_DECAY={'conds':(.15,.35,.8),'costs':(.12,.4,.9)}
STRONG_ACTS={'draw','negate_effect','negate_activation','negate_summon','negate_attack','destroy_mon','destroy_st','bounce_mon',
 'search_race','search_spell','revive','ss_hand','gy_to_hand','discard_opp','destroy_weak','destroy_attacker','destroy_summoned',
 'fusion_summon','fusion_summon_gy','end_battle_phase','recover_attacker_atk','shuffle_hand_draw_same'}
VERY_STRONG_ACTS={'destroy_all_monsters','bounce_all_opp_mon','damage_attacker_atk'}
def _power(acts):
 """0 ordinary, 1 strong (a negate, removal, search, revive, draw 2), 2 very strong (draw 3+, board wipes, two strong
 effects). Unique mechanics bring their own conditions, so they count as ordinary here."""
 score=0
 for p in acts:
  k=p['k']
  if k in VERY_STRONG_ACTS or (k=='draw' and p.get('n',1)>=3):score+=2
  elif k in STRONG_ACTS and not (k=='draw' and p.get('n',1)<2):score+=1
  elif k=='damage' and p.get('n',0)>=1500 or k=='recover' and p.get('n',0)>=3000:score+=1
 return min(score,2)

def _roll_count(rng,cat,minimum=0,slot=None,power=0):
 decay=SLOT_DECAY.get(slot,{}).get(cat,POWER_DECAY[cat][power] if cat in POWER_DECAY else COUNT_DECAY[cat])
 weights=[decay**i for i in range(max(minimum,_cap(cat,slot))+1-minimum)]
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
 'shabti_window':dict(kind='event',fits={'m_main'},text="During either player's turn, except during the Main Phase 2 or End Phase",real_only=True),
 'attacked_while_defense':dict(kind='event',fits={'m_main'},text='At the end of the Damage Step, if this Defense Position card was attacked',real_only=True),
 'destroyed_insect_by_battle':dict(kind='event',fits={'m_main'},text='When this card destroys an Insect monster by battle',real_only=True),
 'attacked_by_non_zombie':dict(kind='event',fits={'m_main'},text='When a non-Zombie monster attacks this card',real_only=True),
 'opp_attacks_this_card':dict(kind='event',fits={'m_main'},text='When an opponent attacks this card',real_only=True),
 'opp_attack':dict(kind='event',fits=MONSTER_SLOTS|{'s_cont','t_normal','t_cont','t_counter'},text="When an opponent's monster declares an attack",repeat=True),
 'opp_summon':dict(kind='event',fits=MONSTER_SLOTS|{'s_cont','t_normal','t_cont'},text='When your opponent Normal Summons a monster',
  trap_text='When your opponent Normal or Special Summons a monster',repeat=True),
 'opp_activate':dict(kind='event',fits=MONSTER_SLOTS|{'t_normal','t_cont','t_counter'},text='When your opponent activates a card or effect',repeat=True),
 'opp_activate_st':dict(kind='event',fits={'t_counter'},text='When your opponent activates a Spell/Trap Card'),
 'opp_summon_try':dict(kind='event',fits={'t_counter'},text='When your opponent would Summon a monster'),
 'lp_low':dict(kind='state',fits=ALL,text='your LP are 2000 or less'),
 'lp_behind':dict(kind='state',fits=ALL,text='you have less LP than your opponent'),
 'control_race':dict(kind='state',fits=ALL,text='you control a face-up {race} monster',race=True),
 'control_other_race':dict(kind='state',fits={'m_main'},text='you control another face-up {race} monster',race=True,real_only=True),
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
 'equip_lp':dict(fits={'s_equip'},text='pay {n} LP',real_only=True),
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
 'draw':dict(fits=ACTIVATED,text='draw {n} card{s}',n=R(1,3),label='Draw'),   # up to 3 (Nov 16: draw 4 never on a real card)
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
LIMITS['cannot_ss_gy']=dict(fits={'m_main'},text='Cannot be Special Summoned from the GY.',real_only=True)
AURAS['exxod_sphinx_proc']=dict(fits={'m_main'},text='Special Summon this card from your hand by Tributing 1 Sphinx monster.',real_only=True)
SET_ONLY={'set_piece','summon_by','cannot_ss_gy'}
# ---- real-card blocks (recreation)
LIMITS['cannot_normal']=dict(fits=MONSTER_SLOTS,text='Cannot be Normal Summoned/Set.',real_only=True)
ACTS['self_set']=dict(fits={'m_main'},text='change this card to face-down Defense Position',real_only=True)
ACTS['self_atk_def_temp']=dict(fits=MONSTER_SLOTS,text='this card gains {n} ATK and DEF until the end of this turn',real_only=True)
ACTS['recover_battle_damage']=dict(fits=MONSTER_SLOTS,text='gain LP equal to the Battle Damage this card inflicted to your opponent',real_only=True)
AURAS['self_def_after_attack']=dict(fits={'m_main'},text='After this card battles as the attacker, change it to face-up Defense Position',real_only=True)
AURAS['pierce_friendly_races']=dict(fits={'m_main'},text='Your {filter} inflict piercing Battle Damage when they attack Defense Position monsters',real_only=True)
AURAS['no_attack_summon_turn']=dict(fits={'s_cont'},text='Monsters cannot attack the turn they are Summoned, Flip Summoned, or Special Summoned',real_only=True)
AURAS['indes_battle_equal_attack']=dict(fits={'s_cont'},text="Your monsters cannot be destroyed by battle with an opponent's monster that has equal ATK",real_only=True)
AURAS['recover_on_monster_return']=dict(fits={'s_cont'},text='When a monster returns from the field to the hand, gain 500 LP',real_only=True)
AURAS['dark_room_bonus_damage']=dict(fits={'s_cont'},text='When your opponent takes effect damage, inflict 300 more damage',real_only=True)
AURAS['no_hand_limit']=dict(fits={'s_cont'},text='There is no hand size limit for either player',real_only=True)
AURAS['spell_absorption']=dict(fits={'s_cont'},text='When a Spell Card resolves, gain 500 LP',real_only=True)
AURAS['recover_opp_discard']=dict(fits={'s_cont'},text='When your opponent makes you discard from your hand by a card effect, gain 1000 LP',real_only=True)
AURAS['spell_economics']=dict(fits={'s_cont'},text='You do not pay LP to activate Spell Cards',real_only=True)
AURAS['opp_attack_target_named']=dict(fits={'s_cont'},text='While face-up {name} is in your Monster Zone, your opponent can only attack it',real_only=True)
AURAS['heart_of_underdog']=dict(fits={'s_cont'},text='During your Draw Phase, when you draw a Normal Monster, you can reveal it to draw 1 more card',real_only=True)
CONDS['tribute_summon_2plus']=dict(kind='event',fits={'s_cont'},text='When you Tribute Summon using 2 or more monsters',real_only=True)
CONDS['activate_any']=dict(kind='event',fits={'t_counter'},text='When a card is activated',real_only=True)
CONDS['summon_try_any']=dict(kind='event',fits={'t_counter'},text='When a monster would be Summoned',real_only=True)
CONDS['spell_targets_one_monster']=dict(kind='event',fits={'t_counter'},text='When a Spell effect targets exactly 1 monster on the field',real_only=True)
CONDS['monster_effect_any']=dict(kind='event',fits={'t_counter'},text='When a monster effect is activated',real_only=True)
CONDS['st_targets_zombie']=dict(kind='event',fits={'t_counter'},text='When a Spell/Trap Card is activated that targets exactly 1 Zombie monster on the field',real_only=True)
CONDS['summon_same_race']=dict(kind='event',fits={'t_counter'},text='When a monster is Summoned whose Type matches a face-up monster on the field',real_only=True)
COSTS['discard_cost_change']=dict(fits={'t_counter'},spends=True,text='discard 1 card from your hand',real_only=True)
AURAS['opp_attack_deck_cost']=dict(fits={'s_cont'},text='Your opponent must send the top card(s) of their Deck to the GY to declare an attack',real_only=True)
AURAS['one_attack_per_battle_phase']=dict(fits={'s_cont'},text='Only 1 monster can attack during each Battle Phase',real_only=True)
ACTS['self_atk_permanent']=dict(fits=MONSTER_SLOTS,text='this card permanently gains {n} ATK',real_only=True)
ACTS['self_def_permanent']=dict(fits=MONSTER_SLOTS,text='this card permanently gains {n} DEF',real_only=True)
ACTS['reduce_battle_opponent_both']=dict(fits=MONSTER_SLOTS,text='the monster that battled this card loses {n} ATK and DEF',real_only=True)
CONDS['field_named']=dict(kind='state',fits=MONSTER_SLOTS,text='a face-up \"{name}\" is on the field',real_only=True)
CONDS['field_named_any']=dict(kind='state',fits={'s_normal'},text='a face-up card with either listed name is on the field',real_only=True)
AURAS['toon_world_destroyed']=dict(fits=MONSTER_SLOTS,text='If \"Toon World\" on the field is destroyed, destroy this card.',real_only=True)
AURAS['no_effect_damage']=dict(fits=MONSTER_SLOTS,text='You take no effect damage.',real_only=True)
AURAS['protect_facedown_from_attack']=dict(fits={'m_main'},text='Your opponent cannot select face-down Defense Position monsters as attack targets.',real_only=True)
AURAS['no_traps_opp_battle_phase']=dict(fits={'m_main'},text='Your opponent cannot activate Trap Cards during the Battle Phase.',real_only=True)
AURAS['battle_damage_is_effect']=dict(fits={'m_main'},text='Battle Damage this card inflicts to your opponent is treated as effect damage.',real_only=True)
AURAS['opp_cannot_target_set']=dict(fits=MONSTER_SLOTS,text='{filter} monsters cannot be targeted by your opponent\'s card effects.',real_only=True)
AURAS['no_player_targets_dragons']=dict(fits={'m_main'},text='Neither player can target Dragon monsters with card effects.',real_only=True)
AURAS['opp_cannot_banish_gy']=dict(fits={'m_main'},text='Your opponent cannot banish cards from either GY.',real_only=True)
AURAS['self_atk_if_attr']=dict(fits={'m_main'},text='This card gains {n} ATK while a face-up {attr} monster is on the field.',n=R(100,1000,100),real_only=True)
AURAS['self_no_control_change_if_attr']=dict(fits={'m_main'},text='While a face-up {attr} monster is on the field, control of this card cannot change.',real_only=True)
AURAS['self_no_control_change']=dict(fits={'m_main'},text='Control of this card cannot change.',real_only=True)
AURAS['name_treated_as']=dict(fits={'m_main'},text='This card’s name is treated as {name}.',real_only=True)
AURAS['banish_battle_destroyed_monsters']=dict(fits={'m_main'},text='Monsters destroyed by battle with this card are banished.',real_only=True)
AURAS['archfiend_setcode']=dict(fits={'m_main','m_fusion'},text='This card is treated as an "Archfiend" card.',real_only=True)
AURAS['self_indes_battle_atk_min']=dict(fits={'m_main'},text='This card cannot be destroyed by battle with a monster that has {n} or more ATK.',n=R(1500,2500,100),real_only=True)
AURAS['self_indes_non_target_spell_trap']=dict(fits={'m_main'},text='This card cannot be destroyed by non-targeting Spell/Trap effects.',real_only=True)
AURAS['double_direct_battle_damage']=dict(fits={'m_main'},text='Double the Battle Damage this card inflicts by a direct attack.',real_only=True)
AURAS['banisher_of_the_light']=dict(fits={'m_main'},text='Cards that would be sent to the GY are banished instead, if they can be banished.',real_only=True)
AURAS['tribute_monster_to_attack']=dict(fits={'m_main'},text='This card cannot declare an attack unless you Tribute 1 monster.',real_only=True)
AURAS['insect_princess_force_attack']=dict(fits={'m_main'},text='Your opponent’s Insect monsters are changed to Attack Position.',real_only=True)
AURAS['self_indes_battle_equal_atk']=dict(fits={'m_main'},text='This card cannot be destroyed by battle with a monster that has the same ATK.',real_only=True)
AURAS['spirit_reaper_targeted']=dict(fits={'m_main'},text='If an effect targets this face-up card, or it is targeted for an attack, destroy this card after the effect resolves or battle ends.',real_only=True)
AURAS['dark_snake_syndrome']=dict(fits={'s_cont'},text='During each of your Standby Phases, inflict damage to both players, starting at 200 and doubling each time.',real_only=True)
AURAS['ground_collapse']=dict(fits={'s_cont'},text='On activation, select 2 unoccupied Main Monster Zones; neither player can use them.',real_only=True)
COSTS['skull_lair_banish']=dict(fits={'t_cont'},spends=True,text='banish any number of your Monster Cards from your field and/or GY as cost',real_only=True)
ACTS['skull_lair_destroy']=dict(fits={'t_cont'},text='destroy 1 face-up monster on the field whose Level equals the number banished for this effect',real_only=True)
AURAS['regulation_of_tribe']=dict(fits={'t_cont'},text='Declare a monster Type; monsters of that Type cannot attack, and during each of your Standby Phases Tribute a monster or destroy this card.',real_only=True)
ACTS['fake_trap_protect']=dict(fits={'t_normal'},text='reveal any targeted face-down Trap, then destroy this card instead of the opponent effect destroying your Trap Cards',real_only=True)
ACTS['equip_revive']=dict(fits={'s_equip'},target=True,text='Special Summon the targeted {filter} from your GY and equip this card to it; if this Equip Card is destroyed, banish that monster',real_only=True)
AURAS['negate_battled_flip_monster']=dict(fits={'m_main'},text='Negate the effects of Flip monsters destroyed by battle with this card.',real_only=True)
AURAS['battled_opponent_cannot_attack']=dict(fits={'m_main'},text='A monster that battles this card cannot attack during your opponent’s next 2 turns.',real_only=True)
AURAS['opp_cannot_draw_except_draw_phase']=dict(fits={'m_main'},text='Your opponent cannot draw cards except during the Draw Phase.',real_only=True)
AURAS['reveal_both_hands']=dict(fits={'m_main'},text='Both players keep their hands revealed.',real_only=True)
AURAS['self_atk_per_gy_sel']=dict(fits={'m_main'},text='This card gains {n} ATK for each {filter} in both GYs.',n=R(100,500,100),real_only=True)
AURAS['choose_opp_attack_targets']=dict(fits={'m_main'},text='You choose the attack targets for your opponent’s attacks.',real_only=True)
AURAS['self_extra_attack_one']=dict(fits={'m_main'},text='This card can make one additional attack each Battle Phase{constraint}',real_only=True)
AURAS['all_battle_destroyed_to_deck']=dict(fits={'m_main'},text='Monsters destroyed by battle are shuffled into the Deck instead of going to the GY.',real_only=True)
ACTS['end_battle_phase_now']=dict(fits={'m_main'},text='End the current Battle Phase.',real_only=True)
ACTS['destroy_battle_destroyer']=dict(fits={'m_main'},text='destroy the opponent’s monster that destroyed this card by battle',real_only=True)
ACTS['self_direct_attack_turn']=dict(fits={'m_main'},text='this card can attack directly this turn',real_only=True)
ACTS['no_attack_opp_next_turn']=dict(fits={'m_main'},text='your opponent’s monsters cannot attack during their next turn',real_only=True)
ACTS['self_atk_permanent_dice']=dict(fits={'m_main'},text='this card permanently gains {n} ATK per die result',n=R(100,500,100),real_only=True)
CONDS['added_to_hand_from_deck_by_effect']=dict(kind='event',fits={'m_main'},text='If this card is added from your Deck to your hand by a card effect',real_only=True)
AURAS['self_atk_def_per_selector']=dict(fits={'m_main'},text='This card gains {n} ATK and {def_n} DEF for each {filter}.',n=R(100,500,100),real_only=True)
AURAS['double_tribute_attribute']=dict(fits={'m_main'},text='This card can be treated as 2 Tributes for the Tribute Summon of an {attr} monster.',real_only=True)
AURAS['self_lp_cost_to_attack']=dict(fits={'m_main'},text='Pay {n} LP to declare an attack with this card.',n=R(500,2000,500),real_only=True)
AURAS['self_atk_def_per_hand']=dict(fits={'m_main'},text='This card gains {n} ATK and DEF for each card in your hand.',n=R(100,500,100),real_only=True)
AURAS['berserk_gorilla_rules']=dict(fits={'m_main'},text='If this card is in face-up Defense Position, destroy it. This card must attack if able.',real_only=True)
AURAS['spell_immune_while_umi']=dict(fits={'m_main'},text='While Umi is active, this card is unaffected by Spell effects.',real_only=True)
AURAS['reveal_opp_hand']=dict(fits={'m_main'},text='Your opponent plays with their hand revealed.',real_only=True)
AURAS['self_direct_while_umi']=dict(fits={'m_main'},text='While Umi is face-up, this card can attack directly.',real_only=True)
AURAS['opp_cannot_activate_quickplay']=dict(fits={'m_main'},text='Your opponent cannot activate Quick-Play Spell Cards.',real_only=True)
AURAS['opp_monsters_cannot_attack_summon_turn']=dict(fits={'m_main'},text='Monsters your opponent controls cannot attack the turn they are Summoned.',real_only=True)
AURAS['self_atk_when_battling_attr']=dict(fits={'m_main'},text='This card gains {n} ATK while battling a face-up {attr} monster during the Damage Step.',n=R(100,1500,100),real_only=True)
AURAS['self_atk_if_empty_hand_st']=dict(fits={'m_main'},text='This card gains {n} ATK while you have no cards in your hand or Spell & Trap Zones.',n=R(500,2000,100),real_only=True)
AURAS['self_atk_per_opp_race_field_gy']=dict(fits={'m_main'},text='This card gains {n} ATK for each {race} monster your opponent controls or in their GY.',n=R(100,1000,100),real_only=True)
AURAS['self_atk_when_race_destroyed']=dict(fits={'m_main'},text='When a face-up {race} monster is destroyed, this card gains {n} ATK.',n=R(100,1000,100),real_only=True)
ACTS['decktop_battle_target']=dict(fits={'m_main'},text='place the opponent’s monster destroyed by this card on top of their Deck',real_only=True)
AURAS['destroy_battle_target_selector']=dict(fits={'m_main'},text='When this card battles a monster with {filter}, destroy that monster after the Damage Step.',real_only=True)
ACTS['double_base_atk_then_destroy_end_phase']=dict(fits={'m_main'},text='double this card’s original ATK until the End Phase, then destroy it',real_only=True)
AURAS['cannot_direct_attack']=dict(fits={'m_main'},text='This card cannot attack directly.',real_only=True)
ACTS['lose_200_atk']=dict(fits={'m_main'},text='this card permanently loses 200 ATK',real_only=True)
ACTS['lose_atk_permanent']=dict(fits={'m_main'},text='this card permanently loses {n} ATK',n=R(100,1000,100),real_only=True)
AURAS['attack_all_opp_monsters']=dict(fits={'m_main'},text='This card can attack all monsters your opponent controls once each.',real_only=True)
AURAS['double_tribute_light']=dict(fits={'m_main'},text='This card can be treated as 2 Tributes for the Tribute Summon of a LIGHT monster.',real_only=True)
AURAS['amazoness_swords_woman_reflect']=dict(fits={'m_main'},text='Your opponent takes battle damage you would have taken from battles involving this card.',real_only=True)
AURAS['dark_artist_half_def_vs_light']=dict(fits={'m_main'},text='If this card is attacked by a LIGHT monster, its DEF is halved during damage calculation.',real_only=True)
AURAS['thunder_nyan_self_destroy']=dict(fits={'m_main'},text='Destroy this face-up card if you control a face-up non-LIGHT monster.',real_only=True)
AURAS['extra_attack_per_equip']=dict(fits={'m_main'},text='This card gains 1 additional attack during each Battle Phase for each Equip Card equipped to it.',real_only=True)
ACTS['send_extra_to_gy']=dict(fits={'m_main'},text='send 1 card from your Extra Deck to the GY',real_only=True)
ACTS['banish_opp_gy_monsters']=dict(fits={'m_main'},target=True,tclause='target up to 2 monsters in your opponent\'s GY',text='banish those targets',real_only=True)
ACTS['banish_opp_field_gy_monsters']=dict(fits={'m_fusion'},target=True,tclause='target up to 3 monsters in your opponent\'s Monster Zone or GY',text='banish those targets',real_only=True)
ACTS['activator_may_draw']=dict(fits={'m_main'},text='the player who activated Pot of Greed may draw 1 card',real_only=True)
ACTS['destroy_attacked_this_card']=dict(fits={'m_main'},text='destroy the monster that attacked this card',real_only=True)
ACTS['change_battle_target_def']=dict(fits={'m_main'},text='change the monster that battled this card to face-up Defense Position',real_only=True)
ACTS['return_equip_no_activate']=dict(fits={'s_normal'},target=True,tclause='target 1 Equip Spell in your GY',text='add it to your hand, but it cannot be activated this turn',real_only=True)
ACTS['destroy_facedown_battle_target']=dict(fits={'m_main'},text='destroy the face-down Defense Position monster this card is attacking',real_only=True)
AURAS['self_direct_always']=dict(fits=MONSTER_SLOTS,text='This card can attack directly.',real_only=True)
AURAS['jinzo_trap_lock']=dict(fits={'m_main'},text='Trap Cards and their effects on the field cannot be activated; negate Trap effects on the field.',real_only=True)
AURAS['cipher_soldier_battle_boost']=dict(fits={'m_main'},race=True,text='During damage calculation, this card gains 2000 ATK and DEF while battling a {race} monster.',real_only=True)
AURAS['goblin_attack_force_lock']=dict(fits={'m_main'},text='After this card attacks, change it to Defense Position at the end of the Battle Phase and prevent it from changing position for 3 Phase Ends.',real_only=True)
AURAS['vampire_baby_revive']=dict(fits={'m_main'},text='At the end of the Battle Phase, Special Summon monsters destroyed by battle with this card and sent to either GY this turn, up to your available zones.',real_only=True)
CONDS['normal_quick_spell_resolved']=dict(kind='event',fits={'m_main'},text='When a Normal or Quick-Play Spell Card resolves',real_only=True)
ACTS['sand_gambler']=dict(fits={'m_main'},text='toss 3 coins; destroy all opponent monsters on 3 Heads or all your monsters on 3 Tails',real_only=True)
CONDS['self_attacks']=dict(kind='event',fits={'m_main'},text='When this card declares an attack',real_only=True)
ACTS['jirai_gumo_coin']=dict(fits={'m_main'},text='call a coin toss; if you call it wrong, halve your LP, rounded up',real_only=True)
ACTS['don_zaloog_choice']=dict(fits={'m_main'},text='choose: make your opponent discard 1 random card, or send the top 2 cards of their Deck to the GY',real_only=True)
AURAS['gora_turtle_target_negate']=dict(fits={'m_main'},text='Disable and negate opposing Spell/Trap effects that target this face-up card; destroy the activated card.',real_only=True)
CONDS['normal_summon_forced']=dict(kind='event',fits={'m_main'},text='When this card is Normal Summoned',real_only=True)
CONDS['flip_summon_forced']=dict(kind='event',fits={'m_main'},text='When this card is Flip Summoned',real_only=True)
CONDS['special_summon_forced']=dict(kind='event',fits={'m_main'},text='When this card is Special Summoned',real_only=True)
ACTS['twin_barrel_coin_destroy']=dict(fits={'m_main'},target=True,tclause='target 1 card your opponent controls',text='toss 2 coins; if both are Heads, destroy it',real_only=True)
AURAS['great_maju_garzett']=dict(fits={'m_main'},text='When Tribute Summoned, this card’s ATK becomes twice the original ATK of its first Tributed monster.',real_only=True)
ACTS['hiro_shadow_scout']=dict(fits={'m_main'},text='your opponent draws 3 cards, reveals those cards, discards any Spells among them, then shuffles their hand',real_only=True)
COSTS['discard_random_cost']=dict(fits={'m_main'},spends=True,text='discard 1 random card from your hand as cost',real_only=True)
ACTS['destroy_special_summoned']=dict(fits={'m_main'},text='destroy all Special Summoned monsters on the field',real_only=True)
AURAS['jowgen_no_special_summon']=dict(fits={'m_main'},text='Neither player can Special Summon monsters.',real_only=True)
ACTS['ceasefire']=dict(fits={'t_normal'},text='reveal face-down Defense monsters without activating their Flip effects, then inflict 500 damage per face-up Effect Monster',real_only=True)
ACTS['supply_fusion_materials']=dict(fits={'m_main'},target=True,tclause='target 2 Fusion Material monsters sent to your GY by a Fusion Summon',text='return them to your hand',real_only=True)
ACTS['return_from_different_dimension']=dict(fits={'t_normal'},text='Special Summon as many of your face-up banished monsters as possible; banish those monsters during the End Phase',real_only=True)
CONDS['your_standby_phase_state']=dict(kind='state',fits={'t_normal'},text='it is your Standby Phase',real_only=True)
COSTS['discard_one_cost']=dict(fits={'t_normal'},spends=True,text='discard 1 card from your hand as cost',real_only=True)
ACTS['opp_no_summon_next_turn']=dict(fits={'t_normal'},text='your opponent cannot Normal Summon, Set, or Special Summon during their next turn',real_only=True)
CONDS['opp_trap_targets_your_dragon']=dict(kind='event',fits={'t_cont'},text='When your opponent activates a Trap Card that targets your face-up Dragon monster',real_only=True)
COSTS['dragon_bead_discard']=dict(fits={'t_cont'},spends=True,text='discard 1 card from your hand as cost',real_only=True)
ACTS['dragon_bead_negate']=dict(fits={'t_cont'},text='negate that Trap effect, and if you do, destroy that Trap Card',real_only=True)
AURAS['call_of_darkness']=dict(fits={'t_cont'},text='Send monsters Special Summoned by Monster Reborn to the GY; your opponent cannot Set or activate Monster Reborn.',real_only=True)
AURAS['toon_defense']=dict(fits={'t_cont'},text='When an opponent attacks your face-up Level 4 or lower Toon monster, make that attack direct if possible.',real_only=True)
COSTS['discard_monster_cost']=dict(fits={'s_normal'},spends=True,text='discard 1 Monster Card from your hand as cost',real_only=True)
ACTS['return_of_doomed']=dict(fits={'s_normal'},text='during this turn’s End Phase, return 1 of your monsters destroyed by battle this turn from your GY to your hand',real_only=True)
ACTS['dimensionhole']=dict(fits={'s_normal'},target=True,tclause='target 1 monster you control',text='temporarily banish it until your next Standby Phase, and while it is banished its Monster Zone cannot be used',real_only=True)
AURAS['mirror_wall']=dict(fits={'t_cont'},text='Each opposing monster that attacks while this card is face-up has its ATK halved while this card remains face-up.',real_only=True)
AURAS['standby_destroy_by_level_die']=dict(fits={'t_cont'},text='During your Standby Phase, roll a six-sided die; destroy all face-up monsters whose Level matches the result, or all Level 6 or higher monsters on a 6.',real_only=True)
AURAS['needle_wall']=dict(fits={'t_cont'},text='During your Standby Phase, roll a die until it is 1–5, then destroy the monster in the corresponding opposing Monster Zone.',real_only=True)
ACTS['ninja_battle_protection']=dict(fits={'t_cont'},text='Target 1 face-up Ninja monster; it cannot be destroyed by battle while this Trap remains face-up.',real_only=True)
AURAS['forgotten_temple']=dict(fits={'t_cont'},text='This card’s name becomes Umi; once per turn, temporarily banish a face-up Level 4 or lower Fish, Sea Serpent, or Aqua monster you control, then Special Summon it during your End Phase.',real_only=True)
AURAS['imperial_order']=dict(fits={'t_cont'},text='Negate Spell effects on the field; during each Standby Phase pay 700 LP or destroy this card.',real_only=True)
AURAS['tower_of_babel']=dict(fits={'t_cont'},text='Place a Spell Counter on this card when a Spell Card resolves; when the fourth is placed, destroy this card and inflict 3000 damage to that card’s activator.',real_only=True)
AURAS['appropriate']=dict(fits={'t_cont'},text='When your opponent draws outside the Draw Phase, draw 2 cards; this remains active while this card is face-up.',real_only=True)
ACTS['chain_destruction']=dict(fits={'t_normal'},target=True,tclause='target 1 face-up monster with 2000 or less ATK that was just Summoned',text='destroy all copies of that monster in its controller’s hand and Main Deck',real_only=True)
ACTS['sixth_sense']=dict(fits={'t_normal'},text='declare two different numbers, then have your opponent roll a die; if the result matches, draw that many cards, otherwise send that many from your Deck to the GY',real_only=True)
ACTS['mind_crush']=dict(fits={'t_normal'},text='declare a Main Deck monster name; your opponent discards every copy from their hand, or you randomly discard 1 card if they have none',real_only=True)
ACTS['hero_emerges']=dict(fits={'t_normal'},text='your opponent randomly chooses a card in your hand; Special Summon it if possible, otherwise send it to the GY',real_only=True)
ACTS['dragged_down']=dict(fits={'s_normal'},text='both players reveal hands, each chooses a card from the opponent’s hand to discard, then both players draw 1',real_only=True)
ACTS['soul_charge']=dict(fits={'s_normal'},target=True,tclause='target any number of monsters in your GY',text='Special Summon them, lose 1000 LP for each Summoned, and skip your Battle Phase this turn',real_only=True)
ACTS['inferno_fire_blast']=dict(fits={'s_normal'},target=True,tclause='target 1 face-up "Red-Eyes Black Dragon" you control',text='inflict damage to your opponent equal to its original ATK, and it cannot attack this turn',real_only=True)
ACTS['big_wave_small_wave']=dict(fits={'s_normal'},text='destroy as many WATER monsters you control as possible, then you can Special Summon WATER monsters from your hand up to the number destroyed',real_only=True)
ACTS['creature_swap']=dict(fits={'s_normal'},text='each player chooses 1 monster they control and switches control of those monsters; they cannot change their battle positions this turn',real_only=True)
ACTS['enchanting_fitting_room']=dict(fits={'s_normal'},text='excavate the top 4 cards of your Deck; Special Summon all Level 3 or lower Normal Monsters among them, then shuffle the rest into your Deck',real_only=True)
ACTS['contract_with_exodia']=dict(fits={'s_normal'},text='if all 5 Exodia pieces are in your GY, Special Summon Exodia Necross from your hand, ignoring its Summoning conditions',real_only=True)
ACTS['insect_imitation']=dict(fits={'s_normal'},text='Special Summon 1 Insect from your Deck whose Level is 1 higher than the Tributed monster',real_only=True)
COSTS['insect_imitation_tribute']=dict(fits={'s_normal'},spends=True,text='Tribute 1 monster whose Level matches an Insect in your Deck that can be Special Summoned',real_only=True)
ACTS['monster_gate']=dict(fits={'s_normal'},text='excavate from your Deck until you reveal a monster that can be Normal Summoned/Set; Special Summon it and send the other excavated cards to the GY',real_only=True)
ACTS['rescue_cat']=dict(fits={'m_main'},text='Special Summon 2 Level 3 or lower Beast monsters from your Deck with their effects negated; destroy them during the End Phase',real_only=True)
ACTS['ghost_knight_jackal']=dict(fits={'m_main'},text='Special Summon the opponent’s monster this card destroyed by battle from their GY in face-up Defense Position',real_only=True)
ACTS['triangle_ecstasy_spark']=dict(fits={'s_normal'},text='set the ATK of all face-up "Harpie Lady Sisters" to 2700; your opponent cannot activate Trap Cards, and negate their Trap effects on the field this turn',real_only=True)
ACTS['magic_reflector']=dict(fits={'s_normal'},target=True,tclause='target 1 face-up Spell Card you control',text='place 1 Spell Counter on it; if it would be destroyed, remove that counter instead',real_only=True)
ACTS['order_to_smash']=dict(fits={'t_normal'},target=True,tclause='target up to 2 Spell/Trap Cards your opponent controls',text='Tribute 1 Level 2 or lower Normal Monster you control, then destroy the targets',real_only=True)
ACTS['collected_power']=dict(fits={'t_normal'},target=True,tclause='target 1 face-up monster on the field',text='equip all Equip Cards on the field to it; destroy any Equip Cards that cannot equip to it',real_only=True)
ACTS['earthshaker']=dict(fits={'t_normal'},text='declare 2 different monster Attributes; your opponent chooses 1, then destroy all face-up monsters with that Attribute',real_only=True)
ACTS['deal_of_phantom']=dict(fits={'t_normal'},target=True,tclause='target 1 face-up monster on the field',text='it gains 100 ATK for each monster in your GY when this card was activated, until the End Phase',real_only=True)
ACTS['dark_scorpion_combination']=dict(fits={'t_normal'},text='your five named Dark Scorpion monsters can attack directly this turn, but their Battle Damage is halved',real_only=True)
AURAS['batteryman_c_position_stats']=dict(fits={'m_main'},text='If all face-up Batteryman C monsters you control are in Attack Position, your Machine monsters gain 500 ATK for each; if all are in Defense Position, they gain 500 DEF for each',real_only=True)
ACTS['gambler_of_legend']=dict(fits={'m_main'},text='toss 3 coins: 3 Heads destroys all opponent monsters; 2 Heads makes them discard randomly; 1 Head destroys 1 card you control; 3 Tails discards your hand',real_only=True)
COSTS['freed_banish_light']=dict(fits={'m_main'},spends=True,text='banish 2 LIGHT monsters from your GY as cost',real_only=True)
ACTS['freed_destroy_stronger']=dict(fits={'m_main'},target=True,tclause='target 1 face-up monster with higher ATK than this card',text='destroy it',real_only=True)
AURAS['silent_swordsman_lv3']=dict(fits={'m_main'},text='Unaffected by opponent Spell effects that target it. During your Standby Phase, except the turn it was Summoned or flipped face-up, you can send this card to the GY to Special Summon Silent Swordsman LV5 from your hand or Deck.',real_only=True)
AURAS['horus_lv6']=dict(fits={'m_main'},text='Unaffected by Spell effects. During the End Phase, if this card destroyed a monster by battle this turn, you can send it to the GY to Special Summon Horus the Black Flame Dragon LV8 from your hand or Deck.',real_only=True)
AURAS['criosphinx']=dict(fits={'m_main'},text='When a monster is returned from the field to its owner’s hand, that monster’s owner sends 1 card from their hand to the GY',real_only=True)
ACTS['battle_destroyed_mon_to_deck']=dict(fits={'m_main'},text='return 1 of your monsters destroyed by battle this turn from your GY, then {verb} it',real_only=True)
AURAS['mist_archfiend']=dict(fits={'m_main'},text='You can Normal Summon this card without Tributing. If Summoned this way, destroy it during the End Phase, and if you do, take 1000 damage.',real_only=True)
ACTS['blowback_dragon']=dict(fits={'m_main'},target=True,tclause='target 1 card your opponent controls',text='toss 3 coins; destroy it if at least 2 results are Heads',real_only=True)
ACTS['vampire_lady']=dict(fits={'m_main'},text='when this card inflicts Battle Damage, declare Monster, Spell, or Trap; your opponent sends 1 card of that type from their Deck to the GY',real_only=True)
COSTS['chaosrider_banish_spells']=dict(fits={'m_main'},spends=True,text='banish up to 2 Spell Cards from your GY',real_only=True)
ACTS['chaosrider_boost']=dict(fits={'m_main'},text='this card gains 300 ATK for each Spell banished for this effect, until the end of your opponent’s next turn',real_only=True)
AURAS['batteryman_aa_position_stats']=dict(fits={'m_main'},text='If all face-up Batteryman AA monsters you control are in Attack Position, this card gains 1000 ATK for each; if all are in Defense Position, it gains 1000 DEF for each',real_only=True)
AURAS['kotodama']=dict(fits={'m_main'},text='Destroy face-up monsters when another face-up monster with the same name is present.',real_only=True)
ACTS['agido_die_revive']=dict(fits={'m_main'},text='when this card is destroyed by battle, roll a six-sided die; Special Summon a Fairy from your GY with that Level (or Level 6 or higher on a 6)',real_only=True)
ACTS['great_phantom_thief']=dict(fits={'m_main'},text='when this card inflicts Battle Damage, declare a card name; reveal your opponent’s hand and discard all copies of it',real_only=True)
ACTS['disc_fighter']=dict(fits={'m_main'},text='when this card attacks a Defense Position monster with 2000 or more DEF, destroy it before damage calculation',real_only=True)
ACTS['kiseitai']=dict(fits={'m_main'},text='when attacked face-down, equip this card to the attacker; gain LP equal to half its ATK during each opposing Standby Phase',real_only=True)
CONDS['opp_discard_effect']=dict(kind='event',fits={'m_main'},text='When your opponent activates an effect that would make them discard',real_only=True)
COSTS['send_self_hand_cost']=dict(fits={'m_main'},spends=True,leaves=True,text='send this card from your hand to the GY as cost',real_only=True)
ACTS['negate_discard_effect']=dict(fits={'m_main'},hand=True,text='negate that effect activation, and if you do, destroy that card',real_only=True)
ACTS['revive_linked']=dict(fits={'t_cont'},target=True,tclause='target {filter}',text='Special Summon it from your GY; destroy it if this card leaves the field, and destroy this card if it is destroyed',real_only=True)
ACTS['enemy_controller_change_position']=dict(fits={'s_quick'},target=True,tclause='target 1 face-up monster your opponent controls',text='change its battle position',real_only=True)
ACTS['forgiving_maiden_recover']=dict(fits={'m_main'},target=True,tclause='target 1 of your monsters destroyed by battle this turn in your GY',text='return it to your hand',real_only=True)
ACTS['recover_battle_target_level']=dict(fits={'m_main'},text='gain 300 LP for each Level of the monster this card destroyed by battle and sent to the GY',real_only=True)
AURAS['drillago_direct_attack']=dict(fits={'m_main'},text='This card can attack directly while your opponent controls no Spell/Trap Cards and no face-down or low-ATK monsters.',real_only=True)
AURAS['drillago_direct_attack']=dict(fits={'m_main'},text='This card can attack directly while your opponent controls no Spell/Trap Cards and no face-down or low-ATK monsters.',real_only=True)
AURAS['self_cannot_be_battle_target']=dict(fits=MONSTER_SLOTS,text='This card cannot be targeted for attacks.',real_only=True)
AURAS['cannot_attack_special_summon_turn']=dict(fits=MONSTER_SLOTS,text='This card cannot attack the turn it is Special Summoned.',real_only=True)
ACTS['prevent_effect_damage_turn']=dict(fits=ACTIVATED,text='You take no effect damage until the end of this turn.',real_only=True)
ACTS['no_battle_damage_turn']=dict(fits=ACTIVATED,text='You take no battle damage this turn.',real_only=True)
ACTS['no_battle_damage_this_battle']=dict(fits={'m_main'},hand=True,text='You take no Battle Damage from that battle',real_only=True)
ACTS['indestructible_battle_selector_turn']=dict(fits={'m_main'},hand=True,text='your {filter} monsters cannot be destroyed by battle this turn',real_only=True)
ACTS['decktop_attacker']=dict(fits={'m_main'},text='place the attacking monster on top of its owner\'s Deck',real_only=True)
ACTS['timeater_skip_main1']=dict(fits={'m_main'},text='your opponent skips their next Main Phase 1',real_only=True)
ACTS['electric_lizard_lock_attacker']=dict(fits={'m_main'},text='the non-Zombie monster that attacked this card cannot attack during its controller’s next turn',real_only=True)
ACTS['dreamsprite_redirect']=dict(fits={'m_main'},target=True,tclause='target another monster you control',text='make the attacking monster battle that target instead',real_only=True)
ACTS['maharaghi_next_draw']=dict(fits={'m_main'},text='at your next Draw Phase, look at the top card of your Deck and choose to keep it there or place it on the bottom',real_only=True)
ACTS['gray_wing_extra_attack']=dict(fits={'m_main'},text='this card can attack twice this Battle Phase',real_only=True)
ACTS['recover_from_gy']=dict(fits=MONSTER_SLOTS,grave=True,text='if this card is in your GY, gain {n} LP',real_only=True)
ACTS['ss_fusion_from_extra']=dict(fits={'m_main'},ss=True,text='Special Summon 1 Fusion Monster from your Extra Deck',real_only=True)
ACTS['ss_self_if_opp_more']=dict(fits={'m_main'},ss=True,text='Special Summon this card from your hand if your opponent controls at least {n} more monsters than you do',n=R(1,3),real_only=True)
ACTS['maju_garzett_stats']=dict(fits={'m_main'},text='After this card is Tribute Summoned, its ATK becomes the combined ATK of the Tributed monsters',real_only=True)
ACTS['self_atk_level_500']=dict(fits={'m_main'},text='this card gains 500 ATK and 1 Level',real_only=True)
ACTS['self_change_attribute']=dict(fits={'m_main'},text='change this card’s Attribute to another Attribute until it leaves the field',real_only=True)
ACTS['pixie_knight_spell_topdeck']=dict(fits={'m_main'},target=True,tclause='target 1 Spell in your GY; your opponent selects it',text='place it on top of your Deck',real_only=True)
ACTS['indes_battle_turn']=dict(fits=ACTIVATED,text='Your monsters cannot be destroyed by battle this turn.',real_only=True)
ACTS['pierce_all_turn']=dict(fits={'s_normal','s_quick','t_normal'},text='Your monsters inflict piercing Battle Damage this turn.',real_only=True)
ACTS['shinato_battle_damage']=dict(fits={'m_ritual'},text='inflict damage to your opponent equal to the destroyed monster’s original ATK',real_only=True)
ACTS['paladin_destroy_battle_target']=dict(fits={'m_ritual'},text='destroy the face-down Defense Position monster this card is attacking',real_only=True)
ACTS['destroy_other_monsters']=dict(fits={'m_ritual'},text='destroy all other monsters on the field',real_only=True)
ACTS['dark_master_zorc_dice']=dict(fits={'m_ritual'},text='Once per turn, roll a six-sided die: destroy all opponent monsters on 1–2, destroy 1 opponent monster on 3–5, or destroy all your monsters on 6',real_only=True)
ACTS['draw_until_seven']=dict(fits={'m_main'},text='your opponent draws until they have 7 cards in their hand',real_only=True)
ACTS['control_all_low_level_opp']=dict(fits={'m_main'},text='take control of all face-up opponent monsters with Level 3 or lower',real_only=True)
ACTS['dark_designator_search']=dict(fits={'s_normal'},text='declare a non-Extra Deck monster name; your opponent adds one copy from their Deck to their hand if present',real_only=True)
ACTS['relinquished_absorb']=dict(fits={'m_ritual'},target=True,tclause='target 1 monster your opponent controls',text='equip it to this card (max. 1); this card gains its ATK/DEF, it can be destroyed by battle instead, and battle damage you take involving this card is inflicted to your opponent',real_only=True)
ACTS['self_change_position']=dict(fits={'m_main'},text='change this face-up card to face-up Defense Position during your End Phase',real_only=True)
ACTS['destroy_all_monsters']=dict(fits=ACTIVATED,text='destroy all {side}',real_only=True)
ACTS['destroy_all_lock_named']=dict(fits=ACTIVATED,text='destroy all opposing monsters; your named monster cannot attack this turn',real_only=True)
ACTS['bounce_all_opp_mon']=dict(fits=ACTIVATED,text='return all monsters your opponent controls to the hand',real_only=True)
CONDS['flip_summoned']=dict(kind='event',fits=MONSTER_SLOTS,text='When this card is Flip Summoned',real_only=True)
CONDS['flip_mandatory']=dict(kind='event',fits={'m_main'},text='When this card is flipped face-up',real_only=True)
CONDS['kelbek_battled']=dict(kind='event',fits={'m_main'},text='After a monster battles this card',real_only=True)
CONDS['shinato_destroyed_defense']=dict(kind='event',fits={'m_ritual'},text='When this card destroys a Defense Position monster by battle and sends it to the GY',real_only=True)
CONDS['paladin_attacks_facedown']=dict(kind='event',fits={'m_ritual'},text='When this card attacks a face-down Defense Position monster',real_only=True)
CONDS['battle_destroyed_by_race']=dict(kind='event',fits={'m_main'},text='When this card is destroyed by battle with a {race} monster',real_only=True)
CONDS['battled_face_down_target']=dict(kind='event',fits={'m_main'},text='After this card battles while it was the face-down attack target',real_only=True)
CONDS['attacked_by_this_card']=dict(kind='event',fits={'m_main'},text='After this card attacks a monster',real_only=True)
CONDS['battle_damage_event']=dict(kind='event',fits={'s_quick'},text='When you take at least {n} battle damage from one attack',real_only=True)
CONDS['opp_damage_calc_battle_damage']=dict(kind='event',fits={'m_main'},text='During damage calculation, if you would take Battle Damage from an opponent’s attack',real_only=True)
CONDS['this_card_direct_battle_damage']=dict(kind='event',fits={'m_main'},text='When this card inflicts Battle Damage to your opponent by a direct attack',real_only=True)
CONDS['attacked_still_in_battle']=dict(kind='event',fits={'m_main'},text='At the end of the Damage Step, if this card attacked and remains in the battle',real_only=True)
CONDS['standby_faceup_attack']=dict(kind='event',fits={'m_main'},text='During your Standby Phase, while this card is in face-up Attack Position',real_only=True)
CONDS['this_card_battle_damage_to_opp']=dict(kind='event',fits={'m_main','m_fusion'},text='When this card inflicts Battle Damage to your opponent',real_only=True)
CONDS['battling_with_monster']=dict(kind='event',fits={'m_main'},text='At the start of the Battle Step, if this card is battling a monster',real_only=True)
CONDS['legacy_hunter_facedown_destroy']=dict(kind='event',fits={'m_main'},text='When this face-up card destroys a face-down Defense Position monster by battle',real_only=True)
CONDS['ancient_lamp_attacked_facedown']=dict(kind='event',fits={'m_main'},text='When an opponent attacks this face-down Defense Position card',real_only=True)
CONDS['drill_bug_battle_damage']=dict(kind='event',fits={'m_main'},text='When this card inflicts Battle Damage to your opponent',real_only=True)
CONDS['returned_faceup_to_deck']=dict(kind='event',fits={'m_main'},text='If this face-up card is returned from the field to your Deck',real_only=True)
CONDS['skull_knight_fiend_tribute_material']=dict(kind='event',fits={'m_main'},text='If this card is Tributed for the Tribute Summon of a Fiend monster',real_only=True)
ACTS['drill_bug_search_top']=dict(fits={'m_main'},text='shuffle your Deck, then place Parasite Paracide from it on top of your Deck',real_only=True)
ACTS['ss_skull_knight_copy']=dict(fits={'m_main'},text='Special Summon another copy of this card from your Deck, then shuffle',real_only=True)
AURAS['end_of_anubis_gy_lock']=dict(fits={'m_main'},text='Negate effects that activate in a GY or target a card in a GY',real_only=True)
ACTS['meanae_search_choice']=dict(fits={'m_main'},text='add a Dark Scorpion card from your Deck or GY to your hand',real_only=True)
ACTS['chick_yellow_choice']=dict(fits={'m_main'},text='return a card on the field to the hand, or inspect the opponent\'s top card and place it on top or bottom',real_only=True)
ACTS['gorg_strong_choice']=dict(fits={'m_main'},text='return an opposing monster to the top of the Deck, or send the opponent\'s top card to the GY',real_only=True)
ACTS['cliff_choice']=dict(fits={'m_main'},text='destroy a Spell/Trap on the field, or send the opponent\'s top 2 cards to the GY',real_only=True)
ACTS['coin_destroy_battling']=dict(fits={'m_main'},text='toss a coin; destroy the monster battling this card if it is Heads',real_only=True)
ACTS['reveal_opp_set_spell_traps']=dict(fits={'m_main'},text='reveal all Set Spell/Trap Cards your opponent controls',real_only=True)
ACTS['kryuel_coin_destroy_opp']=dict(fits={'m_main'},text='toss a coin; if Heads, destroy 1 monster your opponent controls',real_only=True)
ACTS['legacy_hunter_return_random']=dict(fits={'m_main'},text='your opponent randomly returns 1 card from their hand to the Deck, then shuffles',real_only=True)
ACTS['roulette_barrel_dice_destroy']=dict(fits={'m_main'},text='once per turn, roll two dice and destroy 1 face-up monster with a Level equal to one result',real_only=True)
ACTS['ancient_lamp_redirect']=dict(fits={'m_main'},target=True,tclause='target another monster your opponent controls',text='make the attacking monster attack that target instead and perform damage calculation',real_only=True)
ACTS['mystic_swordsman_lv6_destroy']=dict(fits={'m_main'},text='destroy the face-down monster this card is battling; you can place an opponent-owned monster on top of their Deck instead',real_only=True)
ACTS['mystic_swordsman_normal_set_only']=dict(fits={'m_main'},text='Cannot be Normal Summoned, but can be Normal Set.',real_only=True)
ACTS['cyber_raider_choice']=dict(fits={'m_main'},text='choose to destroy an equipped Equip Card on the field or equip one to this card',real_only=True)
ACTS['mausoleum_proc']=dict(fits={'s_field'},text='set up this card’s tribute-count Normal Summon procedure',real_only=True)
ACTS['mausoleum_summon']=dict(fits={'s_field'},text='during a Main Phase, pay 1000 or 2000 LP to Normal Summon/Set from hand a monster requiring exactly 1 or 2 Tributes without Tributing',real_only=True)
ACTS['reveal_opp_set_card']=dict(fits={'m_main'},target=True,tclause='target 1 Set card your opponent controls',text='reveal it to you, then return it to its original position',real_only=True)
ACTS['damage_battle_attacker']=dict(fits={'m_main'},text='inflict {n} damage to the controller of the monster that attacked this card',n=R(100,2000,100),real_only=True)
ACTS['reduce_battle_target_atk_500']=dict(fits={'m_main'},text='the face-up monster this card attacked loses 500 ATK until the End Phase',real_only=True)
AURAS['rocket_warrior_protection']=dict(fits={'m_main'},text='During your turn, this card cannot be destroyed by battle and you take no battle damage from battles involving it.',real_only=True)
ACTS['banish_all_monsters_deck_gy']=dict(fits={'s_quick'},text='banish all monsters in both players’ Decks and GYs',real_only=True)
ACTS['set_target_def_to_total_original_def']=dict(fits={'s_quick'},target=True,
    tclause='target 1 face-up monster you control',text='its DEF becomes the combined original DEF of all face-up monsters you control until the End Phase',real_only=True)
ACTS['riryoku']=dict(fits={'s_normal'},target=True,
    tclause='target 2 face-up monsters on the field',text='halve one target’s ATK, then give the lost ATK to the other target until the End Phase',real_only=True)
CONDS['opponent_attacks_stronger_defense']=dict(kind='event',fits={'t_normal'},text='At the end of the Damage Step, if an opponent attacked a Defense Position monster with higher DEF than the attacker’s ATK',real_only=True)
ACTS['destroy_current_attacker']=dict(fits={'t_normal'},target=True,tclause='target the attacking monster',text='destroy it',real_only=True)
ACTS['dimension_jar']=dict(fits={'m_main'},text='each player may banish up to 3 monsters from their opponent’s GY',real_only=True)
CONDS['your_standby_phase']=dict(kind='event',fits={'s_normal'},text='During your Standby Phase',real_only=True)
ACTS['lock_positions_turn']=dict(fits={'s_normal'},text='monsters cannot change their battle positions until the End Phase, except by card effects',real_only=True)
ACTS['ss_self_banished_dino_boost']=dict(fits={'m_main'},text='Special Summon this card from banishment; it gains 200 ATK for each of your face-up banished Dinosaur monsters',real_only=True)
ACTS['spear_cretin_revive_both']=dict(fits={'m_main'},target=True,text='each player targets 1 monster in their GY and Special Summons it in face-up Attack or face-down Defense Position',real_only=True)
ACTS['familiar_knight_summon']=dict(fits={'m_main'},text='each player may Special Summon 1 Level 4 monster from their hand',real_only=True)
CONDS['destroyed_opp_by_battle']=dict(kind='event',fits={'m_main'},text='When this card destroys an opponent’s monster by battle',real_only=True)
CONDS['destroyed_opp_by_battle_sent_gy']=dict(kind='event',fits={'m_main'},text='When this card destroys an opponent’s monster by battle and sends it to the GY',real_only=True)
ACTS['draw_then_bottomdeck_one']=dict(fits={'m_main'},text='draw 1 card, then return 1 card from your hand to the bottom of your Deck',real_only=True)
ACTS['mysterious_guard']=dict(fits={'m_main'},target=True,text='target 1 face-up monster to place on top of the Deck, or with a face-up Warrior, target 2 and return one to hand after placing the other on top',real_only=True)
ACTS['swap_target_base_atk_def']=dict(fits={'m_main'},target=True,
    tclause='target 1 face-up EARTH monster on the field',text='swap its original ATK and DEF until the End Phase',real_only=True)
AURAS['half_battle_damage_to_opp']=dict(fits={'m_main'},text='Halve the Battle Damage this card inflicts to your opponent.',real_only=True)
ACTS['equip_spell_from_gy']=dict(fits={'m_main'},target=True,
    tclause='target 1 Equip Spell in your GY that can equip to this card',text='equip it to this card',real_only=True)
CONDS['battle_damage_to_opp']=dict(kind='event',fits={'m_main'},text='When this card inflicts Battle Damage to your opponent',real_only=True)
ACTS['opp_choose_spell_deck_gy']=dict(fits={'m_main'},text='your opponent sends 1 Spell from their Deck to the GY',real_only=True)
CONDS['normal_summoned_mandatory']=dict(kind='event',fits={'m_main'},
                                        text='When this card is Normal Summoned',real_only=True)
CONDS['opp_monster_changed_to_defense']=dict(kind='event',fits={'t_normal'},
                                             text='When an opponent monster changes from face-up Attack to face-up Defense Position',real_only=True)
CONDS['destroyed_face_down_trap']=dict(kind='event',fits={'t_normal'},
                                       text='When this Set card is destroyed and sent to the GY',real_only=True)
ACTS['pyramid_energy_choice']=dict(fits=ACTIVATED,text='Choose one: your face-up monsters gain 200 ATK or 500 DEF until the End Phase.',real_only=True)
ACTS['dicephoon']=dict(fits={'s_quick'},text='Roll a six-sided die: destroy one Spell/Trap on 2-4, two on 5, or take 1000 damage on 1 or 6.',real_only=True)
ACTS['dark_coffin']=dict(fits={'t_normal'},text='Your opponent chooses: discard a random card from their hand, or destroy one monster they control.',real_only=True)
AURAS['megamorph']=dict(fits={'s_equip'},text='If your LP are lower than your opponent\'s, the equipped monster has double its original ATK; if higher, it has half its original ATK.',real_only=True)
AURAS['sword_dragon_soul']=dict(fits={'s_equip'},text='When the equipped monster battles a Dragon monster, destroy that monster after the battle.',real_only=True)
AURAS['hydro_pressure_cannon']=dict(fits={'s_equip'},text='When the equipped Level 3 or lower WATER monster destroys an opponent\'s monster by battle, send a random card from their hand to the GY.',real_only=True)
AURAS['big_bang_shot']=dict(fits={'s_equip'},text='When this card leaves the field, banish the monster it was equipped to.',real_only=True)
AURAS['ring_of_magnetism']=dict(fits={'s_equip'},text='Equip only to your monster. It loses 500 ATK and DEF, and your opponent can only attack it.',real_only=True)
AURAS['necklace_of_command']=dict(fits={'s_equip'},text='If the equipped monster you control is destroyed by battle and this card is sent to the GY, choose to draw 1 card or make your opponent discard a random card.',real_only=True)
AURAS['dragonic_attack']=dict(fits={'s_equip'},text='The equipped Warrior becomes a Dragon and gains 500 ATK and DEF.',real_only=True)
ACTS['trap_monster_normal']=dict(fits={'t_cont'},text='Special Summon this card as a Normal Trap Monster ({race}/{attr}/Level {l}/ATK {n}/DEF {d}).',ss=True,real_only=True)
ACTS['trap_monster_effect']=dict(fits={'t_cont'},text='Special Summon this card as an Effect Trap Monster with its mapped Type, Attribute, Level, ATK, and DEF.',ss=True,real_only=True)
AURAS['tiki_soul_protect']=dict(fits={'t_cont'},text='While this card is a monster, you can Set your other Trap Monsters that would be destroyed by your opponent.',real_only=True)
ACTS['mesmeric_control']=dict(fits={'s_normal'},text='Your opponent cannot change the battle positions of monsters during their next turn.',real_only=True)
COSTS['sanctity_banish']=dict(fits={'s_normal'},spends=True,text='banish all other cards you control and in your hand face-up',real_only=True)
CONDS['effect_damage_to_you']=dict(kind='event',fits={'t_counter'},text='When an activated card effect will inflict effect damage to you',real_only=True)
ACTS['reflect_effect_damage']=dict(fits={'t_counter'},text='Reflect that effect damage to your opponent instead.',real_only=True)
AURAS['shadow_spell']=dict(fits={'t_cont'},text='Target an opponent monster; it loses 700 ATK, cannot attack or change position, and this card is destroyed when it leaves the field.',real_only=True)
AURAS['harpies_hunting_ground']=dict(fits={'s_field'},text='When Harpie Lady or Harpie Lady Sisters is Summoned, the summoning player targets and destroys a Spell/Trap on the field.',real_only=True)
AURAS['legendary_ocean']=dict(fits={'s_field'},text='This card is also treated as Umi; WATER monsters gain 200 ATK/DEF and lose 1 Level in both players’ hands and on the field.',real_only=True)
AURAS['amazoness_village']=dict(fits={'s_field'},text='Amazoness monsters gain 200 ATK; when one is destroyed and sent to the GY, Special Summon a lower-Level Amazoness from your Deck.',real_only=True)
AURAS['fusion_gate']=dict(fits={'s_field'},text='Either player can Fusion Summon using Fusion Materials from their hand or field, banishing those materials.',real_only=True)
AURAS['array_revealing_light']=dict(fits={'s_field'},text='Declare a Type; monsters of that Type cannot attack during the turn they are Summoned.',real_only=True)
AURAS['fairy_king_truesdale']=dict(fits={'m_main'},text='While this card is in Defense Position, Plant monsters you control gain 500 ATK and DEF.',real_only=True)
CONDS['main_phase']=dict(kind='state',fits={'t_cont','t_normal'},text='it is a Main Phase',real_only=True)
AURAS['stronghold_gadget_bonus']=dict(fits={'t_cont'},text='If you control Green Gadget, Red Gadget, and Yellow Gadget, this card gains 3000 ATK.',real_only=True)
AURAS['zoma_burn']=dict(fits={'t_cont'},text='If this Trap Monster is destroyed by battle, inflict damage to your opponent equal to the battling monster\'s ATK.',real_only=True)
AURAS['narrow_pass']=dict(fits={'t_cont'},text='Activate only if each player controls 2 or fewer monsters; neither player can Normal Summon while they control 2 or more monsters.',real_only=True)
AURAS['forced_requisition']=dict(fits={'t_cont'},text='Activate when you discard; whenever you discard cards while this remains face-up, your opponent discards the same number.',real_only=True)
AURAS['eye_of_truth']=dict(fits={'t_cont'},text='Your opponent keeps their hand revealed. Once per turn during their Standby Phase, if they have a Spell in hand, they gain 1000 LP.',real_only=True)
ACTS['half_or_nothing']=dict(fits={'t_normal'},text='Your opponent chooses: halve the ATK of all their monsters until the end of the Battle Phase, or end the Battle Phase.',real_only=True)
AURAS['fairy_box']=dict(fits={'t_cont'},text='When your opponent attacks, toss a coin; if heads, the attacking monster has 0 ATK for the Battle Phase.',real_only=True)
ACTS['swamp_mirrorer']=dict(fits={'t_cont'},text='Declare a Type and Attribute; Special Summon this as a Level 4 Normal Trap Monster (1800 ATK/1000 DEF) with them.',ss=True,real_only=True)
ACTS['tiki_curse']=dict(fits={'t_cont'},text='Special Summon this as an Effect Trap Monster (Rock/DARK/Level 4/1800 ATK/1000 DEF); if another Trap Monster battles, destroy its opponent battle target after damage calculation.',ss=True,real_only=True)
ACTS['scapegoat_tokens']=dict(fits={'s_quick'},text='Special Summon four Sheep Tokens (Beast/EARTH/Level 1/0 ATK/0 DEF) in Defense Position; they cannot be Tributed for a Tribute Summon.',ss=True,real_only=True)
CONDS['any_special_summoned']=dict(kind='event',fits=MONSTER_SLOTS,
                                   text='If this card is Special Summoned',real_only=True)
CONDS['special_summoned_from_gy']=dict(kind='event',fits=MONSTER_SLOTS,
                                       text='If this card is Special Summoned from the GY',real_only=True)
CONDS['destroyed_mandatory']=dict(kind='event',fits=MONSTER_SLOTS,
                                  text='When this card is destroyed and sent to the GY',real_only=True)
CONDS['attacks_faceup_defense']=dict(kind='event',fits={'m_main'},
                                     text='When this card attacks a face-up Defense Position monster',real_only=True)
CONDS['end_phase_mandatory']=dict(kind='event',fits={'m_main'},text='During your End Phase',real_only=True)
CONDS['your_turn']=dict(kind='state',fits={'t_normal'},text='it is your turn',real_only=True)
CONDS['attacked_not_destroyed']=dict(kind='event',fits={'m_main'},text='After this card is attacked, if the attacking monster survived the battle',real_only=True)
CONDS['battle_opponent_not_destroyed']=dict(kind='event',fits={'m_main'},text='At the end of the Damage Step, if the opponent\'s monster that battled this card survived',real_only=True)
CONDS['leaves_field_faceup']=dict(kind='event',fits={'m_fusion'},text='When this face-up card leaves the field',real_only=True)
CONDS['destroyed_anywhere']=dict(kind='event',fits={'m_fusion'},text='When this card is destroyed',real_only=True)
CONDS['sent_to_gy']=dict(kind='event',fits=MONSTER_SLOTS,
                         text='When this card is sent to the GY',real_only=True)
CONDS['summon_trigger']=dict(kind='event',fits={'m_main'},
                             text='When this card is Summoned',real_only=True)
CONDS['tribute_summoned']=dict(kind='event',fits={'m_main'},
                               text='If this card is Tribute Summoned',real_only=True)
CONDS['standby_defense']=dict(kind='event',fits={'m_main'},
                              text='During your Standby Phase, while this card is face-up in Defense Position',real_only=True)
CONDS['standby_mandatory']=dict(kind='event',fits={'m_main'},
                                text='During your Standby Phase',real_only=True)
CONDS['can_enter_bp']=dict(kind='state',fits=ACTIVATED,text='you can enter the Battle Phase',real_only=True)
CONDS['activate_type_any']=dict(kind='event',fits={'t_counter'},text='When a {card_type} Card is activated',real_only=True)
AURAS['spirit_return']=dict(fits=MONSTER_SLOTS,text="Return this card to its owner's hand during the End Phase of the turn it is Normal Summoned or flipped face-up.",real_only=True)
AURAS['no_traps_on_normal_summon']=dict(fits=MONSTER_SLOTS,text='When this card is Normal Summoned successfully, no Trap Cards can be activated.',real_only=True)
CONDS['battle_destroyed']=dict(kind='event',fits=MONSTER_SLOTS,text='If this card is destroyed by battle and sent to the GY',real_only=True)
CONDS['battle_destroyed_mandatory']=dict(kind='event',fits=MONSTER_SLOTS,text='If this card is destroyed by battle and sent to the GY',real_only=True)
CONDS['hand_discarded_by_opp']=dict(kind='event',fits=MONSTER_SLOTS,text="If this card is discarded from your hand to the GY by your opponent's card effect",real_only=True)
CONDS['hand_sent_by_opp']=dict(kind='event',fits=MONSTER_SLOTS,text="If this card is sent from your hand to the GY by your opponent's card effect",real_only=True)
CONDS['destroyed_not_battle']=dict(kind='event',fits=MONSTER_SLOTS,text='If this card is destroyed and sent to the GY except by battle',real_only=True)
ACTS['damage_both']=dict(fits=ACTIVATED,text='inflict {n} damage to your opponent and {d} damage to you',real_only=True)
ACTS['stat_mod_target']=dict(fits=ACTIVATED,target=True,text='target {filter}; {effect} until the End Phase',real_only=True)
ACTS['destroy_any_mon']=dict(fits=ACTIVATED,text='destroy 1 monster on the field',target=True,real_only=True)
ACTS['ss_filtered']=dict(fits=ACTIVATED,text='Special Summon 1 {filter} from your {zone}{position}',race=True,attr=True,real_only=True)
ACTS['ss_any_filtered']=dict(fits=ACTIVATED,text='Special Summon any number of {filter} from your {zone}{position}',race=True,attr=True,real_only=True)
ACTS['dark_mimic_draw']=dict(fits={'m_main'},text='draw 1 card, or 2 if this card was Special Summoned by Dark Mimic LV1',real_only=True)
ACTS['destroy_any_st']=dict(fits=ACTIVATED,text='destroy 1 Spell/Trap on the field',target=True,real_only=True)
ACTS['destroy_up_to_two_st']=dict(fits={'m_main'},text='target up to 2 Spell/Trap Cards on the field; destroy them',target=True,real_only=True)
CONDS['opp_normal_summon']=dict(kind='event',fits={'t_normal'},text='When your opponent Normal Summons a monster',real_only=True)
CONDS['opp_flip_summon']=dict(kind='event',fits={'t_normal'},text='When your opponent Flip Summons a monster',real_only=True)
CONDS['summon_event']=dict(kind='event',fits={'t_normal','m_main'},text='When {summon_side} {methods} Summons {filter}',real_only=True)
CONDS['summon_event_cont']=dict(kind='event',fits={'t_cont'},text='When {summon_side} {methods} Summons {filter}',real_only=True)
CONDS['summon_event_cont_spell']=dict(kind='event',fits={'s_cont'},text='When {summon_side} {methods} Summons {filter}',real_only=True)
ACTS['set_defense_summoned']=dict(fits={'s_cont'},text='change the Summoned monsters to face-up Defense Position',real_only=True)
ACTS['morphing_jar_effect']=dict(fits={'m_main'},text='each player discards their hand, then each player draws 5 cards',real_only=True)
ACTS['reveal_deck_top']=dict(fits={'s_normal'},text='look at the top {n} cards of {deck_owner} Deck',real_only=True)
ACTS['discard_up_to']=dict(fits={'s_normal'},text='discard 1 to {n} {filter} from your hand',real_only=True)
ACTS['shuffle_opp_hand_draw_same']=dict(fits={'t_normal','s_quick'},text='your opponent shuffles their hand into the Deck, then draws the same number of cards',real_only=True)
ACTS['no_attack_facedown_turn']=dict(fits={'t_normal'},text='monsters cannot attack face-down monsters this turn',real_only=True)
ACTS['all_your_monsters_dragon_turn']=dict(fits={'t_normal'},text='all face-up monsters you control become Dragon-Type until the End Phase',real_only=True)
ACTS['remove_spell_counters_all']=dict(fits={'t_normal'},text='remove all Spell Counters from face-up cards on the field',real_only=True)
ACTS['swap_base_atk_def_all_turn']=dict(fits={'s_normal'},text='swap the original ATK and DEF of all face-up monsters until the End Phase',real_only=True)
ACTS['banish_temp_target']=dict(fits={'t_normal'},target=True,
    tclause='target 1 face-up monster you control',
    text='banish it until the End Phase',real_only=True)
ACTS['inspect_opp_hand_card']=dict(fits={'s_normal'},text="look at 1 card in your opponent's hand",real_only=True)
ACTS['skip_next_two_draw_phases']=dict(fits={'t_normal'},text='skip your next 2 Draw Phases',real_only=True)
ACTS['inspect_opp_hidden_cards']=dict(fits={'t_normal'},text="look at your opponent's hand and Set cards",real_only=True)
ACTS['halve_summoned_original_atk']=dict(fits={'t_normal'},text='halve the original ATK of face-up monsters your opponent Summoned',real_only=True)
ACTS['opp_choose_equip_deck_gy']=dict(fits={'t_normal'},text='your opponent chooses an Equip Spell from their Deck to send to the GY',real_only=True)
ACTS['opp_choose_insect_decktop']=dict(fits={'s_normal'},text='your opponent chooses an Insect monster from their Deck to place on top',real_only=True)
ACTS['ss_all_banished_both']=dict(fits={'s_normal'},text='both players Special Summon as many of their face-up banished monsters as possible',real_only=True)
ACTS['no_traps_activated_turn']=dict(fits={'t_normal'},text='neither player can activate Trap Cards this turn',real_only=True)
ACTS['disable_defense_monsters_turn']=dict(fits={'t_normal'},text='negate the effects of Defense Position monsters until the End Phase',real_only=True)
ACTS['indestructible_low_water_turn']=dict(fits={'t_normal'},text='your face-up Level 3 or lower WATER monsters cannot be destroyed this turn',real_only=True)
CONDS['banished_monsters']=dict(kind='state',fits={'s_normal'},text='you have at least {n} banished monsters',real_only=True)
CONDS['banished_race_count']=dict(kind='state',fits={'s_normal'},text='you have at least {n} banished monsters of the listed Types',real_only=True)
CONDS['banished_cards']=dict(kind='state',fits={'s_normal'},text='you have at least {n} banished cards',real_only=True)
CONDS['gy_empty']=dict(kind='state',fits={'s_normal'},text='there are no cards in your GY',real_only=True)
CONDS['opp_standby_phase']=dict(kind='state',fits={'t_normal'},text="it is your opponent's Standby Phase",real_only=True)
CONDS['opp_normal_draw']=dict(kind='event',fits={'t_normal'},text='When your opponent draws for their normal draw',real_only=True)
CONDS['opp_main1']=dict(kind='state',fits={'t_normal'},text="it is your opponent's Main Phase 1",real_only=True)
CONDS['opp_tribute_summon_attack']=dict(kind='event',fits={'t_normal'},text='When a Tribute Summoned monster your opponent controls declares an attack',real_only=True)
CONDS['battle_destroyed_forced']=dict(kind='event',fits={'m_main'},text='When this card is destroyed by battle and sent to the GY',real_only=True)
CONDS['opp_trap_activation']=dict(kind='event',fits={'m_main'},text='When your opponent activates a Trap Card or Trap effect that can be negated',real_only=True)
ACTS['negate_trap_activation_destroy']=dict(fits={'m_main'},text='negate the Trap activation, and if you do, destroy that Trap',real_only=True)
ACTS['protect_set_st_until_opp_end']=dict(fits={'s_normal'},text='Set Spell and Trap Cards cannot be destroyed by effects until your opponent\'s next End Phase',real_only=True)
ACTS['opponent_tribute_monster']=dict(fits={'s_normal'},text='your opponent Tributes 1 monster for no effect',real_only=True)
ACTS['hand_limit_7_duel']=dict(fits={'s_normal'},text='your hand size limit becomes 7 for the rest of the Duel',real_only=True)
ACTS['discard_drawn_card']=dict(fits={'t_normal'},text='your opponent discards the card they drew',real_only=True)
ACTS['taunt_force_attack_target']=dict(fits={'t_normal'},target=True,tclause='target 1 face-up monster you control',text='your opponent must attack that monster this turn, if able',real_only=True)
ACTS['staunch_defender_attack_target']=dict(fits={'t_normal'},target=True,tclause='target 1 face-up monster you control',text='your opponent must attack that monster this Battle Phase with every face-up monster able to attack',real_only=True)
ACTS['blast_held_by_tribute']=dict(fits={'t_normal'},text='destroy all face-up Attack Position monsters your opponent controls, then inflict 1000 damage if any were destroyed',real_only=True)
CONDS['spirit_ryu_battle']=dict(kind='event',fits={'m_main'},text='During your turn’s Battle Phase, this card is the attacker or attack target',real_only=True)
COSTS['discard_dragon_cost']=dict(fits={'m_main'},spends=True,text='discard 1 Dragon monster from your hand as cost',real_only=True)
ACTS['spirit_ryu_battle_boost']=dict(fits={'m_main'},text='this card gains 1000 ATK and DEF until the end of the Battle Phase',real_only=True)
ACTS['barrel_dragon_coin_destroy']=dict(fits={'m_main'},target=True,tclause='target 1 monster your opponent controls',text='toss 3 coins; destroy it if at least 2 results are Heads',real_only=True)
COSTS['discard_wind_cost']=dict(fits={'m_main'},spends=True,text='discard 1 WIND monster from your hand as cost',real_only=True)
ACTS['bounce_all_opp_st']=dict(fits={'m_main'},text='return all Spell/Trap Cards your opponent controls to the hand',real_only=True)
CONDS['amazoness_archers_attack']=dict(kind='event',fits={'t_normal'},text='When your opponent declares an attack while you control a face-up Amazoness monster',real_only=True)
ACTS['amazoness_archers_effect']=dict(fits={'t_normal'},text='change opposing monsters to face-up Attack Position without activating Flip Effects; they lose 500 ATK and must attack this turn if able',real_only=True)
AURAS['ultimate_baseball_kid_atk']=dict(fits={'m_main'},text='This card gains 1000 ATK for each other face-up FIRE monster on the field.',real_only=True)
COSTS['send_fire_monster_cost']=dict(fits={'m_main'},spends=True,text='send 1 other face-up FIRE monster you control to the GY as cost',real_only=True)
ACTS['curse_of_anubis']=dict(fits={'t_normal'},text='change all face-up Attack Position Effect Monsters to face-up Defense Position; their base DEF becomes 0 and their battle positions cannot change this turn',real_only=True)
AURAS['batteryman_charger_stats']=dict(fits={'m_main'},text='This card gains 300 ATK and DEF for each face-up Thunder monster you control.',real_only=True)
ACTS['batteryman_charger_summon']=dict(fits={'m_main'},text='Special Summon 1 other Batteryman monster from your hand or Deck',real_only=True)
ACTS['beast_soul_swap']=dict(fits={'t_normal'},target=True,tclause='target 1 face-up Beast monster you control with a Level',text='return it to the hand, then Special Summon a Beast monster from your hand with the same Level',real_only=True)
ACTS['level_up_lv']=dict(fits={'s_normal'},text='send a face-up LV monster you control to the GY, then Special Summon a monster mentioned in its text from your hand or Deck, ignoring its Summoning conditions',real_only=True)
ACTS['creator_revival']=dict(fits={'m_main'},target=True,tclause='target 1 monster in your GY that can be Special Summoned',text='send 1 card from your hand to the GY, then Special Summon that target',real_only=True)
CONDS['opp_spell_would_destroy_st']=dict(kind='event',fits={'t_counter'},text='When your opponent activates a Spell Card that would destroy Spell/Trap Cards on the field',real_only=True)
ACTS['judgment_of_anubis']=dict(fits={'t_counter'},text='negate and destroy that Spell Card; then you can destroy 1 face-up monster your opponent controls and inflict damage equal to its ATK',real_only=True)
CONDS['normal_summon_opp_more']=dict(kind='event',fits={'t_normal'},text='When you Normal Summon a monster while your opponent controls more monsters than you',real_only=True)
ACTS['pineapple_blast']=dict(fits={'t_normal'},text='your opponent chooses monsters they control to keep until they control the same number of monsters as you, then destroy the rest',real_only=True)
CONDS['yado_karu_defense_change']=dict(kind='event',fits={'m_main'},text='When this card changes from Attack Position to Defense Position',real_only=True)
ACTS['yado_karu_bottom_deck']=dict(fits={'m_main'},text='place any number of cards from your hand on the bottom of your Deck in any order',real_only=True)
ACTS['cup_of_ace_effect']=dict(fits={'s_normal'},text='toss a coin; Heads: draw 2 cards, Tails: your opponent draws 2 cards',real_only=True)
ACTS['reversal_quiz_effect']=dict(fits={'s_normal'},text='declare Monster, Spell, or Trap; if the top card matches, exchange both players\' LP',real_only=True)
ACTS['owner_seal']=dict(fits={'s_normal'},text='return all monsters to their owners',real_only=True)
ACTS['no_spells_opp_until_next_end']=dict(fits={'m_main'},text='your opponent cannot activate Spell Cards until the End Phase of the next turn',real_only=True)
ACTS['gold_sarcophagus']=dict(fits={'s_normal'},text='banish 1 card from your Deck face-up; during your 2nd Standby Phase, add it to your hand',real_only=True)
ACTS['destroy_def_below_target']=dict(fits={'s_normal'},target=True,tclause='target 1 face-up Summoned Skull or Thunder monster you control',text='destroy all face-up monsters your opponent controls with DEF less than or equal to its ATK',real_only=True)
CONDS['main1']=dict(kind='state',fits={'s_normal'},text='it is your Main Phase 1',real_only=True)
CONDS['attacked_by_weaker']=dict(kind='event',fits={'m_main'},text='At the end of the Damage Step, if a weaker monster attacked this Defense Position card',real_only=True)
CONDS['control_changed']=dict(kind='event',fits={'m_main'},text='When control of this face-up card changes',real_only=True)
CONDS['attacks_facedown']=dict(kind='event',fits={'m_main'},text='When this card attacks a face-down Defense Position monster',real_only=True)
CONDS['pot_of_greed_activation']=dict(kind='event',fits={'m_main'},text='When Pot of Greed is activated',real_only=True)
CONDS['equipped_to_this']=dict(kind='event',fits={'m_main'},text='When an Equip Card is equipped to this card',real_only=True)
ACTS['destroy_equipped_event']=dict(fits={'m_main'},text='destroy the Equip Card(s) equipped to this card',real_only=True)
CONDS['damage_to_controller']=dict(kind='event',fits={'t_normal'},text='When you take damage',real_only=True)
CONDS['opp_monster_reborn']=dict(kind='event',fits={'t_normal'},text='When your opponent activates "Monster Reborn" and its effect can be negated',real_only=True)
CONDS['your_monster_to_gy']=dict(kind='event',fits={'t_normal'},text='When one of your monsters is sent from the field to your GY',real_only=True)
CONDS['opp_activates_named']=dict(kind='event',fits={'t_normal'},text='When your opponent activates a listed card and its activation can be negated',real_only=True)
CONDS['continuous_type_activated']=dict(kind='event',fits={'t_normal'},text='When a listed type of Spell/Trap Card is activated',real_only=True)
CONDS['battle_damage_2000_plus']=dict(kind='event',fits={'t_normal'},text='During damage calculation, when you would take at least 2000 battle damage',real_only=True)
CONDS['opp_monster_changed_facedown']=dict(kind='event',fits={'t_normal'},text='When an opponent\'s monster changes from face-up to face-down',real_only=True)
CONDS['opp_monster_set']=dict(kind='event',fits={'t_normal'},text='When a monster is Set on your opponent\'s field',real_only=True)
CONDS['opp_monster_ss_facedown']=dict(kind='event',fits={'t_normal'},text='When a monster is Special Summoned face-down to your opponent\'s field',real_only=True)
CONDS['your_direct_battle_damage']=dict(kind='event',fits={'s_quick'},text='When your monster inflicts Battle Damage to your opponent by a direct attack',real_only=True)
CONDS['equip_card_equipped']=dict(kind='state',fits={'t_normal'},text='a monster on the field is equipped with an Equip Card',real_only=True)
CONDS['main1_first']=dict(kind='state',fits={'s_normal'},text='it is the first action of your Main Phase 1',real_only=True)
ACTS['heal_1000_plus_named_gy']=dict(fits={'t_normal'},text='gain 1000 LP, plus 500 for each copy of this card in your GY',real_only=True)
CONDS['changed_from_attack_to_defense']=dict(kind='event',fits={'m_main'},text='When this card changes from Attack Position to face-up Defense Position',real_only=True)
CONDS['changed_from_defense_to_attack']=dict(kind='event',fits={'m_main'},text='When this card changes from Defense Position to face-up Attack Position',real_only=True)
ACTS['destroy_target_opp']=dict(fits={'m_main'},target=True,tclause='target 1 monster your opponent controls',text='destroy it',real_only=True)
CONDS['battle_phase']=dict(kind='state',fits={'s_cont'},text='it is the Battle Phase',real_only=True)
AURAS['your_stat_mod_aura']=dict(fits={'s_cont'},text='Your {filter} gain {n} {stat} during the Battle Phase',real_only=True)
AURAS['non_effect_monsters_spell_immune']=dict(fits={'s_cont'},text='Non-Effect Monsters are unaffected by Spell effects',real_only=True)
CONDS['ss_from_own_gy']=dict(kind='event',fits={'s_cont'},text='When a monster is Special Summoned from your GY',real_only=True)
CONDS['no_monsters']=dict(kind='state',fits={'s_cont'},text='you control no monsters',real_only=True)
CONDS['beast_battle_damage_opp']=dict(kind='event',fits={'s_cont'},text='When a Beast monster you control inflicts Battle Damage to your opponent',real_only=True)
CONDS['your_battle_damage_opp']=dict(kind='event',fits={'t_cont'},text='When a monster you control inflicts Battle Damage to your opponent',real_only=True)
CONDS['your_faceup_fire_destroyed']=dict(kind='event',fits={'t_cont'},text='If a face-up FIRE monster you control is destroyed and sent from the field to the GY',real_only=True)
CONDS['non_token_banished']=dict(kind='event',fits={'s_cont'},text='When one or more non-Token cards are banished',real_only=True)
ACTS['recover_per_banished']=dict(fits={'s_cont'},text='gain 500 LP for each non-Token card banished',real_only=True)
CONDS['battled']=dict(kind='event',fits={'m_main'},text="After this card battles an opponent's monster",real_only=True)
ACTS['banish_battle_participants']=dict(fits={'m_main'},text='banish this card and the monster it battled',real_only=True)
ACTS['opp_mon_cannot_attack_while_this_faceup']=dict(fits={'m_main'},target=True,tclause='target 1 face-up monster your opponent controls',text='it cannot attack while this card remains face-up',real_only=True)
ACTS['draw_plus_named_faceup']=dict(fits={'m_main'},text='draw 1 card, plus 1 for each face-up named monster you control',real_only=True)
ACTS['flip_search_or_top']=dict(fits={'m_main'},text='select 1 {filter} from your Deck; add it to your hand if Necrovalley is active, or place it on top of your Deck',real_only=True)
ACTS['discard_one_each']=dict(fits={'m_main'},text='each player discards 1 card',real_only=True)
ACTS['weaken_battle_destroyer']=dict(fits={'m_main'},text='the monster that destroyed this card loses 500 ATK and DEF',real_only=True)
ACTS['poisonous_snake_token']=dict(fits={'m_main'},text='Special Summon 1 Poisonous Snake Token (Reptile/EARTH/Level 3/ATK 1200/DEF 1200); if it is destroyed by battle, inflict 500 damage to your opponent',real_only=True)
ACTS['wicked_token']=dict(fits={'t_normal'},text='Special Summon 1 Wicked Token (Fiend/DARK/Level 4/ATK 1000/DEF 1000)',real_only=True)
CONDS['opp_spell_activate']=dict(kind='event',fits={'m_main'},text='When your opponent activates a Spell Card',real_only=True)
CONDS['opp_negatable_spell_activate']=dict(kind='event',fits={'m_main'},text='When your opponent activates a Spell Card that can be negated',real_only=True)
ACTS['negate_spell_activation']=dict(fits={'m_main'},text='negate the activation of that Spell Card, and if you do, destroy it',real_only=True)
ACTS['negate_spell_activation_faceup']=dict(fits={'m_main'},text='negate the activation of that Spell Card, and if you do, destroy it; this card must remain face-up to resolve this effect',real_only=True)
ACTS['amazoness_swap_original_atk']=dict(fits={'s_normal'},target=True,
    tclause='target 1 face-up "Amazoness" monster you control and 1 face-up monster your opponent controls',
    text='switch the original ATK of those targets until the end of this turn',real_only=True)
CONDS['zombie_special_summoned']=dict(kind='event',fits={'m_main'},text='When a Zombie monster is Special Summoned, except this card',real_only=True)
ACTS['soul_absorbing_bone_tower_mill']=dict(fits={'m_main'},text='send the top 2 cards of your opponent’s Deck to the GY',real_only=True)
COSTS['lekunga_banish_water']=dict(fits={'m_main'},spends=True,text='banish 2 WATER monsters from your GY',real_only=True)
ACTS['lekunga_token']=dict(fits={'m_main'},text='Special Summon 1 Lekunga Token (Plant/WATER/Level 2/ATK 700/DEF 700) in Attack Position',real_only=True)
ACTS['yu_jo_friendship']=dict(fits={'s_normal'},text='offer a handshake; if accepted, make both players’ LP half their combined LP, and if you reveal "Unity" from your hand, acceptance is mandatory',real_only=True)
CONDS['kazejin_attacked']=dict(kind='event',fits={'m_main'},text='During your opponent’s turn, when this card is attacked, once while it remains face-up',real_only=True)
ACTS['kazejin_zero_attacker']=dict(fits={'m_main'},target=True,text='target the attacking monster; its ATK becomes 0 during damage calculation',real_only=True)
CONDS['amazoness_becomes_target']=dict(kind='event',fits={'t_normal'},text='When a face-up Amazoness monster you control becomes the target of a card effect',real_only=True)
ACTS['dramatic_rescue']=dict(fits={'t_normal'},target=True,text='return the targeted Amazoness monster(s) to the hand, then Special Summon 1 other monster from your hand',real_only=True)
ACTS['orca_mega_fortress']=dict(fits={'m_main'},target=True,text='Tribute Torpedo Fish to target and destroy 1 monster on the field, or Tribute Cannonball Spear Shellfish to target and destroy 1 Spell/Trap on the field',real_only=True)
ACTS['reverse_trap']=dict(fits={'t_normal'},text='reverse all ATK and DEF increases and decreases until the End Phase',real_only=True)
CONDS['covering_fire_window']=dict(kind='event',fits={'t_normal'},text='During the Damage Step, when an opponent attacks your face-up monster',real_only=True)
ACTS['covering_fire']=dict(fits={'t_normal'},target=True,tclause='target another face-up monster you control',text='the attacked monster gains ATK equal to that target’s ATK during the Damage Step',real_only=True)
CONDS['cross_counter_window']=dict(kind='event',fits={'t_normal'},text='During damage calculation, if an opponent’s monster attacks your face-up Defense Position monster with higher DEF than its ATK',real_only=True)
ACTS['cross_counter']=dict(fits={'t_normal'},text='double the battle damage your monster inflicts to your opponent during that battle, then destroy the attacking monster at the end of the Damage Step',real_only=True)
ACTS['tailor_of_the_fickle']=dict(fits={'s_quick'},text='target an Equip Card and an appropriate face-up monster other than its current target; equip that card to the new target, or send it to the GY if the new target is no longer legal',real_only=True)
CONDS['opp_effect_would_destroy_monster']=dict(kind='event',fits={'s_quick','t_counter'},text='When your opponent activates an effect that would destroy a monster on the field',real_only=True)
ACTS['negate_destroying_activation']=dict(fits={'s_quick'},text='negate the activation, and if you do, destroy that card',real_only=True)
ACTS['kunai_with_chain']=dict(fits={'t_normal'},text='change an attacking opponent monster to Defense Position, equip this card to a face-up monster you control for +500 ATK, or do both',damage_step=True,real_only=True)
COSTS['miracle_restoring_remove_counters']=dict(fits={'t_normal'},spends=True,text='remove 2 Spell Counters from cards on the field as cost',real_only=True)
ACTS['miracle_restoring']=dict(fits={'t_normal'},target=True,text='target and Special Summon 1 "Dark Magician" or "Buster Blader" from your GY',real_only=True)
ACTS['amazoness_scouts_protect']=dict(fits={'m_main'},text='your other face-up Amazoness monsters cannot be targeted by monster effects or destroyed by card effects this turn',real_only=True)
COSTS['rope_of_life_discard']=dict(fits={'t_normal'},spends=True,text='discard all other cards in your hand as cost (at least 1)',real_only=True)
CONDS['monster_battle_destroyed_to_gy']=dict(kind='event',fits={'t_normal'},text='When a monster(s) is destroyed by battle and sent to your GY',real_only=True)
ACTS['rope_of_life']=dict(fits={'t_normal'},target=True,text='target 1 of those monsters in your GY; Special Summon it, and if you do, it gains 800 ATK',real_only=True)
ACTS['breaker_place_counter']=dict(fits={'m_main'},text='place 1 Spell Counter on this card, up to 1',real_only=True)
AURAS['breaker_counter_atk']=dict(fits={'m_main'},text='This card gains 300 ATK for each Spell Counter on it, up to 1',real_only=True)
AURAS['silent_magician_lv8_spell_immune']=dict(fits={'m_main'},text='Unaffected by your opponent’s Spell effects',real_only=True)
AURAS['royal_magical_library_counters']=dict(fits={'m_main'},text='Place 1 Spell Counter on this card when a Spell Card is activated and resolves, up to 3',real_only=True)
AURAS['wave_motion_counter']=dict(fits={'s_cont'},text='Place a counter on this card during each of your Standby Phases; the count tracks its effect damage',real_only=True)
ACTS['wave_motion_damage']=dict(fits={'s_cont'},text='inflict 1000 damage to your opponent for each of this card’s counted Standby Phases',real_only=True)
CONDS['bark_damage_window']=dict(kind='event',fits={'t_normal'},text='During the Damage Step, if a face-up Fiend monster you control is battling',real_only=True)
ACTS['bark_of_dark_ruler']=dict(fits={'t_normal'},target=True,text='pay LP in multiples of 100, then target the opponent’s battling monster; it loses that much ATK and DEF this turn',real_only=True)
CONDS['spell_activate_negatable']=dict(kind='event',fits={'t_counter'},text='When a Spell Card is activated and its activation can be negated',real_only=True)
COSTS['cursed_seal_discard_spell']=dict(fits={'t_counter'},spends=True,text='discard 1 Spell Card as cost, unless a card effect changes your discard costs',real_only=True)
ACTS['cursed_seal_negate']=dict(fits={'t_counter'},text='negate the activation, destroy that Spell, and prevent activation of cards with that name for the rest of the Duel',real_only=True)
CONDS['opp_spell_activation_negatable']=dict(kind='event',fits={'t_counter'},text='When your opponent activates a Spell Card that can be negated',real_only=True)
ACTS['magic_drain']=dict(fits={'t_counter'},text='your opponent can discard a Spell to negate this card; if they do not, negate the activation and destroy that Spell',real_only=True)
CONDS['targeted_spelltrap_destroy_activation']=dict(kind='event',fits={'t_counter'},text='When a targeted Spell/Trap activation would destroy exactly 1 Spell/Trap on the field',real_only=True)
COSTS['bazoo_banish_gy']=dict(fits={'m_main'},spends=True,text='banish 1 to 3 monsters from your GY as cost',real_only=True)
ACTS['bazoo_gain_atk']=dict(fits={'m_main'},text='this card gains 300 ATK for each monster banished for this effect until the end of your opponent’s turn',real_only=True)
ACTS['relieve_monster']=dict(fits={'t_normal'},target=True,text='target 1 monster you control; return it to the hand, then Special Summon 1 Level 4 monster from your hand',real_only=True)
CONDS['injection_lily_battle_window']=dict(kind='event',fits={'m_main'},text='During damage calculation, if this card is attacking or being attacked, once per battle',real_only=True)
COSTS['injection_lily_pay']=dict(fits={'m_main'},spends=True,text='pay 2000 LP; this effect can only be used once during this battle',real_only=True)
ACTS['injection_lily_boost']=dict(fits={'m_main'},text='this card gains 3000 ATK during damage calculation',real_only=True)
ACTS['kunai_with_chain']=dict(fits={'t_normal'},text='change an attacking opponent monster to Defense Position, equip this card to a face-up monster you control for +500 ATK, or do both',damage_step=True,real_only=True)
ACTS['kuriboh_tokens']=dict(fits={'s_quick'},text='Special Summon as many Kuriboh Tokens (Fiend/DARK/Level 1/ATK 300/DEF 200) in Defense Position as possible; they cannot be Tributed for a Tribute Summon',real_only=True)
CONDS['opp_monster_effect']=dict(kind='event',fits={'m_main'},text='When your opponent activates a monster effect',real_only=True)
ACTS['negate_monster_effect']=dict(fits={'m_main'},text='negate the activation of that monster effect, and if you do, destroy that monster',real_only=True)
ACTS['king_tiger_destroy_summoned']=dict(fits={'m_main'},text='destroy the face-up Summoned monsters with 1400 or less ATK',real_only=True)
ACTS['recover_battle_target_atk']=dict(fits={'m_main'},text='gain LP equal to the original ATK of the monster this card destroyed by battle',real_only=True)
AURAS['chaos_command_negate_target']=dict(fits={'m_main'},text='Effect Monsters that target exactly this card have their effects negated',real_only=True)
AURAS['alligator_sword_direct']=dict(fits={'m_fusion'},text='This card can attack directly if all your opponent’s face-up monsters are EARTH, WATER, or FIRE',real_only=True)
ACTS['witch_search_lock']=dict(fits={'m_main'},text='add 1 monster with 1500 or less DEF from your Deck to your hand, then prevent activation of cards and effects with that name for the rest of this turn',real_only=True)
ACTS['time_wizard_coin']=dict(fits={'m_main'},text='toss a coin; Heads: destroy all monsters your opponent controls; Tails: destroy as many monsters you control as possible, then take damage equal to half their total ATK',real_only=True)
ACTS['pharaoh_treasure']=dict(fits={'t_normal'},text='shuffle this card face-up into your Deck; if you draw it, send it to the GY, then target another card in your GY and add it to your hand',real_only=True)
ACTS['coach_goblin']=dict(fits={'m_main'},text='return 1 Normal Monster from your hand to the bottom of your Deck, then draw 1 card',real_only=True)
ACTS['magical_scientist_fusion']=dict(fits={'m_main'},ss=True,text='Special Summon 1 Level 6 or lower Fusion Monster from your Extra Deck; it cannot attack directly and returns to the Extra Deck during the End Phase',real_only=True)
ACTS['magical_dimension']=dict(fits={'s_quick'},target=True,tclause='target 1 monster you control; Tribute it, then Special Summon 1 Spellcaster from your hand, then you can destroy 1 monster on the field',text='Special Summon 1 Spellcaster from your hand, then you can destroy 1 monster on the field',real_only=True)
CONDS['summon_event_cont_monster']=dict(kind='event',fits={'m_main'},text='When {summon_side} {methods} Summons {filter}',real_only=True)
CONDS['normal_or_special_summoned']=dict(kind='event',fits={'m_main'},text='When this card is Normal or Special Summoned',real_only=True)
CONDS['flipped_then_sent_gy']=dict(kind='event',fits={'m_main'},text='If this card, after being flipped face-up, is sent from the field to the GY',real_only=True)
CONDS['not_battle_phase']=dict(kind='state',fits={'m_main'},text='it is not the Battle Phase',real_only=True)
COSTS['banish_hand_random']=dict(fits={'m_main'},spends=True,text='banish {n} random cards from your hand face-up as cost',real_only=True)
ACTS['swap_control_with_opp_mon']=dict(fits={'m_main'},target=True,tclause='target 1 monster your opponent controls',text='switch control of that monster and this card',real_only=True)
ACTS['magical_merchant_excavate']=dict(fits={'m_main'},text='reveal cards from your Deck until you reach a Spell/Trap; add it to your hand and send the other revealed cards to the GY',real_only=True)
ACTS['move_summoned']=dict(fits=ACTIVATED,target=True,tclause='target {filter}',text='{verb} it',real_only=True)
ACTS['damage_attacker_atk']=dict(fits={'t_normal'},target=True,tclause='target the attacking monster',text='negate that attack, and if you do, inflict damage to your opponent equal to that monster\'s ATK',real_only=True)
ACTS['recover_attacker_atk']=dict(fits={'t_normal'},target=True,tclause='target the attacking monster',text='{attacker_recover_text}',real_only=True)
ACTS['end_battle_phase']=dict(fits={'t_normal','t_counter'},target=True,tclause='target the attacking monster',text='negate the attack, and if you do, end the Battle Phase',real_only=True)
ACTS['destroy_extreme']=dict(fits=ACTIVATED,text='destroy the 1 {filter} with the {extreme} {stat}',real_only=True)
ACTS['destroy_banish_summoned']=dict(fits=ACTIVATED,text='destroy {filter}, and if you do, banish it',real_only=True)
ACTS['destroy_draw_target']=dict(fits=ACTIVATED,target=True,tclause='target 1 card on the field',text='destroy that target, and if you do, draw 1 card',real_only=True)
ACTS['destroy_damage_both']=dict(fits=ACTIVATED,target=True,tclause='target {filter}',text='destroy it, and if you do, inflict {n} damage to both players',real_only=True)
ACTS['destroy_other_faceup']=dict(fits=ACTIVATED,text='destroy all other face-up monsters on the field',real_only=True)
ACTS['stat_mod_perm_target']=dict(fits=ACTIVATED,target=True,tclause='target {filter}',
                                  text='it gains {n} ATK and DEF while it remains face-up',real_only=True)
ACTS['destroy_payoff_target']=dict(fits=ACTIVATED,target=True,tclause='target {filter}',
                                   text='destroy it, then apply the selected LP effect',real_only=True)
ACTS['direct_attack_target']=dict(fits=ACTIVATED,target=True,tclause='target {filter}',
                                  text='it can attack directly this turn',real_only=True)
ACTS['ss_filtered_proc']=dict(fits=ACTIVATED,ss=True,
                              text='Special Summon {filter} from your {zone} using its listed procedure',real_only=True)
ACTS['hand_wipe_draw_same']=dict(fits=ACTIVATED,text='both players discard their hands, then draw the same number of cards',real_only=True)
ACTS['destroy_banish_duplicates']=dict(fits=ACTIVATED,target=True,tclause='target {filter}',
                                      text='destroy and banish it; if it is the matching type, banish copies from both Decks',real_only=True)
ACTS['shuffle_hand_draw_same']=dict(fits=ACTIVATED,text='shuffle cards from your hand into the Deck, then draw the same number',real_only=True)
ACTS['destroy_target_mill_opp']=dict(fits=ACTIVATED,target=True,tclause='target {filter}',
                                    text='destroy it, then send the top {n} cards of your opponent\'s Deck to the GY',real_only=True)
ACTS['reveal_destroy_spell']=dict(fits=ACTIVATED,target=True,
                                  text='reveal it if Set, then destroy it if it is a Spell',real_only=True)
ACTS['destroy_def_below_tribute']=dict(fits=ACTIVATED,text='destroy all face-up monsters with DEF less than or equal to the ATK of the monster Tributed for this card',real_only=True)
AURAS['attr_atk_mod_all']=dict(fits=MONSTER_SLOTS,text='All {attr} monsters on the field {attr_change_verb} {n} ATK.',real_only=True)
AURAS['stat_mod_aura']=dict(fits={'s_field'},text='All {filter} {change_verb} {n} {stat}.',real_only=True)
AURAS['set_defense_level4']=dict(fits={'s_cont'},text='All face-up Level 4 or higher monsters are changed to Defense Position.',real_only=True)
AURAS['stat_mod_aura_both']=dict(fits={'s_cont'},text='All {filter} {change_verb} {n} {stat}.',real_only=True)
AURAS['force_defense_race']=dict(fits={'t_cont'},text='All {race} monsters are changed to Defense Position and cannot change their battle positions.',real_only=True)
AURAS['hand_limit_opp']=dict(fits={'t_cont'},text="Your opponent's hand size limit becomes 5.",real_only=True)
AURAS['no_attack_race_opp']=dict(fits={'s_cont','t_cont'},text='Your opponent cannot attack with {race} monsters.',real_only=True)
AURAS['avoid_battle_damage_fairy']=dict(fits={'s_field'},text='The controller of a Fairy monster involved in battle takes no battle damage from that battle.',real_only=True)
AURAS['self_atk_per_race']=dict(fits=MONSTER_SLOTS,text='This card gains {n} ATK for each other {race} monster you control.',real_only=True)
AURAS['self_atk_per_gy_monsters']=dict(fits=MONSTER_SLOTS,text='This card gains 300 ATK for each monster in your GY',real_only=True)
AURAS['red_eyes_darkness_dragon_atk']=dict(fits={'m_main'},text='This card gains 300 ATK for each Dragon monster in your GY.',real_only=True)
CONDS['zolga_tribute_release']=dict(kind='event',fits={'m_main'},text='When this card is Tributed for a Tribute Summon',real_only=True)
ACTS['zolga_recover']=dict(fits={'m_main'},text='the owner of this card gains 2000 LP',real_only=True)
ACTS['look_reorder_top5']=dict(fits={'m_main','t_normal','s_normal','s_quick'},text='look at the top {n} cards of your Deck, then place them on the top in any order',n=R(1,5),real_only=True)
ACTS['ss_self_hand']=dict(fits={'m_main'},text='Special Summon this card from your hand',real_only=True)
AURAS['cannot_be_tributed']=dict(fits={'m_main'},text='This card cannot be Tributed',real_only=True)
ACTS['self_change_defense']=dict(fits={'m_main'},text='change this card to Defense Position',real_only=True)
ACTS['ss_level4_noattack']=dict(fits={'m_main'},text='Special Summon 1 Level 4 monster from your Deck; it cannot attack this turn',real_only=True)
AURAS['self_atk_per_field_race']=dict(fits={'m_main'},text='This card gains {n} ATK for each {race} monster on the field',n=R(100,500,100),real_only=True)
AURAS['toon_direct_summon_lock']=dict(fits={'m_main'},text='Cannot attack the turn Summoned; while you control Toon World and your opponent controls no Toon monsters, this card can attack directly',real_only=True)
AURAS['goblin_king_stats']=dict(fits={'m_main'},text='This card’s ATK and DEF become the number of other face-up Fiend monsters on the field x 1000',real_only=True)
AURAS['goblin_king_protection']=dict(fits={'m_main'},text='While you control another face-up Fiend monster, your opponent cannot target this card for attacks',real_only=True)
AURAS['atk_per_race_count']=dict(fits={'s_cont'},text='All face-up {race} monsters you control gain {n} ATK for each face-up monster of either listed Type you control',real_only=True)
AURAS['burn_on_recover']=dict(fits={'m_main'},text='When you gain LP, inflict {n} damage to your opponent',n=R(100,1000,100),real_only=True)
AURAS['self_cannot_be_attacked_if_race']=dict(fits={'m_main'},text='This card cannot be targeted for attacks while you control another face-up {race} monster',real_only=True)
ACTS['ss_banish_attr_gy']=dict(fits=MONSTER_SLOTS,attr=True,text='You can Special Summon this card from your hand by banishing 1 {attr} monster from your GY',real_only=True)
ACTS['ss_banish_attr_gy_or_field']=dict(fits=MONSTER_SLOTS,attr=True,text='You can Special Summon this card from your hand by banishing 1 {attr} monster from your GY or field',real_only=True)
ACTS['ss_tribute_named_hand']=dict(fits={'m_main'},text='Special Summon this card from your hand by Tributing 1 {names}',real_only=True)
ACTS['manticore_grave_flag']=dict(fits={'m_main'},text='If this card is sent to the GY, remember it until the End Phase',real_only=True)
CONDS['manticore_end_phase']=dict(kind='event',fits={'m_main'},text='During the End Phase of the turn this card was sent to the GY',real_only=True)
COSTS['manticore_send_cost']=dict(fits={'m_main'},spends=True,text='send 1 Beast, Beast-Warrior, or Winged Beast from your hand or field to the GY as cost',real_only=True)
ACTS['manticore_revive']=dict(fits={'m_main'},text='Special Summon this card from your GY',real_only=True)
CONDS['metalmorph_damage_step']=dict(kind='state',fits={'t_normal'},text='a monster’s ATK or DEF is changing during the Damage Step',real_only=True)
ACTS['metalmorph_equip']=dict(fits={'t_normal'},target=True,tclause='target 1 face-up monster on the field',text='equip this card to it; it gains 300 ATK/DEF, and gains ATK equal to half its attack target’s ATK while attacking',damage_step=True,real_only=True)
ACTS['blast_with_chain_equip']=dict(fits={'t_normal'},target=True,tclause='target 1 face-up monster you control',text='equip this card to it; it gains 500 ATK',damage_step=True,real_only=True)
CONDS['blast_with_chain_destroyed']=dict(kind='event',fits={'t_normal'},text='When this card is destroyed by a card effect while equipped',real_only=True)
ACTS['blast_with_chain_destroy']=dict(fits={'t_normal'},target=True,tclause='target 1 card on the field',text='destroy that target',real_only=True)
CONDS['draw_effect_player_target']=dict(kind='event',fits={'t_normal'},text='When an effect that targets a player to draw cards is activated',real_only=True)
ACTS['muko_replace_draw']=dict(fits={'t_normal'},text='replace that draw with sending the same number of cards from that player’s Deck to the GY',real_only=True)
CONDS['attack_declared']=dict(kind='event',fits={'t_normal'},text='When either player declares an attack',real_only=True)
ACTS['attack_guidance_destroy']=dict(fits={'t_normal'},text='destroy the attacking monster',real_only=True)
ACTS['attack_guidance_redirect']=dict(fits={'t_normal'},target=True,tclause='target 1 other monster on the field',text='make the attacker attack that target and perform damage calculation',real_only=True)
AURAS['self_atk_battle_phase']=dict(fits=MONSTER_SLOTS,text='During your Battle Phase, this card gains {n} ATK',n=R(100,1000,100),real_only=True)
AURAS['black_tyranno_direct_attack']=dict(fits={'m_main'},text='This card can attack directly while your opponent controls no Spell/Trap Cards and no Attack Position monsters.',real_only=True)
AURAS['shadowslayer_direct_attack']=dict(fits={'m_main'},text='This card can attack directly while your opponent controls no Attack Position monsters.',real_only=True)
AURAS['emissary_of_oasis']=dict(fits={'m_main'},text='If you control a face-up Level 3 or lower Normal Monster, this card cannot be targeted for attacks. Battle Damage from battles involving a Level 3 or lower Normal Monster is prevented for its controller.',real_only=True)
AURAS['amazoness_tiger']=dict(fits={'m_main'},text='You can only control 1 of this card. It gains 400 ATK for each Amazoness monster you control; your opponent cannot attack other face-up Amazoness monsters.',real_only=True)
AURAS['arsenal_bug_stats']=dict(fits={'m_main'},text='If you control no other face-up Insect monsters, this card’s ATK and DEF become 1000.',real_only=True)
AURAS['protect_other_race_from_attack']=dict(fits={'m_main'},race=True,text='Your other {race} monsters cannot be targeted for attacks.',real_only=True)
AURAS['self_stats_per_banished']=dict(fits={'m_main'},text='This card’s ATK and DEF become the number of your banished cards x {n}.',n=R(100,1000,100),real_only=True)
AURAS['maiden_of_aqua_environment']=dict(fits={'m_main'},text='While this face-up card is on the field, the Duel environment is treated as Umi.',real_only=True)
ACTS['damage_battle_target_level']=dict(fits={'m_main'},text='inflict damage to your opponent equal to the Level of the monster this card destroyed by battle x 500',real_only=True)
ACTS['dark_sleep_lock_target']=dict(fits={'m_main'},target=True,tclause='target 1 monster your opponent controls',text='it cannot attack while this card remains face-up',real_only=True)
AURAS['fusilier_no_tribute']=dict(fits={'m_main'},text='You can Normal Summon/Set this card without Tributing, but its original ATK and DEF become halved.',real_only=True)
ACTS['reveal_opp_set_all_spell']=dict(fits={'s_normal'},text='reveal all Set cards your opponent controls',real_only=True)
ACTS['otohime_change_position']=dict(fits={'m_main','m_fusion','m_ritual','t_normal'},target=True,tclause='target 1 face-up monster your opponent controls',text='change its battle position',damage_step=True,real_only=True)
ACTS['destroy_all_st']=dict(fits=MONSTER_SLOTS,text='destroy all Spell/Trap Cards on the field',real_only=True)
ACTS['destroy_jars_turn_dragons_attack']=dict(fits={'m_main'},text='destroy all face-up listed cards in the Spell & Trap Zone; if any are destroyed, change all face-up Defense Position Dragons to Attack Position',real_only=True)
ACTS['shuffle_opp_hand_draw_two']=dict(fits={'t_normal'},text='your opponent shuffles their entire hand into the Deck, then draws 2 cards',player_target=True,real_only=True)
ACTS['ss_up_to_n_filtered']=dict(fits=ACTIVATED,text='Special Summon up to {n} {filter} from your {zone}{position}',race=True,attr=True,real_only=True)
ACTS['choose_attack_target']=dict(fits={'t_normal'},text='choose a legal target for the opponent\'s attack',real_only=True)
ACTS['paths_of_destiny']=dict(fits={'t_normal'},text='both players toss a coin; each gains 2000 LP on Heads or takes 2000 damage on Tails',real_only=True)
ACTS['legacy_yata_draw']=dict(fits={'t_normal'},text='draw 1 card, or draw 2 if your opponent controls a face-up Spirit monster',player_target=True,real_only=True)
ACTS['destroy_two_own_one_opp']=dict(fits={'t_normal'},target=True,tclause='target 2 monsters you control and 1 monster your opponent controls',text='destroy all 3 targets',real_only=True)
ACTS['good_goblin_housekeeping']=dict(fits={'t_normal'},text='draw 1 card plus 1 for each copy of this card in your GY, then place 1 card from your hand on the bottom of your Deck',player_target=True,real_only=True)
ACTS['turn_event_opp_monsters_faceup_attack']=dict(fits={'t_normal'},text='change the affected face-down monsters to face-up Attack Position without activating their Flip effects',real_only=True)
ACTS['dragons_gunfire']=dict(fits={'s_normal'},text='inflict 800 damage to your opponent, or destroy 1 face-up monster with 800 or less DEF',real_only=True)
ACTS['cost_down']=dict(fits={'s_normal'},text='reduce the Levels of monsters in your hand by 2 until the End Phase',real_only=True)
ACTS['beckoning_light']=dict(fits={'t_normal'},text='discard your hand, then add that many LIGHT monsters from your GY to your hand',real_only=True)
ACTS['delinquent_duo']=dict(fits={'s_normal'},text='your opponent discards 1 random card, then discards 1 card of your choice if they still have one',player_target=True,real_only=True)
ACTS['sebek_recover_damage']=dict(fits={'s_quick'},text='gain LP equal to the Battle Damage your monster inflicted by a direct attack',player_target=True,real_only=True)
ACTS['wild_nature_release']=dict(fits={'s_normal'},target=True,tclause='target 1 Beast or Beast-Warrior monster with nonzero DEF',text='it gains ATK equal to its current DEF until the End Phase, then destroy it',real_only=True)
ACTS['cold_wave']=dict(fits={'s_normal'},text='neither player can activate or Set Spell/Trap Cards until your next turn',real_only=True)
ACTS['limiter_removal']=dict(fits={'s_quick'},text='double your face-up Machine monsters\' ATK until the End Phase, then destroy them',damage_step=True,real_only=True)
ACTS['machine_duplication']=dict(fits={'s_normal'},target=True,tclause='target 1 face-up Machine you control with 500 or less ATK',text='Special Summon up to 2 monsters with the same name from your Deck',real_only=True)
COSTS['send_st_cost_max5']=dict(fits={'s_quick'},spends=True,text='send 1 to 5 other Spell/Trap Cards you control to the GY as cost',real_only=True)
ACTS['recover_1000_per_st_cost']=dict(fits={'s_quick'},text='gain 1000 LP for each Spell/Trap sent as cost',player_target=True,real_only=True)
ACTS['big_march_beast_atk']=dict(fits={'s_quick'},text='Your face-up Beast monsters gain 200 ATK for each face-up Beast monster you control until the End Phase',damage_step=True,real_only=True)
ACTS['declare_race_destroy']=dict(fits={'m_main'},text='discard 1 card; declare a monster Type and destroy all face-up monsters of that Type',real_only=True)
ACTS['attack_and_receive']=dict(fits={'t_normal'},text='inflict 700 damage to your opponent, plus 300 for each copy of this card in your GY',player_target=True,real_only=True)
ACTS['negate_effect_only']=dict(fits={'t_normal'},text='negate that effect',real_only=True)
ACTS['negate_destroy_group']=dict(fits={'t_normal'},text='negate that activation, and if you do, destroy all opposing {kind} cards',real_only=True)
ACTS['dust_tornado']=dict(fits={'t_normal'},target=True,tclause='target 1 Spell/Trap your opponent controls',text='destroy it, then you can Set 1 Spell/Trap from your hand',real_only=True)
ACTS['energy_drain']=dict(fits={'t_normal'},target=True,tclause='target 1 face-up monster you control',text='it gains 200 ATK and DEF for each card in your opponent\'s hand until the End Phase',damage_step=True,real_only=True)
ACTS['disable_continuous_type_until_end']=dict(fits={'t_normal'},text='negate the effects of all listed Spell/Trap Cards until the End Phase',real_only=True)
COSTS['tribute_level_for_fusion']=dict(fits={'s_normal'},spends=True,text='Tribute 1 monster; its Level determines the Fusion Monster you can Special Summon from your Extra Deck',real_only=True)
ACTS['ss_fusion_same_level']=dict(fits={'s_normal'},text='Special Summon 1 Fusion Monster from your Extra Deck with the same Level as the Tributed monster',real_only=True)
ACTS['declare_race_hunter']=dict(fits={'m_main'},text='declare 1 monster Type; this card gains 1000 ATK when battling that Type during Damage Calculation',real_only=True)
COSTS['dark_curtain_cost']=dict(fits={'s_normal'},spends=True,text='Pay half your LP; you cannot Summon or Special Summon other monsters for the rest of this turn',real_only=True)
ACTS['summon_dark_magician']=dict(fits={'s_normal'},text='Special Summon 1 "Dark Magician" from your Deck',real_only=True)
AURAS['umi_fisherman']=dict(fits={'m_main'},text='While Umi is the active Field Spell, this card is unaffected by Spell effects and cannot be targeted for attacks',real_only=True)
ACTS['illusionist_fusion']=dict(fits={'m_main'},text='Tribute 1 other monster; Special Summon 1 Fusion Monster from your Extra Deck, then destroy it during the End Phase',real_only=True)
ACTS['dice_jar']=dict(fits={'m_main'},text='Both players roll a die; the lower result takes 500 damage per point, but if the winner rolls 6 the loser takes 6000, and ties are rerolled',real_only=True)
CONDS['bounder_attacked_faceup']=dict(kind='event',fits={'m_main'},text='When this face-up Attack Position monster is attacked',real_only=True)
ACTS['reflect_attacker_atk']=dict(fits={'m_main'},text='inflict damage to your opponent equal to the attacking monster’s ATK; if damage is inflicted, destroy this card after damage calculation',real_only=True)
CONDS['bounder_damaged_battle']=dict(kind='event',fits={'m_main'},text='If this card inflicted damage during the battle',real_only=True)
ACTS['destroy_self_battle']=dict(fits={'m_main'},text='destroy this card',real_only=True)
ACTS['thousand_energy']=dict(fits={'s_normal'},text='Increase the original ATK and DEF of your face-up Level {level} Normal Monsters by {n} until the End Phase, then destroy all your face-up Level {level} Normal Monsters',real_only=True)
ACTS['wingbeat_dragon']=dict(fits={'s_normal'},text='Return 1 face-up Level 5 or higher Dragon you control to the hand, then destroy all Spell/Trap Cards on the field if it returns',real_only=True)
COSTS['stray_lambs_lock']=dict(fits={'s_normal','s_quick'},spends=True,text='You cannot Normal Summon, Flip Summon, or Special Summon other monsters this turn (but you can Set).',real_only=True)
ACTS['stray_lambs_tokens']=dict(fits={'s_normal'},text='Special Summon 2 Lamb Tokens in face-up Defense Position',real_only=True)
CONDS['necrovalley_environment']=dict(kind='state',fits={'s_normal'},text='if Necrovalley is the active Field Spell',real_only=True)
ACTS['royal_tribute']=dict(fits={'s_normal'},text='both players discard all Monster Cards in their hands',real_only=True)
ACTS['ss_dark_scorpions_unique']=dict(fits={'s_normal'},text='Special Summon as many Dark Scorpion monsters with different names from your hand as possible',real_only=True)
CONDS['attacks_facedown_pre_damage']=dict(kind='event',fits={'m_main'},text='Before damage calculation, if this card attacks a face-down Defense Position monster',real_only=True)
ACTS['set_self_atk_2400_damage']=dict(fits={'m_main'},text='this card’s ATK becomes 2400 during damage calculation',real_only=True)
ACTS['set_target_faceup_opp']=dict(fits={'m_main'},target=True,tclause='target 1 face-up monster your opponent controls that can be turned face-down',text='change it to face-down Defense Position',real_only=True)
CONDS['banished_faceup']=dict(kind='event',fits={'m_main'},text='When this card is banished face-up',real_only=True)
ACTS['return_self_end_phase']=dict(fits={'m_main'},text='During the End Phase, Special Summon this banished card in Attack Position',real_only=True)
AURAS['atk_bonus_attacking_wind']=dict(fits={'m_main'},text='During the Damage Step, this card gains 1000 ATK while attacking a face-up WIND monster',real_only=True)
CONDS['standby_empty_hand']=dict(kind='event',fits={'m_main'},text='During your Standby Phase, if you have no cards in your hand',real_only=True)
ACTS['return_self_gy_hand']=dict(fits={'m_main'},text='add this card from your GY to your hand if your hand is still empty',real_only=True)
AURAS['battle_indestructible_nonlight_dark']=dict(fits={'m_fusion'},text='This card cannot be destroyed by battle with DARK, EARTH, WATER, FIRE, or WIND monsters.',real_only=True)
AURAS['self_avoid_battle_damage']=dict(fits=MONSTER_SLOTS,text='You take no Battle Damage from battles involving this card.',real_only=True)
AURAS['dragons_untargetable']=dict(fits={'m_fusion'},text='Dragon monsters on the field cannot be targeted by card effects.',real_only=True)
ACTS['ss_mokey_any_gy']=dict(fits={'m_fusion'},text='Special Summon as many "Mokey Mokey" as possible from your GY',real_only=True)
ACTS['damage_per_sel']=dict(fits=ACTIVATED,text='inflict {n} damage to your opponent for each {filter}',real_only=True)
ACTS['recover_per_sel']=dict(fits=ACTIVATED,text='gain {n} LP for each {filter}',real_only=True)
ACTS['stat_mod_all']=dict(fits=ACTIVATED,text='{change_verb} the {stats} of {filter} by {n}',real_only=True)
ACTS['skip_phase']=dict(fits=ACTIVATED,text='{skip_phrase}',real_only=True)
ACTS['direct_attack_turn']=dict(fits=ACTIVATED,text='your opponent\'s monsters can attack directly this turn',real_only=True)
ACTS['no_damage_turn']=dict(fits=ACTIVATED,text='{damage_turn_text}',real_only=True)
ACTS['fire_darts']=dict(fits={'t_normal'},text='roll a six-sided die 3 times, and inflict damage equal to the total result x 100',real_only=True)
CONDS['hand_count']=dict(kind='state',fits={'t_normal','s_quick'},text='{hand_condition_text}',real_only=True)
CONDS['lp_max']=dict(kind='state',fits={'t_normal'},text='your LP are {n} or less',real_only=True)
ACTS['penalty_game_choice']=dict(fits={'t_normal'},text='choose to skip your opponent\'s next Draw Phase or prevent Spell/Trap activations for this turn',real_only=True)
ACTS['ring_of_destruction']=dict(fits={'t_normal'},target=True,tclause='target a face-up monster your opponent controls with ATK no higher than their LP',text='destroy it, then both players take damage equal to its ATK',real_only=True)
ACTS['castle_dark_illusions_growth']=dict(fits={'m_main'},text='Zombies currently on the field gain 200 ATK/DEF, then gain 200 more during each of your next 4 Standby Phases',real_only=True)
ACTS['goddess_of_whim_coin']=dict(fits={'m_main'},text='call a coin toss; if Heads, double this card’s ATK this turn, otherwise halve its ATK',real_only=True)
CONDS['not_damage_calculated']=dict(kind='state',fits={'t_normal'},text='',real_only=True)
CONDS['opp_before_main2']=dict(kind='state',fits={'t_normal'},text='',real_only=True)
# Group 1 (selector families). Their parameters name the cards they talk about: kind, stype, race, attr, level_max,
# level_min, atk_max, faceup, pos, token, normal, frame, codes, zone, side and, for moves, to (destroy, hand, grave,
# banish, deck, decktop, facedown, defense, attack). The filter text is what the card prints.
CONDS['control_sel']=dict(kind='state',fits=ALL,text='you control {filter}',real_only=True)
CONDS['opp_lp_above']=dict(kind='state',fits=ALL,text="your opponent's LP are higher than {n}",real_only=True)
COSTS['lp_half']=dict(fits=ACTIVATED,spends=True,text='pay half your LP',real_only=True)
COSTS['tribute_sel']=dict(fits=ACTIVATED,spends=True,text='Tribute {n} {filter}',real_only=True)
ACTS['damage_half_tribute_atk']=dict(fits={'m_main'},text='inflict damage to your opponent equal to half the Tributed monster’s ATK',real_only=True)
COSTS['send_self_mzone']=dict(fits={'m_main'},spends=True,leaves=True,field=True,
                              text='send this monster from your field to the GY',real_only=True)
COSTS['discard_self_hand']=dict(fits={'m_main'},spends=True,leaves=True,text='discard this card from your hand',real_only=True)
COSTS['banish_top_deck']=dict(fits={'m_main'},spends=True,text='banish the top {n} cards of your Deck face-up',real_only=True)
COSTS['send_equipped']=dict(fits={'m_main'},spends=True,text='send 1 Equip Card equipped to this card to the GY as cost',real_only=True)
COSTS['tribute_recover_stat']=dict(fits={'t_normal','s_quick'},spends=True,text='Tribute 1 monster you control to gain LP based on its ATK or DEF',real_only=True)
ACTS['move_all']=dict(fits=ACTIVATED,text='{verb} all {filter}',real_only=True)
ACTS['move_target']=dict(fits=ACTIVATED,tclause='target {n} {filter}',text='{verb} it',target=True,real_only=True)
ACTS['move_target_n_if_available']=dict(fits=ACTIVATED,tclause='target {n} {filter} if available',text='{verb} the selected cards',target=True,real_only=True)
ACTS['search_sel']=dict(fits=ACTIVATED,text='add {n} {filter} from your {zone} to your hand',real_only=True)
ACTS['search_ritual']=dict(fits=ACTIVATED,text='add 1 Ritual Monster or Ritual Spell from your Deck to your hand',real_only=True)
ACTS['recover_both']=dict(fits=ACTIVATED,text='both players gain {n} LP',real_only=True)
LIMITS['equip_only']=dict(fits={'s_equip'},text='Equip only to {filter}.',real_only=True)
LIMITS['unnegatable']=dict(fits={'s_normal'},text='This card\'s activation and effect cannot be negated.',real_only=True)
AURAS['equip_atk_down']=dict(fits={'s_equip'},text='The equipped monster loses {n} ATK',real_only=True)
AURAS['equip_def_down']=dict(fits={'s_equip'},text='The equipped monster loses {n} DEF',real_only=True)
AURAS['equip_indes_effect']=dict(fits={'s_equip'},text='The equipped monster cannot be destroyed by card effects',real_only=True)
AURAS['no_attack_level']=dict(fits={'t_cont'},text='Level {l} or higher monsters cannot attack',l=R(4,8),real_only=True)
AURAS['no_attack_atk_min']=dict(fits={'m_main','s_cont'},text='Monsters with {n} or more ATK cannot attack',n=R(1000,3000,100),real_only=True)
AURAS['destroy_lower_atk_attacker']=dict(fits=MONSTER_SLOTS,text='If this Defense Position card is attacked by a monster with lower ATK, destroy that attacker at the end of the Damage Step.',real_only=True)
AURAS['destroy_lower_atk_attacker_facedown']=dict(fits={'m_main'},text='If this face-down Defense Position card is attacked by a monster with lower ATK, destroy that attacker at the end of the Damage Step.',real_only=True)
AURAS['self_atk_per_equip']=dict(fits={'m_main'},text='This card gains 500 ATK for each Equip Card equipped to it.',real_only=True)
AURAS['opponent_attacker_base_atk_200']=dict(fits={'m_main'},text="During your opponent's turn, if this card is attacked, the attacking monster's original ATK becomes 200 during the Damage Step.",real_only=True)
AURAS['negate_faceup_monster_effects']=dict(fits={'t_cont'},text='Negate the effects of all face-up monsters while they are face-up on the field.',real_only=True)
AURAS['same_name_field_stat']=dict(fits={'t_cont'},text='Face-up monsters with another face-up monster of the same name gain 500 ATK and DEF.',real_only=True)
AURAS['skull_invitation_damage']=dict(fits={'t_cont'},text='Each time a card is sent to the GY, its owner takes 300 damage.',real_only=True)
AURAS['return_battle_damage_monster']=dict(fits={'t_cont'},text='If a monster inflicts battle damage to a player, return that monster to the hand.',real_only=True)
AURAS['curse_of_darkness_spell_damage']=dict(fits={'t_cont'},text='After a Spell Card resolves, its activator takes 1000 damage.',real_only=True)
AURAS['no_bp_if_no_spells_gy']=dict(fits={'s_cont'},text='While you have no Spell Cards in your GY, neither player can conduct a Battle Phase.',real_only=True)
AURAS['toll_attack_cost']=dict(fits={'s_cont'},text='Each player pays 500 LP to declare an attack.',real_only=True)
AURAS['chain_energy_cost']=dict(fits={'s_cont'},text='Each player pays 500 LP for each card they Normal Summon, Special Summon, Set, or activate from their hand.',real_only=True)
ACTS['return_high_level_draw']=dict(fits={'s_cont'},text='Once per turn, return a Level 7 or higher monster from your hand to your Deck, shuffle, then draw 1 card.',real_only=True)
ACTS['shuffle_either_deck']=dict(fits={'s_cont'},text='Once per turn, shuffle either player’s Deck.',real_only=True)
AURAS['senri_eye']=dict(fits={'s_cont'},text='During your Standby Phase, you can pay 100 LP to look at the top card of your opponent’s Deck.',real_only=True)
AURAS['continuous_destroy_weaker_attacker']=dict(fits={'s_cont'},text='When an opponent attacks your Defense Position monster with lower ATK than its DEF, destroy the attacking monster at the end of the Damage Step.',real_only=True)
AURAS['two_man_cell_battle']=dict(fits={'s_cont'},text='During each player’s End Phase, that player can Special Summon a Level 4 Normal Monster from their hand.',real_only=True)
AURAS['inspection']=dict(fits={'s_cont'},text='During your opponent’s Standby Phase, you can pay 500 LP to look at a random card in their hand.',real_only=True)
AURAS['recycle_nonmonster_gy']=dict(fits={'s_cont'},text='During your Standby Phase, you can pay 300 LP to target a non-Monster Card in your GY and place it on the bottom of your Deck.',real_only=True)
AURAS['dust_barrier']=dict(fits={'s_cont'},text='Face-up Normal Monsters are unaffected by your opponent’s Spell Cards. Destroy this card during your second Standby Phase after activation.',real_only=True)
AURAS['swords_concealing']=dict(fits={'s_cont'},text='When activated, change all opponent monsters to face-down Defense Position. While this card is face-up, they cannot change battle positions. Destroy it during your second Standby Phase after activation.',real_only=True)
AURAS['swords_revealing']=dict(fits={'s_normal'},text='When activated, change all face-down monsters your opponent controls to face-up Attack Position. While this card is face-up, your opponent’s monsters cannot attack. Destroy it during your opponent’s 3rd End Phase after activation.',real_only=True)
AURAS['dangerous_machine_type6']=dict(fits={'s_cont'},text='During each of your Standby Phases, roll a die and apply the result: discard, draw, destroy an opponent monster, or destroy this card.',real_only=True)
AURAS['weapon_change']=dict(fits={'s_cont'},text='During your Standby Phase, pay 700 LP to target a face-up Warrior or Machine you control; switch its current ATK/DEF until the end of your opponent’s next turn.',real_only=True)
AURAS['ectoplasmer']=dict(fits={'s_cont'},text='During each player’s End Phase, that player Tributes a face-up monster and inflicts half its original ATK as damage to the opponent.',real_only=True)
AURAS['spiral_spear_strike']=dict(fits={'s_cont'},text='Gaia the Fierce Knight, Swift Gaia the Fierce Knight, and Gaia the Dragon Champion inflict piercing damage; if Gaia the Dragon Champion does so, draw 2 then discard 1.',real_only=True)
AURAS['double_battle_damage_when_attacked']=dict(fits={'m_main'},text='Double any battle damage your opponent takes when they attack this card.',real_only=True)
AURAS['nuvia_the_wicked']=dict(fits={'m_main'},text='Destroy this card when it is Normal Summoned. It loses 200 ATK for each monster your opponent controls.',real_only=True)
AURAS['minor_goblin_official']=dict(fits={'t_cont'},text='Activate only while your opponent has 3000 LP or less. Inflict 500 damage to them during each of their Standby Phases.',real_only=True)
AURAS['avoid_battle_damage_with_monster']=dict(fits={'t_cont'},text='While you control a monster, you take no Battle Damage.',real_only=True)
AURAS['pierce_dragons']=dict(fits={'t_cont'},text='Your Dragon monsters inflict piercing Battle Damage when they attack Defense Position monsters.',real_only=True)
AURAS['mask_of_restrict']=dict(fits={'t_cont'},text='Neither player can Tribute cards.',real_only=True)
AURAS['solemn_wishes']=dict(fits={'t_cont'},text='When you draw a card, gain 500 LP.',real_only=True)
AURAS['coffin_seller']=dict(fits={'t_cont'},text='When a monster is sent to your opponent\'s GY, inflict 300 damage to your opponent.',real_only=True)
AURAS['remove_brainwashing']=dict(fits={'t_cont'},text='Return all monsters to their owners.',real_only=True)
AURAS['final_attack_orders']=dict(fits={'t_cont'},text='Change all monsters to Attack Position and prevent their battle positions from changing.',real_only=True)
AURAS['emperor_holiday']=dict(fits={'t_cont'},text='Negate other Equip Card effects on the field.',real_only=True)
AURAS['royal_command']=dict(fits={'t_cont'},text='Negate the activations of Flip monster effects.',real_only=True)
AURAS['chain_burst']=dict(fits={'t_cont'},text='After a Trap Card resolves, its activator takes 1000 damage.',real_only=True)
AURAS['equip_lock_opp_position']=dict(fits={'s_equip'},text='Monsters your opponent controls cannot change their battle positions.',real_only=True)
AURAS['demotion']=dict(fits={'s_equip'},text='The equipped monster loses 2 Levels.',real_only=True)
AURAS['mage_power']=dict(fits={'s_equip'},text='The equipped monster gains 500 ATK and DEF for each Spell/Trap you control.',real_only=True)
AURAS['stim_pack']=dict(fits={'s_equip'},text='The equipped monster gains {n} ATK, then loses {d} ATK during each of your Standby Phases.',real_only=True)
AURAS['lightning_blade']=dict(fits={'s_equip'},text='All WATER monsters lose 500 ATK.',real_only=True)
AURAS['united_we_stand']=dict(fits={'s_equip'},text='The equipped monster gains 800 ATK/DEF for each face-up monster you control.',real_only=True)
AURAS['rod_of_minds_eye']=dict(fits={'s_equip'},text='Battle Damage the equipped monster inflicts to your opponent becomes 1000.',real_only=True)
AURAS['mask_of_brutality_upkeep']=dict(fits={'s_equip'},text='During each of your Standby Phases, pay 1000 LP or destroy this card.',real_only=True)
AURAS['mask_of_accursed']=dict(fits={'s_equip'},text='The equipped monster cannot attack. During each of your Standby Phases, inflict 500 damage to its controller.',real_only=True)
AURAS['ballista_rampart_smashing']=dict(fits={'s_equip'},text='If the equipped monster attacks a face-down Defense Position monster, it gains 1500 ATK during damage calculation.',real_only=True)
AURAS['royal_decree']=dict(fits={'t_cont'},text='Negate all other Trap effects on the field, including Trap Monsters.',real_only=True)
AURAS['scroll_bewitchment']=dict(fits={'s_equip'},text='Choose an Attribute; the equipped monster becomes that Attribute.',real_only=True)
AURAS['dna_surgery']=dict(fits={'t_cont'},text='Declare a Type; all face-up monsters become that Type.',real_only=True)
AURAS['dna_transplant']=dict(fits={'t_cont'},text='Declare an Attribute; all face-up monsters become that Attribute.',real_only=True)
AURAS['germ_infection']=dict(fits={'s_equip'},text='Equip only to a non-Machine monster. Its ATK decreases by 300 during each of your Standby Phases.',real_only=True)
AURAS['des_counterblow']=dict(fits={'t_cont'},text='Destroy a monster that inflicts Battle Damage by a direct attack.',real_only=True)
AURAS['astral_barrier']=dict(fits={'t_cont'},text='When your opponent attacks your monster, make that attack direct.',real_only=True)
ACTS['mind_control']=dict(fits=ACTIVATED,target=True,tclause='target 1 monster your opponent controls',text='take control of it until the End Phase; it cannot attack or be Tributed',real_only=True)
AURAS['goblin_of_greed']=dict(fits={'m_main'},text='Neither player can discard cards from their hand.',real_only=True)
AURAS['white_hole']=dict(fits={'t_normal'},text='When your opponent activates Dark Hole, your monsters cannot be destroyed by its effect.',real_only=True)
AURAS['xing_zhen_hu']=dict(fits={'t_cont'},text='Target 2 Set Spell/Trap Cards; they cannot be activated while this card remains face-up.',real_only=True)
AURAS['spellbinding_circle']=dict(fits={'t_cont'},text='Target an opponent\'s monster; it cannot attack or change position, and when it is destroyed, destroy this card.',real_only=True)
ACTS['shallow_grave']=dict(fits=ACTIVATED,text='Each player Special Summons 1 monster from their GY in face-down Defense Position.',real_only=True)
ACTS['graceful_dice']=dict(fits={'s_quick'},text='Roll a six-sided die; your monsters gain ATK and DEF equal to the result x 100 until the end of this turn.',real_only=True)
ACTS['summon_wall_shadow']=dict(fits=ACTIVATED|{'s_equip'},text='Special Summon Wall Shadow from your Deck, ignoring its Summoning conditions.',real_only=True)
COSTS['tribute_labyrinth_pair']=dict(fits=ACTIVATED|{'s_equip'},spends=True,text='Tribute this card and the monster equipped to it',real_only=True)
AURAS['anti_spell_counter_trap']=dict(fits={'t_counter'},text='Remove 2 Spell Counters to negate a Spell Card activation and destroy it.',real_only=True)
ACTS['fengsheng_mirror']=dict(fits={'s_normal'},text='Reveal your opponent\'s hand, then discard 1 Spirit monster from it if possible.',real_only=True)
ACTS['delta_attacker']=dict(fits={'s_normal'},text='If you control 3 face-up Normal Monsters with the same name, they can attack directly this turn.',real_only=True)
AURAS['rite_of_spirit_nvalley']=dict(fits={'t_normal'},text='This card is unaffected by Necrovalley.',real_only=True)
AURAS['after_the_struggle']=dict(fits={'s_normal'},text='During Main Phase 1, destroy all monsters that are involved in damage calculation this turn during the Battle Phase.',real_only=True)
AURAS['wall_of_revealing_light']=dict(fits={'t_cont'},text='Pay any multiple of 1000 LP; your opponent\'s monsters with ATK up to that amount cannot attack.',real_only=True)
AURAS['spell_of_pain']=dict(fits={'s_quick'},text='When an opponent\'s effect would inflict damage to you, make them take it instead.',real_only=True)
AURAS['raregold_armor']=dict(fits={'s_equip'},text='While you control the equipped monster, your opponent must attack that monster.',real_only=True)
AURAS['nightmares_steelcage']=dict(fits={'s_normal'},text='No monsters can attack. Destroy this card after 2 of your opponent\'s turns.',real_only=True)
AURAS['butterfly_dagger']=dict(fits={'s_equip'},text='If this card is destroyed while equipped, you can return it to your hand.',real_only=True)
AURAS['infinite_dismissal']=dict(fits={'t_cont'},text='During the End Phase, destroy Level 3 or lower monsters Normal or Flip Summoned this turn.',real_only=True)
AURAS['greed']=dict(fits={'t_cont'},text='During the End Phase, each player takes 500 damage for each card they drew by card effects this turn.',real_only=True)
AURAS['canyon']=dict(fits={'s_field'},text='When a Rock monster in Defense Position is attacked, double battle damage to the attacking monster\'s controller.',real_only=True)
AURAS['seven_completed']=dict(fits={'s_equip'},text='Choose ATK or DEF when equipped; a Machine monster gains 700 in that stat.',real_only=True)
ACTS['mystic_box']=dict(fits={'s_normal'},text='Target an opponent\'s monster and your monster; destroy the first, then give the second to your opponent.',real_only=True)
AURAS['jar_robber']=dict(fits={'s_quick'},text='When Pot of Greed is activated, negate its effect and draw 1 card.',real_only=True)
AURAS['judgment_desert']=dict(fits={'t_cont'},text='Monsters flipped face-up after this card resolves cannot change battle position except by card effects.',real_only=True)
AURAS['real_set_piece']=dict(fits={'s_cont'},text='This card can only be placed on the field by its board effect.',real_only=True)
AURAS['first_sarcophagus']=dict(fits={'t_cont'},text='During each opponent End Phase, place the next Sarcophagus from your hand or Deck; when all are present, send them to the GY and Special Summon Spirit of the Pharaoh.',real_only=True)
AURAS['smoke_grenade_thief']=dict(fits={'s_equip'},text='If this card is destroyed by a card effect while equipped, reveal your opponent\'s hand and discard 1 card from it.',real_only=True)
AURAS['bad_reaction_simochi']=dict(fits={'t_cont'},text='Any effect that would increase your opponent\'s Life Points inflicts that much damage to them instead.',real_only=True)
AURAS['magical_thorn']=dict(fits={'t_cont'},text='When one or more of your opponent\'s cards are discarded from their hand to the GY, inflict 500 damage to them for each card.',real_only=True)
AURAS['tornado_wall']=dict(fits={'t_cont'},text='While Umi is active, you take no battle damage. Destroy this card if Umi is not active.',real_only=True)
AURAS['anti_spell_fragrance']=dict(fits={'t_cont'},text='Both players must Set Spells and wait until the next turn before activating them.',real_only=True)
AURAS['light_of_intervention']=dict(fits={'t_cont'},text='Monster Cards cannot be Set or turned face-down; monsters that would be Set are Normal Summoned face-up in Defense Position.',real_only=True)
AURAS['labyrinth_of_nightmare']=dict(fits={'t_cont'},text='Once per turn, during each End Phase, change all face-up monsters the turn player controls to the opposite battle position.',real_only=True)
AURAS['ominous_fortunetelling']=dict(fits={'t_cont'},text='Once per turn during your Standby Phase, reveal a random card in your opponent\'s hand; if you correctly call its type, inflict 700 damage.',real_only=True)
AURAS['pyramid_of_light']=dict(fits={'t_cont'},text='If this face-up card leaves your field, destroy and banish your face-up Andro Sphinx and Sphinx Teleia.',real_only=True)
AURAS['jam_defender']=dict(fits={'t_cont'},text='When your opponent attacks a monster you control, you can target a face-up Revival Jam you control that can be attacked; make it the attack target.',real_only=True)
ACTS['shuffle_own_deck']=dict(fits={'m_main'},text='Shuffle your Deck.',real_only=True)
AURAS['atk_down_if_opp_monster']=dict(fits={'m_main'},text='While your opponent controls a monster, this card loses 1000 ATK.',real_only=True)
AURAS['fatal_abacus']=dict(fits={'t_cont'},text='When monsters are sent from the field to the GY, their owners take 500 damage for each.',real_only=True)
AURAS['rod_silence_kayest']=dict(fits={'s_equip'},text='Other Spell effects that target the equipped monster are negated, then that Spell is destroyed.',real_only=True)
ACTS['damage_turn_player']=dict(fits={'s_cont'},text='the turn player takes {n} damage',n=R(100,1000,100),real_only=True)
CONDS['any_standby_phase']=dict(kind='event',fits={'s_cont'},text='During each player’s Standby Phase',real_only=True)
ACTS['self_set_main_phase']=dict(fits={'m_main'},text='Once per turn, during your Main Phase, change this card to face-down Defense Position.',real_only=True)
AURAS['self_lose_atk_def_per_hand']=dict(fits={'m_main'},text='This card loses {n} ATK and DEF for each card in your hand.',n=R(100,500,100),real_only=True)
AURAS['draw_if_flipped_battle_destroyed']=dict(fits={'m_main'},text='If this card was flipped face-up before it was destroyed by battle, draw 1 card.',real_only=True)
AURAS['self_atk_per_named_gy']=dict(fits={'m_main'},text='This card gains {n} ATK for each {names} in both GYs.',n=R(100,500,100),real_only=True)
AURAS['equip_direct']=dict(fits={'s_equip'},text='The equipped monster can attack directly',real_only=True)
AURAS['equip_no_attack_non_machine']=dict(fits={'s_equip'},text='The equipped non-Machine monster cannot attack',real_only=True)
AURAS['equip_return_top']=dict(fits={'s_equip'},text='If this card is sent to the GY, place it on top of the Deck.',real_only=True)
AURAS['equip_return_top_pay']=dict(fits={'s_equip'},text='If this card is sent from the field to the GY, you can pay 500 LP to place it on top of the Deck.',real_only=True)
AURAS['equip_send_field_damage']=dict(fits={'s_equip'},text='If this card is sent from the field to the GY, inflict {n} damage to your opponent.',n=R(100,1000,100),real_only=True)
AURAS['equip_send_field_recover']=dict(fits={'s_equip'},text='If this card is sent from the field to the GY, gain {n} LP.',n=R(100,1500,100),real_only=True)
AURAS['equip_battle_damage_recover']=dict(fits={'s_equip'},text='If the equipped monster inflicts battle damage to your opponent, gain that much LP.',real_only=True)
COSTS['send_hand']=dict(fits=ACTIVATED,spends=True,text='send {n} {filter} from your hand to the GY',real_only=True)
COSTS['send_field_cost']=dict(fits={'m_main'},spends=True,text='send {filter} you control from your field to the GY as cost',real_only=True)
CONDS['destroyed_face_down_monster']=dict(kind='event',fits={'m_main'},text='If this face-down Defense Position card is destroyed and sent from the Monster Zone to the GY',real_only=True)
ACTS['move_select']=dict(fits=ACTIVATED,text='choose {n} {filter} and {verb} {n}',real_only=True)
ACTS['ss_self_gy_swap_base']=dict(fits={'m_main'},grave=True,text='Special Summon this card from your GY, then swap its original ATK and DEF',real_only=True)
CONDS['own_standby_phase_monster']=dict(kind='event',fits={'m_main'},text='During your Standby Phase',real_only=True)
ACTS['reveal_target']=dict(fits={'m_main'},target=True,tclause='target 1 face-down card your opponent controls',text='look at it',real_only=True)
ACTS['destroy_trap_negator']=dict(fits={'s_normal'},target=True,
                                 tclause='target 1 face-up card with an effect that negates Trap effects',
                                 text='destroy it',real_only=True)
ACTS['emissary_search_each_player']=dict(fits={'m_main'},text='each player adds 1 Level 3 or lower Normal Monster from their Deck to their hand',real_only=True)
ACTS['archfiend_general_search']=dict(fits={'m_main'},hand=True,text='add 1 "Pandemonium" from your Deck to your hand',real_only=True)
AURAS['archfiend_general_if_no_pandemonium']=dict(fits={'m_main'},text='Destroy this card if "Pandemonium" is not on the field',real_only=True)
ACTS['snipe_hunter_dice_destroy']=dict(fits={'m_main'},target=True,
                                      tclause='target 1 card on the field',
                                      text='roll a six-sided die; destroy it unless the result is 1 or 6',real_only=True)
CONDS['fiends_hand_mirror_spell_targets_st']=dict(kind='event',fits={'t_normal'},text='When your opponent activates a Spell Card that targets exactly 1 Spell/Trap on the field',real_only=True)
ACTS['redirect_spell_st_target']=dict(fits={'t_normal'},target=True,
                                      tclause='target another Spell/Trap that is a legal target for that effect',
                                      text='change that Spell Card’s target to this card',real_only=True)
AURAS['last_warrior_no_summon']=dict(fits={'m_fusion'},text='Neither player can Normal Summon, Flip Summon, or Special Summon monsters',real_only=True)
ACTS['moisture_three_tribute_rule']=dict(fits={'m_main'},text='This card can be Normal Summoned by Tributing exactly 3 monsters',real_only=True)
CONDS['furinkazan_four_attributes']=dict(kind='state',fits={'t_normal'},text='there are face-up WIND, WATER, FIRE, and EARTH monsters on the field',real_only=True)
ACTS['furinkazan_choice']=dict(fits={'t_normal'},text='apply 1 available effect: destroy all opponent monsters, destroy all opponent Spells/Traps, make your opponent discard 2 random cards, or draw 2 cards',real_only=True)
AURAS['cave_dragon_rules']=dict(fits={'m_main'},text='Cannot be Normal Summoned while you control a monster; cannot attack unless you control another face-up Dragon monster',real_only=True)
ACTS['metal_tribute_equip_proc']=dict(fits={'m_main'},text='Must first be Special Summoned from your Deck by Tributing {filter}',real_only=True)
AURAS['fusion_material_substitute']=dict(fits={'m_main'},text='Can be used as a substitute for 1 Fusion Material while in the hand, on the field, or in the GY',real_only=True)
ACTS['gate_guardian_proc']=dict(fits={'m_main'},text='Must first be Special Summoned from your hand by Tributing 1 each of {filter}',real_only=True)
COSTS['elemental_burst_cost']=dict(fits={'t_normal'},spends=True,text='Tribute 1 each of a WIND, WATER, FIRE, and EARTH monster',real_only=True)
ACTS['guardian_grarl_rule']=dict(fits={'m_main'},text='Cannot be Summoned unless "Gravity Axe - Grarl" is face-up; if this is the only card in your hand, you can Special Summon it from your hand',real_only=True)
ACTS['dreadroot_three_tribute_rule']=dict(fits={'m_main'},text='Must be Normal Summoned/Set by Tributing exactly 3 monsters; cannot be Special Summoned',real_only=True)
ACTS['total_defense_shogun_attack_rule']=dict(fits={'m_main'},text='This card can attack while in Defense Position, using its ATK for damage calculation',real_only=True)
ACTS['delayed_battle_destroy']=dict(fits={'m_main'},text='when this card attacks a face-up monster, mark it for destruction during the {nth} End Phase after the battle',n=R(2,5),real_only=True)
ACTS['steel_scorpion_delayed_destroy']=dict(fits={'m_main'},text='when a non-Machine monster attacks this card, destroy that attacker during your opponent’s second turn after the attack',real_only=True)
CONDS['chain_master_battle_destroyed']=dict(kind='event',fits={'m_main'},text='If this card is destroyed by battle and sent to the GY while your opponent has a Monster in hand',real_only=True)
ACTS['chain_master_steal_monster']=dict(fits={'m_main'},text='reveal your opponent’s hand, add 1 Monster from it to your hand, then shuffle their hand',real_only=True)
ACTS['gilasaurus_ss_proc']=dict(fits={'m_main'},text='You can Special Summon this card from your hand if you have an open Monster Zone',real_only=True)
CONDS['gilasaurus_procedure_summoned']=dict(kind='event',fits={'m_main'},text='When this card is Special Summoned by its hand procedure',real_only=True)
ACTS['opp_may_ss_from_gy']=dict(fits={'m_main'},text='your opponent may Special Summon 1 monster from their GY',real_only=True)
CONDS['only_your_monster']=dict(kind='state',fits={'m_main'},text='this is the only monster you control',real_only=True)
ACTS['dark_zebra_change_def']=dict(fits={'m_main'},text='change this Attack Position card to Defense Position; it cannot change battle position again this turn',real_only=True)
CONDS['battle_destroyed_faceup']=dict(kind='event',fits={'m_main'},text='If this face-up card is destroyed by battle',real_only=True)
ACTS['damage_battle_destroyer']=dict(fits={'m_main'},text='the player who destroyed this card by battle takes {n} damage',n=R(500,1500,100),real_only=True)
AURAS['mokey_mokey_smackdown']=dict(fits={'s_cont'},text='If a face-up Fairy you control is destroyed while you control Mokey Mokey, all your face-up Mokey Mokey monsters become 3000 ATK until the End Phase',real_only=True)
AURAS['unfriendly_amazon_upkeep']=dict(fits={'m_main'},text='During each of your Standby Phases, Tribute another monster you control, or destroy this card',real_only=True)
AURAS['element_soldier']=dict(fits={'m_main'},text='While a WATER monster is on the field, control of this card cannot switch; if an EARTH monster is on the field, negate the effects of Effect Monsters destroyed by battle with this card',real_only=True)
AURAS['pandemonium_watchbear']=dict(fits={'m_main'},text='Your face-up Pandemonium cannot be destroyed by your opponent’s card effects',real_only=True)
AURAS['gernia_revival']=dict(fits={'m_main'},text='If this face-up card you control is destroyed and sent to the GY by an opponent’s card effect, Special Summon it during your next Standby Phase',real_only=True)
AURAS['life_absorbing_machine']=dict(fits={'t_cont'},text='During your Standby Phase, gain half of the LP you paid during your previous turn',real_only=True)
COSTS['throwstone_warrior_tribute']=dict(fits={'m_main'},spends=True,text='Tribute 1 Warrior monster you control as cost',real_only=True)
ACTS['throwstone_destroy']=dict(fits={'m_main'},text='destroy 1 face-up monster on the field with DEF less than or equal to this card’s ATK',real_only=True)
CONDS['ultimate_offering_window']=dict(kind='state',fits={'t_cont'},text='it is your Main Phase or your opponent’s Battle Phase and you can Normal Summon or Set a monster',real_only=True)
ACTS['ultimate_offering_summon']=dict(fits={'t_cont'},text='immediately Normal Summon or Set 1 monster from your hand',real_only=True)
AURAS['frontier_wiseman']=dict(fits={'m_main'},text='Negate Spell effects that target a face-up Warrior you control; destroy those Spell Cards',real_only=True)
AURAS['dreadroot_half_other_monsters']=dict(fits={'m_main'},text='The ATK and DEF of all other monsters on the field are halved',real_only=True)
ACTS['reveal_destroy_st']=dict(fits={'m_main'},target=True,
                               text='target {filter}; reveal it if Set, and destroy it if it is the matching card type',
                               real_only=True)
ACTS['take_control_target']=dict(fits=ACTIVATED,target=True,tclause='target {n} {filter}',
                                 text='take control of it until the End Phase',real_only=True)
ACTS['take_control_direct_target']=dict(fits={'m_main'},target=True,
                                       tclause='target {n} {filter}',
                                       text='take control of it until the End Phase and let it attack directly',real_only=True)
ACTS['destroy_payoff_per']=dict(fits=ACTIVATED,
                                text='destroy {filter}, then {payoff} for each card destroyed',
                                real_only=True)
ACTS['copy_stats_target']=dict(fits={'m_main'},target=True,
                               tclause='target 1 face-up monster your opponent controls',
                               text="this card's ATK/DEF become equal to that monster's original ATK/DEF",
                               real_only=True)
ACTS['recover_opp']=dict(fits=ACTIVATED,text='your opponent gains {n} LP',real_only=True)
ACTS['damage_self']=dict(fits=ACTIVATED,text='you take {n} damage',real_only=True)
ACTS['destroy_attack_target']=dict(fits={'m_main'},text='destroy the face-up Defense Position monster this card is attacking',real_only=True)
ACTS['reveal_opp_set_all']=dict(fits={'m_main'},text='reveal all Set cards your opponent controls',real_only=True)
ACTS['recover_tribute_stat']=dict(fits={'t_normal','s_quick'},text='gain LP equal to the selected monster stat',real_only=True)
CONDS['st_destroyed_opp']=dict(kind='event',fits={'t_normal'},text='When one or more of your Spell/Trap Cards are destroyed and sent to the GY by your opponent\'s card effect',real_only=True)
ACTS['reveal_destroy_set_mon']=dict(fits={'m_main'},target=True,
                                   tclause='target 1 face-down monster your opponent controls',
                                   text='reveal it and destroy it if it is an Effect Monster',real_only=True)
ACTS['acid_trap_hole']=dict(fits={'s_normal','t_normal'},target=True,
                             tclause='target 1 face-down Defense Position monster on the field',
                             text='flip it face-up; destroy it if its DEF is 2000 or less, otherwise Set it again',real_only=True)
ACTS['spell_counter_all']=dict(fits={'m_main'},text='place 1 Spell Counter on each face-up card that can hold one',real_only=True)
ACTS['return_self_hand']=dict(fits={'m_main'},text='return this face-up card to its owner\'s hand',real_only=True)
ACTS['return_battle_target']=dict(fits={'m_main'},text='return the opponent\'s monster that battled this card to the hand',real_only=True)
ACTS['discard_hand']=dict(fits=ACTIVATED,text='discard {n} card{s} from your hand',real_only=True)
ACTS['ss_target']=dict(fits=ACTIVATED,tclause='target {n} {filter}',text='Special Summon it{position}',target=True,ss=True,real_only=True)
# Instant wins of every kind (user, Nov 15: very rare, at least 2 conditions).
WIN_ACTS={'win','final_countdown','last_turn','exodia_head','destiny_board'}
COSTS['remove_spell_counters_cost']=dict(fits={'s_normal'},spends=True,text='remove {n} Spell Counters from cards you control',n=10,real_only=True)
ACTS['spell_absorbing_life']=dict(fits={'t_normal'},text='flip all face-down monsters face-up without activating their Flip Effects, then gain 400 LP for each face-up Effect Monster on the field',real_only=True)
CONDS['battle_destroyed_any']=dict(kind='event',fits={'t_normal'},text='When a monster is destroyed by battle and sent to the GY',real_only=True)
ACTS['revive_battle_destroyed_same_side']=dict(fits={'t_normal'},text='Special Summon that monster to its previous controller in its previous battle position',real_only=True)
CONDS['opp_targets_monster_gy']=dict(kind='event',fits={'t_normal'},text='When your opponent activates a card that targets a monster in the GY',real_only=True)
CONDS['your_monster_destroyed_by_effect']=dict(kind='event',fits={'t_normal'},text='When a monster you control is destroyed by a card effect and sent to the GY outside the Damage Step',real_only=True)
CONDS['battle_damage_to_you']=dict(kind='event',fits={'t_normal'},text='When you take Battle Damage',real_only=True)
ACTS['damage_condenser_summon']=dict(fits={'t_normal'},text='Special Summon 1 monster from your Deck with ATK less than or equal to the Battle Damage you took',real_only=True)
CONDS['opponent_end_phase']=dict(kind='event',fits={'m_main'},text="During your opponent's End Phase",real_only=True)
ACTS['dark_spirit_silent_redirect']=dict(fits={'t_normal'},target=True,text='negate the attack, then have another face-up opponent monster battle the attacker',real_only=True)
CONDS['battle_destroying_mandatory']=dict(kind='event',fits={'m_main'},text='When this card destroys an opponent monster by battle',real_only=True)
ACTS['no_spells_traps_activation_turn']=dict(fits={'m_main'},text='neither player can activate Spell/Trap effects until the End Phase',real_only=True)
CONDS['sangan_sent_field_gy']=dict(kind='event',fits={'m_main'},text='If this card is sent from the field to the GY',real_only=True)
ACTS['sangan_search_lock']=dict(fits={'m_main'},text='add 1 monster with 1500 or less ATK from your Deck to your hand, then prevent activation of cards with that name for the rest of the turn',real_only=True)
ACTS['apprentice_place_counter']=dict(fits={'m_main'},target=True,text='place 1 Spell Counter on a face-up card that can hold one',real_only=True)
CONDS['gravekeeper_attacks_necrovalley']=dict(kind='event',fits={'m_main'},text='When this card declares an attack while Necrovalley is on the field',real_only=True)
ACTS['hannibal_counter_setup']=dict(fits={'m_main'},text='This card can hold up to 1 Spell Counter',real_only=True)
ACTS['hannibal_normal_summon_counter']=dict(fits={'m_main'},text='place 1 Spell Counter on this card when Normal Summoned',real_only=True)
COSTS['remove_self_spell_counter']=dict(fits={'m_main'},spends=True,n=1,text='remove {n} Spell Counter{s} from this card as cost',real_only=True)
COSTS['remove_three_self_spell_counters']=dict(fits={'m_ritual'},spends=True,n=3,text='remove 3 Spell Counters from this card as cost',real_only=True)
AURAS['element_dragon_fire_wind']=dict(fits={'m_main'},text='Gains 500 ATK while a FIRE monster is on the field; if a WIND monster is on the field, it can make another attack after destroying a monster by battle',real_only=True)
CONDS['neko_mane_sent_opp_effect']=dict(kind='event',fits={'m_main'},text="During your opponent's turn, if this card you own is sent to the GY by an opponent's card effect",real_only=True)
ACTS['neko_mane_end_phase']=dict(fits={'m_main'},text='make it the End Phase of this turn',real_only=True)
ACTS['dark_ruler_hades_no_gy_ss']=dict(fits={'m_main'},text='This card cannot be Special Summoned from the GY',real_only=True)
AURAS['dark_ruler_hades_fiend_battle_negate']=dict(fits={'m_main'},text='Negate the effects of monsters destroyed by battle with Fiend monsters you control',real_only=True)
AURAS['unhappy_girl_battle_lock']=dict(fits={'m_main'},text='Cannot be destroyed by battle while in face-up Attack Position; monsters that battle it cannot attack or change position while it remains there',real_only=True)
AURAS['magical_marionette_counters']=dict(fits={'m_main'},text='Each resolving Spell activation places a Spell Counter on this card; it gains 200 ATK per counter',real_only=True)
AURAS['spell_counter_per_spell_activation']=dict(fits={'m_ritual'},text='Each resolving Spell activation places a Spell Counter on this card.',real_only=True)
AURAS['spell_canceller']=dict(fits={'m_main'},text='Neither player can activate Spell effects; negate the effects of Spell Cards on the field.',real_only=True)
ACTS['ss_chaos_light_dark']=dict(fits={'m_main'},text='Special Summon this card from your hand by banishing 1 LIGHT and 1 DARK monster from your GY',real_only=True)
COSTS['chaos_no_attack']=dict(fits={'m_main'},spends=True,text='This card cannot attack for the rest of this turn',real_only=True)
ACTS['guardian_ceal_summon']=dict(fits={'m_main'},text='Cannot be Summoned unless Shooting Star Bow - Ceal is face-up on the field',real_only=True)
CONDS['fear_from_dark_sent']=dict(kind='event',fits={'m_main'},text='If this card is sent from your hand or Deck to the GY by an opponent\'s card effect',real_only=True)
ACTS['ss_self_gy']=dict(fits={'m_main'},grave=True,text='Special Summon this card from your GY',real_only=True)
ACTS['swift_gaia_lone_hand_summon']=dict(fits={'m_main'},text='You can Normal Summon this card without Tributing if it is the only card in your hand',real_only=True)
LIMITS['gilford_three_tribute']=dict(fits={'m_main'},text='You can Normal Summon this card by Tributing 3 monsters (but not Set)',real_only=True)
CONDS['gilford_three_tribute_summon']=dict(kind='event',fits={'m_main'},text='If this card is Tribute Summoned by Tributing 3 monsters',real_only=True)
ACTS['electric_virus_control']=dict(fits={'m_main'},target=True,hand=True,text='target 1 face-up Machine or Dragon monster your opponent controls; take control of it until the End Phase',real_only=True)
CONDS['fear_from_dark_sent']=dict(kind='event',fits={'m_main'},text='If this card is sent from your hand or Deck to the GY by an opponent\'s card effect',real_only=True)
ACTS['ss_self_gy']=dict(fits={'m_main'},grave=True,text='Special Summon this card from your GY',real_only=True)
CONDS['sinister_serpent_standby']=dict(kind='event',fits={'m_main'},text='During your Standby Phase while this card is in your GY',real_only=True)
ACTS['sinister_serpent_recycle']=dict(fits={'m_main'},grave=True,text='add this card to your hand, then banish one copy from your GY during the opponent\'s next End Phase',real_only=True)

ACTS['ss_banish_attr_gy'].update(n=1,text='You can Special Summon this card from your hand by banishing {n} {attr} monsters from your GY')
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
# Measured against the game's own cards (user, Nov 16: drawbacks like "pay LP or destroy this card" are rare on real
# cards). Share of all cards before -> real cards: upkeep 5.5% -> 0.6%, Standby damage 4.1% -> 0.1%, coin 4.0% ->
# 0.9%, call 4.2% -> 0.7%, no Battle Phase 2.7% -> 0.2%, no Special Summon 2.0% -> ~0, once per Duel 1.7% -> 0.1%,
# gain LP 5.6% -> 1.4%, mill 1.4% -> 0.1%, random discard 1.3% -> 0.4%; FLIP 0.4% -> 3.5% and Standby timings 0.6%
# -> 1.2% were too rare. "Other" pieces as a whole (coin, dice, upkeep, curse) drop with COUNT_DECAY['others'].
BLOCK_WEIGHTS.update({'upkeep':.45,'curse_damage':.1,'coin':.9,'call':.7,
 'no_bp':.25,'no_ss':.15,'once_duel':.2,'self_no_attack':.6,
 'recover':4,'mill_opp':.3,'discard_opp':1,'flip':30,'standby':8,
 # Deck searches 3.1% -> 1.3%, "negate the attack" 3.1% -> 0.2% (Counter Traps still get theirs from settle()), dice 0.1% -> 1.2%.
 'search_race':2,'negate_attack':1,'dice_mult':2,'dice_branch':2,'cannot_ss':6,
 'draw':1.5})   # draws rarer than on real cards (user, Nov 17): 2.8% -> about 1% of cards

# Real-card blocks in the random rotation (user, Nov 16: the recreation blocks that are different enough from the
# existing ones). Each was forced onto 6 cards and played in the duel engine first (400 duels, 0 Lua errors, every
# activated one used). The recreation gives them the parameters real cards use; here they get what the generator
# needs (amount ranges, Type rolls, timings) and a weight. Weights follow how many real cards use them, lower for
# board wipes and Magic Cylinder. Others stay real_only: card-specific ones ("Toon World", "Mokey Mokey"), ones
# that take card filters the generator cannot roll yet, and near-copies of existing blocks.
ROTATION={
 'battle_destroyed':(dict(gy=True),3),
 'lp_half':(dict(),1),
 'self_set':(dict(label='Set this card',self=True),2),
 'self_atk_permanent':(dict(label='Gain ATK',self=True,n=R(100,1000,100)),1),
 'damage_both':(dict(label='Damage',n=R(500,2000,100),d=R(200,1000,100)),1),
 'destroy_all_monsters':(dict(label='Destroy all monsters',fixed={'side':'all'},fits={'s_normal','s_quick','t_normal'}),.3),   # one use, like Dark Hole: every turn locked duels (Nov 17)   # Dark Hole: every monster on the field
 'bounce_all_opp_mon':(dict(label='Return all monsters',fits={'s_normal','s_quick','t_normal'}),.3),
 'indes_battle_turn':(dict(label='Protect'),1.5),
 'no_battle_damage_turn':(dict(label='No battle damage'),1.5),
 'shuffle_hand_draw_same':(dict(label='Shuffle and draw'),.5),
 'end_battle_phase':(dict(label='End the Battle Phase',ctx='opp_attack'),1.5),
 'damage_attacker_atk':(dict(label='Reflect the attack',ctx='opp_attack'),.5),
 'recover_attacker_atk':(dict(label='Gain LP',ctx='opp_attack'),1),
 'self_direct_always':(dict(),1.5),
 'self_cannot_be_battle_target':(dict(),1),
 'self_avoid_battle_damage':(dict(),1),
 'self_atk_per_race':(dict(race=True,n=R(100,500,100)),1.5),
 'no_attack_race_opp':(dict(race=True),1),
 'equip_atk_down':(dict(n=R(300,1500,100)),1),
 'equip_def_down':(dict(n=R(300,1500,100)),1),
 # Second batch (user, Nov 17), tested the same way: 90 cards, 320 duels, 0 Lua errors, every activated block used.
 'battled':(dict(),1.5),
 'damage_to_controller':(dict(repeat=True),1),
 'your_battle_damage_opp':(dict(repeat=True),1),
 'gy_empty':(dict(),1),
 'self_atk_def_per_hand':(dict(n=R(100,500,100)),1),
 'self_atk_when_battling_attr':(dict(attr=True,no_match=True,n=R(300,1000,100)),1),   # the opponent's Attribute
 'attack_all_opp_monsters':(dict(),.5),
 'no_attack_atk_min':(dict(n=R(1500,2500,500),fits={'s_cont'}),.4),   # Messenger of Peace: a Continuous Spell, never below 1500
 'equip_direct':(dict(),1.5),
 'equip_send_field_damage':(dict(n=R(300,1000,100)),1),
 'no_traps_opp_battle_phase':(dict(),1),
 'banish_battle_destroyed_monsters':(dict(),1),
 'look_reorder_top5':(dict(label='Look at your Deck',n=R(3,5)),.75),
 'double_tribute_attribute':(dict(attr=True),1),
 'no_traps_on_normal_summon':(dict(),.75),
}
for _k,(_extra,_w) in ROTATION.items():
 _meta=next(t[_k] for t in CATEGORIES.values() if _k in t)
 _meta.update({k:v for k,v in _extra.items() if k!='fits'});_meta.pop('real_only',None);BLOCK_WEIGHTS[_k]=_w
 # The generator adds its own full stop, and an activated effect continues the sentence ("...; you take no ...").
 _t=_meta['text'].rstrip('.')
 if _k not in AURAS and _k not in CONDS and _t[:1].isupper():_t=_t[:1].lower()+_t[1:]
 _meta['text']=_t

# High amounts get likelier with more conditions (user, Nov 15), without being guaranteed. An amount is rolled
# from its range with weights tilted by TILT: with no condition the low end is about 20x likelier than the top;
# each condition tilts it TILT_PER_CONDITION toward the top (3 conditions: the top is the likeliest).
TILT=-3.0
TILT_PER_CONDITION=1.6

# Amounts vanilla cards print (user, Nov 16: no "gain 3700 LP" or "pay 100 LP"): 200-800 in steps of 100, then
# steps of 500 from 1000. Ladders of LP, damage and ATK (steps of 100) only offer these values.
def _vanilla_amount(n):
 return 200<=n<=800 and n%100==0 or n>=1000 and n%500==0
VANILLA_AMOUNTS=[n for n in range(200,10001,100) if _vanilla_amount(n)]
def _snap(n):
 return min(VANILLA_AMOUNTS,key=lambda v:abs(v-n))

def _pick_amount(rng,ladder,conditions=0):
 import math
 if len(ladder)>1 and all(v%100==0 for v in ladder) and ladder[-1]>=300:ladder=[v for v in ladder if _vanilla_amount(v)] or ladder
 k=TILT+TILT_PER_CONDITION*conditions;m=len(ladder)
 if m==1:return ladder[0]
 return rng.choices(ladder,[math.exp(k*(i/(m-1)-.5)) for i in range(m)])[0]

# ---------------------------------------------------------------- rolling
def _roll_block(rng,cat,key,card):
 spec={'k':key};meta=CATEGORIES[cat][key]
 spec.update(meta.get('fixed',{}))   # parameters a rotation block always has (ROTATION)
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

# Which blocks a slot can roll depends only on the slot, so it is worked out once (Nov 17: with 600+ blocks, filtering
# on every roll made 1,000 cards take seconds, and the Randomizer loadout makes 1,000 on the phone at run start).
_CANDIDATES={}
def _candidates(cat,slot,card):
 if (cat,slot) not in _CANDIDATES:_CANDIDATES[cat,slot]=_find_candidates(cat,slot)
 return _CANDIDATES[cat,slot]

def _generator_fit(key,slot,meta):
 rotation=ROTATION.get(key)
 slots=rotation[0].get('fits') if rotation else None
 return slot in meta['fits'] and (not slots or slot in slots)

def _find_candidates(cat,slot):
 table=CATEGORIES[cat]
 keys=[k for k,m in table.items() if _generator_fit(k,slot,m)]
 # Win conditions come only with a win effect (see _pull_win_conditions); 'needed' blocks only with the effect
 # that needs them; set pieces only with their set.
 if cat=='conds':keys=[k for k in keys if k not in WIN_CONDS]
 keys=[k for k in keys if not table[k].get('needed') and not table[k].get('real_only') and k not in SET_ONLY]
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
 # Effects first, so how strong they are can decide how likely costs and timings are (POWER_DECAY).
 for cat in ['acts']+[c for c in CATEGORIES if c!='acts']:
  power=_power(parts.get('acts',[]))
  # A Spell/Trap must do something and an Effect Monster has an effect (a Ritual Spell already Ritual Summons).
  needs=cat=='acts' and (slot not in MONSTER_SLOTS|{'m_none','s_ritual'} or card.get('frame')=='effect')
  if cat=='acts' and slot in EFFECT_CHANCE:count=_roll_count(rng,cat,1,slot) if rng.random()<EFFECT_CHANCE[slot] else 0
  else:count=_roll_count(rng,cat,1 if needs else 0,slot,power)
  keys=_candidates(cat,slot,card)
  parts[cat]=[_roll_block(rng,cat,k,card) for k in _sample(rng,keys,count)]
 return {c:parts[c] for c in CATEGORIES}   # the usual order (the rules check categories in this order)

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
   if not _generator_fit(p['k'],slot,CATEGORIES[cat][p['k']]):return cat,i,'does not fit this kind of card'
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
 # Vanilla-like effects (user, Nov 16): one requirement ("your LP are 2000 or less and you have less LP than your
 # opponent" overlapped), at most EFFECT_CAPS costs and actions. Win conditions and pieces an effect needs stay;
 # a rolled piece goes first.
 states=[i for i,p in enumerate(conds) if CONDS[p['k']]['kind']=='state' and p['k'] not in WIN_CONDS]
 for cat,idx,limit,why in (('conds',states,1,'one requirement per effect'),('costs',list(range(len(costs))),_cap('costs',slot),'too many costs'),
                           ('acts',list(range(len(acts))),_cap('acts',slot),'too many actions')):
  if len(idx)>limit:
   free=[i for i in idx if parts[cat][i]['k'] not in needed]
   if free:return cat,free[-1],why
 auras=[i for i,p in enumerate(acts) if p['k'] in AURAS]
 if auras:
  # Always-on: no activation, so nothing that belongs to activating.
  if len(auras)<len(acts):return 'acts',next(i for i,p in enumerate(acts) if p['k'] not in AURAS),'mixes always-on and activated effects'
  if costs:return 'costs',0,'always-on effects have no cost'
  if event is not None:return 'conds',events[0],'always-on effects have no timing'
  for i,p in enumerate(limits):
   if p['k'] not in ('cannot_ss','cannot_ss_gy','summon_by'):return 'limits',i,'always-on effects are not activated'
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
   pool=[k for k,m in CONDS.items() if m['kind']=='state' and _generator_fit(k,slot,m) and not m.get('needed') and k not in WIN_CONDS and not m.get('real_only')]
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
  pool=[k for k,m in CONDS.items() if m['kind']=='state' and _generator_fit(k,slot,m) and k not in have and not m.get('real_only')]
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
  if n>0:return _snap(n)   # a vanilla amount (1300 becomes 1500)

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
 # A strong effect on a card that stays (a monster or Continuous card), usable any turn without a timing, costs
 # something, like real cards (Nov 17: free "Once per turn: return 1 monster to the hand" locked test duels).
 acts=parts['acts']
 if (slot in MONSTER_SLOTS|{'s_cont','t_cont'} and acts and acts[0]['k'] not in AURAS and not _event(parts)
     and not parts['costs'] and _power(acts)>=1):
  for k in _sample(rng,_candidates('costs',slot,{}),99):   # weighted order, every cost tried
   parts['costs']=[_roll_block(rng,'costs',k,{})]
   if not problem(parts,slot):log.append(f"strong repeatable effect: added cost '{k}'");break
  else:parts['costs']=[]
 # Paying LP for it every turn costs at least 1000, as on real cards (Nov 17: "pay 200 LP; destroy 1 monster" each
 # turn locked test duels).
 if slot in MONSTER_SLOTS|{'s_cont','t_cont'} and acts and acts[0]['k'] not in AURAS and _power(acts)>=1:
  for p in parts['costs']:
   if p['k']=='lp' and p.get('n',0)<1000:log.append(f"repeatable strong effect: LP cost {p['n']} -> 1000");p['n']=1000
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
 # The targeted action goes first, so "Target 1 Spell/Trap your opponent controls; destroy it, then ..." reads
 # right ("it" is the target, not whatever the action before it made). Stable: the rest keep their order.
 parts['acts'].sort(key=lambda p:not ACTS.get(p['k'],{}).get('target'))
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
 method_names=[{'normal':'Normal','flip':'Flip','special':'Special'}[m] for m in p.get('methods',[])]
 methods=(', '.join(method_names[:-1])+' or '+method_names[-1] if len(method_names)>2 else _join(method_names, ' or ')) if method_names else ''
 stats=_join(p.get('stats',[]), ' and ') if p.get('stats') else ''
 hand_mode=p.get('mode')
 if p.get('side')=='opp':
  hand_condition=(f"your opponent has at least {p.get('n')} cards in their hand" if hand_mode=='min' else f"your opponent has {p.get('n')} or fewer cards in their hand")
 else:
  hand_condition=(f"you have at least {p.get('n')} cards in your hand" if hand_mode=='min' else ('you have no cards in your hand' if p.get('n')==0 else f"you have {p.get('n')} or fewer cards in your hand"))
 return text.format(n=n,s='' if n==1 else 's',race=p.get('race',''),attr=p.get('attr',''),how=how,level=p.get('level',2),l=p.get('l'),d=p.get('d'),
  six=(n or 0)*12,nth=_ordinal(n),name=p.get('name',''),names=names,side={'opp':'monsters your opponent controls','you':'monsters you control','all':'monsters on the field'}.get(p.get('side'),'monsters your opponent controls'),deck_owner={'opp':"your opponent's",'you':'your'}.get(p.get('side'),"your opponent's"),summon_side={'opp':'your opponent','any':'either player'}.get(p.get('side'),'your opponent'),methods=methods,stats=stats,change_verb={'minus':'decrease','plus':'increase'}.get(p.get('sign'),'change'),attr_change_verb={'minus':'lose','plus':'gain'}.get(p.get('sign'),'change'),skip_phrase=({'battle':'skip your opponent\'s next Battle Phase','standby':'skip your next Standby Phase'}.get(p.get('phase'),'skip the next phase')),hand_condition_text=hand_condition,damage_turn_text=({'battle':'you take no battle damage this turn','all':'you take no damage from your opponent\'s cards this turn'}.get(p.get('kind'),'you take no damage this turn')),attacker_recover_text=('negate that attack, and if you do, gain LP equal to the attacking monster\'s ATK' if p.get('negate') else 'gain LP equal to the attacking monster\'s ATK'),extreme={'high':'highest','low':'lowest'}.get(p.get('extreme'),'highest'),stat=p.get('stat','ATK'),constraint=p.get('constraint',''),filter=p.get('filter','monster'),verb=p.get('verb') or {'destroy':'destroy','hand':'return','grave':'send','banish':'banish','deck':'shuffle','decktop':'place','facedown':'turn face-down','defense':'change to Defense Position','attack':'change to Attack Position'}.get(p.get('to'),'destroy'),zone={'deck':'Deck','hand':'hand','gy':'GY','banished':'banished cards','deck_gy':'Deck or GY','deck_hand':'hand or Deck','deck_hand_gy':'hand, Deck, or GY'}.get(p.get('zone'),'Deck'),position={'attack':' in face-up Attack Position','faceup':''}.get(p.get('position'),p.get('position','')),board=p.get('board_name',''),payoff=p.get('payoff_name',''),effect={'add':f"it gains {p.get('n')} {p.get('stat','ATK')}",'set':f"its {p.get('stat','ATK')} becomes {p.get('n')}",'half':'its original ATK becomes half its original ATK'}.get(p.get('mode'),'changes its stats')
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
 # Type names stay capitalised after "While ...," ("aqua monsters you control" read wrong, Nov 16).
 low=lambda t:t if t.split(' ')[0] in ('FLIP','Spell','Trap','Special','Tribute','Normal','Ritual','Fusion',*{r.split(' ')[0] for r in RACES}) or t.split(' ')[0].isupper() else t[:1].lower()+t[1:]
 states=[_fmt(CONDS[p['k']]['text'],p,card) for p in conds if CONDS[p['k']]['kind']=='state' and CONDS[p['k']].get('text')]
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
   elif LIMITS[p['k']].get('text') and p['k'] not in ('cannot_ss','cannot_ss_gy','summon_by'):lines.append(LIMITS[p['k']]['text'].format(what=what))
 if any(p['k']=='cannot_ss' for p in limits):lines.insert(0,LIMITS['cannot_ss']['text'])
 if any(p['k']=='cannot_ss_gy' for p in limits):lines.insert(0,LIMITS['cannot_ss_gy']['text'])
 for p in limits:
  if p['k']=='summon_by':lines.insert(0,_fmt(LIMITS['summon_by']['text'],p,card))
 for p in others:
  if p['k']=='upkeep':lines.append(f"During your Standby Phase, pay {p['n']} LP or destroy this card.")
  if p['k']=='curse_damage':lines.append(f"During your Standby Phase, you take {p['n']} damage.")
 return ' '.join(lines)

# ---------------------------------------------------------------- whole cards
def _fusion_materials(rng,race=None):
 # 2 or 3 materials, each a Type, Attribute, Level band, "Normal Monster" or one named card. Every material
 # matches at least 20 main-deck monsters in the pool, so the Fusion can always be made.
 mats=[]
 for _ in range(rng.choice((2,2,3))):
  kind=rng.choices(['race','attr','low','high','normal','code'],[4,3,2,1,1,2])[0]
  if kind=='race':
   ok=MATERIAL_RACES
   # Usually the Fusion's own Type, like real Fusions (a Dragon made from Dragons).
   r=race if race in ok and rng.random()<.7 else pick(rng,ok);mats.append({'k':'race','v':RACES[r],'text':f'1 {r} monster'})
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

def _one_unused(rng,group,used,fallback):
 # One card of the group not used yet by this run (then any of the group, then any of the fallback).
 free=[c for c in group if c['id'] not in used] or group or fallback
 c=rng.choice(free);used.add(c['id']);return c

def _name_art(rng,group,used,fallback=None):
 # Name from one card, art from a different card, both of the same kind (monster/Spell/Trap) and, for monsters, the
 # same Type. Unused cards first; then any card of the group; then the fallback (all monsters).
 free=[c for c in group if c['id'] not in used]
 if len(free)<2:free=group if len(group)>=2 else [c for c in fallback if c['id'] not in used] or fallback
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

def _match_type(rng,card,log):
 """The monster takes the Type / Attribute its effect names (TYPE_MATCH of the time). Effects come first, then
 conditions and costs, so "If you control a Zombie monster: add 1 Dragon monster" makes a Dragon."""
 for key,field in (('race','race'),('attr','attribute')):
  # Blocks about the opponent's monsters ('no_match': "while battling a LIGHT monster") say nothing about this card.
  named=[p[key] for cat in ('acts','conds','costs','others') for p in card['parts'][cat] if key in p and not CATEGORIES[cat][p['k']].get('no_match')]
  if named and named[0]!=card[field] and rng.random()<TYPE_MATCH:
   log.append(f"{field} {card[field]} -> {named[0]}: its effect names {named[0]}");card[field]=named[0]
   # The other half of the pair follows, unless the effect names it too (a Dragon is then likelier LIGHT or DARK).
   other,okey='attribute' if field=='race' else 'race','attr' if field=='race' else 'race'
   if not any(okey in p for cat in card['parts'].values() for p in cat):
    pairs={pr:w for pr,w in PAIR_WEIGHTS.items() if pr[0 if field=='race' else 1]==named[0]}
    if pairs:card[other]=pick(rng,pairs)[1 if field=='race' else 0]

def _stat_budget(rng,card,log):
 """Strong effects come on weaker bodies, like real cards (user, Nov 17): a strong effect keeps the lower ATK of 2
 donors of its Level, a very strong one the lowest of 3. Always-on effects count as ordinary."""
 acts=card['parts']['acts']
 power=_power(acts) if acts and acts[0]['k'] not in AURAS else 0
 if not power:return
 lv=min(BY_LEVEL,key=lambda l:(abs(l-card['level']),l))
 donors=rng.sample(BY_LEVEL[lv],min(len(BY_LEVEL[lv]),power+1))+[MONSTER_BY_ID[card['atk_from']]]
 low=min(donors,key=lambda c:c['atk'])
 if low['id']!=card['atk_from']:
  log.append(f"strong effect: ATK {card['atk']} -> {low['atk']}");card.update(atk=low['atk'],atk_from=low['id'])

def make_card(rng,next_id,used,kind=None,frame=None,sub=None,log=None):
 """One randomized card (two for a Ritual Monster: it brings its Ritual Spell). Returns a list of cards."""
 log=log if log is not None else []
 kind=kind or pick(rng,KIND_WEIGHTS)
 card={'id':next_id(),'kind':kind,'log':log}
 if kind=='monster':
  frame=frame or pick(rng,FRAME_WEIGHTS)
  level=pick(rng,LEVELS[frame]);atk_from,def_from=_stats(rng,level)
  race,attr=pick(rng,PAIR_WEIGHTS)
  slot={'normal':'m_none','effect':'m_main','fusion':'m_fusion','ritual':'m_ritual'}[frame]
  card.update(frame=frame,slot=slot,level=level,race=race,attribute=attr,atk=atk_from['atk'],defense=def_from['defense'],
   name='',atk_from=atk_from['id'],def_from=def_from['id'])
  card['parts']={c:[] for c in CATEGORIES}
  if frame!='normal':
   card['parts']=settle(rng,_roll_parts(rng,slot,card),slot,log)
   if frame=='effect' and not card['parts']['acts']:
    # A Normal Monster keeps no pieces at all (an upkeep with no effect left once stayed in its data, seed 77).
    frame='normal';card.update(frame='normal',slot='m_none');card['parts']={c:[] for c in CATEGORIES}
    log.append('every effect was dropped: it became a Normal Monster')
  _match_type(rng,card,log)
  race,attr=card['race'],card['attribute']
  # Art from a real monster of this Type, so the picture fits; the name from any monster (user, Nov 17: names stay
  # completely random).
  art=_one_unused(rng,MONSTERS_BY_RACE[race],used,MONSTERS)
  name=_one_unused(rng,MONSTERS,used,MONSTERS)   # the art card is already used, so it is not picked again
  card.update(name=name['name'],name_from=name['id'],art_from=art['id'])
  _stat_budget(rng,card,log)
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
  card['type_line']='['+'/'.join([card['race']]+(['Fusion'] if frame=='fusion' else ['Ritual'] if frame=='ritual' else [])+(['Flip'] if flip else [])+(['Effect'] if has_effect else [])+(['Normal'] if frame=='normal' else []))+']'
  if frame=='normal':
   desc=(name['desc'] if name['type']=='Normal Monster' else None) or rng.choice(FLAVOR_BY_RACE.get(race) or NORMAL_FLAVOR)
   card['desc']=desc;card['flavor']=True
  else:card['desc']=effect_text(card)
  out=[card]
  if frame=='fusion':
   card['materials']=_fusion_materials(rng,race)
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
