"""Isolated pool, reward, save and tag-wallet integration checks."""
import sys,json,random,tempfile,copy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,content,storage,custom_cards,card_rarity,shop_rewards,duel_rewards,passives
base=Path(tempfile.mkdtemp(prefix='ancient-treasure-',dir=ROOT/'temp'));storage.ROOT=base;g.SAVE=base/'run.json'
cid=custom_cards.ANCIENT_TREASURE;event={'kind':'ancient_treasure','card':cid};events=[event,event]
assert cid in g.BY_ID and g.BY_ID[cid]['data']['type']==2
assert [p['id'] for p in content.PACKS if cid in p['common']+p['rare']+p.get('starter_support',[])]==['WC4-20']
assert all(not shop_rewards.matches(g.BY_ID[cid],key) for key in shop_rewards.LABELS)
class ForceTreasure(random.Random):
 def choices(self,population,weights=None,*,cum_weights=None,k=1):
  return [cid]*k if cid in population else super().choices(population,weights=weights,cum_weights=cum_weights,k=k)
assert cid in g.open_pack('WC4-20',ForceTreasure(1))
r=g.new_run(0,random.Random(7));r.update(stage='shop',gold=1000)
original_weight=card_rarity.weight;card_rarity.weight=lambda x:1e12 if x==cid else original_weight(x)
try:
 g.restock(r,random.Random(4));singles=[x for x in r['shop'] if x['kind']=='single'];assert cid not in [x['id'] for x in singles[:5]];assert cid in [x['id'] for x in singles[5:]]
finally:card_rarity.weight=original_weight
for relics in [[],['glass_shard'],['cursed_glass_treasury']]:
 for level in [0,3]:
  test=copy.deepcopy(r);test.update(artifacts=relics,challenge_level=level)
  before=g.rewards(test,[])[1];tally,total=g.rewards(test,events);assert total-before==100 and tally['Ancient Treasure']==100
assert sum(v for k,v in duel_rewards.progress(r,events,g.BY_ID).items() if k.startswith('Ancient Treasure'))==100
assert custom_cards.coins([{'kind':'ancient_treasure','card':cid,'amount':999999}])==50
def prepare():
 run=g.new_run(0,random.Random(7));run['pool'].append(cid)
 run.update(stage='duel',duel={'id':'ancient-test','enemy_deck':[13039848]*20,'lp':8000},gold=100)
 return run
r=prepare();g.save(r);assert cid in g.load_run()['pool']
baseline=copy.deepcopy(r);g.finish_duel(baseline,{'protocol':1,'id':'ancient-test','winner':0,'lp':8000,'events':[]},random.Random(12))
g.finish_duel(r,{'protocol':1,'id':'ancient-test','winner':0,'lp':8000,'events':events},random.Random(12));assert r['gold']-baseline['gold']==100
paid=r['gold']
try:g.finish_duel(r,{'protocol':1,'id':'ancient-test','winner':0,'lp':8000,'events':events});raise AssertionError('Duplicate result accepted')
except ValueError:pass
assert r['gold']==paid
loss=prepare();g.finish_duel(loss,{'protocol':1,'id':'ancient-test','winner':1,'lp':0,'events':[event]},random.Random(12));assert loss['gold']==150
from tag_campaign import TagCampaign
profile=storage.profile();s=TagCampaign([0,1],[profile,profile],seed=7)
for seat in (0,1):
 for action in ('auto','choose','ready'):
  value=next(x for x in s.players[seat]['routes'] if x!=s.players[1-seat]['opponent']) if action=='choose' else None
  s.command(seat,{'id':f'{seat}-{action}','revision':s.revision,'action':action,'value':value})
assert s.phase=='duel'
# Compare identical team states, changing only the resolved custom-card events.
before=copy.deepcopy(s);before.finish(0,8000,[]);s.finish(0,8000,events)
assert s.shared['gold']-before.shared['gold']==100
assert all(p['gold']==s.shared['gold'] for p in s.players)
solemn=g.new_run(0,random.Random(2));solemn['artifacts']=['solemn_relic'];assert 'Duel.NegateActivation' in passives.script(solemn)
assert 'solemn_relic' in content.ARTIFACTS
print('PASS exclusive booster/general stock, fixed uncapped coins, save/load, duplicate finish rejection, loss credit, one shared tag payout, Solemn registration')
