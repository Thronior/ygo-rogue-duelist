import sys,tempfile,random,json
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import storage,campaign as g,content,campaign_catalog
with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parents[1]/'temp') as d,patch.object(storage,'ROOT',Path(d)):
 storage._registration_migrated=None
 storage.write(storage.ROOT/'registered-cards.json',{'cards':[46986420]})
 assert 46986414 in storage.registered_cards(), 'Legacy Dark Magician art migrates'
 storage.register_collection({'pool':[],'guaranteed':[89631139],'shop':[{'cards':[33396948]}],'opponent_deck':[33396948]})
 assert 89631139 in storage.registered_cards() and 33396948 not in storage.registered_cards()
 profile={'unlocked':content.PLAYABLE_IDS,'character_levels':{str(i):5 for i in content.PLAYABLE_IDS}}
 with patch.object(storage,'profile',return_value=profile):
  for i in [0,1,7]:
   for variant in [0,1]:
    run=g.new_run(i,random.Random(20+i),variant=variant)
    g.save(run)
    assert set(run['guaranteed'])<=set(storage.registered_cards())
 before=random.getstate()
 catalog=campaign_catalog.watch_catalog()
 assert random.getstate()==before, "Read-only catalogs must not consume gameplay RNG"
 for tier in range(3):
  for i in content.eligible_opponents(tier*3+1):
   record=content.opponent_record(tier*3+1,i)
   assert any(sorted(r['main'])==sorted(record['main']) and sorted(r['extra'])==sorted(record.get('extra',[])) for r in catalog['cpuWatchDecks'][str(i)])
 original=content.opponent_record
 def changed(round_index,index,loop=0):
  record=original(round_index,index,loop)
  if index==0 and not loop:record={**record,'main':[46986414]*20}
  return record
 with patch.object(content,'opponent_record',changed):
  fresh=campaign_catalog.watch_catalog()
  assert any(r['main']==[46986414]*20 for r in fresh['cpuWatchDecks']['0'])
 sources=campaign_catalog.card_sources(46986414)
 assert any(x['name']=='Yami Yugi' for x in sources['packs']) and any(x['name']=='Yami Yugi' and x['label']=='Tier 1' for x in sources['opponents'])
print('PASS guaranteed cards, legacy registration, no preview registration, both variants, live deck refresh and collection sources')
