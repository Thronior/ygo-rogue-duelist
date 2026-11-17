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
	main_phase=function(e,tp) return Duel.IsMainPhase() end,
	necrovalley_environment=function(e,tp) return Duel.IsEnvironment(CARD_NECROVALLEY,tp) end,
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
	equip_card_equipped=function(e,tp)
		return Duel.IsExistingMatchingCard(function(c) return c:IsType(TYPE_EQUIP) and c:GetEquipTarget()~=nil end,
			tp,LOCATION_SZONE,LOCATION_SZONE,1,nil)
	end,
	main1=function(e,tp,p) return Duel.IsTurnPlayer(tp) and Duel.IsMainPhase() and Duel.GetCurrentPhase()==PHASE_MAIN1 end,
	main1_first=function(e,tp)
		return Duel.IsTurnPlayer(tp) and Duel.IsPhase(PHASE_MAIN1) and not Duel.CheckPhaseActivity()
	end,
	battle_phase=function() return Duel.IsBattlePhase() end,
	no_monsters=function(e,tp) return Duel.GetFieldGroupCount(tp,LOCATION_MZONE,0)==0 end,
	not_battle_phase=function() return not Duel.IsBattlePhase() end,
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
	field_named_any=function(e,tp,p)
		return Duel.IsExistingMatchingCard(function(c) return c:IsFaceup() and c:IsCode(table.unpack(p.codes)) end,
			tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,nil)
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
	shabti_window={code=EVENT_FREE_CHAIN,quick=true,con=function(e)
		local phase=Duel.GetCurrentPhase()
		return phase~=PHASE_MAIN2 and phase~=PHASE_END
	end},
	summoned={single=true,code=EVENT_SUMMON_SUCCESS,delay=true},
	special_summoned={single=true,code=EVENT_SPSUMMON_SUCCESS,delay=true,
		con=function(e) local c=e:GetHandler() return c:IsFusionSummoned() or c:IsRitualSummoned() end},
	flip={single=true,flip=true,code=EVENT_FLIP,delay=true},
	flip_summoned={single=true,code=EVENT_FLIP_SUMMON_SUCCESS,delay=true,forced=true},
	control_changed={single=true,code=EVENT_CONTROL_CHANGED,once=true,no_turn_reset=true},
	equipped_to_this={single=true,code=EVENT_EQUIP,forced=true,
		con=function(e,tp,eg) return eg and eg:IsExists(function(ec,c) return ec:GetEquipTarget()==c end,1,nil,e:GetHandler()) end},
	damage_to_controller={code=EVENT_DAMAGE,damage_step=true,
		con=function(e,tp,eg,ep) return ep==tp end},
	effect_damage_to_you={code=EVENT_CHAINING,damage_step=true,
		con=function(e,tp,eg,ep,ev,re)
			if not re or (re:IsSpellTrapEffect() and not re:IsHasType(EFFECT_TYPE_ACTIVATE)) then return false end
			local ex,_,_,player=Duel.GetOperationInfo(ev,CATEGORY_DAMAGE)
			return ex and (player==tp or player==PLAYER_ALL)
		end},
	your_direct_battle_damage={code=EVENT_BATTLE_DAMAGE,con=function(e,tp,eg,ep)
		return ep~=tp and Duel.GetAttackTarget()==nil
	end},
	opp_monster_reborn={code=EVENT_CHAINING,quick=true,con=function(e,tp,eg,ep,ev,re,r,rp)
		return rp==1-tp and re and re:IsHasType(EFFECT_TYPE_ACTIVATE)
			and re:GetHandler():IsCode(CARD_MONSTER_REBORN) and Duel.IsChainDisablable(ev)
	end},
	your_monster_to_gy={code=EVENT_TO_GRAVE,damage_step=true,con=function(e,tp,eg)
		return eg and eg:IsExists(function(c,p)
			return c:IsMonster() and c:IsControler(p) and c:IsPreviousLocation(LOCATION_MZONE)
		end,1,nil,tp)
	end},
	changed_from_attack_to_defense={single=true,code=EVENT_CHANGE_POS,forced=true,
		con=function(e)
			local c=e:GetHandler()
			return (c:GetPreviousPosition()&POS_ATTACK)~=0 and c:IsFaceup() and c:IsDefensePos()
		end},
	changed_from_defense_to_attack={single=true,code=EVENT_CHANGE_POS,forced=true,
		con=function(e)
			local c=e:GetHandler()
			return (c:GetPreviousPosition()&POS_DEFENSE)~=0 and c:IsFaceup() and c:IsAttackPos()
		end},
	pot_of_greed_activation={code=EVENT_CHAINING,forced=true,
		con=function(e,tp,eg,ep,ev,re) return e:GetHandler():IsAttackPos() and re
			and re:IsHasType(EFFECT_TYPE_ACTIVATE) and re:GetHandler():IsCode(55144522) end},
	normal_summoned_mandatory={single=true,code=EVENT_SUMMON_SUCCESS,forced=true},
	any_special_summoned={single=true,code=EVENT_SPSUMMON_SUCCESS,delay=true,forced=true},
	special_summoned_from_gy={single=true,code=EVENT_SPSUMMON_SUCCESS,delay=true,forced=true,
		con=function(e) return e:GetHandler():GetPreviousLocation()==LOCATION_GRAVE end},
	ss_from_own_gy={code=EVENT_SPSUMMON_SUCCESS,
		con=function(e,tp,eg) return eg and eg:IsExists(function(c,p)
			return c:IsPreviousLocation(LOCATION_GRAVE) and c:IsPreviousControler(p)
		end,1,nil,tp) end},
	beast_battle_damage_opp={code=EVENT_BATTLE_DAMAGE,
		con=function(e,tp,eg,ep) return ep~=tp and eg and eg:IsExists(function(c,p)
			return c:IsControler(p) and c:IsRace(RACE_BEAST)
		end,1,nil,tp) end},
	your_battle_damage_opp={code=EVENT_BATTLE_DAMAGE,
		con=function(e,tp,eg,ep) return ep~=tp and eg and eg:IsExists(function(c,p)
			return c:IsControler(p)
		end,1,nil,tp) end},
	your_faceup_fire_destroyed={code=EVENT_TO_GRAVE,delay=true,
		con=function(e,tp,eg) return eg and eg:IsExists(function(c,p)
			return c:IsPreviousPosition(POS_FACEUP) and c:IsPreviousLocation(LOCATION_MZONE)
				and c:IsPreviousControler(p) and c:IsControler(p) and c:IsReason(REASON_DESTROY)
				and c:IsAttribute(ATTRIBUTE_FIRE)
		end,1,nil,tp) end},
	any_standby_phase={code=EVENT_PHASE+PHASE_STANDBY,once=true},
	non_token_banished={code=EVENT_REMOVE,forced=true,
		con=function(e,tp,eg) return eg and eg:IsExists(function(c) return not c:IsType(TYPE_TOKEN) end,1,nil) end},
	st_destroyed_opp={code=EVENT_TO_GRAVE,delay=true,con=function(e,tp,eg)
		return eg and eg:IsExists(function(c,p)
			return c:IsSpellTrap() and c:IsReason(REASON_DESTROY) and c:IsReason(REASON_EFFECT)
				and c:GetReasonPlayer()==1-p and c:IsPreviousControler(p) and c:IsPreviousLocation(LOCATION_ONFIELD)
		end,1,nil,tp)
	end},
	battled={single=true,code=EVENT_BATTLED},
	flipped_then_sent_gy={single=true,code=EVENT_TO_GRAVE,forced=true,track_flipped=true,
		con=function(e) return e:GetLabel()>0 end},
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
	added_to_hand_from_deck_by_effect={single=true,code=EVENT_TO_HAND,delay=true,
		con=function(e,tp,eg,ep,ev,re,r)
			local c=e:GetHandler()
			return (r&REASON_EFFECT)~=0 and c:IsPreviousLocation(LOCATION_DECK)
				and c:GetPreviousControler()==tp
		end},
	zolga_tribute_release={single=true,code=EVENT_RELEASE,delay=true,forced=true,
		con=function(e) return e:GetHandler():IsReason(REASON_SUMMON) end},
	banished_faceup={single=true,code=EVENT_REMOVE,delay=true,
		con=function(e) return e:GetHandler():IsFaceup() end},
	destroyed_opp_by_battle={single=true,code=EVENT_BATTLE_DESTROYING,forced=true,
		con=function(e)
			local c=e:GetHandler()
			local target=Duel.GetAttackTarget()
			return Duel.GetAttacker()==c and target and target:GetControler()~=c:GetControler()
		end},
	destroyed_opp_by_battle_sent_gy={single=true,code=EVENT_BATTLE_DESTROYING,forced=true,
		con=function(e)
			local c=e:GetHandler()
			local target=c:GetBattleTarget()
			return c:IsRelateToBattle() and target and target:GetControler()~=c:GetControler()
				and target:IsLocation(LOCATION_GRAVE) and target:IsReason(REASON_BATTLE)
		end},
	battle_damage_to_opp={single=true,code=EVENT_BATTLE_DAMAGE,forced=true,
		con=function(e,tp,eg,ep) return ep~=tp and Duel.GetAttacker()==e:GetHandler() end},
	this_card_battle_damage_to_opp={single=true,code=EVENT_BATTLE_DAMAGE,
		con=function(e,tp,eg,ep) return ep~=tp and Duel.GetAttacker()==e:GetHandler() end},
	attacks_facedown_pre_damage={single=true,code=EVENT_PRE_DAMAGE_CALCULATE,forced=true,
		con=function(e)
			local c=e:GetHandler()
			local tc=c:GetBattleTarget()
			return c==Duel.GetAttacker() and tc and tc:GetBattlePosition()==POS_FACEDOWN_DEFENSE
		end},
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
	attacks_facedown={single=true,code=EVENT_BATTLE_START,forced=true,
		con=function(e)
			local c=e:GetHandler()
			local tc=Duel.GetAttackTarget()
			return Duel.GetAttacker()==c and tc~=nil and tc:IsFacedown() and tc:IsDefensePos()
		end},
	end_phase_mandatory={code=EVENT_PHASE+PHASE_END,once=true,forced=true,
		con=function(e,tp) return Duel.IsTurnPlayer(tp) end},
	attacked_not_destroyed={single=true,code=EVENT_BATTLED,forced=true,
		con=function(e)
			local c=e:GetHandler()
			local attacker=Duel.GetAttacker()
			return Duel.GetAttackTarget()==c and attacker~=nil and not attacker:IsStatus(STATUS_BATTLE_DESTROYED)
		end},
	attacked_by_weaker={single=true,code=EVENT_DAMAGE_STEP_END,forced=true,
		con=function(e)
			local c=e:GetHandler()
			local attacker=Duel.GetAttacker()
			return attacker~=nil and Duel.GetAttackTarget()==c
				and ((c:IsOnField() and c:IsDefensePos()) or c:IsPreviousPosition(POS_DEFENSE))
				and attacker:GetAttack()<c:GetDefense()
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
	battle_destroyed_by_race={build=function(p) return {single=true,code=EVENT_BATTLE_DESTROYED,
		con=function(e)
			local c=e:GetHandler()
			local bc=c:GetBattleTarget()
			return c:IsLocation(LOCATION_GRAVE) and c:IsReason(REASON_BATTLE) and bc and bc:IsRace(p.race)
		end} end},
	battled_face_down_target={single=true,code=EVENT_BATTLED,
		con=function(e)
			local c=e:GetHandler()
			local pos=c:GetBattlePosition()
			return c==Duel.GetAttackTarget() and c:IsLocation(LOCATION_MZONE)
				and (pos==POS_FACEDOWN_DEFENSE or pos==POS_FACEDOWN_ATTACK)
		end},
	attacked_by_this_card={single=true,code=EVENT_BATTLED,forced=true,
		con=function(e) return e:GetHandler()==Duel.GetAttacker() and Duel.GetAttackTarget()~=nil end},
	attacked_still_in_battle={single=true,code=EVENT_DAMAGE_STEP_END,forced=true,
		con=function(e)
			local c=e:GetHandler()
			return c==Duel.GetAttacker() and c:IsRelateToBattle()
		end},
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
	bounder_attacked_faceup={single=true,code=EVENT_BATTLE_CONFIRM,forced=true,
		con=function(e)
			local c=e:GetHandler()
			return Duel.GetAttackTarget()==c and c:GetBattlePosition()==POS_FACEUP_ATTACK
		end},
	bounder_damaged_battle={single=true,code=EVENT_BATTLED,forced=true,
		con=function(e) return e:GetHandler():GetFlagEffect(e:GetHandler():GetOriginalCode())~=0 end},
	direct_damage={single=true,code=EVENT_BATTLE_DAMAGE,con=function(e,tp,eg,ep) return ep~=tp and Duel.GetAttackTarget()==nil end},
	this_card_direct_battle_damage={single=true,code=EVENT_BATTLE_DAMAGE,
		con=function(e,tp,eg,ep) return ep~=tp and Duel.GetAttacker()==e:GetHandler() and Duel.GetAttackTarget()==nil end},
	standby={code=EVENT_PHASE+PHASE_STANDBY,once=true,con=function(e,tp) return Duel.IsTurnPlayer(tp) end},
	standby_faceup_attack={code=EVENT_PHASE+PHASE_STANDBY,once=true,forced=true,
		con=function(e,tp)
			local c=e:GetHandler()
			return Duel.IsTurnPlayer(tp) and c:IsFaceup() and c:IsAttackPos()
		end},
	standby_empty_hand={code=EVENT_PHASE+PHASE_STANDBY,once=true,
		con=function(e,tp) return Duel.IsTurnPlayer(tp) and Duel.GetFieldGroupCount(tp,LOCATION_HAND,0)==0 end},
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
	tribute_summon_2plus={build=function(p)
		return {code=EVENT_SUMMON_SUCCESS,codes={EVENT_SUMMON_SUCCESS,EVENT_MSET},delay=true,forced=true,
			con=function(e,tp,eg,ep)
				if not eg then return false end
				local tc=eg:GetFirst()
				if not tc or not tc:IsSummonPlayer(tp) or not tc:IsTributeSummoned() then return false end
				local mg=tc:GetMaterial()
				return mg and mg:FilterCount(function(mc) return (mc:GetPreviousTypeOnField()&TYPE_MONSTER)~=0 end,nil)>=2
			end}
	end},
	activate_any={code=EVENT_CHAINING,quick=true,
		con=function(e,tp,eg,ep,ev,re) return re and re:IsHasType(EFFECT_TYPE_ACTIVATE) and Duel.IsChainNegatable(ev) end},
	summon_try_any={build=function(p)
		return {code=EVENT_SUMMON,codes={EVENT_SUMMON,EVENT_FLIP_SUMMON,EVENT_SPSUMMON},
			con=function() return Duel.GetCurrentChain(true)==0 end}
	end},
	summon_same_race={build=function(p)
		return {code=EVENT_SUMMON,codes={EVENT_SUMMON,EVENT_FLIP_SUMMON,EVENT_SPSUMMON},
			con=function(e,tp,eg)
				if Duel.GetCurrentChain(true)~=0 or not eg then return false end
				return eg:IsExists(function(tc)
					return Duel.IsExistingMatchingCard(function(fc) return fc:IsFaceup() and fc:IsRace(tc:GetRace()) end,
						tp,LOCATION_MZONE,LOCATION_MZONE,1,tc)
				end,1,nil)
			end}
	end},
	spell_targets_one_monster={code=EVENT_CHAINING,quick=true,
		con=function(e,tp,eg,ep,ev,re)
			if not re or not re:IsHasProperty(EFFECT_FLAG_CARD_TARGET) then return false end
			local tg=Duel.GetChainInfo(ev,CHAININFO_TARGET_CARDS)
			return tg and #tg==1 and tg:GetFirst():IsLocation(LOCATION_MZONE)
				and re:IsSpellEffect() and re:IsHasType(EFFECT_TYPE_ACTIVATE) and Duel.IsChainNegatable(ev)
		end},
	monster_effect_any={code=EVENT_CHAINING,quick=true,
		con=function(e,tp,eg,ep,ev,re) return re and re:IsMonsterEffect() and Duel.IsChainNegatable(ev) end},
	st_targets_zombie={code=EVENT_CHAINING,quick=true,
		con=function(e,tp,eg,ep,ev,re)
			if not re or not re:IsHasProperty(EFFECT_FLAG_CARD_TARGET) or not re:IsHasType(EFFECT_TYPE_ACTIVATE) then return false end
			local tg=Duel.GetChainInfo(ev,CHAININFO_TARGET_CARDS)
			local tc=tg and tg:GetFirst()
			return tg and #tg==1 and tc and tc:IsLocation(LOCATION_MZONE) and tc:IsFaceup() and tc:IsRace(RACE_ZOMBIE) and Duel.IsChainNegatable(ev)
		end},
	summon_event_cont={build=function(p) return R.Event.summon_event.build(p) end},
	summon_event_cont_spell={build=function(p) return R.Event.summon_event.build(p) end},
	opp_summon={code=EVENT_SUMMON_SUCCESS,trap_code2=EVENT_SPSUMMON_SUCCESS,delay=true,
		con=function(e,tp,eg) return eg:IsExists(Card.IsSummonPlayer,1,nil,1-tp) end},
	opp_activate={code=EVENT_CHAINING,quick=true,con=function(e,tp,eg,ep,ev,re,r,rp) return rp==1-tp and Duel.IsChainNegatable(ev) end},
	opp_activate_st={code=EVENT_CHAINING,quick=true,
		con=function(e,tp,eg,ep,ev,re,r,rp) return rp==1-tp and re:IsHasType(EFFECT_TYPE_ACTIVATE) and Duel.IsChainNegatable(ev) end},
	opp_activates_named={build=function(p) return {code=EVENT_CHAINING,quick=true,
		con=function(e,tp,eg,ep,ev,re,r,rp)
			return rp==1-tp and re and re:IsHasType(EFFECT_TYPE_ACTIVATE)
				and re:GetHandler():IsCode(table.unpack(p.codes)) and Duel.IsChainDisablable(ev)
		end}
	end},
	continuous_type_activated={build=function(p) return {code=EVENT_CHAINING,quick=true,
		con=function(e,tp,eg,ep,ev,re)
			local active={field=TYPE_FIELD,continuous_spell=TYPE_CONTINUOUS+TYPE_SPELL,
				continuous_trap=TYPE_CONTINUOUS+TYPE_TRAP}
			return re and re:IsHasType(EFFECT_TYPE_ACTIVATE) and re:GetActiveType()==active[p.active]
		end}
	end},
	battle_damage_2000_plus={code=EVENT_PRE_DAMAGE_CALCULATE,con=function(e,tp)
		local scale=(SR_BATTLE_SCALE or {})[tp] or 1
		return math.floor(Duel.GetBattleDamage(tp)*scale)>=2000
	end},
	battle_damage_event={build=function(p) return {code=EVENT_BATTLE_DAMAGE,
		con=function(e,tp,eg,ep,ev) return ep==tp and ev>=(p.n or 0) end} end},
	opp_damage_calc_battle_damage={code=EVENT_PRE_DAMAGE_CALCULATE,quick=true,
		con=function(e,tp) return Duel.IsTurnPlayer(1-tp) and Duel.GetBattleDamage(tp)>0 end},
	your_standby_phase={code=EVENT_PHASE+PHASE_STANDBY,once=true,
		con=function(e,tp) return Duel.IsTurnPlayer(tp) end},
	opponent_attacks_stronger_defense={build=function(p) return {code=EVENT_DAMAGE_STEP_END,
		con=function(e,tp)
			local attacker=Duel.GetAttacker()
			local target=Duel.GetAttackTarget()
			return attacker and attacker:IsControler(1-tp) and attacker:IsRelateToBattle()
				and target and target:IsDefensePos() and target:IsRelateToBattle()
				and target:GetDefense()>attacker:GetAttack()
		end} end},
	opp_monster_changed_facedown={code=EVENT_CHANGE_POS,con=function(e,tp,eg)
		return eg and eg:IsExists(function(c,p)
			return c:IsControler(1-p) and c:IsFacedown() and (c:GetPreviousPosition()&POS_FACEUP)~=0
		end,1,nil,tp)
	end},
	opp_monster_changed_to_defense={code=EVENT_CHANGE_POS,con=function(e,tp,eg)
		return eg and eg:IsExists(function(c,p)
			return c:IsControler(1-p) and c:IsPreviousPosition(POS_FACEUP_ATTACK) and c:IsPosition(POS_FACEUP_DEFENSE)
		end,1,nil,tp)
	end},
	destroyed_face_down_trap={single=true,code=EVENT_TO_GRAVE,delay=true,forced=true,
		con=function(e)
			local c=e:GetHandler()
			return c:IsReason(REASON_DESTROY) and c:IsPreviousLocation(LOCATION_ONFIELD)
				and c:IsPreviousPosition(POS_FACEDOWN)
		end},
	opp_monster_set={code=EVENT_MSET,con=function(e,tp,eg)
		return eg and eg:IsExists(function(c,p) return c:IsControler(1-p) and c:IsFacedown() end,1,nil,tp)
	end},
	opp_monster_ss_facedown={code=EVENT_SPSUMMON_SUCCESS,con=function(e,tp,eg)
		return eg and eg:IsExists(function(c,p) return c:IsControler(1-p) and c:IsFacedown() end,1,nil,tp)
	end},
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
	discard_cost_change={check=function(e,tp) return Duel.IsPlayerAffectedByEffect(tp,EFFECT_DISCARD_COST_CHANGE) or Duel.IsExistingMatchingCard(Card.IsDiscardable,tp,LOCATION_HAND,0,1,e:GetHandler()) end,
		pay=function(e,tp) if not Duel.IsPlayerAffectedByEffect(tp,EFFECT_DISCARD_COST_CHANGE) then Duel.DiscardHand(tp,Card.IsDiscardable,1,1,REASON_COST+REASON_DISCARD) end end},
	dark_curtain_cost={check=function(e,tp)
		return Duel.GetLP(tp)>1 and Duel.GetActivityCount(tp,ACTIVITY_SUMMON)==0
			and Duel.GetActivityCount(tp,ACTIVITY_FLIPSUMMON)==0 and Duel.GetActivityCount(tp,ACTIVITY_SPSUMMON)==0
	end,
	pay=function(e,tp)
		Duel.PayLPCost(tp,math.floor(Duel.GetLP(tp)/2))
		local c=e:GetHandler()
		local e1=Effect.CreateEffect(c)
		e1:SetType(EFFECT_TYPE_FIELD) e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET+EFFECT_FLAG_OATH)
		e1:SetCode(EFFECT_CANNOT_SPECIAL_SUMMON) e1:SetReset(RESET_PHASE|PHASE_END) e1:SetTargetRange(1,0)
		e1:SetTarget(function(se,tc,sump,sumtype,sumpos,targetp,te) return c~=te:GetHandler() end)
		Duel.RegisterEffect(e1,tp)
		for _,code in ipairs({EFFECT_CANNOT_SUMMON,EFFECT_CANNOT_FLIP_SUMMON}) do
			local e2=Effect.CreateEffect(c)
			e2:SetType(EFFECT_TYPE_FIELD) e2:SetProperty(EFFECT_FLAG_PLAYER_TARGET+EFFECT_FLAG_OATH)
			e2:SetCode(code) e2:SetReset(RESET_PHASE|PHASE_END) e2:SetTargetRange(1,0)
			Duel.RegisterEffect(e2,tp)
		end
	end},
	stray_lambs_lock={check=function(e,tp)
		return Duel.GetActivityCount(tp,ACTIVITY_SUMMON)==0 and Duel.GetActivityCount(tp,ACTIVITY_FLIPSUMMON)==0
			and Duel.GetActivityCount(tp,ACTIVITY_SPSUMMON)==0
	end,
	pay=function(e,tp)
		local c=e:GetHandler()
		local e1=Effect.CreateEffect(c) e1:SetType(EFFECT_TYPE_FIELD) e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET+EFFECT_FLAG_OATH)
		e1:SetCode(EFFECT_CANNOT_SPECIAL_SUMMON) e1:SetReset(RESET_PHASE|PHASE_END) e1:SetTargetRange(1,0)
		e1:SetLabelObject(e) e1:SetTarget(function(se,tc,sump,sumtype,sumpos,targetp,te) return se:GetLabelObject()~=te end)
		Duel.RegisterEffect(e1,tp)
		for _,code in ipairs({EFFECT_CANNOT_SUMMON,EFFECT_CANNOT_FLIP_SUMMON}) do
			local e2=Effect.CreateEffect(c) e2:SetType(EFFECT_TYPE_FIELD) e2:SetProperty(EFFECT_FLAG_PLAYER_TARGET+EFFECT_FLAG_OATH)
			e2:SetCode(code) e2:SetReset(RESET_PHASE|PHASE_END) e2:SetTargetRange(1,0) Duel.RegisterEffect(e2,tp)
		end
	end},
	lp={check=function(e,tp,p) return Duel.CheckLPCost(tp,p.n) end,pay=function(e,tp,p) Duel.PayLPCost(tp,p.n) end},
	tribute_self={check=function(e,tp,p) return e:GetHandler():IsReleasable() end,
		pay=function(e,tp,p) Duel.Release(e:GetHandler(),REASON_COST) end},
	tribute_other={check=function(e,tp,p) return Duel.CheckReleaseGroupCost(tp,aux.TRUE,1,false,nil,e:GetHandler()) end,
		pay=function(e,tp,p) local g=Duel.SelectReleaseGroupCost(tp,aux.TRUE,1,1,false,nil,e:GetHandler()) Duel.Release(g,REASON_COST) end},
	tribute_level_for_fusion={check=function(e,tp)
		local f=function(c)
			local lv=c:GetLevel()
			return lv>0 and c:IsReleasable() and Duel.IsExistingMatchingCard(function(fc)
				return fc:IsType(TYPE_FUSION) and fc:GetLevel()==lv and fc:IsCanBeSpecialSummoned(e,0,tp,false,false)
					and Duel.GetLocationCountFromEx(tp,tp,c,fc)>0
			end,tp,LOCATION_EXTRA,0,1,nil)
		end
		return Duel.CheckReleaseGroupCost(tp,f,1,1,false,nil,nil)
	end,
	pay=function(e,tp)
		local f=function(c)
			local lv=c:GetLevel()
			return lv>0 and c:IsReleasable() and Duel.IsExistingMatchingCard(function(fc)
				return fc:IsType(TYPE_FUSION) and fc:GetLevel()==lv and fc:IsCanBeSpecialSummoned(e,0,tp,false,false)
					and Duel.GetLocationCountFromEx(tp,tp,c,fc)>0
			end,tp,LOCATION_EXTRA,0,1,nil)
		end
		local g=Duel.SelectReleaseGroupCost(tp,f,1,1,false,nil,nil)
		local tc=g:GetFirst()
		if tc then e:SetLabel(tc:GetLevel()) Duel.Release(g,REASON_COST) end
	end},
	banish_gy={check=function(e,tp,p) return Duel.IsExistingMatchingCard(Card.IsAbleToRemoveAsCost,tp,LOCATION_GRAVE,0,p.n,e:GetHandler()) end,
		pay=function(e,tp,p)
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)
			local g=Duel.SelectMatchingCard(tp,Card.IsAbleToRemoveAsCost,tp,LOCATION_GRAVE,0,p.n,p.n,e:GetHandler())
			Duel.Remove(g,POS_FACEUP,REASON_COST)
		end},
	banish_hand_random={check=function(e,tp,p)
		return Duel.IsExistingMatchingCard(Card.IsAbleToRemoveAsCost,tp,LOCATION_HAND,0,p.n or 2,e:GetHandler())
	end,
	pay=function(e,tp,p)
		local g=Duel.GetMatchingGroup(Card.IsAbleToRemoveAsCost,tp,LOCATION_HAND,0,e:GetHandler())
		local rg=g:RandomSelect(tp,p.n or 2)
		Duel.Remove(rg,POS_FACEUP,REASON_COST)
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
	if p.zone=='deck_hand_gy' then return LOCATION_DECK|LOCATION_HAND|LOCATION_GRAVE end
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
	if p.exclude_race and c:IsRace(p.exclude_race) then return false end
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
	if p.exclude_codes and c:IsCode(table.unpack(p.exclude_codes)) then return false end
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
local function real_send_equipped_filter(c,e)
	return c:GetEquipTarget()==e:GetHandler() and c:IsAbleToGraveAsCost()
end
R.Cost.send_equipped={check=function(e,tp)
	return Duel.IsExistingMatchingCard(real_send_equipped_filter,tp,LOCATION_SZONE,LOCATION_SZONE,1,nil,e)
	end,
	pay=function(e,tp)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TOGRAVE)
		local g=Duel.SelectMatchingCard(tp,real_send_equipped_filter,tp,LOCATION_SZONE,LOCATION_SZONE,1,1,nil,e)
		Duel.SendtoGrave(g,REASON_COST)
	end}
local function real_send_st_cost_filter(c,e) return c~=e:GetHandler() and c:IsSpellTrap() and c:IsAbleToGraveAsCost() end
R.Cost.send_st_cost_max5={check=function(e,tp)
	return Duel.IsExistingMatchingCard(real_send_st_cost_filter,tp,LOCATION_ONFIELD,0,1,e:GetHandler(),e)
	end,
	pay=function(e,tp)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TOGRAVE)
		local g=Duel.SelectMatchingCard(tp,real_send_st_cost_filter,tp,LOCATION_ONFIELD,0,1,5,e:GetHandler(),e)
		Duel.SendtoGrave(g,REASON_COST)
		e:SetLabel(#g)
	end}
R.Cost.discard_self_hand={check=function(e) return e:GetHandler():IsDiscardable() end,
	pay=function(e) Duel.SendtoGrave(e:GetHandler(),REASON_COST+REASON_DISCARD) end}
R.Cost.sanctity_banish={
	check=function(e,tp)
		return Duel.IsExistingMatchingCard(function(tc) return tc:IsAbleToRemoveAsCost() end,
			tp,LOCATION_HAND|LOCATION_ONFIELD,0,1,e:GetHandler())
	end,
	pay=function(e,tp)
		local g=Duel.GetMatchingGroup(function(tc) return tc:IsAbleToRemoveAsCost() end,
			tp,LOCATION_HAND|LOCATION_ONFIELD,0,e:GetHandler())
		Duel.Remove(g,POS_FACEUP,REASON_COST)
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
	check=function(e,tp,p)
		local f=function(c) return real_tribute_filter(c,tp,p) and (not p.exclude_self or c~=e:GetHandler()) end
		return Duel.CheckReleaseGroupCost(tp,f,p.n or 1,false,nil,nil,tp,p)
	end,
	pay=function(e,tp,p)
		local n=p.n or 1
		local f=function(c) return real_tribute_filter(c,tp,p) and (not p.exclude_self or c~=e:GetHandler()) end
		local g=Duel.SelectReleaseGroupCost(tp,f,n,n,false,nil,nil,tp,p)
		if p.save_attack and #g>0 then e:SetLabel(g:GetFirst():GetAttack()) end
		Duel.Release(g,REASON_COST)
	end}
R.Cost.tribute_labyrinth_pair={
	check=function(e,tp)
		local c=e:GetHandler()
		local tc=c:GetEquipTarget()
		return tc and tc:IsControler(tp) and c:IsReleasable() and tc:IsReleasable()
	end,
	pay=function(e,tp)
		local c=e:GetHandler()
		local tc=c:GetEquipTarget()
		if tc and c:IsRelateToEffect(e) then Duel.Release(Group.FromCards(c,tc),REASON_COST) end
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
	draw_plus_named_faceup={cat=CATEGORY_DRAW,
		prep=function(e,tp,eg,ep,ev,re,r,rp,p)
			local n=1+Duel.GetMatchingGroupCount(function(c,codes) return c:IsFaceup() and c:IsCode(table.unpack(codes)) end,
				tp,LOCATION_ONFIELD,0,nil,p.codes)
			Duel.SetTargetPlayer(tp) Duel.SetTargetParam(n)
			Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,tp,n)
		end,
		op=function(e)
			local p,n=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)
			Duel.Draw(p,n,REASON_EFFECT)
		end},
	recover={cat=CATEGORY_RECOVER,prep=function(e,tp,eg,ep,ev,re,r,rp,p) Duel.SetOperationInfo(0,CATEGORY_RECOVER,nil,0,tp,p.n) end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p,m) Duel.Recover(tp,p.n*m,REASON_EFFECT) end},
	damage={cat=CATEGORY_DAMAGE,prep=function(e,tp,eg,ep,ev,re,r,rp,p) Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,1-tp,p.n) end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p,m) Duel.Damage(1-tp,p.n*m,REASON_EFFECT) end},
	damage_battle_attacker={cat=CATEGORY_DAMAGE,op=function(e,tp,eg,ep,ev,re,r,rp,p,m)
		local attacker=Duel.GetAttacker()
		if attacker then Duel.Damage(attacker:GetControler(),p.n*m,REASON_EFFECT) end
	end},
	damage_battle_target_level={cat=CATEGORY_DAMAGE,
		check=function(e)
			local bc=e:GetHandler():GetBattleTarget()
			return bc and bc:IsMonster() and bc:IsLocation(LOCATION_GRAVE) and bc:IsReason(REASON_BATTLE)
		end,
		prep=function(e,tp)
			local bc=e:GetHandler():GetBattleTarget()
			local dam=bc and bc:GetLevel()*500 or 0
			Duel.SetTargetPlayer(1-tp)
			Duel.SetTargetParam(dam)
			Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,1-tp,dam)
		end,
		op=function(e,tp)
			local player,dam=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)
			Duel.Damage(player,dam,REASON_EFFECT)
		end},
	destroy_all_st={cat=CATEGORY_DESTROY,
		prep=function(e,tp)
			local g=Duel.GetMatchingGroup(Card.IsSpellTrap,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,nil)
			Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,#g,0,0)
		end,
		op=function(e,tp)
			local g=Duel.GetMatchingGroup(Card.IsSpellTrap,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,nil)
			if #g>0 then Duel.Destroy(g,REASON_EFFECT) end
		end},
	reduce_battle_target_atk_500={cat=CATEGORY_ATKCHANGE,op=function(e)
		local tc=Duel.GetAttackTarget()
		if not tc or not tc:IsRelateToBattle() or tc:IsFacedown() then return end
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_SINGLE)
		e1:SetCode(EFFECT_UPDATE_ATTACK)
		e1:SetValue(-500)
		e1:SetReset(RESETS_STANDARD_PHASE_END)
		tc:RegisterEffect(e1)
	end},
	damage_self={cat=CATEGORY_DAMAGE,prep=function(e,tp,eg,ep,ev,re,r,rp,p) Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,tp,p.n) end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p,m) Duel.Damage(tp,p.n*m,REASON_EFFECT) end},
	recover_tribute_stat={cat=CATEGORY_RECOVER,
		prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_RECOVER,nil,0,tp,e:GetLabel()) end,
		op=function(e,tp) Duel.Recover(tp,e:GetLabel(),REASON_EFFECT) end},
	recover_1000_per_st_cost={cat=CATEGORY_RECOVER,
		prep=function(e,tp) local n=e:GetLabel()*1000 Duel.SetTargetPlayer(tp) Duel.SetTargetParam(n) Duel.SetOperationInfo(0,CATEGORY_RECOVER,nil,0,tp,n) end,
		op=function(e,tp) local p,n=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM) Duel.Recover(p,n,REASON_EFFECT) end},
	destroy_attack_target={cat=CATEGORY_DESTROY,
		check=function() local tc=Duel.GetAttackTarget() return tc~=nil and tc:IsFaceup() and tc:IsDefensePos() and tc:IsRelateToBattle() end,
		prep=function(e,tp) local tc=Duel.GetAttackTarget() Duel.SetOperationInfo(0,CATEGORY_DESTROY,tc,1,0,0) end,
		op=function(e) local tc=Duel.GetAttackTarget() if tc and tc:IsRelateToBattle() and tc:IsDefensePos() then Duel.Destroy(tc,REASON_EFFECT) end end},
	reveal_opp_set_all={cat=0,check=function(e,tp) return Duel.IsExistingMatchingCard(Card.IsFacedown,tp,0,LOCATION_ONFIELD,1,nil) end,
		op=function(e,tp)
			local g=Duel.GetMatchingGroup(Card.IsFacedown,tp,0,LOCATION_ONFIELD,nil)
			if #g>0 then Duel.ConfirmCards(tp,g) end
		end},
	reveal_opp_set_all_spell={cat=0,check=function(e,tp) return Duel.IsExistingMatchingCard(Card.IsFacedown,tp,0,LOCATION_ONFIELD,1,nil) end,
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
	destroy_all_lock_named={cat=CATEGORY_DESTROY,
		check=function(e,tp) return Duel.GetFieldGroupCount(tp,0,LOCATION_MZONE)>0 end,
		prep=function(e,tp)
			local g=Duel.GetFieldGroup(tp,0,LOCATION_MZONE)
			Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,#g,0,0)
		end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p)
			Duel.Destroy(Duel.GetFieldGroup(tp,0,LOCATION_MZONE),REASON_EFFECT)
			local g=Duel.GetMatchingGroup(function(c,codes) return c:IsFaceup() and c:IsCode(table.unpack(codes)) end,
				tp,LOCATION_MZONE,0,nil,p.codes)
			for tc in aux.Next(g) do
				local e1=Effect.CreateEffect(e:GetHandler())
				e1:SetType(EFFECT_TYPE_SINGLE) e1:SetCode(EFFECT_CANNOT_ATTACK) e1:SetReset(RESETS_STANDARD_PHASE_END)
				tc:RegisterEffect(e1)
			end
		end},
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
		filter=function(c,e,tp,p) return c:IsFaceup() and (not p or not p.attacker_only or c==Duel.GetAttacker()) end,
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
	self_set_main_phase={cat=CATEGORY_POSITION,check=function(e)
		local ph=Duel.GetCurrentPhase()
		return (ph==PHASE_MAIN1 or ph==PHASE_MAIN2) and e:GetHandler():IsCanTurnSet()
	end,op=function(e)
		local c=e:GetHandler()
		if c:IsRelateToEffect(e) and c:IsFaceup() then Duel.ChangePosition(c,POS_FACEDOWN_DEFENSE) end
	end},
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
	no_battle_damage_this_battle={cat=0,op=function(e,tp)
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_FIELD)
		e1:SetCode(EFFECT_AVOID_BATTLE_DAMAGE)
		e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e1:SetTargetRange(1,0)
		e1:SetValue(1)
		e1:SetReset(RESET_PHASE|PHASE_DAMAGE)
		Duel.RegisterEffect(e1,tp)
	end},
	indestructible_battle_selector_turn={cat=0,hand=true,op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_FIELD)
		e1:SetCode(EFFECT_INDESTRUCTABLE_BATTLE)
		e1:SetTargetRange(LOCATION_MZONE,0)
		e1:SetTarget(function(se,tc) return real_sel(tc,p) end)
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
	self_atk_def_temp={cat=CATEGORY_ATKCHANGE+CATEGORY_DEFCHANGE,
		check=function(e) return e:GetHandler():IsFaceup() end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p)
			local c=e:GetHandler()
			if not (c:IsRelateToEffect(e) and c:IsFaceup()) then return end
			for _,code in ipairs({EFFECT_UPDATE_ATTACK,EFFECT_UPDATE_DEFENSE}) do
				local e1=Effect.CreateEffect(c)
				e1:SetType(EFFECT_TYPE_SINGLE)
				e1:SetCode(code)
				e1:SetValue(p.n or 0)
				e1:SetReset(RESETS_STANDARD_DISABLE_PHASE_END)
				c:RegisterEffect(e1)
			end
		end},
	recover_battle_damage={cat=CATEGORY_RECOVER,
		check=function(e,tp,eg,ep,ev) return ep==1-tp and ev>0 end,
		prep=function(e,tp,eg,ep,ev) Duel.SetOperationInfo(0,CATEGORY_RECOVER,nil,0,tp,ev) end,
		op=function(e,tp,eg,ep,ev) if ep==1-tp and ev>0 then Duel.Recover(tp,ev,REASON_EFFECT) end end},
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
	self_atk_level_500={cat=CATEGORY_ATKCHANGE,
			op=function(e)
				local c=e:GetHandler()
				if not (c:IsRelateToEffect(e) and c:IsFaceup()) then return end
				for _,change in ipairs({{EFFECT_UPDATE_ATTACK,500},{EFFECT_UPDATE_LEVEL,1}}) do
					local e1=Effect.CreateEffect(c)
					e1:SetType(EFFECT_TYPE_SINGLE)
					e1:SetProperty(EFFECT_FLAG_COPY_INHERIT)
					e1:SetCode(change[1])
					e1:SetValue(change[2])
					e1:SetReset(RESET_EVENT|RESETS_STANDARD_DISABLE)
					c:RegisterEffect(e1)
				end
			end},
	self_change_attribute={cat=0,
		op=function(e,tp)
			local c=e:GetHandler()
			if not (c:IsRelateToEffect(e) and c:IsFaceup()) then return end
			local att=c:AnnounceAnotherAttribute(tp)
			local e1=Effect.CreateEffect(c)
			e1:SetType(EFFECT_TYPE_SINGLE)
		e1:SetProperty(EFFECT_FLAG_COPY_INHERIT)
		e1:SetCode(EFFECT_CHANGE_ATTRIBUTE)
		e1:SetValue(att)
		e1:SetReset(RESET_EVENT|RESETS_STANDARD_DISABLE)
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
	pyramid_energy_choice={cat=CATEGORY_ATKCHANGE+CATEGORY_DEFCHANGE,
		check=function(e,tp,eg,ep,ev,re,r,rp,p) return #real_group(tp,p,nil)>0 end,
		prep=function(e,tp,eg,ep,ev,re,r,rp,p)
			local g=real_group(tp,p,nil)
			Duel.SetOperationInfo(0,CATEGORY_ATKCHANGE,g,#g,0,200)
			Duel.SetOperationInfo(0,CATEGORY_DEFCHANGE,g,#g,0,500)
		end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p)
			local g=real_group(tp,p,nil)
			local op=Duel.SelectOption(tp,0,1)
			local code=op==0 and EFFECT_UPDATE_ATTACK or EFFECT_UPDATE_DEFENSE
			local value=op==0 and 200 or 500
			for tc in aux.Next(g) do
				local e1=Effect.CreateEffect(e:GetHandler())
				e1:SetType(EFFECT_TYPE_SINGLE)
				e1:SetCode(code)
				e1:SetValue(value)
				e1:SetReset(RESETS_STANDARD_PHASE_END)
				tc:RegisterEffect(e1)
			end
		end},
	trap_monster_normal={cat=CATEGORY_SPECIAL_SUMMON,
		check=function(e,tp,eg,ep,ev,re,r,rp,p)
			local c=e:GetHandler()
			return Duel.GetLocationCount(tp,LOCATION_MZONE)>0
				and Duel.IsPlayerCanSpecialSummonMonster(tp,c:GetCode(),0,TYPE_MONSTER|TYPE_NORMAL,p.n,p.d,p.l,p.race,p.attr)
		end,
		prep=function(e,tp,eg,ep,ev,re,r,rp,p)
			Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,e:GetHandler(),1,0,0)
		end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p)
			local c=e:GetHandler()
			if not c:IsRelateToEffect(e) or Duel.GetLocationCount(tp,LOCATION_MZONE)<=0 then return end
			if not Duel.IsPlayerCanSpecialSummonMonster(tp,c:GetCode(),0,TYPE_MONSTER|TYPE_NORMAL,p.n,p.d,p.l,p.race,p.attr) then return end
			c:AddMonsterAttribute(TYPE_NORMAL|TYPE_TRAP)
			Duel.SpecialSummonStep(c,0,tp,tp,true,false,POS_FACEUP)
			c:AddMonsterAttributeComplete()
			Duel.SpecialSummonComplete()
		end},
	swamp_mirrorer={cat=CATEGORY_SPECIAL_SUMMON,
		check=function(e,tp)
			local racmask=0
			local race=1
			while RACE_ALL&race~=0 do
				local attr=1
				while ATTRIBUTE_ALL&attr~=0 do
					if Duel.IsPlayerCanSpecialSummonMonster(tp,e:GetHandler():GetCode(),0,TYPE_MONSTER|TYPE_NORMAL,1800,1000,4,race,attr) then
						racmask=racmask|race
						break
					end
					attr=attr<<1
				end
				race=race<<1
			end
			e:SetLabel(racmask)
			return racmask~=0 and Duel.GetLocationCount(tp,LOCATION_MZONE)>0
		end,
		prep=function(e,tp)
			local race=Duel.AnnounceRace(tp,1,e:GetLabel())
			local attrmask=0
			local attr=1
			while ATTRIBUTE_ALL&attr~=0 do
				if Duel.IsPlayerCanSpecialSummonMonster(tp,e:GetHandler():GetCode(),0,TYPE_MONSTER|TYPE_NORMAL,1800,1000,4,race,attr) then
					attrmask=attrmask|attr
				end
				attr=attr<<1
			end
			local attribute=Duel.AnnounceAttribute(tp,1,attrmask)
			e:SetLabel(race)
			Duel.SetTargetParam(attribute)
			Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,e:GetHandler(),1,0,0)
		end,
		op=function(e,tp)
			local c=e:GetHandler()
			local race=e:GetLabel()
			local attr=Duel.GetChainInfo(0,CHAININFO_TARGET_PARAM)
			if not c:IsRelateToEffect(e) or Duel.GetLocationCount(tp,LOCATION_MZONE)<=0 then return end
			if not Duel.IsPlayerCanSpecialSummonMonster(tp,c:GetCode(),0,TYPE_MONSTER|TYPE_NORMAL,1800,1000,4,race,attr) then return end
			c:AddMonsterAttribute(TYPE_NORMAL|TYPE_TRAP,attr,race,0,0,0)
			Duel.SpecialSummonStep(c,0,tp,tp,true,false,POS_FACEUP)
			c:AddMonsterAttributeComplete()
			Duel.SpecialSummonComplete()
		end},
	trap_monster_effect={cat=CATEGORY_SPECIAL_SUMMON,
		check=function(e,tp,eg,ep,ev,re,r,rp,p)
			local c=e:GetHandler()
			return Duel.GetLocationCount(tp,LOCATION_MZONE)>0
				and Duel.IsPlayerCanSpecialSummonMonster(tp,c:GetCode(),0,TYPE_MONSTER|TYPE_EFFECT,p.n,p.d,p.l,p.race,p.attr)
		end,
		prep=function(e,tp,eg,ep,ev,re,r,rp,p)
			Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,e:GetHandler(),1,0,0)
		end,
		op=function(e,tp,eg,ep,ev,re,r,rp,p)
			local c=e:GetHandler()
			if not c:IsRelateToEffect(e) or Duel.GetLocationCount(tp,LOCATION_MZONE)<=0 then return end
			if not Duel.IsPlayerCanSpecialSummonMonster(tp,c:GetCode(),0,TYPE_MONSTER|TYPE_EFFECT,p.n,p.d,p.l,p.race,p.attr) then return end
			c:AddMonsterAttribute(TYPE_EFFECT|TYPE_TRAP)
			if Duel.SpecialSummonStep(c,0,tp,tp,true,false,POS_FACEUP_DEFENSE) then
				c:AddMonsterAttributeComplete()
				if p.no_attack then
					local e1=Effect.CreateEffect(c)
					e1:SetType(EFFECT_TYPE_SINGLE)
					e1:SetCode(EFFECT_CANNOT_ATTACK)
					e1:SetReset(RESETS_STANDARD)
					c:RegisterEffect(e1,true)
				end
			end
			Duel.SpecialSummonComplete()
		end},
	tiki_curse={cat=CATEGORY_SPECIAL_SUMMON,
		check=function(e,tp)
			local c=e:GetHandler()
			return Duel.GetLocationCount(tp,LOCATION_MZONE)>0
				and Duel.IsPlayerCanSpecialSummonMonster(tp,c:GetCode(),0,TYPE_MONSTER|TYPE_EFFECT,1800,1000,4,RACE_ROCK,ATTRIBUTE_DARK)
		end,
		prep=function(e,tp)
			Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,e:GetHandler(),1,0,0)
		end,
		op=function(e,tp)
			local c=e:GetHandler()
			if not c:IsRelateToEffect(e) or Duel.GetLocationCount(tp,LOCATION_MZONE)<=0 then return end
			if not Duel.IsPlayerCanSpecialSummonMonster(tp,c:GetCode(),0,TYPE_MONSTER|TYPE_EFFECT,1800,1000,4,RACE_ROCK,ATTRIBUTE_DARK) then return end
			c:AddMonsterAttribute(TYPE_EFFECT|TYPE_TRAP)
			if Duel.SpecialSummonStep(c,0,tp,tp,true,false,POS_FACEUP) then
				c:AddMonsterAttributeComplete()
				local e1=Effect.CreateEffect(c)
				e1:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
				e1:SetCategory(CATEGORY_DESTROY)
				e1:SetRange(LOCATION_MZONE)
				e1:SetCode(EVENT_BATTLED)
				e1:SetTarget(function(se,stp,eg,ep,ev,re,r,rp,chk)
					local a=Duel.GetAttacker()
					local d=Duel.GetAttackTarget()
					if chk==0 then
						if not a or not d then return false end
						if a:IsControler(stp) then return a~=c and a:IsOriginalType(TYPE_TRAP) end
						return d~=c and d:IsControler(stp) and d:IsOriginalType(TYPE_TRAP)
					end
					local tc=a:IsControler(stp) and d or a
					if tc then
						Duel.SetOperationInfo(0,CATEGORY_DESTROY,tc,1,0,0)
						se:SetLabelObject(tc)
					end
				end)
				e1:SetOperation(function(se)
					local tc=se:GetLabelObject()
					if tc and tc:IsRelateToBattle() then Duel.Destroy(tc,REASON_EFFECT) end
				end)
				e1:SetReset(RESET_EVENT|RESETS_STANDARD)
				c:RegisterEffect(e1,true)
			end
			Duel.SpecialSummonComplete()
		end},
	dicephoon={cat=CATEGORY_DICE+CATEGORY_DESTROY+CATEGORY_DAMAGE,
		prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_DICE,nil,0,tp,1) end,
		op=function(e,tp)
			local dc=Duel.TossDice(tp,1)
			if dc==1 or dc==6 then
				Duel.Damage(tp,1000,REASON_EFFECT)
			elseif dc==5 then
				local g=Duel.GetMatchingGroup(Card.IsSpellTrap,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,e:GetHandler())
				if #g<2 then return end
				Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)
				Duel.Destroy(g:Select(tp,2,2,nil),REASON_EFFECT)
			else
				Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)
				local g=Duel.SelectMatchingCard(tp,Card.IsSpellTrap,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,1,e:GetHandler())
				Duel.Destroy(g,REASON_EFFECT)
			end
		end},
	dark_coffin={cat=CATEGORY_HANDES+CATEGORY_DESTROY,
		prep=function(e,tp)
			Duel.SetOperationInfo(0,CATEGORY_HANDES,nil,0,1-tp,1)
			Duel.SetOperationInfo(0,CATEGORY_DESTROY,nil,1,1-tp,LOCATION_MZONE)
		end,
		op=function(e,tp)
			local hand=Duel.GetFieldGroup(tp,0,LOCATION_HAND)
			local mons=Duel.GetFieldGroup(tp,0,LOCATION_MZONE)
			if #hand==0 and #mons==0 then return end
			local opt
			if #hand>0 and #mons>0 then opt=Duel.SelectOption(1-tp,0,1)
			elseif #hand>0 then opt=0 else opt=1 end
			if opt==0 then
				Duel.SendtoGrave(hand:RandomSelect(1-tp,1),REASON_EFFECT|REASON_DISCARD)
			else
				Duel.Hint(HINT_SELECTMSG,1-tp,HINTMSG_DESTROY)
				Duel.Destroy(mons:Select(1-tp,1,1,nil),REASON_EFFECT)
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
R.Act.mesmeric_control={cat=0,op=function(e,tp)
	local e1=Effect.CreateEffect(e:GetHandler())
	e1:SetType(EFFECT_TYPE_FIELD)
	e1:SetCode(EFFECT_CANNOT_CHANGE_POSITION)
	e1:SetTargetRange(0,LOCATION_MZONE)
	e1:SetProperty(EFFECT_FLAG_SET_AVAILABLE+EFFECT_FLAG_IGNORE_IMMUNE)
	e1:SetReset(RESET_PHASE|PHASE_END,2)
	Duel.RegisterEffect(e1,tp)
end}
R.Act.reflect_effect_damage={cat=0,op=function(e,tp,eg,ep,ev)
	local cid=Duel.GetChainInfo(ev,CHAININFO_CHAIN_ID)
	local e1=Effect.CreateEffect(e:GetHandler())
	e1:SetType(EFFECT_TYPE_FIELD)
	e1:SetCode(EFFECT_REFLECT_DAMAGE)
	e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e1:SetTargetRange(1,0)
	e1:SetLabel(cid)
	e1:SetValue(function(se,re,val,r,rp,rc)
		local cc=Duel.GetCurrentChain()
		if cc==0 or (r&REASON_EFFECT)==0 then return false end
		local chain_id=Duel.GetChainInfo(0,CHAININFO_CHAIN_ID)
		return chain_id==se:GetLabel()
	end)
	e1:SetReset(RESET_CHAIN)
	Duel.RegisterEffect(e1,tp)
end}
R.Act.shadow_spell=targeted({cat=CATEGORY_ATKCHANGE+CATEGORY_POSITION,target=true,loc1=0,loc2=LOCATION_MZONE,hint=HINTMSG_FACEUP,
	filter=function(tc) return tc:IsFaceup() end,
	op=function(e)
		local tc=Duel.GetFirstTarget()
		local c=e:GetHandler()
		if tc and tc:IsRelateToEffect(e) and tc:IsFaceup() then c:SetCardTarget(tc) end
	end})
R.Act.negate_effect=R.Act.negate_activation
R.Act.destroy_any_mon=targeted({cat=CATEGORY_DESTROY,target=true,loc1=LOCATION_MZONE,loc2=LOCATION_MZONE,hint=HINTMSG_DESTROY,
	filter=aux.TRUE,op=function(e) local tc=Duel.GetFirstTarget() if relate(e,tc) then Duel.Destroy(tc,REASON_EFFECT) end end})
R.Act.destroy_target_opp=targeted({cat=CATEGORY_DESTROY,target=true,loc1=0,loc2=LOCATION_MZONE,hint=HINTMSG_DESTROY,
	filter=function(c,e,tp) return c:IsControler(1-tp) end,
	op=function(e) local tc=Duel.GetFirstTarget() if relate(e,tc) then Duel.Destroy(tc,REASON_EFFECT) end end})
R.Act.swap_control_with_opp_mon=targeted({cat=CATEGORY_CONTROL,target=true,loc1=0,loc2=LOCATION_MZONE,hint=HINTMSG_CONTROL,
	filter=function(c) return c:IsControlerCanBeChanged() end,
	op=function(e)
		local c=e:GetHandler()
		local tc=Duel.GetFirstTarget()
		if c:IsRelateToEffect(e) and relate(e,tc) then Duel.SwapControl(c,tc) end
	end})
R.Act.magical_merchant_excavate={cat=CATEGORY_TOHAND+CATEGORY_SEARCH+CATEGORY_DECKDES,
	op=function(e,tp)
		local dcount=Duel.GetFieldGroupCount(tp,LOCATION_DECK,0)
		if dcount==0 then return end
		local g=Duel.GetMatchingGroup(Card.IsSpellTrap,tp,LOCATION_DECK,0,nil)
		if #g==0 then
			Duel.ConfirmDecktop(tp,dcount)
			Duel.ShuffleDeck(tp)
			return
		end
		local spcard=g:GetMaxGroup(Card.GetSequence):GetFirst()
		if not spcard then return end
		local ct=dcount-spcard:GetSequence()
		Duel.ConfirmDecktop(tp,ct)
		if spcard:IsAbleToHand() then
			Duel.DisableShuffleCheck()
			Duel.SendtoHand(spcard,nil,REASON_EFFECT)
			if ct>1 then Duel.DiscardDeck(tp,ct-1,REASON_EFFECT|REASON_EXCAVATE) end
			Duel.ConfirmCards(1-tp,spcard)
			Duel.ShuffleHand(tp)
		else
			Duel.DiscardDeck(tp,ct,REASON_EFFECT|REASON_EXCAVATE)
		end
	end}
R.Act.opp_mon_cannot_attack_while_this_faceup=targeted({cat=0,target=true,loc1=0,loc2=LOCATION_MZONE,hint=HINTMSG_FACEUP,
	filter=function(c) return c:IsFaceup() end,
	op=function(e)
		local source=e:GetHandler()
		local tc=Duel.GetFirstTarget()
		if not (source:IsRelateToEffect(e) and tc and tc:IsRelateToEffect(e) and source:IsFaceup()) then return end
		source:SetCardTarget(tc)
		local e1=Effect.CreateEffect(source)
		e1:SetType(EFFECT_TYPE_SINGLE)
		e1:SetCode(EFFECT_CANNOT_ATTACK)
		e1:SetCondition(function(se)
			local sc=se:GetOwner()
			return sc:IsFaceup() and sc:IsHasCardTarget(se:GetHandler())
		end)
		e1:SetReset(RESET_EVENT|RESETS_STANDARD)
		tc:RegisterEffect(e1)
	end})
R.Act.flip_search_or_top={cat=CATEGORY_TOHAND+CATEGORY_SEARCH,
	check=function(e,tp,eg,ep,ev,re,r,rp,p)
		return Duel.IsExistingMatchingCard(function(c,pp) return real_sel(c,pp) and c:IsAbleToHand() end,
			tp,LOCATION_DECK,0,1,nil,p)
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
		local g=Duel.SelectMatchingCard(tp,function(c,pp) return real_sel(c,pp) and c:IsAbleToHand() end,
			tp,LOCATION_DECK,0,1,1,nil,p)
		local tc=g:GetFirst()
		if not tc then return end
		if Duel.IsEnvironment(CARD_NECROVALLEY) and Duel.SelectYesNo(tp,aux.Stringid(e:GetHandler():GetOriginalCode(),0)) then
			Duel.SendtoHand(tc,nil,REASON_EFFECT)
			Duel.ConfirmCards(1-tp,tc)
		else
			Duel.ShuffleDeck(tp)
			Duel.MoveSequence(tc,0)
			Duel.ConfirmDecktop(tp,1)
		end
	end}
R.Act.discard_one_each={cat=CATEGORY_HANDES,
	prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_HANDES,nil,0,PLAYER_ALL,1) end,
	op=function(e,tp)
		local g=Group.CreateGroup()
		for p=0,1 do
			if Duel.GetFieldGroupCount(p,LOCATION_HAND,0)>0 then
				Duel.Hint(HINT_SELECTMSG,p,HINTMSG_DISCARD)
				local sg=Duel.SelectMatchingCard(p,aux.TRUE,p,LOCATION_HAND,0,1,1,nil)
				g:Merge(sg)
			end
		end
		if #g>0 then Duel.SendtoGrave(g,REASON_DISCARD|REASON_EFFECT) end
	end}
R.Act.weaken_battle_destroyer={cat=CATEGORY_ATKCHANGE+CATEGORY_DEFCHANGE,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local tc=e:GetHandler():GetBattleTarget()
		if not (tc and tc:IsRelateToBattle()) or (p.faceup and not tc:IsFaceup()) then return end
		for _,code in ipairs({EFFECT_UPDATE_ATTACK,EFFECT_UPDATE_DEFENSE}) do
			local e1=Effect.CreateEffect(e:GetHandler())
			e1:SetType(EFFECT_TYPE_SINGLE) e1:SetCode(code)
			e1:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
			e1:SetReset(RESET_EVENT|RESETS_STANDARD)
			e1:SetValue(-500) tc:RegisterEffect(e1)
		end
	end}
R.Act.poisonous_snake_token={cat=CATEGORY_SPECIAL_SUMMON+CATEGORY_TOKEN,
	check=function(e,tp)
		return Duel.GetLocationCount(tp,LOCATION_MZONE)>0
			and Duel.IsPlayerCanSpecialSummonMonster(tp,86801872,0,TYPES_TOKEN,1200,1200,3,RACE_REPTILE,ATTRIBUTE_EARTH,POS_FACEUP)
	end,
	prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_TOKEN,nil,1,tp,0) Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,0) end,
	op=function(e,tp)
		if Duel.GetLocationCount(tp,LOCATION_MZONE)<=0 then return end
		if not Duel.IsPlayerCanSpecialSummonMonster(tp,86801872,0,TYPES_TOKEN,1200,1200,3,RACE_REPTILE,ATTRIBUTE_EARTH,POS_FACEUP) then return end
		local token=Duel.CreateToken(tp,86801872)
		if Duel.SpecialSummonStep(token,0,tp,tp,false,false,POS_FACEUP) then
			local be=Effect.CreateEffect(e:GetHandler())
			be:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
			be:SetCode(EVENT_BATTLE_DESTROYED)
			be:SetLabelObject(token)
			be:SetCondition(function(se,stp,eg)
				local tok=se:GetLabelObject()
				if eg:IsContains(tok) then return true end
				if not tok:IsLocation(LOCATION_MZONE) then se:Reset() end
				return false
			end)
			be:SetOperation(function(se,stp) Duel.Damage(1-stp,500,REASON_EFFECT) end)
			Duel.RegisterEffect(be,tp)
		end
		Duel.SpecialSummonComplete()
	end}
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
R.Act.activator_may_draw={cat=CATEGORY_DRAW,
	prep=function(e,tp,eg,ep,ev,re,r,rp)
		Duel.SetTargetPlayer(rp) Duel.SetTargetParam(1)
		Duel.SetPossibleOperationInfo(0,CATEGORY_DRAW,nil,0,rp,1)
	end,
	op=function(e,tp)
		local c=e:GetHandler()
		local p,n=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)
		if c:IsRelateToEffect(e) and c:IsFaceup() and c:IsAttackPos()
			and Duel.IsPlayerCanDraw(p,n) and Duel.SelectYesNo(p,aux.Stringid(c:GetOriginalCode(),1)) then
			Duel.Draw(p,n,REASON_EFFECT)
		end
	end}
R.Act.destroy_equipped_event={cat=CATEGORY_DESTROY,
	prep=function(e,tp,eg)
		local c=e:GetHandler()
		local g=eg and eg:Filter(function(ec,tc) return ec:GetEquipTarget()==tc end,nil,c) or Group.CreateGroup()
		Duel.SetTargetCard(g)
		Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,#g,0,0)
	end,
	op=function(e)
		local g=Duel.GetTargetCards(e)
		if #g>0 then Duel.Destroy(g,REASON_EFFECT) end
	end}
R.Act.heal_1000_plus_named_gy={cat=CATEGORY_RECOVER,
	prep=function(e,tp,eg,ep,ev,re,r,rp)
		Duel.SetTargetPlayer(tp) Duel.SetTargetParam(1000)
		Duel.SetOperationInfo(0,CATEGORY_RECOVER,nil,0,tp,1000)
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local player,amount=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)
		Duel.Recover(player,amount,REASON_EFFECT)
		local n=Duel.GetMatchingGroupCount(Card.IsCode,player,LOCATION_GRAVE,0,nil,table.unpack(p.codes))
		if n>0 then Duel.Recover(player,500*n,REASON_EFFECT) end
	end}
R.Act.recover_per_banished={cat=CATEGORY_RECOVER,
	prep=function(e,tp,eg)
		local n=eg:FilterCount(function(c) return not c:IsType(TYPE_TOKEN) end,nil)
		Duel.SetTargetPlayer(tp) Duel.SetTargetParam(n*500)
		Duel.SetOperationInfo(0,CATEGORY_RECOVER,nil,0,tp,n*500)
	end,
	op=function(e,tp)
		local p,n=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)
		if n>0 then Duel.Recover(p,n,REASON_EFFECT) end
	end}
R.Act.banish_battle_participants={cat=CATEGORY_REMOVE,
	prep=function()
		local g=Group.CreateGroup()
		local a,t=Duel.GetAttacker(),Duel.GetAttackTarget()
		if a and a:IsRelateToBattle() then g:AddCard(a) end
		if t and t:IsRelateToBattle() then g:AddCard(t) end
		Duel.SetOperationInfo(0,CATEGORY_REMOVE,g,#g,0,0)
	end,
	op=function()
		local g=Group.CreateGroup()
		local a,t=Duel.GetAttacker(),Duel.GetAttackTarget()
		if a and a:IsRelateToBattle() then g:AddCard(a) end
		if t and t:IsRelateToBattle() then g:AddCard(t) end
		if #g>0 then Duel.Remove(g,POS_FACEUP,REASON_EFFECT) end
	end}
R.Act.end_battle_phase_now={cat=0,
	op=function() Duel.SkipPhase(Duel.GetTurnPlayer(),PHASE_BATTLE,RESET_PHASE|PHASE_BATTLE_STEP,1) end}
R.Act.half_or_nothing={cat=0,
	op=function(e,tp)
		local g=Duel.GetMatchingGroup(Card.IsFaceup,tp,0,LOCATION_MZONE,nil)
		local opt
		if #g==0 then opt=Duel.SelectOption(1-tp,0)+1
		else opt=Duel.SelectOption(1-tp,0,1) end
		if opt==1 then
			Duel.SkipPhase(1-tp,PHASE_BATTLE,RESET_PHASE|PHASE_BATTLE_STEP,1)
			return
		end
		for tc in aux.Next(g) do
			local e1=Effect.CreateEffect(e:GetHandler())
			e1:SetType(EFFECT_TYPE_SINGLE)
			e1:SetCode(EFFECT_SET_ATTACK_FINAL)
			e1:SetValue(tc:GetAttack()/2)
			e1:SetReset(RESET_EVENT|RESETS_STANDARD|RESET_PHASE|PHASE_BATTLE)
			tc:RegisterEffect(e1)
		end
	end}
R.Act.destroy_battle_destroyer={cat=CATEGORY_DESTROY,
	check=function(e)
		local rc=e:GetHandler():GetReasonCard()
		return rc and rc:IsRelateToBattle()
	end,
	prep=function(e)
		local rc=e:GetHandler():GetReasonCard()
		if rc then Duel.SetOperationInfo(0,CATEGORY_DESTROY,rc,1,0,0) end
	end,
	op=function(e)
		local rc=e:GetHandler():GetReasonCard()
		if rc and rc:IsRelateToBattle() then Duel.Destroy(rc,REASON_EFFECT) end
	end}
R.Act.self_direct_attack_turn={cat=0,
	check=function(e)
		local c=e:GetHandler()
		return Duel.IsPhase(PHASE_MAIN1) and c:GetEffectCount(EFFECT_DIRECT_ATTACK)==0
	end,
	op=function(e)
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
		e1:SetType(EFFECT_TYPE_SINGLE)
		e1:SetCode(EFFECT_DIRECT_ATTACK)
		e1:SetReset(RESETS_STANDARD_PHASE_END)
		e:GetHandler():RegisterEffect(e1)
	end}
R.Act.no_attack_opp_next_turn={cat=0,
	op=function(e,tp)
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_FIELD)
		e1:SetCode(EFFECT_CANNOT_ATTACK)
		e1:SetTargetRange(0,LOCATION_MZONE)
		e1:SetReset(RESET_PHASE|PHASE_END,2)
		Duel.RegisterEffect(e1,tp)
	end}
R.Act.self_atk_permanent_dice={cat=CATEGORY_ATKCHANGE,
	check=function(e) return e:GetHandler():IsFaceup() end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p,m)
		local c=e:GetHandler()
		if not (c:IsRelateToEffect(e) and c:IsFaceup()) then return end
		local e1=Effect.CreateEffect(c)
		e1:SetType(EFFECT_TYPE_SINGLE)
		e1:SetCode(EFFECT_UPDATE_ATTACK)
		e1:SetValue((p.n or 0)*(m or 1))
		e1:SetReset(RESET_EVENT|RESETS_STANDARD)
		c:RegisterEffect(e1)
	end}
R.Act.decktop_battle_target={cat=CATEGORY_TODECK,
	check=function(e,tp,eg,ep,ev,re,r,rp,p)
		local c=e:GetHandler()
		local tc=c:GetBattleTarget()
		return c:IsRelateToBattle() and tc and tc:IsMonster() and tc:IsLocation(LOCATION_GRAVE)
			and tc:IsControler(1-tp) and (not p.faceup_attack or tc:IsPreviousPosition(POS_FACEUP_ATTACK))
	end,
	prep=function(e)
		local tc=e:GetHandler():GetBattleTarget()
		if tc then Duel.SetOperationInfo(0,CATEGORY_TODECK,tc,1,0,0) end
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local tc=e:GetHandler():GetBattleTarget()
		if tc and tc:IsRelateToBattle() and tc:IsLocation(LOCATION_GRAVE) then
			Duel.SendtoDeck(tc,nil,SEQ_DECKTOP,REASON_EFFECT)
		end
	end}
R.Act.double_base_atk_then_destroy_end_phase={cat=CATEGORY_ATKCHANGE+CATEGORY_DESTROY,
	check=function(e) return e:GetHandler():IsFaceup() end,
	op=function(e)
		local c=e:GetHandler()
		if not (c:IsFaceup() and c:IsRelateToEffect(e)) then return end
		local e1=Effect.CreateEffect(c)
		e1:SetType(EFFECT_TYPE_SINGLE)
		e1:SetCode(EFFECT_SET_ATTACK_FINAL)
		e1:SetValue(c:GetBaseAttack()*2)
		e1:SetReset(RESETS_STANDARD_DISABLE_PHASE_END)
		c:RegisterEffect(e1,true)
		local e2=Effect.CreateEffect(c)
		e2:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
		e2:SetCode(EVENT_PHASE|PHASE_END)
		e2:SetRange(LOCATION_MZONE)
		e2:SetCountLimit(1)
		e2:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
			if chk==0 then return true end
			Duel.SetOperationInfo(0,CATEGORY_DESTROY,se:GetHandler(),1,0,0)
		end)
		e2:SetOperation(function(se)
			local tc=se:GetHandler()
			if tc:IsRelateToEffect(se) then Duel.Destroy(tc,REASON_EFFECT) end
		end)
		e2:SetReset(RESETS_STANDARD_PHASE_END)
		c:RegisterEffect(e2)
	end}
R.Act.destroy_any_st=targeted({cat=CATEGORY_DESTROY,target=true,loc1=LOCATION_ONFIELD,loc2=LOCATION_ONFIELD,hint=HINTMSG_DESTROY,
	filter=Card.IsSpellTrap,op=function(e) local tc=Duel.GetFirstTarget() if relate(e,tc) then Duel.Destroy(tc,REASON_EFFECT) end end})
R.Act.destroy_up_to_two_st={cat=CATEGORY_DESTROY,target=true,
	filter=Card.IsSpellTrap,locs=function() return LOCATION_ONFIELD,LOCATION_ONFIELD end,
	prep=function(e,tp)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)
		local g=Duel.SelectTarget(tp,Card.IsSpellTrap,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,2,nil)
		Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,#g,0,0)
	end,
	op=function(e,tp)
		local g=Duel.GetTargetCards(e)
		if #g>0 then Duel.Destroy(g,REASON_EFFECT) end
	end}
R.Act.ss_filtered={cat=CATEGORY_SPECIAL_SUMMON,
	check=function(e,tp,eg,ep,ev,re,r,rp,p)
		local loc=real_ss_loc(p)
		return Duel.GetLocationCount(tp,LOCATION_MZONE)>0
			and (not p.no_monsters or Duel.GetFieldGroupCount(tp,LOCATION_MZONE,0)==0)
			and Duel.IsExistingMatchingCard(real_ss_filter,tp,loc,0,1,nil,e,tp,p)
	end,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p)
		local loc=real_ss_loc(p)
		Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,loc)
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		if Duel.GetLocationCount(tp,LOCATION_MZONE)<=0 or (p.no_monsters and Duel.GetFieldGroupCount(tp,LOCATION_MZONE,0)>0) then return end
		local loc=real_ss_loc(p)
		local g=Duel.SelectMatchingCard(tp,real_ss_filter,tp,loc,0,1,1,nil,e,tp,p)
		if #g>0 and Duel.SpecialSummon(g,0,tp,tp,false,false,p.position=='attack' and POS_FACEUP_ATTACK or POS_FACEUP)>0 and p.no_attack then
			local tc=g:GetFirst()
			while tc do
				local e1=Effect.CreateEffect(e:GetHandler())
				e1:SetType(EFFECT_TYPE_SINGLE) e1:SetCode(EFFECT_CANNOT_ATTACK) e1:SetReset(RESETS_STANDARD_PHASE_END)
				tc:RegisterEffect(e1)
				tc=g:GetNext()
			end
		end
	end}
R.Act.return_high_level_draw={cat=CATEGORY_TODECK+CATEGORY_DRAW,
	check=function(e,tp)
		return Duel.IsPlayerCanDraw(tp) and Duel.IsExistingMatchingCard(function(c)
			return c:IsLevelAbove(7) and c:IsAbleToDeck()
		end,tp,LOCATION_HAND,0,1,nil)
	end,
	prep=function(e,tp)
		Duel.SetOperationInfo(0,CATEGORY_TODECK,nil,1,tp,LOCATION_HAND)
		Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,1,tp,0)
	end,
	op=function(e,tp)
		if not e:GetHandler():IsRelateToEffect(e) or not Duel.IsPlayerCanDraw(tp) then return end
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TODECK)
		local g=Duel.SelectMatchingCard(tp,function(c) return c:IsLevelAbove(7) and c:IsAbleToDeck() end,
			tp,LOCATION_HAND,0,1,1,nil)
		if #g>0 then
			Duel.ConfirmCards(1-tp,g)
			Duel.SendtoDeck(g,nil,SEQ_DECKTOP,REASON_EFFECT)
			Duel.ShuffleDeck(tp)
			Duel.BreakEffect()
			Duel.Draw(tp,1,REASON_EFFECT)
		end
	end}
R.Act.shuffle_either_deck={cat=0,
	check=function(e) return e:GetHandler():IsRelateToEffect(e) end,
	op=function(e,tp)
		if not e:GetHandler():IsRelateToEffect(e) then return end
		if Duel.SelectOption(tp,0,1)==0 then Duel.ShuffleDeck(tp) else Duel.ShuffleDeck(1-tp) end
	end}
R.Act.shuffle_own_deck={cat=0,op=function(e,tp) Duel.ShuffleDeck(tp) end}
R.Act.damage_turn_player={cat=CATEGORY_DAMAGE,
	prep=function(e,tp) Duel.SetTargetPlayer(Duel.GetTurnPlayer()) end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		Duel.Damage(Duel.GetTurnPlayer(),p.n,REASON_EFFECT)
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
R.Act.ss_up_to_n_filtered={cat=CATEGORY_SPECIAL_SUMMON,
	check=function(e,tp,eg,ep,ev,re,r,rp,p)
		local loc=real_ss_loc(p)
		return Duel.GetLocationCount(tp,LOCATION_MZONE)>0
			and Duel.IsExistingMatchingCard(real_ss_filter,tp,loc,0,1,nil,e,tp,p)
	end,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p)
		Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,0,tp,real_ss_loc(p))
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local max=math.min(p.n,Duel.GetLocationCount(tp,LOCATION_MZONE))
		if Duel.IsPlayerAffectedByEffect(tp,CARD_BLUEEYES_SPIRIT) then max=math.min(max,1) end
		if max<=0 then return end
		local g=Duel.SelectMatchingCard(tp,real_ss_filter,tp,real_ss_loc(p),0,1,max,nil,e,tp,p)
		if #g>0 then
			local pos=p.position=='attack' and POS_FACEUP_ATTACK or (p.position=='defense' and POS_FACEUP_DEFENSE or (p.position=='facedown' and POS_FACEDOWN_DEFENSE or POS_FACEUP))
			Duel.SpecialSummon(g,0,tp,tp,false,false,pos)
		end
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
local function real_return_equip_filter(c,e,tp,p)
	return real_sel(c,p) and c:IsType(TYPE_EQUIP) and c:IsAbleToHand()
end
R.Act.return_equip_no_activate={cat=CATEGORY_TOHAND+CATEGORY_SEARCH,target=true,locs=real_locs,
	filter=real_return_equip_filter,
	check=function(e,tp,eg,ep,ev,re,r,rp,p)
		local l1,l2=real_locs(p)
		return Duel.IsExistingTarget(real_return_equip_filter,tp,l1,l2,1,nil,e,tp,p)
	end,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p)
		local l1,l2=real_locs(p)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
		local g=Duel.SelectTarget(tp,real_return_equip_filter,tp,l1,l2,1,1,nil,e,tp,p)
		Duel.SetOperationInfo(0,CATEGORY_TOHAND,g,1,0,0)
	end,
	op=function(e,tp)
		local tc=Duel.GetFirstTarget()
		if tc and relate(e,tc) and Duel.SendtoHand(tc,nil,REASON_EFFECT)>0 then
			Duel.ConfirmCards(1-tp,tc)
			local ce=Effect.CreateEffect(e:GetHandler())
			ce:SetType(EFFECT_TYPE_SINGLE)
			ce:SetCode(EFFECT_CANNOT_TRIGGER)
			ce:SetReset(RESET_EVENT|RESETS_STANDARD-RESET_TOFIELD|RESET_PHASE|PHASE_END)
			tc:RegisterEffect(ce)
		end
	end}
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
R.Act.acid_trap_hole={cat=CATEGORY_POSITION+CATEGORY_DESTROY,target=true,
	loc1=LOCATION_MZONE,loc2=LOCATION_MZONE,hint=HINTMSG_FACEUP,
	filter=function(c) return c:IsFacedown() end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local tc=Duel.GetFirstTarget()
		if not (relate(e,tc) and tc:IsFacedown()) then return end
		if Duel.ChangePosition(tc,POS_FACEUP_DEFENSE)==0 then return end
		if tc:IsDefenseBelow(2000) then
			Duel.BreakEffect()
			Duel.Destroy(tc,REASON_EFFECT)
		else
			Duel.ConfirmCards(1-tc:GetControler(),tc)
			Duel.ChangePosition(tc,POS_FACEDOWN_DEFENSE)
		end
	end}
R.Act.banish_all_monsters_deck_gy={cat=CATEGORY_REMOVE,
	check=function(e,tp)
		return Duel.IsExistingMatchingCard(function(c) return c:IsMonster() and c:IsAbleToRemove() end,
			tp,LOCATION_DECK|LOCATION_GRAVE,LOCATION_DECK|LOCATION_GRAVE,1,nil)
	end,
	prep=function(e,tp)
		local g=Duel.GetMatchingGroup(function(c) return c:IsMonster() and c:IsAbleToRemove() end,
			tp,LOCATION_DECK|LOCATION_GRAVE,LOCATION_DECK|LOCATION_GRAVE,nil)
		Duel.SetOperationInfo(0,CATEGORY_REMOVE,g,#g,0,0)
	end,
	op=function(e,tp)
		local g=Duel.GetMatchingGroup(function(c) return c:IsMonster() and c:IsAbleToRemove() end,
			tp,LOCATION_DECK|LOCATION_GRAVE,LOCATION_DECK|LOCATION_GRAVE,nil)
		Duel.Remove(g,POS_FACEUP,REASON_EFFECT)
	end}
R.Act.set_target_def_to_total_original_def={cat=CATEGORY_DEFCHANGE,target=true,
	loc1=LOCATION_MZONE,loc2=0,hint=HINTMSG_FACEUP,
	filter=function(c) return c:IsFaceup() end,
	op=function(e,tp)
		local tc=Duel.GetFirstTarget()
		if not (relate(e,tc) and tc:IsFaceup()) then return end
		local g=Duel.GetMatchingGroup(Card.IsFaceup,tp,LOCATION_MZONE,0,nil)
		local total=0
		for sc in aux.Next(g) do total=total+sc:GetBaseDefense() end
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_SINGLE)
		e1:SetCode(EFFECT_SET_DEFENSE)
		e1:SetValue(total)
		e1:SetReset(RESETS_STANDARD_PHASE_END)
		tc:RegisterEffect(e1)
	end}
R.Act.riryoku={cat=CATEGORY_ATKCHANGE,target=true,loc1=LOCATION_MZONE,loc2=LOCATION_MZONE,
	filter=function(c) return c:IsFaceup() end,
	check=function(e,tp) return Duel.IsExistingTarget(Card.IsFaceup,tp,LOCATION_MZONE,LOCATION_MZONE,2,e:GetHandler()) end,
	prep=function(e,tp)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATKDEF)
		local g=Duel.SelectTarget(tp,Card.IsFaceup,tp,LOCATION_MZONE,LOCATION_MZONE,2,2,e:GetHandler())
		Duel.SetOperationInfo(0,CATEGORY_ATKCHANGE,g,#g,tp,0)
	end,
	op=function(e,tp)
		local g=Duel.GetTargetCards(e):Filter(Card.IsFaceup,nil)
		if #g==0 then return end
		local halfc=g:GetFirst()
		if #g>1 then halfc=g:Select(tp,1,1,nil):GetFirst() end
		if not halfc then return end
		g:RemoveCard(halfc)
		local atk=halfc:GetAttack()
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_SINGLE) e1:SetCode(EFFECT_SET_ATTACK_FINAL)
		e1:SetReset(RESETS_STANDARD_PHASE_END) e1:SetValue(atk/2)
		halfc:RegisterEffect(e1)
		if not halfc:IsImmuneToEffect(e1) and #g>0 then
			local e2=Effect.CreateEffect(e:GetHandler())
			e2:SetType(EFFECT_TYPE_SINGLE) e2:SetCode(EFFECT_UPDATE_ATTACK)
			e2:SetReset(RESETS_STANDARD_PHASE_END) e2:SetValue(atk/2)
			g:GetFirst():RegisterEffect(e2)
		end
	end}
R.Act.destroy_current_attacker={cat=CATEGORY_DESTROY,target=true,loc1=0,loc2=LOCATION_MZONE,
	filter=function(c) return c==Duel.GetAttacker() end,
	check=function(e) return Duel.GetAttacker()~=nil end,
	prep=function(e,tp)
		local attacker=Duel.GetAttacker()
		Duel.SetTargetCard(attacker)
		Duel.SetOperationInfo(0,CATEGORY_DESTROY,attacker,1,0,0)
	end,
	op=function(e)
		local attacker=Duel.GetFirstTarget()
		if attacker and attacker:IsRelateToEffect(e) then Duel.Destroy(attacker,REASON_EFFECT) end
	end}
R.Act.dimension_jar={cat=CATEGORY_REMOVE,op=function(e,tp)
		local g=Group.CreateGroup()
		for _,player in ipairs({Duel.GetTurnPlayer(),1-Duel.GetTurnPlayer()}) do
			local opponent=1-player
			local filter=function(c,p) return c:IsMonster() and aux.SpElimFilter(c) and c:IsAbleToRemove(p) end
			if Duel.IsExistingMatchingCard(filter,player,0,LOCATION_GRAVE,1,nil,player) and Duel.SelectYesNo(player,aux.Stringid(e:GetHandler():GetOriginalCode(),1)) then
				Duel.Hint(HINT_SELECTMSG,player,HINTMSG_REMOVE)
				local rg=Duel.SelectMatchingCard(player,filter,player,0,LOCATION_GRAVE,1,3,nil,player)
				Duel.HintSelection(rg,true)
				g:Merge(rg)
			end
		end
		Duel.Remove(g,POS_FACEUP,REASON_EFFECT)
	end}
R.Act.lock_positions_turn={cat=0,op=function(e,tp)
		local lock=Effect.CreateEffect(e:GetHandler())
		lock:SetType(EFFECT_TYPE_FIELD)
		lock:SetCode(EFFECT_CANNOT_CHANGE_POSITION)
		lock:SetProperty(EFFECT_FLAG_SET_AVAILABLE)
		lock:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
		lock:SetReset(RESET_PHASE|PHASE_END)
		Duel.RegisterEffect(lock,tp)
	end}
R.Act.ss_self_banished_dino_boost={cat=CATEGORY_SPECIAL_SUMMON+CATEGORY_ATKCHANGE,
	check=function(e,tp)
		local c=e:GetHandler()
		return Duel.GetLocationCount(tp,LOCATION_MZONE)>0 and c:IsCanBeSpecialSummoned(e,0,tp,false,false)
	end,
	prep=function(e,tp)
		Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,e:GetHandler(),1,0,0)
	end,
	op=function(e,tp)
		local c=e:GetHandler()
		if not c:IsRelateToEffect(e) or Duel.GetLocationCount(tp,LOCATION_MZONE)<=0
			or not Duel.SpecialSummonStep(c,0,tp,tp,false,false,POS_FACEUP) then return end
		local g=Duel.GetMatchingGroup(aux.FaceupFilter(Card.IsRace,RACE_DINOSAUR),tp,LOCATION_REMOVED,0,nil)
		if #g>0 then
			local boost=Effect.CreateEffect(c)
			boost:SetType(EFFECT_TYPE_SINGLE)
			boost:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
			boost:SetRange(LOCATION_MZONE)
			boost:SetCode(EFFECT_UPDATE_ATTACK)
			boost:SetValue(#g*200)
			boost:SetReset(RESET_EVENT|RESETS_STANDARD_DISABLE)
			c:RegisterEffect(boost)
		end
		Duel.SpecialSummonComplete()
	end}
R.Act.spear_cretin_revive_both={cat=CATEGORY_SPECIAL_SUMMON,target=true,
	loc1=LOCATION_GRAVE,loc2=0,
	filter=function(c,e,tp) return c:IsMonster() and c:IsCanBeSpecialSummoned(e,0,tp,false,false,POS_FACEUP_ATTACK|POS_FACEDOWN_DEFENSE) end,
	check=function(e,tp)
		local f=function(c,te,player) return c:IsMonster() and c:IsCanBeSpecialSummoned(te,0,player,false,false,POS_FACEUP_ATTACK|POS_FACEDOWN_DEFENSE) end
		return Duel.IsExistingTarget(f,tp,LOCATION_GRAVE,0,1,e:GetHandler(),e,tp)
			or Duel.IsExistingTarget(f,1-tp,LOCATION_GRAVE,0,1,e:GetHandler(),e,1-tp)
	end,
	prep=function(e,tp)
		local function f(c,te,player) return c:IsMonster() and c:IsCanBeSpecialSummoned(te,0,player,false,false,POS_FACEUP_ATTACK|POS_FACEDOWN_DEFENSE) end
		local g=Group.CreateGroup()
		for _,player in ipairs({tp,1-tp}) do
			if Duel.IsExistingTarget(f,player,LOCATION_GRAVE,0,1,e:GetHandler(),e,player) then
				Duel.Hint(HINT_SELECTMSG,player,HINTMSG_SPSUMMON)
				g:Merge(Duel.SelectTarget(player,f,player,LOCATION_GRAVE,0,1,1,e:GetHandler(),e,player))
			end
		end
		Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,g,#g,0,0)
	end,
	op=function(e)
		local g=Duel.GetTargetCards(e)
		for tc in aux.Next(g) do
			local player=tc:GetControler()
			if Duel.GetLocationCount(player,LOCATION_MZONE)>0 then
				Duel.SpecialSummonStep(tc,0,player,player,false,false,POS_FACEUP_ATTACK|POS_FACEDOWN_DEFENSE)
			end
		end
		Duel.SpecialSummonComplete()
	end}
R.Act.familiar_knight_summon={cat=CATEGORY_SPECIAL_SUMMON,
	prep=function(e,tp)
		Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_HAND)
	end,
	op=function(e,tp)
		local function summon_for(player)
			local filter=function(c,te,p) return c:GetLevel()==4 and c:IsCanBeSpecialSummoned(te,0,p,false,false) end
			if Duel.GetLocationCount(player,LOCATION_MZONE)>0
				and Duel.IsExistingMatchingCard(filter,player,LOCATION_HAND,0,1,nil,e,player)
				and Duel.SelectYesNo(player,aux.Stringid(e:GetHandler():GetOriginalCode(),1)) then
				Duel.Hint(HINT_SELECTMSG,player,HINTMSG_SPSUMMON)
				local g=Duel.SelectMatchingCard(player,filter,player,LOCATION_HAND,0,1,1,nil,e,player)
				if #g>0 then Duel.SpecialSummonStep(g:GetFirst(),0,player,player,false,false,POS_FACEUP) end
			end
		end
		summon_for(tp)
		summon_for(1-tp)
		Duel.SpecialSummonComplete()
	end}
R.Act.draw_then_bottomdeck_one={cat=CATEGORY_DRAW+CATEGORY_TODECK,
	prep=function(e,tp)
		Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,tp,1)
	end,
	op=function(e,tp)
		if Duel.Draw(tp,1,REASON_EFFECT)<=0 then return end
		Duel.ShuffleHand(tp)
		if Duel.GetFieldGroupCount(tp,LOCATION_HAND,0)==0 then return end
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TODECK)
		local g=Duel.SelectMatchingCard(tp,nil,tp,LOCATION_HAND,0,1,1,nil)
		if #g>0 then
			Duel.BreakEffect()
			Duel.SendtoDeck(g,nil,SEQ_DECKBOTTOM,REASON_EFFECT)
		end
	end}
R.Act.mysterious_guard={cat=CATEGORY_TODECK+CATEGORY_TOHAND,target=true,
	loc1=LOCATION_MZONE,loc2=LOCATION_MZONE,
	filter=function(c,e) return c:IsFaceup() and c:IsCanBeEffectTarget(e) and (c:IsAbleToDeck() or c:IsAbleToHand()) end,
	check=function() return true end,
	prep=function(e,tp)
		local g=Duel.GetMatchingGroup(function(c,te) return c:IsFaceup() and c:IsCanBeEffectTarget(te) and (c:IsAbleToDeck() or c:IsAbleToHand()) end,
			tp,LOCATION_MZONE,LOCATION_MZONE,nil,e)
		local can_deck=g:IsExists(Card.IsAbleToDeck,1,nil)
		local has_warrior=Duel.IsExistingMatchingCard(aux.FaceupFilter(Card.IsRace,RACE_WARRIOR),tp,LOCATION_MZONE,0,1,nil)
		local can_pair=has_warrior and g:FilterCount(Card.IsAbleToDeck,nil)>0
			and g:FilterCount(Card.IsAbleToHand,nil)>1
		if not can_deck then e:SetLabel(0) return end
		local choice=1
		if can_pair then choice=Duel.SelectOption(tp,aux.Stringid(e:GetHandler():GetOriginalCode(),1),aux.Stringid(e:GetHandler():GetOriginalCode(),2))+1 end
		e:SetLabel(choice)
		if choice==1 then
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TODECK)
			local tg=Duel.SelectTarget(tp,function(c,te) return c:IsFaceup() and c:IsCanBeEffectTarget(te) and c:IsAbleToDeck() end,
				tp,LOCATION_MZONE,LOCATION_MZONE,1,1,nil,e)
			Duel.SetOperationInfo(0,CATEGORY_TODECK,tg,1,0,0)
		else
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TARGET)
			local first=Duel.SelectTarget(tp,function(c,te) return c:IsFaceup() and c:IsCanBeEffectTarget(te) and c:IsAbleToDeck() end,
				tp,LOCATION_MZONE,LOCATION_MZONE,1,1,nil,e)
			local second=Duel.SelectTarget(tp,function(c,te,exclude) return c~=exclude and c:IsFaceup() and c:IsCanBeEffectTarget(te) and c:IsAbleToHand() end,
				tp,LOCATION_MZONE,LOCATION_MZONE,1,1,first:GetFirst(),e,first:GetFirst())
			first:Merge(second)
			Duel.SetOperationInfo(0,CATEGORY_TODECK,first,1,0,0)
			Duel.SetOperationInfo(0,CATEGORY_TOHAND,first,1,0,0)
		end
	end,
	op=function(e,tp)
		local choice=e:GetLabel()
		local tg=Duel.GetTargetCards(e):Filter(Card.IsFaceup,nil)
		if choice==1 then
			local tc=tg:GetFirst()
			if tc and tc:IsRelateToEffect(e) then Duel.SendtoDeck(tc,nil,SEQ_DECKTOP,REASON_EFFECT) end
		elseif choice==2 and #tg>0 then
			local dc=tg:GetFirst()
			if #tg>1 then
				Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TODECK)
				dc=tg:FilterSelect(tp,function(c,group) return c:IsAbleToDeck() and group:IsExists(Card.IsAbleToHand,1,c) end,1,1,nil,tg):GetFirst()
			end
			if not dc then return end
			tg:RemoveCard(dc)
			if Duel.SendtoDeck(dc,nil,SEQ_DECKTOP,REASON_EFFECT)>0 and dc:IsLocation(LOCATION_DECK) and #tg>0
				and Duel.IsExistingMatchingCard(aux.FaceupFilter(Card.IsRace,RACE_WARRIOR),tp,LOCATION_MZONE,0,1,nil) then
				Duel.BreakEffect()
				Duel.SendtoHand(tg,nil,REASON_EFFECT)
			end
		end
	end}
R.Act.swap_target_base_atk_def={cat=CATEGORY_ATKCHANGE+CATEGORY_DEFCHANGE,target=true,
	loc1=LOCATION_MZONE,loc2=LOCATION_MZONE,hint=HINTMSG_FACEUP,
	filter=function(c) return c:IsFaceup() and c:IsAttribute(ATTRIBUTE_EARTH) end,
	check=function(e,tp) return Duel.IsExistingTarget(function(c) return c:IsFaceup() and c:IsAttribute(ATTRIBUTE_EARTH) end,
		tp,LOCATION_MZONE,LOCATION_MZONE,1,e:GetHandler()) end,
	prep=function(e,tp)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_FACEUP)
		local g=Duel.SelectTarget(tp,function(c) return c:IsFaceup() and c:IsAttribute(ATTRIBUTE_EARTH) end,
			tp,LOCATION_MZONE,LOCATION_MZONE,1,1,e:GetHandler())
		Duel.SetOperationInfo(0,CATEGORY_ATKCHANGE,g,1,0,0)
	end,
	op=function(e)
		local tc=Duel.GetFirstTarget()
		if not (relate(e,tc) and tc:IsFaceup()) then return end
		local swap=Effect.CreateEffect(e:GetHandler())
		swap:SetType(EFFECT_TYPE_SINGLE)
		swap:SetCode(EFFECT_SWAP_BASE_AD)
		swap:SetReset(RESETS_STANDARD_PHASE_END)
		tc:RegisterEffect(swap)
	end}
R.Act.equip_spell_from_gy={cat=CATEGORY_EQUIP,target=true,loc1=LOCATION_GRAVE,loc2=0,
	filter=function(ec,e) return ec:IsType(TYPE_EQUIP) and ec:CheckEquipTarget(e:GetHandler()) end,
	check=function(e,tp)
		local filter=function(ec,te) return ec:IsType(TYPE_EQUIP) and ec:CheckEquipTarget(te:GetHandler()) end
		return Duel.GetLocationCount(tp,LOCATION_SZONE)>0 and Duel.IsExistingTarget(filter,tp,LOCATION_GRAVE,0,1,nil,e)
	end,
	prep=function(e,tp)
		local filter=function(ec,te) return ec:IsType(TYPE_EQUIP) and ec:CheckEquipTarget(te:GetHandler()) end
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_EQUIP)
		local g=Duel.SelectTarget(tp,filter,tp,LOCATION_GRAVE,0,1,1,nil,e)
		Duel.SetOperationInfo(0,CATEGORY_LEAVE_GRAVE,g,1,0,0)
		Duel.SetOperationInfo(0,CATEGORY_EQUIP,g,1,0,0)
	end,
	op=function(e,tp)
		local tc=Duel.GetFirstTarget()
		if tc and tc:IsRelateToEffect(e) then Duel.Equip(tp,tc,e:GetHandler()) end
	end}
R.Act.opp_choose_spell_deck_gy={cat=CATEGORY_TOGRAVE,
	check=function(e,tp) return Duel.IsExistingMatchingCard(function(c) return c:IsSpell() and c:IsAbleToGrave() end,tp,0,LOCATION_DECK,1,nil) end,
	prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_TOGRAVE,nil,1,1-tp,LOCATION_DECK) end,
	op=function(e,tp)
		local opponent=1-tp
		local filter=function(c) return c:IsSpell() and c:IsAbleToGrave() end
		if not Duel.IsExistingMatchingCard(filter,opponent,LOCATION_DECK,0,1,nil) then return end
		Duel.Hint(HINT_SELECTMSG,opponent,HINTMSG_TOGRAVE)
		local g=Duel.SelectMatchingCard(opponent,filter,opponent,LOCATION_DECK,0,1,1,nil)
		if #g>0 then Duel.SendtoGrave(g,REASON_EFFECT) end
	end}
R.Act.pixie_knight_spell_topdeck={cat=CATEGORY_TODECK,target=true,loc1=LOCATION_GRAVE,loc2=0,
	filter=function(c) return c:IsSpell() and c:IsAbleToDeck() end,
	check=function(e,tp) return Duel.IsExistingMatchingCard(function(c) return c:IsSpell() and c:IsAbleToDeck() end,tp,LOCATION_GRAVE,0,1,nil) end,
	prep=function(e,tp)
		local filter=function(c) return c:IsSpell() and c:IsAbleToDeck() end
		Duel.Hint(HINT_SELECTMSG,1-tp,HINTMSG_TODECK)
		local g=Duel.SelectTarget(1-tp,filter,tp,LOCATION_GRAVE,0,1,1,nil)
		Duel.SetOperationInfo(0,CATEGORY_TODECK,g,#g,0,0)
	end,
	op=function(e)
		local tc=Duel.GetFirstTarget()
		if tc and tc:IsRelateToEffect(e) then Duel.SendtoDeck(tc,nil,SEQ_DECKTOP,REASON_EFFECT) end
	end}
R.Act.otohime_change_position={cat=CATEGORY_POSITION,target=true,damage_step=true,loc1=0,loc2=LOCATION_MZONE,
	filter=function(c) return c:IsFaceup() and c:IsCanChangePosition() end,
	check=function(e,tp) return Duel.IsExistingTarget(function(c) return c:IsFaceup() and c:IsCanChangePosition() end,tp,0,LOCATION_MZONE,1,nil) end,
	prep=function(e,tp)
		local filter=function(c) return c:IsFaceup() and c:IsCanChangePosition() end
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_POSCHANGE)
		local g=Duel.SelectTarget(tp,filter,tp,0,LOCATION_MZONE,1,1,nil)
		Duel.SetOperationInfo(0,CATEGORY_POSITION,g,1,0,0)
	end,
	op=function(e,tp)
		local tc=Duel.GetFirstTarget()
		if tc and tc:IsFaceup() and tc:IsControler(1-tp) and tc:IsRelateToEffect(e) then
			Duel.ChangePosition(tc,POS_FACEUP_DEFENSE,0,POS_FACEUP_ATTACK,0)
		end
	end}
R.Act.dark_sleep_lock_target={cat=0,target=true,loc1=0,loc2=LOCATION_MZONE,
	filter=function(c) return c:IsMonster() end,
	check=function(e,tp) return Duel.IsExistingTarget(Card.IsMonster,tp,0,LOCATION_MZONE,1,nil) end,
	prep=function(e,tp)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TARGET)
		local g=Duel.SelectTarget(tp,Card.IsMonster,tp,0,LOCATION_MZONE,1,1,nil)
		Duel.SetOperationInfo(0,CATEGORY_DISABLE,g,1,0,0)
	end,
	op=function(e,tp)
		local c=e:GetHandler()
		local tc=Duel.GetFirstTarget()
		if not (c:IsRelateToEffect(e) and c:IsFaceup() and tc and tc:IsRelateToEffect(e) and not tc:IsImmuneToEffect(e)) then return end
		c:SetCardTarget(tc)
		local e1=Effect.CreateEffect(c)
		e1:SetType(EFFECT_TYPE_SINGLE)
		e1:SetCode(EFFECT_CANNOT_ATTACK)
		e1:SetCondition(function(se) return se:GetOwner():IsHasCardTarget(se:GetHandler()) end)
		e1:SetReset(RESET_EVENT|RESETS_STANDARD)
		tc:RegisterEffect(e1)
	end}
local function real_banish_opp_gy_monster_filter(c,e,tp)
	return c:IsMonster() and aux.SpElimFilter(c) and c:IsAbleToRemove() and c:IsCanBeEffectTarget(e)
end
R.Act.banish_opp_gy_monsters={cat=CATEGORY_REMOVE,target=true,
	filter=function(c,e,tp,p) return real_banish_opp_gy_monster_filter(c,e,tp) end,
	locs=real_locs,
	check=function(e,tp,eg,ep,ev,re,r,rp,p)
		local l1,l2=real_locs(p)
		return Duel.IsExistingTarget(function(c,te,player) return real_banish_opp_gy_monster_filter(c,te,player) end,
			tp,l1,l2,1,nil,e,tp)
	end,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p)
		local l1,l2=real_locs(p)
		local n=p.n or 2
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)
		local g=Duel.SelectTarget(tp,function(c,te,player) return real_banish_opp_gy_monster_filter(c,te,player) end,
			tp,l1,l2,p.up_to and 1 or n,n,nil,e,tp)
		Duel.SetOperationInfo(0,CATEGORY_REMOVE,g,#g,0,0)
	end,
	op=function(e,tp)
		local g=Duel.GetTargetCards(e):Filter(Card.IsRelateToEffect,nil,e)
		if #g>0 then Duel.Remove(g,POS_FACEUP,REASON_EFFECT) end
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
		local ct=1
		if p.until_next_own_end then
			if Duel.IsTurnPlayer(1-tp) then ct=2
			elseif Duel.IsPhase(PHASE_END) then ct=3 end
		end
		for tc in aux.Next(g) do Duel.GetControl(tc,tp,PHASE_END,ct) end
	end}
R.Act.mind_control={cat=CATEGORY_CONTROL,target=true,filter=real_control_filter,locs=real_locs,
	check=function(e,tp,eg,ep,ev,re,r,rp,p)
		local l1,l2=real_locs(p)
		return Duel.IsExistingTarget(real_control_filter,tp,l1,l2,1,e:GetHandler(),e,tp,p)
	end,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p)
		local l1,l2=real_locs(p)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_CONTROL)
		local g=Duel.SelectTarget(tp,real_control_filter,tp,l1,l2,1,1,e:GetHandler(),e,tp,p)
		Duel.SetOperationInfo(0,CATEGORY_CONTROL,g,1,0,0)
	end,
	op=function(e,tp)
		local tc=Duel.GetFirstTarget()
		if not tc or not relate(e,tc) then return end
		if Duel.GetControl(tc,tp,PHASE_END)>0 then
			for _,code in ipairs({EFFECT_CANNOT_ATTACK,EFFECT_UNRELEASABLE_SUM,EFFECT_UNRELEASABLE_NONSUM}) do
				local ce=Effect.CreateEffect(e:GetHandler())
				ce:SetType(EFFECT_TYPE_SINGLE)
				ce:SetCode(code)
				ce:SetReset(RESETS_STANDARD_PHASE_END)
				tc:RegisterEffect(ce)
			end
		end
	end}
R.Act.shallow_grave={cat=CATEGORY_SPECIAL_SUMMON,target=true,
	check=function(e,tp)
		local function can_summon(pl)
			return Duel.GetLocationCount(pl,LOCATION_MZONE)>0 and Duel.IsExistingMatchingCard(function(tc)
				return tc:IsMonster() and tc:IsCanBeSpecialSummoned(e,0,pl,false,false,POS_FACEDOWN_DEFENSE)
			end,pl,LOCATION_GRAVE,0,1,nil)
		end
		return can_summon(tp) and can_summon(1-tp)
	end,
	prep=function(e,tp)
		local function filter(tc,pl)
			return tc:IsMonster() and tc:IsCanBeSpecialSummoned(e,0,pl,false,false,POS_FACEDOWN_DEFENSE)
		end
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
		local g1=Duel.SelectTarget(tp,function(tc) return filter(tc,tp) end,tp,LOCATION_GRAVE,0,1,1,nil)
		Duel.Hint(HINT_SELECTMSG,1-tp,HINTMSG_SPSUMMON)
		local g2=Duel.SelectTarget(1-tp,function(tc) return filter(tc,1-tp) end,1-tp,LOCATION_GRAVE,0,1,1,nil)
		Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,g1,1,tp,LOCATION_GRAVE)
		Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,g2,1,1-tp,LOCATION_GRAVE)
	end,
	op=function(e,tp)
		local g=Duel.GetTargetCards(e)
		for pl=tp,1-tp,-1 do
			local sg=g:Filter(function(tc,player) return tc:IsControler(player) and tc:IsRelateToEffect(e) end,nil,pl)
			if #sg>0 and Duel.GetLocationCount(pl,LOCATION_MZONE)>0 then
				Duel.SpecialSummon(sg,0,pl,pl,false,false,POS_FACEDOWN_DEFENSE)
			end
		end
	end}
R.Act.graceful_dice={cat=CATEGORY_ATKCHANGE,
	check=function() return true end,
	op=function(e,tp)
		local result=Duel.TossDice(tp,1)
		local g=Duel.GetMatchingGroup(aux.TRUE,tp,LOCATION_MZONE,0,nil)
		for tc in aux.Next(g) do
			for _,code in ipairs({EFFECT_UPDATE_ATTACK,EFFECT_UPDATE_DEFENSE}) do
				local se=Effect.CreateEffect(e:GetHandler())
				se:SetType(EFFECT_TYPE_SINGLE)
				se:SetCode(code)
				se:SetValue(result*100)
				se:SetReset(RESETS_STANDARD_PHASE_END)
				tc:RegisterEffect(se)
			end
		end
	end}
R.Act.summon_wall_shadow={cat=CATEGORY_SPECIAL_SUMMON,
	check=function(e,tp)
		local c=e:GetHandler()
		local tc=c:GetEquipTarget()
		local ft=Duel.GetLocationCount(tp,LOCATION_MZONE)
		if tc and tc:GetSequence()<5 then ft=ft+1 end
		return ft>0 and Duel.IsExistingMatchingCard(function(sc,se,player)
			return sc:IsCode(63162310) and sc:IsCanBeSpecialSummoned(se,0,player,true,true)
		end,tp,LOCATION_DECK,0,1,nil,e,tp)
	end,
	prep=function(e,tp)
		Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_DECK)
	end,
	op=function(e,tp)
		if Duel.GetLocationCount(tp,LOCATION_MZONE)<=0 then return end
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
		local g=Duel.SelectMatchingCard(tp,function(sc,se,player)
			return sc:IsCode(63162310) and sc:IsCanBeSpecialSummoned(se,0,player,true,true)
		end,tp,LOCATION_DECK,0,1,1,nil,e,tp)
		if #g>0 and Duel.SpecialSummon(g,0,tp,tp,true,true,POS_FACEUP_ATTACK)>0 then g:GetFirst():CompleteProcedure() end
	end}
R.Act.fengsheng_mirror={cat=CATEGORY_HANDES,player_target=true,
	check=function() return true end,
	prep=function(e,tp) Duel.SetTargetPlayer(tp) end,
	op=function(e,tp)
		local pl=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER)
		local g=Duel.GetFieldGroup(pl,0,LOCATION_HAND)
		if #g==0 then return end
		Duel.ConfirmCards(pl,g)
		local sg=g:Filter(Card.IsType,nil,TYPE_SPIRIT)
		if #sg>0 then
			Duel.Hint(HINT_SELECTMSG,pl,HINTMSG_TOGRAVE)
			Duel.SendtoGrave(sg:Select(pl,1,1,nil),REASON_DISCARD|REASON_EFFECT)
		end
		Duel.ShuffleHand(1-pl)
	end}
R.Act.delta_attacker={cat=0,
	check=function(e,tp)
		local function filter(c,player)
			return c:IsFaceup() and c:IsType(TYPE_NORMAL) and not c:IsType(TYPE_TOKEN)
				and Duel.IsExistingMatchingCard(function(tc,code)
					return tc:IsFaceup() and tc:IsType(TYPE_NORMAL) and not tc:IsType(TYPE_TOKEN) and tc:IsCode(code)
				end,player,LOCATION_MZONE,0,2,c,c:GetCode())
		end
		return Duel.IsExistingMatchingCard(filter,tp,LOCATION_MZONE,0,3,nil,tp)
	end,
	op=function(e,tp)
		local function filter(c,player)
			return c:IsFaceup() and c:IsType(TYPE_NORMAL) and not c:IsType(TYPE_TOKEN)
				and Duel.IsExistingMatchingCard(function(tc,code)
					return tc:IsFaceup() and tc:IsType(TYPE_NORMAL) and not tc:IsType(TYPE_TOKEN) and tc:IsCode(code)
				end,player,LOCATION_MZONE,0,2,c,c:GetCode())
		end
		local g=Duel.GetMatchingGroup(filter,tp,LOCATION_MZONE,0,nil,tp)
		for tc in aux.Next(g) do
			local se=Effect.CreateEffect(e:GetHandler())
			se:SetType(EFFECT_TYPE_SINGLE)
			se:SetCode(EFFECT_DIRECT_ATTACK)
			se:SetReset(RESETS_STANDARD_PHASE_END)
			tc:RegisterEffect(se)
		end
	end}
R.Act.mystic_box={cat=CATEGORY_DESTROY+CATEGORY_CONTROL,target=true,
	check=function(e,tp)
		return Duel.IsExistingTarget(function(tc,player)
			return Duel.GetMZoneCount(player,tc,player,LOCATION_REASON_CONTROL)>0
		end,tp,0,LOCATION_MZONE,1,nil,1-tp)
			and Duel.IsExistingTarget(Card.IsAbleToChangeControler,tp,LOCATION_MZONE,0,1,nil)
	end,
	prep=function(e,tp)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)
		local g1=Duel.SelectTarget(tp,function(tc,player)
			return Duel.GetMZoneCount(player,tc,player,LOCATION_REASON_CONTROL)>0
		end,tp,0,LOCATION_MZONE,1,1,nil,1-tp)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_CONTROL)
		local g2=Duel.SelectTarget(tp,Card.IsAbleToChangeControler,tp,LOCATION_MZONE,0,1,1,nil)
		Duel.SetOperationInfo(0,CATEGORY_DESTROY,g1,1,0,0)
		Duel.SetOperationInfo(0,CATEGORY_CONTROL,g2,1,0,0)
	end,
	op=function(e,tp)
		local ex1,dg=Duel.GetOperationInfo(0,CATEGORY_DESTROY)
		local ex2,cg=Duel.GetOperationInfo(0,CATEGORY_CONTROL)
		local dc=dg and dg:GetFirst()
		local cc=cg and cg:GetFirst()
		if dc and cc and dc:IsRelateToEffect(e) and Duel.Destroy(dc,REASON_EFFECT)>0 and cc:IsRelateToEffect(e) then
			Duel.BreakEffect()
			Duel.GetControl(cc,1-tp)
		end
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
local function real_ss_target_filter(c,e,tp,p) return (not p.exclude_self or c~=e:GetHandler()) and real_sel(c,p) and c:IsCanBeSpecialSummoned(e,0,tp,false,false,p.position=='facedown' and POS_FACEDOWN_DEFENSE or (p.position=='defense' and POS_FACEUP_DEFENSE or POS_FACEUP)) end
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

R.Act.lose_200_atk={cat=CATEGORY_ATKCHANGE,
	op=function(e)
		local c=e:GetHandler()
		if not c:IsFaceup() then return end
		local e1=Effect.CreateEffect(c)
		e1:SetType(EFFECT_TYPE_SINGLE)
		e1:SetCode(EFFECT_UPDATE_ATTACK)
		e1:SetValue(-200)
		e1:SetReset(RESET_EVENT|RESETS_STANDARD_DISABLE)
		c:RegisterEffect(e1)
	end}
R.Act.lose_atk_permanent={cat=CATEGORY_ATKCHANGE,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local c=e:GetHandler()
		if not c:IsFaceup() then return end
		local e1=Effect.CreateEffect(c)
		e1:SetType(EFFECT_TYPE_SINGLE)
		e1:SetProperty(EFFECT_FLAG_COPY_INHERIT)
		e1:SetCode(EFFECT_UPDATE_ATTACK)
		e1:SetValue(-p.n)
		e1:SetReset(RESET_EVENT|RESETS_STANDARD_DISABLE)
		c:RegisterEffect(e1)
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
R.Act.send_extra_to_gy={cat=CATEGORY_TOGRAVE,
	check=function(e,tp) return Duel.IsExistingMatchingCard(Card.IsAbleToGrave,tp,LOCATION_EXTRA,0,1,nil) end,
	prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_TOGRAVE,nil,1,tp,LOCATION_EXTRA) end,
	op=function(e,tp)
		if not Duel.IsExistingMatchingCard(Card.IsAbleToGrave,tp,LOCATION_EXTRA,0,1,nil) then return end
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TOGRAVE)
		local g=Duel.SelectMatchingCard(tp,Card.IsAbleToGrave,tp,LOCATION_EXTRA,0,1,1,nil)
		if #g>0 then Duel.SendtoGrave(g,REASON_EFFECT) end
	end}
R.Act.destroy_attacked_this_card={cat=CATEGORY_DESTROY,
		prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_DESTROY,Duel.GetAttacker(),1,0,0) end,
		op=function(e)
			local a=Duel.GetAttacker()
			if a and a:IsRelateToBattle() then Duel.Destroy(a,REASON_EFFECT) end
		end}
R.Act.destroy_facedown_battle_target={cat=CATEGORY_DESTROY,
		prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_DESTROY,Duel.GetAttackTarget(),1,0,0) end,
		op=function()
			local tc=Duel.GetAttackTarget()
			if tc and tc:IsRelateToBattle() then Duel.Destroy(tc,REASON_EFFECT) end
		end}
R.Act.change_battle_target_def={cat=CATEGORY_POSITION,
		prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_POSITION,e:GetHandler():GetBattleTarget(),1,0,0) end,
		op=function(e)
			local tc=e:GetHandler():GetBattleTarget()
			if tc and tc:IsRelateToBattle() and tc:IsAttackPos() then Duel.ChangePosition(tc,POS_FACEUP_DEFENSE) end
		end}
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
R.Act.zolga_recover={cat=CATEGORY_RECOVER,
	prep=function(e,tp)
		local p=e:GetHandler():GetPreviousControler()
		Duel.SetTargetPlayer(p)
		Duel.SetTargetParam(2000)
		Duel.SetOperationInfo(0,CATEGORY_RECOVER,nil,0,p,2000)
	end,
	op=function(e)
		local p,d=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)
		Duel.Recover(p,d,REASON_EFFECT)
	end}
R.Act.look_reorder_top5={cat=0,check=function(e,tp,eg,ep,ev,re,r,rp,p)
	return Duel.GetFieldGroupCount(tp,LOCATION_DECK,0)>=(p.min_deck or 1)
end,op=function(e,tp,eg,ep,ev,re,r,rp,p)
	local ct=math.min(p.n or 5,Duel.GetFieldGroupCount(tp,LOCATION_DECK,0))
	if ct<=0 then return end
	local n=ct==1 and 1 or Duel.AnnounceNumberRange(tp,1,ct)
	Duel.SortDecktop(tp,tp,n)
end}
R.Act.big_march_beast_atk={cat=CATEGORY_ATKCHANGE,damage_step=true,
	check=function(e,tp)
		return Duel.IsExistingMatchingCard(aux.FaceupFilter(Card.IsRace,RACE_BEAST),tp,LOCATION_MZONE,0,1,nil)
	end,
	op=function(e,tp)
		local g=Duel.GetMatchingGroup(aux.FaceupFilter(Card.IsRace,RACE_BEAST),tp,LOCATION_MZONE,0,nil)
		local atk=#g*200
		for tc in g:Iter() do
			local e1=Effect.CreateEffect(e:GetHandler())
			e1:SetType(EFFECT_TYPE_SINGLE) e1:SetCode(EFFECT_UPDATE_ATTACK) e1:SetValue(atk)
			e1:SetReset(RESETS_STANDARD_PHASE_END) tc:RegisterEffect(e1)
		end
	end}
R.Act.ss_self_hand={cat=CATEGORY_SPECIAL_SUMMON,hand=true,
	check=function(e,tp) return Duel.GetMZoneCount(tp)>0 and e:GetHandler():IsCanBeSpecialSummoned(e,0,tp,false,false) end,
	prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,e:GetHandler(),1,tp,LOCATION_HAND) end,
	op=function(e,tp)
		local c=e:GetHandler()
		if c:IsRelateToEffect(e) and c:IsLocation(LOCATION_HAND) then Duel.SpecialSummon(c,0,tp,tp,false,false,POS_FACEUP) end
	end}
R.Act.self_change_defense={cat=CATEGORY_POSITION,prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_POSITION,e:GetHandler(),1,0,0) end,
	op=function(e) local c=e:GetHandler() if c:IsFaceup() and c:IsAttackPos() and c:IsRelateToEffect(e) then Duel.ChangePosition(c,POS_FACEUP_DEFENSE) end end}
R.Act.ss_level4_noattack={cat=CATEGORY_SPECIAL_SUMMON,
	check=function(e,tp) return Duel.GetLocationCount(tp,LOCATION_MZONE)>0 and Duel.IsExistingMatchingCard(function(c,e,tp) return c:IsLevel(4) and c:IsCanBeSpecialSummoned(e,0,tp,false,false) end,tp,LOCATION_DECK,0,1,nil,e,tp) end,
	prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_DECK) end,
	op=function(e,tp)
		if Duel.GetLocationCount(tp,LOCATION_MZONE)<=0 then return end
		local g=Duel.SelectMatchingCard(tp,function(c,e,tp) return c:IsLevel(4) and c:IsCanBeSpecialSummoned(e,0,tp,false,false) end,tp,LOCATION_DECK,0,1,1,nil,e,tp)
		local tc=g:GetFirst()
		if tc and Duel.SpecialSummon(tc,0,tp,tp,false,false,POS_FACEUP)>0 then
			local e1=Effect.CreateEffect(e:GetHandler()) e1:SetType(EFFECT_TYPE_SINGLE) e1:SetCode(EFFECT_CANNOT_ATTACK)
			e1:SetReset(RESETS_STANDARD_PHASE_END) tc:RegisterEffect(e1)
		end
	end}
R.Act.return_self_end_phase={cat=CATEGORY_SPECIAL_SUMMON,
	op=function(e,tp)
		local c=e:GetHandler()
		local code=c:GetOriginalCode()
		c:RegisterFlagEffect(code,RESETS_STANDARD_PHASE_END,0,1)
		local e1=Effect.CreateEffect(c)
		e1:SetDescription(aux.Stringid(code,0))
		e1:SetCategory(CATEGORY_SPECIAL_SUMMON)
		e1:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
		e1:SetCode(EVENT_PHASE+PHASE_END)
		e1:SetRange(LOCATION_REMOVED)
		e1:SetCondition(function(se) return c:GetFlagEffect(code)~=0 end)
		e1:SetTarget(function(se,stp,eg,sep,sev,sre,sr,srp,chk)
			if chk==0 then return c:GetFlagEffect(code+1)==0 end
			Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,c,1,0,0)
			c:RegisterFlagEffect(code+1,RESET_EVENT|RESET_TURN_SET|RESET_TOGRAVE|RESET_TEMP_REMOVE|RESET_TOHAND|RESET_TODECK|RESET_OVERLAY|RESET_PHASE|PHASE_END,0,1)
		end)
		e1:SetOperation(function(se,stp,eg,sep,sev,sre,sr,srp)
			if not c:IsRelateToEffect(se) then return end
			if Duel.GetLocationCount(tp,LOCATION_MZONE)<=0 then Duel.SendtoGrave(c,REASON_EFFECT) return end
			Duel.SpecialSummon(c,0,tp,tp,false,false,POS_FACEUP_ATTACK)
		end)
		c:RegisterEffect(e1)
	end}
R.Act.return_self_gy_hand={cat=CATEGORY_TOHAND,grave=true,
	check=function(e,tp) return Duel.GetFieldGroupCount(tp,LOCATION_HAND,0)==0 and e:GetHandler():IsAbleToHand() end,
	prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_TOHAND,e:GetHandler(),1,0,0) end,
	op=function(e,tp)
		local c=e:GetHandler()
		if Duel.GetFieldGroupCount(tp,LOCATION_HAND,0)==0 and c:IsRelateToEffect(e) then Duel.SendtoHand(c,nil,REASON_EFFECT) end
	end}
R.Act.set_self_atk_2400_damage={cat=CATEGORY_ATKCHANGE,
	op=function(e)
		local c=e:GetHandler()
		if not c:IsRelateToEffect(e) or not c:IsFaceup() then return end
		local e1=Effect.CreateEffect(c)
		e1:SetType(EFFECT_TYPE_SINGLE)
		e1:SetCode(EFFECT_SET_ATTACK_FINAL)
		e1:SetReset(RESET_PHASE|PHASE_DAMAGE_CAL)
		e1:SetValue(2400)
		c:RegisterEffect(e1)
	end}
R.Act.set_target_faceup_opp={cat=CATEGORY_POSITION,target=true,loc1=0,loc2=LOCATION_MZONE,hint=HINTMSG_FACEUP,
	filter=function(c) return c:IsFaceup() and c:IsCanTurnSet() end,
	op=function(e)
		local tc=Duel.GetFirstTarget()
		if relate(e,tc) and tc:IsFaceup() then Duel.ChangePosition(tc,POS_FACEDOWN_DEFENSE) end
	end}
R.Act.ss_fusion_same_level={cat=CATEGORY_SPECIAL_SUMMON,
	check=function(e,tp)
		local lv=e:GetLabel()
		return lv>0 and Duel.GetLocationCount(tp,LOCATION_MZONE)>0 and Duel.IsExistingMatchingCard(function(fc)
			return fc:IsType(TYPE_FUSION) and fc:GetLevel()==lv and fc:IsCanBeSpecialSummoned(e,0,tp,false,false)
				and Duel.GetLocationCountFromEx(tp,tp,nil,fc)>0
		end,tp,LOCATION_EXTRA,0,1,nil)
	end,
	prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_EXTRA) end,
	op=function(e,tp)
		local lv=e:GetLabel()
		if lv<=0 or Duel.GetLocationCount(tp,LOCATION_MZONE)<=0 then return end
		local g=Duel.SelectMatchingCard(tp,function(fc)
			return fc:IsType(TYPE_FUSION) and fc:GetLevel()==lv and fc:IsCanBeSpecialSummoned(e,0,tp,false,false)
				and Duel.GetLocationCountFromEx(tp,tp,nil,fc)>0
		end,tp,LOCATION_EXTRA,0,1,1,nil)
		local tc=g:GetFirst()
		if tc then Duel.SpecialSummon(tc,0,tp,tp,false,false,POS_FACEUP) end
	end}
R.Act.declare_race_hunter={cat=0,
	op=function(e,tp)
		local c=e:GetHandler()
		if not c:IsRelateToEffect(e) or not c:IsFaceup() then return end
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_RACE)
		local rc=Duel.AnnounceRace(tp,1,RACE_ALL)
		c:SetHint(CHINT_RACE,rc)
		local e1=Effect.CreateEffect(c)
		e1:SetDescription(aux.Stringid(c:GetOriginalCode(),1))
		e1:SetCategory(CATEGORY_ATKCHANGE)
		e1:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_F)
		e1:SetCode(EVENT_PRE_DAMAGE_CALCULATE)
		e1:SetLabel(rc)
		e1:SetCondition(function(se)
			local bc=se:GetHandler():GetBattleTarget()
			return bc and bc:IsRace(se:GetLabel())
		end)
		e1:SetOperation(function(se)
			local hc=se:GetHandler()
			if not hc:IsRelateToEffect(se) or not hc:IsFaceup() then return end
			local e2=Effect.CreateEffect(hc)
			e2:SetType(EFFECT_TYPE_SINGLE)
			e2:SetCode(EFFECT_UPDATE_ATTACK)
			e2:SetReset(RESET_PHASE|PHASE_DAMAGE_CAL)
			e2:SetValue(1000)
			hc:RegisterEffect(e2)
		end)
		e1:SetReset(RESET_EVENT|RESETS_STANDARD)
		c:RegisterEffect(e1)
	end}
R.Act.declare_race_destroy={cat=CATEGORY_DESTROY,
	check=function(e,tp)
		return Duel.IsExistingMatchingCard(Card.IsFaceup,tp,LOCATION_MZONE,LOCATION_MZONE,1,nil)
	end,
	prep=function(e,tp)
		local g=Duel.GetMatchingGroup(Card.IsFaceup,tp,LOCATION_MZONE,LOCATION_MZONE,nil)
		local races=0
		for tc in g:Iter() do races=races|tc:GetRace() end
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_RACE)
		e:SetLabel(Duel.AnnounceRace(tp,1,races))
	end,
	op=function(e,tp)
		local rc=e:GetLabel()
		local g=Duel.GetMatchingGroup(function(c) return c:IsFaceup() and c:IsRace(rc) end,
			tp,LOCATION_MZONE,LOCATION_MZONE,nil)
		if #g>0 then Duel.Destroy(g,REASON_EFFECT) end
	end}
R.Act.attack_and_receive={cat=CATEGORY_DAMAGE,player_target=true,
	prep=function(e,tp)
		Duel.SetTargetPlayer(1-tp)
		Duel.SetTargetParam(700)
		Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,1-tp,700)
	end,
	op=function(e,tp)
		local p,d=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)
		Duel.Damage(p,d,REASON_EFFECT)
		local c=e:GetHandler()
		local n=Duel.GetMatchingGroupCount(Card.IsCode,tp,LOCATION_GRAVE,0,nil,c:GetOriginalCode())
		if n>0 then Duel.Damage(p,300*n,REASON_EFFECT) end
	end}
R.Act.negate_effect_only={cat=CATEGORY_DISABLE,
	prep=function(e,tp,eg,ep,ev) Duel.SetOperationInfo(0,CATEGORY_DISABLE,eg,1,0,0) end,
	op=function(e,tp,eg,ep,ev) Duel.NegateEffect(ev) end}
R.Act.negate_destroy_group={cat=CATEGORY_NEGATE+CATEGORY_DESTROY,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p)
		Duel.SetOperationInfo(0,CATEGORY_NEGATE,eg,1,0,0)
		local loc=LOCATION_ONFIELD
		local g=Duel.GetMatchingGroup(function(c,k) return k=='st' and c:IsSpellTrap() or k=='monster' and c:IsMonster() end,
			tp,0,loc,nil,p.kind)
		Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,#g,0,0)
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		if not Duel.NegateActivation(ev) then return end
		local loc=LOCATION_ONFIELD
		local g=Duel.GetMatchingGroup(function(c,k) return k=='st' and c:IsSpellTrap() or k=='monster' and c:IsMonster() end,
			tp,0,loc,nil,p.kind)
		if #g>0 then Duel.Destroy(g,REASON_EFFECT) end
	end}
R.Act.dust_tornado={cat=CATEGORY_DESTROY,target=true,loc1=0,loc2=LOCATION_ONFIELD,hint=HINTMSG_DESTROY,
	filter=function(c) return c:IsSpellTrap() end,
	check=function(e,tp)
		return Duel.IsExistingTarget(function(c) return c:IsSpellTrap() end,tp,0,LOCATION_ONFIELD,1,e:GetHandler())
	end,
	prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_DESTROY,nil,1,1-tp,LOCATION_ONFIELD) end,
	op=function(e,tp)
		local tc=Duel.GetFirstTarget()
		if not relate(e,tc) or Duel.Destroy(tc,REASON_EFFECT)==0 then return end
		local g=Duel.GetMatchingGroup(Card.IsSSetable,tp,LOCATION_HAND,0,nil)
		if #g>0 and Duel.SelectYesNo(tp,aux.Stringid(e:GetHandler():GetOriginalCode(),0)) then
			Duel.BreakEffect()
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SET)
			local sg=g:Select(tp,1,1,nil)
			Duel.SSet(tp,sg:GetFirst(),tp,false)
		end
	end}
R.Act.energy_drain={cat=CATEGORY_ATKCHANGE+CATEGORY_DEFCHANGE,damage_step=true,
	target=true,loc1=LOCATION_MZONE,loc2=0,hint=HINTMSG_FACEUP,
	filter=function(c) return c:IsFaceup() end,
	check=function(e,tp) return Duel.IsExistingTarget(Card.IsFaceup,tp,LOCATION_MZONE,0,1,nil) end,
	prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_ATKCHANGE,nil,1,tp,0) end,
	op=function(e,tp)
		local tc=Duel.GetFirstTarget()
		local value=Duel.GetFieldGroupCount(tp,0,LOCATION_HAND)*200
		if value==0 or not relate(e,tc) or not tc:IsFaceup() then return end
		for _,code in ipairs({EFFECT_UPDATE_ATTACK,EFFECT_UPDATE_DEFENSE}) do
			local e1=Effect.CreateEffect(e:GetHandler())
			e1:SetType(EFFECT_TYPE_SINGLE) e1:SetCode(code) e1:SetValue(value)
			e1:SetReset(RESETS_STANDARD_PHASE_END) tc:RegisterEffect(e1)
		end
	end}
R.Act.disable_continuous_type_until_end={cat=CATEGORY_DISABLE,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local card_type=p.card_type
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_FIELD)
		e1:SetCode(EFFECT_DISABLE)
		e1:SetTargetRange(LOCATION_SZONE,LOCATION_SZONE)
		e1:SetTarget(function(se,c)
			if card_type=='field' then return c:IsType(TYPE_FIELD)
			elseif card_type=='continuous_spell' then return c:IsContinuousSpell()
			elseif card_type=='equip' then return c:IsType(TYPE_EQUIP)
			else return c:IsContinuousTrap() end
		end)
		e1:SetReset(RESET_PHASE|PHASE_END)
		Duel.RegisterEffect(e1,tp)
	end}
R.Act.destroy_jars_turn_dragons_attack={cat=CATEGORY_DESTROY+CATEGORY_POSITION,
	prep=function(e,tp,eg,ep,ev,re,r,rp,p)
		local g=Duel.GetMatchingGroup(Card.IsCode,tp,LOCATION_SZONE,LOCATION_SZONE,nil,table.unpack(p.codes))
		Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,#g,0,0)
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local g=Duel.GetMatchingGroup(Card.IsCode,tp,LOCATION_SZONE,LOCATION_SZONE,nil,table.unpack(p.codes))
		if Duel.Destroy(g,REASON_EFFECT)>0 then
			local pg=Duel.GetMatchingGroup(function(c) return c:IsPosition(POS_FACEUP_DEFENSE) and c:IsRace(RACE_DRAGON) end,
				tp,LOCATION_MZONE,LOCATION_MZONE,nil)
			if #pg>0 then Duel.ChangePosition(pg,POS_FACEUP_ATTACK) end
		end
	end}
R.Act.shuffle_opp_hand_draw_two={cat=CATEGORY_TODECK+CATEGORY_DRAW,player_target=true,
	check=function(e,tp) return Duel.IsPlayerCanDraw(1-tp) end,
	prep=function(e,tp)
		Duel.SetTargetPlayer(1-tp)
		Duel.SetOperationInfo(0,CATEGORY_TODECK,nil,0,1-tp,LOCATION_HAND)
		Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,1-tp,2)
	end,
	op=function(e,tp)
		local p=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER)
		local g=Duel.GetFieldGroup(p,LOCATION_HAND,0)
		if #g==0 then return end
		Duel.SendtoDeck(g,nil,SEQ_DECKSHUFFLE,REASON_EFFECT)
		Duel.ShuffleDeck(p)
		Duel.BreakEffect()
		Duel.Draw(p,2,REASON_EFFECT)
	end}
R.Act.choose_attack_target={cat=0,
	check=function()
		local a=Duel.GetAttacker()
		if not a then return false end
		local ag,da=a:GetAttackableTarget()
		local at=Duel.GetAttackTarget()
		return ag:IsExists(function(c,current) return c~=current end,1,nil,at) or (at~=nil and da)
	end,
	op=function(e,tp)
		local a=Duel.GetAttacker()
		if not a then return end
		local ag,da=a:GetAttackableTarget()
		local at=Duel.GetAttackTarget()
		if da and at~=nil then
			local sel=Duel.SelectOption(tp,1213,1214)
			if sel==0 then Duel.ChangeAttackTarget(nil) return end
		end
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATTACKTARGET)
		local g=ag:Select(tp,1,1,at)
		local tc=g:GetFirst()
		if tc then Duel.ChangeAttackTarget(tc) end
	end}
R.Act.paths_of_destiny={cat=CATEGORY_COIN+CATEGORY_RECOVER+CATEGORY_DAMAGE,
	prep=function() Duel.SetOperationInfo(0,CATEGORY_COIN,nil,0,PLAYER_ALL,2) end,
	op=function(e,tp)
		for _,p in ipairs({tp,1-tp}) do
			if Duel.TossCoin(p,1)==COIN_HEADS then Duel.Recover(p,2000,REASON_EFFECT)
			else Duel.Damage(p,2000,REASON_EFFECT) end
		end
	end}
R.Act.legacy_yata_draw={cat=CATEGORY_DRAW,player_target=true,
	check=function(e,tp) return Duel.IsPlayerCanDraw(tp,1) end,
	prep=function(e,tp)
		local d=1
		local spirit=Duel.IsExistingMatchingCard(function(c) return c:IsType(TYPE_SPIRIT) and c:IsFaceup() end,
			tp,0,LOCATION_MZONE,1,nil)
		if Duel.GetFieldGroupCount(tp,LOCATION_DECK,0)>1 and spirit
			and Duel.SelectOption(tp,aux.Stringid(e:GetHandler():GetOriginalCode(),0),aux.Stringid(e:GetHandler():GetOriginalCode(),1))==1 then
			d=2
		end
		Duel.SetTargetPlayer(tp)
		Duel.SetTargetParam(d)
		Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,tp,d)
	end,
	op=function(e,tp)
		local p,d=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)
		Duel.Draw(p,d,REASON_EFFECT)
	end}
R.Act.destroy_two_own_one_opp={cat=CATEGORY_DESTROY,target=true,
	loc1=LOCATION_MZONE,loc2=LOCATION_MZONE,hint=HINTMSG_DESTROY,filter=aux.TRUE,
	check=function(e,tp)
		return Duel.IsExistingMatchingCard(aux.TRUE,tp,LOCATION_MZONE,0,2,nil)
			and Duel.IsExistingMatchingCard(aux.TRUE,tp,0,LOCATION_MZONE,1,nil)
	end,
	prep=function(e,tp)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)
		local g1=Duel.SelectTarget(tp,aux.TRUE,tp,LOCATION_MZONE,0,2,2,nil)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)
		local g2=Duel.SelectTarget(tp,aux.TRUE,tp,0,LOCATION_MZONE,1,1,nil)
		g1:Merge(g2)
		Duel.SetOperationInfo(0,CATEGORY_DESTROY,g1,3,0,0)
	end,
	op=function(e)
		local g=Duel.GetTargetCards(e):Filter(Card.IsRelateToEffect,nil,e)
		if #g==3 then Duel.Destroy(g,REASON_EFFECT) end
	end}
R.Act.good_goblin_housekeeping={cat=CATEGORY_DRAW+CATEGORY_TODECK,player_target=true,
	check=function(e,tp) return Duel.IsPlayerCanDraw(tp,1) end,
	prep=function(e,tp)
		local c=e:GetHandler()
		local n=Duel.GetMatchingGroupCount(Card.IsCode,tp,LOCATION_GRAVE,0,nil,c:GetOriginalCode())+1
		Duel.SetTargetPlayer(tp)
		Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,tp,n)
		Duel.SetOperationInfo(0,CATEGORY_TODECK,nil,1,tp,LOCATION_HAND)
	end,
	op=function(e,tp)
		local p=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER)
		local c=e:GetHandler()
		local n=Duel.GetMatchingGroupCount(Card.IsCode,p,LOCATION_GRAVE,0,nil,c:GetOriginalCode())+1
		Duel.Draw(p,n,REASON_EFFECT)
		Duel.BreakEffect()
		Duel.Hint(HINT_SELECTMSG,p,HINTMSG_TODECK)
		local g=Duel.SelectMatchingCard(p,aux.TRUE,p,LOCATION_HAND,0,1,1,nil)
		if #g>0 then Duel.SendtoDeck(g,nil,SEQ_DECKBOTTOM,REASON_EFFECT) end
	end}
R.Act.turn_event_opp_monsters_faceup_attack={cat=CATEGORY_POSITION,
	op=function(e,tp,eg)
		local g=eg and eg:Filter(function(c,p) return c:IsControler(1-p) and c:IsFacedown() end,nil,tp)
		if g and #g>0 then Duel.ChangePosition(g,POS_FACEUP_ATTACK,POS_FACEUP_ATTACK,POS_FACEUP_ATTACK,POS_FACEUP_ATTACK,true) end
	end}
R.Act.dragons_gunfire={cat=CATEGORY_DAMAGE+CATEGORY_DESTROY,
	check=function() return true end,
	prep=function(e,tp)
		local canDestroy=Duel.IsExistingTarget(function(c) return c:IsFaceup() and c:IsDefenseBelow(800) end,
			tp,LOCATION_MZONE,LOCATION_MZONE,1,nil)
		local id=e:GetHandler():GetOriginalCode()
		local op=Duel.SelectEffect(tp,{true,aux.Stringid(id,0)},{canDestroy,aux.Stringid(id,1)})
		if op==1 then
			e:SetLabel(1)
			e:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
			Duel.SetTargetPlayer(1-tp)
			Duel.SetTargetParam(800)
			Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,1-tp,800)
		else
			e:SetLabel(0)
			e:SetProperty(EFFECT_FLAG_CARD_TARGET)
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)
			local g=Duel.SelectTarget(tp,function(c) return c:IsFaceup() and c:IsDefenseBelow(800) end,
				tp,LOCATION_MZONE,LOCATION_MZONE,1,1,nil)
			Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,1,0,0)
		end
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp)
		if e:GetLabel()==1 then
			local p,d=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)
			Duel.Damage(p,d,REASON_EFFECT)
		else
			local tc=Duel.GetFirstTarget()
			if tc and tc:IsFaceup() and tc:IsDefenseBelow(800) and tc:IsRelateToEffect(e) then Duel.Destroy(tc,REASON_EFFECT) end
		end
	end}
R.Act.cost_down={cat=0,
	op=function(e,tp)
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_FIELD)
		e1:SetCode(EFFECT_UPDATE_LEVEL)
		e1:SetTargetRange(LOCATION_HAND,0)
		e1:SetTarget(function(se,c) return c:IsMonster() and c:IsLevelAbove(1) end)
		e1:SetValue(-2)
		e1:SetReset(RESET_PHASE|PHASE_END)
		Duel.RegisterEffect(e1,tp)
	end}
R.Act.beckoning_light={cat=CATEGORY_HANDES+CATEGORY_TOHAND,
	check=function(e,tp)
		local hd=Duel.GetFieldGroupCount(tp,LOCATION_HAND,0)
		if e:GetHandler():IsLocation(LOCATION_HAND) then hd=hd-1 end
		return hd>0 and Duel.GetMatchingGroupCount(function(c) return c:IsAttribute(ATTRIBUTE_LIGHT) and c:IsAbleToHand() end,
			tp,LOCATION_GRAVE,0,nil)>=hd
	end,
	prep=function(e,tp)
		local sg=Duel.GetFieldGroup(tp,LOCATION_HAND,0)
		local tg=Duel.GetMatchingGroup(function(c) return c:IsAttribute(ATTRIBUTE_LIGHT) and c:IsAbleToHand() end,
			tp,LOCATION_GRAVE,0,nil)
		Duel.SetOperationInfo(0,CATEGORY_HANDES,sg,#sg,0,0)
		Duel.SetOperationInfo(0,CATEGORY_TOHAND,tg,#sg,0,0)
	end,
	op=function(e,tp)
		local sg=Duel.GetFieldGroup(tp,LOCATION_HAND,0)
		Duel.SendtoGrave(sg,REASON_EFFECT|REASON_DISCARD)
		local ct=sg:Filter(Card.IsLocation,nil,LOCATION_GRAVE):GetCount()
		local tg=Duel.GetMatchingGroup(function(c) return c:IsAttribute(ATTRIBUTE_LIGHT) and c:IsAbleToHand() end,
			tp,LOCATION_GRAVE,0,nil)
		if ct>0 and #tg>=ct then
			Duel.BreakEffect()
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
			local sel=tg:Select(tp,ct,ct,nil)
			Duel.SendtoHand(sel,nil,REASON_EFFECT)
			Duel.ConfirmCards(1-tp,sel)
		end
	end}
R.Act.delinquent_duo={cat=CATEGORY_HANDES,player_target=true,
	check=function(e,tp) return Duel.GetFieldGroupCount(tp,0,LOCATION_HAND)>0 end,
	prep=function(e,tp)
		Duel.SetTargetPlayer(1-tp)
		Duel.SetOperationInfo(0,CATEGORY_HANDES,nil,0,1-tp,2)
	end,
	op=function(e,tp)
		local p=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER)
		local g=Duel.GetFieldGroup(p,LOCATION_HAND,0)
		if #g==0 then return end
		local sg=g:RandomSelect(p,1)
		Duel.SendtoGrave(sg,REASON_EFFECT|REASON_DISCARD)
		g:RemoveCard(sg:GetFirst())
		if #g>0 then
			Duel.Hint(HINT_SELECTMSG,1-p,HINTMSG_DISCARD)
			sg=g:Select(1-p,1,1,nil)
			Duel.SendtoGrave(sg,REASON_EFFECT|REASON_DISCARD)
		end
	end}
R.Act.sebek_recover_damage={cat=CATEGORY_RECOVER,player_target=true,
	prep=function(e,tp,eg,ep,ev)
		Duel.SetTargetPlayer(tp)
		Duel.SetTargetParam(ev)
		Duel.SetOperationInfo(0,CATEGORY_RECOVER,nil,0,tp,ev)
	end,
	op=function(e,tp)
		local p,n=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)
		Duel.Recover(p,n,REASON_EFFECT)
	end}
R.Act.wild_nature_release={cat=CATEGORY_ATKCHANGE,target=true,loc1=LOCATION_MZONE,loc2=LOCATION_MZONE,
	hint=HINTMSG_FACEUP,filter=function(c)
		return c:HasNonZeroDefense() and c:IsRace(RACE_BEAST|RACE_BEASTWARRIOR)
	end,
	prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_ATKCHANGE,nil,1,0,0) end,
	op=function(e)
		local tc=Duel.GetFirstTarget()
		if not (relate(e,tc) and tc:IsFaceup()) then return end
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_SINGLE) e1:SetCode(EFFECT_UPDATE_ATTACK) e1:SetValue(tc:GetDefense())
		e1:SetReset(RESETS_STANDARD_PHASE_END) tc:RegisterEffect(e1)
		local e2=Effect.CreateEffect(e:GetHandler())
		e2:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		e2:SetCode(EVENT_PHASE+PHASE_END) e2:SetRange(LOCATION_MZONE)
		e2:SetReset(RESETS_STANDARD_PHASE_END) e2:SetCountLimit(1)
		e2:SetOperation(function(se) Duel.Destroy(se:GetHandler(),REASON_EFFECT) end)
		tc:RegisterEffect(e2)
	end}
R.Act.cold_wave={cat=0,
	op=function(e,tp)
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_FIELD)
		e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e1:SetCode(EFFECT_CANNOT_ACTIVATE)
		e1:SetTargetRange(1,1)
		e1:SetValue(function(se,re) return re:IsSpellTrapEffect() end)
		e1:SetReset(RESET_PHASE|PHASE_END,2)
		Duel.RegisterEffect(e1,tp)
		local e2=Effect.CreateEffect(e:GetHandler())
		e2:SetType(EFFECT_TYPE_FIELD)
		e2:SetCode(EFFECT_CANNOT_SSET)
		e2:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e2:SetTargetRange(1,1)
		e2:SetTarget(aux.TRUE)
		e2:SetReset(RESET_PHASE|PHASE_END,2)
		Duel.RegisterEffect(e2,tp)
	end}
R.Act.limiter_removal={cat=CATEGORY_ATKCHANGE+CATEGORY_DESTROY,damage_step=true,
	check=function(e,tp)
		return Duel.IsExistingMatchingCard(function(c) return c:IsFaceup() and c:IsRace(RACE_MACHINE) end,
			tp,LOCATION_MZONE,0,1,nil)
	end,
	prep=function(e,tp)
		local g=Duel.GetMatchingGroup(function(c) return c:IsFaceup() and c:IsRace(RACE_MACHINE) end,
			tp,LOCATION_MZONE,0,nil)
		Duel.SetOperationInfo(0,CATEGORY_ATKCHANGE,g,#g,0,0)
		Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,#g,0,0)
	end,
	op=function(e,tp)
		local g=Duel.GetMatchingGroup(function(c) return c:IsFaceup() and c:IsRace(RACE_MACHINE) and not c:IsImmuneToEffect(e) end,
			tp,LOCATION_MZONE,0,nil)
		for tc in g:Iter() do
			local e1=Effect.CreateEffect(e:GetHandler())
			e1:SetType(EFFECT_TYPE_SINGLE) e1:SetCode(EFFECT_SET_ATTACK_FINAL)
			e1:SetValue(tc:GetAttack()*2) e1:SetReset(RESETS_STANDARD_PHASE_END)
			tc:RegisterEffect(e1)
			local e2=Effect.CreateEffect(e:GetHandler())
			e2:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_F)
			e2:SetCode(EVENT_PHASE+PHASE_END)
			e2:SetReset(RESET_EVENT|RESETS_STANDARD|RESET_PHASE|PHASE_END)
			e2:SetOperation(function(se) Duel.Destroy(se:GetHandler(),REASON_EFFECT) end)
			tc:RegisterEffect(e2)
		end
	end}
R.Act.machine_duplication={cat=CATEGORY_SPECIAL_SUMMON,target=true,loc1=LOCATION_MZONE,loc2=0,
	hint=HINTMSG_FACEUP,filter=function(c,e,tp)
		if not c:IsFaceup() or not c:IsRace(RACE_MACHINE) or not c:IsAttackBelow(500) then return false end
		return Duel.IsExistingMatchingCard(function(tc,code,se,stp)
			return tc:IsCode(code) and tc:IsCanBeSpecialSummoned(se,0,stp,false,false)
		end,stp,LOCATION_DECK,0,1,nil,c:GetCode(),e,tp)
	end,
	check=function(e,tp)
		return Duel.GetLocationCount(tp,LOCATION_MZONE)>0
			and Duel.IsExistingTarget(function(c,se,stp)
				if not c:IsFaceup() or not c:IsRace(RACE_MACHINE) or not c:IsAttackBelow(500) then return false end
				return Duel.IsExistingMatchingCard(function(tc,code,ee,ttp)
					return tc:IsCode(code) and tc:IsCanBeSpecialSummoned(ee,0,ttp,false,false)
				end,stp,LOCATION_DECK,0,1,nil,c:GetCode(),se,stp)
			end,tp,LOCATION_MZONE,0,1,nil,e,tp)
	end,
	prep=function(e,tp)
		local filter=function(c,se,stp)
			if not c:IsFaceup() or not c:IsRace(RACE_MACHINE) or not c:IsAttackBelow(500) then return false end
			return Duel.IsExistingMatchingCard(function(tc,code,ee,ttp)
				return tc:IsCode(code) and tc:IsCanBeSpecialSummoned(ee,0,ttp,false,false)
			end,stp,LOCATION_DECK,0,1,nil,c:GetCode(),se,stp)
		end
		Duel.Hint(HINT_SELECTMSG,tp,aux.Stringid(e:GetHandler():GetOriginalCode(),0))
		Duel.SelectTarget(tp,filter,tp,LOCATION_MZONE,0,1,1,nil,e,tp)
		Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_DECK)
	end,
	op=function(e,tp)
		local tc=Duel.GetFirstTarget()
		if not (relate(e,tc) and tc:IsFaceup()) then return end
		local ft=math.min(Duel.GetLocationCount(tp,LOCATION_MZONE),2)
		if Duel.IsPlayerAffectedByEffect(tp,CARD_BLUEEYES_SPIRIT) then ft=math.min(ft,1) end
		if ft<=0 then return end
		local sg=Duel.SelectMatchingCard(tp,function(c,code,se,stp)
			return c:IsCode(code) and c:IsCanBeSpecialSummoned(se,0,stp,false,false)
		end,tp,LOCATION_DECK,0,1,ft,nil,tc:GetCode(),e,tp)
		if #sg>0 then Duel.SpecialSummon(sg,0,tp,tp,false,false,POS_FACEUP) end
	end}
R.Act.summon_dark_magician={cat=CATEGORY_SPECIAL_SUMMON,
	check=function(e,tp)
		return Duel.GetLocationCount(tp,LOCATION_MZONE)>0 and Duel.IsExistingMatchingCard(function(tc)
			return tc:IsCode(46986414) and tc:IsCanBeSpecialSummoned(e,0,tp,false,false)
		end,tp,LOCATION_DECK,0,1,nil)
	end,
	prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_DECK) end,
	op=function(e,tp)
		if Duel.GetLocationCount(tp,LOCATION_MZONE)<=0 then return end
		local g=Duel.SelectMatchingCard(tp,function(tc) return tc:IsCode(46986414) and tc:IsCanBeSpecialSummoned(e,0,tp,false,false) end,
			tp,LOCATION_DECK,0,1,1,nil)
		if #g>0 then Duel.SpecialSummon(g,0,tp,tp,false,false,POS_FACEUP) end
	end}
R.Act.illusionist_fusion={cat=CATEGORY_RELEASE+CATEGORY_SPECIAL_SUMMON,
	prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_EXTRA) end,
	op=function(e,tp)
		local c=e:GetHandler()
		local release_filter=function(mc)
			if mc==c or not mc:IsReleasableByEffect() or mc:IsImmuneToEffect(e) then return false end
			return Duel.IsExistingMatchingCard(function(fc)
				return fc:IsType(TYPE_FUSION) and Duel.GetLocationCountFromEx(tp,tp,mc,fc)>0
					and fc:IsCanBeSpecialSummoned(e,0,tp,false,false)
			end,tp,LOCATION_EXTRA,0,1,nil)
		end
		local rg=Duel.SelectReleaseGroup(tp,release_filter,1,1,c,e,tp)
		if not rg or Duel.Release(rg,REASON_EFFECT)<=0 then return end
		local mc=rg:GetFirst()
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
		local sg=Duel.SelectMatchingCard(tp,function(fc)
			return fc:IsType(TYPE_FUSION) and Duel.GetLocationCountFromEx(tp,tp,mc,fc)>0
				and fc:IsCanBeSpecialSummoned(e,0,tp,false,false)
		end,tp,LOCATION_EXTRA,0,1,1,nil)
		local fc=sg:GetFirst()
		if not fc or Duel.SpecialSummon(sg,0,tp,tp,false,false,POS_FACEUP)<=0 then return end
		local e1=Effect.CreateEffect(c)
		e1:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		e1:SetRange(LOCATION_MZONE)
		e1:SetCode(EVENT_PHASE+PHASE_END)
		e1:SetCondition(function(se) return not fc:IsHasEffect(66235877) end)
		e1:SetOperation(function(se) Duel.Destroy(fc,REASON_EFFECT) end)
		e1:SetReset(RESETS_STANDARD_PHASE_END)
		e1:SetCountLimit(1)
		fc:RegisterEffect(e1)
	end}
R.Act.dice_jar={cat=CATEGORY_DICE+CATEGORY_DAMAGE,
	prep=function() Duel.SetOperationInfo(0,CATEGORY_DICE,nil,0,PLAYER_ALL,1) end,
	op=function(e,tp)
		local d1,d2=0,0
		while d1==d2 do d1,d2=Duel.TossDice(tp,1,1) end
		if d1<d2 then Duel.Damage(tp,d2==6 and 6000 or d2*500,REASON_EFFECT)
		else Duel.Damage(1-tp,d1==6 and 6000 or d1*500,REASON_EFFECT) end
	end}
R.Act.reflect_attacker_atk={cat=CATEGORY_DAMAGE,
	prep=function(e,tp) Duel.SetTargetPlayer(1-tp) Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,1-tp,0) end,
	op=function(e,tp)
		local at=Duel.GetAttacker()
		if not at then return end
		local p=1-tp local before=Duel.GetLP(p)
		Duel.Damage(p,at:GetAttack(),REASON_EFFECT)
		if Duel.GetLP(p)<before then e:GetHandler():RegisterFlagEffect(e:GetHandler():GetOriginalCode(),RESET_EVENT|RESETS_STANDARD|RESET_PHASE|PHASE_DAMAGE,0,1) end
	end}
R.Act.destroy_self_battle={cat=CATEGORY_DESTROY,
	prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_DESTROY,e:GetHandler(),1,0,0) end,
	op=function(e) local c=e:GetHandler() if c:IsRelateToEffect(e) then Duel.Destroy(c,REASON_EFFECT) end end}
R.Act.thousand_energy={cat=CATEGORY_ATKCHANGE+CATEGORY_DEFCHANGE+CATEGORY_DESTROY,
	check=function(e,tp,eg,ep,ev,re,r,rp,p)
		return Duel.IsExistingMatchingCard(function(c)
			return c:IsFaceup() and c:IsType(TYPE_NORMAL) and not c:IsType(TYPE_TOKEN) and c:GetLevel()==(p.level or 2)
		end,tp,LOCATION_MZONE,0,1,nil)
	end,
	op=function(e,tp,eg,ep,ev,re,r,rp,p)
		local lv=p.level or 2 local amt=p.n or 1000
		local f=function(c) return c:IsFaceup() and c:IsType(TYPE_NORMAL) and not c:IsType(TYPE_TOKEN) and c:GetLevel()==lv end
		local g=Duel.GetMatchingGroup(f,tp,LOCATION_MZONE,0,nil)
		for tc in aux.Next(g) do
			local e1=Effect.CreateEffect(e:GetHandler()) e1:SetType(EFFECT_TYPE_SINGLE) e1:SetCode(EFFECT_SET_BASE_ATTACK)
			e1:SetValue(tc:GetBaseAttack()+amt) e1:SetReset(RESET_EVENT|RESETS_STANDARD) tc:RegisterEffect(e1)
			local e2=Effect.CreateEffect(e:GetHandler()) e2:SetType(EFFECT_TYPE_SINGLE) e2:SetCode(EFFECT_SET_BASE_DEFENSE)
			e2:SetValue(tc:GetBaseDefense()+amt) e2:SetReset(RESET_EVENT|RESETS_STANDARD) tc:RegisterEffect(e2)
		end
		local de=Effect.CreateEffect(e:GetHandler())
		de:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS) de:SetCode(EVENT_PHASE+PHASE_END)
		de:SetCountLimit(1)
		de:SetCondition(function(se,stp) return Duel.IsExistingMatchingCard(function(c) return c:IsFaceup() and c:IsType(TYPE_NORMAL) and c:GetLevel()==lv end,stp,LOCATION_MZONE,0,1,nil) end)
		de:SetOperation(function(se,stp)
			local dg=Duel.GetMatchingGroup(function(c) return c:IsFaceup() and c:IsType(TYPE_NORMAL) and c:GetLevel()==lv end,stp,LOCATION_MZONE,0,nil)
			Duel.Destroy(dg,REASON_EFFECT)
		end)
		de:SetReset(RESET_PHASE|PHASE_END)
		Duel.RegisterEffect(de,tp)
	end}
R.Act.wingbeat_dragon={cat=CATEGORY_TOHAND+CATEGORY_DESTROY,
	check=function(e,tp)
		return Duel.IsExistingMatchingCard(function(c) return c:IsFaceup() and c:IsRace(RACE_DRAGON) and c:IsLevelAbove(5) and c:IsAbleToHand() end,
			tp,LOCATION_MZONE,0,1,nil) and Duel.IsExistingMatchingCard(Card.IsSpellTrap,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,e:GetHandler())
	end,
	prep=function(e,tp)
		Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_MZONE)
		local g=Duel.GetMatchingGroup(Card.IsSpellTrap,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,e:GetHandler())
		Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,#g,0,0)
	end,
	op=function(e,tp)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_RTOHAND)
		local g=Duel.SelectMatchingCard(tp,function(c) return c:IsFaceup() and c:IsRace(RACE_DRAGON) and c:IsLevelAbove(5) and c:IsAbleToHand() end,
			tp,LOCATION_MZONE,0,1,1,nil)
		local tc=g:GetFirst()
		if tc and Duel.SendtoHand(tc,nil,REASON_EFFECT)~=0 and tc:IsLocation(LOCATION_HAND) then
			local sg=Duel.GetMatchingGroup(Card.IsSpellTrap,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,e:GetHandler())
			Duel.Destroy(sg,REASON_EFFECT)
		end
	end}
R.Act.stray_lambs_tokens={cat=CATEGORY_TOKEN+CATEGORY_SPECIAL_SUMMON,
	check=function(e,tp)
		return not Duel.IsPlayerAffectedByEffect(tp,CARD_BLUEEYES_SPIRIT) and Duel.GetLocationCount(tp,LOCATION_MZONE)>1
			and Duel.IsPlayerCanSpecialSummonMonster(tp,60764582,0,TYPES_TOKEN,0,0,1,RACE_BEAST,ATTRIBUTE_EARTH)
	end,
	prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_TOKEN,nil,2,0,0) Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,2,tp,0) end,
	op=function(e,tp)
		if Duel.IsPlayerAffectedByEffect(tp,CARD_BLUEEYES_SPIRIT) or Duel.GetLocationCount(tp,LOCATION_MZONE)<=1
			or not Duel.IsPlayerCanSpecialSummonMonster(tp,60764582,0,TYPES_TOKEN,0,0,1,RACE_BEAST,ATTRIBUTE_EARTH) then return end
		for _,code in ipairs({60764582,60764583}) do
			local token=Duel.CreateToken(tp,code)
			Duel.SpecialSummonStep(token,0,tp,tp,false,false,POS_FACEUP_DEFENSE)
		end
		Duel.SpecialSummonComplete()
	end}
R.Act.scapegoat_tokens={cat=CATEGORY_TOKEN+CATEGORY_SPECIAL_SUMMON,
	check=function(e,tp)
		return not Duel.IsPlayerAffectedByEffect(tp,CARD_BLUEEYES_SPIRIT) and Duel.GetLocationCount(tp,LOCATION_MZONE)>3
			and Duel.IsPlayerCanSpecialSummonMonster(tp,73915052,0,TYPES_TOKEN,0,0,1,RACE_BEAST,ATTRIBUTE_EARTH)
	end,
	prep=function(e,tp)
		Duel.SetOperationInfo(0,CATEGORY_TOKEN,nil,4,0,0)
		Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,4,tp,0)
	end,
	op=function(e,tp)
		if Duel.IsPlayerAffectedByEffect(tp,CARD_BLUEEYES_SPIRIT) or Duel.GetLocationCount(tp,LOCATION_MZONE)<=3
			or not Duel.IsPlayerCanSpecialSummonMonster(tp,73915052,0,TYPES_TOKEN,0,0,1,RACE_BEAST,ATTRIBUTE_EARTH) then return end
		for code=73915052,73915055 do
			local token=Duel.CreateToken(tp,code)
			if Duel.SpecialSummonStep(token,0,tp,tp,false,false,POS_FACEUP_DEFENSE) then
				local e1=Effect.CreateEffect(e:GetHandler())
				e1:SetDescription(3304)
				e1:SetType(EFFECT_TYPE_SINGLE)
				e1:SetCode(EFFECT_UNRELEASABLE_SUM)
				e1:SetProperty(EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_CLIENT_HINT)
				e1:SetValue(1)
				e1:SetReset(RESET_EVENT|RESETS_STANDARD)
				token:RegisterEffect(e1,true)
			end
		end
		Duel.SpecialSummonComplete()
	end}
R.Act.royal_tribute={cat=CATEGORY_HANDES+CATEGORY_TOGRAVE,
	check=function(e,tp) return Duel.IsExistingMatchingCard(aux.TRUE,tp,LOCATION_HAND,LOCATION_HAND,1,e:GetHandler()) end,
	prep=function(e,tp)
		Duel.SetOperationInfo(0,CATEGORY_HANDES,nil,0,PLAYER_ALL,0)
		Duel.SetOperationInfo(0,CATEGORY_TOGRAVE,nil,1,PLAYER_ALL,LOCATION_HAND)
	end,
	op=function(e,tp)
		local g=Duel.GetMatchingGroup(Card.IsMonster,tp,LOCATION_HAND,LOCATION_HAND,nil)
		if #g>0 then Duel.SendtoGrave(g,REASON_EFFECT|REASON_DISCARD) end
	end}
R.Act.ss_dark_scorpions_unique={cat=CATEGORY_SPECIAL_SUMMON,
	check=function(e,tp)
		return Duel.GetLocationCount(tp,LOCATION_MZONE)>0 and Duel.IsExistingMatchingCard(function(c)
			return c:IsSetCard(SET_DARK_SCORPION) and c:IsCanBeSpecialSummoned(e,0,tp,false,false)
		end,tp,LOCATION_HAND,0,1,nil)
	end,
	prep=function(e,tp) Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_HAND) end,
	op=function(e,tp)
		local ft=Duel.GetLocationCount(tp,LOCATION_MZONE)
		if ft<=0 then return end
		local g=Duel.GetMatchingGroup(function(c) return c:IsSetCard(SET_DARK_SCORPION) and c:IsCanBeSpecialSummoned(e,0,tp,false,false) end,
			tp,LOCATION_HAND,0,nil)
		if #g==0 then return end
		local sg=aux.SelectUnselectGroup(g,e,tp,1,ft,aux.dncheck,1,tp,HINTMSG_SPSUMMON)
		Duel.SpecialSummon(sg,0,tp,tp,false,false,POS_FACEUP)
	end}

---------------------------------------------------------------- always-on effects
local function race_or_attr(p,field)
	return function(e,c) if p.race then return c:IsRace(p.race) end return c:IsAttribute(p.attr) end
end
R.Aura={
	half_battle_damage_to_opp=function(e)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_CHANGE_BATTLE_DAMAGE)
		e:SetValue(aux.ChangeBattleDamage(1,HALF_DAMAGE))
	end,
	self_atk_battle_phase=function(e,p)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_UPDATE_ATTACK)
		e:SetCondition(function(se)
			local c=se:GetHandler()
			return Duel.GetTurnPlayer()==c:GetControler() and Duel.IsBattlePhase()
		end)
		e:SetValue(p.n)
	end,
	rocket_warrior_protection=function(e,p,field,c)
		local function condition(se) return Duel.GetTurnPlayer()==se:GetHandlerPlayer() end
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_INDESTRUCTABLE_BATTLE)
		e:SetCondition(condition)
		e:SetValue(1)
		local e2=Effect.CreateEffect(c)
		e2:SetType(EFFECT_TYPE_SINGLE)
		e2:SetCode(EFFECT_AVOID_BATTLE_DAMAGE)
		e2:SetCondition(condition)
		e2:SetValue(1)
		c:RegisterEffect(e2)
	end,
	fairy_king_truesdale=function(e,p,field,c)
		local function target(se,tc) return tc:IsRace(RACE_PLANT) end
		local function condition(se) return se:GetHandler():IsDefensePos() end
		e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_UPDATE_ATTACK) e:SetRange(LOCATION_MZONE)
		e:SetTargetRange(LOCATION_MZONE,0) e:SetTarget(target) e:SetCondition(condition) e:SetValue(500)
		local e2=Effect.CreateEffect(c)
		e2:SetType(EFFECT_TYPE_FIELD) e2:SetCode(EFFECT_UPDATE_DEFENSE) e2:SetRange(LOCATION_MZONE)
		e2:SetTargetRange(LOCATION_MZONE,0) e2:SetTarget(target) e2:SetCondition(condition) e2:SetValue(500)
		c:RegisterEffect(e2)
	end,
	aura_race_atk=function(e,p,field)
		e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_UPDATE_ATTACK) e:SetTarget(race_or_attr(p))
		e:SetTargetRange(LOCATION_MZONE,field and LOCATION_MZONE or 0) e:SetValue(p.n)
	end,
	no_attack_level=function(e,p)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_CANNOT_ATTACK)
		e:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
		e:SetTarget(function(se,c) return c:IsLevelAbove(p.l) end)
	end,
	no_attack_atk_min=function(e,p)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_CANNOT_ATTACK)
		e:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
		e:SetTarget(function(se,c) return c:GetAttack()>=p.n end)
	end,
	destroy_lower_atk_attacker=function(e)
		e:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_F)
		e:SetCode(EVENT_DAMAGE_STEP_END)
		e:SetCategory(CATEGORY_DESTROY)
		e:SetCondition(function(se)
			local c=se:GetHandler()
			local bc=c:GetBattleTarget()
			return c:IsDefensePos() and bc and Duel.GetAttacker()==bc and bc:GetAttack()<c:GetDefense()
		end)
		e:SetOperation(function(se)
			local bc=se:GetHandler():GetBattleTarget()
			if bc and bc:IsRelateToBattle() then Duel.Destroy(bc,REASON_EFFECT) end
		end)
	end,
	destroy_lower_atk_attacker_facedown=function(e)
		e:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_F)
		e:SetCode(EVENT_DAMAGE_STEP_END)
		e:SetCategory(CATEGORY_DESTROY)
		e:SetCondition(function(se)
			local c=se:GetHandler()
			local a=Duel.GetAttacker()
			return Duel.GetAttackTarget()==c and c:GetBattlePosition()==POS_FACEDOWN_DEFENSE
				and a and a:GetAttack()<c:GetDefense()
		end)
		e:SetOperation(function(se)
			local a=Duel.GetAttacker()
			if a and a:IsRelateToBattle() then Duel.Destroy(a,REASON_EFFECT) end
		end)
	end,
	self_atk_per_equip=function(e)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_UPDATE_ATTACK)
		e:SetValue(function(se)
			local c=se:GetHandler()
			return c:GetEquipGroup():GetCount()*500
		end)
	end,
	opponent_attacker_base_atk_200=function(e)
		local c=e:GetHandler()
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_SET_BASE_ATTACK)
		e:SetRange(LOCATION_MZONE)
		e:SetTargetRange(0,LOCATION_MZONE)
		e:SetCondition(function(se)
			local ph=Duel.GetCurrentPhase()
			return (ph==PHASE_DAMAGE or ph==PHASE_DAMAGE_CAL)
				and Duel.GetTurnPlayer()~=se:GetHandlerPlayer() and Duel.GetAttackTarget()==c
		end)
		e:SetTarget(function(se,tc) return tc==c:GetBattleTarget() end)
		e:SetValue(200)
	end,
	negate_faceup_monster_effects=function(e)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_DISABLE)
		e:SetRange(LOCATION_SZONE)
		e:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
		e:SetTarget(function(se,c)
			return c:IsType(TYPE_EFFECT) or (c:GetOriginalType()&TYPE_EFFECT)==TYPE_EFFECT
		end)
	end,
	same_name_field_stat=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_UPDATE_ATTACK)
		e:SetRange(LOCATION_SZONE)
		e:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
		e:SetTarget(function(se,c)
			return c:IsFaceup() and Duel.IsExistingMatchingCard(function(tc)
				return tc:IsFaceup() and tc:IsCode(c:GetCode())
			end,0,LOCATION_MZONE,LOCATION_MZONE,1,c)
		end)
		e:SetValue(500)
		local e2=e:Clone()
		e2:SetCode(EFFECT_UPDATE_DEFENSE)
		c:RegisterEffect(e2)
	end,
	skull_invitation_damage=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		e:SetCode(EVENT_TO_GRAVE)
		e:SetRange(LOCATION_SZONE)
		e:SetOperation(function(se,tp,eg)
			local to_you=eg:FilterCount(function(tc,player) return tc:GetOwner()==player end,nil,tp)
			local to_opp=eg:FilterCount(function(tc,player) return tc:GetOwner()==player end,nil,1-tp)
			if to_you>0 then Duel.Damage(tp,to_you*300,REASON_EFFECT,true) end
			if to_opp>0 then Duel.Damage(1-tp,to_opp*300,REASON_EFFECT,true) end
			Duel.RDComplete()
		end)
	end,
	return_battle_damage_monster=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
		e:SetCode(EVENT_BATTLE_DAMAGE)
		e:SetProperty(EFFECT_FLAG_DAMAGE_STEP)
		e:SetRange(LOCATION_SZONE)
		e:SetCategory(CATEGORY_TOHAND)
		e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
			if chk==0 then return eg and eg:GetCount()>0 end
			Duel.SetTargetCard(eg)
			Duel.SetOperationInfo(0,CATEGORY_TOHAND,eg,eg:GetCount(),0,0)
		end)
		e:SetOperation(function(se,tp,eg)
			local tc=eg:GetFirst()
			if tc and tc:IsRelateToEffect(se) then Duel.SendtoHand(tc,nil,REASON_EFFECT) end
		end)
	end,
	curse_of_darkness_spell_damage=function(e,p,field,c)
		local e1=Effect.CreateEffect(c)
		e1:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		e1:SetCode(EVENT_CHAINING)
		e1:SetRange(LOCATION_SZONE)
		e1:SetOperation(aux.chainreg)
		c:RegisterEffect(e1)
		e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		e:SetCode(EVENT_CHAIN_SOLVED)
		e:SetRange(LOCATION_SZONE)
		e:SetOperation(function(se,tp,eg,ep,ev,re,r,rp)
			if re and re:IsHasType(EFFECT_TYPE_ACTIVATE) and re:IsSpellEffect()
				and se:GetHandler():GetFlagEffect(1)>0 then
				Duel.Damage(rp,1000,REASON_EFFECT)
			end
		end)
	end,
	no_bp_if_no_spells_gy=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_CANNOT_BP)
		e:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e:SetTargetRange(1,1)
		e:SetRange(LOCATION_SZONE)
		e:SetCondition(function(se)
			return not Duel.IsExistingMatchingCard(Card.IsSpell,se:GetHandlerPlayer(),LOCATION_GRAVE,0,1,nil)
		end)
	end,
	toll_attack_cost=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_ATTACK_COST)
		e:SetRange(LOCATION_SZONE)
		e:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e:SetTargetRange(1,1)
		e:SetCost(function(se,tc,tp) return Duel.CheckLPCost(tp,500) end)
		e:SetOperation(function(se,tp)
			if Duel.IsAttackCostPaid()~=2 and se:GetHandler():IsLocation(LOCATION_SZONE) then
				Duel.PayLPCost(tp,500)
				Duel.AttackCostPaid()
			end
		end)
	end,
	chain_energy_cost=function(e,p,field,c)
		local code=c:GetCode()
		local function check(se,te_or_c,tp)
			local n=#{Duel.GetPlayerEffect(tp,code)}
			if n==0 then n=1 end
			return Duel.CheckLPCost(tp,n*500)
		end
		local function pay(se,tp)
			Duel.Hint(HINT_CARD,0,code)
			Duel.PayLPCost(tp,500)
		end
		local activate=Effect.CreateEffect(c)
		activate:SetType(EFFECT_TYPE_FIELD)
		activate:SetCode(EFFECT_ACTIVATE_COST)
		activate:SetRange(LOCATION_SZONE)
		activate:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		activate:SetTargetRange(1,1)
		activate:SetTarget(function(se,te,tp) return te:GetHandler():IsLocation(LOCATION_HAND) end)
		activate:SetCost(check)
		activate:SetOperation(pay)
		c:RegisterEffect(activate)
		for _,costcode in ipairs({EFFECT_SUMMON_COST,EFFECT_SPSUMMON_COST,EFFECT_MSET_COST,EFFECT_SSET_COST}) do
			local ce=Effect.CreateEffect(c)
			ce:SetType(EFFECT_TYPE_FIELD)
			ce:SetCode(costcode)
			ce:SetRange(LOCATION_SZONE)
			ce:SetTargetRange(LOCATION_HAND,LOCATION_HAND)
			ce:SetCost(check)
			ce:SetOperation(pay)
			c:RegisterEffect(ce)
		end
		local marker=Effect.CreateEffect(c)
		marker:SetType(EFFECT_TYPE_FIELD)
		marker:SetCode(code)
		marker:SetRange(LOCATION_SZONE)
		marker:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		marker:SetTargetRange(1,1)
		c:RegisterEffect(marker)
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
	atk_per_race_count=function(e,p)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_UPDATE_ATTACK)
		e:SetTargetRange(LOCATION_MZONE,0)
		e:SetTarget(function(se,c) return c:IsFaceup() and c:IsRace(p.race) end)
		e:SetValue(function(se,c)
			return Duel.GetMatchingGroupCount(function(tc) return tc:IsFaceup() and tc:IsRace(p.count_mask) end,
				c:GetControler(),LOCATION_MZONE,0,nil)*200
		end)
	end,
	burn_on_recover=function(e,p)
		e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		e:SetCode(EVENT_RECOVER)
		e:SetCondition(function(se,tp,eg,ep) return ep==tp end)
		e:SetOperation(function(se,tp) Duel.Damage(1-tp,p.n,REASON_EFFECT) end)
	end,
	self_cannot_be_attacked_if_race=function(e,p)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
		e:SetRange(LOCATION_MZONE)
		e:SetCode(EFFECT_CANNOT_BE_BATTLE_TARGET)
		e:SetCondition(function(se)
			local c=se:GetHandler()
			return Duel.IsExistingMatchingCard(function(tc)
				return tc~=c and tc:IsFaceup() and tc:IsRace(p.race)
			end,c:GetControler(),LOCATION_MZONE,0,1,nil)
		end)
		e:SetValue(aux.imval1)
	end,
	stat_mod_aura_both=function(e,p)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(p.stat=='DEF' and EFFECT_UPDATE_DEFENSE or EFFECT_UPDATE_ATTACK)
		e:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
		e:SetTarget(function(se,c) return real_sel(c,p) end)
		e:SetValue(p.sign=='minus' and -p.n or p.n)
	end,
	your_stat_mod_aura=function(e,p)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(p.stat=='DEF' and EFFECT_UPDATE_DEFENSE or EFFECT_UPDATE_ATTACK)
		e:SetTargetRange(LOCATION_MZONE,0)
		e:SetTarget(function(se,c) return real_sel(c,p) end)
		e:SetValue(p.sign=='minus' and -p.n or p.n)
	end,
	non_effect_monsters_spell_immune=function(e)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_IMMUNE_EFFECT)
		e:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
		e:SetTarget(function(se,c) return not c:IsType(TYPE_EFFECT) end)
		e:SetValue(function(se,re) return re:IsSpellEffect() end)
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
	no_attack_summon_turn=function(e)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_CANNOT_ATTACK)
		e:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
		e:SetTarget(function(se,tc)
			return tc:IsStatus(STATUS_SUMMON_TURN+STATUS_FLIP_SUMMON_TURN+STATUS_SPSUMMON_TURN)
		end)
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
	self_atk_per_field_race=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_UPDATE_ATTACK)
		e:SetValue(function(se,sc)
			local ex=nil
			if not p.include_self then ex=sc end
			return Duel.GetMatchingGroupCount(Card.IsRace,sc:GetControler(),LOCATION_MZONE,LOCATION_MZONE,ex,p.race)*(p.n or 500)
		end)
	end,
	cannot_be_tributed=function(e,p,field,c)
		for _,code in ipairs({EFFECT_UNRELEASABLE_SUM,EFFECT_UNRELEASABLE_NONSUM}) do
			local e1=Effect.CreateEffect(c) e1:SetType(EFFECT_TYPE_SINGLE) e1:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
			e1:SetRange(LOCATION_MZONE) e1:SetCode(code) e1:SetValue(1) c:RegisterEffect(e1)
		end
	end,
	self_atk_per_gy_monsters=function(e,p)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_UPDATE_ATTACK)
		e:SetValue(function(se,c)
			return Duel.GetMatchingGroupCount(Card.IsType,c:GetControler(),LOCATION_GRAVE,0,nil,TYPE_MONSTER)*300
		end)
	end,
	self_stats_per_banished=function(e,p,field,c)
		local function value(se,sc)
			return Duel.GetFieldGroupCount(sc:GetControler(),LOCATION_REMOVED,0)*(p.n or 0)
		end
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_SET_ATTACK)
		e:SetValue(value)
		local e2=Effect.CreateEffect(c)
		e2:SetType(EFFECT_TYPE_SINGLE)
		e2:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
		e2:SetRange(LOCATION_MZONE)
		e2:SetCode(EFFECT_SET_DEFENSE)
		e2:SetValue(value)
		c:RegisterEffect(e2)
	end,
	maiden_of_aqua_environment=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_CHANGE_ENVIRONMENT)
		e:SetValue(CARD_UMI)
		e:SetRange(LOCATION_MZONE)
	end,
	self_indes_battle_equal_atk=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_INDESTRUCTABLE_BATTLE)
		e:SetValue(function(se,bc)
			local sc=se:GetHandler()
			return bc and bc:GetAttack()==sc:GetAttack()
		end)
	end,
	atk_bonus_attacking_wind=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
		e:SetRange(LOCATION_MZONE)
		e:SetCode(EFFECT_UPDATE_ATTACK)
		e:SetCondition(function(se)
			local at=Duel.GetAttacker()
			local ph=Duel.GetCurrentPhase()
			local tc=Duel.GetAttackTarget()
			return (ph==PHASE_DAMAGE or ph==PHASE_DAMAGE_CAL) and at==c and tc and tc:IsFaceup() and tc:IsAttribute(ATTRIBUTE_WIND)
		end)
		e:SetValue(1000)
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
	avoid_battle_damage_with_monster=function(e)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_AVOID_BATTLE_DAMAGE)
		e:SetRange(LOCATION_SZONE)
		e:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e:SetTargetRange(1,0)
		e:SetCondition(function(se)
			return Duel.GetFieldGroupCount(se:GetHandlerPlayer(),LOCATION_MZONE,0)>0
		end)
	end,
	pierce_dragons=function(e)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_PIERCE)
		e:SetRange(LOCATION_SZONE)
		e:SetTargetRange(LOCATION_MZONE,0)
		e:SetTarget(aux.TargetBoolFunction(Card.IsRace,RACE_DRAGON))
	end,
	mask_of_restrict=function(e)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_CANNOT_RELEASE)
		e:SetRange(LOCATION_SZONE)
		e:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e:SetTargetRange(1,1)
	end,
	solemn_wishes=function(e)
		e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		e:SetProperty(EFFECT_FLAG_DELAY)
		e:SetRange(LOCATION_SZONE)
		e:SetCode(EVENT_DRAW)
		e:SetOperation(function(se,tp,eg,ep)
			if ep==tp then Duel.Recover(tp,500,REASON_EFFECT) end
		end)
	end,
	coffin_seller=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
		e:SetRange(LOCATION_SZONE)
		e:SetCode(EVENT_TO_GRAVE)
		e:SetCondition(function(se,tp,eg)
			return eg:IsExists(function(tc,op) return tc:IsMonster() and tc:IsControler(1-op) end,1,nil,tp)
		end)
		e:SetTarget(function(se) return se:GetHandler():IsRelateToEffect(se) end)
		e:SetOperation(function(se,tp)
			if se:GetHandler():IsRelateToEffect(se) then Duel.Damage(1-tp,300,REASON_EFFECT) end
		end)
	end,
	remove_brainwashing=function(e)
		Duel.EnableGlobalFlag(GLOBALFLAG_BRAINWASHING_CHECK)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_REMOVE_BRAINWASHING)
		e:SetProperty(EFFECT_FLAG_SET_AVAILABLE)
		e:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
	end,
	final_attack_orders=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_SET_POSITION)
		e:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
		e:SetValue(POS_FACEUP_ATTACK)
		local e2=e:Clone()
		e2:SetCode(EFFECT_CANNOT_CHANGE_POSITION)
		e2:SetRange(LOCATION_SZONE)
		c:RegisterEffect(e2)
	end,
	emperor_holiday=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_DISABLE)
		e:SetTargetRange(LOCATION_SZONE,LOCATION_SZONE)
		e:SetTarget(function(se,tc) return tc~=c and tc:IsType(TYPE_EQUIP) end)
		local e2=Effect.CreateEffect(c)
		e2:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		e2:SetCode(EVENT_CHAIN_SOLVING)
		e2:SetRange(LOCATION_SZONE)
		e2:SetOperation(function(se,tp,eg,ep,ev,re)
			local tl=Duel.GetChainInfo(ev,CHAININFO_TRIGGERING_LOCATION)
			if tl==LOCATION_SZONE and re:IsActiveType(TYPE_EQUIP) and re:GetHandler()~=c then Duel.NegateEffect(ev) end
		end)
		c:RegisterEffect(e2)
	end,
	royal_command=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		e:SetCode(EVENT_CHAIN_ACTIVATING)
		e:SetRange(LOCATION_SZONE)
		e:SetOperation(function(se,tp,eg,ep,ev,re)
			if re:IsActiveType(TYPE_FLIP) then Duel.NegateActivation(ev) end
		end)
	end,
	chain_burst=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		e:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
		e:SetCode(EVENT_CHAINING)
		e:SetOperation(aux.chainreg)
		local e2=Effect.CreateEffect(c)
		e2:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		e2:SetCode(EVENT_CHAIN_SOLVED)
		e2:SetRange(LOCATION_SZONE)
		e2:SetOperation(function(se,tp,eg,ep,ev,re,r,rp)
			if re:IsHasType(EFFECT_TYPE_ACTIVATE) and re:IsTrapEffect() and c:GetFlagEffect(1)>0 then
				Duel.Damage(rp,1000,REASON_EFFECT)
			end
		end)
		c:RegisterEffect(e2)
	end,
	equip_lock_opp_position=function(e)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetProperty(EFFECT_FLAG_SET_AVAILABLE)
		e:SetCode(EFFECT_CANNOT_CHANGE_POSITION)
		e:SetTargetRange(0,LOCATION_MZONE)
	end,
	demotion=function(e)
		e:SetType(EFFECT_TYPE_EQUIP)
		e:SetCode(EFFECT_UPDATE_LEVEL)
		e:SetValue(-2)
	end,
	mage_power=function(e,p,field,c)
		local value=function(se)
			return Duel.GetMatchingGroupCount(Card.IsSpellTrap,se:GetHandlerPlayer(),LOCATION_ONFIELD,0,nil)*500
		end
		e:SetType(EFFECT_TYPE_EQUIP)
		e:SetCode(EFFECT_UPDATE_ATTACK)
		e:SetValue(value)
		local e2=e:Clone()
		e2:SetCode(EFFECT_UPDATE_DEFENSE)
		c:RegisterEffect(e2)
	end,
	stim_pack=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_EQUIP)
		e:SetCode(EFFECT_UPDATE_ATTACK)
		e:SetValue(p.n or 700)
		local reset=Effect.CreateEffect(c)
		reset:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		reset:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
		reset:SetCode(EVENT_EQUIP)
		reset:SetRange(LOCATION_SZONE)
		reset:SetLabelObject(e)
		reset:SetOperation(function(se,tp,eg)
			if eg:IsContains(c) then se:GetLabelObject():SetValue(p.n or 700) end
		end)
		c:RegisterEffect(reset)
		local decay=Effect.CreateEffect(c)
		decay:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		decay:SetCode(EVENT_PHASE+PHASE_STANDBY)
		decay:SetRange(LOCATION_SZONE)
		decay:SetCountLimit(1)
		decay:SetLabelObject(e)
		decay:SetCondition(function(se,tp) return Duel.IsTurnPlayer(tp) end)
		decay:SetOperation(function(se)
			local atk=se:GetLabelObject():GetValue()
			se:GetLabelObject():SetValue(atk-(p.d or 200))
		end)
		c:RegisterEffect(decay)
	end,
	germ_infection=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_EQUIP)
		e:SetCode(EFFECT_UPDATE_ATTACK)
		e:SetValue(0)
		local reset=Effect.CreateEffect(c)
		reset:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		reset:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
		reset:SetCode(EVENT_EQUIP)
		reset:SetRange(LOCATION_SZONE)
		reset:SetLabelObject(e)
		reset:SetOperation(function(se,tp,eg)
			if eg:IsContains(c) then se:GetLabelObject():SetValue(0) end
		end)
		c:RegisterEffect(reset)
		local decay=Effect.CreateEffect(c)
		decay:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		decay:SetCode(EVENT_PHASE+PHASE_STANDBY)
		decay:SetRange(LOCATION_SZONE)
		decay:SetCountLimit(1)
		decay:SetLabelObject(e)
		decay:SetCondition(function(se,tp) return Duel.IsTurnPlayer(tp) end)
		decay:SetOperation(function(se)
			local atk=se:GetLabelObject():GetValue()
			se:GetLabelObject():SetValue(atk-300)
		end)
		c:RegisterEffect(decay)
	end,
	lightning_blade=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_UPDATE_ATTACK)
		e:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
		e:SetTarget(aux.TargetBoolFunction(Card.IsAttribute,ATTRIBUTE_WATER))
		e:SetValue(-500)
	end,
	united_we_stand=function(e,p,field,c)
		local value=function(se)
			return Duel.GetMatchingGroupCount(Card.IsFaceup,se:GetHandler():GetControler(),LOCATION_MZONE,0,nil)*800
		end
		e:SetType(EFFECT_TYPE_EQUIP)
		e:SetCode(EFFECT_UPDATE_ATTACK)
		e:SetValue(value)
		local e2=e:Clone()
		e2:SetCode(EFFECT_UPDATE_DEFENSE)
		c:RegisterEffect(e2)
	end,
	rod_of_minds_eye=function(e)
		e:SetType(EFFECT_TYPE_EQUIP)
		e:SetCode(EFFECT_CHANGE_BATTLE_DAMAGE)
		e:SetValue(aux.ChangeBattleDamage(1,1000))
	end,
	mask_of_brutality_upkeep=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		e:SetProperty(EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_UNCOPYABLE)
		e:SetCode(EVENT_PHASE+PHASE_STANDBY)
		e:SetCountLimit(1)
		e:SetCondition(function(se,tp) return Duel.IsTurnPlayer(tp) end)
		e:SetOperation(function(se,tp)
			if Duel.CheckLPCost(tp,1000) and Duel.SelectYesNo(tp,aux.Stringid(c:GetOriginalCode(),0)) then
				Duel.PayLPCost(tp,1000)
			else
				Duel.Destroy(c,REASON_COST)
			end
		end)
	end,
	mask_of_accursed=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_EQUIP)
		e:SetCode(EFFECT_CANNOT_ATTACK)
		local e2=Effect.CreateEffect(c)
		e2:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
		e2:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e2:SetCode(EVENT_PHASE+PHASE_STANDBY)
		e2:SetRange(LOCATION_SZONE)
		e2:SetCountLimit(1)
		e2:SetCondition(function(se,tp) return Duel.IsTurnPlayer(tp) and c:GetEquipTarget()~=nil end)
		e2:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
			if chk==0 then return true end
			local pl=c:GetEquipTarget():GetControler()
			Duel.SetTargetPlayer(pl)
			Duel.SetTargetParam(500)
			Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,pl,500)
		end)
		e2:SetOperation(function(se,tp)
			if not c:IsRelateToEffect(se) or not c:GetEquipTarget() then return end
			local pl,dam=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)
			Duel.Damage(pl,dam,REASON_EFFECT)
		end)
		c:RegisterEffect(e2)
	end,
	ballista_rampart_smashing=function(e)
		e:SetType(EFFECT_TYPE_EQUIP)
		e:SetCode(EFFECT_UPDATE_ATTACK)
		e:SetCondition(function(se)
			if Duel.GetCurrentPhase()~=PHASE_DAMAGE_CAL then return false end
			local eqc=se:GetHandler():GetEquipTarget()
			local at=Duel.GetAttacker()
			local de=Duel.GetAttackTarget()
			return de and at==eqc and de:GetBattlePosition()==POS_FACEDOWN_DEFENSE
		end)
		e:SetValue(1500)
	end,
	royal_decree=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_DISABLE)
		e:SetTargetRange(LOCATION_SZONE,LOCATION_SZONE)
		e:SetTarget(function(se,tc) return tc~=c and tc:IsTrap() end)
		local e2=Effect.CreateEffect(c)
		e2:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		e2:SetCode(EVENT_CHAIN_SOLVING)
		e2:SetRange(LOCATION_SZONE)
		e2:SetOperation(function(se,tp,eg,ep,ev,re)
			local tl=Duel.GetChainInfo(ev,CHAININFO_TRIGGERING_LOCATION)
			if tl==LOCATION_SZONE and re:IsTrapEffect() and re:GetHandler()~=c then Duel.NegateEffect(ev) end
		end)
		c:RegisterEffect(e2)
		local e3=Effect.CreateEffect(c)
		e3:SetType(EFFECT_TYPE_FIELD)
		e3:SetCode(EFFECT_DISABLE_TRAPMONSTER)
		e3:SetRange(LOCATION_SZONE)
		e3:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
		e3:SetTarget(function(se,tc) return tc~=c and tc:IsType(TYPE_TRAP) end)
		c:RegisterEffect(e3)
	end,
	des_counterblow=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
		e:SetCode(EVENT_BATTLE_DAMAGE)
		e:SetCategory(CATEGORY_DESTROY)
		e:SetCondition(function() return Duel.GetAttackTarget()==nil end)
		e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
			if chk==0 then return true end
			Duel.SetTargetCard(eg)
			Duel.SetOperationInfo(0,CATEGORY_DESTROY,eg,1,0,0)
		end)
		e:SetOperation(function(se,tp,eg)
			local tc=eg:GetFirst()
			if tc and tc:IsRelateToEffect(se) then Duel.Destroy(tc,REASON_EFFECT) end
		end)
	end,
	astral_barrier=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O)
		e:SetCode(EVENT_ATTACK_ANNOUNCE)
		e:SetCondition(function(se,tp)
			local at=Duel.GetAttacker()
			local tg=Duel.GetAttackTarget()
			return at and at:IsControler(1-tp) and tg and tg:IsControler(tp)
		end)
		e:SetTarget(function(se)
			return not Duel.GetAttacker():IsHasEffect(EFFECT_CANNOT_DIRECT_ATTACK)
		end)
		e:SetOperation(function(se)
			if c:IsRelateToEffect(se) then Duel.ChangeAttackTarget(nil) end
		end)
	end,
	cannot_direct_attack=function(e)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_CANNOT_DIRECT_ATTACK)
	end,
	attack_all_opp_monsters=function(e)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_ATTACK_ALL)
		e:SetValue(1)
	end,
	double_tribute_light=function(e)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_DOUBLE_TRIBUTE)
		e:SetValue(function(se,tc) return tc:IsAttribute(ATTRIBUTE_LIGHT) end)
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
	no_player_targets_dragons=function(e)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetProperty(EFFECT_FLAG_IGNORE_IMMUNE)
		e:SetCode(EFFECT_CANNOT_BE_EFFECT_TARGET)
		e:SetRange(LOCATION_MZONE)
		e:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
		e:SetTarget(aux.TargetBoolFunction(Card.IsRace,RACE_DRAGON))
		e:SetValue(1)
	end,
	opp_cannot_banish_gy=function(e)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e:SetCode(EFFECT_CANNOT_REMOVE)
		e:SetRange(LOCATION_MZONE)
		e:SetTargetRange(0,1)
		e:SetTarget(function(se,tc) return tc:IsLocation(LOCATION_GRAVE) end)
	end,
	opp_cannot_target_set=function(e,p)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetProperty(EFFECT_FLAG_IGNORE_IMMUNE)
		e:SetCode(EFFECT_CANNOT_BE_EFFECT_TARGET)
		e:SetRange(LOCATION_MZONE)
		e:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
		e:SetTarget(function(se,tc) return tc:IsSetCard(p.setcode) end)
		e:SetValue(aux.tgoval)
	end,
	self_atk_if_attr=function(e,p)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
		e:SetRange(LOCATION_MZONE)
		e:SetCode(EFFECT_UPDATE_ATTACK)
		e:SetValue(p.n)
		e:SetCondition(function()
			return Duel.IsExistingMatchingCard(function(c) return c:IsFaceup() and c:IsAttribute(p.attr) end,
				0,LOCATION_MZONE,LOCATION_MZONE,1,nil)
		end)
	end,
	self_def_after_attack=function(e,p,field,c)
		local e1=Effect.CreateEffect(c)
		e1:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_CONTINUOUS)
		e1:SetCode(EVENT_DAMAGE_STEP_END)
		e1:SetCondition(function(se)
			local sc=se:GetHandler()
			return Duel.GetAttacker()==sc and sc:IsRelateToBattle()
		end)
		e1:SetOperation(function(se)
			local sc=se:GetHandler()
			if sc:IsFaceup() and sc:IsAttackPos() then Duel.ChangePosition(sc,POS_FACEUP_DEFENSE) end
		end)
		c:RegisterEffect(e1)
	end,
	pierce_friendly_races=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_PIERCE)
		e:SetRange(LOCATION_MZONE)
		e:SetTargetRange(LOCATION_MZONE,0)
		e:SetTarget(function(se,tc) return real_sel(tc,p) end)
	end,
	self_no_control_change_if_attr=function(e,p)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
		e:SetRange(LOCATION_MZONE)
		e:SetCode(EFFECT_CANNOT_CHANGE_CONTROL)
		e:SetCondition(function()
			return Duel.IsExistingMatchingCard(function(c) return c:IsFaceup() and c:IsAttribute(p.attr) end,
				0,LOCATION_MZONE,LOCATION_MZONE,1,nil)
		end)
	end,
	self_no_control_change=function(e)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
		e:SetRange(LOCATION_MZONE)
		e:SetCode(EFFECT_CANNOT_CHANGE_CONTROL)
	end,
	name_treated_as=function(e,p)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
		e:SetCode(EFFECT_CHANGE_CODE)
		e:SetRange(LOCATION_MZONE)
		e:SetValue(p.codes[1])
	end,
	banish_battle_destroyed_monsters=function(e)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
		e:SetRange(LOCATION_MZONE)
		e:SetCode(EFFECT_BATTLE_DESTROY_REDIRECT)
		e:SetValue(LOCATION_REMOVED)
	end,
	archfiend_setcode=function(e)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_ADD_SETCODE)
		e:SetValue(0x45)
	end,
	self_indes_battle_atk_min=function(e,p)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_INDESTRUCTABLE_BATTLE)
		e:SetValue(function(_,c) return c:GetAttack()>=p.n end)
	end,
	negate_battled_flip_monster=function(e)
		e:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_CONTINUOUS)
		e:SetCode(EVENT_BATTLED)
		e:SetOperation(function(se)
			local c=se:GetHandler()
			local bc=c:GetBattleTarget()
			if bc and bc:IsStatus(STATUS_BATTLE_DESTROYED) and bc:IsType(TYPE_FLIP) then
				for _,code in ipairs({EFFECT_DISABLE,EFFECT_DISABLE_EFFECT}) do
					local e1=Effect.CreateEffect(c)
					e1:SetType(EFFECT_TYPE_SINGLE)
					e1:SetCode(code)
					e1:SetReset(RESET_EVENT|RESETS_STANDARD_EXC_GRAVE)
					bc:RegisterEffect(e1)
				end
			end
		end)
	end,
	battled_opponent_cannot_attack=function(e)
		e:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_CONTINUOUS)
		e:SetCode(EVENT_BATTLED)
		e:SetOperation(function(se)
			local c=se:GetHandler()
			local bc=c:GetBattleTarget()
			if not bc then return end
			local e1=Effect.CreateEffect(c)
			e1:SetType(EFFECT_TYPE_SINGLE)
			e1:SetCode(EFFECT_CANNOT_ATTACK_ANNOUNCE)
			e1:SetReset(RESETS_STANDARD_PHASE_END|RESET_SELF_TURN,2)
			bc:RegisterEffect(e1)
		end)
	end,
	opp_cannot_draw_except_draw_phase=function(e)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e:SetCode(EFFECT_CANNOT_DRAW)
		e:SetTargetRange(0,1)
		e:SetCondition(function() return Duel.GetCurrentPhase()~=PHASE_DRAW end)
	end,
	reveal_both_hands=function(e)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_PUBLIC)
		e:SetTargetRange(LOCATION_HAND,LOCATION_HAND)
	end,
	self_atk_per_gy_sel=function(e,p)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_UPDATE_ATTACK)
		e:SetValue(function()
			local filter=p.race and function(c) return c:IsRace(p.race) end
				or function(c) return c:IsType(TYPE_MONSTER) end
			local n=Duel.GetMatchingGroupCount(filter,0,LOCATION_GRAVE,LOCATION_GRAVE,nil)
			return n*(p.n or 0)
		end)
	end,
	self_atk_per_named_gy=function(e,p)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_UPDATE_ATTACK)
		e:SetValue(function()
			local n=Duel.GetMatchingGroupCount(real_sel,0,LOCATION_GRAVE,LOCATION_GRAVE,nil,p)
			return n*(p.n or 0)
		end)
	end,
	choose_opp_attack_targets=function(e)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e:SetCode(EFFECT_PATRICIAN_OF_DARKNESS)
		e:SetTargetRange(0,1)
	end,
	self_extra_attack_one=function(e,p)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_EXTRA_ATTACK)
		e:SetValue(1)
		if p.umi then e:SetCondition(function() return Duel.IsEnvironment(CARD_UMI) end) end
	end,
	all_battle_destroyed_to_deck=function(e)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetProperty(EFFECT_FLAG_IGNORE_IMMUNE)
		e:SetCode(EFFECT_TO_GRAVE_REDIRECT)
		e:SetRange(LOCATION_MZONE)
		e:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
		e:SetTarget(function(_,c) return c:IsReason(REASON_BATTLE) end)
		e:SetValue(LOCATION_DECKSHF)
	end,
	self_atk_def_per_selector=function(e,p,field,c)
		local function amount()
			local tp=e:GetHandlerPlayer()
			local l1,l2=real_locs(p)
			local n=Duel.GetMatchingGroupCount(real_sel,tp,l1,l2,nil,p)
			return n
		end
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_UPDATE_ATTACK)
		e:SetValue(function() return amount()*(p.n or 0) end)
		if (p.def_n or 0)~=0 then
			local e2=Effect.CreateEffect(c)
			e2:SetType(EFFECT_TYPE_SINGLE)
			e2:SetCode(EFFECT_UPDATE_DEFENSE)
			e2:SetValue(function() return amount()*p.def_n end)
			c:RegisterEffect(e2)
		end
	end,
	double_tribute_attribute=function(e,p)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_DOUBLE_TRIBUTE)
		e:SetValue(function(_,tc) return tc:IsAttribute(p.attr) end)
	end,
	self_lp_cost_to_attack=function(e,p)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_ATTACK_COST)
		e:SetCost(function(_,_,tp) return Duel.CheckLPCost(tp,p.n) end)
		e:SetOperation(function(se,tp)
			if Duel.IsAttackCostPaid()~=2 and se:GetHandler():IsLocation(LOCATION_MZONE) then
				Duel.PayLPCost(tp,p.n)
				Duel.AttackCostPaid()
			end
		end)
	end,
	self_atk_def_per_hand=function(e,p,field,c)
		local function amount()
			return Duel.GetFieldGroupCount(e:GetHandlerPlayer(),LOCATION_HAND,0)*(p.n or 0)
		end
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_UPDATE_ATTACK)
		e:SetValue(amount)
		local e2=Effect.CreateEffect(c)
		e2:SetType(EFFECT_TYPE_SINGLE)
		e2:SetCode(EFFECT_UPDATE_DEFENSE)
		e2:SetValue(amount)
		c:RegisterEffect(e2)
	end,
	self_lose_atk_def_per_hand=function(e,p,field,c)
		local function amount()
			return Duel.GetFieldGroupCount(e:GetHandlerPlayer(),LOCATION_HAND,0)*(p.n or 0)
		end
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_UPDATE_ATTACK)
		e:SetValue(function() return -amount() end)
		local e2=Effect.CreateEffect(c)
		e2:SetType(EFFECT_TYPE_SINGLE)
		e2:SetCode(EFFECT_UPDATE_DEFENSE)
		e2:SetValue(function() return -amount() end)
		c:RegisterEffect(e2)
	end,
	berserk_gorilla_rules=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_MUST_ATTACK)
		local e2=Effect.CreateEffect(c)
		e2:SetType(EFFECT_TYPE_SINGLE)
		e2:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
		e2:SetRange(LOCATION_MZONE)
		e2:SetCode(EFFECT_SELF_DESTROY)
		e2:SetCondition(function(se) return se:GetHandler():IsDefensePos() end)
		c:RegisterEffect(e2)
	end,
	spell_immune_while_umi=function(e)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_IMMUNE_EFFECT)
		e:SetCondition(function() return Duel.IsEnvironment(CARD_UMI) end)
		e:SetValue(function(_,te) return te:IsSpellEffect() end)
	end,
	reveal_opp_hand=function(e)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_PUBLIC)
		e:SetTargetRange(0,LOCATION_HAND)
	end,
	self_direct_while_umi=function(e)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_DIRECT_ATTACK)
		e:SetCondition(function() return Duel.IsEnvironment(CARD_UMI) end)
	end,
	opp_cannot_activate_quickplay=function(e)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e:SetCode(EFFECT_CANNOT_ACTIVATE)
		e:SetTargetRange(0,1)
		e:SetValue(function(_,re) return re:GetHandler():IsQuickPlaySpell() and re:IsHasType(EFFECT_TYPE_ACTIVATE) end)
	end,
	opp_monsters_cannot_attack_summon_turn=function(e)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_CANNOT_ATTACK)
		e:SetTargetRange(0,LOCATION_MZONE)
		e:SetTarget(function(_,c) return c:IsStatus(STATUS_SUMMON_TURN+STATUS_FLIP_SUMMON_TURN+STATUS_SPSUMMON_TURN) end)
	end,
	self_atk_when_battling_attr=function(e,p)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
		e:SetRange(LOCATION_MZONE)
		e:SetCode(EFFECT_UPDATE_ATTACK)
		e:SetCondition(function(se)
			local phase=Duel.GetCurrentPhase()
			if not (phase==PHASE_DAMAGE or phase==PHASE_DAMAGE_CAL) then return false end
			local c=se:GetHandler()
			local bc=c:GetBattleTarget()
			return c:IsRelateToBattle() and bc and bc:IsFaceup() and bc:IsAttribute(p.attr)
		end)
		e:SetValue(p.n)
	end,
	self_atk_if_empty_hand_st=function(e,p)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
		e:SetRange(LOCATION_MZONE)
		e:SetCode(EFFECT_UPDATE_ATTACK)
		e:SetCondition(function(se)
			local tp=se:GetHandlerPlayer()
			return Duel.GetFieldGroupCount(tp,LOCATION_HAND,0)
				+Duel.GetMatchingGroupCount(function(c) return c:GetSequence()<5 end,tp,LOCATION_SZONE,0,nil)==0
		end)
		e:SetValue(p.n)
	end,
	self_atk_per_opp_race_field_gy=function(e,p)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
		e:SetRange(LOCATION_MZONE)
		e:SetCode(EFFECT_UPDATE_ATTACK)
		e:SetValue(function(se,c)
			local tp=c:GetControler()
			local n=Duel.GetMatchingGroupCount(function(tc)
				return tc:IsRace(p.race) and (tc:IsLocation(LOCATION_GRAVE) or tc:IsFaceup())
			end,tp,0,LOCATION_GRAVE|LOCATION_MZONE,nil)
			return n*(p.n or 0)
		end)
	end,
	self_atk_when_race_destroyed=function(e,p)
		e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
		e:SetCode(EVENT_DESTROYED)
		e:SetRange(LOCATION_MZONE)
		e:SetCondition(function(_,tp,eg)
			return eg and eg:IsExists(function(tc,player,race,side)
				return tc:IsPreviousLocation(LOCATION_MZONE) and tc:IsPreviousPosition(POS_FACEUP)
					and (side=='both' or tc:IsPreviousControler(player))
					and (tc:GetPreviousRaceOnField()&race)~=0
			end,1,nil,tp,p.race,p.side)
		end)
		e:SetTarget(function(se) local c=se:GetHandler() return c:IsRelateToEffect(se) and c:IsFaceup() end)
		e:SetOperation(function(se)
			local c=se:GetHandler()
			if c:IsFaceup() and c:IsRelateToEffect(se) then
				local e1=Effect.CreateEffect(c)
				e1:SetType(EFFECT_TYPE_SINGLE)
				e1:SetProperty(EFFECT_FLAG_COPY_INHERIT)
				e1:SetCode(EFFECT_UPDATE_ATTACK)
				e1:SetReset(RESET_EVENT|RESETS_STANDARD)
				e1:SetValue(p.n or 0)
				c:RegisterEffect(e1)
			end
		end)
	end,
	destroy_battle_target_selector=function(e,p)
		e:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_F)
		e:SetCode(p.attacking_only and EVENT_BATTLED or EVENT_DAMAGE_STEP_END)
		e:SetCategory(CATEGORY_DESTROY)
		e:SetCondition(function(se)
			local c=se:GetHandler()
			if p.attacking_only and Duel.GetAttacker()~=c then return false end
			local tc=c:GetBattleTarget()
			if not tc then return false end
			if p.attr then return tc:IsAttribute(p.attr) end
			return p.race and tc:IsRace(p.race)
		end)
		e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
			local tc=se:GetHandler():GetBattleTarget()
			if chk==0 then return tc and tc:IsRelateToBattle() end
			if tc then Duel.SetOperationInfo(0,CATEGORY_DESTROY,tc,1,0,0) end
		end)
		e:SetOperation(function(se)
			local tc=se:GetHandler():GetBattleTarget()
			if tc and tc:IsRelateToBattle() then Duel.Destroy(tc,REASON_EFFECT) end
		end)
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
	equip_indes_effect=function(e) e:SetType(EFFECT_TYPE_EQUIP) e:SetCode(EFFECT_INDESTRUCTABLE_EFFECT) e:SetValue(1) end,
	equip_direct=function(e) e:SetType(EFFECT_TYPE_EQUIP) e:SetCode(EFFECT_DIRECT_ATTACK) end,
	equip_no_attack_non_machine=function(e)
		e:SetType(EFFECT_TYPE_EQUIP)
		e:SetCode(EFFECT_CANNOT_ATTACK)
		e:SetCondition(function(se)
			local tc=se:GetHandler():GetEquipTarget()
			return tc and not tc:IsRace(RACE_MACHINE)
		end)
	end,
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
	toon_direct_summon_lock=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_DIRECT_ATTACK)
		e:SetCondition(function(se)
			local tp=c:GetControler()
			return Duel.IsExistingMatchingCard(aux.FaceupFilter(Card.IsCode,15259703),tp,LOCATION_ONFIELD,0,1,nil)
				and not Duel.IsExistingMatchingCard(aux.FaceupFilter(Card.IsType,TYPE_TOON),tp,0,LOCATION_MZONE,1,nil)
		end)
		local codes={EVENT_SUMMON_SUCCESS,EVENT_FLIP_SUMMON_SUCCESS,EVENT_SPSUMMON_SUCCESS}
		local e1=Effect.CreateEffect(c)
		e1:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_CONTINUOUS)
		e1:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
		e1:SetCode(codes[1])
		e1:SetOperation(function(se)
			local e2=Effect.CreateEffect(c)
			e2:SetType(EFFECT_TYPE_SINGLE)
			e2:SetCode(EFFECT_CANNOT_ATTACK)
			e2:SetReset(RESETS_STANDARD_PHASE_END)
			c:RegisterEffect(e2)
		end)
		c:RegisterEffect(e1)
		for i=2,#codes do
			local ec=e1:Clone() ec:SetCode(codes[i]) c:RegisterEffect(ec)
		end
	end,
	goblin_king_stats=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
		e:SetRange(LOCATION_MZONE)
		e:SetCode(EFFECT_SET_ATTACK)
		e:SetValue(function(se,sc)
			return Duel.GetMatchingGroupCount(function(tc) return tc:IsFaceup() and tc:IsRace(RACE_FIEND) end,
				sc:GetControler(),LOCATION_MZONE,LOCATION_MZONE,sc)*1000
		end)
		local e2=Effect.CreateEffect(c)
		e2:SetType(EFFECT_TYPE_SINGLE)
		e2:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
		e2:SetRange(LOCATION_MZONE)
		e2:SetCode(EFFECT_SET_DEFENSE)
		e2:SetValue(function(se,sc)
			return Duel.GetMatchingGroupCount(function(tc) return tc:IsFaceup() and tc:IsRace(RACE_FIEND) end,
				sc:GetControler(),LOCATION_MZONE,LOCATION_MZONE,sc)*1000
		end)
		c:RegisterEffect(e2)
	end,
	goblin_king_protection=function(e,p,field,c)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
		e:SetRange(LOCATION_MZONE)
		e:SetCode(EFFECT_CANNOT_BE_BATTLE_TARGET)
		e:SetCondition(function(se)
			return Duel.IsExistingMatchingCard(function(tc) return tc:IsFaceup() and tc:IsRace(RACE_FIEND) end,
				c:GetControler(),LOCATION_MZONE,0,1,c)
		end)
		e:SetValue(aux.imval1)
	end,
	umi_fisherman=function(e,p,field,c)
		local has_umi=function() return Duel.IsEnvironment(CARD_UMI) end
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
		e:SetRange(LOCATION_MZONE)
		e:SetCode(EFFECT_IMMUNE_EFFECT)
		e:SetCondition(has_umi)
		e:SetValue(function(se,re) return re:IsSpellEffect() end)
		local e2=Effect.CreateEffect(c)
		e2:SetType(EFFECT_TYPE_SINGLE)
		e2:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
		e2:SetRange(LOCATION_MZONE)
		e2:SetCode(EFFECT_IGNORE_BATTLE_TARGET)
		e2:SetCondition(has_umi)
		e2:SetValue(1)
		c:RegisterEffect(e2)
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
	battle_damage_is_effect=function(e,p)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_BATTLE_DAMAGE_TO_EFFECT)
	end,
	self_direct_always=function(e)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_DIRECT_ATTACK)
	end,
	black_tyranno_direct_attack=function(e)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_DIRECT_ATTACK)
		e:SetCondition(function(se)
			local tp=se:GetHandler():GetControler()
			return Duel.GetFieldGroupCount(tp,0,LOCATION_SZONE)==0
				and not Duel.IsExistingMatchingCard(Card.IsAttackPos,tp,0,LOCATION_MZONE,1,nil)
		end)
	end,
	shadowslayer_direct_attack=function(e)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_DIRECT_ATTACK)
		e:SetCondition(function(se)
			local tp=se:GetHandler():GetControler()
			return not Duel.IsExistingMatchingCard(Card.IsAttackPos,tp,0,LOCATION_MZONE,1,nil)
		end)
	end,
	emissary_of_oasis=function(e,p,field,c)
		local function low_normal(tc) return tc:IsType(TYPE_NORMAL) and tc:IsLevelBelow(3) end
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_CANNOT_BE_BATTLE_TARGET)
		e:SetCondition(function(se)
			return Duel.IsExistingMatchingCard(function(tc)
				return tc:IsFaceup() and low_normal(tc)
			end,se:GetHandlerPlayer(),LOCATION_MZONE,0,1,nil)
		end)
		e:SetValue(aux.imval1)
		local e2=Effect.CreateEffect(c)
		e2:SetType(EFFECT_TYPE_FIELD)
		e2:SetCode(EFFECT_AVOID_BATTLE_DAMAGE)
		e2:SetRange(LOCATION_MZONE)
		e2:SetTargetRange(LOCATION_MZONE,0)
		e2:SetTarget(function(se,tc) return low_normal(tc) end)
		e2:SetValue(1)
		c:RegisterEffect(e2)
		local e3=Effect.CreateEffect(c)
		e3:SetType(EFFECT_TYPE_FIELD)
		e3:SetCode(EFFECT_NO_BATTLE_DAMAGE)
		e3:SetRange(LOCATION_MZONE)
		e3:SetTargetRange(0,LOCATION_MZONE)
		e3:SetTarget(function(se,tc) return low_normal(tc) end)
		c:RegisterEffect(e3)
	end,
	self_cannot_be_battle_target=function(e)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_CANNOT_BE_BATTLE_TARGET)
		e:SetValue(1)
	end,
	protect_other_race_from_attack=function(e,p)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_CANNOT_SELECT_BATTLE_TARGET)
		e:SetRange(LOCATION_MZONE)
		e:SetTargetRange(0,LOCATION_MZONE)
		e:SetValue(function(se,tc)
			return tc~=se:GetHandler() and tc:IsFaceup() and tc:IsRace(p.race)
		end)
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
	indes_battle_equal_attack=function(e)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_INDESTRUCTABLE_BATTLE)
		e:SetTargetRange(LOCATION_MZONE,0)
		e:SetTarget(function(se,c) se:SetLabel(c:GetAttack()) return true end)
		e:SetValue(function(se,c) return c:GetAttack()==se:GetLabel() end)
	end,
	recover_on_monster_return=function(e,tp,eg,ep,ev,re,r,rp,chk)
		e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
		e:SetCode(EVENT_TO_HAND)
		e:SetCondition(function(se,stp,seg)
			return seg and seg:IsExists(function(tc) return tc:IsMonster() and tc:IsPreviousLocation(LOCATION_MZONE) end,1,nil)
		end)
		e:SetTarget(function(se,stp,seg,sep,sev,sre,sr,srp,schk)
			if schk==0 then return true end
			Duel.SetOperationInfo(0,CATEGORY_RECOVER,nil,0,stp,500)
		end)
		e:SetOperation(function(se,stp) Duel.Recover(stp,500,REASON_EFFECT) end)
	end,
	dark_room_bonus_damage=function(e,tp,eg,ep,ev,re,r,rp,chk)
		e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
		e:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e:SetCode(EVENT_DAMAGE)
		e:SetCondition(function(se,stp,seg,sep,sev,sre,sr)
			return sep==1-stp and (sr&REASON_BATTLE)==0 and sre and sre:GetHandler()~=se:GetHandler() and sre:GetLabel()~=937202
		end)
		e:SetTarget(function(se,stp,seg,sep,sev,sre,sr,srp,schk)
			if schk==0 then return true end
			Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,1-stp,300)
		end)
		e:SetOperation(function(se,stp)
			if se:GetHandler():IsRelateToEffect(se) then Duel.Damage(1-stp,300,REASON_EFFECT) end
		end)
	end,
	no_hand_limit=function(e)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e:SetCode(EFFECT_HAND_LIMIT)
		e:SetTargetRange(1,1)
		e:SetValue(100)
	end,
	spell_absorption=function(e,p,field,c)
		local e0=Effect.CreateEffect(c)
		e0:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		e0:SetCode(EVENT_CHAINING)
		e0:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
		e0:SetRange(LOCATION_SZONE)
		e0:SetOperation(aux.chainreg)
		c:RegisterEffect(e0)
		e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		e:SetCode(EVENT_CHAIN_SOLVED)
		e:SetRange(LOCATION_SZONE)
		e:SetCondition(function(se,tp,eg,ep,ev,re)
			return re and re:IsSpellEffect() and re:IsHasType(EFFECT_TYPE_ACTIVATE)
				and re:GetHandler()~=se:GetHandler() and se:GetHandler():GetFlagEffect(1)>0
		end)
		e:SetOperation(function(se) Duel.Recover(se:GetHandlerPlayer(),500,REASON_EFFECT) end)
	end,
	recover_opp_discard=function(e)
		e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
		e:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e:SetCode(EVENT_TO_GRAVE)
		e:SetCondition(function(se,tp,eg,ep,ev,re,r,rp)
			return rp~=tp and eg and eg:IsExists(function(tc,player)
				return tc:IsPreviousLocation(LOCATION_HAND) and tc:IsControler(player)
					and tc:IsReason(REASON_EFFECT) and tc:IsReason(REASON_DISCARD)
			end,1,nil,tp)
		end)
		e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
			if chk==0 then return se:GetHandler():IsRelateToEffect(se) end
			Duel.SetTargetPlayer(tp)
			Duel.SetTargetParam(1000)
			Duel.SetOperationInfo(0,CATEGORY_RECOVER,nil,0,tp,1000)
		end)
		e:SetOperation(function(se,tp)
			if se:GetHandler():IsRelateToEffect(se) then Duel.Recover(tp,1000,REASON_EFFECT) end
		end)
	end,
	spell_economics=function(e)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e:SetCode(EFFECT_LPCOST_CHANGE)
		e:SetTargetRange(1,0)
		e:SetValue(function(se,re,rp,val)
			if re and re:IsHasType(EFFECT_TYPE_ACTIVATE) and re:GetHandler():IsSpell() and not mustpay then return 0 end
			return val
		end)
	end,
	opp_attack_target_named=function(e,p)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_CANNOT_SELECT_BATTLE_TARGET)
		e:SetTargetRange(0,LOCATION_MZONE)
		e:SetCondition(function(se)
			local tp=se:GetHandlerPlayer()
			return Duel.IsExistingMatchingCard(function(tc,codes)
				return tc:IsFaceup() and tc:IsCode(table.unpack(codes))
			end,tp,LOCATION_MZONE,0,1,nil,p.codes)
		end)
		e:SetValue(function(se,tc)
			return tc:IsFacedown() or not tc:IsCode(table.unpack(p.codes))
		end)
	end,
	heart_of_underdog=function(e)
		e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O)
		e:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e:SetCode(EVENT_DRAW)
		e:SetCondition(function(se,tp) return Duel.IsTurnPlayer(tp) and Duel.IsPhase(PHASE_DRAW) end)
		e:SetCost(function(se,tp,eg,ep,ev,re,r,rp,chk)
			local function normal_hidden(tc) return tc:IsType(TYPE_NORMAL) and not tc:IsPublic() end
			if chk==0 then return ep==tp and eg and eg:IsExists(normal_hidden,1,nil) end
			local g=eg:Filter(normal_hidden,nil)
			if #g==1 then Duel.ConfirmCards(1-tp,g)
			else
				Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_CONFIRM)
				local sg=g:Select(tp,1,1,nil)
				Duel.ConfirmCards(1-tp,sg)
			end
			Duel.ShuffleHand(tp)
		end)
		e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
			if chk==0 then return Duel.IsPlayerCanDraw(tp,1) end
			Duel.SetTargetPlayer(tp)
			Duel.SetTargetParam(1)
			Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,tp,1)
		end)
		e:SetOperation(function(se,tp)
			if se:GetHandler():IsRelateToEffect(se) then Duel.Draw(tp,1,REASON_EFFECT) end
		end)
	end,
	opp_attack_deck_cost=function(e,p,field,c)
		local code=c:GetCode()
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_ATTACK_COST)
		e:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e:SetTargetRange(0,1)
		e:SetCost(function(se,attacker,tp)
			local count=#{Duel.GetPlayerEffect(tp,code)}
			return count>0 and Duel.IsPlayerCanDiscardDeckAsCost(tp,count)
		end)
		e:SetOperation(function(se,tp)
			if Duel.IsAttackCostPaid()~=2 and se:GetHandler():IsLocation(LOCATION_SZONE) then
				Duel.DiscardDeck(tp,1,REASON_COST)
				Duel.AttackCostPaid()
			end
		end)
		local e3=Effect.CreateEffect(c)
		e3:SetType(EFFECT_TYPE_FIELD)
		e3:SetCode(code)
		e3:SetRange(LOCATION_SZONE)
		e3:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		e3:SetTargetRange(0,1)
		c:RegisterEffect(e3)
	end,
	one_attack_per_battle_phase=function(e,p,field,c)
		local code=c:GetCode()
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetProperty(EFFECT_FLAG_IGNORE_IMMUNE)
		e:SetCode(EFFECT_CANNOT_ATTACK_ANNOUNCE)
		e:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
		e:SetCondition(function() return c:GetFlagEffect(code)~=0 end)
		e:SetTarget(function(se,tc) return tc:GetFieldID()~=se:GetLabel() end)
		local e3=Effect.CreateEffect(c)
		e3:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		e3:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
		e3:SetCode(EVENT_ATTACK_ANNOUNCE)
		e3:SetRange(LOCATION_SZONE)
		e3:SetOperation(function(se,tp,eg)
			if c:GetFlagEffect(code)~=0 then return end
			local attacker=eg and eg:GetFirst()
			if not attacker then return end
			c:RegisterFlagEffect(code,RESETS_STANDARD_PHASE_END,0,1)
			e:SetLabel(attacker:GetFieldID())
		end)
		c:RegisterEffect(e3)
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
	fusilier_no_tribute={reg=function(c)
		local e=Effect.CreateEffect(c)
		e:SetProperty(EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_UNCOPYABLE)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_SUMMON_PROC)
		e:SetCondition(function(se,sc,minc)
			if sc==nil then return true end
			return minc==0 and sc:GetLevel()>4 and Duel.GetLocationCount(sc:GetControler(),LOCATION_MZONE)>0
		end)
		e:SetOperation(function(se,tp,eg,ep,ev,re,r,rp,sc)
			local function halve(code,value)
				local e1=Effect.CreateEffect(sc)
				e1:SetType(EFFECT_TYPE_SINGLE)
				e1:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
				e1:SetRange(LOCATION_MZONE)
				e1:SetReset(RESET_EVENT|RESETS_STANDARD_DISABLE-RESET_TOFIELD)
				e1:SetCode(code)
				e1:SetValue(value)
				sc:RegisterEffect(e1)
			end
			halve(EFFECT_SET_BASE_ATTACK,1400)
			halve(EFFECT_SET_BASE_DEFENSE,1000)
		end)
		c:RegisterEffect(e)
		local e2=e:Clone()
		e2:SetCode(EFFECT_SET_PROC)
		c:RegisterEffect(e2)
	end},
	ss_banish_attr_gy={reg=function(c,rand,p)
		c:EnableReviveLimit()
		local locations=LOCATION_GRAVE|(p.field and LOCATION_MZONE or 0)
		local filter=function(tc,tp)
			return tc:IsAttribute(p.attr) and tc:IsAbleToRemoveAsCost() and aux.SpElimFilter(tc,true)
				and (Duel.GetLocationCount(tp,LOCATION_MZONE)>0 or (p.field and tc:IsLocation(LOCATION_MZONE) and tc:GetSequence()<5))
		end
		local e=Effect.CreateEffect(c)
		e:SetType(EFFECT_TYPE_FIELD)
		e:SetCode(EFFECT_SPSUMMON_PROC)
		e:SetProperty(EFFECT_FLAG_UNCOPYABLE)
		e:SetRange(LOCATION_HAND)
		e:SetCondition(function(se,sc)
			if sc==nil then return true end
			local tp=sc:GetControler()
			return Duel.IsExistingMatchingCard(filter,tp,locations,0,1,nil,tp)
		end)
		e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,sc)
			local g=Duel.GetMatchingGroup(filter,tp,locations,0,nil,tp)
			local sg=aux.SelectUnselectGroup(g,se,tp,1,1,aux.ChkfMMZ(1),1,tp,HINTMSG_REMOVE,nil,nil,true)
			if #sg==0 then return false end
			sg:KeepAlive()
			se:SetLabelObject(sg)
			return true
		end)
		e:SetOperation(function(se)
			local g=se:GetLabelObject()
			if not g then return end
			Duel.Remove(g,POS_FACEUP,REASON_COST)
			g:DeleteGroup()
		end)
		c:RegisterEffect(e)
	end},
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
R.Rule.ss_banish_attr_gy_or_field=R.Rule.ss_banish_attr_gy
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
R.Rule.first_sarcophagus={reg=function(c,rand,p,range) assemble(c,rand,p,range,'opp',true) end}
R.Rule.spirit_return={reg=function(c)
	Spirit.AddProcedure(c,EVENT_SUMMON_SUCCESS,EVENT_FLIP)
end}
R.Rule.equip_return_top={reg=function(c)
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_F)
	e:SetCode(EVENT_TO_GRAVE)
	e:SetCategory(CATEGORY_TODECK)
	e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return se:GetHandler():IsAbleToDeck() end
		Duel.SetOperationInfo(0,CATEGORY_TODECK,se:GetHandler(),1,0,0)
	end)
	e:SetOperation(function(se)
		local tc=se:GetHandler()
		if tc:IsRelateToEffect(se) then Duel.SendtoDeck(tc,nil,SEQ_DECKTOP,REASON_EFFECT) end
	end)
	c:RegisterEffect(e)
end}
R.Rule.equip_return_top_pay={reg=function(c)
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_O)
	e:SetProperty(EFFECT_FLAG_DAMAGE_STEP)
	e:SetCode(EVENT_TO_GRAVE)
	e:SetCategory(CATEGORY_TODECK)
	e:SetCondition(function(se) return se:GetHandler():IsPreviousLocation(LOCATION_ONFIELD) end)
	e:SetCost(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return Duel.CheckLPCost(tp,500) end
		Duel.PayLPCost(tp,500)
	end)
	e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return se:GetHandler():IsAbleToDeck() end
		Duel.SetOperationInfo(0,CATEGORY_TODECK,se:GetHandler(),1,0,0)
	end)
	e:SetOperation(function(se)
		local tc=se:GetHandler()
		if tc:IsRelateToEffect(se) then Duel.SendtoDeck(tc,nil,SEQ_DECKTOP,REASON_EFFECT) end
	end)
	c:RegisterEffect(e)
end}
R.Rule.draw_if_flipped_battle_destroyed={reg=function(c)
	local flag=c:GetCode()
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_CONTINUOUS)
	e1:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
	e1:SetCode(EVENT_FLIP)
	e1:SetOperation(function(se) se:GetHandler():RegisterFlagEffect(flag,RESET_EVENT|RESETS_STANDARD_EXC_GRAVE,0,0) end)
	c:RegisterEffect(e1)
	local e2=Effect.CreateEffect(c)
	e2:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_F)
	e2:SetCode(EVENT_BATTLE_DESTROYED)
	e2:SetCategory(CATEGORY_DRAW)
	e2:SetCondition(function(se)
		local sc=se:GetHandler()
		return sc:IsLocation(LOCATION_GRAVE) and sc:IsReason(REASON_BATTLE) and sc:GetFlagEffect(flag)~=0
	end)
	e2:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return Duel.IsPlayerCanDraw(tp) end
		Duel.SetTargetPlayer(tp)
		Duel.SetTargetParam(1)
		Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,tp,1)
	end)
	e2:SetOperation(function(se,tp)
		local player,count=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)
		Duel.Draw(player,count,REASON_EFFECT)
	end)
	c:RegisterEffect(e2)
end}
R.Rule.senri_eye={reg=function(c,rand,p,range)
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O)
	e:SetCode(EVENT_PHASE+PHASE_STANDBY)
	e:SetRange(range)
	e:SetCountLimit(1)
	e:SetCondition(function(se,tp)
		return Duel.IsTurnPlayer(tp) and Duel.GetFieldGroupCount(tp,0,LOCATION_DECK)~=0
	end)
	e:SetCost(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return Duel.CheckLPCost(tp,100) end
		Duel.PayLPCost(tp,100)
	end)
	e:SetOperation(function(se,tp)
		if not se:GetHandler():IsRelateToEffect(se) then return end
		local g=Duel.GetDecktopGroup(1-tp,1)
		if #g>0 then Duel.ConfirmCards(tp,g) end
	end)
	c:RegisterEffect(e)
end}
R.Aura.continuous_destroy_weaker_attacker=function(e,p,field,c)
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
	e:SetCode(EVENT_DAMAGE_STEP_END)
	e:SetRange(LOCATION_SZONE)
	e:SetCondition(function(se,tp)
		local a=Duel.GetAttacker()
		local at=Duel.GetAttackTarget()
		return at and a and a:IsControler(1-tp) and a:IsRelateToBattle()
			and at:IsDefensePos() and at:IsRelateToBattle() and a:GetAttack()<at:GetDefense()
	end)
	e:SetOperation(function(se) Duel.Destroy(Duel.GetAttacker(),REASON_EFFECT) end)
end
R.Aura.double_battle_damage_when_attacked=function(e)
	e:SetType(EFFECT_TYPE_SINGLE)
	e:SetCode(EFFECT_CHANGE_BATTLE_DAMAGE)
	e:SetCondition(function(se) return Duel.GetAttackTarget()==se:GetHandler() end)
	e:SetValue(aux.ChangeBattleDamage(1,DOUBLE_DAMAGE))
end
R.Rule.nuvia_the_wicked={reg=function(c)
	local atk=Effect.CreateEffect(c)
	atk:SetType(EFFECT_TYPE_SINGLE)
	atk:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
	atk:SetRange(LOCATION_MZONE)
	atk:SetCode(EFFECT_UPDATE_ATTACK)
	atk:SetValue(function(se)
		return Duel.GetFieldGroupCount(c:GetControler(),0,LOCATION_MZONE)*-200
	end)
	c:RegisterEffect(atk)
	local destroy=Effect.CreateEffect(c)
	destroy:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_F)
	destroy:SetCode(EVENT_SUMMON_SUCCESS)
	destroy:SetCategory(CATEGORY_DESTROY)
	destroy:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return true end
		Duel.SetOperationInfo(0,CATEGORY_DESTROY,se:GetHandler(),1,0,0)
	end)
	destroy:SetOperation(function(se)
		local tc=se:GetHandler()
		if tc:IsRelateToEffect(se) then Duel.Destroy(tc,REASON_EFFECT) end
	end)
	c:RegisterEffect(destroy)
end}
R.Rule.minor_goblin_official={reg=function(c,rand,p,range,cond,act)
	if act then
		act:SetCondition(function(se,tp) return Duel.GetLP(1-tp)<=3000 end)
	end
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
	e:SetCode(EVENT_PHASE+PHASE_STANDBY)
	e:SetRange(range)
	e:SetCondition(function(se,tp) return Duel.IsTurnPlayer(1-tp) end)
	e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return true end
		Duel.SetTargetPlayer(1-tp)
		Duel.SetTargetParam(500)
		Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,1-tp,500)
	end)
	e:SetOperation(function(se,tp)
		local player,amount=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)
		Duel.Damage(player,amount,REASON_EFFECT)
	end)
	c:RegisterEffect(e)
end}
R.Rule.two_man_cell_battle={reg=function(c,rand,p,range)
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O)
	e:SetCode(EVENT_PHASE+PHASE_END)
	e:SetRange(range)
	e:SetCondition(function(se,tp)
		local player=Duel.GetTurnPlayer()
		return player~=PLAYER_NONE and Duel.GetLocationCount(player,LOCATION_MZONE)>0
			and Duel.IsExistingMatchingCard(function(tc)
				return tc:IsType(TYPE_MONSTER+TYPE_NORMAL) and tc:IsLevel(4)
					and tc:IsCanBeSpecialSummoned(se,0,player,false,false)
			end,player,LOCATION_HAND,0,1,nil)
	end)
	e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		local player=Duel.GetTurnPlayer()
		if chk==0 then return Duel.GetLocationCount(player,LOCATION_MZONE)>0 end
		Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,player,LOCATION_HAND)
	end)
	e:SetOperation(function(se)
		local player=Duel.GetTurnPlayer()
		if Duel.GetLocationCount(player,LOCATION_MZONE)<=0 then return end
		Duel.Hint(HINT_SELECTMSG,player,HINTMSG_SPSUMMON)
		local g=Duel.SelectMatchingCard(player,function(tc)
			return tc:IsType(TYPE_MONSTER+TYPE_NORMAL) and tc:IsLevel(4)
				and tc:IsCanBeSpecialSummoned(se,0,player,false,false)
		end,player,LOCATION_HAND,0,1,1,nil)
		if #g>0 then Duel.SpecialSummon(g,0,player,player,false,false,POS_FACEUP) end
	end)
	c:RegisterEffect(e)
end}
R.Rule.inspection={reg=function(c,rand,p,range)
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O)
	e:SetCode(EVENT_PHASE+PHASE_STANDBY)
	e:SetRange(range)
	e:SetCountLimit(1)
	e:SetCondition(function(se,tp)
		return Duel.IsTurnPlayer(1-tp) and Duel.GetFieldGroupCount(tp,0,LOCATION_HAND)~=0
	end)
	e:SetCost(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return Duel.CheckLPCost(tp,500) end
		Duel.PayLPCost(tp,500)
	end)
	e:SetOperation(function(se,tp)
		if not se:GetHandler():IsRelateToEffect(se) then return end
		local g=Duel.GetFieldGroup(tp,0,LOCATION_HAND):RandomSelect(tp,1)
		if #g>0 then Duel.ConfirmCards(tp,g) Duel.ShuffleHand(1-tp) end
	end)
	c:RegisterEffect(e)
end}
R.Rule.recycle_nonmonster_gy={reg=function(c,rand,p,range)
	local filter=function(tc) return tc:IsAbleToDeck() and not tc:IsMonster() end
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O)
	e:SetCode(EVENT_PHASE+PHASE_STANDBY)
	e:SetRange(range)
	e:SetProperty(EFFECT_FLAG_CARD_TARGET)
	e:SetCountLimit(1)
	e:SetCondition(function(se,tp) return Duel.IsTurnPlayer(tp) end)
	e:SetCost(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return Duel.CheckLPCost(tp,300) end
		Duel.PayLPCost(tp,300)
	end)
	e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk,chkc)
		if chkc then return chkc:IsControler(tp) and chkc:IsLocation(LOCATION_GRAVE) and filter(chkc) end
		if chk==0 then return Duel.IsExistingTarget(filter,tp,LOCATION_GRAVE,0,1,nil) end
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TODECK)
		local g=Duel.SelectTarget(tp,filter,tp,LOCATION_GRAVE,0,1,1,nil)
		Duel.SetOperationInfo(0,CATEGORY_TODECK,g,1,0,0)
	end)
	e:SetOperation(function(se,tp)
		if not se:GetHandler():IsRelateToEffect(se) then return end
		local tc=Duel.GetFirstTarget()
		if tc and tc:IsRelateToEffect(se) then Duel.SendtoDeck(tc,nil,SEQ_DECKBOTTOM,REASON_EFFECT) end
	end)
	c:RegisterEffect(e)
end}
R.Rule.dust_barrier={reg=function(c,rand,p,range,cond,act)
	local immune=Effect.CreateEffect(c)
	immune:SetType(EFFECT_TYPE_FIELD)
	immune:SetCode(EFFECT_IMMUNE_EFFECT)
	immune:SetRange(LOCATION_SZONE)
	immune:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
	immune:SetTarget(function(se,tc) return tc:IsType(TYPE_NORMAL) end)
	immune:SetValue(function(se,re)
		return re:IsSpellEffect() and re:GetOwnerPlayer()~=se:GetHandlerPlayer()
	end)
	c:RegisterEffect(immune)
	if not act then return end
	act:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return true end
		local timer=Effect.CreateEffect(c)
		timer:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		timer:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
		timer:SetCode(EVENT_PHASE+PHASE_STANDBY)
		timer:SetCountLimit(1)
		timer:SetRange(LOCATION_SZONE)
		timer:SetCondition(function(te,player) return player==Duel.GetTurnPlayer() end)
		timer:SetOperation(function(te)
			local tc=te:GetHandler()
			local count=tc:GetTurnCounter()+1
			tc:SetTurnCounter(count)
			if count==2 then Duel.Destroy(tc,REASON_EFFECT) end
		end)
		timer:SetReset(RESET_EVENT|RESETS_STANDARD|RESET_PHASE|PHASE_STANDBY|RESET_SELF_TURN,2)
		c:RegisterEffect(timer)
	end)
end}
R.Rule.equip_send_field_damage={reg=function(c,rand,p)
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_F)
	e:SetCode(EVENT_TO_GRAVE)
	e:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e:SetCategory(CATEGORY_DAMAGE)
	e:SetCondition(function(se) return se:GetHandler():IsPreviousLocation(LOCATION_ONFIELD) end)
	e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return true end
		Duel.SetTargetPlayer(1-tp)
		Duel.SetTargetParam(p.n)
		Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,1-tp,p.n)
	end)
	e:SetOperation(function(se,tp)
		local player,amount=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)
		Duel.Damage(player,amount,REASON_EFFECT)
	end)
	c:RegisterEffect(e)
end}
R.Rule.equip_send_field_recover={reg=function(c,rand,p)
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_F)
	e:SetCode(EVENT_TO_GRAVE)
	e:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e:SetCategory(CATEGORY_RECOVER)
	e:SetCondition(function(se) return se:GetHandler():IsPreviousLocation(LOCATION_ONFIELD) end)
	e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return true end
		Duel.SetTargetPlayer(tp)
		Duel.SetTargetParam(p.n)
		Duel.SetOperationInfo(0,CATEGORY_RECOVER,nil,0,tp,p.n)
	end)
	e:SetOperation(function(se,tp)
		local player,amount=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)
		Duel.Recover(player,amount,REASON_EFFECT)
	end)
	c:RegisterEffect(e)
end}
R.Rule.equip_battle_damage_recover={reg=function(c,rand,p,range)
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
	e:SetCode(EVENT_BATTLE_DAMAGE)
	e:SetRange(range)
	e:SetCategory(CATEGORY_RECOVER)
	e:SetCondition(function(se,tp,eg,ep)
		local ec=se:GetHandler():GetEquipTarget()
		return ec and eg and eg:IsContains(ec) and ep~=tp
	end)
	e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return true end
		Duel.SetTargetPlayer(tp)
		Duel.SetTargetParam(ev)
		Duel.SetOperationInfo(0,CATEGORY_RECOVER,nil,0,tp,ev)
	end)
	e:SetOperation(function(se)
		local player,amount=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)
		Duel.Recover(player,amount,REASON_EFFECT)
	end)
	c:RegisterEffect(e)
end}
R.Rule.swords_concealing={reg=function(c,rand,p,range,cond,act)
	if not act then return end
	act:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return true end
		c:SetTurnCounter(0)
		local g=Duel.GetMatchingGroup(Card.IsCanTurnSet,tp,0,LOCATION_MZONE,nil)
		Duel.SetOperationInfo(0,CATEGORY_POSITION,g,#g,0,0)
		local timer=Effect.CreateEffect(c)
		timer:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		timer:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
		timer:SetCode(EVENT_PHASE+PHASE_STANDBY)
		timer:SetCountLimit(1)
		timer:SetRange(LOCATION_SZONE)
		timer:SetCondition(function(te,player) return player==Duel.GetTurnPlayer() end)
		timer:SetOperation(function(te)
			local tc=te:GetHandler()
			local count=tc:GetTurnCounter()+1
			tc:SetTurnCounter(count)
			if count==2 then Duel.Destroy(tc,REASON_RULE) end
		end)
		timer:SetReset(RESET_EVENT|RESETS_STANDARD|RESET_PHASE|PHASE_STANDBY|RESET_SELF_TURN,2)
		c:RegisterEffect(timer)
	end)
	act:SetOperation(function(se,tp)
		if not se:GetHandler():IsRelateToEffect(se) then return end
		local g=Duel.GetMatchingGroup(Card.IsCanTurnSet,tp,0,LOCATION_MZONE,nil)
		if #g>0 then Duel.ChangePosition(g,POS_FACEDOWN_DEFENSE) end
	end)
	local lock=Effect.CreateEffect(c)
	lock:SetType(EFFECT_TYPE_FIELD)
	lock:SetRange(LOCATION_SZONE)
	lock:SetCode(EFFECT_CANNOT_CHANGE_POSITION)
	lock:SetProperty(EFFECT_FLAG_SET_AVAILABLE)
	lock:SetTargetRange(0,LOCATION_MZONE)
	c:RegisterEffect(lock)
end}
R.Rule.dangerous_machine_type6={reg=function(c,rand,p,range)
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
	e:SetCode(EVENT_PHASE+PHASE_STANDBY)
	e:SetRange(range)
	e:SetCountLimit(1)
	e:SetCondition(function(se,tp) return Duel.IsTurnPlayer(tp) end)
	e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return true end
		Duel.SetOperationInfo(0,CATEGORY_DICE,nil,0,tp,1)
	end)
	e:SetOperation(function(se,tp)
		if not se:GetHandler():IsRelateToEffect(se) then return end
		local result=Duel.TossDice(tp,1)
		if result==1 or result==2 then
			local player=result==1 and tp or 1-tp
			if Duel.GetFieldGroupCount(player,LOCATION_HAND,0)>0 then
				Duel.DiscardHand(player,nil,1,1,REASON_EFFECT|REASON_DISCARD)
			end
		elseif result==3 or result==4 then
			Duel.Draw(result==3 and tp or 1-tp,1,REASON_EFFECT)
		elseif result==5 then
			if Duel.IsExistingMatchingCard(Card.IsDestructable,tp,0,LOCATION_MZONE,1,nil) then
				Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)
				local g=Duel.SelectMatchingCard(tp,Card.IsDestructable,tp,0,LOCATION_MZONE,1,1,nil)
				if #g>0 then Duel.Destroy(g,REASON_EFFECT) end
			end
		else
			Duel.Destroy(se:GetHandler(),REASON_EFFECT)
		end
	end)
	c:RegisterEffect(e)
end}
R.Rule.weapon_change={reg=function(c,rand,p,range)
	local filter=function(tc) return tc:IsFaceup() and tc:IsRace(RACE_MACHINE|RACE_WARRIOR) and tc:IsDefenseAbove(0) end
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O)
	e:SetCode(EVENT_PHASE+PHASE_STANDBY)
	e:SetProperty(EFFECT_FLAG_CARD_TARGET)
	e:SetRange(range)
	e:SetCountLimit(1)
	e:SetCondition(function(se,tp) return Duel.IsTurnPlayer(tp) end)
	e:SetCost(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return Duel.CheckLPCost(tp,700) end
		Duel.PayLPCost(tp,700)
	end)
	e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk,chkc)
		if chkc then return chkc:IsControler(tp) and chkc:IsLocation(LOCATION_MZONE) and filter(chkc) end
		if chk==0 then return Duel.IsExistingTarget(filter,tp,LOCATION_MZONE,0,1,nil) end
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_FACEUP)
		Duel.SelectTarget(tp,filter,tp,LOCATION_MZONE,0,1,1,nil)
	end)
	e:SetOperation(function(se,tp)
		if not se:GetHandler():IsRelateToEffect(se) then return end
		local tc=Duel.GetFirstTarget()
		if not tc or not tc:IsFaceup() or not tc:IsRelateToEffect(se) then return end
		local atk,def=tc:GetAttack(),tc:GetDefense()
		local e1=Effect.CreateEffect(se:GetHandler())
		e1:SetType(EFFECT_TYPE_SINGLE)
		e1:SetCode(EFFECT_SET_ATTACK_FINAL)
		e1:SetValue(def)
		e1:SetReset(RESETS_STANDARD_PHASE_END,2)
		tc:RegisterEffect(e1)
		local e2=Effect.CreateEffect(se:GetHandler())
		e2:SetType(EFFECT_TYPE_SINGLE)
		e2:SetCode(EFFECT_SET_DEFENSE_FINAL)
		e2:SetValue(atk)
		e2:SetReset(RESETS_STANDARD_PHASE_END,2)
		tc:RegisterEffect(e2)
	end)
	c:RegisterEffect(e)
end}
R.Rule.ectoplasmer={reg=function(c,rand,p,range)
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
	e:SetProperty(EFFECT_FLAG_BOTH_SIDE)
	e:SetCode(EVENT_PHASE+PHASE_END)
	e:SetRange(range)
	e:SetCountLimit(1)
	e:SetCategory(CATEGORY_RELEASE+CATEGORY_DAMAGE)
	e:SetCondition(function(se,tp) return Duel.IsTurnPlayer(tp) end)
	e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return true end
		Duel.SetOperationInfo(0,CATEGORY_RELEASE,nil,1,tp,LOCATION_MZONE)
	end)
	e:SetOperation(function(se,tp)
		if not se:GetHandler():IsRelateToEffect(se) then return end
		local filter=function(tc,eff) return tc:IsFaceup() and tc:IsReleasableByEffect() and not tc:IsImmuneToEffect(eff) end
		local g=Duel.SelectReleaseGroup(tp,filter,1,1,se:GetHandler(),se)
		if g and Duel.Release(g,REASON_EFFECT)>0 then
			local atk=g:GetFirst():GetBaseAttack()/2
			Duel.Damage(1-tp,atk,REASON_EFFECT)
		end
	end)
	c:RegisterEffect(e)
end}
R.Rule.spiral_spear_strike={reg=function(c,rand,p,range)
	local pierce=Effect.CreateEffect(c)
	pierce:SetType(EFFECT_TYPE_FIELD)
	pierce:SetCode(EFFECT_PIERCE)
	pierce:SetRange(range)
	pierce:SetTargetRange(LOCATION_MZONE,0)
	pierce:SetTarget(function(se,tc) return tc:IsCode(6368038,16589042,CARD_GAIA_CHAMPION) end)
	c:RegisterEffect(pierce)
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
	e:SetCode(EVENT_BATTLE_DAMAGE)
	e:SetRange(range)
	e:SetCategory(CATEGORY_DRAW+CATEGORY_HANDES)
	e:SetCondition(function(se,tp,eg)
		local tc=eg and eg:GetFirst()
		local bc=tc and tc:GetBattleTarget()
		return tc and tc:IsControler(tp) and bc and bc:IsDefensePos() and tc:IsCode(CARD_GAIA_CHAMPION)
	end)
	e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return true end
		Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,tp,2)
		Duel.SetOperationInfo(0,CATEGORY_HANDES,nil,0,tp,1)
	end)
	e:SetOperation(function(se,tp)
		if not se:GetHandler():IsRelateToEffect(se) or Duel.GetFieldGroupCount(tp,LOCATION_DECK,0)==0 then return end
		if Duel.Draw(tp,2,REASON_EFFECT)==2 then
			Duel.ShuffleHand(tp)
			Duel.BreakEffect()
			Duel.DiscardHand(tp,nil,1,1,REASON_EFFECT|REASON_DISCARD)
		end
	end)
	c:RegisterEffect(e)
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
R.Rule.scroll_bewitchment={reg=function(c)
	local id=c:GetOriginalCode()
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
	e:SetCode(EVENT_EQUIP)
	e:SetRange(LOCATION_SZONE)
	e:SetOperation(function(se,tp,eg)
		if not eg:IsContains(c) then return end
		local tc=c:GetEquipTarget()
		if not tc then return end
		local attr=tc:AnnounceAnotherAttribute(tp)
		c:RegisterFlagEffect(id,RESET_EVENT|RESETS_STANDARD,0,1,attr)
		c:SetHint(CHINT_ATTRIBUTE,attr)
	end)
	c:RegisterEffect(e)
	local e2=Effect.CreateEffect(c)
	e2:SetType(EFFECT_TYPE_EQUIP)
	e2:SetCode(EFFECT_CHANGE_ATTRIBUTE)
	e2:SetCondition(function(se) return c:GetFlagEffect(id)~=0 end)
	e2:SetValue(function() return c:GetFlagEffectLabel(id) end)
	c:RegisterEffect(e2)
end}
local function dna_change_rule(c,act,race)
	local change=Effect.CreateEffect(c)
	change:SetType(EFFECT_TYPE_FIELD)
	change:SetRange(LOCATION_SZONE)
	change:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
	change:SetCode(race and EFFECT_CHANGE_RACE or EFFECT_CHANGE_ATTRIBUTE)
	change:SetValue(function(se) return se:GetLabel() end)
	c:RegisterEffect(change)
	act:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return true end
		local value
		if race then
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_RACE)
			value=Duel.AnnounceRace(tp,1,RACE_ALL)
			c:SetHint(CHINT_RACE,value)
		else
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATTRIBUTE)
			value=Duel.AnnounceAttribute(tp,1,ATTRIBUTE_ALL)
			c:SetHint(CHINT_ATTRIBUTE,value)
		end
		se:GetLabelObject():SetLabel(value)
	end)
	act:SetLabelObject(change)
end
R.Rule.dna_surgery={reg=function(c,rand,p,range,cond,act) dna_change_rule(c,act,true) end}
R.Rule.dna_transplant={reg=function(c,rand,p,range,cond,act) dna_change_rule(c,act,false) end}
R.Aura.goblin_of_greed=function(e)
	e:SetType(EFFECT_TYPE_FIELD)
	e:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e:SetCode(EFFECT_CANNOT_DISCARD_HAND)
	e:SetTargetRange(1,1)
	e:SetValue(1)
end
R.Rule.white_hole={reg=function(c)
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_ACTIVATE)
	e:SetCode(EVENT_CHAINING)
	e:SetCondition(function(se,tp,eg,ep,ev,re,r,rp)
		return rp~=tp and re:IsHasType(EFFECT_TYPE_ACTIVATE) and re:GetHandler():IsCode(53129443)
	end)
	e:SetOperation(function(se,tp,eg,ep,ev)
		local cid=Duel.GetChainInfo(ev,CHAININFO_CHAIN_ID)
		local ind=Effect.CreateEffect(c)
		ind:SetType(EFFECT_TYPE_FIELD)
		ind:SetCode(EFFECT_INDESTRUCTABLE_EFFECT)
		ind:SetTargetRange(LOCATION_MZONE,0)
		ind:SetProperty(EFFECT_FLAG_SET_AVAILABLE)
		ind:SetValue(function(ce)
			return Duel.GetChainInfo(0,CHAININFO_CHAIN_ID)==ce:GetLabel()
		end)
		ind:SetReset(RESET_CHAIN)
		ind:SetLabel(cid)
		Duel.RegisterEffect(ind,tp)
	end)
	c:RegisterEffect(e)
end}
R.Aura.fatal_abacus=function(e)
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
	e:SetCode(EVENT_TO_GRAVE)
	e:SetOperation(function(se,tp,eg)
		for pl=0,1 do
			local ct=eg:FilterCount(function(tc,player)
				return tc:IsPreviousLocation(LOCATION_MZONE) and tc:IsControler(player) and tc:IsMonster()
			end,nil,pl)
			if ct>0 then Duel.Damage(pl,500*ct,REASON_EFFECT) end
		end
	end)
end
R.Aura.rod_silence_kayest=function(e,p,field,c)
	local function target_spell(tc,eq)
		if tc==c or tc:GetCardTargetCount()==0 or not eq then return false end
		local function targets_equipped_card(tg,monster,spell)
			return monster==tg and tg:GetEquipGroup():IsContains(spell)
		end
		return tc:IsSpell() and (tc:IsHasCardTarget(eq) or tc:GetCardTarget():IsExists(targets_equipped_card,1,nil,eq,tc))
	end
	e:SetType(EFFECT_TYPE_FIELD)
	e:SetCode(EFFECT_DISABLE)
	e:SetTargetRange(LOCATION_SZONE,LOCATION_SZONE)
	e:SetTarget(function(se,tc) return target_spell(tc,c:GetEquipTarget()) end)
	local destroy=Effect.CreateEffect(c)
	destroy:SetType(EFFECT_TYPE_FIELD)
	destroy:SetCode(EFFECT_SELF_DESTROY)
	destroy:SetRange(LOCATION_SZONE)
	destroy:SetTargetRange(LOCATION_SZONE,LOCATION_SZONE)
	destroy:SetTarget(function(se,tc) return target_spell(tc,c:GetEquipTarget()) end)
	c:RegisterEffect(destroy)
	local negate=Effect.CreateEffect(c)
	negate:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
	negate:SetCode(EVENT_CHAIN_SOLVING)
	negate:SetRange(LOCATION_SZONE)
	negate:SetOperation(function(se,tp,eg,ep,ev,re)
		local eq=c:GetEquipTarget()
		if not eq or not re:IsSpellEffect() or not re:IsHasProperty(EFFECT_FLAG_CARD_TARGET) then return end
		local g=Duel.GetChainInfo(ev,CHAININFO_TARGET_CARDS)
		if g and g:IsContains(eq) and Duel.NegateEffect(ev) and re:GetHandler():IsRelateToEffect(re) then
			Duel.Destroy(re:GetHandler(),REASON_EFFECT)
		end
	end)
	c:RegisterEffect(negate)
end
R.Aura.raregold_armor=function(e,p,field,c)
	e:SetType(EFFECT_TYPE_FIELD)
	e:SetCode(EFFECT_CANNOT_SELECT_BATTLE_TARGET)
	e:SetTargetRange(0,LOCATION_MZONE)
	e:SetCondition(function(se)
		local eq=c:GetEquipTarget()
		return eq and eq:GetControler()==c:GetControler()
	end)
	e:SetValue(function(se,tc) return tc~=c:GetEquipTarget() end)
end
R.Aura.infinite_dismissal=function(e,p,field,c)
	local flag=0x7f14d1
	if Duel.GetFlagEffect(0,flag)==0 then
		Duel.RegisterFlagEffect(0,flag,0,0,1)
		for _,code in ipairs({EVENT_SUMMON_SUCCESS,EVENT_FLIP_SUMMON_SUCCESS}) do
			local mark=Effect.CreateEffect(c)
			mark:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
			mark:SetCode(code)
			mark:SetOperation(function(se,tp,eg)
				for tc in aux.Next(eg) do tc:RegisterFlagEffect(flag,RESETS_STANDARD_PHASE_END,0,1) end
			end)
			Duel.RegisterEffect(mark,0)
		end
	end
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
	e:SetCode(EVENT_PHASE+PHASE_END)
	e:SetCategory(CATEGORY_DESTROY)
	e:SetCountLimit(1)
	e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		local g=Duel.GetMatchingGroup(function(tc,id)
			return tc:IsLevelBelow(3) and tc:GetFlagEffect(id)>0
		end,tp,LOCATION_MZONE,LOCATION_MZONE,nil,flag)
		if chk==0 then return #g>0 end
		Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,#g,0,0)
	end)
	e:SetOperation(function(se,tp)
		local g=Duel.GetMatchingGroup(function(tc,id)
			return tc:IsLevelBelow(3) and tc:GetFlagEffect(id)>0
		end,tp,LOCATION_MZONE,LOCATION_MZONE,nil,flag)
		if #g>0 then Duel.Destroy(g,REASON_EFFECT) end
	end)
end
R.Aura.greed=function(e,p,field,c)
	local id=c:GetOriginalCode()
	local draw=Effect.CreateEffect(c)
	draw:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
	draw:SetRange(LOCATION_SZONE)
	draw:SetCode(EVENT_DRAW)
	draw:SetCondition(function(se,tp,eg,ep,ev,re,r) return (r&REASON_EFFECT)~=0 end)
	draw:SetOperation(function(se,tp,eg,ep,ev,re,r,rp)
		local flag=ep==0 and id or id+1
		local count=c:GetFlagEffectLabel(flag)
		if count then c:SetFlagEffectLabel(flag,count+ev)
		else c:RegisterFlagEffect(flag,RESETS_STANDARD_PHASE_END,0,1,ev) end
	end)
	c:RegisterEffect(draw)
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
	e:SetCode(EVENT_PHASE+PHASE_END)
	e:SetCountLimit(1)
	e:SetCategory(CATEGORY_DAMAGE)
	e:SetCondition(function()
		return c:GetFlagEffect(id)>0 or c:GetFlagEffect(id+1)>0
	end)
	e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return true end
		Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,PLAYER_ALL,0)
	end)
	e:SetOperation(function(se,tp)
		if not c:IsRelateToEffect(se) then return end
		local own=c:GetFlagEffectLabel(id+tp)
		local opp=c:GetFlagEffectLabel(id+1-tp)
		if own then Duel.Damage(tp,own*500,REASON_EFFECT,true) end
		if opp then Duel.Damage(1-tp,opp*500,REASON_EFFECT,true) end
		Duel.RDComplete()
	end)
end
R.Aura.judgment_desert=function(e,p,field,c)
	e:SetType(EFFECT_TYPE_FIELD)
	e:SetCode(EFFECT_CANNOT_CHANGE_POSITION)
	e:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
	e:SetTarget(function(se,tc) return c:IsHasCardTarget(tc) end)
	local mark=Effect.CreateEffect(c)
	mark:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
	mark:SetCode(EVENT_CHANGE_POS)
	mark:SetRange(LOCATION_SZONE)
	mark:SetOperation(function(se,tp,eg)
		local g=eg:Filter(function(tc)
			return tc:IsFaceup() and tc:IsPreviousPosition(POS_FACEDOWN)
		end,nil)
		for tc in aux.Next(g) do c:SetCardTarget(tc) end
	end)
	c:RegisterEffect(mark)
end
R.Aura.canyon=function(e,p,field,c)
	local function condition(se,attacker_player)
		local at=Duel.GetAttacker()
		local de=Duel.GetAttackTarget()
		return at and at:GetControler()==attacker_player and de and de:IsDefensePos() and de:IsRace(RACE_ROCK)
	end
	e:SetType(EFFECT_TYPE_FIELD)
	e:SetCode(EFFECT_CHANGE_BATTLE_DAMAGE)
	e:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e:SetTargetRange(1,0)
	e:SetCondition(function(se) return condition(se,c:GetControler()) end)
	e:SetValue(DOUBLE_DAMAGE)
	local e2=e:Clone()
	e2:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e2:SetTargetRange(0,1)
	e2:SetRange(LOCATION_FZONE)
	e2:SetCondition(function(se) return condition(se,1-c:GetControler()) end)
	c:RegisterEffect(e2)
end
R.Rule.nightmares_steelcage={reg=function(c)
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_ACTIVATE)
	e:SetCode(EVENT_FREE_CHAIN)
	e:SetOperation(function(se,tp)
		c:SetTurnCounter(0)
		local lock=Effect.CreateEffect(c)
		lock:SetType(EFFECT_TYPE_FIELD)
		lock:SetCode(EFFECT_CANNOT_ATTACK_ANNOUNCE)
		lock:SetRange(LOCATION_SZONE)
		lock:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
		c:RegisterEffect(lock)
		local timer=Effect.CreateEffect(c)
		timer:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		timer:SetCode(EVENT_PHASE+PHASE_END)
		timer:SetRange(LOCATION_SZONE)
		timer:SetCountLimit(1)
		timer:SetCondition(function(se,tp) return Duel.IsTurnPlayer(1-tp) end)
		timer:SetOperation(function(se)
			local count=c:GetTurnCounter()+1
			c:SetTurnCounter(count)
			if count>=2 then Duel.Destroy(c,REASON_RULE) end
		end)
		c:RegisterEffect(timer)
		local remain=Effect.CreateEffect(c)
		remain:SetType(EFFECT_TYPE_SINGLE)
		remain:SetCode(EFFECT_REMAIN_FIELD)
		c:RegisterEffect(remain)
	end)
	c:RegisterEffect(e)
end}
R.Aura.butterfly_dagger=function(e,p,field,c)
	local ret=Effect.CreateEffect(c)
	ret:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_O)
	ret:SetCode(EVENT_LEAVE_FIELD)
	ret:SetCategory(CATEGORY_TOHAND)
	ret:SetCondition(function(se)
		return c:IsLocation(LOCATION_GRAVE) and c:IsReason(REASON_DESTROY) and c:GetEquipTarget()~=nil
	end)
	ret:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return c:IsAbleToHand() end
		c:CreateEffectRelation(se)
		Duel.SetOperationInfo(0,CATEGORY_TOHAND,c,1,0,0)
	end)
	ret:SetOperation(function(se,tp)
		if c:IsRelateToEffect(se) then Duel.SendtoHand(c,nil,REASON_EFFECT); Duel.ConfirmCards(1-tp,c) end
	end)
	c:RegisterEffect(ret)
end
R.Aura.smoke_grenade_thief=function(e,p,field,c)
	local trigger=e
	trigger:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_F)
	trigger:SetCode(EVENT_LEAVE_FIELD)
	trigger:SetCategory(CATEGORY_HANDES)
	trigger:SetCondition(function(se,tp,eg,ep,ev,re,r)
		return (r&(REASON_DESTROY|REASON_EFFECT))==(REASON_DESTROY|REASON_EFFECT)
			and c:GetEquipTarget()~=nil and c:IsLocation(LOCATION_GRAVE)
	end)
	trigger:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return true end
		Duel.SetOperationInfo(0,CATEGORY_HANDES,nil,0,1-tp,1)
	end)
	trigger:SetOperation(function(se,tp)
		local g=Duel.GetFieldGroup(tp,0,LOCATION_HAND)
		if #g>0 then
			Duel.ConfirmCards(tp,g)
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DISCARD)
			Duel.SendtoGrave(g:Select(tp,1,1,nil),REASON_EFFECT|REASON_DISCARD)
			Duel.ShuffleHand(1-tp)
		end
	end)
end
R.Aura.bad_reaction_simochi=function(e,p,field,c)
	local e1=e
	e1:SetType(EFFECT_TYPE_FIELD)
	e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e1:SetCode(EFFECT_REVERSE_RECOVER)
	e1:SetRange(LOCATION_SZONE)
	e1:SetTargetRange(0,1)
	e1:SetValue(1)
end
R.Aura.magical_thorn=function(e,p,field,c)
	local e1=e
	e1:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
	e1:SetProperty(EFFECT_FLAG_DELAY)
	e1:SetRange(LOCATION_SZONE)
	e1:SetCode(EVENT_TO_GRAVE)
	e1:SetCondition(function(se,tp,eg)
		return eg:IsExists(function(tc)
			return tc:IsPreviousLocation(LOCATION_HAND) and tc:IsPreviousControler(1-tp)
				and tc:IsReason(REASON_DISCARD)
		end,1,nil)
	end)
	e1:SetOperation(function(se,tp,eg)
		local ct=eg:FilterCount(function(tc)
			return tc:IsPreviousLocation(LOCATION_HAND) and tc:IsPreviousControler(1-tp)
				and tc:IsReason(REASON_DISCARD)
		end,nil)
		if ct>0 then Duel.Damage(1-tp,ct*500,REASON_EFFECT) end
	end)
end
R.Aura.tornado_wall=function(e,p,field,c)
	e:SetType(EFFECT_TYPE_FIELD)
	e:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e:SetCode(EFFECT_AVOID_BATTLE_DAMAGE)
	e:SetTargetRange(1,0)
	e:SetCondition(function() return Duel.IsEnvironment(CARD_UMI) end)
	e:SetValue(1)
	local e2=Effect.CreateEffect(c)
	e2:SetType(EFFECT_TYPE_SINGLE)
	e2:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
	e2:SetRange(LOCATION_SZONE)
	e2:SetCode(EFFECT_SELF_DESTROY)
	e2:SetCondition(function() return not Duel.IsEnvironment(CARD_UMI) end)
	c:RegisterEffect(e2)
end
R.Aura.anti_spell_fragrance=function(e,p,field,c)
	local flag=58921041
	e:SetType(EFFECT_TYPE_FIELD)
	e:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e:SetCode(EFFECT_CANNOT_ACTIVATE)
	e:SetTargetRange(1,1)
	e:SetValue(function(se,re)
		if not re:IsHasType(EFFECT_TYPE_ACTIVATE) or not re:IsSpellEffect() then return false end
		local sc=re:GetHandler()
		return sc:IsLocation(LOCATION_SZONE) and sc:GetFlagEffect(flag)>0
	end)
	local e2=Effect.CreateEffect(c)
	e2:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
	e2:SetCode(EVENT_SSET)
	e2:SetRange(LOCATION_SZONE)
	e2:SetOperation(function(se,tp,eg)
		for tc in aux.Next(eg) do
			tc:RegisterFlagEffect(flag,RESETS_STANDARD_PHASE_END|RESET_OPPO_TURN,0,1)
		end
	end)
	c:RegisterEffect(e2)
end
R.Aura.light_of_intervention=function(e,p,field,c)
	e:SetType(EFFECT_TYPE_FIELD)
	e:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e:SetCode(EFFECT_CANNOT_MSET)
	e:SetTargetRange(1,1)
	local e2=Effect.CreateEffect(c)
	e2:SetType(EFFECT_TYPE_FIELD)
	e2:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e2:SetCode(EFFECT_LIGHT_OF_INTERVENTION)
	e2:SetRange(LOCATION_SZONE)
	e2:SetTargetRange(1,1)
	c:RegisterEffect(e2)
	local e3=Effect.CreateEffect(c)
	e3:SetType(EFFECT_TYPE_FIELD)
	e3:SetCode(EFFECT_CANNOT_TURN_SET)
	e3:SetRange(LOCATION_SZONE)
	e3:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
	c:RegisterEffect(e3)
end
R.Aura.labyrinth_of_nightmare=function(e,p,field,c)
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
	e:SetCategory(CATEGORY_POSITION)
	e:SetCode(EVENT_PHASE+PHASE_END)
	e:SetCountLimit(1)
	e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then
			return Duel.IsExistingMatchingCard(Card.IsFaceup,Duel.GetTurnPlayer(),LOCATION_MZONE,0,1,nil)
		end
		local g=Duel.GetMatchingGroup(Card.IsFaceup,Duel.GetTurnPlayer(),LOCATION_MZONE,0,nil)
		Duel.SetOperationInfo(0,CATEGORY_POSITION,g,#g,0,0)
	end)
	e:SetOperation(function()
		local g=Duel.GetMatchingGroup(Card.IsFaceup,Duel.GetTurnPlayer(),LOCATION_MZONE,0,nil)
		Duel.ChangePosition(g,POS_FACEUP_DEFENSE,0,POS_FACEUP_ATTACK,0)
	end)
end
R.Aura.ominous_fortunetelling=function(e,p,field,c)
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
	e:SetCategory(CATEGORY_DAMAGE)
	e:SetCode(EVENT_PHASE+PHASE_STANDBY)
	e:SetCountLimit(1)
	e:SetCondition(function(se,tp) return tp==Duel.GetTurnPlayer() end)
	e:SetOperation(function(se,tp)
		if not c:IsRelateToEffect(se) then return end
		local g=Duel.GetFieldGroup(tp,0,LOCATION_HAND)
		if #g==0 then return end
		local tc=g:RandomSelect(tp,1,nil):GetFirst()
		if not tc then return end
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_CARDTYPE)
		local op=Duel.SelectOption(tp,70,71,72)
		Duel.ConfirmCards(tp,tc)
		Duel.ShuffleHand(1-tp)
		if (op==0 and tc:IsMonster()) or (op==1 and tc:IsSpell()) or (op==2 and tc:IsTrap()) then
			Duel.Damage(1-tp,700,REASON_EFFECT)
		end
	end)
end
R.Aura.pyramid_of_light=function(e,p,field,c)
	local check=Effect.CreateEffect(c)
	check:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_CONTINUOUS)
	check:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
	check:SetCode(EVENT_LEAVE_FIELD_P)
	check:SetOperation(function(se)
		se:SetLabel(c:IsFaceup() and not c:IsDisabled() and 1 or 0)
	end)
	c:RegisterEffect(check)
	e:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_F)
	e:SetCode(EVENT_LEAVE_FIELD)
	e:SetLabelObject(check)
	e:SetOperation(function(se,tp)
		if check:GetLabel()~=1 or not c:IsPreviousControler(tp) then return end
		local g=Duel.GetMatchingGroup(function(tc)
			return tc:IsFaceup() and (tc:IsCode(15013468) or tc:IsCode(51402177))
		end,tp,LOCATION_ONFIELD,0,nil)
		if #g>0 then Duel.Destroy(g,REASON_EFFECT,LOCATION_REMOVED) end
	end)
end
R.Aura.jam_defender=function(e,p,field,c)
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O)
	e:SetProperty(EFFECT_FLAG_CARD_TARGET)
	e:SetCode(EVENT_ATTACK_ANNOUNCE)
	e:SetCondition(function(se,tp)
		return Duel.IsTurnPlayer(1-tp) and Duel.GetAttackTarget()~=nil
	end)
	local function filter(tc,atg)
		return tc:IsFaceup() and tc:IsCode(31709826) and atg:IsContains(tc)
	end
	e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk,chkc)
		local atg=Duel.GetAttacker():GetAttackableTarget()
		local at=Duel.GetAttackTarget()
		if chkc then return chkc:IsLocation(LOCATION_MZONE) and chkc:IsControler(tp) and chkc~=at and filter(chkc,atg) end
		if chk==0 then return Duel.IsExistingTarget(filter,tp,LOCATION_MZONE,0,1,at,atg) end
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TARGET)
		Duel.SelectTarget(tp,filter,tp,LOCATION_MZONE,0,1,1,at,atg)
	end)
	e:SetOperation(function(se,tp)
		local tc=Duel.GetFirstTarget()
		local at=Duel.GetAttacker()
		if tc and tc:IsFaceup() and tc:IsRelateToEffect(se) and at and not at:IsImmuneToEffect(se) then
			Duel.ChangeAttackTarget(tc)
		end
	end)
end
R.Aura.atk_down_if_opp_monster=function(e)
	e:SetType(EFFECT_TYPE_SINGLE)
	e:SetCode(EFFECT_UPDATE_ATTACK)
	e:SetCondition(function(se)
		return Duel.GetFieldGroupCount(se:GetHandlerPlayer(),0,LOCATION_MZONE)>0
	end)
	e:SetValue(-1000)
end
R.Aura.megamorph=function(e,p,field,c)
	e:SetType(EFFECT_TYPE_EQUIP)
	e:SetCode(EFFECT_SET_ATTACK)
	e:SetCondition(function() return Duel.GetLP(0)~=Duel.GetLP(1) end)
	e:SetValue(function(se,tc)
		local tp=c:GetControler()
		return tc:GetBaseAttack()*(Duel.GetLP(tp)<Duel.GetLP(1-tp) and 2 or 0.5)
	end)
end
R.Aura.sword_dragon_soul=function(e,p,field,c)
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
	e:SetCategory(CATEGORY_DESTROY)
	e:SetCode(EVENT_BATTLED)
	e:SetCondition(function()
		local eq=c:GetEquipTarget()
		local bc=eq and eq:GetBattleTarget()
		return bc and bc:IsRace(RACE_DRAGON)
	end)
	e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return true end
		local bc=c:GetEquipTarget():GetBattleTarget()
		Duel.SetTargetCard(bc)
		Duel.SetOperationInfo(0,CATEGORY_DESTROY,bc,1,0,0)
	end)
	e:SetOperation(function(se)
		local bc=Duel.GetFirstTarget()
		if bc and bc:IsRelateToEffect(se) then Duel.Destroy(bc,REASON_EFFECT) end
	end)
end
R.Aura.hydro_pressure_cannon=function(e,p,field,c)
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
	e:SetCategory(CATEGORY_TOGRAVE)
	e:SetCode(EVENT_BATTLE_DESTROYING)
	e:SetCondition(function(se,tp,eg)
		local eq=c:GetEquipTarget()
		return eq and eg:GetFirst()==eq and eq:IsStatus(STATUS_OPPO_BATTLE)
	end)
	e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return true end
		Duel.SetOperationInfo(0,CATEGORY_TOGRAVE,nil,1,1-tp,LOCATION_HAND)
	end)
	e:SetOperation(function(se,tp)
		if not c:IsRelateToEffect(se) then return end
		local g=Duel.GetFieldGroup(tp,0,LOCATION_HAND)
		if #g>0 then Duel.SendtoGrave(g:RandomSelect(tp,1),REASON_EFFECT) end
	end)
end
R.Aura.big_bang_shot=function(e,p,field,c)
	e:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_CONTINUOUS)
	e:SetCode(EVENT_LEAVE_FIELD)
	e:SetOperation(function()
		local tc=c:GetEquipTarget()
		if tc then Duel.Remove(tc,POS_FACEUP,REASON_EFFECT) end
	end)
end
R.Aura.ring_of_magnetism=function(e,p,field,c)
	e:SetType(EFFECT_TYPE_EQUIP)
	e:SetCode(EFFECT_ONLY_BE_ATTACKED)
	local e2=Effect.CreateEffect(c)
	e2:SetType(EFFECT_TYPE_FIELD)
	e2:SetCode(EFFECT_ONLY_ATTACK_MONSTER)
	e2:SetRange(LOCATION_SZONE)
	e2:SetTargetRange(0,LOCATION_MZONE)
	e2:SetCondition(function() return c:GetEquipTarget()~=nil end)
	c:RegisterEffect(e2)
end
R.Aura.necklace_of_command=function(e,p,field,c)
	e:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_F)
	e:SetCode(EVENT_TO_GRAVE)
	e:SetCategory(CATEGORY_DRAW+CATEGORY_HANDES)
	e:SetCondition(function(se,tp)
		local ec=c:GetPreviousEquipTarget()
		return c:IsReason(REASON_LOST_TARGET) and ec and ec:IsReason(REASON_BATTLE)
			and ec:IsPreviousControler(tp)
	end)
	e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		local can_draw=Duel.IsPlayerCanDraw(tp,1)
		local can_discard=Duel.GetFieldGroupCount(tp,0,LOCATION_HAND)>0
		if chk==0 then return true end
		local choice
		if can_draw and can_discard then choice=Duel.SelectOption(tp,0,1)
		elseif can_draw then choice=0
		elseif can_discard then choice=1
		else choice=2 end
		se:SetLabel(choice)
		if choice==0 then Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,tp,1)
		elseif choice==1 then Duel.SetOperationInfo(0,CATEGORY_HANDES,nil,0,1-tp,1) end
	end)
	e:SetOperation(function(se,tp)
		if se:GetLabel()==0 then Duel.Draw(tp,1,REASON_EFFECT)
		elseif se:GetLabel()==1 then
			local g=Duel.GetFieldGroup(tp,0,LOCATION_HAND)
			if #g>0 then Duel.SendtoGrave(g:RandomSelect(tp,1),REASON_EFFECT|REASON_DISCARD) end
		end
	end)
end
R.Aura.dragonic_attack=function(e)
	e:SetType(EFFECT_TYPE_EQUIP)
	e:SetCode(EFFECT_CHANGE_RACE)
	e:SetValue(RACE_DRAGON)
end
R.Aura.stronghold_gadget_bonus=function(e)
	e:SetType(EFFECT_TYPE_SINGLE)
	e:SetCode(EFFECT_UPDATE_ATTACK)
	e:SetCondition(function(se)
		local tp=se:GetHandlerPlayer()
		return Duel.IsExistingMatchingCard(aux.FaceupFilter(Card.IsCode,41172955),tp,LOCATION_MZONE,0,1,nil)
			and Duel.IsExistingMatchingCard(aux.FaceupFilter(Card.IsCode,86445415),tp,LOCATION_MZONE,0,1,nil)
			and Duel.IsExistingMatchingCard(aux.FaceupFilter(Card.IsCode,13839120),tp,LOCATION_MZONE,0,1,nil)
	end)
	e:SetValue(3000)
end
R.Aura.zoma_burn=function(e,p,field,c)
	e:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_F)
	e:SetCode(EVENT_LEAVE_FIELD)
	e:SetCondition(function() return c:IsReason(REASON_BATTLE) end)
	e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return true end
		local bc=c:GetBattleTarget()
		local damage=bc and math.max(0,bc:GetAttack()) or 0
		Duel.SetTargetPlayer(1-tp)
		Duel.SetTargetParam(damage)
		Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,1-tp,damage)
	end)
	e:SetOperation(function(se)
		local player,damage=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)
		Duel.Damage(player,damage,REASON_EFFECT)
	end)
end
R.Aura.eye_of_truth=function(e,p,field,c)
	e:SetType(EFFECT_TYPE_FIELD)
	e:SetCode(EFFECT_PUBLIC)
	e:SetTargetRange(0,LOCATION_HAND)
	local e2=Effect.CreateEffect(c)
	e2:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
	e2:SetCategory(CATEGORY_RECOVER)
	e2:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e2:SetCode(EVENT_PHASE+PHASE_STANDBY)
	e2:SetRange(LOCATION_SZONE)
	e2:SetCountLimit(1)
	e2:SetCondition(function(se,tp)
		return Duel.IsTurnPlayer(1-tp) and Duel.IsExistingMatchingCard(Card.IsSpell,tp,0,LOCATION_HAND,1,nil)
	end)
	e2:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return c:IsRelateToEffect(se) end
		Duel.SetTargetPlayer(1-tp)
		Duel.SetTargetParam(1000)
		Duel.SetOperationInfo(0,CATEGORY_RECOVER,nil,0,1-tp,1000)
	end)
	e2:SetOperation(function(se)
		if not c:IsRelateToEffect(se) then return end
		local player,amount=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)
		Duel.Recover(player,amount,REASON_EFFECT)
	end)
	c:RegisterEffect(e2)
end
R.Aura.fairy_box=function(e,p,field,c)
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
	e:SetCategory(CATEGORY_ATKCHANGE+CATEGORY_COIN)
	e:SetCode(EVENT_ATTACK_ANNOUNCE)
	e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		local at=Duel.GetAttacker()
		if chk==0 then return at and at:IsControler(1-tp) end
		Duel.SetTargetCard(at)
		Duel.SetOperationInfo(0,CATEGORY_COIN,nil,0,tp,1)
		Duel.SetOperationInfo(0,CATEGORY_ATKCHANGE,at,1,0,0)
	end)
	e:SetOperation(function(se,tp)
		local at=Duel.GetAttacker()
		if not at or not at:IsRelateToEffect(se) then return end
		if Duel.CallCoin(tp,1) then
			local e1=Effect.CreateEffect(c)
			e1:SetType(EFFECT_TYPE_SINGLE)
			e1:SetCode(EFFECT_SET_ATTACK_FINAL)
			e1:SetValue(0)
			e1:SetReset(RESET_EVENT|RESETS_STANDARD|RESET_PHASE|PHASE_BATTLE)
			at:RegisterEffect(e1)
		end
	end)
end
R.Aura.tiki_soul_protect=function(e,p,field,c)
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
	e:SetCode(EFFECT_SEND_REPLACE)
	e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		local function repfilter(tc)
			return tc~=c and tc:IsOriginalType(TYPE_TRAP) and tc:IsLocation(LOCATION_MZONE) and tc:IsFaceup()
				and tc:IsReason(REASON_DESTROY) and tc:GetDestination()==LOCATION_GRAVE
				and tc:GetReasonPlayer()==1-tp and tc:GetOwner()==tp and tc:IsCanTurnSet()
		end
		if chk==0 then
			local count=eg and eg:FilterCount(repfilter,nil) or 0
			return count>0 and Duel.GetLocationCount(tp,LOCATION_SZONE)>=count
		end
		if not Duel.SelectYesNo(tp,aux.Stringid(c:GetCode(),1)) then return false end
		Duel.Hint(HINT_CARD,1-tp,c:GetCode())
		local g=eg:Filter(repfilter,nil)
		for tc in g:Iter() do Duel.MoveToField(tc,tp,tp,LOCATION_SZONE,POS_FACEUP,true) end
		Duel.ChangePosition(g,POS_FACEDOWN)
		Duel.RaiseEvent(g,EVENT_SSET,e,REASON_EFFECT,tp,tp,0)
		local replaced=se:GetLabelObject()
		replaced:Clear()
		replaced:Merge(g)
		return true
	end)
	e:SetValue(function(se,tc) return se:GetLabelObject():IsContains(tc) end)
	local replaced=Group.CreateGroup()
	replaced:KeepAlive()
	e:SetLabelObject(replaced)
end
R.Aura.shadow_spell=function(e,p,field,c)
	e:SetType(EFFECT_TYPE_FIELD)
	e:SetCode(EFFECT_CANNOT_CHANGE_POSITION)
	e:SetRange(LOCATION_SZONE)
	e:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
	e:SetTarget(aux.PersistentTargetFilter)
	local e2=e:Clone()
	e2:SetCode(EFFECT_CANNOT_ATTACK)
	c:RegisterEffect(e2)
	local e3=e:Clone()
	e3:SetCode(EFFECT_UPDATE_ATTACK)
	e3:SetValue(-700)
	c:RegisterEffect(e3)
	local e4=Effect.CreateEffect(c)
	e4:SetType(EFFECT_TYPE_CONTINUOUS+EFFECT_TYPE_FIELD)
	e4:SetRange(LOCATION_SZONE)
	e4:SetCode(EVENT_LEAVE_FIELD)
	e4:SetCondition(function(se,tp,eg)
		if c:IsStatus(STATUS_DESTROY_CONFIRMED) then return false end
		local tc=c:GetFirstCardTarget()
		return tc and eg and eg:IsContains(tc)
	end)
	e4:SetOperation(function(se) Duel.Destroy(c,REASON_EFFECT) end)
	c:RegisterEffect(e4)
end
R.Aura.harpies_hunting_ground=function(e,p,field,c)
	local function is_harpie(tc)
		return tc:IsFaceup() and tc:IsCode(76812113,12206212)
	end
	local function add_trigger(code)
		local e1=Effect.CreateEffect(c)
		e1:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
		e1:SetCategory(CATEGORY_DESTROY)
		e1:SetProperty(EFFECT_FLAG_EVENT_PLAYER+EFFECT_FLAG_CARD_TARGET)
		e1:SetCode(code)
		e1:SetRange(LOCATION_FZONE)
		e1:SetCondition(function(se,tp,eg) return eg and eg:IsExists(is_harpie,1,nil) end)
		e1:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk,chkc)
			if chkc then return chkc:IsOnField() and chkc:IsSpellTrap() end
			if chk==0 then return true end
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)
			local g=Duel.SelectTarget(tp,Card.IsSpellTrap,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,1,nil)
			Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,#g,0,0)
		end)
		e1:SetOperation(function(se,tp)
			local tc=Duel.GetFirstTarget()
			if tc and tc:IsRelateToEffect(se) then Duel.Destroy(tc,REASON_EFFECT) end
		end)
		c:RegisterEffect(e1)
	end
	add_trigger(EVENT_SUMMON_SUCCESS)
	add_trigger(EVENT_SPSUMMON_SUCCESS)
end
R.Aura.legendary_ocean=function(e,p,field,c)
	e:SetType(EFFECT_TYPE_FIELD)
	e:SetCode(EFFECT_CHANGE_CODE)
	e:SetRange(LOCATION_FZONE)
	e:SetTargetRange(LOCATION_FZONE,LOCATION_FZONE)
	e:SetTarget(function(se,tc) return tc==c end)
	e:SetValue(22702055)
	local function water_aura(code,value,range)
		local e1=Effect.CreateEffect(c)
		e1:SetType(EFFECT_TYPE_FIELD)
		e1:SetCode(code)
		e1:SetRange(LOCATION_FZONE)
		e1:SetTargetRange(range,range)
		e1:SetTarget(aux.TargetBoolFunction(Card.IsAttribute,ATTRIBUTE_WATER))
		e1:SetValue(value)
		c:RegisterEffect(e1)
	end
	water_aura(EFFECT_UPDATE_ATTACK,200,LOCATION_MZONE)
	water_aura(EFFECT_UPDATE_DEFENSE,200,LOCATION_MZONE)
	water_aura(EFFECT_UPDATE_LEVEL,-1,LOCATION_HAND|LOCATION_MZONE)
end
R.Aura.amazoness_village=function(e,p,field,c)
	e:SetType(EFFECT_TYPE_FIELD)
	e:SetCode(EFFECT_UPDATE_ATTACK)
	e:SetRange(LOCATION_FZONE)
	e:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
	e:SetTarget(aux.TargetBoolFunction(Card.IsSetCard,SET_AMAZONESS))
	e:SetValue(200)
	local function spfilter(tc,se,tp,level)
		return tc:IsLevelBelow(level) and tc:IsSetCard(SET_AMAZONESS) and tc:IsCanBeSpecialSummoned(se,0,tp,false,false)
	end
	local function cfilter(tc,se,tp)
		return tc:IsSetCard(SET_AMAZONESS) and tc:IsReason(REASON_DESTROY) and tc:IsReason(REASON_BATTLE|REASON_EFFECT)
			and tc:HasLevel() and Duel.IsExistingMatchingCard(spfilter,tp,LOCATION_DECK,0,1,nil,se,tp,tc:GetLevel())
	end
	local e1=Effect.CreateEffect(c)
	e1:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e1:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O)
	e1:SetProperty(EFFECT_FLAG_DAMAGE_STEP)
	e1:SetRange(LOCATION_FZONE)
	e1:SetCode(EVENT_TO_GRAVE)
	e1:SetCountLimit(1)
	e1:SetCondition(function(se,tp,eg) return eg and eg:IsExists(cfilter,1,nil,se,tp) end)
	e1:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return not c:IsStatus(STATUS_CHAINING) and Duel.GetLocationCount(tp,LOCATION_MZONE)>0 end
		Duel.SetTargetCard(eg)
		Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_DECK)
	end)
	e1:SetOperation(function(se,tp,eg)
		if Duel.GetLocationCount(tp,LOCATION_MZONE)<=0 then return end
		local dg=eg:Filter(cfilter,nil,se,tp):Match(Card.IsRelateToEffect,nil,se)
		if #dg==0 then return end
		local _,level=dg:GetMaxGroup(Card.GetOriginalLevel)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
		local g=Duel.SelectMatchingCard(tp,spfilter,tp,LOCATION_DECK,0,1,1,nil,se,tp,level)
		if #g>0 then Duel.SpecialSummon(g,0,tp,tp,false,false,POS_FACEUP) end
	end)
	c:RegisterEffect(e1)
end
R.Aura.amazoness_tiger=function(e,p,field,c)
	c:SetUniqueOnField(1,0,c:GetOriginalCode())
	e:SetType(EFFECT_TYPE_SINGLE)
	e:SetCode(EFFECT_UPDATE_ATTACK)
	e:SetValue(function(se,sc)
		return Duel.GetMatchingGroupCount(aux.FaceupFilter(Card.IsSetCard,SET_AMAZONESS),sc:GetControler(),LOCATION_MZONE,0,nil)*400
	end)
	local e2=Effect.CreateEffect(c)
	e2:SetType(EFFECT_TYPE_FIELD)
	e2:SetCode(EFFECT_CANNOT_SELECT_BATTLE_TARGET)
	e2:SetRange(LOCATION_MZONE)
	e2:SetTargetRange(0,LOCATION_MZONE)
	e2:SetValue(function(se,tc)
		return tc:IsFaceup() and tc:IsSetCard(SET_AMAZONESS) and tc~=se:GetHandler()
	end)
	c:RegisterEffect(e2)
end
R.Aura.arsenal_bug_stats=function(e,p,field,c)
	local function condition(se)
		local sc=se:GetHandler()
		return not Duel.IsExistingMatchingCard(aux.FaceupFilter(Card.IsRace,RACE_INSECT),
			sc:GetControler(),LOCATION_MZONE,0,1,sc)
	end
	e:SetType(EFFECT_TYPE_SINGLE)
	e:SetCode(EFFECT_SET_ATTACK)
	e:SetCondition(condition)
	e:SetValue(1000)
	local e2=Effect.CreateEffect(c)
	e2:SetType(EFFECT_TYPE_SINGLE)
	e2:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
	e2:SetRange(LOCATION_MZONE)
	e2:SetCode(EFFECT_SET_DEFENSE)
	e2:SetCondition(condition)
	e2:SetValue(1000)
	c:RegisterEffect(e2)
end
R.Aura.fusion_gate=function(e,p,field,c)
	e:SetDescription(aux.Stringid(c:GetCode(),0))
	e:SetCategory(CATEGORY_SPECIAL_SUMMON+CATEGORY_FUSION_SUMMON)
	e:SetType(EFFECT_TYPE_IGNITION)
	e:SetRange(LOCATION_FZONE)
	e:SetProperty(EFFECT_FLAG_BOTH_SIDE)
	e:SetTarget(Fusion.SummonEffTG(nil,Card.IsAbleToRemove,nil,Fusion.BanishMaterial))
	e:SetOperation(Fusion.SummonEffOP(nil,Card.IsAbleToRemove,nil,Fusion.BanishMaterial))
end
R.Rule.narrow_pass={reg=function(c,rand,p,range,cond,act)
	if act then
		act:SetCondition(function(e,tp)
			return Duel.GetFieldGroupCount(tp,LOCATION_MZONE,0)<=2
				and Duel.GetFieldGroupCount(tp,0,LOCATION_MZONE)<=2
		end)
	end
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_FIELD)
	e:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e:SetCode(EFFECT_CANNOT_SUMMON)
	e:SetRange(LOCATION_SZONE)
	e:SetTargetRange(1,1)
	e:SetTarget(function(se,tc,sp)
		return Duel.GetFieldGroupCount(sp,LOCATION_MZONE,0)>=2
	end)
	c:RegisterEffect(e)
end}
R.Rule.forced_requisition={reg=function(c,rand,p,range,cond,act)
	if act then
		act:SetCode(EVENT_DISCARD)
		act:SetCondition(function(e,tp,eg)
			return eg and eg:IsExists(Card.IsPreviousControler,1,nil,tp)
		end)
	end
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F)
	e:SetCategory(CATEGORY_HANDES)
	e:SetRange(LOCATION_SZONE)
	e:SetCode(EVENT_DISCARD)
	e:SetCondition(function(se,tp,eg)
		return eg and eg:IsExists(Card.IsPreviousControler,1,nil,tp)
	end)
	e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return c:IsRelateToEffect(se) end
		local count=eg:FilterCount(Card.IsPreviousControler,nil,tp)
		se:SetLabel(count)
		Duel.SetOperationInfo(0,CATEGORY_HANDES,nil,0,1-tp,count)
	end)
	e:SetOperation(function(se,tp)
		if not c:IsRelateToEffect(se) then return end
		local count=se:GetLabel()
		Duel.DiscardHand(1-tp,nil,count,count,REASON_EFFECT|REASON_DISCARD)
	end)
	c:RegisterEffect(e)
end}
R.Rule.xing_zhen_hu={reg=function(c,rand,p,range,cond,act)
	act:SetProperty(EFFECT_FLAG_CARD_TARGET)
	act:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk,chkc)
		if chkc then return chkc:IsLocation(LOCATION_SZONE) and chkc:IsFacedown() end
		if chk==0 then return Duel.IsExistingTarget(Card.IsFacedown,tp,LOCATION_SZONE,LOCATION_SZONE,2,c) end
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_FACEDOWN)
		Duel.SelectTarget(tp,Card.IsFacedown,tp,LOCATION_SZONE,LOCATION_SZONE,2,2,c)
	end)
	local link=Effect.CreateEffect(c)
	link:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
	link:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
	link:SetRange(LOCATION_SZONE)
	link:SetCode(EVENT_CHAIN_SOLVED)
	link:SetLabelObject(act)
	link:SetCondition(aux.PersistentTgCon)
	link:SetOperation(function(se,tp,eg,ep,ev,re)
		if not c:IsRelateToEffect(re) then return end
		local g=Duel.GetChainInfo(ev,CHAININFO_TARGET_CARDS):Filter(Card.IsRelateToEffect,nil,re)
		for tc in aux.Next(g) do if tc:IsFacedown() then c:SetCardTarget(tc) end end
	end)
	c:RegisterEffect(link)
	local lock=Effect.CreateEffect(c)
	lock:SetType(EFFECT_TYPE_FIELD)
	lock:SetProperty(EFFECT_FLAG_SET_AVAILABLE)
	lock:SetCode(EFFECT_CANNOT_TRIGGER)
	lock:SetRange(LOCATION_SZONE)
	lock:SetTargetRange(LOCATION_SZONE,LOCATION_SZONE)
	lock:SetTarget(aux.PersistentTargetFilter)
	lock:SetValue(1)
	c:RegisterEffect(lock)
end}
R.Rule.spellbinding_circle={reg=function(c)
	aux.AddPersistentProcedure(c,1,nil,CATEGORY_POSITION,nil,nil,nil,nil,nil,nil,nil,true)
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_FIELD)
	e:SetCode(EFFECT_CANNOT_CHANGE_POSITION)
	e:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
	e:SetTarget(aux.PersistentTargetFilter)
	c:RegisterEffect(e)
	local e2=e:Clone()
	e2:SetCode(EFFECT_CANNOT_ATTACK)
	c:RegisterEffect(e2)
	local e3=Effect.CreateEffect(c)
	e3:SetType(EFFECT_TYPE_CONTINUOUS+EFFECT_TYPE_FIELD)
	e3:SetRange(LOCATION_SZONE)
	e3:SetCode(EVENT_LEAVE_FIELD)
	e3:SetCondition(function(se,tp,eg)
		if c:IsStatus(STATUS_DESTROY_CONFIRMED) then return false end
		local tc=c:GetFirstCardTarget()
		return tc and eg:IsContains(tc) and tc:IsReason(REASON_DESTROY) and c:IsRelateToCard(tc)
	end)
	e3:SetOperation(function() Duel.Destroy(c,REASON_EFFECT) end)
	c:RegisterEffect(e3)
end}
R.Rule.anti_spell_counter_trap={reg=function(c)
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_ACTIVATE)
	e:SetCode(EVENT_CHAINING)
	e:SetCondition(function(se,tp,eg,ep,ev,re,r,rp)
		return re:IsSpellEffect() and re:IsHasType(EFFECT_TYPE_ACTIVATE) and Duel.IsChainNegatable(ev)
	end)
	e:SetCost(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return Duel.IsCanRemoveCounter(tp,1,0,COUNTER_SPELL,2,REASON_COST) end
		Duel.RemoveCounter(tp,1,0,COUNTER_SPELL,2,REASON_COST)
	end)
	e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return true end
		Duel.SetOperationInfo(0,CATEGORY_NEGATE,eg,1,0,0)
		if re:GetHandler():IsDestructable() and re:GetHandler():IsRelateToEffect(re) then
			Duel.SetOperationInfo(0,CATEGORY_DESTROY,eg,1,0,0)
		end
	end)
	e:SetOperation(function(se,tp,eg,ep,ev,re)
		if Duel.NegateActivation(ev) and re:GetHandler():IsRelateToEffect(re) then Duel.Destroy(re:GetHandler(),REASON_EFFECT) end
	end)
	c:RegisterEffect(e)
end}
R.Rule.rite_of_spirit_nvalley={reg=function(c)
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_SINGLE)
	e:SetCode(EFFECT_NECRO_VALLEY_IM)
	c:RegisterEffect(e)
end}
R.Rule.after_the_struggle={reg=function(c)
	local id=c:GetOriginalCode()
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_ACTIVATE)
	e:SetCode(EVENT_FREE_CHAIN)
	e:SetCondition(function() return Duel.IsPhase(PHASE_MAIN1) end)
	e:SetOperation(function(se,tp)
		local mark=Effect.CreateEffect(c)
		mark:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		mark:SetCode(EVENT_BATTLED)
		mark:SetReset(RESET_PHASE|PHASE_END)
		mark:SetOperation(function()
			local at=Duel.GetAttacker()
			local tg=Duel.GetAttackTarget()
			if at then at:RegisterFlagEffect(id,RESETS_STANDARD_PHASE_END,0,1) end
			if tg then tg:RegisterFlagEffect(id,RESETS_STANDARD_PHASE_END,0,1) end
		end)
		Duel.RegisterEffect(mark,tp)
		local destroy=Effect.CreateEffect(c)
		destroy:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		destroy:SetCode(EVENT_PHASE+PHASE_BATTLE)
		destroy:SetCountLimit(1)
		destroy:SetReset(RESET_PHASE|PHASE_END)
		destroy:SetOperation(function()
			local g=Duel.GetMatchingGroup(function(tc,flag) return tc:GetFlagEffect(flag)>0 end,tp,LOCATION_MZONE,LOCATION_MZONE,nil,id)
			if #g>0 then Duel.Destroy(g,REASON_EFFECT) end
		end)
		Duel.RegisterEffect(destroy,tp)
	end)
	c:RegisterEffect(e)
end}
R.Rule.wall_of_revealing_light={reg=function(c,rand,p,range,cond,act)
	local lock=Effect.CreateEffect(c)
	lock:SetType(EFFECT_TYPE_FIELD)
	lock:SetCode(EFFECT_CANNOT_ATTACK)
	lock:SetTargetRange(0,LOCATION_MZONE)
	lock:SetTarget(function(se,tc) return tc:GetAttack()<=se:GetLabel() end)
	c:RegisterEffect(lock)
	act:SetCost(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return Duel.CheckLPCost(tp,1000) end
		local lp=Duel.GetLP(tp)
		local choices={}
		for n=1,math.floor(lp/1000) do choices[n]=n*1000 end
		local paid=Duel.AnnounceNumber(tp,table.unpack(choices))
		Duel.PayLPCost(tp,paid)
		lock:SetLabel(paid)
		c:SetHint(CHINT_NUMBER,paid)
	end)
end}
R.Rule.spell_of_pain={reg=function(c)
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_ACTIVATE)
	e:SetCode(EVENT_CHAINING)
	e:SetCondition(function(se,tp,eg,ep,ev,re,r,rp)
		return ep~=tp and aux.damcon1(se,tp,eg,ep,ev,re,r,rp)
	end)
	e:SetOperation(function(se,tp,eg,ep,ev)
		local cid=Duel.GetChainInfo(ev,CHAININFO_CHAIN_ID)
		local reflect=Effect.CreateEffect(c)
		reflect:SetType(EFFECT_TYPE_FIELD)
		reflect:SetCode(EFFECT_REFLECT_DAMAGE)
		reflect:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
		reflect:SetTargetRange(1,0)
		reflect:SetLabel(cid)
		reflect:SetValue(function(ce,re,val,r)
			local cc=Duel.GetCurrentChain()
			if cc==0 or (r&REASON_EFFECT)==0 then return false end
			return Duel.GetChainInfo(0,CHAININFO_CHAIN_ID)==ce:GetLabel()
		end)
		reflect:SetReset(RESET_CHAIN)
		Duel.RegisterEffect(reflect,tp)
	end)
	c:RegisterEffect(e)
end}
R.Rule.jar_robber={reg=function(c)
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_ACTIVATE)
	e:SetCode(EVENT_CHAINING)
	e:SetCondition(function(se,tp,eg,ep,ev,re,r,rp)
		return re:IsHasType(EFFECT_TYPE_ACTIVATE) and re:GetHandler():IsCode(55144522) and Duel.IsChainNegatable(ev)
	end)
	e:SetTarget(function(se,tp,eg,ep,ev,re,r,rp,chk)
		if chk==0 then return Duel.IsPlayerCanDraw(tp,1) end
		Duel.SetOperationInfo(0,CATEGORY_DISABLE,eg,1,0,0)
		Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,tp,1)
	end)
	e:SetOperation(function(se,tp,eg,ep,ev)
		if Duel.NegateEffect(ev) then Duel.Draw(tp,1,REASON_EFFECT) end
	end)
	c:RegisterEffect(e)
end}
R.Rule.seven_completed={reg=function(c)
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
	e:SetCode(EVENT_EQUIP)
	e:SetRange(LOCATION_SZONE)
	e:SetOperation(function(se,tp,eg)
		if not eg:IsContains(c) then return end
		local tc=c:GetEquipTarget()
		if not tc or not tc:IsFaceup() then return end
		local opt=Duel.SelectOption(tp,aux.Stringid(c:GetOriginalCode(),0),aux.Stringid(c:GetOriginalCode(),1))
		local boost=Effect.CreateEffect(c)
		boost:SetType(EFFECT_TYPE_EQUIP)
		boost:SetCode(opt==0 and EFFECT_UPDATE_ATTACK or EFFECT_UPDATE_DEFENSE)
		boost:SetValue(700)
		boost:SetReset(RESET_EVENT|RESETS_STANDARD)
		c:RegisterEffect(boost)
	end)
	c:RegisterEffect(e)
end}
R.Rule.array_revealing_light={reg=function(c,rand,p,range,cond,act)
	local e2=Effect.CreateEffect(c)
	e2:SetType(EFFECT_TYPE_FIELD)
	e2:SetCode(EFFECT_CANNOT_ATTACK)
	e2:SetRange(range)
	e2:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
	e2:SetTarget(function(se,tc)
		return tc:IsStatus(STATUS_SUMMON_TURN+STATUS_FLIP_SUMMON_TURN+STATUS_SPSUMMON_TURN) and tc:IsRace(se:GetLabel())
	end)
	c:RegisterEffect(e2)
	if act then
		act:SetTarget(function(e,tp,eg,ep,ev,re,r,rp,chk)
			if chk==0 then return true end
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_RACE)
			local race=Duel.AnnounceRace(tp,1,RACE_ALL)
			e2:SetLabel(race)
			e:GetHandler():SetHint(CHINT_RACE,race)
		end)
	end
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
local function activation(c,rand)
	local e=Effect.CreateEffect(c)
	e:SetType(EFFECT_TYPE_ACTIVATE)
	e:SetCode(EVENT_FREE_CHAIN)
	for _,p in ipairs(rand and rand.acts or {}) do
		if p.k=='same_name_field_stat' then
			e:SetProperty(EFFECT_FLAG_DAMAGE_STEP)
			e:SetCondition(aux.StatChangeDamageStepCondition)
			break
		end
	end
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
	for _,p in ipairs(rand.acts) do
		if R.Act[p.k].hand then range=LOCATION_HAND|LOCATION_DECK end
		if R.Act[p.k].grave then range=LOCATION_GRAVE end
	end
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
	for _,p in ipairs(rand.acts) do if R.Act[p.k].damage_step then prop=prop|EFFECT_FLAG_DAMAGE_STEP end end
	if evt and evt.no_turn_reset then prop=prop|EFFECT_FLAG_NO_TURN_RESET end
	if limit(rand,'unnegatable') then prop=prop|EFFECT_FLAG_CANNOT_DISABLE|EFFECT_FLAG_CANNOT_NEGATE|EFFECT_FLAG_CANNOT_INACTIVATE end
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
	if evt and evt.track_flipped then
		local eflip=Effect.CreateEffect(c)
		eflip:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_CONTINUOUS)
		eflip:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
		eflip:SetCode(EVENT_FLIP)
		eflip:SetOperation(function(se)
			se:GetHandler():RegisterFlagEffect(191999005,RESET_EVENT|RESETS_STANDARD,0,1)
		end)
		c:RegisterEffect(eflip)
		local eleave=Effect.CreateEffect(c)
		eleave:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_CONTINUOUS)
		eleave:SetCode(EVENT_LEAVE_FIELD_P)
		eleave:SetOperation(function(se)
			local h=se:GetHandler()
			e:SetLabel(h:GetFlagEffect(191999005)>0 and 1 or 0)
		end)
		c:RegisterEffect(eleave)
	end
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
	if rand.acts[1] and (rand.acts[1].k=='set_piece' or rand.acts[1].k=='real_set_piece') then
		local e=Effect.CreateEffect(c)
		e:SetType(EFFECT_TYPE_SINGLE)
		e:SetCode(EFFECT_CANNOT_SSET)
		c:RegisterEffect(e)
		if rand.acts[1].k=='real_set_piece' then
			local e2=Effect.CreateEffect(c)
			e2:SetType(EFFECT_TYPE_SINGLE)
			e2:SetCode(EFFECT_CANNOT_SPECIAL_SUMMON)
			c:RegisterEffect(e2)
		end
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
	elseif slot=='s_cont' or slot=='s_field' or slot=='t_cont' then act=activation(c,rand) end
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
