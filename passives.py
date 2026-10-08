"""Generate real core field effects for the run's artifacts and boss curses."""
from content import ART_INFO
from artifact_effects import effect as expanded_effect
RACES={'Warrior':'RACE_WARRIOR','Spellcaster':'RACE_SPELLCASTER','Dragon':'RACE_DRAGON','Winged Beast':'RACE_WINGEDBEAST','Machine':'RACE_MACHINE','Aqua':'RACE_AQUA','Dinosaur':'RACE_DINOSAUR','Insect':'RACE_INSECT','Zombie':'RACE_ZOMBIE','Fairy':'RACE_FAIRY','Beast':'RACE_BEAST','Fiend':'RACE_FIEND'}
def ai_modifiers(run):
 from approved_relics import duel_run
 run=duel_run(run)
 from endless import LOOP
 from approved_relics import has
 return {'relicFeedback':list(ART_INFO),'expertOpponent':bool(run.get('encore_active') or run.get('secret_challenge')),'firstPlayer':run.get('first_player',0),'statRelics':[[dict(info) for key in run.get('artifacts',[]) for info in [ART_INFO.get(run.get('mirror_copy') if key=='magic_mirror' else key,{})]],[]],'activeRelics':[run.get('artifacts',[])+([run['mirror_copy']] if run.get('mirror_copy') else []),[]],'spellTrapZones':3 if has(run,'cursed_narrow_gate') else 5,'enemyAttack':(300 if has(run,'cursed_champions_burden') and (run.get('round',0)+1)%3==0 else 0)+int(run.get('loop',0))*LOOP['attack']+(200*(2 if run.get('challenge_level',0)>=2 else 1)*run.get('curses',[]).count('enemy_power'))}

def script(run,telemetry=True):
 from approved_relics import duel_run
 run=duel_run(run)
 import json
 lines=['-- SHADOW_RUN_RNG 2','if Duel.EnableRogueAntiStreak then Duel.EnableRogueAntiStreak() end', '-- Persistent run effects. Registered with the core, not UI-only bonuses.', '-- SHADOW_RUN_AI '+json.dumps(ai_modifiers(run))]
 if run.get('first_player')==1:lines.append('-- Coin toss: opponent starts\nDuel.SkipPhase(0,PHASE_DRAW,RESET_PHASE+PHASE_END,1)\nDuel.SkipPhase(0,PHASE_STANDBY,RESET_PHASE+PHASE_END,1)\nDuel.SkipPhase(0,PHASE_END,RESET_PHASE+PHASE_END,1)\nDuel.SkipPhase(0,PHASE_MAIN1,RESET_PHASE+PHASE_END,1)\nDuel.SkipPhase(1,PHASE_BATTLE,RESET_PHASE+PHASE_END,1)')
 if telemetry:lines.append('\n-- Compact private telemetry, consumed by both clients instead of shown as hints.\ndo\n local d=Effect.GlobalEffect()\n d:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) d:SetCode(EVENT_DAMAGE)\n d:SetOperation(function(e,tp,eg,ep,ev,re,r,rp)\n  if ep~=0 then return end\n  local battle=e:GetCode()==EVENT_PRE_BATTLE_DAMAGE or (r&REASON_BATTLE)~=0\n  local c=re and re:GetHandler() or nil\n  if battle then\n   local a=Duel.GetAttacker() local t=Duel.GetAttackTarget()\n   c=(a and a:IsControler(1)) and a or t\n  end\n  Duel.Hint(HINT_MESSAGE,0,(battle and 1100000000 or 1000000000)+(c and c:GetOriginalCode() or 0))\n  Duel.Hint(HINT_MESSAGE,0,1200000000+ev)\n end)\n Duel.RegisterEffect(d,0)\n local bd=d:Clone() bd:SetCode(EVENT_PRE_BATTLE_DAMAGE) Duel.RegisterEffect(bd,0)\n local ch=Effect.GlobalEffect()\n ch:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) ch:SetCode(EVENT_CHAIN_SOLVING)\n ch:SetOperation(function(e,tp,eg,ep,ev)\n  local ce=Duel.GetChainInfo(ev,CHAININFO_TRIGGERING_EFFECT)\n  local c=ce and ce:GetHandler()\n  Duel.Hint(HINT_MESSAGE,0,1300000000+(c and c:GetOriginalCode() or 0))\n end)\n Duel.RegisterEffect(ch,0)\n local en=Effect.GlobalEffect()\n en:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) en:SetCode(EVENT_CHAIN_END)\n en:SetOperation(function() Duel.Hint(HINT_MESSAGE,0,1300000000) end)\n Duel.RegisterEffect(en,0)\nend\n')
 if telemetry:lines.append("""do
 local d=Effect.GlobalEffect() d:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) d:SetCode(EVENT_DESTROYED)
 d:SetOperation(function(e,tp,eg)
  local function enemy(c) return c:IsPreviousControler(1) and c:IsPreviousLocation(LOCATION_ONFIELD) end
  local b=eg:FilterCount(function(c) return enemy(c) and c:IsReason(REASON_BATTLE) end,nil)
  local n=eg:FilterCount(function(c) return enemy(c) and not c:IsReason(REASON_BATTLE) end,nil)
  if b>0 then Duel.Hint(HINT_MESSAGE,0,1400000000+b) end
  if n>0 then Duel.Hint(HINT_MESSAGE,0,1500000000+n) end
 end) Duel.RegisterEffect(d,0)
 local t=Effect.GlobalEffect() t:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) t:SetCode(EVENT_SUMMON_SUCCESS)
 t:SetOperation(function(e,tp,eg) local n=eg:FilterCount(function(c) return c:IsControler(0) and c:IsSummonType(SUMMON_TYPE_TRIBUTE) end,nil) if n>0 then Duel.Hint(HINT_MESSAGE,0,1700000000+n) end end) Duel.RegisterEffect(t,0)
 local r=Effect.GlobalEffect() r:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) r:SetCode(EVENT_REMOVE)
 r:SetOperation(function(e,tp,eg) if #eg>0 then Duel.Hint(HINT_MESSAGE,0,1600000000+#eg) end end) Duel.RegisterEffect(r,0)
end""")
 from approved_relic_effects import battle_rules
 from approved_relics import has
 lines.append(battle_rules(run))
 if has(run,'cursed_champions_burden') and (run.get('round',0)+1)%3==0:
  lines.extend([expanded_effect('approved_champion_stats',0)]*__import__('approved_relics').copies(run,'cursed_champions_burden'))
 events={}
 current_relic=None
 def feedback(text):
  if current_relic is None:return text
  import re
  hint=f'Duel.Hint(HINT_MESSAGE,0,{1800000000+list(ART_INFO).index(current_relic)}) '
  return re.sub(r'(?<!return )Duel\.(Draw|Recover|Damage|NegateEffect|SendtoHand|SetLP)\(',lambda m:hint+m.group(0),text)
 def stat(code,value,condition='true',enemy=False):
  lines.append(f'''do local e=Effect.GlobalEffect()
e:SetType(EFFECT_TYPE_FIELD)
e:SetCode({code})
e:SetTargetRange({'0,LOCATION_MZONE' if enemy else 'LOCATION_MZONE,0'})
e:SetTarget(function(e,c) return {condition} end)
e:SetValue({value})
Duel.RegisterEffect(e,0) end''')
 def event(code,operation):
  events.setdefault(code,[]).append(feedback(operation))
 for key in run['artifacts']:
  current_relic=key;line_start=len(lines)
  info=ART_INFO[key]
  if key=='magic_mirror':
   copy=run.get('mirror_copy')
   if not copy or copy not in ART_INFO or copy=='magic_mirror':continue
   info=ART_INFO[copy]
  kind=info['effect'];amount=info['amount'];filter=info['filter'];condition='true';params=info.get('parameters',{})
  if filter in RACES:condition=f"c:IsRace({RACES[filter] + ('|RACE_BEASTWARRIOR' if filter in ('Warrior','Beast') else '')})"
  elif filter:condition=f'c:IsAttribute(ATTRIBUTE_{filter})'
  expanded=expanded_effect(kind,amount,filter)
  if kind=='approved_empty_hand_pact' and has(run,'cursed_starving_library'):expanded=expanded.replace('e:SetCode(EFFECT_HAND_LIMIT)', 'e:SetCode(EFFECT_HAND_LIMIT)').replace('e:SetValue(4)','e:SetValue(3)')
  if expanded is not None:
   lines.append(feedback(expanded));continue
  if kind=='echo':
   lines.append("""do local used=false local e=Effect.GlobalEffect()
e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_SUMMON_SUCCESS)
e:SetCondition(function(e,tp,eg) return not used and eg:IsExists(function(c) return c:IsControler(1) and c:IsFaceup() and c:IsLevelBelow(4) end,1,nil) end)
e:SetOperation(function(e,tp,eg) local g=eg:Filter(function(c) return c:IsControler(1) and c:IsFaceup() and c:IsLevelBelow(4) end,nil) local c=g:GetFirst() if c then used=true local token=Duel.CreateToken(0,c:GetOriginalCode()) Duel.SendtoHand(token,0,REASON_EFFECT) end end)
Duel.RegisterEffect(e,0) local special=e:Clone() special:SetCode(EVENT_SPSUMMON_SUCCESS) Duel.RegisterEffect(special,0) local flip=e:Clone() flip:SetCode(EVENT_FLIP_SUMMON_SUCCESS) Duel.RegisterEffect(flip,0) end""")
  elif kind=='atk':stat('EFFECT_UPDATE_ATTACK',amount,condition)
  elif kind=='def':stat('EFFECT_UPDATE_DEFENSE',amount)
  elif kind=='both':
   stat('EFFECT_UPDATE_ATTACK',amount,condition);stat('EFFECT_UPDATE_DEFENSE',amount,condition)
  elif kind=='normal':stat('EFFECT_UPDATE_ATTACK',amount,'c:IsType(TYPE_NORMAL)')
  elif kind=='tribute':stat('EFFECT_UPDATE_ATTACK',amount,'c:IsLevelAbove(5)')
  elif kind=='small':stat('EFFECT_UPDATE_ATTACK',amount,'c:IsLevelBelow(3)')
  elif kind=='pierce':stat('EFFECT_PIERCE',1)
  elif kind=='empty_hand':stat('EFFECT_UPDATE_ATTACK',amount,'Duel.GetFieldGroupCount(0,LOCATION_HAND,0)==0')
  elif kind=='solo':stat('EFFECT_UPDATE_ATTACK',amount,'Duel.GetFieldGroupCount(0,LOCATION_MZONE,0)==1')
  elif kind=='diversity':stat('EFFECT_UPDATE_ATTACK',f'function(e,c) local races={{}} local g=Duel.GetMatchingGroup(Card.IsFaceup,0,LOCATION_MZONE,0,nil) for m in g:Iter() do races[m:GetRace()]=true end local n=0 for _ in pairs(races) do n=n+1 end return math.min({params.get("cap",500)},n*{amount}) end')
  elif kind=='normal_grave':stat('EFFECT_UPDATE_ATTACK',f'function(e,c) return math.min({params.get("cap",600)},{amount}*Duel.GetMatchingGroupCount(function(m) return m:IsType(TYPE_MONSTER) and m:IsType(TYPE_NORMAL) end,0,LOCATION_GRAVE,0,nil)) end')
  elif kind=='eclipse':
   condition='Duel.IsExistingMatchingCard(function(m) return m:IsMonster() and m:IsAttribute(ATTRIBUTE_LIGHT) end,0,LOCATION_GRAVE,0,1,nil) and Duel.IsExistingMatchingCard(function(m) return m:IsMonster() and m:IsAttribute(ATTRIBUTE_DARK) end,0,LOCATION_GRAVE,0,1,nil)'
   stat('EFFECT_UPDATE_ATTACK',amount,condition);stat('EFFECT_UPDATE_DEFENSE',amount,condition)
  elif kind=='dial':
   stat('EFFECT_UPDATE_ATTACK',amount,'Duel.GetTurnPlayer()==0');stat('EFFECT_UPDATE_DEFENSE',params.get('defense',600),'Duel.GetTurnPlayer()==1')
  elif kind=='underdog':stat('EFFECT_UPDATE_ATTACK',amount,'Duel.GetLP(0)<Duel.GetLP(1) and Duel.GetFieldGroupCount(0,LOCATION_MZONE,0)<Duel.GetFieldGroupCount(0,0,LOCATION_MZONE)')
  elif kind=='empty_draw':event('EVENT_PHASE|PHASE_END',f'if Duel.GetFieldGroupCount(0,LOCATION_HAND,0)==0 then Duel.Draw(0,{int(amount)},REASON_EFFECT) end')
  elif kind=='standby':event('EVENT_PHASE|PHASE_STANDBY',f'Duel.Recover(0,{amount},REASON_EFFECT)')
  elif kind=='burn':event('EVENT_PHASE|PHASE_END',f'Duel.Damage(1,{amount},REASON_EFFECT)')
  elif kind=='reduce':
   lines.append(f'''do local e=Effect.GlobalEffect()
e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_CHANGE_DAMAGE)
e:SetProperty(EFFECT_FLAG_PLAYER_TARGET) e:SetTargetRange(1,0)
e:SetValue(function(e,re,val,r) if (r&REASON_EFFECT)~=0 then return math.max(0,val-{amount}) end return val end)
Duel.RegisterEffect(e,0) end''')
  elif kind in ('trap_negate','spell_negate'):
   target='TRAP' if kind=='trap_negate' else 'SPELL'
   lines.append(f"""do local d=Effect.GlobalEffect() d:SetType(EFFECT_TYPE_FIELD) d:SetCode(EFFECT_DISABLE) d:SetTargetRange(LOCATION_ONFIELD,LOCATION_ONFIELD) d:SetTarget(function(e,c) return c:IsType(TYPE_{target}) end) Duel.RegisterEffect(d,0) local e=d:Clone() e:SetCode(EFFECT_DISABLE_EFFECT) Duel.RegisterEffect(e,0) end""")
   lines.append(f'''do local e=Effect.GlobalEffect()
e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_CHAIN_SOLVING)
e:SetCondition(function(e,tp,eg,ep,ev,re) return re:IsActiveType(TYPE_{target}) end)
e:SetOperation(function(e,tp,eg,ep,ev,re) Duel.NegateEffect(ev) end)
Duel.RegisterEffect(e,0) end''')
  elif kind=='phoenix':
   lines.append(f'''do local used=false local shield=Effect.GlobalEffect()
shield:SetType(EFFECT_TYPE_FIELD) shield:SetCode(EFFECT_CANNOT_LOSE_LP) shield:SetProperty(EFFECT_FLAG_PLAYER_TARGET) shield:SetTargetRange(1,0) shield:SetCondition(function() return not used end) Duel.RegisterEffect(shield,0)
local e=Effect.GlobalEffect()
e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_ADJUST)
e:SetOperation(function() if not used and Duel.GetLP(0)<=0 then Duel.SetLP(0,{int(amount)}) used=true {('Duel.Hint(HINT_MESSAGE,0,900000001) ' if telemetry else '')}end end)
Duel.RegisterEffect(e,0) end''')
  for pos in range(line_start,len(lines)):lines[pos]=feedback(lines[pos])
 current_relic=None
 for mod in run.get('duel_modifications',[]):
  lines.append(f"""do local c=Duel.GetFieldCard(0,LOCATION_{mod['location']},{int(mod['sequence'])}) if c then
local a=Effect.CreateEffect(c) a:SetType(EFFECT_TYPE_SINGLE) a:SetCode(EFFECT_SET_BASE_ATTACK) a:SetProperty(EFFECT_FLAG_CANNOT_DISABLE|EFFECT_FLAG_UNCOPYABLE) a:SetValue({int(mod['atk'])}) c:RegisterEffect(a)
local d=a:Clone() d:SetCode(EFFECT_SET_BASE_DEFENSE) d:SetValue({int(mod['defense'])}) c:RegisterEffect(d) end end""")
 if run.get('loop',0):
  from endless import LOOP
  stat('EFFECT_UPDATE_ATTACK',run['loop']*LOOP['attack'],enemy=True);stat('EFFECT_UPDATE_DEFENSE',run['loop']*LOOP['defense'],enemy=True)
 scale=2 if run.get('challenge_level',0)>=2 else 1
 if run.get('challenge_level',0)>=5:event('EVENT_PHASE|PHASE_END','Duel.Damage(0,200,REASON_EFFECT)')
 for curse in run.get('curses',[]):
  if curse=='frailty':stat('EFFECT_UPDATE_ATTACK',-200*scale)
  elif curse=='enemy_power':stat('EFFECT_UPDATE_ATTACK',200*scale,enemy=True)
  elif curse=='hunger':stat('EFFECT_UPDATE_DEFENSE',-300*scale)
  elif curse=='tax':event('EVENT_PHASE|PHASE_END',f'Duel.Damage(0,{500 if scale>=2 else 200},REASON_EFFECT)')
 # HALF_DAMAGE is a non-stacking engine flag. Apply the combined divisor once.
 mercy=run.get('curses',[]).count('mercy')
 if mercy:
  divisor=(4 if scale==2 else 2)**mercy
  lines.append(f'''do local e=Effect.GlobalEffect()
e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PRE_BATTLE_DAMAGE)
e:SetCondition(function(e,tp,eg,ep) return ep==1 end)
e:SetOperation(function(e,tp,eg,ep) Duel.ChangeBattleDamage(ep,math.floor(Duel.GetBattleDamage(ep)/{divisor})) end)
Duel.RegisterEffect(e,0) end''')
 for code,operations in events.items():
  # Phase-start continuous events resolve without an optional activation prompt.
  code=code.replace('EVENT_PHASE|','EVENT_PHASE_START|')
  lines.append(f'''do local e=Effect.GlobalEffect()
e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS)
e:SetCode({code}) e:SetCountLimit(1)
e:SetCondition(function() return Duel.GetTurnPlayer()==0 end)
e:SetOperation(function() {'; '.join(operations)} end)
Duel.RegisterEffect(e,0) end''')
 if run.get('first_player')==1:lines.append("""do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_HAND_LIMIT) e:SetProperty(EFFECT_FLAG_PLAYER_TARGET) e:SetTargetRange(1,0) e:SetCondition(function() return Duel.GetTurnCount()==1 end) e:SetValue(99) Duel.RegisterEffect(e,0) end""")
 return '\n'.join(lines)


def multiplayer_script(run, side):
 """Apply the same relic rules to either human, with independent once-only effects."""
 if side not in (0,1):raise ValueError('Invalid player.')
 source=script(run,telemetry=False)
 if side==0:return source
 # The campaign script is written relative to player 0. Local wrappers translate
 # player arguments, while effect target ranges remain relative to their owner.
 import re
 source=re.sub(r'IsControler\(([01])\)',lambda m:'IsControler('+str(1-int(m[1]))+')',source)
 source=re.sub(r'(Duel.GetTurnPlayer\(\)\s*==\s*)([01])',lambda m:m[1]+str(1-int(m[2])),source)
 source=source.replace(':Select(0,',':Select(1,').replace(':RandomSelect(0,',':RandomSelect(1,')
 source=re.sub(r'(\b(?:ep|rp)\s*(?:==|~=)\s*)([01])',lambda m:m[1]+str(1-int(m[2])),source)
 positions={'RegisterEffect':2,'GetLP':1,'SetLP':1,'GetFieldGroupCount':1,'GetFieldCard':1,'SelectMatchingCard':2,'GetMatchingGroup':2,'GetMatchingGroupCount':2,'IsExistingMatchingCard':2,'CreateToken':1,'SendtoHand':2,'DiscardHand':1,'Draw':1,'Recover':1,'Damage':1,'SkipPhase':1,'Hint':2}
 wrappers=['do local originalDuel=Duel local Duel=setmetatable({}, {__index=originalDuel})']
 for name,index in positions.items():
  wrappers.append(f'Duel.{name}=function(...) local a=table.pack(...) if a[{index}]==0 or a[{index}]==1 then a[{index}]=1-a[{index}] end return originalDuel.{name}(table.unpack(a,1,a.n)) end')
 return '\n'.join(wrappers+[source,'end'])
