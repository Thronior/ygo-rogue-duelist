from pathlib import Path
import json,shutil
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import campaign as g
root=Path('data');backup=Path('temp/fixed-decks-before-20260922');backup.mkdir(exist_ok=True)
for p in (root/'decks').glob('*.ydk'):shutil.copy2(p,backup/p.name)
# Each line is one exact tier. Quantities are literal, without filler or upgrades.
raw={
13:[
'1 Exodia the Forbidden One;1 Right Arm of the Forbidden One;1 Left Arm of the Forbidden One;1 Right Leg of the Forbidden One;1 Left Leg of the Forbidden One;3 Giant Soldier of Stone;3 Aqua Madoor;3 Mystical Elf;3 Spirit of the Harp;3 Prevent Rat;3 Island Turtle;3 Humanoid Slime;3 Wall of Illusion;3 Labyrinth Wall;3 Millennium Shield;1 Swords of Revealing Light;2 Waboku;2 Jar of Greed',
'1 Exodia the Forbidden One;1 Right Arm of the Forbidden One;1 Left Arm of the Forbidden One;1 Right Leg of the Forbidden One;1 Left Leg of the Forbidden One;2 Emissary of the Afterlife;1 Sangan;2 Giant Soldier of Stone;2 Aqua Madoor;2 Magician of Faith;3 Nimble Momonga;1 Spirit Reaper;1 Pot of Greed;1 Graceful Charity;2 Upstart Goblin;2 Reload;1 Swords of Revealing Light;1 Messenger of Peace;1 Dark Factory of Mass Production;1 Monster Reborn;1 Different Dimension Capsule;3 Jar of Greed;2 Waboku;1 Gravity Bind;1 Backup Soldier;2 Solemn Wishes;1 Magic Jammer;1 Negate Attack',
'1 Exodia the Forbidden One;1 Right Arm of the Forbidden One;1 Left Arm of the Forbidden One;1 Right Leg of the Forbidden One;1 Left Leg of the Forbidden One;3 Emissary of the Afterlife;1 Sangan;3 Mystic Tomato;2 Spirit Reaper;1 Magician of Faith;1 Pot of Greed;1 Graceful Charity;3 Upstart Goblin;2 Reload;1 Card Destruction;1 Swords of Revealing Light;2 Messenger of Peace;2 Level Limit - Area B;1 Dark Factory of Mass Production;3 Jar of Greed;2 Reckless Greed;2 Gravity Bind;2 Waboku;1 Backup Soldier;1 Magic Jammer'],
11:[
'3 Bowganian;3 Princess of Tsurugi;3 Poison Mummy;2 Des Koala;2 Spirit Reaper;2 Cannon Soldier;3 Giant Soldier of Stone;3 Ookazi;2 Hinotama;2 Sparks;2 Tremendous Fire;1 Swords of Revealing Light;2 Messenger of Peace;2 Just Desserts;2 Secret Barrel;2 Waboku;2 Jar of Greed;2 Gravity Bind',
'3 Stealth Bird;3 Solar Flare Dragon;3 Des Koala;2 Bowganian;2 Spirit Reaper;1 Lava Golem;2 Wave-Motion Cannon;2 Messenger of Peace;2 Level Limit - Area B;1 Swords of Revealing Light;2 Poison of the Old Man;1 Ookazi;1 Pot of Greed;2 Gravity Bind;3 Just Desserts;3 Secret Barrel;2 Ojama Trio;2 Waboku;1 Nightmare Wheel;2 Jar of Greed',
'3 Stealth Bird;3 Solar Flare Dragon;2 Des Koala;2 Spirit Reaper;2 Lava Golem;3 Wave-Motion Cannon;2 Messenger of Peace;2 Level Limit - Area B;1 Swords of Revealing Light;2 Poison of the Old Man;1 Pot of Greed;1 Graceful Charity;1 Mystical Space Typhoon;2 Gravity Bind;3 Just Desserts;3 Secret Barrel;3 Ojama Trio;2 Nightmare Wheel;1 Ceasefire;1 Waboku'],
22:[
"3 Cure Mermaid;3 Dancing Fairy;3 Nimble Momonga;3 Kiseitai;2 The Forgiving Maiden;2 Giant Soldier of Stone;2 Aqua Madoor;3 Dian Keto the Cure Master;3 Goblin's Secret Remedy;2 Soul of the Pure;1 Swords of Revealing Light;3 Solemn Wishes;2 Gift of The Mystical Elf;3 Numinous Healer;2 Enchanted Javelin;3 Waboku",
'3 Fire Princess;2 Cure Mermaid;3 Nimble Momonga;2 Darklord Marie;2 Kiseitai;2 White Magician Pikeru;1 Guardian Angel Joan;1 Shining Angel;3 Dian Keto the Cure Master;2 Poison of the Old Man;2 Messenger of Peace;1 Swords of Revealing Light;1 Pot of Greed;1 Graceful Charity;1 Premature Burial;1 Monster Reborn;3 Solemn Wishes;2 Gift of The Mystical Elf;2 Numinous Healer;2 Enchanted Javelin;2 Waboku;1 Jar of Greed',
'3 Fire Princess;3 Nimble Momonga;3 Darklord Marie;2 White Magician Pikeru;2 Guardian Angel Joan;3 Shining Angel;1 The Agent of Force - Mars;3 Poison of the Old Man;2 Messenger of Peace;2 The Sanctuary in the Sky;1 Cestus of Dagla;1 Pot of Greed;1 Graceful Charity;1 Premature Burial;1 Monster Reborn;3 Solemn Wishes;2 Numinous Healer;2 Gift of The Mystical Elf;2 Waboku;1 Magic Drain;1 Jar of Greed'],
14:[
'3 Mystical Elf;3 Spirit of the Harp;3 Dunames Dark Witch;3 Shining Angel;2 Hysteric Fairy;2 Key Mace #2;2 The Forgiving Maiden;2 Petit Angel;2 Happy Lover;1 Airknight Parshath;1 Guardian Angel Joan;2 The Sanctuary in the Sky;2 Cestus of Dagla;2 Silver Bow and Arrow;1 Swords of Revealing Light;1 Monster Reborn;2 Waboku;2 Solemn Wishes;2 Gift of The Mystical Elf;2 Trap Hole',
'3 Shining Angel;2 Airknight Parshath;2 Mudora;2 Kelbek;2 Zolga;2 Hysteric Fairy;1 Guardian Angel Joan;2 The Agent of Force - Mars;1 The Agent of Wisdom - Mercury;1 Asura Priest;3 The Sanctuary in the Sky;2 Cestus of Dagla;1 Pot of Greed;1 Graceful Charity;1 Premature Burial;1 Monster Reborn;1 Swords of Revealing Light;2 Waboku;2 Solemn Wishes;1 Magic Drain;2 Dust Tornado;1 Call of the Haunted;2 Trap Hole;2 Enchanted Javelin',
'3 Shining Angel;3 Airknight Parshath;2 Mudora;2 Kelbek;2 Zolga;2 The Agent of Force - Mars;2 The Agent of Judgment - Saturn;1 The Agent of Wisdom - Mercury;1 Guardian Angel Joan;1 Asura Priest;3 The Sanctuary in the Sky;3 Cestus of Dagla;1 Pot of Greed;1 Graceful Charity;1 Premature Burial;1 Monster Reborn;1 Nobleman of Crossout;1 Mystical Space Typhoon;2 Waboku;2 Solemn Wishes;2 Dust Tornado;1 Call of the Haunted;1 Magic Drain;1 Mirror Force'],
20:[
'3 Inaba White Rabbit;3 Fushi No Tori;3 Maharaghi;3 Otohime;3 Susa Soldier;2 Asura Priest;1 Great Long Nose;1 Yamata Dragon;3 Spring of Rebirth;2 Spiritual Energy Settle Machine;2 Creature Swap;2 Book of Moon;1 Swords of Revealing Light;2 Ookazi;3 Waboku;2 Gravity Bind;2 Trap Hole;2 Jar of Greed',
'3 Asura Priest;3 Tsukuyomi;2 Inaba White Rabbit;2 Maharaghi;2 Otohime;2 Susa Soldier;1 Hino-Kagu-Tsuchi;1 Yamata Dragon;1 Great Long Nose;3 Spring of Rebirth;2 Spiritual Energy Settle Machine;2 Creature Swap;2 Book of Moon;1 Swords of Revealing Light;1 Pot of Greed;1 Graceful Charity;1 Nobleman of Crossout;1 Mystical Space Typhoon;2 Waboku;2 Gravity Bind;2 Sakuretsu Armor;1 Call of the Haunted;2 Jar of Greed',
'3 Asura Priest;3 Tsukuyomi;2 Inaba White Rabbit;2 Maharaghi;1 Otohime;2 Susa Soldier;2 Hino-Kagu-Tsuchi;2 Yamata Dragon;1 Great Long Nose;2 Creature Swap;3 Book of Moon;2 Spring of Rebirth;1 Spiritual Energy Settle Machine;1 Pot of Greed;1 Graceful Charity;1 Swords of Revealing Light;1 Nobleman of Crossout;1 Mystical Space Typhoon;1 Snatch Steal;2 Waboku;2 Sakuretsu Armor;1 Call of the Haunted;1 Torrential Tribute;2 Dust Tornado'],
1:[
"3 Blue-Eyes White Dragon;3 Lord of D.;3 Koumori Dragon;3 The Dragon Dwelling in the Cave;2 Luster Dragon #2;2 Hyozanryu;2 Spirit Ryu;1 Kaiser Sea Horse;1 Paladin of White Dragon;3 The Flute of Summoning Dragon;2 Mountain;1 White Dragon Ritual;1 Burst Stream of Destruction;2 Dragon Treasure;1 Ookazi;1 Swords of Revealing Light;3 Dragon's Rage;2 Burst Breath;2 Trap Hole;2 Jar of Greed",
"3 Blue-Eyes White Dragon;3 Kaiser Sea Horse;2 Lord of D.;2 Paladin of White Dragon;2 Manju of the Ten Thousand Hands;3 Spear Dragon;2 Luster Dragon;1 Spirit Ryu;1 Twin-Headed Behemoth;2 The Flute of Summoning Dragon;2 White Dragon Ritual;2 Burst Stream of Destruction;2 Stamping Destruction;1 Dragon Treasure;1 Pot of Greed;1 Graceful Charity;1 Monster Reborn;1 Premature Burial;1 Nobleman of Crossout;1 Mystical Space Typhoon;2 Dragon's Rage;1 Burst Breath;1 Call of the Haunted;1 Dust Tornado;1 Trap Hole",
"3 Blue-Eyes White Dragon;3 Kaiser Sea Horse;2 Paladin of White Dragon;3 Manju of the Ten Thousand Hands;2 Lord of D.;3 Spear Dragon;3 Luster Dragon;1 Twin-Headed Behemoth;2 White Dragon Ritual;2 The Flute of Summoning Dragon;2 Burst Stream of Destruction;2 Stamping Destruction;1 Pot of Greed;1 Graceful Charity;1 Monster Reborn;1 Premature Burial;1 Snatch Steal;1 Nobleman of Crossout;2 Dragon's Rage;1 Call of the Haunted;1 Torrential Tribute;1 Dust Tornado;1 Sakuretsu Armor"],
0:[
'3 Dark Magician;1 Dark Magician Girl;2 Skilled Dark Magician;3 Neo the Magic Swordsman;3 Mystical Elf;2 The Stern Mystic;2 Magician of Faith;2 Old Vindictive Magician;2 Gemini Elf;2 Dark Magic Attack;2 Thousand Knives;2 Book of Secret Arts;2 Yami;1 Swords of Revealing Light;1 Monster Reborn;1 Pot of Greed;1 Magic Cylinder;2 Trap Hole;2 Waboku;2 Jar of Greed;2 Magic Jammer',
'3 Dark Magician;1 Dark Magician Girl;3 Skilled Dark Magician;2 Apprentice Magician;2 Magician of Faith;2 Old Vindictive Magician;1 Breaker the Magical Warrior;1 Dark Magician of Chaos;2 Gemini Elf;3 Dark Magic Attack;1 Thousand Knives;1 Dedication through Light and Darkness;1 Diffusion Wave-Motion;1 Pot of Greed;1 Graceful Charity;1 Monster Reborn;1 Premature Burial;1 Swords of Revealing Light;1 Mystical Space Typhoon;1 Nobleman of Crossout;1 Magic Cylinder;1 Call of the Haunted;2 Pitch-Black Power Stone;2 Sakuretsu Armor;1 Dust Tornado;2 Waboku;1 Jar of Greed',
'3 Dark Magician;1 Dark Magician Girl;3 Skilled Dark Magician;3 Apprentice Magician;2 Magician of Faith;2 Old Vindictive Magician;1 Breaker the Magical Warrior;1 Dark Magician of Chaos;2 Kycoo the Ghost Destroyer;3 Dark Magic Attack;1 Thousand Knives;2 Dedication through Light and Darkness;1 Diffusion Wave-Motion;1 Pot of Greed;1 Graceful Charity;1 Monster Reborn;1 Premature Burial;1 Mystical Space Typhoon;1 Nobleman of Crossout;1 Magic Cylinder;1 Call of the Haunted;2 Pitch-Black Power Stone;2 Sakuretsu Armor;1 Torrential Tribute;1 Waboku;1 Dust Tornado']}
byname={c['name'].casefold():c for c in g.CARDS};parsed={}
for index,tiers in raw.items():
 parsed[index]=[]
 for tier,line in enumerate(tiers,1):
  cards=[]
  for pair in line.split(';'):
   n,name=pair.split(' ',1);assert name.casefold() in byname,name;cards += [byname[name.casefold()]['id']]*int(n)
  assert len(cards)==40,(index,tier,len(cards));parsed[index].append(cards)
index=json.loads((root/'decks/index.json').read_text());old=json.loads((root/'opponent-tiers.json').read_text())['opponents'];manifest={}
for i in sorted(set(map(int,old))|set(parsed)):
 slug=g.CHARACTERS[i]['name'].lower().replace(' ','-');manifest[str(i)]=[]
 for t in range(1,4):
  fname=index.get(f'opponent-{i}-tier-{t}',f'{slug}-tier-{t}')
  if i in parsed:
   cards=parsed[i][t-1];(root/'decks'/f'{fname}.ydk').write_text('# Exact user-supplied fixed deck\n#main\n'+'\n'.join(map(str,cards))+'\n#extra\n!side\n',encoding='utf8')
  index[f'opponent-{i}-tier-{t}']=fname
  previous=old.get(str(i),[{}]*3)[t-1]
  manifest[str(i)].append(dict(character=i,name=g.CHARACTERS[i]['name'],tier=t,deck=fname,source='User supplied exact list' if i in parsed else previous.get('source','Existing character deck'),fixed=True))
(root/'decks/index.json').write_text(json.dumps(index,indent=2)+'\n',encoding='utf8')
(root/'fixed-opponents.json').write_text(json.dumps({'_guide':'Exactly three fixed YDK decks per opponent. Tier 1: duels 1-3; tier 2: duels 4-6; tier 3: duels 7-9. Edit the named files in data/decks. No runtime card additions, substitutions, or tutorial variants. Draw order alone is shuffled.','opponents':manifest},indent=2)+'\n',encoding='utf8')
print('Prepared',len(manifest)*3,'fixed decks;',sum(len(x) for x in parsed.values()),'exact supplied lists')

