import sys,time,uuid,random,types
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import frontend as ui,campaign as g,storage,achievements,duel_rewards,visual_ui as v
from content import *
base=ROOT/'temp'/('new-ui-'+uuid.uuid4().hex);base.mkdir();storage.ROOT=base;g.SAVE=base/'run.json'
p=storage.profile();p['unlocked']=PLAYABLE_IDS;storage.write(base/'profile.json',p)
fixed={}
for i in PLAYABLE_IDS:
 if CHARACTERS[i].get('random_packs'):continue
 for pack in set(starting_packs(i)):
  assert pack not in fixed,(pack,i,fixed.get(pack));fixed[pack]=i
assert len(fixed)==len(PACKS)
assert not any(c['sprite'].startswith('gx') for c in CHARACTERS)
a=g.new_run(36,random.Random(2));b=g.new_run(36,random.Random(3));assert len(set(a['pack_ids']))==4 and a['pack_ids']!=b['pack_ids'];g.save(a);assert g.load_run()['pack_ids']==a['pack_ids']
# Signatures can be removed, remain removed on reload, and do not invalidate a legal deck.
r=g.new_run(0);g.auto_deck(r);r['selected']=[i for i in r['selected'] if i>=2]
for i,cid in enumerate(r['pool']):
 if i>=2 and i not in r['selected'] and not g.is_extra(cid) and sum(g.card_identity(r['pool'][j])==g.card_identity(cid) for j in r['selected'])<3:r['selected'].append(i)
 if len(r['selected'])>=20:break
assert g.validate(r) is None;g.save(r);assert not set([0,1])&set(g.load_run()['selected'])
# Shared payouts cannot depend on the character, and all earned tiers match the sum.
events=[dict(kind='summon',card=g.BY_NAME['Blue-Eyes White Dragon']['id'],method='normal')]*5+[dict(kind='damage',amount=2600),dict(kind='duel_metrics',peak_attack=3300,peak_defense=2500,peak_field=3,turns=4)]
payouts=[]
for i in PLAYABLE_IDS:
 r['character']=i;payouts.append(g.rewards(r,events))
assert all(x==payouts[0] for x in payouts);tally,gold=payouts[0];assert sum(tally.values())==gold and 'Highest face-up monster ATK: 3,001+' in tally and 'Largest damage hit: 2,501+' in tally
assert all(1<=rule[3]<=5 for rule in duel_rewards.RULES) and len(duel_rewards.RULES)>70 and {r[0] for r in duel_rewards.RULES if r[3]==5}=={'exact_lethal','blitz','no_spells','no_traps','no_summons','effect_win'}
app=ui.App();errors=[];app.report_callback_exception=lambda *x:errors.append(str(x))
def walk(w):
 for c in w.winfo_children():yield c;yield from walk(c)
try:
 for resolution in ['1024x720','1280x880','1920x1080']:
  app.geometry(resolution);app.home();app.update();scene=app.title_scene
  for _ in range(10):app.update();time.sleep(.02)
  assert scene.hitboxes
  for i in [0,1,2,3,4,5,6]:
   scene.position=scene.target=i;scene.selected=i;scene.tick();app.update()
   box=next(box for idx,box in scene.hitboxes if idx==i);assert box[0]>=0 and box[2]<=scene.winfo_width() and box[3]<scene.winfo_height()-110
  scene.roll(1);assert scene.selected==0
 app.achievements_view();app.update();assert len(app.achievement_rows)==len(PLAYABLE_IDS)-2+len(__import__('unlocks').CARD_RULES)+len(__import__('unlocks').PACK_RULES)
 r['character']=0;app.run=r;app.run['stage']='shop';g.restock(r);app.draft();app.update()
 before=set(r['selected']);v.toggle(app,0);v.toggle(app,0);assert set(r['selected'])==before
 app.settings_view(app.draft);app.update();next(w for w in walk(app) if w.winfo_class()=='Button' and w.cget('text')=='Back').invoke();app.update();assert app.screen=='draft'
 ui.shop(app);app.update();app.settings_view(lambda:ui.shop(app));app.update();next(w for w in walk(app) if w.winfo_class()=='Button' and w.cget('text')=='Save settings').invoke();app.update();assert app.screen=='shop'
 app.coin_scorecard();app.update();assert not errors,errors
 print('PASS: exclusive boosters, saved random draft, DM/movie-only roster, removable signatures, shared small coin milestones, seven-card menu, achievements, settings returns')
finally:app.audio.close();app.destroy()
