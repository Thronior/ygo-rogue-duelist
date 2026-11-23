// Life Points cap (user, 2026-11-23, after Simochi and Ra loops on Discord reached millions of LP and the number pickers
// broke): 10,000,000 LP is the most a player can have. Reaching it locks that player at the cap for the rest of the Duel:
// damage, LP costs and effects that lower LP no longer take any, so they cannot lose by LP (Exodia, deck-out and other
// win conditions still work). The client shows the locked total as ∞.
// Loaded by engine.js into every duel (solo, Tag, Draft, CPU viewer), like trap-return-compat.js. Cheap: one EVENT_ADJUST
// check of two numbers; the lock's four player effects are registered once, when the cap is first reached.
export const LP_CAP=10000000;
export const lpText=lp=>Number(lp)>=LP_CAP?'∞':String(lp);
export const lpCapRules=`
do
 local CAP=${LP_CAP}
 local locked={[0]=false,[1]=false}
 local function lock(p)
  locked[p]=true
  local d=Effect.GlobalEffect() d:SetType(EFFECT_TYPE_FIELD) d:SetCode(EFFECT_CHANGE_DAMAGE) d:SetProperty(EFFECT_FLAG_PLAYER_TARGET) d:SetTargetRange(1,0)
  d:SetValue(function() return 0 end) Duel.RegisterEffect(d,p)
  local n=d:Clone() n:SetCode(EFFECT_NO_EFFECT_DAMAGE) n:SetValue(1) Duel.RegisterEffect(n,p)
  local b=d:Clone() b:SetCode(EFFECT_AVOID_BATTLE_DAMAGE) b:SetValue(1) Duel.RegisterEffect(b,p)
  local c=d:Clone() c:SetCode(EFFECT_LPCOST_CHANGE) c:SetValue(function() return 0 end) Duel.RegisterEffect(c,p)
 end
 local function check()
  for p=0,1 do
   local lp=Duel.GetLP(p)
   if lp>=CAP then
    if lp>CAP then Duel.SetLP(p,CAP) end
    if not locked[p] then lock(p) end
   elseif locked[p] then Duel.SetLP(p,CAP) end
  end
 end
 local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_ADJUST) e:SetOperation(check) Duel.RegisterEffect(e,0)
 local r=e:Clone() r:SetCode(EVENT_RECOVER) Duel.RegisterEffect(r,0)
 local s=e:Clone() s:SetCode(EVENT_CHAIN_SOLVED) Duel.RegisterEffect(s,0)
end
`;
