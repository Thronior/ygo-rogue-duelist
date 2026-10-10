"""Offline campaign content. Published WCT 2004 opponent lists."""
import json
from pathlib import Path
PACKS=json.loads((Path(__file__).parent/'data/packs.json').read_text(encoding='utf8'))
FIXED_OPPONENTS=json.loads((Path(__file__).parent/'data/fixed-opponents.json').read_text(encoding='utf8'))['opponents']
GAME_DECKS={int(k):v for k,v in FIXED_OPPONENTS.items()}
PACK_BY_ID={p['id']:p for p in PACKS}
# One distinct duelist per original booster release. First two are starter unlocks.
ROSTER=[
 ('Yami Yugi', 'EN-MFC', 1, 'Spellcaster', 'Dark Magician', 'Thousand Knives'),
 ('Seto Kaiba', 'EN-LOB', 2, 'Dragon', 'Blue-Eyes White Dragon', 'Burst Stream of Destruction'),
 ('Joey Wheeler', 'EN-MRD', 3, 'Warrior', 'Red-Eyes Black Dragon', 'Malevolent Nuzzler'),
 ('Mai Valentine', 'EN-MRL', 4, 'Winged Beast', 'Harpie Lady', 'Elegant Egotist'),
 ('Bandit Keith', 'EN-PSV', 12, 'Machine', 'Barrel Dragon', '7 Completed'),
 ('Lumis and Umbra', 'JP-SM', 31, 'Fiend', 'Masked Beast Des Gardius', 'Grand Tiki Elder'),
 ('Yami Bakura', 'JP-LN', 11, 'Fiend', 'Dark Necrofear', 'Dark Spirit of the Silent'),
 ('Maximillion Pegasus', 'EN-LON', 15, 'Spellcaster', 'Relinquished', 'Black Illusion Ritual'),
 ('Rex Raptor', 'EN-LOD', 8, 'Dinosaur', 'Two-Headed King Rex', 'Raise Body Heat'),
 ('Bonz', 'EN-PGD', 23, 'Zombie', 'Pumpking the King of Ghosts', 'Call of the Haunted'),
 ('Weevil Underwood', 'EN-DCR', 7, 'Insect', 'Insect Queen', 'Insect Barrier'),
 ('Yami Marik', 'EN-IOC', 10, 'Fiend', 'Lava Golem', 'Nightmare Wheel'),
 ('Tristan Taylor', 'JP-SC', 29, 'Warrior', 'Gearfried the Iron Knight', 'Reinforcement of the Army'),
 ('Yugi Muto', 'JP-MA', 6, 'Rock', 'Buster Blader', 'Swords of Revealing Light'),
 ('Ishizu Ishtar', 'JP-PH', 13, 'Fairy', 'Zolga', 'Exchange of the Spirit'),
 ('Odion', 'JP-301', 14, 'Rock', 'Mystical Beast of Serket', 'Temple of the Kings'),
 ('Espa Roba', 'JP-302', 24, 'Machine', 'Jinzo', 'Amplifier'),
 ('Arkana', 'JP-303', 22, 'Spellcaster', 'Dark Magician', 'Dark Magic Curtain'),
 ('Mako Tsunami', 'JP-304', 9, 'Aqua', 'The Legendary Fisherman', 'Umi'),
 ('Duke Devlin', 'JP-305', 34, 'Fiend', 'Dice Jar', 'Dice Re-Roll'),
 ('Noah Kaiba', 'JP-306', 48, 'Fairy', 'Shinato, King of a Higher Plane', "Shinato's Ark"),
 ('Paradox Brothers', 'JP-307', 19, 'Thunder', 'Sanga of the Thunder', 'Monster Gate'),
 ('Tea Gardner', 'JP-308', 5, 'Fairy', 'Dark Magician Girl', 'Waboku'),
 ('Solomon Muto', 'JP-309', 16, 'Spellcaster', 'Exodia the Forbidden One', 'Pot of Greed'),
 ('Mokuba Kaiba', 'EN-TP1', 17, 'Dragon', 'Luster Dragon', 'Dragon Treasure'),
 ('Rebecca Hawkins', 'EN-TP2', 40, 'Spellcaster', 'Witch of the Black Forest', 'Last Will'),
 ('Serenity Wheeler', 'EN-TP3', 47, 'Fairy', 'Mystical Elf', 'Graceful Charity'),
 ('Marik Ishtar', 'EN-TP4', 53, 'Fiend', 'Newdoria', 'Mask of the Accursed'),
]
CHARACTERS=[]
for name,pack,sprite,race,a,b in ROSTER:
 CHARACTERS.append(dict(name=name,pack=pack,sprite=f'dm{sprite:02}.png',race=race,cards=[a,b],type=4 if name in ('Mai Valentine','Odion') else 2,
  bonus=f'{race} summons and '+('Trap' if name in ('Mai Valentine','Odion') else 'Spell')+' activations',color='#e5c58a'))
CHARACTERS[3]['cards']=['Harpie Lady','Harpie Lady Sisters','Elegant Egotist']
CHARACTERS[5]['cards']=['Masked Beast Des Gardius','Grand Tiki Elder','Melchid the Four-Face Beast']
# Stable character IDs preserve saves; these slots now contain original-series/movie duelists.
for name,pack,sprite,race,a,b in [
 ('Rebecca Hawkins','EN-MRD','dm40','Spellcaster','Witch of the Black Forest','Last Will'),
 ('Serenity Wheeler','EN-LOB','dm47','Fairy','Mystical Elf','Graceful Charity'),
 ('Marik Ishtar','EN-LON','dm53','Fiend','Newdoria','Mask of the Accursed'),
 ('Anubis','EN-PGD','anubis','Rock','Guardian Sphinx','Judgment of Anubis'),
 ('Shadi','JP-309','shadi','Spellcaster','Millennium Shield','Soul Exchange'),
 ('PaniK','EN-MRD','panik','Fiend','Castle of Dark Illusions','King of Yamimakai'),
 ('Dartz','EN-LOD','dartz','Fiend','Dark Ruler Ha Des','Dark Spirit of the Silent'),
 ('Rafael','EN-DCR','rafael','Dinosaur','Guardian Grarl','Gravity Axe - Grarl')]:
 # Movie/late anime themes use early-era substitutes when their actual archetypes are later.
 CHARACTERS.append(dict(name=name,pack=pack,sprite=sprite+'.png',race=race,cards=[a,b],type=2,bonus=f'{race} summons and Spell activations',color='#e5c58a'))
# Fixed starters mix four themed boosters; characters may share packs.
DRAFTS=json.loads((Path(__file__).parent/'data/character-drafts.json').read_text(encoding='utf8'))
for index,packs in DRAFTS.items():
 CHARACTERS[int(index)]['pack']=packs[0]
 CHARACTERS[int(index)]['starting_packs']=packs
CHARACTERS.append(dict(name='Ryou Bakura',pack='RANDOM',sprite='dsod15.png',race='Rock',cards=['Morphing Jar','Change of Heart'],type=2,bonus='',color='#e5c58a',random_packs=True))

CHARACTERS.append(dict(name='Copycat',pack='COPY',sprite='cards/26376390.jpg',race='Spellcaster',cards=[],type=2,bonus='',color='#cce3db',copycat=True))
CHARACTERS.append(dict(name='Dueling Engine',pack='ENGINE',sprite='cards/77585513.jpg',race='Machine',cards=[],type=0,bonus='',color='#8fa3bf',engine_deck=True,starting_relic='none',attribute='DARK',theme='Start with a random starter deck. After each victory, choose a random opponent deck from your next duel tier. Reroll each offer for 15 coins. Extra-card reward relics add more deck choices.'))

# Retain definitions for existing saves; exclude these from new offers and the collection.
RETIRED_ARTIFACTS=frozenset({'feather'})
ARTIFACTS={}
ART_INFO={}
def artifact(key,name,price,desc,art,effect='',amount=0,tag='economy',filter=''):
 ARTIFACTS[key]=(name,price,desc)
 ART_INFO[key]=dict(art=art,effect=effect,amount=amount,tag=tag,filter=filter)
artifact('ankh','Diamond Ankh',75,'Gain 2,000 LP now; healing cap becomes 10,000.','Monster Reborn')
artifact('feather','Phoenix Feather',65,'Heal 400 LP after each victory.',"Harpie's Feather Duster",'victory_heal',400,'healing')
artifact('urn','Merchant Urn',60,'Earn 10 additional coins per victory.','Pot of Greed','gold',10)
artifact('eye','Millennium Eye',100,'Draw one extra opening card.','Sangan','opening',1,'draw')
artifact('scarab','Jade Pendant',100,'Heal 1,000 LP after each victory.','Man-Eater Bug','shop_heal',1000,'healing')
artifact('seal','Broken Seal',90,'Opponents start with 500 fewer LP.','Spellbinding Circle','enemy_lp',500,'offense')
for key,name,art,race in [
 ('dragon','Dragon Crest','Blue-Eyes White Dragon','Dragon'),('mage','Magician Staff','Dark Magician','Spellcaster'),
 ('blade','Warrior Blade','Axe Raider','Warrior'),('wing','Wind Plume','Harpie Lady','Winged Beast'),
 ('gear','Ancient Gear','Jinzo','Machine'),('shell','Tidal Shell','Aqua Madoor','Aqua'),
 ('fossil','Amber Fossil','Two-Headed King Rex','Dinosaur'),('hive','Amber Hive','Killer Needle','Insect'),
 ('bone','Zombie Crystal','Dragon Zombie','Zombie'),('halo','Silver Halo','Mystical Elf','Fairy'),
 ('fang','Beast Fang','Silver Fang','Beast'),('horn','Fiend Horn','Summoned Skull','Fiend')]:
 artifact(key,name,60,f"Your {race + ' and Beast-Warrior' if race in ('Warrior','Beast') else race} monsters gain 300 ATK in every duel.",art,'atk',300,'offense',race)
for key,name,art,attr in [('ember','Ember Orb','Flame Swordsman','FIRE'),('tide','Tide Orb','Umi','WATER'),('gale','Gale Orb','Mountain','WIND'),('earth','Earth Orb','Gaia The Fierce Knight','EARTH'),('light','Light Orb','Mystical Elf','LIGHT'),('dark','Dark Orb','Dark Magician','DARK')]:
 artifact(key,name,65,f'Your {attr} monsters gain 250 ATK and DEF.',art,'both',250,'offense',attr)
artifact('buckler','Millennium Shield',60,'Your monsters gain 250 DEF.','Giant Soldier of Stone','def',250,'defense')
artifact('sword','Demonic Sword',110,'Your monsters gain 200 ATK.','Sword of Deep-Seated','atk',200,'offense')
artifact('normal','Normal Power',65,'Your Normal Monsters gain 400 ATK.','Battle Ox','normal',400,'offense')
artifact('tribute','Tribute Power',75,'Your Level 5+ monsters gain 400 ATK.','Summoned Skull','tribute',400,'offense')
artifact('small','Tiny Courage',70,'Your Level 3 or lower monsters gain 400 ATK.','Kuriboh','small',400,'offense')
artifact('spring','Healing Spring',85,'Recover 200 LP at each of your Standby Phases.','Red Medicine','standby',200,'healing')
artifact('flame','Eternal Flame',100,'Deal 200 damage at each of your End Phases.','Ookazi','burn',200,'offense')
artifact('prism','Life Shield',100,'Reduce incoming effect damage by 400, minimum zero.','Waboku','reduce',400,'defense')
artifact('pierce','Lancer Spear',125,'Your monsters inflict piercing battle damage.','Spear Dragon','pierce',1,'offense')
artifact('chalice','Silver Chalice',65,'Heal 600 LP after each victory.','Dian Keto the Cure Master','victory_heal',600,'healing')
artifact('satchel','Travel Satchel',70,'Each victory grants one additional random card from the opponent\'s deck.','Graceful Charity','reward_card',1,'draw')
artifact('bargain','Merchant Sigil',80,'All future shop prices are reduced by 20%.','Upstart Goblin','discount',20)
artifact('interest','Golden Scale',90,'Earn 10% of held gold after victory (maximum 30).','Pot of Greed','interest',10)
artifact('bandage','Red Medicine',55,'Heal 500 LP on every shop arrival.','Dian Keto the Cure Master','shop_heal',500,'healing')
artifact('map','Treasure Map',75,'Shops offer a fourth artifact.','Sangan','extra_artifact',1)

# Build-around relics: their effects are implemented in passives/campaign_expansion.
artifact('last_word','Last Word',95,'While your hand is empty, your monsters gain 700 ATK.','Card Destruction','empty_hand',700,'offense')
artifact('solo','Lone Champion',100,'While you control exactly one monster, it gains 200 ATK.','The A. Forces','solo',200,'offense')
artifact('menagerie','Prismatic Menagerie',100,'Your monsters gain 100 ATK per different monster Type you control (max 500).','Unity','diversity',100,'offense')
artifact('epitaph',"Commoner's Epitaph",95,'Your monsters gain 75 ATK per Normal Monster in your Graveyard (max 600).','Soul Release','normal_grave',75,'offense')
artifact('eclipse','Eclipse Locket',100,'With both LIGHT and DARK monsters in your Graveyard, your monsters gain 350 ATK and DEF.','Chaos Sorcerer','eclipse',350,'offense')
artifact('pendulum','Sun and Moon Dial',105,'Your monsters gain 400 ATK during your turn and 600 DEF during the opponent’s turn.','Darkness Approaches','dial',400,'defense')
artifact('desperate',"Underdog's Banner",90,'While your LP are lower and you control fewer monsters, your monsters gain 900 ATK.','Banner of Courage','underdog',900,'offense')
artifact('inkwell','Bottomless Draw',115,'At your End Phase, if your hand is empty, draw 1 card.','Jar of Greed','empty_draw',1,'draw')
artifact('receipt','Golden Receipt',80,'Buying a booster refunds 12 coins after payment. Cannot make the purchase free.','Upstart Goblin','pack_refund',12)
artifact('razor','Razor Ledger',85,'Win with exactly 20 main-deck cards to earn 30 extra coins.','Narrow Pass','lean_bonus',30)
artifact('phoenix_debt','Phoenix IOU',90,'After a victory below 2,000 LP, gain 40 coins before healing.','Spirit of the Breeze','clutch_bonus',40)
artifact('stamp',"Collector's Stamp",80,'Every single you buy includes a free random unlocked card.','Gift of The Mystical Elf','single_stamp',1,'draw')

artifact('archfiend_contract','Archfiend Contract',85,'Adds one extra random Archfiend card to every shop and reroll.','Pandemonium','like_archfiend',1,'draw')

CURSES={
 'relic_seal':('Relic Seal','Negate all effects of your relics during this Duel, including their benefits and drawbacks. Shop and post-duel effects are unaffected.'),
 'frailty':('Cracked Blade','Your monsters lose 200 ATK during this boss duel.'),
 'tax':('Shadow Toll','Take 200 damage at the end of each of your turns.'),
 'mercy':('Dulled Edge','Your outgoing battle damage is halved.'),
 'hunger':('Empty Scabbard','Your monsters lose 300 DEF.'),
 'enemy_power':('Empowered Rival','The boss\'s monsters gain 200 ATK.'),
 'drain':('Withering Soul','Start this boss duel with 1000 fewer LP, minimum 1.'),
}
# Factual card themes from early WCT 2004 deck lists; shortened/rebalanced
# for the 20-card format. Later acts add stronger staples and tribute threats.
THEMES={
 'Warrior':['Axe Raider','Battle Ox','Warrior Dai Grepher','Harpie\'s Brother','Goblin Attack Force','Summoned Skull'],
 'Dinosaur':['Two-Headed King Rex','Crawling Dragon #2','Mad Sword Beast','Megazowler','Sword Arm of Dragon','Dark Driceratops'],
 'Insect':['Neo Bug','Insect Knight','Flying Kamakiri #1','Man-Eater Bug','Killer Needle','Insect Queen'],
 'Machine':['Mechanicalchaser','Giant Soldier of Stone','Robotic Knight','Cyber Falcon','Jinzo','Barrel Dragon'],
 'Dragon':['Luster Dragon','Luster Dragon #2','Kaiser Sea Horse','Battle Ox','Spear Dragon','Blue-Eyes White Dragon'],
 'Spellcaster':['Gemini Elf','Mystical Elf','Neo the Magic Swordsman','Magician of Faith','Dark Magician','Summoned Skull'],
 'Fairy':['Dunames Dark Witch','Shining Angel','Nimble Momonga','Hysteric Fairy','Fire Princess','Airknight Parshath'],
 'Zombie':['Dragon Zombie','Armored Zombie','Pyramid Turtle','Giant Axe Mummy','Vampire Lord','Pumpking the King of Ghosts'],
 'Aqua':['7 Colored Fish','Sea Serpent Warrior of Darkness','Aqua Madoor','Gagagigo','The Legendary Fisherman','Levia-Dragon - Daedalus'],
 'Winged Beast':['Harpie Lady','Harpie\'s Brother','Birdface','Cyber Harpie Lady','Harpie Lady Sisters','Summoned Skull'],
 'Fiend':['La Jinn the Mystical Genie of the Lamp','Giant Orc','Mystic Tomato','Newdoria','Dark Ruler Ha Des','Summoned Skull'],
 'Rock':['Giant Soldier of Stone','Giant Rat','Alpha The Magnet Warrior','Beta The Magnet Warrior','Gamma The Magnet Warrior','Guardian Sphinx'],
}

RUN_LENGTH=9
BOSS_EVERY=3
# Keep stable save/opponent IDs; the three retired TP slots are not selectable.
PLAYABLE_IDS=[i for i in range(len(CHARACTERS)) if i not in (25,26,27)]
# Mokuba follows the shared draft configuration like the other fixed starters.
def starting_packs(index,rng=None):
 if CHARACTERS[index].get('copycat') or CHARACTERS[index].get('engine_deck'):return []
 if CHARACTERS[index].get('random_packs'):
  import random
  rng=rng or random
  # Bakura can draw any pack, including character and shop boosters.
  return [p['id'] for p in rng.sample(PACKS,4)]
 return CHARACTERS[index].get('starting_packs',DRAFTS.get(str(index),[CHARACTERS[index]['pack']]*4))
OPPONENT_TIERS=FIXED_OPPONENTS
def opponent_record(round_index,index,loop=0):
 from deck_files import read
 if index in UC_OPPONENTS:
  if not loop:raise ValueError('UC opponents require a later loop.')
  return dict(UC_OPPONENTS[index]['deck'],tier=4)
 if index in TIER_EXCLUSIVE_OPPONENTS:
  row=TIER_EXCLUSIVE_OPPONENTS[index]
  if index not in eligible_opponents(round_index,loop):raise ValueError('Opponent is not eligible for this duel tier.')
  tier=min(3,round_index//3+1)
  return read(row.get('tier_decks',{}).get(str(tier),row['deck']),dict(row,tier=tier))
 row=json.loads((Path(__file__).parent/'data/tier4-decks.json').read_text(encoding='utf8'))[str(index)] if loop>=1 else OPPONENT_TIERS[str(index)][min(2,round_index//3)]
 return read(row['deck'],row)

# Coin milestones are shared by the whole roster.
for character in CHARACTERS:character["bonus"]="Shared rewards: summons, damage, powerful monsters and more."

CHARACTERS[37]['cards']=['Copycat']

artifact('echo_glass','Echo Glass',100,"Once per duel, copy the first Level 4 or lower monster your opponent summons into your hand.",'Copycat','echo',1,'draw')
artifact('faulty_printer','Faulty Printer',85,'Each purchased card has a 15% chance of misprinted ATK/DEF (randomized by up to 1000 each way, minimum 0).','Machine Conversion Factory','faulty',15,'economy')
artifact('carbon_copy','Carbon Copy',85,'Each card obtained from a booster pack or single-card purchase has a 15% chance to grant an extra copy.','Cloning','purchase_clone',15,'economy')
artifact('golden_sleeve','Golden Card Sleeve',90,'Permanently choose a card when purchased. Win: gain 10 coins each time you summon, set, or activate it (max 5 per duel per chosen card).','Graceful Charity','golden',10,'economy')
artifact('magic_mirror','Magic Mirror',110,'Copies the effect of a random other relic you own each duel.','Morphing Jar','mirror',0,'economy')
artifact('underdog_clause','The Underdog Clause',70,'Earn 5 extra coins per Level 2 or lower Normal Monster in your deck after each victory.','Banner of Courage','underdog_gold',5,'economy')
artifact('traps_no_more','Traps No More',300,'Negate all Trap card effects (both players). Very rare.','Royal Decree','trap_negate',0,'defense')
artifact('spells_no_more','Spells No More',300,'Negate all Spell card effects (both players). Very rare.','Imperial Order','spell_negate',0,'defense')
artifact('legendary_shackles','Legendary Shackles',85,'Exodia pieces appear more often in shops. Every third shop visit or reroll while active guarantees a random Exodia piece in general stock.','Kunai with Chain','like_exodia',0,'draw')
artifact('toon_world','Toon World',85,'Toon cards appear more often in shops.','Toon World','like_toon',0,'draw')
artifact('ritual_dagger','Ritual Dagger',80,'Ritual monsters and Ritual Spells appear more often in shops.','Curse of the Masked Beast','like_ritual',0,'draw')
artifact('fusion_chamber','Fusion Chamber',80,'Fusion monsters, Polymerization and Fusion Sage appear more often in shops.','Polymerization','like_fusion',0,'draw')
artifact('phoenix_rebirth','Phoenix Feather',120,'Once per duel, if your LP would reach 0 they become 1000 instead. Consumed as soon as it saves you.','Fire Princess','phoenix',1000,'healing')
artifact('champion_trophy','Champion Trophy',60,'Increase the coin reward from boss duel victories by 40.','Victory Dragon','boss_gold',40,'economy')
artifact('glass_shard','Glass Shard',70,'You start every duel with 2000 LP, but coin rewards are doubled.','Gamble','glass',2000,'economy')
artifact('deck_spyglass','Deck Spyglass',85,'Reveal opponent portraits and view their decks when choosing your opponent.','The Eye of Truth','spyglass',0,'draw')
artifact('rulebook',"Broke Man's Rulebook",60,'Both players open with 1 card instead of 5.','A Deal with Dark Ruler','rulebook',0,'draw')
artifact('blank_relic','Blank Relic',50,'Does nothing. After your next duel it becomes an attribute orb matching your most common monster attribute.','Fiber Jar','',0,'economy')
from artifact_expansion import install as install_artifact_expansion
install_artifact_expansion(artifact)

STARTING_RELICS=['mage','dragon','blade','wing','gear','horn','dark','eye','fossil','bone','hive','flame','blade','buckler','halo','prism','gear','mage','shell','map','light','tribute','halo','bargain','dragon','eye','halo','horn','eye','halo','horn','sword','buckler','last_word','dark','pierce','random','echo_glass','none']
for i,character in enumerate(CHARACTERS):character['starting_relic']=STARTING_RELICS[i]

# Reload in-place so modules that imported these dictionaries see edits immediately.
_tuning_path=Path(__file__).parent/'data/tuning.json'
_tuning_stamp=None
_BASE_ARTIFACTS=ARTIFACTS.copy()
_BASE_INFO={k:dict(v) for k,v in ART_INFO.items()}
def reload_tuning(force=False):
 global _tuning_stamp
 if not _tuning_path.exists():return False
 stamp=_tuning_path.stat().st_mtime_ns
 if not force and stamp==_tuning_stamp:return False
 config=json.loads(_tuning_path.read_text(encoding='utf8'))
 rows=config.get('relics',{})
 artifacts=_BASE_ARTIFACTS.copy();infos={k:dict(v) for k,v in _BASE_INFO.items()}
 effects={v['effect'] for v in _BASE_INFO.values()}
 for key,row in rows.items():
  if key not in artifacts:raise ValueError('Unknown relic in tuning.json: '+key)
  if not isinstance(row.get('price'),int) or row['price']<0:raise ValueError('Invalid relic price: '+key)
  if not isinstance(row.get('amount'),(int,float)) or row['amount']<0:raise ValueError('Invalid relic amount: '+key)
  if row.get('effect') not in effects:raise ValueError('Unknown relic effect: '+key)
  artifacts[key]=(row['name'],row['price'],row['description'])
  infos[key]={k:row[k] for k in ('art','effect','amount','tag','filter')}
  infos[key]['parameters']=row.get('parameters',{})
 for key,art in json.loads((Path(__file__).parent/'data/relic-art-overrides.json').read_text(encoding='utf8')).items():
  if key in infos:infos[key]['art']=art
 from artifact_text import description
 artifacts={k:(v[0],v[1],description(k,infos[k],v[2])) for k,v in artifacts.items()}
 ARTIFACTS.clear();ARTIFACTS.update(artifacts)
 ART_INFO.clear();ART_INFO.update(infos)
 _tuning_stamp=stamp
 return True
reload_tuning()

# Editable identity metadata shared by both frontends.
for index,identity in json.loads((Path(__file__).parent/'data/character-themes.json').read_text(encoding='utf8'))['characters'].items():
 CHARACTERS[int(index)].update(identity)

# Shared, editable character progression and exclusive starting relic assignments.
PROGRESSION=json.loads((Path(__file__).parent/"data/character-progression.json").read_text(encoding="utf8"))
for _id,_relic in PROGRESSION["starting_relics"].items():
 CHARACTERS[int(_id)]["starting_relic"]=_relic

# Approved signature cards; list order and duplicate copies are intentional.
for _id, _cards in json.loads((Path(__file__).parent/"data/character-signatures.json").read_text(encoding="utf8")).items():
 CHARACTERS[int(_id)]["cards"]=_cards

# Append-only opponent identities do not join PLAYABLE_IDS or starter progression.
TIER_EXCLUSIVE_OPPONENTS={row['character']:row for row in json.loads((Path(__file__).parent/'data/tier-exclusive-opponents.json').read_text(encoding='utf8'))['opponents']}
TUTORIAL_OPPONENTS={int(k):v for k,v in json.loads((Path(__file__).parent/'data/tutorial-opponents.json').read_text(encoding='utf8')).items()}

def eligible_opponents(round_index,loop=0):
 if round_index==0 and not loop:return list(TUTORIAL_OPPONENTS)
 tier=min(3,round_index//3+1)
 if loop:
  tier4=json.loads((Path(__file__).parent/'data/tier4-decks.json').read_text(encoding='utf8'))
  return [i for i in GAME_DECKS if str(i) in tier4]+list(UC_OPPONENTS)
 return list(GAME_DECKS)+([] if loop else [i for i,row in TIER_EXCLUSIVE_OPPONENTS.items() if str(tier) in row.get('tier_decks',{str(row['tier']):row['deck']})])

# Each defeated Collector is a separate, permanent NPC identity, not its avatar.
UC_OPPONENTS={row['opponent_id']:row for row in json.loads((Path(__file__).parent/'data/fallen-collectors.json').read_text(encoding='utf8'))['opponents']}
# One append-only identity space lets new characters follow existing UC identities.
if set(TIER_EXCLUSIVE_OPPONENTS)&set(UC_OPPONENTS):raise ValueError('Duplicate opponent identity.')
for _id in sorted(set(TIER_EXCLUSIVE_OPPONENTS)|set(UC_OPPONENTS)):
 if _id!=len(CHARACTERS):raise ValueError('Opponent identities must remain append-only.')
 if _id in TIER_EXCLUSIVE_OPPONENTS:
  _row=TIER_EXCLUSIVE_OPPONENTS[_id]
  CHARACTERS.append(dict(name=_row['name'],sprite=_row['sprite'],background=_row['background'],pack=_row['reward_pack'],opponent_only=True,tier=_row['tier'],theme=_row['theme'],race='',attribute='',cards=[],type=2,bonus='',color='#e5c58a',starting_relic='none'))
 else:
  _row=UC_OPPONENTS[_id];_avatar=CHARACTERS[_row['character']]
  CHARACTERS.append(dict(_avatar,name=_row['name'],opponent_only=True,ultimate_collector=True,avatar_character=_row['character']))
