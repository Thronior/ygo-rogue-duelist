"""Explicitly requested additions to the regular artifact pool."""
def install(artifact):
 from approved_relics import install as approved_install
 approved_install(artifact)
 for attr,name,art in [('LIGHT','Light Surgery','Luminous Spark'),('DARK','Dark Surgery','Mystic Plasma Zone'),('FIRE','Fire Surgery','Molten Destruction'),('WATER','Water Surgery','Umi'),('WIND','Wind Surgery','Rising Air Current'),('EARTH','Earth Surgery','Gaia Power')]:
  artifact('attribute_'+attr.lower(),name,90,f'All face-up monsters you control become {attr}.',art,'attribute',0,'offense',attr)
 artifact('arcane_resonance','Arcane Resonance',130,'Monsters you control gain 100 ATK for each face-up Spell/Trap on the field.','Mage Power','backrow_atk',100,'offense')
 artifact('waning_star','Waning Star',95,'Once per turn, at the start of your Standby Phase, reduce the Level of 1 random Level 2 or higher monster in your hand by 1 until the end of this turn.','Cost Down','hand_level',1,'draw')
 artifact('third_gate','The Third Gate',135,'Count non-Token cards from either player that would be sent to the GY. Banish every third card instead. The count resets at the start of each Duel.','Banisher of the Light','third_banish',3,'offense')
 artifact('exile_standard','Exile Standard',100,'Monsters you control gain 50 ATK for each face-up banished monster belonging to either player.','Soul Release','banished_atk',50,'offense')
 artifact('field_amplifier','Field Amplifier',120,'Double ATK/DEF increases applied by the effects of face-up Field Spells you control. ATK/DEF decreases are unchanged.','Terraforming','field_double',1,'offense')
 artifact('returning_tide','Returning Tide',300,'Once per turn, at the start of your Standby Phase, return 1 Spell/Trap on the field to the hand.','Giant Trunade','standby_bounce',1,'defense')
 artifact('ominous_clock','Ominous Clock',120,'Once per turn, at the start of your opponent\'s Standby Phase, inflict 200 damage to them.','Ookazi','enemy_standby_burn',200,'offense')
 artifact('final_hour','Final Hour',150,'When acquired, add 1 "Final Countdown" to your card pool. At the start of each Duel, add 1 "Final Countdown" to your hand.','Final Countdown','countdown',1,'draw')
 artifact('this_life_mine','This Life Is Mine',90,'The first time you pay LP to activate a card each Duel, recover the same amount.','Dark Magic Curtain','this_life_mine',0,'healing')
 artifact('boss_monster','Boss Monster',100,"Once per Duel, negate the first opponent's effect that targets a Level 7 or higher monster you control.",'Buster Blader','boss_monster',0,'defense')
 artifact('sword_and_shield','Sword and Shield',90,'Swap the original ATK and DEF of all monsters.','Shield & Sword','swap_base_ad',0,'offense')
 artifact('broken_limiter','Broken Limiter',110,'There is no three-copy limit for cards in your Deck.','Limiter Removal','broken_limiter',0,'other')
 artifact('lets_go_gambling',"Let's Go Gambling",85,'Once per turn, retry a coin toss or dice roll.','Dice Jar','retry_toss',0,'other')
 artifact('terraforming_relic','Terraforming',90,'Add a random Field Spell from your Deck to your starting hand.','Terraforming','starting_field_spell',0,'draw')
 artifact('good_spirits','Good Spirits',80,'Spirit monsters you control do not return to the hand at the end of the turn.','Spiritual Energy Settle Machine','no_spirit_return',0,'defense')
 for key,name,art,series,series_name in [
  ('dark_scorpion_squad','Dark Scorpion Squad','Don Zaloog','0x1a','Dark Scorpion'),
  ('gravekeepers_union',"Gravekeeper's Union",'Necrovalley','0x2e',"Gravekeeper's"),
  ('amazoness_hunters','Amazoness Hunters','Amazoness Fighter','0x4','Amazoness'),
  ('harpies_of_a_feather','Harpies of a Feather','Harpie Lady Sisters','0x64','Harpie')]:
  artifact(key,name,90,f'Your {series_name} monsters gain 200 ATK for each face-up matching monster on the field.',art,'archetype_atk',200,'offense',series)
 artifact('demonic_pact','Demonic Pact',90,'Halve the LP costs of Archfiend cards.','Pandemonium','archfiend_cost',0,'defense')
 artifact('all_for_one_terrorking','All for One Terrorking',100,'Terrorking Archfiend gains 500 ATK for each other Archfiend on the field.','Terrorking Archfiend','terrorking_atk',500,'offense','35975813')
 artifact('ojama_gang','Ojama Gang',90,'Ojama monsters gain 1,000 ATK for each face-up Ojama on the field.','Ojama King','archetype_atk',1000,'offense','0xf')
 artifact('tribute_free','Tribute Free',110,'Level 7 or higher monsters you Tribute Summon require only 1 Tribute.','Cost Down','tribute_free',0,'other')
 artifact('fusion_time','Fusion Time',120,'Fusion Summon Fusion Monsters from your Extra Deck using materials from your field, without Polymerization.','Polymerization','fusion_time',0,'summoning')
 artifact('level_one','Level One',90,'Add a random Level 1–4 LV monster from your Deck to your starting hand.','Level Up!','starting_low_level',0,'draw')
 artifact('level_up_relic','LEVEL UP',90,'Add 1 "Level Up!" to your starting hand.','Level Up!','starting_level_up',0,'draw')
