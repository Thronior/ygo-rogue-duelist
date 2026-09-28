"""One-time authored NPC deck revision. Original lists are retained in a D: backup."""
from pathlib import Path
import sys,json,re,shutil
from collections import Counter
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,content
# Theme cards attributed in the original anime and its NPC recipes; original WCT
# lists remain each deck's base. Do not use tournament/player deck lists here.
THEMES={
0:['Thousand Knives','Dark Magic Attack','Diffusion Wave-Motion','Spellbinding Circle','Lightforce Sword','Magical Hats','Kuriboh','Big Shield Gardna','Dark Magician Girl'],
1:['Dragon Treasure','The Flute of Summoning Dragon','Lord of D.','Stamping Destruction','Burst Stream of Destruction','Enemy Controller','Interdimensional Matter Transporter','Different Dimension Dragon','Spear Dragon'],
2:['Graceful Dice','Skull Dice','Salamandra','Shield & Sword','Legendary Sword','Metalmorph','Time Wizard','Little-Winguard','Rocket Warrior','Baby Dragon'],
3:['Cyber Shield','Follow Wind','Shadow of Eyes','Mirror Wall','Elegant Egotist','Harpie Lady','Harpie Lady Sisters','Birdface'],
4:['7 Completed','Machine Conversion Factory','Metalmorph','Limiter Removal','Gamble','Time Machine','Blast Sphere','Mechanicalchaser','Barrel Dragon'],
5:['Mask of Weakness','Mask of the Accursed','Mask of Dispel','Mask of Brutality','The Mask of Remnants','Curse of the Masked Beast','The Masked Beast','Melchid the Four-Face Beast','Grand Tiki Elder'],
6:['Dark Spirit of the Silent','The Dark Door',"Gravekeeper's Servant",'Spiritualism','Destiny Board','Dark Necrofear','Goblin Zombie','Dark Ruler Ha Des'],
7:['Toon World','Toon Table of Contents','Black Illusion Ritual','Relinquished','Mimicat','Dragon Capture Jar','Spellbinding Circle','Ryu-Ran','Toon Mermaid','Toon Summoned Skull'],
8:['Raise Body Heat','Dragon Treasure','Wasteland',"Sword of Dragon's Soul",'Two-Headed King Rex','Crawling Dragon #2','Gilasaurus','Dark Driceratops','Hyper Hammerhead'],
9:['Violet Crystal','Wasteland','Call of the Haunted','Stop Defense','Pumpking the King of Ghosts','Dragon Zombie','Armored Zombie','Castle of Dark Illusions','Clown Zombie'],
10:['Insect Armor with Laser Cannon','Forest','Insect Barrier','DNA Surgery','Multiplication of Ants','Eradicating Aerosol','Parasite Paracide','Pinch Hopper','Swarm of Scarabs','Swarm of Locusts'],
11:['Nightmare Wheel','Metal Reflect Slime','Jam Breeding Machine','Card of Safe Return','Coffin Seller',"Nightmare's Steelcage",'Lava Golem','Revival Jam','Drillago','Byser Shock'],
12:['Legendary Sword','Sword of Deep-Seated','Black Pendant','Horn of the Unicorn','Cyber Commander','The Wicked Worm Beast','Goblin Attack Force'],
13:['Shield & Sword','Book of Moon','Spellbinding Circle','Magical Hats','Mystical Box','Penguin Soldier','Morphing Jar','Giant Soldier of Stone','Guardian Sphinx'],
14:['Blast Held by a Tribute','Exchange of the Spirit','Luminous Spark','Shine Palace','Agido','Keldo','Kelbek','Mudora','Zolga'],
15:['Embodiment of Apophis','Statue of the Wicked','Judgment of Anubis','Fake Trap','Acid Trap Hole','Temple of the Kings','Mystical Beast of Serket'],
16:['Amplifier','Brain Control','The Fiend Megacyber','Jinzo','Cyber Raider','Reflect Bounder','Psychic Kappa','Mind Control'],
17:['Dark Magic Curtain','Thousand Knives','Dark Magic Attack','Mystic Plasma Zone','Mystic Tomato','Dark Magician','Mystic Clown','Rogue Doll','Legion the Fiend Jester'],
18:['Umi','A Legendary Ocean','Tornado Wall','Torrential Tribute','The Legendary Fisherman','Amphibian Beast','Fortress Whale',"Fortress Whale's Oath",'Levia-Dragon - Daedalus'],
22:['Gift of The Mystical Elf','Numinous Healer','Solemn Wishes','Enchanted Javelin','Silver Bow and Arrow','Waboku','Fire Princess','Nimble Momonga','Shining Angel','The Forgiving Maiden','Darklord Marie'],
27:['Mask of the Accursed',"Nightmare's Steelcage",'Coffin Seller','Jam Breeding Machine','Card of Safe Return','Revival Jam','Newdoria','Viser Des','Worm Drake']}
GENERIC={'Fissure','Raigeki Break','The Shallow Grave','Monster Recovery','Block Attack','Reinforcements','Red Medicine',"Goblin's Secret Remedy",'Mooyan Curry','Remove Trap','De-Spell','Jar of Greed','Reckless Greed'}
POWER=set(__import__('encounters').REPLACEMENTS)|{'Ring of Destruction','Magic Cylinder','Torrential Tribute','Mirror Force','Solemn Judgment'}
index=json.loads((ROOT/'data/decks/index.json').read_text(encoding='utf8'));meta=json.loads((ROOT/'data/opponent-tiers.json').read_text(encoding='utf8'))
backup=ROOT/'temp/decks-before-theme-revision';backup.mkdir(exist_ok=True)
for f in (ROOT/'data/decks').glob('*.ydk'):
 if not (backup/f.name).exists():shutil.copy2(f,backup/f.name)
added=set();report=[]
def unique(seq):return list(dict.fromkeys(seq))
def card(cid):return g.BY_ID[cid]
def maximum(k,cid):return 3 if k==1 and card(cid)['name']=='Blue-Eyes White Dragon' else 2
def repair(k,main,extra):
 # Ritual pairs are one-for-one, including the monster's corresponding spell.
 for cid in list(unique(main)):
  c=card(cid)
  if c['data']['type']&128:
   if c['data']['type']&2:
    matches=[x for x in g.CARDS if x['data']['type']&129==129 and x['name'] in c['desc']]
   else:matches=[x for x in g.CARDS if x['data']['type']&130==130 and c['name'] in x['desc']]
   if not matches:main=[i for i in main if i!=cid];continue
   other=matches[0]['id'];n=min(2,max(main.count(cid),main.count(other)))
   main=[i for i in main if i not in (cid,other)]+[cid]*n+[other]*n
 if any(card(i)['data']['type']&0x400000 for i in main) and g.BY_NAME['Toon World']['id'] not in main:main.append(g.BY_NAME['Toon World']['id'])
 valid=[]
 for cid in unique(extra)[:2]:
  c=card(cid);line=c['desc'].split('\n')[0];names=re.findall(r'"([^"]+)"',line)
  if not names or any(n not in g.BY_NAME for n in names):continue
  if c['name']=='Blue-Eyes Ultimate Dragon':names=['Blue-Eyes White Dragon']*3
  if any(n>maximum(k,g.BY_NAME[name]['id']) for name,n in Counter(names).items()):continue
  for name,n in Counter(names).items():
   i=g.BY_NAME[name]['id'];main += [i]*max(0,n-main.count(i))
  valid.append(cid)
 if valid and g.BY_NAME['Polymerization']['id'] not in main:main.append(g.BY_NAME['Polymerization']['id'])
 if not valid:main=[i for i in main if card(i)['name'] not in ('Polymerization','Fusion Sage')]
 if g.BY_NAME['Destiny Board']['id'] in main:
  for letter in 'INAL':
   cid=g.BY_NAME['Spirit Message "'+letter+'"']['id']
   if cid not in main:main.append(cid)
 if g.BY_NAME['Mystical Beast of Serket']['id'] in main and g.BY_NAME['Temple of the Kings']['id'] not in main:main.append(g.BY_NAME['Temple of the Kings']['id'])
 counts=Counter();out=[]
 for cid in main:
  if counts[cid]<maximum(k,cid):out.append(cid);counts[cid]+=1
 return out,valid
for key,rows in meta['opponents'].items():
 k=int(key);base=content.GAME_DECKS[k];theme=[g.BY_NAME[n]['id'] for n in THEMES[k] if n in g.BY_NAME]
 for row in rows:
  tier=row['tier'];record=content.opponent_record((tier-1)*3+1,k);old=record['main'];main=[]
  if tier<3:
   spells=unique(theme+[i for i in base['main'] if card(i)['data']['type']&6 and card(i)['name'] not in GENERIC|POWER])
   spells=[i for i in spells if card(i)['data']['type']&6 and (tier==2 or card(i)['name'] not in POWER)]
   monsters=unique([i for i in theme if card(i)['data']['type']&1]+[i for i in old if card(i)['data']['type']&1]+[i for i in base['main'] if card(i)['data']['type']&1])
   if tier==1:
    low=[i for i in monsters if card(i)['level']<=4 and card(i)['atk']<=1700 and card(i)['defense']<=1900]
    high=[i for i in monsters if i not in low]
    monsters=low+high[:3]
   main=monsters[:18]+spells[:12]
   for cid in unique(base['main']):
    if len(main)>=28:break
    if cid not in main and card(cid)['name'] not in GENERIC|POWER:main.append(cid)
   for cid in monsters+spells:
    if len(main)>=24:break
    if main.count(cid)<2:main.append(cid)
  else:
   main=unique(old)
   if k==1:main += [g.BY_NAME['Blue-Eyes White Dragon']['id']]*max(0,3-main.count(g.BY_NAME['Blue-Eyes White Dragon']['id']))
   for cid in unique(base['main']):
    if len(main)>=28:break
    if cid not in main:main.append(cid)
  main,extra=repair(k,main,record['extra'])
  assert 20<=len(main)<=60,(k,tier,len(main))
  assert sum(n==1 for n in Counter(main).values())>sum(n>1 for n in Counter(main).values()),(k,tier,Counter(main))
  row['main']=main;row['extra']=extra;row['theme_revision']=1
  name=index[f'opponent-{k}-tier-{tier}'];p=ROOT/'data/decks'/f'{name}.ydk'
  p.write_text('# Shadow Run NPC theme revision; base: '+row['source']+'\n#main\n'+'\n'.join(map(str,main))+'\n#extra\n'+'\n'.join(map(str,extra))+'\n!side\n',encoding='utf8')
  added.update(set(main)-set(old));report.append(dict(name=row['name'],tier=tier,size=len(main),singletons=sum(n==1 for n in Counter(main).values()),fissure=main.count(g.BY_NAME['Fissure']['id'])))
(ROOT/'data/opponent-tiers.json').write_text(json.dumps(meta,indent=2,ensure_ascii=False),encoding='utf8')
(ROOT/'temp/deck-theme-report.json').write_text(json.dumps(report,indent=2),encoding='utf8')
(ROOT/'temp/new-npc-cards.json').write_text(json.dumps([card(i)['name'] for i in sorted(added)],indent=2),encoding='utf8')
print('Revised',len(report),'decks; new cards:',len(added),'T1/T2 Fissure:',sum(r['fissure'] for r in report if r['tier']<3))
