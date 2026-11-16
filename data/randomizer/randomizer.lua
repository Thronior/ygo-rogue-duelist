--Shadow Run card randomizer library (2026-11-15).
--A randomized card's script is one data table (s.rand) written by randomizer.py; Randomizer.Build turns it into
--real effects. Every block (condition, cost, effect, restriction, coin/dice, upkeep) is written once here, so a
--card made of blocks that passed randomizer.py's rules runs on code tools/test_randomizer_engine.mjs has played.
Randomizer={}
local R=Randomizer

local function relate(e,tc) return tc and tc:IsRelateToEffect(e) end

---------------------------------------------------------------- conditions
--State conditions check the board; they never decide timing.
R.State={
	your_turn=function(e,tp) return Duel.IsTurnPlayer(tp) end,
	lp_low=function(e,tp,p) return Duel.GetLP(tp)<=2000 end,
	lp_behind=function(e,tp,p) return Duel.GetLP(tp)<Duel.GetLP(1-tp) end,
	control_race=function(e,tp,p)
		return Duel.IsExistingMatchingCard(function(c) return c:IsFaceup() and c:IsRace(p.race) end,tp,LOCATION_MZONE,0,1,nil)
	end,
	opp_more=function(e,tp,p) return Duel.GetFieldGroupCount(tp,0,LOCATION_MZONE)>Duel.GetFieldGroupCount(tp,LOCATION_MZONE,0) end,
	gy_monsters=function(e,tp,p) return Duel.GetMatchingGroupCount(Card.IsMonster,tp,LOCATION_GRAVE,0,nil)>=p.n end,
	banished_monsters=function(e,tp,p) return Duel.GetMatchingGroupCount(Card.IsMonster,tp,LOCATION_REMOVED,0,nil)>=p.n end,
	banished_cards=function(e,tp,p) return Duel.GetFieldGroupCount(tp,LOCATION_REMOVED,0)>=p.n end,
	gy_empty=function(e,tp,p) return Duel.GetFieldGroupCount(tp,LOCATION_GRAVE,0)==0 end,
	main1=function(e,tp,p) return Duel.IsTurnPlayer(tp) and Duel.IsMainPhase() and Duel.GetCurrentPhase()==PHASE_MAIN1 end,
	banished_race_count=function(e,tp,p)
		local mask=0
		for _,race in ipairs(p.races or {}) do mask=mask|race end
		return mask~=0 and Duel.GetMatchingGroupCount(function(c) return c:IsMonster() and c:IsRace(mask) end,
			tp,LOCATION_REMOVED,0,nil)>=p.n
	end,
	opp_standby_phase=function(e,tp) return Duel.IsTurnPlayer(1-tp) and Duel.IsPhase(PHASE_STANDBY) end,
	--Win conditions: only an instant win uses these.
	win_turn=function(e,tp,p) return Duel.GetTurnCount()>=p.n end,
	win_gy=function(e,tp,p) return Duel.GetFieldGroupCount(tp,LOCATION_GRAVE,0)>=p.n end,
	win_banished=function(e,tp,p) return Duel.GetFieldGroupCount(tp,LOCATION_REMOVED,0)>=p.n end,
	win_hand=function(e,tp,p) return Duel.GetFieldGroupCount(tp,LOCATION_HAND,0)>=p.n end,
	win_field=function(e,tp,p) return Duel.GetFieldGroupCount(tp,LOCATION_MZONE,0)>=5 end,
	--Conditions of the unique mechanics (user's list of 50 cards).
	opp_turn=function(e,tp) return Duel.IsTurnPlayer(1-tp) end,
	opp_bp=function(e,tp) return Duel.IsTurnPlayer(1-tp) and Duel.IsBattlePhase() end,
	lp_gap=function(e,tp,p) return Duel.GetLP(1-tp)-Duel.GetLP(tp)>=p.n end,
	gy_cards=function(e,tp,p) return Duel.GetFieldGroupCount(tp,LOCATION_GRAVE,0)>=p.n end,
	kills=function(e,tp,p) return e:GetHandler():GetFlagEffect(191999001)>=p.n end,
	control_normals=function(e,tp,p)
		return Duel.IsExistingMatchingCard(function(c) return c:IsFaceup() and c:IsType(TYPE_NORMAL) and c:IsLevelBelow(2) end,tp,LOCATION_MZONE,0,p.n,nil)
	end,
	control_named=function(e,tp,p)
		for _,code in ipairs(p.codes) do
			if not Duel.IsExistingMatchingCard(aux.FaceupFilter(Card.IsCode,code),tp,LOCATION_ONFIELD,0,1,nil) then return false end
		end
		return true
	end,
	field_named=function(e,tp,p)
		return Duel.IsExistingMatchingCard(aux.FaceupFilter(Card.IsCode,p.code),tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,nil)
	end,
	not_damage_calculated=function() return not (Duel.IsPhase(PHASE_DAMAGE) and Duel.IsDamageCalculated()) end,
	opp_before_main2=function(e,tp) return Duel.IsTurnPlayer(1-tp) and Duel.GetCurrentPhase()<PHASE_MAIN2 end,
	hand_count=function(e,tp,p)
		local count=p.side=='opp' and Duel.GetFieldGroupCount(tp,0,LOCATION_HAND) or Duel.GetFieldGroupCount(tp,LOCATION_HAND,0)
		return p.mode=='min' and count>=(p.n or 0) or p.mode=='max' and count<=(p.n or 0)
	end,
	lp_max=function(e,tp,p) return Duel.GetLP(tp)<=(p.n or 0) end,
}
--Card flags the library keeps on its own cards (codes clear of real cards and of randomized card ids).
local FLAG_KILLS,FLAG_PLACED,FLAG_SNAKE,FLAG_CAPSULE=191999001,191999002,191999003,191999004
--The game's own win reason for randomized cards, apart from Exodia (0x10) and Destiny Board (0x15), which have
--their own finale and sleeves.
R.WIN_REASON=0x60
--Timings. single: the card's own event. field: something happening on the field while this card is there.
local real_sel
R.Event={
	quick={code=EVENT_FREE_CHAIN,quick=true},
	summoned={single=true,code=EVENT_SUMMON_SUCCESS,delay=true},
	special_summoned={single=true,code=EVENT_SPSUMMON_SUCCESS,delay=true,
		con=function(e) local c=e:GetHandler() return c:IsFusionSummoned() or c:IsRitualSummoned() end},
	flip={single=true,flip=true,code=EVENT_FLIP,delay=true},
	flip_summoned={single=true,code=EVENT_FLIP_SUMMON_SUCCESS,delay=true,forced=true},
	normal_summoned_mandatory={single=true,code=EVENT_SUMMON_SUCCESS,forced=true},
	any_special_summoned={single=true,code=EVENT_SPSUMMON_SUCCESS,delay=true,forced=true},
	special_summoned_from_gy={single=true,code=EVENT_SPSUMMON_SUCCESS,delay=true,forced=true,
		con=function(e) return e:GetHandler():GetPreviousLocation()==LOCATION_GRAVE end},
	sent_to_gy={build=function(p)
		return {single=true,code=EVENT_TO_GRAVE,delay=true,forced=p.mandatory,damage_step=p.damage_step,
			con=function(e,tp)
				local c=e:GetHandler()
				if not c:IsLocation(LOCATION_GRAVE) then return false end
				local prev=c:GetPreviousLocation()
				if p.from=='hand' then return prev==LOCATION_HAND end
				if p.from=='field' then
					return c:GetPreviousControler()==tp and (prev&(LOCATION_MZONE|LOCATION_SZONE))~=0
				end
				return true
			end}
	end},
	summon_trigger={build=function(p)
		local event_codes={normal=EVENT_SUMMON_SUCCESS,flip=EVENT_FLIP_SUMMON_SUCCESS,special=EVENT_SPSUMMON_SUCCESS}
		local codes={}
		for _,method in ipairs(p.methods or {'normal','flip','special'}) do
			if event_codes[method] then codes[#codes+1]=event_codes[method] end
		end
		return {single=true,code=codes[1] or EVENT_SUMMON_SUCCESS,codes=codes,delay=true,forced=p.mandatory}
	end},
	tribute_summoned={single=true,code=EVENT_SUMMON_SUCCESS,delay=true,forced=true,
		con=function(e) return e:GetHandler():IsTributeSummoned() end},
	destroyed={single=true,code=EVENT_TO_GRAVE,delay=true,
		con=function(e) local c=e:GetHandler() return c:IsReason(REASON_DESTROY) and c:IsPreviousLocation(LOCATION_ONFIELD) end},
	destroyed_mandatory={single=true,code=EVENT_TO_GRAVE,delay=true,forced=true,
		con=function(e) local c=e:GetHandler() return c:IsReason(REASON_DESTROY) and c:IsPreviousLocation(LOCATION_ONFIELD) end},
	attacks_faceup_defense={single=true,code=EVENT_BATTLE_START,forced=true,
		con=function(e)
			local c=e:GetHandler()
			local tc=Duel.GetAttackTarget()
			return Duel.GetAttacker()==c and tc~=nil and tc:IsFaceup() and tc:IsDefensePos() and tc:IsRelateToBattle()
		end},
	end_phase_mandatory={code=EVENT_PHASE+PHASE_END,once=true,forced=true,
		con=function(e,tp) return Duel.IsTurnPlayer(tp) end},
	attacked_not_destroyed={single=true,code=EVENT_BATTLED,forced=true,
		con=function(e)
			local c=e:GetHandler()
			local attacker=Duel.GetAttacker()
			return Duel.GetAttackTarget()==c and attacker~=nil and not attacker:IsStatus(STATUS_BATTLE_DESTROYED)
		end},
	leaves_field_faceup={single=true,code=EVENT_LEAVE_FIELD,delay=true,
		con=function(e)
			local c=e:GetHandler()
			return c:IsPreviousLocation(LOCATION_ONFIELD) and c:IsPreviousPosition(POS_FACEUP)
		end},
	destroyed_anywhere={single=true,code=EVENT_DESTROYED,delay=true,damage_step=true},
	battle_opponent_not_destroyed={single=true,code=EVENT_DAMAGE_STEP_END,forced=true,
		con=function(e,tp)
			local c=e:GetHandler()
			local tc=c:GetBattleTarget()
			return tc~=nil and tc:IsRelateToBattle() and tc:GetControler()==1-tp and not tc:IsStatus(STATUS_BATTLE_DESTROYED)
		end},
	battle_destroyed={single=true,code=EVENT_BATTLE_DESTROYED,
		con=function(e) local c=e:GetHandler() return c:IsLocation(LOCATION_GRAVE) and c:IsReason(REASON_BATTLE) end},
	battle_destroyed_mandatory={single=true,code=EVENT_BATTLE_DESTROYED,forced=true,
		con=function(e) local c=e:GetHandler() return c:IsLocation(LOCATION_GRAVE) and c:IsReason(REASON_BATTLE) end},
	hand_discarded_by_opp={single=true,code=EVENT_TO_GRAVE,delay=true,forced=true,con=function(e,tp)
		local c=e:GetHandler()
		return c:IsPreviousLocation(LOCATION_HAND) and c:IsPreviousControler(tp) and c:IsReason(REASON_EFFECT)
			and c:IsReason(REASON_DISCARD) and c:GetReasonPlayer()==1-tp
	end},
	hand_sent_by_opp={single=true,code=EVENT_TO_GRAVE,delay=true,forced=true,con=function(e,tp)
		local c=e:GetHandler()
		return c:IsPreviousLocation(LOCATION_HAND) and c:IsPreviousControler(tp) and c:IsReason(REASON_EFFECT)
			and c:GetReasonPlayer()==1-tp
	end},
	destroyed_not_battle={single=true,code=EVENT_TO_GRAVE,delay=true,forced=true,con=function(e)
		local c=e:GetHandler()
		return c:IsLocation(LOCATION_GRAVE) and c:IsPreviousLocation(LOCATION_ONFIELD) and c:IsReason(REASON_DESTROY) and not c:IsReason(REASON_BATTLE)
	end},
	battle_destroying={single=true,code=EVENT_BATTLE_DESTROYING,con=function(...) return aux.bdocon(...) end},
	direct_damage={single=true,code=EVENT_BATTLE_DAMAGE,con=function(e,tp,eg,ep) return ep~=tp and Duel.GetAttackTarget()==nil end},
	standby={code=EVENT_PHASE+PHASE_STANDBY,once=true,con=function(e,tp) return Duel.IsTurnPlayer(tp) end},
	standby_defense={code=EVENT_PHASE+PHASE_STANDBY,once=true,forced=true,
		con=function(e,tp)
			local c=e:GetHandler()
			return Duel.IsTurnPlayer(tp) and c:IsFaceup() and c:IsDefensePos()
		end},
	standby_mandatory={code=EVENT_PHASE+PHASE_STANDBY,once=true,forced=true,
		con=function(e,tp) return Duel.IsTurnPlayer(tp) end},
	activate_type_any={build=function(p)
		local typ=p.card_type=='trap' and TYPE_TRAP or TYPE_SPELL
		return {code=EVENT_CHAINING,quick=true,con=function(e,tp,eg,ep,ev,re,r,rp)
			local c=re and re:GetHandler()
			return c and (p.side~='opp' or rp~=tp) and (not p.battle_phase or Duel.IsBattlePhase())
				and re:IsHasType(EFFECT_TYPE_ACTIVATE) and c:IsType(typ)
				and (p.stype~='equip' or c:IsType(TYPE_EQUIP)) and Duel.IsChainNegatable(ev)
		end}
	end},
	opp_attack={code=EVENT_ATTACK_ANNOUNCE,con=function(e,tp) return Duel.GetAttacker():IsControler(1-tp) end},
	opp_normal_summon={code=EVENT_SUMMON_SUCCESS,con=function(e,tp,eg,ep) return ep~=tp end},
	opp_normal_draw={code=EVENT_DRAW,con=function(e,tp,eg,ep,ev,re,r) return ep~=tp and (r&REASON_RULE)~=0 end},
	opp_flip_summon={code=EVENT_FLIP_SUMMON_SUCCESS,con=function(e,tp,eg,ep) return ep~=tp end},
	summon_event={build=function(p)
		local event_codes={normal=EVENT_SUMMON_SUCCESS,flip=EVENT_FLIP_SUMMON_SUCCESS,special=EVENT_SPSUMMON_SUCCESS}
		local codes={}
		for _,method in ipairs(p.methods or {}) do if event_codes[method] then codes[#codes+1]=event_codes[method] end end
		return {code=codes[1] or EVENT_SUMMON_SUCCESS,codes=codes,delay=true,forced=p.mandatory,
			con=function(e,tp,eg,ep)
				if p.side=='opp' and ep==tp then return false end
				if not eg then return false end
				if p.exclude_self then
					return eg:IsExists(function(c) return c~=e:GetHandler() and real_sel(c,p) end,1,nil)
				end
				return eg:IsExists(real_sel,1,nil,p)
			end}
	end},
	summon_event_cont={build=function(p) return R.Event.summon_event.build(p) end},
	summon_event_cont_spell={build=function(p) return R.Event.summon_event.build(p) end},
	opp_summon={code=EVENT_SUMMON_SUCCESS,trap_code2=EVENT_SPSUMMON_SUCCESS,delay=true,
		con=function(e,tp,eg) return eg:IsExists(Card.IsSummonPlayer,1,nil,1-tp) end},
	opp_activate={code=EVENT_CHAINING,quick=true,con=function(e,tp,eg,ep,ev,re,r,rp) return rp==1-tp and Duel.IsChainNegatable(ev) end},
	opp_activate_st={code=EVENT_CHAINING,quick=true,
		con=function(e,tp,eg,ep,ev,re,r,rp) return rp==1-tp and re:IsHasType(EFFECT_TYPE_ACTIVATE) and Duel.IsChainNegatable(ev) end},
	opp_summon_try={code=EVENT_SUMMON,code2=EVENT_SPSUMMON,
		con=function(e,tp,eg) return Duel.GetCurrentChain()==0 and eg:IsExists(Card.IsSummonPlayer,1,nil,1-tp) end},
	--Timings of the unique mechanics.
	battle_damage={single=true,code=EVENT_BATTLE_DAMAGE,con=function(e,tp,eg,ep) return ep~=tp end},
	sent_gy={single=true,code=EVENT_TO_GRAVE,delay=true},
	destroyed_by_opp={single=true,code=EVENT_TO_GRAVE,delay=true,con=function(e,tp)
		local c=e:GetHandler()
		return c:IsReason(REASON_DESTROY) and c:GetReasonPlayer()==1-tp and c:IsPreviousControler(tp) and c:IsPreviousLocation(LOCATION_ONFIELD)
	end},
	sent_by_opp={single=true,code=EVENT_TO_GRAVE,delay=true,con=function(e,tp)
		local c=e:GetHandler()
		return c:IsReason(REASON_EFFECT) and c:GetReasonPlayer()==1-tp and c:IsPreviousControler(tp)
	end},
	end_phase={code=EVENT_PHASE+PHASE_END,once=true,con=function(e,tp) return Duel.IsTurnPlayer(tp) end},
	--A coin tossed by this player that landed on Heads (Time Wizard's success opens Dark Sage).
	coin_heads={code=EVENT_TOSS_COIN,delay=true,con=function(e,tp,eg,ep,ev)
		if ep~=tp then return false end
		local res={Duel.GetCoinResult()}
		for i=1,math.max(ev,1) do if res[i]==COIN_HEADS then return true end end
		return false
	end},
	targeted_st={code=EVENT_CHAINING,quick=true,con=function(e,tp,eg,ep,ev,re,r,rp)
		if rp~=1-tp or not re:IsHasType(EFFECT_TYPE_ACTIVATE) or not re:IsHasProperty(EFFECT_FLAG_CARD_TARGET) then return false end
		local tg=Duel.GetChainInfo(ev,CHAININFO_TARGET_CARDS)
		return tg and tg:IsContains(e:GetHandler()) and Duel.IsChainNegatable(ev)
	end},
}

---------------------------------------------------------------- costs
R.Cost={
	discard={check=function(e,tp,p) return Duel.IsExistingMatchingCard(Card.IsDiscardable,tp,LOCATION_HAND,0,p.n,e:GetHandler()) end,
		pay=function(e,tp,p) Duel.DiscardHand(tp,Card.IsDiscardable,p.n,p.n,REASON_COST+REASON_DISCARD,e:GetHandler()) end},
	lp={check=function(e,tp,p) return Duel.CheckLPCost(tp,p.n) end,pay=function(e,tp,p) Duel.PayLPCost(tp,p.n) end},
	tribute_self={check=function(e,tp,p) return e:GetHandler():IsReleasable() end,
		pay=function(e,tp,p) Duel.Release(e:GetHandler(),REASON_COST) end},
	tribute_other={check=function(e,tp,p) return Duel.CheckReleaseGroupCost(tp,aux.TRUE,1,false,nil,e:GetHandler()) end,
		pay=function(e,tp,p) local g=Duel.SelectReleaseGroupCost(tp,aux.TRUE,1,1,false,nil,e:GetHandler()) Duel.Release(g,REASON_COST) end},
	banish_gy={check=function(e,tp,p) return Duel.IsExistingMatchingCard(Card.IsAbleToRemoveAsCost,tp,LOCATION_GRAVE,0,p.n,e:GetHandler()) end,
		pay=function(e,tp,p)
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)
			local g=Duel.SelectMatchingCard(tp,Card.IsAbleToRemoveAsCost,tp,LOCATION_GRAVE,0,p.n,p.n,e:GetHandler())
			Duel.Remove(g,POS_FACEUP,REASON_COST)
		end},
	mill_self={check=function(e,tp,p) return Duel.IsPlayerCanDiscardDeckAsCost(tp,p.n) end,
		pay=function(e,tp,p) Duel.DiscardDeck(tp,p.n,REASON_COST) end},
	banish_self={check=function(e,tp,p) return e:GetHandler():IsAbleToRemoveAsCost() end,
		pay=function(e,tp,p) Duel.Remove(e:GetHandler(),POS_FACEUP,REASON_COST) end},
	send_self={check=function(e,tp,p) return e:GetHandler():IsAbleToGraveAsCost() end,
		pay=function(e,tp,p) Duel.SendtoGrave(e:GetHandler(),REASON_COST) end},
	send_self_mzone={check=function(e,tp,p) return e:GetHandler():IsAbleToGraveAsCost() end,
		pay=function(e,tp,p) Duel.SendtoGrave(e:GetHandler(),REASON_COST) end},
	banish_top_deck={check=function(e,tp,p)
		return Duel.GetFieldGroupCount(tp,LOCATION_DECK,0)>=p.n
			and Duel.IsExistingMatchingCard(Card.IsAbleToRemoveAsCost,tp,LOCATION_DECK,0,p.n,nil)
	end,
		pay=function(e,tp,p)
			Duel.DisableShuffleCheck()
			Duel.Remove(Duel.GetDecktopGroup(tp,p.n),POS_FACEUP,REASON_COST)
		end},
	tribute_recover_stat={check=function(e,tp,p)
		if p.mode=='atk' then return Duel.IsExistingMatchingCard(Card.IsAbleToGraveAsCost,tp,LOCATION_MZONE,0,1,nil) end
		return Duel.CheckReleaseGroupCost(tp,function(c) return c:GetAttack()>0 or c:GetDefense()>0 end,1,false,nil,nil)
	end,
		pay=function(e,tp,p)
			local c
			if p.mode=='atk' then
				Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TOGRAVE)
				c=Duel.SelectMatchingCard(tp,Card.IsAbleToGraveAsCost,tp,LOCATION_MZONE,0,1,1,nil):GetFirst()
				local n=c:GetTextAttack()
				if n<0 then n=0 end
				e:SetLabel(n)
				Duel.SendtoGrave(c,REASON_COST)
			else
				c=Duel.SelectReleaseGroupCost(tp,function(tc) return tc:GetAttack()>0 or tc:GetDefense()>0 end,1,1,false,nil,nil):GetFirst()
				local atk,def=c:GetAttack(),c:GetDefense()
				local useatk=atk>0
				if atk>0 and def>0 then useatk=Duel.SelectOption(tp,0,1)==0 end
				e:SetLabel(useatk and atk or def)
				Duel.Release(c,REASON_COST)
			end
		end},
	--Reversal Quiz: everything else you hold and control.
	send_all={check=function(e,tp)
			local g=Duel.GetFieldGroup(tp,LOCATION_HAND|LOCATION_ONFIELD,0) g:RemoveCard(e:GetHandler())
			return #g>0 and not g:IsExists(function(c) return not c:IsAbleToGraveAsCost() end,1,nil)
		end,
		pay=function(e,tp)
			local g=Duel.GetFieldGroup(tp,LOCATION_HAND|LOCATION_ONFIELD,0) g:RemoveCard(e:GetHandler())
			Duel.SendtoGrave(g,REASON_COST)
		end},
	discard_spell={check=function(e,tp)
			return Duel.IsExistingMatchingCard(function(c) return c:IsSpell() and c:IsDiscardable() end,tp,LOCATION_HAND,0,1,e:GetHandler())
		end,
		pay=function(e,tp) Duel.DiscardHand(tp,function(c) return c:IsSpell() and c:IsDiscardable() end,1,1,REASON_COST|REASON_DISCARD,e:GetHandler()) end},
}

---------------------------------------------------------------- effects
--check: can it happen now; prep: choose targets and announce (operation info); op: do it. m multiplies amounts (die).
local function opp_target(cat,hint,filter)
	return {cat=cat,target=true,loc1=0,loc2=LOCATION_MZONE,filter=filter,hint=hint}
end
local function targeted(a)
	a.check=function(e,tp,eg,ep,ev,re,r,rp,p)
		return Duel.IsExistingTarget(a.filter,tp,a.loc1,a.loc2,1,e:GetHandler(),e,tp,p)
	end
	a.prep=function(e,tp,eg,ep,ev,re,r,rp,p)
		Duel.Hint(HINT_SELECTMSG,tp,a.hint)
		local g=Duel.SelectTarget(tp,a.filter,tp,a.loc1,a.loc2,1,1,e:GetHandler(),e,tp,p)
		Duel.SetOperationInfo(0,a.cat,g,1,0,0)
	end
	return a
end
local function add_from(loc,filter,hint,cat)
	return {cat=cat,
		check=function(e,tp,eg,ep,ev,re,r,rp,p) return Duel.IsExistingMatchingCard(filter,tp,loc,0,1,nil,e,tp,p) end,
		prep=function(e,tp,eg,ep,ev,re,r,rp,p) Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,loc) end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p)
			Duel.Hint(HINT_SELECTMSG,tp,hint)
			local g=Duel.SelectMatchingCard(tp,filter,tp,loc,0,1,1,nil,e,tp,p)
			if #g>0 then Duel.SendtoHand(g,nil,REASON_EFFECT) Duel.ConfirmCards(1-tp,g) end
		end}
end
local function summon_from(loc)
	local f=function(c,e,tp) return c:IsLevelBelow(4) and c:IsCanBeSpecialSummoned(e,0,tp,false,false) end
	return {cat=CATEGORY_SPECIAL_SUMMON,
		check=function(e,tp) return Duel.GetLocationCount(tp,LOCATION_MZONE)>0 and Duel.IsExistingMatchingCard(f,tp,loc,0,1,e:GetHandler(),e,tp) end,
		prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,loc) end,
		op=function(e,tp)
			if Duel.GetLocationCount(tp,LOCATION_MZONE)<=0 then return end
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
			local g=Duel.SelectMatchingCard(tp,aux.NecroValleyFilter(f),tp,loc,0,1,1,e:GetHandler(),e,tp)
			if #g>0 then Duel.SpecialSummon(g,0,tp,tp,false,false,POS_FACEUP) end
		end}
end
local function self_boost(code,value)
	return {cat=code==EFFECT_UPDATE_ATTACK and CATEGORY_ATKCHANGE or 0,
		check=function(e) return e:GetHandler():IsFaceup() end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p,m)
			local c=e:GetHandler()
			if not (c:IsRelateToEffect(e) and c:IsFaceup()) then return end
			local e1=Effect.CreateEffect(c)
			e1:SetType(EFFECT_TYPE_SINGLE)
			e1:SetCode(code)
			if value then e1:SetValue(value(p,m)) end
			e1:SetReset(RESETS_STANDARD_DISABLE_PHASE_END)
			c:RegisterEffect(e1)
		end}
end
local weak=function(c,e,tp,p) return c:IsFaceup() and c:IsAttackBelow(p.n) end
local function real_ss_loc(p)
	if p.zone=='deck' then return LOCATION_DECK end
	if p.zone=='gy' then return LOCATION_GRAVE end
	if p.zone=='banished' then return LOCATION_REMOVED end
	if p.zone=='deck_hand' then return LOCATION_DECK|LOCATION_HAND end
	return LOCATION_HAND
end
local function real_ss_filter(c,e,tp,p)
	return real_sel(c,p) and c:IsMonster() and (not p.race or c:IsRace(p.race)) and (not p.attr or c:IsAttribute(p.attr))
		and (not p.level_max or c:IsLevelBelow(p.level_max)) and (not p.atk_max or c:IsAttackBelow(p.atk_max))
		and c:IsCanBeSpecialSummoned(e,0,tp,false,false)
end
local function real_mass_group(tp,p)
	if p.side=='opp' then return Duel.GetMatchingGroup(aux.TRUE,tp,0,LOCATION_MZONE,nil) end
	if p.side=='you' then return Duel.GetMatchingGroup(aux.TRUE,tp,LOCATION_MZONE,0,nil) end
	return Duel.GetFieldGroup(tp,LOCATION_MZONE,LOCATION_MZONE)
end
--Selector of the real-card blocks (recreation): one table of parameters says which cards a block talks about.
--kind (monster|spell|trap|st), stype (spell/trap sub-type), race, attr, level_max/level_min/level_eq, atk_max/atk_min,
--def_max, faceup, facedown, pos (attack|defense), token, normal, frame, codes, special, equipped.
local REAL_STYPE={continuous=TYPE_CONTINUOUS,equip=TYPE_EQUIP,field=TYPE_FIELD,quick=TYPE_QUICKPLAY,ritual=TYPE_RITUAL,counter=TYPE_COUNTER}
local REAL_FRAME={normal=TYPE_NORMAL,effect=TYPE_EFFECT,fusion=TYPE_FUSION,ritual=TYPE_RITUAL,spirit=TYPE_SPIRIT,union=TYPE_UNION,flip=TYPE_FLIP,toon=TYPE_TOON,gemini=TYPE_GEMINI}
real_sel=function(c,p)
	if p.faceup and not c:IsFaceup() then return false end
	if p.facedown and not c:IsFacedown() then return false end
	local k=p.kind
	if k=='monster' and not c:IsMonster() then return false end
	if k=='spell' and not c:IsSpell() then return false end
	if k=='trap' and not c:IsTrap() then return false end
	if k=='st' and not c:IsSpellTrap() then return false end
	if p.stype and not c:IsType(REAL_STYPE[p.stype]) then return false end
	if p.race and not c:IsRace(p.race) then return false end
	if p.attr and not c:IsAttribute(p.attr) then return false end
	if p.level_max and not c:IsLevelBelow(p.level_max) then return false end
	if p.level_min and not c:IsLevelAbove(p.level_min) then return false end
	if p.level_eq and not c:IsLevel(p.level_eq) then return false end
	if p.atk_max and not (c:IsMonster() and c:IsAttackBelow(p.atk_max)) then return false end
	if p.atk_min and not (c:IsMonster() and c:IsAttackAbove(p.atk_min)) then return false end
	if p.def_min and not (c:IsMonster() and c:IsDefenseAbove(p.def_min)) then return false end
	if p.def_max and not (c:IsMonster() and c:IsDefenseBelow(p.def_max)) then return false end
	if p.pos=='attack' and not c:IsAttackPos() then return false end
	if p.pos=='defense' and not c:IsDefensePos() then return false end
	if p.token and not c:IsType(TYPE_TOKEN) then return false end
	if p.not_token and c:IsType(TYPE_TOKEN) then return false end
	if p.normal and not c:IsType(TYPE_NORMAL) then return false end
	if p.normal_summonable and not c:IsSummonableCard() then return false end
	if p.frame and not c:IsType(REAL_FRAME[p.frame]) then return false end
	if p.codes and not c:IsCode(table.unpack(p.codes)) then return false end
	if p.setcode and not c:IsSetCard(p.setcode) then return false end
	if p.special and not c:IsSummonType(SUMMON_TYPE_SPECIAL) then return false end
	if p.equipped and c:GetEquipGroup():GetCount()==0 then return false end
	return true
end
local REAL_LOC={mzone=LOCATION_MZONE,st=LOCATION_SZONE,field=LOCATION_ONFIELD,gy=LOCATION_GRAVE,hand=LOCATION_HAND,
	deck=LOCATION_DECK,banished=LOCATION_REMOVED}
--The two location arguments (yours, your opponent's) of a block with side (you|opp|both) and zone.
local function real_locs(p)
	local l=p.zone=='hand_field' and (LOCATION_HAND|LOCATION_ONFIELD) or REAL_LOC[p.zone or 'mzone']
	if p.side=='opp' then return 0,l end
	if p.side=='both' then return l,l end
	return l,0
end
local function real_group(tp,p,except)
	local l1,l2=real_locs(p)
	return Duel.GetMatchingGroup(real_sel,tp,l1,l2,except,p)
end
--Moves a group where p.to says (destroy|hand|grave|banish|deck|decktop|facedown|defense|attack).
local function real_move(g,p)
	if #g==0 then return 0 end
	local to=p.to or 'destroy'
	if to=='destroy' then return Duel.Destroy(g,REASON_EFFECT)
	elseif to=='hand' then return Duel.SendtoHand(g,nil,REASON_EFFECT)
	elseif to=='grave' then return Duel.SendtoGrave(g,REASON_EFFECT)
	elseif to=='banish' then return Duel.Remove(g,POS_FACEUP,REASON_EFFECT)
	elseif to=='deck' then return Duel.SendtoDeck(g,nil,SEQ_DECKSHUFFLE,REASON_EFFECT)
	elseif to=='decktop' then return Duel.SendtoDeck(g,nil,SEQ_DECKTOP,REASON_EFFECT)
	elseif to=='facedown' then return Duel.ChangePosition(g,POS_FACEDOWN_DEFENSE)
	elseif to=='defense' then return Duel.ChangePosition(g,POS_FACEUP_DEFENSE)
	elseif to=='attack' then return Duel.ChangePosition(g,POS_FACEUP_ATTACK)
	elseif to=='toggle' then return Duel.ChangePosition(g,POS_FACEUP_DEFENSE,0,POS_FACEUP_ATTACK,0) end
	return 0
end
local REAL_MOVE_CAT={destroy=CATEGORY_DESTROY,hand=CATEGORY_TOHAND,grave=CATEGORY_TOGRAVE,banish=CATEGORY_REMOVE,
	deck=CATEGORY_TODECK,decktop=CATEGORY_TODECK,facedown=CATEGORY_POSITION,defense=CATEGORY_POSITION,attack=CATEGORY_POSITION,toggle=CATEGORY_POSITION}
local function real_can_move(c,p)
	local to=p.to or 'destroy'
	if to=='destroy' then return true
	elseif to=='hand' then return c:IsAbleToHand()
	elseif to=='grave' then return c:IsAbleToGrave()
	elseif to=='banish' then return c:IsAbleToRemove()
	elseif to=='deck' or to=='decktop' then return c:IsAbleToDeck()
	else return c:IsCanChangePosition() end
end
--You control (side you, default) or your opponent controls at least p.n (default 1) cards the selector names.
R.State.control_sel=function(e,tp,p)
	local l1,l2=real_locs(p)
	return Duel.IsExistingMatchingCard(real_sel,tp,l1,l2,p.n or 1,nil,p)
end
R.State.opp_lp_above=function(e,tp,p) return Duel.GetLP(1-tp)>p.n end
R.State.can_enter_bp=function() return Duel.IsAbleToEnterBP() end
--Send p.n cards the selector names from your hand to the GY as a cost.
local function real_send_hand_filter(c,p) return real_sel(c,p) and c:IsAbleToGraveAsCost() end
R.Cost.send_hand={check=function(e,tp,p) return Duel.IsExistingMatchingCard(real_send_hand_filter,tp,LOCATION_HAND,0,p.n or 1,e:GetHandler(),p) end,
	pay=function(e,tp,p)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TOGRAVE)
		local g=Duel.SelectMatchingCard(tp,real_send_hand_filter,tp,LOCATION_HAND,0,p.n or 1,p.n or 1,e:GetHandler(),p)
		Duel.SendtoGrave(g,REASON_COST)
	end}
R.Cost.lp_half={check=function(e,tp) return Duel.GetLP(tp)>1 end,
	pay=function(e,tp) Duel.PayLPCost(tp,math.floor(Duel.GetLP(tp)/2)) end}
local function real_tribute_filter(c,tp,p)
	if not real_sel(c,p) then return false end
	if p.ensure_def then
		return Duel.IsExistingMatchingCard(function(tc,atk) return tc:IsFaceup() and tc:IsDefenseBelow(atk) end,
			tp,LOCATION_MZONE,LOCATION_MZONE,1,c,c:GetAttack())
	end
	return true
end
R.Cost.tribute_sel={
	check=function(e,tp,p) return Duel.CheckReleaseGroupCost(tp,real_tribute_filter,p.n or 1,false,nil,nil,tp,p) end,
	pay=function(e,tp,p)
		local n=p.n or 1
		local g=Duel.SelectReleaseGroupCost(tp,real_tribute_filter,n,n,false,nil,nil,tp,p)
		if p.save_attack and #g>0 then e:SetLabel(g:GetFirst():GetAttack()) end
		Duel.Release(g,REASON_COST)
	end}
local function real_extreme_group(tp,p)
	local g=real_group(tp,p,nil)
	if #g==0 then return g end
	local value=function(c) return p.stat=='DEF' and c:GetDefense() or c:GetAttack() end
	if p.extreme=='low' then return g:GetMinGroup(value) end
	return g:GetMaxGroup(value)
end
R.Act={
	draw={cat=CATEGORY_DRAW,check=function(e,tp,eg,ep,ev,re,r,rp,p) return Duel.IsPlayerCanDraw(tp,p.n) end,
		prep=function(e,tp,eg,ep,ev,re,r,rp,p) Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,tp,p.n) end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p) Duel.Draw(tp,p.n,REASON_EFFECT) end},
	recover={cat=CATEGORY_RECOVER,prep=function(e,tp,eg,ep,ev,re,r,rp,p) Duel.SetOperationInfo(0,CATEGORY_RECOVER,nil,0,tp,p.n) end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p,m) Duel.Recover(tp,p.n*m,REASON_EFFECT) end},
	damage={cat=CATEGORY_DAMAGE,prep=function(e,tp,eg,ep,ev,re,r,rp,p) Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,1-tp,p.n) end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p,m) Duel.Damage(1-tp,p.n*m,REASON_EFFECT) end},
	damage_self={cat=CATEGORY_DAMAGE,prep=function(e,tp,eg,ep,ev,re,r,rp,p) Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,tp,p.n) end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p,m) Duel.Damage(tp,p.n*m,REASON_EFFECT) end},
	recover_tribute_stat={cat=CATEGORY_RECOVER,
		prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_RECOVER,nil,0,tp,e:GetLabel()) end,
		op=function(e,tp) Duel.Recover(tp,e:GetLabel(),REASON_EFFECT) end},
	destroy_attack_target={cat=CATEGORY_DESTROY,
		check=function() local tc=Duel.GetAttackTarget() return tc~=nil and tc:IsFaceup() and tc:IsDefensePos() and tc:IsRelateToBattle() end,
		prep=function(e,tp) local tc=Duel.GetAttackTarget() Duel.SetOperationInfo(0,CATEGORY_DESTROY,tc,1,0,0) end,
		op=function(e) local tc=Duel.GetAttackTarget() if tc and tc:IsRelateToBattle() and tc:IsDefensePos() then Duel.Destroy(tc,REASON_EFFECT) end end},
	reveal_opp_set_all={cat=0,check=function(e,tp) return Duel.IsExistingMatchingCard(Card.IsFacedown,tp,0,LOCATION_ONFIELD,1,nil) end,
		op=function(e,tp)
			local g=Duel.GetMatchingGroup(Card.IsFacedown,tp,0,LOCATION_ONFIELD,nil)
			if #g>0 then Duel.ConfirmCards(tp,g) end
		end},
	reveal_destroy_set_mon={cat=CATEGORY_DESTROY,target=true,loc1=0,loc2=LOCATION_MZONE,
		filter=function(c) return c:IsFacedown() end,
		check=function(e,tp) return Duel.IsExistingMatchingCard(Card.IsFacedown,tp,0,LOCATION_MZONE,1,nil) end,
		prep=function(e,tp)
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TARGET)
			local g=Duel.SelectTarget(tp,Card.IsFacedown,tp,0,LOCATION_MZONE,1,1,nil)
			Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,#g,0,0)
		end,
		op=function(e,tp)
			local tc=Duel.GetFirstTarget()
			if tc and tc:IsRelateToEffect(e) and tc:IsFacedown() then
				Duel.ConfirmCards(tp,tc)
				if tc:IsType(TYPE_EFFECT) then Duel.Destroy(tc,REASON_EFFECT) end
			end
		end},
	spell_counter_all={cat=CATEGORY_COUNTER,
		op=function(e,tp)
			local g=Duel.GetMatchingGroup(function(c) return c:IsFaceup() and c:IsCanAddCounter(COUNTER_SPELL,1) end,
				tp,LOCATION_ONFIELD,LOCATION_ONFIELD,nil)
			for tc in aux.Next(g) do tc:AddCounter(COUNTER_SPELL,1) end
		end},
	return_self_hand={cat=CATEGORY_TOHAND,
		check=function(e) local c=e:GetHandler() return c:IsFaceup() and c:IsAbleToHand() end,
		prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_TOHAND,e:GetHandler(),1,0,0) end,
		op=function(e) local c=e:GetHandler() if c:IsRelateToEffect(e) and c:IsFaceup() then Duel.SendtoHand(c,nil,REASON_EFFECT) end end},
	return_battle_target={cat=CATEGORY_TOHAND,
		prep=function(e,tp) local tc=e:GetHandler():GetBattleTarget() if tc then Duel.SetOperationInfo(0,CATEGORY_TOHAND,tc,1,0,0) end end,
		op=function(e,tp)
			local tc=e:GetHandler():GetBattleTarget()
			if tc and tc:IsRelateToBattle() and tc:GetControler()==1-tp then Duel.SendtoHand(tc,nil,REASON_EFFECT) end
		end},
	ss_mokey_any_gy={cat=CATEGORY_SPECIAL_SUMMON,
		check=function(e,tp)
			return Duel.GetLocationCount(tp,LOCATION_MZONE)>0 and Duel.IsExistingMatchingCard(function(c)
				return c:IsCode(27288416) and c:IsCanBeSpecialSummoned(e,0,tp,false,false)
			end,tp,LOCATION_GRAVE,0,1,nil)
		end,
		prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,0,tp,LOCATION_GRAVE) end,
		op=function(e,tp)
			local ft=Duel.GetLocationCount(tp,LOCATION_MZONE)
			if ft<=0 then return end
			local g=Duel.GetMatchingGroup(function(c) return c:IsCode(27288416) and c:IsCanBeSpecialSummoned(e,0,tp,false,false) end,
				tp,LOCATION_GRAVE,0,nil)
			if #g>ft then g=g:Select(tp,ft,ft,nil) end
			if #g>0 then Duel.SpecialSummon(g,0,tp,tp,false,false,POS_FACEUP) end
		end},
	damage_both={cat=CATEGORY_DAMAGE,prep=function(e,tp,eg,ep,ev,re,r,rp,p) Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,PLAYER_ALL,p.n+p.d) end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p,m)
		Duel.Damage(1-tp,p.n*m,REASON_EFFECT,true)
		Duel.Damage(tp,p.d*m,REASON_EFFECT,true)
		Duel.RDComplete()
	end},
	destroy_st=targeted({cat=CATEGORY_DESTROY,target=true,loc1=0,loc2=LOCATION_ONFIELD,hint=HINTMSG_DESTROY,
		filter=function(c) return c:IsSpellTrap() end,
		op=function(e) local tc=Duel.GetFirstTarget() if relate(e,tc) then Duel.Destroy(tc,REASON_EFFECT) end end}),
	destroy_mon=targeted({cat=CATEGORY_DESTROY,target=true,loc1=0,loc2=LOCATION_MZONE,hint=HINTMSG_DESTROY,filter=aux.TRUE,
		op=function(e) local tc=Duel.GetFirstTarget() if relate(e,tc) then Duel.Destroy(tc,REASON_EFFECT) end end}),
	destroy_all_monsters={cat=CATEGORY_DESTROY,
		check=function(e,tp,eg,ep,ev,re,r,rp,p) return #real_mass_group(tp,p)>0 end,
		prep=function(e,tp,eg,ep,ev,re,r,rp,p)
			local g=real_mass_group(tp,p)
			Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,#g,0,0)
		end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p) Duel.Destroy(real_mass_group(tp,p),REASON_EFFECT) end},
	destroy_weak={cat=CATEGORY_DESTROY,
		check=function(e,tp,eg,ep,ev,re,r,rp,p) return Duel.IsExistingMatchingCard(weak,tp,0,LOCATION_MZONE,1,nil,e,tp,p) end,
		prep=function(e,tp,eg,ep,ev,re,r,rp,p)
			local g=Duel.GetMatchingGroup(weak,tp,0,LOCATION_MZONE,nil,e,tp,p)
			Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,#g,0,0)
		end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p) Duel.Destroy(Duel.GetMatchingGroup(weak,tp,0,LOCATION_MZONE,nil,e,tp,p),REASON_EFFECT) end},
	bounce_mon=targeted({cat=CATEGORY_TOHAND,target=true,loc1=0,loc2=LOCATION_MZONE,hint=HINTMSG_RTOHAND,
		filter=function(c) return c:IsAbleToHand() end,
		op=function(e) local tc=Duel.GetFirstTarget() if relate(e,tc) then Duel.SendtoHand(tc,nil,REASON_EFFECT) end end}),
	bounce_all_opp_mon={cat=CATEGORY_TOHAND,
		check=function(e,tp) return Duel.IsExistingMatchingCard(Card.IsAbleToHand,tp,0,LOCATION_MZONE,1,nil) end,
		prep=function(e,tp)
			local g=Duel.GetMatchingGroup(Card.IsAbleToHand,tp,0,LOCATION_MZONE,nil)
			Duel.SetOperationInfo(0,CATEGORY_TOHAND,g,#g,0,0)
		end,
		op=function(e,tp) Duel.SendtoHand(Duel.GetMatchingGroup(Card.IsAbleToHand,tp,0,LOCATION_MZONE,nil),nil,REASON_EFFECT) end},
	stat_mod_target=targeted({cat=0,target=true,loc1=LOCATION_MZONE,loc2=LOCATION_MZONE,hint=HINTMSG_FACEUP,
		filter=function(c) return c:IsFaceup() end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p,m)
			local tc=Duel.GetFirstTarget()
			if not (relate(e,tc) and tc:IsFaceup()) then return end
			local code,value
			if p.mode=='half' then code=EFFECT_SET_BASE_ATTACK value=math.floor(tc:GetBaseAttack()/2)
			elseif p.mode=='set' then code=p.stat=='DEF' and EFFECT_SET_DEFENSE_FINAL or EFFECT_SET_ATTACK_FINAL value=p.n
			elseif p.stat=='DEF' then code=EFFECT_UPDATE_DEFENSE value=p.n
			else code=EFFECT_UPDATE_ATTACK value=p.n end
			local e1=Effect.CreateEffect(e:GetHandler())
			e1:SetType(EFFECT_TYPE_SINGLE) e1:SetCode(code) e1:SetValue(value) e1:SetReset(RESETS_STANDARD_PHASE_END)
			tc:RegisterEffect(e1)
		end}),
	atk_down=targeted({cat=CATEGORY_ATKCHANGE,target=true,loc1=0,loc2=LOCATION_MZONE,hint=HINTMSG_FACEUP,
		filter=function(c) return c:IsFaceup() end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p,m)
			local tc=Duel.GetFirstTarget()
			if not (relate(e,tc) and tc:IsFaceup()) then return end
			local e1=Effect.CreateEffect(e:GetHandler())
			e1:SetType(EFFECT_TYPE_SINGLE)
			e1:SetCode(EFFECT_UPDATE_ATTACK)
			e1:SetValue(-p.n*m)
			e1:SetReset(RESETS_STANDARD_PHASE_END)
			tc:RegisterEffect(e1)
		end}),
	pos_def=targeted({cat=CATEGORY_POSITION,target=true,loc1=0,loc2=LOCATION_MZONE,hint=HINTMSG_POSCHANGE,
		filter=function(c) return c:IsAttackPos() and c:IsCanChangePosition() end,
		op=function(e) local tc=Duel.GetFirstTarget() if relate(e,tc) and tc:IsAttackPos() then Duel.ChangePosition(tc,POS_FACEUP_DEFENSE) end end}),
	self_set={cat=CATEGORY_POSITION,check=function(e) return e:GetHandler():IsCanTurnSet() end,
		op=function(e) local c=e:GetHandler() if c:IsRelateToEffect(e) and c:IsFaceup() then Duel.ChangePosition(c,POS_FACEDOWN_DEFENSE) end end},
	no_battle_damage_turn={cat=0,op=function(e,tp)
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_FIELD)
		e1:SetCode(EFFECT_AVOID_BATTLE_DAMAGE)
		e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e1:SetTargetRange(1,0)
		e1:SetValue(1)
		e1:SetReset(RESET_PHASE|PHASE_END)
		Duel.RegisterEffect(e1,tp)
	end},
	indes_battle_turn={cat=0,op=function(e,tp)
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_FIELD)
		e1:SetCode(EFFECT_INDESTRUCTABLE_BATTLE)
		e1:SetTargetRange(LOCATION_MZONE,0)
		e1:SetValue(1)
		e1:SetReset(RESET_PHASE|PHASE_END)
		Duel.RegisterEffect(e1,tp)
	end},
	prevent_effect_damage_turn={cat=CATEGORY_DAMAGE,op=function(e,tp)
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_FIELD)
		e1:SetCode(EFFECT_CHANGE_DAMAGE)
		e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e1:SetTargetRange(1,0)
		e1:SetValue(function(se,re,val,reason) return (reason&REASON_EFFECT)~=0 and 0 or val end)
		e1:SetReset(RESET_PHASE|PHASE_END)
		Duel.RegisterEffect(e1,tp)
		local e2=e1:Clone()
		e2:SetCode(EFFECT_NO_EFFECT_DAMAGE)
		e2:SetReset(RESET_PHASE|PHASE_END)
		Duel.RegisterEffect(e2,tp)
	end},
	search_race=add_from(LOCATION_DECK,function(c,e,tp,p) return c:IsMonster() and c:IsRace(p.race) and c:IsAbleToHand() end,HINTMSG_ATOHAND,CATEGORY_TOHAND+CATEGORY_SEARCH),
	search_spell=add_from(LOCATION_DECK,function(c) return c:IsSpell() and c:IsAbleToHand() end,HINTMSG_ATOHAND,CATEGORY_TOHAND+CATEGORY_SEARCH),
	gy_to_hand=add_from(LOCATION_GRAVE,function(c) return c:IsMonster() and c:IsAbleToHand() end,HINTMSG_ATOHAND,CATEGORY_TOHAND),
	revive=summon_from(LOCATION_GRAVE),
	ss_hand=summon_from(LOCATION_HAND),
	mill_opp={cat=CATEGORY_DECKDES,check=function(e,tp,eg,ep,ev,re,r,rp,p) return Duel.IsPlayerCanDiscardDeck(1-tp,p.n) end,
		prep=function(e,tp,eg,ep,ev,re,r,rp,p) Duel.SetOperationInfo(0,CATEGORY_DECKDES,nil,0,1-tp,p.n) end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p) Duel.DiscardDeck(1-tp,p.n,REASON_EFFECT) end},
	discard_opp={cat=CATEGORY_HANDES,check=function(e,tp) return Duel.GetFieldGroupCount(tp,0,LOCATION_HAND)>0 end,
		prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_HANDES,nil,0,1-tp,1) end,
		op=function(e,tp)
			local g=Duel.GetFieldGroup(tp,0,LOCATION_HAND)
			if #g>0 then Duel.SendtoGrave(g:RandomSelect(tp,1),REASON_EFFECT+REASON_DISCARD) end
		end},
	banish_opp_gy={cat=CATEGORY_REMOVE,check=function(e,tp) return Duel.IsExistingMatchingCard(Card.IsAbleToRemove,tp,0,LOCATION_GRAVE,1,nil) end,
		prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_REMOVE,nil,1,1-tp,LOCATION_GRAVE) end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p)
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)
			local g=Duel.SelectMatchingCard(tp,aux.NecroValleyFilter(Card.IsAbleToRemove),tp,0,LOCATION_GRAVE,1,p.n,nil)
			if #g>0 then Duel.Remove(g,POS_FACEUP,REASON_EFFECT) end
		end},
	self_atk=self_boost(EFFECT_UPDATE_ATTACK,function(p,m) return p.n*m end),
	self_atk_permanent={cat=CATEGORY_ATKCHANGE,
		check=function(e) return e:GetHandler():IsFaceup() end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p)
			local c=e:GetHandler()
			if not (c:IsRelateToEffect(e) and c:IsFaceup()) then return end
			local e1=Effect.CreateEffect(c)
			e1:SetType(EFFECT_TYPE_SINGLE)
			e1:SetCode(EFFECT_UPDATE_ATTACK)
			e1:SetValue(p.n or 0)
			e1:SetReset(RESET_EVENT|RESETS_STANDARD)
			c:RegisterEffect(e1)
		end},
	self_def_permanent={cat=CATEGORY_DEFCHANGE,
		check=function(e) return e:GetHandler():IsFaceup() end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p)
			local c=e:GetHandler()
			if not (c:IsRelateToEffect(e) and c:IsFaceup()) then return end
			local e1=Effect.CreateEffect(c)
			e1:SetType(EFFECT_TYPE_SINGLE)
			e1:SetCode(EFFECT_UPDATE_DEFENSE)
			e1:SetValue(p.n or 0)
			e1:SetReset(RESET_EVENT|RESETS_STANDARD)
			c:RegisterEffect(e1)
		end},
	reduce_battle_opponent_both={cat=CATEGORY_ATKCHANGE+CATEGORY_DEFCHANGE,
		op=function(e,tp,eg,ep,ev,re,r,rp,p)
			local c=e:GetHandler()
			local tc=Duel.GetAttacker()
			if c==tc then tc=Duel.GetAttackTarget() end
			if not tc or not tc:IsRelateToBattle() then return end
			for _,code in ipairs({EFFECT_UPDATE_ATTACK,EFFECT_UPDATE_DEFENSE}) do
				local e1=Effect.CreateEffect(c)
				e1:SetType(EFFECT_TYPE_SINGLE)
				e1:SetCode(code)
				e1:SetValue(-p.n)
				e1:SetReset(RESET_EVENT|RESETS_STANDARD)
				tc:RegisterEffect(e1)
			end
		end},
	self_pierce=self_boost(EFFECT_PIERCE),
	self_direct=self_boost(EFFECT_DIRECT_ATTACK),
	no_attack_opp={cat=0,op=function(e,tp)
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_FIELD)
		e1:SetCode(EFFECT_CANNOT_ATTACK_ANNOUNCE)
		e1:SetTargetRange(0,LOCATION_MZONE)
		e1:SetReset(RESET_PHASE+PHASE_END)
		Duel.RegisterEffect(e1,tp)
	end},
	negate_attack={cat=0,op=function() Duel.NegateAttack() end},
	--The conditions are checked again on resolution: if one stopped holding (a card left the GY), nothing happens.
	win={cat=0,op=function(e,tp,eg,ep,ev,re,r,rp,p,m,rand)
		for _,q in ipairs(rand.conds) do local f=R.State[q.k] if f and not f(e,tp,q) then return end end
		Duel.Win(tp,R.WIN_REASON)
	end},
	destroy_attacker={cat=CATEGORY_DESTROY,check=function() return Duel.GetAttacker()~=nil end,
		prep=function() Duel.SetOperationInfo(0,CATEGORY_DESTROY,Duel.GetAttacker(),1,0,0) end,
		op=function() local a=Duel.GetAttacker() if a and a:IsRelateToBattle() then Duel.Destroy(a,REASON_EFFECT) end end},
	negate_activation={cat=CATEGORY_NEGATE+CATEGORY_DESTROY,
		prep=function(e,tp,eg,ep,ev,re)
			Duel.SetOperationInfo(0,CATEGORY_NEGATE,eg,1,0,0)
			if re:GetHandler():IsDestructable() and re:GetHandler():IsRelateToEffect(re) then Duel.SetOperationInfo(0,CATEGORY_DESTROY,eg,1,0,0) end
		end,
		op=function(e,tp,eg,ep,ev,re)
			if Duel.NegateActivation(ev) and re:GetHandler():IsRelateToEffect(re) then Duel.Destroy(eg,REASON_EFFECT) end
		end},
	negate_summon={cat=CATEGORY_DISABLE_SUMMON+CATEGORY_DESTROY,
		prep=function(e,tp,eg) Duel.SetOperationInfo(0,CATEGORY_DISABLE_SUMMON,eg,#eg,0,0) Duel.SetOperationInfo(0,CATEGORY_DESTROY,eg,#eg,0,0) end,
		op=function(e,tp,eg) Duel.NegateSummon(eg) Duel.Destroy(eg,REASON_EFFECT) end},
	destroy_summoned={cat=CATEGORY_DESTROY,target=true,
		check=function(e,tp,eg) return eg:IsExists(Card.IsSummonPlayer,1,nil,1-tp) end,
		prep=function(e,tp,eg)
			local g=eg:Filter(Card.IsSummonPlayer,nil,1-tp)
			Duel.SetTargetCard(g)
			Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,#g,0,0)
		end,
		op=function(e)
			local g=Duel.GetTargetCards(e):Filter(Card.IsLocation,nil,LOCATION_MZONE)
			if #g>0 then Duel.Destroy(g,REASON_EFFECT) end
		end},
	move_summoned={catf=function(p) return p.to=='banish' and CATEGORY_REMOVE or CATEGORY_DESTROY end,target=true,
		loc1=0,loc2=LOCATION_MZONE,locs=function(p) if p.side=='any' then return LOCATION_MZONE,LOCATION_MZONE end return 0,LOCATION_MZONE end,
		filter=function(c,e,tp,p) return real_sel(c,p) end,
		check=function(e,tp,eg,ep,ev,re,r,rp,p) return eg and eg:IsExists(real_sel,1,nil,p) end,
		prep=function(e,tp,eg,ep,ev,re,r,rp,p)
			local g=eg:Filter(real_sel,nil,p)
			Duel.SetTargetCard(g)
			Duel.SetOperationInfo(0,p.to=='banish' and CATEGORY_REMOVE or CATEGORY_DESTROY,g,#g,0,0)
		end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p)
			local g=Duel.GetTargetCards(e):Filter(function(c,p) return c:IsLocation(LOCATION_MZONE) and real_sel(c,p) end,nil,p)
			if #g==0 then return end
			if p.to=='banish' then Duel.Remove(g,POS_FACEUP,REASON_EFFECT) else Duel.Destroy(g,REASON_EFFECT) end
		end},
	damage_attacker_atk={cat=CATEGORY_DAMAGE,target=true,loc1=0,loc2=LOCATION_MZONE,
		filter=function(c) return c==Duel.GetAttacker() end,
		check=function(e) local a=Duel.GetAttacker() return a and a:IsOnField() and a:IsCanBeEffectTarget(e) end,
		prep=function(e,tp)
			local a=Duel.GetAttacker()
			if a then Duel.SetTargetCard(a) Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,1-tp,a:GetAttack()) end
		end,
		op=function(e,tp)
			local tc=Duel.GetFirstTarget()
			if relate(e,tc) and Duel.NegateAttack() then Duel.Damage(1-tp,tc:GetAttack(),REASON_EFFECT) end
		end},
	recover_attacker_atk={cat=CATEGORY_RECOVER,target=true,loc1=0,loc2=LOCATION_MZONE,
		filter=function(c) return c==Duel.GetAttacker() end,
		check=function(e,tp,eg,ep,ev,re,r,rp,p)
			local a=Duel.GetAttacker()
			return a and a:IsOnField() and a:IsCanBeEffectTarget(e) and (not p.negate or a:CanAttack())
		end,
		prep=function(e,tp)
			local a=Duel.GetAttacker()
			if a then Duel.SetTargetCard(a) Duel.SetOperationInfo(0,CATEGORY_RECOVER,nil,0,tp,a:GetAttack()) end
		end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p)
			local tc=Duel.GetFirstTarget()
			if not (relate(e,tc) and tc:IsFaceup()) then return end
			if not p.negate or Duel.NegateAttack(tc) then Duel.Recover(tp,tc:GetAttack(),REASON_EFFECT) end
		end},
	end_battle_phase={cat=0,target=true,loc1=0,loc2=LOCATION_MZONE,
		filter=function(c) return c==Duel.GetAttacker() end,
		check=function(e) local a=Duel.GetAttacker() return a and a:IsOnField() and a:IsCanBeEffectTarget(e) end,
		prep=function() local a=Duel.GetAttacker() if a then Duel.SetTargetCard(a) end end,
		op=function(e,tp)
			local tc=Duel.GetFirstTarget()
			if relate(e,tc) and Duel.NegateAttack() then Duel.SkipPhase(1-tp,PHASE_BATTLE,RESET_PHASE|PHASE_BATTLE_STEP,1) end
		end},
	destroy_extreme={cat=CATEGORY_DESTROY,
		check=function(e,tp,eg,ep,ev,re,r,rp,p) return #real_extreme_group(tp,p)>0 end,
		prep=function(e,tp,eg,ep,ev,re,r,rp,p)
			local g=real_extreme_group(tp,p)
			Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,#g,0,0)
		end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p)
			local g=real_extreme_group(tp,p)
			if #g==0 then return end
			if #g>1 then Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY) g=g:Select(tp,1,1,nil) Duel.HintSelection(g) end
			Duel.Destroy(g,REASON_EFFECT)
		end},
	destroy_banish_summoned={cat=CATEGORY_DESTROY+CATEGORY_REMOVE,
		check=function(e,tp,eg,ep,ev,re,r,rp,p)
			return eg and eg:IsExists(function(c,p) return real_sel(c,p) and c:IsAbleToRemove() end,1,nil,p)
		end,
		prep=function(e,tp,eg,ep,ev,re,r,rp,p)
			local g=eg:Filter(function(c,p) return real_sel(c,p) and c:IsAbleToRemove() end,nil,p)
			Duel.SetTargetCard(g)
			Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,#g,0,0)
			Duel.SetOperationInfo(0,CATEGORY_REMOVE,g,#g,0,0)
		end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p)
			local g=Duel.GetTargetCards(e):Filter(function(c,p)
				return c:IsRelateToEffect(e) and c:IsLocation(LOCATION_MZONE) and real_sel(c,p) and c:IsAbleToRemove()
			end,nil,p)
			if #g>0 then Duel.Destroy(g,REASON_EFFECT,LOCATION_REMOVED) end
		end},
	set_defense_summoned={cat=CATEGORY_POSITION,
		check=function(e,tp,eg) return eg and eg:IsExists(function(c) return c:IsFaceup() and c:IsAttackPos() and c:IsCanChangePosition() end,1,nil) end,
		prep=function(e,tp,eg)
			if eg then
				local g=eg:Filter(function(c) return c:IsFaceup() and c:IsAttackPos() and c:IsCanChangePosition() end,nil)
				Duel.SetOperationInfo(0,CATEGORY_POSITION,g,#g,0,0)
			end
		end,
		op=function(e,tp,eg)
			local c=e:GetHandler()
			if not c:IsRelateToEffect(e) or not eg then return end
			local g=eg:Filter(function(tc) return tc:IsFaceup() and tc:IsAttackPos() and tc:IsCanChangePosition() end,nil)
			if #g>0 then Duel.ChangePosition(g,POS_FACEUP_DEFENSE) end
		end},
	damage_per_sel={cat=CATEGORY_DAMAGE,player_target=true,
		check=function(e,tp,eg,ep,ev,re,r,rp,p) return #real_group(tp,p,nil)>0 end,
		prep=function(e,tp,eg,ep,ev,re,r,rp,p)
			local amount=(p.n or 0)*#real_group(tp,p,nil)
			Duel.SetTargetPlayer(1-tp) Duel.SetTargetParam(amount)
			Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,1-tp,amount)
		end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p)
			local amount=(p.n or 0)*#real_group(tp,p,nil)
			local player=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER)
			Duel.Damage(player,amount,REASON_EFFECT)
		end},
	recover_per_sel={cat=CATEGORY_RECOVER,player_target=true,
		check=function(e,tp,eg,ep,ev,re,r,rp,p) return #real_group(tp,p,nil)>0 end,
		prep=function(e,tp,eg,ep,ev,re,r,rp,p)
			local amount=(p.n or 0)*#real_group(tp,p,nil)
			Duel.SetTargetPlayer(tp) Duel.SetTargetParam(amount)
			Duel.SetOperationInfo(0,CATEGORY_RECOVER,nil,0,tp,amount)
		end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p)
			local amount=(p.n or 0)*#real_group(tp,p,nil)
			local player=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER)
			Duel.Recover(player,amount,REASON_EFFECT)
		end},
	stat_mod_all={cat=CATEGORY_ATKCHANGE+CATEGORY_DEFCHANGE,
		check=function(e,tp,eg,ep,ev,re,r,rp,p) return #real_group(tp,p,nil)>0 end,
		prep=function(e,tp,eg,ep,ev,re,r,rp,p)
			local g=real_group(tp,p,nil)
			if table.concat(p.stats or {},' '):find('ATK') then Duel.SetOperationInfo(0,CATEGORY_ATKCHANGE,g,#g,0,0) end
			if table.concat(p.stats or {},' '):find('DEF') then Duel.SetOperationInfo(0,CATEGORY_DEFCHANGE,g,#g,0,0) end
		end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p,m)
			local g=real_group(tp,p,nil)
			local value=(p.sign=='minus' and -1 or 1)*(p.n or 0)*(m or 1)
			for tc in aux.Next(g) do
				for _,stat in ipairs(p.stats or {}) do
					local e1=Effect.CreateEffect(e:GetHandler())
					e1:SetType(EFFECT_TYPE_SINGLE)
					e1:SetCode(stat=='DEF' and EFFECT_UPDATE_DEFENSE or EFFECT_UPDATE_ATTACK)
					e1:SetValue(value)
					e1:SetReset(RESETS_STANDARD_PHASE_END)
					tc:RegisterEffect(e1)
				end
			end
		end},
	skip_phase={cat=0,
		op=function(e,tp,eg,ep,ev,re,r,rp,p)
			local player=p.side=='opp' and 1-tp or tp
			local e1=Effect.CreateEffect(e:GetHandler())
			e1:SetType(EFFECT_TYPE_FIELD)
			e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
			e1:SetTargetRange(player==tp and 1 or 0,player==1-tp and 1 or 0)
			if p.phase=='standby' then
				e1:SetCode(EFFECT_SKIP_SP)
				if Duel.IsTurnPlayer(player) and Duel.IsPhase(PHASE_STANDBY) then
					e1:SetCondition(function(e) return Duel.GetTurnCount()~=e:GetLabel() end)
					e1:SetLabel(Duel.GetTurnCount())
					e1:SetReset(RESET_PHASE|PHASE_STANDBY|RESET_SELF_TURN,2)
				else e1:SetReset(RESET_PHASE|PHASE_STANDBY|RESET_SELF_TURN) end
			else
				e1:SetCode(EFFECT_SKIP_BP)
				if Duel.IsTurnPlayer(player) and Duel.IsBattlePhase() then
					e1:SetCondition(function(e) return Duel.GetTurnCount()~=e:GetLabel() end)
					e1:SetLabel(Duel.GetTurnCount())
					e1:SetReset(RESET_PHASE|PHASE_BATTLE|RESET_OPPO_TURN,2)
				else e1:SetReset(RESET_PHASE|PHASE_BATTLE|RESET_OPPO_TURN) end
			end
			Duel.RegisterEffect(e1,tp)
		end},
	direct_attack_turn={cat=0,
		op=function(e,tp)
			local e1=Effect.CreateEffect(e:GetHandler())
			e1:SetType(EFFECT_TYPE_FIELD)
			e1:SetCode(EFFECT_IGNORE_BATTLE_TARGET)
			e1:SetTargetRange(0,LOCATION_MZONE)
			e1:SetProperty(EFFECT_FLAG_SET_AVAILABLE)
			e1:SetValue(1)
			e1:SetReset(RESET_PHASE|PHASE_END)
			Duel.RegisterEffect(e1,tp)
		end},
	no_damage_turn={cat=0,
		op=function(e,tp,eg,ep,ev,re,r,rp,p)
			local e1=Effect.CreateEffect(e:GetHandler())
			e1:SetType(EFFECT_TYPE_FIELD)
			e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
			e1:SetTargetRange(1,0)
			e1:SetReset(RESET_PHASE|PHASE_END)
			if p.kind=='battle' then e1:SetCode(EFFECT_AVOID_BATTLE_DAMAGE)
			else
				e1:SetCode(EFFECT_CHANGE_DAMAGE)
				e1:SetValue(function(e,re,val,r,rp,rc) return e:GetHandlerPlayer()~=rp and 0 or val end)
			end
			Duel.RegisterEffect(e1,tp)
		end},
	fire_darts={cat=CATEGORY_DICE+CATEGORY_DAMAGE,player_target=true,
		prep=function(e,tp)
			Duel.SetTargetPlayer(1-tp)
			Duel.SetOperationInfo(0,CATEGORY_DICE,nil,0,tp,3)
			Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,1-tp,0)
		end,
		op=function(e,tp)
			local d1,d2,d3=Duel.TossDice(tp,3)
			local player=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER)
			Duel.Damage(player,(d1+d2+d3)*100,REASON_EFFECT)
		end},
}
R.Act.negate_effect=R.Act.negate_activation
R.Act.destroy_any_mon=targeted({cat=CATEGORY_DESTROY,target=true,loc1=LOCATION_MZONE,loc2=LOCATION_MZONE,hint=HINTMSG_DESTROY,
	filter=aux.TRUE,op=function(e) local tc=Duel.GetFirstTarget() if relate(e,tc) then Duel.Destroy(tc,REASON_EFFECT) end end})
R.Act.reveal_deck_top={cat=0,
	check=function(e,tp) return Duel.GetFieldGroupCount(tp,0,LOCATION_DECK)>0 end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local ct=math.min(p.n or 5,Duel.GetFieldGroupCount(tp,0,LOCATION_DECK))
		if ct>0 then Duel.ConfirmDecktop(tp,ct) end
	end}
R.Act.discard_up_to={cat=CATEGORY_HANDES,
	check=function(e,tp,eg,ep,ev,re,r,rp,p)
		return Duel.IsExistingMatchingCard(real_sel,tp,LOCATION_HAND,0,1,nil,p)
	end,
	prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_HANDES,nil,0,tp,1) end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		Duel.DiscardHand(tp,function(c) return real_sel(c,p) end,1,p.n,REASON_EFFECT|REASON_DISCARD)
	end}
R.Act.shuffle_opp_hand_draw_same={cat=CATEGORY_TODECK+CATEGORY_DRAW,
	check=function(e,tp) return Duel.IsPlayerCanDraw(1-tp)
		and Duel.IsExistingMatchingCard(Card.IsAbleToDeck,tp,0,LOCATION_HAND,1,nil) end,
	prep=function(e,tp)
		Duel.SetOperationInfo(0,CATEGORY_TODECK,nil,1,1-tp,LOCATION_HAND)
		Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,1-tp,1)
	end,
	op=function(e,tp)
		local g=Duel.GetFieldGroup(tp,0,LOCATION_HAND)
		if #g==0 then return end
		Duel.SendtoDeck(g,nil,SEQ_DECKSHUFFLE,REASON_EFFECT)
		Duel.ShuffleDeck(1-tp)
		Duel.BreakEffect()
		Duel.Draw(1-tp,#g,REASON_EFFECT)
	end}
R.Act.no_attack_facedown_turn={cat=0,
	op=function(e,tp)
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_FIELD)
		e1:SetCode(EFFECT_CANNOT_SELECT_BATTLE_TARGET)
		e1:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
		e1:SetValue(function(se,c) return c:IsFacedown() end)
		e1:SetReset(RESET_PHASE|PHASE_END,1)
		Duel.RegisterEffect(e1,tp)
	end}
R.Act.all_your_monsters_dragon_turn={cat=0,
	check=function(e,tp) return Duel.IsExistingMatchingCard(Card.IsFaceup,tp,LOCATION_MZONE,0,1,nil) end,
	op=function(e,tp)
		local g=Duel.GetMatchingGroup(Card.IsFaceup,tp,LOCATION_MZONE,0,nil)
		for tc in aux.Next(g) do
			local e1=Effect.CreateEffect(e:GetHandler())
			e1:SetType(EFFECT_TYPE_SINGLE)
			e1:SetCode(EFFECT_CHANGE_RACE)
			e1:SetReset(RESETS_STANDARD_PHASE_END)
			e1:SetValue(RACE_DRAGON)
			tc:RegisterEffect(e1)
		end
	end}
R.Act.remove_spell_counters_all={cat=CATEGORY_COUNTER,
	check=function(e,tp) return Duel.IsCanRemoveCounter(tp,1,1,COUNTER_SPELL,1,REASON_EFFECT) end,
	op=function(e,tp)
		local g=Duel.GetMatchingGroup(function(c) return c:IsFaceup() and c:GetCounter(COUNTER_SPELL)>0 end,
			tp,LOCATION_ONFIELD,LOCATION_ONFIELD,nil)
		for tc in aux.Next(g) do tc:RemoveCounter(tp,COUNTER_SPELL,tc:GetCounter(COUNTER_SPELL),REASON_EFFECT) end
	end}
R.Act.swap_base_atk_def_all_turn={cat=CATEGORY_ATKCHANGE+CATEGORY_DEFCHANGE,
	check=function(e,tp) return Duel.IsExistingMatchingCard(Card.IsFaceup,tp,LOCATION_MZONE,LOCATION_MZONE,1,nil) end,
	prep=function(e,tp)
		Duel.SetTargetCard(Duel.GetMatchingGroup(Card.IsFaceup,tp,LOCATION_MZONE,LOCATION_MZONE,nil))
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp)
		local g=Duel.GetTargetCards(e):Filter(function(c,e) return c:IsFaceup() and c:IsRelateToEffect(e) and not c:IsImmuneToEffect(e) end,nil,e)
		for tc in aux.Next(g) do
			local e1=Effect.CreateEffect(e:GetHandler())
			e1:SetType(EFFECT_TYPE_SINGLE)
			e1:SetCode(EFFECT_SWAP_BASE_AD)
			e1:SetReset(RESETS_STANDARD_PHASE_END)
			tc:RegisterEffect(e1)
		end
	end}
R.Act.banish_temp_target=targeted({cat=CATEGORY_REMOVE,target=true,loc1=LOCATION_MZONE,loc2=0,hint=HINTMSG_REMOVE,
	filter=function(c) return c:IsFaceup() and c:IsAbleToRemove() end,
	op=function(e,tp)
		local tc=Duel.GetFirstTarget()
		if not (relate(e,tc) and tc:IsFaceup() and tc:IsControler(tp)) then return end
		if Duel.Remove(tc,0,REASON_EFFECT|REASON_TEMPORARY)==0 then return end
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		e1:SetCode(EVENT_PHASE+PHASE_END)
		e1:SetReset(RESET_PHASE|PHASE_END)
		e1:SetLabelObject(tc)
		e1:SetCountLimit(1)
		e1:SetOperation(function(se) Duel.ReturnToField(se:GetLabelObject()) end)
		Duel.RegisterEffect(e1,tp)
	end})
R.Act.inspect_opp_hand_card={cat=0,player_target=true,
	check=function(e,tp) return Duel.GetFieldGroupCount(tp,0,LOCATION_HAND)>0 end,
	prep=function(e,tp) Duel.SetTargetPlayer(tp) end,
	op=function(e,tp)
		local p=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER)
		if Duel.GetFieldGroupCount(p,0,LOCATION_HAND)==0 then return end
		Duel.Hint(HINT_SELECTMSG,p,HINTMSG_CONFIRM)
		local g=Duel.SelectMatchingCard(p,nil,p,0,LOCATION_HAND,1,1,nil)
		if #g>0 then Duel.ConfirmCards(p,g) Duel.ShuffleHand(1-p) end
	end}
R.Act.skip_next_two_draw_phases={cat=0,player_target=true,
	prep=function(e,tp)
		Duel.SetTargetPlayer(tp)
		Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,tp,2)
	end,
	op=function(e,tp)
		local p=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER)
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_FIELD)
		e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e1:SetCode(EFFECT_SKIP_DP)
		e1:SetTargetRange(1,0)
		e1:SetReset(RESET_PHASE|PHASE_END,5)
		Duel.RegisterEffect(e1,p)
	end}
R.Act.inspect_opp_hidden_cards={cat=0,
	local_filter=function(c) return (c:IsOnField() and c:IsFacedown()) or (c:IsLocation(LOCATION_HAND) and not c:IsPublic()) end,
	check=function(e,tp)
		return Duel.IsExistingMatchingCard(R.Act.inspect_opp_hidden_cards.local_filter,tp,0,LOCATION_HAND|LOCATION_ONFIELD,1,nil)
	end,
	op=function(e,tp)
		local g=Duel.GetMatchingGroup(R.Act.inspect_opp_hidden_cards.local_filter,tp,0,LOCATION_HAND|LOCATION_ONFIELD,nil)
		if #g>0 then Duel.ConfirmCards(tp,g) end
		Duel.ShuffleHand(1-tp)
	end}
R.Act.halve_summoned_original_atk={cat=CATEGORY_ATKCHANGE,
	check=function(e,tp,eg)
		return eg and eg:IsExists(function(c,tp) return c:IsFaceup() and c:IsLocation(LOCATION_MZONE) and c:IsSummonPlayer(1-tp) end,1,nil,tp)
	end,
	prep=function(e,tp,eg)
		if eg then
			local g=eg:Filter(function(c,tp) return c:IsFaceup() and c:IsLocation(LOCATION_MZONE) and c:IsSummonPlayer(1-tp) end,nil,tp)
			Duel.SetTargetCard(g)
		end
	end,
	op=function(e,tp)
		local g=Duel.GetTargetCards(e):Filter(function(c,tp,e)
			return c:IsRelateToEffect(e) and c:IsFaceup() and c:IsLocation(LOCATION_MZONE) and c:IsSummonPlayer(1-tp)
		end,nil,tp,e)
		for tc in aux.Next(g) do
			local e1=Effect.CreateEffect(e:GetHandler())
			e1:SetType(EFFECT_TYPE_SINGLE)
			e1:SetCode(EFFECT_SET_BASE_ATTACK)
			e1:SetValue(tc:GetBaseAttack()/2)
			e1:SetReset(RESET_EVENT|RESETS_STANDARD)
			tc:RegisterEffect(e1)
		end
	end}
R.Act.opp_choose_equip_deck_gy={cat=CATEGORY_TOGRAVE,
	check=function(e,tp) return Duel.GetFieldGroupCount(tp,0,LOCATION_DECK)>0 end,
	prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_TOGRAVE,nil,1,1-tp,LOCATION_DECK) end,
	op=function(e,tp)
		local f=function(c) return c:IsType(TYPE_EQUIP) and c:IsAbleToGrave() end
		Duel.Hint(HINT_SELECTMSG,1-tp,HINTMSG_TOGRAVE)
		local g=Duel.SelectMatchingCard(1-tp,f,1-tp,LOCATION_DECK,0,1,1,nil)
		if #g>0 then Duel.SendtoGrave(g,REASON_EFFECT) end
	end}
R.Act.opp_choose_insect_decktop={cat=CATEGORY_TODECK,
	check=function(e,tp) return Duel.GetFieldGroupCount(tp,0,LOCATION_DECK)>0 end,
	op=function(e,tp)
		Duel.Hint(HINT_SELECTMSG,1-tp,HINTMSG_CONFIRM)
		local g=Duel.SelectMatchingCard(1-tp,Card.IsRace,1-tp,LOCATION_DECK,0,1,1,nil,RACE_INSECT)
		local tc=g:GetFirst()
		if tc then
			Duel.ShuffleDeck(1-tp)
			Duel.MoveSequence(tc,0)
			Duel.ConfirmDecktop(1-tp,1)
		end
	end}
R.Act.ss_all_banished_both={cat=CATEGORY_SPECIAL_SUMMON,
	check=function(e,tp)
		local f=function(c,player) return c:IsFaceup() and c:IsCanBeSpecialSummoned(e,0,player,false,false) end
		return (Duel.GetLocationCount(tp,LOCATION_MZONE)>0 and Duel.IsExistingMatchingCard(f,tp,LOCATION_REMOVED,0,1,nil,tp))
			or (Duel.GetLocationCount(1-tp,LOCATION_MZONE)>0 and Duel.IsExistingMatchingCard(f,tp,0,LOCATION_REMOVED,1,nil,1-tp))
	end,
	prep=function(e,tp)
		Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,2,LOCATION_REMOVED)
	end,
	op=function(e,tp)
		local function summon_for(player)
			local max=Duel.GetLocationCount(player,LOCATION_MZONE)
			if max<=0 then return end
			local loc1,loc2=player==tp and LOCATION_REMOVED or 0,player==tp and 0 or LOCATION_REMOVED
			local f=function(c) return c:IsFaceup() and c:IsCanBeSpecialSummoned(e,0,player,false,false) end
			local g=Duel.SelectMatchingCard(player,f,tp,loc1,loc2,0,max,nil)
			if #g>0 then Duel.SpecialSummon(g,0,player,player,false,false,POS_FACEUP) end
		end
		summon_for(tp)
		summon_for(1-tp)
	end}
R.Act.no_traps_activated_turn={cat=0,
	op=function(e,tp)
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_FIELD)
		e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET+EFFECT_FLAG_CLIENT_HINT)
		e1:SetCode(EFFECT_CANNOT_ACTIVATE)
		e1:SetTargetRange(1,1)
		e1:SetValue(function(se,re) return re:IsHasType(EFFECT_TYPE_ACTIVATE) and re:IsTrapEffect() end)
		e1:SetReset(RESET_PHASE|PHASE_END)
		Duel.RegisterEffect(e1,tp)
	end}
R.Act.disable_defense_monsters_turn={cat=0,
	op=function(e,tp)
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_FIELD)
		e1:SetCode(EFFECT_DISABLE)
		e1:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
		e1:SetTarget(function(se,c) return c:IsDefensePos() end)
		e1:SetReset(RESET_PHASE|PHASE_END)
		Duel.RegisterEffect(e1,tp)
	end}
R.Act.protect_set_st_until_opp_end={cat=0,
	op=function(e,tp)
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_FIELD)
		e1:SetCode(EFFECT_INDESTRUCTABLE_EFFECT)
		e1:SetTargetRange(LOCATION_SZONE,LOCATION_SZONE)
		e1:SetProperty(EFFECT_FLAG_SET_AVAILABLE)
		e1:SetTarget(function(se,c) return c:IsFacedown() end)
		e1:SetValue(1)
		e1:SetReset(RESET_PHASE|PHASE_END,2)
		Duel.RegisterEffect(e1,tp)
	end}
R.Act.opponent_tribute_monster={cat=0,
	check=function(e,tp) return Duel.CheckReleaseGroup(1-tp,nil,1,nil) end,
	op=function(e,tp)
		Duel.Hint(HINT_SELECTMSG,1-tp,HINTMSG_RELEASE)
		local g=Duel.SelectReleaseGroup(1-tp,nil,1,1,nil)
		if g and #g>0 then Duel.Release(g,REASON_RULE,1-tp) end
	end}
R.Act.hand_limit_7_duel={cat=0,player_target=true,
	prep=function(e,tp) Duel.SetTargetPlayer(tp) end,
	op=function(e,tp)
		local p=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER)
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_FIELD)
		e1:SetCode(EFFECT_HAND_LIMIT)
		e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e1:SetTargetRange(1,0)
		e1:SetValue(7)
		Duel.RegisterEffect(e1,p)
	end}
R.Act.discard_drawn_card={cat=CATEGORY_HANDES,
	check=function(e,tp,eg) return eg and #eg>0 end,
	prep=function(e,tp,eg)
		Duel.SetTargetCard(eg)
		Duel.SetOperationInfo(0,CATEGORY_HANDES,nil,0,1-tp,#eg)
	end,
	op=function(e,tp,eg,ep)
		local g=Duel.GetTargetCards(e):Filter(function(c,e) return c:IsRelateToEffect(e) end,nil,e)
		if #g==1 then Duel.SendtoGrave(g,REASON_EFFECT|REASON_DISCARD)
		elseif #g>1 then
			Duel.Hint(HINT_SELECTMSG,ep,HINTMSG_TOGRAVE)
			local dg=g:Select(ep,1,1,nil)
			Duel.SendtoGrave(dg,REASON_EFFECT|REASON_DISCARD)
		end
	end}
R.Act.cup_of_ace_effect={cat=CATEGORY_COIN+CATEGORY_DRAW,
	check=function(e,tp) return Duel.IsPlayerCanDraw(tp,2) or Duel.IsPlayerCanDraw(1-tp,2) end,
	prep=function(e,tp)
		Duel.SetOperationInfo(0,CATEGORY_COIN,nil,0,tp,1)
		Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,PLAYER_EITHER,2)
	end,
	op=function(e,tp)
		local coin=Duel.TossCoin(tp,1)
		local player=(coin==COIN_HEADS and tp) or (coin==COIN_TAILS and 1-tp) or nil
		if player then Duel.Draw(player,2,REASON_EFFECT) end
	end}
R.Act.indestructible_low_water_turn={cat=0,
	op=function(e,tp)
		local function protect(code)
			local e1=Effect.CreateEffect(e:GetHandler())
			e1:SetType(EFFECT_TYPE_FIELD)
			e1:SetCode(code)
			e1:SetTarget(function(se,c) return c:IsFaceup() and c:IsLevelBelow(3) and c:IsAttribute(ATTRIBUTE_WATER) end)
			e1:SetTargetRange(LOCATION_MZONE,0)
			e1:SetReset(RESET_PHASE|PHASE_END)
			e1:SetValue(1)
			Duel.RegisterEffect(e1,tp)
		end
		protect(EFFECT_INDESTRUCTABLE_BATTLE)
		protect(EFFECT_INDESTRUCTABLE_EFFECT)
	end}
R.Act.destroy_draw_target=targeted({cat=CATEGORY_DESTROY+CATEGORY_DRAW,target=true,loc1=LOCATION_ONFIELD,loc2=LOCATION_ONFIELD,hint=HINTMSG_DESTROY,
	filter=function(c,e) return c:IsCanBeEffectTarget(e) end,
	op=function(e,tp)
		local tc=Duel.GetFirstTarget()
		if relate(e,tc) and Duel.Destroy(tc,REASON_EFFECT)>0 then Duel.Draw(tp,1,REASON_EFFECT) end
	end})
R.Act.destroy_def_below_tribute={cat=CATEGORY_DESTROY,
	prep=function(e,tp)
		local atk=e:GetLabel()
		local g=Duel.GetMatchingGroup(function(c,atk) return c:IsFaceup() and c:IsDefenseBelow(atk) end,tp,LOCATION_MZONE,LOCATION_MZONE,nil,atk)
		Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,#g,0,0)
	end,
	op=function(e,tp)
		local atk=e:GetLabel()
		local g=Duel.GetMatchingGroup(function(c,atk) return c:IsFaceup() and c:IsDefenseBelow(atk) end,tp,LOCATION_MZONE,LOCATION_MZONE,nil,atk)
		if #g>0 then Duel.Destroy(g,REASON_EFFECT) end
	end}
R.Act.dark_mimic_draw={cat=CATEGORY_DRAW,
	prep=function(e,tp)
		local n=e:GetHandler():GetSummonType()==SUMMON_TYPE_SPECIAL+1 and 2 or 1
		e:SetLabel(n) Duel.SetTargetPlayer(tp) Duel.SetTargetParam(n)
		Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,tp,n)
	end,
	op=function(e,tp) Duel.Draw(tp,e:GetLabel(),REASON_EFFECT) end}
R.Act.destroy_any_st=targeted({cat=CATEGORY_DESTROY,target=true,loc1=LOCATION_ONFIELD,loc2=LOCATION_ONFIELD,hint=HINTMSG_DESTROY,
	filter=Card.IsSpellTrap,op=function(e) local tc=Duel.GetFirstTarget() if relate(e,tc) then Duel.Destroy(tc,REASON_EFFECT) end end})
R.Act.ss_filtered={cat=CATEGORY_SPECIAL_SUMMON,
	check=function(e,tp,eg,ep,ev,re,r,rp,p)
		local loc=real_ss_loc(p)
		return Duel.GetLocationCount(tp,LOCATION_MZONE)>0 and Duel.IsExistingMatchingCard(real_ss_filter,tp,loc,0,1,nil,e,tp,p)
	end,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p)
		local loc=real_ss_loc(p)
		Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,loc)
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		if Duel.GetLocationCount(tp,LOCATION_MZONE)<=0 then return end
		local loc=real_ss_loc(p)
		local g=Duel.SelectMatchingCard(tp,real_ss_filter,tp,loc,0,1,1,nil,e,tp,p)
		if #g>0 then Duel.SpecialSummon(g,0,tp,tp,false,false,p.position=='attack' and POS_FACEUP_ATTACK or POS_FACEUP) end
	end}
R.Act.ss_any_filtered={cat=CATEGORY_SPECIAL_SUMMON,
	check=function() return true end,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p)
		local loc=real_ss_loc(p)
		Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,0,tp,loc)
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local max=Duel.GetLocationCount(tp,LOCATION_MZONE)
		if max<=0 then return end
		local loc=real_ss_loc(p)
		local g=Duel.SelectMatchingCard(tp,real_ss_filter,tp,loc,0,0,max,nil,e,tp,p)
		if #g==0 then return end
		local pos=p.position=='attack' and POS_FACEUP_ATTACK or (p.position=='defense' and POS_FACEUP_DEFENSE or (p.position=='facedown' and POS_FACEDOWN_DEFENSE or POS_FACEUP))
		Duel.SpecialSummon(g,0,tp,tp,false,false,pos)
	end}
R.Act.ss_filtered_proc={cat=CATEGORY_SPECIAL_SUMMON,
	check=function(e,tp,eg,ep,ev,re,r,rp,p)
		local loc=p.zone=='deck_hand_gy' and (LOCATION_DECK|LOCATION_HAND|LOCATION_GRAVE) or real_ss_loc(p)
		local ok=function(c) return real_sel(c,p) and c:IsMonster()
			and c:IsCanBeSpecialSummoned(e,0,tp,p.ignore_condition==true,p.procedure==true) end
		return Duel.GetLocationCount(tp,LOCATION_MZONE)>0 and Duel.IsExistingMatchingCard(ok,tp,loc,0,1,nil)
	end,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p)
		local loc=p.zone=='deck_hand_gy' and (LOCATION_DECK|LOCATION_HAND|LOCATION_GRAVE) or real_ss_loc(p)
		Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,loc)
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		if Duel.GetLocationCount(tp,LOCATION_MZONE)<=0 then return end
		local loc=p.zone=='deck_hand_gy' and (LOCATION_DECK|LOCATION_HAND|LOCATION_GRAVE) or real_ss_loc(p)
		local ok=function(c) return real_sel(c,p) and c:IsMonster()
			and c:IsCanBeSpecialSummoned(e,0,tp,p.ignore_condition==true,p.procedure==true) end
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
		local g=Duel.SelectMatchingCard(tp,ok,tp,loc,0,1,1,nil)
		if #g>0 and Duel.SpecialSummon(g,0,tp,tp,p.ignore_condition==true,p.procedure==true,POS_FACEUP)>0 and p.complete then
			for tc in aux.Next(g) do tc:CompleteProcedure() end
		end
	end}
R.Act.hand_wipe_draw_same={cat=CATEGORY_HANDES+CATEGORY_DRAW,
	check=function(e,tp)
		local h1=Duel.GetFieldGroupCount(tp,LOCATION_HAND,0)
		local h2=Duel.GetFieldGroupCount(tp,0,LOCATION_HAND)
		return (h1+h2>0) and (h1==0 or Duel.IsPlayerCanDraw(tp,h1))
			and (h2==0 or Duel.IsPlayerCanDraw(1-tp,h2))
	end,
	prep=function(e,tp)
		Duel.SetOperationInfo(0,CATEGORY_HANDES,nil,0,PLAYER_ALL,1)
		Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,PLAYER_ALL,1)
	end,
	op=function(e,tp)
		local h1=Duel.GetFieldGroupCount(tp,LOCATION_HAND,0)
		local h2=Duel.GetFieldGroupCount(tp,0,LOCATION_HAND)
		local g=Duel.GetFieldGroup(tp,LOCATION_HAND,LOCATION_HAND)
		if #g>0 then Duel.SendtoGrave(g,REASON_EFFECT|REASON_DISCARD) end
		Duel.BreakEffect()
		if h1>0 then Duel.Draw(tp,h1,REASON_EFFECT) end
		if h2>0 then Duel.Draw(1-tp,h2,REASON_EFFECT) end
	end}

R.Act.destroy_banish_duplicates={cat=CATEGORY_DESTROY+CATEGORY_REMOVE,target=true,locs=real_locs,
	filter=function(c,e,tp,p) return c:IsFacedown() and c:IsAbleToRemove() and real_sel(c,p) end,
	check=function(e,tp,eg,ep,ev,re,r,rp,p)
		local l1,l2=real_locs(p)
		return Duel.IsExistingTarget(function(c,e,tp,p)
			return c:IsFacedown() and c:IsAbleToRemove() and real_sel(c,p)
		end,tp,l1,l2,1,nil,e,tp,p)
	end,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p)
		local l1,l2=real_locs(p)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)
		local g=Duel.SelectTarget(tp,function(c,e,tp,p)
			return c:IsFacedown() and c:IsAbleToRemove() and real_sel(c,p)
		end,tp,l1,l2,1,1,nil,e,tp,p)
		Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,1,0,0)
		Duel.SetOperationInfo(0,CATEGORY_REMOVE,g,1,0,0)
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local tc=Duel.GetFirstTarget()
		if not (tc and relate(e,tc) and tc:IsFacedown()) then return end
		local code=tc:GetCode()
		if Duel.Destroy(tc,REASON_EFFECT,LOCATION_REMOVED)<=0 then return end
		local matches=(p.duplicates=='flip' and tc:IsType(TYPE_FLIP)) or (p.duplicates=='trap' and tc:IsTrap())
		if matches then
			local g=Duel.GetMatchingGroup(Card.IsCode,tp,LOCATION_DECK,LOCATION_DECK,nil,code)
			if #g>0 then Duel.Remove(g,POS_FACEUP,REASON_EFFECT) end
			local opp=Duel.GetFieldGroup(tp,0,LOCATION_DECK)
			local own=Duel.GetFieldGroup(tp,LOCATION_DECK,0)
			Duel.ConfirmCards(tp,opp) Duel.ConfirmCards(1-tp,own)
			Duel.ShuffleDeck(tp) Duel.ShuffleDeck(1-tp)
		end
	end}
R.Act.shuffle_hand_draw_same={cat=CATEGORY_TODECK+CATEGORY_DRAW,
	check=function(e,tp)
		return Duel.GetFieldGroupCount(tp,LOCATION_HAND,0)>0 and Duel.IsPlayerCanDraw(tp,1)
	end,
	prep=function(e,tp)
		Duel.SetOperationInfo(0,CATEGORY_TODECK,nil,1,tp,LOCATION_HAND)
		Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,tp,1)
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local g
		if p.all then g=Duel.GetFieldGroup(tp,LOCATION_HAND,0)
		else
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TODECK)
			g=Duel.SelectMatchingCard(tp,Card.IsAbleToDeck,tp,LOCATION_HAND,0,1,63,nil)
		end
		if not g or #g==0 then return end
		Duel.SendtoDeck(g,nil,SEQ_DECKSHUFFLE,REASON_EFFECT)
		Duel.ShuffleDeck(tp)
		Duel.BreakEffect()
		Duel.Draw(tp,#g,REASON_EFFECT)
	end}
R.Act.destroy_target_mill_opp={cat=CATEGORY_DESTROY+CATEGORY_DECKDES,target=true,locs=real_locs,
	filter=function(c,e,tp,p) return real_sel(c,p) end,
	check=function(e,tp,eg,ep,ev,re,r,rp,p)
		local l1,l2=real_locs(p)
		return Duel.IsExistingTarget(function(c,e,tp,p) return real_sel(c,p) end,tp,l1,l2,1,nil,e,tp,p)
	end,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p)
		local l1,l2=real_locs(p)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)
		local g=Duel.SelectTarget(tp,function(c,e,tp,p) return real_sel(c,p) end,tp,l1,l2,1,1,nil,e,tp,p)
		Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,1,0,0)
		Duel.SetOperationInfo(0,CATEGORY_DECKDES,nil,0,1-tp,p.n or 0)
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local tc=Duel.GetFirstTarget()
		if tc and relate(e,tc) and Duel.Destroy(tc,REASON_EFFECT)>0 then
			Duel.BreakEffect()
			Duel.DiscardDeck(1-tp,p.n or 0,REASON_EFFECT)
		end
	end}
--Move every card the selector names (Heavy Storm, Acid Rain, Giant Trunade, ...). Spells and Traps resolve first, so the
--card itself is never in the group unless the selector says so.
R.Act.move_all={cat=0,catf=function(p) return REAL_MOVE_CAT[p.to or 'destroy'] end,
	check=function(e,tp,eg,ep,ev,re,r,rp,p) return #real_group(tp,p,nil):Filter(real_can_move,nil,p)>0 end,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p)
		local g=real_group(tp,p,nil):Filter(real_can_move,nil,p)
		Duel.SetOperationInfo(0,REAL_MOVE_CAT[p.to or 'destroy'],g,#g,0,0)
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p) real_move(real_group(tp,p,nil):Filter(real_can_move,nil,p),p) end}
--Target 1 (or p.n; up to p.n with p.up_to) card the selector names and move it.
local function real_target_filter(c,e,tp,p) return real_sel(c,p) and real_can_move(c,p) end
R.Act.move_target={cat=0,target=true,filter=real_target_filter,locs=real_locs,
	catf=function(p) return REAL_MOVE_CAT[p.to or 'destroy'] end,
	check=function(e,tp,eg,ep,ev,re,r,rp,p)
		local l1,l2=real_locs(p)
		return Duel.IsExistingTarget(real_target_filter,tp,l1,l2,p.n or 1,e:GetHandler(),e,tp,p)
	end,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p)
		local l1,l2=real_locs(p)
		local n=p.n or 1
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TARGET)
		local g=Duel.SelectTarget(tp,real_target_filter,tp,l1,l2,p.up_to and 1 or n,n,e:GetHandler(),e,tp,p)
		Duel.SetOperationInfo(0,REAL_MOVE_CAT[p.to or 'destroy'],g,#g,0,0)
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local g=Duel.GetTargetCards(e):Filter(Card.IsRelateToEffect,nil,e)
		real_move(g,p)
	end}
--Target a matching face-up Spell/Trap or a Set card in the Spell & Trap Zone. Set cards are revealed,
--then destroyed only when their actual type matches p.kind (Armed Ninja, Crimson Ninja, Trap Master).
local function reveal_destroy_st_filter(c,e,tp,p)
	if not c:IsLocation(LOCATION_SZONE) then return false end
	if c:IsFacedown() then return true end
	return p.kind=='spell' and c:IsSpell() or p.kind=='trap' and c:IsTrap()
end
R.Act.reveal_destroy_st={cat=CATEGORY_DESTROY,target=true,
	locs=function() return LOCATION_SZONE,LOCATION_SZONE end,
	filter=reveal_destroy_st_filter,
	check=function(e,tp,eg,ep,ev,re,r,rp,p)
		return Duel.IsExistingTarget(reveal_destroy_st_filter,tp,LOCATION_SZONE,LOCATION_SZONE,1,nil,e,tp,p)
	end,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)
		local g=Duel.SelectTarget(tp,reveal_destroy_st_filter,tp,LOCATION_SZONE,LOCATION_SZONE,1,1,nil,e,tp,p)
		Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,#g,0,0)
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local g=Duel.GetTargetCards(e):Filter(Card.IsRelateToEffect,nil,e)
		for tc in aux.Next(g) do
			if tc:IsFacedown() then Duel.ConfirmCards(tp,tc) end
			if (p.kind=='spell' and tc:IsSpell()) or (p.kind=='trap' and tc:IsTrap()) then
				Duel.Destroy(tc,REASON_EFFECT)
			end
		end
	end}
R.Act.reveal_destroy_spell=R.Act.reveal_destroy_st
--Take control of a selected opponent's monster through the current End Phase.
local function real_control_filter(c,e,tp,p)
	return real_sel(c,p) and c:IsControler(1-tp) and c:IsLocation(LOCATION_MZONE)
		and c:IsControlerCanBeChanged()
end
R.Act.take_control_target={cat=CATEGORY_CONTROL,target=true,filter=real_control_filter,locs=real_locs,
	check=function(e,tp,eg,ep,ev,re,r,rp,p)
		local l1,l2=real_locs(p)
		return Duel.IsExistingTarget(real_control_filter,tp,l1,l2,p.n or 1,e:GetHandler(),e,tp,p)
	end,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p)
		local l1,l2=real_locs(p)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_CONTROL)
		local g=Duel.SelectTarget(tp,real_control_filter,tp,l1,l2,p.n or 1,p.n or 1,e:GetHandler(),e,tp,p)
		Duel.SetOperationInfo(0,CATEGORY_CONTROL,g,#g,0,0)
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local g=Duel.GetTargetCards(e):Filter(Card.IsRelateToEffect,nil,e)
		for tc in aux.Next(g) do Duel.GetControl(tc,tp,PHASE_END,1) end
	end}
R.Act.take_control_direct_target={cat=CATEGORY_CONTROL,target=true,filter=real_control_filter,locs=real_locs,
		check=function(e,tp,eg,ep,ev,re,r,rp,p)
			local l1,l2=real_locs(p)
			return Duel.IsExistingTarget(real_control_filter,tp,l1,l2,p.n or 1,e:GetHandler(),e,tp,p)
		end,
		prep=function(e,tp,eg,ep,ev,re,r,rp,p)
			local l1,l2=real_locs(p)
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_CONTROL)
			local g=Duel.SelectTarget(tp,real_control_filter,tp,l1,l2,p.n or 1,p.n or 1,e:GetHandler(),e,tp,p)
			Duel.SetOperationInfo(0,CATEGORY_CONTROL,g,#g,0,0)
		end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p)
			local g=Duel.GetTargetCards(e):Filter(Card.IsRelateToEffect,nil,e)
			for tc in aux.Next(g) do
				Duel.GetControl(tc,tp,PHASE_END,1)
				local e1=Effect.CreateEffect(e:GetHandler())
				e1:SetType(EFFECT_TYPE_SINGLE)
				e1:SetCode(EFFECT_DIRECT_ATTACK)
				e1:SetReset(RESETS_STANDARD_PHASE_END)
				tc:RegisterEffect(e1)
			end
		end}
--Destroy the selected group and calculate damage/LP gain from cards that were actually destroyed.
R.Act.destroy_payoff_per={cat=0,
	catf=function(p) return CATEGORY_DESTROY|(p.payoff=='damage' and CATEGORY_DAMAGE or CATEGORY_RECOVER) end,
	check=function(e,tp,eg,ep,ev,re,r,rp,p)
		local l1,l2=real_locs(p)
		return Duel.IsExistingMatchingCard(function(c) return real_sel(c,p) and real_can_move(c,p) end,
			tp,l1,l2,1,nil)
	end,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p)
		local g=real_group(tp,p,nil):Filter(real_can_move,nil,p)
		Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,#g,0,0)
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local g=real_group(tp,p,nil):Filter(real_can_move,nil,p)
		local n=Duel.Destroy(g,REASON_EFFECT)
		if n>0 then
			if p.payoff=='damage' then Duel.Damage(1-tp,(p.n or 0)*n,REASON_EFFECT)
			else Duel.Recover(tp,(p.n or 0)*n,REASON_EFFECT,true) end
			Duel.RDComplete()
		end
	end}
--Destroy one selected card, then damage both players only if it was successfully destroyed.
R.Act.destroy_damage_both={cat=CATEGORY_DESTROY+CATEGORY_DAMAGE,target=true,locs=real_locs,
	filter=function(c,e,tp,p) return real_sel(c,p) end,
	check=function(e,tp,eg,ep,ev,re,r,rp,p)
		local l1,l2=real_locs(p)
		return Duel.IsExistingTarget(function(c,e,tp,p) return real_sel(c,p) end,tp,l1,l2,1,nil,e,tp,p)
	end,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p)
		local l1,l2=real_locs(p)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)
		local g=Duel.SelectTarget(tp,function(c,e,tp,p) return real_sel(c,p) end,tp,l1,l2,1,1,nil,e,tp,p)
		Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,1,0,0)
		Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,PLAYER_ALL,(p.n or 0)*2)
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local tc=Duel.GetFirstTarget()
		if tc and relate(e,tc) and Duel.Destroy(tc,REASON_EFFECT)>0 then
			Duel.Damage(1-tp,p.n or 0,REASON_EFFECT,true)
			Duel.Damage(tp,p.n or 0,REASON_EFFECT,true)
			Duel.RDComplete()
		end
	end}
R.Act.destroy_other_faceup={cat=CATEGORY_DESTROY,
	check=function(e,tp)
		return Duel.IsExistingMatchingCard(Card.IsFaceup,tp,LOCATION_MZONE,LOCATION_MZONE,1,e:GetHandler())
	end,
	prep=function(e,tp)
		local g=Duel.GetMatchingGroup(Card.IsFaceup,tp,LOCATION_MZONE,LOCATION_MZONE,e:GetHandler())
		Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,#g,0,0)
	end,
	op=function(e,tp)
		local g=Duel.GetMatchingGroup(Card.IsFaceup,tp,LOCATION_MZONE,LOCATION_MZONE,e:GetHandler())
		if #g>0 then Duel.Destroy(g,REASON_EFFECT) end
	end}
R.Act.stat_mod_perm_target=targeted({cat=CATEGORY_ATKCHANGE+CATEGORY_DEFCHANGE,target=true,
	loc1=LOCATION_MZONE,loc2=LOCATION_MZONE,hint=HINTMSG_FACEUP,
	filter=function(c,e,tp,p) return c:IsFaceup() and real_sel(c,p) end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local tc=Duel.GetFirstTarget()
		if not (relate(e,tc) and tc:IsFaceup() and real_sel(tc,p)) then return end
		local ea=Effect.CreateEffect(e:GetHandler())
		ea:SetType(EFFECT_TYPE_SINGLE) ea:SetCode(EFFECT_UPDATE_ATTACK) ea:SetValue(p.n or 0)
		ea:SetReset(RESET_EVENT|RESETS_STANDARD) tc:RegisterEffect(ea)
		local ed=Effect.CreateEffect(e:GetHandler())
		ed:SetType(EFFECT_TYPE_SINGLE) ed:SetCode(EFFECT_UPDATE_DEFENSE) ed:SetValue(p.n or 0)
		ed:SetReset(RESET_EVENT|RESETS_STANDARD) tc:RegisterEffect(ed)
	end})
R.Act.destroy_payoff_target={cat=0,catf=function(p)
		return CATEGORY_DESTROY|(p.payoff=='recover' and CATEGORY_RECOVER or CATEGORY_DAMAGE)
	end,target=true,locs=real_locs,
	filter=function(c,e,tp,p) return c~=e:GetHandler() and real_sel(c,p) end,
	check=function(e,tp,eg,ep,ev,re,r,rp,p)
		local l1,l2=real_locs(p)
		return Duel.IsExistingTarget(function(c,e,tp,p) return c~=e:GetHandler() and real_sel(c,p) end,
			tp,l1,l2,1,nil,e,tp,p)
	end,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p)
		local l1,l2=real_locs(p)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)
		local g=Duel.SelectTarget(tp,function(c,e,tp,p) return c~=e:GetHandler() and real_sel(c,p) end,
			tp,l1,l2,1,1,nil,e,tp,p)
		Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,1,0,0)
		local cat=p.payoff=='recover' and CATEGORY_RECOVER or CATEGORY_DAMAGE
		local player=p.player=='controller' and (g:GetFirst() and g:GetFirst():GetControler() or 1-tp) or 1-tp
		Duel.SetOperationInfo(0,cat,nil,0,player,p.n or 0)
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local tc=Duel.GetFirstTarget()
		if not (tc and relate(e,tc)) then return end
		local player=p.player=='controller' and tc:GetControler() or 1-tp
		if Duel.Destroy(tc,REASON_EFFECT)>0 then
			if p.payoff=='recover' then Duel.Recover(player,p.n or 0,REASON_EFFECT)
			else Duel.Damage(player,p.n or 0,REASON_EFFECT) end
		end
	end}
local function real_copy_stats_filter(c,e,tp,p)
	return c:IsFaceup() and c:IsControler(1-tp) and c:IsLocation(LOCATION_MZONE)
end
R.Act.copy_stats_target={cat=CATEGORY_ATKCHANGE+CATEGORY_DEFCHANGE,target=true,
	filter=real_copy_stats_filter,locs=real_locs,
	check=function(e,tp,eg,ep,ev,re,r,rp,p)
		return Duel.IsExistingTarget(real_copy_stats_filter,tp,0,LOCATION_MZONE,1,nil,e,tp,p)
	end,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_FACEUP)
		local g=Duel.SelectTarget(tp,real_copy_stats_filter,tp,0,LOCATION_MZONE,1,1,nil,e,tp,p)
		Duel.SetOperationInfo(0,CATEGORY_ATKCHANGE,g,1,0,0)
		Duel.SetOperationInfo(0,CATEGORY_DEFCHANGE,g,1,0,0)
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local tc=Duel.GetFirstTarget()
		local c=e:GetHandler()
		if not (c:IsFaceup() and c:IsRelateToEffect(e) and relate(e,tc) and tc:IsFaceup()) then return end
		local ea=Effect.CreateEffect(c)
		ea:SetType(EFFECT_TYPE_SINGLE) ea:SetCode(EFFECT_SET_ATTACK_FINAL) ea:SetValue(tc:GetBaseAttack())
		ea:SetReset(RESET_EVENT|RESETS_STANDARD_DISABLE) c:RegisterEffect(ea)
		local ed=Effect.CreateEffect(c)
		ed:SetType(EFFECT_TYPE_SINGLE) ed:SetCode(EFFECT_SET_DEFENSE_FINAL) ed:SetValue(tc:GetBaseDefense())
		ed:SetReset(RESET_EVENT|RESETS_STANDARD_DISABLE) c:RegisterEffect(ed)
	end}
--Add p.n (default 1) cards the selector names from the Deck, the GY or both to your hand.
local function real_search_loc(p) return p.zone=='gy' and LOCATION_GRAVE or (p.zone=='deck_gy' and (LOCATION_DECK|LOCATION_GRAVE) or LOCATION_DECK) end
local function real_search_filter(c,p) return real_sel(c,p) and c:IsAbleToHand() end
R.Act.search_sel={cat=CATEGORY_TOHAND+CATEGORY_SEARCH,
	check=function(e,tp,eg,ep,ev,re,r,rp,p) return Duel.IsExistingMatchingCard(real_search_filter,tp,real_search_loc(p),0,1,nil,p) end,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p) Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,real_search_loc(p)) end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
		local n=p.n or 1
		local g=Duel.SelectMatchingCard(tp,aux.NecroValleyFilter(real_search_filter),tp,real_search_loc(p),0,p.up_to and 1 or n,n,nil,p)
		if #g>0 then
			Duel.SendtoHand(g,nil,REASON_EFFECT)
			Duel.ConfirmCards(1-tp,g)
			if p.zone~='gy' then Duel.ShuffleDeck(tp) end
		end
	end}
R.Act.search_ritual={cat=CATEGORY_TOHAND+CATEGORY_SEARCH,
	check=function(e,tp) return Duel.IsExistingMatchingCard(function(c) return c:IsType(TYPE_RITUAL) and c:IsAbleToHand() end,tp,LOCATION_DECK,0,1,nil) end,
	prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_DECK) end,
	op=function(e,tp)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
		local g=Duel.SelectMatchingCard(tp,aux.NecroValleyFilter(function(c) return c:IsType(TYPE_RITUAL) and c:IsAbleToHand() end),tp,LOCATION_DECK,0,1,1,nil)
		if #g>0 then Duel.SendtoHand(g,nil,REASON_EFFECT) Duel.ConfirmCards(1-tp,g) Duel.ShuffleDeck(tp) end
	end}
R.Act.direct_attack_target=targeted({cat=0,target=true,loc1=LOCATION_MZONE,loc2=LOCATION_MZONE,
	hint=HINTMSG_FACEUP,filter=function(c,e,tp,p) return c:IsFaceup() and real_sel(c,p) end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local tc=Duel.GetFirstTarget()
		if not (relate(e,tc) and tc:IsFaceup() and real_sel(tc,p)) then return end
		local ea=Effect.CreateEffect(e:GetHandler())
		ea:SetType(EFFECT_TYPE_SINGLE) ea:SetCode(EFFECT_DIRECT_ATTACK)
		ea:SetReset(RESETS_STANDARD_PHASE_END) tc:RegisterEffect(ea)
	end})
R.Act.recover_both={cat=CATEGORY_RECOVER,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p) Duel.SetOperationInfo(0,CATEGORY_RECOVER,nil,0,PLAYER_ALL,p.n) end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p,m)
		Duel.Recover(tp,p.n*m,REASON_EFFECT,true)
		Duel.Recover(1-tp,p.n*m,REASON_EFFECT,true)
		Duel.RDComplete()
	end}

--Choose (no target) p.n cards the selector names and move them; with p.up_to, 1 to p.n. Looking at an opponent's hand
--first is what p.zone=='hand' on their side means (Confiscation).
R.Act.move_select={cat=0,catf=function(p) return REAL_MOVE_CAT[p.to or 'destroy'] end,
	check=function(e,tp,eg,ep,ev,re,r,rp,p)
		local l1,l2=real_locs(p)
		return Duel.IsExistingMatchingCard(real_target_filter,tp,l1,l2,p.up_to and 1 or (p.n or 1),nil,nil,tp,p)
	end,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p)
		Duel.SetOperationInfo(0,REAL_MOVE_CAT[p.to or 'destroy'],nil,p.n or 1,p.side=='opp' and 1-tp or tp,REAL_LOC[p.zone or 'mzone'])
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local l1,l2=real_locs(p)
		if p.zone=='hand' and p.side=='opp' then Duel.ConfirmCards(tp,Duel.GetFieldGroup(tp,0,LOCATION_HAND)) end
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TARGET)
		local n=p.n or 1
		local g=Duel.SelectMatchingCard(tp,aux.NecroValleyFilter(real_target_filter),tp,l1,l2,p.up_to and 1 or n,n,nil,nil,tp,p)
		if p.zone=='hand' and p.side=='opp' then Duel.ShuffleHand(1-tp) end
		real_move(g,p)
	end}
R.Act.recover_opp={cat=CATEGORY_RECOVER,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p) Duel.SetOperationInfo(0,CATEGORY_RECOVER,nil,0,1-tp,p.n) end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p,m) Duel.Recover(1-tp,p.n*m,REASON_EFFECT) end}
--Discard p.n cards of your choice from your hand as part of the effect.
R.Act.discard_hand={cat=CATEGORY_HANDES,
	check=function(e,tp,eg,ep,ev,re,r,rp,p) return Duel.GetFieldGroupCount(tp,LOCATION_HAND,0)>=p.n end,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p) Duel.SetOperationInfo(0,CATEGORY_HANDES,nil,0,tp,p.n) end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p) Duel.DiscardHand(tp,aux.TRUE,p.n,p.n,REASON_EFFECT|REASON_DISCARD) end}
--Target p.n cards the selector names in a GY or banishment and Special Summon them (p.position: attack|defense|facedown;
--p.no_attack: they cannot attack).
local function real_ss_target_filter(c,e,tp,p) return real_sel(c,p) and c:IsCanBeSpecialSummoned(e,0,tp,false,false,p.position=='facedown' and POS_FACEDOWN_DEFENSE or (p.position=='defense' and POS_FACEUP_DEFENSE or POS_FACEUP)) end
R.Act.ss_target={cat=CATEGORY_SPECIAL_SUMMON,target=true,filter=real_ss_target_filter,locs=real_locs,
	check=function(e,tp,eg,ep,ev,re,r,rp,p)
		local l1,l2=real_locs(p)
		return Duel.GetLocationCount(tp,LOCATION_MZONE)>=(p.n or 1)
			and Duel.IsExistingTarget(aux.NecroValleyFilter(real_ss_target_filter),tp,l1,l2,p.n or 1,nil,e,tp,p)
	end,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p)
		local l1,l2=real_locs(p)
		local n=p.n or 1
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
		local g=Duel.SelectTarget(tp,aux.NecroValleyFilter(real_ss_target_filter),tp,l1,l2,p.up_to and 1 or n,n,nil,e,tp,p)
		Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,g,#g,0,0)
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local g=Duel.GetTargetCards(e):Filter(Card.IsRelateToEffect,nil,e)
		if #g>Duel.GetLocationCount(tp,LOCATION_MZONE) then g=g:Select(tp,Duel.GetLocationCount(tp,LOCATION_MZONE),Duel.GetLocationCount(tp,LOCATION_MZONE),nil) end
		local pos=p.position=='facedown' and POS_FACEDOWN_DEFENSE or (p.position=='defense' and POS_FACEUP_DEFENSE or (p.position=='attack' and POS_FACEUP_ATTACK or POS_FACEUP))
		for tc in aux.Next(g) do
			if Duel.SpecialSummonStep(tc,0,tp,tp,false,false,pos) and p.no_attack then
				local e1=Effect.CreateEffect(e:GetHandler())
				e1:SetType(EFFECT_TYPE_SINGLE)
				e1:SetCode(EFFECT_CANNOT_ATTACK)
				e1:SetReset(RESET_EVENT|RESETS_STANDARD)
				tc:RegisterEffect(e1)
			end
		end
		Duel.SpecialSummonComplete()
		if p.position=='facedown' then Duel.ConfirmCards(1-tp,g) end
	end}

--Fusion Summon like Polymerization, through the engine's own Fusion procedure (check, then choose, then resolve).
local function fusion_act(matfilter,extrafil,extraop)
	local tg=function() return Fusion.SummonEffTG(nil,matfilter,extrafil,extraop) end
	return {cat=CATEGORY_SPECIAL_SUMMON+CATEGORY_FUSION_SUMMON,
		check=function(e,tp,eg,ep,ev,re,r,rp) return tg()(e,tp,eg,ep,ev,re,r,rp,0) end,
		prep=function(e,tp,eg,ep,ev,re,r,rp) tg()(e,tp,eg,ep,ev,re,r,rp,1) end,
		op=function(e,tp,eg,ep,ev,re,r,rp) Fusion.SummonEffOP(nil,matfilter,extrafil,extraop)(e,tp,eg,ep,ev,re,r,rp) end}
end
R.Act.fusion_summon=fusion_act()
--Materials only from the GY (hand and field excluded), all banished, like Miracle Fusion.
R.Act.fusion_summon_gy=fusion_act(aux.FALSE,function(e,tp,mg)
	return Duel.GetMatchingGroup(aux.NecroValleyFilter(Fusion.IsMonsterFilter(Card.IsAbleToRemove)),tp,LOCATION_GRAVE,0,nil)
end,Fusion.BanishMaterial)
--"destroy that monster" names the summoned monsters without targeting them, so it never uses chkc.
R.Act.destroy_summoned.notarget=true
--Owner's Seal: restore control of every monster to its owner until normal reset.
R.Act.owner_seal={cat=CATEGORY_CONTROL,
	check=function(e,tp)
		return Duel.IsExistingMatchingCard(function(c) return c:GetControler()~=c:GetOwner() end,
			tp,LOCATION_MZONE,LOCATION_MZONE,1,nil)
	end,
	op=function(e,tp)
		local g=Duel.GetFieldGroup(tp,LOCATION_MZONE,LOCATION_MZONE)
		for tc in aux.Next(g) do
			if tc:GetControler()~=tc:GetOwner() and not tc:IsImmuneToEffect(e) then
				tc:ResetEffect(EFFECT_SET_CONTROL,RESET_CODE)
				local ce=Effect.CreateEffect(e:GetHandler())
				ce:SetType(EFFECT_TYPE_SINGLE)
				ce:SetCode(EFFECT_SET_CONTROL)
				ce:SetValue(tc:GetOwner())
				ce:SetReset(RESET_EVENT|RESETS_STANDARD-(RESET_TOFIELD|RESET_TEMP_REMOVE|RESET_TURN_SET))
				tc:RegisterEffect(ce)
			end
		end
	end}
--Sonic Jammer: the opponent cannot activate Spell Cards through the next End Phase.
R.Act.no_spells_opp_until_next_end={cat=0,
	op=function(e,tp)
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_FIELD)
		e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET+EFFECT_FLAG_CLIENT_HINT)
		e1:SetCode(EFFECT_CANNOT_ACTIVATE)
		e1:SetTargetRange(0,1)
		e1:SetValue(function(se,re) return re:IsHasType(EFFECT_TYPE_ACTIVATE) and re:IsSpellEffect() end)
		e1:SetReset(RESET_PHASE|PHASE_END,2)
		Duel.RegisterEffect(e1,tp)
	end}
--Gold Sarcophagus: face-up banish a Deck card and return it on the controller's second Standby Phase.
R.Act.gold_sarcophagus={cat=CATEGORY_REMOVE+CATEGORY_TOHAND,
	check=function(e,tp) return Duel.IsExistingMatchingCard(Card.IsAbleToRemove,tp,LOCATION_DECK,0,1,nil) end,
	prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_REMOVE,nil,1,tp,LOCATION_DECK) end,
	op=function(e,tp)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)
		local tc=Duel.SelectMatchingCard(tp,Card.IsAbleToRemove,tp,LOCATION_DECK,0,1,1,nil):GetFirst()
		if not tc then return end
		if Duel.Remove(tc,POS_FACEUP,REASON_EFFECT)==0 or not tc:IsLocation(LOCATION_REMOVED) then return end
		local ce=Effect.CreateEffect(e:GetHandler())
		ce:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		ce:SetRange(LOCATION_REMOVED)
		ce:SetCode(EVENT_PHASE+PHASE_STANDBY)
		ce:SetCountLimit(1)
		ce:SetReset(RESET_EVENT|RESETS_STANDARD|RESET_PHASE|PHASE_STANDBY|RESET_SELF_TURN,2)
		ce:SetCondition(function(se) return Duel.IsTurnPlayer(se:GetHandlerPlayer()) end)
		ce:SetOperation(function(se)
			local ct=se:GetLabel()
			se:SetLabel(ct+1)
			if ct==1 and se:GetHandler():IsAbleToHand() then
				Duel.SendtoHand(se:GetHandler(),nil,REASON_EFFECT)
				Duel.ConfirmCards(1-se:GetHandlerPlayer(),se:GetHandler())
			end
		end)
		tc:RegisterEffect(ce)
	end}
--Makiu, the Magical Mist: target Summoned Skull or a Thunder monster and destroy weaker-DEF monsters.
R.Act.destroy_def_below_target={cat=CATEGORY_DESTROY,target=true,
	filter=function(c,e,tp,p)
		return c:IsFaceup() and (c:IsCode(p.code) or c:IsRace(p.race))
			and c:IsControler(tp) and c:IsLocation(LOCATION_MZONE) and c:IsCanBeEffectTarget(e)
			and Duel.IsExistingMatchingCard(function(tc,atk) return tc:IsFaceup() and tc:IsDefenseBelow(atk) end,
				tp,0,LOCATION_MZONE,1,nil,c:GetAttack())
	end,
	loc1=LOCATION_MZONE,loc2=0,hint=HINTMSG_TARGET,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TARGET)
		local g=Duel.SelectTarget(tp,function(c,te,p) return R.Act.destroy_def_below_target.filter(c,te,tp,p) end,
			tp,LOCATION_MZONE,0,1,1,nil,e,p)
		local tc=g:GetFirst()
		if tc then
			local dg=Duel.GetMatchingGroup(function(c,atk) return c:IsFaceup() and c:IsDefenseBelow(atk) end,
				tp,0,LOCATION_MZONE,nil,tc:GetAttack())
			Duel.SetOperationInfo(0,CATEGORY_DESTROY,dg,#dg,0,0)
		end
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local tc=Duel.GetFirstTarget()
		if tc and tc:IsRelateToEffect(e) and tc:IsFaceup() then
			local dg=Duel.GetMatchingGroup(function(c,atk) return c:IsFaceup() and c:IsDefenseBelow(atk) end,
				tp,0,LOCATION_MZONE,nil,tc:GetAttack())
			Duel.Destroy(dg,REASON_EFFECT)
		end
	end}

---------------------------------------------------------------- unique mechanics
--Every kind of effect on the user's list of 50 unusual cards (Nov 15), adapted from the real card's script with the
--rolled amounts. The randomizer.py comments say which card each one comes from.
local function str(e,i) return aux.Stringid(e:GetHandler():GetOriginalCode(),i or 0) end
local function zones(tp) return Duel.GetLocationCount(tp,LOCATION_MZONE) end
local function win(tp) Duel.Win(tp,R.WIN_REASON) end
local function skip_turn(c,tp)
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_FIELD)
	e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e1:SetTargetRange(1,0)
	e1:SetCode(EFFECT_SKIP_TURN)
	e1:SetReset(RESET_PHASE|PHASE_DRAW|RESET_SELF_TURN)
	Duel.RegisterEffect(e1,tp)
end
R.SkipTurn=skip_turn
local U={}
--Final Countdown: count turn ends from now; the player wins at the end of the Nth.
U.final_countdown={cat=0,op=function(e,tp,eg,ep,ev,re,r,rp,p)
	local ce=Effect.CreateEffect(e:GetHandler())
	ce:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
	ce:SetCode(EVENT_TURN_END)
	ce:SetCountLimit(1)
	ce:SetLabel(0)
	ce:SetOperation(function(se)
		local ct=se:GetLabel()+1
		se:SetLabel(ct)
		if ct>=p.n then win(tp) end
	end)
	Duel.RegisterEffect(ce,tp)
end}
--Last Turn.
U.last_turn={cat=CATEGORY_SPECIAL_SUMMON,
	check=function(e,tp) return Duel.IsExistingMatchingCard(nil,tp,LOCATION_MZONE,0,1,nil) end,
	prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,1-tp,LOCATION_DECK) end,
	op=function(e,tp)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_FACEUP)
		local tc=Duel.SelectMatchingCard(tp,nil,tp,LOCATION_MZONE,0,1,1,nil):GetFirst()
		local hg=Duel.GetFieldGroup(tp,LOCATION_HAND|LOCATION_ONFIELD,LOCATION_HAND|LOCATION_ONFIELD)
		if tc then hg:RemoveCard(tc) end
		Duel.SendtoGrave(hg,REASON_EFFECT)
		Duel.Hint(HINT_SELECTMSG,1-tp,HINTMSG_SPSUMMON)
		local sc=Duel.SelectMatchingCard(1-tp,function(c) return c:IsCanBeSpecialSummoned(e,0,1-tp,false,false) end,1-tp,LOCATION_DECK,0,1,1,nil):GetFirst()
		if sc then
			Duel.BreakEffect()
			Duel.SpecialSummon(sc,0,1-tp,1-tp,false,false,POS_FACEUP_ATTACK)
			local e1=Effect.CreateEffect(e:GetHandler())
			e1:SetType(EFFECT_TYPE_FIELD)
			e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
			e1:SetCode(EFFECT_AVOID_BATTLE_DAMAGE)
			e1:SetTargetRange(1,1)
			e1:SetReset(RESET_PHASE|PHASE_DAMAGE)
			Duel.RegisterEffect(e1,tp)
			if tc and tc:IsLocation(LOCATION_MZONE) then Duel.ForceAttack(sc,tc) end
		end
		local e2=Effect.CreateEffect(e:GetHandler())
		e2:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		e2:SetCode(EVENT_PHASE+PHASE_END)
		e2:SetCountLimit(1)
		e2:SetReset(RESET_PHASE|PHASE_END,Duel.IsPhase(PHASE_END) and 2 or 1)
		e2:SetOperation(function()
			local t1,t2=Duel.GetFieldGroupCount(tp,LOCATION_MZONE,0),Duel.GetFieldGroupCount(1-tp,LOCATION_MZONE,0)
			if t1>0 and t2==0 then win(tp) elseif t2>0 and t1==0 then win(1-tp) else Duel.Win(PLAYER_NONE,R.WIN_REASON) end
		end)
		Duel.RegisterEffect(e2,tp)
	end}
--Self-Destruct Button.
U.self_destruct={cat=0,op=function(e,tp) Duel.SetLP(tp,0) Duel.SetLP(1-tp,0) end}
--Reversal Quiz (its cost is send_all).
U.quiz_swap={cat=0,check=function(e,tp) return Duel.GetFieldGroupCount(tp,LOCATION_DECK,0)>0 end,
	op=function(e,tp)
		local tc=Duel.GetDecktopGroup(tp,1):GetFirst()
		if not tc then return end
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_CARDTYPE)
		local res=Duel.SelectOption(tp,70,71,72)
		Duel.ConfirmDecktop(tp,1)
		if (res==0 and tc:IsMonster()) or (res==1 and tc:IsSpell()) or (res==2 and tc:IsTrap()) then
			local lp1,lp2=Duel.GetLP(tp),Duel.GetLP(1-tp)
			Duel.SetLP(tp,lp2) Duel.SetLP(1-tp,lp1)
		end
		Duel.ShuffleDeck(tp)
	end}
--Exchange of the Spirit.
U.swap_deck_gy={cat=0,op=function(e,tp) Duel.SwapDeckAndGrave(tp) Duel.SwapDeckAndGrave(1-tp) end}
--Fiber Jar.
U.fiber_reset={cat=CATEGORY_TODECK+CATEGORY_DRAW,
	prep=function(e,tp)
		local g=Duel.GetFieldGroup(tp,LOCATION_HAND|LOCATION_ONFIELD|LOCATION_GRAVE,LOCATION_HAND|LOCATION_ONFIELD|LOCATION_GRAVE)
		Duel.SetOperationInfo(0,CATEGORY_TODECK,g,#g,0,0)
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local g=Duel.GetFieldGroup(tp,LOCATION_HAND|LOCATION_ONFIELD|LOCATION_GRAVE,LOCATION_HAND|LOCATION_ONFIELD|LOCATION_GRAVE)
		g:Remove(Card.IsStatus,nil,STATUS_BATTLE_DESTROYED)
		Duel.SendtoDeck(g,nil,SEQ_DECKSHUFFLE,REASON_EFFECT)
		local tg=Duel.GetOperatedGroup():Filter(Card.IsLocation,nil,LOCATION_DECK)
		if tg:IsExists(Card.IsControler,1,nil,tp) then Duel.ShuffleDeck(tp) end
		if tg:IsExists(Card.IsControler,1,nil,1-tp) then Duel.ShuffleDeck(1-tp) end
		Duel.BreakEffect()
		Duel.Draw(tp,p.n,REASON_EFFECT)
		Duel.Draw(1-tp,p.n,REASON_EFFECT)
	end}
U.morphing_jar_effect={cat=CATEGORY_HANDES+CATEGORY_DRAW,
	check=function() return true end,
	prep=function(e,tp)
		Duel.SetOperationInfo(0,CATEGORY_HANDES,nil,0,PLAYER_ALL,0)
		Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,PLAYER_ALL,5)
	end,
	op=function(e,tp)
		local g=Duel.GetFieldGroup(tp,LOCATION_HAND,LOCATION_HAND)
		if #g>0 then Duel.SendtoGrave(g,REASON_DISCARD|REASON_EFFECT) end
		Duel.BreakEffect()
		Duel.Draw(tp,5,REASON_EFFECT)
		Duel.Draw(1-tp,5,REASON_EFFECT)
	end}
--Parasite Paracide.
U.parasite={cat=CATEGORY_TODECK,deck_reverse=true,
	check=function(e) return e:GetHandler():IsAbleToDeck() end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local c=e:GetHandler()
		if not c:IsRelateToEffect(e) or c:IsStatus(STATUS_BATTLE_DESTROYED) then return end
		Duel.SendtoDeck(c,1-tp,SEQ_DECKSHUFFLE,REASON_EFFECT)
		if not c:IsLocation(LOCATION_DECK) then return end
		Duel.ShuffleDeck(1-tp)
		c:ReverseInDeck()
		local e1=Effect.CreateEffect(c)
		e1:SetDescription(str(e,0))
		e1:SetCategory(CATEGORY_SPECIAL_SUMMON)
		e1:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_F)
		e1:SetCode(EVENT_DRAW)
		e1:SetTarget(function(se,stp,seg,sep,sev,sre,sr,srp,chk)
			if chk==0 then return se:GetHandler():IsRelateToEffect(se) end
			Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,se:GetHandler(),1,0,0)
		end)
		e1:SetOperation(function(se,stp)
			local sc=se:GetHandler()
			if sc:IsRelateToEffect(se) and Duel.SpecialSummon(sc,0,stp,stp,false,false,POS_FACEUP_DEFENSE)>0 then
				Duel.Damage(stp,p.n,REASON_EFFECT)
				local e2=Effect.CreateEffect(sc)
				e2:SetType(EFFECT_TYPE_FIELD)
				e2:SetCode(EFFECT_CHANGE_RACE)
				e2:SetRange(LOCATION_MZONE)
				e2:SetTargetRange(LOCATION_MZONE,0)
				e2:SetValue(p.race)
				e2:SetReset(RESET_EVENT|RESETS_STANDARD)
				sc:RegisterEffect(e2)
			end
		end)
		e1:SetReset(RESET_EVENT|RESETS_STANDARD&~RESET_TOHAND)
		c:RegisterEffect(e1)
	end}
--Pharaoh's Treasure.
U.treasure={cat=CATEGORY_TODECK,deck_reverse=true,
	check=function(e) return e:GetHandler():IsAbleToDeck() end,
	op=function(e,tp)
		local c=e:GetHandler()
		if not c:IsRelateToEffect(e) then return end
		if c:IsSpellTrap() then c:CancelToGrave() end
		if Duel.SendtoDeck(c,tp,SEQ_DECKSHUFFLE,REASON_EFFECT)~=0 and c:IsLocation(LOCATION_DECK) then
			c:ReverseInDeck()
			local e1=Effect.CreateEffect(c)
			e1:SetDescription(str(e,0))
			e1:SetCategory(CATEGORY_TOHAND)
			e1:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_F)
			e1:SetProperty(EFFECT_FLAG_CARD_TARGET)
			e1:SetCode(EVENT_DRAW)
			e1:SetTarget(function(se,stp,seg,sep,sev,sre,sr,srp,chk,chkc)
				if chkc then return chkc:IsLocation(LOCATION_GRAVE) and chkc:IsControler(stp) and chkc:IsAbleToHand() end
				if chk==0 then return se:GetHandler():IsRelateToEffect(se) and Duel.IsExistingTarget(Card.IsAbleToHand,stp,LOCATION_GRAVE,0,1,nil) end
				Duel.Hint(HINT_SELECTMSG,stp,HINTMSG_ATOHAND)
				local sg=Duel.SelectTarget(stp,Card.IsAbleToHand,stp,LOCATION_GRAVE,0,1,1,nil)
				Duel.SetOperationInfo(0,CATEGORY_TOHAND,sg,#sg,0,0)
			end)
			e1:SetOperation(function(se,stp)
				local sc,tc=se:GetHandler(),Duel.GetFirstTarget()
				if tc and tc:IsRelateToEffect(se) and sc:IsRelateToEffect(se) and Duel.SendtoGrave(sc,REASON_EFFECT)~=0 and sc:IsLocation(LOCATION_GRAVE) then
					Duel.SendtoHand(tc,nil,REASON_EFFECT)
					Duel.ConfirmCards(1-stp,tc)
				end
			end)
			e1:SetReset(RESET_EVENT|(RESETS_STANDARD&~RESET_TOHAND))
			c:RegisterEffect(e1)
		end
	end}
--Yu-Jo Friendship: the opponent decides.
U.handshake={cat=CATEGORY_RECOVER,op=function(e,tp)
	if Duel.SelectYesNo(1-tp,str(e,0)) then
		local lp=math.floor((Duel.GetLP(tp)+Duel.GetLP(1-tp))/2)
		Duel.SetLP(tp,lp) Duel.SetLP(1-tp,lp)
	end
end}
--Fiend Comedian (Heads half; the Tails half is the coin's 'mill_opp_gy').
local gyban=function(c) return c:IsAbleToRemove() and aux.SpElimFilter(c) end
U.banish_opp_gy_all={cat=CATEGORY_REMOVE,
	check=function(e,tp) return Duel.IsExistingMatchingCard(Card.IsAbleToRemove,tp,0,LOCATION_GRAVE,1,nil) end,
	prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_REMOVE,nil,1,1-tp,LOCATION_GRAVE) end,
	op=function(e,tp) Duel.Remove(Duel.GetMatchingGroup(aux.NecroValleyFilter(Card.IsAbleToRemove),tp,0,LOCATION_GRAVE,nil),POS_FACEUP,REASON_EFFECT) end}
--Neko Mane King: the turn player skips straight to the End Phase.
U.end_turn={cat=0,op=function(e,tp)
	if not Duel.IsTurnPlayer(1-tp) then return end
	for _,ph in ipairs({PHASE_DRAW,PHASE_STANDBY,PHASE_MAIN1,PHASE_MAIN2}) do Duel.SkipPhase(1-tp,ph,RESET_PHASE|PHASE_END,1) end
	Duel.SkipPhase(1-tp,PHASE_BATTLE,RESET_PHASE|PHASE_END,1,1)
	local e1=Effect.CreateEffect(e:GetHandler())
	e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e1:SetType(EFFECT_TYPE_FIELD)
	e1:SetCode(EFFECT_CANNOT_BP)
	e1:SetTargetRange(0,1)
	e1:SetReset(RESET_PHASE|PHASE_END)
	Duel.RegisterEffect(e1,tp)
end}
--Exchange.
U.exchange_card={cat=0,
	check=function(e,tp) return Duel.GetFieldGroupCount(tp,0,LOCATION_HAND)>0 and Duel.IsExistingMatchingCard(nil,tp,LOCATION_HAND,0,1,e:GetHandler()) end,
	op=function(e,tp)
		local g1,g2=Duel.GetFieldGroup(tp,LOCATION_HAND,0),Duel.GetFieldGroup(tp,0,LOCATION_HAND)
		if #g1==0 or #g2==0 then return end
		Duel.ConfirmCards(tp,g2) Duel.ConfirmCards(1-tp,g1)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
		local ag1=g2:Select(tp,1,1,nil)
		Duel.Hint(HINT_SELECTMSG,1-tp,HINTMSG_ATOHAND)
		local ag2=g1:Select(1-tp,1,1,nil)
		Duel.SendtoHand(ag1,tp,REASON_EFFECT)
		Duel.SendtoHand(ag2,1-tp,REASON_EFFECT)
	end}
--Question.
local gymon=function(c) return c:IsMonster() and c:IsAbleToRemove() end
U.question_revive={cat=CATEGORY_SPECIAL_SUMMON+CATEGORY_REMOVE,
	check=function(e,tp) return Duel.IsExistingMatchingCard(gymon,tp,LOCATION_GRAVE,0,1,nil) end,
	op=function(e,tp)
		local g=Duel.GetMatchingGroup(gymon,tp,LOCATION_GRAVE,0,nil)
		if #g==0 then return end
		local last=g:GetFirst()
		for tc in aux.Next(g) do if tc:GetSequence()<last:GetSequence() then last=tc end end
		Duel.Hint(HINT_SELECTMSG,1-tp,HINTMSG_CODE)
		local ac=Duel.AnnounceCard(1-tp,TYPE_MONSTER)
		if ac~=last:GetCode() then
			if zones(tp)>0 and last:IsCanBeSpecialSummoned(e,0,tp,false,false) then Duel.SpecialSummon(last,0,tp,tp,false,false,POS_FACEUP) end
		else Duel.Remove(last,POS_FACEUP,REASON_EFFECT) end
	end}
--Painful Choice.
local both=aux.AND(Card.IsAbleToHand,Card.IsAbleToGrave)
U.painful_choice={cat=CATEGORY_TOHAND+CATEGORY_SEARCH+CATEGORY_TOGRAVE,
	check=function(e,tp,eg,ep,ev,re,r,rp,p) return Duel.IsExistingMatchingCard(both,tp,LOCATION_DECK,0,p.n,nil) end,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p)
		Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_DECK)
		Duel.SetOperationInfo(0,CATEGORY_TOGRAVE,nil,p.n-1,tp,LOCATION_DECK)
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_CONFIRM)
		local g=Duel.SelectMatchingCard(tp,both,tp,LOCATION_DECK,0,p.n,p.n,nil)
		if #g~=p.n then return end
		Duel.ConfirmCards(1-tp,g)
		Duel.Hint(HINT_SELECTMSG,1-tp,HINTMSG_ATOHAND)
		local sg=g:Select(1-tp,1,1,nil)
		if Duel.SendtoHand(sg,nil,REASON_EFFECT)>0 then Duel.ConfirmCards(1-tp,sg) Duel.SendtoGrave(g-sg,REASON_EFFECT) end
	end}
--Different Dimension Capsule: the card comes back during your Nth Standby Phase from now.
U.dd_capsule={cat=CATEGORY_REMOVE,
	check=function(e,tp) return Duel.IsExistingMatchingCard(Card.IsAbleToRemove,tp,LOCATION_DECK,0,1,nil,tp,POS_FACEDOWN) end,
	prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_REMOVE,nil,1,tp,LOCATION_DECK) end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)
		local tc=Duel.SelectMatchingCard(tp,Card.IsAbleToRemove,tp,LOCATION_DECK,0,1,1,nil,tp,POS_FACEDOWN):GetFirst()
		if not tc or Duel.Remove(tc,POS_FACEDOWN,REASON_EFFECT)==0 then return end
		tc:RegisterFlagEffect(FLAG_CAPSULE,RESET_EVENT|RESETS_STANDARD,0,1)
		local ce=Effect.CreateEffect(e:GetHandler())
		ce:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		ce:SetCode(EVENT_PHASE|PHASE_STANDBY)
		ce:SetCountLimit(1)
		ce:SetLabel(0)
		ce:SetLabelObject(tc)
		ce:SetCondition(function() return Duel.IsTurnPlayer(tp) end)
		ce:SetOperation(function(se)
			local ct=se:GetLabel()+1
			se:SetLabel(ct)
			if ct<p.n then return end
			local sc=se:GetLabelObject()
			if sc:GetFlagEffect(FLAG_CAPSULE)>0 and sc:IsLocation(LOCATION_REMOVED) then Duel.SendtoHand(sc,tp,REASON_EFFECT) Duel.ConfirmCards(1-tp,sc) end
			se:Reset()
		end)
		Duel.RegisterEffect(ce,tp)
	end}
--Reasoning.
U.reasoning={cat=CATEGORY_SPECIAL_SUMMON+CATEGORY_DECKDES,
	check=function(e,tp)
		return zones(tp)>0 and Duel.IsPlayerCanSpecialSummon(tp) and Duel.IsPlayerCanDiscardDeck(tp,1)
			and Duel.IsExistingMatchingCard(Card.IsSummonableCard,tp,LOCATION_DECK,0,1,nil)
	end,
	op=function(e,tp)
		if not Duel.IsPlayerCanSpecialSummon(tp) or not Duel.IsPlayerCanDiscardDeck(tp,1) then return end
		Duel.Hint(HINT_SELECTMSG,1-tp,HINTMSG_LVRANK)
		local lv=Duel.AnnounceLevel(1-tp)
		local g=Duel.GetMatchingGroup(Card.IsSummonableCard,tp,LOCATION_DECK,0,nil)
		local dcount=Duel.GetFieldGroupCount(tp,LOCATION_DECK,0)
		local seq,spcard=-1,nil
		for tc in g:Iter() do if tc:GetSequence()>seq then seq=tc:GetSequence() spcard=tc end end
		if seq==-1 then Duel.ConfirmDecktop(tp,dcount) Duel.ShuffleDeck(tp) return end
		Duel.ConfirmDecktop(tp,dcount-seq)
		if zones(tp)>0 and lv~=spcard:GetLevel() and spcard:IsCanBeSpecialSummoned(e,0,tp,false,false) then
			Duel.DisableShuffleCheck()
			if dcount-seq==1 then Duel.SpecialSummon(spcard,0,tp,tp,false,false,POS_FACEUP)
			else
				Duel.SpecialSummonStep(spcard,0,tp,tp,false,false,POS_FACEUP)
				Duel.DiscardDeck(tp,dcount-seq-1,REASON_EFFECT)
				Duel.SpecialSummonComplete()
			end
		else Duel.DiscardDeck(tp,dcount-seq,REASON_EFFECT|REASON_EXCAVATE) end
	end}
--Magical Hats (only during the opponent's Battle Phase: 'opp_bp').
local hatmon=function(c) return c:GetSequence()<5 and not c:IsType(TYPE_TOKEN+TYPE_LINK) end
local hatst=function(c,e,tp) return c:IsSpellTrap() and Duel.IsPlayerCanSpecialSummonMonster(tp,c:GetCode(),nil,TYPE_MONSTER|TYPE_NORMAL,0,0,0,0,0,POS_FACEDOWN) end
U.magical_hats={cat=CATEGORY_POSITION+CATEGORY_SPECIAL_SUMMON,
	check=function(e,tp)
		return Duel.IsExistingMatchingCard(hatmon,tp,LOCATION_MZONE,0,1,nil) and not Duel.IsPlayerAffectedByEffect(tp,CARD_BLUEEYES_SPIRIT)
			and zones(tp)>1 and Duel.IsExistingMatchingCard(hatst,tp,LOCATION_DECK,0,2,nil,e,tp)
	end,
	op=function(e,tp)
		if Duel.IsPlayerAffectedByEffect(tp,CARD_BLUEEYES_SPIRIT) or zones(tp)<2 then return end
		local g=Duel.GetMatchingGroup(hatst,tp,LOCATION_DECK,0,nil,e,tp)
		if #g<2 then return end
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TARGET)
		local tc=Duel.SelectMatchingCard(tp,hatmon,tp,LOCATION_MZONE,0,1,1,nil):GetFirst()
		if not tc or tc:IsImmuneToEffect(e) then return end
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
		local sg=g:Select(tp,2,2,nil)
		if tc:IsFaceup() then
			if tc:IsHasEffect(EFFECT_LIGHT_OF_INTERVENTION) then Duel.ChangePosition(tc,POS_FACEUP_DEFENSE)
			else Duel.ChangePosition(tc,POS_FACEDOWN_DEFENSE) tc:ClearEffectRelation() end
		end
		local fid=e:GetHandler():GetFieldID()
		local flag=e:GetHandler():GetOriginalCode()
		local reset=RESET_EVENT|RESET_TOGRAVE|RESET_REMOVE|RESET_TEMP_REMOVE|RESET_TOHAND|RESET_TODECK|RESET_OVERLAY
		for tg in aux.Next(sg) do
			local e1=Effect.CreateEffect(tg)
			e1:SetType(EFFECT_TYPE_SINGLE)
			e1:SetCode(EFFECT_CHANGE_TYPE)
			e1:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
			e1:SetValue(TYPE_NORMAL+TYPE_MONSTER)
			e1:SetReset(reset)
			tg:RegisterEffect(e1,true)
			for code,value in pairs({[EFFECT_REMOVE_RACE]=RACE_ALL,[EFFECT_REMOVE_ATTRIBUTE]=0xff,[EFFECT_SET_BASE_ATTACK]=0,[EFFECT_SET_BASE_DEFENSE]=0}) do
				local e2=e1:Clone() e2:SetCode(code) e2:SetValue(value) tg:RegisterEffect(e2,true)
			end
			tg:RegisterFlagEffect(flag,reset|RESET_PHASE|PHASE_BATTLE,0,1,fid)
			tg:SetStatus(STATUS_NO_LEVEL,true)
		end
		Duel.SpecialSummon(sg,0,tp,tp,true,false,POS_FACEDOWN_DEFENSE)
		Duel.ConfirmCards(1-tp,sg)
		sg:AddCard(tc)
		Duel.ShuffleSetCard(sg)
		sg:RemoveCard(tc)
		sg:KeepAlive()
		local de=Effect.CreateEffect(e:GetHandler())
		de:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		de:SetCode(EVENT_PHASE|PHASE_BATTLE)
		de:SetReset(RESET_PHASE|PHASE_BATTLE)
		de:SetProperty(EFFECT_FLAG_IGNORE_IMMUNE)
		de:SetCountLimit(1)
		de:SetLabelObject(sg)
		de:SetOperation(function(se)
			local hg=se:GetLabelObject()
			local tg=hg:Filter(function(c) return c:GetFlagEffectLabel(flag)==fid end,nil)
			hg:DeleteGroup()
			Duel.Destroy(tg,REASON_EFFECT)
			Duel.SendtoGrave(tg:Filter(function(c) return c:GetFlagEffectLabel(flag)==fid end,nil),REASON_EFFECT)
		end)
		Duel.RegisterEffect(de,tp)
	end}
--Ordeal of a Traveler (timing: an opponent's attack).
U.ordeal_guess={cat=CATEGORY_TOHAND,
	check=function(e,tp) return Duel.GetFieldGroupCount(tp,LOCATION_HAND,0)>0 and Duel.GetAttacker()~=nil end,
	prep=function() Duel.SetTargetCard(Duel.GetAttacker()) end,
	op=function(e,tp)
		local a=Duel.GetAttacker()
		if Duel.GetFieldGroupCount(tp,LOCATION_HAND,0)==0 or not a or not a:IsRelateToEffect(e) then return end
		local tc=Duel.GetFieldGroup(tp,LOCATION_HAND,0):RandomSelect(1-tp,1):GetFirst()
		Duel.Hint(HINT_SELECTMSG,1-tp,HINTMSG_CARDTYPE)
		local op=Duel.SelectOption(1-tp,DECLTYPE_MONSTER,DECLTYPE_SPELL,DECLTYPE_TRAP)
		Duel.ConfirmCards(1-tp,tc)
		Duel.ShuffleHand(tp)
		if (op~=0 and tc:IsMonster()) or (op~=1 and tc:IsSpell()) or (op~=2 and tc:IsTrap()) then Duel.SendtoHand(a,nil,REASON_EFFECT) end
	end}
--D.D. Designator.
local not_extra={TYPE_EXTRA,OPCODE_ISTYPE,OPCODE_NOT}
U.dd_designator={cat=CATEGORY_REMOVE,
	check=function(e,tp) return Duel.GetFieldGroupCount(tp,0,LOCATION_HAND)>0 and Duel.IsExistingMatchingCard(nil,tp,LOCATION_HAND,0,1,e:GetHandler()) end,
	op=function(e,tp)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_CODE)
		local ac=Duel.AnnounceCard(tp,table.unpack(not_extra))
		local g=Duel.GetMatchingGroup(Card.IsCode,tp,0,LOCATION_HAND,nil,ac)
		Duel.ConfirmCards(tp,Duel.GetFieldGroup(tp,0,LOCATION_HAND))
		if #g>0 then
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)
			Duel.Remove(g:Select(tp,1,1,nil),POS_FACEUP,REASON_EFFECT)
		else
			local own=Duel.GetFieldGroup(tp,LOCATION_HAND,0)
			if #own>0 then Duel.Remove(own:RandomSelect(tp,1),POS_FACEUP,REASON_EFFECT) end
		end
		Duel.ShuffleHand(1-tp)
	end}
--Archfiend's Oath.
U.oath_guess={cat=CATEGORY_TOHAND+CATEGORY_DECKDES,
	check=function(e,tp) return Duel.IsPlayerCanDiscardDeck(tp,1) and Duel.IsExistingMatchingCard(Card.IsAbleToHand,tp,LOCATION_DECK,0,1,nil) end,
	op=function(e,tp)
		if not Duel.IsPlayerCanDiscardDeck(tp,1) then return end
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_CODE)
		local ac=Duel.AnnounceCard(tp,table.unpack(not_extra))
		Duel.ConfirmDecktop(tp,1)
		local tc=Duel.GetDecktopGroup(tp,1):GetFirst()
		Duel.DisableShuffleCheck()
		if tc:IsCode(ac) and tc:IsAbleToHand() then Duel.SendtoHand(tc,nil,REASON_EFFECT) Duel.ShuffleHand(tp)
		else Duel.SendtoGrave(tc,REASON_EFFECT|REASON_EXCAVATE) end
	end}
--Fairy Box (with a 'call' coin wrap).
U.attacker_zero={cat=CATEGORY_ATKCHANGE,
	check=function() return Duel.GetAttacker()~=nil end,
	prep=function() Duel.SetTargetCard(Duel.GetAttacker()) end,
	op=function(e)
		local a=Duel.GetAttacker()
		if not (a and a:IsRelateToEffect(e) and a:IsFaceup()) then return end
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_SINGLE)
		e1:SetCode(EFFECT_SET_ATTACK_FINAL)
		e1:SetValue(0)
		e1:SetReset(RESET_EVENT|RESETS_STANDARD|RESET_PHASE|PHASE_BATTLE)
		a:RegisterEffect(e1)
	end}
--Dice Jar.
U.dice_duel={cat=CATEGORY_DICE+CATEGORY_DAMAGE,
	prep=function() Duel.SetOperationInfo(0,CATEGORY_DICE,nil,0,PLAYER_ALL,1) end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local d1,d2=0,0
		while d1==d2 do d1,d2=Duel.TossDice(tp,1,1) end
		local loser,high=(d1<d2) and tp or 1-tp,math.max(d1,d2)
		Duel.Damage(loser,high==6 and p.n*12 or high*p.n,REASON_EFFECT)
	end}
--Gamble (with a 'call' coin wrap whose wrong call skips your next turn).
U.draw_until={cat=CATEGORY_DRAW,
	check=function(e,tp,eg,ep,ev,re,r,rp,p) return Duel.GetFieldGroupCount(tp,LOCATION_HAND,0)<p.n and Duel.IsPlayerCanDraw(tp) end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local ct=p.n-Duel.GetFieldGroupCount(tp,LOCATION_HAND,0)
		if ct>0 then Duel.Draw(tp,ct,REASON_EFFECT) end
	end}
--Ante.
U.ante={cat=CATEGORY_TOGRAVE+CATEGORY_DAMAGE,
	check=function(e,tp)
		local h1=Duel.GetFieldGroupCount(tp,LOCATION_HAND,0)
		if e:GetHandler():IsLocation(LOCATION_HAND) then h1=h1-1 end
		return h1>0 and Duel.GetFieldGroupCount(tp,0,LOCATION_HAND)>0
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		if Duel.GetFieldGroupCount(tp,LOCATION_HAND,0)==0 or Duel.GetFieldGroupCount(tp,0,LOCATION_HAND)==0 then return end
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_CONFIRM)
		local g1=Duel.SelectMatchingCard(tp,nil,tp,LOCATION_HAND,0,1,1,nil)
		Duel.Hint(HINT_SELECTMSG,1-tp,HINTMSG_CONFIRM)
		local g2=Duel.SelectMatchingCard(1-tp,nil,1-tp,LOCATION_HAND,0,1,1,nil)
		Duel.ConfirmCards(1-tp,g1) Duel.ConfirmCards(tp,g2)
		local a,b=g1:GetFirst(),g2:GetFirst()
		local la,lb=a:IsMonster() and a:GetLevel() or 0,b:IsMonster() and b:GetLevel() or 0
		if la>lb then Duel.Damage(1-tp,p.n,REASON_EFFECT) Duel.SendtoGrave(g2,REASON_EFFECT)
		elseif lb>la then Duel.Damage(tp,p.n,REASON_EFFECT) Duel.SendtoGrave(g1,REASON_EFFECT) end
		Duel.ShuffleHand(tp) Duel.ShuffleHand(1-tp)
	end}
--Cursed Seal of the Forbidden Spell.
U.negate_ban={cat=CATEGORY_NEGATE+CATEGORY_DESTROY,
	prep=function(e,tp,eg,ep,ev,re)
		Duel.SetOperationInfo(0,CATEGORY_NEGATE,eg,1,0,0)
		if re:GetHandler():IsDestructable() and re:GetHandler():IsRelateToEffect(re) then Duel.SetOperationInfo(0,CATEGORY_DESTROY,eg,1,0,0) end
	end,
	op=function(e,tp,eg,ep,ev,re)
		if Duel.NegateActivation(ev) and re:GetHandler():IsRelateToEffect(re) and Duel.Destroy(eg,REASON_EFFECT)~=0 then
			local e1=Effect.CreateEffect(e:GetHandler())
			e1:SetType(EFFECT_TYPE_FIELD)
			e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
			e1:SetCode(EFFECT_CANNOT_ACTIVATE)
			e1:SetTargetRange(0,1)
			e1:SetLabel(re:GetHandler():GetCode())
			e1:SetValue(function(se,te) return te:IsHasType(EFFECT_TYPE_ACTIVATE) and te:GetHandler():IsCode(se:GetLabel()) end)
			Duel.RegisterEffect(e1,tp)
		end
	end}
--Chain Disappearance (timing: the opponent's Summon; names the monsters without targeting them).
U.banish_copies={cat=CATEGORY_REMOVE,target=true,notarget=true,
	check=function(e,tp,eg,ep,ev,re,r,rp,p)
		return eg:IsExists(function(c) return c:IsLocation(LOCATION_MZONE) and c:IsFaceup() and c:IsAttackBelow(p.n) and c:IsAbleToRemove() end,1,nil)
	end,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p)
		local g=eg:Filter(function(c) return c:IsLocation(LOCATION_MZONE) and c:IsFaceup() and c:IsAttackBelow(p.n) and c:IsAbleToRemove() end,nil)
		Duel.SetTargetCard(g)
		Duel.SetOperationInfo(0,CATEGORY_REMOVE,g,#g,0,0)
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local sg=Duel.GetTargetCards(e):Filter(function(c) return c:IsFaceup() and c:IsAttackBelow(p.n) end,nil)
		if #sg==0 or Duel.Remove(sg,POS_FACEUP,REASON_EFFECT)==0 then return end
		local rg=Group.CreateGroup()
		for tc in sg:Iter() do
			if tc:IsLocation(LOCATION_REMOVED) and not tc:IsType(TYPE_TOKEN) then
				rg:Merge(Duel.GetMatchingGroup(Card.IsCode,tp,0,LOCATION_DECK|LOCATION_HAND,nil,tc:GetCode()))
			end
		end
		if #rg>0 then Duel.BreakEffect() Duel.Remove(rg,POS_FACEUP,REASON_EFFECT) end
	end}
--The Law of the Normal (its condition is 'control_normals').
local lawkeep=function(c) return c:IsFaceup() and c:IsType(TYPE_NORMAL) and c:IsLevelBelow(2) end
U.law_wipe={cat=CATEGORY_DESTROY+CATEGORY_HANDES,
	check=function(e,tp)
		return Duel.IsExistingMatchingCard(aux.NOT(lawkeep),tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,e:GetHandler())
			or Duel.GetFieldGroupCount(tp,0,LOCATION_HAND)>0
	end,
	op=function(e,tp)
		Duel.SendtoGrave(Duel.GetFieldGroup(tp,LOCATION_HAND,LOCATION_HAND),REASON_EFFECT|REASON_DISCARD)
		local g=Duel.GetMatchingGroup(aux.NOT(lawkeep),tp,LOCATION_ONFIELD,LOCATION_ONFIELD,nil)
		if e:GetHandler():IsLocation(LOCATION_ONFIELD) and not e:GetHandler():IsRelateToEffect(e) then g:RemoveCard(e:GetHandler()) end
		Duel.Destroy(g,REASON_EFFECT)
	end}
--Huge Revolution (its condition is 'control_named').
U.revolution={cat=CATEGORY_DESTROY+CATEGORY_TOGRAVE,
	check=function(e,tp) return Duel.GetFieldGroupCount(tp,0,LOCATION_ONFIELD)>0 or Duel.IsExistingMatchingCard(Card.IsAbleToGrave,tp,0,LOCATION_HAND,1,nil) end,
	op=function(e,tp)
		local hg=Duel.GetMatchingGroup(Card.IsAbleToGrave,tp,0,LOCATION_HAND,nil)
		if #hg>0 then Duel.SendtoGrave(hg,REASON_EFFECT) end
		local dg=Duel.GetFieldGroup(tp,0,LOCATION_ONFIELD)
		if #dg>0 then Duel.Destroy(dg,REASON_EFFECT) end
	end}
--Lightforce Sword: the card returns during its owner's Nth Standby Phase from now.
U.banish_hand_temp={cat=CATEGORY_REMOVE,
	check=function(e,tp) return Duel.IsExistingMatchingCard(Card.IsAbleToRemove,tp,0,LOCATION_HAND,1,nil,tp,POS_FACEDOWN) end,
	prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_REMOVE,nil,1,1-tp,LOCATION_HAND) end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local tc=Duel.GetFieldGroup(1-tp,LOCATION_HAND,0):RandomSelect(1-tp,1):GetFirst()
		if not tc or Duel.Remove(tc,POS_FACEDOWN,REASON_EFFECT)==0 then return end
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		e1:SetRange(LOCATION_REMOVED)
		e1:SetCode(EVENT_PHASE|PHASE_STANDBY)
		e1:SetCountLimit(1)
		e1:SetReset(RESET_EVENT|RESETS_STANDARD|RESET_PHASE|PHASE_STANDBY|RESET_SELF_TURN,p.n+1)
		e1:SetLabel(0)
		e1:SetCondition(function(se,stp) return Duel.IsTurnPlayer(stp) end)
		e1:SetOperation(function(se)
			local ct=se:GetLabel()+1
			se:SetLabel(ct)
			if ct>=p.n then Duel.SendtoHand(se:GetHandler(),nil,REASON_EFFECT) end
		end)
		tc:RegisterEffect(e1)
	end}
--Yata-Garasu.
U.skip_draw={cat=0,op=function(e,tp)
	local e1=Effect.CreateEffect(e:GetHandler())
	e1:SetType(EFFECT_TYPE_FIELD)
	e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e1:SetCode(EFFECT_SKIP_DP)
	e1:SetTargetRange(0,1)
	e1:SetReset(RESET_PHASE|PHASE_END|RESET_OPPO_TURN)
	Duel.RegisterEffect(e1,tp)
end}
--Magical Arm Shield (timing: an opponent's attack).
U.arm_shield=targeted({cat=CATEGORY_CONTROL,target=true,loc1=0,loc2=LOCATION_MZONE,hint=HINTMSG_CONTROL,
	filter=function(c) return c:IsFaceup() and c:IsControlerCanBeChanged() and c~=Duel.GetAttacker() end,
	op=function(e,tp)
		local tc,a=Duel.GetFirstTarget(),Duel.GetAttacker()
		if relate(e,tc) and tc:IsFaceup() and Duel.GetControl(tc,tp,PHASE_BATTLE,1)~=0 then
			if a and a:IsRelateToBattle() and a:CanAttack() and not a:IsImmuneToEffect(e) then Duel.CalculateDamage(a,tc) end
		end
	end})
--Spirit of the Pharaoh.
local revnormal=function(c,e,tp,p) return c:IsType(TYPE_NORMAL) and c:IsLevelBelow(p.l) and c:IsCanBeSpecialSummoned(e,0,tp,false,false) end
U.mass_revive={cat=CATEGORY_SPECIAL_SUMMON,
	check=function(e,tp,eg,ep,ev,re,r,rp,p) return zones(tp)>0 and Duel.IsExistingMatchingCard(revnormal,tp,LOCATION_GRAVE,0,1,nil,e,tp,p) end,
	prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_GRAVE) end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local ft=math.min(zones(tp),p.n)
		if Duel.IsPlayerAffectedByEffect(tp,CARD_BLUEEYES_SPIRIT) then ft=math.min(ft,1) end
		if ft<=0 then return end
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
		local g=Duel.SelectMatchingCard(tp,aux.NecroValleyFilter(revnormal),tp,LOCATION_GRAVE,0,1,ft,nil,e,tp,p)
		if #g>0 then Duel.SpecialSummon(g,0,tp,tp,false,false,POS_FACEUP) end
	end}
--Dark Sage: this card, from the hand or Deck.
U.ss_self={cat=CATEGORY_SPECIAL_SUMMON,hand=true,
	check=function(e,tp) return Duel.GetMZoneCount(tp)>0 and e:GetHandler():IsCanBeSpecialSummoned(e,0,tp,false,false) end,
	prep=function(e) Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,e:GetHandler(),1,0,e:GetHandler():GetLocation()) end,
	op=function(e,tp)
		local c=e:GetHandler()
		if not c:IsRelateToEffect(e) then return end
		if c:IsLocation(LOCATION_DECK) then Duel.ConfirmCards(1-tp,c) end
		Duel.SpecialSummon(c,0,tp,tp,false,false,POS_FACEUP)
	end}
--Thousand-Eyes Restrict: absorb a monster as an Equip Card and take its ATK/DEF.
U.absorb=targeted({cat=CATEGORY_EQUIP,target=true,loc1=0,loc2=LOCATION_MZONE,hint=HINTMSG_EQUIP,
	filter=function(c) return c:IsAbleToChangeControler() end,
	op=function(e,tp)
		local c,tc=e:GetHandler(),Duel.GetFirstTarget()
		if not (relate(e,tc) and c:IsRelateToEffect(e) and c:IsFaceup() and tc:IsMonster() and tc:IsControler(1-tp)) then return end
		if Duel.GetLocationCount(tp,LOCATION_SZONE)<=0 or not Duel.Equip(tp,tc,c,false) then return end
		local e1=Effect.CreateEffect(c)
		e1:SetType(EFFECT_TYPE_SINGLE)
		e1:SetCode(EFFECT_EQUIP_LIMIT)
		e1:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
		e1:SetValue(function(se,ec) return ec==c end)
		e1:SetReset(RESET_EVENT|RESETS_STANDARD)
		tc:RegisterEffect(e1)
		local atk,def=math.max(tc:GetTextAttack(),0),math.max(tc:GetTextDefense(),0)
		local held=function() return c:GetEquipGroup():IsContains(tc) end
		for code,value in pairs({[EFFECT_SET_ATTACK]=atk,[EFFECT_SET_DEFENSE]=def}) do
			local e2=Effect.CreateEffect(c)
			e2:SetType(EFFECT_TYPE_SINGLE)
			e2:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
			e2:SetRange(LOCATION_MZONE)
			e2:SetCode(code)
			e2:SetCondition(held)
			e2:SetValue(value)
			e2:SetReset(RESET_EVENT|RESETS_STANDARD)
			c:RegisterEffect(e2)
		end
	end})
--Dark Necrofear (timing: destroyed by the opponent; this card is in the GY).
U.steal_equip_self=targeted({cat=CATEGORY_CONTROL+CATEGORY_EQUIP,target=true,loc1=0,loc2=LOCATION_MZONE,hint=HINTMSG_CONTROL,
	filter=function(c,e,tp) return aux.CheckStealEquip(c,e,tp) end,
	op=function(e,tp)
		local c,tc=e:GetHandler(),Duel.GetFirstTarget()
		if not (tc and c:IsRelateToEffect(e) and relate(e,tc) and aux.CheckStealEquip(tc,e,tp) and Duel.Equip(tp,c,tc)) then return end
		local e1=Effect.CreateEffect(tc)
		e1:SetType(EFFECT_TYPE_SINGLE)
		e1:SetCode(EFFECT_EQUIP_LIMIT)
		e1:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
		e1:SetReset(RESET_EVENT|RESETS_STANDARD)
		e1:SetValue(function(se,ec) return se:GetOwner()==ec end)
		c:RegisterEffect(e1)
		local e2=Effect.CreateEffect(c)
		e2:SetType(EFFECT_TYPE_EQUIP)
		e2:SetCode(EFFECT_SET_CONTROL)
		e2:SetValue(tp)
		e2:SetReset(RESET_EVENT|RESETS_STANDARD&~RESET_TURN_SET)
		c:RegisterEffect(e2)
	end})
--Hino-Kagu-Tsuchi.
U.hand_wipe_next_draw={cat=0,op=function(e,tp)
	local e1=Effect.CreateEffect(e:GetHandler())
	e1:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
	e1:SetCode(EVENT_PREDRAW)
	e1:SetCondition(function() return Duel.IsTurnPlayer(1-tp) end)
	e1:SetOperation(function()
		local g=Duel.GetFieldGroup(tp,0,LOCATION_HAND)
		if #g>0 then Duel.SendtoGrave(g,REASON_DISCARD|REASON_EFFECT) end
	end)
	e1:SetReset(RESET_PHASE|PHASE_DRAW|RESET_OPPO_TURN)
	Duel.RegisterEffect(e1,tp)
end}
--Mushroom Man #2 (its Standby damage is the 'curse_damage' other block).
U.give_self={cat=CATEGORY_CONTROL,
	check=function(e) return e:GetHandler():IsControlerCanBeChanged() end,
	prep=function(e) Duel.SetOperationInfo(0,CATEGORY_CONTROL,e:GetHandler(),1,0,0) end,
	op=function(e,tp)
		local c=e:GetHandler()
		if c:IsRelateToEffect(e) and c:IsFaceup() then Duel.GetControl(c,1-tp) end
	end}
--Ojama Trio.
local OJAMA=29843092
U.ojama_tokens={cat=CATEGORY_SPECIAL_SUMMON+CATEGORY_TOKEN,
	check=function(e,tp,eg,ep,ev,re,r,rp,p)
		return not Duel.IsPlayerAffectedByEffect(tp,CARD_BLUEEYES_SPIRIT) and Duel.GetLocationCount(1-tp,LOCATION_MZONE,tp)>=p.n
			and Duel.IsPlayerCanSpecialSummonMonster(tp,OJAMA,SET_OJAMA,TYPES_TOKEN,0,1000,2,RACE_BEAST,ATTRIBUTE_LIGHT,POS_FACEUP_DEFENSE,1-tp)
	end,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p)
		Duel.SetOperationInfo(0,CATEGORY_TOKEN,nil,p.n,0,0)
		Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,p.n,tp,0)
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		if Duel.IsPlayerAffectedByEffect(tp,CARD_BLUEEYES_SPIRIT) and p.n>1 then return end
		if Duel.GetLocationCount(1-tp,LOCATION_MZONE,tp)<p.n then return end
		for i=0,p.n-1 do
			local token=Duel.CreateToken(tp,OJAMA+i%3)
			if Duel.SpecialSummonStep(token,0,tp,1-tp,false,false,POS_FACEUP_DEFENSE) then
				local e1=Effect.CreateEffect(e:GetHandler())
				e1:SetDescription(3304)
				e1:SetType(EFFECT_TYPE_SINGLE)
				e1:SetCode(EFFECT_UNRELEASABLE_SUM)
				e1:SetProperty(EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_CLIENT_HINT)
				e1:SetReset(RESET_EVENT|RESETS_STANDARD)
				e1:SetValue(1)
				token:RegisterEffect(e1,true)
				local e2=Effect.CreateEffect(e:GetHandler())
				e2:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_CONTINUOUS)
				e2:SetCode(EVENT_LEAVE_FIELD)
				e2:SetOperation(function(se)
					local sc=se:GetHandler()
					if sc:IsReason(REASON_DESTROY) then Duel.Damage(sc:GetPreviousControler(),p.d,REASON_EFFECT) end
					se:Reset()
				end)
				token:RegisterEffect(e2,true)
			end
		end
		Duel.SpecialSummonComplete()
	end}
--Makyura the Destructor (the game's pre-errata version).
U.traps_from_hand={cat=0,op=function(e,tp)
	local e1=Effect.CreateEffect(e:GetHandler())
	e1:SetType(EFFECT_TYPE_FIELD)
	e1:SetCode(EFFECT_TRAP_ACT_IN_HAND)
	e1:SetTargetRange(LOCATION_HAND,0)
	e1:SetReset(RESET_PHASE+PHASE_END)
	Duel.RegisterEffect(e1,tp)
end}
--Great Dezard → Fushioh Richie (its condition is 'kills', its cost Tributes this card).
local evolvef=function(c,e,tp,p) return c:IsCode(p.code) and c:IsCanBeSpecialSummoned(e,0,tp,true,false) end
U.evolve={cat=CATEGORY_SPECIAL_SUMMON,
	check=function(e,tp,eg,ep,ev,re,r,rp,p)
		return Duel.GetMZoneCount(tp,e:GetHandler())>0 and Duel.IsExistingMatchingCard(evolvef,tp,LOCATION_DECK|LOCATION_HAND,0,1,nil,e,tp,p)
	end,
	prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_DECK|LOCATION_HAND) end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		if zones(tp)<=0 then return end
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
		local g=Duel.SelectMatchingCard(tp,evolvef,tp,LOCATION_DECK|LOCATION_HAND,0,1,1,nil,e,tp,p)
		if #g>0 and Duel.SpecialSummon(g,0,tp,tp,true,false,POS_FACEUP)>0 then g:GetFirst():CompleteProcedure() end
	end}
U.negate_targeting=R.Act.negate_activation
for k,v in pairs(U) do R.Act[k]=v end

---------------------------------------------------------------- always-on effects
local function race_or_attr(p,field)
	return function(e,c) if p.race then return c:IsRace(p.race) end return c:IsAttribute(p.attr) end
end
R.Aura={
	aura_race_atk=function(e,p,field)
		e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_UPDATE_ATTACK) e:SetTarget(race_or_attr(p))
		e:SetTargetRange(LOCATION_MZONE,field and LOCATION_MZONE or 0) e:SetValue(p.n)
	end,
	aura_opp_down=function(e,p)
		e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_UPDATE_ATTACK) e:SetTargetRange(0,LOCATION_MZONE) e:SetValue(-p.n)
	end,
	attr_atk_mod_all=function(e,p)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_UPDATE_ATTACK)
		e:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
		e:SetTarget(function(se,c) return c:IsAttribute(p.attr) end)
		e:SetValue(p.sign=='minus' and -p.n or p.n)
	end,
	stat_mod_aura=function(e,p,field)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(p.stat=='DEF' and EFFECT_UPDATE_DEFENSE or EFFECT_UPDATE_ATTACK)
		e:SetTargetRange(LOCATION_MZONE,field and LOCATION_MZONE or 0)
		e:SetTarget(function(se,c) return real_sel(c,p) end)
		e:SetValue(p.sign=='minus' and -p.n or p.n)
	end,
	stat_mod_aura_both=function(e,p)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(p.stat=='DEF' and EFFECT_UPDATE_DEFENSE or EFFECT_UPDATE_ATTACK)
		e:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
		e:SetTarget(function(se,c) return real_sel(c,p) end)
		e:SetValue(p.sign=='minus' and -p.n or p.n)
	end,
	force_defense_race=function(e,p,field,c)
		local target=function(se,tc) return real_sel(tc,p) end
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_SET_POSITION)
		e:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
		e:SetTarget(target)
		e:SetValue(POS_FACEUP_DEFENSE)
		local e2=Effect.CreateEffect(c)
		e2:SetType(EFFECT_TYPE_FIELD)
		e2:SetCode(EFFECT_CANNOT_CHANGE_POSITION)
		e2:SetRange(LOCATION_SZONE)
		e2:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
		e2:SetTarget(target)
		c:RegisterEffect(e2)
	end,
	hand_limit_opp=function(e)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_HAND_LIMIT)
		e:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e:SetTargetRange(0,1)
		e:SetValue(5)
	end,
	no_attack_race_opp=function(e,p)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_CANNOT_ATTACK_ANNOUNCE)
		e:SetTargetRange(0,LOCATION_MZONE)
		e:SetTarget(function(se,tc) return tc:IsRace(p.race) end)
	end,
	avoid_battle_damage_fairy=function(e)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_AVOID_BATTLE_DAMAGE)
		e:SetProperty(EFFECT_FLAG_IGNORE_IMMUNE)
		e:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
		e:SetTarget(function(se,tc) return tc:IsRace(RACE_FAIRY) end)
		e:SetValue(1)
	end,
	self_atk_per_race=function(e,p)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_UPDATE_ATTACK)
		e:SetValue(function(se,c)
			return Duel.GetMatchingGroupCount(Card.IsRace,c:GetControler(),LOCATION_MZONE,0,c,p.race)*(p.n or 0)
		end)
	end,
	battle_indestructible_nonlight_dark=function(e)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_INDESTRUCTABLE_BATTLE)
		e:SetValue(function(se,c)
			local tc=c:GetBattleTarget()
			return tc and (tc:IsAttribute(ATTRIBUTE_DARK) or tc:IsAttribute(ATTRIBUTE_EARTH)
				or tc:IsAttribute(ATTRIBUTE_WATER) or tc:IsAttribute(ATTRIBUTE_FIRE) or tc:IsAttribute(ATTRIBUTE_WIND))
		end)
	end,
	self_avoid_battle_damage=function(e)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_AVOID_BATTLE_DAMAGE)
		e:SetValue(1)
	end,
	dragons_untargetable=function(e)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetProperty(EFFECT_FLAG_IGNORE_IMMUNE)
		e:SetCode(EFFECT_CANNOT_BE_EFFECT_TARGET)
		e:SetRange(LOCATION_MZONE)
		e:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
		e:SetTarget(aux.TargetBoolFunction(Card.IsRace,RACE_DRAGON))
		e:SetValue(aux.tgoval)
	end,
	set_defense_level4=function(e)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_SET_POSITION)
		e:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
		e:SetTarget(function(se,c) return c:IsFaceup() and c:IsLevelAbove(4) end)
		e:SetValue(POS_FACEUP_DEFENSE)
	end,
	self_indes=function(e) e:SetType(EFFECT_TYPE_SINGLE) e:SetCode(EFFECT_INDESTRUCTABLE_BATTLE) e:SetValue(1) end,
	self_pierce_always=function(e) e:SetType(EFFECT_TYPE_SINGLE) e:SetCode(EFFECT_PIERCE) end,
	equip_atk=function(e,p) e:SetType(EFFECT_TYPE_EQUIP) e:SetCode(EFFECT_UPDATE_ATTACK) e:SetValue(p.n) end,
	equip_def=function(e,p) e:SetType(EFFECT_TYPE_EQUIP) e:SetCode(EFFECT_UPDATE_DEFENSE) e:SetValue(p.n) end,
	equip_indes=function(e) e:SetType(EFFECT_TYPE_EQUIP) e:SetCode(EFFECT_INDESTRUCTABLE_BATTLE) e:SetValue(1) end,
	equip_pierce=function(e) e:SetType(EFFECT_TYPE_EQUIP) e:SetCode(EFFECT_PIERCE) end,
	equip_atk_down=function(e,p) e:SetType(EFFECT_TYPE_EQUIP) e:SetCode(EFFECT_UPDATE_ATTACK) e:SetValue(-p.n) end,
	equip_def_down=function(e,p) e:SetType(EFFECT_TYPE_EQUIP) e:SetCode(EFFECT_UPDATE_DEFENSE) e:SetValue(-p.n) end,
	toon_world_destroyed=function(e)
		e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		e:SetCode(EVENT_LEAVE_FIELD)
		e:SetCondition(function(se,tp,eg)
			return eg:IsExists(function(tc)
				return tc:IsReason(REASON_DESTROY) and tc:IsPreviousPosition(POS_FACEUP)
					and tc:GetPreviousCodeOnField()==15259703 and tc:IsPreviousLocation(LOCATION_ONFIELD)
			end,1,nil)
		end)
		e:SetOperation(function(se) Duel.Destroy(se:GetHandler(),REASON_EFFECT) end)
	end,
	no_effect_damage=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_CHANGE_DAMAGE)
		e:SetRange(LOCATION_MZONE)
		e:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e:SetTargetRange(1,0)
		e:SetValue(function(se,re,val,reason) return (reason&REASON_EFFECT)~=0 and 0 or val end)
		local e2=Effect.CreateEffect(c)
		e2:SetType(EFFECT_TYPE_FIELD)
		e2:SetCode(EFFECT_NO_EFFECT_DAMAGE)
		e2:SetRange(LOCATION_MZONE)
		e2:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e2:SetTargetRange(1,0)
		c:RegisterEffect(e2)
	end,
	protect_facedown_from_attack=function(e,p)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_CANNOT_SELECT_BATTLE_TARGET)
		e:SetRange(LOCATION_MZONE)
		e:SetTargetRange(0,LOCATION_MZONE)
		e:SetValue(function(se,tc) return tc:IsPosition(POS_FACEDOWN_DEFENSE) end)
	end,
	no_traps_opp_battle_phase=function(e,p)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e:SetCode(EFFECT_CANNOT_ACTIVATE)
		e:SetRange(LOCATION_MZONE)
		e:SetCondition(function() return Duel.IsBattlePhase() end)
		e:SetTargetRange(0,1)
		e:SetValue(function(se,re) return re:GetHandler():IsTrap() and re:IsHasType(EFFECT_TYPE_ACTIVATE) end)
	end,
	self_direct_always=function(e)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_DIRECT_ATTACK)
	end,
	self_cannot_be_battle_target=function(e)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_CANNOT_BE_BATTLE_TARGET)
		e:SetValue(1)
	end,
	cannot_attack_special_summon_turn=function(e)
		e:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_CONTINUOUS)
		e:SetCode(EVENT_SPSUMMON_SUCCESS)
		e:SetOperation(function(se)
			local c=se:GetHandler()
			local e1=Effect.CreateEffect(c)
			e1:SetType(EFFECT_TYPE_SINGLE)
			e1:SetCode(EFFECT_CANNOT_ATTACK)
			e1:SetReset(RESETS_STANDARD_PHASE_END)
			c:RegisterEffect(e1)
		end)
	end,
}
R.Aura.aura_attr_atk=R.Aura.aura_race_atk

--Always-on rules of the unique mechanics. Each registers its own effects: reg(c,rand,p,range,cond,act), where range
--is this card's zone, cond the card's state conditions and act its activation (Prohibition declares on it).
local function field(c,code,range,cond,tr1,tr2,player)
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_FIELD)
	e:SetCode(code)
	e:SetRange(range)
	if player then e:SetProperty(EFFECT_FLAG_PLAYER_TARGET) end
	e:SetTargetRange(tr1,tr2)
	if cond then e:SetCondition(cond) end
	c:RegisterEffect(e)
	return e
end
local function forced(c,code,range,con,op,desc)
	local e=Effect.CreateEffect(c)
	if desc then e:SetDescription(desc) end
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
	e:SetCode(code)
	e:SetRange(range)
	e:SetCountLimit(1)
	e:SetCondition(con)
	e:SetOperation(op)
	c:RegisterEffect(e)
	return e
end
local function all(...) local fs={...} return function(e,tp,...) for _,f in ipairs(fs) do if f and not f(e,tp,...) then return false end end return true end end
local myturn=function(e,tp) return Duel.IsTurnPlayer(tp) end
local oppturn=function(e,tp) return Duel.IsTurnPlayer(1-tp) end
R.Rule={
	--Victory Dragon.
	match_kill={reg=function(c)
		local e=Effect.CreateEffect(c)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetProperty(EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_UNCOPYABLE)
		e:SetCode(EFFECT_MATCH_KILL)
		c:RegisterEffect(e)
	end},
	--Thousand-Eyes Restrict's lock.
	freeze_others={reg=function(c,rand,p,range,cond)
		for _,code in ipairs({EFFECT_CANNOT_ATTACK,EFFECT_CANNOT_CHANGE_POSITION}) do
			local e=field(c,code,range,cond,LOCATION_MZONE,LOCATION_MZONE)
			e:SetTarget(function(se,tc) return tc~=se:GetHandler() end)
			if code==EFFECT_CANNOT_CHANGE_POSITION then e:SetProperty(EFFECT_FLAG_SET_AVAILABLE) end
		end
	end},
	--Respect Play.
	respect_play={reg=function(c,rand,p,range,cond)
		field(c,EFFECT_PUBLIC,range,all(cond,function(e) return Duel.GetTurnPlayer()==e:GetHandlerPlayer() end),LOCATION_HAND,0)
		field(c,EFFECT_PUBLIC,range,all(cond,function(e) return Duel.GetTurnPlayer()~=e:GetHandlerPlayer() end),0,LOCATION_HAND)
	end},
	--The Eye of Truth.
	eye_truth={reg=function(c,rand,p,range,cond)
		field(c,EFFECT_PUBLIC,range,cond,0,LOCATION_HAND)
		local e=forced(c,EVENT_PHASE|PHASE_STANDBY,range,
			function(se,tp) return Duel.IsTurnPlayer(1-tp) and Duel.IsExistingMatchingCard(Card.IsSpell,tp,0,LOCATION_HAND,1,nil) end,
			function(se,tp) if se:GetHandler():IsRelateToEffect(se) then Duel.Recover(1-tp,p.n,REASON_EFFECT) end end)
		e:SetCategory(CATEGORY_RECOVER)
	end},
	--Convulsion of Nature.
	convulsion={reg=function(c,rand,p,range,cond)
		Duel.EnableGlobalFlag(GLOBALFLAG_DECK_REVERSE_CHECK)
		field(c,EFFECT_REVERSE_DECK,range,cond,1,1,true)
	end},
	--Prohibition: the card name is declared when this card is activated.
	prohibition={reg=function(c,rand,p,range,cond,act)
		if not act then return end
		act:SetTarget(function(e,tp,eg,ep,ev,re,r,rp,chk)
			if chk==0 then return true end
			e:SetLabel(0)
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_CODE)
			Duel.SetTargetParam(Duel.AnnounceCard(tp))
			Duel.SetOperationInfo(0,CATEGORY_ANNOUNCE,nil,0,tp,ANNOUNCE_CARD)
		end)
		act:SetOperation(function(e)
			local ac=Duel.GetChainInfo(0,CHAININFO_TARGET_PARAM)
			e:SetLabel(ac)
			e:GetHandler():SetHint(CHINT_CARD,ac)
			Duel.AdjustInstantly(e:GetHandler())
		end)
		local e2=Effect.CreateEffect(c)
		e2:SetType(EFFECT_TYPE_FIELD)
		e2:SetProperty(EFFECT_FLAG_SET_AVAILABLE)
		e2:SetCode(EFFECT_FORBIDDEN)
		e2:SetRange(range)
		e2:SetTargetRange(0x7f,0x7f)
		e2:SetTarget(function(se,tc) return se:GetLabelObject():GetLabel()~=0 and tc:IsOriginalCodeRule(se:GetLabelObject():GetLabel()) and (not tc:IsOnField() or tc:GetRealFieldID()>se:GetFieldID()) end)
		e2:SetLabelObject(act)
		c:RegisterEffect(e2)
	end},
	--Gravekeeper's Servant.
	attack_tax={reg=function(c,rand,p,range,cond)
		local e=Effect.CreateEffect(c)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_ATTACK_COST)
		e:SetRange(range)
		e:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e:SetTargetRange(0,1)
		if cond then e:SetCondition(cond) end
		e:SetCost(function(se,tc,tp) return Duel.IsPlayerCanDiscardDeckAsCost(tp,p.n) end)
		e:SetOperation(function(se,tp)
			if Duel.IsAttackCostPaid()~=2 and se:GetHandler():IsLocation(range) then
				Duel.DiscardDeck(tp,p.n,REASON_COST)
				Duel.AttackCostPaid()
			end
		end)
		c:RegisterEffect(e)
	end},
	--Dark Snake Syndrome.
	dark_snake={reg=function(c,rand,p,range,cond)
		local e=forced(c,EVENT_PHASE|PHASE_STANDBY,range,all(cond,myturn),function(se,tp)
			local sc=se:GetHandler()
			if not sc:IsRelateToEffect(se) then return end
			local dam=sc:GetFlagEffectLabel(FLAG_SNAKE)
			if dam==nil then sc:RegisterFlagEffect(FLAG_SNAKE,RESET_EVENT|RESETS_STANDARD,0,0,p.n) dam=p.n
			else dam=dam*2 sc:SetFlagEffectLabel(FLAG_SNAKE,dam) end
			Duel.Damage(tp,dam,REASON_EFFECT,true)
			Duel.Damage(1-tp,dam,REASON_EFFECT,true)
			Duel.RDComplete()
		end)
		e:SetCategory(CATEGORY_DAMAGE)
	end},
	--Mirage of Nightmare.
	mirage={reg=function(c,rand,p,range,cond)
		local drawn={0}
		forced(c,EVENT_PHASE|PHASE_STANDBY,range,
			all(cond,function(se,tp) return Duel.IsTurnPlayer(1-tp) and Duel.GetFieldGroupCount(tp,LOCATION_HAND,0)<p.n end),
			function(se,tp)
				if not se:GetHandler():IsRelateToEffect(se) then return end
				local ht=Duel.GetFieldGroupCount(tp,LOCATION_HAND,0)
				drawn[1]=ht<p.n and Duel.Draw(tp,p.n-ht,REASON_EFFECT) or 0
			end):SetCategory(CATEGORY_DRAW)
		forced(c,EVENT_PHASE|PHASE_STANDBY,range,function(se,tp) return Duel.IsTurnPlayer(tp) and drawn[1]>0 end,
			function(se,tp)
				local ct=drawn[1] drawn[1]=0
				if not se:GetHandler():IsRelateToEffect(se) then return end
				local g=Duel.GetFieldGroup(tp,LOCATION_HAND,0)
				if #g>0 then Duel.SendtoGrave(g:RandomSelect(tp,math.min(ct,#g)),REASON_EFFECT|REASON_DISCARD) end
			end):SetCategory(CATEGORY_HANDES)
	end},
	--Exodia: this card and its pieces in your hand.
	exodia_head={reg=function(c,rand,p)
		local function check(g)
			if not g:IsContains(c) then return false end
			for _,code in ipairs(p.pieces) do if not g:IsExists(Card.IsCode,1,nil,code) then return false end end
			return true
		end
		local e=Effect.CreateEffect(c)
		e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		e:SetProperty(EFFECT_FLAG_UNCOPYABLE+EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_DELAY)
		e:SetCode(EVENT_TO_HAND)
		e:SetRange(LOCATION_HAND)
		e:SetOperation(function(se,tp)
			local g=Duel.GetFieldGroup(tp,LOCATION_HAND,0)
			if check(g) then Duel.ConfirmCards(1-tp,g) win(tp) end
		end)
		c:RegisterEffect(e)
		local e2=e:Clone()
		e2:SetCode(EVENT_ADJUST)
		e2:SetProperty(EFFECT_FLAG_UNCOPYABLE+EFFECT_FLAG_CANNOT_DISABLE)
		c:RegisterEffect(e2)
	end},
}
--Destiny Board and the Sarcophagus cards: place the pieces one by one, in order, from the hand or Deck.
local function assemble(c,rand,p,range,turn,payoff)
	local function on_field(tp,code) return Duel.IsExistingMatchingCard(aux.FaceupFilter(Card.IsCode,code),tp,LOCATION_SZONE,0,1,nil) end
	local function pieces(tp) return Duel.GetMatchingGroup(function(tc) return tc:IsFaceup() and tc:IsCode(table.unpack(p.pieces)) end,tp,LOCATION_ONFIELD,0,nil) end
	local function done(tp) for _,code in ipairs(p.pieces) do if not on_field(tp,code) then return false end end return true end
	forced(c,EVENT_PHASE+(turn=='opp' and PHASE_END or PHASE_STANDBY),range,
		function(se,tp) return (turn=='opp' and Duel.IsTurnPlayer(1-tp) or turn=='self' and Duel.IsTurnPlayer(tp)) and not done(tp) end,
		function(se,tp)
			local sc=se:GetHandler()
			if not sc:IsRelateToEffect(se) or Duel.GetLocationCount(tp,LOCATION_SZONE)<=0 then return end
			local nextcode
			for _,code in ipairs(p.pieces) do if not on_field(tp,code) then nextcode=code break end end
			if not nextcode then return end
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TOFIELD)
			local tc=Duel.SelectMatchingCard(tp,function(x) return x:IsCode(nextcode) and not x:IsForbidden() end,tp,LOCATION_DECK|LOCATION_HAND,0,1,1,nil):GetFirst()
			if tc then Duel.MoveToField(tc,tp,tp,LOCATION_SZONE,POS_FACEUP,true) end
			if payoff and done(tp) then
				Duel.BreakEffect()
				local g=pieces(tp) g:AddCard(sc)
				Duel.SendtoGrave(g,REASON_EFFECT)
				if zones(tp)<=0 then return end
				Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
				local mc=Duel.SelectMatchingCard(tp,function(x) return x:IsCode(p.payoff) and x:IsCanBeSpecialSummoned(se,0,tp,true,false) end,tp,LOCATION_DECK|LOCATION_HAND,0,1,1,nil):GetFirst()
				if mc and Duel.SpecialSummon(mc,0,tp,tp,true,false,POS_FACEUP)>0 then mc:CompleteProcedure() end
			end
		end)
	--When the board or one of its pieces leaves the field, the rest go to the GY.
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
	e:SetRange(range)
	e:SetCode(EVENT_LEAVE_FIELD)
	e:SetCondition(function(se,tp,eg) return eg:IsExists(function(tc) return tc:IsPreviousControler(tp) and tc:IsCode(table.unpack(p.pieces)) end,1,nil) end)
	e:SetOperation(function(se,tp) local g=pieces(tp) g:AddCard(se:GetHandler()) Duel.SendtoGrave(g,REASON_EFFECT) end)
	c:RegisterEffect(e)
	local e2=Effect.CreateEffect(c)
	e2:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_CONTINUOUS)
	e2:SetCode(EVENT_LEAVE_FIELD)
	e2:SetOperation(function(se) local tp=se:GetHandler():GetPreviousControler() Duel.SendtoGrave(pieces(tp),REASON_EFFECT) end)
	c:RegisterEffect(e2)
	if not payoff then
		local e3=Effect.CreateEffect(c)
		e3:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		e3:SetCode(EVENT_ADJUST)
		e3:SetRange(range)
		e3:SetProperty(EFFECT_FLAG_UNCOPYABLE+EFFECT_FLAG_CANNOT_DISABLE)
		e3:SetOperation(function(se,tp) if done(tp) then win(tp) end end)
		c:RegisterEffect(e3)
	end
end
R.Rule.destiny_board={reg=function(c,rand,p,range) assemble(c,rand,p,range,'opp',false) end}
R.Rule.sarcophagus={reg=function(c,rand,p,range) assemble(c,rand,p,range,'self',true) end}
R.Rule.spirit_return={reg=function(c)
	Spirit.AddProcedure(c,EVENT_SUMMON_SUCCESS,EVENT_FLIP)
end}
R.Rule.no_traps_on_normal_summon={reg=function(c)
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_CONTINUOUS)
	e:SetCode(EVENT_SUMMON_SUCCESS)
	e:SetOperation(function()
		Duel.SetChainLimitTillChainEnd(function(re)
			return not re:GetHandler():IsTrap() or not re:IsHasType(EFFECT_TYPE_ACTIVATE)
		end)
	end)
	c:RegisterEffect(e)
end}

---------------------------------------------------------------- building
local MONSTER={m_main=true,m_fusion=true,m_ritual=true}
local ONE_SHOT={s_normal=true,s_quick=true,t_normal=true,t_counter=true}
local function home(slot)
	if MONSTER[slot] then return LOCATION_MZONE end
	if slot=='s_field' then return LOCATION_FZONE end
	return LOCATION_SZONE
end
local function states_ok(rand,e,tp)
	for _,p in ipairs(rand.conds) do
		local f=R.State[p.k]
		if f and not f(e,tp,p) then return false end
	end
	return true
end
local function event_of(rand)
	for _,p in ipairs(rand.conds) do if R.Event[p.k] then return p.k end end
end
local function limit(rand,k) for _,p in ipairs(rand.limits) do if p.k==k then return p end end end
local function other(rand,k) for _,p in ipairs(rand.others) do if p.k==k then return p end end end
local function wrapper(rand) for _,p in ipairs(rand.others) do if p.k~='upkeep' and p.k~='curse_damage' then return p end end end

--Spells and Traps that stay on the field need a plain activation first.
local function activation(c)
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_ACTIVATE)
	e:SetCode(EVENT_FREE_CHAIN)
	c:RegisterEffect(e)
	return e
end

local function aura(c,rand,act)
	local field=rand.slot=='s_field'
	local cond=#rand.conds>0 and function(e) return states_ok(rand,e,e:GetHandlerPlayer()) end or nil
	for _,p in ipairs(rand.acts) do
		if R.Rule[p.k] then R.Rule[p.k].reg(c,rand,p,home(rand.slot),cond,act) else
		local e=Effect.CreateEffect(c)
		R.Aura[p.k](e,p,field,c)
		if e:IsHasType(EFFECT_TYPE_FIELD) then e:SetRange(home(rand.slot)) end
		if e:IsHasType(EFFECT_TYPE_SINGLE) then e:SetProperty(EFFECT_FLAG_SINGLE_RANGE) e:SetRange(LOCATION_MZONE) end
		if cond then e:SetCondition(cond) end
		c:RegisterEffect(e)
		end
	end
end

local function cost(rand)
	if #rand.costs==0 and not (limit(rand,'no_bp') or limit(rand,'no_ss') or limit(rand,'self_no_attack')) then return nil end
	return function(e,tp,eg,ep,ev,re,r,rp,chk)
		local c=e:GetHandler()
		if chk==0 then
			for _,p in ipairs(rand.costs) do if not R.Cost[p.k].check(e,tp,p) then return false end end
			if limit(rand,'no_bp') and Duel.GetActivityCount(tp,ACTIVITY_BATTLE_PHASE)>0 then return false end
			if limit(rand,'no_ss') and Duel.GetActivityCount(tp,ACTIVITY_SPSUMMON)>0 then return false end
			if limit(rand,'self_no_attack') and c:GetAttackAnnouncedCount()>0 then return false end
			return true
		end
		for _,p in ipairs(rand.costs) do R.Cost[p.k].pay(e,tp,p) end
		--Oaths: last for the rest of the turn even if the effect is negated.
		local function oath(code,range)
			local e1=Effect.CreateEffect(c)
			e1:SetType(EFFECT_TYPE_FIELD)
			e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET+EFFECT_FLAG_OATH)
			e1:SetCode(code)
			e1:SetTargetRange(1,0)
			e1:SetReset(RESET_PHASE+PHASE_END)
			Duel.RegisterEffect(e1,tp)
		end
		if limit(rand,'no_bp') then oath(EFFECT_CANNOT_BP) end
		if limit(rand,'no_ss') then oath(EFFECT_CANNOT_SPECIAL_SUMMON) end
		if limit(rand,'self_no_attack') then
			local e1=Effect.CreateEffect(c)
			e1:SetType(EFFECT_TYPE_SINGLE)
			e1:SetProperty(EFFECT_FLAG_OATH)
			e1:SetCode(EFFECT_CANNOT_ATTACK)
			e1:SetReset(RESETS_STANDARD_PHASE_END)
			c:RegisterEffect(e1)
		end
	end
end

local function target(rand)
	local tact
	for _,p in ipairs(rand.acts) do local a=R.Act[p.k] if a.target and not a.notarget then tact=p end end
	return function(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
		if chkc then
			if not tact then return false end
			local a=R.Act[tact.k]
			local l1,l2=a.loc1,a.loc2
			if a.locs then l1,l2=a.locs(tact) end
			return ((l1~=0 and chkc:IsControler(tp) and chkc:IsLocation(l1)) or (l2~=0 and chkc:IsControler(1-tp) and chkc:IsLocation(l2))) and a.filter(chkc,e,tp,tact)
		end
		if chk==0 then
			for _,p in ipairs(rand.acts) do
				local a=R.Act[p.k]
				if a.check and not a.check(e,tp,eg,ep,ev,re,r,rp,p) then return false end
			end
			return true
		end
		for _,p in ipairs(rand.acts) do
			local a=R.Act[p.k]
			if a.prep then a.prep(e,tp,eg,ep,ev,re,r,rp,p) end
		end
	end,tact~=nil
end

--What a lost coin toss or a wrong call does (Gamble skips your next turn; Fiend Comedian mills you).
local function tails(e,tp,w)
	if w.tails=='damage' then Duel.Damage(tp,w.n,REASON_EFFECT)
	elseif w.tails=='skip_turn' then R.SkipTurn(e:GetHandler(),tp)
	elseif w.tails=='mill_opp_gy' then
		local ct=Duel.GetFieldGroupCount(tp,0,LOCATION_GRAVE)
		if ct>0 then Duel.DiscardDeck(tp,ct,REASON_EFFECT) end
	end
end

local function operation(rand)
	local w=wrapper(rand)
	return function(e,tp,eg,ep,ev,re,r,rp)
		local function run(list,m)
			for i,p in ipairs(list) do
				if i>1 then Duel.BreakEffect() end
				R.Act[p.k].op(e,tp,eg,ep,ev,re,r,rp,p,m or 1,rand)
			end
		end
		if not w then run(rand.acts)
		elseif w.k=='coin' then
			if Duel.TossCoin(tp,1)==COIN_HEADS then run(rand.acts) else tails(e,tp,w) end
		elseif w.k=='call' then
			if Duel.CallCoin(tp) then run(rand.acts) else tails(e,tp,w) end
		elseif w.k=='dice_mult' then run(rand.acts,Duel.TossDice(tp,1))
		elseif w.k=='dice_branch' then
			if Duel.TossDice(tp,1)<=3 then run({rand.acts[1]}) else run({rand.acts[2]}) end
		end
	end
end

local function activated(c,id,rand)
	local slot,ev=rand.slot,event_of(rand)
	local evt=ev and R.Event[ev] or nil
	if evt and evt.build then
		local params
		for _,part in ipairs(rand.conds) do if part.k==ev then params=part break end end
		evt=evt.build(params or {})
	end
	local range=home(slot)
	for _,p in ipairs(rand.acts) do if R.Act[p.k].hand then range=LOCATION_HAND|LOCATION_DECK end end
	local e=Effect.CreateEffect(c)
	e:SetDescription(aux.Stringid(id,0))
	local cat=0
	for _,p in ipairs(rand.acts) do cat=cat|(R.Act[p.k].catf and R.Act[p.k].catf(p) or R.Act[p.k].cat) end
	local w=wrapper(rand)
	if w and (w.k=='coin' or w.k=='call') then cat=cat|CATEGORY_COIN end
	if w and (w.k=='dice_mult' or w.k=='dice_branch') then cat=cat|CATEGORY_DICE end
	e:SetCategory(cat)
	local tg,has_target=target(rand)
	local prop=has_target and EFFECT_FLAG_CARD_TARGET or 0
	for _,p in ipairs(rand.acts) do if R.Act[p.k].player_target then prop=prop|EFFECT_FLAG_PLAYER_TARGET end end
	if ONE_SHOT[slot] then
		e:SetType(EFFECT_TYPE_ACTIVATE)
		e:SetCode(evt and evt.code or EVENT_FREE_CHAIN)
	elseif not evt then
		--No timing: an ignition effect (Continuous Traps use a Quick Effect, as Traps cannot have ignition effects).
		if slot=='t_cont' then e:SetType(EFFECT_TYPE_QUICK_O) e:SetCode(EVENT_FREE_CHAIN) else e:SetType(EFFECT_TYPE_IGNITION) end
		e:SetRange(range)
	elseif evt.single then
		e:SetType(EFFECT_TYPE_SINGLE+(evt.flip and EFFECT_TYPE_FLIP or 0)+(evt.forced and EFFECT_TYPE_TRIGGER_F or EFFECT_TYPE_TRIGGER_O))
		e:SetCode(evt.code)
	elseif evt.quick then
		e:SetType(EFFECT_TYPE_QUICK_O)
		e:SetCode(evt.code)
		e:SetRange(range)
	else
		e:SetType(EFFECT_TYPE_FIELD+((evt and evt.forced) and EFFECT_TYPE_TRIGGER_F or EFFECT_TYPE_TRIGGER_O))
		e:SetCode(evt.code)
		e:SetRange(range)
	end
	if evt and evt.delay then prop=prop|EFFECT_FLAG_DELAY end
	if evt and evt.damage_step then prop=prop|EFFECT_FLAG_DAMAGE_STEP end
	if e:IsHasType(EFFECT_TYPE_QUICK_O) or slot=='s_quick' or (ONE_SHOT[slot] and slot:sub(1,1)=='t') then
		e:SetHintTiming(0,TIMINGS_CHECK_MONSTER+TIMING_END_PHASE)
	end
	e:SetProperty(prop)
	--Once-per-turn limits. Cards used once count activations of the card instead.
	if limit(rand,'opt') then e:SetCountLimit(1)
	elseif limit(rand,'hopt') then e:SetCountLimit(1,id,ONE_SHOT[slot] and EFFECT_COUNT_CODE_OATH or 0)
	elseif limit(rand,'once_duel') then e:SetCountLimit(1,id,(ONE_SHOT[slot] and EFFECT_COUNT_CODE_OATH or 0)|EFFECT_COUNT_CODE_DUEL)
	elseif evt and evt.once then e:SetCountLimit(1) end
	e:SetCondition(function(e,tp,eg,ep,ev,re,r,rp)
		if evt and evt.con and not evt.con(e,tp,eg,ep,ev,re,r,rp) then return false end
		return states_ok(rand,e,tp)
	end)
	local co=cost(rand)
	if co then e:SetCost(co) end
	e:SetTarget(tg)
	e:SetOperation(operation(rand))
	c:RegisterEffect(e)
	--A second timing on the same block: Traps also answer Special Summons, Counter Traps both kinds of Summon.
	if evt and evt.codes then
		for i=2,#evt.codes do local e2=e:Clone() e2:SetCode(evt.codes[i]) c:RegisterEffect(e2) end
	else
		local code2=evt and (evt.code2 or (ONE_SHOT[slot] and evt.trap_code2))
		if code2 then local e2=e:Clone() e2:SetCode(code2) c:RegisterEffect(e2) end
	end
end

local function upkeep(c,id,rand,p)
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
	e:SetCode(EVENT_PHASE+PHASE_STANDBY)
	e:SetRange(home(rand.slot))
	e:SetCountLimit(1)
	e:SetCondition(function(e,tp) return Duel.IsTurnPlayer(tp) end)
	e:SetOperation(function(e,tp)
		local c=e:GetHandler()
		if Duel.CheckLPCost(tp,p.n) and Duel.SelectYesNo(tp,aux.Stringid(id,1)) then Duel.PayLPCost(tp,p.n)
		else Duel.Destroy(c,REASON_COST) end
	end)
	c:RegisterEffect(e)
end

local function fusion(c,rand)
	local mats={}
	for _,m in ipairs(rand.mats) do
		if m.k=='code' then mats[#mats+1]=m.v
		elseif m.k=='race' then mats[#mats+1]=aux.FilterBoolFunctionEx(Card.IsRace,m.v)
		elseif m.k=='attr' then mats[#mats+1]=aux.FilterBoolFunctionEx(Card.IsAttribute,m.v)
		elseif m.k=='normal' then mats[#mats+1]=aux.FilterBoolFunctionEx(Card.IsType,TYPE_NORMAL)
		elseif m.k=='low' then mats[#mats+1]=function(tc) return tc:IsLevelBelow(4) end
		elseif m.k=='high' then mats[#mats+1]=function(tc) return tc:IsLevelAbove(5) end end
	end
	Fusion.AddProcMix(c,true,true,table.unpack(mats))
end

--A Ritual Spell always Ritual Summons its monster. Its rolled conditions, costs and restrictions apply to that
--activation; its rolled effects (and coin/dice) happen right after the Ritual Summon, each only if it still can.
function R.RitualSpell(c,s,id,rand)
	s.listed_names={rand.ritual_for}
	if c.fit_monster==nil then c:GetMetatable().fit_monster={rand.ritual_for} end
	local after=nil
	if #rand.acts>0 then
		local doable={}
		local run=operation(rand)
		after=function(mat,e,tp,eg,ep,ev,re,r,rp,tc)
			for _,p in ipairs(rand.acts) do
				local a=R.Act[p.k]
				if a.check and not a.check(e,tp,eg,ep,ev,re,r,rp,p) then return end
			end
			Duel.BreakEffect()
			run(e,tp,eg,ep,ev,re,r,rp)
		end
	end
	local e=Ritual.CreateProc(c,RITPROC_GREATER,aux.FilterBoolFunction(Card.IsCode,rand.ritual_for),rand.ritual_level,nil,nil,nil,nil,after)
	local cat=CATEGORY_SPECIAL_SUMMON
	for _,p in ipairs(rand.acts) do cat=cat|R.Act[p.k].cat end
	local w=wrapper(rand)
	if w and (w.k=='coin' or w.k=='call') then cat=cat|CATEGORY_COIN end
	if w and (w.k=='dice_mult' or w.k=='dice_branch') then cat=cat|CATEGORY_DICE end
	e:SetCategory(cat)
	if #rand.conds>0 then e:SetCondition(function(e,tp) return states_ok(rand,e,tp) end) end
	local co=cost(rand)
	if co then e:SetCost(co) end
	if limit(rand,'hopt') then e:SetCountLimit(1,id,EFFECT_COUNT_CODE_OATH)
	elseif limit(rand,'once_duel') then e:SetCountLimit(1,id,EFFECT_COUNT_CODE_OATH|EFFECT_COUNT_CODE_DUEL) end
	c:RegisterEffect(e)
end

--A Standby Phase curse that follows the card to whoever controls it (Mushroom Man #2).
local function curse(c,rand,p)
	local e=Effect.CreateEffect(c)
	e:SetCategory(CATEGORY_DAMAGE)
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
	e:SetCode(EVENT_PHASE|PHASE_STANDBY)
	e:SetRange(home(rand.slot))
	e:SetCountLimit(1)
	e:SetCondition(function(se,tp) return Duel.IsTurnPlayer(tp) end)
	e:SetOperation(function(se,tp) Duel.Damage(tp,p.n,REASON_EFFECT) end)
	c:RegisterEffect(e)
end

function R.Build(c,s,id)
	local rand=s.rand
	if rand.ritual_for then return R.RitualSpell(c,s,id,rand) end
	--A Destiny Board / Sarcophagus piece: never activated or Set; only its board places it.
	if rand.acts[1] and rand.acts[1].k=='set_piece' then
		local e=Effect.CreateEffect(c)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_CANNOT_SSET)
		c:RegisterEffect(e)
		return
	end
	local sb=limit(rand,'summon_by')
	if sb then
		--Spirit of the Pharaoh: only its board's effect can Summon it.
		c:EnableReviveLimit()
		local e=Effect.CreateEffect(c)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetProperty(EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_UNCOPYABLE)
		e:SetCode(EFFECT_SPSUMMON_CONDITION)
		e:SetValue(function(se,re) return re and re:GetHandler():IsCode(sb.board) end)
		c:RegisterEffect(e)
		for _,code in ipairs({EFFECT_CANNOT_SUMMON,EFFECT_CANNOT_MSET}) do
			local e2=Effect.CreateEffect(c)
			e2:SetType(EFFECT_TYPE_SINGLE)
			e2:SetProperty(EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_UNCOPYABLE)
			e2:SetCode(code)
			c:RegisterEffect(e2)
		end
	end
	for _,p in ipairs(rand.acts) do
		if R.Act[p.k] and R.Act[p.k].deck_reverse then Duel.EnableGlobalFlag(GLOBALFLAG_DECK_REVERSE_CHECK) end
	end
	for _,p in ipairs(rand.conds) do
		if p.k=='kills' then
			--Great Dezard: count the monsters this card destroys by battle.
			local e=Effect.CreateEffect(c)
			e:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_CONTINUOUS)
			e:SetCode(EVENT_BATTLE_DESTROYING)
			e:SetOperation(function(se) if se:GetHandler():IsRelateToBattle() then se:GetHandler():RegisterFlagEffect(FLAG_KILLS,RESET_EVENT|RESETS_STANDARD,0,0) end end)
			c:RegisterEffect(e)
		end
	end
	if rand.frame=='fusion' then c:EnableReviveLimit() fusion(c,rand) end
	if rand.frame=='ritual' then c:EnableReviveLimit() end
	if limit(rand,'cannot_normal') then c:EnableUnsummonable() end
	if limit(rand,'cannot_ss') then
		local e=Effect.CreateEffect(c)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetProperty(EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_UNCOPYABLE)
		e:SetCode(EFFECT_SPSUMMON_CONDITION)
		e:SetValue(aux.FALSE)
		c:RegisterEffect(e)
	end
	local slot,act=rand.slot,nil
	if slot=='s_equip' then
		if not rand.equip_ready then
			local eo=limit(rand,'equip_only')
			if eo then aux.AddEquipProcedure(c,eo.who=='opp' and 1 or nil,function(tc) return real_sel(tc,eo) end)
			else aux.AddEquipProcedure(c) end
		end
	elseif slot=='s_cont' or slot=='s_field' or slot=='t_cont' then act=activation(c) end
	if #rand.acts>0 then
		local k=rand.acts[1].k
		if R.Aura[k] or R.Rule[k] then aura(c,rand,act) else activated(c,id,rand) end
	end
	local up=other(rand,'upkeep')
	if up then upkeep(c,id,rand,up) end
	local cu=other(rand,'curse_damage')
	if cu then curse(c,rand,cu) end
end

function R.BuildReal(c,s,id)
	local source=s.rand
	local effects=source.effects or {}
	if #effects==0 then
		local rand={slot=source.slot,frame=source.frame,conds={},costs={},acts={},limits={},others={}}
		rand.mats=source.mats
		rand.ritual_for=source.ritual_for
		rand.ritual_level=source.ritual_level
		R.Build(c,{rand=rand},id)
		return
	end
	--An Equip Spell has one equip procedure: it takes the "Equip only to" restriction from whichever effect holds it.
	local equip_limit
	if source.slot=='s_equip' then
		for _,effect in ipairs(effects) do
			for _,l in ipairs(effect.limits or {}) do if l.k=='equip_only' then equip_limit=l end end
		end
	end
	for index,effect in ipairs(effects) do
		local rand={
			slot=source.slot,
			frame=index==1 and source.frame or '',
			conds=effect.conds or {},
			costs=effect.costs or {},
			acts=effect.acts or {},
			limits=effect.limits or {},
			others=effect.others or {},
		}
		if equip_limit then
			if index==1 then
				local limits={equip_limit}
				for _,l in ipairs(rand.limits) do if l.k~='equip_only' then limits[#limits+1]=l end end
				rand.limits=limits
			else rand.equip_ready=true end
		end
		if index==1 then
			rand.mats=source.mats
			rand.ritual_for=source.ritual_for
			rand.ritual_level=source.ritual_level
		end
		R.Build(c,{rand=rand},id)
	end
end
