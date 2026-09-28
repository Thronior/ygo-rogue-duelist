from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from passives import script
from content import ARTIFACTS
r={'artifacts':list(ARTIFACTS),'curses':['frailty','hunger','tax','mercy']}
lua='''Debug.ReloadFieldBegin(DUEL_MODE_MR1|DUEL_SIMPLE_AI,1)
Debug.SetPlayerInfo(0,8000,0,1)
Debug.SetPlayerInfo(1,8000,0,1)
local dragon=Debug.AddCard(89631139,0,0,LOCATION_MZONE,0,POS_FACEUP_ATTACK)
for i=1,20 do Debug.AddCard(40640057,0,0,LOCATION_DECK,0,POS_FACEDOWN_DEFENSE) Debug.AddCard(40640057,1,1,LOCATION_DECK,0,POS_FACEDOWN_DEFENSE) end
Debug.ReloadFieldEnd()
'''+script(r)+'''
local e=Effect.GlobalEffect()
e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS)
e:SetCode(EVENT_PREDRAW)
e:SetOperation(function()
 if Duel.GetTurnPlayer()==0 then
  assert(dragon:GetAttack()==4350,'Artifact ATK: '..dragon:GetAttack())
  assert(dragon:GetDefense()==2700,'Artifact DEF: '..dragon:GetDefense())
  Duel.Damage(0,1500,REASON_EFFECT)
  assert(Duel.GetLP(0)==6700,'Damage reduction did not apply')
 else
  assert(Duel.GetLP(0)==6600,'Standby recovery / end-phase curse: '..Duel.GetLP(0))
  assert(Duel.GetLP(1)==7800,'Artifact burn: '..Duel.GetLP(1))
  Duel.Win(0,0x10)
 end
end)
Duel.RegisterEffect(e,0)
'''
(ROOT/'temp/passive-fixture.lua').write_text(lua,encoding='utf8')
