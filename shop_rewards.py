import card_rarity,functools,random,re
"""Opponent rewards specify card properties, not just monster races.

Every opponent draws its shop theme from one shared list (see reward_keys);
there is no longer a per-opponent theme table.
"""
from content import CHARACTERS,PACK_BY_ID,ART_INFO

# Reviewed against the card text in era-cards.json: these can remove opposing
# back row already on the field, including conditional and general-card removal.
# Do not infer this from keywords alone: protection, self-removal, graveyard
# retrieval and activation-only negation also mention spells/traps and destruction.
BACKROW_REMOVAL=frozenset({
 'A Wingbeat of Giant Dragon','Armed Ninja','Bait Doll','Blast with Chain',
 'Blowback Dragon','Breaker the Magical Warrior','Bubble Crash','Burning Beast',
 'Burning Land','Byser Shock',
 'Crimson Ninja','Dark Magic Attack','Dark Magician Knight',
 'Dark Scorpion - Chick the Yellow','Dark Scorpion - Cliff the Trap Remover',
 'De-Spell','Disarmament','Double Snare','Driving Snow','Dust Tornado',
 'Final Destiny','Fish and Kicks','Fish Depth Charge','Freezing Beast',
 'Giant Trunade','Gigantes','Greenkappa','Gryphon Wing','Gust',
 'Hannibal Necromancer',"Harpie's Feather Duster",'Heavy Storm','Huge Revolution',
 'Lady Ninja Yae','Last Turn','Levia-Dragon - Daedalus','Light of Judgment',
 'Malevolent Catastrophe','Mega Ton Magical Cannon','Moisture Creature',
 'Mystical Space Typhoon','Nobleman of Extermination','Ojama Delta Hurricane!!',
 'Orca Mega-Fortress of Darkness','Order to Smash','Proton Blast','Raigeki Break',
 'Reaper of the Cards','Remove Trap','Spell Shattering Arrow','Spiritualism',
 'Stamping Destruction','Swarm of Locusts','The Law of the Normal',
 'The Wicked Eraser','Tornado Bird','Trap Master','XY-Dragon Cannon',
 'XYZ-Dragon Cannon','XZ-Tank Cannon',
})

# Expansion cards reviewed for actual removal of opposing back row.
BACKROW_REMOVAL |= {'Fuh-Rin-Ka-Zan','Infernal Flame Emperor','Ocean Dragon Lord - Neo-Daedalus',
 "Van'Dalgyon the Dark Dragon Lord"}

def removes_backrow(card):return card['name'] in BACKROW_REMOVAL

NEGATION={'Magic Jammer','Seven Tools of the Bandit','Solemn Judgment'}
DRAW={'Pot of Greed','Graceful Charity','Upstart Goblin','Jar of Greed','Reckless Greed','Card Destruction','Morphing Jar','Cyber Jar','Fiber Jar','Heart of the Underdog','Reload','Monster Recovery','Dragged Down into the Grave','White Magical Hat','Don Zaloog','Airknight Parshath','Sasuke Samurai',"Robbin' Goblin","Robbin' Zombie","Gravekeeper's Vassal"}
BURN={'Ookazi','Hinotama','Just Desserts','Meteorain','Tremendous Fire','Final Flame','Goblin Fan','Sparks','Fairy Meteor Crush','Cannon Soldier','Catapult Turtle','Dark Room of Nightmare','Princess of Tsurugi','Fire Princess','Bowganian','Des Koala','Solar Flare Dragon','Wave-Motion Cannon','Ceasefire','Secret Barrel'}
HEAL={'Red Medicine','Dian Keto the Cure Master','Soul of the Pure','Mooyan Curry','Numinous Healer','Gift of The Mystical Elf','Enchanted Javelin','Cure Mermaid','White Magician Pikeru','Dancing Fairy','Cure Master','Darklord Marie','Fire Princess','Des Dendle','Solemn Wishes','Life Absorbing Machine','Emergency Provisions','Rain of Mercy','Blue Medicine','Nutrient Z','Mushroom Man #2'}
STALL={'Waboku','Negate Attack','Swords of Revealing Light','Gravity Bind','Messenger of Peace','Level Limit - Area B','Nightmare Steelcage','Mirror Wall','Wall of Revealing Light','Light of Intervention','Stumbling','The Dark Door','Tornado Wall','Ordeal of a Traveler','Curse of Royal','Cursed Seal of the Forbidden Spell','Earthshaker','Ojama Trio','Scapegoat','Stray Lambs','Castle Walls','Labyrinth Wall','Millennium Shield'}
PIERCE={'Fairy Meteor Crush','Spear Dragon','Airknight Parshath','Mad Sword Beast','Dark Driceratops','Axe of Despair','Malevolent Nuzzler','United We Stand','Mage Power','Megamorph','Black Pendant','Horn of the Unicorn','Sword of Deep-Seated','Final Attack Orders'}
SEARCH={'Sangan','Witch of the Black Forest','Giant Rat','Mystic Tomato','Shining Angel','UFO Turtle','Pyramid Turtle','Nimble Momonga','Magical Merchant','Slate Warrior','Frontline Base','Reinforcement of the Army','Fusion Sage','Terraforming','Toon Table of Contents','Different Dimension Capsule','Painful Choice','Flying Kamakiri #1','Mother Grizzly','Vampire Lady'}
DESTRUCTION={'Raigeki','Dark Hole','Fissure','Smashing Ground','Tribute to the Doomed','Raigeki Break','Trap Hole','Bottomless Trap Hole','Mirror Force','Torrential Tribute','Ring of Destruction','Two-Pronged Attack','Nobleman of Crossout','Exiled Force','Newdoria','Old Vindictive Magician','Blast Sphere','Penguin Soldier','Blind Destruction','Dice Jar'}
SUMMON={'Monster Reborn','Premature Burial','Call of the Haunted','The Shallow Grave','Scapegoat','Sangan','Witch of the Black Forest','Giant Rat','Mystic Tomato','Shining Angel','Soul Resurrection','Soul Rope','UFO Turtle','Pyramid Turtle','Flying Kamakiri #1','Mother Grizzly','Vampire Lady','Slate Warrior','Magical Merchant','Call of the Mummy','Stray Lambs'}
WARRIOR_SUPPORT={'Reinforcement of the Army','Command Knight','The A. Forces','Marauding Captain','Freed the Matchless General','Goblin Attack Force','D.D. Assailant','Exiled Force','Buster Blader','Karate Man','Hayabusa Knight','Rocket Warrior','Kojikocy'}
OJAMA_SUPPORT={'Heart of the Underdog','Human-Wave Tactics','The Law of the Normal','Triangle Power','Stumbling','Final Attack Orders','Non-Spellcasting Area','Cost Down','Giant Rat','Mother Grizzly','Flying Kamakiri #1','Shining Angel','Mystic Tomato','UFO Turtle','Pyramid Turtle'}
DM_SUPPORT={'Dark Magic Curtain','Dark Magic Attack','Thousand Knives','Diffusion Wave-Motion','Magical Dimension','Apprentice Magician','Old Vindictive Magician','Skilled White Magician',"Magician's Valkyria",'Chaos Command Magician','Magical Marionette','Mage Power','Axe of Despair','Book of Secret Arts'}
TOON_SUPPORT={'Toon Table of Contents','Jinzo','Royal Decree','Trap Jammer','Seven Tools of the Bandit','Magic Jammer','Solemn Judgment','Mystical Space Typhoon','Dust Tornado','Heavy Storm','Giant Trunade'}
GRAVE_SUPPORT={'Necrovalley','Royal Tribute','Rite of Spirit','Soul Release','Disappear','Kycoo the Ghost Destroyer','D.D. Warrior Lady','D.D. Assailant','Soul Absorption','A Cat of Ill Omen'}
DICE={'Second Coin Toss','Dice Re-Roll','Dice Jar','Skull Dice','Graceful Dice'}
MAGICIAN_SUPPORT={"Magician's Circle",'Magical Dimension','Pitch-Black Power Stone','Royal Magical Library','Mage Power'}
FLIP_SUPPORT={'Book of Moon','Book of Taiyou','Desert Sunlight','The Shallow Grave','Magical Hats','Penguin Soldier','Hane-Hane','Man-Eater Bug','Swords of Revealing Light'}
BATTLETRAP={'Acid Trap Hole','Widespread Ruin','Sakuretsu Armor','Michizure','Blast Held by a Tribute','Two-Pronged Attack','Negate Attack','Magic Cylinder','Draining Shield','Mirror Force','Mirror Wall','Enchanted Javelin','Horn of Heaven','Skull Lair'}
GREED={'Pot of Greed','Jar of Greed','Reckless Greed','Chaos Greed','Goblin of Greed'}
BOOKCASTER={'Royal Magical Library','Skilled Dark Magician','Apprentice Magician','Magical Dimension','Mage Power','Diffusion Wave-Motion','Pitch-Black Power Stone',"Magician's Circle",'Skilled White Magician','Old Vindictive Magician','Magical Marionette','Dark Magic Curtain','Book of Secret Arts',"Magician's Valkyria"}
DEFENSE={'Labyrinth Wall','Stone Statue of the Aztecs','Gear Golem the Moving Fortress','The Dark Door','Stumbling','Light of Intervention','Giant Soldier of Stone','Mystical Elf','Nimble Momonga'}
MACHINE_SUPPORT={'Limiter Removal','Machine Conversion Factory','Jinzo','Slot Machine','Blowback Dragon','Barrel Dragon','Gradius','X-Head Cannon','XYZ-Dragon Cannon','XY-Dragon Cannon'}
CHAOS_SUPPORT={'Kycoo the Ghost Destroyer','D.D. Warrior Lady','D.D. Assailant','Soul Release','Disappear','Bazoo the Soul-Eater','Soul Absorption','Soul Resurrection','Shining Angel','Senju of the Thousand Hands'}
SPIRIT_SUPPORT={'Book of Moon','Book of Taiyou','Desert Sunlight','Swords of Revealing Light','Ceasefire','Sangan','Witch of the Black Forest','Mystic Tomato','Giant Rat'}
UNION_SUPPORT={'Frontline Base','Combination Attack','Formation Union','X-Head Cannon','XYZ-Dragon Cannon','XY-Dragon Cannon','Gradius','Slot Machine','Blowback Dragon','Barrel Dragon'}
ARCHFIEND_SUPPORT={'Axe of Despair','Pandemonium','Falling Down',"Archfiend's Oath",'A Deal with Dark Ruler','Call of the Haunted','Backup Soldier','Dark Necrofear'}
RACE_SUPPORT={'Warrior':{'Reinforcement of the Army','Command Knight','The A. Forces','Marauding Captain','Freed the Matchless General','Buster Blader','Exiled Force','D.D. Assailant','Goblin Attack Force','Karate Man','Hayabusa Knight','Rocket Warrior','Kojikocy','Rude Kaiser','The Warrior Returning Alive'},'Fiend':{'Pandemonium',"Archfiend's Oath",'A Deal with Dark Ruler','Dark Necrofear','Contract with the Dark Master','Dark Energy'},'Dragon':{'Stamping Destruction','Burst Breath',"Dragon's Rage",'Super Rejuvenation','The Flute of Summoning Dragon','Dragon Treasure','Mountain','A Wingbeat of Giant Dragon'},'Spellcaster':{'Magical Dimension','Diffusion Wave-Motion','Dark Magic Curtain','Dark Magic Attack','Thousand Knives',"Magician's Circle",'Pitch-Black Power Stone','Royal Magical Library','Yami','Book of Secret Arts','Sword of Dark Destruction'},'Machine':{'Limiter Removal','Machine Conversion Factory','Combination Attack','Formation Union','Metalmorph','Amplifier'},'Zombie':{'Book of Life','Call of the Mummy','Soul Resurrection'},'Aqua':{'Umi','A Legendary Ocean','Tornado Wall','Salvage','Aqua Chorus'},'Fish':{'Umi','A Legendary Ocean','Tornado Wall','Salvage','Aqua Chorus'},'Sea Serpent':{'Levia-Dragon - Daedalus','A Legendary Ocean','Umi','Salvage','Tornado Wall','Aqua Chorus','Star Boy','Mermaid Knight','Mother Grizzly','Electric Snake'},'Fairy':{'Cestus of Dagla','Shine Palace','Soul of Purity and Light'},'Insect':{'Insect Armor with Laser Cannon','Insect Barrier','Multiplication of Ants','DNA Surgery'},'Dinosaur':{'Molten Destruction','Wasteland'},'Thunder':{'Luminous Spark'},'Plant':{'Forest'},'Pyro':{'Molten Destruction','Little Chimera','Backfire'},'Winged Beast':{'Mountain','Rising Air Current','Follow Wind'}}
ATTR_SUPPORT={'DARK':{'Mystic Plasma Zone','Yami','Dark Energy','Dark Necrofear'},'LIGHT':{'Luminous Spark','Soul of Purity and Light','Cestus of Dagla','Shine Palace'},'EARTH':{'Gaia Power','Wasteland'},'WIND':{'Rising Air Current','Follow Wind'},'WATER':{'Umi','A Legendary Ocean','Salvage','Tornado Wall','Aqua Chorus'},'FIRE':{'Molten Destruction','Little Chimera','Backfire'}}
EQUIPTRAP={'Metalmorph','Blast with Chain','Kunai with Chain','Nightmare Wheel','Mask of the Accursed'}
EXODIA_SET={'Exodia the Forbidden One','Exodia Necross','Contract with Exodia','Right Arm of the Forbidden One','Left Arm of the Forbidden One','Right Leg of the Forbidden One','Left Leg of the Forbidden One'}
CONTROL_EXTRA={'Autonomous Action Unit','Lava Golem','Soul Exchange'}
# One shared theme list is rolled for every opponent on the encounter screen.

LABELS={'lowlevel':'Level 2 and lower monsters','midlevel':'Level 3-4 monsters','highlevel':'Level 5-6 monsters','toplevel':'Level 7+ monsters','spirit':'Spirit monsters','union':'Union monsters','fusion':'Fusion monsters and Fusion Spells','equip':'Equip Spells and equip Traps','gambling':'Gambling cards','field':'Field Spells','normal_trap':'Normal Traps','draw':'Card draw','burn':'Burn damage','heal':'Life point recovery','stall':'Defensive stalls','pierce':'Piercing damage','harpie':'Harpie cards','gravekeeper':'Gravekeeper cards','darkmagician':'Dark Magician cards','exodia':'Exodia pieces','darkscorpion':'Dark Scorpion cards','guardian':'Guardian monsters','goblin':'Goblin cards','magician':'Magician cards','dragon':'Dragon monsters','warrior':'Warrior monsters','zombie':'Zombie monsters','machine':'Machine monsters','jar':'Jars and pots','hole':'Hole Traps','book':'Book cards','sword':'Sword cards','shield':'Shield cards','cyber':'Cyber cards','chaos':'Chaos cards','archfiend':'Archfiend cards','insect':'Insect monsters','aqua':'Aqua monsters','FIRE':'FIRE monsters','WATER':'WATER monsters','EARTH':'EARTH monsters','WIND':'WIND monsters','LIGHT':'LIGHT monsters','DARK':'DARK monsters','toon':'Toon monsters','amazoness':'Amazoness monsters','negation':'Negation cards','destruction':'Destruction cards','graveyard':'Graveyard cards','bounce':'Hand return cards','control':'Monster control cards','banish':'Banish cards','discard':'Discard cards','summon':'Summoning cards','normal_spell':'Normal Spells','ritual':'Ritual Monsters and Ritual Spells','normal':'Normal Monsters','effect':'Effect Monsters','flip':'Flip Effect Monsters','continuous':'Continuous Spells and Traps','quick_counter':'Quick-Play Spells and Counter Traps'}


# Every monster Type/Attribute represented in the card database can be rolled,
# except Divine-Beast: it is retired because DIVINE already covers the same Gods.
MONSTER_TYPES=('Aqua','Beast','Beast-Warrior','Dinosaur','Dragon','Fairy','Fiend','Fish','Insect','Machine','Plant','Pyro','Reptile','Rock','Sea Serpent','Spellcaster','Thunder','Warrior','Winged Beast','Zombie')
ATTRIBUTES=('LIGHT','DARK','EARTH','WIND','WATER','FIRE','DIVINE')
LABELS.update({key:key+' monsters' for key in MONSTER_TYPES+ATTRIBUTES})
# Type/Attribute categories also accept any card whose text names that Type or
# Attribute (longest name wins, so "Winged Beast" never counts as "Beast").
_MENTION_PATTERN=re.compile(r'(?<![A-Za-z-])('+'|'.join(re.escape(n) for n in sorted(MONSTER_TYPES+ATTRIBUTES,key=len,reverse=True))+r')(?![A-Za-z])')
@functools.lru_cache(maxsize=4096)
def mentioned(text):return frozenset(match.group(1) for match in _MENTION_PATTERN.finditer(text or ''))
# DIVINE is deliberately scarce and carries two iconic supporting Spell Cards.
DIVINE_SUPPORT={'Solemn Judgment','Swords of Revealing Light'}
DIVINE_WEIGHT=0.12
FIELD_SUPPORT={'Terraforming','An Owl of Luck','Magic Reflector','Maiden of the Aqua','Forgotten Temple of the Deep','Amphibious Bugroth MK-3','Cannonball Spear Shellfish','Deepsea Warrior',"Gravekeeper's Assailant", "Gravekeeper's Chief",'Levia-Dragon - Daedalus','Mermaid Knight','Royal Tribute','The Legendary Fisherman','Tornado Wall','Torpedo Fish','Ocean Dragon Lord - Neo-Daedalus','A Cat of Ill Omen','Rite of Spirit'}
LABELS['field']='Field Spells and Support'
LABELS['direct']='Direct Attacks'
DIRECT_ATTACKS={"Alligator's Sword Dragon",'Amphibious Bugroth MK-3','Black Tyranno','Blue-Eyes Toon Dragon','Checkmate','Dark Scorpion Combination','Decayed Commander','Delta Attacker','Drillago','Gear Golem the Moving Fortress','Jinzo #7','Jowls of Dark Demise','Kiryu','Leghul','Manga Ryu-Ran','Mucus Yolk','Mystic Lamp','Nightmare Horse','Ooguchi','Opti-Camouflage Armor',"Queen's Double",'Rainbow Flower','Reaper on the Nightmare','Rocket Jumper',"Sebek's Blessing",'Secret Pass to the Treasures','Servant of Catabolism','Shooting Star Bow - Ceal','Spirit Reaper','Toon Cannon Soldier','Toon Dark Magician Girl','Toon Gemini Elf','Toon Goblin Attack Force','Toon Masked Sorcerer','Toon Mermaid','Toon Summoned Skull','Overpowering Eye','Silent Swordsman LV5','Ancient Dragon','Shadowslayer','Raging Flame Sprite'}

# Retire arbitrary word buckets; old saves keep their pack and gain a useful theme.
RETIRED_THEMES={'sword':'equip','shield':'stall','book':'Spellcaster',
 'magician':'Spellcaster','goblin':'gambling','cyber':'Machine','chaos':'banish',
 'quickplay':'quick_counter','counter':'quick_counter','search':'summon','ojama':'normal',
 'battle':'Warrior','Divine-Beast':'DIVINE'}
RETIRED_THEMES.update({key.lower():key for key in MONSTER_TYPES if key.lower() in LABELS and key.lower()!=key})
for _key in RETIRED_THEMES:LABELS.pop(_key,None)
# Divine-Beast keeps a label for race coverage, but is never offered as a reward.
LABELS['Divine-Beast']='Divine-Beast monsters'
NON_REWARD_KEYS=frozenset({'Divine-Beast'})

def normalize_reward(reward):
 result=dict(reward)
 if result.get('key') in RETIRED_THEMES:
  result['key']=RETIRED_THEMES[result['key']]
 if result.get('key') in LABELS:result['label']=LABELS[result['key']]
 return result

def normalize_run(run):
 run['bias']=RETIRED_THEMES.get(run.get('bias',''),run.get('bias',''))
 if run.get('shop_reward'):run['shop_reward']=normalize_reward(run['shop_reward'])
 if 'route_rewards' in run:run['route_rewards']={k:normalize_reward(v) for k,v in run['route_rewards'].items()}
 if run.get('tag_shop_rewards'):run['tag_shop_rewards']=[normalize_reward(r) for r in run['tag_shop_rewards']]

def tag_featured(cards,rewards,rng):
 """Three A offers, then two B offers; reserve scarce matches before overlaps."""
 pools=[[c for c in cards if matches(c,r['key'])] for r in rewards]
 slots=[pools[0]]*3+[pools[1]]*2
 order=sorted(range(5),key=lambda i:len(slots[i]))
 chosen=[None]*5;used=set()
 def choose(depth):
  if depth==5:return True
  i=order[depth];available=[c for c in slots[i] if c['id'] not in used]
  available.sort(key=lambda c:rng.random()**(1/card_rarity.weight(c['id'])),reverse=True)
  for c in available:
   chosen[i]=c;used.add(c['id'])
   if choose(depth+1):return True
   used.remove(c['id'])
  return False
 if choose(0):return chosen
 # A locked/narrow collection may have fewer distinct matches than slots.
 # Repeat matching offers before falling back to unrelated unlocked stock.
 chosen=[]
 for pool in slots:
  pool=pool or cards
  unused=[c for c in pool if c['id'] not in {x['id'] for x in chosen}]
  options=unused or pool
  chosen.append(rng.choices(options,weights=[card_rarity.weight(c['id']) for c in options],k=1)[0])
 return chosen


def reward_keys():return [key for key in sorted(LABELS) if key not in NON_REWARD_KEYS]
def reward_weights(keys):return [DIVINE_WEIGHT if key=='DIVINE' else 1.0 for key in keys]


def reward_for(index,rng=None):
 # One shared list for every opponent; the opponent only fixes the guaranteed pack.
 rng=rng or random.Random(index)
 keys=reward_keys();key=rng.choices(keys,weights=reward_weights(keys),k=1)[0]
 pack=CHARACTERS[index]['pack']
 if PACK_BY_ID[pack].get('draft_only'):pack=PACK_BY_ID[pack].get('reward_pack','EN-MFC')
 return dict(key=key,label=LABELS.get(key,key+' monsters'),pack=pack)


# Effect pools are curated from card text, not printed rarity or loose keywords.
# Include the latest expansion while keeping unrelated filler out of each theme.
DRAW -= {'White Magical Hat','Don Zaloog','Sasuke Samurai',"Robbin' Goblin","Robbin' Zombie","Gravekeeper's Vassal"}
DRAW |= {'Good Goblin Housekeeping','Dark Mimic LV1','Dark Mimic LV3','Lighten the Load','Necklace of Command','Spiral Spear Strike','Fuh-Rin-Ka-Zan'}
BURN -= {'Meteorain','Fairy Meteor Crush'}
BURN |= {'Mecha-Dog Marron','Abare Ushioni','Poison Fangs','D.D. Dynamite','Thestalos the Firestorm Monarch','Ultimate Baseball Kid','Inferno Fire Blast','Greed','Cemetary Bomb','Castle Gate','Goblin Thief',"Van'Dalgyon the Dark Dragon Lord"}
HEAL -= {'Cure Master','Fire Princess','Des Dendle','Mushroom Man #2'}
HEAL |= {'Spell Absorption','Draining Shield','Mystik Wok','Goblin Thief'}
SEARCH -= {'Slate Warrior','Frontline Base','Vampire Lady'}
SEARCH |= {'Green Gadget','Red Gadget','Yellow Gadget','Manju of the Ten Thousand Hands','Senju of the Thousand Hands','Sonic Bird','Thunder Dragon','Masked Dragon','Hyena','Rescue Cat','Summoner Monk'}
SUMMON -= {'Sangan','Witch of the Black Forest','Slate Warrior','Magical Merchant','Vampire Lady'}
SUMMON |= {'Hyena','Rescue Cat','Masked Dragon','Summoner Monk','The Creator','The Creator Incarnate','Machine Duplication','Beast Soul Swap','Fulfillment of the Contract','Re-Fusion','Centrifugal Field','Fox Fire',"Black Dragon's Chick",'Level Up!','Two-Man Cell Battle','Kaibaman','Vampire Genesis','The Tricky','Tricky Spell 4',"Vampire's Curse",'Familiar Knight','Return from the Different Dimension','Watapon','Dark Mimic LV1','Ultimate Insect LV1','Ultimate Insect LV3','Ultimate Insect LV5','Horus the Black Flame Dragon LV4','Horus the Black Flame Dragon LV6','Mystic Swordsman LV4','Armed Dragon LV3','Armed Dragon LV5',"Van'Dalgyon the Dark Dragon Lord"}
PIERCE = {'Fairy Meteor Crush','Spear Dragon','Airknight Parshath','Mad Sword Beast','Dark Driceratops','Meteorain'}
NEGATION |= {'A-Team: Trap Disposal Unit','Horus the Black Flame Dragon LV8','Silent Swordsman LV7','Sorcerer of Dark Magic','Rare Metalmorph','Arcana Knight Joker','Element Doom','Element Soldier'}
FUSION_SUPPORT = {'Polymerization','Fusion Sage','Fusion Gate','Metamorphosis','De-Fusion','King of the Swamp','The Light - Hex-Sealed Fusion','The Dark - Hex-Sealed Fusion','The Earth - Hex-Sealed Fusion','Re-Fusion','Centrifugal Field'}
LABELS['fusion']='Fusion monsters and support'

def matches(card,key):
 if card.get('id')==190000050:return False
 key=RETIRED_THEMES.get(key,key)
 t=card['data']['type']
 if key in ATTRIBUTES:
  if key=='DIVINE' and card['name'] in DIVINE_SUPPORT:return True
  return (bool(t&1) and card['attribute']==key) or key in mentioned(card.get('desc'))
 if key=='normal':return bool(t&1 and t&16)
 if key=='effect':return bool(t&1 and t&32)
 if key=='flip':return bool(t&1 and t&0x200000)
 if key=='normal_spell':return bool(t&2) and not bool(t&(0x80|0x10000|0x20000|0x40000|0x80000))
 if key=='quick_counter':return bool((t&2 and t&0x10000) or (t&4 and t&0x100000))
 if key=='continuous':return bool(t&6 and t&0x20000)
 if key=='ritual':return bool(t&0x80 and t&3)
 if key=='toon':return bool(t&1 and t&0x400000) or card['name'] in TOON_SUPPORT
 if key=='amazoness':return 'amazoness' in card['name'].lower() or card['name'] in WARRIOR_SUPPORT
 if key=='negation':return bool(t&4 and t&0x100000) or card['name'] in NEGATION or card['name'] in ('Dark Balter the Terrible','Ryu Senshi')
 if key=='destruction':return card['name'] in DESTRUCTION or 'destroy' in (card.get('desc') or '').lower()
 if key=='graveyard':return 'graveyard' in (card.get('desc') or '').lower() or 'GY' in (card.get('desc') or '')
 if key=='bounce':d=(card.get('desc') or '').lower();return 'return' in d and 'hand' in d
 if key=='banish':d=(card.get('desc') or '').lower();return 'remove from play' in d or 'removed from play' in d or 'banish' in d or 'remove from the game' in d or 'removed from the game' in d
 if key=='discard':return 'discard' in (card.get('desc') or '').lower()
 if key=='control':
  if card['name'] in CONTROL_EXTRA:return True
  d=(card.get('desc') or '').lower()
  return 'control' in d and ('take control' in d or 'takes control' in d or 'gain control' in d or 'switch control' in d or 'switches control' in d or 'change control' in d or 'shifts to your opponent' in d or 'returns to the owner' in d or 'return control' in d)
 if key=='summon':return card['name'] in SUMMON
 if key=='lowlevel':return bool(t&1) and (card.get('level') or 0)<=2
 if key=='midlevel':return bool(t&1) and 3<=(card.get('level') or 0)<=4
 if key=='highlevel':return bool(t&1) and 5<=(card.get('level') or 0)<=6
 if key=='toplevel':return bool(t&1) and (card.get('level') or 0)>=7
 if key=='spirit':return (bool(t&1) and 'spirit' in (card.get('type') or '').lower()) or card['name'] in SPIRIT_SUPPORT
 if key=='union':return (bool(t&1) and 'union' in (card.get('type') or '').lower()) or card['name'] in UNION_SUPPORT
 if key=='fusion':return bool(t&0x40) or card['name'] in FUSION_SUPPORT
 if key=='equip':return bool(t&0x40000) or card['name'] in EQUIPTRAP
 if key=='direct':return card['name'] in DIRECT_ATTACKS
 if key=='field':return bool(t&2 and t&0x80000) or card['name'] in FIELD_SUPPORT
 if key=='normal_trap':return bool(t&4) and not bool(t&(0x20000|0x100000))
 if key=='draw':return card['name'] in DRAW
 if key=='burn':return card['name'] in BURN
 if key=='heal':return card['name'] in HEAL
 if key=='stall':return card['name'] in STALL
 if key=='pierce':return card['name'] in PIERCE or 'piercing' in (card.get('desc') or '').lower()
 if key=='sword':return key in card['name'].lower()
 if key=='archfiend':return 'archfiend' in card['name'].lower() or card['name'] in ARCHFIEND_SUPPORT
 if key=='harpie':return 'harpie' in card['name'].lower() or (bool(t&1) and card.get('race')=='Winged Beast')
 if key=='exodia':return card['name'] in EXODIA_SET or card['name'] in DRAW
 if key=='gravekeeper':return 'gravekeeper' in card['name'].lower() or card['name'] in GRAVE_SUPPORT
 if key=='guardian':return 'guardian' in card['name'].lower() or card['name'] in ('Shine Palace','Backup Soldier')
 if key=='goblin':return 'goblin' in card['name'].lower() or card['name'] in DICE
 if key=='magician':return 'magician' in card['name'].lower() or card['name'] in MAGICIAN_SUPPORT
 if key=='jar':return 'jar' in card['name'].lower() or 'pot' in card['name'].lower() or card['name'] in FLIP_SUPPORT or card['name'] in DRAW or card['name'] in GREED
 if key=='hole':return 'hole' in card['name'].lower() or card['name'] in BATTLETRAP
 if key=='book':return 'book' in card['name'].lower() or card['name'] in BOOKCASTER
 if key=='shield':return 'shield' in card['name'].lower() or card['name'] in DEFENSE
 if key=='cyber':return 'cyber' in card['name'].lower() or card['name'] in MACHINE_SUPPORT
 if key=='chaos':return 'chaos' in card['name'].lower() or card['name'] in CHAOS_SUPPORT
 if key=='darkmagician':return 'dark magician' in card['name'].lower() or card['name'] in DM_SUPPORT
 if key=='darkscorpion':return 'dark scorpion' in card['name'].lower() or card['name']=='Don Zaloog' or card['name'] in WARRIOR_SUPPORT
 if card['name'] in RACE_SUPPORT.get(key,()):return True
 if card['name'] in ATTR_SUPPORT.get(key,()):return True
 if key=='gambling':
  d=(card.get('desc') or '').lower()
  return 'six-sided die' in d or 'toss a coin' in d or 'coin toss' in d or 'roll a die' in d or 'die roll' in d or 'heads or tails' in d
 return (bool(t&1) and card.get('race','').casefold()==key.casefold()) or key in mentioned(card.get('desc'))

def artifact_matches(key,artifact):
 info=ART_INFO[artifact]
 if info['filter']==key or key in info['filter'].split('/'):return True
 tags={'normal':'normal','effect':'offense','flip':'defense','normal_spell':'draw','quick_counter':'defense','continuous':'healing','ritual':'draw'}
 return info['tag']==tags.get(key,'')

def description(index,reward=None):
 reward=reward or reward_for(index)
 return reward['label']+' appear more often\nGuaranteed pack: '+PACK_BY_ID[reward['pack']]['name']


def _tied_pack(deck,rng=None):
 from collections import Counter
 from content import PACKS
 frequency=Counter(deck);total=max(1,sum(frequency.values()))
 eligible=[p for p in PACKS if not p.get('draft_only') and not p.get('shop_chance')]
 # Reward both deck coverage and concentration. Broad all-card packs remain
 # possible without always winning merely because they contain more cards.
 weights=[]
 for p in eligible:
  ids=set(p['common']+p['rare'])
  hits=sum(frequency[cid] for cid in ids)
  weights.append((hits/total)**2 * (100/(100+len(ids)))**0.75)
 if not any(weights):return 'EN-LOB'
 if rng is None:return eligible[max(range(len(weights)),key=weights.__getitem__)]['id']
 return rng.choices(eligible,weights=weights,k=1)[0]['id']


def reward_from_deck(deck,byid,rng,options=None):
 # Choose a real concentration in the opponent list, including spells and effects.
 from collections import Counter
 from content import PACKS
 cards=[byid[cid] for cid in deck if cid in byid]
 keys=[k for k in LABELS if k not in NON_REWARD_KEYS]+['LIGHT','DARK','EARTH','WIND','WATER','FIRE']+sorted({c['race'] for c in cards if c['data']['type']&1})
 counts={key:sum(matches(c,key) for c in cards) for key in keys}
 # Generic effect/normal tags should not crowd out specific attributes or mechanics.
 if options:
  # Intentional: the theme reward stays fully random within the
  # opponent's theme list, even when the picked theme is absent
  # from the actual deck. Do not 'fix' this into a best-match pick.
  key=rng.choice(list(dict.fromkeys(RETIRED_THEMES.get(k,k) for k in options)))
  return dict(key=key,label=LABELS.get(key,key+' monsters'),pack=_tied_pack(deck,rng))
 ranked=sorted((k for k in keys if counts[k]>=2),key=lambda k:counts[k]*(.45 if k in ('effect','normal') else 1),reverse=True)[:4]
 key=rng.choice(ranked) if ranked else 'normal'
 tied=_tied_pack(deck,rng)
 return dict(key=key,label=LABELS.get(key,key+' monsters'),pack=tied)



# The five Forbidden One pieces; the shop always stocks one when Exodia is offered.
EXODIA_PIECES=frozenset({'Exodia the Forbidden One','Right Arm of the Forbidden One','Left Arm of the Forbidden One','Right Leg of the Forbidden One','Left Leg of the Forbidden One'})


def pack_offered(pack,rng):
 """Packs with a shop_chance, such as Stinkers, only join some shops' pools."""
 return rng.random()<pack.get('shop_chance',1)


def random_reward(rng,profile=None):
 """Draw one reward without taking an opponent or deck as input."""
 from content import PACKS
 import unlocks
 keys=reward_keys();key=rng.choices(keys,weights=reward_weights(keys),k=1)[0]
 packs=[p['id'] for p in PACKS if not p.get('draft_only') and pack_offered(p,rng) and unlocks.available('pack',p['id'],profile)]
 return dict(key=key,label=LABELS.get(key,key+' monsters'),pack=rng.choice(packs or ['EN-LOB']))


def route_rewards(routes,rng,profile=None):
 """Rewards for one encounter screen: no repeated theme and no repeated pack."""
 from content import PACKS
 import unlocks
 order=list(routes);count=len(order)
 keys=reward_keys();weights=reward_weights(keys);chosen_keys=[]
 for _ in range(count):
  if not keys:keys=reward_keys();weights=reward_weights(keys)
  pick=rng.choices(range(len(keys)),weights=weights,k=1)[0]
  chosen_keys.append(keys.pop(pick));weights.pop(pick)
 packs=[p['id'] for p in PACKS if not p.get('draft_only') and pack_offered(p,rng) and unlocks.available('pack',p['id'],profile)]
 if len(packs)>=count:chosen_packs=rng.sample(packs,count)
 else:
  chosen_packs=rng.sample(packs,len(packs));chosen_packs+=[rng.choice(packs or ['EN-LOB']) for _ in range(count-len(chosen_packs))]
 return {str(route):dict(key=key,label=LABELS.get(key,key+' monsters'),pack=pack) for route,key,pack in zip(order,chosen_keys,chosen_packs)}


def guarantee_exodia(offers,pool,rng,slots=None):
 """Force one Forbidden One piece into the featured stock when Exodia is offered."""
 pieces=[c for c in pool if c['name'] in EXODIA_PIECES]
 if not pieces:return offers
 slots=list(range(len(offers))) if slots is None else [i for i in slots if i<len(offers)]
 if any(offers[i]['name'] in EXODIA_PIECES for i in slots):return offers
 available=[c for c in pieces if c['id'] not in {offer['id'] for offer in offers}] or pieces
 pick=rng.choice(available)
 if slots:offers[slots[0]]=pick
 return offers
