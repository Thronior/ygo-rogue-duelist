"""Boss deck growth, result notices, validation and tag/reconnect regression checks."""
import json,random,sys,tempfile
from copy import deepcopy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,content,approved_relics as ar
from tag_campaign import TagCampaign
base=Path(tempfile.mkdtemp(prefix='deck-minimum-',dir=ROOT/'temp'));storage.ROOT=base;g.SAVE=base/'run.json'
profile=storage.profile();profile['unlocked']=content.PLAYABLE_IDS;storage.write(base/'profile.json',profile)
for loop in [0,1,5]:
 for rd in range(10):
  for level in [-1,0,5]:
   r={'character':0,'round':rd,'loop':loop,'challenge_level':level,'artifacts':[]}
   want=40 if loop else min(40,20+10*(rd//3));assert ar.minimum(r)==want
   # Collector's Burden adds 10 to the minimum (offered from round 6, where that makes 50).
   r['artifacts']=['cursed_collectors_burden'];assert ar.minimum(r)==(want if level==-1 else want+10)
for c in content.PLAYABLE_IDS:
 if content.CHARACTERS[c].get('copycat') or content.CHARACTERS[c].get('engine_deck'):
  assert ar.minimum({'character':c,'round':8,'loop':2})==20

def run_at(rd,loop=0):
 r=g.new_run(0,random.Random(3));r.update(round=rd,loop=loop);g.routes(r,random.Random(4));return r

def finish(r,winner=0):
 r.update(stage='duel',duel={'id':'test-boss','enemy_deck':[g.BY_NAME['Battle Ox']['id']]*40})
 g.finish_duel(r,{'protocol':1,'id':'test-boss','winner':winner,'lp':6000 if winner==0 else 0,'events':[]},random.Random(5))
 return r
for rd,delta,want in [(0,0,20),(1,0,20),(2,10,30),(3,0,30),(5,10,40),(8,0,40)]:
 r=finish(run_at(rd));assert r['last_deck_minimum_increase']==delta,(rd,r);assert ar.minimum(r)==want
 saved=json.loads(json.dumps(r));assert ar.minimum(saved)==want and saved['last_deck_minimum_increase']==delta
 try:g.finish_duel(r,{'protocol':1,'id':'test-boss','winner':0,'lp':6000,'events':[]});raise AssertionError('duplicate result accepted')
 except ValueError:pass
r=run_at(2);r['last_deck_minimum_increase']=10;finish(r,1);assert ar.minimum(r)==20 and r['last_deck_minimum_increase']==0
r=finish(run_at(2,1));assert ar.minimum(r)==40 and r['last_deck_minimum_increase']==0
r=run_at(2);r['artifacts'].append('cursed_collectors_burden');finish(r);assert r['last_deck_minimum_increase']==10,'the boss step still raises the minimum on top of the relic'
r=run_at(8);r['artifacts'].append('cursed_collectors_burden');finish(r);assert ar.minimum(r)==50 and r['last_deck_minimum_increase']==0
# A broad card pool lets auto-build satisfy each new minimum without duplicate copies.
r=run_at(0);r['pool']=list(dict.fromkeys(r['guaranteed']+[c['id'] for c in g.CARDS if not g.is_extra(c['id'])]))
for rd,want in [(0,20),(3,30),(6,40)]:
 r['round']=rd;g.auto_deck(r);assert len(g.deck(r))==want and g.validate(r) is None
 r['selected']=r['selected'][:want-1];assert f'{want} to 60' in g.validate(r)
# Both tag teammates receive the growth and notice, persisted through a checkpoint.
s=TagCampaign([0,1],[profile,profile],seed=7);s.shared['round']=2;s.sync();s.phase='duel';s.duel={'mode':'tag'}
for seat,r in enumerate(s.players):
 r.update(stage='duel',opponent=2+seat,duel={'id':str(seat),'enemy_deck':[g.BY_NAME['Battle Ox']['id']]*40})
s.finish(0,6000,[]);s=TagCampaign.restore(json.loads(json.dumps(s.checkpoint())))
for seat in [0,1]:
 r=s.view(seat)['run'];assert ar.minimum(r)==30 and r['last_deck_minimum_increase']==10
print('PASS: 20/30/40 progression, cap across loops, fixed decks, cursed relic, win/loss and repeat-result guards, save reload, auto-build/validation, both tag seats/reconnect')
