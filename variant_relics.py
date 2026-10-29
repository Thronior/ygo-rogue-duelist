"""Distinct starting relics for alternate character playstyles."""
ROWS=[
 ('chitin_carapace','Chitin Carapace',85,'Insect monsters you control gain 400 DEF.','Cocoon of Evolution','Insect'),
 ('machine_foundry','Fusion Dividend',90,'Earn 30 coins each time you Fusion Summon. Coins are collected after the duel.','Fusion Sage',''),
 ('swordsman_oath','Level Bonus',85,'Your LV monsters gain 400 ATK.','Silent Swordsman LV5','LV'),
 ('static_coil','Damage Echo',90,'Each time you deal effect damage to your opponent, inflict 200 additional effect damage. This cannot trigger itself.','Wave-Motion Cannon',''),
 ('counterweight','Counterweight',90,'Monsters you control gain 100 ATK for each Spell Counter on your field.','Pitch-Black Power Stone','Spellcaster'),
 ('jar_of_echoes','Jar of Echoes',90,'Once per turn, during your Standby Phase, change 1 face-up monster you control to face-down Defense Position.','Morphing Jar',''),
 ('ritual_incense','Ritual Incense',90,'Each time you Ritual Summon, draw 1 card.','Black Illusion Ritual',''),
 ('village_banner',"Veteran's Might",85,'Level 4 Normal Monsters you control gain 200 ATK/DEF.','Gagagigo','normal'),
 ('dragon_triumph',"Dragon's Claws",90,"Each time a Dragon monster you control destroys an opponent's monster by battle, inflict 500 damage to your opponent.","Dragon's Rage",'Dragon'),
 ('armory_crest','Armory Crest',85,'Equipped monsters you control gain 300 ATK.','Maha Vailo',''),
]
def install(artifact):
 for key,name,price,text,art,filter in ROWS:artifact(key,name,price,text,art,'variant_'+key,0,'offense',filter)

def effect(kind):
 if not kind.startswith('variant_'):return None
 from approved_relic_effects import stat,event
 key=kind[8:]
 if key=='chitin_carapace':return stat('EFFECT_UPDATE_DEFENSE',400,'c:IsRace(RACE_INSECT)')
 if key=='machine_foundry':return event('EVENT_SPSUMMON_SUCCESS','local n=eg:FilterCount(function(c) return c:IsControler(0) and c:IsSummonType(SUMMON_TYPE_FUSION) end,nil) for i=1,n do Duel.Hint(HINT_MESSAGE,0,900000003) end')
 if key=='swordsman_oath':return stat('EFFECT_UPDATE_ATTACK',400,'c:IsSetCard(SET_LV)')
 if key=='static_coil':
  # Shared label prevents mirrored copies from triggering one another forever.
  return event('EVENT_DAMAGE','Duel.Damage(1,200,REASON_EFFECT)','ep==1 and ev>0 and (r&REASON_EFFECT)~=0 and rp==0 and re~=nil and re:GetLabel()~=937202').replace('e:SetCode(EVENT_DAMAGE)','e:SetCode(EVENT_DAMAGE) e:SetLabel(937202)')
 if key=='counterweight':return stat('EFFECT_UPDATE_ATTACK','function() return 100*Duel.GetCounter(0,1,0,0x1) end')
 if key=='jar_of_echoes':
  valid='function(c) return c:IsFaceup() and c:IsCanTurnSet() end'
  return event('EVENT_PHASE|PHASE_STANDBY',f'Duel.Hint(HINT_SELECTMSG,0,HINTMSG_POSCHANGE) local g=Duel.SelectMatchingCard(0,{valid},0,LOCATION_MZONE,0,1,1,nil) if #g>0 then Duel.ChangePosition(g,POS_FACEDOWN_DEFENSE) end',f'Duel.GetTurnPlayer()==0 and Duel.IsExistingMatchingCard({valid},0,LOCATION_MZONE,0,1,nil)',True)
 if key=='ritual_incense':return event('EVENT_SPSUMMON_SUCCESS','Duel.Draw(0,1,REASON_EFFECT)','eg:IsExists(function(c) return c:IsControler(0) and c:IsSummonType(SUMMON_TYPE_RITUAL) end,1,nil)')
 if key=='village_banner':return stat('EFFECT_UPDATE_ATTACK',200,'c:IsType(TYPE_NORMAL) and c:IsLevel(4)')+'\n'+stat('EFFECT_UPDATE_DEFENSE',200,'c:IsType(TYPE_NORMAL) and c:IsLevel(4)')
 if key=='dragon_triumph':return event('EVENT_BATTLE_DESTROYING','Duel.Damage(1,500,REASON_EFFECT)','eg:IsExists(function(c) return c:IsControler(0) and c:IsRace(RACE_DRAGON) and c:IsStatus(STATUS_OPPO_BATTLE) end,1,nil)')
 if key=='armory_crest':return stat('EFFECT_UPDATE_ATTACK',300,'c:GetEquipCount()>0')
 return None

def coins(run,events):
 # Each owned copy emits a hint for each genuine Fusion Summon, not revival.
 import approved_relics
 if not approved_relics.has(run,'machine_foundry'):return 0
 return 30*sum(e.get('kind')=='fusion_dividend' for e in events)
