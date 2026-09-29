// ocgcore-wasm 0.1.2 retries expired control changes forever when a returning
// trap monster has no Spell/Trap zone. In MR1 it still occupies both zone types.
// Apply the core's REASON_RULE destruction fallback for this otherwise
// unresolvable return; active/permanent control effects must remain untouched.
export const trapReturnCompatibility = `
local guard=Effect.GlobalEffect()
guard:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS)
guard:SetCode(EVENT_ADJUST)
guard:SetOperation(function()
 local g=Duel.GetMatchingGroup(function(c)
  return c:IsType(TYPE_TRAPMONSTER) and c:GetControler()~=c:GetOwner()
   and not c:IsHasEffect(EFFECT_SET_CONTROL) and c:IsAbleToChangeControler()
   and Duel.GetLocationCount(c:GetOwner(),LOCATION_SZONE)<=0
 end,0,LOCATION_MZONE,LOCATION_MZONE,nil)
 if #g>0 then Duel.Destroy(g,REASON_RULE) end
end)
Duel.RegisterEffect(guard,0)
`;
