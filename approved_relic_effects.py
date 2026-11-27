"""Core effects for approved relics; all effects are persistent duel rules."""
def stat(code,value,target='true',enemy=False):
 return f'''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode({code}) e:SetTargetRange({'0,LOCATION_MZONE' if enemy else 'LOCATION_MZONE,0'}) e:SetTarget(function(e,c) return c:IsFaceup() and ({target}) end) e:SetValue({value}) Duel.RegisterEffect(e,0) end'''

def event(code,operation,condition='true',phase=False):
 return f'''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode({code}) {'e:SetCountLimit(1)' if phase else ''} e:SetCondition(function(e,tp,eg,ep,ev,re,r,rp) return {condition} end) e:SetOperation(function(e,tp,eg,ep,ev,re,r,rp) {operation} end) Duel.RegisterEffect(e,0) end'''

def phase(which,op,condition='true'):
 return event('EVENT_PHASE_START|PHASE_'+which,op,'Duel.GetTurnPlayer()==0 and ('+condition+')',True)

def each_card(var,group):
 """The opening and closing Lua around a per-card loop that registers effects on the player's cards. In a Tag Duel the core
 keeps the partner's Deck, hand and Extra Deck aside until their turn, so a loop run once when the script loads never reaches
 them (behaviour flag 5a313fbb, 2026-11-18: Dragon Lord's Decree never offered to the second duelist). The loop runs again at
 the start of every Draw Phase and handles each card once."""
 return (f'local given={{}} local function give() for {var} in {group}:Iter() do if not given[{var}] then given[{var}]=true',
  ' end end end give() '+event('EVENT_PHASE_START|PHASE_DRAW','give()'))

# Spells and Traps that can only Special Summon in Defense Position; Berserker's Pact would leave them doing nothing.
DEFENSE_ONLY_SUMMONS='26905245,40703222,29843091,73915051,42534368,92924317,60764581,13955608,33057951,75622824,79852326'

# Cards whose Special Summon effects only summon in Defense Position, Spells and Traps or not.
DEFENSE_SUMMON_EFFECTS='6104968,9074847,9156135,13386503,13955608,22567609,26905245,27911549,29843091,31709826,33057951,34124316,40703222,42534368,43434803,58551308,60764581,73915051,75622824,79106360,79852326,81210420,92924317'
# A summon that could go either way goes to Attack Position.
ATTACK_ONLY_SUMMONS='do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_FORCE_SPSUMMON_POSITION) e:SetProperty(EFFECT_FLAG_PLAYER_TARGET) e:SetTargetRange(1,0) e:SetTarget(function(e,c,sump,sumtype,sumpos) return not sumpos or (sumpos&POS_FACEUP_ATTACK)~=0 end) e:SetValue(POS_FACEUP_ATTACK) Duel.RegisterEffect(e,0) end'

# Berserker's Pact (user, 2026-11-18): the core takes the highest EFFECT_EXTRA_ATTACK value, so a plain +1 did nothing for
# Mataza the Zapper. The relic's value is 1 more than the card's best other extra-attack effect. Relic copies carry a label
# and skip each other, so two copies (Relic Mirror) never evaluate one another.
BERSERK_LABEL=0x42455253
BERSERK_ATTACK=f'''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_EXTRA_ATTACK) e:SetLabel({BERSERK_LABEL}) e:SetTargetRange(LOCATION_MZONE,0) e:SetTarget(function(e,c) return c:IsFaceup() end) e:SetValue(function(e,c) local n=0 for _,x in ipairs({{c:GetCardEffect(EFFECT_EXTRA_ATTACK)}}) do if x~=e and x:GetLabel()~={BERSERK_LABEL} then local v=x:GetValue() if type(v)=='function' then v=v(x,c) end if type(v)=='number' and v>n then n=v end end end return n+1 end) Duel.RegisterEffect(e,0) end'''

# Infinite Cards (Discord, 2026-11-25): "There is no limit to the hand size of each player." Every relic, shadow relic and
# curse hand limit is written here, and none applies while a face-up Infinite Cards whose effect is not negated is on
# either field, whichever hand limit the core happens to read. The hand warning in mobile.js (handSizeLimit) matches it.
INFINITE_CARDS=94163677
NO_INFINITE_CARDS=f'function() return not Duel.IsExistingMatchingCard(function(c) return c:IsFaceup() and c:IsCode({INFINITE_CARDS}) and not c:IsDisabled() end,0,LOCATION_ONFIELD,LOCATION_ONFIELD,1,nil) end'

def player_rule(code,value):
 condition=f' e:SetCondition({NO_INFINITE_CARDS})' if code=='EFFECT_HAND_LIMIT' else ''
 return f'''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD){condition} e:SetCode({code}) e:SetProperty(EFFECT_FLAG_PLAYER_TARGET) e:SetTargetRange(1,0) e:SetValue({value}) Duel.RegisterEffect(e,0) end'''

STRONGHOLD=13955608 # Stronghold the Moving Fortress

def effect(kind):
 if not kind.startswith('approved_'):return None
 key=kind[9:];out=[]
 def atk(v,t='true'):out.append(stat('EFFECT_UPDATE_ATTACK',v,t))
 def defense(v,t='true'):out.append(stat('EFFECT_UPDATE_DEFENSE',v,t))
 def both(v,t='true'):atk(v,t);defense(v,t)
 def handlimit(n):out.append(player_rule('EFFECT_HAND_LIMIT',n))
 if key=='solemn_relic':
  # Spent on the first negatable activation even if another copy (Magic Mirror) already negated it, so two copies
  # never negate the next link of that chain too (Discord, 2026-11-14).
  out.append('do local used=false '+event('EVENT_CHAINING','used=true if Duel.NegateActivation(ev) then --[[relic-hint]] end','not used and rp==1 and re~=nil and Duel.IsChainNegatable(ev) and re:IsActiveType(TYPE_MONSTER|TYPE_SPELL|TYPE_TRAP)')+' end')
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
 elif key=='giants_oath':atk(800,'c:IsLevelAbove(5)');atk(-300,'c:IsLevelBelow(4)')
 elif key=='commoners_chain':both(300,'c:IsType(TYPE_NORMAL)');both(-200,'c:IsType(TYPE_EFFECT)')
 elif key=='zombies_bargain':
  atk(800);out.append(player_rule('EFFECT_REVERSE_RECOVER',1));out.append(player_rule('EFFECT_CHANGE_DAMAGE','function(e,re,val,r,rp) if (r&REASON_RRECOVER)~=0 then return 0 end return val end'))
 elif key=='warriors_vow':atk(200);out.append(stat('EFFECT_CANNOT_CHANGE_POSITION',1,'c:IsAttackPos()'))
 elif key=='ritual_scar':
  # Each copy keeps its own count, as Tag seats and Relic Mirror register separately. RITUAL_SCAR_COUNT comes from passives.py;
  # the hint tells finish_duel to carry this duel's summons over.
  out.append('do local n=RITUAL_SCAR_COUNT');atk('function() return 100*n-300 end')
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
  # At least 1 monster in your GY (user, 2026-11-18: an empty GY no longer counts). The free zone is checked again when it
  # resolves: another End Phase effect may have filled it, and the chosen monster went to the GY (flag 1962e4d3, 2026-11-26).
  out.append('''do local function level() if not Duel.IsExistingMatchingCard(Card.IsMonster,0,LOCATION_GRAVE,0,1,nil) then return nil end local g=Duel.GetMatchingGroup(Card.IsMonster,0,LOCATION_GRAVE|LOCATION_MZONE,0,nil) if #g==0 then return nil end local l=g:GetFirst():GetLevel() if l<=0 or g:IsExists(function(c) return c:GetLevel()~=l end,1,nil) then return nil end return l end
local function can(c,e,l,p) return c:IsMonster() and c:GetLevel()==l and c:IsCanBeSpecialSummoned(e,0,p,false,false) end
'''+event('EVENT_PHASE_START|PHASE_END','local p=Duel.GetTurnPlayer() local l=level() if not l or Duel.GetLocationCount(0,LOCATION_MZONE)<=0 then return end --[[relic-ask]] Duel.Hint(HINT_SELECTMSG,0,HINTMSG_SPSUMMON) local g=Duel.SelectMatchingCard(0,can,0,LOCATION_HAND,0,0,1,nil,e,l,p) if #g>0 then Duel.SpecialSummon(g,0,p,p,false,false,POS_FACEUP) end','Duel.GetTurnPlayer()==0 and Duel.GetLocationCount(0,LOCATION_MZONE)>0 and level()~=nil and Duel.IsExistingMatchingCard(can,0,LOCATION_HAND,0,1,nil,e,level(),Duel.GetTurnPlayer())',True)+' end')
 elif key=='anime_rule_2':
  # "You destroy": the effect's player is you (rp). One hit of damage for everything a single effect destroyed.
  hit='function(c) return c:IsPreviousControler(1) and c:IsPreviousLocation(LOCATION_MZONE) and c:IsReason(REASON_EFFECT) end'
  out.append(event('EVENT_DESTROYED',f'local sum=0 for c in eg:Filter({hit},nil):Iter() do sum=sum+math.floor(math.max(0,c:GetPreviousAttackOnField())/2) end if sum>0 then Duel.Damage(1,sum,REASON_EFFECT) end',f'rp==0 and eg:IsExists({hit},1,nil)'))
  out.append(stat('EFFECT_CANNOT_DIRECT_ATTACK',1))
 elif key=='solitary_tyrant':atk(600,'Duel.GetFieldGroupCount(0,LOCATION_MZONE,0)==1');atk(-400,'Duel.GetFieldGroupCount(0,LOCATION_MZONE,0)>1')
 elif key=='crowded_crypt':atk('function() return math.min(750,75*Duel.GetMatchingGroupCount(Card.IsMonster,0,LOCATION_GRAVE,0,nil)) end');handlimit(2)
 elif key=='golden_grave':defense(-400)
 elif key=='scorched_clock':out.extend([phase('STANDBY','Duel.Damage(1,400,REASON_EFFECT)'),phase('END','Duel.Damage(0,300,REASON_EFFECT)')])
 elif key=='reckless_spear':out.append(stat('EFFECT_DIRECT_ATTACK',1));atk(-700)
 elif key=='nocturnal_guard':defense(600,'Duel.GetTurnPlayer()==1');atk(-300,'Duel.GetTurnPlayer()==0')
 elif key=='narrow_gate':
  # The first and last Main Monster Zone and Spell & Trap Zone of both players (sequences 0 and 4: bits 0/4, 8/12, and
  # 16+ for the opponent); the user, 2026-11-23, in place of the fourth and fifth (0x18181818). Field Zones stay open.
  out.append('''if not RogueNarrowGate then RogueNarrowGate=true local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_DISABLE_FIELD) e:SetValue(0x11111111) Duel.RegisterEffect(e,0) end''')
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
 elif key=='berserkers_pact':out.extend([BERSERK_ATTACK,player_rule('EFFECT_CANNOT_MSET','1'),ATTACK_ONLY_SUMMONS,player_rule('EFFECT_CANNOT_ACTIVATE',f'function(e,re,tp) return re:GetHandler():IsCode({DEFENSE_ONLY_SUMMONS}) end')])
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
  # Only a real Normal Summon locks the monster for that turn. The core gives a Set monster STATUS_SUMMON_TURN and
  # SUMMON_TYPE_NORMAL too, so the old status check also locked a monster Set this turn and then turned face-up by an
  # effect (Book of Taiyou, an attack), which the text does not cover (player report, 2026-11-25). Flip Summons and
  # Sets never lock; Tribute and Gemini Summons are Normal Summons and do.
  out.append('do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_SUMMON_SUCCESS) e:SetOperation(function(e,tp,eg) for c in eg:Iter() do if c:IsControler(0) then c:RegisterFlagEffect(0x7f34b1,RESET_EVENT|RESETS_STANDARD|RESET_PHASE|PHASE_END,0,1) end end end) Duel.RegisterEffect(e,0) end')
  out.append(stat('EFFECT_CANNOT_ATTACK',1,'c:GetFlagEffect(0x7f34b1)>0'))
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
local function give(code,value) local x=Effect.CreateEffect(t) x:SetType(EFFECT_TYPE_SINGLE) x:SetProperty(EFFECT_FLAG_CANNOT_DISABLE) x:SetCode(code) x:SetValue(value) x:SetReset(reset) t:RegisterEffect(x,true) end
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
  # Macro Cosmos's rule for both players, from the start of the Duel, with its flags: without SET_AVAILABLE a Set card
  # destroyed face-down still went to the GY (flag c81f6011, 2026-11-23).
  out.append('do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_TO_GRAVE_REDIRECT) e:SetProperty(EFFECT_FLAG_SET_AVAILABLE+EFFECT_FLAG_IGNORE_RANGE+EFFECT_FLAG_IGNORE_IMMUNE) e:SetTargetRange(0xff,0xff) e:SetValue(LOCATION_REMOVED) Duel.RegisterEffect(e,0) end')
 elif key=='spell_provider':
  # Only one card can hold a Spell Counter: it gets the counter without a prompt (itch.io, user 2026-11-22).
  holder='function(c) return c:IsFaceup() and c:IsCanAddCounter(COUNTER_SPELL,1) end'
  out.append(phase('STANDBY',f'local g=Duel.GetMatchingGroup({holder},0,LOCATION_ONFIELD,0,nil) local s=g if #g>1 then --[[relic-ask]] Duel.Hint(HINT_SELECTMSG,0,HINTMSG_FACEUP) s=g:Select(0,0,1,nil) end if #s>0 then --[[relic-hint]] s:GetFirst():AddCounter(COUNTER_SPELL,1) end',
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
 # 2026-11-14 Discord relics. Player arguments: literal 0 for the Duel functions passives.multiplayer_script wraps or rewrites;
 # tp (the owner) for card methods, for SpecialSummon / GetLocationCountFromEx, which it leaves alone, and through D (the
 # unwrapped Duel) for lookups the wrapper would flip back to the other player.
 elif key=='guardians_call':
  # A summon procedure on each Guardian the player owns. The Guardian's own rule (it cannot be Summoned unless you control
  # its Equip Spell face-up) still applies, so the procedure only adds the summon from the hand.
  pairs=','.join(f'[{g}]={e}' for g,e in GUARDIAN_EQUIPS.items())
  start,finish=each_card('c','Duel.GetMatchingGroup(function(c) return equip[c:GetOriginalCode()]~=nil end,0,LOCATION_HAND|LOCATION_DECK|LOCATION_GRAVE|LOCATION_REMOVED,0,nil)')
  out.append(f'''do local D=(_G and _G.Duel) or Duel local used=-1 local equip={{{pairs}}}
{start}
 local e=Effect.CreateEffect(c) e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_SPSUMMON_PROC) e:SetProperty(EFFECT_FLAG_UNCOPYABLE) e:SetRange(LOCATION_HAND)
 e:SetCondition(function(e,c) if c==nil then return true end local tp=c:GetControler() local code=equip[c:GetOriginalCode()]
  return used~=Duel.GetTurnCount() and D.GetLocationCount(tp,LOCATION_MZONE)>0 and D.IsExistingMatchingCard(function(x) return x:IsFaceup() and x:IsCode(code) end,tp,LOCATION_SZONE,0,1,nil) end)
 e:SetOperation(function(e,tp,eg,ep,ev,re,r,rp,c) used=Duel.GetTurnCount() --[[relic-hint]] end)
 c:RegisterEffect(e){finish} end''')
 elif key=='soul_fusion':
  # Fusion Time's procedure (artifact_effects.fusion_time) with the materials banished from the GY instead of sent from the field.
  start,finish=each_card('fc','Duel.GetMatchingGroup(Card.IsType,0,LOCATION_EXTRA,0,nil,TYPE_FUSION)')
  out.append('''do local D=(_G and _G.Duel) or Duel local used=false
local function mats(tp) return D.GetMatchingGroup(function(c) return c:IsMonster() and c:IsAbleToRemoveAsCost() end,tp,LOCATION_GRAVE,0,nil) end
'''+start+'''
 local e=Effect.CreateEffect(fc) e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_SPSUMMON_PROC) e:SetProperty(EFFECT_FLAG_UNCOPYABLE) e:SetRange(LOCATION_EXTRA) e:SetValue(SUMMON_TYPE_FUSION)
 e:SetCondition(function(e,c) if c==nil then return true end if used then return false end local tp=c:GetControler()
  return Duel.GetLocationCountFromEx(tp,tp,nil,c)>0 and c:CheckFusionMaterial(mats(tp),nil,tp) end)
 e:SetTarget(function(e,tp,eg,ep,ev,re,r,rp,chk,c)
  if chk==0 then return c:CheckFusionMaterial(mats(tp),nil,tp) end
  local sg=Duel.SelectFusionMaterial(tp,c,mats(tp),nil,tp)
  if not sg or #sg==0 then return false end sg:KeepAlive() e:SetLabelObject(sg) return true end)
 e:SetOperation(function(e,tp,eg,ep,ev,re,r,rp,c)
  local sg=e:GetLabelObject() if not sg then return end used=true --[[relic-hint]]
  c:SetMaterial(sg) Duel.Remove(sg,POS_FACEUP,REASON_MATERIAL|REASON_FUSION) sg:DeleteGroup() e:SetLabelObject(nil)
  local a=Effect.CreateEffect(c) a:SetType(EFFECT_TYPE_SINGLE) a:SetCode(EFFECT_CANNOT_ATTACK) a:SetReset(RESET_EVENT|(RESETS_STANDARD&~RESET_TOFIELD)|RESET_PHASE|PHASE_END) c:RegisterEffect(a) end)
 fc:RegisterEffect(e)'''+finish+' end')
 elif key=='gate_calling':
  # The question is the generic 94 like the other relics (Suijin<<4 showed Suijin's own "ATK becomes 0" text, Discord 2026-11-16).
  # Special Summons count too since the 2026-11-16 balance picks; the relic's own summon is the turn's one use, so it cannot chain.
  trio=','.join(map(str,GATE_TRIO))
  out.append(f'''do local used=-1
local function called(eg,tp) return eg:Filter(function(c) return c:IsControler(tp) and c:IsCode({trio}) and (c:IsSummonType(SUMMON_TYPE_TRIBUTE) or c:IsSummonType(SUMMON_TYPE_SPECIAL)) end,nil):GetFirst() end
local function other(s,e,tp) return function(c) return c:IsCode({trio}) and not c:IsCode(s:GetCode()) and c:IsCanBeSpecialSummoned(e,0,tp,false,false) end end
local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_SUMMON_SUCCESS)
e:SetCondition(function(e,tp,eg) local s=called(eg,tp) return used~=Duel.GetTurnCount() and s~=nil and Duel.GetLocationCount(0,LOCATION_MZONE)>0 and Duel.IsExistingMatchingCard(other(s,e,tp),0,LOCATION_HAND,0,1,nil) end)
e:SetOperation(function(e,tp,eg) local s=called(eg,tp) if not s then return end
 local g=Duel.GetMatchingGroup(other(s,e,tp),0,LOCATION_HAND,0,nil) if #g==0 or Duel.GetLocationCount(0,LOCATION_MZONE)<1 then return end
 --[[relic-ask]] if not Duel.SelectYesNo(0,94) then return end
 used=Duel.GetTurnCount() Duel.Hint(HINT_SELECTMSG,0,HINTMSG_SPSUMMON) local tc=g:Select(0,1,1,nil):GetFirst()
 --[[relic-hint]] Duel.SpecialSummon(tc,0,tp,tp,false,false,POS_FACEUP) end)
Duel.RegisterEffect(e,0) local special=e:Clone() special:SetCode(EVENT_SPSUMMON_SUCCESS) Duel.RegisterEffect(special,0) end''')
 elif key=='jin_trio':out.append(jin_trio())
 elif key=='dark_lotus':
  # A reset effect can no longer summon, so the first Standby Phase is marked with a flag instead.
  out.append('''do local done=false local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_STANDBY)
e:SetCondition(function() return not done and Duel.GetTurnPlayer()==0 end)
e:SetOperation(function(e,tp) done=true
 local g=Duel.GetMatchingGroup(function(c) return c:IsMonster() and c:IsCanBeSpecialSummoned(e,0,tp,true,true)
  and (c:IsLocation(LOCATION_EXTRA) and Duel.GetLocationCountFromEx(tp,tp,nil,c)>0 or c:IsLocation(LOCATION_DECK) and Duel.GetLocationCount(0,LOCATION_MZONE)>0) end,0,LOCATION_DECK|LOCATION_EXTRA,0,nil)
 if #g==0 then return end
 --[[relic-ask]] if not Duel.SelectYesNo(0,5592689<<4) then return end
 Duel.Hint(HINT_SELECTMSG,0,HINTMSG_SPSUMMON) local tc=g:Select(0,1,1,nil):GetFirst()
 --[[relic-hint]] Duel.SpecialSummon(tc,0,tp,tp,true,true,POS_FACEUP) if tc:IsLocation(LOCATION_DECK) then Duel.ShuffleDeck(0) end end)
Duel.RegisterEffect(e,0) end''')
 elif key=='ultimate_armory':out.append(stat('EFFECT_INDESTRUCTABLE_EFFECT',1,'c:GetEquipGroup():FilterCount(function(x) return x:IsSpell() and x:IsType(TYPE_EQUIP) end,nil)>=3'))
 elif key=='ring_of_defense':
  # Reports each loss to the client (hint group 20, duel.js 'self_lp_loss'); the LP come back after the Duel
  # (approved_relics.self_lp_lost). Only card effects count: relic and curse damage comes from handler-less global effects.
  # A global effect's handler is a placeholder with no card code.
  out.append('''do local function report(e,tp,eg,ep,ev) if ev>0 then Duel.Hint(HINT_MESSAGE,0,2000000000+math.min(ev,99999999)) end end
local function card(re) local h=re and re:GetHandler() return h~=nil and h:GetOriginalCode()>0 end
local d=Effect.GlobalEffect() d:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) d:SetCode(EVENT_DAMAGE)
d:SetCondition(function(e,tp,eg,ep,ev,re,r,rp) return ep==0 and rp==0 and (r&REASON_EFFECT)~=0 and card(re) end) d:SetOperation(report) Duel.RegisterEffect(d,0)
local c=Effect.GlobalEffect() c:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) c:SetCode(EVENT_PAY_LPCOST)
c:SetCondition(function(e,tp,eg,ep,ev,re) return ep==0 and card(re) end) c:SetOperation(report) Duel.RegisterEffect(c,0) end''')
 # 2026-11-15 Discord relics, with the same player-argument rules as the 2026-11-14 ones above. "You can" summons from the
 # hand, Deck or Extra Deck are summon procedures (the card shows "Special Summon", like Guardian's Call); triggered ones ask.
 elif key=='magicians_bond':
  # Normal or Special Summon since the 2026-11-16 balance picks. It also adds "Dark Magician" monsters (DARK_MAGICIANS or the
  # archetype, as Name Changer gives it): Dark Magician does not mention itself, so 2 in the Deck were never listed (user, 2026-11-20).
  out.append(f'''do local used=-1
local function search(c) return (c:IsCode({codes(DARK_MAGICIAN_MENTIONS)}) or c:IsMonster() and (c:IsCode({codes(DARK_MAGICIANS)}) or c:IsSetCard({DARK_MAGICIAN_SET}))) and c:IsAbleToHand() end
local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_SUMMON_SUCCESS)
e:SetCondition(function(e,tp,eg) return used~=Duel.GetTurnCount() and eg:IsExists(function(c) return c:IsControler(0) and (c:IsCode({codes(DARK_MAGICIANS)}) or c:IsSetCard({DARK_MAGICIAN_SET})) end,1,nil) and Duel.IsExistingMatchingCard(search,0,LOCATION_DECK,0,1,nil) end)
e:SetOperation(function(e,tp,eg) local g=Duel.GetMatchingGroup(search,0,LOCATION_DECK,0,nil) if #g==0 then return end
 --[[relic-ask]] if not Duel.SelectYesNo(0,94) then return end
 used=Duel.GetTurnCount() Duel.Hint(HINT_SELECTMSG,0,HINTMSG_ATOHAND) local s=g:Select(0,1,1,nil)
 Duel.SendtoHand(s,0,REASON_EFFECT) Duel.ConfirmCards(1,s) end)
Duel.RegisterEffect(e,0) local special=e:Clone() special:SetCode(EVENT_SPSUMMON_SUCCESS) Duel.RegisterEffect(special,0) end''')
 elif key=='blue_eyes_radiance':
  # The 3 "Blue-Eyes White Dragon" are the cost. With no free Monster Zone, one of them must come from the field.
  # "Other card effects": its own effects still apply, and so do relics and curses (handler-less global effects).
  out.append(summon_proc(SHINING,'LOCATION_HAND|LOCATION_DECK',1104,'used==Duel.GetTurnCount()',
   f'''local function cost(c) return c:IsCode({BEWD}) and (c:IsLocation(LOCATION_HAND) or c:IsFaceup()) and c:IsAbleToGraveAsCost() end''',
   'local g=D.GetMatchingGroup(cost,tp,LOCATION_HAND|LOCATION_MZONE,0,nil) return #g>=3 and (D.GetLocationCount(tp,LOCATION_MZONE)>0 or g:IsExists(Card.IsLocation,1,nil,LOCATION_MZONE))',
   '''local g=D.GetMatchingGroup(cost,tp,LOCATION_HAND|LOCATION_MZONE,0,nil) local sg=Group.CreateGroup() D.Hint(HINT_SELECTMSG,tp,HINTMSG_TOGRAVE)
  if D.GetLocationCount(tp,LOCATION_MZONE)<=0 then local f=g:Filter(Card.IsLocation,nil,LOCATION_MZONE):Select(tp,1,1,true,nil) if not f or #f==0 then return false end sg:Merge(f) g:Sub(f) D.Hint(HINT_SELECTMSG,tp,HINTMSG_TOGRAVE) end
  local rest=g:Select(tp,3-#sg,3-#sg,true,nil) if not rest or #rest==0 then return false end sg:Merge(rest) if #sg~=3 then return false end''',
   '''used=Duel.GetTurnCount() Duel.SendtoGrave(sg,REASON_COST)
  local x=Effect.CreateEffect(c) x:SetType(EFFECT_TYPE_SINGLE) x:SetCode(EFFECT_IMMUNE_EFFECT) x:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
  x:SetValue(function(x,te) local o=te:GetOwner() return o~=x:GetOwner() and o:GetOriginalCode()>0 end)
  x:SetReset(RESET_EVENT|(RESETS_STANDARD&~RESET_TOFIELD)|RESET_PHASE|PHASE_END|RESET_OPPO_TURN) c:RegisterEffect(x)''','-1'))
 elif key=='master_and_apprentice':
  # Battle or card effect; the summon waits for no chain, like Gate Calling's.
  dm=codes(DARK_MAGICIANS)
  out.append(f'''do local used=-1
local function lost(c) return c:IsPreviousControler(0) and c:IsPreviousLocation(LOCATION_MZONE) and (c:IsCode({dm}) or c:IsPreviousCodeOnField({dm}) or c:IsPreviousSetCard({DARK_MAGICIAN_SET})) end
local function can(c,e,tp) return (c:IsCode({dm}) or c:IsSetCard({DARK_MAGICIAN_SET})) and c:IsCanBeSpecialSummoned(e,0,tp,true,false) end
local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_DESTROYED)
e:SetCondition(function(e,tp,eg) return used~=Duel.GetTurnCount() and eg:IsExists(lost,1,nil) and Duel.GetLocationCount(0,LOCATION_MZONE)>0 and Duel.IsExistingMatchingCard(can,0,LOCATION_HAND,0,1,nil,e,tp) end)
e:SetOperation(function(e,tp,eg) local g=Duel.GetMatchingGroup(can,0,LOCATION_HAND,0,nil,e,tp) if #g==0 or Duel.GetLocationCount(0,LOCATION_MZONE)<1 then return end
 --[[relic-ask]] if not Duel.SelectYesNo(0,94) then return end
 used=Duel.GetTurnCount() Duel.Hint(HINT_SELECTMSG,0,HINTMSG_SPSUMMON) local tc=g:Select(0,1,1,nil):GetFirst()
 Duel.SpecialSummon(tc,0,tp,tp,true,false,POS_FACEUP) end)
Duel.RegisterEffect(e,0) end''')
 elif key=='black_chaos_rite':
  # The Tribute is the cost; it may be the only monster in a full field, since it frees its zone.
  out.append(summon_proc(DARK_MAGICIAN_OF_CHAOS,'LOCATION_HAND|LOCATION_DECK',0,'used',
   f'local function dm(c,tp) return c:IsCode({DARK_MAGICIAN}) and c:IsReleasable() and D.GetMZoneCount(tp,c)>0 end',
   'return D.IsExistingMatchingCard(dm,tp,LOCATION_MZONE,0,1,nil,tp)',
   'D.Hint(HINT_SELECTMSG,tp,HINTMSG_RELEASE) local sg=D.GetMatchingGroup(dm,tp,LOCATION_MZONE,0,nil,tp):Select(tp,1,1,true,nil) if not sg or #sg==0 then return false end',
   'used=true Duel.Release(sg,REASON_COST)','false'))
 elif key=='dragon_lords_decree':
  # Its own Summoning conditions still apply (no "ignoring" in the text), so a Dragon that cannot be Special Summoned
  # from the hand (Blue-Eyes Shining Dragon, Red-Eyes Darkness Dragon) is not offered.
  out.append(summon_proc(None,'LOCATION_HAND',1104,'used',
   'local function fodder(c) return c:IsMonster() and c:IsRace(RACE_DRAGON) and c:IsDiscardable(REASON_COST) end',
   'return c:IsRace(RACE_DRAGON) and c:IsLevelAbove(7) and c:IsCanBeSpecialSummoned(e,0,tp,false,false) and D.GetLocationCount(tp,LOCATION_MZONE)>0 and D.IsExistingMatchingCard(fodder,tp,LOCATION_HAND,0,2,c)',
   'D.Hint(HINT_SELECTMSG,tp,HINTMSG_DISCARD) local sg=D.GetMatchingGroup(fodder,tp,LOCATION_HAND,0,c):Select(tp,2,2,true,nil) if not sg or #sg~=2 then return false end',
   'used=true Duel.SendtoGrave(sg,REASON_COST|REASON_DISCARD)','false',handlers='function(c) return c:IsMonster() and c:GetOriginalLevel()>=7 end'))
 elif key=='twin_eyes':
  # Name Changer's "Blue-Eyes" (0xdd added to every monster) counts too; real cards stay the EYES list (2026-11-20).
  # Hand or Deck (user, 2026-11-16: an opening hand Red-Eyes left it with nothing to summon). Dark Lotus's first-Standby flag. No "you can": the summon happens whenever a monster can be summoned.
  out.append(f'''do local done=false local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_STANDBY)
e:SetCondition(function() return not done and Duel.GetTurnPlayer()==0 end)
e:SetOperation(function(e,tp) done=true if Duel.GetLocationCount(0,LOCATION_MZONE)<1 then return end
 local g=Duel.GetMatchingGroup(function(c) return c:IsMonster() and (c:IsCode({codes(EYES)}) or c:IsSetCard(0xdd) and not c:IsOriginalSetCard(0xdd)) and c:IsCanBeSpecialSummoned(e,0,tp,false,false,POS_FACEUP_ATTACK) end,0,LOCATION_HAND|LOCATION_DECK,0,nil)
 if #g==0 then return end
 --[[relic-ask]] Duel.Hint(HINT_SELECTMSG,0,HINTMSG_SPSUMMON) local tc=g:Select(0,1,1,nil):GetFirst()
 Duel.SpecialSummon(tc,0,tp,tp,false,false,POS_FACEUP_ATTACK) end)
Duel.RegisterEffect(e,0) end''')
 elif key=='dragon_blood_fusion':
  # Not a Fusion Summon (SUMMON_TYPE_SPECIAL): a Fusion Monster cannot be Special Summoned from the Extra Deck any other
  # way, so this procedure is the summon. "Lists as Fusion Material" is the script's material list (Card.ListsCodeAsMaterial).
  out.append(summon_proc(None,'LOCATION_EXTRA',1107,'used==Duel.GetTurnCount()',
   f'''local function eyes(m,c,tp) return m:IsFaceup() and m:IsCode({codes(EYES)}) and m:IsAbleToRemoveAsCost() and (c:ListsCodeAsMaterial(m:GetCode()) or c:ListsCodeAsMaterial(m:GetOriginalCode())) and D.GetLocationCountFromEx(tp,tp,m,c)>0 end''',
   'return D.IsExistingMatchingCard(eyes,tp,LOCATION_MZONE,0,1,nil,c,tp)',
   'D.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE) local sg=D.GetMatchingGroup(eyes,tp,LOCATION_MZONE,0,nil,c,tp):Select(tp,1,1,true,nil) if not sg or #sg==0 then return false end',
   'used=Duel.GetTurnCount() Duel.Remove(sg,POS_FACEUP,REASON_COST)','-1',handlers='function(c) return c:IsType(TYPE_FUSION) and c.material~=nil end',location='LOCATION_EXTRA'))
 elif key=='titans_charge':
  # Duel.ChainAttack, as cards that "can make a second attack in a row" use; the attack itself stays the player's choice.
  out.append('''do local used=-1
local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_BATTLE_DESTROYING)
e:SetCondition(function(e,tp,eg) local a,d=Duel.GetAttacker(),Duel.GetAttackTarget()
 return used~=Duel.GetTurnCount() and a~=nil and d~=nil and eg:IsContains(a) and a:IsControler(0) and a:IsLevelAbove(7) and a:IsRelateToBattle() and (d:IsPreviousControler(1) or d:IsControler(1)) end)
e:SetOperation(function(e) used=Duel.GetTurnCount() --[[relic-hint]] Duel.ChainAttack() end)
Duel.RegisterEffect(e,0) end''')
 elif key=='mulligans_offer':
  # Once per Duel, your first Standby Phase (user's Discord approval, 2026-11-17). Choosing no cards keeps the hand.
  # The drawback is Mistake's rule on your own Deck: nothing goes from it to your hand except by drawing.
  out.append('do local used=false '+phase('STANDBY','used=true local n=Duel.GetFieldGroupCount(0,LOCATION_HAND,0) if n==0 then return end --[[relic-hint]] Duel.Hint(HINT_SELECTMSG,0,HINTMSG_TODECK) local g=Duel.SelectMatchingCard(0,aux.TRUE,0,LOCATION_HAND,0,0,n,nil) if not g or #g==0 then return end local k=Duel.SendtoDeck(g,nil,SEQ_DECKSHUFFLE,REASON_EFFECT) Duel.ShuffleDeck(0) if k>0 then Duel.Draw(0,k,REASON_EFFECT) end','not used')+' end')
  out.append('do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_CANNOT_TO_HAND) e:SetTargetRange(LOCATION_DECK,0) Duel.RegisterEffect(e,0) end')
 elif key=='graceful_skull_dice':
  # The first die you roll each turn (the low byte of ev counts the roller's dice): gain result x100 LP, and your
  # face-up monsters lose that much ATK until the End Phase. Almighty (RogueAlmighty) keeps the ATK loss off.
  out.append('do local turn=-1 '+event('EVENT_TOSS_DICE','''turn=Duel.GetTurnCount() local v=(Duel.GetDiceResult() or 0)*100 if v<=0 then return end --[[relic-hint]] Duel.Recover(0,v,REASON_EFFECT)
if not RogueAlmighty then for c in Duel.GetMatchingGroup(Card.IsFaceup,0,LOCATION_MZONE,0,nil):Iter() do local e1=Effect.CreateEffect(c) e1:SetType(EFFECT_TYPE_SINGLE) e1:SetCode(EFFECT_UPDATE_ATTACK) e1:SetValue(-v) e1:SetReset(RESET_EVENT|RESETS_STANDARD|RESET_PHASE|PHASE_END) c:RegisterEffect(e1) end end''','ep==0 and (ev&0xff)>0 and turn~=Duel.GetTurnCount()')+' end')
 elif key=='spell_sanctuary':
  # The user's shadow relic (2026-11-19). EFFECT_BECOME_QUICK gives your Spells Quick-Play speed in the core (effect.cpp
  # get_speed and is_activateable): Set ones can be activated in your opponent's turn and in chains, but never the turn
  # they were Set, nor from the hand in your opponent's turn. The second rule stops every Spell activation from the hand,
  # so each Spell, Field Spells included, is Set first. EFFECT_FLAG_SET_AVAILABLE: the core skips face-down cards on the
  # field otherwise (effect::is_target). Ignition effects of face-up Spells are not card activations and keep their speed.
  out.append('do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_BECOME_QUICK) e:SetProperty(EFFECT_FLAG_SET_AVAILABLE) e:SetTargetRange(LOCATION_HAND|LOCATION_SZONE,0) e:SetTarget(function(e,c) return c:IsSpell() end) Duel.RegisterEffect(e,0) end')
  out.append(player_rule('EFFECT_CANNOT_ACTIVATE','function(e,re,tp) return re:IsHasType(EFFECT_TYPE_ACTIVATE) and re:IsActiveType(TYPE_SPELL) and re:GetHandler():IsLocation(LOCATION_HAND) end'))
 elif key=='scorching_strikes':
  # 10K survey shadow relic (user, 2026-11-25). Registered after battle_rules, so Battle Proficiency and Duelist's Wager
  # scale the battle damage first; then it is halved and dealt at the end of the Damage Step as effect damage, where
  # Burn Proficiency, Damage Echo and Scorched Hourglass apply. Damage already prevented (0) stays 0.
  out.append('do local pending=0 '+event('EVENT_PRE_BATTLE_DAMAGE','pending=pending+math.floor(Duel.GetBattleDamage(1)/2) Duel.ChangeBattleDamage(1,0)','ep==1 and Duel.GetBattleDamage(1)>0')
   +' '+event('EVENT_DAMAGE_STEP_END','local d=pending pending=0 Duel.Damage(1,d,REASON_EFFECT)','pending>0')+' end')
 elif key=='poison_of_the_old_man':
  # A real coin toss, so coin relics and cards that change or redo tosses apply. "Lose" LP is not damage. Recover and SetLP
  # are called through locals so the relic is shown once, before the toss.
  out.append(phase('END','--[[relic-hint]] local heads=Duel.TossCoin(0,1)==COIN_HEADS local gain,set,lp=Duel.Recover,Duel.SetLP,Duel.GetLP if heads then gain(0,500,REASON_EFFECT) else set(0,math.max(0,lp(0)-500)) end'))
 return '\n'.join(out)

def codes(ids):return ','.join(map(str,ids))

def summon_proc(code,where,description,spent,helpers,condition,target,operation,initial,handlers=None,location='LOCATION_HAND|LOCATION_DECK|LOCATION_GRAVE|LOCATION_REMOVED'):
 """A relic's summon procedure on each card it can summon (Guardian's Call's method). `spent` says the relic is used up;
 `condition` and `target` see c (the card) and tp (its controller); `target` leaves the cost in sg. D is the unwrapped
 Duel, for lookups by tp under passives.multiplayer_script."""
 pick=handlers or f'function(c) return c:GetOriginalCode()=={code} end'
 start,finish=each_card('c',f'Duel.GetMatchingGroup({pick},0,{location},0,nil)')
 return f'''do local D=(_G and _G.Duel) or Duel local used={initial}
{helpers}
{start}
 local e=Effect.CreateEffect(c) {f'e:SetDescription({description}) ' if description else ''}e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_SPSUMMON_PROC) e:SetProperty(EFFECT_FLAG_UNCOPYABLE) e:SetRange({where})
 e:SetCondition(function(e,c) if c==nil then return true end if {spent} then return false end local tp=c:GetControler() {condition} end)
 e:SetTarget(function(e,tp,eg,ep,ev,re,r,rp,chk,c) {target} sg:KeepAlive() e:SetLabelObject(sg) return true end)
 e:SetOperation(function(e,tp,eg,ep,ev,re,r,rp,c) local sg=e:GetLabelObject() if not sg then return end e:SetLabelObject(nil) --[[relic-hint]] {operation} sg:DeleteGroup() end)
 c:RegisterEffect(e){finish} end'''

# Guardian's Call: each Guardian and the Equip Spell its name is listed on.
GUARDIAN_EQUIPS={73544866:68427465,10755153:95638658,74367458:69243953,47150851:32022366,9633505:95515060,46037213:21900719}
# Gate Calling: Sanga of the Thunder, Kazejin, Suijin.
GATE_TRIO=(25955164,62340868,98434877)
GATE_GUARDIAN,GATE_GUARDIAN_F=25833572,190000051

def jin_trio(fused=False):
 """Jin Trio (the user's design, 2026-11-18): Sanga of the Thunder, Kazejin and Suijin get one effect for each of them
 you control (different names, face-up). Ultimate Gate Combination (fused=True) gives all three to them and to Gate
 Guardian (and Gate Guardian-F) whatever you control. The effects are the cards' own, so the core asks the player at the
 usual times: 1. at the start of the Damage Step of its attack, the attacked monster's ATK becomes 0 until the End Phase;
 2. a Quick Effect once per turn for each card, in the opponent's turn: negate a monster effect or Spell they activate,
 then return that card to the hand if it is on the field (it targets that card; CancelToGrave keeps an activated Spell from going to the GY at the end of the chain); 3. once per turn (shared): Special Summon Gate Guardian from
 the Deck, ignoring its Summoning conditions.
 D.NegateEffect / D.SendtoHand keep passives' automatic relic hint out of the `if` (one hint, from the marker)."""
 holders=GATE_TRIO+((GATE_GUARDIAN,GATE_GUARDIAN_F) if fused else ())
 holder=','.join(f'[{c}]=true' for c in holders)
 tier='3' if fused else 'n'
 start,finish=each_card('c','Duel.GetMatchingGroup(function(c) return holder[c:GetOriginalCode()] end,0,LOCATION_HAND|LOCATION_DECK|LOCATION_GRAVE|LOCATION_REMOVED|LOCATION_EXTRA|LOCATION_MZONE,0,nil)')
 return f'''do local D=(_G and _G.Duel) or Duel local summoned=-1 local holder={{{holder}}} local TRIO={{{','.join(map(str,GATE_TRIO))}}}
local function tier(tp) local n=0 for _,code in ipairs(TRIO) do if D.IsExistingMatchingCard(function(x) return x:IsFaceup() and x:IsCode(code) end,tp,LOCATION_MZONE,0,1,nil) then n=n+1 end end return {tier} end
local function gate(e,tp) return function(x) return x:IsCode({GATE_GUARDIAN}) and x:IsCanBeSpecialSummoned(e,0,tp,true,false) end end
{start}
 local a=Effect.CreateEffect(c) a:SetType(EFFECT_TYPE_SINGLE|EFFECT_TYPE_CONTINUOUS) a:SetCode(EVENT_BATTLE_START) a:SetProperty(EFFECT_FLAG_UNCOPYABLE)
 a:SetCondition(function(e) local h=e:GetHandler() local t=Duel.GetAttackTarget() return Duel.GetAttacker()==h and t~=nil and t:IsControler(1-h:GetControler()) and t:IsRelateToBattle() and tier(h:GetControler())>=1 end)
 a:SetOperation(function(e) local t=Duel.GetAttackTarget() if not t or not t:IsRelateToBattle() then return end --[[relic-hint]]
  local x=Effect.CreateEffect(e:GetHandler()) x:SetType(EFFECT_TYPE_SINGLE) x:SetCode(EFFECT_SET_ATTACK_FINAL) x:SetValue(0) x:SetReset(RESET_EVENT|RESETS_STANDARD|RESET_PHASE|PHASE_END) t:RegisterEffect(x) end)
 c:RegisterEffect(a)
 local q=Effect.CreateEffect(c) q:SetDescription(1117) q:SetCategory(CATEGORY_DISABLE|CATEGORY_TOHAND) q:SetType(EFFECT_TYPE_QUICK_O) q:SetCode(EVENT_CHAINING)
 q:SetProperty(EFFECT_FLAG_UNCOPYABLE|EFFECT_FLAG_DAMAGE_STEP|EFFECT_FLAG_DAMAGE_CAL) q:SetRange(LOCATION_MZONE) q:SetCountLimit(1)
 q:SetCondition(function(e,tp,eg,ep,ev,re,r,rp) local h=e:GetHandler()
  return rp==1-tp and Duel.GetTurnPlayer()==1-tp and h:IsFaceup() and not h:IsStatus(STATUS_BATTLE_DESTROYED) and (re:IsActiveType(TYPE_MONSTER) or re:IsActiveType(TYPE_SPELL)) and Duel.IsChainDisablable(ev) and tier(tp)>=2 end)
 q:SetTarget(function(e,tp,eg,ep,ev,re,r,rp,chk) if chk==0 then return true end Duel.SetOperationInfo(0,CATEGORY_DISABLE,eg,1,0,0)
  local rc=re:GetHandler() if rc:IsOnField() and rc:IsRelateToEffect(re) then Duel.SetTargetCard(rc) Duel.SetOperationInfo(0,CATEGORY_TOHAND,rc,1,0,0) end end)
 q:SetOperation(function(e,tp,eg,ep,ev,re,r,rp) local rc=re:GetHandler() --[[relic-hint]]
  if D.NegateEffect(ev) and rc:IsRelateToEffect(e) and rc:IsOnField() then rc:CancelToGrave() D.SendtoHand(rc,nil,REASON_EFFECT) end end)
 c:RegisterEffect(q)
 local s=Effect.CreateEffect(c) s:SetDescription(1120) s:SetCategory(CATEGORY_SPECIAL_SUMMON) s:SetType(EFFECT_TYPE_IGNITION) s:SetProperty(EFFECT_FLAG_UNCOPYABLE) s:SetRange(LOCATION_MZONE)
 s:SetCondition(function(e,tp) return summoned~=Duel.GetTurnCount() and tier(tp)>=3 end)
 s:SetTarget(function(e,tp,eg,ep,ev,re,r,rp,chk) if chk==0 then return D.GetLocationCount(tp,LOCATION_MZONE)>0 and D.IsExistingMatchingCard(gate(e,tp),tp,LOCATION_DECK,0,1,nil) end
  Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_DECK) end)
 s:SetOperation(function(e,tp) summoned=Duel.GetTurnCount() if D.GetLocationCount(tp,LOCATION_MZONE)<1 then return end
  D.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON) local tc=D.SelectMatchingCard(tp,gate(e,tp),tp,LOCATION_DECK,0,1,1,nil):GetFirst()
  --[[relic-hint]] if tc and Duel.SpecialSummon(tc,0,tp,tp,true,false,POS_FACEUP)>0 then tc:CompleteProcedure() end end)
 c:RegisterEffect(s){finish} end'''
# 2026-11-15 relics. "Dark Magician" monsters: every monster whose name includes "Dark Magician" (user). Cards that mention
# "Dark Magician": its quoted name is in their text. "Blue-Eyes" or "Red-Eyes" monsters: the name includes it.
# tools/test_relics_nov15.py checks these lists against the card list.
DARK_MAGICIAN,DARK_MAGICIAN_OF_CHAOS,BEWD,SHINING=46986414,40737112,89631139,53347303
DARK_MAGICIANS=(46986414,38033121,50725996,40737112,73752131,90960358,21296502)  # 21296502 Toon Dark Magician (2026-11-23)
# The "Dark Magician" archetype (Dark Magician Girl's 0x30a2 included): Name Changer's pick adds it to your other monsters,
# and Master and Apprentice and Magician's Bond ignored those (user on Discord, 2026-11-19).
DARK_MAGICIAN_SET='0x10a2'
DARK_MAGICIAN_MENTIONS=(13722870,2314238,99789342,38033121,98502113,92377303,69542930,87210505,67227834,68334074,13604200,73752131,63391643,90960358)
EYES=(53347303,53183600,23995346,89631139,74677422,64335804,96561011,67300516)  # 67300516 Red-Eyes Wyvern (survey card, 2026-11-25)

def immortal_dark_magic():
 """Immortal Dark Magic (relic_fusions.py, user's text 2026-11-19): the four Dark Magician relics fused.
 No once-per-turn limits, as the text has none: the Normal Summon effect only Special Summons, so it cannot set itself off
 again, and each Deck/Extra Deck summon needs a new "Dark Magician" monster destroyed. "Dark Magician" monsters and cards that
 mention it are Magician's Bond's and Master and Apprentice's (DARK_MAGICIANS or the archetype, DARK_MAGICIAN_MENTIONS)."""
 dm,mentions=codes(DARK_MAGICIANS),codes(DARK_MAGICIAN_MENTIONS)
 return stat('EFFECT_UPDATE_ATTACK',600,'c:IsRace(RACE_SPELLCASTER)')+f'''
do local function magician(c,e,tp) return c:IsMonster() and (c:IsCode({dm}) or c:IsSetCard({DARK_MAGICIAN_SET})) and c:IsCanBeSpecialSummoned(e,0,tp,false,false) end
local function search(c) return c:IsCode({mentions}) and c:IsAbleToHand() end
local function caster(c) return c:IsControler(0) and c:IsFaceup() and c:IsRace(RACE_SPELLCASTER) end
local n=Effect.GlobalEffect() n:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) n:SetCode(EVENT_SUMMON_SUCCESS)
n:SetCondition(function(e,tp,eg) return eg:IsExists(caster,1,nil) and (Duel.GetLocationCount(0,LOCATION_MZONE)>0 and Duel.IsExistingMatchingCard(magician,0,LOCATION_DECK,0,1,nil,e,tp) or Duel.IsExistingMatchingCard(search,0,LOCATION_DECK,0,1,nil)) end)
n:SetOperation(function(e,tp,eg)
 --[[relic-ask]] if not Duel.SelectYesNo(0,94) then return end
 local g=Duel.GetMatchingGroup(magician,0,LOCATION_DECK,0,nil,e,tp)
 if #g>0 and Duel.GetLocationCount(0,LOCATION_MZONE)>0 then Duel.Hint(HINT_SELECTMSG,0,HINTMSG_SPSUMMON) local tc=g:Select(0,1,1,nil):GetFirst()
  Duel.SpecialSummon(tc,0,tp,tp,false,false,POS_FACEUP) end
 local s=Duel.GetMatchingGroup(search,0,LOCATION_DECK,0,nil)
 if #s>0 then Duel.Hint(HINT_SELECTMSG,0,HINTMSG_ATOHAND) local h=s:Select(0,1,1,nil) Duel.SendtoHand(h,0,REASON_EFFECT) Duel.ConfirmCards(1,h) end end)
Duel.RegisterEffect(n,0)
local function lost(c) return c:IsPreviousControler(0) and c:IsPreviousLocation(LOCATION_MZONE) and c:IsReason(REASON_DESTROY) and (c:IsCode({dm}) or c:IsPreviousCodeOnField({dm}) or c:IsPreviousSetCard({DARK_MAGICIAN_SET})) end
local function called(c,e,tp) return c:IsMonster() and c:IsCode({mentions}) and c:IsCanBeSpecialSummoned(e,0,tp,true,true)
 and (c:IsLocation(LOCATION_EXTRA) and Duel.GetLocationCountFromEx(tp,tp,nil,c)>0 or c:IsLocation(LOCATION_DECK) and Duel.GetLocationCount(tp,LOCATION_MZONE)>0) end
local d=Effect.GlobalEffect() d:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) d:SetCode(EVENT_TO_GRAVE)
d:SetCondition(function(e,tp,eg) return eg:IsExists(lost,1,nil) and Duel.IsExistingMatchingCard(called,0,LOCATION_DECK|LOCATION_EXTRA,0,1,nil,e,tp) end)
d:SetOperation(function(e,tp) local g=Duel.GetMatchingGroup(called,0,LOCATION_DECK|LOCATION_EXTRA,0,nil,e,tp) if #g==0 then return end
 --[[relic-ask]] Duel.Hint(HINT_SELECTMSG,0,HINTMSG_SPSUMMON) local tc=g:Select(0,1,1,nil):GetFirst()
 Duel.SpecialSummon(tc,0,tp,tp,true,true,POS_FACEUP) if tc:IsPreviousLocation(LOCATION_DECK) then Duel.ShuffleDeck(0) end end)
Duel.RegisterEffect(d,0) end'''

# My Pride and Soul (2026-11-21). "Blue-Eyes" monsters: the "Blue-Eyes" archetype (0xdd, so Name Changer's pick counts) or a
# name that includes "Blue-Eyes"; Red-Eyes is not one. Cards that mention "Blue-Eyes White Dragon": its quoted name is in their
# text, or their script lists it (Card.ListsCode, as Union Buster reads Union cards). tools/test_relics_nov15.py-style checks
# against the card list are in android/test_pride_soul_nov21.mjs.
BLUE_EYES_SET='0xdd'
BLUE_EYES=(53347303,53183600,23995346,89631139)
BLUE_EYES_MENTIONS=(17655904,23995346,34627841,73398797)

def my_pride_and_soul():
 """My Pride and Soul (relic_fusions.py, user's text 2026-11-21): the four Blue-Eyes relics fused; their own effects are gone.
 1. Dragons +800 ATK/DEF. 2. The opponent cannot activate Trap Cards (card activations) from the start to the end of your
 Battle Phase, Damage Step included. 3. EVENT_STARTUP, as the other "at the start of the Duel" relics: a "Blue-Eyes" monster
 from the Deck that can be Special Summoned normally (its own conditions apply), in Attack Position; with none, or no free
 zone, only the search happens. 4. Once per turn, a "Blue-Eyes" monster you control destroyed (battle or effect): you are
 asked, then any LIGHT Dragon from the hand, Deck or Extra Deck, ignoring its Summoning conditions (Dark Magic's method).
 The turn's use is spent only on a yes. The global effect is not reset before it summons (Dark Lotus: a reset effect cannot)."""
 blue,mentions=codes(BLUE_EYES),codes(BLUE_EYES_MENTIONS)
 lock='''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_CANNOT_ACTIVATE) e:SetProperty(EFFECT_FLAG_PLAYER_TARGET) e:SetTargetRange(0,1)
e:SetCondition(function() return Duel.GetTurnPlayer()==0 and Duel.IsBattlePhase() end)
e:SetValue(function(e,re,tp) return re:IsHasType(EFFECT_TYPE_ACTIVATE) and re:IsActiveType(TYPE_TRAP) end) Duel.RegisterEffect(e,0) end'''
 return stat('EFFECT_UPDATE_ATTACK',800,'c:IsRace(RACE_DRAGON)')+'\n'+stat('EFFECT_UPDATE_DEFENSE',800,'c:IsRace(RACE_DRAGON)')+'\n'+lock+f'''
do local used=-1
local function eyes(c,e,tp) return c:IsMonster() and (c:IsSetCard({BLUE_EYES_SET}) or c:IsCode({blue})) and c:IsCanBeSpecialSummoned(e,0,tp,false,false,POS_FACEUP_ATTACK) end
local function search(c) return (c:IsCode({mentions}) or c:ListsCode({BEWD})) and c:IsAbleToHand() end
local s=Effect.GlobalEffect() s:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) s:SetCode(EVENT_STARTUP)
s:SetOperation(function(e,tp)
 local g=Duel.GetMatchingGroup(eyes,0,LOCATION_DECK,0,nil,e,tp) local can=#g>0 and Duel.GetLocationCount(0,LOCATION_MZONE)>0
 if can or Duel.IsExistingMatchingCard(search,0,LOCATION_DECK,0,1,nil) then --[[relic-ask]] end
 if can then Duel.Hint(HINT_SELECTMSG,0,HINTMSG_SPSUMMON) local tc=g:Select(0,1,1,nil):GetFirst()
  Duel.SpecialSummon(tc,0,tp,tp,false,false,POS_FACEUP_ATTACK) end
 local h=Duel.GetMatchingGroup(search,0,LOCATION_DECK,0,nil)
 if #h>0 then Duel.Hint(HINT_SELECTMSG,0,HINTMSG_ATOHAND) local sg=h:Select(0,1,1,nil) Duel.SendtoHand(sg,0,REASON_EFFECT) Duel.ConfirmCards(1,sg) end
 Duel.ShuffleDeck(0) end)
Duel.RegisterEffect(s,0)
local function lost(c) return c:IsPreviousControler(0) and c:IsPreviousLocation(LOCATION_MZONE) and (c:IsPreviousSetCard({BLUE_EYES_SET}) or c:IsCode({blue}) or c:IsPreviousCodeOnField({blue})) end
local function dragon(c,e,tp) return c:IsMonster() and c:IsAttribute(ATTRIBUTE_LIGHT) and c:IsRace(RACE_DRAGON) and c:IsCanBeSpecialSummoned(e,0,tp,true,true)
 and (c:IsLocation(LOCATION_EXTRA) and Duel.GetLocationCountFromEx(tp,tp,nil,c)>0 or not c:IsLocation(LOCATION_EXTRA) and Duel.GetLocationCount(tp,LOCATION_MZONE)>0) end
local d=Effect.GlobalEffect() d:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) d:SetCode(EVENT_DESTROYED)
d:SetCondition(function(e,tp,eg) return used~=Duel.GetTurnCount() and eg:IsExists(lost,1,nil) and Duel.IsExistingMatchingCard(dragon,0,LOCATION_HAND|LOCATION_DECK|LOCATION_EXTRA,0,1,nil,e,tp) end)
d:SetOperation(function(e,tp) local g=Duel.GetMatchingGroup(dragon,0,LOCATION_HAND|LOCATION_DECK|LOCATION_EXTRA,0,nil,e,tp) if #g==0 then return end
 --[[relic-ask]] if not Duel.SelectYesNo(0,94) then return end
 used=Duel.GetTurnCount() Duel.Hint(HINT_SELECTMSG,0,HINTMSG_SPSUMMON) local tc=g:Select(0,1,1,nil):GetFirst()
 local deck=tc:IsLocation(LOCATION_DECK) Duel.SpecialSummon(tc,0,tp,tp,true,true,POS_FACEUP) if deck then Duel.ShuffleDeck(0) end end)
Duel.RegisterEffect(d,0) end'''

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
 # Hollow Chalice's id is cursed_hollow_chalice (a shadow relic); 'hollow_chalice' never matched, so Nutrient Z missed its
 # x1.5 (behaviour flag 061a3450, 2026-11-24: 1400 damage became 2100 and Nutrient Z was never offered).
 from approved_relics import copies
 shield=.5**copies(run,'cursed_defense_proficiency')
 taken=1.5**copies(run,'cursed_duelists_wager')*shield*1.5**copies(run,'cursed_hollow_chalice')
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
