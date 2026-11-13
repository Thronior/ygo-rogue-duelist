"""Curated bonus-stock relics; weights are relative to an ordinary relic."""
import re
DEFINITIONS=[
 ('fusion_chamber','Fusion Chamber','Fusion Monsters and Fusion support','Polymerization'),
 ('amazoness_standard','Amazoness Standard','Amazoness cards and support','Amazoness Archers'),
 ('necrovalley_tablet','Necrovalley Tablet',"Gravekeeper’s cards and Necrovalley support",'Necrovalley'),
 ('harpie_feather','Harpie Feather','Harpie cards and support',"Harpie's Feather Duster"),
 ('scorpion_emblem','Scorpion Emblem','Dark Scorpion cards and Don Zaloog','Mustering of the Dark Scorpions'),
 ('ninja_scroll','Ninja Scroll','Ninja monsters and Ninjitsu support','Ninjitsu Art of Transformation'),
 ('guardian_arsenal','Guardian Arsenal','Guardian monsters and their dedicated equipment','Arsenal Summoner'),
 ('union_dock','Union Dock','Union monsters, Union support, and XYZ Fusion Monsters','Union Rider'),
 ('ocean_relic','Ocean Relic','Umi cards and dedicated support','A Legendary Ocean'),
 ('evolution_tablet','Evolution Tablet','LV monsters and dedicated support','Level Up!'),
 ('destiny_hourglass','Destiny Hourglass','Destiny Board, Spirit Messages, or Final Countdown','Final Countdown'),
 ('ritual_dagger','Ritual Dagger','Ritual monsters and Ritual Spells','Curse of the Masked Beast'),
]
NEW_IDS={x[0] for x in DEFINITIONS}
# The six Guardians' dedicated Equip Spells, shared with the Guardian shop category (shop_rewards.py).
GUARDIAN_EQUIPS={'Wicked-Breaking Flamberge - Baou','Shooting Star Bow - Ceal','Butterfly Dagger - Elma','Gravity Axe - Grarl',"Rod of Silence - Kay'est",'Twin Swords of Flashing Light - Tryce'}
GUARDIAN_ARSENAL={'Arsenal Summoner','Guardian Baou','Guardian Ceal','Guardian Elma',"Guardian Grarl","Guardian Kay'est",'Guardian Tryce'}|GUARDIAN_EQUIPS
METALMORPH_CARDS={'Metalmorph','Zoa','Metalzoa','Red-Eyes Black Dragon','Red-Eyes Black Metal Dragon'}
FAMILY=NEW_IDS|{'toon_world','legendary_shackles','archfiend_contract'}
def install(artifact):
 for key,name,label,art in DEFINITIONS:
  artifact(key,name,80 if key in ('fusion_chamber','ritual_dagger') else 85,f'Every shop and reroll offers one additional random card from this pool: {label}.',art,'archetype_stock',1,'economy')
def weight(key,run):
 weight=1.0
 if key in FAMILY:weight*=0.125 if FAMILY.intersection(run.get('artifacts',[])) else 0.25
 from content import ART_INFO
 owned=[ART_INFO.get(x,{}) for x in run.get('artifacts',[]) if ART_INFO.get(x,{}).get('effect') in ('attribute','both') and ART_INFO.get(x,{}).get('filter') in {'LIGHT','DARK','FIRE','WATER','WIND','EARTH'}]
 if owned:
  candidate=ART_INFO.get(key,{})
  filt=candidate.get('filter','')
  if candidate.get('effect')=='attribute' or (candidate.get('effect')=='both' and filt in {'LIGHT','DARK','FIRE','WATER','WIND','EARTH'} and any(filt!=owned_relic.get('filter','') for owned_relic in owned)):weight*=0.5
 return weight

# Offer weights (user, 2026-11-13). Every relic offer (shop, Relic Picker, cursed and choice offers) goes through offer_weights:
# - weight(): hold-backs (a second family or attribute relic) and RARITY, the relics that appear less often by design.
# - Weight givers: cards in the run that a relic supports (relic_affinity, x1-3) and, in the shop, the chosen category (x5).
#   Together they are capped at BOOST_CAP (x10); a relic whose cards are missing from the run counts DEAD_RELIC.
# - Relics with no weight giver take the average boost of the ones that have one, so boosts move odds between relics
#   that care about the deck instead of making plain relics (Merchant Urn, Demonic Sword...) rare.
# - Shop only: a relic offered and not bought counts SKIPPED for the next SKIP_VISITS stocks, and in the first
#   EARLY_SHOPS shops a relic costing more than the player's coins plus EARLY_SLACK counts PRICEY.
RARITY={'traps_no_more':.25,'spells_no_more':.25,'duelist_catalogue':.2,'cursed_reversed_remedy':.6,
        'almighty':.1,'the_creator':.1,'dimensional_rift':.1}
BOOST_CAP=10.0
NEUTRAL_AVERAGE_CAP=2.0
DEAD_RELIC=.4
SKIPPED,SKIP_VISITS=.5,2
PRICEY,EARLY_SHOPS,EARLY_SLACK=.5,3,50

# Loadout relics (user, 2026-11-13; hidden, never shown or announced): each loadout has 5 relics that suit it in
# data/loadout-relics.json. Their deck gain is doubled and at least x2, and a Deck without their cards never makes them x0.4.
_loadout_relics=None
def loadout_relics(run):
 global _loadout_relics
 if _loadout_relics is None:
  import json
  from pathlib import Path
  try:_loadout_relics={k:set(v) for k,v in json.loads((Path(__file__).parent/'data/loadout-relics.json').read_text(encoding='utf8')).items() if not k.startswith('_')}
  except (OSError,ValueError):_loadout_relics={}
 try:key=f"{int(run.get('character'))}:{int(run.get('variant') or 0)}"
 except (TypeError,ValueError):return set()
 return _loadout_relics.get(key,set())
LOADOUT_GAIN,LOADOUT_MIN=2.0,2.0

def offer_weights(options,run,favored=(),favor=1,prices=None,shop=False):
 """{key:(base,boost,giver)}; in Tag each player's Deck (and hidden loadout list) adds half of its boost change."""
 import relic_affinity
 mine=_offer_weights_one(options,run,favored,favor,prices,shop);other=relic_affinity.tag_partner(run)
 if other is None:return mine
 theirs=_offer_weights_one(options,other,favored,favor,None,False)
 return {k:(mine[k][0],1+.5*(mine[k][1]-1)+.5*(theirs[k][1]-1),mine[k][2] or theirs[k][2]) for k in mine}

def _offer_weights_one(options,run,favored=(),favor=1,prices=None,shop=False):
 """{key:(base,boost,giver)}: base is rarity, hold-backs and shop modifiers; boost is the capped weight-giver multiplier."""
 import relic_affinity,shop_rewards
 options=list(options);detail=relic_affinity.details(options,run)
 mapped=set().union(*shop_rewards.CATEGORY_RELICS.values())
 boost,givers={},set();loadout=loadout_relics(run)
 for key in options:
  multiplier,rule,matched=detail[key]
  if key in loadout:
   value=max(LOADOUT_MIN,1+LOADOUT_GAIN*(multiplier-1))*(favor if key in favored else 1);givers.add(key)
   boost[key]=min(BOOST_CAP,value);continue
  value=multiplier*(favor if key in favored else 1)
  if rule and not matched:value*=DEAD_RELIC
  if rule or key in mapped:givers.add(key)
  boost[key]=min(BOOST_CAP,value)
 # Each giver counts at most NEUTRAL_AVERAGE_CAP here, so a deck built around one theme pulls its relics ahead of plain ones.
 average=sum(min(NEUTRAL_AVERAGE_CAP,boost[k]) for k in givers)/len(givers) if givers else 1.0
 skips=(run.get('relic_skips') or {}) if shop else {}
 early=shop and prices is not None and int(run.get('round',0) or 0)<EARLY_SHOPS
 gold=int(run.get('gold',0) or 0);out={}
 for key in options:
  base=weight(key,run)*RARITY.get(key,1.0)
  # A family relic's hold-back (x0.25, x0.125 with one owned) fades as the deck commits to its cards: none for an all-X deck.
  if key in FAMILY and key in givers:
   multiplier,rule,matched=detail[key]
   hold=0.125 if FAMILY.intersection(run.get('artifacts',[])) else 0.25
   top=relic_affinity.ceiling(key,member_test(key,run) if member_test(key,run) not in (None,True) else None)
   share=1.0 if top<=1 else max(0.0,min(1.0,(multiplier-1)/(top-1)))
   base*=(hold+(1-hold)*share)/hold
  if skips.get(key,0)>0:base*=SKIPPED
  if early and prices.get(key,0)>gold+EARLY_SLACK:base*=PRICEY
  out[key]=(base,boost[key] if key in givers else average,key in givers)
 return out

def sample(options,count,run,rng,favored=(),favor=1):
 remaining=list(options);result=[];w=offer_weights(remaining,run,favored,favor)
 for _ in range(min(count,len(remaining))):
  key=rng.choices(remaining,weights=[w[k][0]*w[k][1] for k in remaining],k=1)[0]
  result.append(key);remaining.remove(key)
 return result

# Shop relic slots (Thronior, Discord 2026-11-10): the first two use the full weighting; every further slot is random, so relics
# with no weight modifier stop becoming rare by accident. In the random slots a relic the weighting boosts this visit counts a
# little less than an ordinary relic; rarity, hold-backs, missing cards and the shop modifiers still apply.
WEIGHTED_SHOP_SLOTS=2
RANDOM_SLOT_BOOSTED=0.8
def shop_sample(options,count,run,rng,favored=(),favor=1,prices=None):
 remaining=list(options);result=[];w=offer_weights(remaining,run,favored,favor,prices,shop=True)
 def random_slot(k):
  base,boost,giver=w[k]
  return base*(1.0 if not giver else RANDOM_SLOT_BOOSTED if boost>1 else min(1.0,boost))
 for slot in range(min(count,len(remaining))):
  weights=[w[k][0]*w[k][1] for k in remaining] if slot<WEIGHTED_SHOP_SLOTS else [random_slot(k) for k in remaining]
  key=rng.choices(remaining,weights=weights,k=1)[0]
  result.append(key);remaining.remove(key)
 return result

def note_skipped(run,previous_stock):
 """Called on every restock: relics left unsold in the previous stock count SKIPPED for the next SKIP_VISITS stocks."""
 skips={k:v-1 for k,v in (run.get('relic_skips') or {}).items() if v>1}
 for item in previous_stock or []:
  if item.get('kind')=='artifact' and not item.get('sold') and item['id'] not in (run.get('relic_locks') or []):skips[item['id']]=SKIP_VISITS
 run['relic_skips']=skips

def matches(key,c):
 n=c['name'];t=c.get('desc','');typ=c['data']['type']
 if key=='ritual_dagger':return bool(typ&0x80 and typ&3)
 if key=='fusion_chamber':return bool(typ&0x40) or n in {'Polymerization','Fusion Sage','Fusion Gate','Fusion Recovery','De-Fusion','King of the Swamp','Goddess with the Third Eye','Versago the Destroyer','Mystical Sheep #1','The Dark - Hex-Sealed Fusion','The Light - Hex-Sealed Fusion','The Earth - Hex-Sealed Fusion','Beastking of the Swamps'}
 if key=='amazoness_standard':return 'Amazoness' in n or n=='Dramatic Rescue'
 if key=='necrovalley_tablet':return n.startswith("Gravekeeper's") or n in {'Necrovalley','Royal Tribute','Rite of Spirit','Charm of Shabti','A Cat of Ill Omen','An Owl of Luck'}
 if key=='harpie_feather':return 'Harpie' in n or n in {'Birdface','Elegant Egotist','Cyber Shield','Triangle Ecstasy Spark'}
 if key=='scorpion_emblem':return 'Dark Scorpion' in n or n=='Don Zaloog'
 if key=='ninja_scroll':return (bool(typ&1) and 'Ninja' in n) or n.startswith('Ninjitsu Art') or n=='Fuhma Shuriken'
 if key=='guardian_arsenal':return n in GUARDIAN_ARSENAL
 if key=='union_dock':return bool(typ&0x400) or n in {'X-Head Cannon','XY-Dragon Cannon','XZ-Tank Cannon','YZ-Tank Dragon','XYZ-Dragon Cannon','Formation Union','Combination Attack','Union Rider','Frontline Base'}
 if key=='ocean_relic':return n=='Umi' or '"Umi"' in t or n=='Ocean Dragon Lord - Neo-Daedalus'
 if key=='evolution_tablet':return (bool(typ&1) and bool(re.search(r' LV[0-9]+$',n))) or n in {'Level Up!','The Graveyard in the Fourth Dimension',"Horus' Servant"}
 if key=='destiny_hourglass':return n in {'Destiny Board','Spirit Message "I"','Spirit Message "N"','Spirit Message "A"','Spirit Message "L"','Final Countdown'}
 return False

# Archetype relics only appear once your card pool holds a card they help (Thronior, 2026-10-28).
EXODIA={'Exodia the Forbidden One','Right Arm of the Forbidden One','Left Arm of the Forbidden One','Right Leg of the Forbidden One','Left Leg of the Forbidden One'}
def _setcode(c,code):return any(int(x)&0xfff==code for x in c.get('data',{}).get('setcodes',[]))
def member_test(key,run):
 """The card test for an archetype relic, True if Name Changer already covers it, None for every other relic."""
 from content import ART_INFO
 info=ART_INFO.get(key,{});effect=info.get('effect')
 if key in NEW_IDS:test=lambda c:matches(key,c)
 elif effect=='like_toon':test=lambda c:'toon' in c['name'].lower()
 elif effect=='like_exodia':test=lambda c:c['name'] in EXODIA
 elif effect in ('like_archfiend','archfiend_cost'):test=lambda c:'archfiend' in c['name'].lower() or _setcode(c,0x45)
 elif effect in ('starting_low_level','starting_level_up'):test=lambda c:matches('evolution_tablet',c)
 elif effect=='terrorking_atk':test=lambda c:c['id']==int(info.get('filter') or 0)
 # Field of Attraction (Paradox Brothers' Magnet Warriors): Alpha, Beta, Gamma and Valkyrion share set code 0x66.
 elif effect=='variant_field_of_attraction':test=lambda c:bool(c['data']['type']&1) and _setcode(c,0x66)
 # Metal Coating (Bandit Keith's Metalmorph loadout): Metalmorph, the monsters it turns into, and what they Tribute.
 elif effect=='variant_metal_coating':test=lambda c:c['name'] in METALMORPH_CARDS
 elif effect in ('archetype_atk','variant_swordsman_oath'):
  code=0x41 if effect=='variant_swordsman_oath' else int(info.get('filter') or '0',16)
  # Name Changer can already make every monster a member.
  if code in run.get('name_changes',[]):return True
  test=lambda c:bool(c['data']['type']&1) and (_setcode(c,code) or (code==0x1a and c['name']=='Don Zaloog'))
 else:return None
 return test

def has_member(key,run):
 """False for an archetype relic whose cards are missing from the run's pool; True for every other relic."""
 test=member_test(key,run)
 if test is None or test is True:return True
 import campaign as g
 return any(test(g.BY_ID[cid]) for cid in set(run.get('pool',[])) if cid in g.BY_ID)
