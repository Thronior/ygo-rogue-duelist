-- Duel-local anti-streak rules. Core RNG still supplies every random choice.
-- Card effects that deliberately choose/replace outcomes retain their own rules.
if not Duel.RogueAntiStreak then
 Duel.RogueAntiStreak=true
 local random_number=Duel.GetRandomNumber
 local enabled=false
 Duel.EnableRogueAntiStreak=function() enabled=true end
 local history={}
 local function draw(key,lo,hi)
  local value=random_number(lo,hi)
  if hi<=lo then return value end
  local state=history[key]
  if state and state.count>=4 and state.last==value then
   value=random_number(lo,hi-1)
   if value>=state.last then value=value+1 end
  end
  if state and state.last==value then state.count=state.count+1
  else history[key]={last=value,count=1} end
  return value
 end
 Duel.GetRandomNumber=function(lo,hi)
  if not enabled then if hi==nil then return random_number(lo) else return random_number(lo,hi) end end
  if hi==nil then hi=lo lo=0 end
  return draw('number:'..lo..':'..hi,lo,hi)
 end
 local installed={}
 local function install(kind)
  if installed[kind] then return end
  installed[kind]=true
  local e=Effect.GlobalEffect()
  e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS)
  e:SetCode(kind=='coin' and EFFECT_TOSS_COIN_CHOOSE or EFFECT_TOSS_DICE_CHOOSE)
  e:SetOperation(function(e,tp,eg,ep,ev)
   local count1=ev&0xffff
   local count2=kind=='dice' and (ev>>16) or 0
   local results={}
   for i=1,count1+count2 do
    local player=i<=count1 and ep or 1-ep
    results[i]=draw(kind..':'..player,kind=='coin' and 0 or 1,kind=='coin' and 1 or 6)
   end
   if kind=='coin' then Duel.SetCoinResult(table.unpack(results))
   else Duel.SetDiceResult(table.unpack(results)) end
  end)
  Duel.RegisterEffect(e,0)
 end
 local coin,dice=Duel.TossCoin,Duel.TossDice
 Duel.TossCoin=function(...) if enabled then install('coin') end return coin(...) end
 Duel.TossDice=function(...) if enabled then install('dice') end return dice(...) end
end
