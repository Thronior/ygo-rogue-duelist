"""Explicitly requested additions to the regular artifact pool."""
def install(artifact):
 from approved_relics import install as approved_install
 approved_install(artifact)
 for attr,name,art in [('LIGHT','Light Surgery','Luminous Spark'),('DARK','Dark Surgery','Mystic Plasma Zone'),('FIRE','Fire Surgery','Molten Destruction'),('WATER','Water Surgery','Umi'),('WIND','Wind Surgery','Rising Air Current'),('EARTH','Earth Surgery','Gaia Power')]:
  artifact('attribute_'+attr.lower(),name,90,f'All face-up monsters you control become {attr}.',art,'attribute',0,'offense',attr)
 artifact('arcane_resonance','Arcane Resonance',130,'Monsters you control gain 100 ATK for each face-up Spell/Trap on the field.','Mage Power','backrow_atk',100,'offense')
 artifact('waning_star','Waning Star',95,'Once per turn, at the start of your Standby Phase, reduce the Level of 1 random Level 2 or higher monster in your hand by 1 until the end of this turn.','Cost Down','hand_level',1,'draw')
 artifact('third_gate','The Third Gate',135,'Count cards from either player that would be sent to the GY. Banish every third card instead. The count resets at the start of each Duel.','Banisher of the Light','third_banish',3,'offense')
 artifact('exile_standard','Exile Standard',100,'Monsters you control gain 50 ATK for each face-up banished monster.','Soul Release','banished_atk',50,'offense')
 artifact('field_amplifier','Field Amplifier',120,'Double ATK/DEF increases applied by the effects of face-up Field Spells you control. ATK/DEF decreases are unchanged.','Terraforming','field_double',1,'offense')
 artifact('returning_tide','Returning Tide',300,'Once per turn, at the start of your Standby Phase, return 1 Spell/Trap on the field to the hand.','Giant Trunade','standby_bounce',1,'defense')
 artifact('ominous_clock','Ominous Clock',120,'Once per turn, at the start of your opponent\'s Standby Phase, inflict 200 damage to them.','Ookazi','enemy_standby_burn',200,'offense')
 artifact('final_hour','Final Hour',150,'When acquired, add 1 "Final Countdown" to your card pool. At the start of each Duel, add 1 "Final Countdown" to your hand.','Final Countdown','countdown',1,'draw')
