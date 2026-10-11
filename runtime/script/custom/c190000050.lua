-- Preview-only custom Normal Spell. Campaign currency is emitted only on resolution.
local s,id=GetID()
function s.initial_effect(c)
 local e=Effect.CreateEffect(c)
 e:SetType(EFFECT_TYPE_ACTIVATE)
 e:SetCode(EVENT_FREE_CHAIN)
 e:SetOperation(s.operation)
 c:RegisterEffect(e)
end
function s.operation(e,tp,eg,ep,ev,re,r,rp)
 Duel.Hint(HINT_MESSAGE,tp,1900000050)
end
