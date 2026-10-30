"""Core-backed rules for the expanded regular artifact pool."""
def effect(kind,amount,attribute=''):
 from variant_relics import effect as variant_effect
 result=variant_effect(kind)
 if result is not None:return result
 from approved_relic_effects import effect as approved_effect
 result=approved_effect(kind)
 if result is not None:return result
 if kind=='loyalty':return '''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_CANNOT_CHANGE_CONTROL) e:SetTargetRange(LOCATION_MZONE,0) Duel.RegisterEffect(e,0) end'''
 if kind=='this_life_mine':return '''do local used=false local e=Effect.GlobalEffect()
e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PAY_LPCOST)
e:SetCondition(function(e,tp,eg,ep,ev) return not used and ep==0 and ev>0 end)
e:SetOperation(function(e,tp,eg,ep,ev) if used then return end used=true Duel.Recover(0,ev,REASON_EFFECT) end)
Duel.RegisterEffect(e,0) end'''
 if kind=='boss_monster':return '''do local used=false local e=Effect.GlobalEffect()
e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_CHAINING)
e:SetCondition(function(e,tp,eg,ep,ev,re) if used or ep~=1 or not re or not re:IsHasProperty(EFFECT_FLAG_CARD_TARGET) then return false end
 local g=Duel.GetChainInfo(ev,CHAININFO_TARGET_CARDS) return g and g:IsExists(function(c) return c:IsControler(0) and c:IsMonster() and c:IsLevelAbove(7) end,1,nil) end)
e:SetOperation(function(e,tp,eg,ep,ev) if not used then used=true Duel.NegateEffect(ev) end end)
Duel.RegisterEffect(e,0) end'''
 if kind=='swap_base_ad':return '''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_SWAP_BASE_AD)
e:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE) Duel.RegisterEffect(e,0) end'''
 if kind=='no_spirit_return':return '''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_SPIRIT_DONOT_RETURN)
e:SetTargetRange(LOCATION_MZONE,0) e:SetTarget(function(e,c) return c:IsType(TYPE_SPIRIT) end) Duel.RegisterEffect(e,0) end'''
 if kind=='archetype_atk':return f'''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_UPDATE_ATTACK) e:SetTargetRange(LOCATION_MZONE,0)
e:SetTarget(function(e,c) return c:IsFaceup() and c:IsSetCard({attribute}) end)
e:SetValue(function(e,c) return {amount}*Duel.GetMatchingGroupCount(function(m) return m:IsFaceup() and m:IsSetCard({attribute}) end,0,LOCATION_MZONE,LOCATION_MZONE,nil) end)
Duel.RegisterEffect(e,0) end'''
 if kind=='terrorking_atk':return f'''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_UPDATE_ATTACK) e:SetTargetRange(LOCATION_MZONE,0)
e:SetTarget(function(e,c) return c:IsFaceup() and c:IsCode({attribute}) end)
e:SetValue(function(e,c) return {amount}*Duel.GetMatchingGroupCount(function(m) return m~=c and m:IsFaceup() and m:IsSetCard(SET_ARCHFIEND) end,0,LOCATION_MZONE,LOCATION_MZONE,nil) end)
Duel.RegisterEffect(e,0) end'''
 if kind=='archfiend_cost':return '''do
 local standby_costs={}
 local function queue(c,amount,is_standby_monster)
  local refund=math.floor((tonumber(amount) or 0)/2)
  if refund<=0 then return end
  if is_standby_monster and standby_costs[c] then return end
  if is_standby_monster then standby_costs[c]=true end
  Duel.Recover(0,refund,REASON_EFFECT)
 end
 local paid=Effect.GlobalEffect()
 paid:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS)
 paid:SetCode(EVENT_PAY_LPCOST)
 paid:SetOperation(function(e,tp,eg,ep,ev,re,r,rp)
  local c=re and re:GetHandler()
  if ep==0 and c and c:IsSetCard(SET_ARCHFIEND) then
   local upkeep=Duel.GetTurnPlayer()==0 and Duel.IsPhase(PHASE_STANDBY) and c:IsMonster()
   queue(c,ev,upkeep)
  end
 end)
 Duel.RegisterEffect(paid,0)
 -- Pandemonium raises this event (its ID + 1; its search uses its ID) from its cost-replacement
 -- operation because replaced upkeep payments do not emit EVENT_PAY_LPCOST.
 local prevented=Effect.GlobalEffect()
 prevented:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS)
 prevented:SetCode(EVENT_CUSTOM+94585853)
 prevented:SetOperation(function(e,tp,eg,ep,ev,re,r,rp)
  local c=re and re:GetHandler()
  if ep==0 and c and c:IsControler(0) and c:IsMonster() and c:IsSetCard(SET_ARCHFIEND)
   and Duel.GetTurnPlayer()==0 and Duel.IsPhase(PHASE_STANDBY) then queue(c,ev,true) end
 end)
 Duel.RegisterEffect(prevented,0)
 local reset=Effect.GlobalEffect()
 reset:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS)
 reset:SetCode(EVENT_PHASE_START|PHASE_STANDBY)
 reset:SetCondition(function() return Duel.GetTurnPlayer()==0 end)
 reset:SetOperation(function() standby_costs={} end)
 Duel.RegisterEffect(reset,0)
end'''
 if kind=='retry_toss':return '''do
 local id=0x7f34a1
 local coin=Effect.GlobalEffect() coin:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) coin:SetCode(EVENT_TOSS_COIN_NEGATE)
 coin:SetCondition(function(e,tp,eg,ep) return ep==0 and Duel.GetFlagEffect(0,id)==0 end)
 coin:SetOperation(function(e,tp,eg,ep,ev) if Duel.GetFlagEffect(0,id)>0 or not Duel.SelectYesNo(0,0) then return end Duel.RegisterFlagEffect(0,id,RESET_PHASE|PHASE_END,0,1) Duel.TossCoin(ep,ev) end)
 Duel.RegisterEffect(coin,0)
 local dice=Effect.GlobalEffect() dice:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) dice:SetCode(EVENT_TOSS_DICE_NEGATE)
 dice:SetCondition(function(e,tp,eg,ep) return ep==0 and Duel.GetFlagEffect(0,id)==0 end)
 dice:SetOperation(function(e,tp,eg,ep,ev) if Duel.GetFlagEffect(0,id)>0 or not Duel.SelectYesNo(0,0) then return end Duel.RegisterFlagEffect(0,id,RESET_PHASE|PHASE_END,0,1) Duel.TossDice(ep,ev&0xff,ev>>16) end)
 Duel.RegisterEffect(dice,0)
end'''
 if kind=='tribute_free':return '''do
 local function install(code)
  local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(code) e:SetTargetRange(LOCATION_HAND,0)
  e:SetTarget(function(e,c) return c:IsMonster() and c:IsLevelAbove(7) end)
  e:SetValue(function(e,c) return 1 end) Duel.RegisterEffect(e,0)
 end
 install(EFFECT_DECREASE_TRIBUTE) install(EFFECT_DECREASE_TRIBUTE_SET)
end'''
 if kind=='fusion_time':return '''do
 local fusions=Duel.GetMatchingGroup(Card.IsType,0,LOCATION_EXTRA,0,nil,TYPE_FUSION)
 for fc in fusions:Iter() do
  local e=Effect.CreateEffect(fc) e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_SPSUMMON_PROC)
  e:SetProperty(EFFECT_FLAG_UNCOPYABLE) e:SetRange(LOCATION_EXTRA) e:SetValue(SUMMON_TYPE_FUSION)
  e:SetCondition(function(e,c)
   if c==nil then return true end
   local tp=c:GetControler() local mg=Duel.GetMatchingGroup(Card.IsAbleToGraveAsCost,tp,LOCATION_MZONE,0,nil)
   return c:IsCanBeSpecialSummoned(e,SUMMON_TYPE_FUSION,tp,true,false) and c:CheckFusionMaterial(mg,nil,tp)
  end)
  e:SetTarget(function(e,tp,eg,ep,ev,re,r,rp,chk,c)
   if chk==0 then local mg=Duel.GetMatchingGroup(Card.IsAbleToGraveAsCost,tp,LOCATION_MZONE,0,nil) return c:CheckFusionMaterial(mg,nil,tp) end
   local mg=Duel.GetMatchingGroup(Card.IsAbleToGraveAsCost,tp,LOCATION_MZONE,0,nil)
   local sg=c:SelectFusionMaterial(tp,mg,nil,tp)
   if not sg or #sg==0 then return false end sg:KeepAlive() e:SetLabelObject(sg) return true
  end)
  e:SetOperation(function(e,tp,eg,ep,ev,re,r,rp,c)
   local sg=e:GetLabelObject() if not sg then return end
   Duel.SendtoGrave(sg,REASON_MATERIAL|REASON_FUSION) sg:DeleteGroup() e:SetLabelObject(nil)
  end)
  fc:RegisterEffect(e)
 end
end'''
 if kind=='starting_field_spell':return '''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_STARTUP)
e:SetOperation(function(e) e:Reset() local g=Duel.GetMatchingGroup(function(c) return c:IsSpell() and c:IsType(TYPE_FIELD) and c:IsAbleToHand() end,0,LOCATION_DECK,0,nil) if #g>0 then Duel.SendtoHand(g:RandomSelect(0,1),0,REASON_RULE) end end) Duel.RegisterEffect(e,0) end'''
 if kind=='starting_low_level':return '''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_STARTUP)
e:SetOperation(function(e) e:Reset() local g=Duel.GetMatchingGroup(function(c) return c:IsMonster() and c:IsSetCard(0x41) and c:IsLevelAbove(1) and c:IsLevelBelow(4) and c:IsAbleToHand() end,0,LOCATION_DECK,0,nil) if #g>0 then Duel.SendtoHand(g:RandomSelect(0,1),0,REASON_RULE) end end) Duel.RegisterEffect(e,0) end'''
 if kind=='standby_zombie_revive':return '''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_STANDBY) e:SetCountLimit(1)
e:SetCondition(function() return Duel.GetTurnPlayer()==0 and Duel.GetFieldGroupCount(0,LOCATION_MZONE,0)==0 and Duel.GetLocationCount(0,LOCATION_MZONE)>0 end)
e:SetOperation(function(e) local g=Duel.GetMatchingGroup(function(c) return c:IsRace(RACE_ZOMBIE) and c:IsCanBeSpecialSummoned(e,0,0,false,false,POS_FACEUP_DEFENSE) end,0,LOCATION_GRAVE,0,nil) if #g>0 then Duel.SpecialSummon(g:RandomSelect(0,1),0,0,0,false,false,POS_FACEUP_DEFENSE) end end) Duel.RegisterEffect(e,0) end'''
 if kind=='starting_union':return '''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_STARTUP)
e:SetOperation(function(e) e:Reset() local g=Duel.GetMatchingGroup(function(c) return c:IsMonster() and c:IsType(TYPE_UNION) and c:IsAbleToHand() end,0,LOCATION_DECK,0,nil) if #g>0 then Duel.SendtoHand(g:RandomSelect(0,1),0,REASON_RULE) end end) Duel.RegisterEffect(e,0) end'''
 if kind=='starting_ritual':return '''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_STARTUP)
e:SetOperation(function(e) e:Reset() local g=Duel.GetMatchingGroup(function(c) return c:IsType(TYPE_RITUAL) and (c:IsMonster() or c:IsSpell()) and c:IsAbleToHand() end,0,LOCATION_DECK,0,nil) if #g>0 then Duel.SendtoHand(g:RandomSelect(0,1),0,REASON_RULE) end end) Duel.RegisterEffect(e,0) end'''
 if kind=='starting_level_up':return '''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_STARTUP)
e:SetOperation(function(e) e:Reset() if Duel.IsExistingMatchingCard(Card.IsCode,0,LOCATION_HAND,0,1,nil,25290459) then return end local g=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_DECK,0,nil,25290459) if #g>0 then Duel.SendtoHand(g:Select(0,1,1,nil),0,REASON_RULE) end end) Duel.RegisterEffect(e,0) end'''
 # Surgery relics: `attribute` lists every owned Surgery attribute ("LIGHT|FIRE"). The first replaces
 # your monsters' attribute and each further relic adds one; passives.py emits this once per duel.
 if kind=='attribute':
  value='|'.join('ATTRIBUTE_'+a for a in attribute.split('|') if a)
  return f'''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_CHANGE_ATTRIBUTE) e:SetTargetRange(LOCATION_HAND|LOCATION_DECK|LOCATION_GRAVE|LOCATION_MZONE,0) e:SetTarget(function(e,c) return c:IsMonster() end) e:SetValue({value}) Duel.RegisterEffect(e,0) end'''
 if kind=='overcharge':return f'''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_UPDATE_ATTACK) e:SetTargetRange(LOCATION_MZONE,0) e:SetTarget(function(e,c) return c:IsFaceup() and c:IsRace(RACE_THUNDER) end) e:SetValue(function(e,c) return {amount}*Duel.GetMatchingGroupCount(function(x) return x:IsFaceup() and x~=c and x:IsRace(RACE_THUNDER) end,0,LOCATION_MZONE,0,nil) end) Duel.RegisterEffect(e,0) end'''
 if kind=='kindred_bond':
  bonus=f'function(e,c) return {amount}*Duel.GetMatchingGroupCount(function(x) return x:IsFaceup() and x~=c and x:IsRace(c:GetRace()) end,0,LOCATION_MZONE,0,nil) end'
  return '\n'.join(f'''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode({code}) e:SetTargetRange(LOCATION_MZONE,0) e:SetTarget(function(e,c) return c:IsFaceup() end) e:SetValue({bonus}) Duel.RegisterEffect(e,0) end''' for code in ('EFFECT_UPDATE_ATTACK','EFFECT_UPDATE_DEFENSE'))
 if kind in ('backrow_atk','banished_atk'):
  location='LOCATION_ONFIELD' if kind=='backrow_atk' else 'LOCATION_REMOVED'
  check='c:IsFaceup() and c:IsSpellTrap()' if kind=='backrow_atk' else 'c:IsFaceup() and c:IsMonster()'
  return f'''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_UPDATE_ATTACK) e:SetTargetRange(LOCATION_MZONE,0) e:SetValue(function() return {amount}*Duel.GetMatchingGroupCount(function(c) return {check} end,0,{location},{location},nil) end) Duel.RegisterEffect(e,0) end'''
 if kind=='hand_level':return '''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_STANDBY) e:SetCountLimit(1)
e:SetCondition(function() return Duel.GetTurnPlayer()==0 end)
e:SetOperation(function()
 local g=Duel.GetMatchingGroup(function(c) return c:IsMonster() and c:IsLevelAbove(2) end,0,LOCATION_HAND,0,nil)
 if #g==0 then return end
 local c=g:RandomSelect(0,1):GetFirst()
 local d=Effect.CreateEffect(c) d:SetType(EFFECT_TYPE_SINGLE) d:SetCode(EFFECT_UPDATE_LEVEL) d:SetValue(-1) d:SetReset(RESET_EVENT|(RESETS_STANDARD&~RESET_TOFIELD)|RESET_PHASE|PHASE_END) c:RegisterEffect(d)
end) Duel.RegisterEffect(e,0) end'''
 if kind=='enemy_standby_burn':return f'''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_STANDBY) e:SetCountLimit(1) e:SetCondition(function() return Duel.GetTurnPlayer()==1 end) e:SetOperation(function() Duel.Damage(1,{amount},REASON_EFFECT) end) Duel.RegisterEffect(e,0) end'''
 if kind=='standby_bounce':return '''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_STANDBY) e:SetCountLimit(1) e:SetCondition(function() return Duel.GetTurnPlayer()==0 end)
e:SetOperation(function()
 local g=Duel.GetMatchingGroup(function(c) return c:IsSpellTrap() and c:IsAbleToHand() end,0,LOCATION_ONFIELD,LOCATION_ONFIELD,nil)
 if #g==0 then return end
 Duel.Hint(HINT_SELECTMSG,0,HINTMSG_RTOHAND)
 local chosen=g:Select(0,1,1,nil)
 Duel.SendtoHand(chosen,nil,REASON_EFFECT)
end) Duel.RegisterEffect(e,0) end'''
 if kind=='countdown':return '''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_ADJUST) e:SetOperation(function(e) e:Reset() local c=Duel.CreateToken(0,95308449) Duel.SendtoHand(c,0,REASON_RULE) end) Duel.RegisterEffect(e,0) end'''
 if kind=='field_double':return '''do
 for _,code in ipairs({EFFECT_UPDATE_ATTACK,EFFECT_UPDATE_DEFENSE}) do
  local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(code) e:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
  e:SetValue(function(e,c)
   local total=0
   for _,bonus in ipairs({c:GetCardEffect(code)}) do
    local source=bonus:GetHandler()
    if bonus~=e and source and source:IsControler(0) and source:IsLocation(LOCATION_FZONE) and source:IsFaceup() and source:IsType(TYPE_FIELD) and not source:IsDisabled() then
     local value=bonus:GetValue()
     if type(value)=='function' then value=value(bonus,c) end
     if type(value)=='number' and value>0 then total=total+value end
    end
   end
   return total
  end)
  Duel.RegisterEffect(e,0)
 end
end'''
 if kind=='third_banish':return '''do
 -- Cost-legality probes must predict redirection without advancing the counter.
 if not RogueGraveGate then
  RogueGraveGate={count=0,pending={},probing=0}
  local state=RogueGraveGate
  for _,name in ipairs({'IsAbleToGraveAsCost','IsAbleToHandAsCost','IsAbleToDeckAsCost','IsAbleToExtraAsCost','IsAbleToRemoveAsCost'}) do
   local original=Card[name]
   if original then Card[name]=function(...)
    state.probing=state.probing+1
    local result=table.pack(pcall(original,...))
    state.probing=state.probing-1
    if not result[1] then error(result[2]) end
    return table.unpack(result,2,result.n)
   end end
  end
  local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_TO_GRAVE_REDIRECT)
  e:SetProperty(EFFECT_FLAG_SET_AVAILABLE|EFFECT_FLAG_IGNORE_IMMUNE)
  e:SetTargetRange(LOCATION_ALL,LOCATION_ALL)
  e:SetTarget(function(e,c) return not c:IsType(TYPE_TOKEN) end)
  e:SetValue(function(e,c,r)
   if state.probing>0 then return (state.count+1)%3==0 and LOCATION_REMOVED or 0 end
   local ordinal=state.pending[c]
   if not ordinal then state.count=state.count+1 ordinal=state.count state.pending[c]=ordinal end
   return ordinal%3==0 and LOCATION_REMOVED or 0
  end)
  Duel.RegisterEffect(e,0)
  local moved=Effect.GlobalEffect() moved:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) moved:SetCode(EVENT_MOVE)
  moved:SetOperation(function(e,tp,eg) for c in eg:Iter() do state.pending[c]=nil end end)
  Duel.RegisterEffect(moved,0)
 end
end'''
 return None
