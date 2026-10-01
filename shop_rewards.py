"""Opponent rewards specify card properties, not just monster races."""
from content import CHARACTERS,PACK_BY_ID,ART_INFO

REWARDS={
 0:('normal_spell','Normal Spells'),1:('LIGHT','LIGHT monsters'),2:('normal','Normal Monsters'),
 3:('WIND','WIND monsters'),4:('Machine','Machine monsters'),5:('ritual','Ritual Monsters and Ritual Spells'),
 6:('DARK','DARK monsters'),7:('ritual','Ritual Monsters and Ritual Spells'),8:('normal','Normal Monsters'),
 9:('Zombie','Zombie monsters'),10:('effect','Effect Monsters'),11:('continuous','Continuous Spells and Traps'),
 12:('normal','Normal Monsters'),13:('flip','Flip Effect Monsters'),14:('EARTH','EARTH monsters'),
 15:('quick_counter','Quick-Play Spells and Counter Traps'),16:('LIGHT','LIGHT monsters'),
 17:('normal_spell','Normal Spells'),18:('WATER','WATER monsters'),22:('LIGHT','LIGHT monsters'),
 27:('quick_counter','Quick-Play Spells and Counter Traps')}

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
THEME_OPTIONS={
 0:['DARK', 'Spellcaster', 'darkmagician', 'normal_spell', 'summon', 'control'],
 1:['LIGHT', 'Dragon', 'Aqua', 'destruction', 'normal', 'banish'],
 2:['Warrior', 'FIRE', 'Pyro', 'Rock', 'equip', 'graveyard'],
 3:['Winged Beast', 'WIND', 'amazoness', 'harpie', 'equip', 'bounce'],
 4:['cyber', 'Machine', 'equip', 'book', 'jar', 'discard'],
 5:['stall', 'shield', 'effect', 'Beast', 'negation', 'graveyard'],
 6:['DARK', 'Fiend', 'destruction', 'continuous', 'normal', 'graveyard'],
 7:['toon', 'guardian', 'WIND', 'ritual', 'WATER', 'control'],
 8:['Dinosaur', 'EARTH', 'Rock', 'Pyro', 'sword', 'graveyard'],
 9:['Zombie', 'hole', 'effect', 'draw', 'normal_trap', 'graveyard'],
 10:['Insect', 'EARTH', 'book', 'WIND', 'Aqua', 'control'],
 11:['Fiend', 'burn', 'Pyro', 'negation', 'FIRE', 'discard'],
 12:['Warrior', 'sword', 'shield', 'stall', 'Zombie', 'bounce'],
 13:['Rock', 'Fiend', 'Spellcaster', 'effect', 'Dragon', 'graveyard'],
 14:['Fairy', 'LIGHT', 'flip', 'heal', 'stall', 'graveyard'],
 15:['Rock', 'normal_trap', 'flip', 'continuous', 'Insect', 'bounce'],
 16:['Machine', 'cyber', 'negation', 'hole', 'draw', 'control'],
 17:['Spellcaster', 'darkmagician', 'normal_spell', 'magician', 'stall', 'banish'],
 18:['Aqua', 'WATER', 'Fish', 'Beast', 'stall', 'bounce'],
 22:['Fairy', 'heal', 'burn', 'Pyro', 'stall', 'bounce'],
 27:['summon', 'jar', 'Pyro', 'ritual', 'Winged Beast', 'banish'],
}
LABELS={'lowlevel':'Level 2 and lower monsters','midlevel':'Level 3-4 monsters','highlevel':'Level 5-6 monsters','toplevel':'Level 7+ monsters','spirit':'Spirit monsters','union':'Union monsters','fusion':'Fusion monsters and Fusion Spells','equip':'Equip Spells and equip Traps','gambling':'Gambling cards','field':'Field Spells','counter':'Counter Traps','quickplay':'Quick-Play Spells','normal_trap':'Normal Traps','draw':'Card draw','burn':'Burn damage','heal':'Life point recovery','stall':'Defensive stalls','pierce':'Piercing damage','search':'Monster searchers','harpie':'Harpie cards','gravekeeper':'Gravekeeper cards','darkmagician':'Dark Magician cards','exodia':'Exodia pieces','ojama':'Ojama cards','darkscorpion':'Dark Scorpion cards','guardian':'Guardian monsters','goblin':'Goblin cards','magician':'Magician cards','dragon':'Dragon monsters','warrior':'Warrior monsters','zombie':'Zombie monsters','machine':'Machine monsters','jar':'Jars and pots','hole':'Hole Traps','book':'Book cards','sword':'Sword cards','shield':'Shield cards','cyber':'Cyber cards','chaos':'Chaos cards','archfiend':'Archfiend cards','insect':'Insect monsters','aqua':'Aqua monsters','FIRE':'FIRE monsters','WATER':'WATER monsters','EARTH':'EARTH monsters','WIND':'WIND monsters','LIGHT':'LIGHT monsters','DARK':'DARK monsters','toon':'Toon monsters','amazoness':'Amazoness monsters','negation':'Negation cards','destruction':'Destruction cards','graveyard':'Graveyard cards','bounce':'Hand return cards','control':'Monster control cards','banish':'Banish cards','discard':'Discard cards','summon':'Summoning cards','normal_spell':'Normal Spells','ritual':'Ritual Monsters and Ritual Spells','normal':'Normal Monsters','effect':'Effect Monsters','flip':'Flip Effect Monsters','continuous':'Continuous Spells and Traps','quick_counter':'Quick-Play Spells and Counter Traps'}


# Retire arbitrary word buckets; old saves keep their pack and gain a useful theme.
RETIRED_THEMES={'sword':'equip','shield':'stall','book':'Spellcaster',
 'magician':'Spellcaster','goblin':'gambling','cyber':'Machine','chaos':'banish'}
for _key in RETIRED_THEMES:LABELS.pop(_key,None)
THEME_OPTIONS={i:list(dict.fromkeys(RETIRED_THEMES.get(k,k) for k in keys)) for i,keys in THEME_OPTIONS.items()}

def normalize_reward(reward):
 result=dict(reward)
 if result.get('key') in RETIRED_THEMES:
  result['key']=RETIRED_THEMES[result['key']]
  result['label']=LABELS.get(result['key'],result['key']+' monsters')
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
  rng.shuffle(available)
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
  chosen.append(rng.choice(unused or pool))
 return chosen


def reward_for(index,rng=None):
 key,label=REWARDS.get(index,(CHARACTERS[index]['race'],CHARACTERS[index]['race']+' monsters'))
 if rng:
  key=rng.choice(list(dict.fromkeys(THEME_OPTIONS.get(index,[key])+['LIGHT','DARK','EARTH','WIND','WATER','FIRE'])));label=LABELS.get(key,key+' monsters')
 pack=CHARACTERS[index]['pack']
 if PACK_BY_ID[pack].get('draft_only'):pack=PACK_BY_ID[pack].get('reward_pack','EN-MFC')
 return dict(key=key,label=label,pack=pack)

def matches(card,key):
 key=RETIRED_THEMES.get(key,key)
 t=card['data']['type']
 if key in ('LIGHT','DARK','EARTH','WIND','WATER','FIRE'):return bool(t&1) and card['attribute']==key
 if key=='normal':return bool(t&1 and t&16)
 if key=='effect':return bool(t&1 and t&32)
 if key=='flip':return bool(t&1 and t&0x200000)
 if key=='normal_spell':return bool(t&2) and not bool(t&(0x80|0x10000|0x20000|0x40000|0x80000))
 if key=='quick_counter':return bool((t&2 and t&0x10000) or (t&4 and t&0x100000))
 if key=='continuous':return bool(t&6 and t&0x20000)
 if key=='ritual':return bool(t&0x80 and t&3)
 if key=='toon':return bool(t&1 and t&0x400000) or card['name'] in TOON_SUPPORT
 if key=='amazoness':return 'amazoness' in card['name'].lower() or card['name'] in WARRIOR_SUPPORT
 if key=='negation':return bool((t&4 and t&0x100000) or ((t&2 or t&4) and card['name'] in NEGATION)) or card['name'] in ('Dark Balter the Terrible','Ryu Senshi')
 if key=='destruction':return card['name'] in DESTRUCTION or 'destroy' in (card.get('desc') or '').lower()
 if key=='graveyard':return 'graveyard' in (card.get('desc') or '').lower()
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
 if key=='fusion':return bool(t&0x40) or card['name'] in ('Polymerization','Fusion Sage')
 if key=='equip':return bool(t&0x40000) or card['name'] in EQUIPTRAP
 if key=='field':return bool(t&0x80000) or card['name']=='Terraforming'
 if key=='counter':return bool(t&4 and t&0x100000) or card['name'] in ('Solemn Wishes','Cure Mermaid')
 if key=='quickplay':return bool(t&2 and t&0x10000)
 if key=='normal_trap':return bool(t&4) and not bool(t&(0x20000|0x100000))
 if key=='draw':return card['name'] in DRAW
 if key=='burn':return card['name'] in BURN
 if key=='heal':return card['name'] in HEAL
 if key=='stall':return card['name'] in STALL
 if key=='pierce':return card['name'] in PIERCE or 'piercing' in (card.get('desc') or '').lower()
 if key=='search':return card['name'] in SEARCH
 if key=='sword':return key in card['name'].lower()
 if key=='archfiend':return 'archfiend' in card['name'].lower() or card['name'] in ARCHFIEND_SUPPORT
 if key=='harpie':return 'harpie' in card['name'].lower() or (bool(t&1) and card.get('race')=='Winged Beast')
 if key=='ojama':return 'ojama' in card['name'].lower() or card['name'] in OJAMA_SUPPORT
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
 return bool(t&1) and card.get('race','').casefold()==key.casefold()

def artifact_matches(key,artifact):
 info=ART_INFO[artifact]
 if info['filter']==key:return True
 tags={'normal':'normal','effect':'offense','flip':'defense','normal_spell':'draw','quick_counter':'defense','continuous':'healing','ritual':'draw'}
 return info['tag']==tags.get(key,'')

def description(index,reward=None):
 reward=reward or reward_for(index)
 return reward['label']+' appear more often\nGuaranteed pack: '+PACK_BY_ID[reward['pack']]['name']


def _tied_pack(deck,rng=None):
 from collections import Counter
 from content import PACKS
 frequency=Counter(deck);total=max(1,sum(frequency.values()))
 eligible=[p for p in PACKS if not p.get('draft_only')]
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
 keys=list(LABELS)+['LIGHT','DARK','EARTH','WIND','WATER','FIRE']+sorted({c['race'] for c in cards if c['data']['type']&1})
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

