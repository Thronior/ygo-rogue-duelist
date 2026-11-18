"""Jin Trio and its fusion Ultimate Gate Combination (the user's design, 2026-11-18), campaign side: prices, art, the fusion
recipe, shop rules, the trio kept in the fused relic's Duel Deck and translations. The duel effects are tested in
android/test_jin_trio.mjs."""
import json,random,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,content,storage,relic_fusions,relic_affinity,shop_rewards,archetype_relics,campaign_expansion
base=Path(tempfile.mkdtemp(prefix='jin-trio-',dir=ROOT/'temp'));storage.ROOT=base;g.SAVE=base/'run.json'
profile=storage.profile();profile['unlocked']=list(content.PLAYABLE_IDS);storage.write(base/'profile.json',profile)
checks=0
def ok(value,why):
 global checks
 assert value,why;checks+=1

A,INFO=content.ARTIFACTS,content.ART_INFO
ok(A['jin_trio'][:2]==('Jin Trio',60),'Jin Trio costs 60')
ok(A['ultimate_gate_combination'][:2]==('Ultimate Gate Combination',140),'the fusion is worth both pieces (60 + 80)')
ok(relic_fusions.RECIPES['ultimate_gate_combination']==('jin_trio','gate_calling'),'Jin Trio + Gate Calling')
ok(INFO['jin_trio']['art']=='Kazejin' and INFO['ultimate_gate_combination']['art']=='Sanga of the Thunder','art: Kazejin and Sanga of the Thunder (Gate Guardian art is another relic''s, user 2026-11-18)')
arts=[v['art'] for k,v in INFO.items() if k not in ('jin_trio','ultimate_gate_combination')]
ok('Kazejin' not in arts and 'Sanga of the Thunder' not in arts,'no other relic uses these pictures')
ok('Jin Trio' not in A['ultimate_gate_combination'][2] and 'Gate Calling' not in A['ultimate_gate_combination'][2],'the fused text never names its pieces')
ok('jin_trio' in shop_rewards.CATEGORY_RELICS['highlevel'] and relic_affinity.RULES['jin_trio'][0]==('gate_trio',),'shop category and weight rule')
ok(archetype_relics.SPECIFIC_CARDS['jin_trio']==(('Sanga of the Thunder','Kazejin','Suijin'),1),'x0.3 while no trio card is owned')

# Owning both relics fuses them; the pieces are used up.
run=g.new_run(21,random.Random(5),0);run['artifacts']+=['jin_trio','gate_calling']
made=relic_fusions.fuse(run)
ok([m['relic'] for m in made]==['ultimate_gate_combination'] and 'jin_trio' not in run['artifacts'] and 'gate_calling' not in run['artifacts'],'the pieces fuse')

# Like Gate Calling, Jin Trio is only offered while the Deck holds Sanga, Kazejin or Suijin.
run=g.new_run(0,random.Random(5),0);g.auto_deck(run)
trio=[g.BY_NAME[n]['id'] for n in ('Sanga of the Thunder','Kazejin','Suijin')]
run['pool']=[c for c in run['pool'] if c not in trio];run['selected']=[i for i in run['selected'] if i<len(run['pool'])]
ok(not campaign_expansion.shop_relic_eligible(run,'jin_trio'),'no trio card in the Deck: not offered')
run['pool'].append(trio[1]);run['selected'].append(len(run['pool'])-1)
ok(campaign_expansion.shop_relic_eligible(run,'jin_trio'),'Kazejin in the Deck: offered')

# The fused relic adds a missing trio card to the Duel's Deck, so its opening can hand all three over.
def duel_lua(artifacts):
 run=g.new_run(0,random.Random(2));run['artifacts']+=artifacts
 run['pool']=[c for c in run['pool'] if c not in trio]
 normals=[cid for cid,c in g.BY_ID.items() if c['data']['type']==0x11][:20]
 start=len(run['pool']);run['pool']+=normals+normals;run['selected']=list(range(start,len(run['pool'])))
 run.update(stage='draft');g.routes(run,random.Random(3));run['opponent']=run['routes'][0]
 g.prepare_duel(run,random.Random(4))
 return (g.RUNTIME/'puzzles/shadow-run.lua').read_text(encoding='utf8')
lua=duel_lua(['ultimate_gate_combination'])
ok(all(f'Debug.AddCard({cid},0,0,LOCATION_DECK' in lua for cid in trio),'the fusion puts Sanga, Kazejin and Suijin in the Deck')
ok(not any(f'Debug.AddCard({cid},0,0,LOCATION_DECK' in duel_lua(['jin_trio']) for cid in trio),'Jin Trio adds no cards')

# Translations.
for lang in ('de','es','fr','it','pt','ja','ko','zh'):
 table=json.loads((ROOT/f'data/i18n/ui/{lang}.json').read_text(encoding='utf8'))
 for key in ('jin_trio','ultimate_gate_combination'):
  ok(table.get(A[key][0]) and table.get(A[key][2]),f'{lang}: {key} name and text')
print('PASS Jin Trio and Ultimate Gate Combination:',checks,'checks')
