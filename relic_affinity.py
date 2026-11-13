"""Collection-based relic offer weights: a relic never drops below its base chance; how high it can go depends on how
specific it is (see ceiling)."""
import re
from collections import Counter

MAX_MULTIPLIER=3
# Specific relics gain more from a deck built around them (user, 2026-11-13): an Amazoness deck should pull Amazoness relics
# well before Warrior or EARTH ones. A relic's ceiling comes from the share of the game's cards it supports (monster-only
# tags such as Types and Attributes are measured among monsters): 30% of cards gives x2, every halving adds CEILING_SLOPE,
# clamped to CEILING_MIN..CEILING_MAX. Examples: Amazoness x8, Rituals ~x5.9, Zombie ~x4.6, Warrior x3, DARK and
# Normal Monsters x2.
# Raised for "all X" decks (user, 2026-11-13, second pass): x2 to x8, +1 per halving.
CEILING_MIN,CEILING_MAX,CEILING_BASE_SHARE,CEILING_SLOPE=2.0,8.0,.30,1.0
# Every archetype relic (an archetype_relics.member_test card list: Amazoness, Harpie, Toon, Ritual Dagger...) shares
# Amazoness Standard's ceiling (user, 2026-11-13), however many cards its archetype has.
ARCHETYPE_CEILING=7.5
MONSTER_TAGS=('race:','attr:','level:','normal','spirit','union','flip')
# The build writes every relic's ceiling to data/relic-ceilings.json (write_ceilings, from tools/build_android.py), so a
# phone never scans the whole card list; anything missing there is computed once and cached.
from pathlib import Path
import json
CEILINGS_FILE=Path(__file__).parent/'data/relic-ceilings.json'
try:_ceilings={k:float(v) for k,v in json.loads(CEILINGS_FILE.read_text(encoding='utf8')).items()}
except (OSError,ValueError):_ceilings={}
def ceiling(key,test=None,fresh=False):
 """Highest multiplier the run's cards can give this relic; cached, since it only depends on the card list."""
 import math
 import campaign as g
 if key in _ceilings and not fresh:return _ceilings[key]
 if test is not None:
  _ceilings[key]=ARCHETYPE_CEILING;return ARCHETYPE_CEILING
 elif key in RULES:
  wanted=set(RULES[key][0]);base=[c for c in g.CARDS if c['data']['type']&1] if all(w.startswith(MONSTER_TAGS) for w in wanted) else g.CARDS
  share=sum(1 for c in base if card_tags(c)&wanted)/max(1,len(base))
 else:return 1.0
 value=round(min(CEILING_MAX,max(CEILING_MIN,2+CEILING_SLOPE*math.log2(CEILING_BASE_SHARE/max(share,1e-4)))),3)
 _ceilings[key]=value;return value

def compute_ceilings():
 """{relic: ceiling} for every relic the run's cards can boost, from the current card list and rules."""
 import archetype_relics
 from content import ARTIFACTS
 run={'artifacts':[],'pool':[]};out={}
 for key in ARTIFACTS:
  test=archetype_relics.member_test(key,run)
  if test is True:continue
  if test is not None or key in RULES:out[key]=ceiling(key,test,fresh=True)
 return dict(sorted(out.items()))

def write_ceilings():
 CEILINGS_FILE.write_text(json.dumps(compute_ceilings(),indent=0)+chr(10),encoding='utf8',newline=chr(10))
 CARD_CEILINGS_FILE.write_text(json.dumps(compute_card_ceilings(),indent=0)+chr(10),encoding='utf8',newline=chr(10))
# Weights come from the current Deck only (user, 2026-11-13): cards that only sit in the collection count for nothing, so
# a feature the Deck lacks makes its relics and singles x0.4 (archetype_relics.DEAD_RELIC). DECK_WEIGHT is kept for old callers.
DECK_WEIGHT=3
# Narrow themes (archetypes and effect tags) count cards rather than deck share (user, 2026-11-13): 2 cards reach half the
# boost and 5 cards the full boost in a 20-card Deck (1 card a quarter), scaled with the run's Deck minimum (4 and 10 at 40).
NARROW_HALF,NARROW_FULL,NARROW_BASE_DECK=2,5,20
def narrow_progress(count,run):
 try:
  import approved_relics
  minimum=max(1,int(approved_relics.minimum(run)))
 except Exception:minimum=NARROW_BASE_DECK
 x=count*NARROW_BASE_DECK/minimum
 if x<=NARROW_HALF:return .5*x/NARROW_HALF
 return min(1.0,.5+.5*(x-NARROW_HALF)/(NARROW_FULL-NARROW_HALF))
# Tag (user, 2026-11-13): the shared shop weighs both Decks, each adding half of the change its Deck alone would make.
# tag_campaign.scope sets TAG_PARTNER to the teammate's run while the host's run rolls the shop.
TAG_PARTNER=None
def tag_partner(run):
 other=TAG_PARTNER
 if other is None or other is run or run.get('history_mode')!='tag':return None
 return dict(other,artifacts=run.get('artifacts',[]),round=run.get('round',0),loop=run.get('loop',0),history_mode='tag')
def deck_cards(run):
 """Counter of card ids in the run's current Deck (Main and Extra), from its selected pool indices."""
 import campaign as g
 pool=run.get('pool',[]);out=Counter()
 for index in run.get('selected',[]):
  cid=pool[index] if isinstance(index,int) and 0<=index<len(pool) else None
  if cid in g.BY_ID:out[cid]+=1
 return out
# Share of the card pool that earns the full multiplier. Narrow themes need fewer cards to count as a plan.
# Lowered 30% on 2026-11-13 so each matching card adds more (an all-X deck reaches the full boost sooner).
BROAD,COMMON,NARROW=.245,.175,.07

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
 'normal':(('normal',),COMMON),'epitaph':(('normal',),COMMON),'underdog_clause':(('level:low',),COMMON),
 'cursed_commoners_chain':(('normal',),COMMON),'cursed_iron_silence':(('normal',),COMMON),
 'tribute':(('level:high',),COMMON),'tribute_dividend':(('level:high',),COMMON),'waning_star':(('level:high',),COMMON),
 'cursed_giants_oath':(('level:high',),COMMON),'tribute_free':(('level:7+',),NARROW),'boss_monster':(('level:7+',),NARROW),
 'small':(('level:low',),COMMON),'cursed_ashen_nursery':(('level:low',),COMMON),'village_banner':(('level:4',),BROAD),
 'ritual_vestment':(('ritual',),NARROW),'corpse_ritual':(('ritual',),NARROW),'ritual_incense':(('ritual',),NARROW),'ritual_dagger':(('ritual',),NARROW),
 'ten_thousand_hands':(('ritual',),NARROW),'cursed_ritual_scar':(('ritual',),NARROW),
 'fusion_insignia':(('fusion',),NARROW),'fusion_time':(('fusion',),NARROW),'machine_foundry':(('fusion',),NARROW),
 'cursed_fusion_fever':(('fusion',),NARROW),
 'trap_weaver':(('trap_monster',),NARROW),'cursed_trapbound_idol':(('trap_monster',),NARROW),
 'good_spirits':(('spirit',),NARROW),'union_hangar':(('union',),NARROW),'jar_of_echoes':(('flip',),NARROW),
 'armory_crest':(('equip',),NARROW),'field_amplifier':(('field',),NARROW),'terraforming_relic':(('field',),NARROW),
 'arcane_resonance':(('continuous',),COMMON),'counterweight':(('spell_counter',),NARROW),
 'burn_proficiency':(('burn',),NARROW),'static_coil':(('burn',),NARROW),'healing_echo':(('heal',),NARROW),
 'this_life_mine':(('lp_cost',),NARROW),'exile_standard':(('banish',),NARROW),
 'token_regiment':(('token',),NARROW),'token_resonance':(('token',),NARROW),'token_martyrs':(('token',),NARROW),'token_defender':(('token',),NARROW),
 'tenacity_of_the_weak':(('normal:small',),NARROW),'normal_barrier':(('normal',),COMMON),
 'lets_go_gambling':(('coin','dice'),NARROW),'weighted_coins':(('coin',),NARROW),'weighted_dice':(('dice',),NARROW),
 # Relic weight review (user, 2026-11-13): relics that clearly lean on a card feature but had no weight source.
 'machine_duplication':(_races('Machine'),COMMON),'spell_provider':(('spell_counter',),NARROW),'unionize':(('union',),NARROW),
 'omni_banishment':(('banish',),NARROW),'ghost_destruction':(('banish',),NARROW),'dimensional_rift':(('banish',),NARROW),
 'illusionary_tribute':(('level:high',),COMMON),'cursed_anime_rule_3':(('level:high',),COMMON),
 'cursed_jesters_coin':(('coin',),NARROW),
 # 2026-11-13 Discord relics.
 'disturbed_sleep':(('flip',),NARROW),'gadget_call':(('gadget',),NARROW),'gadget_stronghold':(('gadget',),NARROW),
 'armory_aid':(('equip',),NARROW),'spiritual_retribution':(('spirit',),NARROW),'cursed_vampiric_contact':(('heal',),NARROW),'cursed_reversed_remedy':(('lp_cost','burn'),NARROW),
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
   if level<=3:tags.add('normal:small')
  if kind&0x200:tags.add('spirit')
  if kind&0x400:tags.add('union')
  if kind&0x200000:tags.add('flip')
 if kind&0x40 or c['name']=='Polymerization':tags.add('fusion')
 if kind&0x80:tags.add('ritual')
 if 'Gadget' in c['name'] or c['name']=='Stronghold the Moving Fortress':tags.add('gadget')
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
  if re.search(r'\bTokens?\b',desc):tags.add('token')
  if re.search(r'\bcoin\b',desc,re.I):tags.add('coin')
  if re.search(r'\bsix-sided\b|\bdice\b|\ba die\b',desc,re.I):tags.add('dice')
 result=frozenset(tags);_tags[c['id']]=result
 return result

def multipliers(keys,run):
 """Offer multiplier per relic, from 1 (no matching cards) to 3 (a dedicated collection)."""
 return {key:value[0] for key,value in details(keys,run).items()}

def details(keys,run):
 """Per relic: (multiplier, whether the run's cards can boost it at all, whether any card in the Deck matches)."""
 import archetype_relics
 import campaign as g
 pool=deck_cards(run)
 total=sum(pool.values())
 if not total:return {key:(1.0,key in RULES or archetype_relics.member_test(key,run) is not None,False) for key in keys}
 tags=Counter()
 for cid,copies in pool.items():
  for tag in card_tags(g.BY_ID[cid]):tags[tag]+=copies
 def boost(key):
  test=archetype_relics.member_test(key,run)
  if test is True:return (CEILING_MAX,True,True)
  if test is not None:matches,full=sum(copies for cid,copies in pool.items() if test(g.BY_ID[cid])),NARROW
  elif key in RULES:
   wanted,full=RULES[key]
   # A card can carry several wanted tags (Fusion Beast-Warrior for Warrior-or-Beast-Warrior), so count cards once.
   matches=tags[wanted[0]] if len(wanted)==1 else sum(copies for cid,copies in pool.items() if card_tags(g.BY_ID[cid]).intersection(wanted))
  else:return (1.0,False,False)
  top=ceiling(key,test if test is not None else None)
  progress=narrow_progress(matches,run) if full==NARROW else min(1,matches/total/full)
  return (1+(top-1)*progress,True,matches>0)
 return {key:boost(key) for key in keys}


# General stock singles use the same deck weighting as relics (user, 2026-11-13). A card's weight givers are its Type,
# Attribute, archetype (set code) and effect features; the strongest one the run's cards share decides its boost, with the
# same specificity ceilings (archetypes ARCHETYPE_CEILING, Types/Attributes by how common they are) and thresholds.
# Cards with no feature at all (plain Spells/Traps) take the boosted cards' average, each counted at most
# NEUTRAL_CARD_CAP, so a themed deck does not make general removal and staples rare. Level and Normal tags are left out:
# they cover a third of all cards and would only add noise.
CARD_TAG_SKIP=('level:','normal','continuous')
NEUTRAL_CARD_CAP=2.0
DEAD_CARD=.4
CARD_BOOST_CAP=10.0
CARD_CEILINGS_FILE=Path(__file__).parent/'data/card-tag-ceilings.json'
try:_card_ceilings={k:float(v) for k,v in json.loads(CARD_CEILINGS_FILE.read_text(encoding='utf8')).items()}
except (OSError,ValueError):_card_ceilings=None
def card_weight_tags(c):
 tags=[t for t in card_tags(c) if not t.startswith(CARD_TAG_SKIP)]
 tags+=['set:'+str(int(x)&0xfff) for x in c.get('data',{}).get('setcodes',[]) if int(x)&0xfff]
 return tags
def _tag_threshold(tag):
 if tag.startswith('set:'):return NARROW
 if tag.startswith(('race:','attr:')):return BROAD
 return NARROW
def compute_card_ceilings():
 """{tag: ceiling} for every single-card weight tag, from how common it is (monster tags among monsters)."""
 import math
 import campaign as g
 monsters=[c for c in g.CARDS if c['data']['type']&1];counts={}
 for c in g.CARDS:
  for t in set(card_weight_tags(c)):counts[t]=counts.get(t,0)+1
 out={}
 for t,n in counts.items():
  if t.startswith('set:'):out[t]=ARCHETYPE_CEILING;continue
  base=len(monsters) if t.startswith(('race:','attr:','spirit','union','flip')) else len(g.CARDS)
  share=n/max(1,base)
  out[t]=round(min(CEILING_MAX,max(CEILING_MIN,2+CEILING_SLOPE*math.log2(CEILING_BASE_SHARE/max(share,1e-4)))),3)
 return dict(sorted(out.items()))
def card_multipliers(cards,run):
 """{card id: offer multiplier} for general stock singles; in Tag, half of each Deck's change."""
 mine=_card_multipliers_one(cards,run);other=tag_partner(run)
 if other is None:return mine
 theirs=_card_multipliers_one(cards,other)
 return {k:1+.5*(mine[k]-1)+.5*(theirs[k]-1) for k in mine}
def _card_multipliers_one(cards,run):
 global _card_ceilings
 import campaign as g
 if _card_ceilings is None:_card_ceilings=compute_card_ceilings()
 pool=deck_cards(run)
 total=sum(pool.values())
 if not total:return {c['id']:1.0 for c in cards}
 have=Counter()
 for cid,copies in pool.items():
  for t in set(card_weight_tags(g.BY_ID[cid])):have[t]+=copies
 out,boosted={},[]
 for c in cards:
  tags=card_weight_tags(c)
  if not tags:out[c['id']]=None;continue
  # A card none of whose features is in the Deck counts DEAD_CARD, like a relic for cards the Deck lacks.
  best=DEAD_CARD if not any(have[t] for t in tags) else 1.0
  for t in tags:
   if have[t]:best=max(best,1+(_card_ceilings.get(t,CEILING_MIN)-1)*(narrow_progress(have[t],run) if _tag_threshold(t)==NARROW else min(1,have[t]/total/_tag_threshold(t))))
  out[c['id']]=min(CARD_BOOST_CAP,best);boosted.append(out[c['id']])
 average=sum(min(NEUTRAL_CARD_CAP,v) for v in boosted)/len(boosted) if boosted else 1.0
 return {k:(average if v is None else v) for k,v in out.items()}
