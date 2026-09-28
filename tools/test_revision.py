"""Campaign changes, copy-limit recovery, real audio volume and UI rewards."""
import sys,random,uuid,re,time,ctypes
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,frontend as ui,visual_ui as v,shop_rewards
from content import *
base=ROOT/'temp'/('revision-'+uuid.uuid4().hex);base.mkdir();storage.ROOT=base;g.SAVE=base/'run.json';g.RUNTIME=base/'runtime';g.RUNTIME.mkdir()
p=storage.profile();p['unlocked']=PLAYABLE_IDS;storage.write(base/'profile.json',p)
assert len(PLAYABLE_IDS)==36 and not set([25,26,27])&set(PLAYABLE_IDS)
r=g.new_run(24,random.Random(1));assert r['pack_ids']==['EN-TP1','EN-TP2','EN-TP3','EN-TP4']
for pack,ids in zip(r['packs'],r['pack_ids']):assert set(pack)<=set(PACK_BY_ID[ids]['common']+PACK_BY_ID[ids]['rare'])
seen=set()
for seed in range(50):
 r=g.new_run(0,random.Random(seed));r['round']=6;g.routes(r,random.Random(seed));assert set(r['routes'])<=set([0,1,6,15,17,27])
 for reward in r['route_rewards'].values():
  seen.add(reward['key']);r['bias']=reward['key'];r['shop_reward']=reward;g.restock(r,random.Random(seed))
  singles=[g.BY_ID[x['id']] for x in r['shop'] if x['kind']=='single']
  assert sum(shop_rewards.matches(c,reward['key']) for c in singles[:5])==5
  packs=[x for x in r['shop'] if x['kind']=='pack'];assert 1<=len(packs)<=2 and packs[0]['id']==reward['pack'] and packs[0]['opponent_pack'] and (len(packs)==1 or packs[0]['id']!=packs[1]['id'])
assert len(seen)>=4
assert any(k in seen for k in ('DARK','LIGHT'))
for lp,expected in [(4321,6321),(6500,8000),(7900,8000),(8500,8500)]:
 r=g.new_run(0);g.auto_deck(r);r['round']=2;g.routes(r);g.prepare_duel(r)
 g.finish_duel(r,dict(protocol=1,id=r['duel']['id'],winner=0,lp=lp,events=[dict(kind='damage',amount=1700),dict(kind='summon',card=46986414)]))
 assert r['lp']==expected and r['round']==3 and not r['curses'] and r['stats']['damage_dealt']==1700
r=g.new_run(0);g.auto_deck(r);orders=[]
for seed in [1,2]:
 g.prepare_duel(r,random.Random(seed));s=(g.RUNTIME/'puzzles/shadow-run.lua').read_text();orders.append([[int(n) for n in re.findall(r'Debug.AddCard\((\d+),'+str(side)+','+str(side)+',LOCATION_DECK',s)] for side in [0,1]])
assert all(orders[0][side]!=orders[1][side] and Counter(orders[0][side])==Counter(orders[1][side]) for side in [0,1])
# Existing four-copy selections are repaired on load, without losing owned cards.
r=g.new_run(0);g.auto_deck(r);cid=g.BY_NAME['Battle Ox']['id'];r['pool'] += [cid]*4;r['selected']+=list(range(len(r['pool'])-4,len(r['pool'])));g.save(r);recovered=g.load_run()
assert len(recovered['pool'])==len(r['pool']) and Counter(g.card_identity(c) for c in g.deck(recovered))[g.card_identity(cid)]<=3
# Unlocks persist on the run itself, including purchases and final victory.
storage.write(base/'profile.json',dict(storage.profile(),unlocked=[0,1],wins=0,won_as=[],victories=0,max_gold=0,max_bought=0,max_artifacts=0))
r=g.new_run(0);r['gold']=250;g.update_profile(r);assert 2 in r['unlocks_earned'];r['stage']='complete';g.update_profile(r);assert 3 in r['unlocks_earned']
a=ui.App();errors=[];a.report_callback_exception=lambda *args:errors.append(str(args))
try:
 a.run=recovered;a.run['stage']='shop';a.draft();a.update()
 extra=next(i for i,c in enumerate(a.run['pool']) if c==cid and i not in a.run['selected']);before=a.run['selected'][:];v.toggle(a,extra);assert a.run['selected']==before
 # Actual MCI status verifies independent music and sound volume, including mute.
 a.settings.update(music=20,sound=20);a.audio.stop();a.audio.music('title');a.audio.effect('major')
 for volume in [0,10,75]:
  a.settings.update(music=volume,sound=volume);a.audio.volume();a.audio.sound_volume()
  for alias in ['shadowmusic','shadowsfx']:
   result=ctypes.create_unicode_buffer(64);assert a.audio.mci('status '+alias+' volume',result,64,None)==0;assert abs(int(result.value)-volume*10)<=10
 for cue,gain in [('select',0.22),('purchase',0.38),('major',1.0)]:
  a.settings['sound']=100;a.audio.effect(cue);result=ctypes.create_unicode_buffer(64)
  assert a.audio.mci('status shadowsfx volume',result,64,None)==0 and abs(int(result.value)-1000*gain)<=15,(cue,result.value)
 a.settings_view();a.update()
 def walk(w):
  for child in w.winfo_children():yield child;yield from walk(child)
 scales={w.cget('label'):w for w in walk(a) if w.winfo_class()=='Scale'}
 scales['Music volume'].set(31);scales['Sound effects volume'].set(17);a.update()
 assert a.settings['music']==31 and a.settings['sound']==17
 a.apply_native_settings();conf=(g.RUNTIME/'config/system.conf').read_text();assert 'music_volume = 31' in conf and 'sound_volume = 17' in conf
 a.run=r;ui.ending(a);a.update();assert any('UNLOCKED THIS RUN' in str(w.cget('text')) for w in walk(a) if w.winfo_class()=='Label')
 assert not errors,errors
 print('PASS: varied rewards and tied packs, 36-character TP roster, capped boss healing, both deck shuffles, legacy copy repair, editor guard, run unlocks/stats, actual music/SFX volume and live sliders')
finally:a.audio.close();a.destroy()
