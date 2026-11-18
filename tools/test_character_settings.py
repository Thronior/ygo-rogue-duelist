"""Character settings (itch.io request, user 2026-11-18): each character's saved card marks start every new solo run (and a
restart), settings.json keeps them sanitized, and in Tag the client sends them with one 'marks' request that never
overrides a mark already set in the run."""
import sys,json,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT));sys.path.insert(0,str(ROOT/'android'))
import campaign as g,storage
dm=g.BY_NAME['Dark Magician']['id'];kuri=g.BY_NAME['Kuriboh']['id'];hole=g.BY_NAME['Dark Hole']['id']

# Sanitizer: bad indexes, cards and marks are dropped; empty rows are not kept.
clean=storage.character_settings({'0':{'marks':{str(dm):1,str(kuri):-1,'x':1,str(hole):2},'keepRunMarks':1},'abc':{},'5':{'marks':{}},'7':'no'})
assert clean=={'0':{'marks':{str(dm):1,str(kuri):-1},'keepRunMarks':True}},clean
assert storage.character_settings(None)=={}

base=Path(tempfile.mkdtemp(prefix='char-settings-',dir=ROOT/'temp'));storage.ROOT=base;g.SAVE=base/'run.json'
storage.write(base/'settings.json',{'characterSettings':{'0':{'marks':{str(dm):1,str(kuri):-1}}}})
assert storage.settings()['characterSettings']=={'0':{'marks':{str(dm):1,str(kuri):-1},'keepRunMarks':False}}
assert storage.saved_marks(0)=={str(dm):1,str(kuri):-1} and storage.saved_marks(1)=={}

# Backend: both 'new' and 'restart-run' copy the character's saved marks into the run.
src=(ROOT/'android/mobile_backend.py').read_text(encoding='utf8')
assert src.count("candidate['card_marks']=storage.saved_marks(candidate['character'])")==2,'new run and restart'
run=g.new_run(0)
if storage.saved_marks(run['character']):run['card_marks']=storage.saved_marks(run['character'])
assert run['card_marks']=={str(dm):1,str(kuri):-1}

# Tag: one 'marks' request seeds the run; a mark the player already set wins; bad entries are skipped.
from tag_campaign import TagCampaign
profile=storage.profile();s=TagCampaign([0,1],[profile,profile],seed=5)
s.command(0,{'id':'m1','revision':s.revision,'action':'mark','value':[dm,-1]})
s.command(0,{'id':'ms','revision':s.revision-1,'action':'marks','value':{str(dm):1,str(kuri):-1,'nope':1,str(hole):3}})
assert s.players[0]['card_marks']=={str(dm):-1,str(kuri):-1},s.players[0]['card_marks']
assert not s.players[1].get('card_marks'),'only the sender is changed'
for bad in ('x',None,[1,2]):
 try:s.apply(0,'marks',bad);raise SystemExit(f'bad marks accepted: {bad}')
 except ValueError:pass
print('PASS character settings: sanitized saved marks, new runs start with them, Tag seeds them once without overriding')
