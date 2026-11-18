"""Curated bonus-stock relics; weights are relative to an ordinary relic."""
import re
DEFINITIONS=[
 ('fusion_chamber','Fusion Chamber','Fusion support cards, and Fusion Monsters you own at least one Fusion Material for','Polymerization'),
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
# Rarely bought archetype relics (2026-11-16 balance picks): 60 coins, and buying one adds 1 random card from its pool
# to the card pool (campaign_expansion.acquire_relic). A starting relic does not add one.
STARTER_CARD={'ninja_scroll','destiny_hourglass','guardian_arsenal','scorpion_emblem'}
PRICES={'fusion_chamber':80,'ritual_dagger':80}|{key:60 for key in STARTER_CARD}
def install(artifact):
 for key,name,label,art in DEFINITIONS:
  text=f'Every shop and reroll offers one additional random card from this pool: {label}.'
  if key in STARTER_CARD:text+=' When acquired, add 1 random card from this pool to your card pool.'
  artifact(key,name,PRICES.get(key,85),text,art,'archetype_stock',1,'economy')
# Family relics (user, 2026-11-18): never offered before the card pool holds one of their cards (has_member, in
# campaign_expansion.shop_relic_eligible); after that FAMILY_BASE plus FAMILY_PER_CARD for every matching Deck card (a Yes
# mark on an owned card outside the Deck counts as relic_affinity.MARK_YES_COPIES cards), up to FAMILY_CAP.
FAMILY_BASE,FAMILY_PER_CARD,FAMILY_CAP=.25,1.0,10.0
def family_weight(matches):return min(FAMILY_CAP,FAMILY_BASE+FAMILY_PER_CARD*max(0,matches))
def weight(key,run):
 """A relic's base weight before rarity and the shop modifiers: 1, or the family weight for its matching Deck cards."""
 if key not in FAMILY:return 1.0
 import relic_affinity
 return family_weight(relic_affinity.details([key],run)[key][1])
# Offer weights (user, 2026-11-13). Every relic offer (shop, Relic Picker, cursed and choice offers) goes through offer_weights:
# - weight(): family relics by their matching Deck cards, and RARITY, the relics that appear less often by design.
# - The Deck: since 2026-11-14 its themes no longer multiply weights; each theme gets a chance per stock or offer instead
#   (relic_affinity.theme_chances, themed_picks below). A relic whose cards are missing from the Deck still counts DEAD_RELIC.
# - In the shop, the category picked after the Duel (x5, capped at BOOST_CAP) and the hidden loadout lists (x2).
# - Plain relics (Merchant Urn, Demonic Sword...) count 1.
# - Shop only: a relic offered and not bought counts SKIPPED for the next SKIP_VISITS stocks, and in the first
#   EARLY_SHOPS shops a relic costing more than the player's coins plus EARLY_SLACK counts PRICEY.
RARITY={'traps_no_more':.25,'spells_no_more':.25,'cursed_reversed_remedy':.6,
        'almighty':.1,'the_creator':.1,'dimensional_rift':.1,'dark_lotus':.1}
BOOST_CAP=10.0
# Relics that name specific cards and do nothing without them (user, 2026-11-18): x NOT_OWNED in every offer while the
# run's card pool lacks them. (names, how many different ones are needed). Archetype relics and relics that hand you the
# card themselves (Final Hour, Level Up!, Metal Coating, Gadget Stronghold) are not listed.
SPECIFIC_CARDS={
 'gate_calling':(('Sanga of the Thunder','Kazejin','Suijin'),2),
 'jin_trio':(('Sanga of the Thunder','Kazejin','Suijin'),1),
 'blue_eyes_radiance':(('Blue-Eyes White Dragon','Blue-Eyes Shining Dragon'),2),
 'black_chaos_rite':(('Dark Magician','Dark Magician of Chaos'),2),
 'all_for_one_terrorking':(('Terrorking Archfiend',),1),
}
NOT_OWNED=.3
def owns_named_cards(key,run):
 """False when a SPECIFIC_CARDS relic's cards are missing from the run's card pool."""
 need=SPECIFIC_CARDS.get(key)
 if not need:return True
 import campaign as g
 names,count=need
 owned={g.BY_ID[cid]['name'] for cid in set(run.get('pool',[])) if cid in g.BY_ID}
 return len(owned.intersection(names))>=count
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
LOADOUT_MIN=2.0

def offer_weights(options,run,favored=(),favor=1,prices=None,shop=False):
 """{key:(base,boost,giver)}; in Tag each player's Deck (and hidden loadout list) adds half of its boost change."""
 import relic_affinity
 mine=_offer_weights_one(options,run,favored,favor,prices,shop);other=relic_affinity.tag_partner(run)
 if other is None:return mine
 theirs=_offer_weights_one(options,other,favored,favor,None,False)
 # Family relics: each Deck adds half of its family weight (the rest of the base, rarity and shop modifiers, is the host's).
 family=[k for k in mine if k in FAMILY]
 if family:
  m,t=relic_affinity.details(family,run),relic_affinity.details(family,other)
  share={k:(.5*family_weight(m[k][1])+.5*family_weight(t[k][1]))/family_weight(m[k][1]) for k in family}
 return {k:(mine[k][0]*(share[k] if k in FAMILY else 1),1+.5*(mine[k][1]-1)+.5*(theirs[k][1]-1),mine[k][2] or theirs[k][2]) for k in mine}

def _offer_weights_one(options,run,favored=(),favor=1,prices=None,shop=False):
 """{key:(base,boost,giver)}: base is rarity, hold-backs and shop modifiers; boost is the capped weight-giver multiplier."""
 import relic_affinity,shop_rewards
 options=list(options);detail=relic_affinity.details(options,run)
 mapped=set().union(*shop_rewards.CATEGORY_RELICS.values())
 boost,givers={},set();loadout=loadout_relics(run)
 for key in options:
  rule,matches=detail[key]
  # The Deck's themes act through theme chances (relic_affinity.theme_chances, themed_picks), not by multiplying weights,
  # so the per-roll chances the user set are not exceeded (user, 2026-11-14).
  if key in loadout:
   value=LOADOUT_MIN*(favor if key in favored else 1);givers.add(key)
   boost[key]=min(BOOST_CAP,value);continue
  value=favor if key in favored else 1
  # Family relics weigh their Deck cards in weight(), so they skip the missing-cards factor.
  if rule and not matches and key not in FAMILY:value*=DEAD_RELIC
  if rule or key in mapped:givers.add(key)
  boost[key]=min(BOOST_CAP,value)
 skips=(run.get('relic_skips') or {}) if shop else {}
 early=shop and prices is not None and int(run.get('round',0) or 0)<EARLY_SHOPS
 gold=int(run.get('gold',0) or 0);out={}
 for key in options:
  base=(family_weight(detail[key][1]) if key in FAMILY else 1.0)*RARITY.get(key,1.0)
  if not owns_named_cards(key,run):base*=NOT_OWNED
  if skips.get(key,0)>0:base*=SKIPPED
  if early and prices.get(key,0)>gold+EARLY_SLACK:base*=PRICEY
  # Without deck multipliers there is nothing for plain relics to keep up with: they count 1 (theme chances, 2026-11-14).
  out[key]=(base,boost[key] if key in givers else 1.0,key in givers)
 return out

def themed_picks(remaining,count,run,rng,w,favored=()):
 """Theme chances (relic_affinity.theme_chances): each group the Deck fits rolls its chance that one of its relics is
 offered; the chance a stock already gives a group without help is taken off, so the total stays on target. A group sharing
 a relic with the shop category picked after the Duel goes up to THEME_CATEGORY. Picks are removed from `remaining`."""
 import relic_affinity as ra
 chances=ra.theme_chances(run);other=ra.tag_partner(run)
 if other is not None:
  theirs=ra.theme_chances(other)
  # Tag: each Deck adds half of its chance.
  chances={gid:(.5*chances.get(gid,(0,))[0]+.5*theirs.get(gid,(0,))[0],(chances.get(gid) or theirs[gid])[1],max(chances.get(gid,(0,0,0))[2],theirs.get(gid,(0,0,0))[2]),(chances.get(gid) or theirs[gid])[3]) for gid in set(chances)|set(theirs)}
 picks=[];total=len(remaining);n=min(count,total)
 # Most specific themes roll first (archetypes, then gambling/burn-style themes, then Levels, then Attributes and Types).
 for gid,(p,members,x,rank) in sorted(chances.items(),key=lambda item:(item[1][3],-item[1][0],str(item[0]))):
  if len(picks)>=n:break
  candidates=[k for k in members if k in remaining]
  if not candidates:continue
  if favored and favored.intersection(members):p=max(p,ra.THEME_CATEGORY*min(1.0,x))
  # How often the stock offers the theme unaided, from the real weights (rarity, hold-backs, the category).
  share=sum(w[k][0]*w[k][1] for k in candidates)/max(1e-9,sum(w[k][0]*w[k][1] for k in remaining))
  # Counted at 60%: other themes' picks and the random slots make the stock offer it a little less often than this.
  natural=.6*(1-(1-min(1.0,share))**(n-len(picks)))
  q=(p-natural)/(1-natural) if natural<1 else 0.0
  if q>0 and rng.random()<q:
   pick=rng.choices(candidates,weights=[max(1e-9,w[k][0]) for k in candidates],k=1)[0]
   picks.append(pick);remaining.remove(pick)
 return picks

def _place(picks,result,rng):
 for key in picks:result.insert(rng.randrange(len(result)+1),key)
 return result

def sample(options,count,run,rng,favored=(),favor=1):
 remaining=list(options);result=[];w=offer_weights(remaining,run,favored,favor)
 picks=themed_picks(remaining,count,run,rng,w,favored)
 for _ in range(min(count-len(picks),len(remaining))):
  key=rng.choices(remaining,weights=[w[k][0]*w[k][1] for k in remaining],k=1)[0]
  result.append(key);remaining.remove(key)
 return _place(picks,result,rng)

# Shop relic slots (Thronior, Discord 2026-11-10): the first two use the full weighting; every further slot is random, so relics
# with no weight modifier stop becoming rare by accident. In the random slots a relic the weighting boosts this visit counts a
# little less than an ordinary relic; rarity, hold-backs, missing cards and the shop modifiers still apply.
WEIGHTED_SHOP_SLOTS=2
RANDOM_SLOT_BOOSTED=0.8
def shop_sample(options,count,run,rng,favored=(),favor=1,prices=None):
 remaining=list(options);result=[];w=offer_weights(remaining,run,favored,favor,prices,shop=True)
 picks=themed_picks(remaining,count,run,rng,w,frozenset(favored))
 def random_slot(k):
  base,boost,giver=w[k]
  return base*(1.0 if not giver else RANDOM_SLOT_BOOSTED if boost>1 else min(1.0,boost))
 for slot in range(len(picks),len(picks)+min(count-len(picks),len(remaining))):
  weights=[w[k][0]*w[k][1] for k in remaining] if slot<WEIGHTED_SHOP_SLOTS else [random_slot(k) for k in remaining]
  key=rng.choices(remaining,weights=weights,k=1)[0]
  result.append(key);remaining.remove(key)
 return _place(picks,result,rng)

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

# Fusion Chamber (2026-11-16 balance picks): a Fusion Monster is offered only while the card pool holds one of its Fusion
# Materials: a monster named in its material line, or for a line like "5 Dragon monsters" a monster of that Type.
# Fusion support cards (Spells, Fusion Substitutes) are always offered.
def fusion_materials(c):
 line=(c.get('desc') or '').split('\n')[0]
 return set(re.findall(r'"([^"]+)"',line)),set(re.findall(r'\b([A-Z][A-Za-z-]+?)(?:-Type)? monsters?\b',re.sub(r'"[^"]*"','',line)))
def fusion_offerable(c,owned):
 if not c['data']['type']&0x40:return True
 names,races=fusion_materials(c)
 return any(o['name'] in names or (o['data']['type']&1 and o.get('race') in races) for o in owned)

# Archetype relics only appear once your card pool holds a card they help (Thronior, 2026-10-28).
EXODIA={'Exodia the Forbidden One','Right Arm of the Forbidden One','Left Arm of the Forbidden One','Right Leg of the Forbidden One','Left Leg of the Forbidden One'}
def _setcode(c,code):return any(int(x)&0xfff==code for x in c.get('data',{}).get('setcodes',[]))
# 2026-11-15 relics that weigh with an archetype (user): the Dark Magician ones with the Dark Magician shop category's cards,
# the Blue-Eyes and Red-Eyes ones with cards named or naming "Blue-Eyes" / "Red-Eyes".
def _dark_magician(c):
 import shop_rewards
 return shop_rewards.matches(c,'darkmagician')
def _eyes(*names):return lambda c:any(n in c['name'] or f'"{n}' in (c.get('desc') or '') for n in names)
CARD_THEMES={'magicians_bond':_dark_magician,'master_and_apprentice':_dark_magician,'black_chaos_rite':_dark_magician,
 'blue_eyes_radiance':_eyes('Blue-Eyes'),'twin_eyes':_eyes('Blue-Eyes','Red-Eyes'),'dragon_blood_fusion':_eyes('Blue-Eyes','Red-Eyes')}
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
 elif key in CARD_THEMES:test=CARD_THEMES[key]
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
