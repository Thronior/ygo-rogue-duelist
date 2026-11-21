--ディメンション・ポッド
--Dimension Jar (original TCG print, Magician's Force)
--"FLIP: Both players can remove from play up to 3 monsters from their opponent's Graveyard."
--The official script follows the later errata ("cards"); the game shows the original print, so only monsters go
--(Discord report, 2026-11-20). Bundled under the card's own passcode by tools/build_android.py (data/pre-errata.json).
local s,id=GetID()
function s.initial_effect(c)
	--Banish
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetCategory(CATEGORY_REMOVE)
	e1:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_FLIP)
	e1:SetTarget(s.target)
	e1:SetOperation(s.operation)
	c:RegisterEffect(e1)
end
function s.target(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return true end
	Duel.SetPossibleOperationInfo(0,CATEGORY_REMOVE,nil,3,PLAYER_ALL,LOCATION_GRAVE)
end
function s.rmfilter(c,tp)
	return c:IsType(TYPE_MONSTER) and c:IsAbleToRemove(tp) and aux.SpElimFilter(c)
end
function s.pick(p,g)
	if not Duel.IsExistingMatchingCard(s.rmfilter,p,0,LOCATION_MZONE|LOCATION_GRAVE,1,nil,p) or not Duel.SelectYesNo(p,aux.Stringid(id,1)) then return end
	Duel.Hint(HINT_SELECTMSG,p,HINTMSG_REMOVE)
	local rg=Duel.SelectMatchingCard(p,s.rmfilter,p,0,LOCATION_MZONE|LOCATION_GRAVE,1,3,nil,p)
	Duel.HintSelection(rg,true)
	g:Merge(rg)
end
function s.operation(e,tp,eg,ep,ev,re,r,rp)
	local g=Group.CreateGroup()
	local p=Duel.GetTurnPlayer()
	s.pick(p,g)
	s.pick(1-p,g)
	Duel.Remove(g,POS_FACEUP,REASON_EFFECT)
end
