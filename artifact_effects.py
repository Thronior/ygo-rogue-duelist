"""Core-backed rules for the expanded regular artifact pool."""
def effect(kind,amount,attribute=''):
 from approved_relic_effects import effect as approved_effect
 result=approved_effect(kind)
 if result is not None:return result
 if kind=='attribute':return f'''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_CHANGE_ATTRIBUTE) e:SetTargetRange(LOCATION_MZONE,0) e:SetTarget(function(e,c) return c:IsFaceup() end) e:SetValue(ATTRIBUTE_{attribute}) Duel.RegisterEffect(e,0) end'''
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
 local d=Effect.CreateEffect(c) d:SetType(EFFECT_TYPE_SINGLE) d:SetCode(EFFECT_UPDATE_LEVEL) d:SetValue(-1) d:SetReset(RESET_EVENT|RESETS_STANDARD|RESET_PHASE|PHASE_END) c:RegisterEffect(d)
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
