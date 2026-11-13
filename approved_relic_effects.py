"""Core effects for approved relics; all effects are persistent duel rules."""
def stat(code,value,target='true',enemy=False):
 return f'''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode({code}) e:SetTargetRange({'0,LOCATION_MZONE' if enemy else 'LOCATION_MZONE,0'}) e:SetTarget(function(e,c) return c:IsFaceup() and ({target}) end) e:SetValue({value}) Duel.RegisterEffect(e,0) end'''

def event(code,operation,condition='true',phase=False):
 return f'''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode({code}) {'e:SetCountLimit(1)' if phase else ''} e:SetCondition(function(e,tp,eg,ep,ev,re,r,rp) return {condition} end) e:SetOperation(function(e,tp,eg,ep,ev,re,r,rp) {operation} end) Duel.RegisterEffect(e,0) end'''

def phase(which,op,condition='true'):
 return event('EVENT_PHASE_START|PHASE_'+which,op,'Duel.GetTurnPlayer()==0 and ('+condition+')',True)

# Spells and Traps that can only Special Summon in Defense Position; Berserker's Pact would leave them doing nothing.
DEFENSE_ONLY_SUMMONS='26905245,40703222,29843091,73915051,42534368,92924317,60764581,13955608,33057951,75622824,79852326'

# Cards whose Special Summon effects only summon in Defense Position, Spells and Traps or not.
DEFENSE_SUMMON_EFFECTS='6104968,9074847,9156135,13386503,13955608,22567609,26905245,27911549,29843091,31709826,33057951,34124316,40703222,42534368,43434803,58551308,60764581,73915051,75622824,79106360,79852326,81210420,92924317'
# A summon that could go either way goes to Attack Position.
ATTACK_ONLY_SUMMONS='do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_FORCE_SPSUMMON_POSITION) e:SetProperty(EFFECT_FLAG_PLAYER_TARGET) e:SetTargetRange(1,0) e:SetTarget(function(e,c,sump,sumtype,sumpos) return not sumpos or (sumpos&POS_FACEUP_ATTACK)~=0 end) e:SetValue(POS_FACEUP_ATTACK) Duel.RegisterEffect(e,0) end'

def player_rule(code,value):
 return f'''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode({code}) e:SetProperty(EFFECT_FLAG_PLAYER_TARGET) e:SetTargetRange(1,0) e:SetValue({value}) Duel.RegisterEffect(e,0) end'''

STRONGHOLD=13955608 # Stronghold the Moving Fortress

def effect(kind):
 if not kind.startswith('approved_'):return None
 key=kind[9:];out=[]
 def atk(v,t='true'):out.append(stat('EFFECT_UPDATE_ATTACK',v,t))
 def defense(v,t='true'):out.append(stat('EFFECT_UPDATE_DEFENSE',v,t))
 def both(v,t='true'):atk(v,t);defense(v,t)
 def handlimit(n):out.append(player_rule('EFFECT_HAND_LIMIT',n))
 if key=='solemn_relic':
  out.append('do local used=false '+event('EVENT_CHAINING','if Duel.NegateActivation(ev) then used=true end','not used and rp==1 and re~=nil and Duel.IsChainNegatable(ev) and re:IsActiveType(TYPE_MONSTER|TYPE_SPELL|TYPE_TRAP)')+' end')
 elif key=='second_wind':out.append('do local used=false '+phase('END','used=true Duel.Draw(0,2,REASON_EFFECT)','not used and Duel.GetFieldGroupCount(0,LOCATION_HAND,0)==0')+' end')
 elif key=='grave_lantern':defense('function() return math.min(800,100*Duel.GetMatchingGroupCount(Card.IsMonster,0,LOCATION_GRAVE,0,nil)) end')
 elif key=='ritual_vestment':both(300,'c:IsType(TYPE_RITUAL)')
 elif key=='fusion_insignia':both(300,'c:IsType(TYPE_FUSION)')
 elif key=='tribute_dividend':
  out.append(event('EVENT_SUMMON_SUCCESS','--[[relic-hint]] Duel.Hint(HINT_MESSAGE,0,900000002)','eg:IsExists(function(c) return c:IsControler(0) and c:IsSummonType(SUMMON_TYPE_TRIBUTE) end,1,nil)'))
 elif key=='patient_guardian':out.append(phase('STANDBY','Duel.Recover(0,300,REASON_EFFECT)','not Duel.IsExistingMatchingCard(Card.IsAttackPos,0,LOCATION_MZONE,0,1,nil)'))
 elif key=='healing_echo':
  # Shared label excludes every Echo instance, including Magic Mirror, from recursion.
  out.append(event('EVENT_RECOVER','Duel.Recover(0,200,REASON_EFFECT)','ep==0 and ev>0 and re~=nil and re:GetLabel()~=937201'))
  out[-1]=out[-1].replace('e:SetCode(EVENT_RECOVER)','e:SetCode(EVENT_RECOVER) e:SetLabel(937201)')
 elif key=='trap_weaver':both(400,'c:IsType(TYPE_TRAPMONSTER)')
 elif key=='twin_banner':
  both(200,'Duel.GetFieldGroupCount(0,LOCATION_MZONE,0)==2 and Duel.IsExistingMatchingCard(function(m) return m:IsFaceup() and m:GetRace()~=c:GetRace() end,0,LOCATION_MZONE,0,1,c)')
 elif key=='quiet_library':
  out.append('do local attacked=-1 '+event('EVENT_ATTACK_ANNOUNCE','attacked=Duel.GetTurnCount()','Duel.GetAttacker() and Duel.GetAttacker():IsControler(0)')+' '+phase('END','Duel.Recover(0,250,REASON_EFFECT)','attacked~=Duel.GetTurnCount()')+' end')
 elif key=='blood_crown':atk(500);out.append(phase('END','Duel.Damage(0,300,REASON_EFFECT)'))
 elif key=='hollow_chalice':
  out.append(phase('STANDBY','Duel.Recover(0,600,REASON_EFFECT)'))
  out.append(player_rule('EFFECT_CHANGE_DAMAGE','function(e,re,val,r,rp) return math.floor(val*1.5) end'))
 elif key=='brittle_armor':atk(-300);defense(900)
 elif key=='cracked_sword':atk(300);defense(-1000)
 elif key=='starving_library':
  out.append(player_rule('EFFECT_DRAW_COUNT',2));handlimit(3)
 elif key=='ashen_nursery':atk(700,'c:IsLevelBelow(3)');atk(-700,'c:IsLevelAbove(5)')
 elif key=='giants_oath':atk(800,'c:IsLevelAbove(5)');atk(-400,'c:IsLevelBelow(4)')
 elif key=='commoners_chain':both(300,'c:IsType(TYPE_NORMAL)');both(-200,'c:IsType(TYPE_EFFECT)')
 elif key=='zombies_bargain':
  atk(800);out.append(player_rule('EFFECT_REVERSE_RECOVER',1));out.append(player_rule('EFFECT_CHANGE_DAMAGE','function(e,re,val,r,rp) if (r&REASON_RRECOVER)~=0 then return 0 end return val end'))
 elif key=='warriors_vow':atk(200);out.append(stat('EFFECT_CANNOT_CHANGE_POSITION',1,'c:IsAttackPos()'))
 elif key=='ritual_scar':
  # Each copy keeps its own count, as Tag seats and Relic Mirror register separately. RITUAL_SCAR_COUNT comes from passives.py;
  # the hint tells finish_duel to carry this duel's summons over.
  out.append('do local n=RITUAL_SCAR_COUNT');atk('function() return 100*n-500 end')
  out.append(event('EVENT_SPSUMMON_SUCCESS','local g=eg:Filter(function(c) return c:IsControler(0) and c:IsSummonType(SUMMON_TYPE_RITUAL) end,nil) n=n+#g if #g>0 then --[[relic-hint]] end for c in g:Iter() do Duel.Hint(HINT_MESSAGE,c:GetControler(),1900000051) end'));out.append('end')
 elif key=='fusion_fever':
  atk(1000,'c:IsType(TYPE_FUSION)');out.append(stat('EFFECT_PIERCE',1,'c:IsType(TYPE_FUSION)'))
  for code in ('EFFECT_CANNOT_SUMMON','EFFECT_CANNOT_MSET'):out.append(f'do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode({code}) e:SetProperty(EFFECT_FLAG_PLAYER_TARGET) e:SetTargetRange(1,0) e:SetTarget(function(e,c) return c:GetTributeRequirement()>0 end) Duel.RegisterEffect(e,0) end')
 elif key=='empty_hand_pact':atk(1000,'Duel.GetFieldGroupCount(0,LOCATION_HAND,0)==0');handlimit(4)
 elif key=='deep_pockets':handlimit(9)
 elif key=='corpse_ritual':
  # Monsters in your GY count as Ritual Material; the Ritual procedure (Duel.ReleaseRitualMaterial) banishes them.
  out.append('do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_EXTRA_RITUAL_MATERIAL) e:SetTargetRange(LOCATION_GRAVE,0) e:SetTarget(function(e,c) return c:IsMonster() end) e:SetValue(1) Duel.RegisterEffect(e,0) end')
  out.append(event('EVENT_REMOVE','--[[relic-hint]]','eg:IsExists(function(c) return c:IsPreviousLocation(LOCATION_GRAVE) and c:IsPreviousControler(0) and c:IsReason(REASON_RITUAL) end,1,nil)'))
 elif key=='illusionary_tribute':
  # True Draco's rule (EFFECT_ADD_EXTRA_TRIBUTE): the effect sits on the monster being summoned and names where extra
  # Tributes may come from. Every monster you own gets it at the start of the Duel, and any that reach your hand later.
  # It switches off for good once a Tribute Summon or Set has used a Spell or Trap.
  used='not used and eg:IsExists(function(c) return c:IsControler(0) and c:GetMaterial() and c:GetMaterial():IsExists(function(m) return m:IsPreviousLocation(LOCATION_SZONE) end,1,nil) end,1,nil)'
  out.append('''do local used=false
local function give(c) if not c:IsMonster() or c:GetFlagEffect(93720111)>0 then return end c:RegisterFlagEffect(93720111,0,0,1)
 local x=Effect.CreateEffect(c) x:SetType(EFFECT_TYPE_SINGLE) x:SetProperty(EFFECT_FLAG_CANNOT_DISABLE|EFFECT_FLAG_UNCOPYABLE) x:SetCode(EFFECT_ADD_EXTRA_TRIBUTE) x:SetTargetRange(LOCATION_SZONE,0) x:SetCondition(function() return not used end) x:SetValue(POS_FACEUP_ATTACK|POS_FACEDOWN_DEFENSE) c:RegisterEffect(x,true) end
'''+event('EVENT_STARTUP','for c in Duel.GetMatchingGroup(Card.IsMonster,0,LOCATION_HAND|LOCATION_DECK,0,nil):Iter() do give(c) end')
   +' '+event('EVENT_TO_HAND','for c in eg:Filter(function(c) return c:IsControler(0) end,nil):Iter() do give(c) end')
   +' '+event('EVENT_SUMMON_SUCCESS','used=true --[[relic-hint]]',used)+' '+event('EVENT_MSET','used=true --[[relic-hint]]',used)+' end')
 elif key=='overkill_bounty':pass # Coins only: approved_relics.rewards.
 elif key=='parting_gift':
  out.append('do local last=-1 '+event('EVENT_TO_GRAVE','last=Duel.GetTurnCount() Duel.Draw(0,1,REASON_EFFECT)','last~=Duel.GetTurnCount() and rp==1 and eg:IsExists(function(c) return c:IsMonster() and c:IsControler(0) and c:IsReason(REASON_EFFECT) end,1,nil)')+' end')
 elif key=='tactical_espionage':
  # Tactical Espionage Expert's effect, for every monster you Normal Summon.
  out.append(event('EVENT_SUMMON_SUCCESS','--[[relic-hint]] Duel.SetChainLimitTillChainEnd(function(re) return not re:GetHandler():IsTrap() or not re:IsHasType(EFFECT_TYPE_ACTIVATE) end)','eg:IsExists(function(c) return c:IsControler(0) end,1,nil)'))
 elif key=='stars_aligned':
  # The turn player is the relic's owner here, so the summon needs no fixed player number (Relic Mirror gives it to the opponent).
  out.append('''do local function level() local g=Duel.GetMatchingGroup(Card.IsMonster,0,LOCATION_GRAVE|LOCATION_MZONE,0,nil) if #g==0 then return nil end local l=g:GetFirst():GetLevel() if l<=0 or g:IsExists(function(c) return c:GetLevel()~=l end,1,nil) then return nil end return l end
local function can(c,e,l,p) return c:IsMonster() and c:GetLevel()==l and c:IsCanBeSpecialSummoned(e,0,p,false,false) end
'''+event('EVENT_PHASE_START|PHASE_END','local p=Duel.GetTurnPlayer() local l=level() if not l then return end --[[relic-ask]] Duel.Hint(HINT_SELECTMSG,0,HINTMSG_SPSUMMON) local g=Duel.SelectMatchingCard(0,can,0,LOCATION_HAND,0,0,1,nil,e,l,p) if #g>0 then Duel.SpecialSummon(g,0,p,p,false,false,POS_FACEUP) end','Duel.GetTurnPlayer()==0 and Duel.GetLocationCount(0,LOCATION_MZONE)>0 and level()~=nil and Duel.IsExistingMatchingCard(can,0,LOCATION_HAND,0,1,nil,e,level(),Duel.GetTurnPlayer())',True)+' end')
 elif key=='anime_rule_2':
  # "You destroy": the effect's player is you (rp). One hit of damage for everything a single effect destroyed.
  hit='function(c) return c:IsPreviousControler(1) and c:IsPreviousLocation(LOCATION_MZONE) and c:IsReason(REASON_EFFECT) end'
  out.append(event('EVENT_DESTROYED',f'local sum=0 for c in eg:Filter({hit},nil):Iter() do sum=sum+math.floor(math.max(0,c:GetPreviousAttackOnField())/2) end if sum>0 then Duel.Damage(1,sum,REASON_EFFECT) end',f'rp==0 and eg:IsExists({hit},1,nil)'))
  out.append(stat('EFFECT_CANNOT_DIRECT_ATTACK',1))
 elif key=='solitary_tyrant':atk(400,'Duel.GetFieldGroupCount(0,LOCATION_MZONE,0)==1');atk(-500,'Duel.GetFieldGroupCount(0,LOCATION_MZONE,0)>1')
 elif key=='crowded_crypt':atk('function() return math.min(750,75*Duel.GetMatchingGroupCount(Card.IsMonster,0,LOCATION_GRAVE,0,nil)) end');handlimit(2)
 elif key=='golden_grave':defense(-400)
 elif key=='scorched_clock':out.extend([phase('STANDBY','Duel.Damage(1,400,REASON_EFFECT)'),phase('END','Duel.Damage(0,300,REASON_EFFECT)')])
 elif key=='reckless_spear':out.append(stat('EFFECT_DIRECT_ATTACK',1));atk(-1000)
 elif key=='nocturnal_guard':defense(600,'Duel.GetTurnPlayer()==1');atk(-300,'Duel.GetTurnPlayer()==0')
 elif key=='narrow_gate':
  out.append('''if not RogueNarrowGate then RogueNarrowGate=true local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_DISABLE_FIELD) e:SetValue(0x18181818) Duel.RegisterEffect(e,0) end''')
 elif key=='trapbound_idol':
  out.append(stat('EFFECT_INDESTRUCTABLE_BATTLE',1,'c:IsType(TYPE_TRAPMONSTER)'))
  # Paid as the card activates, so a Spell you cannot afford cannot be activated.
  out.append('do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_ACTIVATE_COST) e:SetProperty(EFFECT_FLAG_PLAYER_TARGET) e:SetTargetRange(1,0) e:SetTarget(function(e,te,tp) return te:IsHasType(EFFECT_TYPE_ACTIVATE) and te:IsActiveType(TYPE_SPELL) end) e:SetCost(function(e,te,tp) return Duel.CheckLPCost(tp,300) end) e:SetOperation(function(e,tp) Duel.PayLPCost(tp,300) end) Duel.RegisterEffect(e,0) end')
 elif key=='burn_proficiency':
  out.append('do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_CHANGE_DAMAGE) e:SetProperty(EFFECT_FLAG_PLAYER_TARGET) e:SetTargetRange(0,1) e:SetValue(function(e,re,val,r,rp) if val<=0 or rp~=0 or (r&REASON_EFFECT)==0 then return val end return math.floor(val*1.5) end) Duel.RegisterEffect(e,0) end')
 elif key=='defense_proficiency':
  # Battle damage both ways is halved in battle_rules; this halves the effect damage you take.
  out.append(player_rule('EFFECT_CHANGE_DAMAGE','function(e,re,val,r,rp) if val<=0 or (r&REASON_BATTLE)~=0 then return val end return math.floor(val/2) end'))
 elif key=='straw_doll':
  out.append('do local used=-1 '+event('EVENT_PRE_BATTLE_DAMAGE','used=Duel.GetTurnCount() --[[relic-hint]] Duel.ChangeBattleDamage(0,0)','ep==0 and Duel.GetTurnPlayer()==1 and used~=Duel.GetTurnCount() and Duel.GetBattleDamage(0)>0')+' end')
 elif key=='almighty':
  # Immune only to fixed ATK/DEF losses and to the opponent's fixed "becomes" values, so no rescans are needed.
  out.append('''do RogueAlmighty=true local up={[EFFECT_UPDATE_ATTACK]=true,[EFFECT_UPDATE_DEFENSE]=true} local set={[EFFECT_SET_ATTACK]=true,[EFFECT_SET_ATTACK_FINAL]=true,[EFFECT_SET_BASE_ATTACK]=true,[EFFECT_SET_DEFENSE]=true,[EFFECT_SET_DEFENSE_FINAL]=true,[EFFECT_SET_BASE_DEFENSE]=true}
local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_IMMUNE_EFFECT) e:SetTargetRange(LOCATION_MZONE,0)
e:SetValue(function(e,te) local code=te:GetCode() local v=te:GetValue() if type(v)~='number' then return false end if up[code] then return v<0 end return set[code]==true and te:GetOwnerPlayer()==1 end)
Duel.RegisterEffect(e,0) end''')
 elif key=='anime_rule':
  # Only widens the position a Normal Summon can pick. EFFECT_LIGHT_OF_INTERVENTION would also turn every face-down Special Summon face-up.
  out.append('do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_NORMAL_SUMMON_FACEUP_DEFENSE) e:SetProperty(EFFECT_FLAG_PLAYER_TARGET) e:SetTargetRange(1,0) Duel.RegisterEffect(e,0) end')
 elif key=='mind_reader':
  out.append(phase('STANDBY','--[[relic-hint]] --[[relic-ask]] Duel.Hint(HINT_SELECTMSG,0,HINTMSG_CONFIRM) local g=Duel.SelectMatchingCard(0,Card.IsFacedown,0,0,LOCATION_ONFIELD,1,1,nil) if #g>0 then Duel.ConfirmCards(0,g) end','Duel.IsExistingMatchingCard(Card.IsFacedown,0,0,LOCATION_ONFIELD,1,nil)'))
 elif key=='jesters_coin':
  # The last toss holds until the next Standby Phase: +1 heads, -1 tails, 0 before the first toss. No call,
  # so the duel does not stop for a prompt (2026-10-29).
  # --[[relic-hint]] marks where passives.py shows the relic, since the toss's result is assigned.
  # Almighty (RogueAlmighty) keeps tails from lowering your monsters.
  out.append('do local call=0 local function value() local v=300*call if RogueAlmighty and v<0 then return 0 end return v end '+phase('STANDBY','--[[relic-hint]] call=Duel.TossCoin(0,1)==COIN_HEADS and 1 or -1')+' '+stat('EFFECT_UPDATE_ATTACK','value')+' '+stat('EFFECT_UPDATE_DEFENSE','value')+' end')
 elif key=='berserkers_pact':out.extend([stat('EFFECT_EXTRA_ATTACK',1),player_rule('EFFECT_CANNOT_MSET','1'),ATTACK_ONLY_SUMMONS,player_rule('EFFECT_CANNOT_ACTIVATE',f'function(e,re,tp) return re:GetHandler():IsCode({DEFENSE_ONLY_SUMMONS}) end')])
 elif key=='shield_bash':
  # Total Defense Shogun's rule: a face-up Defense Position monster attacks and uses its DEF.
  out.extend([stat('EFFECT_DEFENSE_ATTACK',1,'c:IsDefensePos()'),stat('EFFECT_CANNOT_ATTACK',1,'c:IsAttackPos()')])
 elif key=='reversed_remedy':
  # Both players. The core cancels REVERSE_DAMAGE when REVERSE_RECOVER is also active, so healing is turned into
  # damage by wrapping the global Duel.Recover instead (as the Withered Hope curse does). That damage carries
  # REASON_RRECOVER, which the reversal skips, so the two rules never loop. LP costs heal through the original Recover,
  # and are always affordable because they no longer cost anything. Once per Duel, even if both players own it.
  out.append('if not RogueReversedRemedy then RogueReversedRemedy=true local D=(_G and _G.Duel) or Duel local damage,recover=D.Damage,D.Recover D.PayLPCost=function(p,cost) return recover(p,cost,REASON_EFFECT) end D.CheckLPCost=function() return true end D.Recover=function(p,val,r,...) return damage(p,val,(r or REASON_EFFECT)|REASON_RRECOVER,...) end local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_REVERSE_DAMAGE) e:SetProperty(EFFECT_FLAG_PLAYER_TARGET) e:SetTargetRange(1,1) e:SetValue(function(e,re,r,rp,rc) return (r&REASON_EFFECT)~=0 and (r&REASON_RRECOVER)==0 end) D.RegisterEffect(e,0) RogueRemedyUndo=function() e:Reset() D.Recover=recover return recover end end')
 elif key=='ominous_clock':pass # Needs the run's turn count: see ominous_clock below.
 elif key=='conscription_drum':
  # Exactly Double Summon's effect, permanent and with no activation: 2 Normal Summons or Sets per turn, in any mix,
  # with no "which summon" prompt (user, 2026-11-11). Double Summon itself is not in the game, so they never clash.
  out.append('do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_SET_SUMMON_COUNT_LIMIT) e:SetProperty(EFFECT_FLAG_PLAYER_TARGET) e:SetTargetRange(1,0) e:SetValue(2) Duel.RegisterEffect(e,0) end')
  out.append(stat('EFFECT_CANNOT_ATTACK',1,'c:IsStatus(STATUS_SUMMON_TURN) and c:IsSummonType(SUMMON_TYPE_NORMAL)'))
 elif key=='iron_silence':
  both(600)
  out.extend([stat('EFFECT_DISABLE',1),stat('EFFECT_DISABLE_EFFECT',1),event('EVENT_CHAIN_SOLVING','Duel.NegateEffect(ev)','re and re:IsActiveType(TYPE_MONSTER) and rp==0')])
 # Relics of 2026-11-12 (Discord suggestions with the user's edits). Choices go through Group:Select, which
 # multiplayer_script hands to the relic's owner; summons use the turn player, who owns these phase effects.
 elif key=='anime_rule_3':
  # Tribute_free's method, taking off every Tribute a Level 5+ monster needs.
  for code in ('EFFECT_DECREASE_TRIBUTE','EFFECT_DECREASE_TRIBUTE_SET'):
   out.append(f'do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode({code}) e:SetTargetRange(LOCATION_HAND,0) e:SetTarget(function(e,c) return c:IsMonster() and c:IsLevelAbove(5) end) e:SetValue(function(e,c) return 3 end) Duel.RegisterEffect(e,0) end')
  both(-1000,'not Duel.IsExistingMatchingCard(Card.IsFaceup,0,LOCATION_FZONE,0,1,nil)')
 elif key=='typhoon':
  mine='function(c) return c:IsSpellTrap() end'
  # The opponent's End Phase (Prunk44/user, 2026-11-12), so a Set card can be cleared before their turn.
  out.append(event('EVENT_PHASE_START|PHASE_END',f'local g=Duel.GetMatchingGroup({mine},0,LOCATION_SZONE,0,nil) --[[relic-ask]] Duel.Hint(HINT_SELECTMSG,0,HINTMSG_DESTROY) local s=g:Select(0,0,1,nil) if #s==0 then return end --[[relic-hint]] if Duel.Destroy(s,REASON_EFFECT)==0 then return end local o=Duel.GetMatchingGroup({mine},0,0,LOCATION_SZONE,nil) if #o==0 then return end Duel.Hint(HINT_SELECTMSG,0,HINTMSG_DESTROY) Duel.Destroy(o:Select(0,1,1,nil),REASON_EFFECT)',
   f'Duel.GetTurnPlayer()==1 and Duel.IsExistingMatchingCard({mine},0,LOCATION_SZONE,0,1,nil) and Duel.IsExistingMatchingCard({mine},0,0,LOCATION_SZONE,1,nil)',True))
 elif key=='machine_duplication':
  machine='function(c) return c:IsFaceup() and c:IsRace(RACE_MACHINE) end'
  out.append(phase('END',f'''local p=Duel.GetTurnPlayer() local g=Duel.GetMatchingGroup({machine},0,LOCATION_MZONE,0,nil) --[[relic-ask]] Duel.Hint(HINT_SELECTMSG,0,HINTMSG_TARGET) local c=g:Select(0,0,1,nil):GetFirst() if not c then return end
local t=Duel.CreateToken(0,86871615) local reset=RESET_EVENT|(RESETS_STANDARD&~RESET_TOFIELD)
local function give(code,value) local x=Effect.CreateEffect(t) x:SetType(EFFECT_TYPE_SINGLE) x:SetCode(code) x:SetValue(value) x:SetReset(reset) t:RegisterEffect(x,true) end
give(EFFECT_SET_BASE_ATTACK,math.floor(math.max(0,c:GetAttack())/2)) give(EFFECT_SET_BASE_DEFENSE,math.floor(math.max(0,c:GetDefense())/2)) give(EFFECT_CHANGE_RACE,RACE_MACHINE) give(EFFECT_CHANGE_ATTRIBUTE,c:GetAttribute()) if c:GetLevel()>0 then give(EFFECT_CHANGE_LEVEL,c:GetLevel()) end
--[[relic-hint]] Duel.SpecialSummonStep(t,0,p,p,false,false,POS_FACEUP_ATTACK) Duel.SpecialSummonComplete()''',
   f'Duel.GetLocationCount(0,LOCATION_MZONE)>0 and Duel.IsExistingMatchingCard({machine},0,LOCATION_MZONE,0,1,nil)'))
 elif key=='ghost_destruction':
  # Kycoo the Ghost Destroyer's effect for every monster you control, 1 monster from either GY.
  ghost='function(c) return c:IsMonster() and c:IsAbleToRemove() end'
  out.append(event('EVENT_BATTLE_DAMAGE',f'local g=Duel.GetMatchingGroup({ghost},0,LOCATION_GRAVE,LOCATION_GRAVE,nil) --[[relic-ask]] Duel.Hint(HINT_SELECTMSG,0,HINTMSG_REMOVE) local s=g:Select(0,0,1,nil) if #s>0 then --[[relic-hint]] Duel.Remove(s,POS_FACEUP,REASON_EFFECT) end',
   f'ep==1 and Duel.IsExistingMatchingCard({ghost},0,LOCATION_GRAVE,LOCATION_GRAVE,1,nil)'))
 elif key=='omni_banishment':
  out.append(phase('STANDBY','local g=Duel.GetMatchingGroup(Card.IsAbleToRemove,0,LOCATION_DECK,0,nil) --[[relic-ask]] Duel.Hint(HINT_SELECTMSG,0,HINTMSG_REMOVE) local s=g:Select(0,0,1,nil) if #s>0 then --[[relic-hint]] Duel.Remove(s,POS_FACEUP,REASON_EFFECT) end Duel.ShuffleDeck(0)',
   'Duel.IsExistingMatchingCard(Card.IsAbleToRemove,0,LOCATION_DECK,0,1,nil)'))
 elif key=='dimensional_rift':
  # Macro Cosmos's rule for both players, from the start of the Duel.
  out.append('do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_TO_GRAVE_REDIRECT) e:SetProperty(EFFECT_FLAG_IGNORE_IMMUNE) e:SetTargetRange(0xff,0xff) e:SetValue(LOCATION_REMOVED) Duel.RegisterEffect(e,0) end')
 elif key=='spell_provider':
  holder='function(c) return c:IsFaceup() and c:IsCanAddCounter(COUNTER_SPELL,1) end'
  out.append(phase('STANDBY',f'local g=Duel.GetMatchingGroup({holder},0,LOCATION_ONFIELD,0,nil) --[[relic-ask]] Duel.Hint(HINT_SELECTMSG,0,HINTMSG_FACEUP) local s=g:Select(0,0,1,nil) if #s>0 then --[[relic-hint]] s:GetFirst():AddCounter(COUNTER_SPELL,1) end',
   f'Duel.IsExistingMatchingCard({holder},0,LOCATION_ONFIELD,0,1,nil)'))
 elif key=='cursed_restock':pass # Shop only: campaign_expansion.reroll_price and buy.
 elif key=='disturbed_sleep':
  # Every End Phase, both players' face-down Defense Position monsters; FLIP effects activate as they turn face-up.
  hidden='function(c) return c:IsPosition(POS_FACEDOWN_DEFENSE) end'
  out.append(event('EVENT_PHASE_START|PHASE_END',f'local g=Duel.GetMatchingGroup({hidden},0,LOCATION_MZONE,LOCATION_MZONE,nil) if #g==0 then return end --[[relic-hint]] Duel.ChangePosition(g,POS_FACEUP_ATTACK)',
   f'Duel.IsExistingMatchingCard({hidden},0,LOCATION_MZONE,LOCATION_MZONE,1,nil)',True))
 elif key=='gadget_call':
  # The Gadgets' searches call Duel.SendtoHand from their resolving effect: the global function is wrapped (as Reversed
  # Remedy wraps Duel.Recover), so the summon is the last thing the effect does and the summoned Gadget's own search
  # can still activate. With no free zone, or when the core forbids the summon, the card goes to the hand as usual.
  out.append('''do local D=(_G and _G.Duel) or Duel local send=D.SendtoHand
D.SendtoHand=function(targets,player,reason,...)
 local te=D.GetCurrentChain()>0 and D.GetChainInfo(0,CHAININFO_TRIGGERING_EFFECT) or nil local h=te and te:GetHandler()
 if not (h and reason and (reason&REASON_EFFECT)~=0 and te:IsActiveType(TYPE_MONSTER) and h:IsSetCard(SET_GADGET)) then return send(targets,player,reason,...) end
 local g=targets.GetCount and targets:Clone() or Group.FromCards(targets)
 local s=g:Filter(function(c) return c~=h and c:IsControler(0) and c:IsMonster() and c:IsSetCard(SET_GADGET) and not c:IsLocation(LOCATION_HAND) end,nil)
 local tc=s:GetFirst() if #s~=1 or not tc:IsCanBeSpecialSummoned(te,0,tc:GetControler(),false,false) or D.GetLocationCount(tc:GetControler(),LOCATION_MZONE)<1 then return send(targets,player,reason,...) end
 g:RemoveCard(tc) --[[relic-hint]] local n=D.SpecialSummon(tc,0,tc:GetControler(),tc:GetControler(),false,false,POS_FACEUP)
 if #g>0 then n=n+send(g,player,reason,...) end return n end end''')
 elif key=='vampiric_contact':
  # Its ATK as it left the field; the loss is LP lost, not damage, so damage modifiers don't change it.
  out.append(event('EVENT_BATTLE_DESTROYED','''local won=eg:FilterCount(function(c) return c:IsPreviousControler(1) end,nil) local lost=0
for c in eg:Iter() do if c:IsPreviousControler(0) then lost=lost+math.max(0,c:GetPreviousAttackOnField()) end end
if won+lost>0 then --[[relic-hint]] end if won>0 then Duel.Recover(0,500*won,REASON_EFFECT) end if lost>0 then Duel.SetLP(0,math.max(0,Duel.GetLP(0)-lost)) end''',
   'eg:IsExists(function(c) return c:IsPreviousControler(0) or c:IsPreviousControler(1) end,1,nil)'))
 elif key=='armory_aid':
  out.append('''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_STARTUP)
e:SetOperation(function(e) e:Reset() local g=Duel.GetMatchingGroup(function(c) return c:IsSpell() and c:IsType(TYPE_EQUIP) and c:IsAbleToHand() end,0,LOCATION_DECK,0,nil) if #g==0 then return end --[[relic-hint]] Duel.SendtoHand(g:RandomSelect(0,1),0,REASON_RULE) Duel.ShuffleDeck(0) end) Duel.RegisterEffect(e,0) end''')
 elif key=='spiritual_retribution':
  # A second Tribute Summon procedure for Spirits in your hand, used once per Duel: the Tributes are monsters banished
  # from your GY (as many as the Spirit needs), the same idea as Corpse Ritual for Ritual Summons.
  # When a normal Tribute Summon is possible too, the choice reads "Normal Summon" / "Banish" (system string 1107).
  out.append(spirit_tribute(True))
 elif key=='gadget_stronghold':
  # Like Metal Coating: the Duel adds a copy to the Deck when it holds none (campaign_expansion).
  out.append(f'''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_STARTUP)
e:SetOperation(function(e) e:Reset() if Duel.IsExistingMatchingCard(Card.IsCode,0,LOCATION_HAND,0,1,nil,{STRONGHOLD}) then return end local g=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_DECK,0,nil,{STRONGHOLD}) if #g>0 then Duel.SendtoHand(g:GetFirst(),0,REASON_RULE) end end) Duel.RegisterEffect(e,0) end''')
 return '\n'.join(out)

def spirit_tribute(once):
 script='''do local used=false local function gy(c) return c:IsMonster() and c:IsAbleToRemoveAsCost() end
local e=Effect.GlobalEffect() e:SetDescription(1107) e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_SUMMON_PROC) e:SetTargetRange(LOCATION_HAND,0) e:SetValue(SUMMON_TYPE_TRIBUTE)
e:SetCondition(function(e,c,minc) if c==nil then return true end if used then return false end local n=c:GetTributeRequirement() local p=c:GetControler()
 return n>0 and minc<=n and Duel.GetLocationCount(p,LOCATION_MZONE)>0 and Duel.IsExistingMatchingCard(gy,p,LOCATION_GRAVE,0,n,nil) end)
e:SetTarget(aux.FieldSummonProcTg(function(e,c) return c:IsType(TYPE_SPIRIT) end,function(e,tp,eg,ep,ev,re,r,rp,chk,c) local n=c:GetTributeRequirement()
 Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE) local g=Duel.SelectMatchingCard(tp,gy,tp,LOCATION_GRAVE,0,n,n,true,nil) if g and #g==n then g:KeepAlive() e:SetLabelObject(g) return true end return false end))
e:SetOperation(function(e,tp,eg,ep,ev,re,r,rp,c) local g=e:GetLabelObject() used=true --[[relic-hint]] Duel.Remove(g,POS_FACEUP,REASON_COST) g:DeleteGroup() end)
Duel.RegisterEffect(e,0) end'''
 if once:return script
 return script.replace('local used=false ','').replace(' if used then return false end','').replace(' used=true','')

def ominous_clock(run,hint=''):
 from approved_relics import copies
 base=int(run.get('clock_turns',0))
 return '\n'.join([f'''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_STANDBY) e:SetCountLimit(1) e:SetCondition(function() return Duel.GetTurnPlayer()==1 end)
e:SetOperation(function() {hint}local amount=600-100*math.floor(({base}+Duel.GetTurnCount())/10) if amount>0 then Duel.Damage(1,amount,REASON_EFFECT) elseif amount<0 then Duel.Recover(1,-amount,REASON_EFFECT,false,0) end end) Duel.RegisterEffect(e,0) end''']*copies(run,'cursed_ominous_clock'))

def effect_reverser(scale):
 # Reversed Remedy's method, without its LP-cost rule. Emitted after the relics, where RogueRemedyUndo means Reversed
 # Remedy is active too: two reversals cancel, so whatever both flip goes back to normal and its LP-cost rule stays.
 # At Level 2+ only what player 0 does to the opponent flips.
 side='local _,rp=... if rp==nil and D.GetCurrentChain()>0 then rp=D.GetChainInfo(0,CHAININFO_TRIGGERING_PLAYER) end'
 reverse=lambda players,only:f'local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_REVERSE_DAMAGE) e:SetProperty(EFFECT_FLAG_PLAYER_TARGET) e:SetTargetRange({players}) e:SetValue(function(e,re,r,rp,rc) return {only}(r&REASON_EFFECT)~=0 and (r&REASON_RRECOVER)==0 end) D.RegisterEffect(e,0)'
 if scale>=2:
  wrapper=f'local recover=D.Recover D.Recover=function(p,val,r,...) {side} if p==1 and rp==0 then return damage(p,val,(r or REASON_EFFECT)|REASON_RRECOVER,...) end return recover(p,val,r,...) end '+reverse('0,1','rp==0 and ')
  cancelled=f'local recover=RogueRemedyUndo() D.Recover=function(p,val,r,...) {side} if p==1 and rp==0 then return recover(p,val,r,...) end return damage(p,val,(r or REASON_EFFECT)|REASON_RRECOVER,...) end do '+reverse('1,0','')+' end do '+reverse('0,1','rp~=0 and ')+' end'
 else:
  wrapper='D.Recover=function(p,val,r,...) return damage(p,val,(r or REASON_EFFECT)|REASON_RRECOVER,...) end '+reverse('1,1','')
  cancelled='RogueRemedyUndo()'
 return f'do local D=(_G and _G.Duel) or Duel local damage=D.Damage if RogueRemedyUndo then {cancelled} else {wrapper} end end'

def shield_breaker(scale):
 out=[player_rule('EFFECT_CANNOT_MSET','1')]
 if scale>=2:
  out.extend([ATTACK_ONLY_SUMMONS,player_rule('EFFECT_CANNOT_ACTIVATE',f'function(e,re,tp) return re:IsHasCategory(CATEGORY_SPECIAL_SUMMON) and re:GetHandler():IsCode({DEFENSE_SUMMON_EFFECTS}) end')])
  # Anything the list misses still cannot put a monster in Defense Position.
  out.append('do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_CANNOT_SPECIAL_SUMMON) e:SetProperty(EFFECT_FLAG_PLAYER_TARGET) e:SetTargetRange(1,0) e:SetTarget(function(e,c,sump,sumtype,sumpos) return sumpos and (sumpos&POS_ATTACK)==0 end) Duel.RegisterEffect(e,0) end')
 return '\n'.join(out)

def no_specials(scale):
 return f'do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_CANNOT_SPECIAL_SUMMON) e:SetProperty(EFFECT_FLAG_PLAYER_TARGET) e:SetTargetRange(1,{0 if scale>=2 else 1}) Duel.RegisterEffect(e,0) end'

def relic_hand_limit(run):
 from approved_relics import has,copies
 return max(0,(3 if has(run,'cursed_starving_library') else 6)+3*copies(run,'deep_pockets')+2*copies(run,'endless_archive')-2*copies(run,'mass_grave')-2*copies(run,'cursed_empty_hand_pact')-4*copies(run,'cursed_crowded_crypt'))

def hand_limiter(run,scale):
 # The core uses the last hand limit registered, so this one starts from any relic's limit.
 return player_rule('EFFECT_HAND_LIMIT',max(0,relic_hand_limit(run)-(3 if scale>=2 else 2)*run['curses'].count('hand_limiter')))

def miller(scale):
 count='math.floor(Duel.GetFieldGroupCount(0,LOCATION_DECK,0)/2)' if scale>=2 else '10'
 return f'do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_STANDBY) e:SetCondition(function() return Duel.GetTurnPlayer()==0 end) e:SetOperation(function(e) e:Reset() Duel.DiscardDeck(0,{count},REASON_EFFECT) end) Duel.RegisterEffect(e,0) end'

def battle_damage_scale(run,scale=1):
 """How much the battle damage each player takes is scaled after damage calculation, by battle_rules, Hollow Chalice
 and the Exposed and Mercy curses: (you take, your opponent takes). Nutrient Z checks the damage before those changes,
 so its condition multiplies by this (Prunk44, Discord 2026-11-09)."""
 from approved_relics import copies
 shield=.5**copies(run,'cursed_defense_proficiency')
 taken=1.5**copies(run,'cursed_duelists_wager')*shield*1.5**copies(run,'hollow_chalice')
 dealt=1.5**(copies(run,'cursed_duelists_wager')+copies(run,'battle_proficiency'))*shield
 curses=run.get('curses',[])
 taken*=(2 if scale>=2 else 1.5)**curses.count('exposed')
 dealt/=(3 if scale>=2 else 2)**curses.count('mercy')
 return taken,dealt

def battle_rules(run,relic_hint=lambda key:''):
 from approved_relics import copies
 shield=.5**copies(run,'cursed_defense_proficiency')
 out=1.5**(copies(run,'cursed_duelists_wager')+copies(run,'battle_proficiency'))*shield
 inc=1.5**copies(run,'cursed_duelists_wager')*shield
 if out==1 and inc==1:return ''
 def shown(*keys):return ''.join(relic_hint(key) for key in keys if copies(run,key))
 return event('EVENT_PRE_BATTLE_DAMAGE',f"if Duel.GetBattleDamage(ep)>0 then if ep==0 then {shown('cursed_duelists_wager','cursed_defense_proficiency')}else {shown('cursed_duelists_wager','battle_proficiency','cursed_defense_proficiency')}end end Duel.ChangeBattleDamage(ep,math.floor(Duel.GetBattleDamage(ep)*(ep==0 and {inc} or {out})))")
