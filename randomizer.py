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
import json,random,re
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
 'proton_blast':dict(fits={'t_cont'},text='Once per turn after a card effect tosses coins, inflict 500 damage per one or more Heads; with 2+ Heads destroy an opponent card; with 3+ Heads reveal their hand and discard 1; from GY, banish this card when 2+ coins are tossed to make all results Heads',real_only=True),
 'morphing_jar_two':dict(fits={'m_main'},text='FLIP: Shuffle all monsters on the field into their owners’ Decks; each player excavates until they reveal the same number of monsters shuffled into Deck, Special Summons all revealed Level 4 or lower monsters face-down in Defense, and sends the remaining excavated cards to the GY',real_only=True),
 'cyber_jar':dict(fits={'m_main'},text='FLIP: Destroy all monsters, then each player reveals 5 cards; Special Summon Level 4 or lower monsters from among them in face-up Attack or face-down Defense Position, and add remaining cards to hand',real_only=True),
 'vandalgyon':dict(fits={'m_main'},text='If a Counter Trap negates an opponent Spell/Trap/monster effect, Special Summon this card from hand; after it is Summoned, apply the corresponding Spell 1500 damage, Trap target destruction, and/or monster GY revival effects',real_only=True),
 'judgment_pharaoh':dict(fits={'t_normal'},text='Pay half your LP; if Yu-Jo Friendship is in your GY, prevent the opponent from Summoning or activating monster effects this turn and negate their monster effects; if Unity is in your GY, prevent their Spell/Trap activations and Sets and negate their Spell/Trap effects this turn',real_only=True),
 'dark_sage':dict(fits={'m_main'},text='Immediately after Time Wizard’s effect calls a coin toss right, Tribute 1 Dark Magician to Special Summon this card from hand or Deck, then add 1 Spell from Deck to hand',real_only=True),
 'trap_of_darkness':dict(fits={'t_normal'},text='If your LP is 3000 or less, pay 1000 LP and target a different Normal Trap in your GY; copy its effect, then banish that Trap',real_only=True),
 'serial_spell':dict(fits={'s_quick'},text='Activate only when you activate a Normal Spell: discard your entire hand as cost, then apply that Spell’s effect again',real_only=True),
 'double_spell':dict(fits={'s_normal'},text='Discard 1 Spell Card; target 1 Spell in your opponent’s GY, move it to the appropriate zone, and apply its effect as if you activated it',real_only=True),
 'major_riot':dict(fits={'t_normal'},text='Activate when an opponent effect returns one or more of your monsters from the field to your hand: return all monsters on the field to their owners’ hands, then each player Special Summons up to that many Level 4 or lower monsters from their hand face-down in Defense Position',real_only=True),
 'pandemonium':dict(fits={'s_field'},text='Archfiend monsters do not pay their Standby Phase LP costs; when an Archfiend monster is destroyed and sent to the GY by a non-battle effect, its controller can add a lower-Level Archfiend monster from Deck to hand',real_only=True),
 'thousand_eyes_restrict':dict(fits={'m_fusion'},text='Fusion Summon with Relinquished and Thousand-Eyes Idol; other monsters cannot attack or change battle positions; once per turn, equip an opponent monster to this card (max 1) and set its ATK/DEF equal to that monster’s; destroy the equipped monster instead if this card would be destroyed by battle',real_only=True),
 'arcana_knight_joker':dict(fits={'m_fusion'},text='Fusion Summon only with Queen’s Knight, Jack’s Knight, and King’s Knight; once per turn, when a Spell/Trap or monster effect targets this face-up card, discard a card of the same type to negate that effect',real_only=True),
 'chaos_emperor_envoy':dict(fits={'m_main'},text='Cannot be Normal Summoned/Set; Special Summon from hand by banishing 1 LIGHT and 1 DARK monster from your GY; once per turn, pay 1000 LP to send all cards on the field and in both hands to the GY, then inflict 300 damage per opponent card sent; no other effects can be activated that turn',real_only=True),
 'obelisk_divine_beast':dict(fits={'m_main'},text='Requires 3 Tributes to Normal Summon and cannot be Normal Set; its Normal Summon cannot be negated and its Summon prevents responses; cannot be targeted; if Special Summoned, send it to the GY during the End Phase; Tribute 2 monsters to destroy all opponent monsters, and it cannot attack that turn',real_only=True),
 'slifer_divine_beast':dict(fits={'m_main'},text='Requires 3 Tributes to Normal Summon, cannot be Normal Set, and its Normal Summon cannot be negated; its Summon prevents responses; if Special Summoned, send it to the GY during the End Phase; gains 1000 ATK/DEF per card in your hand; when your opponent summons an Attack Position monster, it loses 2000 ATK and is destroyed if reduced to 0',real_only=True),
 'ra_divine_beast':dict(fits={'m_main'},text='Requires 3 Tributes to Normal Summon, cannot be Normal Set or Special Summoned, and its Normal Summon cannot be negated; its Summon prevents responses; on Normal Summon, pay LP until you have 100 and gain that much ATK/DEF; pay 1000 LP to target and destroy a monster on the field',real_only=True),
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
AURAS['ultimate_insect_lv7']=dict(fits={'m_main'},text='If this card was Special Summoned by Ultimate Insect LV5, all monsters your opponent controls lose 700 ATK and DEF.',real_only=True)
ACTS['fairy_guardian_bottom_deck']=dict(fits={'m_main'},target=True,tclause='target 1 Spell in your GY that was sent there by your opponent’s effect this turn',text='place it on the bottom of your Deck',real_only=True)
AURAS['revival_jam_revive']=dict(fits={'m_main'},text='If this card is destroyed by battle, you can pay 1000 LP; during your next Standby Phase, Special Summon it from your GY in face-up Defense Position.',real_only=True)
ACTS['revival_jam_mark']=dict(fits={'m_main'},text='mark this card to be Special Summoned from the GY during your next Standby Phase',real_only=True)
ACTS['puppet_master_revive_two_fiends']=dict(fits={'m_main'},target=True,tclause='target 2 Fiend monsters in your GY',text='Special Summon them; they cannot attack this turn',ss=True,real_only=True)
CONDS['freechain_quick']=dict(kind='event',fits={'m_main'},text='(Quick Effect)',real_only=True)
COSTS['strike_ninja_banish_dark_gy']=dict(fits={'m_main'},spends=True,text='banish 2 DARK monsters from your GY as cost',real_only=True)
ACTS['strike_ninja_temp_banish']=dict(fits={'m_main'},text='banish this face-up card until the End Phase, then return it to the field',real_only=True)
AURAS['blade_knight']=dict(fits={'m_main'},text='If you have 1 or fewer cards in your hand, this card gains 400 ATK; if you control no other monsters, negate the effects of Flip monsters destroyed by battle with this card.',real_only=True)
AURAS['mystical_beast_serket']=dict(fits={'m_main'},text='Destroy this card if you do not control Temple of the Kings; monsters destroyed by battle with this card are banished, and it gains 500 ATK when it destroys a monster by battle.',real_only=True)
ACTS['catnipped_kitty_def_zero']=dict(fits={'m_main'},target=True,tclause='target 1 monster your opponent controls with nonzero DEF',text='its DEF becomes 0 until the End Phase',real_only=True)
AURAS['catnipped_kitty_protect']=dict(fits={'m_main'},text='This card cannot be targeted for attacks while you control another Beast monster.',real_only=True)
AURAS['malice_doll_revival']=dict(fits={'m_main'},text='If this card is sent from the field to the GY by a Continuous Spell, Special Summon it during your next Standby Phase.',real_only=True)
AURAS['rivalry_of_warlords']=dict(fits={'t_cont'},text='Each player can control only 1 monster Type; send their other face-up monsters to the GY and prevent Summons of another Type.',real_only=True)
AURAS['hourglass_of_courage']=dict(fits={'m_main'},text='When Normal or Flip Summoned, this card’s original ATK and DEF are halved until the End Phase of your next turn, then doubled.',real_only=True)
AURAS['jam_breeding_machine']=dict(fits={'s_cont'},text='During each of your Standby Phases, Special Summon 1 Slime Token; you cannot Summon monsters except Slime Tokens.',real_only=True)
AURAS['mirror_of_yata']=dict(fits={'s_equip'},text='The equipped Spirit monster may decline its return-to-hand effect; if it would be destroyed by battle, destroy this Equip Spell instead.',real_only=True)
AURAS['metalsilver_armor']=dict(fits={'s_equip'},text='While you control the equipped monster, your opponent cannot target other monsters with card effects.',real_only=True)
AURAS['sacred_phoenix_nephthys']=dict(fits={'m_main'},text='If destroyed by a card effect and sent to the GY, Special Summon this card during your next Standby Phase; if you do, destroy all Spells/Traps on the field.',real_only=True)
AURAS['talisman_sealing']=dict(fits={'s_cont','t_cont'},text='While you control Sealmaster Meisei, prevent the activation and effects of the specified card type; destroy this card if you no longer control that monster.',real_only=True)
AURAS['equip_indes_effect_targeted']=dict(fits={'s_equip'},text='The equipped monster cannot be destroyed by effects that target it.',real_only=True)
AURAS['equip_self_destroy_atk']=dict(fits={'s_equip'},text='Destroy this card if the equipped monster has {n} or more ATK.',n=R(1300,1300),real_only=True)
# Its limit only applies as monsters are placed, so a condition such as "While it is the Battle Phase" leaves it doing nothing
# (Discord 2026-11-26, a random Thousand Energy).
AURAS['kaiser_colosseum']=dict(fits={'s_cont'},no_conds=True,text='The opponent cannot control more monsters than you; Tribute Summons are restricted by the same monster limit.',real_only=True)
AURAS['guardian_kayest']=dict(fits={'m_main'},text='Cannot be Summoned without the named face-up support; unaffected by Spells and cannot be selected as an attack target.',real_only=True)
AURAS['suijin_attack_zero']=dict(fits={'m_main'},text='Once while face-up, when attacked during the opponent’s damage calculation, make the attacking monster’s ATK 0 for that calculation.',real_only=True)
AURAS['castle_gate']=dict(fits={'m_main'},text='Cannot be destroyed by battle; once per turn in Attack Position, Tribute a Level 5 or lower monster to inflict damage equal to its original ATK.',real_only=True)
AURAS['weather_report']=dict(fits={'m_main'},text='FLIP: Destroy all face-up Swords of Revealing Light your opponent controls; if any are destroyed, gain a second Battle Phase this turn.',real_only=True)
AURAS['penguin_knight']=dict(fits={'m_main'},text='If sent from your Deck to the GY by an opponent’s card effect, shuffle all cards in your GY into your Deck.',real_only=True)
AURAS['fox_fire']=dict(fits={'m_main'},text='Cannot be Tributed while face-up; if destroyed by battle while face-up, Special Summon it during that turn’s End Phase.',real_only=True)
AURAS['vampires_curse']=dict(fits={'m_main'},text='If destroyed by battle and sent to the GY, pay 500 LP during the next Standby Phase to Special Summon it; if Summoned this way, it gains 500 ATK.',real_only=True)
AURAS['skilled_magician']=dict(fits={'m_main'},text='Gain a Spell Counter when a Spell resolves; Tribute this card with 3 counters to Special Summon the named monster from your hand, Deck, or GY.',real_only=True)
AURAS['wandering_mummy']=dict(fits={'m_main'},text='Once per turn, change this face-up card to face-down Defense Position, then rearrange your face-down monsters.',real_only=True)
AURAS['darkbishop_archfiend']=dict(fits={'m_main'},text='Pay 500 LP during each Standby Phase or destroy this card; when an opponent effect targets a face-up Archfiend you control, roll a die and on 1, 3, or 6 negate it and destroy its source.',real_only=True)
AURAS['morale_boost']=dict(fits={'s_cont'},text='When an Equip Spell is equipped, its controller gains 1000 LP; when an Equip Spell leaves the field, its previous controller takes 1000 damage.',real_only=True)
AURAS['second_coin_toss']=dict(fits={'s_cont'},text='Once per turn, when you toss coins, you may redo that coin toss.',real_only=True)
AURAS['baou']=dict(fits={'s_equip'},text='Discard 1 card to activate; the equipped monster gains 500 ATK, and effects of monsters it destroys by battle are negated.',real_only=True)
AURAS['vampire_lord']=dict(fits={'m_main'},text='When this card inflicts battle damage, the opponent sends a declared type of card from their Deck to the GY; if destroyed by an opponent’s card effect, revive it during your next Standby Phase.',real_only=True)
AURAS['agent_of_force_mars']=dict(fits={'m_main'},text='Unaffected by Spell effects; while The Sanctuary in the Sky is active, gains ATK/DEF equal to your positive LP advantage.',real_only=True)
AURAS['agent_of_judgment_saturn']=dict(fits={'m_main'},text='While your LP are higher, Tribute this card to inflict the difference as damage; requires The Sanctuary in the Sky to resolve and skips your Battle Phase.',real_only=True)
AURAS['hino_kagu_tsuchi']=dict(fits={'m_main'},text='Cannot be Special Summoned; if this Spirit inflicts battle damage, the opponent discards their entire hand during their next Draw Phase.',real_only=True)
AURAS['juragedo']=dict(fits={'m_main'},text='Quick Effect: Special Summon this card from your hand during the Battle Step once per turn and gain 1000 LP; Quick Effect: Tribute this card to target a face-up monster you control and give it 1000 ATK until the End Phase.',real_only=True)
AURAS['exarion_universe']=dict(fits={'m_main'},text='Once per turn while attacking a Defense Position monster, lose 400 ATK until the End Phase to gain piercing battle damage.',real_only=True)
AURAS['tour_of_doom']=dict(fits={'t_cont'},text='During each opponent’s Standby Phase, toss a coin: Heads prevents their Normal/Flip Summons this turn; Tails prevents yours during your next turn.',real_only=True)
AURAS['nightmare_wheel']=dict(fits={'t_cont'},text='Target a monster: it cannot attack or change position; during each Standby Phase, inflict 500 damage to the opponent. Destroy this Trap if the target leaves the field.',real_only=True)
AURAS['axe_of_despair']=dict(fits={'s_equip'},text='The equipped monster gains 1000 ATK; if this card is sent from the field to the GY, Tribute 1 monster to place it on top of the Deck.',real_only=True)
AURAS['buster_rancher']=dict(fits={'s_equip'},text='During damage calculation, the equipped monster gains 2500 ATK if it battles a monster with more than 2500 ATK or DEF.',real_only=True)
AURAS['autonomous_action_unit']=dict(fits={'s_equip'},text='Pay 1500 LP to target an opponent’s GY monster; Special Summon it in Attack Position and equip this card to it. Destroy it if this card leaves the field.',real_only=True)
AURAS['fiends_sanctuary']=dict(fits={'s_normal'},text='Special Summon a 0 ATK/0 DEF Fiend Token that cannot attack and reflects battle damage to your opponent; during your Standby Phase pay 1000 LP or destroy it.',real_only=True)
AURAS['dora_of_fate']=dict(fits={'t_normal'},text='During your opponent’s turn, target their face-up monster with Level 2 or higher; if you Normal Summon a monster 1 Level lower this turn, inflict damage equal to the target’s Level x 500.',real_only=True)
AURAS['element_magician']=dict(fits={'m_main'},text='While a face-up WATER monster is on the field, control of this card cannot switch; while a face-up WIND monster is on the field, it can make another attack after destroying a monster by battle.',real_only=True)
AURAS['element_doom']=dict(fits={'m_main'},text='When this card destroys a monster by battle, the destroyed monster’s effects are negated if an EARTH monster is on the field; if a WIND monster is on the field, this card may attack again.',real_only=True)
AURAS['element_saurus']=dict(fits={'m_main'},text='Gains 500 ATK while a FIRE monster is on the field; if an EARTH monster is on the field, negate the effects of monsters it destroys by battle.',real_only=True)
AURAS['horus_lv4_control_lock']=dict(fits={'m_main'},text='Control of this face-up card cannot switch',real_only=True)
AURAS['gravekeepers_chief']=dict(fits={'m_main'},text='Only 1 face-up copy can be controlled; your GY is unaffected by Necrovalley; if Tribute Summoned, Special Summon a Gravekeeper from your GY.',real_only=True)
AURAS['spirits_invitation']=dict(fits={'t_cont'},text='When a face-up Spirit monster you controlled returns from the field to your hand, your opponent chooses a monster they control to return to hand; pay 500 LP during each of your Standby Phases or destroy this card.',real_only=True)
AURAS['sphinx_pyramid_summon']=dict(fits={'m_main'},text='Cannot be Special Summoned from the GY; pay 500 LP to Special Summon this card from your hand while Pyramid of Light is face-up; it cannot attack that turn and inflicts half the specified original stat when it destroys a Defense Position monster by battle.',real_only=True)
AURAS['theinen_great_sphinx']=dict(fits={'m_main'},text='Cannot be Special Summoned except by paying 500 LP when both Andro Sphinx and Sphinx Teleia you controlled are destroyed; it gains 3000 ATK by paying another 500 LP after its Special Summon.',real_only=True)
AURAS['gandora_dragon_destruction']=dict(fits={'m_main'},text='Cannot be Special Summoned; if Normal or Flip Summoned, send it to the GY in the End Phase. Pay half your LP to destroy all other cards on the field, banish them, and gain 300 ATK for each destroyed.',real_only=True)
AURAS['armed_dragon_lv5']=dict(fits={'m_main'},text='Once per turn, send a monster from your hand to the GY to target and destroy an opponent face-up monster with ATK no higher than the sent monster; during the End Phase, if this card destroyed a monster by battle this turn, send it to the GY to Special Summon Armed Dragon LV7 from your hand or Deck.',real_only=True)
AURAS['armed_dragon_lv7']=dict(fits={'m_main'},text='Cannot be Special Summoned except by Armed Dragon LV5; send a monster from your hand to the GY to destroy all opponent face-up monsters with ATK no higher than the sent monster.',real_only=True)
CONDS['spell_special_summon']=dict(kind='event',fits={'t_counter'},text='When a Spell Card activation that would Special Summon a monster can be negated',real_only=True)
COSTS['discard_spell_cost']=dict(fits={'t_counter'},spends=True,text='discard 1 Spell Card as cost',real_only=True)
AURAS['physical_double_token']=dict(fits={'t_normal'},text='During the opponent’s turn, target a face-up opponent monster with a Level; Special Summon a Mirage Token with its ATK, DEF, Level, Type, and Attribute, then destroy the Token during the End Phase.',real_only=True)
AURAS['cloning_token']=dict(fits={'t_normal'},text='When your opponent Normal or Flip Summons a monster with a Level, Special Summon a Clone Token with its original ATK, DEF, Level, Type, and Attribute; destroy the Token if that monster is destroyed.',real_only=True)
AURAS['exodia_necross']=dict(fits={'m_main'},text='Cannot be Special Summoned except by Contract with Exodia; cannot be destroyed by battle or Spell/Trap effects; gains 500 ATK during your Standby Phase; destroy this card unless all five Exodia pieces are in your GY.',real_only=True)
AURAS['behemoth_king_of_animals']=dict(fits={'m_main'},text='Can be Normal Summoned/Set with 1 Tribute, but its original ATK becomes 2000; when Tribute Summoned, target Beast monsters in your GY equal to the number Tributed and return them to your hand.',real_only=True)
AURAS['vampire_genesis']=dict(fits={'m_main'},text='Must be Special Summoned from hand by banishing a face-up Vampire Lord you control; once per turn, discard a Zombie monster to target and Special Summon a Zombie monster from your GY with a lower Level.',real_only=True)
AURAS['helpoemer']=dict(fits={'m_main'},text='Cannot be Special Summoned from the GY; if destroyed by battle and sent there, make your opponent discard a random card at the end of their next Battle Phase.',real_only=True)
AURAS['twin_headed_behemoth']=dict(fits={'m_main'},text='If destroyed on the field and sent to the GY, Special Summon this card during the End Phase with 1000 ATK/DEF; once per Duel.',real_only=True)
AURAS['gaia_soul_combustible_collective']=dict(fits={'m_main'},text='Tribute 1 or 2 Pyro monsters to gain 1000 ATK for each Tributed until the End Phase; inflicts piercing damage; destroy this card during the End Phase.',real_only=True)
AURAS['cocoon_moth_summon']=dict(fits={'m_main'},n=R(2,6),text='Special Summon this card from your hand by Tributing Cocoon of Evolution equipped to Petit Moth after {n} turns',real_only=True)
AURAS['cocoon_of_evolution']=dict(fits={'m_main'},text='From hand, equip this card to a face-up Petit Moth you control; while equipped, set that monster’s ATK/DEF to 0/2000 and count its controller’s End Phases for the Cocoon Moth summon procedures.',real_only=True)
AURAS['gradius_option']=dict(fits={'m_main'},text='Special Summon from hand while you control a face-up Gradius; select that Gradius, copy its ATK/DEF, and destroy this card if the selected Gradius leaves the field.',real_only=True)
AURAS['centrifugal_field']=dict(fits={'s_field'},text='When a Fusion Monster is destroyed by an effect and sent to the GY, its owner can Special Summon 1 Fusion Material Monster listed by that Fusion from their GY.',real_only=True)
AURAS['temple_of_the_kings']=dict(fits={'s_cont'},text='Once per turn, you may activate a Trap the turn it was Set; once per turn, send this card and a face-up Mystical Beast of Serket to the GY to Special Summon a monster from your hand, Deck, or a Fusion Monster from your Extra Deck.',real_only=True)
AURAS['spirit_of_the_pharaoh']=dict(fits={'m_main'},text='Can only be Special Summoned by the effect of The First Sarcophagus; when Special Summoned, Special Summon up to 4 Level 2 or lower Normal Zombie monsters from your GY.',real_only=True)
AURAS['blue_eyes_shining_dragon']=dict(fits={'m_main'},text='Special Summon from hand by Tributing Blue-Eyes Ultimate Dragon; gains 300 ATK for each Dragon in your GY; once per chain, negate a card effect that targets this card.',real_only=True)
AURAS['union_attack']=dict(fits={'s_normal'},text='During Main Phase 1, target a face-up monster you control; it cannot inflict battle damage to your opponent, other face-up Attack Position monsters cannot attack this turn, and at each Battle Phase start it gains ATK equal to your other face-up monsters until the end of that Battle Phase.',real_only=True)
AURAS['black_luster_soldier_envoy']=dict(fits={'m_main'},text='Special Summon from hand by banishing 1 LIGHT and 1 DARK monster from your GY; once per turn, target and banish a monster, but this card cannot attack that turn; if it destroys an opponent monster by battle, it can attack again.',real_only=True)
AURAS['de_fusion']=dict(fits={'s_quick'},text='Target a face-up Fusion Monster; return it to the Extra Deck, then, if it was Fusion Summoned and all of its Fusion Materials that were sent to your GY for that Summon remain there, you may Special Summon them.',real_only=True)
AURAS['monster_recovery']=dict(fits={'s_quick'},text='Target a monster you own and control; shuffle it and your hand into the Deck, then draw as many cards as were in your hand. Cannot be activated while your hand contains an opponent-owned card.',real_only=True)
AURAS['rare_metalmorph']=dict(fits={'t_cont'},text='Equip to a face-up Machine; it gains 500 ATK, and the first Spell effect that targets it is negated. Destroy this Trap if the equipped monster leaves the field.',real_only=True)
AURAS['equip_extra_attack']=dict(fits={'s_equip'},text='The equipped monster can make one additional attack each Battle Phase.',real_only=True)
AURAS['guardian_baou']=dict(fits={'m_main'},text='Cannot be Summoned unless Wicked-Breaking Flamberge - Baou is face-up; negate the effects of Effect Monsters destroyed by battle with this card, and gain 1000 ATK each time it destroys a monster by battle and sends it to the GY.',real_only=True)
AURAS['viser_des']=dict(fits={'m_main'},text='When Normal Summoned, target an opponent monster; this card cannot be destroyed by battle while that target remains, and destroy the target during your third Standby Phase after activation.',real_only=True)
AURAS['archfiend_required_summon']=dict(fits={'m_main'},text='Cannot be Normal or Flip Summoned unless you control another face-up Archfiend monster.',real_only=True)
AURAS['vilepawn_archfiend_guard']=dict(fits={'m_main'},text='Your opponent cannot select your other face-up Archfiend monsters as attack targets.',real_only=True)
AURAS['desrook_terorking_revive']=dict(fits={'m_main'},text='From your hand, send this card to the GY when your face-up Terrorking Archfiend is destroyed and sent from the field to the GY; target and Special Summon that Terrorking.',real_only=True)
ACTS['spatial_collapse']=dict(fits={'t_cont'},text='Activate only if each player has 5 or fewer cards on the field; each player can control at most 5 cards on the field, and excess cards are sent to the GY',real_only=True)
ACTS['ekibyo_drakmord']=dict(fits={'s_equip'},text='Equip to a monster; it cannot attack. At the end of its controller’s second turn after equipping, destroy it, then return this card to your hand if that monster was destroyed.',real_only=True)
ACTS['royal_oppression']=dict(fits={'t_cont'},text='Either player may pay 800 LP to negate a Special Summon, or negate and destroy a card/effect that would Special Summon a monster.',real_only=True)
AURAS['gearfried_equip_destroy']=dict(fits={'m_main'},text='Each time an Equip Card is equipped to this card, target and destroy 1 monster your opponent controls.',real_only=True)
AURAS['guardian_tryce']=dict(fits={'m_main'},text='Cannot be Summoned unless Twin Swords of Flashing Light - Tryce is face-up; if destroyed and sent to the GY, Special Summon the monster used for its Tribute Summon from the GY.',real_only=True)
AURAS['falling_down']=dict(fits={'s_equip'},text='During each opponent Standby Phase, inflict 800 damage to you; destroy this card unless you control a face-up Archfiend.',real_only=True)
AURAS['brain_jacker']=dict(fits={'m_main'},text='FLIP: equip this card to an opponent face-up monster and take control of it; during each of its controller’s Standby Phases, that opponent gains 500 LP.',real_only=True)
ACTS['spell_vanishing']=dict(fits={'t_counter'},text='when a Spell Card is activated, discard 2 cards; negate its activation and destroy it, then send every card with its name from your opponent’s hand and Deck to the GY',real_only=True)
ACTS['light_of_judgment']=dict(fits={'t_normal'},text='if The Sanctuary in the Sky is face-up, discard 1 LIGHT monster; then either send 1 card your opponent controls to the GY, or reveal their hand and send 1 card from it to the GY',real_only=True)
ACTS['soul_demolition']=dict(fits={'t_cont'},text='while you control a face-up Fiend, pay 500 LP; you and your opponent each target 1 Monster from the other player’s field or GY, then banish both',real_only=True)
ACTS['exchange_of_spirit']=dict(fits={'t_normal'},text='once per Duel, if each player has at least 15 cards in their GY, pay 1000 LP to swap each player’s Deck and GY',real_only=True)
ACTS['cybernetic_zone']=dict(fits={'s_quick'},text='target a face-up Machine Fusion Monster you control; temporarily banish it until the End Phase, double its original ATK when it returns, then destroy it during your next Standby Phase',real_only=True)
ACTS['necrovalley']=dict(fits={'s_field'},text='Gravekeeper monsters gain 500 ATK/DEF; prevent banishing cards from either GY, negate effects that move cards out of the GY or change cards there, and block non-activated Special Summons from the GY',real_only=True)
ACTS['mask_remnants_shuffle']=dict(fits={'s_normal'},text='send this card from the field to its owner’s Deck and shuffle it',real_only=True)
AURAS['masked_beast_des_gardius']=dict(fits={'m_main'},text='Special Summon from hand by Tributing 2 monsters, including Grand Tiki Elder or Melchid; if sent from the field to the GY, equip The Mask of Remnants from your Deck to an opponent face-up monster and take control of that monster.',real_only=True)
ACTS['dna_checkup']=dict(fits={'t_normal'},target=True,tclause='target 1 of your face-down monsters; your opponent declares 2 Attributes',text='reveal it; if its Attribute matches, your opponent draws 2 cards, otherwise you draw 2 cards',real_only=True)
ACTS['amplifier']=dict(fits={'s_equip'},text='equip only to Jinzo; Trap cards you control are unaffected by Jinzo’s effect; destroy the equipped Jinzo if this card leaves the field; this card’s activation/effect cannot be negated',real_only=True)
AURAS['gemini_imps']=dict(fits={'m_main'},text='From your hand, when your opponent activates an effect that could make you discard, send this card to the GY; negate and destroy that card, then draw 1.',real_only=True)
ACTS['tricky_spell_4']=dict(fits={'s_quick'},text='send a face-up The Tricky you control to the GY; Special Summon Defense Position Tricky Tokens equal to your opponent’s monsters; they cannot attack',real_only=True)
ACTS['lucky_chance']=dict(fits={'t_cont'},text='when a monster effect that tosses exactly 1 coin is activated, call Heads or Tails; if correct, draw 1 card immediately after that coin is tossed',real_only=True)
AURAS['ms_judge']=dict(fits={'m_main'},text='Once per turn, when your opponent’s card effect resolves, toss 2 coins; if both are Heads, negate that effect.',real_only=True)
ACTS['chosen_one']=dict(fits={'s_normal'},text='select 1 Special Summonable monster and 2 Spells/Traps from your hand; your opponent randomly chooses 1; Special Summon it if it is the monster, otherwise send all 3 to the GY',real_only=True)
ACTS['shift']=dict(fits={'t_normal'},text='when an opponent targets exactly 1 monster you control for an attack or with a targeting effect, target another appropriate monster you control and change the target',real_only=True)
ACTS['pole_position']=dict(fits={'t_cont'},text='face-up monsters with the highest ATK are unaffected by Spell effects; when this Trap leaves the field, destroy all face-up monsters with the highest ATK',real_only=True)
ACTS['spirit_elimination']=dict(fits={'s_normal'},text='until the End Phase, when monsters in your GY would be banished, banish monsters from your field as substitutes instead',real_only=True)
ACTS['flint']=dict(fits={'s_equip'},text='equip to a face-up monster; it loses 300 ATK and cannot attack or change battle position, except while equipped to an active Flint Lock; if the equipped monster is destroyed, equip Flint to another eligible monster',real_only=True)
ACTS['seven_trio']=dict(fits={'s_cont'},text='if you control exactly 3 face-up "7", draw 3 cards, then destroy all "7" cards on the field; if this card is sent from the field to the GY, gain 700 LP',real_only=True)
ACTS['different_dimension_gate']=dict(fits={'s_cont'},text='target 1 monster on each field and banish them; if this Trap is destroyed and sent to the GY, return those monsters to the field in their previous battle positions',real_only=True)
ACTS['graverobber']=dict(fits={'t_normal'},target=True,tclause='target 1 Spell in your opponent’s GY',text='add it to your hand until the End Phase; if you activate it, take 2000 damage',real_only=True)
COSTS['infernal_flame_banish_fire']=dict(fits={'m_main'},spends=True,text='banish 1 to 5 FIRE monsters from your GY as cost',real_only=True)
ACTS['infernal_flame_destroy_st']=dict(fits={'m_main'},text='destroy that many Spell/Trap Cards on the field, equal to the number banished for this effect',real_only=True)
AURAS['balloon_lizard']=dict(fits={'m_main'},text='Place 1 counter on this card during each of your Standby Phases; when destroyed, the player who destroyed it takes 400 damage per counter.',real_only=True)
ACTS['chain_disappearance']=dict(fits={'t_normal'},target=True,notarget=True,text='banish the summoned monster(s) with 1000 or less ATK, then banish all same-name cards from your opponent’s hand and Deck',real_only=True)
ACTS['thestalos_random_discard']=dict(fits={'m_main'},text='your opponent randomly discards 1 card; if it was a Monster, inflict damage equal to its Level x 100',real_only=True)
AURAS['amazoness_trainee']=dict(fits={'m_main'},text='Monsters destroyed by battle with this card are placed on the bottom of the Deck instead of the GY; it gains 200 ATK when it destroys a monster by battle.',real_only=True)
COSTS['skull_lair_banish']=dict(fits={'t_cont'},spends=True,text='banish any number of your Monster Cards from your field and/or GY as cost',real_only=True)
ACTS['skull_lair_destroy']=dict(fits={'t_cont'},text='destroy 1 face-up monster on the field whose Level equals the number banished for this effect',real_only=True)
AURAS['regulation_of_tribe']=dict(fits={'t_cont'},text='Declare a monster Type; monsters of that Type cannot attack, and during each of your Standby Phases Tribute a monster or destroy this card.',real_only=True)
ACTS['fake_trap_protect']=dict(fits={'t_normal'},text='reveal any targeted face-down Trap, then destroy this card instead of the opponent effect destroying your Trap Cards',real_only=True)
AURAS['archfiend_warden']=dict(fits={'m_main'},text='During your Standby Phase, pay {n} LP or destroy this card; if an opponent effect targets it, roll a die and on a specified result negate that effect and destroy its card.',real_only=True)
AURAS['archfiend_standby_boost']=dict(fits={'m_main'},text='During each Standby Phase, target a face-up Archfiend monster you control; it gains {n} ATK until the End Phase.',real_only=True)
AURAS['self_half_battle_damage']=dict(fits={'m_main'},text='Halve the Battle Damage this card inflicts to your opponent.',real_only=True)
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
AURAS['armor_exe']=dict(fits={'m_main'},text='Cannot attack the turn it is Summoned; during each Standby Phase remove 1 Spell Counter from your field or destroy this card.',real_only=True)
AURAS['dark_necrofear']=dict(fits={'m_main'},text='Special Summon from hand by banishing 3 Fiends from your field/GY; if destroyed from your Monster Zone by an opponent and sent to the GY, during the End Phase equip this card to an opponent monster and take control of it.',real_only=True)
ACTS['dice_re_roll']=dict(fits={'t_normal'},text='Once this turn, when either player rolls dice, you may reroll the same number of dice for that player.',real_only=True)
ACTS['level_conversion_lab']=dict(fits={'t_normal'},text='show a monster in your hand and roll a die; on 1 send it to the GY, otherwise change its Level to the result until the End Phase',real_only=True)
ACTS['last_will']=dict(fits={'s_normal'},text='If your monster was sent from the field to your GY this turn, optionally Special Summon a monster with 1500 or less ATK from your Deck; otherwise, wait until one is sent this turn, then you may do so once',real_only=True)
ACTS['mystical_refpanel']=dict(fits={'t_normal'},text='When a Spell that targets a player is activated, change its target player to the other player.',real_only=True)
ACTS['diffusion_wave_motion']=dict(fits={'s_normal'},text='Pay 1000 LP and target your Level 7+ Spellcaster; it must attack every opponent monster once, your other monsters cannot attack, and monsters it destroys by those attacks have their effects negated.',real_only=True)
ACTS['puppet_magic_dark_ruler']=dict(fits={'s_normal'},text='target a Fiend in your GY, banish monsters you control whose Levels exactly equal its Level, then Special Summon it',real_only=True)
ACTS['soul_exchange']=dict(fits={'s_normal'},text='target an opponent monster; it can be Tributed as though you controlled it this turn, and you cannot conduct your Battle Phase',real_only=True)
ACTS['cyber_archfiend']=dict(fits={'m_main'},text='At the start of your Draw Phase, if your hand is empty, you can draw 1; during your End Phase, destroy this card if you have a card in hand.',real_only=True)
ACTS['satellite_cannon']=dict(fits={'m_main'},text='Cannot be destroyed by battle with a Level 7 or lower monster; gains 1000 ATK during each of your End Phases, but loses that increase after it attacks.',real_only=True)
ACTS['aqua_spirit_position']=dict(fits={'m_main'},text='During each opponent Standby Phase, target one face-up opponent monster and change its battle position; it cannot change position again this turn.',real_only=True)
ACTS['megarock_dragon_proc']=dict(fits={'m_main'},text='Special Summon from hand by banishing one or more Rock monsters from your field/GY; this card’s original ATK/DEF become 700 times the number banished.',real_only=True)
ACTS['mucus_yolk_growth']=dict(fits={'m_main'},text='Each time this card inflicts battle damage to your opponent, it gains 1000 ATK during your next Standby Phase; the increase lasts while it remains face-up.',real_only=True)
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
ACTS['silent_swordsman_lv5']=dict(fits={'m_main'},text='Unaffected by your opponent’s Spell effects. If this card inflicts battle damage to your opponent by a direct attack, during your next Standby Phase you can send it to the GY to Special Summon Silent Swordsman LV7 from your hand or Deck, ignoring its Summoning conditions.',real_only=True)
ACTS['sword_hunter']=dict(fits={'m_main'},text='During the Battle Phase End, equip all monsters destroyed by battle with this card this turn from the GYs to this card; each equipped monster grants it 200 ATK',real_only=True)
ACTS['union_rider_steal_equip']=dict(fits={'m_main'},target=True,tclause='target 1 face-up Union Monster your opponent controls',text='take control of it and equip it to this card; it cannot use its own effect to Special Summon itself',real_only=True)
CONDS['union_rider_unencumbered']=dict(kind='state',fits={'m_main'},text='this card has not equipped an opponent Union Monster with this effect',real_only=True)
ACTS['insect_queen']=dict(fits={'m_main'},text='This card gains 200 ATK for each face-up Insect monster on the field; Tribute 1 monster as an attack cost; once per turn during the End Phase, if this card destroyed an opponent monster by battle this turn, Special Summon 1 Insect Monster Token (Insect/EARTH/Level 1/ATK 100/DEF 100) in Attack Position',real_only=True)
COSTS['ninjitsu_transform_tribute']=dict(fits={'t_cont'},spends=True,text='Tribute 1 face-up Ninja monster; its Level sets the summonable monster Level limit to 3 higher',real_only=True)
ACTS['ninjitsu_transform_summon']=dict(fits={'t_cont'},text='Special Summon 1 Beast, Winged Beast, or Insect monster from your hand or Deck whose Level is no higher than the Tributed Ninja’s Level plus 3, then target it with this card',real_only=True)
ACTS['ninjitsu_transform_leave_destroy']=dict(fits={'t_cont'},text='When this card leaves the field, destroy the monster it Special Summoned',real_only=True)
ACTS['union_generic']=dict(fits={'m_main'},text='Once per turn, equip this Union Monster to a face-up matching monster you control, or Special Summon it from an Equip Card; the equipped monster gains {n} ATK/DEF and this card can be destroyed instead if that monster would be destroyed by battle',real_only=True)
ACTS['spiritual_energy_settle']=dict(fits={'s_cont'},text='Spirit monsters on the field cannot return to the hand; when this card leaves the field, return all face-up Spirit monsters to the hand; during each of your End Phases, you may discard 1 card, otherwise destroy this card',real_only=True)
ACTS['reaper_on_nightmare']=dict(fits={'m_fusion'},text='Cannot be destroyed by battle; when this card inflicts battle damage by a direct attack, your opponent randomly discards 1 card; destroy this card after it becomes targeted by a card effect; this card can attack directly',real_only=True)
ACTS['legion_fiend_jester']=dict(fits={'m_main'},text='While face-up, you can Tribute Summon 1 Spellcaster in addition to your Normal Summon/Set; if this card is sent from the field to the GY, add 1 Spellcaster Normal Monster from your Deck or GY to your hand once per turn',real_only=True)
ACTS['super_robo_pair']=dict(fits={'m_fusion'},text='During the Damage Step, this card gains 1000 ATK while battling (Super Roboyarou) or attacking directly (Super Robolady); except the turn it was Summoned, return this card to the Extra Deck to Special Summon its paired Fusion Monster from your Extra Deck',real_only=True)
ACTS['archlord_zerato']=dict(fits={'m_main'},text='Cannot be Special Summoned except by Tributing 1 Zera while The Sanctuary in the Sky is face-up; while that Field Spell is face-up on your field, discard 1 LIGHT monster to destroy all monsters your opponent controls',real_only=True)
ACTS['contact_cannon']=dict(fits={'m_fusion'},text='Contact Fusion by banishing the listed face-up materials you control; cannot be Special Summoned from the GY; discard 1 card to target and destroy an opponent card matching {filter}',real_only=True)
ACTS['ultimate_insect_lv']=dict(fits={'m_main'},text='If Special Summoned by the previous Ultimate Insect Level, your opponent’s monsters lose {n} ATK; during your Standby Phase, except the turn Summoned, send this card to the GY to Special Summon Ultimate Insect LV{l} from your hand or Deck, ignoring Summoning conditions',real_only=True)
ACTS['tyrant_dragon']=dict(fits={'m_main'},text='If your opponent controls a monster after this card’s first attack, it can attack twice; negate and destroy Trap effects that target it; to Special Summon this card from the GY, Tribute 1 Dragon',real_only=True)
ACTS['pumpking_king_of_ghosts']=dict(fits={'m_main'},text='Gains 100 ATK/DEF for each of your Standby Phases while Castle of Dark Illusions is face-up, and an additional 100 ATK/DEF while that card is face-up',real_only=True)
ACTS['pitch_dark_dragon']=dict(fits={'m_main'},text='Once per turn, equip this Union Monster to Dark Blade or Special Summon it from an Equip Card; the equipped monster gains 400 ATK/DEF, can inflict piercing battle damage, and is protected from battle destruction once per turn',real_only=True)
ACTS['beast_union_damage']=dict(fits={'m_main'},text='Equip this Union Monster to its paired Beast; if the equipped monster inflicts battle damage to your opponent, target and destroy a {filter} on either field',real_only=True)
ACTS['zombie_tiger_union']=dict(fits={'m_main'},text='Once per turn, equip this Union Monster to Decayed Commander or Special Summon it from an Equip Card; the equipped monster gains 500 ATK/DEF, and when it destroys a monster by battle, your opponent randomly discards 1 card',real_only=True)
ACTS['second_goblin_union']=dict(fits={'m_main'},text='Once per turn, equip this Union Monster to Giant Orc or Special Summon it from an Equip Card; while equipped, once per turn change the equipped monster’s battle position; Union battle-destruction protection applies',real_only=True)
ACTS['des_dendle_union']=dict(fits={'m_main'},text='Once per turn, equip this Union Monster to Vampiric Orchis or Special Summon it from an Equip Card; when the equipped monster destroys a monster by battle, Special Summon 1 Plant/EARTH/Level 1 Token (800/800); Union battle-destruction protection applies',real_only=True)
ACTS['kiryu_union']=dict(fits={'m_main'},text='Once per turn, equip this Union Monster to Dark Blade or Special Summon it from an Equip Card; the equipped monster gains 900 ATK/DEF and can gain a direct attack this turn by Tributing this card; Union battle-destruction protection applies',real_only=True)
ACTS['koitsu_union']=dict(fits={'m_main'},text='Once per turn, equip this Union Monster to Aitsu or Special Summon it from an Equip Card; the equipped monster gains 3000 ATK and piercing battle damage; Union battle-destruction protection applies',real_only=True)
ACTS['ryu_senshi']=dict(fits={'m_fusion'},text='Fusion Summon with Warrior Dai Grepher and Spirit Ryu; pay 1000 LP to negate a Trap activation; negate targeted Spell effects and destroy their source',real_only=True)
ACTS['fiend_skull_dragon']=dict(fits={'m_fusion'},text='Fusion Summon with the listed materials; disable Flip monsters and negate their Flip effects; negate Trap effects that target this card; Summoner of Illusions cannot destroy this card during the End Phase',real_only=True)
ACTS['dark_balter']=dict(fits={'m_fusion'},text='Fusion Summon with the listed materials; pay 1000 LP to negate Normal Spell effects; monsters this card destroys by battle have their effects negated',real_only=True)
ACTS['dark_paladin']=dict(fits={'m_fusion'},text='Fusion Summon with Dark Magician and Buster Blader; discard 1 card to negate a Spell activation and destroy it; gains 500 ATK for each face-up or GY Dragon',real_only=True)
ACTS['sorcerer_dark_magic']=dict(fits={'m_main'},text='Cannot be Special Summoned except from hand by Tributing 2 Level 6+ Spellcasters; during either turn, negate Trap activations and destroy those Traps',real_only=True)
ACTS['battle_scarred']=dict(fits={'t_cont'},text='Select an Archfiend monster; during each Standby Phase, its controller pays its LP cost and the opponent pays the same amount; destroy the selected monster if this card leaves, and destroy this card if the monster leaves',real_only=True)
ACTS['metallizing_parasite_lunatite']=dict(fits={'m_main'},text='Once per turn, equip this Union Monster to a face-up monster or Special Summon it from an Equip Card; while equipped, the monster is unaffected by your opponent’s Spell effects and has Union battle-destruction protection',real_only=True)
ACTS['human_wave_tactics']=dict(fits={'t_cont'},text='During each End Phase, Special Summon from your Deck as many Level 2 or lower Normal Monsters as you controlled that were destroyed by battle and sent to your GY this turn',real_only=True)
ACTS['hex_sealed_fusion']=dict(fits={'m_main'},text='Substitute this card for any Fusion Material; while on the field, Tribute it and other valid field Fusion Materials to Special Summon a {attr} Fusion Monster from your Extra Deck',real_only=True)
ACTS['combination_attack']=dict(fits={'s_quick'},text='During the Battle Phase, target a monster that has attacked and Special Summon its equipped Union Monster(s); it can attack again this turn',real_only=True)
ACTS['orb_of_yasaka']=dict(fits={'s_equip'},text='Equip only to a Spirit monster; when it destroys a monster by battle and sends it to the GY, recover LP equal to that monster’s original ATK; if this card is sent to the GY because its equipped Spirit returned to hand, return it to your hand',real_only=True)
ACTS['cybernetic_fusion_support']=dict(fits={'s_quick'},text='Once per turn, pay half your LP; this turn, when you Fusion Summon a Machine Fusion Monster, use monsters from your hand, field, or GY as materials and banish them',real_only=True)
ACTS['sword_of_soul_eater']=dict(fits={'s_equip'},text='Equip only to your Level 3 or lower Normal Monster; when activated, Tribute your other non-Token Normal Monsters and grant 1000 ATK for each monster Tributed',real_only=True)
ACTS['mazera_deville']=dict(fits={'m_main'},text='Cannot be Special Summoned except by Tributing a face-up Zera while Pandemonium is present; if Summoned while Pandemonium is present, your opponent randomly discards up to 3 cards',real_only=True)
ACTS['great_dezard']=dict(fits={'m_main'},text='Each monster it destroys by battle counts toward its effects: after one, negate and destroy targeted Spell/Trap activations; after two, Tribute it to Special Summon Fushioh Richie from hand/Deck',real_only=True)
ACTS['fushioh_richie']=dict(fits={'m_main'},text='Once per turn, change this face-up card to face-down Defense Position; when Flip Summoned, Special Summon a Zombie from your GY; negate and destroy card activations that target it',real_only=True)
ACTS['pitch_black_power_stone']=dict(fits={'t_cont'},text='Activate with 3 Spell Counters; once per turn during your turn, move 1 counter from this card to another face-up card that can hold Spell Counters; destroy this card when empty',real_only=True)
ACTS['prepare_to_strike_back']=dict(fits={'t_cont'},text='When your opponent attacks your face-up Defense Position monster, call a coin: if correct, change it to Attack Position; if wrong, take battle damage equal to the ATK/DEF difference',real_only=True)
ACTS['roulette_spider']=dict(fits={'s_quick'},text='When your opponent declares an attack, roll a die: halve your LP; make it a direct attack; choose one of your monsters or another opposing monster and calculate damage; negate the attack and inflict attacker ATK damage; or destroy the attacker',real_only=True)
ACTS['dark_magician_of_chaos']=dict(fits={'m_main'},text='During your End Phase after this card was Summoned this turn, add a Spell from your GY to your hand; banish monsters it destroys by battle; banish this face-up card if it leaves the field',real_only=True)
ACTS['mirage_knight']=dict(fits={'m_main'},text='Special Summoned only by Dark Flare Knight; during damage calculation, gains the battling opponent monster’s original ATK; banish this card during the End Phase if it battled this turn',real_only=True)
ACTS['pyro_clock']=dict(fits={'t_normal'},text='Select an effect that counts turns and resolve that effect once, advancing its count by one',real_only=True)
ACTS['deck_devastation_virus']=dict(fits={'t_normal'},text='Tribute a DARK monster with 2000+ ATK; reveal and destroy opponent monsters with 1500 or less ATK, then for the next 3 opponent turns do the same to monsters they draw',real_only=True)
ACTS['crush_card_virus']=dict(fits={'t_normal'},text='Tribute a DARK monster with 1000 or less ATK; reveal/destroy opponent monsters with more than 1500 ATK in hand/field, optionally destroy up to 3 more from Deck, and prevent their effect damage through their next turn',real_only=True)
ACTS['valkyrion_magna_warrior']=dict(fits={'m_main'},text='Special Summon from hand by Tributing Alpha, Beta, and Gamma the Magnet Warriors; Tribute this card to target and Special Summon those three from your GY',real_only=True)
ACTS['tiki_peace']=dict(fits={'t_cont'},text='Special Summon this Trap as an Effect Monster (Rock/EARTH/Level 4/1800/1800); Quick Effect: pay 800 LP to Special Summon a different Continuous Trap from GY/banishment as a Level 4 Rock/EARTH Normal Monster (1000/1000), named Tiki Peace even face-down and not treated as a Trap; once per turn',real_only=True)
ACTS['formation_union']=dict(fits={'t_normal'},text='Choose one: equip a face-up Union Monster you control to an appropriate monster you control, or Special Summon a face-up equipped Union Monster from your Spell/Trap Zone in Attack Position',real_only=True)
ACTS['blast_magician']=dict(fits={'m_main'},text='Place a Spell Counter on this card after a Spell activation resolves; remove enough of its Spell Counters to destroy a face-up monster with ATK no greater than 700 times the number removed',real_only=True)
ACTS['ocean_dragonlord']=dict(fits={'m_main'},text='Cannot be Special Summoned except by Tributing Levia-Dragon - Daedalus; send face-up Umi you control to the GY as cost to send all cards in both players’ hands and on the field to the GY except this card',real_only=True)
ACTS['wicked_eraser']=dict(fits={'m_main'},text='Cannot be Special Summoned; must be Normal Summoned or Set by Tributing 3 monsters; its ATK/DEF equal the number of cards your opponent controls x 1000; during your Main Phase, you can destroy this card, and if it is destroyed and sent to the GY, destroy all cards on the field',real_only=True)
ACTS['blast_sphere']=dict(fits={'m_main'},text='If attacked while face-down in Defense Position, equip this card to the attacker; during your opponent’s next Standby Phase, destroy that monster and inflict damage equal to its ATK',real_only=True)
ACTS['ultimate_insect_lv1']=dict(fits={'m_main'},text='Unaffected by Spell effects; during your Standby Phase, except the turn it was Summoned, send it to the GY to Special Summon Ultimate Insect LV3 from your hand or Deck ignoring its Summoning conditions',real_only=True)
ACTS['toon_mermaid_extra']=dict(fits={'m_main'},text='Special Summon from your hand by Tributing {n} monster(s) while Toon World is face-up; if the opponent controls a Toon, this card cannot attack directly and must attack a face-up Toon',n=R(0,2),real_only=True)
ACTS['toon_attack_cost']=dict(fits={'m_main'},text='Pay 500 LP each time this card declares an attack',real_only=True)
AURAS['toon_dmg_gy_atk']=dict(fits={'m_main'},text='This card gains 300 ATK for each Dark Magician or Magician of Black Chaos in either GY',real_only=True)
ACTS['silent_magician_lv4']=dict(fits={'m_main'},text='Place a Spell Counter when your opponent draws; this card gains 500 ATK per Spell Counter, up to 5; during your Standby Phase at 5 counters, send this card to the GY to Special Summon Silent Magician LV8 from your hand or Deck ignoring its Summoning conditions',real_only=True)
ACTS['fiendish_engine_omega']=dict(fits={'m_main'},text='During your End Phase, Special Summon 1 Engine Token (Machine/EARTH/Level 1/ATK 200/DEF 200); once per turn, this card can gain 1000 ATK until the End Phase, then destroy it during that End Phase',real_only=True)
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
# the opponent picks the Spell when it resolves (no target): "You can target 1 Spell Card in your GY chosen by your
# opponent" read as both at once (Discord Nov 24, "Goddess of Whim")
ACTS['pixie_knight_spell_topdeck']=dict(fits={'m_main'},text='your opponent chooses 1 Spell in your GY to place on top of your Deck',real_only=True)
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
CONDS['damage_or_reversed_recover_to_you']=dict(kind='event',fits={'t_counter'},text='When an activated effect would inflict effect damage to you, or recover your LP while recovery is reversed',real_only=True)
ACTS['reflect_effect_damage']=dict(fits={'t_counter'},text='Reflect that effect damage to your opponent instead.',real_only=True)
ACTS['trap_of_board_eraser']=dict(fits={'t_counter'},text='if your opponent has a card in hand, prevent the effect damage you would take from this Chain, then your opponent discards 1 card',real_only=True)
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
ACTS['gatling_dragon_coin_destroy']=dict(fits={'m_fusion'},text='toss 3 coins; destroy as many monsters on the field as possible, up to the number of Heads',real_only=True)
AURAS['rock_spirit_opp_battle_atk']=dict(fits={'m_main'},text='This card gains 300 ATK during your opponent’s Battle Phase.',real_only=True)
AURAS['snatch_steal_control']=dict(fits={'s_equip'},text='Take control of the equipped opponent monster while this card remains equipped.',real_only=True)
AURAS['snatch_steal_recover']=dict(fits={'s_equip'},text='During each opponent Standby Phase, your opponent gains 1000 LP.',real_only=True)
AURAS['bes_big_core']=dict(fits={'m_main'},text='Place 3 counters on Normal Summon; cannot be destroyed by battle; at the end of each Damage Step it battles, remove 1 counter or destroy this card if no counter remains.',real_only=True)
AURAS['ultimate_obedient_fiend']=dict(fits={'m_main'},text='Cannot attack while you control another card or have cards in your hand; Effect Monsters destroyed by battle with this card have their effects negated.',real_only=True)
AURAS['ojama_king_zone_lock']=dict(fits={'m_fusion'},text='Choose up to 3 of your opponent’s Main Monster Zones; they cannot use those zones while this card is face-up.',real_only=True)
ACTS['victory_dragon_tribute']=dict(fits={'m_main'},text='Can only be Tribute Summoned by Tributing 3 Dragon monsters; it cannot be Special Summoned',real_only=True)
ACTS['shifting_shadows_shuffle']=dict(fits={'s_cont'},text='shuffle all of your face-down monsters in your Main Monster Zones, then return them to face-down Defense Position',real_only=True)
AURAS['bottomless_shifting_sand']=dict(fits={'t_cont'},text='At the end of your opponent’s turn, destroy the face-up monster(s) with the highest ATK; during your Standby Phase, destroy this card if you have 4 or fewer cards in hand.',real_only=True)
ACTS['mask_of_dispel']=dict(fits={'s_cont'},target=True,text='target 1 face-up Spell Card on the field; its controller takes 500 damage during each of your Standby Phases, and destroy this card if the target leaves the field',real_only=True)
COSTS['card_of_demise_lock']=dict(fits={'s_normal'},spends=True,text='you cannot Special Summon for the rest of this turn, and you must not have Special Summoned this turn',real_only=True)
ACTS['card_of_demise_draw']=dict(fits={'s_normal'},text='draw until you have 3 cards in your hand; your opponent takes no damage this turn; during the End Phase send your hand to the GY',real_only=True)
ACTS['archfiend_of_gilfer_equip']=dict(fits={'m_main'},target=True,grave=True,text='equip this card from your GY to a face-up monster; it loses 500 ATK',real_only=True)
COSTS['virus_cannon_tribute']=dict(fits={'t_normal'},spends=True,text='Tribute any number of non-Token monsters (at least 1)',real_only=True)
ACTS['virus_cannon_mill']=dict(fits={'t_normal'},text='your opponent sends that many Spell Cards from their Deck to the GY, or all of them if they have fewer',real_only=True)
ACTS['lava_golem_procedure']=dict(fits={'m_main'},text='Special Summon this card from your hand to your opponent’s field by Tributing 2 monsters they control; you cannot Normal Summon or Set the turn you do this',real_only=True)
AURAS['lava_golem_standby_burn']=dict(fits={'m_main'},text='During the Standby Phase of this card’s controller, inflict 1000 damage to that player.',real_only=True)
ACTS['jigen_bakudan_arm']=dict(fits={'m_main'},text='during your next Standby Phase, Tribute this card to destroy all monsters you control and inflict damage equal to half their combined ATK',real_only=True)
ACTS['super_rejuvenation_draw']=dict(fits={'s_quick'},text='during the End Phase this turn, draw 1 card for each Dragon monster you discarded or Tributed from your hand or field this turn',real_only=True)
CONDS['fairy_hand_mirror_window']=dict(kind='event',fits={'t_normal'},text='When your opponent activates a Spell Card that targets exactly 1 monster on the field',real_only=True)
ACTS['fairy_hand_mirror_redirect']=dict(fits={'t_normal'},target=True,text='target another appropriate monster; that Spell now targets it instead',real_only=True)
ACTS['dark_renewal']=dict(fits={'t_normal'},target=True,text='target the opponent’s Summoned monster and 1 Spellcaster you control; send both to the GY, then you can Special Summon a DARK Spellcaster from your Deck or GY',real_only=True)
ACTS['multiplication_of_ants_tokens']=dict(fits={'s_normal'},ss=True,text='Special Summon 2 Insect/EARTH Level 4 Army Ant Tokens (500 ATK/1200 DEF) that cannot be Tributed for a Tribute Summon',real_only=True)
ACTS['archfiend_roar_summon']=dict(fits={'t_normal'},target=True,text='target 1 Archfiend monster in your GY; Special Summon it, it cannot be Tributed, and destroy it during the End Phase',real_only=True)
ACTS['equip_revive_destroy']=dict(fits={'s_equip'},target=True,text='Special Summon the targeted monster from your GY and equip this card to it; if this Equip Card is destroyed, destroy that monster',real_only=True)
ACTS['bubble_crash']=dict(fits={'t_normal'},text='if either player has 6 or more cards in their hand and on the field, each player who does sends cards of their choice to the GY until they have 5',real_only=True)
ACTS['abyssal_designator']=dict(fits={'s_normal'},text='pay 1000 LP; declare an Attribute and a Type, then your opponent sends 1 matching monster from their hand or Deck to the GY',real_only=True)
ACTS['secret_of_bandit']=dict(fits={'s_normal'},target=True,text='target 1 face-up monster; until the End Phase, whenever it inflicts Battle Damage to your opponent, they discard 1 random card',real_only=True)
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
CONDS['big_shield_targeted_spell']=dict(kind='event',fits={'m_main'},text='When an opponent activates a Spell Card that targets this card',real_only=True)
ACTS['big_shield_negate_spell']=dict(fits={'m_main'},ctx='big_shield_targeted_spell',text='negate the activation, and if you do, destroy that Spell Card',real_only=True)
ACTS['big_shield_change_attack']=dict(fits={'m_main'},text='change this card to face-up Attack Position at the end of the Damage Step if it was attacked in face-down Defense Position',real_only=True)
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
ACTS['bait_doll']=dict(fits={'s_normal'},target=True,tclause='target 1 Set card in either Spell & Trap Zone',text='reveal it; if it is a Trap Card that can be activated now, apply its effect, otherwise destroy it if its activation is illegal; reveal a non-Trap and leave it Set; shuffle this card into the Deck',real_only=True)
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
# each face says what it does, as on the real card (Discord Nov 24, "Forest": "apply the result: discard, draw, ...");
# its Lua: 1 you discard, 2 your opponent discards, 3 you draw, 4 your opponent draws, 5 destroy 1 of their monsters,
# 6 destroy this card
AURAS['dangerous_machine_type6']=dict(fits={'s_cont'},text='During each of your Standby Phases, roll a six-sided die and apply the result. 1: You discard 1 card. 2: Your opponent discards 1 card. 3: You draw 1 card. 4: Your opponent draws 1 card. 5: Destroy 1 monster your opponent controls. 6: Destroy this card.',real_only=True)
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
COSTS['send_hand_for_equip']=dict(fits={'s_equip'},spends=True,text='send {n} card{s} from your hand to the GY',n=R(1,1),real_only=True)
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
CONDS['level8_mzone_sent_this_turn']=dict(kind='state',fits={'s_quick'},text='A Level 8 or higher monster you controlled was sent from the field to the GY this turn',real_only=True)
ACTS['deal_with_dark_ruler_summon']=dict(fits={'s_quick'},text='Special Summon Berserk Dragon from your hand or Deck',ss=True,real_only=True)
AURAS['mercury_empty_hand_draw']=dict(fits={'m_main'},text='If you control this face-up monster and have no cards in hand at the end of the opponent’s turn, draw 1 card during your next Standby Phase.',real_only=True)
ACTS['neko_mane_end_phase']=dict(fits={'m_main'},text='make it the End Phase of this turn',real_only=True)
ACTS['dark_ruler_hades_no_gy_ss']=dict(fits={'m_main'},text='This card cannot be Special Summoned from the GY',real_only=True)
AURAS['dark_ruler_hades_fiend_battle_negate']=dict(fits={'m_main'},text='Negate the effects of monsters destroyed by battle with Fiend monsters you control',real_only=True)
AURAS['unhappy_girl_battle_lock']=dict(fits={'m_main'},text='Cannot be destroyed by battle while in face-up Attack Position; monsters that battle it cannot attack or change position while it remains there',real_only=True)
AURAS['magical_marionette_counters']=dict(fits={'m_main'},text='Each resolving Spell activation places a Spell Counter on this card; it gains 200 ATK per counter',real_only=True)
AURAS['spell_counter_per_spell_activation']=dict(fits={'m_ritual'},text='Each resolving Spell activation places a Spell Counter on this card.',real_only=True)
AURAS['spell_canceller']=dict(fits={'m_main'},text='Neither player can activate Spell effects; negate the effects of Spell Cards on the field.',real_only=True)
AURAS['freed_matchless_general']=dict(fits={'m_main'},text='Negate and destroy Spell Cards that target this card; during your Draw Phase, you can replace your draw with a Level 4 or lower Warrior from your Deck.',real_only=True)
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

# ---------------------------------------------------------------- real-card data (user, Nov 19)
# Randomized cards follow the game's own cards. tools/build_randomizer_templates.py reads the recreation of every real
# card as blocks and writes data/randomizer-templates.json: per slot, how often real cards use each block, how many of
# their effects are always-on, have a timing, a condition or a cost; and real uses of the blocks below. A template
# block copies the parameters of one real use ("target 1 Spell/Trap your opponent controls; return it to the hand"),
# picked from the same kind of card when there is one, so randomized cards say what real ones say, as often.
# Values: generator settings the recreation does not need (labels, mandatory triggers, where the card is).
TEMPLATE_META={
 # effects
 'move_target':dict(label='Target'),'move_all':dict(label='Activate'),'move_select':dict(label='Activate'),
 'ss_filtered':dict(label='Special Summon',ss=True),'ss_target':dict(label='Special Summon',ss=True),
 'search_sel':dict(label='Add to hand'),'damage_per_sel':dict(label='Damage'),'stat_mod_target':dict(label='Change stats',target=True),
 'take_control_target':dict(label='Take control'),'destroy_any_st':dict(label='Destroy'),
 # always-on
 'attr_atk_mod_all':dict(gen_text='All {attr} monsters on the field {attr_change_verb} {n} ATK'),
 'stat_mod_aura':dict(gen_text='All {filter} {attr_change_verb} {n} {stat}'),   # gen_text: generated wording only (gain/lose, no full stop)
 # timings (forced: the effect is mandatory, so the text has no "You can"; gy: this card is in the GY then)
 'summon_trigger':dict(),'flip_summoned':dict(forced=True),'sent_to_gy':dict(gy=True),'this_card_battle_damage_to_opp':dict(),
 'normal_summoned_mandatory':dict(forced=True),'battle_destroyed_mandatory':dict(forced=True,gy=True),
 'summon_event':dict(repeat=True),'destroyed_opp_by_battle_sent_gy':dict(forced=True),'any_special_summoned':dict(forced=True),
 # conditions
 'hand_count':dict(),'control_sel':dict(),
 # costs and restrictions
 'tribute_sel':dict(spends=True),'send_self_mzone':dict(spends=True,leaves=True,field=True),'equip_only':dict(slots={'s_equip'}),   # slots: only these (Premature Burial-style Continuous Spells errored)
}
def _load_real():
 try:return json.loads((ROOT/'data/randomizer-templates.json').read_text(encoding='utf8'))
 except (OSError,ValueError):return {}
REAL=_load_real()
# Every block the recreation maps real cards with is rolled too (user, Nov 19), except these, which failed the test
# (forced onto cards and played in the duel engine: a Lua error, never used, or text that does not read right).
# Gate of Nov 19 (tools/randomizer_template_gate.py): 879 blocks tested, these failed; a second run turned off 26 more.
TEMPLATE_OFF={
 # Whole effects with their own trigger, not pieces ("when this card inflicts Battle Damage, ..."; Nov 19).
 'vampire_lady','agido_die_revive','great_phantom_thief','recover_from_gy','delayed_battle_destroy','steel_scorpion_delayed_destroy','card_of_demise_lock',
 # Fourth gate (Nov 19, after the template tool fix brought back blocks): never used, never on the field, Lua errors.
 # Kept on although rarely used alone: damage_self (a splitter's loss outcome).
 'anti_spell_fragrance','atk_down_if_opp_monster','banished_faceup','battle_destroyed_mon_to_deck','buster_rancher','chaosrider_banish_spells','chaosrider_boost','control_all_low_level_opp','cross_counter','cross_counter_window','dark_ruler_hades_fiend_battle_negate','des_counterblow','destroy_attack_target','dna_surgery','draw_if_flipped_battle_destroyed','electric_virus_control','element_dragon_fire_wind','element_soldier','equip_no_attack_non_machine','equip_return_top','equip_return_top_pay','fairy_guardian_bottom_deck','fatal_abacus','final_attack_orders','flip_mandatory','flipped_then_sent_gy','graverobber','greed','hand_sent_by_opp','infernal_flame_destroy_st','insect_imitation_tribute','jam_defender','light_of_intervention','magical_marionette_counters','metalsilver_armor','mirror_of_yata','mysterious_guard','negate_spell_activation_faceup','no_spells_traps_activation_turn','opp_negatable_spell_activate','pixie_knight_spell_topdeck','puppet_master_revive_two_fiends','reveal_target','royal_decree','self_lose_atk_def_per_hand','spell_counter_per_spell_activation','ss_self_banished_dino_boost','ss_up_to_n_filtered','tribute_summoned','unfriendly_amazon_upkeep','unhappy_girl_battle_lock',
 # Spirit and Toon are card kinds now (MONSTER_KINDS), not loose effects (Nov 19).
 'spirit_return','toon_world_destroyed','toon_direct_summon_lock',
 # Third gate (Nov 19): never used, Lua errors (persistent-target code), or a loop (minor_goblin_official).
 'roulette_barrel_dice_destroy',   # carries its own "once per turn, roll two dice" (showed up inside a call splitter)
 'attacked_while_defense','beckoning_light','choose_attack_target','covering_fire','destroyed_not_battle','dna_transplant','emperor_holiday','equip_lock_opp_position','flip_summon_forced','lekunga_banish_water','manticore_send_cost','neko_mane_end_phase','neko_mane_sent_opp_effect','riryoku','spellbinding_circle','ss_all_banished_both','wall_of_revealing_light','xing_zhen_hu','minor_goblin_official',
 # Replaced by the coin / call / die splitters (user, Nov 19): their outcomes are now built from ordinary blocks.
 'sand_gambler','jirai_gumo_coin','gambler_of_legend','coin_destroy_battling','kryuel_coin_destroy_opp','dicephoon','cup_of_ace_effect','time_wizard_coin','paths_of_destiny','goddess_of_whim_coin','graceful_dice','snipe_hunter_dice_destroy','dangerous_machine_type6','fairy_box',
 # Second gate (Nov 19): never used in 4-10 cards' duels, or never rolled.
 'added_to_hand_from_deck_by_effect','attacks_facedown','banished_monsters','beast_soul_swap','changed_from_attack_to_defense','damage_battle_target_level','decktop_attacker','discard_dragon_cost','equip_lp','gilasaurus_procedure_summoned','hero_emerges','kiseitai','maharaghi_next_draw','miracle_restoring','opp_flip_summon','opp_monster_ss_facedown','owner_seal','remove_self_spell_counter','ss_mokey_any_gy','st_destroyed_opp','supply_fusion_materials','thousand_energy','throwstone_warrior_tribute','tribute_labyrinth_pair','tribute_level_for_fusion','zolga_recover',
 'activate_any','activator_may_draw','amazoness_archers_attack','amazoness_archers_effect','amazoness_becomes_target',
 'amazoness_scouts_protect','amazoness_swap_original_atk','ancient_lamp_attacked_facedown','ancient_lamp_redirect',
 'any_special_summoned','apprentice_place_counter','archfiend_general_search','archfiend_roar_summon',
 'attacked_by_weaker','ballista_rampart_smashing','banish_all_monsters_deck_gy','banished_cards',
 'banished_race_count','batteryman_charger_summon','battle_damage_2000_plus','battle_damage_event',
 'battled_face_down_target','big_bang_shot','big_wave_small_wave','blast_with_chain_destroy',
 'blast_with_chain_destroyed','bounder_damaged_battle','butterfly_dagger','changed_from_defense_to_attack',
 'chaos_no_attack','continuous_type_activated','control_changed','cursed_seal_discard_spell','cursed_seal_negate',
 'cyber_archfiend','cyber_raider_choice','damage_battle_attacker','dark_coffin','dark_master_zorc_dice',
 'dark_renewal','dark_snake_syndrome','deal_with_dark_ruler_summon','delta_attacker','demotion',
 'destroy_attacked_this_card','destroy_equipped_event','destroy_payoff_target','destroy_special_summoned',
 'destroy_target_opp','destroy_trap_negator','destroy_two_own_one_opp','destroyed_anywhere',
 'destroyed_face_down_monster','destroyed_face_down_trap','destroyed_insect_by_battle','dice_re_roll',
 'diffusion_wave_motion','disable_continuous_type_until_end','disc_fighter','discard_self_hand','discard_wind_cost',
 'dragonic_attack','dramatic_rescue','draw_effect_player_target','effect_damage_to_you','elemental_burst_cost',
 'enchanting_fitting_room','equip_card_equipped','equip_revive','equip_revive_destroy',
 'equip_spell_from_gy','equipped_to_this','fairy_hand_mirror_redirect','fairy_hand_mirror_window','fake_trap_protect',
 'fear_from_dark_sent','fiends_hand_mirror_spell_targets_st','flip_search_or_top','furinkazan_four_attributes',
 'germ_infection','gilford_three_tribute_summon','gravekeeper_attacks_necrovalley','hand_discarded_by_opp',
 'heart_of_underdog','hiro_shadow_scout','hydro_pressure_cannon','judgment_of_anubis','last_will',
 'legacy_hunter_facedown_destroy','legacy_hunter_return_random','level8_mzone_sent_this_turn','level_up_lv',
 'lightning_blade','lock_positions_turn','machine_duplication','mage_power','magic_drain','magic_reflector',
 'magical_dimension','magical_scientist_fusion','manticore_end_phase','manticore_revive','mask_of_accursed',
 'mask_of_brutality_upkeep','mausoleum_summon','meanae_search_choice','megamorph','miracle_restoring_remove_counters',
 'mokey_mokey_smackdown','monster_effect_any','move_target_n_if_available','muko_replace_draw','mystical_refpanel',
 'necklace_of_command','necrovalley_environment','negate_destroying_activation','negate_discard_effect',
 'negate_effect_only','negate_spell_activation','non_effect_monsters_spell_immune','normal_quick_spell_resolved',
 'ominous_fortunetelling','one_attack_per_battle_phase','opp_attack_deck_cost','opp_discard_effect',
 'opp_effect_would_destroy_monster','opp_may_ss_from_gy','opp_monster_changed_facedown',
 'opp_monster_changed_to_defense','opp_monster_reborn','opp_spell_activation_negatable','opp_spell_would_destroy_st',
 'opp_targets_monster_gy','orca_mega_fortress','pot_of_greed_activation','puppet_magic_dark_ruler','raregold_armor',
 'recover_tribute_stat','redirect_spell_st_target','reflect_effect_damage','remove_spell_counters_all',
 'remove_spell_counters_cost','remove_three_self_spell_counters','return_equip_no_activate',
 'return_from_different_dimension','return_high_level_draw','return_self_end_phase','return_self_gy_hand',
 'returned_faceup_to_deck','reveal_opp_set_card','reveal_opp_set_spell_traps','ring_of_magnetism','rod_of_minds_eye',
 'rod_silence_kayest','scroll_bewitchment','search_ritual','sebek_recover_damage','self_direct_attack_turn',
 'self_set_main_phase','send_equipped','send_extra_to_gy','send_fire_monster_cost','seven_completed','shallow_grave',
 'shuffle_either_deck','shuffle_own_deck','skull_knight_fiend_tribute_material','smoke_grenade_thief',
 'snatch_steal_control','snatch_steal_recover','soul_absorbing_bone_tower_mill','spear_cretin_revive_both',
 'special_summon_forced','special_summoned_from_gy','spell_activate_negatable','spell_targets_one_monster',
 'spiral_spear_strike','ss_dark_scorpions_unique','ss_fusion_from_extra','ss_fusion_same_level','ss_self_gy',
 'ss_self_gy_swap_base','ss_skull_knight_copy','st_targets_zombie','standby_defense','standby_empty_hand','stim_pack',
 'stray_lambs_lock','summon_dark_magician','summon_same_race','summon_try_any','summon_wall_shadow',
 'swap_target_base_atk_def','sword_dragon_soul','tailor_of_the_fickle','targeted_spelltrap_destroy_activation',
 'tiki_soul_protect','trap_monster_effect','twin_barrel_coin_destroy','united_we_stand','unnegatable','wicked_token',
 'wingbeat_dragon','yado_karu_bottom_deck','yado_karu_defense_change','your_direct_battle_damage',
 'your_monster_destroyed_by_effect','your_standby_phase','zombie_special_summoned',
}
def _use_reads_well(cat,key,meta,use):
 # The block's text filled with this real use's parameters: no gap left by a missing parameter, no "{...}".
 try:
  text=_fmt((meta.get('tclause','')+' '+meta.get('gen_text',meta.get('text',''))).replace('{what}','card'),{'k':key,**use[1]},{'slot':use[0],'name':'X'})
 except (KeyError,IndexError,ValueError,TypeError):return False
 return not re.search(r'\{|\}|  |\bNone\b| a  | an  ',text.strip())

def _enable_templates(keys):
 """Turns real-card blocks on for the generator: real uses as templates ([slot, parameters, timing, effect kind]),
 rolled only in the slots real cards use them in. An effect whose every real use has a timing comes with one of
 those timings (ctx_events: "destroy the monster this card battled" needs a battle)."""
 for k in keys:
  uses=REAL.get('templates',{}).get(k);cat=next((c for c,t in CATEGORIES.items() if k in t),None)
  if not uses or cat is None:continue
  meta=CATEGORIES[cat][k]
  if cat=='acts':
   # Built as always-on (AURAS) or activated: only real uses of that kind (rules are not rolled).
   uses=[u for u in uses if len(u)<4 or u[3]==('continuous' if k in AURAS else 'activated')]
   if not uses:continue
   if k not in AURAS:meta.setdefault('label','Activate')
   events={u[2] if len(u)>2 else None for u in uses}
   if None not in events:meta['ctx_events']=events
  for x,v in {**TEMPLATE_META.get(k,{}),**REAL.get('lua',{}).get(k,{})}.items():meta.setdefault(x,v)
  # Windows ("During your Battle Phase, if this card is attacking", "During damage calculation") open again and again:
  # settle() gives them Once per turn (Nov 19: without it, test duels looped tens of thousands of times).
  if cat=='conds' and meta.get('kind')=='event' and re.match(r'During\b',meta.get('text','')):meta.setdefault('repeat',True)
  uses=[u for u in uses if _use_reads_well(cat,k,meta,u)]
  if not uses:continue
  meta.pop('real_only',None);meta['templates']=uses
  meta['roll_fits']={u[0] for u in uses}&set(meta['fits'])&set(TEMPLATE_META.get(k,{}).get('slots',meta['fits']))   # where real cards use it
 for cache in ('_CANDIDATES','_WEIGHTS','_SAMPLE_WEIGHTS','_USE_WEIGHTS'):
  if cache in globals():globals()[cache].clear()
# (turned on at the end of this file: the check of each real use needs _fmt)
STRUCTURE=REAL.get('structure',{})
# Unique mechanics and instant wins keep their own (very low) weights; draws stay rarer than on real cards (user,
# Nov 17); blocks real cards of a slot never use can still turn up, rarely (UNSEEN of a real use).
KEEP_WEIGHT=set(UNIQUE_ACTS)|set(UNIQUE_RULES)|WIN_ACTS|WIN_CONDS
USER_FACTOR={'draw':.5,'shuffle_hand_draw_same':.5}
UNSEEN=.35
_WEIGHTS={}
# Effect families (user, Nov 19: no kind of effect, gambles for one, more common than on real cards). The share of
# effect cards in each family was measured on real cards and on generated ones (tools/randomizer_families.py); a block
# (and a real use of a template block) whose text falls in a family is weighted by its factor, set by that tool's
# calibration so every family lands near its real share.
EFFECT_FAMILIES={
 'gamble':r'(?i)toss|coin|\bdie\b|dice','burn':r'(?i)inflict \d+|inflict damage','gain LP':r'(?i)gain \d+ (LP|Life Points)|increase your Life Points',
 'draw':r'(?i)\bdraw \d|\bdraw (a|1|2|3) card','search':r'(?i)add .{0,60}(from your|to your) (deck|hand)',
 'special summon':r'(?i)(?<!cannot be )(?<!Cannot be )special summon','destroy':r'(?i)\bdestroy','bounce':r'(?i)return .{0,40}to (the|its owner\'s|their) hand',
 'banish':r'(?i)banish|remove .{0,40}from play','negate':r'(?i)\bnegate','stats':r'(?i)(gains?|loses?) \d+ (ATK|DEF)|ATK and DEF',
 'position':r'(?i)defense position|attack position|face-down','discard':r'(?i)discard','mill':r'(?i)top \d* ?cards? of .{0,25}deck to the (GY|Graveyard)',
 'control':r'(?i)take control|control of','attack lock':r'(?i)cannot (declare an )?attack','piercing/direct':r'(?i)piercing|attack directly|difference between .{0,40}DEF',
 'upkeep':r'(?i)standby phase.{0,40}pay|pay \d+ .{0,40}or destroy this card',
}
FAMILY_FACTORS={"gamble": 0.34, "burn": 0.803, "gain LP": 0.596, "draw": 1.05, "search": 1.601, "special summon": 1.847, "destroy": 0.901, "bounce": 0.22, "banish": 0.726, "negate": 2.249, "stats": 0.365, "position": 1.034, "discard": 1.379, "control": 1.054, "attack lock": 0.998, "piercing/direct": 0.197, "upkeep": 0.15, "mill": 0.5}   # calibrated by tools/randomizer_families.py --calibrate; gamble and mill nudged by hand (Nov 19)
_USE_WEIGHTS={}
_DEST={'hand':' to the hand','deck':' into the Deck','grave':' to the GY','decktop':' on top of the Deck'}
_FAMILY_TEXT={'coin':'toss a coin','call':'toss a coin','dice_mult':'roll a die','dice_branch':'roll a die',
 'upkeep':'During your Standby Phase, pay 500 LP or destroy this card','curse_damage':''}
def _family_factor(text):
 f=1.0
 for fam,rx in EFFECT_FAMILIES.items():
  if fam in FAMILY_FACTORS and re.search(rx,text):f*=FAMILY_FACTORS[fam]
 return f
def _block_family_factor(key,meta,slot):
 """A block's family factor: of its text, or the average over the real uses of a template block."""
 if key in _FAMILY_TEXT:return _family_factor(_FAMILY_TEXT[key])
 base=(meta.get('tclause','')+' '+meta.get('gen_text',meta.get('text',''))).replace('{n}','500')
 uses=meta.get('templates')
 if not uses:return _family_factor(base)
 fs=[]
 for u in uses[:40]:
  try:fs.append(_family_factor(_fmt(base,{'k':key,**u[1]},{'slot':u[0],'name':'X'})+_DEST.get(u[1].get('to'),'')))
  except Exception:fs.append(_family_factor(base))
 return sum(fs)/len(fs)
def _slot_weights(cat,slot,keys):
 """Weights for one slot: real use counts, scaled so all of them together weigh what the hand-set weights did
 (so the unique mechanics keep their share)."""
 if (cat,slot) in _WEIGHTS:return _WEIGHTS[cat,slot]
 real=REAL.get('counts',{}).get(slot,{}).get(cat,{})
 fam={k:_block_family_factor(k,CATEGORIES[cat][k],slot) for k in keys} if FAMILY_FACTORS else {}
 base={k:BLOCK_WEIGHTS.get(k,TIERS['uncommon']) for k in keys}
 if not real or cat=='others':
  out={k:v*fam.get(k,1) for k,v in base.items()};_WEIGHTS[cat,slot]=out;return out
 free=[k for k in keys if k not in KEEP_WEIGHT]
 raw={k:(real.get(k,0) or UNSEEN)*USER_FACTOR.get(k,1) for k in free}
 scale=sum(base[k] for k in free)/max(sum(raw.values()),1e-9)
 out={**base,**{k:v*scale for k,v in raw.items()}}
 out={k:v*fam.get(k,1) for k,v in out.items()}
 _WEIGHTS[cat,slot]=out;return out

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
def _vary_side(rng,p):
 """Real uses mostly hit the opponent; sometimes the same effect reads "on the field" (both sides) or, for returning a
 card to the hand, "you control" (user, Nov 19: those options too). The filter text follows the side."""
 f=str(p.get('filter',''));side=p.get('side');r=rng.random()
 if side=='opp' and 'your opponent controls' in f and p.get('to') in ('destroy','banish','hand','grave') and r<.15:
  p.update(side='both',filter=f.replace('your opponent controls','on the field'))
 elif side=='opp' and 'your opponent controls' in f and p.get('to')=='hand' and r<.25:
  p.update(side='you',filter=f.replace('your opponent controls','you control'))
 elif side=='both' and 'on the field' in f and r<.15:
  p.update(side='opp',filter=f.replace('on the field','your opponent controls'))

def _roll_block(rng,cat,key,card):
 spec={'k':key};meta=CATEGORIES[cat][key]
 spec.update(meta.get('fixed',{}))   # parameters a rotation block always has (ROTATION)
 if meta.get('templates'):
  # A real use of this block, from the same kind of card when there is one (TEMPLATE_META).
  slot=card.get('slot');uses=[u for u in meta['templates'] if u[0]==slot] or meta['templates']
  if FAMILY_FACTORS and len(uses)>1:
   if (key,slot) not in _USE_WEIGHTS:   # worked out once per block and slot (phones make 1,000 cards at run start)
    base=(meta.get('tclause','')+' '+meta.get('gen_text',meta.get('text','')))
    def uf(u):
     try:return _family_factor(_fmt(base,{'k':key,**u[1]},{'slot':u[0],'name':'X'})+_DEST.get(u[1].get('to'),''))
     except Exception:return 1.0
    _USE_WEIGHTS[key,slot]=[uf(u) for u in uses]
   use=rng.choices(uses,_USE_WEIGHTS[key,slot])[0]
  else:use=rng.choice(uses)
  spec.update(json.loads(json.dumps(use[1])))
  if key in ('move_target','move_all','move_select'):_vary_side(rng,spec)
  return spec
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
 return not meta.get('branch_only') and slot in meta['fits'] and (not slots or slot in slots) and slot in meta.get('roll_fits',meta['fits'])   # templates: real slots only

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

_SAMPLE_WEIGHTS={}
def _sample(rng,keys,count,cat=None,slot=None):
 # Weighted picks without repeats (the same block twice is never useful). With a slot: real-card weights, worked out
 # once per list of candidates (a test forcing a block with a huge BLOCK_WEIGHTS entry skips the cache).
 keys=list(keys);out=[]
 w=_slot_weights(cat,slot,_candidates(cat,slot,{})) if cat and slot else {}
 weight=lambda x:BLOCK_WEIGHTS[x] if BLOCK_WEIGHTS.get(x,0)>=1000 else w.get(x,BLOCK_WEIGHTS.get(x,TIERS['uncommon']))
 forced=max(BLOCK_WEIGHTS.values(),default=0)>=1000
 cache=None if forced else (cat,slot,tuple(keys))
 ws=_SAMPLE_WEIGHTS.get(cache) if cache else None
 if ws is None:
  ws=[weight(x) for x in keys]
  if cache:_SAMPLE_WEIGHTS[cache]=ws
 ws=list(ws)
 while keys and len(out)<count:
  i=rng.choices(range(len(keys)),ws)[0];out.append(keys.pop(i));ws.pop(i)
 return out

# Bundles (user, Nov 19): a big real-card block made of steps that already exist as blocks rolls as those steps. It keeps
# its own weight, so the whole combination turns up exactly as often as the big block did, and each step also rolls on
# its own. link 'if_done': the step happens only if the one before did ("and if you do").
def _sel(p):
 return {x:v for x,v in p.items() if x in ('side','zone','kind','faceup','race','attr','level_max','level_min','atk_max','pos','filter')}
BUNDLES={
 'destroy_target_mill_opp':lambda p:[{'k':'move_target',**_sel(p),'n':1,'to':'destroy'},{'k':'mill_opp','n':p.get('n',2)}],
 'destroy_draw_target':lambda p:[{'k':'move_target','side':'you','zone':'field','n':1,'to':'destroy','filter':'1 card you control'},{'k':'draw','n':1,'link':'if_done'}],   # your own card (user, Nov 19)
 'destroy_damage_both':lambda p:[{'k':'move_target',**_sel(p),'n':1,'to':'destroy'},{'k':'damage_both','n':p.get('n',1000),'d':p.get('n',1000),'link':'if_done'}],
 'blast_held_by_tribute':lambda p:[{'k':'move_all','side':'opp','zone':'mzone','kind':'monster','faceup':True,'pos':'attack','to':'destroy',
   'filter':'face-up Attack Position monsters your opponent controls'},{'k':'damage','n':1000,'link':'if_done'}],
 'relieve_monster':lambda p:[{'k':'move_target','side':'you','zone':'mzone','kind':'monster','n':1,'to':'hand','filter':'1 monster you control'},{'k':'ss_hand'}],
 'creator_revival':lambda p:[{'k':'discard_hand','n':1},{'k':'ss_target','side':'you','zone':'gy','kind':'monster','n':1,'filter':'1 monster in your GY'}],
}
def _unbundle(acts):
 """Big blocks into their steps. A bundle is the whole effect: other effects rolled with it are dropped (2 steps max)."""
 if not any(a['k'] in BUNDLES for a in acts):return acts
 a=next(a for a in acts if a['k'] in BUNDLES)
 out=BUNDLES[a['k']]({x:v for x,v in a.items() if x!='k'});out[0]['bundle']=a['k']   # tests find the bundle by name
 for x in out:x['part']=True   # a step of a bundle: fits where its block fits, keeps its amount
 return out

def _chain(acts,card,act_text=None):
 """Effects in order: ", then" between steps, ", and if you do," before a step that needs the one before it."""
 texts=[(act_text or _act_text)(p,card) for p in acts]
 if not any(p.get('link')=='if_done' for p in acts[1:]):return _join(texts,', then ')
 out=texts[0]
 for p,t in zip(acts[1:],texts[1:]):out+=(', and if you do, ' if p.get('link')=='if_done' else ', then ')+t
 return out

# How much likelier a cost, timing or condition is on strong effects (user, Nov 16), around the real rates.
POWER_MULT=(.8,1.3,1.7)
EQUIP_ONLY=.55   # real Equip Spells: 39 of 70 say which monsters they equip to

def _roll_parts(rng,slot,card):
 st=STRUCTURE.get(slot)
 if not st:return _roll_parts_classic(rng,slot,card)
 # Real-card structure: always-on or activated, then a timing, condition and cost at the slot's real rates.
 parts={c:[] for c in CATEGORIES}
 needs=slot not in MONSTER_SLOTS|{'m_none','s_ritual'} or card.get('frame')=='effect'
 chance=None
 if slot in EFFECT_CHANCE:chance=max(st['effect'],.15)   # Fusion/Ritual Monsters, Ritual Spells: real share, at least 15%
 if chance is None or rng.random()<chance:
  keys=_candidates('acts',slot,card);auras=[k for k in keys if k in AURAS];active=[k for k in keys if k not in AURAS]
  pool=keys
  if auras and active:pool=auras if rng.random()<st['always_on'] else active
  count=_roll_count(rng,'acts',1 if needs or chance is not None else 0,slot)
  parts['acts']=_unbundle([_roll_block(rng,'acts',k,card) for k in _sample(rng,pool,count,'acts',slot)])
 acts=parts['acts'];aura=bool(acts) and acts[0]['k'] in AURAS;m=POWER_MULT[_power(acts)]
 ckeys=_candidates('conds',slot,card)
 events=[k for k in ckeys if CONDS[k]['kind']=='event'];states=[k for k in ckeys if CONDS[k]['kind']=='state']
 if card.get('level',0)<5:events=[k for k in events if k!='tribute_summoned']   # only a Level 5+ monster is Tribute Summoned
 # An effect real cards only use after certain timings ("destroy the monster this card battled") brings one of them.
 linked=[a for a in acts if ACTS.get(a['k'],{}).get('ctx_events')]
 if linked:
  ok=set(events)
  for a in linked:ok&=ACTS[a['k']]['ctx_events']
  if ok:
   uses=ACTS[linked[0]['k']]['templates']
   pick_from=[u[2] for u in uses if u[2] in ok and u[0]==slot] or [u[2] for u in uses if u[2] in ok]
   parts['conds'].append(_roll_block(rng,'conds',rng.choice(pick_from),card))
  else:parts['acts']=acts=[a for a in acts if a not in linked]
 timed=any(CONDS[p['k']]['kind']=='event' for p in parts['conds'])
 if acts and not aura and not timed and events and rng.random()<min(.95,st['timing']*m):parts['conds']+=[_roll_block(rng,'conds',k,card) for k in _sample(rng,events,1,'conds',slot)]
 if acts and states and rng.random()<min(.8,(st['aura_state'] if aura else st['state'])*m):parts['conds']+=[_roll_block(rng,'conds',k,card) for k in _sample(rng,states,1,'conds',slot)]
 if acts and not aura and rng.random()<min(.9,st['cost']*m):parts['costs']=[_roll_block(rng,'costs',k,card) for k in _sample(rng,_candidates('costs',slot,card),1,'costs',slot)]
 for cat in ('limits','others'):
  count=_roll_count(rng,cat,0,slot)
  parts[cat]=[_roll_block(rng,cat,k,card) for k in _sample(rng,_candidates(cat,slot,card),count,cat,slot)]
 if slot=='s_equip' and 'equip_only' in _candidates('limits',slot,card) and rng.random()<EQUIP_ONLY:
  parts['limits']=[p for p in parts['limits'] if p['k']!='equip_only']+[_roll_block(rng,'limits','equip_only',card)]
 return parts

def _roll_parts_classic(rng,slot,card):
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

FREE_IN_DEAL={'control_named'}   # 'needed' pieces real cards also use alone
_RELAXED=[False]   # the deal checks real effects: no piece caps, Quick-Play Spells may have timings
# Contradictions (user, Nov 19: "make sure contradictory effects can't happen"): a condition that a place is empty, and
# a cost or action that needs a card from that place ("if you have no cards in your hand: discard 1 card").
EMPTY_PLACE={'no_monsters':(r"monsters? you control|you control \d+ |Tribute|your face-up monster|equipped monster",'you control no monsters'),
 'gy_empty':(r"(from|in) your GY|both GYs|either GY|each GY|your GY",'your GY is empty'),
 'standby_empty_hand':(r"discard|from your hand|in your hand|reveal .* hand",'your hand is empty')}
def _contradiction(parts,slot):
 conds=parts.get('conds',[])
 empty=[(p['k'],)+EMPTY_PLACE[p['k']] for p in conds if p['k'] in EMPTY_PLACE]
 empty+=[('hand_count',)+EMPTY_PLACE['standby_empty_hand'] for p in conds if p['k']=='hand_count' and p.get('n')==0 and p.get('mode')!='min' and p.get('side')!='opp']
 if not empty:return None
 card={'slot':slot,'name':'X'}
 texts=[]
 for cat in ('costs','acts'):
  for i,p in enumerate(parts.get(cat,[])):
   meta=CATEGORIES[cat].get(p['k'],{})
   try:t=_fmt(meta.get('tclause','')+' '+meta.get('gen_text',meta.get('text','')),p,card)
   except Exception:t=meta.get('text','')
   texts.append((cat,i,t))
 for key,rx,why in empty:
  for cat,i,t in texts:
   if re.search(rx,t):return cat,i,f'contradiction: {why}, but it needs a card there'
  # a monster on the field is a monster you control, so its effect cannot need "you control no monsters"
  if key=='no_monsters' and slot[0]=='m' and not any(ACTS.get(p['k'],{}).get('hand') for p in parts.get('acts',[])) \
     and not (_event(parts) and CONDS.get(_event(parts),{}).get('gy')):return 'conds',0,'contradiction: this monster is a monster you control'
 return None

SUMMONS_SELF=re.compile(r'Special Summon this card',re.I)
HAND_SUMMON=re.compile(r'Special Summon this card from (?:your )?hand',re.I)
def _place_contradiction(parts):
 """A timing that happens to this card on the field ("If this card destroys a monster by battle") with an action
 that needs it in the hand ("Special Summon this card from your hand")."""
 ev=_event(parts)
 if not ev:return None
 et=CONDS.get(ev,{}).get('text','')
 # "if this Defense Position card was attacked" is about this card on the field too (Nov 21, Ultimate Insect LV5)
 if ev!='flip' and not re.search(r'\bthis (?:face-up |face-down |Set |(?:Defense|Attack) Position )*(?:card|monster)\b|this face-up',et,re.I):return None
 if re.match(r'(?i)from your hand\b',et) or re.search(r'(?i)this card is in your hand',et):return None   # a hand timing
 for i,p in enumerate(parts.get('acts',[])):
  meta=CATEGORIES['acts'].get(p['k'],{})
  if meta.get('hand') or HAND_SUMMON.search(meta.get('text','')):return 'acts',i,'contradiction: the timing needs this card on the field or in the GY, the action needs it in the hand'
 # costs too: "FLIP: You can discard this card from your hand" (Nov 20)
 for i,p in enumerate(parts.get('costs',[])):
  if SELF_FROM_HAND.search(COSTS.get(p['k'],{}).get('text','')):return 'costs',i,'contradiction: the timing needs this card on the field or in the GY, the cost needs it in the hand'
 return None
SELF_FROM_HAND=re.compile(r'(?i)discard this card|this card from your hand|reveal this card')

# Texts a dealt effect must not read like (Nov 20 review of a full deal). Each is (what the text says, what must come
# before it in the same effect): a step dealt without the step it refers to ("Gain LP equal to the Tributed monster's
# ATK", "When that monster is destroyed, destroy the Token"), a timing after which this card is gone with an action that
# needs it on the field ("If this card is sent from the field to the GY: ... equip it to this card").
ORPHANS=[(r'for each (?:Spell/Trap|card|monster) sent\b',r'\bsend\b'),(r'for each (?:Spell/Trap|card|monster) discarded\b',r'\bdiscard'),
 (r'for each (?:Spell/Trap|card|monster) banished\b',r'\bbanish'),(r'the Tributed monster',r'Tribut'),(r'monsters? Tributed for this card',r'Tribut'),(r'\bthat draw\b',r'\bdraw'),(r"\bthat player\b",r'player'),(r'\bremember it\b',r'(?!)'),
 (r'the attacking monster',r'attack'),(r'the destroyed monster',r'destroy'),(r'the [Bb]attle [Dd]amage',r'[Bb]attle|attack|inflicts? damage'),
 (r'\b(?:that|those) (?:monsters?|cards?|target|Spells?/Traps?|Spells|Traps)\b(?! (?:is|are) activated)',r'monster|card|target|Spell|Trap|Summon|activat'),
 (r'\bthe targeted\b',r'\btarget'),(r'\bthat many\b',r'\d|number|discard|send|banish|destroy|draw|Tribute'),
 (r'the Summoned monster',r'Summon'),(r'\bthe same number\b',r'number|draw|discard|send|banish|destroy|Tribute'),
 (r'\bthe Token\b',r'Token'),(r'\bthe equipped monster\b',r'[Ee]quip'),(r'\bthat (?:Spell|Trap|effect)\b',r'activat|Spell|Trap|effect'),
 (r'\bthat Equip Card\b',r'Equip Card')]
GONE_EVENT=re.compile(r'(?i)this (?:face-up )?card(?: you control)? is (?:destroyed|sent|banished|Tributed|returned|discarded)|this card leaves the field|this face-up card leaves')
ON_FIELD_ACT=re.compile(r'(?i)switch control of [^;.]*\bthis card|equip[^;.]*\bto this card|(?:^|[;:,.] |then |effect; |[Yy]ou can )(?:this card (?:permanently )?(?:gains|loses|cannot|can attack|is unaffected|is treated)|change this card|this card\'s (?:ATK|DEF))')
def _text_problem(parts,slot):
 """A dealt effect whose text would not make sense to a player (see ORPHANS), as a reason, or None."""
 if slot in ('m_fusion','m_ritual') and _event(parts) in ('flip','flip_summoned','flip_summon'):return 'a Fusion or Ritual Monster is never Flip Summoned'
 # "your opponent has at least 4 cards in their hand and your opponent has 3 or fewer cards in their hand" (Nov 20)
 hc=[p for p in parts.get('conds',[]) if p['k']=='hand_count']
 for a in hc:
  for b in hc:
   if a is not b and a.get('side')==b.get('side') and a.get('mode')=='min' and b.get('mode')!='min' and (a.get('n') or 0)>(b.get('n') or 0):return 'two hand-size conditions that cannot both hold'
 try:t=effect_text({'slot':slot,'name':'X','parts':parts})
 except Exception:return None
 for rx,before in ORPHANS:
  m=re.search(rx,t)
  if m and not re.search(before,t[:m.start()],re.I):return 'refers to something it does not have: '+m.group(0)
 ev=_event(parts);et=CONDS.get(ev,{}).get('text','') if ev else ''
 body=t.split(':',1)[1] if ':' in t else t
 # "that Summoned monster" is the one its timing Summoned, so the timing Summons a monster other than this card (Discord
 # Nov 24, "Last Turn": "When one of your monsters is sent from the field to your GY: Target that Summoned monster")
 if SUMMONED_REF.search(t):
  evp=next((p for p in parts['conds'] if p['k']==ev),None) if ev else None
  et_full=_piece_text('conds',evp,slot) if evp else ''
  if not re.search(r'Summon',et_full) or FRESH_EVENT.search(et_full):return 'refers to a Summoned monster its timing does not have'
 if ev and GONE_EVENT.search(et) and not any(SUMMONS_SELF.search(_act_text(p,{'slot':slot,'name':'X'})) for p in parts['acts']):
  if ON_FIELD_ACT.search(body):return 'this card has left the field, but the effect needs it there'
 # an action that removed this card, then one on this card: "banish this card and the monster it battled, then equip it
 # to this card" (Nov 24, an added action)
 gone=re.search(r'(?i)\b(?:banish|destroy|send|return|shuffle|Tribute) this card\b(?! from (?:your |the )?(?:GY|hand))',body)
 if gone and re.search(r'(?i)\bto this card\b|\bthis card (?:gains|loses|can|cannot)\b|change this card',body[gone.end():]):
  return 'an action on this card after another action removed it'
 # "When this card is Normal Summoned, if this card has destroyed 1 or more monsters by battle" can never hold (Nov 23)
 if ev and re.search(r'(?i)this card is (?:Normal |Flip |Special |Tribute )?Summoned',et) and any(p['k']=='kills' for p in parts.get('conds',[])):
  return 'a monster just Summoned has destroyed nothing by battle'
 # 500-card review (Nov 24)
 # "When your opponent Normal or Special Summons a monster, if it is your turn": your opponent Normal or Flip Summons
 # only on their own turn (Nov 24, "The Eye of Truth")
 if ev and re.search(r'(?i)your opponent (?:[\w, ]*?)(?:Normal|Flip)\b[\w, ]*Summons',et) and \
    any(re.search(r'(?i)^it is your turn$|^it is your (?:Main|Battle)',_fmt(CONDS.get(p['k'],{}).get('text',''),p,{'slot':slot,'name':'X'}).strip()) for p in parts.get('conds',[]) if CONDS.get(p['k'],{}).get('kind')=='state'):
  return 'your opponent does not Normal or Flip Summon during your turn'
 # a Fusion Monster is never in the hand or the Deck: "If this card is sent from your hand to the GY ..." on a Fusion
 if slot=='m_fusion' and ev and re.search(r'(?i)from your (?:hand|Deck)|discarded|this card is in your hand|added from your Deck',et):
  return 'a Fusion Monster is never in the hand or the Deck'
 # "When this Set card is destroyed ...: ... for each monster in your GY when this card was activated" (never activated)
 if ev and re.search(r'(?i)this Set card',et) and re.search(r'(?i)when this card was activated',body):
  return 'this card was never activated'
 # "During your End Phase: ... the turn player takes 500 damage" only ever hurts you
 if ev and re.search(r'(?i)\byour (?:End|Standby|Draw) Phase|during your turn',et) and re.search(r'(?i)the turn player takes',body):
  return 'damage to the turn player during your own turn'
 # "If this card is sent from the field to the GY: Make this card unable to attack ...; ..." (Nov 23): a cost on this
 # card on the field after it left
 if ev and GONE_EVENT.search(et) and any(p['k'] in FIELD_SELF_COSTS for p in parts.get('costs',[])):
  return 'this card has left the field, but its cost needs it there'
 # "You can send this card to the GY; change this card to face-up Defense Position" (Nov 21): the cost took this card
 # off the field (or out of the hand), so an action on this card on the field cannot happen
 if any(p['k'] in SELF_GONE_COSTS for p in parts.get('costs',[])):
  after=(body.split(';',1)[1] if ';' in body else '').strip()
  if ON_FIELD_ACT.search(after) or re.search(r'(?i)this face-up card|this card (?:permanently )?(?:gains|loses|cannot|can attack)|\b(?:destroy|return|banish|shuffle|Tribute|send) this card\b(?! from (?:your |the )?(?:GY|hand))|switch control of [^.;]*this card',after):return 'the cost removed this card, but the effect needs it on the field'
 # "FLIP: ... Special Summon this banished card" (Nov 20): the timing has this card on the field
 if ev and (ev.startswith('flip') or FIELD_EVENT.search(et)) and AWAY_ACT.search(body):return 'this card is on the field, but the effect needs it in the GY or banished'
 return _self_defeating(parts,slot,body,et)

# Effects that defeat themselves (Discord Nov 25: "When this card changes from Attack Position to Defense Position: You
# can pay 2000 LP; gain 1000 LP"; "You can Tribute this card; Special Summon this card from your GY", which can never be
# activated: the cost needs this card on the field, the action in the GY).
FIELD_STATE=re.compile(r'(?i)\bthis card is (?:face-up|face-down|in (?:face-up |face-down )?(?:Attack|Defense) Position|on the field)\b|'
 r'\bthis (?:face-up |face-down )?(?:Attack|Defense) Position card\b|\bthis face-up card\b|\bthis card (?:changes|is changed) (?:from|to)\b|\bbattle position of this card\b|'
 r'\bthis card (?:attacks|attacked|battles|battled|is attacked|was attacked|inflicts|inflicted|destroys|has destroyed)\b|'
 r'\bthis (?:face-up )?card is (?:(?:Normal|Flip|Special|Tribute|Fusion|Ritual),? (?:or )?)*Summoned\b|\bthis card is flipped face-up\b')
# this card itself leaves the field (the timing then finds it in the GY): not "this card battled a monster that was not
# destroyed"
GONE_SELF=re.compile(r'(?i)\bthis (?:face-up |face-down |Set )?(?:(?:Attack|Defense) Position )?(?:card|monster)(?: you control)? (?:is|was|would be) (?:destroyed|sent|banished|Tributed|returned|discarded)|\bthis (?:face-up )?card leaves')
SELF_MOVING_COST=re.compile(r'(?i)\b(?:Tribute|discard|banish|send|return|shuffle|destroy|reveal) this (?:card|monster)\b')
FLAT_LP_GAIN=re.compile(r'(?i)\b(?:you )?gain (\d+) LP\b(?! (?:for each|times|x\b|equal|per\b))')
SELF_STAT=re.compile(r'(?i)\bthis card (?:permanently )?(gains|loses) (\d+) (ATK and DEF|ATK|DEF)\b')
def _self_defeating(parts,slot,body,et):
 """The reason an effect defeats itself, or None."""
 # the cost is before the semicolon; with no cost, a semicolon only joins actions ("Special Summon this banished card;
 # it gains 200 ATK")
 head,after=(body.split(';',1) if ';' in body and parts.get('costs') else ('',body))
 # an LP cost at least as big as the flat LP the same effect gains ("Pay 1000 LP; gain 1000 LP"); "gain 300 LP for each
 # monster" can still be worth it
 paid=sum(int(x) for x in re.findall(r'(?i)\bpay (\d+) LP\b',body))
 gains=[int(x) for x in FLAT_LP_GAIN.findall(body)]
 if paid and gains and sum(gains)<=paid:return 'pays as much LP as it gains, or more'
 # this card gains and loses the same stat in one effect ("this card permanently loses 500 ATK, then this card
 # permanently gains 500 ATK")
 moves={}
 for verb,_,stat in SELF_STAT.findall(body):
  for s in ('ATK','DEF'):
   if s in stat:moves.setdefault(s,set()).add(verb.lower())
 if any(len(v)>1 for v in moves.values()):return 'this card gains and loses the same stat'
 if AWAY_ACT.search(after):
  # a timing or condition with this card on the field, and an action on it in the GY or banished ("during your Standby
  # Phase, while this card is face-up in Defense Position: You can Special Summon this card from your GY")
  states=[_piece_text('conds',p,slot) for p in parts.get('conds',[]) if CONDS.get(p['k'],{}).get('kind')!='event']
  # ("If this face-up card is destroyed: Special Summon this card from your GY" has left the field: fine)
  gone=GONE_SELF.search(et or '')
  if (FIELD_STATE.search(et or '') and not gone) or any(FIELD_STATE.search(t) for t in states):return 'this card is on the field, but the effect needs it in the GY or banished'
  # a cost that moves this card, then an action on it in the GY or banished: the effect is used from the GY, where the
  # cost cannot be paid (and a card moved by its own cost is no longer the card the effect acts on)
  if SELF_MOVING_COST.search(head) or any(p['k'] in SELF_GONE_COSTS|FIELD_SELF_COSTS for p in parts.get('costs',[])):
   return 'the cost moves this card, but the effect needs it in the GY or banished'
 return None
FIELD_EVENT=re.compile(r'(?i)this card is (?:Normal |Flip |Special |Tribute )?Summoned|this card (?:attacks|battles|inflicts|destroys|is attacked)|flipped face-up|this face-up')
SUMMONED_REF=re.compile(r'(?i)\b(?:that|the|those) (?:face-up )?Summoned monsters?\b|\bSummoned monster\(s\)')
AWAY_ACT=re.compile(r'(?i)this banished card|this card from (?:your GY|the GY|banishment)|banish this card from your GY|this card in your GY')
SELF_COUNTER_COST={'remove_self_spell_counter'}
FIELD_SELF_COSTS={'chaos_no_attack','tribute_self','send_self_mzone','tribute_labyrinth_pair'}
SELF_GONE_COSTS={'tribute_self','send_self_mzone','tribute_labyrinth_pair','discard_self_hand','send_self_hand_cost','banish_self'}
PLACES_COUNTER=re.compile(r'(?i)(?:place|put)s? [^.;]{0,40}Spell Counters? on (?:this card|it\b)|Spell Counters? on this card')

# A card that has just arrived has no past (user, Nov 24, "Poison Mummy": "you can't summon a monster and have it
# already be equipped with something"). A timing that puts this card on the field or turns it face-up (Summoned,
# flipped, FLIP; a Normal Spell or Trap is just being activated) never comes with a piece that needs what only an older
# card has: Equip Cards equipped to it, counters on it, monsters it battled or destroyed by battle. Turning face-down or
# leaving the field clears all of that, so a flip does not keep it either.
FRESH_EVENT=re.compile(r'(?i)\bthis (?:face-up |face-down )?card is (?:(?:Normal|Special|Flip|Tribute|Fusion|Ritual),? (?:or )?|or )*Summoned\b|\bthis card is flipped face-up\b|^FLIP\b')
NEEDS_PAST=re.compile(r"(?i)(?<!be )\bequipped to this card\b|\bthis card and the monster equipped to it\b|"
 r"\bthis card is equipped with\b|\b(?:remove|for each|with) [^.;]{0,30}?Counters? (?:from|on) this card\b|"
 r"\bthis card has (?:\d+|a|any) [^.;]{0,20}?Counters?\b|\bthis card (?:has )?destroyed [^.;]{0,40}?by battle\b|\bthis card has (?:attacked|battled)\b|"
 r"\b(?:monsters?|cards?) (?:that )?(?:battled|destroyed) this card\b|\bmonsters? this card (?:battled|destroyed|attacked)\b|destroyed by battle with this card this turn")
def _piece_text(cat,p,slot):
 meta=CATEGORIES[cat].get(p['k'],{})
 try:return _fmt(meta.get('tclause','')+' '+meta.get('gen_text',meta.get('text','')),p,{'slot':slot,'name':'X'})
 except Exception:return meta.get('text','')
def _fresh_timing(parts,slot):
 """The effect happens as this card arrives: its timing Summons or flips it, or it is a Spell/Trap used once."""
 if slot in ONE_SHOT:return True
 ev=next((p for p in parts.get('conds',[]) if CONDS.get(p['k'],{}).get('kind')=='event'),None)
 return bool(ev) and (ev['k']=='flip' or bool(FRESH_EVENT.search(_piece_text('conds',ev,slot))))
def _history_contradiction(parts,slot):
 if not _fresh_timing(parts,slot):return None
 for cat in ('conds','costs','acts'):
  for i,p in enumerate(parts.get(cat,[])):
   if cat=='conds' and CONDS.get(p['k'],{}).get('kind')=='event':continue
   if NEEDS_PAST.search(_piece_text(cat,p,slot)):return cat,i,'contradiction: this card has just arrived, but this needs it to have been on the field before'
 return None

FORCES_ATTACK={'last_turn'}
BATTLE_EVENT=re.compile(r'attack|battle|damage')
def problem(parts,slot):
 """The first part that breaks a rule, as (category, index, reason), or None when the card is valid."""
 bad=_contradiction(parts,slot) or _place_contradiction(parts) or _history_contradiction(parts,slot)
 if bad:return bad
 # An effect that starts its own attack (Last Turn's Duel.ForceAttack) cannot use a battle timing: forcing an attack
 # while another attack is being declared or resolved hung the engine (Nov 19, Eatgaboon: opp_attack + last_turn).
 ev=next((i for i,p in enumerate(parts.get('conds',[])) if CONDS.get(p['k'],{}).get('kind')=='event'),None)
 if ev is not None and any(p['k'] in FORCES_ATTACK for p in parts.get('acts',[])) \
  and BATTLE_EVENT.search(parts['conds'][ev]['k']):return ('conds',ev,'an attack cannot be forced during another battle')
 seen=set()
 for cat,items in parts.items():
  for i,p in enumerate(items):
   if (cat,p['k']) in seen and not _RELAXED[0]:return cat,i,'the same block twice'   # real effects: ATK and DEF auras
   seen.add((cat,p['k']))
   fits=CATEGORIES[cat][p['k']]['fits']
   if _RELAXED[0]:
    if slot not in fits:return cat,i,'does not fit this kind of card'
   elif not (p.get('part') and slot in fits) and not _generator_fit(p['k'],slot,CATEGORIES[cat][p['k']]):return cat,i,'does not fit this kind of card'
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
   if CATEGORIES[cat][p['k']].get('needed') and p['k'] not in needed and not (_RELAXED[0] and p['k'] in FREE_IN_DEAL):return cat,i,'only comes with the effect that needs it'
 # Vanilla-like effects (user, Nov 16): one requirement ("your LP are 2000 or less and you have less LP than your
 # opponent" overlapped), at most EFFECT_CAPS costs and actions. Win conditions and pieces an effect needs stay;
 # a rolled piece goes first.
 states=[i for i,p in enumerate(conds) if CONDS[p['k']]['kind']=='state' and p['k'] not in WIN_CONDS]
 for cat,idx,limit,why in () if _RELAXED[0] else (('conds',states,1,'one requirement per effect'),('costs',list(range(len(costs))),_cap('costs',slot),'too many costs'),
                           ('acts',list(range(len(acts))),_cap('acts',slot),'too many actions')):
  if len(idx)>limit:
   free=[i for i in idx if parts[cat][i]['k'] not in needed]
   if free:return cat,free[-1],why
 auras=[i for i,p in enumerate(acts) if p['k'] in AURAS]
 if auras:
  # Always-on: no activation, so nothing that belongs to activating.
  if len(auras)<len(acts):return 'acts',next(i for i,p in enumerate(acts) if p['k'] not in AURAS),'mixes always-on and activated effects'
  if costs and not _RELAXED[0]:return 'costs',0,'always-on effects have no cost'
  if event is not None:return 'conds',events[0],'always-on effects have no timing'
  for i,p in enumerate(limits):
   if p['k'] not in ('cannot_ss','cannot_ss_gy','summon_by','equip_only'):return 'limits',i,'always-on effects are not activated'
  for i,p in enumerate(others):
   if OTHERS[p['k']].get('wrap'):return 'others',i,'always-on effects toss no coins'
 # Effects that only make sense after a certain timing ("negate the attack" needs an attack).
 for i,p in enumerate(acts):
  if _RELAXED[0]:continue   # the deal picks the timing (_event_need), its real card's included
  ctx=ACTS.get(p['k'],{}).get('ctx')
  if ctx and ctx!=event:return 'acts',i,f'needs the timing "{ctx}"'
  evs=ACTS.get(p['k'],{}).get('ctx_events')
  if evs and event not in evs:return 'acts',i,'needs one of the timings real cards use it with'
 # A mandatory trigger costs nothing (real ones never ask for a cost).
 evp=next((p for p in conds if CONDS[p['k']]['kind']=='event'),None)
 if evp and (CONDS[evp['k']].get('forced') or evp.get('mandatory')) and costs and not _RELAXED[0]:return 'costs',0,'a mandatory effect has no cost'
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
  if k=='dice_branch' and len(acts) not in (1,2):return 'others',i,'needs 1 or 2 effects'
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
 if (slot=='s_normal' or slot=='s_quick' and not _RELAXED[0]) and event:return 'conds',events[0],'Spells are activated, they have no timing'
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

# ---------------------------------------------------------------- splitters (user, Nov 19)
# A coin toss, a call or a die splits an effect into outcomes, and every outcome is made of ordinary blocks, like Time
# Wizard ("Heads: destroy all monsters your opponent controls. Tails: destroy all monsters you control"). Outcomes
# run at resolution, so they never target. What a lost toss does follows real gamble cards:
#   a mirror: the same effect turned on you (destroy theirs / destroy yours, inflict / take, draw / discard);
#   a drawback that fits how strong the reward is (take damage, discard, destroy your monsters, skip your turn);
#   nothing.
# A die splits into bands, the best result on the rarest roll ("1-2: you take 500 damage. 3-5: draw 1. 6: draw 2").
def _you(text):
 return (text.replace("your opponent's",'your').replace('your opponent controls','you control').replace('Your opponent controls','You control')
  .replace("on your opponent's field",'on your field'))
def _mirror(p):
 """The effect turned on you, or None."""
 k=p['k'];n=p.get('n')
 if k in ('damage','recover') and n:return {'k':'damage_self','n':n}
 if k=='draw' and n:return {'k':'discard_hand','n':n}
 if k=='discard_opp':return {'k':'discard_hand','n':1}
 if k=='destroy_mon':return {'k':'move_select','side':'you','zone':'mzone','kind':'monster','n':1,'to':'destroy','filter':'1 monster you control'}
 if k=='bounce_mon':return {'k':'move_select','side':'you','zone':'mzone','kind':'monster','n':1,'to':'hand','filter':'1 monster you control'}
 if k=='destroy_st':return {'k':'move_select','side':'you','zone':'st','kind':'st','n':1,'to':'destroy','filter':'1 Spell/Trap you control'}
 if k=='destroy_weak' and n:return {'k':'move_all','side':'you','zone':'mzone','kind':'monster','faceup':True,'atk_max':n,'to':'destroy','filter':f'face-up monsters you control with {n} or less ATK'}
 if k=='bounce_all_opp_mon':return {'k':'move_all','side':'you','zone':'mzone','kind':'monster','to':'hand','filter':'monsters you control'}
 if k in ('move_all','move_target','move_select') and p.get('side')=='opp' and p.get('to') in ('destroy','hand','banish','grave'):
  q={x:v for x,v in p.items() if x not in ('k','up_to')};q.update(side='you',filter=_you(str(p.get('filter',''))),n=p.get('n',1))
  return {'k':'move_all' if k=='move_all' else 'move_select',**q}
 return None
_DESTROY_YOURS={'k':'move_all','side':'you','zone':'mzone','kind':'monster','to':'destroy','filter':'monsters you control'}
# Time Wizard's loss as one negative block (user, Nov 19: the damage stays part of the same block).
ACTS['destroy_yours_half_atk']=dict(fits=ACTIVATED,label='Destroy',branch_only=True,
 text='destroy as many monsters you control as possible, and if you do, take damage equal to half the total ATK those destroyed monsters had while face-up on the field')
CATEGORIES['acts']['destroy_yours_half_atk']=ACTS['destroy_yours_half_atk']
def _is_destroy_yours(p):
 return p.get('k')=='move_all' and p.get('side')=='you' and p.get('zone')=='mzone' and p.get('to')=='destroy' and not ({'faceup','atk_max','race','attr','level_max','level_min','pos'}&set(p))
def _drawback(rng,power):
 """A lost toss that fits the reward: small for small rewards, painful for big ones."""
 if power==0:return [{'k':'damage_self','n':rng.choice((300,500))}]
 if power==1:return rng.choice(([{'k':'damage_self','n':rng.choice((500,800,1000))}],[{'k':'discard_hand','n':1}],
  [{'k':'move_select','side':'you','zone':'mzone','kind':'monster','n':1,'to':'destroy','filter':'1 monster you control'}]))
 return rng.choice(([dict(_DESTROY_YOURS)],[{'k':'destroy_yours_half_atk'}],[{'k':'damage_self','n':rng.choice((1500,2000))}],[{'k':'discard_hand','n':2}],'skip_turn'))
SELF_HARM={'damage_self','discard_hand','skip_draw','skip_next_two_draw_phases','destroy_yours_half_atk','recover_opp','skip_phase'}
def _usable(spec):
 m=CATEGORIES['acts'].get(spec['k'],{});return bool(m) and not m.get('real_only')
def _losing(rng,acts,log):
 """Outcome list for a lost toss / wrong call: a mirror, a drawback, or nothing ([] or 'skip_turn')."""
 power=_power(acts)
 # A "reward" that already hurts you (skip your Draw Phases, discard, take damage) gets no second drawback.
 if any(a['k'] in SELF_HARM or (a.get('side')=='you' and a.get('to') in ('destroy','banish','grave','hand')) for a in acts):return []
 mirrors=[m for m in (_mirror(a) for a in acts) if m and _usable(m)]
 roll=rng.random()
 if mirrors and roll<.5:
  log.append('splitter: the loss mirrors the reward')
  # "Destroy all monsters your opponent controls" mirrors as Time Wizard's loss half the time.
  if _is_destroy_yours(mirrors[0]) and rng.random()<.5:return [{'k':'destroy_yours_half_atk'}]
  return mirrors[:1]
 if roll<(.5 if mirrors else 0)+(.35 if power==0 else .55):
  out=_drawback(rng,power)
  if out=='skip_turn' or all(_usable(x) for x in out):log.append('splitter: a drawback on a loss');return out
 return []
def _stronger(rng,p):
 """The same effect, better: the top band of a die."""
 q=dict(p)
 if q['k']=='draw':q['n']=min(q.get('n',1)+1,3);return q
 if isinstance(q.get('n'),int) and q['n']>=100:q['n']=_snap(q['n']*2);return q
 return None
def _split(rng,parts,log):
 w=_wrap(parts['others']);acts=parts['acts']
 if not w or not acts:return
 harm=lambda a:a['k'] in SELF_HARM or ('self' in a['k'] and 'destroy' in a['k'])
 if w['k'] in ('coin','call','dice_branch') and all(harm(a) for a in acts):
  # Gambling for a drawback is not a gamble: the effect just happens (Nov 19: "3-5: You take 5000 damage").
  parts['others']=[x for x in parts['others'] if x is not w];log.append('splitter dropped: every outcome would hurt you');return
 if w['k']=='dice_branch' and len(acts)==2 and harm(acts[0]):acts.reverse()   # the harmful one goes on the low roll
 if w['k'] in ('coin','call'):
  lose=_losing(rng,acts,log)
  if lose=='skip_turn':w['tails']='skip_turn';w.pop('tails_acts',None)
  else:w['tails']='none';w['tails_acts']=lose
 elif w['k']=='dice_branch':
  bad=_losing(rng,acts,log);low=[] if bad=='skip_turn' else bad
  if any(a.get('part') for a in acts):   # a bundle stays whole: one result runs all of its steps
   w['bands']=[{'lo':1,'hi':2,'acts':low},{'lo':3,'hi':6,'acts':list(acts)}];log.append('splitter: die bands 1-2, 3-6 (bundle)');return
  # A second effect that hurts you ("destroy this card") is the low roll, never the best one (Lord of Zemia, Nov 19).
  harm=lambda a:a['k'] in SELF_HARM or ('self' in a['k'] and 'destroy' in a['k'])
  if len(acts)==2 and harm(acts[1]):
   w['bands']=[{'lo':1,'hi':2,'acts':[acts[1]]},{'lo':3,'hi':6,'acts':[acts[0]]}];log.append('splitter: die bands 1-2 (its drawback), 3-6');return
  if len(acts)==2 and rng.random()<.5:return   # the classic 1-3 / 4-6 split
  top=_stronger(rng,acts[-1]) if len(acts)==1 else acts[1]
  bands=[{'lo':1,'hi':2,'acts':low}]
  if top:bands+=[{'lo':3,'hi':5,'acts':[acts[0]]},{'lo':6,'hi':6,'acts':[top]}]
  else:bands+=[{'lo':3,'hi':6,'acts':[acts[0]]}]
  w['bands']=bands;log.append('splitter: die bands '+', '.join(f"{b['lo']}-{b['hi']}" for b in bands))

# ---------------------------------------------------------------- power budget (user, Nov 19)
# "Most effects should not be too strong, with a tiny chance of crazy strong cards." An effect's strength is scored
# from what its text does (the same scorer runs on the real cards' recreations), then lowered by what holds it back.
# Budgets per slot (BUDGET) are the 90th percentile of real cards' scores; a card over budget is toned down step by step
# (a second effect goes, amounts halve, a cost or a condition comes) unless it is one of the CRAZY share.
_STRENGTH=[
 (r'you win the Duel',10),(r'take control',3),(r'\bnegate',2.5),(r'skip (your opponent|their)',2.5),
 (r'(destroy|banish|return|send|shuffle) all .{0,60}(your opponent controls|your opponent\'s)',4.5),
 (r'(destroy|banish|return|send|shuffle) all .{0,60}(on the field|on both fields|monsters on)',3),
 (r'(destroy|banish|return|send|shuffle) all .{0,60}you control',-2),
 (r'(target|choose) \d* ?.{0,50}(your opponent controls|your opponent\'s).{0,40}; (destroy|banish|return)',2),
 (r'(target|choose) \d* ?.{0,50}(on the field|on either).{0,40}; (destroy|banish)',2.3),
 (r'(target|choose) \d* ?.{0,50}you control.{0,40}; (destroy|banish)',-1),
 (r'\bdestroy (it|that|the attacking|the)\b',1.5),(r'return (it|that monster) to the hand',1.2),
 (r'add .{0,80}to your hand',1.6),(r'special summon',1.8),(r'your opponent discards',1.2),
 (r'cannot be destroyed by battle',0.8),(r'attack directly',1.2),(r'piercing',0.6),(r'cannot (declare an )?attack',1),
]
def _amount_strength(text):
 v=0
 for n in re.findall(r'draw (\d+)',text):v+=1.4*int(n)
 for n in re.findall(r'inflict (\d+) damage',text):v+=int(n)/600
 for n in re.findall(r'gain (\d+) LP',text):v+=int(n)/1500
 for n in re.findall(r'gains? (\d+) ATK',text):v+=int(n)/1000
 for n in re.findall(r'loses? (\d+) ATK',text):v+=int(n)/1000
 for n in re.findall(r'you take (\d+) damage',text):v-=int(n)/800
 for n in re.findall(r'discard (\d+) cards? from your hand',text):v-=0.8*int(n)
 return v
def _act_strength(p,card):
 try:t=_act_text(p,card)
 except Exception:return 1.0
 v=_amount_strength(t)
 for rx,w in _STRENGTH:
  if re.search(rx,t,re.I):v+=w;break   # the first (strongest) family that matches
 return v
def power_score(parts,slot,card=None):
 """How strong one effect is (see _STRENGTH): what it does, times how often it can be used, minus what holds it back."""
 card=card or {'slot':slot,'name':'X'}
 acts=parts.get('acts',[]);v=sum(_act_strength(a,card) for a in acts)
 w=_wrap(parts.get('others',[]))
 if w:
  if w.get('bands'):v*=.65
  elif w['k'] in ('coin','call'):v=v*.5-sum(max(0,-_act_strength(a,card)) for a in w.get('tails_acts',[]))*.5
  elif w['k']=='dice_mult':v*=1.2
 if v<=0:return v
 aura=bool(acts) and acts[0]['k'] in AURAS
 limits={p['k'] for p in parts.get('limits',[])}
 if slot not in ONE_SHOT and not aura:v*=1.0 if limits&{'once_duel'} else 1.4 if limits&{'opt','hopt'} else 2.0   # used again and again
 if aura and slot in MONSTER_SLOTS|{'s_cont','s_field','t_cont','s_equip'}:v*=1.3   # always on
 for c in parts.get('conds',[]):
  m=CONDS.get(c['k'],{});v-=0.35 if m.get('kind')=='state' else 0.15 if m.get('repeat') else 0.3
 for c in parts.get('costs',[]):
  k=c['k'];v-={'lp':c.get('n',500)/1000,'discard':0.9*c.get('n',1),'tribute_other':1.2,'tribute_self':1.4,'tribute_sel':1.2,
   'banish_gy':0.3,'mill_self':0.3,'send_self':1.0,'lp_half':1.5,'discard_spell':1.0}.get(k,0.6)
 for p in parts.get('others',[]):
  if p['k']=='upkeep':v-=p.get('n',500)/700
  if p['k']=='curse_damage':v-=p.get('n',300)/400
 v-=0.8*len(limits&{'no_bp','no_ss'})
 return round(v,2)

CRAZY=.03   # this share of cards keeps its full strength: the rare crazy-strong card (user, Nov 19)
def _budget(rng,parts,slot,log):
 """Tones an effect down to the real 90th percentile of its slot (STRUCTURE[slot]['budget']), step by step."""
 budget=STRUCTURE.get(slot,{}).get('budget')
 if budget is None or not parts['acts']:return
 score=power_score(parts,slot)
 if score<=budget:return
 if rng.random()<CRAZY:log.append(f'crazy strong card kept (power {score} over {budget})');return
 def ok():return not problem(parts,slot)
 steps=0
 while power_score(parts,slot)>budget and steps<6:
  steps+=1;acts=parts['acts']
  # 1. a second effect goes (never a step of a bundle or a splitter's only effect)
  w=_wrap(parts['others'])
  if len(acts)>1 and not any(a.get('part') for a in acts) and not (w and w['k']=='dice_branch' and not w.get('bands')):   # a classic 1-3 / 4-6 die needs both
   gone=max(acts[1:],key=lambda a:_act_strength(a,{'slot':slot,'name':'X'}));acts.remove(gone);log.append(f"power: dropped '{gone['k']}'");continue
  # 2. smaller amounts
  big=[a for a in acts if isinstance(a.get('n'),int) and (a['k']=='draw' and a['n']>1 or a['n']>=400)]
  if big and steps<=3:
   for a in big:a['n']=a['n']-1 if a['k']=='draw' else _snap(a['n']//2)
   log.append('power: amounts halved');continue
  # 3. a cost: LP, a discard or a Tribute (whatever this card can pay)
  if not parts['costs']:
   for k in [k for k in ('lp','discard','tribute_other','banish_gy') if k in _candidates('costs',slot,{})]:
    parts['costs']=[{'k':k,'n':rng.choice((1000,1500,2000))} if k=='lp' else {'k':k,'n':1} if k in ('discard','banish_gy') else {'k':k}]
    if ok():log.append(f"power: added cost '{k}'");break
    parts['costs']=[]
   else:pass
   if parts['costs']:continue
  # 4. a condition
  if not any(CONDS[c['k']]['kind']=='state' for c in parts['conds']):
   states=[k for k in _candidates('conds',slot,{}) if CONDS[k]['kind']=='state' and not CONDS[k].get('win')]
   rng.shuffle(states)
   for k in states[:6]:
    parts['conds'].append(_roll_block(rng,'conds',k,{'slot':slot}))
    if ok():log.append(f"power: added condition '{k}'");break
    parts['conds'].pop()
   else:break
   continue
  break

def _roll_amounts_for_conditions(rng,parts,log):
 # Effects are rolled before the rules settle the conditions, so their amounts are rolled again here with the
 # final number of conditions tilting the roll.
 power=len(parts['conds'])
 for p in parts['acts']:
  meta={**ACTS,**AURAS}[p['k']]
  if 'n' in meta and not meta.get('win') and not p.get('part'):p['n']=_pick_amount(rng,meta['n'],power)
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
 if not any(p.get('link') for p in parts['acts']):parts['acts'].sort(key=lambda p:not ACTS.get(p['k'],{}).get('target'))
 _roll_amounts_for_conditions(rng,parts,log)
 _split(rng,parts,log)
 _budget(rng,parts,slot,log)
 # A die multiplies a small amount per pip (roll 6 x 300 = 1800), so the base amount shrinks.
 if any(p['k']=='dice_mult' for p in parts['others']):
  for p in parts['acts']:
   if p['k'] in NUMERIC:p['n']=max(100,round(p['n']/3.5/100)*100)
 return parts

# ---------------------------------------------------------------- text
def _ordinal(n):
 return {1:'next',2:'2nd',3:'3rd'}.get(n,f'{n}th')

def _or(items):
 items=[str(x) for x in items]
 return items[0] if len(items)==1 else ', '.join(items[:-1])+' or '+items[-1] if items else ''

_CARD_TYPES={'field':'Field Spell','equip':'Equip Spell','continuous_spell':'Continuous Spell','continuous_trap':'Continuous Trap',
 'quickplay':'Quick-Play Spell','ritual':'Ritual Spell','counter':'Counter Trap','spell':'Spell','trap':'Trap'}
def _fmt_extra(p):
 """Values a block carries that its text must show (user, Nov 19: "on a specified result" does not work; say the
 results): dice results, named cards joined with "or", Types, card types, what a destroy pays out."""
 dice=p.get('dice') or []
 races=p.get('races') or ([r for r,b in RACES.items() if p['count_mask']&b] if isinstance(p.get('count_mask'),int) else [])
 n=p.get('n')
 payoff={'damage':f"inflict {n} damage to {'its controller' if p.get('player')=='controller' else 'your opponent'}",
  'recover':f"{'your opponent gains' if p.get('player')=='opp' else 'you gain'} {n} LP"}.get(p.get('payoff'),'')
 ct=p.get('card_type') or p.get('active') or p.get('kind')
 rname=lambda v,t:next((k for k,b in t.items() if b==v),'') if isinstance(v,int) else (v or '')
 # "When your opponent activates an Equip Spell Card during the Battle Phase": all that the timing checks
 label='Equip Spell' if p.get('stype')=='equip' else _CARD_TYPES.get(p.get('card_type'),'Spell')
 art='an' if label[0] in 'AEIOU' else 'a'
 type_activated=(f'When your opponent activates {art} {label} Card' if p.get('side')=='opp' else f'When {art} {label} Card is activated')+(' during the Battle Phase' if p.get('battle_phase') else '')
 return dict(dup_name={'flip':'Flip monster','trap':'Trap Card'}.get(p.get('duplicates'),'card of that type'),summoned_ref='the Summoned monster' if str(p.get('filter','1 ')).startswith('1 ') else 'the Summoned monster(s)',deck_dest='on top of your Deck' if p.get('to')=='decktop' else 'into your Deck',kind=_CARD_TYPES.get(p.get('kind'),p.get('kind') or 'Spell/Trap'),type_activated=type_activated,mon_race=rname(p.get('race'),RACES),mon_attr=rname(p.get('attr'),ATTRIBUTES),dice=_or(dice),dice_s='s' if len(dice)>1 else '',names_or=_or([f'"{x}"' for x in p.get('names') or ([p['name']] if isinstance(p.get('name'),str) and p.get('name') else [])]),
  races_or=_or(races),card_type_name=_CARD_TYPES.get(ct,str(ct or 'Spell/Trap')),payoff_text=payoff)

def _type_filter(p):
 """A piece with a Type or Attribute but no filter text ("Tribute 1 monster" that needed an Insect, Nov 23)."""
 # a piece that only works with named cards says them (Discord Nov 24, Goldlibra's "Magical Scientist": "Special
 # Summon 1 monster from your hand, Deck, or GY" whose Lua only takes 1 dealt card, so it could not be activated)
 if p.get('names') and p.get('codes'):return _or([f'"{x}"' for x in p['names']])
 race=p.get('race');attr=p.get('attr')
 race=next((k for k,b in RACES.items() if b==race),'') if isinstance(race,int) else (race or '')
 attr=next((k for k,b in ATTRIBUTES.items() if b==attr),'') if isinstance(attr,int) else (attr or '')
 words=' '.join(x for x in (attr,race) if x)
 return (words+' ' if words else '')+('monsters' if (p.get('n') or 1)>1 else 'monster')

def _stat_effect_text(p):
 """What a targeted stat change does: "it gains 500 ATK", "it loses 500 DEF" (mode sub, or a negative gain), "its DEF
 becomes 0", "its original ATK becomes half its original ATK". A mode without words read "changes its stats" (Discord
 Nov 21, "Five-Headed Dragon")."""
 n,stat,mode=p.get('n') or 0,p.get('stat','ATK'),p.get('mode')
 if mode=='sub' or (mode=='add' and n<0):return f'it loses {abs(n)} {stat}'
 if mode=='add':return f'it gains {n} {stat}'
 if mode=='set':return f'its {stat} becomes {n}'
 if mode=='half':return 'its original ATK becomes half its original ATK'
 return f'it gains {n} {stat}' if n>0 else f'it loses {abs(n)} {stat}' if n<0 else 'changes its stats'

def _fmt(text,p,card):
 n=p.get('n');how={'m_fusion':'Fusion','m_ritual':'Ritual'}.get(card['slot'],'')
 if n is None and '{n}' in text:n=1   # real blocks leave a count of 1 out ("by banishing 1 WIND monster")
 names=_join([f'"{x}"' for x in p['names']]) if p.get('names') else ''
 method_names=[{'normal':'Normal','flip':'Flip','special':'Special'}[m] for m in p.get('methods',[])]
 methods=(', '.join(method_names[:-1])+' or '+method_names[-1] if len(method_names)>2 else _join(method_names, ' or ')) if method_names else ''
 stats=_join(p.get('stats',[]), ' and ') if p.get('stats') else ''
 hand_mode=p.get('mode')
 if p.get('side')=='opp':
  hand_condition=(f"your opponent has at least {p.get('n')} cards in their hand" if hand_mode=='min' else f"your opponent has {p.get('n')} or fewer cards in their hand")
 else:
  hand_condition=(f"you have at least {p.get('n')} cards in your hand" if hand_mode=='min' else ('you have no cards in your hand' if p.get('n')==0 else f"you have {p.get('n')} or fewer cards in your hand"))
 return text.format(**_fmt_extra(p),n=n,def_n=p.get('def_n',n),s='' if n==1 else 's',race=p.get('race',''),attr=p.get('attr',''),how=how,level=p.get('level',2),l=p.get('l'),d=p.get('d'),
  six=(n or 0)*12,nth=_ordinal(n),name=p.get('name',''),names=names,side={'opp':'monsters your opponent controls','you':'monsters you control','all':'monsters on the field'}.get(p.get('side'),'monsters your opponent controls'),deck_owner={'opp':"your opponent's",'you':'your'}.get(p.get('side'),"your opponent's"),summon_side={'opp':'your opponent','any':'either player'}.get(p.get('side'),'your opponent'),methods=methods,stats=stats,change_verb={'minus':'decrease','plus':'increase'}.get(p.get('sign'),'change'),attr_change_verb={'minus':'lose','plus':'gain'}.get(p.get('sign'),'change'),skip_phrase=({'battle':'skip your opponent\'s next Battle Phase','standby':'skip your next Standby Phase'}.get(p.get('phase'),'skip the next phase')),hand_condition_text=hand_condition,damage_turn_text=({'battle':'you take no battle damage this turn','all':'you take no damage from your opponent\'s cards this turn'}.get(p.get('kind'),'you take no damage this turn')),attacker_recover_text=('negate that attack, and if you do, gain LP equal to the attacking monster\'s ATK' if p.get('negate') else 'gain LP equal to the attacking monster\'s ATK'),extreme={'high':'highest','low':'lowest'}.get(p.get('extreme'),'highest'),stat=p.get('stat','ATK'),constraint=p.get('constraint',''),filter=p.get('filter') or _type_filter(p),verb=p.get('verb') or {'destroy':'destroy','hand':'return','grave':'send','banish':'banish','deck':'shuffle','decktop':'place','facedown':'turn face-down','defense':'change to Defense Position','attack':'change to Attack Position'}.get(p.get('to'),'destroy'),zone={'deck':'Deck','hand':'hand','gy':'GY','banished':'banished cards','deck_gy':'Deck or GY','deck_hand':'hand or Deck','deck_hand_gy':'hand, Deck, or GY'}.get(p.get('zone'),'Deck'),position={'attack':' in face-up Attack Position','defense':' in Defense Position','faceup':'','facedown':' in face-down Defense Position','any':''}.get(p.get('position'),p.get('position','')),board=p.get('board_name',''),payoff=p.get('payoff_name',''),effect=_stat_effect_text(p)
  ).replace('the top 1 card ','the top card ').replace('During your next Standby Phase after this','During your next Standby Phase')

# What a lost coin toss or a wrong call does.
def _tails_text(w):
 # built per case: a dealt coin call without a damage value raised here and left its card with no text (Nov 20)
 tails=w.get('tails','none')
 if tails=='damage':return f"you take {w['n']} damage" if w.get('n') else 'nothing happens'
 return {'none':'nothing happens','skip_turn':'you skip your next turn',
  'mill_opp_gy':"send as many cards from the top of your Deck to the GY as there are cards in your opponent's GY"}[tails]

def _wrap_text(w,effects,card=None):
 cap=lambda t:t[:1].upper()+t[1:]
 lose=_join([_act_text(p,card) for p in w['tails_acts']],', then ') if w.get('tails_acts') and card else None
 if w['k']=='coin':return f'toss a coin. Heads: {cap(effects)}. Tails: {cap(lose or _tails_text(w))}'
 if w['k']=='call':
  wrong=f'. If you call it wrong, {lose}' if lose else '' if w.get('tails','none')=='none' else f'. If you call it wrong, {_tails_text(w)}'
  return f'toss a coin and call it. If you call it right, {effects}{wrong}'   # Time Wizard's wording
 if w['k']=='dice_mult':return f'roll a six-sided die and {effects}'
 if w['k']=='dice_branch':return f'roll a six-sided die. {effects}'
 return effects

def _dice_text(w,acts,card):
 cap=lambda t:t[:1].upper()+t[1:]
 if not w.get('bands'):return f'1-3: {cap(_act_text(acts[0],card))}. 4-6: {cap(_act_text(acts[1],card))}'
 out=[]
 for b in w['bands']:
  what=_join([_act_text(p,card) for p in b['acts']],', then ') if b['acts'] else 'nothing happens'
  if w.get('tails')=='skip_turn' and b['lo']==1:what='you skip your next turn'
  out.append(f"{b['lo']}{'' if b['lo']==b['hi'] else '-'+str(b['hi'])}: {cap(what)}")
 return '. '.join(out)

def _wrap(others):
 return next((p for p in others if OTHERS[p['k']].get('wrap')),None)

_CAPITAL_WORDS={'FLIP','Spell','Trap','Special','Tribute','Normal','Ritual','Fusion','Equip','Field','Continuous','Quick-Play','Counter',
 *{r.split(' ')[0] for r in RACES}}

_SELECT_DEST=re.compile(r'\s+(?:to (?:your|the|its owner\'s) hand|to the GY|into (?:your|the) Deck(?: and shuffle)?|to the top of (?:your|the) Deck|on top of (?:your|the) Deck)$')
def _move_select_text(p):
 """A chosen (not targeted) move, written like a real card: "return 2 monsters your opponent controls to the hand",
 "look at your opponent's hand and send 1 card from it to the GY". Its old text, "choose {n} {filter} and {verb} {n}",
 read "Choose 1 this card from your GY to the top of your Deck and place 1 on top of the Deck" (Nov 20)."""
 n=p.get('n') or 1;f=_SELECT_DEST.sub('',(p.get('filter') or 'monster').strip())
 f=re.sub(r'(?i)\bGraveyard\b','GY',f)
 if not re.match(r'(?i)(up to |any number of |all |\d|"[^"]+"$)',f):f=(f'up to {n} ' if p.get('up_to') else f'{n} ')+f
 elif re.match(r'"[^"]+"$',f):f=f'{n} {f}'
 opp_hand=p.get('zone')=='hand' and p.get('side')=='opp'
 if opp_hand:f=re.sub(r" in your opponent's hand$",' from it',f)
 to=p.get('to') or 'destroy'
 body={'hand':(f'add {f} to your hand' if p.get('zone') in ('gy','deck','banished') else f'return {f} to the hand'),
  'grave':f'send {f} to the GY','banish':f'banish {f}','deck':f'shuffle {f} into the Deck','decktop':f'place {f} on top of the Deck',
  'destroy':f'destroy {f}','facedown':f'change {f} to face-down Defense Position','defense':f'change {f} to Defense Position',
  'attack':f'change {f} to Attack Position','toggle':f'change the battle position of {f}'}.get(to,f'destroy {f}')
 return ("look at your opponent's hand and "+body) if opp_hand else body

def _act_text(p,card,mult=False):
 meta={**ACTS,**AURAS}[p['k']];text=meta.get('field_text') if card['slot']=='s_field' and 'field_text' in meta else meta.get('gen_text',meta['text'])
 out=_move_select_text(p) if p['k']=='move_select' else _fmt(text,p,card)
 if mult and 'n' in p:out=out.replace(str(p['n']),f"{p['n']} × the result",1)
 out=out.rstrip().rstrip('.')
 # Movement blocks name only the verb ("return it"): add where the card goes, from the block's own parameter.
 dest={'hand':' to the hand','deck':' into the Deck','grave':' to the GY','decktop':' on top of the Deck'}.get(p.get('to'))
 if dest and meta.get('templates') and not re.search(r' to (?:the|your|its owner\'s) (hand|GY)| into (?:the|your|its owner\'s) Deck| on top of',out):out+=dest
 # Real-card block texts are written as sentences; inside "..., then ..." they start lower-case (not a name or Type).
 word=out.split(' ')[0] if out else ''
 if p['k'] not in AURAS and word[:1].isupper() and word[1:2].islower() and word not in _CAPITAL_WORDS:out=out[:1].lower()+out[1:]
 return out

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
  eo=next((p for p in limits if p['k']=='equip_only'),None)
  if slot=='s_equip':body=f"Equip only to {eo.get('filter','a face-up monster') if eo else 'a face-up monster'}. "+body
  lines.append(body)
 else:
  event=_event(parts);wrap=_wrap(others)
  once=next((p['k'] for p in limits if LIMITS[p['k']].get('once')),None)
  one_shot=slot in ONE_SHOT
  lead=[]
  if once=='opt':lead.append('Once per turn')
  if event and event!='flip':
   meta=CONDS[event];t=meta.get('trap_text') if slot.startswith('t_') and 'trap_text' in meta else meta['text']
   # the timing's own values ("When a {card_type} Card is activated"): dealt timings carry them (it raised and left
   # the card with no text at all, Discord Nov 20, "I got an empty trap")
   lead.append(_fmt(t,next((p for p in conds if p['k']==event),{}),card))
  if states and not one_shot:lead.append('if '+_join(states))
  if states and one_shot and event:lead.append('if '+_join(states))
  if states and one_shot and not event:lines.append(f'Activate only if {_join(states)}.')
  prefix=('FLIP: ' if event=='flip' else '')+(cap(', '.join(lead[:1]+[low(x) for x in lead[1:]]))+': ' if lead else '')
  if wrap and wrap['k']=='dice_mult':effects=_join([_act_text(p,card,True) for p in acts],', then ')
  elif wrap and wrap['k']=='dice_branch':effects=_dice_text(wrap,acts,card)
  else:
   # only the first targeting action's target goes before the semicolon; a later one keeps its own ("..., then target
   # 1 card; destroy it"), or it was dropped from the text (Nov 24)
   first_t=next((p for p in acts if 'tclause' in ACTS.get(p['k'],{})),None)
   own_t=lambda p,c:(_fmt(ACTS[p['k']]['tclause'],p,c)+'; '+_act_text(p,c)) if p is not first_t and 'tclause' in ACTS.get(p['k'],{}) else _act_text(p,c)
   effects=_chain(acts,card,own_t)
  if wrap:effects=_wrap_text(wrap,effects,card)
  # Costs and targets come before the semicolon; what happens on resolution comes after (official card wording).
  cost=_join([_fmt(COSTS[p['k']]['text'],p,card) for p in costs]) if costs else ''
  tclause=next((_fmt(ACTS[p['k']]['tclause'],p,card) for p in acts if 'tclause' in ACTS.get(p['k'],{})),'')   # templates fill it ('target 1 ...')
  pre=cost+(', then ' if cost and tclause else '')+tclause
  body=(pre+'; '+effects) if pre else effects
  # "You can" needs a verb after it: "You can this card gains 400 ATK" becomes "You can activate this effect; this
  # card gains 400 ATK" (official wording when there is no cost or target).
  first=effects.split(' ')[0].lower()
  if not one_shot and not pre and (first in ('this','your','you','it','monsters','all','both','each','the','at') or first[:1].isdigit()):body='activate this effect; '+effects
  ev=next((p for p in conds if CONDS[p['k']]['kind']=='event'),None)
  forced=bool(ev) and (CONDS[ev['k']].get('forced') or ev.get('mandatory'))   # mandatory trigger: no "You can"
  if forced and body.startswith('activate this effect; '):body=body[len('activate this effect; '):]
  # An effect that starts with its own time ("during the End Phase, return ...") reads "During the End Phase: You can
  # return ..." (it read "You can during the End Phase", Nov 19).
  when=re.match(r'(?i)(during [^,;:]+?),\s*(.*)$',body) if not pre and not one_shot else None
  if when and not lead:
   prefix=prefix+cap(when.group(1))+': ';body=when.group(2)
  elif when and prefix.endswith(': '):   # "Once per turn, during your next Draw Phase: You can ..."
   prefix=prefix[:-2]+', '+when.group(1)[:1].lower()+when.group(1)[1:]+': ';body=when.group(2)
  if not one_shot and not forced:body='You can '+low(body)
  # After "When ...:" the effect starts with a capital, as on real cards ("...: Destroy it.").
  lines.append(prefix+cap(body).rstrip('.')+'.')
  what='card' if one_shot else 'effect'
  for p in limits:
   if p['k']=='hopt':lines.append(f'You can only activate 1 "{name}" per turn.' if one_shot else f'You can only use this effect of "{name}" once per turn.')
   elif p['k']=='once_duel':lines.append(f'You can only activate 1 "{name}" per Duel.' if one_shot else f'You can only use this effect of "{name}" once per Duel.')
   elif LIMITS[p['k']].get('text') and p['k'] not in ('cannot_ss','cannot_ss_gy','summon_by'):lines.append(_fmt(LIMITS[p['k']]['text'].replace('{what}',what),p,card))   # template limits have parameters
 if any(p['k']=='cannot_ss' for p in limits):lines.insert(0,LIMITS['cannot_ss']['text'])
 if any(p['k']=='cannot_ss_gy' for p in limits):lines.insert(0,LIMITS['cannot_ss_gy']['text'])
 for p in limits:
  if p['k']=='summon_by':lines.insert(0,_fmt(LIMITS['summon_by']['text'],p,card))
 for p in others:
  if p['k']=='upkeep':lines.append(f"During your Standby Phase, pay {p['n']} LP or destroy this card.")
  if p['k']=='curse_damage':lines.append(f"During your Standby Phase, you take {p['n']} damage.")
 return _tidy(' '.join(lines))

def _tidy(text):
 # "Special Summon 1 Level 4 monster; it cannot attack this turn from your Deck" (Nov 25): the place goes with the monster
 text=re.sub(r'(; it cannot attack this turn)((?: from (?:your|the) [\w ,]{0,30}?(?:Deck|GY|hand))(?: in (?:face-up )?(?:Attack|Defense) Position)?)(?=[.;,]|$)',r'\2\1',text)
 text=re.sub(r'\b(\d+) \1 ',r'\1 ',text)                 # "target 1 1 monster" -> "target 1 monster"
 text=re.sub(r'\b(all|All|the|The) (all|the) ',r'\1 ',text)  # "return all all Set cards" -> "return all Set cards"
 text=re.sub(r'\bSummons monster\b','Summons a monster',text)       # a summon timing with no filter
 text=re.sub(r'\b(control|controls) monster\b',r'\1 a monster',text)   # "If you control monster" (a condition with no filter)
 text=re.sub(r'( from your (?:Deck|GY|hand))\1\b',r'\1',text)        # "from your Deck from your Deck"
 text=re.sub(r'( from (?:your|the) [\w ]{2,30}?(?:Deck|GY|hand|field))\1\b',r'\1',text)   # "from your hand or Deck from your hand or Deck"
 text=re.sub(r' as (?:a )?cost\b','',text)   # "Banish 1 monster from your GY as cost; ..." (the semicolon says it)
 text=re.sub(r'\b([Aa]) "(?=[AEIOU])',r'\1n "',text)   # 'a "Archfiend" monster' -> 'an "Archfiend" monster'
 text=re.sub(r'\b([Aa])n (?=(?:WATER|WIND|FIRE|DARK|DIVINE|LIGHT)\b)',r'\1 ',text)   # "an WATER monster" -> "a WATER monster"
 text=re.sub(r'\b([Aa]) (?=EARTH\b)',r'\1n ',text)
 text=re.sub(r'\.\s*;',';',text)   # a dealt cost written as a sentence: "(but you can Set).; add" -> "(but you can Set); add"
 text=re.sub(r'\b1 ((?:[A-Z]+|[A-Z][a-z-]+) )?monsters\b',r'1 \1monster',text)   # "banishing 1 WIND monsters"
 text=re.sub(r'\b(\d+) up to \1\b',r'up to \1',text)       # "add 3 up to 3 ..." -> "add up to 3 ..."
 # a phrase the block and its filter both say: "Special Summon up to up to 4", "any number of any number of" (Nov 20)
 text=re.sub(r'\b(up to|any number of|and shuffle|all|from your GY|on the field) \1\b',r'\1',text)
 text=re.sub(r'\b([Tt]arget) (face-up|face-down|Set) ',r'\1 1 \2 ',text)   # "Target face-up monster on the field" (n=1 left out)
 text=re.sub(r'\bEquip only to (?=face-up |[A-Z][a-z][\w-]* monster|Level )',r'Equip only to a ',text)
 text=re.sub(r' in your (GY|Deck|hand) from your \1\b',r' from your \1',text)   # "add 1 Spell in your GY from your GY to your hand"
 text=re.sub(r"(name is treated as) (?!\")([A-Z][^.,;\"]*?)([.,;])",r'\1 "\2"\3',text)   # "This card's name is treated as Umi."
 text=re.sub(r'\b([Yy])our all ',lambda m:'All ' if m.group(1)=='Y' else 'all ',text)   # "Your all monsters you control gain 200 ATK"
 text=re.sub(r'(\b(?:gains?|loses?) \d+ (?:ATK|DEF)) and 0 (?:ATK|DEF)\b',r'\1',text)   # "gains 500 ATK and 0 DEF for each ..."
 text=re.sub(r'\b(gains?|loses?) 0 (?:ATK|DEF) and (\d+)',r'\1 \2',text)
 # a target of 2 or more is "them": "Target 2 Spell/Trap Cards on the field; return it to the hand" (Nov 20)
 text=re.sub(r'(\b[Tt]arget (?:up to )?(?:[2-9]|\d\d)\b[^;.]*; (?:return|destroy|banish|send|shuffle|place|change|turn|Special Summon|equip)) it\b',r'\1 them',text)
 text=re.sub(r'\b([Aa]) (?=(?:Aqua|Insect|EARTH|Effect)\b)',r'\1n ',text)
 # Movement verbs that take their object in the middle ("turn face-down it" -> "turn it face-down").
 for rest in ('face-down','to Defense Position','to Attack Position'):
  text=re.sub(rf'\b([Tt]urn|[Cc]hange) {re.escape(rest)} (it|them)\b',rf'\1 \2 {rest}',text)
  # "change to Defense Position all monsters you control" -> "change all monsters you control to Defense Position"
  text=re.sub(rf'\b([Tt]urn|[Cc]hange) {re.escape(rest)} (all [^.;:]+?)(?=[.;:]|, then|$)',rf'\1 \2 {rest}',text)
 text=re.sub(r'( from (?:your|the) [\w ,]{2,30}?(?:Deck|GY|hand|field))\1\b',r'\1',text)   # "from your hand, Deck, or GY from your hand, Deck, or GY"
 text=re.sub(r'\b([Ss])end this monster from your field to the GY\b',r'\1end this card to the GY',text)
 text=re.sub(r'\b(each|the|a|an|your|of|to|and|or|for|this|that|it) \1\b',r'\1',text)   # "for each each of" (Nov 23)
 text=re.sub(r"\bfor each card in (your opponent's|your) banished cards\b",r"for each of \1 banished cards",text)
 text=re.sub(r"\b[Yy]our ([A-Z][^.;:]*? monsters) you control\b",r"\1 you control",text)   # "Your Beast monsters you control"
 text=re.sub(r'\b(increase|decrease)(s?) (\d+) (ATK|DEF)\b',lambda m:('gain' if m.group(1)=='increase' else 'lose')+m.group(2)+f' {m.group(3)} {m.group(4)}',text)
 if _ARCH_RX:text=_ARCH_RX.sub(lambda m:f'"{m.group(1)}" {m.group(2)}',text)
 # a target in the GY is added to the hand, not "returned" ("Target 1 monster in your GY; ..., then return it to the hand")
 text=re.sub(r"(\b[Tt]arget [^;.]*\b(?:in (?:your|either|your opponent's) GY|banished (?:cards?|monsters?)|of your banished cards)\b[^;.]*;[^.]*?\b)return (it|them) to (?:the|your) hand\b",r'\1add \2 to your hand',text)
 # 500-card review (Nov 24)
 text=re.sub(r'\b(you control|controls) ((?:face-up )?[A-Z][\w-]*(?: [A-Z][\w-]*)? monster)\b(?!s)',lambda m:m.group(1)+(' an ' if m.group(2)[0] in 'AEIOU' else ' a ')+m.group(2),text)   # "if you control Spellcaster monster"
 text=re.sub(r"(?<![\w\"])'([A-Z][\w ]*?'s)'(?= )",r'"\1"',text)   # "'Gravekeeper's' monster" -> '"Gravekeeper's" monster'
 text=re.sub(r'\b(You cannot [^.;]*? (?:this turn|this card)(?: \(but you can Set\))?)(?:,|;) then ([Tt]arget)',lambda m:m.group(1)+'. '+m.group(2).capitalize(),text)
 # the restriction joined to another cost: "You cannot ... this card and discard 1 monster, then target ..." (Nov 24)
 text=re.sub(r'\b(You cannot [^.;]*? (?:this turn|this card)(?: \(but you can Set\))?) and ([a-z][^.;]*?, then [Tt]arget)',lambda m:m.group(1)+'. '+m.group(2)[:1].upper()+m.group(2)[1:],text)
 # second round of the 200-card review (Nov 23)
 text=re.sub(r'(Summons) ((?:face-up )?monster\(s\)) your opponent Summons\b',r'\1 \2',text)   # filter said the timing again
 text=re.sub(r'(\(but you can Set\)), then ([Tt]arget)',lambda m:m.group(1)+'. '+m.group(2).capitalize(),text)
 text=re.sub(r'\b([Ss]huffle (?:it|them))(?=[.;])',r'\1 into the Deck',text)   # "shuffle them." with nowhere to go
 text=re.sub(r'(?:^|(?<=\. ))While it is the Battle Phase, (.+?) during the Battle Phase\.',lambda m:m.group(1)[:1].upper()+m.group(1)[1:]+' during the Battle Phase.',text)
 text=_refer_back(text)
 text=re.sub(r'(monster\(s\)[^.]*?\b(?:banish|destroy|return|send|shuffle|equip)) it\b',r'\1 them',text)   # "destroy that monster(s), and if you do, banish them"
 return re.sub(r' {2,}',' ',_merge_sentences(text))

# Back-references (user, Nov 21: "use wording like 'that card' or 'it' instead of repeating the same thing"). A
# timing that already names the monster ("when this card attacks a face-down Defense Position monster:") is followed
# by "that monster", not the whole description again. Only where the two mean the same card.
# archetype names in effect text are quoted like on real cards: '"Archfiend" monster', '"Ninja" monster' (Nov 23)
def _arch_rx():
 try:names=[a['name'] for a in json.loads((ROOT/'data/archetypes.json').read_text(encoding='utf8'))['archetypes']]
 except Exception:return None
 names=[n for n in names if n not in RACES and n not in ('Toon','LV','Exodia','Forbidden One') and len(n)>2]
 return re.compile(r'(?<!["\w])('+'|'.join(re.escape(n) for n in sorted(names,key=len,reverse=True))+r') (monsters?|cards?|Spells?|Traps?)\b') if names else None
_ARCH_RX=_arch_rx()
_ATTACKED=re.compile(r'\bthe (?:face-(?:up|down) )?(?:(?:Defense|Attack) Position )?monster this card is (?:attacking|battling)\b')
_SUMMONED=re.compile(r'\bthe (?:Flip |Normal |Special |Tribute )?Summoned ([^;,.:]*?)monster(\(s\))?(?!s)')
_QUAL=r'\d+ or (?:more|less) (?:ATK|DEF)|Level \d+ or (?:higher|lower)'
_SAME_TIME=('during your End Phase','during the End Phase','during your Standby Phase','at the end of the Damage Step','during the Damage Step')
def _refer_back(text):
 out=[];last_lead=''
 for sent in re.split(r'(?<=\.) ',text):
  lead,sep,body=sent.partition(': ')
  # a coin call's outcome sentence belongs to the timing before it ("When this card attacks a face-up Defense Position
  # monster: ... toss a coin and call it. If you call it right, destroy that monster", Nov 24)
  if not sep and last_lead and re.match(r'If you call it (?:right|wrong)|Heads:|Tails:',sent):
   lead,sep,body=last_lead,'',sent
   if re.search(r'\battacks\b',lead):body=_ATTACKED.sub('that monster',body)
   out.append(body);continue
  if not sep or ';' in lead:out.append(sent);last_lead='';continue
  last_lead=lead
  # the effect said its own timing again: "When this card inflicts Battle Damage to your opponent: When this card
  # inflicts Battle Damage, declare ..." (Nov 24)
  m=re.match(r'(?i)(?:when|if) (this card [^,]{6,80}?), (.)',body)
  if m and m.group(1).lower() in lead.lower():body=m.group(2).upper()+body[m.end():]
  if re.search(r'\battacks\b',lead):body=_ATTACKED.sub('that monster',body)
  # "When a non-Zombie monster attacks this card: ... the non-Zombie monster that attacked this card cannot attack"
  if re.search(r'attack(?:s|ed) this',lead):
   body=re.sub(r'\b([Tt])he (?:[\w-]+ )*?monster that attacked this card\b',lambda m:('T' if m.group(1)=='T' else 't')+'hat monster',body)
  if 'Summon' in lead:body=re.sub(r'\b(?:face-up )?monsters your opponent Summoned\b','those monsters',body)
  if 'Summon' in lead:
   body=_SUMMONED.sub(lambda m:'that monster'+(m.group(2) or '') if all(w in lead for w in m.group(1).split()) else m.group(0),body)
  # "that monster(s) with 1500 or more ATK" / "if it has 500 or less ATK" after a timing that said so
  body=re.sub(rf'\b(that monster(?:\(s\))?|that card) with ({_QUAL})',lambda m:m.group(1) if m.group(2) in lead else m.group(0),body)
  body=re.sub(rf' if it has ({_QUAL})(?=[;,.])',lambda m:'' if m.group(1) in lead else m.group(0),body)
  for when in _SAME_TIME:   # "During your End Phase: ... change this card to Defense Position during your End Phase"
   if when.lower() in lead.lower():body=re.sub(rf'\s+{when}(?=[.;,]|$)','',body,flags=re.I)
  out.append(lead+sep+body)
 text=' '.join(out)
 # "..., then destroy all your face-up Level 1 Normal Monsters" after the same group was named: "then destroy them"
 def them(m):
  return m.group(1)+'them' if m.group(3) in m.string[:m.start()].split('. ')[-1] else m.group(0)
 return re.sub(r'(, then (?:destroy|banish|return|send) )(all (?:your )?)?((?:[\w-]+ ){2,}(?:monsters|Monsters|cards))(?=[.;])',them,text)

# One subject, two sentences: "The equipped monster loses 1000 ATK. The equipped monster gains 300 DEF." reads "The
# equipped monster loses 1000 ATK and gains 300 DEF."; "All Spellcaster monsters gain 200 DEF. ... All Spellcaster
# monsters gain 200 ATK." reads "All Spellcaster monsters gain 200 ATK and DEF."
_STAT_LINE=re.compile(r'^(The equipped monster|This card|All [^.]+? monsters|[^.]+? monsters you control) (gains?|loses?) (\d+) (ATK|DEF)\.$')
_EQ_CLAUSE=re.compile(r'(gains|loses) (\d+) (ATK and DEF|ATK|DEF)')
_EQ_LINE=re.compile(r'^The equipped monster ((?:gains|loses) \d+ (?:ATK and DEF|ATK|DEF)(?: and (?:gains|loses) \d+ (?:ATK and DEF|ATK|DEF))*)\.$')
def _net_equipped(sents):
 """"The equipped monster loses 200 DEF and gains 300 DEF" reads "gains 100 DEF"; "gains 300 DEF and gains 1500 DEF"
 reads "gains 1800 DEF" (review of 200 cards, Nov 23). Consecutive sentences about the equipped monster's ATK/DEF."""
 out=[];i=0
 while i<len(sents):
  if not _EQ_LINE.match(sents[i]):out.append(sents[i]);i+=1;continue
  tot={'ATK':0,'DEF':0};j=i
  while j<len(sents) and _EQ_LINE.match(sents[j]):
   for verb,n,stat in _EQ_CLAUSE.findall(sents[j]):
    for s in ('ATK','DEF') if stat=='ATK and DEF' else (stat,):tot[s]+=int(n)*(1 if verb=='gains' else -1)
   j+=1
  a,d=tot['ATK'],tot['DEF']
  word=lambda v,s:f"{'gains' if v>0 else 'loses'} {abs(v)} {s}"
  if a and a==d:out.append(f'The equipped monster {word(a,"ATK and DEF")}.')
  elif a and d and (a>0)==(d>0):out.append(f"The equipped monster {'gains' if a>0 else 'loses'} {abs(a)} ATK and {abs(d)} DEF.")
  elif a or d:out.append('The equipped monster '+' and '.join(word(v,s) for v,s in ((a,'ATK'),(d,'DEF')) if v)+'.')
  i=j
 return out

def _sum_plain(sents):
 """"Gain 1000 LP. Gain 400 LP." reads "Gain 1400 LP."; the same for "Inflict N damage to your opponent." (Nov 24)."""
 out=[]
 for s in sents:
  m=re.fullmatch(r'(Gain|Inflict) (\d+) (LP|damage to your opponent)\.',s)
  n=re.fullmatch(r'(Gain|Inflict) (\d+) (LP|damage to your opponent)\.',out[-1]) if out else None
  if m and n and m.group(1,3)==n.group(1,3):out[-1]=f'{m.group(1)} {int(m.group(2))+int(n.group(2))} {m.group(3)}.'
  else:out.append(s)
 return out

def _merge_sentences(text):
 sents=_sum_plain(_net_equipped(re.split(r'(?<=\.) (?=[A-Z])',text)));out=[]
 for s in sents:
  m=_STAT_LINE.match(s)
  if m:
   # same subject, verb and amount with the other stat anywhere before: one "ATK and DEF" sentence
   for i,o in enumerate(out):
    n=_STAT_LINE.match(o)
    if n and n.group(1,2,3)==m.group(1,2,3) and n.group(4)!=m.group(4):
     out[i]=f'{n.group(1)} {n.group(2)} {n.group(3)} ATK and DEF.';break
   else:
    n=_STAT_LINE.match(out[-1]) if out else None
    if n and n.group(1)==m.group(1):out[-1]=out[-1][:-1]+f' and {m.group(2)} {m.group(3)} {m.group(4)}.'
    else:out.append(s)
   continue
  out.append(s)
 return ' '.join(out)

# ---------------------------------------------------------------- whole cards
# Fusion rules that register their own materials in the Lua (Fusion.AddProcMix with real codes). A dealt Fusion that
# keeps one of them lists those materials, or it read "1 Level 4 or lower monster + "Big Koala" / Must be Fusion
# Summoned with ..." with two different sets (Discord Nov 21, "Penguin Soldier"). Contact Cannon's are its named cards.
FUSION_RULE_MATS={'dark_balter':(52860176,38742075),'ryu_senshi':(75953262,67957315),'fiend_skull_dragon':(93220472,16475472),
 'dark_paladin':(46986414,78193831)}
def _rule_materials(effects):
 for e in effects:
  for p in e.get('acts',[]):
   if p['k'] in FUSION_RULE_MATS:
    return [{'k':'code','v':c,'text':f'"{MONSTER_BY_ID[c]["name"]}"'} for c in FUSION_RULE_MATS[p['k']] if c in MONSTER_BY_ID]
   if p['k']=='contact_cannon' and p.get('codes'):
    names=p.get('names') or [MONSTER_BY_ID.get(c,{}).get('name','?') for c in p['codes']]
    return [{'k':'code','v':c,'text':f'"{n}"'} for c,n in zip(p['codes'],names)]
 return None

def _materials_text(mats):
 """"1 Warrior monster + 1 EARTH monster + 1 Warrior monster" reads "2 Warrior monsters + 1 EARTH monster" (user,
 Nov 21: say it once). Named cards stay one per material, as on real cards ("Thunder Dragon" + "Thunder Dragon")."""
 counts=Counter(m['text'] for m in mats);out=[]
 for m in mats:
  t=m['text']
  if t in out or any(o.endswith(t[2:]+'s') for o in out if t.startswith('1 ')):continue
  k=counts[t]
  if k>1 and t.startswith('1 ') and t.lower().endswith(' monster'):out.append(f'{k} {t[2:]}s')
  elif k>1 and t.startswith('1 '):out.append(f'{k} {t[2:]}')
  else:out.extend([t]*k)
 return ' + '.join(out)

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
 # One card of the group not used yet by this run (then any of the group, then any of the fallback). Random tries
 # first: building the list of unused cards for every card made 1,000 cards slow (Nov 19).
 for _ in range(24):
  c=rng.choice(group) if group else None
  if c is None or c['id'] not in used:break
 if c is None or c['id'] in used:
  free=[x for x in group if x['id'] not in used] or group or fallback;c=rng.choice(free)
 used.add(c['id']);return c

def _name_art(rng,group,used,fallback=None):
 # Name from one card, art from a different card, both of the same kind (monster/Spell/Trap) and, for monsters, the
 # same Type. Unused cards first; then any card of the group; then the fallback (all monsters).
 free=[c for c in group if c['id'] not in used]
 if len(free)<2:free=group if len(group)>=2 else [c for c in fallback if c['id'] not in used] or fallback
 name,art=rng.sample(free,2);used.update((name['id'],art['id']));return name,art

def _engine_data(card):
 data={'code':card['id'],'alias':0,'setcodes':list(card.get('setcodes',[])),'type':card['data_type'],'level':card.get('level',0),'attribute':ATTRIBUTES.get(card.get('attribute'),0),
  'race':str(RACES.get(card.get('race'),0)),'attack':card.get('atk',0),'defense':card.get('defense',0),'lscale':0,'rscale':0,'link_marker':0}
 tm=_trap_monster_stats(card)
 if tm:data.update(level=tm[0],attack=tm[1],defense=tm[2],race=str(tm[3]),attribute=tm[4])
 return data

# A Trap that Special Summons itself as a monster takes its stats from its card data, like real Trap Monsters
# (the Lua calls AddMonsterAttribute without stats). Randomized Traps had 0 there, so they came out 0/0 (Discord,
# Nov 20, "Staunch Defender"). Level, ATK, DEF, Type and Attribute come from the block, as on the real card.
TRAP_MONSTER_FIXED={'tiki_curse':(4,1800,1000,'Rock','DARK'),'swamp_mirrorer':(4,1800,1000,'Reptile','WATER')}
def _as_bits(v,table):
 return v if isinstance(v,int) else table.get(v,0)
def _trap_monster_stats(card):
 pieces=[p for e in card.get('effects') or [] for p in e.get('acts',[])]+list((card.get('parts') or {}).get('acts',[]))
 for p in pieces:
  if p['k'] in TRAP_MONSTER_FIXED:
   l,a,d,r,at=TRAP_MONSTER_FIXED[p['k']];return (l,a,d,RACES[r],ATTRIBUTES[at])
  if p['k'] in ('trap_monster_normal','trap_monster_effect') and p.get('n') is not None:
   return (p.get('l') or 4,p['n'],p.get('d',0),_as_bits(p.get('race'),RACES),_as_bits(p.get('attr'),ATTRIBUTES))
 return None

def _lua(value):
 if isinstance(value,bool):return 'true' if value else 'false'
 if isinstance(value,(int,float)):return str(value)
 if isinstance(value,str):return json.dumps(value)
 if isinstance(value,list):return '{'+','.join(_lua(v) for v in value)+'}'
 return '{'+','.join(f'{k}={_lua(v)}' for k,v in value.items())+'}'

def card_script(card):
 if card.get('effects') is not None:return _deal_script(card)
 return _roll_script(card)

def _deal_script(card):
 rand={'slot':card['slot'],'frame':card.get('frame',''),'effects':[]}
 for e in card['effects']:
  ne={c:[dict(p) for p in e.get(c,[])] for c in CATEGORIES}
  for p in [p for c in CATEGORIES for p in ne[c]]+[x for w in ne['others'] for x in w.get('tails_acts',[])+[a for b in w.get('bands',[]) for a in b['acts']]]:
   if isinstance(p.get('race'),str):p['race']=RACES.get(p['race'],0)
   if isinstance(p.get('exclude_race'),str):p['exclude_race']=RACES.get(p['exclude_race'],0)
   if isinstance(p.get('races'),list):p['race']=sum(RACES.get(x,0) for x in p.pop('races'))
   if isinstance(p.get('attr'),str):p['attr']=ATTRIBUTES.get(p['attr'],0)
   if isinstance(p.get('attrs'),list):p['attr']=sum(ATTRIBUTES.get(x,0) for x in p.pop('attrs'))
  rand['effects'].append(ne)
 if card.get('materials'):rand['mats']=[{k:v for k,v in m.items() if k!='text'} for m in card['materials']]
 if card.get('monster_kind')=='union' and card.get('union'):rand['kind']='union';rand['union']={'race':RACES[card['union']['race']],'n':card['union']['n']}
 return (f'--{card["name"]} (randomized card, dealt by randomizer.py)\n'
  'if not Randomizer then Duel.LoadScript("randomizer.lua") end\n'
  'local s,id=GetID()\n'
  f's.rand={_lua(rand)}\n'
  'function s.initial_effect(c) Randomizer.BuildReal(c,s,id) end\n')

def _roll_script(card):
 rand={'slot':card['slot'],'frame':card.get('frame',''),**{c:[{k:v for k,v in p.items() if k!='text'} for p in card['parts'][c]] for c in CATEGORIES}}
 nested=[x for w in rand['others'] for x in w.get('tails_acts',[])+[a for b in w.get('bands',[]) for a in b['acts']]]
 for p in [p for c in CATEGORIES for p in rand[c]]+nested:
  if isinstance(p.get('race'),str):p['race']=RACES[p['race']]
  if isinstance(p.get('exclude_race'),str):p['exclude_race']=RACES[p['exclude_race']]
  if isinstance(p.get('races'),list):p['race']=sum(RACES[x] for x in p.pop('races'))
  if isinstance(p.get('attr'),str):p['attr']=ATTRIBUTES[p['attr']]
  if isinstance(p.get('attrs'),list):p['attr']=sum(ATTRIBUTES[x] for x in p.pop('attrs'))
 if card.get('materials'):rand['mats']=[{k:v for k,v in m.items() if k!='text'} for m in card['materials']]
 if card.get('ritual_for'):rand['ritual_for'],rand['ritual_level']=card['ritual_for'],card['ritual_level']
 if card.get('monster_kind'):rand['kind']=card['monster_kind']
 if card.get('union'):rand['union']={'race':RACES[card['union']['race']],'n':card['union']['n']}
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
  named=[p[key] for cat in ('acts','conds','costs','others') for p in card['parts'][cat] if key in p and isinstance(p[key],str) and not CATEGORIES[cat][p['k']].get('no_match') and p.get('side')!='opp']
  if named and named[0]!=card[field] and rng.random()<TYPE_MATCH:
   log.append(f"{field} {card[field]} -> {named[0]}: its effect names {named[0]}");card[field]=named[0]
   # The other half of the pair follows, unless the effect names it too (a Dragon is then likelier LIGHT or DARK).
   other,okey='attribute' if field=='race' else 'race','attr' if field=='race' else 'race'
   if not any(okey in p for cat in card['parts'].values() for p in cat):
    pairs={pr:w for pr,w in PAIR_WEIGHTS.items() if pr[0 if field=='race' else 1]==named[0]}
    if pairs:card[other]=pick(rng,pairs)[1 if field=='race' else 0]

# Spirit, Toon and Union Monsters (user, Nov 19), as often among Effect Monsters as on real cards. They are kinds of
# card, like Fusion or Ritual: the Lua (R.Build) installs the kind on top of the card's own effect.
#   Spirit: Cannot be Special Summoned; returns to the hand at the End Phase of the turn it is Normal Summoned / flipped.
#   Toon:   can attack directly while you control "Toon World" and the opponent has no Toon; cannot attack the turn it is
#           Summoned; destroyed with "Toon World".
#   Union:  equips to a monster of one Type (or unequips and Special Summons itself), which gains ATK/DEF; the Union is
#           destroyed instead of it. Like most real Unions it has no other effect.
_EFFECT_MONSTERS=sum(1 for c in MONSTERS if c['data']['type']&TYPE_EFFECT and not c['data']['type']&(TYPE_FUSION|TYPE_RITUAL))
MONSTER_KINDS={k:sum(1 for c in MONSTERS if c['type']==t)/max(_EFFECT_MONSTERS,1) for k,t in
 (('spirit','Spirit Monster'),('toon','Toon Monster'),('union','Union Effect Monster'))}
KIND_BITS={'spirit':0x200,'toon':0x400000,'union':0x400}
SPIRIT_TEXT='During the End Phase of the turn this card is Normal Summoned or flipped face-up: Return it to the hand.'
TOON_TEXT=('This card cannot attack the turn it is Summoned. While you control "Toon World" and your opponent controls no Toon '
 'monsters, this card can attack your opponent directly. If "Toon World" on the field is destroyed, destroy this card.')
def _monster_kind(rng,card,log):
 """Maybe make an Effect Monster a Spirit, Toon or Union (MONSTER_KINDS)."""
 r=rng.random();kind=None
 for k,share in MONSTER_KINDS.items():
  if r<share:kind=k;break
  r-=share
 if not kind:return
 card['monster_kind']=kind;log.append(f'{kind} monster')
 parts=card['parts']
 if kind=='spirit':
  # Real Spirits cannot be Special Summoned; no effect that Special Summons this card itself.
  parts['acts']=[a for a in parts['acts'] if not ACTS.get(a['k'],{}).get('hand')]
  if not any(p['k']=='cannot_ss' for p in parts['limits']):parts['limits']=[p for p in parts['limits'] if not LIMITS[p['k']].get('once') or p['k']!='cannot_ss']+[{'k':'cannot_ss'}]
 if kind=='union':
  race=card['race'] if rng.random()<.4 else pick(rng,MATERIAL_RACES)
  card['union']={'race':race,'n':rng.choice((300,500,500,800,1000))}
  card['parts']={c:[] for c in CATEGORIES}

def _kind_text(card):
 kind=card.get('monster_kind')
 if kind=='union':
  u=card['union']
  return (f'Once per turn, you can either: Target 1 {u["race"]} monster you control; equip this card to that target, OR: Unequip this '
   f'card and Special Summon it. While equipped by this effect, the equipped monster gains {u["n"]} ATK/DEF. If the equipped '
   'monster would be destroyed by battle or card effect, destroy this card instead.')
 if kind=='spirit':return SPIRIT_TEXT
 if kind=='toon':return TOON_TEXT
 return ''

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
 """One randomized card (two for a Ritual Monster: it brings its Ritual Spell). Returns a list of cards. With the real
 deck (DEAL_MODE) the card is dealt (see "the deal" at the end of this file); otherwise it is rolled."""
 if not DEAL_MODE:return _roll_card(rng,next_id,used,kind,frame,sub,log)
 d=_dealer(used,rng)
 # whimsy: now and then a card from the old free-rolling model (user, Nov 24). It must pass the same checks as dealt
 # cards (_rolled_ok), or it is rolled again; after a few tries the card is dealt after all.
 if d.rng.random()<ROLLED_SHARE:
  for _ in range(8):
   out=_roll_card(rng,next_id,used,kind,frame,sub,(log if log is not None else [])+['rolled by the old model, for variety'])
   if _rolled_ok(out):return out
 for _ in range(6):
  out=_deal_card(d,rng,next_id,used,kind,frame,sub,log)
  if out:return out
 return _roll_card(rng,next_id,used,kind,frame,sub,log)

def _rolled_ok(cards):
 """A rolled card meets the rules the deal learned: no piece that only works on its own real card, no effect that is
 only a drawback, a Level for its Tribute rules, its own Attribute for "non-LIGHT" self-destruction, a sensible text."""
 for card in cards:
  parts=card.get('parts') or {}
  keys={p['k'] for c in CATEGORIES for p in parts.get(c,[])}
  if keys&(DEAL_OFF|ROLL_OFF):return False
  if parts.get('acts') and all(_drawback_only(p) for p in parts['acts']):return False
  if card.get('kind')=='monster' and (card.get('level') or 0)<_level_needed([parts]):return False
  own=next((OWN_ATTRIBUTE[k] for k in keys if k in OWN_ATTRIBUTE),None)
  if own and card.get('attribute')!=own:return False
  if parts.get('acts'):
   # an action that needs a timing has it ("Heads: Banish the Summoned monster(s) ..." with no Summon timing, Nov 24)
   need=_event_need(parts['acts']);ev=_event(parts)
   if need not in (None,'none') and ev not in need:return False
   try:
    if _text_problem({c:parts.get(c,[]) for c in CATEGORIES},card['slot']):return False
    t=effect_text({'slot':card['slot'],'name':card.get('name','X'),'parts':parts})
   except Exception:return False
   if re.search(r'\bthe (?:[\w-]+ )?Summoned monster',t) and not re.search(r'(?i)Summons?\b[^.]*:',t):return False
 return True

def _roll_card(rng,next_id,used,kind=None,frame=None,sub=None,log=None):
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
  if frame=='effect':_monster_kind(rng,card,log)
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
  has_effect=bool(card['parts']['acts']) or bool(card.get('monster_kind'))
  t=TYPE_MONSTER|{'normal':TYPE_NORMAL,'effect':TYPE_EFFECT,'fusion':TYPE_FUSION,'ritual':TYPE_RITUAL}[frame]
  if has_effect:t|=TYPE_EFFECT
  if flip:t|=TYPE_FLIP
  if card.get('monster_kind'):t|=KIND_BITS[card['monster_kind']]
  card['data_type']=t
  label={'normal':'Normal Monster','effect':'Effect Monster','fusion':'Fusion Monster','ritual':'Ritual Monster'}[frame]
  if flip:label='Flip Effect Monster'
  if card.get('monster_kind'):label={'spirit':'Spirit Monster','toon':'Toon Monster','union':'Union Effect Monster'}[card['monster_kind']]
  elif frame in ('fusion','ritual') and has_effect:label=label.replace(' Monster',' Effect Monster')
  card['type']=label
  card['type_line']='['+'/'.join([card['race']]+(['Fusion'] if frame=='fusion' else ['Ritual'] if frame=='ritual' else [])+([card['monster_kind'].capitalize()] if card.get('monster_kind') else [])+(['Flip'] if flip else [])+(['Effect'] if has_effect else [])+(['Normal'] if frame=='normal' else []))+']'
  if frame=='normal':
   desc=(name['desc'] if name['type']=='Normal Monster' else None) or rng.choice(FLAVOR_BY_RACE.get(race) or NORMAL_FLAVOR)
   card['desc']=desc;card['flavor']=True
  else:
   card['desc']=effect_text(card)
   # The kind's own text: Spirit right after "Cannot be Special Summoned.", Toon first, Union alone.
   kt=_kind_text(card)
   if kt and card.get('monster_kind')=='spirit':
    head='Cannot be Special Summoned.';rest=card['desc'].replace(head,'',1).strip()
    card['desc']=' '.join(x for x in (head,kt,rest) if x)
   elif kt:card['desc']=' '.join(x for x in (kt,card['desc']) if x)
  out=[card]
  if frame=='fusion':
   card['materials']=_fusion_materials(rng,race)
   card['desc']=_materials_text(card['materials'])+('\n'+card['desc'] if card['desc'] else '')
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
  elif wrap and wrap['k']=='dice_branch':effects=_dice_text(wrap,acts,spell)
  else:effects=_chain(acts,spell)
  if wrap:effects=_wrap_text(wrap,effects,spell)
  lines.append(f'Then, {effects}.')
 for p in limits:
  if p['k']=='hopt':lines.append(f'You can only activate 1 "{name}" per turn.')
  elif p['k']=='once_duel':lines.append(f'You can only activate 1 "{name}" per Duel.')
  elif LIMITS[p['k']].get('text'):lines.append(_fmt(LIMITS[p['k']]['text'].replace('{what}','card'),p,spell))
 return ' '.join(lines)

def _strings(card):
 label='Ritual Summon' if card['slot']=='s_ritual' else next((ACTS[p['k']]['label'] for p in card['parts']['acts'] if 'label' in ACTS.get(p['k'],{})),'Activate')
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

# Real-card blocks on (see _enable_templates); last, because checking each real use needs _fmt.
_enable_templates([k for k in REAL.get('templates',{}) if k not in TEMPLATE_OFF])

# ================================================================ the deal (user, Nov 19)
# "Take all the existing effects, types and cards and shuffle them up between each other, so that each block appears
# the exact same number of times." data/randomizer-templates.json 'deck' (tools/build_randomizer_templates.py) holds
# every real card as a shell (its frame, its effects' layout, what makes it work) and every piece of its effects in a
# bag. A dealer shuffles the shells, the stat lines (Level/ATK/DEF), the Type/Attribute pairs and the bags, then deals:
# each shell's effects are filled with pieces drawn from the bags, real amounts included. Over a full deal every block,
# amount, card type and stat line appears as often as on the real cards; a run's pool or a pack is a share of a deal.
# A dealt effect must work, or its pieces go back for another try:
#   pieces fit the card (real fits); an effect real cards only use after certain timings brings one of them; an effect
#   written with its own trigger ("when this card inflicts battle damage, ...") gets no other timing; Spells used in
#   your Main Phase get no timing and no condition tied to the opponent's turn or a phase; the generator's rules
#   (problem(), relaxed) and the power budget (3% of effects may break it) hold.
# Pieces that name real cards name randomized cards dealt before them instead (same kind). Unions use the generic
# Union procedure; Spirit and Toon pieces and summoning rules stay with their shell.
DECK=REAL.get('deck')
DEAL_MODE=bool(DECK)

# Whimsy (user, Nov 24: "they have become a bit stale ... a lot of the effects are just fully copied blocks from other
# cards"). Every dealt card still passes every rule and text check; these only add variety:
ROLLED_SHARE=.12      # this share of cards comes from the old free-rolling model instead of the deal
# pieces the deal keeps with their own real card (tools/build_randomizer_templates.py SETUP_ONLY): a rolled card would
# have them alone ("Place 1 counter on this card ...", "While this card is a monster ...")
# wave_motion_damage only works with the counter that wave_motion_counter places (flag 384f9fb7, 2026-11-26: a rolled card
# could never be activated).
ROLL_OFF={'wave_motion_counter','wave_motion_damage','breaker_place_counter','hannibal_counter_setup','hannibal_normal_summon_counter',
 'royal_magical_library_counters','spell_counter_per_spell_activation','mausoleum_proc','manticore_grave_flag',
 'gilasaurus_procedure_summoned','tiki_soul_protect','zoma_burn','blast_with_chain_destroyed','ninjitsu_transform_leave_destroy'}
WHIMSY=.22            # a dealt effect gets one twist: an extra action, cost or condition, or one condition less
WHIMSY_COPY=.9        # ... far more often when it came out as an exact copy of a real card's effect
REAL_SIGS=set((DECK or {}).get('real_sigs',()))
def effect_sig(e):
 """The piece keys of an effect, as "conds|costs|acts" (sorted): what makes two effects the same effect."""
 return '|'.join(','.join(sorted(p['k'] for p in e.get(c,[]))) for c in ('conds','costs','acts'))
# Blocks the deal leaves out: Lua errors or loops seen in the engine tests (gates of Nov 19).
# Everything else the recreation maps goes in, also blocks the rolled cards keep off (TEMPLATE_OFF: often only "never
# used" when forced onto any card; dealt, they keep the kind of effect and card they came from).
DEAL_OFF={'dna_transplant','emperor_holiday','spellbinding_circle','wall_of_revealing_light','xing_zhen_hu','infernal_flame_destroy_st',
 'mysterious_guard','no_spells_traps_activation_turn','minor_goblin_official','tribute_summoned','chaosrider_boost',
 'last_will','legacy_hunter_return_random',   # these two crashed the engine when dealt (Nov 19)
 # review of 200 dealt cards (Nov 23): they only work on their own real card. "...Special Summoned by the effect of a
 # lower Ultimate Insect LV monster", "(Super Roboyarou)... its paired Fusion Monster", "not equipped with a Union
 # Monster by this effect" on cards that can never be any of those
 'ultimate_insect_lv','super_robo_pair','union_rider_unencumbered'}
TURN_LOCK=re.compile(r"(?i)opponent's turn|opponent's (standby|main|battle|end)|battle phase|damage step|damage calculation|standby phase|end phase|either player's turn")
MAIN_ONLY={'s_normal','s_equip','s_field','s_ritual'}
LUA_RULES=set((DECK or {}).get('lua_rules',()))
OWN_TRIGGER=re.compile(r'^(when|if|once|while|after)\b',re.I)
_SLOT_OF={('monster','normal'):'m_none',('monster','effect'):'m_main',('monster','fusion'):'m_fusion',('monster','ritual'):'m_ritual',
 ('spell','Normal'):'s_normal',('spell','Quick-Play'):'s_quick',('spell','Continuous'):'s_cont',('spell','Equip'):'s_equip',('spell','Field'):'s_field',
 ('trap','Normal'):'t_normal',('trap','Continuous'):'t_cont',('trap','Counter'):'t_counter'}
_SUB_OF={v:k[1] for k,v in _SLOT_OF.items() if k[0]!='monster'}
_REAL_BY_ID={}

class _Dealer:
 def __init__(self,seed,used):
  self.used=used;self.rng=random.Random(seed);self.made=[];self.rounds=0;self._fill()
 def _fill(self):
  rng=self.rng;self.rounds+=1
  self.shells=list(DECK['shells']);rng.shuffle(self.shells);self.i=0
  bags={k:[dict(p) for p in v if p['k'] not in DEAL_OFF and p['k'] in CATEGORIES[k.split('|')[1]] and not CATEGORIES[k.split('|')[1]][p['k']].get('set')] for k,v in DECK['bags'].items()}
  # An always-on block used in an activated effect goes to the always-on bag, and the other way round: an effect's
  # text and Lua follow its first block.
  for a,b,move in (('activated|acts','continuous|acts',lambda q:q['k'] in AURAS),('continuous|acts','activated|acts',lambda q:q['k'] not in AURAS)):
   keep=[q for q in bags.get(a,[]) if not move(q)];bags.setdefault(b,[]).extend(q for q in bags.get(a,[]) if move(q));bags[a]=keep
  self.bags=bags;self.full={k:list(v) for k,v in bags.items()}
  for v in self.bags.values():rng.shuffle(v)
  self.st=defaultdict(list)
  for sh in self.shells:
   if sh.get('st'):self.st[sh['f']].append(list(sh['st']))
  self.ra=[list(sh['ra']) for sh in self.shells if sh.get('ra')]
  for v in list(self.st.values())+[self.ra]:rng.shuffle(v)
 def shell(self,kind=None,frame=None,sub=None):
  want=_SLOT_OF.get((kind,frame if kind=='monster' else sub)) if kind and (frame or sub) else None
  for _ in range(2):
   for j in range(self.i,len(self.shells)):
    sh=self.shells[j]
    if (want and sh['s']!=want) or (kind and not want and (sh['s'][0]=='m')!=(kind=='monster')):continue
    self.shells[self.i],self.shells[j]=self.shells[j],self.shells[self.i];self.i+=1;return sh
   self._fill()   # a new round of the deal
  return None
 def take(self,key,slot,pred=None,prefer=None,topped=False):
  bag=self.bags.get(key) or [];cat=key.split('|')[1]
  for idx in range(len(bag)-1,-1,-1):
   q=bag[idx];meta=CATEGORIES[cat][q['k']]
   if slot in meta['fits'] and (pred is None or pred(q)) and (prefer is None or prefer(q)):return bag.pop(idx)
  if prefer is not None:return self.take(key,slot,pred)
  # Near the end of a bag only pieces that fit few cards are left: the bag's next round goes in under them (they
  # are still dealt first), so every block keeps its real share over the deals.
  if not topped and self.full.get(key) and len(bag)<len(self.full[key])//4+2:
   fresh=[dict(q) for q in self.full[key]];self.rng.shuffle(fresh);self.bags[key]=fresh+bag
   return self.take(key,slot,pred,topped=True)
  return None
 def give_back(self,key,q):
  bag=self.bags.setdefault(key,[]);bag.insert(self.rng.randrange(len(bag)+1),q)

_SKELETONS=defaultdict(list)
for _sh in (DECK or {}).get('shells',[]):
 for _sk in _sh['sk']:
  if not _sk.get('fix'):_SKELETONS[_sh['s']].append(_sk)
_DEALERS=[]
def _dealer(used,rng):
 for u,d in _DEALERS:
  if u is used:return d
 d=_Dealer(rng.random(),used);_DEALERS.append((used,d))
 if len(_DEALERS)>4:_DEALERS.pop(0)
 return d

def forget(cards,used):
 """A batch the caller did not keep (it would overflow a pack or the pool): later cards must not name its cards, or
 they named a card that never exists in the game ("Special Summon 1 'X' from your hand", 500-card review, Nov 24)."""
 for u,d in _DEALERS:
  if u is used:
   ids={c['id'] for c in cards};d.made=[c for c in d.made if c['id'] not in ids]

def _clean_piece(q):
 return {x:v for x,v in q.items() if not x.startswith('_')}

def _swap_names(d,q,card_id):
 """A piece naming real cards names randomized cards dealt before it, of the same kind (user, Nov 19)."""
 kinds=q.get('_nk')
 if not kinds:return True
 codes=list(q.get('codes') or [])+([q['code']] if isinstance(q.get('code'),int) else [])
 olds=[_real_name(c) for c in codes]
 picks=[];pool=[c for c in d.made if c['id']!=card_id]
 for k in kinds:
  options=[c for c in pool if c['kind']==k and c not in picks]
  # a named monster to Summon, add, send or use as a Contact Fusion material must be one that can be in the hand, Deck
  # or on the field without its own Summon: never a Fusion or Ritual Monster ("Arcana Knight Joker" as a Contact Fusion
  # material, Nov 21)
  if k=='monster':options=[c for c in options if c.get('frame') not in ('fusion','ritual')] or (None if q['k']=='contact_cannon' else options)
  if not options:return False
  picks.append(d.rng.choice(options))
 new_codes=[c['id'] for c in picks];new_names=[c['name'] for c in picks]
 if 'codes' in q:q['codes']=new_codes[:len(q['codes'])]
 if isinstance(q.get('code'),int):q['code']=new_codes[-1]
 if 'names' in q:q['names']=new_names[:len(q['names'])]
 if 'name' in q and isinstance(q['name'],str):q['name']=new_names[-1]
 # One pass, longest name first ("Sword Hunter" inside "Sword Hunter Sisters" was replaced twice), and a card name
 # is always in quotes ('Special Summon 1 Serpent Night Dragon', Nov 20).
 swap={o:nn for o,nn in zip(olds,new_names) if o}
 rx=re.compile('"?('+'|'.join(re.escape(o) for o in sorted(swap,key=len,reverse=True))+')"?') if swap else None
 for x,v in list(q.items()):
  if isinstance(v,str) and x not in ('k','name'):
   w=rx.sub(lambda m:'"'+swap[m.group(1)]+'"',v) if rx else v
   # the real card named itself, so its text said "this card" ("Choose 1 this card from your GY", Nov 20): it names
   # the dealt card now
   if w==v and x=='filter' and new_names and re.search(r'\bthis card\b',w):w=re.sub(r'\bthis card\b','"'+new_names[0]+'"',w,count=1)
   q[x]=w.replace('""','"')
 return True

def _real_name(code):
 if not _REAL_BY_ID:
  for c in json.loads((ROOT/'data/era-cards.json').read_text(encoding='utf8')):_REAL_BY_ID[c['id']]=c['name']
 return _REAL_BY_ID.get(code,'')

# Actions whose Lua works on the cards or value the timing hands it (eg / ev), but whose text did not show it, so the
# template builder let them travel without their timing (Discord Nov 24): "When one of your monsters is sent from the
# field to your GY: Target that Summoned monster and 1 Spellcaster you control" (Dark Renewal needs your opponent's
# Summon), "When this card is Summoned: Destroy all Equip Cards equipped to this card" (Gearfried's "When an Equip Card
# is equipped to this card"), Sebek's Battle Damage, Fake Trap's destruction. They take only their real timing.
EVENT_BOUND={'dark_renewal','destroy_equipped_event','sebek_recover_damage','fake_trap_protect'}
def _event_need(acts):
 """Timings the effect must have: None (any or none), 'none' (it has its own trigger) or a set."""
 need=None
 for a in acts:
  meta=ACTS.get(a['k']) or AURAS.get(a['k']) or {}
  if OWN_TRIGGER.match(meta.get('text','')):return 'none'
  allowed=({meta['ctx']} if meta.get('ctx') else set())|set(meta.get('ctx_events') or ())
  if allowed and a.get('_e'):allowed.add(a['_e'])   # the timing its real card used
  # its Lua reads what the timing hands it (eg/ev): only its real card's timing works
  if a['k'] in EVENT_BOUND and a.get('_e'):allowed={a['_e']}|allowed
  if allowed:need=allowed if need is None else need&allowed
 return need

def _deal_ok(parts,slot,kind):
 acts=parts['acts']
 if not acts:return False
 if kind=='activated' and acts[0]['k'] in AURAS:return False
 if slot in MAIN_ONLY:
  if _event(parts):return False
  for c in parts['conds']:
   if TURN_LOCK.search(_fmt(CONDS[c['k']].get('text',''),c,{'slot':slot,'name':'X'})):return False
 _RELAXED[0]=True
 try:bad=problem(parts,slot)
 except Exception:bad=('x',0,'error')
 finally:_RELAXED[0]=False
 if not bad:
  why=_text_problem(parts,slot)
  if why:DEAL_WHY['text: '+why.split(':')[0]]+=1;return False
 return not bad

# effects that are only a drawback when they stand alone (review of 200 cards, Nov 23); not SELF_HARM above, which
# picks coin-toss penalties
DRAWBACK_ONLY={'give_self','mask_remnants_shuffle','draw_until_seven','skip_next_two_draw_phases','destroy_self_battle','recover_opp','damage_self','shuffle_own_deck',
 'discard_up_to','discard_hand','dark_designator_search',   # 500-card review (Nov 24): discarding your own cards, giving the opponent a card
 'lose_atk_permanent','lose_200_atk'}   # Nov 25: "You can Tribute 1 other monster; this card permanently loses 200 ATK"
def _drawback_only(p):
 if p['k'] in DRAWBACK_ONLY or (p['k']=='skip_phase' and p.get('phase')=='standby'):return True   # "skip your next Standby Phase"
 # your own monster destroyed or banished, or a card from your hand shuffled away, for nothing (Nov 24)
 return p['k'] in ('move_select','move_target','move_all') and p.get('side')=='you' and p.get('zone') in ('hand','mzone','field','st')   and p.get('to') in ('deck','decktop','destroy','banish')
DEAL_WHY=Counter();DEAL_FAILED=Counter()   # why dealt effects were tried again, and the ones never dealt (diagnostics)
GY_SOURCE=re.compile(r'(?i)\b(?:in|from) (?:your |either |both |the )?(?:hand, Deck, or |Deck or |hand or )?GYs?\b')
GY_BACK_VERB=re.compile(r'(?i)\badd\b|\bto (?:the|your|its owner.s) hand\b|\bSpecial Summon\b|\breturn\b')
def _gy_back(p,slot):
 """The action takes a card out of the GY to the hand or the field."""
 zone=str(p.get('zone') or '')
 if p['k'] in RECOVERS or ('gy' in zone and (p['k'].startswith('ss_') or p.get('to')=='hand')):return True
 t=_piece_text('acts',p,slot)
 return bool(GY_SOURCE.search(t) and GY_BACK_VERB.search(t))
def _deal_effect(d,slot,sk,card_id,no_self_ss=False,used_sigs=()):
 kind,n=sk['kind'],sk['n'];budget=STRUCTURE.get(slot,{}).get('budget')
 last=None
 for attempt in range(12):
  taken=[]
  def grab(key,pred=None,prefer=None):
   q=d.take(key,slot,pred,prefer)
   if q is not None:taken.append((key,q))
   return q
  def undo():
   for key,q in taken:d.give_back(key,q)
  # wrappers first: a die that multiplies needs actions with an amount
  others=[q for q in (grab(f'{kind}|others') for _ in range(n['o'])) if q]
  numeric=any(q['k']=='dice_mult' for q in others)
  def act_ok(q):
   if numeric and q['k'] not in NUMERIC:return False
   if no_self_ss and (ACTS.get(q['k'],{}).get('hand') or SUMMONS_SELF.search(ACTS.get(q['k'],{}).get('text',''))):return False
   if sk.get('fix'):   # a FLIP monster: no action that brings or needs another timing
    if q.get('_ev'):return False
    nd=_event_need([q]);return nd is None or (nd!='none' and sk['fix'] in nd)
   return True
  acts=[q for q in (grab(f'{kind}|acts',act_ok) for _ in range(max(1,n['a']))) if q]
  if not acts:undo();DEAL_WHY['no action fits']+=1;return None
  # what an action needs comes with it (LP-low payoffs bring their condition), and those pieces come with nothing else
  with_=[]
  for need in [x for a in acts for x in ACTS.get(a['k'],{}).get('needs',())]:
   cat='conds' if need in CONDS else 'costs'
   key=f"{kind}|costs" if cat=='costs' else f"{kind}|conds|{'event' if CONDS[need]['kind']=='event' else 'state'}"
   q=grab(key,lambda q,need=need:q['k']==need)
   # none left in the bag: the effect still works, with the block's lowest amount (a bare lp_gap had no amount and
   # its Lua compared LP with nil, Nov 20)
   if q is None:
    q={'k':need};rng_n=CATEGORIES[cat][need].get('n')
    if isinstance(rng_n,(tuple,list)) and rng_n:q['n']=rng_n[0]
    elif isinstance(rng_n,int):q['n']=rng_n
   with_.append((cat,q))
  free=lambda q:q['k'] in FREE_IN_DEAL or not CATEGORIES['conds' if q['k'] in CONDS else 'costs'].get(q['k'],{}).get('needed')
  need=_event_need(acts);ev=None
  glued=next((a['_ev'] for a in acts if a.get('_ev')),None)
  if glued and not sk.get('fix'):ev=dict(glued)   # the action's real timing
  elif sk.get('fix'):
   if need=='none' or (need and sk['fix'] not in need):undo();DEAL_WHY['FLIP shell, action needs another timing']+=1;continue
   ev={'k':sk['fix']}
  elif need=='none':pass
  elif need:
   ev=grab(f'{kind}|conds|event',lambda q:q['k'] in need and free(q))
   if not ev:undo();DEAL_WHY['no timing the action needs']+=1;continue
  elif n['ev']:ev=grab(f'{kind}|conds|event',free)
  w_conds=[q for c,q in with_ if c=='conds'];w_costs=[q for c,q in with_ if c=='costs']+[dict(q) for a in acts for q in a.get('_cost',[])]
  if ev and any(CONDS[q['k']]['kind']=='event' for q in w_conds):ev=None
  states=[q for q in (grab(f'{kind}|conds|state',free) for _ in range(max(0,n['st']-len(w_conds)))) if q]
  parts={'conds':([ev] if ev else [])+w_conds+states,'costs':w_costs+[q for q in (grab(f'{kind}|costs',free) for _ in range(max(0,n['c']-len(w_costs)))) if q],'acts':acts,
   'limits':[q for q in (grab(f'{kind}|limits') for _ in range(n['l'])) if q],'others':others}
  parts={cat:[json.loads(json.dumps(q)) for q in parts[cat]] for cat in CATEGORIES}   # names are swapped on copies
  if parts['acts']:parts['acts'][0].pop('link',None)   # "and if you do" needs a step before it
  pieces=[q for cat in CATEGORIES for q in parts[cat]]
  if not all(_swap_names(d,q,card_id) for q in pieces if q.get('_nk')):undo();DEAL_WHY['no card to name']+=1;continue
  clean={cat:[_clean_piece(q) for q in parts[cat]] for cat in CATEGORIES}
  # An effect used again and again (no timing, no once-per-turn) on a card that stays on the field: real ones pay
  # for each use with the card itself; a dealt one is once per turn, or the CPU repeats it forever (engine stalls).
  ev_k=_event(clean)
  window=bool(ev_k) and (CONDS.get(ev_k,{}).get('repeat') or ev_k.endswith('window') or ev_k.endswith('_quick'))   # a timing that stays open
  # an effect that brings this card back after it was destroyed or sent away revives it again and again ("If this card
  # is destroyed by battle: Special Summon this card from your GY" against a monster that attacks again stalled, Nov 21)
  revive=any(re.search(r'(?i)Special Summon this card from (?:your )?GY|Special Summon this (?:banished )?card\b(?! from (?:your )?hand)',
   _act_text(p,{'slot':slot,'name':'X'})) for p in clean['acts']) and bool(ev_k)
  if kind=='activated' and slot not in ONE_SHOT and (not ev_k or window or revive) and not any(LIMITS.get(p['k'],{}).get('once') for p in clean['limits']) \
     and not any(COSTS.get(p['k'],{}).get('leaves') for p in clean['costs']):
   clean['limits'].append({'k':'opt'})
  # a cost that puts this card in the GY with an action that brings a card back from the GY: "You can discard this card,
  # then target 1 monster in your GY; add it to your hand" took itself back forever once hand costs worked from the hand
  # (engine stall, Nov 24). Once per turn by name, like real cards.
  if kind=='activated' and slot not in ONE_SHOT and any(COSTS.get(p['k'],{}).get('leaves') for p in clean['costs']) \
     and any(_gy_back(p,slot) for p in clean['acts']) and not any(LIMITS.get(p['k'],{}).get('once') for p in clean['limits']):
   clean['limits'].append({'k':'hopt'})
  sig=[json.dumps(q,sort_keys=True) for c in CATEGORIES for q in clean[c]]
  if len(sig)!=len(set(sig)) or json.dumps(clean['acts'],sort_keys=True) in used_sigs:undo();DEAL_WHY['same piece twice']+=1;continue
  # only a drawback ("Skip your next 2 Draw Phases", "pay 500 LP; your opponent gains 200 LP", Nov 23)
  if clean['acts'] and all(_drawback_only(p) for p in clean['acts']):undo();DEAL_WHY['only a drawback']+=1;continue
  # a card that cannot be Special Summoned (a rule or a Spirit) never meets "If this card is Special Summoned" (Nov 23)
  if no_self_ss and ev_k and re.search(r'(?i)this card is (?:[\w-]+ )?Special Summoned|this card is Special Summoned',CONDS.get(ev_k,{}).get('text','')):
   undo();DEAL_WHY['Special Summoned timing on a card that cannot be']+=1;continue
  if not _deal_ok(clean,slot,kind):undo();DEAL_WHY['rules']+=1;continue
  # as strong as the real effect in this place may be, or the slot's real 90th percentile (3% may break it)
  if budget is not None and power_score(clean,slot)>max(budget,sk.get('p',0)*1.1) and d.rng.random()>=CRAZY:undo();DEAL_WHY['too strong']+=1;continue
  ar=[x for q in pieces for x in q.get('_ar',[])]
  chance=WHIMSY_COPY if effect_sig(clean) in REAL_SIGS else WHIMSY
  if d.rng.random()<chance:clean=_whimsy(d,slot,kind,clean,card_id,used_sigs,budget,sk,act_ok,with_)
  return dict(kind=kind,**clean,**({'arch':ar} if ar else {}))
 DEAL_FAILED[(slot,kind)]+=1
 return None

WHIMSY_STATS=Counter()   # which twists were tried and kept (diagnostics)
UNTIME_TEXT=re.compile(r'(?i)this card is (?:attacking|battling)|\bthat (?:monster|card|target|attack|effect|Spell|Trap)\b|\bthe (?:attack|attacking|attacked|Summoned|destroyed|battling|activated|Tributed|discarded)\b|\bthose\b|\bthe monster (?:it|this card) battled\b')
def _fair_twist(q,twist,parts,slot):
 """An added condition or cost keeps the effect usable: no phase or turn lock on top of a timing (it never holds at
 that moment), no condition the timing already makes true, nothing near impossible ("Remove 10 Spell Counters",
 "your opponent has at least 7000 more LP than you", "face-up WIND, WATER, FIRE, and EARTH monsters")."""
 meta=CATEGORIES['conds' if twist=='cond' else 'costs'].get(q['k'],{})
 t=_fmt(meta.get('text',''),q,{'slot':slot,'name':'X'})
 ev=_event(parts)
 if twist=='cond' and ev and (TURN_LOCK.search(t) or re.search(r'(?i)\bit is (?:your|your opponent.s|a|the)\b',t)):return False
 if twist=='cond' and ev and q['k']=='kills' and re.search(r'(?i)destroys',CONDS.get(ev,{}).get('text','')):return False
 if (q.get('n') or 0)>=4000 or re.search(r'Spell Counters?|WIND, WATER, FIRE, and EARTH|\b(?:[7-9]|\d\d) or more\b|at least [7-9]\b',t):return False
 return True
def _whimsy(d,slot,kind,clean,card_id,used_sigs,budget,sk,act_ok,with_):
 """One twist on a dealt effect, kept only when the effect still passes every check (rules, text, strength).
 Twists: another action after it ("..., then draw 1 card"), an extra cost, an extra condition, one condition less,
 or no timing (a trigger becomes a once-per-turn effect you use, when its action does not need that timing)."""
 options=['act','act','cost','cond','drop','untime'] if kind=='activated' else ['act','cond','drop']
 d.rng.shuffle(options)
 needed={q['k'] for c,q in with_}   # conditions an action brought with it stay
 for twist in options:
  new={c:[dict(p) for p in clean[c]] for c in CATEGORIES};took=None
  if twist=='untime':
   ev=_event(new)
   if not ev or ev=='flip' or ev in needed or slot in ONE_SHOT or _event_need(new['acts']) is not None:continue
   # an action that speaks about the moment keeps its timing: "destroy the monster this card is attacking", "that
   # monster", "the Summoned monster" (Nov 24, Criosphinx)
   if any(UNTIME_TEXT.search(_act_text(p,{'slot':slot,'name':'X'})) for p in new['acts']):continue
   new['conds']=[p for p in new['conds'] if p['k']!=ev]
   if not any(LIMITS.get(p['k'],{}).get('once') for p in new['limits']):new['limits'].append({'k':'opt'})
  elif twist=='drop':
   states=[i for i,p in enumerate(new['conds']) if CONDS.get(p['k'],{}).get('kind')=='state' and p['k'] not in needed]
   if not states:continue
   new['conds'].pop(d.rng.choice(states))
  else:
   key={'act':f'{kind}|acts','cost':f'{kind}|costs','cond':f'{kind}|conds|state'}[twist]
   if twist=='act':pred=lambda q:act_ok(q) and not q.get('_ev') and not q.get('_cost') and _event_need([q]) in (None,_event(new)) and not _drawback_only(q)
   else:pred=lambda q:not CATEGORIES['conds' if twist=='cond' else 'costs'].get(q['k'],{}).get('needed') and _fair_twist(q,twist,new,slot)
   took=d.take(key,slot,pred)
   if took is None:continue
   q=json.loads(json.dumps(took))
   if q.get('_nk') and not _swap_names(d,q,card_id):d.give_back(key,took);continue
   q=_clean_piece(q);q.pop('link',None)
   new[{'act':'acts','cost':'costs','cond':'conds'}[twist]].append(q)
  WHIMSY_STATS['tried '+twist]+=1
  # the twist can bring the pair _deal_effect makes once per turn by name: a cost that puts this card in the GY and an
  # action that takes a card back from the GY ("You can discard this card from your hand; ..., then add up to 3 ...
  # from your GY to your hand", Nov 25)
  if kind=='activated' and slot not in ONE_SHOT and any(COSTS.get(p['k'],{}).get('leaves') for p in new['costs']) \
     and any(_gy_back(p,slot) for p in new['acts']) and not any(LIMITS.get(p['k'],{}).get('once') for p in new['limits']):
   new['limits'].append({'k':'hopt'})
  sig=[json.dumps(p,sort_keys=True) for c in CATEGORIES for p in new[c]]
  ok=len(sig)==len(set(sig)) and json.dumps(new['acts'],sort_keys=True) not in used_sigs and _deal_ok(new,slot,kind) \
     and (budget is None or power_score(new,slot)<=max(budget,sk.get('p',0)*1.1)*1.15)
  if ok:WHIMSY_STATS['kept '+twist]+=1;return new
  if took is not None:d.give_back(key,took)
 return clean

def _archetype_self_loop(card,log):
 """A card now in the archetype its effect brings back ("If this card is destroyed and sent to the GY: target 1
 'Batteryman' monster in your GY; Special Summon it") can bring itself back, again and again (engine stall, Nov 20):
 that effect is once per turn per card name, like real cards that revive themselves."""
 if not card.get('setcodes'):return
 for e in card['effects']:
  if e.get('kind')!='activated' or not e.get('arch') or any(LIMITS.get(p['k'],{}).get('once') for p in e.get('limits',[])):continue
  # the GY can be in the target clause ("Tribute this card, then target 1 'Gravekeeper's' monster in your GY; Special
  # Summon it" looped, Nov 20)
  if any(re.search(r'(?i)Special Summon|to (?:your|the) hand',_act_text(p,{'slot':card['slot'],'name':card['name']}))
         and re.search(r'(?i)GY|banished',_act_text(p,{'slot':card['slot'],'name':card['name']})+' '+str(p.get('filter',''))+' '+str(p.get('zone','')).replace('gy','GY')) for p in e.get('acts',[])):
   e['limits']=list(e.get('limits',[]))+[{'k':'hopt'}];log.append('archetype revive of its own archetype: once per turn per name')

def _archetype_name(card,log):
 """A card whose effect names an archetype is part of it (user, Nov 19): the archetype goes at the start of its name
 ("Archfiend Kuriboh"; a second one at the end), and its archetype codes go in its data, so its own effect and other
 archetype effects count it."""
 found={}
 for e in card['effects']:
  for n,code in e.get('arch',[]):found.setdefault(n,code)
 if not found:return
 name=card['name'];low=name.lower()
 for i,n in enumerate(found):
  if n.lower() in low:continue
  sep='' if n.endswith('-') else ' '
  name=f'{n}{sep}{name}' if i==0 else f'{name} {n}'
 card['name']=name;card['setcodes']=list(found.values())
 log.append('archetype '+', '.join(found)+': in its name and codes')

FREE_HAND_SUMMON=.05   # share left without a condition
def _free_hand_summon(e):
 """An effect that Special Summons this card from the hand with no timing, condition or cost."""
 if e.get('conds') or e.get('costs'):return False
 return any(HAND_SUMMON.search(CATEGORIES['acts'].get(p['k'],{}).get('text','')) and not re.search(r'\b(by|banishing|Tributing|discarding|pay)\b',
  CATEGORIES['acts'].get(p['k'],{}).get('text','')) for p in e.get('acts',[]))
def _hand_state_ok(q):
 """A condition that can hold while this card is in the hand (not one about this card on the field)."""
 t=CONDS.get(q['k'],{}).get('text','')
 return CONDS.get(q['k'],{}).get('kind')=='state' and not CONDS[q['k']].get('needed') and   not re.search(r'this card|this is|this monster|only monster|equipped|this face-up|Battle Phase|Damage Step|damage calculation|Standby Phase|End Phase|Main Phase|turn player|either player',t,re.I)

HAND_COST_SHARE=.5   # of the requirements, how many are costs (the rest are conditions)
def _hand_cost_ok(q):
 """A cost that can be paid while this card is in the hand: discard, pay LP, Tribute a monster you control, banish
 from the GY... (not "Tribute this card" or anything about this card)."""
 m=COSTS.get(q['k'],{});t=m.get('text','')
 return 'm_main' in m.get('fits',()) and not m.get('gy') and not m.get('leaves') and not m.get('field') and not m.get('needed') \
  and not re.search(r'this card|this face-up|equipped|itself',t,re.I)

def _hand_summon_requirement(d,e,slot,log,card_id=None,force=False):
 """A free "Special Summon this card from your hand" gets a condition or a cost (user, Nov 19: "rather than only
 conditions, also costs: discard 1 card, Tribute a [Type] monster you control, pay 2000 LP"). With a cost it becomes
 an effect used from the hand: "You can discard 1 card; Special Summon this card from your hand." 5% stay free."""
 if not _free_hand_summon(e) or (not force and d.rng.random()<FREE_HAND_SUMMON):return e
 cost=d.rng.random()<HAND_COST_SHARE
 for key,pred in ((('activated|costs',_hand_cost_ok),('activated|conds|state',_hand_state_ok)) if cost else (('activated|conds|state',_hand_state_ok),('activated|costs',_hand_cost_ok))):
  for _ in range(6):
   q=d.take(key,'m_main',pred)
   if q is None:break
   copy=json.loads(json.dumps(q))
   if copy.get('_nk') and not _swap_names(d,copy,card_id):d.give_back(key,q);continue   # named cards become dealt cards
   piece=_clean_piece(copy)
   if key=='activated|costs':
    new={'kind':'activated','conds':[],'costs':[piece],'acts':[{'k':'ss_self_hand'}],'limits':[],'others':[]}
   else:new={**e,'conds':list(e.get('conds',[]))+[piece]}
   if not _contradiction({c:new.get(c,[]) for c in CATEGORIES},slot):
    log.append('a '+('cost' if key=='activated|costs' else 'condition')+' for its Special Summon from the hand');return new
   d.give_back(key,q)
 return e

def _rule_text(e,card):
 out=[]
 states=[_fmt(CONDS[p['k']]['text'],p,card) for p in e.get('conds',[]) if CONDS.get(p['k'],{}).get('kind')=='state' and CONDS[p['k']].get('text')]
 if states and any(HAND_SUMMON.search(CATEGORIES['acts'].get(p['k'],{}).get('text','')) for p in e.get('acts',[])):
  # "If your LP are 2000 or less, you can Special Summon this card from your hand."
  return f'If {_join(states)}, you can Special Summon this card from your hand.'
 for p in e.get('limits',[]):
  t=LIMITS.get(p['k'],{}).get('text')
  if t:out.append(_fmt(t.replace('{what}','card'),p,card).rstrip('.')+'.')
 for p in e.get('acts',[]):
  meta={**ACTS,**AURAS}.get(p['k'],{})
  if meta.get('text'):
   t=_fmt(meta.get('gen_text',meta['text']),p,card).strip()
   # a lasting card that targets when it is activated says so (Call of the Haunted's wording); it read "Special
   # Summon it from your GY; ..." with nothing for "it" (Nov 20)
   if meta.get('tclause') and not re.search(r'(?i)\btarget',t):
    t='Activate this card by '+re.sub(r'^target\b','targeting',_fmt(meta['tclause'],p,card).strip())+'; '+(t if t.split(' ')[0] in _CAPITAL_WORDS else t[:1].lower()+t[1:])
   out.append(t[:1].upper()+t[1:].rstrip('.')+'.')
 # its timing is part of the text: "During your Standby Phase, if this card is in your GY, gain 200 LP" read only "If
 # this card is in your GY, gain 200 LP" (review of 200 cards, Nov 23)
 ev=next((p for p in e.get('conds',[]) if CONDS.get(p['k'],{}).get('kind')=='event'),None)
 if ev and out and ev['k']!='flip':
  when=_fmt(CONDS[ev['k']].get('text',''),ev,card).strip().rstrip(':,.')
  if when and when.lower() not in out[-1].lower():
   i=len(out)-1;first=out[i]
   out[i]=when[:1].upper()+when[1:]+(', ' if re.match(r'(?i)if |while ',first) else ': ')+(first[:1].lower()+first[1:] if re.match(r'(?i)if |while ',first) else first)
 return ' '.join(out)

def _deal_text(card):
 base={'slot':card['slot'],'name':card['name']};lines=[]
 order=sorted(card['effects'],key=lambda e:{'rule':0,'continuous':1,'activated':2}.get(e['kind'],3))
 for e in order:
  if e['kind']=='rule' or e.get('whole') and any(p['k'] in LUA_RULES or OWN_TRIGGER.match({**ACTS,**AURAS}.get(p['k'],{}).get('text','')) for p in e.get('acts',[])):
   lines.append(_rule_text(e,base));continue
  try:t=effect_text({**base,'parts':{c:e.get(c,[]) for c in CATEGORIES}})
  except Exception:t=''
  if t:lines.append(t)
 text=_tidy(' '.join(x for x in lines if x))
 slot=card['slot']
 if slot[0] in 'st':text=re.sub(r'\b([Tt])ribute (\d+|any number of) other ',r'\1ribute \2 ',text)   # a Spell or Trap has no "other" monster
 # one "Equip only to": a second one another piece brings is dropped (Nov 23, "Equip only to a Warrior monster. ...
 # Equip only to a non-Machine monster."); a second that excludes the first makes the effect invalid (_deal_ok)
 eqs=re.findall(r'Equip only to ([^.;]+)[.;]',text)
 for extra in eqs[1:]:text=re.sub(r'(?<=[.;] )Equip only to '+re.escape(extra)+r'[.;] ?','',text,count=1)
 if slot=='s_equip' and text and 'Equip only to' not in text:text='Equip only to a face-up monster. '+text
 # "Cannot be Special Summoned. Must be Normal Summoned/Set by Tributing exactly 3 monsters; cannot be Special
 # Summoned." says it once (Nov 24)
 if text.startswith('Cannot be Special Summoned.'):text=text[:27]+re.sub(r'; (?:it )?cannot be Special Summoned(?=[.;])','',text[27:])
 # "Cannot be Normal Summoned/Set." comes first, as on real cards (Nov 23)
 m=re.search(r' (Cannot be Normal Summoned/Set\.)',text)
 if m:text=m.group(1)+' '+(text[:m.start()]+text[m.end():]).strip()
 # a sentence two effects both bring ("Equip only to ...", "You can only activate 1 ... per turn") is written once
 seen=set();out=[]
 for sentence in re.split(r'(?<=\.) (?=[A-Z"])',text):
  if sentence in seen:continue
  seen.add(sentence);out.append(sentence)
 return ' '.join(out)

OWN_ATTRIBUTE={'thunder_nyan_self_destroy':'LIGHT'}
TRAP_MONSTER_ACTS={'trap_monster_effect','trap_monster_normal','swamp_mirrorer','tiki_curse'}
def _level_needed(effects):
 need=1
 for e in effects:
  # the timing piece, or a whole real effect that says it ("When this card is Tribute Summoned, its ATK becomes ...")
  texts=[CONDS.get(p['k'],{}).get('text','') for p in e.get('conds',[])]+[{**ACTS,**AURAS}.get(p['k'],{}).get('text','') for p in e.get('acts',[])]   +[LIMITS.get(p['k'],{}).get('text','') for p in e.get('limits',[])]   # "You can Normal Summon this card by Tributing 3 monsters" (Nov 24)
  # a summoning rule about Tributes ("You can Normal Summon/Set this card without Tributing", "can be Normal Summoned
  # by Tributing exactly 3 monsters") only means something on a Level 5 or higher monster (Level 2 had it, Nov 24)
  if any(re.search(r'(?i)Normal Summon(?:ed)?(?:/Set)?(?: this card)? (?:with \d Tribute|without Tributing|by Tributing)',t) for t in texts):
   need=max(need,7 if any(re.search(r'Tributing (?:exactly )?3',t) for t in texts) else 5);continue
  for t in texts:
   if re.search(r'(?i)this card is Tribute Summoned',t):need=max(need,7 if re.search(r'Tributing 3',t) else 5)
 return need

def _deal_card(d,rng,next_id,used,kind=None,frame=None,sub=None,log=None):
 sh=d.shell(kind,frame,sub)
 if sh is None:return None
 log=log if log is not None else []
 slot=sh['s'];card={'id':next_id(),'log':log,'slot':slot}
 log.append('dealt from a real card shell'+(f" ({', '.join(sh['t'])})" if sh['t'] else ''))
 effects=[]
 for e in sh['an']:
  e=json.loads(json.dumps(e))
  if all(_swap_names(d,q,card['id']) for cat in CATEGORIES for q in e.get(cat,[]) if q.get('_nk')):
   ar=[x for c in CATEGORIES for q in e.get(c,[]) for x in q.get('_ar',[])]
   effects.append({'kind':e['kind'],**({'whole':True} if e.get('whole') else {}),**({'arch':ar} if ar else {}),**{c:[_clean_piece(q) for q in e.get(c,[])] for c in CATEGORIES}})
 # A free "you can Special Summon this card from your hand" gets a condition from the bag (user, Nov 19: always or
 # almost always some condition), unless it already has a timing, a condition or a cost.
 effects=[_hand_summon_requirement(d,e,slot,log,card['id']) for e in effects]
 # a Trap that Special Summons itself, with no timing and no limit, was chained onto itself again and again by the CPU
 # (engine stall, Nov 23, "Stronghold the Moving Fortress"): once per turn, like dealt effects that repeat
 for e in effects:
  if e['kind']=='activated' and any(p['k'] in TRAP_MONSTER_ACTS for p in e.get('acts',[])) and not _event({c:e.get(c,[]) for c in CATEGORIES}) \
     and not any(LIMITS.get(p['k'],{}).get('once') for p in e.get('limits',[])):
   e['limits']=list(e.get('limits',[]))+[{'k':'opt'}]
 dropped=[e for e in effects if e.get('acts') and all(_drawback_only(p) for p in e['acts'])]
 if dropped:effects=[e for e in effects if e not in dropped];log.append('dropped an effect that is only a drawback')
 # "Cannot be Special Summoned" (a summoning rule or a Spirit) and "Special Summon this card" cannot share a card
 no_ss=any(p['k'] in ('cannot_ss','spirit_return') for e in effects for c in CATEGORIES for p in e.get(c,[])) or 'spirit' in sh['t']
 for sk in sh['sk']:
  e=_deal_effect(d,slot,sk,card['id'],no_ss,{json.dumps(x['acts'],sort_keys=True) for x in effects})   # no effect twice
  if e:effects.append(_hand_summon_requirement(d,e,slot,log,card['id']))
 # "Cannot be Special Summoned." dealt in one effect beside another that Special Summons this card (Nov 25, "Terra the
 # Terrible": "Cannot be Special Summoned. ... Special Summon this card from your GY"): the restriction goes
 def ss_self(e,rx):
  for p in e.get('acts',[]):
   try:t=_act_text(p,{'slot':slot,'name':'X'})
   except Exception:t={**ACTS,**AURAS}.get(p['k'],{}).get('text') or ''
   if rx.search(t):return True
  return False
 for lim,rx in (('cannot_ss',SUMMONS_SELF),('cannot_ss_gy',re.compile(r'(?i)Special Summon this card from (?:your |the )?GY'))):
  if any(ss_self(e,rx) for e in effects) and any(p['k']==lim for e in effects for p in e.get('limits',[])):
   for e in effects:e['limits']=[p for p in e.get('limits',[]) if p['k']!=lim]
   effects=[e for e in effects if any(e.get(c) for c in CATEGORIES)];log.append(f'dropped {lim}: another effect Special Summons this card')
 # A Destiny Board letter ("This card can only be placed on the field by its board effect") dealt on its own could
 # never be played: a board names any dealt card (Nov 20)
 effects=[e for e in effects if not any(p['k']=='real_set_piece' for p in e.get('acts',[]))]
 # "Cannot be Normal Summoned/Set." whose Special Summon named a real card (left out) could never be played (Nov 20,
 # 10 per deal): it is Special Summoned from the hand with a condition or a cost, like the hand self-summons
 if any(p['k']=='cannot_normal' for e in effects for p in e.get('limits',[])) and not any(p['k']=='summon_by' for e in effects for p in e.get('limits',[])) \
    and not re.search(r'(?i)Special Summon this card|Special Summoned (?:from your hand |from your GY )?by|Must (?:first )?be Special Summoned|Special Summon it from',_deal_text({'slot':slot,'name':'X','effects':effects})):
  proc=_hand_summon_requirement(d,{'kind':'rule','conds':[],'costs':[],'acts':[{'k':'gilasaurus_ss_proc'}],'limits':[],'others':[]},slot,log,card['id'],force=True)
  if proc.get('conds') or proc.get('costs'):effects.append(proc);log.append('Cannot be Normal Summoned: Special Summoned from the hand')
  else:
   for e in effects:e['limits']=[p for p in e.get('limits',[]) if p['k']!='cannot_normal']
   effects=[e for e in effects if any(e.get(c) for c in CATEGORIES)];log.append('dropped "Cannot be Normal Summoned" (no way to Special Summon it)')
 # "Remove 2 Spell Counters from this card" needs an effect of this card that places them (Nov 20)
 def _places(e):
  return any(PLACES_COUNTER.search(_fmt({**ACTS,**AURAS,**COSTS}.get(p['k'],{}).get('text',''),p,{'slot':slot,'name':'X'}) or '') for c in ('acts','costs') for p in e.get(c,[]))
 if not any(_places(e) for e in effects):
  dropped=[e for e in effects if any(p['k'] in SELF_COUNTER_COST for p in e.get('costs',[]))]
  if dropped:effects=[e for e in effects if e not in dropped];log.append('dropped an effect that removes Spell Counters this card never gets')
 # An Effect Monster, Spell or Trap whose real effects could not be used, or could not be dealt, takes the layout of
 # another real card of its kind, so card frames keep their real counts.
 if not effects and slot!='m_none' and 'union' not in sh['t']:
  for _ in range(6):
   other=d.rng.choice(_SKELETONS.get(slot) or [None])
   e=other and _deal_effect(d,slot,other,card['id'],no_ss)
   if e:effects.append(e);log.append('took the layout of another real card');break
 if slot[0]=='m':
  fr={'m_none':'normal','m_main':'effect','m_fusion':'fusion','m_ritual':'ritual'}[slot]
  if fr=='effect' and not effects and 'union' not in sh['t']:fr='normal';slot=card['slot']='m_none';log.append('no effect could be dealt: Normal Monster')
  st=(d.st.get(sh['f']) or [None]).pop() if d.st.get(sh['f']) else None
  level,atk,dfn=st or sh.get('st') or [4,1500,1200]
  # "If this card is Tribute Summoned" needs Level 5 or more, "by Tributing 3 monsters" 7 or more (a Level 3 had it,
  # Nov 23): swap with a dealt stat line of that frame that fits, so the Level counts stay exact
  need=_level_needed(effects)
  pool=d.st.get(sh['f']) or []
  if st and level<need:
   i=next((i for i,x in enumerate(pool) if x[0]>=need),None)
   if i is not None:pool[i],st=st,pool[i];level,atk,dfn=st;log.append(f'Level {level} for its Tribute Summon timing')
   else:level=need;log.append(f'Level {need} for its Tribute Summon rule (no dealt stat line fits)')   # dropping it left a card with no text (Nov 24)
  ra=d.ra.pop() if d.ra else (sh.get('ra') or ['Warrior','EARTH'])
  # "Destroy this face-up card if you control a face-up non-LIGHT monster" on an EARTH monster destroyed itself (Nov 23)
  own=next((OWN_ATTRIBUTE[p['k']] for e in effects for p in e.get('acts',[]) if p['k'] in OWN_ATTRIBUTE),None)
  if own and ra[1]!=own:
   i=next((i for i,x in enumerate(d.ra) if x[1]==own),None)
   if i is not None:d.ra[i],ra=ra,d.ra[i]
   else:ra=[ra[0],own]
   log.append(f'{own} for its own effect')
  race=ra[0] if ra[0] in RACES else pick(rng,RACE_WEIGHTS);attr=ra[1] if ra[1] in ATTRIBUTES else pick(rng,ATTR_WEIGHTS)
  art=_one_unused(rng,MONSTERS_BY_RACE[race],used,MONSTERS);name=_one_unused(rng,MONSTERS,used,MONSTERS)
  card.update(kind='monster',frame=fr,level=level,race=race,attribute=attr,atk=atk,defense=dfn,name=name['name'],name_from=name['id'],
   art_from=art['id'],atk_from=name['id'],def_from=name['id'],effects=effects)
  _archetype_name(card,log)
  _archetype_self_loop(card,log)
  mk=next((t for t in ('spirit','toon','union') if t in sh['t']),None)
  if mk:card['monster_kind']=mk
  if mk=='union':card['union']={'race':race if rng.random()<.4 else pick(rng,MATERIAL_RACES),'n':rng.choice((300,500,500,800,1000))}
  flip=any(_event({c:e.get(c,[]) for c in CATEGORIES})=='flip' for e in effects)
  has_effect=bool(effects) or bool(mk)
  t=TYPE_MONSTER|{'normal':TYPE_NORMAL,'effect':TYPE_EFFECT,'fusion':TYPE_FUSION,'ritual':TYPE_RITUAL}[fr]
  if has_effect:t|=TYPE_EFFECT
  if flip:t|=TYPE_FLIP
  if mk:t|=KIND_BITS[mk]
  card['data_type']=t
  label={'normal':'Normal Monster','effect':'Effect Monster','fusion':'Fusion Monster','ritual':'Ritual Monster'}[fr]
  if flip:label='Flip Effect Monster'
  elif fr in ('fusion','ritual') and has_effect:label=label.replace(' Monster',' Effect Monster')
  if mk:label={'spirit':'Spirit Monster','toon':'Toon Monster','union':'Union Effect Monster'}[mk]
  card['type']=label
  card['type_line']='['+'/'.join([race]+(['Fusion'] if fr=='fusion' else ['Ritual'] if fr=='ritual' else [])+([mk.capitalize()] if mk else [])+(['Flip'] if flip else [])+(['Effect'] if has_effect else [])+(['Normal'] if fr=='normal' else []))+']'
  card['parts']=next(({c:e.get(c,[]) for c in CATEGORIES} for e in effects if e['kind']!='rule'),{c:[] for c in CATEGORIES})
  if fr=='normal':
   card['desc']=(name['desc'] if name['type']=='Normal Monster' else None) or rng.choice(FLAVOR_BY_RACE.get(race) or NORMAL_FLAVOR);card['flavor']=True
  else:
   card['desc']=_deal_text(card)
   if mk=='union':card['desc']=' '.join(x for x in (_kind_text(card),card['desc']) if x)
  out=[card]
  if fr=='fusion':
   card['materials']=_fusion_materials(rng,race)
   own=_rule_materials(effects)
   if own:card['materials']=own;log.append('its Fusion Materials are the ones its Summoning rule names')
   card['desc']=_materials_text(card['materials'])+('\n'+card['desc'] if card['desc'] else '')
  if fr=='ritual':
   spell=make_ritual_spell(rng,next_id,used,card,log=[])
   card['ritual_spell']=spell['id']
   card['desc']=f'You can Ritual Summon this card with "{spell["name"]}".'+(' '+card['desc'] if card['desc'] else '')
   out.append(spell)
 else:
  kd='spell' if slot[0]=='s' else 'trap';sb=_SUB_OF[slot]
  group=SPELLS if kd=='spell' else TRAPS
  name=_one_unused(rng,group,used,group);art=_one_unused(rng,group,used,group)
  if not effects:return None   # a Spell/Trap with nothing dealt: the next shell
  card.update(kind=kd,sub=sb,name=name['name'],name_from=name['id'],art_from=art['id'],level=0,effects=effects)
  _archetype_name(card,log)
  card['parts']=next(({c:e.get(c,[]) for c in CATEGORIES} for e in effects if e['kind']!='rule'),{c:[] for c in CATEGORIES})
  card['data_type']=(TYPE_SPELL if kd=='spell' else TYPE_TRAP)|(SPELL_TYPES if kd=='spell' else TRAP_TYPES)[sb]
  card['type']='Spell Card' if kd=='spell' else 'Trap Card'
  card['type_line']=f"[{'Spell' if kd=='spell' else 'Trap'} Card{'' if sb=='Normal' else ' / '+sb}]"
  card['desc']=_deal_text(card)
  out=[card]
 for c in out:c['strings']=_strings(c)
 d.made+=[c for c in out]
 return out

# Card wording (user, Nov 19): many real-card blocks were written as descriptions of how the card works ("its Level sets
# the summonable monster Level limit to 3 higher"). data/randomizer-wording.json (copied into the templates file as
# 'wording') holds plain card wording for them: key -> {text, tclause}. A generated wording (gen_text) is replaced
# when the block has one. The template tool builds from the blocks' own texts (RANDOMIZER_RAW_TEXT).
def _apply_wording(wording):
 cat_of={k:c for c,t in CATEGORIES.items() for k in t}
 for k,w in (wording or {}).items():
  if k.startswith('_') or k not in cat_of:continue
  meta=CATEGORIES[cat_of[k]][k]
  if w.get('text'):meta['gen_text' if 'gen_text' in meta else 'text']=w['text']
  if w.get('tclause') and 'tclause' in meta:meta['tclause']=w['tclause']
import os as _os
if not _os.environ.get('RANDOMIZER_RAW_TEXT'):_apply_wording(REAL.get('wording'))

# Texts that hid a value the block carries ("on a specified result", "the listed card"): they say it now (user, Nov 19).
# Applied after the wording file, so these win.
SPECIFY_TEXT={
 'archfiend_warden':'During your Standby Phase, pay {n} LP or destroy this card. When an opponent\'s card effect targets this card, roll a six-sided die; if the result is {dice}, negate that effect and destroy that card.',
 'field_named_any':'{names_or} is face-up on the field',
 'banished_race_count':'there are {n} or more banished {races_or} monsters',
 'opp_activates_named':'When your opponent activates {names_or}',
 'continuous_type_activated':'When a {card_type_name} Card is activated',
 'dark_scorpion_combination':'{names} you control can attack directly this turn, but battle damage they inflict to your opponent is halved',
 'destroy_all_lock_named':'destroy all monsters your opponent controls; {names} cannot attack this turn',
 'draw_plus_named_faceup':'draw 1 card, plus 1 more for each face-up {names_or} you control',
 'destroy_jars_turn_dragons_attack':'destroy all face-up {names_or} in the Spell & Trap Zones; if you do, change all face-up Defense Position Dragon monsters to Attack Position',
 'disable_continuous_type_until_end':'negate the effects of all face-up {card_type_name} Cards until the End Phase',
 'ss_filtered_proc':'Special Summon {filter}',
 'destroy_payoff_target':'destroy it, then {payoff_text}',
 'atk_per_race_count':'All face-up {race} monsters you control gain 200 ATK for each face-up {races_or} monster you control',   # 200 is fixed in its Lua
 'guardian_kayest':'Cannot be Normal Summoned or Set unless you control a face-up {names_or}. Unaffected by Spell effects. Your opponent cannot target this card for attacks.',
 'skilled_magician':'Each time a Spell Card resolves, place 1 Spell Counter on this card. You can Tribute this card with 3 Spell Counters; Special Summon 1 {names_or} from your hand, Deck, or GY.',
 # Trap Monsters say what they become (Discord, Nov 20: "it doesn't have any stats for the monster version")
 'trap_monster_effect':'Special Summon this card in Defense Position as an Effect Monster ({mon_race}/{mon_attr}/Level {l}/ATK {n}/DEF {d}) (this card is also still a Trap Card)',
 'trap_monster_normal':'Special Summon this card as a Normal Monster ({mon_race}/{mon_attr}/Level {l}/ATK {n}/DEF {d}) (this card is also still a Trap Card)',
 # the name it is treated as was empty: dealt names are a list (Discord, Nov 20: "This card's name is treated as .")
 'name_treated_as':'This card’s name is treated as {names_or}.',
 'activate_type_any':'{type_activated}',
 # "return 1 of your monsters ... from your GY, then shuffle it" (Nov 21): one movement, said once
 'battle_destroyed_mon_to_deck':'{verb} 1 of your monsters destroyed by battle this turn from your GY {deck_dest}',
 'self_change_position':'change this card to face-up Defense Position',
 # Fusion rules: the materials line says which monsters (Discord Nov 21), so the text no longer names them again
 # or names different ones. Arcana Knight Joker's Lua never checked its three Knights: its Fusion uses the dealt materials.
 'arcana_knight_joker':'Once per turn, when a Spell, Trap, or monster effect targets this face-up card, you can discard 1 card of the same type (Monster, Spell, or Trap); negate that effect',
 'ryu_senshi':'Must be Fusion Summoned. You can pay 1000 LP to negate the activation of a Trap Card. Negate Spell effects that target this card, and destroy that Spell Card',
 'fiend_skull_dragon':'Must be Fusion Summoned. Negate the effects of Flip monsters. Negate Trap effects that target this card. Summoner of Illusions cannot destroy this card during the End Phase',
 'dark_paladin':'Must be Fusion Summoned. When a Spell Card is activated, you can discard 1 card; negate the activation, and if you do, destroy it. This card gains 500 ATK for each Dragon monster on the field and in either GY',
 # its Lua destroys at the end of the Battle Phase; the text left that out and read impossible (Discord Nov 22,
 # "During Main Phase 1, destroy all monsters that were involved in damage calculation this turn")
 'after_the_struggle':'Activate only during Main Phase 1. At the end of the Battle Phase this turn, destroy all monsters that were involved in damage calculation this turn',
 # review of 500 dealt cards (Nov 24): say what "the matching card type" is, and nothing internal
 'destroy_banish_duplicates':'destroy and banish it; if it was a {dup_name}, also banish all cards with its name from both Decks',
 'mausoleum_proc':'',
 'trap_of_darkness':'If your LP are 3000 or less: Pay 1000 LP, then target 1 other Normal Trap Card in your GY, except a card with this effect; apply that card\'s effect, then banish it',
 'stat_mod_target':'{effect} until the End Phase',
 # review of 200 dealt cards (Nov 23)
 'destroy_battle_target_selector':'When this card battles a {filter} monster, destroy that monster after the Damage Step.',
 'sword_hunter':'At the end of the Battle Phase, equip all monsters destroyed by battle with this card this turn from the GYs to this card; it gains 200 ATK for each monster equipped by this effect',
 'chaos_no_attack':'make this card unable to attack for the rest of this turn',
 'big_shield_change_attack':'change this card to face-up Attack Position if it was face-down when attacked',
 'opp_attack_target_named':'While you control a face-up {names_or}, your opponent can only target it for attacks',
 # Manticore of Darkness's marker (it lets its End Phase effect know the card was sent this turn) says nothing a player
 # needs; its other effect says it ("remember it until the End Phase", Nov 20)
 'manticore_grave_flag':'',
 # its Lua leaves out Equip Spells and other copies of this effect (copying them crashed the duel engine, Nov 20)
 'double_spell':"Discard 1 Spell Card, then target 1 non-Equip Spell Card in your opponent's GY, except one with this effect; place it on your field and apply its effect as if you activated it",
 'talisman_sealing':'While you control a face-up "Sealmaster Meisei", {card_type_name} Cards cannot be activated, and their effects are negated. When you no longer control it, destroy this card.',
 # its Lua destroys the Equip Card its timing equipped (Gearfried: "When an Equip Card is equipped to this card")
 'destroy_equipped_event':'destroy that Equip Card',
 # its Lua checks the dealt card (p.code), not Gravity Axe - Grarl (Nov 24: the text named a card the run never has)
 'guardian_grarl_rule':'Cannot be Summoned unless {names_or} is face-up; if this is the only card in your hand, you can Special Summon it from your hand',
}
def _apply_specify():
 cat_of={k:c for c,t in CATEGORIES.items() for k in t}
 for k,t in SPECIFY_TEXT.items():
  if k in cat_of:
   meta=CATEGORIES[cat_of[k]][k];meta['gen_text' if 'gen_text' in meta else 'text']=t
if not _os.environ.get('RANDOMIZER_RAW_TEXT'):
 _apply_specify()
 # it targets the monster(s) the timing Summoned (Lua: eg), not any monster like it: "target that monster" (Nov 21;
 # it read "Summons 1 face-up monster with 1000 or more ATK: target 1 face-up monster with 1000 or more ATK")
 ACTS['move_summoned']['tclause']='target {summoned_ref}'
 # its Lua takes the dealt card (p.code) or the Type (p.race); the text named Summoned Skull and Thunder (Nov 24)
 ACTS['destroy_def_below_target']['tclause']='target 1 face-up {names_or} or {race} monster you control'
 # its target is a clause, so a cost reads "Tribute 1 Reptile monster, then target 1 face-up monster; it gains ..."
 # (it read "Tribute ...; target ...; it gains ...", Nov 24)
 ACTS['stat_mod_target']['tclause']='target {filter}'
 ACTS['reveal_destroy_st']['tclause']='target {filter}';ACTS['reveal_destroy_st']['text']='reveal it if it is Set, and if it is a {card_type_name} Card, destroy it'

# Pandemonium's two halves (user, Nov 19). Lua R.Rule blocks, dealt as always-on effects: any archetype (setcode,
# filter = its name), on any card that stays on the field.
_LASTING={'s_field','s_cont','t_cont','m_main','m_fusion','m_ritual'}
AURAS['archetype_no_standby_cost']=dict(fits=set(_LASTING),text='"{filter}" monsters do not have to pay LP for their Standby Phase costs',real_only=True)
AURAS['archetype_destroyed_search']=dict(fits=set(_LASTING),text='When a "{filter}" monster is destroyed and sent to the GY by a card effect, its controller can add 1 "{filter}" monster with a lower Level from their Deck to their hand',real_only=True)
for _k in ('archetype_no_standby_cost','archetype_destroyed_search'):CATEGORIES['acts'][_k]=AURAS[_k]

