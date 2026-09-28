"""Check late-only collection gates, relic economy and actual core effects."""
import sys,uuid,random,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,unlocks,passives
from content import *
base=ROOT/'temp'/('relics-'+uuid.uuid4().hex);base.mkdir();storage.ROOT=base;g.SAVE=base/'run.json'
p=storage.profile();storage.write(base/'profile.json',p)
assert len(ARTIFACTS)==69
for a in ART_INFO.values():assert a['art'] in g.BY_NAME,a['art']
for name in unlocks.CARD_RULES:assert g.BY_NAME[name]['date']>='2003-01-01' and not unlocks.available('card',name)
for pack in PACKS:
 assert pack['date']>='2003-01-01' or unlocks.available('pack',pack['id'])
 if unlocks.available('pack',pack['id']):
  for seed in range(12):assert all(unlocks.card_allowed(g.BY_ID[c]) for c in g.open_pack(pack['id'],random.Random(seed)))
 else:
  try:g.open_pack(pack['id']);raise AssertionError('Locked pack opened')
  except ValueError:pass
r=g.new_run(0);g.auto_deck(r);r['stage']='shop'
for seed in range(25):
 g.restock(r,random.Random(seed))
 for item in r['shop']:
  if item['kind']=='single':assert unlocks.card_allowed(g.BY_ID[item['id']])
  if item['kind']=='pack':assert unlocks.available('pack',item['id'])
# Unlock milestones are persistent, and owner victory guarantees the tied pack.
p['victories']=3;unlocks.award(p,r,29);storage.write(base/'profile.json',p)
assert unlocks.available('pack','EN-DCR') and unlocks.available('pack','EN-IOC') and unlocks.available('card','Chaos Sorcerer')
assert not unlocks.available('card','Chaos Emperor Dragon - Envoy of the End')
g.restock(r);r.update(gold=500,artifacts=['receipt','stamp','razor','phoenix_debt'],stamped_singles=0)
r['shop']=[dict(kind='pack',id='EN-LOB',price=35,sold=False)]+[dict(kind='single',id=g.BY_NAME['Battle Ox']['id'],price=15,sold=False) for _ in range(3)]
g.buy(r,0);assert r['gold']==477
assert len(g.buy(r,1))==2 and len(g.buy(r,2))==2 and len(g.buy(r,3))==2
r['lp']=1500;tally,total=g.rewards(r,[]);assert tally['Razor Ledger']==30 and tally['Phoenix IOU']==40
print('PASS: late-only gates, all eligible booster pulls and shops, milestone/owner unlocks, refund/stamp/victory relics')
# Real core validates dynamic field values and empty-hand draw, not just generated text.
checks={'last_word':'monster:GetAttack()==2400','solo':'monster:GetAttack()==2500','menagerie':'monster:GetAttack()==1800','epitaph':'monster:GetAttack()==1850','eclipse':'monster:GetAttack()==2050 and monster:GetDefense()==1350','pendulum':'monster:GetAttack()==1700 and monster:GetDefense()==1600','desperate':'monster:GetAttack()==2600','inkwell':'Duel.GetFieldGroupCount(0,LOCATION_HAND,0)==1'}
for relic,check in checks.items():
 lua="""Debug.ReloadFieldBegin(DUEL_MODE_MR1|DUEL_SIMPLE_AI,1)
Debug.SetPlayerInfo(0,3000,0,0)
Debug.SetPlayerInfo(1,8000,0,0)
local monster=Debug.AddCard(5053103,0,0,LOCATION_MZONE,0,POS_FACEUP_ATTACK)
Debug.AddCard(89631139,0,0,LOCATION_GRAVE,0,POS_FACEUP_ATTACK)
Debug.AddCard(46986414,0,0,LOCATION_GRAVE,0,POS_FACEUP_ATTACK)
Debug.AddCard(40640057,1,1,LOCATION_MZONE,0,POS_FACEUP_DEFENSE)
Debug.AddCard(40640057,1,1,LOCATION_MZONE,1,POS_FACEUP_DEFENSE)
"""
 for side in [0,1]:
  for _ in range(10):lua+=f'Debug.AddCard(40640057,{side},{side},LOCATION_DECK,0,POS_FACEDOWN_DEFENSE)\n'
 lua+='Debug.ReloadFieldEnd()\n'+passives.script(dict(artifacts=[relic],curses=[]))
 lua+="""
local e=Effect.GlobalEffect()
e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS)
e:SetCode(EVENT_PHASE|PHASE_STANDBY)
e:SetCountLimit(1)
e:SetCondition(function() return Duel.GetTurnPlayer()==1 end)
e:SetOperation(function()
"""+f'assert({check},"Relic failed: {relic}")\nDuel.Win(0,0x10) end)\nDuel.RegisterEffect(e,0)'
 (ROOT/'temp/tactical-fixture.lua').write_text(lua,encoding='utf8')
 result=subprocess.run([str(ROOT/'runtime/core_check.exe'),'tactical'],cwd=ROOT/'runtime',capture_output=True,text=True,timeout=30)
 assert result.returncode==0,(relic,result.stdout[-1500:],result.stderr[-500:])
 print('PASS: native relic',relic)
