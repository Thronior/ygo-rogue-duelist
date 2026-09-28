import sys,json,uuid,random,subprocess
from pathlib import Path
from collections import Counter
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,content,encounters,passives,frontend,duel_rewards
base=ROOT/'temp'/('beginners-'+uuid.uuid4().hex);base.mkdir();storage.ROOT=base;g.SAVE=base/'run.json'
p=storage.profile();p['unlocked']=content.PLAYABLE_IDS;storage.write(base/'profile.json',p)
seen=set()
for seed in range(25):
 r=g.new_run(37,random.Random(seed));v=r['tutorial_variants'][str(r['opponent'])];seen.add(v)
 enemy=g.opponent_deck(0,opponent=r['opponent'],tutorial_variant=v)
 assert Counter(g.deck(r))==Counter(enemy+[g.BY_NAME['Copycat']['id']])
 assert r['artifacts']==['echo_glass'] and g.validate(r) is None
assert len(seen)==7
for i in range(7):
 deck=g.opponent_deck(0,tutorial_variant=i);monsters=[g.BY_ID[c] for c in deck if g.BY_ID[c]['data']['type']&1]
 assert 1000<=max(c['atk'] for c in monsters)<=1100 and max(c['atk'] for c in monsters)>max(c['defense'] for c in monsters)
 assert any(g.BY_ID[c]['data']['type']&2 for c in deck) and any(g.BY_ID[c]['data']['type']&4 for c in deck)
 assert len(deck)==23 and max(Counter(deck).values())<=3
for i in encounters.EARLY_IDS:
 deck=g.opponent_deck(1,opponent=i);assert 20<=len(deck)<=60
 assert max(Counter(deck).values())<=3
 assert all(c in g.BY_ID for c in deck)
for i in content.PLAYABLE_IDS:
 r=g.new_run(i,random.Random(i))
 if content.CHARACTERS[i].get('engine_deck'):assert r['artifacts']==[]
 else:assert len(r['artifacts'])==1 and r['artifacts'][0] in content.ARTIFACTS
assert len({g.new_run(36,random.Random(i))['artifacts'][0] for i in range(15)})>5
app=frontend.App()
try:
 app.run=g.new_run(37);app.characters();app.update();scene=app.character_scene;scene.select(37);app.update()
 texts=[scene.itemcget(item,'text') for item in scene.find_all() if scene.type(item)=='text']
 assert 'SHARED DUEL REWARDS' not in texts and 'Echo Glass' in texts
 app.run['last_rewards']={'Victory':30,'Monsters summoned: 1+':1,'Artifacts':0};app.run['last_gold']=31
 duel_rewards.show_earned(app);app.update()
 def allwidgets(w):
  for c in w.winfo_children():yield c;yield from allwidgets(c)
 labels=[w.cget('text') for w in allwidgets(app) if w.winfo_class()=='Label']
 assert 'Victory' in labels and 'Monsters summoned: 1+' in labels,labels
 rows=sorted(int(v[1:]) for v in labels if v.startswith('+') and v[1:].replace(',','').isdigit() and not v.endswith('COINS'))
 assert rows==[1,30] and sum(rows)==app.run['last_gold'],rows
 print('PASS: fixed round-zero and early decks, exact Copycat mirror, all starting relics, clean character panel, earned-only receipt')
finally:app.audio.close();app.destroy()
# Exercise the new copying relic inside the same real native core used by the desktop.
fixture=ROOT/'temp/tactical-fixture.lua';old=fixture.read_bytes() if fixture.exists() else None
lua='''Debug.ReloadFieldBegin(DUEL_MODE_MR1|DUEL_SIMPLE_AI,1)
Debug.SetPlayerInfo(0,8000,0,0) Debug.SetPlayerInfo(1,8000,0,0)
local a=Debug.AddCard(54652250,1,1,LOCATION_HAND,0,POS_FACEDOWN_DEFENSE)
local b=Debug.AddCard(46986414,1,1,LOCATION_HAND,1,POS_FACEDOWN_DEFENSE)
Debug.ReloadFieldEnd()
'''+passives.script(dict(artifacts=['echo_glass'],curses=[]))+'''
local test=Effect.GlobalEffect() test:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) test:SetCode(EVENT_PREDRAW) test:SetCountLimit(1)
test:SetOperation(function()
 Duel.Summon(1,a,true,nil)
 local hand=Duel.GetFieldGroup(0,LOCATION_HAND,0)
 if hand:GetCount()~=1 or hand:GetFirst():GetOriginalCode()~=54652250 then error('Echo Glass did not copy the summoned monster') end
 Duel.MoveToField(b,1,1,LOCATION_MZONE,POS_FACEUP_ATTACK,true)
 Duel.RaiseEvent(b,EVENT_SUMMON_SUCCESS,nil,REASON_EFFECT,1,1,0)
 if Duel.GetFieldGroupCount(0,LOCATION_HAND,0)~=1 then error('Echo Glass activated more than once') end
 Duel.Win(0,0x10)
end) Duel.RegisterEffect(test,0)
'''
try:
 fixture.write_text(lua,encoding='utf8')
 result=subprocess.run([str(ROOT/'runtime/core_check.exe'),'tactical'],cwd=ROOT/'runtime',capture_output=True,text=True,timeout=30)
 assert result.returncode==0 and 'Script error' not in result.stdout,(result.stdout,result.stderr)
 print('PASS: Echo Glass copies the first opposing Normal Summon inside the real duel core')
finally:
 if old is None:fixture.unlink(missing_ok=True)
 else:fixture.write_bytes(old)
