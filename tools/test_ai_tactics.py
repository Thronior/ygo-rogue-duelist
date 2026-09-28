"""Assertions inside the real core at the end of the opponent's first turn."""
import sys,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
tests={
 'removal-before-summon':('''local target=Debug.AddCard(89631139,0,0,LOCATION_MZONE,0,POS_FACEUP_ATTACK)
local monster=Debug.AddCard(5053103,1,1,LOCATION_HAND,0,POS_FACEDOWN_DEFENSE)
Debug.AddCard(12580477,1,1,LOCATION_HAND,0,POS_FACEDOWN_DEFENSE)''',"target:IsLocation(LOCATION_GRAVE) and monster:IsLocation(LOCATION_MZONE) and monster:IsPosition(POS_FACEUP_ATTACK)"),
 'weak-flip-defense':('''Debug.AddCard(40640057,0,0,LOCATION_MZONE,0,POS_FACEUP_ATTACK)
local monster=Debug.AddCard(54652250,1,1,LOCATION_HAND,0,POS_FACEDOWN_DEFENSE)''',"monster:IsLocation(LOCATION_MZONE) and monster:IsPosition(POS_FACEDOWN_DEFENSE)"),
 'equip-own-monster':('''local enemy=Debug.AddCard(89631139,0,0,LOCATION_MZONE,0,POS_FACEUP_ATTACK)
local monster=Debug.AddCard(5053103,1,1,LOCATION_MZONE,0,POS_FACEUP_ATTACK)
local equip=Debug.AddCard(40619825,1,1,LOCATION_HAND,0,POS_FACEDOWN_DEFENSE)''',"equip:GetEquipTarget()==monster and monster:GetAttack()==2700 and enemy:GetAttack()==3000"),
 'special-summon-attack':('''Debug.AddCard(5053103,0,0,LOCATION_MZONE,0,POS_FACEUP_ATTACK)
local monster=Debug.AddCard(89631139,1,1,LOCATION_GRAVE,0,POS_FACEUP_ATTACK)
Debug.AddCard(83764718,1,1,LOCATION_HAND,0,POS_FACEDOWN_DEFENSE)''',"monster:IsLocation(LOCATION_MZONE) and monster:IsPosition(POS_FACEUP_ATTACK)"),
}
for name,(setup,check) in tests.items():
 lua='Debug.ReloadFieldBegin(DUEL_MODE_MR1|DUEL_SIMPLE_AI,1)\nDebug.SetPlayerInfo(0,20000,0,1)\nDebug.SetPlayerInfo(1,8000,0,1)\n'+setup
 for p in [0,1]:
  for i in range(20):lua+=f'\nDebug.AddCard(40640057,{p},{p},LOCATION_DECK,0,POS_FACEDOWN_DEFENSE)'
 lua+='''
Debug.ReloadFieldEnd()
local check=Effect.GlobalEffect()
check:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
check:SetCode(EVENT_PHASE+PHASE_END)
check:SetCountLimit(1)
check:SetCondition(function() return Duel.GetTurnPlayer()==1 end)
check:SetOperation(function()
'''+f'assert({check},"AI tactic failed: {name}")\nDuel.Win(0,0x10)\nend)\nDuel.RegisterEffect(check,0)'
 (ROOT/'temp/tactical-fixture.lua').write_text(lua,encoding='utf8')
 with (ROOT/f'temp/tactic-{name}.log').open('w') as out:
  r=subprocess.run([str(ROOT/'runtime/core_check.exe'),'tactical'],cwd=ROOT/'runtime',stdout=out,stderr=out,timeout=30)
 assert r.returncode==0,(name,(ROOT/f'temp/tactic-{name}.log').read_text()[-2000:])
 print('PASS:',name)
