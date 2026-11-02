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
  out.append(event('EVENT_SUMMON_SUCCESS','Duel.Hint(HINT_MESSAGE,0,900000002)','eg:IsExists(function(c) return c:IsControler(0) and c:IsSummonType(SUMMON_TYPE_TRIBUTE) end,1,nil)'))
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
  out.append(event('EVENT_SPSUMMON_SUCCESS','local g=eg:Filter(function(c) return c:IsControler(0) and c:IsSummonType(SUMMON_TYPE_RITUAL) end,nil) n=n+#g for c in g:Iter() do Duel.Hint(HINT_MESSAGE,c:GetControler(),1900000051) end'));out.append('end')
 elif key=='fusion_fever':
  atk(1000,'c:IsType(TYPE_FUSION)');out.append(stat('EFFECT_PIERCE',1,'c:IsType(TYPE_FUSION)'))
  for code in ('EFFECT_CANNOT_SUMMON','EFFECT_CANNOT_MSET'):out.append(f'do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode({code}) e:SetProperty(EFFECT_FLAG_PLAYER_TARGET) e:SetTargetRange(1,0) e:SetTarget(function(e,c) return c:GetTributeRequirement()>0 end) Duel.RegisterEffect(e,0) end')
 elif key=='empty_hand_pact':atk(1000,'Duel.GetFieldGroupCount(0,LOCATION_HAND,0)==0');handlimit(4)
 elif key=='solitary_tyrant':atk(400,'Duel.GetFieldGroupCount(0,LOCATION_MZONE,0)==1');atk(-500,'Duel.GetFieldGroupCount(0,LOCATION_MZONE,0)>1')
 elif key=='crowded_crypt':atk('function() return math.min(750,75*Duel.GetMatchingGroupCount(Card.IsMonster,0,LOCATION_GRAVE,0,nil)) end');handlimit(2)
 elif key=='golden_grave':defense(-400)
 elif key=='scorched_clock':out.extend([phase('STANDBY','Duel.Damage(1,400,REASON_EFFECT)'),phase('END','Duel.Damage(0,300,REASON_EFFECT)')])
 elif key=='reckless_spear':out.append(stat('EFFECT_PIERCE',1))
 elif key=='nocturnal_guard':defense(600,'Duel.GetTurnPlayer()==1');atk(-300,'Duel.GetTurnPlayer()==0')
 elif key=='narrow_gate':
  out.append('''if not RogueNarrowGate then RogueNarrowGate=true local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_DISABLE_FIELD) e:SetValue(0x18181818) Duel.RegisterEffect(e,0) end''')
 elif key=='trapbound_idol':atk(1000,'c:IsType(TYPE_TRAPMONSTER)');defense(-1000,'c:IsType(TYPE_TRAPMONSTER)')
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
  out.append('do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_EXTRA_SUMMON_COUNT) e:SetTargetRange(LOCATION_HAND|LOCATION_MZONE,0) Duel.RegisterEffect(e,0) end')
  out.append(stat('EFFECT_CANNOT_ATTACK',1,'c:IsStatus(STATUS_SUMMON_TURN) and c:IsSummonType(SUMMON_TYPE_NORMAL)'))
 elif key=='iron_silence':
  both(600)
  out.extend([stat('EFFECT_DISABLE',1),stat('EFFECT_DISABLE_EFFECT',1),event('EVENT_CHAIN_SOLVING','Duel.NegateEffect(ev)','re and re:IsActiveType(TYPE_MONSTER) and rp==0')])
 return '\n'.join(out)

def ominous_clock(run):
 from approved_relics import copies
 base=int(run.get('clock_turns',0))
 return '\n'.join([f'''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_STANDBY) e:SetCountLimit(1) e:SetCondition(function() return Duel.GetTurnPlayer()==1 end)
e:SetOperation(function() local amount=600-100*math.floor(({base}+Duel.GetTurnCount())/10) if amount>0 then Duel.Damage(1,amount,REASON_EFFECT) elseif amount<0 then Duel.Recover(1,-amount,REASON_EFFECT,false,0) end end) Duel.RegisterEffect(e,0) end''']*copies(run,'cursed_ominous_clock'))

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
 return max(0,(3 if has(run,'cursed_starving_library') else 6)-2*copies(run,'cursed_empty_hand_pact')-4*copies(run,'cursed_crowded_crypt'))

def hand_limiter(run,scale):
 # The core uses the last hand limit registered, so this one starts from any relic's limit.
 return player_rule('EFFECT_HAND_LIMIT',max(0,relic_hand_limit(run)-(3 if scale>=2 else 2)*run['curses'].count('hand_limiter')))

def miller(scale):
 count='math.floor(Duel.GetFieldGroupCount(0,LOCATION_DECK,0)/2)' if scale>=2 else '10'
 return f'do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_STANDBY) e:SetCondition(function() return Duel.GetTurnPlayer()==0 end) e:SetOperation(function(e) e:Reset() Duel.DiscardDeck(0,{count},REASON_EFFECT) end) Duel.RegisterEffect(e,0) end'

def battle_rules(run):
 from approved_relics import copies
 shield=.5**copies(run,'cursed_defense_proficiency')
 out=1.5**(copies(run,'cursed_duelists_wager')+copies(run,'battle_proficiency'))*shield
 inc=1.5**(copies(run,'cursed_duelists_wager')+copies(run,'cursed_reckless_spear'))*shield
 if out==1 and inc==1:return ''
 return event('EVENT_PRE_BATTLE_DAMAGE',f'Duel.ChangeBattleDamage(ep,math.floor(Duel.GetBattleDamage(ep)*(ep==0 and {inc} or {out})))')
