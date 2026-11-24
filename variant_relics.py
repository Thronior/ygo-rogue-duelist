"""Distinct starting relics for alternate character playstyles."""
ROWS=[
 ('chitin_carapace','Chitin Carapace',85,'Insect monsters you control gain 800 DEF.','Cocoon of Evolution','Insect'),
 # Moth Brood (user, 2026-11-23): uses the Moth Token of the Moth LV line, copying the strongest Insect automatically.
 ('moth_brood','Moth Brood',90,'Once per turn, during your Standby Phase, if you control a face-up Insect monster: Special Summon 1 "Moth Token" with the same Level and Type as the face-up Insect monster you control with the highest ATK, and half its ATK/DEF.','Larvae Moth','Insect'),
 # Plant relics (user, 2026-11-24, Discord thread "Plant support"): Luka's healing, Eriko's growing Plants and insect tokens.
 ('photosynthesis','Photosynthesis',85,'Once per turn, during your Standby Phase: Gain 300 LP for each face-up Plant monster you control.','The World Tree','Plant'),
 ('spring_growth','Spring Growth',90,'Once per turn, during your Standby Phase: Each face-up Plant monster you control gains 200 ATK.','Gigantic Cephalotus','Plant'),
 ('pollinator','Pollinator',85,'Once per turn, during your End Phase, if you control a face-up Plant monster: Special Summon 1 "Moth Token" (Insect/EARTH/Level 1/ATK 300/DEF 300) in Defense Position.','Anti-Aircraft Flower','Plant'),
 ('machine_foundry','Fusion Dividend',90,'Earn 30 coins each time you Fusion Summon. Coins are collected after the duel.','Fusion Sage',''),
 ('swordsman_oath','Level Bonus',85,'Your LV monsters gain 400 ATK.','Silent Swordsman LV5','LV'),
 ('static_coil','Damage Echo',90,'Each time you deal effect damage to your opponent, inflict 200 additional effect damage. This cannot trigger itself.','Wave-Motion Cannon',''),
 ('counterweight','Counterweight',90,'Monsters you control gain 100 ATK for each Spell Counter on your field.','Pitch-Black Power Stone','Spellcaster'),
 ('jar_of_echoes','Jar of Echoes',90,'Once per turn, during your Standby Phase, change 1 face-up monster you control to face-down Defense Position.','Morphing Jar',''),
 ('ritual_incense','Ritual Incense',90,'Each time you Ritual Summon, draw 1 card.','Black Illusion Ritual',''),
 ('village_banner',"Veteran's Might",85,'Level 4 monsters you control gain 200 ATK/DEF.','Gagagigo',''),
 ('dragon_triumph',"Dragon's Claws",90,"Each time a Dragon monster you control destroys an opponent's monster by battle, inflict 500 damage to your opponent.","Dragon's Rage",'Dragon'),
 ('armory_crest','Armory Crest',85,'Equipped monsters you control gain 300 ATK.','Maha Vailo',''),
 ('field_of_attraction','Field of Attraction',90,'Each time you Normal Summon a "Magnet Warrior" monster, add 1 "Magnet Warrior" monster with a different name from your Deck to your hand.','Valkyrion the Magna Warrior',''),
 # Bandit Keith's Metalmorph loadout (2026-11-08): like LEVEL UP, the Duel adds a copy to the Deck when it holds none.
 ('metal_coating','Metal Coating',90,'Add 1 "Metalmorph" to your starting hand.','Metalmorph',''),
]
METALMORPH=68540058
MOTH_TOKEN=190000057  # data/custom-tokens.json
def install(artifact):
 for key,name,price,text,art,filter in ROWS:artifact(key,name,price,text,art,'variant_'+key,0,'offense',filter)

def effect(kind):
 if not kind.startswith('variant_'):return None
 from approved_relic_effects import stat,event
 key=kind[8:]
 if key=='chitin_carapace':return stat('EFFECT_UPDATE_DEFENSE',800,'c:IsRace(RACE_INSECT)')  # 400 until 2026-11-23 (user)
 if key=='moth_brood':
  # The face-up Insect with the highest ATK is picked automatically (user): no prompt. Halves round up, as the rules do.
  insect='function(c) return c:IsFaceup() and c:IsRace(RACE_INSECT) end'
  from approved_relic_effects import phase
  return phase('STANDBY',f'''local tc=Duel.GetMatchingGroup({insect},0,LOCATION_MZONE,0,nil):GetMaxGroup(Card.GetAttack):GetFirst()
 if not tc or Duel.GetLocationCount(0,LOCATION_MZONE)<=0 then return end
 local atk,def,lv,race=math.ceil(math.max(tc:GetAttack(),0)/2),math.ceil(math.max(tc:GetDefense(),0)/2),math.max(tc:GetLevel(),1),tc:GetRace()
 if not Duel.IsPlayerCanSpecialSummonMonster(0,{MOTH_TOKEN},0,TYPES_TOKEN,atk,def,lv,race,ATTRIBUTE_EARTH) then return end
 local token=Duel.CreateToken(0,{MOTH_TOKEN})
 if Duel.SpecialSummonStep(token,0,0,0,false,false,POS_FACEUP) then
  for _,set in ipairs({{{{EFFECT_SET_BASE_ATTACK,atk}},{{EFFECT_SET_BASE_DEFENSE,def}},{{EFFECT_CHANGE_LEVEL,lv}},{{EFFECT_CHANGE_RACE,race}}}}) do
   local e1=Effect.CreateEffect(token) e1:SetType(EFFECT_TYPE_SINGLE) e1:SetCode(set[1]) e1:SetValue(set[2])
   e1:SetReset(RESET_EVENT|RESETS_STANDARD&~RESET_TOFIELD) token:RegisterEffect(e1)
  end
 end
 Duel.SpecialSummonComplete()''',f'Duel.IsExistingMatchingCard({insect},0,LOCATION_MZONE,0,1,nil)')
 plant='function(c) return c:IsFaceup() and c:IsRace(RACE_PLANT) end'
 has_plant=f'Duel.IsExistingMatchingCard({plant},0,LOCATION_MZONE,0,1,nil)'
 if key=='photosynthesis':
  from approved_relic_effects import phase
  return phase('STANDBY',f'Duel.Recover(0,300*Duel.GetMatchingGroupCount({plant},0,LOCATION_MZONE,0,nil),REASON_EFFECT)',has_plant)
 if key=='spring_growth':
  # Each gain stays while that monster stays face-up on the field (RESETS_STANDARD), so a Plant grows every turn.
  from approved_relic_effects import phase
  return phase('STANDBY',f'''for c in Duel.GetMatchingGroup({plant},0,LOCATION_MZONE,0,nil):Iter() do
  local e1=Effect.CreateEffect(c) e1:SetType(EFFECT_TYPE_SINGLE) e1:SetCode(EFFECT_UPDATE_ATTACK) e1:SetValue(200)
  e1:SetReset(RESET_EVENT|RESETS_STANDARD) c:RegisterEffect(e1)
 end''',has_plant)
 if key=='pollinator':
  # Reuses the Moth LV line's Moth Token (data/custom-tokens.json) as a Level 1 300/300 Insect.
  from approved_relic_effects import phase
  return phase('END',f'''if Duel.GetLocationCount(0,LOCATION_MZONE)<=0 then return end
 if not Duel.IsPlayerCanSpecialSummonMonster(0,{MOTH_TOKEN},0,TYPES_TOKEN,300,300,1,RACE_INSECT,ATTRIBUTE_EARTH,POS_FACEUP_DEFENSE) then return end
 local token=Duel.CreateToken(0,{MOTH_TOKEN})
 if Duel.SpecialSummonStep(token,0,0,0,false,false,POS_FACEUP_DEFENSE) then
  for _,set in ipairs({{{{EFFECT_SET_BASE_ATTACK,300}},{{EFFECT_SET_BASE_DEFENSE,300}},{{EFFECT_CHANGE_LEVEL,1}}}}) do
   local e1=Effect.CreateEffect(token) e1:SetType(EFFECT_TYPE_SINGLE) e1:SetCode(set[1]) e1:SetValue(set[2])
   e1:SetReset(RESET_EVENT|RESETS_STANDARD&~RESET_TOFIELD) token:RegisterEffect(e1)
  end
 end
 Duel.SpecialSummonComplete()''',has_plant)
 if key=='machine_foundry':return event('EVENT_SPSUMMON_SUCCESS','local n=eg:FilterCount(function(c) return c:IsControler(0) and c:IsSummonType(SUMMON_TYPE_FUSION) end,nil) if n>0 then --[[relic-hint]] end for i=1,n do Duel.Hint(HINT_MESSAGE,0,900000003) end')
 if key=='swordsman_oath':return stat('EFFECT_UPDATE_ATTACK',400,'c:IsSetCard(SET_LV)')
 if key=='static_coil':
  # Shared label prevents mirrored copies from triggering one another forever.
  return event('EVENT_DAMAGE','Duel.Damage(1,200,REASON_EFFECT)','ep==1 and ev>0 and (r&REASON_EFFECT)~=0 and rp==0 and re~=nil and re:GetLabel()~=937202').replace('e:SetCode(EVENT_DAMAGE)','e:SetCode(EVENT_DAMAGE) e:SetLabel(937202)')
 if key=='counterweight':return stat('EFFECT_UPDATE_ATTACK','function() return 100*Duel.GetCounter(0,1,0,0x1) end')
 if key=='jar_of_echoes':
  valid='function(c) return c:IsFaceup() and c:IsCanTurnSet() end'
  return event('EVENT_PHASE|PHASE_STANDBY',f'--[[relic-ask]] Duel.Hint(HINT_SELECTMSG,0,HINTMSG_POSCHANGE) local g=Duel.SelectMatchingCard(0,{valid},0,LOCATION_MZONE,0,1,1,nil) if #g>0 then Duel.ChangePosition(g,POS_FACEDOWN_DEFENSE) end',f'Duel.GetTurnPlayer()==0 and Duel.IsExistingMatchingCard({valid},0,LOCATION_MZONE,0,1,nil)',True)
 if key=='ritual_incense':return event('EVENT_SPSUMMON_SUCCESS','Duel.Draw(0,1,REASON_EFFECT)','eg:IsExists(function(c) return c:IsControler(0) and c:IsSummonType(SUMMON_TYPE_RITUAL) end,1,nil)')
 if key=='village_banner':return stat('EFFECT_UPDATE_ATTACK',200,'c:IsLevel(4)')+'\n'+stat('EFFECT_UPDATE_DEFENSE',200,'c:IsLevel(4)')
 if key=='dragon_triumph':return event('EVENT_BATTLE_DESTROYING','Duel.Damage(1,500,REASON_EFFECT)','eg:IsExists(function(c) return c:IsControler(0) and c:IsRace(RACE_DRAGON) and c:IsStatus(STATUS_OPPO_BATTLE) end,1,nil)')
 # Magnet Warrior is set code 0x3066 (Alpha, Beta, Gamma); Valkyrion is a Magna Warrior (0x1066) and isn't searched.
 if key=='field_of_attraction':
  # Name Changer's "Magnet Warrior" is 0x2066 (data/archetypes.json), which 0x3066 does not match: its monsters never set
  # this off (Discord, 2026-11-20). The added set code counts; an original 0x2066 card (Panther Warrior) still does not.
  member='(c:IsSetCard(0x3066) or c:IsSetCard(0x2066) and not c:IsOriginalSetCard(0x2066))'
  magnet=f'function(c) return c:IsControler(0) and {member} end'
  return event('EVENT_SUMMON_SUCCESS',f'local sc=eg:Filter({magnet},nil):GetFirst() if not sc then return end local g=Duel.GetMatchingGroup(function(c) return c:IsMonster() and {member} and not c:IsCode(sc:GetCode()) and c:IsAbleToHand() end,0,LOCATION_DECK,0,nil) if #g==0 then return end --[[relic-ask]] Duel.Hint(HINT_SELECTMSG,0,HINTMSG_ATOHAND) local s=g:Select(0,1,1,nil) --[[relic-hint]] Duel.SendtoHand(s,nil,REASON_EFFECT) Duel.ConfirmCards(1,s)',f'eg:IsExists({magnet},1,nil)')
 if key=='armory_crest':return stat('EFFECT_UPDATE_ATTACK',300,'c:GetEquipCount()>0')
 if key=='metal_coating':return f'''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_STARTUP)
e:SetOperation(function(e) e:Reset() if Duel.IsExistingMatchingCard(Card.IsCode,0,LOCATION_HAND,0,1,nil,{METALMORPH}) then return end local g=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_DECK,0,nil,{METALMORPH}) if #g>0 then Duel.SendtoHand(g:GetFirst(),0,REASON_RULE) end end) Duel.RegisterEffect(e,0) end'''
 return None

def coins(run,events):
 # Each owned copy emits a hint for each genuine Fusion Summon, not revival.
 import approved_relics
 if not approved_relics.has(run,'machine_foundry'):return 0
 return 30*sum(e.get('kind')=='fusion_dividend' for e in events)
