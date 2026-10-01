"""Core effects for approved relics; all effects are persistent duel rules."""
def stat(code,value,target='true',enemy=False):
 return f'''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode({code}) e:SetTargetRange({'0,LOCATION_MZONE' if enemy else 'LOCATION_MZONE,0'}) e:SetTarget(function(e,c) return c:IsFaceup() and ({target}) end) e:SetValue({value}) Duel.RegisterEffect(e,0) end'''

def event(code,operation,condition='true',phase=False):
 return f'''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode({code}) {'e:SetCountLimit(1)' if phase else ''} e:SetCondition(function(e,tp,eg,ep,ev,re,r,rp) return {condition} end) e:SetOperation(function(e,tp,eg,ep,ev,re,r,rp) {operation} end) Duel.RegisterEffect(e,0) end'''

def phase(which,op,condition='true'):
 return event('EVENT_PHASE_START|PHASE_'+which,op,'Duel.GetTurnPlayer()==0 and ('+condition+')',True)

def player_rule(code,value):
 return f'''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode({code}) e:SetProperty(EFFECT_FLAG_PLAYER_TARGET) e:SetTargetRange(1,0) e:SetValue({value}) Duel.RegisterEffect(e,0) end'''

def effect(kind):
 if not kind.startswith('approved_'):return None
 key=kind[9:];out=[]
 def atk(v,t='true'):out.append(stat('EFFECT_UPDATE_ATTACK',v,t))
 def defense(v,t='true'):out.append(stat('EFFECT_UPDATE_DEFENSE',v,t))
 def both(v,t='true'):atk(v,t);defense(v,t)
 def handlimit(n):out.append(player_rule('EFFECT_HAND_LIMIT',n))
 if key=='champion_stats':out.extend([stat('EFFECT_UPDATE_ATTACK',300,enemy=True),stat('EFFECT_UPDATE_DEFENSE',300,enemy=True)])
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
 elif key=='hollow_chalice':out.append(phase('STANDBY','Duel.Recover(0,600,REASON_EFFECT)'))
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
  atk(1000,'c:IsType(TYPE_RITUAL)');out.append(event('EVENT_SPSUMMON_SUCCESS','Duel.Damage(0,1000,REASON_EFFECT)','eg:IsExists(function(c) return c:IsControler(0) and c:IsSummonType(SUMMON_TYPE_RITUAL) end,1,nil)'))
 elif key=='fusion_fever':
  atk(800,'c:IsType(TYPE_FUSION)');out.append(event('EVENT_SPSUMMON_SUCCESS','if Duel.GetFieldGroupCount(0,LOCATION_HAND,0)>0 then Duel.DiscardHand(0,aux.TRUE,1,1,REASON_EFFECT|REASON_DISCARD) end','eg:IsExists(function(c) return c:IsControler(0) and c:IsSummonType(SUMMON_TYPE_FUSION) end,1,nil)'))
 elif key=='empty_hand_pact':atk(1000,'Duel.GetFieldGroupCount(0,LOCATION_HAND,0)==0');handlimit(4)
 elif key=='solitary_tyrant':atk(400,'Duel.GetFieldGroupCount(0,LOCATION_MZONE,0)==1');atk(-500,'Duel.GetFieldGroupCount(0,LOCATION_MZONE,0)>1')
 elif key=='crowded_crypt':atk('function() return math.min(750,75*Duel.GetMatchingGroupCount(Card.IsMonster,0,LOCATION_GRAVE,0,nil)) end')
 elif key=='golden_grave':defense(-200)
 elif key=='scorched_clock':out.extend([phase('STANDBY','Duel.Damage(1,400,REASON_EFFECT)'),phase('END','Duel.Damage(0,300,REASON_EFFECT)')])
 elif key=='reckless_spear':out.append(stat('EFFECT_PIERCE',1))
 elif key=='nocturnal_guard':defense(600,'Duel.GetTurnPlayer()==1');atk(-300,'Duel.GetTurnPlayer()==0')
 elif key=='narrow_gate':
  out.append('''if not RogueNarrowGate then RogueNarrowGate=true local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_DISABLE_FIELD) e:SetValue(0x18181818) Duel.RegisterEffect(e,0) end''')
 elif key=='trapbound_idol':both(1000,'c:IsType(TYPE_TRAPMONSTER)');atk(-300,'not c:IsType(TYPE_TRAPMONSTER)')
 elif key=='iron_silence':
  both(600)
  out.extend([stat('EFFECT_DISABLE',1),stat('EFFECT_DISABLE_EFFECT',1),event('EVENT_CHAIN_SOLVING','Duel.NegateEffect(ev)','re and re:IsActiveType(TYPE_MONSTER) and rp==0')])
 return '\n'.join(out)

def battle_rules(run):
 from approved_relics import copies
 out=1.5**copies(run,'cursed_duelists_wager')*.5**copies(run,'cursed_hollow_chalice')
 inc=1.5**(copies(run,'cursed_duelists_wager')+copies(run,'cursed_reckless_spear'))
 if out==1 and inc==1:return ''
 return event('EVENT_PRE_BATTLE_DAMAGE',f'Duel.ChangeBattleDamage(ep,math.floor(Duel.GetBattleDamage(ep)*(ep==0 and {inc} or {out})))')
