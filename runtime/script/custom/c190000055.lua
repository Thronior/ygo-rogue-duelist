-- Moth LV8 (user design, 2026-11-23): the Perfectly Ultimate Great Moth stage of the custom Moth LV line.
-- Cannot be Normal Summoned/Set. Cannot be destroyed by battle.
-- If this card destroys a monster by battle: Special Summon 1 "Moth Token" (Insect/EARTH/Level 3/ATK ?/DEF ?).
-- Its ATK/DEF are equal to the ATK/DEF the destroyed monster had on the field (user: "the atk and def it had on the field").
local s,id=GetID()
local TOKEN=190000057
function s.initial_effect(c)
	c:EnableUnsummonable()
	local e0=Effect.CreateEffect(c)
	e0:SetType(EFFECT_TYPE_SINGLE)
	e0:SetCode(EFFECT_INDESTRUCTABLE_BATTLE)
	e0:SetValue(1)
	c:RegisterEffect(e0)
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetCategory(CATEGORY_SPECIAL_SUMMON+CATEGORY_TOKEN)
	e1:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_F)
	e1:SetCode(EVENT_BATTLE_DESTROYING)
	e1:SetCondition(aux.bdcon)
	e1:SetTarget(s.tktg)
	e1:SetOperation(s.tkop)
	c:RegisterEffect(e1)
end
s.LVnum=8
function s.tktg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return true end
	-- Read the stats now: the destroyed monster's last values on the field, before anything else can move it again.
	local bc=e:GetHandler():GetBattleTarget()
	local atk=bc and math.max(bc:GetPreviousAttackOnField(),0) or 0
	local def=bc and math.max(bc:GetPreviousDefenseOnField(),0) or 0
	e:SetLabel(atk,def)
	Duel.SetOperationInfo(0,CATEGORY_TOKEN,nil,1,0,0)
	Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,0)
end
function s.tkop(e,tp,eg,ep,ev,re,r,rp)
	local atk,def=e:GetLabel()
	if Duel.GetLocationCount(tp,LOCATION_MZONE)<=0
		or not Duel.IsPlayerCanSpecialSummonMonster(tp,TOKEN,0,TYPES_TOKEN,atk,def,3,RACE_INSECT,ATTRIBUTE_EARTH) then return end
	local token=Duel.CreateToken(tp,TOKEN)
	if Duel.SpecialSummonStep(token,0,tp,tp,false,false,POS_FACEUP) then
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_SINGLE)
		e1:SetCode(EFFECT_SET_BASE_ATTACK)
		e1:SetValue(atk)
		e1:SetReset(RESET_EVENT|RESETS_STANDARD&~RESET_TOFIELD)
		token:RegisterEffect(e1)
		local e2=e1:Clone()
		e2:SetCode(EFFECT_SET_BASE_DEFENSE)
		e2:SetValue(def)
		token:RegisterEffect(e2)
	end
	Duel.SpecialSummonComplete()
end
