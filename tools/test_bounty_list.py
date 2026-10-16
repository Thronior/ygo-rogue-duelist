"""Bounty List objective tracking, payouts, and relic catalogue integration."""
import json,random,sys,tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import campaign as g,storage
from content import ARTIFACTS,ART_INFO,PLAYABLE_IDS

assert ARTIFACTS['bounty_list'][0]=='Bounty List'
assert ARTIFACTS['bounty_list'][1]==100
assert ART_INFO['bounty_list']['amount']==40
assert ART_INFO['bounty_list']['art']=='WANTED: Seeker of Sinful Spoils'
custom_art=json.loads((ROOT/'data/relic-custom-art.json').read_text(encoding='utf8'))
assert (ROOT/'assets/relics'/custom_art['bounty_list']).is_file()
assert '40 coins' in ARTIFACTS['bounty_list'][2]

ritual=next(c for c in g.CARDS if c['data']['type']&0x80 and c['data']['type']&1)
fusion=next(c for c in g.CARDS if c['data']['type']&0x40 and c['data']['type']&1)
assert g.bounty_complete({'id':'ritual_summon'},[{'kind':'summon','card':ritual['id']}],g.BY_ID)
assert g.bounty_complete({'id':'fusion_summon'},[{'kind':'summon','card':fusion['id']}],g.BY_ID)
assert not g.bounty_complete({'id':'ritual_summon'},[{'kind':'summon','card':fusion['id']}],g.BY_ID)
assert g.bounty_complete({'id':'five_monsters'},[{'kind':'duel_metrics','peak_monsters':5}],g.BY_ID)
assert not g.bounty_complete({'id':'five_monsters'},[{'kind':'duel_metrics','peak_monsters':4}],g.BY_ID)
assert g.bounty_complete({'id':'eleven_activations'},[{'kind':'activate'}]*11,g.BY_ID)
assert not g.bounty_complete({'id':'eleven_activations'},[{'kind':'activate'}]*10,g.BY_ID)
assert g.bounty_complete({'id':'over_3000_atk'},[{'kind':'duel_metrics','peak_attack':3001}],g.BY_ID)
assert not g.bounty_complete({'id':'over_3000_atk'},[{'kind':'duel_metrics','peak_attack':3000}],g.BY_ID)

with tempfile.TemporaryDirectory(prefix='bounty-',dir=ROOT/'temp') as tmp:
 base=Path(tmp);storage.ROOT=base;g.SAVE=base/'run.json';g.RUNTIME=base/'runtime';g.RUNTIME.mkdir()
 profile=storage.profile();profile['unlocked']=list(PLAYABLE_IDS);storage.write(base/'profile.json',profile)
 run=g.new_run(0,random.Random(18));g.auto_deck(run);run['stage']='shop';run['artifacts']=['bounty_list']
 run['bounty_objective']={'id':'eleven_activations','title':'Keep the Pressure','description':'Activate at least 11 cards or effects this Duel.'}
 g.routes(run,random.Random(2));run['opponent']=run['routes'][0]
 request=g.prepare_duel(run,random.Random(3));before=run['gold']
 events=[{'kind':'activate','card':g.BY_NAME['Mystical Space Typhoon']['id']} for _ in range(11)]
 g.finish_duel(run,{'protocol':1,'id':request['id'],'winner':0,'lp':7000,'events':events},random.Random(4))
 assert run['last_rewards']['Bounty List']==40
 assert run['last_gold']>=40 and run['gold']>=before+40
 assert run['last_bounty']['completed'] is True
 assert run['bounty_objective']['id']!='eleven_activations'

 run2=g.new_run(1,random.Random(21));g.auto_deck(run2);run2['stage']='shop';run2['artifacts']=['bounty_list']
 run2['bounty_objective']={'id':'over_3000_atk','title':'Heavy Hitter','description':'Control a monster with over 3,000 ATK this Duel.'}
 g.routes(run2,random.Random(5));run2['opponent']=run2['routes'][0]
 request=g.prepare_duel(run2,random.Random(6));g.finish_duel(run2,{'protocol':1,'id':request['id'],'winner':0,'lp':7000,'events':[]},random.Random(7))
 assert 'Bounty List' not in run2['last_rewards'] and not run2['last_bounty']['completed']

 run3=g.new_run(0,random.Random(31));g.auto_deck(run3);run3['artifacts']=['bounty_list'];run3['stage']='shop';run3.pop('bounty_objective',None)
 g.ensure_bounty(run3,random.Random(32))
 assert run3['bounty_objective']['id'] in {x['id'] for x in g.bounty_objectives}
 run3['artifacts']=[];g.ensure_bounty(run3);assert 'bounty_objective' not in run3

print('PASS: five objective rules, one-time +40 reward, rerolls, relic metadata and ownership gate')
