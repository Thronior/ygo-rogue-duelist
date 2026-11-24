"""Deck-based relic and card weighting: which relics a Deck can use (details), theme chances, single-card and category
weights. Relic offer weights themselves live in archetype_relics.offer_weights."""
import re
from collections import Counter

# Single cards and shop categories gain more the more specific their feature is (user, 2026-11-13): a ceiling from the share
# of the game's cards with that feature (monster-only tags such as Types and Attributes are measured among monsters): 30%
# of cards gives x2, every halving adds CEILING_SLOPE, clamped to CEILING_MIN..CEILING_MAX.
CEILING_MIN,CEILING_MAX,CEILING_BASE_SHARE,CEILING_SLOPE=2.0,8.0,.30,1.0
# Archetype features (set codes, archetype categories) share Amazoness's ceiling (user, 2026-11-13).
ARCHETYPE_CEILING=7.5
MONSTER_TAGS=('race:','attr:','level:','normal','spirit','union','flip')
from pathlib import Path
import json
def write_ceilings():
 CARD_CEILINGS_FILE.write_text(json.dumps(compute_card_ceilings(),indent=0)+chr(10),encoding='utf8',newline=chr(10))
 CATEGORY_CEILINGS_FILE.write_text(json.dumps(compute_category_ceilings(),indent=0)+chr(10),encoding='utf8',newline=chr(10))
 THEMES_FILE.write_text(json.dumps(compute_theme_card_lists(),separators=(',',':'))+chr(10),encoding='utf8',newline=chr(10))
# Weights come from the current Deck only (user, 2026-11-13): cards that only sit in the collection count for nothing, so
# a feature the Deck lacks makes its relics and singles x0.4 (archetype_relics.DEAD_RELIC).
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
# Card marks (user, 2026-11-16; changed 2026-11-17): for weighting only, a card marked Yes that is not in the Deck counts
# as MARK_YES_COPIES copies of it; a Yes card already in the Deck counts as its usual copies, and No changes nothing
# (it only greys the card out and sorts it last). run['card_marks'] = {id: 1 or -1}.
# Only owned cards count (user, 2026-11-18): a Yes mark adds weight only for a card the collection holds at least 1 copy of
MARK_YES_COPIES=2
def deck_cards(run):
 """Counter of card ids in the run's current Deck (Main and Extra) as the weighting sees it: its selected pool indices,
 plus the run's Yes marks on owned cards outside the Deck."""
 import campaign as g
 pool=run.get('pool',[]);out=Counter();owned=set(pool)
 for index in run.get('selected',[]):
  cid=pool[index] if isinstance(index,int) and 0<=index<len(pool) else None
  if cid in g.BY_ID:out[cid]+=1
 for key,mark in (run.get('card_marks') or {}).items():
  try:cid=int(key)
  except (TypeError,ValueError):continue
  if mark==1 and cid in owned and cid in g.BY_ID and not out[cid]:out[cid]=MARK_YES_COPIES
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
 'storm_core':(_races('Pyro','Thunder'),BROAD),'chitin_carapace':(_races('Insect'),BROAD),'moth_brood':(_races('Insect'),BROAD),'photosynthesis':(_races('Plant'),BROAD),'spring_growth':(_races('Plant'),BROAD),'pollinator':(_races('Plant'),BROAD),'dragon_triumph':(_races('Dragon'),BROAD),
 'stone':(_races('Rock'),BROAD),'restless_stone':(_races('Rock'),COMMON),
 'overcharge':(_races('Thunder'),COMMON),'restless_dead':(_races('Zombie'),COMMON),'divine_might':(_races('Divine-Beast'),NARROW),
 'ember':(('attr:FIRE',),BROAD),'tide':(('attr:WATER',),BROAD),'gale':(('attr:WIND',),BROAD),'earth':(('attr:EARTH',),BROAD),
 'light':(('attr:LIGHT',),BROAD),'dark':(('attr:DARK',),BROAD),
 # Eclipse Locket follows the Chaos monsters that banish a LIGHT and a DARK, not the Attributes almost every Deck has
 # (user, Discord 2026-11-15: it came up nearly every second reroll).
 'eclipse':(('chaos',),NARROW),
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
 'armory_crest':(('equip',),NARROW),'field_amplifier':(('field',),NARROW),'terraforming_relic':(('field',),NARROW),'toon_premiere':(('toon',),NARROW),'sealed_fate':(('destiny',),NARROW),
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
 # 2026-11-14 Discord relics.
 'guardians_call':(('guardian',),NARROW),'soul_fusion':(('fusion',),NARROW),'gate_calling':(('gate_trio',),NARROW),'jin_trio':(('gate_trio',),NARROW),'ring_of_defense':(('lp_cost',),NARROW),
 'dark_lotus':(('level:7+',),COMMON),'ultimate_armory':(('equip',),NARROW),
 # Deck-style relics that had no weight (user, 2026-11-14: only where the relic suits a kind of deck; coin, shop and plain
 # stat relics stay unweighted).
 'cursed_scorched_clock':(('burn',),NARROW),'cursed_ominous_clock':(('burn',),NARROW),'no_pain_no_gain':(('lp_cost',),NARROW),
 'solo':(('level:7+',),COMMON),'cursed_solitary_tyrant':(('level:7+',),COMMON),
 'stars_aligned':(('level:4',),COMMON),'cursed_conscription_drum':(('level:low',),COMMON),
 'cursed_brittle_armor':(('wall',),COMMON),'cursed_nocturnal_guard':(('wall',),COMMON),'cursed_shield_bash':(('wall',),COMMON),
 'sword_and_shield':(('wall',),COMMON),'cursed_defense_proficiency':(('wall',),COMMON),
 'cursed_crowded_crypt':(('graveyard',),COMMON),'cursed_golden_grave':(('graveyard',),COMMON),
 # Attribute Surgery shares its Attribute's theme with the matching Orb (an all-EARTH Deck: Earth Orb or EARTH Surgery).
 **{f'attribute_{a.lower()}':((f'attr:{a}',),BROAD) for a in ('LIGHT','DARK','FIRE','WATER','WIND','EARTH')},
 'armory_aid':(('equip',),NARROW),'spiritual_retribution':(('spirit',),NARROW),'cursed_vampiric_contact':(('heal',),NARROW),
 # 2026-11-15 Discord relics (the Dark Magician, Blue-Eyes and Red-Eyes ones weigh as archetypes: archetype_relics.CARD_THEMES).
 'dragon_lords_decree':(('level:7+dragon',),NARROW),'titans_charge':(('level:7+',),NARROW),'cursed_poison_of_the_old_man':(('coin',),NARROW),'cursed_graceful_skull_dice':(('dice',),NARROW),
}
# Further weight groups for relics that suit more than one kind of deck (user, 2026-11-14). Each group is weighed on its own
# and the relic takes the strongest one: a relic in two groups is never boosted by both at once.
EXTRA_RULES={
 'ring_of_defense':[(('burn',),NARROW)],
 # Eclipse Locket still follows LIGHT and DARK Decks too, damped in THEME_DAMPEN (user, 2026-11-15).
 'eclipse':[(('attr:LIGHT','attr:DARK'),BROAD)],
 'dark_lotus':[(('fusion',),NARROW)],
 'guardians_call':[(('equip',),NARROW)],
}

# Guardian's Call: the six Guardians with a dedicated Equip Spell.
# Eclipse Locket: the monsters Special Summoned by banishing a LIGHT and a DARK monster from the GY.
CHAOS_NAMES=frozenset({'Chaos Sorcerer','Black Luster Soldier - Envoy of the Beginning','Chaos Emperor Dragon - Envoy of the End'})
GUARDIAN_NAMES=frozenset({'Guardian Baou','Guardian Ceal','Guardian Elma','Guardian Grarl',"Guardian Kay'est",'Guardian Tryce'})
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
  # Dragon Lord's Decree: Level 7 or higher Dragons (a "level:" tag, so single-card weights skip it).
  if level>=7 and c.get('race')=='Dragon':tags.add('level:7+dragon')
  if kind&0x10:
   tags.add('normal')
   if level<=3:tags.add('normal:small')
  if kind&0x200:tags.add('spirit')
  if kind&0x400:tags.add('union')
  if kind&0x200000:tags.add('flip')
 if kind&0x40 or c['name']=='Polymerization':tags.add('fusion')
 if kind&0x80:tags.add('ritual')
 if 'Gadget' in c['name'] or c['name']=='Stronghold the Moving Fortress':tags.add('gadget')
 if c['name'] in GUARDIAN_NAMES:tags.add('guardian')
 if c['name'] in ('Sanga of the Thunder','Kazejin','Suijin'):tags.add('gate_trio')
 if c['name'] in CHAOS_NAMES:tags.add('chaos')
 if kind&0x400000 or c['name']=='Toon World':tags.add('toon')
 if c['name']=='Destiny Board' or c['name'].startswith('Spirit Message "'):tags.add('destiny')
 # Walls: monsters built to defend (DEF 1500+ and above their ATK).
 if kind&1 and int(c.get('defense') or 0)>=1500 and int(c.get('defense') or 0)>int(c.get('atk') or 0):tags.add('wall')
 if not kind&0x10 and re.search(r'\bGraveyard\b|\bGY\b',desc):tags.add('graveyard')
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

def details(keys,run):
 """Per relic: (whether the run's cards can matter to it at all, how many Deck cards match it). A relic in several weight
 groups (EXTRA_RULES) counts its best group."""
 import archetype_relics
 import campaign as g
 pool=deck_cards(run)
 tags=Counter()
 for cid,copies in pool.items():
  for tag in card_tags(g.BY_ID[cid]):tags[tag]+=copies
 def count(wanted):
  return tags[wanted[0]] if len(wanted)==1 else sum(copies for cid,copies in pool.items() if card_tags(g.BY_ID[cid]).intersection(wanted))
 def one(key):
  test=archetype_relics.member_test(key,run)
  # Name Changer already makes every monster a member.
  if test is True:return (True,sum(pool.values()))
  counts=[]
  if test is not None:counts.append(sum(copies for cid,copies in pool.items() if test(g.BY_ID[cid])))
  elif key in RULES:counts.append(count(RULES[key][0]))
  counts+=[count(wanted) for wanted,_ in EXTRA_RULES.get(key,())]
  return (bool(counts),max(counts,default=0))
 return {key:one(key) for key in keys}

# General stock singles use the same deck weighting as relics (user, 2026-11-13). A card's weight givers are its Type,
# Attribute, archetype (set code) and effect features; the strongest one the run's cards share decides its boost, with the
# same specificity ceilings (archetypes ARCHETYPE_CEILING, Types/Attributes by how common they are) and thresholds.
# Cards with no feature at all (plain Spells/Traps) take the boosted cards' average, each counted at most
# NEUTRAL_CARD_CAP, so a themed deck does not make general removal and staples rare. Level and Normal tags are left out:
# they cover a third of all cards and would only add noise.
CARD_TAG_SKIP=('level:','normal','continuous','wall','graveyard','gate_trio','guardian','chaos')
NEUTRAL_CARD_CAP=2.0
DEAD_CARD=.4
CARD_BOOST_CAP=10.0
CARD_CEILINGS_FILE=Path(__file__).parent/'data/card-tag-ceilings.json'
try:_card_ceilings={k:float(v) for k,v in json.loads(CARD_CEILINGS_FILE.read_text(encoding='utf8')).items()}
except (OSError,ValueError):_card_ceilings=None
# Support cards that weigh with an archetype they don't belong to: Limiter Removal follows Harpie Decks, so Mai
# Valentine's Harpie loadout finds it more easily (user, Discord 2026-11-15).
CARD_EXTRA_SETS={23171610:(100,)}
def card_weight_tags(c):
 tags=[t for t in card_tags(c) if not t.startswith(CARD_TAG_SKIP)]
 tags+=['set:'+str(int(x)&0xfff) for x in c.get('data',{}).get('setcodes',[]) if int(x)&0xfff]
 tags+=['set:'+str(s) for s in CARD_EXTRA_SETS.get(c.get('id'),()) if 'set:'+str(s) not in tags]
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
 out={k:(average if v is None else v) for k,v in out.items()}
 # Related cards (user, 2026-11-16): a single whose text names a Deck or Yes-marked card, or that one of them names, is
 # RELATED_BOOST times as likely, so combo pieces (rituals, fusions) turn up for the cards the player builds around.
 related=related_ids(pool)
 for c in cards:
  if canonical_id(c['id']) in related:out[c['id']]=min(CARD_BOOST_CAP,out[c['id']]*RELATED_BOOST)
 return out

# The same links as the Related Cards tab (android/web/related-cards.js): a quoted card name, or a quoted archetype name
# standing for its every member; alternate arts count as one card.
RELATED_BOOST=2.0
_related_index=None
def _inset(setcode,code):return (code&0xfff)==(setcode&0xfff) and (code&setcode)==setcode
def related_index():
 global _related_index
 if _related_index is not None:return _related_index
 import re
 import campaign as g
 by_name={};canon={}
 for c in g.CARDS:by_name.setdefault(c['name'].strip().lower(),c['id'])
 for c in g.CARDS:canon[c['id']]=by_name[c['name'].strip().lower()]
 # The archetype list choice_relics.py reads (data/archetypes.json, shipped with the campaign files).
 try:sets={a['name'].strip().lower():int(a['setcode']) for a in json.loads((Path(__file__).parent/'data/archetypes.json').read_text(encoding='utf8'))['archetypes']}
 except (OSError,ValueError,KeyError):sets={}
 members={}
 def archetype(code):
  if code not in members:members[code]=[canon[c['id']] for c in g.CARDS if any(_inset(code,int(x)) for x in c['data'].get('setcodes',[]))]
  return members[code]
 links={}
 def link(a,b):
  if a!=b:links.setdefault(a,set()).add(b);links.setdefault(b,set()).add(a)
 for c in g.CARDS:
  me=canon[c['id']]
  for quoted in re.findall(r'["“”]([^"“”]{2,60})["“”]',c.get('desc') or ''):
   k=quoted.strip().lower()
   if k in by_name:link(me,by_name[k])
   elif k in sets:
    for other in archetype(sets[k]):link(me,other)
 _related_index=(canon,links);return _related_index
def canonical_id(cid):return related_index()[0].get(cid,cid)
def related_ids(deck):
 """Canonical ids related to any card in `deck` (a deck_cards Counter)."""
 canon,links=related_index();out=set()
 for cid in deck:out|=links.get(canon.get(cid,cid),set())
 return out


# Opponent-screen categories (user, 2026-11-14): same deck weighting as relics. A category's ceiling comes from the share of
# cards it covers (Types/Attributes among monsters; archetype themes use ARCHETYPE_CEILING); Types and Attributes follow
# their share of the Deck, every other theme counts cards (narrow_progress). A category the Deck lacks counts DEAD_CARD.
ARCHETYPE_CATEGORIES=frozenset({'amazoness','archfiend','darkmagician','darkscorpion','exodia','gravekeeper','guardian','harpie','toon'})
CATEGORY_CEILINGS_FILE=Path(__file__).parent/'data/category-ceilings.json'
try:_category_ceilings={k:float(v) for k,v in json.loads(CATEGORY_CEILINGS_FILE.read_text(encoding='utf8')).items()}
except (OSError,ValueError):_category_ceilings=None
def _broad_category(key):
 import shop_rewards
 return key in shop_rewards.MONSTER_TYPES or key in shop_rewards.ATTRIBUTES
def compute_category_ceilings():
 import math
 import campaign as g,shop_rewards
 monsters=[c for c in g.CARDS if c['data']['type']&1];out={}
 for key in shop_rewards.reward_keys():
  if key in ARCHETYPE_CATEGORIES:out[key]=ARCHETYPE_CEILING;continue
  base=monsters if _broad_category(key) else g.CARDS
  share=sum(1 for c in base if shop_rewards.matches(c,key))/max(1,len(base))
  out[key]=round(min(CEILING_MAX,max(CEILING_MIN,2+CEILING_SLOPE*math.log2(CEILING_BASE_SHARE/max(share,1e-4)))),3)
 return dict(sorted(out.items()))
def category_multipliers(keys,run):
 """{category key: deck multiplier} for one run."""
 global _category_ceilings
 import campaign as g,shop_rewards
 if _category_ceilings is None:_category_ceilings=compute_category_ceilings()
 deck=deck_cards(run);total=sum(deck.values())
 if not total:return {k:1.0 for k in keys}
 out={}
 for k in keys:
  n=sum(copies for cid,copies in deck.items() if shop_rewards.matches(g.BY_ID[cid],k))
  if not n:out[k]=DEAD_CARD;continue
  progress=min(1,n/total/BROAD) if _broad_category(k) else narrow_progress(n,run)
  out[k]=1+(_category_ceilings.get(k,CEILING_MIN)-1)*progress
 return out


# Theme chances (user, 2026-11-14). Deck weighting no longer multiplies relic weights: each theme group (relics that suit
# the same kind of deck) gets a chance, on every shop stock or relic offer, that at least one of its relics is offered:
# - Attribute / Type groups (BROAD): 25% for a Deck whose monsters are all of it, less for a partial share.
# - COMMON groups (Levels, walls, GY...): like Attributes and Types, 25% for a Deck made only of them.
# - Card-count groups (NARROW: gambling, burn, equips...): 25% at a quarter of the Deck minimum (5, 8 or 10 cards), almost
#   50% at double that.
# - Archetype groups (an archetype relic's card list): 25% when the archetype is the majority of the Deck's monsters (or a
#   quarter of the minimum in cards), almost 50% for an all-archetype Deck.
# Owning a relic only takes that relic out of its group (user, 2026-11-17); the group keeps its chance for the rest. The shop category picked after a Duel lifts a group it shares a
# relic with to almost 90% for that stock, when the Deck fits the theme (archetype_relics.themed_picks).
THEME_START,THEME_TOP,THEME_CATEGORY=.25,.48,.88
# Specific themes come first (user, 2026-11-14): archetypes, then card-count themes (gambling, burn...), then the broad ones
# (Attributes, Types, Levels, walls, GY). When a stock's relic slots run short, Archfiend beats DARK and Fiend.
THEME_RANK={'set':0,'narrow':1,'common':2,'broad':2}
# Themes almost every Deck fits gain far less (user, 2026-11-15): most monsters people play are Level 4, so the Level 4
# relics (Stars Aligned, Village Banner) top out at 7.5% instead of 25%.
# Normal Monster relics (Normal Barrier, Epitaph...) came up too often (user, Discord 2026-11-15): they top out at 12.5%.
# Eclipse Locket's LIGHT-or-DARK theme fits almost every Deck, so it gains little from it (key: its tags joined with +).
THEME_DAMPEN={'level:4':.3,'normal':.5,'attr:DARK+attr:LIGHT':.3}
def theme_chance(x):
 return THEME_START*x if x<=1 else min(THEME_TOP,THEME_START+(THEME_TOP-THEME_START)*(x-1))

_groups=None
def theme_groups():
 """{theme id: ({group id: (kind, spec)}, [relic keys])}, built once. kind is broad/common/narrow (spec = tags) or set
 (spec = card ids)."""
 global _groups
 if _groups is not None:return _groups
 import archetype_relics
 import campaign as g
 from content import ARTIFACTS,RETIRED_ARTIFACTS
 out={};empty={'artifacts':[],'pool':[]};lists=theme_card_lists()
 for key in ARTIFACTS:
  if key in RETIRED_ARTIFACTS:continue
  entries=[]
  ids=lists.get(key)
  if ids:entries.append((('set',ids),'set',ids))
  for wanted,full in ([RULES[key]] if key in RULES else [])+list(EXTRA_RULES.get(key,())):
   kind='broad' if full==BROAD else 'common' if full==COMMON else 'narrow'
   entries.append((('rule',tuple(sorted(wanted)),kind),kind,tuple(wanted)))
  for gid,kind,spec in entries:out.setdefault(gid,(kind,spec,[]))[2].append(key)
 # One theme rolls once: card-count groups sharing a card feature (coin, dice and coin-or-dice are all gambling) and
 # archetype lists with mostly the same cards (two Amazoness lists) merge. A relic in two themes (Dark Lotus: Level 7+ and
 # Fusion) can be offered by either. A theme is {component group id: (kind, spec)} plus its relics.
 ids=list(out);parent={gid:gid for gid in ids}
 def root(x):
  while parent[x]!=x:parent[x]=parent[parent[x]];x=parent[x]
  return x
 for i,a in enumerate(ids):
  for b in ids[i+1:]:
   ka,kb=out[a][0],out[b][0]
   if ka=='set' and kb=='set':same=len(out[a][1]&out[b][1])*2>=min(len(out[a][1]),len(out[b][1]))
   else:same=ka=='narrow' and kb=='narrow' and bool(set(out[a][1])&set(out[b][1]))
   if same:parent[root(a)]=root(b)
 merged={}
 for gid in ids:
  theme=merged.setdefault(root(gid),({},[]))
  theme[0][gid]=out[gid][:2]
  theme[1].extend(k for k in out[gid][2] if k not in theme[1])
 _groups={key:(parts,members) for key,(parts,members) in merged.items()};return _groups

# Each archetype relic's card list, written by the build (write_ceilings) so a phone never scans every card for it.
THEMES_FILE=Path(__file__).parent/'data/relic-theme-cards.json'
def compute_theme_card_lists():
 import archetype_relics
 import campaign as g
 from content import ARTIFACTS
 out={};empty={'artifacts':[],'pool':[]}
 for key in ARTIFACTS:
  test=archetype_relics.member_test(key,empty)
  if test is not None and test is not True:
   ids=sorted(c['id'] for c in g.CARDS if test(c))
   if ids:out[key]=ids
 return out
def theme_card_lists():
 try:return {k:frozenset(v) for k,v in json.loads(THEMES_FILE.read_text(encoding='utf8')).items()}
 except (OSError,ValueError):return {k:frozenset(v) for k,v in compute_theme_card_lists().items()}

def theme_chances(run):
 """{theme id: (chance, [relic keys], strength, rank)} for the run's current Deck (rank: THEME_RANK, lower is more specific);
 owned relics are left out of their theme, and a theme with none left is skipped."""
 import campaign as g
 pool=deck_cards(run);total=sum(pool.values())
 if not total:return {}
 try:
  import approved_relics
  minimum=max(1,int(approved_relics.minimum(run)))
 except Exception:minimum=NARROW_BASE_DECK*2
 monsters=sum(n for cid,n in pool.items() if g.BY_ID[cid]['data']['type']&1)
 cards=[(g.BY_ID[cid],n) for cid,n in pool.items()]
 owned=set(run.get('artifacts',[]))|set(run.get('cursed_artifacts',[]))
 out={}
 def strength(kind,spec):
  if kind=='set':
   count=sum(n for c,n in cards if c['id'] in spec);mons=sum(n for c,n in cards if c['id'] in spec and c['data']['type']&1)
   return max(mons/(monsters*.5) if monsters else 0,count/(minimum/4))
  else:
   wanted=set(spec);mon=all(w.startswith(MONSTER_TAGS) for w in wanted)
   count=sum(n for c,n in cards if card_tags(c)&wanted)
   if kind=='narrow':return count/(minimum/4)
   share=count/max(1,monsters if mon else total)*THEME_DAMPEN.get('+'.join(sorted(wanted)),min(THEME_DAMPEN.get(w,1) for w in wanted))
   # Broad themes (Attributes, Types, Levels, walls, GY) top out at 25% for a Deck made only of them.
   return share
 for gid,(parts,members) in theme_groups().items():
  members=[k for k in members if k not in owned]
  if not members:continue
  # A theme is as strong as its best-fitting part (the strongest group applies, never several at once).
  x=max(strength(kind,spec) for kind,spec in parts.values())
  p=theme_chance(x)
  if p>0:out[gid]=(p,members,x,min(THEME_RANK[kind] for kind,_ in parts.values()))
 return out
