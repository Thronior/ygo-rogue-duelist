import sys,random,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,content as c,character_progression as cp
storage.ROOT=Path(tempfile.mkdtemp(dir=ROOT/'temp',prefix='oct13-tests-'));g.SAVE=storage.ROOT/'run.json'
assert storage.settings()['pauseWhenHidden'] is True
storage.write(storage.ROOT/'settings.json',{'pauseWhenHidden':False});assert storage.settings()['pauseWhenHidden'] is False
from campaign_expansion import shop_relic_eligible
excluded={'receipt','stamp','archfiend_contract','faulty_printer','carbon_copy','legendary_shackles','toon_world','ritual_dagger','fusion_chamber','morphing_jar_2','duelist_catalogue','booster_shelf','prospector_lens'}
excluded|=__import__('archetype_relics').NEW_IDS
for char in (37,38):
 for relic in excluded:assert not shop_relic_eligible({'character':char},relic),(char,relic)
 for relic in ('dice_jar','cyber_jar','bargain','map','urn','interest','golden_sleeve','final_hour'):
  assert shop_relic_eligible({'character':char},relic),(char,relic)
assert shop_relic_eligible({'character':38},'satchel') and not shop_relic_eligible({'character':37},'satchel')
# Only the archetype gate (no matching card in the pool) may hide a relic from an ordinary character.
import archetype_relics
for relic in c.ARTIFACTS:assert shop_relic_eligible({'character':0},relic) or not archetype_relics.has_member(relic,{'character':0}),relic
print('PASS exact unused-stock exclusions, useful economy relics retained, Engine Satchel exception, ordinary pool unchanged')
profile=storage.profile();profile['unlocked']=list(c.PLAYABLE_IDS);storage.write(storage.ROOT/'profile.json',profile)
for char in (37,38,0):
 r=g.new_run(char,random.Random(1));g.auto_deck(r);r.update(stage='shop',round=1)
 for seed in range(80):
  g.restock(r,random.Random(seed))
  if char in (37,38):assert all(x['id'] not in excluded and (char!=37 or x['id']!='satchel') for x in r['shop'] if x['kind']=='artifact')
 g.routes(r);r['opponent']=r['routes'][0] if isinstance(r['routes'][0],int) else r['routes'][0]['id'];g.prepare_duel(r,random.Random(2))
 g.finish_duel(r,dict(protocol=1,id=r['duel']['id'],winner=0,lp=8000,events=[]),random.Random(3))
 assert r['last_gold']>0
 if char==37:assert r['last_reward_cards']==[] and r['reward_slots']['indices']==[]
 elif char==38:assert r['reward_slots']['kind']=='deck' and r['reward_slots']['choices']
 else:assert r['last_reward_cards']
print('PASS shop exclusions (240 stocks), Copycat coin-only victory, Engine deck rewards, ordinary card rewards, persisted pause setting')
for names,expected in [(['Man-Eater Bug'],True),(['Battle Ox'],True),(['Battle Ox','Fissure'],False)]:
 r={'pool':[g.BY_NAME[n]['id'] for n in names],'selected':list(range(len(names))),'artifacts':[],'lp':8000};cp.duel(g,r,{'lp':8000,'events':[]},True,False);assert ('normal_win' in r['character_challenges'])==expected
print('PASS effect/normal monster decks unlock; spell decks do not')
