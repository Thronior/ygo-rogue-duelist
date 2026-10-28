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
]
NEW_IDS={x[0] for x in DEFINITIONS}
FAMILY=NEW_IDS|{'toon_world','legendary_shackles','archfiend_contract'}
def install(artifact):
 for key,name,label,art in DEFINITIONS:
  artifact(key,name,80 if key=='fusion_chamber' else 85,f'Every shop and reroll offers one additional random card from this pool: {label}.',art,'archetype_stock',1,'economy')
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

def sample(options,count,run,rng):
 remaining=list(options);result=[]
 for _ in range(min(count,len(remaining))):
  key=rng.choices(remaining,weights=[weight(k,run) for k in remaining],k=1)[0]
  result.append(key);remaining.remove(key)
 return result

def matches(key,c):
 n=c['name'];t=c.get('desc','');typ=c['data']['type']
 if key=='fusion_chamber':return bool(typ&0x40) or n in {'Polymerization','Fusion Sage','Fusion Gate','Fusion Recovery','De-Fusion','King of the Swamp','Goddess with the Third Eye','Versago the Destroyer','Mystical Sheep #1','The Dark - Hex-Sealed Fusion','The Light - Hex-Sealed Fusion','The Earth - Hex-Sealed Fusion','Beastking of the Swamps'}
 if key=='amazoness_standard':return 'Amazoness' in n or n=='Dramatic Rescue'
 if key=='necrovalley_tablet':return n.startswith("Gravekeeper's") or n in {'Necrovalley','Royal Tribute','Rite of Spirit','Charm of Shabti','A Cat of Ill Omen','An Owl of Luck'}
 if key=='harpie_feather':return 'Harpie' in n or n in {'Birdface','Elegant Egotist','Cyber Shield','Triangle Ecstasy Spark'}
 if key=='scorpion_emblem':return 'Dark Scorpion' in n or n=='Don Zaloog'
 if key=='ninja_scroll':return (bool(typ&1) and 'Ninja' in n) or n.startswith('Ninjitsu Art') or n=='Fuhma Shuriken'
 if key=='guardian_arsenal':return n in {'Arsenal Summoner','Guardian Baou','Guardian Ceal','Guardian Elma',"Guardian Grarl","Guardian Kay'est",'Guardian Tryce','Wicked-Breaking Flamberge - Baou','Shooting Star Bow - Ceal','Butterfly Dagger - Elma','Gravity Axe - Grarl',"Rod of Silence - Kay'est",'Twin Swords of Flashing Light - Tryce'}
 if key=='union_dock':return bool(typ&0x400) or n in {'X-Head Cannon','XY-Dragon Cannon','XZ-Tank Cannon','YZ-Tank Dragon','XYZ-Dragon Cannon','Formation Union','Combination Attack','Union Rider','Frontline Base'}
 if key=='ocean_relic':return n=='Umi' or '"Umi"' in t or n=='Ocean Dragon Lord - Neo-Daedalus'
 if key=='evolution_tablet':return (bool(typ&1) and bool(re.search(r' LV[0-9]+$',n))) or n in {'Level Up!','The Graveyard in the Fourth Dimension',"Horus' Servant"}
 if key=='destiny_hourglass':return n in {'Destiny Board','Spirit Message "I"','Spirit Message "N"','Spirit Message "A"','Spirit Message "L"','Final Countdown'}
 return False

# Archetype relics only appear once your card pool holds a card they help (Thronior, 2026-10-28).
EXODIA={'Exodia the Forbidden One','Right Arm of the Forbidden One','Left Arm of the Forbidden One','Right Leg of the Forbidden One','Left Leg of the Forbidden One'}
def _setcode(c,code):return any(int(x)&0xfff==code for x in c.get('data',{}).get('setcodes',[]))
def has_member(key,run):
 """False for an archetype relic whose cards are missing from the run's pool; True for every other relic."""
 from content import ART_INFO
 info=ART_INFO.get(key,{});effect=info.get('effect')
 if key in NEW_IDS:test=lambda c:matches(key,c)
 elif effect=='like_toon':test=lambda c:'toon' in c['name'].lower()
 elif effect=='like_exodia':test=lambda c:c['name'] in EXODIA
 elif effect=='like_archfiend':test=lambda c:'archfiend' in c['name'].lower() or _setcode(c,0x45)
 elif effect=='terrorking_atk':test=lambda c:c['id']==int(info.get('filter') or 0)
 elif effect in ('archetype_atk','variant_swordsman_oath'):
  code=0x41 if effect=='variant_swordsman_oath' else int(info.get('filter') or '0',16)
  # Name Changer can already make every monster a member.
  if code in run.get('name_changes',[]):return True
  test=lambda c:bool(c['data']['type']&1) and _setcode(c,code)
 else:return True
 import campaign as g
 return any(test(g.BY_ID[cid]) for cid in set(run.get('pool',[])) if cid in g.BY_ID)
