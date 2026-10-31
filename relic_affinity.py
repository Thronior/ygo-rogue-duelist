"""Collection-based relic offer weights: a relic never drops below its base chance and tops out at 3x."""
import re
from collections import Counter

MAX_MULTIPLIER=3
# Share of the card pool that earns the full multiplier. Narrow themes need fewer cards to count as a plan.
BROAD,COMMON,NARROW=.35,.25,.10

def _races(*names):return tuple('race:'+name for name in names)
RULES={
 'dragon':(_races('Dragon'),BROAD),'mage':(_races('Spellcaster'),BROAD),'blade':(_races('Warrior','Beast-Warrior'),BROAD),
 'wing':(_races('Winged Beast'),BROAD),'gear':(_races('Machine'),BROAD),'shell':(_races('Aqua','Fish','Sea Serpent'),BROAD),
 'fossil':(_races('Dinosaur','Reptile'),BROAD),'hive':(_races('Insect','Plant'),BROAD),'bone':(_races('Zombie'),BROAD),
 'halo':(_races('Fairy'),BROAD),'fang':(_races('Beast','Beast-Warrior'),BROAD),'horn':(_races('Fiend'),BROAD),
 'storm_core':(_races('Pyro','Thunder'),BROAD),'chitin_carapace':(_races('Insect'),BROAD),'dragon_triumph':(_races('Dragon'),BROAD),
 'stone':(_races('Rock'),BROAD),'restless_stone':(_races('Rock'),COMMON),
 'overcharge':(_races('Thunder'),COMMON),'restless_dead':(_races('Zombie'),COMMON),'divine_might':(_races('Divine-Beast'),NARROW),
 'ember':(('attr:FIRE',),BROAD),'tide':(('attr:WATER',),BROAD),'gale':(('attr:WIND',),BROAD),'earth':(('attr:EARTH',),BROAD),
 'light':(('attr:LIGHT',),BROAD),'dark':(('attr:DARK',),BROAD),'eclipse':(('attr:LIGHT','attr:DARK'),BROAD),
 'normal':(('normal',),COMMON),'epitaph':(('normal',),COMMON),'underdog_clause':(('normal:small',),NARROW),
 'cursed_commoners_chain':(('normal',),COMMON),'cursed_iron_silence':(('normal',),COMMON),
 'tribute':(('level:high',),COMMON),'tribute_dividend':(('level:high',),COMMON),'waning_star':(('level:high',),COMMON),
 'cursed_giants_oath':(('level:high',),COMMON),'tribute_free':(('level:7+',),NARROW),'boss_monster':(('level:7+',),NARROW),
 'small':(('level:low',),COMMON),'cursed_ashen_nursery':(('level:low',),COMMON),'village_banner':(('level:4',),BROAD),
 'ritual_vestment':(('ritual',),NARROW),'ritual_incense':(('ritual',),NARROW),'ritual_dagger':(('ritual',),NARROW),
 'ten_thousand_hands':(('ritual',),NARROW),'cursed_ritual_scar':(('ritual',),NARROW),
 'fusion_insignia':(('fusion',),NARROW),'fusion_time':(('fusion',),NARROW),'machine_foundry':(('fusion',),NARROW),
 'cursed_fusion_fever':(('fusion',),NARROW),
 'trap_weaver':(('trap_monster',),NARROW),'cursed_trapbound_idol':(('trap_monster',),NARROW),
 'good_spirits':(('spirit',),NARROW),'union_hangar':(('union',),NARROW),'jar_of_echoes':(('flip',),NARROW),
 'armory_crest':(('equip',),NARROW),'field_amplifier':(('field',),NARROW),'terraforming_relic':(('field',),NARROW),
 'arcane_resonance':(('continuous',),COMMON),'counterweight':(('spell_counter',),NARROW),
 'burn_proficiency':(('burn',),NARROW),'static_coil':(('burn',),NARROW),'healing_echo':(('heal',),NARROW),
 'this_life_mine':(('lp_cost',),NARROW),'exile_standard':(('banish',),NARROW),
 'lets_go_gambling':(('coin','dice'),NARROW),'weighted_coins':(('coin',),NARROW),'weighted_dice':(('dice',),NARROW),
}

_tags={}
def card_tags(c):
 """Every feature a relic can ask for, cached because a shop scores the whole pool."""
 cached=_tags.get(c['id'])
 if cached is not None:return cached
 kind=c['data']['type'];desc=c.get('desc','');tags=set()
 if kind&1:
  level=c.get('level',0)
  tags|={'race:'+c.get('race',''),'attr:'+c.get('attribute','')}
  if level<=3:tags.add('level:low')
  if level==4:tags.add('level:4')
  if level>=5:tags.add('level:high')
  if level>=7:tags.add('level:7+')
  if kind&0x10:
   tags.add('normal')
   if level<=2:tags.add('normal:small')
  if kind&0x200:tags.add('spirit')
  if kind&0x400:tags.add('union')
  if kind&0x200000:tags.add('flip')
 if kind&0x40 or c['name']=='Polymerization':tags.add('fusion')
 if kind&0x80:tags.add('ritual')
 if kind&0x40000:tags.add('equip')
 if kind&0x80000:tags.add('field')
 if kind&0x20000:tags.add('continuous')
 if kind&4 and re.search(r'this card[^.]{0,60}\bas an? [^.]{0,20}Monster',desc):tags.add('trap_monster')
 # Normal Monster flavor text is not an effect ("rolls up to form a dice-like shape").
 if not kind&0x10:
  if re.search(r'\b(?:inflict|deal)s?\b[^.]{0,60}\bdamage\b',desc,re.I):tags.add('burn')
  if re.search(r'\b(?:gain|increase|recover)s?\b[^.]{0,40}\b(?:LP|Life Points)\b',desc):tags.add('heal')
  if re.search(r'\bpay(?:ing)? \d[\d,]* (?:LP|Life Points)\b',desc,re.I):tags.add('lp_cost')
  if re.search(r'\bbanish|\bremoved? [^.]{0,30}from play\b',desc,re.I):tags.add('banish')
  if 'Spell Counter' in desc:tags.add('spell_counter')
  if re.search(r'\bcoin\b',desc,re.I):tags.add('coin')
  if re.search(r'\bsix-sided\b|\bdice\b|\ba die\b',desc,re.I):tags.add('dice')
 result=frozenset(tags);_tags[c['id']]=result
 return result

def multipliers(keys,run):
 """Offer multiplier per relic, from 1 (no matching cards) to 3 (a dedicated collection)."""
 import archetype_relics
 import campaign as g
 pool=Counter(cid for cid in run.get('pool',[]) if cid in g.BY_ID);total=sum(pool.values())
 if not total:return {key:1.0 for key in keys}
 tags=Counter()
 for cid,copies in pool.items():
  for tag in card_tags(g.BY_ID[cid]):tags[tag]+=copies
 def boost(key):
  test=archetype_relics.member_test(key,run)
  if test is True:return MAX_MULTIPLIER
  if test is not None:matches,full=sum(copies for cid,copies in pool.items() if test(g.BY_ID[cid])),NARROW
  elif key in RULES:
   wanted,full=RULES[key]
   # A card can carry several wanted tags (Fusion Beast-Warrior for Warrior-or-Beast-Warrior), so count cards once.
   matches=tags[wanted[0]] if len(wanted)==1 else sum(copies for cid,copies in pool.items() if card_tags(g.BY_ID[cid]).intersection(wanted))
  else:return 1.0
  return 1+(MAX_MULTIPLIER-1)*min(1,matches/total/full)
 return {key:boost(key) for key in keys}
