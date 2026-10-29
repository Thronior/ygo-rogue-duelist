import sys,tempfile,random
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import storage,campaign as g,content,approved_relics as ar,cursed_relics,secret_challenge,reward_slots
storage.ROOT=Path(tempfile.mkdtemp(dir=ROOT/'temp',prefix='review-followup-'));g.SAVE=storage.ROOT/'run.json'
profile=storage.profile();profile['unlocked']=list(content.PLAYABLE_IDS);storage.write(storage.ROOT/'profile.json',profile)
ids=lambda names:[g.BY_NAME[n]['id'] for n in names]
main,extra=g.legal_fixed_cards(ids(['Umi']*2+['A Legendary Ocean']*2),[])
assert len(main)==3
for char in (37,38):
 for seed in range(20):
  r=g.new_run(char,random.Random(seed));r.update(stage='shop',round=1,duel={'id':'test'})
  reward_slots.prepare_decks(r,15,random.Random(seed))
  for choice in r['reward_slots']['choices']:
   check=dict(r,pool=choice['main']+choice['extra'],selected=list(range(len(choice['main'])+len(choice['extra']))))
   assert g.validate(check) is None,(choice['name'],g.validate(check))
 for key in ('cursed_cursed_refund','cursed_black_market_seal','cursed_collectors_burden'):assert not ar.eligible({'character':char,'round':8},key)
 r={'character':char,'artifacts':[],'round':3,'cursed_offer':{'options':['cursed_cursed_refund','cursed_black_market_seal','cursed_collectors_burden'],'rerolls_left':1}}
 cursed_relics.create_offer(r,random.Random(2));assert all(ar.eligible(r,k) for k in r['cursed_offer']['options'])
r=g.new_run(0,random.Random(4));g.auto_deck(r);r.update(stage='shop',round=1);before=ar.minimum(r);secret=secret_challenge.relicless(g,r);assert ar.minimum(secret)==before;assert g.validate(secret) is None
# v0.1.88 un-retired swordsman_oath as the 'Level Bonus' variant relic; only 'feather' stays retired.
import variant_relics
assert 'swordsman_oath' not in content.RETIRED_ARTIFACTS and 'feather' in content.RETIRED_ARTIFACTS
assert any(row[0]=='swordsman_oath' for row in variant_relics.ROWS)
print('PASS alias limits, 600 legal deck offers, cursed eligibility/migration, early secret challenge and retired relic')
